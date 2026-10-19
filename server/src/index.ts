import { createClerkClient } from '@clerk/backend'
import { serve } from '@hono/node-server'
import { adminStore } from './admin'
import { createApp } from './app'
import { clerkVerifier } from './auth'
import { connect, migrate, saveStore } from './db'
import { createChecks } from './checks'
import { createRibbons } from './challenge'
import { discordStore, startDiscord } from './discord'
import { discordLink } from './discordLink'
import { abacatePay } from './donations'
import { giftStore } from './gifts'
import { rankingStore } from './ranking'
import { supporterStore } from './supporters'
import { suggestionStore } from './suggestions'
import { loadEnv } from './env'
import { errorReports } from './errors'

const env = loadEnv()
const errors = errorReports(env.posthogKey)
const sql = connect(env.databaseUrl)
await migrate(sql, new URL('../migrations/', import.meta.url))

const clerk = createClerkClient({ secretKey: env.clerkSecretKey })
const ranking = rankingStore(sql)
// The player's Discord account: linking joins them to the server; a donation that raises their tier updates their role.
const discord = discordLink(sql, clerk, env.discord)
const gifts = giftStore(sql)
const checks = createChecks(ranking)
// Runs that were waiting for a check when the last instance stopped.
void checks.resume()
// Invites that came due, and milestones reached, while no instance was counting.
void gifts.settle().catch((err) => console.error('invites settle failed', err))
// The Desafio do dia's ribbons, once a day closes (safe on every instance: each gift has a key per day).
createRibbons(ranking, gifts).start()
// The community Discord's bot: introduction gate, patch notes, daily posts (only with its env).
if (env.discord) startDiscord(env.discord, { store: discordStore(sql), ranking })

const app = createApp({
  store: saveStore(sql),
  ranking,
  gifts,
  checks,
  verify: clerkVerifier(env),
  donate: env.abacatePayKey ? abacatePay(env.abacatePayKey) : null,
  supporters: supporterStore(sql, { onTierUp: (userId) => void discord.syncRoles(userId) }),
  discord,
  suggestions: suggestionStore(sql),
  admin: adminStore(sql, clerk, env.adminEmails),
  webhooks: { stripeSecret: env.stripeWebhookSecret, stripePaymentLink: env.stripePaymentLink, abacatePaySecret: env.abacatePayWebhookSecret },
  allowedOrigin: env.allowedOrigin,
  ping: () => sql`select 1`.then(() => true, () => false),
  report: errors.report,
})

const server = serve({ fetch: app.fetch, port: env.port }, (info) => console.log(`api listening on :${info.port}`))

const shutdown = () => server.close(() => void Promise.all([sql.end({ timeout: 5 }), errors.flush()]).then(() => process.exit(0)))
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
