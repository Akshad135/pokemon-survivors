import { describe, expect, it } from 'vitest'
import { createRng } from '../engine/rng'
import { offerPool, rollOffers } from '../game/leveling'
import { maxMoveLevel, MOVES, moveStats, type MoveId } from '../game/moves'
import { applyDeltas, BASE_STATS } from '../game/stats'
import type { OwnedItem, OwnedMove } from '../game/types'
import { EVOLUTIONS, readyEvolutions } from './evolutions'
import { ITEMS, type ItemDef } from './items'

const maxed = (id: MoveId): OwnedMove => ({ id, level: maxMoveLevel(id), cooldown: 0 })
const charcoal: OwnedItem = { id: 'charcoal', level: 1 }

describe('move evolution eligibility', () => {
  it('needs the move at max level and its paired item', () => {
    expect(readyEvolutions({ moves: [maxed('ember')], items: [] })).toEqual([])
    expect(readyEvolutions({ moves: [{ ...maxed('ember'), level: 2 }], items: [charcoal] })).toEqual([])
    expect(readyEvolutions({ moves: [maxed('ember')], items: [{ id: 'mysticWater', level: 3 }] })).toEqual([])
    expect(readyEvolutions({ moves: [maxed('ember')], items: [charcoal] }).map((e) => e.to)).toEqual(['flamethrower'])
  })

  it('lets one item evolve every move it pairs with', () => {
    const ready = readyEvolutions({ moves: [maxed('ember'), maxed('fireSpin')], items: [charcoal] })
    expect(ready.map((e) => e.to)).toEqual(['flamethrower', 'fireBlast'])
  })

  it('takes priority over random upgrades (the Poké Ball rolls a single offer)', () => {
    const loadout = { starter: 'charmander', moves: [maxed('ember')], items: [charcoal] } as const
    expect(rollOffers(loadout, createRng(3), 1)).toEqual([{ kind: 'evolution', from: 'ember', to: 'flamethrower' }])
    expect(rollOffers(loadout, createRng(3), 3)[0]).toEqual({ kind: 'evolution', from: 'ember', to: 'flamethrower' })
  })

  it('never offers the base move again once it evolved', () => {
    const pool = offerPool({ starter: 'charmander', moves: [{ id: 'flamethrower', level: 1, cooldown: 0 }], items: [] })
    const moves = pool.flatMap(([o]) => (o.kind === 'move' ? [o.id] : []))
    expect(moves).not.toContain('ember')
    expect(moves).not.toContain('flamethrower')
    expect(moves).toContain('fireSpin')
  })
})

describe('evolution pairs', () => {
  it('keep the move type and use that type’s boosting item', () => {
    for (const evo of EVOLUTIONS) {
      const item: ItemDef = ITEMS[evo.item]
      expect([MOVES[evo.to].type, item.boosts]).toEqual([MOVES[evo.from].type, MOVES[evo.from].type])
    }
  })
})

describe('type-boosting items', () => {
  it('boost only moves of their type', () => {
    const stats = applyDeltas(BASE_STATS, ITEMS.charcoal.levels)
    expect(moveStats('ember', 1, stats).damage).toBeCloseTo(moveStats('ember', 1, BASE_STATS).damage * 1.3)
    expect(moveStats('swift', 1, stats).damage).toBe(moveStats('swift', 1, BASE_STATS).damage)
  })

  it('are only offered when the starter learns moves of that type', () => {
    const items = offerPool({ starter: 'squirtle', moves: [], items: [] }).flatMap(([o]) => (o.kind === 'item' ? [o.id] : []))
    expect(items).toContain('mysticWater')
    expect(items).toContain('magnet')
    expect(items).not.toContain('charcoal')
  })
})
