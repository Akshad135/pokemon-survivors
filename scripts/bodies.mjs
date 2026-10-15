// Fills `body` (see scripts/body.mjs) for every form in src/data/sprites.generated.json
// from the sprites already in public/, without downloading anything: `npm run bodies`.
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { measureBody } from './body.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MANIFEST = join(ROOT, 'src/data/sprites.generated.json')
const OUT = join(ROOT, 'public/assets/pokemon')

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'))
/** Measures a variant (and its shiny) whose sheets live in `dir`. */
const measure = async (variant, dir) => {
  const walk = variant.anims.Walk
  variant.body = await measureBody(join(dir, 'Walk.png'), walk.frameWidth, walk.frameHeight)
  if (variant.shiny?.anims.Walk) {
    const sw = variant.shiny.anims.Walk
    variant.shiny.body = await measureBody(join(dir, 'shiny', 'Walk.png'), sw.frameWidth, sw.frameHeight)
  }
}

for (const [dex, entry] of Object.entries(manifest)) {
  await measure(entry, join(OUT, dex))
  for (const [key, form] of Object.entries(entry.forms ?? {})) await measure(form, join(OUT, dex, key))
}
await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')
console.log(`Measured ${Object.keys(manifest).length} species into ${MANIFEST}`)
