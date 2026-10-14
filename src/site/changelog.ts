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
    date: '2026-10-14',
    title: { pt: 'Um especial para cada tipo e números de dano legíveis', en: 'A special for every type and readable damage numbers' },
    notes: [
      {
        pt: 'Os 18 tipos agora têm o seu ataque especial, que fica mais forte na evolução final: Thunderbolt → Bolt Strike, Dragon Pulse → Draco Meteor, Shadow Ball → Astral Barrage, Bulldoze → Precipice Blades, Air Cutter → Aeroblast e mais. Raios do céu, chuvas de meteoros e de gelo, anéis de projéteis, muralhas que avançam e rastros de veneno, cada um com a cor e o efeito do tipo.',
        en: 'All 18 types now have their own special attack, which grows stronger at the final evolution: Thunderbolt → Bolt Strike, Dragon Pulse → Draco Meteor, Shadow Ball → Astral Barrage, Bulldoze → Precipice Blades, Air Cutter → Aeroblast and more. Bolts from the sky, meteor and icicle showers, rings of projectiles, sweeping walls and poison trails, each with its type\'s color and effect.',
      },
      {
        pt: 'Os Pokémon dos ovos usam o especial do primeiro tipo deles. O Guia lista os 18 e quem usa cada um.',
        en: 'Egg Pokémon use their first type\'s special. The guide lists all 18 and who uses each one.',
      },
      {
        pt: 'Números de dano num mesmo alvo se somam num número que cresce, com no máximo três por alvo em posições fixas. Chefes sob muitos golpes não viram mais uma tira ilegível, e os acertos super efetivos continuam em amarelo e por cima.',
        en: 'Damage numbers on the same target add up into one growing number, at most three per target in fixed spots. Bosses under many moves no longer turn into an unreadable strip, and super-effective hits stay yellow and on top.',
      },
    ],
  },
  {
    date: '2026-10-14',
    pr: 29,
    title: { pt: 'Ovos, Pokédex e missões juntos', en: 'Eggs, Pokédex and missions together' },
    notes: [
      {
        pt: 'O Pokémon que sai de um ovo entra na Pokédex como capturado, shiny se for o caso, e a linha evolutiva inteira dele conta como vista. Cada forma que você joga, inclusive as que alcança evoluindo, também conta como sua.',
        en: 'The Pokémon that comes out of an egg joins the Pokédex as caught, shiny if it is, and its whole evolution line counts as seen. Every form you play, the ones you evolve into included, counts as yours too.',
      },
      {
        pt: 'Quatro conquistas novas: veja 100 espécies, capture todas as formas dos 27 iniciais, choque o primeiro ovo e choque um shiny. Agora são 53.',
        en: 'Four new achievements: see 100 species, catch every form of the 27 starters, hatch your first egg and hatch a shiny. There are 53 now.',
      },
      {
        pt: 'Missões novas de andar, de ver espécies diferentes numa partida e de chocar ovos. Algumas semanais e toda medalha de ouro também dão um ovo, sem passar das 3 vagas da incubadora nem do limite de ovos por partida.',
        en: 'New missions to walk, to see different species in one run and to hatch eggs. Some weeklies and every gold medal also give an egg, within the incubator\'s 3 slots and the per-run egg limit.',
      },
      {
        pt: 'O resultado da partida ficou mais enxuto: Pokédex, ovos e missões num bloco só, que cabe no celular em pé.',
        en: 'A tidier run result: Pokédex, eggs and missions in one block that fits a phone held upright.',
      },
      {
        pt: 'No computador, as abas de região da escolha de Pokémon quebram em duas linhas, então Paldea e a aba Ovos ficam sempre à vista.',
        en: 'On a computer, the region tabs of the Pokémon select wrap onto two lines, so Paldea and the Eggs tab are always in sight.',
      },
      {
        pt: 'O Guia agora diz certo: os lendários das fendas podem ser shiny (1 em 8). Chefes do mapa, Mewtwo e Arceus nunca são.',
        en: 'The guide now gets it right: rift legendaries can be shiny (1 in 8). Map bosses, Mewtwo and Arceus never are.',
      },
    ],
  },
  {
    date: '2026-10-14',
    pr: 27,
    title: { pt: 'Missões, conquistas e títulos', en: 'Missions, achievements and titles' },
    notes: [
      {
        pt: 'Missões no menu do título: três diárias e duas semanais, iguais para todo mundo no mesmo dia, com recompensa em Poké Dollars. Derrote Pokémon de um tipo ou na chuva, vença fendas, abra baús, pegue o Pay Day do Meowth e mais.',
        en: 'Missions in the title menu: three daily and two weekly ones, the same for everyone on the same day, paid in Poké Dollars. Defeat Pokémon of a type or in the rain, win rifts, open chests, grab Meowth\'s Pay Day and more.',
      },
      {
        pt: '49 conquistas com medalhas de bronze, prata e ouro, de jogar a primeira partida a derrotar o Arceus. Cada medalha paga Poké Dollars.',
        en: '49 achievements with bronze, silver and gold medals, from playing your first run to defeating Arceus. Every medal pays Poké Dollars.',
      },
      {
        pt: 'Algumas conquistas dão um título, como Caçador de Shinies ou Domador de Lendas, que aparece na tela de título e no resultado da partida.',
        en: 'Some achievements grant a title, like Shiny Hunter or Legend Tamer, shown on the title screen and on the run results.',
      },
      {
        pt: 'O resultado da partida mostra o progresso de cada missão e as medalhas novas. Durante a partida, nada de avisos extras.',
        en: 'The run results show every mission\'s progress and the new medals. No extra pop-ups during the run.',
      },
    ],
  },
  {
    date: '2026-10-13',
    pr: 28,
    title: { pt: 'Ovos e 25 Pokémon novos para jogar', en: 'Eggs and 25 new Pokémon to play' },
    notes: [
      {
        pt: 'Chefes, baús trancados e fendas às vezes deixam um ovo. Ele vai para a incubadora (3 vagas) e choca com os passos que você dá nas partidas.',
        en: 'Bosses, locked chests and rifts sometimes leave an egg. It goes to the incubator (3 slots) and hatches with the steps you take in runs.',
      },
      {
        pt: '25 famílias jogáveis saem dos ovos, de todos os tipos e gerações: de Pichu, Eevee e Machop a Gastly, Riolu e Zorua, e os raros Dratini, Larvitar, Beldum, Gible e Dreepy. Cada uma com golpe, especial e evolução no meio da partida.',
        en: '25 playable families hatch from eggs, from every type and generation: from Pichu, Eevee and Machop to Gastly, Riolu and Zorua, plus the rare Dratini, Larvitar, Beldum, Gible and Dreepy. Each one with its own move, special and mid-run evolution.',
      },
      {
        pt: 'Chocar é um momento: o ovo balança, racha e o Pokémon aparece com o seu grito. 1% de chance de sair shiny, e aí ele é shiny em todas as partidas.',
        en: 'Hatching is a moment: the egg wobbles, cracks and the Pokémon pops out with its cry. A 1% chance to hatch shiny, and then it stays shiny in every run.',
      },
      {
        pt: 'A escolha de parceiro ganhou a aba Ovos, com os chocados e as silhuetas dos que faltam. Repetidos e ovos sem vaga viram Poké Dollars.',
        en: 'The Pokémon select has a new Eggs tab with your hatchlings and silhouettes of the rest. Duplicates and eggs with no room become Poké Dollars.',
      },
    ],
  },
  {
    date: '2026-10-13',
    pr: 25,
    title: { pt: 'Pokédex dentro do jogo', en: 'An in-game Pokédex' },
    notes: [
      {
        pt: 'O botão Pokédex do título agora abre a Pokédex do jogo: todas as espécies, com as que você viu, quantas derrotou e quais capturou. As que faltam aparecem como "?".',
        en: 'The Pokédex button on the title now opens the in-game Pokédex: every species, with the ones you have seen, how many you defeated and which you caught. Missing ones show as "?".',
      },
      {
        pt: 'Shiny derrotado vira seu: ele entra na Pokédex como capturado, com o brilho.',
        en: 'A defeated shiny is yours: it joins the Pokédex as caught, sparkle and all.',
      },
      {
        pt: 'O fim da partida mostra o que entrou de novo, como "+3 espécies novas · 1 shiny capturado".',
        en: 'The end of a run shows what is new, like "+3 new species · 1 shiny caught".',
      },
    ],
  },
  {
    date: '2026-10-13',
    pr: 26,
    title: { pt: 'Avisos em fila e 3 fendas por partida', en: 'Queued notices and 3 rifts per run' },
    notes: [
      {
        pt: 'Os avisos agora fazem fila numa coluna, sem cobrir um ao outro, o HUD ou o seu Pokémon. Eles esperam o menu de nível e a evolução terminarem, então nenhum se perde. No celular deitado, eles ficam no canto direito.',
        en: 'Notices now line up in a column, without covering each other, the HUD or your Pokémon. They wait for the level-up menu and evolutions to finish, so none get lost. On a phone held sideways, they sit on the right.',
      },
      {
        pt: 'A fenda lendária espera um chefe vivo cair por até 45 segundos e depois abre mesmo assim. Toda partida tem 3 fendas, mesmo quando os chefes demoram.',
        en: 'A legendary rift waits up to 45 seconds for a living boss to fall, then opens anyway. Every run gets 3 rifts, even when bosses take a while.',
      },
      {
        pt: 'Ao sair de uma fenda, a troca de clima espera alguns segundos, para não chegar junto com o loot.',
        en: 'When you leave a rift, the weather waits a few seconds to change, so it doesn\'t arrive along with the loot.',
      },
    ],
  },
  {
    date: '2026-10-13',
    pr: 24,
    title: { pt: 'Tudo junto: horda do bioma e Dragões', en: 'All together: biome hordes and Dragons' },
    notes: [
      {
        pt: 'A horda segue o bioma: as espécies novas de cada fase puxam para os tipos do lugar (Planta e Inseto na floresta, Pedra e Terra na caverna, Fantasma e Psíquico na torre).',
        en: 'The horde follows the biome: each stage\'s new species lean towards the local types (Grass and Bug in the forest, Rock and Ground in the cave, Ghost and Psychic in the tower).',
      },
      {
        pt: 'O tipo Dragão chegou à horda com 15 espécies, de Dratini a Flygon. Dragões resistem a Fogo, Água, Planta e Elétrico e sofrem com Gelo, Dragão e Fada. A horda agora tem 193 espécies.',
        en: 'Dragon types join the horde with 15 species, from Dratini to Flygon. Dragons resist Fire, Water, Grass and Electric and fall to Ice, Dragon and Fairy. The horde now has 193 species.',
      },
      {
        pt: 'Pokémon com comportamento entram no sorteio da partida, no máximo um por fase a partir de 1:00. Bronzor, Drifloon, Lokix e Vikavolt também ganharam um.',
        en: 'Pokémon with a behavior join each run\'s draw, at most one per stage from 1:00. Bronzor, Drifloon, Lokix and Vikavolt got one too.',
      },
      {
        pt: 'Dentro de uma fenda o clima e a troca de bioma esperam lá fora, e os lendários das fendas e o Arceus carregam em segundo plano.',
        en: 'Inside a rift, the weather and the biome change wait outside, and the rift legendaries and Arceus load in the background.',
      },
    ],
  },
  {
    date: '2026-10-13',
    pr: 23,
    title: { pt: 'Horda de todas as gerações', en: 'A horde from every generation' },
    notes: [
      {
        pt: '171 Pokémon selvagens das 9 gerações. Cada partida sorteia o seu elenco, com poucas espécies novas por fase.',
        en: '171 wild Pokémon from all 9 generations. Every run draws its own cast, with only a few new species per stage.',
      },
      {
        pt: 'Os inimigos são divididos em 5 faixas pelo total de status base: básicos no começo, evoluções no fim. Revoadas e cercos usam o elenco da partida.',
        en: 'Enemies are split into 5 tiers by base stat total: basic Pokémon early, evolved ones late. Swarms and rings use the run\'s cast.',
      },
      {
        pt: 'A partida começa mais rápido: só o primeiro elenco é baixado antes, o resto chega em segundo plano.',
        en: 'Runs start faster: only the opening cast is downloaded up front, the rest streams in the background.',
      },
      { pt: 'Pokédex com filtro por faixa e o Guia com a seção da horda selvagem.', en: 'A tier filter in the Pokédex and a wild horde section in the guide.' },
    ],
  },
  {
    date: '2026-10-13',
    pr: 22,
    title: { pt: 'Fendas lendárias e modo sem fim', en: 'Legendary rifts and endless mode' },
    notes: [
      {
        pt: 'Algumas vezes por partida, uma fenda se abre no mapa. Entre nela para enfrentar Lugia, Ho-Oh, Kyogre, Groudon, Rayquaza ou Dialga numa arena fechada, com ataques próprios de cada lendário.',
        en: 'A few times per run, a rift opens on the map. Step in to face Lugia, Ho-Oh, Kyogre, Groudon, Rayquaza or Dialga in a walled arena, each with its own attacks.',
      },
      {
        pt: 'Vencer paga muita EXP, Poké Dollars, Poké Balls, itens e cura. Às vezes o lendário é shiny e paga o dobro. Se o tempo acabar, a fenda colapsa e joga você de volta.',
        en: 'Winning pays lots of EXP, Poké Dollars, Poké Balls, items and a heal. Sometimes the legendary is shiny and pays double. If time runs out, the rift collapses and throws you back.',
      },
      {
        pt: 'Depois de derrotar Mewtwo, continue no modo sem fim: a horda não para de crescer e Arceus vem caçar você às 20:00. Dá para derrotá-lo, se você for muito forte.',
        en: 'After beating Mewtwo, keep going in endless mode: the horde keeps growing and Arceus comes hunting at 20:00. It can be beaten, if you are strong enough.',
      },
      {
        pt: 'O tempo sobrevivido agora vale mais: cada minuto além de 15:00 rende Poké Dollars extras no fim da partida.',
        en: 'Time survived is worth more now: every minute past 15:00 pays extra Poké Dollars at the end of the run.',
      },
    ],
  },
  {
    date: '2026-10-13',
    pr: 21,
    title: { pt: 'Biomas e clima', en: 'Biomes and weather' },
    notes: [
      {
        pt: 'A partida agora atravessa cinco biomas: Rota 1, Floresta de Viridian, Monte Moon, Monte Prateado e Torre de Lavender, cada um com visual, itens quebráveis e música próprios.',
        en: 'A run now walks through five biomes: Route 1, Viridian Forest, Mt. Moon, Mt. Silver and Lavender Tower, each with its own look, breakables and music.',
      },
      {
        pt: 'Clima que muda durante a partida e vale para todos: sol forte (Fogo ×1,5, Água ×0,75), chuva (o inverso), tempestade de areia, neve e névoa.',
        en: 'Weather that changes during the run and applies to everyone: harsh sunlight (Fire ×1.5, Water ×0.75), rain (the opposite), sandstorm, snow and fog.',
      },
      {
        pt: 'Quatro temas novos na trilha sonora, um por bioma.',
        en: 'Four new soundtrack themes, one per biome.',
      },
    ],
  },
  {
    date: '2026-10-13',
    pr: 20,
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
    pr: 19,
    title: { pt: 'Eventos no mapa', en: 'Map events' },
    notes: [
      {
        pt: 'Pontos de interesse surgem durante a partida e fazem você escolher para onde ir: altares de buff, fontes que curam e baús trancados que pedem 3 segundos dentro do anel enquanto uma emboscada fecha o cerco.',
        en: 'Points of interest show up during a run and make you choose where to go: buff altars, healing fountains and locked chests that need 3 seconds inside their ring while an ambush closes in.',
      },
      {
        pt: 'Armadilhas de espinhos e bombas ferem você e a horda: atraia os selvagens para cima delas.',
        en: 'Spike and bomb traps hurt you and the horde alike: lure the wild Pokémon onto them.',
      },
      {
        pt: 'Um Meowth foge com moedas: cada golpe derruba uma, e se ele desmaiar vem o Pay Day.',
        en: 'A Meowth runs off with coins: every hit knocks one loose, and if it faints you get the Pay Day.',
      },
      { pt: 'Setas na borda da tela apontam para os eventos importantes.', en: 'Arrows on the screen edge point to the important events.' },
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
