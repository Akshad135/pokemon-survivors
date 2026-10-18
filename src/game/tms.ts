import { retain } from '../engine/math'
import { range } from '../engine/rng'
import { TYPE_COLORS } from '../data/types'
import { BOSS_TMS, LEGENDARY_TMS } from '../data/tms'
import type { RiftLegend } from '../data/rifts'
import { burst, floatText } from './effects'
import { applyOffer, branchOffers, recomputeStats } from './leveling'
import { forkAt, MOVES, type MoveId } from './moves'
import { forgetChoice, needsForget, TM_REFUND, tmCard, tmChoice, tutorPicks, tutorPool, tutorPrice, type TmSource } from './tmRules'
import type { Enemy, Game, Offer, Pickup, TmOffer } from './types'

/**
 * TMs in a run: the discs bosses and rift legendaries leave, the Move Tutor's
 * lessons and the screen they open (`Phase` 'tm'). Picks go through
 * `chooseOffer` like a level-up's, so the replay records them as `offer`
 * events: a TM card, a move to forget, or "pass". The pure rules live in
 * `tmRules.ts`, the screen in `ui/tmPick.ts`.
 */

/** Tutors met (`tutors`), lessons taken from them (`lessons`) and whether the run learned its legendary TM. */
export type TmState = { tutors: number; lessons: number; legendary: boolean }

export const createTmState = (): TmState => ({ tutors: 0, lessons: 0, legendary: false })

/** Puts a TM disc on the ground at (x, y). */
export const dropTm = (g: Game, x: number, y: number, move: MoveId, source: TmSource) => {
  g.pickups.push({ id: g.nextId++, x, y, vx: range(g.rng, -20, 20), vy: range(g.rng, -40, -20), attracted: false, age: 0, kind: 'tm', move, source })
}

/** A defeated wave boss leaves its TM (`BOSS_TMS`). */
export const dropBossTm = (g: Game, e: Enemy) => {
  const table: Partial<Record<Enemy['kind'], MoveId>> = BOSS_TMS
  const move = table[e.kind]
  if (move) dropTm(g, e.x - 10, e.y + 2, move, 'boss')
}

/** A beaten rift legendary offers its legendary TM, until the run has learned one. */
export const dropLegendaryTm = (g: Game, legend: RiftLegend, x: number, y: number) => {
  const move = LEGENDARY_TMS[legend]
  if (move && !g.tm.legendary) dropTm(g, x, y, move, 'legendary')
}

/**
 * Opens the TM screen with `ids` to choose from (and "pass"). False when none
 * of them teaches anything new (all mastered): nothing opens.
 */
export const openTm = (g: Game, ids: readonly MoveId[], source: TmSource, price = 0) => {
  const offers = tmChoice(g.player.moves, ids, source, price)
  if (offers.length === 0) return false
  g.phase = 'tm'
  g.offers = offers
  g.events.push({ kind: 'tm', source })
  return true
}

/** A TM disc touched: its choice opens, or a mastered move's disc turns into ₽. */
export const collectTm = (g: Game, pickup: Extract<Pickup, { kind: 'tm' }>) => {
  if (openTm(g, [pickup.move], pickup.source)) return
  const p = g.player
  const coins = Math.round(TM_REFUND * p.stats.greed)
  g.coins += coins
  floatText(g, p.x, p.y - 30, `₽${coins}`, '#f8d030')
  g.events.push({ kind: 'tmMastered', move: pickup.move, coins })
}

/** A Move Tutor's lesson: two moves of types the player lacks, paid from the run's ₽ after the first. False when it has nothing to teach. */
export const openTutor = (g: Game) => {
  const pool = tutorPool({ starter: g.starter, branch: g.branch, moves: g.player.moves, banished: g.banished })
  return openTm(g, tutorPicks(pool, g.rng), 'tutor', tutorPrice(g.tm.lessons))
}

/** Takes a move out of the loadout, with what it left on the field and on the player (Whirlpool's aura, a guard, a buff). */
export const forgetMove = (g: Game, id: MoveId) => {
  const p = g.player
  retain(p.moves, (m) => m.id !== id)
  retain(g.attacks, (a) => a.move !== id)
  if (p.guard?.move === id) p.guard = null
  if (p.moveBuffs.some((b) => b.move === id)) {
    retain(p.moveBuffs, (b) => b.move !== id)
    recomputeStats(g)
  }
}

/** Learns (or raises) a TM card's move, paying a tutor's lesson, and celebrates. */
const learn = (g: Game, tm: TmOffer, forgot: MoveId | null) => {
  const p = g.player
  const owned = p.moves.find((m) => m.id === tm.id)
  if (owned) owned.level = tm.level
  else p.moves.push({ id: tm.id, level: 1, cooldown: 0.3, path: 0 })
  pay(g, tm)
  celebrate(g, tm, forgot)
}

const pay = (g: Game, tm: TmOffer) => {
  if (tm.source === 'tutor') {
    g.coins -= tm.price
    g.tm.lessons++
  }
  if (tm.source === 'legendary') g.tm.legendary = true
}

const celebrate = (g: Game, tm: TmOffer, forgot: MoveId | null) => {
  const p = g.player
  const color = TYPE_COLORS[MOVES[tm.id].type]
  burst(g, p.x, p.y - 12, { colors: [color, '#ffffff', tm.source === 'legendary' ? '#f8d030' : '#d8e0f0'], count: 44, speed: 140, ttl: 0.8, size: 2, drag: 3 })
  burst(g, p.x, p.y - 12, { colors: ['#ffffff', color], count: 18, speed: 50, ttl: 1, gravity: -60 })
  g.events.push({ kind: 'tmLearned', move: tm.id, level: tm.level, forgot, source: tm.source })
}

/**
 * A pick on the TM screen. Returns true when the screen is done (the run
 * moves on with `advancePhase`), false when it changed to a next step: the
 * moves to forget, or a fork's two branches. A lesson the player can't pay
 * for is ignored (the screen never offers it).
 */
export const pickTm = (g: Game, offer: Offer): boolean => {
  switch (offer.kind) {
    case 'pass':
      return true
    case 'tm': {
      if (offer.price > g.coins) return false
      const owned = g.player.moves.find((m) => m.id === offer.id)
      if (owned && forkAt(offer.id, offer.level)) {
        // The step up is a fork: its two branches stand in for the card, paid now (they have no "pass").
        pay(g, offer)
        g.offers = branchOffers({ kind: 'move', id: offer.id, level: offer.level })
        return false
      }
      if (needsForget(g.player.moves, offer.id)) {
        g.offers = forgetChoice(g.player.moves, offer)
        return false
      }
      learn(g, offer, null)
      return true
    }
    case 'branch': {
      applyOffer(g, offer)
      celebrate(g, { kind: 'tm', id: offer.id, level: offer.level, source: 'boss', price: 0 }, null)
      return true
    }
    case 'forget': {
      if (offer.tm.price > g.coins) return false
      forgetMove(g, offer.id)
      learn(g, offer.tm, offer.id)
      return true
    }
    default:
      return false
  }
}

/** Whether the TM card `id` still teaches the player something (the dev console's check). */
export const teaches = (g: Game, id: MoveId) => tmCard(g.player.moves, id, 'boss') !== null
