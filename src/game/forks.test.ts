import { describe, expect, it } from 'vitest'
import { createRng } from '../engine/rng'
import { banishOffer, canBanish, chooseOffer, createGame, step } from './game'
import { gainXp, offerSubject, OFFER_RARITY, rollOffers, withRarity, type Loadout } from './leveling'
import { NO_RANKS } from './meta'
import { hasMod, MOD } from './mods'
import { forkAt, moveStats, withBranch } from './moves'
import { parseReplay, recordEvent, recordStep, resimulate, startGame, startRecording, TICK, type ReplayStart } from './replay'
import { BASE_STATS } from './stats'

/** A path taking `a` at the Lv 4 fork and `b` at the Lv 7 one. */
const path = (a: 0 | 1, b: 0 | 1) => withBranch(withBranch(0, 4, a), 7, b)

describe('moveStats with forks', () => {
  it('follows the path: each branch adds its stats and its mods', () => {
    const before = moveStats('swift', 3, BASE_STATS)
    expect(before.mods).toBe(0)
    const stars = moveStats('swift', 4, BASE_STATS, path(0, 0))
    const ring = moveStats('swift', 4, BASE_STATS, path(1, 0))
    expect(hasMod(stars.mods, 'bounce') && !hasMod(stars.mods, 'halo')).toBe(true)
    expect(stars.damage).toBe(before.damage + 6)
    expect(hasMod(ring.mods, 'halo') && !hasMod(ring.mods, 'bounce')).toBe(true)
    expect(ring.amount).toBe(before.amount + 1)
  })

  it('stacks the mods of both forks and ignores branches not reached yet', () => {
    const full = moveStats('thunder', 8, BASE_STATS, path(1, 0))
    expect(hasMod(full.mods, 'arc') && hasMod(full.mods, 'burstOnKill')).toBe(true)
    expect(moveStats('thunder', 6, BASE_STATS, path(1, 1)).mods).toBe(moveStats('thunder', 6, BASE_STATS, path(1, 0)).mods)
  })

  it('keeps trade-offs from taking a move below one shot', () => {
    // Focused Bolt takes two bolts away from three.
    expect(moveStats('thunder', 4, BASE_STATS, path(1, 0)).amount).toBe(1)
  })

  it('puts the forks at Lv 4 and 7 of the reworked moves', () => {
    for (const id of ['swift', 'crunch', 'thunder', 'fireSpin', 'ember', 'waterGun', 'razorLeaf', 'shockWave'] as const) {
      expect([2, 3, 4, 5, 6, 7, 8].filter((l) => forkAt(id, l))).toEqual([4, 7])
    }
  })
})

const LOADOUT: Loadout = { starter: 'charmander', moves: [{ id: 'ember', level: 2, cooldown: 0 }], items: [] }

describe('rollOffers', () => {
  it('never offers what was forgotten', () => {
    const banished = new Set(['ember', 'fireSpin', 'charcoal'] as const)
    for (let seed = 1; seed < 200; seed++) {
      for (const o of rollOffers({ ...LOADOUT, banished }, createRng(seed), 3)) expect(banished.has(offerSubject(o) as never)).toBe(false)
    }
  })

  it('leaves out the cards already on the table when drawing one slot again', () => {
    const shown = [{ kind: 'move', id: 'ember', level: 3 }] as const
    for (let seed = 1; seed < 100; seed++) expect(rollOffers(LOADOUT, createRng(seed), 1, { shown })[0]).not.toMatchObject({ id: 'ember' })
  })

  it('rolls rarity only when asked, at about the odds', () => {
    expect(rollOffers(LOADOUT, createRng(1), 3).some((o) => 'rarity' in o)).toBe(false)
    let rare = 0
    let shiny = 0
    let cards = 0
    for (let seed = 1; seed < 3000; seed++) {
      for (const o of rollOffers(LOADOUT, createRng(seed), 3, { shiny: OFFER_RARITY.shiny })) {
        cards++
        if ('rarity' in o && o.rarity === 'rare') rare++
        if ('rarity' in o && o.rarity === 'shiny') shiny++
      }
    }
    expect(rare / cards).toBeGreaterThan(0.05)
    expect(rare / cards).toBeLessThan(0.11)
    expect(shiny / cards).toBeGreaterThan(0.008)
    expect(shiny / cards).toBeLessThan(0.025)
  })

  it('makes a rare card jump two levels, but never through a fork', () => {
    expect(withRarity({ kind: 'move', id: 'ember', level: 2 }, 0.05, 0.01)).toEqual({ kind: 'move', id: 'ember', level: 3, rarity: 'rare' })
    // Lv 4 is a fork, so neither Lv 3 (next: 4) nor Lv 4 can be rare.
    expect(withRarity({ kind: 'move', id: 'ember', level: 3 }, 0.05, 0.01)).toEqual({ kind: 'move', id: 'ember', level: 3 })
    expect(withRarity({ kind: 'move', id: 'ember', level: 4 }, 0.05, 0.01)).toEqual({ kind: 'move', id: 'ember', level: 4 })
    expect(withRarity({ kind: 'move', id: 'ember', level: 4 }, 0.001, 0.01)).toMatchObject({ level: 4, rarity: 'shiny' })
    expect(withRarity({ kind: 'berry' }, 0, 0.01)).toEqual({ kind: 'berry' })
  })

  it('lets the Poké Ball skip every fork', () => {
    const loadout: Loadout = { starter: 'charmander', moves: [{ id: 'ember', level: 3, cooldown: 0 }, { id: 'fireSpin', level: 6, cooldown: 0 }], items: [] }
    for (let seed = 1; seed < 300; seed++) {
      const [o] = rollOffers(loadout, createRng(seed), 1, { forks: false })
      expect(o?.kind === 'move' && forkAt(o.id, o.level)).toBeFalsy()
    }
  })
})

describe('forks and shiny cards in a run', () => {
  it('opens the branches from a move card on a fork, and only the branch spends the level-up', () => {
    const g = createGame('charmander', { w: 480, h: 270 }, 3)
    g.player.moves[0]!.level = 3
    g.phase = 'levelup'
    g.pendingLevelUps = 1
    chooseOffer(g, { kind: 'move', id: 'ember', level: 4 })
    expect(g.phase).toBe('levelup')
    expect(g.offers.map((o) => o.kind)).toEqual(['branch', 'branch'])
    chooseOffer(g, g.offers[1]!)
    expect(g.player.moves[0]).toMatchObject({ level: 4, path: path(1, 0) })
    expect(g.phase).toBe('playing')
  })

  it('picks again after a shiny card', () => {
    const g = createGame('charmander', { w: 480, h: 270 }, 3)
    g.phase = 'levelup'
    g.pendingLevelUps = 1
    chooseOffer(g, { kind: 'move', id: 'ember', level: 2, rarity: 'shiny' })
    expect(g.phase).toBe('levelup')
    expect(g.pendingLevelUps).toBe(1)
  })
})

describe('Esquecer', () => {
  const START: ReplayStart = { seed: 11, starter: 'charmander', difficulty: 'normal', ranks: { ...NO_RANKS, escapeRope: 2 }, shiny: false, luckyEgg: false, outbreak: null, lure: false, incense: false, view: { w: 480, h: 270 } }

  it('spends a charge, forgets the card and draws its slot again', () => {
    const g = startGame(START)
    expect(g.phase).toBe('levelup')
    const forgotten = offerSubject(g.offers[0]!)
    banishOffer(g, 0)
    expect(g.banishes).toBe(1)
    expect(g.banished.has(forgotten!)).toBe(true)
    expect(g.offers.map(offerSubject)).not.toContain(forgotten)
  })

  it('re-simulates a run that forgot cards to the same result', () => {
    const view = { ...START.view }
    const g = startGame(START, view)
    gainXp(g, 400)
    const rec = startRecording(START)
    const bot = createRng(5)
    let angle = 0
    let banished = 0
    while (g.time < 30) {
      if (g.phase === 'levelup') {
        const i = Math.floor(bot() * g.offers.length)
        if (g.banishes > 0 && canBanish(g.offers[i]!) && bot() < 0.6) {
          recordEvent(rec, ['banish', i])
          banishOffer(g, i)
          banished++
          continue
        }
        recordEvent(rec, ['offer', i])
        chooseOffer(g, g.offers[i]!)
        continue
      }
      angle += (bot() - 0.5) * 0.2
      step(g, { move: recordStep(rec, view, { x: Math.cos(angle), y: Math.sin(angle) }), special: false }, TICK)
    }
    expect(banished).toBe(2)
    const staged = startGame(START)
    gainXp(staged, 400)
    const again = resimulate(parseReplay(JSON.parse(JSON.stringify(rec.replay)))!, staged)
    expect(again).toEqual({ time: g.time, kills: g.kills, level: g.player.level, branch: g.branch, phase: g.phase, stuck: false })
  })
})

describe('mods', () => {
  it('Rear doubles a cast and Twin adds a wider ring', () => {
    const count = (id: 'waterGun' | 'fireSpin', p: number) => {
      const g = createGame('squirtle', { w: 480, h: 270 }, 3)
      g.player.moves = [{ id, level: 4, cooldown: 0, path: p }]
      step(g, { move: { x: 0, y: 0 }, special: false }, TICK)
      return g.attacks.filter((a) => a.move === id)
    }
    expect(count('waterGun', path(0, 0)).length).toBe(2 * count('waterGun', path(1, 0)).length)
    const rings = count('fireSpin', path(0, 0)).map((a) => (a.motion.kind === 'orbit' ? a.motion.radius : 0))
    expect(Math.max(...rings) / Math.min(...rings)).toBeCloseTo(MOD.twin.radius)
  })
})
