import { describe, expect, it } from 'vitest'
import { createGame } from './game'
import { dropXp, updatePickups } from './pickups'
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
