import type { EggTier } from '../game/eggs'
import type { StatDelta } from '../game/stats'
import { STARTER_IDS, STARTERS, type EvolutionStage, type PlayableDef, type StarterId } from './starters'
import type { PokeType } from './types'

/**
 * Playable families that hatch from eggs (`game/eggs.ts`), on top of the 27
 * starters. They share the starters' shape; `egg` is the egg tier they hatch from
 * (Munchlax alone hatches from the Friendship Egg, which only invites bring).
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
    learnset: ['thunder', 'swift', 'machPunch', 'disarmingVoice', 'flashCannon', 'gust', 'quickAttack', 'shockWave'],
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
    learnset: ['swift', 'crunch', 'psyshock', 'disarmingVoice', 'spiritShackle', 'sludgeBomb', 'quickAttack'],
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
    learnset: ['whirlpool', 'waterGun', 'earthquake', 'crunch', 'swift', 'razorShell', 'iceShard'],
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
    learnset: ['gust', 'swift', 'machPunch', 'crunch', 'disarmingVoice', 'earthquake', 'quickAttack'],
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
    learnset: ['razorLeaf', 'sludgeBomb', 'vineWhip', 'disarmingVoice', 'psyshock', 'swift', 'toxicSpikes'],
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
    learnset: ['crunch', 'earthquake', 'swift', 'machPunch', 'flashCannon', 'psyshock', 'rockTomb'],
    line: line2(['Rockruff', 744, ['rock']], ['Lycanroc', 745, ['rock']], { maxHp: 55, might: 0.25, speed: 5, armor: 1 }),
  },
  grubbin: {
    name: 'Grubbin',
    color: '#5878c0',
    egg: 'common',
    stats: { area: 0.1, duration: 0.1, maxHp: 10, speed: -5 },
    signature: 'flashCannon',
    learnset: ['flashCannon', 'thunder', 'vineWhip', 'razorLeaf', 'swift', 'earthquake', 'pinMissile'],
    line: line3(['Grubbin', 736, ['bug']], ['Charjabug', 737, ['bug', 'electric']], ['Vikavolt', 738, ['bug', 'electric']], [
      { maxHp: 35, armor: 1, might: 0.06 },
      { maxHp: 45, might: 0.2, area: 0.15 },
    ]),
  },

  /* Gen 1-3 families */
  pidgey: {
    name: 'Pidgey',
    color: '#c8a868',
    egg: 'common',
    stats: { speed: 5, projectileSpeed: 0.1, magnet: 6, maxHp: -10 },
    signature: 'gust',
    learnset: ['gust', 'quickAttack', 'swift', 'flashCannon', 'crunch', 'psyshock'],
    line: line3(['Pidgey', 16, ['normal', 'flying']], ['Pidgeotto', 17, ['normal', 'flying']], ['Pidgeot', 18, ['normal', 'flying']], [
      { maxHp: 20, speed: 3, might: 0.08 },
      { maxHp: 35, speed: 4, might: 0.18, area: 0.1 },
    ]),
  },
  zubat: {
    name: 'Zubat',
    color: '#5878c8',
    egg: 'common',
    stats: { speed: 6, statusDamage: 0.1, maxHp: -10 },
    signature: 'crunch',
    learnset: ['crunch', 'sludgeBomb', 'gust', 'toxicSpikes', 'swift', 'pinMissile'],
    line: line3(['Zubat', 41, ['poison', 'flying']], ['Golbat', 42, ['poison', 'flying']], ['Crobat', 169, ['poison', 'flying']], [
      { maxHp: 25, speed: 3, might: 0.08 },
      { maxHp: 35, speed: 6, might: 0.18, cooldown: -0.05 },
    ]),
  },
  poliwag: {
    name: 'Poliwag',
    color: '#5870c8',
    egg: 'common',
    stats: { cooldown: -0.04, maxHp: 10, speed: -2 },
    signature: 'waterGun',
    learnset: ['waterGun', 'whirlpool', 'machPunch', 'psyshock', 'iceShard', 'earthquake'],
    line: line3(['Poliwag', 60, ['water']], ['Poliwhirl', 61, ['water']], ['Poliwrath', 62, ['water', 'fighting']], [
      { maxHp: 30, might: 0.08, armor: 1 },
      { maxHp: 50, might: 0.2, armor: 1, area: 0.05 },
    ]),
  },
  geodude: {
    name: 'Geodude',
    color: '#a09078',
    egg: 'common',
    stats: { armor: 1, maxHp: 20, might: 0.05, speed: -6 },
    signature: 'rockTomb',
    learnset: ['rockTomb', 'earthquake', 'machPunch', 'flashCannon', 'fireSpin', 'crunch'],
    line: line3(['Geodude', 74, ['rock', 'ground']], ['Graveler', 75, ['rock', 'ground']], ['Golem', 76, ['rock', 'ground']], [
      { maxHp: 30, armor: 1, might: 0.08 },
      { maxHp: 55, armor: 1, might: 0.2, area: 0.1 },
    ]),
  },
  mareep: {
    name: 'Mareep',
    color: '#f0d070',
    egg: 'common',
    stats: { maxHp: 15, regen: 0.1, statusChance: 0.03, speed: -3 },
    signature: 'shockWave',
    learnset: ['shockWave', 'thunder', 'swift', 'machPunch', 'dragonBreath', 'rockTomb'],
    line: line3(['Mareep', 179, ['electric']], ['Flaaffy', 180, ['electric']], ['Ampharos', 181, ['electric']], [
      { maxHp: 25, might: 0.08, statusChance: 0.02 },
      { maxHp: 40, might: 0.18, area: 0.12 },
    ]),
  },
  azurill: {
    name: 'Azurill',
    color: '#68a8e8',
    egg: 'common',
    stats: { regen: 0.15, maxHp: 10, might: -0.05 },
    signature: 'disarmingVoice',
    learnset: ['disarmingVoice', 'waterGun', 'whirlpool', 'machPunch', 'iceShard', 'swift'],
    // Azumarill's Huge Power: a soft start, a heavy hitter at the end.
    line: line3(['Azurill', 298, ['normal', 'fairy']], ['Marill', 183, ['water', 'fairy']], ['Azumarill', 184, ['water', 'fairy']], [
      { maxHp: 25, might: 0.08 },
      { maxHp: 45, might: 0.3 },
    ]),
  },
  shroomish: {
    name: 'Shroomish',
    color: '#88b070',
    egg: 'common',
    stats: { statusChance: 0.05, regen: 0.15, speed: -3 },
    signature: 'razorLeaf',
    learnset: ['razorLeaf', 'machPunch', 'sludgeBomb', 'drumBeating', 'rockTomb', 'swift'],
    line: line2(['Shroomish', 285, ['grass']], ['Breloom', 286, ['grass', 'fighting']], { maxHp: 40, might: 0.25, speed: 5, cooldown: -0.04 }),
  },
  swinub: {
    name: 'Swinub',
    color: '#a07858',
    egg: 'common',
    stats: { maxHp: 20, armor: 1, speed: -5 },
    signature: 'iceShard',
    learnset: ['iceShard', 'earthquake', 'rockTomb', 'crunch', 'swift', 'whirlpool'],
    // The only Gen 4 member of these families: Mamoswine completes the line, a slow, heavy-hitting tank.
    line: line3(['Swinub', 220, ['ice', 'ground']], ['Piloswine', 221, ['ice', 'ground']], ['Mamoswine', 473, ['ice', 'ground']], [
      { maxHp: 30, armor: 1, might: 0.08 },
      { maxHp: 55, armor: 1, might: 0.22, area: 0.1 },
    ]),
  },
  snorunt: {
    name: 'Snorunt',
    color: '#88a8c8',
    egg: 'common',
    stats: { area: 0.08, might: 0.05, maxHp: -5 },
    signature: 'iceShard',
    learnset: ['iceShard', 'crunch', 'spiritShackle', 'swift', 'earthquake', 'rockTomb'],
    line: line2(['Snorunt', 361, ['ice']], ['Glalie', 362, ['ice']], { maxHp: 50, might: 0.22, area: 0.1, armor: 1 }),
  },

  /* ---------- Rare eggs ---------- */
  gastly: {
    name: 'Gastly',
    color: '#7058a0',
    egg: 'rare',
    stats: { might: 0.1, speed: 4, maxHp: -15 },
    signature: 'spiritShackle',
    learnset: ['spiritShackle', 'sludgeBomb', 'psyshock', 'crunch', 'thunder', 'swift', 'hex'],
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
    learnset: ['machPunch', 'flashCannon', 'psyshock', 'crunch', 'earthquake', 'swift', 'quickAttack'],
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
    learnset: ['fireSpin', 'ember', 'gust', 'razorLeaf', 'psyshock', 'swift', 'pinMissile'],
    line: line2(['Larvesta', 636, ['bug', 'fire']], ['Volcarona', 637, ['bug', 'fire']], { maxHp: 50, might: 0.25, area: 0.15, regen: 0.2 }),
  },
  noibat: {
    name: 'Noibat',
    color: '#8858a8',
    egg: 'rare',
    stats: { area: 0.12, speed: 4, maxHp: -10 },
    signature: 'gust',
    learnset: ['gust', 'disarmingVoice', 'crunch', 'swift', 'fireSpin', 'psyshock', 'dragonBreath'],
    line: line2(['Noibat', 714, ['flying', 'dragon']], ['Noivern', 715, ['flying', 'dragon']], { maxHp: 45, might: 0.22, area: 0.15, speed: 4 }),
  },
  honedge: {
    name: 'Honedge',
    color: '#8890b0',
    egg: 'rare',
    stats: { armor: 2, might: 0.05, speed: -4 },
    signature: 'flashCannon',
    learnset: ['flashCannon', 'spiritShackle', 'machPunch', 'crunch', 'swift', 'psyshock', 'hex'],
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
    learnset: ['sludgeBomb', 'thunder', 'disarmingVoice', 'crunch', 'swift', 'machPunch', 'shockWave'],
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
    learnset: ['ember', 'psyshock', 'fireSpin', 'flashCannon', 'spiritShackle', 'swift', 'willOWisp'],
    line: line2(['Charcadet', 935, ['fire']], ['Armarouge', 936, ['fire', 'psychic']], { maxHp: 50, might: 0.25, area: 0.1, projectileSpeed: 0.15 }),
  },

  /* Gen 1-3 families */
  growlithe: {
    name: 'Growlithe',
    color: '#f09040',
    egg: 'rare',
    stats: { speed: 5, might: 0.08, maxHp: 5 },
    signature: 'ember',
    learnset: ['ember', 'crunch', 'fireSpin', 'quickAttack', 'swift', 'machPunch'],
    line: line2(['Growlithe', 58, ['fire']], ['Arcanine', 59, ['fire']], { maxHp: 55, might: 0.22, speed: 6, area: 0.05 }),
  },
  vulpix: {
    name: 'Vulpix',
    color: '#d87850',
    egg: 'rare',
    stats: { statusChance: 0.05, duration: 0.1, maxHp: -5 },
    signature: 'willOWisp',
    learnset: ['willOWisp', 'ember', 'fireSpin', 'hex', 'psyshock', 'swift'],
    line: line2(['Vulpix', 37, ['fire']], ['Ninetales', 38, ['fire']], { maxHp: 45, might: 0.22, duration: 0.1, statusDamage: 0.2 }),
  },
  cubone: {
    name: 'Cubone',
    color: '#c8b090',
    egg: 'rare',
    stats: { might: 0.1, armor: 1, speed: -3 },
    signature: 'earthquake',
    learnset: ['earthquake', 'rockTomb', 'machPunch', 'fireSpin', 'thunder', 'iceShard'],
    line: line2(['Cubone', 104, ['ground']], ['Marowak', 105, ['ground']], { maxHp: 50, might: 0.25, armor: 1, area: 0.1 }),
  },
  scyther: {
    name: 'Scyther',
    color: '#78c058',
    egg: 'rare',
    stats: { speed: 7, cooldown: -0.05, maxHp: -15 },
    signature: 'pinMissile',
    learnset: ['pinMissile', 'quickAttack', 'gust', 'flashCannon', 'machPunch', 'leafBlade'],
    line: line2(['Scyther', 123, ['bug', 'flying']], ['Scizor', 212, ['bug', 'steel']], { maxHp: 55, armor: 2, might: 0.22 }),
  },
  magikarp: {
    name: 'Magikarp',
    color: '#e87848',
    egg: 'rare',
    // Splash: weak (but quick to level) until Gyarados.
    stats: { maxHp: -25, might: -0.3, speed: -2, growth: 0.2 },
    signature: 'waterGun',
    learnset: ['waterGun', 'crunch', 'dragonBreath', 'whirlpool', 'gust', 'thunder'],
    line: line2(['Magikarp', 129, ['water']], ['Gyarados', 130, ['water', 'flying']], { maxHp: 90, might: 0.6, armor: 2, area: 0.15 }),
  },
  horsea: {
    name: 'Horsea',
    color: '#6898d8',
    egg: 'rare',
    stats: { projectileSpeed: 0.15, might: 0.05, maxHp: -10 },
    signature: 'waterShuriken',
    learnset: ['waterShuriken', 'waterGun', 'dragonBreath', 'whirlpool', 'iceShard', 'flashCannon'],
    line: line3(['Horsea', 116, ['water']], ['Seadra', 117, ['water']], ['Kingdra', 230, ['water', 'dragon']], [
      { maxHp: 25, might: 0.1, projectileSpeed: 0.05 },
      { maxHp: 45, might: 0.22, area: 0.1, armor: 1 },
    ]),
  },
  kabuto: {
    name: 'Kabuto',
    color: '#b08848',
    egg: 'rare',
    stats: { armor: 2, maxHp: 10, speed: -4 },
    signature: 'rockTomb',
    learnset: ['rockTomb', 'razorShell', 'waterGun', 'iceShard', 'swift', 'pinMissile'],
    line: line2(['Kabuto', 140, ['rock', 'water']], ['Kabutops', 141, ['rock', 'water']], { maxHp: 45, might: 0.25, speed: 5, armor: 1 }),
  },
  houndour: {
    name: 'Houndour',
    color: '#c86838',
    egg: 'rare',
    stats: { statusDamage: 0.15, might: 0.06, maxHp: -5 },
    signature: 'ember',
    learnset: ['ember', 'crunch', 'fireSpin', 'willOWisp', 'sludgeBomb', 'swift'],
    line: line2(['Houndour', 228, ['dark', 'fire']], ['Houndoom', 229, ['dark', 'fire']], { maxHp: 45, might: 0.24, statusDamage: 0.15, speed: 3 }),
  },
  teddiursa: {
    name: 'Teddiursa',
    color: '#b07040',
    egg: 'rare',
    stats: { maxHp: 15, might: 0.08, speed: -4 },
    signature: 'crunch',
    learnset: ['crunch', 'machPunch', 'earthquake', 'swift', 'rockTomb', 'disarmingVoice'],
    line: line2(['Teddiursa', 216, ['normal']], ['Ursaring', 217, ['normal']], { maxHp: 65, might: 0.24, armor: 1, area: 0.05 }),
  },
  aron: {
    name: 'Aron',
    color: '#a8a8b8',
    egg: 'rare',
    stats: { armor: 3, maxHp: 10, might: -0.05, speed: -7 },
    signature: 'flashCannon',
    learnset: ['flashCannon', 'rockTomb', 'earthquake', 'dragonBreath', 'thunder', 'iceShard'],
    line: line3(['Aron', 304, ['steel', 'rock']], ['Lairon', 305, ['steel', 'rock']], ['Aggron', 306, ['steel', 'rock']], [
      { maxHp: 35, armor: 1, might: 0.08 },
      { maxHp: 60, armor: 2, might: 0.22, area: 0.05 },
    ]),
  },
  trapinch: {
    name: 'Trapinch',
    color: '#d88848',
    egg: 'rare',
    stats: { area: 0.1, might: 0.05, speed: -4 },
    signature: 'earthquake',
    learnset: ['earthquake', 'crunch', 'dragonBreath', 'rockTomb', 'gust', 'pinMissile'],
    // The pit-digger takes wing: each stage is faster.
    line: line3(['Trapinch', 328, ['ground']], ['Vibrava', 329, ['ground', 'dragon']], ['Flygon', 330, ['ground', 'dragon']], [
      { maxHp: 20, speed: 4, might: 0.08 },
      { maxHp: 40, speed: 5, might: 0.2, area: 0.1 },
    ]),
  },
  swablu: {
    name: 'Swablu',
    color: '#78c8f0',
    egg: 'rare',
    stats: { regen: 0.2, area: 0.06, maxHp: 5, speed: -2 },
    signature: 'gust',
    learnset: ['gust', 'disarmingVoice', 'dragonBreath', 'swift', 'fireSpin', 'iceShard'],
    line: line2(['Swablu', 333, ['normal', 'flying']], ['Altaria', 334, ['dragon', 'flying']], { maxHp: 55, might: 0.2, regen: 0.3, area: 0.1 }),
  },
  electrike: {
    name: 'Electrike',
    color: '#58b868',
    egg: 'rare',
    stats: { speed: 7, cooldown: -0.04, maxHp: -10 },
    signature: 'thunder',
    learnset: ['thunder', 'shockWave', 'quickAttack', 'crunch', 'fireSpin', 'swift'],
    line: line2(['Electrike', 309, ['electric']], ['Manectric', 310, ['electric']], { maxHp: 45, speed: 5, might: 0.22, cooldown: -0.04 }),
  },
  shuppet: {
    name: 'Shuppet',
    color: '#585878',
    egg: 'rare',
    stats: { statusChance: 0.05, might: 0.06, maxHp: -10 },
    signature: 'hex',
    learnset: ['hex', 'spiritShackle', 'willOWisp', 'psyshock', 'thunder', 'swift'],
    line: line2(['Shuppet', 353, ['ghost']], ['Banette', 354, ['ghost']], { maxHp: 40, might: 0.25, statusChance: 0.04, statusDamage: 0.15 }),
  },

  /* ---------- Ultra rare eggs: the pseudo-legendaries ---------- */
  dratini: {
    name: 'Dratini',
    color: '#6890e0',
    egg: 'ultra',
    stats: { maxHp: 10, regen: 0.15, might: 0.05 },
    signature: 'whirlpool',
    learnset: ['whirlpool', 'thunder', 'gust', 'fireSpin', 'waterGun', 'swift', 'dragonBreath'],
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
    learnset: ['earthquake', 'crunch', 'machPunch', 'flashCannon', 'fireSpin', 'thunder', 'rockTomb'],
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
    learnset: ['flashCannon', 'psyshock', 'machPunch', 'earthquake', 'thunder', 'swift', 'shockWave'],
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
    learnset: ['crunch', 'earthquake', 'fireSpin', 'machPunch', 'sludgeBomb', 'swift', 'dragonBreath'],
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
    learnset: ['spiritShackle', 'thunder', 'fireSpin', 'gust', 'psyshock', 'swift', 'hex', 'dragonBreath'],
    line: line3(['Dreepy', 885, ['dragon', 'ghost']], ['Drakloak', 886, ['dragon', 'ghost']], ['Dragapult', 887, ['dragon', 'ghost']], [
      { maxHp: 20, might: 0.1, projectileSpeed: 0.1 },
      { maxHp: 35, might: 0.22, speed: 6, amount: 1 },
    ]),
  },

  bagon: {
    name: 'Bagon',
    color: '#68a8d8',
    egg: 'ultra',
    stats: { might: 0.1, maxHp: 10, speed: -2 },
    signature: 'dragonBreath',
    learnset: ['dragonBreath', 'crunch', 'fireSpin', 'gust', 'earthquake', 'rockTomb'],
    // Shelgon hides in its shell; Salamence finally flies.
    line: line3(['Bagon', 371, ['dragon']], ['Shelgon', 372, ['dragon']], ['Salamence', 373, ['dragon', 'flying']], [
      { maxHp: 40, armor: 2, might: 0.08 },
      { maxHp: 60, might: 0.28, speed: 7, area: 0.1 },
    ]),
  },
  slakoth: {
    name: 'Slakoth',
    color: '#b89878',
    egg: 'ultra',
    // Truant: slow to act but hits hard and dozes back to health. Vigoroth can't sit still.
    stats: { might: 0.15, cooldown: 0.12, speed: -4, regen: 0.2 },
    signature: 'machPunch',
    learnset: ['machPunch', 'crunch', 'earthquake', 'swift', 'quickAttack', 'rockTomb'],
    line: line3(['Slakoth', 287, ['normal']], ['Vigoroth', 288, ['normal']], ['Slaking', 289, ['normal']], [
      { maxHp: 30, cooldown: -0.14, speed: 7, might: 0.05 },
      { maxHp: 75, might: 0.3, cooldown: 0.1, speed: -5 },
    ]),
  },
  feebas: {
    name: 'Feebas',
    color: '#d8a8a0',
    egg: 'ultra',
    // The plainest Pokémon around, until it becomes the most beautiful.
    stats: { maxHp: -20, might: -0.25, regen: 0.1, growth: 0.15 },
    signature: 'whirlpool',
    learnset: ['whirlpool', 'waterGun', 'dragonBreath', 'iceShard', 'disarmingVoice', 'swift'],
    line: line2(['Feebas', 349, ['water']], ['Milotic', 350, ['water']], { maxHp: 95, might: 0.5, regen: 0.8, area: 0.2, armor: 1 }),
  },
  /* ---------- Friendship Egg (only from an invite's Mystery Gift) ---------- */
  munchlax: {
    name: 'Munchlax',
    color: '#3f6f80',
    egg: 'friend',
    stats: { maxHp: 40, armor: 2, regen: 0.25, magnet: 10, speed: -8 },
    signature: 'earthquake',
    learnset: ['earthquake', 'crunch', 'machPunch', 'flashCannon', 'sludgeBomb', 'thunder', 'whirlpool', 'swift'],
    line: line2(['Munchlax', 446, ['normal']], ['Snorlax', 143, ['normal']], { maxHp: 90, armor: 2, might: 0.22, regen: 0.4, area: 0.1 }),
  },
} as const satisfies Record<string, HatchlingDef>

export type HatchlingId = keyof typeof HATCHLINGS

export const HATCHLING_IDS = Object.keys(HATCHLINGS) as HatchlingId[]

/** Every Pokémon a run can start with: the starters plus the hatched families. */
export const PLAYABLE = { ...STARTERS, ...HATCHLINGS }

export type PlayableId = StarterId | HatchlingId

export const PLAYABLE_IDS: readonly PlayableId[] = [...STARTER_IDS, ...HATCHLING_IDS]

export const isHatchling = (id: PlayableId): id is HatchlingId => id in HATCHLINGS

/** Dex numbers of a playable Pokémon's whole evolution line. */
export const playableDex = (id: PlayableId) => PLAYABLE[id].line.map((s) => s.dex)
