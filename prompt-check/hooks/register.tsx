import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderChildren } from 'claude-code'

import type { Review } from '../types'

const review = atom({ plugin: 'prompt-check', key: 'review' } as const, { status: 'idle' } as Review)

const MARK = 'IMPROVED PROMPT:'

const instructions = (draft: string) => `You are reviewing a prompt the user is about to send to you, before they send it. Do not answer or carry out the prompt, and do not use tools. Answer straight away.

Judge it against the conversation so far: is it clear, specific and complete? Is the goal, the scope, the expected output and any constraint stated? Is anything ambiguous or missing that you would need to ask about?

Reply in exactly this form, nothing before or after:
- up to 4 short bullet points of concrete suggestions (or one bullet saying it already looks good)
${MARK}
<the prompt rewritten with your suggestions applied, in the user's own voice, ready to send>

<draft_prompt>
${draft}
</draft_prompt>`

const parse = (text: string) => {
  const at = text.indexOf(MARK)
  if (at < 0) return { notes: text.trim(), improved: '' }
  return { notes: text.slice(0, at).trim(), improved: text.slice(at + MARK.length).trim() }
}

async function check($: EngineInterface) {
  const { text } = await $.prompt.read()
  const draft = text.trim()
  if (!draft) {
    $.ui.toast('Type a prompt first, then press Check prompt')
    return
  }
  await update($, review, (): Review => ({ status: 'checking', draft }))

  const prompt = instructions(draft)
  let reply = await $.model.fork({ prompt, effort: 'low' })
  if (!reply.isAnswered && reply.reason === 'nothing-to-fork') {
    reply = await $.model.complete({ model: 'sonnet', prompt, effort: 'low' })
  }

  if (!reply.isAnswered) {
    await update($, review, (): Review => ({ status: 'error', message: `Review failed (${reply.reason})` }))
    return
  }
  const { notes, improved } = parse(reply.text)
  await update($, review, (): Review => ({ status: 'done', draft, notes, improved }))
}

export const register: Register = on => {
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    // Keep whatever other mods draw here (like the usage meter) and add ours on top.
    const below = await next(e)
    if (e.props.hasSurvey) return below
    const { Box, Button, Text } = $.ui.resolve(e)
    const r = await read($, review)
    const dismiss = () => update($, review, () => ({ status: 'idle' }) as Review)
    const stack = (own: RenderChildren) => (
      <Box flexDirection="column">
        {own}
        {below}
      </Box>
    )

    if (r.status === 'checking') {
      return stack(<Text dimColor>Checking your prompt…</Text>)
    }

    if (r.status === 'error') {
      return stack(
        <Box flexDirection="column">
          <Text color="red">{r.message}</Text>
          <Box>
            <Button key="retry" label="Try again" onPress={() => check($)} />
            <Text> </Text>
            <Button key="dismiss" label="Dismiss" onPress={dismiss} />
          </Box>
        </Box>,
      )
    }

    if (r.status === 'done') {
      const use = async () => {
        await $.prompt.fill({ text: r.improved, mode: 'replace' })
        await dismiss()
      }
      return stack(
        <Box flexDirection="column" borderStyle="round" paddingX={1}>
          <Text bold>Prompt review</Text>
          <Text>{r.notes}</Text>
          {r.improved ? (
            <Box flexDirection="column" marginTop={1}>
              <Text bold>Suggested version</Text>
              <Text dimColor>{r.improved}</Text>
            </Box>
          ) : null}
          <Box marginTop={1}>
            {r.improved ? <Button key="use" label="Use improved version" hotkey="u" onPress={use} /> : null}
            <Text> </Text>
            <Button key="recheck" label="Check again" hotkey="c" onPress={() => check($)} />
            <Text> </Text>
            <Button key="dismiss" label="Dismiss" hotkey="d" onPress={dismiss} />
          </Box>
        </Box>,
      )
    }

    if (e.props.isWorking) return below
    return stack(<Button key="check" label="✨ Check prompt" hotkey="c" onPress={() => check($)} />)
  })

  // Clear a stale review once the prompt is sent.
  on('prompt.submit', async ($, e, next) => {
    // Never let this cleanup get in the way of sending.
    await update($, review, () => ({ status: 'idle' }) as Review).catch(() => undefined)
    return next(e)
  })
}
