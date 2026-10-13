import { pick, range, type Rng } from '../engine/rng'
import { RIFT, RIFT_ITEMS, RIFT_LEGENDS, type RiftLegend } from '../data/rifts'
import { RUN_LENGTH } from '../data/waves'
import type { Prop } from './props'
import type { Enemy, Hazard, Pickup } from './types'

/**
 * Pure rules and state of the legendary rifts. The map side (a portal opens,
 * the player steps in) lives in `riftPortal.ts`; the fight in `riftArena.ts`.
 */

/** A portal waiting on the map. `charge` counts the seconds the player has stood in it. */
export type RiftPortal = { x: number; y: number; left: number; charge: number; legend: RiftLegend }

/** The world outside, set aside untouched while the player fights in the arena. */
export type RiftStash = { enemies: Enemy[]; hazards: Hazard[]; pickups: Pickup[]; props: Prop[]; bossId: number | null }

export type RiftArena = {
  legend: RiftLegend
  shiny: boolean
  /** Center and radius of the walled floor. */
  x: number
  y: number
  r: number
  /** Seconds until the rift collapses. */
  left: number
  age: number
  bossId: number
  /** Seconds left to grab the loot once the legendary falls; null while it stands. */
  loot: number | null
  stash: RiftStash
}

export type RiftState = {
  /** Game time the next portal is due. */
  nextAt: number
  portal: RiftPortal | null
  arena: RiftArena | null
  /** Legendaries met (portal opened) and beaten this run, in order. */
  met: RiftLegend[]
  cleared: RiftLegend[]
}

export const createRiftState = (): RiftState => ({ nextAt: RIFT.firstAt, portal: null, arena: null, met: [], cleared: [] })

/** When the portal after one opening at `time` is due. */
export const nextRiftAt = (time: number, rng: Rng) => time + RIFT.every + range(rng, -RIFT.jitter, RIFT.jitter)

/**
 * Whether a portal opens now. It waits while a world boss is alive, and in a
 * normal run it never opens so late that the arena could overlap Mewtwo.
 */
export const riftDue = (s: { time: number; nextAt: number; busy: boolean; bossAlive: boolean; endless: boolean }) =>
  s.time >= s.nextAt && !s.busy && !s.bossAlive && (s.endless || s.time + RIFT.portalTime + RIFT.arenaTime < RUN_LENGTH)

/** A legendary not met yet this run; once all were met, any of them. */
export const pickLegend = (rng: Rng, met: readonly RiftLegend[]): RiftLegend => {
  const fresh = RIFT_LEGENDS.filter((l) => !met.includes(l))
  return pick(rng, fresh.length > 0 ? fresh : RIFT_LEGENDS)
}

/** Standing in the portal fills it; stepping out drains it twice as fast. */
export const chargePortal = (charge: number, inside: boolean, dt: number) => (inside ? charge + dt : Math.max(0, charge - dt * 2))

/** Rift legendaries are tuned for 3:30 and grow with the run clock, like the horde. */
export const riftScale = (time: number) => {
  const late = Math.max(0, time / 60 - RIFT.firstAt / 60)
  return { hp: 1 + late * 0.5, damage: 1 + late * 0.06 }
}

/**
 * What beating a rift legendary pays, on top of a regular boss drop (₽ shower
 * and a Poké Ball): EXP, money bags, extra Poké Balls, items and a heal.
 * A shiny legendary doubles the ₽ and adds a Poké Ball.
 */
export const riftLoot = (time: number, shiny: boolean) => {
  const coins = [250, 250, 50, 50, 50, 50]
  return {
    xp: Math.round(150 + (time / 60) * 40),
    coins: shiny ? [...coins, ...coins] : coins,
    pokeballs: shiny ? 2 : 1,
    items: RIFT_ITEMS,
    /** Fraction of max HP restored. */
    heal: 0.5,
  }
}
