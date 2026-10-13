import { describe, expect, it } from 'vitest'
import { createRng } from '../engine/rng'
import { ENEMIES, type EnemyDef, type EnemyId } from '../data/enemies'
import { EVENTS, STAGES, stageStart } from '../data/waves'
import { byTypes, drawRoster, rosterSchedule, type SpeciesWeight } from './roster'

const def = (id: EnemyId): EnemyDef => ENEMIES[id]
const ids = (pool: ReadonlyArray<readonly [EnemyId, number]>) => pool.map(([id]) => id)

describe('drawRoster', () => {
  it('draws the same cast for the same seed and different casts for different seeds', () => {
    expect(drawRoster(createRng(7))).toEqual(drawRoster(createRng(7)))
    const openers = new Set([1, 2, 3, 4, 5].map((seed) => ids(drawRoster(createRng(seed)).stages[0]!).join()))
    expect(openers.size).toBe(5)
  })

  it('fills every slot from its tier and only brings a few new species per stage', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const { stages } = drawRoster(createRng(seed))
      const seen = new Set<EnemyId>()
      stages.forEach((pool, i) => {
        const tiers = ids(pool).map((id) => def(id).tier)
        expect([...tiers].sort()).toEqual([...STAGES[i]!.cast].sort())
        const fresh = ids(pool).filter((id) => !seen.has(id))
        expect(fresh.length).toBeLessThanOrEqual(3)
        expect(new Set(ids(pool)).size).toBe(pool.length)
        for (const id of ids(pool)) seen.add(id)
      })
    }
  })

  it('sends flyers of the right tier in swarms and met species in rings', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const r = drawRoster(createRng(seed))
      const met = new Set(r.stages.flatMap(ids))
      EVENTS.forEach((e, i) => {
        const id = r.events[i]
        if (e.kind === 'boss') return expect(id).toBeNull()
        expect(id && def(id).tier).toBe(e.tier)
        if (e.kind === 'swarm') expect(def(id!).types).toContain('flying')
        else expect(met.has(id!)).toBe(true)
      })
    }
  })

  it('biases fresh draws with the weight function', () => {
    const onlyGeodude = drawRoster(createRng(3), { weight: (d) => (d.name === 'Geodude' ? 1 : 0) })
    expect(ids(onlyGeodude.stages[2]!)).toContain('geodude')
    const rocky = (seed: number, weight?: SpeciesWeight) =>
      drawRoster(createRng(seed), { weight }).stages.flatMap(ids).filter((id) => def(id).types.includes('rock')).length
    const seeds = Array.from({ length: 40 }, (_, i) => i + 1)
    const plain = seeds.reduce((n, s) => n + rocky(s), 0)
    const cave = seeds.reduce((n, s) => n + rocky(s, byTypes({ rock: 6 })), 0)
    expect(cave).toBeGreaterThan(plain * 2)
  })
})

describe('byTypes', () => {
  it('takes the best listed factor among a species types, 1 when none is listed', () => {
    const weight = byTypes({ rock: 3, ground: 2, water: 0.2 })
    expect(weight(def('geodude'), 0)).toBe(3)
    expect(weight(def('wooper'), 0)).toBe(2)
    expect(weight(def('rattata'), 0)).toBe(1)
    expect(weight(def('tentacool'), 0)).toBe(0.2)
  })
})

describe('rosterSchedule', () => {
  it('lists every needed species once, soonest first, with the opening stage at 0 and the bosses', () => {
    const r = drawRoster(createRng(11))
    const schedule = rosterSchedule(r)
    expect(schedule.filter((s) => s.at === 0).map((s) => s.dex).sort()).toEqual(ids(r.stages[0]!).map((id) => def(id).dex).sort())
    expect(new Set(schedule.map((s) => s.dex)).size).toBe(schedule.length)
    expect(schedule.map((s) => s.at)).toEqual([...schedule.map((s) => s.at)].sort((a, b) => a - b))
    expect(schedule.map((s) => s.dex)).toContain(ENEMIES.mewtwo.dex)
    const second = ids(r.stages[1]!).find((id) => !ids(r.stages[0]!).includes(id))!
    expect(schedule.find((s) => s.dex === def(second).dex)?.at).toBe(stageStart(1))
  })
})
