import { describe, expect, it } from 'vitest'
import { damageBudget, REDUCED, showsText, type DamageNumbers } from './damageNumbers'
import type { FloatText } from '../game/types'

const text = (amount: number, over: Partial<FloatText> = {}): FloatText => ({
  x: 0, y: 0, vy: 0, life: 0, text: String(amount), color: '#ffffff', damage: true, target: 1, amount, slot: 0, ...over,
})

/** What a frame draws, in order, the way the renderer calls it. */
const drawn = (texts: FloatText[], mode: DamageNumbers, bossId: number | null = null) => {
  const budget = damageBudget(texts, bossId)
  return texts.filter((t) => showsText(t, mode, bossId, budget)).map((t) => t.amount)
}

describe('damage number filter', () => {
  it('reduced shows everything while it fits', () => {
    expect(drawn([text(3), text(9), text(1)], 'reduced')).toEqual([3, 9, 1])
  })

  it('reduced keeps only the biggest totals on a crowded screen, ties included', () => {
    const crowd = Array.from({ length: 30 }, () => text(12)).concat(text(80), text(40))
    const shown = drawn(crowd, 'reduced')
    expect(shown).toHaveLength(REDUCED.keep)
    expect(shown).toContain(80)
    expect(shown).toContain(40)
  })

  it('always shows numbers on the boss and non-damage text, and nothing past the short life', () => {
    const crowd = Array.from({ length: 20 }, () => text(50))
    const extra = [text(2, { target: 99 }), text(0, { damage: false, text: '+20' }), text(999, { life: REDUCED.life })]
    const shown = drawn([...crowd, ...extra], 'reduced', 99)
    expect(shown).toContain(2)
    expect(shown).toContain(0)
    expect(shown).not.toContain(999)
  })

  it('all draws every number, off only the non-damage text', () => {
    const texts = Array.from({ length: 20 }, (_, i) => text(i)).concat(text(0, { damage: false }))
    expect(drawn(texts, 'all')).toHaveLength(21)
    expect(drawn(texts, 'off')).toHaveLength(1)
  })
})
