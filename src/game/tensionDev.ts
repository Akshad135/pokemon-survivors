import { TENSION_PEAK, tensionMods } from './tension'
import type { Game } from './types'

/**
 * Dev-console helper for the pressure director, wired in `main.ts` for dev
 * builds only: `ps.tension()` prints it (level, reach, harm and what it does
 * to the spawns right now) and `ps.tension(0.8)` sets its level (0..1). Setting
 * it also marks the player dominant (reach 1, no harm), so it holds until
 * the horde gets close or the player gets hurt.
 */
export const tensionDevTools = (game: () => Game | undefined) => ({
  tension: (level?: number) => {
    const g = game()
    if (!g) return console.warn('ps: start a run first')
    const s = g.tension
    if (level !== undefined) {
      s.level = Math.min(1, Math.max(0, level))
      s.reach = 1
      s.harm = 0
    }
    return { ...s, mods: tensionMods(s.level, TENSION_PEAK[g.difficulty], g.endless !== null) }
  },
})
