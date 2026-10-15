// Downloads Pokémon sprites (PMD SpriteCollab), portraits and cries (PokeAPI)
// into public/assets, and writes a typed-friendly manifest to src/data.
// Usage: npm run assets
import { mkdir, writeFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { measureBody } from './body.mjs'
import { DEX, FORM_CRIES, FORMS, SHINY, pad } from './dex.mjs'

const ROOT = new URL('..', import.meta.url).pathname
const OUT = join(ROOT, 'public/assets/pokemon')
const MANIFEST = join(ROOT, 'src/data/sprites.generated.json')

const SPRITES = 'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/sprite'
const PORTRAITS = 'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/portrait'
const CRIES = 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest'
const POKEAPI = 'https://pokeapi.co/api/v2/pokemon'

const ANIMS = ['Walk', 'Idle', 'Hurt']

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
 * Downloads one sprite variant (normal, shiny `/0000/0001` or an alternate form like `/0001`) into `dir`.
 * Returns the anims found plus whether a portrait exists, or null when the variant is missing.
 * Alternate forms skip the portrait (`withPortrait`): menus only show the normal form.
 */
const fetchVariant = async (dex, form, dir, withPortrait = true) => {
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
  const portrait = withPortrait && await download(`${PORTRAITS}/${pad(dex)}${form}/Normal.png`, join(dir, 'portrait.png'))
  const walk = Object.fromEntries(entries.filter(Boolean)).Walk
  // Hitboxes come from this, so they don't wait on the image in the game.
  const body = walk ? await measureBody(join(dir, 'Walk.png'), walk.frameWidth, walk.frameHeight) : undefined
  return { anims: Object.fromEntries(entries.filter(Boolean)), ...(withPortrait && { portrait }), ...(body && { body }) }
}

/** A form's own cry (`FORM_CRIES`), looked up by its PokeAPI name. False when PokeAPI has none. */
const fetchFormCry = async (name, dest) => {
  if (await exists(dest)) return true
  const res = await fetch(`${POKEAPI}/${name}`)
  if (!res.ok) return false
  const url = (await res.json()).cries?.latest
  return Boolean(url) && download(url, dest)
}

/** An alternate form (`FORMS`) and, for species that can roll shiny, its shiny under `<id>/0001`. */
const fetchForm = async (dex, key, id, dir) => {
  const [form, shiny] = await Promise.all([
    fetchVariant(dex, `/${id}`, join(dir, key), false),
    SHINY.has(dex) ? fetchVariant(dex, `/${id}/0001`, join(dir, key, 'shiny'), false) : null,
  ])
  if (!form) throw new Error(`#${dex} form ${key}: missing AnimData.xml`)
  return [key, { ...form, ...(shiny && { shiny }) }]
}

/** The forms of a species with a cry of their own (`FORM_CRIES`), sheets or not: the keys that got one. */
const fetchFormCries = async (dex, dir) => {
  const got = await Promise.all(Object.entries(FORM_CRIES[dex] ?? {}).map(async ([key, name]) => {
    await mkdir(join(dir, key), { recursive: true })
    return (await fetchFormCry(name, join(dir, key, 'cry.ogg'))) && key
  }))
  const keys = got.filter(Boolean)
  return keys.length > 0 ? keys : null
}

const fetchSpecies = async (dex) => {
  const dir = join(OUT, String(dex))
  const [normal, shiny, cry] = await Promise.all([
    fetchVariant(dex, '', dir),
    SHINY.has(dex) ? fetchVariant(dex, '/0000/0001', join(dir, 'shiny')) : null,
    mkdir(dir, { recursive: true }).then(() => download(`${CRIES}/${dex}.ogg`, join(dir, 'cry.ogg'))),
  ])
  if (!normal) throw new Error(`#${dex}: missing AnimData.xml`)
  const forms = FORMS[dex] && Object.fromEntries(await Promise.all(Object.entries(FORMS[dex]).map(([key, id]) => fetchForm(dex, key, id, dir))))
  const formCries = await fetchFormCries(dex, dir)

  const tags = [
    normal.portrait && '+portrait',
    cry && '+cry',
    shiny && `+shiny(${Object.keys(shiny.anims).join(', ')})`,
    forms && `+forms(${Object.keys(forms).join(', ')})`,
    formCries && `+cries(${formCries.join(', ')})`,
  ]
  console.log(`#${dex}: ${Object.keys(normal.anims).join(', ')} ${tags.filter(Boolean).join(' ')}`)
  return [dex, { ...normal, cry, ...(shiny && { shiny }), ...(forms && { forms }), ...(formCries && { formCries }) }]
}

const species = []
for (const dex of DEX) species.push(await fetchSpecies(dex))

await mkdir(join(ROOT, 'src/data'), { recursive: true })
await writeFile(MANIFEST, JSON.stringify(Object.fromEntries(species), null, 2) + '\n')
console.log(`Wrote ${MANIFEST}`)
