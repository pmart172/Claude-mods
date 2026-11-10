import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'prompt-check',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 20, bodyColumns: 60, scroll: { offset: 0, bodyRows: 19 } },
} as const

test('Check prompt reviews the draft and Use improved fills it', async ($, on) => {
  let filled = ''
  on('prompt.read', () => ({ value: { text: 'fix the bug', cursor: 11 } }))
  on('model.fork', () => ({
    value: { isAnswered: true, text: '- Say which bug and which file\nIMPROVED PROMPT:\nFix the login crash in auth.ts', usage: { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } },
  }))
  on('prompt.fill', (_, e) => {
    filled = e.text
    return { isFilled: true, box: { text: e.text, cursor: e.text.length } }
  })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    await ui.press({ key: 'check' })
    expect((await ui.find({ type: 'Text', text: /which bug/ }))?.text).toBe('- Say which bug and which file')
    await ui.press({ key: 'use' })
    expect(filled).toBe('Fix the login crash in auth.ts')
    expect(await ui.find({ type: 'Button', key: 'check' })).toBeTruthy()
    await ui.unmount()
  }
})
