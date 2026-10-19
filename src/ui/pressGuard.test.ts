import { describe, expect, it } from 'vitest'
import { pressGuard } from './pressGuard'

describe('pressGuard', () => {
  it('refuses presses until the guard has passed', () => {
    expect(pressGuard(900)(1000)).toBe(true)
    expect(pressGuard(900)(500)).toBe(false)
    expect(pressGuard(0)(0)).toBe(true)
  })

  it('keeps refusing a button that is still being mashed, then takes the press after a pause', () => {
    const takes = pressGuard(900, 300)
    expect([100, 350, 600, 850, 1100].map(takes)).toEqual([false, false, false, false, false])
    expect(takes(1500)).toBe(true)
  })
})
