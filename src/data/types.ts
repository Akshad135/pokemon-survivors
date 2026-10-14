export const POKE_TYPES = [
  'normal', 'fire', 'water', 'grass', 'electric', 'poison', 'flying',
  'bug', 'rock', 'ground', 'ghost', 'fighting', 'psychic', 'ice',
  'steel', 'dark', 'fairy', 'dragon',
] as const

export type PokeType = (typeof POKE_TYPES)[number]

export const TYPE_COLORS: Record<PokeType, string> = {
  normal: '#a8a878',
  fire: '#f08030',
  water: '#6890f0',
  grass: '#78c850',
  electric: '#f8d030',
  poison: '#a040a0',
  flying: '#a890f0',
  bug: '#a8b820',
  rock: '#b8a038',
  ground: '#e0c068',
  ghost: '#705898',
  fighting: '#c03028',
  psychic: '#f85888',
  ice: '#98d8d8',
  steel: '#b8b8d0',
  dark: '#705848',
  fairy: '#ee99ac',
  dragon: '#7038f8',
}

/** Official chart, restricted to the types we use. Missing entries are 1x. */
const CHART: Partial<Record<PokeType, Partial<Record<PokeType, number>>>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { grass: 2, bug: 2, ice: 2, steel: 2, fire: 0.5, water: 0.5, rock: 0.5, dragon: 0.5 },
  water: { fire: 2, rock: 2, ground: 2, water: 0.5, grass: 0.5, dragon: 0.5 },
  grass: { water: 2, rock: 2, ground: 2, fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, steel: 0.5, dragon: 0.5 },
  electric: { water: 2, flying: 2, grass: 0.5, electric: 0.5, dragon: 0.5, ground: 0 },
  poison: { grass: 2, fairy: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0 },
  flying: { grass: 2, bug: 2, fighting: 2, electric: 0.5, rock: 0.5, steel: 0.5 },
  bug: { grass: 2, psychic: 2, dark: 2, fire: 0.5, fighting: 0.5, poison: 0.5, flying: 0.5, ghost: 0.5, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, flying: 2, bug: 2, ice: 2, fighting: 0.5, ground: 0.5, steel: 0.5 },
  ground: { fire: 2, electric: 2, poison: 2, rock: 2, steel: 2, grass: 0.5, bug: 0.5, flying: 0 },
  ghost: { ghost: 2, psychic: 2, dark: 0.5, normal: 0 },
  fighting: { normal: 2, rock: 2, steel: 2, dark: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, fairy: 0.5, ghost: 0 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, steel: 0.5, dark: 0 },
  ice: { grass: 2, ground: 2, flying: 2, dragon: 2, fire: 0.5, water: 0.5, ice: 0.5, steel: 0.5 },
  steel: { rock: 2, fairy: 2, ice: 2, fire: 0.5, water: 0.5, electric: 0.5, steel: 0.5 },
  dark: { psychic: 2, ghost: 2, fighting: 0.5, dark: 0.5, fairy: 0.5 },
  fairy: { fighting: 2, dark: 2, dragon: 2, fire: 0.5, poison: 0.5, steel: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
}

/**
 * Damage multiplier for an attack type against a (possibly dual-typed) target.
 * The raw chart is softened so immunities never fully nullify a build:
 * 4x→2, 2x→1.5, ½→0.75, ¼ and 0→0.5.
 */
export const effectiveness = (attack: PokeType, defender: readonly PokeType[]) => {
  const raw = defender.reduce((m, t) => m * (CHART[attack]?.[t] ?? 1), 1)
  if (raw >= 4) return 2
  if (raw >= 2) return 1.5
  if (raw === 1) return 1
  if (raw >= 0.5) return 0.75
  return 0.5
}
