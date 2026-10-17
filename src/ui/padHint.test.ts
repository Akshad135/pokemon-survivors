import { describe, expect, it } from 'vitest'
import { padHint } from './padHint'

describe('padHint', () => {
  it('turns Enter and Esc into the pad buttons and drops the keyboard-only shortcuts', () => {
    expect(padHint('↑ ↓ jogador · ← → período · Q E dificuldade · F amigos · ENTER perfil · ESC voltar', 'A', 'B')).toBe(
      '↑ ↓ jogador · ← → período · A perfil · B voltar',
    )
    expect(padHint('↑ ↓ choose · ENTER confirm · 1-3 shortcut', '✕', '○')).toBe('↑ ↓ choose · ✕ confirm')
  })

  it('leaves out an unbound button', () => {
    expect(padHint('TAB next field · ENTER save · ESC back', null, 'B')).toBe('B back')
  })
})
