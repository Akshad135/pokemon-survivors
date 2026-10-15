import type { SpecialId } from '../game/special'
import type { Form } from '../render/sprites'
import type { StatDelta } from '../game/stats'
import type { StatusSpec } from '../game/status'
import type { WeatherId } from './biomes'
import type { PlayableId } from './hatchlings'

/**
 * Mega Evolutions: the final stage of a few lines can Mega Evolve once the run
 * finds its Mega Stone (beating a rift legendary drops it). The Mega form lasts
 * `MEGA.duration` seconds, then needs `MEGA.recharge` seconds before the next
 * one. While it lasts the form adds its `stats`, swaps the special for its own
 * and plays its ability. Rules in `game/mega.ts`; names stay in English
 * (official), what the ability does lives in `i18n` (`megas`).
 */

/** What a Mega's ability does beyond its stats. */
export type MegaEffect =
  /** The stats carry it (Tough Claws, Trace, Pixilate, Adaptability). */
  | { kind: 'stats' }
  /** Every `every` seconds, foes within `radius` px of the player get `status` (Shadow Tag). */
  | { kind: 'aura'; radius: number; every: number; status: StatusSpec }
  /** Mega Evolving outside a rift arena starts this weather (Sand Stream). */
  | { kind: 'weather'; weather: WeatherId }

export type MegaDef = {
  name: string
  /** The line's Mega Stone, dropped by the first rift legendary the run beats. */
  stone: string
  /** Sprite form of the final stage (`forms` in sprites.generated.json, `FORMS` in scripts/dex.mjs). */
  form: Form
  /** The stone's look: shell, shine and the helix inside. */
  colors: readonly [shell: string, shine: string, helix: string]
  ability: string
  effect: MegaEffect
  /** Added on top of every other stat source while the Mega form lasts. */
  stats: StatDelta
  /** The special while the Mega form lasts (`SPECIALS`). */
  special: SpecialId
}

/** Mega Evolutions by line. To add one: its entry here, its form in `scripts/dex.mjs`, its special and i18n lines. */
export const MEGAS = {
  charmander: {
    name: 'Mega Charizard X',
    stone: 'Charizardite X',
    form: 'megaX',
    colors: ['#282c40', '#7080a8', '#48a0f8'],
    ability: 'Tough Claws',
    effect: { kind: 'stats' },
    stats: { might: 0.3, speed: 8, armor: 1 },
    special: 'dragonFlare',
  },
  abra: {
    name: 'Mega Alakazam',
    stone: 'Alakazite',
    form: 'mega',
    colors: ['#b88828', '#f8e898', '#c03828'],
    ability: 'Trace',
    effect: { kind: 'stats' },
    stats: { comboMoves: 2, cooldown: -0.15, might: 0.1 },
    special: 'psystrike',
  },
  gastly: {
    name: 'Mega Gengar',
    stone: 'Gengarite',
    form: 'mega',
    colors: ['#482c68', '#a888d0', '#f04060'],
    ability: 'Shadow Tag',
    effect: { kind: 'aura', radius: 90, every: 0.25, status: { kind: 'slow', chance: 1, duration: 0.4, power: 0.45 } },
    stats: { might: 0.25, cooldown: -0.1 },
    special: 'poltergeist',
  },
  ralts: {
    name: 'Mega Gardevoir',
    stone: 'Gardevoirite',
    form: 'mega',
    colors: ['#38985a', '#b8f0c8', '#f06888'],
    ability: 'Pixilate',
    effect: { kind: 'stats' },
    stats: { might: 0.15, typeDamage: { normal: 0.3, fairy: 0.3 }, regen: 1.5 },
    special: 'moonblast',
  },
  riolu: {
    name: 'Mega Lucario',
    stone: 'Lucarionite',
    form: 'mega',
    colors: ['#2858a0', '#a8c8f8', '#202028'],
    ability: 'Adaptability',
    effect: { kind: 'stats' },
    stats: { speed: 10, typeDamage: { fighting: 0.35, steel: 0.35 } },
    special: 'auraStorm',
  },
  larvitar: {
    name: 'Mega Tyranitar',
    stone: 'Tyranitarite',
    form: 'mega',
    colors: ['#4c6c38', '#b0d080', '#e8e0b0'],
    ability: 'Sand Stream',
    effect: { kind: 'weather', weather: 'sand' },
    stats: { maxHp: 60, armor: 3, might: 0.2 },
    special: 'stoneEdge',
  },
} as const satisfies Partial<Record<PlayableId, MegaDef>>

export type MegaLine = keyof typeof MEGAS

export const MEGA_LINES = Object.keys(MEGAS) as MegaLine[]

const BY_LINE: Partial<Record<PlayableId, MegaDef>> = MEGAS

/** The Mega Evolution of a line, or null for the lines without one. */
export const megaOf = (line: PlayableId): MegaDef | null => BY_LINE[line] ?? null

/** Timing and the burst of a Mega Evolution, in seconds and world px. */
export const MEGA = {
  /** How long the Mega form lasts. */
  duration: 20,
  /** Seconds after it ends before the next Mega Evolution (the cooldown stat doesn't touch it). */
  recharge: 60,
  /** The transformation: the simulation waits this long while the keystone energy wraps the Pokémon. */
  intro: 1.1,
  /** Invulnerability once it lands, so the horde doesn't eat the moment. */
  iframes: 1.5,
  /** The rainbow burst at the end of the transformation: reach, power (scaled like the special) and push. */
  wave: { radius: 100, power: 50, knockback: 320 },
} as const
