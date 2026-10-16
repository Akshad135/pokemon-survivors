import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { ABACATE_REF, abacateDonation, ABACATEPAY_PUBLIC_KEY, stripeDonation, verifyAbacate, verifyStandard, verifyStripe } from './webhooks'

const SECRET = 'whsec_test'

const stripeHeader = (body: string, t: number, secret = SECRET) => `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`

const session = (over: Record<string, unknown> = {}) => ({
  type: 'checkout.session.completed',
  data: { object: { id: 'cs_live_abc', payment_status: 'paid', amount_total: 1000, currency: 'usd', client_reference_id: 'Ash', payment_link: 'plink_1', ...over } },
})

describe('Stripe webhooks', () => {
  it('takes a fresh event signed with the secret', () => {
    const body = JSON.stringify(session())
    expect(verifyStripe(body, stripeHeader(body, 1000), SECRET, 1010)).toBe(true)
    expect(verifyStripe(body, stripeHeader(body, 1000, 'whsec_other'), SECRET, 1010)).toBe(false)
    expect(verifyStripe(`${body} `, stripeHeader(body, 1000), SECRET, 1010)).toBe(false)
    // A captured event replayed later.
    expect(verifyStripe(body, stripeHeader(body, 1000), SECRET, 2000)).toBe(false)
    expect(verifyStripe(body, undefined, SECRET, 1010)).toBe(false)
  })

  it('reads a paid session of the donation link, with its handle', () => {
    expect(stripeDonation(session(), 'plink_1')).toEqual({ provider: 'stripe', ref: 'cs_live_abc', amount: 1000, currency: 'usd', handle: 'ash' })
    expect(stripeDonation(session({ client_reference_id: null }), null)?.handle).toBeNull()
    expect(stripeDonation(session({ payment_link: 'plink_other' }), 'plink_1')).toBeNull()
    expect(stripeDonation(session({ payment_status: 'unpaid' }), null)).toBeNull()
    expect(stripeDonation({ ...session(), type: 'invoice.paid' }, null)).toBeNull()
  })

  it("counts an Adaptive Pricing session in the link's own currency", () => {
    const converted = session({ amount_total: 920, currency: 'eur', currency_conversion: { amount_total: 1000, source_currency: 'usd' } })
    expect(stripeDonation(converted, null)).toMatchObject({ amount: 1000, currency: 'usd' })
  })
})

describe('AbacatePay webhooks', () => {
  const event = (externalId: string, status = 'PAID') => ({ event: 'checkout.completed', data: { checkout: { externalId, status, amount: 2500, paidAmount: 2500 } } })

  it('checks the signature with the public key', () => {
    const body = JSON.stringify(event(`${ABACATE_REF}x`))
    expect(verifyAbacate(body, createHmac('sha256', ABACATEPAY_PUBLIC_KEY).update(body).digest('base64'))).toBe(true)
    expect(verifyAbacate(body, 'forged')).toBe(false)
  })

  it('reads only our paid checkouts (the account sells other things)', () => {
    expect(abacateDonation(event(`${ABACATE_REF}1234`))).toEqual({ provider: 'abacatepay', ref: '1234', amount: 2500, currency: 'brl', handle: null })
    expect(abacateDonation(event('chatdeia-plan-9'))).toBeNull()
    expect(abacateDonation(event(`${ABACATE_REF}1234`, 'PENDING'))).toBeNull()
  })
})

describe('Standard Webhooks (AbacatePay since 01/10/2026)', () => {
  const secret = `whsec_${Buffer.from('a 32-byte key for the test suite').toString('base64')}`
  const sign = (id: string, t: number, body: string) =>
    `v1,${createHmac('sha256', Buffer.from(secret.slice(6), 'base64')).update(`${id}.${t}.${body}`).digest('base64')}`

  it('takes a fresh delivery signed with the secret, among several signatures', () => {
    const body = '{"event":"checkout.completed"}'
    const signature = `v1,bm9wZQ== ${sign('msg_1', 1000, body)}`
    expect(verifyStandard(body, { id: 'msg_1', timestamp: '1000', signature }, secret, 1010)).toBe(true)
  })

  it('refuses another id, a changed body, an old delivery or a missing header', () => {
    const body = '{"event":"checkout.completed"}'
    const signature = sign('msg_1', 1000, body)
    expect(verifyStandard(body, { id: 'msg_2', timestamp: '1000', signature }, secret, 1010)).toBe(false)
    expect(verifyStandard(`${body} `, { id: 'msg_1', timestamp: '1000', signature }, secret, 1010)).toBe(false)
    expect(verifyStandard(body, { id: 'msg_1', timestamp: '1000', signature }, secret, 2000)).toBe(false)
    expect(verifyStandard(body, { id: 'msg_1', timestamp: undefined, signature }, secret, 1010)).toBe(false)
  })
})
