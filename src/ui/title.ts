import { accountState, accountsEnabled } from '../account'
import { playSfx } from '../engine/audio'
import type { Input } from '../engine/input'
import { formatTime } from '../engine/math'
import { blitCentered, context2d, ellipse } from '../engine/pixelart'
import { ENEMIES } from '../data/enemies'
import { isHatchling, PLAYABLE, type PlayableId } from '../data/hatchlings'
import { isReady } from '../game/eggs'
import { dayKey, missionStatus } from '../game/missions'
import { pendingPicks } from '../game/shinyPicks'
import type { WallEntry } from '../game/supporters'
import { formatNumber, locale, t } from '../i18n'
import { coinIcon, eggIcon, heartIcon, medalIcon, pokeballIcon, ribbonIcon, sparkleIcon, supporterIcon } from '../render/art'
import { logoScale, titleLogo } from '../render/logo'
import { drawPokemon, loadedSprites, loadSpecies } from '../render/sprites'
import { inviterName } from '../ranking'
import { ROUTES } from '../site/routes'
import { fetchWall } from '../supporters'
import { h, later, rich } from './dom'
import { challengeToday, loadAttempt, loadSave, outbreakToday, today } from './save'
import type { Screen } from './screens'
import { gearButton, helpButton, shellBody, topBar, walletChip } from './shell'
import { nearestInDirection, type Direction } from './spatial'
import { toast } from './toasts'
import { trainerChip } from './trainer'

/** What the lobby can highlight. A screen opened over it gets the one it came from, to come back to it. */
export type LobbyFocus =
  | 'trainer'
  | 'help'
  | 'settings'
  | 'outbreak'
  | 'challenge'
  | 'missions'
  | 'hall'
  | 'invite'
  | 'pokedex'
  | 'eggs'
  | 'mart'
  | 'ranking'
  | 'play'

export type TitleActions = {
  /** JOGAR, and a tap on the partner: the Pokémon select, the saved partner picked. */
  play: () => void
  /** Opens the Desafio do dia. */
  challenge: () => void
  missions: () => void
  /** Opens the egg incubator. */
  incubator: () => void
  /** The lobby is up: after the "press start" gesture, so the browser lets audio play. */
  ready: () => void
  /**
   * Opens Settings over the title (the gear). Closing them must rebuild the
   * title (the language may have changed), highlighting `focus`.
   */
  settings: (focus: LobbyFocus) => Screen
  /** Opens the in-game Pokédex over the title; closing it rebuilds the title on `focus`, like `settings`. */
  pokedex: (focus: LobbyFocus) => Screen
  /** Opens the Poké Mart over the title, like `settings`. */
  mart: (focus: LobbyFocus) => Screen
  /** Opens the Trainer Card over the title (the Trainer chip, `C`, the invite banner), like `settings`. */
  trainer: (focus: LobbyFocus) => Screen
  /** Opens the boards over the title, like `settings`. No action (no API), no tile. */
  ranking?: (focus: LobbyFocus) => Screen
  /** Opens Apoiadores over the title (the Hall da Fama card), like `settings`; `pick` goes straight to the shiny picker. */
  supporters: (focus: LobbyFocus, open: 'pick' | null) => Screen
}

/**
 * The lobby's three layouts, in sync with the media queries of the lobby's
 * section in `style.css`: phones in landscape (two columns), narrow screens
 * (a column with a tab bar) and the rest (rails either side of the partner).
 */
const LANDSCAPE = '(max-height: 500px) and (orientation: landscape)'
const NARROW = '(max-width: 759px) and (min-height: 501px), (max-width: 759px) and (orientation: portrait)'
const layout = () => (matchMedia(LANDSCAPE).matches ? 'landscape' : matchMedia(NARROW).matches ? 'narrow' : 'wide')

/** Sizes a pixel-art canvas to `k` device px per art px, so its pixels stay square. Touches the style only when it changes. */
const pixelSize = (canvas: HTMLCanvasElement, k: number) => {
  const dpr = window.devicePixelRatio || 1
  const width = `${(canvas.width * k) / dpr}px`
  if (canvas.style.width === width) return
  canvas.style.width = width
  canvas.style.height = `${(canvas.height * k) / dpr}px`
}

/** Fits the logo to the viewport in whole device pixels per logo pixel: big for the intro, smaller in the lobby. */
const fitLogo = (canvas: HTMLCanvasElement, intro: boolean) => {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const mode = layout()
  // The top bar takes about 60 px off the height.
  const [maxW, maxH] = intro
    ? [Math.min(vw * 0.9, 640), (vh - 60) * 0.4]
    : mode === 'landscape'
      ? [vw * 0.42, (vh - 60) * 0.24]
      : mode === 'narrow'
        ? [Math.min(vw * 0.8, 420), (vh - 60) * 0.11]
        : [Math.min(vw - 620, 460), (vh - 60) * 0.17]
  pixelSize(canvas, logoScale(canvas.width, canvas.height, Math.max(maxW, 120), maxH, window.devicePixelRatio || 1))
}

/** Whether the save plays `id` shiny (a shiny starter picked so, or a shiny hatch). */
const playsShiny = (id: PlayableId) => {
  const save = loadSave()
  return save.shinyStarters[id] === true || (isHatchling(id) && save.hatched[id]?.shiny === true)
}

/* ---------------- Hoje: the day's cards ---------------- */

/** A Hoje card: a colored label (with an optional badge and key hint) over one line of live state. */
const todayCard = (key: LobbyFocus, label: string, badge: Node | null, hotkey: string | null, ...row: Node[]) =>
  h(
    'button',
    { class: `lobby-card box ${key}`, type: 'button' },
    h('small', { class: 'lobby-card-label' }, h('span', {}, label), badge, hotkey && h('span', { class: 'key-hint' }, hotkey)),
    h('span', { class: 'lobby-card-row' }, ...row),
  )

/** A red count, or a green ✓ when nothing's left. */
const badge = (n: number) => (n > 0 ? h('em', { class: 'lobby-badge' }, formatNumber(n)) : h('em', { class: 'lobby-badge done' }, '✓'))

/** Surto do dia: the day's species walking, normal and shiny. `tick` animates them. */
const outbreakCard = () => {
  const def = ENEMIES[outbreakToday()]
  const sprite = (shiny: boolean) => h('canvas', { class: shiny ? 'lobby-walker shiny' : 'lobby-walker', width: 30, height: 32, 'aria-hidden': 'true' })
  const walkers = [sprite(false), sprite(true)] as const
  void Promise.allSettled([loadSpecies(def.dex), loadSpecies(def.dex, true)])
  const el = todayCard('outbreak', t().home.outbreak, null, null, ...walkers, h('b', {}, def.name), h('img', { class: 'lobby-sparkle', src: sparkleIcon(), alt: '' }))
  const tick = (time: number) => {
    const k = Math.max(1, Math.round((window.devicePixelRatio || 1) * (layout() === 'wide' ? 1.5 : 1)))
    walkers.forEach((canvas, i) => {
      pixelSize(canvas, k)
      const ctx = context2d(canvas)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const s = loadedSprites(def.dex, i === 1)
      if (s) drawPokemon(ctx, s, 'Walk', 0, time + i * 0.3, canvas.width / 2, canvas.height - 2)
    })
  }
  return { el, tick }
}

/** Desafio do dia: today's attempt time once made (with the ribbon it plays for), else the day's Pokémon and a "!". */
const challengeCard = () => {
  const m = t().home
  const c = challengeToday()
  const attempt = loadAttempt()
  const done = attempt?.day === c.day ? attempt : null
  const el = todayCard(
    'challenge',
    m.challenge,
    done ? null : h('em', { class: 'lobby-badge' }, '!'),
    null,
    h('img', { class: 'lobby-icon', src: ribbonIcon('gold'), alt: '' }),
    h('b', {}, done ? m.challengeDone(formatTime(done.time)) : PLAYABLE[c.starter].line[0].name),
  )
  el.setAttribute('aria-label', `${m.challenge}: ${done ? m.challengeDone(formatTime(done.time)) : m.challengeOpen}`)
  return el
}

/** Missões: today's missions done out of all, with a badge of those left. */
const missionsCard = () => {
  const m = t().home
  const daily = missionStatus(loadSave().missions, today()).filter((s) => s.period === 'daily')
  const done = daily.filter((s) => s.done).length
  const left = daily.length - done
  const el = todayCard(
    'missions',
    m.missions,
    badge(left),
    'M',
    h('span', { class: 'lobby-progress' }, h('span', { style: `width:${daily.length ? Math.round((done / daily.length) * 100) : 0}%` })),
    h('b', {}, `${done}/${daily.length}`),
  )
  el.setAttribute('aria-label', `${m.missions}: ${m.missionsLeft(left)}`)
  return el
}

/* ---------------- Hall da Fama ---------------- */

/** Who the Hall card shows first: gold before supporters, then who came first. */
const byStanding = (a: WallEntry, b: WallEntry) => (a.tier === b.tier ? a.since.localeCompare(b.since) : a.tier === 'gold' ? -1 : 1)

/** A supporter's round face: their name's initial, ringed in their tier's color. */
const wallFace = (e: WallEntry) => h('span', { class: `hall-face ${e.tier}`, title: e.name, 'aria-hidden': 'true' }, [...e.name.trim()][0]?.toUpperCase() ?? '♥')

/**
 * The Hall da Fama card: gold, slowly turning rays, the first supporters'
 * faces and "+N", and a ticker with the newest one (the wall's last entry).
 * Before the wall comes back, offline or with nobody on it, it just asks for
 * support. It sparkles while a shiny ticket waits for its pick. Without
 * accounts it's a link to the support page.
 */
const hallCard = (open: () => void) => {
  const m = t().home
  const waiting = accountsEnabled && pendingPicks(loadSave()).length > 0
  const stack = h('span', { class: 'hall-stack' })
  const ticker = h('span', { class: 'hall-ticker' }, h('img', { src: heartIcon(), alt: '' }), h('span', {}, m.support))
  const label = waiting ? `${m.hall} · ${t().supporters.banner}` : m.hall
  const kids = [
    h('span', { class: 'hall-rays', 'aria-hidden': 'true' }),
    h('span', { class: 'hall-top' }, h('img', { src: supporterIcon('gold'), alt: '' }), h('b', {}, m.hall), h('img', { class: 'hall-sparkle', src: sparkleIcon(), alt: '' })),
    stack,
    ticker,
    h('span', { class: 'key-hint' }, 'H'),
  ]
  const attrs = { class: waiting ? 'lobby-hall waiting' : 'lobby-hall', 'aria-label': label, title: label }
  const el = accountsEnabled
    ? h('button', { ...attrs, type: 'button', onclick: open }, ...kids)
    : h('a', { ...attrs, href: ROUTES.support[locale()], target: '_blank', rel: 'noopener', onclick: () => playSfx('select') }, ...kids)
  void fetchWall().then((wall) => {
    const newest = wall?.at(-1)
    if (!wall || !newest) return
    const shown = [...wall].sort(byStanding).slice(0, 4)
    const more = wall.length - shown.length
    stack.replaceChildren(...shown.map(wallFace), ...(more > 0 ? [h('em', {}, `+${formatNumber(more)}`)] : []))
    ticker.replaceChildren(h('img', { src: heartIcon(), alt: '' }), h('span', {}, m.hallJoined(newest.handle, dayKey(new Date(newest.since)) === dayKey(today()))))
    el.classList.add('filled')
  })
  return el
}

/**
 * "<Name> te convidou!": a guest who came by a friend's link sees who and
 * what signing up brings (a Friendship Egg each). It shows once the
 * inviter's name comes back, and never offline; tapping it opens the account.
 */
const inviteBanner = (slot: HTMLElement, open: () => void, ready: (el: HTMLElement) => void) => {
  if (!accountsEnabled || accountState().kind === 'signedIn') return
  void inviterName().then((name) => {
    if (!name || !slot.isConnected || accountState().kind === 'signedIn') return
    const m = t().invite
    const el = h(
      'button',
      { class: 'invite-banner box pop', type: 'button', onclick: open },
      h('img', { src: eggIcon('friend'), alt: '' }),
      h('span', { class: 'invite-text' }, rich(m.banner(name), { class: 'invite-head' }), h('span', { class: 'invite-blurb' }, m.blurb)),
    )
    slot.append(el)
    ready(el)
  })
}

/* ---------------- The partner on stage ---------------- */

/** Art px of the stage canvas, and where the partner's feet stand in it. */
const STAGE = { w: 80, h: 64, feet: 58 } as const

/**
 * The saved partner (`save.partner`, its first stage, shiny if played so)
 * standing on the meadow, as big as the stage allows in whole pixels, over a
 * name plate. A tap does what JOGAR does.
 */
const partnerStage = (onPlay: () => void) => {
  const save = loadSave()
  const form = PLAYABLE[save.partner].line[0]
  const shiny = playsShiny(save.partner)
  void loadSpecies(form.dex, shiny).catch(() => {})
  const canvas = h('canvas', { class: 'lobby-partner-sprite', width: STAGE.w, height: STAGE.h, 'aria-hidden': 'true' })
  const plate = h('span', { class: 'lobby-plate' }, h('b', {}, form.name), h('small', {}, `${t().home.change} ▸`))
  const partner = h('button', { class: 'lobby-partner', type: 'button', 'aria-label': `${form.name} · ${t().home.change}`, onclick: onPlay }, canvas, plate)
  const el = h('div', { class: 'lobby-stage' }, partner)
  const shadow = ellipse(13, 3, 'rgba(16, 24, 16, 0.3)')
  const tick = (time: number) => {
    const dpr = window.devicePixelRatio || 1
    const room = el.clientHeight - plate.offsetHeight - 8
    pixelSize(canvas, Math.min(Math.round(4 * dpr), logoScale(STAGE.w, STAGE.h, el.clientWidth, Math.max(room, 1), dpr)))
    const ctx = context2d(canvas)
    ctx.clearRect(0, 0, STAGE.w, STAGE.h)
    blitCentered(ctx, shadow, STAGE.w / 2, STAGE.feet)
    const s = loadedSprites(form.dex, shiny)
    if (s) drawPokemon(ctx, s, 'Idle', 0, time, STAGE.w / 2, STAGE.feet)
  }
  return { el, tick }
}

/* ---------------- Collection dock ---------------- */

/** A dock tile: icon, label, an optional badge and its key hint. */
const dockTile = (key: LobbyFocus, icon: string, label: string, hotkey: string, count = 0, aria = label) =>
  h(
    'button',
    { class: `lobby-tile box ${key}`, type: 'button', 'aria-label': aria },
    h('img', { src: icon, alt: '' }),
    h('span', {}, label),
    count > 0 && h('em', { class: 'lobby-badge' }, formatNumber(count)),
    h('span', { class: 'key-hint' }, hotkey),
  )

/* ---------------- Keyboard and gamepad ---------------- */

const DIRECTIONS: Readonly<Record<string, Direction>> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
}

/** Shortcuts, shown as key hints on what they press (`C` belongs to the Trainer chip; P, E and Space are taken by the run's controls). */
const HOTKEYS: Readonly<Record<string, LobbyFocus>> = { KeyX: 'pokedex', KeyO: 'eggs', KeyL: 'mart', KeyR: 'ranking', KeyM: 'missions', KeyH: 'hall' }

/**
 * Title screen over the live meadow: the pixel logo and a blinking "press
 * start", then the lobby. The top bar holds the Trainer chip, the wallet, `?`
 * (how to play) and the gear. Hoje has the day's cards (Surto, Desafio,
 * Missões), the Hall da Fama card sits beside them, the saved partner stands
 * in the middle, and JOGAR goes with the collection dock (Pokédex, Ovos,
 * Loja, Ranking). Arrows move between all of them by where they are on
 * screen; Enter presses the highlighted one, JOGAR at first.
 * `intro: false` opens straight on the lobby (coming back from another
 * screen, or after a language switch), highlighting `focus`.
 */
export const titleScreen = (root: HTMLElement, input: Input, actions: TitleActions, opts: { intro?: boolean; focus?: LobbyFocus }): Screen => {
  const m = t().home
  const lang = locale()

  const logo = h('canvas', { class: 'title-logo', width: 1, height: 1, 'aria-hidden': 'true' })
  void titleLogo().then((sprite) => {
    logo.width = sprite.width
    logo.height = sprite.height
    context2d(logo).drawImage(sprite, 0, 0)
    fitLogo(logo, lobby === null)
    logo.classList.add('shown')
  })

  const prompt = h('p', { class: 'press-start blink' }, h('span', { class: 'keys-only' }, m.pressKeys), h('span', { class: 'touch-only' }, m.pressTouch))
  // The top bar waits for the lobby: the intro is just the logo and "press start".
  const bar = h('span', { class: 'hidden' })
  const intro = shellBody(h('h1', { class: 'sr-only' }, 'Pokémon Survivors'), logo, prompt)
  const el = h('div', { class: 'screen shell title-home' }, bar, intro)

  let lobby: HTMLElement | null = null
  let tickers: ((time: number) => void)[] = []
  let current: LobbyFocus = opts.focus ?? 'play'
  let offKeys: (() => void) | null = null
  let closeChip: (() => void) | null = null
  let offIntro: (() => void) | null = null
  /** Settings, the Pokédex, the Trainer Card… open over the meadow. */
  let overScreen: Screen | null = null

  /** Everything the arrows reach, wherever the layout puts it. */
  let navs: { el: HTMLElement; key: LobbyFocus }[] = []
  const itemOf = (key: LobbyFocus) => navs.find((n) => n.key === key)?.el

  const select = (key: LobbyFocus, sound = true) => {
    if (key !== current && sound) playSfx('move')
    current = key
    for (const n of navs) n.el.classList.toggle('selected', n.key === key)
  }

  /** Makes `node` part of the arrows' tour as `key`; a mouse over it highlights it too. */
  const navigable = <T extends HTMLElement>(node: T, key: LobbyFocus) => {
    navs.push({ el: node, key })
    node.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && select(key, false))
    return node
  }

  const move = (dir: Direction) => {
    const next = navs[nearestInDirection(navs.map((n) => n.el.getBoundingClientRect()), navs.findIndex((n) => n.key === current), dir)]
    if (next) select(next.key)
  }

  /** Another screen replaces the title (only the meadow stays): its keys stay off until that one closes and the title is rebuilt. */
  const openOver = (open: (focus: LobbyFocus) => Screen) => {
    offKeys?.()
    closeChip?.()
    offKeys = closeChip = null
    el.classList.add('hidden')
    overScreen = open(current)
  }

  const { ranking } = actions
  const runs: Record<Exclude<LobbyFocus, 'trainer' | 'hall'>, () => void> = {
    help: () => location.assign(ROUTES.guide[lang]),
    settings: () => openOver(actions.settings),
    outbreak: () => toast(root, rich(`*${ENEMIES[outbreakToday()].name}*: ${t().outbreak.blurb}`), 3600, 'outbreak'),
    challenge: actions.challenge,
    missions: actions.missions,
    invite: () => openOver(actions.trainer),
    pokedex: () => openOver(actions.pokedex),
    eggs: actions.incubator,
    mart: () => openOver(actions.mart),
    ranking: () => ranking && openOver(ranking),
    play: actions.play,
  }
  /** A press on `key`: the select sound, then its action after this dispatch (or the next screen would get the same press). */
  const press = (key: keyof typeof runs) => () => (select(key, false), playSfx('select'), later(runs[key]))
  const pressable = <T extends HTMLElement>(node: T, key: keyof typeof runs) => (node.addEventListener('click', press(key)), navigable(node, key))

  const buildLobby = () => {
    const save = loadSave()
    navs = []
    const chip = trainerChip(input, { onOpen: () => openOver(actions.trainer) })
    closeChip = chip.dispose
    navigable(chip.el, 'trainer')
    bar.replaceWith(
      topBar({
        left: chip.el,
        right: [walletChip(save.wallet), navigable(helpButton(press('help')), 'help'), navigable(gearButton(press('settings')), 'settings')],
      }),
    )

    const outbreak = outbreakCard()
    const stage = partnerStage(press('play'))
    tickers = [outbreak.tick, stage.tick]
    const hall = navigable(hallCard(() => (select('hall', false), playSfx('select'), later(() => openOver((focus) => actions.supporters(focus, 'pick'))))), 'hall')
    const side = h('div', { class: 'lobby-side' }, hall)
    inviteBanner(side, press('invite'), (banner) => navigable(banner, 'invite'))

    const ready = save.eggs.filter(isReady).length
    const tiles = [
      pressable(dockTile('pokedex', pokeballIcon(), m.pokedex, 'X'), 'pokedex'),
      pressable(dockTile('eggs', eggIcon('rare'), m.eggs, 'O', ready, ready > 0 ? `${m.eggs}: ${m.eggsReady(ready)}` : m.eggs), 'eggs'),
      pressable(dockTile('mart', coinIcon(2), m.mart, 'L'), 'mart'),
      ...(ranking ? [pressable(dockTile('ranking', medalIcon('gold'), m.ranking, 'R'), 'ranking')] : []),
    ]
    const play = pressable(h('button', { class: 'lobby-play', type: 'button' }, h('span', {}, m.play), h('span', { class: 'key-hint' }, 'ENTER')), 'play')
    // JOGAR sits in the middle of the dock on wide screens; the CSS moves it above the tab bar on phones.
    const half = Math.ceil(tiles.length / 2)
    const bottom = h('div', { class: 'lobby-bottom', style: `--tiles:${tiles.length}` }, ...tiles.slice(0, half), play, ...tiles.slice(half))

    const todayEl = h(
      'section',
      { class: 'lobby-today', 'aria-label': m.today },
      h('h2', { class: 'lobby-rail-label' }, m.today),
      pressable(outbreak.el, 'outbreak'),
      pressable(challengeCard(), 'challenge'),
      pressable(missionsCard(), 'missions'),
    )
    lobby = h('div', { class: 'lobby' }, h('h1', { class: 'sr-only' }, 'Pokémon Survivors'), h('div', { class: 'lobby-logo' }, logo), todayEl, side, stage.el, bottom)
    intro.replaceWith(lobby)
    if (logo.width > 1) fitLogo(logo, false)

    select(itemOf(current) ? current : 'play', false)
    offKeys = input.onKey((key) => {
      const dir = DIRECTIONS[key]
      if (dir) return move(dir)
      if (key === 'Enter' || key === 'Space') return void itemOf(current)?.click()
      const hot = HOTKEYS[key]
      const target = hot && itemOf(hot)
      if (hot && target) target.click()
    })
  }

  const enterLobby = () => {
    buildLobby()
    actions.ready()
  }

  if (opts.intro) {
    // Any key, pad button or tap. `later` keeps that same press from also pressing JOGAR.
    const start = () => {
      if (!offIntro) return
      playSfx('select')
      later(enterLobby)
      offIntro()
      offIntro = null
    }
    const offKey = input.onKey(start)
    const onTap = (e: Event) => e.target instanceof Element && !e.target.closest('a') && start()
    el.addEventListener('click', onTap)
    offIntro = () => (offKey(), el.removeEventListener('click', onTap))
  } else {
    enterLobby()
  }

  root.append(el)
  return {
    el,
    dim: 0.12,
    tick: (time: number) => {
      overScreen?.tick?.(time)
      if (el.classList.contains('hidden')) return
      for (const tick of tickers) tick(time)
      if (logo.width > 1) fitLogo(logo, lobby === null)
    },
    dispose: () => (overScreen?.dispose(), offIntro?.(), offKeys?.(), closeChip?.(), el.remove()),
  }
}

/**
 * "◀ Title" entry in the starter select's top-left corner (twin of the Poké
 * Mart entry). Esc and Backspace (pad B) do the same. Returns a disposer.
 */
export const titleButton = (root: HTMLElement, input: Input, onBack: () => void) => {
  const back = () => (playSfx('move'), later(onBack))
  const el = h('button', { class: 'back-entry box', onclick: back }, h('span', { class: 'back-arrow' }, '◀'), t().home.back, h('span', { class: 'key-hint' }, 'ESC'))
  const off = input.onKey((key) => (key === 'Escape' || key === 'Backspace') && back())
  root.append(el)
  return () => (off(), el.remove())
}
