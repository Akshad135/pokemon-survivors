import { dir8, type Vec } from '../engine/math'
import { createRng } from '../engine/rng'
import { createGrid } from '../engine/spatial'
import { bodyOf } from '../data/bodies'
import type { EnemyId } from '../data/enemies'
import { PLAYABLE, type PlayableId } from '../data/hatchlings'
import { BAG_ITEMS } from './bag'
import { updateAttacks } from './attacks'
import { createBiome, updateBiome } from './biomes'
import { healPlayer } from './combat'
import { createDexLog } from './dex'
import { DEFAULT_DIFFICULTY, type Difficulty } from './difficulty'
import { updateBosses, updateHazards } from './bosses'
import { updateConsumables } from './consumables'
import { updateEffects } from './effects'
import { updateEndless } from './endlessSystem'
import { rebuildGrid, updateEnemies } from './enemies'
import { applyOffer, loadout, pendingEvolution, recomputeStats, rollOffers, xpFor } from './leveling'
import { createMapEvents, updateMapEvents } from './mapEvents'
import { createMegaState, updateMega, updateMegaIntro } from './mega'
import { NO_RANKS, runCharges, type Ranks } from './meta'
import { isManual, MOVES, moveStats, type MoveDef } from './moves'
import { afterCast, updateMoveKit } from './moveHooks'
import { updateSignatures } from './signatures'
import { createSpecialState, specialBusy, specialSpeedFactor, updateSpecial } from './special'
import { updatePickups } from './pickups'
import { rollShiny, SHINY_ODDS, shinyBoost } from './shiny'
import { updateProps } from './props'
import { withOutbreak } from './outbreak'
import { createTerrain, groundAt, playerWaterPace, updateTerrain } from './terrain'
import { drawRoster, type Roster } from './roster'
import { createRiftState } from './rift'
import { updateArena, updateArenaFall } from './riftArena'
import { updateRiftPortal } from './riftPortal'
import { updateSightings } from './sightings'
import { updateSpawner } from './spawner'
import { updateStatuses } from './statusSystem'
import { createTally } from './tally'
import { createWeather, updateWeather } from './weather'
import { updateTraits } from './traitSystem'
import { BASE_STATS } from './stats'
import { TERRAIN } from '../data/terrain'
import type { Game, Offer } from './types'
import * as dm from '../engine/dmath'

export const EVOLUTION_TIME = 4.6

export const playerDex = (g: Game) => PLAYABLE[g.starter].line[g.player.stage]!.dex

/** What the save brings into a run besides the Poké Mart ranks. */
export type RunOptions = {
  /** Picked on the starter select screen; Normal when omitted. */
  difficulty?: Difficulty
  /** The run plays shiny from the start (a shiny hatch, or the shiny starter picked): the whole run uses its shiny form. */
  shiny?: boolean
  /** The player never had an egg, so the first egg roll can't miss (`rollEgg`). */
  luckyEgg?: boolean
  /** The day's outbreak species (`game/outbreak.ts`), put in every stage of the roster (`withOutbreak`, which a roster drawn ahead may already have). */
  outbreak?: EnemyId | null
  /** Bag items the run uses (`game/bag.ts`): a Lure doubles wild shinies, an Incense egg drops. */
  lure?: boolean
  incense?: boolean
}

/**
 * A fresh run. Pass `roster` when the shell drew it ahead of time to preload
 * its sprites (see `drawRoster`); otherwise it's drawn from the run's rng.
 */
export const createGame = (
  starter: PlayableId,
  view: Game['view'],
  seed = Date.now(),
  ranks: Ranks = NO_RANKS,
  roster?: Roster,
  options: RunOptions = {},
): Game => {
  const def = PLAYABLE[starter]
  const rng = createRng(seed)
  const lucky = rollShiny(rng, SHINY_ODDS.player)
  const shiny = lucky || options.shiny === true
  const g: Game = {
    starter,
    difficulty: options.difficulty ?? DEFAULT_DIFFICULTY,
    rng,
    time: 0,
    phase: 'playing',
    nextId: 1,
    player: {
      x: 0, y: 0,
      facing: { x: 1, y: 0 },
      vx: 0, vy: 0,
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
      radius: Math.max(6, Math.round(bodyOf(def.line[0].dex).bodyW * 0.3)),
      animTime: 0,
      shiny,
      luckyShiny: lucky,
      walked: 0,
      still: 0,
      guard: null,
      hidden: null,
      drain: { left: 0, at: 0 },
      moveBuffs: [],
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
    mega: createMegaState(),
    kills: 0,
    ranks,
    coins: 0,
    ...runCharges(ranks),
    damageByMove: {},
    pendingLevelUps: 0,
    offers: [],
    evolution: null,
    roster: withOutbreak(roster ?? drawRoster(rng), options.outbreak ?? null),
    spawnBudget: 0,
    nextEvent: 0,
    bossId: null,
    props: [],
    brokenProps: new Set(),
    terrain: createTerrain(seed),
    buffs: [],
    mapEvents: createMapEvents(),
    revives: 0,
    flash: 0,
    biome: createBiome(),
    weather: createWeather(),
    traits: { seen: new Set(), nextIntro: 0 },
    rift: createRiftState(),
    endless: null,
    tally: createTally(),
    eggs: { found: [], lucky: options.luckyEgg === true, boost: options.incense ? BAG_ITEMS.incense.boost : 1 },
    outbreak: options.outbreak ?? null,
    shinyBoost: shinyBoost(ranks.shinyCharm, options.lure === true),
    dexLog: createDexLog(),
    // Only a lucky roll is news: a shiny picked (or hatched) is shiny every run.
    events: lucky && !options.shiny ? [{ kind: 'shinyPlayer' }] : [],
  }
  recomputeStats(g)
  g.player.hp = g.player.stats.maxHp
  return g
}

/**
 * Per-tick player input, as plain data so the simulation stays DOM-free. `mega`
 * presses the Mega button and `lunge` fires the manual moves (Quick Attack).
 */
export type StepInput = { move: Vec; special: boolean; mega?: boolean; lunge?: boolean }

const updatePlayer = (g: Game, input: Vec, dt: number) => {
  const p = g.player
  const slow = specialSpeedFactor(g)
  const moving = slow > 0 && Math.abs(input.x) + Math.abs(input.y) > 0.05
  // A speed factor of 0 means the special is dashing the player around.
  p.moving = moving || slow === 0
  const ground = groundAt(g, p.x, p.y)
  const pace = p.stats.speed * slow * (ground === 'water' ? playerWaterPace(g) : 1)
  const vx = moving ? input.x * pace : 0
  const vy = moving ? input.y * pace : 0
  // On ice the player's speed only slowly follows the stick, so they slide.
  const ice = ground === 'ice' && slow > 0
  if (ice) {
    const grip = 1 - dm.exp(-TERRAIN.iceGrip * dt)
    p.vx += (vx - p.vx) * grip
    p.vy += (vy - p.vy) * grip
  } else {
    p.vx = vx
    p.vy = vy
  }
  if (moving || (ice && Math.abs(p.vx) + Math.abs(p.vy) > 1)) {
    const dx = p.vx * dt
    const dy = p.vy * dt
    p.x += dx
    p.y += dy
    p.walked += dm.hypot(dx, dy)
  }
  if (moving) {
    const len = dm.hypot(input.x, input.y)
    p.facing = { x: input.x / len, y: input.y / len }
    p.dir = dir8(input.x, input.y)
  }
  p.still = p.moving ? 0 : p.still + dt
  p.animTime += dt
  p.iframes = Math.max(0, p.iframes - dt)
  p.hurt = Math.max(0, p.hurt - dt)
  healPlayer(g, p.stats.regen * dt)
}

/**
 * Casts every move whose cooldown ran out. A manual move instead waits,
 * recharged, for a `press`, and holds it while the special moves the player.
 */
const updateMoves = (g: Game, press: boolean, dt: number) => {
  for (const owned of g.player.moves) {
    if (isManual(owned.id)) {
      owned.cooldown = Math.max(0, owned.cooldown - dt)
      if (!press || owned.cooldown > 0 || specialBusy(g.special)) continue
    } else {
      owned.cooldown -= dt
      if (owned.cooldown > 0) continue
    }
    const s = moveStats(owned.id, owned.level, g.player.stats)
    const def: MoveDef = MOVES[owned.id]
    def.fire(g, s, owned)
    owned.cooldown += s.cooldown
    afterCast(g, owned)
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
  p.radius = Math.max(6, Math.round(bodyOf(evo.to).bodyW * 0.3))
  recomputeStats(g)
  healPlayer(g, p.stats.maxHp * 0.5)
  g.evolution = null
  g.events.push({ kind: 'evolved', to: evo.to })
  advancePhase(g)
}

/** One fixed-timestep simulation tick. */
export const step = (g: Game, input: StepInput, dt: number) => {
  if (g.phase === 'evolving') return updateEvolution(g, dt)
  if (g.phase !== 'playing') return
  // The Mega Evolution plays with the world held still.
  if (updateMegaIntro(g, dt)) return
  // So does the rift throwing a fainted player back out.
  if (updateArenaFall(g, dt)) return
  if (g.hitstop > 0) {
    g.hitstop -= dt
    return
  }

  g.time += dt
  // Inside a rift arena the horde and the map wait outside: no spawns, props,
  // map events, weather or biome changes. A biome change that came due meanwhile
  // plays on the way out.
  const inArena = g.rift.arena !== null
  if (!inArena) {
    updateBiome(g)
    updateWeather(g, dt)
  }
  updatePlayer(g, input.move, dt)
  updateMega(g, input.mega === true, dt)
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
  updateMoveKit(g, dt)
  updateSignatures(g, dt)
  updateMoves(g, input.lunge === true, dt)
  updateAttacks(g, dt)
  updateTerrain(g, dt)
  if (!inArena) {
    updateProps(g, dt)
    updateMapEvents(g, dt)
  }
  updatePickups(g, dt)
  updateConsumables(g, dt)
  updateEffects(g, dt)

  g.camera.x = g.player.x - g.view.w / 2
  g.camera.y = g.player.y - 10 - g.view.h / 2
  updateSightings(g, dt)

  if (g.phase === 'playing' && g.pendingLevelUps > 0) advancePhase(g)
}
