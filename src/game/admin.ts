import { parseGiftContent, type GiftContent } from './gifts'
import { isRecord } from './parse'
import { normalizeHandle } from './ranking'

/**
 * The admin's gift desk: whoever's verified email is in the API's
 * `ADMIN_EMAILS` finds a player by handle or email and sends them a Mystery
 * Gift (`server/src/admin.ts`). Who is admin is only ever decided by the API;
 * the game just asks. Pure; shared with the API.
 */

/** A player as the admin's search lists them. `joined` is null for an account that never reached the API (only Clerk knows it). */
export type AdminUser = { id: string; handle: string | null; name: string | null; email: string | null; joined: string | null; seen: string | null }

/** A gift an admin sent, for the desk's recent list. `claimed` once the player's game applied it. */
export type AdminSent = { id: string; handle: string | null; name: string | null; content: GiftContent; at: string; claimed: string | null }

/** What the admin typed: an email (whole or in part), or a handle (with or without `@`). */
export type AdminQuery = { by: 'email'; text: string } | { by: 'handle'; text: string }

/** An email has an `@` after something; a leading `@` is a handle. */
export const parseAdminQuery = (v: unknown): AdminQuery | null => {
  if (typeof v !== 'string') return null
  const text = v.trim().toLowerCase()
  if (text.length > 100) return null
  if (text.indexOf('@') > 0) return { by: 'email', text }
  const handle = normalizeHandle(text)
  return /^[a-z0-9_]{2,20}$/.test(handle) ? { by: 'handle', text: handle } : null
}

/** A gift an admin may send: any content the game knows but a ribbon, which only the Desafio do dia hands out. */
export const parseAdminGift = (v: unknown): GiftContent | null => {
  const content = parseGiftContent(v)
  return content && content.kind !== 'ribbon' ? content : null
}

const text = (v: unknown) => (typeof v === 'string' ? v : null)

const parseUser = (v: unknown): AdminUser | null =>
  isRecord(v) && typeof v.id === 'string'
    ? { id: v.id, handle: text(v.handle), name: text(v.name), email: text(v.email), joined: text(v.joined), seen: text(v.seen) }
    : null

const parseSent = (v: unknown): AdminSent | null => {
  if (!isRecord(v) || typeof v.id !== 'string' || typeof v.at !== 'string') return null
  const content = parseGiftContent(v.content)
  return content && { id: v.id, handle: text(v.handle), name: text(v.name), content, at: v.at, claimed: text(v.claimed) }
}

const list = <T>(v: unknown, parse: (x: unknown) => T | null): T[] => (Array.isArray(v) ? v.map(parse).filter((x): x is T => x !== null) : [])

/** `GET /admin/users`'s `users`. */
export const parseAdminUsers = (v: unknown) => list(v, parseUser)

/** `GET /admin/gifts`'s `gifts`. */
export const parseAdminSent = (v: unknown) => list(v, parseSent)
