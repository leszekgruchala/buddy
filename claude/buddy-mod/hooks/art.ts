// Design A · Pixel Quest, round 2: the band card, the pane's phase and party
// cards. Each returns one self-contained SVG (CSS keyframes and SMIL only, no
// script) for the `Svg` element. The sources depend only on the view and the
// one-off motion given, never on the clock, so redraws without a change keep
// them identical and running animations do not restart.

import type { AgentView, BuddyView, PartyView, PhaseSpendView, Spend, StageView } from './view'
import type { BuddyTask } from '../types'

/** One SVG drawing with its size in CSS pixels. */
export type Drawing = { source: string; width: number; height: number; alt: string }

/** One-off motion for a draw: where the mascot walks from, from which bar segment the fill grows. */
export type Motion = { walkFrom?: number; growFrom?: number }

const W = 680
const SEGMENTS = 20
const O = '#D97757'
const O2 = '#F0A272'
const GOLD = '#F5C26B'
const GREEN = '#5DBB84'
const RED = '#E5534B'
const INK = '#171513'
const SANS = `-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",system-ui,sans-serif`
const MONO = `"SF Mono",ui-monospace,Menlo,Consolas,monospace`

const esc = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const cut = (text: string, size: number): string =>
  text.length > size ? `${text.slice(0, Math.max(1, size - 1))}…` : text
const clip = (text: string, size: number): string => esc(cut(text, size))

/** Tokens the A way: `842`, `64K`, `1.19M`. */
export function tok(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 1 : 2)}M`
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`
  return String(n)
}

/** Dollars the A way: `$0.14`, `$12.3`. */
export const usd = (n: number): string => `$${n < 10 ? n.toFixed(2) : n.toFixed(1)}`

const spendText = (s: Spend): string => (s.cost === undefined ? tok(s.tokens) : `${tok(s.tokens)} · ${usd(s.cost)}`)

/** Rough advance of one character, for clipping text to a column. */
const CHAR = { mono: 7.5, tiny: 5.7, sans13: 7, sans12: 6.6 }

// ── The mascot: an orange pixel critter in the spirit of the Claude Code one ──

// A CSS animation of `transform` replaces an element's `transform` attribute, so an element with
// one of these animated classes never carries a positioning `transform`; a parent `<g>` places it.
const MASCOT_CSS = (u: number): string => `
.mb,.leg,.arm,.eye,.eyes,.mj{transform-box:fill-box}
.m-working .mb{animation:bob .46s steps(1) infinite}
.m-working .la{animation:step .46s steps(1) infinite}
.m-working .lb{animation:step .46s steps(1) -.23s infinite}
@keyframes bob{0%{transform:none}50%{transform:translateY(-${u}px)}}
@keyframes step{0%{transform:none}50%{transform:translateY(-${u}px)}}
.eye{transform-origin:50% 50%;animation:blink 3.8s infinite}
@keyframes blink{0%,91%,100%{transform:scaleY(1)}94%{transform:scaleY(.15)}}
.m-working .eyes{transform:translateX(${u}px)}
.m-waiting .eyes{transform:translateY(-${u}px)}
.m-waiting .mb{animation:breathe 2.6s ease-in-out infinite}
@keyframes breathe{0%,100%{transform:none}50%{transform:translateY(${(u * 0.6).toFixed(1)}px)}}
.m-done .mj{animation:hop .9s cubic-bezier(.3,0,.3,1) infinite}
@keyframes hop{0%,55%,100%{transform:none}25%{transform:translateY(-${u * 3.5}px)}}
.m-done .arm{animation:wave .3s steps(1) infinite}
.m-done .arm.r{animation-delay:-.15s}
@keyframes wave{0%{transform:none}50%{transform:translateY(-${u * 2}px)}}
.mini{transform-box:fill-box;animation:minihop .5s steps(1) infinite}
@keyframes minihop{0%{transform:none}50%{transform:translateY(-2px)}}
.coin{transform-box:fill-box;transform-origin:50% 50%;animation:coin 1.6s ease-in-out infinite}
@keyframes coin{0%,100%{transform:scaleX(1)}50%{transform:scaleX(.2)}}
`

const TEXT_CSS = `.mono{font-family:${MONO};font-size:10px;letter-spacing:1.5px}.b{font-weight:700}.lbl{font-size:9px}.tiny{font-size:8.5px;letter-spacing:.6px}
.sans{font-family:${SANS}}`

const DEFS = `<defs><pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="#fff" opacity=".07"/></pattern>
<linearGradient id="seg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${O2}"/><stop offset="1" stop-color="${O}"/></linearGradient>
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`

/** The dark pixel card every drawing sits on. */
function card(height: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}">
<style>${MASCOT_CSS(3)}
${TEXT_CSS}
</style>
${DEFS}
<rect width="${W}" height="${height}" rx="14" fill="${INK}"/><rect width="${W}" height="${height}" rx="14" fill="url(#grid)"/>
<rect x=".5" y=".5" width="${W - 1}" height="${height - 1}" rx="13.5" fill="none" stroke="#fff" stroke-opacity=".08"/>
${body}
</svg>`
}

/** The mascot, 14u wide and 9u tall, top-left at (0, 0). */
function mascot(u: number, mode: BuddyView['mode']): string {
  const r = (x: number, y: number, w: number, h: number, fill: string, cls = ''): string =>
    `<rect class="${cls}" x="${x * u}" y="${y * u}" width="${w * u}" height="${h * u}" fill="${fill}"/>`
  const eye = '#1E1915'

  return `<g class="m-${mode}" shape-rendering="crispEdges"><g class="mj">
<g class="mb">${r(2, 0, 10, 7, O)}${r(2, 6, 10, 1, '#C4643F')}${r(0, 3, 2, 2, O, 'arm l')}${r(12, 3, 2, 2, O, 'arm r')}
<g class="eyes">${r(4, 2, 1, 2, eye, 'eye')}${r(9, 2, 1, 2, eye, 'eye')}</g></g>
${r(3, 7, 1, 2, O, 'leg la')}${r(5, 7, 1, 2, O, 'leg lb')}${r(8, 7, 1, 2, O, 'leg la')}${r(10, 7, 1, 2, O, 'leg lb')}
</g></g>`
}

/** A tiny static critter for party chips and agent rows, 14u by 9u. */
function miniCritter(u: number, color: string): string {
  const r = (x: number, y: number, w: number, h: number, fill: string): string =>
    `<rect x="${x * u}" y="${y * u}" width="${w * u}" height="${h * u}" fill="${fill}"/>`

  return `<g shape-rendering="crispEdges">${r(2, 0, 10, 7, color)}${r(0, 3, 2, 2, color)}${r(12, 3, 2, 2, color)}${r(4, 2, 1, 2, '#1E1915')}${r(9, 2, 1, 2, '#1E1915')}${r(3, 7, 1, 2, color)}${r(5, 7, 1, 2, color)}${r(8, 7, 1, 2, color)}${r(10, 7, 1, 2, color)}</g>`
}

/**
 * Pieces that burst from (cx, cy) and fall. CSS keyframes, one set per piece: many concurrent
 * SMIL animations on hidden pieces stop Chromium from painting the rest of the frame.
 */
function confetti(cx: number, cy: number, spread: number, count: number): string {
  const colors = [O, O2, GREEN, GOLD, '#8FB8F2', '#E58FB5']
  let css = ''
  let pieces = ''

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (i % 3) * 0.3
    const dist = spread * (0.55 + ((i * 37) % 45) / 100)
    const dx = Math.cos(angle) * dist
    const dy = Math.sin(angle) * dist * 0.6 - spread * 0.25
    const delay = ((i * 0.15) % 1.2).toFixed(2)
    css += `@keyframes cf${i}{0%{transform:translate(0,0);opacity:0}10%{opacity:1}50%{transform:translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px)}70%{opacity:1}100%{transform:translate(${(dx * 1.1).toFixed(1)}px,${(dy + spread * 0.5).toFixed(1)}px);opacity:0}}
.cf${i}{animation:cf${i} 1.8s linear ${delay}s infinite backwards}
`
    pieces += `<rect class="cf${i}" x="${cx}" y="${cy}" width="4" height="4" rx="1" fill="${colors[i % colors.length]}"/>`
  }

  return `<style>${css}</style>${pieces}`
}

const CHECK = (x: number, y: number): string =>
  `<path d="M${x - 4} ${y}h2v2h2v-2h2v-2h2" stroke="#fff" stroke-width="2" fill="none" shape-rendering="crispEdges"/>`

/** The orange outline that grows and fades around a running square. */
const pulseRing = (x: number, y: number, size: number, grow: number): string =>
  `<rect x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}" fill="none" stroke="${O}" stroke-width="2" opacity=".7">
<animate attributeName="x" values="${x - size / 2};${x - size / 2 - grow}" dur="1.2s" repeatCount="indefinite"/><animate attributeName="y" values="${y - size / 2};${y - size / 2 - grow}" dur="1.2s" repeatCount="indefinite"/>
<animate attributeName="width" values="${size};${size + grow * 2}" dur="1.2s" repeatCount="indefinite"/><animate attributeName="height" values="${size};${size + grow * 2}" dur="1.2s" repeatCount="indefinite"/>
<animate attributeName="opacity" values=".8;0" dur="1.2s" repeatCount="indefinite"/></rect>`

const filledSegments = (fraction: number): number => Math.round(Math.max(0, Math.min(1, fraction)) * SEGMENTS)

/**
 * Twenty segments from `x`; the segments from `growFrom` up to the fill fade in once.
 * @param isSweeping true draws work with no measurable progress: a lit block runs across the empty bar
 */
function segmentBar(
  x: number,
  y: number,
  fraction: number,
  isWorking: boolean,
  growFrom: number | undefined,
  size = { w: 9, h: 12, step: 11 },
  isSweeping = false,
): string {
  const filled = filledSegments(fraction)
  let bar = ''

  if (isSweeping) {
    for (let i = 0; i < SEGMENTS; i++) {
      bar += `<rect x="${x + i * size.step}" y="${y}" width="${size.w}" height="${size.h}" fill="#2C2824" shape-rendering="crispEdges"><animate attributeName="fill" values="#2C2824;${O};#2C2824;#2C2824" keyTimes="0;.05;.2;1" dur="2.4s" begin="${(i * 0.08).toFixed(2)}s" repeatCount="indefinite"/></rect>`
    }

    return bar
  }

  for (let i = 0; i < SEGMENTS; i++) {
    const isOn = i < filled
    const isNext = i === filled && isWorking
    const grows = isOn && growFrom !== undefined && i >= growFrom
    bar += `<rect x="${x + i * size.step}" y="${y}" width="${size.w}" height="${size.h}" fill="${isOn ? 'url(#seg)' : '#2C2824'}" ${isOn ? 'filter="url(#glow)"' : ''} shape-rendering="crispEdges">${
      grows ? `<animate attributeName="opacity" values="0;1" dur=".25s" begin="${((i - growFrom) * 0.05).toFixed(2)}s" fill="freeze"/>` : ''
    }${isNext ? `<animate attributeName="fill" values="#2C2824;${O};#2C2824" dur=".9s" repeatCount="indefinite"/>` : ''}</rect>`
  }

  return bar
}

/**
 * The phase-row bar's fraction: full when done, else the task progress, else the spec's progress,
 * so a phase with no task list does not stand at 0%.
 */
function bandFraction(view: BuddyView): number {
  if (view.mode === 'done') return 1
  return view.bar?.fraction ?? view.overall?.fraction ?? 0
}

/** How many of the band's 20 segments are lit; the caller remembers it to grow the bar once per change. */
export const bandSegments = (view: BuddyView): number => filledSegments(bandFraction(view))

/** How many of the running phase's (or the task list's) 20 segments are lit in the pane. */
export function paneSegments(view: BuddyView): number {
  const running = view.phases.find(phase => phase.status === 'running')

  return filledSegments(view.phases.length > 0 ? (running?.progress?.fraction ?? 0) : (view.bar?.fraction ?? 0))
}

/** The track column the mascot stands at: the current stage, the end when done, else the first. */
export function mascotColumn(view: BuddyView): number {
  const index = view.stages.findIndex(stage => stage.stage === view.stage)

  if (index !== -1) return index
  return view.mode === 'done' ? view.stages.length - 1 : 0
}

/** An id chip at (x, y); returns its markup and width. */
function chip(x: number, y: number, label: string): { svg: string; width: number } {
  const width = Math.max(30, label.length * 8 + 12)

  return {
    width,
    svg: `<rect x="${x}" y="${y - 2}" width="${width}" height="16" rx="3" fill="${O}" fill-opacity=".16" stroke="${O}" stroke-opacity=".5"/>
<text x="${x + width / 2}" y="${y + 9.5}" text-anchor="middle" class="mono b" fill="${O2}" letter-spacing="0.5">${esc(label)}</text>`,
  }
}

// ── The band ─────────────────────────────────────────────────────────────────

const ROAD_Y = 112
const XS = [0, 1, 2, 3, 4, 5].map(i => 62 + i * 111)

function header(view: BuddyView): string {
  const score = `<g transform="translate(${W - 262} 18)"><rect class="coin" width="10" height="12" rx="2" fill="${GOLD}"/><rect x="3" y="3" width="2" height="6" fill="#fff" opacity=".7"/></g>
<text x="${W - 247}" y="29" class="mono b" fill="${GOLD}">${tok(view.totals.tokens)}<tspan fill="#7D766B" font-weight="400"> TOK</tspan>${
    view.totals.cost === undefined ? '' : ` ${usd(view.totals.cost)}`
  }</text>`
  const status =
    view.mode === 'working'
      ? `<circle cx="${W - 62}" cy="25" r="3.5" fill="${GREEN}"><animate attributeName="opacity" values="1;.25;1" dur="1.1s" repeatCount="indefinite"/></circle><text x="${W - 22}" y="29" text-anchor="end" class="mono b" fill="${GREEN}">LIVE</text>`
      : view.mode === 'waiting'
        ? `<text x="${W - 22}" y="29" text-anchor="end" class="mono b" fill="${GOLD}">YOUR TURN</text>`
        : `<text x="${W - 22}" y="29" text-anchor="end" class="mono b" fill="${GREEN}">CLEARED ★</text>`
  const headline = view.mode === 'done' ? 'Quest complete!' : view.headline
  const room = Math.floor((W - 44 - headline.length * 11.5 - 10) / CHAR.sans13)
  const title =
    view.title && room > 6
      ? `<tspan dx="10" font-size="13" font-weight="500" fill="#7D766B">${clip(view.title, Math.min(room, 48))}</tspan>`
      : ''

  return `<text x="22" y="29" class="mono b" fill="${O}">BUDDY</text><text x="78" y="29" class="mono" fill="#7D766B">▸ ${clip(view.entryLabel.toUpperCase(), 18)}</text>
${score}${status}
<text x="22" y="60" class="sans" font-size="21" font-weight="700" fill="#F4EEE4">${esc(headline)}${title}</text>`
}

function stop(x: number, stage: StageView): string {
  const isCur = stage.status === 'current'
  const isDone = stage.status === 'done'
  const isSkipped = stage.status === 'skipped'
  const diamond = (r: number, attrs: string): string =>
    `<polygon points="${x},${ROAD_Y - r} ${x + r},${ROAD_Y} ${x},${ROAD_Y + r} ${x - r},${ROAD_Y}" ${attrs} shape-rendering="crispEdges"/>`
  const sub = isSkipped
    ? `<text x="${x}" y="${ROAD_Y + 41}" text-anchor="middle" class="mono tiny" fill="#5E5850">SKIPPED</text>`
    : stage.spend
      ? `<text x="${x}" y="${ROAD_Y + 41}" text-anchor="middle" class="mono tiny" fill="${isCur ? GOLD : '#77705F'}">${spendText(stage.spend)}</text>`
      : stage.optional && stage.status === 'pending'
        ? `<text x="${x}" y="${ROAD_Y + 41}" text-anchor="middle" class="mono tiny" fill="#5E5850">OPTIONAL</text>`
        : ''
  const label = `<text x="${x}" y="${ROAD_Y + 28}" text-anchor="middle" class="mono lbl" fill="${isCur ? O2 : isDone ? '#8CCBA4' : '#5E5850'}"${isCur ? ' font-weight="700"' : ''}${
    isSkipped ? ' text-decoration="line-through"' : ''
  }>${esc(stage.label.toUpperCase())}</text>${sub}`

  if (isSkipped) {
    return `${diamond(8, 'fill="#211E1B" stroke="#4A443D" stroke-width="2"')}<text x="${x}" y="${ROAD_Y + 3.5}" text-anchor="middle" class="mono" font-size="9" letter-spacing="0" fill="#8A8378">»</text>${label}`
  }
  if (stage.optional && isDone) {
    return `${diamond(10, `fill="${GREEN}"`)}${CHECK(x, ROAD_Y)}${label}`
  }
  if (stage.optional && isCur) {
    return `<g transform="translate(${x} ${ROAD_Y})"><polygon points="0,-10 10,0 0,10 -10,0" fill="none" stroke="${O}" stroke-width="2"><animateTransform attributeName="transform" type="scale" values="1;1.9" dur="1.2s" repeatCount="indefinite"/><animate attributeName="opacity" values=".8;0" dur="1.2s" repeatCount="indefinite"/></polygon></g>
${diamond(10, `fill="${O}"`)}${diamond(3, 'fill="#FFE3D3"')}${label}`
  }
  if (stage.optional) {
    return `${diamond(8, `fill="${INK}" stroke="#4A443D" stroke-width="2" stroke-dasharray="3 2"`)}${label}`
  }
  if (isDone) {
    return `<rect x="${x - 8}" y="${ROAD_Y - 8}" width="16" height="16" fill="${GREEN}" shape-rendering="crispEdges"/>
${CHECK(x, ROAD_Y)}${label}`
  }
  if (isCur) {
    return `${pulseRing(x, ROAD_Y, 16, 6)}
<rect x="${x - 8}" y="${ROAD_Y - 8}" width="16" height="16" fill="${O}" shape-rendering="crispEdges"/><rect x="${x - 3}" y="${ROAD_Y - 3}" width="6" height="6" fill="#FFE3D3" shape-rendering="crispEdges"/>${label}`
  }

  return `<rect x="${x - 7}" y="${ROAD_Y - 7}" width="14" height="14" fill="${INK}" stroke="#4A443D" stroke-width="2" shape-rendering="crispEdges"/>${label}`
}

function track(view: BuddyView, walkFrom: number | undefined): string {
  const u = 3
  const at = mascotColumn(view)
  const hasStage = view.stage !== undefined || view.mode === 'done'
  const first = XS[0]!
  const last = XS.at(-1)!
  // A develop run lights the track from its first stop; another run from the first stage it ran.
  const ran = view.entry === 'develop' ? 0 : view.stages.findIndex(stage => stage.status !== 'pending')
  const start = hasStage ? XS[Math.max(0, Math.min(ran, at))]! : first
  const reached = hasStage ? XS[at]! : first
  // One solid line: lit up to the critter, dim beyond it, never broken by skipped stops.
  const pulse = ((reached - start) / 160).toFixed(2)
  const road = `<rect x="${first}" y="${ROAD_Y - 2}" width="${last - first}" height="4" fill="#34302B" shape-rendering="crispEdges"/>
<rect x="${start}" y="${ROAD_Y - 2}" width="${reached - start}" height="4" fill="${O}" filter="url(#glow)" shape-rendering="crispEdges"/>
${
  view.mode === 'working' && reached > start
    ? `<rect y="${ROAD_Y - 2}" width="10" height="4" fill="#FFE3D3" shape-rendering="crispEdges"><animate attributeName="x" values="${start};${reached - 10}" dur="${pulse}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.1;.85;1" dur="${pulse}s" repeatCount="indefinite"/></rect>`
    : ''
}`
  const stops = view.stages.map((stage, i) => stop(XS[i]!, stage)).join('')
  const baseY = ROAD_Y - 12 - 9 * u
  const from = walkFrom !== undefined && walkFrom !== at && walkFrom >= 0 && walkFrom < XS.length ? walkFrom : undefined
  let walk = ''

  if (from !== undefined) {
    // The walk hops over every skipped stop between where the critter was and where it is going.
    const points: [number, number][] = [[XS[from]! - 7 * u, baseY]]

    for (let i = from + 1; i < at; i++) {
      if (view.stages[i]?.status === 'skipped') {
        const cx = XS[i]! - 7 * u
        points.push([cx - 30, baseY], [cx, baseY - 12], [cx + 30, baseY])
      }
    }

    points.push([XS[at]! - 7 * u, baseY])
    const start = points[0]![0]
    const span = points.at(-1)![0] - start || 1
    walk = `<animateTransform attributeName="transform" type="translate" values="${points.map(([x, y]) => `${x} ${y}`).join(';')}" keyTimes="${points
      .map(([x]) => ((x - start) / span).toFixed(3))
      .join(';')}" dur="${(1.2 + Math.abs(span) / 200).toFixed(2)}s" fill="freeze"/>`
  }

  const bubble =
    view.mode === 'waiting'
      ? `<g transform="translate(${15 * u} ${u})"><rect width="18" height="18" fill="${GOLD}" shape-rendering="crispEdges"/><rect x="4" y="18" width="4" height="4" fill="${GOLD}" shape-rendering="crispEdges"/><text x="9" y="14" text-anchor="middle" class="mono b" font-size="13" fill="#1E1915">?</text>
<animateTransform attributeName="transform" type="translate" values="${15 * u} ${u};${15 * u} ${-u};${15 * u} ${u}" dur="1.6s" repeatCount="indefinite"/></g>`
      : view.mode === 'working'
        ? `<g transform="translate(${-3 * u} ${8 * u})" opacity=".6">${[0, 1, 2]
            .map(
              i =>
                `<rect x="${-i * 5}" y="0" width="3" height="3" fill="#8A8378"><animate attributeName="opacity" values="0;.9;0" dur=".9s" begin="${i * 0.3}s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="translate" values="0 0;-6 -4" dur=".9s" begin="${i * 0.3}s" repeatCount="indefinite"/></rect>`,
            )
            .join('')}</g>`
        : ''

  return `${road}${stops}
<g transform="translate(${XS[at]! - 7 * u} ${baseY})">${walk}${mascot(u, view.mode)}${bubble}</g>
${view.mode === 'done' ? confetti(XS[at]! - 20, ROAD_Y - 28, 50, 12) : ''}`
}

/** Where the phase in focus stands in the spec, such as `3/4`. */
export function phasePosition(view: BuddyView): string {
  const index = view.phases.findIndex(phase => phase.id === view.phase?.id)

  return `${index + 1}/${view.phases.length}`
}

function phaseRow(view: BuddyView, y: number, growFrom: number | undefined): string {
  const fraction = bandFraction(view)
  let left = ''

  if (view.phase) {
    const id = chip(22, y, view.phase.id)
    const position = phasePosition(view)
    const at = `<text x="${22 + id.width + 8}" y="${y + 10}" class="mono tiny" fill="#8A8378">${position}</text>`
    const x = 22 + id.width + 8 + position.length * CHAR.tiny + 8
    const tasks = view.bar ? `${view.bar.done}/${view.bar.total} TASKS` : ''
    const spend = view.phase.spend ? spendText(view.phase.spend) : ''
    const extras = (tasks ? tasks.length * CHAR.tiny + 8 : 0) + (spend ? spend.length * CHAR.tiny + 8 : 0)
    const room = Math.max(8, Math.floor((384 - x - extras) / CHAR.sans12))
    left = `${id.svg}${at}<text x="${x}" y="${y + 10}" class="sans" font-size="12.5" fill="#D9D2C6">${clip(view.phase.goal, room)}${
      tasks ? `<tspan class="mono tiny" fill="#8A8378" dx="8">${tasks}</tspan>` : ''
    }${spend ? `<tspan class="mono tiny" fill="${GOLD}" dx="8">${spend}</tspan>` : ''}</text>`
  } else if (view.bar) {
    const id = chip(22, y, 'TASKS')
    left = `${id.svg}<text x="${22 + id.width + 8}" y="${y + 10}" class="mono tiny" fill="#8A8378">${view.bar.done}/${view.bar.total} TASKS</text>`
  } else if (view.overall) {
    const id = chip(22, y, 'SPEC')
    left = `${id.svg}<text x="${22 + id.width + 8}" y="${y + 10}" class="mono tiny" fill="#8A8378">${view.overall.done}/${view.overall.total} PHASES</text>`
  }

  return `${left}
${segmentBar(392, y, fraction, view.mode === 'working', growFrom)}<text x="${W - 22}" y="${y + 10}" text-anchor="end" class="mono b" fill="#D9D2C6">${Math.round(fraction * 100)}%</text>`
}

function partyChips(party: readonly PartyView[], y: number): string {
  let px = 70
  let out = ''
  let shown = 0

  for (const [index, entry] of party.entries()) {
    const amount = entry.running && entry.tokens === 0 ? '…' : tok(entry.tokens)
    const text = `${entry.phase ? `${entry.label} ${entry.phase}` : entry.label} ${amount}`.toUpperCase()
    const w = text.length * 6.4 + 34
    const reserve = index < party.length - 1 ? 40 : 0

    if (px + w + reserve > W - 22) break

    out += `<g transform="translate(${px.toFixed(1)} ${y})"><rect width="${w.toFixed(1)}" height="18" fill="#221F1B" stroke="${entry.running ? O : '#3A3530'}" stroke-width="1.5" shape-rendering="crispEdges">${
      entry.running ? '<animate attributeName="stroke-opacity" values="1;.3;1" dur="1.2s" repeatCount="indefinite"/>' : ''
    }</rect><g transform="translate(5 5)"><g class="${entry.running ? 'mini' : ''}">${miniCritter(1, entry.running ? O : '#8CCBA4')}</g></g>
<text x="23" y="12.5" class="mono tiny" fill="${entry.running ? '#E9DFD2' : '#8A8378'}">${esc(text)}</text></g>`
    px += w + 6
    shown += 1
  }

  if (shown < party.length) {
    out += `<g transform="translate(${px.toFixed(1)} ${y})"><rect width="34" height="18" fill="#221F1B" stroke="#3A3530" stroke-width="1.5" shape-rendering="crispEdges"/><text x="17" y="12.5" text-anchor="middle" class="mono tiny" fill="#8A8378">+${party.length - shown}</text></g>`
  }

  return `<text x="22" y="${y + 12.5}" class="mono tiny" fill="#6F695F">PARTY</text>${out}`
}

/**
 * The band card: header, headline, stage track with the mascot, phase row and party.
 * @param view what to draw
 * @param motion one-off motion for this change; absent draws everything at rest
 * @param isCompact true leaves out the phase row and party (the pane's header)
 */
export function bandSvg(view: BuddyView, motion: Motion = {}, isCompact = false): Drawing {
  const height = isCompact ? 164 : 212
  const stage = view.stages.find(one => one.stage === view.stage)
  const body = `${header(view)}
${track(view, motion.walkFrom)}
${isCompact ? '' : `${phaseRow(view, 166, motion.growFrom)}\n${partyChips(view.party, 186)}`}`
  const alt = [
    `Buddy ${view.entryLabel}: ${view.mode === 'done' ? 'done' : view.headline}`,
    stage ? `stage ${stage.label}` : '',
    view.phase ? `phase ${view.phase.id}` : '',
    `${tok(view.totals.tokens)} tokens`,
  ]
    .filter(Boolean)
    .join(', ')

  return { source: card(height, body), width: W, height, alt }
}

// ── The pane ─────────────────────────────────────────────────────────────────

/** A 16-pixel status block: dim outline, orange pulsing, green check, red cross, gold bang. */
function statusBlock(x: number, y: number, status: PhaseSpendView['status']): string {
  const cx = x + 8
  const cy = y + 8

  switch (status) {
    case 'running':
      return `${pulseRing(cx, cy, 16, 5)}<rect x="${x}" y="${y}" width="16" height="16" fill="${O}" shape-rendering="crispEdges"/><rect x="${cx - 3}" y="${cy - 3}" width="6" height="6" fill="#FFE3D3" shape-rendering="crispEdges"/>`
    case 'success':
      return `<rect x="${x}" y="${y}" width="16" height="16" fill="${GREEN}" shape-rendering="crispEdges"/>${CHECK(cx, cy)}`
    case 'failure':
      return `<rect x="${x}" y="${y}" width="16" height="16" fill="${RED}" shape-rendering="crispEdges"/><path d="M${cx - 4} ${cy - 4}l8 8M${cx + 4} ${cy - 4}l-8 8" stroke="#fff" stroke-width="2" shape-rendering="crispEdges"/>`
    case 'blocked':
      return `<rect x="${x}" y="${y}" width="16" height="16" fill="${GOLD}" shape-rendering="crispEdges"/><rect x="${cx - 1}" y="${cy - 5}" width="2" height="6" fill="#1E1915"/><rect x="${cx - 1}" y="${cy + 3}" width="2" height="2" fill="#1E1915"/>`
    default:
      return `<rect x="${x + 1}" y="${y + 1}" width="14" height="14" fill="${INK}" stroke="#4A443D" stroke-width="2" shape-rendering="crispEdges"/>`
  }
}

const MAX_TASKS = 10

/** A checklist from (x, y), 15 pixels a row; returns the markup and the height used. */
function checklist(x: number, y: number, tasks: readonly BuddyTask[]): { svg: string; height: number } {
  const shown = tasks.slice(0, MAX_TASKS)
  let svg = ''

  for (const [i, task] of shown.entries()) {
    const ty = y + i * 15
    const box =
      task.status === 'completed'
        ? `<rect x="${x}" y="${ty}" width="9" height="9" fill="${GREEN}" shape-rendering="crispEdges"/>`
        : task.status === 'in_progress'
          ? `<rect x="${x}" y="${ty}" width="9" height="9" fill="${O}" shape-rendering="crispEdges"><animate attributeName="opacity" values="1;.35;1" dur="1.2s" repeatCount="indefinite"/></rect>`
          : `<rect x="${x + 0.75}" y="${ty + 0.75}" width="7.5" height="7.5" fill="none" stroke="#4A443D" stroke-width="1.5" shape-rendering="crispEdges"/>`
    const color = task.status === 'completed' ? '#77705F' : task.status === 'in_progress' ? '#F4EEE4' : '#B5AC9F'
    svg += `${box}<text x="${x + 16}" y="${ty + 8.5}" class="sans" font-size="12" fill="${color}"${task.status === 'completed' ? ' text-decoration="line-through"' : ''}>${clip(task.subject, 80)}</text>`
  }

  if (tasks.length > shown.length) {
    svg += `<text x="${x + 16}" y="${y + shown.length * 15 + 8.5}" class="mono tiny" fill="#6F695F">+${tasks.length - shown.length} MORE</text>`
  }

  return { svg, height: (shown.length + (tasks.length > shown.length ? 1 : 0)) * 15 }
}

/**
 * The pane's phase card: every spec phase or, without a spec, the direct task list.
 * @param view what to draw
 * @param growFrom the bar segment the running phase's fill grows from, once per change
 * @returns the drawing, or `undefined` when there is neither a spec nor a task list
 */
export function phasesSvg(view: BuddyView, growFrom?: number): Drawing | undefined {
  const isWorking = view.mode === 'working'

  if (view.phases.length === 0) {
    if (view.tasks.length === 0) return undefined

    const done = view.tasks.filter(task => task.status === 'completed').length
    const fraction = view.bar?.fraction ?? done / view.tasks.length
    const list = checklist(48, 64, view.tasks)
    const height = 64 + list.height + 14
    const body = `<text x="22" y="28" class="mono b" fill="${O}">TASKS</text><text x="${W - 22}" y="28" text-anchor="end" class="mono" fill="#7D766B">${done}/${view.tasks.length} · ${Math.round(fraction * 100)}%</text>
${segmentBar(48, 40, fraction, isWorking, growFrom)}
${list.svg}`

    return { source: card(height, body), width: W, height, alt: `Buddy tasks: ${done} of ${view.tasks.length} done` }
  }

  const settled = view.phases.filter(phase => phase.status === 'success').length
  let y = 48
  let rows = ''

  for (const phase of view.phases) {
    const isRunning = phase.status === 'running'
    const id = chip(48, y + 2, phase.id)
    const gx = 48 + id.width + 10
    const spend = phase.spend ? spendText(phase.spend) : ''
    const room = Math.max(10, Math.floor((W - 22 - gx - (spend ? spend.length * CHAR.tiny + 16 : 0)) / CHAR.sans13))
    rows += `${statusBlock(22, y + 1, phase.status)}${id.svg}<text x="${gx}" y="${y + 12.5}" class="sans" font-size="13" font-weight="${isRunning ? 700 : 500}" fill="${
      phase.status === 'pending' ? '#8A8378' : '#E9DFD2'
    }">${clip(phase.goal, room)}</text>${spend ? `<text x="${W - 22}" y="${y + 12}" text-anchor="end" class="mono tiny" fill="${GOLD}">${spend}</text>` : ''}`
    y += 22

    const ids = [...phase.requirements, ...phase.criteria]

    if (ids.length > 0 && phase.status !== 'success') {
      rows += `<text x="48" y="${y + 6}" class="mono tiny" fill="#6F695F">${clip(ids.join(' · '), 100)}</text>`
      y += 16
    }

    if (isRunning) {
      const fraction = phase.progress?.fraction ?? 0
      const label = phase.progress ? `${phase.progress.done}/${phase.progress.total} TASKS · ${Math.round(fraction * 100)}%` : 'WORKING'
      const isSweeping = isWorking && phase.progress === undefined
      rows += `${segmentBar(48, y, fraction, isWorking, growFrom, { w: 8, h: 10, step: 10 }, isSweeping)}<text x="${48 + SEGMENTS * 10 + 8}" y="${y + 8.5}" class="mono tiny" fill="#D9D2C6">${label}</text>`
      y += 20
      const list = checklist(48, y, phase.tasks)
      rows += list.svg
      y += list.height + (list.height > 0 ? 4 : 0)
    }

    rows += `<rect x="22" y="${y + 3}" width="${W - 44}" height="1" fill="#2C2824"/>`
    y += 12
  }

  const height = y + 6
  const body = `<text x="22" y="28" class="mono b" fill="${O}">SPEC</text>${
    view.title ? `<text x="70" y="28" class="mono" fill="#7D766B">▸ ${clip(view.title.toUpperCase(), 44)}</text>` : ''
  }<text x="${W - 22}" y="28" text-anchor="end" class="mono" fill="#7D766B">${settled}/${view.phases.length} PHASES</text>
${rows}`

  return { source: card(height, body), width: W, height, alt: `Buddy spec: ${settled} of ${view.phases.length} phases done` }
}

const MAX_AGENTS = 16
const shortModel = (model: string | undefined): string => (model ?? '').replace(/^claude-/, '').replace(/\[.*\]$/, '')

type AgentRow = {
  label: string
  phase?: string
  note: string
  status: AgentView['status'] | 'idle'
  model?: string
  tokens: number
  cost?: number
}

/**
 * The pane's party card: every Buddy subagent of the flow and the main loop, with the total.
 * @param view what to draw
 */
export function partySvg(view: BuddyView): Drawing {
  const main = view.party.find(entry => entry.id === 'main')
  const agents = view.agents.slice(-MAX_AGENTS)
  const earlier = view.agents.length - agents.length
  const rows: AgentRow[] = agents.map(agent => ({
    label: agent.type,
    note: agent.description,
    status: agent.status,
    tokens: agent.tokens,
    ...(agent.phase === undefined ? {} : { phase: agent.phase }),
    ...(agent.model === undefined ? {} : { model: agent.model }),
    ...(agent.cost === undefined ? {} : { cost: agent.cost }),
  }))

  if (main) {
    rows.push({
      label: 'main',
      note: 'The main session',
      status: main.running ? 'running' : 'idle',
      tokens: main.tokens,
      ...(main.model === undefined ? {} : { model: main.model }),
      ...(main.cost === undefined ? {} : { cost: main.cost }),
    })
  }

  let y = 46
  let body = ''

  if (earlier > 0) {
    body += `<text x="22" y="${y + 6}" class="mono tiny" fill="#6F695F">+${earlier} EARLIER AGENTS</text>`
    y += 16
  }

  for (const row of rows) {
    const isRunning = row.status === 'running'
    const color = isRunning ? O : row.status === 'failed' ? RED : row.status === 'idle' ? '#8A8378' : '#8CCBA4'
    const statusText = isRunning ? 'RUNNING' : row.status === 'failed' ? 'FAILED' : row.status === 'idle' ? 'IDLE' : 'DONE'
    const name = row.label.toUpperCase()
    const phase = row.phase ? chip(56 + name.length * CHAR.mono + 6, y + 1, row.phase) : undefined
    body += `<g transform="translate(22 ${y + 2})"><g class="${isRunning ? 'mini' : ''}">${miniCritter(1.5, color)}</g></g>
<text x="56" y="${y + 11}" class="mono b" fill="#E9DFD2">${esc(name)}</text>${phase ? phase.svg : ''}
<text x="56" y="${y + 25}" class="sans" font-size="11" fill="#7D766B">${clip(row.note, 44)}</text>
<text x="350" y="${y + 11}" class="mono tiny b" fill="${color}">${statusText}${
      isRunning ? '<animate attributeName="opacity" values="1;.35;1" dur="1.2s" repeatCount="indefinite"/>' : ''
    }</text>
<text x="350" y="${y + 25}" class="mono tiny" fill="#6F695F">${clip(shortModel(row.model).toUpperCase(), 22)}</text>
<text x="${W - 96}" y="${y + 11}" text-anchor="end" class="mono" fill="#D9D2C6">${isRunning && row.tokens === 0 ? '…' : tok(row.tokens)}</text>
<text x="${W - 22}" y="${y + 11}" text-anchor="end" class="mono" fill="${GOLD}">${row.cost === undefined ? '' : usd(row.cost)}</text>
<rect x="22" y="${y + 33}" width="${W - 44}" height="1" fill="#2C2824"/>`
    y += 40
  }

  const total = `${tok(view.totals.tokens)} TOK${view.totals.cost === undefined ? '' : ` · ${usd(view.totals.cost)}`}`
  body += `<text x="22" y="${y + 12}" class="mono b" fill="#D9D2C6">TOTAL</text><text x="${W - 22}" y="${y + 12}" text-anchor="end" class="mono b" fill="${GOLD}">${total}</text>`
  y += 20

  if (rows.some(row => row.cost !== undefined)) {
    body += `<text x="22" y="${y + 8}" class="mono tiny" fill="#6F695F">AGENT COST IS AN API LIST-PRICE ESTIMATE</text>`
    y += 14
  }

  const height = y + 12
  const head = `<text x="22" y="28" class="mono b" fill="${O}">PARTY</text><text x="80" y="28" class="mono" fill="#7D766B">▸ ${view.agents.length} ${view.agents.length === 1 ? 'AGENT' : 'AGENTS'}</text>
<text x="${W - 96}" y="28" text-anchor="end" class="mono tiny" fill="#6F695F">TOKENS</text><text x="${W - 22}" y="28" text-anchor="end" class="mono tiny" fill="#6F695F">EST. COST</text>`

  return {
    source: card(height, `${head}\n${body}`),
    width: W,
    height,
    alt: `Buddy party: ${view.agents.length} ${view.agents.length === 1 ? 'agent' : 'agents'}, ${tok(view.totals.tokens)} tokens in total`,
  }
}
