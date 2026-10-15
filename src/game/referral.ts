import type { GiftContent } from './gifts'
import { parseHandle } from './ranking'

/**
 * Invites: every link the game shares carries the sharer's handle
 * (`?ref=handle`), and a profile link (`?u=handle`) counts too. The first
 * handle a device lands with is kept (first touch), never the player's own,
 * so the sign up can credit whoever brought them. The API decides whether
 * an invite counts and what it pays (`canRefer`, `creditDue`,
 * `milestoneGifts`), sent as Mystery Gifts (`gifts.ts`). Pure.
 */

/** Query parameter of the inviter's handle on a shared link. */
export const REF_PARAM = 'ref'

/** The handle a landing brings: `?ref=` first, else the profile it opens (`?u=`). Null when neither is a valid handle. */
export const landingRef = (params: URLSearchParams, profileParam: string) => parseHandle(params.get(REF_PARAM)) ?? parseHandle(params.get(profileParam))

/** The ref to keep: the stored one stays (first touch); a landing never stores the player's own handle. */
export const firstTouch = (stored: string | null, landed: string | null, own: string | null) => stored ?? (landed !== null && landed !== own ? landed : null)

/* ---------------- Rewards (the API counts them) ---------------- */

export const REFERRAL = {
  /** Verified runs the friend must play before the invite counts for whoever brought them. */
  verifiedRuns: 3,
  /** How old an account may be for its sign up to credit an invite. */
  newAccountHours: 48,
} as const

/** What the API knows of a sign up that brings an inviter's handle. */
export type SignUp = {
  userId: string
  /** The inviter's user id, null when nobody has that handle. */
  referrer: string | null
  /** Hours since the account first reached the API. */
  ageHours: number
  /** Whether the account already stored a save (it isn't new to the game). */
  hasSave: boolean
  /** Who already got the credit for this account, if anyone. */
  referredBy: string | null
}

/** An invite counts only for a new account (no save yet, created lately, not credited before), and never for oneself. */
export const canRefer = (s: SignUp) =>
  s.referrer !== null && s.referrer !== s.userId && s.referredBy === null && !s.hasSave && s.ageHours <= REFERRAL.newAccountHours

/** Whether a friend's verified runs now credit their inviter (once). */
export const creditDue = (verifiedRuns: number, credited: boolean) => !credited && verifiedRuns >= REFERRAL.verifiedRuns

/** The newcomer's gift on signing up with an invite: a Friendship Egg. */
export const WELCOME_GIFT: GiftContent = { kind: 'egg', tier: 'friend' }

/** Gifts for whoever brings friends, by how many have counted so far. */
export const FRIEND_MILESTONES: Readonly<Record<number, readonly GiftContent[]>> = {
  1: [{ kind: 'egg', tier: 'friend' }],
  3: [{ kind: 'title', title: 'ambassador' }, { kind: 'style', style: { slot: 'frame', id: 'ambassador' } }],
  10: [{ kind: 'shinyHatch', family: 'munchlax' }],
}

/** The gifts that reaching `friends` friends brings (none between milestones). */
export const milestoneGifts = (friends: number): readonly GiftContent[] => FRIEND_MILESTONES[friends] ?? []
