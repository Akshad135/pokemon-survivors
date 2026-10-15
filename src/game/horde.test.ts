import { describe, expect, it } from 'vitest'
import { ELITE, RUNNER } from '../data/waves'
import { eliteSpawn, leadTime, makeElite, makeRunner } from './horde'

const stats = (over: { hp?: number; maxHp?: number; speed?: number } = {}) => ({
  elite: false, runner: false, hp: 100, maxHp: 100, speed: 50, xp: 2, damage: 10, radius: 8, ...over,
})

describe('horde spawn modifiers', () => {
  it('spawns elites once the horde fills past the line, up to their share', () => {
    expect(eliteSpawn(100 * ELITE.fill - 1, 0, 100)).toBe(false)
    expect(eliteSpawn(100 * ELITE.fill, 0, 100)).toBe(true)
    expect(eliteSpawn(100, 100 * ELITE.share, 100)).toBe(false)
    const e = stats()
    makeElite(e)
    expect(e).toMatchObject({ elite: true, hp: 100 * ELITE.hp, maxHp: 100 * ELITE.hp, xp: 2 * ELITE.xp, damage: 10 * ELITE.damage })
  })

  it('makes runners faster but never faster than the cap, and frailer', () => {
    const slow = stats({ speed: 30 })
    makeRunner(slow)
    expect(slow.speed).toBeCloseTo(30 * RUNNER.speed)
    expect(slow.hp).toBe(70)
    const fast = stats({ speed: 55, hp: 1, maxHp: 1 })
    makeRunner(fast)
    expect(fast.speed).toBe(RUNNER.maxSpeed)
    expect(fast.hp).toBe(1)
  })

  it('leads by the time to close in, at most a second', () => {
    expect(leadTime(30, 60)).toBe(0.5)
    expect(leadTime(300, 60)).toBe(RUNNER.lead)
    expect(leadTime(30, 0)).toBe(0)
  })
})
