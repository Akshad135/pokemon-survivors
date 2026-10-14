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
for (const [dex, entry] of Object.entries(manifest)) {
  const walk = entry.anims.Walk
  entry.body = await measureBody(join(OUT, dex, 'Walk.png'), walk.frameWidth, walk.frameHeight)
  if (entry.shiny?.anims.Walk) {
    const sw = entry.shiny.anims.Walk
    entry.shiny.body = await measureBody(join(OUT, dex, 'shiny', 'Walk.png'), sw.frameWidth, sw.frameHeight)
  }
}
await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')
console.log(`Measured ${Object.keys(manifest).length} species into ${MANIFEST}`)
