import { dir8, type Vec } from '../engine/math'
import { createRng } from '../engine/rng'
import { createGrid } from '../engine/spatial'
import { bodyOf } from '../data/bodies'
import type { EnemyId } from '../data/enemies'
import { isHidden } from '../data/abilities'
import { branchesAt } from '../data/branches'
import { PLAYABLE, type PlayableId } from '../data/hatchlings'
import { abilityImmune, abilitySet, createAbilityState, grantAbility, updateAbility } from './abilities'
import { BAG_ITEMS } from './bag'
import { branchContext, drawBranches, playerForm } from './branch'
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
import {
  applyOffer, branchOffers, draftOffers, loadout, offerSubject, pendingEvolution, recomputeStats, rollOffers, shinyOfferOdds, xpFor,
  type RollOptions,
} from './leveling'
import { createMapEvents, updateMapEvents } from './mapEvents'
import { createMegaState, updateMega, updateMegaIntro } from './mega'
import { NO_RANKS, runCharges, type Ranks } from './meta'
import { afterCast as afterModCast, echoStats, hasMod, MOD } from './mods'
import { forkAt, isManual, MOVES, moveStats, type CastStats, type MoveDef } from './moves'
import { afterCast, updateMoveKit } from './moveHooks'
import { updateSignatures } from './signatures'
import { updateLegendary } from './legendary'
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
import type { Game, Offer, OwnedMove } from './types'
import * as dm from '../engine/dmath'

export const EVOLUTION_TIME = 4.6

export const playerDex = (g: Game) => playerForm(g).dex

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
  /** Opens the run on the opening draft (`draftOffers`): three moves of the learnset to pick the second move from. */
  draft?: boolean
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
      moves: [{ id: def.signature, level: 1, cooldown: 0.4, path: 0 }],
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
    banished: new Set(),
    castMods: 0,
    damageByMove: {},
    pendingLevelUps: 0,
    offers: [],
    evolution: null,
    branch: null,
    ability: createAbilityState(),
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
  if (options.draft) {
    g.phase = 'levelup'
    g.pendingLevelUps = 1
    g.offers = draftOffers(loadout(g), g.rng)
  }
  return g
}

/** Whether the level-up on screen is the opening draft: the run's clock only starts once it's picked. */
export const drafting = (g: Game) => g.phase === 'levelup' && g.time === 0

/** How a run rolls its level-up cards: rarity on, with its Shiny Charm's odds. */
const rolling = (g: Game): RollOptions => ({ shiny: shinyOfferOdds(g.ranks.shinyCharm) })

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
  const ice = ground === 'ice' && slow > 0 && !abilityImmune(g, 'terrain')
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

/** Fires a move with its fork mods stamped on what it spawns (`mods.ts`); an Echo schedules its re-cast. */
const castMove = (g: Game, owned: OwnedMove, s: CastStats) => {
  const from = g.attacks.length
  g.castMods = s.mods
  const def: MoveDef = MOVES[owned.id]
  def.fire(g, s, owned)
  g.castMods = 0
  afterModCast(g, from, s)
  if (hasMod(s.mods, 'echo')) owned.echo = MOD.echo.delay
}

/**
 * Casts every move whose cooldown ran out. A manual move instead waits,
 * recharged, for a `press`, and holds it while the special moves the player.
 */
const updateMoves = (g: Game, press: boolean, dt: number) => {
  for (const owned of g.player.moves) {
    if (owned.echo !== undefined && owned.echo > 0) {
      owned.echo -= dt
      if (owned.echo <= 0) castMove(g, owned, echoStats(moveStats(owned.id, owned.level, g.player.stats, owned.path)))
    }
    if (isManual(owned.id)) {
      owned.cooldown = Math.max(0, owned.cooldown - dt)
      if (!press || owned.cooldown > 0 || specialBusy(g.special)) continue
    } else {
      owned.cooldown -= dt
      if (owned.cooldown > 0) continue
    }
    const s = moveStats(owned.id, owned.level, g.player.stats, owned.path)
    castMove(g, owned, s)
    owned.cooldown += s.cooldown
    afterCast(g, owned)
  }
}

/**
 * After level-ups resolve: open the next level-up, ask where a branching
 * evolution goes, start an evolution, or resume. Exported for the dev console.
 */
export const advancePhase = (g: Game) => {
  if (g.pendingLevelUps > 0) {
    g.phase = 'levelup'
    g.offers = rollOffers(loadout(g), g.rng, 3, rolling(g))
    g.events.push({ kind: 'levelup' })
    return
  }
  if (!pendingEvolution(g)) {
    g.phase = 'playing'
    return
  }
  const branches = g.branch === null ? branchesAt(g.starter, g.player.stage + 1) : []
  if (branches.length > 0) {
    g.phase = 'branch'
    g.offers = drawBranches(g.rng, branches, branchContext(g)).map(({ id, favor }) => ({ kind: 'form', id, favor }))
    g.events.push({ kind: 'branchChoice' })
    return
  }
  startEvolution(g)
}

const startEvolution = (g: Game) => {
  const evo = pendingEvolution(g)
  if (!evo) return advancePhase(g)
  g.phase = 'evolving'
  g.evolution = { ...evo, t: 0 }
  g.events.push({ kind: 'evolve', ...evo })
}

/** After the first evolution: the abilities to pick from (Honedge's lone Stance Change is just granted). Exported for the dev console. */
export const offerAbilities = (g: Game) => {
  const set = abilitySet(g.starter, g.branch)
  if (set.length === 1) {
    grantAbility(g, set[0])
    recomputeStats(g)
    return advancePhase(g)
  }
  g.phase = 'ability'
  g.offers = set.map((id, i) => ({ kind: 'ability', id, hidden: isHidden(set, i) }))
}

/** Whether the cards on screen are a fork's two branches (picked from a move card that reached one). */
export const choosingBranch = (g: Game) => g.offers.some((o) => o.kind === 'branch')

/**
 * The player's pick from `offers`: a level-up upgrade, where a branching
 * evolution goes, or the ability. Replays reach it through the `offer` event.
 * A move card that reaches a fork opens its two branches instead (picked the
 * same way); a shiny card is a free pick, so a fresh set of cards follows
 * without using the level-up up.
 */
export const chooseOffer = (g: Game, offer: Offer) => {
  if (g.phase === 'branch' && offer.kind === 'form') {
    g.branch = offer.id
    return startEvolution(g)
  }
  if (g.phase === 'ability' && offer.kind === 'ability') {
    grantAbility(g, offer.id)
    recomputeStats(g)
    return advancePhase(g)
  }
  if (g.phase !== 'levelup' || offer.kind === 'form' || offer.kind === 'ability') return
  if (offer.kind === 'move' && forkAt(offer.id, offer.level)) {
    g.offers = branchOffers(offer)
    return
  }
  applyOffer(g, offer)
  if ('rarity' in offer && offer.rarity === 'shiny') {
    g.offers = rollOffers(loadout(g), g.rng, 3, rolling(g))
    g.events.push({ kind: 'shinyOffer' })
    return
  }
  g.pendingLevelUps--
  advancePhase(g)
}

/** Spends a Poké Mart reroll: draws a fresh set of level-up offers (a fresh draft at the start). */
export const rerollOffers = (g: Game) => {
  if (g.phase !== 'levelup' || g.rerolls <= 0 || choosingBranch(g)) return
  g.rerolls--
  g.offers = drafting(g) ? draftOffers(loadout(g), g.rng) : rollOffers(loadout(g), g.rng, 3, rolling(g))
}

/** Whether a card can be forgotten: moves and items can, berries, evolutions and fork branches can't. */
export const canBanish = (offer: Offer) => offer.kind === 'move' || offer.kind === 'item'

/**
 * Spends an Esquecer charge on the card at `index`: its move or item never
 * comes back this run, and that slot alone is drawn again (from the
 * learnset's new moves during the opening draft). The slot changes in place,
 * so the shell keeps the screen and redraws just that card.
 */
export const banishOffer = (g: Game, index: number) => {
  const offer = g.offers[index]
  if (g.phase !== 'levelup' || g.banishes <= 0 || !offer || !canBanish(offer)) return
  const id = offerSubject(offer)
  if (id === null) return
  g.banishes--
  g.banished.add(id)
  const shown = g.offers.filter((_, i) => i !== index)
  const ids = new Set(shown.map(offerSubject))
  const fresh = drafting(g)
    ? draftOffers({ ...loadout(g), banished: new Set([...g.banished, ...shown.flatMap((o) => (o.kind === 'move' ? [o.id] : []))]) }, g.rng, 1)
    : rollOffers(loadout(g), g.rng, 1, { ...rolling(g), shown })
  const next = fresh.find((o) => !ids.has(offerSubject(o))) ?? { kind: 'berry' }
  g.offers[index] = next
  g.events.push({ kind: 'banish' })
}

/** Spends a Poké Mart skip: discards this level-up without picking anything. */
export const skipLevelUp = (g: Game) => {
  if (g.phase !== 'levelup' || g.skips <= 0 || choosingBranch(g)) return
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
  // Every evolution earns an Esquecer charge (`banishOffer`).
  g.banishes++
  g.evolution = null
  g.events.push({ kind: 'evolved', to: evo.to })
  if (g.ability.id === null) offerAbilities(g)
  else advancePhase(g)
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
  if (updateAbility(g, dt)) recomputeStats(g)
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
  updateLegendary(g)
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
