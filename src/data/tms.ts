import type { EnemyId } from './enemies'
import { LEGENDARY_MOVE_OF } from './legendaryMoves'
import type { RiftLegend } from './rifts'
import type { MoveId } from '../game/moves'
import type { TmMoveId } from '../game/tmMoves'

/**
 * Which TM each foe leaves. A wave boss you defeat drops the disc of its own
 * move (one that fled drops nothing); Mewtwo's only matters if the run goes on
 * into endless mode. Pure data: the drops live in `game/tms.ts`.
 */
export const BOSS_TMS = {
  onix: 'rockSlide',
  snorlax: 'yawn',
  articuno: 'iceBeam',
  zapdos: 'discharge',
  moltres: 'heatWave',
  raikou: 'thunderFang',
  entei: 'lavaPlume',
  suicune: 'auroraBeam',
  regirock: 'meteorBeam',
  regice: 'icyWind',
  registeel: 'ironHead',
  mewtwo: 'psystrike',
} as const satisfies Partial<Record<EnemyId, TmMoveId>>

/**
 * The "legendary TM" a beaten legendary offers (at most one learned per run):
 * its own legendary move. Rift legendaries drop it when their arena is won,
 * the finale's mythicals (endless mode) when they fall.
 */
export const LEGENDARY_TMS: Partial<Record<RiftLegend | EnemyId, MoveId>> = LEGENDARY_MOVE_OF
