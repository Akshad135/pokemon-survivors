import type { Vec } from './math'

/**
 * Keyboard + pointer (virtual joystick) input. `readMove` returns a vector
 * with length ≤ 1. Discrete key presses are delivered through `onKey`.
 */
export type Input = {
  readMove: () => Vec
  onKey: (handler: (key: string) => void) => () => void
}

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

const JOYSTICK_RADIUS = 48

export const createInput = (target: HTMLElement): Input => {
  const held = new Set<string>()
  const handlers = new Set<(key: string) => void>()
  let stick: { id: number; origin: Vec; vec: Vec } | null = null

  window.addEventListener('keydown', (e) => {
    if (e.code in MOVE_KEYS) e.preventDefault()
    held.add(e.code)
    if (!e.repeat) handlers.forEach((h) => h(e.code))
  })
  window.addEventListener('keyup', (e) => held.delete(e.code))
  window.addEventListener('blur', () => held.clear())

  target.addEventListener('pointerdown', (e) => {
    stick = { id: e.pointerId, origin: { x: e.clientX, y: e.clientY }, vec: { x: 0, y: 0 } }
  })
  window.addEventListener('pointermove', (e) => {
    if (!stick || stick.id !== e.pointerId) return
    const dx = e.clientX - stick.origin.x
    const dy = e.clientY - stick.origin.y
    const len = Math.hypot(dx, dy)
    const scale = len > JOYSTICK_RADIUS ? 1 / len : 1 / JOYSTICK_RADIUS
    stick.vec = len < 6 ? { x: 0, y: 0 } : { x: dx * scale, y: dy * scale }
  })
  const release = (e: PointerEvent) => {
    if (stick?.id === e.pointerId) stick = null
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

  return { readMove, onKey }
}
