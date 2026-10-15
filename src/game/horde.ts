import { ELITE, RUNNER } from '../data/waves'
import type { Enemy } from './types'

/** New regular spawns are elites once `regular` enemies fill `ELITE.fill` of the effective `cap`, while `elites` stay under `ELITE.share` of it. */
export const eliteSpawn = (regular: number, elites: number, cap: number) => regular >= cap * ELITE.fill && elites < cap * ELITE.share

/** Promotes a fresh regular spawn to an elite (`ELITE`). */
export const makeElite = (e: Pick<Enemy, 'elite' | 'hp' | 'maxHp' | 'xp' | 'damage' | 'radius'>) => {
  e.elite = true
  e.hp = e.maxHp = Math.round(e.maxHp * ELITE.hp)
  e.xp *= ELITE.xp
  e.damage *= ELITE.damage
  e.radius *= ELITE.size
}

/** Turns a fresh regular spawn into a runner (`RUNNER`): faster but capped under the player's pace, and frailer. */
export const makeRunner = (e: Pick<Enemy, 'runner' | 'hp' | 'maxHp' | 'speed'>) => {
  e.runner = true
  e.speed = Math.min(e.speed * RUNNER.speed, RUNNER.maxSpeed)
  e.hp = e.maxHp = Math.max(1, Math.round(e.maxHp * RUNNER.hp))
}

/**
 * How far ahead (s) a runner `dist` px away at `speed` px/s aims: about the
 * time it needs to get there, at most `RUNNER.lead`. It heads for the player's
 * position plus the player's velocity times this, so circling doesn't shake it.
 */
export const leadTime = (dist: number, speed: number) => (speed > 0 ? Math.min(RUNNER.lead, dist / speed) : 0)
