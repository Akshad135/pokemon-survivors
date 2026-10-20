import { describe, expect, it } from 'vitest'
import { createRng } from '../engine/rng'
import { chooseOffer, step, takeBerryLevelUps } from './game'
import { ITEM_IDS, ITEMS } from '../data/items'
import { maxMoveLevel } from './moves'
import { gainXp, recomputeStats } from './leveling'
import { grantStone } from './mega'
import { spawnMapEvent } from './mapEvents'
import { pickAlpha, spawnAlpha } from './alphas'
import { NO_RANKS } from './meta'
import { OUTBREAK_SPECIES } from './outbreak'
import { enterPlace } from './placeInterior'
import { enterDomain } from './domain'
import { GRAVEYARD, PLACE_IDS } from '../data/places'
import { spawnWaveBoss } from './spawner'
import { spawnEnemy } from './enemies'
import { makeSpitter } from './spitters'
import type { Game } from './types'
import { featureAt, type Landmark } from './terrain'
import { LANDMARK } from '../data/landmarks'
import { TENSION_PEAK } from './tension'
import { moveCode, moveOf, parseReplay, recordEvent, recordStep, resimulate, RULES_VERSION, rulesStanding, startGame, startRecording, TICK, type ReplayStart } from './replay'

const START: ReplayStart = { seed: 7, starter: 'squirtle', difficulty: 'normal', ranks: NO_RANKS, shiny: false, luckyEgg: false, outbreak: null, lure: false, incense: false, view: { w: 480, h: 270 } }

/**
 * Plays `seconds` like the shell would, with a wandering stick, picks and a
 * rotation, recording it. The special is pressed every `every` ticks, the Mega
 * button every 400 ticks and the lunge every 100. `stage` sets the run up first (a test-only shortcut);
 * `idle` steps are recorded at each level-up before its pick, as older shells did.
 */
const play = (seconds: number, start = START, every = 300, stage: (g: Game) => void = () => {}, idle = 0) => {
  const view = { ...start.view }
  const g = startGame(start, view)
  stage(g)
  const rec = startRecording(start)
  const bot = createRng(3)
  let angle = 0
  while (g.time < seconds && g.phase !== 'gameover') {
    if (g.phase === 'levelup' || g.phase === 'branch' || g.phase === 'ability') {
      // Steps an older shell recorded while the level-up was already open.
      for (let n = 0; n < idle; n++) step(g, { move: recordStep(rec, view, { x: 1, y: 0 }), special: false }, TICK)
      const i = Math.floor(bot() * g.offers.length)
      recordEvent(rec, ['offer', i])
      chooseOffer(g, g.offers[i]!)
      continue
    }
    if (rec.tick === 600) Object.assign(view, { w: 300, h: 520 })
    angle += (bot() - 0.5) * 0.2
    const special = rec.tick % every === 0
    const mega = rec.tick % 400 === 100
    const lunge = rec.tick % 100 === 50
    if (special) recordEvent(rec, ['special'])
    if (mega) recordEvent(rec, ['mega'])
    if (lunge) recordEvent(rec, ['lunge'])
    step(g, { move: recordStep(rec, view, { x: Math.cos(angle), y: Math.sin(angle) }), special, mega, lunge }, TICK)
  }
  return { g, replay: rec.replay }
}

describe('moveCode', () => {
  it('keeps the 8 keyboard directions exact and standing still at zero', () => {
    const d = Math.SQRT1_2
    for (const v of [{ x: 1, y: 0 }, { x: 0, y: -1 }, { x: -d, y: d }, { x: d, y: d }]) {
      const back = moveOf(moveCode(v))
      expect(back.x).toBeCloseTo(v.x, 12)
      expect(back.y).toBeCloseTo(v.y, 12)
    }
    expect(moveCode({ x: 0.02, y: 0 })).toBe(0)
  })

  it('lands within 6° and one speed step of any stick', () => {
    const rng = createRng(1)
    for (let i = 0; i < 500; i++) {
      const a = rng() * Math.PI * 2
      const len = rng()
      const back = moveOf(moveCode({ x: Math.cos(a) * len, y: Math.sin(a) * len }))
      expect(Math.abs(Math.hypot(back.x, back.y) - len)).toBeLessThanOrEqual(1 / 14 + 1e-9)
      if (Math.hypot(back.x, back.y) > 0) expect(Math.abs(Math.cos(Math.atan2(back.y, back.x) - a) - 1)).toBeLessThan(1 - Math.cos((6 * Math.PI) / 180))
    }
  })
})

describe('replays', () => {
  it('re-simulate to the same run', () => {
    const { g, replay } = play(40)
    const again = resimulate(parseReplay(JSON.parse(JSON.stringify(replay)))!)
    expect(again).toEqual({ time: g.time, kills: g.kills, level: g.player.level, branch: g.branch, phase: g.phase, stuck: false })
    expect(replay.events.some((e) => e[1] === 'view')).toBe(true)
  })

  it('let ticks recorded during a level-up pass, and are stuck only when they end on one', () => {
    const levelled = (g: Game) => gainXp(g, 300)
    const { g, replay } = play(40, START, 300, levelled, 3)
    expect(replay.events.filter((e) => e[1] === 'offer').length).toBeGreaterThan(1)
    const staged = () => {
      const s = startGame(START)
      levelled(s)
      return s
    }
    expect(resimulate(parseReplay(JSON.parse(JSON.stringify(replay)))!, staged())).toEqual({ time: g.time, kills: g.kills, level: g.player.level, branch: g.branch, phase: g.phase, stuck: false })
    expect(resimulate({ ...replay, events: replay.events.filter((e) => e[1] !== 'offer') }, staged()).stuck).toBe(true)
  })

  it('play the same run whether the starter was picked shiny or not', () => {
    const { replay } = play(30)
    const normal = resimulate(replay)
    const picked = resimulate({ ...replay, start: { ...replay.start, shiny: true } })
    expect(picked).toEqual(normal)
  })

  it('re-simulate a chain dash run, presses inside the windows included', () => {
    const { g, replay } = play(40, { ...START, starter: 'treecko' }, 20)
    expect(resimulate(parseReplay(JSON.parse(JSON.stringify(replay)))!)).toEqual({ time: g.time, kills: g.kills, level: g.player.level, branch: g.branch, phase: g.phase, stuck: false })
  })

  it('re-simulate a Mega Evolution, its transformation and its special', () => {
    /** Charizard with the Charizardite Y, as if a rift had dropped it: Drought brings the sun in. */
    const megaReady = (g: Game) => {
      g.player.stage = 2
      recomputeStats(g)
      grantStone(g, 'charizardY')
    }
    const start: ReplayStart = { ...START, starter: 'charmander' }
    const { g, replay } = play(40, start, 90, megaReady)
    expect(g.mega.count).toBe(1)
    const staged = startGame(start)
    megaReady(staged)
    expect(resimulate(parseReplay(JSON.parse(JSON.stringify(replay)))!, staged)).toEqual({ time: g.time, kills: g.kills, level: g.player.level, branch: g.branch, phase: g.phase, stuck: false })
  })

  it('re-simulate Quick Attack, which only lunges on a press', () => {
    const quickAttack = (g: Game) => {
      g.player.moves.push({ id: 'quickAttack', level: 1, cooldown: 0 })
    }
    const start: ReplayStart = { ...START, starter: 'riolu' }
    const { g, replay } = play(40, start, 300, quickAttack)
    const staged = startGame(start)
    quickAttack(staged)
    expect(resimulate(parseReplay(JSON.parse(JSON.stringify(replay)))!, staged)).toEqual({ time: g.time, kills: g.kills, level: g.player.level, branch: g.branch, phase: g.phase, stuck: false })
  })

  it('re-simulate field missions: a raided nest and lost Poké Balls underfoot', () => {
    const missions = (g: Game) => {
      const p = g.player
      spawnMapEvent(g, 'defense', Math.round(p.x), Math.round(p.y))
      const balls = spawnMapEvent(g, 'collect', Math.round(p.x), Math.round(p.y))
      // One ball right under the player, so the run picks it up.
      balls.state.balls[0] = { x: Math.round(p.x), y: Math.round(p.y), got: false }
    }
    const { g, replay } = play(40, START, 300, missions)
    expect(g.tally.notices.nestRaid).toBe(1)
    expect(g.tally.notices.ballFound).toBeGreaterThanOrEqual(1)
    const staged = startGame(START)
    missions(staged)
    expect(resimulate(parseReplay(JSON.parse(JSON.stringify(replay)))!, staged)).toEqual({ time: g.time, kills: g.kills, level: g.player.level, branch: g.branch, phase: g.phase, stuck: false })
  })

  it("re-simulate a Nightmare Mewtwo in its second phase: leaps, aimed volleys and path strikes", () => {
    const phaseTwo = (g: Game) => {
      const boss = spawnWaveBoss(g, 'mewtwo', g.time)
      boss.hp = boss.maxHp * 0.35
    }
    const start: ReplayStart = { ...START, difficulty: 'nightmare' }
    const { g, replay } = play(30, start, 300, phaseTwo)
    const staged = startGame(start)
    phaseTwo(staged)
    expect(resimulate(parseReplay(JSON.parse(JSON.stringify(replay)))!, staged)).toEqual({ time: g.time, kills: g.kills, level: g.player.level, branch: g.branch, phase: g.phase, stuck: false })
    const mewtwo = (r: Game) => r.enemies.find((e) => e.kind === 'mewtwo')!
    expect([staged.player.hp, mewtwo(staged).x, mewtwo(staged).y]).toEqual([g.player.hp, mewtwo(g).x, mewtwo(g).y])
  })

  it('re-simulate spitters, their volleys and their puddles', () => {
    const spitters = (g: Game) => {
      const kinds = ['grimer', 'growlithe', 'oddish', 'psyduck'] as const
      kinds.forEach((kind, i) => makeSpitter(spawnEnemy(g, kind, g.player.x + (i - 1.5) * 60, g.player.y - 120), i / 4))
    }
    const start: ReplayStart = { ...START, difficulty: 'nightmare' }
    const { g, replay } = play(40, start, 300, spitters)
    expect(g.events.filter((e) => e.kind === 'trait' && e.trait === 'spitter' && e.phase === 'fire').length).toBeGreaterThan(3)
    const staged = startGame(start)
    spitters(staged)
    expect(resimulate(parseReplay(JSON.parse(JSON.stringify(replay)))!, staged)).toEqual({ time: g.time, kills: g.kills, level: g.player.level, branch: g.branch, phase: g.phase, stuck: false })
  })

  it("re-simulate a run of the day's outbreak with a Lure and an Incense, which change how it plays", () => {
    const start: ReplayStart = { ...START, outbreak: OUTBREAK_SPECIES[0]!, lure: true, incense: true }
    const { g, replay } = play(40, start)
    expect(g.roster.stages.every((pool) => pool.some(([id]) => id === start.outbreak))).toBe(true)
    expect(g.shinyBoost).toBe(2)
    expect(resimulate(parseReplay(JSON.parse(JSON.stringify(replay)))!)).toEqual({ time: g.time, kills: g.kills, level: g.player.level, branch: g.branch, phase: g.phase, stuck: false })
    expect(resimulate({ ...replay, start: { ...replay.start, outbreak: null } })).not.toEqual(resimulate(replay))
    expect(parseReplay({ ...JSON.parse(JSON.stringify(replay)), start: { ...replay.start, outbreak: 'mewtwo' } })!.start.outbreak).toBeNull()
  })

  it.each(PLACE_IDS)('re-simulate a run through the %s, its own spawns and rules included', (id) => {
    // The graveyard one spirit short, so Spiritomb wakes and fights inside the replay.
    const inside = (g: Game) => {
      g.time = 200
      enterPlace(g, id, 0, 0)
      if (g.place.inside?.id === 'graveyard') g.place.inside.state.spirits = GRAVEYARD.spirits - 1
    }
    const start: ReplayStart = { ...START, starter: 'pidgey' }
    const { g, replay } = play(250, start, 300, inside)
    expect(g.place.visited).toEqual([id])
    const staged = startGame(start)
    inside(staged)
    expect(resimulate(parseReplay(JSON.parse(JSON.stringify(replay)))!, staged)).toEqual({ time: g.time, kills: g.kills, level: g.player.level, branch: g.branch, phase: g.phase, stuck: false })
  })

  it('re-simulate an entrance the director opens on its own', () => {
    const early = (g: Game) => {
      g.place.nextAt = 3
    }
    const { g, replay } = play(20, START, 300, early)
    expect(g.place.offered.length).toBe(1)
    const staged = startGame(START)
    early(staged)
    expect(resimulate(parseReplay(JSON.parse(JSON.stringify(replay)))!, staged)).toEqual({ time: g.time, kills: g.kills, level: g.player.level, branch: g.branch, phase: g.phase, stuck: false })
  })

  it.each(['tunnel', 'maze', 'ruins'] as const)('re-simulate a run through a landmark: the %s', (id) => {
    /** The nearest landmark of the kind, the player one tick from stepping in (or opening its treasure). */
    const near = (g: Game) => {
      for (let r = 2; r < 30; r++) {
        for (let cx = -r; cx <= r; cx++) {
          for (const cy of [-r, r]) {
            const lm = featureAt(g.terrain.seed, cx, cy)?.landmark
            if (lm?.id === id) return lm
          }
        }
      }
      throw new Error(`no ${id}`)
    }
    const stage = (g: Game) => {
      const lm: Landmark = near(g)
      const spot = lm.treasure ?? lm.mouths[0]!
      Object.assign(g.player, spot)
      if (lm.treasure) g.landmarks.opening = { cell: lm.cell, t: LANDMARK.openTime - 0.01 }
      else g.landmarks.entering = { cell: lm.cell, mouth: 0, t: 0.39 }
    }
    const { g, replay } = play(12, START, 300, stage)
    expect(g.events.some((e) => e.kind === 'landmark' && e.moment === (id === 'tunnel' ? 'tunnelOut' : 'loot'))).toBe(true)
    const staged = startGame(START)
    stage(staged)
    expect(resimulate(parseReplay(JSON.parse(JSON.stringify(replay)))!, staged)).toEqual({ time: g.time, kills: g.kills, level: g.player.level, branch: g.branch, phase: g.phase, stuck: false })
  })

  it('re-simulate a Nightmare run under full tension: close spawns, tense elites and a surge', () => {
    const tense = (g: Game) => {
      Object.assign(g.tension, { level: 1, reach: 1, surge: TENSION_PEAK.nightmare.surgeEvery - 1 })
    }
    const start: ReplayStart = { ...START, difficulty: 'nightmare' }
    const { g, replay } = play(40, start, 300, tense)
    expect(g.tension.surges).toBeGreaterThan(0)
    const staged = startGame(start)
    tense(staged)
    expect(resimulate(parseReplay(JSON.parse(JSON.stringify(replay)))!, staged)).toEqual({ time: g.time, kills: g.kills, level: g.player.level, branch: g.branch, phase: g.phase, stuck: false })
  })

  it('re-simulate Alphas on Nightmare: their charges, shockwaves, rage, fall and the prize level-up', () => {
    /** A frail Alpha next to the player (its prize lands in reach) and a whole one a bit farther. */
    const alphas = (g: Game) => {
      const kind = pickAlpha(g.rng, g.roster.stages[0]!)!
      spawnAlpha(g, kind, g.player.x + 30, g.player.y).hp = 1
      spawnAlpha(g, kind, g.player.x - 150, g.player.y)
    }
    const start: ReplayStart = { ...START, difficulty: 'nightmare' }
    const { g, replay } = play(40, start, 300, alphas)
    const moments = new Set(g.events.flatMap((e) => (e.kind === 'alpha' ? [e.moment] : [])))
    expect([...moments]).toEqual(expect.arrayContaining(['spawn', 'down', 'aim', 'charge', 'shock']))
    expect(g.events.some((e) => e.kind === 'alphaPrize')).toBe(true)
    const staged = startGame(start)
    alphas(staged)
    expect(resimulate(parseReplay(JSON.parse(JSON.stringify(replay)))!, staged)).toEqual({ time: g.time, kills: g.kills, level: g.player.level, branch: g.branch, phase: g.phase, stuck: false })
  })

  it("re-simulate the world's hazards, landing on the player and the horde", () => {
    /** Nightmare at 6:00, past the wave events, with the world's next attack due. */
    const late = (g: Game) => {
      g.time = 360
      g.nextEvent = 99
      g.worldHazards.charge = 0.99
    }
    const start: ReplayStart = { ...START, difficulty: 'nightmare' }
    const { g, replay } = play(366, start, 300, late)
    expect(g.worldHazards.fired).toBeGreaterThan(0)
    const staged = startGame(start)
    late(staged)
    expect(resimulate(parseReplay(JSON.parse(JSON.stringify(replay)))!, staged)).toEqual({ time: g.time, kills: g.kills, level: g.player.level, branch: g.branch, phase: g.phase, stuck: false })
  })

  it('re-simulate level-ups that took the berry on their own, several in a row', () => {
    /** Six maxed moves (no evolution or duo among them) and six maxed items, past the draft, with level-ups waiting. */
    const maxed = (g: Game) => {
      g.player.moves = (['ember', 'fireSpin', 'swift', 'iceShard', 'sludgeBomb', 'gust'] as const).map((id) => ({ id, level: maxMoveLevel(id), cooldown: 0, path: 0 }))
      g.player.items = ITEM_IDS.slice(0, 6).map((id) => ({ id, level: ITEMS[id].levels.length }))
      Object.assign(g, { phase: 'playing', pendingLevelUps: 0, offers: [] })
      recomputeStats(g)
      gainXp(g, 300)
    }
    const view = { ...START.view }
    const g = startGame(START, view)
    maxed(g)
    const rec = startRecording(START)
    let taken = 0
    while (g.time < 10) {
      taken += takeBerryLevelUps(g, (i) => recordEvent(rec, ['offer', i]))
      expect(g.phase).not.toBe('levelup')
      step(g, { move: recordStep(rec, view, { x: 1, y: 0 }), special: false }, TICK)
    }
    expect(taken).toBeGreaterThan(1)
    const staged = startGame(START)
    maxed(staged)
    expect(resimulate(parseReplay(JSON.parse(JSON.stringify(rec.replay)))!, staged)).toEqual({ time: g.time, kills: g.kills, level: g.player.level, branch: g.branch, phase: g.phase, stuck: false })
  })

  it("re-simulate a whole rift into Kyogre's domain: the crossing, the encounter, three phases and the capture", () => {
    /** A player strong enough to take Kyogre down in under a minute, stepping into its domain at once. */
    const strong = (g: Game) => {
      g.player.moves = (['razorLeaf', 'thunder', 'flashCannon', 'earthquake', 'sludgeBomb', 'swift'] as const).map((id) => ({ id, level: maxMoveLevel(id), cooldown: 0 }))
      enterDomain(g, 'kyogre', g.player.x, g.player.y)
    }
    const view = { ...START.view }
    const g = startGame(START, view)
    strong(g)
    const rec = startRecording(START)
    const origin = { x: g.player.x, y: g.player.y }
    // Up through the cavern's chambers, then circling in the arena.
    const way = [[44, -282], [-46, -596], [36, -904], [-40, -1200], [30, -1504], [0, -1920]] as const
    let w = 0
    while (g.rift.arena && rec.tick < 60 * 120) {
      if (g.phase !== 'playing') {
        recordEvent(rec, ['offer', 0])
        chooseOffer(g, g.offers[0]!)
        continue
      }
      const p = g.player
      const [tx, ty] = way[w]!
      const dx = origin.x + tx - p.x
      const dy = origin.y + ty - p.y
      const len = Math.hypot(dx, dy) || 1
      if (len < 30 && w < way.length - 1) w++
      const a = rec.tick / 120
      const stick = g.rift.arena.domain?.act === 'crossing' ? { x: dx / len, y: dy / len } : { x: Math.cos(a), y: Math.sin(a) }
      step(g, { move: recordStep(rec, view, stick), special: false }, TICK)
    }
    expect(g.rift.cleared).toEqual(['kyogre'])
    expect(g.events.filter((e) => e.kind === 'bossPhase').length).toBe(2)
    expect(g.events.some((e) => e.kind === 'riftCapture')).toBe(true)
    // The run clock stayed stopped the whole way through.
    expect(g.time).toBe(0)
    const staged = startGame(START)
    strong(staged)
    expect(resimulate(parseReplay(JSON.parse(JSON.stringify(rec.replay)))!, staged)).toEqual({ time: g.time, kills: g.kills, level: g.player.level, branch: g.branch, phase: g.phase, stuck: false })
    expect([staged.player.x, staged.player.y, staged.player.hp, staged.now]).toEqual([g.player.x, g.player.y, g.player.hp, g.now])
  }, 60_000)

  // Groudon's magma tunnel and Rayquaza's Sky Pillar, up their passages (round the pools and holes), then circling in the arena.
  const DOMAIN_WAYS = {
    groudon: [[0, -30], [-50, -220], [-50, -320], [40, -520], [76, -575], [40, -640], [-30, -840], [-30, -950], [50, -1150], [50, -1270], [-20, -1470], [-20, -1572], [0, -1920]],
    rayquaza: [[50, -60], [70, -270], [-10, -390], [-60, -600], [-10, -660], [0, -720], [50, -930], [40, -990], [-10, -1050], [-50, -1260], [0, -1384], [20, -1590], [20, -1706], [0, -1920]],
  } as const
  for (const legend of ['groudon', 'rayquaza'] as const) {
    it(`re-simulate a whole rift into ${legend}'s domain: the crossing, the encounter, three phases and the capture`, () => {
      const strong = (g: Game) => {
        g.player.moves = (['razorLeaf', 'thunder', 'flashCannon', 'iceShard', 'sludgeBomb', 'swift'] as const).map((id) => ({ id, level: maxMoveLevel(id), cooldown: 0 }))
        // Levels for the HP to walk the crossing straight through its lava and fight without dodging.
        gainXp(g, 4000)
        enterDomain(g, legend, g.player.x, g.player.y)
      }
      const view = { ...START.view }
      const g = startGame(START, view)
      strong(g)
      const rec = startRecording(START)
      const origin = { x: g.rift.arena!.x, y: g.rift.arena!.y }
      const way = DOMAIN_WAYS[legend]
      let w = 0
      while (g.rift.arena && rec.tick < 60 * 150) {
        if (g.phase !== 'playing' && g.phase !== 'evolving') {
          recordEvent(rec, ['offer', 0])
          chooseOffer(g, g.offers[0]!)
          continue
        }
        const p = g.player
        const [tx, ty] = way[w]!
        const dx = origin.x + tx - p.x
        const dy = origin.y + ty - p.y
        const len = Math.hypot(dx, dy) || 1
        if (len < 24 && w < way.length - 1) w++
        const a = rec.tick / 120
        const stick = g.rift.arena.domain?.act === 'crossing' ? { x: dx / len, y: dy / len } : { x: Math.cos(a), y: Math.sin(a) }
        step(g, { move: recordStep(rec, view, stick), special: false }, TICK)
      }
      expect(g.rift.cleared).toEqual([legend])
      expect(g.events.filter((e) => e.kind === 'bossPhase').length).toBe(2)
      expect(g.time).toBe(0)
      const staged = startGame(START)
      strong(staged)
      expect(resimulate(parseReplay(JSON.parse(JSON.stringify(rec.replay)))!, staged)).toEqual({ time: g.time, kills: g.kills, level: g.player.level, branch: g.branch, phase: g.phase, stuck: false })
      expect([staged.player.x, staged.player.y, staged.player.hp, staged.now]).toEqual([g.player.x, g.player.y, g.player.hp, g.now])
    }, 60_000)
  }

  it('give a run played on another seed away', () => {
    const { g, replay } = play(40)
    const other = resimulate({ ...replay, start: { ...replay.start, seed: 8 } })
    expect([other.kills, other.level, other.time]).not.toEqual([g.kills, g.player.level, g.time])
  })

  it('refuse broken shapes', () => {
    const { replay } = play(2)
    const json = JSON.parse(JSON.stringify(replay))
    expect(parseReplay({ ...json, moves: [1] })).toBeNull()
    expect(parseReplay({ ...json, moves: [999, 1] })).toBeNull()
    expect(parseReplay({ ...json, events: [[5, 'special'], [2, 'special']] })).toBeNull()
    expect(parseReplay({ ...json, start: { ...json.start, starter: 'mewtwo' } })).toBeNull()
    expect(parseReplay({ ...json, start: { ...json.start, ranks: { hpUp: 99 } } })!.start.ranks.hpUp).toBe(5)
  })

  it('carry the rules they were recorded under, and only those are judged as they are', () => {
    const json = JSON.parse(JSON.stringify(play(2).replay))
    expect(parseReplay(json)!.rules).toBe(RULES_VERSION)
    const { rules: _, ...before } = json
    expect(parseReplay(before)!.rules).toBe(1)
    expect(rulesStanding(RULES_VERSION)).toBe('same')
    expect(rulesStanding(1)).toBe('older')
    expect(rulesStanding(RULES_VERSION + 1)).toBe('newer')
  })
})
