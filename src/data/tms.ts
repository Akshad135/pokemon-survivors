import type { EnemyId } from './enemies'
import { LEGENDARY_MOVE_OF } from './legendaryMoves'
import type { RiftLegend } from './rifts'
import type { MoveId } from '../game/moves'
import type { TmMoveId } from '../game/tmMoves'
import type { PokeType } from './types'

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

/**
 * Which move types a Move Tutor teaches a Pokémon of each type, besides its
 * own (`tutorTypes`): moves it could plausibly know, like the games' TM
 * compatibility, so a Grovyle hears about Earthquake or Crunch but never
 * Water Shuriken.
 */
export const TUTOR_AFFINITY = {
  normal: ['fighting', 'dark', 'ghost', 'psychic', 'ground', 'rock', 'steel', 'flying', 'fairy'],
  fire: ['fighting', 'ground', 'rock', 'dragon', 'dark', 'steel', 'normal', 'flying'],
  water: ['ice', 'ground', 'rock', 'psychic', 'dark', 'normal', 'fighting', 'dragon', 'steel'],
  grass: ['bug', 'poison', 'ground', 'rock', 'normal', 'fighting', 'dark', 'fairy', 'dragon', 'psychic'],
  electric: ['steel', 'normal', 'flying', 'psychic', 'fighting', 'dark', 'fairy', 'bug'],
  poison: ['dark', 'ghost', 'bug', 'ground', 'grass', 'normal', 'fighting'],
  flying: ['normal', 'dark', 'steel', 'fighting', 'psychic', 'dragon', 'fairy', 'bug'],
  bug: ['grass', 'poison', 'flying', 'fighting', 'rock', 'steel', 'ground', 'dark', 'normal'],
  rock: ['ground', 'steel', 'fighting', 'fire', 'water', 'dark', 'normal', 'dragon'],
  ground: ['rock', 'steel', 'fighting', 'fire', 'poison', 'dark', 'normal', 'dragon'],
  ghost: ['dark', 'psychic', 'poison', 'fairy', 'fire', 'normal', 'steel'],
  fighting: ['normal', 'dark', 'rock', 'ground', 'steel', 'psychic', 'poison', 'ice', 'fire', 'electric'],
  psychic: ['fairy', 'ghost', 'fighting', 'normal', 'electric', 'steel', 'dragon', 'ice'],
  ice: ['water', 'ground', 'rock', 'normal', 'psychic', 'flying', 'dark', 'fighting'],
  steel: ['rock', 'ground', 'fighting', 'electric', 'psychic', 'normal', 'dark', 'dragon'],
  dark: ['ghost', 'poison', 'fighting', 'normal', 'steel', 'ground', 'flying', 'fire'],
  fairy: ['psychic', 'normal', 'grass', 'flying', 'steel', 'ghost', 'electric'],
  dragon: ['fire', 'water', 'ground', 'rock', 'flying', 'steel', 'dark', 'normal', 'electric', 'fighting'],
} as const satisfies Record<PokeType, readonly PokeType[]>
