// Builds the wild horde roster: a curated list of species from every generation,
// checked against the PMD SpriteCollab tracker (normal and shiny Walk/Idle/Hurt
// must exist) and filled with official names, types and base stats from PokeAPI.
// Writes src/data/roster.generated.json, which src/data/roster.ts turns into enemies.
// Usage: npm run roster && npm run assets
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { BOSSES, STARTERS, pad } from './dex.mjs'

const ROOT = new URL('..', import.meta.url).pathname
const OUT = join(ROOT, 'src/data/roster.generated.json')
const TRACKER = 'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/tracker.json'
const API = 'https://pokeapi.co/api/v2'

/**
 * Hand-picked wild Pokémon, by generation: common route and cave species plus
 * a few middle and final evolutions so every tier has enough faces, Dragon types
 * included. No starters, legendaries, mythicals, bosses or species whose look
 * depends on a form.
 */
const CANDIDATES = [
  // Kanto
  10, 13, 16, 19, 21, 41, 23, 37, 43, 46, 48, 56, 66, 74, 88, 92, 17, 58, 70, 72, 75, 109, 111,
  20, 22, 24, 42, 57, 67, 93, 68, 76, 94, 110, 112, 123, 147, 148,
  // Johto
  163, 165, 167, 194, 179, 204, 193, 216, 228, 231, 195, 198, 200, 207, 215, 227, 214, 217, 229, 232,
  // Hoenn
  261, 263, 276, 278, 285, 302, 304, 331, 262, 277, 286, 335, 336, 297, 306, 310, 332, 329, 330, 334, 371,
  // Sinnoh
  396, 399, 403, 434, 436, 397, 404, 425, 451, 400, 398, 405, 426, 452, 454, 449, 450, 443, 444,
  // Unova
  504, 519, 543, 524, 532, 551, 607, 525, 552, 559, 570, 608, 510, 528, 533, 530, 534, 545, 553, 609, 610, 633,
  // Kalos
  659, 661, 679, 662, 667, 674, 660, 680, 663, 675, 707, 677, 686, 708, 709, 704, 714,
  // Alola
  731, 734, 753, 736, 744, 739, 749, 759, 737, 777, 738, 758, 760, 778, 742, 782,
  // Galar
  821, 827, 859, 819, 833, 854, 822, 860, 828, 823, 834, 851, 855, 835, 850, 861, 885,
  // Paldea
  915, 917, 921, 960, 932, 940, 957, 922, 969, 918, 920, 923, 939, 959, 972, 996,
]

const ANIMS = ['Walk', 'Idle', 'Hurt']

/** Types the game knows (`POKE_TYPES` in src/data/types.ts); species with any other type are left out. */
const GAME_TYPES = new Set(
  (await readFile(join(ROOT, 'src/data/types.ts'), 'utf8')).match(/POKE_TYPES = \[([^\]]*)\]/)[1].match(/[a-z]+/g),
)
const STAT_KEYS = { hp: 'hp', attack: 'attack', defense: 'defense', 'special-attack': 'spAttack', 'special-defense': 'spDefense', speed: 'speed' }

const json = async (url) => {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url).catch((error) => ({ ok: false, status: error.message }))
    if (res.ok) return res.json()
    if (attempt >= 4) throw new Error(`${res.status} ${url}`)
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
  }
}

/** Every anim we draw exists in the normal and the shiny (`0000/0001`) form. */
const brokenSprites = (tracker, dex) => {
  const node = tracker[pad(dex)]
  const shiny = node?.subgroups?.['0000']?.subgroups?.['0001']
  const missing = (n) => ANIMS.filter((a) => !(a in (n?.sprite_files ?? {})))
  const problems = [...missing(node).map((a) => a), ...missing(shiny).map((a) => `shiny ${a}`)]
  return problems.length > 0 ? problems.join(', ') : null
}

/** `Mr. Mime` → `mrMime`, `Flabébé` → `flabebe`, `Jangmo-o` → `jangmoO`. */
const idOf = (name) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['.]/g, '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join('')

const fetchSpecies = async (dex) => {
  const [species, pokemon] = await Promise.all([json(`${API}/pokemon-species/${dex}`), json(`${API}/pokemon/${dex}`)])
  if (species.is_legendary || species.is_mythical) throw new Error(`#${dex} is legendary or mythical`)
  const name = species.names.find((n) => n.language.name === 'en')?.name ?? species.name
  const types = [...pokemon.types].sort((a, b) => a.slot - b.slot).map((t) => t.type.name)
  const unknown = types.filter((t) => !GAME_TYPES.has(t))
  if (unknown.length > 0) {
    console.warn(`#${dex} ${name}: dropped, the game has no ${unknown.join('/')} type`)
    return null
  }
  return {
    dex,
    name,
    types,
    stats: Object.fromEntries(pokemon.stats.map((s) => [STAT_KEYS[s.stat.name], s.base_stat])),
  }
}

const reserved = new Set([...STARTERS, ...BOSSES])
const tracker = await json(TRACKER)
const kept = []
for (const dex of new Set(CANDIDATES)) {
  if (reserved.has(dex)) {
    console.warn(`#${dex}: skipped, already a starter or boss`)
    continue
  }
  const broken = brokenSprites(tracker, dex)
  if (broken) {
    console.warn(`#${dex} ${tracker[pad(dex)]?.name ?? '?'}: dropped, missing ${broken}`)
    continue
  }
  kept.push(dex)
}

const roster = []
for (let i = 0; i < kept.length; i += 8) roster.push(...(await Promise.all(kept.slice(i, i + 8).map(fetchSpecies))))
const found = roster.filter(Boolean).sort((a, b) => a.dex - b.dex)

const ids = found.map((s) => idOf(s.name))
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
if (dupes.length > 0) throw new Error(`Duplicate ids: ${dupes.join(', ')}`)

await writeFile(OUT, JSON.stringify(Object.fromEntries(found.map((s, i) => [ids[i], s])), null, 2) + '\n')
console.log(`Wrote ${found.length} species to ${OUT}`)
