import { serve } from '@hono/node-server'
import { createApp } from './app'
import { clerkVerifier } from './auth'
import { connect, migrate, saveStore } from './db'
import { loadEnv } from './env'

const env = loadEnv()
const sql = connect(env.databaseUrl)
await migrate(sql, new URL('../migrations/', import.meta.url))

const app = createApp({
  store: saveStore(sql),
  verify: clerkVerifier(env),
  allowedOrigin: env.allowedOrigin,
  ping: () => sql`select 1`.then(() => true, () => false),
})

const server = serve({ fetch: app.fetch, port: env.port }, (info) => console.log(`api listening on :${info.port}`))

const shutdown = () => server.close(() => void sql.end({ timeout: 5 }).then(() => process.exit(0)))
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
