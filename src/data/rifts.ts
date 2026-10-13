import type { Drop } from './consumables'
import type { EnemyId } from './enemies'

/**
 * Legendary rifts: portals that open on the map a few times per run and lead
 * to a closed arena with a legendary from another generation. Each one has
 * its entry in `ENEMIES`, its patterns in `data/bosses.ts` and an arena look here.
 */
export const RIFT_LEGENDS = ['lugia', 'hoOh', 'kyogre', 'groudon', 'rayquaza', 'dialga'] as const satisfies readonly EnemyId[]

export type RiftLegend = (typeof RIFT_LEGENDS)[number]

/** How an arena looks: floor tiles (base, alternate, grout), the wall ring (light, dark), the void past it and its floating motes. */
export type ArenaTheme = {
  floor: readonly [string, string, string]
  wall: readonly [string, string]
  void: string
  motes: string
}

export const ARENAS: Record<RiftLegend, ArenaTheme> = {
  /** Whirl Islands: deep-sea stone. */
  lugia: { floor: ['#506890', '#5c78a0', '#2c3c5c'], wall: ['#d8e8f8', '#7890b8'], void: '#0c1428', motes: '#a8c8f8' },
  /** Bell Tower: lacquered gold and red. */
  hoOh: { floor: ['#a85030', '#b86038', '#5c2418'], wall: ['#f8d060', '#b07820'], void: '#200c08', motes: '#f8a040' },
  /** Seafloor Cavern: wet teal rock. */
  kyogre: { floor: ['#286878', '#307888', '#143840'], wall: ['#78d0e8', '#287890'], void: '#04141c', motes: '#58b8f8' },
  /** Magma core: cooled basalt over lava. */
  groudon: { floor: ['#583830', '#644038', '#e05818'], wall: ['#f89038', '#a03810'], void: '#180804', motes: '#f86820' },
  /** Sky Pillar: green tiles at the edge of space. */
  rayquaza: { floor: ['#3c6848', '#467654', '#1c3424'], wall: ['#f8e070', '#589860'], void: '#040818', motes: '#f8f0a0' },
  /** Spear Pillar: pale marble in frozen time. */
  dialga: { floor: ['#8890a8', '#949cb4', '#485070'], wall: ['#a8f0f8', '#4868a8'], void: '#080c20', motes: '#78e0f8' },
}

/** Timing and size of rifts, in seconds and world px. */
export const RIFT = {
  /** The first portal opens at 3:30, then one every `every ± jitter`. */
  firstAt: 210,
  every: 240,
  jitter: 30,
  /** How long a portal waits on the map before closing. */
  portalTime: 40,
  /** Seconds the player must stand inside the portal to step in. */
  enterTime: 1,
  portalRadius: 18,
  /** Seconds before the arena collapses and throws the player back. */
  arenaTime: 60,
  arenaRadius: 140,
  /** Seconds to grab the loot after the legendary falls. */
  lootTime: 3,
  /** Chance the legendary behind a rift is shiny (double ₽, an extra Poké Ball). */
  shinyOdds: 1 / 8,
} as const

/** Items always dropped by a beaten rift legendary, on top of its ₽ and Poké Balls. */
export const RIFT_ITEMS: readonly Drop[] = ['rareCandy', 'superPotion']
