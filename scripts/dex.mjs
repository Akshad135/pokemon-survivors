// Every species the game loads, shared by the asset and credits scripts.
// Keep in sync with src/data/starters.ts and src/data/enemies.ts; the wild
// horde comes from src/data/roster.generated.json (npm run roster).
import roster from '../src/data/roster.generated.json' with { type: 'json' }

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
/** Families that hatch from eggs (src/data/hatchlings.ts), whole lines. Some also roam the horde. */
export const HATCHLINGS = [
  172, 25, 26, 66, 67, 68, 133, 197, 175, 176, 468, 363, 364, 365, 396, 397, 398, 406, 315, 407, 744, 745, 736, 737, 738, // common
  92, 93, 94, 63, 64, 65, 280, 281, 282, 447, 448, 570, 571, 636, 637, 714, 715, 679, 680, 681, 848, 849, 957, 958, 959, 935, 936, // rare
  147, 148, 149, 246, 247, 248, 374, 375, 376, 443, 444, 445, 885, 886, 887, // ultra rare
  // Gen 1-3 families
  16, 17, 18, 41, 42, 169, 60, 61, 62, 74, 75, 76, 179, 180, 181,
  298, 183, 184, 285, 286, 220, 221, 473, 361, 362, // common
  58, 59, 37, 38, 104, 105, 123, 212, 129, 130, 116, 117, 230, 140, 141, 228, 229, 216, 217,
  304, 305, 306, 328, 329, 330, 333, 334, 309, 310, 353, 354, // rare
  371, 372, 373, 287, 288, 289, 349, 350, // ultra rare
  446, 143, // Friendship Egg (invites)
]
export const HORDE = Object.values(roster).map((s) => s.dex)
/** Horde species with a behavior trait (`src/data/enemies.ts`), plus Nidoqueen's summons. */
export const TRAITS = [29, 31, 32, 81, 100, 101, 106, 113, 437]
/** Wave bosses: Onix, Snorlax, the three legendary trios (one drawn per run), Mewtwo and the rare mythicals. */
export const BOSSES = [95, 143, 144, 145, 146, 243, 244, 245, 377, 378, 379, 150, 151, 251, 385]
/** Map event Pokémon (the fleeing Meowth). Keep in sync with MEOWTH_DEX in src/game/mapEventRules.ts */
export const CRITTERS = [52]
/** Rift legendaries (src/data/rifts.ts), which can also roll shiny. */
export const RIFT_LEGENDS = [249, 250, 382, 383, 384, 483, 380, 381, 386]
/** Arceus, the endless mode's reaper. */
export const REAPER = [493]
export const DEX = [...new Set([...STARTERS, ...HATCHLINGS, ...HORDE, ...TRAITS, ...BOSSES, ...CRITTERS, ...RIFT_LEGENDS, ...REAPER])]
/** Species that can roll shiny: the player lines, regular enemies and rift legendaries. */
export const SHINY = new Set([...STARTERS, ...HATCHLINGS, ...HORDE, ...TRAITS, ...RIFT_LEGENDS])

/**
 * Alternate formes the game draws, by key, mapped to their SpriteCollab form id
 * (`sprite/<dex>/<id>/`, shiny under `<id>/0001/`). They land in
 * `public/assets/pokemon/<dex>/<key>/` and under `forms.<key>` in the manifest.
 */
export const FORMS = {
  681: { blade: '0001' }, // Aegislash's Blade Forme (Stance Change)
  // Mega Evolutions (src/data/megas.ts). Only these Megas have sprites on SpriteCollab so far; the
  // others wear their final stage's sprite until theirs land there (then add the form id here).
  6: { megaX: '0001' },
  65: { mega: '0001' },
  94: { mega: '0001' },
  229: { mega: '0001' },
  248: { mega: '0001' },
  282: { mega: '0001' },
  310: { mega: '0001' },
  334: { mega: '0001' },
  354: { mega: '0001' },
  362: { mega: '0001' },
  448: { mega: '0001' },
}

/**
 * Forms with a cry of their own, by key, mapped to their PokeAPI Pokémon name, with or without
 * sheets in `FORMS`. The cry lands in `public/assets/pokemon/<dex>/<key>/cry.ogg` and the key in
 * the species' `formCries` in the manifest.
 */
export const FORM_CRIES = {
  3: { mega: 'venusaur-mega' },
  6: { megaX: 'charizard-mega-x', megaY: 'charizard-mega-y' },
  9: { mega: 'blastoise-mega' },
  18: { mega: 'pidgeot-mega' },
  26: { megaX: 'raichu-mega-x', megaY: 'raichu-mega-y' },
  65: { mega: 'alakazam-mega' },
  94: { mega: 'gengar-mega' },
  130: { mega: 'gyarados-mega' },
  149: { mega: 'dragonite-mega' },
  154: { mega: 'meganium-mega' },
  160: { mega: 'feraligatr-mega' },
  181: { mega: 'ampharos-mega' },
  212: { mega: 'scizor-mega' },
  229: { mega: 'houndoom-mega' },
  248: { mega: 'tyranitar-mega' },
  254: { mega: 'sceptile-mega' },
  257: { mega: 'blaziken-mega' },
  260: { mega: 'swampert-mega' },
  282: { mega: 'gardevoir-mega' },
  306: { mega: 'aggron-mega' },
  310: { mega: 'manectric-mega' },
  334: { mega: 'altaria-mega' },
  354: { mega: 'banette-mega' },
  362: { mega: 'glalie-mega' },
  373: { mega: 'salamence-mega' },
  376: { mega: 'metagross-mega' },
  398: { mega: 'staraptor-mega' },
  445: { mega: 'garchomp-mega', megaZ: 'garchomp-mega-z' },
  448: { mega: 'lucario-mega', megaZ: 'lucario-mega-z' },
  500: { mega: 'emboar-mega' },
  652: { mega: 'chesnaught-mega' },
  655: { mega: 'delphox-mega' },
  658: { mega: 'greninja-mega' },
}

export const pad = (n) => String(n).padStart(4, '0')
