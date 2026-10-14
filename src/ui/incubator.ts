import { playCry, playSfx } from '../engine/audio'
import type { Input } from '../engine/input'
import { blitCentered, context2d, ellipse } from '../engine/pixelart'
import { HATCHLING_IDS, HATCHLINGS } from '../data/hatchlings'
import { EGG_TIERS, EGGS, isReady, stepsLeft, type Egg, type Hatch } from '../game/eggs'
import { eggCrack, eggIcon, eggSprite, SPARKLE } from '../render/art'
import { cryUrl, drawPokemon, loadedSprites, loadSpecies } from '../render/sprites'
import { formatNumber, formatPokeDollars, t } from '../i18n'
import { h, later, rich } from './dom'
import { loadSave } from './save'
import { hint, menu, type Screen } from './screens'

/** One incubator slot: the egg, its tier, a progress bar and the steps left (or "Ready!"). */
const slotView = (egg: Egg | undefined) => {
  const m = t().eggs
  if (!egg) return h('button', { class: 'egg-slot empty' }, h('span', { class: 'egg-hole' }), h('b', {}, m.empty))
  const ready = isReady(egg)
  const progress = egg.steps / EGG_TIERS[egg.tier].steps
  return h(
    'button',
    { class: ready ? 'egg-slot ready' : 'egg-slot' },
    h('img', { class: 'egg-art', src: eggIcon(egg.tier), alt: '' }),
    h('b', {}, m.tiers[egg.tier]),
    h('span', { class: 'egg-bar' }, h('i', { style: `width:${Math.round(progress * 100)}%` })),
    h('span', { class: 'egg-steps' }, ready ? m.ready : m.stepsLeft(formatNumber(stepsLeft(egg)))),
  )
}

/**
 * The incubator: its slots with the steps each egg still needs, and the
 * collection count. Picking a ready egg calls `onHatch` with its index.
 */
export const incubator = (root: HTMLElement, input: Input, actions: { onHatch: (index: number) => void; onClose: () => void }): Screen => {
  const m = t().eggs
  const save = loadSave()
  const slots = Array.from({ length: EGGS.slots }, (_, i) => slotView(save.eggs[i]))
  const back = h('button', { class: 'btn' }, m.back)
  const owned = HATCHLING_IDS.filter((id) => save.hatched[id]).length
  const close = () => later(actions.onClose)
  const first = save.eggs.findIndex(isReady)

  const nav = menu(input, [...slots, back], (i) => {
    const egg = save.eggs[i]
    if (i === slots.length) return close()
    if (egg && isReady(egg)) {
      playSfx('select')
      return later(() => actions.onHatch(i))
    }
    playSfx('denied')
  }, { horizontal: true, initial: first >= 0 ? first : slots.length })
  const offEsc = input.onKey((k) => (k === 'Escape' || k === 'Backspace') && close())

  const el = h(
    'div',
    { class: 'screen dim' },
    h(
      'div',
      { class: 'dialog box pop incubator' },
      h('div', { class: 'dialog-title' }, m.title),
      h('p', { class: 'incubator-intro' }, m.intro),
      h('div', { class: 'egg-slots' }, ...slots),
      h('p', { class: 'incubator-note' }, h('b', {}, m.collection(owned, HATCHLING_IDS.length)), ' · ', m.sources),
      h('div', { class: 'buttons' }, back),
      hint(m.hint, ''),
    ),
  )
  root.append(el)
  return { el, dispose: () => (nav.off(), offEsc(), el.remove()) }
}

/* ---------------- Hatching scene ---------------- */

/** Seconds into the scene: wobbles (start, end, px), cracks, the burst and the reveal. */
const HATCH = {
  wobbles: [
    [0.5, 0.8, 1],
    [1.2, 1.55, 2],
    [1.9, 2.3, 2],
    [2.6, 3.0, 3],
  ],
  cracks: [1.3, 2.0, 2.7],
  burst: 3.1,
  reveal: 3.35,
} as const

/** Canvas size in pixels; CSS scales it by a whole number (see `.hatch-canvas`). */
const W = 112
const H = 96
/** The egg is drawn at this whole-number zoom. */
const EGG_SCALE = 3

/**
 * "Oh? The Egg is hatching!": the egg wobbles and cracks, bursts in a white
 * flash and the Pokémon appears (shiny sparkles included) with its cry. A tap
 * or key skips to the reveal; then `play` starts a run with it and `done` moves on.
 * `holdAt` freezes the animation at that second (dev screenshots).
 */
export const hatchScene = (root: HTMLElement, input: Input, hatch: Hatch, actions: { play: () => void; done: () => void }, holdAt?: number): Screen => {
  const m = t().eggs
  const def = HATCHLINGS[hatch.id]
  const dex = def.line[0].dex
  const name = def.line[0].name
  void loadSpecies(dex).catch(() => {})
  if (hatch.shiny) void loadSpecies(dex, true).catch(() => {})

  const canvas = h('canvas', { class: 'hatch-canvas', width: W, height: H })
  const text = h('p', { class: 'hatch-text' }, m.hatching)
  const buttons = h('div', { class: 'buttons hidden' })
  const skipHint = h('p', { class: 'hint' }, m.skip)
  let start = -1
  let revealed = false
  let crack = 0
  let wobble = -1
  let nav: ReturnType<typeof menu> | null = null

  const reveal = () => {
    if (revealed) return
    revealed = true
    start = Math.min(start, performance.now() / 1000 - HATCH.reveal)
    playSfx(hatch.shiny ? 'shiny' : 'evolve')
    playCry(cryUrl(dex), 0.5)
    const note = hatch.duplicate ? m.duplicate(name, formatPokeDollars(hatch.refund)) : hatch.shiny ? m.shinyUnlocked : m.unlocked
    text.replaceChildren(rich(hatch.shiny ? m.hatchedShiny(name) : m.hatched(name)), h('small', {}, note))
    const play = h('button', { class: 'btn' }, m.play(name))
    const ok = h('button', { class: 'btn' }, m.ok)
    buttons.replaceChildren(play, ok)
    buttons.classList.remove('hidden')
    skipHint.remove()
    nav = menu(input, [play, ok], (i) => later(i === 0 ? actions.play : actions.done), { horizontal: true })
  }

  // Before the reveal, any key or tap skips the animation.
  const offSkip = input.onKey(() => !revealed && start >= 0 && performance.now() / 1000 - start > 0.4 && reveal())
  const box = h('div', { class: 'dialog box pop hatch' }, canvas, text, buttons, skipHint)
  box.addEventListener('click', () => !revealed && reveal())
  const el = h('div', { class: 'screen dim' }, box)
  root.append(el)

  const ctx = context2d(canvas)
  const egg = eggSprite(hatch.tier)
  const cx = W / 2
  const floor = H - 18

  const drawEgg = (k: number) => {
    const shake = HATCH.wobbles.find(([from, to]) => k >= from && k < to)
    const dx = shake ? Math.round(Math.sin(k * 42) * shake[2]) : 0
    const x = Math.round(cx - (egg.width * EGG_SCALE) / 2) + dx
    const y = floor + 2 - egg.height * EGG_SCALE
    ctx.drawImage(egg, x, y, egg.width * EGG_SCALE, egg.height * EGG_SCALE)
    const stage = HATCH.cracks.filter((at) => k >= at).length
    if (stage > 0) ctx.drawImage(eggCrack(hatch.tier, stage), x, y, egg.width * EGG_SCALE, egg.height * EGG_SCALE)
    // Sounds follow the animation: a tap per wobble, a crunch per crack.
    const w = shake ? HATCH.wobbles.indexOf(shake) : -1
    if (w > wobble) (wobble = w), playSfx('move')
    if (stage > crack) (crack = stage), playSfx('break')
  }

  const drawNewborn = (k: number) => {
    const s = loadedSprites(dex, hatch.shiny) ?? loadedSprites(dex)
    if (s) {
      const scale = s.bodyH * 2 <= H - 30 ? 2 : 1
      drawPokemon(ctx, s, 'Idle', 0, k, cx, floor, { scale })
    }
    if (!hatch.shiny) return
    const sparkles = SPARKLE()
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + k * 1.5
      const sprite = sparkles[Math.floor(k * 6 + i) % sparkles.length]!
      ctx.drawImage(sprite, Math.round(cx + Math.cos(a) * 34 - sprite.width / 2), Math.round(floor - 28 + Math.sin(a) * 22 - sprite.height / 2))
    }
  }

  const tick = (now: number) => {
    if (start < 0) start = now
    const k = holdAt ?? now - start
    if (k >= HATCH.reveal && !revealed) reveal()
    ctx.clearRect(0, 0, W, H)
    blitCentered(ctx, ellipse(14, 3, 'rgba(16,40,16,0.3)'), cx, floor)
    if (k < HATCH.burst) drawEgg(k)
    else drawNewborn(k)
    // The burst: white flash in, then out over the newborn.
    const flash = k < HATCH.burst - 0.2 ? 0 : k < HATCH.burst ? (k - HATCH.burst + 0.2) / 0.2 : Math.max(0, 1 - (k - HATCH.burst) / 0.5)
    if (flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${flash})`
      ctx.fillRect(0, 0, W, H)
    }
  }

  return { el, tick, dispose: () => (offSkip(), nav?.off(), el.remove()) }
}
