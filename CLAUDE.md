# Pokémon Survivors – agent guide

Browser survivors-like (Vampire Survivors–style) with Pokémon. Vite + TypeScript + Canvas 2D, no engine. Read `README.md` for the architecture map.

## Conventions

- **Functional TypeScript only.** Use plain data (types/records) and functions. No classes or `this`. Never use `any`. Prefer inferred types and `as const satisfies` data tables, and keep content data-driven (`src/data/*`, `MOVES` in `src/game/moves.ts`).
- The simulation mutates plain state for performance (hundreds of entities at 60 Hz), and that's fine. Keep hot loops allocation-light (see `retain`, the spatial grid).
- **Simulation ≠ presentation.** `src/game/*` must not touch the DOM or audio. Notify the shell by pushing a `GameEvent`; `main.ts` handles sounds, cries and toasts.
- **Pixel-perfect rendering.** The world is drawn at low internal resolution and integer-upscaled. Snap draw positions to whole pixels and use the hard-edged helpers in `engine/pixelart.ts`. New effect art is code-authored pixel strings (`render/art.ts`).
- **UI text is Brazilian Portuguese.** Pokémon, move and item names stay in English (official names).
- **Comments:** short doc comments above non-obvious functions. Don't comment every line, and keep comments in sync with the code.
- **Tests:** focused vitest tests for pure rules only (`*.test.ts`). No smoke or snapshot slop.
- **Mobile matters:** many players will be on phones. Every UI must work with touch and on small portrait and landscape screens.

## Commands

```bash
npm run dev        # vite dev server
npm test           # vitest
npm run build      # tsc --noEmit + vite build (must pass before any PR)
npm run assets     # fetch sprites (add new dex numbers in scripts/fetch-assets.mjs)
```

In dev builds, the browser console exposes `ps.run()` (current run state) and `ps.startRun('squirtle')`, which are handy for staging screenshots.

## Assets

Pokémon sprites come from PMD SpriteCollab (`sprite/<dex>/` has Walk/Idle/Hurt; shiny forms live under `sprite/<dex>/0000/0001/`). Portraits and cries come from PokeAPI. They are downloaded by `scripts/fetch-assets.mjs` into `public/assets/pokemon/<dex>/` and indexed in `src/data/sprites.generated.json`.
