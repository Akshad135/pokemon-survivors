import type { HazardVisual, SpitVisual } from '../data/bosses'
import { TRAITS } from '../data/traits'
import type { PokeType } from '../data/types'
import type { Difficulty } from './difficulty'
import { createTraitState } from './traits'
import type { Enemy, Game, Hazard } from './types'

/**
 * Spitters: the horde's ranged role. From `SPITTERS[difficulty].from` on, a
 * share of the regular spawns are the stage's spitter species (drawn with the
 * roster, `Roster.spitters`): it walks in, holds a band of distance, glows for
 * a moment and spits slow shots at where the player stands. Shots are boss
 * hazards (`kind: 'shot'`), so the aura that kills bodies doesn't stop them:
 * walking aside does. Tuning shared by every difficulty is `TRAITS.spitter`;
 * the per-tick runtime lives in `traitSystem.ts`.
 */

/** How one flavor of spit looks and flies. Times in seconds, speeds in px/s. */
export type SpitFlavor = {
  visual: SpitVisual
  speed: number
  /** The telegraph: how long the spitter glows before it fires. */
  charge: number
  /** Shots per volley at least (the difficulty's `volley` may add more), fanned `spread` rad apart. */
  count: number
  spread: number
  /** Hit radius of each shot. */
  radius: number
  /** Damage multiplier on top of the shot damage. */
  damage: number
  /** A puddle left where the shot lands (it's lobbed at the spot the player stood on): radius, seconds, share of the shot damage. */
  puddle?: { radius: number; ttl: number; damage: number }
}

/** One flavor per primary type, plus the fallback `orb`. Every shot is slower than the player (68 px/s base) can sidestep from range. */
export const SPIT_FLAVORS = {
  fire: { visual: 'fireball', speed: 85, charge: 0.45, count: 1, spread: 0.2, radius: 4, damage: 1.15 },
  water: { visual: 'bubble', speed: 72, charge: 0.45, count: 1, spread: 0.2, radius: 5, damage: 1 },
  poison: { visual: 'sludge', speed: 70, charge: 0.5, count: 1, spread: 0.2, radius: 4, damage: 0.8, puddle: { radius: 11, ttl: 2.6, damage: 0.5 } },
  /** A thin bolt: faster, so it glows longer first. */
  electric: { visual: 'spark', speed: 120, charge: 0.75, count: 1, spread: 0.16, radius: 3, damage: 1 },
  /** A spread of seeds: three at once, each weaker. */
  grass: { visual: 'seed', speed: 80, charge: 0.45, count: 3, spread: 0.32, radius: 3, damage: 0.7 },
  orb: { visual: 'orb', speed: 80, charge: 0.45, count: 1, spread: 0.2, radius: 4, damage: 1 },
} as const satisfies Record<string, SpitFlavor>

export type SpitFlavorId = keyof typeof SPIT_FLAVORS

/** Which flavor a primary type spits; types left out spit the `orb`. */
const FLAVOR_OF: Partial<Record<PokeType, SpitFlavorId>> = {
  fire: 'fire',
  water: 'water',
  poison: 'poison',
  electric: 'electric',
  grass: 'grass',
  bug: 'grass',
}

/** A species' spit flavor, by its primary type. */
export const flavorOf = (types: readonly PokeType[]): SpitFlavor => SPIT_FLAVORS[FLAVOR_OF[types[0] ?? 'normal'] ?? 'orb']

/** Whether a primary type has its own flavor (the roster leans its spitter draw towards those). */
export const hasFlavor = (types: readonly PokeType[]) => FLAVOR_OF[types[0] ?? 'normal'] !== undefined

/**
 * Per difficulty: from what run time (s) spitters spawn, the `share` of regular
 * spawns they take, how many may be alive, seconds between volleys (±15%),
 * the shot damage multiplier and the volley size range (shots fanned per
 * volley; a flavor's own `count` is the floor).
 */
export const SPITTERS = {
  normal: { from: 180, share: 0.06, alive: 4, every: 5, damage: 0.8, volley: [1, 1] },
  hard: { from: 150, share: 0.09, alive: 7, every: 3.8, damage: 1.15, volley: [1, 2] },
  nightmare: { from: 120, share: 0.13, alive: 10, every: 2.6, damage: 1.15, volley: [2, 3] },
} as const satisfies Record<Difficulty, { from: number; share: number; alive: number; every: number; damage: number; volley: readonly [number, number] }>

/** The earliest any difficulty sends spitters: the roster draws a spitter for every stage from the one playing then. */
export const SPIT_FROM = Math.min(...Object.values(SPITTERS).map((s) => s.from))

const SPIT_VISUALS: ReadonlySet<HazardVisual> = new Set(Object.values(SPIT_FLAVORS).map((f) => f.visual))

/** Whether a hazard is a spit shot or puddle. */
export const isSpit = (h: Pick<Hazard, 'visual'>) => SPIT_VISUALS.has(h.visual)

/** Whether an enemy is a spitter. */
export const isSpitter = (e: Enemy) => e.trait.act?.kind === 'spitter'

/** Turns a fresh regular spawn into a spitter; `roll` (0..1) staggers its first shot. */
export const makeSpitter = (e: Pick<Enemy, 'trait'>, roll: number) => {
  e.trait.act = createTraitState('spitter', roll).act
}

/** The band a spitter holds: `max` as tuned, `min` shrunk on a narrow (portrait) screen so it stays in view. */
export const spitBand = (view: Game['view']) => ({
  min: Math.min(TRAITS.spitter.min, Math.min(view.w, view.h) * 0.4),
  max: TRAITS.spitter.max,
})

/**
 * Where a spitter walks, as a multiple of its pace along the line to the
 * player: in (1) while it's off screen or past `max`, back off
 * (-`TRAITS.spitter.back`) inside `min`, and hold (0) in between.
 */
export const spitterStride = (dist: number, inSight: boolean, band: { min: number; max: number }) =>
  !inSight || dist > band.max ? 1 : dist < band.min ? -TRAITS.spitter.back : 0

/** Shots in a volley: the flavor's floor or the difficulty's roll, whichever is more. `roll` is 0..1. */
export const volleySize = (flavor: SpitFlavor, volley: readonly [number, number], roll: number) =>
  Math.max(flavor.count, volley[0] + Math.floor(roll * (volley[1] - volley[0] + 1)))

/** Angle offset of shot `i` of `n`, fanned `spread` rad apart around the aim. */
export const fanOffset = (i: number, n: number, spread: number) => (i - (n - 1) / 2) * spread
