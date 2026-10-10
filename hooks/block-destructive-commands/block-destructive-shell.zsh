#!/bin/zsh
# Shared destructive-shell policy engine used by the PreToolUse adapter.
emulate -L zsh
unsetopt errexit
setopt extendedglob pipefail rematchpcre

fallback_denial() {
  print -r -- '{"permission":"deny","user_message":"Shell commands are blocked because the safety hook failed.","agent_message":"Do not retry shell commands. Tell the user that the destructive-command safety hook failed and they should check the hook logs. Do not attempt workarounds until the hook is fixed."}'
}

typeset JQ
for candidate in jq /opt/homebrew/bin/jq /usr/local/bin/jq /usr/bin/jq; do
  if [[ -n ${candidate##/*} ]]; then
    JQ=$(command -v "$candidate" 2>/dev/null) && break
  elif [[ -x $candidate ]]; then
    JQ=$candidate
    break
  fi
done

emit() {
  local permission=$1
  local user_message=${2:-}
  local agent_message=${3:-}

  if [[ $permission == allow ]]; then
    print -r -- '{"permission":"allow"}'
    return 0
  fi

  "$JQ" -nc \
    --arg permission "$permission" \
    --arg user_message "$user_message" \
    --arg agent_message "$agent_message" \
    '{permission: $permission, user_message: $user_message, agent_message: $agent_message}'
}

respond() {
  if [[ -n $JQ ]]; then
    emit "$@" || fallback_denial
  else
    fallback_denial
  fi
  exit 0
}

if [[ -z $JQ ]]; then
  fallback_denial
  exit 0
fi

typeset GIT
for candidate in git /opt/homebrew/bin/git /usr/local/bin/git /usr/bin/git; do
  if [[ -n ${candidate##/*} ]]; then
    GIT=$(command -v "$candidate" 2>/dev/null) && break
  elif [[ -x $candidate ]]; then
    GIT=$candidate
    break
  fi
done
if [[ -z $GIT ]]; then
  respond deny \
    "Shell commands are blocked because git is unavailable." \
    "Do not retry shell commands. Tell the user that git is required by the destructive-command safety hook and must be installed before retrying."
fi

typeset ANALYSIS_CATEGORY ANALYSIS_EXECUTABLE ANALYSIS_MESSAGE
typeset -a ANALYSIS_ARGUMENTS
typeset -a ANALYSIS_CONTEXTS
typeset -i ANALYSIS_DIRECT ANALYSIS_DEPTH

typeset PARSED_EXECUTABLE
typeset -a PARSED_ARGUMENTS
typeset -i PARSED_DIRECT
typeset HEREDOC_COMMAND
typeset -a HEREDOC_WORDS
typeset -i HEREDOC_CONSUMER
readonly HEREDOC_CONSUMERS=${0:A:h}/heredoc-data-consumers.json

reset_analysis() {
  ANALYSIS_CATEGORY=
  ANALYSIS_EXECUTABLE=
  ANALYSIS_MESSAGE=
  ANALYSIS_ARGUMENTS=()
  ANALYSIS_DIRECT=1
}

is_heredoc_operator() {
  case "$1" in
    '<<'|'<<-'|'<<<'|[0-9]##'<<'|[0-9]##'<<-'|[0-9]##'<<<') return 0 ;;
  esac
  return 1
}

deny_heredoc() {
  ANALYSIS_CATEGORY='unsupported heredoc'
  ANALYSIS_MESSAGE='Blocked shell execution because the heredoc is ambiguous or uses an unsupported consumer or shell form. Use a direct approved data consumer with one final quoted delimiter and an explicit terminator for user review.'
  return 1
}

heredoc_context_is_safe() {
  local word executable=
  local -i command_position=1 shell_option_pending=0

  for word in "$@"; do
    case "$word" in
      ';'|'&&'|'||'|'|'|'&')
        (( shell_option_pending )) && return 1
        command_position=1
        continue
        ;;
      '('|')'|'{'|'}'|'<'*|'>'*) return 1 ;;
    esac
    if (( command_position )); then
      executable=${(Q)word}
      [[ $executable =~ '^[A-Za-z_./][A-Za-z0-9_./+-]*$' ]] || return 1
      executable=${executable:t}
      case "$executable" in
        '.'|alias|unalias|function|functions|eval|emulate|trap|source|autoload|builtin|enable|disable|\
        typeset|declare|local|export|unset|readonly|set|setopt|unsetopt|hash|rehash|\
        read|getopts|let|repeat|for|foreach|while|until|if|then|else|elif|fi|case|esac|\
        do|done|select|coproc|exec|time|nocorrect|noglob|command|env|nohup|sudo|xargs|ssh|su|\
        script|chroot|busybox|fc)
          return 1
          ;;
      esac
      [[ $executable == (bash|dash|ksh|sh|zsh) ]] && shell_option_pending=1
      command_position=0
    else
      if (( shell_option_pending )); then
        # Startup options can load definitions that change a data consumer.
        [[ ${(Q)word} == -c ]] || return 1
        shell_option_pending=0
      fi
      if [[ $executable == (print|printf) && ${(Q)word} == -*v* ]]; then
        return 1
      fi
      # Literal script arguments are checked when nested shell analysis recurses.
      if [[ $word != \'* && $word != \$\'* && $word =~ '[\$`]' ]]; then
        return 1
      fi
    fi
  done
  (( shell_option_pending )) && return 1
  return 0
}

# Only literal simple commands joined by `&&`, `||`, or `;` can surround an ignored data body.
# Sets HEREDOC_WORDS to the command words and HEREDOC_CONSUMER to the index of the last command.
literal_heredoc_line() {
  local -a header=("$@")
  local word executable
  local -i word_index

  HEREDOC_WORDS=()
  HEREDOC_CONSUMER=1
  for (( word_index = 1; word_index <= ${#header}; word_index++ )); do
    word=$header[word_index]
    case "$word" in
      '&&'|'||'|';')
        if (( word_index == 1 || word_index == ${#header} )) || [[ $header[word_index-1] == ('&&'|'||'|';') ]]; then
          return 1
        fi
        HEREDOC_WORDS+=("$word")
        HEREDOC_CONSUMER=$(( ${#HEREDOC_WORDS} + 1 ))
        continue
        ;;
      '>'|'>>')
        # Output to a literal file cannot change how a consumer in this shell reads its data.
        (( word_index++ ))
        word=$header[word_index]
        if (( ${#HEREDOC_WORDS} < HEREDOC_CONSUMER || word_index > ${#header} )) || \
           [[ $word =~ '[\$`<>;&|(){}*?\[\]~]' || $word == *$'\n'* || $word == *$'\r'* || $word == '='* ]]; then
          return 1
        fi
        continue
        ;;
    esac
    if [[ $word =~ '[\$`<>;&|(){}]' || $word == *$'\n'* || $word == *$'\r'* || \
          $word == [A-Za-z_][A-Za-z0-9_]#=* || $word == '='* ]]; then
      return 1
    fi
    HEREDOC_WORDS+=("$word")
  done
  (( HEREDOC_CONSUMER <= ${#HEREDOC_WORDS} )) || return 1
  executable=${(Q)HEREDOC_WORDS[HEREDOC_CONSUMER]}
  [[ $executable =~ '^[A-Za-z_./][A-Za-z0-9_./+-]*$' ]] || return 1
  heredoc_context_is_safe "${HEREDOC_WORDS[@]}"
}

prepare_heredocs() {
  local input=$1 line word executable mode delimiter terminator operator output= ancestor
  local -a words lines header command_words arguments ancestor_words
  local -i has_heredoc=0 index=1 redirection_count redirection_index header_count=0 outside_lines=0 word_index ancestor_index consumer_index trailing_lines=0

  HEREDOC_COMMAND=$input
  [[ $input == *'<<'* ]] || return 0
  words=(${(Z+C+)input})
  for word in "${words[@]}"; do
    if is_heredoc_operator "$word"; then
      has_heredoc=1
      break
    fi
  done
  # Without a heredoc operator, `<<` is quoted text. A nested script with a heredoc checks this command as an ancestor.
  (( has_heredoc )) || return 0

  for (( ancestor_index = 1; ancestor_index < ${#ANALYSIS_CONTEXTS}; ancestor_index++ )); do
    ancestor=$ANALYSIS_CONTEXTS[ancestor_index]
    ancestor_words=(${(Z+C+)ancestor})
    if ! heredoc_context_is_safe "${ancestor_words[@]}"; then
      deny_heredoc
      return 1
    fi
  done

  lines=("${(@f)input}")
  while (( index <= ${#lines} )); do
    line=$lines[index]
    (( index++ ))
    (( outside_lines++ ))
    # Complete physical lines prevent fake headers inside continued shell syntax.
    if (( outside_lines > 64 )) || [[ $line == *\\ ]] || ! /bin/zsh -f -n -c "$line" </dev/null 2>/dev/null; then
      deny_heredoc
      return 1
    fi
    header=(${(Z+C+)line})
    if (( ! ${#header} )); then
      output+=$'\n'
      continue
    fi

    redirection_count=0
    redirection_index=0
    for (( word_index = 1; word_index <= ${#header}; word_index++ )); do
      if is_heredoc_operator "$header[word_index]"; then
        (( redirection_count++ ))
        redirection_index=$word_index
      fi
    done

    if (( redirection_count )); then
      (( header_count++ ))
      operator=$header[redirection_index]
      if (( trailing_lines || header_count > 16 || redirection_count != 1 || redirection_index != ${#header} - 1 )) || \
         [[ $operator != ('<<'|'<<-'|'0<<'|'0<<-') ]]; then
        deny_heredoc
        return 1
      fi
      word=$header[-1]
      if [[ ! $word =~ "^('[A-Za-z_][A-Za-z0-9_]*'|\"[A-Za-z_][A-Za-z0-9_]*\")$" ]]; then
        deny_heredoc
        return 1
      fi
      delimiter=${(Q)word}
      header=("${(@)header[1,redirection_index-1]}")
    fi

    if ! literal_heredoc_line "${header[@]}"; then
      # Commands after the last heredoc cannot change how a consumer read its data. Command analysis checks them,
      # but it does not unwrap shell prefixes or reserved words. The context check rejects those.
      if (( redirection_count || ! header_count )) || ! heredoc_context_is_safe "${header[@]}"; then
        deny_heredoc
        return 1
      fi
      trailing_lines=1
      output+="${(j: :)header}"$'\n'
      continue
    fi
    command_words=("${HEREDOC_WORDS[@]}")
    consumer_index=$HEREDOC_CONSUMER
    executable=${${(Q)command_words[consumer_index]}:t}

    if (( redirection_count )); then
      if [[ ! -f $HEREDOC_CONSUMERS ]] || ! mode=$("$JQ" -er --arg executable "$executable" '
        if type == "object" and length > 0 and
          all(to_entries[]; (.key | test("^[A-Za-z_][A-Za-z0-9_]*$")) and
            (.value == "arguments" or .value == "stdin-only"))
        then .[$executable] // "unsupported"
        else error("invalid heredoc consumer policy") end
      ' "$HEREDOC_CONSUMERS" 2>/dev/null); then
        deny_heredoc
        return 1
      fi
      arguments=("${(@)command_words[consumer_index+1,-1]}")
      if [[ $mode == stdin-only ]]; then
        # These flags cannot supply code or startup settings. Words after `-` are script arguments.
        while (( ${#arguments} )) && [[ ${(Q)arguments[1]} == -[IEsBu]## ]]; do
          shift arguments
        done
        if (( ! ${#arguments} )) || [[ ${(Q)arguments[1]} != - ]]; then
          deny_heredoc
          return 1
        fi
      elif [[ $mode != arguments ]]; then
        deny_heredoc
        return 1
      fi

      # The quoted delimiter makes these bytes data for the shell. Exclude the body from command analysis.
      terminator=
      while (( index <= ${#lines} )); do
        terminator=$lines[index]
        (( index++ ))
        if [[ $operator == *'-' ]]; then
          terminator=${terminator##$'\t'#}
        fi
        [[ $terminator == "$delimiter" ]] && break
      done
      if [[ $terminator != "$delimiter" ]]; then
        deny_heredoc
        return 1
      fi
    fi
    output+="${(j: :)header}"$'\n'
  done
  HEREDOC_COMMAND=$output
  return 0
}

option_takes_value() {
  local command_name=$1 option=$2
  case "$command_name:$option" in
    sudo:-C|sudo:-D|sudo:-g|sudo:-h|sudo:-p|sudo:-r|sudo:-t|sudo:-u|\
    sudo:--chdir|sudo:--close-from|sudo:--group|sudo:--host|sudo:--prompt|\
    sudo:--role|sudo:--type|sudo:--user|\
    xargs:-a|xargs:-d|xargs:-E|xargs:-I|xargs:-L|xargs:-n|xargs:-P|\
    xargs:-s|xargs:--arg-file|xargs:--delimiter|xargs:--eof|\
    xargs:--max-args|xargs:--max-chars|xargs:--max-lines|\
    xargs:--max-procs|xargs:--replace)
      return 0
      ;;
  esac
  return 1
}

skip_options() {
  local command_name=$1
  shift
  local -a words=("$@")
  local -i index=1
  local token option

  while (( index <= ${#words} )); do
    token=$words[index]
    if [[ $token == -- ]]; then
      REPLY=$(( index + 1 ))
      return
    fi
    if [[ $token != -* || $token == - ]]; then
      REPLY=$index
      return
    fi
    option=${token%%=*}
    (( index++ ))
    if [[ $token != *=* ]] && option_takes_value "$command_name" "$option"; then
      (( index++ ))
    fi
  done
  REPLY=$index
}

unwrap_command() {
  local -a words=("$@")
  local -i index=1 next_index
  local token executable

  PARSED_EXECUTABLE=
  PARSED_ARGUMENTS=()
  PARSED_DIRECT=1

  while (( index <= ${#words} )); do
    token=${(Q)words[index]}
    [[ $token =~ '^[A-Za-z_][A-Za-z0-9_]*=' ]] || break
    (( index++ ))
  done

  while (( index <= ${#words} )); do
    token=${(Q)words[index]}
    executable=${token:t:l}
    case "$executable" in
      sudo)
        skip_options sudo "${(@)words[index+1,-1]}"
        next_index=$REPLY
        index=$(( index + next_index ))
        ;;
      env)
        (( index++ ))
        while (( index <= ${#words} )); do
          token=${(Q)words[index]}
          if [[ $token == -- ]]; then
            (( index++ ))
            break
          elif [[ $token == -C || $token == --chdir ]]; then
            PARSED_DIRECT=0
            index=$(( index + 2 ))
          elif [[ $token == --chdir=* ]]; then
            PARSED_DIRECT=0
            (( index++ ))
          elif [[ $token == -u || $token == --unset ]]; then
            index=$(( index + 2 ))
          elif [[ $token == -* ]]; then
            (( index++ ))
          elif [[ $token =~ '^[A-Za-z_][A-Za-z0-9_]*=' ]]; then
            (( index++ ))
          else
            break
          fi
        done
        ;;
      command|nohup)
        skip_options "$executable" "${(@)words[index+1,-1]}"
        next_index=$REPLY
        index=$(( index + next_index ))
        ;;
      xargs)
        PARSED_DIRECT=0
        skip_options xargs "${(@)words[index+1,-1]}"
        next_index=$REPLY
        index=$(( index + next_index ))
        ;;
      *)
        break
        ;;
    esac
  done

  if (( index > ${#words} )); then
    return 1
  fi

  token=${(Q)words[index]}
  PARSED_EXECUTABLE=${token:t:l}
  PARSED_ARGUMENTS=()
  (( index++ ))
  while (( index <= ${#words} )); do
    PARSED_ARGUMENTS+=("${(Q)words[index]}")
    (( index++ ))
  done
  return 0
}

first_subcommand() {
  local -a arguments=("$@")
  local -i index=1
  local token

  while (( index <= ${#arguments} )); do
    token=${arguments[index]:l}
    if [[ $token == -- ]]; then
      (( index++ ))
      break
    elif [[ $token == -chdir || $token == --chdir ]]; then
      index=$(( index + 2 ))
    elif [[ $token == -* ]]; then
      (( index++ ))
    else
      REPLY=$token
      return
    fi
  done
  REPLY=${arguments[index]:l}
}

arguments_contain() {
  local sought=$1
  shift
  local argument
  for argument in "$@"; do
    [[ ${argument:l} == "$sought" ]] && return 0
  done
  return 1
}

is_shell_operator() {
  case "$1" in
    '&&'|'||') return 0 ;;
    '|') return 0 ;;
    ';'|'&') return 0 ;;
    '('|')') return 0 ;;
  esac
  return 1
}

analyze_sql() {
  local executable=$1
  shift
  local -a arguments=("$@")
  local is_client=0 subcommand argument sql=

  [[ $executable == (duckdb|mariadb|mysql|psql|sqlite3|sqlcmd|snowsql) ]] && is_client=1
  first_subcommand "${arguments[@]}"
  subcommand=$REPLY
  [[ $executable == bq && $subcommand == query ]] && is_client=1
  [[ $executable == snow && $subcommand == sql ]] && is_client=1
  [[ $executable == databricks && $subcommand == sql ]] && is_client=1
  (( is_client )) || return 1

  for argument in "${arguments[@]}"; do
    sql+="${argument:l} "
  done

  if [[ $sql =~ '\bdelete[[:space:]]+from\b' ]]; then
    ANALYSIS_CATEGORY='SQL DELETE'
  elif [[ $sql =~ '\btruncate[[:space:]]+(table[[:space:]]+)?' ]]; then
    ANALYSIS_CATEGORY='SQL TRUNCATE'
  elif [[ $sql =~ '\bdrop[[:space:]]+(table|schema|database|dataset|view|materialized[[:space:]]+view|function|procedure)\b' ]]; then
    ANALYSIS_CATEGORY='SQL DROP'
  elif [[ $sql =~ '\balter[[:space:]]+(table|schema|database)\b' ]]; then
    ANALYSIS_CATEGORY='SQL ALTER'
  elif [[ $sql =~ '\bupdate[[:space:]]+[^[:space:]]+[[:space:]]+set\b' ]]; then
    ANALYSIS_CATEGORY='SQL UPDATE'
  elif [[ $sql =~ '\bmerge[[:space:]]+into\b' ]]; then
    ANALYSIS_CATEGORY='SQL MERGE'
  elif [[ $sql =~ '\b(create[[:space:]]+or[[:space:]]+)?replace[[:space:]]+table\b' ]]; then
    ANALYSIS_CATEGORY='SQL REPLACE TABLE'
  elif [[ $sql =~ '\bcreate[[:space:]]+or[[:space:]]+replace[[:space:]]+(table|view|materialized[[:space:]]+view)\b' ]]; then
    ANALYSIS_CATEGORY='SQL CREATE OR REPLACE'
  elif [[ $sql =~ '\bpurge\b' ]]; then
    ANALYSIS_CATEGORY='SQL PURGE'
  elif [[ $sql =~ '\bvacuum[[:space:]]+full\b' ]]; then
    ANALYSIS_CATEGORY='SQL VACUUM FULL'
  else
    return 1
  fi
  return 0
}

analyze_segment() {
  local nested=$1
  shift
  local -a words=("$@")
  local executable subcommand option nested_command
  local -i index

  unwrap_command "${words[@]}" || return 1
  executable=$PARSED_EXECUTABLE

  if [[ $executable == (bash|dash|ksh|sh|zsh) ]]; then
    index=1
    while (( index <= ${#PARSED_ARGUMENTS} )); do
      option=$PARSED_ARGUMENTS[index]
      if [[ $option == -* && ${option#-} == *[cC]* ]]; then
        (( index++ ))
        (( index <= ${#PARSED_ARGUMENTS} )) || return 1
        nested_command=$PARSED_ARGUMENTS[index]
        (( ANALYSIS_DEPTH++ ))
        if (( ANALYSIS_DEPTH > 4 )); then
          ANALYSIS_CATEGORY='nested shell depth'
          ANALYSIS_MESSAGE='Blocked shell execution because nested shell depth exceeded the safety limit.'
          return 0
        fi
        if analyze_command "$nested_command" 1; then
          [[ $ANALYSIS_CATEGORY == 'file removal' ]] && ANALYSIS_DIRECT=0
          return 0
        fi
        return 1
      fi
      (( index++ ))
    done
    return 1
  fi

  case "$executable" in
    rm|rmdir|shred|unlink)
      ANALYSIS_CATEGORY='file removal'
      ANALYSIS_EXECUTABLE=$executable
      ANALYSIS_ARGUMENTS=("${PARSED_ARGUMENTS[@]}")
      ANALYSIS_DIRECT=$(( PARSED_DIRECT && ! nested ))
      return 0
      ;;
    dd)
      for option in "${PARSED_ARGUMENTS[@]}"; do
        if [[ ${option:l} == of=* ]]; then
          ANALYSIS_CATEGORY='disk overwrite'
          return 0
        fi
      done
      ;;
    mkfs|mkfs.*|newfs)
      ANALYSIS_CATEGORY='filesystem formatting'
      return 0
      ;;
    diskutil)
      for option in "${PARSED_ARGUMENTS[@]}"; do
        if [[ ${option:l} == (erase|erasedisk|erasevolume|partitiondisk) ]]; then
          ANALYSIS_CATEGORY='disk erase'
          return 0
        fi
      done
      ;;
    terraform|tofu|terragrunt)
      first_subcommand "${PARSED_ARGUMENTS[@]}"
      subcommand=$REPLY
      if [[ $subcommand == (apply|destroy|state) ]]; then
        ANALYSIS_CATEGORY='terraform mutation'
        return 0
      fi
      if [[ $executable == terragrunt && $subcommand == run ]]; then
        for option in "${PARSED_ARGUMENTS[@]}"; do
          if [[ ${option:l} == (apply|destroy|state) ]]; then
            ANALYSIS_CATEGORY='terraform mutation'
            return 0
          fi
        done
      fi
      ;;
    kubectl)
      if arguments_contain delete "${PARSED_ARGUMENTS[@]}" || arguments_contain drain "${PARSED_ARGUMENTS[@]}"; then
        ANALYSIS_CATEGORY='kubernetes deletion'
        return 0
      fi
      ;;
    helm)
      if arguments_contain delete "${PARSED_ARGUMENTS[@]}" || arguments_contain uninstall "${PARSED_ARGUMENTS[@]}"; then
        ANALYSIS_CATEGORY='helm deletion'
        return 0
      fi
      ;;
    docker)
      first_subcommand "${PARSED_ARGUMENTS[@]}"
      subcommand=$REPLY
      if [[ $subcommand == (rm|rmi) ]] || \
         [[ "${(j: :)PARSED_ARGUMENTS[1,2]:l}" == (system\ prune|volume\ prune|volume\ rm) ]]; then
        ANALYSIS_CATEGORY='docker deletion'
        return 0
      fi
      ;;
    gcloud)
      if arguments_contain delete "${PARSED_ARGUMENTS[@]}" || arguments_contain remove "${PARSED_ARGUMENTS[@]}"; then
        ANALYSIS_CATEGORY='gcloud deletion'
        return 0
      fi
      ;;
    aws)
      for option in delete remove terminate deprovision; do
        if arguments_contain "$option" "${PARSED_ARGUMENTS[@]}"; then
          ANALYSIS_CATEGORY='aws deletion'
          return 0
        fi
      done
      ;;
    az)
      if arguments_contain delete "${PARSED_ARGUMENTS[@]}" || arguments_contain remove "${PARSED_ARGUMENTS[@]}"; then
        ANALYSIS_CATEGORY='azure deletion'
        return 0
      fi
      ;;
    bq)
      first_subcommand "${PARSED_ARGUMENTS[@]}"
      if [[ $REPLY == rm ]]; then
        ANALYSIS_CATEGORY='bigquery removal'
        return 0
      fi
      ;;
    dropdb|dropuser)
      ANALYSIS_CATEGORY='postgres database/user drop'
      return 0
      ;;
    fga)
      if [[ ${PARSED_ARGUMENTS[1]:l} == tuple && ${PARSED_ARGUMENTS[2]:l} == write ]]; then
        ANALYSIS_CATEGORY='FGA tuple write'
        return 0
      fi
      ;;
  esac

  analyze_sql "$executable" "${PARSED_ARGUMENTS[@]}"
}

analyze_command() {
  local command=$1
  local nested=${2:-0}
  local -a ANALYSIS_CONTEXTS=("${ANALYSIS_CONTEXTS[@]}" "$command")
  local -a words segment
  local word
  local -i segment_count=0

  if ! /bin/zsh -f -n -c "$command" </dev/null 2>/dev/null; then
    ANALYSIS_CATEGORY='invalid shell syntax'
    ANALYSIS_MESSAGE='Blocked shell execution because the native shell parser rejected the command syntax.'
    return 0
  fi
  if ! prepare_heredocs "$command"; then
    return 0
  fi
  command=$HEREDOC_COMMAND
  words=(${(Z+C+)command})
  segment=()
  for word in "${words[@]}"; do
    if is_shell_operator "$word"; then
      if (( ${#segment} )); then
        (( segment_count++ ))
        if analyze_segment "$nested" "${segment[@]}"; then
          [[ $ANALYSIS_CATEGORY == 'file removal' && $segment_count -gt 1 ]] && ANALYSIS_DIRECT=0
          return 0
        fi
        segment=()
      fi
    else
      segment+=("$word")
    fi
  done

  if (( ${#segment} )); then
    (( segment_count++ ))
    if analyze_segment "$nested" "${segment[@]}"; then
      if [[ $ANALYSIS_CATEGORY == 'file removal' ]] && \
         { (( segment_count > 1 )) || [[ $command == *'&&'* || $command == *'||'* || $command == *';'* || $command == *'|'* ]]; }; then
        ANALYSIS_DIRECT=0
      fi
      return 0
    fi
  fi
  return 1
}

removal_operands() {
  local executable=$1
  shift
  local -a arguments=("$@")
  local argument
  local -i options=1

  REPLY=
  REPLY_ARRAY=()
  [[ $executable == shred ]] && return 1

  for argument in "${arguments[@]}"; do
    if (( options )) && [[ $argument == -- ]]; then
      options=0
    elif (( options )) && [[ $argument == -* && $argument != - ]]; then
      continue
    else
      REPLY_ARRAY+=("$argument")
    fi
  done
  return 0
}

validate_removal() {
  local cwd=$1 worktree candidate parent leaf resolved relative operand
  local -a operands

  if (( ! ANALYSIS_DIRECT )); then
    ANALYSIS_MESSAGE='Blocked file removal because only direct commands with literal paths inside the active git worktree are allowed.'
    return 1
  fi
  if ! removal_operands "$ANALYSIS_EXECUTABLE" "${ANALYSIS_ARGUMENTS[@]}"; then
    ANALYSIS_MESSAGE='Blocked file removal because shred can modify data beyond normal worktree deletion semantics.'
    return 1
  fi
  operands=("${REPLY_ARRAY[@]}")
  (( ${#operands} )) || return 0

  if ! worktree=$("$GIT" -C "$cwd" rev-parse --show-toplevel 2>/dev/null); then
    ANALYSIS_MESSAGE='Blocked file removal because the working directory is not inside an accessible git worktree.'
    return 1
  fi
  cwd=${cwd:A}
  worktree=${worktree:A}

  for operand in "${operands[@]}"; do
    if [[ $operand == '~'* || $operand =~ '[\$`\*\?\[\]\{\}]' ]]; then
      ANALYSIS_MESSAGE='Blocked file removal because dynamic paths, substitutions, and globs cannot be validated safely.'
      return 1
    fi
    if [[ $operand == */ ]]; then
      ANALYSIS_MESSAGE='Blocked file removal because trailing-slash paths can traverse directory symlinks.'
      return 1
    fi

    if [[ $operand == /* ]]; then
      candidate=$operand
    else
      candidate="${cwd}/${operand}"
    fi
    candidate=${candidate:a}
    leaf=${candidate:t}
    if [[ $leaf == . || $leaf == .. ]]; then
      resolved=${candidate:A}
    else
      parent=${candidate:h:A}
      resolved="${parent}/${leaf}"
    fi

    if [[ $resolved == "$worktree" ]]; then
      ANALYSIS_MESSAGE='Blocked file removal because the active git worktree root cannot be deleted.'
      return 1
    fi
    if [[ $resolved != "$worktree"/* ]]; then
      ANALYSIS_MESSAGE='Blocked file removal outside the active git worktree.'
      return 1
    fi

    relative=${resolved#"$worktree"/}
    if [[ "/${relative}/" == */.git/* ]]; then
      ANALYSIS_MESSAGE='Blocked file removal because Git administrative paths cannot be deleted.'
      return 1
    fi
  done
  return 0
}

main() {
  local hook_input command cwd category user_message agent_message
  local -i parse_fd

  if [[ ${1:-} == --command && ${3:-} == --cwd && $# -eq 4 ]]; then
    command=$2
    cwd=$4
  else
    if ! hook_input=$(<&0); then
      respond deny \
        "Blocked shell execution because the safety hook could not read stdin." \
        "Do not retry shell commands. Tell the user that the destructive-command safety hook could not read its input and they should check the hook logs."
    fi

    exec {parse_fd}< <("$JQ" -j '
      (.command // "" | if type == "array" then map(tostring) | join(" ") else tostring end),
      "\u0000",
      (.cwd // "" | tostring),
      "\u0000"
    ' <<<"$hook_input" 2>/dev/null)
    if ! IFS= read -r -d $'\0' command <&$parse_fd || \
       ! IFS= read -r -d $'\0' cwd <&$parse_fd; then
      exec {parse_fd}<&-
      respond deny \
        "Blocked shell execution because the safety hook could not parse its input." \
        "Do not retry shell commands. Tell the user that the destructive-command safety hook received invalid JSON and they should check the hook logs."
    fi
    exec {parse_fd}<&-
  fi

  if [[ -z "${command//[[:space:]]/}" ]]; then
    respond allow
  fi
  if (( ${#command} > 100000 )); then
    respond deny \
      "Blocked shell execution because the command is too large to validate safely." \
      "Do not retry this command. Tell the user that the destructive-command safety limit was exceeded and provide the command for them to review manually."
  fi
  [[ -n $cwd ]] || cwd=$PWD

  reset_analysis
  ANALYSIS_DEPTH=0
  if ! analyze_command "$command"; then
    respond allow
  fi

  category=$ANALYSIS_CATEGORY
  if [[ $category == 'file removal' ]]; then
    if validate_removal "$cwd"; then
      respond allow
    fi
    user_message=$ANALYSIS_MESSAGE
    agent_message="Do not retry this command or attempt a workaround. Tell the user that agents may delete only explicit literal paths inside the active git worktree, excluding the worktree root and Git administrative paths. Provide the exact command for the user to review and run themselves if appropriate."
  elif [[ $category == SQL* ]]; then
    user_message="Blocked destructive SQL command: ${category}."
    agent_message="Do not retry this command or attempt a workaround. Tell the user that agents are not allowed to run destructive SQL. Provide the exact query for the user to review and run themselves in their database client."
  else
    user_message=${ANALYSIS_MESSAGE:-"Blocked destructive shell command: ${category}."}
    agent_message="Do not retry this command or attempt a workaround. Tell the user that agents are not allowed to perform ${category}. Provide the exact command for the user to review and run themselves."
  fi

  respond deny "$user_message" "$agent_message"
}

main "$@"
