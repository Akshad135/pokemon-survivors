import type { PlayableId } from './data/hatchlings'

/** Custom events sent to Umami, with their payloads. Keep this list short: every event counts. */
type AnalyticsEvents = {
  run_start: { starter: PlayableId }
  run_end: { starter: PlayableId; outcome: 'victory' | 'gameover' | 'endless' | 'quit'; minute: number; level: number; kills: number }
}

declare global {
  interface Window {
    /** Umami's tracker, set by the script in the page head. Missing in dev, offline or behind an ad blocker. */
    umami?: { track: (event: string, data?: Record<string, string | number>) => void }
  }
}

/** Sends a custom event to Umami. Silently does nothing when the tracker isn't loaded. */
export const track = <E extends keyof AnalyticsEvents>(event: E, data: AnalyticsEvents[E]) => window.umami?.track(event, data)
