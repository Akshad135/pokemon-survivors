import { describe, expect, it } from 'vitest'
import { BAG_ITEM_IDS } from '../data/shop'
import { addToBag, armBlock, armedItems, armItem, bagCount, EMPTY_BAG, mergeBag, parseBag, parseBagItems, useArmed, type Bag } from './bag'

/** A bag holding `n` of every item. */
const stocked = (n = 1): Bag => BAG_ITEM_IDS.reduce((b, id) => addToBag(b, id, n), EMPTY_BAG)

describe('the bag', () => {
  it('only arms what it has, and a run uses each armed item up once and disarms it', () => {
    expect(armItem(EMPTY_BAG, 'lure', true, 2).armed.lure).toBe(false)
    expect(armBlock(EMPTY_BAG, 'lure', 2)).toBe('empty')
    const bag = armItem(addToBag(EMPTY_BAG, 'lure', 2), 'lure', true, 2)
    const first = useArmed(bag, 2)
    expect(first.used).toEqual(['lure'])
    expect(bagCount(first.bag, 'lure')).toBe(1)
    expect(first.bag.armed.lure).toBe(false)
    expect(useArmed(first.bag, 2).used).toEqual([])
  })

  it('arms as many different items as the limit, one of each', () => {
    const two = armItem(armItem(stocked(3), 'rareCandy', true, 2), 'maxRevive', true, 2)
    expect(armBlock(two, 'xAttack', 2)).toBe('full')
    expect(armItem(two, 'xAttack', true, 2)).toBe(two)
    expect(armBlock(two, 'rareCandy', 2)).toBeNull()
    // Disarming always works, and frees a slot.
    expect(armedItems(armItem(armItem(two, 'rareCandy', false, 2), 'xAttack', true, 2))).toEqual(['xAttack', 'maxRevive'])
    const run = useArmed(two, 2)
    expect(run.used).toEqual(['rareCandy', 'maxRevive'])
    expect(bagCount(run.bag, 'rareCandy')).toBe(2)
  })

  it('uses no more than the limit even when more are armed (a merge), and leaves what `keep` spares', () => {
    const all = BAG_ITEM_IDS.reduce((b, id) => armItem(b, id, true, BAG_ITEM_IDS.length), stocked())
    expect(useArmed(all, 3).used).toEqual(BAG_ITEM_IDS.slice(0, 3))
    const honey = armItem(addToBag(EMPTY_BAG, 'honey'), 'honey', true, 2)
    const kept = useArmed(honey, 2, (id) => id === 'honey')
    expect(kept.used).toEqual([])
    expect(bagCount(kept.bag, 'honey')).toBe(1)
  })

  it('merges two devices without bringing a used item back', () => {
    const bought = addToBag(EMPTY_BAG, 'incense', 2)
    const usedOne = useArmed(armItem(bought, 'incense', true, 2), 2).bag
    const boughtMore = addToBag(bought, 'luckIncense')
    const merged = mergeBag(usedOne, boughtMore)
    expect(bagCount(merged, 'incense')).toBe(1)
    expect(bagCount(merged, 'luckIncense')).toBe(1)
    expect(mergeBag(merged, merged)).toEqual(merged)
  })

  it('parses tolerantly: never more used than got, nothing armed it lacks', () => {
    expect(parseBag(undefined)).toEqual(EMPTY_BAG)
    const bag = parseBag({ lure: { got: 2.7, used: 9 }, incense: 'x', honey: { got: 1 }, armed: { lure: true, incense: true, honey: true }, rocket: { got: 1 } })
    expect(bag.lure).toEqual({ got: 2, used: 2 })
    expect(bag.incense).toEqual({ got: 0, used: 0 })
    expect(armedItems(bag)).toEqual(['honey'])
    expect(parseBagItems(['maxRevive', 'lure', 'rocket', 'lure'])).toEqual(['lure', 'maxRevive'])
  })
})
