import type { LegendaryMoveId } from '../game/legendaryMoves'
import type { RiftLegend } from './rifts'
import type { Mythical } from './waves'

/**
 * The capstone move each legendary teaches (`game/legendaryMoves.ts`): one per
 * rift legendary and per mythical of the finale. Their official signature
 * where it's free; where the name already belongs to a special tier
 * (Aeroblast, Doom Desire) or a starter's move (Precipice Blades, Eruption,
 * Leaf Storm), another iconic move of theirs.
 */
export const LEGENDARY_MOVE_OF = {
  lugia: 'whirlwind',
  hoOh: 'sacredFire',
  kyogre: 'originPulse',
  groudon: 'scorchingSands',
  rayquaza: 'dragonAscent',
  dialga: 'roarOfTime',
  latias: 'mistBall',
  latios: 'lusterPurge',
  deoxys: 'psychoBoost',
  mew: 'ancientPower',
  celebi: 'magicalLeaf',
  jirachi: 'wish',
} as const satisfies Record<RiftLegend | Mythical, LegendaryMoveId>

export type LegendaryId = keyof typeof LEGENDARY_MOVE_OF
