import { dir8, type Vec } from '../engine/math'
import { createRng } from '../engine/rng'
import { createGrid } from '../engine/spatial'
import { bodyOf } from '../data/bodies'
import { isLegend } from '../data/legends'
import type { EnemyId } from '../data/enemies'
import { isHidden } from '../data/abilities'
import { branchesAt } from '../data/branches'
import { PLAYABLE, type PlayableId } from '../data/hatchlings'
import { abilityImmune, abilityLuck, abilitySet, createAbilityState, grantAbility, updateAbility } from './abilities'
import { BAG_ITEMS } from './bag'
import { branchContext, drawBranches, playerForm } from './branch'
import { createAlphaClock, updateAlphas } from './alphas'
import { updateAttacks } from './attacks'
import { createBiome, updateBiome } from './biomes'
import { healPlayer } from './combat'
import { createDexLog } from './dex'
import { FRESH_LEVELUPS } from './learnsets'
import { DEFAULT_DIFFICULTY, type Difficulty } from './difficulty'
import { updateBosses, updateHazards } from './bosses'
import { createWorldHazards, updateWorldHazards } from './hazards'
import { updateConsumables } from './consumables'
import { burst, updateEffects } from './effects'
import { updateEndless } from './endlessSystem'
import { blastHorde, rebuildGrid, updateEnemies } from './enemies'
import {
  applyOffer, branchOffers, draftOffers, loadout, nothingToChoose, offerSubject, pendingEvolution, recomputeStats, rollOffers, shinyOfferOdds, xpFor,
  type RollOptions,
} from './leveling'
import { createMapEvents, updateMapEvents } from './mapEvents'
import { createCurseState } from './curses'
import { curseCast, decideCurse, updateCurses } from './curseSystem'
import { updateDuos } from './duoMoves'
import { createMegaState, updateMega, updateMegaIntro } from './mega'
import { NO_RANKS, runCharges, type Ranks } from './meta'
import { afterCast as afterModCast, echoStats, hasMod, MOD } from './mods'
import { forkAt, isManual, MOVES, moveStats, type CastStats, type MoveDef } from './moves'
import { afterCast, updateMoveKit } from './moveHooks'
import { updateSignatures } from './signatures'
import { createTmState, pickTm } from './tms'
import { updateVerbEvolved } from './verbEvolutions'
import { updateLegendary } from './legendary'
import { createSpecialState, specialBusy, specialSpeedFactor, updateSpecial } from './special'
import { AWAKENING, avoidLegend, createLegendState, formAfter, pendingAwakening, updateLegend } from './legend'
import { decidePokeball, updatePickups } from './pickups'
import { rollShiny, SHINY_ODDS, shinyBoost } from './shiny'
import { updateProps } from './props'
import { withOutbreak } from './outbreak'
import { createTerrain, groundAt, playerWaterPace, updateTerrain } from './terrain'
import { createLandmarkState, updateLandmarks, updateTunnel } from './landmarks'
import { drawRoster, type Roster } from './roster'
import { clockRuns, createRiftState } from './rift'
import { createPlaceState } from './place'
import { updatePlaceEntrance } from './placeEntrance'
import { updatePlace, updatePlaceFall, updatePlaceIntro } from './placeInterior'
import { roomOf } from './room'
import { SKY } from '../data/places'
import { updateArena, updateArenaFall } from './riftArena'
import { domainCamera, updateDomainScene } from './domain'
import { updateLegendScene } from './legendScene'
import { updateRiftPortal } from './riftPortal'
import { updateSightings } from './sightings'
import { updateSpawner } from './spawner'
import { createTension } from './tension'
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

/** Widest hitbox a legend gets, in px: Lugia's wings span 79 px; capped at a Charizard's (body 27 px), so a big legend isn't a bigger target for the horde and the bosses. */
export const LEGEND_RADIUS = 8

/** The player's hitbox from its sprite's body (data, so every device agrees); a legend's is capped (`LEGEND_RADIUS`). */
const playerRadius = (dex: number, legend: boolean) => {
  const r = Math.max(6, Math.round(bodyOf(dex).bodyW * 0.3))
  return legend ? Math.min(LEGEND_RADIUS, r) : r
}

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
      radius: playerRadius(def.line[0].dex, isLegend(starter)),
      animTime: 0,
      shiny,
      luckyShiny: lucky,
      walked: 0,
      still: 0,
      guard: null,
      hidden: null,
      drain: { left: 0, at: 0 },
      rooted: 0,
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
    freshMoves: 0,
    offers: [],
    evolution: null,
    branch: null,
    ability: createAbilityState(),
    // A legend never meets itself among the bosses (`avoidLegend`).
    roster: avoidLegend(withOutbreak(roster ?? drawRoster(rng), options.outbreak ?? null), starter),
    spawnBudget: 0,
    nextEvent: 0,
    bossId: null,
    props: [],
    brokenProps: new Set(),
    terrain: createTerrain(seed),
    buffs: [],
    mapEvents: createMapEvents(),
    curses: createCurseState(),
    revives: 0,
    flash: 0,
    biome: createBiome(),
    weather: createWeather(),
    traits: { seen: new Set(), nextIntro: 0 },
    rift: createRiftState(),
    place: createPlaceState(),
    landmarks: createLandmarkState(),
    tm: createTmState(),
    endless: null,
    tally: createTally(),
    eggs: { found: [], lucky: options.luckyEgg === true, boost: options.incense ? BAG_ITEMS.incense.boost : 1 },
    outbreak: options.outbreak ?? null,
    shinyBoost: shinyBoost(ranks.shinyCharm, options.lure === true),
    dexLog: createDexLog(),
    // Only a lucky roll is news: a shiny picked (or hatched) is shiny every run.
    events: lucky && !options.shiny ? [{ kind: 'shinyPlayer' }] : [],
    tension: createTension(),
    alphas: createAlphaClock(options.difficulty ?? DEFAULT_DIFFICULTY),
    worldHazards: createWorldHazards(),
    prize: null,
    legend: createLegendState(starter),
    now: 0,
    legendScene: null,
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

/** How a run rolls its level-up cards: rarity on, with its Shiny Charm's odds and the luck of an ability (Jirachi's Serene Grace). */
const rolling = (g: Game): RollOptions => {
  const luck = abilityLuck(g)
  return { shiny: shinyOfferOdds(g.ranks.shinyCharm) * luck.shiny, rare: luck.rare }
}

/**
 * Per-tick player input, as plain data so the simulation stays DOM-free. `mega`
 * presses the Mega button and `lunge` fires the manual moves (Quick Attack).
 */
export type StepInput = { move: Vec; special: boolean; mega?: boolean; lunge?: boolean }

const updatePlayer = (g: Game, input: Vec, dt: number) => {
  const p = g.player
  const slow = specialSpeedFactor(g)
  // Rooted (Giga Impact's recharge): the stick does nothing until it wears off.
  p.rooted = Math.max(0, p.rooted - dt)
  const moving = slow > 0 && p.rooted <= 0 && Math.abs(input.x) + Math.abs(input.y) > 0.05
  // A speed factor of 0 means the special is dashing the player around.
  p.moving = moving || slow === 0
  const ground = groundAt(g, p.x, p.y)
  const tailwind = g.place.inside?.id === 'sky' ? SKY.tailwind : 1
  const pace = p.stats.speed * slow * tailwind * (ground === 'water' ? playerWaterPace(g) : 1)
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
    curseCast(g)
  }
}

/**
 * After level-ups resolve: open the next level-up, ask where a branching
 * evolution goes, start an evolution, or resume. Exported for the dev console.
 */
export const advancePhase = (g: Game): void => {
  g.prize = null
  if (g.pendingLevelUps > 0) {
    g.phase = 'levelup'
    g.offers = rollOffers(loadout(g), g.rng, 3, rolling(g))
    g.events.push({ kind: 'levelup' })
    return
  }
  if (pendingAwakening(g) > 0) return startAwakening(g)
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

/** A legend's awakening starts: the evolution's scene, on the same species (in its new form, where it takes one). */
const startAwakening = (g: Game): void => {
  const s = g.legend
  const n = pendingAwakening(g)
  if (!s || n === 0) return advancePhase(g)
  const dex = playerDex(g)
  const form = formAfter(s.id, n)?.key
  g.phase = 'evolving'
  g.evolution = { from: dex, to: dex, t: 0, awakening: n, ...(form && { form }) }
  g.events.push({ kind: 'awaken', legend: s.id, n })
}

/**
 * The awakening lands: its stats, a heal, an Esquecer charge and an aura
 * burst that throws the horde back; the first one opens the Ability pick.
 */
const awaken = (g: Game, n: number): void => {
  const s = g.legend
  if (!s) return advancePhase(g)
  const p = g.player
  s.awakened = n
  recomputeStats(g)
  healPlayer(g, p.stats.maxHp * AWAKENING.heal)
  g.banishes++
  blastHorde(g, AWAKENING.push)
  const color = PLAYABLE[g.starter].color
  burst(g, p.x, p.y - 12, { colors: [color, '#ffffff', '#f8e8a0'], count: 80, speed: 190, ttl: 0.9, size: 2, drag: 3 })
  g.shake = Math.max(g.shake, 8)
  g.flash = Math.max(g.flash, 0.4)
  g.evolution = null
  g.events.push({ kind: 'awakened', legend: s.id, n, form: formAfter(s.id, n)?.key ?? null })
  if (g.ability.id === null) offerAbilities(g)
  else advancePhase(g)
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
 * evolution goes, the ability, whether to take a chest's cursed item or a
 * Poké Ball's new move or item, or a TM's choice.
 * Replays reach it through the `offer` event.
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
  // A TM's screen: learn, forget a move for it, or pass (`tms.ts`).
  if (g.phase === 'tm') {
    if (pickTm(g, offer)) advancePhase(g)
    return
  }
  if (g.phase === 'curse' && offer.kind === 'curse') {
    decideCurse(g, offer.id, offer.take)
    return advancePhase(g)
  }
  if (g.phase === 'pokeball') {
    decidePokeball(g, offer)
    return advancePhase(g)
  }
  if (g.phase !== 'levelup' || offer.kind === 'form' || offer.kind === 'ability' || offer.kind === 'curse' || offer.kind === 'tm' || offer.kind === 'forget' || offer.kind === 'pass') return
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
  g.freshMoves = Math.max(0, g.freshMoves - 1)
  advancePhase(g)
}

/**
 * Takes the level-ups with nothing to choose (`nothingToChoose`: only the Oran
 * Berry), one after another, so no screen opens for them. The shell calls it,
 * and `record` notes each pick first: a replay makes them as `offer` events,
 * like a tap. Returns how many it took.
 */
export const takeBerryLevelUps = (g: Game, record: (index: number) => void) => {
  let taken = 0
  while (g.phase === 'levelup' && nothingToChoose(g.offers)) {
    record(0)
    chooseOffer(g, g.offers[0]!)
    taken++
  }
  return taken
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
  g.freshMoves = Math.max(0, g.freshMoves - 1)
  advancePhase(g)
}

const updateEvolution = (g: Game, dt: number) => {
  const evo = g.evolution
  if (!evo) return
  evo.t += dt
  if (evo.t < EVOLUTION_TIME) return
  if (evo.awakening) return awaken(g, evo.awakening)
  const p = g.player
  p.stage++
  p.radius = playerRadius(evo.to, false)
  recomputeStats(g)
  healPlayer(g, p.stats.maxHp * 0.5)
  // Every evolution earns an Esquecer charge (`banishOffer`), and the moves it unlocks come up more for a while.
  g.banishes++
  g.freshMoves = FRESH_LEVELUPS
  g.evolution = null
  g.events.push({ kind: 'evolved', to: evo.to })
  if (g.ability.id === null) offerAbilities(g)
  else advancePhase(g)
}

/** One fixed-timestep simulation tick. */
export const step = (g: Game, input: StepInput, dt: number) => {
  if (g.phase === 'evolving') return updateEvolution(g, dt)
  if (g.phase !== 'playing') return
  // The Mega Evolution plays with the world held still, and so does a dungeon floor's title card.
  if (updateMegaIntro(g, dt)) return
  if (updatePlaceIntro(g, dt)) return
  // So does the rift throwing a fainted player back out, or a rescue out of a place, a domain's encounter and capture scenes and a wave legendary's.
  if (updateArenaFall(g, dt)) return
  if (updateDomainScene(g, dt)) return
  if (updateLegendScene(g, dt)) return
  if (updatePlaceFall(g, dt)) return
  if (g.hitstop > 0) {
    g.hitstop -= dt
    return
  }

  // The run clock stops inside a rift (`clockRuns`); `now` never does.
  g.now += dt
  if (clockRuns(g)) g.time += dt
  // Inside a room (a rift arena, a place) the horde and the map wait outside:
  // no regular spawns, props, map events, weather or biome changes. A biome
  // change that came due meanwhile plays on the way out.
  const inArena = roomOf(g) !== null
  if (!inArena) {
    updateBiome(g)
    updateWeather(g, dt)
  }
  // Under a tunnel's ridge the player is carried through instead of walking.
  if (!updateTunnel(g, dt)) updatePlayer(g, input.move, dt)
  updateCurses(g)
  if (updateLegend(g)) recomputeStats(g)
  updateMega(g, input.mega === true, dt)
  if (updateAbility(g, dt)) recomputeStats(g)
  updateSpecial(g, input.special, dt)
  if (!inArena) updateSpawner(g, dt)
  rebuildGrid(g)
  updateAlphas(g, dt)
  updateEnemies(g, dt)
  updateBosses(g, dt)
  updateWorldHazards(g, dt)
  updateHazards(g, dt)
  updateStatuses(g, dt)
  updateRiftPortal(g, dt)
  updateArena(g, dt)
  updatePlaceEntrance(g, dt)
  updatePlace(g, dt)
  updateLandmarks(g, dt)
  updateEndless(g)
  rebuildGrid(g)
  updateTraits(g, dt)
  updateMoveKit(g, dt)
  updateSignatures(g, dt)
  updateLegendary(g)
  updateMoves(g, input.lunge === true, dt)
  updateDuos(g, dt)
  updateAttacks(g, dt)
  updateVerbEvolved(g, dt)
  updateTerrain(g, dt)
  // Checked again: the player may have stepped into a room this very tick.
  if (!roomOf(g)) {
    updateProps(g, dt)
    updateMapEvents(g, dt)
  }
  updatePickups(g, dt)
  updateConsumables(g, dt)
  updateEffects(g, dt)

  // In a legendary's domain the camera looks ahead and frames the fight (`domainCamera`); elsewhere it sits on the player.
  if (!domainCamera(g, dt)) {
    g.camera.x = g.player.x - g.view.w / 2
    g.camera.y = g.player.y - 10 - g.view.h / 2
  }
  updateSightings(g, dt)

  if (g.phase === 'playing' && g.pendingLevelUps > 0) advancePhase(g)
}
