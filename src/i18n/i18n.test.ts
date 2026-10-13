import { describe, expect, it } from 'vitest'
import { detectLocale, nextLocale } from '.'

describe('detectLocale', () => {
  it('keeps a saved choice over the browser language', () => {
    expect(detectLocale('en', ['pt-BR'])).toBe('en')
  })

  it('picks the first supported browser language, any region', () => {
    expect(detectLocale(null, ['pt-PT', 'en-US'])).toBe('pt')
    expect(detectLocale(null, ['fr-FR', 'en-GB', 'pt-BR'])).toBe('en')
  })

  it('falls back to English for unknown saves and languages', () => {
    expect(detectLocale('klingon', ['ja-JP'])).toBe('en')
  })
})

describe('nextLocale', () => {
  it('cycles through every language', () => {
    expect(nextLocale(nextLocale('pt'))).toBe('pt')
    expect(nextLocale('pt')).toBe('en')
  })
})
