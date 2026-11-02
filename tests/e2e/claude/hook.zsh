#!/bin/zsh
# Live Claude Code end-to-end test for the Buddy Stop hook across concurrent sessions and a worktree.
# Usage: tests/e2e/claude/hook.zsh [buddy-checkout]
# Env: MODEL (default haiku), REPEAT (default 1). Loads the checkout with --plugin-dir and
# turns off an installed buddy@buddy for these sessions only. Calls the Claude API: costs tokens.
emulate -L zsh
setopt pipefail
BUDDY=${1:-${0:A:h:h:h:h}}; BUDDY=${BUDDY:A}; MODEL=${MODEL:-haiku}
typeset -i REPEAT=${REPEAT:-1} pass=0 fail=0
SETTINGS='{"enabledPlugins":{"buddy@buddy":false}}'
check() { if eval "$2"; then print "PASS $1"; pass+=1; else print "FAIL $1"; fail+=1; fi; }

scenario() {
  local ROOT
  ROOT=$(mktemp -d ${TMPDIR:-/tmp}/buddy-e2e-hook.XXXXXX); ROOT=${ROOT:A}
  run() { # dir log prompt
    (cd $1 && claude -p --plugin-dir "$BUDDY" --settings "$SETTINGS" --model $MODEL \
      --permission-mode acceptEdits --allowedTools 'Read' 'Write' 'Edit' 'Bash(cat:*)' 'Bash(ls:*)' \
      --output-format stream-json --verbose "$3" </dev/null >$2 2>&1)
  }
  state() { jq -c . $1/.ai/worklog/$2/run-state.json 2>/dev/null }

  REPO=$ROOT/repo; mkdir -p $REPO && git -C $REPO init -q && print '.ai/' >$REPO/.gitignore
  git -C $REPO add . && git -C $REPO -c user.email=e@e -c user.name=e commit -qm init
  RUN=20261030_e2e; mkdir -p $REPO/.ai/worklog/$RUN
  NEXT="Create done.txt containing ok in the workspace root, then set status to complete and seq to 2 in .ai/worklog/$RUN/run-state.json"
  jq -nc --arg next "$NEXT" '{status:"running",next:$next,seq:1}' >$REPO/.ai/worklog/$RUN/run-state.json

  # S1: owner session stops early; the hook must continue it to completion.
  run $REPO $ROOT/s1.jsonl "Read .ai/worklog/$RUN/run-state.json and reply only with its status. Do nothing else." &
  # S2: an unrelated session in the same checkout, at the same time, must not be continued.
  run $REPO $ROOT/s2.jsonl "Reply with the word hi. Do nothing else." &
  # S3: a session in a linked worktree outside the repo must not be continued.
  git -C $REPO worktree add -q $ROOT/wt -b wt
  run $ROOT/wt $ROOT/s3.jsonl "Reply with the word hi. Do nothing else." &
  # S4: a run marked complete before its required review passed is continued.
  RUN2=20261030_gate
  git -C $REPO worktree add -q $ROOT/gate -b gate
  mkdir -p $ROOT/gate/.ai/worklog/$RUN2
  jq -nc '{status:"complete",next:"Done",seq:1,review:"required"}' >$ROOT/gate/.ai/worklog/$RUN2/run-state.json
  run $ROOT/gate $ROOT/s4.jsonl "Read .ai/worklog/$RUN2/run-state.json and reply only with its status. Do nothing else." &
  wait

  check "S1 owner continued: done.txt written" "[[ \$(<$REPO/done.txt) == ok* ]]"
  check "S1 run completed" "[[ \$(state $REPO $RUN) == *complete* ]]"
  check "S1 hook fired once or more" "grep -q 'Buddy run' $ROOT/s1.jsonl"
  check "S2 unrelated session not continued" "! grep -q 'Buddy run' $ROOT/s2.jsonl"
  check "S3 worktree session not continued" "! grep -q 'Buddy run' $ROOT/s3.jsonl && [[ ! -e $ROOT/wt/done.txt ]]"
  check "S4 review gate continued the session" "grep -q 'required independent review' $ROOT/s4.jsonl"
  check "plugin Stop hook registered" "grep -q 'hook' $ROOT/s1.jsonl"
  print "logs: $ROOT"
}

for (( round = 1; round <= REPEAT; round++ )); do
  print "== round $round"
  scenario
done
print "Results: $pass passed, $fail failed"
(( fail == 0 ))
