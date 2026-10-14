import { describe, expect, it } from 'vitest'
import { addRun, achievementProgress, NO_ACHIEVEMENTS, NO_LIFETIME, parseAchievements, parseTitle, recordAchievements } from './achievements'
import { EMPTY_SAVE, parseSave, recordRun } from './meta'
import { summary } from './tally.fixture'

describe('lifetime records', () => {
  it('count a run once, even when recorded again after endless mode', () => {
    const atVictory = summary({ kills: 900, time: 900, victory: true, legends: ['lugia'] })
    const endless = summary({ kills: 1200, time: 1300, victory: true, legends: ['lugia', 'dialga'], reaperDefeats: 1 })
    const l = addRun(addRun(NO_LIFETIME, atVictory, null), endless, atVictory)
    expect(l).toMatchObject({ runs: 1, wins: 1, kills: 1200, rifts: 2, reaperDefeats: 1, bestOvertime: 400, winGens: [1], winTypes: ['fire'] })
    expect(l.legends).toEqual(['lugia', 'dialga'])
  })

  it('keep bests instead of adding them', () => {
    const l = addRun(addRun(NO_LIFETIME, summary({ time: 600, level: 30 }), null), summary({ time: 120, level: 9 }), null)
    expect(l).toMatchObject({ runs: 2, bestTime: 600, bestLevel: 30, wins: 0, winGens: [] })
  })
})

describe('achievements', () => {
  it('unlock once, in list order', () => {
    const first = recordAchievements(NO_ACHIEVEMENTS, summary({ kills: 1000, time: 330 }), null)
    expect(first.unlocked).toEqual(['firstRun', 'kills1k', 'survive5'])
    expect(recordAchievements(first.achievements, summary({ kills: 5 }), null).unlocked).toEqual([])
  })

  it('track region wins and the grass/fire/water trio', () => {
    let save = NO_ACHIEVEMENTS
    for (const starter of ['bulbasaur', 'cyndaquil', 'mudkip'] as const) save = recordAchievements(save, summary({ starter, victory: true }), null).achievements
    expect(save.unlocked).toEqual(expect.arrayContaining(['champion', 'trio', 'kanto', 'johto', 'hoenn']))
    expect(achievementProgress(save.lifetime, 'regions')).toEqual({ value: 3, target: 9 })
  })

  it('pay missions and medals into the wallet', () => {
    const date = new Date(2026, 9, 13, 12)
    const r = recordRun(EMPTY_SAVE, summary({ kills: 100_000 }), null, date)
    expect(r.unlocked).toContain('kills100k')
    expect(r.save.wallet).toBe(r.reward)
    expect(r.reward).toBeGreaterThan(2000)
  })
})

describe('save fields', () => {
  it('parse missing or broken data as empty and drop unknown ids', () => {
    expect(parseAchievements(null)).toEqual(NO_ACHIEVEMENTS)
    const parsed = parseAchievements({ unlocked: ['champion', 'nope', 'champion'], lifetime: { kills: 12.5, legends: ['lugia', 'mew'], winGens: [1, 42] } })
    expect(parsed.unlocked).toEqual(['champion'])
    expect(parsed.lifetime).toMatchObject({ kills: 12, legends: ['lugia'], winGens: [1], runs: 0 })
  })

  it('keep a title only while its achievement is unlocked', () => {
    expect(parseTitle('champion', ['champion'])).toBe('champion')
    expect(parseTitle('champion', [])).toBeNull()
    expect(parseTitle('firstRun', ['firstRun'])).toBeNull()
  })

  it('load a save from before missions existed with the new fields empty', () => {
    const old = parseSave(JSON.stringify({ version: 1, wallet: 300, ranks: { hpUp: 1 } }))
    expect(old).toMatchObject({ wallet: 300, missions: EMPTY_SAVE.missions, achievements: NO_ACHIEVEMENTS, title: null })
  })
})
