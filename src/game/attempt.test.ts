import { describe, expect, it } from 'vitest'
import { mergeAttempts, nextIsOfficial, parseAttempt } from './attempt'
import { previousDay } from './day'

const DAY = '2026-10-15'

describe('nextIsOfficial', () => {
  it('is practice once the save or the server knows of a finished attempt', () => {
    expect(nextIsOfficial(DAY, null, null)).toBe(true)
    expect(nextIsOfficial(DAY, { day: previousDay(DAY), time: 300 }, false)).toBe(true)
    expect(nextIsOfficial(DAY, { day: DAY, time: 300 }, null)).toBe(false)
    expect(nextIsOfficial(DAY, null, true)).toBe(false)
  })
})

describe('the save field', () => {
  it('parses a real day and time, else nothing', () => {
    expect(parseAttempt({ day: DAY, time: 312.5 })).toEqual({ day: DAY, time: 312.5 })
    expect(parseAttempt({ day: '2026-02-30', time: 10 })).toBeNull()
    expect(parseAttempt({ day: DAY, time: -1 })).toBeNull()
    expect(parseAttempt(undefined)).toBeNull()
  })

  it('merges to the later day, keeping the base on the same day', () => {
    const older = { day: previousDay(DAY), time: 900 }
    const laptop = { day: DAY, time: 300 }
    const phone = { day: DAY, time: 500 }
    expect(mergeAttempts(older, laptop)).toEqual(laptop)
    expect(mergeAttempts(laptop, older)).toEqual(laptop)
    expect(mergeAttempts(laptop, phone)).toEqual(laptop)
    expect(mergeAttempts(null, phone)).toEqual(phone)
    expect(mergeAttempts(phone, null)).toEqual(phone)
  })
})
