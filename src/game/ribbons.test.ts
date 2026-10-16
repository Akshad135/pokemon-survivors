import { describe, expect, it } from 'vitest'
import { applyGift } from './gifts'
import { EMPTY_SAVE } from './meta'
import { mergeRibbons, parseRibbons, ribbonFor, type Ribbon } from './ribbons'
import { mergeSaves } from './sync'

const ribbon = (day: string, tier: Ribbon['tier'], rank = 1, total = 10): Ribbon => ({ day, tier, rank, total })

describe('ribbonFor', () => {
  it('gives gold to the top 10%, silver to the top half and bronze to the rest', () => {
    expect([1, 34, 35, 170, 171, 340].map((r) => ribbonFor(r, 340))).toEqual(['gold', 'gold', 'silver', 'silver', 'bronze', 'bronze'])
  })

  it('always gives the #1 gold, however small the board', () => {
    expect(ribbonFor(1, 1)).toBe('gold')
    expect([1, 2].map((r) => ribbonFor(r, 2))).toEqual(['gold', 'bronze'])
    expect([1, 2, 3].map((r) => ribbonFor(r, 3))).toEqual(['gold', 'silver', 'bronze'])
  })

  it('gives tied players (sharing a rank) the same ribbon', () => {
    // Three tied at the top of 20: all rank 1.
    expect([1, 1, 1].map((r) => ribbonFor(r, 20))).toEqual(['gold', 'gold', 'gold'])
  })
})

describe('ribbons in the save', () => {
  it('keep one per day, the better one, in day order', () => {
    const merged = mergeRibbons([ribbon('2026-10-15', 'silver', 40), ribbon('2026-10-12', 'bronze')], [ribbon('2026-10-15', 'gold', 3)])
    expect(merged).toEqual([ribbon('2026-10-12', 'bronze'), ribbon('2026-10-15', 'gold', 3)])
    expect(mergeRibbons(merged, merged)).toEqual(merged)
  })

  it('drop what isn’t a ribbon', () => {
    expect(parseRibbons([{ day: '2026-02-30', tier: 'gold', rank: 1, total: 1 }, { day: '2026-10-15', tier: 'platinum' }, 7, ribbon('2026-10-15', 'gold')])).toEqual([
      ribbon('2026-10-15', 'gold'),
    ])
  })

  it('join from a gift once, and merge between devices as a union', () => {
    const gift = { id: 'g1', content: { kind: 'ribbon', ribbon: ribbon('2026-10-15', 'gold') } as const, reason: null }
    const out = applyGift(EMPTY_SAVE, gift)
    expect(out.status === 'applied' && out.save.ribbons).toEqual([ribbon('2026-10-15', 'gold')])
    const other = { ...EMPTY_SAVE, ribbons: [ribbon('2026-10-14', 'bronze')] }
    expect(mergeSaves(other, out.status === 'applied' ? out.save : EMPTY_SAVE).ribbons).toEqual([ribbon('2026-10-14', 'bronze'), ribbon('2026-10-15', 'gold')])
  })
})
