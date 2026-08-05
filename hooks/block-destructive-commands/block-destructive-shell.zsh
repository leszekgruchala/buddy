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
typeset -i ANALYSIS_DIRECT ANALYSIS_DEPTH

typeset PARSED_EXECUTABLE
typeset -a PARSED_ARGUMENTS
typeset -i PARSED_DIRECT

reset_analysis() {
  ANALYSIS_CATEGORY=
  ANALYSIS_EXECUTABLE=
  ANALYSIS_MESSAGE=
  ANALYSIS_ARGUMENTS=()
  ANALYSIS_DIRECT=1
}

shell_syntax_is_balanced() {
  local input=$1 state=none character
  local -i index escaped=0

  for (( index = 1; index <= ${#input}; index++ )); do
    character=$input[index]
    if (( escaped )); then
      escaped=0
      continue
    fi

    case "$state:$character" in
      none:\\|double:\\|backtick:\\)
        escaped=1
        ;;
      none:\')
        state=single
        ;;
      single:\')
        state=none
        ;;
      none:\")
        state=double
        ;;
      double:\")
        state=none
        ;;
      none:\`)
        state=backtick
        ;;
      backtick:\`)
        state=none
        ;;
    esac
  done
  [[ $state == none && $escaped -eq 0 ]]
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
  local -a words segment
  local word
  local -i segment_count=0

  words=(${(z)command})
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
  if ! shell_syntax_is_balanced "$command"; then
    ANALYSIS_CATEGORY='invalid shell syntax'
    ANALYSIS_MESSAGE='Blocked shell execution because quotes or escapes are not balanced.'
  elif ! analyze_command "$command"; then
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
