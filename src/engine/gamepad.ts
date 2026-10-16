import { ACTION_IDS, inScope, type Action, type Table } from './bindings'

/** Left stick deflection that counts as a D-pad press. */
const STICK_PRESS = 0.6

/** The left stick read as the four directions. It always means movement, whatever the D-pad is bound to. */
export const stickActions = (axes: readonly number[]) => {
  const [x = 0, y = 0] = axes
  const held = new Set<Action>()
  if (x < -STICK_PRESS) held.add('left')
  if (x > STICK_PRESS) held.add('right')
  if (y < -STICK_PRESS) held.add('up')
  if (y > STICK_PRESS) held.add('down')
  return held
}

/**
 * Actions a pad state triggers in this context (`playing`: a run, not a menu):
 * the bound buttons in `buttons` plus the stick directions in `stick`.
 */
export const padActions = (pad: Table<number>, buttons: ReadonlySet<number>, stick: ReadonlySet<Action>, playing: boolean) =>
  ACTION_IDS.filter((a) => inScope(a, playing) && (stick.has(a) || (pad[a] !== null && buttons.has(pad[a]))))

/** Standard-mapping buttons held right now on any connected pad, and the sticks read as directions. */
export const readPads = () => {
  const buttons = new Set<number>()
  const stick = new Set<Action>()
  for (const pad of navigator.getGamepads?.() ?? []) {
    if (!pad) continue
    pad.buttons.forEach((b, i) => b.pressed && buttons.add(i))
    stickActions(pad.axes).forEach((a) => stick.add(a))
  }
  return { buttons, stick }
}
