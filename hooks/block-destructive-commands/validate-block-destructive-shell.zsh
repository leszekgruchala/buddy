#!/bin/zsh
# Validate Cursor and shared Codex/Claude PreToolUse hooks against expected outcomes.
emulate -L zsh
setopt errexit pipefail

readonly SCRIPT_DIR=${0:A:h}
HOOK_ZSH=${HOOK_ZSH:-"${SCRIPT_DIR}/block-destructive-shell.zsh"}
PRETOOLUSE_HOOK=${PRETOOLUSE_HOOK:-"${SCRIPT_DIR}/block-destructive-shell-pretooluse.zsh"}
SHARED_PRETOOLUSE_HOOK=${SHARED_PRETOOLUSE_HOOK:-"${SCRIPT_DIR:h}/run-pretooluse.zsh"}

for hook in "$HOOK_ZSH" "$PRETOOLUSE_HOOK" "$SHARED_PRETOOLUSE_HOOK"; do
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

typeset -a heredoc_cases=(
  'Python triple quote apostrophe' $'python3 - <<\'PY\'\ntext = \'\'\'don\'t\'\'\'\nPY' allow
  'Python double quoted delimiter' $'python - <<"PY"\nprint("terraform apply")\nPY' allow
  'qualified Python heredoc' $'/usr/bin/python3 - <<\'PY\'\nprint("hello")\nPY' allow
  'cat literal destructive words' $'cat <<\'DATA\'\nterraform apply\nDATA' allow
  'cat with literal arguments' $'cat -n <<\'DATA\'\nterraform apply\nDATA' allow
  'cat double quoted delimiter' $'cat <<"DATA"\nterraform apply\nDATA' allow
  'tab stripping heredoc' $'cat <<-\'DATA\'\n\tterraform apply\n\tDATA' allow
  'leading spaces are heredoc data' $'cat <<\'DATA\'\n DATA\nterraform apply\nDATA' allow
  'comment apostrophe before heredoc' $'# don\'t interpret this quote\ncat <<\'DATA\'\nhello\nDATA' allow
  'safe shell command after heredoc' $'cat <<\'DATA\'\nterraform apply\nDATA\ngit status' allow
  'later destructive command after heredoc' $'cat <<\'DATA\'\nhello\nDATA\nterraform apply' deny
  'two heredoc apostrophes hide later command' $'cat <<\'A\'\n\'\nA\nterraform apply\ncat <<\'B\'\n\'\nB' deny
  'exact terminator leaves later command' $'cat <<\'DATA\'\n DATA\nDATA\nterraform apply' deny
  'missing heredoc terminator' $'cat <<\'DATA\'\nhello' deny
  'unquoted heredoc delimiter' $'cat <<DATA\nhello\nDATA' deny
  'concatenated heredoc delimiter' $'cat <<\'DA\'"TA"\nhello\nDATA' deny
  'dynamic heredoc delimiter' $'cat <<"$NAME"\nhello\n$NAME' deny
  'multiple heredocs on header' $'cat <<\'A\' <<\'B\'\nhello\nA\nworld\nB' deny
  'here string' 'cat <<< "terraform apply"' deny
  'extra input redirection' $'cat < /dev/null <<\'DATA\'\nhello\nDATA' deny
  'heredoc output redirection' $'cat <<\'DATA\' > output\nhello\nDATA' deny
  'pipeline heredoc consumer' $'cat <<\'DATA\' | sh\nterraform apply\nDATA' deny
  'compound heredoc header' $'echo ready; cat <<\'DATA\'\nhello\nDATA' deny
  'unknown heredoc consumer' $'custom-reader <<\'DATA\'\nhello\nDATA' deny
  'SQL heredoc consumer' $'psql <<\'SQL\'\nDROP TABLE users;\nSQL' deny
  'Python code argument with heredoc' $'python3 -c "import os" <<\'DATA\'\nhello\nDATA' deny
  'Python file with heredoc' $'python3 script.py <<\'DATA\'\nhello\nDATA' deny
  'Python stdin with extra options' $'python3 -u - <<\'DATA\'\nhello\nDATA' deny
  'cat alias before heredoc' $'alias cat=sh\ncat <<\'DATA\'\nterraform apply\nDATA' deny
  'cat function before heredoc' $'cat() { sh; }\ncat <<\'DATA\'\nterraform apply\nDATA' deny
  'eval before heredoc' $'eval "alias cat=sh"\ncat <<\'DATA\'\nterraform apply\nDATA' deny
  'source before heredoc' $'source setup.zsh\ncat <<\'DATA\'\nterraform apply\nDATA' deny
  'command source before heredoc' $'command source setup.zsh\ncat <<\'DATA\'\nterraform apply\nDATA' deny
  'time source before heredoc' $'time source setup.zsh\ncat <<\'DATA\'\nterraform apply\nDATA' deny
  'noglob source before heredoc' $'noglob source setup.zsh\ncat <<\'DATA\'\nterraform apply\nDATA' deny
  'printf variable assignment before heredoc' $'printf -v PATH /tmp\ncat <<\'DATA\'\nterraform apply\nDATA' deny
  'print variable assignment before heredoc' $'print -v PATH /tmp\ncat <<\'DATA\'\nterraform apply\nDATA' deny
  'environment assignment on heredoc' $'PATH=/tmp cat <<\'DATA\'\nhello\nDATA' deny
  'escaped continuation before heredoc' $'echo ready \\\ncat <<\'DATA\'\nterraform apply\nDATA' deny
  'comment fake heredoc' $'# cat <<\'DATA\'\nterraform apply\nDATA' deny
  'continuation comment fake heredoc' $'echo ready \\\n# cat <<\'DATA\'\nterraform apply\nDATA' deny
  'quoted argument fake heredoc' $'printf "%s" "cat <<\'DATA\'"\nterraform apply\nDATA' deny
  'multiline shell quote fake heredoc' $'echo "text\ncat <<\'DATA\'\n"\nterraform apply\nDATA' deny
  'invalid compound shell syntax' 'if true; then echo ready' deny
  'invalid actual shell quote after heredoc' $'cat <<\'DATA\'\nhello\nDATA\necho \'bad' deny
  'ordinary quoted heredoc marker argument' $'echo \'<<\'\ngit status' allow
  'nested shell supported data heredoc' $'bash -c \'cat <<"DATA"\nterraform apply\nDATA\'' allow
  'nested shell destructive after heredoc' $'bash -c \'cat <<"DATA"\nhello\nDATA\nterraform apply\'' deny
  'missing second terminator with same delimiter' $'cat <<\'DATA\'\nhello\nDATA\ncat <<\'DATA\'' deny
  'negated destructive command after heredoc' $'cat <<\'DATA\'\nhello\nDATA\n! terraform apply' deny
  'time destructive command after heredoc' $'cat <<\'DATA\'\nhello\nDATA\ntime terraform apply' deny
  'noglob destructive command after heredoc' $'cat <<\'DATA\'\nhello\nDATA\nnoglob terraform apply' deny
)

typeset -i case_index
for (( case_index = 1; case_index <= ${#heredoc_cases}; case_index += 3 )); do
  assert_pretooluse_case "${heredoc_cases[case_index]}" "$SHARED_PRETOOLUSE_HOOK" \
    "${heredoc_cases[case_index + 1]}" "${heredoc_cases[case_index + 2]}"
done

typeset bounded_command=
for (( case_index = 1; case_index <= 16; case_index++ )); do
  bounded_command+=$'cat <<\'DATA\'\nhello\nDATA\n'
done
assert_pretooluse_case 'sixteen heredocs bound' "$SHARED_PRETOOLUSE_HOOK" "$bounded_command" allow
bounded_command+=$'cat <<\'DATA\'\nhello\nDATA\n'
assert_pretooluse_case 'seventeen heredocs bound' "$SHARED_PRETOOLUSE_HOOK" "$bounded_command" deny

bounded_command=$'cat <<\'DATA\'\nhello\nDATA'
for (( case_index = 1; case_index <= 63; case_index++ )); do
  bounded_command+=$'\necho ready'
done
assert_pretooluse_case 'sixty four outside body lines bound' "$SHARED_PRETOOLUSE_HOOK" "$bounded_command" allow
bounded_command+=$'\necho ready'
assert_pretooluse_case 'sixty five outside body lines bound' "$SHARED_PRETOOLUSE_HOOK" "$bounded_command" deny

typeset consumer
typeset -a shell_consumers=(
  'sh' 'bash' '/bin/zsh' 'source /dev/stdin' '. /dev/stdin'
  'builtin source /dev/stdin' 'noglob sh' 'exec sh' 'time sh' 'command sh'
  'env sh' 'env -S sh' 'env -Ssh' 'env -iSsh' 'env --split-string=sh'
  'env --split-string sh' 'sudo sh' 'ssh host sh' 'su root -c sh'
  'script -c sh /dev/null' 'chroot /tmp sh' 'busybox sh'
)
for consumer in "${shell_consumers[@]}"; do
  assert_pretooluse_case "$consumer heredoc execution" "$SHARED_PRETOOLUSE_HOOK" \
    "$consumer <<'DATA'"$'\nterraform apply\nDATA' deny
done

typeset nested_data=$'cat <<\'DATA\'\nterraform apply\nDATA'
typeset -a ancestor_cases=(
  'function inherited by nested heredoc' $'cat() { sh; }\nexport -f cat\n'
  'source before nested heredoc' $'source setup.zsh\n'
  'wrapped source before nested heredoc' $'command source setup.zsh\n'
  'eval before nested heredoc' $'eval "export -f cat"\n'
  'variable write before nested heredoc' $'printf -v PATH /tmp\n'
  'environment expansion before nested heredoc' $'echo "${PATH:=/tmp}"\n'
)
for (( case_index = 1; case_index <= ${#ancestor_cases}; case_index += 2 )); do
  assert_pretooluse_case "${ancestor_cases[case_index]}" "$SHARED_PRETOOLUSE_HOOK" \
    "${ancestor_cases[case_index + 1]}bash -c ${(q)nested_data}" deny
done

typeset -a evaluator_cases=(
  'emulate consumer override' $'emulate zsh -c \'alias cat=sh\'\n'
  'DEBUG trap consumer override' $'trap \'alias cat=sh\' DEBUG\ntrue\n'
  'nocorrect DEBUG trap consumer override' $'nocorrect trap \'alias cat=sh\' DEBUG\ntrue\n'
)
for (( case_index = 1; case_index <= ${#evaluator_cases}; case_index += 2 )); do
  assert_pretooluse_case "${evaluator_cases[case_index]}" "$SHARED_PRETOOLUSE_HOOK" \
    "${evaluator_cases[case_index + 1]}${nested_data}" deny
  assert_pretooluse_case "${evaluator_cases[case_index]} in ancestor" "$SHARED_PRETOOLUSE_HOOK" \
    "${evaluator_cases[case_index + 1]}bash -c ${(q)nested_data}" deny
done

typeset -a shell_startup_cases=(
  'Bash init file before nested heredoc' 'bash --init-file /tmp/consumer-alias.bash -ic'
  'Bash interactive nested heredoc' 'bash -ic'
  'Bash login nested heredoc' 'bash -lc'
  'Zsh interactive nested heredoc' 'zsh -ic'
  'shell extra option before nested heredoc' 'sh -f -c'
)
for (( case_index = 1; case_index <= ${#shell_startup_cases}; case_index += 2 )); do
  assert_pretooluse_case "${shell_startup_cases[case_index]}" "$SHARED_PRETOOLUSE_HOOK" \
    "${shell_startup_cases[case_index + 1]} ${(q)nested_data}" deny
done

typeset POLICY_FIXTURE_DIR="$TEST_WORKTREE/policy-fixture/hooks"
mkdir -p "$POLICY_FIXTURE_DIR/block-destructive-commands"
cp "$SHARED_PRETOOLUSE_HOOK" "$POLICY_FIXTURE_DIR/run-pretooluse.zsh"
cp "$HOOK_ZSH" "$PRETOOLUSE_HOOK" "$POLICY_FIXTURE_DIR/block-destructive-commands/"
assert_pretooluse_case 'missing heredoc consumer policy' "$POLICY_FIXTURE_DIR/run-pretooluse.zsh" \
  $'cat <<\'DATA\'\nhello\nDATA' deny

typeset -a invalid_policies=(
  'malformed heredoc consumer policy' 'not-json'
  'array heredoc consumer policy' '[]'
  'unknown heredoc consumer policy mode' '{"cat":"execution"}'
)
for (( case_index = 1; case_index <= ${#invalid_policies}; case_index += 2 )); do
  print -r -- "${invalid_policies[case_index + 1]}" > \
    "$POLICY_FIXTURE_DIR/block-destructive-commands/heredoc-data-consumers.json"
  assert_pretooluse_case "${invalid_policies[case_index]}" "$POLICY_FIXTURE_DIR/run-pretooluse.zsh" \
    $'cat <<\'DATA\'\nhello\nDATA' deny
done

print ""
print "Results: $pass passed, $fail failed"
[[ $fail -eq 0 ]]
