import { describe, expect, it } from 'vitest'
import { createRng } from '../engine/rng'
import { RIFT, RIFT_LEGENDS } from '../data/rifts'
import { RUN_LENGTH } from '../data/waves'
import { chargePortal, nextRiftAt, pickLegend, riftDue, riftLoot, riftScale } from './rift'

const due = { time: 300, nextAt: 210, busy: false, bossAlive: false, endless: false }

describe('rift schedule', () => {
  it('opens a portal once due, but waits while one is open, a boss is alive or the player is in an arena', () => {
    expect(riftDue(due)).toBe(true)
    expect(riftDue({ ...due, time: 200 })).toBe(false)
    expect(riftDue({ ...due, busy: true })).toBe(false)
    expect(riftDue({ ...due, bossAlive: true })).toBe(false)
  })

  it('never opens so late in a regular run that the arena could overlap Mewtwo, but does in endless mode', () => {
    const late = { ...due, time: RUN_LENGTH - RIFT.arenaTime - RIFT.portalTime }
    expect(riftDue(late)).toBe(false)
    expect(riftDue({ ...late, endless: true })).toBe(true)
  })

  it('fits three rifts in a regular run even with the latest jitter', () => {
    const rng = () => 0.999
    let at: number = RIFT.firstAt
    const opened: number[] = []
    while (riftDue({ ...due, time: at, nextAt: at })) {
      opened.push(at)
      at = nextRiftAt(at, rng)
    }
    expect(opened.length).toBe(3)
  })
})

describe('rift portal', () => {
  it('takes standing inside for the enter time; stepping out drains it twice as fast', () => {
    let charge = 0
    for (let i = 0; i < 30; i++) charge = chargePortal(charge, true, 1 / 60)
    expect(charge).toBeLessThan(RIFT.enterTime)
    for (let i = 0; i < 30; i++) charge = chargePortal(charge, true, 1 / 60)
    expect(charge).toBeCloseTo(RIFT.enterTime)
    expect(chargePortal(0.5, false, 0.1)).toBeCloseTo(0.3)
    expect(chargePortal(0.1, false, 1)).toBe(0)
  })

  it('brings a different legendary each time until all were met', () => {
    const rng = createRng(4)
    const seen: (typeof RIFT_LEGENDS)[number][] = []
    for (let i = 0; i < RIFT_LEGENDS.length; i++) seen.push(pickLegend(rng, seen))
    expect(new Set(seen).size).toBe(RIFT_LEGENDS.length)
    expect(RIFT_LEGENDS).toContain(pickLegend(rng, seen))
  })
})

describe('rift legendary', () => {
  it('is tuned for the first rift and grows with the run clock', () => {
    expect(riftScale(RIFT.firstAt)).toEqual({ hp: 1, damage: 1 })
    expect(riftScale(0)).toEqual({ hp: 1, damage: 1 })
    expect(riftScale(RIFT.firstAt + 240).hp).toBeCloseTo(3)
    expect(riftScale(RIFT.firstAt + 240).damage).toBeGreaterThan(1)
  })

  it('pays more later in the run, and a shiny doubles the ₽ and adds a Poké Ball', () => {
    const sum = (v: readonly number[]) => v.reduce((a, b) => a + b, 0)
    const early = riftLoot(RIFT.firstAt, false)
    const shiny = riftLoot(RIFT.firstAt, true)
    expect(riftLoot(700, false).xp).toBeGreaterThan(early.xp)
    expect(sum(shiny.coins)).toBe(sum(early.coins) * 2)
    expect(shiny.pokeballs).toBe(early.pokeballs + 1)
    expect(early.heal).toBeGreaterThan(0)
  })
})
