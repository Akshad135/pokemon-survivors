import { edgeDistance, harmAfter, reachAfter, TENSION, tensionAfter, tensionCeiling } from './tension'
import type { Enemy, Game } from './types'
import * as dm from '../engine/dmath'

/** Center of the screen in the world (the camera trails the player by a few px). */
const screenCenter = (g: Game) => ({ x: g.camera.x + g.view.w / 2, y: g.camera.y + g.view.h / 2 })

/** A regular chasing the player just died: how far into the screen it got feeds `reach`. Bosses and flybys don't count. */
export const noteKill = (g: Game, e: Enemy) => {
  if (e.boss || e.behavior.kind !== 'chase' || g.rift.arena) return
  const c = screenCenter(g)
  const dx = e.x - c.x
  const dy = e.y - c.y
  const d = dm.hypot(dx, dy)
  const ratio = d > 0 ? d / edgeDistance(g.view, dx / d, dy / d) : 0
  g.tension.reach = reachAfter(g.tension.reach, ratio)
}

/** The player lost `hp`: it feeds `harm`, which eases the tension. */
export const noteHarm = (g: Game, hp: number) => {
  g.tension.harm += hp / Math.max(1, g.player.stats.maxHp) / TENSION.harmTau
}

/** One tick of the director (none before `TENSION.from`). The spawner holds it still while the finale boss lives. */
export const updateTension = (g: Game, dt: number) => {
  const s = g.tension
  s.harm = harmAfter(s.harm, 0, dt)
  if (g.time < TENSION.from) return
  s.level = Math.min(tensionCeiling(g.time), tensionAfter(s, g.player.hp / Math.max(1, g.player.stats.maxHp), dt))
}

/**
 * Where a regular spawning at `angle` comes in: on the far ring (`ring` px
 * from the player) at no tension, `near` of the way to just outside the
 * screen edge that way at full.
 */
export const spawnPoint = (g: Game, angle: number, ring: number, near: number) => {
  const ux = dm.cos(angle)
  const uy = dm.sin(angle)
  const c = screenCenter(g)
  const edge = edgeDistance(g.view, ux, uy) + TENSION.margin
  const fromCenter = Math.min(ring, edge) * near + ring * (1 - near)
  // The ring is measured from the player; the edge from the screen's center, a few px off.
  return near > 0 ? { x: c.x + ux * fromCenter, y: c.y + uy * fromCenter } : { x: g.player.x + ux * ring, y: g.player.y + uy * ring }
}
