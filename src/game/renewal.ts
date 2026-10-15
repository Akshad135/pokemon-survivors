import { isAirborne } from './traits'
import type { Enemy } from './types'

/**
 * Horde renewal: late in a run the regular horde sits at its cap, and without
 * turnover it freezes into one blob that never changes. The spawner swaps the
 * oldest off-screen enemy for each fresh spawn at the cap, and retires anyone
 * off-screen past `maxAge` even below it. Pure: the spawner applies it.
 */
export const RENEWAL = {
  /** Seconds before an enemy can be swapped out at the cap, so fresh spawns (born off-screen) get to walk in first. */
  minAge: 12,
  /** Seconds an off-screen enemy lives before it's retired, cap or not. */
  maxAge: 60,
  /** Px beyond the screen edge an enemy must be, so no sprite pops out of view. */
  margin: 32,
} as const

type Rect = { x: number; y: number }
type Size = { w: number; h: number }

/**
 * A regular enemy that can leave without anyone noticing: alive, chasing (not a
 * flyby swarm), not a boss or shiny, not mid-leap, at least `minAge` old and
 * fully off-screen (`camera` is the screen's top-left corner).
 */
export const isRenewable = (e: Enemy, camera: Rect, view: Size, time: number) => {
  if (e.dying >= 0 || e.boss || e.shiny || e.behavior.kind !== 'chase' || isAirborne(e)) return false
  if (time - e.bornAt < RENEWAL.minAge) return false
  const m = RENEWAL.margin
  return e.x < camera.x - m || e.x > camera.x + view.w + m || e.y < camera.y - m || e.y > camera.y + view.h + m
}

/** Index of the oldest renewable enemy, or -1. One pass, no allocation. */
export const oldestRenewable = (enemies: readonly Enemy[], camera: Rect, view: Size, time: number) => {
  let oldest = -1
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i]!
    if ((oldest < 0 || e.bornAt < enemies[oldest]!.bornAt) && isRenewable(e, camera, view, time)) oldest = i
  }
  return oldest
}
