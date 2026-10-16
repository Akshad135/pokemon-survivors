import { isHatchling, type PlayableId } from '../data/hatchlings'
import { isPollOption, POLL, POLL_OPTION_IDS, SUPPORTER, type PollOptionId } from '../data/supporters'
import type { GiftContent } from './gifts'
import type { Save } from './meta'
import { isRecord, wholeNumber } from './parse'
import { isPlayable } from './ranking'
import { ownsShiny } from './shinyPicks'

/**
 * Apoiadores: a donation linked to an account (by its handle, or with a code
 * redeemed in the game) makes it a supporter. The API counts the donations and
 * sends the tier's thank-you as Mystery Gifts; everything here is cosmetic, so
 * it never touches a run. Pure; shared with the API.
 */

export const SUPPORTER_TIERS = ['supporter', 'gold'] as const

/** `supporter`: donated anything; `gold`: donated `SUPPORTER.gold` points in all. */
export type SupporterTier = (typeof SUPPORTER_TIERS)[number]

export const isSupporterTier = (v: unknown): v is SupporterTier => SUPPORTER_TIERS.some((t) => t === v)

/** Points of a donation of `cents` in `currency` (ISO code, any case): one per centavo, five per US cent. */
export const donationPoints = (cents: number, currency: string) => {
  const rate = currency.toLowerCase() === 'brl' ? SUPPORTER.perCent.brl : SUPPORTER.perCent.usd
  return Math.max(0, Math.round(cents)) * rate
}

/** The tier of a total, or null before any donation. */
export const supporterTier = (points: number): SupporterTier | null => (points >= SUPPORTER.gold ? 'gold' : points > 0 ? 'supporter' : null)

/**
 * What each tier sends once: the title, the frame and a shiny of one's
 * choice on the first donation; the background and the PC wallpaper at gold.
 */
export const TIER_GIFTS: Readonly<Record<SupporterTier, readonly GiftContent[]>> = {
  supporter: [{ kind: 'title', title: 'supporter' }, { kind: 'style', style: { slot: 'frame', id: 'supporter' } }, { kind: 'shinyPick' }],
  gold: [{ kind: 'style', style: { slot: 'background', id: 'supporter' } }, { kind: 'style', style: { slot: 'wallpaper', id: 'supporter' } }],
}

/** Tiers a new total reaches that the old one didn't, lowest first (a first donation of R$ 50 reaches both). */
export const tiersReached = (before: number, after: number): SupporterTier[] =>
  SUPPORTER_TIERS.filter((tier) => {
    const at = tier === 'gold' ? SUPPORTER.gold : 1
    return before < at && after >= at
  })

/** Whether the save got the supporter's thank-you (its title): it unlocks the companion. */
export const isSupporter = (save: Save) => save.titles.includes('supporter')

/* ---------------- Codes ---------------- */

/** Letters and digits that can't be mistaken for each other (no 0/O, 1/I/L). */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

const CODE_LENGTH = 8

/** A code as the player sees it: `PS-ABCD-EFGH`. */
export const formatCode = (raw: string) => `PS-${raw.slice(0, 4)}-${raw.slice(4, 8)}`

/** A fresh code from `random`'s bytes (the server passes `crypto.getRandomValues`). */
export const newCode = (random: (bytes: Uint8Array) => Uint8Array) =>
  formatCode([...random(new Uint8Array(CODE_LENGTH))].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join(''))

/** A typed code, normalized (`ps abcd efgh` → `PS-ABCD-EFGH`), or null when it can't be one. */
export const parseCode = (raw: unknown) => {
  if (typeof raw !== 'string') return null
  const body = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^PS/, '')
  return body.length === CODE_LENGTH && [...body].every((c) => CODE_ALPHABET.includes(c)) ? formatCode(body) : null
}

/* ---------------- Companion ---------------- */

/** A Pokémon that walks after the player in runs, only drawn (it never touches the simulation). */
export type Companion = { id: PlayableId; shiny: boolean }

/** Pokémon the save may take along: every starter and each family hatched, shiny only if owned so. */
export const canWalkWith = (save: Save, c: Companion) => (!isHatchling(c.id) || save.hatched[c.id] !== undefined) && (!c.shiny || ownsShiny(save, c.id))

/** The save's `companion`, or null. */
export const parseCompanion = (v: unknown): Companion | null =>
  isRecord(v) && isPlayable(v.id) ? { id: v.id, shiny: v.shiny === true } : null

/* ---------------- API shapes ---------------- */

/** `GET /donations/:ref`, for the thank-you page: paid yet, the account it went to, or the code to redeem (null once redeemed). */
export type DonationStatus = { paid: boolean; handle: string | null; code: string | null; redeemed: boolean }

/** `GET /me/supporter`: the player's tier (null before donating), since when, whether they show it, and their vote. */
export type SupporterStatus = { tier: SupporterTier | null; since: string | null; public: boolean; vote: PollOptionId | null }

/** One name on the wall (`GET /supporters`). */
export type WallEntry = { handle: string; name: string; tier: SupporterTier; since: string }

/** `GET /poll`: the current poll and its votes per option. */
export type Poll = { id: string; votes: Record<PollOptionId, number> }

const isoOrNull = (v: unknown) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : null)

/** The player's standing from the API, or null when the answer isn't one. */
export const parseSupporterStatus = (v: unknown): SupporterStatus | null =>
  isRecord(v) ? { tier: isSupporterTier(v.tier) ? v.tier : null, since: isoOrNull(v.since), public: v.public !== false, vote: isPollOption(v.vote) ? v.vote : null } : null

/** The wall from the API: its valid entries. */
export const parseWall = (v: unknown): WallEntry[] =>
  Array.isArray(v)
    ? v.flatMap((e: unknown) => {
        if (!isRecord(e) || typeof e.handle !== 'string' || typeof e.name !== 'string' || !isSupporterTier(e.tier)) return []
        const since = isoOrNull(e.since)
        return since ? [{ handle: e.handle, name: e.name, tier: e.tier, since }] : []
      })
    : []

/** A poll from the API, or null when it isn't the current one. */
export const parsePoll = (v: unknown): Poll | null => {
  if (!isRecord(v) || v.id !== POLL.id || !isRecord(v.votes)) return null
  const votes = v.votes
  return { id: POLL.id, votes: Object.fromEntries(POLL_OPTION_IDS.map((id) => [id, wholeNumber(votes[id])])) as Record<PollOptionId, number> }
}
