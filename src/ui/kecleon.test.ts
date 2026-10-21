import { describe, expect, it } from 'vitest'
import { HEAVY_WALLET, LOYAL_STREAK, partOfDay, pickTrigger, weekdayOf, type VisitContext } from './kecleon'

describe('partOfDay', () => {
  it('splits the local day at 5, 12 and 18 h', () => {
    expect([4, 5, 11, 12, 17, 18, 23, 0].map(partOfDay)).toEqual(['night', 'morning', 'morning', 'afternoon', 'afternoon', 'evening', 'evening', 'night'])
  })
})

/** A visit with nothing special about it: a regular wallet, a normal-type partner. */
const plain: VisitContext = {
  firstEver: false,
  firstToday: false,
  streak: 1,
  wonLastRun: false,
  wallet: 5_000,
  nextLevel: 30_000,
  cheapest: 600,
  giftWaiting: false,
  wish: null,
  partner: { name: 'Eevee', shiny: false, type: 'normal' },
  roll: 0,
}

describe('pickTrigger', () => {
  it('says hello by the time of day when nothing else applies', () => {
    expect(pickTrigger(plain)).toBe('greeting')
  })

  it('follows its priority order', () => {
    const everything: VisitContext = {
      ...plain,
      firstEver: true,
      firstToday: true,
      streak: LOYAL_STREAK,
      wonLastRun: true,
      wallet: HEAVY_WALLET,
      wish: { name: 'Honey', today: true, back: null },
      partner: { name: 'Charmander', shiny: true, type: 'fire' },
    }
    const order = ['first', 'wishToday', 'mewtwo', 'loyal', 'invest', 'shiny', 'type', 'greeting']
    const off: Partial<VisitContext>[] = [
      { firstEver: false },
      { wish: null },
      { wonLastRun: false },
      { streak: 1 },
      { wallet: 5_000 },
      { partner: { name: 'Charmander', shiny: false, type: 'fire' } },
      { partner: { name: 'Eevee', shiny: false, type: 'normal' } },
    ]
    let c = everything
    const seen = [pickTrigger(c)]
    for (const change of off) {
      c = { ...c, ...change }
      seen.push(pickTrigger(c))
    }
    expect(seen).toEqual(order)
  })

  it('tells a regular once a day, and a heavy wallet only when the next level is affordable', () => {
    expect(pickTrigger({ ...plain, streak: LOYAL_STREAK + 3, firstToday: true })).toBe('loyal')
    expect(pickTrigger({ ...plain, streak: LOYAL_STREAK + 3, firstToday: false, roll: 0.9 })).toBe('greeting')
    expect(pickTrigger({ ...plain, wallet: 900_000, nextLevel: 800_000, firstToday: true })).toBe('invest')
    expect(pickTrigger({ ...plain, wallet: 200_000, nextLevel: 300_000, firstToday: true, roll: 0.9 })).toBe('greeting')
    expect(pickTrigger({ ...plain, wallet: 900_000, nextLevel: null, firstToday: true, roll: 0.9 })).toBe('greeting')
  })

  it("says when the wishlist's card is back, and sighs at a wallet that can't buy anything (unless the gift waits)", () => {
    expect(pickTrigger({ ...plain, wish: { name: 'Honey', today: false, back: '2026-10-24' }, roll: 0.2 })).toBe('wishLater')
    expect(pickTrigger({ ...plain, wallet: 100, cheapest: 600 })).toBe('broke')
    expect(pickTrigger({ ...plain, wallet: 100, cheapest: 600, giftWaiting: true })).toBe('greeting')
    expect(pickTrigger({ ...plain, wallet: 100, cheapest: null })).toBe('greeting')
  })
})

describe('weekdayOf', () => {
  it('reads a Brasília day key as its weekday, Sunday first', () => {
    expect(['2026-10-18', '2026-10-19', '2026-10-24'].map(weekdayOf)).toEqual([0, 1, 6])
  })
})
