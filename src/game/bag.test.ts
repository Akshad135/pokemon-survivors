import { describe, expect, it } from 'vitest'
import { addToBag, armItem, bagCount, EMPTY_BAG, mergeBag, parseBag, useArmed } from './bag'

describe('the bag', () => {
  it('only arms what it has, and a run uses each armed item up once and disarms it', () => {
    expect(armItem(EMPTY_BAG, 'lure', true).armed.lure).toBe(false)
    const bag = armItem(addToBag(EMPTY_BAG, 'lure', 2), 'lure', true)
    const first = useArmed(bag)
    expect(first.used).toEqual({ lure: true, incense: false })
    expect(bagCount(first.bag, 'lure')).toBe(1)
    expect(first.bag.armed.lure).toBe(false)
    expect(useArmed(first.bag).used.lure).toBe(false)
  })

  it('merges two devices without bringing a used item back', () => {
    const bought = addToBag(EMPTY_BAG, 'incense', 2)
    const usedOne = useArmed(armItem(bought, 'incense', true)).bag
    const boughtMore = addToBag(bought, 'lure')
    const merged = mergeBag(usedOne, boughtMore)
    expect(bagCount(merged, 'incense')).toBe(1)
    expect(bagCount(merged, 'lure')).toBe(1)
    expect(mergeBag(merged, merged)).toEqual(merged)
  })

  it('parses tolerantly: never more used than got, nothing armed it lacks', () => {
    expect(parseBag(undefined)).toEqual(EMPTY_BAG)
    expect(parseBag({ lure: { got: 2.7, used: 9 }, incense: 'x', armed: { lure: true, incense: true }, rocket: { got: 1 } })).toEqual({
      lure: { got: 2, used: 2 },
      incense: { got: 0, used: 0 },
      armed: { lure: false, incense: false },
    })
  })
})
