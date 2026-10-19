import { describe, expect, it } from 'vitest'
import { DEFAULT_BINDINGS, rebind } from './bindings'
import { padActions, padChanges, padFamily, padName, stickActions, type PadState } from './gamepad'

const pad = DEFAULT_BINDINGS.pad
const none = new Set<never>()

describe('padActions', () => {
  it('reads the shared A as confirm in menus and as the special in a run', () => {
    expect(padActions(pad, new Set([0]), none, false)).toEqual(['confirm'])
    expect(padActions(pad, new Set([0]), none, true)).toEqual(['special'])
  })

  it('follows the bindings, while the stick keeps moving', () => {
    const swapped = rebind(pad, 'pad', 'up', 4).table
    expect(padActions(swapped, new Set([4, 12]), none, true)).toEqual(['up'])
    expect(padActions(swapped, none, stickActions([0, -0.9]), true)).toEqual(['up'])
  })
})

describe('stickActions', () => {
  it('counts only past the threshold', () => {
    expect([...stickActions([0.3, -0.5])]).toEqual([])
    expect([...stickActions([-0.9, 0.8])].sort()).toEqual(['down', 'left'])
  })
})

describe('padChanges', () => {
  const state = (index: number, id: string, buttons: number[]): PadState => ({ index, id, buttons: new Set(buttons), stick: new Set() })

  it('sees a press on one pad while another pad holds the same button', () => {
    const virtual = state(1, 'Virtual pad', [0, 3])
    const { fresh, pressed } = padChanges([state(0, 'Xbox', []), virtual], [state(0, 'Xbox', [3]), virtual])
    expect([...fresh]).toEqual([3])
    expect(pressed).toBe('Xbox')
  })

  it('presses a held button once', () => {
    const held = [state(0, 'Xbox', [0])]
    expect(padChanges([], held).fresh).toEqual(new Set([0]))
    expect(padChanges(held, held)).toMatchObject({ fresh: new Set(), pressed: null })
  })
})

describe('padFamily and padName', () => {
  it('read the layout and a readable name from the ids browsers give', () => {
    expect(padFamily('Xbox 360 Controller (XInput STANDARD GAMEPAD)')).toBe('xbox')
    expect(padName('Xbox 360 Controller (XInput STANDARD GAMEPAD)')).toBe('Xbox 360 Controller')
    expect(padFamily('DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)')).toBe('playstation')
    expect(padName('054c-09cc-Wireless Controller')).toBe('Wireless Controller')
    expect(padFamily('057e-2009-Pro Controller')).toBe('nintendo')
    expect(padName('xinput')).toBe('Xbox')
  })
})
