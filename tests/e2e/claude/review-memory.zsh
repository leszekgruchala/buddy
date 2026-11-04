#!/bin/zsh
# Live Claude Code end-to-end test for review-code prevention memory.
# Usage: tests/e2e/claude/review-memory.zsh [buddy-checkout]
# Env: MODEL (default sonnet), REPEAT (default 1). Loads the checkout with --plugin-dir and
# turns off an installed buddy@buddy for these sessions only. Calls the Claude API: costs tokens.
emulate -L zsh
setopt pipefail
BUDDY=${1:-${0:A:h:h:h:h}}; BUDDY=${BUDDY:A}; MODEL=${MODEL:-sonnet}
typeset -i REPEAT=${REPEAT:-1} pass=0 fail=0
SETTINGS='{"enabledPlugins":{"buddy@buddy":false}}'
REQUEST='Only a record owner can delete that record. Review the uncommitted change to src/access.py.'
PRIOR='| ID | Severity | Location | Bug | Evidence | Remediation | Status |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | High | src/access.py:8 | Delete check compares the user ID with the record ID | A user whose ID equals a record ID can delete a record owned by another user | Compare the user ID with `record.owner_id` | Open |'
RE_REVIEW="/buddy:review-code Re-review. $REQUEST This is the latest findings table:

$PRIOR

The fix for F1 is applied, and the required validation passed. No other validation is required."
check() { if eval "$2"; then print "PASS $1"; pass+=1; else print "FAIL $1"; fail+=1; fi; }

scenario() {
  local ROOT
  ROOT=$(mktemp -d ${TMPDIR:-/tmp}/buddy-e2e-memory.XXXXXX); ROOT=${ROOT:A}
  claude_run() { # dir log args...
    local dir=$1 log=$2; shift 2
    (cd $dir && claude -p --plugin-dir "$BUDDY" --settings "$SETTINGS" --model $MODEL \
      --permission-mode auto --output-format stream-json --verbose "$@" </dev/null >$log 2>&1)
  }
  fixture() {
    mkdir -p $1 && cp -R $BUDDY/evals/fixtures/review-code-explicit/workspace/. $1
    git -C $1 init -q && print '.ai\n__pycache__/' >$1/.gitignore && git -C $1 add . \
      && git -C $1 -c user.email=e@e -c user.name=e commit -qm init
  }
  apply_fix() { perl -pi -e 's/== record\.id/== record.owner_id/' $1/src/access.py }
  rule_count() { grep -cvE '^(#|[[:space:]]*$)' $1/.ai/memory/memory.md 2>/dev/null }
  final_text() { jq -rR 'fromjson?|select(.type=="result")|.result' $1 }

  # S7: a re-review that confirms a fix writes one rule and names it.
  R=$ROOT/confirmed; fixture $R; apply_fix $R
  claude_run $R $ROOT/s7.jsonl "$RE_REVIEW"
  check "S7 finding marked Fixed" "final_text $ROOT/s7.jsonl | grep -Eq '^\| *F1 .*Fixed *\|\$'"
  check "S7 one rule written" "[[ \$(rule_count $R) == 1 ]]"
  check "S7 rule named" "final_text $ROOT/s7.jsonl | grep -q 'Promoted rules:'"
  check "S7 production code unchanged by review" "[[ \$(git -C $R diff --name-only) == src/access.py ]]"

  # S8: a linked worktree shares the memory of the main checkout.
  M=$ROOT/main; W=$ROOT/linked; fixture $M
  git -C $M worktree add -q -b fix $W; apply_fix $W
  claude_run $W $ROOT/s8.jsonl "$RE_REVIEW"
  check "S8 rule in main checkout" "[[ \$(rule_count $M) == 1 ]]"
  check "S8 no rule in worktree" "[[ ! -e $W/.ai/memory/memory.md ]]"

  # S9: a clean first review changes no memory.
  C=$ROOT/clean; fixture $C; apply_fix $C
  claude_run $C $ROOT/s9.jsonl "/buddy:review-code $REQUEST"
  check "S9 no findings" "final_text $ROOT/s9.jsonl | grep -q 'No actionable findings.'"
  check "S9 no memory" "[[ ! -e $C/.ai/memory/memory.md ]]"

  # S10: a re-review that finds the defect still open changes no memory.
  O=$ROOT/open; fixture $O; print '# Delete policy: owners only.' >>$O/src/access.py
  claude_run $O $ROOT/s10.jsonl "$RE_REVIEW"
  check "S10 finding stays Open" "final_text $ROOT/s10.jsonl | grep -Eq '^\| *F1 .*Open *\|\$'"
  check "S10 no memory" "[[ ! -e $O/.ai/memory/memory.md ]]"
  print "logs: $ROOT"
}

for (( round = 1; round <= REPEAT; round++ )); do
  print "== round $round"
  scenario
done
print "Results: $pass passed, $fail failed"
(( fail == 0 ))
