import { describe, expect, it } from 'vitest'
import { createRng } from '../engine/rng'
import { EVENTS } from '../data/waves'
import {
  BALLS, ballSpots, clearOfBosses, defenseProgress, ESCORT, FIELD, FIELD_MISSION_KINDS, FIELD_TUNING, followStep, freshKinds, nextMissionAt,
} from './fieldMissionRules'

const bossTimes = EVENTS.flatMap((e) => (e.kind === 'boss' ? [e.at] : []))
const nearBoss = (t: number) => bossTimes.some((b) => t > b - FIELD.quiet[0] && t < b + FIELD.quiet[1])

describe('field mission schedule', () => {
  it('never starts a mission over a boss entrance', () => {
    expect(nearBoss(clearOfBosses(FIELD.first))).toBe(false)
    for (let t = 0; t < 900; t += 7) expect(nearBoss(clearOfBosses(t))).toBe(false)
    for (const roll of [0, 0.5, 0.99]) expect(nearBoss(nextMissionAt(200, roll))).toBe(false)
  })

  it('leaves a quiet stretch alone and waits at least the gap', () => {
    const quiet = 200
    expect(clearOfBosses(quiet)).toBe(quiet)
    expect(nextMissionAt(quiet, 0)).toBeGreaterThanOrEqual(quiet + FIELD.gap[0])
  })

  it('runs every kind once before any repeats', () => {
    expect(freshKinds([])).toEqual(FIELD_MISSION_KINDS)
    expect(freshKinds(['collect'])).toEqual(['defense', 'escort'])
    expect(freshKinds(['collect', 'defense', 'escort'])).toEqual(FIELD_MISSION_KINDS)
    expect(freshKinds(['collect', 'defense', 'escort', 'escort'])).toEqual(['defense', 'collect'])
  })
})

describe('defense', () => {
  it('only counts the seconds spent inside the ring', () => {
    const hold = FIELD_TUNING.normal.defense.hold
    let p = 0
    for (let t = 0; t < hold / 2; t += 0.5) p = defenseProgress(p, true, 0.5, hold)
    expect(defenseProgress(p, false, 10, hold)).toBe(p)
    expect(defenseProgress(p, true, hold, hold)).toBe(1)
  })
})

describe('collect', () => {
  it('scatters the balls apart within the area', () => {
    const spots = ballSpots(createRng(4), 0, 0, 6)
    expect(spots.length).toBe(6)
    for (const [i, a] of spots.entries()) {
      const d = Math.hypot(a.x, a.y)
      expect(d).toBeGreaterThanOrEqual(BALLS.spread[0] - 1)
      expect(d).toBeLessThanOrEqual(BALLS.spread[1] + 1)
      for (const b of spots.slice(i + 1)) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(BALLS.spacing)
    }
  })
})

describe('escort', () => {
  it('trails the player, stops close by and waits when left behind', () => {
    const step = followStep(0, 0, 60, 0, 0.5)
    expect(step.x).toBeCloseTo(ESCORT.speed * 0.5)
    expect(followStep(0, 0, 60, 0, 5).x).toBeCloseTo(60 - ESCORT.near)
    expect(followStep(0, 0, ESCORT.leash + 1, 0, 1)).toEqual({ x: 0, y: 0 })
  })
})

describe('tuning', () => {
  it('makes Nightmare tighter and better paid than Normal', () => {
    const n = FIELD_TUNING.normal
    const x = FIELD_TUNING.nightmare
    expect(x.collect.time).toBeLessThan(n.collect.time)
    expect(x.escort.time).toBeLessThan(n.escort.time)
    expect(x.defense.elites).toBeGreaterThan(n.defense.elites)
    expect(x.reward.coins).toBeGreaterThan(n.reward.coins)
    expect(x.reward.egg).toBeGreaterThan(n.reward.egg)
  })
})
