/** Keyboard-only parts of a hint: a letter or digit shortcut, a digit range (1-3), Tab. */
const KEYBOARD_ONLY = /^(?:[A-Z0-9]|\d-\d|TAB)$/

/**
 * A keyboard hint as a gamepad plays it: "↑ ↓ choose · ENTER confirm · Q E tab
 * · ESC back" becomes "↑ ↓ choose · A confirm · B back". Every hint is made of
 * "KEYS label" parts joined by " · "; Enter and Esc become the pad's `confirm`
 * and `back` buttons (null: unbound) and the parts a pad can't press drop out.
 */
export const padHint = (keys: string, confirm: string | null, back: string | null) =>
  keys
    .split(' · ')
    .flatMap((part) => {
      const [key = '', ...label] = part.split(' ')
      if (KEYBOARD_ONLY.test(key)) return []
      const button = key === 'ENTER' ? confirm : key === 'ESC' ? back : key
      return button === null ? [] : [[button, ...label].join(' ')]
    })
    .join(' · ')
