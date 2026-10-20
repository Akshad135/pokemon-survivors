import type { LegendaryMoveId } from '../game/legendaryMoves'
import type { LegendaryMove2Id } from '../game/legendaryMoves2'
import type { BiomeId } from './biomes'
import type { RiftLegend } from './rifts'
import type { PokeType } from './types'
import type { Mythical, TRIOS, TrioId } from './waves'

/**
 * Every legendary with a capstone move: the rift legendaries, the trio
 * members, Mewtwo, the mythicals of the finale and Arceus (the same 23 as
 * `LEGEND_IDS` in `data/legends.ts`).
 */
export type CapstoneLegend = RiftLegend | Mythical | (typeof TRIOS)[TrioId][number] | 'mewtwo' | 'arceus'

/**
 * The capstone move each legendary teaches (`game/legendaryMoves.ts`, the
 * trios', Mewtwo's and Arceus's in `game/legendaryMoves2.ts`): its official
 * signature where it's free; where the name already belongs to a special tier
 * (Aeroblast, Doom Desire), a starter's move (Precipice Blades, Eruption,
 * Leaf Storm) or another move (Mewtwo's boss TM Psystrike, Sheer Cold,
 * Blizzard, Stone Edge, Flash Cannon), another iconic move of theirs, or of
 * its paradox form (Raikou's Thunderclap from Raging Bolt, Entei's Burning
 * Bulwark from Gouging Fire).
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
  articuno: 'snowscape',
  zapdos: 'electricTerrain',
  moltres: 'overheat',
  raikou: 'thunderclap',
  entei: 'burningBulwark',
  suicune: 'aquaRing',
  regirock: 'rockWrecker',
  regice: 'glaciate',
  registeel: 'metalBurst',
  mewtwo: 'telekinesis',
  arceus: 'judgment',
} as const satisfies Record<CapstoneLegend, LegendaryMoveId | LegendaryMove2Id>

export type LegendaryId = keyof typeof LEGENDARY_MOVE_OF

/**
 * Multitype: the plate Arceus's Judgment takes in each biome, so its type
 * follows the land (the Meadow, Insect, Stone, Icicle and Spooky Plates).
 */
export const JUDGMENT_PLATES = {
  meadow: 'grass',
  forest: 'bug',
  cave: 'rock',
  snow: 'ice',
  tower: 'ghost',
} as const satisfies Record<BiomeId, PokeType>
