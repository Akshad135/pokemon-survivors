import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'
import { createMiddleware } from 'hono/factory'
import { logger } from 'hono/logger'
import { parseSaveData } from '../../src/game/meta'
import { isRecord } from '../../src/game/parse'
import type { Verify } from './auth'
import type { SaveStore } from './db'

export type AppDeps = {
  store: SaveStore
  verify: Verify
  allowedOrigin: (origin: string) => boolean
  /** Whether the database answers, for `/health`. */
  ping: () => Promise<boolean>
}

type Auth = { Variables: { userId: string } }

/**
 * The HTTP API. Every route under `/save` needs a Clerk session token
 * (`Authorization: Bearer …`) and acts on that player's save.
 *
 * - `GET /health`: 200 while the database answers, else 503.
 * - `GET /save`: the stored save and its revision, 404 before the first push.
 * - `PUT /save` `{ save, base }`: pushes the device's save on top of revision
 *   `base` (null if it never synced). Returns `{ save, revision, merged }`,
 *   what is stored now, for the device to keep (see `applyPush`).
 */
export const createApp = ({ store, verify, allowedOrigin, ping }: AppDeps) => {
  const app = new Hono()

  app.use(logger())
  app.use(cors({ origin: (origin) => (allowedOrigin(origin) ? origin : null), allowMethods: ['GET', 'PUT'], allowHeaders: ['Authorization', 'Content-Type'], maxAge: 86400 }))

  app.get('/health', async (c) => ((await ping()) ? c.json({ ok: true }) : c.json({ ok: false }, 503)))

  const auth = createMiddleware<Auth>(async (c, next) => {
    const token = c.req.header('Authorization')?.match(/^Bearer (.+)$/)?.[1]
    const userId = token ? await verify(token) : null
    if (!userId) return c.json({ error: 'unauthorized' }, 401)
    c.set('userId', userId)
    await next()
  })

  app.get('/save', auth, async (c) => {
    const stored = await store.read(c.var.userId)
    return stored ? c.json(stored) : c.json({ error: 'no save yet' }, 404)
  })

  app.put('/save', auth, bodyLimit({ maxSize: 256 * 1024 }), async (c) => {
    const body: unknown = await c.req.json().catch(() => null)
    if (!isRecord(body) || !isRecord(body.save)) return c.json({ error: 'expected { save, base }' }, 400)
    const base = typeof body.base === 'number' && Number.isInteger(body.base) ? body.base : null
    return c.json(await store.push(c.var.userId, { save: parseSaveData(body.save), base }))
  })

  app.onError((err, c) => {
    console.error(err)
    return c.json({ error: 'internal error' }, 500)
  })

  return app
}
