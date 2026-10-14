import { dir8, type Vec } from '../engine/math'
import { createRng } from '../engine/rng'
import { createGrid } from '../engine/spatial'
import { STARTERS, type StarterId } from '../data/starters'
import { sprites } from '../render/sprites'
import { updateAttacks } from './attacks'
import { createBiome, updateBiome } from './biomes'
import { updateBosses, updateHazards } from './bosses'
import { updateConsumables } from './consumables'
import { updateEffects } from './effects'
import { updateEndless } from './endlessSystem'
import { rebuildGrid, updateEnemies } from './enemies'
import { applyOffer, loadout, pendingEvolution, recomputeStats, rollOffers, xpFor } from './leveling'
import { createMapEvents, updateMapEvents } from './mapEvents'
import { NO_RANKS, runCharges, type Ranks } from './meta'
import { MOVES, moveStats } from './moves'
import { createSpecialState, specialSpeedFactor, updateSpecial } from './special'
import { updatePickups } from './pickups'
import { rollShiny, SHINY_ODDS } from './shiny'
import { updateProps } from './props'
import { createRiftState } from './rift'
import { updateArena } from './riftArena'
import { updateRiftPortal } from './riftPortal'
import { updateSpawner } from './spawner'
import { updateStatuses } from './statusSystem'
import { createWeather, updateWeather } from './weather'
import { updateTraits } from './traitSystem'
import { BASE_STATS } from './stats'
import type { Game, Offer } from './types'

export const EVOLUTION_TIME = 4.6

export const playerDex = (g: Game) => STARTERS[g.starter].line[g.player.stage]!.dex

export const createGame = (starter: StarterId, view: Game['view'], seed = Date.now(), ranks: Ranks = NO_RANKS): Game => {
  const def = STARTERS[starter]
  const rng = createRng(seed)
  const shiny = rollShiny(rng, SHINY_ODDS.player)
  const g: Game = {
    starter,
    rng,
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
      shiny,
    },
    enemies: [],
    attacks: [],
    hazards: [],
    pickups: [],
    particles: [],
    texts: [],
    grid: createGrid(32),
    view,
    camera: { x: -view.w / 2, y: -view.h / 2 },
    shake: 0,
    hitstop: 0,
    special: createSpecialState(),
    kills: 0,
    ranks,
    coins: 0,
    ...runCharges(ranks),
    damageByMove: {},
    pendingLevelUps: 0,
    offers: [],
    evolution: null,
    spawnBudget: 0,
    nextEvent: 0,
    bossId: null,
    props: [],
    brokenProps: new Set(),
    buffs: [],
    mapEvents: createMapEvents(),
    revives: 0,
    flash: 0,
    biome: createBiome(),
    weather: createWeather(),
    traits: { seen: new Set(), nextIntro: 0 },
    rift: createRiftState(),
    endless: null,
    events: shiny ? [{ kind: 'shinyPlayer' }] : [],
  }
  recomputeStats(g)
  g.player.hp = g.player.stats.maxHp
  return g
}

/** Per-tick player input, as plain data so the simulation stays DOM-free. */
export type StepInput = { move: Vec; special: boolean }

const updatePlayer = (g: Game, input: Vec, dt: number) => {
  const p = g.player
  const slow = specialSpeedFactor(g)
  const moving = slow > 0 && Math.abs(input.x) + Math.abs(input.y) > 0.05
  // A speed factor of 0 means the special is dashing the player around.
  p.moving = moving || slow === 0
  if (moving) {
    p.x += input.x * p.stats.speed * slow * dt
    p.y += input.y * p.stats.speed * slow * dt
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

/** Spends a Poké Mart reroll: draws a fresh set of level-up offers. */
export const rerollOffers = (g: Game) => {
  if (g.phase !== 'levelup' || g.rerolls <= 0) return
  g.rerolls--
  g.offers = rollOffers(loadout(g), g.rng, 3)
}

/** Spends a Poké Mart skip: discards this level-up without picking anything. */
export const skipLevelUp = (g: Game) => {
  if (g.phase !== 'levelup' || g.skips <= 0) return
  g.skips--
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
export const step = (g: Game, input: StepInput, dt: number) => {
  if (g.phase === 'evolving') return updateEvolution(g, dt)
  if (g.phase !== 'playing') return
  if (g.hitstop > 0) {
    g.hitstop -= dt
    return
  }

  g.time += dt
  updateBiome(g)
  updateWeather(g, dt)
  // Inside a rift arena the horde and the map wait outside: no spawns, no props.
  const inArena = g.rift.arena !== null
  updatePlayer(g, input.move, dt)
  updateSpecial(g, input.special, dt)
  if (!inArena) updateSpawner(g, dt)
  rebuildGrid(g)
  updateEnemies(g, dt)
  updateBosses(g, dt)
  updateHazards(g, dt)
  updateStatuses(g, dt)
  updateRiftPortal(g, dt)
  updateArena(g, dt)
  updateEndless(g)
  rebuildGrid(g)
  updateTraits(g, dt)
  updateMoves(g, dt)
  updateAttacks(g, dt)
  if (!inArena) {
    updateProps(g, dt)
    updateMapEvents(g, dt)
  }
  updatePickups(g, dt)
  updateConsumables(g, dt)
  updateEffects(g, dt)

  g.camera.x = g.player.x - g.view.w / 2
  g.camera.y = g.player.y - 10 - g.view.h / 2

  if (g.phase === 'playing' && g.pendingLevelUps > 0) advancePhase(g)
}
