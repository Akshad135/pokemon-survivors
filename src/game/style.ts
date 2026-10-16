import { STYLE_SLOTS, styleIds, stylePrice, type StyleId, type StyleSlot } from '../data/style'
import { isRecord, knownIds } from './parse'

/**
 * Styles the player owns and wears: the share cards' frame and background
 * and the Caixa do PC's wallpaper (`data/style.ts`). Bought on the Poké
 * Mart's style shelf (`buyStyle` in `game/counter.ts` pays for it) or given
 * (`grantStyle`). Pure; shared with the API through the save.
 */

/** The style worn in each slot. */
export type Equipped = { readonly [S in StyleSlot]: StyleId<S> }

/** Styles owned per slot (the free defaults are owned without being listed), and the ones equipped. */
export type StyleSave = { owned: { readonly [S in StyleSlot]: readonly StyleId<S>[] }; equipped: Equipped }

export const DEFAULT_EQUIPPED: Equipped = { frame: 'classic', background: 'night', wallpaper: 'classic' }

export const NO_STYLES: StyleSave = { owned: { frame: [], background: [], wallpaper: [] }, equipped: DEFAULT_EQUIPPED }

/** Owned: a free default, bought or given. */
export const ownsStyle = <S extends StyleSlot>(style: StyleSave, slot: S, id: StyleId<S>) => stylePrice(slot, id) === 0 || style.owned[slot].includes(id)

/** Adds a style to the collection (a purchase or a gift). Owning it already changes nothing. */
export const grantStyle = <S extends StyleSlot>(style: StyleSave, slot: S, id: StyleId<S>): StyleSave =>
  ownsStyle(style, slot, id) ? style : { ...style, owned: { ...style.owned, [slot]: [...style.owned[slot], id] } }

/** Wears an owned style; one not owned changes nothing. */
export const equipStyle = <S extends StyleSlot>(style: StyleSave, slot: S, id: StyleId<S>): StyleSave =>
  ownsStyle(style, slot, id) ? { ...style, equipped: { ...style.equipped, [slot]: id } } : style

/** Each slot's owned list, in shelf order, without duplicates or unknown ids. */
const ownedOf = (raw: unknown) => {
  const data = isRecord(raw) ? raw : {}
  return { frame: knownIds(data.frame, styleIds('frame')), background: knownIds(data.background, styleIds('background')), wallpaper: knownIds(data.wallpaper, styleIds('wallpaper')) }
}

/** `id` when the collection owns it, else the slot's default. */
const wearable = <S extends StyleSlot>(owned: StyleSave['owned'], slot: S, raw: unknown): StyleId<S> => {
  const id = styleIds(slot).find((s) => s === raw)
  return id !== undefined && ownsStyle({ owned, equipped: DEFAULT_EQUIPPED }, slot, id) ? id : DEFAULT_EQUIPPED[slot]
}

const equippedOf = (owned: StyleSave['owned'], raw: unknown): Equipped => {
  const data = isRecord(raw) ? raw : {}
  return { frame: wearable(owned, 'frame', data.frame), background: wearable(owned, 'background', data.background), wallpaper: wearable(owned, 'wallpaper', data.wallpaper) }
}

/** Both collections in one (a union); what's worn is `incoming`'s, a setting like the difficulty. */
export const mergeStyle = (base: StyleSave, incoming: StyleSave): StyleSave => {
  const owned = ownedOf(Object.fromEntries(STYLE_SLOTS.map((slot) => [slot, [...base.owned[slot], ...incoming.owned[slot]]])))
  return { owned, equipped: equippedOf(owned, incoming.equipped) }
}

/** The save's `style`: unknown ids are dropped and a style not owned isn't worn. */
export const parseStyle = (raw: unknown): StyleSave => {
  const data = isRecord(raw) ? raw : {}
  const owned = ownedOf(data.owned)
  return { owned, equipped: equippedOf(owned, data.equipped) }
}
