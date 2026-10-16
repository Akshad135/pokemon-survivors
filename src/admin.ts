import { accountUserId } from './account'
import { apiCall } from './api'
import { parseAdminSent, parseAdminUsers, type AdminSent, type AdminUser } from './game/admin'
import type { GiftContent } from './game/gifts'
import { isRecord } from './game/parse'

/**
 * The admin's gift desk, the game's side (`game/admin.ts`). Only the API
 * decides who is admin: this just asks, to show the desk's button, and every
 * call is checked again there.
 */

let asked: { userId: string; admin: Promise<boolean> } | null = null

/** Whether the signed-in player is admin, asked once per account per page (a failure asks again next time). */
export const isAdmin = () => {
  const userId = accountUserId()
  if (!userId) return Promise.resolve(false)
  if (asked?.userId !== userId) {
    const admin = apiCall('/admin', { auth: true }).then(({ status }) => {
      if (status === 0) asked = null
      return status === 200
    })
    asked = { userId, admin }
  }
  return asked.admin
}

/** Players whose handle has `q`, or whose email does (an `@` after something). Null when the API can't be reached. */
export const findPlayers = async (q: string): Promise<AdminUser[] | null> => {
  const { status, body } = await apiCall(`/admin/users?q=${encodeURIComponent(q)}`, { auth: true })
  return status === 200 && isRecord(body) ? parseAdminUsers(body.users) : null
}

/** How a send went: `sent`, `again` (that `request` already went), `unknown` (no such player) or `failed`. */
export type Sent = 'sent' | 'again' | 'unknown' | 'failed'

/** Sends `content` to the player. `request` is a uuid for this send, so a retry never sends twice. */
export const sendGift = async (userId: string, content: GiftContent, request: string): Promise<Sent> => {
  const { status, body } = await apiCall('/admin/gifts', { method: 'POST', body: { userId, content, request }, auth: true })
  if (status === 404) return 'unknown'
  if (status !== 200 || !isRecord(body)) return 'failed'
  return body.sent === true ? 'sent' : 'again'
}

/** The latest gifts sent by hand, newest first, or null when the API can't be reached. */
export const sentGifts = async (): Promise<AdminSent[] | null> => {
  const { status, body } = await apiCall('/admin/gifts', { auth: true })
  return status === 200 && isRecord(body) ? parseAdminSent(body.gifts) : null
}
