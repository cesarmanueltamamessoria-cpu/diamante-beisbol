/* =========================================================================
   DIAMANTE · engine.js
   Motor de simulación: creación, temporadas, estadísticas, premios,
   desarrollo, lesiones, valor de mercado, retiro y valoración final.
   ========================================================================= */
(function (global) {
  'use strict';

  const D = global.DATA;
  const LG = D.LEAGUES;

  /* ------------------------------------------------------------------ RNG */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const round = Math.round;

  function makeRandom(seed) {
    const r = mulberry32(seed);
    const api = {
      raw: r,
      next: () => r(),
      range: (a, b) => a + r() * (b - a),
      int: (a, b) => Math.floor(a + r() * (b - a + 1)),
      chance: p => r() < p,
      gauss: (mean, sd) => {
        let u = 0, v = 0;
        while (u === 0) u = r();
        while (v === 0) v = r();
        return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      },
      pick: arr => arr[Math.floor(r() * arr.length)],
      shuffle: arr => {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(r() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      },
      weighted: (arr, wf) => {
        let total = 0;
        const ws = arr.map(x => { const w = Math.max(0.0001, wf(x)); total += w; return w; });
        let t = r() * total;
        for (let i = 0; i < arr.length; i++) { t -= ws[i]; if (t <= 0) return arr[i]; }
        return arr[arr.length - 1];
      }
    };
    return api;
  }

  /* --------------------------------------------------------------- FORMATO */
  const fmt = {
    avg: v => v.toFixed(3).replace(/^0/, ''),
    era: v => v.toFixed(2),
    money: v => {
      if (!v || v < 1000) return '—';
      if (v >= 1e9) return (v / 1e9).toFixed(2).replace('.', ',') + ' MM€';
      if (v >= 1e6) return (v / 1e6).toFixed(v >= 1e8 ? 0 : 1).replace('.', ',') + ' M€';
      return round(v / 1000) + ' k€';
    },
    int: v => round(v).toLocaleString('es-ES')
  };

  /* ------------------------------------------------------- CREACIÓN JUGADOR */
  const HIT_ATTRS = ['con', 'pod', 'dis', 'spd', 'def', 'arm'];
  const PIT_ATTRS = ['vel', 'ctl', 'mov', 'res', 'men'];

  function attrKeysFor(pos) {
    return (pos === 'SP' || pos === 'RP') ? PIT_ATTRS : HIT_ATTRS;
  }

  function computeOvr(attrs, pos) {
    const w = D.POS_WEIGHTS[pos];
    let sum = 0, tot = 0;
    for (const k in w) { sum += (attrs[k] || 40) * w[k]; tot += w[k]; }
    return clamp(round(sum / tot), 30, 99);
  }

  /* Perfil inicial de atributos según posición: cada puesto arranca sesgado */
  const START_BIAS = {
    SP:  { vel: 6, ctl: 4, mov: 5, res: 6, men: 2 },
    RP:  { vel: 9, ctl: 1, mov: 6, res: -6, men: 4 },
    C:   { con: -2, pod: -1, dis: 1, spd: -8, def: 9, arm: 7 },
    '1B':{ con: 2, pod: 8, dis: 3, spd: -7, def: -1, arm: -2 },
    '2B':{ con: 4, pod: -3, dis: 2, spd: 4, def: 5, arm: 0 },
    '3B':{ con: 0, pod: 5, dis: 1, spd: -2, def: 4, arm: 6 },
    SS:  { con: 2, pod: -4, dis: 0, spd: 5, def: 8, arm: 6 },
    LF:  { con: 3, pod: 5, dis: 3, spd: 1, def: -2, arm: -2 },
    CF:  { con: 3, pod: 0, dis: 2, spd: 9, def: 4, arm: 0 },
    RF:  { con: 2, pod: 6, dis: 2, spd: 0, def: 0, arm: 6 },
    DH:  { con: 4, pod: 9, dis: 5, spd: -9, def: -12, arm: -4 }
  };

  function createPlayer(cfg) {
    const seed = cfg.seed || (Date.now() ^ (Math.random() * 1e9)) >>> 0;
    const rng = makeRandom(seed);
    const country = D.COUNTRY_BY_CODE[cfg.country];
    const posDef = D.POS_BY_ID[cfg.pos];
    const keys = attrKeysFor(cfg.pos);
    const bias = START_BIAS[cfg.pos] || {};

    const poolBonus = (country.pool - 5) * 1.1;
    const attrs = {};
    keys.forEach(k => {
      attrs[k] = clamp(round(rng.gauss(46 + poolBonus, 7) + (bias[k] || 0)), 25, 72);
    });

    const ovr = computeOvr(attrs, cfg.pos);
    /* El techo es oculto: define hasta dónde puede crecer */
    let potential = clamp(round(ovr + rng.gauss(11 + country.pool * 1.15, 9)), ovr + 2, 99);
    /* Talento generacional: uno de cada quince trae un techo fuera de escala */
    if (rng.chance(0.07)) potential = clamp(potential + rng.int(8, 18), 0, 99);

    const region = D.NAME_REGION[cfg.country] || 'euro';
    const firstName = cfg.firstName || rng.pick(D.FIRST_NAMES[region] || D.FIRST_NAMES.euro);

    const st = {
      seed,
      rng,
      firstName,
      lastName: cfg.lastName,
      number: cfg.number,
      bats: cfg.bats,
      throws: cfg.throws,
      country: cfg.country,
      pos: cfg.pos,
      role: posDef.role,
      pace: cfg.pace || 'normal',
      nickname: null,

      age: 16,
      year: new Date().getFullYear(),
      ovr,
      peak: ovr,
      potential,
      attrs,

      clubId: null,
      clubName: 'Sin equipo',
      league: null,
      status: 'libre',      // libre | academia | minors | pro
      depth: 'reserva',     // titular | rotacion | reserva | banca | cerrador
      isCloser: false,

      contractYears: 0,
      salary: 0,
      value: 0,
      fame: 5,              // 0-100
      morale: 62,           // 0-100
      health: 100,          // 0-100 (durabilidad acumulada)
      stint: 0,             // temporadas seguidas en el club actual
      clubsPlayed: [],
      mlbSeasons: 0,
      proSeasons: 0,

      totals: emptyTotals(),
      seasons: [],
      awardCount: {},
      milestones: [],
      pendingEvent: null,
      seasonsSinceDecision: 0,
      injuredNext: 0,
      form: 0,              // -1 .. +1, racha
      retired: false,
      retireReason: '',
      hof: null,
      finished: false,
      flags: { tommyJohn: 0, comebackReady: false, debut: null, wbcTitles: 0, banned: false }
    };
    return st;
  }

  function emptyTotals() {
    return {
      g: 0, pa: 0, ab: 0, h: 0, hr: 0, rbi: 0, r: 0, sb: 0, bb: 0, so: 0, doubles: 0, triples: 0,
      gs: 0, ip: 0, w: 0, l: 0, sv: 0, k: 0, er: 0, bbAllowed: 0, hitsAllowed: 0,
      war: 0, seasons: 0
    };
  }

  /* --------------------------------------------------------- VALOR / SUELDO */
  function ageValueMult(age) {
    if (age <= 20) return 1.05;
    if (age <= 25) return 1.18;
    if (age <= 28) return 1.05;
    if (age <= 30) return 0.88;
    if (age <= 32) return 0.66;
    if (age <= 34) return 0.44;
    if (age <= 36) return 0.26;
    if (age <= 38) return 0.13;
    return 0.05;
  }

  function marketValue(st) {
    const lg = LG[st.league] || LG.ROK;
    const base = Math.pow(Math.max(0, st.ovr - 47) / 50, 3.0) * 215e6;
    const lgMult = lg.id === 'MLB' ? 1 : (lg.tier === 1 ? 0.55 : lg.q * 0.35);
    const fameMult = 0.86 + st.fame / 320;
    return round(base * ageValueMult(st.age) * lgMult * fameMult / 1e5) * 1e5;
  }

  function offeredSalary(st, club, rng) {
    const lg = LG[club.lg];
    if (lg.tier > 1 && lg.id !== 'LMB' && lg.id !== 'CUB') return round(20000 + st.ovr * 900 * lg.pay * 20);
    const v = marketValue(st);
    const raw = Math.min(v * 0.19, 62e6) * lg.pay * (0.85 + club.mkt / 22) * rng.range(0.9, 1.14);
    return round(Math.max(700000 * lg.pay, raw) / 1e4) * 1e4;
  }

  /* ------------------------------------------------------------ CLUB HELPER */
  function clubOf(st) { return st.clubId ? D.CLUB_BY_ID[st.clubId] : null; }

  function assignClub(st, club, opts) {
    opts = opts || {};
    st.clubId = club.id;
    st.clubName = club.name;
    st.league = opts.league || club.lg;
    st.status = opts.status || 'pro';
    st.depth = opts.depth || st.depth;
    st.stint = 0;
    if (st.clubsPlayed.indexOf(club.id) === -1) st.clubsPlayed.push(club.id);
    if (opts.years != null) st.contractYears = opts.years;
    if (opts.salary != null) st.salary = opts.salary;
  }

  function assignMinors(st, club, level) {
    st.clubId = club.id;
    st.clubName = (level === 'DSL' || level === 'ROK' ? 'Academia de ' : 'Filial de ') + club.abbr;
    st.league = level === 'AAA' ? 'AAA' : level === 'AA' ? 'AA' : level === 'A' ? 'A'
      : level === 'DSL' ? 'DSL' : 'ROK';
    st.status = 'minors';
    st.depth = 'titular';
  }

  /* Devuelve el club "padre" cuando el jugador está en ligas menores */
  function parentClub(st) {
    const c = D.CLUB_BY_ID[st.clubId];
    return c || null;
  }

  /* ----------------------------------------------------- OFERTAS DE EQUIPOS */
  function offerPool(st, n, filter) {
    const rng = st.rng;
    let pool = D.CLUBS.filter(c => c.lg === 'MLB');
    if (filter) pool = pool.filter(filter);
    pool = pool.filter(c => c.id !== st.clubId);
    /* Los mejores clubes solo pujan por los mejores jugadores */
    const interest = c => {
      const gap = st.ovr - (58 + c.str * 2.4);
      let w = Math.exp(gap / 7);
      w *= 0.6 + c.mkt / 12;
      if (st.fame > 70) w *= 0.7 + c.str / 12;
      return w;
    };
    const out = [];
    const copy = pool.slice();
    for (let i = 0; i < n && copy.length; i++) {
      const c = rng.weighted(copy, interest);
      out.push(c);
      copy.splice(copy.indexOf(c), 1);
    }
    return out;
  }

  function clubsIn(lg, exclude) {
    return D.CLUBS.filter(c => c.lg === lg && c.id !== exclude);
  }

  /* ============================================================ TEMPORADA == */

  /* Barra de calidad: OVR "promedio" de la liga */
  const leagueBar = lg => LG[lg].q * 72;

  function playingTimeFactor(st, rng) {
    const bar = leagueBar(st.league);
    const rel = st.ovr - bar;
    let pt;
    if (st.status === 'minors' || LG[st.league].tier >= 2) {
      pt = clamp(0.80 + rel * 0.010, 0.5, 1);
    } else if (rel >= 6) pt = clamp(0.94 + rel * 0.003, 0.9, 1);
    else if (rel >= -2) pt = clamp(0.80 + rel * 0.022, 0.62, 0.98);
    else if (rel >= -8) pt = clamp(0.55 + rel * 0.030, 0.30, 0.78);
    else pt = clamp(0.22 + rel * 0.014, 0.05, 0.36);
    if (st.depth === 'banca') pt *= 0.62;
    if (st.age <= 19) pt *= 0.88;
    if (st.age >= 37) pt *= 0.90;
    return clamp(pt * rng.range(0.90, 1.08), 0.04, 1);
  }

  function simHitting(st, rng, pt, healthMult) {
    const lg = LG[st.league];
    const a = st.attrs;
    const bar = leagueBar(st.league);
    const rel = st.ovr - bar;
    const form = st.form;

    const g = clamp(round(lg.games * pt * healthMult), 0, lg.games);
    const paPerG = st.depth === 'banca' ? 2.9 : 4.16;
    const pa = round(g * paPerG);
    const bbRate = clamp(0.055 + (a.dis - 50) * 0.0018 + rng.gauss(0, 0.008), 0.02, 0.20);
    const bb = round(pa * bbRate);
    const hbp = round(pa * 0.008);
    const ab = Math.max(0, pa - bb - hbp - round(pa * 0.012));

    let avg = 0.249 + (a.con - 55) * 0.00175 + rel * 0.00085 + form * 0.012 + rng.gauss(0, 0.021);
    avg = clamp(avg, 0.155, 0.382);
    const h = round(ab * avg);

    let hrRate = Math.max(0, (a.pod - 30) * 0.001) * (1 + rel * 0.004) * (1 + form * 0.10);
    hrRate *= rng.range(0.80, 1.22);
    const hr = clamp(round(ab * hrRate), 0, Math.max(0, h));

    const soRate = clamp(0.20 + (a.pod - 55) * 0.0016 - (a.con - 55) * 0.0022 + rng.gauss(0, 0.02), 0.06, 0.38);
    const so = round(pa * soRate);
    const doubles = round(Math.min(h - hr, ab * (0.042 + a.pod * 0.00022) * rng.range(0.85, 1.2)));
    const triples = round(Math.max(0, (a.spd - 55) * 0.05) * rng.range(0.4, 1.6));
    const sb = round(Math.max(0, (a.spd - 46) * 0.55) * (g / Math.max(1, lg.games)) * rng.range(0.55, 1.45));

    const club = clubOf(st);
    const lineup = club ? 0.85 + club.str * 0.035 : 1;
    const rbi = round((hr * 1.55 + (h - hr) * 0.30 + doubles * 0.15) * lineup);
    const r = round((h * 0.40 + hr * 0.62 + bb * 0.16) * lineup);

    const obp = ab + bb + hbp > 0 ? (h + bb + hbp) / (ab + bb + hbp) : 0;
    const iso = ab > 0 ? (hr * 3 + doubles + triples * 2) / ab : 0;
    const slg = avg + iso;
    const ops = obp + slg;

    const defMult = { C: 1.55, SS: 1.40, CF: 1.20, '2B': 1.15, '3B': 1.00, RF: 0.60, LF: 0.55, '1B': 0.25, DH: 0 }[st.pos] || 0.6;
    const defWar = ((a.def - 52) / 100) * 2.2 * defMult * (g / Math.max(1, lg.games));
    const offWar = (ops - 0.700 * (0.7 + lg.q * 0.3)) * 11.5 * (pa / 600);
    const war = clamp(offWar + defWar + (a.spd - 50) * 0.006, -2.5, 13.5);

    return { g, pa, ab, h, hr, rbi, r, sb, bb, so, doubles, triples, avg, obp, slg, ops, war: +war.toFixed(1) };
  }

  function simPitching(st, rng, pt, healthMult) {
    const lg = LG[st.league];
    const a = st.attrs;
    const bar = leagueBar(st.league);
    const rel = st.ovr - bar;
    const form = st.form;
    const club = clubOf(st);
    const teamStr = club ? club.str : 5;
    const isSP = st.pos === 'SP';

    let g, gs, ip;
    if (isSP) {
      gs = clamp(round(32 * pt * healthMult), 0, 34);
      g = gs;
      ip = +(gs * (4.30 + a.res / 38) * rng.range(0.93, 1.07)).toFixed(1);
    } else {
      g = clamp(round(64 * pt * healthMult), 0, 78);
      gs = 0;
      ip = +(g * rng.range(0.92, 1.18)).toFixed(1);
    }

    let era = 4.35 - rel * 0.085 - (a.ctl - 55) * 0.006 - form * 0.30 + rng.gauss(0, 0.42);
    if (!isSP) era -= 0.38;
    era = clamp(era, 0.95, 8.20);

    const k9 = clamp(5.4 + (a.vel - 50) * 0.088 + (a.mov - 50) * 0.048 + rng.gauss(0, 0.5), 3.0, 15.5);
    const k = round(ip * k9 / 9);
    const bb9 = clamp(4.9 - (a.ctl - 45) * 0.045 + rng.gauss(0, 0.35), 0.7, 7.5);
    const bbAllowed = round(ip * bb9 / 9);
    const whip = +clamp(0.80 + era * 0.105 + (55 - a.ctl) * 0.0035, 0.62, 2.10).toFixed(2);
    const hitsAllowed = Math.max(0, round(whip * ip - bbAllowed));
    const er = round(era * ip / 9);

    let w = 0, l = 0, sv = 0;
    if (isSP) {
      const dec = round(gs * 0.74);
      const pct = clamp(0.50 + (4.35 - era) * 0.085 + (teamStr - 6) * 0.030, 0.15, 0.88);
      w = round(dec * pct);
      l = Math.max(0, dec - w);
    } else {
      const dec = round(g * 0.16);
      const pct = clamp(0.50 + (4.0 - era) * 0.07, 0.2, 0.85);
      w = round(dec * pct);
      l = Math.max(0, dec - w);
      if (st.isCloser) sv = clamp(round(g * 0.58 * clamp(0.6 + (4.0 - era) * 0.14, 0.35, 1.05) * (0.7 + teamStr / 20)), 0, 58);
    }

    const war = clamp(((4.35 * (0.75 + lg.q * 0.25)) - era) * ip / (isSP ? 58 : 42), -2.0, 12.0);
    return { g, gs, ip, era: +era.toFixed(2), k, bbAllowed, hitsAllowed, er, whip, w, l, sv, war: +war.toFixed(1) };
  }

  /* --------------------------------------------------------- POSTEMPORADA */
  function simPostseason(st, rng, line) {
    const club = clubOf(st);
    if (!club || LG[st.league].tier > 1 || st.status === 'minors') return { round: 'none', label: '' };
    const boost = clamp((line.war || 0) * 0.02, 0, 0.14);
    const p = clamp((club.str - 3.6) / 7.2 + boost, 0.05, 0.93);
    if (!rng.chance(p)) return { round: 'none', label: '' };
    /* Entró a postemporada */
    let res = { round: 'playoffs', label: 'Clasificó a postemporada' };
    if (LG[st.league].id === 'MLB') {
      res = { round: 'div', label: 'Campeón de división' };
      if (!rng.chance(clamp(0.42 + (club.str - 6) * 0.05 + boost, 0.15, 0.8))) return res;
      res = { round: 'pennant', label: 'Campeón de Liga' };
      if (!rng.chance(clamp(0.48 + boost * 2, 0.2, 0.75))) return res;
      return { round: 'title', label: 'Campeón de la Serie Mundial' };
    }
    if (!rng.chance(clamp(0.40 + (club.str - 6) * 0.05 + boost, 0.15, 0.8))) return res;
    const name = st.league === 'NPB' ? 'Serie de Japón' : st.league === 'KBO' ? 'Serie Coreana' : 'la final';
    return { round: 'title', label: 'Campeón de ' + name };
  }

  /* -------------------------------------------------------------- PREMIOS */
  function seasonAwards(st, rng, line, post) {
    const out = [];
    const lg = LG[st.league];
    const isMLB = lg.id === 'MLB';
    const majorLeague = lg.tier === 1;
    const scale = isMLB ? 1 : lg.q;
    if (st.status === 'minors' || !majorLeague) {
      if (st.status === 'minors' && line.war > 4.2 && rng.chance(0.28)) out.push('MINORMVP');
      return out;
    }

    const war = line.war;
    const hitter = st.role === 'hit';

    /* Juego de Estrellas */
    if (war > 2.6 * scale && rng.chance(clamp((war - 2.2) / 4.2, 0.05, 0.92))) out.push('AS');

    if (hitter) {
      if (line.hr >= round(40 * scale) && rng.chance(clamp((line.hr - 36 * scale) / 16, 0.05, 0.85))) out.push('HRK');
      if (line.avg >= 0.330 * (0.9 + scale * 0.1) && rng.chance(clamp((line.avg - 0.320) * 14, 0.05, 0.8))) out.push('AVGK');
      if (line.rbi >= round(110 * scale) && rng.chance(clamp((line.rbi - 100 * scale) / 45, 0.05, 0.8))) out.push('RBIK');
      if (line.ops > 0.900 && war > 4 && rng.chance(clamp((war - 3.5) / 6, 0.05, 0.7))) out.push('SS');
      if (st.attrs.def > 74 && st.pos !== 'DH' && rng.chance(clamp((st.attrs.def - 72) / 40, 0.03, 0.5))) out.push('GG');
      if (out.indexOf('HRK') >= 0 && out.indexOf('AVGK') >= 0 && out.indexOf('RBIK') >= 0) out.push('TC');
      if (war > 6.4 && rng.chance(clamp((war - 6.0) / 4.5, 0.05, 0.85))) out.push('MVP');
    } else {
      if (line.era <= 2.95 && line.ip > 150 && rng.chance(clamp((3.10 - line.era) * 1.5, 0.05, 0.75))) out.push('ERAK');
      if (line.k >= 215 && rng.chance(clamp((line.k - 200) / 90, 0.05, 0.8))) out.push('SOK');
      if (line.sv >= 38 && rng.chance(clamp((line.sv - 34) / 18, 0.05, 0.8))) out.push('SVK');
      if (war > 5.6 && st.pos === 'SP' && rng.chance(clamp((war - 5.2) / 4.0, 0.05, 0.85))) out.push('CY');
      if (war > 3.2 && st.pos === 'RP' && line.sv > 40 && rng.chance(0.14)) out.push('CY');
      if (war > 8.2 && rng.chance(clamp((war - 8.0) / 5, 0.03, 0.45))) out.push('MVP');
    }

    /* Novato del año */
    if (!st.flags.rookieUsed && st.mlbSeasons === 1 && war > 2.2 && rng.chance(clamp((war - 1.8) / 4, 0.08, 0.9))) {
      out.push('ROY');
    }
    if (st.mlbSeasons >= 1) st.flags.rookieUsed = true;

    /* Gestas */
    if (!hitter && line.ip > 90) {
      if (rng.chance(clamp((line.k / Math.max(1, line.ip)) * 0.020 + (3.6 - line.era) * 0.006, 0.001, 0.05))) out.push('NOHIT');
      if (rng.chance(0.0035 * clamp((4.0 - line.era), 0.2, 2.4))) out.push('PERFECT');
      if (line.k > 240 && rng.chance(0.05)) out.push('K20');
    }
    if (hitter && line.g > 100) {
      if (rng.chance(clamp(line.avg * 0.035 + st.attrs.spd * 0.00012, 0.002, 0.045))) out.push('CYCLE');
      if (line.hr > 34 && rng.chance(0.018)) out.push('HR4');
    }

    /* Postemporada */
    if (post.round === 'div' || post.round === 'pennant' || post.round === 'title') out.push('DIV');
    if (post.round === 'pennant' || post.round === 'title') out.push('PENNANT');
    if (post.round === 'title') {
      out.push(isMLB ? 'WS' : st.league === 'NPB' ? 'NPBWS' : st.league === 'KBO' ? 'KBOWS' : 'OTHERWS');
      if (rng.chance(clamp(0.10 + war * 0.022, 0.05, 0.4))) out.push('WSMVP');
    }
    return out;
  }

  /* ------------------------------------------------------------- LESIONES */
  const INJURIES = [
    { name: 'esguince de tobillo', miss: 0.15, sev: 1 },
    { name: 'distensión del oblicuo', miss: 0.22, sev: 1 },
    { name: 'inflamación del hombro', miss: 0.30, sev: 2 },
    { name: 'fractura de la mano', miss: 0.35, sev: 2 },
    { name: 'rotura del tendón de la corva', miss: 0.40, sev: 2 },
    { name: 'operación de rodilla', miss: 0.55, sev: 3 },
    { name: 'hernia discal', miss: 0.50, sev: 3 },
    { name: 'rotura del labrum', miss: 0.70, sev: 4 }
  ];

  function rollInjury(st, rng) {
    let risk = 0.085 + Math.max(0, st.age - 29) * 0.014 + (100 - st.health) * 0.0022;
    if (st.role !== 'hit') risk += 0.045;
    if (st.pos === 'C') risk += 0.035;
    if (!rng.chance(clamp(risk, 0.02, 0.45))) return null;

    /* Cirugía Tommy John: exclusiva de lanzadores */
    if (st.role !== 'hit' && rng.chance(0.16) && !st.flags.tommyJohn) {
      st.flags.tommyJohn++;
      st.health -= 14;
      return { name: 'operación Tommy John', miss: 0.95, sev: 5 };
    }
    const inj = rng.pick(INJURIES);
    st.health -= inj.sev * 2.2;
    return inj;
  }

  /* --------------------------------------------------------- DESARROLLO */
  function develop(st, rng, line, injured) {
    const keys = attrKeysFor(st.pos);
    const gap = st.potential - st.ovr;
    const playedALot = (line.g || 0) > (LG[st.league].games * 0.45);
    const lvl = LG[st.league].q;
    let delta;

    if (st.age <= 21) delta = gap * rng.range(0.16, 0.34) * (playedALot ? 1.15 : 0.75) * (0.75 + lvl * 0.4);
    else if (st.age <= 24) delta = gap * rng.range(0.12, 0.26) * (playedALot ? 1.1 : 0.7) * (0.8 + lvl * 0.35);
    else if (st.age <= 27) delta = gap * rng.range(0.05, 0.16) + rng.gauss(0.4, 1.1);
    else if (st.age <= 30) delta = rng.gauss(0.1, 1.3) + gap * 0.03;
    else if (st.age <= 32) delta = rng.gauss(-1.4, 1.3);
    else if (st.age <= 35) delta = rng.gauss(-3.0, 1.6);
    else delta = rng.gauss(-4.6, 1.8);

    /* Rendimiento y moral matizan la curva */
    delta += clamp((line.war - 2.2) * 0.28, -1.4, 1.8);
    delta += (st.morale - 60) * 0.012;
    if (injured) delta -= injured.sev * (st.age > 30 ? 1.5 : 0.9);
    if (st.flags.tommyJohn && st.age < 30) delta -= 0.6;

    const before = st.ovr;
    /* Repartimos el cambio entre los atributos, con ruido */
    const perAttr = delta / keys.length * 1.6;
    keys.forEach(k => {
      let d = perAttr + rng.gauss(0, 1.0);
      /* La velocidad se va primero */
      if ((k === 'spd' || k === 'vel') && st.age > 30) d -= 1.0;
      if ((k === 'dis' || k === 'ctl' || k === 'men') && st.age > 27) d += 0.6;
      st.attrs[k] = clamp(round(st.attrs[k] + d), 20, 99);
    });
    st.ovr = computeOvr(st.attrs, st.pos);
    if (st.ovr > st.peak) st.peak = st.ovr;
    return st.ovr - before;
  }

  /* ------------------------------------------------------------- APODOS */
  function maybeNickname(st, rng, line) {
    if (st.nickname || st.mlbSeasons < 3) return;
    if (st.fame < 55) return;
    const a = st.attrs;
    let bucket = null;
    if (st.pos === 'RP' && line.sv > 30) bucket = 'closer';
    else if (st.role !== 'hit' && a.vel > 82) bucket = 'ace';
    else if (a.pod > 84) bucket = 'power';
    else if (a.con > 84) bucket = 'contact';
    else if (a.spd > 86) bucket = 'speed';
    else if (a.def > 86) bucket = 'glove';
    else if (st.clubsPlayed.length > 5) bucket = 'journey';
    else if (st.awardCount.WS) bucket = 'clutch';
    if (bucket && rng.chance(0.55)) st.nickname = rng.pick(D.NICKNAMES[bucket]);
  }

  /* --------------------------------------------------------- TITULARES */
  function headline(st, rng, line, awards, post, injured) {
    const club = clubOf(st);
    const cn = st.clubName;
    const H = [];
    if (awards.indexOf('PERFECT') >= 0) H.push(`Juego perfecto: 27 al plato, 27 de vuelta al banco`);
    if (awards.indexOf('NOHIT') >= 0) H.push(`Sin hits ni carreras: el estadio se puso de pie en el noveno`);
    if (awards.indexOf('TC') >= 0) H.push(`Triple Corona: promedio, jonrones y remolcadas, todo suyo`);
    if (awards.indexOf('MVP') >= 0) H.push(`MVP por aclamación: la liga tuvo dueño`);
    if (awards.indexOf('CY') >= 0) H.push(`Cy Young: nadie dominó como ${st.lastName} desde el montículo`);
    if (awards.indexOf('WS') >= 0) H.push(`Campeón del mundo con ${cn}`);
    if (awards.indexOf('CYCLE') >= 0) H.push(`Bateó para el ciclo en una noche irrepetible`);
    if (awards.indexOf('HR4') >= 0) H.push(`Cuatro jonrones en un solo juego`);
    if (injured) H.push(`Temporada partida al medio por una ${injured.name}`);
    if (!H.length) {
      if (st.role === 'hit') {
        if (line.hr >= 35) H.push(`${line.hr} jonrones: la grada ya sabe adónde mirar`);
        else if (line.avg >= .310) H.push(`Bate caliente todo el año: ${fmt.avg(line.avg)} de promedio`);
        else if (line.sb >= 30) H.push(`${line.sb} bases robadas: puro vértigo en el camino`);
        else if (line.war < 0.5 && line.g > 80) H.push(`Año para olvidar en ${cn}`);
        else H.push(`Temporada de oficio con ${cn}`);
      } else {
        if (line.era <= 2.80) H.push(`Efectividad de ${fmt.era(line.era)}: muro infranqueable`);
        else if (line.k >= 200) H.push(`${line.k} ponches, el radar no daba tregua`);
        else if (line.sv >= 30) H.push(`${line.sv} salvamentos: el noveno tuvo dueño`);
        else if (line.era > 5.2 && line.ip > 60) H.push(`Año duro sobre la lomita en ${cn}`);
        else H.push(`Trabajo silencioso en la rotación de ${cn}`);
      }
    }
    return rng.pick(H);
  }

  /* ========================================================== SIM TEMPORADA */
  function simSeason(st) {
    const rng = st.rng;
    const lg = LG[st.league];
    let injured = null;

    /* Lesión previa arrastrada */
    let healthMult = 1;
    if (st.injuredNext > 0) { healthMult = 1 - st.injuredNext; st.injuredNext = 0; }

    const newInj = rollInjury(st, rng);
    if (newInj) {
      injured = newInj;
      const thisYear = Math.min(newInj.miss, 0.85);
      healthMult *= (1 - thisYear);
      if (newInj.miss > 0.85) st.injuredNext = 0.45;
    }
    healthMult = clamp(healthMult, 0, 1);

    /* Quien se gana el puesto deja de ser suplente */
    if (st.depth === 'banca' && st.ovr > leagueBar(st.league) + 1) st.depth = 'titular';
    if (st.pos === 'RP' && st.status === 'pro' && st.ovr > leagueBar(st.league) + 3) st.isCloser = true;

    const pt = playingTimeFactor(st, rng);
    st.form = clamp(st.form + rng.gauss(0, 0.45), -1, 1);

    const line = st.role === 'hit'
      ? simHitting(st, rng, pt, healthMult)
      : simPitching(st, rng, pt, healthMult);
    line.ovr = st.ovr;

    const post = simPostseason(st, rng, line);
    const awards = seasonAwards(st, rng, line, post);

    /* Selección nacional: Clásico Mundial cada 4 años */
    const country = D.COUNTRY_BY_CODE[st.country];
    if (st.year % 4 === 1 && lg.tier === 1 && st.ovr > 70 && country.pool >= 5) {
      if (rng.chance(clamp((st.ovr - 68) / 40 * (country.pool / 10), 0.05, 0.7))) {
        awards.push('WBC');
        st.flags.wbcTitles++;
      }
    }

    /* Acumulados */
    const t = st.totals;
    t.seasons++;
    if (st.role === 'hit') {
      t.g += line.g; t.pa += line.pa; t.ab += line.ab; t.h += line.h; t.hr += line.hr;
      t.rbi += line.rbi; t.r += line.r; t.sb += line.sb; t.bb += line.bb; t.so += line.so;
      t.doubles += line.doubles; t.triples += line.triples;
    } else {
      t.g += line.g; t.gs += line.gs; t.ip = +(t.ip + line.ip).toFixed(1);
      t.w += line.w; t.l += line.l; t.sv += line.sv; t.k += line.k; t.er += line.er;
      t.bbAllowed += line.bbAllowed; t.hitsAllowed += line.hitsAllowed;
    }
    t.war = +(t.war + line.war).toFixed(1);

    awards.forEach(k => { st.awardCount[k] = (st.awardCount[k] || 0) + 1; });

    /* Fama y moral */
    let fameGain = line.war * 1.5 + awards.length * 2.4;
    if (lg.id !== 'MLB') fameGain *= 0.55 + lg.q * 0.35;
    if (awards.indexOf('MVP') >= 0 || awards.indexOf('CY') >= 0) fameGain += 12;
    if (awards.indexOf('WS') >= 0) fameGain += 8;
    st.fame = clamp(st.fame + fameGain - 2.5, 0, 100);
    st.morale = clamp(st.morale + (line.war - 2) * 3 + (post.round === 'title' ? 12 : 0) - (injured ? 8 : 0) + rng.gauss(0, 4), 5, 100);

    const gained = develop(st, rng, line, injured);
    maybeNickname(st, rng, line);

    if (lg.id === 'MLB' && st.status !== 'minors') st.mlbSeasons++;
    if (st.status !== 'academia') st.proSeasons++;
    st.value = marketValue(st);

    const rec = {
      year: st.year,
      age: st.age,
      clubId: st.clubId,
      clubName: st.clubName,
      league: st.league,
      leagueShort: lg.short,
      ovr: line.ovr,
      ovrDelta: gained,
      role: st.role,
      pos: st.pos,
      line,
      awards,
      post,
      injury: injured ? injured.name : null,
      salary: st.salary,
      value: st.value,
      headline: headline(st, rng, line, awards, post, injured)
    };
    st.seasons.push(rec);

    /* Avanza el reloj */
    st.age++;
    st.year++;
    st.stint++;
    st.seasonsSinceDecision++;
    if (st.contractYears > 0) st.contractYears--;

    return rec;
  }

  /* ---------------------------------------------------------------- RETIRO */
  function retirementCheck(st) {
    const rng = st.rng;
    const mlbBar = leagueBar('MLB');

    if (st.age >= 43) return 'La edad ya no perdona: colgás los spikes a los ' + st.age + '.';

    /* El filtro más duro del béisbol: la mayoría se queda por el camino */
    if (st.mlbSeasons === 0) {
      if (st.age >= 27) {
        return 'Once años de autobuses y ligas menores. Nunca llegó la llamada; hasta acá llegó el sueño.';
      }
      if (st.age >= 23 && st.ovr < mlbBar - 14 && rng.chance(clamp((st.age - 22) * 0.22, 0, 0.75))) {
        return 'La organización te deja libre y nadie más pregunta por vos. Se acabó antes de empezar.';
      }
    }

    if (st.ovr < 46 && st.age > 28) return 'Nadie te ofrece contrato. El teléfono dejó de sonar.';
    if (st.ovr < mlbBar - 16 && st.age >= 30 && rng.chance(0.55)) {
      return 'Ya no hay sitio para vos ni en el banquillo. Te retirás sin ruido.';
    }

    if (st.age >= 31) {
      const p = clamp((st.age - 31) * 0.13 + (mlbBar + 2 - st.ovr) * 0.028, 0, 0.92);
      if (rng.chance(p)) {
        if (st.ovr > mlbBar + 6) return 'Te retirás en la cima, con el uniforme puesto y la grada de pie.';
        return 'El cuerpo pide basta. Anunciás el retiro al final de la temporada.';
      }
    }
    if (st.health < 34 && rng.chance(0.45)) return 'Las lesiones ganaron la pulseada: retiro forzado.';
    return null;
  }

  /* ------------------------------------------------------ VALORACIÓN FINAL */
  /* Lo hecho en Grandes Ligas vale entero; lo demás, en proporción a su nivel */
  function seasonWeight(lgId) {
    const lg = LG[lgId] || LG.ROK;
    if (lg.id === 'MLB') return 1;
    if (lg.tier === 1) return 0.34 + lg.q * 0.22;
    return Math.pow(lg.q, 3) * 0.42;
  }

  /* Las posiciones exigentes producen menos números: se compensa al valorarlas */
  const POS_SCORE = {
    C: 1.44, SS: 1.30, '2B': 1.26, CF: 1.18, '3B': 1.10,
    RF: 1.00, LF: 1.02, '1B': 0.88, DH: 0.80, SP: 1.00, RP: 1.28
  };

  function careerScore(st) {
    let s = 0;
    st.seasons.forEach(sn => {
      const w = seasonWeight(sn.league);
      const pw = POS_SCORE[sn.pos || st.pos] || 1;
      const l = sn.line;
      if (sn.role === 'hit') {
        s += (l.hr * 1.45 + l.h * 0.30 + l.rbi * 0.26 + l.sb * 0.45 + l.r * 0.13) * w * pw;
      } else {
        s += (l.w * 3.0 + l.k * 0.28 + l.sv * 2.0 + l.ip * 0.045) * w * pw;
      }
      s += l.war * 11 * w;
    });
    s += Math.max(0, st.peak - 66) * 7;
    s += st.mlbSeasons * 8;
    s += st.fame * 1.1;
    /* Lealtad: una sola camiseta pesa */
    if (st.clubsPlayed.length === 1 && st.mlbSeasons >= 8) s += 90;
    else if (st.clubsPlayed.length <= 2 && st.mlbSeasons >= 10) s += 45;

    for (const k in st.awardCount) {
      const a = D.AWARDS[k];
      if (a) s += a.weight * st.awardCount[k];
    }
    return Math.max(0, round(s));
  }

  function tierFor(score) {
    let out = D.TIERS[0];
    D.TIERS.forEach(t => { if (score >= t.min) out = t; });
    return out;
  }

  function hallOfFame(st, score) {
    const rng = st.rng;
    if (st.mlbSeasons < 10) {
      return { eligible: false, votes: 0, in: false,
        note: 'Se necesitan 10 temporadas en Grandes Ligas para entrar en la boleta.' };
    }
    /* Curva suave: entrar exige una carrera enorme, no solo longevidad */
    const base = score <= 500 ? 0 : 105 * (1 - Math.exp(-(score - 500) / 1800));
    let votes = clamp(base + rng.gauss(0, 5.5), 0, 99.4);
    votes = +votes.toFixed(1);
    const inHof = votes >= 75;
    if (inHof) st.awardCount.HOF = 1;
    return {
      eligible: true,
      votes,
      in: inHof,
      firstBallot: votes >= 88,
      note: inHof
        ? (votes >= 95 ? 'Elegido casi por unanimidad en su primer año de elegibilidad.'
          : votes >= 88 ? 'Entra en la primera votación, sin discusión.'
            : 'Entra al Salón de la Fama tras un debate cerrado.')
        : (votes >= 55 ? 'Se quedó a las puertas. Los veteranos podrían rescatarlo algún día.'
          : votes >= 20 ? 'Recibió votos, pero no alcanzó.'
            : 'Su nombre no llegó a la conversación.')
    };
  }

  function finishCareer(st, reason) {
    st.retired = true;
    st.finished = true;
    st.retireReason = reason || 'Fin del camino.';
    const score = careerScore(st);
    /* El número retirado depende del vínculo con un club */
    const main = mainClub(st);
    if (main && main.seasons >= 7 && (st.awardCount.MVP || st.awardCount.CY || st.fame > 80)) {
      st.awardCount.RETIRED = 1;
    }
    st.hof = hallOfFame(st, score);
    st.score = careerScore(st); /* recalcula incluyendo HOF y número retirado */
    st.tier = tierFor(st.score);
    return st;
  }

  function mainClub(st) {
    const count = {};
    st.seasons.forEach(s => {
      if (!s.clubId) return;
      const c = D.CLUB_BY_ID[s.clubId];
      if (!c) return;
      count[c.id] = (count[c.id] || 0) + 1;
    });
    let best = null;
    for (const id in count) {
      if (!best || count[id] > best.seasons) best = { club: D.CLUB_BY_ID[id], seasons: count[id] };
    }
    return best;
  }

  global.ENGINE = {
    makeRandom, clamp, fmt, createPlayer, computeOvr, attrKeysFor,
    marketValue, offeredSalary, offerPool, clubsIn, clubOf, parentClub,
    assignClub, assignMinors, simSeason, retirementCheck, finishCareer,
    careerScore, tierFor, mainClub, leagueBar, playingTimeFactor
  };
})(window);
