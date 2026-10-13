import type { SiteMessages } from './pt'

/** Number in English format (`1,250`, `0.75`). */
const n = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 2 })
const s = (count: number, one: string, many: string) => (count === 1 ? one : many)
/** `a, b and c` */
const list = (items: readonly string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`)

/** English copy of the static site pages. Must match `pt.ts` key for key. */
export const siteEn: SiteMessages = {
  lang: { tag: 'en', og: 'en_US', short: 'EN', switchTo: 'View in English' },
  skip: 'Skip to content',
  nav: {
    label: 'Main navigation',
    play: 'Play',
    pokedex: 'Pokédex',
    guide: 'Guide',
    changelog: 'Changelog',
    legal: 'Legal',
    language: 'Language',
  },
  footer: {
    disclaimer:
      'Pokémon Survivors is an unofficial, free, non-commercial fan game. It is not affiliated with, endorsed, sponsored or approved by Nintendo, The Pokémon Company, GAME FREAK, Creatures or Spike Chunsoft. Pokémon and Pokémon character names are trademarks of Nintendo.',
    legal: 'Legal and privacy',
    credits: 'Credits',
    source: 'Source on GitHub',
  },
  home: 'Home',
  playCta: 'Play for free',

  types: {
    normal: 'Normal', fire: 'Fire', water: 'Water', grass: 'Grass', electric: 'Electric', poison: 'Poison',
    flying: 'Flying', bug: 'Bug', rock: 'Rock', ground: 'Ground', ghost: 'Ghost', fighting: 'Fighting',
    psychic: 'Psychic', ice: 'Ice', steel: 'Steel', dark: 'Dark', fairy: 'Fairy',
  },

  pokedex: {
    title: 'Pokémon Survivors Pokédex: starters, enemies, bosses and legendaries',
    description:
      'Every Pokémon in Pokémon Survivors with animated and shiny sprites: the 27 starters and their evolutions, wild enemies, bosses and legendaries. Types, in-game stats, moves, specials and when each one shows up.',
    h1: 'Pokédex',
    intro: (count: number) =>
      `All ${count} Pokémon in Pokémon Survivors, with the game's own numbers: starters from every region and their evolutions, the wild horde, the bosses and the legendaries. Hover (or tap) to see the sprite walk, and use ★ to see the shiny.`,
    filters: 'Filters',
    search: 'Search',
    searchPlaceholder: 'Name or number',
    region: 'Region',
    type: 'Type',
    role: 'Role',
    all: 'All',
    allRegions: 'All',
    shinyAll: 'Shiny',
    shinyToggle: (name: string) => `Show shiny ${name}`,
    results: (count: number) => `${count} Pokémon found`,
    empty: 'No Pokémon match these filters.',
    clear: 'Clear filters',
    roles: { starter: 'Starter', enemy: 'Wild', boss: 'Boss', legendary: 'Legendary' },
    roleFilter: { starter: 'Starters', enemy: 'Wild', boss: 'Bosses', legendary: 'Legendaries' },
    link: (name: string) => `Link to ${name}`,
    portrait: (name: string) => `${name} portrait`,
    sprite: (name: string) => `Animated ${name} sprite`,
    stats: 'In-game stats',
    statsNote: 'Without held items or Poké Mart upgrades.',
    evolution: 'Evolution line',
    evolvesAt: (level: number) => `Lv ${level}`,
    stageOf: (stage: number) => ['First stage', 'First evolution', 'Final evolution'][stage] ?? '',
    signature: 'Starting move',
    special: 'Special attack',
    specialFinal: 'At the final evolution',
    learnset: 'Moves it learns',
    wildStats: { hp: 'HP', damage: 'Contact damage', speed: 'Speed', xp: 'EXP' },
    wildNote: 'Base values. Regular enemies get tougher every minute; bosses don\'t.',
    appears: 'When it shows up',
    horde: (from: string, until: string) => `In the horde, from ${from} to ${until}`,
    hordeEnd: (from: string) => `In the horde, from ${from} to the end`,
    swarm: (at: string, count: number) => `Swarm of ${count} at ${at}`,
    ring: (at: string, count: number) => `Ring of ${count} at ${at}`,
    boss: (at: string) => `Boss at ${at}`,
    bossChance: (at: string, percent: number) => `Boss at ${at} (${n(percent)}% chance)`,
    attacks: 'Attacks',
    shinyNote: 'Can show up shiny (1 in 450): an elite with 8x HP.',
  },

  patterns: {
    strikesPlayer: (count: number, every: number, damage: number) =>
      `${count} marked ${s(count, 'strike', 'strikes')} on the ground near you every ${n(every)}s (${damage} damage)`,
    strikesSelf: (every: number, damage: number) => `Area slam around itself every ${n(every)}s (${damage} damage)`,
    ring: (count: number, every: number, damage: number) => `Ring of ${count} projectiles every ${n(every)}s (${damage} damage)`,
    trail: (ttl: number, damage: number) => `Leaves a trail that burns for ${n(ttl)}s (${damage} damage)`,
  },

  guide: {
    title: 'How to play Pokémon Survivors: complete guide',
    description:
      'Pokémon Survivors guide: keyboard, gamepad and phone controls, how a run works, levels, moves, move evolutions with held items, the special attack, types and status, bosses, shinies, map items and the Poké Mart.',
    h1: 'How to play',
    intro:
      'Pokémon Survivors is a Vampire Survivors-style roguelite: you only move, and your Pokémon attacks on its own. This guide explains everything that happens in a run, with the game\'s numbers.',
    toc: 'In this guide',
    sections: {
      controls: 'Controls',
      run: 'The run',
      levels: 'Levels and moves',
      moveEvolutions: 'Move evolutions',
      special: 'Special attack',
      types: 'Types and status',
      bosses: 'Bosses',
      shinies: 'Shinies',
      items: 'Map items',
      mart: 'Poké Mart and Poké Dollars',
    },
    controls: {
      head: { action: 'Action', keyboard: 'Keyboard', gamepad: 'Gamepad', touch: 'Touch' },
      rows: [
        ['Move', 'WASD or arrow keys', '—', 'Drag anywhere on the screen (floating joystick)'],
        ['Special attack', 'Space', 'A (Xbox) or ✕ (PlayStation)', 'Round button, bottom right'],
        ['Pause', 'Esc or P', '—', 'Button, top right'],
        ['Pick an upgrade', '1 to 3, or ↑ ↓ and Enter', '—', 'Tap it'],
        ['Pick your starter', '← → partner, ↑ ↓ region, 1 to 9, Enter', '—', 'Tap to inspect, tap again to pick'],
        ['Open the Poké Mart', 'L on the title screen', '—', 'POKé MART button'],
        ['Sound', 'M', '—', 'Pause menu'],
        ['Language', 'I on the title screen, or the pause menu', '—', 'PT | EN on the title screen, or the pause menu'],
      ],
      notes: [
        'On a gamepad, only the A / ✕ button (special attack) works for now. Use the keyboard to move.',
        'On phones you can install the game as a fullscreen app: open the browser menu and choose "Add to Home Screen".',
      ],
    },
    run: {
      paragraphs: (minutes: number, starters: number) => [
        `Pick one of ${starters} starters, Kanto to Paldea. Each one has its own stats, starting move, learnset and special attack (see the Pokédex).`,
        `Walk around and dodge: your moves fire on their own as their cooldowns come back. Survive ${minutes} minutes of ever bigger hordes. At the end Mewtwo shows up, and beating it wins the run.`,
        'If your HP hits zero the run is over (unless you are holding a Revive). The Poké Dollars you picked up go to your wallet.',
      ],
      scaling: (rows: readonly (readonly [string, string, string])[]) =>
        `Regular enemies get tougher every minute (bosses don't): ${rows.map(([at, hp, dmg]) => `at ${at}, ${hp}x HP and ${dmg}x damage`).join('; ')}.`,
      timeline: 'Timeline',
      timeHead: 'Time',
      eventHead: 'Event',
      swarm: (count: number, name: string) => `Swarm: ${count} ${name} fly across the screen`,
      ring: (count: number, name: string) => `Ring: a circle of ${count} ${name} closes in on you`,
      boss: (name: string) => `Boss: ${name}`,
      bossChance: (name: string, percent: number) => `Rare boss: ${name} (${n(percent)}% chance)`,
    },
    levels: {
      paragraphs: (moves: number, items: number, moveLevel: number) => [
        'Fainted Pokémon drop Exp. Candies. Walk near them to collect them (the Dowsing Machine widens the reach).',
        `On every level up, pick 1 of 3 offers: a new move from your Pokémon's learnset, a move upgrade, a new held item or another item level. You can hold up to ${moves} moves and ${items} items. Moves go up to Lv ${moveLevel}.`,
        'Type items (Charcoal, Mystic Water…) only show up if your Pokémon learns moves of that type. When there is nothing left to offer, you get an Oran Berry (+40 HP).',
        'Reroll (draw new offers) and Skip (pass on a level up without picking anything, handy when no offer fits) are charges bought in the Poké Mart.',
      ],
      evolution: (first: number, second: number) =>
        `Your Pokémon evolves at Lv ${first} and Lv ${second}, just like on the handhelds. Each evolution adds HP and stats, and the final one powers up the special attack.`,
      itemsTitle: 'Held items',
      itemHead: 'Item',
      effectHead: 'Effect per level',
      levelsHead: 'Levels',
    },
    moveEvolutions: {
      paragraphs: [
        'Just like in Vampire Survivors: max out a move and hold its paired item. On your next level up (or the next Poké Ball), the evolution shows up as an offer and replaces the move in the same slot.',
        'One item can evolve more than one move: Charcoal works for both Ember and Fire Spin, for example.',
      ],
      moveHead: 'Move (max level)',
      itemHead: 'Item',
      resultHead: 'Evolution',
      noEvolution: (moves: string) => `No evolution yet: ${moves}.`,
    },
    special: {
      paragraphs: (min: number) => [
        'Besides the automatic moves, every Pokémon has a manual special attack: press Space, the A / ✕ gamepad button or the round button on screen. It charges for a moment (you move slower) and then fires in the direction you are walking.',
        `The special depends on your starter's type. Its cooldown shrinks with the Cooldown stat, down to ${min}s. At the final evolution it becomes the stronger version, with more damage and area.`,
      ],
      typeHead: 'Type',
      moveHead: 'Special → final evolution',
      cooldownHead: 'Cooldown',
    },
    types: {
      chart: (strong: string, double: string, weak: string, immune: string) =>
        `Damage uses the real type chart, softened so no build is ever useless: super effective deals ${strong}x, doubly super effective ${double}x, not very effective ${weak}x, and immunities become ${immune}x. Yellow numbers with "!" mean super effective.`,
      statusIntro: 'Some moves inflict status conditions. Chance and power grow with upgrades and items.',
      statusHead: 'Status',
      movesHead: 'Inflicted by',
      effectHead: 'Effect',
      names: { burn: 'Burn', poison: 'Poison', paralysis: 'Paralysis', slow: 'Slow', sleep: 'Sleep' },
      effects: {
        burn: (attack: number) => `Damage over time. Burned enemies deal only ${n(attack * 100)}% contact damage.`,
        poison: (stacks: number) => `Damage over time that stacks up to ${stacks}x.`,
        paralysis: (boss: number) => `Freezes the enemy for a moment, then it stutters now and then. Lasts ${n(boss * 100)}% as long on bosses.`,
        slow: (boss: number) => `Slows down anything close. Lasts ${n(boss * 100)}% as long on bosses.`,
        sleep: (seconds: number, boss: number) => `Enemies on screen fall asleep for ${seconds}s. Lasts ${n(boss * 100)}% as long on bosses.`,
      },
      flute: 'Poké Flute (map item)',
      itemsNote: 'King\'s Rock raises the status chance, Toxic Orb raises burn and poison damage, and Light Clay makes statuses last longer.',
    },
    bosses: {
      paragraphs: [
        'Bosses arrive at fixed times. Legendaries make an entrance with a screen flash, their cry and a banner. All of them get an HP bar at the top and their own attacks: marked circles on the ground show where a hit will land, so step out of them.',
        'Bosses don\'t get tougher over time, and each one drops a Poké Ball and a shower of Poké Dollars.',
      ],
      timeHead: 'Time',
      bossHead: 'Boss',
      hpHead: 'HP',
      attacksHead: 'Attacks',
    },
    shinies: {
      paragraphs: (wild: number, hp: number, xp: number, player: number) => [
        `Every regular wild Pokémon has a 1 in ${n(wild)} chance to spawn shiny. It becomes an elite with ${hp}x HP and ${xp}x EXP, and always drops a Poké Ball and Poké Dollars. Bosses and legendaries are never shiny.`,
        `Your starter has a 1 in ${player} chance to be shiny, and stays shiny through every evolution of that run.`,
        'A Poké Ball (from bosses and shinies) grants a random upgrade on the spot, or a move evolution if one is ready.',
      ],
      seeAll: 'See every shiny in the Pokédex',
    },
    items: {
      intro: 'Item sources show up around the map. Any move breaks them, and each one drops an item. Stronger items get more common late in the run.',
      sourceHead: 'Source',
      hitsHead: 'Hits to break',
      enemyNote: (berry: number, item: number) =>
        `Regular enemies also drop an Oran Berry (${n(berry)}% chance) or an item (${n(item)}%).`,
      sources: { itemBall: 'Item Ball', berryTree: 'Berry Tree', tallGrass: 'Tall grass', enemy: 'Enemies' },
      itemHead: 'Item',
      effectHead: 'Effect',
      whereHead: 'Where',
      effects: {
        oranBerry: 'Restores 30% of max HP.',
        potion: 'Restores 30 HP.',
        superPotion: 'Restores 60 HP.',
        rareCandy: 'Levels you up on the spot.',
        expShare: 'Pulls every Exp. Candy on the map to you.',
        pokeFlute: 'Puts the wild Pokémon on screen to sleep.',
        maxRepel: 'Invulnerable for a few seconds, pushing enemies away.',
        explosion: 'Voltorb uses Explosion: faints every regular enemy on screen and takes 10% of a boss\'s HP.',
        xAttack: '50% more damage for 20s.',
        xSpeed: 'More speed and faster cooldowns for 20s.',
        revive: 'Kept for later. When you faint, you get back up with 50% HP.',
      },
    },
    mart: {
      paragraphs: (coins: readonly number[], minute: number, kills: number, victory: number) => [
        `Fainted enemies sometimes drop Poké Dollars: a coin, a stack or a bag (${list(coins.map((c) => `₽${n(c)}`))}). Tougher ones drop them more often, and bosses and shinies always pay out.`,
        `A bonus comes at the end of the run: ₽${minute} per minute survived, ₽1 per ${kills} fainted foes and ₽${n(victory)} for winning. Quitting from the pause menu keeps the coins but forfeits the bonus.`,
        'Spend it all in the Poké Mart (title screen) on permanent upgrades. The Refund button gives back everything you spent, so you can try other builds. Progress is saved only in this browser.',
      ],
      upgradeHead: 'Upgrade',
      effectHead: 'Effect',
      pricesHead: 'Price per rank',
    },
    cta: 'Ready? Pick your partner and play.',
  },

  changelog: {
    title: 'Pokémon Survivors changelog: every update',
    description:
      'Everything that changed in Pokémon Survivors, update by update: starters, legendary bosses, shinies, move evolutions, the Poké Mart, the mobile version and more.',
    h1: 'Changelog',
    intro: 'The game\'s update history, newest first. Each entry links to the pull request with the details on GitHub.',
    pr: (n: number) => `PR #${n}`,
  },

  legal: {
    title: 'Legal, privacy and credits | Pokémon Survivors',
    description:
      'Pokémon Survivors is an unofficial, free fan game with no ads and no purchases. Licenses (MIT code, CC BY-NC 4.0 sprites), privacy (no personal data collected), credits and contact.',
    h1: 'Legal, privacy and credits',
    sections: {
      fanGame: 'Unofficial fan game',
      free: 'Free, no ads, no purchases',
      licenses: 'Licenses and credits',
      privacy: 'Privacy',
      contact: 'Contact and takedown requests',
    },
    fanGame: [
      'Pokémon Survivors is an unofficial, non-commercial fan game made by fans for fans by Pedro Barretto.',
      'It is not affiliated with, endorsed, sponsored or approved by Nintendo, The Pokémon Company, GAME FREAK inc., Creatures Inc. or Spike Chunsoft.',
      'Pokémon and Pokémon character names are trademarks of Nintendo. Pokémon © Nintendo, Creatures Inc. and GAME FREAK inc. All other trademarks belong to their respective owners.',
    ],
    free: [
      'The game is free and will stay that way: no ads, no paid content and no in-app purchases.',
      'Poké Dollars (₽) exist only inside the game and can\'t be bought with real money.',
    ],
    licenses: {
      code: 'Source code',
      codeText: 'MIT license. It covers only this project\'s original code and grants no rights to Pokémon characters, names, sounds or artwork.',
      sprites: 'Sprites and portraits',
      spritesText: 'PMD SpriteCollab, under the CC BY-NC 4.0 license (non-commercial use, with credit). Every artist is listed in the credits.',
      creditsLink: 'See the credits for every artist (CREDITS.md)',
      cries: 'Cries (Pokémon sounds)',
      criesText: 'PokéAPI/cries.',
      fonts: 'Fonts',
      fontsText: 'Press Start 2P and VT323, under the SIL Open Font License (OFL). Served by this site.',
      inspiration: 'Inspiration',
      inspirationText: 'Vampire Survivors, by poncle.',
      nonCommercial: 'Because the sprites are CC BY-NC, the game as a whole can\'t be used commercially.',
    },
    privacy: [
      'The game has no sign-up, cookies, analytics, ads or trackers, and collects no personal data.',
      'Everything the game remembers lives in your browser\'s localStorage, on your device, and is never sent to any server:',
    ],
    storage: {
      'ps:save': 'Poké Dollars and the upgrades bought in the Poké Mart.',
      'ps:lang': 'Your language (Portuguese or English).',
      'ps:muted': 'Whether sound is on or off.',
    },
    privacyAfter: [
      'To delete this data, clear the site data in your browser settings.',
      'Sprites, sounds and fonts are served by this site, with no calls to third-party services. The site is hosted on Vercel which, like any web server, may log technical access data (such as IP addresses) to run and protect the service.',
    ],
    contact: [
      'If you hold rights to any material used here and want it removed or changed, open an issue on GitHub. It will be addressed promptly.',
      'Bug reports and ideas are welcome there too.',
    ],
    issues: 'Open an issue on GitHub',
    source: 'View the source code',
  },
}
