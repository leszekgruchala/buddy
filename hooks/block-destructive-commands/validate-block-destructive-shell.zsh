#!/bin/zsh
# Validate Cursor and shared Codex/Claude PreToolUse hooks against expected outcomes.
emulate -L zsh
setopt errexit pipefail

readonly SCRIPT_DIR=${0:A:h}
HOOK_ZSH=${HOOK_ZSH:-"${SCRIPT_DIR}/block-destructive-shell.zsh"}
PRETOOLUSE_HOOK=${PRETOOLUSE_HOOK:-"${SCRIPT_DIR}/block-destructive-shell-pretooluse.zsh"}

for hook in "$HOOK_ZSH" "$PRETOOLUSE_HOOK"; do
  if [[ ! -f $hook ]]; then
    print -u2 "missing hook: $hook"
    exit 1
  fi
done

typeset TEST_WORKTREE
TEST_WORKTREE=$(mktemp -d "${TMPDIR:-/tmp}/block-destructive-test.XXXXXX")
trap '/bin/rm -rf -- "$TEST_WORKTREE"' EXIT
git -C "$TEST_WORKTREE" init -q
mkdir -p "$TEST_WORKTREE/build" "$TEST_WORKTREE/subdir"
ln -s /tmp "$TEST_WORKTREE/external-link"

run_cursor_hook() {
  local payload=$1
  print -r -- "$payload" | /bin/zsh "$HOOK_ZSH"
}

permission_of() {
  jq -r '.permission' <<<"$1"
}

typeset -i pass=0 fail=0

assert_cursor_case() {
  local name=$1 command=$2 expected=$3 cwd=${4:-$TEST_WORKTREE}
  local payload output exit_status permission agent_message
  payload=$(jq -nc --arg command "$command" --arg cwd "$cwd" '{command: $command, cwd: $cwd}')

  set +e
  output=$(run_cursor_hook "$payload")
  exit_status=$?
  set -e

  if [[ $exit_status -ne 0 ]] || ! jq -e . >/dev/null 2>&1 <<<"$output"; then
    print -u2 "FAIL $name: status=$exit_status invalid output: $output"
    (( fail++ )) || true
    return
  fi

  permission=$(permission_of "$output")
  if [[ $permission != "$expected" ]]; then
    print -u2 "FAIL $name: got $permission expected $expected"
    print -u2 "  out: $output"
    (( fail++ )) || true
    return
  fi

  if [[ $permission == deny ]]; then
    agent_message=$(jq -r '.agent_message // empty' <<<"$output")
    if [[ $agent_message != *'Do not retry'* ]]; then
      print -u2 "FAIL $name: denial lacks actionable agent_message"
      print -u2 "  out: $output"
      (( fail++ )) || true
      return
    fi
  fi

  print "ok  $name -> $permission"
  pass=$(( pass + 1 ))
}

assert_raw_cursor_case() {
  local name=$1 payload=$2 expected=$3
  local output exit_status permission

  set +e
  output=$(run_cursor_hook "$payload")
  exit_status=$?
  set -e

  if [[ $exit_status -ne 0 ]] || ! jq -e . >/dev/null 2>&1 <<<"$output"; then
    print -u2 "FAIL $name: status=$exit_status invalid output: $output"
    (( fail++ )) || true
    return
  fi
  permission=$(permission_of "$output")
  if [[ $permission != "$expected" ]]; then
    print -u2 "FAIL $name: got $permission expected $expected"
    (( fail++ )) || true
    return
  fi
  print "ok  $name -> $permission"
  pass=$(( pass + 1 ))
}

assert_pretooluse_case() {
  local name=$1 hook=$2 command=$3 expected=$4
  local payload output exit_status permission reason
  payload=$(jq -nc --arg command "$command" --arg cwd "$TEST_WORKTREE" \
    '{cwd: $cwd, tool_input: {command: $command}}')

  set +e
  output=$(print -r -- "$payload" | /bin/zsh "$hook")
  exit_status=$?
  set -e

  if [[ $exit_status -ne 0 ]] || ! jq -e . >/dev/null 2>&1 <<<"$output"; then
    print -u2 "FAIL $name: status=$exit_status invalid output: $output"
    (( fail++ )) || true
    return
  fi
  permission=$(jq -r '.hookSpecificOutput.permissionDecision // "allow"' <<<"$output")
  if [[ $permission != "$expected" ]]; then
    print -u2 "FAIL $name: got $permission expected $expected"
    print -u2 "  out: $output"
    (( fail++ )) || true
    return
  fi
  if [[ $permission == deny ]]; then
    reason=$(jq -r '.hookSpecificOutput.permissionDecisionReason // empty' <<<"$output")
    if [[ $reason != *'Do not retry'* ]]; then
      print -u2 "FAIL $name: denial lacks actionable permissionDecisionReason"
      print -u2 "  out: $output"
      (( fail++ )) || true
      return
    fi
  fi
  print "ok  $name -> $permission"
  pass=$(( pass + 1 ))
}

assert_raw_cursor_case 'empty object' '{}' allow
assert_raw_cursor_case 'missing command' '{"cwd":"/tmp"}' allow
assert_raw_cursor_case 'invalid JSON fails closed' 'not-json' deny
assert_cursor_case 'invalid shell syntax fails closed' "echo '" deny
assert_cursor_case 'git status' 'git status' allow
assert_cursor_case 'echo destructive words' 'echo terraform apply' allow
assert_cursor_case 'terraform plan with destructive filename' 'terraform plan -out=destroy' allow
assert_cursor_case 'nested echo destructive words' "bash -c 'echo terraform apply'" allow
assert_cursor_case 'terraform apply' 'terraform apply -auto-approve' deny
assert_cursor_case 'terraform global option apply' 'terraform -chdir=infra apply' deny
assert_cursor_case 'qualified terraform apply' '/usr/bin/terraform apply' deny
assert_cursor_case 'tofu destroy' 'tofu destroy' deny
assert_cursor_case 'terragrunt state' 'terragrunt state list' deny
assert_cursor_case 'nested terraform apply' "bash -c 'terraform apply'" deny
assert_cursor_case 'qualified nested shell' "/bin/bash -lc 'terraform apply'" deny
assert_cursor_case 'nested compound terraform apply' "bash -c 'echo ready; terraform apply'" deny
assert_cursor_case 'later compound terraform apply' 'echo ready && /usr/bin/terraform apply' deny
assert_cursor_case 'env wrapper' 'env TF_LOG=debug terraform apply' deny
assert_cursor_case 'command wrapper' 'command /usr/bin/terraform apply' deny
assert_cursor_case 'sudo options' 'sudo -u root terraform apply' deny
assert_cursor_case 'docker deletion retained' 'docker volume rm data' deny
assert_cursor_case 'xargs removal' 'printf file | xargs rm' deny
assert_cursor_case 'qualified SQL client' '/usr/bin/psql -c "DROP TABLE users"' deny
assert_cursor_case 'qualified SQL read' '/usr/bin/psql -c "SELECT * FROM users"' allow
assert_cursor_case 'inside worktree removal' 'rm -rf build' allow
assert_cursor_case 'absolute inside worktree removal' "unlink $TEST_WORKTREE/build/file" allow
assert_cursor_case 'in-worktree symlink removal' 'rm external-link' allow
assert_cursor_case 'symlink traversal with trailing slash' 'rm -rf external-link/' deny
assert_cursor_case 'shred remains blocked' 'shred build/file' deny
assert_cursor_case 'worktree root removal' 'rm -rf .' deny
assert_cursor_case 'Git metadata removal' 'rm -rf .git' deny
assert_cursor_case 'outside worktree removal' 'rm -rf /tmp/outside' deny
assert_cursor_case 'dynamic path removal' 'rm -rf $HOME/outside' deny
assert_cursor_case 'glob removal' 'rm -rf *.tmp' deny
assert_cursor_case 'compound directory change' 'cd /tmp && rm -rf outside' deny
assert_cursor_case 'nested removal' "bash -c 'rm -rf build'" deny
assert_cursor_case 'symlink traversal removal' 'rm external-link/outside' deny
assert_cursor_case 'removal outside a worktree' 'rm -rf file' deny /tmp

assert_pretooluse_case 'PreToolUse allows safe command' "$PRETOOLUSE_HOOK" 'git status' allow
assert_pretooluse_case 'PreToolUse denies destructive command' "$PRETOOLUSE_HOOK" '/usr/bin/terraform apply' deny
assert_pretooluse_case 'PreToolUse forwards cwd for safe removal' "$PRETOOLUSE_HOOK" 'rm -rf build' allow
assert_pretooluse_case 'PreToolUse denies worktree root removal' "$PRETOOLUSE_HOOK" 'rm -rf .' deny

print ""
print "Results: $pass passed, $fail failed"
[[ $fail -eq 0 ]]
