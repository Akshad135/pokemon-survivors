import { dir8, type Vec } from '../engine/math'
import { createRng } from '../engine/rng'
import { createGrid } from '../engine/spatial'
import { STARTERS, type StarterId } from '../data/starters'
import { sprites } from '../render/sprites'
import { updateAttacks } from './attacks'
import { updateEffects } from './effects'
import { rebuildGrid, updateEnemies } from './enemies'
import { applyOffer, loadout, pendingEvolution, recomputeStats, rollOffers, xpFor } from './leveling'
import { MOVES, moveStats } from './moves'
import { updatePickups } from './pickups'
import { updateSpawner } from './spawner'
import { BASE_STATS } from './stats'
import type { Game, Offer } from './types'

export const EVOLUTION_TIME = 4.6

export const playerDex = (g: Game) => STARTERS[g.starter].line[g.player.stage]!.dex

export const createGame = (starter: StarterId, view: Game['view'], seed = Date.now()): Game => {
  const def = STARTERS[starter]
  const g: Game = {
    starter,
    rng: createRng(seed),
    time: 0,
    phase: 'playing',
    nextId: 1,
    player: {
      x: 0, y: 0,
      facing: { x: 1, y: 0 },
      dir: 0,
      moving: false,
      hp: 0,
      level: 1,
      xp: 0,
      xpNext: xpFor(1),
      iframes: 0,
      hurt: 0,
      stage: 0,
      moves: [{ id: def.signature, level: 1, cooldown: 0.4 }],
      items: [],
      stats: BASE_STATS,
      radius: Math.max(6, Math.round(sprites(def.line[0].dex).bodyW * 0.3)),
      animTime: 0,
    },
    enemies: [],
    attacks: [],
    pickups: [],
    particles: [],
    texts: [],
    grid: createGrid(32),
    view,
    camera: { x: -view.w / 2, y: -view.h / 2 },
    shake: 0,
    kills: 0,
    damageByMove: {},
    pendingLevelUps: 0,
    offers: [],
    evolution: null,
    spawnBudget: 0,
    nextEvent: 0,
    bossId: null,
    events: [],
  }
  recomputeStats(g)
  g.player.hp = g.player.stats.maxHp
  return g
}

const updatePlayer = (g: Game, input: Vec, dt: number) => {
  const p = g.player
  const moving = Math.abs(input.x) + Math.abs(input.y) > 0.05
  p.moving = moving
  if (moving) {
    p.x += input.x * p.stats.speed * dt
    p.y += input.y * p.stats.speed * dt
    const len = Math.hypot(input.x, input.y)
    p.facing = { x: input.x / len, y: input.y / len }
    p.dir = dir8(input.x, input.y)
  }
  p.animTime += dt
  p.iframes = Math.max(0, p.iframes - dt)
  p.hurt = Math.max(0, p.hurt - dt)
  p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.regen * dt)
}

const updateMoves = (g: Game, dt: number) => {
  for (const owned of g.player.moves) {
    owned.cooldown -= dt
    if (owned.cooldown > 0) continue
    const s = moveStats(owned.id, owned.level, g.player.stats)
    MOVES[owned.id].fire(g, s)
    owned.cooldown += s.cooldown
  }
}

/** After level-ups resolve: open the next level-up, start an evolution, or resume. */
const advancePhase = (g: Game) => {
  if (g.pendingLevelUps > 0) {
    g.phase = 'levelup'
    g.offers = rollOffers(loadout(g), g.rng, 3)
    g.events.push({ kind: 'levelup' })
    return
  }
  const evo = pendingEvolution(g)
  if (evo) {
    g.phase = 'evolving'
    g.evolution = { ...evo, t: 0 }
    g.events.push({ kind: 'evolve', ...evo })
    return
  }
  g.phase = 'playing'
}

export const chooseOffer = (g: Game, offer: Offer) => {
  if (g.phase !== 'levelup') return
  applyOffer(g, offer)
  g.pendingLevelUps--
  advancePhase(g)
}

const updateEvolution = (g: Game, dt: number) => {
  const evo = g.evolution
  if (!evo) return
  evo.t += dt
  if (evo.t < EVOLUTION_TIME) return
  const p = g.player
  p.stage++
  p.radius = Math.max(6, Math.round(sprites(evo.to).bodyW * 0.3))
  recomputeStats(g)
  p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.maxHp * 0.5)
  g.evolution = null
  g.events.push({ kind: 'evolved', to: evo.to })
  advancePhase(g)
}

/** One fixed-timestep simulation tick. */
export const step = (g: Game, input: Vec, dt: number) => {
  if (g.phase === 'evolving') return updateEvolution(g, dt)
  if (g.phase !== 'playing') return

  g.time += dt
  updatePlayer(g, input, dt)
  updateSpawner(g, dt)
  rebuildGrid(g)
  updateEnemies(g, dt)
  rebuildGrid(g)
  updateMoves(g, dt)
  updateAttacks(g, dt)
  updatePickups(g, dt)
  updateEffects(g, dt)

  g.camera.x = g.player.x - g.view.w / 2
  g.camera.y = g.player.y - 10 - g.view.h / 2

  if (g.phase === 'playing' && g.pendingLevelUps > 0) advancePhase(g)
}
