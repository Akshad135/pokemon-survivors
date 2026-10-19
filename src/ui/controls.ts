import { playSfx } from '../engine/audio'
import { ACTION_IDS, DEFAULT_BINDINGS, rebind, RESERVED_KEYS, type Action, type Device } from '../engine/bindings'
import { padFamily, padName } from '../engine/gamepad'
import type { Input, RawPress } from '../engine/input'
import { t } from '../i18n'
import { h, later, rich, setText } from './dom'
import { keyLabel, padLabel, setGlyphText } from './inputLabels'
import { hint, menu, type Screen } from './screens'
import { settings, updateSettings } from './settings'

/* ---------------- Screen ---------------- */

/**
 * Remap screen, opened from Settings: one line per action with its key and
 * gamepad button. ↑ ↓ pick the line, ← → the column, Enter (or a tap) waits
 * for the new key or button, from either device; Esc cancels the wait. Taking a key from another
 * action swaps them (see `rebind`) and says so. Changes apply and persist at once.
 * Esc or Backspace close it, then `onClose` runs after the key dispatch.
 * A line on top names the gamepads the browser shows the game (or says how to
 * make one appear), and the gamepad column names the buttons of that pad's layout.
 */
export const openControls = (root: HTMLElement, input: Input, onClose: () => void): Screen => {
  const m = t().controls
  // Opened with the pad: its column first.
  let col: Device = input.activePad() === null ? 'key' : 'pad'
  let waiting: { action: Action; device: Device; stop: () => void } | null = null
  let nav: ReturnType<typeof menu> | null = null

  const status = h('p', { class: 'controls-status', 'aria-live': 'polite' })
  const say = (text: string) => status.replaceChildren(rich(text))

  /** The layout the gamepad column names: the pad in use, else the first one connected, else Xbox. */
  const family = () => {
    const id = input.activePad() ?? input.pads()[0]
    return id === undefined ? 'xbox' : padFamily(id)
  }
  const label = (button: number) => padLabel(button, family())

  // A pad shows up on its first press, so the line follows the pads while the screen is open.
  const padLine = h('p', { class: 'controls-pad', 'aria-live': 'polite' })
  let shown = ''
  const watchPads = () => {
    const ids = input.pads()
    const seen = `${ids.join('|')}>${family()}`
    if (seen === shown) return
    shown = seen
    padLine.classList.toggle('missing', ids.length === 0)
    padLine.replaceChildren(rich(ids.length === 0 ? m.padMissing : m.padFound([...new Set(ids.map(padName))].join(' · '))))
    sync()
  }
  const padTimer = setInterval(watchPads, 250)

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
      setGlyphText(line.cells.pad, p === null ? m.unbound : label(p))
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
    const name = press.device === 'key' ? keyLabel(press.code) : label(press.button)
    if (press.device === 'key') {
      const { table, moved } = rebind(controls.key, 'key', action, press.code)
      updateSettings({ controls: { ...controls, key: table } })
      return moved.map((x) => m.moved(name, m.actions[x.action], x.to === null ? null : keyLabel(x.to)))
    }
    const { table, moved } = rebind(controls.pad, 'pad', action, press.button)
    updateSettings({ controls: { ...controls, pad: table } })
    return moved.map((x) => m.moved(name, m.actions[x.action], x.to === null ? null : label(x.to)))
  }

  /**
   * Waits for the new key or button of `action`. `device` is the highlighted
   * column, but the device pressed decides: a player who picked the line with
   * the pad's A (the keyboard column by default) binds the button they press next.
   */
  const wait = (action: Action, device: Device) => {
    waiting?.stop()
    const stop = input.capture((press) => {
      if (press.device === 'key' && press.code === 'Escape') return stopWaiting(m.fixed)
      if (press.device === 'key' && RESERVED_KEYS.includes(press.code)) return say(m.reserved)
      col = press.device
      const notes = assign(action, press)
      playSfx('select')
      stopWaiting(notes.join(' ') || m.bound(m.actions[action], press.device === 'key' ? keyLabel(press.code) : label(press.button)))
    })
    waiting = { action, device, stop }
    playSfx('move')
    say(m.press(m.actions[action]))
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
      padLine,
      h('div', { class: 'control-row control-head', 'aria-hidden': 'true' }, h('span'), h('span', {}, m.keyboard), h('span', {}, m.gamepad)),
      h('div', { class: 'controls-list' }, ...lines.map((l) => l.el)),
      status,
      h('div', { class: 'buttons' }, restore, back),
      hint(m.hintKeys, m.hintTouch),
    ),
  )

  const dispose = () => {
    clearInterval(padTimer)
    waiting?.stop()
    nav?.off()
    offKeys()
    el.remove()
  }

  say(m.fixed)
  watchPads()
  sync()
  root.append(el)
  return { el, dispose }
}
