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
  thrash: ['growl', 300],
  doubleKick: ['kick', 200],
  mudShot: ['splat', 150],
  woodHammer: ['hammer', 200],
  drillPeck: ['drill', 150],
  leafTornado: ['whirl', 300],
  flameCharge: ['charge', 250],
  needleArm: ['quills', 250],
  psybeam: ['psybeam', 200],
  darkestLariat: ['lariat', 400],
  sparklingAria: ['aria', 300],
  snipeShot: ['snipe', 120],
  flowerTrick: ['flower', 150],
  aquaStep: ['splash', 200],
  leafBlade: ['crit', 200],
  ragingFury: ['furyNova', 250],
  seedFlare: ['seedFlare', 300],
  waterSpout: ['spout', 200],
  electroDrift: ['drift', 200],
  sludgeWave: ['sludge', 250],
  explosion: ['bigBoom', 400],
  oblivionWing: ['oblivion', 250],
  skyUppercut: ['uppercut', 120],
  gearGrind: ['grind', 250],
  kowtowCleave: ['cleave', 150],
  hyperspaceHole: ['hyperspace', 150],
  thousandArrows: ['arrows', 250],
  stoneAxe: ['axe', 150],
  firstImpression: ['impression', 300],
  breakingSwipe: ['swipe', 250],
  glacialLance: ['lance', 200],
}
