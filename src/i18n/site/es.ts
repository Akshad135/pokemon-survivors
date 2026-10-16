import type { SiteMessages } from './pt'

/** Number in Latin American Spanish format (`1,250`, `0.75`). */
const n = (v: number) => v.toLocaleString('es-419', { maximumFractionDigits: 2 })
const s = (count: number, one: string, many: string) => (count === 1 ? one : many)
/** `a, b y c` */
const list = (items: readonly string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`)
/** `a, b o c` */
const either = (items: readonly string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} o ${items.at(-1)}`)

/** Latin American Spanish copy of the static site pages. Must match `pt.ts` key for key. */
export const siteEs: SiteMessages = {
  lang: { tag: 'es-419', og: 'es_LA', short: 'ES', switchTo: 'Ver en español' },
  skip: 'Saltar al contenido',
  nav: {
    label: 'Navegación principal',
    play: 'Jugar',
    pokedex: 'Pokédex',
    guide: 'Guía',
    changelog: 'Novedades',
    legal: 'Legal',
    support: 'Apoya',
    language: 'Idioma',
  },
  footer: {
    disclaimer:
      'Pokémon Survivors es un fan game no oficial, gratuito y sin fines de lucro. No está afiliado a Nintendo, The Pokémon Company, GAME FREAK, Creatures ni Spike Chunsoft, ni cuenta con su respaldo. Pokémon y los nombres de los personajes son marcas registradas de Nintendo.',
    legal: 'Legal y privacidad',
    credits: 'Créditos',
    source: 'Código en GitHub',
    support: 'Apoya el proyecto',
  },
  home: 'Inicio',
  playCta: 'Jugar gratis',

  types: {
    normal: 'Normal', fire: 'Fuego', water: 'Agua', grass: 'Planta', electric: 'Eléctrico', poison: 'Veneno',
    flying: 'Volador', bug: 'Bicho', rock: 'Roca', ground: 'Tierra', ghost: 'Fantasma', fighting: 'Lucha',
    psychic: 'Psíquico', ice: 'Hielo', steel: 'Acero', dark: 'Siniestro', fairy: 'Hada', dragon: 'Dragón',
  },

  pokedex: {
    title: 'Pokédex de Pokémon Survivors: iniciales, enemigos, jefes y legendarios',
    description:
      'Todos los Pokémon de Pokémon Survivors con sprite animado y shiny: los 27 iniciales y las 52 familias de los huevos con sus evoluciones, enemigos salvajes, jefes y legendarios. Tipos, estadísticas en el juego, movimientos, especiales y cuándo aparece cada uno.',
    h1: 'Pokédex',
    intro: (count: number) =>
      `Los ${count} Pokémon que existen en Pokémon Survivors, con los números del juego: iniciales de todas las regiones, las familias que salen de los huevos y sus evoluciones, la horda salvaje, los jefes y los legendarios. Pasa el mouse (o toca) para ver el sprite caminando y usa ★ para ver el shiny.`,
    filters: 'Filtros',
    search: 'Buscar',
    searchPlaceholder: 'Nombre o número',
    region: 'Región',
    type: 'Tipo',
    role: 'Rol',
    all: 'Todos',
    allRegions: 'Todas',
    shinyAll: 'Shiny',
    shinyToggle: (name: string) => `Ver ${name} shiny`,
    results: (count: number) => `${count} ${s(count, 'Pokémon encontrado', 'Pokémon encontrados')}`,
    empty: 'Ningún Pokémon con esos filtros.',
    clear: 'Limpiar filtros',
    roles: { starter: 'Inicial', egg: 'Huevo', enemy: 'Salvaje', boss: 'Jefe', legendary: 'Legendario', event: 'Evento' },
    roleFilter: { starter: 'Iniciales', egg: 'Huevos', enemy: 'Salvajes', boss: 'Jefes', legendary: 'Legendarios', event: 'Eventos' },
    link: (name: string) => `Enlace a ${name}`,
    portrait: (name: string) => `Retrato de ${name}`,
    sprite: (name: string) => `Sprite animado de ${name}`,
    stats: 'Estadísticas en el juego',
    statsNote: 'Sin objetos ni mejoras del Poké Mart.',
    evolution: 'Línea evolutiva',
    evolvesAt: (level: number) => `Nv. ${level}`,
    hatchNote: (egg: string) => `Jugable después de eclosionar de un ${egg}.`,
    stageOf: (stage: number) => ['Etapa inicial', 'Primera evolución', 'Evolución final'][stage] ?? '',
    signature: 'Movimiento inicial',
    special: 'Ataque especial',
    specialFinal: 'En la evolución final',
    learnset: 'Movimientos que aprende',
    wildStats: { hp: 'HP', damage: 'Daño por contacto', speed: 'Velocidad', xp: 'EXP' },
    eventNote: 'Aparece en los eventos del mapa: huye de ti y suelta monedas con cada golpe. Derríbalo antes de que escape para ganarte el Pay Day.',
    wildNote: 'Valores base. Los enemigos comunes se vuelven más fuertes cada minuto; los jefes, no.',
    appears: 'Cuándo aparece',
    horde: (from: string, until: string) => `Puede entrar en la horda, de ${from} a ${until}`,
    hordeEnd: (from: string) => `Puede entrar en la horda, de ${from} hasta el final`,
    swarm: (at: string, count: number) => `Puede liderar la bandada de ${count} a las ${at}`,
    ring: (at: string, count: number) => `Puede formar el cerco de ${count} a las ${at}`,
    ringFixed: (at: string, count: number) => `Forma el cerco de ${count} a las ${at}`,
    boss: (at: string) => `Jefe a las ${at}`,
    bossChance: (at: string, percent: number) => `Jefe a las ${at} (${n(percent)}% de probabilidad)`,
    trio: (at: string, trio: string) => `Jefe a las ${at} en las partidas que sortean el trío ${trio} (1 de cada 3)`,
    rift: (from: string) => `Detrás de una grieta legendaria, desde las ${from} (arena opcional)`,
    reaper: (at: string) => `Segador del modo infinito, desde las ${at}`,
    attacks: 'Ataques',
    shinyNote: 'Puede aparecer shiny (1 de cada 450): élite con 8x de HP.',
    summoned: (by: string) => `Invocado por ${by}`,
    behavior: 'Comportamiento',
  },

  /** Enemy traits, built from `data/traits.ts`. */
  traits: {
    names: {
      healer: 'Curandero',
      shield: 'Escudo',
      summoner: 'Invocador',
      kamikaze: 'Kamikaze',
      beam: 'Rayo',
      leaper: 'Saltador',
    },
    effects: {
      healer: (every: number, percent: number) =>
        `Cada ${n(every)}s, un pulso verde cura el ${n(percent)}% del HP máximo de los aliados heridos cercanos.`,
      shield: (every: number, percent: number, duration: number) =>
        `Cada ${n(every)}s, envuelve a los aliados cercanos en un escudo que absorbe daño igual al ${n(percent)}% de su HP máximo, durante ${n(duration)}s.`,
      summoner: (every: number, count: number, max: number, names: readonly string[]) =>
        `Cada ${n(every)}s llama ${count} refuerzos (${list(names)}), hasta ${max} al mismo tiempo.`,
      kamikaze: (fuse: number, damage: number, percent: number) =>
        `Se acerca, se detiene, parpadea en rojo y explota después de ${n(fuse)}s. La explosión te causa ${n(damage)}x su daño por contacto y les quita el ${n(percent)}% del HP a los enemigos dentro del círculo.`,
      beam: (aim: number, damage: number) => `Se detiene, dibuja en el suelo la línea del rayo durante ${n(aim)}s y dispara: ${n(damage)}x su daño por contacto.`,
      leaper: (warn: number, damage: number) =>
        `Salta sobre la horda hasta donde estabas. La sombra en el suelo marca la caída ${n(warn)}s antes, y el impacto causa ${n(damage)}x su daño por contacto.`,
    },
    tips: {
      healer: 'Derríbalo primero, o la horda vuelve a llenarse de vida.',
      shield: 'Los números azules son daño absorbido. Derriba al escudero o espera a que el escudo parpadee y desaparezca.',
      summoner: 'Los refuerzos se detienen cuando ella cae.',
      kamikaze: 'Sal del círculo rojo, o atráelo al medio de la horda: la explosión también daña a los enemigos.',
      beam: 'La mira se fija cuando aparece la línea: basta con un paso al costado.',
      leaper: 'Quítate de la sombra antes de la caída.',
    },
  },

  /** Boss attack patterns, built from `data/bosses.ts`. */
  patterns: {
    strikesPlayer: (count: number, every: number, damage: number) =>
      `${count} ${s(count, 'impacto marcado', 'impactos marcados')} en el suelo cerca de ti cada ${n(every)}s (${damage} de daño)`,
    strikesSelf: (every: number, damage: number) => `Golpe en área a su alrededor cada ${n(every)}s (${damage} de daño)`,
    ring: (count: number, every: number, damage: number) => `Anillo de ${count} proyectiles cada ${n(every)}s (${damage} de daño)`,
    trail: (ttl: number, damage: number) => `Deja un rastro que daña durante ${n(ttl)}s (${damage} de daño)`,
    stance: { close: 'De cerca', ranged: 'A distancia' },
  },

  /** The legendary trios a run draws from (`TRIOS`), and `either` to name who may come. */
  trios: {
    names: { birds: 'Aves de Kanto', beasts: 'Bestias de Johto', regis: 'Regis de Hoenn' },
    either,
  },

  /** The wild roster: tiers and the cast each run draws (Pokédex filter and the guide's horde section). */
  roster: {
    tier: 'Rango',
    tierOf: (tier: number) => `Rango ${tier}`,
    allTiers: 'Todos',
    paragraphs: (species: number, perRun: number) => [
      `La horda tiene ${species} especies salvajes de las 9 generaciones, y cada partida sortea su propio elenco: unas ${perRun} especies, pocas nuevas por fase, para que reconozcas quién se acerca.`,
      'Cada especie entra en un rango según su total de estadísticas base. Las primeras fases toman del rango 1 (Pokémon básicos débiles) y el final de la partida, de los rangos 4 y 5 (evoluciones). Las bandadas toman un Pokémon volador del rango indicado y los cercos, un Pokémon del rango que ya encontraste en la partida.',
    ],
    special: (r) => [
      `Cuando la horda supera el ${n(r.fill * 100)}% del límite de la fase, los que aparecen llegan como élite (hasta el ${n(r.share * 100)}% del límite), con contorno rojo: ${n(r.hp)}x de HP y de EXP y ${n(r.damage)}x de daño. Mantener la pantalla limpia evita que se vuelva una horda de élites. En la pelea contra Mewtwo no aparecen élites.`,
      `Desde las ${r.from}, una de las especies nuevas de cada fase corre: ${n(r.speed)}x más rápida (nunca más que tú sin bonificaciones), con el ${n(r.frail * 100)}% del HP, estelas de velocidad y apunta a donde vas a estar, hasta ${n(r.lead)}s por delante. Correr en círculos no la despista.`,
    ],
    formula: 'Las estadísticas en el juego salen de las estadísticas base: el HP viene del rango y de la defensa (HP, Defensa y Defensa Especial), el daño del rango y del mejor ataque, la velocidad de la Velocidad base, la EXP del HP y la resistencia al empuje del HP y la Defensa (los voladores y fantasmas son más livianos).',
    tiersTitle: 'Rangos',
    tierHead: 'Rango',
    totalHead: 'Total de estadísticas base',
    total: (min: number, max: number | null) => (max === null ? `${min} o más` : min === 0 ? `hasta ${max}` : `${min} a ${max}`),
    speciesHead: 'Especies',
    examplesHead: 'Ejemplos',
    stagesTitle: 'Rangos por fase',
    timeHead: 'Tiempo',
    castHead: 'Rangos del elenco',
    /** `groups` = [tier, slots] pairs. */
    cast: (groups: readonly (readonly [number, number])[], fresh: number) =>
      `${list(groups.map(([tier, count]) => `${count} del rango ${tier}`))} (${fresh} ${s(fresh, 'nueva', 'nuevas')})`,
    swarm: (count: number, tier: number) => `Bandada: ${count} Pokémon voladores del rango ${tier} cruzan la pantalla`,
    ring: (count: number, tier: number) => `Cerco: un círculo de ${count} Pokémon del rango ${tier} se cierra a tu alrededor`,
    ringOf: (count: number, name: string) => `Cerco: un círculo de ${count} ${name} se cierra a tu alrededor`,
  },

  guide: {
    title: 'Cómo jugar Pokémon Survivors: guía completa',
    description:
      'Guía de Pokémon Survivors: controles en teclado, control y celular, cómo funciona la partida, niveles, movimientos, evolución de movimientos con objetos, ataque especial, tipos y estados, jefes, shinies, objetos y eventos del mapa y Poké Mart.',
    h1: 'Cómo jugar',
    intro:
      'Pokémon Survivors es un roguelite tipo Vampire Survivors: tú solo te mueves y tu Pokémon ataca solo. Esta guía explica todo lo que pasa en una partida, con los números del juego.',
    toc: 'En esta guía',
    sections: {
      controls: 'Controles',
      run: 'La partida',
      world: 'Biomas y clima',
      horde: 'La horda salvaje',
      levels: 'Niveles y movimientos',
      moveEvolutions: 'Evolución de movimientos',
      special: 'Ataque especial',
      types: 'Tipos y estados',
      bosses: 'Jefes',
      traits: 'Enemigos especiales',
      rifts: 'Grietas legendarias y modo infinito',
      megas: 'Megaevolución',
      shinies: 'Shinies',
      eggs: 'Huevos e incubadora',
      items: 'Objetos en el mapa',
      mapEvents: 'Eventos en el mapa',
      mart: 'Poké Mart y Poké Dollars',
      missions: 'Misiones y logros',
      settings: 'Ajustes y música',
    },
    controls: {
      head: { action: 'Acción', keyboard: 'Teclado', gamepad: 'Control', touch: 'Táctil' },
      rows: [
        ['Moverse', 'WASD o flechas', 'D-pad o stick izquierdo', 'Arrastra en cualquier parte de la pantalla (joystick flotante)'],
        ['Ataque especial', 'Espacio', 'A (Xbox) o ✕ (PlayStation)', 'Botón redondo abajo a la derecha'],
        ['Megaevolución', 'E', 'Y (Xbox) o △ (PlayStation)', 'Botón MEGA, arriba del especial'],
        ['Embestida (Quick Attack, Extreme Speed)', 'Shift', 'X (Xbox) o □ (PlayStation)', 'Botón redondo a la izquierda del especial'],
        ['Pausar', 'Esc o P', 'Start', 'Botón arriba a la derecha'],
        ['Navegar por los menús', 'Flechas, Enter confirma, Esc vuelve', 'D-pad o stick izquierdo, A confirma, B vuelve', 'Toca'],
        ['Elegir mejora', '1 a 3, o ↑ ↓ y Enter', 'D-pad y A', 'Toca la opción'],
        ['Elegir el inicial', '← → compañero, ↑ ↓ región, 1 a 9, Enter', 'D-pad y A', 'Toca para ver, toca otra vez para elegir'],
        ['Abrir el Poké Mart', 'L en la selección de compañero', '—', 'Botón POKé MART, arriba a la derecha'],
        ['Activar/desactivar sonido', 'M', 'Ajustes', 'Ajustes'],
        ['Idioma', 'I en la pantalla de título, o Ajustes', 'Ajustes', 'PT | EN | ES en la pantalla de título, o Ajustes'],
      ],
      notes: [
        'Con control, el D-pad y el stick izquierdo mueven al Pokémon y navegan por todos los menús, A confirma, B vuelve y Start pausa. Durante la partida, A usa el ataque especial.',
        'En Ajustes → Controles → Teclado y control, puedes cambiar la tecla y el botón del control de cada acción (moverse, especial, Mega, embestida, pausa, confirmar y volver). Las flechas y Esc siempre funcionan.',
        'En el celular puedes instalar el juego como app a pantalla completa: abre el menú del navegador y elige "Agregar a la pantalla de inicio".',
      ],
    },
    run: {
      paragraphs: (minutes: number, starters: number) => [
        `Elige uno de los ${starters} iniciales, de Kanto a Paldea. Cada uno tiene sus propias estadísticas, movimiento inicial, movimientos que aprende y ataque especial (mira la Pokédex).`,
        `Muévete por el campo y esquiva: los movimientos se disparan solos al ritmo de su recarga. Sobrevive ${minutes} minutos de hordas cada vez más grandes. Al final aparece Mewtwo, y derrotarlo gana la partida. Después, si quieres, puedes seguir en el modo infinito.`,
        'Si tu HP llega a cero, la partida termina (a menos que tengas un Revive guardado). Los Poké Dollars que recogiste van a tu billetera.',
      ],
      scaling: (rows: readonly (readonly [string, string, string])[]) =>
        `Los enemigos comunes se vuelven más fuertes cada minuto (los jefes no): ${rows.map(([at, hp, dmg]) => `a las ${at}, ${hp}x de HP y ${dmg}x de daño`).join('; ')}.`,
      difficulty: 'Dificultad',
      difficultyIntro:
        'Elige la dificultad en la pantalla de selección de Pokémon, debajo del botón de elegir (o con la tecla X). Todas vienen desbloqueadas y tu elección queda guardada. Normal es la partida base; los otros niveles multiplican:',
      difficultyHead: ['Nivel', 'HP de los enemigos', 'Daño que recibes', 'Ritmo de aparición', 'Velocidad de los enemigos', 'Escala por minuto', 'Curación'],
      timeline: 'Línea de tiempo',
      timeHead: 'Tiempo',
      eventHead: 'Evento',
      boss: (name: string) => `Jefe: ${name}`,
      bossChance: (name: string, percent: number) => `Jefe raro: ${name} (${n(percent)}% de probabilidad)`,
      bossTrio: (names: string) => `Jefe: el trío legendario de la partida (${names})`,
    },
    world: {
      paragraphs: (count, minutes, odds) => [
        `La partida atraviesa ${count} biomas, ${n(minutes)} minutos en cada uno, sin pantalla de carga: el suelo se disuelve en el escenario siguiente y cada bioma tiene su propia música. Los objetos rompibles también cambian de aspecto (en la cueva, la hierba alta se vuelve una roca y el árbol de bayas, un hongo gigante).`,
        `Cada bioma inclina la horda hacia sus tipos: las especies nuevas de cada fase tienen ${n(odds)}x más probabilidad de ser de un tipo local (más Planta y Bicho en el bosque, más Roca y Tierra en la cueva), sin dejar de lado a los demás.`,
        'El clima cambia algunas veces por partida y afecta a todos: a tus movimientos y a los ataques de los enemigos. Cada bioma tiene sus climas más probables, y el ícono del clima aparece junto al reloj.',
      ],
      timeHead: 'Desde',
      biomeHead: 'Bioma',
      hordeHead: 'Tipos de la horda',
      weatherHead: 'Climas (del más al menos común)',
      weatherTitle: 'Climas',
      weatherCol: 'Clima',
      effectHead: 'Efecto',
      power: (type, mult) => `movimientos de tipo ${type} ×${n(mult)}`,
      chip: (enemy, boss, player, every, floor, immune) =>
        `cada ${n(every)}s, los enemigos pierden el ${n(enemy)}% de su HP máximo (los jefes, el ${n(boss)}%) y tú pierdes el ${n(player)}%, pero nunca por debajo del ${n(floor)}% del HP. Los tipos ${list(immune)} son inmunes`,
      fog: 'la visión se acorta: solo ves bien muy cerca de tu Pokémon',
    },
    levels: {
      paragraphs: (moves: number, items: number, moveLevel: number) => [
        'Los Pokémon derrotados sueltan Exp. Candies. Acércate a ellos para recogerlos (la Dowsing Machine aumenta el alcance).',
        `En cada nivel, elige 1 de 3 ofertas: un movimiento nuevo de la lista de tu Pokémon, una mejora de movimiento, un held item nuevo o un nivel más de objeto. Puedes tener hasta ${moves} movimientos y ${items} objetos. Los movimientos llegan hasta el Nv. ${moveLevel}.`,
        'Los objetos de tipo (Charcoal, Mystic Water…) solo aparecen si tu Pokémon aprende movimientos de ese tipo. Cuando no queda nada que ofrecer, llega una Oran Berry (+40 HP).',
        'Cambiar (sortear otras ofertas) y Saltar (renunciar a la subida de nivel sin elegir nada, útil cuando ninguna oferta sirve) son cargas que se compran en el Poké Mart.',
      ],
      evolution: (first: number, second: number) =>
        `Tu Pokémon evoluciona en el Nv. ${first} y en el Nv. ${second}, como en los juegos. Cada evolución da más HP y estadísticas, y la evolución final potencia el ataque especial.`,
      itemsTitle: 'Held items',
      itemHead: 'Objeto',
      effectHead: 'Efecto por nivel',
      levelsHead: 'Niveles',
    },
    moveEvolutions: {
      paragraphs: [
        'Como en Vampire Survivors: lleva un movimiento al nivel máximo y ten el objeto que le corresponde. En la siguiente subida de nivel (o en la siguiente Poké Ball), la evolución aparece como oferta y reemplaza al movimiento en el mismo espacio.',
        'Un objeto puede evolucionar más de un movimiento: Charcoal sirve para Ember y para Fire Spin, por ejemplo.',
      ],
      moveHead: 'Movimiento (nivel máx.)',
      itemHead: 'Objeto',
      resultHead: 'Evolución',
      noEvolution: (moves: string) => `Todavía sin evolución: ${moves}.`,
    },
    special: {
      paragraphs: (min: number) => [
        'Además de los movimientos automáticos, todo Pokémon tiene un ataque especial manual: presiona Espacio, el botón A / ✕ del control o el botón redondo en la pantalla. Se carga por un instante (te mueves más lento) y luego se dispara: algunos apuntan hacia donde caminas, otros golpean todo a tu alrededor o caen del cielo sobre los enemigos más cercanos. Quick Attack y Extreme Speed también son manuales, porque te mueven: presiona Shift, X / □ o el botón de embestida para lanzarte contra el enemigo de enfrente.',
        `Cada uno de los 18 tipos tiene su especial, y tu Pokémon usa el de su primer tipo. La recarga baja con la estadística Recarga, hasta un mínimo de ${min}s. En la evolución final se vuelve la versión más fuerte, con más daño y área.`,
        'Algunas líneas ágiles cambian el especial de tipo por una embestida en cadena: el Pokémon avanza cortando hasta el enemigo más cercano y, si acierta, tiene medio segundo para presionar otra vez y saltar al siguiente, hasta su límite de saltos. La recarga solo empieza cuando termina la cadena. Aegislash cambia el especial por Cambio Táctico: alterna entre la Forma Escudo, que recibe menos daño, y la Forma Filo, que pega más fuerte.',
      ],
      typeHead: 'Tipo',
      moveHead: 'Especial → evolución final',
      cooldownHead: 'Recarga',
      usersHead: 'Quién lo usa',
      noUsers: 'Ningún Pokémon jugable todavía',
    },
    types: {
      chart: (strong: string, double: string, weak: string, immune: string) =>
        `El daño usa la tabla de tipos real, suavizada para que ninguna build quede inútil: súper eficaz causa ${strong}x, doblemente súper eficaz ${double}x, poco eficaz ${weak}x, y la inmunidad se vuelve ${immune}x. Los números amarillos con "!" indican un movimiento súper eficaz.`,
      statusIntro: 'Algunos movimientos causan problemas de estado. La probabilidad y la fuerza crecen con mejoras y objetos.',
      statusHead: 'Estado',
      movesHead: 'Lo causa',
      effectHead: 'Efecto',
      names: { burn: 'Quemadura', poison: 'Veneno', paralysis: 'Parálisis', slow: 'Lentitud', sleep: 'Sueño' },
      effects: {
        burn: (attack: number) => `Daño por segundo. El enemigo quemado solo causa el ${n(attack * 100)}% del daño por contacto.`,
        poison: (stacks: number) => `Daño por segundo que se acumula hasta ${stacks}x.`,
        paralysis: (boss: number) => `Inmoviliza al enemigo por un instante y después se traba de vez en cuando. En jefes dura el ${n(boss * 100)}% del tiempo.`,
        slow: (boss: number) => `Ralentiza a quien está cerca. En jefes dura el ${n(boss * 100)}% del tiempo.`,
        sleep: (seconds: number, boss: number) => `Los enemigos en pantalla se duermen durante ${seconds}s. En jefes dura el ${n(boss * 100)}% del tiempo.`,
      },
      flute: 'Poké Flute (objeto del mapa)',
      itemsNote: 'King\'s Rock aumenta la probabilidad de estado, Toxic Orb aumenta el daño de quemadura y veneno, y Light Clay hace que los estados duren más.',
    },
    megas: {
      paragraphs: (m) => [
        `${m.lines} líneas pueden megaevolucionar. El primer legendario de grieta que derrotes con una de ellas deja la Mega Stone de la línea junto con el tesoro. ${m.twins} tienen dos Megas: el legendario deja las dos piedras y la que recojas decide la Mega (la otra se desintegra). Con la piedra en la mano y el Pokémon en su evolución final, aparece el botón MEGA (tecla E, o Y en el control).`,
        `Al presionarlo, la Piedra activadora reacciona: el mundo se detiene ${m.intro}s mientras la energía arcoíris envuelve al Pokémon, y la Megaevolución termina en una explosión que empuja y daña a la horda alrededor y te deja invulnerable por un instante. La forma Mega dura ${m.duration}s, gana las estadísticas de abajo, cambia el especial por el suyo (listo para usar al momento) y activa su habilidad. Después vuelve a la normalidad y necesita ${m.recharge}s para megaevolucionar otra vez: guárdala para un jefe, una grieta o un cerco.`,
      ],
      megaHead: 'Mega',
      stoneHead: 'Mega Stone',
      abilityHead: 'Habilidad',
      specialHead: 'Especial Mega',
    },
    rifts: {
      paragraphs: (r) => [
        `Desde las ${r.first}, más o menos cada ${n(r.every)} minutos, se abre una grieta legendaria fuera de la pantalla, con una flecha morada en el borde que apunta hacia ella. Se queda abierta ${r.portal}s. Si hay un jefe vivo en ese momento, espera a que caiga hasta ${r.bossWait}s, así que toda partida tiene 3 grietas, aunque los jefes tarden.`,
        `Entrar es opcional: quédate ${n(r.enter)}s dentro de la grieta. Te lleva a la arena de un legendario de otra generación, cada una con su forma y su terreno: islas en aguas poco profundas, pilares para cubrirte, un pozo cuya marea sube, ríos de lava con puentes, un borde que se derrumba, una isla rodeada de oleaje, un meteoro en el espacio. Tienes ${r.arena}s para vencerlo; si se acaba el tiempo, la grieta colapsa y te devuelve sin recompensa.`,
        'El reloj de la partida sigue corriendo adentro, pero la horda de afuera se congela y no aparece nada nuevo. Cuando vuelves, los enemigos son más fuertes porque pasó el tiempo, y los eventos que quedaron pendientes llegan de golpe.',
        `La recompensa vale el riesgo: mucha EXP, dos bolsas de ₽ además de la lluvia del jefe, Poké Balls extra, un Rare Candy, una Super Potion y la mitad del HP de vuelta. En 1 de cada ${r.shiny} grietas el legendario es shiny y paga el doble de ₽ y una Poké Ball más.`,
      ],
      legendHead: 'Legendario',
      typesHead: 'Tipos',
      hpHead: 'HP base',
      attacksHead: 'Ataques',
      hpNote: (percent) => `El HP base es el de la primera grieta, a las 3:30. Después, el HP y el daño por contacto del legendario crecen con el reloj: +${n(percent)}% de HP por minuto. Cada grieta trae un legendario distinto.`,
      endlessTitle: 'Modo infinito',
      endless: (e) => [
        'Después de derrotar a Mewtwo, la pantalla de victoria te ofrece seguir en el modo infinito. Si no quieres, sales con la victoria normal, y la bonificación se paga en el acto.',
        `La horda no deja de crecer: aparecen más enemigos, sube el límite en pantalla y los cercos y bandadas llegan cada ${e.every} segundos. Las grietas se siguen abriendo.`,
        `A las ${e.reaper}, Arceus desciende para cazarte. Se vuelve más rápido cuanto más tiempo caza, hasta que nadie puede escapar, y nunca te pierde: si te alejas, reaparece en el borde de la pantalla. Se le puede derrotar, pero tiene ${e.hp} de HP; si cae, vuelve ${e.returns} minutos después, más fuerte.`,
        `El tiempo sobrevivido es la métrica principal: cada minuto después de las 15:00 paga ₽${n(e.perMinute)} en la bonificación, y cada Arceus derrotado, ₽${e.reaperBonus} más.`,
      ],
    },
    bosses: {
      paragraphs: (r) => [
        'Los jefes llegan en horarios fijos. Los legendarios entran con un destello en la pantalla, su grito y un aviso. Todos tienen una barra de HP arriba y ataques propios: los círculos marcados en el suelo avisan dónde va a caer el golpe, así que sal de ellos.',
        `Cada jefe alterna entre dos formas de pelear cada ${r.stance[0]} a ${r.stance[1]} segundos: de cerca, avanza rápido y golpea en área a su alrededor; a distancia, se detiene a unos pasos y te apunta. Por debajo del ${n(r.below * 100)}% del HP se enfurece (contorno rojo, grito y destello en la pantalla): ${n(Math.round((r.speed - 1) * 100))}% más rápido, ataca ${n(Math.round((1 - r.wait) * 100))}% más seguido y, el ${n(r.chain * 100)}% de las veces, encadena un segundo ataque justo después del primero.`,
        'Los jefes no se vuelven más fuertes con el tiempo, pero cada uno suelta una Poké Ball y una lluvia de Poké Dollars.',
        `En los primeros ${r.window}s de cada jefe, mientras esté cerca, solo aparece el ${n(r.fight * 100)}% de los enemigos comunes, así que la pelea es con él; después vuelve la horda. Cada jefe tiene hasta que llegue el siguiente: si sigue en pie cuando aparece el próximo, huye y no deja nada. Mewtwo es el último: al llegar, aleja a la horda y, mientras siga en pie, solo aparece el ${n(r.finale * 100)}% de los enemigos comunes, así que la pelea se trata de esquivar sus ataques.`,
      ],
      trios: (times, trios, mythicals, percent) => [
        `A las ${list(times)} llegan los tres miembros de un trío legendario, sorteado al comienzo de cada partida: ${list(trios)}. El HP, el daño por contacto y la velocidad dependen del horario, no del Pokémon, así que ningún sorteo es más fácil que otro; lo que cambia son los ataques.`,
        `Al final, con un ${n(percent)}% de probabilidad, un Pokémon mítico llega junto con Mewtwo: ${mythicals}, también sorteado en cada partida.`,
      ],
      timeHead: 'Tiempo',
      bossHead: 'Jefe',
      hpHead: 'HP',
      attacksHead: 'Ataques',
    },
    traits: {
      paragraphs: (from, cap, alive) => [
        `Algunos Pokémon salvajes no solo persiguen: curan, protegen y llaman a la horda, o atacan a distancia. Son el condimento, no la mayoría: desde las ${from}, cada fase trae como máximo ${cap === 1 ? 'una especie' : `${cap} especies`} con comportamiento, aparece menos que las demás y nunca hay más de ${alive} vivos al mismo tiempo. Vale la pena estar atento.`,
        'Todos sus ataques avisan antes: un "!" sobre la cabeza, un círculo rojo, una línea o una sombra en el suelo que parpadea más rápido cuando el golpe está cerca. La primera vez que cada uno aparece en una partida, un aviso explica lo que hace.',
      ],
      pokemonHead: 'Pokémon',
      traitHead: 'Comportamiento',
      effectHead: 'Qué hace',
    },
    shinies: {
      paragraphs: (wild: number, hp: number, xp: number, player: number, rift: number, species: number) => [
        `Cada Pokémon salvaje común tiene 1 probabilidad entre ${n(wild)} de aparecer shiny. Se vuelve una élite con ${hp}x de HP y ${xp}x de EXP, y siempre suelta una Poké Ball y Poké Dollars. Los jefes del mapa, Mewtwo y Arceus nunca son shiny, pero el legendario de una grieta tiene 1 probabilidad entre ${rift} de serlo, y paga más.`,
        `Tu inicial tiene 1 probabilidad entre ${player} de ser shiny, y sigue siendo shiny en todas las evoluciones de esa partida.`,
        'La Poké Ball (de jefes y shinies) da una mejora aleatoria al instante, o una evolución de movimiento si alguna está lista.',
        `El shiny derrotado es tuyo: queda marcado como capturado, con su brillo, en la Pokédex del juego (Pokédex, en el menú del título). También cuentan como capturados el Pokémon que sale de un huevo (y su línea evolutiva queda vista) y cada forma con la que jugaste, incluidas las que alcanzaste evolucionando. La Pokédex tiene las ${species} especies del juego, recuerda cada una que viste y cuántas derrotaste, y el final de la partida muestra lo que se agregó.`,
      ],
      seeAll: 'Mira todos los shinies en la Pokédex',
    },
    eggs: {
      paragraphs: (starters, families, slots, perRun, stepPx, shiny, weight) => [
        `Además de los ${starters} iniciales, ${families} familias de Pokémon jugables salen de huevos, de todos los tipos y generaciones: son ${starters + families} Pokémon para jugar. Cada una tiene movimiento inicial, especial, evolución a mitad de partida y estadísticas propias.`,
        `Los jefes, los cofres con candado y las grietas a veces dejan un huevo, como máximo ${perRun} por partida. Va a la incubadora, que tiene ${slots} espacios. Cada ${stepPx} px recorridos en una partida cuentan como un paso, y todos los huevos de la incubadora avanzan juntos. El huevo encontrado a mitad de partida ya cuenta los pasos dados después de encontrarlo.`,
        `Cuando un huevo está listo, eclosiona al salir de la partida o en la incubadora (en el menú principal y en la pestaña Huevos de la selección de compañero). Las familias que todavía no tienes salen ${weight}x más. La cría tiene 1 probabilidad entre ${shiny} de ser shiny, y entonces es shiny en todas las partidas.`,
        'Un repetido, o un huevo encontrado con la incubadora llena, se convierte en Poké Dollars. El jugador que nunca tuvo un huevo recibe el primero con seguridad.',
        'El Huevo de la Amistad no cae en las partidas: llega como Regalo Misterioso cuando creas tu cuenta con la invitación de alguien, y cuando un amigo al que invitaste juega 3 partidas verificadas. Solo sale Munchlax de él. Con 3 amigos ganas el título Embajador(a) y un marco exclusivo, y con 10, un Munchlax shiny.',
      ],
      tierHead: 'Huevo',
      stepsHead: 'Pasos',
      refundHead: 'Repetido o sin espacio',
      familiesHead: 'Puede eclosionar',
      sourceHead: 'Dónde cae',
      chanceHead: 'Probabilidad',
      oddsHead: 'Rareza',
      sources: {
        boss: 'Onix, Snorlax y el trío legendario',
        chest: 'Cofre con candado',
        rift: 'Legendario de una grieta',
        final: 'Mewtwo y el mítico raro (Mew, Celebi o Jirachi)',
        reaper: 'Arceus, en el modo infinito',
      },
    },
    items: {
      intro: 'Por el mapa aparecen fuentes de objetos. Cualquier movimiento las rompe, y cada una suelta un objeto. Los objetos más fuertes se vuelven más comunes al final de la partida.',
      sourceHead: 'Fuente',
      hitsHead: 'Golpes para romperla',
      enemyNote: (berry: number, item: number) =>
        `Los enemigos comunes también sueltan una Oran Berry (${n(berry)}% de probabilidad) o un objeto (${n(item)}%).`,
      sources: { itemBall: 'Item Ball', berryTree: 'Berry Tree', tallGrass: 'Hierba alta', enemy: 'Enemigos' },
      itemHead: 'Objeto',
      effectHead: 'Efecto',
      whereHead: 'Dónde aparece',
      effects: {
        oranBerry: 'Recupera el 30% del HP máximo.',
        potion: 'Recupera 30 HP.',
        superPotion: 'Recupera 60 HP.',
        rareCandy: 'Sube un nivel al instante.',
        expShare: 'Atrae hacia ti todos los Exp. Candies del mapa.',
        pokeFlute: 'Duerme a los Pokémon salvajes en pantalla.',
        maxRepel: 'Invulnerable por unos segundos, empujando a los enemigos lejos.',
        explosion: 'Voltorb usa Explosion: derriba a todos los enemigos comunes en pantalla y les quita el 10% del HP a los jefes.',
        xAttack: '50% más de daño durante 20s.',
        xSpeed: 'Más velocidad y recarga más rápida durante 20s.',
        revive: 'Queda guardado. Cuando te debilites, te levantas con el 50% del HP.',
      },
    },
    mapEvents: {
      intro: (first: number, gap: number, max: number) =>
        `Desde los ${first}s de partida, más o menos cada ${gap}s puede surgir un punto de interés cerca de ti (como máximo ${max} al mismo tiempo). Los importantes tienen una flecha en el borde de la pantalla. Si tardas, desaparecen.`,
      eventHead: 'Evento',
      howHead: 'Cómo funciona',
      rewardHead: 'Recompensa',
      altar: {
        name: 'Altar',
        how: 'Párate sobre él. El potenciador que da flota encima, para que decidas desde lejos.',
        reward: (boost: number) => `X Attack, X Speed o Max Repel (el sorteo evita el que ya está activo), con ${n(boost)}x la duración normal.`,
      },
      fountain: {
        name: 'Fuente',
        how: (charges: number, interval: number) => `Quédate en ella mientras estés herido: ${charges} cargas, una cada ${n(interval)}s. Con el HP lleno, no se gasta nada.`,
        reward: (heal: number) => `Cada carga recupera el ${n(heal)}% del HP máximo.`,
      },
      chest: {
        name: 'Cofre con candado',
        how: (unlock: number) =>
          `Quédate dentro del anillo durante ${unlock}s. Fuera de él, el progreso retrocede despacio. En cuanto empiezas, una emboscada de Pokémon salvajes te rodea.`,
        reward: (coins: string) => `${coins} o más (crece con el tiempo), un objeto y una Poké Ball.`,
      },
      spikes: {
        name: 'Púas',
        how: 'Las púas salen cada cierto tiempo, con un aviso parpadeante antes. Dañan a quien esté encima: a ti y a los salvajes.',
        reward: 'Atrae a la horda encima de ellas.',
      },
      bomb: {
        name: 'Bomba',
        how: (fuse: number) => `Cualquiera que se acerque enciende la mecha. ${n(fuse)}s después explota y daña todo en el radio, incluido tú.`,
        reward: 'Deja que la horda la encienda y aléjate.',
      },
      meowth: {
        name: 'Meowth fugitivo',
        how: (ttl: number) => `Huye de ti y escapa en ${ttl}s. Tus movimientos lo alcanzan.`,
        reward: (jackpot: string) => `Una moneda con cada golpe y el Pay Day (${jackpot}) si se debilita.`,
      },
    },
    mart: {
      paragraphs: (coins: readonly number[], minute: number, kills: number, victory: number) => [
        `Los enemigos derrotados a veces sueltan Poké Dollars: moneda, pila y bolsa (${list(coins.map((c) => `₽${n(c)}`))}). Los más fuertes sueltan con más frecuencia, y los jefes y shinies siempre pagan.`,
        `Al final de la partida llega una bonificación: ₽${minute} por minuto sobrevivido, ₽1 cada ${kills} derrotados y ₽${n(victory)} por la victoria. Si abandonas desde la pausa te quedas con las monedas, pero pierdes la bonificación.`,
        'Gástalo todo en el Poké Mart (botón arriba a la derecha de la selección de compañero) en mejoras permanentes. El botón Reembolsar te devuelve todo lo que gastaste, para probar otras combinaciones. El progreso se guarda solo en este navegador.',
      ],
      upgradeHead: 'Mejora',
      effectHead: 'Efecto',
      pricesHead: 'Precio por nivel',
    },
    missions: {
      paragraphs: (daily, weekly, dailyRewards, weeklyRewards, medals) => [
        `Misiones está en el menú de la pantalla de título. Cada día salen ${daily} misiones diarias (${dailyRewards}) y cada semana ${weekly} semanales (${weeklyRewards}). Se sortean según la fecha de tu dispositivo, así que todos reciben las mismas el mismo día: las diarias cambian a medianoche y las semanales el lunes.`,
        'El progreso cuenta al final de cada partida, aunque abandones desde la pausa, y suma las partidas del día o de la semana. Las misiones de sobrevivir, de nivel, del modo infinito y de especies vistas cuentan tu mejor partida. Las misiones usan lo que tiene el juego: derrotar Pokémon de un tipo, en un clima o en un bioma, ganar grietas, abrir cofres, conseguir el Pay Day de Meowth, derrotar shinies y jefes, recoger Poké Dollars, caminar, ver especies distintas, eclosionar huevos (cuenta cuando el huevo eclosiona) y vencer a Mewtwo con un inicial de cierto tipo. La recompensa va directo a tu billetera, y algunas semanales también dan un huevo.',
        `Los logros son metas para toda la vida, con medalla de bronce, plata u oro (${medals}). Algunos dan un título, como Cazador de Shinies: tócalo en la pestaña Logros para mostrarlo en la pantalla de título y en el resultado de cada partida. Los huevos de recompensa van a la incubadora (si está llena, se convierten en Poké Dollars) y, al final de una partida, comparten con los huevos encontrados el límite de huevos por partida.`,
      ],
      medalHead: 'Medalla',
      nameHead: 'Logro',
      goalHead: 'Cómo conseguirlo',
      titleHead: 'Título',
      medals: { bronze: 'Bronce', silver: 'Plata', gold: 'Oro' },
    },
    settings: {
      paragraphs: [
        'Los Ajustes están en el menú de la pantalla de título y en el menú de pausa, que solo tiene Continuar · Ajustes · Abandonar. Todo se aplica al instante y queda guardado en este navegador.',
        'La banda sonora es original, en estilo chiptune, compuesta en código y sintetizada en vivo en el navegador, sin archivos de audio: un tema de pueblo en los menús, una marcha durante la partida y un tema de jefe mientras hay un jefe vivo.',
      ],
      optionHead: 'Opción',
      effectHead: 'Qué hace',
      rows: [
        ['Música', 'Volumen de la banda sonora.'],
        ['Efectos', 'Volumen de los efectos de sonido y de los cries.'],
        ['Sonido', 'Activa o desactiva todo el sonido (atajo: M).'],
        ['Números de daño', 'Muestra u oculta los números de daño en pantalla.'],
        ['Temblor de pantalla', 'Activa o desactiva el temblor en explosiones y golpes fuertes.'],
        ['Idioma', 'Cambia entre español, portugués e inglés.'],
      ],
    },
    cta: '¿Listo? Elige a tu compañero y juega.',
  },

  changelog: {
    title: 'Novedades de Pokémon Survivors: historial de actualizaciones',
    description:
      'Todo lo que cambió en Pokémon Survivors, actualización por actualización: iniciales, jefes legendarios, shinies, evolución de movimientos, Poké Mart, versión para celular y más.',
    h1: 'Novedades',
    intro: 'El historial de actualizaciones del juego, de la más nueva a la más antigua. Cada entrada lleva al pull request con los detalles en GitHub.',
    pr: (n: number) => `PR #${n}`,
  },

  support: {
    title: 'Apoya Pokémon Survivors | Dona con tarjeta, Apple Pay o Google Pay',
    description:
      'Pokémon Survivors es gratis, sin anuncios y sin nada a la venta. Si quieres ayudar a pagar los servidores, dona con tarjeta, Apple Pay o Google Pay desde cualquier país (Stripe), o con Pix o tarjeta brasileña desde Brasil (AbacatePay). Con una cuenta, quien dona recibe un agradecimiento cosmético en el juego: título, marco, sello, un shiny a su elección y un compañero.',
    h1: 'Apoya el proyecto',
    lead: 'El juego es gratis y seguirá así, sin anuncios y sin nada a la venta. Si te divirtió y quieres ayudar a pagar los servidores (cuentas, ranking y el Desafío del día), cualquier monto ayuda. Como agradecimiento, quien dona con una cuenta recibe recompensas cosméticas en el juego, nada que cambie una partida.',
    thanks: '¡Gracias por tu apoyo! ♥',
    status: {
      pending: 'Confirmando el pago… Puede tardar unos minutos (deja esta página abierta).',
      late: 'El pago aún no se confirmó. Vuelve a esta página en un rato para ver tu código.',
      sent: (handle: string) => `Las recompensas fueron para @${handle}. Llegan como Regalo Misterioso la próxima vez que el juego se sincronice.`,
      code: 'Tu código de canje:',
      codeHint: 'En el juego, inicia sesión y abre el ♥ del título → Tengo un código. Vale una vez, para la cuenta que lo canjee: puede ser la de un amigo.',
      copy: 'Copiar',
      copied: '¡Copiado!',
      used: 'El código de esta donación ya se canjeó.',
    },
    account: {
      title: 'Para quién son las recompensas',
      label: 'Tu @ en el juego',
      placeholder: 'tu_usuario',
      hint: 'Opcional. Con el @ de una cuenta (la tuya o la de un amigo), las recompensas van directo a ella. Sin él, recibes un código para canjear en el juego.',
      checking: 'Buscando…',
      found: (name: string) => `Para ${name}`,
      missing: 'Nadie tiene ese @ en el juego.',
    },
    perks: {
      title: 'Lo que recibe quien dona',
      items: [
        'El título y el marco de tarjeta Patrocinador(a).',
        'Un sello ♥ junto al @ en el ranking y en el perfil.',
        'Un shiny a su elección: cualquier inicial o familia de huevo (una familia que aún no eclosionó viene con él).',
        'Un compañero que lo sigue en las partidas.',
        'Su nombre en el mural de abajo y en los agradecimientos de la victoria.',
        'Voto en el próximo Pokémon de los huevos.',
        'Oro, con R$ 50 o US$ 10 en total: fondo de tarjeta, fondo de la Caja del PC y sello dorados.',
      ],
      note: 'Todo cosmético: nada cambia una partida ni el ranking. Las recompensas necesitan una cuenta en el juego (entrar con Google es gratis).',
    },
    wall: { title: 'Mural de patrocinadores', empty: 'Todavía no hay nadie. ¡Tu nombre puede ser el primero!' },
    pick: 'Elige cómo pagar',
    suggested: 'Sugerido para ti',
    br: {
      title: 'En Brasil',
      methods: 'Pix o tarjeta de crédito, en reales.',
      amount: 'Monto de la donación',
      other: 'Otro monto',
      range: (min: number, max: number) => `De R$ ${min} a R$ ${max}, sin centavos.`,
      cta: (amount: number) => `Donar R$ ${amount}`,
      loading: 'Abriendo el pago…',
      error: 'No se pudo abrir el pago ahora. Inténtalo de nuevo en unos instantes.',
      via: 'El pago se abre en AbacatePay. Tus datos de pago van directo a ellos.',
    },
    intl: {
      title: 'Otros países',
      methods: 'Tarjeta, Apple Pay o Google Pay, en dólares.',
      cta: 'Donar con Stripe',
      via: 'Eliges el monto en la página siguiente, en Stripe. Tus datos de pago van directo a ellos.',
    },
  },

  legal: {
    title: 'Legal, privacidad y créditos | Pokémon Survivors',
    description:
      'Pokémon Survivors es un fan game no oficial y gratuito, sin anuncios y sin compras. Licencias (código MIT, sprites CC BY-NC 4.0), privacidad (cuentas opcionales con perfil público en el ranking; como invitado, nada sale de tu dispositivo), créditos y contacto.',
    h1: 'Legal, privacidad y créditos',
    sections: {
      fanGame: 'Fan game no oficial',
      free: 'Gratis, sin anuncios y sin compras',
      licenses: 'Licencias y créditos',
      privacy: 'Privacidad',
      contact: 'Contacto y retiro de contenido',
    },
    fanGame: [
      'Pokémon Survivors es un fan game no oficial y sin fines de lucro, hecho por fans para fans por Pedro Barretto.',
      'No tiene ningún vínculo con Nintendo, The Pokémon Company, GAME FREAK inc., Creatures Inc. ni Spike Chunsoft, ni está respaldado, patrocinado o aprobado por ellas.',
      'Pokémon y los nombres de los personajes son marcas registradas de Nintendo. Pokémon © Nintendo, Creatures Inc. y GAME FREAK inc. Las demás marcas pertenecen a sus respectivos dueños.',
    ],
    free: [
      'El juego es gratuito y va a seguir así: no tiene anuncios, contenido pago ni compras dentro de la app.',
      'Los Poké Dollars (₽) existen solo dentro del juego y no se pueden comprar con dinero real.',
      'Si quieres, puedes donar en la página Apoya el proyecto. Las donaciones son voluntarias y, con una cuenta, solo dan un agradecimiento cosmético (título, marco, sello, un shiny a tu elección, un compañero), nada que cambie una partida o el ranking.',
    ],
    licenses: {
      code: 'Código fuente',
      codeText: 'Licencia MIT. Cubre solo el código original de este proyecto y no da ningún derecho sobre personajes, nombres, sonidos o artes de Pokémon.',
      sprites: 'Sprites y retratos',
      spritesText: 'PMD SpriteCollab, bajo la licencia CC BY-NC 4.0 (uso no comercial, con atribución). Cada artista aparece en los créditos.',
      creditsLink: 'Ver los créditos de cada artista (CREDITS.md)',
      cries: 'Cries (sonidos de los Pokémon)',
      criesText: 'PokéAPI/cries.',
      fonts: 'Fuentes',
      fontsText: 'Press Start 2P y VT323, bajo la SIL Open Font License (OFL). Servidas por el propio sitio.',
      inspiration: 'Inspiración',
      inspirationText: 'Vampire Survivors, de poncle.',
      nonCommercial: 'Como los sprites son CC BY-NC, el juego en su conjunto no se puede usar con fines comerciales.',
    },
    privacy: [
      'Jugar como invitado es la opción por defecto y no requiere registro: así el juego no usa cookies, anuncios ni rastreadores, y no recopila datos personales.',
      'Todo lo que el juego recuerda queda en el localStorage de tu navegador, en tu dispositivo. Como invitado, nada de eso se envía a ningún servidor:',
    ],
    storage: {
      'ps:save': 'Poké Dollars, mejoras compradas en el Poké Mart, la Pokédex del juego (especies vistas, cuántas derrotaste y cuáles capturaste), los huevos de la incubadora (eggs), los Pokémon eclosionados (hatched), el progreso de las misiones, los logros, los récords (como Pokémon derrotados y el mayor tiempo sobrevivido) y el título elegido.',
      'ps:settings': 'Ajustes: volumen de la música y de los efectos, sonido activado o desactivado, números de daño y temblor de pantalla.',
      'ps:lang': 'Idioma elegido (español, portugués o inglés).',
      'ps:muted': 'Solo si jugaste versiones antiguas: el sonido desactivado de antes de que existieran los Ajustes. El juego solo lee esta clave, ya no la escribe.',
      'ps:account': 'Solo si entras con una cuenta: qué cuenta está conectada en este dispositivo (su id, tu nombre y tu nombre de usuario) y la última versión del progreso que sincronizó.',
      'ps:runs': 'Solo con una cuenta: resultados de partidas que todavía no llegaron al ranking (por ejemplo, sin internet). Se borran de aquí en cuanto el servidor los recibe.',
    },
    account: [
      'Las cuentas son opcionales y sirven para guardar el progreso en la nube y continuar en otro dispositivo. El inicio de sesión es con Google, a través de Clerk (clerk.com), que recibe de Google tu nombre, correo electrónico y foto y usa sus propias cookies para mantener tu sesión iniciada. El juego nunca ve tu contraseña.',
      'Con una cuenta, una copia de ps:save queda en nuestro servidor, vinculada al id de tu cuenta. Se envía cuando inicias sesión, cuando abres el juego y al final de cada partida. En nuestro servidor quedan el id de la cuenta, el progreso, las fechas de creación y de uso y lo que necesita el ranking (abajo), sin tu correo electrónico.',
      'Con una cuenta, cada partida también va al ranking: el Pokémon, la dificultad, el tiempo sobrevivido, el nivel, cuántos enemigos derrotaste, si ganaste y la versión del juego, con la hora en que la partida empezó y terminó, vinculados al id de tu cuenta. Las partidas como invitado no van al ranking. Junto con ella va el replay de la partida (la semilla y los comandos que diste, nada personal), que el servidor vuelve a jugar para verificar el resultado y borra después de verificarlo.',
      'Tu perfil es público. Al iniciar sesión, eliges un nombre visible y un nombre de usuario único, que va en el enlace del perfil. Cualquier persona, con o sin cuenta, puede ver en el ranking y en el perfil: esos dos nombres, el título equipado, los récords por dificultad, el progreso de la Pokédex, las partidas recientes y cuántos seguidores tienes y a cuántos sigues. Tu correo electrónico y tu foto nunca aparecen. A quién sigues y quién te sigue queda guardado en el servidor; el perfil solo muestra los totales.',
      'Al cerrar sesión, el progreso sigue en este dispositivo. Para borrar la cuenta, el perfil, las partidas del ranking y el progreso guardado en ella, pídelo por el contacto de abajo.',
    ],
    privacyAfter: [
      'Para borrar estos datos, elimina los datos del sitio en la configuración del navegador.',
      'Los sprites, sonidos y fuentes vienen del propio sitio, sin llamadas a servicios de terceros. El sitio está alojado en Vercel, que, como cualquier servidor, puede registrar datos técnicos de acceso (como la dirección IP) para operar y proteger el servicio.',
      'Para saber cuántas personas visitan el sitio y juegan, usamos Vercel Web Analytics y una instancia propia de Umami, en un servidor nuestro. Cuentan las visitas de forma anónima y agregada (página, país, navegador, dispositivo y sitio de origen) y, en el caso de Umami, también el resumen de cada partida (Pokémon inicial, hasta qué minuto y nivel llegaste y si ganaste), sin cookies y sin identificarte ni seguirte entre sitios.',
      'Las donaciones se pagan en las páginas de AbacatePay (abacatepay.com: Pix y tarjetas brasileñas) o de Stripe (stripe.com: tarjetas de otros países, Apple Pay y Google Pay). Tus datos de pago van directo a ellos, y el juego nunca ve tu tarjeta. Nos muestran el monto y, como a cualquiera que recibe un pago, datos de quien pagó (como nombre y correo), que solo usamos para registrar la donación. Si das un @ (o canjeas el código de la donación), queda ligada a esa cuenta del juego para que lleguen las recompensas; el monto nunca se muestra en público, solo el sello de patrocinador, que puedes ocultar.',
    ],
    contact: [
      'Si tienes derechos sobre algún material usado aquí y quieres que se retire o se modifique, abre un issue en GitHub. La solicitud se atenderá rápidamente.',
      'Los bugs y las ideas también son bienvenidos allí.',
    ],
    issues: 'Abrir un issue en GitHub',
    source: 'Ver el código fuente',
  },
}
