import type { Vec } from './math'

/**
 * Keyboard + pointer (virtual joystick) input. `readMove` returns a vector
 * with length ≤ 1. `readStick` exposes the joystick (CSS px) so the shell can
 * draw it. Discrete key presses are delivered through `onKey`.
 */
export type Input = {
  readMove: () => Vec
  readStick: () => Stick | null
  onKey: (handler: (key: string) => void) => () => void
  /** Delivers a key press that didn't come from the keyboard (gamepad menu navigation). */
  press: (key: string) => void
}

/** Joystick state in CSS px: where the base sits and where the knob is drawn. */
export type Stick = { origin: Vec; knob: Vec; vec: Vec }

/** `floating` appears under the thumb and follows it; `fixed` waits in a corner (the Controls setting). */
export const STICK_MODES = ['floating', 'fixed'] as const
export type StickMode = (typeof STICK_MODES)[number]

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

/** Knob offset → move vector: still inside the dead zone, then speed ramps up to 1. */
const stickVec = (dx: number, dy: number, travel: number): Vec => {
  const speed = Math.min(1, Math.max(0, (travel - STICK_DEAD_ZONE) / (STICK_RADIUS * STICK_FULL_AT - STICK_DEAD_ZONE)))
  return speed > 0 ? { x: (dx / travel) * speed, y: (dy / travel) * speed } : { x: 0, y: 0 }
}

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
  return { origin: base, knob: { x: base.x + dx, y: base.y + dy }, vec: stickVec(dx, dy, Math.min(len, STICK_RADIUS)) }
}

/** A touch this close to the fixed stick's center grabs it: twice the radius, so a thumb that lands a bit off still counts. */
export const FIXED_STICK_REACH = STICK_RADIUS * 2

/**
 * Fixed joystick rule: the base never moves and the knob stops at its rim, so
 * the stick is always where the thumb expects it. Same dead zone and ramp as
 * the floating one.
 */
export const fixedJoystick = (center: Vec, pointer: Vec): Stick => {
  const dx = pointer.x - center.x
  const dy = pointer.y - center.y
  const len = Math.hypot(dx, dy)
  const k = len > STICK_RADIUS ? STICK_RADIUS / len : 1
  return { origin: center, knob: { x: center.x + dx * k, y: center.y + dy * k }, vec: stickVec(dx * k, dy * k, len * k) }
}

/**
 * `fixedStick` returns the fixed joystick's center (CSS px) while that mode is
 * on, or null for the floating one. It's read on every touch, so the setting
 * and a rotation apply at once.
 */
export const createInput = (target: HTMLElement, fixedStick: () => Vec | null = () => null): Input => {
  const held = new Set<string>()
  const handlers = new Set<(key: string) => void>()
  let pointerId: number | null = null
  let stick: Stick | null = null
  /** The fixed center the current touch grabbed (null: it's floating). */
  let anchor: Vec | null = null

  window.addEventListener('keydown', (e) => {
    // Typing in a text field (the profile editor) is not playing: the field keeps its keys.
    if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select')) return
    if (e.code in MOVE_KEYS) e.preventDefault()
    held.add(e.code)
    if (!e.repeat) handlers.forEach((h) => h(e.code))
  })
  window.addEventListener('keyup', (e) => held.delete(e.code))
  window.addEventListener('blur', () => {
    held.clear()
    pointerId = null
    stick = null
  })

  // The first finger on the canvas owns the stick; extra fingers are ignored.
  // A fixed stick only answers touches within its reach.
  target.addEventListener('pointerdown', (e) => {
    if (pointerId !== null || (e.pointerType === 'mouse' && e.button !== 0)) return
    const at = { x: e.clientX, y: e.clientY }
    anchor = fixedStick()
    if (anchor && Math.hypot(at.x - anchor.x, at.y - anchor.y) > FIXED_STICK_REACH) return
    pointerId = e.pointerId
    stick = anchor ? fixedJoystick(anchor, at) : joystick(at, at)
  })
  window.addEventListener('pointermove', (e) => {
    if (!stick || e.pointerId !== pointerId) return
    const at = { x: e.clientX, y: e.clientY }
    stick = anchor ? fixedJoystick(anchor, at) : joystick(stick.origin, at)
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
    for (const code of held) {
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

  /** A fixed stick shows its base even when nobody is touching it. */
  const readStick = (): Stick | null => {
    if (stick) return stick
    const center = fixedStick()
    return center && { origin: center, knob: center, vec: { x: 0, y: 0 } }
  }

  return { readMove, readStick, onKey, press: (key) => handlers.forEach((h) => h(key)) }
}
