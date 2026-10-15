import { describe, expect, it } from 'vitest'
import { TERRAIN } from '../data/terrain'
import { spawnEnemy } from './enemies'
import { createGame } from './game'
import { createTerrain, featureAt, groundAt, inSolid, pushOut, updateTerrain, type Solid } from './terrain'

const SEED = createTerrain(1234).seed

/** Every feature in a square of cells around the origin. */
const sweep = (seed: number, span = 12) =>
  Array.from({ length: (span * 2 + 1) ** 2 }, (_, i) => {
    const cx = (i % (span * 2 + 1)) - span
    const cy = Math.floor(i / (span * 2 + 1)) - span
    return { cx, cy, f: featureAt(seed, cx, cy) }
  })

/** The first solid of a kind on the map. */
const findSolid = (seed: number, kind: Solid['kind']) => sweep(seed).flatMap(({ f }) => f?.solids ?? []).find((s) => s.kind === kind)!

describe('terrain layout', () => {
  it('builds the same map from the same seed, a different one from another, and keeps the start open', () => {
    expect(sweep(SEED)).toEqual(sweep(SEED))
    expect(sweep(SEED)).not.toEqual(sweep(createTerrain(99).seed))
    for (const { f } of sweep(SEED)) {
      for (const e of [...(f?.solids.flatMap((s) => s.foot) ?? []), ...(f?.lake?.foot ?? [])]) {
        expect(Math.hypot(e.x, e.y) - Math.max(e.rx, e.ry)).toBeGreaterThan(TERRAIN.clearStart - TERRAIN.cell)
      }
    }
  })

  it('keeps every footprint inside its cell, clear of the edges, so neighbors never close a passage', () => {
    const C = TERRAIN.cell
    const m = TERRAIN.margin - 1
    for (const { cx, cy, f } of sweep(SEED)) {
      for (const e of [...(f?.solids.flatMap((s) => s.foot) ?? []), ...(f?.lake?.foot ?? [])]) {
        expect(e.x - e.rx).toBeGreaterThanOrEqual(cx * C + m)
        expect(e.x + e.rx).toBeLessThanOrEqual((cx + 1) * C - m)
        expect(e.y - e.ry).toBeGreaterThanOrEqual(cy * C + m)
        expect(e.y + e.ry).toBeLessThanOrEqual((cy + 1) * C - m)
      }
    }
  })

  it('puts every kind of feature on the map', () => {
    const kinds = new Set(sweep(SEED).flatMap(({ f }) => [...(f?.solids.map((s) => s.kind) ?? []), ...(f?.lake ? ['lake'] : [])]))
    expect([...kinds].sort()).toEqual(['cliff', 'lake', 'rock', 'tower', 'tree'])
  })
})

describe('terrain collision', () => {
  it('pushes a circle out of an ellipse to its grown edge and leaves one outside alone', () => {
    const e = { x: 0, y: 0, rx: 20, ry: 10 }
    const o = { x: 5, y: 0 }
    expect(pushOut(o, 4, e)).toBe(true)
    expect(o).toEqual({ x: 24, y: 0 })
    const far = { x: 0, y: 30 }
    expect(pushOut(far, 4, e)).toBe(false)
    expect(far).toEqual({ x: 0, y: 30 })
  })

  it('keeps the player and walkers out of solids, while flyers and bosses go over them', () => {
    const g = createGame('charmander', { w: 480, h: 270 }, 1234)
    const rock = findSolid(g.terrain.seed, 'cliff')
    const walker = spawnEnemy(g, 'rattata', rock.x, rock.y)
    const flyer = spawnEnemy(g, 'pidgey', rock.x + 4, rock.y)
    g.player.x = rock.x - 6
    g.player.y = rock.y
    updateTerrain(g, 1 / 60)
    expect(inSolid(g, g.player.x, g.player.y, g.player.radius - 0.5)).toBe(false)
    expect(inSolid(g, walker.x, walker.y, walker.radius * 0.8 - 0.5)).toBe(false)
    expect(flyer.x).toBe(rock.x + 4)
  })

  it('makes lakes water, and ice in the snow', () => {
    const g = createGame('charmander', { w: 480, h: 270 }, 1234)
    const lake = sweep(g.terrain.seed).find(({ f }) => f?.lake)!.f!.lake!
    expect(groundAt(g, lake.x, lake.y)).toBe('water')
    g.biome.id = 'snow'
    expect(groundAt(g, lake.x, lake.y)).toBe('ice')
    expect(groundAt(g, lake.x, lake.y - 200)).toBe('land')
  })
})
