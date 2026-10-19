import { describe, expect, it } from 'vitest'
import { discordStatus } from './discordStatus'

const signedIn = { kind: 'signedIn', name: 'Ash', sync: 'synced', handle: 'ash' } as const

describe('discordStatus', () => {
  it('only offers the server without accounts', () => {
    expect(discordStatus({ kind: 'guest' }, false)).toEqual({ kind: 'join' })
  })

  it('lets a guest sign in with Discord, saying when the last try failed', () => {
    expect(discordStatus({ kind: 'guest' }, true)).toEqual({ kind: 'guest', failed: false })
    expect(discordStatus({ kind: 'guest', failed: true }, true)).toEqual({ kind: 'guest', failed: true })
  })

  it('asks a signed-in player to link until Clerk shows a Discord account', () => {
    expect(discordStatus({ ...signedIn, discord: undefined }, true)).toEqual({ kind: 'link', failed: false })
    expect(discordStatus({ ...signedIn, discord: null, discordFailed: true }, true)).toEqual({ kind: 'link', failed: true })
  })

  it('shows the linked username', () => {
    expect(discordStatus({ ...signedIn, discord: 'ash_k' }, true)).toEqual({ kind: 'linked', name: 'ash_k' })
  })
})
