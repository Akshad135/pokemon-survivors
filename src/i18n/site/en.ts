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
    psychic: 'Psychic', ice: 'Ice', steel: 'Steel', dark: 'Dark', fairy: 'Fairy', dragon: 'Dragon',
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
    roles: { starter: 'Starter', enemy: 'Wild', boss: 'Boss', legendary: 'Legendary', event: 'Event' },
    roleFilter: { starter: 'Starters', enemy: 'Wild', boss: 'Bosses', legendary: 'Legendaries', event: 'Events' },
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
    eventNote: 'Shows up as a map event: it runs from you and drops coins with every hit. Knock it out before it escapes for the Pay Day jackpot.',
    wildNote: 'Base values. Regular enemies get tougher every minute; bosses don\'t.',
    appears: 'When it shows up',
    horde: (from: string, until: string) => `May join the horde, from ${from} to ${until}`,
    hordeEnd: (from: string) => `May join the horde, from ${from} to the end`,
    swarm: (at: string, count: number) => `May lead the swarm of ${count} at ${at}`,
    ring: (at: string, count: number) => `May form the ring of ${count} at ${at}`,
    ringFixed: (at: string, count: number) => `Forms the ring of ${count} at ${at}`,
    boss: (at: string) => `Boss at ${at}`,
    bossChance: (at: string, percent: number) => `Boss at ${at} (${n(percent)}% chance)`,
    rift: (from: string) => `Behind a legendary rift, from ${from} (optional arena)`,
    reaper: (at: string) => `The endless mode's reaper, from ${at}`,
    attacks: 'Attacks',
    shinyNote: 'Can show up shiny (1 in 450): an elite with 8x HP.',
    summoned: (by: string) => `Called in by ${by}`,
    behavior: 'Behavior',
  },

  traits: {
    names: {
      healer: 'Healer',
      shield: 'Shield',
      summoner: 'Summoner',
      kamikaze: 'Kamikaze',
      beam: 'Beam',
      leaper: 'Leaper',
    },
    effects: {
      healer: (every: number, percent: number) => `Every ${n(every)}s, a green pulse heals ${n(percent)}% of the max HP of wounded allies nearby.`,
      shield: (every: number, percent: number, duration: number) =>
        `Every ${n(every)}s, wraps nearby allies in a shield that soaks damage equal to ${n(percent)}% of their max HP, for ${n(duration)}s.`,
      summoner: (every: number, count: number, max: number, names: readonly string[]) =>
        `Every ${n(every)}s it calls in ${count} reinforcements (${list(names)}), up to ${max} at once.`,
      kamikaze: (fuse: number, damage: number, percent: number) =>
        `Walks up, stops, blinks red and explodes after ${n(fuse)}s. The blast deals ${n(damage)}x its contact damage to you and takes ${n(percent)}% of the HP of enemies in the circle.`,
      beam: (aim: number, damage: number) => `Stops, draws the beam's line on the ground for ${n(aim)}s and fires: ${n(damage)}x its contact damage.`,
      leaper: (warn: number, damage: number) =>
        `Leaps over the horde to where you stood. The shadow on the ground marks the landing ${n(warn)}s ahead, and the impact deals ${n(damage)}x its contact damage.`,
    },
    tips: {
      healer: 'Take it down first, or the horde keeps topping up.',
      shield: 'Blue numbers are absorbed damage. Take out the shielder or wait for the shield to blink and fade.',
      summoner: 'The reinforcements stop once she falls.',
      kamikaze: 'Get out of the red circle, or lure it into the horde: the blast hurts enemies too.',
      beam: 'The aim locks when the line shows up: one step aside is enough.',
      leaper: 'Get off the shadow before it lands.',
    },
  },

  patterns: {
    strikesPlayer: (count: number, every: number, damage: number) =>
      `${count} marked ${s(count, 'strike', 'strikes')} on the ground near you every ${n(every)}s (${damage} damage)`,
    strikesSelf: (every: number, damage: number) => `Area slam around itself every ${n(every)}s (${damage} damage)`,
    ring: (count: number, every: number, damage: number) => `Ring of ${count} projectiles every ${n(every)}s (${damage} damage)`,
    trail: (ttl: number, damage: number) => `Leaves a trail that burns for ${n(ttl)}s (${damage} damage)`,
  },

  /** The wild roster: tiers and the cast each run draws (Pokédex filter and the guide's horde section). */
  roster: {
    tier: 'Tier',
    tierOf: (tier: number) => `Tier ${tier}`,
    allTiers: 'All',
    paragraphs: (species: number, perRun: number) => [
      `The horde has ${species} wild species from all 9 generations, and every run draws its own cast: about ${perRun} species, only a few new ones per stage, so you can tell who is coming.`,
      'Each species sits in a tier set by its base stat total. The first stages draw from tier 1 (weak basic Pokémon) and the end of the run from tiers 4 and 5 (evolved Pokémon). Swarms take a flying Pokémon of their tier, and rings a Pokémon of their tier you have already met this run.',
    ],
    formula: 'In-game stats come from the base stats: HP from the tier and the bulk (HP, Defense and Special Defense), damage from the tier and the best attacking stat, speed from base Speed, EXP from HP, and knockback resistance from HP and Defense (flying and ghost types are lighter).',
    tiersTitle: 'Tiers',
    tierHead: 'Tier',
    totalHead: 'Base stat total',
    total: (min: number, max: number | null) => (max === null ? `${min} or more` : min === 0 ? `up to ${max}` : `${min} to ${max}`),
    speciesHead: 'Species',
    examplesHead: 'Examples',
    stagesTitle: 'Tiers by stage',
    timeHead: 'Time',
    castHead: 'Cast tiers',
    /** `groups` = [tier, slots] pairs. */
    cast: (groups: readonly (readonly [number, number])[], fresh: number) =>
      `${list(groups.map(([tier, count]) => `${count} from tier ${tier}`))} (${fresh} new)`,
    swarm: (count: number, tier: number) => `Swarm: ${count} flying tier ${tier} Pokémon cross the screen`,
    ring: (count: number, tier: number) => `Ring: a circle of ${count} tier ${tier} Pokémon closes in on you`,
    ringOf: (count: number, name: string) => `Ring: a circle of ${count} ${name} closes in on you`,
  },

  guide: {
    title: 'How to play Pokémon Survivors: complete guide',
    description:
      'Pokémon Survivors guide: keyboard, gamepad and phone controls, how a run works, levels, moves, move evolutions with held items, the special attack, types and status, bosses, shinies, map items, map events and the Poké Mart.',
    h1: 'How to play',
    intro:
      'Pokémon Survivors is a Vampire Survivors-style roguelite: you only move, and your Pokémon attacks on its own. This guide explains everything that happens in a run, with the game\'s numbers.',
    toc: 'In this guide',
    sections: {
      controls: 'Controls',
      run: 'The run',
      world: 'Biomes and weather',
      horde: 'The wild horde',
      levels: 'Levels and moves',
      moveEvolutions: 'Move evolutions',
      special: 'Special attack',
      types: 'Types and status',
      bosses: 'Bosses',
      traits: 'Special enemies',
      rifts: 'Legendary rifts and endless mode',
      shinies: 'Shinies',
      items: 'Map items',
      mapEvents: 'Map events',
      mart: 'Poké Mart and Poké Dollars',
      settings: 'Settings and music',
    },
    controls: {
      head: { action: 'Action', keyboard: 'Keyboard', gamepad: 'Gamepad', touch: 'Touch' },
      rows: [
        ['Move', 'WASD or arrow keys', '— (not yet)', 'Drag anywhere on the screen (floating joystick)'],
        ['Special attack', 'Space', 'A (Xbox) or ✕ (PlayStation)', 'Round button, bottom right'],
        ['Pause', 'Esc or P', 'Start', 'Button, top right'],
        ['Navigate menus', 'Arrows, Enter confirms, Esc goes back', 'D-pad or left stick, A confirms, B goes back', 'Tap'],
        ['Pick an upgrade', '1 to 3, or ↑ ↓ and Enter', 'D-pad and A', 'Tap it'],
        ['Pick your starter', '← → partner, ↑ ↓ region, 1 to 9, Enter', 'D-pad and A', 'Tap to inspect, tap again to pick'],
        ['Open the Poké Mart', 'L on the starter select', '—', 'POKé MART button, top right'],
        ['Sound on/off', 'M', 'Settings', 'Settings'],
        ['Language', 'I on the title screen, or Settings', 'Settings', 'PT | EN on the title screen, or Settings'],
      ],
      notes: [
        'On a gamepad, the D-pad and left stick navigate every menu, A confirms, B goes back and Start pauses. In a run, A fires the special attack, but the gamepad can\'t move your Pokémon yet: use the keyboard or touch to move.',
        'On phones you can install the game as a fullscreen app: open the browser menu and choose "Add to Home Screen".',
      ],
    },
    run: {
      paragraphs: (minutes: number, starters: number) => [
        `Pick one of ${starters} starters, Kanto to Paldea. Each one has its own stats, starting move, learnset and special attack (see the Pokédex).`,
        `Walk around and dodge: your moves fire on their own as their cooldowns come back. Survive ${minutes} minutes of ever bigger hordes. At the end Mewtwo shows up, and beating it wins the run. After that you can keep going in endless mode.`,
        'If your HP hits zero the run is over (unless you are holding a Revive). The Poké Dollars you picked up go to your wallet.',
      ],
      scaling: (rows: readonly (readonly [string, string, string])[]) =>
        `Regular enemies get tougher every minute (bosses don't): ${rows.map(([at, hp, dmg]) => `at ${at}, ${hp}x HP and ${dmg}x damage`).join('; ')}.`,
      timeline: 'Timeline',
      timeHead: 'Time',
      eventHead: 'Event',
      boss: (name: string) => `Boss: ${name}`,
      bossChance: (name: string, percent: number) => `Rare boss: ${name} (${n(percent)}% chance)`,
    },
    world: {
      paragraphs: (count, minutes) => [
        `A run walks through ${count} biomes, ${n(minutes)} minutes each, with no loading screen: the ground dissolves into the next place and every biome has its own music. Breakables change their look too (in the cave, tall grass becomes a rock and the berry tree a giant mushroom).`,
        'The weather changes a few times per run and applies to everyone: your moves and the enemies\' attacks alike. Each biome has its own likely weather, and the weather icon shows next to the clock.',
      ],
      timeHead: 'From',
      biomeHead: 'Biome',
      weatherHead: 'Weather (most to least common)',
      weatherTitle: 'Weather',
      weatherCol: 'Weather',
      effectHead: 'Effect',
      power: (type, mult) => `${type} moves ×${n(mult)}`,
      chip: (enemy, boss, player, every, floor, immune) =>
        `every ${n(every)}s, enemies lose ${n(enemy)}% of their max HP (bosses ${n(boss)}%) and you lose ${n(player)}%, but never below ${n(floor)}% HP. ${list(immune)} types are immune`,
      fog: 'short sight: you only see clearly close to your Pokémon',
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
    rifts: {
      paragraphs: (r) => [
        `From ${r.first}, roughly every ${n(r.every)} minutes, a legendary rift opens off screen, with a purple arrow on the edge pointing at it. It stays open for ${r.portal}s and never opens while a boss is alive.`,
        `Stepping in is optional: stand inside the rift for ${n(r.enter)}s. It takes you to a closed arena, walled in, to face a legendary from another generation. You have ${r.arena}s to win; if time runs out the rift collapses and throws you back with no reward.`,
        'The run clock keeps ticking inside, but the horde outside freezes and nothing new spawns. When you come back, enemies are stronger because time passed, and any events you missed arrive at once.',
        `The reward is worth the risk: lots of EXP, two bags of ₽ on top of the boss shower, extra Poké Balls, a Rare Candy, a Super Potion and half your HP back. In 1 of ${r.shiny} rifts the legendary is shiny and pays double ₽ plus another Poké Ball.`,
      ],
      legendHead: 'Legendary',
      typesHead: 'Types',
      hpHead: 'Base HP',
      attacksHead: 'Attacks',
      hpNote: (percent) => `Base HP is the first rift's, at 3:30. After that, the legendary's HP and contact damage grow with the clock: +${n(percent)}% HP per minute. Every rift brings a different legendary.`,
      endlessTitle: 'Endless mode',
      endless: (e) => [
        'After you beat Mewtwo, the victory screen offers to keep going in endless mode. If you don\'t want to, you leave with the regular victory, and the bonus is paid right away.',
        `The horde keeps growing: more enemies spawn, the on-screen cap rises and rings and swarms arrive every ${e.every} seconds. Rifts keep opening.`,
        `At ${e.reaper}, Arceus descends to hunt you. It gets faster the longer it hunts, until nobody can outrun it, and it never loses you: wander off and it reappears at the edge of the screen. It can be beaten, but it has ${e.hp} HP; if it falls, it comes back ${e.returns} minutes later, stronger.`,
        `Time survived is the main score: every minute past 15:00 pays ₽${n(e.perMinute)} in the bonus, and every defeated Arceus another ₽${e.reaperBonus}.`,
      ],
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
    traits: {
      paragraphs: [
        'Some wild Pokémon do more than chase: they heal, shield and call in the horde, or attack from afar. They are a few among the horde, so keep an eye out.',
        'Every one of their attacks warns you first: a "!" over the head, a red circle, a line or a shadow on the ground that blinks faster as the hit gets close. The first time each one shows up in a run, a message explains what it does.',
      ],
      pokemonHead: 'Pokémon',
      traitHead: 'Behavior',
      effectHead: 'What it does',
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
    mapEvents: {
      intro: (first: number, gap: number, max: number) =>
        `From ${first}s into a run, roughly every ${gap}s a point of interest may show up near you (at most ${max} at once). The important ones get an arrow on the screen edge. Take too long and they vanish.`,
      eventHead: 'Event',
      howHead: 'How it works',
      rewardHead: 'Reward',
      altar: {
        name: 'Altar',
        how: 'Step on it. The buff it grants floats above it, so you can decide from afar.',
        reward: (boost: number) => `X Attack, X Speed or Max Repel (the roll avoids what's already running), lasting ${n(boost)}x as long.`,
      },
      fountain: {
        name: 'Fountain',
        how: (charges: number, interval: number) => `Stand in it while hurt: ${charges} charges, one every ${n(interval)}s. At full HP nothing is spent.`,
        reward: (heal: number) => `Each charge heals ${n(heal)}% of your max HP.`,
      },
      chest: {
        name: 'Locked chest',
        how: (unlock: number) =>
          `Stay inside the ring for ${unlock}s. Outside it, progress slowly drains. As soon as you start, a ring of wild Pokémon ambushes you.`,
        reward: (coins: string) => `${coins} or more (it grows over time), an item and a Poké Ball.`,
      },
      spikes: {
        name: 'Spikes',
        how: 'The spikes shoot up every few seconds, with a blinking warning first. They hurt whoever stands on them: you and the wild Pokémon.',
        reward: 'Lure the horde on top of them.',
      },
      bomb: {
        name: 'Bomb',
        how: (fuse: number) => `Anyone who gets close lights the fuse. ${n(fuse)}s later it blows up and hurts everything in range, you included.`,
        reward: 'Let the horde light it and step away.',
      },
      meowth: {
        name: 'Fleeing Meowth',
        how: (ttl: number) => `Runs from you and escapes after ${ttl}s. Your moves can hit it.`,
        reward: (jackpot: string) => `A coin with every hit, and the Pay Day (${jackpot}) if it faints.`,
      },
    },
    mart: {
      paragraphs: (coins: readonly number[], minute: number, kills: number, victory: number) => [
        `Fainted enemies sometimes drop Poké Dollars: a coin, a stack or a bag (${list(coins.map((c) => `₽${n(c)}`))}). Tougher ones drop them more often, and bosses and shinies always pay out.`,
        `A bonus comes at the end of the run: ₽${minute} per minute survived, ₽1 per ${kills} fainted foes and ₽${n(victory)} for winning. Quitting from the pause menu keeps the coins but forfeits the bonus.`,
        'Spend it all in the Poké Mart (button at the top right of the starter select) on permanent upgrades. The Refund button gives back everything you spent, so you can try other builds. Progress is saved only in this browser.',
      ],
      upgradeHead: 'Upgrade',
      effectHead: 'Effect',
      pricesHead: 'Price per rank',
    },
    settings: {
      paragraphs: [
        'Settings live in the title screen menu and in the pause menu, which is just Resume · Settings · Quit. Changes apply right away and are saved in this browser.',
        'The soundtrack is original chiptune, composed in code and synthesized live in the browser with no audio files: a village theme in the menus, a march during the run and a boss theme while a boss is alive.',
      ],
      optionHead: 'Option',
      effectHead: 'What it does',
      rows: [
        ['Music', 'Soundtrack volume.'],
        ['Effects', 'Volume of sound effects and cries.'],
        ['Sound', 'Turns all sound on or off (shortcut: M).'],
        ['Damage numbers', 'Shows or hides damage numbers on screen.'],
        ['Screen shake', 'Turns screen shake on explosions and big hits on or off.'],
        ['Language', 'Switches between English and Portuguese.'],
      ],
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
      'The game has no sign-up, cookies, ads or trackers, and collects no personal data.',
      'Everything the game remembers lives in your browser\'s localStorage, on your device, and is never sent to any server:',
    ],
    storage: {
      'ps:save': 'Poké Dollars and the upgrades bought in the Poké Mart.',
      'ps:settings': 'Settings: music and effects volume, sound on or off, damage numbers and screen shake.',
      'ps:lang': 'Your language (Portuguese or English).',
      'ps:muted': 'Only if you played an older version: the mute flag from before Settings existed. The game only reads it and no longer writes it.',
    },
    privacyAfter: [
      'To delete this data, clear the site data in your browser settings.',
      'Sprites, sounds and fonts are served by this site, with no calls to third-party services. The site is hosted on Vercel which, like any web server, may log technical access data (such as IP addresses) to run and protect the service.',
      'To know how many people visit and play, the site uses Vercel Web Analytics and its own Umami instance, on our own server. They count visits anonymously and in aggregate (page, country, browser, device and referring site) and, in Umami\'s case, a summary of each run (starter Pokémon, the minute and level you reached and whether you won), with no cookies and without identifying you or following you across sites.',
    ],
    contact: [
      'If you hold rights to any material used here and want it removed or changed, open an issue on GitHub. It will be addressed promptly.',
      'Bug reports and ideas are welcome there too.',
    ],
    issues: 'Open an issue on GitHub',
    source: 'View the source code',
  },
}
