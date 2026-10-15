#!/bin/zsh
# Shared accident-guard policy engine used by the PreToolUse adapter.
# It blocks a short list of irreversible commands. It is not a security boundary:
# when it cannot tell what a command does, it allows the command.
emulate -L zsh
unsetopt errexit
setopt extendedglob pipefail rematchpcre

fallback_denial() {
  print -r -- '{"permission":"deny","user_message":"Shell commands are blocked because the safety hook failed.","agent_message":"Do not retry shell commands. Tell the user that the Buddy accident guard failed and they should check the hook logs. Do not attempt workarounds until the hook is fixed."}'
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

# Larger commands are allowed without analysis to stay inside the hook timeout.
typeset -ri MAX_COMMAND_LENGTH=200000
typeset -ri MAX_HEREDOC_WORK=1000000
typeset -ri MAX_DEPTH=4
typeset -i DEPTH=0
typeset CATEGORY SCAN_CODE PARSED_EXECUTABLE
typeset -a HEREDOC_BODIES SEGMENT_BODIES SEGMENT_HERESTRINGS PARSED_ARGUMENTS POSITIONALS

is_heredoc_operator() {
  [[ $1 == [0-9]#'<<'(|-) ]]
}

is_separator() {
  case "$1" in
    ';'|';;'|';&'|';|'|'&&'|'||'|'|'|'|&'|'&'|'&!'|'&|'|'('|')'|'{'|'}') return 0 ;;
  esac
  return 1
}

is_redirection() {
  [[ $1 =~ '^[0-9]*(<>|<&|>&|>>[|!&]?|>[|!]?|&>>?[|!]?|<)$' ]]
}

# Separate heredoc bodies from the surrounding shell code.
# Set SCAN_CODE to the code without bodies and HEREDOC_BODIES to one body per heredoc operator, in order.
split_heredocs() {
  local -a lines tokens delimiters
  local line delimiter body code= chunk= tab=$'\t'
  local -i index=1 token_index pending=0 strip work=0

  lines=("${(@f)1}")
  HEREDOC_BODIES=()
  while (( index <= $#lines )); do
    line=$lines[index]
    code+=$line$'\n'
    # The chunk holds the lines since the last complete line, so each tokenization stays small.
    chunk+=$line$'\n'
    (( index++ ))
    [[ $line == *'<<'* ]] || (( pending )) || continue

    # Lines inside long open quotes can make the chunk large. Stop and analyze only the code found so far.
    (( work += ${#chunk} ))
    (( work <= MAX_HEREDOC_WORK )) || break
    tokens=(${(Z+C+)chunk})
    delimiters=()
    for (( token_index = 1; token_index <= $#tokens; token_index++ )); do
      is_heredoc_operator "$tokens[token_index]" || continue
      delimiters+=("${tokens[token_index]}"$'\0'"${(Q)tokens[token_index + 1]-}")
    done
    # A newline outside quotes becomes a `;` token. Otherwise the line continues and bodies start later.
    if [[ $tokens[-1] != ';' ]]; then
      (( $#delimiters )) && pending=1
      continue
    fi
    pending=0
    chunk=

    for delimiter in "${delimiters[@]}"; do
      [[ ${delimiter%%$'\0'*} == *- ]] && strip=1 || strip=0
      delimiter=${delimiter#*$'\0'}
      body=
      while (( index <= $#lines )); do
        line=$lines[index]
        (( index++ ))
        if (( strip )); then
          while [[ $line == $tab* ]]; do line=${line#$tab}; done
        fi
        [[ -n $delimiter && $line == "$delimiter" ]] && break
        body+=$line$'\n'
      done
      HEREDOC_BODIES+=("$body")
    done
  done
  SCAN_CODE=$code
}

# Return 0 for a short option cluster such as `sudo -iu` whose earlier letters take no value and whose
# last letter takes a value. An attached value such as `-uroot` does not match.
option_cluster_takes_value() {
  case "$1:$2" in
    sudo:-[AbEHiKklnPSsV]##[CDghprtUu]|doas:-[Lns]##[Cu]) return 0 ;;
  esac
  return 1
}

# Return 0 when option $2 of cloud or cluster tool $1 takes a separate value word.
operand_option_takes_value() {
  case "$1:$2" in
    kubectl:(-n|-l|-s|--namespace|--context|--cluster|--kubeconfig|--selector|--server|--token|--user)|\
    helm:(-n|--namespace|--kube-context|--kubeconfig)|\
    aws:(--profile|--region|--output|--query|--endpoint-url|--ca-bundle|--color|--cli-read-timeout|--cli-connect-timeout)|\
    gcloud:(--project|--account|--format|--configuration|--filter|--impersonate-service-account|--verbosity)|\
    az:(-g|-n|-o|--name|--output|--query|--resource-group|--subscription)|\
    (docker|docker-compose):(-c|-f|-H|-p|--config|--context|--env-file|--file|--host|--log-level|--profile|--project-directory|--project-name))
      return 0
      ;;
  esac
  return 1
}

option_takes_value() {
  case "$1:$2" in
    sudo:(-C|-D|-g|-h|-p|-r|-t|-u|-U|--chdir|--close-from|--group|--host|--other-user|--prompt|--role|--type|--user)|\
    doas:(-C|-u)|env:(-C|-S|-u|--chdir|--split-string|--unset)|exec:-a|nice:(-n|--adjustment)|\
    timeout:(-k|-s|--kill-after|--signal)|(npx|pnpx|bunx):(-p|--package)|\
    uv:(-p|--directory|--env-file|--extra|--from|--group|--index|--package|--project|--with|--with-requirements)|\
    xargs:(-a|-d|-E|-I|-L|-n|-P|-s|--arg-file|--delimiter|--eof|--max-args|--max-chars|--max-lines|--max-procs|--replace))
      return 0
      ;;
  esac
  return 1
}

# Set REPLY to the number of leading option words that belong to command $1.
skip_options() {
  local name=$1 token
  local -i count=0
  shift
  while (( $# )); do
    token=$1
    if [[ $token == -- ]]; then
      REPLY=$(( count + 1 ))
      return
    fi
    [[ $token == -?* ]] || break
    shift
    (( count++ ))
    if [[ $token != *=* ]] && (( $# )) && \
       { option_takes_value "$name" "$token" || option_cluster_takes_value "$name" "$token"; }; then
      shift
      (( count++ ))
    fi
  done
  REPLY=$count
}

# Set PARSED_EXECUTABLE, PARSED_ARGUMENTS, and POSITIONALS for the command that a segment runs.
# Return 1 when the segment runs no command or only looks one up.
unwrap_command() {
  local -a words=("${(@Q)@}")
  local name
  local -i index=1

  PARSED_EXECUTABLE=
  PARSED_ARGUMENTS=()
  POSITIONALS=()
  while (( index <= $#words )); do
    if [[ $words[index] =~ '^[A-Za-z_][A-Za-z0-9_]*(\[[^]]*\])?\+?=' ]]; then
      (( index++ ))
      continue
    fi
    # zsh runs `=name` as the command that `name` resolves to.
    name=${${words[index]#=}:t:l}
    case $name in
      if|then|else|elif|do|while|until|'!'|builtin|coproc|noglob|nocorrect)
        (( index++ ))
        ;;
      command)
        [[ ${words[index + 1]-} == -[vV]* ]] && return 1
        skip_options command "${(@)words[index + 1, -1]}"
        index=$(( index + 1 + REPLY ))
        ;;
      doas|env|exec|nice|nohup|npx|pnpx|bunx|sudo|time|xargs)
        skip_options "$name" "${(@)words[index + 1, -1]}"
        index=$(( index + 1 + REPLY ))
        ;;
      timeout)
        skip_options timeout "${(@)words[index + 1, -1]}"
        index=$(( index + 2 + REPLY ))
        ;;
      npm|pnpm|yarn|bun|bundle|uv|poetry|pipenv)
        case "$name:${words[index + 1]:l}" in
          (npm|pnpm|yarn):(exec|dlx|x)|bun:x|bundle:exec|(uv|poetry|pipenv):run)
            skip_options "$name" "${(@)words[index + 2, -1]}"
            index=$(( index + 2 + REPLY ))
            ;;
          (pnpm|yarn|bun):(prisma|supabase|rails|rake))
            (( index++ ))
            ;;
          *)
            break
            ;;
        esac
        ;;
      *)
        break
        ;;
    esac
  done

  (( index <= $#words )) || return 1
  PARSED_EXECUTABLE=${${words[index]#=}:t:l}
  PARSED_ARGUMENTS=("${(@)words[index + 1, -1]}")
  POSITIONALS=("${(@)PARSED_ARGUMENTS:#-*}")
  return 0
}

# Return 0 when the lowercase arguments contain word $1.
has_argument() {
  (( ${${(@L)arguments}[(Ie)$1]} ))
}

# Return 0 when an argument is a short option cluster that contains letter pattern $1, or is long option $2.
has_flag() {
  local argument
  for argument in "${arguments[@]}"; do
    [[ $argument == -[[:alnum:]]#${~1}[[:alnum:]]# || ( -n ${2-} && $argument == "$2" ) ]] && return 0
  done
  return 1
}

# Set REPLY to the index in `arguments` of the first positional word after index $1.
next_positional() {
  local -i index=$(( $1 + 1 ))
  while (( index <= $#arguments )); do
    [[ $arguments[index] == -* ]] || { REPLY=$index; return 0; }
    (( index++ ))
  done
  return 1
}

check_sql() {
  local sql="${(L)${(j: :)arguments}} ${(L)${(j: :)bodies}} ${(L)${(j: :)herestrings}}"

  if [[ $sql =~ '\bdelete\s+from\b' ]]; then
    CATEGORY='SQL DELETE'
  elif [[ $sql =~ '\btruncate\s+(table\s+)?\w' ]]; then
    CATEGORY='SQL TRUNCATE'
  elif [[ $sql =~ '\bdrop\s+(table|schema|database|dataset|view|materialized\s+view|function|procedure|index|user|role|owned)\b' ]]; then
    CATEGORY='SQL DROP'
  elif [[ $sql =~ '\balter\s+(table|schema|database)\b' ]]; then
    CATEGORY='SQL ALTER'
  elif [[ $sql =~ '\bupdate\s+\S+\s+set\b' ]]; then
    CATEGORY='SQL UPDATE'
  elif [[ $sql =~ '\b(create\s+or\s+)?replace\s+table\b' ]]; then
    CATEGORY='SQL REPLACE TABLE'
  else
    return 1
  fi
}

check_git() {
  local subcommand argument
  local -i index=1

  while (( index <= $#arguments )); do
    case $arguments[index] in
      -C|-c|--git-dir|--work-tree|--namespace|--super-prefix|--config-env) (( index += 2 )) ;;
      -*) (( index++ )) ;;
      *) break ;;
    esac
  done
  (( index <= $#arguments )) || return 1
  subcommand=${arguments[index]:l}
  arguments=("${(@)arguments[index + 1, -1]}")
  positionals=("${(@)arguments:#-*}")

  case $subcommand in
    push)
      has_flag n --dry-run && return 1
      for argument in "${arguments[@]}"; do
        case $argument in
          --force|--force-with-lease|--force-with-lease=*|--force-if-includes|--delete|--mirror|--prune|\
          -[[:alnum:]]#[df][[:alnum:]]#|'+'?*|':'?*)
            CATEGORY='forced or deleting git push'
            return 0
            ;;
        esac
      done
      ;;
    reset)
      has_argument --hard && { CATEGORY='git reset --hard'; return 0; }
      ;;
    clean)
      if has_flag f --force && ! has_flag n --dry-run; then
        CATEGORY='git clean'
        return 0
      fi
      ;;
    branch)
      if has_flag D || { has_flag d --delete && has_flag f --force; }; then
        CATEGORY='forced git branch deletion'
        return 0
      fi
      ;;
    stash)
      [[ ${positionals[1]:l} == (drop|clear) ]] && { CATEGORY='git stash deletion'; return 0; }
      ;;
    filter-branch|filter-repo)
      CATEGORY='git history rewrite'
      return 0
      ;;
    reflog)
      [[ ${positionals[1]:l} == (expire|delete) ]] && { CATEGORY='git reflog deletion'; return 0; }
      ;;
    gc)
      [[ -n ${(M)arguments:#--prune=(now|all)} ]] && { CATEGORY='git gc pruning'; return 0; }
      ;;
  esac
  return 1
}

check_gh() {
  local -a words=("${(@L)positionals}")
  local argument method=
  local -i index

  if [[ $words[1] == api ]]; then
    for (( index = 1; index <= $#arguments; index++ )); do
      argument=$arguments[index]
      case $argument in
        -X|--method) method=${arguments[index + 1]-} ;;
        --method=*) method=${argument#--method=} ;;
        -X?*) method=${argument#-X} ;;
      esac
    done
    [[ ${method:l} == delete ]] && { CATEGORY='GitHub API DELETE request'; return 0; }
    return 1
  fi
  if [[ $words[1] == repo && $words[2] == (delete|archive) ]]; then
    CATEGORY="GitHub repository ${words[2]}"
    return 0
  fi
  if [[ $words[2] == (delete|delete-asset) ]]; then
    CATEGORY="GitHub ${words[1]} deletion"
    return 0
  fi
  return 1
}

check_terraform() {
  local subcommand next=
  local -i index=1

  while (( index <= $#arguments )); do
    case $arguments[index] in
      -chdir) (( index += 2 )) ;;
      -*) (( index++ )) ;;
      *) break ;;
    esac
  done
  (( index <= $#arguments )) || return 1
  subcommand=${arguments[index]:l}
  next_positional $index && next=${arguments[REPLY]:l}

  case $subcommand in
    apply|destroy|force-unlock) ;;
    state) [[ $next == (rm|mv|push|replace-provider) ]] || return 1 ;;
    workspace) [[ $next == delete ]] || return 1 ;;
    run|run-all)
      [[ $executable == terragrunt ]] && { has_argument apply || has_argument destroy; } || return 1
      ;;
    *) return 1 ;;
  esac
  CATEGORY='Terraform state change'
}

# The AWS CLI form is `aws <service> <operation>`, so only the second operand is an operation.
check_aws() {
  local operation=${operands[2]-}

  if [[ $operation == (delete|deprovision|deregister|purge|remove|terminate)-* ]]; then
    CATEGORY='AWS deletion'
    return 0
  fi
  [[ ${operands[1]-} == s3 ]] || return 1
  case $operation in
    rb) ;;
    rm) has_argument --recursive || return 1 ;;
    sync) has_argument --delete || return 1 ;;
    *) return 1 ;;
  esac
  CATEGORY='AWS S3 deletion'
}

check_docker() {
  local -a words=("${operands[@]}")
  local -i index=${words[(Ie)volume]}

  if (( index )) && [[ ${words[index + 1]-} == (rm|remove|prune) ]]; then
    CATEGORY='Docker volume deletion'
    return 0
  fi
  if [[ $executable == docker-compose || ${words[(Ie)compose]} -gt 0 ]] && (( ${words[(Ie)down]} )) && \
     { has_argument -v || has_argument --volumes; }; then
    CATEGORY='Docker volume deletion'
    return 0
  fi
  if (( ${words[(Ie)system]} && ${words[(Ie)prune]} )) && has_argument --volumes; then
    CATEGORY='Docker volume deletion'
    return 0
  fi
  return 1
}

check_database_reset() {
  local -a words=("${(@L)positionals}")
  local action=

  case $executable in
    prisma)
      [[ $words[1] == migrate && $words[2] == reset ]] || \
        { [[ $words[1] == db && $words[2] == push ]] && has_argument --force-reset; } || return 1
      ;;
    supabase)
      [[ $words[1] == db && $words[2] == reset ]] || return 1
      ;;
    rails|rake)
      [[ -n ${(M)words:#db:(drop|purge)*} || -n ${(M)words:#db:(reset|migrate:reset)} ]] || return 1
      ;;
    manage.py)
      action=$words[1]
      ;&
    py*)
      [[ -n $action || $words[1] == *manage.py ]] || return 1
      [[ -n $action ]] || action=$words[2]
      [[ $action == (flush|reset_db) ]] || return 1
      ;;
    *)
      return 1
      ;;
  esac
  CATEGORY='database reset'
}

check_publish() {
  local -a words=("${(@L)positionals}")

  has_argument --dry-run && return 1
  case $executable in
    npm) [[ $words[1] == (publish|unpublish) ]] || return 1 ;;
    pnpm|bun|poetry|uv) [[ $words[1] == publish ]] || return 1 ;;
    yarn) [[ $words[1] == publish || ( $words[1] == npm && $words[2] == publish ) ]] || return 1 ;;
    cargo) [[ $words[1] == publish ]] && ! has_flag n || return 1 ;;
    twine) [[ $words[1] == upload ]] || return 1 ;;
    gem) [[ $words[1] == push ]] || return 1 ;;
    *) return 1 ;;
  esac
  CATEGORY='package publishing'
}

# Return 0 when an `rm` operand names a root, home, current, or parent directory.
check_removal() {
  local operand home=${HOME%/}
  local -a operands
  local -i options=1

  has_flag '[rR]' --recursive || return 1
  for operand in "${arguments[@]}"; do
    if (( options )) && [[ $operand == -- ]]; then
      options=0
    elif (( options )) && [[ $operand == -?* ]]; then
      continue
    else
      operands+=("$operand")
    fi
  done

  for operand in "${operands[@]}"; do
    while [[ $operand == ?*/ || $operand == */'*' || $operand == ?*/. ]]; do
      operand=${operand%/}
      operand=${operand%/'*'}
      operand=${operand%/.}
    done
    if [[ -z $operand || $operand == ('/'|'~'|'$HOME'|'${HOME}'|'.'|'*'|'.*') || \
          $operand == ..(/..)# || $operand == /[^/]## || \
          $operand == ('~'|'$HOME'|'${HOME}')/[^/]## || \
          ( -n $home && $home != / && ( $operand == "$home" || $operand == "$home"/[^/]## ) ) ]]; then
      CATEGORY='recursive removal of a root, home, current, or parent directory'
      return 0
    fi
  done
  return 1
}

check_rules() {
  local -a words=("${(@L)positionals}")

  case $executable in
    terraform|tofu|terragrunt) check_terraform; return ;;
    kubectl)
      if [[ ${operands[1]-} == (delete|drain) ]] || { [[ ${operands[1]-} == replace ]] && has_argument --force; }; then
        CATEGORY='Kubernetes deletion'
        return 0
      fi
      ;;
    helm)
      [[ ${operands[1]-} == (uninstall|delete) ]] && { CATEGORY='Helm release deletion'; return 0; }
      ;;
    aws) check_aws; return ;;
    gcloud)
      if (( ${operands[(Ie)delete]} )) || [[ $operands[(Ie)storage] -gt 0 && ${operands[${operands[(Ie)storage]} + 1]-} == rm ]]; then
        CATEGORY='Google Cloud deletion'
        return 0
      fi
      ;;
    gsutil)
      [[ $words[1] == (rm|rb) ]] && { CATEGORY='Google Cloud deletion'; return 0; }
      ;;
    az)
      (( ${operands[(Ie)delete]} || ${operands[(Ie)purge]} )) && { CATEGORY='Azure deletion'; return 0; }
      ;;
    bq)
      [[ $words[1] == rm ]] && { CATEGORY='BigQuery deletion'; return 0; }
      [[ $words[1] == query ]] && { check_sql; return; }
      ;;
    duckdb|mariadb|mysql|psql|sqlite3|sqlcmd|snowsql|clickhouse-client)
      check_sql
      return
      ;;
    snow|databricks)
      [[ $words[1] == sql ]] && { check_sql; return; }
      ;;
    dropdb|dropuser)
      CATEGORY='PostgreSQL database or role drop'
      return 0
      ;;
    redis-cli)
      { has_argument flushall || has_argument flushdb; } && { CATEGORY='Redis flush'; return 0; }
      ;;
    prisma|supabase|rails|rake|manage.py|py*) check_database_reset; return ;;
    git) check_git; return ;;
    gh) check_gh; return ;;
    npm|pnpm|yarn|bun|cargo|twine|gem|poetry|uv) check_publish; return ;;
    docker|docker-compose) check_docker; return ;;
    dd)
      [[ -n ${(M)${(@L)arguments}:#of=/dev/*~of=/dev/(null|zero|stdout|stderr|tty|fd/*)} ]] && { CATEGORY='disk overwrite'; return 0; }
      ;;
    mkfs|mkfs.*|newfs|newfs_*)
      CATEGORY='filesystem formatting'
      return 0
      ;;
    diskutil)
      if [[ -n ${(M)${(@L)arguments}:#(erasedisk|erasevolume|reformat|partitiondisk|zerodisk|randomdisk|secureerase|deletecontainer|deletevolume)} ]]; then
        CATEGORY='disk erase'
        return 0
      fi
      ;;
    crontab)
      has_flag r && { CATEGORY='crontab removal'; return 0; }
      ;;
    fga)
      [[ $words[1] == tuple && $words[2] == (write|delete) ]] && { CATEGORY='FGA tuple change'; return 0; }
      ;;
    rm) check_removal; return ;;
  esac
  return 1
}

# Return 0 and set CATEGORY when the segment words run a guarded command.
analyze_segment() {
  local -a bodies=("${SEGMENT_BODIES[@]}") herestrings=("${SEGMENT_HERESTRINGS[@]}")
  local -a arguments positionals operands
  local executable input
  local -i index

  unwrap_command "$@" || return 1
  executable=$PARSED_EXECUTABLE
  arguments=("${PARSED_ARGUMENTS[@]}")
  positionals=("${POSITIONALS[@]}")
  # Operands are lowercase positional words that are not option values, so values such as
  # `--namespace prod` do not look like subcommands.
  for (( index = 1; index <= $#arguments; index++ )); do
    [[ $arguments[index] == -* ]] && continue
    (( index > 1 )) && operand_option_takes_value "$executable" "${arguments[index - 1]}" && continue
    operands+=("${arguments[index]:l}")
  done

  case $executable in
    bash|dash|fish|ksh|sh|zsh)
      for (( index = 1; index <= $#arguments; index++ )); do
        if [[ $arguments[index] == -[^-]#c[^-]# ]]; then
          (( index < $#arguments )) && analyze_command "$arguments[index + 1]"
          return
        fi
      done
      # Without -c or a script operand, the shell runs commands from standard input.
      (( $#positionals )) && return 1
      for input in "${bodies[@]}" "${herestrings[@]}"; do
        analyze_command "$input" && return 0
      done
      return 1
      ;;
    eval)
      analyze_command "${(j: :)arguments}"
      return
      ;;
  esac
  check_rules
}

# Return 0 and set CATEGORY when the command runs a guarded command.
analyze_command() {
  local -i DEPTH=$(( DEPTH + 1 ))
  local -a tokens words bodies herestrings all_bodies
  local token
  local -i index ordinal=0

  (( DEPTH <= MAX_DEPTH )) || return 1
  split_heredocs "$1"
  all_bodies=("${HEREDOC_BODIES[@]}")
  tokens=(${(Z+C+)SCAN_CODE})

  for (( index = 1; index <= $#tokens + 1; index++ )); do
    token=${tokens[index]-}
    if (( index > $#tokens )) || is_separator "$token"; then
      if (( $#words )); then
        SEGMENT_BODIES=("${bodies[@]}")
        SEGMENT_HERESTRINGS=("${herestrings[@]}")
        analyze_segment "${words[@]}" && return 0
      fi
      words=()
      bodies=()
      herestrings=()
    elif is_heredoc_operator "$token"; then
      (( ordinal++ ))
      bodies+=("${all_bodies[ordinal]-}")
      (( index++ ))
    elif [[ $token == [0-9]#'<<<' ]]; then
      herestrings+=("${(Q)tokens[index + 1]-}")
      (( index++ ))
    elif is_redirection "$token"; then
      (( index++ ))
    else
      words+=("$token")
    fi
  done
  return 1
}

# Usage: block-destructive-shell.zsh --command <command> --cwd <dir> [--decision ask|deny]
#    or: JSON {"command", "cwd"} on standard input, which always denies.
# Print {"permission": "allow"}, or the decision with a user message and an agent message.
main() {
  local hook_input command cwd user_message agent_message decision=deny
  local -i parse_fd

  if [[ ${1:-} == --command && ${3:-} == --cwd && ( $# -eq 4 || ( $# -eq 6 && ${5:-} == --decision ) ) ]]; then
    command=$2
    cwd=$4
    [[ ${6:-} == ask ]] && decision=ask
  else
    if ! hook_input=$(<&0); then
      respond deny \
        "Blocked shell execution because the safety hook could not read stdin." \
        "Do not retry shell commands. Tell the user that the Buddy accident guard could not read its input and they should check the hook logs."
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
        "Do not retry shell commands. Tell the user that the Buddy accident guard received invalid JSON and they should check the hook logs."
    fi
    exec {parse_fd}<&-
  fi

  # A pattern test stays fast on large input; deleting all whitespace does not.
  if (( ${#command} > MAX_COMMAND_LENGTH )) || [[ $command != *[^[:space:]]* ]]; then
    respond allow
  fi

  CATEGORY=
  analyze_command "$command" || respond allow

  if [[ $decision == ask ]]; then
    user_message="Buddy accident guard: this command runs ${CATEGORY}, which is hard to undo. Approve it only if you intended it."
    agent_message="If the user does not approve it, or nobody can approve it, do not retry this command or work around the guard with another shell, script, alias, or tool. Give the user the exact command to review and run themselves."
  else
    user_message="Buddy blocked ${CATEGORY} to prevent an accident."
    agent_message="Do not retry this command or work around the guard with another shell, script, alias, or tool. Tell the user that the Buddy accident guard blocks ${CATEGORY}, and give them the exact command to review and run themselves."
  fi
  respond "$decision" "$user_message" "$agent_message"
}

main "$@"
