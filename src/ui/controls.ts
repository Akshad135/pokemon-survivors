import { playSfx } from '../engine/audio'
import { ACTION_IDS, DEFAULT_BINDINGS, rebind, RESERVED_KEYS, type Action, type Device } from '../engine/bindings'
import type { Input, RawPress } from '../engine/input'
import { t } from '../i18n'
import { h, later, rich, setText } from './dom'
import { hint, menu, type Screen } from './screens'
import { settings, updateSettings } from './settings'

/* ---------------- Labels ---------------- */

const KEY_NAMES: Partial<Record<string, string>> = {
  Enter: 'ENTER',
  Backspace: 'BKSP',
  Tab: 'TAB',
  CapsLock: 'CAPS',
  ShiftLeft: 'SHIFT',
  ShiftRight: 'SHIFT',
  ControlLeft: 'CTRL',
  ControlRight: 'CTRL',
  AltLeft: 'ALT',
  AltRight: 'ALT',
  MetaLeft: 'META',
  MetaRight: 'META',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  IntlBackslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Backquote: '`',
  Comma: ',',
  Period: '.',
  Slash: '/',
}

/** A `KeyboardEvent.code` as printed on the key (`KeyW` → W, `Numpad8` → NUM 8). */
export const keyLabel = (code: string) => {
  if (code === 'Space') return t().spaceKey
  const letter = /^(?:Key|Digit)(.)$/.exec(code)?.[1]
  if (letter) return letter
  if (code.startsWith('Numpad')) return `NUM ${code.slice(6).toUpperCase()}`
  return KEY_NAMES[code] ?? code.toUpperCase()
}

/** Standard-mapping button names, Xbox style (the most common layout on PC). */
const PAD_NAMES = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'SELECT', 'START', 'L3', 'R3', '↑', '↓', '←', '→', 'HOME']

export const padLabel = (button: number) => PAD_NAMES[button] ?? `#${button}`

/** The key bound to an action, for the HUD badges (Space, E, Shift by default). */
export const boundKey = (action: Action) => {
  const code = settings().controls.key[action]
  return code === null ? t().controls.unbound : keyLabel(code)
}

/* ---------------- Screen ---------------- */

/**
 * Remap screen, opened from Settings: one line per action with its key and
 * gamepad button. ↑ ↓ pick the line, ← → the column, Enter (or a tap) waits
 * for the new key or button; Esc cancels the wait. Taking a key from another
 * action swaps them (see `rebind`) and says so. Changes apply and persist at once.
 * Esc or Backspace close it, then `onClose` runs after the key dispatch.
 */
export const openControls = (root: HTMLElement, input: Input, onClose: () => void): Screen => {
  const m = t().controls
  let col: Device = 'key'
  let waiting: { action: Action; device: Device; stop: () => void } | null = null
  let nav: ReturnType<typeof menu> | null = null

  const status = h('p', { class: 'controls-status', 'aria-live': 'polite' })
  const say = (text: string) => status.replaceChildren(rich(text))

  const lines = ACTION_IDS.map((action) => {
    const cells = {
      key: h('button', { class: 'control-cell', type: 'button', 'aria-label': `${m.actions[action]} · ${m.keyboard}` }),
      pad: h('button', { class: 'control-cell', type: 'button', 'aria-label': `${m.actions[action]} · ${m.gamepad}` }),
    }
    for (const device of ['key', 'pad'] as const) {
      cells[device].addEventListener('click', (e) => {
        // The line's own click (menu) would start the wait again on the old column.
        e.stopPropagation()
        col = device
        if (waiting?.action === action && waiting.device === device) stopWaiting(m.fixed)
        else wait(action, device)
      })
    }
    const el = h('div', { class: 'control-row' }, h('span', { class: 'control-label' }, m.actions[action]), cells.key, cells.pad)
    return { action, el, cells }
  })

  const sync = () => {
    const { key, pad } = settings().controls
    for (const line of lines) {
      const k = key[line.action]
      const p = pad[line.action]
      setText(line.cells.key, k === null ? m.unbound : keyLabel(k))
      setText(line.cells.pad, p === null ? m.unbound : padLabel(p))
      for (const device of ['key', 'pad'] as const) {
        const cell = line.cells[device]
        cell.classList.toggle('focus', nav?.index === lines.indexOf(line) && col === device)
        cell.classList.toggle('listening', waiting?.action === line.action && waiting.device === device)
      }
    }
  }

  const stopWaiting = (text: string) => {
    waiting?.stop()
    waiting = null
    say(text)
    sync()
  }

  /** Applies a captured key or button and reports the actions it was taken from. */
  const assign = (action: Action, press: RawPress) => {
    const controls = settings().controls
    const label = press.device === 'key' ? keyLabel(press.code) : padLabel(press.button)
    if (press.device === 'key') {
      const { table, moved } = rebind(controls.key, 'key', action, press.code)
      updateSettings({ controls: { ...controls, key: table } })
      return moved.map((x) => m.moved(label, m.actions[x.action], x.to === null ? null : keyLabel(x.to)))
    }
    const { table, moved } = rebind(controls.pad, 'pad', action, press.button)
    updateSettings({ controls: { ...controls, pad: table } })
    return moved.map((x) => m.moved(label, m.actions[x.action], x.to === null ? null : padLabel(x.to)))
  }

  const wait = (action: Action, device: Device) => {
    waiting?.stop()
    const stop = input.capture((press) => {
      if (press.device === 'key' && press.code === 'Escape') return stopWaiting(m.fixed)
      if (press.device !== device) return
      if (press.device === 'key' && RESERVED_KEYS.includes(press.code)) return say(m.reserved)
      const notes = assign(action, press)
      playSfx('select')
      stopWaiting(notes.join(' ') || m.bound(m.actions[action], press.device === 'key' ? keyLabel(press.code) : padLabel(press.button)))
    })
    waiting = { action, device, stop }
    playSfx('move')
    say(device === 'key' ? m.pressKey(m.actions[action]) : m.pressButton(m.actions[action]))
    sync()
  }

  const restore = h('button', { class: 'btn' }, m.restore)
  const back = h('button', { class: 'btn' }, m.back)
  const items = [...lines.map((l) => l.el), restore, back]

  let closed = false
  const close = () => {
    if (closed) return
    closed = true
    playSfx('select')
    dispose()
    later(onClose)
  }

  nav = menu(input, items, (i) => {
    const line = lines[i]
    if (line) return wait(line.action, col)
    if (items[i] === restore) {
      updateSettings({ controls: DEFAULT_BINDINGS })
      playSfx('select')
      return stopWaiting(m.restored)
    }
    close()
  })

  const offKeys = input.onKey((key) => {
    if (key === 'ArrowLeft' || key === 'KeyA' || key === 'ArrowRight' || key === 'KeyD') {
      col = col === 'key' ? 'pad' : 'key'
      playSfx('move')
    } else if (key === 'Escape' || key === 'Backspace') close()
    // `menu` moved the cursor first (it listens first): redraw the focused cell and keep it in view.
    sync()
    if (nav) items[nav.index]?.scrollIntoView({ block: 'nearest' })
  })
  items.forEach((el) => el.addEventListener('pointerenter', () => later(sync)))

  const el = h(
    'div',
    { class: 'screen dim' },
    h(
      'div',
      { class: 'dialog box pop settings controls' },
      h('div', { class: 'dialog-title' }, m.title),
      h('p', { class: 'controls-note touch-only' }, m.touchNote),
      h('div', { class: 'control-row control-head', 'aria-hidden': 'true' }, h('span'), h('span', {}, m.keyboard), h('span', {}, m.gamepad)),
      h('div', { class: 'controls-list' }, ...lines.map((l) => l.el)),
      status,
      h('div', { class: 'buttons' }, restore, back),
      hint(m.hintKeys, m.hintTouch),
    ),
  )

  const dispose = () => {
    waiting?.stop()
    nav?.off()
    offKeys()
    el.remove()
  }

  say(m.fixed)
  sync()
  root.append(el)
  return { el, dispose }
}
