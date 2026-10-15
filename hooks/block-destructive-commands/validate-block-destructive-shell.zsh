#!/bin/zsh
# Validate the shared accident guard and its PreToolUse adapters against expected decisions.
emulate -L zsh
setopt errexit pipefail
zmodload zsh/datetime

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

typeset TEST_DIR
TEST_DIR=$(mktemp -d "${TMPDIR:-/tmp}/buddy-guard-test.XXXXXX")
trap '/bin/rm -rf -- "$TEST_DIR"' EXIT

typeset -i pass=0 fail=0

record_failure() {
  print -u2 "FAIL $1"
  [[ -n ${2-} ]] && print -u2 "  out: $2"
  (( fail++ )) || true
}

assert_cursor_case() {
  local name=$1 command=$2 expected=$3
  local payload output exit_status permission agent_message
  payload=$(jq -nc --arg command "$command" --arg cwd "$TEST_DIR" '{command: $command, cwd: $cwd}')

  set +e
  output=$(print -r -- "$payload" | /bin/zsh "$HOOK_ZSH")
  exit_status=$?
  set -e

  if [[ $exit_status -ne 0 ]] || ! jq -e . >/dev/null 2>&1 <<<"$output"; then
    record_failure "$name: status=$exit_status invalid output" "$output"
    return
  fi
  permission=$(jq -r '.permission' <<<"$output")
  if [[ $permission != "$expected" ]]; then
    record_failure "$name: got $permission expected $expected" "$output"
    return
  fi
  if [[ $permission == deny ]]; then
    agent_message=$(jq -r '.agent_message // empty' <<<"$output")
    if [[ $agent_message != *'Do not retry'* || $agent_message != *'exact command'* ]]; then
      record_failure "$name: denial lacks actionable agent_message" "$output"
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
  output=$(print -r -- "$payload" | /bin/zsh "$HOOK_ZSH")
  exit_status=$?
  set -e

  if [[ $exit_status -ne 0 ]] || ! jq -e . >/dev/null 2>&1 <<<"$output"; then
    record_failure "$name: status=$exit_status invalid output" "$output"
    return
  fi
  permission=$(jq -r '.permission' <<<"$output")
  if [[ $permission != "$expected" ]]; then
    record_failure "$name: got $permission expected $expected" "$output"
    return
  fi
  print "ok  $name -> $permission"
  pass=$(( pass + 1 ))
}

assert_pretooluse_case() {
  local name=$1 hook=$2 payload=$3 expected=$4
  local output exit_status permission reason

  set +e
  output=$(print -r -- "$payload" | /bin/zsh "$hook")
  exit_status=$?
  set -e

  if [[ $exit_status -ne 0 ]] || ! jq -e . >/dev/null 2>&1 <<<"$output"; then
    record_failure "$name: status=$exit_status invalid output" "$output"
    return
  fi
  permission=$(jq -r '.hookSpecificOutput.permissionDecision // "allow"' <<<"$output")
  if [[ $permission != "$expected" ]]; then
    record_failure "$name: got $permission expected $expected" "$output"
    return
  fi
  if [[ $permission == deny ]]; then
    reason=$(jq -r '.hookSpecificOutput.permissionDecisionReason // empty' <<<"$output")
    if [[ $reason != *'Do not retry'* ]]; then
      record_failure "$name: denial lacks actionable permissionDecisionReason" "$output"
      return
    fi
  fi
  print "ok  $name -> $permission"
  pass=$(( pass + 1 ))
}

pretooluse_payload() {
  jq -nc --arg command "$1" --arg cwd "$TEST_DIR" '{cwd: $cwd, tool_input: {command: $command}}'
}

typeset reported_command_one reported_command_two
read -r -d '' reported_command_one <<'EOF' || true
cd ../claude-keepwarm && sed -n '240,340p;395,440p' keepwarm | cat -n | sed 's/^/ /' | head -0; awk 'NR>=245 && NR<=335 {printf "%d: %s\n", NR, $0}' keepwarm; echo ======; awk 'NR>=400 && NR<=435 {printf "%d: %s\n", NR, $0}' keepwarm; echo =====; grep -nE 'crontab|launchd|LaunchAgent|PATH=|CLAUDE_CONFIG_DIR|HOME' keepwarm | head -40
EOF
read -r -d '' reported_command_two <<'EOF' || true
cd ../codex-keepwarm && sed -n '155,185p' src/transport.py; echo =====; sed -n '180,215p' src/cli.py; echo =====; sed -n '1,40p' src/scheduler.py
EOF

# Commands that must run. Add every reported false positive here before changing the guard.
typeset -a allow_cases=(
  'plain read' 'git status'
  'reported equals words and sed ranges 1' "$reported_command_one"
  'reported equals words and sed ranges 2' "$reported_command_two"
  'equals words' "sed -n '1,2p' README.md; echo =====; echo =no-such-command"
  'invalid quote syntax' "echo '"
  'invalid compound syntax' 'if true; then echo ready'
  'destructive words as echo data' 'echo terraform apply && echo git push --force'
  'destructive words in commit message' 'git commit -m "never run rm -rf / or git push --force"'
  'destructive words in printf data' 'printf "%s\n" "rm -rf /"'
  'destructive words in grep pattern' "grep -nE 'crontab -r|DROP TABLE' README.md"
  'nested echo destructive words' "bash -c 'echo terraform apply'"
  'command lookup' 'command -v rm terraform'
  'terraform plan with destructive filename' 'terraform plan -out=destroy'
  'terraform state read' 'terraform state list && terraform state show aws_s3_bucket.logs'
  'kubectl read' 'kubectl -n prod get pods'
  'helm read' 'helm list -A'
  'aws read' 'aws --profile prod ec2 describe-instances'
  'aws single object removal' 'aws s3 rm s3://bucket/key.txt'
  'gcloud read' 'gcloud compute instances list'
  'SQL read' '/usr/bin/psql -c "SELECT * FROM users"'
  'SQL vacuum full' "psql -c 'VACUUM FULL users'"
  'SQL file named drop' 'psql -f drop_tables.sql'
  'docker container removal' 'docker rm old && docker rmi old-image && docker system prune -f'
  'docker compose down without volumes' 'docker compose down'
  'git push to new branch' 'git push -u origin feature'
  'git push explicit refspec' 'git push origin HEAD:refs/heads/feature'
  'git push dry run with force' 'git push --dry-run --force origin main'
  'git push from other directory' 'git -C sub push origin main'
  'git safe branch deletion' 'git branch -d merged-feature'
  'git clean dry run' 'git clean -nfd'
  'git soft reset' 'git reset --soft HEAD~1'
  'git stash use' 'git stash list && git stash pop'
  'git discard own edit' 'git checkout -- README.md && git restore notes.md'
  'gh pull request' 'gh pr create --title Fix --body "Delete stale notes"'
  'gh label search word' 'gh pr list --label delete'
  'gh api read' 'gh api repos/o/r'
  'npm dry-run publish' 'npm publish --dry-run'
  'npm script' 'npm run build'
  'prisma dev migration' 'npx prisma migrate dev'
  'crontab list' 'crontab -l'
  'dd to image file' 'dd if=/dev/zero of=disk.img bs=1m count=1'
  'project removal' 'rm -rf build ./node_modules dist/'
  'nested project removal' "bash -c 'rm -rf build'"
  'deep absolute removal' 'rm -rf /tmp/buddy-test/build'
  'home project removal' "rm -rf ${HOME}/projects/app/build"
  'non-recursive removal' 'rm -f notes.txt && unlink old.txt'
  'Python heredoc' $'python3 - <<\'PY\'\nprint("terraform apply")\nPY'
  'cat heredoc with destructive words' $'cat <<\'DATA\'\nterraform apply\nDATA'
  'tab-stripped heredoc' $'cat <<-\'DATA\'\n\tgit push --force\n\tDATA'
  'unquoted heredoc delimiter' $'cat <<DATA\nrm -rf /\nDATA'
  'heredoc to file' $'cat > notes.md <<\'EOF\'\nrm -rf /\nEOF\ngit add notes.md && git status'
  'heredoc with output redirection' $'cat <<\'DATA\' > output\nhello\nDATA'
  'heredoc after directory change' $'cd subdir && cat > notes.md <<\'EOF\'\nhello\nEOF'
  'git commit message heredoc' $'git commit -q -F - <<\'MSG\'\nfix: notes\n\ngit push --force\nMSG\ngit log --oneline -1'
  'gh body heredoc' $'gh pr create --title "Fix" --body-file - <<\'EOF\'\n## Why\n\n`terraform apply` was blocked.\nEOF'
  'git apply heredoc' $'git apply <<\'EOF\'\n--- a/x\n+++ b/x\nEOF'
  'here string data' 'cat <<< "terraform apply"'
  'environment assignment on heredoc' $'PATH=/tmp cat <<\'DATA\'\nhello\nDATA'
  'multiline quoted message before heredoc' $'git commit -qam "fix: notes\n\nBody" && git push origin main 2>&1 | tail -2\ncat > notes.md <<\'EOF\'\nhello\nEOF\ngh release create v1 --notes-file notes.md'
  'heredoc marker text in body' $'cat > notes.md <<\'EOF\'\nRun `cat > notes.md <<\'EOF\'` first.\nEOF\ngh release view v1'
  'quoted heredoc markers' $'grep -c \'<<<<<<<\' README.md | sort > counts.txt; echo \'<<\''
  'comment with destructive words' $'# terraform apply later\ngit status'
  'kubectl resource named delete' 'kubectl get deploy/delete'
  'kubectl drain in resource name' 'kubectl logs -n observability deploy/log-drainer'
  'kubectl delete in label' 'kubectl get pods -l app=delete'
  'kubectl permission check' 'kubectl auth can-i delete pods'
  'helm release named delete' 'helm upgrade --install delete-reminders ./chart'
  'az list deleted' 'az keyvault secret list-deleted --vault-name kv'
  'docker compose project name with v' 'docker compose --project-name my-vault down'
  'docker compose env file' 'docker compose --env-file .env-vars down'
  'redis key named flushall' 'redis-cli get flushall_marker'
  'terragrunt directory named apply' 'terragrunt run-all plan --terragrunt-working-dir stacks/apply-later'
  'aws option value named remove' 'aws cloudformation describe-stacks --stack-name remove-legacy-api'
  'aws option value named delete' 'aws lambda get-function --function-name delete-expired-sessions'
  'dd to null device' 'dd if=big.iso of=/dev/null bs=1m'
  'dd to stdout' 'dd if=/dev/zero of=/dev/stdout count=1'
  'aws upload of file named delete' 'aws s3 cp delete-report.csv s3://bucket/'
)

# Commands that must be blocked: one entry per rule, plus shell forms that hide the command.
typeset -a deny_cases=(
  'terraform apply' 'terraform apply -auto-approve'
  'terraform apply help' 'terraform apply -help'
  'terraform chdir apply' 'terraform -chdir=infra apply'
  'terraform separate chdir destroy' 'terraform -chdir infra destroy'
  'qualified terraform' '/usr/bin/terraform apply'
  'tofu destroy' 'tofu destroy'
  'terraform state removal' 'terraform state rm aws_s3_bucket.logs'
  'terraform force unlock' 'terraform force-unlock 1234'
  'terraform workspace deletion' 'terraform workspace delete dev'
  'terragrunt run-all apply' 'terragrunt run-all apply'
  'terragrunt run destroy' 'terragrunt run -- destroy'
  'kubectl delete' 'kubectl -n prod delete deploy api'
  'kubectl drain' 'kubectl drain node-1'
  'kubectl forced replace' 'kubectl replace --force -f app.yaml'
  'helm uninstall' 'helm uninstall api'
  'aws terminate' 'aws ec2 terminate-instances --instance-ids i-1'
  'aws delete with profile' 'aws --profile prod s3api delete-bucket --bucket b'
  'aws purge' 'aws sqs purge-queue --queue-url u'
  'aws s3 recursive removal' 'aws s3 rm s3://b --recursive'
  'aws s3 bucket removal' 'aws s3 rb s3://b --force'
  'aws s3 sync deletion' 'aws s3 sync . s3://b --delete'
  'gcloud delete' 'gcloud compute instances delete vm-1'
  'gcloud storage removal' 'gcloud storage rm gs://b/**'
  'gsutil removal' 'gsutil -m rm -r gs://b'
  'az delete' 'az group delete -n rg'
  'az purge' 'az keyvault purge -n kv'
  'bq removal' 'bq rm -f ds.t'
  'bq delete query' "bq query 'DELETE FROM ds.t WHERE true'"
  'SQL drop' 'psql -c "DROP TABLE users"'
  'SQL truncate' 'mysql -e "TRUNCATE TABLE users"'
  'SQL delete' 'sqlite3 app.db "DELETE FROM users"'
  'SQL update' "psql -c 'UPDATE users SET admin = true'"
  'SQL alter' "psql -c 'ALTER TABLE users DROP COLUMN email'"
  'SQL replace table' "snowsql -q 'CREATE OR REPLACE TABLE t AS SELECT 1'"
  'SQL heredoc' $'psql <<\'SQL\'\nDROP TABLE users;\nSQL'
  'SQL here string' 'psql <<< "drop table users"'
  'dropdb' 'dropdb app'
  'dropuser' 'dropuser app'
  'redis flushall' 'redis-cli FLUSHALL'
  'redis flushdb' 'redis-cli -n 2 flushdb'
  'prisma reset' 'npx prisma migrate reset --force'
  'prisma force reset' 'pnpm exec prisma db push --force-reset'
  'supabase reset' 'supabase db reset --linked'
  'rails drop' 'bin/rails db:drop'
  'rake reset' 'bundle exec rake db:reset'
  'django flush' 'python3 manage.py flush --noinput'
  'django flush through uv' 'uv run python manage.py flush'
  'git force push' 'git push --force origin main'
  'git short force push' 'git push -f'
  'git clustered force push' 'git push -uf origin feature'
  'git force with lease' 'git push --force-with-lease'
  'git plus refspec' 'git push origin +main'
  'git delete refspec' 'git push origin :old-branch'
  'git delete push' 'git push --delete origin old-branch'
  'git mirror push' 'git push --mirror'
  'git force push from other directory' 'git -C sub push -f'
  'git hard reset' 'git reset --hard HEAD~1'
  'git clean' 'git clean -fdx'
  'git long clean' 'git clean --force'
  'git forced branch deletion' 'git branch -D feature'
  'git long forced branch deletion' 'git branch --delete --force feature'
  'git stash drop' 'git stash drop'
  'git stash clear' 'git stash clear'
  'git filter-branch' 'git filter-branch --tree-filter true'
  'git filter-repo' 'git filter-repo --path secrets'
  'git reflog expire' 'git reflog expire --expire=now --all'
  'git gc prune now' 'git gc --prune=now'
  'gh repo delete' 'gh repo delete o/r --yes'
  'gh repo archive' 'gh repo archive o/r'
  'gh release delete' 'gh release delete v1'
  'gh secret delete' 'gh secret delete TOKEN'
  'gh api delete' 'gh api -X DELETE repos/o/r'
  'gh api long method' 'gh api --method=delete repos/o/r'
  'gh api attached method' 'gh api repos/o/r -XDELETE'
  'npm publish' 'npm publish'
  'npm unpublish' 'npm unpublish pkg@1.0.0'
  'pnpm publish' 'pnpm publish'
  'yarn npm publish' 'yarn npm publish'
  'cargo publish' 'cargo publish'
  'twine upload' 'twine upload dist/*'
  'gem push' 'gem push app.gem'
  'poetry publish' 'poetry publish'
  'uv publish' 'uv publish'
  'docker volume removal' 'docker volume rm data'
  'docker volume prune' 'docker volume prune -f'
  'docker system prune volumes' 'docker system prune --volumes -f'
  'docker compose down volumes' 'docker compose -f app.yml down -v'
  'docker-compose down volumes' 'docker-compose down --volumes'
  'dd to device' 'dd if=/dev/zero of=/dev/disk2'
  'mkfs' 'mkfs.ext4 /dev/sdb1'
  'newfs' 'newfs_apfs /dev/disk3'
  'diskutil erase' 'diskutil eraseDisk APFS Blank disk2'
  'crontab removal' 'crontab -r'
  'crontab clustered removal' 'crontab -ir'
  'fga tuple write' 'fga tuple write user:a reader doc:b'
  'fga tuple delete' 'fga tuple delete user:a reader doc:b'
  'root removal' 'rm -rf /'
  'root glob removal' 'rm -rf /*'
  'home removal' 'rm -rf ~'
  'home slash removal' 'rm -rf ~/'
  'quoted home variable removal' 'rm -rf "$HOME"'
  'home child removal' 'rm -rf ~/Documents'
  'home variable child removal' 'rm -rf $HOME/Documents'
  'literal home removal' "rm -rf ${HOME}"
  'literal home child removal' "rm -rf ${HOME}/Documents"
  'current directory removal' 'rm -rf .'
  'current glob removal' 'rm -rf ./*'
  'bare glob removal' 'rm -rf *'
  'parent removal' 'rm -rf ..'
  'grandparent removal' 'rm -rf ../..'
  'top-level directory removal' 'sudo rm -rf /usr'
  'separate recursive flags' 'rm -r -f /'
  'long recursive flag' 'rm --recursive --force /'
  'removal after end of options' 'rm -rf -- /'
  'equals-expanded removal' '=rm -rf /'
  'command equals-expanded removal' 'command =rm -rf /'
  'quoted executable' "'terraform' apply"
  'nested shell' "bash -c 'terraform apply'"
  'qualified login shell' "/bin/bash -lc 'terraform apply'"
  'nested compound' "bash -c 'echo ready; terraform apply'"
  'double nested shell' "sh -c \"bash -c 'git push -f'\""
  'nested equals-expanded removal' "zsh -c '=rm -rf /'"
  'equals-expanded nested shell' "=bash -c 'terraform apply'"
  'eval' 'eval "git push --force"'
  'later compound' 'echo ready && terraform apply'
  'pipeline' 'git status | time terraform apply'
  'background' 'nohup terraform apply &'
  'subshell' '(terraform apply)'
  'brace group' '{ terraform apply; }'
  'reserved words' 'if true; then terraform apply; fi'
  'exec prefix' 'exec terraform apply'
  'sudo with options' 'sudo -u root terraform apply'
  'env prefix' 'env FOO=1 terraform apply'
  'assignment prefix' 'FOO=1 terraform apply'
  'timeout prefix' 'timeout 60 terraform apply'
  'redirection prefix' '2>/dev/null git push -f'
  'shell heredoc' $'bash <<\'EOF\'\nterraform apply\nEOF'
  'shell heredoc after directory change' $'cd subdir && sh <<\'EOF\'\ngit push --force\nEOF'
  'shell here string' 'bash <<< "terraform apply"'
  'command after heredoc' $'cat > notes.md <<\'EOF\'\nhello\nEOF\nterraform apply'
  'command after tab-stripped heredoc' $'cat <<-\'DATA\'\n\thello\n\tDATA\ngit push -f'
  'command after multiline quote' $'git commit -qam "fix\n\nbody" && git push --force'
  'command before heredoc' $'terraform apply && cat > notes.md <<\'EOF\'\nhello\nEOF'
  'pnpm prisma reset' 'pnpm prisma migrate reset'
  'yarn prisma reset' 'yarn prisma migrate reset'
  'sudo clustered user option' 'sudo -iu root terraform apply'
  'sudo clustered non-interactive user option' 'sudo -nu deploy terraform apply'
  'kubectl delete after namespace' 'kubectl --namespace prod delete pod api'
  'helm uninstall after namespace' 'helm --namespace prod uninstall api'
  'docker compose volumes after project' 'docker compose --project-name app down -v'
  'helm uninstall after boolean flag' 'helm --debug uninstall api'
  'gcloud storage removal after boolean flag' 'gcloud --quiet storage rm gs://b/x'
  'aws s3 removal after boolean flag' 'aws --debug s3 rm s3://b --recursive'
  'kubectl delete after boolean flag' 'kubectl --insecure-skip-tls-verify delete pod x'
  'sudo attached user value' 'sudo -uroot terraform apply'
  'xargs attached replace value' 'xargs -IFILE terraform apply'
)

typeset -i case_index
for (( case_index = 1; case_index <= ${#allow_cases}; case_index += 2 )); do
  assert_cursor_case "${allow_cases[case_index]}" "${allow_cases[case_index + 1]}" allow
done
for (( case_index = 1; case_index <= ${#deny_cases}; case_index += 2 )); do
  assert_cursor_case "${deny_cases[case_index]}" "${deny_cases[case_index + 1]}" deny
done

assert_raw_cursor_case 'empty object' '{}' allow
assert_raw_cursor_case 'missing command' '{"cwd":"/tmp"}' allow
assert_raw_cursor_case 'invalid JSON fails closed' 'not-json' deny

assert_pretooluse_case 'PreToolUse allows safe command' "$PRETOOLUSE_HOOK" "$(pretooluse_payload 'git status')" allow
assert_pretooluse_case 'PreToolUse denies guarded command' "$PRETOOLUSE_HOOK" "$(pretooluse_payload '/usr/bin/terraform apply')" deny
assert_pretooluse_case 'shared launcher allows safe command' "$SHARED_PRETOOLUSE_HOOK" "$(pretooluse_payload 'git status')" allow
assert_pretooluse_case 'shared launcher denies guarded command' "$SHARED_PRETOOLUSE_HOOK" "$(pretooluse_payload 'git push --force')" deny
assert_pretooluse_case 'shared launcher reads cmd field' "$SHARED_PRETOOLUSE_HOOK" '{"tool_input":{"cmd":"terraform apply"}}' deny
assert_pretooluse_case 'shared launcher joins array command' "$SHARED_PRETOOLUSE_HOOK" '{"tool_input":{"command":["git","push","-f"]}}' deny
assert_pretooluse_case 'shared launcher allows empty command' "$SHARED_PRETOOLUSE_HOOK" '{"tool_input":{"command":""}}' allow
assert_pretooluse_case 'shared launcher denies invalid JSON' "$SHARED_PRETOOLUSE_HOOK" 'not-json' deny

# Each harness hook file passes its name. Claude Code and Cursor ask; Codex and unknown callers deny.
assert_launcher_case() {
  local name=$1 harness=$2 payload=$3 expected=$4
  local output exit_status permission messages

  set +e
  output=$(print -r -- "$payload" | /bin/zsh "$SHARED_PRETOOLUSE_HOOK" ${harness:+"$harness"})
  exit_status=$?
  set -e

  if [[ $exit_status -ne 0 ]] || ! jq -e . >/dev/null 2>&1 <<<"$output"; then
    record_failure "$name: status=$exit_status invalid output" "$output"
    return
  fi
  permission=$(jq -r '.hookSpecificOutput.permissionDecision // .permission // "allow"' <<<"$output")
  if [[ $permission != "$expected" ]]; then
    record_failure "$name: got $permission expected $expected" "$output"
    return
  fi
  if [[ $permission != allow ]]; then
    messages=$(jq -r '[.hookSpecificOutput.permissionDecisionReason, .user_message, .agent_message] | map(select(.)) | join(" ")' <<<"$output")
    if [[ ${(L)messages} != *'do not retry'* || $messages != *'exact command'* ]]; then
      record_failure "$name: decision lacks actionable guidance" "$output"
      return
    fi
  fi
  print "ok  $name -> $permission"
  pass=$(( pass + 1 ))
}

cursor_payload() {
  jq -nc --arg command "$1" --arg cwd "$TEST_DIR" '{command: $command, cwd: $cwd, cursor_version: "test"}'
}

assert_launcher_case 'Claude Code asks for guarded command' claude "$(pretooluse_payload 'git push --force')" ask
assert_launcher_case 'Claude Code allows safe command' claude "$(pretooluse_payload 'git status')" allow
assert_launcher_case 'Codex denies guarded command' codex "$(pretooluse_payload 'git push --force')" deny
assert_launcher_case 'unknown harness denies guarded command' unknown "$(pretooluse_payload 'git push --force')" deny
assert_launcher_case 'missing harness denies guarded command' '' "$(pretooluse_payload 'git push --force')" deny
assert_launcher_case 'Cursor asks for guarded command' cursor "$(cursor_payload 'git push --force')" ask
assert_launcher_case 'Cursor allows safe command' cursor "$(cursor_payload 'git status')" allow
assert_launcher_case 'Cursor allows empty command' cursor "$(cursor_payload '')" allow
assert_launcher_case 'Claude hook file in Codex denies' claude '{"turn_id":"t","tool_input":{"command":"git push -f"}}' deny
assert_launcher_case 'Claude hook file in Cursor denies' claude '{"cursor_version":"1","tool_input":{"command":"git push -f"}}' deny
assert_launcher_case 'Cursor hook file in Codex denies' cursor '{"turn_id":"t","command":"git push -f"}' deny
if [[ $(print -r -- 'not-json' | /bin/zsh "$SHARED_PRETOOLUSE_HOOK" cursor | jq -r '.permission') == deny ]]; then
  print "ok  Cursor invalid input denies in Cursor format"
  pass=$(( pass + 1 ))
else
  record_failure "Cursor invalid input does not deny in Cursor format"
fi

typeset MISSING_ADAPTER_DIR="$TEST_DIR/missing-adapter/hooks"
mkdir -p "$MISSING_ADAPTER_DIR"
cp "$SHARED_PRETOOLUSE_HOOK" "$MISSING_ADAPTER_DIR/run-pretooluse.zsh"
assert_pretooluse_case 'shared launcher denies when adapter is missing' "$MISSING_ADAPTER_DIR/run-pretooluse.zsh" \
  "$(pretooluse_payload 'git status')" deny

# Large heredocs must finish well inside the 5-second hook timeout.
typeset large_body large_command
typeset -F start_time elapsed
large_body=${(pl:12000::x:)}
large_body=${large_body//x/$'line of data\n'}
large_command=$'cat > notes.md <<\'EOF\'\n'"${large_body}"$'EOF\ngit push --force'
start_time=$EPOCHREALTIME
assert_pretooluse_case 'large heredoc then guarded command' "$SHARED_PRETOOLUSE_HOOK" \
  "$(pretooluse_payload "$large_command")" deny
elapsed=$(( EPOCHREALTIME - start_time ))
if (( elapsed < 2.5 )); then
  print "ok  large heredoc analysis time ${elapsed}s"
  pass=$(( pass + 1 ))
else
  record_failure "large heredoc analysis took ${elapsed}s"
fi

# Many heredoc markers must not make analysis grow quadratically.
typeset many_markers= many_heredocs=
for (( case_index = 1; case_index <= 3000; case_index++ )); do
  many_markers+="sed -i '' 's/<<OLD/<<NEW/' file${case_index}.sh"$'\n'
done
for (( case_index = 1; case_index <= 800; case_index++ )); do
  many_heredocs+="cat > f${case_index} <<'EOF'"$'\nhello\nEOF\n'
done
for large_command in "${many_markers}git push -f" "${many_heredocs}git push -f"; do
  start_time=$EPOCHREALTIME
  assert_pretooluse_case 'many heredoc markers then guarded command' "$SHARED_PRETOOLUSE_HOOK" \
    "$(pretooluse_payload "$large_command")" deny
  elapsed=$(( EPOCHREALTIME - start_time ))
  if (( elapsed < 2.5 )); then
    print "ok  many heredoc markers analysis time ${elapsed}s"
    pass=$(( pass + 1 ))
  else
    record_failure "many heredoc markers analysis took ${elapsed}s"
  fi
done
large_command=$'cat > notes.md <<\'EOF\'\n'"${large_body}"$'EOF\ngit push --force'
assert_pretooluse_case 'command above the analysis limit is allowed' "$SHARED_PRETOOLUSE_HOOK" \
  "$(pretooluse_payload "${large_command}${large_command}")" allow

print ""
print "Results: $pass passed, $fail failed"
[[ $fail -eq 0 ]]
