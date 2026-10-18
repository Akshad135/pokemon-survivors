import type { Sfx } from '../engine/audio'
import type { MoveId } from '../game/moves'

/**
 * The sound of a move's `cast` event (`GameEvent`), with the gap that keeps a
 * fast move from turning into noise. Moves without an entry stay silent: their
 * hits already sound.
 */
const CAST_SOUNDS: Partial<Record<MoveId, readonly [Sfx, number]>> = {
  dreamEater: ['hypnosis', 300],
  dig: ['dig', 200],
  twister: ['whoosh', 400],
  sandTomb: ['sand', 400],
  bodySlam: ['leap', 200],
  dynamicPunch: ['windup', 300],
  rollout: ['roll', 400],
  sacredSword: ['shing', 200],
  dragonDarts: ['zip', 250],
  snarl: ['growl', 300],
  gigaImpact: ['charge', 300],
  metronome: ['metronome', 300],
  echoedVoice: ['echo', 250],
  curse: ['curse', 400],
}

export const castSound = (move: MoveId) => CAST_SOUNDS[move] ?? null
