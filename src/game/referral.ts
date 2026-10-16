import { parseHandle } from './ranking'

/**
 * Invites: every link the game shares carries the sharer's handle
 * (`?ref=handle`), and a profile link (`?u=handle`) counts too. The first
 * handle a device lands with is kept (first touch), never the player's own,
 * so the sign up can credit whoever brought them. Pure.
 */

/** Query parameter of the inviter's handle on a shared link. */
export const REF_PARAM = 'ref'

/** The handle a landing brings: `?ref=` first, else the profile it opens (`?u=`). Null when neither is a valid handle. */
export const landingRef = (params: URLSearchParams, profileParam: string) => parseHandle(params.get(REF_PARAM)) ?? parseHandle(params.get(profileParam))

/** The ref to keep: the stored one stays (first touch); a landing never stores the player's own handle. */
export const firstTouch = (stored: string | null, landed: string | null, own: string | null) => stored ?? (landed !== null && landed !== own ? landed : null)
