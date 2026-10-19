/**
 * The Flashes setting (Settings → Game). `normal` draws the game as designed;
 * `reduced` is for players sensitive to bright flashes: no white screen flashes,
 * no white hit flashes on sprites (a steady dim red instead) and no fast flicker.
 * Pure presentation: the simulation never reads it.
 */
export const FLASH_MODES = ['normal', 'reduced'] as const

export type Flashes = (typeof FLASH_MODES)[number]

/** What a hit leaves on a sprite when flashes are reduced, in place of the white flash. */
export const HURT_TINT = { color: '#681828', amount: 0.45 } as const

/** Shortest swap (seconds) of a flickering silhouette (evolution, Mega) when flashes are reduced: 2 Hz, well under 3 flashes a second. */
export const CALM_PERIOD = 0.25
