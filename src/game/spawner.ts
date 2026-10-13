import { TAU } from '../engine/math'
import { chance, range, weightedPick } from '../engine/rng'
import { ENEMIES, type EnemyDef } from '../data/enemies'
import type { EnemyId } from '../data/enemies'
import { EVENTS, stageAt, stageIndexAt, type WaveEvent } from '../data/waves'
import { endlessPressure } from './endless'
import { spawnEnemy } from './enemies'
import { makeShiny, rollShiny, SHINY_ODDS } from './shiny'
import type { Game } from './types'

/** Just outside the visible area, in a random direction around the player. */
const ringDistance = (g: Game) => Math.hypot(g.view.w, g.view.h) / 2 + 12

const offscreen = (g: Game, angle = range(g.rng, 0, TAU)) => {
  const d = ringDistance(g)
  return { x: g.player.x + Math.cos(angle) * d, y: g.player.y + Math.sin(angle) * d }
}

/** A closing circle of `count` × `species` around the player. The endless mode reuses it. */
export const spawnRing = (g: Game, species: EnemyId, count: number) => {
  const p = g.player
  const d = ringDistance(g) - 20
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU
    spawnEnemy(g, species, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d)
  }
}

/** A flock of `count` × `species` that enters from one side and crosses the screen through the player's area. The endless mode reuses it. */
export const spawnSwarm = (g: Game, species: EnemyId, count: number) => {
  const p = g.player
  const heading = range(g.rng, 0, TAU)
  const d = ringDistance(g)
  const speed = ENEMIES[species].speed * 1.7
  const vx = Math.cos(heading) * speed
  const vy = Math.sin(heading) * speed
  for (let i = 0; i < count; i++) {
    const spread = range(g.rng, -70, 70)
    const back = range(g.rng, 0, 60)
    spawnEnemy(
      g,
      species,
      p.x - Math.cos(heading) * (d + back) - Math.sin(heading) * spread,
      p.y - Math.sin(heading) * (d + back) + Math.cos(heading) * spread,
      { kind: 'flyby', vx, vy, ttl: (d * 2 + 120) / speed },
    )
  }
}

/** `index` points into `EVENTS`; swarms and rings take their species from the run's roster. */
const runEvent = (g: Game, event: WaveEvent, index: number) => {
  const species = g.roster.events[index]
  switch (event.kind) {
    case 'boss': {
      if (event.chance !== undefined && !chance(g.rng, event.chance)) break
      const pos = offscreen(g)
      const boss = spawnEnemy(g, event.enemy, pos.x, pos.y)
      const def: EnemyDef = ENEMIES[event.enemy]
      g.bossId = boss.id
      g.shake = def.legendary ? 9 : 5
      g.events.push({ kind: 'boss', enemy: event.enemy })
      break
    }
    case 'ring':
      if (species) spawnRing(g, species, event.count)
      break
    case 'swarm':
      if (species) spawnSwarm(g, species, event.count)
      break
  }
}

export const updateSpawner = (g: Game, dt: number) => {
  const stage = stageAt(g.time)
  const pool = g.roster.stages[stageIndexAt(g.time)] ?? []
  const pressure = endlessPressure(g.time)
  const regular = g.enemies.reduce((n, e) => n + (e.dying < 0 && !e.boss && e.behavior.kind === 'chase' ? 1 : 0), 0)

  g.spawnBudget += stage.rate * pressure.rate * dt
  while (g.spawnBudget >= 1) {
    g.spawnBudget--
    if (regular >= stage.max * pressure.max || pool.length === 0) continue
    const kind = weightedPick(g.rng, pool)
    if (rollShiny(g.rng, SHINY_ODDS.enemy)) {
      // Shinies pop in just inside the screen edge so their sparkle entrance is seen.
      const a = range(g.rng, 0, TAU)
      const d = Math.min(g.view.w, g.view.h) / 2 - 16
      makeShiny(g, spawnEnemy(g, kind, g.player.x + Math.cos(a) * d, g.player.y + Math.sin(a) * d))
    } else {
      const pos = offscreen(g)
      spawnEnemy(g, kind, pos.x, pos.y)
    }
  }

  while (g.nextEvent < EVENTS.length && EVENTS[g.nextEvent]!.at <= g.time) {
    runEvent(g, EVENTS[g.nextEvent]!, g.nextEvent)
    g.nextEvent++
  }
}
