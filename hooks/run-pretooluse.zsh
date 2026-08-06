#!/bin/zsh
# Shared Codex, Claude Code, and Cursor PreToolUse entrypoint.
emulate -L zsh
unsetopt errexit

readonly SCRIPT_DIR="${0:A:h}"
readonly ADAPTER="${SCRIPT_DIR}/block-destructive-commands/block-destructive-shell-pretooluse.zsh"

if [[ ! -f $ADAPTER ]]; then
  print -r -- '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Blocked shell execution because the Buddy PreToolUse hook is unavailable. Do not retry; tell the user to check the plugin installation and the harness hook logs."}}'
  exit 0
fi

exec /bin/zsh "$ADAPTER"
