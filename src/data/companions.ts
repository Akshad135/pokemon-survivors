/**
 * Companions that aren't playable (`game/supporters.ts`): a Mystery Gift's
 * alone, they only walk along. `sparkles: 'candy'` leaves candy sparkles
 * behind it as it walks (`render/companion.ts`). No shiny forms.
 */
export const SPECIAL_COMPANIONS = {
  /** The Noite das Bruxas supporters' (`game/halloween.ts`). */
  pumpkaboo: { name: 'Pumpkaboo', dex: 710, sparkles: 'candy' },
} as const satisfies Record<string, { name: string; dex: number; sparkles?: 'candy' }>

export type SpecialCompanionId = keyof typeof SPECIAL_COMPANIONS

export const SPECIAL_COMPANION_IDS = Object.keys(SPECIAL_COMPANIONS) as SpecialCompanionId[]

export const isSpecialCompanion = (v: unknown): v is SpecialCompanionId => SPECIAL_COMPANION_IDS.some((id) => id === v)
