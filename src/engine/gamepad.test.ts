import { describe, expect, it } from 'vitest'
import { padKeys } from './gamepad'

/** Standard-mapping button state with only `indices` held. */
const buttons = (...indices: number[]) => Array.from({ length: 17 }, (_, i) => indices.includes(i))

describe('padKeys', () => {
  it('maps the D-pad and face buttons to menu keys', () => {
    expect([...padKeys(buttons(12, 0), [0, 0])].sort()).toEqual(['ArrowUp', 'Enter'])
    expect([...padKeys(buttons(1, 9), [0, 0])].sort()).toEqual(['Backspace', 'Escape'])
  })

  it('reads the left stick as a D-pad only past the threshold', () => {
    expect([...padKeys(buttons(), [0.3, -0.5])]).toEqual([])
    expect([...padKeys(buttons(), [-0.9, 0.8])].sort()).toEqual(['ArrowDown', 'ArrowLeft'])
  })
})
