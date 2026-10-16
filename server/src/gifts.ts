import type { GiftContent, GiftReason } from '../../src/game/gifts'
import { canRefer, creditDue, milestoneGifts, WELCOME_GIFT } from '../../src/game/referral'
import type { TransactionSql } from 'postgres'
import type { Sql } from './db'

/** A gift as the API sends it to the game (`parseGift` reads it). */
export type GiftOut = { id: string; content: unknown; reason: unknown; at: string }

/** Gifts listed per call at most: the rest come next sync. */
const INBOX_SIZE = 20

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Mystery Gifts and invites. `send` is the way in for anything that rewards a
 * player outside a run (invites here, the challenge's ribbons in
 * `challenge.ts`): `key` keeps one gift per occasion, so sending again does nothing.
 *
 * Invites: `refer` records who brought a new account (`canRefer`), makes
 * them follow each other and welcomes the newcomer with a Friendship Egg;
 * `credit` (after each verified run) counts the invite for the inviter once
 * the newcomer has enough verified runs (`creditDue`) and sends the
 * milestone gifts (`milestoneGifts`). Everything is counted here, never on the device.
 */
/**
 * Sends a gift inside a transaction (`userId` must have a users row). With a
 * `key`, only the first send of that key lands. `sentBy` is the admin who
 * sent it by hand. Whether it landed now.
 */
export const sendGift = async (q: TransactionSql, userId: string, content: GiftContent, reason: GiftReason | null, key: string | null, sentBy: string | null = null) => {
  const rows = await q`
    insert into gifts (user_id, kind, payload, reason, key, sent_by)
    values (${userId}, ${content.kind}, ${q.json(content)}, ${reason ? q.json(reason) : null}, ${key}, ${sentBy})
    on conflict (user_id, key) do nothing
    returning id`
  return rows.length > 0
}

export const giftStore = (sql: Sql) => {
  return {
    /** Sends a gift to `userId` (who must have a users row). With a `key`, only the first send of that key lands. */
    send: (userId: string, content: GiftContent, reason: GiftReason | null = null, key: string | null = null) =>
      sql.begin((tx) => sendGift(tx, userId, content, reason, key)),

    /** Sends many gifts in one go (a day's ribbons), each like `send`. */
    sendAll: (list: ReadonlyArray<{ userId: string; content: GiftContent; key: string }>) =>
      sql.begin(async (tx) => {
        for (const g of list) await sendGift(tx, g.userId, g.content, null, g.key)
      }),

    /** The player's unclaimed gifts, oldest first. */
    inbox: async (userId: string): Promise<GiftOut[]> => {
      const rows = await sql<{ id: string; payload: unknown; reason: unknown; created_at: Date }[]>`
        select id, payload, reason, created_at from gifts
        where user_id = ${userId} and claimed_at is null
        order by created_at, id limit ${INBOX_SIZE}`
      return rows.map((r) => ({ id: r.id, content: r.payload, reason: r.reason, at: r.created_at.toISOString() }))
    },

    /** Marks the player's gifts with these ids claimed (the game applied them). How many it marked now. */
    claim: async (userId: string, ids: readonly string[]) => {
      const valid = ids.filter((id) => UUID.test(id))
      if (valid.length === 0) return 0
      const rows = await sql`update gifts set claimed_at = now() where user_id = ${userId} and id = any(${valid}::uuid[]) and claimed_at is null returning id`
      return rows.length
    },

    /**
     * A sign up that came with an inviter's handle. Records the invite only
     * for a new account (`canRefer`): both follow each other and the
     * newcomer gets a Friendship Egg. Whether it was recorded.
     */
    refer: (userId: string, handle: string) =>
      sql.begin(async (tx) => {
        await tx`insert into users (id) values (${userId}) on conflict (id) do nothing`
        const [me] = await tx<{ age: number; referred_by: string | null; has_save: boolean }[]>`
          select extract(epoch from now() - created_at)::float8 / 3600 as age, referred_by,
            exists (select 1 from saves where user_id = ${userId}) as has_save
          from users where id = ${userId} for update`
        const [inviter] = await tx<{ id: string; handle: string }[]>`select id, handle from users where handle = ${handle}`
        const ok = canRefer({ userId, referrer: inviter?.id ?? null, ageHours: me?.age ?? Infinity, hasSave: me?.has_save ?? true, referredBy: me?.referred_by ?? null })
        if (!ok || !inviter) return false
        await tx`update users set referred_by = ${inviter.id}, referred_at = now() where id = ${userId}`
        await tx`insert into follows (follower_id, followee_id) values (${userId}, ${inviter.id}), (${inviter.id}, ${userId}) on conflict do nothing`
        await sendGift(tx, userId, WELCOME_GIFT, { kind: 'welcome', from: inviter.handle }, 'welcome')
        return true
      }),

    /**
     * After a verified run of `userId`: if someone brought them and this is
     * the run that makes the invite count, credits it once and sends the
     * inviter the gifts of the milestone their count reaches.
     */
    credit: (userId: string) =>
      sql.begin(async (tx) => {
        const [me] = await tx<{ referred_by: string | null; credited: boolean }[]>`
          select referred_by, referral_credited_at is not null as credited from users where id = ${userId} for update`
        if (!me?.referred_by || me.credited) return
        const [runs] = await tx<{ n: number }[]>`select count(*)::int as n from runs where user_id = ${userId} and verified is true`
        if (!creditDue(runs?.n ?? 0, me.credited)) return
        await tx`update users set referral_credited_at = now() where id = ${userId}`
        // The inviter's row keeps two friends counting at once from reading the same total.
        await tx`select id from users where id = ${me.referred_by} for update`
        const [brought] = await tx<{ n: number }[]>`select count(*)::int as n from users where referred_by = ${me.referred_by} and referral_credited_at is not null`
        const friends = brought?.n ?? 0
        const gifts = milestoneGifts(friends)
        for (const [i, content] of gifts.entries()) await sendGift(tx, me.referred_by, content, { kind: 'friends', count: friends }, `friends:${friends}:${i}`)
        console.log(`invite of ${userId} counted for ${me.referred_by} (${friends} friends, ${gifts.length} gifts)`)
      }),
  }
}

export type GiftStore = ReturnType<typeof giftStore>
