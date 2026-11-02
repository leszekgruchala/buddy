#!/bin/zsh
# Shared Codex, Claude Code, and Cursor Stop-hook entrypoint.
# Usage: run-stop.zsh claude|codex|cursor
# Each harness hook file passes its own name. Every failure allows the stop.
emulate -L zsh
unsetopt errexit

readonly ADAPTER="${0:A:h}/continue-run/continue-run-stop.zsh"
typeset HARNESS=${1:-codex}
[[ $HARNESS == (claude|codex|cursor) ]] || HARNESS=codex

if [[ -f $ADAPTER ]]; then
  /bin/zsh "$ADAPTER" --harness "$HARNESS"
elif [[ $HARNESS == cursor ]]; then
  print -r -- '{}'
fi
exit 0
