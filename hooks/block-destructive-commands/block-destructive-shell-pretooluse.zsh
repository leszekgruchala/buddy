#!/bin/zsh
# Adapt shared PreToolUse JSON to the flat policy contract implemented beside this file.
emulate -L zsh
unsetopt errexit
setopt pipefail

readonly SCRIPT_DIR=${0:A:h}
readonly SOURCE_HOOK="${SCRIPT_DIR}/block-destructive-shell.zsh"

typeset JQ
for candidate in jq /opt/homebrew/bin/jq /usr/local/bin/jq /usr/bin/jq; do
  if [[ -n ${candidate##/*} ]]; then
    JQ=$(command -v "$candidate" 2>/dev/null) && break
  elif [[ -x $candidate ]]; then
    JQ=$candidate
    break
  fi
done

fallback_deny() {
  print -r -- '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Blocked shell execution because the destructive-command safety hook failed. Do not retry; tell the user to check the agent hook logs."}}'
}

deny() {
  local reason=$1
  if [[ -n $JQ ]]; then
    "$JQ" -nc --arg reason "$reason" '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: $reason
      }
    }' || fallback_deny
  else
    fallback_deny
  fi
  exit 0
}

allow() {
  print -r -- '{}'
  exit 0
}

if [[ -z $JQ ]]; then
  fallback_deny
  exit 0
fi

if [[ ! -r $SOURCE_HOOK ]]; then
  deny "Blocked shell execution because the destructive-command source hook is unavailable. Do not retry; tell the user to check the agent hook installation."
fi

typeset hook_input command cwd cursor_output message
typeset -i parse_fd
if ! hook_input=$(<&0); then
  deny "Blocked shell execution because the agent hook could not read its input. Do not retry; tell the user to check the agent hook logs."
fi

exec {parse_fd}< <("$JQ" -j '
  (.tool_input.command // .tool_input.cmd // "" |
    if type == "array" then map(tostring) | join(" ") else tostring end),
  "\u0000",
  (.cwd // .tool_input.cwd // "" | tostring),
  "\u0000"
' <<<"$hook_input" 2>/dev/null)
if ! IFS= read -r -d $'\0' command <&$parse_fd || \
   ! IFS= read -r -d $'\0' cwd <&$parse_fd; then
  exec {parse_fd}<&-
  deny "Blocked shell execution because the agent hook input was invalid. Do not retry; tell the user to check the agent hook logs."
fi
exec {parse_fd}<&-
if [[ -z "${command//[[:space:]]/}" ]]; then
  allow
fi

[[ -n $cwd ]] || cwd=$PWD

if ! cursor_output=$(/bin/zsh "$SOURCE_HOOK" --command "$command" --cwd "$cwd"); then
  deny "Blocked shell execution because the destructive-command source hook failed. Do not retry; tell the user to check the agent hook logs."
fi
if [[ $cursor_output == '{"permission":"allow"}' ]]; then
  allow
fi

if ! message=$("$JQ" -er '
  select(.permission == "deny" or .permission == "ask") |
  .agent_message // .user_message // "Blocked by destructive-command safety policy."
' <<<"$cursor_output" 2>/dev/null); then
  deny "Blocked shell execution because the destructive-command source hook returned an invalid response. Do not retry; tell the user to check the agent hook logs."
fi
deny "$message"
