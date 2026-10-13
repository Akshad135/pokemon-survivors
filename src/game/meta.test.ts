import { describe, expect, it } from 'vitest'
import { createRng } from '../engine/rng'
import {
  buyUpgrade,
  coinDrops,
  EMPTY_SAVE,
  NO_RANKS,
  parseSave,
  rankDeltas,
  refundAll,
  runBonus,
  totalSpent,
  UPGRADE_IDS,
  UPGRADES,
  upgradePrice,
  type Save,
} from './meta'
import { applyDeltas, BASE_STATS } from './stats'

const rich = (wallet: number): Save => ({ ...EMPTY_SAVE, wallet })

describe('upgrade prices', () => {
  it('escalate with every rank and stay rounded to ₽10', () => {
    for (const id of UPGRADE_IDS) {
      const prices = Array.from({ length: UPGRADES[id].maxRank }, (_, r) => upgradePrice(id, r))
      expect(prices[0]).toBe(UPGRADES[id].basePrice)
      prices.slice(1).forEach((p, i) => expect(p).toBeGreaterThan(prices[i]!))
      prices.forEach((p) => expect(p % 10).toBe(0))
    }
  })

  it('refunds exactly what was spent', () => {
    let save = rich(10_000)
    for (const id of ['hpUp', 'hpUp', 'protein', 'escapeRope'] as const) save = buyUpgrade(save, id)!
    expect(save.wallet + totalSpent(save.ranks)).toBe(10_000)
    expect(refundAll(save)).toEqual(rich(10_000))
  })

  it('refuses purchases past max rank or without enough ₽', () => {
    expect(buyUpgrade(rich(upgradePrice('hpUp', 0) - 1), 'hpUp')).toBeNull()
    const maxed = { ...rich(1_000_000), ranks: { ...NO_RANKS, ppUp: UPGRADES.ppUp.maxRank } }
    expect(buyUpgrade(maxed, 'ppUp')).toBeNull()
  })
})

describe('applying ranks', () => {
  it('stacks each stat upgrade per rank on top of the base stats', () => {
    const stats = applyDeltas(BASE_STATS, rankDeltas({ ...NO_RANKS, hpUp: 3, zinc: 2, amuletCoin: 1 }))
    expect(stats.maxHp).toBe(BASE_STATS.maxHp + 30)
    expect(stats.cooldown).toBeCloseTo(0.95)
    expect(stats.greed).toBeCloseTo(1.1)
    expect(stats.might).toBe(BASE_STATS.might)
  })

  it('adds no stat layers for charges or unowned upgrades', () => {
    expect(rankDeltas({ ...NO_RANKS, abilityCapsule: 2, escapeRope: 3 })).toEqual([])
  })
})

describe('save parsing', () => {
  it('falls back to an empty save on missing, corrupt or unknown data', () => {
    expect(parseSave(null)).toEqual(EMPTY_SAVE)
    expect(parseSave('{not json')).toEqual(EMPTY_SAVE)
    expect(parseSave('[1,2]')).toEqual(EMPTY_SAVE)
    expect(parseSave(JSON.stringify({ version: 99, wallet: 500 }))).toEqual(EMPTY_SAVE)
  })

  it('sanitizes wallet and ranks and drops unknown upgrades', () => {
    const raw = JSON.stringify({ version: 1, wallet: -40.5, ranks: { hpUp: 99, protein: 2.7, iron: 'x', masterBall: 3 } })
    const save = parseSave(raw)
    expect(save.wallet).toBe(0)
    expect(save.ranks).toEqual({ ...NO_RANKS, hpUp: UPGRADES.hpUp.maxRank, protein: 2 })
  })

  it('round-trips a valid save', () => {
    const save = buyUpgrade(rich(2000), 'carbos')!
    expect(parseSave(JSON.stringify(save))).toEqual(save)
  })
})

describe('earning ₽', () => {
  it('bosses and shinies always pay out, bosses the most', () => {
    const sum = (v: number[]) => v.reduce((a, b) => a + b, 0)
    const rng = createRng(3)
    expect(sum(coinDrops(rng, { boss: true, xp: 60 }))).toBeGreaterThan(sum(coinDrops(rng, { boss: false, xp: 1, shiny: true })))
    expect(sum(coinDrops(rng, { boss: false, xp: 1, shiny: true }))).toBeGreaterThan(0)
  })

  it('regular enemies drop coins only occasionally', () => {
    const rng = createRng(7)
    const drops = Array.from({ length: 2000 }, () => coinDrops(rng, { boss: false, xp: 1 }).length)
    const rate = drops.reduce((a, b) => a + b, 0) / drops.length
    expect(rate).toBeGreaterThan(0.01)
    expect(rate).toBeLessThan(0.08)
  })

  it('pays a bigger bonus for longer runs, more kills, victory and greed', () => {
    const base = { time: 300, kills: 400, victory: false, greed: 1 }
    expect(runBonus(base)).toBe(250)
    expect(runBonus({ ...base, time: 600 })).toBeGreaterThan(runBonus(base))
    expect(runBonus({ ...base, victory: true })).toBe(1250)
    expect(runBonus({ ...base, greed: 1.5 })).toBe(375)
  })
})
