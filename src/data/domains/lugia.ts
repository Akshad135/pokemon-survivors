import { PIN_SHARE } from './kit'
import { circle, lane } from '../arenas'
import type { BossPattern } from '../bosses'
import type { LegendDomain } from '../domains'

/**
 * Lugia's domain: the Whirl Islands in a storm. The crossing hops north
 * across rocky islets joined by causeways, whirlpools churning the surf
 * beside the way and dragging whoever strays too close (`LUGIA_WHIRLPOOLS`,
 * `game/lugiaDomain.ts`),
 * with Tentacool, Tentacruel, Mantine and Wingull coming at the player and a
 * storm surge rising behind, the open sea all around. Then the heart of the
 * islands: a round stone floor around the deep pool it bursts out of, rocks
 * for cover. Its rain owns the domain (Water ×1.5).
 *
 * The battle: (1) from its pool, gusts that shove, and Aeroblast, a beam that
 * sweeps the whole floor and only the rocks shade; (2) the sea rises around
 * the floor, whirlpools open where the player stands, it circles and charges
 * (Dragon Rush), and Hurricane, a huge vortex the player must walk out of;
 * (3) it takes to the sky and flies over the floor in passes, gusts raining
 * down behind it, and Sky Attack dive-bombs the player three times.
 */

const R = 190

/** Rocks on Lugia's floor: the only shade from Aeroblast. */
const ROCKS = [
  [-108, -52],
  [108, -52],
  [-120, 64],
  [120, 64],
  [0, 128],
] as const

/** Whirlpools sitting to one side of the crossing's channels (domain px), the other side clear: the eye's radius, how far they pull, and how hard. */
export const LUGIA_WHIRLPOOLS = [
  { x: 59, y: -137, r: 8, reach: 44, pull: 24 },
  { x: 42, y: -463, r: 8, reach: 44, pull: 26 },
  { x: -32, y: -781, r: 8, reach: 42, pull: 26 },
  { x: 48, y: -826, r: 8, reach: 40, pull: 24 },
  { x: 33, y: -1090, r: 8, reach: 44, pull: 28 },
  { x: -34, y: -1398, r: 8, reach: 44, pull: 28 },
] as const

/** Gusts (Whirlwind): a fan that shoves the player along its flight. */
const gusts = (every: number, count: number, arc: number, push: number): BossPattern => ({
  kind: 'gust', every, count, arc, speed: 92, windup: 0.9, radius: 7, reach: 18, push, damage: 12, visual: 'aero',
})

/** A strike on the spot the player stands on, landing a beat later: harmless to a moving player, deadly to one standing still (water is written lower: the rain boosts it). */
const pin = (every: number, visual: 'water' | 'aero'): BossPattern => ({ kind: 'strikes', every, target: 'player', count: 1, spread: 0, radius: 14, delay: 0.95, damage: visual === 'water' ? 14 : 18, visual, share: PIN_SHARE })

/** Sky Attack: Lugia climbs out of sight and dives onto where the player stands, its shadow growing. */
const skyAttack: BossPattern = { kind: 'teleport', every: 0, to: 'player', windup: 1.35, radius: 32, damage: 28, visual: 'aero' }

export const LUGIA_DOMAIN: LegendDomain = {
  omen: { weather: 'rain', sky: 'storm' },
  backdrop: 'sea',
  entrance: 'rise',
  music: 'lugia',
  hp: 1.4,
  battleTime: 180,
  crossing: {
    // Islets climbing north, joined by causeways with a whirlpool beside each.
    floor: [
      circle(0, 0, 70),
      lane([0, -40], [60, -250], 116),
      circle(70, -292, 82),
      lane([70, -340], [-40, -560], 112),
      circle(-48, -604, 92),
      lane([-48, -660], [40, -880], 124),
      circle(40, -924, 80),
      lane([40, -980], [-30, -1180], 112),
      circle(-30, -1232, 96),
      lane([-30, -1300], [20, -1480], 108),
      circle(20, -1522, 80),
      lane([20, -1570], [0, -1886], 76),
    ],
    holes: [circle(-48, -612, 22)],
    // Surf churns around each whirlpool (slow); the rest of the way is rock.
    shallow: [...LUGIA_WHIRLPOOLS.map((w) => circle(w.x, w.y, w.reach + 8)), circle(-48, -612, 40)],
    islands: [circle(0, 0, 66), circle(70, -292, 78), circle(-48, -604, 88), circle(40, -924, 76), circle(-30, -1232, 92), circle(20, -1522, 76)],
    pattern: 'rings',
    solids: [
      { piece: 'seaRock', x: -36, y: 20 },
      { piece: 'seaRock', x: 104, y: -270 },
      { piece: 'seaRock', x: 30, y: -310 },
      { piece: 'seaRock', x: -110, y: -590 },
      { piece: 'seaRock', x: 4, y: -640 },
      { piece: 'seaRock', x: 76, y: -944 },
      { piece: 'seaRock', x: -84, y: -1208 },
      { piece: 'seaRock', x: 22, y: -1262 },
      { piece: 'stalagmite', x: 60, y: -1540 },
      { piece: 'stalagmite', x: -16, y: -1500 },
      { piece: 'stalagmite', x: 30, y: -1700 },
    ],
    start: [0, 18],
    gate: -1856,
    threat: { kind: 'storm', start: 150, stop: -1800, delay: 2.5, speed: 29, rush: 2.4, gap: 170, damage: 0.05, every: 0.5, push: 34 },
    retinue: {
      first: 1.5,
      every: 2.6,
      count: 1,
      max: 5,
      members: [
        { id: 'wingull', weight: 3, role: 'runner' },
        { id: 'tentacool', weight: 3 },
        { id: 'tentacruel', weight: 1, role: 'spitter' },
        { id: 'mantine', weight: 1, role: 'elite' },
      ],
    },
    theme: 'cave',
  },
  arena: {
    at: [0, -2030],
    floor: [circle(0, 0, R)],
    holes: [circle(0, -44, 54)],
    shallow: [circle(-64, 120, 20), circle(80, -128, 18)],
    pattern: 'rings',
    solids: ROCKS.map(([x, y]) => ({ piece: 'seaRock', x, y })),
    boss: [0, -44],
    player: [0, 112],
  },
  phases: [
    {
      below: 1,
      steer: { kind: 'anchor', x: 0, y: 0, drift: 26, pace: 0.5 },
      patterns: [
        // Hydro Pump drops where the player stands: moving dodges them, standing still eats every one.
        pin(2.6, 'water'),
        gusts(5.5, 3, 0.7, 70),
        // Aeroblast, the lesser one: a sweep through the player that the rocks shade.
        { kind: 'beam', every: 9.8, source: 'boss', count: 1, spread: 0, sweep: 1.2, windup: 1.1, duration: 1.1, width: 12, length: 380, damage: 14, visual: 'aero', blocked: true },
        { kind: 'ring', every: 5.5, count: 12, speed: 58, radius: 5, damage: 12, visual: 'water' },
        { kind: 'strikes', every: 6.4, target: 'player', count: 3, spread: 0, radius: 14, delay: 1.1, damage: 12, visual: 'water', lead: 1 },
        { kind: 'summon', every: 12, enemies: ['tentacool'], count: 1, max: 2, radius: 70 },
      ],
      ultimate: {
        move: 'Aeroblast',
        first: 8,
        every: 22,
        steps: [{ at: 0, pattern: { kind: 'beam', every: 0, source: 'boss', count: 1, spread: 0, sweep: 3.4, windup: 1.7, duration: 2.6, width: 24, length: 440, damage: 26, visual: 'aero', blocked: true } }],
      },
    },
    {
      below: 0.66,
      shift: 2.2,
      steer: { kind: 'orbit', radius: 118, pace: 0.65 },
      // The sea rises around the floor: a ring of rough water, the middle and the rocks dry.
      arena: [{ kind: 'flood', at: 0, warn: 2.8, area: [circle(0, 0, R + 4)], spare: [circle(0, 0, 112), ...ROCKS.map(([x, y]) => circle(x, y + 2, 24))] }],
      patterns: [
        pin(2.6, 'aero'),
        { kind: 'whirlpool', every: 8, target: 'player', count: 2, spread: 90, radius: 10, reach: 62, pull: 32, windup: 1.2, ttl: 5, damage: 12, visual: 'water' },
        gusts(5.1, 4, 0.9, 80),
        // Dragon Rush: it marks its lane and charges through, twice.
        { kind: 'dash', every: 10.3, windup: 1, speed: 250, width: 26, damage: 18, count: 2 },
        { kind: 'ring', every: 6, count: 14, speed: 60, radius: 5, damage: 14, visual: 'aero' },
      ],
      ultimate: {
        move: 'Hurricane',
        first: 7,
        every: 21,
        steps: [
          { at: 0, pattern: { kind: 'whirlpool', every: 0, target: 'self', count: 1, spread: 0, radius: 24, reach: 320, pull: 42, windup: 1.4, ttl: 5.2, damage: 26, visual: 'aero' } },
          { at: 2.2, pattern: { kind: 'ring', every: 0, count: 14, speed: 54, radius: 5, damage: 14, visual: 'aero' } },
          { at: 4, pattern: { kind: 'ring', every: 0, count: 14, speed: 54, radius: 5, damage: 14, visual: 'aero' } },
        ],
      },
    },
    {
      below: 0.33,
      shift: 2.6,
      // Aloft: passes over the floor, gusts raining down behind it.
      steer: { kind: 'pass', reach: 150, every: 2.8, pace: 1.6 },
      arena: [{ kind: 'flood', at: 0, warn: 2.4, area: [circle(0, 0, R + 4)], spare: [circle(0, 0, 96), ...ROCKS.map(([x, y]) => circle(x, y + 2, 22))] }],
      patterns: [
        pin(2.6, 'water'),
        { kind: 'strikes', every: 0.42, target: 'self', count: 1, spread: 0, radius: 15, delay: 1, damage: 16, visual: 'aero' },
        gusts(4.4, 5, 1.2, 80),
        { kind: 'whirlpool', every: 10.3, target: 'player', count: 1, spread: 0, radius: 10, reach: 60, pull: 32, windup: 1.2, ttl: 4.5, damage: 12, visual: 'water' },
        { kind: 'ring', every: 6.4, count: 16, speed: 62, radius: 5, damage: 12, visual: 'water' },
      ],
      ultimate: {
        move: 'Sky Attack',
        first: 6,
        every: 20,
        steps: [
          { at: 0, pattern: skyAttack },
          { at: 1.8, pattern: skyAttack },
          { at: 3.6, pattern: skyAttack },
          { at: 5.1, pattern: { kind: 'ring', every: 0, count: 20, speed: 66, radius: 5, damage: 15, visual: 'aero' } },
        ],
      },
    },
  ],
}
