import { around, circle, lane, poly, type Pt } from '../arenas'
import type { BossPattern } from '../bosses'
import type { ArenaTransform, LegendDomain } from '../domains'

/**
 * Rayquaza's domain: the Sky Pillar, climbed floor by floor up narrow stairs
 * with open sky on every side, while each floor crumbles away behind the
 * player and gusts shear across the stairs (`game/domains/rayquaza.ts`),
 * with Swablu, Altaria, Bagon, Shelgon and Salamence diving at them. Then the
 * pillar's open roof, where Rayquaza comes down out of the clouds. Its Air
 * Lock owns the domain: no weather at all, whatever the map had.
 *
 * The battle is in the air, unlike Kyogre's and Groudon's: (1) it circles the
 * roof, Twister and Dragon Pulse, Extreme Speed passes from off the roof, and
 * Hyper Beam sweeping across it (its arc shows: get behind it or out of the
 * arc); (2) the roof's corners fall into the sky, two passes at a time, and
 * Draco Meteor rains in waves; (3) Mega Rayquaza: the edges fall too, it
 * flies up and crashes down on the player's shadow, and Dragon Ascent is two
 * crashes and two passes in a row.
 */

/** A square floor of the pillar, `half` px around (x, y). */
const storey = ([x, y]: Pt, half: number) => poly([x - half, y - half], [x + half, y - half], [x + half, y + half], [x - half, y + half])

/** The roof: an octagon open to the sky. */
const ROOF = 196

/** A chunk of the roof falling away: `n` circles of radius `r`, `d` px out, starting `turn` rad round. */
const breakAway = (n: number, d: number, r: number, turn: number) => around(n, d, turn).map(([x, y]) => circle(x, y, r))

/** Phase 2: the roof's four corners fall into the sky. */
const CORNERS: ArenaTransform = { kind: 'crumble', at: 0, warn: 3, area: [], spare: breakAway(4, 158, 44, Math.PI / 4) }

/** Phase 3: the middle of each edge goes too, and a crack on the diagonals; what's left is a cross around the middle. */
const EDGES: ArenaTransform = { kind: 'crumble', at: 0, warn: 2.6, area: [], spare: [...breakAway(4, 176, 42, 0), ...breakAway(4, 104, 16, Math.PI / 4)] }

/** Air Slash: blades of wind out of Rayquaza. */
const airSlash = (count: number, every: number): BossPattern => ({
  kind: 'beam', every, source: 'boss', count, spread: 0.48, windup: 1, duration: 0.35, width: 10, length: 320, damage: 14, visual: 'aero',
})

/** Draco Meteor: meteors scattered over the roof around Rayquaza. */
const meteors = (count: number, delay: number): BossPattern => ({ kind: 'strikes', every: 0, target: 'self', count, spread: 200, radius: 20, delay, damage: 18, visual: 'dragon' })

export const RAYQUAZA_DOMAIN: LegendDomain = {
  omen: { weather: 'clear', sky: 'gale' },
  backdrop: 'sky',
  entrance: 'descend',
  music: 'rayquaza',
  hp: 1.5,
  battleTime: 180,
  crossing: {
    // Six floors up the pillar, joined by narrow stairs that switch sides; some floors already gave way in places.
    floor: [
      storey([0, -10], 72),
      lane([50, -60], [70, -270], 38),
      storey([40, -330], 76),
      lane([-10, -390], [-60, -600], 38),
      storey([-50, -660], 78),
      lane([0, -720], [50, -930], 38),
      storey([40, -990], 76),
      lane([-10, -1050], [-50, -1260], 36),
      storey([-40, -1320], 80),
      lane([0, -1384], [20, -1590], 38),
      storey([20, -1650], 72),
      lane([20, -1706], [0, -1880], 40),
    ],
    holes: [circle(-50, -660, 24), circle(0, -1012, 16), circle(82, -962, 14), circle(-76, -1346, 18), circle(36, -1296, 12)],
    pattern: 'jade',
    solids: [
      { piece: 'jadeStump', x: -44, y: -30 },
      { piece: 'jadeStump', x: 86, y: -350 },
      { piece: 'jadeStump', x: -6, y: -306 },
      { piece: 'jadeStump', x: -104, y: -690 },
      { piece: 'jadeStump', x: 4, y: -630 },
      { piece: 'jadeStump', x: -12, y: -960 },
      { piece: 'jadeStump', x: 84, y: -1034 },
      { piece: 'jadeStump', x: 0, y: -1352 },
      { piece: 'jadeStump', x: -18, y: -1630 },
      { piece: 'jadeStump', x: 58, y: -1676 },
    ],
    start: [0, 30],
    gate: -1862,
    threat: { kind: 'crumble', start: 140, stop: -1800, delay: 2.5, speed: 34, rush: 2.4, gap: 160, damage: 0.05, every: 0.5, push: 40, ground: 'none' },
    retinue: {
      first: 1.5,
      every: 3.2,
      count: 2,
      max: 8,
      members: [
        { id: 'swablu', weight: 4, role: 'runner' },
        { id: 'bagon', weight: 3, role: 'runner' },
        { id: 'altaria', weight: 2, role: 'spitter' },
        { id: 'shelgon', weight: 1, role: 'elite' },
        { id: 'salamence', weight: 1, role: 'runner' },
      ],
    },
    theme: 'run',
  },
  arena: {
    at: [0, -2036],
    floor: [poly(...around(8, ROOF, Math.PI / 8))],
    pattern: 'jade',
    solids: [
      { piece: 'jadeStump', x: 0, y: -98 },
      { piece: 'jadeStump', x: 98, y: 0 },
      { piece: 'jadeStump', x: -98, y: 0 },
      { piece: 'jadeStump', x: 0, y: 98 },
    ],
    boss: [0, -50],
    player: [0, 130],
  },
  phases: [
    {
      below: 1,
      steer: { kind: 'orbit', radius: 118, pace: 0.7 },
      patterns: [
        // Twister.
        { kind: 'ring', every: 4.6, count: 10, speed: 66, radius: 5, damage: 11, visual: 'aero' },
        // Dragon Pulse.
        { kind: 'volley', every: 4.2, count: 3, arc: 0.35, speed: 120, windup: 0.9, radius: 5, damage: 13, visual: 'dragon' },
        airSlash(2, 6.2),
        // Extreme Speed: one pass from off the roof.
        { kind: 'swoop', every: 9.5, windup: 1.1, speed: 380, width: 24, damage: 18, count: 1, reach: 260 },
        { kind: 'summon', every: 12, enemies: ['swablu', 'bagon'], count: 2, max: 3, radius: 60, role: 'runner' },
      ],
      ultimate: {
        move: 'Hyper Beam',
        first: 8,
        every: 22,
        // One huge beam sweeping across the roof: its arc shows, behind Rayquaza is safe.
        steps: [{ at: 0, pattern: { kind: 'beam', every: 0, source: 'boss', count: 1, spread: 0, sweep: 2, windup: 1.8, duration: 2, width: 22, length: 420, damage: 24, visual: 'dragon' } }],
      },
    },
    {
      below: 0.68,
      shift: 2.4,
      steer: { kind: 'orbit', radius: 140, pace: 0.85 },
      arena: [CORNERS],
      patterns: [
        { kind: 'swoop', every: 8, windup: 1, speed: 400, width: 24, damage: 18, count: 2, reach: 260 },
        { kind: 'strikes', every: 5.2, target: 'player', count: 4, spread: 0, radius: 16, delay: 1.2, damage: 15, visual: 'dragon', lead: 1 },
        { kind: 'ring', every: 5, count: 12, speed: 66, radius: 5, damage: 11, visual: 'aero' },
        airSlash(3, 6.5),
        { kind: 'summon', every: 16, enemies: ['altaria', 'salamence'], count: 2, max: 2, radius: 70, role: 'runner' },
      ],
      ultimate: {
        move: 'Draco Meteor',
        first: 7,
        every: 21,
        steps: [
          { at: 0, pattern: meteors(9, 1.4) },
          { at: 1.2, pattern: meteors(9, 1.3) },
          { at: 2.4, pattern: { kind: 'strikes', every: 0, target: 'player', count: 3, spread: 0, radius: 18, delay: 1.2, damage: 18, visual: 'dragon', lead: 1 } },
          { at: 3.4, pattern: meteors(10, 1.3) },
        ],
      },
    },
    {
      below: 0.34,
      shift: 3,
      form: 'mega',
      steer: { kind: 'orbit', radius: 125, pace: 1 },
      arena: [EDGES],
      patterns: [
        { kind: 'swoop', every: 7.5, windup: 0.95, speed: 420, width: 26, damage: 20, count: 2, reach: 270 },
        // It flies up out of sight and crashes down where its shadow stops.
        { kind: 'dive', every: 10, hide: 1.4, windup: 0.9, radius: 30, damage: 22, visual: 'dragon' },
        { kind: 'beam', every: 13, source: 'boss', count: 1, spread: 0, sweep: 1.6, windup: 1.6, duration: 1.6, width: 20, length: 380, damage: 20, visual: 'dragon' },
        { kind: 'ring', every: 4.6, count: 16, speed: 70, radius: 5, damage: 12, visual: 'aero' },
        { kind: 'strikes', every: 5.5, target: 'player', count: 4, spread: 0, radius: 16, delay: 1.2, damage: 15, visual: 'dragon', lead: 1 },
      ],
      ultimate: {
        move: 'Dragon Ascent',
        first: 6,
        every: 20,
        steps: [
          { at: 0, pattern: { kind: 'dive', every: 0, hide: 1.6, windup: 1, radius: 36, damage: 26, visual: 'dragon' } },
          { at: 3, pattern: { kind: 'dive', every: 0, hide: 1, windup: 0.9, radius: 36, damage: 26, visual: 'dragon' } },
          { at: 5.4, pattern: { kind: 'swoop', every: 0, windup: 1, speed: 440, width: 28, damage: 22, count: 2, reach: 280 } },
          { at: 10.4, pattern: { kind: 'ring', every: 0, count: 20, speed: 72, radius: 5, damage: 13, visual: 'aero' } },
        ],
      },
    },
  ],
}
