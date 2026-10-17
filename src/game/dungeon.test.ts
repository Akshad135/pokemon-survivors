import { describe, expect, it } from 'vitest'
import { createRng } from '../engine/rng'
import { fits } from './arenaFloor'
import { dungeonNav, floorShapes, generateFloor, roomAt, roomDistances, type DungeonFloor } from './dungeon'

const floors = (index: number) => Array.from({ length: 40 }, (_, seed) => generateFloor(createRng(seed + 1), index))

const onFloor = (f: DungeonFloor, [x, y]: readonly [number, number], r = 0) => floorShapes(f).some((s) => fits(s, x, y, r))

describe('generateFloor', () => {
  it('joins every room, puts the stairs in the room the most corridors away and everything else on the floor', () => {
    for (const index of [0, 1]) {
      for (const f of floors(index)) {
        const dist = roomDistances(f, [f.startRoom])
        expect(dist.every((d) => Number.isFinite(d))).toBe(true)
        expect(dist[f.stairsRoom]).toBe(Math.max(...dist))
        expect(roomAt(f, ...f.stairs)).toBe(f.stairsRoom)
        expect(roomAt(f, ...f.start)).toBe(f.startRoom)
        for (const p of [...f.items, ...f.crystals, ...f.rocks]) expect(onFloor(f, p, 4)).toBe(true)
      }
    }
  })

  it('leaves room for the player along every corridor', () => {
    for (const f of floors(1)) {
      for (const link of f.links) {
        for (const [x, y] of link.path) expect(onFloor(f, [x, y], 12)).toBe(true)
      }
    }
  })

  it('lays out the same floor from the same seed', () => {
    expect(generateFloor(createRng(9), 1)).toEqual(generateFloor(createRng(9), 1))
  })
})

describe('dungeonNav', () => {
  it('sends a walker in another room into the corridor toward the player, and lets one in the same room go straight', () => {
    for (const f of floors(1)) {
      const [px, py] = f.start
      const nav = dungeonNav(f, px, py)!
      const dist = roomDistances(f, [f.startRoom])
      const out = { x: 0, y: 0 }
      expect(nav(px + 3, py + 3, out)).toBe(false)
      const far = f.rooms.findIndex((_, i) => dist[i]! > 0)
      const r = f.rooms[far]!
      expect(nav(r.x + r.w / 2, r.y + r.h / 2, out)).toBe(true)
      // The waypoint is the first bend of a corridor out of that room, toward a room one corridor closer.
      const link = f.links.find((l) => (l.a === far && l.path[1]![0] === out.x && l.path[1]![1] === out.y) || (l.b === far && l.path[2]![0] === out.x && l.path[2]![1] === out.y))
      expect(link).toBeDefined()
      expect(dist[link!.a === far ? link!.b : link!.a]).toBe(dist[far]! - 1)
    }
  })
})
