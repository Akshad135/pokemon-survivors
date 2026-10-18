import { describe, expect, it } from 'vitest'
import { createRng } from '../engine/rng'
import { BRANCH_IDS, BRANCHES, branchesAt, branchesOf } from '../data/branches'
import manifest from '../data/sprites.generated.json'
import { drawBranches, formAt } from './branch'
import { runLearnset } from './learnsets'
import { advancePhase, chooseOffer } from './game'
import { NO_RANKS } from './meta'
import { resimulate, startGame, type Replay, type ReplayStart } from './replay'
import { resolveSpecial } from './special'

const EEVEE = branchesAt('eevee', 1)

describe('branch data', () => {
  it('has sprites for every branch, and Eevee all eight', () => {
    const sheets: Record<string, unknown> = manifest
    for (const id of BRANCH_IDS) expect(sheets[String(BRANCHES[id].dex)], id).toBeDefined()
    expect(EEVEE).toHaveLength(8)
  })

  it('swaps the form, the special and the learnset from the branch on', () => {
    expect(formAt('eevee', 'vaporeon', 0).name).toBe('Eevee')
    expect(formAt('eevee', 'vaporeon', 1).name).toBe('Vaporeon')
    expect(formAt('ralts', 'gallade', 1).name).toBe('Kirlia')
    expect(formAt('ralts', 'gallade', 2).name).toBe('Gallade')
    expect(resolveSpecial('eevee', 1, null, 'vaporeon').id).toBe('hydroCannon')
    expect(resolveSpecial('ralts', 2, null, 'gallade').id).toBe('closeCombat')
    expect(runLearnset('eevee', 'flareon')).toContain('willOWisp')
    expect(runLearnset('eevee', null)).not.toContain('willOWisp')
  })
})

describe('drawBranches', () => {
  it('draws the same three for the same seed, all different', () => {
    const ctx = { weather: 'clear', biome: 'meadow' } as const
    for (let seed = 1; seed < 40; seed++) {
      const a = drawBranches(createRng(seed), EEVEE, ctx)
      expect(drawBranches(createRng(seed), EEVEE, ctx)).toEqual(a)
      expect(new Set(a.map((o) => o.id)).size).toBe(3)
    }
  })

  it('always offers a branch the weather or the biome favors, flagged', () => {
    const cases = [
      [{ weather: 'rain', biome: 'cave' }, ['vaporeon', 'umbreon']],
      [{ weather: 'sun', biome: 'meadow' }, ['flareon']],
      [{ weather: 'snow', biome: 'snow' }, ['glaceon']],
      [{ weather: 'clear', biome: 'forest' }, ['jolteon', 'espeon', 'sylveon', 'leafeon']],
    ] as const
    for (const [ctx, favored] of cases) {
      for (let seed = 1; seed < 30; seed++) {
        const offers = drawBranches(createRng(seed), EEVEE, ctx)
        const lead = offers.find((o) => o.favor !== null)
        expect(lead && favored.some((id) => id === lead.id), `${ctx.weather}/${ctx.biome} #${seed}`).toBe(true)
      }
    }
  })

  it('offers every branch when there are only two', () => {
    expect(drawBranches(createRng(1), branchesOf('ralts'), { weather: 'fog', biome: 'tower' }).map((o) => o.id)).toEqual(['gardevoir', 'gallade'])
  })
})

describe('replays', () => {
  const start: ReplayStart = { seed: 11, starter: 'eevee', difficulty: 'normal', ranks: NO_RANKS, shiny: false, luckyEgg: false, outbreak: null, lure: false, incense: false, view: { w: 480, h: 270 } }
  /** Eevee at its evolution level, the branch pick open. */
  const staged = () => {
    const g = startGame(start)
    // Past the opening draft first.
    if (g.phase === 'levelup') chooseOffer(g, g.offers[0]!)
    g.player.level = 20
    advancePhase(g)
    return g
  }
  // Pick the second branch at once, wait out the evolution, then pick the Hidden Ability.
  const replay: Replay = { rules: 1, start, moves: [0, 400], events: [[0, 'offer', 1], [330, 'offer', 2]] }

  it('re-simulate the branch and ability picks to the same run', () => {
    const drawn = staged()
    expect(drawn.phase).toBe('branch')
    const branch = drawn.offers[1]
    const a = staged()
    const b = staged()
    // The boards show the branch the replay took, so it comes back with the result.
    expect(resimulate(replay, a).branch).toBe(a.branch)
    resimulate(replay, b)
    expect(a.phase).toBe('playing')
    expect(branch?.kind === 'form' && a.branch).toBe(branch?.kind === 'form' && branch.id)
    expect(a.ability.id).not.toBeNull()
    expect([b.branch, b.ability.id, b.player.stage, b.time]).toEqual([a.branch, a.ability.id, a.player.stage, a.time])
  })
})
