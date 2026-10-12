import type { FoundElement } from 'claude-code/testing'

type Readable = {
  find: (query: { text?: RegExp }) => Promise<FoundElement | undefined>
  findAll: (query: { type?: string }) => Promise<FoundElement[]>
}

/** Longer than the mod's publish delay: after it, the Desktop cards show the latest flow. */
export const SETTLE_MS = 600

/** Every `Svg` source of a drawing, joined; `find({ text })` does not search inside them. */
export async function svgSources(ui: Readable): Promise<string> {
  return (await ui.findAll({ type: 'Svg' })).map(svg => String(svg.props.source ?? '')).join('\n')
}

/** True when the drawing shows `text` in a Text or Button, or inside one of its `Svg` sources. */
export async function shows(ui: Readable, text: RegExp): Promise<boolean> {
  return (await ui.find({ text })) !== undefined || text.test(await svgSources(ui))
}

export const SPEC = `---
model_slug: claude-opus-5-5
contract_revision: 2
---

# Parser upgrade

## SUMMARY
Faster parser.

## PHASES

\`\`\`yaml
id: P1
goal: Replace the tokenizer with a streaming tokenizer
requirements: [R1, R2]
success_criteria: [SC1]
\`\`\`

\`\`\`yaml
id: P2
goal: Validate the final implementation against the whole specification.
requirements:
  - R1
  - R2
success_criteria: [SC2]
\`\`\`

## AGENT LOG
- P1 SUCCESS (revision 2) — tokenizer streams; files: src/tok.ts; evidence: tests pass
`
