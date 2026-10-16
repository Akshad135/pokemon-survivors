import type { BossStance } from '../../data/bosses'
import type { Drop } from '../../data/consumables'
import type { TraitId } from '../../data/traits'
import type { TrioId } from '../../data/waves'
import type { PokeType } from '../../data/types'
import type { EggSource } from '../../game/eggs'
import type { StatusKind } from '../../game/status'

/** Number in Brazilian format (`1.250`, `0,75`). */
const n = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
const s = (count: number, one: string, many: string) => (count === 1 ? one : many)
/** `a, b e c` */
const list = (items: readonly string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} e ${items.at(-1)}`)
/** `a, b ou c` */
const either = (items: readonly string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} ou ${items.at(-1)}`)

/** The boss rules the guide quotes (`BOSS_RAGE`, and the spawn share of `BOSS_FIGHT` and `FINALE`). */
type BossRules = { stance: readonly [number, number]; below: number; speed: number; wait: number; chain: number; fight: number; window: number; finale: number }
/** Elites and runners as the guide quotes them (`ELITE`, `RUNNER`; `from` is a clock like `1:00`). */
type HordeRules = { fill: number; share: number; hp: number; damage: number; from: string; speed: number; frail: number; lead: number }

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
    psychic: 'Psíquico', ice: 'Gelo', steel: 'Aço', dark: 'Sombrio', fairy: 'Fada', dragon: 'Dragão',
  } satisfies Record<PokeType, string>,

  pokedex: {
    title: 'Pokédex do Pokémon Survivors: iniciais, inimigos, chefes e lendários',
    description:
      'Todos os Pokémon do Pokémon Survivors com sprite animado e shiny: os 27 iniciais e as 52 famílias dos ovos com suas evoluções, inimigos selvagens, chefes e lendários. Tipos, status no jogo, golpes, especiais e quando cada um aparece.',
    h1: 'Pokédex',
    intro: (count: number) =>
      `Os ${count} Pokémon que existem no Pokémon Survivors, com os números do jogo: iniciais de todas as regiões, as famílias que saem dos ovos e suas evoluções, a horda selvagem, os chefes e os lendários. Passe o mouse (ou toque) para ver o sprite andando e use ★ para ver o shiny.`,
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
    roles: { starter: 'Inicial', egg: 'Ovo', enemy: 'Selvagem', boss: 'Chefe', legendary: 'Lendário', event: 'Evento' },
    roleFilter: { starter: 'Iniciais', egg: 'Ovos', enemy: 'Selvagens', boss: 'Chefes', legendary: 'Lendários', event: 'Eventos' },
    link: (name: string) => `Link para ${name}`,
    portrait: (name: string) => `Retrato de ${name}`,
    sprite: (name: string) => `Sprite animado de ${name}`,
    stats: 'Status no jogo',
    statsNote: 'Sem itens nem melhorias do Poké Mart.',
    evolution: 'Linha evolutiva',
    evolvesAt: (level: number) => `Nv ${level}`,
    hatchNote: (egg: string) => `Jogável depois de chocar de um ${egg}.`,
    stageOf: (stage: number) => ['Estágio inicial', 'Primeira evolução', 'Evolução final'][stage] ?? '',
    signature: 'Golpe inicial',
    special: 'Ataque especial',
    specialFinal: 'Na evolução final',
    learnset: 'Golpes que aprende',
    wildStats: { hp: 'HP', damage: 'Dano de contato', speed: 'Velocidade', xp: 'EXP' },
    eventNote: 'Aparece nos eventos do mapa: foge de você e solta moedas a cada golpe. Derrube ele antes que escape para ganhar o Pay Day.',
    wildNote: 'Valores base. Inimigos comuns ficam mais fortes a cada minuto; chefes, não.',
    appears: 'Quando aparece',
    horde: (from: string, until: string) => `Pode entrar na horda, de ${from} a ${until}`,
    hordeEnd: (from: string) => `Pode entrar na horda, de ${from} até o fim`,
    swarm: (at: string, count: number) => `Pode liderar a revoada de ${count} em ${at}`,
    ring: (at: string, count: number) => `Pode formar o cerco de ${count} em ${at}`,
    ringFixed: (at: string, count: number) => `Forma o cerco de ${count} em ${at}`,
    boss: (at: string) => `Chefe em ${at}`,
    bossChance: (at: string, percent: number) => `Chefe em ${at} (${n(percent)}% de chance)`,
    trio: (at: string, trio: string) => `Chefe em ${at} nas partidas que sorteiam o trio ${trio} (1 em 3)`,
    rift: (from: string) => `Atrás de uma fenda lendária, a partir de ${from} (arena opcional)`,
    reaper: (at: string) => `Ceifador do modo sem fim, a partir de ${at}`,
    attacks: 'Ataques',
    shinyNote: 'Pode aparecer shiny (1 em 450): elite com 8x HP.',
    summoned: (by: string) => `Chamado por ${by}`,
    behavior: 'Comportamento',
  },

  /** Enemy traits, built from `data/traits.ts`. */
  traits: {
    names: {
      healer: 'Curandeiro',
      shield: 'Escudo',
      summoner: 'Invocador',
      kamikaze: 'Kamikaze',
      beam: 'Raio',
      leaper: 'Saltador',
    } satisfies Record<TraitId, string>,
    effects: {
      healer: (every: number, percent: number) =>
        `A cada ${n(every)}s, um pulso verde cura ${n(percent)}% do HP máximo dos aliados feridos por perto.`,
      shield: (every: number, percent: number, duration: number) =>
        `A cada ${n(every)}s, envolve os aliados por perto num escudo que absorve dano igual a ${n(percent)}% do HP máximo deles, por ${n(duration)}s.`,
      summoner: (every: number, count: number, max: number, names: readonly string[]) =>
        `A cada ${n(every)}s chama ${count} reforços (${list(names)}), até ${max} ao mesmo tempo.`,
      kamikaze: (fuse: number, damage: number, percent: number) =>
        `Chega perto, para, pisca em vermelho e explode depois de ${n(fuse)}s. A explosão causa ${n(damage)}x o dano de contato em você e tira ${n(percent)}% do HP dos inimigos no círculo.`,
      beam: (aim: number, damage: number) => `Para, desenha no chão a linha do raio por ${n(aim)}s e dispara: ${n(damage)}x o dano de contato.`,
      leaper: (warn: number, damage: number) =>
        `Salta sobre a horda até onde você estava. A sombra no chão marca a queda ${n(warn)}s antes, e o impacto causa ${n(damage)}x o dano de contato.`,
    } satisfies Record<TraitId, unknown>,
    tips: {
      healer: 'Derrube primeiro, senão a horda volta a encher a vida.',
      shield: 'Números azuis são dano absorvido. Derrube o escudeiro ou espere o escudo piscar e sumir.',
      summoner: 'Os reforços param quando ela cai.',
      kamikaze: 'Saia do círculo vermelho, ou atraia para o meio da horda: a explosão fere os inimigos também.',
      beam: 'A mira trava quando a linha aparece: um passo para o lado basta.',
      leaper: 'Saia de cima da sombra antes da queda.',
    } satisfies Record<TraitId, string>,
  },

  /** Boss attack patterns, built from `data/bosses.ts`. */
  patterns: {
    strikesPlayer: (count: number, every: number, damage: number) =>
      `${count} ${s(count, 'impacto marcado', 'impactos marcados')} no chão perto de você a cada ${n(every)}s (${damage} de dano)`,
    strikesSelf: (every: number, damage: number) => `Pancada em área ao redor de si a cada ${n(every)}s (${damage} de dano)`,
    ring: (count: number, every: number, damage: number) => `Anel de ${count} projéteis a cada ${n(every)}s (${damage} de dano)`,
    trail: (ttl: number, damage: number) => `Deixa um rastro que fere por ${n(ttl)}s (${damage} de dano)`,
    stance: { close: 'De perto', ranged: 'De longe' } satisfies Record<BossStance, string>,
  },

  /** The legendary trios a run draws from (`TRIOS`), and `either` to name who may come. */
  trios: {
    names: { birds: 'Aves de Kanto', beasts: 'Feras de Johto', regis: 'Regis de Hoenn' } satisfies Record<TrioId, string>,
    either,
  },

  /** The wild roster: tiers and the cast each run draws (Pokédex filter and the guide's horde section). */
  roster: {
    tier: 'Faixa',
    tierOf: (tier: number) => `Faixa ${tier}`,
    allTiers: 'Todas',
    paragraphs: (species: number, perRun: number) => [
      `A horda tem ${species} espécies selvagens das 9 gerações, e cada partida sorteia o seu elenco: cerca de ${perRun} espécies, poucas novas por fase, para você reconhecer quem está chegando.`,
      'Cada espécie entra numa faixa pelo total de status base. As primeiras fases puxam da faixa 1 (Pokémon básicos fracos) e o fim da partida, das faixas 4 e 5 (evoluções). As revoadas pegam um Pokémon voador da faixa indicada e os cercos, um Pokémon da faixa que você já encontrou na partida.',
    ],
    special: (r: HordeRules) => [
      `Quando a horda passa de ${n(r.fill * 100)}% do limite da fase, quem nasce vem como elite (até ${n(r.share * 100)}% do limite), com contorno vermelho: ${n(r.hp)}x de HP e de EXP e ${n(r.damage)}x de dano. Limpar a tela evita que ela vire uma horda de elites. Na luta com o Mewtwo não nascem elites.`,
      `A partir de ${r.from}, uma das espécies novas de cada fase corre: ${n(r.speed)}x mais rápida (nunca mais que você sem bônus), com ${n(r.frail * 100)}% do HP, rastros de velocidade e mira em onde você vai estar, até ${n(r.lead)}s à frente. Correr em círculos não despista ela.`,
    ],
    formula: 'Os status no jogo saem dos status base: o HP vem da faixa e da defesa (HP, Defesa e Defesa Especial), o dano da faixa e do melhor ataque, a velocidade da Velocidade base, a EXP do HP e a resistência a empurrão do HP e da Defesa (voadores e fantasmas são mais leves).',
    tiersTitle: 'Faixas',
    tierHead: 'Faixa',
    totalHead: 'Total de status base',
    total: (min: number, max: number | null) => (max === null ? `${min} ou mais` : min === 0 ? `até ${max}` : `${min} a ${max}`),
    speciesHead: 'Espécies',
    examplesHead: 'Exemplos',
    stagesTitle: 'Faixas por fase',
    timeHead: 'Tempo',
    castHead: 'Faixas do elenco',
    /** `groups` = [tier, slots] pairs. */
    cast: (groups: readonly (readonly [number, number])[], fresh: number) =>
      `${list(groups.map(([tier, count]) => `${count} da faixa ${tier}`))} (${fresh} ${s(fresh, 'nova', 'novas')})`,
    swarm: (count: number, tier: number) => `Revoada: ${count} Pokémon voadores da faixa ${tier} cruzam a tela`,
    ring: (count: number, tier: number) => `Cerco: um círculo de ${count} Pokémon da faixa ${tier} se fecha ao seu redor`,
    ringOf: (count: number, name: string) => `Cerco: um círculo de ${count} ${name} se fecha ao seu redor`,
  },

  guide: {
    title: 'Como jogar Pokémon Survivors: guia completo',
    description:
      'Guia do Pokémon Survivors: controles no teclado, controle e celular, como funciona a partida, níveis, golpes, evolução de golpes com itens, ataque especial, tipos e status, chefes, shinies, itens e eventos do mapa e Poké Mart.',
    h1: 'Como jogar',
    intro:
      'Pokémon Survivors é um roguelite estilo Vampire Survivors: você só anda, e o seu Pokémon ataca sozinho. Este guia explica tudo o que acontece numa partida, com os números do jogo.',
    toc: 'Neste guia',
    sections: {
      controls: 'Controles',
      run: 'A partida',
      world: 'Biomas e clima',
      horde: 'A horda selvagem',
      levels: 'Níveis e golpes',
      moveEvolutions: 'Evolução de golpes',
      special: 'Ataque especial',
      types: 'Tipos e status',
      bosses: 'Chefes',
      traits: 'Inimigos especiais',
      rifts: 'Fendas lendárias e modo sem fim',
      megas: 'Mega Evolução',
      shinies: 'Shinies',
      eggs: 'Ovos e incubadora',
      items: 'Itens no mapa',
      mapEvents: 'Eventos no mapa',
      mart: 'Poké Mart e Poké Dollars',
      missions: 'Missões e conquistas',
      settings: 'Ajustes e música',
    },
    controls: {
      head: { action: 'Ação', keyboard: 'Teclado', gamepad: 'Controle', touch: 'Toque' },
      rows: [
        ['Andar', 'WASD ou setas', '— (ainda não)', 'Arraste em qualquer lugar da tela (joystick flutuante)'],
        ['Ataque especial', 'Espaço', 'A (Xbox) ou ✕ (PlayStation)', 'Botão redondo no canto inferior direito'],
        ['Mega Evolução', 'E', 'Y (Xbox) ou △ (PlayStation)', 'Botão MEGA, acima do especial'],
        ['Bote (Quick Attack, Extreme Speed)', 'Shift', 'X (Xbox) ou □ (PlayStation)', 'Botão redondo à esquerda do especial'],
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
        `Ande pelo campo e desvie: os golpes disparam sozinhos no ritmo da recarga. Sobreviva ${minutes} minutos de hordas cada vez maiores. No fim, Mewtwo aparece, e derrotá-lo vence a partida. Depois, se quiser, dá para continuar no modo sem fim.`,
        'Se o seu HP chegar a zero, a partida acaba (a não ser que você tenha um Revive guardado). Os Poké Dollars coletados vão para a carteira.',
      ],
      scaling: (rows: readonly (readonly [string, string, string])[]) =>
        `Os inimigos comuns ficam mais fortes a cada minuto (chefes não): ${rows.map(([at, hp, dmg]) => `em ${at}, ${hp}x de HP e ${dmg}x de dano`).join('; ')}.`,
      difficulty: 'Dificuldade',
      difficultyIntro:
        'Escolha a dificuldade na tela de seleção do Pokémon, embaixo do botão de escolher (ou com a tecla X). Todas já vêm liberadas e a escolha fica salva. O Normal é a partida base; os outros níveis multiplicam:',
      difficultyHead: ['Nível', 'HP dos inimigos', 'Dano que você leva', 'Ritmo de spawn', 'Velocidade dos inimigos', 'Escala por minuto', 'Cura'],
      timeline: 'Linha do tempo',
      timeHead: 'Tempo',
      eventHead: 'Evento',
      boss: (name: string) => `Chefe: ${name}`,
      bossChance: (name: string, percent: number) => `Chefe raro: ${name} (${n(percent)}% de chance)`,
      bossTrio: (names: string) => `Chefe: o trio lendário da partida (${names})`,
    },
    world: {
      paragraphs: (count: number, minutes: number, odds: number) => [
        `A partida atravessa ${count} biomas, ${n(minutes)} minutos em cada um, sem tela de carregamento: o chão se dissolve no cenário seguinte e cada bioma tem a sua música. Os itens quebráveis também mudam de cara (na caverna, a grama alta vira uma rocha e a árvore de frutas vira um cogumelo gigante).`,
        `Cada bioma puxa a horda para os seus tipos: as espécies novas de cada fase têm ${n(odds)}x mais chance de ser de um tipo da casa (mais Planta e Inseto na floresta, mais Pedra e Terra na caverna), sem deixar de lado os outros.`,
        'O clima muda algumas vezes por partida e vale para todo mundo: para os seus golpes e para os ataques dos inimigos. Cada bioma tem os seus climas mais prováveis, e o ícone do clima aparece ao lado do relógio.',
      ],
      timeHead: 'A partir de',
      biomeHead: 'Bioma',
      hordeHead: 'Tipos da horda',
      weatherHead: 'Climas (do mais ao menos comum)',
      weatherTitle: 'Climas',
      weatherCol: 'Clima',
      effectHead: 'Efeito',
      power: (type: string, mult: number) => `golpes de ${type} ×${n(mult)}`,
      chip: (enemy: number, boss: number, player: number, every: number, floor: number, immune: readonly string[]) =>
        `a cada ${n(every)}s, inimigos perdem ${n(enemy)}% do HP máximo (chefes, ${n(boss)}%) e você perde ${n(player)}%, mas nunca abaixo de ${n(floor)}% do HP. Os tipos ${list(immune)} ficam imunes`,
      fog: 'a visão fica curta: só dá para ver bem perto do seu Pokémon',
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
        'Além dos golpes automáticos, todo Pokémon tem um ataque especial manual: aperte Espaço, o botão A / ✕ do controle ou o botão redondo na tela. Ele carrega por um instante (você anda mais devagar) e depois dispara: alguns miram na direção em que você está andando, outros acertam tudo ao redor ou caem do céu nos inimigos mais próximos. Quick Attack e Extreme Speed também são manuais, porque movem você: aperte Shift, X / □ ou o botão de bote para avançar contra o inimigo à frente.',
        `Cada um dos 18 tipos tem o seu especial, e o seu Pokémon usa o do primeiro tipo dele. A recarga diminui com o status Recarga, até o mínimo de ${min}s. Na evolução final ele vira a versão mais forte, com mais dano e área.`,
        'Algumas linhagens ágeis trocam o especial do tipo por uma investida em cadeia: o Pokémon avança cortando até o inimigo mais próximo e, se acertar, tem meio segundo para apertar de novo e saltar ao próximo, até o limite de saltos. A recarga só começa quando a cadeia acaba. O Aegislash troca o especial pela Mudança de Postura: alterna entre a Forma Escudo, que recebe menos dano, e a Forma Lâmina, que bate mais forte.',
      ],
      typeHead: 'Tipo',
      moveHead: 'Especial → evolução final',
      cooldownHead: 'Recarga',
      usersHead: 'Quem usa',
      noUsers: 'Nenhum Pokémon jogável ainda',
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
    megas: {
      paragraphs: (m: { lines: number; twins: string; duration: number; recharge: number; intro: string }) => [
        `${m.lines} linhagens podem Mega Evoluir. O primeiro lendário de fenda que você vencer com uma delas deixa a Mega Stone da linhagem junto com o tesouro. ${m.twins} têm duas Megas: o lendário deixa as duas pedras e a que você pegar decide a Mega (a outra se desfaz). Com a pedra na mão e o Pokémon na evolução final, aparece o botão MEGA (tecla E, ou Y no controle).`,
        `Ao apertar, a Pedra-chave reage: o mundo para por ${m.intro}s enquanto a energia de arco-íris envolve o Pokémon, e a Mega Evolução termina numa explosão que empurra e fere a horda ao redor e deixa você invulnerável por um instante. A forma Mega dura ${m.duration}s, ganha os status abaixo, troca o especial pelo dela (pronto para usar na hora) e ativa a habilidade. Depois ela volta ao normal e precisa de ${m.recharge}s para Mega Evoluir de novo: guarde para um chefe, uma fenda ou um cerco.`,
      ],
      megaHead: 'Mega',
      stoneHead: 'Mega Stone',
      abilityHead: 'Habilidade',
      specialHead: 'Especial Mega',
    },
    rifts: {
      paragraphs: (r: { first: string; every: number; bossWait: number; portal: number; enter: number; arena: number; shiny: number }) => [
        `A partir de ${r.first}, mais ou menos a cada ${n(r.every)} minutos, uma fenda lendária se abre fora da tela, com uma seta roxa na borda apontando para ela. Ela fica aberta por ${r.portal}s. Se um chefe estiver vivo na hora, ela espera ele cair por até ${r.bossWait}s, então toda partida tem 3 fendas, mesmo que os chefes demorem.`,
        `Entrar é opcional: fique ${n(r.enter)}s dentro da fenda. Ela leva você à arena de um lendário de outra geração, cada uma com seu formato e seu terreno: ilhas em água rasa, pilares para se proteger, um poço cuja maré sobe, rios de lava com pontes, uma borda que desaba, uma ilha cercada de arrebentação, um meteoro no espaço. Você tem ${r.arena}s para vencê-lo; se o tempo acabar, a fenda colapsa e joga você de volta sem recompensa.`,
        'O relógio da partida continua correndo lá dentro, mas a horda lá fora fica congelada e nada novo nasce. Quando você volta, os inimigos ficam mais fortes porque o tempo passou, e os eventos que ficaram para trás chegam de uma vez.',
        `A recompensa vale o risco: muita EXP, dois sacos de ₽ além da chuva de chefe, Poké Balls extras, uma Rare Candy, uma Super Potion e metade do HP de volta. Em 1 de ${r.shiny} fendas o lendário é shiny e paga o dobro de ₽ e mais uma Poké Ball.`,
      ],
      legendHead: 'Lendário',
      typesHead: 'Tipos',
      hpHead: 'HP base',
      attacksHead: 'Ataques',
      hpNote: (percent: number) => `O HP base é o da primeira fenda, às 3:30. Depois, o HP e o dano de contato do lendário crescem com o relógio: +${n(percent)}% de HP por minuto. Cada fenda traz um lendário diferente.`,
      endlessTitle: 'Modo sem fim',
      endless: (e: { every: number; reaper: string; hp: string; returns: number; perMinute: number; reaperBonus: string }) => [
        'Depois de derrotar Mewtwo, a tela de vitória oferece continuar no modo sem fim. Quem não quiser sai com a vitória normal, e o bônus já é pago na hora.',
        `A horda não para de crescer: nascem mais inimigos, o limite na tela sobe e cercos e revoadas chegam a cada ${e.every} segundos. As fendas continuam abrindo.`,
        `Às ${e.reaper}, Arceus desce para caçar você. Ele fica mais rápido quanto mais tempo caça, até ninguém conseguir fugir, e nunca se perde: se você se afastar, ele reaparece na borda da tela. Dá para derrotá-lo, mas ele tem ${e.hp} de HP; se cair, volta ${e.returns} minutos depois, mais forte.`,
        `O tempo sobrevivido é a métrica principal: cada minuto depois de 15:00 paga ₽${n(e.perMinute)} no bônus, e cada Arceus derrotado mais ₽${e.reaperBonus}.`,
      ],
    },
    bosses: {
      paragraphs: (r: BossRules) => [
        'Os chefes chegam em horários fixos. Os lendários entram com flash na tela, cry e um aviso. Todos têm uma barra de HP no topo e ataques próprios: os círculos marcados no chão avisam onde o golpe vai cair, então saia de dentro deles.',
        `Cada chefe alterna entre dois jeitos de lutar a cada ${r.stance[0]} a ${r.stance[1]} segundos: de perto, ele avança rápido e bate em área ao redor de si; de longe, para a alguns passos e mira em você. Abaixo de ${n(r.below * 100)}% do HP ele fica furioso (contorno vermelho, cry e flash na tela): ${n(Math.round((r.speed - 1) * 100))}% mais rápido, ataca ${n(Math.round((1 - r.wait) * 100))}% mais seguido e, ${n(r.chain * 100)}% das vezes, emenda um segundo ataque logo depois do primeiro.`,
        'Chefes não ficam mais fortes com o tempo, mas cada um solta uma Poké Ball e uma chuva de Poké Dollars.',
        `Nos primeiros ${r.window}s de cada chefe, com ele por perto, nascem só ${n(r.fight * 100)}% dos inimigos comuns, então a luta é com ele; depois a horda volta. Cada chefe tem até o próximo chegar: se ainda estiver de pé quando o seguinte aparecer, ele foge e não deixa nada. Mewtwo é o último: ao chegar, empurra a horda para longe e, enquanto ele estiver de pé, nascem só ${n(r.finale * 100)}% dos inimigos comuns, então a luta é desviar dos ataques dele.`,
      ],
      trios: (times: readonly string[], trios: readonly string[], mythicals: string, percent: number) => [
        `Às ${list(times)} chegam os três membros de um trio lendário, sorteado no começo de cada partida: ${list(trios)}. HP, dano de contato e velocidade são do horário, não do Pokémon, então nenhum sorteio é mais fácil que outro; o que muda são os ataques.`,
        `No fim, com ${n(percent)}% de chance, um Pokémon mítico chega junto com o Mewtwo: ${mythicals}, também sorteado por partida.`,
      ],
      timeHead: 'Tempo',
      bossHead: 'Chefe',
      hpHead: 'HP',
      attacksHead: 'Ataques',
    },
    traits: {
      paragraphs: (from: string, cap: number, alive: number) => [
        `Alguns Pokémon selvagens não só perseguem: eles curam, protegem e chamam a horda, ou atacam de longe. São tempero, não a maioria: a partir de ${from}, cada fase traz no máximo ${cap === 1 ? 'uma espécie' : `${cap} espécies`} com comportamento, ela aparece menos que as outras e nunca há mais de ${alive} vivos ao mesmo tempo. Vale a pena ficar de olho.`,
        'Todo ataque deles avisa antes: um "!" sobre a cabeça, um círculo vermelho, uma linha ou uma sombra no chão que pisca mais rápido quando o golpe está perto. Na primeira vez que cada um aparece numa partida, um aviso explica o que ele faz.',
      ],
      pokemonHead: 'Pokémon',
      traitHead: 'Comportamento',
      effectHead: 'O que faz',
    },
    shinies: {
      paragraphs: (wild: number, hp: number, xp: number, player: number, rift: number, species: number) => [
        `Cada Pokémon selvagem comum tem 1 chance em ${n(wild)} de nascer shiny. Ele vira uma elite com ${hp}x de HP e ${xp}x de EXP, e sempre solta uma Poké Ball e Poké Dollars. Os chefes do mapa, o Mewtwo e o Arceus nunca são shiny, mas o lendário de uma fenda tem 1 chance em ${rift} de ser, e paga mais.`,
        `O seu inicial tem 1 chance em ${player} de ser shiny, e continua shiny em todas as evoluções daquela partida.`,
        'A Poké Ball (de chefes e shinies) dá um upgrade aleatório na hora, ou uma evolução de golpe se alguma estiver pronta.',
        `Shiny derrotado vira seu: ele fica marcado como capturado, com o brilho, na Pokédex do jogo (Pokédex, no menu do título). Também contam como capturados o Pokémon que sai de um ovo (e a linha evolutiva dele fica vista) e cada forma que você jogou, inclusive as que alcançou evoluindo. A Pokédex tem as ${species} espécies do jogo, lembra cada uma que você viu e quantas derrotou, e o fim da partida mostra o que entrou de novo.`,
      ],
      seeAll: 'Veja todos os shinies na Pokédex',
    },
    eggs: {
      paragraphs: (starters: number, families: number, slots: number, perRun: number, stepPx: number, shiny: number, weight: number) => [
        `Além dos ${starters} iniciais, ${families} famílias de Pokémon jogáveis saem de ovos, de todos os tipos e gerações: são ${starters + families} Pokémon para jogar. Cada uma tem golpe inicial, especial, evolução no meio da partida e status próprios.`,
        `Chefes, baús trancados e fendas às vezes deixam um ovo, no máximo ${perRun} por partida. Ele vai para a incubadora, que tem ${slots} vagas. Cada ${stepPx} px andados numa partida contam um passo, e todos os ovos da incubadora andam juntos. O ovo achado no meio da partida já conta os passos dados depois dele.`,
        `Quando um ovo fica pronto, ele choca ao sair da partida ou na incubadora (no menu inicial e na aba Ovos da escolha de parceiro). Famílias que você ainda não tem saem ${weight}x mais. O filhote tem 1 chance em ${shiny} de ser shiny, e aí fica shiny em todas as partidas.`,
        'Um repetido, ou um ovo achado com a incubadora cheia, vira Poké Dollars. O jogador que nunca teve um ovo ganha o primeiro com certeza.',
        'O Ovo da Amizade não cai em partidas: ele chega como Presente Misterioso quando você cria a conta pelo convite de alguém, e quando um amigo que você convidou joga 3 partidas verificadas. Só sai Munchlax dele. Com 3 amigos você ganha o título Embaixador(a) e uma moldura exclusiva, e com 10, um Munchlax shiny.',
      ],
      tierHead: 'Ovo',
      stepsHead: 'Passos',
      refundHead: 'Repetido ou sem vaga',
      familiesHead: 'Pode chocar',
      sourceHead: 'Onde cai',
      chanceHead: 'Chance',
      oddsHead: 'Raridade',
      sources: {
        boss: 'Onix, Snorlax e o trio lendário',
        chest: 'Baú trancado',
        rift: 'Lendário de uma fenda',
        final: 'Mewtwo e o mítico raro (Mew, Celebi ou Jirachi)',
        reaper: 'Arceus, no modo sem fim',
      } satisfies Record<EggSource, string>,
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
    mapEvents: {
      intro: (first: number, gap: number, max: number) =>
        `A partir de ${first}s de partida, a cada ${gap}s mais ou menos um ponto de interesse pode surgir perto de você (no máximo ${max} ao mesmo tempo). Os importantes ganham uma seta na borda da tela. Se você demorar, eles somem.`,
      eventHead: 'Evento',
      howHead: 'Como funciona',
      rewardHead: 'Recompensa',
      altar: {
        name: 'Altar',
        how: 'Pise nele. O buff que ele dá aparece flutuando acima, para você decidir de longe.',
        reward: (boost: number) => `X Attack, X Speed ou Max Repel (o sorteio evita o que já está ativo), com ${n(boost)}x a duração normal.`,
      },
      fountain: {
        name: 'Fonte',
        how: (charges: number, interval: number) => `Fique nela enquanto estiver ferido: ${charges} cargas, uma a cada ${n(interval)}s. Com HP cheio, nada é gasto.`,
        reward: (heal: number) => `Cada carga recupera ${n(heal)}% do HP máximo.`,
      },
      chest: {
        name: 'Baú com cadeado',
        how: (unlock: number) =>
          `Fique dentro do anel por ${unlock}s. Fora dele, o progresso volta devagar. Assim que você começa, uma emboscada de Pokémon selvagens fecha o cerco.`,
        reward: (coins: string) => `${coins} ou mais (cresce com o tempo), um item e uma Poké Ball.`,
      },
      spikes: {
        name: 'Espinhos',
        how: 'Os espinhos sobem de tempos em tempos, com um aviso piscando antes. Ferem quem estiver em cima: você e os selvagens.',
        reward: 'Atraia a horda para cima deles.',
      },
      bomb: {
        name: 'Bomba',
        how: (fuse: number) => `Qualquer um que chegue perto acende o pavio. ${n(fuse)}s depois ela explode e fere tudo no raio, inclusive você.`,
        reward: 'Deixe a horda acender e saia de perto.',
      },
      meowth: {
        name: 'Meowth fugindo',
        how: (ttl: number) => `Corre de você e escapa em ${ttl}s. Seus golpes acertam ele.`,
        reward: (jackpot: string) => `Uma moeda a cada golpe e o Pay Day (${jackpot}) se ele desmaiar.`,
      },
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
    missions: {
      paragraphs: (daily: number, weekly: number, dailyRewards: string, weeklyRewards: string, medals: string) => [
        `Missões fica no menu da tela de título. Todo dia saem ${daily} missões diárias (${dailyRewards}) e toda semana ${weekly} semanais (${weeklyRewards}). Elas são sorteadas pela data do seu aparelho, então todo mundo recebe as mesmas no mesmo dia: as diárias trocam à meia-noite e as semanais na segunda-feira.`,
        'O progresso conta no fim de cada partida, mesmo se você desistir pela pausa, e soma as partidas do dia ou da semana. Missões de sobreviver, de nível, do modo sem fim e de espécies vistas contam a sua melhor partida. As missões usam o que o jogo tem: derrotar Pokémon de um tipo, num clima ou num bioma, vencer fendas, abrir baús, pegar o Pay Day do Meowth, derrotar shinies e chefes, coletar Poké Dollars, andar, ver espécies diferentes, chocar ovos (conta quando o ovo choca) e vencer o Mewtwo com um inicial de certo tipo. A recompensa cai direto na carteira, e algumas semanais também dão um ovo.',
        `As conquistas são metas para a vida toda, com medalha de bronze, prata ou ouro (${medals}). Algumas dão um título, como Caçador de Shinies: toque nela na aba Conquistas para exibi-lo na tela de título e no resultado de cada partida. Ovos de recompensa vão para a incubadora (cheia, eles viram Poké Dollars) e, no fim de uma partida, dividem com os ovos achados o limite de ovos por partida.`,
      ],
      medalHead: 'Medalha',
      nameHead: 'Conquista',
      goalHead: 'Como conseguir',
      titleHead: 'Título',
      medals: { bronze: 'Bronze', silver: 'Prata', gold: 'Ouro' },
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
      'Pokémon Survivors é um fan game não oficial e gratuito, sem anúncios e sem compras. Licenças (código MIT, sprites CC BY-NC 4.0), privacidade (contas opcionais com perfil público no ranking; como convidado, nada sai do seu aparelho), créditos e contato.',
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
      'Jogar como convidado é o padrão e não exige cadastro: assim o jogo não usa cookies, anúncios nem rastreadores, e não coleta dados pessoais.',
      'Tudo o que o jogo lembra fica no localStorage do seu navegador, no seu aparelho. Como convidado, nada disso é enviado para nenhum servidor:',
    ],
    storage: {
      'ps:save': 'Poké Dollars, melhorias compradas no Poké Mart, a Pokédex do jogo (espécies vistas, quantas você derrotou e quais capturou), os ovos da incubadora (eggs), os Pokémon chocados (hatched), progresso das missões, conquistas, recordes (como Pokémon derrotados e o maior tempo sobrevivido) e o título escolhido.',
      'ps:settings': 'Ajustes: volume da música e dos efeitos, som ligado ou desligado, números de dano e tremor de tela.',
      'ps:lang': 'Idioma escolhido (português ou inglês).',
      'ps:muted': 'Só em quem jogou versões antigas: o som desligado de antes dos Ajustes. O jogo apenas lê essa chave, não grava mais.',
      'ps:account': 'Só se você entrar com uma conta: qual conta está conectada neste aparelho (o id dela, seu nome e seu nome de usuário) e a última versão do progresso que ele sincronizou.',
      'ps:runs': 'Só com uma conta: resultados de partidas que ainda não chegaram ao ranking (por exemplo, sem internet). Saem daqui assim que o servidor recebe.',
    },
    account: [
      'Contas são opcionais e servem para guardar o progresso na nuvem e continuar em outro aparelho. O login é com o Google, feito pelo Clerk (clerk.com), que recebe do Google seu nome, e-mail e foto e usa cookies próprios para manter você conectado. O jogo nunca vê sua senha.',
      'Com uma conta, uma cópia do ps:save fica no nosso servidor, ligada ao id da sua conta. Ela é enviada quando você entra, quando abre o jogo e no fim de cada partida. No nosso servidor ficam o id da conta, o progresso, as datas de criação e de uso e o que o ranking precisa (abaixo), sem seu e-mail.',
      'Com uma conta, cada partida também vai para o ranking: o Pokémon, a dificuldade, o tempo sobrevivido, o nível, quantos inimigos você derrotou, se venceu e a versão do jogo, com a hora em que a partida começou e terminou, ligados ao id da sua conta. Partidas de convidado não vão para o ranking. Junto vai o replay da partida (a semente e os comandos que você deu, sem nada pessoal), que o servidor joga de novo para conferir o resultado e apaga depois de conferir.',
      'Seu perfil é público. Ao entrar, você escolhe um nome de exibição e um nome de usuário único, que vai no link do perfil. Qualquer pessoa, com ou sem conta, pode ver no ranking e no perfil: esses dois nomes, o título equipado, os recordes por dificuldade, o progresso da Pokédex, as partidas recentes e quantos seguidores você tem e quantos segue. Seu e-mail e sua foto nunca aparecem. Quem você segue e quem segue você fica guardado no servidor; o perfil mostra só as contagens.',
      'Ao sair da conta, o progresso continua neste aparelho. Para apagar a conta, o perfil, as partidas do ranking e o progresso guardado nela, peça pelo contato abaixo.',
    ],
    privacyAfter: [
      'Para apagar esses dados, limpe os dados do site nas configurações do navegador.',
      'Sprites, sons e fontes vêm do próprio site, sem chamadas a serviços de terceiros. O site é hospedado na Vercel, que, como qualquer servidor, pode registrar dados técnicos de acesso (como endereço IP) para operar e proteger o serviço.',
      'Para saber quantas pessoas visitam o site e jogam, usamos o Vercel Web Analytics e uma instância própria do Umami, num servidor nosso. Eles contam visitas de forma anônima e agregada (página, país, navegador, dispositivo e site de origem) e, no caso do Umami, também o resumo de cada partida (Pokémon inicial, até que minuto e nível você chegou e se venceu), sem cookies e sem identificar ou seguir você entre sites.',
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
