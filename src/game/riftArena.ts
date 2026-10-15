import { retain } from '../engine/math'
import { megaOf } from '../data/megas'
import { RIFT, type RiftLegend } from '../data/rifts'
import { healPlayer } from './combat'
import { dropItem } from './consumables'
import { burst, floatText } from './effects'
import { spawnEnemy } from './enemies'
import { dropCoins, dropPickup } from './pickups'
import { riftLoot, riftScale, type RiftArena } from './rift'
import { rollShiny } from './shiny'
import type { Enemy, Game } from './types'
import * as dm from '../engine/dmath'

/**
 * The arena behind a rift: a walled floor where the player duels one
 * legendary. Entering sets the world aside (horde, hazards, pickups, props)
 * and leaving puts it back exactly as it was. The run clock keeps going.
 */

/** Seconds of invulnerability when stepping in or out, so nobody lands on a hit. */
const ARRIVAL_IFRAMES = 1.5
/** The horde is pushed this far from the player when they come back. */
const EXIT_CLEARANCE = 64
/** A weather change that came due in the arena waits this long after the way out, so it doesn't land on the loot's news. */
const EXIT_WEATHER_DELAY = 6

/** Sends the player into `legend`'s arena, centered where the portal was. */
export const enterArena = (g: Game, legend: RiftLegend, x: number, y: number) => {
  const shiny = rollShiny(g.rng, RIFT.shinyOdds)
  const r = RIFT.arenaRadius
  const stash = { enemies: g.enemies, hazards: g.hazards, pickups: g.pickups, props: g.props, bossId: g.bossId }
  g.enemies = []
  g.hazards = []
  g.pickups = []
  g.props = []
  // Homing shots would keep chasing a target that is now set aside.
  for (const a of g.attacks) if (a.motion.kind === 'homing') a.motion.target = null

  const boss = spawnEnemy(g, legend, x, y - r * 0.45)
  const scale = riftScale(g.time)
  boss.hp = boss.maxHp = Math.round(boss.maxHp * scale.hp)
  boss.damage *= scale.damage
  boss.xp = riftLoot(g.time, shiny).xp
  boss.shiny = shiny
  g.bossId = boss.id

  const p = g.player
  p.x = x
  p.y = y + r * 0.3
  p.iframes = Math.max(p.iframes, ARRIVAL_IFRAMES)
  g.flash = 0.9
  g.shake = 9
  g.rift.arena = { legend, shiny, x, y, r, left: RIFT.arenaTime, age: 0, bossId: boss.id, loot: null, stash }
  g.events.push({ kind: 'riftEnter', enemy: legend, shiny })
}

/** Brings the player back to the world they left. `won` decides the toast; the loot was already dropped. */
export const exitArena = (g: Game, outcome: 'won' | 'collapse') => {
  const arena = g.rift.arena
  if (!arena) return
  const { stash } = arena
  const p = g.player
  if (outcome === 'collapse') {
    const boss = g.enemies.find((e) => e.id === arena.bossId)
    if (boss) burst(g, boss.x, boss.y - boss.radius, { colors: ['#7850c8', '#c8a8f8', '#ffffff'], count: 50, speed: 140, ttl: 0.6 })
  }
  g.enemies = stash.enemies
  g.hazards = stash.hazards
  // Loot still flying toward the player keeps flying.
  g.pickups = [...stash.pickups, ...g.pickups]
  g.props = stash.props
  g.bossId = stash.bossId
  g.rift.arena = null

  for (const e of g.enemies) {
    if (e.dying >= 0) continue
    const dx = e.x - p.x
    const dy = e.y - p.y
    const d2 = dx * dx + dy * dy
    if (d2 >= EXIT_CLEARANCE * EXIT_CLEARANCE) continue
    const d = Math.sqrt(d2) || 1
    e.x = p.x + (dx / d) * EXIT_CLEARANCE
    e.y = p.y + (dy / d) * EXIT_CLEARANCE
  }
  p.iframes = Math.max(p.iframes, ARRIVAL_IFRAMES)
  g.weather.next = Math.max(g.weather.next, g.time + EXIT_WEATHER_DELAY)
  g.flash = 0.6
  g.events.push({ kind: 'riftExit', outcome })
}

const keepInside = (o: { x: number; y: number }, arena: RiftArena, max: number) => {
  const dx = o.x - arena.x
  const dy = o.y - arena.y
  const d2 = dx * dx + dy * dy
  if (d2 <= max * max) return
  const d = Math.sqrt(d2)
  o.x = arena.x + (dx / d) * max
  o.y = arena.y + (dy / d) * max
}

/** The legendary fell: drop the rift's loot, heal the player and start the short loot window. */
const win = (g: Game, arena: RiftArena, boss: Enemy | undefined) => {
  const loot = riftLoot(g.time, arena.shiny)
  const x = boss?.x ?? arena.x
  const y = boss?.y ?? arena.y
  dropCoins(g, x, y, loot.coins)
  for (let i = 0; i < loot.pokeballs; i++) dropPickup(g, x - 8 + i * 8, y + 4, 'pokeball')
  loot.items.forEach((item, i) => dropItem(g, x + 10 + i * 6, y, item))
  // A Mega line's first beaten legendary also leaves its Mega Stone.
  if (megaOf(g.starter) && !g.mega.stone && !g.pickups.some((k) => k.kind === 'megaStone')) dropPickup(g, x, y - 10, 'megaStone')
  const p = g.player
  const heal = Math.round(healPlayer(g, p.stats.maxHp * loot.heal))
  floatText(g, p.x, p.y - 30, `+${heal}`, '#58e858')
  g.hazards.length = 0
  g.rift.cleared.push(arena.legend)
  arena.loot = RIFT.lootTime
  g.events.push({ kind: 'riftCleared', enemy: arena.legend, shiny: arena.shiny })
}

/** Keeps everyone inside the wall, runs the collapse timer and closes the arena after the loot window. */
export const updateArena = (g: Game, dt: number) => {
  const arena = g.rift.arena
  if (!arena) return
  arena.age += dt
  keepInside(g.player, arena, arena.r - g.player.radius)
  for (const e of g.enemies) keepInside(e, arena, arena.r - e.radius)
  // Shots break on the wall.
  const wall = dm.sq(arena.r + 4)
  retain(g.hazards, (h) => dm.sq(h.x - arena.x) + dm.sq(h.y - arena.y) < wall)

  if (arena.loot === null) {
    const boss = g.enemies.find((e) => e.id === arena.bossId)
    if (!boss || boss.dying >= 0) return win(g, arena, boss)
    arena.left -= dt
    if (arena.left <= 0) exitArena(g, 'collapse')
    return
  }
  for (const k of g.pickups) k.attracted = true
  arena.loot -= dt
  if (arena.loot <= 0) exitArena(g, 'won')
}
