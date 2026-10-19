import { describe, expect, it } from 'vitest'
import { stepGrid } from './gridNav'

describe('stepGrid', () => {
  it('walks the reading order with ← →, stopping at the ends', () => {
    expect(stepGrid(8, 'right', 9, 27)).toBe(9)
    expect(stepGrid(9, 'left', 9, 27)).toBe(8)
    expect(stepGrid(0, 'left', 9, 27)).toBe(0)
    expect(stepGrid(26, 'right', 9, 27)).toBe(26)
  })

  it('moves a row with ↑ ↓ and leaves through the top and bottom rows', () => {
    expect(stepGrid(4, 'down', 9, 27)).toBe(13)
    expect(stepGrid(13, 'up', 9, 27)).toBe(4)
    expect(stepGrid(4, 'up', 9, 27)).toBe('above')
    expect(stepGrid(22, 'down', 9, 27)).toBe('below')
  })

  it('lands on the last cell of a short last row', () => {
    // 52 cells, 10 wide: the last row holds 50 and 51.
    expect(stepGrid(47, 'down', 10, 52)).toBe(51)
    expect(stepGrid(51, 'down', 10, 52)).toBe('below')
  })
})
