# Pokémon Survivors – agent guide

Browser survivors-like (Vampire Survivors–style) with Pokémon. Vite + TypeScript + Canvas 2D, no engine. Read `README.md` for the architecture map.

## Conventions

- **Functional TypeScript only.** Use plain data (types/records) and functions. No classes or `this`. Never use `any`. Prefer inferred types and `as const satisfies` data tables, and keep content data-driven (`src/data/*`, `MOVES` in `src/game/moves.ts`).
- The simulation mutates plain state for performance (hundreds of entities at 60 Hz), and that's fine. Keep hot loops allocation-light (see `retain`, the spatial grid).
- **Simulation ≠ presentation.** `src/game/*` must not touch the DOM or audio. Notify the shell by pushing a `GameEvent`; `main.ts` handles sounds, cries and toasts.
- **Pixel-perfect rendering.** The world is drawn at low internal resolution and integer-upscaled. Snap draw positions to whole pixels and use the hard-edged helpers in `engine/pixelart.ts`. New effect art is code-authored pixel strings (`render/art.ts`).
- **Two languages: pt-BR and English.** Every player-facing string lives in `src/i18n` (`pt.ts` is the reference; `en.ts` must match it key for key, and the type checker enforces it, down to one line per move upgrade). Read text with `t()` at render time, never at module load. Pokémon, move and item names stay in English (official names) and live in the data files.
- **Comments:** short doc comments above non-obvious functions. Don't comment every line, and keep comments in sync with the code.
- **Tests:** focused vitest tests for pure rules only (`*.test.ts`). No smoke or snapshot slop.
- **SEO/GEO copy** lives in static HTML so crawlers and AI chats can read it without JS: `index.html` (pt-BR, `/`), `en/index.html` (English, `/en/`) and `public/llms.txt`. When a feature changes what the game is (starters, bosses, counts), update all three.
- **Site pages** (`/pokedex/`, `/guia/`, `/novidades/`, `/legal/` and their `/en/` twins) are rendered at build time from `src/site` (wired in `vite.config.ts`) and read `src/data/*`, so the Pokédex and the guide's tables follow the data on their own. Their copy lives in `src/i18n/site` (`pt.ts` is the reference). Routes live in `src/site/routes.ts`, which also generates `sitemap.xml`. Add a `src/site/changelog.ts` entry when a player-facing change ships. `src/site/client.ts` must never import game code, so the game and the site never load each other's bundles.
- **Mobile matters:** many players will be on phones. Every UI must work with touch and on small portrait and landscape screens.

## Commands

```bash
npm run dev        # vite dev server
npm test           # vitest
npm run build      # tsc --noEmit + vite build (must pass before any PR)
npm run roster     # rebuild the wild horde (curated list in scripts/roster.mjs) from PokeAPI + SpriteCollab
npm run assets     # fetch sprites (add new dex numbers in scripts/dex.mjs; the horde comes from the roster)
npm run credits    # regenerate CREDITS.md (SpriteCollab artists) after adding species
```

In dev builds, the browser console exposes `ps.run()` (current run state), `ps.startRun('squirtle')`, `ps.theme()` (music theme playing), `ps.biome('cave')` and `ps.weather('rain')` (both hold until the next scheduled change), `ps.spawn('chansey', 3)` (enemies in an arc ahead of you; a third `true` makes them shiny), `ps.dex()` (the saved Pokédex) and `ps.event(kind, dx?, dy?)`, which places a map event (`altar`, `fountain`, `chest`, `spikes`, `bomb`, `meowth`) `dx`, `dy` px from the player (default 70 px to the right) and returns it, so you can tweak its `state`. Handy for staging screenshots: set `ps.run().game.hitstop = 9999` to freeze the simulation while it keeps rendering. For rifts and the endless mode: `ps.rift('kyogre')` steps into an arena (random legendary without an argument), `ps.portal()` opens a portal next to the player, `ps.victory()` shows the victory screen with the endless offer, `ps.endless(19.5)` jumps into endless mode at that minute and `ps.reaper()` calls Arceus now. For eggs: `ps.egg('rare')` puts one in the incubator, `ps.walk(500)` walks the incubating eggs (all the way without an argument), `ps.hatch()` hatches every ready egg, `ps.hatch('gible', true, 2.8)` plays the hatching scene for a family (shiny, held at 2.8 s for screenshots), `ps.unlock()` unlocks every family and `ps.incubator()` opens the incubator.

## Assets

Pokémon sprites come from PMD SpriteCollab (`sprite/<dex>/` has Walk/Idle/Hurt; shiny forms live under `sprite/<dex>/0000/0001/`). Portraits also come from SpriteCollab and cries from PokeAPI. They are downloaded by `scripts/fetch-assets.mjs` into `public/assets/pokemon/<dex>/` and indexed in `src/data/sprites.generated.json`. SpriteCollab is CC BY-NC 4.0 with per-artist credit, so keep `CREDITS.md` in sync (`npm run credits`).
