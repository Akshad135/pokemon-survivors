import { playSfx, setMix } from '../engine/audio'
import type { Input } from '../engine/input'
import { clamp } from '../engine/math'
import { locale, LOCALES, nextLocale, setLocale, t } from '../i18n'
import { h, later } from './dom'
import { loadSettings, writeSettings, type Settings } from './save'
import { hint, menu, type Screen } from './screens'

/* ---------------- Live settings ---------------- */

let current = loadSettings()
setMix(current)

/** Redraws the open settings screen when a change comes from elsewhere (the M key). */
let refresh: (() => void) | null = null

/** Current settings. Read them where they apply (render options, audio mix): they change mid-run. */
export const settings = (): Settings => current

/** Applies, persists and shows a change. */
export const updateSettings = (patch: Partial<Settings>) => {
  current = { ...current, ...patch }
  writeSettings(current)
  setMix(current)
  refresh?.()
}

/** The `M` key. */
export const toggleMute = () => updateSettings({ muted: !current.muted })

export const isSettingsOpen = () => refresh !== null

/* ---------------- Screen ---------------- */

/** One focusable line. `adjust` handles ← →, `activate` Enter or a tap, `sync` redraws its value. */
type Row = { el: HTMLElement; adjust: (dir: -1 | 1) => void; activate: () => void; sync: () => void }

const SLIDER_STEPS = 10

/** Volume bar of growing pixel cells. Tap a cell or drag across it; ← → step by 10%. */
const slider = (label: string, key: 'musicVolume' | 'sfxVolume', preview?: () => void): Row => {
  const cells = Array.from({ length: SLIDER_STEPS }, (_, i) => h('span', { class: 'slider-cell', style: `--h:${40 + i * 6}%` }))
  const value = h('b', { class: 'setting-value' })
  const bar = h('div', { class: 'slider', role: 'slider', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': 100 }, ...cells)
  const level = () => Math.round(current[key] * SLIDER_STEPS)
  const set = (next: number) => {
    const steps = clamp(next, 0, SLIDER_STEPS)
    if (steps === level()) return
    const patch: Partial<Settings> = {}
    patch[key] = steps / SLIDER_STEPS
    updateSettings(patch)
    preview?.()
  }
  const fromPointer = (e: PointerEvent) => {
    const rect = bar.getBoundingClientRect()
    set(Math.round(((e.clientX - rect.left) / rect.width) * SLIDER_STEPS))
  }
  bar.addEventListener('pointerdown', (e) => (bar.setPointerCapture(e.pointerId), fromPointer(e)))
  bar.addEventListener('pointermove', (e) => bar.hasPointerCapture(e.pointerId) && fromPointer(e))
  const el = h('div', { class: 'setting-row setting-slider' }, h('span', { class: 'setting-label' }, label), value, bar)
  return {
    el,
    adjust: (dir) => set(level() + dir),
    activate: () => {},
    sync: () => {
      const n = level()
      cells.forEach((c, i) => c.classList.toggle('on', i < n))
      value.textContent = `${n * (100 / SLIDER_STEPS)}%`
      bar.setAttribute('aria-valuenow', String(n * (100 / SLIDER_STEPS)))
    },
  }
}

const toggle = (label: string, read: (s: Settings) => boolean, write: (on: boolean) => Partial<Settings>): Row => {
  const pill = h('b', { class: 'setting-pill' })
  const el = h('button', { class: 'setting-row', role: 'switch' }, h('span', { class: 'setting-label' }, label), pill)
  const flip = () => {
    updateSettings(write(!read(current)))
    playSfx('select')
  }
  return {
    el,
    adjust: flip,
    activate: flip,
    sync: () => {
      const on = read(current)
      pill.textContent = on ? t().settings.on : t().settings.off
      pill.classList.toggle('off', !on)
      el.setAttribute('aria-checked', String(on))
    },
  }
}

/** `◀ Português ▶`: any press cycles the language (there are only two, so direction doesn't matter). */
const languageRow = (onSwitch: () => void): Row => {
  const el = h(
    'button',
    { class: 'setting-row' },
    h('span', { class: 'setting-label' }, t().language),
    h('b', { class: 'setting-choice', lang: LOCALES[locale()].tag }, `◀ ${LOCALES[locale()].name} ▶`),
  )
  return { el, adjust: onSwitch, activate: onSwitch, sync: () => {} }
}

const backRow = (label: string, close: () => void): Row => {
  const el = h('button', { class: 'btn' }, label)
  return { el, adjust: () => {}, activate: close, sync: () => {} }
}

/**
 * Settings dialog: music and effects volume, mute, damage numbers, screen
 * shake and language. Changes apply and persist immediately.
 *
 * Opens on top of whatever is on screen (`root` is `#ui`, `input` the shared
 * input). The Back button or Esc close it: it removes itself, then calls
 * `onClose` after the current key dispatch. The language may have changed by
 * then, so `onClose` should rebuild any text it owns. `dispose` closes it
 * without calling `onClose` (e.g. when the caller's own screen goes away).
 */
export const openSettings = (root: HTMLElement, input: Input, onClose: () => void): Screen => {
  const el = h('div', { class: 'screen dim' })
  let rows: Row[] = []
  let nav: ReturnType<typeof menu> | null = null

  const sync = () => rows.forEach((r) => r.sync())

  const switchLanguage = () => {
    setLocale(nextLocale(locale()))
    playSfx('select')
    // Rebuild after this key dispatch, or the new rows would receive the same press.
    later(() => build(nav?.index ?? 0, false))
  }

  /** `opening` plays the pop-in; rebuilds after a language switch don't. */
  const build = (focus: number, opening: boolean) => {
    const m = t().settings
    rows = [
      slider(m.music, 'musicVolume'),
      slider(m.sfx, 'sfxVolume', () => playSfx('pickup', 90)),
      toggle(m.sound, (s) => !s.muted, (on) => ({ muted: !on })),
      toggle(m.damageNumbers, (s) => s.damageNumbers, (on) => ({ damageNumbers: on })),
      toggle(m.screenShake, (s) => s.screenShake, (on) => ({ screenShake: on })),
      languageRow(switchLanguage),
      backRow(m.back, close),
    ]
    nav?.off()
    nav = menu(input, rows.map((r) => r.el), (i) => rows[i]?.activate(), { initial: focus })
    const back = rows.at(-1)!.el
    el.replaceChildren(
      h(
        'div',
        { class: opening ? 'dialog box pop settings' : 'dialog box settings' },
        h('div', { class: 'dialog-title' }, m.title),
        h('div', { class: 'settings-list' }, ...rows.slice(0, -1).map((r) => r.el)),
        h('div', { class: 'buttons' }, back),
        hint(m.hintKeys, m.hintTouch),
      ),
    )
    sync()
  }

  const offKeys = input.onKey((key) => {
    const row = nav && rows[nav.index]
    if (key === 'ArrowLeft' || key === 'KeyA') row?.adjust(-1)
    else if (key === 'ArrowRight' || key === 'KeyD') row?.adjust(1)
    else if (key === 'Escape') close()
  })

  const dispose = () => {
    nav?.off()
    offKeys()
    el.remove()
    if (refresh === sync) refresh = null
  }

  let closed = false
  const close = () => {
    if (closed) return
    closed = true
    playSfx('select')
    dispose()
    later(onClose)
  }

  build(0, true)
  refresh = sync
  root.append(el)
  return { el, dispose }
}
