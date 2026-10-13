import { describe, expect, it } from 'vitest'
import { createRng } from '../engine/rng'
import { DROP_TABLES, dropWeights, RAMP_TIME, rollDrop, type DropEntry } from '../data/consumables'
import { addBuff, buffDeltas, hasBuff, tickBuffs } from './buffs'
import type { Buff } from './types'

const rollMany = (table: readonly DropEntry[], time: number, n = 2000) => {
  const rng = createRng(7)
  return Array.from({ length: n }, () => rollDrop(table, time, rng))
}

describe('drop tables', () => {
  it('ramps weights from early to late over the run', () => {
    const table: DropEntry[] = [{ drop: 'superPotion', early: 0, late: 4 }]
    expect(dropWeights(table, 0)).toEqual([['superPotion', 0]])
    expect(dropWeights(table, RAMP_TIME / 2)).toEqual([['superPotion', 2]])
    expect(dropWeights(table, RAMP_TIME * 3)).toEqual([['superPotion', 4]])
  })

  it('never rolls an entry whose weight is still zero', () => {
    const early = rollMany(DROP_TABLES.itemBall, 0)
    expect(early).not.toContain('superPotion')
    expect(rollMany(DROP_TABLES.itemBall, RAMP_TIME)).toContain('superPotion')
  })

  it('picks roughly in proportion to weight', () => {
    const table: DropEntry[] = [
      { drop: 'potion', early: 3, late: 3 },
      { drop: 'rareCandy', early: 1, late: 1 },
    ]
    const share = rollMany(table, 0).filter((d) => d === 'potion').length / 2000
    expect(share).toBeGreaterThan(0.7)
    expect(share).toBeLessThan(0.8)
  })
})

describe('buffs', () => {
  it('expires after its duration and reports the expired id', () => {
    const buffs: Buff[] = []
    addBuff(buffs, 'xAttack', 2)
    expect(tickBuffs(buffs, 1.5)).toEqual([])
    expect(hasBuff(buffs, 'xAttack')).toBe(true)
    expect(tickBuffs(buffs, 0.6)).toEqual(['xAttack'])
    expect(buffs).toEqual([])
  })

  it('extends a running buff instead of stacking, capped at twice the duration', () => {
    const buffs: Buff[] = []
    addBuff(buffs, 'xSpeed', 10)
    tickBuffs(buffs, 4)
    addBuff(buffs, 'xSpeed', 10)
    expect(buffs).toEqual([{ id: 'xSpeed', left: 16, total: 16 }])
    addBuff(buffs, 'xSpeed', 10)
    expect(buffs[0]!.left).toBe(20)
  })

  it('only contributes stats while active', () => {
    const buffs: Buff[] = []
    addBuff(buffs, 'xAttack', 1)
    expect(buffDeltas(buffs)).toEqual([{ might: 0.5 }])
    tickBuffs(buffs, 1)
    expect(buffDeltas(buffs)).toEqual([])
  })
})
