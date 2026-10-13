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
const DEX = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, // Kanto starters + evolutions
  152, 153, 154, 155, 156, 157, 158, 159, 160, // Johto
  252, 253, 254, 255, 256, 257, 258, 259, 260, // Hoenn
  387, 388, 389, 390, 391, 392, 393, 394, 395, // Sinnoh
  495, 496, 497, 498, 499, 500, 501, 502, 503, // Unova
  650, 651, 652, 653, 654, 655, 656, 657, 658, // Kalos
  722, 723, 724, 725, 726, 727, 728, 729, 730, // Alola
  810, 811, 812, 813, 814, 815, 816, 817, 818, // Galar
  906, 907, 908, 909, 910, 911, 912, 913, 914, // Paldea
  10, 13, 16, 19, 21, 23, 41, 43, 46, 48, 56, 66, 74, 92, 109, // horde
  95, 143, 150, // bosses
]
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

const fetchSpecies = async (dex) => {
  const dir = join(OUT, String(dex))
  await mkdir(dir, { recursive: true })
  const xml = await fetch(`${SPRITES}/${pad(dex)}/AnimData.xml`).then((r) => r.text())
  const anims = parseAnims(xml)

  const entries = await Promise.all(
    ANIMS.map(async (name) => {
      const anim = resolveAnim(anims, name)
      if (!anim) return null
      const ok = await download(`${SPRITES}/${pad(dex)}/${anim.name}-Anim.png`, join(dir, `${name}.png`))
      if (!ok) return null
      return [name, { frameWidth: anim.frameWidth, frameHeight: anim.frameHeight, durations: anim.durations }]
    }),
  )

  const [portrait, cry] = await Promise.all([
    download(`${PORTRAITS}/${pad(dex)}/Normal.png`, join(dir, 'portrait.png')),
    download(`${CRIES}/${dex}.ogg`, join(dir, 'cry.ogg')),
  ])

  const found = Object.fromEntries(entries.filter(Boolean))
  console.log(`#${dex}: ${Object.keys(found).join(', ')}${portrait ? ' +portrait' : ''}${cry ? ' +cry' : ''}`)
  return [dex, { anims: found, portrait, cry }]
}

const species = []
for (const dex of DEX) species.push(await fetchSpecies(dex))

await mkdir(join(ROOT, 'src/data'), { recursive: true })
await writeFile(MANIFEST, JSON.stringify(Object.fromEntries(species), null, 2) + '\n')
console.log(`Wrote ${MANIFEST}`)
