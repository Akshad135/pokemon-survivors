import { describe, expect, it } from 'vitest'
import { CARAVAN } from '../data/visitors'
import { buyFromCaravan, caravanBlock, caravanPrice, caravanStock, CARAVAN_FRAME_ID, haggle, isCaravanDay, isoWeek, mergeCaravan, NO_CARAVAN, parseCaravan } from './caravan'
import { addDays } from './day'
import { EMPTY_SAVE, type Save } from './meta'
import { NO_SHOP } from './shop'
import { shopTmMoveIds } from './shopTmMoves'

/** A Friday, then its Saturday and Sunday, and the Monday after. */
const FRI = '2026-10-23'
const SAT = addDays(FRI, 1)
const SUN = addDays(FRI, 2)
const MON = addDays(FRI, 3)

const rich = (patch: Partial<Save> = {}): Save => ({ ...EMPTY_SAVE, wallet: 200_000, shop: { ...NO_SHOP, level: 4 }, ...patch })

describe('the caravan’s days and stock', () => {
  it('parks Friday to Sunday, the three days in one ISO week', () => {
    expect([FRI, SAT, SUN].map(isCaravanDay)).toEqual([true, true, true])
    expect([MON, addDays(FRI, -1)].map(isCaravanDay)).toEqual([false, false])
    expect(new Set([FRI, SAT, SUN].map(isoWeek))).toEqual(new Set(['2026-W43']))
    // ISO weeks cross the new year: 2027-01-01 is a Friday of 2026's week 53.
    expect(isoWeek('2027-01-01')).toBe('2026-W53')
    expect(isoWeek('2027-01-04')).toBe('2027-W01')
  })

  it('brings the egg, the Gold Bottle Cap, the frame and exclusive TMs, the same all weekend', () => {
    const stock = caravanStock(isoWeek(FRI))
    expect(stock.slice(0, 3)).toEqual(['egg', 'goldCap', 'frame'])
    const tms = stock.slice(3)
    expect(tms).toHaveLength(CARAVAN.tms)
    expect(tms.every((id) => shopTmMoveIds().some((m) => m === id))).toBe(true)
    expect(caravanStock(isoWeek(SUN))).toEqual(stock)
    // Some weekend within a few months brings other TMs.
    const others = Array.from({ length: 12 }, (_, i) => caravanStock(isoWeek(addDays(FRI, 7 * (i + 1)))).slice(3).join())
    expect(others.some((t) => t !== tms.join())).toBe(true)
  })

  it('opens only on its days, from the Kecleon Mart', () => {
    expect(caravanBlock(rich(), 'egg', FRI)).toBeNull()
    expect(caravanBlock(rich(), 'egg', MON)).toBe('closed')
    expect(caravanBlock(rich({ shop: { ...NO_SHOP, level: 3 } }), 'egg', FRI)).toBe('closed')
  })
})

describe('buying from the caravan', () => {
  it('sells one of each per weekend, into spent, and restocks the next weekend', () => {
    const bought = buyFromCaravan(rich(), 'egg', FRI)!
    expect(bought.wallet).toBe(200_000 - CARAVAN.egg.price)
    expect(bought.spent).toBe(CARAVAN.egg.price)
    expect(bought.eggs.map((e) => e.tier)).toEqual([CARAVAN.egg.tier])
    expect(caravanBlock(bought, 'egg', SUN)).toBe('soldOut')
    expect(caravanBlock(bought, 'egg', addDays(FRI, 7))).toBeNull()
  })

  it('puts the Gold Bottle Cap on a Pokémon the save plays, straight to the top', () => {
    expect(buyFromCaravan(rich(), 'goldCap', FRI)).toBeNull()
    const capped = buyFromCaravan(rich({ caps: { charmander: 1 } }), 'goldCap', FRI, 'charmander')!
    expect(capped.caps.charmander).toBe(3)
    expect(buyFromCaravan(rich({ caps: { charmander: 3 } }), 'goldCap', FRI, 'charmander')).toBeNull()
  })

  it('wears Meowth’s frame with the id that vouches for it, and owns a TM once', () => {
    const framed = buyFromCaravan(rich(), 'frame', FRI)!
    expect(framed.style.owned.frame).toContain(CARAVAN.frame.id)
    expect(framed.gifts).toContain(CARAVAN_FRAME_ID)
    const tm = caravanStock(isoWeek(FRI))[3]!
    const owned = buyFromCaravan(rich(), tm, FRI)!
    expect(owned.tms.owned).toContain(tm)
    expect(caravanBlock(owned, tm, addDays(FRI, 7))).toBe('closed')
  })
})

describe('haggling', () => {
  it('needs the loyalty stamps, then takes 20% off the whole weekend', () => {
    const regular = rich({ shop: { ...NO_SHOP, level: 4, stamps: CARAVAN.haggle.stamps - 1 } })
    expect(haggle(regular, FRI)).toEqual({ save: regular, ok: false })
    const loyal = rich({ shop: { ...NO_SHOP, level: 4, stamps: CARAVAN.haggle.stamps } })
    const { save, ok } = haggle(loyal, FRI)
    expect(ok).toBe(true)
    expect(caravanPrice(save, 'goldCap', SUN)).toBe(Math.round(CARAVAN.goldCap.price * (1 - CARAVAN.haggle.off)))
    expect(caravanPrice(save, 'goldCap', addDays(FRI, 7))).toBe(CARAVAN.goldCap.price)
  })
})

describe('the caravan’s save', () => {
  it('merges to the later weekend, and on the same one, what either side bought and haggled', () => {
    const a = { week: '2026-W43', bought: ['egg'], haggled: false } as const
    const b = { week: '2026-W43', bought: ['frame'], haggled: true } as const
    expect(mergeCaravan(a, b)).toEqual({ week: '2026-W43', bought: ['egg', 'frame'], haggled: true })
    const later = { week: '2026-W44', bought: [], haggled: false } as const
    expect(mergeCaravan(b, later)).toEqual(later)
    expect(mergeCaravan(later, b)).toEqual(later)
  })

  it('parses tolerantly', () => {
    expect(parseCaravan(undefined)).toEqual(NO_CARAVAN)
    expect(parseCaravan({ week: 'soon', bought: ['egg'] })).toEqual(NO_CARAVAN)
    expect(parseCaravan({ week: '2026-W43', bought: ['egg', 'egg', 'rocket', 'payDay'], haggled: 'yes' })).toEqual({ week: '2026-W43', bought: ['egg', 'payDay'], haggled: false })
  })
})
