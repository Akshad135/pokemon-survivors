import type { EnemyId } from './enemies'

/** How an enemy hazard looks (and sounds when it lands). */
export type HazardVisual = 'rock' | 'slam' | 'thunder' | 'ice' | 'fire' | 'psychic' | 'water' | 'dragon' | 'steel' | 'aero' | 'grass' | 'judgment' | 'poison'

/**
 * A wave boss fights in two stances it swaps every few seconds (`BOSS_RAGE.stance`):
 * `close` rushes the player with attacks around itself, `ranged` hangs back
 * (`STANCES`) and aims at the player from afar.
 */
export type BossStance = 'close' | 'ranged'

/**
 * Boss attack patterns. Each one fires every `every` seconds while the boss is
 * near the player. Damage is contact damage dealt to the player. A pattern
 * with a `stance` only fires (and only counts down) in that stance; one
 * without fires in both.
 */
export type BossPattern = { stance?: BossStance } & (
  /** Telegraphed circles that land after `delay` seconds, around the player or the boss itself. */
  | { kind: 'strikes'; every: number; target: 'player' | 'self'; count: number; spread: number; radius: number; delay: number; damage: number; visual: HazardVisual }
  /** A ring of projectiles fired outward from the boss. */
  | { kind: 'ring'; every: number; count: number; speed: number; radius: number; damage: number; visual: HazardVisual }
  /** Lingering zones dropped at the boss's feet as it moves. */
  | { kind: 'trail'; every: number; ttl: number; radius: number; damage: number; visual: HazardVisual }
)

/** How each stance walks: a pace multiplier, and how close `ranged` comes before it stops walking in (px). */
export const STANCES = {
  close: { pace: 1.3, hold: 0 },
  ranged: { pace: 0.7, hold: 80 },
} as const satisfies Record<BossStance, { pace: number; hold: number }>

/**
 * Wave bosses (the ones on the `EVENTS` schedule) swap stance every `stance`
 * seconds (a seeded roll in that range) and enrage under `below` of their HP:
 * `speed` times faster, `wait` times the pause between attacks, and a `chain`
 * chance that an attack is followed by another of the same stance `gap`
 * seconds later (telegraphs land ≥ 1 s after they show, so the pair stays
 * readable). Entering a stance holds its attacks for at least `open` seconds.
 */
export const BOSS_RAGE = {
  stance: [4, 9],
  below: 0.5,
  speed: 1.15,
  wait: 0.8,
  chain: 0.35,
  gap: 0.55,
  open: 0.8,
} as const

/**
 * Add a legendary by giving it an entry in `ENEMIES`, a place on the schedule
 * (a boss event, a trio in `TRIOS`, `MYTHICALS` or `RIFT_LEGENDS`) and its patterns here.
 * Trio members share their slot's stats, so their patterns stay close to the
 * slot's damage and pace and differ in shape.
 */
export const BOSS_PATTERNS: Partial<Record<EnemyId, readonly BossPattern[]>> = {
  // Wave bosses: a `ranged` and a `close` set each (see `BossStance`).
  onix: [
    { stance: 'ranged', kind: 'strikes', every: 4, target: 'player', count: 3, spread: 50, radius: 12, delay: 1.1, damage: 14, visual: 'rock' },
    { stance: 'close', kind: 'strikes', every: 4.5, target: 'self', count: 1, spread: 0, radius: 36, delay: 1.2, damage: 16, visual: 'slam' },
  ],
  snorlax: [
    { stance: 'close', kind: 'strikes', every: 5, target: 'self', count: 1, spread: 0, radius: 46, delay: 1.3, damage: 22, visual: 'slam' },
    { stance: 'ranged', kind: 'strikes', every: 4.5, target: 'player', count: 1, spread: 0, radius: 26, delay: 1.3, damage: 20, visual: 'slam' },
  ],
  articuno: [
    { stance: 'ranged', kind: 'ring', every: 3.2, count: 12, speed: 72, radius: 5, damage: 18, visual: 'ice' },
    { stance: 'close', kind: 'strikes', every: 4, target: 'self', count: 1, spread: 0, radius: 42, delay: 1.2, damage: 20, visual: 'ice' },
  ],
  zapdos: [
    { stance: 'ranged', kind: 'strikes', every: 2.6, target: 'player', count: 4, spread: 64, radius: 15, delay: 1, damage: 24, visual: 'thunder' },
    { stance: 'close', kind: 'strikes', every: 3.6, target: 'self', count: 1, spread: 0, radius: 44, delay: 1.1, damage: 24, visual: 'thunder' },
  ],
  moltres: [
    { kind: 'trail', every: 0.16, ttl: 3.2, radius: 7, damage: 14, visual: 'fire' },
    { stance: 'ranged', kind: 'ring', every: 4.5, count: 8, speed: 60, radius: 5, damage: 20, visual: 'fire' },
    { stance: 'close', kind: 'strikes', every: 4.2, target: 'self', count: 1, spread: 0, radius: 44, delay: 1.2, damage: 22, visual: 'fire' },
  ],
  // Johto's legendary beasts.
  /** Raikou, the fast one: quick-landing Thunder around the player, static where it dashes. */
  raikou: [
    { stance: 'ranged', kind: 'strikes', every: 3, target: 'player', count: 3, spread: 46, radius: 13, delay: 0.9, damage: 18, visual: 'thunder' },
    { stance: 'close', kind: 'trail', every: 0.22, ttl: 1.6, radius: 6, damage: 10, visual: 'thunder' },
    { stance: 'close', kind: 'strikes', every: 3.8, target: 'self', count: 1, spread: 0, radius: 40, delay: 1.1, damage: 20, visual: 'thunder' },
  ],
  /** Entei, the eruption: fire raining around the player, Flame Charge and a wide burst. */
  entei: [
    { stance: 'ranged', kind: 'strikes', every: 3.4, target: 'player', count: 5, spread: 72, radius: 13, delay: 1.1, damage: 22, visual: 'fire' },
    { stance: 'close', kind: 'trail', every: 0.2, ttl: 2.4, radius: 7, damage: 14, visual: 'fire' },
    { stance: 'close', kind: 'strikes', every: 4.4, target: 'self', count: 1, spread: 0, radius: 50, delay: 1.3, damage: 26, visual: 'fire' },
  ],
  /** Suicune, the tide: dense slow water rings and Hydro Pump from afar, Aurora Beam up close. */
  suicune: [
    { stance: 'ranged', kind: 'ring', every: 3.6, count: 16, speed: 62, radius: 5, damage: 20, visual: 'water' },
    { stance: 'ranged', kind: 'strikes', every: 4.4, target: 'player', count: 2, spread: 44, radius: 18, delay: 1.1, damage: 22, visual: 'water' },
    { stance: 'close', kind: 'ring', every: 3.2, count: 10, speed: 96, radius: 5, damage: 18, visual: 'ice' },
    { stance: 'close', kind: 'strikes', every: 4.2, target: 'self', count: 1, spread: 0, radius: 44, delay: 1.2, damage: 22, visual: 'water' },
  ],
  // Hoenn's Regis: slow golems that fill the ground with telegraphs.
  /** Regirock: Stone Edge falling around the player, Hammer Arm and Ancient Power up close. */
  regirock: [
    { stance: 'ranged', kind: 'strikes', every: 3.4, target: 'player', count: 4, spread: 56, radius: 12, delay: 1.1, damage: 18, visual: 'rock' },
    { stance: 'close', kind: 'strikes', every: 4.2, target: 'self', count: 1, spread: 0, radius: 46, delay: 1.3, damage: 20, visual: 'slam' },
    { stance: 'close', kind: 'ring', every: 3.8, count: 8, speed: 64, radius: 5, damage: 18, visual: 'rock' },
  ],
  /** Regice: Icy Wind rings and a Blizzard on the player, frozen ground where it walks in close. */
  regice: [
    { stance: 'ranged', kind: 'ring', every: 3.4, count: 14, speed: 66, radius: 5, damage: 20, visual: 'ice' },
    { stance: 'ranged', kind: 'strikes', every: 4.2, target: 'player', count: 2, spread: 40, radius: 18, delay: 1.1, damage: 24, visual: 'ice' },
    { stance: 'close', kind: 'trail', every: 0.3, ttl: 2.8, radius: 8, damage: 12, visual: 'ice' },
    { stance: 'close', kind: 'strikes', every: 4, target: 'self', count: 1, spread: 0, radius: 48, delay: 1.3, damage: 24, visual: 'ice' },
  ],
  /** Registeel: a slow wall of Flash Cannon shots, Iron Head drops, and a wide Heavy Slam. */
  registeel: [
    { stance: 'ranged', kind: 'ring', every: 4, count: 18, speed: 56, radius: 5, damage: 20, visual: 'steel' },
    { stance: 'ranged', kind: 'strikes', every: 3.8, target: 'player', count: 4, spread: 70, radius: 15, delay: 1.1, damage: 24, visual: 'steel' },
    { stance: 'close', kind: 'strikes', every: 4.6, target: 'self', count: 1, spread: 0, radius: 56, delay: 1.4, damage: 26, visual: 'slam' },
  ],
  // The finale's rare mythicals: Mew's stats, each with its own signature.
  mew: [
    { stance: 'ranged', kind: 'ring', every: 2.4, count: 8, speed: 90, radius: 5, damage: 22, visual: 'psychic' },
    { stance: 'close', kind: 'strikes', every: 3.5, target: 'self', count: 1, spread: 0, radius: 38, delay: 1.1, damage: 22, visual: 'psychic' },
  ],
  /** Celebi: Leaf Storm rings and Future Sight landing around the player; a burst of leaves up close. */
  celebi: [
    { stance: 'ranged', kind: 'ring', every: 2.6, count: 10, speed: 86, radius: 5, damage: 22, visual: 'grass' },
    { stance: 'ranged', kind: 'strikes', every: 3.6, target: 'player', count: 3, spread: 50, radius: 14, delay: 1.1, damage: 20, visual: 'psychic' },
    { stance: 'close', kind: 'strikes', every: 3.5, target: 'self', count: 1, spread: 0, radius: 40, delay: 1.1, damage: 22, visual: 'grass' },
  ],
  /** Jirachi: Doom Desire, one big star falling on the player, plus steel rings; Psychic up close. */
  jirachi: [
    { stance: 'ranged', kind: 'strikes', every: 3.4, target: 'player', count: 1, spread: 0, radius: 28, delay: 1.5, damage: 30, visual: 'steel' },
    { stance: 'ranged', kind: 'ring', every: 3, count: 8, speed: 84, radius: 5, damage: 20, visual: 'steel' },
    { stance: 'close', kind: 'strikes', every: 3.5, target: 'self', count: 1, spread: 0, radius: 38, delay: 1.1, damage: 22, visual: 'psychic' },
  ],
  mewtwo: [
    { kind: 'ring', every: 3, count: 16, speed: 80, radius: 5, damage: 26, visual: 'psychic' },
    { stance: 'ranged', kind: 'strikes', every: 4.5, target: 'player', count: 5, spread: 80, radius: 18, delay: 1.1, damage: 30, visual: 'psychic' },
    { stance: 'close', kind: 'strikes', every: 4.5, target: 'self', count: 1, spread: 0, radius: 52, delay: 1.2, damage: 30, visual: 'psychic' },
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
  /** Latias: Mist Ball rings, a lingering mist where she glides, and Dragon Pulse on the player. */
  latias: [
    { kind: 'ring', every: 3, count: 12, speed: 80, radius: 5, damage: 20, visual: 'psychic' },
    { kind: 'trail', every: 0.24, ttl: 2.6, radius: 7, damage: 14, visual: 'psychic' },
    { kind: 'strikes', every: 3.8, target: 'player', count: 3, spread: 50, radius: 16, delay: 1, damage: 22, visual: 'dragon' },
  ],
  /** Latios: Luster Purge, one wide blast on the player, fast dragon rings and a Dragon Dance slam. */
  latios: [
    { kind: 'strikes', every: 3, target: 'player', count: 1, spread: 0, radius: 26, delay: 1.1, damage: 26, visual: 'psychic' },
    { kind: 'ring', every: 3.4, count: 14, speed: 96, radius: 5, damage: 20, visual: 'dragon' },
    { kind: 'strikes', every: 6, target: 'self', count: 1, spread: 0, radius: 52, delay: 1.3, damage: 24, visual: 'dragon' },
  ],
  /** Deoxys: Psycho Boost bursts, a meteor shower on the player and Cosmic Power around itself. */
  deoxys: [
    { kind: 'ring', every: 3.2, count: 20, speed: 100, radius: 5, damage: 22, visual: 'psychic' },
    { kind: 'strikes', every: 3.6, target: 'player', count: 6, spread: 90, radius: 13, delay: 1.2, damage: 22, visual: 'rock' },
    { kind: 'strikes', every: 6, target: 'self', count: 1, spread: 0, radius: 56, delay: 1.3, damage: 26, visual: 'psychic' },
  ],
  /** The reaper's Judgment: a storm of light on the player and wide rings. */
  arceus: [
    { kind: 'strikes', every: 3, target: 'player', count: 7, spread: 100, radius: 16, delay: 1, damage: 45, visual: 'judgment' },
    { kind: 'ring', every: 4.5, count: 24, speed: 80, radius: 5, damage: 40, visual: 'judgment' },
  ],
}
