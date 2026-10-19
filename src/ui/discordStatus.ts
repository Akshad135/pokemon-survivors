import type { AccountState } from '../account'

/**
 * Where the player stands with the community Discord, for its screen and
 * buttons: `join` only (no accounts in this build), a `guest` who can sign
 * in with Discord, an account still to `link`, or `linked` with the
 * Discord username. `failed`: the last attempt didn't go through.
 */
export type DiscordStatus = { kind: 'join' } | { kind: 'busy' } | { kind: 'guest' | 'link'; failed: boolean } | { kind: 'linked'; name: string }

export const discordStatus = (s: AccountState, accounts: boolean): DiscordStatus =>
  !accounts
    ? { kind: 'join' }
    : s.kind === 'busy'
      ? { kind: 'busy' }
      : s.kind === 'guest'
        ? { kind: 'guest', failed: s.failed === true }
        : s.discord
          ? { kind: 'linked', name: s.discord }
          : { kind: 'link', failed: s.discordFailed === true }
