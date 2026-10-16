import { createClerkClient } from '@clerk/backend'
import { serve } from '@hono/node-server'
import { adminStore } from './admin'
import { createApp } from './app'
import { clerkVerifier } from './auth'
import { connect, migrate, saveStore } from './db'
import { createChecks } from './checks'
import { createRibbons } from './challenge'
import { abacatePay } from './donations'
import { giftStore } from './gifts'
import { rankingStore } from './ranking'
import { supporterStore } from './supporters'
import { loadEnv } from './env'

const env = loadEnv()
const sql = connect(env.databaseUrl)
await migrate(sql, new URL('../migrations/', import.meta.url))

const ranking = rankingStore(sql)
const gifts = giftStore(sql)
const checks = createChecks(ranking, gifts.credit)
// Runs that were waiting for a check when the last instance stopped.
void checks.resume()
// The Desafio do dia's ribbons, once a day closes (safe on every instance: each gift has a key per day).
createRibbons(ranking, gifts).start()

const app = createApp({
  store: saveStore(sql),
  ranking,
  gifts,
  checks,
  verify: clerkVerifier(env),
  donate: env.abacatePayKey ? abacatePay(env.abacatePayKey) : null,
  supporters: supporterStore(sql),
  admin: adminStore(sql, createClerkClient({ secretKey: env.clerkSecretKey }), env.adminEmails),
  webhooks: { stripeSecret: env.stripeWebhookSecret, stripePaymentLink: env.stripePaymentLink, abacatePaySecret: env.abacatePayWebhookSecret },
  allowedOrigin: env.allowedOrigin,
  ping: () => sql`select 1`.then(() => true, () => false),
})

const server = serve({ fetch: app.fetch, port: env.port }, (info) => console.log(`api listening on :${info.port}`))

const shutdown = () => server.close(() => void sql.end({ timeout: 5 }).then(() => process.exit(0)))
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
