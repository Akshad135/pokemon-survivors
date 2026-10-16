import { describe, expect, it } from 'vitest'
import { EGG_TIERS, EGGS, hatchPool } from './eggs'
import { applyGift, parseGift, type Gift, type GiftContent } from './gifts'
import { EMPTY_SAVE, parseSaveData, type Save } from './meta'

const gift = (content: GiftContent, id = 'g1'): Gift => ({ id, content, reason: null })

/** The outcome of a gift that must land. */
const applied = (save: Save, g: Gift) => {
  const out = applyGift(save, g)
  if (out.status !== 'applied') throw new Error(`expected applied, got ${out.status}`)
  return out
}

describe('applyGift', () => {
  it('lands once: the same gift again is only claimed', () => {
    const once = applied(EMPTY_SAVE, gift({ kind: 'coins', amount: 500 })).save
    expect(once.wallet).toBe(500)
    expect(once.gifts).toEqual(['g1'])
    expect(applyGift(once, gift({ kind: 'coins', amount: 500 })).status).toBe('claimed')
  })

  it('puts an egg in the incubator, and waits while it is full', () => {
    expect(applied(EMPTY_SAVE, gift({ kind: 'egg', tier: 'friend' })).save.eggs).toEqual([{ tier: 'friend', steps: 0 }])
    const full: Save = { ...EMPTY_SAVE, eggs: Array.from({ length: EGGS.slots }, () => ({ tier: 'common' as const, steps: 0 })) }
    expect(applyGift(full, gift({ kind: 'egg', tier: 'friend' })).status).toBe('wait')
  })

  it('owns and wears a gift title and a gift frame', () => {
    const titled = applied(EMPTY_SAVE, gift({ kind: 'title', title: 'ambassador' })).save
    expect(titled.titles).toEqual(['ambassador'])
    expect(titled.title).toBe('ambassador')
    // The title survives the save's parser only while it's owned.
    expect(parseSaveData(titled).title).toBe('ambassador')
    expect(parseSaveData({ ...titled, titles: [] }).title).toBeNull()
    const framed = applied(EMPTY_SAVE, gift({ kind: 'style', style: { slot: 'frame', id: 'ambassador' } })).save
    expect(framed.style.owned.frame).toEqual(['ambassador'])
    expect(framed.style.equipped.frame).toBe('ambassador')
  })

  it('hatches a family shiny, and pays its egg back when it was shiny already', () => {
    const first = applied(EMPTY_SAVE, gift({ kind: 'shinyHatch', family: 'munchlax' }))
    expect(first.save.hatched.munchlax).toEqual({ shiny: true })
    expect(first.hatch).toMatchObject({ id: 'munchlax', shiny: true, duplicate: false })
    const again = applied(first.save, gift({ kind: 'shinyHatch', family: 'munchlax' }, 'g2'))
    expect(again.hatch).toMatchObject({ duplicate: true, refund: EGG_TIERS.friend.refund })
    expect(again.save.wallet).toBe(EGG_TIERS.friend.refund)
  })
})

describe('parseGift', () => {
  it('takes known gifts and leaves kinds or values this build lacks', () => {
    expect(parseGift({ id: 'x', content: { kind: 'egg', tier: 'friend' }, reason: { kind: 'welcome', from: 'Ash' } })).toEqual({
      id: 'x',
      content: { kind: 'egg', tier: 'friend' },
      reason: { kind: 'welcome', from: 'ash' },
    })
    expect(parseGift({ id: 'x', content: { kind: 'ribbon', tier: 'gold' } })).toBeNull()
    expect(parseGift({ id: 'x', content: { kind: 'style', style: { slot: 'frame', id: 'meadow' } } })).toBeNull()
    expect(parseGift({ id: 'x', content: { kind: 'coins', amount: -5 } })).toBeNull()
  })
})

describe('Friendship Egg', () => {
  it('only hatches Munchlax, and Munchlax hatches from nothing else', () => {
    expect(hatchPool('friend', {}).map(([id]) => id)).toEqual(['munchlax'])
    expect(hatchPool('common', {}).some(([id]) => id === 'munchlax')).toBe(false)
  })
})
