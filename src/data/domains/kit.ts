import type { BossPattern, HazardVisual } from '../bosses'

/** Share of the player's max HP a pin hits for at least (`share`), so a maxed Poké Mart doesn't make standing still safe. */
export const PIN_SHARE = 0.2

/** Seconds between a domain's pins. */
export const PIN_EVERY = 2.6

/**
 * One circle where the player stands, every `every` s: nothing to a player on
 * the move, a steady toll on one who stands still (`damage`, or `PIN_SHARE` of
 * their max HP when that's more). The domains and the map legendaries
 * (`data/legendBosses.ts`) carry one in each phase.
 */
export const pin = (visual: HazardVisual, damage: number, every = 2.4): BossPattern => ({
  kind: 'strikes', every, target: 'player', count: 1, spread: 0, radius: 20, delay: 1.1, damage, visual, share: PIN_SHARE,
})
