/**
 * Pure rules behind the third batch of egg-family signature moves
 * (`eggMoves3.ts` casts them): the numbers that keep each verb fair, free of
 * game state so they're tested on their own (`eggMove3Rules.test.ts`).
 * Timings the renderer also needs live here, so `render/` never imports the
 * casting code.
 */

/* ---------------- Fiery Dance / Charge Beam: might for a while ---------------- */

/** Fiery Dance: chance per cast to raise the player's might, by how much and for how long. */
export const DANCE_MIGHT = { chance: 0.5, might: 0.15, seconds: 4 } as const
/** Charge Beam: the same, a smaller boost but more likely and longer. */
export const CHARGE_MIGHT = { chance: 0.7, might: 0.1, seconds: 5 } as const
/** Px the dancing flames flare out before twirling back. */
export const DANCE_REACH = 52

/* ---------------- Overdrive ---------------- */

/** Seconds between Overdrive's beats, and how long each ring takes to spread. */
export const OVERDRIVE_BEAT = 0.22
export const OVERDRIVE_RING = 0.4
/** Every `OVERDRIVE_BAR`th beat is the downbeat: bigger, harder and the only one that may paralyze. */
export const OVERDRIVE_BAR = 4
export const OVERDRIVE_DOWNBEAT = 1.8

/** Whether beat `i` (0-based) of a riff is a downbeat: the last of each bar, and always the riff's last beat. */
export const isDownbeat = (i: number, beats: number) => (i + 1) % OVERDRIVE_BAR === 0 || i === beats - 1

/* ---------------- Gigaton Hammer ---------------- */

/** Seconds the hammer is raised before it comes down, and the slam's radius (× area). */
export const HAMMER_WINDUP = 0.38
export const HAMMER_R = 30
/** The swing that follows a slam (the hammer is too heavy twice in a row): this share of the damage. */
export const HAMMER_TAP = 0.22

/** Which swing comes now: the giant slam after a light tap (or first), the light tap right after a slam. */
export const hammerSwing = (slammedLast: number) => (slammedLast > 0 ? 'tap' : 'slam')

/* ---------------- Bitter Blade / Leech Life ---------------- */

/** Share of Bitter Blade's damage that heals (through the drain budget), and its swing. */
export const BITTER_DRAIN = 0.5
export const BITTER_ARC = 2.4
export const BITTER_TIME = 0.2
/** Leech Life: share drained, and how close a foe must be for the bite. */
export const LEECH_DRAIN = 0.5
export const LEECH_REACH = 46

/* ---------------- Fire Fang ---------------- */

/** How far Fire Fang reaches for its bite, and the bite's windup. */
export const FANG_REACH = 70
export const FANG_BITE = 0.12
/** A foe already burning flinches instead: a brief stop (a short sleep the next hit breaks). */
export const FANG_FLINCH = { kind: 'sleep', chance: 1, duration: 0.7, power: 0 } as const

/* ---------------- Fury Swipes ---------------- */

/** Fury Swipes' reach: a foe this close keeps the frenzy going. */
export const SWIPES_REACH = 48
/** Extra swipes the frenzy can add on top of the base 2. */
export const SWIPES_EXTRA = 3

/** The frenzy after a cast: one more with a foe in reach (up to `SWIPES_EXTRA`), back to 0 without. */
export const swipesNext = (stacks: number, near: boolean) => (near ? Math.min(SWIPES_EXTRA, stacks + 1) : 0)
/** Swipes this cast: 2, plus the frenzy (so 2 to 5). */
export const swipesFor = (stacks: number) => 2 + Math.min(SWIPES_EXTRA, Math.max(0, stacks))

/* ---------------- Heavy Slam ---------------- */

/** Heavy Slam: damage per point of armor and per 100 max HP above the base 100, and its cap. */
export const HEAVY_ARMOR = 0.12
export const HEAVY_HP = 0.5
export const HEAVY_MAX = 3
/** The hop's seconds and height (px), and the slam's radius (× area). */
export const HEAVY_HOP = 0.3
export const HEAVY_LIFT = 12
export const HEAVY_R = 40

/** How much harder Heavy Slam hits for a player with `armor` and `maxHp`: ×1 for a bare Aron, up to `HEAVY_MAX`. */
export const heavyMult = (armor: number, maxHp: number) =>
  Math.min(HEAVY_MAX, 1 + HEAVY_ARMOR * Math.max(0, armor) + (HEAVY_HP * Math.max(0, maxHp - 100)) / 100)

/* ---------------- Bulldoze ---------------- */

/** Bulldoze's wave: how many chunks wide, their gap (px × area), and its speed. */
export const BULLDOZE_SEGMENTS = 5
export const BULLDOZE_GAP = 11
export const BULLDOZE_TTL = 0.9

/* ---------------- Perish Song ---------------- */

/** Seconds from the song to the perish. */
export const PERISH_TIME = 3
/** A boss can't perish: it loses this share of its max HP instead, however strong the song. */
export const PERISH_BOSS = 0.06

/** What the perish deals to a foe: the whole blow to a regular one, `PERISH_BOSS` of a boss's max HP. */
export const perishDamage = (damage: number, maxHp: number, boss: boolean) => (boss ? maxHp * PERISH_BOSS : damage)

/* ---------------- Moonblast ---------------- */

/** The moon's burst on impact: its radius (× area) and its share of the orb's damage. */
export const MOON_BURST = 26
export const MOON_SHARE = 0.6

/* ---------------- Frost Breath ---------------- */

/** Frost Breath's hits on chilled (slowed) or frozen foes land as criticals, this much harder. */
export const FROST_CRIT = 2.2

/* ---------------- Avalanche ---------------- */

/** Avalanche hits this much harder when the player was hurt since the last one. */
export const AVALANCHE_REVENGE = 2
/** How high above the target the slide starts (px), how fast it falls and how wide it is (chunks, gap × area). */
export const AVALANCHE_DROP = 84
export const AVALANCHE_SPEED = 300
export const AVALANCHE_CHUNKS = 5
export const AVALANCHE_GAP = 12

/** Avalanche's multiplier for its stacks (1 when the player was hurt since the last cast). */
export const avalancheMult = (stacks: number) => (stacks > 0 ? AVALANCHE_REVENGE : 1)
