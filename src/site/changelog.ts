import type { Locale } from '../i18n'

/** The same text in every language: the type makes a missing translation a compile error. */
type Bilingual = Readonly<Record<Locale, string>>

export type ChangelogEntry = {
  /** ISO date (`YYYY-MM-DD`) the change went live. */
  date: string
  /** GitHub pull request number, when there is one. */
  pr?: number
  title: Bilingual
  notes: readonly Bilingual[]
}

/**
 * Update history shown at `/novidades/` and `/en/changelog/`, newest first.
 * Add an entry at the top when a player-facing change ships.
 */
export const CHANGELOG: readonly ChangelogEntry[] = [
  {
    date: '2026-10-13',
    title: { pt: 'Inimigos com personalidade', en: 'Enemies with personality' },
    notes: [
      {
        pt: 'Seis comportamentos novos na horda: Chansey cura os aliados, Bronzong protege com um escudo que absorve dano, Nidoqueen chama Nidoran, Voltorb e Electrode explodem, Magnemite dispara raios e Hitmonlee salta sobre a horda.',
        en: 'Six new behaviors in the horde: Chansey heals its allies, Bronzong shields them with a ward that soaks damage, Nidoqueen calls in Nidoran, Voltorb and Electrode explode, Magnemite fires beams and Hitmonlee leaps over the horde.',
      },
      {
        pt: 'Todo ataque avisa antes: círculo vermelho, linha ou sombra no chão, piscando mais rápido quando o golpe está perto. A explosão do Voltorb fere os inimigos também.',
        en: 'Every attack warns you first: a red circle, a line or a shadow on the ground, blinking faster as the hit gets close. Voltorb\'s blast hurts enemies too.',
      },
      { pt: 'Um cerco de Voltorb aos 4:30 e uma seção nova no guia.', en: 'A ring of Voltorb at 4:30 and a new guide section.' },
    ],
  },
  {
    date: '2026-10-13',
    pr: 14,
    title: { pt: 'Site: Pokédex, guia, novidades e página legal', en: 'Website: Pokédex, guide, changelog and legal page' },
    notes: [
      {
        pt: 'Pokédex com todos os Pokémon do jogo, sprites animados, versão shiny, filtros por região, tipo e papel, e busca.',
        en: 'A Pokédex with every Pokémon in the game, animated sprites, shiny forms, region, type and role filters, and search.',
      },
      {
        pt: 'Guia completo de como jogar, com os números do próprio jogo.',
        en: 'A complete how-to-play guide, with the game\'s own numbers.',
      },
      { pt: 'Esta página de novidades e uma página de legal, privacidade e créditos.', en: 'This changelog and a legal, privacy and credits page.' },
    ],
  },
  {
    date: '2026-10-13',
    pr: 12,
    title: { pt: 'Nova tela de título', en: 'New title screen' },
    notes: [
      {
        pt: 'Tela de título com um campo vivo ao fundo, logo em pixel art e menu: Jogar, Pokédex, Como jogar e Ajustes.',
        en: 'A title screen with a living meadow behind it, a pixel-art logo and a menu: Play, Pokédex, How to play and Settings.',
      },
      {
        pt: 'Os menus agora funcionam no controle: D-pad ou analógico esquerdo para navegar, A confirma, B volta e Start pausa.',
        en: 'Menus now work on a gamepad: D-pad or left stick to navigate, A confirms, B goes back and Start pauses.',
      },
    ],
  },
  {
    date: '2026-10-13',
    pr: 13,
    title: { pt: 'Trilha chiptune original e Ajustes', en: 'Original chiptune soundtrack and Settings' },
    notes: [
      {
        pt: 'Trilha sonora original composta em código e sintetizada ao vivo: tema de vila nos menus, marcha na partida e tema de chefe.',
        en: 'An original soundtrack composed in code and synthesized live: a village theme in the menus, a march for the run and a boss theme.',
      },
      {
        pt: 'Tela de Ajustes, no título e na pausa: volume da música e dos efeitos, som, números de dano, tremor de tela e idioma.',
        en: 'A Settings screen, on the title screen and in the pause menu: music and effects volume, sound, damage numbers, screen shake and language.',
      },
    ],
  },
  {
    date: '2026-10-13',
    pr: 11,
    title: { pt: 'Páginas em português e inglês para buscadores', en: 'Portuguese and English pages for search engines' },
    notes: [
      {
        pt: 'Uma URL por idioma (/ e /en/), com descrição do jogo legível por buscadores e IAs.',
        en: 'One URL per language (/ and /en/), with a game description that search engines and AI assistants can read.',
      },
      { pt: 'Sitemap, robots.txt, llms.txt e dados estruturados.', en: 'Sitemap, robots.txt, llms.txt and structured data.' },
    ],
  },
  {
    date: '2026-10-13',
    pr: 10,
    title: { pt: 'Inglês e português', en: 'English and Portuguese' },
    notes: [
      {
        pt: 'O jogo inteiro em português e inglês: menus, HUD, golpes, itens e Poké Mart. Nomes de Pokémon, golpes e itens seguem os oficiais em inglês.',
        en: 'The whole game in English and Portuguese: menus, HUD, moves, items and the Poké Mart. Pokémon, move and item names keep their official English names.',
      },
      {
        pt: 'O idioma vem do navegador e pode ser trocado no título (PT | EN ou tecla I) e na pausa.',
        en: 'The language follows your browser and can be switched on the title screen (PT | EN or the I key) and in the pause menu.',
      },
    ],
  },
  {
    date: '2026-10-13',
    pr: 9,
    title: { pt: 'Código aberto', en: 'Open source' },
    notes: [
      {
        pt: 'O código está no GitHub sob a licença MIT, com créditos para cada artista dos sprites.',
        en: 'The code is on GitHub under the MIT license, with credit for every sprite artist.',
      },
      { pt: 'Avisos legais de fan game não oficial.', en: 'Legal notices for an unofficial fan game.' },
    ],
  },
  {
    date: '2026-10-13',
    pr: 2,
    title: { pt: 'Poké Dollars e Poké Mart', en: 'Poké Dollars and the Poké Mart' },
    notes: [
      {
        pt: 'Inimigos soltam Poké Dollars (₽), e chefes soltam uma chuva deles. No fim da partida entra um bônus por tempo, derrotados e vitória.',
        en: 'Enemies drop Poké Dollars (₽), and bosses shower them. A bonus for time, fainted foes and winning comes at the end of the run.',
      },
      {
        pt: 'Poké Mart com melhorias permanentes: HP Up, Protein, Iron, Carbos, Calcium, Zinc, PP Up, Exp. Charm, Amulet Coin, Ability Capsule e Escape Rope.',
        en: 'A Poké Mart with permanent upgrades: HP Up, Protein, Iron, Carbos, Calcium, Zinc, PP Up, Exp. Charm, Amulet Coin, Ability Capsule and Escape Rope.',
      },
      { pt: 'Trocar e Pular ofertas ao subir de nível.', en: 'Reroll and Skip on level up.' },
    ],
  },
  {
    date: '2026-10-13',
    pr: 4,
    title: { pt: 'Evolução de golpes', en: 'Move evolutions' },
    notes: [
      {
        pt: 'Golpe no nível máximo + o item certo = um golpe evoluído, como Ember + Charcoal → Flamethrower.',
        en: 'A maxed move plus the right item becomes an evolved move, like Ember + Charcoal → Flamethrower.',
      },
      {
        pt: '10 evoluções e 7 itens de tipo novos (Charcoal, Mystic Water, Miracle Seed, Silk Scarf, Magnet, Poison Barb e Sharp Beak).',
        en: '10 evolutions and 7 new type items (Charcoal, Mystic Water, Miracle Seed, Silk Scarf, Magnet, Poison Barb and Sharp Beak).',
      },
    ],
  },
  {
    date: '2026-10-13',
    pr: 3,
    title: { pt: 'Shinies e chefes lendários', en: 'Shinies and legendary bosses' },
    notes: [
      {
        pt: 'Pokémon selvagens shiny (1 em 450) viram elites que soltam Poké Ball, e o seu inicial pode ser shiny (1 em 64).',
        en: 'Shiny wild Pokémon (1 in 450) become elites that drop a Poké Ball, and your starter can be shiny (1 in 64).',
      },
      {
        pt: 'Articuno, Zapdos, Moltres e Mewtwo como chefes com ataques próprios. Às vezes Mew aparece no final.',
        en: 'Articuno, Zapdos, Moltres and Mewtwo as bosses with their own attacks. Sometimes Mew shows up at the end.',
      },
    ],
  },
  {
    date: '2026-10-13',
    pr: 8,
    title: { pt: 'Os 27 iniciais', en: 'All 27 starters' },
    notes: [
      {
        pt: 'O trio inicial de todas as regiões, de Kanto a Paldea, com as 3 evoluções (Nv 12 e Nv 28), status e golpes próprios.',
        en: 'The starter trio of every region, Kanto to Paldea, with all 3 stages (Lv 12 and Lv 28), their own stats and moves.',
      },
      { pt: '13 golpes novos e os tipos Aço, Sombrio e Fada.', en: '13 new moves and the Steel, Dark and Fairy types.' },
      {
        pt: 'Nova escolha de inicial com abas por região e painel de inspeção.',
        en: 'A new starter select with region tabs and an inspect panel.',
      },
    ],
  },
  {
    date: '2026-10-13',
    pr: 6,
    title: { pt: 'Itens no mapa', en: 'Map items' },
    notes: [
      {
        pt: 'Item Balls, Berry Trees e mato alto pelo mapa. Quebre para pegar Potion, Rare Candy, Exp. Share, Poké Flute, Max Repel, Voltorb, X Attack, X Speed e Revive.',
        en: 'Item Balls, Berry Trees and tall grass around the map. Break them for Potions, Rare Candies, Exp. Share, the Poké Flute, Max Repel, Voltorb, X Attack, X Speed and Revive.',
      },
    ],
  },
  {
    date: '2026-10-13',
    pr: 1,
    title: { pt: 'Condições de status', en: 'Status conditions' },
    notes: [
      {
        pt: 'Queimadura, veneno e paralisia, como nos jogos. Novos itens King\'s Rock e Toxic Orb.',
        en: 'Burn, poison and paralysis, like on the handhelds. New held items: King\'s Rock and Toxic Orb.',
      },
    ],
  },
  {
    date: '2026-10-13',
    pr: 7,
    title: { pt: 'Ataque especial', en: 'Special attack' },
    notes: [
      {
        pt: 'Um ataque manual com recarga (Espaço, botão na tela ou A / ✕ do controle): Flare Blitz, Hydro Pump e Grass Knot, que viram Blast Burn, Hydro Cannon e Frenzy Plant na evolução final.',
        en: 'A manual attack on a cooldown (Space, the on-screen button or the gamepad A / ✕): Flare Blitz, Hydro Pump and Grass Knot, which become Blast Burn, Hydro Cannon and Frenzy Plant at the final evolution.',
      },
    ],
  },
  {
    date: '2026-10-13',
    pr: 5,
    title: { pt: 'Versão para celular', en: 'Mobile version' },
    notes: [
      {
        pt: 'Joystick de toque flutuante, botão de pausa na tela e layout para retrato e paisagem.',
        en: 'A floating touch joystick, an on-screen pause button and layouts for portrait and landscape.',
      },
      { pt: 'Dá para instalar como app em tela cheia.', en: 'Installable as a fullscreen app.' },
    ],
  },
  {
    date: '2026-10-13',
    title: { pt: 'Primeira versão', en: 'First release' },
    notes: [
      {
        pt: 'Sobreviva 15 minutos de hordas com Charmander, Squirtle ou Bulbasaur: golpes automáticos, níveis, evolução no meio da partida e chefes.',
        en: 'Survive 15 minutes of hordes with Charmander, Squirtle or Bulbasaur: automatic moves, level ups, mid-run evolution and bosses.',
      },
    ],
  },
]
