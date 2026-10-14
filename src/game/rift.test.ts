import { describe, expect, it } from 'vitest'
import { createRng } from '../engine/rng'
import { RIFT, RIFT_LEGENDS } from '../data/rifts'
import { EVENTS, RUN_LENGTH } from '../data/waves'
import { chargePortal, nextRiftAt, pickLegend, riftDue, riftLoot, riftScale } from './rift'

const due = { time: 300, nextAt: 210, busy: false, bossAlive: false, endless: false }

describe('rift schedule', () => {
  it('opens a portal once due, but waits while one is open or the player is in an arena', () => {
    expect(riftDue(due)).toBe(true)
    expect(riftDue({ ...due, time: 200 })).toBe(false)
    expect(riftDue({ ...due, busy: true })).toBe(false)
  })

  it('waits for a living boss to fall, but only for so long; the endless reaper always holds it', () => {
    const fight = { ...due, time: due.nextAt, bossAlive: true }
    expect(riftDue(fight)).toBe(false)
    expect(riftDue({ ...fight, time: due.nextAt + RIFT.bossWait - 1 })).toBe(false)
    expect(riftDue({ ...fight, time: due.nextAt + RIFT.bossWait })).toBe(true)
    expect(riftDue({ ...fight, time: due.nextAt + RIFT.bossWait, endless: true })).toBe(false)
  })

  it('never opens so late in a regular run that the arena could overlap Mewtwo, but does in endless mode', () => {
    const late = { ...due, time: RUN_LENGTH - RIFT.arenaTime - RIFT.portalTime }
    expect(riftDue(late)).toBe(false)
    expect(riftDue({ ...late, endless: true })).toBe(true)
  })

  /** Plays a regular run's clock second by second; each rift takes its full portal and arena time. */
  const riftsInRun = (rng: () => number, bossAlive: (time: number) => boolean) => {
    let nextAt: number = RIFT.firstAt
    let busyUntil = 0
    const opened: number[] = []
    for (let time = 0; time < RUN_LENGTH; time++) {
      if (!riftDue({ time, nextAt, busy: time < busyUntil, bossAlive: bossAlive(time), endless: false })) continue
      opened.push(time)
      nextAt = nextRiftAt(nextAt, time, rng)
      busyUntil = time + RIFT.portalTime + RIFT.arenaTime
    }
    return opened
  }
  const bosses = EVENTS.flatMap((e) => (e.kind === 'boss' && e.at < RUN_LENGTH ? [e.at] : []))

  it.each([
    ['the earliest', () => 0],
    ['the latest', () => 0.999],
  ])('gives three rifts with %s jitter, whether bosses fall at once or never', (_, rng) => {
    expect(riftsInRun(rng, () => false)).toHaveLength(3)
    // A weak build: every boss stays alive from its arrival to the end of the run.
    expect(riftsInRun(rng, (time) => bosses.some((at) => at <= time))).toHaveLength(3)
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
