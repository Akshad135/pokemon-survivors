import type { EnemyId } from '../data/enemies'
import { STYLE_SLOTS, styleIds } from '../data/style'
import { addToBag, BAG_ITEM_IDS, type BagItem } from '../game/bag'
import { OUTBREAK_SPECIES } from '../game/outbreak'
import { grantStyle, type StyleSave } from '../game/style'
import { loadSave, outbreakToday, setOutbreak, writeSave } from './save'

/**
 * Dev console helpers for the Surto do dia and the Poké Mart (`ps.*` in dev
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
  /** Puts `n` of a bag item in the bag (`ps.item('lure', 3)`). */
  item: (id: BagItem = 'lure', n = 1) => {
    if (!BAG_ITEM_IDS.includes(id)) return `Items: ${BAG_ITEM_IDS.join(', ')}`
    const save = loadSave()
    writeSave({ ...save, bag: addToBag(save.bag, id, n) })
    refresh()
    return loadSave().bag
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
