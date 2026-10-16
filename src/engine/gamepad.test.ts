import { describe, expect, it } from 'vitest'
import { DEFAULT_BINDINGS, rebind } from './bindings'
import { padActions, stickActions } from './gamepad'

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
