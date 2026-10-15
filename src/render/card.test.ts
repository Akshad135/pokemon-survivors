import { describe, expect, it } from 'vitest'
import { showcase } from './card'

describe('showcase', () => {
  it('shows every item that fits, else one cell fewer and "+N" for the rest', () => {
    expect(showcase([1, 2, 3])).toEqual({ shown: [1, 2, 3], more: 0 })
    expect(showcase([1, 2, 3, 4, 5, 6])).toEqual({ shown: [1, 2, 3, 4, 5, 6], more: 0 })
    expect(showcase([1, 2, 3, 4, 5, 6, 7, 8, 9])).toEqual({ shown: [1, 2, 3, 4, 5], more: 4 })
  })
})
