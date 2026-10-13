import type { Vec } from './math'

/**
 * Keyboard + pointer (floating virtual joystick) input. `readMove` returns a
 * vector with length ≤ 1. `readStick` exposes the joystick (CSS px) so the
 * shell can draw it. Discrete key presses are delivered through `onKey`.
 */
export type Input = {
  readMove: () => Vec
  readStick: () => Stick | null
  onKey: (handler: (key: string) => void) => () => void
}

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

export const createInput = (target: HTMLElement): Input => {
  const held = new Set<string>()
  const handlers = new Set<(key: string) => void>()
  let pointerId: number | null = null
  let stick: Stick | null = null

  window.addEventListener('keydown', (e) => {
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

  return { readMove, readStick: () => stick, onKey }
}
