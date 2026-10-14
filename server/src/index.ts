import { serve } from '@hono/node-server'
import { createApp } from './app'
import { clerkVerifier } from './auth'
import { connect, migrate, saveStore } from './db'
import { createChecks } from './checks'
import { rankingStore } from './ranking'
import { loadEnv } from './env'

const env = loadEnv()
const sql = connect(env.databaseUrl)
await migrate(sql, new URL('../migrations/', import.meta.url))

const ranking = rankingStore(sql)
const checks = createChecks(ranking)
// Runs that were waiting for a check when the last instance stopped.
void checks.resume()

const app = createApp({
  store: saveStore(sql),
  ranking,
  checks,
  verify: clerkVerifier(env),
  allowedOrigin: env.allowedOrigin,
  ping: () => sql`select 1`.then(() => true, () => false),
})

const server = serve({ fetch: app.fetch, port: env.port }, (info) => console.log(`api listening on :${info.port}`))

const shutdown = () => server.close(() => void sql.end({ timeout: 5 }).then(() => process.exit(0)))
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
