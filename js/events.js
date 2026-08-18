/* =========================================================================
   DIAMANTE · events.js
   Decisiones de carrera: arranque profesional, fichajes, ascensos,
   cambios de posición, lesiones, escándalos y despedidas.
   ========================================================================= */
(function (global) {
  'use strict';

  const D = global.DATA;
  const E = global.ENGINE;
  const clamp = E.clamp;
  const fmt = E.fmt;

  /* Utilidades ---------------------------------------------------------- */
  const club = id => D.CLUB_BY_ID[id];
  const lgName = id => D.LEAGUES[id].name;

  function bump(st, attrsDelta) {
    const keys = E.attrKeysFor(st.pos);
    for (const k in attrsDelta) {
      if (keys.indexOf(k) === -1) continue;
      st.attrs[k] = clamp(Math.round(st.attrs[k] + attrsDelta[k]), 20, 99);
    }
    st.ovr = E.computeOvr(st.attrs, st.pos);
    if (st.ovr > st.peak) st.peak = st.ovr;
  }

  function bumpAll(st, delta) {
    const keys = E.attrKeysFor(st.pos);
    const d = {};
    keys.forEach(k => { d[k] = delta; });
    bump(st, d);
  }

  function sign(st, c, years, opts) {
    opts = opts || {};
    const salary = opts.salary != null ? opts.salary : E.offeredSalary(st, c, st.rng);
    E.assignClub(st, c, {
      years, salary,
      status: opts.status || 'pro',
      depth: opts.depth || 'titular',
      league: opts.league || c.lg
    });
    st.value = E.marketValue(st);
  }

  function money(v) { return fmt.money(v); }

  /* ======================================================================
     ARRANQUE: primera decisión, según el país
     ====================================================================== */
  function opening(st) {
    const rng = st.rng;
    const country = D.COUNTRY_BY_CODE[st.country];
    const path = country.path;

    /* Tres clubes interesados, ponderados por el semillero del país */
    const suitors = E.offerPool(st, 3, c => true);

    const mkSign = (c, cfg) => () => {
      sign(st, c, cfg.years || 5, { salary: cfg.salary, status: cfg.status, depth: cfg.depth, league: cfg.league });
      if (cfg.after) cfg.after();
      return { tone: cfg.tone || 'good', text: cfg.text };
    };

    if (path === 'draft') {
      const [a, b] = suitors;
      const bonusA = Math.round((3.5 + (st.ovr - 45) * 0.22 + a.mkt * 0.15) * 1e6 / 5e4) * 5e4;
      const bonusB = Math.round(bonusA * 0.42 / 5e4) * 5e4;
      return {
        id: 'start-draft',
        kicker: 'Día del Draft · ' + st.age + ' años',
        title: '¿Dónde empieza todo?',
        text: `Salís del instituto con los ojeadores en la grada. Dos organizaciones te ponen contrato sobre la mesa y una universidad te ofrece beca completa. Lo que elijas ahora decide cuánto tardás en pisar el césped grande.`,
        options: [
          { label: `Firmar con ${a.name}`, sub: `Primera ronda · bono de ${money(bonusA)}`, tag: 'Dinero ya',
            hint: 'Sistema exigente, pero los recursos están',
            apply: () => { E.assignMinors(st, a, 'ROK'); st.contractYears = 6; st.salary = 25000; st.fame += 6; st.value = E.marketValue(st);
              return { tone: 'good', text: `Firmás con ${a.name} por ${money(bonusA)} y arrancás en la liga de novatos.` }; } },
          { label: `Firmar con ${b.name}`, sub: `Ronda tardía · bono de ${money(bonusB)}`, tag: 'Camino corto',
            hint: 'Menos competencia interna: subís más rápido',
            apply: () => { E.assignMinors(st, b, 'ROK'); st.contractYears = 6; st.salary = 18000; bumpAll(st, 1.2); st.value = E.marketValue(st);
              return { tone: 'neutral', text: `Firmás con ${b.name}. Poco dinero, pero el camino hacia arriba está despejado.` }; } },
          { label: 'Ir a la universidad', sub: 'Tres años de formación antes de firmar', tag: 'Techo alto',
            hint: 'Perdés tiempo, ganás potencial',
            apply: () => {
              st.age += 2; st.year += 2;
              st.potential = clamp(st.potential + st.rng.int(4, 11), st.ovr + 4, 99);
              bumpAll(st, 5.5);
              const c = E.offerPool(st, 1)[0];
              E.assignMinors(st, c, 'A');
              st.contractYears = 6; st.salary = 30000; st.value = E.marketValue(st);
              return { tone: 'good', text: `Tres años de universidad después, ${c.name} te firma y te manda directo a Clase A. Llegás más tarde, pero más hecho.` };
            } }
        ]
      };
    }

    if (path === 'academia') {
      const [a, b, c] = suitors;
      const bonusA = Math.round((1.2 + (st.ovr - 42) * 0.14 + country.pool * 0.12) * 1e6 / 5e4) * 5e4;
      return {
        id: 'start-academia',
        kicker: 'Firma internacional · 16 años',
        title: 'La academia que te va a formar',
        text: `Llevás cinco años entrenando para este día. Tres organizaciones tienen academia abierta y quieren tu firma. El bono cambia la vida de tu familia; la formación cambia la tuya.`,
        options: [
          { label: `${a.name}`, sub: `Bono de ${money(bonusA)} · academia con historia`, tag: 'Bono grande',
            hint: 'La presión sube con el cheque',
            apply: () => { E.assignMinors(st, a, 'DSL'); st.status = 'academia'; st.league = 'DSL'; st.contractYears = 7; st.salary = 12000; st.fame += 5; st.value = E.marketValue(st);
              return { tone: 'good', text: `Firmás con ${a.name} por ${money(bonusA)}. Tu madre llora en el video que da la vuelta al barrio.` }; } },
          { label: `${b.name}`, sub: `Bono de ${money(Math.round(bonusA * 0.5))} · mejor desarrollo`, tag: 'Formación',
            hint: 'Programa de desarrollo de élite',
            apply: () => { E.assignMinors(st, b, 'DSL'); st.status = 'academia'; st.league = 'DSL'; st.contractYears = 7; st.salary = 9000; bumpAll(st, 2.4); st.potential = clamp(st.potential + 4, st.ovr + 3, 99); st.value = E.marketValue(st);
              return { tone: 'good', text: `Elegís ${b.name}: menos dinero hoy, mejores entrenadores mañana.` }; } },
          { label: `${c.name}`, sub: 'Bono modesto, pero camino directo al roster', tag: 'Oportunidad',
            hint: 'Organización con poca competencia interna',
            apply: () => { E.assignMinors(st, c, 'DSL'); st.status = 'academia'; st.league = 'DSL'; st.contractYears = 7; st.salary = 7000; bumpAll(st, 1); st.morale += 6; st.value = E.marketValue(st);
              return { tone: 'neutral', text: `Firmás con ${c.name}. Nadie te regala nada, pero la puerta está abierta.` }; } }
        ]
      };
    }

    if (path === 'cuba') {
      const ind = D.CLUBS.filter(x => x.lg === 'CUB');
      const home = st.rng.pick(ind);
      const jp = st.rng.pick(D.CLUBS.filter(x => x.lg === 'NPB'));
      const mlb = suitors[0];
      return {
        id: 'start-cuba',
        kicker: 'Serie Nacional · 16 años',
        title: 'La isla o el mundo',
        text: `Sos la joya de tu provincia. Podés hacerte grande en la Serie Nacional, aceptar el contrato que Japón le ofrece a la federación, o dar el salto que muchos dieron antes: salir, establecer residencia y declararte agente libre.`,
        options: [
          { label: `Jugar en ${home.name}`, sub: 'La Serie Nacional, tu gente, tu casa', tag: 'Raíces',
            hint: 'Menos nivel, pero jugás todos los días',
            apply: () => { sign(st, home, 6, { salary: 4000 }); st.morale += 12;
              return { tone: 'neutral', text: `Debutás con ${home.name} ante un estadio que corea tu apellido.` }; } },
          { label: `Aceptar la cesión a ${jp.name}`, sub: 'Japón paga y forma', tag: 'Nivel',
            hint: 'Salto de calidad inmediato',
            apply: () => { sign(st, jp, 4, {}); bumpAll(st, 2); st.fame += 8;
              return { tone: 'good', text: `Cruzás el Pacífico. ${jp.name} te presenta ante cien periodistas.` }; } },
          { label: 'Salir de la isla', sub: 'Riesgo alto, recompensa histórica', tag: 'Todo o nada',
            hint: '≈60% de que salga bien',
            apply: () => {
              if (st.rng.chance(0.6)) {
                E.assignMinors(st, mlb, 'AA'); st.contractYears = 6; st.salary = 400000; st.fame += 14;
                st.potential = clamp(st.potential + 5, st.ovr + 3, 99); st.value = E.marketValue(st);
                return { tone: 'good', text: `Tras meses de espera y papeles, ${mlb.name} te firma. Empezás en Doble A con toda la organización mirándote.` };
              }
              st.age += 2; st.year += 2; st.morale -= 20; bumpAll(st, -2);
              const h = st.rng.pick(ind);
              sign(st, h, 5, { salary: 4000 });
              return { tone: 'bad', text: `El trámite se cae. Dos años perdidos y volvés a empezar en ${h.name}, con la etiqueta puesta.` };
            } }
        ]
      };
    }

    if (path === 'npb' || path === 'kbo' || path === 'cpbl') {
      const lg = path === 'npb' ? 'NPB' : path === 'kbo' ? 'KBO' : 'CPBL';
      const locals = D.CLUBS.filter(x => x.lg === lg);
      const big = locals.slice().sort((a, b) => b.mkt - a.mkt)[0];
      const other = st.rng.pick(locals.filter(x => x.id !== big.id));
      const usa = suitors[0];
      return {
        id: 'start-asia',
        kicker: `Draft de ${lgName(lg)} · ${st.age} años`,
        title: 'El primer uniforme',
        text: `Venís de ganar el torneo escolar y el país entero vio la final por televisión. El draft local te espera, pero también hay una organización de Grandes Ligas dispuesta a llevarte ahora mismo a su sistema.`,
        options: [
          { label: `${big.name}`, sub: 'El club grande, la portada, la presión', tag: 'Foco total',
            hint: 'Fama inmediata, competencia dura',
            apply: () => { sign(st, big, 6, {}); st.fame += 12; st.morale -= 4;
              return { tone: 'good', text: `${big.name} te elige en primera ronda. Mañana estás en todos los diarios.` }; } },
          { label: `${other.name}`, sub: 'Menos ruido, más oportunidades', tag: 'Minutos',
            hint: 'Vas a jugar desde el primer año',
            apply: () => { sign(st, other, 6, {}); bumpAll(st, 1.6); st.morale += 8;
              return { tone: 'good', text: `Elegís ${other.name}: te prometen el puesto y te lo cumplen.` }; } },
          { label: `Cruzar a ${usa.name}`, sub: 'Ligas menores en Estados Unidos', tag: 'Apuesta',
            hint: 'Techo más alto, camino más largo',
            apply: () => { E.assignMinors(st, usa, 'A'); st.contractYears = 6; st.salary = 120000;
              st.potential = clamp(st.potential + 6, st.ovr + 3, 99); st.morale -= 6; st.value = E.marketValue(st);
              return { tone: 'neutral', text: `Te vas solo al otro lado del mundo. Autobuses, moteles y Clase A. Nadie dijo que fuera fácil.` }; } }
        ]
      };
    }

    if (path === 'mexico') {
      const lmb = D.CLUBS.filter(x => x.lg === 'LMB');
      const a = st.rng.pick(lmb);
      const b = st.rng.pick(lmb.filter(x => x.id !== a.id));
      const usa = suitors[0];
      return {
        id: 'start-mex',
        kicker: 'Liga Mexicana · ' + st.age + ' años',
        title: 'Dónde te hacés jugador',
        text: `La Liga Mexicana te quiere ya, y una organización de Grandes Ligas te ofrece el sistema de ligas menores. Dos maneras muy distintas de aprender el oficio.`,
        options: [
          { label: `${a.name}`, sub: 'Juego profesional desde el primer día', tag: 'Rodaje',
            hint: 'Vas a jugar mucho, contra veteranos',
            apply: () => { sign(st, a, 4, {}); bumpAll(st, 1.5); st.morale += 6;
              return { tone: 'good', text: `Debutás con ${a.name} y aprendés a los golpes, que es como se aprende.` }; } },
          { label: `${b.name}`, sub: 'Club con vitrina hacia el norte', tag: 'Escaparate',
            hint: 'Los ojeadores van a verte',
            apply: () => { sign(st, b, 4, {}); st.fame += 6;
              return { tone: 'good', text: `${b.name} te firma. En la grada siempre hay alguien tomando notas.` }; } },
          { label: `Firmar con ${usa.name}`, sub: 'Ligas menores, sistema completo', tag: 'Sistema',
            hint: 'Desarrollo de élite, paciencia obligatoria',
            apply: () => { E.assignMinors(st, usa, 'ROK'); st.contractYears = 6; st.salary = 80000;
              st.potential = clamp(st.potential + 4, st.ovr + 3, 99); st.value = E.marketValue(st);
              return { tone: 'neutral', text: `${usa.name} te lleva a su complejo. Empieza la escalera, escalón por escalón.` }; } }
        ]
      };
    }

    /* Europa, Oceanía y resto del mundo */
    const localLg = path === 'abl' ? 'ABL' : path === 'hoofd' ? 'HON' : 'ITA';
    const locals = D.CLUBS.filter(x => x.lg === localLg);
    const l1 = st.rng.pick(locals);
    const usa = suitors[0];
    return {
      id: 'start-europa',
      kicker: 'Sin sistema profesional · ' + st.age + ' años',
      title: 'Desde muy abajo',
      text: `En tu país el béisbol es un deporte de minorías. No hay academias ni draft: hay una liga local, un entrenador que cree en vos y un ojeador que pasó una vez por el campo.`,
      options: [
        { label: `${l1.name}`, sub: `${lgName(localLg)} · jugar en casa`, tag: 'Casa',
          hint: 'Nivel bajo, pero jugás todo',
          apply: () => { sign(st, l1, 4, {}); st.morale += 10; bumpAll(st, 1);
            return { tone: 'neutral', text: `Fichás por ${l1.name}. Cien personas en la grada y un sueño enorme.` }; } },
        { label: 'Beca en una academia de EE. UU.', sub: 'Te vas solo, a los 16', tag: 'Salto',
          hint: 'Desarrollo fuerte, desarraigo garantizado',
          apply: () => { st.age += 1; st.year += 1; bumpAll(st, 6); st.potential = clamp(st.potential + 8, st.ovr + 4, 99);
            E.assignMinors(st, usa, 'ROK'); st.contractYears = 6; st.salary = 40000; st.morale -= 10; st.value = E.marketValue(st);
            return { tone: 'good', text: `Un año de academia después, ${usa.name} te firma. Estás solo, pero estás dentro.` }; } },
        { label: 'Probar suerte en el tryout abierto', sub: 'Una tarde para convencer a todos', tag: 'Lotería',
          hint: '≈45% de firmar con una organización grande',
          apply: () => {
            if (st.rng.chance(0.45)) {
              E.assignMinors(st, usa, 'ROK'); st.contractYears = 6; st.salary = 60000; bumpAll(st, 2); st.value = E.marketValue(st);
              return { tone: 'good', text: `Tirás noventa millas y sacás la pelota del parque dos veces. ${usa.name} te firma esa misma tarde.` };
            }
            sign(st, l1, 4, {}); st.morale -= 8;
            return { tone: 'bad', text: `Nadie te llamó. Volvés a ${l1.name} con la lista de teléfonos vacía y algo que demostrar.` };
          } }
      ]
    };
  }

  /* ======================================================================
     PROGRESIÓN AUTOMÁTICA (ascensos y descensos entre niveles)
     ====================================================================== */
  const MINOR_LADDER = ['DSL', 'ROK', 'A', 'AA', 'AAA', 'MLB'];

  function autoProgress(st) {
    const notes = [];
    if (st.status !== 'minors' && st.status !== 'academia') return notes;
    const lvl = st.league;
    const idx = MINOR_LADDER.indexOf(lvl);
    if (idx < 0) return notes;
    const bar = E.leagueBar(lvl);
    const parent = E.parentClub(st);
    if (!parent) return notes;

    if (st.ovr > bar + 7 && idx < MINOR_LADDER.length - 2) {
      const next = MINOR_LADDER[idx + 1];
      E.assignMinors(st, parent, next);
      st.status = 'minors';
      notes.push({ tone: 'good', text: `Ascenso: subís a ${D.LEAGUES[next].name}.` });
    } else if (st.ovr < bar - 9 && idx > 1) {
      const prev = MINOR_LADDER[idx - 1];
      E.assignMinors(st, parent, prev);
      notes.push({ tone: 'bad', text: `Descenso: te mandan de vuelta a ${D.LEAGUES[prev].name}.` });
    }
    return notes;
  }

  /* ======================================================================
     CATÁLOGO DE EVENTOS
     ====================================================================== */
  const REG = [];
  const ev = e => REG.push(e);

  /* --- Llamado a Grandes Ligas ---------------------------------------- */
  ev({
    id: 'callup', weight: 100,
    when: st => st.status === 'minors' && st.league === 'AAA' && st.ovr >= E.leagueBar('MLB') - 6,
    build: st => {
      const parent = E.parentClub(st);
      return {
        id: 'callup',
        kicker: 'Llamada a las 7 de la mañana',
        title: '¿Subís ahora o esperás?',
        text: `${parent.name} necesita un cuerpo arriba. El puesto no es titular: entrarías como suplente, con turnos contados. Abajo, en cambio, estás dominando y jugás todos los días.`,
        options: [
          { label: 'Subir ya a Grandes Ligas', sub: 'Rol de suplente, pero es el debut', tag: 'Debut',
            hint: 'Menos juego, más nivel',
            apply: () => { E.assignClub(st, parent, { status: 'pro', depth: 'banca', league: 'MLB', years: Math.max(3, st.contractYears), salary: 760000 });
              st.fame += 10; st.morale += 14; st.flags.debut = st.year; st.value = E.marketValue(st);
              return { tone: 'good', text: `Debutás en Grandes Ligas con ${parent.name}. El primer turno no se olvida nunca.` }; } },
          { label: 'Terminar el año en Triple A', sub: 'Jugar todos los días y subir hecho', tag: 'Paciencia',
            hint: 'Mejor desarrollo, debut aplazado',
            apply: () => { bumpAll(st, 2.6); st.morale -= 5;
              return { tone: 'neutral', text: `Te quedás abajo. Duele, pero volvés a casa cada noche con turnos en las piernas.` }; } }
        ]
      };
    }
  });

  /* --- Agencia libre --------------------------------------------------- */
  ev({
    id: 'freeagency', weight: 130,
    when: st => st.status === 'pro' && st.contractYears <= 0 && st.age >= 20,
    build: st => {
      const cur = E.clubOf(st);
      const offers = E.offerPool(st, 3);
      const opts = [];
      const stay = cur && st.ovr > E.leagueBar(st.league) - 8;
      if (stay) {
        const sal = Math.round(E.offeredSalary(st, cur, st.rng) * 0.92);
        opts.push({
          label: `Renovar con ${cur.name}`, sub: `${money(sal)} por año · 4 temporadas`, tag: 'Lealtad',
          hint: 'La afición te lo va a devolver',
          apply: () => { sign(st, cur, 4, { salary: sal }); st.morale += 10; st.fame += 3;
            return { tone: 'good', text: `Seguís en ${cur.name}. Cuatro años más en la misma casa.` }; }
        });
      }
      offers.slice(0, stay ? 2 : 3).forEach(c => {
        const sal = E.offeredSalary(st, c, st.rng);
        const tag = c.str >= 8 ? 'Candidato' : c.mkt >= 8 ? 'Escaparate' : 'Protagonismo';
        const hint = c.str >= 8 ? 'Vas a pelear el anillo' : c.mkt >= 8 ? 'Mercado enorme, lupa encima'
          : 'Serías la figura del equipo';
        opts.push({
          label: `Firmar con ${c.name}`, sub: `${money(sal)} por año · ${c.div}`, tag, hint,
          apply: () => {
            const depth = c.str >= 8 && st.ovr < E.leagueBar('MLB') + 4 ? 'banca' : 'titular';
            sign(st, c, st.age > 32 ? 2 : 4, { salary: sal, depth });
            st.morale += c.str >= 8 ? 8 : 4;
            return { tone: 'good', text: `Te presentás con ${c.name} por ${money(sal)} anuales.` };
          }
        });
      });
      return {
        id: 'freeagency',
        kicker: 'Agencia libre · invierno',
        title: 'Tu contrato se acabó',
        text: `El teléfono de tu agente no para. Hay dinero, hay proyectos y hay una decisión que va a marcar el resto de tu carrera.`,
        options: opts
      };
    }
  });

  /* --- Oferta desde Asia ---------------------------------------------- */
  ev({
    id: 'asia', weight: 45,
    when: st => st.status === 'pro' && st.league === 'MLB' && st.age >= 27 && st.ovr < E.leagueBar('MLB') + 8,
    build: st => {
      const jp = st.rng.pick(D.CLUBS.filter(c => c.lg === 'NPB'));
      const kr = st.rng.pick(D.CLUBS.filter(c => c.lg === 'KBO'));
      const cur = E.clubOf(st);
      const salJp = Math.round(Math.max(2.2e6, E.marketValue(st) * 0.14));
      return {
        id: 'asia',
        kicker: 'Oferta desde el otro lado del mundo',
        title: 'Japón llama',
        text: `${jp.name} te ofrece ser la figura extranjera del equipo: contrato garantizado, cuarto bate y un país entero pendiente. En Grandes Ligas seguís peleando por un puesto que no siempre es tuyo.`,
        options: [
          { label: `Firmar con ${jp.name}`, sub: `${money(salJp)} por año · protagonismo total`, tag: 'Figura',
            hint: 'Jugás todo, pero lejos del foco de MLB',
            apply: () => { sign(st, jp, 3, { salary: salJp, depth: 'titular' }); st.morale += 12; bumpAll(st, 1.4);
              return { tone: 'good', text: `Aterrizás en Japón. Te reciben con banderas y tu apellido en katakana.` }; } },
          { label: `Firmar con ${kr.name}`, sub: `${money(Math.round(salJp * 0.55))} por año · Corea`, tag: 'Reinvención',
            hint: 'Liga ofensiva: los números van a subir',
            apply: () => { sign(st, kr, 2, { salary: Math.round(salJp * 0.55), depth: 'titular' }); st.morale += 8; bump(st, { pod: 2, con: 2, vel: 1, ctl: 2 });
              return { tone: 'good', text: `Corea te adopta. En dos semanas ya tenés canción propia en la grada.` }; } },
          { label: 'Quedarme en Grandes Ligas', sub: `Seguir peleando en ${cur ? cur.name : 'la liga'}`, tag: 'Orgullo',
            hint: 'El escenario más grande, sin garantías',
            apply: () => { st.morale -= 4; st.fame += 2;
              return { tone: 'neutral', text: `Rechazás la oferta. Querés retirarte en Grandes Ligas y punto.` }; } }
        ]
      };
    }
  });

  /* --- Cambio de posición ---------------------------------------------- */
  const POS_MOVES = {
    C: ['1B', 'DH'], SS: ['2B', '3B'], '2B': ['SS', 'LF'], '3B': ['1B', 'LF'],
    CF: ['LF', 'RF'], LF: ['1B', 'DH'], RF: ['1B', 'DH'], '1B': ['DH'], DH: ['1B'],
    SP: ['RP'], RP: ['SP']
  };
  ev({
    id: 'position', weight: 55,
    when: st => st.age >= 27 && st.status === 'pro' && POS_MOVES[st.pos] && st.proSeasons > 3,
    build: st => {
      const to = st.rng.pick(POS_MOVES[st.pos]);
      const toName = D.POS_BY_ID[to].name;
      const isPitch = (st.pos === 'SP' || st.pos === 'RP');
      return {
        id: 'position',
        kicker: 'Reunión con el cuerpo técnico',
        title: `Te proponen pasar a ${toName.toLowerCase()}`,
        text: isPitch
          ? (st.pos === 'SP'
            ? `El brazo ya no aguanta 200 entradas. El club cree que como relevista podrías tirar más fuerte y durar más años.`
            : `Ven en vos entradas de calidad. Te ofrecen un puesto en la rotación: menos adrenalina, más responsabilidad.`)
          : `Las piernas ya no responden como antes en tu posición. Pasar a ${toName.toLowerCase()} te quitaría desgaste y alargaría la carrera, aunque te exigiría bateo por encima de la media.`,
        options: [
          { label: `Aceptar el cambio a ${to}`, sub: 'Menos desgaste, nuevas exigencias', tag: 'Adaptarse',
            hint: 'Alarga la carrera',
            apply: () => {
              const oldPos = st.pos;
              st.pos = to; st.role = D.POS_BY_ID[to].role;
              /* Conversión de atributos entre bateo y pitcheo si hiciera falta */
              const keys = E.attrKeysFor(to);
              keys.forEach(k => { if (st.attrs[k] == null) st.attrs[k] = clamp(Math.round(st.ovr * 0.92 + st.rng.gauss(0, 4)), 25, 95); });
              if (to === 'RP') { st.attrs.vel = clamp(st.attrs.vel + 5, 20, 99); st.attrs.res = clamp(st.attrs.res - 8, 20, 99); st.isCloser = st.ovr > 72; }
              if (to === 'SP') { st.attrs.res = clamp(st.attrs.res + 8, 20, 99); st.isCloser = false; }
              if (!isPitch) { st.attrs.def = clamp(st.attrs.def + 4, 20, 99); }
              st.health = clamp(st.health + 8, 0, 100);
              st.ovr = E.computeOvr(st.attrs, st.pos);
              return { tone: 'good', text: `De ${D.POS_BY_ID[oldPos].name.toLowerCase()} a ${toName.toLowerCase()}. Cuerpo nuevo, oficio viejo.` };
            } },
          { label: 'Negarme y seguir en mi puesto', sub: 'Es tu posición y la vas a defender', tag: 'Carácter',
            hint: 'Más desgaste, más identidad',
            apply: () => { st.morale += 6; st.health -= 6;
              return { tone: 'neutral', text: `Te plantás: ahí naciste y ahí te vas a retirar.` }; } }
        ]
      };
    }
  });

  /* --- Cambio de mecánica ---------------------------------------------- */
  ev({
    id: 'mechanics', weight: 60,
    when: st => st.age >= 21 && st.age <= 32 && st.proSeasons >= 2,
    build: st => {
      const hitter = st.role === 'hit';
      return {
        id: 'mechanics',
        kicker: 'Pretemporada · laboratorio',
        title: hitter ? 'Rediseñar el swing' : 'Un lanzamiento nuevo',
        text: hitter
          ? `El departamento de bateo te propone subir el ángulo de salida: más jonrones, más ponches, menos promedio. Otra opción es afinar el contacto y jugar a no fallar.`
          : `Te ofrecen incorporar un lanzamiento rompiente nuevo. Puede convertirte en otro lanzador, o desordenarte todo lo que ya funcionaba.`,
        options: [
          { label: hitter ? 'Subir el ángulo: buscar la cerca' : 'Añadir el nuevo lanzamiento', sub: 'Riesgo alto, techo alto', tag: 'Apuesta',
            hint: '≈60% de que salga bien',
            apply: () => {
              if (st.rng.chance(0.6)) {
                if (hitter) bump(st, { pod: 7, con: -2 }); else bump(st, { mov: 7, ctl: -1 });
                st.potential = clamp(st.potential + 3, st.ovr, 99);
                return { tone: 'good', text: hitter ? `La pelota empieza a salir sola. El poder llegó para quedarse.` : `El nuevo envío es una sentencia. Los bateadores no lo ven venir.` };
              }
              if (hitter) bump(st, { con: -4, pod: 1 }); else bump(st, { ctl: -5 });
              st.morale -= 8;
              return { tone: 'bad', text: hitter ? `El swing se rompió. Meses buscando la sensación perdida.` : `Perdiste el control de la zona. El experimento salió caro.` };
            } },
          { label: hitter ? 'Afinar el contacto' : 'Pulir el control', sub: 'Mejora pequeña y segura', tag: 'Oficio',
            hint: 'Casi sin riesgo',
            apply: () => { if (hitter) bump(st, { con: 3, dis: 2 }); else bump(st, { ctl: 4, men: 1 });
              return { tone: 'good', text: `Trabajo fino en el gimnasio y en la jaula. Nada espectacular, todo sólido.` }; } },
          { label: 'No tocar nada', sub: 'Si funciona, no lo rompas', tag: 'Confianza',
            hint: 'Moral arriba',
            apply: () => { st.morale += 7;
              return { tone: 'neutral', text: `Seguís con lo tuyo. Confianza intacta.` }; } }
        ]
      };
    }
  });

  /* --- Petición de cambio ---------------------------------------------- */
  ev({
    id: 'traderequest', weight: 55,
    when: st => st.status === 'pro' && st.league === 'MLB' && st.stint >= 2 && (st.morale < 55 || (E.clubOf(st) && E.clubOf(st).str <= 5)),
    build: st => {
      const cur = E.clubOf(st);
      const dest = E.offerPool(st, 2, c => c.str >= 7);
      const d1 = dest[0] || E.offerPool(st, 1)[0];
      return {
        id: 'traderequest',
        kicker: 'Reunión con la directiva',
        title: `${cur.name} entra en reconstrucción`,
        text: `El club vende a sus veteranos y anuncia tres años de paciencia. Tu agente te dice que ${d1.name} preguntó por vos.`,
        options: [
          { label: `Pedir el cambio a ${d1.name}`, sub: 'Pelear por algo ahora', tag: 'Ambición',
            hint: 'Más presión, más opciones de anillo',
            apply: () => { sign(st, d1, Math.max(2, st.contractYears), { salary: st.salary }); st.morale += 10; st.fame += 4;
              return { tone: 'good', text: `Te cambian a ${d1.name}. Aterrizás en un vestuario que solo habla de octubre.` }; } },
          { label: 'Quedarme y liderar el proyecto', sub: 'Ser el veterano de los jóvenes', tag: 'Bandera',
            hint: 'La afición no lo olvida',
            apply: () => { st.morale += 4; st.fame += 3; bump(st, { men: 3, dis: 2 });
              return { tone: 'neutral', text: `Te quedás. Sos el primero en llegar al campo y el último en irse.` }; } }
        ]
      };
    }
  });

  /* --- Liga invernal ---------------------------------------------------- */
  ev({
    id: 'winter', weight: 50,
    when: st => ['DO', 'VE', 'MX', 'PR', 'CU', 'PA', 'CO', 'NI'].indexOf(st.country) >= 0 && st.age <= 32,
    build: st => {
      const c = D.COUNTRY_BY_CODE[st.country];
      const key = st.country === 'DO' ? 'LIDOM' : st.country === 'VE' ? 'LVBP' : st.country === 'MX' ? 'LMP' : st.country === 'PR' ? 'LBPRC' : 'LIDOM';
      const w = D.WINTER[key];
      const team = st.rng.pick(w.clubs);
      return {
        id: 'winter',
        kicker: 'Diciembre en ' + c.name,
        title: `¿Jugás la pelota invernal?`,
        text: `${team} te quiere para la final de la ${w.name}. Es tu gente, tu estadio y una fiesta cada noche. También son tres meses sin descansar el cuerpo.`,
        options: [
          { label: `Jugar con ${team}`, sub: 'La afición de tu tierra te espera', tag: 'Corazón',
            hint: 'Fama y moral arriba, cuerpo castigado',
            apply: () => { st.fame += 7; st.morale += 12; st.health -= 5; bumpAll(st, 0.8);
              if (st.rng.chance(0.35)) { st.milestones.push(`Campeón de la ${w.name} con ${team}`); return { tone: 'good', text: `Campeón de la ${w.name} con ${team}. La caravana llegó hasta tu barrio.` }; }
              return { tone: 'good', text: `Jugás el invierno con ${team}. Cada noche el estadio se llena por vos.` }; } },
          { label: 'Descansar y entrenar', sub: 'Preparar el cuerpo para la temporada', tag: 'Cabeza fría',
            hint: 'Salud y desarrollo arriba',
            apply: () => { st.health = clamp(st.health + 9, 0, 100); bumpAll(st, 1.4);
              return { tone: 'good', text: `Invierno de gimnasio y fisioterapia. Llegás a la pretemporada como nuevo.` }; } }
        ]
      };
    }
  });

  /* --- Rehabilitación tras lesión grave --------------------------------- */
  ev({
    id: 'rehab', weight: 200,
    when: st => {
      const last = st.seasons[st.seasons.length - 1];
      return last && last.injury && st.health < 80;
    },
    build: st => {
      const last = st.seasons[st.seasons.length - 1];
      return {
        id: 'rehab',
        kicker: 'Sala de fisioterapia',
        title: 'Volver de la ' + last.injury,
        text: `Los médicos te dan dos caminos. El club quiere verte pronto en el campo; tu cuerpo pide otra cosa.`,
        options: [
          { label: 'Rehabilitación completa', sub: 'Volver tarde, volver entero', tag: 'Prudencia',
            hint: 'Recupera salud, cuesta una temporada',
            apply: () => { st.health = clamp(st.health + 18, 0, 100); st.injuredNext = 0.25; st.morale -= 4;
              return { tone: 'neutral', text: `Seis meses de trabajo invisible. Nadie aplaude una rehabilitación bien hecha.` }; } },
          { label: 'Acelerar el regreso', sub: 'El equipo te necesita ya', tag: 'Riesgo',
            hint: '≈45% de recaída',
            apply: () => {
              st.fame += 4;
              if (st.rng.chance(0.45)) { st.health -= 12; st.injuredNext = 0.5; bumpAll(st, -2.5);
                return { tone: 'bad', text: `Recaída. Volviste antes de tiempo y lo pagaste con otro año perdido.` }; }
              st.morale += 10;
              return { tone: 'good', text: `Regreso relámpago. La grada se puso de pie cuando saliste del dugout.` };
            } }
        ]
      };
    }
  });

  /* --- Escándalo / antidopaje ------------------------------------------- */
  ev({
    id: 'peds', weight: 22,
    when: st => st.status === 'pro' && st.age >= 24 && st.age <= 34 && st.ovr > 68 && !st.flags.banned,
    build: st => ({
      id: 'peds',
      kicker: 'Oferta incómoda',
      title: 'El atajo',
      text: `Un preparador "amigo de un amigo" te ofrece un programa que, dice, no aparece en los controles. Media liga rumorea. Vos sabés lo que te estás jugando.`,
      options: [
        { label: 'Aceptar el programa', sub: 'Ganancia inmediata, riesgo permanente', tag: 'Peligro',
          hint: '≈30% de dar positivo',
          apply: () => {
            bumpAll(st, 4.5);
            if (st.rng.chance(0.30)) {
              st.flags.banned = true; st.fame -= 22; st.morale -= 25; st.injuredNext = 0.5;
              st.milestones.push('Sancionado por dopaje');
              return { tone: 'bad', text: `Positivo. Ochenta partidos de sanción y una mancha que no se borra del expediente.` };
            }
            return { tone: 'good', text: `Nadie preguntó nada. Los números suben y el vestuario mira para otro lado.` };
          } },
        { label: 'Decir que no', sub: 'Trabajo, comida y descanso', tag: 'Integridad',
          hint: 'Sin riesgo, sin atajo',
          apply: () => { st.morale += 6; bumpAll(st, 0.6);
            return { tone: 'good', text: `Lo mandás a paseo. Dormís tranquilo, que también entrena.` }; } }
      ]
    })
  });

  /* --- Extensión anticipada -------------------------------------------- */
  ev({
    id: 'extension', weight: 60,
    when: st => st.status === 'pro' && st.contractYears >= 1 && st.age <= 28 && st.ovr > E.leagueBar(st.league) + 2,
    build: st => {
      const cur = E.clubOf(st);
      const safe = Math.round(E.offeredSalary(st, cur, st.rng) * 0.72);
      return {
        id: 'extension',
        kicker: 'Despacho del gerente general',
        title: 'Extensión sobre la mesa',
        text: `${cur.name} te ofrece asegurar el futuro hoy: ocho años garantizados por debajo de tu valor. La alternativa es apostar por vos mismo y esperar a la agencia libre.`,
        options: [
          { label: `Firmar 8 años por ${money(safe)} anuales`, sub: 'Estabilidad y raíces', tag: 'Seguridad',
            hint: 'Nunca más te preocupás por el dinero',
            apply: () => { sign(st, cur, 8, { salary: safe }); st.morale += 12;
              return { tone: 'good', text: `Ocho años más en ${cur.name}. Tu apellido ya es parte del club.` }; } },
          { label: 'Apostar por mí mismo', sub: 'Ir año a año hasta la agencia libre', tag: 'Ambición',
            hint: 'Si rendís, cobrás el doble',
            apply: () => { st.contractYears = 1; st.morale -= 3; bump(st, { men: 2, dis: 1 });
              return { tone: 'neutral', text: `Rechazás la oferta. A partir de ahora cada turno vale dinero.` }; } }
        ]
      };
    }
  });

  /* --- Publicidad y fama ------------------------------------------------ */
  ev({
    id: 'brand', weight: 35,
    when: st => st.fame > 55 && st.age >= 22,
    build: st => ({
      id: 'brand',
      kicker: 'Fuera del campo',
      title: 'La marca quiere tu cara',
      text: `Una marca deportiva te ofrece una campaña global: rodajes, giras y una cifra con muchos ceros. El preparador físico te recuerda que la pretemporada empieza en tres semanas.`,
      options: [
        { label: 'Firmar la campaña', sub: 'Fama mundial y patrimonio', tag: 'Estrella',
          hint: 'Fama arriba, preparación afectada',
          apply: () => { st.fame = clamp(st.fame + 14, 0, 100); bumpAll(st, -0.8); st.morale += 5;
            return { tone: 'good', text: `Tu cara aparece en una valla de Times Square. El vestuario no te deja olvidarlo.` }; } },
        { label: 'Rechazarla y entrenar', sub: 'El foco, en el juego', tag: 'Profesión',
          hint: 'Mejora física',
          apply: () => { bumpAll(st, 2.2); st.fame -= 2;
            return { tone: 'good', text: `Cero cámaras, seis semanas de trabajo. Llegás fino a febrero.` }; } }
      ]
    })
  });

  /* --- Choque con el mánager -------------------------------------------- */
  ev({
    id: 'clash', weight: 30,
    when: st => st.status === 'pro' && st.morale < 60 && st.proSeasons > 3,
    build: st => {
      const cur = E.clubOf(st);
      return {
        id: 'clash',
        kicker: 'Vestuario',
        title: 'Choque con el mánager',
        text: `Te sacó en el séptimo delante de treinta mil personas. En la rueda de prensa dijo que "hay que ganarse el puesto". Los periodistas esperan tu respuesta.`,
        options: [
          { label: 'Responder en público', sub: 'Decir lo que pensás, con nombre y apellido', tag: 'Ruido',
            hint: 'Fama arriba, vestuario roto',
            apply: () => { st.fame += 8; st.morale -= 6;
              if (st.rng.chance(0.4)) { const d = E.offerPool(st, 1)[0]; sign(st, d, Math.max(2, st.contractYears), { salary: st.salary });
                return { tone: 'bad', text: `Tu declaración fue portada. Dos semanas después te cambiaron a ${d.name}.` }; }
              return { tone: 'neutral', text: `El titular dio la vuelta al país. El mánager no volvió a mirarte igual.` }; } },
          { label: 'Tragar y trabajar', sub: 'Primero en llegar al campo', tag: 'Silencio',
            hint: 'Moral y confianza del club',
            apply: () => { st.morale += 9; bump(st, { men: 2, dis: 2, def: 1 });
              return { tone: 'good', text: `Ni una palabra. A las seis semanas eras intocable en la alineación de ${cur.name}.` }; } }
        ]
      };
    }
  });

  /* --- Recorte de sueldo por el equipo ---------------------------------- */
  ev({
    id: 'paycut', weight: 26,
    when: st => st.status === 'pro' && st.salary > 12e6 && E.clubOf(st) && E.clubOf(st).str >= 7 && st.age >= 28,
    build: st => {
      const cur = E.clubOf(st);
      return {
        id: 'paycut',
        kicker: 'Llamada del propietario',
        title: 'Un anillo cuesta dinero',
        text: `${cur.name} tiene atado a un lanzador de élite, pero no entra en el presupuesto. Te piden diferir parte de tu salario para que la firma salga.`,
        options: [
          { label: 'Aceptar el diferido', sub: 'Menos dinero, mejor equipo', tag: 'Equipo',
            hint: 'Sube la fuerza del club y tu prestigio',
            apply: () => { st.salary = Math.round(st.salary * 0.78); cur.str = clamp(cur.str + 1, 1, 10); st.fame += 6; st.morale += 8;
              return { tone: 'good', text: `Firmás el diferido. El vestuario entero se entera y lo entiende todo.` }; } },
          { label: 'Cobrar lo pactado', sub: 'Un contrato es un contrato', tag: 'Negocio',
            hint: 'Tu dinero intacto',
            apply: () => { st.morale += 2;
              return { tone: 'neutral', text: `Cobrás hasta el último euro. El fichaje no se hizo y alguien filtró por qué.` }; } }
        ]
      };
    }
  });

  /* --- Capitanía --------------------------------------------------------- */
  ev({
    id: 'captain', weight: 28,
    when: st => st.status === 'pro' && st.stint >= 4 && st.age >= 29 && st.fame > 45,
    build: st => {
      const cur = E.clubOf(st);
      return {
        id: 'captain',
        kicker: 'Pretemporada',
        title: 'Te ofrecen la capitanía',
        text: `${cur.name} no nombra un capitán desde hace veinte años. El club quiere que seas vos: la cara, la voz y el que da explicaciones cuando se pierde.`,
        options: [
          { label: 'Aceptar el brazalete', sub: 'La casa sobre tus hombros', tag: 'Liderazgo',
            hint: 'Frialdad y prestigio arriba',
            apply: () => { bump(st, { men: 5, dis: 3, ctl: 2 }); st.fame += 8; st.morale += 6; st.milestones.push(`Capitán de ${cur.name}`);
              return { tone: 'good', text: `Capitán de ${cur.name}. A partir de hoy hablás vos cuando se pierde.` }; } },
          { label: 'Declinar', sub: 'Liderar jugando, sin discursos', tag: 'Perfil bajo',
            hint: 'Concentración plena en el juego',
            apply: () => { bumpAll(st, 1.5);
              return { tone: 'neutral', text: `Preferís el ejemplo al micrófono. Nadie te lo reprocha.` }; } }
        ]
      };
    }
  });

  /* --- Final de carrera: rol reducido ------------------------------------ */
  ev({
    id: 'twilight', weight: 90,
    when: st => st.age >= 34 && st.ovr < E.leagueBar('MLB') + 2,
    build: st => {
      const contender = E.offerPool(st, 1, c => c.str >= 8)[0] || E.offerPool(st, 1)[0];
      const weak = E.offerPool(st, 1, c => c.str <= 5)[0] || E.offerPool(st, 1)[0];
      const home = D.CLUBS.filter(c => c.lg === (D.COUNTRY_BY_CODE[st.country].path === 'mexico' ? 'LMB' : D.COUNTRY_BY_CODE[st.country].path === 'cuba' ? 'CUB' : 'MLB'));
      const casa = st.rng.pick(home);
      return {
        id: 'twilight',
        kicker: 'Últimos capítulos',
        title: 'Cómo querés terminar',
        text: `Ya no sos el que eras y el mercado lo sabe. Hay tres finales posibles y cada uno cuenta una historia distinta.`,
        options: [
          { label: `Suplente de lujo en ${contender.name}`, sub: 'Ir a buscar el anillo que falta', tag: 'Anillo',
            hint: 'Pocos turnos, muchas opciones de título',
            apply: () => { sign(st, contender, 2, { depth: 'banca', salary: Math.round(E.offeredSalary(st, contender, st.rng) * 0.6) }); st.morale += 6;
              return { tone: 'good', text: `Aceptás un rol secundario en ${contender.name}. El objetivo es uno solo.` }; } },
          { label: `Titular en ${weak.name}`, sub: 'Jugar todos los días hasta el final', tag: 'Números',
            hint: 'Turnos garantizados, equipo flojo',
            apply: () => { sign(st, weak, 2, { depth: 'titular' }); st.morale += 3;
              return { tone: 'neutral', text: `Firmás con ${weak.name} para jugar todos los días. Los números todavía suman.` }; } },
          { label: `Volver a ${casa.name}`, sub: 'Cerrar el círculo en casa', tag: 'Casa',
            hint: 'Menos nivel, despedida emocionante',
            apply: () => { sign(st, casa, 2, { depth: 'titular' }); st.morale += 16; st.fame += 5; st.milestones.push(`Regreso a ${casa.name}`);
              return { tone: 'good', text: `Volvés a ${casa.name}. El estadio se llena solo para verte otra vez.` }; } }
        ]
      };
    }
  });

  /* --- Retiro voluntario --------------------------------------------------*/
  ev({
    id: 'retirenow', weight: 45,
    when: st => st.age >= 35 || (st.ovr < 52 && st.age >= 31),
    build: st => ({
      id: 'retirenow',
      kicker: 'Conversación en casa',
      title: '¿Una temporada más?',
      text: `La rodilla te avisa cada mañana. Tu familia lleva quince años detrás de una maleta. Y todavía te queda algo en el bate.`,
      options: [
        { label: 'Seguir un año más', sub: 'Mientras el cuerpo aguante', tag: 'Insistir',
          hint: 'Sumás números, arriesgás el recuerdo',
          apply: () => { st.morale += 5;
            return { tone: 'neutral', text: `Un año más. Los que te quieren ver, que vayan ahora.` }; } },
        { label: 'Anunciar el retiro', sub: 'Salir por la puerta grande', tag: 'Final',
          hint: 'Termina la carrera aquí',
          apply: () => { st.wantsRetire = true;
            return { tone: 'good', text: `Anunciás que esta es la última. Cada estadio te prepara una despedida.` }; } }
      ]
    })
  });

  /* --- Relleno: temporada tranquila --------------------------------------- */
  ev({
    id: 'focus', weight: 20,
    when: st => true,
    build: st => ({
      id: 'focus',
      kicker: 'Pretemporada',
      title: '¿En qué ponés el invierno?',
      text: `Cuatro meses sin juego oficial. El plan de trabajo lo elegís vos.`,
      options: st.role === 'hit' ? [
        { label: 'Gimnasio y fuerza', sub: 'Buscar la cerca', tag: 'Poder', hint: '+ Poder',
          apply: () => { bump(st, { pod: 4, spd: -1 }); return { tone: 'good', text: 'Volvés cinco kilos más fuerte. La pelota lo nota.' }; } },
        { label: 'Jaula y vídeo', sub: 'No fallar una', tag: 'Contacto', hint: '+ Contacto y disciplina',
          apply: () => { bump(st, { con: 3, dis: 3 }); return { tone: 'good', text: 'Mil turnos de jaula. Empezás a ver la costura de la pelota.' }; } },
        { label: 'Guante y piernas', sub: 'Defensa y velocidad', tag: 'Atleta', hint: '+ Defensa y velocidad',
          apply: () => { bump(st, { def: 4, spd: 3 }); return { tone: 'good', text: 'Trabajo de pies hasta el aburrimiento. Ahora llegás a todo.' }; } }
      ] : [
        { label: 'Ganar velocidad', sub: 'Más millas en la recta', tag: 'Recta', hint: '+ Velocidad, - control',
          apply: () => { bump(st, { vel: 5, ctl: -1 }); return { tone: 'good', text: 'El radar marca dos millas más. La liga se entera rápido.' }; } },
        { label: 'Afinar el control', sub: 'Vivir en la esquina', tag: 'Control', hint: '+ Control',
          apply: () => { bump(st, { ctl: 5 }); return { tone: 'good', text: 'Ponés la pelota donde querés. Las bases por bolas desaparecen.' }; } },
        { label: 'Fondo y resistencia', sub: 'Llegar al noveno', tag: 'Aguante', hint: '+ Resistencia y salud',
          apply: () => { bump(st, { res: 5, men: 2 }); st.health = clamp(st.health + 5, 0, 100); return { tone: 'good', text: 'Kilómetros de fondo. En agosto seguís tirando igual que en abril.' }; } }
      ]
    })
  });

  /* ======================================================================
     SELECTOR
     ====================================================================== */
  function next(st) {
    const rng = st.rng;
    const usable = REG.filter(e => {
      try { return e.when(st); } catch (err) { return false; }
    });
    if (!usable.length) return null;
    /* Evita repetir el mismo evento dos veces seguidas */
    const filtered = usable.filter(e => e.id !== st.lastEventId) ;
    const pool = filtered.length ? filtered : usable;
    const chosen = rng.weighted(pool, e => e.weight);
    st.lastEventId = chosen.id;
    return chosen.build(st);
  }

  global.EVENTS = { opening, next, autoProgress, MINOR_LADDER };
})(window);
