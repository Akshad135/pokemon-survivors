import { describe, expect, it } from 'vitest'
import { discordAccount, SUPPORTER_ROLES, supporterRoleChanges, type ExternalAccountInfo } from './discordLink'

describe('supporterRoleChanges', () => {
  it('gives Gold in place of Supporter', () => {
    expect(supporterRoleChanges('gold')).toEqual({ add: [SUPPORTER_ROLES.gold], remove: [SUPPORTER_ROLES.supporter] })
  })

  it('gives Supporter to the first tier', () => {
    expect(supporterRoleChanges('supporter')).toEqual({ add: [SUPPORTER_ROLES.supporter], remove: [] })
  })

  it('leaves a player without a tier alone (a role given by hand stays)', () => {
    expect(supporterRoleChanges(null)).toEqual({ add: [], remove: [] })
  })
})

describe('discordAccount', () => {
  const account = (over: Partial<ExternalAccountInfo>): ExternalAccountInfo => ({
    provider: 'discord',
    providerUserId: '123',
    username: 'ash',
    verification: { status: 'verified' },
    ...over,
  })

  it('finds the verified Discord account, whichever way Clerk names the provider', () => {
    expect(discordAccount([account({ provider: 'google', providerUserId: '9' }), account({})])).toEqual({ id: '123', username: 'ash' })
    expect(discordAccount([account({ provider: 'oauth_discord' })])).toEqual({ id: '123', username: 'ash' })
  })

  it('ignores one whose connection never finished', () => {
    expect(discordAccount([account({ verification: { status: 'unverified' } })])).toBeNull()
    expect(discordAccount([account({ verification: null })])).toBeNull()
  })

  it('is null without one', () => {
    expect(discordAccount([account({ provider: 'google' })])).toBeNull()
  })
})
