import type { EggTier } from '../game/eggs'
import type { StatDelta } from '../game/stats'
import { STARTERS, type EvolutionStage, type PlayableDef, type StarterId } from './starters'
import type { PokeType } from './types'

/**
 * Playable families that hatch from eggs (`game/eggs.ts`), on top of the 27
 * starters. They share the starters' shape; `egg` is the egg tier they hatch from.
 */
export type HatchlingDef = PlayableDef & { egg: EggTier }

type Stage = readonly [name: string, dex: number, types: readonly PokeType[]]

/** A 3-stage line that evolves at Lv 12 and Lv 28, like the starters. */
const line3 = (a: Stage, b: Stage, c: Stage, bonuses: readonly [StatDelta, StatDelta]) =>
  [
    { name: a[0], dex: a[1], types: a[2], evolveAt: 12, bonus: {} },
    { name: b[0], dex: b[1], types: b[2], evolveAt: 28, bonus: bonuses[0] },
    { name: c[0], dex: c[1], types: c[2], bonus: bonuses[1] },
  ] as const satisfies readonly EvolutionStage[]

/** A 2-stage line evolves once, at Lv 20, and gets the whole bonus there. */
const line2 = (a: Stage, b: Stage, bonus: StatDelta) =>
  [
    { name: a[0], dex: a[1], types: a[2], evolveAt: 20, bonus: {} },
    { name: b[0], dex: b[1], types: b[2], bonus },
  ] as const satisfies readonly EvolutionStage[]

export const HATCHLINGS = {
  /* ---------- Common eggs ---------- */
  pichu: {
    name: 'Pichu',
    color: '#f8d030',
    egg: 'common',
    stats: { speed: 6, cooldown: -0.05, maxHp: -15 },
    signature: 'thunder',
    learnset: ['thunder', 'swift', 'machPunch', 'disarmingVoice', 'flashCannon', 'gust'],
    line: line3(['Pichu', 172, ['electric']], ['Pikachu', 25, ['electric']], ['Raichu', 26, ['electric']], [
      { maxHp: 20, speed: 3, might: 0.1 },
      { maxHp: 35, speed: 4, might: 0.2, area: 0.1 },
    ]),
  },
  machop: {
    name: 'Machop',
    color: '#8098b8',
    egg: 'common',
    stats: { might: 0.1, maxHp: 15, speed: -4 },
    signature: 'machPunch',
    learnset: ['machPunch', 'earthquake', 'crunch', 'swift', 'flashCannon', 'psyshock'],
    line: line3(['Machop', 66, ['fighting']], ['Machoke', 67, ['fighting']], ['Machamp', 68, ['fighting']], [
      { maxHp: 30, might: 0.1, armor: 1 },
      { maxHp: 50, might: 0.22, area: 0.1 },
    ]),
  },
  eevee: {
    name: 'Eevee',
    color: '#c89058',
    egg: 'common',
    stats: { growth: 0.1, regen: 0.15 },
    signature: 'swift',
    learnset: ['swift', 'crunch', 'psyshock', 'disarmingVoice', 'spiritShackle', 'sludgeBomb'],
    line: line2(['Eevee', 133, ['normal']], ['Umbreon', 197, ['dark']], { maxHp: 60, armor: 2, might: 0.2, regen: 0.4 }),
  },
  togepi: {
    name: 'Togepi',
    color: '#f0e0c8',
    egg: 'common',
    stats: { regen: 0.3, growth: 0.05, maxHp: 5, speed: -2 },
    signature: 'disarmingVoice',
    learnset: ['disarmingVoice', 'gust', 'swift', 'psyshock', 'machPunch', 'fireSpin'],
    line: line3(['Togepi', 175, ['fairy']], ['Togetic', 176, ['fairy', 'flying']], ['Togekiss', 468, ['fairy', 'flying']], [
      { maxHp: 25, regen: 0.3, area: 0.05 },
      { maxHp: 40, regen: 0.5, might: 0.16, area: 0.1 },
    ]),
  },
  spheal: {
    name: 'Spheal',
    color: '#78b8e8',
    egg: 'common',
    stats: { maxHp: 30, armor: 1, speed: -6 },
    signature: 'whirlpool',
    learnset: ['whirlpool', 'waterGun', 'earthquake', 'crunch', 'swift', 'razorShell'],
    line: line3(['Spheal', 363, ['ice', 'water']], ['Sealeo', 364, ['ice', 'water']], ['Walrein', 365, ['ice', 'water']], [
      { maxHp: 35, armor: 1, might: 0.05 },
      { maxHp: 65, armor: 2, might: 0.15, area: 0.1 },
    ]),
  },
  starly: {
    name: 'Starly',
    color: '#a08868',
    egg: 'common',
    stats: { speed: 8, magnet: 10, maxHp: -10 },
    signature: 'gust',
    learnset: ['gust', 'swift', 'machPunch', 'crunch', 'disarmingVoice', 'earthquake'],
    line: line3(['Starly', 396, ['normal', 'flying']], ['Staravia', 397, ['normal', 'flying']], ['Staraptor', 398, ['normal', 'flying']], [
      { maxHp: 25, speed: 3, might: 0.08 },
      { maxHp: 40, speed: 4, might: 0.2, projectileSpeed: 0.1 },
    ]),
  },
  budew: {
    name: 'Budew',
    color: '#68b868',
    egg: 'common',
    stats: { statusChance: 0.05, statusDamage: 0.15, maxHp: -5 },
    signature: 'razorLeaf',
    learnset: ['razorLeaf', 'sludgeBomb', 'vineWhip', 'disarmingVoice', 'psyshock', 'swift'],
    line: line3(['Budew', 406, ['grass', 'poison']], ['Roselia', 315, ['grass', 'poison']], ['Roserade', 407, ['grass', 'poison']], [
      { maxHp: 20, might: 0.08, statusChance: 0.03 },
      { maxHp: 35, might: 0.18, area: 0.1, statusDamage: 0.15 },
    ]),
  },
  rockruff: {
    name: 'Rockruff',
    color: '#c0a070',
    egg: 'common',
    stats: { speed: 5, might: 0.08 },
    signature: 'crunch',
    learnset: ['crunch', 'earthquake', 'swift', 'machPunch', 'flashCannon', 'psyshock'],
    line: line2(['Rockruff', 744, ['rock']], ['Lycanroc', 745, ['rock']], { maxHp: 55, might: 0.25, speed: 5, armor: 1 }),
  },
  grubbin: {
    name: 'Grubbin',
    color: '#5878c0',
    egg: 'common',
    stats: { area: 0.1, duration: 0.1, maxHp: 10, speed: -5 },
    signature: 'flashCannon',
    learnset: ['flashCannon', 'thunder', 'vineWhip', 'razorLeaf', 'swift', 'earthquake'],
    line: line3(['Grubbin', 736, ['bug']], ['Charjabug', 737, ['bug', 'electric']], ['Vikavolt', 738, ['bug', 'electric']], [
      { maxHp: 35, armor: 1, might: 0.06 },
      { maxHp: 45, might: 0.2, area: 0.15 },
    ]),
  },

  /* ---------- Rare eggs ---------- */
  gastly: {
    name: 'Gastly',
    color: '#7058a0',
    egg: 'rare',
    stats: { might: 0.1, speed: 4, maxHp: -15 },
    signature: 'spiritShackle',
    learnset: ['spiritShackle', 'sludgeBomb', 'psyshock', 'crunch', 'thunder', 'swift'],
    line: line3(['Gastly', 92, ['ghost', 'poison']], ['Haunter', 93, ['ghost', 'poison']], ['Gengar', 94, ['ghost', 'poison']], [
      { maxHp: 20, might: 0.1, speed: 3 },
      { maxHp: 35, might: 0.24, area: 0.1 },
    ]),
  },
  abra: {
    name: 'Abra',
    color: '#e8c040',
    egg: 'rare',
    stats: { cooldown: -0.08, area: 0.05, maxHp: -20 },
    signature: 'psyshock',
    learnset: ['psyshock', 'swift', 'thunder', 'fireSpin', 'machPunch', 'disarmingVoice'],
    line: line3(['Abra', 63, ['psychic']], ['Kadabra', 64, ['psychic']], ['Alakazam', 65, ['psychic']], [
      { maxHp: 20, might: 0.1, cooldown: -0.03 },
      { maxHp: 30, might: 0.22, cooldown: -0.05, area: 0.1 },
    ]),
  },
  ralts: {
    name: 'Ralts',
    color: '#78c878',
    egg: 'rare',
    stats: { area: 0.12, regen: 0.15, maxHp: -5 },
    signature: 'psyshock',
    learnset: ['psyshock', 'disarmingVoice', 'thunder', 'swift', 'spiritShackle', 'fireSpin'],
    line: line3(['Ralts', 280, ['psychic', 'fairy']], ['Kirlia', 281, ['psychic', 'fairy']], ['Gardevoir', 282, ['psychic', 'fairy']], [
      { maxHp: 25, regen: 0.15, might: 0.08 },
      { maxHp: 40, regen: 0.3, might: 0.2, area: 0.1 },
    ]),
  },
  riolu: {
    name: 'Riolu',
    color: '#4878c0',
    egg: 'rare',
    stats: { speed: 6, might: 0.08, cooldown: -0.04, maxHp: -10 },
    signature: 'machPunch',
    learnset: ['machPunch', 'flashCannon', 'psyshock', 'crunch', 'earthquake', 'swift'],
    line: line2(['Riolu', 447, ['fighting']], ['Lucario', 448, ['fighting', 'steel']], { maxHp: 50, might: 0.25, speed: 5, cooldown: -0.05, armor: 1 }),
  },
  zorua: {
    name: 'Zorua',
    color: '#584868',
    egg: 'rare',
    stats: { speed: 7, might: 0.1, maxHp: -15 },
    signature: 'crunch',
    learnset: ['crunch', 'psyshock', 'spiritShackle', 'sludgeBomb', 'fireSpin', 'machPunch'],
    line: line2(['Zorua', 570, ['dark']], ['Zoroark', 571, ['dark']], { maxHp: 45, might: 0.28, speed: 6, area: 0.05 }),
  },
  larvesta: {
    name: 'Larvesta',
    color: '#f0a040',
    egg: 'rare',
    stats: { area: 0.1, statusChance: 0.05, speed: -2 },
    signature: 'fireSpin',
    learnset: ['fireSpin', 'ember', 'gust', 'razorLeaf', 'psyshock', 'swift'],
    line: line2(['Larvesta', 636, ['bug', 'fire']], ['Volcarona', 637, ['bug', 'fire']], { maxHp: 50, might: 0.25, area: 0.15, regen: 0.2 }),
  },
  noibat: {
    name: 'Noibat',
    color: '#8858a8',
    egg: 'rare',
    stats: { area: 0.12, speed: 4, maxHp: -10 },
    signature: 'gust',
    learnset: ['gust', 'disarmingVoice', 'crunch', 'swift', 'fireSpin', 'psyshock'],
    line: line2(['Noibat', 714, ['flying', 'dragon']], ['Noivern', 715, ['flying', 'dragon']], { maxHp: 45, might: 0.22, area: 0.15, speed: 4 }),
  },
  honedge: {
    name: 'Honedge',
    color: '#8890b0',
    egg: 'rare',
    stats: { armor: 2, might: 0.05, speed: -4 },
    signature: 'flashCannon',
    learnset: ['flashCannon', 'spiritShackle', 'machPunch', 'crunch', 'swift', 'psyshock'],
    line: line3(['Honedge', 679, ['steel', 'ghost']], ['Doublade', 680, ['steel', 'ghost']], ['Aegislash', 681, ['steel', 'ghost']], [
      { maxHp: 30, armor: 1, might: 0.08 },
      { maxHp: 45, armor: 1, might: 0.2, area: 0.1 },
    ]),
  },
  toxel: {
    name: 'Toxel',
    color: '#a068c0',
    egg: 'rare',
    stats: { statusChance: 0.06, cooldown: -0.03, maxHp: -5 },
    signature: 'sludgeBomb',
    learnset: ['sludgeBomb', 'thunder', 'disarmingVoice', 'crunch', 'swift', 'machPunch'],
    line: line2(['Toxel', 848, ['electric', 'poison']], ['Toxtricity', 849, ['electric', 'poison']], { maxHp: 45, might: 0.24, area: 0.1, statusDamage: 0.2 }),
  },
  tinkatink: {
    name: 'Tinkatink',
    color: '#e890b0',
    egg: 'rare',
    stats: { might: 0.1, area: 0.1, cooldown: 0.05, maxHp: 5 },
    signature: 'earthquake',
    learnset: ['earthquake', 'flashCannon', 'disarmingVoice', 'crunch', 'machPunch', 'swift'],
    line: line3(['Tinkatink', 957, ['fairy', 'steel']], ['Tinkatuff', 958, ['fairy', 'steel']], ['Tinkaton', 959, ['fairy', 'steel']], [
      { maxHp: 30, might: 0.1, area: 0.05 },
      { maxHp: 50, might: 0.22, area: 0.15, armor: 1 },
    ]),
  },
  charcadet: {
    name: 'Charcadet',
    color: '#e86040',
    egg: 'rare',
    stats: { might: 0.08, duration: 0.1 },
    signature: 'ember',
    learnset: ['ember', 'psyshock', 'fireSpin', 'flashCannon', 'spiritShackle', 'swift'],
    line: line2(['Charcadet', 935, ['fire']], ['Armarouge', 936, ['fire', 'psychic']], { maxHp: 50, might: 0.25, area: 0.1, projectileSpeed: 0.15 }),
  },

  /* ---------- Ultra rare eggs: the pseudo-legendaries ---------- */
  dratini: {
    name: 'Dratini',
    color: '#6890e0',
    egg: 'ultra',
    stats: { maxHp: 10, regen: 0.15, might: 0.05 },
    signature: 'whirlpool',
    learnset: ['whirlpool', 'thunder', 'gust', 'fireSpin', 'waterGun', 'swift'],
    line: line3(['Dratini', 147, ['dragon']], ['Dragonair', 148, ['dragon']], ['Dragonite', 149, ['dragon', 'flying']], [
      { maxHp: 35, might: 0.1, area: 0.05 },
      { maxHp: 60, might: 0.25, armor: 1, speed: 4 },
    ]),
  },
  larvitar: {
    name: 'Larvitar',
    color: '#88a058',
    egg: 'ultra',
    stats: { maxHp: 30, armor: 2, speed: -7 },
    signature: 'earthquake',
    learnset: ['earthquake', 'crunch', 'machPunch', 'flashCannon', 'fireSpin', 'thunder'],
    line: line3(['Larvitar', 246, ['rock', 'ground']], ['Pupitar', 247, ['rock', 'ground']], ['Tyranitar', 248, ['rock', 'dark']], [
      { maxHp: 40, armor: 1, might: 0.08 },
      { maxHp: 75, armor: 2, might: 0.25, area: 0.1 },
    ]),
  },
  beldum: {
    name: 'Beldum',
    color: '#5880c0',
    egg: 'ultra',
    stats: { armor: 2, might: 0.05, maxHp: 10, speed: -5 },
    signature: 'flashCannon',
    learnset: ['flashCannon', 'psyshock', 'machPunch', 'earthquake', 'thunder', 'swift'],
    line: line3(['Beldum', 374, ['steel', 'psychic']], ['Metang', 375, ['steel', 'psychic']], ['Metagross', 376, ['steel', 'psychic']], [
      { maxHp: 35, armor: 1, might: 0.1 },
      { maxHp: 60, armor: 2, might: 0.25, area: 0.1 },
    ]),
  },
  gible: {
    name: 'Gible',
    color: '#5868a0',
    egg: 'ultra',
    stats: { might: 0.1, speed: 3, maxHp: 5 },
    signature: 'crunch',
    learnset: ['crunch', 'earthquake', 'fireSpin', 'machPunch', 'sludgeBomb', 'swift'],
    line: line3(['Gible', 443, ['dragon', 'ground']], ['Gabite', 444, ['dragon', 'ground']], ['Garchomp', 445, ['dragon', 'ground']], [
      { maxHp: 30, might: 0.1, speed: 3 },
      { maxHp: 55, might: 0.25, speed: 6, armor: 1 },
    ]),
  },
  dreepy: {
    name: 'Dreepy',
    color: '#58a088',
    egg: 'ultra',
    stats: { projectileSpeed: 0.2, speed: 6, maxHp: -15 },
    signature: 'spiritShackle',
    learnset: ['spiritShackle', 'thunder', 'fireSpin', 'gust', 'psyshock', 'swift'],
    line: line3(['Dreepy', 885, ['dragon', 'ghost']], ['Drakloak', 886, ['dragon', 'ghost']], ['Dragapult', 887, ['dragon', 'ghost']], [
      { maxHp: 20, might: 0.1, projectileSpeed: 0.1 },
      { maxHp: 35, might: 0.22, speed: 6, amount: 1 },
    ]),
  },
} as const satisfies Record<string, HatchlingDef>

export type HatchlingId = keyof typeof HATCHLINGS

export const HATCHLING_IDS = Object.keys(HATCHLINGS) as HatchlingId[]

/** Every Pokémon a run can start with: the starters plus the hatched families. */
export const PLAYABLE = { ...STARTERS, ...HATCHLINGS }

export type PlayableId = StarterId | HatchlingId

export const isHatchling = (id: PlayableId): id is HatchlingId => id in HATCHLINGS

/** Dex numbers of a playable Pokémon's whole evolution line. */
export const playableDex = (id: PlayableId) => PLAYABLE[id].line.map((s) => s.dex)
