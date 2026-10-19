import { describe, expect, it } from 'vitest'
import { NO_LIFETIME } from './achievements'
import { addClear, mergeClears, pastClears } from './clears'
import { EMPTY_SAVE, parseSave } from './meta'
import { mergeSaves } from './sync'

describe('clears', () => {
  it('records a win at the hardest difficulty it reached, and ignores runs that lost', () => {
    const won = addClear({}, { starter: 'gible', difficulty: 'hard', victory: true })
    expect(won).toEqual({ gible: 'hard' })
    expect(addClear(won, { starter: 'gible', difficulty: 'normal', victory: true })).toEqual({ gible: 'hard' })
    expect(addClear(won, { starter: 'gible', difficulty: 'nightmare', victory: true })).toEqual({ gible: 'nightmare' })
    expect(addClear(won, { starter: 'eevee', difficulty: 'nightmare', victory: false })).toBe(won)
  })

  it('merges as a union at the harder difficulty, in either order', () => {
    const a = { gible: 'hard', eevee: 'normal' } as const
    const b = { gible: 'normal', eevee: 'nightmare', squirtle: 'normal' } as const
    const want = { gible: 'hard', eevee: 'nightmare', squirtle: 'normal' }
    expect(mergeClears(a, b)).toEqual(want)
    expect(mergeClears(b, a)).toEqual(want)
    expect(mergeSaves({ ...EMPTY_SAVE, clears: a }, { ...EMPTY_SAVE, clears: b }).clears).toEqual(want)
  })

  it('backfills only the starters an older save proves won', () => {
    expect(pastClears({ ...NO_LIFETIME, winGens: [1], winTypes: ['fire', 'water'] })).toEqual({ charmander: 'normal', squirtle: 'normal' })
    expect(pastClears({ ...NO_LIFETIME, winGens: [1, 4], winTypes: ['grass'] })).toEqual({ bulbasaur: 'normal', turtwig: 'normal' })
    // Two regions and two types could be either pair.
    expect(pastClears({ ...NO_LIFETIME, winGens: [1, 2], winTypes: ['fire', 'water'] })).toEqual({})
  })

  it('backfills a save without the field, and keeps a saved one as is', () => {
    const achievements = { unlocked: [], lifetime: { ...NO_LIFETIME, wins: 1, winGens: [3], winTypes: ['water'] } }
    expect(parseSave(JSON.stringify({ version: 1, achievements })).clears).toEqual({ mudkip: 'normal' })
    expect(parseSave(JSON.stringify({ version: 1, achievements, clears: { gible: 'hard', nope: 'hard', eevee: 'easy' } })).clears).toEqual({ gible: 'hard' })
  })
})
