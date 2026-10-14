import type { Enemy, Game } from './types'
import * as dm from '../engine/dmath'

export const isAlive = (e: Enemy) => e.dying < 0

/** Nearest living enemy within `maxDist`, optionally skipping ids already targeted. */
export const nearestEnemy = (g: Game, x: number, y: number, maxDist: number, exclude?: ReadonlySet<number>) => {
  let best: Enemy | null = null
  let bestD = maxDist * maxDist
  for (const e of g.enemies) {
    if (!isAlive(e) || exclude?.has(e.id)) continue
    const d = dm.sq(e.x - x) + dm.sq(e.y - y)
    if (d < bestD) {
      bestD = d
      best = e
    }
  }
  return best
}

export const inView = (g: Game, x: number, y: number, margin = 0) =>
  x > g.camera.x - margin &&
  x < g.camera.x + g.view.w + margin &&
  y > g.camera.y - margin &&
  y < g.camera.y + g.view.h + margin

export const enemiesInView = (g: Game) => g.enemies.filter((e) => isAlive(e) && inView(g, e.x, e.y, -8))
