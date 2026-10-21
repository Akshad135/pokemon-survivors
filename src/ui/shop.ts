import { playSfx } from '../engine/audio'
import type { Input } from '../engine/input'
import { formatNumber, formatPokeDollars, t } from '../i18n'
import { STYLE_SLOTS, styleIds, stylePrice, type StyleId, type StyleSlot } from '../data/style'
import { MAX_SHOP_LEVEL, SHOP_LEVELS, VITRINE, type VitrineEgg, type VitrineKey } from '../data/shop'
import { BAG_ITEMS, bagCount } from '../game/bag'
import { msToNextDay } from '../game/day'
import { EGG_TIERS } from '../game/eggs'
import {
  buyFromVitrine,
  buyStyle,
  claimGift,
  dayStyle,
  giftBlock,
  investBlock,
  investInShop,
  isDeal,
  nextShopLevel,
  onPick,
  stockLeft,
  vitrineBlock,
  vitrinePrice,
  vitrineStock,
  type StylePick,
  type Vitrine,
  type VitrineBlock,
} from '../game/shop'
import { buyUpgrade, refundAll, totalSpent, UPGRADE_IDS, UPGRADES, upgradePrice, type Save } from '../game/meta'
import { equipStyle, ownsStyle } from '../game/style'
import { bagIcon, coinIcon, eggIcon, upgradeIcon } from '../render/art'
import { styleThumb } from '../render/card'
import { frameIcon, wallpaperUrl } from '../render/cosmetics'
import { h, later, setText } from './dom'
import { loadSave, today, vitrineToday, writeSave } from './save'
import { hint, menu, type Screen } from './screens'

const isTouch = (e: Event) => e instanceof PointerEvent && e.pointerType !== '' && e.pointerType !== 'mouse'

/** Yes/no dialog layered over the mart. Defaults to "no" so a stray Enter is harmless. */
const confirmDialog = (root: HTMLElement, input: Input, text: string, onAnswer: (yes: boolean) => void): Screen => {
  const yes = h('button', { class: 'btn' }, t().mart.yes)
  const no = h('button', { class: 'btn' }, t().mart.no)
  const nav = menu(input, [yes, no], (i) => onAnswer(i === 0), { horizontal: true, initial: 1 })
  const offEsc = input.onKey((k) => k === 'Escape' && onAnswer(false))
  const el = h('div', { class: 'screen dim' }, h('div', { class: 'dialog box pop' }, h('div', { class: 'dialog-title' }, text), h('div', { class: 'buttons' }, yes, no)))
  root.append(el)
  return { el, dispose: () => (nav.off(), offEsc(), el.remove()) }
}

/* ---------------- Shelves ---------------- */

const SHELVES = ['upgrades', 'vitrine', 'style'] as const

type Shelf = (typeof SHELVES)[number]

/** What the description box shows for the highlighted row: a picture, a title, a line and the main button. */
type Desc = { icon: HTMLElement; title: string; text: string; action: string; disabled: boolean }

/**
 * One row of a shelf: its button, how it redraws, its description, and what
 * the main button does (null: denied). `confirm`: the question to ask first
 * (null when the row can't act), for spending that can't be undone.
 */
type Row = { el: HTMLButtonElement; refresh: (save: Save) => void; describe: (save: Save) => Desc; act: (save: Save) => Save | null; confirm?: (save: Save) => string | null }

const icon = (src: string, cls = '') => h('img', { src, alt: '', class: cls })

/** A row's frame: icon, name with a line under it, and the price (or status) on the right. */
const rowShell = (picture: HTMLElement, name: string) => {
  const sub = h('span', { class: 'mart-sub' })
  const price = h('span', { class: 'mart-price' })
  const el = h('button', { class: 'mart-row' }, picture, h('span', { class: 'mart-info' }, h('span', { class: 'mart-name' }, name), sub), price)
  return { el, sub, price }
}

/** The Poké Mart's permanent upgrades, Shiny Charm included. */
const upgradeRows = (): Row[] =>
  UPGRADE_IDS.map((id) => {
    const def = UPGRADES[id]
    const { el, sub, price } = rowShell(icon(upgradeIcon(id)), def.name)
    sub.classList.add('pips')
    return {
      el,
      refresh: (save) => {
        const rank = save.ranks[id]
        sub.replaceChildren(...Array.from({ length: def.maxRank }, (_, i) => h('span', { class: i < rank ? 'pip on' : 'pip' })))
        const maxed = rank >= def.maxRank
        setText(price, maxed ? t().max : formatPokeDollars(upgradePrice(id, rank)))
        el.classList.toggle('maxed', maxed)
        el.classList.toggle('poor', !maxed && upgradePrice(id, rank) > save.wallet)
      },
      describe: (save) => {
        const rank = save.ranks[id]
        const maxed = rank >= def.maxRank
        return {
          icon: icon(upgradeIcon(id)),
          title: t().mart.rank(def.name, rank, def.maxRank),
          text: t().upgrades[id],
          action: maxed ? t().max : t().mart.buy(formatPokeDollars(upgradePrice(id, rank))),
          disabled: maxed || upgradePrice(id, rank) > save.wallet,
        }
      },
      act: (save) => buyUpgrade(save, id),
    }
  })

/** Name, picture and description of a Vitrine card today; the style card shows the day's `style` for this save (null: it owns them all). */
const vitrineItem = (v: Vitrine, key: VitrineKey, style: StylePick | null) => {
  const sh = t().shop
  if (key === 'egg') {
    const tier = v.egg
    const odds = (Object.keys(VITRINE.eggs) as VitrineEgg[]).map((k) => VITRINE.eggs[k].weight)
    const total = odds.reduce((a, b) => a + b, 0)
    const [common, rare, ultra] = odds.map((w) => Math.round((w / total) * 100)) as [number, number, number]
    return { name: t().eggs.tiers[tier], picture: () => icon(eggIcon(tier)), text: `${t().mart.eggDescription(formatNumber(EGG_TIERS[tier].steps))} ${sh.eggOdds(common, rare, ultra)}` }
  }
  if (key === 'style') {
    if (!style) return { name: sh.dayStyle, picture: () => icon(frameIcon('classic'), 'mart-pixel'), text: sh.allStyles }
    const name = (t().mart.styles[style.slot] as Readonly<Record<string, string>>)[style.id] ?? style.id
    return { name: `${sh.dayStyle}: ${name}`, picture: (big: boolean) => onPick(style, (slot, id) => stylePicture(slot, id, big)), text: t().mart.styleDescriptions[style.slot] }
  }
  return { name: BAG_ITEMS[key].name, picture: () => icon(bagIcon(key)), text: t().bag.descriptions[key] }
}

/** What a blocked Vitrine row says instead of its price. */
const blockText = (block: VitrineBlock | null) => (block === null || block === 'poor' ? null : t().shop.blocks[block])

/** The free gift of the day: one consumable, taken once per day. */
const giftRow = (v: Vitrine): Row => {
  const sh = t().shop
  const name = BAG_ITEMS[v.gift].name
  const { el, sub, price } = rowShell(icon(bagIcon(v.gift)), sh.gift(name))
  el.classList.add('on-sale')
  return {
    el,
    refresh: (save) => {
      const taken = giftBlock(save, v) !== null
      setText(sub, t().mart.inBag(bagCount(save.bag, v.gift)))
      setText(price, taken ? sh.claimed : sh.free)
      el.classList.toggle('maxed', taken)
    },
    describe: (save) => {
      const taken = giftBlock(save, v) !== null
      return { icon: icon(bagIcon(v.gift)), title: sh.gift(name), text: sh.giftDescription(t().bag.descriptions[v.gift]), action: taken ? sh.claimed : sh.claim, disabled: taken }
    },
    act: (save) => claimGift(save, v),
  }
}

/** One card of the day's Vitrine (every card shows; the ones above the shop's level say so), the deal first. */
const vitrineRow = (v: Vitrine, key: VitrineKey, style: StylePick | null): Row => {
  const item = vitrineItem(v, key, style)
  const { el, sub, price } = rowShell(item.picture(false), item.name)
  const deal = isDeal(v, key)
  if (deal) el.classList.add('on-sale')
  const priceTag = (save: Save) => formatPokeDollars(vitrinePrice(v, key, save.style) ?? 0)
  return {
    el,
    refresh: (save) => {
      const lines = [t().mart.stock(stockLeft(save.shop, v, key), vitrineStock(key)), key !== 'egg' && key !== 'style' && t().mart.inBag(bagCount(save.bag, key))]
      setText(sub, lines.filter((l) => typeof l === 'string').join(' · '))
      const block = vitrineBlock(save, v, key)
      const blocked = blockText(block)
      price.replaceChildren(...(deal && !blocked ? [h('b', { class: 'mart-sale' }, t().mart.sale(VITRINE.deal * 100)), ' '] : []), blocked ?? priceTag(save))
      el.classList.toggle('maxed', blocked !== null)
      el.classList.toggle('poor', block === 'poor')
    },
    describe: (save) => {
      const block = vitrineBlock(save, v, key)
      return {
        icon: item.picture(true),
        title: item.name,
        text: deal ? `${item.text} ${t().mart.saleNote(VITRINE.deal * 100)}` : item.text,
        action: blockText(block) ?? t().mart.buy(priceTag(save)),
        disabled: block !== null,
      }
    },
    act: (save) => buyFromVitrine(save, v, key),
  }
}

/** Investing in the shop's next level: for good, so it asks first. */
const investRow = (): Row => {
  const sh = t().shop
  const { el, sub, price } = rowShell(icon(coinIcon(2)), '')
  const next = (save: Save) => nextShopLevel(save.shop.level)
  return {
    el,
    refresh: (save) => {
      const lv = next(save)
      el.querySelector('.mart-name')!.textContent = lv ? sh.invest(sh.levels[lv]) : sh.level(sh.levels[MAX_SHOP_LEVEL], MAX_SHOP_LEVEL)
      setText(sub, sh.level(sh.levels[save.shop.level], save.shop.level))
      setText(price, lv ? formatPokeDollars(SHOP_LEVELS[lv].cost) : t().max)
      el.classList.toggle('maxed', lv === null)
      el.classList.toggle('poor', investBlock(save) === 'poor')
    },
    describe: (save) => {
      const lv = next(save)
      if (!lv) return { icon: icon(coinIcon(2)), title: sh.level(sh.levels[MAX_SHOP_LEVEL], MAX_SHOP_LEVEL), text: sh.investMax, action: t().max, disabled: true }
      const def = SHOP_LEVELS[lv]
      return {
        icon: icon(coinIcon(2)),
        title: sh.invest(sh.levels[lv]),
        text: sh.investDescription(sh.levels[lv], def.vitrineSlots + 1, def.bagSlots),
        action: t().mart.buy(formatPokeDollars(def.cost)),
        disabled: investBlock(save) !== null,
      }
    },
    act: investInShop,
    confirm: (save) => {
      const lv = next(save)
      return lv && !investBlock(save) ? sh.investConfirm(sh.levels[lv], formatPokeDollars(SHOP_LEVELS[lv].cost)) : null
    },
  }
}

/** The Vitrine do dia's shelf: the gift, every card of the day and the shop's next level. */
const vitrineRows = (v: Vitrine, save: Save): Row[] => {
  const style = dayStyle(v, save.style)
  return [giftRow(v), ...v.cards.map((key) => vitrineRow(v, key, style)), investRow()]
}

/** A style's picture: the frame's ball (or rings), a corner of the sky, the wallpaper's tile. */
const stylePicture = <S extends StyleSlot>(slot: S, id: StyleId<S>, big: boolean) => {
  if (slot === 'wallpaper') return h('span', { class: big ? 'mart-tile big' : 'mart-tile', style: `--wallpaper:url(${wallpaperUrl(id as StyleId<'wallpaper'>)})` })
  if (!big && slot === 'frame') return icon(frameIcon(id as StyleId<'frame'>), 'mart-pixel')
  const equipped = loadSave().style.equipped
  const canvas = big
    ? slot === 'frame'
      ? styleThumb(id as StyleId<'frame'>, equipped.background)
      : styleThumb(equipped.frame, id as StyleId<'background'>)
    : styleThumb(null, id as StyleId<'background'>, 14, 14)
  canvas.classList.add(big ? 'mart-preview' : 'mart-pixel')
  return canvas
}

/** The style shelf: every frame, background and wallpaper, the owned ones to wear and the rest to buy (and wear). */
const styleRows = (slot: StyleSlot): Row[] =>
  styleIds(slot).flatMap((id) => {
    const listed = stylePrice(slot, id)
    // Gift-only styles show once owned, to wear.
    if (listed === null && !ownsStyle(loadSave().style, slot, id)) return []
    const price = listed ?? 0
    const name = (t().mart.styles[slot] as Readonly<Record<string, string>>)[id] ?? id
    const shell = rowShell(stylePicture(slot, id, false), name)
    const status = (save: Save) => {
      if (save.style.equipped[slot] === id) return t().mart.equipped
      return ownsStyle(save.style, slot, id) ? t().mart.owned : formatPokeDollars(price)
    }
    return [
      {
        el: shell.el,
        refresh: (save) => {
          setText(shell.price, status(save))
          const owned = ownsStyle(save.style, slot, id)
          shell.el.classList.toggle('maxed', save.style.equipped[slot] === id)
          shell.el.classList.toggle('poor', !owned && price > save.wallet)
        },
        describe: (save) => {
          const owned = ownsStyle(save.style, slot, id)
          const worn = save.style.equipped[slot] === id
          return {
            icon: stylePicture(slot, id, true),
            title: name,
            text: t().mart.styleDescriptions[slot],
            action: worn ? t().mart.equipped : owned ? t().mart.equip : t().mart.buy(formatPokeDollars(price)),
            disabled: worn || (!owned && price > save.wallet),
          }
        },
        // Buying wears it right away; an owned one is just worn.
        act: (save) => {
          if (save.style.equipped[slot] === id) return null
          const bought = ownsStyle(save.style, slot, id) ? save : buyStyle(save, slot, id)
          return bought && { ...bought, style: equipStyle(bought.style, slot, id) }
        },
      },
    ]
  })

/** "5h 12min": time left until the Vitrine turns over. */
const restocksIn = () => {
  const minutes = Math.ceil(msToNextDay(today()) / 60_000)
  return t().missions.duration(0, Math.floor(minutes / 60), minutes % 60)
}

/**
 * Poké Mart: three shelves in tabs. Upgrades (permanent ranks, the Shiny
 * Charm among them), the Vitrine do dia (the day's gift and cards, a daily
 * stock, the same for everyone, and the shop's next level) and Style (card
 * frames and backgrounds, PC wallpapers). GBA-style list with prices on the right and a description box
 * below. Keyboard (Q/E or ←/→ shelf, ↑↓, Enter, Esc), mouse (click buys) and
 * touch (tap selects, tap again or the button buys).
 */
export const shop = (root: HTMLElement, input: Input, onClose: () => void): Screen => {
  const m = t().mart
  let save = loadSave()
  let shelf: Shelf = 'upgrades'
  let vitrine = vitrineToday()
  let rows: Row[] = []
  let index = 0
  let confirm: Screen | null = null

  const wallet = h('span')
  const tabs = SHELVES.map((id) => h('button', { class: 'tab', role: 'tab', onclick: () => switchShelf(id) }, m.tabs[id]))
  const list = h('div', { class: 'mart-list' })
  const back = h('button', { class: 'btn' }, m.back)
  const refund = h('button', { class: 'btn' }, m.refund)
  const buttons = h('div', { class: 'buttons' }, back, refund)
  const intro = h('p', { class: 'mart-intro' })

  const descIconBox = h('div', { class: 'mart-desc-icon' })
  const descTitle = h('div', { class: 'mart-desc-title' })
  const descText = h('p', {})
  const buy = h('button', { class: 'btn mart-buy' })

  /** Rows, then Back (and Refund on the upgrades shelf). */
  const entries = () => [...rows.map((r) => r.el), back, ...(shelf === 'upgrades' ? [refund] : [])]

  const close = () => later(onClose)

  /** The Vitrine's line: the shop's level and when it turns over. */
  const vitrineIntro = () => m.vitrineIntro(t().shop.level(t().shop.levels[save.shop.level], save.shop.level), restocksIn())

  const refresh = () => {
    setText(wallet, formatPokeDollars(save.wallet))
    for (const r of rows) r.refresh(save)
    entries().forEach((b, j) => b.classList.toggle('selected', j === index))
    const row = rows[index]
    buy.classList.toggle('hidden', !row)
    if (row) {
      const d = row.describe(save)
      descIconBox.replaceChildren(d.icon)
      descIconBox.classList.remove('hidden')
      descIconBox.classList.toggle('wide', d.icon instanceof HTMLCanvasElement)
      setText(descTitle, d.title)
      setText(descText, d.text)
      setText(buy, d.action)
      buy.toggleAttribute('disabled', d.disabled)
    } else {
      descIconBox.classList.add('hidden')
      const isBack = index === rows.length
      setText(descTitle, isBack ? m.back : m.refundAll)
      setText(descText, isBack ? m.backDescription : m.refundDescription(formatPokeDollars(totalSpent(save.ranks))))
    }
  }

  /** Fills the list with a shelf's rows (and the style shelf's headings). */
  const build = () => {
    tabs.forEach((tab, i) => {
      tab.classList.toggle('on', SHELVES[i] === shelf)
      tab.setAttribute('aria-selected', String(SHELVES[i] === shelf))
    })
    refund.classList.toggle('hidden', shelf !== 'upgrades')
    intro.classList.toggle('hidden', shelf !== 'vitrine')
    if (shelf === 'upgrades') {
      rows = upgradeRows()
      list.replaceChildren(...rows.map((r) => r.el))
    } else if (shelf === 'vitrine') {
      vitrine = vitrineToday()
      setText(intro, vitrineIntro())
      rows = vitrineRows(vitrine, save)
      list.replaceChildren(...rows.map((r) => r.el))
    } else {
      const groups = STYLE_SLOTS.map((slot) => ({ slot, rows: styleRows(slot) }))
      rows = groups.flatMap((g) => g.rows)
      list.replaceChildren(...groups.flatMap((g) => [h('div', { class: 'mart-group' }, m.styleSlots[g.slot]), ...g.rows.map((r) => r.el)]))
    }
    rows.forEach((r, i) => wire(r.el, i))
    list.scrollTop = 0
  }

  function switchShelf(next: Shelf) {
    if (next === shelf || confirm) return
    shelf = next
    index = 0
    playSfx('move')
    build()
    refresh()
  }

  const stepShelf = (delta: number) => switchShelf(SHELVES[(SHELVES.indexOf(shelf) + delta + SHELVES.length) % SHELVES.length]!)

  const focus = (i: number, sound = true) => {
    const all = entries()
    const next = (i + all.length) % all.length
    if (next === index) return
    index = next
    if (sound) playSfx('move')
    refresh()
    all[index]!.scrollIntoView({ block: 'nearest' })
  }

  // Purchases start from the stored save: an account sync may have changed it while the Mart was open.
  const purchase = (row: Row) => {
    const next = row.act(loadSave())
    if (!next) return playSfx('denied')
    save = next
    writeSave(save)
    playSfx('buy')
    refresh()
  }

  /** Asks `question` before the row acts (an investment), then acts on a yes. */
  const askFirst = (row: Row, question: string) => {
    later(() => {
      confirm = confirmDialog(root, input, question, (yes) => {
        confirm?.dispose()
        confirm = null
        if (yes) purchase(row)
      })
    })
  }

  const askRefund = () => {
    if (totalSpent(save.ranks) === 0) return playSfx('denied')
    later(() => {
      confirm = confirmDialog(root, input, m.refundConfirm(formatPokeDollars(totalSpent(save.ranks))), (yes) => {
        confirm?.dispose()
        confirm = null
        if (!yes) return
        save = refundAll(loadSave())
        writeSave(save)
        playSfx('buy')
        refresh()
      })
    })
  }

  const activate = (i: number) => {
    const row = rows[i]
    const question = row?.confirm?.(loadSave())
    if (row && question) return askFirst(row, question)
    if (row) return purchase(row)
    if (i === rows.length) return close()
    askRefund()
  }

  /** Hover highlights; a click buys, but on touch the first tap only selects, so browsing never spends money by accident. */
  function wire(el: HTMLElement, i: number) {
    el.addEventListener('pointerenter', (e) => !isTouch(e) && focus(i))
    el.addEventListener('click', (e) => {
      if (confirm) return
      if (isTouch(e) && i !== index && i < rows.length) return focus(i)
      focus(i, false)
      activate(i)
    })
  }
  const wireButton = (el: HTMLElement, at: () => number) => {
    el.addEventListener('pointerenter', (e) => !isTouch(e) && focus(at()))
    el.addEventListener('click', () => {
      if (confirm) return
      focus(at(), false)
      activate(at())
    })
  }
  wireButton(back, () => rows.length)
  wireButton(refund, () => rows.length + 1)
  buy.addEventListener('click', () => !confirm && activate(index))

  const off = input.onKey((key) => {
    if (confirm) return
    const onButtons = index >= rows.length
    if (key === 'ArrowUp' || key === 'KeyW') focus(index - 1)
    else if (key === 'ArrowDown' || key === 'KeyS') focus(index + 1)
    else if (key === 'KeyQ' || key === 'PageUp') stepShelf(-1)
    else if (key === 'KeyE' || key === 'PageDown') stepShelf(1)
    else if ((key === 'ArrowLeft' || key === 'KeyA') && onButtons) focus(rows.length)
    else if ((key === 'ArrowRight' || key === 'KeyD') && onButtons) focus(entries().length - 1)
    else if (key === 'ArrowLeft' || key === 'KeyA') stepShelf(-1)
    else if (key === 'ArrowRight' || key === 'KeyD') stepShelf(1)
    else if (key === 'Enter' || key === 'Space') activate(index)
    else if (key === 'Escape' || key === 'Backspace') close()
  })

  const el = h(
    'div',
    { class: 'screen dim mart-screen' },
    h(
      'div',
      { class: 'dialog box pop mart' },
      h('div', { class: 'mart-head' }, h('div', { class: 'dialog-title' }, 'POKé MART'), h('div', { class: 'mart-wallet' }, h('img', { src: coinIcon(0), alt: '' }), wallet)),
      h('div', { class: 'tabs mart-tabs', role: 'tablist' }, ...tabs),
      intro,
      list,
      h('div', { class: 'mart-desc' }, descIconBox, h('div', { class: 'mart-desc-body' }, descTitle, descText), buy),
      buttons,
      hint(m.hint, ''),
    ),
  )
  root.append(el)
  build()
  refresh()

  let shownMinute = -1
  return {
    el,
    // The Vitrine's countdown, and a fresh Vitrine once the day turns over.
    tick: () => {
      const minute = Math.floor(Date.now() / 60_000)
      if (minute === shownMinute || shelf !== 'vitrine') return
      shownMinute = minute
      if (vitrineToday().day !== vitrine.day) {
        build()
        refresh()
      } else setText(intro, vitrineIntro())
    },
    dispose: () => (off(), confirm?.dispose(), el.remove()),
  }
}
