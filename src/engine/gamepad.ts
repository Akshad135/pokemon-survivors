/**
 * Edge-detects a standard-mapping gamepad button across all connected pads
 * (0 = A on Xbox, ✕ on PlayStation). Call once per frame; true on the press.
 */
export const createPadButton = (index: number) => {
  let held = false
  return () => {
    const down = navigator.getGamepads?.().some((pad) => pad?.buttons[index]?.pressed) ?? false
    const pressed = down && !held
    held = down
    return pressed
  }
}

/**
 * Standard-mapping buttons as the key codes every menu already handles:
 * D-pad moves, A confirms, B backs out (Backspace, so it never pauses a run) and Start pauses.
 */
const PAD_BUTTON_KEYS = [
  [12, 'ArrowUp'],
  [13, 'ArrowDown'],
  [14, 'ArrowLeft'],
  [15, 'ArrowRight'],
  [0, 'Enter'],
  [1, 'Backspace'],
  [9, 'Escape'],
] as const

/** Left stick deflection that counts as a D-pad press. */
const STICK_PRESS = 0.6

/** Keys a pad is holding right now: its buttons plus the left stick read as a D-pad. */
export const padKeys = (pressed: readonly boolean[], axes: readonly number[]) => {
  const keys = new Set<string>(PAD_BUTTON_KEYS.filter(([i]) => pressed[i]).map(([, key]) => key))
  const [x = 0, y = 0] = axes
  if (x < -STICK_PRESS) keys.add('ArrowLeft')
  if (x > STICK_PRESS) keys.add('ArrowRight')
  if (y < -STICK_PRESS) keys.add('ArrowUp')
  if (y > STICK_PRESS) keys.add('ArrowDown')
  return keys
}

/**
 * Menu navigation for gamepads. Call once per frame; returns the key codes
 * newly pressed on any pad, ready to feed to `Input.press`.
 */
export const createPadKeys = () => {
  let held = new Set<string>()
  return () => {
    const now = new Set<string>()
    for (const pad of navigator.getGamepads?.() ?? []) {
      if (pad) padKeys(pad.buttons.map((b) => b.pressed), pad.axes).forEach((key) => now.add(key))
    }
    const pressed = [...now].filter((key) => !held.has(key))
    held = now
    return pressed
  }
}
