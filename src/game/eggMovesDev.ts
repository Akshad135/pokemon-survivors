import { retain } from '../engine/math'
import { MOVES, maxMoveLevel, type MoveId } from './moves'
import { EGG_MOVE_2_IDS } from './eggMoves2'
import type { Game } from './types'

/** The egg families' signature moves, in `MOVES` order (`ps.sig()` lists them). */
const SIGNATURES = [
  'dreamEater', 'forcePalm', 'dig', 'twister', 'sandTomb', 'meteorMash', 'zenHeadbutt', 'foulPlay', 'bodySlam', 'dynamicPunch', 'rollout',
  'iceBall', 'furyCutter', 'sacredSword', 'dragonDarts', 'snarl', 'gigaImpact', 'flail', 'boneRush', 'metronome', 'echoedVoice', 'curse',
  ...EGG_MOVE_2_IDS,
] as const satisfies readonly MoveId[]

/**
 * Dev-console stage for the signature moves: `ps.sig('dig')` swaps the run's
 * moves for that one at its max level (`ps.sig('dig', 3, true)` adds it at Lv 3
 * next to the others); `ps.sig()` lists the ids. Wired in `main.ts` for dev builds only.
 */
export const eggMoveDevTools = (game: () => Game | undefined) => ({
  sig: (id?: MoveId, level?: number, keep = false) => {
    if (!id) return SIGNATURES.map((m) => `${m}: ${MOVES[m].name}`)
    const g = game()
    if (!g) return console.warn('ps: start a run first')
    const owned = { id, level: Math.min(level ?? maxMoveLevel(id), maxMoveLevel(id)), cooldown: 0 }
    g.player.moves = keep ? [...g.player.moves.filter((m) => m.id !== id), owned] : [owned]
    // Lingering hitboxes of moves no longer owned go too (Whirlpool's aura).
    retain(g.attacks, (a) => g.player.moves.some((m) => m.id === a.move))
    return MOVES[id].name
  },
})
