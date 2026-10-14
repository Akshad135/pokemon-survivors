import { describe, expect, it } from 'vitest'
import { createDexLog, dexCounts, dexNews, dexStatus, EMPTY_DEX, logDefeat, markCaught, markDefeated, markSeen, parseDex, recordRun } from './dex'
import { EMPTY_SAVE, parseSave } from './meta'

describe('marks', () => {
  it('reads unseen species as blank and keeps flags when adding defeats', () => {
    expect(dexStatus(EMPTY_DEX, 16)).toEqual({ seen: false, defeated: 0, caught: false, shiny: false })
    const dex = markDefeated(markCaught(markSeen(EMPTY_DEX, 16), 16, true), 16, 3)
    expect(dexStatus(dex, 16)).toEqual({ seen: true, defeated: 3, caught: true, shiny: true })
  })

  it('catches without shiny for other sources (hatched eggs)', () => {
    expect(dexStatus(markCaught(EMPTY_DEX, 1), 1)).toEqual({ seen: true, defeated: 0, caught: true, shiny: false })
  })

  it('counts species, optionally only among the ones the game still has', () => {
    const dex = markCaught(markDefeated(markSeen(markSeen(EMPTY_DEX, 1), 16), 16), 19, true)
    expect(dexCounts(dex)).toEqual({ seen: 3, defeated: 1, caught: 1, shiny: 1 })
    expect(dexCounts(dex, [16, 25])).toEqual({ seen: 1, defeated: 1, caught: 0, shiny: 0 })
  })
})

describe('a run', () => {
  const run = () => {
    const log = createDexLog()
    log.seen.add(16).add(19)
    logDefeat(log, 19, false)
    logDefeat(log, 19, true)
    return log
  }

  it('folds sightings, defeats and shinies into the save', () => {
    const dex = recordRun(markDefeated(EMPTY_DEX, 19, 5), run())
    expect(dexStatus(dex, 16)).toMatchObject({ seen: true, defeated: 0 })
    expect(dexStatus(dex, 19)).toEqual({ seen: true, defeated: 7, caught: true, shiny: true })
  })

  it('catches the forms the player played, shiny if the run was', () => {
    const log = run()
    log.own.set(4, false).set(5, true)
    const dex = recordRun(EMPTY_DEX, log)
    expect(dexStatus(dex, 4)).toMatchObject({ caught: true, shiny: false })
    expect(dexStatus(dex, 5)).toMatchObject({ caught: true, shiny: true })
  })

  it('reports only what is new', () => {
    expect(dexNews(EMPTY_DEX, run())).toEqual({ species: 2, shinies: 1 })
    expect(dexNews(markCaught(markSeen(EMPTY_DEX, 16), 19, true), run())).toEqual({ species: 0, shinies: 0 })
  })
})

describe('parseDex', () => {
  it('drops malformed entries and clears unknown flag bits', () => {
    const raw = { 16: [3, 1], 19: [-2, 255], x: [1, 0], 0: [1, 0], 25: 'seen', 7: [2.9] }
    expect(parseDex(raw)).toEqual({ 16: [3, 1], 19: [0, 3], 7: [2, 0] })
    expect(parseDex([1, 2])).toEqual(EMPTY_DEX)
  })

  it('round-trips through the save, and older saves start with an empty Pokédex', () => {
    const save = { ...EMPTY_SAVE, dex: recordRun(EMPTY_DEX, (() => { const l = createDexLog(); logDefeat(l, 25, true); return l })()) }
    expect(parseSave(JSON.stringify(save))).toEqual(save)
    expect(parseSave(JSON.stringify({ version: 1, wallet: 10, ranks: {} })).dex).toEqual(EMPTY_DEX)
  })
})
