import { describe, expect, it } from 'vitest'
import { PLAYABLE } from '../data/hatchlings'
import { MEGA, MEGA_LINES, MEGAS, megaOf } from '../data/megas'
import manifest from '../data/sprites.generated.json'
import { createGame, step } from './game'
import { recomputeStats } from './leveling'
import { createMegaState, grantStone, isFinalStage, megaPhase, tickMega } from './mega'
import { resolveSpecial, SPECIALS } from './special'

const DT = 1 / 60
const MANIFEST: Record<string, { anims: unknown; forms?: Record<string, unknown> }> = manifest

describe('mega data', () => {
  it('gives every Mega the sprite form of its final stage and a special of its own', () => {
    for (const line of MEGA_LINES) {
      const def = MEGAS[line]
      const final = PLAYABLE[line].line.at(-1)!
      expect(MANIFEST[String(final.dex)]?.forms?.[def.form], def.name).toBeDefined()
      expect(SPECIALS[def.special].final.damage).toBeGreaterThan(resolveSpecial(line, PLAYABLE[line].line.length - 1).tier.damage)
    }
  })

  it('swaps the special only in Mega form, and only for lines with a Mega', () => {
    expect(resolveSpecial('charmander', 2, true).id).toBe('dragonFlare')
    expect(resolveSpecial('charmander', 2).id).toBe('blastBurn')
    expect(resolveSpecial('squirtle', 2, true).id).toBe('hydroCannon')
    expect(megaOf('squirtle')).toBeNull()
  })
})

describe('mega timers', () => {
  it('waits for the stone, then for the final stage', () => {
    const s = createMegaState()
    expect(megaPhase(s, true)).toBe('none')
    s.stone = true
    expect(megaPhase(s, false)).toBe('locked')
    expect(megaPhase(s, true)).toBe('ready')
    s.intro = 0.5
    expect(megaPhase(s, true)).toBe('active')
  })

  it('lasts its duration, then recharges before it is ready again', () => {
    const s = { ...createMegaState(), stone: true, active: MEGA.duration }
    let end = 0
    for (let t = 0; t < MEGA.duration + 0.5; t += DT) end += Number(tickMega(s, DT) === 'end')
    expect(end).toBe(1)
    expect(megaPhase(s, true)).toBe('charging')
    let ready = 0
    for (let t = 0; t < MEGA.recharge; t += DT) ready += Number(tickMega(s, DT) === 'ready')
    expect(ready).toBe(1)
    expect(megaPhase(s, true)).toBe('ready')
  })

  it('knows a 2-stage line is final one evolution earlier', () => {
    expect(isFinalStage('riolu', 1)).toBe(true)
    expect(isFinalStage('charmander', 1)).toBe(false)
  })
})

describe('mega evolution', () => {
  const ready = () => {
    const g = createGame('charmander', { w: 480, h: 270 }, 1)
    g.player.stage = 2
    recomputeStats(g)
    grantStone(g)
    return g
  }

  it('holds the world through the transformation, then adds the Mega stats until it ends', () => {
    const g = ready()
    const might = g.player.stats.might
    step(g, { move: { x: 0, y: 0 }, special: false, mega: true }, DT)
    const time = g.time
    for (let t = 0; t < MEGA.intro - DT; t += DT) step(g, { move: { x: 0, y: 0 }, special: false }, DT)
    expect(g.time).toBe(time)
    step(g, { move: { x: 0, y: 0 }, special: false }, DT)
    expect(g.mega.active).toBe(MEGA.duration)
    expect(g.player.stats.might).toBeCloseTo(might + MEGAS.charmander.stats.might)
    g.mega.active = DT / 2
    step(g, { move: { x: 0, y: 0 }, special: false }, DT)
    expect(g.player.stats.might).toBeCloseTo(might)
    expect(g.mega.charge).toBe(MEGA.recharge)
  })

  it('only drops a stone for a Mega line', () => {
    const g = createGame('squirtle', { w: 480, h: 270 }, 1)
    grantStone(g)
    expect(g.mega.stone).toBe(false)
  })
})
