import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'usage-meter',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 20, bodyColumns: 80, scroll: { offset: 0, bodyRows: 19 } },
} as const

test('the band shows 5h and weekly usage on every surface', async ($, on) => {
  const now = Date.parse('2026-11-10T12:00:00Z')
  on('clock.now', () => ({ value: now }))
  on('session.measure', (_, e) => ({ changed: e.changed }))
  await $.session.measure({
    context: { window: 200000 } as never,
    rateLimits: [
      { kind: 'seven_day', percentUsed: 12, resetsAt: '2026-11-13T16:00:00Z' },
      { kind: 'five_hour', percentUsed: 63.5, resetsAt: '2026-11-10T14:15:00Z' },
    ],
    changed: ['rateLimits'],
  })

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ type: 'Text', text: /^5h/ }))?.text).toBe('5h ██████░░░░ 64% · resets in 2h 15m')
    expect((await ui.find({ type: 'Text', text: /Week/ }))?.text).toBe('   Week █░░░░░░░░░ 12% · resets in 3d 4h')
    await ui.unmount()
  }
})
