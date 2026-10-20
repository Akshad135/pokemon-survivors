import { describe, expect, it } from 'vitest'
import { DOMAINS } from '../data/domains'
import { onFloor } from './arenaFloor'
import { holdsShots, nextPhase, phaseAt } from './bossFight'
import { composePlan } from './domainRules'

const hoOh = DOMAINS.hoOh!.phases

describe('a rebirth phase', () => {
  it('is never reached by HP: the phases before it follow their thresholds', () => {
    expect(phaseAt(hoOh, 0.9)).toBe(0)
    expect(phaseAt(hoOh, 0.3)).toBe(1)
    expect(phaseAt(hoOh, 0)).toBe(1)
  })

  it('comes only once the boss is held at its last HP in the phase before', () => {
    expect(nextPhase(hoOh, 1, 40, 1000)).toBe(1)
    expect(nextPhase(hoOh, 1, 1, 1000)).toBe(2)
    expect(nextPhase(hoOh, 0, 400, 1000)).toBe(1)
  })
})

describe('a time stop', () => {
  it('holds the shots only once its wait is over', () => {
    expect(holdsShots(null)).toBe(false)
    const fight = { timeStop: { wait: 0.4, left: 3, total: 3 } }
    expect(holdsShots(fight as Parameters<typeof holdsShots>[0])).toBe(false)
    fight.timeStop.wait = 0
    expect(holdsShots(fight as Parameters<typeof holdsShots>[0])).toBe(true)
  })
})

describe("the domains' floors", () => {
  for (const [legend, d] of Object.entries(DOMAINS)) {
    it(`${legend}: the crossing's start leads to its arena, where the boss and the player stand on floor`, () => {
      const open = composePlan(d, false, [])
      const [ax, ay] = d.arena.at
      expect(onFloor(open.floor, d.crossing.start[0], d.crossing.start[1])).toBe(true)
      expect(onFloor(open.floor, ax + d.arena.player[0], ay + d.arena.player[1])).toBe(true)
      expect(onFloor(open.floor, ax + d.arena.boss[0], ay + d.arena.boss[1])).toBe(true)
      // Walking north from the start, there's floor at every step until past the gate.
      const way = d.crossing.floor.map((s) => (s.kind === 'circle' ? [s.x, s.y] : [s.pts.reduce((a, p) => a + p[0], 0) / s.pts.length, s.pts.reduce((a, p) => a + p[1], 0) / s.pts.length]))
      for (const [x, y] of way) expect(onFloor(open.floor, x!, y!)).toBe(true)
    })
  }
})
