import { describe, expect, it } from 'vitest'
import { createRng } from './rng'
import { atan2, cos, exp, hypot, log, pow, powInt, sin } from './dmath'

/** Inputs over the ranges the simulation uses: angles, offsets, decay rates. */
const rng = createRng(42)
const samples = (n: number, span: number) => Array.from({ length: n }, () => (rng() * 2 - 1) * span)

describe('dmath', () => {
  it('matches Math.sin and Math.cos', () => {
    for (const x of [...samples(5000, 50), 0, Math.PI, -Math.PI / 2, 1e-9]) {
      expect(Math.abs(sin(x) - Math.sin(x))).toBeLessThan(1e-14)
      expect(Math.abs(cos(x) - Math.cos(x))).toBeLessThan(1e-14)
    }
  })

  it('matches Math.atan2 in every quadrant and on the axes', () => {
    const ys = samples(2000, 400)
    samples(2000, 400).forEach((x, i) => expect(Math.abs(atan2(ys[i]!, x) - Math.atan2(ys[i]!, x))).toBeLessThan(1e-14))
    for (const [y, x] of [[0, 1], [1, 0], [0, -1], [-1, 0], [0, 0], [1, 1], [-1, -1]] as const) expect(atan2(y, x)).toBeCloseTo(Math.atan2(y, x), 14)
  })

  it('matches Math.hypot and Math.exp', () => {
    const ys = samples(2000, 1000)
    samples(2000, 1000).forEach((x, i) => expect(Math.abs(hypot(x, ys[i]!) - Math.hypot(x, ys[i]!)) / (Math.hypot(x, ys[i]!) || 1)).toBeLessThan(1e-15))
    for (const x of samples(2000, 30)) expect(Math.abs(exp(x) - Math.exp(x)) / Math.exp(x)).toBeLessThan(1e-14)
  })

  it('matches Math.log and **', () => {
    for (const x of samples(2000, 1000).map(Math.abs)) {
      expect(Math.abs(log(x) - Math.log(x))).toBeLessThan(1e-13)
      expect(Math.abs(pow(x, 0.7) - x ** 0.7) / x ** 0.7).toBeLessThan(1e-13)
    }
  })

  it('raises to whole powers', () => {
    expect(powInt(2, 10)).toBe(1024)
    expect(powInt(2, -3)).toBe(0.125)
    expect(powInt(1.5, 0)).toBe(1)
  })
})
