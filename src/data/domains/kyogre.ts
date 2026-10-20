import { circle, lane } from '../arenas'
import type { BossPattern } from '../bosses'
import type { LegendDomain } from '../domains'

/**
 * Kyogre's domain, the reference rift: the Seafloor Cavern, climbed north
 * through six flooded chambers ahead of a rising tide, with Carvanha,
 * Sharpedo and Wailmer coming down at the player; then Kyogre's chamber, a
 * ring of wet rock around the deep pool it rises from. Its rain owns the
 * domain (Water ×1.5, its attacks included).
 *
 * The battle: (1) from the pool, Hydro Pump that stops on the stalagmites and
 * a Water Spout only cover survives; (2) the chamber floods into islands, it
 * swims around and dives under the player, and Surf spares only the islands;
 * (3) Primal Reversion: the islands shrink and Origin Pulse lances sweep the
 * chamber in waves, the gaps between them the only safe lanes.
 */

const R = 190

/** Rocks standing in Kyogre's chamber: cover from Hydro Pump and Water Spout, each on an island once it floods. */
const ROCKS = [
  [-112, -62],
  [112, -62],
  [0, 150],
  [-124, 66],
  [124, 66],
] as const

/** The flooded chamber's islands: one under each rock, two by the pool and one behind it. */
const islands = (r: number) => [...ROCKS.map(([x, y]) => circle(x, y + 2, r)), circle(-66, 44, r - 6), circle(66, 44, r - 6), circle(0, -134, r - 4)]

/** Origin Pulse: lances from past the screen's edge with safe lanes between them. */
const lances = (count: number, windup: number, every = 0): BossPattern => ({
  kind: 'beam', every, source: 'edge', count, spread: 52, windup, duration: 0.45, width: 18, length: 560, damage: 26, visual: 'water',
})

export const KYOGRE_DOMAIN: LegendDomain = {
  omen: { weather: 'rain', sky: 'downpour' },
  backdrop: 'cave',
  entrance: 'rise',
  music: 'kyogre',
  hp: 1.35,
  battleTime: 180,
  crossing: {
    // Six chambers climbing north, joined by winding passages; the third holds a deep pit, the fifth a flooded hall.
    floor: [
      circle(0, 0, 66),
      lane([0, -30], [44, -246], 86),
      circle(44, -282, 82),
      lane([44, -330], [-46, -546], 80),
      circle(-46, -596, 94),
      lane([-46, -664], [36, -860], 84),
      circle(36, -904, 80),
      lane([36, -950], [-40, -1150], 78),
      circle(-40, -1200, 96),
      lane([-40, -1270], [30, -1460], 80),
      circle(30, -1504, 84),
      lane([30, -1560], [0, -1886], 74),
    ],
    holes: [circle(-46, -604, 24)],
    shallow: [circle(72, -300, 30), circle(-20, -120, 18), circle(-82, -560, 22), circle(62, -900, 24), circle(-40, -1200, 70), circle(4, -1480, 22)],
    islands: [circle(-80, -1224, 18), circle(-6, -1176, 16), circle(-56, -1150, 12)],
    pattern: 'wetRock',
    solids: [
      { piece: 'stalagmite', x: -40, y: 24 },
      { piece: 'stalagmite', x: 46, y: -12 },
      { piece: 'seaRock', x: 8, y: -292 },
      { piece: 'stalagmite', x: 98, y: -258 },
      { piece: 'stalagmite', x: -104, y: -620 },
      { piece: 'stalagmite', x: 12, y: -570 },
      { piece: 'seaRock', x: -20, y: -760 },
      { piece: 'stalagmite', x: 74, y: -924 },
      { piece: 'stalagmite', x: -6, y: -880 },
      { piece: 'seaRock', x: -80, y: -1222 },
      { piece: 'stalagmite', x: 20, y: -1238 },
      { piece: 'stalagmite', x: 70, y: -1520 },
      { piece: 'seaRock', x: -14, y: -1494 },
    ],
    start: [0, 18],
    gate: -1856,
    threat: { kind: 'tide', start: 150, stop: -1800, delay: 2.5, speed: 30, rush: 2.4, gap: 170, damage: 0.05, every: 0.5, push: 34 },
    retinue: {
      first: 1.5,
      every: 3.2,
      count: 2,
      max: 8,
      members: [
        { id: 'carvanha', weight: 5, role: 'runner' },
        { id: 'sharpedo', weight: 2, role: 'runner' },
        { id: 'wailmer', weight: 2, role: 'spitter' },
      ],
    },
    theme: 'cave',
  },
  arena: {
    at: [0, -2030],
    floor: [circle(0, 0, R)],
    holes: [circle(0, -30, 58)],
    shallow: [circle(-62, 124, 22), circle(74, -132, 18)],
    pattern: 'wetRock',
    solids: ROCKS.map(([x, y]) => ({ piece: 'seaRock', x, y })),
    boss: [0, -30],
    player: [0, 118],
  },
  phases: [
    {
      below: 1,
      steer: { kind: 'anchor', x: 0, y: 0, drift: 24, pace: 0.5 },
      patterns: [
        { kind: 'ring', every: 4.4, count: 12, speed: 58, radius: 5, damage: 16, visual: 'water' },
        // Hydro Pump: aimed at the player, stopped by the stalagmites.
        { kind: 'beam', every: 5.6, source: 'boss', count: 1, spread: 0, windup: 1.1, duration: 0.5, width: 12, length: 360, damage: 20, visual: 'water', blocked: true },
        { kind: 'strikes', every: 5, target: 'player', count: 3, spread: 0, radius: 15, delay: 1.1, damage: 17, visual: 'water', lead: 1 },
        { kind: 'summon', every: 11, enemies: ['carvanha'], count: 2, max: 3, radius: 70, role: 'runner' },
      ],
      ultimate: { move: 'Water Spout', first: 8, every: 22, steps: [{ at: 0, pattern: { kind: 'blast', every: 0, windup: 2.4, damage: 36, safe: 'cover', visual: 'water' } }] },
    },
    {
      below: 0.68,
      shift: 2.2,
      steer: { kind: 'orbit', radius: 112, pace: 0.6 },
      arena: [{ kind: 'flood', at: 0, warn: 2.8, area: [circle(0, 0, R + 4)], spare: islands(30) }],
      patterns: [
        { kind: 'dive', every: 7.5, hide: 1.5, windup: 0.9, radius: 30, damage: 24, visual: 'water' },
        { kind: 'volley', every: 4.8, count: 5, arc: 0.9, speed: 105, windup: 0.9, radius: 5, damage: 16, visual: 'water' },
        { kind: 'beam', every: 6.4, source: 'boss', count: 2, spread: 0.55, windup: 1.1, duration: 0.5, width: 11, length: 360, damage: 20, visual: 'water', blocked: true },
        { kind: 'summon', every: 13, enemies: ['sharpedo', 'carvanha'], count: 2, max: 3, radius: 60, role: 'runner' },
      ],
      ultimate: { move: 'Surf', first: 7, every: 20, steps: [{ at: 0, pattern: { kind: 'blast', every: 0, windup: 2.6, damage: 38, safe: 'dry', visual: 'water' } }] },
    },
    {
      below: 0.34,
      shift: 2.6,
      form: 'primal',
      steer: { kind: 'anchor', x: 0, y: 0, drift: 34, pace: 0.7 },
      arena: [{ kind: 'flood', at: 0, warn: 2.4, area: [circle(0, 0, R + 4)], spare: islands(24) }],
      patterns: [
        lances(4, 1.3, 5.2),
        { kind: 'ring', every: 4.2, count: 16, speed: 64, radius: 5, damage: 16, visual: 'water' },
        { kind: 'dive', every: 9, hide: 1.3, windup: 0.9, radius: 32, damage: 24, visual: 'water' },
        { kind: 'beam', every: 10, source: 'boss', count: 1, spread: 0, sweep: 1.8, windup: 1.2, duration: 1.8, width: 12, length: 320, damage: 18, visual: 'water' },
      ],
      ultimate: {
        move: 'Origin Pulse',
        first: 5,
        every: 18,
        steps: [
          { at: 0, pattern: lances(5, 1.5) },
          { at: 1.8, pattern: lances(5, 1.4) },
          { at: 3.6, pattern: lances(5, 1.3) },
          { at: 5.2, pattern: { kind: 'ring', every: 0, count: 24, speed: 70, radius: 5, damage: 17, visual: 'water' } },
        ],
      },
    },
  ],
}
