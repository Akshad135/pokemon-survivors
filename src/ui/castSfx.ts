import type { Sfx } from '../engine/audio'
import type { MoveId } from '../game/moves'

/**
 * The moves with a sound of their own when they go off (a `cast` event from
 * the simulation, see `GameEvent`), with the shortest gap in ms between two
 * plays. Most moves stay quiet and let their hits speak.
 */
export const CAST_SFX: Partial<Record<MoveId, readonly [Sfx, number]>> = {
  leechSeed: ['seedPop', 120],
  rapidSpin: ['spin', 200],
  petalDance: ['petals', 200],
  eruption: ['eruption', 250],
  thrash: ['thrashGrowl', 300],
  doubleKick: ['kick', 200],
  mudShot: ['splat', 150],
  woodHammer: ['hammer', 200],
  drillPeck: ['drill', 150],
  leafTornado: ['whirl', 300],
  flameCharge: ['flameRush', 250],
  needleArm: ['quills', 250],
  psybeam: ['psybeam', 200],
  darkestLariat: ['lariat', 400],
  sparklingAria: ['aria', 300],
  snipeShot: ['snipe', 120],
  flowerTrick: ['flower', 150],
  aquaStep: ['splash', 200],
  leafBlade: ['crit', 200],
  whirlwind: ['cyclone', 400],
  sacredFire: ['phoenix', 300],
  originPulse: ['originPulse', 300],
  scorchingSands: ['sands', 250],
  dragonAscent: ['ascent', 300],
  roarOfTime: ['roarOfTime', 500],
  mistBall: ['mist', 250],
  lusterPurge: ['lusterPurge', 250],
  psychoBoost: ['psychoBoost', 300],
  wish: ['wish', 300],
  ancientPower: ['ancientBoost', 300],
  magicalLeaf: ['leaves', 200],
}
