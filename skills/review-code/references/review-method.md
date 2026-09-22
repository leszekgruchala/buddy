# Review method

Use this method for every review. Scale the amount of evidence to the change, but do
not skip a relevant pass.

## 1. Establish the target and contract

1. Read the request, applicable specification, repository instructions, and review
   criteria.
2. Record the review target:
   - branch review: base, merge base, and `HEAD`;
   - commit review: commit identifier and parent;
   - uncommitted review: `HEAD` plus staged, unstaged, and explicitly included
     untracked paths;
   - path review: the exact paths and the caller-provided change boundary. When no
     prior version exists, treat the complete proposed contents as the change, record
     the missing base in `Limits`, and judge defects against the stated contract.
3. Build the changed-file list from the same target as the patch for internal coverage.
4. State which requirements or invariants the change must preserve. When intent is
   ambiguous, record the ambiguity instead of inventing a requirement.
5. Check target stability before completing the report. A changed `HEAD` or changed
   reviewed file makes the review stale.

## 2. Build the coverage map

Group changed files into coherent subsystems. For each subsystem, inspect the changed
implementation and the relevant unchanged context:

- public interfaces, domain types, schemas, serialization, and generated contracts;
- direct callers, consumers, registrations, dependency wiring, and feature flags;
- data migrations, configuration defaults, runtime and deployment configuration;
- unit, integration, end-to-end, regression, and snapshot tests;
- the closest established implementation when it defines expected behavior;
- public documentation or examples when the change alters a user-visible contract.

Trace each changed behavior from its input or caller through state changes and I/O to
its observable result. Check both directions of every changed contract: producers must
satisfy consumers, and consumers must interpret the new value correctly.

For a large diff, review every subsystem separately, then run one cross-subsystem pass.
If context or access limits prevent complete coverage, list the omitted surface and mark
the review `INCOMPLETE`.

## 3. Run independent analysis passes

### Requirements and completeness

- Map every applicable requirement and acceptance criterion to implementation and test
  evidence.
- Look for partially implemented behavior, omitted registrations, stale defaults,
  incompatible examples, and cleanup that the change makes necessary.
- Check that the implementation stays within the requested scope without silently
  changing adjacent contracts.

### Local correctness and failure paths

Read changed functions at statement level and test the reasoning for:

- normal, empty, null, invalid, boundary, and error inputs;
- state transitions, ordering, retries, idempotency, and partial failure;
- concurrency, cancellation, timeout, and re-entrancy when the code can encounter them;
- resource ownership, transaction boundaries, cleanup, and error propagation;
- numeric limits, indexing, encoding, time zones, locale, and serialization when relevant.

Do not infer safety from the happy path or from a passing test alone. Follow guards and
error handlers far enough to prove that they cover the proposed trigger.

### Cross-file contracts and compatibility

- Compare signatures, types, schemas, payload fields, defaults, and error semantics at
  every producer-consumer boundary touched by the change.
- Check callers that were not edited, alternate implementations, adapters, caches, and
  persisted data.
- Check backward and forward compatibility, migrations, rollout ordering, and fallback
  behavior when the system can run mixed versions or retain old data.
- Check configuration and documentation that can cause runtime behavior to differ from
  the implementation.

### Security and data boundaries

Apply this pass whenever the change accepts input, selects resources, crosses a trust
boundary, or handles sensitive data:

- authentication and authorization, including object and tenant ownership;
- validation and normalization at the actual boundary;
- injection into shell, SQL, templates, logs, paths, URLs, or interpreters;
- path traversal, unsafe redirects or requests, insecure deserialization, and secret or
  personal-data exposure;
- privilege changes, confused-deputy paths, race windows, and fail-open behavior.

State the attacker-controlled value, guard that should constrain it, and resulting
unauthorized effect. Do not label generic hardening advice as a security defect.

### Reliability, operations, and performance

Apply only the relevant checks:

- bounded retries, backoff, duplicate delivery, failure recovery, and observability;
- memory, handles, connections, queues, transactions, and other resources over time;
- algorithmic or query growth on realistic data sizes, repeated I/O, and blocking work
  on latency-sensitive paths;
- deploy order, feature flags, configuration validation, and rollback behavior.

A performance concern is a finding only with a realistic workload and a material
consequence, not merely because a faster implementation exists.

### Test adequacy

- Confirm tests assert the changed contract rather than only execute the changed code.
- Check negative, boundary, failure, and regression paths that could expose an identified
  defect.
- Check test doubles and fixtures against production types, defaults, and wiring.
- Treat a missing test as a defect only when it leaves changed behavior or a demonstrated
  regression path unprotected.

## 4. Verify without modifying product files

Run the narrowest relevant repository-documented checks, then broader required checks
when the changed contract crosses packages or subsystems. Prefer check-mode formatting,
lint, type checks, tests, and builds. Do not install or update dependencies, rewrite
snapshots, generate code, run migrations, deploy, or invoke write-formatters.

Use the command result as working evidence. If a check
unexpectedly changes product files, stop verification, disclose the mutation, and do not
clean it up without authorization.

## 5. Adjudicate candidate observations

Before adding a row, re-read the cited lines and search for guards, callers, tests, or
contracts that could disprove the observation. A confirmed finding must answer all of:

1. What changed code introduced or exposed the defect?
2. Which concrete input, state, sequence, or environment triggers it?
3. What contract or invariant does it violate?
4. What observable incorrect or unsafe result follows?
5. How does the proposed remediation address the cause rather than only the symptom?

Merge duplicate symptoms with the same cause. Keep distinct causes separate. Put missing
evidence or conflicting specifications in `Uncertainties`. Reject observations that are
style preferences, optional refactors, speculative possibilities without a failure path,
or pre-existing defects outside the requested change.

## 6. Return only useful review results

Sort findings by `Critical`, `High`, `Medium`, then `Low`, and then by path and line.
Use repository-relative `path:line` locations. Return the compact findings table directly
to the caller. Do not surface the snapshot, diff summary, changed-file inventory, internal
coverage map, or passing verification commands. They exist to make the review reliable,
not to explain routine work to the developer.

If no actionable finding remains, return only `No actionable findings.` Mention a
limitation only when it could change that conclusion. A zero-finding review is valid only
when internal coverage is complete and no hidden material surface undermines confidence.

Create a persistent report only when the user explicitly requests one. The report contains
the same compact findings and any material blocker, without process boilerplate.
