import { verifyToken } from '@clerk/backend'
import type { Env } from './env'

/** Turns a bearer token into the player's user id, or null when it isn't a valid session. */
export type Verify = (token: string) => Promise<string | null>

/**
 * Verifies Clerk session tokens. Tokens minted for a page the API doesn't
 * serve (their `azp`) are refused too.
 */
export const clerkVerifier = (env: Pick<Env, 'clerkSecretKey' | 'clerkJwtKey' | 'allowedOrigin'>): Verify => async (token) => {
  try {
    const payload = await verifyToken(token, { secretKey: env.clerkSecretKey, jwtKey: env.clerkJwtKey })
    if (typeof payload.azp === 'string' && !env.allowedOrigin(payload.azp)) return null
    return payload.sub
  } catch {
    return null
  }
}
