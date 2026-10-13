import type { EnemyId } from './enemies'

/** How an enemy hazard looks (and sounds when it lands). */
export type HazardVisual = 'rock' | 'slam' | 'thunder' | 'ice' | 'fire' | 'psychic'

/**
 * Boss attack patterns. Each one fires every `every` seconds while the boss is
 * near the player. Damage is contact damage dealt to the player.
 */
export type BossPattern =
  /** Telegraphed circles that land after `delay` seconds, around the player or the boss itself. */
  | { kind: 'strikes'; every: number; target: 'player' | 'self'; count: number; spread: number; radius: number; delay: number; damage: number; visual: HazardVisual }
  /** A ring of projectiles fired outward from the boss. */
  | { kind: 'ring'; every: number; count: number; speed: number; radius: number; damage: number; visual: HazardVisual }
  /** Lingering zones dropped at the boss's feet as it moves. */
  | { kind: 'trail'; every: number; ttl: number; radius: number; damage: number; visual: HazardVisual }

/** Add a legendary by giving it an entry in `ENEMIES`, a boss event in `waves.ts` and its patterns here. */
export const BOSS_PATTERNS: Partial<Record<EnemyId, readonly BossPattern[]>> = {
  onix: [{ kind: 'strikes', every: 4.5, target: 'player', count: 3, spread: 50, radius: 12, delay: 1.1, damage: 14, visual: 'rock' }],
  snorlax: [{ kind: 'strikes', every: 5, target: 'self', count: 1, spread: 0, radius: 46, delay: 1.3, damage: 22, visual: 'slam' }],
  articuno: [{ kind: 'ring', every: 3.2, count: 12, speed: 72, radius: 5, damage: 18, visual: 'ice' }],
  zapdos: [{ kind: 'strikes', every: 2.6, target: 'player', count: 4, spread: 64, radius: 15, delay: 1, damage: 24, visual: 'thunder' }],
  moltres: [
    { kind: 'trail', every: 0.16, ttl: 3.2, radius: 7, damage: 14, visual: 'fire' },
    { kind: 'ring', every: 5.5, count: 8, speed: 60, radius: 5, damage: 20, visual: 'fire' },
  ],
  mew: [{ kind: 'ring', every: 2.4, count: 8, speed: 90, radius: 5, damage: 22, visual: 'psychic' }],
  mewtwo: [
    { kind: 'ring', every: 3, count: 16, speed: 80, radius: 5, damage: 26, visual: 'psychic' },
    { kind: 'strikes', every: 5.5, target: 'player', count: 5, spread: 80, radius: 18, delay: 1.1, damage: 30, visual: 'psychic' },
  ],
}
