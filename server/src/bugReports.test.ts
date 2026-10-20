import { describe, expect, it } from 'vitest'
import { parseBugReport } from '../../src/game/bugReport'
import { bugThread, deviceHint, rateLimiter } from './bugReports'

describe('rateLimiter', () => {
  it('lets `limit` hits per key through in a window, then again once it slides', () => {
    const limiter = rateLimiter(2, 1000)
    expect(limiter.take(['ip:a'], 0)).toBe(true)
    expect(limiter.take(['ip:a'], 500)).toBe(true)
    expect(limiter.take(['ip:a'], 900)).toBe(false)
    expect(limiter.take(['ip:b'], 900)).toBe(true)
    expect(limiter.take(['ip:a'], 1000)).toBe(true)
  })

  it('counts a hit on every key or none: a full account blocks a fresh IP, and that try costs the IP nothing', () => {
    const limiter = rateLimiter(1, 1000)
    expect(limiter.take(['ip:a', 'user:1'], 0)).toBe(true)
    expect(limiter.take(['ip:b', 'user:1'], 10)).toBe(false)
    expect(limiter.take(['ip:b'], 20)).toBe(true)
  })
})

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; 23049PCD8G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36'

describe('deviceHint', () => {
  it('names the system and the browser', () => {
    expect(deviceHint(ANDROID)).toBe('Android · Chrome')
    expect(deviceHint('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1')).toBe('iPhone · Safari')
    expect(deviceHint('')).toBe('unknown device')
  })
})

describe('bugThread', () => {
  const report = (text: string, tech: unknown = { userAgent: ANDROID }) => parseBugReport({ text, tech })!

  it('titles the thread by the first line and the device, and tags it', () => {
    const t = bugThread(report('Closes by itself\nevery run, around minute 7', { userAgent: ANDROID, crash: { at: 'x' } }), 'a guest')
    expect(t.name).toBe('💥 Closes by itself · Android · Chrome')
    expect(t.tags).toEqual(['Open', 'Mobile', 'Crash'])
    expect(t.messages[0]).toContain('> every run, around minute 7')
  })

  it('keeps every message under Discord’s limit and code blocks closed, whatever the player typed', () => {
    const text = `@everyone \`\`\` ${'long words\n'.repeat(85)}`
    const t = bugThread(report(text, { userAgent: ANDROID, errors: [{ message: '```'.repeat(200), stack: 'at x\n'.repeat(400) }] }), '@ash')
    for (const m of t.messages) {
      expect(m.length).toBeLessThanOrEqual(2000)
      expect((m.match(/```/g) ?? []).length % 2).toBe(0)
    }
    expect(t.messages).toHaveLength(2)
    expect(t.name.length).toBeLessThanOrEqual(100)
  })

  it('says when the report came without technical info', () => {
    const t = bugThread(report('Something broke', null), 'a guest')
    expect(t.tags).toEqual(['Open'])
    expect(t.messages).toEqual([expect.stringContaining('without technical info')])
  })
})
