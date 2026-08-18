/* =========================================================================
   DIAMANTE · app.js
   Interfaz: creación del jugador, bucle de temporadas y pantalla final.
   ========================================================================= */
(function () {
  'use strict';

  const D = window.DATA;
  const E = window.ENGINE;
  const EV = window.EVENTS;
  const fmt = E.fmt;
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };

  /* ------------------------------------------------------------- ESTADO UI */
  const draft = {
    lastName: '',
    number: 27,
    bats: 'D',
    throws: 'D',
    country: null,
    pos: null,
    pace: 'normal'
  };
  let step = 0;
  let st = null;            // estado de carrera
  let pendingDecision = null;
  let busy = false;

  /* ------------------------------------------------------------- PANTALLAS */
  function show(id) {
    $$('.screen').forEach(s => s.classList.toggle('is-active', s.id === id));
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  /* ======================================================================
     CREACIÓN
     ====================================================================== */
  function initCreate() {
    /* Dorsales rápidos */
    const quick = $('#num-quick');
    [3, 7, 9, 13, 21, 24, 27, 34, 42, 51, 99].forEach(n => {
      const b = el('button', null, String(n));
      b.type = 'button';
      b.onclick = () => { $('#in-num').value = n; draft.number = n; paintJersey(); };
      quick.appendChild(b);
    });

    $('#in-name').addEventListener('input', e => {
      draft.lastName = e.target.value.trim();
      paintJersey();
    });
    $('#in-num').addEventListener('input', e => {
      let v = parseInt(e.target.value, 10);
      if (isNaN(v)) v = 0;
      draft.number = E.clamp(v, 0, 99);
      paintJersey();
    });

    segment('#seg-bats', v => { draft.bats = v; paintJersey(); });
    segment('#seg-throws', v => { draft.throws = v; paintJersey(); });

    /* Países */
    const grid = $('#country-grid');
    const paintCountries = filter => {
      grid.innerHTML = '';
      const q = (filter || '').toLowerCase();
      D.COUNTRIES
        .filter(c => !q || c.name.toLowerCase().indexOf(q) >= 0)
        .sort((a, b) => b.pool - a.pool || a.name.localeCompare(b.name))
        .forEach(c => {
          const b = el('button', 'country' + (draft.country === c.code ? ' is-on' : ''));
          b.type = 'button';
          b.innerHTML = `<span class="flagchip" style="background-image:${c.flag}"></span>
            <span><b>${c.name}</b><small>${poolLabel(c.pool)}</small></span>`;
          b.onclick = () => {
            draft.country = c.code;
            paintCountries(filter);
            paintJersey();
            markSteps();
          };
          grid.appendChild(b);
        });
    };
    $('#in-country-search').addEventListener('input', e => paintCountries(e.target.value));
    paintCountries('');

    /* Diamante */
    const dia = $('#diamond');
    D.POSITIONS.forEach(p => {
      const b = el('button', 'pos-dot', p.id);
      b.type = 'button';
      b.style.left = p.x + '%';
      b.style.top = p.y + '%';
      b.title = p.name;
      b.onclick = () => {
        draft.pos = p.id;
        $$('.pos-dot').forEach(d => d.classList.toggle('is-on', d.textContent === p.id));
        $('#pos-info').innerHTML =
          `<p class="tagline">${p.role === 'hit' ? 'Bateador' : 'Lanzador'}</p>
           <h4>${p.name}</h4><p>${p.desc}</p>`;
        paintJersey();
        markSteps();
      };
      dia.appendChild(b);
    });

    /* Ritmo */
    const pg = $('#pace-grid');
    D.PACES.forEach(p => {
      const b = el('button', 'pace' + (draft.pace === p.id ? ' is-on' : ''));
      b.type = 'button';
      b.innerHTML = `<b>${p.name}</b><small>${p.mins}</small><p>${p.desc}</p>`;
      b.onclick = () => {
        draft.pace = p.id;
        $$('.pace').forEach(x => x.classList.remove('is-on'));
        b.classList.add('is-on');
      };
      pg.appendChild(b);
    });

    $$('#steps .step').forEach(b => {
      b.onclick = () => { if (canReach(+b.dataset.step)) goStep(+b.dataset.step); };
    });
    $('#btn-back').onclick = () => step === 0 ? show('scr-home') : goStep(step - 1);
    $('#btn-next').onclick = () => {
      if (step < 3) { if (validate(step)) goStep(step + 1); }
      else startCareer();
    };
    paintJersey();
  }

  function poolLabel(p) {
    if (p >= 9) return 'Cantera de élite';
    if (p >= 7) return 'Gran tradición';
    if (p >= 5) return 'Béisbol consolidado';
    if (p >= 3) return 'Béisbol minoritario';
    return 'Casi sin béisbol';
  }

  function segment(sel, cb) {
    $$(sel + ' button').forEach(b => {
      b.type = 'button';
      b.onclick = () => {
        $$(sel + ' button').forEach(x => x.classList.remove('is-on'));
        b.classList.add('is-on');
        cb(b.dataset.v);
      };
    });
  }

  function validate(s) {
    if (s === 0) {
      if (!draft.lastName) { flash($('#in-name')); return false; }
      return true;
    }
    if (s === 1 && !draft.country) { flash($('#country-grid')); return false; }
    if (s === 2 && !draft.pos) { flash($('#diamond')); return false; }
    return true;
  }
  function canReach(s) {
    for (let i = 0; i < s; i++) if (!validate(i)) return false;
    return true;
  }
  function flash(node) {
    node.animate(
      [{ outline: '2px solid rgba(224,56,74,0)' }, { outline: '2px solid rgba(224,56,74,.9)' }, { outline: '2px solid rgba(224,56,74,0)' }],
      { duration: 700 }
    );
  }
  function goStep(s) {
    step = s;
    $$('.pane').forEach(p => p.classList.toggle('is-active', +p.dataset.pane === s));
    markSteps();
    $('#btn-next').textContent = s === 3 ? 'Empezar la carrera' : 'Continuar';
    $('#btn-back').textContent = s === 0 ? 'Volver al inicio' : 'Atrás';
  }
  function markSteps() {
    $$('#steps .step').forEach(b => {
      const i = +b.dataset.step;
      b.classList.toggle('is-active', i === step);
      b.classList.toggle('is-done', i < step);
    });
  }

  function paintJersey() {
    $('#jersey-num').textContent = draft.number;
    $('#jersey-name').textContent = draft.lastName || 'TU APELLIDO';
    const c = draft.country ? D.COUNTRY_BY_CODE[draft.country] : null;
    $('#jersey-flag').style.backgroundImage = c ? c.flag : 'none';
    $('#jersey-country').textContent = c ? c.name : 'Elegí país';
    $('#jersey-pos').textContent = draft.pos ? D.POS_BY_ID[draft.pos].name : '—';
    const hand = v => v === 'D' ? 'derecha' : v === 'Z' ? 'izquierda' : 'ambidiestro';
    $('#jersey-hands').textContent = `Batea ${hand(draft.bats)} · Lanza ${hand(draft.throws)}`;
  }

  /* ======================================================================
     CARRERA
     ====================================================================== */
  function startCareer() {
    st = E.createPlayer({
      lastName: draft.lastName.toUpperCase(),
      number: draft.number,
      bats: draft.bats,
      throws: draft.throws,
      country: draft.country,
      pos: draft.pos,
      pace: draft.pace
    });
    $('#feed').innerHTML = '';
    pendingDecision = null;
    show('scr-career');
    paintHud();
    paintSide();
    presentDecision(EV.opening(st));
  }

  function clubColors() {
    const c = st.clubId ? D.CLUB_BY_ID[st.clubId] : null;
    document.documentElement.style.setProperty('--club-1', c ? c.c1 : '#2A3243');
    document.documentElement.style.setProperty('--club-2', c ? c.c2 : '#8A93A4');
  }

  function paintHud() {
    $('#hud-num').textContent = st.number;
    $('#hud-name').textContent = st.lastName + (st.nickname ? ` «${st.nickname}»` : '');
    const lg = st.league ? D.LEAGUES[st.league].short : '—';
    $('#hud-sub').textContent = `${st.age} años · ${st.pos} · ${st.clubName}${st.league ? ' · ' + lg : ''}`;
    $('#hud-ovr').textContent = st.ovr;
    $('#ovr-ring').style.setProperty('--p', st.ovr);
    $('#hud-season').textContent = st.year;
    clubColors();
  }

  function paintSide() {
    /* Club */
    const c = st.clubId ? D.CLUB_BY_ID[st.clubId] : null;
    const lg = st.league ? D.LEAGUES[st.league] : null;
    $('#club-card').innerHTML = `
      <div class="club-banner">
        <b>${st.clubName}</b>
        <span>${lg ? lg.name : 'Sin liga'}</span>
      </div>
      <div class="club-rows">
        <div class="kv"><span>Posición</span><b>${D.POS_BY_ID[st.pos].name}</b></div>
        <div class="kv"><span>Origen</span><b>${D.COUNTRY_BY_CODE[st.country].name}</b></div>
        <div class="kv"><span>Valor de mercado</span><b>${fmt.money(st.value)}</b></div>
        <div class="kv"><span>Fama</span><b>${Math.round(st.fame)}</b></div>
        <div class="kv"><span>Ánimo</span><b>${Math.round(st.morale)}</b></div>
        <div class="kv"><span>Estado físico</span><b>${Math.round(st.health)}</b></div>
      </div>`;

    /* Atributos */
    const box = $('#attrs');
    box.innerHTML = '';
    E.attrKeysFor(st.pos).forEach(k => {
      const v = st.attrs[k];
      const row = el('div', 'attr');
      row.innerHTML = `<span class="attr-name">${D.ATTR_LABELS[k]}</span>
        <span class="attr-bar"><i style="width:${v}%"></i></span>
        <span class="attr-val">${v}</span>`;
      box.appendChild(row);
    });

    /* Contrato */
    $('#contract-card').innerHTML = `
      <h4 class="card-h">Contrato</h4>
      <div class="kv"><span>Salario</span><b>${fmt.money(st.salary)}</b></div>
      <div class="kv"><span>Años restantes</span><b>${st.contractYears}</b></div>
      <div class="kv"><span>Temporadas aquí</span><b>${st.stint}</b></div>`;

    /* Totales */
    const t = st.totals;
    const rows = st.role === 'hit' ? [
      ['Temporadas', st.seasons.length], ['Juegos', fmt.int(t.g)], ['Hits', fmt.int(t.h)],
      ['Jonrones', fmt.int(t.hr)], ['Remolcadas', fmt.int(t.rbi)], ['Robadas', fmt.int(t.sb)],
      ['AVG', t.ab ? fmt.avg(t.h / t.ab) : '—'], ['WAR', t.war.toFixed(1)]
    ] : [
      ['Temporadas', st.seasons.length], ['Juegos', fmt.int(t.g)], ['Entradas', fmt.int(t.ip)],
      ['Ganados-Perdidos', t.w + '-' + t.l], ['Ponches', fmt.int(t.k)], ['Salvados', fmt.int(t.sv)],
      ['EFE', t.ip ? fmt.era(t.er * 9 / t.ip) : '—'], ['WAR', t.war.toFixed(1)]
    ];
    $('#totals').innerHTML = rows.map(r => `<div class="kv"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');

    /* Palmarés */
    paintTrophies($('#palmares'), st);
  }

  function paintTrophies(node, s) {
    const keys = Object.keys(s.awardCount)
      .filter(k => D.AWARDS[k])
      .sort((a, b) => D.AWARDS[b].weight - D.AWARDS[a].weight);
    if (!keys.length) { node.innerHTML = '<p class="empty">Todavía sin vitrina.</p>'; return; }
    node.innerHTML = keys.map(k => {
      const a = D.AWARDS[k], n = s.awardCount[k];
      return `<span class="trophy${a.weight >= 40 ? ' big' : ''}" title="${a.label}">
        ${a.icon} ${a.label}${n > 1 ? ' <b>×' + n + '</b>' : ''}</span>`;
    }).join('');
  }

  /* --------------------------------------------------------- DECISIONES */
  function presentDecision(dec) {
    if (!dec) return;
    pendingDecision = dec;
    const slot = $('#decision-slot');
    const box = el('div', 'decision');
    box.innerHTML = `
      <p class="decision-kicker">${dec.kicker}</p>
      <h3>${dec.title}</h3>
      <p class="decision-text">${dec.text}</p>
      <div class="options"></div>`;
    const opts = box.querySelector('.options');
    dec.options.forEach(o => {
      const b = el('button', 'option');
      b.type = 'button';
      b.innerHTML = `<b>${o.label}</b>${o.tag ? `<span class="tag">${o.tag}</span>` : ''}
        <small>${o.sub || ''}</small>${o.hint ? `<span class="hint">${o.hint}</span>` : ''}`;
      b.onclick = () => chooseOption(o);
      opts.appendChild(b);
    });
    slot.innerHTML = '';
    slot.appendChild(box);
    $('#btn-sim').disabled = true;
    slot.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function chooseOption(o) {
    if (busy) return;
    busy = true;
    let res;
    try { res = o.apply(); } catch (err) { res = { tone: 'neutral', text: 'La decisión se tomó.' }; console.error(err); }
    st.seasonsSinceDecision = 0;
    pendingDecision = null;
    $('#decision-slot').innerHTML = '';
    pushNote(res.text, res.tone, o.label);
    paintHud(); paintSide();
    $('#btn-sim').disabled = false;
    busy = false;

    if (st.wantsRetire) endCareer('Te retirás cuando vos lo decidís, no cuando te lo dicen.');
  }

  function pushNote(text, tone, label) {
    const n = el('div', 'season');
    n.innerHTML = `
      <div class="season-top">
        <span class="season-year" style="font-size:1rem;color:var(--gold)">DECISIÓN</span>
        <span class="season-age">${st.year} · ${st.age} años</span>
      </div>
      <div class="season-body">
        ${label ? `<div class="season-head">${label}</div>` : ''}
        <p style="color:var(--muted)">${text}</p>
      </div>`;
    if (tone === 'good') n.style.borderColor = 'rgba(63,192,126,.35)';
    if (tone === 'bad') n.style.borderColor = 'rgba(224,56,74,.4)';
    $('#feed').prepend(n);
  }

  /* ------------------------------------------------------- SIMULAR AÑO */
  function simulate() {
    if (busy || pendingDecision || !st || st.finished) return;
    busy = true;
    $('#btn-sim').disabled = true;

    /* Sanción por dopaje: se pierde la temporada */
    if (st.flags.banned && !st.flags.bannedServed) {
      st.flags.bannedServed = true;
      st.age++; st.year++; st.seasonsSinceDecision++;
      if (st.contractYears > 0) st.contractYears--;
      pushNote('Sanción cumplida fuera del campo. Un año entero mirando por televisión.', 'bad', 'Temporada perdida');
      paintHud(); paintSide();
      busy = false; $('#btn-sim').disabled = false;
      return;
    }

    const rec = E.simSeason(st);
    renderSeason(rec);

    /* Ascensos y descensos automáticos */
    EV.autoProgress(st).forEach(n => pushNote(n.text, n.tone, 'Movimiento'));

    paintHud();
    paintSide();

    /* ¿Se acaba la carrera? */
    const reason = E.retirementCheck(st);
    if (reason || st.wantsRetire) { endCareer(reason || 'Te retirás en tus términos.'); busy = false; return; }

    /* ¿Toca decidir? */
    const pace = D.PACES.find(p => p.id === st.pace).every;
    const mustDecide =
      (st.status === 'pro' && st.contractYears <= 0) ||
      (rec.injury && st.health < 78) ||
      st.seasonsSinceDecision >= pace;

    if (mustDecide) {
      const dec = EV.next(st);
      if (dec) { presentDecision(dec); busy = false; return; }
    }

    $('#btn-sim').disabled = false;
    busy = false;
  }

  function renderSeason(rec) {
    const lg = D.LEAGUES[rec.league];
    const l = rec.line;
    const hitter = rec.role === 'hit';
    const n = el('div', 'season');

    const stats = hitter ? [
      ['J', l.g], ['AVG', fmt.avg(l.avg)], ['HR', l.hr], ['CI', l.rbi],
      ['BR', l.sb], ['OPS', l.ops.toFixed(3).replace(/^0/, '')], ['WAR', l.war.toFixed(1)]
    ] : [
      ['J', l.g], ['G-P', l.w + '-' + l.l], ['EFE', fmt.era(l.era)], ['ENT', l.ip.toFixed(1)],
      ['P', l.k], ['SLV', l.sv], ['WAR', l.war.toFixed(1)]
    ];
    const hot = hitter
      ? { HR: l.hr >= 35, AVG: l.avg >= .310, WAR: l.war >= 5 }
      : { EFE: l.era <= 3.00, P: l.k >= 200, WAR: l.war >= 5, SLV: l.sv >= 35 };

    n.innerHTML = `
      <div class="season-top">
        <span class="season-year">${rec.year}</span>
        <span class="season-age">${rec.age} años</span>
        <span class="season-club"><b>${rec.clubName}</b><span>${lg.short}</span></span>
      </div>
      <div class="season-body">
        <div class="season-head">${rec.headline}</div>
        <div class="statline">
          ${stats.map(s => `<span class="stat${hot[s[0]] ? ' hot' : ''}"><b>${s[1]}</b><span>${s[0]}</span></span>`).join('')}
        </div>
      </div>
      <div class="season-foot">
        <span class="pill ${rec.ovrDelta > 0 ? 'ovr-up' : rec.ovrDelta < 0 ? 'ovr-dn' : ''}">
          OVR ${rec.ovr} ${rec.ovrDelta > 0 ? '▲' + rec.ovrDelta : rec.ovrDelta < 0 ? '▼' + Math.abs(rec.ovrDelta) : '='}
        </span>
        ${rec.post.label ? `<span class="pill ${rec.post.round === 'title' ? 'gold' : 'good'}">${rec.post.label}</span>` : ''}
        ${rec.awards.filter(k => D.AWARDS[k]).map(k => {
          const a = D.AWARDS[k];
          return `<span class="pill ${a.weight >= 40 ? 'gold' : 'good'}">${a.icon} ${a.label}</span>`;
        }).join('')}
        ${rec.injury ? `<span class="pill bad">🩹 ${rec.injury}</span>` : ''}
        ${rec.salary ? `<span class="pill">${fmt.money(rec.salary)} / año</span>` : ''}
      </div>`;
    $('#feed').prepend(n);
  }

  /* ======================================================================
     FINAL
     ====================================================================== */
  function endCareer(reason) {
    E.finishCareer(st, reason);
    const t = st.totals;

    $('#end-kicker').textContent = `${st.firstName} ${st.lastName} · ${st.seasons.length} temporadas · ${st.seasons.length ? st.seasons[0].year + '–' + (st.year - 1) : ''}`;
    $('#end-tier').textContent = st.tier.label;
    $('#end-desc').textContent = st.tier.desc + ' ' + st.retireReason;
    $('#end-score').textContent = fmt.int(st.score);
    setTimeout(() => { $('#score-fill').style.width = E.clamp(st.score / 5000 * 100, 2, 100) + '%'; }, 120);

    const main = E.mainClub(st);
    const rows = st.role === 'hit' ? [
      ['Juegos', fmt.int(t.g)], ['Turnos', fmt.int(t.pa)], ['Hits', fmt.int(t.h)],
      ['Dobles', fmt.int(t.doubles)], ['Jonrones', fmt.int(t.hr)], ['Remolcadas', fmt.int(t.rbi)],
      ['Anotadas', fmt.int(t.r)], ['Robadas', fmt.int(t.sb)],
      ['Promedio', t.ab ? fmt.avg(t.h / t.ab) : '—'], ['WAR', t.war.toFixed(1)]
    ] : [
      ['Juegos', fmt.int(t.g)], ['Aperturas', fmt.int(t.gs)], ['Entradas', fmt.int(t.ip)],
      ['Ganados', fmt.int(t.w)], ['Perdidos', fmt.int(t.l)], ['Salvados', fmt.int(t.sv)],
      ['Ponches', fmt.int(t.k)], ['Efectividad', t.ip ? fmt.era(t.er * 9 / t.ip) : '—'],
      ['WHIP', t.ip ? ((t.bbAllowed + t.hitsAllowed) / t.ip).toFixed(2) : '—'], ['WAR', t.war.toFixed(1)]
    ];
    rows.push(['OVR máximo', st.peak]);
    rows.push(['Temporadas en MLB', st.mlbSeasons]);
    rows.push(['Clubes', st.clubsPlayed.length]);
    if (main) rows.push(['Club de su vida', `${main.club.abbr} (${main.seasons})`]);
    $('#end-totals').innerHTML = rows.map(r => `<div class="kv"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');

    paintTrophies($('#end-awards'), st);

    const h = st.hof;
    $('#end-hof').innerHTML = `
      <div class="hof-box">
        <div class="hof-pct ${h.in ? 'in' : 'out'}">${h.eligible ? h.votes + '%' : '—'}</div>
        <p class="hof-note">${h.note}</p>
      </div>`;

    /* Tabla temporada a temporada */
    const hitter = st.role === 'hit';
    const head = hitter
      ? ['Año', 'Eq.', 'Lg', 'Ed', 'OVR', 'J', 'AVG', 'HR', 'CI', 'BR', 'OPS', 'WAR']
      : ['Año', 'Eq.', 'Lg', 'Ed', 'OVR', 'J', 'G', 'P', 'EFE', 'ENT', 'P', 'SLV', 'WAR'];
    let html = '<thead><tr>' + head.map(x => `<th>${x}</th>`).join('') + '</tr></thead><tbody>';
    st.seasons.forEach(s => {
      const l = s.line;
      const cells = hitter
        ? [s.year, s.clubName, s.leagueShort, s.age, s.ovr, l.g, fmt.avg(l.avg), l.hr, l.rbi, l.sb, l.ops.toFixed(3).replace(/^0/, ''), l.war.toFixed(1)]
        : [s.year, s.clubName, s.leagueShort, s.age, s.ovr, l.g, l.w, l.l, fmt.era(l.era), l.ip.toFixed(1), l.k, l.sv, l.war.toFixed(1)];
      html += '<tr>' + cells.map((c, i) => `<td class="${i === 1 ? 'club-cell' : ''}">${c}</td>`).join('') + '</tr>';
    });
    $('#end-table').innerHTML = html + '</tbody>';

    window.CARD.draw($('#legacy-canvas'), st);
    show('scr-end');
  }

  /* ------------------------------------------------------------ ACCIONES */
  function initGlobal() {
    $('#btn-start').onclick = () => { show('scr-create'); goStep(0); };
    $('#btn-sim').onclick = simulate;
    $('#btn-quit').onclick = () => {
      if (confirm('¿Abandonar la carrera? Se pierde todo lo jugado.')) {
        st = null; pendingDecision = null; show('scr-home');
      }
    };
    $('#btn-again').onclick = () => { show('scr-create'); goStep(0); };

    $('#btn-download').onclick = () => {
      const c = $('#legacy-canvas');
      const a = document.createElement('a');
      a.download = `diamante-${st.lastName.toLowerCase()}-${st.number}.png`;
      a.href = c.toDataURL('image/png');
      a.click();
    };

    $('#btn-copy').onclick = async () => {
      const txt = window.CARD.summaryText(st);
      try {
        await navigator.clipboard.writeText(txt);
        toast($('#btn-copy'), 'Copiado');
      } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = txt; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); ta.remove();
        toast($('#btn-copy'), 'Copiado');
      }
    };

    document.addEventListener('keydown', e => {
      if (e.code === 'Space' && $('#scr-career').classList.contains('is-active')) {
        if (document.activeElement && /INPUT|TEXTAREA|BUTTON/.test(document.activeElement.tagName)) {
          if (document.activeElement.id !== 'btn-sim') return;
        }
        e.preventDefault();
        simulate();
      }
      if (e.key === 'Enter' && $('#scr-create').classList.contains('is-active')) {
        $('#btn-next').click();
      }
    });
  }

  function toast(btn, msg) {
    const old = btn.textContent;
    btn.textContent = msg;
    setTimeout(() => { btn.textContent = old; }, 1400);
  }

  /* ------------------------------------------------------------- ARRANQUE */
  initCreate();
  initGlobal();
})();
