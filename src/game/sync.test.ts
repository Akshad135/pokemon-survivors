import { describe, expect, it } from 'vitest'
import { NO_ACHIEVEMENTS } from './achievements'
import { buyUpgrade, EMPTY_SAVE, NO_RANKS, refundAll, upgradePrice, type Save } from './meta'
import { bagCount } from './bag'
import { buyFromCounter, buyStyle, counterOf } from './mart'
import { applyPush, mergeSaves } from './sync'

const save = (patch: Partial<Save>): Save => ({ ...EMPTY_SAVE, ...patch })

const guest = save({
  wallet: 500,
  ranks: { ...NO_RANKS, hpUp: 3 },
  dex: { 1: [10, 1], 25: [2, 0] },
  eggs: [{ tier: 'common', steps: 1500 }],
  hatched: { eevee: { shiny: true } },
  shinyStarters: { charmander: false },
  missions: { daily: { key: '2026-10-14', progress: { 'kills:500': 300 } }, weekly: { key: '2026-10-12', progress: {} } },
  achievements: { unlocked: ['survive5'], lifetime: { ...NO_ACHIEVEMENTS.lifetime, kills: 900, legends: ['lugia'] } },
  gifts: ['gift-a'],
})

const account = save({
  wallet: 2000,
  ranks: { ...NO_RANKS, hpUp: 1, protein: 2 },
  dex: { 1: [40, 0], 150: [1, 0] },
  eggs: [{ tier: 'common', steps: 200 }, { tier: 'rare', steps: 0 }],
  hatched: { eevee: { shiny: false }, gible: { shiny: false } },
  shinyStarters: { pichu: true },
  missions: { daily: { key: '2026-10-13', progress: { 'kills:500': 500 } }, weekly: { key: '2026-10-12', progress: { 'steps:5000': 4000 } } },
  achievements: { unlocked: ['firstRun'], lifetime: { ...NO_ACHIEVEMENTS.lifetime, kills: 600, runs: 40, legends: ['kyogre'] } },
  titles: ['ambassador'],
  gifts: ['gift-b', 'gift-a'],
})

describe('mergeSaves', () => {
  it("never pays back what one side spent at the counter or on styles", () => {
    const before = save({ wallet: 10_000 })
    const shopped = buyStyle(buyFromCounter(before, counterOf('2026-10-15'), 'lure')!, 'frame', 'master')!
    const m = mergeSaves(before, shopped)
    expect(m.wallet).toBe(shopped.wallet)
    expect(m.style.owned.frame).toEqual(['master'])
    expect(bagCount(m.bag, 'lure')).toBe(1)
    expect(mergeSaves(m, before)).toEqual({ ...m, style: { ...m.style, equipped: before.style.equipped }, bag: { ...m.bag, armed: before.bag.armed } })
  })

  it('joins the collection and keeps the larger upgrades and records', () => {
    const m = mergeSaves(account, guest)
    expect(m.ranks).toMatchObject({ hpUp: 3, protein: 2, iron: 0 })
    expect(m.dex).toEqual({ 1: [40, 1], 25: [2, 0], 150: [1, 0] })
    expect(m.hatched).toEqual({ eevee: { shiny: true }, gible: { shiny: false } })
    expect(m.shinyStarters).toEqual({ charmander: false, pichu: true })
    expect(m.eggs).toEqual([{ tier: 'rare', steps: 0 }, { tier: 'common', steps: 1500 }])
    expect(m.achievements.unlocked).toEqual(expect.arrayContaining(['survive5', 'firstRun']))
    expect(m.achievements.lifetime).toMatchObject({ kills: 900, runs: 40 })
    expect(m.achievements.lifetime.legends).toEqual(expect.arrayContaining(['kyogre', 'lugia']))
    expect(m.titles).toEqual(['ambassador'])
    expect(m.gifts).toEqual(['gift-a', 'gift-b'])
  })

  it('keeps the current day of missions, and the most progress on the same week', () => {
    const m = mergeSaves(account, guest)
    expect(m.missions.daily).toEqual(guest.missions.daily)
    expect(m.missions.weekly.progress).toEqual({ 'steps:5000': 4000 })
  })

  it('counts ₽ spent on one side only once', () => {
    // The same 1000 ₽, spent on one device and still in the wallet on the other.
    const spent = buyUpgrade(save({ wallet: 1000 }), 'protein')!
    const m = mergeSaves(save({ wallet: 1000 }), spent)
    expect(m.ranks.protein).toBe(1)
    expect(m.wallet).toBe(1000 - upgradePrice('protein', 0))
  })

  it('changes nothing when merged again, in either order', () => {
    const m = mergeSaves(account, guest)
    expect(mergeSaves(m, guest)).toEqual(m)
    expect(mergeSaves(account, m)).toEqual(m)
    expect(mergeSaves(guest, account)).toEqual(m)
  })

  it('fills the incubator with the rarest, most walked eggs', () => {
    const a = save({ eggs: [{ tier: 'common', steps: 10 }, { tier: 'common', steps: 20 }, { tier: 'ultra', steps: 0 }] })
    const b = save({ eggs: [{ tier: 'rare', steps: 5 }, { tier: 'common', steps: 900 }] })
    expect(mergeSaves(a, b).eggs).toEqual([
      { tier: 'ultra', steps: 0 },
      { tier: 'rare', steps: 5 },
      { tier: 'common', steps: 900 },
    ])
  })
})

describe('applyPush', () => {
  it('stores a first push as it is', () => {
    expect(applyPush(null, { save: guest, base: null })).toEqual({ save: guest, revision: 1, merged: false })
  })

  it('takes a push on top of the latest revision as is, so spending and hatching stick', () => {
    const refunded = refundAll(account)
    expect(applyPush({ save: account, revision: 4 }, { save: refunded, base: 4 })).toEqual({ save: refunded, revision: 5, merged: false })
  })

  it('merges a push from an older revision', () => {
    const out = applyPush({ save: account, revision: 4 }, { save: guest, base: 2 })
    expect(out).toEqual({ save: mergeSaves(account, guest), revision: 5, merged: true })
  })
})
