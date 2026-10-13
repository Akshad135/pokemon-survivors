import { playSfx } from '../engine/audio'
import type { Input } from '../engine/input'
import { buyUpgrade, formatPokeDollars, refundAll, totalSpent, UPGRADE_IDS, UPGRADES, upgradePrice, type UpgradeId } from '../game/meta'
import { coinIcon, upgradeIcon } from '../render/art'
import { h, setText } from './dom'
import { loadSave, writeSave } from './save'
import { menu, type Screen } from './screens'

/** Runs after the current key/click dispatch, so the next screen doesn't receive the same Enter. */
const later = (fn: () => void) => setTimeout(fn, 0)

const isTouch = (e: Event) => e instanceof PointerEvent && e.pointerType !== '' && e.pointerType !== 'mouse'

/**
 * Small Poké Mart entry on the title screen (top-right corner). `L` opens it too.
 * Returns a disposer.
 */
export const martButton = (root: HTMLElement, input: Input, onOpen: () => void) => {
  const el = h(
    'button',
    { class: 'mart-entry box', 'aria-label': 'Abrir Poké Mart' },
    h('img', { src: coinIcon(2), alt: '' }),
    h('span', { class: 'mart-entry-text' }, h('b', {}, 'POKé MART'), h('span', {}, formatPokeDollars(loadSave().wallet))),
    h('span', { class: 'key-hint' }, 'L'),
  )
  el.addEventListener('click', () => later(onOpen))
  const off = input.onKey((key) => key === 'KeyL' && later(onOpen))
  root.append(el)
  return () => (off(), el.remove())
}

/** Yes/no dialog layered over the mart. Defaults to "Não" so a stray Enter is harmless. */
const confirmDialog = (root: HTMLElement, input: Input, text: string, onAnswer: (yes: boolean) => void): Screen => {
  const yes = h('button', { class: 'btn' }, 'Sim')
  const no = h('button', { class: 'btn' }, 'Não')
  const nav = menu(input, [yes, no], (i) => onAnswer(i === 0), { horizontal: true, initial: 1 })
  const offEsc = input.onKey((k) => k === 'Escape' && onAnswer(false))
  const el = h('div', { class: 'screen dim' }, h('div', { class: 'dialog box pop' }, h('div', { class: 'dialog-title' }, text), h('div', { class: 'buttons' }, yes, no)))
  root.append(el)
  return { el, dispose: () => (nav.off(), offEsc(), el.remove()) }
}

/**
 * Poké Mart: spend ₽ on permanent ranks. GBA-style list with prices on the
 * right and a description box below. Keyboard (↑↓ Enter Esc), mouse (click
 * buys) and touch (tap selects, tap again or "Comprar" buys).
 */
export const shop = (root: HTMLElement, input: Input, onClose: () => void): Screen => {
  let save = loadSave()
  let index = 0
  let confirm: Screen | null = null

  const wallet = h('span')
  const rows = UPGRADE_IDS.map((id) => {
    const pips = h('span', { class: 'pips' })
    const price = h('span', { class: 'mart-price' })
    const el = h(
      'button',
      { class: 'mart-row' },
      h('img', { src: upgradeIcon(id), alt: '' }),
      h('span', { class: 'mart-info' }, h('span', { class: 'mart-name' }, UPGRADES[id].name), pips),
      price,
    )
    return { id, el, pips, price }
  })
  const back = h('button', { class: 'btn' }, 'Voltar')
  const refund = h('button', { class: 'btn' }, 'Reembolsar')
  const entries = [...rows.map((r) => r.el), back, refund]

  const descIcon = h('img', { alt: '' })
  const descIconBox = h('div', { class: 'mart-desc-icon' }, descIcon)
  const descTitle = h('div', { class: 'mart-desc-title' })
  const descText = h('p', {})
  const buy = h('button', { class: 'btn mart-buy' })

  const close = () => later(onClose)

  const refresh = () => {
    setText(wallet, formatPokeDollars(save.wallet))
    for (const r of rows) {
      const rank = save.ranks[r.id]
      const max = UPGRADES[r.id].maxRank
      r.pips.replaceChildren(...Array.from({ length: max }, (_, i) => h('span', { class: i < rank ? 'pip on' : 'pip' })))
      const maxed = rank >= max
      const price = upgradePrice(r.id, rank)
      setText(r.price, maxed ? 'MAX' : formatPokeDollars(price))
      r.el.classList.toggle('maxed', maxed)
      r.el.classList.toggle('poor', !maxed && price > save.wallet)
    }
    entries.forEach((b, j) => b.classList.toggle('selected', j === index))
    const row = rows[index]
    buy.classList.toggle('hidden', !row)
    if (row) {
      const def = UPGRADES[row.id]
      const rank = save.ranks[row.id]
      descIcon.src = upgradeIcon(row.id)
      descIconBox.classList.remove('hidden')
      setText(descTitle, `${def.name} · Nv ${rank}/${def.maxRank}`)
      setText(descText, def.description)
      const maxed = rank >= def.maxRank
      setText(buy, maxed ? 'MAX' : `Comprar ${formatPokeDollars(upgradePrice(row.id, rank))}`)
      buy.toggleAttribute('disabled', maxed || upgradePrice(row.id, rank) > save.wallet)
    } else {
      descIconBox.classList.add('hidden')
      setText(descTitle, index === rows.length ? 'Voltar' : 'Reembolsar tudo')
      setText(descText, index === rows.length ? 'Voltar para a escolha de parceiro.' : `Desfaz todas as compras e devolve ${formatPokeDollars(totalSpent(save.ranks))}.`)
    }
  }

  const focus = (i: number, sound = true) => {
    const next = (i + entries.length) % entries.length
    if (next === index) return
    index = next
    if (sound) playSfx('move')
    refresh()
    entries[index]!.scrollIntoView({ block: 'nearest' })
  }

  const purchase = (id: UpgradeId) => {
    const next = buyUpgrade(save, id)
    if (!next) return playSfx('denied')
    save = next
    writeSave(save)
    playSfx('buy')
    refresh()
  }

  const askRefund = () => {
    if (totalSpent(save.ranks) === 0) return playSfx('denied')
    later(() => {
      confirm = confirmDialog(root, input, `Reembolsar tudo e receber ${formatPokeDollars(totalSpent(save.ranks))}?`, (yes) => {
        confirm?.dispose()
        confirm = null
        if (!yes) return
        save = refundAll(save)
        writeSave(save)
        playSfx('buy')
        refresh()
      })
    })
  }

  const activate = (i: number) => {
    const row = rows[i]
    if (row) return purchase(row.id)
    if (i === rows.length) return close()
    askRefund()
  }

  entries.forEach((b, i) => {
    b.addEventListener('pointerenter', (e) => !isTouch(e) && focus(i))
    b.addEventListener('click', (e) => {
      if (confirm) return
      // On touch the first tap only selects, so browsing never spends money by accident.
      if (isTouch(e) && i !== index && i < rows.length) return focus(i)
      focus(i, false)
      activate(i)
    })
  })
  buy.addEventListener('click', () => !confirm && activate(index))

  const off = input.onKey((key) => {
    if (confirm) return
    if (key === 'ArrowUp' || key === 'KeyW') focus(index - 1)
    else if (key === 'ArrowDown' || key === 'KeyS') focus(index + 1)
    else if ((key === 'ArrowLeft' || key === 'KeyA') && index === rows.length + 1) focus(rows.length)
    else if ((key === 'ArrowRight' || key === 'KeyD') && index === rows.length) focus(rows.length + 1)
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
      h('div', { class: 'mart-list' }, ...rows.map((r) => r.el)),
      h('div', { class: 'mart-desc' }, descIconBox, h('div', { class: 'mart-desc-body' }, descTitle, descText), buy),
      h('div', { class: 'buttons' }, back, refund),
      h('p', { class: 'hint' }, '↑ ↓ escolher · ENTER comprar · ESC voltar'),
    ),
  )
  root.append(el)
  refresh()

  return { el, dispose: () => (off(), confirm?.dispose(), el.remove()) }
}
