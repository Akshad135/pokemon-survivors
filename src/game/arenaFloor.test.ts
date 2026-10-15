import { describe, expect, it } from 'vitest'
import { ARENA_FEET, ARENA_LAYOUTS, type ArenaShape } from '../data/arenas'
import { RIFT_LEGENDS } from '../data/rifts'
import { arenaGround, fits, floorAt, holesAt, keepOn, stepsAt, stepWarning } from './arenaFloor'

const square: ArenaShape = { kind: 'poly', pts: [[-50, -50], [50, -50], [50, 50], [-50, 50]] }
const reversed: ArenaShape = { kind: 'poly', pts: [[-50, 50], [50, 50], [50, -50], [-50, -50]] }

describe('arena floor', () => {
  it('fits circles in polygons wound either way', () => {
    for (const s of [square, reversed]) {
      expect(fits(s, 0, 0, 10)).toBe(true)
      expect(fits(s, 45, 0, 10)).toBe(false)
      expect(fits(s, 60, 0, 0)).toBe(false)
    }
  })

  it('puts someone who stepped off back on the nearest floor, and out of the holes', () => {
    const o = { x: 80, y: 10 }
    keepOn([square], [], o, 5)
    expect(o).toEqual({ x: 45, y: 10 })
    const corner = { x: 90, y: 90 }
    keepOn([square], [], corner, 5)
    expect(corner).toEqual({ x: 45, y: 45 })
    const swimmer = { x: 3, y: 0 }
    keepOn([{ kind: 'circle', x: 0, y: 0, r: 100 }], [{ kind: 'circle', x: 0, y: 0, r: 20 }], swimmer, 5)
    expect(swimmer.x).toBeCloseTo(25)
    expect(swimmer.y).toBeCloseTo(0)
  })

  it('steps the tide and the crumbling edge on schedule, warning before each step', () => {
    const { tide } = ARENA_LAYOUTS.kyogre
    expect(stepsAt(tide, 0)).toBe(0)
    expect(stepsAt(tide, tide!.every * 2 + 1)).toBe(2)
    expect(stepsAt(tide, 999)).toBe(tide!.max)
    expect(stepWarning(tide, tide!.every - 1)).toBe(true)
    expect(stepWarning(tide, 1)).toBe(false)
    expect(holesAt(ARENA_LAYOUTS.kyogre, 1)[0]!.r).toBe(ARENA_LAYOUTS.kyogre.holes![0]!.r + tide!.px)
    const sky = ARENA_LAYOUTS.rayquaza
    expect(fits(floorAt(sky, 0)[0]!, 0, -140, 0)).toBe(true)
    expect(fits(floorAt(sky, 1)[0]!, 0, -140, 0)).toBe(false)
  })

  it('burns in lava but not on the bridges, and slows in shallow water but not on the islands', () => {
    const magma = ARENA_LAYOUTS.groudon
    const bridge = magma.bridges![0]!
    expect(arenaGround(magma, -10, 8)).toBe('lava')
    expect(arenaGround(magma, bridge.x, bridge.y)).toBe('land')
    expect(arenaGround(ARENA_LAYOUTS.lugia, 0, 0)).toBe('land')
    expect(arenaGround(ARENA_LAYOUTS.lugia, 0, 70)).toBe('water')
  })

  it('starts the player and the legendary on open floor, clear of the scenery', () => {
    for (const legend of RIFT_LEGENDS) {
      const layout = ARENA_LAYOUTS[legend]
      for (const [x, y] of [layout.player, layout.boss]) {
        expect(floorAt(layout, 0).some((s) => fits(s, x, y, 8))).toBe(true)
        for (const s of layout.solids) {
          const f = ARENA_FEET[s.piece]
          expect(Math.hypot((x - s.x - f.x) / (f.rx + 8), (y - s.y - f.y) / (f.ry + 8))).toBeGreaterThan(1)
        }
      }
      expect(arenaGround(layout, ...layout.player)).not.toBe('lava')
    }
  })
})
