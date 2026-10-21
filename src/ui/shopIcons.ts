import type { BagItem } from '../data/shop'
import { h } from './dom'

/** The shop's PixelLab icons (32×32, `public/assets/shop/icons/`): the Bag's consumables, the daily gift, the shop's expansion and the wishlist's heart. */
export type ShopIconId = BagItem | 'gift' | 'expansion' | 'wishlist'

export const shopIconUrl = (id: ShopIconId) => `${import.meta.env.BASE_URL}assets/shop/icons/${id}.png`

/** A shop icon as an `<img>`; CSS sizes it in whole multiples of 32 px (`.shop-icon`), pixelated. */
export const shopIcon = (id: ShopIconId, label = '') => h('img', { src: shopIconUrl(id), alt: label, class: 'shop-icon', width: 32, height: 32, draggable: 'false' })
