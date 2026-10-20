import { describe, expect, it } from 'vitest'
import { DOMAINS } from '../data/domains'
import { arenaGround, onFloor } from './arenaFloor'
import { advanceFront, composePlan, ENCOUNTER_LENGTH, encounterBeat, REVEAL_AT, transformStage, waterBelow } from './domainRules'

const kyogre = DOMAINS.kyogre!
const threat = kyogre.crossing.threat

describe('the crossing threat', () => {
  it('waits, rises at its pace, rushes when it trails the player far behind, and never passes its stop', () => {
    expect(advanceFront(100, 0, threat.delay - 0.1, 1, threat)).toBe(100)
    expect(advanceFront(100, 0, threat.delay, 1, threat)).toBeCloseTo(100 - threat.speed)
    expect(advanceFront(100, 100 - threat.gap - 50, threat.delay, 1, threat)).toBeCloseTo(100 - threat.speed * threat.rush)
    expect(advanceFront(threat.stop + 1, -5000, 99, 10, threat)).toBe(threat.stop)
  })

  it('floods the floor behind its front, where the ground turns to water', () => {
    const plan = composePlan(kyogre, false, [], waterBelow(-200))
    expect(arenaGround(plan, 0, -100)).toBe('water')
    expect(arenaGround(plan, 44, -282)).toBe('land')
  })
})

describe("a domain's floor", () => {
  const [ax, ay] = kyogre.arena.at

  it('joins the crossing to the arena until the way seals, then keeps only the arena', () => {
    const open = composePlan(kyogre, false, [])
    const sealed = composePlan(kyogre, true, [])
    expect(onFloor(open.floor, 0, 0)).toBe(true)
    expect(onFloor(open.floor, ax, ay + 120)).toBe(true)
    expect(onFloor(sealed.floor, 0, 0)).toBe(false)
    expect(onFloor(sealed.floor, ax, ay + 120)).toBe(true)
  })

  it("turns the arena to water but its islands once a phase's flood lands", () => {
    const flood = kyogre.phases[1]!.arena![0]!
    const island = flood.spare[0]!
    const plan = composePlan(kyogre, true, [flood])
    expect(arenaGround(plan, ax + island.x, ay + island.y)).toBe('land')
    expect(arenaGround(plan, ax + island.x + island.r + 8, ay + island.y)).toBe('water')
    // A later flood's smaller islands replace the earlier ones.
    const rising = kyogre.phases[2]!.arena![0]!
    const later = composePlan(kyogre, true, [flood, rising])
    const edge = ax + island.x + rising.spare[0]!.r + 3
    expect(arenaGround(later, edge, ay + island.y)).toBe('water')
  })

  it('shows a transform for its warning before it lands', () => {
    const t = { kind: 'flood', at: 1, warn: 2, area: [], spare: [] } as const
    expect([transformStage(t, 0.5), transformStage(t, 1.5), transformStage(t, 3)]).toEqual(['hidden', 'warn', 'landed'])
  })
})

describe('the encounter', () => {
  it('takes the camera to the legendary, holds it there through the reveal, then brings it back', () => {
    expect(encounterBeat(0).camera).toBe(0)
    expect(encounterBeat(REVEAL_AT).camera).toBe(1)
    expect(encounterBeat(REVEAL_AT).entrance).toBe(1)
    expect(encounterBeat(ENCOUNTER_LENGTH).camera).toBe(0)
  })
})
