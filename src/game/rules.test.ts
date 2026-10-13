import { describe, expect, it } from 'vitest'
import { createRng } from '../engine/rng'
import { createGrid, insert, query } from '../engine/spatial'
import { effectiveness } from '../data/types'
import { ITEMS } from '../data/items'
import { maxMoveLevel, moveStats } from './moves'
import { MAX_MOVES, offerPool, rollOffers } from './leveling'
import { BASE_STATS } from './stats'
import type { OwnedMove } from './types'

describe('effectiveness', () => {
  it('softens the official chart', () => {
    expect(effectiveness('water', ['rock', 'ground'])).toBe(2)
    expect(effectiveness('fire', ['grass'])).toBe(1.5)
    expect(effectiveness('fire', ['water'])).toBe(0.75)
    expect(effectiveness('normal', ['ghost', 'poison'])).toBe(0.5)
  })
})

describe('level-up offers', () => {
  it('never offers more than three distinct choices', () => {
    const offers = rollOffers({ starter: 'charmander', moves: [{ id: 'ember', level: 1, cooldown: 0 }], items: [] }, createRng(1))
    expect(offers).toHaveLength(3)
    expect(new Set(offers.map((o) => JSON.stringify(o))).size).toBe(3)
  })

  it('only offers moves from the starter learnset', () => {
    const pool = offerPool({ starter: 'squirtle', moves: [], items: [] })
    const moves = pool.flatMap(([o]) => (o.kind === 'move' ? [o.id] : []))
    expect(moves).toContain('whirlpool')
    expect(moves).not.toContain('ember')
  })

  it('stops offering new moves when slots are full and falls back to a berry when maxed', () => {
    const full: OwnedMove[] = (['ember', 'fireSpin', 'swift', 'thunder', 'sludgeBomb', 'gust'] as const).map((id) => ({
      id,
      level: maxMoveLevel(id),
      cooldown: 0,
    }))
    expect(full).toHaveLength(MAX_MOVES)
    const items = (Object.keys(ITEMS) as (keyof typeof ITEMS)[]).slice(0, 6).map((id) => ({ id, level: ITEMS[id].levels.length }))
    expect(rollOffers({ starter: 'charmander', moves: full, items }, createRng(2))).toEqual([{ kind: 'berry' }])
  })
})

describe('moveStats', () => {
  it('stacks upgrades and player modifiers', () => {
    const lv1 = moveStats('ember', 1, BASE_STATS)
    const lv2 = moveStats('ember', 2, { ...BASE_STATS, might: 1.5, amount: 1 })
    expect(lv1.amount).toBe(1)
    expect(lv2.amount).toBe(3) // +1 upgrade, +1 player
    expect(lv2.damage).toBe(lv1.damage * 1.5)
  })
})

describe('spatial grid', () => {
  it('finds neighbours across cell borders', () => {
    const grid = createGrid(32)
    insert(grid, 0, 31, 31)
    insert(grid, 1, 33, 33)
    insert(grid, 2, 500, 500)
    expect(query(grid, 32, 32, 8, []).sort()).toEqual([0, 1])
  })
})
