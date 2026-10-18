# Change size and cost

Apply this policy before routing or dispatch, including direct skill calls. Record one line: `Size: trivial | small | substantial — <reason>`. Use the request and diff; reassess if scope or risk grows.

## Classify

- **Trivial:** wording, messages, docs, comments, or a rename; about 30 changed lines or fewer in one area, with no behavior, security, or public-contract change.
- **Small:** one area with a narrow behavior change.
- **Substantial:** all other work, including changes that add or alter a trust boundary.

Changes to credentials, authentication, permissions, or process isolation are at least small. Text that mentions a token is not security-sensitive unless it changes a security claim or contract.

## Execute

1. Requests such as "no review", "just change the text", or "quick fix" disable independent review and subagent dispatch for that request. They do not waive required tests, permissions, or unresolved material decisions. A more specific explicit request takes precedence.
2. Prefer the host for work it can finish in a few edits. Dispatch only for substantial independent work, necessary parallel work, or the independent review required below. Do not dispatch merely to match a recommended tier. Explicit user execution settings still apply.
3. Trivial work is a direct host edit: no subagent, spec creation or amendment, or independent review unless the user asks for that step. Check claims against the code.
4. After a completed `develop` run, classify each new request on its own. Do not reopen the previous spec or carry its size, review loop, or authority into the new request.

## Validate and review

Honor explicit repository checks. Otherwise, run affected tests first for trivial and small work; run the full suite only at the end of substantial work or when shared code changed. If no test applies, state the manual check; do not invent a suite requirement.

Reuse passing checks across agents and gates while their command, scope, relevant code, inputs, configuration, and environment satisfy the requirement. Rerun after invalidation or an explicit fresh-check requirement. Carry command, result, scope, and relevant revision/configuration in existing results or checkpoints; no separate ledger.

| Size | Independent review | After fixes |
|---|---|---|
| Trivial | None; host checks the diff and claims | Host reruns affected checks |
| Small | One round on `balanced`; use `frontier` for security-sensitive changes | Re-review only when a Medium or worse finding was fixed, or the user explicitly requests it |
| Substantial | Fresh independent review on `frontier` | Fresh review after remediation; at most two fix/re-review rounds |

Small work also has a limit of two fix/re-review rounds when Medium or worse findings require them. Low-only fixes use host verification and do not reopen review. Mark these fixes as host-verified; they do not qualify for prevention memory. Required review failures or unavailable execution block completion; skipped reviews do not.

Before any optional review, state the added model/context cost without inventing prices and ask for a choice: "Review round 2 is optional: Low findings only. It adds another reviewer run. Run it?" Wait for explicit agreement before dispatch. Do not offer optional review as a completion gate.
