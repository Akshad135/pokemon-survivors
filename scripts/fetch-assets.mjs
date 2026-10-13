// Downloads Pokémon sprites (PMD SpriteCollab), portraits and cries (PokeAPI)
// into public/assets, and writes a typed-friendly manifest to src/data.
// Usage: npm run assets
import { mkdir, writeFile, access } from 'node:fs/promises'
import { join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const OUT = join(ROOT, 'public/assets/pokemon')
const MANIFEST = join(ROOT, 'src/data/sprites.generated.json')

const SPRITES = 'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/sprite'
const PORTRAITS = 'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/portrait'
const CRIES = 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest'

// Keep in sync with src/data/starters.ts and src/data/enemies.ts
const STARTERS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, // Kanto starters + evolutions
  152, 153, 154, 155, 156, 157, 158, 159, 160, // Johto
  252, 253, 254, 255, 256, 257, 258, 259, 260, // Hoenn
  387, 388, 389, 390, 391, 392, 393, 394, 395, // Sinnoh
  495, 496, 497, 498, 499, 500, 501, 502, 503, // Unova
  650, 651, 652, 653, 654, 655, 656, 657, 658, // Kalos
  722, 723, 724, 725, 726, 727, 728, 729, 730, // Alola
  810, 811, 812, 813, 814, 815, 816, 817, 818, // Galar
  906, 907, 908, 909, 910, 911, 912, 913, 914, // Paldea
]
const HORDE = [10, 13, 16, 19, 21, 23, 41, 43, 46, 48, 56, 66, 74, 92, 109]
const BOSSES = [95, 143, 144, 145, 146, 150, 151]
const DEX = [...STARTERS, ...HORDE, ...BOSSES]
/** Species that can roll shiny: the player line and regular enemies. */
const SHINY = new Set([...STARTERS, ...HORDE])
const ANIMS = ['Walk', 'Idle', 'Hurt']

const pad = (n) => String(n).padStart(4, '0')

const exists = (p) => access(p).then(() => true, () => false)

const download = async (url, dest) => {
  if (await exists(dest)) return true
  const res = await fetch(url)
  if (!res.ok) return false
  await writeFile(dest, Buffer.from(await res.arrayBuffer()))
  return true
}

const tag = (xml, name) => xml.match(new RegExp(`<${name}>([^<]*)</${name}>`))?.[1]

const parseAnims = (xml) =>
  Object.fromEntries(
    [...xml.matchAll(/<Anim>([\s\S]*?)<\/Anim>/g)].map(([, body]) => [
      tag(body, 'Name'),
      {
        copyOf: tag(body, 'CopyOf'),
        frameWidth: Number(tag(body, 'FrameWidth')),
        frameHeight: Number(tag(body, 'FrameHeight')),
        durations: [...body.matchAll(/<Duration>(\d+)<\/Duration>/g)].map(([, d]) => Number(d)),
      },
    ]),
  )

const resolveAnim = (anims, name) => {
  const anim = anims[name]
  return anim?.copyOf ? resolveAnim(anims, anim.copyOf) : anim && { name, ...anim }
}

/**
 * Downloads one sprite variant (normal or a form like shiny `0000/0001`) into `dir`.
 * Returns the anims found plus whether a portrait exists, or null when the variant is missing.
 */
const fetchVariant = async (dex, form, dir) => {
  const res = await fetch(`${SPRITES}/${pad(dex)}${form}/AnimData.xml`)
  if (!res.ok) return null
  await mkdir(dir, { recursive: true })
  const anims = parseAnims(await res.text())

  const entries = await Promise.all(
    ANIMS.map(async (name) => {
      const anim = resolveAnim(anims, name)
      if (!anim) return null
      const ok = await download(`${SPRITES}/${pad(dex)}${form}/${anim.name}-Anim.png`, join(dir, `${name}.png`))
      if (!ok) return null
      return [name, { frameWidth: anim.frameWidth, frameHeight: anim.frameHeight, durations: anim.durations }]
    }),
  )
  const portrait = await download(`${PORTRAITS}/${pad(dex)}${form}/Normal.png`, join(dir, 'portrait.png'))
  return { anims: Object.fromEntries(entries.filter(Boolean)), portrait }
}

const fetchSpecies = async (dex) => {
  const dir = join(OUT, String(dex))
  const [normal, shiny, cry] = await Promise.all([
    fetchVariant(dex, '', dir),
    SHINY.has(dex) ? fetchVariant(dex, '/0000/0001', join(dir, 'shiny')) : null,
    mkdir(dir, { recursive: true }).then(() => download(`${CRIES}/${dex}.ogg`, join(dir, 'cry.ogg'))),
  ])
  if (!normal) throw new Error(`#${dex}: missing AnimData.xml`)

  const tags = [normal.portrait && '+portrait', cry && '+cry', shiny && `+shiny(${Object.keys(shiny.anims).join(', ')})`]
  console.log(`#${dex}: ${Object.keys(normal.anims).join(', ')} ${tags.filter(Boolean).join(' ')}`)
  return [dex, { ...normal, cry, ...(shiny && { shiny }) }]
}

const species = []
for (const dex of DEX) species.push(await fetchSpecies(dex))

await mkdir(join(ROOT, 'src/data'), { recursive: true })
await writeFile(MANIFEST, JSON.stringify(Object.fromEntries(species), null, 2) + '\n')
console.log(`Wrote ${MANIFEST}`)
