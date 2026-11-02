#!/bin/zsh
# Live Claude Code end-to-end test for auto-develop, a trivial develop request, and the develop approval gate.
# Usage: tests/e2e/claude/flow.zsh [buddy-checkout]
# Env: MODEL (default sonnet), REPEAT (default 1). Loads the checkout with --plugin-dir and
# turns off an installed buddy@buddy for these sessions only. Calls the Claude API: costs tokens.
emulate -L zsh
setopt pipefail
BUDDY=${1:-${0:A:h:h:h:h}}; BUDDY=${BUDDY:A}; MODEL=${MODEL:-sonnet}
typeset -i REPEAT=${REPEAT:-1} pass=0 fail=0
SETTINGS='{"enabledPlugins":{"buddy@buddy":false}}'
check() { if eval "$2"; then print "PASS $1"; pass+=1; else print "FAIL $1"; fail+=1; fi; }

scenario() {
  local ROOT
  ROOT=$(mktemp -d ${TMPDIR:-/tmp}/buddy-e2e-flow.XXXXXX); ROOT=${ROOT:A}
  claude_run() { # dir log args...
    local dir=$1 log=$2; shift 2
    (cd $dir && claude -p --plugin-dir "$BUDDY" --settings "$SETTINGS" --model $MODEL \
      --permission-mode auto --output-format stream-json --verbose "$@" </dev/null >$log 2>&1)
  }
  fixture() {
    mkdir -p $1 && cp -R $BUDDY/evals/fixtures/dispatch-policy/workspace/. $1
    git -C $1 init -q && print '.ai/\n__pycache__/' >$1/.gitignore && git -C $1 add . \
      && git -C $1 -c user.email=e@e -c user.name=e commit -qm init
  }
  reserve_guarded() {
    (cd $1 && python3 -c 'from src.inventory.reserve import reserve
s = {"a": 1}
try:
    reserve(s, "a", 2)
except ValueError:
    raise SystemExit(s != {"a": 1})
raise SystemExit(1)')
  }
  tests_pass() { (cd $1 && PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests >/dev/null 2>&1) }
  run_state() { cat $1/.ai/worklog/*/run-state.json 2>/dev/null | jq -r ".${2:-status}" | tail -1 }

  # S4: auto-develop finishes the three contract tasks without any user turn.
  A=$ROOT/auto-develop; fixture $A
  claude_run $A $ROOT/s4.jsonl "/buddy:auto-develop complete the three tasks in CONTRACT.md"
  check "S4 tests pass" "tests_pass $A"
  check "S4 sweep done" "! grep -rq 'fmt_money_old(' $A/src/reports --include='report_*.py'"
  check "S4 discount rounds half up" "(cd $A && python3 -c 'from src.pricing.discount import apply_discount as d; assert d(999,50)==500')"
  check "S4 reservation guarded" "reserve_guarded $A"
  check "S4 run state complete" "[[ \$(run_state $A) == complete ]]"
  check "S4 run state review passed" "[[ \$(run_state $A review) == passed ]]"
  reviewed() { jq -eR 'fromjson?|select(.type=="assistant")|.message.content[]?|select(.type=="tool_use" and .name=="Agent" and ((.input.subagent_type//"")|test("review")))' $1 >/dev/null }
  check "S4 reviewer dispatched" "reviewed $ROOT/s4.jsonl"
  check "S4 size recorded" "grep -q 'Size: substantial' $ROOT/s4.jsonl"
  check "S4 nothing pushed or committed" "[[ \$(git -C $A rev-list --count HEAD) == 1 ]]"

  if [[ -n $ONLY_AUTO_DEVELOP ]]; then print "logs: $ROOT"; return; fi
  # S6: a trivial fix stays a direct host edit: no spec and no reviewer.
  T=$ROOT/trivial; fixture $T
  print 'Retrun the reserved stock.' >$T/NOTES.md
  claude_run $T $ROOT/s6.jsonl "/buddy:develop fix the typo in NOTES.md"
  check "S6 typo fixed" "grep -q '^Return the reserved stock' $T/NOTES.md"
  check "S6 no reviewer" "! reviewed $ROOT/s6.jsonl"
  check "S6 no spec" "[[ -z \$(print -l $T/.ai/worklog/*/spec_*.md(N)) ]]"

  # S5: develop writes a spec, stops for approval, then finishes after one approval.
  D=$ROOT/develop; fixture $D
  SID=$(uuidgen | tr A-Z a-z)
  claude_run $D $ROOT/s5a.jsonl --session-id $SID "/buddy:develop complete the three tasks in CONTRACT.md with a spec"
  check "S5 spec written" "ls $D/.ai/worklog/*/spec_*.md >/dev/null 2>&1"
  check "S5 gate: awaiting_user" "[[ \$(run_state $D) == awaiting_user ]]"
  check "S5 gate: no code changed" "git -C $D diff --quiet -- src tests"
  claude_run $D $ROOT/s5b.jsonl --resume $SID "approve"
  check "S5 tests pass after approval" "tests_pass $D"
  check "S5 reviewer dispatched" "reviewed $ROOT/s5b.jsonl"
  check "S5 run state complete" "[[ \$(run_state $D) == complete ]]"
  check "S5 run state review passed" "[[ \$(run_state $D review) == passed ]]"
  print "logs: $ROOT"
}

for (( round = 1; round <= REPEAT; round++ )); do
  print "== round $round"
  scenario
done
print "Results: $pass passed, $fail failed"
(( fail == 0 ))
