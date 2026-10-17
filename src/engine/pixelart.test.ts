import { describe, expect, it } from 'vitest'
import { canvasCache, lazy, resetCanvases } from './pixelart'

describe('resetCanvases', () => {
  it('drops cached art so it is drawn again after a GPU reset', () => {
    let builds = 0
    const art = lazy(() => ++builds)
    const cache = canvasCache<string, number>()
    cache.set('chunk', 1)
    expect(art()).toBe(1)
    expect(art()).toBe(1)

    resetCanvases()

    expect(cache.size).toBe(0)
    expect(art()).toBe(2)
  })
})
