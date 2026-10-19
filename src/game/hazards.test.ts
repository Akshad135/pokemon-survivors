import { describe, expect, it } from 'vitest'
import { HAZARD_PACE, MIN_TELEGRAPH } from '../data/hazards'
import { RUN_LENGTH } from '../data/waves'
import { DIFFICULTY_IDS } from './difficulty'
import { hazardDamage, hazardFlavor, hazardInterval, hazardTelegraph } from './hazards'

describe('world hazards', () => {
  it('start later and slower on easier levels, and quicken as the run goes on', () => {
    const { normal, hard, nightmare } = HAZARD_PACE
    expect(normal.start).toBeGreaterThan(hard.start)
    expect(hard.start).toBeGreaterThan(nightmare.start)
    for (const d of DIFFICULTY_IDS) {
      const { start } = HAZARD_PACE[d]
      expect(hazardInterval(d, start - 1)).toBe(Infinity)
      expect(hazardInterval(d, start + 600)).toBeLessThan(hazardInterval(d, start))
    }
    expect(hazardInterval('nightmare', 600)).toBeLessThan(hazardInterval('normal', 600))
  })

  it('keep quickening in endless mode, down to a floor', () => {
    const late = hazardInterval('normal', RUN_LENGTH)
    expect(hazardInterval('normal', RUN_LENGTH + 300, true)).toBeLessThan(late)
    expect(hazardInterval('normal', RUN_LENGTH + 6000, true)).toBeGreaterThan(late * 0.5)
  })

  it('always telegraph long enough to read on a phone, Nightmare the shortest', () => {
    for (const d of DIFFICULTY_IDS) expect(hazardTelegraph(d)).toBeGreaterThanOrEqual(MIN_TELEGRAPH)
    expect(hazardTelegraph('nightmare')).toBeLessThan(hazardTelegraph('normal'))
  })

  it('hit harder with the minute', () => {
    expect(hazardDamage('normal', 840)).toBeGreaterThan(hazardDamage('normal', 540))
  })

  it('take the weather’s flavor, or the biome’s under clear skies', () => {
    expect(hazardFlavor('rain', 'meadow').strike).toBe('thunder')
    expect(hazardFlavor('sand', 'cave').strike).toBe('rock')
    expect(hazardFlavor('clear', 'forest').zone).toBe('poison')
    expect(hazardFlavor('fog', 'meadow').zone).toBe('rock')
  })
})
