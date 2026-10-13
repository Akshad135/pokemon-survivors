# Pokémon Survivors

A browser survivors-like (in the style of Vampire Survivors) with Pokémon. Pick Charmander, Squirtle or Bulbasaur, survive 15 minutes of wild hordes, learn moves, evolve, and beat Mewtwo.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # focused rules tests (vitest)
npm run build      # typecheck + production build
npm run assets     # re-download sprites/cries (already committed in public/)
```

**Controls:** WASD/arrows (or drag on touch screens) · `Esc`/`P` pause · `M` mute · `1-3` pick an upgrade.

## Stack

Vite + TypeScript, Canvas 2D, and no game engine. Everything is plain data plus functions (no classes). The world renders at about 300px tall and is upscaled by an integer factor, so every element (sprites, effects, particles) shares the same pixel grid. The UI is DOM with pixel fonts (Press Start 2P / VT323).

## Architecture

```
src/
  engine/   math, seeded rng, spatial hash, input, WebAudio sfx, pixel-art helpers
  data/     pure game data: starters, enemies, waves, held items, type chart
  game/     simulation (fixed 60 Hz tick): game.ts orchestrates the systems
            moves.ts (weapons) · attacks.ts (hitboxes) · enemies.ts · spawner.ts
            combat.ts · pickups.ts · leveling.ts · effects.ts
            consumables.ts (floor items, buffs) · props.ts (breakable item sources)
  render/   PMD sprite loader, code-drawn pixel art, procedural meadow, frame renderer
  ui/       HUD, starter select, level-up, pause, results, toasts
```

- **Simulation and presentation are decoupled.** `step(game, input, dt)` mutates the state and pushes `GameEvent`s. `main.ts` drains them each frame to play sounds and cries and show toasts.
- **Moves** are data plus a `fire(game, stats)` function. Upgrades are stat deltas. Player modifiers (might, area, cooldown…) are applied in `moveStats`. Each hitbox is a generic `Attack` with a `motion` (linear, homing, orbit, boomerang, follow, static) and a `visual`.
- **Waves** live in `data/waves.ts`: spawn stages by time, plus events (flyby swarms, closing rings, bosses).
- **Type chart:** damage uses real Pokémon type matchups, softened (2x → 1.5x, 0x → 0.5x). Yellow numbers with `!` mean super effective.

## Content (v0.1)

- 3 starters, each with a 3-stage evolution line (Lv 12 / Lv 28) and the handheld-style evolution scene.
- 10 moves: Ember, Fire Spin, Water Gun, Whirlpool, Razor Leaf, Vine Whip, Swift, Thunder, Sludge Bomb, Gust.
- 10 held items (passives): Muscle Band, Quick Claw, Wide Lens, Light Clay, Loaded Dice, Leftovers, Choice Scarf, Lucky Egg, Magnet, Assault Vest.
- 15 regular enemies. Bosses: Onix (5:00), Snorlax (10:00), Mewtwo (15:00, beating it wins the run).
- Drops: Exp. Candy (4 tiers), Oran Berry, and a boss Poké Ball that grants a random upgrade.
- Item sources on the map (item balls, berry trees, rustling tall grass) break under any attack and drop consumables: Potion, Super Potion, Rare Candy, Exp. Share, Poké Flute, Max Repel, Voltorb (Explosion), X Attack, X Speed and Revive. Drop tables live in `data/consumables.ts`.

## Ideas for next steps

- Move evolutions (e.g. max Ember + Charcoal → Flamethrower), like weapon evolutions in Vampire Survivors.
- Shiny elites that drop Poké Balls; status effects (burn, poison, paralysis).
- Meta progression (Poké Dollars, permanent upgrades), more starters, and biomes (cave, forest, Lavender Town).
- Chiptune music; custom effects/tiles made with PixelLab.

## Credits

Sprites: [PMD SpriteCollab](https://github.com/PMDCollab/SpriteCollab) (CC BY-NC 4.0). Cries: [PokéAPI](https://github.com/PokeAPI/cries). Pokémon © Nintendo / Game Freak / Creatures. A non-commercial fan project.
