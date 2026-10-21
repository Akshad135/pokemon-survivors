import { describe, expect, it } from 'vitest'
import { DOMAINS } from '../data/domains'
import { arenaGround, onFloor } from './arenaFloor'
import { advanceFront, composePlan, ENCOUNTER_LENGTH, encounterBeat, REVEAL_AT, threatGround, transformStage, waterBelow } from './domainRules'

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

describe("Groudon's and Rayquaza's domains", () => {
  const groudon = DOMAINS.groudon!
  const rayquaza = DOMAINS.rayquaza!

  it("carry the crossing's lava rivers and bridges until the way seals", () => {
    const open = composePlan(groudon, false, [])
    // The passage between the second and third chambers: a river across it, one bridge over.
    const bridge = groudon.crossing.bridges![2]!
    expect(onFloor(open.floor, bridge.x + 20, bridge.y)).toBe(true)
    expect(arenaGround(open, bridge.x + 20, bridge.y)).toBe('lava')
    expect(arenaGround(open, bridge.x, bridge.y)).toBe('land')
    expect(composePlan(groudon, true, []).lava).toEqual([])
  })

  it('leave the ground as it is behind a lava or crumbling front, which hurts on its own', () => {
    expect(threatGround(groudon.crossing.threat, -200)).toBeUndefined()
    expect(threatGround(rayquaza.crossing.threat, -200)).toBeUndefined()
    expect(threatGround(kyogre.crossing.threat, -200)).toEqual(waterBelow(-200))
  })

  it("burn the chamber but its cool stones once Groudon's lava rises, the later rise keeping the first one's stones", () => {
    const [ax, ay] = groudon.arena.at
    const rising = groudon.phases[1]!.arena![0]!
    const swelling = groudon.phases[2]!.arena![0]!
    const stone = rising.spare[0]!
    const plan = composePlan(groudon, true, [rising, swelling])
    expect(arenaGround(plan, ax + stone.x, ay + stone.y)).toBe('land')
    expect(arenaGround(plan, ax + stone.x, ay + stone.y + stone.r + 6)).toBe('lava')
  })

  it("cut Rayquaza's roof where it crumbles, every fall adding up", () => {
    const [ax, ay] = rayquaza.arena.at
    const corners = rayquaza.phases[1]!.arena![0]!
    const edges = rayquaza.phases[2]!.arena![0]!
    const plan = composePlan(rayquaza, true, [corners, edges])
    const holes = plan.holes ?? []
    expect(holes.length).toBe(corners.spare.length + edges.spare.length)
    expect(onFloor(plan.floor, ax, ay)).toBe(true)
  })
})
