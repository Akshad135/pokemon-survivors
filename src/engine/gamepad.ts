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
