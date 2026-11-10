export type Review =
  | { status: 'idle' }
  | { status: 'checking'; draft: string }
  | { status: 'done'; draft: string; notes: string; improved: string }
  | { status: 'error'; message: string }

declare module 'claude-code' {
  interface PluginState {
    'prompt-check': { review: Review }
  }
}
