# Review method

Investigate broadly; report selectively. Scale effort to risk, not the number of findings.

## 1. Establish the target and contract

1. Read the request, specification, repository instructions, and review criteria.
2. Freeze the target: base, merge base, and `HEAD` for a branch; commit and parent for
   a commit; `HEAD`, staged/unstaged content, and included untracked paths for local
   changes. For a path without a prior version, review its complete proposed contents
   against the stated contract and note the missing base internally.
3. Derive the file list and patch from that same target. Recheck identifiers and reviewed
   content before returning; changes make the review incomplete.
4. Identify intended behavior and preserved invariants. Compare old and new behavior,
   including deleted guards and defaults. Do not invent requirements from preferences.

## 2. Build the coverage map

Group files by subsystem. Start with trust boundaries, persistent state, shared contracts,
and complex decisions; still cover every changed file. Inspect complete changed functions
and relevant unchanged callers, consumers, types, configuration, tests, and analogues.
Trace input through decisions, state changes, and I/O to the observable result. Check
producer and consumer expectations in both directions, including callers not in the diff.

Keep a small internal ledger: changed behavior, invariant, plausible counterexample,
supporting or disproving evidence, and unresolved surface. For large changes, inspect
subsystems separately, then their interactions. If a material surface is inaccessible or
unreviewed, report `INCOMPLETE` with that limitation rather than imply a clean review.

## 3. Run independent analysis passes

Generate hypotheses before applying the reporting threshold. For each changed behavior,
try the smallest realistic input or event sequence that could violate its invariant.
Trace it statement by statement; check guards and recovery at their actual call sites.
Keep looking after finding an easy bug. Apply the following lenses where relevant.

### Requirements and completeness

Map requirements to implementation and tests. Look for omitted registrations, stale
defaults, incompatible examples, and adjacent behavior changed without authorization.
Compare sibling implementations: has one copy of a business rule changed while another
caller, adapter, or branch still applies the old rule?

### Local correctness and failure paths

- For new branches, flags, and special cases, test boundary values and interacting
  conditions: zero versus missing, empty versus invalid, one versus many, and repeated
  versus first execution. Identify reachable combinations the branches fail to cover.
- Challenge casts, optional fields, and default fallbacks: which invariant do they assume,
  and can a real caller supply a value that violates it or hides an error?
- For related updates, fail between steps. Trace what remains after an exception,
  cancellation, timeout, retry, or duplicate event. Check atomicity, idempotency, resource
  ownership, cleanup, and error propagation.
- Interleave concurrent operations where shared state permits it. Check ordering,
  re-entrancy, stale reads, and lost updates, not just individual statements.
- Check relevant arithmetic, indexing, units, encoding, time zones, and serialization.

Use complexity as an investigation cue, not a finding: duplicated decisions, wrappers,
or misplaced ownership matter when they permit a concrete inconsistent or unsafe result.
Do not require a refactor merely because a smaller implementation is possible.

### Cross-file contracts and compatibility

Follow values across signatures, schemas, payloads, caches, persisted data, and error
semantics. Check identity, tenant, units, absence, and defaults at each boundary. Locate
the canonical owner of validation and state; verify every entry path uses it. Test the
new producer with existing consumers and the new consumer with old data. Where relevant,
trace mixed versions, migrations, rollout order, feature flags, and rollback.

### Security and data boundaries

Trace attacker-controlled input from entry to sensitive use across files. Check object
and tenant authorization, normalization, injection, path traversal, unsafe requests,
deserialization, secret exposure, privilege changes, races, and fail-open behavior.
Search for upstream checks and framework protections before alleging a bypass. State
the controlled value, missing or bypassed guard, and unauthorized effect.

### Reliability, operations, and performance

Check bounded retries and queues, recovery, resource lifetime, and deployment assumptions.
For growth or repeated I/O, use a realistic workload and explain the material consequence.
A faster alternative alone is not a defect.

### Test adequacy

Check whether assertions protect the changed contract, especially the counterexamples
above. Compare mocks and fixtures with production wiring and failure semantics. Missing
tests are findings only when changed behavior or a demonstrated regression is unprotected;
passing tests do not disprove a path they never exercise.

## 4. Verify without modifying product files

Run narrow repository-documented checks; broaden when the contract crosses subsystems.
Use check modes. Do not install dependencies, rewrite snapshots, generate code, migrate,
deploy, or run write-formatters. If a check unexpectedly changes product files, stop,
disclose the mutation, and do not clean it up without authorization.

An executable reproduction strengthens evidence but is not mandatory when the code trace
is conclusive. State unavailable verification only when it materially limits confidence.

## 5. Adjudicate candidate observations

Re-read cited lines and actively try to disprove each hypothesis using guards, callers,
tests, and contracts. Before reporting, establish:

1. The changed code that introduced or exposed the defect.
2. A reachable input, state, sequence, or environment that triggers it.
3. The violated contract and observable incorrect or unsafe result.
4. Why existing protections do not prevent it, and a bounded correction to the cause.

Discard disproved hypotheses. Do not discard a code-proven bug merely because reproduction
tools are unavailable. Merge symptoms with one cause; retain independent causes. Exclude
style, optional hardening, speculative possibilities, and unrelated pre-existing defects.
Surface an unresolved contract ambiguity only if it blocks a reliable conclusion.

## 6. Return only useful review results

Use the skill's compact table, ordered by severity then path and line. Cite the smallest
useful changed location as repository-relative `path:line`; evidence may reference unchanged
supporting code. Do not surface the snapshot, diff summary, changed-file inventory,
coverage ledger, or passing commands.

A zero-finding review is valid only after complete coverage and candidate adjudication.
Return `No actionable findings.` when appropriate; disclose material limitations. Create
a persistent report only on explicit request, containing the same findings and blockers.
