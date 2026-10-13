import '@fontsource/press-start-2p'
import '@fontsource/vt323'
import './ui/style.css'

import { playCry, playSfx, toggleMute, unlockAudio } from './engine/audio'
import { createInput } from './engine/input'
import { context2d } from './engine/pixelart'
import { ENEMIES, ENEMY_DEX } from './data/enemies'
import { ITEMS } from './data/items'
import { STARTER_IDS, STARTERS, starterDex, type StarterId } from './data/starters'
import { CONSUMABLES } from './game/consumables'
import { chooseOffer, createGame, playerDex, step } from './game/game'
import { MOVES } from './game/moves'
import type { Game, GameEvent, Phase } from './game/types'
import { render } from './render/draw'
import { loadAll, sprites } from './render/sprites'
import { consumableIcon } from './render/props'
import { drawGround } from './render/world'
import { h } from './ui/dom'
import { createHud, type Hud } from './ui/hud'
import { levelUp, pauseMenu, results, starterSelect, textBox, toast, type Screen } from './ui/screens'

const STEP = 1 / 60
/** Target internal height; the canvas is upscaled by an integer factor for crisp pixels. */
const TARGET_HEIGHT = 300

const canvas = document.querySelector<HTMLCanvasElement>('#game')!
const ui = document.querySelector<HTMLDivElement>('#ui')!
const ctx = context2d(canvas)
const input = createInput(canvas)
const view = { w: 480, h: 270 }

const resize = () => {
  const scale = Math.max(2, Math.round(window.innerHeight / TARGET_HEIGHT))
  view.w = Math.ceil(window.innerWidth / scale)
  view.h = Math.ceil(window.innerHeight / scale)
  canvas.width = view.w
  canvas.height = view.h
  canvas.style.width = `${view.w * scale}px`
  canvas.style.height = `${view.h * scale}px`
  document.documentElement.style.setProperty('--px', `${scale}px`)
  context2d(canvas)
}
window.addEventListener('resize', resize)
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

const setScreen = (next: Screen | null) => {
  screen?.dispose()
  screen = next
}

const showMenu = () => {
  endRun()
  setScreen(starterSelect(ui, input, (id) => setTimeout(() => startRun(id), 250)))
}

const endRun = () => {
  if (!run) return
  run.overlay?.dispose()
  run.closeText?.()
  run.hud.dispose()
  run = null
}

const startRun = (starter: StarterId) => {
  setScreen(null)
  endRun()
  lastStarter = starter
  const game = createGame(starter, view)
  run = { game, hud: createHud(ui), overlay: null, shown: null, closeText: null }
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
      r.overlay = results(ui, input, g, () => startRun(lastStarter), showMenu)
      break
  }
}

const offerLabel = (offer: Extract<GameEvent, { kind: 'pokeball' }>['offer']) => {
  if (!offer) return 'nada… estava vazia!'
  if (offer.kind === 'move') return `${MOVES[offer.id].name} Nv ${offer.level}!`
  if (offer.kind === 'item') return `${ITEMS[offer.id].name} Nv ${offer.level}!`
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
    case 'boss': {
      const def = ENEMIES[e.enemy]
      playSfx('boss')
      playCry(sprites(def.dex).cry, 0.5)
      return toast(ui, h('span', {}, 'Um ', h('b', {}, def.name), ' selvagem apareceu!'), 3200)
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
})
window.addEventListener('pointerdown', unlockAudio)
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
    if (g.phase === 'playing' || g.phase === 'evolving') {
      acc += dt
      while (acc >= STEP) {
        step(g, input.readMove(), STEP)
        acc -= STEP
      }
    } else acc = 0
    for (const e of g.events.splice(0)) handleEvent(r, e)
    if (run === r) {
      syncOverlay(r)
      render(ctx, g, t)
      r.hud.update(g)
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

const boot = async () => {
  const loading = h('div', { class: 'screen' }, h('p', { class: 'loading blink' }, 'Carregando…'))
  ui.append(loading)
  await loadAll([...new Set([...STARTER_IDS.flatMap(starterDex), ...ENEMY_DEX])])
  loading.remove()
  showMenu()
  requestAnimationFrame(frame)
}

void boot()

// Dev-only handle for poking at the running game from the console.
if (import.meta.env.DEV) Object.assign(window, { ps: { run: () => run, startRun } })
