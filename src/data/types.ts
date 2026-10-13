export const POKE_TYPES = [
  'normal', 'fire', 'water', 'grass', 'electric', 'poison', 'flying',
  'bug', 'rock', 'ground', 'ghost', 'fighting', 'psychic', 'ice',
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
}

/** Official chart, restricted to the types we use. Missing entries are 1x. */
const CHART: Partial<Record<PokeType, Partial<Record<PokeType, number>>>> = {
  normal: { rock: 0.5, ghost: 0 },
  fire: { grass: 2, bug: 2, ice: 2, fire: 0.5, water: 0.5, rock: 0.5 },
  water: { fire: 2, rock: 2, ground: 2, water: 0.5, grass: 0.5 },
  grass: { water: 2, rock: 2, ground: 2, fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5 },
  electric: { water: 2, flying: 2, grass: 0.5, electric: 0.5, ground: 0 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5 },
  flying: { grass: 2, bug: 2, fighting: 2, electric: 0.5, rock: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5 },
  ice: { grass: 2, ground: 2, flying: 2, fire: 0.5, water: 0.5, ice: 0.5 },
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
