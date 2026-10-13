import type { Drop } from '../../data/consumables'
import type { PokeType } from '../../data/types'
import type { StatusKind } from '../../game/status'

/** Number in Brazilian format (`1.250`, `0,75`). */
const n = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
const s = (count: number, one: string, many: string) => (count === 1 ? one : many)
/** `a, b e c` */
const list = (items: readonly string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} e ${items.at(-1)}`)

/**
 * Copy of the static site pages (Pokédex, guide, changelog, legal), in Brazilian
 * Portuguese. Like the game's `pt.ts`, this is the reference: `SiteMessages` is
 * inferred from it and `en.ts` must match it key for key. Game content
 * (move, item and special descriptions, blurbs) comes from the game's own messages.
 */
export const sitePt = {
  lang: { tag: 'pt-BR', og: 'pt_BR', short: 'PT', switchTo: 'Ver em português' },
  skip: 'Pular para o conteúdo',
  nav: {
    label: 'Navegação principal',
    play: 'Jogar',
    pokedex: 'Pokédex',
    guide: 'Guia',
    changelog: 'Novidades',
    legal: 'Legal',
    language: 'Idioma',
  },
  footer: {
    disclaimer:
      'Pokémon Survivors é um fan game não oficial, gratuito e sem fins lucrativos. Não tem vínculo com Nintendo, The Pokémon Company, GAME FREAK, Creatures ou Spike Chunsoft, nem é endossado por elas. Pokémon e os nomes dos personagens são marcas registradas da Nintendo.',
    legal: 'Legal e privacidade',
    credits: 'Créditos',
    source: 'Código no GitHub',
  },
  home: 'Início',
  playCta: 'Jogar grátis',

  types: {
    normal: 'Normal', fire: 'Fogo', water: 'Água', grass: 'Planta', electric: 'Elétrico', poison: 'Veneno',
    flying: 'Voador', bug: 'Inseto', rock: 'Pedra', ground: 'Terra', ghost: 'Fantasma', fighting: 'Lutador',
    psychic: 'Psíquico', ice: 'Gelo', steel: 'Aço', dark: 'Sombrio', fairy: 'Fada',
  } satisfies Record<PokeType, string>,

  pokedex: {
    title: 'Pokédex do Pokémon Survivors: iniciais, inimigos, chefes e lendários',
    description:
      'Todos os Pokémon do Pokémon Survivors com sprite animado e shiny: os 27 iniciais e suas evoluções, inimigos selvagens, chefes e lendários. Tipos, status no jogo, golpes, especiais e quando cada um aparece.',
    h1: 'Pokédex',
    intro: (count: number) =>
      `Os ${count} Pokémon que existem no Pokémon Survivors, com os números do jogo: iniciais de todas as regiões e suas evoluções, a horda selvagem, os chefes e os lendários. Passe o mouse (ou toque) para ver o sprite andando e use ★ para ver o shiny.`,
    filters: 'Filtros',
    search: 'Buscar',
    searchPlaceholder: 'Nome ou número',
    region: 'Região',
    type: 'Tipo',
    role: 'Papel',
    all: 'Todos',
    allRegions: 'Todas',
    shinyAll: 'Shiny',
    shinyToggle: (name: string) => `Ver ${name} shiny`,
    results: (count: number) => `${count} ${s(count, 'Pokémon encontrado', 'Pokémon encontrados')}`,
    empty: 'Nenhum Pokémon com esses filtros.',
    clear: 'Limpar filtros',
    roles: { starter: 'Inicial', enemy: 'Selvagem', boss: 'Chefe', legendary: 'Lendário' },
    roleFilter: { starter: 'Iniciais', enemy: 'Selvagens', boss: 'Chefes', legendary: 'Lendários' },
    link: (name: string) => `Link para ${name}`,
    portrait: (name: string) => `Retrato de ${name}`,
    sprite: (name: string) => `Sprite animado de ${name}`,
    stats: 'Status no jogo',
    statsNote: 'Sem itens nem melhorias do Poké Mart.',
    evolution: 'Linha evolutiva',
    evolvesAt: (level: number) => `Nv ${level}`,
    stageOf: (stage: number) => ['Estágio inicial', 'Primeira evolução', 'Evolução final'][stage] ?? '',
    signature: 'Golpe inicial',
    special: 'Ataque especial',
    specialFinal: 'Na evolução final',
    learnset: 'Golpes que aprende',
    wildStats: { hp: 'HP', damage: 'Dano de contato', speed: 'Velocidade', xp: 'EXP' },
    wildNote: 'Valores base. Inimigos comuns ficam mais fortes a cada minuto; chefes, não.',
    appears: 'Quando aparece',
    horde: (from: string, until: string) => `Na horda, de ${from} a ${until}`,
    hordeEnd: (from: string) => `Na horda, de ${from} até o fim`,
    swarm: (at: string, count: number) => `Revoada de ${count} em ${at}`,
    ring: (at: string, count: number) => `Cerco de ${count} em ${at}`,
    boss: (at: string) => `Chefe em ${at}`,
    bossChance: (at: string, percent: number) => `Chefe em ${at} (${n(percent)}% de chance)`,
    attacks: 'Ataques',
    shinyNote: 'Pode aparecer shiny (1 em 450): elite com 8x HP.',
  },

  /** Boss attack patterns, built from `data/bosses.ts`. */
  patterns: {
    strikesPlayer: (count: number, every: number, damage: number) =>
      `${count} ${s(count, 'impacto marcado', 'impactos marcados')} no chão perto de você a cada ${n(every)}s (${damage} de dano)`,
    strikesSelf: (every: number, damage: number) => `Pancada em área ao redor de si a cada ${n(every)}s (${damage} de dano)`,
    ring: (count: number, every: number, damage: number) => `Anel de ${count} projéteis a cada ${n(every)}s (${damage} de dano)`,
    trail: (ttl: number, damage: number) => `Deixa um rastro que queima por ${n(ttl)}s (${damage} de dano)`,
  },

  guide: {
    title: 'Como jogar Pokémon Survivors: guia completo',
    description:
      'Guia do Pokémon Survivors: controles no teclado, controle e celular, como funciona a partida, níveis, golpes, evolução de golpes com itens, ataque especial, tipos e status, chefes, shinies, itens do mapa e Poké Mart.',
    h1: 'Como jogar',
    intro:
      'Pokémon Survivors é um roguelite estilo Vampire Survivors: você só anda, e o seu Pokémon ataca sozinho. Este guia explica tudo o que acontece numa partida, com os números do jogo.',
    toc: 'Neste guia',
    sections: {
      controls: 'Controles',
      run: 'A partida',
      levels: 'Níveis e golpes',
      moveEvolutions: 'Evolução de golpes',
      special: 'Ataque especial',
      types: 'Tipos e status',
      bosses: 'Chefes',
      shinies: 'Shinies',
      items: 'Itens no mapa',
      mart: 'Poké Mart e Poké Dollars',
      settings: 'Ajustes e música',
    },
    controls: {
      head: { action: 'Ação', keyboard: 'Teclado', gamepad: 'Controle', touch: 'Toque' },
      rows: [
        ['Andar', 'WASD ou setas', '— (ainda não)', 'Arraste em qualquer lugar da tela (joystick flutuante)'],
        ['Ataque especial', 'Espaço', 'A (Xbox) ou ✕ (PlayStation)', 'Botão redondo no canto inferior direito'],
        ['Pausar', 'Esc ou P', 'Start', 'Botão no canto superior direito'],
        ['Navegar nos menus', 'Setas, Enter confirma, Esc volta', 'D-pad ou analógico esquerdo, A confirma, B volta', 'Toque'],
        ['Escolher upgrade', '1 a 3, ou ↑ ↓ e Enter', 'D-pad e A', 'Toque na opção'],
        ['Escolher o inicial', '← → parceiro, ↑ ↓ região, 1 a 9, Enter', 'D-pad e A', 'Toque para ver, toque de novo para escolher'],
        ['Abrir o Poké Mart', 'L na escolha de parceiro', '—', 'Botão POKé MART, no canto superior direito'],
        ['Som liga/desliga', 'M', 'Ajustes', 'Ajustes'],
        ['Idioma', 'I na tela de título, ou Ajustes', 'Ajustes', 'PT | EN na tela de título, ou Ajustes'],
      ],
      notes: [
        'No controle, o D-pad e o analógico esquerdo navegam em todos os menus, A confirma, B volta e Start pausa. Dentro da partida, A usa o ataque especial, mas o controle ainda não move o Pokémon: para andar, use o teclado ou o toque.',
        'No celular, dá para instalar o jogo como app em tela cheia: abra o menu do navegador e escolha "Adicionar à tela inicial".',
      ],
    },
    run: {
      paragraphs: (minutes: number, starters: number) => [
        `Escolha um dos ${starters} iniciais, de Kanto a Paldea. Cada um tem status, golpe inicial, golpes que aprende e um ataque especial próprios (veja a Pokédex).`,
        `Ande pelo campo e desvie: os golpes disparam sozinhos no ritmo da recarga. Sobreviva ${minutes} minutos de hordas cada vez maiores. No fim, Mewtwo aparece, e derrotá-lo vence a partida.`,
        'Se o seu HP chegar a zero, a partida acaba (a não ser que você tenha um Revive guardado). Os Poké Dollars coletados vão para a carteira.',
      ],
      scaling: (rows: readonly (readonly [string, string, string])[]) =>
        `Os inimigos comuns ficam mais fortes a cada minuto (chefes não): ${rows.map(([at, hp, dmg]) => `em ${at}, ${hp}x de HP e ${dmg}x de dano`).join('; ')}.`,
      timeline: 'Linha do tempo',
      timeHead: 'Tempo',
      eventHead: 'Evento',
      swarm: (count: number, name: string) => `Revoada: ${count} ${name} cruzam a tela`,
      ring: (count: number, name: string) => `Cerco: um círculo de ${count} ${name} se fecha ao seu redor`,
      boss: (name: string) => `Chefe: ${name}`,
      bossChance: (name: string, percent: number) => `Chefe raro: ${name} (${n(percent)}% de chance)`,
    },
    levels: {
      paragraphs: (moves: number, items: number, moveLevel: number) => [
        'Pokémon derrotados soltam Exp. Candies. Ande perto deles para coletar (a Dowsing Machine aumenta o alcance).',
        `A cada nível, escolha 1 de 3 ofertas: um golpe novo da lista do seu Pokémon, um upgrade de golpe, um held item novo ou mais um nível de item. Você pode ter até ${moves} golpes e ${items} itens. Golpes vão até o Nv ${moveLevel}.`,
        'Itens de tipo (Charcoal, Mystic Water…) só aparecem se o seu Pokémon aprende golpes daquele tipo. Quando não sobra nada para oferecer, vem uma Oran Berry (+40 HP).',
        'Trocar (sortear outras ofertas) e Pular (dispensar a subida de nível sem escolher nada, útil quando nenhuma oferta serve) são cargas compradas no Poké Mart.',
      ],
      evolution: (first: number, second: number) =>
        `Seu Pokémon evolui no Nv ${first} e no Nv ${second}, como nos jogos. Cada evolução dá mais HP e status, e a evolução final fortalece o ataque especial.`,
      itemsTitle: 'Held items',
      itemHead: 'Item',
      effectHead: 'Efeito por nível',
      levelsHead: 'Níveis',
    },
    moveEvolutions: {
      paragraphs: [
        'Como no Vampire Survivors: leve um golpe ao nível máximo e segure o item pareado. Na próxima subida de nível (ou na próxima Poké Ball), a evolução aparece como oferta e substitui o golpe no mesmo espaço.',
        'Um item pode evoluir mais de um golpe: Charcoal serve para Ember e para Fire Spin, por exemplo.',
      ],
      moveHead: 'Golpe (nível máx.)',
      itemHead: 'Item',
      resultHead: 'Evolução',
      noEvolution: (moves: string) => `Ainda sem evolução: ${moves}.`,
    },
    special: {
      paragraphs: (min: number) => [
        'Além dos golpes automáticos, todo Pokémon tem um ataque especial manual: aperte Espaço, o botão A / ✕ do controle ou o botão redondo na tela. Ele carrega por um instante (você anda mais devagar) e depois dispara na direção em que você está andando.',
        `O especial depende do tipo do seu inicial. A recarga diminui com o status Recarga, até o mínimo de ${min}s. Na evolução final ele vira a versão mais forte, com mais dano e área.`,
      ],
      typeHead: 'Tipo',
      moveHead: 'Especial → evolução final',
      cooldownHead: 'Recarga',
    },
    types: {
      chart: (strong: string, double: string, weak: string, immune: string) =>
        `O dano usa a tabela de tipos real, suavizada para nenhuma build ficar inútil: super efetivo causa ${strong}x, duplamente super efetivo ${double}x, pouco efetivo ${weak}x, e imunidade vira ${immune}x. Números amarelos com "!" indicam golpe super efetivo.`,
      statusIntro: 'Alguns golpes causam condições de status. Chance e força crescem com upgrades e itens.',
      statusHead: 'Status',
      movesHead: 'Causado por',
      effectHead: 'Efeito',
      names: { burn: 'Queimadura', poison: 'Veneno', paralysis: 'Paralisia', slow: 'Lentidão', sleep: 'Sono' } satisfies Record<StatusKind, string>,
      effects: {
        burn: (attack: number) => `Dano por segundo. O inimigo queimado causa só ${n(attack * 100)}% do dano de contato.`,
        poison: (stacks: number) => `Dano por segundo que acumula até ${stacks}x.`,
        paralysis: (boss: number) => `Trava o inimigo por um instante e depois ele engasga de vez em quando. Em chefes dura ${n(boss * 100)}% do tempo.`,
        slow: (boss: number) => `Desacelera quem está perto. Em chefes dura ${n(boss * 100)}% do tempo.`,
        sleep: (seconds: number, boss: number) => `Os inimigos na tela dormem por ${seconds}s. Em chefes dura ${n(boss * 100)}% do tempo.`,
      } satisfies Record<StatusKind, unknown>,
      flute: 'Poké Flute (item do mapa)',
      itemsNote: 'King\'s Rock aumenta a chance de status, Toxic Orb aumenta o dano de queimadura e veneno, e Light Clay faz os status durarem mais.',
    },
    bosses: {
      paragraphs: [
        'Os chefes chegam em horários fixos. Os lendários entram com flash na tela, cry e um aviso. Todos têm uma barra de HP no topo e ataques próprios: os círculos marcados no chão avisam onde o golpe vai cair, então saia de dentro deles.',
        'Chefes não ficam mais fortes com o tempo, mas cada um solta uma Poké Ball e uma chuva de Poké Dollars.',
      ],
      timeHead: 'Tempo',
      bossHead: 'Chefe',
      hpHead: 'HP',
      attacksHead: 'Ataques',
    },
    shinies: {
      paragraphs: (wild: number, hp: number, xp: number, player: number) => [
        `Cada Pokémon selvagem comum tem 1 chance em ${n(wild)} de nascer shiny. Ele vira uma elite com ${hp}x de HP e ${xp}x de EXP, e sempre solta uma Poké Ball e Poké Dollars. Chefes e lendários nunca são shiny.`,
        `O seu inicial tem 1 chance em ${player} de ser shiny, e continua shiny em todas as evoluções daquela partida.`,
        'A Poké Ball (de chefes e shinies) dá um upgrade aleatório na hora, ou uma evolução de golpe se alguma estiver pronta.',
      ],
      seeAll: 'Veja todos os shinies na Pokédex',
    },
    items: {
      intro: 'Pelo mapa aparecem fontes de itens. Qualquer golpe quebra elas, e cada uma solta um item. Itens mais fortes ficam mais comuns no fim da partida.',
      sourceHead: 'Fonte',
      hitsHead: 'Golpes para quebrar',
      enemyNote: (berry: number, item: number) =>
        `Inimigos comuns também soltam uma Oran Berry (${n(berry)}% de chance) ou um item (${n(item)}%).`,
      sources: { itemBall: 'Item Ball', berryTree: 'Berry Tree', tallGrass: 'Mato alto', enemy: 'Inimigos' },
      itemHead: 'Item',
      effectHead: 'Efeito',
      whereHead: 'Onde aparece',
      effects: {
        oranBerry: 'Recupera 30% do HP máximo.',
        potion: 'Recupera 30 HP.',
        superPotion: 'Recupera 60 HP.',
        rareCandy: 'Sobe um nível na hora.',
        expShare: 'Puxa todos os Exp. Candies do mapa até você.',
        pokeFlute: 'Põe para dormir os Pokémon selvagens na tela.',
        maxRepel: 'Invulnerável por alguns segundos, empurrando os inimigos para longe.',
        explosion: 'Voltorb usa Explosion: derruba todos os inimigos comuns na tela e tira 10% do HP de chefes.',
        xAttack: 'Mais 50% de dano por 20s.',
        xSpeed: 'Mais velocidade e recarga mais rápida por 20s.',
        revive: 'Fica guardado. Quando você desmaiar, levanta com 50% do HP.',
      } satisfies Record<Drop, string>,
    },
    mart: {
      paragraphs: (coins: readonly number[], minute: number, kills: number, victory: number) => [
        `Inimigos derrotados às vezes soltam Poké Dollars: moeda, pilha e saco (${list(coins.map((c) => `₽${n(c)}`))}). Os mais fortes soltam com mais frequência, e chefes e shinies sempre pagam.`,
        `No fim da partida entra um bônus: ₽${minute} por minuto sobrevivido, ₽1 a cada ${kills} derrotados e ₽${n(victory)} pela vitória. Quem desiste pela pausa fica com as moedas, mas perde o bônus.`,
        'Gaste tudo no Poké Mart (botão no canto superior direito da escolha de parceiro) em melhorias permanentes. O botão Reembolsar devolve tudo o que você gastou, para testar outras combinações. O progresso fica salvo só neste navegador.',
      ],
      upgradeHead: 'Melhoria',
      effectHead: 'Efeito',
      pricesHead: 'Preço por nível',
    },
    settings: {
      paragraphs: [
        'Os Ajustes ficam no menu da tela de título e no menu de pausa, que tem só Continuar · Ajustes · Desistir. Tudo vale na hora e fica salvo neste navegador.',
        'A trilha sonora é original, em estilo chiptune, composta em código e sintetizada ao vivo no navegador, sem arquivos de áudio: um tema de vila nos menus, uma marcha durante a partida e um tema de chefe enquanto um chefe está vivo.',
      ],
      optionHead: 'Opção',
      effectHead: 'O que faz',
      rows: [
        ['Música', 'Volume da trilha sonora.'],
        ['Efeitos', 'Volume dos efeitos sonoros e dos cries.'],
        ['Som', 'Liga ou desliga todo o som (atalho: M).'],
        ['Números de dano', 'Mostra ou esconde os números de dano na tela.'],
        ['Tremor de tela', 'Liga ou desliga o tremor em explosões e golpes fortes.'],
        ['Idioma', 'Troca entre português e inglês.'],
      ],
    },
    cta: 'Pronto? Escolha seu parceiro e jogue.',
  },

  changelog: {
    title: 'Novidades do Pokémon Survivors: histórico de atualizações',
    description:
      'Tudo o que mudou no Pokémon Survivors, atualização por atualização: iniciais, chefes lendários, shinies, evolução de golpes, Poké Mart, versão mobile e mais.',
    h1: 'Novidades',
    intro: 'O histórico de atualizações do jogo, da mais nova para a mais antiga. Cada entrada leva ao pull request com os detalhes no GitHub.',
    pr: (n: number) => `PR #${n}`,
  },

  legal: {
    title: 'Legal, privacidade e créditos | Pokémon Survivors',
    description:
      'Pokémon Survivors é um fan game não oficial e gratuito, sem anúncios e sem compras. Licenças (código MIT, sprites CC BY-NC 4.0), privacidade (sem coleta de dados pessoais), créditos e contato.',
    h1: 'Legal, privacidade e créditos',
    sections: {
      fanGame: 'Fan game não oficial',
      free: 'Grátis, sem anúncios e sem compras',
      licenses: 'Licenças e créditos',
      privacy: 'Privacidade',
      contact: 'Contato e remoção de conteúdo',
    },
    fanGame: [
      'Pokémon Survivors é um fan game não oficial e sem fins lucrativos, feito por fãs para fãs por Pedro Barretto.',
      'Não tem nenhum vínculo com Nintendo, The Pokémon Company, GAME FREAK inc., Creatures Inc. ou Spike Chunsoft, nem é endossado, patrocinado ou aprovado por elas.',
      'Pokémon e os nomes dos personagens são marcas registradas da Nintendo. Pokémon © Nintendo, Creatures Inc. e GAME FREAK inc. As demais marcas pertencem aos seus donos.',
    ],
    free: [
      'O jogo é gratuito e vai continuar assim: não tem anúncios, conteúdo pago nem compras dentro do app.',
      'Poké Dollars (₽) existem só dentro do jogo e não podem ser comprados com dinheiro de verdade.',
    ],
    licenses: {
      code: 'Código-fonte',
      codeText: 'Licença MIT. Ela cobre só o código original deste projeto e não dá nenhum direito sobre personagens, nomes, sons ou artes de Pokémon.',
      sprites: 'Sprites e retratos',
      spritesText: 'PMD SpriteCollab, sob a licença CC BY-NC 4.0 (uso não comercial, com crédito). Cada artista está listado nos créditos.',
      creditsLink: 'Ver os créditos de cada artista (CREDITS.md)',
      cries: 'Cries (sons dos Pokémon)',
      criesText: 'PokéAPI/cries.',
      fonts: 'Fontes',
      fontsText: 'Press Start 2P e VT323, sob a SIL Open Font License (OFL). Servidas pelo próprio site.',
      inspiration: 'Inspiração',
      inspirationText: 'Vampire Survivors, da poncle.',
      nonCommercial: 'Como os sprites são CC BY-NC, o jogo como um todo não pode ser usado comercialmente.',
    },
    privacy: [
      'O jogo não tem cadastro, cookies, analytics, anúncios nem rastreadores, e não coleta dados pessoais.',
      'Tudo o que o jogo lembra fica no localStorage do seu navegador, no seu aparelho, e nunca é enviado para nenhum servidor:',
    ],
    storage: {
      'ps:save': 'Poké Dollars e melhorias compradas no Poké Mart.',
      'ps:settings': 'Ajustes: volume da música e dos efeitos, som ligado ou desligado, números de dano e tremor de tela.',
      'ps:lang': 'Idioma escolhido (português ou inglês).',
      'ps:muted': 'Só em quem jogou versões antigas: o som desligado de antes dos Ajustes. O jogo apenas lê essa chave, não grava mais.',
    },
    privacyAfter: [
      'Para apagar esses dados, limpe os dados do site nas configurações do navegador.',
      'Sprites, sons e fontes vêm do próprio site, sem chamadas a serviços de terceiros. O site é hospedado na Vercel, que, como qualquer servidor, pode registrar dados técnicos de acesso (como endereço IP) para operar e proteger o serviço.',
    ],
    contact: [
      'Se você tem direitos sobre algum material usado aqui e quer que ele seja removido ou ajustado, abra uma issue no GitHub. O pedido vai ser atendido rapidamente.',
      'Bugs e ideias também são bem-vindos por lá.',
    ],
    issues: 'Abrir uma issue no GitHub',
    source: 'Ver o código-fonte',
  },
}

export type SiteMessages = typeof sitePt
