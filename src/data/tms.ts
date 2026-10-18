import type { EnemyId } from './enemies'
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
  regirock: 'ancientPower',
  regice: 'icyWind',
  registeel: 'ironHead',
  mewtwo: 'psystrike',
} as const satisfies Partial<Record<EnemyId, TmMoveId>>

/**
 * The "legendary TM" a beaten rift legendary offers (at most one learned per
 * run). For now each points at the TM move closest to its type; the legendary
 * moves of their own replace these entries.
 */
export const LEGENDARY_TMS: Partial<Record<RiftLegend, MoveId>> = {
  lugia: 'psystrike',
  hoOh: 'heatWave',
  kyogre: 'auroraBeam',
  groudon: 'ancientPower',
  rayquaza: 'ancientPower',
  dialga: 'ironHead',
  latias: 'psystrike',
  latios: 'psystrike',
  deoxys: 'psystrike',
}
