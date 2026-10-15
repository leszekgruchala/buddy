#!/bin/zsh
# Shared Codex, Claude Code, and Cursor shell-hook entrypoint.
# Usage: run-pretooluse.zsh claude|codex|cursor
# Each harness hook file passes its own name. Without a known name, the guard denies.
emulate -L zsh
unsetopt errexit

readonly SCRIPT_DIR="${0:A:h}"
readonly ADAPTER="${SCRIPT_DIR}/block-destructive-commands/block-destructive-shell-pretooluse.zsh"
typeset HARNESS=${1:-codex}
[[ $HARNESS == (claude|codex|cursor) ]] || HARNESS=codex

if [[ ! -f $ADAPTER ]]; then
  if [[ $HARNESS == cursor ]]; then
    print -r -- '{"permission":"deny","user_message":"Buddy blocked the shell command because its hook files are incomplete.","agent_message":"Do not retry; tell the user to check the plugin installation and the harness hook logs."}'
  else
    print -r -- '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Blocked shell execution because the Buddy PreToolUse hook is unavailable. Do not retry; tell the user to check the plugin installation and the harness hook logs."}}'
  fi
  exit 0
fi

exec /bin/zsh "$ADAPTER" --harness "$HARNESS"
