// Drawing. No state is written here; what one-off motion needs lives in module memory.

import type { Elements } from 'claude-code'

import type { BuddyCounts, BuddyTask } from '../types'

import { bandSegments, bandSvg, paneSegments, partySvg, phasePosition, phasesSvg } from './art'
import type { Drawing, Motion } from './art'
import { STAGES } from './model'
import { elapsed, formatCost, formatTokens, textBar } from './view'
import type { BuddyView, PhaseSpendView, Spend, StageView } from './view'

type Graphic = Pick<Elements['desktop'], 'Box' | 'Text' | 'Button' | 'Svg'>
type Plain = Pick<Elements['terminal'], 'Box' | 'Text' | 'Button'>
export type Actions = { hide: () => unknown; details: () => unknown; reset: () => unknown }

/** A stage change older than this when first drawn (after a reload, say) shows no walk. */
const ARRIVAL_MS = 4000
const WALK_MS = 5000
const GROW_MS = 1500

type Moment = { key: string; from: number | undefined; until: number; isUsed: boolean }

const moments = new Map<string, Moment>()
const sources = new Map<string, { rest: string; source: string }>()

/**
 * Returns where a one-off motion of `site` starts, until a drawn source has used it.
 * The first draw that sees a new `key` starts it (`start` gets the key seen before); it lapses after `ms`
 * even when no source used it (a change first drawn late shows at rest).
 */
function momentFrom(
  site: string,
  key: string,
  start: (before: string | undefined) => number | undefined,
  now: number,
  ms: number,
): number | undefined {
  let moment = moments.get(site)

  if (moment === undefined || moment.key !== key) {
    moment = { key, from: start(moment?.key), until: now + ms, isUsed: false }
    moments.set(site, moment)
  }

  return now < moment.until && !moment.isUsed ? moment.from : undefined
}

function motionOf(site: string, view: BuddyView, segments: number, now: number): Motion {
  const { change } = view
  const walkFrom = momentFrom(
    `${site}:walk`,
    `${change.to ?? ''}@${change.at}`,
    () => (change.from !== undefined && now - change.at < ARRIVAL_MS ? STAGES.indexOf(change.from) : undefined),
    now,
    WALK_MS,
  )
  const growFrom = momentFrom(
    `${site}:grow`,
    String(segments),
    before => {
      const from = before === undefined ? 0 : Number(before)

      return from < segments ? from : undefined
    },
    now,
    GROW_MS,
  )

  return { ...(walkFrom === undefined ? {} : { walkFrom }), ...(growFrom === undefined ? {} : { growFrom }) }
}

/**
 * Keeps an `Svg` source byte-identical while what it shows stays the same, so Desktop repaints the
 * image from its cache. A motion goes into exactly one new source: it stays there while nothing
 * else changes, and any later change of the card draws at rest.
 */
function steady(site: string, draw: (motion: Motion) => Drawing, motion: Motion): Drawing {
  const rest = draw({})
  const kept = sources.get(site)

  if (kept !== undefined && kept.rest === rest.source) {
    return { ...rest, source: kept.source }
  }

  const hasMotion = motion.walkFrom !== undefined || motion.growFrom !== undefined
  const drawing = hasMotion ? draw(motion) : rest
  sources.set(site, { rest: rest.source, source: drawing.source })

  if (motion.walkFrom !== undefined) useMoment(`${site}:walk`)
  if (motion.growFrom !== undefined) useMoment(`${site}:grow`)

  return drawing
}

function useMoment(site: string): void {
  const moment = moments.get(site)

  if (moment !== undefined) moment.isUsed = true
}

const ORANGE = '#D97757'
const GOLD = '#F5C26B'
const MODE_STATUS: Record<BuddyView['mode'], { text: string; color: string }> = {
  working: { text: 'LIVE', color: 'success' },
  waiting: { text: 'YOUR TURN', color: GOLD },
  done: { text: 'CLEARED ★', color: 'success' },
}

const spendLine = (spend: Spend | undefined): string =>
  spend === undefined ? '' : spend.cost === undefined ? formatTokens(spend.tokens) : `${formatTokens(spend.tokens)} ${formatCost(spend.cost)}`
const cachedText = (counts: BuddyCounts | undefined): string =>
  counts === undefined || counts.cacheRead === 0 ? '' : ` · ${formatTokens(counts.cacheRead)} cached`
const totalLine = (view: BuddyView): string =>
  `${formatTokens(view.totals.tokens)} tok${cachedText(view.totals.counts)}${view.totals.cost === undefined ? '' : ` · ${formatCost(view.totals.cost)}`}`
/** A loop's tokens for the party list: input (with cache writes), output, total and cached. */
const loopTokens = (tokens: number, counts: BuddyCounts | undefined, isPending: boolean): string =>
  isPending
    ? '…'
    : `${counts === undefined ? '' : `in ${formatTokens(counts.input + counts.cacheWrite)} · out ${formatTokens(counts.output)} · `}${formatTokens(tokens)} tok${cachedText(counts)}`
const percent = (fraction: number): string => `${Math.round(fraction * 100)}%`

/** A Text cannot blink, so the activity line ends with a static caret. */
const CARET = '▍'

/** The acting loop's name, with its running time when it is a running subagent. */
const actorLabel = (name: string, startedAt: number | undefined, now: number): string =>
  startedAt === undefined ? name : `${name} (${elapsed(now - startedAt)})`

/** The terminal's dim line under the band: what is happening now, or the spec count. */
function nowLine(view: BuddyView): string {
  const now = view.startedAt + view.elapsedMs

  return view.activity && view.mode === 'working'
    ? `› ${actorLabel(view.actor ?? 'main', view.actorStartedAt, now)}: ${view.activity} ${CARET}`
    : view.overall
      ? `Spec ${view.overall.done}/${view.overall.total} phases`
      : ''
}

/**
 * The Desktop line under a card: the running loop and its task, and the spec count. It holds no
 * clock and no tool activity, because each change redraws the cards (see `publish`).
 */

export function cardLine(view: BuddyView): string {

  const running = view.agents.filter(agent => agent.running)
  const agent = running.find(one => one.phase !== undefined && one.phase === view.phase?.id) ?? running.at(-1)
  const doing = view.mode !== 'working' ? '' : agent ? `› ${agent.type}: ${agent.description}` : '› main'
  const spec = view.overall ? `Spec ${view.overall.done}/${view.overall.total} phases` : ''

  return [doing, spec].filter(Boolean).join(' · ')
}

/** The Desktop pane's line under the phases: the running phase's subagent and its task. */

export function paneLine(view: BuddyView): string | undefined {

  const running = view.phases.find(phase => phase.status === 'running')
  const agent = running?.agent

  return running && agent?.status === 'running' ? `› ${running.id} ${agent.type}: ${agent.description}` : undefined
}

export function graphicBand(els: Graphic, act: Actions, view: BuddyView, now: number) {

  const { Box, Text, Button, Svg } = els
  const motion = motionOf('band', view, bandSegments(view), now)
  const card = steady('band', next => bandSvg(view, next), motion)

  return (
    <Box key="buddy" flexDirection="column" gap={0}>
      <Svg key="band" source={card.source} alt={card.alt} width={card.width} height={card.height} />
      <Box key="foot" flexDirection="row" alignItems="center" gap={1}>
        <Text key="now" dimColor wrap="truncate-end">
          {cardLine(view)}
        </Text>
        <Box flexGrow={1} />
        <Button key="details" label="Details" plain onPress={act.details} />
        <Button key="hide" label="Hide" plain role="dismiss" onPress={act.hide} />
      </Box>
    </Box>
  )
}

export function graphicPane(els: Graphic, act: Actions, view: BuddyView, now: number) {

  const { Box, Text, Button, Svg } = els
  const head = steady('pane:head', next => bandSvg(view, next, true), motionOf('pane:head', view, 0, now))
  const phases = phasesSvg(view)
  const steadyPhases = phases && steady('pane:phases', next => phasesSvg(view, next.growFrom) ?? phases, motionOf('pane:phases', view, paneSegments(view), now))
  const party = steady('pane:party', () => partySvg(view), {})
  const doing = paneLine(view)

  return (
    <Box key="buddy" flexDirection="column" gap={1} paddingX={1}>
      <Svg key="head" source={head.source} alt={head.alt} width={head.width} height={head.height} />
      <Box key="foot" flexDirection="row" alignItems="center" gap={1}>
        <Text key="now" dimColor wrap="truncate-end">
          {cardLine(view)}
        </Text>
        <Box flexGrow={1} />
        <Button key="reset" label="Clear" plain onPress={act.reset} />
      </Box>
      {steadyPhases && (
        <Svg
          key="phases"
          source={steadyPhases.source}
          alt={steadyPhases.alt}
          width={steadyPhases.width}
          height={steadyPhases.height}
        />
      )}
      {doing && (
        <Text key="doing" dimColor wrap="truncate-end">
          {doing}
        </Text>
      )}
      <Svg key="party" source={party.source} alt={party.alt} width={party.width} height={party.height} />
    </Box>
  )
}

/** One stop of the terminal track: `■` required, `◆` optional, `»` skipped. */
function plainStop(els: Plain, stage: StageView) {
  const { Text } = els
  const spend = stage.spend ? ` ${spendLine(stage.spend)}` : ''

  switch (stage.status) {
    case 'skipped':
      return (
        <Text key={stage.stage} dimColor>
          » <Text strikethrough>{stage.label}</Text> SKIPPED
        </Text>
      )
    case 'current':
      return (
        <Text key={stage.stage} bold color={ORANGE}>
          {stage.optional ? '◆' : '■'} {stage.label}
          <Text color={GOLD}>{spend}</Text>
        </Text>
      )
    case 'done':
      return (
        <Text key={stage.stage} color="success">
          {stage.optional ? '◆' : '■'} {stage.label}
          <Text dimColor>{spend}</Text>
        </Text>
      )
    default:
      return (
        <Text key={stage.stage} dimColor>
          {stage.optional ? '◇' : '□'} {stage.label}
          {stage.optional ? ' OPTIONAL' : spend}
        </Text>
      )
  }
}

function plainHeader(els: Plain, view: BuddyView) {
  const { Text } = els
  const status = MODE_STATUS[view.mode]

  return (
    <Text key="title" wrap="truncate-end">
      <Text bold color={ORANGE}>
        Buddy ▸ {view.entryLabel}
      </Text>{' '}
      <Text bold>{view.mode === 'done' ? 'Quest complete!' : view.headline}</Text>
      <Text dimColor>{view.title ? ` · ${view.title}` : ''}</Text> <Text color={GOLD}>{totalLine(view)}</Text>{' '}
      <Text bold color={status.color}>
        {status.text}
      </Text>
      <Text dimColor> · {elapsed(view.elapsedMs)}</Text>
    </Text>
  )
}

function plainTrack(els: Plain, view: BuddyView) {
  const { Text } = els

  return (
    <Text key="track" wrap="truncate-end">
      {'  '}
      {view.stages.flatMap((stage, i) => [
        ...(i === 0 ? [] : [<Text key={`sep-${stage.stage}`} dimColor>{' ─ '}</Text>]),
        plainStop(els, stage),
      ])}
    </Text>
  )
}

export function plainBand(els: Plain, act: Actions, view: BuddyView) {

  const { Box, Text, Button } = els
  const phase = view.phase
  const fraction = view.mode === 'done' ? 1 : (view.bar?.fraction ?? view.overall?.fraction ?? 0)
  const tasks = view.bar ? ` ${view.bar.done}/${view.bar.total} tasks ·` : ''

  return (
    <Box key="buddy" flexDirection="column">
      <Box key="top" flexDirection="row" gap={1}>
        {plainHeader(els, view)}
        <Box flexGrow={1} />
        <Button key="details" label="Details" plain onPress={act.details} />
        <Button key="hide" label="Hide" plain onPress={act.hide} />
      </Box>
      {plainTrack(els, view)}
      {(phase || view.bar || view.overall) && (
        <Text key="phase" wrap="truncate-end">
          {'  '}
          <Text bold color={ORANGE}>
            {phase ? phase.id : view.bar ? 'Tasks' : 'Spec'}
          </Text>{' '}
          {phase ? `${phasePosition(view)} ${phase.goal} ` : ''}
          <Text color={ORANGE}>{textBar(fraction, 20)}</Text>
          {tasks} {percent(fraction)}
          <Text color={GOLD}>{phase?.spend ? ` ${spendLine(phase.spend)}` : ''}</Text>
        </Text>
      )}
      <Text key="party" wrap="truncate-end">
        {'  '}
        <Text dimColor>Party </Text>
        {view.party.flatMap((entry, i) => [
          ...(i === 0 ? [] : [<Text key={`sep-${entry.id}`} dimColor>{' · '}</Text>]),
          <Text key={`party-${entry.id}`} color={entry.running ? ORANGE : 'inactive'}>
            {entry.running ? '● ' : ''}
            {entry.label}
            {entry.phase ? ` ${entry.phase}` : ''} {entry.running && entry.tokens === 0 ? '…' : formatTokens(entry.tokens)}
          </Text>,
        ])}
      </Text>
      {nowLine(view) && (
        <Text key="now" dimColor wrap="truncate-end">
          {'  '}
          {nowLine(view)}
        </Text>
      )}
    </Box>
  )
}

const PHASE_MARK: Record<PhaseSpendView['status'], { mark: string; color: string }> = {
  pending: { mark: '□', color: 'inactive' },
  running: { mark: '■', color: ORANGE },
  success: { mark: '■', color: 'success' },
  failure: { mark: '■', color: 'error' },
  blocked: { mark: '■', color: 'warning' },
}
const TASK_MARK: Record<BuddyTask['status'], string> = { completed: '☑', in_progress: '▸', pending: '☐' }

function plainTasks(els: Plain, owner: string, tasks: readonly BuddyTask[]) {
  const { Text } = els

  return tasks.map(task => (
    <Text key={`task-${owner}-${task.id}`} dimColor={task.status === 'completed'} wrap="truncate-end">
      {'      '}
      {TASK_MARK[task.status]} {task.subject}
    </Text>
  ))
}

export function plainPane(els: Plain, act: Actions, view: BuddyView) {

  const { Box, Text, Button } = els
  const now = view.startedAt + view.elapsedMs

  return (
    <Box key="buddy" flexDirection="column">
      {plainHeader(els, view)}
      {plainTrack(els, view)}
      {view.title && (
        <Text key="spec" bold>
          Spec · {view.title}
          <Text dimColor>{view.overall ? ` · ${view.overall.done}/${view.overall.total} phases` : ''}</Text>
        </Text>
      )}
      {view.phases.map(phase => (
        <Box key={`phase-${phase.id}`} flexDirection="column">
          <Text wrap="truncate-end" dimColor={phase.status === 'pending'}>
            {'  '}
            <Text bold color={PHASE_MARK[phase.status].color}>
              {PHASE_MARK[phase.status].mark} {phase.id}
            </Text>{' '}
            {phase.goal}
            <Text color={GOLD}>{phase.spend ? ` ${spendLine(phase.spend)}` : ''}</Text>
          </Text>
          {phase.status !== 'success' && phase.requirements.length + phase.criteria.length > 0 && (
            <Text dimColor wrap="truncate-end">
              {'      '}
              {[...phase.requirements, ...phase.criteria].join(' · ')}
            </Text>
          )}
          {phase.status === 'running' && (
            <Text>
              {'      '}
              <Text color={ORANGE}>{textBar(phase.progress?.fraction ?? 0, 20)}</Text>{' '}
              {phase.progress ? `${phase.progress.done}/${phase.progress.total} tasks · ${percent(phase.progress.fraction)}` : 'working'}
            </Text>
          )}
          {phase.status === 'running' && plainTasks(els, phase.id, phase.tasks)}
          {phase.status === 'running' && phase.agent?.activity && (
            <Text dimColor wrap="truncate-end">
              {'      › '}
              {actorLabel(phase.agent.type, phase.agent.status === 'running' ? phase.agent.startedAt : undefined, now)}:{' '}
              {phase.agent.activity} {CARET}
            </Text>
          )}
        </Box>
      ))}
      {view.phases.length === 0 && view.tasks.length > 0 && (
        <Box key="tasks" flexDirection="column">
          <Text bold>
            Tasks{' '}
            <Text color={ORANGE}>{textBar(view.bar?.fraction ?? 0, 20)}</Text>
            <Text dimColor>{view.bar ? ` ${view.bar.done}/${view.bar.total} tasks` : ''}</Text>
          </Text>
          {plainTasks(els, 'main', view.tasks)}
        </Box>
      )}
      <Text key="party-title" bold>
        Party
      </Text>
      {view.agents.map(agent => (
        <Text key={`agent-${agent.id}`} dimColor={!agent.running} wrap="truncate-end">
          {'  '}
          <Text color={agent.running ? ORANGE : agent.status === 'failed' ? 'error' : 'success'}>
            {agent.running ? '●' : agent.status === 'failed' ? '✕' : '✓'}
          </Text>{' '}
          {agent.type}
          {agent.phase ? ` ${agent.phase}` : ''} · {agent.status}
          {agent.model ? ` · ${agent.model}` : ''} · {loopTokens(agent.tokens, agent.counts, agent.running && agent.tokens === 0)}
          {agent.cost === undefined ? '' : ` · ~${formatCost(agent.cost)}`}
        </Text>
      ))}
      {view.party
        .filter(entry => entry.id === 'main')
        .map(entry => (
          <Text key="agent-main" dimColor={!entry.running} wrap="truncate-end">
            {'  '}
            {entry.running ? '●' : '·'} main{entry.model ? ` · ${entry.model}` : ''} · {loopTokens(entry.tokens, entry.counts, false)}
            {entry.cost === undefined ? '' : ` · ~${formatCost(entry.cost)}`}
          </Text>
        ))}
      <Box key="foot" flexDirection="row" gap={1}>
        <Text bold color={GOLD}>
          Total {totalLine(view)}
        </Text>
        <Box flexGrow={1} />
        <Button key="reset" label="Clear" plain onPress={act.reset} />
      </Box>
    </Box>
  )
}
