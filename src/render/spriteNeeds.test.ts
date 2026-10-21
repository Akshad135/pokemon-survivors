import { describe, expect, it } from 'vitest'
import { createRng } from '../engine/rng'
import { ENEMIES } from '../data/enemies'
import { EVENTS, STAGES, stageStart } from '../data/waves'
import { drawRoster } from '../game/roster'
import { castNeeds, dueNeeds } from './spriteNeeds'

const roster = drawRoster(createRng(42))
const needs = castNeeds(roster)
const poolDex = (stage: number) => roster.stages[stage]!.map(([id]) => ENEMIES[id].dex)

describe('dueNeeds', () => {
  it('holds the stage playing and the next one, not the rest of the run', () => {
    const due = dueNeeds(needs, 0)
    for (const dex of [...poolDex(0), ...poolDex(1)]) expect(due).toContain(dex)
    for (const dex of due) expect(needs.some((n) => n.dex === dex && n.from <= STAGES[1]!.until)).toBe(true)
    expect(due.length).toBeLessThan(new Set(needs.map((n) => n.dex)).size / 2)
  })

  it("lets a past stage's horde go and brings a boss a stage early", () => {
    const at = stageStart(4)
    const due = dueNeeds(needs, at)
    const past = [...new Set(needs.map((n) => n.dex))].filter((dex) => needs.every((n) => n.dex !== dex || n.until <= at))
    expect(past.length).toBeGreaterThan(0)
    for (const dex of past) expect(due).not.toContain(dex)
    const boss = EVENTS.findIndex((e) => e.kind === 'boss' && e.at >= STAGES[4]!.until && e.at < STAGES[5]!.until)
    const id = roster.events[boss]
    expect(id && due.includes(ENEMIES[id].dex)).toBe(true)
  })

  it('lists the soonest first, each species once', () => {
    const due = dueNeeds(needs, 0)
    expect(new Set(due).size).toBe(due.length)
    const opening = [...new Set(poolDex(0))]
    expect(due.slice(0, opening.length).sort()).toEqual(opening.sort())
  })
})
