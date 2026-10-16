import type { Clerk } from '@clerk/clerk-js'
import { track } from './analytics'
import type { Hatch } from './game/eggs'
import { applyGift, parseGift, type Gift } from './game/gifts'
import { parseSaveData } from './game/meta'
import { isRecord } from './game/parse'
import type { ProfileName } from './game/ranking'
import { loadSave, writeSave } from './ui/save'

/**
 * Optional player accounts (Google through Clerk). Playing as a guest stays
 * the default: the save lives in `localStorage` either way, and an account
 * only mirrors it to the API (`server/`), merging saves with `applyPush`
 * (`game/sync.ts`). Clerk is loaded only when the player signs in, or on
 * boot for a device that already did, so guests never download it.
 *
 * Each sync also brings the Mystery Gifts waiting in the account (`GET /gifts`)
 * and, on a device's first sync, the invite it landed with (`POST /referral`).
 *
 * Nothing here may block the game: offline, a missing API or a Clerk outage
 * just leave the save local and the sync status `offline`.
 */

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
/** Base URL of the API (`server/`), without a trailing slash. */
export const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '')

/** Without both keys the account button doesn't show and the game is guest only. */
export const accountsEnabled = Boolean(PUBLISHABLE_KEY && API_URL)

/** Query parameter of the page Google sends the player back to. */
const CALLBACK = 'login'

const TIMEOUT_MS = 12_000

/** True while the page is the one Google sent the player back to: boot skips the "press start" intro. */
export const backFromSignIn = () => accountsEnabled && new URLSearchParams(location.search).has(CALLBACK)

export type SyncStatus = 'syncing' | 'synced' | 'offline'

/**
 * `failed`: the last sign in didn't go through. `handle`: the player's public
 * handle, null before they pick one, undefined until the API said.
 */
export type AccountState = { kind: 'guest'; failed?: boolean } | { kind: 'busy' } | { kind: 'signedIn'; name: string; sync: SyncStatus; handle: string | null | undefined }

/* ---------------- Device link ---------------- */

const LINK_KEY = 'ps:account'

/**
 * This device's account: who signed in, the revision of the account's save it
 * last got (null until its first sync), which pushes build on, and the public
 * handle (see `AccountState`). `name` is the profile's display name once there is one.
 */
type Link = { userId: string; name: string; revision: number | null; handle?: string | null }

const readLink = (): Link | null => {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(LINK_KEY) ?? 'null')
    if (!isRecord(data) || typeof data.userId !== 'string') return null
    return {
      userId: data.userId,
      name: typeof data.name === 'string' ? data.name : '',
      revision: typeof data.revision === 'number' ? data.revision : null,
      handle: typeof data.handle === 'string' || data.handle === null ? data.handle : undefined,
    }
  } catch {
    return null
  }
}

const writeLink = (link: Link | null) => {
  try {
    if (link) localStorage.setItem(LINK_KEY, JSON.stringify(link))
    else localStorage.removeItem(LINK_KEY)
  } catch {
    // Storage blocked: the device just syncs as a fresh sign in next time.
  }
}

/* ---------------- Invite ---------------- */

const REF_KEY = 'ps:ref'

/** The first inviter's handle this device landed with (`captureRef` in `ranking.ts`), for the first sign in to credit. */
export const storedRef = () => {
  try {
    return localStorage.getItem(REF_KEY)
  } catch {
    return null
  }
}

export const storeRef = (handle: string) => {
  try {
    localStorage.setItem(REF_KEY, handle)
  } catch {
    // Storage blocked: the invite just isn't remembered.
  }
}

/* ---------------- State ---------------- */

let state: AccountState = { kind: 'guest' }
const listeners = new Set<(s: AccountState) => void>()

export const accountState = () => state

/** The signed-in player's user id, from this device's link (null for guests). */
export const accountUserId = () => readLink()?.userId ?? null

/** This device's public handle, known from its link even before Clerk loads (null for guests or before one is picked). */
export const accountHandle = () => {
  const s = state
  return s.kind === 'signedIn' && s.handle ? s.handle : (readLink()?.handle ?? null)
}

/** Calls `fn` on every change of the account state. Returns the unsubscribe. */
export const onAccountChange = (fn: (s: AccountState) => void) => {
  listeners.add(fn)
  return () => void listeners.delete(fn)
}

const setState = (next: AccountState) => {
  state = next
  listeners.forEach((fn) => fn(state))
}

const setSync = (sync: SyncStatus) => state.kind === 'signedIn' && setState({ ...state, sync })

/* ---------------- Clerk ---------------- */

const withTimeout = <T>(promise: Promise<T>) =>
  Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS))])

let clerk: Promise<Clerk> | null = null

/** Clerk, loaded on first use (its own chunk). A failed load can be retried. */
const loadClerk = () =>
  (clerk ??= withTimeout(
    import('@clerk/clerk-js').then(async ({ Clerk }) => {
      const instance = new Clerk(PUBLISHABLE_KEY!)
      await instance.load()
      return instance
    }),
  ).catch((err: unknown) => {
    clerk = null
    throw err
  }))

/** What the account screen calls the player: their first name, else their email's name. */
const displayName = (c: Clerk) => c.user?.firstName || c.user?.fullName || c.user?.primaryEmailAddress?.emailAddress.split('@')[0] || ''

const pageUrl = () => `${location.origin}${location.pathname}`

/** Dev builds: `localStorage['ps:devToken']` stands in for Clerk's token, against a local API that accepts it. */
const devToken = () => (import.meta.env.DEV ? localStorage.getItem('ps:devToken') : null)

/** The signed-in player's session token for the API, or null for guests and when Clerk can't load. Never throws. */
export const sessionToken = async () => {
  if (!accountsEnabled || !readLink()) return null
  try {
    return devToken() ?? (await (await loadClerk()).session?.getToken()) ?? null
  } catch {
    return null
  }
}

/* ---------------- Sync ---------------- */

/** The API's answer to a push: what the account stores now. */
const parsePushed = (body: unknown) =>
  isRecord(body) && typeof body.revision === 'number' && isRecord(body.save)
    ? { save: parseSaveData(body.save), revision: body.revision, merged: body.merged === true }
    : null

/**
 * Sends the local save on top of the revision this device last got and keeps
 * what the account stored. If the save changed locally while the request was
 * out (a purchase, a hatch), the local one stays: it already builds on what
 * was sent when the account took it as is, and otherwise the next push merges.
 */
const push = async (c: Clerk, link: Link) => {
  const token = await c.session?.getToken()
  if (!token) throw new Error('no session')
  const sent = JSON.stringify(loadSave())
  const res = await fetch(`${API_URL}/save`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ save: JSON.parse(sent), base: link.revision }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const pushed = res.ok ? parsePushed(await res.json()) : null
  if (!pushed) throw new Error(`push failed: ${res.status}`)
  const unchanged = JSON.stringify(loadSave()) === sent
  if (unchanged) writeSave(pushed.save)
  if (unchanged || !pushed.merged) writeLink({ ...link, revision: pushed.revision })
}

/** Makes this device the signed-in user's, keeping its revision and profile if it was theirs already. */
const relink = (c: Clerk, user: NonNullable<Clerk['user']>) => {
  const was = readLink()
  const same = was?.userId === user.id
  const name = same && was.handle ? was.name : displayName(c)
  writeLink({ userId: user.id, name, revision: same ? was.revision : null, handle: same ? was.handle : undefined })
  setState({ kind: 'signedIn', name, sync: 'syncing', handle: same ? was.handle : undefined })
}

/** Keeps a profile (or its absence) in the link and the state; a profile's name replaces Google's. */
const setProfile = (profile: ProfileName | null) => {
  const saved = readLink()
  if (!saved) return
  const name = profile?.name ?? saved.name
  writeLink({ ...saved, name, handle: profile?.handle ?? null })
  if (state.kind === 'signedIn') setState({ ...state, name, handle: profile?.handle ?? null })
}

/** Asks the API for the player's profile once per device link (`handle` undefined). A failure just asks again next sync. */
const loadProfile = async (token: string) => {
  if (readLink()?.handle !== undefined) return
  try {
    const res = await fetch(`${API_URL}/me`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(TIMEOUT_MS) })
    const body: unknown = res.ok ? await res.json() : null
    if (!isRecord(body)) throw new Error(`profile failed: ${res.status}`)
    const p = body.profile
    setProfile(isRecord(p) && typeof p.handle === 'string' && typeof p.name === 'string' ? { handle: p.handle, name: p.name } : null)
  } catch (err) {
    console.warn('profile failed', err)
  }
}

/** What saving a profile came to: `taken` brings a free handle to suggest (null if none). */
export type ProfileSaved = { ok: true } | { ok: false; reason: 'taken'; suggestion: string | null } | { ok: false; reason: 'invalid' | 'offline' }

/** Sets the player's public handle and display name (`PUT /me`). Never throws. */
export const saveProfile = async (profile: ProfileName): Promise<ProfileSaved> => {
  const token = await sessionToken()
  if (!token) return { ok: false, reason: 'offline' }
  try {
    const res = await fetch(`${API_URL}/me`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const body: unknown = await res.json().catch(() => null)
    if (res.status === 409) return { ok: false, reason: 'taken', suggestion: isRecord(body) && typeof body.suggestion === 'string' ? body.suggestion : null }
    if (res.status === 400) return { ok: false, reason: 'invalid' }
    if (!res.ok) return { ok: false, reason: 'offline' }
    setProfile(profile)
    return { ok: true }
  } catch {
    return { ok: false, reason: 'offline' }
  }
}

/** The name Google gave the account, to suggest a handle and display name from. */
export const accountRealName = async () => {
  try {
    const c = await loadClerk()
    return c.user?.fullName || displayName(c)
  } catch {
    return readLink()?.name ?? ''
  }
}

/** Links this device to the signed-in user and syncs. */
const link = (c: Clerk) => {
  if (!c.user) return setState({ kind: 'guest' })
  relink(c, c.user)
  return syncSave()
}

/**
 * A device's first sync for an account brings the invite it landed with,
 * before the save goes up: the API counts it only for an account with no
 * save yet (`canRefer`). Any answer is final; no connection tries next time.
 */
const sendReferral = async (token: string) => {
  const ref = storedRef()
  if (!ref || readLink()?.revision !== null) return
  try {
    const res = await fetch(`${API_URL}/referral`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const body: unknown = res.ok ? await res.json() : null
    if (isRecord(body) && body.referred === true) track('ref_signup', { ref })
  } catch (err) {
    console.warn('referral failed', err)
  }
}

/* ---------------- Mystery Gifts ---------------- */

/** A gift that landed in the save, with the hatch to play for a shiny hatch. */
export type GiftArrival = { gift: Gift; hatch: Hatch | null }

const giftListeners = new Set<(arrived: readonly GiftArrival[], waiting: number) => void>()

/** Calls `fn` whenever gifts land in the save (and with how many wait for room in the incubator). Returns the unsubscribe. */
export const onGifts = (fn: (arrived: readonly GiftArrival[], waiting: number) => void) => {
  giftListeners.add(fn)
  return () => void giftListeners.delete(fn)
}

/**
 * Applies gifts to the local save, one by one (`applyGift`), and tells the
 * listeners what landed. Returns the ids the account may mark claimed: the
 * ones that landed now or before. (Dev helpers stage gifts through it too.)
 */
export const receiveGifts = (gifts: readonly Gift[]) => {
  const arrived: GiftArrival[] = []
  const claim: string[] = []
  let waiting = 0
  for (const gift of gifts) {
    const out = applyGift(loadSave(), gift)
    if (out.status === 'wait') waiting++
    else claim.push(gift.id)
    if (out.status === 'applied') {
      writeSave(out.save)
      arrived.push({ gift, hatch: out.hatch })
    }
  }
  if (arrived.length > 0 || waiting > 0) giftListeners.forEach((fn) => fn(arrived, waiting))
  return { claim, landed: arrived.length > 0 }
}

/**
 * Fetches the account's unclaimed gifts, applies them and marks them
 * claimed. A gift this build doesn't know stays unclaimed for a newer one.
 * True when the save changed (it needs another push). Never throws.
 */
const fetchGifts = async (token: string) => {
  try {
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    const res = await fetch(`${API_URL}/gifts`, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) })
    const body: unknown = res.ok ? await res.json() : null
    if (!isRecord(body) || !Array.isArray(body.gifts)) return false
    const { claim, landed } = receiveGifts(body.gifts.flatMap((g: unknown) => parseGift(g) ?? []))
    // The save already holds what landed, so a failed claim just lists those gifts again next time.
    if (claim.length > 0) await fetch(`${API_URL}/gifts/claim`, { method: 'POST', headers, body: JSON.stringify({ ids: claim }), signal: AbortSignal.timeout(TIMEOUT_MS) })
    return landed
  } catch (err) {
    console.warn('gifts failed', err)
    return false
  }
}

let syncing = false
let again = false

/**
 * Pushes the local save to the account, when signed in (end of a run, boot,
 * the account screen). Calls during a sync queue one more. Never throws.
 */
export const syncSave = async () => {
  if (syncing) return void (again = true)
  syncing = true
  do {
    again = false
    const saved = readLink()
    if (!accountsEnabled || !saved) break
    setSync('syncing')
    try {
      const c = await loadClerk()
      // Clerk's session rules: signed out elsewhere goes back to guest, another user takes the device.
      if (!c.user) {
        writeLink(null)
        setState({ kind: 'guest' })
        break
      }
      if (c.user.id !== saved.userId) relink(c, c.user)
      const token = devToken() ?? (await c.session?.getToken())
      if (token) await sendReferral(token)
      await push(c, readLink() ?? saved)
      setSync('synced')
      if (token) {
        await loadProfile(token)
        // Gifts that landed changed the save: push it again.
        if (await fetchGifts(token)) again = true
      }
    } catch (err) {
      console.warn('account sync failed', err)
      setSync('offline')
    }
  } while (again)
  syncing = false
}

/* ---------------- Sign in and out ---------------- */

/**
 * "Sign in with Google": leaves for Google and comes back to this page
 * (`?login`), where `startAccount` finishes it. Already signed in to Clerk
 * (another tab), it just links this device.
 */
export const signIn = async () => {
  setState({ kind: 'busy' })
  try {
    const c = await loadClerk()
    if (c.user) return await link(c)
    if (!c.client) throw new Error('no client')
    // Both back to `?login`, so the device always gets linked, however Clerk finishes.
    const back = `${pageUrl()}?${CALLBACK}`
    await c.client.signIn.authenticateWithRedirect({ strategy: 'oauth_google', redirectUrl: back, redirectUrlComplete: back })
  } catch (err) {
    console.warn('sign in failed', err)
    setState({ kind: 'guest', failed: true })
  }
}

/** Signs out of the account. The progress stays on this device, playing as a guest. */
export const signOut = async () => {
  setState({ kind: 'busy' })
  writeLink(null)
  try {
    await (await loadClerk()).signOut()
  } catch (err) {
    console.warn('sign out failed', err)
  }
  setState({ kind: 'guest' })
}

/**
 * Where the callback sends a sign in that needs more than Google (Clerk
 * Protect's bot check, a sign up missing a field, a code by email): the
 * matching page of Clerk's Account Portal, which finishes it and comes back.
 */
const portalSteps = (portal: string) => ({
  signInUrl: `${portal}/sign-in`,
  signUpUrl: `${portal}/sign-up`,
  firstFactorUrl: `${portal}/sign-in/factor-one`,
  secondFactorUrl: `${portal}/sign-in/factor-two`,
  resetPasswordUrl: `${portal}/sign-in/reset-password`,
  signInProtectCheckUrl: `${portal}/sign-in/protect-check`,
  continueSignUpUrl: `${portal}/sign-up/continue`,
  verifyEmailAddressUrl: `${portal}/sign-up/verify-email-address`,
  verifyPhoneNumberUrl: `${portal}/sign-up/verify-phone-number`,
  signUpProtectCheckUrl: `${portal}/sign-up/protect-check`,
})

/**
 * True when a new Google account comes back to a sign up stuck at Protect's
 * bot check past its deadline (5 minutes). An attempt that never finished
 * keeps that sign up on the client, Clerk doesn't reissue its check, and the
 * callback sends every new attempt to it before creating a fresh sign up.
 */
const staleSignUp = (c: Clerk) => {
  const expiresAt = c.client?.signUp.protectCheck?.expiresAt
  return expiresAt !== undefined && expiresAt < Date.now() && c.client?.signIn.firstFactorVerification.status === 'transferable'
}

/** Turns the sign in Google just finished into a new sign up: done, it signs in; otherwise the callback takes it on (a fresh check, a missing step). */
const freshSignUp = async (c: Clerk, callback: () => Promise<unknown>) => {
  if (!c.client) return
  const signUp = await withTimeout(c.client.signUp.create({ transfer: true }))
  if (signUp.createdSessionId) await c.setActive({ session: signUp.createdSessionId })
  else await callback()
}

/** Back from Google: completes the sign in (or sign up), cleans the URL and links the device. */
const finishSignIn = async () => {
  setState({ kind: 'busy' })
  const home = pageUrl()
  let leaving = false
  try {
    const c = await loadClerk()
    const portal = new URL(c.buildSignInUrl()).origin
    // Pages of this site just replace the URL; the Account Portal is left for, and sends the player back to `?login`.
    const navigate = async (to: string) => {
      const url = new URL(to, location.href)
      if (url.origin === location.origin) return history.replaceState(null, '', url)
      url.searchParams.set('redirect_url', `${home}?${CALLBACK}`)
      leaving = true
      location.assign(url)
    }
    const callback = () =>
      withTimeout(c.handleRedirectCallback({ ...portalSteps(portal), signInForceRedirectUrl: home, signUpForceRedirectUrl: home }, navigate)).catch((err: unknown) =>
        console.warn('sign in callback', err),
      )
    // Whatever the callback says, a session in place means the player is in (back from the portal, it already is).
    if (!c.user) {
      if (staleSignUp(c)) await freshSignUp(c, callback)
      else await callback()
    }
    if (leaving) return
    if (!c.user) throw new Error('not signed in')
    await link(c)
  } catch (err) {
    console.warn('sign in failed', err)
    setState({ kind: 'guest', failed: true })
  } finally {
    if (!leaving && location.search.includes(CALLBACK)) history.replaceState(null, '', home)
  }
}

/**
 * Boot: finishes a sign in coming back from Google, or, on a device that
 * signed in before, shows the account right away and syncs once Clerk has
 * loaded in the background (after the game's own assets).
 */
export const startAccount = () => {
  if (!accountsEnabled) return
  if (backFromSignIn()) return void finishSignIn()
  const saved = readLink()
  if (!saved) return
  setState({ kind: 'signedIn', name: saved.name, sync: 'syncing', handle: saved.handle })
  setTimeout(() => void syncSave(), 3000)
}
