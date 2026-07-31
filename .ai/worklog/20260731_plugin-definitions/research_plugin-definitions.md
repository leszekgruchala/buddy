# Buddy plugin definitions

## QUESTION

Inventory Buddy's plugin and marketplace definitions across Codex, Claude Code, and Cursor; compare them with current official contracts and context-mode examples; identify the metadata and copy that can be filled from verified facts; and isolate the remaining product choices before any implementation.

## FINDINGS

- Verified owner facts supplied by the user:
  - Repository: `https://github.com/leszekgruchala/buddy`
  - Homepage: `https://gruchala.eu`
  - Developer: `Leszek Gruchała`
  - Preferred short phrasing: `Plan the work. Control the context. Ship with proof.`
- The repository is on `main` and was clean before this research artifact was created.
- Definition scope:
  - `.codex-plugin/plugin.json`
  - `.agents/plugins/marketplace.json`
  - `.claude-plugin/plugin.json`
  - `.claude-plugin/marketplace.json`
  - `.cursor-plugin/plugin.json`
  - `.cursor-plugin/marketplace.json`
  - `scripts/validate.py`, because it encodes the accepted field sets and cross-harness invariants
- Current metadata is only partly aligned:
  - All three manifests use version `1.0.0` and description `Your coding buddy`.
  - Codex alone has `shortDescription` and `longDescription`; its longer wording is currently `Reusable coding skills and workflow guidance for software engineers who know what and how to build`.
  - Claude and Cursor repeat the old short and long wording in their marketplace definitions.
  - `repository` is absent from every manifest and marketplace entry.
  - `homepage` and `Leszek Gruchała` are already present where supported.
  - The Cursor and Claude marketplace owners have a name but no email.
  - The repository has no version tags and no `LICENSE` file.
- Current official field support:
  - Codex plugin metadata supports `author`, `homepage`, `repository`, `license`, `keywords`, and an `interface` block with `displayName`, `shortDescription`, `longDescription`, `developerName`, `category`, `websiteURL`, visual fields, and starter prompts. The Codex marketplace entry is intentionally sparse: name, source, policy, and category; publisher copy belongs in the plugin manifest.
  - Claude's plugin manifest supports `displayName`, `version`, `description`, `author` with optional email and URL, `homepage`, `repository`, `license`, and `keywords`. Claude has no supported visual field; strict validation turns unknown-field warnings into errors.
  - Claude's marketplace supports marketplace owner/contact metadata plus per-plugin description, version, author, homepage, repository, license, keywords, and category.
  - Cursor's plugin manifest supports `displayName`, `version`, `description`, `author` with optional email, `homepage`, `repository`, `license`, `logo`, `keywords`, `category`, and `tags`.
  - Cursor's published marketplace JSON Schema currently allows only `name`, `source`, and `description` in each plugin entry even though the prose reference lists richer entry metadata. Because the schema sets `additionalProperties: false`, richer metadata belongs in `.cursor-plugin/plugin.json`, not the marketplace entry. Marketplace-level `metadata` is extensible.
- The context-mode examples confirm a useful separation:
  - Manifest descriptions explain the product concretely.
  - `homepage` and `repository` are separate.
  - Author/owner email is optional but used when the publisher wants a public contact.
  - Keywords and a license are discovery/provenance metadata, not substitutes for product copy.
- Visual metadata is already settled and current:
  - Codex uses `#18243D` plus `./assets/buddy.svg` for `composerIcon` and `logo`.
  - Cursor uses `assets/buddy.svg`.
  - Claude and marketplace definitions omit visual metadata.
- Proposed aligned copy for confirmation:
  - Tagline: `Plan the work. Control the context. Ship with proof.`
  - Core description: `Plan the work. Control the context. Ship with proof. Buddy is a coding companion for developers that carries engineering work from research and planning through implementation and verification.`
  - Long-description base: `Buddy is a coding companion for developers who want a focused path from an engineering need to verified code. Reusable skills and agents keep research, decisions, planning, implementation, and verification connected`
  - End each long description with only its owning harness: `in Codex.`, `in Claude Code.`, or `in Cursor.`
- Proposed placement:
  - Use the tagline for Codex `interface.shortDescription`.
  - Use the core description for each plugin manifest and each Claude/Cursor plugin marketplace entry.
  - Use the long description for Codex `interface.longDescription` and the Claude/Cursor marketplace-level description.
  - Add `repository: https://github.com/leszekgruchala/buddy` and preserve `homepage: https://gruchala.eu` wherever the harness supports them.
- Primary references checked on 2026-07-31:
  - OpenAI plugin build guidance: `https://developers.openai.com/plugins/build/plugins`
  - Codex `plugin-creator` manifest and marketplace reference bundled with the installed Codex version
  - Claude plugin reference: `https://code.claude.com/docs/en/plugins-reference.md`
  - Claude marketplace guide: `https://code.claude.com/docs/en/plugin-marketplaces.md`
  - Cursor plugin reference: `https://cursor.com/docs/reference/plugins.md`
  - Cursor published schemas: `https://github.com/cursor/plugins/tree/main/schemas`
  - The four context-mode examples supplied by the user
- Baseline validation:
  - `claude plugin validate --strict .` passes.
  - `git diff --check` passes.
  - The first Buddy validator run found only two broken links inside the temporary fetched Codex manual under this worklog's `trash/`; that disposable cache was removed before the final validation rerun.
  - After cleanup, `UV_CACHE_DIR=/tmp/buddy-uv-cache uv run scripts/validate.py` passes for Agent Skills, Codex, Claude Code, and Cursor.

## UNKNOWNS

- None.

## DECISIONS

- Use the proposed core and long descriptions verbatim.
- Keep version `1.0.0`.
- Add the Elastic License 2.0 text used by context-mode, with Buddy's copyright holder, and declare `Elastic-2.0` where supported.
- Omit public email fields to reduce spam exposure; the homepage and repository remain the contact surfaces.
- Use the proposed harness-native categories.
- Use the shared discovery keywords and add `ai-sdlc`; the user's `AI SDLF` wording was interpreted as the established term AI software development lifecycle.
- Keep every marketplace and interface description local to its owning harness; do not advertise the other harnesses there.

## IMPLEMENTATION

- Added `LICENSE`.
- Updated all three plugin manifests with aligned copy, repository, license, keywords, categories where supported, and no public email.
- Updated all three marketplace definitions within each harness's schema constraints.
- Updated `scripts/validate.py` to enforce the synchronized metadata, license, privacy choice, and Cursor marketplace's minimal schema.
- Made the longer descriptions harness-local following review feedback.

## VERIFICATION

- Buddy's cross-harness validator passes.
- Claude Code strict plugin validation passes.
- Codex's `plugin-creator` validator passes.
- Both Cursor definitions pass Cursor's current published JSON Schemas.
- `LICENSE` matches the requested context-mode Elastic License 2.0 source byte-for-byte except for Buddy's copyright holder.
- `git diff --check` passes.
