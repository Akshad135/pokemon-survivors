import { describe, expect, it } from 'vitest'
import { RIFT_LEGENDS } from './rifts'
import { bossWaveAt, fleesFrom } from './waves'

const at = (enemy: Parameters<typeof bossWaveAt>[0]) => bossWaveAt(enemy)!

describe('wave bosses have until the next boss', () => {
  it('an earlier wave boss flees when a later one arrives', () => {
    expect(fleesFrom('onix', at('snorlax'))).toBe(true)
    expect(fleesFrom('articuno', at('moltres'))).toBe(true)
    expect(fleesFrom('moltres', at('mewtwo'))).toBe(true)
  })

  it('bosses of the same wave stay together, and nobody flees from an earlier wave', () => {
    expect(at('mew')).toBe(at('mewtwo'))
    expect(fleesFrom('mew', at('mewtwo'))).toBe(false)
    expect(fleesFrom('mewtwo', at('mew'))).toBe(false)
    expect(fleesFrom('snorlax', at('onix'))).toBe(false)
  })

  it('bosses off the schedule (rift legends, Arceus) never flee', () => {
    for (const enemy of [...RIFT_LEGENDS, 'arceus'] as const) {
      expect(bossWaveAt(enemy)).toBeNull()
      expect(fleesFrom(enemy, at('mewtwo'))).toBe(false)
    }
  })
})
