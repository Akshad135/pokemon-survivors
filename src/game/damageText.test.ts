import { describe, expect, it } from 'vitest'
import { MAX_PER_TARGET, MERGE_WINDOW, placeDamage, RECYCLE_AFTER } from './damageText'
import type { FloatText } from './types'

const WHITE = '#ffffff'
const SUPER = '#ffd830'

const text = (target: number, slot: number, life: number, color = WHITE): FloatText => ({
  x: 0, y: 0, vy: 0, life, text: '1', color, damage: true, target, amount: 1, slot,
})

describe('damage number grouping', () => {
  it('merges into a fresh number on the same target and color', () => {
    const texts = [text(1, 0, MERGE_WINDOW / 2), text(2, 0, 0)]
    expect(placeDamage(texts, 1, WHITE)).toEqual({ kind: 'merge', index: 0 })
  })

  it('keeps colors apart, so super-effective hits stay readable', () => {
    expect(placeDamage([text(1, 0, 0)], 1, SUPER)).toEqual({ kind: 'new', slot: 1 })
  })

  it('opens the first free slot once the window closes', () => {
    const texts = [text(1, 1, MERGE_WINDOW + 0.1)]
    expect(placeDamage(texts, 1, WHITE)).toEqual({ kind: 'new', slot: 0 })
  })

  it('caps the numbers per target: merges past the window, else restarts the oldest once it fades', () => {
    const full = (oldest: number) => Array.from({ length: MAX_PER_TARGET }, (_, i) => text(1, i, oldest - i * 0.1, i === 0 ? SUPER : WHITE))
    const resisted = '#a8a8b8'
    expect(placeDamage(full(0.6), 1, WHITE)).toEqual({ kind: 'merge', index: MAX_PER_TARGET - 1 })
    expect(placeDamage(full(RECYCLE_AFTER), 1, resisted)).toEqual({ kind: 'recycle', index: 0 })
    expect(placeDamage(full(RECYCLE_AFTER - 0.05), 1, resisted)).toEqual({ kind: 'skip' })
  })
})
