import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'
import { createMiddleware } from 'hono/factory'
import { logger } from 'hono/logger'
import { parseAdminGift, parseAdminQuery } from '../../src/game/admin'
import { challengeOpen } from '../../src/game/challenge'
import { parseDonation } from '../../src/data/donations'
import { isPollOption } from '../../src/data/supporters'
import { isDayKey } from '../../src/game/day'
import { isDifficulty } from '../../src/game/difficulty'
import { parseSaveData } from '../../src/game/meta'
import { isRecord } from '../../src/game/parse'
import { isBoardPeriod, isPlayable, parseDisplayName, parseHandle, parseRunResult } from '../../src/game/ranking'
import { parseReplay } from '../../src/game/replay'
import { parseCode } from '../../src/game/supporters'
import type { AdminStore } from './admin'
import type { Verify } from './auth'
import type { Checks } from './checks'
import type { SaveStore } from './db'
import type { Donate } from './donations'
import type { GiftStore } from './gifts'
import type { RankingStore } from './ranking'
import type { SupporterStore } from './supporters'
import { abacateDonation, ABACATE_REF, stripeDonation, verifyAbacate, verifyStandard, verifyStripe } from './webhooks'

export type AppDeps = {
  store: SaveStore
  ranking: RankingStore
  gifts: Pick<GiftStore, 'inbox' | 'claim' | 'refer'>
  /** Re-simulates finished runs after the answer went out. */
  checks: Pick<Checks, 'schedule'>
  verify: Verify
  /** Donation checkouts (AbacatePay), null when the server has no key for them. */
  donate: Donate | null
  supporters: SupporterStore
  /** The gift desk: who is admin (asked of Clerk), finding players and sending them gifts. */
  admin: Pick<AdminStore, 'isAdmin' | 'search' | 'send' | 'recent'>
  /** Webhook secrets: Stripe's signing secret and Payment Link, AbacatePay's URL secret. Unset ones answer 503. */
  webhooks: { stripeSecret?: string; stripePaymentLink: string | null; abacatePaySecret?: string }
  allowedOrigin: (origin: string) => boolean
  /** Whether the database answers, for `/health`. */
  ping: () => Promise<boolean>
}

type Auth = { Variables: { userId: string } }

type MaybeAuth = { Variables: { userId: string | null } }

/** Where donors land when the site that sent them isn't one we know. */
const SITE = 'https://www.pokemonsurvivors.com'

/** A same-site path to come back to (`/apoie/`, `/en/support/`). */
const SITE_PATH = /^\/[a-z0-9/-]{0,40}$/

/** A donation's `ref`: our uuid (AbacatePay) or a Stripe Checkout Session id. */
const DONATION_REF = /^(?:[0-9a-f-]{36}|cs_(?:test|live)_[A-Za-z0-9]{10,200})$/

/** What a hand-sent gift answers when it doesn't go, by `SendOutcome`. */
const SEND_ERRORS = { unknown: 404, 'bad request': 400 } as const

/** What a run's end answers when it's refused, by `FinishError`. */
const FINISH_ERRORS = { unknown: 404, mismatch: 409, clock: 422, challenge: 400 } as const

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
 * - `POST /runs` (auth) `{ challenge? }`: `{ token }` for a run that just started. 429 past the start rate limit.
 *   With `challenge` (a `YYYY-MM-DD` Brasília day) it's that day's Desafio do dia, 400 when
 *   that day's challenge isn't open (`challengeOpen`).
 * - `PUT /runs/:token` (auth) `RunResult & { replay }`: records how it ended and
 *   returns `{ ranks, challenge }` (`ChallengePlace`, null for any other run); the
 *   replay is re-simulated afterwards (`checks.ts`). A challenge run's replay must
 *   be its day's challenge.
 *   400 for an implausible result or a replay of another run, 404 for an
 *   unknown token, 409 when it contradicts what the run already recorded, 422
 *   when the clock can't fit it. A body without a replay (an older game) is
 *   taken and stays unverified.
 * - `GET /boards/:difficulty?period=day|week|all&starter=&friends=1`: `Board`.
 *   `friends` needs a token.
 * - `GET /challenge/:day?friends=1`: `ChallengeBoard`, the day's official attempts. `friends` needs a token.
 * - `GET /profiles/:handle`: `PublicProfile`, 404 if nobody has that handle.
 * - `PUT|DELETE /follows/:handle` (auth): follows or unfollows. `{ followed, followers }`.
 * - `GET /gifts` (auth): `{ gifts }`, the player's unclaimed Mystery Gifts, oldest first.
 * - `POST /gifts/claim` (auth) `{ ids }`: marks those gifts claimed (the game applied them). `{ claimed }`.
 * - `POST /referral` (auth) `{ ref }`: the inviter's handle a new account came with. `{ referred }`:
 *   whether it counted (only a new account, never oneself: `canRefer`).
 * - `POST /donations` `{ amount, page, handle? }`: `{ url }`, an AbacatePay checkout (Pix or a
 *   Brazilian card) for `amount` whole reais (`parseDonation`), for the account of `handle`
 *   (400 when nobody has it). The donor comes back to `page` on the site, with
 *   `?thanks=<ref>` once paid. 503 without an AbacatePay key.
 * - `GET /donations/:ref`: `DonationStatus`, for the thank-you page (404 until the payment is known).
 * - `POST /donations/redeem` (auth) `{ code }`: credits a donation's code to the player. `{ tier }`;
 *   404 for an unknown code, 409 for one already used.
 * - `POST /webhooks/stripe`, `POST /webhooks/abacatepay`: the payment providers say a donation is paid
 *   (signed: `webhooks.ts`; AbacatePay's the Standard Webhooks way, or with `?webhookSecret=` for an
 *   older webhook). 401 for a bad signature, 503 without the secret.
 * - `GET /me/supporter` (auth): `SupporterStatus`. `PUT /me/supporter` (auth) `{ public }`: shows or hides the badge and name.
 * - `GET /supporters`: `{ supporters }`, the wall (`WallEntry[]`).
 * - `GET /poll`: `Poll`. `PUT /poll` (auth) `{ choice }`: a supporter's vote, 403 for anyone else.
 * - `/admin…` (admin): the gift desk, 403 for anyone whose verified email isn't in `ADMIN_EMAILS`.
 *   `GET /admin`: `{ admin: true }`. `GET /admin/users?q=`: `{ users }` (`AdminUser[]`) by handle or email.
 *   `POST /admin/gifts` `{ userId, content, request }`: sends a gift (`parseAdminGift`), `{ sent }`
 *   (false when that `request` already went); 404 for an unknown player. `GET /admin/gifts`: `{ gifts }`
 *   (`AdminSent[]`), the latest sent by hand.
 */
export const createApp = ({ store, ranking, gifts, checks, verify, donate, supporters, admin, webhooks, allowedOrigin, ping }: AppDeps) => {
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

  app.post('/runs', auth, smallBody, async (c) => {
    // An older game sends no body: a run like any other.
    const body = await json(c)
    const challenge = isRecord(body) && body.challenge !== undefined ? body.challenge : null
    if (challenge !== null && (!isDayKey(challenge) || !challengeOpen(challenge, new Date()))) return c.json({ error: 'not an open challenge' }, 400)
    const token = await ranking.startRun(c.var.userId, challenge)
    return token ? c.json({ token }, 201) : c.json({ error: 'too many runs' }, 429)
  })

  // A 30-minute replay is ~60 KB of JSON.
  app.put('/runs/:token', auth, bodyLimit({ maxSize: 512 * 1024 }), async (c) => {
    const body = await json(c)
    const result = parseRunResult(body)
    if (!result) return c.json({ error: 'implausible result' }, 400)
    const replay = isRecord(body) && body.replay !== undefined ? parseReplay(body.replay) : null
    if (isRecord(body) && body.replay !== undefined && (!replay || replay.start.starter !== result.starter || replay.start.difficulty !== result.difficulty)) {
      return c.json({ error: 'replay of another run' }, 400)
    }
    const token = c.req.param('token')
    const finished = await ranking.finishRun(c.var.userId, token, result, replay)
    if (!finished.ok) return c.json({ error: finished.error }, FINISH_ERRORS[finished.error])
    if (replay) checks.schedule(token)
    const [ranks, challenge] = await Promise.all([
      ranking.runRanks(c.var.userId, result.difficulty),
      finished.challenge ? ranking.challengePlace(c.var.userId, finished.challenge, finished.official === true) : null,
    ])
    return c.json({ ranks, challenge })
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

  app.get('/challenge/:day', maybeAuth, async (c) => {
    const day = c.req.param('day')
    const friends = c.req.query('friends') === '1'
    if (!isDayKey(day)) return c.json({ error: 'unknown day' }, 400)
    if (friends && !c.var.userId) return c.json({ error: 'unauthorized' }, 401)
    return c.json(await ranking.challengeBoard(day, friends, c.var.userId))
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

  app.get('/gifts', auth, async (c) => c.json({ gifts: await gifts.inbox(c.var.userId) }))

  app.post('/gifts/claim', auth, smallBody, async (c) => {
    const body = await json(c)
    const ids = isRecord(body) && Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === 'string').slice(0, 50) : null
    if (!ids) return c.json({ error: 'expected { ids }' }, 400)
    return c.json({ claimed: await gifts.claim(c.var.userId, ids) })
  })

  app.post('/referral', auth, smallBody, async (c) => {
    const body = await json(c)
    const ref = isRecord(body) ? parseHandle(body.ref) : null
    if (!ref) return c.json({ error: 'expected { ref }' }, 400)
    return c.json({ referred: await gifts.refer(c.var.userId, ref) })
  })

  app.post('/donations', smallBody, async (c) => {
    if (!donate) return c.json({ error: 'donations are off' }, 503)
    const body = await json(c)
    const amount = isRecord(body) ? parseDonation(body.amount) : null
    if (!amount) return c.json({ error: 'expected { amount } in whole reais' }, 400)
    const typed = isRecord(body) && typeof body.handle === 'string' ? body.handle.trim() : ''
    const handle = typed ? parseHandle(typed) : null
    if (typed && !handle) return c.json({ error: 'no such player' }, 400)
    const origin = c.req.header('Origin')
    const base = origin && allowedOrigin(origin) ? origin : SITE
    const page = isRecord(body) && typeof body.page === 'string' && SITE_PATH.test(body.page) ? body.page : '/'
    const ref = crypto.randomUUID()
    if (!(await supporters.open(ref, handle))) return c.json({ error: 'no such player' }, 400)
    const url = await donate(amount, { completionUrl: `${base}${page}?thanks=${ref}`, returnUrl: `${base}${page}` }, `${ABACATE_REF}${ref}`)
    return c.json({ url })
  })

  app.get('/donations/:ref', async (c) => {
    const ref = c.req.param('ref')
    const status = DONATION_REF.test(ref) ? await supporters.status(ref) : null
    return status ? c.json(status) : c.json({ error: 'unknown donation' }, 404)
  })

  app.post('/donations/redeem', auth, smallBody, async (c) => {
    const body = await json(c)
    const code = isRecord(body) ? parseCode(body.code) : null
    if (!code) return c.json({ error: 'unknown code' }, 404)
    const redeemed = await supporters.redeem(c.var.userId, code)
    if (!redeemed.ok) return c.json({ error: redeemed.error }, redeemed.error === 'used' ? 409 : 404)
    return c.json({ tier: redeemed.tier })
  })

  const hookBody = bodyLimit({ maxSize: 64 * 1024 })

  app.post('/webhooks/stripe', hookBody, async (c) => {
    if (!webhooks.stripeSecret) return c.json({ error: 'webhook off' }, 503)
    const raw = await c.req.text()
    if (!verifyStripe(raw, c.req.header('Stripe-Signature'), webhooks.stripeSecret, Date.now() / 1000)) return c.json({ error: 'bad signature' }, 401)
    const event: unknown = JSON.parse(raw)
    const paid = stripeDonation(event, webhooks.stripePaymentLink)
    if (paid) await supporters.paid(paid)
    // A paid session dropped only for its link is usually a mistyped STRIPE_PAYMENT_LINK (ids are case-sensitive).
    const dropped = paid ? null : stripeDonation(event, null)
    if (dropped) console.warn(`stripe session ${dropped.ref} is paid but ignored: its payment link isn't STRIPE_PAYMENT_LINK (${webhooks.stripePaymentLink})`)
    return c.json({ received: true })
  })

  // AbacatePay signs the Standard Webhooks way since 01/10/2026; webhooks made before still send the URL secret and the public-key HMAC.
  app.post('/webhooks/abacatepay', hookBody, async (c) => {
    const secret = webhooks.abacatePaySecret
    if (!secret) return c.json({ error: 'webhook off' }, 503)
    const raw = await c.req.text()
    const standard = { id: c.req.header('webhook-id'), timestamp: c.req.header('webhook-timestamp'), signature: c.req.header('webhook-signature') }
    const ok = standard.signature
      ? verifyStandard(raw, standard, secret, Date.now() / 1000)
      : c.req.query('webhookSecret') === secret && verifyAbacate(raw, c.req.header('X-Webhook-Signature'))
    if (!ok) return c.json({ error: 'bad signature' }, 401)
    const paid = abacateDonation(JSON.parse(raw))
    if (paid) await supporters.paid(paid)
    return c.json({ received: true })
  })

  app.get('/me/supporter', auth, async (c) => c.json(await supporters.mine(c.var.userId)))

  app.put('/me/supporter', auth, smallBody, async (c) => {
    const body = await json(c)
    if (!isRecord(body) || typeof body.public !== 'boolean') return c.json({ error: 'expected { public }' }, 400)
    await supporters.setPublic(c.var.userId, body.public)
    return c.json(await supporters.mine(c.var.userId))
  })

  app.get('/supporters', async (c) => {
    c.header('Cache-Control', 'public, max-age=60')
    return c.json({ supporters: await supporters.wall() })
  })

  app.get('/poll', async (c) => c.json(await supporters.poll()))

  app.put('/poll', auth, smallBody, async (c) => {
    const body = await json(c)
    const choice = isRecord(body) && isPollOption(body.choice) ? body.choice : null
    if (!choice) return c.json({ error: 'expected { choice }' }, 400)
    if (!(await supporters.vote(c.var.userId, choice))) return c.json({ error: 'supporters only' }, 403)
    return c.json(await supporters.poll())
  })

  /** The desk's routes, all behind a valid token whose user Clerk says is admin. Everyone else gets 403, whatever they send. */
  const desk = new Hono<Auth>()

  desk.use(auth, async (c, next) => {
    if (!(await admin.isAdmin(c.var.userId))) return c.json({ error: 'forbidden' }, 403)
    await next()
  })

  desk.get('/', (c) => c.json({ admin: true }))

  desk.get('/users', async (c) => {
    const q = parseAdminQuery(c.req.query('q'))
    if (!q) return c.json({ error: 'expected ?q= a handle or an email' }, 400)
    return c.json({ users: await admin.search(q) })
  })

  desk.post('/gifts', smallBody, async (c) => {
    const body = await json(c)
    const content = isRecord(body) ? parseAdminGift(body.content) : null
    if (!isRecord(body) || typeof body.userId !== 'string' || typeof body.request !== 'string' || !content) {
      return c.json({ error: 'expected { userId, content, request }' }, 400)
    }
    const outcome = await admin.send(c.var.userId, body.userId, content, body.request)
    if (outcome === 'unknown' || outcome === 'bad request') return c.json({ error: outcome }, SEND_ERRORS[outcome])
    return c.json({ sent: outcome === 'sent' })
  })

  desk.get('/gifts', async (c) => c.json({ gifts: await admin.recent() }))

  app.route('/admin', desk)

  app.onError((err, c) => {
    console.error(err)
    return c.json({ error: 'internal error' }, 500)
  })

  return app
}
