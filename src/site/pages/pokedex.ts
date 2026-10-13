import { BOSS_PATTERNS, type BossPattern } from '../../data/bosses'
import { ENEMIES, type EnemyDef } from '../../data/enemies'
import { REGIONS, STARTERS, type StarterDef } from '../../data/starters'
import { POKE_TYPES, TYPE_COLORS, type PokeType } from '../../data/types'
import { RUN_LENGTH } from '../../data/waves'
import { starterStats } from '../../game/leveling'
import { MOVES, type MoveId } from '../../game/moves'
import { resolveSpecial } from '../../game/special'
import { LOCALES, type Locale } from '../../i18n'
import { SITE_MESSAGES, type SiteMessages } from '../../i18n/site'
import { STAT_BARS, statRatio } from '../../ui/statBars'
import { html, type Html } from '../html'
import { layout } from '../layout'
import { appearances, clock, pokedex, ROLES, slugOf, spritesOf, type Appearance, type DexEntry, type Role, type SpriteSet } from '../pokedex'
import { absolute, ROUTES } from '../routes'
import { createSpriteCss, spriteScale } from '../spriteCss'

type SpriteCss = ReturnType<typeof createSpriteCss>

const asset = (dex: number, file: string, shiny = false) => `/assets/pokemon/${dex}/${shiny ? 'shiny/' : ''}${file}`

const dexNo = (dex: number) => `#${String(dex).padStart(3, '0')}`

export const typeBadge = (type: PokeType, m: SiteMessages) =>
  html`<span class="type-badge" style="--type:${TYPE_COLORS[type]}">${m.types[type]}</span>`

/** Filter roles of a card: legendaries also count as bosses. */
const filterRoles = (role: Role): readonly Role[] => (role === 'legendary' ? ['boss', 'legendary'] : [role])

const sheetsOf = (dex: number) => {
  const { normal, shiny } = spritesOf(dex)
  return [normal, ...(shiny ? [shiny] : [])].flatMap((set) => [set.idle, set.walk])
}

/** Species drawn at the same zoom: a whole evolution line, so Charmeleon never looks smaller than Charmander. */
const family = (entry: DexEntry) => (entry.source.kind === 'starter' ? STARTERS[entry.source.id].line.map((s) => s.dex) : [entry.dex])

/**
 * Up to four stacked sheets (idle/walk × normal/shiny); CSS shows one at a time.
 * Hidden sheets aren't fetched until shown, so walk and shiny cost nothing until asked for.
 */
const stage = (entry: DexEntry, css: SpriteCss, m: SiteMessages) => {
  const { normal, shiny } = entry.sprites
  const sets: Array<readonly [SpriteSet, boolean]> = [[normal, false], ...(shiny ? [[shiny, true] as const] : [])]
  const scale = spriteScale(family(entry).flatMap(sheetsOf))
  const layer = (set: SpriteSet, isShiny: boolean, anim: 'idle' | 'walk') =>
    html`<span class="sp sp-${isShiny ? 's' : ''}${anim === 'idle' ? 'i' : 'w'} ${css.classFor(set[anim], scale)}" style="background-image:url(${asset(entry.dex, anim === 'idle' ? 'Idle.png' : 'Walk.png', isShiny)})"></span>`
  return html`<div class="stage" role="img" aria-label="${m.pokedex.sprite(entry.name)}">${sets.map(([set, isShiny]) => [layer(set, isShiny, 'idle'), layer(set, isShiny, 'walk')])}</div>`
}

const statBars = (entry: DexEntry & { source: { kind: 'starter' } }, locale: Locale) => {
  const stats = starterStats(entry.source.id, entry.source.stage)
  const labels = LOCALES[locale].messages.stats
  return html`<dl class="bars">${STAT_BARS.map(
    (b) =>
      html`<div><dt>${labels[b.label]}</dt><dd><span class="bar"><i style="width:${Math.round(statRatio(b.get(stats), b.min, b.max) * 100)}%"></i></span><b>${b.fmt(b.get(stats))}</b></dd></div>`,
  )}</dl>`
}

const moveChip = (id: MoveId, m: SiteMessages) => html`<li style="--type:${TYPE_COLORS[MOVES[id].type]}" title="${m.types[MOVES[id].type]}">${MOVES[id].name}</li>`

const starterBody = (entry: DexEntry & { source: { kind: 'starter' } }, locale: Locale) => {
  const m = SITE_MESSAGES[locale]
  const game = LOCALES[locale].messages
  const { id, stage: i } = entry.source
  const s: StarterDef = STARTERS[id]
  const signature = MOVES[s.signature]
  const special = resolveSpecial(id, i)
  const final = special.final
  const line = s.line.map(
    (st, k) => html`${k > 0 && html`<li class="evo-arrow">${m.pokedex.evolvesAt(s.line[k - 1]!.evolveAt ?? 0)}<br /><span aria-hidden="true">▶</span></li>`}<li><a href="#${slugOf(st.name)}"${k === i ? html` aria-current="true"` : ''}><img src="${asset(st.dex, 'portrait.png')}" width="40" height="40" loading="lazy" alt="" />${st.name}</a></li>`,
  )
  return html`<p class="blurb">${m.pokedex.stageOf(i)} · ${game.blurbs[id]}</p>
    <h3>${m.pokedex.stats}</h3>
    ${statBars(entry, locale)}
    <h3>${m.pokedex.evolution}</h3>
    <ol class="evo">${line}</ol>
    <h3>${m.pokedex.signature}</h3>
    <p class="move"><b>${signature.name}</b> ${typeBadge(signature.type, m)}<br />${game.moves[s.signature].description}</p>
    <h3>${m.pokedex.special}</h3>
    <p class="move"><b>${special.tier.name}</b> ${typeBadge(special.def.type, m)}${!final && html` <small>(${m.pokedex.specialFinal}: ${special.def.final.name})</small>`}<br />${game.specials[special.def.kind]}</p>
    <h3>${m.pokedex.learnset}</h3>
    <ul class="chips">${s.learnset.map((mv) => moveChip(mv, m))}</ul>`
}

const appearance = (a: Appearance, m: SiteMessages) => {
  switch (a.kind) {
    case 'horde':
      return a.until >= RUN_LENGTH ? m.pokedex.hordeEnd(clock(a.from)) : m.pokedex.horde(clock(a.from), clock(a.until))
    case 'swarm':
      return m.pokedex.swarm(clock(a.at), a.count)
    case 'ring':
      return m.pokedex.ring(clock(a.at), a.count)
    case 'boss':
      return a.chance < 1 ? m.pokedex.bossChance(clock(a.at), a.chance * 100) : m.pokedex.boss(clock(a.at))
    case 'rift':
      return m.pokedex.rift(clock(a.from))
    case 'reaper':
      return m.pokedex.reaper(clock(a.at))
  }
}

export const patternText = (p: BossPattern, m: SiteMessages) => {
  switch (p.kind) {
    case 'strikes':
      return p.target === 'player' ? m.patterns.strikesPlayer(p.count, p.every, p.damage) : m.patterns.strikesSelf(p.every, p.damage)
    case 'ring':
      return m.patterns.ring(p.count, p.every, p.damage)
    case 'trail':
      return m.patterns.trail(p.ttl, p.damage)
  }
}

const wildBody = (entry: DexEntry & { source: { kind: 'wild' } }, m: SiteMessages) => {
  const e: EnemyDef = ENEMIES[entry.source.id]
  const patterns = BOSS_PATTERNS[entry.source.id] ?? []
  const s = m.pokedex.wildStats
  return html`<dl class="facts">
      <div><dt>${s.hp}</dt><dd>${e.hp}</dd></div>
      <div><dt>${s.damage}</dt><dd>${e.damage}</dd></div>
      <div><dt>${s.speed}</dt><dd>${e.speed}</dd></div>
      <div><dt>${s.xp}</dt><dd>${e.xp}</dd></div>
    </dl>
    <p class="note">${m.pokedex.wildNote}</p>
    <h3>${m.pokedex.appears}</h3>
    <ul class="list">${appearances(entry.source.id).map((a) => html`<li>${appearance(a, m)}</li>`)}</ul>
    ${patterns.length > 0 && html`<h3>${m.pokedex.attacks}</h3><ul class="list">${patterns.map((p) => html`<li>${patternText(p, m)}</li>`)}</ul>`}
    ${entry.sprites.shiny && html`<p class="note">★ ${m.pokedex.shinyNote}</p>`}`
}

const card = (entry: DexEntry, locale: Locale, css: SpriteCss) => {
  const m = SITE_MESSAGES[locale]
  const { dex, name, slug, sprites, types, role, region } = entry
  return html`<article class="dex-card box role-${role}" id="${slug}" data-region="${region.name.toLowerCase()}" data-types="${types.join(' ')}" data-roles="${filterRoles(role).join(' ')}" data-search="${slug} ${dex} ${String(dex).padStart(3, '0')}">
  <div class="card-top">
    <span class="dex-no">${dexNo(dex)}</span>
    <span class="role">${m.pokedex.roles[role]}</span>
    <span class="region">${region.name}</span>
    <a class="anchor" href="#${slug}" aria-label="${m.pokedex.link(name)}">#</a>
  </div>
  <div class="card-art">
    ${stage(entry, css, m)}
    ${sprites.portrait && html`<img class="portrait" src="${asset(dex, 'portrait.png')}"${sprites.shinyPortrait ? html` data-shiny-src="${asset(dex, 'portrait.png', true)}"` : ''} width="80" height="80" loading="lazy" alt="${m.pokedex.portrait(name)}" />`}
    ${sprites.shiny && html`<button class="shiny-btn" type="button" aria-pressed="false" aria-label="${m.pokedex.shinyToggle(name)}" title="${m.pokedex.shinyToggle(name)}">★</button>`}
  </div>
  <h2>${name}</h2>
  <div class="types">${types.map((t) => typeBadge(t, m))}</div>
  ${entry.source.kind === 'starter' ? starterBody({ ...entry, source: entry.source }, locale) : wildBody({ ...entry, source: entry.source }, m)}
</article>`
}

const filters = (entries: readonly DexEntry[], m: SiteMessages) => {
  const types = POKE_TYPES.filter((t) => entries.some((e) => e.types.includes(t)))
  return html`<form class="dex-filters" id="dex-filters" role="search" aria-label="${m.pokedex.filters}">
    <label class="field field-search">${m.pokedex.search}<input type="search" name="q" placeholder="${m.pokedex.searchPlaceholder}" autocomplete="off" /></label>
    <label class="field">${m.pokedex.region}<select name="region"><option value="">${m.pokedex.allRegions}</option>${REGIONS.map(
      (r) => html`<option value="${r.name.toLowerCase()}">${r.name}</option>`,
    )}</select></label>
    <label class="field">${m.pokedex.type}<select name="type"><option value="">${m.pokedex.all}</option>${types.map(
      (t) => html`<option value="${t}">${m.types[t]}</option>`,
    )}</select></label>
    <fieldset class="roles"><legend>${m.pokedex.role}</legend>
      <label><input type="radio" name="role" value="" checked /><span>${m.pokedex.all}</span></label>
      ${ROLES.map((r) => html`<label><input type="radio" name="role" value="${r}" /><span>${m.pokedex.roleFilter[r]}</span></label>`)}
    </fieldset>
    <label class="shiny-all"><input type="checkbox" name="shiny" /><span>★ ${m.pokedex.shinyAll}</span></label>
    <p class="dex-count" aria-live="polite" data-one="${m.pokedex.results(1)}" data-other="${m.pokedex.results(2)}">${m.pokedex.results(entries.length)}</p>
  </form>
  <p class="dex-empty" hidden>${m.pokedex.empty} <button type="reset" form="dex-filters">${m.pokedex.clear}</button></p>`
}

/** `/pokedex/`: every Pokémon in the game, generated from `data/*`, with CSS-animated sprites and client-side filters. */
export const pokedexPage = (locale: Locale) => {
  const m = SITE_MESSAGES[locale]
  const entries = pokedex()
  const css = createSpriteCss()
  const cards = entries.map((e) => card(e, locale, css))
  const url = absolute(ROUTES.pokedex[locale])
  const main: Html = html`<div class="page-head">
    <h1>${m.pokedex.h1}</h1>
    <p class="lead">${m.pokedex.intro(entries.length)}</p>
  </div>
  ${filters(entries, m)}
  <div class="dex-grid">${cards}</div>`
  return layout(
    {
      id: 'pokedex',
      locale,
      title: m.pokedex.title,
      description: m.pokedex.description,
      css: css.css(),
      schema: [
        {
          '@type': 'ItemList',
          '@id': `${url}#list`,
          name: m.pokedex.h1,
          numberOfItems: entries.length,
          itemListElement: entries.map((e, i) => ({ '@type': 'ListItem', position: i + 1, name: e.name, url: `${url}#${e.slug}` })),
        },
      ],
    },
    main,
  )
}
