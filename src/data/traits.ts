import type { ENEMIES, EnemyId } from './enemies'

/**
 * Behavior traits of regular enemies. A species gets one by setting `trait` in
 * `ENEMIES`; everything else (state, timing, telegraphs, art) follows from the
 * id. Without a trait an enemy just chases the player.
 *
 * - `healer`: every few seconds heals wounded allies around it, with a visible pulse.
 * - `shield`: wards allies around it; a ward absorbs damage until it breaks or fades.
 * - `summoner`: calls in its `SUMMONS` every few seconds, up to a cap alive at once.
 * - `kamikaze`: walks up to the player, stops, blinks and explodes, hurting the player and enemies in the blast.
 * - `beam`: stops, draws its aim line on the ground, then fires a straight beam along it.
 * - `leaper`: crouches and jumps over the horde to where the player stood; its shadow marks the landing.
 *
 * Damage is a multiple of the enemy's contact damage and healing/wards a share of
 * the target's max HP, so every trait scales with the run like the enemy does.
 */
export type TraitId = 'healer' | 'shield' | 'summoner' | 'kamikaze' | 'beam' | 'leaper'

/** Tuning per trait. Times in seconds, distances in world px. */
export const TRAITS = {
  healer: {
    every: 4,
    radius: 64,
    /** Share of each ally's max HP restored per pulse. */
    heal: 0.25,
  },
  shield: {
    every: 5,
    radius: 56,
    /** Damage a ward absorbs, as a share of the warded ally's max HP. */
    ward: 0.4,
    duration: 6,
  },
  summoner: {
    every: 6,
    perCast: 2,
    /** Summons of one summoner alive at once. */
    max: 4,
  },
  kamikaze: {
    /** Lights the fuse when this close to the player (gap between bodies). */
    trigger: 14,
    fuse: 1.1,
    /** Blast radius beyond the body radius, so bigger species blow up bigger. */
    radius: 26,
    /** Player damage, in multiples of contact damage. */
    damage: 2.5,
    /** Damage to enemies in the blast, as a share of their max HP (bosses take the player damage instead). */
    enemyDamage: 0.6,
  },
  beam: {
    every: 5,
    /** Starts aiming only when the player is this close and on screen. */
    range: 150,
    aim: 0.8,
    fire: 0.3,
    length: 240,
    /** Full width of the beam. */
    width: 7,
    damage: 1.6,
  },
  leaper: {
    every: 5.5,
    /** Jumps only when the player is between these distances. */
    min: 50,
    max: 170,
    crouch: 0.35,
    air: 0.85,
    /** Peak height of the jump, in px. */
    height: 48,
    /** Shockwave radius at the landing spot. */
    radius: 20,
    damage: 1.5,
  },
} as const satisfies Record<TraitId, Record<string, number>>

/** Species whose `ENEMIES` entry has the summoner trait. */
export type SummonerId = { [K in EnemyId]: (typeof ENEMIES)[K] extends { trait: 'summoner' } ? K : never }[EnemyId]

/** Who each summoner calls in, cycling through the list. Every summoner must have an entry (the type enforces it). */
export const SUMMONS: Record<SummonerId, readonly EnemyId[]> = {
  nidoqueen: ['nidoranF', 'nidoranM'],
}

export const isSummoner = (kind: EnemyId): kind is SummonerId => kind in SUMMONS
