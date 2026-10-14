import type { StarterId } from '../data/starters'
import type { ItemId } from '../data/items'
import type { TraitId } from '../data/traits'
import type { ConsumableId } from '../game/consumables'
import type { UpgradeId } from '../game/meta'
import type { MOVES, MoveId } from '../game/moves'
import type { SpecialKind } from '../game/special'

/** One string per entry of a tuple, so every move upgrade gets exactly one line. */
type Lines<T extends readonly unknown[]> = { readonly [I in keyof T]: string }

/** Translated game content, keyed by the ids in `data/*` and `MOVES`. Names stay official English. */
export type ContentTexts = {
  moves: { [K in MoveId]: { description: string; upgrades: Lines<(typeof MOVES)[K]['upgrades']> } }
  items: Record<ItemId, string>
  /** Poké Mart upgrades. */
  upgrades: Record<UpgradeId, string>
  /** Pickup toast line, shown after the item name. */
  consumables: Record<ConsumableId, string>
  /** One-liner under the starter's name in the inspect panel. */
  blurbs: Record<StarterId, string>
  specials: Record<SpecialKind, string>
}

const typeBoost = (type: string) => `+10% de dano em golpes do tipo ${type}.`

/**
 * Brazilian Portuguese, the reference locale: `Messages` is inferred from it,
 * so every other locale must match it key for key. Toast strings use light
 * markup rendered by `rich`: `*bold*` and `_accent_`.
 */
export const pt = {
  loading: 'Carregando…',
  level: (n: number) => `Nv ${n}`,
  levelShort: (n: number) => `Nv${n}`,
  max: 'MAX',
  new: 'NOVO!',
  language: 'Idioma',
  spaceKey: 'ESPAÇO',
  stats: {
    hp: 'HP',
    attack: 'Ataque',
    damage: 'Dano',
    area: 'Área',
    cooldown: 'Recarga',
    duration: 'Duração',
    amount: 'Projéteis',
    speed: 'Velocidade',
    defense: 'Defesa',
    regen: 'Regeneração',
  },

  /** Title screen (the first thing a player sees). */
  home: {
    pressKeys: 'Pressione qualquer tecla',
    pressTouch: 'Toque para começar',
    play: 'Jogar',
    pokedex: 'Pokédex',
    guide: 'Como jogar',
    settings: 'Ajustes',
    legal: 'Legal e créditos',
    fanGame: 'Fan game não oficial',
    back: 'Título',
  },

  title: {
    subtitle: 'Escolha seu parceiro!',
    hintKeys: '← → parceiro · ↑ ↓ região · ENTER escolher',
    hintTouch: 'Toque para ver · toque de novo para escolher',
    inspect: 'INSPECIONAR',
    choose: (name: string) => `Escolher ${name}!`,
    statsSection: 'Status',
    legendBase: 'início',
    legendFinal: 'evoluído',
    evolution: 'Evolução',
    special: 'Especial',
    moves: 'Golpes',
    signature: 'INICIAL',
    credits: 'Fan game não oficial · Sprites: PMD SpriteCollab · Cries: PokéAPI · Pokémon © Nintendo/Creatures/GAME FREAK',
  },

  hud: {
    pause: 'Pausar',
    specialAttack: 'Ataque especial',
    specialTitle: (name: string) => `${name} (Espaço)`,
  },

  levelUp: {
    title: (name: string, level: number) => `${name} subiu para o Nv ${level}!`,
    ready: 'PRONTO!',
    evolution: 'EVOLUÇÃO!',
    evolves: (from: string, description: string) => `${from} evolui! ${description}`,
    berry: (name: string) => `${name} recupera 40 HP.`,
    reroll: (n: number) => `Trocar (${n})`,
    skip: (n: number) => `Pular (${n})`,
    hintKeys: '↑ ↓ escolher · ENTER confirmar · 1-3 atalho',
    hintTouch: 'Toque para escolher',
  },

  pause: {
    title: 'PAUSA',
    resume: 'Continuar',
    quit: 'Desistir',
    settings: 'Ajustes',
    evoLegend: 'Golpe no nível máximo + o item indicado = evolução na próxima Poké Ball ou subida de nível!',
  },

  settings: {
    title: 'AJUSTES',
    music: 'Música',
    sfx: 'Efeitos',
    sound: 'Som',
    damageNumbers: 'Números de dano',
    screenShake: 'Tremor de tela',
    on: 'ON',
    off: 'OFF',
    back: 'Voltar',
    hintKeys: '↑ ↓ escolher · ← → ajustar · ESC voltar',
    hintTouch: 'Toque ou arraste para ajustar',
  },

  results: {
    victory: 'Você venceu Mewtwo!',
    fainted: (name: string) => `${name} desmaiou!`,
    shiny: (name: string) => `${name} shiny`,
    time: 'Tempo',
    level: 'Nível',
    kills: 'Derrotados',
    earnings: (coins: string, bonus: string) => `Moedas ${coins} · Bônus ${bonus}`,
    retry: 'Tentar de novo',
    change: 'Trocar Pokémon',
    /** End-of-run Pokédex news, e.g. "+3 espécies novas · 1 shiny capturado". */
    dexSpecies: (n: number) => (n === 1 ? '+1 espécie nova' : `+${n} espécies novas`),
    dexShinies: (n: number) => (n === 1 ? '1 shiny capturado' : `${n} shinies capturados`),
  },

  /** In-game Pokédex (title menu). */
  dex: {
    seen: 'Vistos',
    defeated: 'Derrotados',
    caught: 'Capturados',
    filters: { all: 'Todos', seen: 'Vistos', caught: 'Capturados', missing: 'Faltam' },
    roles: { starter: 'Inicial', enemy: 'Selvagem', boss: 'Chefe', legendary: 'Lendário', event: 'Evento' },
    owned: 'Capturado',
    yes: 'Sim!',
    no: 'Ainda não',
    shiny: 'SHINY',
    unseen: 'Ainda não visto. Continue explorando!',
    empty: 'Nada aqui ainda.',
    back: 'Voltar',
    site: 'Onde encontrar ↗',
    hintKeys: 'SETAS navegar · Q E filtro · ESC voltar',
    hintTouch: 'Toque num Pokémon para ver detalhes',
  },

  mart: {
    open: 'Abrir Poké Mart',
    rank: (name: string, rank: number, max: number) => `${name} · Nv ${rank}/${max}`,
    buy: (price: string) => `Comprar ${price}`,
    back: 'Voltar',
    backDescription: 'Voltar para a escolha de parceiro.',
    refund: 'Reembolsar',
    refundAll: 'Reembolsar tudo',
    refundDescription: (amount: string) => `Desfaz todas as compras e devolve ${amount}.`,
    refundConfirm: (amount: string) => `Reembolsar tudo e receber ${amount}?`,
    yes: 'Sim',
    no: 'Não',
    hint: '↑ ↓ escolher · ENTER comprar · ESC voltar',
  },

  toast: {
    used: (who: string, move: string) => `${who} usou *${move}*!`,
    legendary: (name: string) => `Um *${name}* _lendário_ apareceu!`,
    boss: (name: string) => `Um *${name}* selvagem apareceu!`,
    shiny: (name: string) => `Um *${name}* shiny apareceu!`,
    shinyPlayer: (name: string) => `Que sorte! Seu *${name}* é shiny!`,
    caught: (name: string) => `*${name}* shiny é seu! Registrado na _Pokédex_.`,
    evolving: (name: string) => `Hã? ${name} está evoluindo!`,
    evolved: (from: string, to: string) => `Parabéns! ${from} evoluiu para ${to}!`,
    moveEvolved: (from: string, to: string) => `*${from}* evoluiu para *${to}*!`,
    pokeball: (prize: string) => `Poké Ball: ${prize}`,
    pokeballEmpty: 'nada… estava vazia!',
    pokeballLevel: (name: string, level: number) => `${name} Nv ${level}!`,
    pokeballEvolution: (name: string) => `${name}!`,
    pokeballBerry: 'uma Oran Berry!',
    revive: 'O *Revive* te pôs de pé!',
  },

  /** Biomes and weather: banners, toasts and the HUD weather icon. */
  world: {
    biomes: {
      meadow: 'Rota 1',
      forest: 'Floresta de Viridian',
      cave: 'Monte Moon',
      snow: 'Monte Prateado',
      tower: 'Torre de Lavender',
    },
    area: (n: number, total: number) => `Área ${n} de ${total}`,
    weather: { clear: 'Céu limpo', sun: 'Sol forte', rain: 'Chuva', sand: 'Tempestade de areia', snow: 'Neve', fog: 'Névoa' },
    weatherStart: {
      sun: 'O sol ficou *forte*!',
      rain: 'Começou a *chover*!',
      sand: 'Uma *tempestade de areia* começou!',
      snow: 'Começou a *nevar*!',
      fog: 'Uma *névoa densa* cobriu tudo!',
    },
    weatherHint: {
      sun: 'Fogo mais forte, Água mais fraca',
      rain: 'Água mais forte, Fogo mais fraco',
      sand: 'Desgasta quem não é Pedra, Terra ou Aço',
      snow: 'Desgasta quem não é Gelo',
      fog: 'Difícil enxergar longe',
    },
    weatherEnd: {
      sun: 'O sol voltou ao normal.',
      rain: 'A chuva parou.',
      sand: 'A tempestade de areia passou.',
      snow: 'Parou de nevar.',
      fog: 'A névoa se dissipou.',
    },
  },
  /** Map event toasts (altars, fountains, chests, Meowth). */
  mapEvents: {
    altar: (buff: string) => `O altar concedeu *${buff}*!`,
    fountain: 'A fonte restaura seu HP. Fique nela!',
    chestAmbush: 'Baú trancado! Fique perto para abrir… _é uma emboscada_!',
    chestOpen: (coins: string) => `Baú aberto: *${coins}*, um item e uma Poké Ball!`,
    meowth: 'Um *Meowth* passou correndo com moedas! Acerte ele!',
    payDay: (coins: string) => `*Pay Day!* Meowth largou ${coins}!`,
    meowthEscaped: 'O *Meowth* fugiu…',
  },
  /** Legendary rifts and the endless mode after Mewtwo. */
  rifts: {
    open: 'Uma *fenda lendária* se abriu! Siga a seta.',
    closed: 'A fenda se fechou.',
    enter: (name: string) => `A fenda leva você até *${name}*!`,
    enterShiny: (name: string) => `A fenda leva você até um *${name}* _shiny_!`,
    cleared: (name: string) => `*${name}* derrotado! A fenda deixa um tesouro.`,
    collapse: 'A fenda colapsou! Você foi jogado de volta.',
    hudPortal: (time: string) => `Fenda ${time}`,
    hudArena: (time: string) => `Colapso ${time}`,
    hudEndless: (time: string) => `Sem fim +${time}`,
    hudReaper: (time: string) => `Arceus em ${time}`,
    hudHunting: 'Arceus caça você!',
    reaper: '*Arceus* desceu para julgar você!',
    reaperBack: '*Arceus* voltou, mais forte!',
    reaperDown: 'Você derrotou *Arceus*! Um feito _lendário_!',
    continue: 'Modo sem fim',
    continueHint: 'A horda não para e Arceus vem caçar você às 20:00. Quanto tempo você aguenta?',
    endlessOver: (name: string) => `${name} caiu no modo sem fim!`,
    overtime: 'Tempo extra',
    legends: 'Lendários',
    reaperDefeated: (n: number) => (n === 1 ? 'Arceus derrotado!' : `Arceus derrotado ${n}x!`),
  },

  moves: {
    ember: {
      description: 'Dispara brasas no inimigo mais próximo. Pode queimar.',
      upgrades: [
        '+1 brasa',
        '+4 de dano e +10% de chance de queimar',
        'Recarga 15% mais rápida',
        '+1 brasa',
        'Atravessa +1 inimigo',
        '+6 de dano',
        '+1 brasa e +25% de área',
      ],
    },
    fireSpin: {
      description: 'Chamas giram ao seu redor. Pode queimar.',
      upgrades: [
        '+1 chama',
        '+20% de área',
        '+4 de dano',
        'Dura +0.6s',
        '+1 chama',
        '+5 de dano e queimaduras +25% mais fortes',
        '+1 chama e gira mais rápido',
      ],
    },
    waterGun: {
      description: 'Jato d’água que atravessa inimigos na direção em que você anda.',
      upgrades: [
        '+1 jato',
        '+3 de dano',
        'Atravessa +1 inimigo',
        'Recarga 0.1s mais rápida',
        '+1 jato',
        '+5 de dano',
        '+1 jato e atravessa +2',
      ],
    },
    whirlpool: {
      description: 'Redemoinho constante que machuca e desacelera quem chega perto.',
      upgrades: [
        '+20% de área',
        '+2 de dano',
        'Acerta mais rápido',
        '+20% de área',
        '+3 de dano',
        'Acerta mais rápido',
        '+25% de área e +3 de dano',
      ],
    },
    razorLeaf: {
      description: 'Folhas afiadas vão e voltam como bumerangue. Podem envenenar.',
      upgrades: [
        '+1 folha',
        '+4 de dano',
        '+20% de área',
        '+1 folha',
        'Folhas 25% mais rápidas',
        '+5 de dano',
        '+1 folha',
      ],
    },
    vineWhip: {
      description: 'Chicotada horizontal com cipós. Alcance longo. Pode envenenar.',
      upgrades: [
        'Também ataca atrás',
        '+5 de dano',
        '+20% de área',
        'Recarga 0.15s mais rápida',
        '+6 de dano',
        '+20% de área',
        '+8 de dano',
      ],
    },
    swift: {
      description: 'Estrelas teleguiadas que nunca erram.',
      upgrades: [
        '+1 estrela',
        '+3 de dano',
        'Recarga 15% mais rápida',
        '+1 estrela',
        'Atravessa +1 inimigo',
        '+4 de dano',
        '+2 estrelas',
      ],
    },
    thunder: {
      description: 'Raios caem sobre inimigos aleatórios na tela. Podem paralisar.',
      upgrades: [
        '+1 raio',
        '+8 de dano',
        '+25% de área e +15% de chance de paralisar',
        '+1 raio',
        'Recarga 0.3s mais rápida',
        '+10 de dano',
        '+2 raios',
      ],
    },
    sludgeBomb: {
      description: 'Arremessa lodo tóxico que deixa uma poça venenosa. O veneno acumula.',
      upgrades: [
        '+1 bomba',
        '+2 de dano e veneno +25% mais forte',
        'Poça dura +0.6s',
        '+20% de área',
        '+1 bomba',
        '+3 de dano',
        '+1 bomba e +20% de área',
      ],
    },
    gust: {
      description: 'Rajada de vento circular que empurra todos para longe.',
      upgrades: [
        '+3 de dano',
        '+20% de área',
        'Recarga 0.4s mais rápida',
        '+1 rajada',
        '+4 de dano',
        '+30% de área e empurrão',
        '+1 rajada',
      ],
    },
    machPunch: {
      description: 'Combo de socos rápidos no inimigo mais próximo.',
      upgrades: [
        '+1 soco',
        '+3 de dano',
        '+20% de área',
        '+1 soco',
        'Recarga 0.2s mais rápida',
        '+5 de dano',
        '+2 socos',
      ],
    },
    flashCannon: {
      description: 'Esfera de aço que atravessa tudo em linha reta.',
      upgrades: [
        '+6 de dano',
        '+25% de área',
        'Recarga 0.3s mais rápida',
        '+1 esfera',
        '+8 de dano',
        '+25% de área',
        '+1 esfera',
      ],
    },
    spiritShackle: {
      description: 'Rajada de flechas espectrais em leque que atravessam inimigos.',
      upgrades: [
        '+1 flecha',
        '+3 de dano',
        'Atravessa +1 inimigo',
        '+1 flecha',
        'Recarga 0.2s mais rápida',
        '+4 de dano',
        '+2 flechas',
      ],
    },
    waterShuriken: {
      description: 'Shurikens d’água teleguiadas, rápidas e certeiras.',
      upgrades: [
        '+1 shuriken',
        '+2 de dano',
        'Recarga 0.12s mais rápida',
        '+1 shuriken',
        '+3 de dano',
        'Shurikens mais rápidas',
        '+2 shurikens',
      ],
    },
    crunch: {
      description: 'Mordida poderosa nos inimigos mais próximos.',
      upgrades: [
        '+6 de dano',
        '+1 mordida',
        '+20% de área',
        'Recarga 0.2s mais rápida',
        '+1 mordida',
        '+8 de dano',
        '+1 mordida e +20% de área',
      ],
    },
    pyroBall: {
      description: 'Chuta uma bola de fogo que explode ao cair.',
      upgrades: [
        '+1 bola',
        '+6 de dano',
        '+25% de área',
        'Recarga 0.3s mais rápida',
        '+8 de dano',
        '+1 bola',
        '+25% de área e +6 de dano',
      ],
    },
    psyshock: {
      description: 'Orbes psíquicos saem em todas as direções e voltam.',
      upgrades: [
        '+1 orbe',
        '+3 de dano',
        '+20% de área',
        '+1 orbe',
        '+4 de dano',
        'Orbes mais rápidos',
        '+2 orbes',
      ],
    },
    earthquake: {
      description: 'Tremor que machuca tudo ao redor. Recarga longa.',
      upgrades: [
        '+8 de dano',
        '+20% de área',
        'Recarga 0.4s mais rápida',
        '+1 tremor',
        '+10 de dano',
        '+25% de área',
        '+1 tremor e +10 de dano',
      ],
    },
    drumBeating: {
      description: 'Batidas de tambor: ondas de raízes que desaceleram inimigos.',
      upgrades: [
        '+4 de dano',
        '+20% de área',
        '+1 batida',
        'Recarga 0.25s mais rápida',
        '+5 de dano',
        '+1 batida',
        '+25% de área e +5 de dano',
      ],
    },
    disarmingVoice: {
      description: 'Ondas de corações em todas as direções.',
      upgrades: [
        '+2 corações',
        '+3 de dano',
        'Atravessa +1 inimigo',
        'Recarga 0.2s mais rápida',
        '+2 corações',
        '+4 de dano',
        '+4 corações',
      ],
    },
    torchSong: {
      description: 'Canto flamejante: notas de fogo em todas as direções.',
      upgrades: [
        '+1 nota',
        '+3 de dano',
        'Atravessa +1 inimigo',
        '+2 notas',
        'Recarga 0.3s mais rápida',
        '+5 de dano',
        '+2 notas e +20% de área',
      ],
    },
    leafBlade: {
      description: 'Lâmina giratória que corta tudo ao seu redor.',
      upgrades: [
        '+4 de dano',
        '+20% de área',
        '+1 lâmina',
        'Recarga 0.2s mais rápida',
        '+6 de dano',
        '+20% de área',
        '+1 lâmina',
      ],
    },
    razorShell: {
      description: 'Golpe de concha afiada em arco à sua frente.',
      upgrades: [
        'Também ataca atrás',
        '+5 de dano',
        '+20% de área',
        'Recarga 0.15s mais rápida',
        '+6 de dano',
        '+20% de área',
        '+1 golpe e +6 de dano',
      ],
    },
    flamethrower: {
      description: 'Jorro de fogo contínuo que atravessa tudo pela frente.',
      upgrades: [],
    },
    fireBlast: {
      description: 'Grandes chamas em forma de ★ orbitam ao seu redor.',
      upgrades: [],
    },
    hydroPump: {
      description: 'Jatos d’água de alta pressão que atravessam e arremessam inimigos.',
      upgrades: [],
    },
    surf: {
      description: 'Ondas gigantes se espalham ao seu redor, empurrando e desacelerando.',
      upgrades: [],
    },
    leafStorm: {
      description: 'Tempestade de folhas em todas as direções, que voltam como bumerangue.',
      upgrades: [],
    },
    powerWhip: {
      description: 'Cipós espinhosos e enormes chicoteiam dos dois lados.',
      upgrades: [],
    },
    triAttack: {
      description: 'Triângulos de fogo, gelo e raio perseguem vários alvos.',
      upgrades: [],
    },
    wildboltStorm: {
      description: 'Uma tempestade de raios castiga a tela inteira.',
      upgrades: [],
    },
    gunkShot: {
      description: 'Arremessa montanhas de lixo tóxico que deixam poças enormes.',
      upgrades: [],
    },
    hurricane: {
      description: 'Tornados giram ao seu redor, sugando e jogando inimigos longe.',
      upgrades: [],
    },
  },

  items: {
    muscleBand: '+10% de dano em todos os golpes.',
    quickClaw: 'Golpes recarregam 8% mais rápido.',
    wideLens: '+10% de área dos golpes.',
    lightClay: 'Efeitos duram 12% a mais.',
    loadedDice: '+1 projétil em golpes com múltiplos acertos.',
    leftovers: 'Recupera 0.3 HP por segundo.',
    choiceScarf: '+8% de velocidade de movimento.',
    luckyEgg: '+10% de EXP recebida.',
    dowsingMachine: 'Atrai Exp. Candies de mais longe.',
    kingsRock: '+6% de chance de causar status (queimar, envenenar, paralisar).',
    toxicOrb: 'Queimadura e veneno causam +20% de dano.',
    assaultVest: '+20 HP máximo e +1 de defesa.',
    charcoal: typeBoost('Fogo'),
    mysticWater: typeBoost('Água'),
    miracleSeed: typeBoost('Planta'),
    silkScarf: typeBoost('Normal'),
    magnet: typeBoost('Elétrico'),
    poisonBarb: typeBoost('Veneno'),
    sharpBeak: typeBoost('Voador'),
  },

  upgrades: {
    hpUp: '+10 de HP máximo por nível.',
    protein: '+5% de dano por nível.',
    iron: '+1 de defesa por nível.',
    carbos: '+5% de velocidade por nível.',
    calcium: '+5% de área dos golpes por nível.',
    zinc: 'Golpes recarregam 2,5% mais rápido por nível.',
    ppUp: '+1 projétil em todos os golpes.',
    expCharm: '+3% de EXP recebida por nível.',
    amuletCoin: '+10% de ₽ ganhos por nível.',
    abilityCapsule: '+1 troca de opções por partida ao subir de nível.',
    escapeRope: '+1 pulo de subida de nível por partida.',
  },

  consumables: {
    potion: 'Recuperou 30 HP.',
    superPotion: 'Recuperou 60 HP.',
    rareCandy: 'Subiu de nível!',
    expShare: 'Todos os Exp. Candies vieram até você!',
    pokeFlute: 'Os Pokémon selvagens adormeceram!',
    maxRepel: 'Nenhum Pokémon selvagem se aproxima!',
    explosion: 'usou Explosion!',
    xAttack: 'O Ataque aumentou muito!',
    xSpeed: 'A Velocidade aumentou muito!',
    revive: 'Guardado para quando você desmaiar.',
  },

  blurbs: {
    bulbasaur: 'Equilibrado. Regenera vida.',
    charmander: 'Ofensivo. Mais dano, menos vida.',
    squirtle: 'Defensivo. Mais vida e defesa.',
    chikorita: 'Curandeira. Muita vida e regeneração.',
    cyndaquil: 'Labaredas. Golpes maiores e mais longos.',
    totodile: 'Brigão. Mordidas fortes e casca grossa.',
    treecko: 'Veloz. Corre muito, mas é frágil.',
    torchic: 'Lutador. Chutes de fogo cada vez mais fortes.',
    mudkip: 'Tanque. Aguenta pancada e revida no chão.',
    turtwig: 'Fortaleza. Lento, blindado e sísmico.',
    chimchar: 'Ágil. Combos rápidos de socos.',
    piplup: 'Orgulhoso. Defesa e disparos de aço.',
    snivy: 'Elegante. Rápido e com ímã maior.',
    tepig: 'Pesado. Muita vida e golpes brutos.',
    oshawott: 'Espadachim. Cortes de concha em arco.',
    chespin: 'Espinhoso. Defesa alta, soca de perto.',
    fennekin: 'Mística. Poderes psíquicos e área maior.',
    froakie: 'Ninja. Muito rápido, pouca vida.',
    rowlet: 'Arqueiro. Flechas rápidas e certeiras.',
    litten: 'Lutador sombrio. Dano alto e resistente.',
    popplio: 'Artista. Canta, cura e acerta em volta.',
    grookey: 'Ritmado. Ondas que freiam a horda.',
    scorbunny: 'Artilheiro. Chutes explosivos e velocidade.',
    sobble: 'Atirador. Projéteis rápidos e fortes.',
    sprigatito: 'Trapaceira. Recarga curta e mais EXP.',
    fuecoco: 'Tranquilo. Muita vida e canções de fogo.',
    quaxly: 'Dançarino. Gira na água e golpeia.',
  },

  specials: {
    dash: 'Investida em chamas que deixa um rastro de fogo.',
    beam: 'Jato concentrado na direção em que você anda.',
    roots: 'Anéis de raízes brotam do chão e desaceleram.',
    nova: 'Onda de choque ao redor que empurra tudo.',
  },

  /** Explainer toast the first time each enemy trait shows up in a run. */
  traits: {
    healer: (name: string) => `*${name}* cura os aliados por perto. Derrube primeiro!`,
    shield: (name: string) => `*${name}* protege os aliados com um _escudo_ que absorve dano.`,
    summoner: (name: string) => `*${name}* chama reforços de tempos em tempos.`,
    kamikaze: (name: string) => `*${name}* pisca e _explode_! Saia do círculo vermelho.`,
    beam: (name: string) => `*${name}* mira um _raio_: saia da linha no chão!`,
    leaper: (name: string) => `*${name}* salta sobre a horda: fuja da _sombra_!`,
  } satisfies Record<TraitId, (name: string) => string>,
} satisfies ContentTexts & Record<string, unknown>

export type Messages = typeof pt
