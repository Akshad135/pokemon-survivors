import manifest from '../data/sprites.generated.json'
import { ENEMIES, type EnemyId } from '../data/enemies'
import { REGIONS, STARTER_IDS, STARTERS, type Region, type StarterId } from '../data/starters'
import type { PokeType } from '../data/types'
import { EVENTS, RUN_LENGTH, STAGES } from '../data/waves'
import { MEOWTH_DEX } from '../game/mapEventRules'

/**
 * The site's Pokédex model: every species the game uses, derived from
 * `data/*` (never written by hand), so a new starter or boss shows up here on
 * the next build.
 */

export const ROLES = ['starter', 'enemy', 'boss', 'legendary', 'event'] as const

export type Role = (typeof ROLES)[number]

export type Sheet = { frameWidth: number; frameHeight: number; durations: readonly number[] }

type ManifestAnims = { Idle?: Sheet; Walk?: Sheet }
type ManifestEntry = { anims: ManifestAnims; portrait?: boolean; shiny?: { anims: ManifestAnims; portrait: boolean } }

const MANIFEST: Record<string, ManifestEntry> = manifest

export type SpriteSet = { idle: Sheet; walk: Sheet }

export type Sprites = { normal: SpriteSet; shiny: SpriteSet | null; portrait: boolean; shinyPortrait: boolean }

export type DexEntry = {
  /** Anchor id, e.g. `charizard`. */
  slug: string
  dex: number
  name: string
  types: readonly PokeType[]
  role: Role
  region: Region
  sprites: Sprites
  /** `event`: met at a map event (the fleeing Meowth), not in the horde. */
  source: { kind: 'starter'; id: StarterId; stage: number } | { kind: 'wild'; id: EnemyId } | { kind: 'event' }
}

/** Last national dex number of each generation, in `REGIONS` order. */
const LAST_DEX = [151, 251, 386, 493, 649, 721, 809, 905, 1025] as const

/** Main-series region a species debuted in, from its national dex number. */
export const regionOf = (dex: number): Region => REGIONS.find((r) => dex <= (LAST_DEX[r.gen - 1] ?? Infinity)) ?? REGIONS[REGIONS.length - 1]!

export const slugOf = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const spriteSet = (anims: ManifestAnims | undefined): SpriteSet | null =>
  anims?.Idle && anims.Walk ? { idle: anims.Idle, walk: anims.Walk } : null

/** Sprite sheets of a species; every species the game loads ships Idle and Walk (see `scripts/fetch-assets.mjs`). */
export const spritesOf = (dex: number): Sprites => {
  const entry = MANIFEST[String(dex)]
  const normal = spriteSet(entry?.anims)
  if (!entry || !normal) throw new Error(`No Idle/Walk sprites for dex ${dex}`)
  return {
    normal,
    shiny: spriteSet(entry.shiny?.anims),
    portrait: entry.portrait === true,
    shinyPortrait: entry.shiny?.portrait === true,
  }
}

const base = (dex: number, name: string, types: readonly PokeType[]) => ({
  slug: slugOf(name),
  dex,
  name,
  types,
  region: regionOf(dex),
  sprites: spritesOf(dex),
})

const starterEntries = (id: StarterId): DexEntry[] =>
  STARTERS[id].line.map((stage, i) => ({
    ...base(stage.dex, stage.name, stage.types),
    role: 'starter',
    source: { kind: 'starter', id, stage: i },
  }))

const wildEntry = (id: EnemyId): DexEntry => {
  const e = ENEMIES[id]
  const role: Role = 'legendary' in e ? 'legendary' : 'boss' in e ? 'boss' : 'enemy'
  return { ...base(e.dex, e.name, e.types), role, source: { kind: 'wild', id } }
}

const eventEntry = (): DexEntry => ({ ...base(MEOWTH_DEX, 'Meowth', ['normal']), role: 'event', source: { kind: 'event' } })

/** Every Pokémon in the game, in national dex order. */
export const pokedex = (): DexEntry[] =>
  [...STARTER_IDS.flatMap(starterEntries), ...(Object.keys(ENEMIES) as EnemyId[]).map(wildEntry), eventEntry()].sort((a, b) => a.dex - b.dex)

/* ---------------- When a wild Pokémon shows up ---------------- */

export type Appearance =
  /** Part of the regular spawn pool between two run times (seconds). */
  | { kind: 'horde'; from: number; until: number }
  | { kind: 'swarm' | 'ring'; at: number; count: number }
  /** `chance` is 1 for bosses that always come. */
  | { kind: 'boss'; at: number; chance: number }

/** Spawn-pool windows (contiguous stages merged) plus every timed event of an enemy. */
export const appearances = (id: EnemyId): Appearance[] => {
  const windows = STAGES.reduce<Array<{ kind: 'horde'; from: number; until: number }>>((acc, stage, i) => {
    if (!stage.pool.some(([enemy]) => enemy === id)) return acc
    const from = STAGES[i - 1]?.until ?? 0
    const until = Math.min(stage.until, RUN_LENGTH)
    const last = acc[acc.length - 1]
    if (last && last.until === from) last.until = until
    else acc.push({ kind: 'horde', from, until })
    return acc
  }, [])
  const events = EVENTS.filter((e) => e.enemy === id).map((e): Appearance =>
    e.kind === 'boss' ? { kind: 'boss', at: e.at, chance: e.chance ?? 1 } : { kind: e.kind, at: e.at, count: e.count },
  )
  return [...windows, ...events]
}

/** `m:ss` run clock, as shown on the HUD. */
export const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`
