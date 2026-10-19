import { GIFT_TITLES, type GiftTitleId } from '../data/achievements'
import { HATCHLING_IDS, HATCHLINGS, type HatchlingId } from '../data/hatchlings'
import { STYLE_SLOTS, styleIds, type StyleId, type StyleSlot } from '../data/style'
import { parseHandle } from './ranking'
import { markHatch } from './dex'
import { EGG_TIER_IDS, EGG_TIERS, EGGS, grantEgg, type EggTier, type Hatch } from './eggs'
import type { Save } from './meta'
import { isRecord, wholeNumber } from './parse'
import { mergeRibbons, parseRibbon, type Ribbon } from './ribbons'
import { isSupporterTier, type SupporterTier } from './supporters'
import { grantShinyPick } from './shinyPicks'
import { equipStyle, grantStyle, type StyleSave } from './style'

/**
 * Presente Misterioso (Mystery Gift): the API keeps an inbox per player
 * (`gifts` table), the game fetches what's unclaimed when it syncs, applies
 * each gift to the save with `applyGift` and marks it claimed. The save keeps
 * the ids it applied (`gifts`, merged as a union), so a gift never lands
 * twice, even if marking it claimed fails. Pure; shared with the API.
 */

/** A style of any slot. */
export type StyleRef = { [S in StyleSlot]: { slot: S; id: StyleId<S> } }[StyleSlot]

/** What a gift brings. A kind this build doesn't know stays unclaimed for a newer one. */
export type GiftContent =
  | { kind: 'egg'; tier: EggTier }
  | { kind: 'coins'; amount: number }
  | { kind: 'title'; title: GiftTitleId }
  | { kind: 'style'; style: StyleRef }
  /** The family hatches shiny right away, with its scene (a family already shiny pays its egg's ₽). */
  | { kind: 'shinyHatch'; family: HatchlingId }
  /** A Desafio do dia's ribbon (`game/ribbons.ts`), with the day and the place. */
  | { kind: 'ribbon'; ribbon: Ribbon }
  /** A shiny of the player's choice, picked later (`game/shinyPicks.ts`): the supporters' thank-you. */
  | { kind: 'shinyPick' }

export type GiftKind = GiftContent['kind']

/**
 * Why it came: an invite's welcome (from the inviter's handle), friends
 * brought, a donation (`game/supporters.ts`), or a present from the game's
 * admin (`game/admin.ts`, from their handle).
 */
export type GiftReason =
  | { kind: 'welcome'; from: string | null }
  | { kind: 'friends'; count: number }
  | { kind: 'support'; tier: SupporterTier }
  | { kind: 'staff'; from: string | null }

export type Gift = { id: string; content: GiftContent; reason: GiftReason | null }

/** Most coins one gift may bring. */
const MAX_COINS = 100_000

/** Gift ids are the API's uuids; anything longer than this isn't one. */
const MAX_ID = 64

const isOneOf = <T extends string>(v: unknown, ids: readonly T[]): v is T => ids.some((id) => id === v)

const parseStyleRef = (v: unknown): StyleRef | null => {
  if (!isRecord(v)) return null
  const slot = STYLE_SLOTS.find((s) => s === v.slot)
  if (slot === 'frame' && isOneOf(v.id, styleIds('frame'))) return { slot, id: v.id }
  if (slot === 'background' && isOneOf(v.id, styleIds('background'))) return { slot, id: v.id }
  if (slot === 'wallpaper' && isOneOf(v.id, styleIds('wallpaper'))) return { slot, id: v.id }
  return null
}

/** A gift's content, or null for a kind (or a value) this build doesn't know. */
export const parseGiftContent = (v: unknown): GiftContent | null => {
  if (!isRecord(v)) return null
  switch (v.kind) {
    case 'egg':
      return isOneOf(v.tier, EGG_TIER_IDS) ? { kind: 'egg', tier: v.tier } : null
    case 'coins': {
      const amount = wholeNumber(v.amount, MAX_COINS)
      return amount > 0 ? { kind: 'coins', amount } : null
    }
    case 'title':
      return isOneOf(v.title, GIFT_TITLES) ? { kind: 'title', title: v.title } : null
    case 'style': {
      const style = parseStyleRef(v.style)
      return style ? { kind: 'style', style } : null
    }
    case 'shinyHatch':
      return isOneOf(v.family, HATCHLING_IDS) ? { kind: 'shinyHatch', family: v.family } : null
    case 'ribbon': {
      const ribbon = parseRibbon(v.ribbon)
      return ribbon ? { kind: 'ribbon', ribbon } : null
    }
    case 'shinyPick':
      return { kind: 'shinyPick' }
    default:
      return null
  }
}

const parseReason = (v: unknown): GiftReason | null => {
  if (!isRecord(v)) return null
  if (v.kind === 'welcome') return { kind: 'welcome', from: parseHandle(v.from) }
  if (v.kind === 'friends') return { kind: 'friends', count: wholeNumber(v.count) }
  if (v.kind === 'support' && isSupporterTier(v.tier)) return { kind: 'support', tier: v.tier }
  if (v.kind === 'staff') return { kind: 'staff', from: parseHandle(v.from) }
  return null
}

const isGiftId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= MAX_ID

/** A gift from the API (`{ id, content, reason }`), or null when this build can't apply it. */
export const parseGift = (v: unknown): Gift | null => {
  if (!isRecord(v) || !isGiftId(v.id)) return null
  const content = parseGiftContent(v.content)
  return content && { id: v.id, content, reason: parseReason(v.reason) }
}

/**
 * What applying a gift came to: `applied` with the new save (and the hatch
 * to show, for a shiny hatch), `claimed` when the save already has it (just
 * mark it claimed again), or `wait` when it can't land yet (an egg with the
 * incubator full: it stays in the inbox until there's room).
 */
export type GiftOutcome = { status: 'applied'; save: Save; hatch: Hatch | null } | { status: 'claimed' } | { status: 'wait' }

/** The family's shiny, hatched on the spot (`hatchEgg`'s rules: a family shiny already pays its egg's ₽). */
const shinyHatch = (save: Save, id: HatchlingId): { save: Save; hatch: Hatch } => {
  const tier = HATCHLINGS[id].egg
  const duplicate = save.hatched[id]?.shiny === true
  const refund = duplicate ? EGG_TIERS[tier].refund : 0
  return {
    save: {
      ...save,
      hatched: duplicate ? save.hatched : { ...save.hatched, [id]: { shiny: true } },
      wallet: save.wallet + refund,
      dex: markHatch(save.dex, HATCHLINGS[id].line.map((stage) => stage.dex), true),
    },
    hatch: { id, tier, shiny: true, duplicate, refund },
  }
}

/** Owns and wears a style. Narrowing per slot keeps each id with its own slot for the type checker. */
const wear = (style: StyleSave, ref: StyleRef): StyleSave => {
  const put = <S extends StyleSlot>(slot: S, id: StyleId<S>) => equipStyle(grantStyle(style, slot, id), slot, id)
  return ref.slot === 'frame' ? put(ref.slot, ref.id) : ref.slot === 'background' ? put(ref.slot, ref.id) : put(ref.slot, ref.id)
}

/**
 * The content on the save, with the hatch to show if it was one. Titles and
 * styles are worn right away; a ribbon joins the day's; a shiny pick leaves
 * its ticket (under the gift's `id`) for the player to spend.
 */
const give = (save: Save, content: GiftContent, id: string): { save: Save; hatch: Hatch | null } => {
  switch (content.kind) {
    case 'egg':
      return { save: grantEgg(save, content.tier).save, hatch: null }
    case 'coins':
      return { save: { ...save, wallet: save.wallet + content.amount }, hatch: null }
    case 'title':
      return { save: { ...save, titles: save.titles.includes(content.title) ? save.titles : [...save.titles, content.title], title: content.title }, hatch: null }
    case 'style':
      return { save: { ...save, style: wear(save.style, content.style) }, hatch: null }
    case 'shinyHatch':
      return shinyHatch(save, content.family)
    case 'ribbon':
      return { save: { ...save, ribbons: mergeRibbons(save.ribbons, [content.ribbon]) }, hatch: null }
    case 'shinyPick':
      return { save: grantShinyPick(save, id), hatch: null }
  }
}

/** Applies a gift once: its id joins the save's `gifts`, so the same gift again is only `claimed`. */
export const applyGift = (save: Save, gift: Gift): GiftOutcome => {
  if (save.gifts.includes(gift.id)) return { status: 'claimed' }
  if (gift.content.kind === 'egg' && save.eggs.length >= EGGS.slots) return { status: 'wait' }
  const given = give(save, gift.content, gift.id)
  return { status: 'applied', save: { ...given.save, gifts: [...given.save.gifts, gift.id] }, hatch: given.hatch }
}

/* ---------------- Save field ---------------- */

/** The save's `gifts`: the ids of the gifts applied, without duplicates. */
export const parseClaimedGifts = (v: unknown): string[] => (Array.isArray(v) ? [...new Set(v.filter(isGiftId))] : [])

/** Both lists in one (a union), sorted so the merge comes out the same either way. */
export const mergeClaimedGifts = (a: readonly string[], b: readonly string[]): string[] => [...new Set([...a, ...b])].sort()
