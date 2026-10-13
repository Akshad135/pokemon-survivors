import { BOSS_PATTERNS } from '../../data/bosses'
import { DROP_TABLES, ENEMY_BERRY_CHANCE, ENEMY_DROP_CHANCE, FLUTE_SLEEP, PROPS, type Drop, type DropSource } from '../../data/consumables'
import { ENEMIES } from '../../data/enemies'
import { EVOLUTIONS } from '../../data/evolutions'
import { ITEM_IDS, ITEMS } from '../../data/items'
import { STARTER_IDS, STARTERS } from '../../data/starters'
import { effectiveness } from '../../data/types'
import { EVENTS, RUN_LENGTH, scaling } from '../../data/waves'
import { CONSUMABLES } from '../../game/consumables'
import { MAX_ITEMS, MAX_MOVES } from '../../game/leveling'
import { COIN_VALUES, runBonus, UPGRADE_IDS, UPGRADES, upgradePrice } from '../../game/meta'
import { maxMoveLevel, MOVE_IDS, MOVES, type MoveDef, type MoveId } from '../../game/moves'
import { SHINY_BUFF, SHINY_ODDS } from '../../game/shiny'
import { MIN_SPECIAL_COOLDOWN, resolveSpecial, SPECIALS } from '../../game/special'
import { BURN_ATTACK, STATUS_KINDS, STATUS_RULES, type StatusKind } from '../../game/status'
import { LOCALES, type Locale } from '../../i18n'
import { SITE_MESSAGES, type SiteMessages } from '../../i18n/site'
import { html, type Child, type Html } from '../html'
import { layout } from '../layout'
import { clock, slugOf } from '../pokedex'
import { ROUTES } from '../routes'
import { patternText, typeBadge } from './pokedex'

type Section = keyof SiteMessages['guide']['sections']

const table = (head: readonly Child[], rows: readonly (readonly Child[])[]) =>
  html`<div class="table-wrap"><table>
    <thead><tr>${head.map((h) => html`<th scope="col">${h}</th>`)}</tr></thead>
    <tbody>${rows.map((r) => html`<tr>${r.map((c, i) => (i === 0 ? html`<th scope="row">${c}</th>` : html`<td>${c}</td>`))}</tr>`)}</tbody>
  </table></div>`

const paragraphs = (texts: readonly string[]) => texts.map((t) => html`<p>${t}</p>`)

const portrait = (dex: number) => html`<img class="mini" src="/assets/pokemon/${dex}/portrait.png" width="40" height="40" loading="lazy" alt="" />`

/** Anchor of a species in the Pokédex. */
const dexLink = (locale: Locale, name: string) => `${ROUTES.pokedex[locale]}#${slugOf(name)}`

const bossName = (locale: Locale, enemy: keyof typeof ENEMIES) =>
  html`<a class="with-mini" href="${dexLink(locale, ENEMIES[enemy].name)}">${portrait(ENEMIES[enemy].dex)}${ENEMIES[enemy].name}</a>`

const controls = (m: SiteMessages) => {
  const c = m.guide.controls
  return html`${table([c.head.action, c.head.keyboard, c.head.gamepad, c.head.touch], c.rows)}${paragraphs(c.notes)}`
}

const run = (locale: Locale, m: SiteMessages) => {
  const r = m.guide.run
  const num = (v: number) => v.toLocaleString(m.lang.tag, { maximumFractionDigits: 2 })
  const scale = [5, 10, 15].map((min) => {
    const s = scaling(min * 60)
    return [clock(min * 60), num(s.hp), num(s.damage)] as const
  })
  const events = EVENTS.map((e) => {
    const name = ENEMIES[e.enemy].name
    const text =
      e.kind === 'boss'
        ? e.chance !== undefined
          ? r.bossChance(name, e.chance * 100)
          : r.boss(name)
        : e.kind === 'swarm'
          ? r.swarm(e.count, name)
          : r.ring(e.count, name)
    return [clock(e.at), e.kind === 'boss' ? html`<a href="${dexLink(locale, name)}">${text}</a>` : text]
  })
  return html`${paragraphs(r.paragraphs(RUN_LENGTH / 60, STARTER_IDS.length))}
    <p>${r.scaling(scale)}</p>
    <h3>${r.timeline}</h3>
    ${table([r.timeHead, r.eventHead], events)}`
}

const levels = (locale: Locale, m: SiteMessages) => {
  const l = m.guide.levels
  const game = LOCALES[locale].messages
  const [first, second] = STARTERS.charmander.line
  const baseMove = MOVE_IDS.find((id) => MOVES[id].upgrades.length > 0) ?? 'ember'
  const items = ITEM_IDS.map((id) => [ITEMS[id].name, game.items[id], ITEMS[id].levels.length])
  return html`${paragraphs(l.paragraphs(MAX_MOVES, MAX_ITEMS, maxMoveLevel(baseMove)))}
    <p>${l.evolution(first.evolveAt, second.evolveAt)}</p>
    <h3>${l.itemsTitle}</h3>
    ${table([l.itemHead, l.effectHead, l.levelsHead], items)}`
}

const moveEvolutions = (locale: Locale, m: SiteMessages) => {
  const e = m.guide.moveEvolutions
  const game = LOCALES[locale].messages
  const rows = EVOLUTIONS.map((evo) => [
    html`${MOVES[evo.from].name} <small>(${LOCALES[locale].messages.level(maxMoveLevel(evo.from))})</small>`,
    ITEMS[evo.item].name,
    html`<b>${MOVES[evo.to].name}</b> ${typeBadge(MOVES[evo.to].type, m)}<br /><small>${game.moves[evo.to].description}</small>`,
  ])
  const evolving = new Set<MoveId>(EVOLUTIONS.flatMap((evo) => [evo.from, evo.to]))
  const without = MOVE_IDS.filter((id) => !evolving.has(id)).map((id) => MOVES[id].name)
  return html`${paragraphs(e.paragraphs)}
    ${table([e.moveHead, e.itemHead, e.resultHead], rows)}
    <p class="note">${e.noEvolution(without.join(', '))}</p>`
}

const special = (locale: Locale, m: SiteMessages) => {
  const s = m.guide.special
  const game = LOCALES[locale].messages
  // Only the specials some starter actually gets (they follow the starter's first type).
  const used = [...new Set(STARTER_IDS.map((id) => resolveSpecial(id, 0).id))]
  const rows = used.map((id) => {
    const def = SPECIALS[id]
    return [
      typeBadge(def.type, m),
      html`<b>${def.base.name} → ${def.final.name}</b><br /><small>${game.specials[def.kind]}</small>`,
      `${def.cooldown}s`,
    ]
  })
  return html`${paragraphs(s.paragraphs(MIN_SPECIAL_COOLDOWN))}${table([s.typeHead, s.moveHead, s.cooldownHead], rows)}`
}

const types = (m: SiteMessages) => {
  const t = m.guide.types
  const num = (v: number) => v.toLocaleString(m.lang.tag)
  // Sample matchups through the real damage rule, so the text follows any rebalance.
  const chart = t.chart(
    num(effectiveness('water', ['fire'])),
    num(effectiveness('water', ['rock', 'ground'])),
    num(effectiveness('fire', ['water'])),
    num(effectiveness('normal', ['ghost'])),
  )
  const movesBy = (kind: StatusKind) =>
    MOVE_IDS.filter((id) => {
      const def: MoveDef = MOVES[id]
      return def.status?.kind === kind
    }).map((id) => MOVES[id].name)
  const effect = (kind: StatusKind) => {
    switch (kind) {
      case 'burn':
        return t.effects.burn(BURN_ATTACK)
      case 'poison':
        return t.effects.poison(STATUS_RULES.poison.maxStacks)
      case 'paralysis':
        return t.effects.paralysis(STATUS_RULES.paralysis.boss)
      case 'slow':
        return t.effects.slow(STATUS_RULES.slow.boss)
      case 'sleep':
        return t.effects.sleep(FLUTE_SLEEP, STATUS_RULES.sleep.boss)
    }
  }
  const rows = STATUS_KINDS.map((kind) => {
    const moves = movesBy(kind)
    return [t.names[kind], moves.length > 0 ? moves.join(', ') : t.flute, effect(kind)]
  })
  return html`<p>${chart}</p>
    <p>${t.statusIntro}</p>
    ${table([t.statusHead, t.movesHead, t.effectHead], rows)}
    <p class="note">${t.itemsNote}</p>`
}

const bosses = (locale: Locale, m: SiteMessages) => {
  const b = m.guide.bosses
  const rows = EVENTS.flatMap((e) =>
    e.kind === 'boss'
      ? [
          [
            e.chance !== undefined ? `${clock(e.at)} (${Math.round(e.chance * 100)}%)` : clock(e.at),
            bossName(locale, e.enemy),
            ENEMIES[e.enemy].hp.toLocaleString(m.lang.tag),
            html`<ul class="list">${(BOSS_PATTERNS[e.enemy] ?? []).map((p) => html`<li>${patternText(p, m)}</li>`)}</ul>`,
          ],
        ]
      : [],
  )
  return html`${paragraphs(b.paragraphs)}${table([b.timeHead, b.bossHead, b.hpHead, b.attacksHead], rows)}`
}

const shinies = (locale: Locale, m: SiteMessages) => {
  const s = m.guide.shinies
  return html`${paragraphs(s.paragraphs(Math.round(1 / SHINY_ODDS.enemy), SHINY_BUFF.hp, SHINY_BUFF.xp, Math.round(1 / SHINY_ODDS.player)))}
    <p><a class="btn-link" href="${ROUTES.pokedex[locale]}">★ ${s.seeAll}</a></p>`
}

const items = (m: SiteMessages) => {
  const i = m.guide.items
  const sources = Object.keys(DROP_TABLES) as DropSource[]
  const drops = [...new Set(sources.flatMap((src) => DROP_TABLES[src].map((e) => e.drop)))]
  const nameOf = (drop: Drop) => (drop === 'oranBerry' ? 'Oran Berry' : CONSUMABLES[drop].name)
  const where = (drop: Drop) =>
    sources.filter((src) => DROP_TABLES[src].some((e) => e.drop === drop && Math.max(e.early, e.late) > 0)).map((src) => i.sources[src])
  const props = (Object.keys(PROPS) as Array<keyof typeof PROPS>).map((id) => [i.sources[id], PROPS[id].hp])
  return html`<p>${i.intro}</p>
    ${table([i.sourceHead, i.hitsHead], props)}
    <p class="note">${i.enemyNote(ENEMY_BERRY_CHANCE * 100, ENEMY_DROP_CHANCE * 100)}</p>
    ${table([i.itemHead, i.effectHead, i.whereHead], drops.map((d) => [nameOf(d), i.effects[d], where(d).join(', ')]))}`
}

const mart = (locale: Locale, m: SiteMessages) => {
  const k = m.guide.mart
  const game = LOCALES[locale].messages
  const bonus = (run: Partial<Parameters<typeof runBonus>[0]>) => runBonus({ time: 0, kills: 0, victory: false, greed: 1, ...run })
  const perKill = bonus({ kills: 1000 }) / 1000
  const rows = UPGRADE_IDS.map((id) => [
    UPGRADES[id].name,
    game.upgrades[id],
    Array.from({ length: UPGRADES[id].maxRank }, (_, r) => `₽${upgradePrice(id, r).toLocaleString(m.lang.tag)}`).join(' · '),
  ])
  return html`${paragraphs(k.paragraphs(COIN_VALUES, bonus({ time: 60 }), Math.round(1 / perKill), bonus({ victory: true })))}
    ${table([k.upgradeHead, k.effectHead, k.pricesHead], rows)}`
}

const settings = (m: SiteMessages) => {
  const s = m.guide.settings
  return html`${paragraphs(s.paragraphs)}${table([s.optionHead, s.effectHead], s.rows)}`
}

const SECTIONS: Record<Section, (locale: Locale, m: SiteMessages) => Html> = {
  controls: (_, m) => controls(m),
  run,
  levels,
  moveEvolutions,
  special,
  types: (_, m) => types(m),
  bosses,
  shinies,
  items: (_, m) => items(m),
  mart,
  settings: (_, m) => settings(m),
}

/** `/guia/`: how to play, with every number and table read from the game's data. */
export const guidePage = (locale: Locale) => {
  const m = SITE_MESSAGES[locale]
  const ids = Object.keys(SECTIONS) as Section[]
  const main = html`<div class="page-head">
    <h1>${m.guide.h1}</h1>
    <p class="lead">${m.guide.intro}</p>
  </div>
  <div class="doc">
    <nav class="toc box" aria-labelledby="toc-title">
      <h2 id="toc-title">${m.guide.toc}</h2>
      <ol>${ids.map((id) => html`<li><a href="#${slugOf(m.guide.sections[id])}">${m.guide.sections[id]}</a></li>`)}</ol>
    </nav>
    <div class="doc-body">
      ${ids.map(
        (id) => html`<section class="box doc-section" id="${slugOf(m.guide.sections[id])}" aria-labelledby="${slugOf(m.guide.sections[id])}-title">
        <h2 id="${slugOf(m.guide.sections[id])}-title">${m.guide.sections[id]}</h2>
        ${SECTIONS[id](locale, m)}
      </section>`,
      )}
      <p class="cta"><a class="btn-play" href="${ROUTES.play[locale]}">▶ ${m.guide.cta}</a></p>
    </div>
  </div>`
  return layout({ id: 'guide', locale, title: m.guide.title, description: m.guide.description }, main)
}
