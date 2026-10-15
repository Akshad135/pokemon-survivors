import { describe, expect, it } from 'vitest'
import { createRng } from '../engine/rng'
import { BOSS_PATTERNS, BOSS_RAGE, STANCES } from '../data/bosses'
import { chainTarget, createFight, fightPace, fightsInStances, shouldEnrage, tickStance } from './bossFight'

describe('boss fights', () => {
  it('only wave bosses fight in stances', () => {
    expect(fightsInStances('onix')).toBe(true)
    expect(fightsInStances('mewtwo')).toBe(true)
    expect(fightsInStances('lugia')).toBe(false)
    expect(fightsInStances('arceus')).toBe(false)
  })

  it('swaps stance after a seeded 4-9 s and enrages once under half HP', () => {
    const rng = createRng(3)
    const fight = createFight(rng)
    expect(fight.stance).toBe('close')
    expect(fight.stanceLeft).toBeGreaterThanOrEqual(BOSS_RAGE.stance[0])
    expect(fight.stanceLeft).toBeLessThanOrEqual(BOSS_RAGE.stance[1])
    expect(tickStance(fight, fight.stanceLeft - 0.01, rng)).toBe(false)
    expect(tickStance(fight, 0.02, rng)).toBe(true)
    expect(fight.stance).toBe('ranged')

    expect(shouldEnrage(fight, 50, 100)).toBe(false)
    expect(shouldEnrage(fight, 49, 100)).toBe(true)
    expect(fightPace(fight)).toBe(STANCES.ranged.pace)
    fight.enraged = true
    expect(shouldEnrage(fight, 10, 100)).toBe(false)
    expect(fightPace(fight)).toBeCloseTo(STANCES.ranged.pace * BOSS_RAGE.speed)
  })

  it('chains another attack of the live stance, else the same one, never a trail', () => {
    // Mewtwo: [ring (both stances), ranged strikes, close slam].
    const mewtwo = BOSS_PATTERNS.mewtwo!
    expect(chainTarget(mewtwo, 'close', 2)).toBe(0)
    expect(chainTarget(mewtwo, 'ranged', 0)).toBe(1)
    // Moltres: [trail, ranged ring, close strikes]: the trail never chains.
    const moltres = BOSS_PATTERNS.moltres!
    expect(chainTarget(moltres, 'close', 2)).toBe(2)
    expect(chainTarget([moltres[0]!], 'close', 0)).toBe(-1)
  })
})
