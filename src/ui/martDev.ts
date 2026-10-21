import type { EnemyId } from '../data/enemies'
import { STYLE_SLOTS, styleIds } from '../data/style'
import { SHOP_LEVEL_IDS, type ShopLevel } from '../data/shop'
import { addToBag, BAG_ITEM_IDS, type BagItem } from '../game/bag'
import { brasiliaDay, isDayKey } from '../game/day'
import { OUTBREAK_SPECIES } from '../game/outbreak'
import { dayStyle, isDeal, vitrineCards, vitrineOf, vitrinePrice } from '../game/shop'
import { grantStyle, type StyleSave } from '../game/style'
import { loadSave, outbreakToday, setOutbreak, today, writeSave } from './save'

/**
 * Dev console helpers for the Surto do dia and the Kecleon Shop (`ps.*` in dev
 * builds). `refresh` rebuilds the screen showing, so changes show up right away.
 */
export const martDevTools = (refresh: () => void) => ({
  /** Holds `id` as today's outbreak (`ps.outbreak('gastly')`), or goes back to the day's without one. Returns the outbreak. */
  outbreak: (id?: EnemyId) => {
    if (id && !OUTBREAK_SPECIES.includes(id)) return `Outbreak species: ${OUTBREAK_SPECIES.join(', ')}`
    setOutbreak(id ?? null)
    refresh()
    return outbreakToday()
  },
  /** Puts `n` of a bag item in the bag (`ps.item('maxRevive', 3)`; any of `BAG_ITEM_IDS`). */
  item: (id: BagItem = 'lure', n = 1) => {
    if (!BAG_ITEM_IDS.includes(id)) return `Items: ${BAG_ITEM_IDS.join(', ')}`
    const save = loadSave()
    writeSave({ ...save, bag: addToBag(save.bag, id, n) })
    refresh()
    return loadSave().bag
  },
  /** Sets the save's shop level, 1 to 5 (`ps.shopLevel(3)`), without paying for it. Returns the shop. */
  shopLevel: (level: ShopLevel = 1) => {
    if (!SHOP_LEVEL_IDS.includes(level)) return `Levels: ${SHOP_LEVEL_IDS.join(', ')}`
    const save = loadSave()
    writeSave({ ...save, shop: { ...save.shop, level } })
    refresh()
    return loadSave().shop
  },
  /**
   * Prints a day's Vitrine (`ps.vitrine('2026-10-25')`, today without one): the gift, the egg, and each card
   * with its price for this save, the deal and the level that first shows it. Returns the Vitrine.
   */
  vitrine: (day?: string) => {
    const v = vitrineOf(day && isDayKey(day) ? day : brasiliaDay(today()))
    const save = loadSave()
    const firstLevel = (i: number) => SHOP_LEVEL_IDS.find((l) => vitrineCards(v, l).length > i)
    const style = dayStyle(v, save.style)
    console.table(
      v.cards.map((key, i) => ({
        card: key === 'style' ? `style: ${style ? `${style.slot} ${style.id}` : '(all owned)'}` : key === 'egg' ? `egg: ${v.egg}` : key,
        price: vitrinePrice(v, key, save.style),
        deal: isDeal(v, key),
        fromLevel: firstLevel(i),
      })),
    )
    console.log(`${v.day} · gift: ${v.gift} · egg: ${v.egg}`)
    return v
  },
  /** Adds ₽ to the wallet (`ps.money(20000)`). */
  money: (amount = 10_000) => {
    const save = loadSave()
    writeSave({ ...save, wallet: save.wallet + amount })
    refresh()
    return loadSave().wallet
  },
  /** Owns every style of the shelf, as if bought (pays nothing). */
  unlockStyles: () => {
    const save = loadSave()
    const style = STYLE_SLOTS.reduce<StyleSave>((acc, slot) => styleIds(slot).reduce<StyleSave>((s, id) => grantStyle(s, slot, id), acc), save.style)
    writeSave({ ...save, style })
    refresh()
  },
})
