import { describe, expect, it } from 'vitest'
import { partOfDay } from './kecleon'

describe('partOfDay', () => {
  it('splits the local day at 5, 12 and 18 h', () => {
    expect([4, 5, 11, 12, 17, 18, 23, 0].map(partOfDay)).toEqual(['night', 'morning', 'morning', 'afternoon', 'afternoon', 'evening', 'evening', 'night'])
  })
})
