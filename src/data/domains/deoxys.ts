import { pin, PIN_EVERY } from './kit'
import { circle, lane } from '../arenas'
import type { BossPattern } from '../bosses'
import type { LegendDomain } from '../domains'

/**
 * Deoxys's domain: a meteoroid drifting in space, crossed north over rocks
 * joined by thin bridges of debris as it breaks apart behind the player, under
 * a meteor shower (`game/deoxysHooks.ts`), with Clefairy, Beldum, Solrock,
 * Lunatone and Metang in the way. Then the crater at its heart, where a
 * crystal meteor crashes down and Deoxys reforms out of it.
 *
 * The battle, a forme per phase, each with its own pace:
 * (1) Normal: it holds the crater, Psycho Boost beams the crystals stop, and
 *     Hyper Beam, a wide beam to sidestep or hide from;
 * (2) Attack, the glass cannon (a thin slice of its HP, and it takes 40%
 *     more damage): it keeps away and
 *     fires Psycho Boost barrages, fans of beams in quick waves;
 * (3) Defense: it barely moves, Solrock and Lunatone hold a barrier around it
 *     that takes every hit until they break, slow walls of shots, and Cosmic
 *     Power rains meteors on all but the inside of its barrier;
 * (4) Speed: it blitzes, dashing and teleporting onto the player, and Extreme
 *     Speed is five dashes in a row.
 */

const R = 194

/** Crystal clusters around the crater: cover from Psycho Boost and Hyper Beam. */
const CRYSTALS = [
  [-104, -64],
  [104, -64],
  [-126, 52],
  [126, 52],
  [-40, 130],
  [40, 130],
] as const

/** Psycho Boost barrage: a fan of beams out of Deoxys. */
const barrage = (windup: number): BossPattern => ({
  kind: 'beam', every: 0, source: 'boss', count: 5, spread: 0.3, windup, duration: 0.45, width: 11, length: 420, damage: 20, visual: 'psychic',
})

export const DEOXYS_DOMAIN: LegendDomain = {
  omen: { weather: 'clear', sky: 'meteors' },
  backdrop: 'space',
  entrance: 'meteor',
  music: 'deoxys',
  hp: 1.9,
  battleTime: 200,
  crossing: {
    // Seven rocks adrift, joined by narrow debris bridges, climbing north; craters to walk around.
    floor: [
      circle(0, 0, 72),
      lane([0, -40], [56, -240], 58),
      circle(60, -282, 84),
      lane([60, -340], [-40, -520], 54),
      circle(-50, -566, 92),
      lane([-50, -630], [30, -820], 56),
      circle(36, -868, 82),
      lane([36, -920], [-36, -1100], 52),
      circle(-40, -1150, 98),
      lane([-40, -1220], [24, -1410], 56),
      circle(26, -1460, 84),
      lane([26, -1520], [0, -1890], 60),
    ],
    holes: [circle(-46, -580, 26), circle(-24, -1162, 22), circle(54, -292, 16)],
    pattern: 'craters',
    solids: [
      { piece: 'meteorCrystal', x: -40, y: 22 },
      { piece: 'meteorCrystal', x: 44, y: -14 },
      { piece: 'meteorCrystal', x: 108, y: -300 },
      { piece: 'meteorCrystal', x: 20, y: -250 },
      { piece: 'meteorCrystal', x: -110, y: -560 },
      { piece: 'meteorCrystal', x: 10, y: -548 },
      { piece: 'meteorCrystal', x: 74, y: -880 },
      { piece: 'meteorCrystal', x: -8, y: -846 },
      { piece: 'meteorCrystal', x: -100, y: -1140 },
      { piece: 'meteorCrystal', x: 30, y: -1180 },
      { piece: 'meteorCrystal', x: 70, y: -1470 },
      { piece: 'meteorCrystal', x: -22, y: -1440 },
    ],
    start: [0, 18],
    gate: -1856,
    threat: { kind: 'void', start: 150, stop: -1800, delay: 2.5, speed: 30, rush: 2.4, gap: 170, damage: 0.05, every: 0.5, push: 34 },
    retinue: {
      first: 1.5,
      every: 3.2,
      count: 2,
      max: 8,
      members: [
        { id: 'clefairy', weight: 4 },
        { id: 'beldum', weight: 4, role: 'runner' },
        { id: 'solrock', weight: 2, role: 'spitter' },
        { id: 'lunatone', weight: 2, role: 'spitter' },
        { id: 'metang', weight: 1, role: 'elite' },
      ],
    },
    theme: 'tower',
  },
  arena: {
    at: [0, -2040],
    floor: [circle(0, 0, R), circle(-120, -96, 70), circle(124, -90, 66)],
    holes: [circle(-136, -110, 20), circle(140, -100, 16)],
    pattern: 'craters',
    solids: CRYSTALS.map(([x, y]) => ({ piece: 'meteorCrystal', x, y })),
    boss: [0, -24],
    player: [0, 118],
  },
  phases: [
    {
      below: 1,
      steer: { kind: 'anchor', x: 0, y: 0, drift: 30, pace: 0.6 },
      patterns: [
        pin('psychic', 16, PIN_EVERY),
        { kind: 'ring', every: 4.6, count: 12, speed: 62, radius: 5, damage: 12, visual: 'psychic' },
        { from: 'hard', kind: 'beam', every: 6.2, source: 'boss', count: 1, spread: 0, windup: 1.1, duration: 0.5, width: 12, length: 380, damage: 12, visual: 'psychic', blocked: true },
        { kind: 'strikes', every: 5, target: 'player', count: 3, spread: 0, radius: 15, delay: 1.2, damage: 13, visual: 'rock', lead: 1 },
        { kind: 'summon', every: 12, enemies: ['beldum'], count: 2, max: 3, radius: 64, role: 'runner' },
      ],
      // Hyper Beam: a wide beam, aimed twice; the crystals stop it.
      ultimate: {
        move: 'Hyper Beam',
        first: 8,
        every: 22,
        steps: [
          { at: 0, pattern: { kind: 'beam', every: 0, source: 'boss', count: 1, spread: 0, windup: 2.1, duration: 0.7, width: 34, length: 520, damage: 24, visual: 'psychic', blocked: true } },
          { at: 2.8, pattern: { kind: 'beam', every: 0, source: 'boss', count: 1, spread: 0, windup: 1.5, duration: 0.7, width: 34, length: 520, damage: 24, visual: 'psychic', blocked: true } },
        ],
      },
    },
    {
      below: 0.72,
      shift: 2,
      form: 'attack',
      taken: 1.4,
      steer: { kind: 'hold', range: 150, pace: 0.9 },
      patterns: [
        pin('psychic', 16, PIN_EVERY),
        { kind: 'volley', every: 2.9, count: 5, arc: 0.7, speed: 125, windup: 0.85, radius: 5, damage: 12, visual: 'psychic' },
        { kind: 'beam', every: 5, source: 'boss', count: 3, spread: 0.42, windup: 1, duration: 0.45, width: 10, length: 380, damage: 15, visual: 'psychic' },
        { from: 'hard', kind: 'strikes', every: 4.2, target: 'player', count: 4, spread: 0, radius: 13, delay: 1, damage: 14, visual: 'psychic', lead: 1 },
        { kind: 'teleport', every: 9, to: 'far', windup: 0.9, radius: 26, damage: 16, visual: 'psychic' },
      ],
      ultimate: {
        move: 'Psycho Boost',
        first: 5,
        every: 16,
        steps: [
          { at: 0, pattern: barrage(1.3) },
          { at: 1.4, pattern: barrage(1.1) },
          { at: 2.8, pattern: barrage(1.1) },
          { at: 4.2, pattern: { kind: 'ring', every: 0, count: 24, speed: 74, radius: 5, damage: 13, visual: 'psychic' } },
        ],
      },
    },
    {
      below: 0.5,
      shift: 2.4,
      form: 'defense',
      steer: { kind: 'anchor', x: 0, y: 0, drift: 10, pace: 0.3 },
      patterns: [
        pin('psychic', 16, PIN_EVERY),
        { kind: 'guard', every: 10, enemies: ['solrock', 'lunatone'], count: 3, radius: 72, hp: 2.2 },
        // Slow, dense walls of shots with a gap to slip through.
        { kind: 'ring', every: 3.8, count: 22, speed: 44, radius: 5, damage: 12, visual: 'psychic' },
        { kind: 'strikes', every: 4.6, target: 'player', count: 4, spread: 0, radius: 14, delay: 1.2, damage: 13, visual: 'rock', lead: 1 },
        { from: 'hard', kind: 'volley', every: 6, count: 3, arc: 0.4, speed: 100, windup: 1, radius: 6, damage: 14, visual: 'rock' },
      ],
      // Cosmic Power: meteors rain on all the crater but the inside of its barrier.
      ultimate: { move: 'Cosmic Power', first: 7, every: 20, steps: [{ at: 0, pattern: { kind: 'blast', every: 0, windup: 2.6, damage: 30, safe: 'near', radius: 62, visual: 'rock' } }] },
    },
    {
      below: 0.3,
      shift: 2,
      form: 'speed',
      steer: { kind: 'chase', pace: 1.3 },
      patterns: [
        pin('psychic', 16, PIN_EVERY),
        { kind: 'dash', every: 4.6, windup: 0.8, speed: 340, width: 20, damage: 17, count: 2 },
        { kind: 'teleport', every: 5.6, to: 'player', windup: 0.9, radius: 24, damage: 17, visual: 'psychic' },
        { kind: 'ring', every: 4.2, count: 14, speed: 80, radius: 5, damage: 12, visual: 'psychic' },
        { from: 'hard', kind: 'volley', every: 3.6, count: 3, arc: 0.3, speed: 140, windup: 0.85, radius: 5, damage: 12, visual: 'psychic' },
      ],
      ultimate: { move: 'Extreme Speed', first: 5, every: 17, steps: [{ at: 0, pattern: { kind: 'dash', every: 0, windup: 0.7, speed: 420, width: 22, damage: 19, count: 5 } }] },
    },
  ],
}
