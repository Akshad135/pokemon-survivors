import { MAX_CAPS, type BagItem, type EvoItemId } from '../data/shop'
import { h } from './dom'

/**
 * The shop's PixelLab icons (32×32, `public/assets/shop/icons/`): the Bag's
 * consumables, the evolution items, the TM disc, the Bottle Caps, the daily
 * gift, the shop's expansion, the wishlist's heart and the loyalty card's stamp.
 */
export type ShopIconId = BagItem | EvoItemId | 'tmDisc' | 'bottleCap' | 'goldBottleCap' | 'gift' | 'expansion' | 'wishlist' | 'stamp'

export const shopIconUrl = (id: ShopIconId) => `${import.meta.env.BASE_URL}assets/shop/icons/${id}.png`

/** A shop icon as an `<img>`; CSS sizes it in whole multiples of 32 px (`.shop-icon`), pixelated. */
export const shopIcon = (id: ShopIconId, label = '') => h('img', { src: shopIconUrl(id), alt: label, class: 'shop-icon', width: 32, height: 32, draggable: 'false' })

/** Pips for a Pokémon's Bottle Cap level: the partner select's cells and the caps picker show them. */
export const capPips = (level: number) => h('span', { class: 'cap-pips', 'aria-hidden': 'true' }, ...Array.from({ length: MAX_CAPS }, (_, i) => h('i', { class: i < level ? 'on' : '' })))
