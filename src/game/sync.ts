import { mergeAchievements } from './achievements'
import { mergeDex } from './dex'
import { mergeEggs, mergeHatched } from './eggs'
import { SAVE_VERSION, totalSpent, UPGRADE_IDS, type Ranks, type Save, type UpgradeId } from './meta'
import { mergeMissions } from './missions'
import { mergeShinyStarters } from './shinyStarters'

/**
 * Account sync rules, shared by the game and the API (`server/`): how two
 * saves become one, and what a push stores. Pure, so both sides agree.
 */

/** Everything a save ever got in ₽: the wallet plus what its upgrades cost. Buying or refunding doesn't change it. */
const worth = (s: Save) => s.wallet + totalSpent(s.ranks)

/**
 * Two saves of the same player in one (a guest save joining an account, or
 * two devices that played apart). Every rule keeps the larger side, so the
 * result never loses progress and merging it again with either save changes
 * nothing:
 *
 * - Collection: the Pokédex, hatched families and unlocked achievements are
 *   unions; the incubator keeps the most eggs of each tier (`mergeEggs`).
 * - Upgrades, records, counters and mission progress keep the larger value
 *   (missions of an older day or week give way to the current ones).
 * - ₽: the larger fortune (wallet plus upgrades, see `worth`) wins, minus
 *   what the merged upgrades cost, so ₽ spent on one side and kept on the
 *   other isn't counted twice.
 * - The title: `incoming`'s, if it shows one.
 * - The difficulty picked last: `incoming`'s, a setting rather than progress.
 * - Shiny starters: a union; each Normal/Shiny pick is `incoming`'s when it has one.
 */
export const mergeSaves = (base: Save, incoming: Save): Save => {
  const ranks: Ranks = Object.fromEntries(UPGRADE_IDS.map((id) => [id, Math.max(base.ranks[id], incoming.ranks[id])])) as Record<UpgradeId, number>
  return {
    version: SAVE_VERSION,
    wallet: Math.max(0, Math.max(worth(base), worth(incoming)) - totalSpent(ranks)),
    ranks,
    dex: mergeDex(base.dex, incoming.dex),
    eggs: mergeEggs(base.eggs, incoming.eggs),
    hatched: mergeHatched(base.hatched, incoming.hatched),
    missions: mergeMissions(base.missions, incoming.missions),
    achievements: mergeAchievements(base.achievements, incoming.achievements),
    title: incoming.title ?? base.title,
    difficulty: incoming.difficulty,
    shinyStarters: mergeShinyStarters(base.shinyStarters, incoming.shinyStarters),
  }
}

/** A save as the account stores it. `revision` goes up by one with every push. */
export type Stored = { save: Save; revision: number }

/** What a device sends: its save and the revision it last got from the account (null if it never synced). */
export type Push = { save: Save; base: number | null }

/**
 * What a push stores. A device that pushes on top of the latest revision has
 * seen everything stored, so its save is the newer one and replaces it as is:
 * that keeps ₽ spent, eggs hatched and refunds. Anything else (a first sign
 * in, another device pushed in between) merges both with `mergeSaves`.
 */
export const applyPush = (stored: Stored | null, push: Push): Stored & { merged: boolean } => {
  if (!stored) return { save: push.save, revision: 1, merged: false }
  const merged = push.base !== stored.revision
  return { save: merged ? mergeSaves(stored.save, push.save) : push.save, revision: stored.revision + 1, merged }
}

