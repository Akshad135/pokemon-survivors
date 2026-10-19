import type { ClerkClient } from '@clerk/backend'
import { supporterTier, type SupporterTier } from '../../src/game/supporters'
import type { Sql } from './db'
import { idsByName, restClient, type DiscordConfig } from './discord'

/**
 * A game account linked to Discord. The player connects Discord to their
 * Clerk account in the game (or signs up with it); `link` then reads that
 * account from Clerk, remembers its id on `users`, puts the player in the
 * community server (Discord's `guilds.join`, with the OAuth token Clerk keeps)
 * and gives them their supporter role. A donation that raises a linked
 * player's tier updates the role (`syncRoles`). Linking never grants Trainer:
 * that one is earned in #introductions (`discord.ts`).
 */

/** The server's supporter roles, by name (`scripts/discord/setup.mjs`). */
export const SUPPORTER_ROLES = { supporter: 'Supporter', gold: 'Gold Supporter' } as const satisfies Record<SupporterTier, string>

/**
 * The roles a tier adds and removes. Gold replaces Supporter (one heart on
 * the member list); no tier changes nothing, so a role a moderator gave by
 * hand stays (tiers only go up anyway).
 */
export const supporterRoleChanges = (tier: SupporterTier | null): { add: string[]; remove: string[] } =>
  tier === 'gold'
    ? { add: [SUPPORTER_ROLES.gold], remove: [SUPPORTER_ROLES.supporter] }
    : tier === 'supporter'
      ? { add: [SUPPORTER_ROLES.supporter], remove: [] }
      : { add: [], remove: [] }

/** What Clerk says of one of a user's external accounts (the fields `discordAccount` reads). */
export type ExternalAccountInfo = { provider: string; providerUserId: string; username: string | null; verification: { status: string } | null }

/** The user's verified Discord account (`provider` is `discord`, or `oauth_discord` from older APIs), or null. */
export const discordAccount = (accounts: readonly ExternalAccountInfo[]) => {
  const found = accounts.find((a) => (a.provider === 'discord' || a.provider === 'oauth_discord') && a.verification?.status === 'verified' && a.providerUserId)
  return found ? { id: found.providerUserId, username: found.username ?? '' } : null
}

/** What linking came to: `joined` when the player is in the server now (false without the bot or when Discord refused). */
export type LinkResult = { linked: false } | { linked: true; username: string; joined: boolean }

export const discordLink = (sql: Sql, clerk: ClerkClient, bot: DiscordConfig | null) => {
  const call = bot ? restClient(bot.token) : null
  const guild = bot ? `/guilds/${bot.guildId}` : ''
  let roles: Map<string, string> | null = null

  /** The server's role ids by name, read once (again when one is missing, after `setup.mjs` added it). */
  const roleId = async (name: string) => {
    if (!call) return null
    if (!roles?.has(name)) roles = idsByName(await call('GET', `${guild}/roles`))
    return roles.get(name) ?? null
  }

  /** Puts the member's supporter role in line with `tier`. Throws when Discord does (a member who left: 404). */
  const applyRoles = async (discordId: string, tier: SupporterTier | null) => {
    if (!call) return
    const { add, remove } = supporterRoleChanges(tier)
    for (const name of add) {
      const id = await roleId(name)
      if (id) await call('PUT', `${guild}/members/${discordId}/roles/${id}`)
    }
    for (const name of remove) {
      const id = await roleId(name)
      if (id) await call('DELETE', `${guild}/members/${discordId}/roles/${id}`)
    }
  }

  const tierOf = async (userId: string) => {
    const [row] = await sql<{ points: number }[]>`select supporter_points as points from users where id = ${userId}`
    return supporterTier(row?.points ?? 0)
  }

  /** Adds the player to the server with Clerk's token for them (`guilds.join`); already in, Discord just answers 204. */
  const join = async (userId: string, discordId: string) => {
    if (!call) return false
    const { data } = await clerk.users.getUserOauthAccessToken(userId, 'discord')
    const token = data[0]?.token
    if (!token) return false
    await call('PUT', `${guild}/members/${discordId}`, { access_token: token })
    return true
  }

  return {
    /** Reads the player's Discord account from Clerk and links it. Throws when Clerk can't answer. */
    link: async (userId: string): Promise<LinkResult> => {
      const user = await clerk.users.getUser(userId)
      const account = discordAccount(user.externalAccounts)
      if (!account) return { linked: false }
      // One game account per Discord account: Clerk keeps it on one user at a time, so another row holding it is stale (it moved).
      await sql`update users set discord_id = null, discord_name = null where discord_id = ${account.id} and id <> ${userId}`
      await sql`
        insert into users (id, discord_id, discord_name) values (${userId}, ${account.id}, ${account.username})
        on conflict (id) do update set discord_id = excluded.discord_id, discord_name = excluded.discord_name`
      let joined = false
      try {
        joined = await join(userId, account.id)
        if (joined) await applyRoles(account.id, await tierOf(userId))
      } catch (err) {
        console.error(`discord join failed for ${userId}`, err)
      }
      return { linked: true, username: account.username, joined }
    },

    /** Forgets the player's Discord account (they unlinked it). They stay in the server with their roles. */
    unlink: async (userId: string) => {
      await sql`update users set discord_id = null, discord_name = null where id = ${userId}`
    },

    /** Puts a linked player's supporter role in line with their tier (after a donation). Never throws. */
    syncRoles: async (userId: string) => {
      if (!call) return
      try {
        const [row] = await sql<{ discord_id: string | null; points: number }[]>`select discord_id, supporter_points as points from users where id = ${userId}`
        if (row?.discord_id) await applyRoles(row.discord_id, supporterTier(row.points))
      } catch (err) {
        console.error(`discord roles failed for ${userId}`, err)
      }
    },
  }
}

export type DiscordLink = ReturnType<typeof discordLink>
