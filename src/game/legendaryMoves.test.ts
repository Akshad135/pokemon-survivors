import { describe, expect, it } from 'vitest'
import { runLearnset } from './learnsets'
import { EVOLUTIONS } from '../data/evolutions'
import { PLAYABLE_IDS } from '../data/hatchlings'
import { LEGENDARY_MOVE_OF } from '../data/legendaryMoves'
import { RIFT_LEGENDS } from '../data/rifts'
import { MYTHICALS } from '../data/waves'
import { LEGENDARY_MOVES, type LegendaryMoveId } from './legendaryMoves'
import { forkAt, isLegendary, maxMoveLevel, MOVE_IDS, MOVES, type MoveId } from './moves'
import { SPECIALS } from './special'

const LEGENDARY = Object.keys(LEGENDARY_MOVES) as LegendaryMoveId[]

describe('legendary moves', () => {
  it('are taught one each by every rift legendary and every mythical of the finale', () => {
    expect(Object.keys(LEGENDARY_MOVE_OF).sort()).toEqual([...RIFT_LEGENDS, ...MYTHICALS].sort())
    expect([...new Set(Object.values(LEGENDARY_MOVE_OF))].sort()).toEqual([...LEGENDARY].sort())
  })

  it('are evolved-tier capstones: Lv1–5 with a fork at Lv4, never evolving and in no learnset', () => {
    const learnable = new Set<MoveId>(PLAYABLE_IDS.flatMap((id) => runLearnset(id, null)))
    const evolving = new Set<MoveId>(EVOLUTIONS.flatMap((e) => [e.from, e.to]))
    for (const id of LEGENDARY) {
      expect([id, isLegendary(id), maxMoveLevel(id)]).toEqual([id, true, 5])
      expect([2, 3, 4, 5].filter((level) => forkAt(id, level))).toEqual([4])
      expect(learnable.has(id) || evolving.has(id)).toBe(false)
    }
    expect(MOVE_IDS.filter(isLegendary).sort()).toEqual([...LEGENDARY].sort())
  })

  it('carry names no other move or special uses', () => {
    const others = [
      ...MOVE_IDS.filter((id) => !isLegendary(id)).map((id) => MOVES[id].name),
      ...Object.values(SPECIALS).flatMap((s) => [s.base.name, s.final.name]),
    ]
    for (const id of LEGENDARY) expect([id, others.includes(MOVES[id].name)]).toEqual([id, false])
  })
})
