import { describe, expect, it } from 'vitest'
import { readToken, tokenTimes } from './clerkClock'

const b64url = (s: string) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const jwt = (claims: object) => `${b64url('{"alg":"RS256"}')}.${b64url(JSON.stringify(claims))}.sig`

describe('tokenTimes', () => {
  it('reads iat and exp from the payload', () => {
    expect(tokenTimes(jwt({ iat: 1000, exp: 1060, sub: 'user_1' }))).toEqual({ iat: 1000, exp: 1060 })
  })

  it('is null for anything else', () => {
    expect(tokenTimes('not a token')).toBeNull()
    expect(tokenTimes(jwt({ sub: 'user_1' }))).toBeNull()
  })
})

describe('readToken', () => {
  const token = jwt({ iat: 1000, exp: 1060 })

  it('learns a clock running behind from a fresh token', () => {
    // Issued at 1000 by Clerk while this device read 700: five minutes behind.
    expect(readToken(token, null, 700)).toEqual({ offset: 300, spent: false })
  })

  it('finds a token spent by Clerk even when the local clock says it has time left', () => {
    // 90 s later on the device: still before exp by its clock, 30 s past it by Clerk's.
    expect(readToken(token, 300, 790).spent).toBe(true)
  })

  it('keeps the largest offset seen, since an older token only gives a lower bound', () => {
    expect(readToken(jwt({ iat: 900, exp: 960 }), 300, 750).offset).toBe(300)
  })

  it('with a clock that is right, keeps a token until just before it ends', () => {
    expect(readToken(token, 0, 1045).spent).toBe(false)
    expect(readToken(token, 0, 1055).spent).toBe(true)
  })
})
