import { WORLD_PATTERNS, type WorldPatternId } from '../data/hazards'
import { EVENTS } from '../data/waves'
import { fireWorldHazard } from './hazards'
import type { Game } from './types'

const PATTERNS = Object.keys(WORLD_PATTERNS) as WorldPatternId[]

/**
 * Dev-console helper for the world's hazards, wired in `main.ts` for dev builds only:
 * `ps.hazard('volley')` fires one attack now (`line`, `zone`), and
 * `ps.hazard('auto', 10)` jumps the run to minute 10 (the wave events before it
 * skipped) with the next attack due, so the schedule plays from there.
 */
export const hazardDevTools = (game: () => Game | undefined) => ({
  hazard: (pattern: WorldPatternId | 'auto' = 'volley', minute = 10) => {
    const g = game()
    if (!g) return console.warn('ps: start a run first')
    if (pattern === 'auto') {
      g.time = minute * 60
      const next = EVENTS.findIndex((e) => e.at > g.time)
      g.nextEvent = next < 0 ? EVENTS.length : next
      g.worldHazards.charge = 1
      return
    }
    if (!PATTERNS.includes(pattern)) return console.warn(`ps: patterns: ${PATTERNS.join(', ')}, auto`)
    fireWorldHazard(g, pattern)
  },
})
