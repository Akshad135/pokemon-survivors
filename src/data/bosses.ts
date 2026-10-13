import type { EnemyId } from './enemies'

/** How an enemy hazard looks (and sounds when it lands). */
export type HazardVisual = 'rock' | 'slam' | 'thunder' | 'ice' | 'fire' | 'psychic' | 'water' | 'dragon' | 'steel' | 'aero' | 'judgment'

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
  // Rift legendaries: each leans on its signature move and types.
  /** Aeroblast rings and a Hurricane around itself. */
  lugia: [
    { kind: 'ring', every: 3.2, count: 14, speed: 90, radius: 5, damage: 20, visual: 'aero' },
    { kind: 'strikes', every: 6, target: 'self', count: 1, spread: 0, radius: 54, delay: 1.3, damage: 24, visual: 'aero' },
  ],
  /** Sacred Fire: a burning trail and fire raining on the player. */
  hoOh: [
    { kind: 'trail', every: 0.18, ttl: 3, radius: 7, damage: 16, visual: 'fire' },
    { kind: 'strikes', every: 3.6, target: 'player', count: 5, spread: 70, radius: 14, delay: 1.1, damage: 22, visual: 'fire' },
  ],
  /** Origin Pulse: dense water rings, plus a downpour on the player. */
  kyogre: [
    { kind: 'ring', every: 3.4, count: 18, speed: 70, radius: 5, damage: 20, visual: 'water' },
    { kind: 'strikes', every: 4, target: 'player', count: 4, spread: 60, radius: 16, delay: 1, damage: 20, visual: 'water' },
  ],
  /** Precipice Blades around the player, a ground slam and magma where it walks. */
  groudon: [
    { kind: 'strikes', every: 3.2, target: 'player', count: 6, spread: 80, radius: 13, delay: 1.1, damage: 22, visual: 'rock' },
    { kind: 'strikes', every: 5.5, target: 'self', count: 1, spread: 0, radius: 58, delay: 1.4, damage: 26, visual: 'slam' },
    { kind: 'trail', every: 0.3, ttl: 2.4, radius: 7, damage: 14, visual: 'fire' },
  ],
  /** Fast dragon rings and Draco Meteor. */
  rayquaza: [
    { kind: 'ring', every: 2.2, count: 10, speed: 110, radius: 5, damage: 20, visual: 'dragon' },
    { kind: 'strikes', every: 3.4, target: 'player', count: 3, spread: 50, radius: 20, delay: 0.9, damage: 24, visual: 'dragon' },
  ],
  /** Roar of Time: a huge pulse around itself, slow steel rings and dragon strikes. */
  dialga: [
    { kind: 'strikes', every: 6.5, target: 'self', count: 1, spread: 0, radius: 70, delay: 1.6, damage: 28, visual: 'steel' },
    { kind: 'ring', every: 3.6, count: 20, speed: 56, radius: 5, damage: 18, visual: 'steel' },
    { kind: 'strikes', every: 4.5, target: 'player', count: 2, spread: 40, radius: 18, delay: 1, damage: 22, visual: 'dragon' },
  ],
  /** The reaper's Judgment: a storm of light on the player and wide rings. */
  arceus: [
    { kind: 'strikes', every: 3, target: 'player', count: 7, spread: 100, radius: 16, delay: 1, damage: 45, visual: 'judgment' },
    { kind: 'ring', every: 4.5, count: 24, speed: 80, radius: 5, damage: 40, visual: 'judgment' },
  ],
}
