import { playSfx, setMix } from '../engine/audio'
import { STICK_MODES, type Input } from '../engine/input'
import { clamp } from '../engine/math'
import { locale, LOCALES, nextLocale, setLocale, t } from '../i18n'
import { openControls } from './controls'
import { h, later } from './dom'
import { DAMAGE_NUMBERS } from '../render/damageNumbers'
import { loadSettings, writeSettings, type Settings } from './save'
import { hint, menu, type Screen } from './screens'

/* ---------------- Live settings ---------------- */

/** Pushes settings out to where they act: the audio mix, and `data-stick` for the HUD's CSS (the status box moves off the fixed stick). */
const apply = (s: Settings) => {
  setMix(s)
  document.documentElement.dataset.stick = s.joystick
}

let current = loadSettings()
apply(current)

/** Redraws the open settings screen when a change comes from elsewhere (the M key). */
let refresh: (() => void) | null = null

/** Current settings. Read them where they apply (render options, audio mix): they change mid-run. */
export const settings = (): Settings => current

/** Applies, persists and shows a change. */
export const updateSettings = (patch: Partial<Settings>) => {
  current = { ...current, ...patch }
  writeSettings(current)
  apply(current)
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

/** `◀ Reduced ▶`: ← → step through `options`, Enter or a tap goes to the next one (wrapping). */
const choiceRow = <K extends keyof Settings>(label: string, key: K, options: readonly Settings[K][], name: (v: Settings[K]) => string): Row => {
  const value = h('b', { class: 'setting-choice' })
  const el = h('button', { class: 'setting-row' }, h('span', { class: 'setting-label' }, label), value)
  const step = (dir: -1 | 1) => {
    const n = options.length
    const patch: Partial<Settings> = {}
    patch[key] = options[(options.indexOf(current[key]) + dir + n) % n]
    updateSettings(patch)
    playSfx('select')
  }
  return {
    el,
    adjust: step,
    activate: () => step(1),
    sync: () => {
      value.textContent = `◀ ${name(current[key])} ▶`
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

/** Opens the remap screen (keyboard keys and gamepad buttons). */
const controlsRow = (open: () => void): Row => {
  const el = h('button', { class: 'setting-row' }, h('span', { class: 'setting-label' }, t().controls.open), h('b', { class: 'setting-choice' }, '▶'))
  return { el, adjust: (dir) => dir > 0 && open(), activate: open, sync: () => {} }
}

const backRow = (label: string, close: () => void): Row => {
  const el = h('button', { class: 'btn' }, label)
  return { el, adjust: () => {}, activate: close, sync: () => {} }
}

/** A group of rows under a heading. */
type Section = { title: string; rows: Row[] }

/** The Controls section: how the player moves, and the remap screen (`openRemap`). */
const controlRows = (openRemap: () => void): Row[] => {
  const m = t().settings
  return [choiceRow(m.joystick, 'joystick', STICK_MODES, (mode) => m.joystickModes[mode]), controlsRow(openRemap)]
}

/**
 * Settings dialog in three sections: Audio (music and effects volume, mute),
 * Game (damage numbers, screen shake, language) and Controls (touch joystick
 * and the remap screen). Changes apply and persist immediately.
 *
 * Opens on top of whatever is on screen (`root` is `#ui`, `input` the shared
 * input). The Back button, Esc or Backspace (gamepad B) close it: it removes itself, then calls
 * `onClose` after the current key dispatch. The language may have changed by
 * then, so `onClose` should rebuild any text it owns. `dispose` closes it
 * without calling `onClose` (e.g. when the caller's own screen goes away).
 */
export const openSettings = (root: HTMLElement, input: Input, onClose: () => void): Screen => {
  const el = h('div', { class: 'screen dim' })
  let rows: Row[] = []
  let nav: ReturnType<typeof menu> | null = null
  /** The remap screen open on top: this one hides and ignores keys until it closes. */
  let sub: Screen | null = null
  let away = false

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
    const sections: Section[] = [
      {
        title: m.audio,
        rows: [
          slider(m.music, 'musicVolume'),
          slider(m.sfx, 'sfxVolume', () => playSfx('pickup', 90)),
          toggle(m.sound, (s) => !s.muted, (on) => ({ muted: !on })),
        ],
      },
      {
        title: m.game,
        rows: [
          choiceRow(m.damageNumbers, 'damageNumbers', DAMAGE_NUMBERS, (mode) => m.damageModes[mode]),
          toggle(m.screenShake, (s) => s.screenShake, (on) => ({ screenShake: on })),
          languageRow(switchLanguage),
        ],
      },
      { title: m.controls, rows: controlRows(showControls) },
    ]
    const back = backRow(m.back, close)
    rows = [...sections.flatMap((s) => s.rows), back]
    nav?.off()
    nav = menu(input, rows.map((r) => r.el), (i) => rows[i]?.activate(), { initial: focus })
    el.replaceChildren(
      h(
        'div',
        { class: opening ? 'dialog box pop settings' : 'dialog box settings' },
        h('div', { class: 'dialog-title' }, m.title),
        h(
          'div',
          { class: 'settings-list' },
          ...sections.map((s) => h('div', { class: 'settings-group' }, h('div', { class: 'settings-section' }, s.title), ...s.rows.map((r) => r.el))),
        ),
        h('div', { class: 'buttons' }, back.el),
        hint(m.hintKeys, m.hintTouch),
      ),
    )
    sync()
  }

  const showControls = () => {
    playSfx('select')
    nav?.off()
    away = true
    el.classList.add('hidden')
    // Open after this key dispatch, or the new screen would receive the same press.
    later(() => {
      if (!el.isConnected) return
      sub = openControls(root, input, () => {
        sub = null
        away = false
        el.classList.remove('hidden')
        build(nav?.index ?? 0, false)
      })
    })
  }

  const offKeys = input.onKey((key) => {
    if (away) return
    const row = nav && rows[nav.index]
    if (key === 'ArrowLeft' || key === 'KeyA') row?.adjust(-1)
    else if (key === 'ArrowRight' || key === 'KeyD') row?.adjust(1)
    else if (key === 'Escape' || key === 'Backspace') close() // Backspace is also the gamepad's B
  })

  const dispose = () => {
    sub?.dispose()
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
