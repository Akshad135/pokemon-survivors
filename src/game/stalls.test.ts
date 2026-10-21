import { describe, expect, it } from 'vitest'
import { HALLOWEEN } from '../data/halloween'
import { STALLS } from '../data/visitors'
import { addDays } from './day'
import { EGGS } from './eggs'
import { EMPTY_SAVE, parseSave, type Save } from './meta'
import { buyFromStall, mergeStall, NO_STALL, parseStall, stallBlock, stallGoods, stallOn } from './stalls'
import { mergeSaves } from './sync'

const EGG = STALLS.halloween.goods.hauntedEgg
const rich = (patch: Partial<Save> = {}): Save => ({ ...EMPTY_SAVE, wallet: 50_000, ...patch })

describe('Duskull’s stall', () => {
  it('sells the Haunted Egg only on the Noite das Bruxas days', () => {
    expect(stallGoods('halloween')).toEqual(['hauntedEgg'])
    for (const day of [HALLOWEEN.from, '2026-10-31', HALLOWEEN.to]) {
      expect(stallOn(day)).toBe('halloween')
      expect(stallBlock(rich(), 'hauntedEgg', day)).toBeNull()
    }
    for (const day of [addDays(HALLOWEEN.from, -1), addDays(HALLOWEEN.to, 1), '2027-10-24']) {
      expect(stallBlock(rich(), 'hauntedEgg', day)).toBe('closed')
      expect(buyFromStall(rich(), 'hauntedEgg', day)).toBeNull()
    }
  })

  it('sells one a day per save, into the incubator, spending ₽ into `spent`', () => {
    const day = '2026-10-25'
    const once = buyFromStall(rich(), 'hauntedEgg', day)!
    expect(once.eggs).toEqual([{ tier: 'haunted', steps: 0 }])
    expect([once.wallet, once.spent]).toEqual([50_000 - EGG.price, EGG.price])
    expect(stallBlock(once, 'hauntedEgg', day)).toBe('soldOut')
    expect(buyFromStall(once, 'hauntedEgg', day)).toBeNull()
    // The next Brasília day brings another.
    expect(buyFromStall(once, 'hauntedEgg', addDays(day, 1))!.eggs).toHaveLength(2)
  })

  it('refuses a full incubator and a short wallet', () => {
    const full = rich({ eggs: Array.from({ length: EGGS.slots }, () => ({ tier: 'common', steps: 0 }) as const) })
    expect(stallBlock(full, 'hauntedEgg', HALLOWEEN.from)).toBe('full')
    expect(stallBlock(rich({ wallet: EGG.price - 1 }), 'hauntedEgg', HALLOWEEN.from)).toBe('poor')
  })
})

describe('the stall in the save', () => {
  const day = '2026-10-26'

  it('merges to the later day, and on the same day keeps what either side bought', () => {
    const bought = { day, bought: { hauntedEgg: 1 } }
    expect(mergeStall(NO_STALL, bought)).toEqual(bought)
    expect(mergeStall({ day: '2026-10-25', bought: { hauntedEgg: 1 } }, { day, bought: {} })).toEqual({ day, bought: {} })
    expect(mergeStall({ day, bought: {} }, bought)).toEqual(bought)
    // Two devices that each saw the egg unsold can't both sell it once synced.
    const a = buyFromStall(rich(), 'hauntedEgg', day)!
    expect(stallBlock(mergeSaves(rich(), a), 'hauntedEgg', day)).toBe('soldOut')
  })

  it('parses a day and known goods up to their daily stock', () => {
    expect(parseStall({ day, bought: { hauntedEgg: 9, ghost: 2 } })).toEqual({ day, bought: { hauntedEgg: 1 } })
    expect(parseStall({ day: 'yesterday', bought: { hauntedEgg: 1 } })).toEqual(NO_STALL)
    expect(parseSave(JSON.stringify({ ...EMPTY_SAVE, stall: undefined }))?.stall).toEqual(NO_STALL)
  })
})
