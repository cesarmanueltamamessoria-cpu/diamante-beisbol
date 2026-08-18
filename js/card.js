/* =========================================================================
   DIAMANTE · card.js
   Dibuja la tarjeta de legado (1080×1440) en canvas para descargar/compartir.
   ========================================================================= */
(function (global) {
  'use strict';

  const D = global.DATA;
  const E = global.ENGINE;

  const DISPLAY = '"Bahnschrift","DIN Alternate","Oswald","Arial Narrow",sans-serif';
  const BODY = 'system-ui,"Segoe UI",Roboto,sans-serif';

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function fitText(ctx, text, maxWidth, startPx, weight, family) {
    let px = startPx;
    do {
      ctx.font = `${weight} ${px}px ${family}`;
      px -= 2;
    } while (ctx.measureText(text).width > maxWidth && px > 18);
    return px + 2;
  }

  function shade(hex, amt) {
    const n = parseInt(hex.replace('#', ''), 16);
    let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
    return `rgb(${r},${g},${b})`;
  }

  function draw(canvas, st) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const main = E.mainClub(st);
    const club = main ? main.club : null;
    const c1 = club ? club.c1 : '#2A3243';
    const c2 = club ? club.c2 : '#8A93A4';
    const t = st.totals;
    const hitter = st.role === 'hit';

    /* ---- Fondo ---- */
    ctx.fillStyle = '#08090D';
    ctx.fillRect(0, 0, W, H);

    const g = ctx.createLinearGradient(0, 0, W, H * 0.7);
    g.addColorStop(0, shade(c1, 26));
    g.addColorStop(0.55, c1);
    g.addColorStop(1, '#08090D');
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H * 0.62);
    ctx.globalAlpha = 1;

    /* Halo del club */
    const rg = ctx.createRadialGradient(W * 0.82, H * 0.1, 20, W * 0.82, H * 0.1, 620);
    rg.addColorStop(0, c2 + 'aa');
    rg.addColorStop(1, 'transparent');
    ctx.globalAlpha = 0.5; ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H * 0.6); ctx.globalAlpha = 1;

    /* Costuras de pelota, decorativas */
    ctx.strokeStyle = 'rgba(224,56,74,.35)'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(W + 120, H * 0.30, 420, Math.PI * 0.62, Math.PI * 1.38); ctx.stroke();
    ctx.beginPath(); ctx.arc(-120, H * 0.30, 420, -Math.PI * 0.38, Math.PI * 0.38); ctx.stroke();

    /* Velo inferior para legibilidad */
    const veil = ctx.createLinearGradient(0, H * 0.36, 0, H);
    veil.addColorStop(0, 'rgba(8,9,13,0)');
    veil.addColorStop(0.35, 'rgba(8,9,13,.86)');
    veil.addColorStop(1, 'rgba(8,9,13,1)');
    ctx.fillStyle = veil; ctx.fillRect(0, H * 0.30, W, H * 0.70);

    /* ---- Cabecera ---- */
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255,255,255,.72)';
    ctx.font = `600 26px ${DISPLAY}`;
    ctx.letterSpacing && (ctx.letterSpacing = '6px');
    ctx.fillText('DIAMANTE', 70, 88);
    ctx.letterSpacing && (ctx.letterSpacing = '0px');
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.font = `400 24px ${BODY}`;
    ctx.textAlign = 'right';
    ctx.fillText(`${st.seasons.length} temporadas · ${st.seasons.length ? st.seasons[0].year : ''}–${st.year - 1}`, W - 70, 88);
    ctx.textAlign = 'left';

    /* ---- Dorsal gigante ---- */
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `600 420px ${DISPLAY}`;
    ctx.textAlign = 'right';
    ctx.fillText(String(st.number), W - 40, 430);
    ctx.restore();
    ctx.textAlign = 'left';

    /* ---- Nombre ---- */
    const country = D.COUNTRY_BY_CODE[st.country];
    ctx.fillStyle = 'rgba(255,255,255,.62)';
    ctx.font = `400 30px ${BODY}`;
    ctx.fillText(st.firstName, 70, 216);

    const namePx = fitText(ctx, st.lastName.toUpperCase(), W - 150, 130, '600', DISPLAY);
    ctx.fillStyle = '#F4F1EA';
    ctx.font = `600 ${namePx}px ${DISPLAY}`;
    ctx.fillText(st.lastName.toUpperCase(), 70, 216 + namePx * 0.92);

    let y = 216 + namePx * 0.92 + 54;
    if (st.nickname) {
      ctx.fillStyle = '#E9C46A';
      ctx.font = `italic 400 34px ${BODY}`;
      ctx.fillText('«' + st.nickname + '»', 70, y);
      y += 48;
    }

    ctx.fillStyle = 'rgba(255,255,255,.78)';
    ctx.font = `400 27px ${BODY}`;
    const pos = D.POS_BY_ID[st.pos];
    ctx.fillText(`${country.name}  ·  ${pos.name}  ·  OVR máx. ${st.peak}`, 70, y);
    y += 44;
    if (club) {
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.font = `400 25px ${BODY}`;
      ctx.fillText(`${main.seasons} temporadas en ${club.name}`, 70, y);
    }

    /* ---- Franja de nivel ---- */
    const tierY = 700;
    const tg = ctx.createLinearGradient(70, 0, W - 70, 0);
    tg.addColorStop(0, 'rgba(233,196,106,.30)');
    tg.addColorStop(1, 'rgba(233,196,106,.04)');
    ctx.fillStyle = tg;
    roundRect(ctx, 70, tierY, W - 140, 132, 20); ctx.fill();
    ctx.strokeStyle = 'rgba(233,196,106,.45)'; ctx.lineWidth = 2; ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.font = `400 22px ${BODY}`;
    ctx.fillText('VALORACIÓN FINAL', 100, tierY + 44);
    const tierPx = fitText(ctx, st.tier.label.toUpperCase(), 620, 62, '600', DISPLAY);
    ctx.fillStyle = '#E9C46A';
    ctx.font = `600 ${tierPx}px ${DISPLAY}`;
    ctx.fillText(st.tier.label.toUpperCase(), 100, tierY + 106);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#F4F1EA';
    ctx.font = `600 62px ${DISPLAY}`;
    ctx.fillText(String(st.score), W - 100, tierY + 100);
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.font = `400 20px ${BODY}`;
    ctx.fillText('PUNTOS', W - 100, tierY + 44);
    ctx.textAlign = 'left';

    /* ---- Cuadrícula de estadísticas ---- */
    const stats = hitter ? [
      ['JUEGOS', E.fmt.int(t.g)],
      ['HITS', E.fmt.int(t.h)],
      ['JONRONES', E.fmt.int(t.hr)],
      ['REMOLCADAS', E.fmt.int(t.rbi)],
      ['ROBADAS', E.fmt.int(t.sb)],
      ['AVG', t.ab ? E.fmt.avg(t.h / t.ab) : '—']
    ] : [
      ['JUEGOS', E.fmt.int(t.g)],
      ['ENTRADAS', E.fmt.int(t.ip)],
      ['GANADOS', E.fmt.int(t.w)],
      ['PONCHES', E.fmt.int(t.k)],
      ['SALVADOS', E.fmt.int(t.sv)],
      ['EFE', t.ip ? (t.er * 9 / t.ip).toFixed(2) : '—']
    ];

    const gx = 70, gy = 890, gw = (W - 140) / 3, gh = 118;
    stats.forEach((s, i) => {
      const x = gx + (i % 3) * gw, yy = gy + Math.floor(i / 3) * gh;
      ctx.fillStyle = 'rgba(255,255,255,.05)';
      roundRect(ctx, x + 6, yy, gw - 12, gh - 12, 14); ctx.fill();
      ctx.fillStyle = '#F4F1EA';
      ctx.font = `600 46px ${DISPLAY}`;
      ctx.fillText(s[1], x + 28, yy + 62);
      ctx.fillStyle = 'rgba(255,255,255,.45)';
      ctx.font = `400 19px ${BODY}`;
      ctx.fillText(s[0], x + 28, yy + 90);
    });

    /* ---- Vitrina ---- */
    const HIGHLIGHT = ['HOF', 'MVP', 'CY', 'WS', 'TC', 'WSMVP', 'ROY', 'AS', 'GG', 'SS', 'HRK', 'ERAK', 'SOK', 'SVK', 'NPBWS', 'KBOWS', 'WBC', 'PERFECT', 'NOHIT', 'RETIRED'];
    const trophies = HIGHLIGHT
      .filter(k => st.awardCount[k])
      .map(k => ({ a: D.AWARDS[k], n: st.awardCount[k] }));

    let ty = 1160;
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.font = `400 20px ${BODY}`;
    ctx.fillText('VITRINA', 70, ty);
    ty += 34;

    if (!trophies.length) {
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.font = `400 26px ${BODY}`;
      ctx.fillText('Sin títulos individuales. Igual jugaste.', 70, ty + 30);
    } else {
      let x = 70, rowY = ty;
      ctx.font = `400 24px ${BODY}`;
      trophies.slice(0, 12).forEach(tr => {
        const label = (tr.n > 1 ? tr.n + '× ' : '') + tr.a.label;
        const w = ctx.measureText(label).width + 74;
        if (x + w > W - 70) { x = 70; rowY += 60; }
        if (rowY > 1330) return;
        ctx.fillStyle = 'rgba(233,196,106,.12)';
        roundRect(ctx, x, rowY, w, 48, 24); ctx.fill();
        ctx.strokeStyle = 'rgba(233,196,106,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.font = `400 26px ${BODY}`;
        ctx.fillStyle = '#E9C46A';
        ctx.fillText(tr.a.icon, x + 18, rowY + 33);
        ctx.font = `400 24px ${BODY}`;
        ctx.fillStyle = 'rgba(255,255,255,.88)';
        ctx.fillText(label, x + 54, rowY + 32);
        x += w + 12;
      });
    }

    /* ---- Pie ---- */
    ctx.fillStyle = 'rgba(255,255,255,.30)';
    ctx.font = `400 22px ${BODY}`;
    ctx.fillText('DIAMANTE · simulador de carrera de béisbol', 70, H - 52);
    ctx.textAlign = 'right';
    const hofTxt = st.hof && st.hof.in
      ? `Salón de la Fama · ${st.hof.votes}%`
      : st.hof && st.hof.eligible ? `Boleta: ${st.hof.votes}%` : 'No elegible al Salón';
    ctx.fillStyle = st.hof && st.hof.in ? '#E9C46A' : 'rgba(255,255,255,.30)';
    ctx.fillText(hofTxt, W - 70, H - 52);
    ctx.textAlign = 'left';
  }

  function summaryText(st) {
    const t = st.totals;
    const club = E.mainClub(st);
    const pos = D.POS_BY_ID[st.pos];
    const L = [];
    L.push(`⚾ ${st.firstName} ${st.lastName} #${st.number} — ${pos.name}`);
    L.push(`${D.COUNTRY_BY_CODE[st.country].name} · ${st.seasons.length} temporadas · OVR máximo ${st.peak}`);
    if (club) L.push(`Club de su vida: ${club.club.name} (${club.seasons} temporadas)`);
    if (st.role === 'hit') {
      L.push(`${E.fmt.int(t.h)} hits · ${t.hr} jonrones · ${t.rbi} remolcadas · ${E.fmt.avg(t.ab ? t.h / t.ab : 0)} AVG`);
    } else {
      L.push(`${t.w}-${t.l} · ${E.fmt.era(t.ip ? t.er * 9 / t.ip : 0)} EFE · ${E.fmt.int(t.k)} ponches · ${t.sv} salvados`);
    }
    const tro = Object.keys(st.awardCount)
      .filter(k => D.AWARDS[k] && D.AWARDS[k].weight >= 20)
      .map(k => (st.awardCount[k] > 1 ? st.awardCount[k] + '× ' : '') + D.AWARDS[k].label);
    if (tro.length) L.push('Vitrina: ' + tro.join(', '));
    L.push(`Valoración: ${st.tier.label.toUpperCase()} — ${st.score} puntos`);
    if (st.hof) L.push(st.hof.in ? `🏛️ Salón de la Fama con el ${st.hof.votes}% de los votos` : `Salón de la Fama: ${st.hof.eligible ? st.hof.votes + '% de los votos' : 'no elegible'}`);
    L.push('— jugado en DIAMANTE');
    return L.join('\n');
  }

  global.CARD = { draw, summaryText };
})(window);
