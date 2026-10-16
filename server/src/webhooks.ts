import { createHmac, timingSafeEqual } from 'node:crypto'
import { isRecord } from '../../src/game/parse'
import { parseHandle } from '../../src/game/ranking'

/**
 * Payment webhooks, as pure functions: checking that an event really came
 * from Stripe or AbacatePay, and reading the paid donation out of it.
 */

/** A paid donation, as a webhook tells it. `handle`: the account it's for, when the donor gave one. */
export type PaidDonation = { provider: 'stripe' | 'abacatepay'; ref: string; amount: number; currency: string; handle: string | null }

/** Prefix of our AbacatePay checkouts' `externalId` (the account is shared with other products). */
export const ABACATE_REF = 'pokemon-survivors-donation:'

/** Events older than this are refused, so a captured one can't be replayed later (Stripe's default). */
const STRIPE_TOLERANCE = 300

const sameText = (a: string, b: string) => {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

/**
 * Whether `header` (`Stripe-Signature: t=…,v1=…`) signs `body` with the
 * endpoint's secret: an HMAC-SHA256 of `t.body`, hex, within `STRIPE_TOLERANCE` of `now` (seconds).
 */
export const verifyStripe = (body: string, header: string | undefined, secret: string, now: number) => {
  if (!header) return false
  const parts = header.split(',').map((p) => ({ key: p.slice(0, p.indexOf('=')), value: p.slice(p.indexOf('=') + 1) }))
  const t = Number(parts.find((p) => p.key === 't')?.value)
  if (!Number.isInteger(t) || Math.abs(now - t) > STRIPE_TOLERANCE) return false
  const expected = createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')
  return parts.some((p) => p.key === 'v1' && sameText(p.value, expected))
}

/**
 * The donation a Stripe event pays, or null for any other event: a finished
 * Checkout Session that's paid (`checkout.session.completed`, or
 * `async_payment_succeeded` for slower methods), of our Payment Link when
 * `paymentLink` is set. The handle comes as `client_reference_id`; with
 * Adaptive Pricing the amount is read in the link's own currency.
 */
export const stripeDonation = (event: unknown, paymentLink: string | null): PaidDonation | null => {
  if (!isRecord(event) || !isRecord(event.data) || !isRecord(event.data.object)) return null
  const type = event.type
  const s = event.data.object
  if (type !== 'checkout.session.completed' && type !== 'checkout.session.async_payment_succeeded') return null
  if (s.payment_status !== 'paid' || typeof s.id !== 'string') return null
  if (paymentLink && s.payment_link !== paymentLink) return null
  const conversion = isRecord(s.currency_conversion) ? s.currency_conversion : null
  const amount = conversion ? conversion.amount_total : s.amount_total
  const currency = conversion ? conversion.source_currency : s.currency
  if (typeof amount !== 'number' || typeof currency !== 'string') return null
  return { provider: 'stripe', ref: s.id, amount, currency, handle: parseHandle(s.client_reference_id) }
}

/** The key AbacatePay signs every webhook with (public, from their docs: "Segurança dos webhooks"). */
export const ABACATEPAY_PUBLIC_KEY =
  't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9'

/**
 * Whether `signature` (`X-Webhook-Signature`) signs `body`: an HMAC-SHA256
 * with AbacatePay's public key, base64. The secret in the URL is checked apart.
 */
export const verifyAbacate = (body: string, signature: string | undefined, publicKey = ABACATEPAY_PUBLIC_KEY) =>
  signature !== undefined && sameText(signature, createHmac('sha256', publicKey).update(body).digest('base64'))

/** A Standard Webhooks delivery's headers (`webhook-id`, `webhook-timestamp`, `webhook-signature`). */
export type StandardHeaders = { id: string | undefined; timestamp: string | undefined; signature: string | undefined }

/**
 * Whether a delivery signed the Standard Webhooks way (standardwebhooks.com,
 * AbacatePay's since 01/10/2026) is ours: an HMAC-SHA256 of `id.timestamp.body`
 * with the secret's key (the base64 after `whsec_`), base64, among the
 * header's space-separated `v1,<signature>`, within `STRIPE_TOLERANCE` of `now` (seconds).
 */
export const verifyStandard = (body: string, h: StandardHeaders, secret: string, now: number) => {
  if (!h.id || !h.timestamp || !h.signature) return false
  const t = Number(h.timestamp)
  if (!Number.isInteger(t) || Math.abs(now - t) > STRIPE_TOLERANCE) return false
  const key = Buffer.from(secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret, 'base64')
  const expected = createHmac('sha256', key).update(`${h.id}.${t}.${body}`).digest('base64')
  return h.signature.split(' ').some((part) => part.startsWith('v1,') && sameText(part.slice(3), expected))
}

/** The donation an AbacatePay event pays, or null: a `checkout.completed` of one of our checkouts, paid. */
export const abacateDonation = (event: unknown): PaidDonation | null => {
  if (!isRecord(event) || event.event !== 'checkout.completed' || !isRecord(event.data) || !isRecord(event.data.checkout)) return null
  const c = event.data.checkout
  if (c.status !== 'PAID' || typeof c.externalId !== 'string' || !c.externalId.startsWith(ABACATE_REF)) return null
  const amount = typeof c.paidAmount === 'number' ? c.paidAmount : c.amount
  if (typeof amount !== 'number') return null
  return { provider: 'abacatepay', ref: c.externalId.slice(ABACATE_REF.length), amount, currency: 'brl', handle: null }
}
