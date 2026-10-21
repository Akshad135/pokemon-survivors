import type { PokeType } from './types'

/**
 * Companions that aren't playable (`game/supporters.ts`): a Mystery Gift's
 * alone, they only walk along. `sparkles: 'candy'` leaves candy sparkles
 * behind it as it walks (`render/companion.ts`). `shiny: 'gold'`: Gold
 * supporters may take it along shiny; the rest never walk shiny.
 */
export const SPECIAL_COMPANIONS = {
  /** The Noite das Bruxas supporters' (`game/halloween.ts`), shiny for the Gold ones. */
  pumpkaboo: { name: 'Pumpkaboo', dex: 710, types: ['ghost', 'grass'], sparkles: 'candy', shiny: 'gold' },
} as const satisfies Record<string, { name: string; dex: number; types: readonly PokeType[]; sparkles?: 'candy'; shiny?: 'gold' }>

export type SpecialCompanionId = keyof typeof SPECIAL_COMPANIONS

export const SPECIAL_COMPANION_IDS = Object.keys(SPECIAL_COMPANIONS) as SpecialCompanionId[]

export const isSpecialCompanion = (v: unknown): v is SpecialCompanionId => SPECIAL_COMPANION_IDS.some((id) => id === v)
