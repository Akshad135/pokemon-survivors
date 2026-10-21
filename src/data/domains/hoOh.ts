import { PIN_SHARE } from './kit'
import { around, circle, lane, poly, type Pt } from '../arenas'
import type { BossPattern } from '../bosses'
import type { LegendDomain } from '../domains'

/**
 * Ho-Oh's domain: the Bell Tower on fire. The crossing climbs it floor by
 * floor, octagonal halls joined by narrow stairs, with the fire rising from
 * below, burning beams falling from the ceiling and the flames spreading
 * where they land (`game/hoOhDomain.ts`); Houndour, Ponyta, Magmar and
 * Houndoom come down the stairs. Then the roof under the night sky, where
 * Ho-Oh lands. Its sun owns the domain (Fire ×1.5, Water ×0.75): its fire
 * hits that much harder, so its numbers here are written lower.
 *
 * The battle: (1) from the roof's north side, Sacred Fire columns along the
 * player's path, and Sacred Fire itself, a firestorm only the spot under its
 * wings is spared from; (2) it takes off and circles low leaving burning
 * trails, and charges (Brave Bird twice in a row as its ultimate); (3) it
 * falls, bursts into flames and is REBORN from its ashes
 * (`BossPhase.rebirth`) with 40% of its HP: the roof's edge catches fire
 * but for four cool spots, and Burn Up spares only those far from it (on
 * those spots, or burning).
 */

const R = 184

/** A regular octagon (one of the tower's halls) of radius `r` around (cx, cy). */
const octagon = (cx: number, cy: number, r: number) => poly(...around(8, r, Math.PI / 8).map(([x, y]): Pt => [x + cx, y + cy]))

/** The roof's pillars: cover from Sacred Fire's columns and Burn Up's rings. */
const PILLARS = [
  [-86, -66],
  [86, -66],
  [-86, 70],
  [86, 70],
] as const

/** Cool spots on the roof's rim, far from its middle: where Burn Up spares the player. */
const RIM = around(4, 146, Math.PI / 4)

/** Sacred Fire columns along the player's path. */
const columns = (every: number, count: number, delay = 1.15): BossPattern => ({
  kind: 'strikes', every, target: 'player', count, spread: 0, radius: 15, delay, damage: 13, visual: 'fire', lead: 1,
})

/** A Sacred Fire column on the spot the player stands on, a beat later: harmless to a moving player, deadly to one standing still. */
const pin = (every: number): BossPattern => ({ kind: 'strikes', every, target: 'player', count: 1, spread: 0, radius: 15, delay: 0.95, damage: 14, visual: 'fire', share: PIN_SHARE })

const braveBird: BossPattern = { kind: 'dash', every: 0, windup: 1.1, speed: 270, width: 26, damage: 16, count: 2 }

export const HO_OH_DOMAIN: LegendDomain = {
  omen: { weather: 'sun', sky: 'embers' },
  backdrop: 'space',
  entrance: 'descend',
  music: 'hoOh',
  hp: 1,
  battleTime: 180,
  crossing: {
    // Six halls climbing north, the stairs between them switching sides.
    floor: [
      octagon(0, 0, 92),
      lane([0, -40], [0, -260], 56),
      octagon(0, -300, 100),
      lane([44, -340], [44, -570], 54),
      octagon(0, -610, 100),
      lane([-44, -650], [-44, -880], 54),
      octagon(0, -920, 100),
      lane([44, -960], [44, -1190], 54),
      octagon(0, -1230, 100),
      lane([-44, -1270], [-44, -1500], 54),
      octagon(0, -1540, 96),
      lane([0, -1580], [0, -1850], 60),
    ],
    pattern: 'planks',
    solids: [
      { piece: 'redPillar', x: -52, y: -30 },
      { piece: 'redPillar', x: 52, y: -30 },
      { piece: 'redPillar', x: -60, y: -280 },
      { piece: 'redPillar', x: 30, y: -320 },
      { piece: 'redPillar', x: -40, y: -590 },
      { piece: 'redPillar', x: 50, y: -640 },
      { piece: 'bell', x: 0, y: -920 },
      { piece: 'redPillar', x: -56, y: -1210 },
      { piece: 'redPillar', x: 40, y: -1250 },
      { piece: 'redPillar', x: -40, y: -1560 },
      { piece: 'redPillar', x: 50, y: -1520 },
    ],
    start: [0, 30],
    gate: -1800,
    threat: { kind: 'fire', start: 160, stop: -1750, delay: 2.5, speed: 30, rush: 2.4, gap: 170, damage: 0.05, every: 0.5, push: 34 },
    retinue: {
      first: 1.5,
      every: 3.2,
      count: 1,
      max: 4,
      members: [
        { id: 'houndour', weight: 3, role: 'runner' },
        { id: 'ponyta', weight: 3 },
        { id: 'magmar', weight: 2, role: 'spitter' },
        { id: 'houndoom', weight: 1, role: 'elite' },
      ],
    },
    theme: 'tower',
  },
  arena: {
    at: [0, -1990],
    floor: [octagon(0, 0, R)],
    pattern: 'planks',
    solids: [...PILLARS.map(([x, y]) => ({ piece: 'redPillar' as const, x, y })), { piece: 'bell', x: 0, y: 34 }],
    boss: [0, -70],
    player: [0, 118],
  },
  phases: [
    {
      below: 1,
      steer: { kind: 'anchor', x: 0, y: -10, drift: 26, pace: 0.5 },
      patterns: [
        pin(2.6),
        columns(4.8, 4),
        { kind: 'ring', every: 5.5, count: 12, speed: 58, radius: 5, damage: 12, visual: 'fire' },
        { kind: 'volley', every: 6.4, count: 5, arc: 0.9, speed: 100, windup: 0.9, radius: 5, damage: 11, visual: 'fire' },
        { kind: 'summon', every: 12, enemies: ['houndour'], count: 1, max: 2, radius: 70 },
      ],
      // Sacred Fire: the roof erupts; only the spot under its wings is spared.
      ultimate: { move: 'Sacred Fire', first: 8, every: 22, steps: [{ at: 0, pattern: { kind: 'blast', every: 0, windup: 2.5, damage: 28, safe: 'near', radius: 58, visual: 'fire' } }] },
    },
    {
      below: 0.55,
      shift: 2.2,
      steer: { kind: 'orbit', radius: 96, pace: 0.75 },
      patterns: [
        pin(2.6),
        { kind: 'trail', every: 0.2, ttl: 3.2, radius: 7, damage: 10, visual: 'fire' },
        { kind: 'dash', every: 9.8, windup: 1.1, speed: 250, width: 24, damage: 13, count: 1 },
        columns(5.8, 3),
        { kind: 'volley', every: 6.9, count: 6, arc: 1.1, speed: 100, windup: 0.9, radius: 5, damage: 11, visual: 'fire' },
      ],
      ultimate: {
        move: 'Brave Bird',
        first: 7,
        every: 20,
        steps: [
          { at: 0, pattern: braveBird },
          { at: 4.2, pattern: { kind: 'ring', every: 0, count: 16, speed: 60, radius: 5, damage: 12, visual: 'fire' } },
        ],
      },
    },
    {
      // Reborn: it falls in the phase before, bursts into flames and comes back with 40% of its HP.
      below: 0,
      rebirth: 0.4,
      shift: 3.6,
      steer: { kind: 'anchor', x: 0, y: 0, drift: 40, pace: 0.7 },
      arena: [{ kind: 'lava', at: 0, warn: 3.2, area: [octagon(0, 0, R + 4)], spare: [circle(0, 0, 126), ...RIM.map(([x, y]) => circle(x, y, 32))] }],
      patterns: [
        pin(2.6),
        columns(4.4, 4),
        { kind: 'ring', every: 4.8, count: 16, speed: 60, radius: 5, damage: 12, visual: 'fire' },
        { kind: 'trail', every: 0.25, ttl: 2.6, radius: 7, damage: 10, visual: 'fire' },
        { kind: 'volley', every: 6, count: 7, arc: 1.2, speed: 105, windup: 0.9, radius: 5, damage: 12, visual: 'fire' },
      ],
      ultimate: {
        move: 'Burn Up',
        first: 6,
        every: 19,
        steps: [
          { at: 0, pattern: { kind: 'blast', every: 0, windup: 2.7, damage: 30, safe: 'far', radius: 118, visual: 'fire' } },
          { at: 3, pattern: { kind: 'ring', every: 0, count: 24, speed: 64, radius: 5, damage: 13, visual: 'fire' } },
        ],
      },
    },
  ],
}
