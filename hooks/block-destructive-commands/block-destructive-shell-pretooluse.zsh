#!/bin/zsh
# Adapt harness hook JSON to the flat policy contract implemented beside this file,
# and return the decision in the output format of the calling harness.
#
# Usage: block-destructive-shell-pretooluse.zsh --harness claude|codex|cursor
#   claude and cursor ask the user to approve a guarded command.
#   codex denies it, because Codex does not enforce "ask" and runs the command instead.
emulate -L zsh
unsetopt errexit
setopt pipefail

readonly SCRIPT_DIR=${0:A:h}
readonly SOURCE_HOOK="${SCRIPT_DIR}/block-destructive-shell.zsh"

typeset HARNESS=codex
[[ ${1:-} == --harness ]] && HARNESS=${2:-codex}
[[ $HARNESS == (claude|codex|cursor) ]] || HARNESS=codex

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
  if [[ $HARNESS == cursor ]]; then
    print -r -- '{"permission":"deny","user_message":"Buddy blocked the shell command because its accident guard failed.","agent_message":"Do not retry; tell the user to check the agent hook logs."}'
  else
    print -r -- '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Blocked shell execution because the Buddy accident guard failed. Do not retry; tell the user to check the agent hook logs."}}'
  fi
}

# Print decision $1 (allow, ask, or deny) with user message $2 and agent message $3, then exit.
respond() {
  local permission=$1 user_message=${2:-} agent_message=${3:-} reason

  if [[ $permission == allow ]]; then
    [[ $HARNESS == cursor ]] && print -r -- '{"permission":"allow"}' || print -r -- '{}'
    exit 0
  fi
  if [[ -z $JQ ]]; then
    fallback_deny
    exit 0
  fi
  if [[ $HARNESS == cursor ]]; then
    "$JQ" -nc --arg permission "$permission" --arg user_message "$user_message" --arg agent_message "$agent_message" \
      '{permission: $permission, user_message: $user_message, agent_message: $agent_message}' || fallback_deny
    exit 0
  fi
  # Claude Code shows an "ask" reason to the user, and gives it to the agent when nobody can approve.
  if [[ $permission == ask ]]; then
    reason="$user_message $agent_message"
  else
    reason=${agent_message:-$user_message}
  fi
  "$JQ" -nc --arg permission "$permission" --arg reason "$reason" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: $permission,
      permissionDecisionReason: $reason
    }
  }' || fallback_deny
  exit 0
}

deny() {
  respond deny "$1" "$1"
}

if [[ -z $JQ ]]; then
  fallback_deny
  exit 0
fi

if [[ ! -r $SOURCE_HOOK ]]; then
  deny "Blocked shell execution because the Buddy accident guard is unavailable. Do not retry; tell the user to check the agent hook installation."
fi

typeset hook_input command cwd source_harness decision policy_output permission user_message agent_message
typeset -i parse_fd
if ! hook_input=$(<&0); then
  deny "Blocked shell execution because the agent hook could not read its input. Do not retry; tell the user to check the agent hook logs."
fi

# Cursor's beforeShellExecution sends a top-level `command`; the other hooks send `tool_input`.
exec {parse_fd}< <("$JQ" -j '
  (.tool_input.command // .tool_input.cmd // .command // "" |
    if type == "array" then map(tostring) | join(" ") else tostring end),
  "\u0000",
  (.cwd // .tool_input.cwd // "" | tostring),
  "\u0000",
  (if has("turn_id") then "codex" elif has("cursor_version") then "cursor" else "" end),
  "\u0000"
' <<<"$hook_input" 2>/dev/null)
if ! IFS= read -r -d $'\0' command <&$parse_fd || \
   ! IFS= read -r -d $'\0' cwd <&$parse_fd || \
   ! IFS= read -r -d $'\0' source_harness <&$parse_fd; then
  exec {parse_fd}<&-
  deny "Blocked shell execution because the agent hook input was invalid. Do not retry; tell the user to check the agent hook logs."
fi
exec {parse_fd}<&-
# A pattern test stays fast on large input; deleting all whitespace does not.
if [[ $command != *[^[:space:]]* ]]; then
  respond allow
fi

[[ -n $cwd ]] || cwd=$PWD

# Ask only where the harness enforces it. Input that carries another harness's marker means a
# harness loaded the wrong hook file, so deny to stay safe.
decision=deny
if [[ $HARNESS == claude && -z $source_harness ]] || [[ $HARNESS == cursor && $source_harness != codex ]]; then
  decision=ask
fi

if ! policy_output=$(/bin/zsh "$SOURCE_HOOK" --command "$command" --cwd "$cwd" --decision "$decision"); then
  deny "Blocked shell execution because the Buddy accident guard failed. Do not retry; tell the user to check the agent hook logs."
fi
if [[ $policy_output == '{"permission":"allow"}' ]]; then
  respond allow
fi

if ! permission=$("$JQ" -er 'select(.permission == "deny" or .permission == "ask") | .permission' <<<"$policy_output" 2>/dev/null); then
  deny "Blocked shell execution because the Buddy accident guard returned an invalid response. Do not retry; tell the user to check the agent hook logs."
fi
user_message=$("$JQ" -r '.user_message // ""' <<<"$policy_output" 2>/dev/null)
agent_message=$("$JQ" -r '.agent_message // ""' <<<"$policy_output" 2>/dev/null)
respond "$permission" "$user_message" "$agent_message"
