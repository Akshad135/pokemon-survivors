import { isRecord } from './game/parse'

/**
 * Clerk's token cache judges a session token's age by this device's clock
 * against the token's `iat` (Clerk's clock). On a device whose clock runs
 * behind, it keeps handing out a token past its minute of life, and the API
 * refuses it (401). So `account.ts` reads Clerk's clock off the tokens
 * themselves and asks for a fresh one when the cached one is spent.
 */

/** Seconds before its end that a token no longer counts as good: a call takes a moment to reach the API. */
export const TOKEN_MARGIN = 10

/** `iat` and `exp` (Unix seconds) of a session token, null when it can't be read. */
export const tokenTimes = (jwt: string) => {
  try {
    const payload = jwt.split('.')[1]
    if (!payload) return null
    const claims: unknown = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return isRecord(claims) && typeof claims.iat === 'number' && typeof claims.exp === 'number' ? { iat: claims.iat, exp: claims.exp } : null
  } catch {
    return null
  }
}

/**
 * What a token tells about Clerk's clock: `offset`, how far Clerk's clock runs
 * ahead of this device's (seconds; negative when it runs behind), and whether
 * the token is spent by Clerk's clock. A token can't be issued in the future,
 * so `iat - now` is a lower bound of the offset: the largest one seen so far
 * (`known`, null before any) is the estimate, and a freshly issued token makes
 * it exact.
 */
export const readToken = (jwt: string, known: number | null, now: number) => {
  const times = tokenTimes(jwt)
  if (!times) return { offset: known, spent: false }
  const offset = Math.max(known ?? -Infinity, times.iat - now)
  return { offset, spent: times.exp - (now + offset) < TOKEN_MARGIN }
}
