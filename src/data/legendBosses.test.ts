import { describe, expect, it } from 'vitest'
import { createRng } from '../engine/rng'
import { MIN_TELEGRAPH, type BossPattern } from './bosses'
import { WAVE_LEGEND_PHASES, WAVE_LEGENDS } from './legendBosses'
import { createFight, telegraph } from '../game/bossFight'
import { SHELTER } from '../game/bosses'
import { entranceBeat, ENTRANCE_LENGTH, ENTRANCE_REVEAL } from '../game/legendScene'

/** The player's base walking speed, px/s (no X Speed, no items). */
const WALK = 68

describe('wave legendaries', () => {
  const nightmare = createFight(createRng(1), 'nightmare')
  const all = (id: (typeof WAVE_LEGENDS)[number]) =>
    WAVE_LEGEND_PHASES[id].flatMap((ph): BossPattern[] => [...ph.patterns, ...(ph.ultimate?.steps.map((s) => s.pattern) ?? [])])

  it('fight in three phases, thresholds falling, with an ultimate on the last', () => {
    for (const id of WAVE_LEGENDS) {
      const phases = WAVE_LEGEND_PHASES[id]
      expect(phases.length, id).toBe(3)
      expect(phases[0]!.below, id).toBe(1)
      expect(phases[1]!.below, id).toBeGreaterThan(phases[2]!.below)
      expect(phases.at(-1)!.ultimate, id).toBeDefined()
    }
  })

  it('warn long enough on Nightmare, even inside an ultimate', () => {
    for (const id of WAVE_LEGENDS) {
      for (const p of all(id)) {
        if (p.kind === 'strikes') expect(telegraph(p.delay, nightmare), id).toBeGreaterThanOrEqual(MIN_TELEGRAPH)
        if (p.kind === 'volley' || p.kind === 'beam' || p.kind === 'dash' || p.kind === 'cage') expect(telegraph(p.windup, nightmare), id).toBeGreaterThanOrEqual(MIN_TELEGRAPH)
        if (p.kind === 'ring' && p.around !== undefined) expect(telegraph(p.windup ?? MIN_TELEGRAPH, nightmare), id).toBeGreaterThanOrEqual(MIN_TELEGRAPH)
      }
    }
  })

  it('leave every safe spot within reach: a closing ring a gap wide enough to walk out, a far shelter before its blast lands', () => {
    for (const id of WAVE_LEGENDS) {
      for (const p of all(id)) {
        // The gap's opening at the ring's start, less a shot on each side, fits a body twice over.
        if (p.kind === 'ring' && p.around !== undefined) expect((p.gap ?? 0) * p.around - 2 * p.radius, id).toBeGreaterThan(40)
        if (p.kind === 'blast' && p.safe === 'spots') expect(SHELTER.far / WALK, id).toBeLessThan(telegraph(p.windup, nightmare) * 0.75)
        if (p.kind === 'blast' && p.safe === 'far') expect((p.radius ?? 0) / WALK, id).toBeLessThan(telegraph(p.windup, nightmare))
      }
    }
  })
})

describe('the entrance on the map', () => {
  it('travels to the legendary, holds there while it shows itself, then comes back', () => {
    expect(entranceBeat(0)).toEqual({ camera: 0, arrive: 0 })
    expect(entranceBeat(ENTRANCE_REVEAL)).toEqual({ camera: 1, arrive: 1 })
    expect(entranceBeat(ENTRANCE_LENGTH).camera).toBe(0)
  })
})
