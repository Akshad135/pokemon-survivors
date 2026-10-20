import type { MoveId } from '../game/moves'
import type { StatDelta } from '../game/stats'
import type { AbilityEffect, AbilityId } from './abilities'
import type { EnemyId } from './enemies'
import { LEGENDARY_MOVE_OF } from './legendaryMoves'
import type { EvolutionStage, PlayableDef } from './starters'
import type { PokeType } from './types'

/**
 * Playable legendaries, played only in the Legend mode (Modo Lendário). A
 * legend never evolves: it awakens at `AWAKEN_AT` instead (an Ability pick on
 * the first, a stat boost and an Esquecer charge on both, and on the second
 * its `form` where it has one), carries an `innate` from the start (its real
 * ability) and opens the run with its legendary move. The rules live in
 * `game/legend.ts`. Unlocking (`unlock`) is the save's side: beating the
 * legendary as a boss `wins` times.
 */

/** The 23 legendaries with sprites, by their `EnemyId`. */
export const LEGEND_IDS = [
  'articuno', 'zapdos', 'moltres', 'raikou', 'entei', 'suicune', 'regirock', 'regice', 'registeel',
  'mew', 'celebi', 'jirachi', 'mewtwo', 'lugia', 'hoOh', 'kyogre', 'groudon', 'rayquaza', 'dialga',
  'latias', 'latios', 'deoxys', 'arceus',
] as const satisfies readonly EnemyId[]

export type LegendId = (typeof LEGEND_IDS)[number]

/** Levels of the two awakenings (the starters' evolution levels). */
export const AWAKEN_AT = [12, 28] as const

/** Asset folder of a legend's alternate form (`<dex>/<form>/`), like the Megas'. Deoxys's formes come with its stance. */
export type LegendForm = 'primal' | 'mega' | 'attack' | 'defense' | 'speed'

/**
 * The innate: an ability in play from Lv 1, on top of the one picked at the
 * first awakening. `extra` adds what the Legend mode gives it beyond the
 * ability itself (Serene Grace's lucky cards, Snow Cloak's chill).
 */
export type Innate = { ability: AbilityId; extra?: readonly AbilityEffect[] }

/**
 * How a legend is unlocked: beat it as a boss `wins` times, in any mode.
 * `endless`: the win must come in the endless mode; `last`: only once every
 * other legend is unlocked (Arceus, the final trophy).
 */
export type LegendUnlock = { wins: number; endless?: true; last?: true }

export type LegendDef = Omit<PlayableDef, 'learnset' | 'line'> & {
  /** One list: every move it can learn is there from Lv 1, its legendary move first. */
  learnset: readonly [readonly MoveId[]]
  line: readonly [EvolutionStage]
  /** Stats each awakening adds, on top of `stats`. */
  awakenings: readonly [StatDelta, StatDelta]
  innate: Innate
  /** The form the second awakening lands in, for good (Primal Kyogre, Mega Rayquaza). */
  form?: { key: LegendForm; name: string; types?: readonly PokeType[] }
  unlock: LegendUnlock
}

/**
 * The legendary move a legend opens with: its `LEGENDARY_MOVE_OF` entry, or
 * `stand` for the eleven that don't have one yet (the trios, Mewtwo, Arceus).
 */
const own = (id: LegendId, stand: MoveId): MoveId => (LEGENDARY_MOVE_OF as Partial<Record<LegendId, MoveId>>)[id] ?? stand

const stage = (dex: number, name: string, types: readonly PokeType[]) => [{ dex, name, types, bonus: {} }] as const satisfies LegendDef['line']

/** Captured after this many wins: the rift legendaries and the trios. */
const RIFT_WINS = { wins: 3 } as const satisfies LegendUnlock
/** The finale's mythicals show up in one run in ten: one win does it. */
const MYTHICAL_WINS = { wins: 1 } as const satisfies LegendUnlock

const chill = { kind: 'aura', radius: 56, every: 1, status: { kind: 'slow', chance: 1, duration: 1.2, power: 0.3 } } as const satisfies AbilityEffect

/**
 * Every legend. Stats sit clearly above a final-stage starter's once both
 * awakenings land (a Charizard ends at +55 HP, +0.45 damage; a legend at about
 * +100 HP, +0.6), and the Legend mode's Pressure (`game/legend.ts`) pushes back.
 */
export const LEGENDS = {
  /* ---------- The legendary birds ---------- */
  articuno: {
    name: 'Articuno',
    color: '#88c8f0',
    stats: { maxHp: 35, might: 0.18, area: 0.1, speed: 4 },
    // legend-moves: swap for snowscape (`own` picks it up once LEGENDARY_MOVE_OF has it; then drop the stand-in)
    signature: own('articuno', 'iceBeam'),
    learnset: [[own('articuno', 'iceBeam'), 'iceShard', 'gust', 'sheerCold', 'roost', 'frostBreath', 'swift', 'futureSight']],
    line: stage(144, 'Articuno', ['ice', 'flying']),
    awakenings: [{ maxHp: 25, might: 0.12, area: 0.05 }, { maxHp: 40, might: 0.22, area: 0.1, cooldown: -0.05 }],
    innate: { ability: 'snowCloak', extra: [chill] },
    unlock: RIFT_WINS,
  },
  zapdos: {
    name: 'Zapdos',
    color: '#f8d030',
    stats: { maxHp: 30, might: 0.22, speed: 6, cooldown: -0.04 },
    // legend-moves: swap for electricTerrain (`own` picks it up once LEGENDARY_MOVE_OF has it; then drop the stand-in)
    signature: own('zapdos', 'discharge'),
    learnset: [[own('zapdos', 'discharge'), 'thunder', 'shockWave', 'electroBall', 'drillPeck', 'gust', 'roost', 'uTurn']],
    line: stage(145, 'Zapdos', ['electric', 'flying']),
    awakenings: [{ maxHp: 25, might: 0.12, speed: 3 }, { maxHp: 35, might: 0.24, cooldown: -0.05 }],
    innate: { ability: 'static' },
    unlock: RIFT_WINS,
  },
  moltres: {
    name: 'Moltres',
    color: '#f8a030',
    stats: { maxHp: 30, might: 0.25, area: 0.1, speed: 3 },
    // legend-moves: swap for overheat (`own` picks it up once LEGENDARY_MOVE_OF has it; then drop the stand-in)
    signature: own('moltres', 'heatWave'),
    learnset: [[own('moltres', 'heatWave'), 'ember', 'fireSpin', 'flameWheel', 'gust', 'roost', 'willOWisp', 'solarBeam']],
    line: stage(146, 'Moltres', ['fire', 'flying']),
    awakenings: [{ maxHp: 25, might: 0.12, area: 0.05 }, { maxHp: 35, might: 0.25, area: 0.1 }],
    innate: { ability: 'flameBody' },
    unlock: RIFT_WINS,
  },

  /* ---------- The legendary beasts ---------- */
  raikou: {
    name: 'Raikou',
    color: '#f8c838',
    stats: { maxHp: 30, might: 0.2, speed: 10, cooldown: -0.05 },
    // legend-moves: swap for thunderclap (`own` picks it up once LEGENDARY_MOVE_OF has it; then drop the stand-in)
    signature: own('raikou', 'thunderFang'),
    learnset: [[own('raikou', 'thunderFang'), 'thunder', 'shockWave', 'electroBall', 'crunch', 'quickAttack', 'wildCharge', 'futureSight']],
    line: stage(243, 'Raikou', ['electric']),
    awakenings: [{ maxHp: 25, might: 0.12, speed: 3 }, { maxHp: 35, might: 0.22, cooldown: -0.05 }],
    innate: { ability: 'innerFocus' },
    unlock: RIFT_WINS,
  },
  entei: {
    name: 'Entei',
    color: '#c86838',
    stats: { maxHp: 45, might: 0.25, speed: 6, area: 0.05 },
    // legend-moves: swap for burningBulwark (`own` picks it up once LEGENDARY_MOVE_OF has it; then drop the stand-in)
    signature: own('entei', 'lavaPlume'),
    learnset: [[own('entei', 'lavaPlume'), 'ember', 'fireSpin', 'flameWheel', 'pyroBall', 'crunch', 'stealthRock', 'earthquake']],
    line: stage(244, 'Entei', ['fire']),
    awakenings: [{ maxHp: 25, might: 0.12, armor: 1 }, { maxHp: 40, might: 0.22, area: 0.1 }],
    innate: { ability: 'pressure' },
    unlock: RIFT_WINS,
  },
  suicune: {
    name: 'Suicune',
    color: '#58b8e8',
    stats: { maxHp: 40, might: 0.18, speed: 8, regen: 0.3 },
    // legend-moves: swap for aquaRing (`own` picks it up once LEGENDARY_MOVE_OF has it; then drop the stand-in)
    signature: own('suicune', 'auroraBeam'),
    learnset: [[own('suicune', 'auroraBeam'), 'waterGun', 'whirlpool', 'brine', 'iceShard', 'sheerCold', 'gust', 'bubbleBeam']],
    line: stage(245, 'Suicune', ['water']),
    awakenings: [{ maxHp: 25, might: 0.1, regen: 0.3 }, { maxHp: 40, might: 0.22, armor: 1 }],
    innate: { ability: 'innerFocus' },
    unlock: RIFT_WINS,
  },

  /* ---------- The legendary titans ---------- */
  regirock: {
    name: 'Regirock',
    color: '#c87848',
    stats: { maxHp: 60, armor: 2, might: 0.15, speed: -4 },
    // legend-moves: swap for rockWrecker (`own` picks it up once LEGENDARY_MOVE_OF has it; then drop the stand-in)
    signature: own('regirock', 'rockSlide'),
    learnset: [[own('regirock', 'rockSlide'), 'rockTomb', 'stealthRock', 'earthquake', 'focusPunch', 'machPunch', 'flashCannon', 'rockBlast']],
    line: stage(377, 'Regirock', ['rock']),
    awakenings: [{ maxHp: 35, armor: 1, might: 0.1 }, { maxHp: 50, armor: 1, might: 0.22, area: 0.1 }],
    innate: { ability: 'clearBody' },
    unlock: RIFT_WINS,
  },
  regice: {
    name: 'Regice',
    color: '#a8e0f8',
    stats: { maxHp: 50, armor: 1, might: 0.18, area: 0.1, speed: -4 },
    // legend-moves: swap for glaciate (`own` picks it up once LEGENDARY_MOVE_OF has it; then drop the stand-in)
    signature: own('regice', 'icyWind'),
    learnset: [[own('regice', 'icyWind'), 'iceShard', 'sheerCold', 'focusPunch', 'thunder', 'flashCannon', 'avalanche', 'rockTomb']],
    line: stage(378, 'Regice', ['ice']),
    awakenings: [{ maxHp: 30, armor: 1, might: 0.1 }, { maxHp: 45, might: 0.24, area: 0.1 }],
    innate: { ability: 'clearBody' },
    unlock: RIFT_WINS,
  },
  registeel: {
    name: 'Registeel',
    color: '#9098a8',
    stats: { maxHp: 55, armor: 3, might: 0.15, speed: -5 },
    // legend-moves: swap for metalBurst (`own` picks it up once LEGENDARY_MOVE_OF has it; then drop the stand-in)
    signature: own('registeel', 'ironHead'),
    learnset: [[own('registeel', 'ironHead'), 'flashCannon', 'gyroBall', 'focusPunch', 'machPunch', 'stealthRock', 'heavySlam', 'earthquake']],
    line: stage(379, 'Registeel', ['steel']),
    awakenings: [{ maxHp: 35, armor: 1, might: 0.1 }, { maxHp: 50, armor: 1, might: 0.22, regen: 0.4 }],
    innate: { ability: 'clearBody' },
    unlock: RIFT_WINS,
  },

  /* ---------- The finale's mythicals ---------- */
  mew: {
    name: 'Mew',
    color: '#f8a8c8',
    stats: { maxHp: 30, might: 0.15, growth: 0.1, cooldown: -0.05, speed: 4 },
    signature: own('mew', 'ancientPower'),
    learnset: [[own('mew', 'ancientPower'), 'psyshock', 'futureSight', 'swift', 'metronome', 'shockWave', 'flameWheel', 'whirlpool']],
    line: stage(151, 'Mew', ['psychic']),
    awakenings: [{ maxHp: 25, might: 0.12, growth: 0.05 }, { maxHp: 35, might: 0.22, cooldown: -0.05 }],
    innate: { ability: 'synchronize' },
    unlock: MYTHICAL_WINS,
  },
  celebi: {
    name: 'Celebi',
    color: '#88d868',
    stats: { maxHp: 35, might: 0.15, regen: 0.4, duration: 0.1 },
    signature: own('celebi', 'magicalLeaf'),
    learnset: [[own('celebi', 'magicalLeaf'), 'razorLeaf', 'leafBlade', 'psyshock', 'futureSight', 'solarBeam', 'leechSeed', 'drumBeating']],
    line: stage(251, 'Celebi', ['psychic', 'grass']),
    awakenings: [{ maxHp: 25, might: 0.12, regen: 0.3 }, { maxHp: 35, might: 0.22, area: 0.1 }],
    innate: { ability: 'naturalCure' },
    unlock: MYTHICAL_WINS,
  },
  jirachi: {
    name: 'Jirachi',
    color: '#f8e878',
    stats: { maxHp: 35, might: 0.15, greed: 0.15, magnet: 10 },
    signature: own('jirachi', 'wish'),
    learnset: [[own('jirachi', 'wish'), 'flashCannon', 'psyshock', 'futureSight', 'swift', 'meteorMash', 'gyroBall', 'disarmingVoice']],
    line: stage(385, 'Jirachi', ['steel', 'psychic']),
    awakenings: [{ maxHp: 25, might: 0.12, armor: 1 }, { maxHp: 35, might: 0.22, area: 0.1 }],
    innate: { ability: 'sereneGrace', extra: [{ kind: 'luck', rare: 0.1, shiny: 2 }] },
    unlock: MYTHICAL_WINS,
  },

  /* ---------- The finale ---------- */
  mewtwo: {
    name: 'Mewtwo',
    color: '#a890c8',
    stats: { maxHp: 30, might: 0.3, area: 0.1, cooldown: -0.04 },
    // legend-moves: swap for telekinesis (`own` picks it up once LEGENDARY_MOVE_OF has it; then drop the stand-in)
    signature: own('mewtwo', 'psystrike'),
    learnset: [[own('mewtwo', 'psystrike'), 'psyshock', 'futureSight', 'psybeam', 'shockWave', 'focusPunch', 'iceShard', 'flameWheel']],
    line: stage(150, 'Mewtwo', ['psychic']),
    awakenings: [{ maxHp: 25, might: 0.15, area: 0.05 }, { maxHp: 35, might: 0.25, cooldown: -0.06 }],
    innate: { ability: 'pressure' },
    unlock: { wins: 5 },
  },

  /* ---------- The rift legendaries ---------- */
  lugia: {
    name: 'Lugia',
    color: '#e0e0f0',
    stats: { maxHp: 55, might: 0.15, armor: 1, area: 0.1 },
    signature: own('lugia', 'whirlwind'),
    learnset: [[own('lugia', 'whirlwind'), 'gust', 'roost', 'psyshock', 'futureSight', 'whirlpool', 'waterGun', 'dragonTail']],
    line: stage(249, 'Lugia', ['psychic', 'flying']),
    awakenings: [{ maxHp: 30, might: 0.12, armor: 1 }, { maxHp: 45, might: 0.22, area: 0.1 }],
    innate: { ability: 'multiscale' },
    unlock: RIFT_WINS,
  },
  hoOh: {
    name: 'Ho-Oh',
    color: '#f87848',
    stats: { maxHp: 45, might: 0.22, regen: 0.3 },
    signature: own('hoOh', 'sacredFire'),
    learnset: [[own('hoOh', 'sacredFire'), 'ember', 'fireSpin', 'flameWheel', 'gust', 'roost', 'solarBeam', 'braveBird']],
    line: stage(250, 'Ho-Oh', ['fire', 'flying']),
    awakenings: [{ maxHp: 30, might: 0.12, regen: 0.2 }, { maxHp: 40, might: 0.22, area: 0.1 }],
    innate: { ability: 'regenerator' },
    unlock: RIFT_WINS,
  },
  kyogre: {
    name: 'Kyogre',
    color: '#3878d8',
    stats: { maxHp: 50, might: 0.22, area: 0.1, armor: 1, speed: -2 },
    signature: own('kyogre', 'originPulse'),
    learnset: [[own('kyogre', 'originPulse'), 'waterGun', 'whirlpool', 'brine', 'thunder', 'sheerCold', 'waterShuriken', 'razorShell']],
    line: stage(382, 'Kyogre', ['water']),
    awakenings: [{ maxHp: 25, might: 0.12, area: 0.05 }, { maxHp: 40, might: 0.25, area: 0.1, armor: 1 }],
    innate: { ability: 'drizzle' },
    form: { key: 'primal', name: 'Primal Kyogre' },
    unlock: RIFT_WINS,
  },
  groudon: {
    name: 'Groudon',
    color: '#d84838',
    stats: { maxHp: 55, might: 0.22, armor: 1, speed: -3 },
    signature: own('groudon', 'scorchingSands'),
    learnset: [[own('groudon', 'scorchingSands'), 'earthquake', 'rockTomb', 'stealthRock', 'ember', 'fireSpin', 'solarBeam', 'focusPunch']],
    line: stage(383, 'Groudon', ['ground']),
    awakenings: [{ maxHp: 30, might: 0.12, armor: 1 }, { maxHp: 40, might: 0.25, area: 0.1 }],
    innate: { ability: 'drought' },
    form: { key: 'primal', name: 'Primal Groudon', types: ['ground', 'fire'] },
    unlock: RIFT_WINS,
  },
  rayquaza: {
    name: 'Rayquaza',
    color: '#48a868',
    stats: { maxHp: 35, might: 0.25, speed: 6, projectileSpeed: 0.1 },
    signature: own('rayquaza', 'dragonAscent'),
    learnset: [[own('rayquaza', 'dragonAscent'), 'dragonBreath', 'dragonTail', 'twister', 'gust', 'crunch', 'earthquake', 'thunder']],
    line: stage(384, 'Rayquaza', ['dragon', 'flying']),
    awakenings: [{ maxHp: 25, might: 0.15, speed: 3 }, { maxHp: 40, might: 0.25, cooldown: -0.05 }],
    innate: { ability: 'airLock' },
    form: { key: 'mega', name: 'Mega Rayquaza' },
    unlock: RIFT_WINS,
  },
  dialga: {
    name: 'Dialga',
    color: '#5878b8',
    stats: { maxHp: 50, armor: 2, might: 0.18, duration: 0.1, speed: -3 },
    signature: own('dialga', 'roarOfTime'),
    learnset: [[own('dialga', 'roarOfTime'), 'flashCannon', 'dragonBreath', 'dragonTail', 'gyroBall', 'futureSight', 'earthquake', 'stealthRock']],
    line: stage(483, 'Dialga', ['steel', 'dragon']),
    awakenings: [{ maxHp: 30, armor: 1, might: 0.12 }, { maxHp: 45, might: 0.22, cooldown: -0.05 }],
    innate: { ability: 'pressure' },
    unlock: RIFT_WINS,
  },
  latias: {
    name: 'Latias',
    color: '#e87888',
    stats: { maxHp: 40, might: 0.15, speed: 8, regen: 0.3, cooldown: -0.04 },
    signature: own('latias', 'mistBall'),
    learnset: [[own('latias', 'mistBall'), 'dragonBreath', 'psyshock', 'futureSight', 'dragonTail', 'roost', 'disarmingVoice', 'swift']],
    line: stage(380, 'Latias', ['dragon', 'psychic']),
    awakenings: [{ maxHp: 25, might: 0.12, regen: 0.2 }, { maxHp: 35, might: 0.22, cooldown: -0.05 }],
    innate: { ability: 'levitate' },
    unlock: RIFT_WINS,
  },
  latios: {
    name: 'Latios',
    color: '#5878d8',
    stats: { maxHp: 30, might: 0.22, speed: 10, cooldown: -0.04 },
    signature: own('latios', 'lusterPurge'),
    learnset: [[own('latios', 'lusterPurge'), 'dragonBreath', 'psyshock', 'dragonTail', 'futureSight', 'roost', 'shockWave', 'iceShard']],
    line: stage(381, 'Latios', ['dragon', 'psychic']),
    awakenings: [{ maxHp: 25, might: 0.12, speed: 3 }, { maxHp: 35, might: 0.25, projectileSpeed: 0.1 }],
    innate: { ability: 'levitate' },
    unlock: RIFT_WINS,
  },
  deoxys: {
    name: 'Deoxys',
    color: '#e86838',
    stats: { maxHp: 30, might: 0.22, speed: 6, cooldown: -0.04 },
    signature: own('deoxys', 'psychoBoost'),
    learnset: [[own('deoxys', 'psychoBoost'), 'psyshock', 'futureSight', 'psybeam', 'machPunch', 'shockWave', 'swift', 'uTurn']],
    line: stage(386, 'Deoxys', ['psychic']),
    awakenings: [{ maxHp: 25, might: 0.12, speed: 3 }, { maxHp: 35, might: 0.24, cooldown: -0.05 }],
    innate: { ability: 'pressure' },
    unlock: RIFT_WINS,
  },

  /* ---------- The god ---------- */
  arceus: {
    name: 'Arceus',
    color: '#e8e0c8',
    stats: { maxHp: 50, might: 0.25, armor: 1, speed: 4 },
    // legend-moves: swap for judgment (`own` picks it up once LEGENDARY_MOVE_OF has it; then drop the stand-in)
    signature: own('arceus', 'meteorBeam'),
    learnset: [[own('arceus', 'meteorBeam'), 'swift', 'gigaImpact', 'earthquake', 'futureSight', 'flashCannon', 'shockWave', 'roost']],
    line: stage(493, 'Arceus', ['normal']),
    awakenings: [{ maxHp: 30, might: 0.15, armor: 1 }, { maxHp: 45, might: 0.25, area: 0.1, cooldown: -0.05 }],
    innate: { ability: 'multitype' },
    unlock: { wins: 1, endless: true, last: true },
  },
} as const satisfies Record<LegendId, LegendDef>

export const isLegend = (id: unknown): id is LegendId => LEGEND_IDS.some((l) => l === id)
