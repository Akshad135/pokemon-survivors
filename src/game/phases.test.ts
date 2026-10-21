import { describe, expect, it } from 'vitest'
import { killEnemy } from './combat'
import { spawnEnemy } from './enemies'
import { createGame, step } from './game'
import { spawnMapEvent } from './mapEvents'
import { TICK } from './replay'
import type { Game } from './types'

const STILL = { move: { x: 0, y: 0 }, special: false }

/**
 * A run at 2:00 (cursed items can turn up) with a chest at the player's feet
 * one tick from opening, and a foe on top of a player at 1 HP: the lethal hit
 * and the chest land on the same tick.
 */
const faintOnChest = (seed: number) => {
  const g = createGame('charmander', { w: 480, h: 270 }, seed)
  g.time = 120
  g.nextEvent = 99
  const p = g.player
  const chest = spawnMapEvent(g, 'chest', p.x, p.y)
  chest.state.ambushed = true
  chest.state.progress = 1 - 1e-9
  spawnEnemy(g, 'rattata', p.x, p.y).damage = 9999
  p.hp = 1
  p.iframes = 0
  return g
}

/** Steps a run a few seconds on, as the shell would if it kept calling `step`. */
const runOn = (g: Game, seconds: number) => {
  for (let t = 0; t < seconds; t += TICK) step(g, STILL, TICK)
}

describe('a run that ends on a tick', () => {
  it('stays fainted when a chest opens on the same tick, its cursed item never asked', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const g = faintOnChest(seed)
      step(g, STILL, TICK)
      runOn(g, 2)
      expect(g.phase).toBe('gameover')
      expect(g.events.some((e) => e.kind === 'curse')).toBe(false)
    }
  })

  it('keeps the faint when Mewtwo goes down later on the same tick', () => {
    const g = faintOnChest(1)
    step(g, STILL, TICK)
    expect(g.phase).toBe('gameover')
    killEnemy(g, spawnEnemy(g, 'mewtwo', g.player.x + 40, g.player.y))
    expect(g.phase).toBe('gameover')
    expect(g.events.some((e) => e.kind === 'victory')).toBe(false)
  })
})
