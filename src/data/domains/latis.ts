import { circle, lane } from '../arenas'
import type { BossPattern } from '../bosses'
import type { LegendDomain } from '../domains'

/**
 * The Eon duo's domain, Latias's rift with Latios at her side (`partner`):
 * Southern Island dreamed as a garden, crossed north through flowered glades
 * ahead of a rolling dream fog, with Swablu, Natu, Chimecho and Altaria in the
 * way and mirages of the pair swooping across the path (`game/latisHooks.ts`).
 * Then the island's heart, a meadow ringed by palms over the night sea, where
 * the two swoop in out of invisibility.
 *
 * The battle, one pool of HP for both (the bar shows each one's share):
 * (1) they circle the meadow on opposite sides, Latias leaving a ring of mist
 * and Latios firing Luster Purge, and their ultimate crosses Mist Ball and
 * Luster Purge lances into a lattice: only its pockets are safe; (2) the dream
 * breaks, the sea floods the meadow into islands and phantom copies of the
 * pair streak through the player (Double Team, a ring of them); (3) both Mega
 * Evolve, and Latias's Mist is the only shelter from Draco Meteor.
 * Knock one out and the other fights on enraged; leave it too long and it
 * brings its sibling back with Heal Pulse, once.
 */

const R = 196

/** Palms around the meadow: cover from Luster Purge, each on an island once the sea floods in. */
const PALMS = [
  [-118, -70],
  [118, -70],
  [-136, 52],
  [136, 52],
  [0, -150],
  [-56, 146],
  [56, 146],
] as const

/** The flooded meadow's islands: one under each palm and three in the middle. */
const islands = (r: number) => [...PALMS.map(([x, y]) => circle(x, y + 2, r)), circle(0, 0, r + 6), circle(-64, -6, r - 6), circle(64, -6, r - 6)]

/** Mist Ball and Luster Purge crossed: red lances one way, blue the other, the pockets between them the safe spots. */
const lattice = (windup: number, cross: 'mist' | 'luster' = 'luster', visual: 'mist' | 'luster' = 'mist'): BossPattern => ({
  kind: 'beam', every: 0, source: 'lattice', count: 5, spread: 58, windup, duration: 0.45, width: 16, length: 600, damage: 24, visual, cross,
})

/** Double Team: a ring of phantoms around the player, streaking through them one after another. */
const doubleTeam = (visual: 'mist' | 'luster'): BossPattern => ({
  kind: 'swoop', every: 0, origin: 'ring', count: 6, gap: 0.42, windup: 1.4, speed: 300, width: 18, radius: 130, damage: 21, visual,
})

const swoopAt = (every: number, visual: 'mist' | 'luster'): BossPattern => ({
  kind: 'swoop', every, origin: 'boss', count: 2, gap: 0.4, windup: 1, speed: 270, width: 18, radius: 110, damage: 15, visual,
})

export const LATIS_DOMAIN: LegendDomain = {
  omen: { weather: 'fog', sky: 'mist' },
  backdrop: 'space',
  entrance: 'swoop',
  music: 'latis',
  hp: 0.9,
  battleTime: 200,
  crossing: {
    // Six glades climbing north through the dream, joined by flowered paths; the third holds a dream pond.
    floor: [
      circle(0, 0, 70),
      lane([0, -30], [-50, -252], 86),
      circle(-50, -292, 90),
      lane([-50, -350], [40, -560], 80),
      circle(40, -612, 98),
      lane([40, -680], [-30, -884], 80),
      circle(-30, -932, 86),
      lane([-30, -990], [30, -1200], 78),
      circle(30, -1252, 100),
      lane([30, -1322], [-20, -1520], 80),
      circle(-20, -1562, 86),
      lane([-20, -1612], [0, -1900], 74),
    ],
    holes: [circle(40, -616, 26)],
    shallow: [circle(-94, -300, 22), circle(96, -1240, 26), circle(-60, -940, 18)],
    islands: [],
    pattern: 'garden',
    solids: [
      { piece: 'palm', x: -44, y: 26 },
      { piece: 'palm', x: 46, y: -10 },
      { piece: 'palm', x: -100, y: -276 },
      { piece: 'palm', x: 2, y: -318 },
      { piece: 'palm', x: 104, y: -630 },
      { piece: 'palm', x: -24, y: -590 },
      { piece: 'palm', x: -76, y: -954 },
      { piece: 'palm', x: 16, y: -914 },
      { piece: 'palm', x: -26, y: -1240 },
      { piece: 'palm', x: 84, y: -1276 },
      { piece: 'palm', x: -64, y: -1576 },
      { piece: 'palm', x: 30, y: -1548 },
    ],
    start: [0, 18],
    gate: -1862,
    threat: { kind: 'mist', start: 150, stop: -1800, delay: 2.5, speed: 30, rush: 2.4, gap: 170, damage: 0.05, every: 0.5, push: 34 },
    retinue: {
      first: 1.5,
      every: 3.2,
      count: 2,
      max: 8,
      members: [
        { id: 'swablu', weight: 5, role: 'runner' },
        { id: 'natu', weight: 2, role: 'runner' },
        { id: 'chimecho', weight: 2, role: 'spitter' },
        { id: 'altaria', weight: 1, role: 'elite' },
      ],
    },
    theme: 'forest',
  },
  arena: {
    at: [0, -2064],
    floor: [circle(0, 0, R)],
    shallow: [circle(-150, -118, 26), circle(152, -110, 22), circle(0, 178, 20)],
    pattern: 'garden',
    solids: PALMS.map(([x, y]) => ({ piece: 'palm', x, y })),
    boss: [-92, -12],
    player: [0, 168],
  },
  phases: [
    {
      below: 1,
      steer: { kind: 'orbit', radius: 124, keep: 56, pace: 0.55 },
      patterns: [
        // Mist Ball: slow red orbs, and a ring of mist where she glides.
        { kind: 'trail', every: 0.32, ttl: 2.4, radius: 7, damage: 12, visual: 'mist' },
        { kind: 'volley', every: 5.4, count: 3, arc: 0.5, speed: 82, windup: 1, radius: 7, damage: 14, visual: 'mist' },
        { kind: 'strikes', every: 5.2, target: 'player', count: 3, spread: 0, radius: 14, delay: 1.1, damage: 15, visual: 'mist', lead: 1 },
        { kind: 'summon', every: 13, enemies: ['swablu'], count: 2, max: 3, radius: 60, role: 'runner' },
      ],
      ultimate: { move: 'Mist Ball + Luster Purge', first: 8, every: 21, steps: [{ at: 0, pattern: lattice(1.7) }, { at: 2.3, pattern: lattice(1.5) }] },
    },
    {
      below: 0.66,
      shift: 2.2,
      steer: { kind: 'orbit', radius: 140, keep: 56, pace: 0.75 },
      arena: [{ kind: 'flood', at: 0, warn: 2.8, area: [circle(0, 0, R + 4)], spare: islands(28) }],
      patterns: [
        swoopAt(6.6, 'mist'),
        { kind: 'strikes', every: 3.8, target: 'self', count: 1, spread: 0, radius: 36, delay: 0.9, damage: 22, visual: 'dragon' },
        { from: 'hard', kind: 'volley', every: 5.2, count: 4, arc: 0.6, speed: 90, windup: 1, radius: 7, damage: 14, visual: 'mist' },
        { kind: 'trail', every: 0.36, ttl: 2.2, radius: 7, damage: 12, visual: 'mist' },
      ],
      ultimate: { move: 'Double Team', first: 6, every: 20, steps: [{ at: 0, pattern: doubleTeam('mist') }, { at: 3.6, pattern: doubleTeam('luster') }] },
    },
    {
      below: 0.33,
      shift: 2.6,
      form: 'mega',
      steer: { kind: 'orbit', radius: 120, keep: 56, pace: 0.85 },
      arena: [{ kind: 'flood', at: 0, warn: 2.4, area: [circle(0, 0, R + 4)], spare: islands(22) }],
      patterns: [
        swoopAt(6, 'mist'),
        { kind: 'strikes', every: 3.8, target: 'self', count: 1, spread: 0, radius: 36, delay: 0.9, damage: 22, visual: 'dragon' },
        { from: 'hard', kind: 'ring', every: 5, count: 12, speed: 66, radius: 6, damage: 12, visual: 'mist' },
        { kind: 'volley', every: 5.6, count: 5, arc: 0.8, speed: 95, windup: 0.9, radius: 7, damage: 14, visual: 'mist' },
        { kind: 'trail', every: 0.36, ttl: 2.2, radius: 7, damage: 12, visual: 'mist' },
      ],
      // Draco Meteor rains on everything but the Mist she leaves where she cast it; then the lattice again.
      ultimate: {
        move: 'Draco Meteor',
        first: 5,
        every: 19,
        steps: [
          { at: 0, pattern: { kind: 'blast', every: 0, windup: 2.6, damage: 30, safe: 'near', radius: 58, visual: 'dragon' } },
          { at: 3.4, pattern: lattice(1.4) },
        ],
      },
    },
  ],
  partner: {
    id: 'latios',
    at: [92, -12],
    revive: { after: 16, warn: 3, hp: 0.35, move: 'Heal Pulse' },
    phases: [
      {
        below: 1,
        steer: { kind: 'mirror', radius: 124, keep: 56, pace: 0.8 },
        patterns: [
          // Dragon Claw where it passes: standing in its way doesn't pay.
          { kind: 'strikes', every: 3.4, target: 'self', count: 1, spread: 0, radius: 36, delay: 0.9, damage: 22, visual: 'dragon' },
          // Luster Purge: a blue beam the palms stop, and fast rings.
          { kind: 'beam', every: 5.8, source: 'boss', count: 1, spread: 0, windup: 1.1, duration: 0.5, width: 12, length: 380, damage: 18, visual: 'luster', blocked: true },
          { kind: 'ring', every: 5.6, count: 10, speed: 72, radius: 5, damage: 12, visual: 'luster' },
          { from: 'hard', kind: 'strikes', every: 7, target: 'player', count: 2, spread: 40, radius: 16, delay: 1.1, damage: 13, visual: 'dragon' },
        ],
      },
      {
        below: 0.66,
        shift: 2.2,
        steer: { kind: 'mirror', radius: 140, keep: 56, pace: 1 },
        patterns: [
          // Dragon Claw where it passes: standing in its way doesn't pay.
          { kind: 'strikes', every: 3.4, target: 'self', count: 1, spread: 0, radius: 36, delay: 0.9, damage: 22, visual: 'dragon' },
          { kind: 'beam', every: 6.4, source: 'boss', count: 2, spread: 0.5, windup: 1.1, duration: 0.5, width: 12, length: 380, damage: 18, visual: 'luster', blocked: true },
          swoopAt(7.6, 'luster'),
          { kind: 'ring', every: 5.6, count: 12, speed: 74, radius: 5, damage: 12, visual: 'luster' },
        ],
        // Alone (Latias knocked out), his own lattice.
        ultimate: { move: 'Luster Purge', first: 6, every: 18, steps: [{ at: 0, pattern: lattice(1.6, 'luster', 'luster') }, { at: 2.2, pattern: lattice(1.4, 'luster', 'luster') }] },
      },
      {
        below: 0.33,
        shift: 2.6,
        form: 'mega',
        steer: { kind: 'mirror', radius: 120, keep: 56, pace: 1.1 },
        patterns: [
          // Dragon Claw where it passes: standing in its way doesn't pay.
          { kind: 'strikes', every: 3.4, target: 'self', count: 1, spread: 0, radius: 36, delay: 0.9, damage: 22, visual: 'dragon' },
          { kind: 'beam', every: 8, source: 'boss', count: 1, spread: 0, sweep: 1.6, windup: 1.2, duration: 1.6, width: 12, length: 320, damage: 14, visual: 'luster' },
          { kind: 'strikes', every: 5.2, target: 'player', count: 4, spread: 0, radius: 14, delay: 1.1, damage: 13, visual: 'dragon', lead: 1 },
          swoopAt(7, 'luster'),
        ],
        // Alone, his Draco Meteor spares only those who keep away from him.
        ultimate: {
          move: 'Draco Meteor',
          first: 5,
          every: 18,
          steps: [
            { at: 0, pattern: { kind: 'blast', every: 0, windup: 2.6, damage: 30, safe: 'far', radius: 100, visual: 'dragon' } },
            { at: 3.4, pattern: lattice(1.4, 'luster', 'luster') },
          ],
        },
      },
    ],
  },
}
