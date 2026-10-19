import { describe, expect, it } from 'vitest'
import { chooseOffer, createGame } from './game'
import { dropXp, pokeballAsks, updatePickups } from './pickups'
import * as dm from '../engine/dmath'

const DT = 1 / 60

describe('magnet', () => {
  it('reels in a candy flying sideways past the player instead of letting it orbit', () => {
    const g = createGame('charmander', { w: 480, h: 270 }, 1)
    g.pickups.length = 0
    dropXp(g, g.player.x + 25, g.player.y - 6, 1)
    const candy = g.pickups[0]!
    candy.attracted = true
    candy.vx = 0
    candy.vy = 400
    for (let i = 0; i < 60 && g.pickups.length; i++) updatePickups(g, DT)
    expect(g.pickups).toHaveLength(0)
  })

  it('catches the player while they run in circles', () => {
    const g = createGame('charmander', { w: 480, h: 270 }, 1)
    g.pickups.length = 0
    g.player.stats.magnet = 80
    const cx = g.player.x
    const cy = g.player.y
    dropXp(g, cx + 140, cy, 1)
    for (let i = 0; i < 180 && g.pickups.length; i++) {
      const a = i * DT * 3
      g.player.x = cx + dm.cos(a) * 60
      g.player.y = cy + dm.sin(a) * 60
      updatePickups(g, DT)
    }
    expect(g.pickups).toHaveLength(0)
  })
})

describe('Poké Ball prizes', () => {
  const owned = { moves: [{ id: 'ember', level: 2, cooldown: 0, path: 0 }], items: [{ id: 'charcoal', level: 1 }] } as const

  it('ask before a new move or item takes a slot, and upgrade what the player has on their own', () => {
    expect(pokeballAsks({ kind: 'move', id: 'fireSpin', level: 1 }, owned)).toBe(true)
    expect(pokeballAsks({ kind: 'item', id: 'muscleBand', level: 1 }, owned)).toBe(true)
    expect(pokeballAsks({ kind: 'move', id: 'ember', level: 3 }, owned)).toBe(false)
    expect(pokeballAsks({ kind: 'item', id: 'charcoal', level: 2 }, owned)).toBe(false)
    expect(pokeballAsks({ kind: 'evolution', from: 'ember', to: 'flamethrower' }, owned)).toBe(false)
    expect(pokeballAsks({ kind: 'berry' }, owned)).toBe(false)
  })

  it('leave a new item behind on a pass, or put it in on a take', () => {
    const g = createGame('charmander', { w: 400, h: 240 }, 3)
    const ball = () => {
      g.phase = 'pokeball'
      g.offers = [{ kind: 'item', id: 'muscleBand', level: 1 }, { kind: 'pass' }]
    }
    ball()
    chooseOffer(g, g.offers[1]!)
    expect(g.phase).toBe('playing')
    expect(g.player.items).toEqual([])
    ball()
    chooseOffer(g, g.offers[0]!)
    expect(g.player.items).toEqual([{ id: 'muscleBand', level: 1 }])
  })
})
