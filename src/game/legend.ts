import { ABILITIES, type AbilityEffect, type AbilityId } from '../data/abilities'
import { bodyOf } from '../data/bodies'
import { BIOMES } from '../data/biomes'
import type { EnemyId } from '../data/enemies'
import type { PlayableId } from '../data/hatchlings'
import { AWAKEN_AT, isLegend, LEGENDS, type Innate, type LegendDef, type LegendForm, type LegendId } from '../data/legends'
import type { EvolutionStage } from '../data/starters'
import { EVENTS, MYTHICALS, TRIO_IDS, TRIOS, type WaveEvent } from '../data/waves'
import { DIFFICULTIES, type Difficulty, type DifficultyMods } from './difficulty'
import { withTrio, type Roster } from './roster'
import { burst } from './effects'
import type { StatDelta } from './stats'
import type { Enemy, Game } from './types'

/**
 * The Legend mode in a run (`data/legends.ts`): a run that starts with a
 * legend plays it. The legend awakens instead of evolving, carries its innate
 * from Lv 1, and the horde presses harder (`PRESSURE`). It never meets itself:
 * the trio, the finale's mythical and the rifts skip it, and a Mewtwo meets
 * its Clone at the end.
 */

/** A Legend-mode run's own state; `Game.legend` is null in every other run. */
export type LegendState = {
  id: LegendId
  /** Awakenings so far (0, 1 or 2). */
  awakened: number
  /** `Player.walked` at the last heavy step. */
  stride: number
  /** The type Arceus took from the biome last (Multitype), so the stats follow a change. */
  multitype: string | null
}

export const createLegendState = (starter: PlayableId): LegendState | null =>
  isLegend(starter) ? { id: starter, awakened: 0, stride: 0, multitype: null } : null

/* ---------------- Awakenings ---------------- */

/** The awakening the player's level has reached and not had yet (1 or 2), or 0. */
export const pendingAwakening = (g: Game) => {
  const s = g.legend
  if (!s || s.awakened >= AWAKEN_AT.length) return 0
  return g.player.level >= AWAKEN_AT[s.awakened]! ? s.awakened + 1 : 0
}

/** Stats a legend has after `awakened` awakenings, on top of its own (`LegendDef.stats`). */
export const awakeningDeltas = (id: LegendId, awakened: number): readonly StatDelta[] => {
  const def: LegendDef = LEGENDS[id]
  return def.awakenings.slice(0, awakened)
}

/** The form a legend wears after `awakened` awakenings: the second one's, where it has one. */
export const formAfter = (id: LegendId, awakened: number): LegendDef['form'] | null => {
  const def: LegendDef = LEGENDS[id]
  return awakened >= 2 ? (def.form ?? null) : null
}

/** The sprite form the player wears now: the awakened form, else Deoxys's forme (its stance). */
export const legendLook = (g: Game): LegendForm | undefined => {
  const s = g.legend
  if (!s) return undefined
  const form = formAfter(s.id, s.awakened)
  if (form) return form.key
  const stance = g.special.stance
  return stance === 'attack' || stance === 'defense' || stance === 'speed' ? stance : undefined
}

/** Arceus's Multitype: the type of the biome it stands in (its first affinity). */
const multitypeOf = (g: Game) => BIOMES[g.biome.id].affinity[0] ?? 'normal'

const stages = new Map<string, EvolutionStage>()

/**
 * The stage a legend is in: its single stage, under its form's name and types
 * once the second awakening lands it, and Arceus's typing follows the biome.
 * Cached, since `playerForm` asks every tick.
 */
export const legendStage = (g: Game, s: LegendState): EvolutionStage => {
  const def: LegendDef = LEGENDS[s.id]
  const form = formAfter(s.id, s.awakened)
  const multi = def.innate.ability === 'multitype' ? multitypeOf(g) : null
  const key = `${s.id}|${form?.key ?? ''}|${multi ?? ''}`
  let stage = stages.get(key)
  if (!stage) {
    const own = def.line[0]
    stage = { ...own, name: form?.name ?? own.name, types: multi ? [multi] : (form?.types ?? own.types) }
    stages.set(key, stage)
  }
  return stage
}

/* ---------------- Innate ---------------- */

const NO_EFFECTS: readonly AbilityEffect[] = []
const innates = new Map<LegendId, readonly AbilityEffect[]>()

/** The innate's ability (null outside the Legend mode). */
export const innateAbility = (starter: PlayableId): AbilityId | null => (isLegend(starter) ? LEGENDS[starter].innate.ability : null)

/** What the innate does: its ability's effects plus the Legend mode's extra. */
export const innateEffects = (starter: PlayableId): readonly AbilityEffect[] => {
  if (!isLegend(starter)) return NO_EFFECTS
  let effects = innates.get(starter)
  if (!effects) {
    const innate: Innate = LEGENDS[starter].innate
    effects = [...ABILITIES[innate.ability].effects, ...(innate.extra ?? [])]
    innates.set(starter, effects)
  }
  return effects
}

/* ---------------- Pressure ---------------- */

/**
 * Pressure, the Legend mode's own difficulty: multipliers on top of each
 * level's (`DIFFICULTIES`), and on top of the pressure director (`tension.ts`),
 * which already leans on a build that wins too easily. A legend hits harder
 * than a starter, so the horde comes a bit thicker and tougher. Measured with a
 * headless bot (kiting, greedy picks, max ranks): a legend wins Normal 17/18
 * (starters 10/12) and Hard 8/16 (5/11), Nightmare stays at 5/19 (3/12), and
 * standing still dies by about 7:00 on every level, like a starter. Heavier
 * Pressure (×1.3 spawns) left legends behind the starters.
 */
export const PRESSURE = {
  normal: { spawnRate: 1.1, enemyHp: 1.05, enemyDamage: 1.05 },
  hard: { spawnRate: 1.15, enemyHp: 1.1, enemyDamage: 1.1 },
  nightmare: { spawnRate: 1.15, enemyHp: 1.1, enemyDamage: 1.15, enemySpeed: 1.03 },
} as const satisfies Record<Difficulty, Partial<DifficultyMods>>

const pressed = new Map<Difficulty, DifficultyMods>()

/** A difficulty's multipliers with the Legend mode's Pressure stacked on top. */
export const legendMods = (difficulty: Difficulty): DifficultyMods => {
  let mods = pressed.get(difficulty)
  if (!mods) {
    const base: DifficultyMods = DIFFICULTIES[difficulty]
    const extra: Partial<DifficultyMods> = PRESSURE[difficulty]
    mods = { ...base }
    for (const k of Object.keys(extra) as (keyof DifficultyMods)[]) mods[k] = base[k] * (extra[k] ?? 1)
    pressed.set(difficulty, mods)
  }
  return mods
}

/** The multipliers this run plays with: its difficulty's, pressed harder in the Legend mode. */
export const runMods = (g: Game): DifficultyMods => (g.legend ? legendMods(g.difficulty) : DIFFICULTIES[g.difficulty])

/* ---------------- Never facing yourself ---------------- */

/**
 * The roster with the player's own legend taken out of its bosses: a trio it
 * belongs to gives way to the next trio, a mythical to the next mythical.
 * Swapped in data order, without a draw, so the rest of the run is the same.
 */
export const avoidLegend = (roster: Roster, legend: PlayableId, events: readonly WaveEvent[] = EVENTS): Roster => {
  if (!isLegend(legend)) return roster
  const mine = (ids: readonly EnemyId[]) => ids.some((id) => id === legend)
  const trio = mine(TRIOS[roster.trio]) ? (TRIO_IDS.find((id) => !mine(TRIOS[id])) ?? roster.trio) : roster.trio
  const swapped = trio === roster.trio ? roster : withTrio(roster, trio, events)
  const next = MYTHICALS[(MYTHICALS.findIndex((id) => id === legend) + 1) % MYTHICALS.length]!
  return {
    ...swapped,
    events: swapped.events.map((id, i) => {
      const e = events[i]
      return id === legend && e?.kind === 'boss' && 'mythical' in e ? next : id
    }),
  }
}

/** A boss of the player's own species (Mewtwo's finale for a Mewtwo, Arceus's reaper for an Arceus): its dark Clone. */
export const isClone = (g: Game, e: Enemy) => g.legend !== null && e.boss && e.kind === g.legend.id

/* ---------------- Presence ---------------- */

/** World px between a legend's heavy steps, and the body width from which a step shakes the screen. */
export const STEP = { every: 22, heavy: 40 } as const

/**
 * Per tick: every `STEP.every` px walked a legend's step raises dust (and a
 * small tremor under the big ones), and Arceus's type follows the biome. True
 * when the stats need rebuilding (Multitype changed type).
 */
export const updateLegend = (g: Game) => {
  const s = g.legend
  if (!s) return false
  const p = g.player
  if (p.walked - s.stride >= STEP.every) {
    s.stride = p.walked
    burst(g, p.x, p.y, { colors: ['#c8b898', '#a89878', '#e8e0c8'], count: 5, speed: 30, ttl: 0.35, gravity: 30 })
    if (bodyOf(LEGENDS[s.id].line[0].dex).bodyW >= STEP.heavy) g.shake = Math.max(g.shake, 0.6)
  }
  if (LEGENDS[s.id].innate.ability !== 'multitype') return false
  const type = multitypeOf(g)
  if (type === s.multitype) return false
  s.multitype = type
  return true
}

/** An awakening's landing: the share of max HP it heals and the push its aura burst gives the horde. */
export const AWAKENING = { heal: 0.5, push: 900 } as const
