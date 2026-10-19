import { describe, expect, it } from 'vitest'
import { maxUiZoom, uiZoomFor } from './uiScale'

describe('uiZoomFor', () => {
  it('keeps phones and small windows at 100% whatever the choice', () => {
    expect(uiZoomFor(2, 390, 844, 2)).toBe(1)
    expect(uiZoomFor(1.5, 844, 390, 2)).toBe(1)
    expect(uiZoomFor('auto', 1280, 720, 2)).toBe(1)
  })

  it('grows auto with the world scale past 1080p, in steps', () => {
    expect(uiZoomFor('auto', 1920, 950, 3)).toBe(1)
    expect(uiZoomFor('auto', 2560, 1300, 4)).toBe(1.25)
    expect(uiZoomFor('auto', 2560, 1440, 5)).toBe(1.5)
    expect(uiZoomFor('auto', 3840, 2000, 7)).toBe(2)
  })

  it('clamps a chosen size to the room the viewport has', () => {
    expect(uiZoomFor(2, 2560, 1440, 5)).toBe(2)
    expect(uiZoomFor(2, 1920, 950, 3)).toBe(1.25)
    expect(maxUiZoom(1920, 1080)).toBe(1.5)
  })
})
