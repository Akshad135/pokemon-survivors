import type { RiftLegend } from '../data/rifts'
import type { DomainState } from './domain'
import type { Enemy, Game } from './types'
import { LATIS_HOOKS } from './latisHooks'
import { DEOXYS_HOOKS } from './deoxysHooks'

/**
 * Mechanics a legendary's domain needs beyond its data (`data/domains.ts`):
 * Dialga freezing shots, Ho-Oh's rebirth, Latis's mirages, Deoxys's meteor
 * shower. Each hook runs inside the simulation, so it must stay
 * deterministic (seeded rng, `engine/dmath`) and never touch the DOM.
 * A legendary's hooks live in their own module, added to `DOMAIN_HOOKS`.
 */
export type DomainHooks = {
  /** Every tick of the crossing, after the threat and the retinue. */
  crossing?: (g: Game, d: DomainState, dt: number) => void
  /** As the encounter reveals the legendary (bring in a partner, set its stance). */
  reveal?: (g: Game, d: DomainState, boss: Enemy) => void
  /** Every tick of the battle, after the domain's own rules. */
  battle?: (g: Game, d: DomainState, boss: Enemy, dt: number) => void
  /** As the legendary moves on to phase `phase` (from 0), once its transforms are scheduled. */
  phase?: (g: Game, d: DomainState, boss: Enemy, phase: number) => void
  /**
   * The legendary fell. Return true to fight on (a rebirth): the hook brings
   * in whoever fights now and sets `d.bossId` to it. False lets the capture play.
   */
  fallen?: (g: Game, d: DomainState, boss: Enemy) => boolean
}

export const DOMAIN_HOOKS: Partial<Record<RiftLegend, DomainHooks>> = {
  latias: LATIS_HOOKS,
  deoxys: DEOXYS_HOOKS,
}
