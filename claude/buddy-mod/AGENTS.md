# Buddy mod: Desktop rendering rules

Read this before you change how the mod draws on the Claude Desktop app (`hooks/register.tsx`, `hooks/draw.tsx`, `hooks/art.ts`).

## Rules

1. Never set `isInteractive` on an `Svg`. Draw each card as a plain image. SMIL animation runs in a plain image too, and the cards use no other frame feature (hover, `:hover`, `<title>`).
2. Desktop render hooks read only `shownAtom`. Write `shownAtom` only from `publish`, and only when `drawnKey` changes, so the cards redraw only for a visible change.
3. While a turn runs, keep the cost that the cards show for `COST_SHOW_MS` (`withShownCost`). Otherwise each task change also redraws the header and party cards with a new cost.
4. Keep each `Svg` source byte-identical while what it shows stays the same (`steady`). Desktop then repaints the image from its cache, and a one-off motion does not play again.
5. To show a value that changes often, prefer a native `Text` or `Box`, or a `Client` region. They update without a blank. A `Client` draws only terminal elements (`Box`, `Text`, sized in character cells), never an `Svg`.
6. Do not add a `$.state` write per tool call for Desktop. Each write rebuilds every mod site on Desktop (see below).

## Cause

Claude Desktop rebuilds every mod render site on any `$.state` write, including sites that did not read the changed value. On each rebuild it creates each `Svg` again:

- An `isInteractive` Svg is a sandboxed frame. The frame loads its document again, shows blank for a moment, and its SMIL animations restart. This occurs even when the `source` is byte-identical. This was the blink.
- A plain image Svg does not blank. An unchanged source repaints from cache. A changed source replaces the old image without a blank frame.
- Native `Box`/`Text` and `Client` regions do not blank.

Open issues (not fixed in CHANGELOG.md up to Claude Code 2.1.296):

- https://github.com/anthropics/claude-code/issues/99211: Desktop redraws every mod render site on any state change. A comment there reports that removing `isInteractive` stopped the flash.
- https://github.com/anthropics/claude-code/issues/100797: an unchanged `isInteractive` Svg blanks on every `AbovePrompt` redraw.

The mod API types say only that Desktop draws an `Svg` "as an image, or in a sandboxed frame when `isInteractive`". The docs say nothing about rebuilds or flicker.

## Evidence

On 2026-10-12, a throwaway test mod on macOS Desktop (Claude Code 2.1.295) redrew a band every 2 s:

| Row | Element | Result |
| --- | --- | --- |
| A | `Svg` with `isInteractive`, source changes | blinks |
| B | `Svg` with `isInteractive`, source identical | blinks |
| C | `Svg` as an image, source changes | no blink, SMIL bar fills smoothly |
| D | native `Box` bar | no blink |
| E | `Client` bar with its own timer | no blink, local state kept |

In a harness simulation of a 3-phase implement run, the header and party cards reloaded 29 times before rules 2 and 3, and 6 and 8 times after them.

## Known limits

- Desktop still rebuilds on each state write. Issue 99211 reports that a `Button` under a resting pointer can blink, and that a press can fail during a rebuild. These are Desktop defects. Keep state writes few.
- When both issues are fixed, `isInteractive` can come back if a card needs hover or tooltips. Test it on Desktop first.

## How to check a change

1. Run the mod tests from a copy that holds only the shipped files: `UV_CACHE_DIR=/tmp/buddy-uv-cache uv run scripts/validate.py`. `tests/render.test.ts` asserts that no `Svg` is interactive and that a task change keeps the shown cost.
2. To count Desktop redraws in a test, spy on `state.set` for the `buddy` `shown` key.
3. The test kit does not paint. To see a blink, load a test mod on Desktop and have a person watch it. An agent cannot capture the Claude window.
