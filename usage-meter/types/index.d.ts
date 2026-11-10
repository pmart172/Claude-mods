export type Limit = { kind: string; percentUsed: number; resetsAt?: string }
export type Meter = { limits: Limit[]; now: number }

declare module 'claude-code' {
  interface PluginState {
    'usage-meter': { meter: Meter }
  }
}
