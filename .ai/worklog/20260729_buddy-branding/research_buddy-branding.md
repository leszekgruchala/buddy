# Buddy branding and README research

## QUESTION

What current repository and harness facts constrain a shorter Buddy README and a
comparable three-direction icon exploration?

## FINDINGS

### Current README

- `README.md` is 175 lines with 10 headings and 9 fenced blocks.
- Five workflow diagrams occupy 77 lines between lines 9 and 124.
- The stage chain is repeated in the individual workflow sections, `Typical
  paths`, and the `Deliver` diagram.
- The opening contains a title and one-sentence cross-harness description, then
  moves directly into workflow detail. It has no visual mark, tagline, concrete
  example, or evidence in the first screen.
- The only explicit native-plan-mode positioning says Buddy settles decisions
  in `spec` instead of using a separate plan stage or harness-native plan mode.
- The README documents local Codex installation. Claude Code and Cursor local
  loading are documented in `docs/harness-compatibility.md`.
- The README model-profile and cloud discussion overlaps with the longer
  explanation in `docs/harness-compatibility.md`.

### Verified Buddy workflow boundaries

- `research` gathers facts without choosing or implementing a solution.
- `innovate` produces distinct directions without deciding, specifying, or
  implementing.
- `spec` settles goal, requirements, acceptance, scope, exclusions, approach,
  constraints, and material product or architecture decisions in a persisted
  worklog artifact.
- `implement` is limited to the authorized request or approved spec, stops for
  unresolved material decisions, limits workers to bounded phases, and requires
  applicable verification before completion.
- `test-runner` is read-only.
- `develop` selects only necessary stages, dispatches bounded work, and
  integrates validation.
- These boundaries are workflow contracts, not a universal security boundary.
  Codex and Cursor enforcement still depends on their live tool and sandbox
  surfaces. The contracts support a claim about reducing accidental scope
  expansion; they do not support a claim that Buddy prevents malicious or
  destructive actions.
- The phase and worker contracts support a qualitative focused-context claim.
  The repository contains no measured token, quality, speed, or safety outcome.

### Native plan modes

- Claude Code Plan mode researches and proposes changes without editing source,
  then presents an approval transition into implementation:
  <https://code.claude.com/docs/en/permission-modes#analyze-before-you-edit-with-plan-mode>.
- Cursor Plan Mode researches the codebase, asks questions, produces an editable
  plan, and exposes a build transition. Plans default to the user's home
  directory unless explicitly saved to the workspace:
  <https://cursor.com/docs/agent/plan-mode.md>.
- These native modes already provide useful pre-implementation review. The
  verified Buddy distinction is its reusable, persisted, cross-stage workflow
  contract from research through verification, not that native plan modes lack
  planning or approval.

### Local and cloud portability

- Codex, Claude Code, and Cursor manifests all point to the shared root
  `skills/`; Cursor also points to the shared root `agents/`.
- Verified local development loading is a Codex marketplace install,
  `claude --plugin-dir .`, and a Cursor local plugin directory or symlink.
- A committed project model profile can reach cloud workers only when it is
  included in the checkout.
- A user model profile is local and is not automatically available to cloud,
  remote, or sandbox workers.
- Cursor User Rules can reach personal Cloud Agent sessions. Claude Code
  `userConfig` is not propagated to Claude Code on the web. Equivalent Codex
  synchronization is not documented.
- The repository therefore supports harness-specific local/cloud wording, not a
  claim of automatic cloud parity across all three harnesses.

### Ponytail README structure

- Ponytail's README is 305 lines, so its total length is not a short-template
  reference.
- Its opening sequence is centered identity and tagline, evidence-backed claim,
  personality narrative, concrete before/after example, measured proof with
  caveats, a simple operating mechanism, safety guardrails, then installation:
  <https://raw.githubusercontent.com/DietrichGebert/ponytail/refs/heads/main/README.md>.
- Its quantitative claims link to methods and reproduction material, and the
  README explicitly corrects an earlier over-broad result.
- Buddy currently has no equivalent outcome study, so numerical or absolute
  performance and safety claims would be unsupported.

### Harness icon contracts

- The repository currently contains no image assets and none of its three
  plugin manifests declares visual metadata.
- Codex documents `interface.brandColor`, `interface.composerIcon`,
  `interface.logo`, and `interface.screenshots`. Paths are relative to the
  plugin root, start with `./`, and visual assets should live under `./assets/`:
  <https://developers.openai.com/plugins/build/plugins>.
- Codex documentation examples use PNG assets but do not state an extension,
  MIME type, dimension, or aspect-ratio contract for icon and logo fields.
- Current bundled and curated Codex plugins establish a broader working
  envelope than the public page documents:
  - `composerIcon` examples include square 16, 24, 32, and 360 pixel assets.
  - `logo` examples include square 24, 100, 256, 360, and 512 pixel assets.
  - Both PNG and SVG are in current use.
  - Visualize and OpenAI Templates reference the same SVG for `composerIcon`
    and `logo`, so separate files are not required by the current host.
- A bundled Plugin Creator reference and current plugins support an optional
  `interface.logoDark`, although the current public packaging page does not
  document it. Many current plugins omit it, so it is not required.
- Cursor documents a top-level `logo` string in `.cursor-plugin/plugin.json`.
  A committed relative path such as `assets/logo.svg` is preferred:
  <https://cursor.com/docs/reference/plugins.md#logos>.
- Cursor's published per-plugin schema supports `logo`. Its published
  marketplace schema currently does not, despite marketplace-entry wording in
  the documentation. The per-plugin manifest is the consistently documented
  and schema-backed location.
- Claude Code's documented plugin manifest and marketplace schemas contain no
  `icon`, `logo`, `brandColor`, `composerIcon`, or screenshot field:
  <https://code.claude.com/docs/en/plugins-reference>.
- The installed Claude Code 2.1.212 validator warns about unknown top-level
  fields, and `--strict` turns those warnings into errors. `displayName` is its
  only supported UI-presentation metadata; it is not an image field.
- `claude plugin validate --strict .` passes for the current checkout. Adding an
  unsupported Claude visual field would conflict with the repository's strict
  validation contract.
- The installed Cursor Agent CLI `2026.06.04-5fd875e` supports `--plugin-dir`
  but exposes no plugin-validation command. Cursor's published validator
  applies its published schemas directly.
- Cursor's documentation says marketplace entries can contain `logo`, but the
  current official marketplace schema rejects it. The per-plugin schema accepts
  `logo`, and the documented resolution order gives that manifest precedence.
  The evidence-backed compatible location is therefore
  `.cursor-plugin/plugin.json`, not `.cursor-plugin/marketplace.json`.

### Current validator coverage

- `scripts/validate.py` permits the Codex top-level `interface` object but does
  not validate nested visual fields or referenced assets.
- It permits Cursor's top-level `logo` field but does not validate its type,
  path safety, existence, format, or dimensions.
- Marketplace validation checks Buddy identity and source, not visual metadata.
- Newline and link checks cover Markdown, JSON, and Python files, not images.

### Neutral icon comparison inputs

The requested comparison contains three previously named concepts:

1. Bracketed B: an abstract `B` held by square brackets, with a checkmark
   integrated into the lower bowl.
2. Blueprint Buddy: a compact companion mascot holding one checked
   specification sheet.
3. Controlled Route: four connected stage nodes ending in a checked node.

All three previews use the same comparison envelope:

- 1024 by 1024 square canvas.
- Solid warm-white `#F6F4EE` background.
- Centered 720 by 720 safe area.
- Flat vector-like forms with no gradient, texture, shadow, lighting, wordmark,
  watermark, scenery, or UI.
- Deep indigo `#18243D` as the dominant color and mint `#63D6C0` as the only
  accent.
- Two to four large shapes with heavy features intended to remain legible after
  downscaling.
- Inspection at 128, 64, and 32 pixels is required before selecting a final
  direction.

### Selected Blueprint Buddy preview

The user selected Blueprint Buddy. Inspection of
`trash/icon-blueprint-buddy.png` closes the preview-quality questions:

- It is a 1024 by 1024, 8-bit RGB PNG with no alpha channel.
- Its border averages approximately `#FAF7F1`, not the requested flat
  `#F6F4EE`, and varies slightly across the image.
- The dark mark averages approximately `#192846`, close to the requested
  `#18243D`. The mint averages approximately `#77D5C1`, materially lighter than
  the requested `#63D6C0`.
- The subject occupies x=284–739 and y=172–830, remains within the 720-pixel
  safe area, and is horizontally centered.
- At 128 and 64 pixels the mascot, eyes, document, and checkmark remain clear.
  At 32 pixels the silhouette, eyes, document, and checkmark remain legible;
  the curled paper edge no longer reads as a separate detail.
- The preview therefore validates the concept and small-size semantics, but not
  a production asset. It contains tonal shading and palette drift and lacks
  transparency, so a flat vector redraw is required to meet the original
  three-color brief.

### Unknown resolution

- **Codex placement and raster rules:** the exact host locations, rendered
  sizes, byte limits, and SVG feature limits remain undocumented. Current
  first-party examples prove that square PNG and SVG assets, including one SVG
  reused for both visual fields, are accepted. These private runtime details do
  not block a compatible asset.
- **Claude Code visual metadata:** resolved as unsupported. There is no
  compatible image field to add.
- **Cursor marketplace discrepancy:** resolved operationally. Put the relative
  SVG path only in `.cursor-plugin/plugin.json`; omit marketplace visual
  metadata so the published validator passes.
- **Preview quality:** resolved by measurement. Preserve the selected
  silhouette, eyes, checked document, and checkmark; remove the curled-paper
  micro-detail, tonal shading, background, and off-palette colors during vector
  cleanup.
- **Direction:** resolved by the user's selection of Blueprint Buddy.
- **Production format:** the cross-harness evidence supports one transparent,
  square, flat SVG master. Cursor explicitly documents SVG, and current Codex
  plugins use SVG for both `composerIcon` and `logo`. A separate dark variant or
  separate Codex icon/logo files are not required by any current documented
  contract.

## UNKNOWNS

No factual unknown remains that blocks specification or implementation. Codex's
exact host placement and rendering limits are undocumented runtime details; the
current first-party asset envelope above is sufficient for a compatible
implementation.
