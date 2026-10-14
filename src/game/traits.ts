import { clamp } from '../engine/math'
import { TRAITS, type TraitId } from '../data/traits'
import type { Enemy } from './types'
import * as dm from '../engine/dmath'

/**
 * Pure enemy-trait rules (who gets healed or warded, how many summons, who a
 * blast or beam hits). Traits are declared per species in `data/enemies.ts`
 * and tuned in `data/traits.ts`; the per-tick system lives in `traitSystem.ts`.
 */

/** Pulse traits: `cooldown` until the next cast, `cast` seconds since the last one (drives the pulse ring). */
type Pulse = { cooldown: number; cast: number }

/** What an enemy's own trait is doing right now. Timers in seconds. */
export type TraitAct =
  | ({ kind: 'healer' } & Pulse)
  | ({ kind: 'shield' } & Pulse)
  /** `called` counts summons so far, to cycle through `SUMMONS`. */
  | ({ kind: 'summoner'; called: number } & Pulse)
  /** `fuse` is -1 until lit, then seconds since it was lit. */
  | { kind: 'kamikaze'; fuse: number }
  /** Locks its aim from (ox, oy) along the unit vector (dx, dy) when it starts aiming. */
  | { kind: 'beam'; cooldown: number; phase: 'idle' | 'aim' | 'fire'; t: number; ox: number; oy: number; dx: number; dy: number }
  /** Locks the landing spot (toX, toY) when it crouches. */
  | { kind: 'leaper'; cooldown: number; phase: 'idle' | 'crouch' | 'air'; t: number; fromX: number; fromY: number; toX: number; toY: number }

/** Every enemy's trait-related state, grouped so the `Enemy` type stays tidy. */
export type TraitState = {
  /** The enemy's own trait (null = it just chases). */
  act: TraitAct | null
  /** Damage a Bronzong ward still absorbs, and seconds before it fades. */
  ward: number
  wardTime: number
  /** Seconds since the ward last soaked a hit (the bubble flashes). */
  wardHit: number
  /** Seconds the heal cross still floats over this enemy. */
  healed: number
  /** Id of the enemy that summoned this one (0 = it spawned wild). */
  summoner: number
}

/** Seconds the heal cross floats over a healed ally. */
export const HEALED_TIME = 0.8

/** First cast comes after a random share of the cooldown, so a pack doesn't pulse in sync. */
export const createTraitState = (trait: TraitId | undefined, roll: number): TraitState => {
  const wait = (every: number) => every * (0.4 + roll * 0.6)
  const base = { ward: 0, wardTime: 0, wardHit: Infinity, healed: 0, summoner: 0 }
  switch (trait) {
    case undefined:
      return { act: null, ...base }
    case 'healer':
    case 'shield':
      return { act: { kind: trait, cooldown: wait(TRAITS[trait].every), cast: Infinity }, ...base }
    case 'summoner':
      return { act: { kind: trait, cooldown: wait(TRAITS.summoner.every), cast: Infinity, called: 0 }, ...base }
    case 'kamikaze':
      return { act: { kind: trait, fuse: -1 }, ...base }
    case 'beam':
      return { act: { kind: trait, cooldown: wait(TRAITS.beam.every), phase: 'idle', t: 0, ox: 0, oy: 0, dx: 1, dy: 0 }, ...base }
    case 'leaper':
      return { act: { kind: trait, cooldown: wait(TRAITS.leaper.every), phase: 'idle', t: 0, fromX: 0, fromY: 0, toX: 0, toY: 0 }, ...base }
  }
}

const within = (a: Enemy, b: Enemy, radius: number) => dm.sq(a.x - b.x) + dm.sq(a.y - b.y) < radius * radius

/** A healer mends wounded regular allies in range: never itself, the fainting or bosses. */
export const isHealTarget = (healer: Enemy, ally: Enemy, radius: number = TRAITS.healer.radius) =>
  ally !== healer && ally.dying < 0 && !ally.boss && ally.hp < ally.maxHp && within(healer, ally, radius)

/** A shield wards regular allies in range (refreshing wards they already have), never itself or bosses. */
export const isWardTarget = (caster: Enemy, ally: Enemy, radius: number = TRAITS.shield.radius) =>
  ally !== caster && ally.dying < 0 && !ally.boss && within(caster, ally, radius)

/** HP one heal pulse restores to `ally`, capped at its max HP. */
export const healAmount = (ally: Enemy) => Math.min(ally.maxHp - ally.hp, ally.maxHp * TRAITS.healer.heal)

/** Ward strength for `ally`: a share of its max HP, so wards keep up with scaled enemies. */
export const wardAmount = (ally: Enemy) => ally.maxHp * TRAITS.shield.ward

/** Lets an active ward soak `damage` first. Returns the damage that gets through. */
export const absorb = (st: TraitState, damage: number) => {
  if (st.wardTime <= 0 || st.ward <= 0) return damage
  const soaked = Math.min(st.ward, damage)
  st.ward -= soaked
  st.wardHit = 0
  return damage - soaked
}

/** How many to summon now, given how many of this summoner's summons are alive. */
export const summonCount = (alive: number, rules: { perCast: number; max: number } = TRAITS.summoner) =>
  Math.max(0, Math.min(rules.perCast, rules.max - alive))

/** Blast radius of a kamikaze, measured from its feet: bigger bodies blow up bigger. */
export const blastRadius = (bodyRadius: number) => bodyRadius + TRAITS.kamikaze.radius

/** Is a body of radius `r` at (x, y) caught in a blast of radius `blast` at (cx, cy)? */
export const inBlast = (cx: number, cy: number, blast: number, x: number, y: number, r: number) =>
  dm.sq(x - cx) + dm.sq(y - cy) < dm.sq(blast + r)

/** What a blast does to an enemy in it: a share of its max HP, or the player damage to a boss. */
export const blastDamage = (target: Enemy, playerDamage: number) =>
  target.boss ? playerDamage : Math.ceil(target.maxHp * TRAITS.kamikaze.enemyDamage)

/**
 * Does a beam from (ox, oy) along the unit vector (dx, dy), `length` long and
 * `halfWidth` thick, touch a body of radius `r` at (x, y)?
 */
export const onBeam = (ox: number, oy: number, dx: number, dy: number, length: number, halfWidth: number, x: number, y: number, r: number) => {
  const along = clamp((x - ox) * dx + (y - oy) * dy, 0, length)
  const px = ox + dx * along - x
  const py = oy + dy * along - y
  return px * px + py * py < dm.sq(halfWidth + r)
}

/** Height of a jump `k` (0..1) of the way through: a parabola peaking at `peak`. */
export const leapHeight = (k: number, peak: number) => 4 * k * (1 - k) * peak

/** Movement multiplier from the trait: rooted while a fuse burns, a beam aims or fires, or a leap is under way. */
export const traitPace = (e: Enemy) => {
  const act = e.trait.act
  if (!act) return 1
  switch (act.kind) {
    case 'kamikaze':
      return act.fuse < 0 ? 1 : 0
    case 'beam':
    case 'leaper':
      return act.phase === 'idle' ? 1 : 0
    default:
      return 1
  }
}

/** Mid-jump leapers fly over the horde: no body pushing and no contact damage. */
export const isAirborne = (e: Enemy) => e.trait.act?.kind === 'leaper' && e.trait.act.phase === 'air'
