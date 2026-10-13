import type { MoveId } from '../game/moves'
import type { StatDelta } from '../game/stats'
import type { PokeType } from './types'

export type EvolutionStage = {
  dex: number
  name: string
  types: readonly PokeType[]
  /** Level at which this stage evolves into the next one. */
  evolveAt?: number
  /** Stat bonus granted when reaching this stage. */
  bonus: StatDelta
}

export type StarterDef = {
  name: string
  blurb: string
  color: string
  stats: StatDelta
  /** Move the run starts with. */
  signature: MoveId
  /** Moves this Pokémon can learn on level up (signature included). */
  learnset: readonly MoveId[]
  line: readonly [EvolutionStage, EvolutionStage, EvolutionStage]
}

/** Builds a 3-stage line that evolves at Lv 12 and Lv 28. */
const line = (
  [a, b, c]: readonly [string, string, string],
  dex: number,
  types: readonly [readonly PokeType[], readonly PokeType[], readonly PokeType[]],
  bonuses: readonly [StatDelta, StatDelta],
) =>
  [
    { dex, name: a, types: types[0], evolveAt: 12, bonus: {} },
    { dex: dex + 1, name: b, types: types[1], evolveAt: 28, bonus: bonuses[0] },
    { dex: dex + 2, name: c, types: types[2], bonus: bonuses[1] },
  ] as const satisfies StarterDef['line']

export const STARTERS = {
  /* ---------- Kanto ---------- */
  bulbasaur: {
    name: 'Bulbasaur',
    blurb: 'Equilibrado. Regenera vida.',
    color: '#78c850',
    stats: { regen: 0.4, maxHp: 10 },
    signature: 'razorLeaf',
    learnset: ['razorLeaf', 'vineWhip', 'sludgeBomb', 'earthquake', 'swift', 'thunder', 'gust'],
    line: line(['Bulbasaur', 'Ivysaur', 'Venusaur'], 1, [['grass', 'poison'], ['grass', 'poison'], ['grass', 'poison']], [
      { maxHp: 30, regen: 0.4, might: 0.08 },
      { maxHp: 45, regen: 0.6, might: 0.15, area: 0.15 },
    ]),
  },
  charmander: {
    name: 'Charmander',
    blurb: 'Ofensivo. Mais dano, menos vida.',
    color: '#f08030',
    stats: { might: 0.15, maxHp: -10 },
    signature: 'ember',
    learnset: ['ember', 'fireSpin', 'gust', 'crunch', 'swift', 'thunder', 'sludgeBomb'],
    line: line(['Charmander', 'Charmeleon', 'Charizard'], 4, [['fire'], ['fire'], ['fire', 'flying']], [
      { maxHp: 25, might: 0.1, speed: 3 },
      { maxHp: 40, might: 0.2, speed: 6, area: 0.1 },
    ]),
  },
  squirtle: {
    name: 'Squirtle',
    blurb: 'Defensivo. Mais vida e defesa.',
    color: '#6890f0',
    stats: { maxHp: 20, armor: 1, speed: -3 },
    signature: 'waterGun',
    learnset: ['waterGun', 'whirlpool', 'flashCannon', 'swift', 'thunder', 'sludgeBomb', 'gust'],
    line: line(['Squirtle', 'Wartortle', 'Blastoise'], 7, [['water'], ['water'], ['water']], [
      { maxHp: 35, armor: 1, might: 0.05 },
      { maxHp: 50, armor: 2, might: 0.15, amount: 1 },
    ]),
  },

  /* ---------- Johto ---------- */
  chikorita: {
    name: 'Chikorita',
    blurb: 'Curandeira. Muita vida e regeneração.',
    color: '#a8d868',
    stats: { maxHp: 25, regen: 0.3, speed: -4, might: -0.05 },
    signature: 'vineWhip',
    learnset: ['vineWhip', 'razorLeaf', 'disarmingVoice', 'earthquake', 'swift', 'sludgeBomb'],
    line: line(['Chikorita', 'Bayleef', 'Meganium'], 152, [['grass'], ['grass'], ['grass']], [
      { maxHp: 30, regen: 0.3, area: 0.05 },
      { maxHp: 55, regen: 0.7, armor: 1, area: 0.15 },
    ]),
  },
  cyndaquil: {
    name: 'Cyndaquil',
    blurb: 'Labaredas. Golpes maiores e mais longos.',
    color: '#f8a040',
    stats: { area: 0.15, duration: 0.15, maxHp: -5 },
    signature: 'fireSpin',
    learnset: ['fireSpin', 'ember', 'earthquake', 'swift', 'thunder', 'gust'],
    line: line(['Cyndaquil', 'Quilava', 'Typhlosion'], 155, [['fire'], ['fire'], ['fire']], [
      { maxHp: 25, might: 0.08, area: 0.1 },
      { maxHp: 40, might: 0.18, area: 0.15, speed: 4 },
    ]),
  },
  totodile: {
    name: 'Totodile',
    blurb: 'Brigão. Mordidas fortes e casca grossa.',
    color: '#58a8e8',
    stats: { might: 0.12, armor: 1, speed: -2 },
    signature: 'crunch',
    learnset: ['crunch', 'waterGun', 'whirlpool', 'earthquake', 'machPunch', 'swift'],
    line: line(['Totodile', 'Croconaw', 'Feraligatr'], 158, [['water'], ['water'], ['water']], [
      { maxHp: 30, might: 0.1, armor: 1 },
      { maxHp: 50, might: 0.22, armor: 1, speed: 3 },
    ]),
  },

  /* ---------- Hoenn ---------- */
  treecko: {
    name: 'Treecko',
    blurb: 'Veloz. Corre muito, mas é frágil.',
    color: '#58b858',
    stats: { speed: 10, cooldown: -0.06, maxHp: -15 },
    signature: 'leafBlade',
    learnset: ['leafBlade', 'razorLeaf', 'vineWhip', 'crunch', 'swift', 'thunder'],
    line: line(['Treecko', 'Grovyle', 'Sceptile'], 252, [['grass'], ['grass'], ['grass']], [
      { maxHp: 20, speed: 4, cooldown: -0.04 },
      { maxHp: 35, speed: 6, might: 0.15, cooldown: -0.06 },
    ]),
  },
  torchic: {
    name: 'Torchic',
    blurb: 'Lutador. Chutes de fogo cada vez mais fortes.',
    color: '#f87838',
    stats: { might: 0.1, speed: 4, maxHp: -5 },
    signature: 'ember',
    learnset: ['ember', 'machPunch', 'fireSpin', 'gust', 'swift', 'thunder'],
    line: line(['Torchic', 'Combusken', 'Blaziken'], 255, [['fire'], ['fire', 'fighting'], ['fire', 'fighting']], [
      { maxHp: 25, might: 0.12, speed: 3 },
      { maxHp: 40, might: 0.25, speed: 4 },
    ]),
  },
  mudkip: {
    name: 'Mudkip',
    blurb: 'Tanque. Aguenta pancada e revida no chão.',
    color: '#4890d8',
    stats: { maxHp: 30, armor: 1, speed: -5 },
    signature: 'whirlpool',
    learnset: ['whirlpool', 'waterGun', 'earthquake', 'machPunch', 'sludgeBomb', 'swift'],
    line: line(['Mudkip', 'Marshtomp', 'Swampert'], 258, [['water'], ['water', 'ground'], ['water', 'ground']], [
      { maxHp: 35, armor: 1, might: 0.05 },
      { maxHp: 60, armor: 2, might: 0.12, area: 0.1 },
    ]),
  },

  /* ---------- Sinnoh ---------- */
  turtwig: {
    name: 'Turtwig',
    blurb: 'Fortaleza. Lento, blindado e sísmico.',
    color: '#88b848',
    stats: { maxHp: 40, armor: 2, speed: -9, cooldown: 0.05 },
    signature: 'earthquake',
    learnset: ['earthquake', 'razorLeaf', 'leafBlade', 'crunch', 'vineWhip', 'swift'],
    line: line(['Turtwig', 'Grotle', 'Torterra'], 387, [['grass'], ['grass'], ['grass', 'ground']], [
      { maxHp: 40, armor: 1, might: 0.05 },
      { maxHp: 70, armor: 2, might: 0.15, area: 0.2 },
    ]),
  },
  chimchar: {
    name: 'Chimchar',
    blurb: 'Ágil. Combos rápidos de socos.',
    color: '#e86830',
    stats: { speed: 8, cooldown: -0.08, maxHp: -10 },
    signature: 'machPunch',
    learnset: ['machPunch', 'ember', 'fireSpin', 'earthquake', 'swift', 'thunder'],
    line: line(['Chimchar', 'Monferno', 'Infernape'], 390, [['fire'], ['fire', 'fighting'], ['fire', 'fighting']], [
      { maxHp: 25, speed: 3, might: 0.1 },
      { maxHp: 35, speed: 5, might: 0.2, cooldown: -0.06 },
    ]),
  },
  piplup: {
    name: 'Piplup',
    blurb: 'Orgulhoso. Defesa e disparos de aço.',
    color: '#5878c8',
    stats: { armor: 1, might: 0.05, projectileSpeed: 0.1 },
    signature: 'flashCannon',
    learnset: ['flashCannon', 'waterGun', 'whirlpool', 'gust', 'swift', 'thunder'],
    line: line(['Piplup', 'Prinplup', 'Empoleon'], 393, [['water'], ['water'], ['water', 'steel']], [
      { maxHp: 30, armor: 1, might: 0.06 },
      { maxHp: 45, armor: 2, might: 0.16, area: 0.1 },
    ]),
  },

  /* ---------- Unova ---------- */
  snivy: {
    name: 'Snivy',
    blurb: 'Elegante. Rápido e com ímã maior.',
    color: '#68b848',
    stats: { speed: 6, cooldown: -0.05, magnet: 12 },
    signature: 'vineWhip',
    learnset: ['vineWhip', 'leafBlade', 'razorLeaf', 'gust', 'swift', 'sludgeBomb'],
    line: line(['Snivy', 'Servine', 'Serperior'], 495, [['grass'], ['grass'], ['grass']], [
      { maxHp: 25, speed: 3, cooldown: -0.04 },
      { maxHp: 40, speed: 5, might: 0.14, area: 0.1 },
    ]),
  },
  tepig: {
    name: 'Tepig',
    blurb: 'Pesado. Muita vida e golpes brutos.',
    color: '#e86040',
    stats: { maxHp: 25, might: 0.08, speed: -4 },
    signature: 'fireSpin',
    learnset: ['fireSpin', 'ember', 'machPunch', 'earthquake', 'crunch', 'swift'],
    line: line(['Tepig', 'Pignite', 'Emboar'], 498, [['fire'], ['fire', 'fighting'], ['fire', 'fighting']], [
      { maxHp: 30, might: 0.08 },
      { maxHp: 55, might: 0.2, armor: 1 },
    ]),
  },
  oshawott: {
    name: 'Oshawott',
    blurb: 'Espadachim. Cortes de concha em arco.',
    color: '#68a8e0',
    stats: { might: 0.06, armor: 1 },
    signature: 'razorShell',
    learnset: ['razorShell', 'waterGun', 'whirlpool', 'crunch', 'swift', 'gust'],
    line: line(['Oshawott', 'Dewott', 'Samurott'], 501, [['water'], ['water'], ['water']], [
      { maxHp: 30, might: 0.08, area: 0.05 },
      { maxHp: 45, might: 0.18, armor: 1, area: 0.1 },
    ]),
  },

  /* ---------- Kalos ---------- */
  chespin: {
    name: 'Chespin',
    blurb: 'Espinhoso. Defesa alta, soca de perto.',
    color: '#80b050',
    stats: { maxHp: 25, armor: 2, speed: -6 },
    signature: 'razorLeaf',
    learnset: ['razorLeaf', 'vineWhip', 'machPunch', 'earthquake', 'swift', 'sludgeBomb'],
    line: line(['Chespin', 'Quilladin', 'Chesnaught'], 650, [['grass'], ['grass'], ['grass', 'fighting']], [
      { maxHp: 35, armor: 1, might: 0.05 },
      { maxHp: 60, armor: 2, might: 0.15, area: 0.1 },
    ]),
  },
  fennekin: {
    name: 'Fennekin',
    blurb: 'Mística. Poderes psíquicos e área maior.',
    color: '#f09048',
    stats: { area: 0.1, duration: 0.2, might: 0.05, maxHp: -10 },
    signature: 'psyshock',
    learnset: ['psyshock', 'ember', 'fireSpin', 'disarmingVoice', 'swift', 'thunder'],
    line: line(['Fennekin', 'Braixen', 'Delphox'], 653, [['fire'], ['fire'], ['fire', 'psychic']], [
      { maxHp: 20, might: 0.1, area: 0.05 },
      { maxHp: 35, might: 0.2, area: 0.15, cooldown: -0.05 },
    ]),
  },
  froakie: {
    name: 'Froakie',
    blurb: 'Ninja. Muito rápido, pouca vida.',
    color: '#58a0d8',
    stats: { speed: 12, projectileSpeed: 0.15, maxHp: -20 },
    signature: 'waterShuriken',
    learnset: ['waterShuriken', 'waterGun', 'crunch', 'whirlpool', 'swift', 'gust'],
    line: line(['Froakie', 'Frogadier', 'Greninja'], 656, [['water'], ['water'], ['water', 'dark']], [
      { maxHp: 20, speed: 4, might: 0.08 },
      { maxHp: 30, speed: 6, might: 0.2, amount: 1 },
    ]),
  },

  /* ---------- Alola ---------- */
  rowlet: {
    name: 'Rowlet',
    blurb: 'Arqueiro. Flechas rápidas e certeiras.',
    color: '#a8a060',
    stats: { projectileSpeed: 0.1, magnet: 15, might: 0.05 },
    signature: 'spiritShackle',
    learnset: ['spiritShackle', 'razorLeaf', 'leafBlade', 'gust', 'swift', 'sludgeBomb'],
    line: line(['Rowlet', 'Dartrix', 'Decidueye'], 722, [['grass', 'flying'], ['grass', 'flying'], ['grass', 'ghost']], [
      { maxHp: 25, might: 0.08, projectileSpeed: 0.05 },
      { maxHp: 40, might: 0.18, projectileSpeed: 0.1, amount: 1 },
    ]),
  },
  litten: {
    name: 'Litten',
    blurb: 'Lutador sombrio. Dano alto e resistente.',
    color: '#d84848',
    stats: { might: 0.12, maxHp: 5, speed: -2 },
    signature: 'ember',
    learnset: ['ember', 'crunch', 'fireSpin', 'machPunch', 'earthquake', 'swift'],
    line: line(['Litten', 'Torracat', 'Incineroar'], 725, [['fire'], ['fire'], ['fire', 'dark']], [
      { maxHp: 30, might: 0.1, armor: 1 },
      { maxHp: 55, might: 0.22, armor: 1 },
    ]),
  },
  popplio: {
    name: 'Popplio',
    blurb: 'Artista. Canta, cura e acerta em volta.',
    color: '#78b8f0',
    stats: { regen: 0.25, area: 0.1, duration: 0.1 },
    signature: 'disarmingVoice',
    learnset: ['disarmingVoice', 'waterGun', 'whirlpool', 'psyshock', 'swift', 'thunder'],
    line: line(['Popplio', 'Brionne', 'Primarina'], 728, [['water'], ['water'], ['water', 'fairy']], [
      { maxHp: 25, regen: 0.3, area: 0.05 },
      { maxHp: 40, regen: 0.5, might: 0.15, area: 0.1 },
    ]),
  },

  /* ---------- Galar ---------- */
  grookey: {
    name: 'Grookey',
    blurb: 'Ritmado. Ondas que freiam a horda.',
    color: '#68b040',
    stats: { area: 0.15, maxHp: 10, cooldown: 0.03 },
    signature: 'drumBeating',
    learnset: ['drumBeating', 'razorLeaf', 'leafBlade', 'vineWhip', 'earthquake', 'swift'],
    line: line(['Grookey', 'Thwackey', 'Rillaboom'], 810, [['grass'], ['grass'], ['grass']], [
      { maxHp: 30, might: 0.08, area: 0.05 },
      { maxHp: 50, might: 0.18, area: 0.15, armor: 1 },
    ]),
  },
  scorbunny: {
    name: 'Scorbunny',
    blurb: 'Artilheiro. Chutes explosivos e velocidade.',
    color: '#f05838',
    stats: { speed: 10, might: 0.08, maxHp: -15 },
    signature: 'pyroBall',
    learnset: ['pyroBall', 'ember', 'machPunch', 'fireSpin', 'swift', 'thunder'],
    line: line(['Scorbunny', 'Raboot', 'Cinderace'], 813, [['fire'], ['fire'], ['fire']], [
      { maxHp: 25, speed: 3, might: 0.1 },
      { maxHp: 35, speed: 5, might: 0.22, area: 0.1 },
    ]),
  },
  sobble: {
    name: 'Sobble',
    blurb: 'Atirador. Projéteis rápidos e fortes.',
    color: '#5898e0',
    stats: { projectileSpeed: 0.25, might: 0.1, maxHp: -15, speed: -2 },
    signature: 'waterGun',
    learnset: ['waterGun', 'waterShuriken', 'whirlpool', 'swift', 'sludgeBomb', 'thunder'],
    line: line(['Sobble', 'Drizzile', 'Inteleon'], 816, [['water'], ['water'], ['water']], [
      { maxHp: 20, might: 0.1, projectileSpeed: 0.1 },
      { maxHp: 35, might: 0.22, projectileSpeed: 0.15, amount: 1 },
    ]),
  },

  /* ---------- Paldea ---------- */
  sprigatito: {
    name: 'Sprigatito',
    blurb: 'Trapaceira. Recarga curta e mais EXP.',
    color: '#78c068',
    stats: { cooldown: -0.06, growth: 0.1, maxHp: -5 },
    signature: 'leafBlade',
    learnset: ['leafBlade', 'razorLeaf', 'crunch', 'swift', 'gust', 'sludgeBomb'],
    line: line(['Sprigatito', 'Floragato', 'Meowscarada'], 906, [['grass'], ['grass'], ['grass', 'dark']], [
      { maxHp: 25, might: 0.08, cooldown: -0.03 },
      { maxHp: 35, might: 0.2, speed: 4, cooldown: -0.05 },
    ]),
  },
  fuecoco: {
    name: 'Fuecoco',
    blurb: 'Tranquilo. Muita vida e canções de fogo.',
    color: '#f06848',
    stats: { maxHp: 30, regen: 0.15, speed: -6 },
    signature: 'torchSong',
    learnset: ['torchSong', 'ember', 'spiritShackle', 'crunch', 'earthquake', 'swift'],
    line: line(['Fuecoco', 'Crocalor', 'Skeledirge'], 909, [['fire'], ['fire'], ['fire', 'ghost']], [
      { maxHp: 35, might: 0.08, regen: 0.15 },
      { maxHp: 60, might: 0.18, regen: 0.3, area: 0.1 },
    ]),
  },
  quaxly: {
    name: 'Quaxly',
    blurb: 'Dançarino. Gira na água e golpeia.',
    color: '#68a8f0',
    stats: { speed: 6, might: 0.06, duration: 0.1 },
    signature: 'whirlpool',
    learnset: ['whirlpool', 'waterGun', 'machPunch', 'razorShell', 'gust', 'swift'],
    line: line(['Quaxly', 'Quaxwell', 'Quaquaval'], 912, [['water'], ['water'], ['water', 'fighting']], [
      { maxHp: 25, speed: 3, might: 0.08 },
      { maxHp: 40, speed: 5, might: 0.2, cooldown: -0.05 },
    ]),
  },
} as const satisfies Record<string, StarterDef>

export type StarterId = keyof typeof STARTERS

export const STARTER_IDS = Object.keys(STARTERS) as StarterId[]

export const starterDex = (id: StarterId) => STARTERS[id].line.map((s) => s.dex)

export type Region = { name: string; gen: number; starters: readonly [StarterId, StarterId, StarterId] }

/** Main-series regions, in release order, each with its grass/fire/water trio. */
export const REGIONS: readonly Region[] = [
  { name: 'Kanto', gen: 1, starters: ['bulbasaur', 'charmander', 'squirtle'] },
  { name: 'Johto', gen: 2, starters: ['chikorita', 'cyndaquil', 'totodile'] },
  { name: 'Hoenn', gen: 3, starters: ['treecko', 'torchic', 'mudkip'] },
  { name: 'Sinnoh', gen: 4, starters: ['turtwig', 'chimchar', 'piplup'] },
  { name: 'Unova', gen: 5, starters: ['snivy', 'tepig', 'oshawott'] },
  { name: 'Kalos', gen: 6, starters: ['chespin', 'fennekin', 'froakie'] },
  { name: 'Alola', gen: 7, starters: ['rowlet', 'litten', 'popplio'] },
  { name: 'Galar', gen: 8, starters: ['grookey', 'scorbunny', 'sobble'] },
  { name: 'Paldea', gen: 9, starters: ['sprigatito', 'fuecoco', 'quaxly'] },
]
