// Every species the game loads, shared by the asset and credits scripts.
// Keep in sync with src/data/starters.ts and src/data/enemies.ts
export const STARTERS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, // Kanto starters + evolutions
  152, 153, 154, 155, 156, 157, 158, 159, 160, // Johto
  252, 253, 254, 255, 256, 257, 258, 259, 260, // Hoenn
  387, 388, 389, 390, 391, 392, 393, 394, 395, // Sinnoh
  495, 496, 497, 498, 499, 500, 501, 502, 503, // Unova
  650, 651, 652, 653, 654, 655, 656, 657, 658, // Kalos
  722, 723, 724, 725, 726, 727, 728, 729, 730, // Alola
  810, 811, 812, 813, 814, 815, 816, 817, 818, // Galar
  906, 907, 908, 909, 910, 911, 912, 913, 914, // Paldea
]
export const HORDE = [10, 13, 16, 19, 21, 23, 41, 43, 46, 48, 56, 66, 74, 92, 109]
export const BOSSES = [95, 143, 144, 145, 146, 150, 151]
/** Map event Pokémon (the fleeing Meowth). Keep in sync with MEOWTH_DEX in src/game/mapEventRules.ts */
export const CRITTERS = [52]
export const DEX = [...STARTERS, ...HORDE, ...BOSSES, ...CRITTERS]
/** Species that can roll shiny: the player line and regular enemies. */
export const SHINY = new Set([...STARTERS, ...HORDE])

export const pad = (n) => String(n).padStart(4, '0')
