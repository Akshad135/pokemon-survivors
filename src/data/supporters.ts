/**
 * Supporters: what a donation counts for (`game/supporters.ts` has the rules).
 * Donations add up as points, one per centavo, so the tiers read the same in
 * reais and dollars. Any donation makes a supporter; `gold` is the cumulative
 * total for the gold tier (R$ 50, or US$ 10).
 */
export const SUPPORTER = {
  gold: 5000,
  /** Points per cent of each currency. Stripe may charge in another one: those count as dollars. */
  perCent: { brl: 1, usd: 5 },
  /** Names on the victory screen's thanks, at most. */
  credits: 40,
} as const

/**
 * Supporters vote on the next family to hatch from eggs. A new poll is a new
 * `id` (the old votes stay under the old one); each option is a base form the
 * game already has sprites for (it walks in the wild horde).
 */
export const POLL = {
  id: '2026-11',
  options: [
    { id: 'axew', name: 'Axew', dex: 610 },
    { id: 'absol', name: 'Absol', dex: 359 },
    { id: 'duskull', name: 'Duskull', dex: 355 },
    { id: 'sableye', name: 'Sableye', dex: 302 },
    { id: 'wooper', name: 'Wooper', dex: 194 },
  ],
} as const

export type PollOptionId = (typeof POLL.options)[number]['id']

export const POLL_OPTION_IDS: readonly PollOptionId[] = POLL.options.map((o) => o.id)

export const isPollOption = (v: unknown): v is PollOptionId => POLL_OPTION_IDS.some((id) => id === v)
