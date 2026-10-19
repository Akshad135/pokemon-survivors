import { describe, expect, it } from 'vitest'
import { createRng } from '../engine/rng'
import { BOSS_DIFFICULTY, BOSS_PATTERNS, BOSS_RAGE, MIN_TELEGRAPH, STANCES, type BossPattern } from '../data/bosses'
import { attackCount, attackWait, chainTarget, createFight, fightPace, fightsInStances, patternLive, shouldEnrage, telegraph, tickStance } from './bossFight'

describe('boss fights', () => {
  it('only wave bosses fight in stances', () => {
    expect(fightsInStances('onix')).toBe(true)
    expect(fightsInStances('mewtwo')).toBe(true)
    expect(fightsInStances('lugia')).toBe(false)
    expect(fightsInStances('arceus')).toBe(false)
  })

  it('swaps stance after a seeded 4-9 s and enrages once under half HP', () => {
    const rng = createRng(3)
    const fight = createFight(rng, 'normal')
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

  it('gates patterns by stance, HP left and difficulty', () => {
    // Mewtwo's second phase: under 40%, from Hard.
    const phase2 = BOSS_PATTERNS.mewtwo!.find((p) => p.below === 0.4 && p.from === 'hard')!
    const fight = { ...createFight(createRng(1), 'hard'), share: 0.45 }
    expect(patternLive(phase2, fight)).toBe(false)
    fight.share = 0.39
    expect(patternLive(phase2, fight)).toBe(true)
    expect(patternLive(phase2, { ...fight, difficulty: 'nightmare' })).toBe(true)
    expect(patternLive(phase2, { ...fight, difficulty: 'normal' })).toBe(false)
    const ranged: BossPattern = { stance: 'ranged', kind: 'ring', every: 3, count: 8, speed: 60, radius: 5, damage: 10, visual: 'rock' }
    expect(patternLive(ranged, fight)).toBe(false)
    expect(patternLive(ranged, { ...fight, stance: 'ranged' })).toBe(true)
  })

  it('presses harder difficulties with pace, counts and shorter warnings, never under the floor', () => {
    const ring: BossPattern = { kind: 'ring', every: 4, count: 10, speed: 60, radius: 5, damage: 10, visual: 'rock' }
    const trail: BossPattern = { kind: 'trail', every: 0.2, ttl: 2, radius: 7, damage: 10, visual: 'fire' }
    const normal = createFight(createRng(1), 'normal')
    const nightmare = createFight(createRng(1), 'nightmare')
    expect(attackWait(ring, normal)).toBe(4)
    expect(attackWait(ring, nightmare)).toBeCloseTo(4 * BOSS_DIFFICULTY.nightmare.pace)
    expect(attackWait(ring, { ...nightmare, enraged: true })).toBeCloseTo(4 * BOSS_DIFFICULTY.nightmare.pace * BOSS_RAGE.wait)
    expect(attackWait(trail, nightmare)).toBe(0.2)
    expect(attackWait(ring, null)).toBe(4)

    expect(attackCount(10, normal)).toBe(10)
    expect(attackCount(10, nightmare)).toBe(Math.round(10 * BOSS_DIFFICULTY.nightmare.more))
    expect(attackCount(1, nightmare)).toBe(1)

    expect(telegraph(1.2, normal)).toBe(1.2)
    expect(telegraph(1.4, nightmare)).toBeCloseTo(1.4 * BOSS_DIFFICULTY.nightmare.telegraph)
    expect(telegraph(0.9, nightmare)).toBe(MIN_TELEGRAPH)
    expect(telegraph(0.7, nightmare)).toBe(0.7)
    expect(telegraph(0.7, null)).toBe(0.7)
  })

  it('chains another live attack, else the same one, never a trail', () => {
    // Mewtwo: [ring (both stances), ranged strikes, close slam, ...].
    const mewtwo = BOSS_PATTERNS.mewtwo!
    const fight = createFight(createRng(1), 'normal')
    expect(chainTarget(mewtwo, fight, 2)).toBe(0)
    expect(chainTarget(mewtwo, { ...fight, stance: 'ranged' }, 0)).toBe(1)
    const trail: BossPattern = { kind: 'trail', every: 0.2, ttl: 2, radius: 7, damage: 10, visual: 'fire' }
    const slam: BossPattern = { stance: 'close', kind: 'strikes', every: 4, target: 'self', count: 1, spread: 0, radius: 40, delay: 1.2, damage: 10, visual: 'slam' }
    const rage: BossPattern = { below: 0.5, kind: 'ring', every: 4, count: 8, speed: 60, radius: 5, damage: 10, visual: 'rock' }
    expect(chainTarget([trail, slam, rage], fight, 1)).toBe(1)
    expect(chainTarget([trail, slam, rage], { ...fight, share: 0.4 }, 1)).toBe(2)
    expect(chainTarget([trail], fight, 0)).toBe(-1)
  })
})

describe('wave boss patterns', () => {
  /** Every wave boss (everything that fights in stances) on the schedule. */
  const waveBosses = Object.keys(BOSS_PATTERNS).filter((id) => fightsInStances(id as keyof typeof BOSS_PATTERNS))

  it('each one aims at the player, punishes keeping away, unlocks an attack when enraged and adds one on Nightmare', () => {
    for (const id of waveBosses) {
      const patterns = BOSS_PATTERNS[id as keyof typeof BOSS_PATTERNS]!
      expect(patterns.some((p) => (p.kind === 'strikes' && p.target === 'player') || p.kind === 'volley'), id).toBe(true)
      expect(patterns.some((p) => p.far !== undefined), id).toBe(true)
      expect(patterns.some((p) => p.below === BOSS_RAGE.below), id).toBe(true)
      expect(patterns.some((p) => p.from === 'nightmare'), id).toBe(true)
    }
  })

  it('every warning reads: strikes and volleys show for at least the floor on Nightmare', () => {
    const nightmare = createFight(createRng(1), 'nightmare')
    for (const id of waveBosses) {
      for (const p of BOSS_PATTERNS[id as keyof typeof BOSS_PATTERNS]!) {
        if (p.kind === 'strikes') expect(telegraph(p.delay, nightmare), id).toBeGreaterThanOrEqual(MIN_TELEGRAPH)
        if (p.kind === 'volley') expect(telegraph(p.windup, nightmare), id).toBeGreaterThanOrEqual(MIN_TELEGRAPH)
      }
    }
  })
})
