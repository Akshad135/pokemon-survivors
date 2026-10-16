import { randomFillSync } from 'node:crypto'
import type { TransactionSql } from 'postgres'
import { POLL, POLL_OPTION_IDS, type PollOptionId } from '../../src/data/supporters'
import { donationPoints, newCode, supporterTier, TIER_GIFTS, tiersReached, type SupporterTier } from '../../src/game/supporters'
import type { DonationStatus, Poll, SupporterStatus, WallEntry } from '../../src/game/supporters'
import type { Sql } from './db'
import { sendGift } from './gifts'
import type { PaidDonation } from './webhooks'

/** Names on the wall at most. */
const WALL_SIZE = 500

/**
 * Donations and supporters. A paid donation counts for an account once
 * (`credit`): its points join the account's total, and each tier the total
 * reaches sends its thank-you as Mystery Gifts (`TIER_GIFTS`, `key`
 * `support:<tier>:<i>`, so nothing lands twice). A paid donation with no
 * account gets a code instead, which an account redeems later.
 */
export const supporterStore = (sql: Sql) => {
  /** Credits the donation `id` if it's paid and not credited yet; one with no account just gets its code. */
  const credit = async (tx: TransactionSql, id: string) => {
    const [d] = await tx<{ user_id: string | null; points: number; paid: boolean; credited: boolean; code: string | null }[]>`
      select user_id, points, paid_at is not null as paid, credited_at is not null as credited, code from donations where id = ${id} for update`
    if (!d?.paid || d.credited) return
    if (!d.user_id) {
      if (!d.code) await tx`update donations set code = ${newCode((b) => randomFillSync(b))} where id = ${id}`
      return
    }
    const [user] = await tx<{ points: number }[]>`select supporter_points as points from users where id = ${d.user_id} for update`
    const before = user?.points ?? 0
    const after = before + d.points
    await tx`update users set supporter_points = ${after}, supporter_since = coalesce(supporter_since, now()) where id = ${d.user_id}`
    await tx`update donations set credited_at = now() where id = ${id}`
    for (const tier of tiersReached(before, after)) {
      for (const [i, content] of TIER_GIFTS[tier].entries()) await sendGift(tx, d.user_id, content, { kind: 'support', tier }, `support:${tier}:${i}`)
    }
    console.log(`donation ${id} credited to ${d.user_id} (${before} → ${after} points)`)
  }

  return {
    /** An AbacatePay checkout about to open: its row, for the account of `handle` when given. False when nobody has that handle. */
    open: async (ref: string, handle: string | null) => {
      const [user] = handle ? await sql<{ id: string }[]>`select id from users where handle = ${handle}` : []
      if (handle && !user) return false
      await sql`insert into donations (provider, ref, handle, user_id) values ('abacatepay', ${ref}, ${handle}, ${user?.id ?? null})`
      return true
    },

    /** A webhook said `d` is paid: records it (once, however often the webhook retries) and credits it. */
    paid: (d: PaidDonation) =>
      sql.begin(async (tx) => {
        const points = donationPoints(d.amount, d.currency)
        const [row] = await tx<{ id: string }[]>`
          insert into donations (provider, ref, handle, user_id, amount, currency, points, paid_at)
          values (${d.provider}, ${d.ref}, ${d.handle}, (select id from users where handle = ${d.handle}), ${d.amount}, ${d.currency.toLowerCase()}, ${points}, now())
          on conflict (ref) do update
          set amount = excluded.amount, currency = excluded.currency, points = excluded.points, paid_at = coalesce(donations.paid_at, excluded.paid_at)
          returning id`
        if (row) await credit(tx, row.id)
      }),

    /** What the thank-you page shows for `ref`, or null before any webhook (Stripe's row comes with it). */
    status: async (ref: string): Promise<DonationStatus | null> => {
      const [row] = await sql<{ paid: boolean; handle: string | null; code: string | null; redeemed: boolean }[]>`
        select d.paid_at is not null as paid, u.handle, d.code, d.code is not null and d.user_id is not null as redeemed
        from donations d left join users u on u.id = d.user_id where d.ref = ${ref}`
      if (!row) return null
      // A redeemed code is someone's account now: the page only says it was used.
      return { paid: row.paid, handle: row.redeemed ? null : row.handle, code: row.redeemed ? null : row.code, redeemed: row.redeemed }
    },

    /** Redeems a code for `userId`. `unknown`: no such code; `used`: it went to an account already. */
    redeem: (userId: string, code: string): Promise<{ ok: true; tier: SupporterTier | null } | { ok: false; error: 'unknown' | 'used' }> =>
      sql.begin(async (tx) => {
        await tx`insert into users (id) values (${userId}) on conflict (id) do nothing`
        const [d] = await tx<{ id: string; user_id: string | null }[]>`select id, user_id from donations where code = ${code} for update`
        if (!d) return { ok: false, error: 'unknown' } as const
        if (d.user_id) return { ok: false, error: 'used' } as const
        await tx`update donations set user_id = ${userId} where id = ${d.id}`
        await credit(tx, d.id)
        const [u] = await tx<{ points: number }[]>`select supporter_points as points from users where id = ${userId}`
        return { ok: true, tier: supporterTier(u?.points ?? 0) } as const
      }),

    /** The player's own standing, with their vote in the current poll. */
    mine: async (userId: string): Promise<SupporterStatus> => {
      const [row] = await sql<{ points: number; since: Date | null; public: boolean; vote: string | null }[]>`
        select supporter_points as points, supporter_since as since, supporter_public as public,
          (select choice from poll_votes where poll = ${POLL.id} and user_id = ${userId}) as vote
        from users where id = ${userId}`
      const vote = POLL_OPTION_IDS.find((id) => id === row?.vote) ?? null
      return { tier: supporterTier(row?.points ?? 0), since: row?.since?.toISOString() ?? null, public: row?.public ?? true, vote }
    },

    /** Shows or hides the player's badge and name on the wall and the credits. */
    setPublic: async (userId: string, show: boolean) => {
      await sql`update users set supporter_public = ${show} where id = ${userId}`
    },

    /** Supporters who show themselves and have a handle, oldest first. */
    wall: async (): Promise<WallEntry[]> => {
      const rows = await sql<{ handle: string; name: string | null; points: number; since: Date }[]>`
        select handle, name, supporter_points as points, supporter_since as since from users
        where supporter_points > 0 and supporter_public and handle is not null
        order by supporter_since, id limit ${WALL_SIZE}`
      return rows.flatMap((r) => {
        const tier = supporterTier(r.points)
        return tier ? [{ handle: r.handle, name: r.name ?? r.handle, tier, since: r.since.toISOString() }] : []
      })
    },

    /** The current poll's votes per option. */
    poll: async (): Promise<Poll> => {
      const rows = await sql<{ choice: string; n: number }[]>`select choice, count(*)::int as n from poll_votes where poll = ${POLL.id} group by choice`
      return { id: POLL.id, votes: Object.fromEntries(POLL_OPTION_IDS.map((id) => [id, rows.find((r) => r.choice === id)?.n ?? 0])) as Record<PollOptionId, number> }
    },

    /** A supporter's vote (replacing their previous one). False when `userId` isn't a supporter. */
    vote: async (userId: string, choice: PollOptionId) => {
      const [row] = await sql<{ id: string }[]>`
        insert into poll_votes (poll, user_id, choice)
        select ${POLL.id}, id, ${choice} from users where id = ${userId} and supporter_points > 0
        on conflict (poll, user_id) do update set choice = excluded.choice, voted_at = now()
        returning user_id as id`
      return row !== undefined
    },
  }
}

export type SupporterStore = ReturnType<typeof supporterStore>
