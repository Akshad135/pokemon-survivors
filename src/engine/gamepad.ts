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

/** One connected pad: its `Gamepad.index` and `id`, the standard-mapping buttons it holds and its left stick as directions. */
export type PadState = { index: number; id: string; buttons: ReadonlySet<number>; stick: ReadonlySet<Action> }

/** Every connected pad, read now. */
export const readPads = (): PadState[] =>
  (navigator.getGamepads?.() ?? []).flatMap((pad) =>
    pad ? [{ index: pad.index, id: pad.id, buttons: new Set(pad.buttons.flatMap((b, i) => (b.pressed ? [i] : []))), stick: stickActions(pad.axes) }] : [],
  )

/**
 * What the pads did since the last frame: the buttons and stick directions
 * held on any pad, the ones just pressed, and the id of a pad that pressed
 * something (null if none did). Presses are edge-detected pad by pad, so a
 * pad that keeps a button down (a second controller, a virtual one) doesn't
 * swallow the same button on the pad the player is using.
 */
export const padChanges = (before: readonly PadState[], now: readonly PadState[]) => {
  const buttons = new Set<number>()
  const stick = new Set<Action>()
  const fresh = new Set<number>()
  const freshStick = new Set<Action>()
  let pressed: string | null = null
  for (const pad of now) {
    const last = before.find((p) => p.index === pad.index && p.id === pad.id)
    for (const b of pad.buttons) {
      buttons.add(b)
      if (last?.buttons.has(b)) continue
      fresh.add(b)
      pressed = pad.id
    }
    for (const a of pad.stick) {
      stick.add(a)
      if (last?.stick.has(a)) continue
      freshStick.add(a)
      pressed = pad.id
    }
  }
  return { buttons, stick, fresh, freshStick, pressed }
}

/** Controller layouts, by the names printed on their buttons. Anything unknown reads as Xbox, the most common layout on PC. */
export type PadFamily = 'xbox' | 'playstation' | 'nintendo'

/** The layout of a pad from its `Gamepad.id`: the name the browser gives it, which carries the USB vendor (Sony 054c, Nintendo 057e). */
export const padFamily = (id: string): PadFamily => {
  if (/054c|playstation|dualsense|dualshock/i.test(id)) return 'playstation'
  if (/057e|nintendo|joy-con/i.test(id)) return 'nintendo'
  return 'xbox'
}

/** What a pad is called when its id says nothing readable. */
const BRANDS: Readonly<Record<PadFamily, string>> = { xbox: 'Xbox', playstation: 'PlayStation', nintendo: 'Nintendo' }

/**
 * A pad's name for people: `Gamepad.id` without the browser's extras
 * (Chrome's "(STANDARD GAMEPAD Vendor: …)", Firefox's "045e-02ea-" prefix),
 * or its layout's brand when nothing readable is left (Firefox calls every
 * XInput pad "xinput").
 */
export const padName = (id: string) => {
  const name = id
    .replace(/\s*\(.*$/, '')
    .replace(/^[0-9a-f]{1,4}-[0-9a-f]{1,4}-/i, '')
    .trim()
  return name === '' || /^xinput$/i.test(name) ? BRANDS[padFamily(id)] : name
}
