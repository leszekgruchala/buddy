# Pilot case manifest contract

Each case manifest is input data for a future Codex-only evaluator. It does not
run an evaluation by itself. The runner must materialize `fixture_root` into an
empty workspace, apply each `setup.operations` entry in order, and retain the
process, filesystem, and final-response evidence named by every assertion.

An assertion with `conditions` is scored only for those configurations. Use it
for candidate-only behavior expectations; both candidate and baseline must
still satisfy shared write-boundary and safety assertions. A `not_applicable`
assertion does not affect a hard gate.

`write_scope.default` is `deny`: only paths matching `allow` may change. A
`deny` match always fails the case. Effects in `forbidden_effects` also fail the
case. `hard_gate` assertions are binary and invalidate the case when they fail.

`deterministic` assertions use retained command output, tree hashes, paths, or
artifact parsing. `trace` assertions use retained ordered events. `semantic`
assertions require the human rubric below; each must receive a score of `2`.

## Research evidence rubric

For every semantic assertion, the reviewer records a score, an evidence
pointer, and a one-sentence rationale:

1. `0`: absent, contradicted, or unsupported by retained evidence.
2. `1`: partly satisfied, but incomplete, ambiguous, or weakly evidenced.
3. `2`: fully satisfied and supported by a specific quotation, event, path, or
   diff.

The case passes its semantic portion only if every required assertion scores
`2`. The repository owner is the final adjudicator. Deterministic results take
precedence over any future automated judge.

## Priority suite

Run the first-release priority suite with:

```bash
python3 scripts/run_skill_evaluations.py --suite priority --dry-run
```

It covers Research, Spec, and Implement. Run candidate and no-Buddy baseline
conditions with the same model, effort, permissions, fixture, prompt, and
output schema. Archive-worklogs remains a smoke case; it is not part of this
priority suite.

Live runs print compact `[skill-eval]` lifecycle messages before the final JSON
result. Use `--quiet` when a consumer needs JSON-only standard output.

## Innovate evaluation design

Do not grade Innovate against one preferred idea. The `creative-pilot` suite
uses an existing research artifact and permits a candidate to change only its
`## INNOVATION` section. Its deterministic hard gates prove that exactly that
artifact and section changed. The runner also retains the pre-run artifact so
the section boundary is reviewable. The option-shape check is a diagnostic: it
expects one to three named options plus value, cost, risk, fit, and a
simplest-viable recommendation, but it does not claim that this proves quality.

The candidate and no-Buddy baseline share the same fixture, prompt, model,
effort, permissions, and write boundary. The baseline may leave the artifact
unchanged; candidate-only assertions require the `INNOVATION` update. The
isolated runner and write boundary prevent product or specification mutations;
external-effect detection remains unverified until normalized event schemas
support a fail-closed check.

## Innovate evidence rubric

Use a blinded A/B review packet containing only the passed research artifact,
each resulting `## INNOVATION` section, and each final response. Remove model,
condition, path, timing, and trace metadata. Give each dimension a `0`, `1`,
or `2`, with an evidence pointer and one-sentence rationale:

1. Material distinctness: options differ in their primary mechanism or
   operating model, not only their wording.
2. Grounded trade-offs: value, cost, risk, and fit follow from the passed facts
   and unknowns.
3. Phase discipline: the response explores alternatives without silently
   choosing, specifying, or implementing one.

A candidate needs `2` on all three dimensions to pass human review. Preference
between candidate and baseline never offsets a deterministic hard-gate failure.

After three independent repetitions, report duplicate option headings, exact
duplicate option bodies, and high five-gram overlap as review flags. Do not
fail a case merely because equivalent runs propose the same valid idea.
