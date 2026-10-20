import type { Difficulty } from '../game/difficulty'
import { DOMAIN_PHASES, type RetinueRole } from './domains'
import type { EnemyId } from './enemies'

/** How an enemy hazard looks (and sounds when it lands). */
export type HazardVisual =
  | 'rock' | 'slam' | 'thunder' | 'ice' | 'fire' | 'psychic' | 'water' | 'dragon' | 'steel' | 'aero' | 'grass' | 'shadow' | 'judgment'
  /** Toxic Spikes and the like, thrown by the world (`game/hazards.ts`). */
  | 'poison'
  /** The horde's spit shots (`game/spitters.ts`), one look per flavor; `sludge` also names its puddle. */
  | SpitVisual
  /** The Eon duo's colors: Latias's red Mist Ball, Latios's blue Luster Purge (both Psychic). */
  | 'mist' | 'luster'

export type SpitVisual = 'fireball' | 'bubble' | 'sludge' | 'spark' | 'seed' | 'orb'

/**
 * A wave boss fights in two stances it swaps every few seconds (`BOSS_RAGE.stance`):
 * `close` rushes the player with attacks around itself, `ranged` hangs back
 * (`STANCES`) and aims at the player from afar.
 */
export type BossStance = 'close' | 'ranged'

/**
 * When a wave boss's pattern may fire. `stance`: only in that stance (and it
 * only counts down there). `below`: only once the boss is under that share of
 * its HP (the enrage's unlock, a later phase). `from`: only from that
 * difficulty up. `far`: only while the player stands at least that far (px),
 * so keeping away is punished too; it waits, ready, until they do. Rift
 * legendaries and Arceus don't fight in stances and use none of them.
 */
export type PatternGate = { stance?: BossStance; below?: number; from?: Difficulty; far?: number }

/**
 * Boss attack patterns. Each one fires every `every` seconds while the boss is
 * near the player. Damage is contact damage dealt to the player.
 */
export type BossPattern = PatternGate &
  (
    /**
     * Telegraphed circles that land after `delay` seconds, around the player or the boss itself.
     * `lead` (player only) lays them along the player's path instead of scattering them: the
     * first where they stand, the last where they'd be at `lead` × `delay` if they kept going
     * (times the difficulty's `aim`); a single led circle lands at that end.
     * `leap` (one circle on the player): the boss lands there itself as it hits.
     */
    | { kind: 'strikes'; every: number; target: 'player' | 'self'; count: number; spread: number; radius: number; delay: number; damage: number; visual: HazardVisual; lead?: number; leap?: true }
    /** A ring of projectiles fired outward from the boss. */
    | { kind: 'ring'; every: number; count: number; speed: number; radius: number; damage: number; visual: HazardVisual }
    /** Lingering zones dropped at the boss's feet as it moves. */
    | { kind: 'trail'; every: number; ttl: number; radius: number; damage: number; visual: HazardVisual }
    /**
     * A fan of `count` projectiles across `arc` radians, aimed where the player
     * stands: they hover by the boss for `windup` seconds, aim lines showing, then fly.
     */
    | { kind: 'volley'; every: number; count: number; arc: number; speed: number; windup: number; radius: number; damage: number; visual: HazardVisual }
    /**
     * Beams (Hydro Pump, Aeroblast, Origin Pulse's lances): `count` lines `width`
     * px wide and `length` long, shown as blinking telegraphs for `windup` s, then
     * burning for `duration` s. `source: 'boss'`: out of the boss, `spread` rad
     * apart around the aim at the player, each sweeping `sweep` rad across its
     * burn (0 or absent: static; a static one stops at the first cover in its way
     * when `blocked`). `source: 'edge'`: parallel lances from past the screen's
     * edge at a random angle, `spread` px apart, the middle one through the
     * player; the gaps between them are the safe lanes. `source: 'lattice'`: two
     * such sets at right angles (the second in `cross`'s look), crossing on the
     * player; the pockets where their gaps meet are the safe spots.
     */
    | { kind: 'beam'; every: number; source: 'boss' | 'edge' | 'lattice'; count: number; spread: number; sweep?: number; windup: number; duration: number; width: number; length: number; damage: number; visual: HazardVisual; blocked?: true; cross?: HazardVisual }
    /** Adds: `count` of `enemies` (taken in turn) come out `radius` px around the boss, while fewer than `max` of them stand; `role` as in a domain's retinue. */
    | { kind: 'summon'; every: number; enemies: readonly EnemyId[]; count: number; max: number; radius: number; role?: RetinueRole }
    /** A charge: the boss marks a lane through the player for `windup` s, then rushes down it at `speed` px/s, `count` times in a row, hurting on contact. */
    | { kind: 'dash'; every: number; windup: number; speed: number; width: number; damage: number; count: number }
    /** The boss goes under (untouchable) for `hide` s while its wake follows the player, then the wake stops and it bursts out there `windup` s later. */
    | { kind: 'dive'; every: number; hide: number; windup: number; radius: number; damage: number; visual: HazardVisual }
    /** The boss vanishes and lands `windup` s later on the spot it marked: on the player, or as far from them as its arena allows, striking around itself. */
    | { kind: 'teleport'; every: number; to: 'player' | 'far'; windup: number; radius: number; damage: number; visual: HazardVisual }
    /**
     * A blast over everything after `windup` s (the screen dims and the safe
     * spots glow) that only spares those in a `safe` spot (`BlastSafe`).
     */
    | { kind: 'blast'; every: number; windup: number; damage: number; safe: BlastSafe; radius?: number; visual: HazardVisual }
    /**
     * Phantoms (see-through copies of the boss, Double Team, Latias's mirages)
     * streak along lanes through where the player stands: `count` of them, `gap`
     * s apart, each lane marked `windup` s before it rushes at `speed` px/s. They
     * start at the boss (`origin: 'boss'`) or on a ring `radius` px around the player.
     */
    | { kind: 'swoop'; every: number; origin: 'boss' | 'ring'; count: number; gap: number; windup: number; speed: number; width: number; radius: number; damage: number; visual: HazardVisual }
    /**
     * A barrier (Deoxys's Defense Forme): `count` of `enemies` (taken in turn)
     * stand on posts `radius` px around the boss's home with `hp` times their HP,
     * linked to it; while one stands the boss takes no damage. Raised again
     * `every` s after the last one breaks.
     */
    | { kind: 'guard'; every: number; enemies: readonly EnemyId[]; count: number; radius: number; hp: number }
  )

/**
 * What a blast spares: `cover`, a player with scenery between them and the
 * boss; `dry`, one out of flood water (an island); `near`/`far`, within or
 * beyond its `radius` of the boss.
 */
export type BlastSafe = 'cover' | 'dry' | 'near' | 'far'

/**
 * How a boss with phases walks (`BossPhase.steer`): `chase` at the player (the
 * default), `hold` about `range` px away, `anchor` near its home (where it
 * appeared) plus (x, y), wandering `drift` px, `orbit` its home at
 * `radius`, or `mirror` its linked partner across its home (in tandem, Latios
 * opposite Latias; circling at `radius` while the partner is out); a circling
 * one with `keep` veers off a player closer than that (px), so hugging it doesn't
 * pay. `pace` multiplies its speed.
 */
export type BossSteer =
  | { kind: 'chase'; pace?: number }
  | { kind: 'hold'; range: number; pace?: number }
  | { kind: 'anchor'; x: number; y: number; drift: number; pace?: number }
  | { kind: 'orbit'; radius: number; pace?: number; keep?: number }
  | { kind: 'mirror'; radius: number; pace?: number; keep?: number }

/** A step of an ultimate: `pattern` fires `at` seconds after the ultimate begins. */
export type UltimateStep = { at: number; pattern: BossPattern }

/**
 * A phase's signature attack (Origin Pulse, Precipice Blades): first `first` s
 * into the phase, then every `every` s. Its name (`move`, the official English
 * name) is announced as it begins, its steps fire in turn, and the phase's
 * other patterns hold until the last step's warning has landed.
 */
export type BossUltimate = { move: string; first: number; every: number; steps: readonly UltimateStep[] }

/**
 * A boss with phases (`BOSS_PHASES`) fights with the patterns of the phase its
 * HP is in: a phase starts once it drops under `below` of its HP (the first
 * one's is 1). As one begins the boss roars and holds still, untouchable, for
 * `shift` s (`PHASE_SHIFT` when absent); `form` swaps its sprite (a form key of
 * its species in the sprite manifest, e.g. `primal`); `steer` says how it moves;
 * `taken` scales the damage it takes.
 * The HUD ticks the thresholds on its HP bar.
 */
export type BossPhase = {
  below: number
  patterns: readonly BossPattern[]
  ultimate?: BossUltimate
  steer?: BossSteer
  form?: string
  shift?: number
  /** Multiplies the damage it takes in this phase (Deoxys's frail Attack Forme). */
  taken?: number
}

/** Seconds a boss holds still and untouchable as a new phase begins. */
export const PHASE_SHIFT = 1.8

/**
 * Bosses that fight in phases, each with its own patterns, ultimate and look:
 * the rift legendaries with a domain (`data/domains.ts`), and any wave boss
 * given phases here.
 */
export const BOSS_PHASES: Partial<Record<EnemyId, readonly BossPhase[]>> = {
  ...DOMAIN_PHASES,
}

/** How each stance walks: a pace multiplier, and how close `ranged` comes before it stops walking in (px). */
export const STANCES = {
  close: { pace: 1.3, hold: 0 },
  ranged: { pace: 0.7, hold: 80 },
} as const satisfies Record<BossStance, { pace: number; hold: number }>

/**
 * Wave bosses (the ones on the `EVENTS` schedule) swap stance every `stance`
 * seconds (a seeded roll in that range) and enrage under `below` of their HP:
 * `speed` times faster, `wait` times the pause between attacks, and a `chain`
 * chance (Normal's; `BOSS_DIFFICULTY` has each level's) that an attack is
 * followed by another of the same stance `gap` seconds later (telegraphs land
 * ≥ `MIN_TELEGRAPH` after they show, so the pair stays readable). Entering a
 * stance holds its attacks for at least `open` seconds. Patterns gated
 * `below: 0.5` are what the enrage unlocks.
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

/** The shortest a wave boss's warning (a strike's delay, a volley's windup) gets on any difficulty, in seconds. */
export const MIN_TELEGRAPH = 0.8

/**
 * How each difficulty presses the wave bosses (rift legendaries and Arceus keep
 * their patterns as written): `pace` times the pause between attacks, `more`
 * times the projectiles and circles of a pattern that fires several, `telegraph`
 * times its warning (never under `MIN_TELEGRAPH`), `aim` times how far ahead
 * on the player's path a `lead` pattern lands, and the enrage's `chain`
 * chance. Patterns gated `from` add the rest: one more attack per boss on
 * Nightmare, Mewtwo's second phase from Hard. HP stays out of it, so a harder
 * boss hits more often instead of lasting longer.
 */
export const BOSS_DIFFICULTY = {
  normal: { pace: 1, more: 1, telegraph: 1, aim: 0.75, chain: BOSS_RAGE.chain },
  hard: { pace: 0.92, more: 1.15, telegraph: 0.95, aim: 0.85, chain: 0.5 },
  nightmare: { pace: 0.84, more: 1.25, telegraph: 0.9, aim: 1, chain: 0.65 },
} as const satisfies Record<Difficulty, { pace: number; more: number; telegraph: number; aim: number; chain: number }>

/**
 * Add a legendary by giving it an entry in `ENEMIES`, a place on the schedule
 * (a boss event, a trio in `TRIOS`, `MYTHICALS` or `RIFT_LEGENDS`) and its patterns here.
 * Trio members share their slot's stats, so their patterns stay close to the
 * slot's damage and pace and differ in shape.
 *
 * Every wave boss has a `ranged` and a `close` set, something aimed where the
 * player stands or is heading (standing still doesn't work), something for a
 * player who keeps away (`far`), an attack its enrage unlocks (`below: 0.5`) and
 * one more on Nightmare (`from: 'nightmare'`).
 */
export const BOSS_PATTERNS: Partial<Record<EnemyId, readonly BossPattern[]>> = {
  /** Onix: Rock Throw along your path, a slam up close, Dig under you from afar, Rock Tomb rings once enraged. */
  onix: [
    { stance: 'ranged', kind: 'strikes', every: 4, target: 'player', count: 3, spread: 50, radius: 12, delay: 1.1, damage: 14, visual: 'rock', lead: 1 },
    { stance: 'close', kind: 'strikes', every: 4.5, target: 'self', count: 1, spread: 0, radius: 36, delay: 1.2, damage: 16, visual: 'slam' },
    { far: 110, kind: 'strikes', every: 7, target: 'player', count: 1, spread: 0, radius: 26, delay: 1.3, damage: 16, visual: 'slam', lead: 1, leap: true },
    { below: 0.5, kind: 'ring', every: 4.5, count: 8, speed: 64, radius: 5, damage: 12, visual: 'rock' },
    { from: 'nightmare', stance: 'ranged', kind: 'volley', every: 5, count: 3, arc: 0.5, speed: 110, windup: 0.9, radius: 5, damage: 14, visual: 'rock' },
  ],
  /** Snorlax: Body Slam on you, a slam up close, Heavy Slam from afar, Rollout along your path once enraged. */
  snorlax: [
    { stance: 'close', kind: 'strikes', every: 5, target: 'self', count: 1, spread: 0, radius: 46, delay: 1.3, damage: 22, visual: 'slam' },
    { stance: 'ranged', kind: 'strikes', every: 4.5, target: 'player', count: 1, spread: 0, radius: 26, delay: 1.3, damage: 20, visual: 'slam' },
    { far: 110, kind: 'strikes', every: 7.5, target: 'player', count: 1, spread: 0, radius: 32, delay: 1.4, damage: 22, visual: 'slam', lead: 1, leap: true },
    { below: 0.5, stance: 'ranged', kind: 'strikes', every: 4, target: 'player', count: 4, spread: 0, radius: 15, delay: 1.2, damage: 18, visual: 'slam', lead: 1 },
    { from: 'nightmare', stance: 'close', kind: 'ring', every: 4.4, count: 10, speed: 70, radius: 5, damage: 16, visual: 'rock' },
  ],
  // The Kanto birds dive onto a player who keeps away (Fly, Drill Peck, Sky Attack).
  articuno: [
    { stance: 'ranged', kind: 'ring', every: 3.2, count: 12, speed: 72, radius: 5, damage: 18, visual: 'ice' },
    { stance: 'ranged', kind: 'strikes', every: 4, target: 'player', count: 3, spread: 0, radius: 13, delay: 1.1, damage: 18, visual: 'ice', lead: 1 },
    { stance: 'close', kind: 'strikes', every: 4, target: 'self', count: 1, spread: 0, radius: 42, delay: 1.2, damage: 20, visual: 'ice' },
    { far: 120, kind: 'strikes', every: 7, target: 'player', count: 1, spread: 0, radius: 28, delay: 1.3, damage: 20, visual: 'aero', lead: 1, leap: true },
    { below: 0.5, kind: 'volley', every: 4, count: 5, arc: 0.8, speed: 100, windup: 0.9, radius: 5, damage: 18, visual: 'ice' },
    { from: 'nightmare', stance: 'close', kind: 'trail', every: 0.25, ttl: 2.4, radius: 7, damage: 12, visual: 'ice' },
  ],
  zapdos: [
    { stance: 'ranged', kind: 'strikes', every: 2.6, target: 'player', count: 4, spread: 64, radius: 15, delay: 1, damage: 24, visual: 'thunder', lead: 1 },
    { stance: 'close', kind: 'strikes', every: 3.6, target: 'self', count: 1, spread: 0, radius: 44, delay: 1.1, damage: 24, visual: 'thunder' },
    { far: 120, kind: 'strikes', every: 6.5, target: 'player', count: 1, spread: 0, radius: 26, delay: 1.2, damage: 22, visual: 'thunder', lead: 1, leap: true },
    { below: 0.5, kind: 'ring', every: 4, count: 12, speed: 90, radius: 5, damage: 20, visual: 'aero' },
    { from: 'nightmare', stance: 'ranged', kind: 'volley', every: 4.4, count: 4, arc: 0.6, speed: 130, windup: 0.9, radius: 5, damage: 20, visual: 'aero' },
  ],
  moltres: [
    { kind: 'trail', every: 0.16, ttl: 3.2, radius: 7, damage: 14, visual: 'fire' },
    { stance: 'ranged', kind: 'ring', every: 4.5, count: 8, speed: 60, radius: 5, damage: 20, visual: 'fire' },
    { stance: 'ranged', kind: 'strikes', every: 3.8, target: 'player', count: 3, spread: 0, radius: 13, delay: 1.1, damage: 20, visual: 'fire', lead: 1 },
    { stance: 'close', kind: 'strikes', every: 4.2, target: 'self', count: 1, spread: 0, radius: 44, delay: 1.2, damage: 22, visual: 'fire' },
    { far: 120, kind: 'strikes', every: 6.5, target: 'player', count: 1, spread: 0, radius: 30, delay: 1.3, damage: 24, visual: 'fire', lead: 1, leap: true },
    { below: 0.5, kind: 'volley', every: 4, count: 7, arc: 1.2, speed: 100, windup: 0.9, radius: 5, damage: 20, visual: 'fire' },
    { from: 'nightmare', stance: 'close', kind: 'strikes', every: 4.6, target: 'self', count: 3, spread: 70, radius: 20, delay: 1.2, damage: 22, visual: 'fire' },
  ],
  // Johto's legendary beasts: they bound onto a player who keeps away.
  /** Raikou, the fast one: quick-landing Thunder along your path, static where it dashes, Extreme Speed from afar. */
  raikou: [
    { stance: 'ranged', kind: 'strikes', every: 3, target: 'player', count: 3, spread: 46, radius: 13, delay: 0.9, damage: 18, visual: 'thunder', lead: 1 },
    { stance: 'close', kind: 'trail', every: 0.22, ttl: 1.6, radius: 6, damage: 10, visual: 'thunder' },
    { stance: 'close', kind: 'strikes', every: 3.8, target: 'self', count: 1, spread: 0, radius: 40, delay: 1.1, damage: 20, visual: 'thunder' },
    { far: 120, kind: 'strikes', every: 6.5, target: 'player', count: 1, spread: 0, radius: 26, delay: 1.1, damage: 20, visual: 'thunder', lead: 1, leap: true },
    { below: 0.5, stance: 'ranged', kind: 'strikes', every: 3.2, target: 'player', count: 5, spread: 70, radius: 12, delay: 1, damage: 16, visual: 'thunder' },
    { from: 'nightmare', kind: 'ring', every: 4.4, count: 10, speed: 90, radius: 5, damage: 16, visual: 'aero' },
  ],
  /** Entei, the eruption: fire raining along your path, Flame Charge, a wide burst, and Eruption volleys once enraged. */
  entei: [
    { stance: 'ranged', kind: 'strikes', every: 3.4, target: 'player', count: 5, spread: 72, radius: 13, delay: 1.1, damage: 22, visual: 'fire', lead: 1 },
    { stance: 'close', kind: 'trail', every: 0.2, ttl: 2.4, radius: 7, damage: 14, visual: 'fire' },
    { stance: 'close', kind: 'strikes', every: 4.4, target: 'self', count: 1, spread: 0, radius: 50, delay: 1.3, damage: 26, visual: 'fire' },
    { far: 120, kind: 'strikes', every: 6.5, target: 'player', count: 1, spread: 0, radius: 30, delay: 1.3, damage: 24, visual: 'fire', lead: 1, leap: true },
    { below: 0.5, kind: 'volley', every: 4, count: 5, arc: 1, speed: 100, windup: 1, radius: 5, damage: 20, visual: 'fire' },
    { from: 'nightmare', stance: 'close', kind: 'ring', every: 4.4, count: 10, speed: 70, radius: 5, damage: 20, visual: 'fire' },
  ],
  /** Suicune, the tide: dense slow water rings and Hydro Pump from afar, Aurora Beam up close, Surf onto you. */
  suicune: [
    { stance: 'ranged', kind: 'ring', every: 3.6, count: 16, speed: 62, radius: 5, damage: 20, visual: 'water' },
    { stance: 'ranged', kind: 'strikes', every: 4.4, target: 'player', count: 2, spread: 44, radius: 18, delay: 1.1, damage: 22, visual: 'water', lead: 1 },
    { stance: 'close', kind: 'ring', every: 3.2, count: 10, speed: 96, radius: 5, damage: 18, visual: 'ice' },
    { stance: 'close', kind: 'strikes', every: 4.2, target: 'self', count: 1, spread: 0, radius: 44, delay: 1.2, damage: 22, visual: 'water' },
    { far: 120, kind: 'strikes', every: 6.5, target: 'player', count: 1, spread: 0, radius: 30, delay: 1.3, damage: 24, visual: 'water', lead: 1, leap: true },
    { below: 0.5, kind: 'volley', every: 3.8, count: 3, arc: 0.25, speed: 140, windup: 1, radius: 5, damage: 22, visual: 'water' },
    { from: 'nightmare', stance: 'close', kind: 'trail', every: 0.25, ttl: 2.4, radius: 7, damage: 14, visual: 'water' },
  ],
  // Hoenn's Regis: slow golems that fill the ground with telegraphs and shoot a player who keeps away.
  /** Regirock: Stone Edge falling around the player, Hammer Arm and Ancient Power up close, Rock Tomb from afar. */
  regirock: [
    { stance: 'ranged', kind: 'strikes', every: 3.4, target: 'player', count: 4, spread: 56, radius: 12, delay: 1.1, damage: 18, visual: 'rock' },
    { stance: 'close', kind: 'strikes', every: 4.2, target: 'self', count: 1, spread: 0, radius: 46, delay: 1.3, damage: 20, visual: 'slam' },
    { stance: 'close', kind: 'ring', every: 3.8, count: 8, speed: 64, radius: 5, damage: 18, visual: 'rock' },
    { far: 120, kind: 'volley', every: 5, count: 3, arc: 0.4, speed: 120, windup: 1, radius: 5, damage: 18, visual: 'rock' },
    { below: 0.5, stance: 'ranged', kind: 'strikes', every: 3.6, target: 'player', count: 3, spread: 0, radius: 14, delay: 1.1, damage: 18, visual: 'rock', lead: 1 },
    { from: 'nightmare', stance: 'close', kind: 'strikes', every: 4.6, target: 'self', count: 3, spread: 60, radius: 18, delay: 1.2, damage: 20, visual: 'slam' },
  ],
  /** Regice: Icy Wind rings and a Blizzard along your path, frozen ground where it walks in close, Ice Beam from afar. */
  regice: [
    { stance: 'ranged', kind: 'ring', every: 3.4, count: 14, speed: 66, radius: 5, damage: 20, visual: 'ice' },
    { stance: 'ranged', kind: 'strikes', every: 4.2, target: 'player', count: 2, spread: 40, radius: 18, delay: 1.1, damage: 24, visual: 'ice', lead: 1 },
    { stance: 'close', kind: 'trail', every: 0.3, ttl: 2.8, radius: 8, damage: 12, visual: 'ice' },
    { stance: 'close', kind: 'strikes', every: 4, target: 'self', count: 1, spread: 0, radius: 48, delay: 1.3, damage: 24, visual: 'ice' },
    { far: 120, kind: 'volley', every: 5, count: 3, arc: 0.3, speed: 130, windup: 1, radius: 5, damage: 22, visual: 'ice' },
    { below: 0.5, stance: 'ranged', kind: 'strikes', every: 3.6, target: 'player', count: 4, spread: 0, radius: 14, delay: 1.1, damage: 20, visual: 'ice', lead: 1 },
    { from: 'nightmare', stance: 'close', kind: 'ring', every: 4, count: 10, speed: 90, radius: 5, damage: 18, visual: 'ice' },
  ],
  /** Registeel: a slow wall of Flash Cannon shots, Iron Head drops, a wide Heavy Slam, and Flash Cannon volleys from afar. */
  registeel: [
    { stance: 'ranged', kind: 'ring', every: 4, count: 18, speed: 56, radius: 5, damage: 20, visual: 'steel' },
    { stance: 'ranged', kind: 'strikes', every: 3.8, target: 'player', count: 4, spread: 70, radius: 15, delay: 1.1, damage: 24, visual: 'steel' },
    { stance: 'close', kind: 'strikes', every: 4.6, target: 'self', count: 1, spread: 0, radius: 56, delay: 1.4, damage: 26, visual: 'slam' },
    { far: 120, kind: 'volley', every: 5, count: 3, arc: 0.35, speed: 120, windup: 1, radius: 5, damage: 24, visual: 'steel' },
    { below: 0.5, stance: 'ranged', kind: 'strikes', every: 3.6, target: 'player', count: 4, spread: 0, radius: 15, delay: 1.1, damage: 22, visual: 'steel', lead: 1 },
    { from: 'nightmare', stance: 'close', kind: 'ring', every: 4.2, count: 12, speed: 60, radius: 5, damage: 20, visual: 'steel' },
  ],
  // The finale's rare mythicals: Mew's stats, each with its own signature, all teleporting onto a player who keeps away.
  mew: [
    { stance: 'ranged', kind: 'ring', every: 2.4, count: 8, speed: 90, radius: 5, damage: 22, visual: 'psychic' },
    { stance: 'ranged', kind: 'strikes', every: 3.6, target: 'player', count: 3, spread: 0, radius: 13, delay: 1.1, damage: 20, visual: 'psychic', lead: 1 },
    { stance: 'close', kind: 'strikes', every: 3.5, target: 'self', count: 1, spread: 0, radius: 38, delay: 1.1, damage: 22, visual: 'psychic' },
    { far: 120, kind: 'strikes', every: 6, target: 'player', count: 1, spread: 0, radius: 26, delay: 1.2, damage: 22, visual: 'psychic', lead: 1, leap: true },
    { below: 0.5, kind: 'volley', every: 3.6, count: 5, arc: 0.9, speed: 110, windup: 0.9, radius: 5, damage: 20, visual: 'psychic' },
    { from: 'nightmare', stance: 'close', kind: 'ring', every: 4, count: 10, speed: 80, radius: 5, damage: 20, visual: 'psychic' },
  ],
  /** Celebi: Leaf Storm rings and Future Sight along your path; a burst of leaves up close. */
  celebi: [
    { stance: 'ranged', kind: 'ring', every: 2.6, count: 10, speed: 86, radius: 5, damage: 22, visual: 'grass' },
    { stance: 'ranged', kind: 'strikes', every: 3.6, target: 'player', count: 3, spread: 50, radius: 14, delay: 1.1, damage: 20, visual: 'psychic', lead: 1 },
    { stance: 'close', kind: 'strikes', every: 3.5, target: 'self', count: 1, spread: 0, radius: 40, delay: 1.1, damage: 22, visual: 'grass' },
    { far: 120, kind: 'strikes', every: 6, target: 'player', count: 1, spread: 0, radius: 26, delay: 1.2, damage: 22, visual: 'grass', lead: 1, leap: true },
    { below: 0.5, kind: 'volley', every: 3.6, count: 5, arc: 1, speed: 105, windup: 0.9, radius: 5, damage: 20, visual: 'grass' },
    { from: 'nightmare', stance: 'close', kind: 'trail', every: 0.25, ttl: 2.4, radius: 7, damage: 14, visual: 'grass' },
  ],
  /** Jirachi: Doom Desire, one big star falling on the player, plus steel rings; Psychic up close, Meteor Mash once enraged. */
  jirachi: [
    { stance: 'ranged', kind: 'strikes', every: 3.4, target: 'player', count: 1, spread: 0, radius: 28, delay: 1.5, damage: 30, visual: 'steel' },
    { stance: 'ranged', kind: 'ring', every: 3, count: 8, speed: 84, radius: 5, damage: 20, visual: 'steel' },
    { stance: 'close', kind: 'strikes', every: 3.5, target: 'self', count: 1, spread: 0, radius: 38, delay: 1.1, damage: 22, visual: 'psychic' },
    { far: 120, kind: 'strikes', every: 6, target: 'player', count: 1, spread: 0, radius: 26, delay: 1.2, damage: 22, visual: 'steel', lead: 1, leap: true },
    { below: 0.5, stance: 'ranged', kind: 'strikes', every: 3.6, target: 'player', count: 4, spread: 0, radius: 14, delay: 1.1, damage: 20, visual: 'steel', lead: 1 },
    { from: 'nightmare', stance: 'ranged', kind: 'volley', every: 4.2, count: 4, arc: 0.7, speed: 115, windup: 0.9, radius: 5, damage: 20, visual: 'steel' },
  ],
  /**
   * Mewtwo: psychic rings, Future Sight along your path, a slam up close and Teleport onto a player
   * who keeps away; Psystrike volleys once enraged. From Hard, a second phase under 40%: it
   * teleports onto you every few seconds between wide Psystrike volleys (on Nightmare, slow rings too).
   */
  mewtwo: [
    { kind: 'ring', every: 3, count: 16, speed: 80, radius: 5, damage: 26, visual: 'psychic' },
    { stance: 'ranged', kind: 'strikes', every: 4.5, target: 'player', count: 5, spread: 80, radius: 18, delay: 1.1, damage: 30, visual: 'psychic', lead: 1 },
    { stance: 'close', kind: 'strikes', every: 4.5, target: 'self', count: 1, spread: 0, radius: 52, delay: 1.2, damage: 30, visual: 'psychic' },
    { far: 130, kind: 'strikes', every: 6, target: 'player', count: 1, spread: 0, radius: 30, delay: 1.2, damage: 28, visual: 'psychic', lead: 1, leap: true },
    { below: 0.5, kind: 'volley', every: 4, count: 3, arc: 0.5, speed: 120, windup: 1, radius: 5, damage: 26, visual: 'psychic' },
    { below: 0.4, from: 'hard', kind: 'strikes', every: 3.8, target: 'player', count: 1, spread: 0, radius: 28, delay: 1.1, damage: 28, visual: 'psychic', lead: 1, leap: true },
    { below: 0.4, from: 'hard', kind: 'volley', every: 2.6, count: 5, arc: 0.9, speed: 130, windup: 0.9, radius: 5, damage: 26, visual: 'psychic' },
    { below: 0.4, from: 'nightmare', kind: 'ring', every: 4.5, count: 12, speed: 52, radius: 5, damage: 24, visual: 'psychic' },
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
  /** Spiritomb, the graveyard's boss (`data/places.ts`): Shadow Ball rings, Hex on the player and Dark Pulse around itself. */
  spiritomb: [
    { kind: 'ring', every: 3.4, count: 10, speed: 68, radius: 5, damage: 16, visual: 'shadow' },
    { kind: 'strikes', every: 4, target: 'player', count: 3, spread: 46, radius: 14, delay: 1.1, damage: 18, visual: 'shadow' },
    { kind: 'strikes', every: 6, target: 'self', count: 1, spread: 0, radius: 46, delay: 1.3, damage: 20, visual: 'shadow' },
  ],
  /** The reaper's Judgment: a storm of light on the player and wide rings. */
  arceus: [
    { kind: 'strikes', every: 3, target: 'player', count: 7, spread: 100, radius: 16, delay: 1, damage: 45, visual: 'judgment' },
    { kind: 'ring', every: 4.5, count: 24, speed: 80, radius: 5, damage: 40, visual: 'judgment' },
  ],
}
