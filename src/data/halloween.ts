import type { EnemyId } from './enemies'

/**
 * Noite das Bruxas: the Halloween event of 2026. For its Brasília days
 * (`from` to `to`, both included) every run is haunted (`game/halloween.ts`):
 * a ghost joins each stage of the cast, Ghost-type foes carry candies and
 * jack-o'-lanterns stand among the breakables. The candies fill a jar that
 * pays the event's rewards, and the lobby dresses for the night. Days are
 * `YYYY-MM-DD` keys, like `game/day.ts`'s.
 */
export const HALLOWEEN = {
  /** The lobby counts down to the night from this day. */
  teaser: '2026-10-21',
  from: '2026-10-24',
  to: '2026-11-02',
  /**
   * The Surto do dia of each event day, instead of the drawn one: a ghost a
   * day, Gastly on the 31st, Litwick's candles for the Día de Muertos and
   * Duskull, the Requiem Pokémon, for Finados. Every one is an outbreak
   * species (`OUTBREAK_SPECIES`); a day left out keeps the drawn outbreak.
   */
  outbreaks: {
    '2026-10-24': 'shuppet',
    '2026-10-25': 'phantump',
    '2026-10-26': 'sinistea',
    '2026-10-27': 'drowzee',
    '2026-10-28': 'honedge',
    '2026-10-29': 'dreepy',
    '2026-10-30': 'cubone',
    '2026-10-31': 'gastly',
    '2026-11-01': 'litwick',
    '2026-11-02': 'duskull',
  } as const satisfies Readonly<Record<string, EnemyId>>,
  /** The ghost that haunts each stage (one per `STAGES` entry), of a tier the stage draws. */
  haunts: ['shedinja', 'duskull', 'shuppet', 'lampent', 'sableye', 'misdreavus', 'banette', 'gengar'] as const satisfies readonly EnemyId[],
  candy: {
    /** Odds a fainted Ghost-type regular drops a candy. */
    ghost: 0.07,
    /** Candies a Ghost-type elite or a shiny drops. */
    elite: 2,
    shiny: 5,
    /** Candies every boss and Alpha drops, Ghost or not. */
    boss: 10,
  },
  pumpkin: {
    /** Share of the breakables that are jack-o'-lanterns. */
    share: 0.35,
    /** Odds a cracked jack-o'-lantern is a treat (candies) rather than a trick (a ring of ghosts). */
    treat: 0.7,
    /** Candies a treat spills, and the one a trick still leaves. */
    treatCandies: 4,
    trickCandies: 1,
    /** How many ghosts a trick sends, and how far from the player (world px) they ring in. */
    trickGhosts: 8,
    trickRadius: 120,
  },
} as const
