import type { PokeType } from '../data/types'

/**
 * Player-wide modifiers, Vampire Survivors style. Every source (starter,
 * evolution stage, held items, Poké Mart ranks) contributes additive deltas on top of BASE.
 */
export type PlayerStats = {
  maxHp: number
  /** px/s */
  speed: number
  /** damage multiplier */
  might: number
  /** attack size multiplier */
  area: number
  /** cooldown multiplier (lower is faster) */
  cooldown: number
  /** effect duration multiplier */
  duration: number
  /** extra projectiles */
  amount: number
  projectileSpeed: number
  /** pickup radius in px */
  magnet: number
  /** hp per second */
  regen: number
  /** flat damage reduction */
  armor: number
  /** xp multiplier */
  growth: number
  /** Poké Dollar multiplier */
  greed: number
  /** extra damage per move type, on top of might (0.1 = +10% for that type) */
  typeDamage: Partial<Record<PokeType, number>>
  /** added to every move's status chance */
  statusChance: number
  /** extra burn/poison damage (0.2 = +20%) */
  statusDamage: number
  /** multiplier on the damage the player takes, before armor (Aegislash's stances) */
  damageTaken: number
  /** loadout moves fired where the special lands (Metronome) */
  comboMoves: number
  /** seconds cut from the special's cooldown per kill it makes (Power Herb) */
  specialRecharge: number
}

export type StatDelta = Partial<PlayerStats>

export const BASE_STATS: PlayerStats = {
  maxHp: 100,
  speed: 68,
  might: 1,
  area: 1,
  cooldown: 1,
  duration: 1,
  amount: 0,
  projectileSpeed: 1,
  magnet: 30,
  regen: 0,
  armor: 0,
  growth: 1,
  greed: 1,
  typeDamage: {},
  statusChance: 0,
  statusDamage: 0,
  damageTaken: 1,
  comboMoves: 0,
  specialRecharge: 0,
}

export const applyDeltas = (base: PlayerStats, deltas: readonly StatDelta[]): PlayerStats =>
  deltas.reduce<PlayerStats>((acc, { typeDamage, ...delta }) => {
    const next = { ...acc, typeDamage: { ...acc.typeDamage } }
    for (const k of Object.keys(delta) as (keyof typeof delta)[]) next[k] += delta[k] ?? 0
    for (const [type, bonus] of Object.entries(typeDamage ?? {}) as Array<[PokeType, number]>) {
      next.typeDamage[type] = (next.typeDamage[type] ?? 0) + bonus
    }
    return next
  }, base)
