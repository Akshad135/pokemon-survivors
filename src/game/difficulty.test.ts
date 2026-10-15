import { describe, expect, it } from 'vitest'
import { scaling } from '../data/waves'
import { DIFFICULTIES, DIFFICULTY_IDS, parseDifficulty } from './difficulty'
import { parseSave } from './meta'

describe('difficulty levels', () => {
  it('Normal is the base run: every multiplier is 1', () => {
    expect(Object.values(DIFFICULTIES.normal).every((v) => v === 1)).toBe(true)
  })

  it('never gets easier from one level to the next in any multiplier', () => {
    DIFFICULTY_IDS.slice(1).forEach((id, i) => {
      const prev = DIFFICULTIES[DIFFICULTY_IDS[i]!]
      const next = DIFFICULTIES[id]
      expect(next.enemyHp).toBeGreaterThanOrEqual(prev.enemyHp)
      expect(next.enemyDamage).toBeGreaterThanOrEqual(prev.enemyDamage)
      expect(next.spawnRate).toBeGreaterThanOrEqual(prev.spawnRate)
      expect(next.enemySpeed).toBeGreaterThanOrEqual(prev.enemySpeed)
      expect(next.ramp).toBeGreaterThanOrEqual(prev.ramp)
      expect(next.healing).toBeLessThanOrEqual(prev.healing)
    })
  })

  it('a ramp steepens the toughening over time but starts the run at the same stats', () => {
    expect(scaling(0, 2)).toEqual(scaling(0))
    expect(scaling(10 * 60, 1.5).hp).toBeGreaterThan(scaling(10 * 60).hp)
    expect(scaling(10 * 60, 1.5).damage).toBeGreaterThan(scaling(10 * 60).damage)
  })

  it('late in the run, Nightmare regulars take about twice the hits of Normal ones, not a wall of HP', () => {
    for (const min of [10, 15, 18]) {
      const hp = (id: keyof typeof DIFFICULTIES) => scaling(min * 60, DIFFICULTIES[id].ramp).hp * DIFFICULTIES[id].enemyHp
      expect(hp('nightmare') / hp('normal')).toBeGreaterThan(1.6)
      expect(hp('nightmare') / hp('normal')).toBeLessThan(2.4)
    }
  })

  it('keeps the saved level and falls back to Normal for anything else', () => {
    expect(parseDifficulty('nightmare')).toBe('nightmare')
    for (const bad of [undefined, null, 'easy', 'toString', 3]) expect(parseDifficulty(bad)).toBe('normal')
    expect(parseSave(JSON.stringify({ version: 1, difficulty: 'hard' })).difficulty).toBe('hard')
    expect(parseSave(JSON.stringify({ version: 1, wallet: 10 })).difficulty).toBe('normal')
  })
})
