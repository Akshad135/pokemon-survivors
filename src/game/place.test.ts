import { describe, expect, it } from 'vitest'
import { createRng } from '../engine/rng'
import { ENEMIES, type EnemyDef, type EnemyId } from '../data/enemies'
import { PLACE, PLACE_IDS, PLACES, WINGS } from '../data/places'
import { RUN_LENGTH, STAGES, stageIndexAt } from '../data/waves'
import { applyDeltas, BASE_STATS } from './stats'
import { pickPlace, placeDue, placePool, wingDeltas } from './place'

const due = { time: 200, nextAt: 200, busy: false, bossAlive: false, endless: false }

describe('placeDue', () => {
  it('opens on schedule, never while a rift or another place is busy', () => {
    expect(placeDue(due)).toBe(true)
    expect(placeDue({ ...due, time: 199 })).toBe(false)
    expect(placeDue({ ...due, busy: true })).toBe(false)
  })

  it('waits for a boss to fall, but not forever in a regular run', () => {
    expect(placeDue({ ...due, bossAlive: true })).toBe(false)
    expect(placeDue({ ...due, bossAlive: true, time: due.nextAt + PLACE.bossWait })).toBe(true)
    expect(placeDue({ ...due, bossAlive: true, time: due.nextAt + PLACE.bossWait, endless: true })).toBe(false)
  })

  it('never opens so late that being inside could run into Mewtwo', () => {
    const late = RUN_LENGTH - PLACE.openTime - 10
    expect(placeDue({ ...due, time: late, nextAt: late })).toBe(false)
    expect(placeDue({ ...due, time: late, nextAt: late, endless: true })).toBe(true)
  })
})

describe('pickPlace', () => {
  it('offers the sky only to a Flying type, and a place not offered yet first', () => {
    const rng = createRng(4)
    for (let i = 0; i < 200; i++) {
      expect(pickPlace(rng, { offered: [], biome: 'meadow', flyer: false })).not.toBe('sky')
      expect(pickPlace(rng, { offered: ['cave', 'graveyard'], biome: 'tower', flyer: true })).toBe('sky')
      expect(pickPlace(rng, { offered: ['cave'], biome: 'cave', flyer: false })).toBe('graveyard')
    }
    // Once every place was offered, any of them can come back.
    const seen = new Set(Array.from({ length: 200 }, () => pickPlace(rng, { offered: ['cave', 'graveyard'], biome: 'meadow', flyer: false })))
    expect([...seen].sort()).toEqual(['cave', 'graveyard'])
  })
})

describe('placePool', () => {
  it("brings out the place's species whose tier the run's stage has (the closest tier when it has none)", () => {
    const tierOf = (e: EnemyId) => {
      const def: EnemyDef = ENEMIES[e]
      return def.tier ?? 1
    }
    for (const id of PLACE_IDS) {
      const species: readonly EnemyId[] = PLACES[id].species
      for (const stage of STAGES) {
        const time = stage.until === Infinity ? RUN_LENGTH + 60 : stage.until - 1
        const cast = STAGES[stageIndexAt(time)]!.cast
        const pool = placePool(id, time).map(([e]) => e)
        expect(pool.length).toBeGreaterThan(0)
        expect(pool.every((e) => species.includes(e))).toBe(true)
        const anyInCast = species.some((e) => cast.includes(tierOf(e)))
        if (anyInCast) expect(pool.every((e) => cast.includes(tierOf(e)))).toBe(true)
        else expect(new Set(pool.map(tierOf)).size).toBe(1)
      }
    }
  })
})

describe('wingDeltas', () => {
  it('stacks every wing picked up on the stats', () => {
    const stats = applyDeltas(BASE_STATS, wingDeltas({ healthWing: 2, swiftWing: 1, prettyWing: 3 }))
    expect(stats.maxHp).toBe(BASE_STATS.maxHp + WINGS.healthWing.stats.maxHp * 2)
    expect(stats.speed).toBe(BASE_STATS.speed + WINGS.swiftWing.stats.speed)
    expect(stats.might).toBe(BASE_STATS.might)
  })
})
