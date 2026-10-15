import type { PlayerStats } from './stats'

/**
 * Aegislash's Stance Change: its special swaps formes instead of attacking.
 * Shield takes less damage and hits softer; Blade hits harder and takes a bit
 * more. The multipliers apply on top of the final stats (`recomputeStats`), so
 * moves and the damage taken (`hurtPlayer`) follow without knowing about it. Pure.
 */
export type Stance = 'shield' | 'blade'

export const STANCES = {
  shield: { might: 0.7, damageTaken: 0.7, color: '#5890f8' },
  blade: { might: 1.3, damageTaken: 1.1, color: '#f05040' },
} as const satisfies Record<Stance, { might: number; damageTaken: number; color: string }>

/** Aegislash starts every run (and its evolution) in Shield Forme. */
export const FIRST_STANCE: Stance = 'shield'

export const otherStance = (s: Stance): Stance => (s === 'shield' ? 'blade' : 'shield')

/** Stats in a stance; `null` (every other special) leaves them as they are. */
export const stanceStats = (stats: PlayerStats, stance: Stance | null): PlayerStats => {
  if (!stance) return stats
  const m = STANCES[stance]
  return { ...stats, might: stats.might * m.might, damageTaken: stats.damageTaken * m.damageTaken }
}
