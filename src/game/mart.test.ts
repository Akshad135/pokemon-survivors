import { describe, expect, it } from 'vitest'
import { bagCount } from './bag'
import { EGGS } from './eggs'
import { buyFromCounter, buyStyle, COUNTER, counterOf, counterPrice, mergeCounter, parseCounter, stockLeft, type Counter } from './mart'
import { EMPTY_SAVE, type Save } from './meta'
import { equipStyle, mergeStyle, NO_STYLES, ownsStyle, parseStyle } from './style'

const rich = (wallet: number): Save => ({ ...EMPTY_SAVE, wallet })

/** A counter whose sale is on `sale`. */
const counter = (sale: Counter['sale'], day = '2026-10-15'): Counter => ({ day, egg: 'rare', sale })

describe("the day's counter", () => {
  it('is the same for everyone on a day', () => {
    expect(counterOf('2026-10-15')).toEqual(counterOf('2026-10-15'))
    const eggs = new Set(Array.from({ length: 60 }, (_, i) => counterOf(`2026-day-${i}`).egg))
    expect(eggs.has('common') && eggs.has('rare')).toBe(true)
  })

  it('takes 30% off the day’s sale', () => {
    expect(counterPrice(counter('incense'), 'lure')).toBe(COUNTER.lure.price)
    expect(counterPrice(counter('lure'), 'lure')).toBe(COUNTER.lure.price * 0.7)
  })

  it('sells into the bag up to the daily stock, which a new day restocks', () => {
    const c = counter('egg')
    let save = rich(100_000)
    for (let i = 0; i < COUNTER.lure.stock; i++) save = buyFromCounter(save, c, 'lure')!
    expect(bagCount(save.bag, 'lure')).toBe(COUNTER.lure.stock)
    expect(buyFromCounter(save, c, 'lure')).toBeNull()
    expect(save.wallet + save.spent).toBe(100_000)
    const tomorrow = counter('egg', '2026-10-16')
    expect(stockLeft(save.counter, tomorrow, 'lure')).toBe(COUNTER.lure.stock)
    expect(buyFromCounter(save, tomorrow, 'lure')).not.toBeNull()
  })

  it("puts the day's egg in the incubator, but not into a full one", () => {
    const save = buyFromCounter(rich(10_000), counter('lure'), 'egg')!
    expect(save.eggs).toEqual([{ tier: 'rare', steps: 0 }])
    const full = { ...rich(10_000), eggs: Array.from({ length: EGGS.slots }, () => ({ tier: 'common' as const, steps: 0 })) }
    expect(buyFromCounter(full, counter('lure', '2026-10-16'), 'egg')).toBeNull()
  })

  it('merges to the newest day, the most bought of each on the same day', () => {
    const a = { day: '2026-10-15', bought: { lure: 1, incense: 3, egg: 0 } }
    const b = { day: '2026-10-15', bought: { lure: 2, incense: 0, egg: 1 } }
    expect(mergeCounter(a, b).bought).toEqual({ lure: 2, incense: 3, egg: 1 })
    expect(mergeCounter(a, { ...b, day: '2026-10-16' })).toEqual({ ...b, day: '2026-10-16' })
    expect(parseCounter({ day: '2026-10-15', bought: { lure: 99, egg: -1 } }).bought).toEqual({ lure: COUNTER.lure.stock, incense: 0, egg: 0 })
  })
})

describe('styles', () => {
  it('are bought once, then worn', () => {
    expect(buyStyle(rich(100), 'frame', 'master')).toBeNull()
    const save = buyStyle(rich(10_000), 'frame', 'poke')!
    expect(ownsStyle(save.style, 'frame', 'poke')).toBe(true)
    expect(save.spent).toBe(10_000 - save.wallet)
    expect(buyStyle(save, 'frame', 'poke')).toBeNull()
    expect(equipStyle(save.style, 'frame', 'master').equipped.frame).toBe('classic')
    expect(equipStyle(save.style, 'frame', 'poke').equipped.frame).toBe('poke')
  })

  it("parse and merge: unknown ids dropped, a style not owned isn't worn", () => {
    expect(parseStyle({ owned: { frame: ['poke', 'rocket', 'poke'] }, equipped: { frame: 'great', background: 'cave' } })).toEqual({
      owned: { frame: ['poke'], background: [], wallpaper: [] },
      equipped: { frame: 'classic', background: 'night', wallpaper: 'classic' },
    })
    const a = equipStyle({ ...NO_STYLES, owned: { ...NO_STYLES.owned, frame: ['poke'] } }, 'frame', 'poke')
    const b = { ...NO_STYLES, owned: { ...NO_STYLES.owned, wallpaper: ['snow' as const] } }
    expect(mergeStyle(a, b)).toEqual({ owned: { frame: ['poke'], background: [], wallpaper: ['snow'] }, equipped: NO_STYLES.equipped })
    expect(mergeStyle(b, a).equipped.frame).toBe('poke')
  })
})
