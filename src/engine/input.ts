import { ACTIONS, keyCode, type Action, type Bindings } from './bindings'
import { padActions, readPads } from './gamepad'
import type { Vec } from './math'

/**
 * Keyboard + gamepad + pointer (floating virtual joystick) input. `readMove`
 * returns a vector with length ≤ 1. `readStick` exposes the joystick (CSS px)
 * so the shell can draw it. Discrete presses are delivered through `onKey` as
 * key codes, after the player's bindings (see `engine/bindings.ts`): a remapped
 * key and a gamepad button arrive as the codes the screens already handle.
 */
export type Input = {
  readMove: () => Vec
  readStick: () => Stick | null
  onKey: (handler: (key: string) => void) => () => void
  /** Delivers a key press that didn't come from the keyboard. */
  press: (key: string) => void
  /** Reads the gamepads. Call once per frame; `playing` (a run, not a menu) picks what the buttons mean. */
  poll: (playing: boolean) => void
  /**
   * Hands every raw key and pad button press to `take`, bypassing the bindings
   * and `onKey`, until the returned function is called (the remap screen).
   */
  capture: (take: (press: RawPress) => void) => () => void
}

/** A press before the bindings: a `KeyboardEvent.code` or a standard-mapping button. */
export type RawPress = { device: 'key'; code: string } | { device: 'pad'; button: number }

/** Joystick state in CSS px: where the base sits and where the knob is drawn. */
export type Stick = { origin: Vec; knob: Vec; vec: Vec }

const MOVE_KEYS: Record<string, Vec> = {
  KeyW: { x: 0, y: -1 },
  ArrowUp: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
  ArrowDown: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  ArrowLeft: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
}

/** Max knob travel (CSS px). */
export const STICK_RADIUS = 52
/** Thumb jitter below this (CSS px) doesn't move the player. */
const STICK_DEAD_ZONE = 8
/** Full speed is reached at this fraction of the radius, so the edge isn't a precision target. */
const STICK_FULL_AT = 0.75

/**
 * Pure joystick rule. Past the max radius the base is dragged along with the
 * thumb (a "floating" stick), so reversing direction is instant. Inside the
 * dead zone the player stands still; beyond it speed ramps up to 1.
 */
export const joystick = (origin: Vec, pointer: Vec): Stick => {
  let dx = pointer.x - origin.x
  let dy = pointer.y - origin.y
  const len = Math.hypot(dx, dy)
  let base = origin
  if (len > STICK_RADIUS) {
    const k = STICK_RADIUS / len
    base = { x: pointer.x - dx * k, y: pointer.y - dy * k }
    dx *= k
    dy *= k
  }
  const travel = Math.min(len, STICK_RADIUS)
  const speed = Math.min(1, Math.max(0, (travel - STICK_DEAD_ZONE) / (STICK_RADIUS * STICK_FULL_AT - STICK_DEAD_ZONE)))
  const vec = speed > 0 ? { x: (dx / travel) * speed, y: (dy / travel) * speed } : { x: 0, y: 0 }
  return { origin: base, knob: { x: base.x + dx, y: base.y + dy }, vec }
}

/** `bindings` is read on every press, so a remap applies at once. */
export const createInput = (target: HTMLElement, bindings: () => Bindings): Input => {
  /** Keys held down, by physical code, with the code they typed (the bindings may change while one is held). */
  const held = new Map<string, string>()
  const handlers = new Set<(key: string) => void>()
  const dispatch = (key: string) => handlers.forEach((h) => h(key))
  let capturing: ((press: RawPress) => void) | null = null
  let pointerId: number | null = null
  let stick: Stick | null = null
  let padButtons = new Set<number>()
  let padStick = new Set<Action>()
  /** Codes the pads hold in a run (the directions), read by `readMove` like held keys. */
  let padHeld: string[] = []

  window.addEventListener('keydown', (e) => {
    // Typing in a text field (the profile editor) is not playing: the field keeps its keys.
    if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select')) return
    if (capturing) {
      e.preventDefault()
      if (!e.repeat && e.code) capturing({ device: 'key', code: e.code })
      return
    }
    const code = keyCode(bindings().key, e.code)
    if (code === null) return
    if (code in MOVE_KEYS || code !== e.code) e.preventDefault()
    held.set(e.code, code)
    if (!e.repeat) dispatch(code)
  })
  window.addEventListener('keyup', (e) => held.delete(e.code))
  window.addEventListener('blur', () => {
    held.clear()
    pointerId = null
    stick = null
  })

  // The first finger on the canvas owns the stick; extra fingers are ignored.
  target.addEventListener('pointerdown', (e) => {
    if (pointerId !== null || (e.pointerType === 'mouse' && e.button !== 0)) return
    pointerId = e.pointerId
    const at = { x: e.clientX, y: e.clientY }
    stick = joystick(at, at)
  })
  window.addEventListener('pointermove', (e) => {
    if (!stick || e.pointerId !== pointerId) return
    stick = joystick(stick.origin, { x: e.clientX, y: e.clientY })
  })
  const release = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return
    pointerId = null
    stick = null
  }
  window.addEventListener('pointerup', release)
  window.addEventListener('pointercancel', release)

  const readMove = (): Vec => {
    if (stick) return stick.vec
    let x = 0
    let y = 0
    for (const code of [...held.values(), ...padHeld]) {
      const v = MOVE_KEYS[code]
      if (v) {
        x += v.x
        y += v.y
      }
    }
    const len = Math.hypot(x, y)
    return len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 }
  }

  const onKey = (handler: (key: string) => void) => {
    handlers.add(handler)
    return () => void handlers.delete(handler)
  }

  // Edge-detected per button, not per code: a button held across a run/menu switch doesn't press again.
  const poll = (playing: boolean) => {
    const { buttons, stick: axes } = readPads()
    const fresh = new Set([...buttons].filter((b) => !padButtons.has(b)))
    const freshStick = new Set([...axes].filter((a) => !padStick.has(a)))
    padButtons = buttons
    padStick = axes
    const pad = bindings().pad
    padHeld = playing ? padActions(pad, buttons, axes, true).map((a) => ACTIONS[a].code) : []
    if (capturing) return fresh.forEach((button) => capturing?.({ device: 'pad', button }))
    padActions(pad, fresh, freshStick, playing).forEach((a) => dispatch(ACTIONS[a].code))
  }

  const capture = (take: (press: RawPress) => void) => {
    capturing = take
    held.clear()
    return () => void (capturing === take && (capturing = null))
  }

  return { readMove, readStick: () => stick, onKey, press: dispatch, poll, capture }
}
