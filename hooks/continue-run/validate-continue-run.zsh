#!/bin/zsh
# Validate the shared Stop hook that continues an active Buddy run, for each harness input shape.
emulate -L zsh
setopt errexit pipefail
zmodload zsh/datetime

readonly SCRIPT_DIR=${0:A:h}
STOP_LAUNCHER=${STOP_LAUNCHER:-"${SCRIPT_DIR:h}/run-stop.zsh"}
STOP_ADAPTER=${STOP_ADAPTER:-"${SCRIPT_DIR}/continue-run-stop.zsh"}

for hook in "$STOP_LAUNCHER" "$STOP_ADAPTER"; do
  if [[ ! -f $hook ]]; then
    print -u2 "missing hook: $hook"
    exit 1
  fi
done

typeset TEST_DIR
TEST_DIR=$(mktemp -d "${TMPDIR:-/tmp}/buddy-stop-test.XXXXXX")
TEST_DIR=${TEST_DIR:A}
trap '/bin/rm -rf -- "$TEST_DIR"' EXIT

# A copy of the adapter that cannot find jq; the production search also checks fixed paths.
readonly NO_JQ_ADAPTER=$TEST_DIR/no-jq/continue-run-stop.zsh
mkdir -p "${NO_JQ_ADAPTER:h}"
sed 's|^for candidate in jq .*; do$|for candidate in /nonexistent/jq; do|' "$STOP_ADAPTER" >"$NO_JQ_ADAPTER"
if ! grep -q '^for candidate in /nonexistent/jq; do$' "$NO_JQ_ADAPTER"; then
  print -u2 "cannot build the missing-jq adapter: the jq search line changed"
  exit 1
fi

typeset -i pass=0 fail=0 case_index=0
typeset WORKSPACE RUN_DIR HOUR_AGO
strftime -s HOUR_AGO %Y%m%d%H%M $(( EPOCHSECONDS - 3600 ))
unset CURSOR_TRANSCRIPT_PATH

# Sessions s1 and s3 worked on the run; s2 did not. s1 mentions the run only before 2 MB of
# later output, so the search must not read only the tail.
readonly TRANSCRIPTS=$TEST_DIR/transcripts
mkdir -p "$TRANSCRIPTS"
typeset filler=${(l:1024::x:)}
filler=${(l:2097152::$filler:)}
print -r -- '{"tool_input":{"file_path":".ai/worklog/20261029_run/run-state.json"}}' >"$TRANSCRIPTS/s1.jsonl"
print -r -- "{\"text\":\"$filler\"}" >>"$TRANSCRIPTS/s1.jsonl"
print -r -- "{\"text\":\"$filler\"}" >"$TRANSCRIPTS/s2.jsonl"
print -r -- '{"tool_input":{"file_path":"/w/.ai/worklog/20261029_run/run-state.json"}}' >"$TRANSCRIPTS/s3.jsonl"
# A run whose name extends the active run's name, and a session that only read the spec.
print -r -- '{"tool_input":{"file_path":".ai/worklog/20261029_run-filters/run-state.json"}}' >"$TRANSCRIPTS/s4.jsonl"
print -r -- '{"tool_input":{"file_path":".ai/worklog/20261029_run/spec_run.md"}}' >"$TRANSCRIPTS/s5.jsonl"
# Sessions ox and oy each own one of two runs; oxy worked on both.
print -r -- '{"tool_input":{"file_path":".ai/worklog/20261030_x/run-state.json"}}' >"$TRANSCRIPTS/ox.jsonl"
print -r -- '{"tool_input":{"file_path":".ai/worklog/20261030_y/run-state.json"}}' >"$TRANSCRIPTS/oy.jsonl"
cat "$TRANSCRIPTS/ox.jsonl" "$TRANSCRIPTS/oy.jsonl" >"$TRANSCRIPTS/oxy.jsonl"
unset filler

record_failure() {
  print -u2 "FAIL $1"
  [[ -n ${2-} ]] && print -u2 "  out: $2"
  fail=$(( fail + 1 ))
}

# Create an empty workspace with one run directory.
new_workspace() {
  case_index=$(( case_index + 1 ))
  WORKSPACE=$TEST_DIR/workspace-$case_index
  RUN_DIR=$WORKSPACE/.ai/worklog/20261029_run
  mkdir -p "$RUN_DIR" "$WORKSPACE/src"
}

write_state() {
  jq -nc --arg status "$1" --argjson seq "$2" '{status: $status, next: "Run the P2 tests", seq: $seq}' \
    >"$RUN_DIR/run-state.json"
}

# Print hook input for harness $1, session or conversation id $2, and Cursor status $3.
payload() {
  local session=${2:-s1}
  case $1 in
    claude) jq -nc --arg cwd "$WORKSPACE/src" --arg session "$session" --arg transcript "$TRANSCRIPTS/$session.jsonl" '{session_id: $session, transcript_path: $transcript, cwd: $cwd, hook_event_name: "Stop", stop_hook_active: false, background_tasks: [], session_crons: []}' ;;
    codex) jq -nc --arg cwd "$WORKSPACE" --arg session "$session" --arg transcript "$TRANSCRIPTS/$session.jsonl" '{session_id: $session, transcript_path: $transcript, cwd: $cwd, hook_event_name: "Stop", turn_id: "t", stop_hook_active: false, last_assistant_message: null}' ;;
    cursor) jq -nc --arg root "$WORKSPACE" --arg session "$session" --arg transcript "$TRANSCRIPTS/$session.jsonl" --arg status "${3:-completed}" '{conversation_id: $session, session_id: "unused", transcript_path: $transcript, hook_event_name: "stop", cursor_version: "test", workspace_roots: [$root], status: $status, loop_count: 0}' ;;
  esac
}

# Print hook input without a transcript path, as from a harness with transcripts turned off.
bare_payload() {
  payload "$@" | jq -c 'del(.transcript_path)'
}

# Write run $1 with status $2 and seq $3 under checkout $4 (default: the workspace), optionally
# with modification time $5.
write_run() {
  local dir=${4:-$WORKSPACE}/.ai/worklog/$1
  mkdir -p "$dir"
  jq -nc --arg status "$2" --argjson seq "$3" '{status: $status, next: "Run the P2 tests", seq: $seq}' \
    >"$dir/run-state.json"
  [[ -z ${5-} ]] || touch -t "$5" "$dir/run-state.json"
}

# Print the payload for arguments 2.. with the session working in directory $1.
at_dir() {
  local dir=$1
  shift
  payload "$@" | jq -c --arg dir "$dir" 'if has("workspace_roots") then .workspace_roots = [$dir] else .cwd = $dir end'
}

# Run hook $3 for harness $2 with stdin $4 and check outcome $5 (continue or allow).
assert_case() {
  local name=$1 harness=$2 hook=$3 input=$4 expected=$5
  local output exit_status message actual

  set +e
  output=$(print -r -- "$input" | /bin/zsh "$hook" "${@:6}" 2>&1)
  exit_status=$?
  set -e

  if (( exit_status )); then
    record_failure "$harness $name: exit status $exit_status" "$output"
    return
  fi
  if [[ $harness == cursor ]]; then
    if ! message=$(jq -er 'if type == "object" then (.followup_message // "") else error end' <<<"$output" 2>/dev/null); then
      record_failure "$harness $name: output is not a JSON object" "$output"
      return
    fi
  elif [[ -z $output ]]; then
    message=
  elif ! message=$(jq -er 'select(type == "object" and .decision == "block") | .reason' <<<"$output" 2>/dev/null); then
    record_failure "$harness $name: output is not a block decision" "$output"
    return
  fi
  actual=allow
  [[ -n $message ]] && actual=continue
  if [[ $actual != "$expected" ]]; then
    record_failure "$harness $name: got $actual expected $expected" "$output"
    return
  fi
  if [[ $actual == continue && ( $message != *"$RUN_DIR"* || $message != *"${EXPECT_NEXT:-Run the P2 tests}"* ||
        $message != *'Increment seq'* || $message != *'awaiting_user, blocked, or complete'* ) ]]; then
    record_failure "$harness $name: continuation lacks run, next step, or instructions" "$output"
    return
  fi
  print "ok  $harness $name -> $actual"
  pass=$(( pass + 1 ))
}

stop_case() {
  local name=$1 harness=$2 expected=$3 input=${4:-}
  [[ -n $input ]] || input=$(payload "$harness")
  assert_case "$name" "$harness" "$STOP_LAUNCHER" "$input" "$expected" "$harness"
}

for harness in claude codex cursor; do
  new_workspace
  stop_case 'missing run state' $harness allow

  write_state running 1
  stop_case 'fresh running state' $harness continue
  stop_case 'unchanged seq after a continuation' $harness allow
  write_state running 2
  stop_case 'changed seq after a continuation' $harness continue

  for run_status in awaiting_user blocked complete; do
    write_state $run_status 3
    stop_case "$run_status state" $harness allow
  done

  new_workspace
  write_state running 1
  stop_case 'other session stops before the owner' $harness allow "$(payload $harness s2)"
  stop_case 'owner session' $harness continue "$(payload $harness s1)"
  write_state running 2
  stop_case 'other session after the owner continued' $harness allow "$(payload $harness s2)"
  stop_case 'new session that resumes the run' $harness continue "$(payload $harness s3)"
  write_state running 3
  stop_case 'session of a run with a longer name' $harness allow "$(payload $harness s4)"
  stop_case 'session that only read the spec' $harness allow "$(payload $harness s5)"
  write_state running 3
  stop_case 'missing transcript' $harness allow \
    "$(payload $harness s1 | jq -c --arg path "$TRANSCRIPTS/gone.jsonl" '.transcript_path = $path')"

  # Two sessions in one checkout each own a running run.
  new_workspace
  write_run 20261030_x running 1 "" "$HOUR_AGO"
  write_run 20261030_y running 1
  RUN_DIR=$WORKSPACE/.ai/worklog/20261030_x
  stop_case 'older run continues for its own session' $harness continue "$(payload $harness ox)"
  RUN_DIR=$WORKSPACE/.ai/worklog/20261030_y
  stop_case 'newer run continues for its own session' $harness continue "$(payload $harness oy)"
  # The same session's newer run waits for the user, so its older running run is abandoned.
  write_run 20261030_y awaiting_user 2
  stop_case 'abandoned older run behind the newer awaiting_user run' $harness allow "$(payload $harness oxy)"

  # A worktree outside any .ai has a .git file; the walk stops there and does not reach the parent.
  new_workspace
  write_state running 1
  mkdir -p "$WORKSPACE/.claude/worktrees/w/src"
  print -r -- 'gitdir: ../../../.git/worktrees/w' >"$WORKSPACE/.claude/worktrees/w/.git"
  stop_case 'worktree without its own worklog' $harness allow \
    "$(at_dir "$WORKSPACE/.claude/worktrees/w/src" $harness s1)"
  # A worktree with its own worklog uses it; the main checkout's finished run does not matter.
  write_state complete 2
  write_run 20261029_run running 1 "$WORKSPACE/.claude/worktrees/w"
  RUN_DIR=$WORKSPACE/.claude/worktrees/w/.ai/worklog/20261029_run
  stop_case 'worktree with its own worklog' $harness continue \
    "$(at_dir "$WORKSPACE/.claude/worktrees/w/src" $harness s1)"
  # A session in the main checkout uses the main worklog, not the active worktree run.
  RUN_DIR=$WORKSPACE/.ai/worklog/20261029_run
  write_state running 3
  stop_case 'main checkout beside an active worktree run' $harness continue "$(at_dir "$WORKSPACE" $harness s1)"
  if [[ $(jq -c . "$WORKSPACE/.claude/worktrees/w/.ai/worklog/20261029_run/.stop-hook.json") == '{"seq":1,"count":1,"session":""}' ]]; then
    print "ok  $harness worktree bookkeeping unchanged by the main checkout"
    pass=$(( pass + 1 ))
  else
    record_failure "$harness worktree bookkeeping changed by the main checkout"
  fi

  # Without a transcript path, the first session that the hook continues owns the run.
  new_workspace
  write_state running 1
  stop_case 'no transcript: first session binds the run' $harness continue "$(bare_payload $harness s1)"
  write_state running 2
  stop_case 'no transcript: other session' $harness allow "$(bare_payload $harness s2)"
  stop_case 'no transcript: bound session' $harness continue "$(bare_payload $harness s1)"
  write_state awaiting_user 3
  stop_case 'awaiting_user releases the binding' $harness allow "$(bare_payload $harness s1)"
  if [[ -e $RUN_DIR/.stop-hook.json ]]; then
    record_failure "$harness bookkeeping stays after a non-running state"
  else
    print "ok  $harness bookkeeping reset after a non-running state"
    pass=$(( pass + 1 ))
  fi
  write_state running 4
  stop_case 'no transcript: new session binds after the reset' $harness continue "$(bare_payload $harness s2)"
  write_state running 5
  stop_case 'no transcript: earlier session after a new binding' $harness allow "$(bare_payload $harness s1)"
  write_state running 6
  stop_case 'no transcript: missing session id skips the binding' $harness continue \
    "$(bare_payload $harness s2 | jq -c 'del(.session_id, .conversation_id)')"

  # A run marked complete before its required review passed continues once per seq.
  new_workspace
  jq -nc '{status: "complete", next: "Done", seq: 4, review: "required"}' >"$RUN_DIR/run-state.json"
  EXPECT_NEXT='Run the required independent review'
  stop_case 'complete before required review' $harness continue
  stop_case 'complete before required review, unchanged seq' $harness allow
  unset EXPECT_NEXT
  jq -nc '{status: "complete", next: "Done", seq: 5, review: "passed"}' >"$RUN_DIR/run-state.json"
  stop_case 'complete after review passed' $harness allow

  new_workspace
  write_state running 1
  touch -t 202001010000 "$RUN_DIR/run-state.json"
  stop_case 'stale running state' $harness allow

  new_workspace
  # A newer finished run is the current one; an older running run is not resumed.
  mkdir -p "$WORKSPACE/.ai/worklog/20261028_old"
  jq -nc '{status: "running", next: "Old", seq: 9}' >"$WORKSPACE/.ai/worklog/20261028_old/run-state.json"
  touch -t "$HOUR_AGO" "$WORKSPACE/.ai/worklog/20261028_old/run-state.json"
  write_state running 1
  stop_case 'newest running state among older runs' $harness continue
  write_state complete 2
  stop_case 'older running state behind a newer finished run' $harness allow

  new_workspace
  write_state running 31
  jq -nc '{seq: 30, count: 29}' >"$RUN_DIR/.stop-hook.json"
  stop_case 'continuation 30' $harness continue
  write_state running 32
  stop_case '30-continuation cap' $harness allow

  new_workspace
  print -r -- '{"status":"running","next":' >"$RUN_DIR/run-state.json"
  stop_case 'malformed run state' $harness allow
  jq -nc '{status: "running", next: "Run the P2 tests", seq: "1"}' >"$RUN_DIR/run-state.json"
  stop_case 'non-integer seq' $harness allow
  write_state running 1
  print -r -- 'not json' >"$RUN_DIR/.stop-hook.json"
  stop_case 'malformed bookkeeping' $harness allow

  new_workspace
  write_state running 1
  stop_case 'malformed hook input' $harness allow '{"cwd":'
  assert_case 'missing jq' $harness "$NO_JQ_ADAPTER" "$(payload $harness)" allow --harness $harness
done

new_workspace
write_state running 1
stop_case 'user abort' cursor allow "$(payload cursor s1 aborted)"
stop_case 'error stop' cursor allow "$(payload cursor s1 error)"

# A background subagent wakes Claude Code when it finishes, so that stop must stand.
# Shells and monitors can run without end, so they do not stop continuation.
new_workspace
write_state running 1
stop_case 'subagent background task' claude allow \
  "$(payload claude | jq -c '.background_tasks = [{id: "t1", type: "shell", status: "running"}, {id: "t2", type: "subagent", status: "running"}]')"
stop_case 'recurring cron only' claude continue \
  "$(payload claude | jq -c '.session_crons = [{id: "c1", schedule: "0 9 * * 1-5", recurring: true}]')"
write_state running 2
stop_case 'shell background task' claude continue \
  "$(payload claude | jq -c '.background_tasks = [{id: "t1", type: "shell", status: "running", command: "npm run dev"}]')"
write_state running 3
stop_case 'monitor background task' claude continue \
  "$(payload claude | jq -c '.background_tasks = [{id: "t1", type: "monitor", status: "running"}]')"

# The launcher allows the stop when its adapter is missing.
mkdir -p "$TEST_DIR/no-adapter"
cp "$STOP_LAUNCHER" "$TEST_DIR/no-adapter/run-stop.zsh"
for harness in claude codex cursor; do
  assert_case 'missing adapter' $harness "$TEST_DIR/no-adapter/run-stop.zsh" "$(payload $harness)" allow $harness
done

print ""
print "Results: $pass passed, $fail failed"
[[ $fail -eq 0 ]]
