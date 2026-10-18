import { describe, expect, it } from 'vitest'
import { forkTargets, siblingStatus, TRI_ELEMENTS } from './evolvedRules'

const foe = (id: number, x: number, y = 0, dying = -1) => ({ id, x, y, dying })

describe('forkTargets (Thunderbolt)', () => {
  it('passes the current on two ways from each foe, breadth first', () => {
    // A row of foes 10 px apart, starting 50 px from the player.
    const foes = [foe(1, 50), foe(2, 60), foe(3, 40), foe(4, 70), foe(5, 30), foe(6, 200)]
    const forks = forkTargets(foes, { x: 0, y: 0 }, 6, 100, 15)
    expect(forks.map((f) => [f.foe.id, f.parent, f.depth])).toEqual([
      [5, -1, 0],
      [3, 0, 1],
      [1, 1, 2],
      [2, 2, 3],
      [4, 3, 4],
    ])
  })

  it('branches into the two nearest and stops at `count`', () => {
    const foes = [foe(1, 0, 50), foe(2, -12, 58), foe(3, 12, 58), foe(4, 0, 70)]
    const forks = forkTargets(foes, { x: 0, y: 0 }, 3, 100, 20)
    expect(forks.map((f) => [f.foe.id, f.parent])).toEqual([[1, -1], [2, 0], [3, 0]])
  })

  it('skips fainted foes and finds nothing out of range', () => {
    expect(forkTargets([foe(1, 10, 0, 0.2)], { x: 0, y: 0 }, 3, 100, 20)).toEqual([])
    expect(forkTargets([foe(1, 500)], { x: 0, y: 0 }, 3, 100, 20)).toEqual([])
  })
})

describe('siblingStatus (Tri Attack)', () => {
  const [{ status: fire }, { status: ice }, { status: bolt }] = TRI_ELEMENTS

  it('gives the other beams the chance bonus and duration scale of the fire beam', () => {
    const scaled = { ...fire, chance: fire.chance + 0.2, duration: fire.duration * 1.5, power: fire.power * 1.25 }
    const chill = siblingStatus(scaled, fire, ice)
    expect(chill.kind).toBe('slow')
    expect(chill.chance).toBeCloseTo(ice.chance + 0.2)
    expect(chill.duration).toBeCloseTo(ice.duration * 1.5)
    // Slow's power is how much speed it takes: DoT boosts don't touch it.
    expect(chill.power).toBe(ice.power)
    expect(siblingStatus(scaled, fire, bolt).chance).toBeCloseTo(bolt.chance + 0.2)
  })
})
