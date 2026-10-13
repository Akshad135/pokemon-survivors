import '@fontsource/press-start-2p'
import '@fontsource/vt323'
import './ui/style.css'

import { playCry, playSfx, toggleMute, unlockAudio } from './engine/audio'
import { createPadButton } from './engine/gamepad'
import { createInput } from './engine/input'
import { context2d } from './engine/pixelart'
import { fitView } from './engine/viewport'
import { ENEMIES, ENEMY_DEX, type EnemyDef } from './data/enemies'
import { ITEMS } from './data/items'
import { REGIONS, STARTERS, starterDex, type StarterId } from './data/starters'
import { CONSUMABLES } from './game/consumables'
import { chooseOffer, createGame, playerDex, step } from './game/game'
import { MOVES } from './game/moves'
import type { Game, GameEvent, Phase } from './game/types'
import { render } from './render/draw'
import { drawJoystick } from './render/joystick'
import { loadAll, loadSpecies, preloadShinies, sprites } from './render/sprites'
import { consumableIcon } from './render/props'
import { drawGround } from './render/world'
import { h } from './ui/dom'
import { createHud, type Hud } from './ui/hud'
import { banner, flashScreen, levelUp, pauseMenu, results, textBox, toast, type Screen } from './ui/screens'
import { starterSelect } from './ui/starterSelect'

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
}

let screen: Screen | null = null
let run: Run | null = null
let lastStarter: StarterId = 'charmander'
/** Special attack press (Space, touch button, gamepad A), consumed by the next simulation step. */
let specialQueued = false
const padA = createPadButton(0)

const queueSpecial = () => {
  unlockAudio()
  if (run?.game.phase === 'playing') specialQueued = true
}

const setScreen = (next: Screen | null) => {
  screen?.dispose()
  screen = next
}

const showMenu = () => {
  endRun()
  setScreen(starterSelect(ui, input, (id) => setTimeout(() => void startRun(id), 250), lastStarter))
}

const endRun = () => {
  if (!run) return
  run.overlay?.dispose()
  run.closeText?.()
  run.hud.dispose()
  run = null
}

const loadingScreen = () => h('div', { class: 'screen' }, h('p', { class: 'loading blink' }, 'Carregando…'))

/** Loads the starter's evolution line and every enemy, then starts a fresh run. */
const startRun = async (starter: StarterId) => {
  setScreen(null)
  endRun()
  lastStarter = starter
  const loading = loadingScreen()
  ui.append(loading)
  // The player's shiny line is awaited (a shiny run must not start in normal colors); enemy shinies stream in.
  await Promise.all([loadAll([...starterDex(starter), ...ENEMY_DEX]), preloadShinies(starterDex(starter))])
  void preloadShinies(ENEMY_DEX)
  loading.remove()
  const game = createGame(starter, view)
  const pause = () => game.phase === 'playing' && (game.phase = 'paused')
  run = { game, hud: createHud(ui, queueSpecial, pause), overlay: null, shown: null, closeText: null }
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
      r.overlay = levelUp(ui, input, g, (offer) => chooseOffer(g, offer))
      break
    case 'paused':
      r.overlay = pauseMenu(ui, input, g, () => (g.phase = 'playing'), showMenu)
      break
    case 'gameover':
    case 'victory':
      r.overlay = results(ui, input, g, () => void startRun(lastStarter), showMenu)
      break
  }
}

const offerLabel = (offer: Extract<GameEvent, { kind: 'pokeball' }>['offer']) => {
  if (!offer) return 'nada… estava vazia!'
  if (offer.kind === 'move') return `${MOVES[offer.id].name} Nv ${offer.level}!`
  if (offer.kind === 'item') return `${ITEMS[offer.id].name} Nv ${offer.level}!`
  if (offer.kind === 'evolution') return `${MOVES[offer.to].name}!`
  return 'uma Oran Berry!'
}

const handleEvent = (r: Run, e: GameEvent) => {
  const g = r.game
  switch (e.kind) {
    case 'hit': return playSfx(e.effective > 1 ? 'superHit' : 'hit', 45)
    case 'kill': return playSfx('kill', 50)
    case 'pickup': return playSfx('pickup', 35)
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
      return toast(ui, h('span', {}, `${who} usou `, h('b', {}, e.name), '!'), 1600)
    }
    case 'boss': {
      const def: EnemyDef = ENEMIES[e.enemy]
      if (def.legendary) {
        playSfx('legendary')
        playCry(sprites(def.dex).cry, 0.7)
        flashScreen(ui)
        return banner(ui, h('span', {}, 'Um ', h('b', {}, def.name), ' ', h('span', { class: 'legendary' }, 'lendário'), ' apareceu!'))
      }
      playSfx('boss')
      playCry(sprites(def.dex).cry, 0.5)
      return toast(ui, h('span', {}, 'Um ', h('b', {}, def.name), ' selvagem apareceu!'), 3200)
    }
    case 'shiny': {
      const def = ENEMIES[e.enemy]
      playSfx('shiny')
      playCry(sprites(def.dex).cry, 0.4)
      return toast(ui, h('span', {}, 'Um ', h('b', {}, def.name), ' shiny apareceu!'), 3200)
    }
    case 'shinyPlayer': {
      playSfx('shiny')
      return toast(ui, h('span', {}, 'Que sorte! Seu ', h('b', {}, STARTERS[g.starter].name), ' é shiny!'), 3600)
    }
    case 'evolve': {
      playCry(sprites(e.from).cry)
      r.closeText?.()
      r.closeText = textBox(ui, `Hã? ${STARTERS[g.starter].line[g.player.stage]!.name} está evoluindo!`)
      return
    }
    case 'evolved': {
      const line = STARTERS[g.starter].line
      playSfx('evolve')
      playCry(sprites(e.to).cry)
      r.closeText?.()
      r.closeText = null
      return toast(ui, `Parabéns! ${line[g.player.stage - 1]!.name} evoluiu para ${line[g.player.stage]!.name}!`, 3500)
    }
    case 'moveEvolved':
      playSfx('evolve')
      playCry(sprites(playerDex(g)).cry, 0.3)
      return toast(ui, h('span', { class: 'toast-evo' }, h('b', {}, MOVES[e.from].name), ' evoluiu para ', h('b', {}, MOVES[e.to].name), '!'), 3500)
    case 'pokeball':
      playSfx('levelUp')
      return toast(ui, `Poké Ball: ${offerLabel(e.offer)}`)
    case 'consumable': {
      const def = CONSUMABLES[e.item]
      playSfx(def.sfx)
      return toast(ui, h('span', { class: 'item-toast' }, h('img', { src: consumableIcon(e.item), alt: '' }), h('b', {}, def.name), def.label), 2200)
    }
    case 'propBreak':
      return playSfx('break', 60)
    case 'revive':
      playSfx('evolve')
      return toast(ui, h('span', { class: 'item-toast' }, h('img', { src: consumableIcon('revive'), alt: '' }), 'O ', h('b', {}, 'Revive'), ' te pôs de pé!'), 3000)
    case 'gameover':
      playSfx('gameOver')
      return playCry(sprites(playerDex(g)).cry)
    case 'victory':
      return playSfx('evolve')
  }
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
        render(ctx, g, t)
        const stick = input.readStick()
        if (stick && g.phase === 'playing') drawJoystick(ctx, stick, cssScale)
        r.hud.update(g)
      }
    }
  } else {
    // Attract mode: the meadow drifts behind the menu.
    drawGround(ctx, Math.round(t * 14), Math.round(t * 7), view.w, view.h)
    ctx.fillStyle = 'rgba(16,24,48,0.35)'
    ctx.fillRect(0, 0, view.w, view.h)
  }
  screen?.tick?.(t)
  requestAnimationFrame(frame)
}

/* ---------------- Boot ---------------- */

/**
 * Warms the sprite cache one species at a time so the menu stays responsive:
 * every region's trio first (menu cards), then the horde (needed by any run).
 */
const preloadInBackground = async () => {
  const queue = [...REGIONS.flatMap((r) => r.starters.map((id) => STARTERS[id].line[0].dex)), ...ENEMY_DEX]
  for (const dex of queue) await loadSpecies(dex).catch(() => {})
}

const boot = () => {
  showMenu()
  requestAnimationFrame(frame)
  void preloadInBackground()
}

boot()

// Dev-only handle for poking at the running game from the console.
if (import.meta.env.DEV) Object.assign(window, { ps: { run: () => run, startRun } })
