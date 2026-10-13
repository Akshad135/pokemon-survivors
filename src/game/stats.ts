/**
 * Player-wide modifiers, Vampire Survivors style. Every source (starter,
 * evolution stage, held items) contributes additive deltas on top of BASE.
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
  /** added to every move's status chance */
  statusChance: number
  /** extra burn/poison damage (0.2 = +20%) */
  statusDamage: number
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
  statusChance: 0,
  statusDamage: 0,
}

export const applyDeltas = (base: PlayerStats, deltas: readonly StatDelta[]): PlayerStats =>
  deltas.reduce<PlayerStats>((acc, delta) => {
    const next = { ...acc }
    for (const k of Object.keys(delta) as (keyof PlayerStats)[]) next[k] += delta[k] ?? 0
    return next
  }, base)
