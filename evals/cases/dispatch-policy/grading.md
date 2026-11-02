# Dispatch-policy grading

The fixture has two independent behavior fixes and a 24-file mechanical sweep, so each dispatch reason can apply. Compare `host-only` with `dispatch-policy` on the same bundle, fixture, prompt, model, effort, permissions, tools, and output schema. Only the host-only prompt suffix differs. Record bundle revision, fixture fingerprint, raw events, changes, and results using the existing evidence convention. Keep this rubric outside agent workspaces.

| Metric | Evidence |
| --- | --- |
| Correctness | Discount rounds half up and rejects percent outside 0-100; an oversized reservation raises and leaves stock unchanged; no `fmt_money_old` call remains in `src/reports/` outside `money.py` and output is unchanged. Score 0 absent, 1 partial, 2 complete. |
| Wall time | Median seconds from first event to final result. |
| Total tokens | Median input plus output tokens across host and workers. |
| Review findings | Count of `Open` findings in the first review round and findings left at completion. |
| Dispatch justified | For `dispatch-policy`, each worker launch except review matches a reason in the develop dispatch rule; score 0 none, 1 some, 2 all. |

Prefer host-only when correctness ties and it is faster or cheaper. Keep the dispatch rule only where it wins on a metric.
