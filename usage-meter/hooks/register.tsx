import { atom, read, update } from 'claude-code'
import type { Register, SessionRateLimit } from 'claude-code'

import type { Limit, Meter } from '../types'

const meter = atom({ plugin: 'usage-meter', key: 'meter' } as const, { limits: [], now: 0 } as Meter)

const LABELS: Record<string, string> = { five_hour: '5h', seven_day: 'Week' }
const ORDER = ['five_hour', 'seven_day']

function bar(pct: number) {
  const filled = Math.max(0, Math.min(10, Math.round(pct / 10)))
  return '█'.repeat(filled) + '░'.repeat(10 - filled)
}

function color(pct: number) {
  return pct >= 80 ? 'red' : pct >= 50 ? 'yellow' : 'green'
}

function until(resetsAt: string | undefined, now: number) {
  if (!resetsAt) return ''
  const ms = Date.parse(resetsAt) - now
  if (!Number.isFinite(ms) || ms <= 0) return ''
  const mins = Math.round(ms / 60000)
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  const text = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`
  return ` · resets in ${text}`
}

function shown(limits: readonly SessionRateLimit[]): Limit[] {
  return limits
    .filter(l => ORDER.includes(l.kind))
    .sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind))
    .map(l => ({ kind: l.kind, percentUsed: l.percentUsed, resetsAt: l.resetsAt }))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    const usage = await $.session.usage()
    const now = await $.clock.now()
    await update($, meter, (): Meter => ({ limits: shown(usage.rateLimits), now }))
    // Keep the "resets in" countdown fresh between turns.
    $.clock.every(60_000, () => {
      void $.clock.now().then(t => update($, meter, (m): Meter => ({ ...m, now: t })))
    })
    return result
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits')) {
      const now = await $.clock.now()
      await update($, meter, (): Meter => ({ limits: shown(e.rateLimits), now })).catch(() => undefined)
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    if (e.props.hasSurvey) return below
    const { Box, Text } = $.ui.resolve(e)
    const m = await read($, meter)

    return (
      <Box flexDirection="column">
        <Box key="usage" flexWrap="wrap">
          {m.limits.length === 0 ? (
            <Text dimColor>Usage: waiting for the first reply…</Text>
          ) : (
            m.limits.map((l, i) => (
              <Text key={l.kind}>
                {i > 0 ? '   ' : ''}
                <Text bold>{LABELS[l.kind] ?? l.kind} </Text>
                <Text color={color(l.percentUsed)}>{bar(l.percentUsed)}</Text>
                <Text> {Math.round(l.percentUsed)}%</Text>
                <Text dimColor>{until(l.resetsAt, m.now)}</Text>
              </Text>
            ))
          )}
        </Box>
        {below}
      </Box>
    )
  })
}
