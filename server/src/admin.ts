import type { ClerkClient } from '@clerk/backend'
import type { AdminQuery, AdminSent, AdminUser } from '../../src/game/admin'
import type { GiftContent } from '../../src/game/gifts'
import type { Sql } from './db'
import { sendGift } from './gifts'

/** How long the API trusts what Clerk said about a user being admin (or not). */
const ADMIN_TTL_MS = 5 * 60_000

/** Players a search lists at most. */
const RESULTS = 10

/** Gifts the desk's recent list shows. */
const RECENT = 30

/** An email of a Clerk user, and whether its owner proved it's theirs. */
export type EmailRef = { address: string; verified: boolean }

/** Whether one of the user's verified emails is on the allowlist (already lower case). An unverified email never counts. */
export const hasAdminEmail = (emails: readonly EmailRef[], allowlist: readonly string[]) =>
  emails.some((e) => e.verified && allowlist.includes(e.address.trim().toLowerCase()))

type ClerkUser = Awaited<ReturnType<ClerkClient['users']['getUser']>>

const emailsOf = (u: ClerkUser): EmailRef[] => u.emailAddresses.map((e) => ({ address: e.emailAddress, verified: e.verification?.status === 'verified' }))

const primaryEmail = (u: ClerkUser) => (u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId) ?? u.emailAddresses[0])?.emailAddress ?? null

type Row = { id: string; handle: string | null; name: string | null; created_at: Date; seen_at: Date }

/** A request id the desk made for one send (a uuid): retrying it sends nothing twice. */
const REQUEST = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type SendOutcome = 'sent' | 'duplicate' | 'unknown' | 'bad request'

/**
 * The admin's gift desk. Who is admin comes from Clerk, never from the
 * request: a user whose verified email is in `allowlist` (`ADMIN_EMAILS`).
 * The answer is kept a few minutes per user, so the desk's calls don't each
 * ask Clerk. With an empty allowlist nobody is admin and Clerk is never asked.
 *
 * `search` finds players by handle (in our database) or by email (Clerk
 * knows them, we don't store emails), `send` puts a gift in a player's inbox
 * as `{ kind: 'staff', from: <admin's handle> }` and `recent` lists what was sent by hand.
 */
export const adminStore = (sql: Sql, clerk: ClerkClient, allowlist: readonly string[]) => {
  const known = new Map<string, { admin: boolean; until: number }>()

  const isAdmin = async (userId: string) => {
    if (allowlist.length === 0) return false
    const cached = known.get(userId)
    if (cached && cached.until > Date.now()) return cached.admin
    // A Clerk outage answers no without remembering it.
    const user = await clerk.users.getUser(userId).catch(() => null)
    if (!user) return false
    const admin = hasAdminEmail(emailsOf(user), allowlist)
    known.set(userId, { admin, until: Date.now() + ADMIN_TTL_MS })
    return admin
  }

  /** Our rows for these Clerk users, with their emails, in Clerk's order. */
  const join = async (users: readonly ClerkUser[]): Promise<AdminUser[]> => {
    const ids = users.map((u) => u.id)
    const rows = ids.length ? await sql<Row[]>`select id, handle, name, created_at, seen_at from users where id = any(${ids}::text[])` : []
    const byId = new Map(rows.map((r) => [r.id, r]))
    return users.map((u) => {
      const r = byId.get(u.id)
      return { id: u.id, handle: r?.handle ?? null, name: r?.name ?? null, email: primaryEmail(u), joined: r?.created_at.toISOString() ?? null, seen: r?.seen_at.toISOString() ?? null }
    })
  }

  const byHandle = async (handle: string): Promise<AdminUser[]> => {
    const rows = await sql<Row[]>`
      select id, handle, name, created_at, seen_at from users
      where position(${handle} in handle) > 0
      order by handle = ${handle} desc, starts_with(handle, ${handle}) desc, seen_at desc
      limit ${RESULTS}`
    if (rows.length === 0) return []
    const { data } = await clerk.users.getUserList({ userId: rows.map((r) => r.id), limit: RESULTS })
    const emails = new Map(data.map((u) => [u.id, primaryEmail(u)]))
    return rows.map((r) => ({ id: r.id, handle: r.handle, name: r.name, email: emails.get(r.id) ?? null, joined: r.created_at.toISOString(), seen: r.seen_at.toISOString() }))
  }

  const byEmail = async (text: string) => join((await clerk.users.getUserList({ query: text, limit: RESULTS })).data)

  /** Whether `userId` is a player: a row here, or an account Clerk knows that never synced (it gets its row now). */
  const ensureUser = async (userId: string) => {
    const [row] = await sql`select 1 from users where id = ${userId}`
    if (row) return true
    if (!(await clerk.users.getUser(userId).catch(() => null))) return false
    await sql`insert into users (id) values (${userId}) on conflict (id) do nothing`
    return true
  }

  return {
    isAdmin,

    search: (q: AdminQuery) => (q.by === 'email' ? byEmail(q.text) : byHandle(q.text)),

    /** Sends `content` from `adminId` to `userId`. `request` (the desk's uuid for this send) keeps a retry from sending twice. */
    send: async (adminId: string, userId: string, content: GiftContent, request: string): Promise<SendOutcome> => {
      if (!REQUEST.test(request)) return 'bad request'
      if (!(await ensureUser(userId))) return 'unknown'
      const sent = await sql.begin(async (tx) => {
        await tx`insert into users (id) values (${adminId}) on conflict (id) do nothing`
        const [admin] = await tx<{ handle: string | null }[]>`select handle from users where id = ${adminId}`
        return sendGift(tx, userId, content, { kind: 'staff', from: admin?.handle ?? null }, `staff:${request}`, adminId)
      })
      if (sent) console.log(`admin ${adminId} sent ${content.kind} to ${userId}`)
      return sent ? 'sent' : 'duplicate'
    },

    /** The gifts sent by hand, newest first, with whether they were claimed. */
    recent: async (): Promise<AdminSent[]> => {
      const rows = await sql<{ id: string; payload: GiftContent; created_at: Date; claimed_at: Date | null; handle: string | null; name: string | null }[]>`
        select g.id, g.payload, g.created_at, g.claimed_at, u.handle, u.name
        from gifts g join users u on u.id = g.user_id
        where g.sent_by is not null
        order by g.created_at desc limit ${RECENT}`
      return rows.map((r) => ({ id: r.id, handle: r.handle, name: r.name, content: r.payload, at: r.created_at.toISOString(), claimed: r.claimed_at?.toISOString() ?? null }))
    },
  }
}

export type AdminStore = ReturnType<typeof adminStore>
