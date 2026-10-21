import { describe, expect, it } from 'vitest'
import { ITEMS } from '../data/items'
import { BAG_ITEMS } from '../game/bag'
import { CONSUMABLES } from '../game/consumables'
import { UPGRADES } from '../game/meta'
import { sceneryFiles } from './scenery'

const names = (paths: Record<string, unknown>) => new Set(Object.keys(paths).map((p) => p.slice(p.lastIndexOf('/') + 1, -4)))
const items = names(import.meta.glob('../../public/assets/items/*.png'))
const scenery = names(import.meta.glob('../../public/assets/scenery/*.png'))

describe('picture files', () => {
  it('has an icon for every held item, upgrade, consumable and Bag item', () => {
    expect(Object.keys({ ...ITEMS, ...UPGRADES, ...CONSUMABLES, ...BAG_ITEMS }).filter((id) => !items.has(id))).toEqual([])
  })

  it('has every painted scenery piece', () => {
    expect(sceneryFiles().filter((file) => !scenery.has(file))).toEqual([])
  })
})
