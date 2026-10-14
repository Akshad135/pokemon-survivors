import '@fontsource/press-start-2p'
import '@fontsource/vt323'
import './ui/style.css'

import { playCry, playSfx, unlockAudio, type Sfx } from './engine/audio'
import { createPadButton, createPadKeys } from './engine/gamepad'
import { createInput } from './engine/input'
import { currentTheme, duckMusic, playTheme, type ThemeId } from './engine/music'
import { context2d } from './engine/pixelart'
import { fitView } from './engine/viewport'
import { createRng } from './engine/rng'
import { BIOME_ORDER, BIOMES, type BiomeId, type WeatherId } from './data/biomes'
import { RIFT, RIFT_LEGENDS } from './data/rifts'
import { ENEMIES, type EnemyDef, type EnemyId } from './data/enemies'
import { ITEMS } from './data/items'
import type { TraitId } from './data/traits'
import { REGIONS, STARTERS, starterDex, type StarterId } from './data/starters'
import { track } from './analytics'
import { CONSUMABLES } from './game/consumables'
import { setBiome } from './game/biomes'
import { spawnEnemy } from './game/enemies'
import { makeShiny } from './game/shiny'
import { MAP_EVENT_KINDS, MAP_EVENTS, spawnMapEvent, type MapEventKind } from './game/mapEvents'
import { MEOWTH_DEX } from './game/mapEventRules'
import { chooseOffer, createGame, playerDex, rerollOffers, skipLevelUp, step } from './game/game'
import { ENDLESS, REAPER } from './game/endless'
import { continueEndless } from './game/endlessSystem'
import { riftDevTools } from './game/riftDev'
import { dexNews, recordRun, type Pokedex } from './game/dex'
import { runEarnings, wonRun } from './game/meta'
import { biomeWeight, drawRoster, rosterSchedule, type Roster } from './game/roster'
import { MOVES } from './game/moves'
import type { Game, GameEvent, Phase } from './game/types'
import { setWeather } from './game/weather'
import { render } from './render/draw'
import { drawJoystick } from './render/joystick'
import { loadAll, loadSpecies, portraitUrl, preloadShinies, sprites, streamSpecies } from './render/sprites'
import { setMarkerInsets } from './render/mapEvents'
import { consumableIcon } from './render/props'
import { createTitleScene, drawTitleScene, stepTitleScene } from './render/titleScene'
import { weatherIcon } from './render/weather'
import { locale, LOCALES, setLocale, t, type Locale } from './i18n'
import { h, rich } from './ui/dom'
import { createHud, type Hud } from './ui/hud'
import { pokedexScreen } from './ui/pokedex'
import { depositPokeDollars, loadSave, updateSave } from './ui/save'
import { banner, flashScreen, levelUp, pauseMenu, results, textBox, toast, type Screen } from './ui/screens'
import { isSettingsOpen, openSettings, settings, toggleMute } from './ui/settings'
import { mapEventFeedback } from './ui/mapEvents'
import { martButton, shop } from './ui/shop'
import { starterSelect } from './ui/starterSelect'
import { titleButton, titleScreen } from './ui/title'

const STEP = 1 / 60

const canvas = document.querySelector<HTMLCanvasElement>('#game')!
const ui = document.querySelector<HTMLDivElement>('#ui')!
const ctx = context2d(canvas)
const input = createInput(canvas)
/** Internal canvas size in world px. Shared by reference with the running game. */
const view = { w: 480, h: 270 }
/** CSS px per world px (integer in device px, see `fitView`). */
let cssScale = 4
/** Set when the canvas was cleared and must be redrawn even if the game is paused. */
let dirty = true

/**
 * Sizes the low-res canvas to the visible viewport. Runs on resize, rotation
 * and iOS toolbar changes (visualViewport), and only touches the canvas when
 * the result actually changed, because resizing clears it.
 */
const resize = () => {
  const width = window.visualViewport?.width ?? window.innerWidth
  const height = window.visualViewport?.height ?? window.innerHeight
  const fit = fitView(width, height, window.devicePixelRatio || 1)
  if (fit.w === view.w && fit.h === view.h && fit.cssScale === cssScale) return
  view.w = fit.w
  view.h = fit.h
  cssScale = fit.cssScale
  canvas.width = view.w
  canvas.height = view.h
  canvas.style.width = `${view.w * cssScale}px`
  canvas.style.height = `${view.h * cssScale}px`
  document.documentElement.style.setProperty('--px', `${Math.max(2, Math.round(cssScale))}px`)
  context2d(canvas)
  dirty = true
  // Runs after layout (and after module init, so `run` exists by then).
  requestAnimationFrame(() => run && syncMarkerInsets())
}
// Rotation often reports stale sizes in the same tick, so re-measure on the next frame too.
const scheduleResize = () => (resize(), requestAnimationFrame(resize))
window.addEventListener('resize', scheduleResize)
window.addEventListener('orientationchange', scheduleResize)
window.visualViewport?.addEventListener('resize', scheduleResize)
resize()

/* ---------------- App state ---------------- */

type Run = {
  game: Game
  hud: Hud
  overlay: Screen | null
  /** Phase + offers snapshot the overlay was built for. */
  shown: { phase: Phase; offers: Game['offers'] } | null
  closeText: (() => void) | null
  /** ₽ of this run already in the wallet: a victory banks right away and again if the run goes on endless. */
  paid: number
  /** True once the run's end was reported to analytics. */
  reported: boolean
  /** The Pokédex as saved when the run began: banking folds the run's log into it, so banking twice changes nothing. */
  dexBase: Pokedex
}

let screen: Screen | null = null
let run: Run | null = null
let lastStarter: StarterId = 'charmander'
/** Special attack press (Space, touch button, gamepad A), consumed by the next simulation step. */
let specialQueued = false
const padA = createPadButton(0)
const padKeys = createPadKeys()
/** The meadow with wandering Pokémon behind every menu. Lives across screens, so it never pops. */
const scene = createTitleScene(Date.now())

const queueSpecial = () => {
  unlockAudio()
  if (run?.game.phase === 'playing') specialQueued = true
}

const setScreen = (next: Screen | null) => {
  screen?.dispose()
  screen = next
}

const changeLanguage = (next: Locale) => {
  setLocale(next)
  playSfx('select')
}

/** Set by the title's "press start": the music waits for it, even where the browser would autoplay. */
let pressedStart = false

/**
 * Title screen. `intro` shows the blinking "press start" first (boot, PWA launch);
 * coming back from the starter select goes straight to the menu. `focus` is the menu entry to highlight.
 */
const showTitle = (opts: { intro?: boolean; focus?: number } = {}) => {
  endRun()
  setScreen(
    titleScreen(ui, input, {
      play: () => showMenu(),
      // Every label is read at render time, so switching language just rebuilds the screen.
      language: (next) => (changeLanguage(next), showTitle()),
      ready: () => (pressedStart = true),
      // The language may change inside Settings, so closing them rebuilds the title on the same entry.
      settings: (focus) => openSettings(ui, input, () => showTitle({ focus })),
      pokedex: (focus) => pokedexScreen(ui, input, () => showTitle({ focus })),
    }, opts),
  )
}

/** Starter select, with the Poké Mart (top right) and the way back to the title (top left). */
const showMenu = (initial: StarterId = lastStarter) => {
  endRun()
  const select = starterSelect(ui, input, (id) => setTimeout(() => void startRun(id), 250), initial)
  const closeMart = martButton(ui, input, () => showShop())
  const closeBack = titleButton(ui, input, () => showTitle())
  setScreen({ ...select, dispose: () => (closeMart(), closeBack(), select.dispose()) })
}

const showShop = () => setScreen(shop(ui, input, () => showMenu()))

/**
 * Moves the run's ₽ not banked yet into the wallet and saves its Pokédex log.
 * Quitting keeps coins but forfeits the survival bonus, unless Mewtwo already
 * fell (victory or endless). Every species seen or defeated counts either way.
 */
const bankRun = (r: Run, withBonus: boolean) => {
  const g = r.game
  const total = withBonus ? runEarnings(g).total : g.coins
  if (total > r.paid) depositPokeDollars(total - r.paid)
  r.paid = Math.max(r.paid, total)
  updateSave((save) => ({ ...save, dex: recordRun(r.dexBase, g.dexLog) }))
}

/** Reports how the run ended, once. */
const reportRun = (r: Run) => {
  if (r.reported) return
  r.reported = true
  const g = r.game
  const outcome = g.endless ? 'endless' : g.phase === 'victory' || g.phase === 'gameover' ? g.phase : 'quit'
  track('run_end', { starter: g.starter, outcome, minute: Math.floor(g.time / 60), level: g.player.level, kills: g.kills })
}

const endRun = () => {
  if (!run) return
  bankRun(run, wonRun(run.game))
  reportRun(run)
  run.overlay?.dispose()
  run.closeText?.()
  run.hud.dispose()
  run = null
}

const loadingScreen = () => h('div', { class: 'screen' }, h('p', { class: 'loading blink' }, t().loading))

/** The next run's seed and wild cast, drawn ahead so the menus can warm up its first stage. */
type RunPlan = { seed: number; roster: Roster }

const planRun = (): RunPlan => {
  const seed = Date.now()
  return { seed, roster: drawRoster(createRng(seed), { weight: biomeWeight }) }
}

let upcoming = planRun()

/**
 * Species a run may need outside its drawn cast, with when they can first show
 * up: the fleeing Meowth, the rift legendaries and the endless mode's reaper.
 */
const EXTRAS = [
  { dex: MEOWTH_DEX, at: MAP_EVENTS.meowth.spawn.from },
  ...RIFT_LEGENDS.map((id) => ({ dex: ENEMIES[id].dex, at: RIFT.firstAt })),
  { dex: ENEMIES[REAPER].dex, at: ENDLESS.reaperAt },
]

/** Dex numbers of a cast's first stage, the only enemies a run waits for. */
const openingDex = (plan: RunPlan) => rosterSchedule(plan.roster).flatMap((s) => (s.at === 0 ? [s.dex] : []))

/**
 * Loads the starter's evolution line and the first stage's species, then starts
 * a fresh run. The rest of the cast (later stages, swarms, bosses) and the
 * `EXTRAS` stream in the background in the order the run needs them, then the
 * next run's opening.
 */
const startRun = async (starter: StarterId) => {
  setScreen(null)
  endRun()
  lastStarter = starter
  const loading = loadingScreen()
  ui.append(loading)
  const plan = upcoming
  upcoming = planRun()
  await loadAll([...starterDex(starter), ...openingDex(plan)])
  const save = loadSave()
  const game = createGame(starter, view, plan.seed, save.ranks, plan.roster)
  // A shiny run must not start in normal colors.
  if (game.player.shiny) await preloadShinies(starterDex(starter))
  loading.remove()
  run = { game, hud: runHud(game), overlay: null, shown: null, closeText: null, paid: 0, reported: false, dexBase: save.dex }
  track('run_start', { starter })
  const later = [...rosterSchedule(plan.roster).filter((s) => s.at > 0), ...EXTRAS].sort((a, b) => a.at - b.at)
  void streamSpecies([...later.map((s) => s.dex), ...openingDex(upcoming)], () => run?.game === game)
}

const runHud = (game: Game) => {
  const hud = createHud(ui, queueSpecial, () => game.phase === 'playing' && (game.phase = 'paused'))
  requestAnimationFrame(syncMarkerInsets)
  return hud
}

/** Measures the HUD (top bar, status box, special button) in world px, so map event arrows stay clear of it. */
const syncMarkerInsets = () => {
  const box = canvas.getBoundingClientRect()
  // Hidden elements (the touch special button on desktop) measure 0x0: they don't count.
  const rect = (sel: string) => {
    const r = ui.querySelector(sel)?.getBoundingClientRect()
    return r && r.height > 0 ? r : null
  }
  const bottomOf = (sel: string) => rect(sel)?.bottom ?? box.top
  const topOf = (sel: string) => rect(sel)?.top ?? box.bottom
  const top = bottomOf('.hud-row') - box.top
  const bottom = box.bottom - Math.min(topOf('.hud .status'), topOf('.special-button'))
  setMarkerInsets({ top: Math.max(0, top) / cssScale + 10, bottom: Math.max(0, bottom) / cssScale + 10, side: 14 })
}

/** Settings from the pause menu. The HUD reads its labels once, so a language switch rebuilds it. */
const runSettings = (r: Run, back: () => void) => {
  const before = locale()
  return openSettings(ui, input, () => {
    if (locale() !== before) {
      r.hud.dispose()
      r.hud = runHud(r.game)
      dirty = true
    }
    back()
  })
}

/** Rebuilds the modal overlay whenever the simulation phase (or offer set) changes. */
const syncOverlay = (r: Run) => {
  const g = r.game
  if (r.shown?.phase === g.phase && r.shown.offers === g.offers) return
  r.overlay?.dispose()
  r.overlay = null
  r.shown = { phase: g.phase, offers: g.offers }
  switch (g.phase) {
    case 'levelup':
      r.overlay = levelUp(ui, input, g, (offer) => chooseOffer(g, offer), { reroll: () => rerollOffers(g), skip: () => skipLevelUp(g) })
      break
    case 'paused':
      r.overlay = pauseMenu(ui, input, g, { resume: () => (g.phase = 'playing'), quit: () => showMenu(), settings: (back) => runSettings(r, back) })
      break
    case 'gameover':
    case 'victory':
      r.overlay = results(ui, input, g, () => void startRun(lastStarter), () => showMenu(), () => continueEndless(g), dexNews(r.dexBase, g.dexLog))
      break
  }
}

const offerLabel = (offer: Extract<GameEvent, { kind: 'pokeball' }>['offer']) => {
  const m = t().toast
  if (!offer) return m.pokeballEmpty
  if (offer.kind === 'move') return m.pokeballLevel(MOVES[offer.id].name, offer.level)
  if (offer.kind === 'item') return m.pokeballLevel(ITEMS[offer.id].name, offer.level)
  if (offer.kind === 'evolution') return m.pokeballEvolution(MOVES[offer.to].name)
  return m.pokeballBerry
}

/** Sounds of enemy traits: the warning (fuse lit, beam aimed, leap) and the moment it goes off. */
const TRAIT_SFX: Record<TraitId, Record<'warn' | 'fire', Sfx | null>> = {
  healer: { warn: null, fire: 'enemyPulse' },
  shield: { warn: null, fire: 'enemyPulse' },
  summoner: { warn: null, fire: 'enemyPulse' },
  kamikaze: { warn: 'selfDestruct', fire: 'blast' },
  beam: { warn: 'beamCharge', fire: 'beam' },
  leaper: { warn: 'leap', fire: 'quake' },
}

const handleEvent = (r: Run, e: GameEvent) => {
  const g = r.game
  switch (e.kind) {
    case 'hit': return playSfx(e.effective > 1 ? 'superHit' : 'hit', 45)
    case 'kill': return playSfx('kill', 50)
    case 'pickup': return playSfx('pickup', 35)
    case 'coin': return playSfx('coin', 60)
    case 'heal': return playSfx('heal')
    case 'hurt': return playSfx('hurt', 120)
    case 'levelup': return playSfx('levelUp')
    case 'thunder': return playSfx('thunder', 150)
    case 'quake': return playSfx('quake', 150)
    case 'special': {
      if (e.phase === 'release') return playSfx('specialBlast', 0)
      playSfx('specialCharge', 0)
      playCry(sprites(playerDex(g)).cry, 0.5)
      const who = STARTERS[g.starter].line[g.player.stage]!.name
      return toast(ui, rich(t().toast.used(who, e.name)), 1600)
    }
    case 'boss': {
      const def: EnemyDef = ENEMIES[e.enemy]
      if (def.legendary) {
        playSfx('legendary')
        playCry(sprites(def.dex).cry, 0.7)
        flashScreen(ui)
        return banner(ui, rich(t().toast.legendary(def.name)))
      }
      playSfx('boss')
      playCry(sprites(def.dex).cry, 0.5)
      return toast(ui, rich(t().toast.boss(def.name)), 3200)
    }
    case 'shiny': {
      const def = ENEMIES[e.enemy]
      playSfx('shiny')
      playCry(sprites(def.dex).cry, 0.4)
      return toast(ui, rich(t().toast.shiny(def.name)), 3200)
    }
    case 'caught': {
      const def = ENEMIES[e.enemy]
      playSfx('shiny')
      return toast(ui, h('span', { class: 'item-toast' }, h('img', { src: portraitUrl(def.dex, true), alt: '' }), rich(t().toast.caught(def.name))), 3600)
    }
    case 'shinyPlayer': {
      playSfx('shiny')
      return toast(ui, rich(t().toast.shinyPlayer(STARTERS[g.starter].name)), 3600)
    }
    case 'evolve': {
      playCry(sprites(e.from).cry)
      r.closeText?.()
      r.closeText = textBox(ui, t().toast.evolving(STARTERS[g.starter].line[g.player.stage]!.name))
      return
    }
    case 'evolved': {
      const line = STARTERS[g.starter].line
      playSfx('evolve')
      playCry(sprites(e.to).cry)
      r.closeText?.()
      r.closeText = null
      return toast(ui, t().toast.evolved(line[g.player.stage - 1]!.name, line[g.player.stage]!.name), 3500)
    }
    case 'moveEvolved':
      playSfx('evolve')
      playCry(sprites(playerDex(g)).cry, 0.3)
      return toast(ui, rich(t().toast.moveEvolved(MOVES[e.from].name, MOVES[e.to].name), { class: 'toast-evo' }), 3500)
    case 'pokeball':
      playSfx('levelUp')
      return toast(ui, t().toast.pokeball(offerLabel(e.offer)))
    case 'consumable': {
      const def = CONSUMABLES[e.item]
      playSfx(def.sfx)
      return toast(ui, h('span', { class: 'item-toast' }, h('img', { src: consumableIcon(e.item), alt: '' }), h('b', {}, def.name), t().consumables[e.item]), 2200)
    }
    case 'propBreak':
      return playSfx('break', 60)
    case 'mapEvent':
      return mapEventFeedback(ui, e.notice)
    case 'revive':
      playSfx('evolve')
      return toast(ui, h('span', { class: 'item-toast' }, h('img', { src: consumableIcon('revive'), alt: '' }), rich(t().toast.revive)), 3000)
    case 'gameover':
      bankRun(r, true)
      reportRun(r)
      playSfx('gameOver')
      return playCry(sprites(playerDex(g)).cry)
    case 'victory':
      bankRun(r, true)
      return playSfx('evolve')
    case 'biome': {
      const w = t().world
      playSfx('item')
      return banner(
        ui,
        h('span', { class: 'biome-banner' }, h('small', {}, w.area(BIOME_ORDER.indexOf(e.biome) + 1, BIOME_ORDER.length)), h('b', {}, w.biomes[e.biome])),
        2800,
      )
    }
    case 'weather':
      return weatherToast(e.weather, e.prev)
    case 'trait': {
      const sfx = TRAIT_SFX[e.trait][e.phase]
      if (sfx) playSfx(sfx, 120)
      return
    }
    case 'traitIntro': {
      const def = ENEMIES[e.enemy]
      playCry(sprites(def.dex).cry, 0.35)
      return toast(ui, h('span', { class: 'item-toast' }, h('img', { src: portraitUrl(def.dex), alt: '' }), rich(t().traits[e.trait](def.name))), 3400)
    }
    case 'riftOpen':
      playSfx('shiny')
      return toast(ui, rich(t().rifts.open), 3200)
    case 'riftClosed':
      return toast(ui, t().rifts.closed, 2000)
    case 'riftEnter': {
      const def = ENEMIES[e.enemy]
      playSfx('legendary')
      playCry(sprites(def.dex).cry, 0.7)
      flashScreen(ui)
      return banner(ui, rich(e.shiny ? t().rifts.enterShiny(def.name) : t().rifts.enter(def.name)))
    }
    case 'riftCleared':
      playSfx('evolve')
      return toast(ui, rich(t().rifts.cleared(ENEMIES[e.enemy].name), { class: 'toast-evo' }), 3500)
    case 'riftExit':
      if (e.outcome === 'collapse') {
        playSfx('quake')
        return toast(ui, t().rifts.collapse, 3000)
      }
      return
    case 'reaper':
      playSfx('legendary')
      playCry(sprites(ENEMIES[REAPER].dex).cry, 0.8)
      flashScreen(ui)
      return banner(ui, rich(e.defeats > 0 ? t().rifts.reaperBack : t().rifts.reaper))
    case 'reaperDown':
      playSfx('evolve')
      flashScreen(ui)
      return banner(ui, rich(t().rifts.reaperDown))
  }
}

/** Announces a weather change: what started (and what it does), or what just ended. */
const weatherToast = (next: WeatherId, prev: WeatherId) => {
  const w = t().world
  if (next === 'clear') {
    if (prev !== 'clear') toast(ui, h('span', { class: 'item-toast' }, h('img', { src: weatherIcon(prev), alt: '' }), w.weatherEnd[prev]), 2600)
    return
  }
  playSfx('select')
  toast(
    ui,
    h('span', { class: 'item-toast weather-toast' }, h('img', { src: weatherIcon(next), alt: '' }), h('span', {}, rich(w.weatherStart[next]), h('small', {}, w.weatherHint[next]))),
    3400,
  )
}

/* ---------------- Music ---------------- */

/** Silence until "press start", then menus play the village theme, a run its biome's theme, and a living boss takes over until it falls. */
const themeFor = (r: Run | null): ThemeId | null => {
  if (!pressedStart) return null
  if (!r || r.game.phase === 'gameover' || r.game.phase === 'victory') return 'menu'
  // A rift arena keeps the boss theme until the player is back, loot window included.
  return r.game.bossId !== null || r.game.rift.arena !== null ? 'boss' : BIOMES[r.game.biome.id].theme
}

/* ---------------- Global keys ---------------- */

input.onKey((key) => {
  unlockAudio()
  if (key === 'KeyM') toggleMute()
  if (!run) return
  const g = run.game
  if ((key === 'Escape' || key === 'KeyP') && g.phase === 'playing') g.phase = 'paused'
  if (key === 'Space') queueSpecial()
})
// Touch only counts as a user activation on pointerup/touchend (not pointerdown).
for (const type of ['pointerdown', 'pointerup', 'touchend'] as const) window.addEventListener(type, unlockAudio)

/* ---------------- Browser chrome ---------------- */

// No pinch/double-tap zoom, pull-to-refresh, rubber-banding or long-press menus.
// CSS `touch-action` covers most browsers; these guards cover iOS Safari quirks.
const blockDefault = (e: Event) => e.preventDefault()
document.addEventListener('contextmenu', blockDefault)
document.addEventListener('gesturestart', blockDefault)
document.addEventListener(
  'touchmove',
  (e) => {
    const inScrollable = e.target instanceof Element && e.target.closest('.screen')
    if (e.touches.length > 1 || !inScrollable) e.preventDefault()
  },
  { passive: false },
)

document.addEventListener('visibilitychange', () => {
  if (document.hidden && run?.game.phase === 'playing') run.game.phase = 'paused'
})

/* ---------------- Loop ---------------- */

let last = performance.now()
let acc = 0

const frame = (now: number) => {
  const dt = Math.min(0.1, (now - last) / 1000)
  last = now
  const t = now / 1000
  // Gamepads drive the menus through the same key codes as the keyboard.
  for (const key of padKeys()) input.press(key)

  if (run) {
    const r = run
    const g = r.game
    if (padA()) queueSpecial()
    let steps = 0
    if (g.phase === 'playing' || g.phase === 'evolving') {
      acc += dt
      while (acc >= STEP) {
        step(g, { move: input.readMove(), special: specialQueued }, STEP)
        specialQueued = false
        acc -= STEP
        steps++
      }
    } else {
      acc = 0
      specialQueued = false
    }
    for (const e of g.events.splice(0)) handleEvent(r, e)
    if (run === r) {
      syncOverlay(r)
      // Redraw only when the simulation advanced: halves the work on 120 Hz phones and
      // idles the GPU while a menu is open over a frozen frame.
      if (steps > 0 || dirty) {
        dirty = false
        render(ctx, g, t, settings())
        const stick = input.readStick()
        if (stick && g.phase === 'playing') drawJoystick(ctx, stick, cssScale)
        r.hud.update(g)
      }
    }
  } else {
    // Attract mode: wild Pokémon stroll through the meadow behind the menus.
    stepTitleScene(scene, dt, view.w, view.h)
    drawTitleScene(ctx, scene, view.w, view.h)
    ctx.fillStyle = `rgba(16,24,48,${screen?.dim ?? 0.35})`
    ctx.fillRect(0, 0, view.w, view.h)
  }
  screen?.tick?.(t)
  playTheme(themeFor(run))
  // Ducked under the pause menu, but at full level while the player tunes the volume.
  duckMusic(run?.game.phase === 'paused' && !isSettingsOpen())
  requestAnimationFrame(frame)
}

/* ---------------- Boot ---------------- */

/**
 * Warms the sprite cache one species at a time so the menu stays responsive:
 * every region's trio first (menu cards), then the next run's first stage.
 */
const preloadInBackground = async () => {
  const queue = [...REGIONS.flatMap((r) => r.starters.map((id) => STARTERS[id].line[0].dex)), ...openingDex(upcoming)]
  for (const dex of queue) await loadSpecies(dex).catch(() => {})
}

const boot = () => {
  document.documentElement.lang = LOCALES[locale()].tag
  showTitle({ intro: true })
  requestAnimationFrame(frame)
  void preloadInBackground()
}

boot()

/** Dev: places a map event `dx`, `dy` px from the player, e.g. `ps.event('chest')`. */
const devEvent = (kind: MapEventKind, dx = 70, dy = 0) => {
  if (!run || !MAP_EVENT_KINDS.includes(kind)) return `Kinds: ${MAP_EVENT_KINDS.join(', ')}`
  const p = run.game.player
  return spawnMapEvent(run.game, kind, Math.round(p.x + dx), Math.round(p.y + dy))
}

// Dev-only handle for poking at the running game from the console.
/** Dev: spawns `count` of an enemy in a small arc ahead of the player (staging trait screenshots); `shiny` makes them shiny elites. */
const devSpawn = (kind: EnemyId, count = 1, shiny = false) => {
  const g = run?.game
  if (!g) return
  const p = g.player
  const base = Math.atan2(p.facing.y, p.facing.x)
  for (let i = 0; i < count; i++) {
    const a = base + (i - (count - 1) / 2) * 0.35
    const e = spawnEnemy(g, kind, p.x + Math.cos(a) * 90, p.y + Math.sin(a) * 90)
    if (shiny) {
      void preloadShinies([ENEMIES[kind].dex])
      makeShiny(g, e)
    }
  }
}

// `ps.biome('cave')` and `ps.weather('rain')` stage a run for screenshots (they hold until the next scheduled change).
if (import.meta.env.DEV) {
  const withRun = (fn: (g: Game) => void) => (run ? fn(run.game) : console.warn('ps: start a run first'))
  Object.assign(window, {
    ps: {
      run: () => run,
      startRun,
      showTitle,
      showMenu,
      theme: currentTheme,
      spawn: devSpawn,
      event: devEvent,
      dex: () => loadSave().dex,
      biome: (id: BiomeId) => withRun((g) => setBiome(g, id)),
      weather: (id: WeatherId) => withRun((g) => setWeather(g, id)),
      ...riftDevTools(() => run?.game),
    },
  })
}
