import { maxMoveLevel, MOVES, type MoveId } from './moves'
import type { Game } from './types'

/**
 * Dev-console helper: `ps.learn('solarBeam', 8)` gives the running game a move
 * at that level (or sets the level of one it owns), past the learnset and the
 * slot cap, to stage moves for screenshots and the promo video. Wired in
 * `main.ts` for dev builds only.
 */
export const learnDevTools = (game: () => Game | undefined) => ({
  learn: (id: MoveId, level = 1) => {
    const g = game()
    if (!g) return console.warn('ps: start a run first')
    if (!(id in MOVES)) return console.warn(`ps: no move "${id}"`)
    const lv = Math.max(1, Math.min(maxMoveLevel(id), Math.round(level)))
    const owned = g.player.moves.find((m) => m.id === id)
    if (owned) owned.level = lv
    else g.player.moves.push({ id, level: lv, cooldown: 0 })
    return g.player.moves.map((m) => `${m.id}:${m.level}`)
  },
})
