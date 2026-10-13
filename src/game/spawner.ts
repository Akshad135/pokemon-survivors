import { TAU } from '../engine/math'
import { range, weightedPick } from '../engine/rng'
import { ENEMIES } from '../data/enemies'
import { EVENTS, stageAt, type WaveEvent } from '../data/waves'
import { spawnEnemy } from './enemies'
import type { Game } from './types'

/** Just outside the visible area, in a random direction around the player. */
const ringDistance = (g: Game) => Math.hypot(g.view.w, g.view.h) / 2 + 12

const offscreen = (g: Game, angle = range(g.rng, 0, TAU)) => {
  const d = ringDistance(g)
  return { x: g.player.x + Math.cos(angle) * d, y: g.player.y + Math.sin(angle) * d }
}

const runEvent = (g: Game, event: WaveEvent) => {
  const p = g.player
  switch (event.kind) {
    case 'boss': {
      const pos = offscreen(g)
      const boss = spawnEnemy(g, event.enemy, pos.x, pos.y)
      g.bossId = boss.id
      g.shake = 5
      g.events.push({ kind: 'boss', enemy: event.enemy })
      break
    }
    case 'ring': {
      const d = ringDistance(g) - 20
      for (let i = 0; i < event.count; i++) {
        const a = (i / event.count) * TAU
        spawnEnemy(g, event.enemy, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d)
      }
      break
    }
    case 'swarm': {
      // The flock enters from one side and crosses the screen through the player's area.
      const heading = range(g.rng, 0, TAU)
      const d = ringDistance(g)
      const speed = ENEMIES[event.enemy].speed * 1.7
      const vx = Math.cos(heading) * speed
      const vy = Math.sin(heading) * speed
      for (let i = 0; i < event.count; i++) {
        const spread = range(g.rng, -70, 70)
        const back = range(g.rng, 0, 60)
        spawnEnemy(
          g,
          event.enemy,
          p.x - Math.cos(heading) * (d + back) - Math.sin(heading) * spread,
          p.y - Math.sin(heading) * (d + back) + Math.cos(heading) * spread,
          { kind: 'flyby', vx, vy, ttl: (d * 2 + 120) / speed },
        )
      }
      break
    }
  }
}

export const updateSpawner = (g: Game, dt: number) => {
  const stage = stageAt(g.time)
  const regular = g.enemies.reduce((n, e) => n + (e.dying < 0 && !e.boss && e.behavior.kind === 'chase' ? 1 : 0), 0)

  g.spawnBudget += stage.rate * dt
  while (g.spawnBudget >= 1) {
    g.spawnBudget--
    if (regular >= stage.max) continue
    const pos = offscreen(g)
    spawnEnemy(g, weightedPick(g.rng, stage.pool), pos.x, pos.y)
  }

  while (g.nextEvent < EVENTS.length && EVENTS[g.nextEvent]!.at <= g.time) {
    runEvent(g, EVENTS[g.nextEvent]!)
    g.nextEvent++
  }
}
