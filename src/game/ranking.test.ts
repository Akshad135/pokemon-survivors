import { describe, expect, it } from 'vitest'
import { RUN_LENGTH } from '../data/waves'
import { clockAllows, freeHandle, handleProblem, parseDisplayName, parseHandle, parseRunResult, rankable, RANKED, suggestHandle, type RunResult } from './ranking'

const run = (o: Partial<Record<keyof RunResult, unknown>> = {}) => ({ starter: 'charmander', stage: 1, difficulty: 'hard', time: 300, outcome: 'death', level: 20, kills: 800, version: 'abc1234', ...o })

describe('parseRunResult', () => {
  it('keeps a plausible run', () => {
    expect(parseRunResult(run())).toEqual(run())
  })

  it('refuses unknown Pokémon, difficulties, outcomes and stages', () => {
    for (const o of [{ starter: 'mewtwo' }, { difficulty: 'easy' }, { outcome: 'won' }, { stage: 3 }, { stage: 1.5 }]) expect(parseRunResult(run(o))).toBeNull()
  })

  it('refuses a victory before Mewtwo shows up', () => {
    expect(parseRunResult(run({ outcome: 'victory', time: RUN_LENGTH - 1 }))).toBeNull()
    expect(parseRunResult(run({ outcome: 'victory', time: RUN_LENGTH + 2 }))).not.toBeNull()
  })

  it('refuses more faints than the clock allows, and impossible times', () => {
    expect(parseRunResult(run({ kills: 300 * RANKED.maxKillRate + 1 }))).toBeNull()
    for (const time of [-1, Number.NaN, RANKED.maxTime + 1, '300']) expect(parseRunResult(run({ time }))).toBeNull()
  })
})

describe('clockAllows', () => {
  it('lets the run fit the wall clock since its token, plus the slack', () => {
    expect(clockAllows(600, 600 + RANKED.slack)).toBe(true)
    expect(clockAllows(600, 601 + RANKED.slack)).toBe(false)
  })
})

describe('rankable', () => {
  it('drops quits in the first minute only', () => {
    expect(rankable(run({ outcome: 'quit', time: 59 }) as RunResult)).toBe(false)
    expect(rankable(run({ outcome: 'quit', time: 60 }) as RunResult)).toBe(true)
    expect(rankable(run({ outcome: 'death', time: 5 }) as RunResult)).toBe(true)
  })
})

describe('handles', () => {
  it('normalizes what the player typed', () => {
    expect(parseHandle('  @Pedro_B ')).toBe('pedro_b')
  })

  it('says what is wrong', () => {
    expect(handleProblem('ab')).toBe('short')
    expect(handleProblem('a'.repeat(21))).toBe('long')
    expect(handleProblem('joão')).toBe('chars')
    expect(handleProblem('admin')).toBe('reserved')
    expect(handleProblem('ash_99')).toBeNull()
  })

  it('suggests a valid handle from any name', () => {
    expect(suggestHandle('Zoë Müller')).toBe('zoemuller')
    expect(suggestHandle('李')).toBe('trainer')
    expect(suggestHandle('Al')).toBe('traineral')
    for (const name of ['Pedro Barretto', 'X Æ A-12', 'Admin', 'Maximiliano Fernández de la Cruz']) expect(handleProblem(suggestHandle(name))).toBeNull()
  })

  it('finds the first free handle, keeping it within the limit', () => {
    expect(freeHandle('ash', new Set())).toBe('ash')
    expect(freeHandle('ash', new Set(['ash', 'ash2']))).toBe('ash3')
    expect(freeHandle('a'.repeat(20), new Set(['a'.repeat(20)]))).toBe(`${'a'.repeat(19)}2`)
  })
})

describe('parseDisplayName', () => {
  it('trims, folds spaces and drops control characters', () => {
    expect(parseDisplayName('  Ash\u0000  Ketchum​ ')).toBe('Ash Ketchum')
  })

  it('refuses empty and long names', () => {
    expect(parseDisplayName('   ')).toBeNull()
    expect(parseDisplayName('a'.repeat(25))).toBeNull()
    expect(parseDisplayName('🔥'.repeat(24))).toBe('🔥'.repeat(24))
  })
})
