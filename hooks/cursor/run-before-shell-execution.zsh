#!/bin/zsh
# Cursor beforeShellExecution entrypoint.
emulate -L zsh
unsetopt errexit

readonly SCRIPT_DIR="${0:A:h}"

resolve_engine() {
  local candidate

  candidate="${SCRIPT_DIR}/../block-destructive-commands/block-destructive-shell.zsh"
  if [[ -f $candidate ]]; then
    print -r -- "$candidate"
    return 0
  fi

  candidate="${HOME}/.cursor/plugins/local/buddy/hooks/block-destructive-commands/block-destructive-shell.zsh"
  if [[ -f $candidate ]]; then
    print -r -- "$candidate"
    return 0
  fi

  return 1
}

typeset engine
if ! engine=$(resolve_engine); then
  print -r -- '{"permission":"deny","user_message":"Shell commands are blocked because the Buddy safety hook is unavailable.","agent_message":"Do not retry shell commands. Tell the user Buddy'\''s destructive-command hook is not installed correctly and they should check Customize -> Plugins and the Hooks output channel."}'
  exit 0
fi

exec /bin/zsh "$engine"
