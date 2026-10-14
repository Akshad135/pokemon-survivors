import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'
import { createMiddleware } from 'hono/factory'
import { logger } from 'hono/logger'
import { isDifficulty } from '../../src/game/difficulty'
import { parseSaveData } from '../../src/game/meta'
import { isRecord } from '../../src/game/parse'
import { isBoardPeriod, isPlayable, parseDisplayName, parseHandle, parseRunResult } from '../../src/game/ranking'
import type { Verify } from './auth'
import type { SaveStore } from './db'
import type { RankingStore } from './ranking'

export type AppDeps = {
  store: SaveStore
  ranking: RankingStore
  verify: Verify
  allowedOrigin: (origin: string) => boolean
  /** Whether the database answers, for `/health`. */
  ping: () => Promise<boolean>
}

type Auth = { Variables: { userId: string } }

type MaybeAuth = { Variables: { userId: string | null } }

/** What a run's end answers when it's refused, by `FinishError`. */
const FINISH_ERRORS = { unknown: 404, mismatch: 409, clock: 422 } as const

/**
 * The HTTP API. Routes marked (auth) need a Clerk session token
 * (`Authorization: Bearer …`) and act on that player; the public ones read it
 * when present (to answer "me" and "following").
 *
 * - `GET /health`: 200 while the database answers, else 503.
 * - `GET /save` (auth): the stored save and its revision, 404 before the first push.
 * - `PUT /save` (auth) `{ save, base }`: pushes the device's save on top of
 *   revision `base` (null if it never synced). Returns `{ save, revision, merged }`,
 *   what is stored now, for the device to keep (see `applyPush`).
 * - `GET /me` (auth): `{ profile }`, the player's handle and name, null before they pick them.
 * - `PUT /me` (auth) `{ handle, name }`: sets them. 409 `{ suggestion }` when the handle is taken.
 * - `POST /runs` (auth): `{ token }` for a run that just started. 429 past the start rate limit.
 * - `PUT /runs/:token` (auth) `RunResult`: records how it ended and returns `{ ranks }`.
 *   400 for an implausible result, 404 for an unknown token, 409 when it
 *   contradicts what the run already recorded, 422 when the clock can't fit it.
 * - `GET /boards/:difficulty?period=day|week|all&starter=&friends=1`: `Board`.
 *   `friends` needs a token.
 * - `GET /profiles/:handle`: `PublicProfile`, 404 if nobody has that handle.
 * - `PUT|DELETE /follows/:handle` (auth): follows or unfollows. `{ followed, followers }`.
 */
export const createApp = ({ store, ranking, verify, allowedOrigin, ping }: AppDeps) => {
  const app = new Hono()

  app.use(logger())
  app.use(cors({ origin: (origin) => (allowedOrigin(origin) ? origin : null), allowMethods: ['GET', 'PUT', 'POST', 'DELETE'], allowHeaders: ['Authorization', 'Content-Type'], maxAge: 86400 }))

  app.get('/health', async (c) => ((await ping()) ? c.json({ ok: true }) : c.json({ ok: false }, 503)))

  const bearer = (header: string | undefined) => header?.match(/^Bearer (.+)$/)?.[1]

  const auth = createMiddleware<Auth>(async (c, next) => {
    const token = bearer(c.req.header('Authorization'))
    const userId = token ? await verify(token) : null
    if (!userId) return c.json({ error: 'unauthorized' }, 401)
    c.set('userId', userId)
    await next()
  })

  /** Public routes: a valid token says who's asking, anything else reads as a guest. */
  const maybeAuth = createMiddleware<MaybeAuth>(async (c, next) => {
    const token = bearer(c.req.header('Authorization'))
    c.set('userId', token ? await verify(token) : null)
    await next()
  })

  const smallBody = bodyLimit({ maxSize: 4 * 1024 })

  const json = (c: { req: { json: () => Promise<unknown> } }) => c.req.json().catch(() => null)

  app.get('/save', auth, async (c) => {
    const stored = await store.read(c.var.userId)
    return stored ? c.json(stored) : c.json({ error: 'no save yet' }, 404)
  })

  app.put('/save', auth, bodyLimit({ maxSize: 256 * 1024 }), async (c) => {
    const body = await json(c)
    if (!isRecord(body) || !isRecord(body.save)) return c.json({ error: 'expected { save, base }' }, 400)
    const base = typeof body.base === 'number' && Number.isInteger(body.base) ? body.base : null
    return c.json(await store.push(c.var.userId, { save: parseSaveData(body.save), base }))
  })

  app.get('/me', auth, async (c) => c.json({ profile: await ranking.profileName(c.var.userId) }))

  app.put('/me', auth, smallBody, async (c) => {
    const body = await json(c)
    const handle = isRecord(body) ? parseHandle(body.handle) : null
    const name = isRecord(body) ? parseDisplayName(body.name) : null
    if (!handle || !name) return c.json({ error: 'invalid handle or name' }, 400)
    const set = await ranking.setProfileName(c.var.userId, { handle, name })
    return set.ok ? c.json({ profile: { handle, name } }) : c.json({ error: 'taken', suggestion: set.suggestion }, 409)
  })

  app.post('/runs', auth, async (c) => {
    const token = await ranking.startRun(c.var.userId)
    return token ? c.json({ token }, 201) : c.json({ error: 'too many runs' }, 429)
  })

  app.put('/runs/:token', auth, smallBody, async (c) => {
    const result = parseRunResult(await json(c))
    if (!result) return c.json({ error: 'implausible result' }, 400)
    const finished = await ranking.finishRun(c.var.userId, c.req.param('token'), result)
    if (!finished.ok) return c.json({ error: finished.error }, FINISH_ERRORS[finished.error])
    return c.json({ ranks: await ranking.runRanks(c.var.userId, result.difficulty) })
  })

  app.get('/boards/:difficulty', maybeAuth, async (c) => {
    const difficulty = c.req.param('difficulty')
    const period = c.req.query('period') ?? 'all'
    const starter = c.req.query('starter') || null
    const friends = c.req.query('friends') === '1'
    if (!isDifficulty(difficulty) || !isBoardPeriod(period) || (starter !== null && !isPlayable(starter))) return c.json({ error: 'unknown board' }, 400)
    if (friends && !c.var.userId) return c.json({ error: 'unauthorized' }, 401)
    return c.json(await ranking.board({ difficulty, period, starter, friends, viewer: c.var.userId }))
  })

  app.get('/profiles/:handle', maybeAuth, async (c) => {
    const handle = parseHandle(c.req.param('handle'))
    const profile = handle ? await ranking.profile(handle, c.var.userId) : null
    return profile ? c.json(profile) : c.json({ error: 'no such player' }, 404)
  })

  for (const [method, on] of [['put', true], ['delete', false]] as const) {
    app[method]('/follows/:handle', auth, async (c) => {
      const handle = parseHandle(c.req.param('handle'))
      const followed = handle ? await ranking.follow(c.var.userId, handle, on) : null
      return followed ? c.json(followed) : c.json({ error: 'no such player' }, 404)
    })
  }

  app.onError((err, c) => {
    console.error(err)
    return c.json({ error: 'internal error' }, 500)
  })

  return app
}
