import { describe, expect, it } from 'vitest'
import { createRng } from '../engine/rng'
import { ENEMIES } from '../data/enemies'
import { hasShinySprite } from '../data/bodies'
import { previousDay } from './day'
import { OUTBREAK, OUTBREAK_SPECIES, outbreakFits, outbreakOf, withOutbreak } from './outbreak'
import { drawRoster } from './roster'

/** `count` consecutive days from `first` (YYYY-MM-DD). */
const days = (first: string, count: number) =>
  Array.from({ length: count }, (_, i) => {
    const [y, m, d] = first.split('-').map(Number)
    return new Date(Date.UTC(y!, m! - 1, d! + i)).toISOString().slice(0, 10)
  })

describe('outbreakOf', () => {
  it('only breaks out plain species of its tier with a shiny sprite', () => {
    expect(OUTBREAK_SPECIES.length).toBeGreaterThan(10)
    for (const id of OUTBREAK_SPECIES) {
      expect(ENEMIES[id]).toMatchObject({ tier: OUTBREAK.tier })
      expect(ENEMIES[id]).not.toHaveProperty('trait')
      expect(hasShinySprite(ENEMIES[id].dex)).toBe(true)
    }
  })

  it('gives everyone the same species on a day, and each species its day before any repeats', () => {
    expect(outbreakOf('2026-10-15')).toBe(outbreakOf('2026-10-15'))
    const n = OUTBREAK_SPECIES.length
    // Somewhere in these days a whole cycle starts and ends.
    const run = days('2026-01-01', n * 2).map(outbreakOf)
    const starts = run.findIndex((_, i) => new Set(run.slice(i, i + n)).size === n)
    expect(starts).toBeGreaterThanOrEqual(0)
  })
})

describe('outbreakFits', () => {
  // 2026-10-15 00:30 in Brasília is 03:30 UTC.
  const startedAt = new Date('2026-10-15T03:30:00Z')

  it("takes the day's outbreak, the day before's (runs picked just before midnight) or none", () => {
    expect(outbreakFits(outbreakOf('2026-10-15'), startedAt)).toBe(true)
    expect(outbreakFits(outbreakOf(previousDay('2026-10-15')), startedAt)).toBe(true)
    expect(outbreakFits(null, startedAt)).toBe(true)
  })

  it("refuses any other day's", () => {
    const other = OUTBREAK_SPECIES.find((id) => id !== outbreakOf('2026-10-15') && id !== outbreakOf('2026-10-14'))!
    expect(outbreakFits(other, startedAt)).toBe(false)
  })
})

describe('withOutbreak', () => {
  it('puts the outbreak in every stage as heavy as its heaviest species, never as a runner, and keeps the rest', () => {
    const roster = drawRoster(createRng(5))
    const id = OUTBREAK_SPECIES[3]!
    const out = withOutbreak(roster, id)
    out.stages.forEach((pool, i) => {
      const weight = pool.find(([s]) => s === id)?.[1]
      expect(weight).toBe(Math.max(...roster.stages[i]!.map(([, w]) => w)))
      expect(pool.filter(([s]) => s !== id)).toEqual(roster.stages[i]!.filter(([s]) => s !== id))
    })
    expect(out.runners).not.toContain(id)
    expect(out.events).toEqual(roster.events)
    expect(withOutbreak(out, id)).toEqual(out)
    expect(withOutbreak(roster, null)).toBe(roster)
  })
})
