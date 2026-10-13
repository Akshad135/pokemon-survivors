import { describe, expect, it } from 'vitest'
import { createRng } from '../engine/rng'
import {
  CHEST, chestCoins, chestProgress, fleeHeading, FOUNTAIN, fountainSip, MEOWTH, meowthSpeed, rollAltarBuff, SPIKES,
  spikePhase, spawnSpot, type FountainState,
} from './mapEventRules'
import type { Buff } from './types'

describe('locked chest', () => {
  it('opens after standing in the ring for the unlock time', () => {
    let p = 0
    for (let t = 0; t < CHEST.unlock - 0.1; t += 0.1) p = chestProgress(p, true, 0.1)
    expect(p).toBeLessThan(1)
    expect(chestProgress(p, true, 0.2)).toBe(1)
  })

  it('drains slower than it fills when you step out, and never below zero', () => {
    const half = chestProgress(0, true, CHEST.unlock / 2)
    expect(chestProgress(half, false, 1)).toBeCloseTo(0.5 - CHEST.decay / CHEST.unlock)
    expect(chestProgress(0.1, false, 10)).toBe(0)
  })

  it('pays more coins later in the run', () => {
    const sum = (coins: number[]) => coins.reduce((a, b) => a + b, 0)
    expect(sum(chestCoins(14 * 60))).toBeGreaterThan(sum(chestCoins(60)))
  })
})

describe('fountain', () => {
  const fresh = (): FountainState => ({ charges: FOUNTAIN.charges, timer: 0 })

  it('never spends charges at full HP or from outside', () => {
    const f = fresh()
    expect(fountainSip(f, true, false, 1)).toBe(false)
    expect(fountainSip(f, false, true, 1)).toBe(false)
    expect(f.charges).toBe(FOUNTAIN.charges)
  })

  it('sips once per interval until it runs dry', () => {
    const f = fresh()
    let sips = 0
    for (let t = 0; t < 20; t += 1 / 60) if (fountainSip(f, true, true, 1 / 60)) sips++
    expect(sips).toBe(FOUNTAIN.charges)
    expect(f.charges).toBe(0)
  })
})

describe('altar', () => {
  it('favors buffs that are not already running', () => {
    const rng = createRng(3)
    const active: Buff[] = [{ id: 'xAttack', left: 10, total: 20 }]
    const rolls = Array.from({ length: 2000 }, () => rollAltarBuff(rng, active))
    const share = rolls.filter((b) => b === 'xAttack').length / rolls.length
    expect(share).toBeLessThan(0.15)
    expect(new Set(rolls)).toEqual(new Set(['xAttack', 'xSpeed', 'maxRepel']))
  })
})

describe('fleeing Meowth', () => {
  it('runs away from the player', () => {
    for (let t = 0; t < 6; t += 0.5) {
      const h = fleeHeading(100, 0, 0, 0, t, 1)
      expect(h.x).toBeGreaterThan(0.75)
      expect(Math.hypot(h.x, h.y)).toBeCloseTo(1)
    }
  })

  it('panics up close and slows down when left behind', () => {
    expect(meowthSpeed(0)).toBe(MEOWTH.speedNear)
    expect(meowthSpeed(1000)).toBe(MEOWTH.speedFar)
    expect(meowthSpeed(100)).toBeLessThan(MEOWTH.speedNear)
  })
})

describe('traps and placement', () => {
  it('cycles spikes through down, warning and up', () => {
    expect(spikePhase(0)).toBe('down')
    expect(spikePhase(SPIKES.down + 0.1)).toBe('warn')
    expect(spikePhase(SPIKES.down + SPIKES.warn + 0.1)).toBe('up')
    expect(spikePhase(SPIKES.down + SPIKES.warn + SPIKES.up + 0.1)).toBe('down')
  })

  it('places events on the ring and away from other events', () => {
    const rng = createRng(9)
    const taken = [{ x: 150, y: 0 }]
    for (let i = 0; i < 200; i++) {
      const spot = spawnSpot(rng, 0, 0, [100, 200], taken, 80)
      if (!spot) continue
      expect(Math.hypot(spot.x, spot.y)).toBeGreaterThanOrEqual(99)
      expect(Math.hypot(spot.x, spot.y)).toBeLessThanOrEqual(201)
      expect(Math.hypot(spot.x - 150, spot.y)).toBeGreaterThanOrEqual(80)
    }
  })
})
