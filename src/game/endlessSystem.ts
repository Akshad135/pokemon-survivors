import { dirTo } from '../engine/math'
import { weightedPick } from '../engine/rng'
import { ENEMIES } from '../data/enemies'
import { stageIndexAt } from '../data/waves'
import { burst } from './effects'
import { ENDLESS, endlessEventSize, REAPER, reaperDue, reaperHp, reaperSpeed, startEndless, type EndlessState } from './endless'
import { DIFFICULTIES } from './difficulty'
import { spawnEnemy } from './enemies'
import { dropCoins, dropPickup } from './pickups'
import { hasTrait } from './roster'
import { spawnRing, spawnSwarm } from './spawner'
import type { Enemy, Game } from './types'

/** Extra Poké Balls and ₽ dropped by a defeated Arceus, on top of a boss's usual drop. */
const REAPER_LOOT = { pokeballs: 3, coins: [250, 250, 250, 250, 250, 250, 250, 250] } as const

/** Chosen on the victory screen: the run goes on past Mewtwo, with no end but fainting. */
export const continueEndless = (g: Game) => {
  if (g.phase !== 'victory') return
  g.endless = startEndless(g.time)
  g.phase = 'playing'
}

/** Arceus descends just past the top of the screen and blasts the horde away. */
const summonReaper = (g: Game, s: EndlessState) => {
  const p = g.player
  const reaper = spawnEnemy(g, REAPER, p.x, p.y - g.view.h / 2 - 24)
  reaper.hp = reaper.maxHp = Math.round(reaperHp(s.reaperDefeats) * DIFFICULTIES[g.difficulty].enemyHp)
  s.reaperId = reaper.id
  s.reaperSince = g.time
  g.bossId = reaper.id
  for (const e of g.enemies) {
    if (e.boss || e.dying >= 0) continue
    const d = dirTo(p.x, p.y, e.x, e.y)
    e.kx += (d.x * 320) / e.mass
    e.ky += (d.y * 320) / e.mass
  }
  g.flash = 1
  g.shake = 12
  g.events.push({ kind: 'reaper', defeats: s.reaperDefeats })
}

const reaperDown = (g: Game, s: EndlessState, reaper: Enemy | undefined) => {
  const x = reaper?.x ?? g.player.x
  const y = reaper?.y ?? g.player.y
  dropCoins(g, x, y, REAPER_LOOT.coins)
  for (let i = 0; i < REAPER_LOOT.pokeballs; i++) dropPickup(g, x - 8 + i * 8, y + 4, 'pokeball')
  burst(g, x, y - 20, { colors: ['#fff0a0', '#f8d030', '#ffffff'], count: 80, speed: 200, ttl: 0.9 })
  s.reaperDefeats++
  s.reaperId = null
  s.reaperAt = g.time + ENDLESS.reaperReturn
  g.events.push({ kind: 'reaperDown', defeats: s.reaperDefeats })
}

/** Arceus speeds up as it hunts, and never loses track: past the screen it blinks back to the edge. */
const hunt = (g: Game, s: EndlessState, reaper: Enemy) => {
  reaper.speed = reaperSpeed(ENEMIES[REAPER].speed, g.time - s.reaperSince)
  const p = g.player
  const far = Math.hypot(g.view.w, g.view.h) * 0.75
  const dx = reaper.x - p.x
  const dy = reaper.y - p.y
  const d = Math.hypot(dx, dy)
  if (d <= far) return
  const edge = Math.hypot(g.view.w, g.view.h) / 2 + 16
  reaper.x = p.x + (dx / d) * edge
  reaper.y = p.y + (dy / d) * edge
}

/** Endless horde events and the reaper. Paused while the player is inside a rift arena. */
export const updateEndless = (g: Game) => {
  const s = g.endless
  if (!s || g.rift.arena) return
  if (g.time >= s.nextEvent) {
    // Trait species stay seasoning: a ring of 40 Nidoqueen would be the whole horde.
    const pool = (g.roster.stages[stageIndexAt(g.time)] ?? []).filter(([id]) => !hasTrait(id))
    const count = endlessEventSize(g.time)
    if (pool.length > 0) (s.events % 2 === 0 ? spawnRing : spawnSwarm)(g, weightedPick(g.rng, pool), count)
    s.events++
    s.nextEvent = g.time + ENDLESS.eventEvery
  }
  if (s.reaperId === null) {
    if (reaperDue(s, g.time)) summonReaper(g, s)
    return
  }
  const reaper = g.enemies.find((e) => e.id === s.reaperId)
  if (!reaper || reaper.dying >= 0) return reaperDown(g, s, reaper)
  hunt(g, s, reaper)
}
