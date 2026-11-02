#!/bin/zsh
# Continue an active Buddy run when the agent stops before the run is done.
#
# Usage: continue-run-stop.zsh --harness claude|codex|cursor
#   The Buddy host keeps <workspace>/.ai/worklog/<run>/run-state.json current:
#   {"status":"running|awaiting_user|blocked|complete","next":"<step>","seq":<int>,
#    "review":"required|passed"}. A run marked complete while its review is still required
#   continues as running. Only the newest run state, when it is running and less than 24 hours
#   old, continues, and only in a session whose transcript mentions the run directory.
#   Every failure allows the stop. This hook never denies anything.
emulate -L zsh
unsetopt errexit

readonly MAX_CONTINUATIONS=30 MAX_AGE_SECONDS=86400 MAX_TRANSCRIPT_BYTES=67108864

typeset HARNESS=codex
[[ ${1:-} == --harness ]] && HARNESS=${2:-codex}
[[ $HARNESS == (claude|codex|cursor) ]] || HARNESS=codex

# Claude Code and Codex accept empty output; Cursor reads `{}` as no follow-up.
allow() {
  [[ $HARNESS == cursor ]] && print -r -- '{}'
  exit 0
}

zmodload -F zsh/stat b:zstat 2>/dev/null || allow
zmodload zsh/datetime 2>/dev/null || allow
zmodload -F zsh/system b:sysread 2>/dev/null || allow

# Set REPLY to the index of the first needle (in priority order) that file $1 contains, or fail.
# One pass in fixed-size chunks keeps time and memory linear and bounded; a run can appear only
# early in a long transcript, so the tail is not enough.
first_mention() {
  setopt localoptions nomultibyte
  local file=$1 chunk carry= joined
  shift
  local -i fd total=0 best=0 index longest=0
  for chunk in "$@"; do (( $#chunk > longest )) && longest=$#chunk; done
  exec {fd}<"$file" || return 1
  while (( best != 1 && total < MAX_TRANSCRIPT_BYTES )) && sysread -s 1048576 -i $fd chunk; do
    total+=$#chunk
    joined=$carry$chunk
    for (( index = 1; index <= $# && (best == 0 || index < best); index++ )); do
      [[ $joined == *"${@[index]}"* ]] && best=index
    done
    carry=${joined[-longest,-1]}
  done
  exec {fd}<&-
  (( best )) || return 1
  REPLY=$best
}

typeset JQ
for candidate in jq /opt/homebrew/bin/jq /usr/local/bin/jq /usr/bin/jq; do
  if [[ -n ${candidate##/*} ]]; then
    JQ=$(command -v "$candidate" 2>/dev/null) && break
  elif [[ -x $candidate ]]; then
    JQ=$candidate
    break
  fi
done
[[ -n $JQ ]] || allow

typeset hook_input parsed stop_status background session_id transcript
hook_input=$(<&0) || allow
# Cursor sends `workspace_roots` and `conversation_id`; Claude Code and Codex send `cwd` and `session_id`.
# Claude Code background work of these types finishes and wakes the session; shells and monitors can run on.
parsed=$("$JQ" -j --arg harness "$HARNESS" '
  (.status // "" | tostring), "\u0000",
  (.background_tasks | if type == "array" then
    map(select(type == "object" and (.type as $t
      | ["subagent", "workflow", "teammate", "cloud session", "MCP task"] | any(. == $t))))
    | length else 0 end | tostring), "\u0000",
  (.transcript_path | if type == "string" then . else "" end), "\u0000",
  (if $harness == "cursor" then .conversation_id else .session_id end
    | if type == "string" then . else "" end), "\u0000",
  ([(.workspace_roots // [] | if type == "array" then .[] else empty end), .cwd]
    | map(select(type == "string" and length > 0)) | .[] | ., "\u0000")
' <<<"$hook_input" 2>/dev/null) || allow
typeset -a parts roots
parts=("${(@0)parsed}")
stop_status=${parts[1]}
background=${parts[2]}
transcript=${parts[3]}
session_id=${parts[4]}
roots=(${parts[5,-1]:#})
[[ -n $transcript || $HARNESS != cursor ]] || transcript=${CURSOR_TRANSCRIPT_PATH:-}
(( $#roots )) || roots=(${CURSOR_PROJECT_DIR:-$PWD})

# The agent can change directory inside the workspace, so use the nearest ancestor with a worklog.
# A git work-tree root ends the walk, so a worktree outside the repository never reaches `~/.ai`.
typeset -a candidates mtime needles
typeset root dir file newest
for root in $roots; do
  dir=${root:A}
  while [[ ! -d $dir/.ai/worklog && ! -e $dir/.git && $dir != / ]]; do
    dir=${dir:h}
  done
  for file in $dir/.ai/worklog/*/run-state.json(N.); do
    zstat -A mtime +mtime -- "$file" 2>/dev/null || continue
    (( EPOCHSECONDS - mtime[1] < MAX_AGE_SECONDS )) && candidates+=("$mtime[1] $file")
  done
done
(( $#candidates )) || allow
candidates=(${${(On)candidates}#* })

# Another session or worktree in the same workspace must not take over a run. With a transcript,
# the session's run is the newest candidate whose run state the transcript mentions.
if [[ -n $transcript ]]; then
  [[ -f $transcript && -r $transcript ]] || allow
  for file in $candidates; do
    needles+=(".ai/worklog/${file:h:t}/run-state.json")
  done
  first_mention "$transcript" $needles || allow
  newest=$candidates[REPLY]
else
  newest=$candidates[1]
fi

typeset state run_status rest seq next run_dir book book_state last_seq bound_session reason
typeset -i count=0
run_dir=${newest:h}
book=$run_dir/.stop-hook.json
state=$("$JQ" -j '
  select(type == "object" and (.status | type) == "string")
  | if .status == "complete" and .review == "required" then .status = "running"
      | .next = "Run the required independent review, fix its open findings, and set review to passed before complete."
    else . end
  | if .status != "running" then .status, "\u0000\u0000"
    else select((.next | type) == "string" and (.seq | type) == "number" and .seq == (.seq | floor))
      | .status, "\u0000", (.seq | tostring), "\u0000", (.next | gsub("[\r\n]+"; " "))
    end
' "$newest" 2>/dev/null) || allow
[[ $state == *$'\0'*$'\0'* ]] || allow
run_status=${state%%$'\0'*}
rest=${state#*$'\0'}
seq=${rest%%$'\0'*}
next=${rest#*$'\0'}
next=${next[1,500]}

# A run that waits for the user or ended releases its session binding and continuation count,
# so the session that resumes it after the user answers starts a new stretch.
if [[ $run_status == (awaiting_user|blocked|complete) ]]; then
  [[ -e $book ]] && zmodload -F zsh/files b:zf_rm 2>/dev/null && zf_rm -f -- "$book" 2>/dev/null
  allow
fi
[[ $run_status == running ]] || allow
# Cursor also runs `stop` after a user abort or an error; continue only a completed loop.
[[ $HARNESS != cursor || $stop_status == completed ]] || allow
[[ $background == 0 ]] || allow

if [[ -e $book ]]; then
  book_state=$("$JQ" -j '
    select(type == "object" and (.count | type) == "number")
    | (.seq | tostring), "\u0000", (.count | floor | tostring), "\u0000",
      (.session | if type == "string" then . else "" end)
  ' "$book" 2>/dev/null) || allow
  [[ $book_state == *$'\0'*$'\0'* ]] || allow
  last_seq=${book_state%%$'\0'*}
  rest=${book_state#*$'\0'}
  count=${rest%%$'\0'*}
  bound_session=${rest#*$'\0'}
fi
# Without a transcript, the first session that the hook continues owns the run.
[[ -n $transcript ]] && bound_session= session_id=
[[ -z $session_id || -z $bound_session || $session_id == "$bound_session" ]] || allow
# An unchanged seq means the last continuation made no recorded progress.
[[ $seq != "$last_seq" ]] || allow
(( count < MAX_CONTINUATIONS )) || allow
"$JQ" -nc --argjson seq "$seq" --argjson count $(( count + 1 )) --arg session "${bound_session:-$session_id}" \
  '{seq: $seq, count: $count, session: $session}' >| "$book" 2>/dev/null || allow

reason="Buddy run ${run_dir} is still running. Next step: ${next}"
reason+=$'\n'"Continue the Buddy run now. Increment seq in ${run_dir}/run-state.json as you progress."
reason+=" Before you stop, set its status to awaiting_user, blocked, or complete."
if [[ $HARNESS == cursor ]]; then
  "$JQ" -nc --arg message "$reason" '{followup_message: $message}' || allow
else
  "$JQ" -nc --arg reason "$reason" '{decision: "block", reason: $reason}' || allow
fi
exit 0
