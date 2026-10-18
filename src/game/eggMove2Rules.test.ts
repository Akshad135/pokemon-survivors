import { describe, expect, it } from 'vitest'
import { bestLine, crossCrit, lastResortMult, nearSegment, recoilCost, RESORT_NEED, waterfallMult, weatherBallForm } from './eggMove2Rules'

const foe = (id: number, x: number, y: number, dying = -1) => ({ id, x, y, dying })

describe('Brave Bird picks its line', () => {
  it('dives through the line with the most foes, the nearest on a tie', () => {
    // Three foes in a row to the right, one alone (and nearer) above.
    const foes = [foe(1, 0, -30), foe(2, 40, 0), foe(3, 60, 0), foe(4, 80, 2)]
    expect(bestLine(foes, { x: 0, y: 0 }, 140, 96, 16)?.id).toBe(2)
    expect(bestLine([foe(5, 50, 0), foe(6, 0, 30)], { x: 0, y: 0 }, 140, 96, 16)?.id).toBe(6)
  })

  it('ignores fainted foes and foes out of reach', () => {
    expect(bestLine([foe(1, 20, 0, 0), foe(2, 400, 0)], { x: 0, y: 0 }, 140, 96, 16)).toBeNull()
  })

  it('measures distance to a segment, not a line', () => {
    expect(nearSegment(50, 5, { x: 0, y: 0 }, { x: 100, y: 0 }, 6)).toBe(true)
    expect(nearSegment(110, 0, { x: 0, y: 0 }, { x: 100, y: 0 }, 6)).toBe(false)
  })
})

describe('recoil', () => {
  it('costs a share of max HP per hit, up to the cap per cast, never the last point', () => {
    expect(recoilCost(100, 100, 0, 0.02, 0.06)).toBe(2)
    expect(recoilCost(100, 100, 5, 0.02, 0.06)).toBe(1)
    expect(recoilCost(100, 100, 6, 0.02, 0.06)).toBe(0)
    expect(recoilCost(100, 2, 0, 0.02, 0.06)).toBe(1)
    expect(recoilCost(100, 1, 0, 0.02, 0.06)).toBe(0)
  })
})

describe('Weather Ball', () => {
  it('turns into the weather’s type and hits harder under any weather', () => {
    expect(weatherBallForm('clear')).toMatchObject({ type: 'normal', mult: 1, status: null })
    expect(weatherBallForm('fog').type).toBe('normal')
    expect(weatherBallForm('sun')).toMatchObject({ type: 'fire', status: { kind: 'burn' } })
    expect(weatherBallForm('rain')).toMatchObject({ type: 'water', status: { kind: 'slow' } })
    expect(weatherBallForm('sand')).toMatchObject({ type: 'rock', mult: 1.5 })
    expect(weatherBallForm('snow')).toMatchObject({ type: 'ice', mult: 1.5, status: { kind: 'freeze' } })
  })
})

describe('scalings', () => {
  it('Last Resort is a tap until 4 other moves, then grows a little past them', () => {
    expect(lastResortMult(RESORT_NEED - 1)).toBeLessThan(0.5)
    expect(lastResortMult(RESORT_NEED)).toBe(1)
    expect(lastResortMult(RESORT_NEED + 1)).toBeGreaterThan(1)
  })

  it('Waterfall is a splash before evolving and a torrent after', () => {
    expect(waterfallMult(0)).toBeLessThan(1)
    expect(waterfallMult(1)).toBeGreaterThan(1)
    expect(waterfallMult(2)).toBeGreaterThanOrEqual(waterfallMult(1))
  })

  it('Cross Poison crits on a low roll', () => {
    expect(crossCrit(0.1)).toBe(true)
    expect(crossCrit(0.9)).toBe(false)
  })
})
