import { isRecord } from './parse'

/**
 * The idea board (Ideias): players suggest things for the game, everyone
 * with an account votes them up or down, and the admin marks the ones that
 * shipped (`server/src/suggestions.ts`). Pure; shared with the API.
 */

/** Lengths in characters (code points), how many ideas a player may post in 24 hours, and how many a list shows. */
export const SUGGESTION = { title: { min: 6, max: 80 }, body: { max: 500 }, perDay: 3, list: 100 } as const

/** The board's tabs: open ideas by votes or newest first, and the ones that shipped. */
export const SUGGESTION_SORTS = ['top', 'new', 'done'] as const

export type SuggestionSort = (typeof SUGGESTION_SORTS)[number]

/** `hidden`: taken off the board by the admin (spam, offensive). Only the admin sets a status. */
export const SUGGESTION_STATUSES = ['open', 'done', 'hidden'] as const

export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number]

/** A player's vote on an idea: up, down or none. */
export type Vote = -1 | 0 | 1

/** An idea as the board lists it, with the asker's own vote and whether they posted it. */
export type Suggestion = {
  id: string
  title: string
  body: string
  /** Who posted it. */
  handle: string
  name: string
  status: Exclude<SuggestionStatus, 'hidden'>
  /** Up votes minus down votes. */
  score: number
  at: string
  doneAt: string | null
  vote: Vote
  mine: boolean
}

/** What a player typed to post an idea, once cleaned up. */
export type SuggestionDraft = { title: string; body: string }

export const isSuggestionSort = (v: unknown): v is SuggestionSort => SUGGESTION_SORTS.some((s) => s === v)

export const isSuggestionStatus = (v: unknown): v is SuggestionStatus => SUGGESTION_STATUSES.some((s) => s === v)

export const isVote = (v: unknown): v is Vote => v === -1 || v === 0 || v === 1

const length = (s: string) => [...s].length

// Control and invisible formatting characters (zero-width, bidi overrides). Whitespace ones are collapsed instead.
const INVISIBLE = /(?!\s)[\p{Cc}\p{Cf}]/gu

/**
 * Cleans what a player typed: whitespace collapsed to single spaces, no
 * control or invisible characters, the title on one line, the body with at
 * most one blank line in a row. Null when the title is too short or either
 * is too long.
 */
export const parseSuggestionDraft = (v: unknown): SuggestionDraft | null => {
  if (!isRecord(v) || typeof v.title !== 'string' || (v.body !== undefined && typeof v.body !== 'string')) return null
  const title = v.title.replace(INVISIBLE, '').replace(/\s+/g, ' ').trim()
  const body = (v.body ?? '')
    .replace(INVISIBLE, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  const { min, max } = SUGGESTION.title
  if (length(title) < min || length(title) > max || length(body) > SUGGESTION.body.max) return null
  return { title, body }
}

/** Pressing ▲ (1) or ▼ (-1): the same vote again takes it back. */
export const nextVote = (current: Vote, pressed: 1 | -1): Vote => (current === pressed ? 0 : pressed)

/** The idea once the asker's vote is `vote`, before the API confirms it. */
export const withVote = (s: Suggestion, vote: Vote): Suggestion => ({ ...s, vote, score: s.score - s.vote + vote })

/** One idea from the API (`POST /suggestions` answers the one just posted). */
export const parseSuggestion = (v: unknown): Suggestion | null => {
  if (!isRecord(v) || typeof v.id !== 'string' || typeof v.title !== 'string' || typeof v.handle !== 'string' || typeof v.at !== 'string') return null
  if ((v.status !== 'open' && v.status !== 'done') || typeof v.score !== 'number') return null
  return {
    id: v.id,
    title: v.title,
    body: typeof v.body === 'string' ? v.body : '',
    handle: v.handle,
    name: typeof v.name === 'string' ? v.name : v.handle,
    status: v.status,
    score: v.score,
    at: v.at,
    doneAt: typeof v.doneAt === 'string' ? v.doneAt : null,
    vote: isVote(v.vote) ? v.vote : 0,
    mine: v.mine === true,
  }
}

/** `GET /suggestions`'s `suggestions`. */
export const parseSuggestions = (v: unknown): Suggestion[] => (Array.isArray(v) ? v.map(parseSuggestion).filter((s): s is Suggestion => s !== null) : [])
