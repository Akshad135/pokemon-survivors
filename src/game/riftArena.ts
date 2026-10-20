import { retain } from '../engine/math'
import { ARENA_FEET, ARENA_LAYOUTS, type Pt } from '../data/arenas'
import { RIFT, type RiftLegend } from '../data/rifts'
import { floorAt, holesAt, onFloor, stepsAt } from './arenaFloor'
import { healPlayer, hurtPlayer } from './combat'
import { dropItem } from './consumables'
import { burst, floatText } from './effects'
import { spawnEnemy } from './enemies'
import { dropMegaStones, heldMega } from './mega'
import { dropCoins, dropPickup } from './pickups'
import { dropLegendaryTm } from './tms'
import { riftLoot, riftScale, type RiftArena } from './rift'
import { bringBack, keepOnFloor, setAside } from './room'
import { rollShiny } from './shiny'
import { groundAt, playerTypes } from './terrain'
import type { Enemy, Game } from './types'

/**
 * The arena behind a rift: a room (`room.ts`) with its own shape, scenery and
 * ground rule (`data/arenas.ts`) where the player duels one legendary.
 * Entering sets the world aside and leaving puts it back exactly as it was.
 * Falling here doesn't end the run: the rift throws the fainted player back
 * out (`fallInArena`).
 */

/** Lava burns this share of max HP per touch (every half second, the player's i-frames). Fire types walk on it. */
const LAVA_BURN = 0.07

/** Sends the player into `legend`'s arena, centered where the portal was. */
export const enterArena = (g: Game, legend: RiftLegend, x: number, y: number) => {
  const shiny = rollShiny(g.rng, RIFT.shinyOdds)
  const layout = ARENA_LAYOUTS[legend]
  const at = ([dx, dy]: Pt) => ({ x: x + dx, y: y + dy })
  const stash = setAside(g)

  const spawn = at(layout.boss)
  const boss = spawnEnemy(g, legend, spawn.x, spawn.y)
  const scale = riftScale(g.time)
  boss.hp = boss.maxHp = Math.round(boss.maxHp * scale.hp)
  boss.damage *= scale.damage
  boss.xp = riftLoot(g.time, shiny).xp
  boss.shiny = shiny
  g.bossId = boss.id

  const p = g.player
  const start = at(layout.player)
  p.x = start.x
  p.y = start.y
  g.flash = 0.9
  g.shake = 9
  const terrain = {
    lake: null,
    solids: layout.solids.map((s, i) => {
      const foot = ARENA_FEET[s.piece]
      return { kind: s.piece, x: x + s.x, y: y + s.y, variant: i, foot: [{ ...foot, x: x + s.x + foot.x, y: y + s.y + foot.y }] }
    }),
  }
  g.rift.arena = { legend, shiny, x, y, layout, left: RIFT.arenaTime, age: 0, bossId: boss.id, loot: null, fall: null, stash, terrain }
  g.events.push({ kind: 'riftEnter', enemy: legend, shiny })
}

/** Brings the player back to the world they left. `outcome` decides the toast; the loot was already dropped. */
export const exitArena = (g: Game, outcome: 'won' | 'collapse' | 'fallen') => {
  const arena = g.rift.arena
  if (!arena) return
  if (outcome === 'collapse') {
    const boss = g.enemies.find((e) => e.id === arena.bossId)
    if (boss) burst(g, boss.x, boss.y - boss.radius, { colors: ['#7850c8', '#c8a8f8', '#ffffff'], count: 50, speed: 140, ttl: 0.6 })
  }
  g.rift.arena = null
  bringBack(g, arena.stash)
  g.flash = 0.6
  g.events.push({ kind: 'riftExit', outcome })
}

/**
 * The player's HP hit 0 in the arena: instead of the game over, they faint and
 * the rift throws them out (`updateArenaFall` plays it with the world held
 * still). A held Revive is kept for a real fall.
 */
export const fallInArena = (g: Game) => {
  const arena = g.rift.arena
  if (!arena || arena.fall !== null) return
  arena.fall = RIFT.fallTime
  g.player.hp = 0
  g.shake = Math.max(g.shake, 8)
  g.events.push({ kind: 'riftFall', enemy: arena.legend })
}

/**
 * Runs the defeat while it plays and lands the player back outside with a bit
 * of HP when it ends. Returns whether it is playing (the simulation waits).
 */
export const updateArenaFall = (g: Game, dt: number) => {
  const arena = g.rift.arena
  if (!arena || arena.fall === null) return false
  arena.fall -= dt
  if (arena.fall > 0) return true
  const p = g.player
  p.hp = Math.max(1, Math.round(p.stats.maxHp * RIFT.fallHp))
  p.hurt = 0
  exitArena(g, 'fallen')
  return true
}

/** The legendary fell: drop the rift's loot, heal the player and start the short loot window. */
const win = (g: Game, arena: RiftArena, boss: Enemy | undefined) => {
  const loot = riftLoot(g.time, arena.shiny)
  const x = boss?.x ?? arena.x
  const y = boss?.y ?? arena.y
  dropCoins(g, x, y, loot.coins)
  for (let i = 0; i < loot.pokeballs; i++) dropPickup(g, x - 8 + i * 8, y + 4, 'pokeball')
  loot.items.forEach((item, i) => dropItem(g, x + 10 + i * 6, y, item))
  // A Mega line's first beaten legendary also leaves its Mega Stone (or both, to choose from).
  if (!heldMega(g) && !g.pickups.some((k) => k.kind === 'megaStone')) dropMegaStones(g, x, y - 10)
  // So does its legendary TM, until the run has learned one.
  dropLegendaryTm(g, arena.legend, x + 14, y - 6)
  const p = g.player
  const heal = Math.round(healPlayer(g, p.stats.maxHp * loot.heal))
  floatText(g, p.x, p.y - 30, `+${heal}`, '#58e858')
  g.hazards.length = 0
  g.rift.cleared.push(arena.legend)
  arena.loot = RIFT.lootTime
  g.events.push({ kind: 'riftCleared', enemy: arena.legend, shiny: arena.shiny })
}

/**
 * Runs the arena's ground rule (the tide rises, the edge crumbles), keeps
 * everyone on the floor, burns whoever walks in lava, runs the collapse timer
 * and closes the arena after the loot window.
 */
export const updateArena = (g: Game, dt: number) => {
  const arena = g.rift.arena
  // A player who fainted this tick is on the way out: no win, no collapse.
  if (!arena || arena.fall !== null) return
  const layout = ARENA_LAYOUTS[arena.legend]
  const before = stepsAt(layout.tide, arena.age) + stepsAt(layout.crumble, arena.age)
  arena.age += dt
  if (stepsAt(layout.tide, arena.age) + stepsAt(layout.crumble, arena.age) > before) {
    g.shake = Math.max(g.shake, 5)
    g.events.push({ kind: 'quake' })
  }
  const floor = floorAt(layout, stepsAt(layout.crumble, arena.age))
  const p = g.player
  // The player keeps to what's left of the floor; the legendary flies or swims over the rest.
  keepOnFloor(p, arena, floor, holesAt(layout, stepsAt(layout.tide, arena.age)), p.radius)
  const whole = floorAt(layout, 0)
  for (const e of g.enemies) keepOnFloor(e, arena, whole, [], e.radius)
  // Shots break on the edge.
  retain(g.hazards, (h) => onFloor(whole, h.x - arena.x, h.y - arena.y, 4))
  if (groundAt(g, p.x, p.y) === 'lava' && !playerTypes(g).includes('fire')) hurtPlayer(g, p.stats.maxHp * LAVA_BURN, undefined, ['fire'], 'lava')

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
