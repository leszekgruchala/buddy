# Blueprint Buddy icon and README

## SUMMARY

Give Buddy a recognizable Blueprint Buddy visual identity in every harness that
supports plugin imagery, and replace the long workflow-first README with a short,
catchy explanation of why Buddy is useful beyond a harness-native plan mode.

The observable result is a production SVG shown at the top of the README and
referenced by Codex and Cursor, plus a concise README that leads with Buddy's
value: owned documentation, focused context through implementation, portable
workflow contracts, and reduced accidental scope expansion.

## REQUIREMENTS

1. Redraw the selected Blueprint Buddy concept as one production-quality,
   transparent, square SVG at `assets/buddy.svg`.
2. Preserve the selected concept's recognizable mascot silhouette, two eyes,
   checked specification sheet, and checkmark while removing the generated
   preview's shading, palette drift, background, and curled-paper micro-detail.
3. Use only deep indigo `#18243D`, mint `#63D6C0`, and transparency; do not add
   gradients, filters, shadows, embedded raster images, text, scenery, or a
   wordmark.
4. Keep the subject centered inside the SVG safe area and recognizable at 128,
   64, and 32 pixels.
5. Reference the same SVG from Codex `interface.composerIcon` and
   `interface.logo`, and set Codex `interface.brandColor` to `#18243D`.
6. Reference the SVG from Cursor's per-plugin `logo` field.
7. Do not add visual metadata to Claude Code or to any marketplace entry.
8. Rewrite `README.md` to be no more than 110 lines, with a centered identity,
   a short tagline, an immediate plan-mode comparison, one compact workflow,
   verified installation commands, and links to detailed compatibility
   information.
9. Explain Buddy's advantage over native plan modes as a broader persisted
   workflow contract, not as a claim that native plan modes are ineffective.
10. State local/cloud portability and safety boundaries precisely: checked-in
    contracts can be used by local and cloud agents when present in their
    checkout, local user configuration does not automatically travel, and Buddy
    reduces accidental overreach but is not a security boundary.
11. Extend the repository validator so the SVG and exact supported manifest
    references cannot silently drift.
12. Record the visual-metadata capability difference in the harness
    compatibility matrix.

## SUCCESS CRITERIA

- `assets/buddy.svg` is valid XML with `viewBox="0 0 1024 1024"`, a transparent
  canvas, and both required palette colors.
- The SVG contains no text, embedded image, gradient, filter, shadow, or
  full-canvas background shape.
- At 128 and 64 pixels the mascot, eyes, document, and checkmark are distinct;
  at 32 pixels the silhouette, eyes, document, and checkmark remain legible.
- `.codex-plugin/plugin.json` contains
  `brandColor: "#18243D"`, `composerIcon: "./assets/buddy.svg"`, and
  `logo: "./assets/buddy.svg"` inside `interface`.
- `.cursor-plugin/plugin.json` contains `"logo": "assets/buddy.svg"`.
- `.claude-plugin/plugin.json` and all three marketplace entries remain free of
  image metadata.
- The README is at most 110 lines and its first screen contains the icon,
  `Buddy`, the tagline `Plan the work. Control the context. Ship with proof.`,
  and the sentence `Plan mode is a pause before coding. Buddy is the workflow
  around coding.`
- The README contains exactly one compact stage sequence rather than separate
  diagrams for each workflow stage.
- The README describes owned persisted artifacts, phase-focused context,
  cross-harness/local-cloud portability with its checkout caveat, and bounded
  work with the security-boundary caveat.
- Existing Codex installation commands remain unchanged.
- `docs/harness-compatibility.md` identifies Codex and Cursor visual support and
  Claude Code's lack of a supported image field.
- The enhanced validator rejects a missing or malformed brand asset, incorrect
  manifest paths, unsupported Claude visual metadata, and marketplace visual
  metadata.
- Python compilation, whitespace checks, and the full repository validator
  pass.

## OUT OF SCOPE

- Adding a Claude Code icon through an undocumented field.
- Adding a Cursor marketplace-entry logo while its published schema rejects it.
- Creating separate light/dark, composer/logo, PNG, favicon, social-card,
  screenshot, or wordmark variants.
- Changing plugin ids, marketplace names, versions, skill or agent contracts,
  installation behavior, model-profile semantics, or documented CLI commands.
- Claiming measured speed, token, quality, or safety improvements.
- Installing, refreshing, publishing, or submitting the plugin in any harness.
- Keeping the three rejected icon concepts as production assets.

## CONSTRAINTS

- Keep the plugin id and repository-root plugin layout unchanged.
- Reuse the single root asset from harness manifests; do not duplicate it under
  harness-specific directories.
- Codex visual paths must be plugin-root-relative and start with `./`.
- Cursor's logo must be in `.cursor-plugin/plugin.json` and must use its
  documented repository-relative form without `./`.
- Claude Code strict validation must continue to pass.
- Keep all marketplace schemas valid and unchanged unless formatting is
  mechanically required.
- Preserve exactly one trailing newline in every text file.
- Treat the generated Blueprint Buddy PNG as visual reference only; it remains
  in worklog `trash/` and is not linked from production files.

## ASSUMPTIONS / OPEN QUESTIONS

## RISKS

- Codex does not publish exact rendering slots or pixel sizes. Mitigate by using
  one square SVG for both fields, matching current first-party plugin practice,
  and verify the mark at 32, 64, and 128 pixels.
- A hand-redrawn mascot may drift from the selected preview. Mitigate by
  preserving its four semantic anchors and tall centered silhouette while
  simplifying only the known illegible paper curl and tonal detail.
- A transparent cutout can disappear against some themes. Mitigate by testing
  the SVG on both light and dark temporary backgrounds without adding a
  theme-specific production file.
- README compression can overstate portability or safety. Mitigate by retaining
  the explicit checkout/configuration caveat and security-boundary sentence.

## INPUTS

- `.ai/worklog/20260729_buddy-branding/research_buddy-branding.md` — verified
  harness contracts, README analysis, preview measurements, and resolved
  unknowns.
- `.ai/worklog/20260729_buddy-branding/trash/icon-blueprint-buddy.png` — selected
  visual reference, not a production asset.
- `README.md` — current workflow-heavy documentation and verified Codex
  installation commands.
- `.codex-plugin/plugin.json` — Codex interface metadata to extend.
- `.claude-plugin/plugin.json` — manifest that must remain free of unsupported
  visual fields.
- `.cursor-plugin/plugin.json` — schema-backed Cursor logo location.
- `docs/harness-compatibility.md` — detailed cross-harness capability boundary.
- `scripts/validate.py` — unified offline validation gate.

## VERIFICATION COMMANDS

- project: buddy
  compile: `python3 -m py_compile scripts/validate.py`
  lint: `git diff --check`
  test: `UV_CACHE_DIR=/tmp/buddy-uv-cache uv run scripts/validate.py`

## FILE TREE

- `assets/buddy.svg` — transparent Blueprint Buddy production mark shared by
  supported harnesses and README.
- `.codex-plugin/plugin.json` — Codex brand color, composer icon, and logo
  references.
- `.cursor-plugin/plugin.json` — Cursor per-plugin logo reference.
- `README.md` — concise identity, differentiation, workflow, install, model, and
  validation overview.
- `docs/harness-compatibility.md` — precise visual support row and harness
  limitations.
- `scripts/validate.py` — asset and manifest-reference validation.

## IMPLEMENTATION DETAILS

### Production SVG contract

Create `assets/buddy.svg` as simple, hand-editable SVG geometry:

- Root element: `xmlns="http://www.w3.org/2000/svg"`,
  `viewBox="0 0 1024 1024"`, and an accessible `<title>Blueprint Buddy</title>`.
- Do not add a canvas-filling rectangle. Transparency is the background.
- Keep all visible geometry inside x=256–768 and y=152–872. Center the combined
  visual mass horizontally.
- Draw a tall, rounded indigo mascot silhouette as the dominant form.
- Cut two large oval eyes out of the indigo form using transparent negative
  space rather than a third paint color.
- Place a mint rounded specification sheet in front of the mascot on its
  lower-right side. Draw one heavy indigo checkmark inside it.
- Keep the checkmark and eyes as large forms that survive 32-pixel rendering.
- Omit the preview's curled paper edge. Use no more detail than the silhouette,
  two eye cutouts, sheet, and checkmark.
- Use uppercase six-digit color literals exactly: `#18243D` and `#63D6C0`.
- Prefer paths and basic shapes with direct `fill` attributes. Do not use CSS,
  external references, scripts, masks that depend on background color, or
  nonstandard SVG features.

Render the SVG at 128, 64, and 32 pixels with the available system preview
tooling, inspect each image, and also inspect it over temporary light and dark
backgrounds. Production files must remain limited to the single SVG.

### Manifest integration

In `.codex-plugin/plugin.json`, add these keys to the existing `interface`
object without changing existing values:

```json
"brandColor": "#18243D",
"composerIcon": "./assets/buddy.svg",
"logo": "./assets/buddy.svg"
```

In `.cursor-plugin/plugin.json`, add this top-level field without changing
existing values:

```json
"logo": "assets/buddy.svg"
```

Do not edit `.claude-plugin/plugin.json` or any marketplace file. The absence of
an image field is the correct Claude integration.

### README contract

Replace the current five-diagram workflow tour with this ordered structure:

1. Centered `assets/buddy.svg` image at 144 pixels, `# Buddy`, and the exact
   tagline `Plan the work. Control the context. Ship with proof.`
2. A two-sentence introduction naming Codex, Claude Code, and Cursor, followed
   immediately by the exact comparison sentence `Plan mode is a pause before
   coding. Buddy is the workflow around coding.`
3. `## Why Buddy?` with four compact points:
   - **Documentation you own** — research and specs are persisted in
     `.ai/worklog/`, so decisions stay inspectable and editable.
   - **Focused context** — each stage and implementation phase receives only
     the contract and evidence it needs.
   - **Portable workflow** — the same shared skills run across Codex, Claude
     Code, and Cursor, locally or in cloud checkouts where the plugin and
     committed project files are available.
   - **Safer boundaries** — explicit scope, bounded workers, and verification
     reduce accidental overreach; Buddy is a workflow guardrail, not a security
     boundary.
4. `## The workflow` with one text line:
   `research? → innovate? → spec? → implement → verify`, plus one sentence that
   optional stages are selected only when useful. Link stage names to their
   existing `SKILL.md` files without repeating full diagrams.
5. `## Install` preserving the exact verified Codex commands and reducing the
   Plugin Directory explanation to one short paragraph. Link Claude Code and
   Cursor local-loading details to
   `docs/harness-compatibility.md#refresh-local-development-installs`.
6. `## Configure models` retaining the prompt `Configure the models Buddy
   should use here.`, the project/user profile paths, project-over-user
   precedence, and the committed-project/cloud versus local-user caveat in no
   more than two paragraphs.
7. `## Compatibility and validation` linking the capability matrix and showing
   the existing unified validator command.

Do not include numerical performance claims, testimonials, repeated stage
descriptions, multiple workflow diagrams, or the discarded icon alternatives.

### Compatibility documentation

Add one row to the capability matrix:

```markdown
| Plugin visual mark | `composerIcon` and `logo` | No supported image field | `logo` |
```

Add one sentence in each relevant harness detail:

- Codex uses the shared `assets/buddy.svg` for both visual fields.
- Claude Code exposes no supported plugin image field and must remain free of
  undocumented visual metadata.
- Cursor uses the shared asset through the per-plugin manifest; its marketplace
  entry intentionally omits `logo` because the current published marketplace
  schema rejects it.

### Validator contract

Add a `validate_brand_assets(errors)` function using Python's standard-library
XML parser. It must:

1. Require `assets/buddy.svg` to exist and parse as SVG.
2. Require the exact `0 0 1024 1024` viewBox.
3. Require both exact palette values and reject any other six-digit hex color.
4. Reject SVG `text`, `image`, `filter`, `linearGradient`, `radialGradient`,
   `script`, or `style` elements.
5. Reject a root-level or child rectangle that covers the complete viewBox.

Extend `validate_manifests(errors)` to require the exact Codex brand/icon/logo
values and exact Cursor logo value. Explicitly reject visual keys
`icon`, `logo`, `brandColor`, `composerIcon`, `logoDark`, and `screenshots` from
the Claude manifest and from each marketplace plugin entry.

Call `validate_brand_assets(errors)` from `main()` before manifest validation.
Keep the validator offline and dependency-neutral beyond its existing
dependencies.

## PHASES

### Phase 1 — Produce and integrate Blueprint Buddy

```yaml
id: 1
agent: implementor
tier: balanced
reasoning_effort: high
project: buddy
depends_on: []
parallel_with: []
files_touched:
  - assets/buddy.svg
  - .codex-plugin/plugin.json
  - .cursor-plugin/plugin.json
  - docs/harness-compatibility.md
  - scripts/validate.py
success_criteria:
  - The SVG satisfies the production SVG contract and remains legible at 128, 64, and 32 pixels on light and dark backgrounds.
  - Codex and Cursor reference the exact shared asset paths; Claude and marketplace files contain no visual metadata.
  - python3 -m py_compile scripts/validate.py passes.
  - UV_CACHE_DIR=/tmp/buddy-uv-cache uv run scripts/validate.py passes.
out_of_scope:
  - README rewrite, alternate assets, harness installation, and publication.
```

Subagent brief:

> Convert the selected raster concept into the single flat SVG contract, then
> integrate only the supported Codex and Cursor fields, document the
> cross-harness visual boundary, and extend offline validation. The remaining
> implementation ambiguity is geometric polish: preserve the tall mascot,
> eyes, checked sheet, and 32-pixel recognition while simplifying the raster
> reference into minimal paths. Do not add Claude or marketplace visual fields,
> extra production assets, gradients, shading, or unsupported SVG features.

TODOs:
- [x] 1.1 Draw the production Blueprint Buddy SVG.
- [x] 1.2 Inspect 128, 64, and 32 pixel renders on light and dark backgrounds.
- [x] 1.3 Add supported Codex and Cursor manifest references.
- [x] 1.4 Document harness visual support and limitations.
- [x] 1.5 Extend and run asset and manifest validation.

### Phase 2 — Rewrite the README

```yaml
id: 2
agent: implementor
tier: fast
reasoning_effort: medium
project: buddy
depends_on: [1]
parallel_with: []
files_touched:
  - README.md
success_criteria:
  - README.md follows the exact ordered README contract and is no more than 110 lines.
  - The first screen contains the selected icon, exact tagline, and exact plan-mode comparison.
  - Installation commands, portability caveat, and safety boundary remain truthful and complete.
  - git diff --check passes.
out_of_scope:
  - Asset geometry, manifests, compatibility details beyond links, and new performance claims.
```

Subagent brief:

> Replace the workflow-heavy README with the exact seven-part concise structure
> in this spec. Lead with the Blueprint Buddy identity and differentiator,
> preserve verified commands and caveats, use one compact workflow line, keep
> the result within 110 lines, and do not change any non-README file.

TODOs:
- [x] 2.1 Replace the opening with the centered icon, tagline, and comparison.
- [x] 2.2 Condense Buddy's value and workflow into the specified sections.
- [x] 2.3 Preserve installation, model, compatibility, and validation essentials.
- [x] 2.4 Check links, line count, and whitespace.

### Phase 3 — Verify the complete change

```yaml
id: 3
agent: test-runner
tier: fast
reasoning_effort: low
project: buddy
depends_on: [2]
parallel_with: []
files_touched: []
success_criteria:
  - python3 -m py_compile scripts/validate.py passes.
  - git diff --check passes.
  - UV_CACHE_DIR=/tmp/buddy-uv-cache uv run scripts/validate.py passes.
  - All SUCCESS CRITERIA are reported as verified or failed with evidence.
out_of_scope:
  - Editing files, installing the plugin, refreshing harness state, or publishing.
```

Subagent brief:

> Validate the completed branding and README change without editing files. Run
> the three project commands, inspect the exact manifest fields, count README
> lines, verify the SVG contract and small-size renders, and report every
> top-level success criterion with evidence.

TODOs:
- [x] 3.1 Run compile, lint, and repository validation.
- [x] 3.2 Audit manifest, SVG, README, and compatibility contracts.
- [x] 3.3 Report the criterion-by-criterion result.

## DECISION LOG

- 20260729 13:03 CEST: | Decision: Use Blueprint Buddy as the sole production
  direction. | Rationale: The user selected it after comparing three neutral
  concepts.
- 20260729 13:03 CEST: | Decision: Produce one transparent flat SVG and reuse it
  everywhere supported. | Rationale: Cursor explicitly documents SVG and
  current Codex plugins demonstrate one SVG reused for composer and logo.
- 20260729 13:03 CEST: | Decision: Integrate imagery in Codex and Cursor only.
  | Rationale: Claude Code has no supported image field and strict validation
  rejects unknown metadata.
- 20260729 13:03 CEST: | Decision: Put Cursor visual metadata only in the
  per-plugin manifest. | Rationale: Cursor's current marketplace schema rejects
  the marketplace field even though prose documentation mentions it.
- 20260729 13:03 CEST: | Decision: Position Buddy as the workflow around plan
  mode, not as a universally better planner. | Rationale: The evidenced
  advantage is persisted, phase-bounded execution through verification.
- 20260729 13:03 CEST: | Decision: State safety and cloud portability with
  explicit boundaries. | Rationale: Buddy reduces accidental expansion but is
  not a security system, and local user profiles do not automatically reach
  cloud workers.

## AGENT LOG

- Phase 1 SUCCESS — produced and integrated the bounded Blueprint Buddy SVG,
  documented harness visual support, and added offline asset and manifest
  validation; files: `assets/buddy.svg`, `.codex-plugin/plugin.json`,
  `.cursor-plugin/plugin.json`, `docs/harness-compatibility.md`,
  `scripts/validate.py`
- Phase 2 SUCCESS — replaced the workflow-heavy README with the verified
  50-line identity, workflow, install, model, and compatibility overview;
  files: `README.md`
- Phase 3 SUCCESS — passed Python compilation, whitespace, full cross-harness
  validation, small-size light/dark render inspection, and every top-level
  branding criterion; files: none
