/* Módulo "Aparato locomotor (normal)": examen osteoarticular y muscular según Argente-Álvarez —inspección, palpación,
   movilidad activa y pasiva con goniómetro, columna y postura, fuerza, tono y trofismo, maniobras especiales y marcha.
   Shell propio (id: msk). Los datos por persona se indexan por `id` (con valor por defecto), nunca por posición. */
(function () {
  'use strict';
  const { clamp, lerp, esc, svgPoint } = U;

  const SK = '#f1c9a5', SD = '#b98a63', SK2 = '#f6dcc2', NS = 'http://www.w3.org/2000/svg';
  const rad = d => d * Math.PI / 180;
  const deg = r => r * 180 / Math.PI;
  const P = (x, y, a, l) => [x + l * Math.cos(rad(a)), y + l * Math.sin(rad(a))];
  const r1 = v => Math.round(v * 10) / 10;
  const fmt = v => String(r1(v)).replace('.', ',');
  const ease = u => (1 - Math.cos(Math.PI * u)) / 2;
  const el = (name, attrs, parent) => {
    const e = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach(k => e.setAttribute(k, attrs[k]));
    if (parent) parent.appendChild(e);
    return e;
  };

  /* ------------------------------------------------------------ DIBUJO BASE */
  const cap = (x1, y1, x2, y2, w, fill) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${SD}" stroke-width="${w + 4}" stroke-linecap="round"/>` +
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${fill || SK}" stroke-width="${w}" stroke-linecap="round"/>`;
  const limb = (x, y, a, l, w, fill) => { const q = P(x, y, a, l); return cap(x, y, q[0], q[1], w, fill); };
  const ball = (x, y, r, fill) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill || SK}" stroke="${SD}" stroke-width="3"/>`;
  const oval = (x, y, rx, ry, fill) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill || SK}" stroke="${SD}" stroke-width="3"/>`;
  const headS = (x, y, r, nose) => ball(x, y, r) +
    (nose ? `<path d="M${x + r - 2} ${y - 3} l${nose * 13} 11 l${-nose * 13} 4 z" fill="${SK}" stroke="${SD}" stroke-width="2"/><circle cx="${x + nose * 12}" cy="${y - 8}" r="3" fill="#38495a"/>`
      : `<circle cx="${x - 11}" cy="${y - 6}" r="3" fill="#38495a"/><circle cx="${x + 11}" cy="${y - 6}" r="3" fill="#38495a"/>`);
  const smooth = pts => {
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      d += ` Q${pts[i][0]} ${pts[i][1]} ${mx} ${my}`;
    }
    const l = pts[pts.length - 1];
    return d + ` L${l[0]} ${l[1]}`;
  };
  const arrowSvg = (x, y, vx, vy, len, color) => {
    const n = Math.hypot(vx, vy) || 1, ux = vx / n, uy = vy / n;
    const tx = x - ux * len, ty = y - uy * len;
    const h = [[x, y], [x - ux * 12 - uy * 6, y - uy * 12 + ux * 6], [x - ux * 12 + uy * 6, y - uy * 12 - ux * 6]];
    return `<line x1="${tx}" y1="${ty}" x2="${x - ux * 8}" y2="${y - uy * 8}" stroke="${color}" stroke-width="5" stroke-linecap="round"/>` +
      `<polygon points="${h.map(p => p.join(',')).join(' ')}" fill="${color}"/>`;
  };

  /* ---------------------------------------------------------------- ESTILOS */
  function injectCSS() {
    if (document.getElementById('msk-style')) return;
    const st = document.createElement('style');
    st.id = 'msk-style';
    st.textContent = `
    .msk-wrap{background:var(--panel);color:var(--ink);padding:10px}
    .msk-row{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px;align-items:center}
    .msk-chip{border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:999px;padding:4px 11px;cursor:pointer;font-size:13px}
    .msk-chip:hover{border-color:var(--brand)}
    .msk-chip.on{background:var(--brand);color:var(--brand-ink);border-color:var(--brand);font-weight:600}
    .msk-chip.seen::after{content:" ✔";color:var(--ok)}
    .msk-chip.on.seen::after{color:var(--brand-ink)}
    .msk-ctl{display:flex;gap:8px;align-items:center;padding:4px 6px;flex-wrap:wrap}
    .msk-ctl input[type=range]{flex:1;min-width:120px}
    .msk-ctl select{padding:3px 6px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--ink)}
    .msk-stat{font-size:13.5px;padding:4px 6px;min-height:40px}
    .msk-card{background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:7px 12px;margin:6px 0;font-size:13.5px}
    .msk-card p{margin:3px 0}
    .msk-ok{color:var(--ok);font-weight:600}.msk-warn{color:var(--warn);font-weight:600}.msk-bad{color:var(--bad);font-weight:600}
    .msk-pbar{display:flex;height:26px;border:1px solid var(--line);border-radius:8px;overflow:hidden;position:relative;margin:6px 0 2px;font-size:11.5px}
    .msk-pbar span{display:flex;align-items:center;justify-content:center;white-space:nowrap;overflow:hidden;color:#fff}
    .msk-pbar .mk{position:absolute;top:-1px;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:9px solid #e0a030;margin-left:-6px}
    .msk-tbl{width:100%;border-collapse:collapse;font-size:12.5px}
    .msk-tbl td,.msk-tbl th{border-bottom:1px solid var(--line);padding:2px 4px;text-align:left}
    .msk-grip{cursor:grab}
    `;
    document.head.appendChild(st);
  }

  /* ------------------------------------------------------------ PERSONAS */
  const BASE = (window.NormalEngine && window.NormalEngine.people) || [
    { id: 'p1', age: 28, sex: 'F', diag: 'Examen normal', complaint: 'Persona sana, control de salud anual. Sin síntomas.', vitals: 'FC 70 · PA 112/70 · FR 14 · T 36,6 °C · SpO₂ 98 %', v: { height: 1.64, weight: 58 } },
    { id: 'p2', age: 45, sex: 'M', diag: 'Examen normal', complaint: 'Persona sana, chequeo laboral. Sin síntomas.', vitals: 'FC 74 · PA 122/78 · FR 15 · T 36,7 °C · SpO₂ 98 %', v: { height: 1.76, weight: 77 } },
    { id: 'p3', age: 72, sex: 'M', diag: 'Examen normal', complaint: 'Adulto mayor sano y activo, control rutinario.', vitals: 'FC 68 · PA 132/80 · FR 16 · T 36,4 °C · SpO₂ 96 %', v: { height: 1.68, weight: 72 } },
    { id: 'p4', age: 60, sex: 'F', diag: 'Examen normal', complaint: 'Mujer posmenopáusica sana, control anual.', vitals: 'FC 72 · PA 128/78 · FR 15 · T 36,5 °C · SpO₂ 97 %', v: { height: 1.60, weight: 61 } }
  ];
  /* Datos locomotores por persona (clave = id de NormalEngine.people). f: fracción del rango nominal que alcanza
     (leve descenso fisiológico con la edad, sin dolor); las: elevación de la pierna recta sin dolor (°); schober: cm en flexión;
     fd: distancia dedo-suelo (cm); step: longitud del paso (cm); cad: cadencia (pasos/min); perim: brazo, muslo, pantorrilla (cm). */
  const MSKX = {
    p1: { f: 0.98, las: 90, schober: 17, fd: 0, step: 67, cad: 112, perim: [26, 48, 34] },
    p2: { f: 0.96, las: 85, schober: 16, fd: 5, step: 72, cad: 108, perim: [31, 52, 37] },
    p3: { f: 0.92, las: 75, schober: 15.5, fd: 8, step: 62, cad: 104, perim: [29, 47, 34] },
    p4: { f: 0.95, las: 80, schober: 16, fd: 4, step: 63, cad: 110, perim: [27, 49, 35] }
  };
  const MSK_DEFAULT = { f: 0.95, las: 80, schober: 16, fd: 4, step: 65, cad: 108, perim: [28, 49, 35] };
  const mskOf = p => {
    const base = MSKX[p.id] || Object.assign({}, MSK_DEFAULT, { f: p.age >= 65 ? 0.92 : 0.95, las: p.age >= 65 ? 75 : 80 });
    return Object.assign({}, base);   // copia: `sim` se calcula por persona
  };
  const CASES = BASE.map(p => Object.assign({}, p, { msk: mskOf(p) }));

  /* --------------------------------------------------- CATÁLOGO DE MOVIMIENTOS */
  const MOT = {};
  const JOINTS = [
    { id: 'sh', n: 'Hombro', m: ['sh.flex', 'sh.ext', 'sh.abd', 'sh.er', 'sh.ir'] },
    { id: 'el', n: 'Codo', m: ['el.flex', 'el.pro', 'el.sup'] },
    { id: 'wr', n: 'Muñeca', m: ['wr.flex', 'wr.ext', 'wr.rad', 'wr.uln'] },
    { id: 'hi', n: 'Cadera', m: ['hi.flex', 'hi.ext', 'hi.abd', 'hi.add', 'hi.er', 'hi.ir'] },
    { id: 'kn', n: 'Rodilla', m: ['kn.flex', 'kn.ext'] },
    { id: 'an', n: 'Tobillo', m: ['an.dorsi', 'an.plantar'] },
    { id: 'ne', n: 'Cuello', m: ['ne.flex', 'ne.ext', 'ne.rot', 'ne.lat'] },
    { id: 'lu', n: 'Columna lumbar', m: ['lu.flex', 'lu.ext', 'lu.lat', 'lu.rot'] }
  ];
  /* D(): registra un movimiento. nmin-nmax = rango normal (si varía según la fuente se usa el rango); tol = hiperextensión tolerable;
     fixed/moving = dibujo; lab = rótulos del segmento fijo [[x, y, texto, anchor]]; mlab = rótulo del segmento móvil (se mantiene derecho). */
  function D(o) {
    o.tol = o.tol || 0;
    if (o.nmin == null) o.nmin = o.nmax;
    if (!o.smax) o.smax = o.nmax + (o.nmax >= 100 ? 15 : 12);
    o.rng = o.nmin < o.nmax ? `${o.nmin}-${o.nmax}°` : `0-${o.nmax}°`;
    MOT[o.id] = o;
    return o;
  }
  const hand = (x, y) => ball(x, y, 15);
  /* cabeza + cuello sobre un tronco (el tronco se dibuja después y cubre la base del cuello) */
  const headNeck = (x, y, r, nose) => cap(x - (nose ? 6 : 0), y + r - 4, x, y + r + 30, 24) + headS(x, y, r, nose);

  /* Hombro */
  const shSideFix = headNeck(258, 108, 30, 1) + cap(250, 165, 250, 396, 72) +
    `<text x="250" y="300" text-anchor="middle" class="svg-small">tronco</text>`;
  const shArm = limb(250, 195, 90, 172, 28) + hand(250, 369);
  D({ id: 'sh.flex', j: 'sh', n: 'Flexión de hombro', plane: 'Plano sagital · vista lateral', nmax: 180, dir: -1, na: 90, px: 250, py: 195, ml: 172, fa: 90, fl: 200,
    fixed: shSideFix, moving: shArm, mlab: [274, 292, 'brazo'],
    ef: 'firme (tensión capsular y de los extensores del hombro)',
    tech: 'Eje: acromion. Brazo fijo: línea axilar media del tronco. Brazo móvil: epicóndilo lateral del húmero. Eleva el brazo hacia delante con el pulgar arriba.' });
  D({ id: 'sh.ext', j: 'sh', n: 'Extensión de hombro', plane: 'Plano sagital · vista lateral', nmin: 50, nmax: 60, dir: 1, na: 90, px: 250, py: 195, ml: 172, fa: 90, fl: 200,
    fixed: shSideFix, moving: shArm, mlab: [274, 292, 'brazo'],
    ef: 'firme (cápsula anterior y ligamento coracohumeral)',
    tech: 'Mismos puntos de referencia; lleva el brazo hacia atrás sin inclinar el tronco ni elevar el hombro.' });
  D({ id: 'sh.abd', j: 'sh', n: 'Abducción de hombro', plane: 'Plano frontal · vista anterior', nmax: 180, dir: -1, na: 90, px: 310, py: 195, ml: 172, fa: 90, fl: 200,
    fixed: headNeck(250, 108, 30, 0) + cap(250, 165, 250, 396, 112) + limb(190, 195, 90, 172, 28) + hand(190, 369) +
      `<text x="250" y="300" text-anchor="middle" class="svg-small">tronco</text><text x="166" y="292" text-anchor="end" class="svg-small">brazo contralateral</text>`,
    moving: limb(310, 195, 90, 172, 28) + hand(310, 369), mlab: [334, 292, 'brazo'],
    ef: 'firme (cápsula y ligamento glenohumeral inferior); al final, duro (troquíter contra el acromion)',
    tech: 'Eje: cara anterior del acromion. Fijo: paralelo al esternón. Móvil: línea media del húmero. Los últimos 60° requieren rotación externa y el ritmo escapulohumeral: 120° glenohumeral + 60° escapulotorácico.' });
  const shAx = (n, dir, nmax) => ({
    plane: 'Plano transversal · vista desde arriba (codo a 90°)', nmax, dir, na: -90, px: 300, py: 230, ml: 170, fa: 90, fl: 0,
    fixed: oval(130, 230, 100, 62, SK2) + ball(130, 230, 28, '#e8c7a5') +
      `<text x="130" y="234" text-anchor="middle" class="svg-small">cabeza</text><text x="130" y="312" text-anchor="middle" class="svg-small">tronco (visto desde arriba)</text>` +
      ball(300, 230, 26) + `<text x="300" y="274" text-anchor="middle" class="svg-small">brazo vertical (corte)</text>` +
      `<text x="440" y="70" class="svg-small">↑ adelante</text>`,
    moving: limb(300, 230, -90, 150, 28) + ball(300, 70, 15), mlab: [322, 150, 'antebrazo'],
    ef: nmax === 90 ? 'firme (cápsula anterior y ligamentos glenohumerales)' : 'firme (cápsula posterior)',
    tech: 'Codo a 90° pegado al tronco (o hombro a 90° en decúbito supino). Eje: olécranon. Fijo: perpendicular al plano del tronco. Móvil: antebrazo hasta la estiloides cubital. ' +
      (dir > 0 ? 'La rotación externa lleva la mano hacia fuera.' : 'La rotación interna lleva la mano hacia el abdomen.')
  });
  D(Object.assign({ id: 'sh.er', j: 'sh', n: 'Rotación externa de hombro', nmin: 80 }, shAx('er', 1, 90)));
  D(Object.assign({ id: 'sh.ir', j: 'sh', n: 'Rotación interna de hombro' }, shAx('ir', -1, 70)));

  /* Codo */
  D({ id: 'el.flex', j: 'el', n: 'Flexión de codo', plane: 'Plano sagital · vista lateral', nmin: 140, nmax: 150, dir: -1, na: 0, px: 300, py: 200, ml: 170, fa: 180, fl: 200,
    fixed: cap(70, 120, 70, 330, 60, SK2) + limb(300, 200, 180, 200, 36) + ball(100, 200, 24) +
      `<text x="70" y="366" text-anchor="middle" class="svg-small">tronco</text><text x="100" y="166" text-anchor="middle" class="svg-small">hombro</text><text x="200" y="240" text-anchor="middle" class="svg-small">brazo</text>`,
    moving: limb(300, 200, 0, 150, 32) + oval(470, 200, 24, 17), mlab: [380, 178, 'antebrazo'],
    ef: 'blando (aproximación de las masas musculares del brazo y del antebrazo)',
    tech: 'Eje: epicóndilo lateral. Fijo: hacia el acromion. Móvil: hacia la estiloides radial. Parte de 0° (extensión completa) y flexiona hasta tocar el hombro con la mano.' });
  const pron = (dir, n) => ({
    plane: 'Plano transversal · vista desde la mano (antebrazo derecho, codo a 90°)', nmin: 80, nmax: 90, dir, na: -90, px: 280, py: 205, ml: 100, fa: 90, fl: 0,
    fixed: ball(280, 205, 80) + `<circle cx="262" cy="205" r="9" fill="#e8c7a5"/><circle cx="296" cy="205" r="7" fill="#e8c7a5"/>` +
      `<text x="280" y="310" text-anchor="middle" class="svg-small">puño visto de frente (el antebrazo apunta hacia ti)</text>`,
    moving: cap(280, 205, 280, 110, 34, SK2) + ball(280, 98, 14) + `<rect x="250" y="120" width="12" height="62" rx="6" fill="#c98f6b"/>` +
      `<text x="238" y="154" text-anchor="end" class="svg-small">palma</text>`, mlab: [304, 150, 'pulgar y lápiz'],
    ef: 'firme (ligamentos radiocubitales y membrana interósea)',
    tech: 'Codo a 90° pegado al tronco, pulgar hacia arriba (0°). Eje: extremo del tercer dedo. Móvil: un lápiz sostenido en el puño. ' + (dir > 0 ? 'Supinación: la palma mira hacia arriba.' : 'Pronación: la palma mira hacia abajo.')
  });
  D(Object.assign({ id: 'el.pro', j: 'el', n: 'Pronación del antebrazo' }, pron(-1)));
  D(Object.assign({ id: 'el.sup', j: 'el', n: 'Supinación del antebrazo' }, pron(1)));

  /* Muñeca */
  const wrFix = limb(280, 200, 180, 200, 42) + `<text x="180" y="236" text-anchor="middle" class="svg-small">antebrazo</text>`;
  const wrMov = limb(280, 200, 0, 95, 46) + limb(375, 200, 0, 78, 28);
  D({ id: 'wr.flex', j: 'wr', n: 'Flexión de muñeca', plane: 'Plano sagital · vista lateral', nmin: 60, nmax: 80, dir: 1, na: 0, px: 280, py: 200, ml: 170, fa: 180, fl: 200,
    fixed: wrFix, moving: wrMov, mlab: [330, 174, 'mano'], ef: 'firme (ligamentos radiocarpianos dorsales)',
    tech: 'Eje: estiloides cubital. Fijo: a lo largo del cúbito. Móvil: quinto metacarpiano. Antebrazo apoyado, mano libre; se mide con la palma hacia abajo.' });
  D({ id: 'wr.ext', j: 'wr', n: 'Extensión de muñeca', plane: 'Plano sagital · vista lateral', nmin: 60, nmax: 70, dir: -1, na: 0, px: 280, py: 200, ml: 170, fa: 180, fl: 200,
    fixed: wrFix, moving: wrMov, mlab: [330, 174, 'mano'], ef: 'firme (ligamentos palmares); a veces duro por contacto óseo',
    tech: 'Mismos puntos de referencia; la mano se lleva hacia el dorso del antebrazo.' });
  const wrDev = (dir, nmax, n) => ({
    plane: 'Plano frontal · vista dorsal de la mano', nmax, dir, na: 0, px: 280, py: 200, ml: 170, fa: 180, fl: 200,
    fixed: wrFix, moving: wrMov + limb(318, 184, -38, 62, 18), mlab: [330, 174, 'mano (dorso)'],
    ef: dir < 0 ? 'duro (contacto óseo entre el escafoides y la estiloides radial)' : 'firme (ligamento colateral radial del carpo)',
    tech: 'Eje: dorso de la muñeca sobre el hueso grande (capitato). Fijo: línea media del antebrazo. Móvil: tercer metacarpiano. ' + (dir < 0 ? 'Desviación radial: la mano se acerca al lado del pulgar (arriba en el dibujo).' : 'Desviación cubital: hacia el meñique.')
  });
  D(Object.assign({ id: 'wr.rad', j: 'wr', n: 'Desviación radial' }, wrDev(-1, 20)));
  D(Object.assign({ id: 'wr.uln', j: 'wr', n: 'Desviación cubital', nmin: 30 }, wrDev(1, 35)));

  /* Cadera */
  const hiFix = cap(230, 120, 230, 10, 82) + `<text x="230" y="70" text-anchor="middle" class="svg-small">tronco</text>`;
  const hiBent = limb(230, 120, 90, 120, 48) + limb(230, 240, 180, 115, 38) + oval(104, 246, 14, 22);
  const hiStr = limb(230, 120, 90, 120, 48) + limb(230, 240, 90, 112, 38) + oval(246, 366, 26, 11);
  D({ id: 'hi.flex', j: 'hi', n: 'Flexión de cadera', plane: 'Plano sagital · vista lateral (rodilla flexionada)', nmin: 110, nmax: 120, dir: -1, na: 90, px: 230, py: 120, ml: 150, fa: -90, fl: 110,
    fixed: hiFix, moving: hiBent, mlab: [258, 184, 'muslo'], ef: 'blando (el muslo contacta con el abdomen)',
    tech: 'Decúbito supino con la rodilla flexionada. Eje: trocánter mayor. Fijo: línea axilar media. Móvil: cóndilo femoral lateral. El otro muslo debe permanecer plano sobre la camilla.' });
  D({ id: 'hi.ext', j: 'hi', n: 'Extensión de cadera', plane: 'Plano sagital · vista lateral (rodilla extendida)', nmin: 20, nmax: 30, dir: 1, na: 90, px: 230, py: 120, ml: 150, fa: -90, fl: 110,
    fixed: hiFix, moving: hiStr, mlab: [258, 184, 'muslo'], ef: 'firme (ligamento iliofemoral)',
    tech: 'Decúbito prono o de pie; la pelvis debe permanecer fija (evitar la hiperlordosis lumbar). Eleva el muslo hacia atrás con la rodilla extendida.' });
  const hiFr = limb(205, 120, 90, 230, 46) + oval(205, 360, 24, 11) + cap(250, 115, 250, 15, 130) +
    `<text x="250" y="70" text-anchor="middle" class="svg-small">pelvis y tronco</text><text x="172" y="250" text-anchor="end" class="svg-small">miembro contralateral</text>`;
  const hiLeg = limb(295, 120, 90, 230, 46) + oval(295, 360, 24, 11);
  D({ id: 'hi.abd', j: 'hi', n: 'Abducción de cadera', plane: 'Plano frontal · vista anterior', nmax: 45, dir: -1, na: 90, px: 295, py: 120, ml: 230, fa: -90, fl: 100,
    fixed: hiFr, moving: hiLeg, mlab: [322, 210, 'muslo'], ef: 'firme (ligamento pubofemoral y aductores)',
    tech: 'Decúbito supino. Eje: espina ilíaca anterosuperior. Fijo: línea que une ambas EIAS. Móvil: línea media del muslo (hacia la rótula). Pelvis fija, rodilla extendida.' });
  D({ id: 'hi.add', j: 'hi', n: 'Aducción de cadera', plane: 'Plano frontal · vista anterior', nmin: 20, nmax: 30, dir: 1, na: 90, px: 295, py: 120, ml: 230, fa: -90, fl: 100,
    fixed: hiFr, moving: hiLeg, mlab: [322, 210, 'muslo'], ef: 'blando (aproximación de las partes blandas del muslo)',
    tech: 'Se cruza el miembro por delante del contralateral (elevándolo ligeramente) con la pelvis estable.' });
  const hiRot = (dir) => ({
    plane: 'Plano transversal · vista desde arriba (cadera y rodilla a 90°)', nmin: dir > 0 ? 45 : 35, nmax: 45, dir, na: 90, px: 320, py: 130, ml: 190, fa: -90, fl: 100,
    fixed: oval(190, 110, 130, 90, SK2) + `<line x1="190" y1="10" x2="190" y2="390" stroke="#7f8c9a" stroke-width="2" stroke-dasharray="6 5"/>` +
      `<text x="196" y="388" class="svg-small">línea media</text><text x="110" y="116" text-anchor="middle" class="svg-small">pelvis</text>` +
      ball(320, 130, 36, '#e8c7a5') + `<text x="320" y="82" text-anchor="middle" class="svg-small">rodilla (muslo vertical)</text>`,
    moving: limb(320, 130, 90, 190, 36) + oval(320, 342, 18, 28), mlab: [344, 232, 'pierna'],
    ef: 'firme (ligamentos de la cápsula: ' + (dir > 0 ? 'anteriores)' : 'posteriores)'),
    tech: 'Supino (o sentado) con cadera y rodilla a 90°. Eje: rótula. Fijo: vertical. Móvil: cresta tibial. ' +
      (dir > 0 ? 'En la rotación externa de cadera el pie se desplaza hacia la línea media.' : 'En la rotación interna de cadera el pie se desplaza hacia fuera (lateral).')
  });
  D(Object.assign({ id: 'hi.er', j: 'hi', n: 'Rotación externa de cadera', rot: 1 }, hiRot(1)));
  D(Object.assign({ id: 'hi.ir', j: 'hi', n: 'Rotación interna de cadera' }, hiRot(-1)));

  /* Rodilla */
  const knFix = limb(250, 170, -90, 160, 54) + `<text x="286" y="96" class="svg-small">muslo</text>`;
  const knMov = limb(250, 170, 90, 150, 42) + limb(238, 326, 0, 68, 28);
  D({ id: 'kn.flex', j: 'kn', n: 'Flexión de rodilla', plane: 'Plano sagital · vista lateral', nmin: 130, nmax: 140, dir: 1, na: 90, px: 250, py: 170, ml: 150, fa: -90, fl: 160,
    fixed: knFix, moving: knMov, mlab: [278, 252, 'pierna'], ef: 'blando (la pantorrilla contacta con el muslo)',
    tech: 'Decúbito prono o supino. Eje: epicóndilo femoral lateral. Fijo: trocánter mayor. Móvil: maléolo lateral. El talón se acerca al glúteo.' });
  D({ id: 'kn.ext', j: 'kn', n: 'Extensión de rodilla', plane: 'Plano sagital · vista lateral', nmax: 0, tol: 5, smax: 15, dir: -1, na: 90, px: 250, py: 170, ml: 150, fa: -90, fl: 160,
    fixed: knFix, moving: knMov, mlab: [278, 252, 'pierna'], ef: 'firme (ligamentos cruzados y cápsula posterior)',
    tech: 'La posición neutra es 0° (pierna alineada con el muslo). Una hiperextensión de 0-5° puede ser fisiológica, sobre todo en mujeres jóvenes; más allá sugiere genu recurvatum.' });
  D({ id: 'kn.var', j: 'kn', hidden: true, n: 'Estrés en varo/valgo', plane: 'Plano frontal · vista anterior', nmax: 5, dir: 1, na: 90, px: 280, py: 180, ml: 160, fa: -90, fl: 160,
    fixed: limb(280, 180, -90, 160, 56) + `<text x="318" y="100" class="svg-small">muslo</text>`, moving: limb(280, 180, 90, 160, 44) + oval(280, 354, 26, 11), mlab: [308, 262, 'pierna'], ef: 'firme', tech: '' });

  /* Tobillo */
  const anFix = limb(250, 200, -90, 180, 46) + `<text x="282" y="110" class="svg-small">pierna</text>`;
  const anMov = cap(206, 240, 352, 240, 36);
  D({ id: 'an.dorsi', j: 'an', n: 'Dorsiflexión de tobillo', plane: 'Plano sagital · vista lateral', nmax: 20, dir: -1, na: 0, px: 250, py: 200, ml: 130, fa: -90, fl: 180,
    fixed: anFix, moving: anMov, mlab: [330, 276, 'pie'], ef: 'firme (tendón de Aquiles y cápsula posterior)',
    tech: 'Sentado o supino con la rodilla flexionada (relaja los gemelos). Eje: maléolo lateral. Fijo: cabeza del peroné. Móvil: quinto metatarsiano. 0° con el pie a 90° respecto a la pierna.' });
  D({ id: 'an.plantar', j: 'an', n: 'Flexión plantar de tobillo', plane: 'Plano sagital · vista lateral', nmin: 40, nmax: 50, dir: 1, na: 0, px: 250, py: 200, ml: 130, fa: -90, fl: 180,
    fixed: anFix, moving: anMov, mlab: [330, 276, 'pie'], ef: 'firme (cápsula anterior y ligamentos)',
    tech: 'Mismos puntos de referencia; el pie se lleva hacia abajo (puntas de pie).' });

  /* Cuello */
  const neSide = cap(250, 270, 250, 395, 100) + `<text x="250" y="344" text-anchor="middle" class="svg-small">tronco</text>`;
  const neHead = cap(250, 270, 250, 205, 34) + headS(256, 152, 50, 1);
  D({ id: 'ne.flex', j: 'ne', n: 'Flexión cervical', plane: 'Plano sagital · vista lateral', nmin: 45, nmax: 50, dir: 1, na: -90, px: 250, py: 270, ml: 140, fa: 90, fl: 120,
    fixed: neSide, moving: neHead, ef: 'firme (ligamentos y músculos extensores del cuello)',
    tech: 'Sentado con la espalda recta. Eje: conducto auditivo externo (o C7). Fijo: vertical. Móvil: línea hacia la punta de la nariz. Clínicamente: el mentón casi toca el esternón.' });
  D({ id: 'ne.ext', j: 'ne', n: 'Extensión cervical', plane: 'Plano sagital · vista lateral', nmin: 55, nmax: 60, dir: -1, na: -90, px: 250, py: 270, ml: 140, fa: 90, fl: 120,
    fixed: neSide, moving: neHead, ef: 'firme (ligamento longitudinal anterior y músculos flexores)',
    tech: 'Mismos puntos de referencia; el paciente mira al techo sin elevar los hombros.' });
  D({ id: 'ne.lat', j: 'ne', n: 'Inclinación lateral cervical', plane: 'Plano frontal · vista posterior', nmin: 40, nmax: 45, dir: 1, na: -90, px: 250, py: 270, ml: 140, fa: 90, fl: 120,
    fixed: cap(140, 300, 360, 300, 46) + cap(250, 270, 250, 395, 100) + `<text x="392" y="304" class="svg-small">hombro</text><text x="250" y="380" text-anchor="middle" class="svg-small">tronco</text>`,
    moving: cap(250, 270, 250, 205, 34) + headS(250, 152, 50, 0),
    ef: 'firme (músculos y ligamentos laterales)',
    tech: 'Eje: apófisis espinosa de C7. Fijo: vertical (columna). Móvil: línea hacia la protuberancia occipital. La oreja se acerca al hombro sin elevarlo.' });
  D({ id: 'ne.rot', j: 'ne', n: 'Rotación cervical', plane: 'Plano transversal · vista desde arriba', nmin: 70, nmax: 80, dir: 1, na: -90, px: 280, py: 215, ml: 130, fa: 90, fl: 90,
    fixed: cap(110, 320, 450, 320, 62) + `<text x="280" y="366" text-anchor="middle" class="svg-small">hombros (fijos)</text><text x="372" y="219" class="svg-small">cabeza (vista superior)</text>`,
    moving: ball(280, 215, 66) + `<path d="M280 128 l-13 20 l26 0 z" fill="${SK}" stroke="${SD}" stroke-width="2"/>` + oval(213, 215, 8, 18) + oval(347, 215, 8, 18),
    ef: 'firme (cápsulas y ligamentos de las articulaciones atlantoaxoidea y facetarias)',
    tech: 'Sentado. Eje: vértice de la cabeza. Fijo: línea de los acromion. Móvil: nariz. Rotación hacia cada lado ≈ 70-80°: el mentón casi llega al plano del hombro (simétrica).' });

  /* Columna lumbar */
  const luLeg = cap(250, 250, 250, 392, 70) + `<text x="250" y="334" text-anchor="middle" class="svg-small">piernas</text>`;
  D({ id: 'lu.flex', j: 'lu', n: 'Flexión lumbar', plane: 'Plano sagital · vista lateral', nmin: 40, nmax: 60, dir: 1, na: -90, px: 250, py: 250, ml: 150, fa: 90, fl: 130,
    fixed: luLeg, moving: cap(250, 250, 250, 100, 74) + headS(258, 62, 32, 1), mlab: [292, 180, 'tronco'], ef: 'firme (ligamentos posteriores y músculos extensores)',
    tech: 'De pie. Se mide con el goniómetro/inclinómetro (lumbar ≈ 40-60°; la flexión total del tronco, ≈ 90°, añade la de las caderas). Prueba de Schober: 10 → ≥ 15 cm.' });
  D({ id: 'lu.ext', j: 'lu', n: 'Extensión lumbar', plane: 'Plano sagital · vista lateral', nmin: 20, nmax: 30, dir: -1, na: -90, px: 250, py: 250, ml: 150, fa: 90, fl: 130,
    fixed: luLeg, moving: cap(250, 250, 250, 100, 74) + headS(258, 62, 32, 1), mlab: [292, 180, 'tronco'], ef: 'firme (ligamento longitudinal anterior y apófisis articulares)',
    tech: 'De pie con las manos en la cintura; se inclina hacia atrás (extensión lumbar ≈ 20-30°).' });
  D({ id: 'lu.lat', j: 'lu', n: 'Inclinación lateral lumbar', plane: 'Plano frontal · vista posterior', nmin: 25, nmax: 35, dir: 1, na: -90, px: 250, py: 250, ml: 150, fa: 90, fl: 130,
    fixed: luLeg, moving: cap(250, 250, 250, 100, 90) + headS(250, 62, 32, 0), mlab: [300, 180, 'tronco'], ef: 'firme (ligamentos intertransversos y músculos laterales)',
    tech: 'De pie; la mano desliza por la cara lateral del muslo (≈ 25-35° a cada lado, simétrico).' });
  D({ id: 'lu.rot', j: 'lu', n: 'Rotación del tronco', plane: 'Plano transversal · vista desde arriba', nmin: 30, nmax: 45, dir: 1, na: -90, px: 280, py: 215, ml: 140, fa: 90, fl: 90,
    fixed: oval(280, 215, 112, 62, SK2) + `<text x="280" y="296" text-anchor="middle" class="svg-small">pelvis (fija)</text>`,
    moving: cap(180, 215, 380, 215, 50) + `<path d="M280 150 l-13 18 l26 0 z" fill="${SK}" stroke="${SD}" stroke-width="2"/>`, mlab: [330, 178, 'hombros (desde arriba)'],
    ef: 'firme (anillo fibroso y articulaciones interapofisarias)',
    tech: 'Sentado (pelvis fija) o de pie con la pelvis estabilizada; los hombros rotan 30-45° a cada lado (la rotación lumbar pura es mucho menor).' });
  /* Elevación de pierna recta (Lasègue) */
  D({ id: 'las', j: 'lu', hidden: true, n: 'Elevación de la pierna recta (Lasègue)', plane: 'Decúbito supino · vista lateral', nmin: 70, nmax: 90, dir: -1, na: 0, px: 250, py: 255, ml: 230, fa: 180, fl: 200, smax: 100,
    bgx: `<rect x="0" y="300" width="560" height="100" fill="#cfd8e2"/>`,
    fixed: limb(250, 255, 0, 230, 46, '#e8c7a5') + limb(250, 255, 180, 190, 70) + ball(40, 250, 28) +
      `<text x="150" y="260" text-anchor="middle" class="svg-small">tronco</text><text x="380" y="296" text-anchor="middle" class="svg-small">miembro contralateral apoyado</text>`,
    moving: limb(250, 255, 0, 220, 44, SK2) + oval(484, 252, 12, 22, SK2), mlab: [360, 226, 'pierna explorada (rodilla extendida)'], ef: 'firme', tech: '' });

  /* Fracciones por persona */
  const activeTope = (m, c) => {
    if (m.nmax === 0) return 0;
    const lo = m.nmin < m.nmax ? m.nmin : Math.round(m.nmax * 0.9);
    return clamp(Math.round(m.nmax * c.msk.f), lo, m.nmax);
  };
  const passiveTope = (m, c) => (m.nmax === 0 ? 0 : Math.min(m.nmax, activeTope(m, c) + 4));

  /* ================================================================ GONIÓMETRO */
  function romView(host, o) {
    host.innerHTML = '<svg class="scene msk-svg" viewBox="0 0 560 400"></svg>' +
      `<div class="msk-ctl"${o.slider === false ? ' style="display:none"' : ''}><span>0°</span><input type="range" min="0" max="100" value="0" step="1" aria-label="Ángulo"><span class="msk-mx"></span></div>` +
      '<div class="msk-stat"></div>';
    const svg = host.querySelector('svg'), rng = host.querySelector('input'), stat = host.querySelector('.msk-stat'), mxl = host.querySelector('.msk-mx');
    let m = null, th = 0, sx = 0, sy = 0, dragging = false, lastLimited = false, running = false, raf = 0, title = '';
    let mv = null, arc = null, ovl = null, rd = null, lbl = null, mvl = null, wedgeOn = true;

    function load(mm, opts) {
      opts = opts || {};
      m = mm; th = 0; sx = 0; sy = 0; lastLimited = false;
      title = opts.title || m.n;
      wedgeOn = opts.wedge !== false && o.learn();
      const ref = P(m.px, m.py, m.na, 140);
      svg.innerHTML = `<rect width="560" height="400" fill="#e8eef4"/>${m.bgx || ''}
        <g>${m.fixed}</g><g id="wedge"></g>
        <line x1="${m.px}" y1="${m.py}" x2="${ref[0]}" y2="${ref[1]}" stroke="#7f8c9a" stroke-width="2" stroke-dasharray="6 5"/>
        <path id="arc" fill="rgba(224,160,48,.28)" stroke="#e0a030" stroke-width="2" d=""/>
        <g id="mv">${m.moving}
          <line x1="${m.px}" y1="${m.py}" x2="${ref[0]}" y2="${ref[1]}" stroke="#e0a030" stroke-width="3.5" stroke-linecap="round"/>
          <circle class="msk-grip" cx="${ref[0]}" cy="${ref[1]}" r="9" fill="#e0a030" stroke="#fff" stroke-width="2"/>
          ${m.mlab ? `<text id="mvl" x="${m.mlab[0]}" y="${m.mlab[1]}" class="svg-small" style="paint-order:stroke;stroke:#e8eef4;stroke-width:3px">${esc(m.mlab[2])}</text>` : ''}</g>
        <circle cx="${m.px}" cy="${m.py}" r="6" fill="#38495a" stroke="#fff" stroke-width="2"/>
        <g id="ovl"></g>
        <text x="16" y="26" class="svg-title">${esc(title)}</text>
        <text x="16" y="44" class="svg-small">${esc(m.plane)}</text>
        <text id="rd" x="544" y="40" text-anchor="end" style="font:700 30px system-ui,sans-serif;fill:#237a4b">0°</text>
        <text id="lbl" x="280" y="388" text-anchor="middle" style="font:600 13px system-ui,sans-serif;fill:#38495a"></text>`;
      mv = svg.querySelector('#mv'); arc = svg.querySelector('#arc'); ovl = svg.querySelector('#ovl'); mvl = svg.querySelector('#mvl');
      rd = svg.querySelector('#rd'); lbl = svg.querySelector('#lbl');
      if (wedgeOn && !m.hidden) drawWedge();
      rng.max = m.smax; rng.value = 0; rng.disabled = false;
      mxl.textContent = m.smax + '°';
      pose(0, 0, 0);
      refreshStat();
    }

    function drawWedge() {
      const R = 95, g = svg.querySelector('#wedge'), tol = m.tol;
      const sector = (a, col) => {
        const s = P(m.px, m.py, m.na, R), e = P(m.px, m.py, m.na + m.dir * a, R);
        return `<path d="M ${m.px} ${m.py} L ${s[0]} ${s[1]} A ${R} ${R} 0 ${a > 180 ? 1 : 0} ${m.dir > 0 ? 1 : 0} ${e[0]} ${e[1]} Z" fill="${col}"/>`;
      };
      let h = sector(m.nmax + tol, 'rgba(35,122,75,.14)');
      if (m.nmin < m.nmax) h += sector(m.nmin, 'rgba(35,122,75,.2)');
      const tick = (a, txt) => {
        const q = P(m.px, m.py, m.na + m.dir * a, R + 18), q2 = P(m.px, m.py, m.na + m.dir * a, R + 4), q3 = P(m.px, m.py, m.na + m.dir * a, R - 12);
        return `<line x1="${q3[0]}" y1="${q3[1]}" x2="${q2[0]}" y2="${q2[1]}" stroke="#237a4b" stroke-width="2"/>` +
          `<text x="${q[0]}" y="${q[1] + 4}" text-anchor="middle" style="font:700 12px system-ui,sans-serif;fill:#237a4b">${txt}°</text>`;
      };
      h += tick(m.nmax, m.nmax);
      if (m.nmin < m.nmax) h += tick(m.nmin, m.nmin);
      g.innerHTML = h;
    }

    function pose(t, x, y) {
      th = t; sx = x || 0; sy = y || 0;
      mv.setAttribute('transform', `rotate(${m.dir * th} ${m.px} ${m.py})` + (sx || sy ? ` translate(${sx} ${sy})` : ''));
      if (mvl) mvl.setAttribute('transform', `rotate(${-m.dir * th} ${m.mlab[0]} ${m.mlab[1]})`);   // el rótulo del segmento móvil se mantiene derecho
      if (Math.abs(th) > 0.4) {
        const R = 95, s = P(m.px, m.py, m.na, R), e = P(m.px, m.py, m.na + m.dir * th, R);
        arc.setAttribute('d', `M ${m.px} ${m.py} L ${s[0]} ${s[1]} A ${R} ${R} 0 ${Math.abs(th) > 180 ? 1 : 0} ${m.dir * th > 0 ? 1 : 0} ${e[0]} ${e[1]} Z`);
      } else arc.setAttribute('d', '');
      rd.textContent = Math.round(th) + '°';
      rd.style.fill = (o.learn() && !m.hidden && th > m.nmax + m.tol + 0.5) ? '#b3372f' : '#237a4b';
      rng.value = th;
    }

    function refreshStat() { if (o.status) stat.innerHTML = o.status(m, th, lastLimited); }

    function setTheta(want) {
      want = clamp(want, 0, m.smax);
      const cp = o.cap(m);
      const t = Math.min(want, cp);
      lastLimited = want > cp + 0.6;
      pose(t, 0, 0);
      refreshStat();
    }

    function drag(e) {
      const p = svgPoint(svg, e);
      const a = deg(Math.atan2(p.y - m.py, p.x - m.px));
      let d = m.dir * (a - m.na);
      d -= 360 * Math.ceil((d - th) / 360 - 0.5);
      setTheta(d);
    }
    const end = () => { if (o.onEnd && m) o.onEnd(m, Math.round(th), lastLimited); };
    svg.addEventListener('pointerdown', e => {
      if (!o.interactive || !m) return;
      dragging = true;
      try { svg.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
      drag(e);
    });
    svg.addEventListener('pointermove', e => { if (dragging) drag(e); });
    const up = () => { if (!dragging) return; dragging = false; end(); };
    svg.addEventListener('pointerup', up);
    svg.addEventListener('pointercancel', up);
    rng.addEventListener('input', () => { if (m) setTheta(+rng.value); });
    rng.addEventListener('change', () => { if (m) end(); });

    /* ---- animación de maniobras ---- */
    const toWorld = pt => {
      const a = rad(m.dir * th), x = pt[0] + sx, y = pt[1] + sy, dx = x - m.px, dy = y - m.py;
      return [m.px + dx * Math.cos(a) - dy * Math.sin(a), m.py + dx * Math.sin(a) + dy * Math.cos(a)];
    };
    const posOf = it => {
      let p;
      if (it.on === 'mov') p = toWorld(P(m.px, m.py, m.na, it.t * m.ml));
      else p = P(m.px, m.py, m.fa, it.t * m.fl);
      return [p[0] + (it.dx || 0), p[1] + (it.dy || 0)];
    };
    function overlay(spec, idx, u, s) {
      let h = '';
      (spec.arrows || []).forEach(it => {
        if ((it.from || 0) > idx) return;
        const p = posOf(it);
        let v;
        if (it.tang) {
          const rx = p[0] - m.px, ry = p[1] - m.py, n = Math.hypot(rx, ry) || 1;
          v = [m.dir * (-ry) / n * it.tang, m.dir * rx / n * it.tang];
        } else if (it.loc) {
          const a = rad(it.on === 'mov' ? m.dir * th : 0);
          v = [it.loc[0] * Math.cos(a) - it.loc[1] * Math.sin(a), it.loc[0] * Math.sin(a) + it.loc[1] * Math.cos(a)];
        } else v = it.v;
        const grow = s && s.resist ? (0.25 + 0.75 * u) : 1;
        const len = 52 * grow;
        h += it.pull ? arrowSvg(p[0] + v[0] / (Math.hypot(v[0], v[1]) || 1) * len, p[1] + v[1] / (Math.hypot(v[0], v[1]) || 1) * len, v[0], v[1], len, '#c0392b')
          : arrowSvg(p[0], p[1], v[0], v[1], len, '#c0392b');
      });
      (spec.marks || []).forEach((it, i) => {
        if ((it.from || 0) > idx) return;
        const p = posOf(it);
        let ring = '';
        if (s && s.pulse && i === 0) { const k = (u * 4) % 1; ring = `<circle cx="${p[0]}" cy="${p[1]}" r="${8 + 22 * k}" fill="none" stroke="#c0392b" stroke-width="3" opacity="${1 - k}"/>`; }
        const left = p[0] + (it.label || '').length * 6.6 + 30 > 548;
        h += ring + `<circle cx="${p[0]}" cy="${p[1]}" r="8" fill="#e0a030" stroke="#fff" stroke-width="2"/>` +
          `<text x="${p[0] + (left ? -14 : 14)}" y="${p[1] - 8}" text-anchor="${left ? 'end' : 'start'}" style="font:600 12.5px system-ui,sans-serif;fill:#38495a;stroke:#e8eef4;stroke-width:4px;paint-order:stroke">${it.icon || ''} ${esc(it.label || '')}</text>`;
      });
      if (s && s.timer) {
        h += `<rect x="150" y="352" width="260" height="10" rx="5" fill="#fff" stroke="#7f8c9a"/><rect x="150" y="352" width="${260 * u}" height="10" rx="5" fill="#e0a030"/>` +
          `<text x="280" y="346" text-anchor="middle" style="font:700 13px system-ui,sans-serif;fill:#38495a">${Math.round(u * s.timer)} / ${s.timer} s</text>`;
      }
      ovl.innerHTML = h;
      lbl.textContent = (s && s.label) || '';
    }
    function stop() { running = false; cancelAnimationFrame(raf); }
    function play(spec, speed, done) {
      stop();
      load(MOT[spec.motion], { title: spec.title, wedge: false });
      rng.disabled = true;
      let idx = 0, t0 = performance.now();
      running = true;
      pose(spec.start || 0, 0, 0);
      const frame = now => {
        if (!running) return;
        const s = spec.steps[idx], dur = Math.max(1, (s.ms || 600) * (speed || 1));
        const u = clamp((now - t0) / dur, 0, 1), e = ease(u);
        pose(s.th ? lerp(s.th[0], s.th[1], e) : th, s.sx ? lerp(s.sx[0], s.sx[1], e) : sx, s.sy ? lerp(s.sy[0], s.sy[1], e) : sy);
        overlay(spec, idx, u, s);
        if (u >= 1) {
          idx++; t0 = now;
          if (idx >= spec.steps.length) { running = false; if (done) done(); return; }
        }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    }

    return {
      load, play, stop, pose,
      setTheta: v => { if (m) setTheta(v); },
      recap: () => { if (m) { setTheta(th); } },
      refresh: () => { if (m) { const t = th; load(m, { title }); setTheta(t); } },
      get m() { return m; },
      get th() { return th; },
      destroy: () => { stop(); }
    };
  }

  /* ============================================================ TRENDELENBURG */
  function trendView(host, o) {
    host.innerHTML = `<div class="msk-row"><button class="msk-chip" data-s="L">Levantar la pierna izquierda (apoyo derecho)</button>
      <button class="msk-chip" data-s="R">Levantar la pierna derecha (apoyo izquierdo)</button></div>
      <svg class="scene msk-svg" viewBox="0 0 560 400"></svg><div class="msk-stat"></div>`;
    const svg = host.querySelector('svg'), stat = host.querySelector('.msk-stat');
    let lifted = null, u = 0, cancel = null;
    const hipX = { L: 238, R: 322 };   // vista posterior: la derecha del paciente queda a la derecha de la pantalla
    function draw() {
      const tilt = lifted ? (lifted === 'L' ? 2.5 : -2.5) * u : 0;
      const sh = lifted ? (lifted === 'L' ? 6 : -6) * u : 0;           // el tronco se desplaza hacia el lado de apoyo
      const learn = o.learn();
      let legs = '';
      ['L', 'R'].forEach(s => {
        const x = hipX[s];
        if (lifted === s) {
          const lift = 70 * u;
          legs += cap(x, 240, x, 300 - 15 * u, 44) + cap(x, 300 - 15 * u, x, 372 - lift, 36) + oval(x, 386 - lift, 24, 10);
        } else legs += cap(x, 240, x, 372, 44) + oval(x, 386, 26, 11);
      });
      svg.innerHTML = `<rect width="560" height="400" fill="#e8eef4"/>
        <rect x="0" y="392" width="560" height="8" fill="#cfd8e2"/>
        <text x="16" y="26" class="svg-title">Prueba de Trendelenburg · vista posterior</text>
        <text x="16" y="44" class="svg-small">${lifted ? 'Apoyo sobre la pierna ' + (lifted === 'L' ? 'derecha' : 'izquierda') : 'Bipedestación'}</text>
        ${legs}
        <g transform="translate(${sh} 0)">
          ${cap(280, 110, 280, 222, 104)}${headS(280, 52, 28, 0)}${cap(205, 112, 355, 112, 34)}
          <g transform="rotate(${tilt} 280 232)">${cap(222, 232, 338, 232, 36, '#e8c7a5')}
            <circle cx="262" cy="236" r="4" fill="#38495a"/><circle cx="298" cy="236" r="4" fill="#38495a"/></g>
        </g>
        ${learn ? `<line x1="150" y1="232" x2="410" y2="232" stroke="#237a4b" stroke-width="2" stroke-dasharray="6 5"/>
          <text x="418" y="236" style="font:600 12px system-ui,sans-serif;fill:#237a4b">nivel de las crestas ilíacas</text>
          <text x="300" y="206" text-anchor="middle" class="svg-hint">hoyuelos de Venus</text>` : ''}`;
      stat.innerHTML = lifted
        ? (learn ? `<div class="msk-card"><p><b>Trendelenburg negativo:</b> la pelvis del lado levantado se mantiene nivelada o asciende ligeramente (≈ 2-3°) y el tronco se desvía poco hacia el lado de apoyo. Mantén 30 s.</p>
          <p>Abductores del lado de apoyo (glúteo medio y menor, L4-S1, nervio glúteo superior) competentes. Si la pelvis cayera hacia el lado levantado sería positivo (debilidad o dolor de la cadera de apoyo).</p></div>`
          : '<div class="msk-card"><p>Resultado: pelvis nivelada durante 30 s.</p></div>')
        : '<div class="msk-card"><p>Elige la pierna que se levanta (el examinador observa por detrás los hoyuelos de Venus).</p></div>';
      host.querySelectorAll('[data-s]').forEach(b => b.classList.toggle('on', b.dataset.s === lifted));
    }
    host.addEventListener('click', e => {
      const b = e.target.closest('[data-s]'); if (!b) return;
      if (cancel) cancel();
      const s = b.dataset.s;
      if (lifted === s) {
        cancel = U.tween(500, k => { u = 1 - k; draw(); }, () => { lifted = null; u = 0; draw(); });
      } else {
        lifted = s; u = 0;
        cancel = U.tween(1100, k => { u = ease(k); draw(); }, () => {
          if (o.onDone) o.onDone(s);
        });
      }
    });
    draw();
    return { destroy() { if (cancel) cancel(); }, redraw: draw };
  }

  /* =========================================================== CINEMÁTICA DE MARCHA */
  const KNEE = [[0, 4], [0.12, 15], [0.3, 6], [0.42, 7], [0.5, 28], [0.6, 36], [0.73, 62], [0.87, 25], [0.95, 6], [1, 4]];
  const ANK = [[0, 0], [0.08, -5], [0.3, 7], [0.42, 3], [0.5, 3], [0.6, -17], [0.66, -19], [0.75, -4], [0.87, 0], [1, 0]];
  function interp(tb, x) {
    for (let i = 0; i < tb.length - 1; i++) {
      const a = tb[i], b = tb[i + 1];
      if (x >= a[0] && x <= b[0]) return a[1] + (b[1] - a[1]) * ease((x - a[0]) / (b[0] - a[0]));
    }
    return tb[tb.length - 1][1];
  }
  const GMODE = {
    normal: { ha: 1, ank: null, mean: 9, toe: 7 },
    heel: { ha: 0.9, ank: 20, mean: 9, toe: 7 },
    toe: { ha: 0.85, ank: -28, mean: 9, toe: 7 },
    tandem: { ha: 1, ank: null, mean: 9, toe: 0 }
  };
  function makeGait(H, mode, amp) {
    const S = H / 170, TH = 44 * S, SH = 43 * S, FH = 8 * S, FB = 6 * S, FF = 12 * S;
    const cfg = GMODE[mode];
    const hip = ph => cfg.mean + 19 * amp * cfg.ha * Math.cos(2 * Math.PI * ph);
    const knee = ph => interp(KNEE, ph);
    const ankle = ph => (cfg.ank != null ? cfg.ank : interp(ANK, ph));
    function leg(ph) {
      const h = rad(hip(ph)), k = rad(knee(ph)), a = ankle(ph);
      const kx = TH * Math.sin(h), ky = -TH * Math.cos(h);
      const s = h - k;
      const ax = kx + SH * Math.sin(s), ay = ky - SH * Math.cos(s);
      const t = s + rad(a), fx = Math.cos(t), fy = Math.sin(t), nx = Math.sin(t), ny = -Math.cos(t);
      return {
        hip: hip(ph), knee: knee(ph), ank: a, k: [kx, ky], a: [ax, ay],
        heel: [ax + FH * nx - FB * fx, ay + FH * ny - FB * fy],
        toe: [ax + FH * nx + FF * fx, ay + FH * ny + FF * fy]
      };
    }
    const st = { x: 0, anchor: null, prints: [] };
    function pose(phi, rec) {
      const legs = { R: leg(((phi % 1) + 1) % 1), L: leg((((phi + 0.5) % 1) + 1) % 1) };
      const pts = [];
      ['R', 'L'].forEach(f => ['heel', 'toe'].forEach(p => pts.push({ f, p, x: legs[f][p][0], y: legs[f][p][1] })));
      let low = pts[0];
      pts.forEach(q => { if (q.y < low.y) low = q; });
      let a = st.anchor, strike = null;
      if (a) {
        const cur = pts.find(q => q.f === a.f && q.p === a.p);
        if (cur.y > low.y + 0.4) a = null;
      }
      if (!a) {
        const prevFoot = st.anchor ? st.anchor.f : null;
        a = { f: low.f, p: low.p, wx: st.x + low.x };
        if (prevFoot && prevFoot !== low.f && rec) {
          strike = { f: low.f, wx: a.wx };
          st.prints.push(strike);
          if (st.prints.length > 9) st.prints.shift();
        }
        st.anchor = a;
      }
      const cp = pts.find(q => q.f === a.f && q.p === a.p);
      st.x = a.wx - cp.x;
      return { legs, py: -low.y, x: st.x, strike };
    }
    return { pose, st, S };
  }
  function measureStep(H, mode, amp) {
    const g = makeGait(H, mode, amp);
    for (let k = 0; k < 900; k++) g.pose(k * 0.004, true);
    const p = g.st.prints, d = [];
    for (let i = 1; i < p.length; i++) d.push(Math.abs(p[i].wx - p[i - 1].wx));
    return d.length ? d.reduce((a, b) => a + b, 0) / d.length : 0;
  }
  const AMPC = {};
  function ampFor(c, mode) {
    const key = c.id + mode;
    if (AMPC[key]) return AMPC[key];
    const H = c.v.height * 100, step = c.msk.step;
    const target = { normal: step, heel: step * 0.85, toe: step * 0.65, tandem: 30 }[mode];
    let best = 1, bd = 1e9;
    for (let amp = 0.2; amp <= (mode === 'tandem' ? 0.7 : 1.6); amp += 0.02) {
      const d = Math.abs(measureStep(H, mode, amp) - target);
      if (d < bd) { bd = d; best = amp; }
    }
    AMPC[key] = best;
    if (mode === 'normal') c.msk.sim = measureStep(H, mode, best);
    return AMPC[key];
  }
  const GPH = [[0, 0.10, 'Respuesta a la carga (contacto inicial, 0 %)', 'Apoyo · doble apoyo inicial'], [0.10, 0.30, 'Apoyo medio', 'Apoyo · apoyo simple'],
    [0.30, 0.50, 'Apoyo terminal', 'Apoyo · apoyo simple'], [0.50, 0.60, 'Preoscilación (despegue)', 'Apoyo · doble apoyo final'],
    [0.60, 0.73, 'Oscilación inicial', 'Balanceo'], [0.73, 0.87, 'Oscilación media', 'Balanceo'], [0.87, 1.001, 'Oscilación terminal', 'Balanceo']];
  const phaseOf = ph => GPH.find(p => ph >= p[0] && ph < p[1]) || GPH[0];

  /* ================================================================= ESCENAS */
  function pickLabel(m) { return m.n; }
  const MODE_NAME = { active: 'activa', passive: 'pasiva', free: 'libre' };

  /* ---- Escena 1: examen articular (inspección, palpación y movilidad con goniómetro) ---- */
  /* Inspección y palpación normales por articulación (Argente-Álvarez: examen osteoarticular). */
  const INSP = {
    sh: { i: 'Contornos redondeados y simétricos (relieve del deltoides), sin tumefacción, deformidad, eritema ni atrofia; acromion y clavícula alineados; escápulas simétricas.',
      p: 'Sin dolor en la articulación acromioclavicular, la corredera bicipital ni la inserción del supraespinoso (bajo el acromion); sin calor, crepitación ni derrame.' },
    el: { i: 'Eje del codo con valgo fisiológico (≈ 5-15°, mayor en la mujer), sin tumefacción, deformidad ni nódulos en la cara posterior; olécranon y epicóndilos forman un triángulo equilátero en flexión.',
      p: 'Epicóndilo lateral, epitróclea y olécranon indoloros; sin derrame en los recesos paraolecraneanos, sin calor ni crepitación al movilizar.' },
    wr: { i: 'Muñeca y mano sin tumefacción, deformidades ni desviaciones; eminencias tenar e hipotenar conservadas; uñas y piel normales; sin nódulos en las interfalángicas.',
      p: 'Interlínea radiocarpiana, estiloides radial, tabaquera anatómica y articulaciones metacarpofalángicas e interfalángicas indoloras, sin sinovitis (sin engrosamiento blando ni calor) ni crepitación de los tendones.' },
    hi: { i: 'De pie: pelvis nivelada (espinas ilíacas y crestas a la misma altura), sin actitud en flexión ni rotación del miembro; miembros de igual longitud; pliegues glúteos simétricos.',
      p: 'Trocánter mayor, pliegue inguinal (cabeza femoral) y espinas ilíacas indoloros; sin dolor a la presión en la bolsa trocantérea; se percibe el pulso femoral.' },
    kn: { i: 'Alineación normal (ligero valgo fisiológico), sin genu varo, valgo ni recurvatum; rótulas centradas; sin tumefacción, derrame (fondos de saco pararrotulianos visibles) ni atrofia del cuádriceps.',
      p: 'Interlíneas articulares medial y lateral, rótula, tendón rotuliano y tuberosidad tibial indoloros; sin calor, derrame (signo de la onda y peloteo negativos) ni crepitación.' },
    an: { i: 'Tobillos y pies sin edema ni tumefacción; retropié alineado (sin varo ni valgo), arco plantar conservado en carga, dedos sin deformidades (hallux valgus, dedos en martillo).',
      p: 'Maléolos, ligamentos laterales, tendón de Aquiles y fascia plantar indoloros; sin calor ni derrame; pulsos pedio y tibial posterior presentes.' },
    ne: { i: 'Cabeza erguida y centrada, lordosis cervical conservada, sin tortícolis ni asimetría de los hombros.',
      p: 'Apófisis espinosas cervicales (C2 a C7) y musculatura paravertebral y trapecios indoloros, sin contractura.' },
    lu: { i: 'Curvaturas fisiológicas conservadas (ver «Columna y postura»), sin escoliosis ni desviaciones; pelvis nivelada.',
      p: 'Apófisis espinosas lumbares, articulaciones sacroilíacas y musculatura paravertebral indoloras; sin contractura.' }
  };
  function makeRomScene() {
    const sc = {
      label: 'Examen articular y goniometría',
      hint: 'Inspecciona y palpa cada articulación; luego arrastra el segmento (o el deslizador) para medir la movilidad activa, pasiva o libre.',
      tools: [
        { id: 'inspect', icon: '👁️', label: 'Inspección' },
        { id: 'palp', icon: '✋', label: 'Palpación' },
        { id: 'active', icon: '🙋', label: 'Movilidad activa' },
        { id: 'passive', icon: '🤲', label: 'Movilidad pasiva' },
        { id: 'free', icon: '📐', label: 'Goniómetro libre' }
      ],
      mode: 'active',
      enter(stage, sh) {
        this.sh = sh; this.stage = stage; this.mode = 'active';
        stage.innerHTML = '<div class="msk-wrap"><div class="msk-row" id="mJ"></div><div class="msk-row" id="mM"></div><div id="mI" class="msk-stat" style="display:none"></div><div id="mV"></div></div>';
        this.view = romView(stage.querySelector('#mV'), {
          learn: () => sh.mode === 'learn', interactive: true, cap: m => this.capFor(m),
          status: (m, t, l) => this.status(m, t, l), onEnd: (m, t, l) => this.ended(m, t, l)
        });
        stage.addEventListener('click', this._h = e => {
          const j = e.target.closest('[data-j]'), mo = e.target.closest('[data-m]');
          if (j) { const J = JOINTS.find(x => x.id === j.dataset.j); this.pick(J.id, J.m[0]); if (this.isIP()) this.inspect(); }
          else if (mo) this.pick(this.j, mo.dataset.m);
        });
        this.seen = this.seen || {};
        this.pick('sh', 'sh.flex');
      },
      leave() { if (this.view) this.view.destroy(); if (this.stage && this._h) this.stage.removeEventListener('click', this._h); },
      isIP() { return this.mode === 'inspect' || this.mode === 'palp'; },
      setTool(id) {
        this.mode = id;
        const t = { inspect: 'Inspección: elige una articulación; se describe lo que se observa en reposo y comparando ambos lados.',
          palp: 'Palpación: elige una articulación; se buscan dolor, calor, derrame, crepitación y relieves óseos.',
          active: 'Activa: arrastra hasta donde el paciente puede llegar solo (tope activo).', passive: 'Pasiva: el examinador lleva la articulación algo más lejos; nota la sensación terminal.',
          free: 'Goniómetro libre: sin tope del paciente; observa el aviso al sobrepasar el rango normal.' };
        this.sh.hint(t[id]);
        const I = this.stage && this.stage.querySelector('#mI');
        if (this.isIP()) {
          if (I) { I.style.display = ''; I.innerHTML = `<div class="msk-card"><p>${id === 'palp' ? 'Palpación' : 'Inspección'}: haz clic en una articulación (arriba) para ver el hallazgo normal.</p></div>`; }
          return;
        }
        if (I) I.style.display = 'none';
        if (this.view) this.view.recap();
      },
      /* inspección / palpación de la articulación elegida */
      inspect() {
        const sh = this.sh, J = JOINTS.find(x => x.id === this.j), txt = INSP[this.j][this.mode === 'palp' ? 'p' : 'i'];
        const I = this.stage.querySelector('#mI');
        const what = this.mode === 'palp' ? 'Palpación' : 'Inspección';
        I.style.display = '';
        I.innerHTML = `<div class="msk-card"><p><b>${what} · ${esc(J.n)}:</b> ${esc(txt)}</p>${sh.mode === 'learn' ? '<p style="color:var(--muted)">Orden del examen osteoarticular: inspección → palpación → movilidad activa → movilidad pasiva (goniometría) → maniobras especiales; siempre comparando con el lado contrario.</p>' : ''}</div>`;
        sh.log(`<b>${what} · ${esc(J.n)}:</b> ${esc(txt)}`, 'find');
        sh.explored(`rom:${this.mode}:${this.j}`);
      },
      refresh() { if (this.view) { this.view.refresh(); this.draw(); } },
      pick(j, mid) {
        this.j = j; this.mid = mid;
        this.draw();
        this.view.load(MOT[mid]);
      },
      draw() {
        const J = JOINTS.find(x => x.id === this.j), st = this.stage;
        st.querySelector('#mJ').innerHTML = JOINTS.map(x => `<button class="msk-chip${x.id === this.j ? ' on' : ''}" data-j="${x.id}">${x.n}</button>`).join('');
        st.querySelector('#mM').innerHTML = J.m.map(id => `<button class="msk-chip${id === this.mid ? ' on' : ''}" data-m="${id}">${esc(MOT[id].n.replace(/ de (hombro|codo|muñeca|cadera|rodilla|tobillo)$/, ''))}</button>`).join('');
      },
      capFor(m) {
        const c = this.sh.case;
        if (this.mode === 'free') return m.smax;
        return this.mode === 'passive' ? passiveTope(m, c) : activeTope(m, c);
      },
      status(m, t, limited) {
        const sh = this.sh, c = sh.case, learn = sh.mode === 'learn', mode = this.isIP() ? 'active' : this.mode;
        const A = activeTope(m, c), Pp = passiveTope(m, c);
        const over = t > m.nmax + m.tol + 0.5;
        if (!learn) {
          return `<p>Ángulo medido: <b>${Math.round(t)}°</b>${limited ? ' · el paciente no puede avanzar más.' : ''}</p>`;
        }
        const note = { active: 'Movilidad activa: el paciente mueve por sí mismo (explora arco, fuerza y dolor).', passive: 'Movilidad pasiva: mueve el examinador con el paciente relajado (explora cápsula, ligamentos y sensación terminal).', free: 'Libre: sin tope; puedes superar el rango para ver el aviso.' }[mode];
        let msg;
        if (over) msg = `<span class="msk-bad">⚠ Excede el rango normal (${m.rng}${m.tol ? ' + ' + m.tol + '° tolerables' : ''}): hipermovilidad (p. ej., laxitud ligamentaria) o maniobra forzada con riesgo de lesión.</span>`;
        else if (limited) msg = `<span class="msk-warn">Tope ${MODE_NAME[mode]} alcanzado: ${mode === 'passive' ? Pp : A}°.</span> ${mode === 'active' ? `Prueba la movilidad pasiva: llega a ${Pp}° con ayuda del examinador (normalmente la pasiva supera a la activa en pocos grados).` : `Sensación terminal: ${esc(m.ef)}. Sin dolor ni crepitación.`}`;
        else msg = `<span class="msk-ok">Dentro del rango normal</span> (${m.rng}${m.tol ? ', hasta ' + m.tol + '° de hiperextensión fisiológica' : ''}).`;
        return `<div class="msk-card"><p><b>${esc(m.n)}:</b> ${Math.round(t)}° · normal <b>${m.rng}</b>${m.nmin < m.nmax ? ' (rango según la fuente)' : ''}</p><p>${msg}</p>
          <p style="color:var(--muted)">${note} Esta persona (${sh.case.age} años) alcanza: activo ${A}°, pasivo ${Pp}° (normal para su edad, simétrico y sin dolor).</p>
          <p style="color:var(--muted)"><b>Técnica:</b> ${esc(m.tech)}</p></div>`;
      },
      ended(m, t, limited) {
        if (t < 3 && !(m.nmax === 0 && limited)) return;   // la extensión de rodilla «normal» es 0°: se registra al intentar sobrepasarla
        const sh = this.sh, mode = this.isIP() ? 'active' : this.mode;
        const J = JOINTS.find(x => x.id === m.j);
        if (sh.mode === 'learn') {
          const over = t > m.nmax + m.tol + 0.5;
          sh.log(`<b>${esc(J.n)} · ${esc(m.n)} (${MODE_NAME[mode]}):</b> ${t}° · normal ${m.rng}${over ? ' · <b>excede el rango</b>' : limited ? ' · tope alcanzado' : ' · dentro del rango'}.`, over ? 'warn' : 'find');
        } else sh.log(`${esc(m.n)} (${MODE_NAME[mode]}): ${t}°.`);
        if (mode !== 'free') sh.explored(`rom:${mode}:${m.id}`);
      }
    };
    return sc;
  }

  /* ---- Escena 2: columna y postura ---- */
  const LEVELS = (() => {
    const a = ['C7'];
    for (let i = 1; i <= 12; i++) a.push('T' + i);
    for (let i = 1; i <= 5; i++) a.push('L' + i);
    a.push('S1', 'S2');
    return a;
  })();
  const LEVEL_NOTE = {
    C7: ' (vértebra prominente: la espinosa más saliente al flexionar el cuello)', T3: ' (a la altura de la espina de la escápula)',
    T7: ' (a la altura del ángulo inferior de la escápula)', T12: ' (a la altura de la 12.ª costilla)',
    L4: ' (a la altura de la línea intercrestal de Tuffier/Jacoby)', L5: ' (justo por debajo de la línea intercrestal)',
    S2: ' (a la altura de las espinas ilíacas posterosuperiores: hoyuelos de Venus)'
  };
  const SPINE_PTS = [[268, 82], [276, 118], [272, 150], [262, 182], [248, 214], [240, 250], [238, 290], [246, 332], [262, 362], [272, 390], [264, 418], [246, 446], [252, 482]];

  function makeColScene() {
    const sc = {
      label: 'Columna y postura',
      hint: '',
      tools: [
        { id: 'look', icon: '👁️', label: 'Inspección de la postura' },
        { id: 'plumb', icon: '📐', label: 'Plomada y niveles' },
        { id: 'palp', icon: '✋', label: 'Palpación y percusión' },
        { id: 'schober', icon: '📏', label: 'Prueba de Schober' },
        { id: 'lasegue', icon: '🦵', label: 'Signo de Lasègue' },
        { id: 'finger', icon: '🙇', label: 'Distancia dedo-suelo' }
      ],
      enter(stage, sh) {
        this.sh = sh; this.stage = stage; this.tool = null;
        stage.innerHTML = '<div class="msk-wrap" id="cW"></div>';
      },
      leave() { this.cleanup(); },
      cleanup() {
        if (this.view) { this.view.destroy(); this.view = null; }
        if (this.ctl) { this.ctl(); this.ctl = null; }
      },
      setTool(id) { this.tool = id; this.render(); },
      refresh() { this.render(); },
      render() {
        if (!this.stage) return;
        this.cleanup();
        const id = this.tool;
        if (id === 'schober') this.drawSchober();
        else if (id === 'lasegue') this.drawLas();
        else if (id === 'finger') this.drawFinger();
        else this.drawPosture(id);
        const hints = {
          look: 'Inspección: haz clic sobre las curvaturas (vista lateral) o sobre hombros, escápulas y crestas ilíacas (vista posterior).',
          plumb: 'Plomada: observa la alineación desde C7 hasta el pliegue interglúteo y la línea lateral por el meato, hombro, trocánter y maléolo.',
          palp: 'Palpación: haz clic sobre la línea de las apófisis espinosas (cada nivel) y sobre la musculatura paravertebral.',
          schober: 'Schober: marca la unión lumbosacral (línea de los hoyuelos de Venus) y flexiona el tronco con el deslizador.',
          lasegue: 'Lasègue: arrastra la pierna extendida del paciente (decúbito supino) hasta que aparezca la tensión posterior del muslo.',
          finger: 'Distancia dedo-suelo: inclina el tronco (arrastra o usa el deslizador) con las rodillas extendidas.'
        };
        this.sh.hint(hints[id] || '');
      },
      /* --- postura --- */
      drawPosture(tool) {
        const sh = this.sh, c = sh.case, learn = sh.mode === 'learn', showPl = tool === 'plumb' || learn;
        const W = this.stage.querySelector('#cW');
        const spine = smooth(SPINE_PTS);
        const lat = `<g>
          ${headS(272, 52, 30, 1)}${cap(268, 80, 266, 112, 24)}
          ${cap(262, 118, 262, 300, 70, SK2)}${limb(264, 300, 90, 112, 52)}${limb(268, 410, 90, 108, 40)}${oval(286, 536, 36, 11)}
          <path d="${spine}" fill="none" stroke="#7a4a2a" stroke-width="6" stroke-linecap="round" opacity=".85"/>
          ${SPINE_PTS.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#f4e7d8" stroke="#7a4a2a" stroke-width="1.5"/>`).join('')}</g>`;
        const levels = LEVELS.map((n, i) => `<line x1="563" x2="577" y1="${100 + 10 * i}" y2="${100 + 10 * i}" stroke="#7a4a2a" stroke-width="3" stroke-linecap="round"/>`).join('');
        const back = `<g>
          ${headS(570, 52, 30, 0)}${cap(570, 80, 570, 110, 26)}${cap(488, 118, 652, 118, 36)}
          ${cap(570, 118, 570, 262, 118, SK2)}${cap(548, 268, 548, 520, 42)}${cap(592, 268, 592, 520, 42)}${cap(530, 262, 610, 262, 30, '#e8c7a5')}
          ${oval(522, 150, 30, 46, '#f0d3b6')}${oval(618, 150, 30, 46, '#f0d3b6')}
          ${levels}
          <circle cx="552" cy="292" r="4" fill="#38495a"/><circle cx="588" cy="292" r="4" fill="#38495a"/>
          <line x1="570" y1="285" x2="570" y2="330" stroke="${SD}" stroke-width="3"/></g>`;
        const guides = showPl ? `
          <line x1="270" y1="20" x2="270" y2="545" stroke="#237a4b" stroke-width="2.5" stroke-dasharray="7 5"/>
          <circle cx="270" cy="56" r="4" fill="#237a4b"/><circle cx="270" cy="124" r="4" fill="#237a4b"/><circle cx="270" cy="300" r="4" fill="#237a4b"/><circle cx="270" cy="410" r="4" fill="#237a4b"/><circle cx="262" cy="515" r="4" fill="#237a4b"/>
          <line x1="570" y1="20" x2="570" y2="345" stroke="#237a4b" stroke-width="2.5" stroke-dasharray="7 5"/>
          <line x1="470" y1="118" x2="672" y2="118" stroke="#2c7be5" stroke-width="2" stroke-dasharray="5 4"/>
          <line x1="470" y1="170" x2="672" y2="170" stroke="#2c7be5" stroke-width="2" stroke-dasharray="5 4"/>
          <line x1="470" y1="260" x2="672" y2="260" stroke="#2c7be5" stroke-width="2" stroke-dasharray="5 4"/>
          <line x1="470" y1="290" x2="672" y2="290" stroke="#2c7be5" stroke-width="2" stroke-dasharray="5 4"/>` : '';
        const labels = learn ? `
          <text x="330" y="150" class="svg-hint">Lordosis cervical</text><text x="330" y="164" class="svg-small">≈ 20-40°</text>
          <text x="118" y="232" class="svg-hint">Cifosis dorsal</text><text x="118" y="246" class="svg-small">≈ 20-45°</text>
          <text x="330" y="372" class="svg-hint">Lordosis lumbar</text><text x="330" y="386" class="svg-small">≈ 40-60°</text>
          <text x="140" y="466" class="svg-hint">Cifosis sacra</text><text x="140" y="480" class="svg-small">(fija)</text>
          <text x="282" y="46" class="svg-small" style="font-size:10px">meato</text><text x="282" y="298" class="svg-small" style="font-size:10px">trocánter</text>
          <text x="684" y="122" class="svg-small" style="font-size:10px" text-anchor="start">hombros</text><text x="684" y="174" class="svg-small" style="font-size:10px">escápulas (T7)</text>
          <text x="684" y="264" class="svg-small" style="font-size:10px">crestas (L4)</text><text x="684" y="294" class="svg-small" style="font-size:10px">hoyuelos</text>
          <text x="570" y="12" text-anchor="middle" class="svg-small">C7 → pliegue interglúteo</text>` : '';
        W.innerHTML = `<svg class="scene" viewBox="0 0 780 560" id="cS" style="cursor:pointer">
          <rect width="780" height="560" fill="#e8eef4"/>
          <text x="190" y="18" text-anchor="middle" class="svg-title">Vista lateral</text><line x1="390" y1="10" x2="390" y2="550" stroke="#cfd8e2" stroke-width="2"/>
          <text x="570" y="0" class="svg-small"></text>
          ${lat}${back}${guides}${labels}
          <g id="hits">
            <rect data-r="cerv" x="238" y="75" width="80" height="85" fill="transparent"/>
            <rect data-r="dors" x="195" y="165" width="80" height="150" fill="transparent"/>
            <rect data-r="lumb" x="232" y="320" width="80" height="115" fill="transparent"/>
            <rect data-r="sacr" x="215" y="440" width="70" height="60" fill="transparent"/>
            <rect data-r="pl_lat" x="262" y="20" width="16" height="525" fill="transparent"/>
            <rect data-r="paraL" x="518" y="100" width="40" height="185" fill="transparent"/>
            <rect data-r="paraR" x="582" y="100" width="40" height="185" fill="transparent"/>
            <rect data-r="spine" x="556" y="94" width="28" height="212" fill="transparent"/>
            <rect data-r="hombros" x="470" y="104" width="200" height="26" fill="transparent"/>
            <rect data-r="escap" x="480" y="150" width="180" height="40" fill="transparent"/>
            <rect data-r="crestas" x="506" y="248" width="128" height="26" fill="transparent"/>
            <rect data-r="venus" x="530" y="282" width="80" height="20" fill="transparent"/>
            <rect data-r="pl_post" x="563" y="310" width="14" height="40" fill="transparent"/>
          </g></svg>`;
        const svg = W.querySelector('#cS');
        const TX = {
          cerv: 'Lordosis cervical conservada (≈ 20-40°): la cabeza se alinea sobre los hombros, sin proyección anterior del cuello.',
          dors: 'Cifosis dorsal fisiológica (≈ 20-45° de Cobb, T4-T12): curvatura suave, sin giba ni acentuación.',
          lumb: 'Lordosis lumbar conservada (≈ 40-60°, L1-S1): sin hiperlordosis ni rectificación.',
          sacr: 'Cifosis sacrococcígea fija, sin deformidad.',
          pl_lat: 'Plomada lateral: cae por el conducto auditivo externo, el centro del hombro (acromion), el trocánter mayor, justo por detrás de la rótula y ligeramente por delante del maléolo externo.',
          pl_post: 'Plomada posterior: desde C7 cae sobre el pliegue interglúteo; las apófisis espinosas siguen la línea media, sin escoliosis (desviación < 1 cm).',
          hombros: 'Hombros a la misma altura (se tolera ≤ 1 cm: el lado dominante puede quedar algo más bajo); sin elevación ni descenso asimétrico.',
          escap: 'Escápulas simétricas, con los ángulos inferiores a la misma altura (T7), sin escápula alada y con distancia a la línea media similar.',
          crestas: 'Crestas ilíacas al mismo nivel; la línea intercrestal pasa por L4. Pelvis nivelada, sin dismetría de miembros inferiores.',
          venus: 'Hoyuelos de Venus simétricos y a la misma altura (espinas ilíacas posterosuperiores, nivel de S2).'
        };
        const PAL = {
          paraL: 'Musculatura paravertebral izquierda: simétrica, tono normal, sin contractura, sin puntos dolorosos ni nódulos.',
          paraR: 'Musculatura paravertebral derecha: simétrica, tono normal, sin contractura, sin puntos dolorosos ni nódulos.'
        };
        svg.addEventListener('click', e => {
          const g = e.target.closest('[data-r]');
          if (!g) { sh.log('Haz clic sobre una región de la columna o de la postura.', 'warn'); return; }
          const r = g.dataset.r;
          if (this.tool === 'palp') {
            if (r === 'spine') {
              const p = svgPoint(svg, e);
              const i = clamp(Math.round((p.y - 100) / 10), 0, LEVELS.length - 1), lv = LEVELS[i];
              sh.log(`<b>Apófisis espinosa de ${lv}</b>${learn ? (LEVEL_NOTE[lv] || '') : ''}: en la línea media, indolora; la percusión suave con el puño no despierta dolor.`, 'find');
              sh.explored('spine:palp:spine');
            } else if (PAL[r]) { sh.log(PAL[r].replace(/^(.*?):/, '<b>$1:</b>'), 'find'); sh.explored('spine:palp:' + r); }
            else sh.log('Palpa la línea de las apófisis espinosas o los músculos paravertebrales.', 'warn');
          } else {
            if (TX[r]) { sh.log(TX[r], 'find'); sh.explored('spine:look:' + r); }
            else if (PAL[r]) { sh.log(PAL[r], 'find'); sh.explored('spine:look:' + r); }
            else if (r === 'spine') { sh.log('Apófisis espinosas visibles en la línea media, sin escalones ni desviación lateral.', 'find'); sh.explored('spine:look:spine'); }
          }
          // marca visual
          const p = svgPoint(svg, e);
          const ring = el('circle', { cx: p.x, cy: p.y, r: 4, fill: 'none', stroke: '#e0a030', 'stroke-width': 3 }, svg);
          U.tween(450, u => { ring.setAttribute('r', 5 + 20 * u); ring.setAttribute('opacity', 1 - u); }, () => ring.remove());
        });
      },
      /* --- Schober --- */
      drawSchober() {
        const sh = this.sh, c = sh.case, learn = sh.mode === 'learn', D2 = c.msk.schober;
        const W = this.stage.querySelector('#cW');
        W.innerHTML = `<svg class="scene" viewBox="0 0 560 480" id="sS" style="cursor:pointer"><rect width="560" height="480" fill="#e8eef4"/>
          ${cap(240, 60, 240, 470, 190, SK2)}${cap(240, 60, 240, 440, 3, '#7a4a2a')}
          <text x="16" y="26" class="svg-title" style="paint-order:stroke;stroke:#e8eef4;stroke-width:4px">Prueba de Schober · vista posterior de la región lumbar</text>
          ${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<circle cx="240" cy="${425 - i * 48}" r="3" fill="#7a4a2a"/>`).join('')}
          <circle cx="205" cy="425" r="5" fill="#38495a"/><circle cx="275" cy="425" r="5" fill="#38495a"/>
          ${learn ? `<line x1="150" y1="355" x2="330" y2="355" stroke="#2c7be5" stroke-width="2" stroke-dasharray="5 4"/><text x="240" y="349" text-anchor="middle" class="svg-small">línea intercrestal (L4)</text>
            <text x="240" y="456" text-anchor="middle" class="svg-small">hoyuelos de Venus (EIPS)</text>` : ''}
          <g id="mk"></g><g id="tape"></g>
          <g id="hint">${learn ? '<ellipse cx="240" cy="425" rx="52" ry="14" fill="none" stroke="#0e6a78" stroke-width="2" stroke-dasharray="5 4"/><text x="240" y="398" text-anchor="middle" class="svg-hint">marca aquí la unión lumbosacral</text>' : ''}</g>
          <text id="sRead" x="540" y="60" text-anchor="end" style="font:700 22px system-ui,sans-serif;fill:#237a4b"></text></svg>
          <div class="msk-ctl"><span>Flexión del tronco</span><input type="range" id="sSl" min="0" max="100" value="0" disabled><span id="sPct">0 %</span></div>
          <div class="msk-stat" id="sSt"></div>`;
        const svg = W.querySelector('#sS'), sl = W.querySelector('#sSl'), st = W.querySelector('#sSt');
        let placed = false, u = 0;
        const Y1 = 425, PX = 15;
        const redraw = () => {
          const d = 10 + (D2 - 10) * u;
          svg.querySelector('#mk').innerHTML = placed
            ? `<line x1="150" y1="${Y1}" x2="330" y2="${Y1}" stroke="#c0392b" stroke-width="3"/><line x1="150" y1="${Y1 - d * PX}" x2="330" y2="${Y1 - d * PX}" stroke="#c0392b" stroke-width="3"/>
               <text x="146" y="${Y1 - 5}" text-anchor="end" class="svg-small">L5-S1</text>`
            : '';
          svg.querySelector('#tape').innerHTML = placed
            ? `<line x1="360" y1="${Y1}" x2="360" y2="${Y1 - d * PX}" stroke="#e0a030" stroke-width="6"/>` +
              Array.from({ length: Math.floor(d) + 1 }, (_, i) => `<line x1="354" x2="366" y1="${Y1 - i * PX}" y2="${Y1 - i * PX}" stroke="#38495a" stroke-width="2"/>`).join('') +
              `<text x="376" y="${Y1 - d * PX / 2 + 5}" style="font:700 15px system-ui,sans-serif;fill:#38495a">${fmt(d)} cm</text>`
            : '';
          svg.querySelector('#sRead').textContent = placed ? fmt(d) + ' cm' : '';
          W.querySelector('#sPct').textContent = Math.round(u * 100) + ' %';
          if (placed) {
            const ok = d >= 15 - 0.01;
            st.innerHTML = learn
              ? `<div class="msk-card"><p>Distancia entre marcas: <b>${fmt(d)} cm</b> (en bipedestación: 10 cm). Normal: aumenta hasta <b>≥ 15 cm</b> (incremento de al menos 4-5 cm según la fuente).</p>
                 <p>${u > 0.97 ? (ok ? '<span class="msk-ok">Schober normal: ' + fmt(D2) + ' cm en flexión máxima (+' + fmt(D2 - 10) + ' cm).</span>' : '') : 'Flexiona el tronco al máximo con las rodillas extendidas.'}</p>
                 <p style="color:var(--muted)">Schober modificado: marcas 10 cm por encima y 5 cm por debajo de la unión lumbosacral (15 cm); normal ≥ 20 cm. Una cifra menor indica rigidez lumbar (p. ej., espondilitis anquilosante).</p></div>`
              : `<p>Distancia entre marcas: <b>${fmt(d)} cm</b>.</p>`;
          } else st.innerHTML = learn ? '<div class="msk-card"><p>Primero localiza la unión lumbosacral (L5-S1): se toma como referencia la línea que une los hoyuelos de Venus (espinas ilíacas posterosuperiores) o un punto apenas por encima, según la fuente. Haz clic sobre esa zona de la columna.</p></div>' : '<p>Marca el punto de partida.</p>';
        };
        svg.addEventListener('click', e => {
          if (placed) return;
          const p = svgPoint(svg, e);
          if (Math.abs(p.y - Y1) <= 22 && Math.abs(p.x - 240) <= 90) {
            placed = true; sl.disabled = false;
            svg.querySelector('#hint').innerHTML = '';
            sh.log('Schober: marca en la unión lumbosacral y segunda marca 10 cm por encima.', 'find');
          } else sh.log(p.y < Y1 - 22 ? 'La marca está demasiado alta: la unión lumbosacral queda a la altura de los hoyuelos de Venus.' : 'Fuera de la columna lumbosacral.', 'warn');
          redraw();
        });
        sl.addEventListener('input', () => { u = sl.value / 100; redraw(); });
        sl.addEventListener('change', () => {
          if (placed && u > 0.97) { sh.log(learn ? `Schober: 10 → <b>${fmt(D2)} cm</b> en flexión (normal ≥ 15 cm).` : `Schober: distancia en flexión ${fmt(D2)} cm.`, 'find'); sh.explored('spine:schober'); }
        });
        redraw();
      },
      /* --- Lasègue --- */
      drawLas() {
        const sh = this.sh, c = sh.case, learn = sh.mode === 'learn';
        const W = this.stage.querySelector('#cW');
        W.innerHTML = '<div class="msk-row"><button class="msk-chip" id="brg">Dorsiflexión del pie (Bragard)</button></div><div id="lV"></div>';
        const cp = c.msk.las;
        this.view = romView(W.querySelector('#lV'), {
          learn: () => sh.mode === 'learn', interactive: true, cap: () => cp,
          status: (m, t, l) => {
            if (!learn) return `<p>Elevación: <b>${Math.round(t)}°</b>${l ? ' · el paciente refiere tensión y detiene el ascenso.' : ''}</p>`;
            return `<div class="msk-card"><p>Elevación de la pierna recta (signo de Lasègue): <b>${Math.round(t)}°</b> · normal 70-90° sin dolor radicular.</p>
              <p>${l || t >= cp - 0.5 ? `<span class="msk-ok">Lasègue negativo:</span> a ${cp}° solo hay <b>tensión en la cara posterior del muslo</b> (isquiotibiales), sin dolor irradiado por debajo de la rodilla ni hacia la región lumbar o glútea.` : 'Eleva lentamente la pierna extendida (rodilla en extensión, pelvis apoyada); pregunta por dolor y por su localización.'}</p>
              <p style="color:var(--muted)">El Lasègue es positivo si desencadena dolor radicular (L5-S1, nervio ciático) entre 30° y 70° de elevación. Bragard: al bajar unos grados y dorsiflexionar el pie, el dolor reaparece solo si hay compresión radicular.</p></div>`;
          },
          onEnd: (m, t, l) => { if (t >= 5) { sh.log(learn ? `<b>Lasègue:</b> ${t}° sin dolor radicular (tensión isquiotibial a ${cp}°). Negativo.` : `Elevación de la pierna recta: ${t}°.`, 'find'); sh.explored('spine:lasegue'); } }
        });
        this.view.load(MOT.las);
        W.querySelector('#brg').addEventListener('click', () => {
          const t = Math.round(this.view.th);
          if (t < 20) sh.log('Eleva primero la pierna (≈ 40-60°) y luego dorsiflexiona el pie.', 'warn');
          else { sh.log(learn ? '<b>Bragard:</b> la dorsiflexión del pie no reproduce dolor radicular. Negativo.' : 'Dorsiflexión del pie con la pierna elevada: sin dolor.', 'find'); sh.explored('spine:bragard'); }
        });
      },
      /* --- Dedo-suelo --- */
      drawFinger() {
        const sh = this.sh, c = sh.case, learn = sh.mode === 'learn';
        const W = this.stage.querySelector('#cW');
        const Lg = 270, T = 150, A = 210, HX = 260, HY = 200, FY = HY + Lg, dF = c.msk.fd;
        const phiMax = deg(Math.acos(clamp((dF - 90 + 70) / 50, -1, 1)));
        W.innerHTML = `<svg class="scene" viewBox="0 0 560 520" id="fS" style="cursor:pointer"><rect width="560" height="520" fill="#e8eef4"/>
          <text x="16" y="26" class="svg-title">Distancia dedo-suelo · vista lateral</text>
          <rect x="0" y="${FY}" width="560" height="${520 - FY}" fill="#cfd8e2"/>
          <g id="fg"></g><text id="fRead" x="540" y="60" text-anchor="end" style="font:700 24px system-ui,sans-serif;fill:#237a4b"></text></svg>
          <div class="msk-ctl"><span>Flexión del tronco</span><input type="range" id="fSl" min="0" max="${phiMax.toFixed(2)}" step="0.01" value="0"><span id="fAng">0°</span></div>
          <div class="msk-stat" id="fSt"></div>`;
        const svg = W.querySelector('#fS'), sl = W.querySelector('#fSl'), st = W.querySelector('#fSt');
        let phi = 0;
        const draw = () => {
          const a = rad(phi), sx2 = HX + T * Math.sin(a), sy2 = HY - T * Math.cos(a);
          const hx = HX + (T + 38) * Math.sin(a), hy = HY - (T + 38) * Math.cos(a);
          const tipY = sy2 + A, d = Math.max(0, (FY - tipY) / 3);
          svg.querySelector('#fg').innerHTML =
            cap(HX, HY, HX, FY - 8, 46) + oval(HX + 18, FY - 6, 36, 10) +
            cap(HX, HY, sx2, sy2, 62, SK2) + headS(hx, hy, 26, 1) +
            cap(sx2, sy2, sx2, tipY, 20) + ball(sx2, tipY, 12) +
            `<circle cx="${HX}" cy="${HY}" r="6" fill="#38495a"/>` +
            `<line x1="${sx2 + 40}" y1="${tipY}" x2="${sx2 + 40}" y2="${FY}" stroke="#c0392b" stroke-width="3"/>` +
            `<text x="${sx2 + 48}" y="${(tipY + FY) / 2 + 5}" style="font:700 14px system-ui,sans-serif;fill:#c0392b">${fmt(d)} cm</text>`;
          svg.querySelector('#fRead').textContent = d <= 0.2 ? 'toca el suelo' : fmt(d) + ' cm';
          W.querySelector('#fAng').textContent = Math.round(phi) + '°';
          sl.value = phi;
          st.innerHTML = learn
            ? `<div class="msk-card"><p>Distancia de la punta de los dedos al suelo: <b>${d <= 0.2 ? '0 cm (toca el suelo)' : fmt(d) + ' cm'}</b>. Normal ≈ <b>0-10 cm</b> con las rodillas extendidas.</p>
               <p style="color:var(--muted)">Mide la flexión conjunta de columna lumbar y caderas, y depende también de la elasticidad de los isquiotibiales; se interpreta junto con Schober.</p></div>`
            : `<p>Distancia dedo-suelo: <b>${d <= 0.2 ? '0' : fmt(d)} cm</b>.</p>`;
        };
        const move = e => {
          const p = svgPoint(svg, e);
          let ang = deg(Math.atan2(p.x - HX, -(p.y - HY)));
          if (ang < 0) ang = ang < -90 ? 180 : 0;
          phi = clamp(ang, 0, phiMax); draw();
        };
        let drag = false;
        svg.addEventListener('pointerdown', e => { drag = true; try { svg.setPointerCapture(e.pointerId); } catch (err) { /* noop */ } move(e); });
        svg.addEventListener('pointermove', e => { if (drag) move(e); });
        const fin = () => {
          if (!drag) return; drag = false;
          if (phi > phiMax - 1) { sh.log(learn ? `<b>Distancia dedo-suelo:</b> ${dF === 0 ? '0 cm (toca el suelo)' : dF + ' cm'}; normal ≤ 10 cm.` : `Dedo-suelo: ${dF} cm.`, 'find'); sh.explored('spine:finger'); }
        };
        svg.addEventListener('pointerup', fin); svg.addEventListener('pointercancel', fin);
        sl.addEventListener('input', () => { phi = +sl.value; draw(); });
        sl.addEventListener('change', () => { drag = true; fin(); });
        draw();
      }
    };
    return sc;
  }

  /* ---- Escena 3: fuerza y tono ---- */
  const MUS = [
    { id: 'delt', n: 'Deltoides', root: 'C5', act: 'Abducción del hombro', limb: 'arm', x: 190, y: 126, v: [0, 1],
      tech: 'Brazo en abducción de 90° con el codo flexionado. El examinador apoya la mano sobre el brazo, por encima del codo, y empuja hacia abajo mientras el paciente mantiene la posición.' },
    { id: 'bic', n: 'Bíceps braquial', root: 'C5-C6', act: 'Flexión del codo', limb: 'arm', x: 166, y: 170, v: [0, 1],
      tech: 'Codo flexionado a 90° con el antebrazo en supinación. El examinador sujeta la muñeca e intenta extender el codo; el paciente resiste.' },
    { id: 'tric', n: 'Tríceps braquial', root: 'C7', act: 'Extensión del codo', limb: 'arm', x: 192, y: 192, v: [0, -1],
      tech: 'Codo flexionado a 90°; el paciente extiende el codo mientras el examinador se opone con la mano sobre el antebrazo distal.' },
    { id: 'wext', n: 'Extensores de la muñeca', root: 'C6', act: 'Extensión de la muñeca', limb: 'arm', x: 138, y: 258, v: [0, 1],
      tech: 'Antebrazo en pronación y puño cerrado; el paciente extiende la muñeca y el examinador empuja el dorso de la mano hacia la flexión.' },
    { id: 'fflex', n: 'Flexores profundos de los dedos', root: 'C8', act: 'Flexión de las interfalángicas distales', limb: 'arm', x: 158, y: 278, v: [-1, 0],
      tech: 'El paciente engancha sus dedos con los del examinador (gancho) e intenta flexionarlos mientras el examinador tira para abrirlos.' },
    { id: 'inter', n: 'Interóseos / abductor del meñique', root: 'T1', act: 'Abducción de los dedos', limb: 'arm', x: 126, y: 334, v: [1, 0],
      tech: 'Dedos extendidos y separados; el examinador intenta juntar el índice y el meñique contra la resistencia.' },
    { id: 'ilio', n: 'Iliopsoas', root: 'L2', act: 'Flexión de la cadera', limb: 'leg', x: 236, y: 300, v: [0, 1],
      tech: 'Paciente sentado o en decúbito supino: eleva el muslo con la rodilla flexionada y el examinador empuja sobre la cara anterior del muslo hacia abajo.' },
    { id: 'gmed', n: 'Glúteo medio y menor', root: 'L4-S1', act: 'Abducción de la cadera', limb: 'leg', x: 206, y: 284, v: [1, 0], ls: 'in',
      tech: 'Decúbito lateral (o supino): el paciente separa la pierna extendida y el examinador empuja sobre la cara lateral del muslo hacia la línea media.' },
    { id: 'quad', n: 'Cuádriceps', root: 'L3-L4', act: 'Extensión de la rodilla', limb: 'leg', x: 238, y: 352, v: [0, 1],
      tech: 'Paciente sentado: extiende la rodilla mientras el examinador empuja sobre la cara anterior de la tibia distal intentando flexionarla. Se palpa la contracción.' },
    { id: 'ham', n: 'Isquiotibiales', root: 'L5-S1', act: 'Flexión de la rodilla', limb: 'leg', x: 222, y: 378, v: [0, -1],
      tech: 'Decúbito prono o supino con la rodilla a 90°: el paciente flexiona la rodilla y el examinador tira del tobillo para extenderla.' },
    { id: 'tib', n: 'Tibial anterior', root: 'L4', act: 'Dorsiflexión del tobillo', limb: 'leg', x: 226, y: 448, v: [0, 1],
      tech: 'El paciente lleva el pie hacia arriba y adentro; el examinador empuja el dorso del pie hacia la flexión plantar. También: marcha en talones.' },
    { id: 'ehl', n: 'Extensor largo del hallux', root: 'L5', act: 'Extensión del primer dedo', limb: 'leg', x: 232, y: 536, v: [0, 1],
      tech: 'El paciente eleva el dedo gordo; el examinador presiona sobre su falange distal hacia abajo.' },
    { id: 'gast', n: 'Gastrocnemio y sóleo', root: 'S1', act: 'Flexión plantar del tobillo', limb: 'leg', x: 212, y: 474, v: [0, -1],
      tech: 'El paciente empuja con la planta del pie contra la mano del examinador; mejor aún, se pide ponerse en puntas de pie sobre una pierna 5-10 veces (marcha en puntas de pie).' }
  ];
  const MRC = [['5', 'Fuerza normal: vence la resistencia máxima'], ['4', 'Vence la gravedad y una resistencia moderada (4-, 4, 4+ según la resistencia)'],
    ['3', 'Vence la gravedad, pero no la resistencia'], ['2', 'Movimiento completo solo con la gravedad eliminada'],
    ['1', 'Contracción visible o palpable, sin movimiento'], ['0', 'Sin contracción']];

  function makeStrScene() {
    const sc = {
      label: 'Fuerza, tono y trofismo',
      hint: '',
      tools: [
        { id: 'gravity', icon: '🙋', label: 'Motilidad activa (contra gravedad)' },
        { id: 'resist', icon: '✋', label: 'Fuerza contra resistencia (0-5)' },
        { id: 'tone', icon: '🤲', label: 'Tono (motilidad pasiva)' },
        { id: 'trophism', icon: '📏', label: 'Trofismo (perímetros)' }
      ],
      busy: false,
      enter(stage, sh) {
        this.sh = sh; this.busy = false;
        const c = sh.case, learn = sh.mode === 'learn';
        const arm = (m) => `${cap(205 + (m ? 0 : 0), 125, 170, 215, 30)}${cap(170, 215, 135, 300, 26)}${ball(126, 326, 15)}`;
        const mirror = s => s.replace(/x1="([\d.]+)"/g, (a, v) => `x1="${520 - v}"`).replace(/x2="([\d.]+)"/g, (a, v) => `x2="${520 - v}"`).replace(/cx="([\d.]+)"/g, (a, v) => `cx="${520 - v}"`);
        const body = `${cap(260, 82, 260, 100, 22)}${headS(260, 50, 30, 0)}${cap(260, 115, 260, 265, 110, SK2)}
          ${arm()}${mirror(arm())}
          ${cap(238, 275, 232, 405, 50)}${cap(232, 405, 228, 520, 38)}${oval(224, 540, 30, 12)}
          ${cap(282, 275, 288, 405, 50)}${cap(288, 405, 292, 520, 38)}${oval(296, 540, 30, 12)}`;
        const pins = MUS.map(m => ['R', 'L'].map(s => {
          const x = s === 'R' ? m.x : 520 - m.x;
          const right = (s === 'R') === (m.ls === 'in');   // rótulo hacia la línea media o hacia fuera
          return `<g class="pin" data-m="${m.id}" data-s="${s}"><circle cx="${x}" cy="${m.y}" r="10" fill="rgba(14,106,120,.18)" stroke="#0e6a78" stroke-width="2"/>
            <circle cx="${x}" cy="${m.y}" r="3" fill="#0e6a78"/>${learn ? `<text class="svg-hint" x="${x + (right ? 14 : -14)}" y="${m.y + 4}" text-anchor="${right ? 'start' : 'end'}" style="font-size:11px">${m.root}</text>` : ''}</g>`;
        }).join('')).join('');
        stage.innerHTML = `<div class="msk-wrap"><svg class="scene" viewBox="0 0 520 580" id="fs" style="max-height:640px;margin:0 auto;cursor:pointer">
          <rect width="520" height="580" fill="#e8eef4"/>
          <text x="260" y="574" text-anchor="middle" class="svg-small">Vista anterior · el lado derecho del paciente queda a la izquierda de la imagen</text>
          ${body}<g id="fx"></g>${pins}</svg>
          <div id="fInfo" class="msk-stat"></div>
          ${learn ? `<div class="msk-card"><b>Escala de fuerza 0-5 (MRC)</b><table class="msk-tbl">${MRC.map(r => `<tr><td><b>${r[0]}/5</b></td><td>${r[1]}</td></tr>`).join('')}</table></div>` : ''}</div>`;
        this.svg = stage.querySelector('#fs');
        this.svg.addEventListener('click', this._h = e => {
          if (this.busy) return;
          const g = e.target.closest('.pin');
          if (!g) { sh.log('Haz clic sobre un punto de la figura (grupo muscular).', 'warn'); return; }
          this.test(MUS.find(m => m.id === g.dataset.m), g.dataset.s);
        });
        this.stage = stage;
      },
      leave() { this.busy = true; },
      refresh() { this.enter(this.stage, this.sh); this.busy = false; },
      setTool(id) {
        const t = {
          resist: 'Fuerza contra resistencia: haz clic sobre un punto; el paciente mantiene el movimiento mientras el examinador se opone (escala 0-5).',
          gravity: 'Motilidad activa: el paciente realiza el movimiento completo contra la gravedad, sin resistencia (grado ≥ 3).',
          tone: 'Tono: motilidad pasiva del miembro relajado; haz clic sobre un punto del brazo o de la pierna.',
          trophism: 'Trofismo: inspección y medición de perímetros musculares; haz clic sobre el brazo o la pierna.'
        };
        this.sh.hint(t[id]);
      },
      test(m, side) {
        const sh = this.sh, c = sh.case, tool = sh.tool, learn = sh.mode === 'learn';
        const SN = side === 'R' ? 'derecho' : 'izquierdo', arm = m.limb === 'arm';
        const x = side === 'R' ? m.x : 520 - m.x, vx = side === 'R' ? m.v[0] : -m.v[0], vy = m.v[1];
        if (tool === 'tone') {
          sh.log(arm
            ? `<b>Tono del miembro superior ${SN}:</b> <i>Técnica:</i> motilidad pasiva de codo y muñeca con el paciente relajado; sacudida del antebrazo. <i>Hallazgo normal:</i> resistencia mínima, uniforme y fluida; sin espasticidad (aumento dependiente de la velocidad), rigidez en tubo de plomo ni rueda dentada; sin hipotonía (balanceo normal de la mano).`
            : `<b>Tono del miembro inferior ${SN}:</b> <i>Técnica:</i> motilidad pasiva de cadera, rodilla y tobillo; prueba del péndulo con la pierna colgando. <i>Hallazgo normal:</i> sin resistencia anormal, la pierna oscila y se detiene de forma normal; sin espasticidad, rigidez ni clonus.`, 'find');
          sh.explored('str:tone:' + m.limb);
          return;
        }
        if (tool === 'trophism') {
          const pm = c.msk.perim;
          sh.log(arm
            ? `<b>Trofismo del miembro superior ${SN}:</b> <i>Técnica:</i> inspección comparativa y perímetro del brazo 10 cm por encima del epicóndilo. <i>Hallazgo normal:</i> masas musculares simétricas, sin atrofia ni fasciculaciones; perímetro ≈ ${pm[0]} cm (diferencia entre lados ≤ 1 cm; el lado dominante puede ser algo mayor).`
            : `<b>Trofismo del miembro inferior ${SN}:</b> <i>Técnica:</i> inspección y perímetros del muslo (15 cm por encima de la rótula) y de la pantorrilla (máximo). <i>Hallazgo normal:</i> volumen simétrico, sin atrofia, hipertrofia ni fasciculaciones; muslo ≈ ${pm[1]} cm y pantorrilla ≈ ${pm[2]} cm; diferencia entre lados ≤ 1-2 cm.`, 'find');
          sh.explored('str:trophism:' + m.limb);
          return;
        }
        const grav = tool === 'gravity';
        sh.explored(`str:${grav ? 'gravity' : 'resist'}:${m.id}`);
        this.busy = true;
        const fx = this.svg.querySelector('#fx');
        const col = grav ? '#2c7be5' : '#c0392b';
        const dx = grav ? 0 : vx, dy = grav ? 1 : vy;
        const tt = U.tween(grav ? 900 : 1200, u => {
          const len = 54 * (0.2 + 0.8 * Math.min(1, u * 1.2));
          fx.innerHTML = arrowSvg(x, m.y, dx, dy, len, col) + (!grav ? arrowSvg(x + dx * 0, m.y, -dx, -dy, 0, '#237a4b') : '') +
            `<circle cx="${x}" cy="${m.y}" r="${14 + 6 * Math.sin(u * 10)}" fill="none" stroke="#237a4b" stroke-width="3" opacity="${u < 0.9 ? 0.8 : 0.3}"/>`;
        }, () => { this.busy = false; setTimeout(() => { fx.innerHTML = ''; }, 600); });
        if (grav) {
          sh.log(learn
            ? `<b>${esc(m.n)} ${SN} (${m.root}) · ${esc(m.act)}:</b> <i>Técnica:</i> se pide el movimiento activo completo sin oponer resistencia. <i>Hallazgo normal:</i> completa el arco contra la gravedad (≥ 3/5), sin claudicación ni temblor.`
            : `${esc(m.n)} ${SN}: movimiento completo contra gravedad.`, 'find');
        } else {
          sh.log(learn
            ? `<b>${esc(m.n)} ${SN} (${m.root}) · ${esc(m.act)}:</b> <i>Técnica:</i> ${esc(m.tech)} <i>Hallazgo normal:</i> <b>5/5</b>, vence la resistencia máxima del examinador y es simétrico.`
            : `${esc(m.n)} ${SN}: fuerza 5/5.`, 'find');
        }
        this.sh.$('#fInfo').innerHTML = learn
          ? `<div class="msk-card"><p><b>${esc(m.n)}</b> · raíz ${m.root} · ${esc(m.act)}</p><p>${esc(m.tech)}</p><p class="msk-ok">Resultado: 5/5 bilateral y simétrico.</p></div>` : '';
      }
    };
    return sc;
  }

  /* ---- Escena 4: maniobras especiales ---- */
  const MAN = [
    { id: 'neer', j: 'sh', n: 'Neer', motion: 'sh.flex',
      steps: [{ ms: 2600, th: [0, 170], label: 'Elevación pasiva forzada con la escápula fija y el brazo en rotación interna' }, { ms: 900 }],
      marks: [{ on: 'fix', t: 0, dx: -40, dy: -30, icon: '✋', label: 'fija la escápula' }], arrows: [{ on: 'mov', t: 0.6, tang: 1, pull: true }],
      tech: 'Detrás del paciente: una mano fija la escápula y la otra eleva pasivamente el brazo en flexión, con el antebrazo en pronación (pulgar hacia abajo), hasta el máximo.',
      seek: 'Pinzamiento subacromial (supraespinoso y bolsa) entre 60° y 120° o al final del recorrido.',
      res: 'Negativa: elevación completa (≈ 170-180°) sin dolor ni defensa.' },
    { id: 'hawkins', j: 'sh', n: 'Hawkins-Kennedy', motion: 'sh.ir',
      steps: [{ ms: 2300, th: [0, 60], label: 'Hombro y codo a 90°: rotación interna pasiva' }, { ms: 900 }],
      marks: [{ on: 'mov', t: 0.9, icon: '✋', label: 'empuja el antebrazo hacia abajo' }], arrows: [{ on: 'mov', t: 0.9, tang: 1, pull: true }],
      tech: 'Hombro en flexión de 90° y codo a 90°. El examinador rota pasivamente el hombro hacia dentro (el antebrazo desciende).',
      seek: 'Pinzamiento del supraespinoso bajo el ligamento coracoacromial.',
      res: 'Negativa: rotación interna completa sin dolor.' },
    { id: 'jobe', j: 'sh', n: 'Jobe (lata vacía)', motion: 'sh.abd',
      steps: [{ ms: 1200, th: [0, 90], label: 'Abducción a 90° en el plano escapular, pulgares hacia abajo' }, { ms: 2200, resist: true, label: 'Resistencia hacia abajo' }],
      marks: [{ on: 'mov', t: 0.85, icon: '✋', label: 'empuja el brazo hacia abajo', from: 1 }], arrows: [{ on: 'mov', t: 0.85, tang: -1, from: 1 }],
      tech: 'Brazos a 90° de abducción, 30° por delante del plano frontal y en rotación interna (como vaciando una lata); el examinador empuja hacia abajo.',
      seek: 'Tendinopatía o rotura del supraespinoso (debilidad o dolor).',
      res: 'Negativa: fuerza conservada 5/5 y sin dolor.' },
    { id: 'speed', j: 'sh', n: 'Speed (palma arriba)', motion: 'sh.flex',
      steps: [{ ms: 1200, th: [0, 90], label: 'Flexión a 90°, codo extendido y antebrazo en supinación' }, { ms: 2200, resist: true, label: 'Resistencia hacia abajo' }],
      marks: [{ on: 'mov', t: 0.85, icon: '✋', label: 'empuja hacia abajo', from: 1 }], arrows: [{ on: 'mov', t: 0.85, tang: -1, from: 1 }],
      tech: 'Brazo en flexión de 90°, codo extendido y palma hacia arriba; el examinador se opone con la mano sobre el antebrazo distal mientras palpa el surco bicipital.',
      seek: 'Tendinopatía de la porción larga del bíceps o lesión SLAP.',
      res: 'Negativa: mantiene la posición contra resistencia sin dolor en el surco bicipital.' },
    { id: 'cozen', j: 'el', n: 'Cozen', motion: 'wr.ext',
      steps: [{ ms: 1100, th: [0, 35], label: 'Puño cerrado, antebrazo en pronación: extensión de la muñeca' }, { ms: 2200, resist: true, label: 'Se opone a la extensión' }],
      marks: [{ on: 'fix', t: 1, dx: -4, dy: -22, icon: '☝️', label: 'palpa el epicóndilo lateral' }], arrows: [{ on: 'mov', t: 0.6, tang: -1, from: 1 }],
      tech: 'Codo extendido o a 90°, antebrazo en pronación y puño cerrado. El paciente extiende la muñeca contra la resistencia del examinador mientras este palpa el epicóndilo lateral.',
      seek: 'Epicondilitis lateral (codo de tenista).',
      res: 'Negativa: extensión resistida sin dolor sobre el epicóndilo lateral.' },
    { id: 'phalen', j: 'wr', n: 'Phalen', motion: 'wr.flex',
      steps: [{ ms: 1500, th: [0, 80], label: 'Flexión máxima de las muñecas (dorsos enfrentados)' }, { ms: 3200, timer: 60, label: 'Se mantiene 60 segundos' }],
      marks: [], arrows: [],
      tech: 'El paciente flexiona las muñecas al máximo, apoyando los dorsos de las manos entre sí, y las mantiene 60 s.',
      seek: 'Síndrome del túnel carpiano (compresión del nervio mediano).',
      res: 'Negativa: sin parestesias en el territorio del mediano (pulgar, índice, medio y mitad radial del anular) durante 60 s.' },
    { id: 'tinel', j: 'wr', n: 'Tinel (muñeca)', motion: 'wr.flex',
      steps: [{ ms: 3200, pulse: true, label: 'Percusión suave sobre el nervio mediano, cara palmar de la muñeca' }],
      marks: [{ on: 'mov', t: 0, dx: 0, dy: 34, icon: '🔨', label: 'percusión sobre el túnel carpiano' }], arrows: [],
      tech: 'Con la muñeca en posición neutra y la palma hacia arriba, se percute 3-4 veces con el martillo o con los dedos sobre el pliegue de la muñeca (trayecto del mediano).',
      seek: 'Irritabilidad del nervio mediano (túnel carpiano); parestesias que irradian a los dedos.',
      res: 'Negativa: no aparecen parestesias ni descargas eléctricas.' },
    { id: 'finkel', j: 'wr', n: 'Finkelstein', motion: 'wr.uln',
      steps: [{ ms: 1100, th: [0, 5], label: 'El paciente cierra el puño con el pulgar dentro' }, { ms: 1800, th: [5, 30], label: 'Desviación cubital pasiva' }, { ms: 700 }],
      marks: [{ on: 'mov', t: 0.75, icon: '✋', label: 'lleva la muñeca hacia el lado cubital', from: 1 }], arrows: [{ on: 'mov', t: 0.75, tang: 1, pull: true, from: 1 }],
      tech: 'Pulgar flexionado dentro del puño; el examinador desvía pasivamente la muñeca hacia el lado cubital.',
      seek: 'Tenosinovitis de De Quervain (abductor largo y extensor corto del pulgar).',
      res: 'Negativa: sin dolor en la estiloides radial.' },
    { id: 'faber', j: 'hi', n: 'FABER / Patrick', motion: 'hi.abd',
      steps: [{ ms: 2300, th: [0, 45], label: 'Flexión, ABducción y Rotación externa: tobillo sobre la rodilla contraria' }, { ms: 1100, label: 'Presión suave sobre la rodilla hacia la camilla' }],
      marks: [{ on: 'mov', t: 0.5, icon: '✋', label: 'presiona la rodilla hacia la camilla', from: 1 }], arrows: [],
      tech: 'Supino: se coloca el tobillo sobre la rodilla contraria (figura de 4) mientras una mano fija la EIAS opuesta y la otra presiona suavemente la rodilla hacia la camilla.',
      seek: 'Patología de la cadera (dolor inguinal), de la articulación sacroilíaca (dolor posterior) o del psoas.',
      res: 'Negativa: la rodilla desciende hasta casi la horizontal, simétrica con el otro lado, sin dolor inguinal ni sacro.' },
    { id: 'thomas', j: 'hi', n: 'Thomas', motion: 'hi.flex',
      steps: [{ ms: 2400, th: [0, 120], label: 'Se flexiona una cadera al máximo contra el abdomen' }, { ms: 1400, label: 'Se observa el muslo contrario: permanece apoyado' }],
      marks: [{ on: 'fix', t: 0.5, dx: 40, dy: 0, icon: '👀', label: 'el muslo contrario sigue plano', from: 1 }], arrows: [],
      tech: 'Decúbito supino al borde de la camilla; el paciente abraza una rodilla contra el pecho (aplana la lordosis lumbar) y se observa la cadera contraria.',
      seek: 'Contractura en flexión de la cadera (psoas ilíaco y recto femoral).',
      res: 'Negativa: el muslo contralateral permanece apoyado sobre la camilla (extensión de cadera 0°).' },
    { id: 'trend', j: 'hi', n: 'Trendelenburg', kind: 'trend',
      tech: 'El examinador observa por detrás los hoyuelos de Venus mientras el paciente se apoya sobre una pierna durante 30 s (flexionando la contraria).',
      seek: 'Debilidad o inhibición dolorosa de los abductores de la cadera de apoyo (glúteo medio y menor).',
      res: 'Negativa: la pelvis se mantiene nivelada o asciende ligeramente en el lado levantado.' },
    { id: 'drawA', j: 'kn', n: 'Cajón anterior', motion: 'kn.flex',
      steps: [{ ms: 1300, th: [0, 90], label: 'Rodilla a 90° con el pie apoyado' }, { ms: 800, sx: [0, 4], label: 'Tracción anterior de la tibia proximal' }, { ms: 700, sx: [4, 0] }, { ms: 700, sx: [0, 4] }, { ms: 600, sx: [4, 0] }],
      marks: [{ on: 'mov', t: 0.12, icon: '🤲', label: 'manos en la tibia proximal', from: 1 }], arrows: [{ on: 'mov', t: 0.12, loc: [1, 0], pull: true, from: 1 }],
      tech: 'Supino, cadera a 45° y rodilla a 90°. El examinador se sienta sobre el pie, rodea la tibia proximal con ambas manos (pulgares en la interlínea) y tira hacia delante.',
      seek: 'Integridad del ligamento cruzado anterior.',
      res: 'Negativo: traslación anterior mínima, simétrica con el lado contrario y con tope firme.' },
    { id: 'drawP', j: 'kn', n: 'Cajón posterior', motion: 'kn.flex',
      steps: [{ ms: 1300, th: [0, 90], label: 'Rodilla a 90° con el pie apoyado' }, { ms: 800, sx: [0, -4], label: 'Empuje posterior de la tibia proximal' }, { ms: 700, sx: [-4, 0] }, { ms: 700, sx: [0, -4] }, { ms: 600, sx: [-4, 0] }],
      marks: [{ on: 'mov', t: 0.12, icon: '🤲', label: 'manos en la tibia proximal', from: 1 }], arrows: [{ on: 'mov', t: 0.12, loc: [-1, 0], pull: true, from: 1 }],
      tech: 'Misma posición; se empuja la tibia proximal hacia atrás. Antes, se comprueba que no haya hundimiento posterior de la tibia (signo de la caída posterior).',
      seek: 'Integridad del ligamento cruzado posterior.',
      res: 'Negativo: sin traslación posterior anormal; tope firme y simétrico.' },
    { id: 'lachman', j: 'kn', n: 'Lachman', motion: 'kn.flex',
      steps: [{ ms: 1100, th: [0, 25], label: 'Rodilla a 20-30° de flexión' }, { ms: 800, sx: [0, 4], label: 'Una mano estabiliza el fémur; la otra tira de la tibia hacia delante' }, { ms: 700, sx: [4, 0] }, { ms: 700, sx: [0, 4] }, { ms: 600, sx: [4, 0] }],
      marks: [{ on: 'mov', t: 0.12, icon: '🤲', label: 'una mano en el fémur, otra en la tibia', from: 1 }], arrows: [{ on: 'mov', t: 0.12, loc: [1, 0], pull: true, from: 1 }],
      tech: 'Rodilla a 20-30° de flexión y ligera rotación externa; una mano sujeta el muslo distal y la otra tracciona la tibia proximal hacia delante.',
      seek: 'Ligamento cruzado anterior (es la prueba más sensible).',
      res: 'Negativo: tope final firme y traslación mínima, igual que en el lado contrario.' },
    { id: 'mcm', j: 'kn', n: 'McMurray', motion: 'kn.flex',
      steps: [{ ms: 1500, th: [0, 135], label: 'Flexión máxima de cadera y rodilla' }, { ms: 2600, th: [135, 20], label: 'Rotación externa + valgo y extensión; después, rotación interna + varo' }, { ms: 600 }],
      marks: [{ on: 'mov', t: 0.95, icon: '✋', label: 'una mano en la interlínea, otra en el pie', from: 1 }], arrows: [],
      tech: 'Supino, cadera y rodilla flexionadas al máximo. Con una mano sobre la interlínea y la otra en el talón se rota el pie y se extiende la rodilla (rotación externa para el menisco medial, interna para el lateral).',
      seek: 'Lesión meniscal (chasquido doloroso en la interlínea).',
      res: 'Negativa: sin chasquido, bloqueo ni dolor en la interlínea.' },
    { id: 'varval', j: 'kn', n: 'Bostezo varo / valgo', motion: 'kn.var',
      steps: [{ ms: 1200, th: [0, 5], label: 'Estrés en valgo a 0° y 30° (ligamento colateral medial) · esquema exagerado' }, { ms: 800 }, { ms: 1300, th: [5, -5], label: 'Estrés en varo (ligamento colateral lateral)' }, { ms: 800 }],
      marks: [{ on: 'mov', t: 0.12, icon: '🤲', label: 'una mano en la rodilla, otra en el tobillo' }], arrows: [],
      tech: 'Rodilla en extensión y a 30°. Una mano en la cara lateral (o medial) de la rodilla y otra en el tobillo: se aplica un estrés en valgo y después en varo.',
      seek: 'Ligamentos colaterales medial y lateral.',
      res: 'Negativo: sin apertura articular (bostezo) ni dolor; tope firme.' },
    { id: 'pelot', j: 'kn', n: 'Choque o peloteo rotuliano', motion: 'kn.flex',
      steps: [{ ms: 3200, pulse: true, label: 'Se vacía la bolsa suprarrotuliana y se presiona la rótula hacia el fémur' }],
      marks: [{ on: 'fix', t: 0, dx: 36, dy: -6, icon: '👆', label: 'presión sobre la rótula' }], arrows: [],
      tech: 'Rodilla extendida y relajada: una mano desliza líquido desde la bolsa suprarrotuliana hacia abajo y con la otra se presiona la rótula hacia atrás.',
      seek: 'Derrame articular moderado-importante (la rótula "flota" y choca contra el fémur).',
      res: 'Negativo: la rótula no rebota ni "choca"; sin derrame.' },
    { id: 'ankDraw', j: 'an', n: 'Cajón anterior del tobillo', motion: 'an.dorsi',
      steps: [{ ms: 900 }, { ms: 800, sx: [0, 4], label: 'Se tracciona el talón hacia delante' }, { ms: 700, sx: [4, 0] }, { ms: 700, sx: [0, 4] }, { ms: 600, sx: [4, 0] }],
      marks: [{ on: 'fix', t: 0.75, dx: 8, dy: 0, icon: '✋', label: 'estabiliza la tibia' }, { on: 'mov', t: 0, dx: -36, dy: 40, icon: '🤲', label: 'tracciona el talón', from: 1 }],
      arrows: [{ on: 'mov', t: 0.0, dx: -30, dy: 38, loc: [1, 0], pull: true, from: 1 }],
      tech: 'Tobillo en 10-20° de flexión plantar: una mano estabiliza la tibia distal y la otra, en el talón, lo desplaza hacia delante.',
      seek: 'Ligamento peroneoastragalino anterior (esguince lateral).',
      res: 'Negativo: traslación anterior mínima, tope firme y simétrico.' },
    { id: 'thompson', j: 'an', n: 'Thompson', motion: 'an.plantar',
      steps: [{ ms: 1400, pulse: true, label: 'Paciente en prono con la rodilla a 90°: se comprime el gemelo' }, { ms: 1200, th: [0, 25], label: 'El pie se flexiona en sentido plantar' }, { ms: 800 }],
      marks: [{ on: 'fix', t: 0.55, dx: -22, dy: 0, icon: '🤏', label: 'compresión del gemelo' }], arrows: [],
      tech: 'Prono con los pies fuera de la camilla, o arrodillado en una silla: se aprieta el gemelo y se observa si el pie realiza flexión plantar.',
      seek: 'Rotura completa del tendón de Aquiles (ausencia de flexión plantar).',
      res: 'Negativa: el pie realiza flexión plantar al comprimir el gemelo (tendón íntegro).' }
  ];
  const MJ = ['sh', 'el', 'wr', 'hi', 'kn', 'an'];

  function makeManScene() {
    const sc = {
      label: 'Maniobras especiales',
      hint: 'Elige una articulación y una maniobra: se reproduce la técnica y se indica el resultado normal (negativo).',
      tools: [{ id: 'normal', icon: '▶️', label: 'Velocidad normal' }, { id: 'slow', icon: '🐢', label: 'Cámara lenta' }],
      speed: 1,
      enter(stage, sh) {
        this.sh = sh; this.stage = stage; this.j = 'sh'; this.cur = null; this.seen = this.seen || {};
        stage.innerHTML = '<div class="msk-wrap"><div class="msk-row" id="nJ"></div><div class="msk-row" id="nM"></div><div id="nV"></div><div id="nI"></div></div>';
        this.view = null; this.trend = null;
        stage.addEventListener('click', this._h = e => {
          const j = e.target.closest('[data-j]'), m = e.target.closest('[data-m]');
          if (j) { this.j = j.dataset.j; this.cur = null; this.clearView(); this.draw(); }
          else if (m) this.run(MAN.find(x => x.id === m.dataset.m));
        });
        this.draw();
      },
      leave() { this.clearView(); if (this.stage && this._h) this.stage.removeEventListener('click', this._h); },
      clearView() { if (this.view) { this.view.destroy(); this.view = null; } if (this.trend) { this.trend.destroy(); this.trend = null; } const v = this.stage && this.stage.querySelector('#nV'); if (v) v.innerHTML = ''; const i = this.stage && this.stage.querySelector('#nI'); if (i) i.innerHTML = ''; },
      setTool(id) { this.speed = id === 'slow' ? 2.2 : 1; },
      refresh() { if (this.cur) this.run(this.cur); else this.draw(); },
      draw() {
        const st = this.stage;
        st.querySelector('#nJ').innerHTML = MJ.map(id => `<button class="msk-chip${id === this.j ? ' on' : ''}" data-j="${id}">${esc(JOINTS.find(x => x.id === id).n)}</button>`).join('');
        st.querySelector('#nM').innerHTML = MAN.filter(m => m.j === this.j).map(m => `<button class="msk-chip${this.cur && this.cur.id === m.id ? ' on' : ''}${this.seen[m.id] ? ' seen' : ''}" data-m="${m.id}">${esc(m.n)}</button>`).join('');
      },
      info(m) {
        const learn = this.sh.mode === 'learn';
        return learn
          ? `<div class="msk-card"><p><b>${esc(m.n)}</b> · ${esc(JOINTS.find(x => x.id === m.j).n)}</p><p><b>Técnica:</b> ${esc(m.tech)}</p><p><b>Qué busca:</b> ${esc(m.seek)}</p><p class="msk-ok">Resultado normal: ${esc(m.res)}</p></div>`
          : `<div class="msk-card"><p><b>${esc(m.n)}</b></p><p class="msk-ok">Resultado: ${esc(m.res.split(':')[0])}.</p></div>`;
      },
      run(m) {
        const sh = this.sh, st = this.stage;
        this.cur = m; this.clearView(); this.draw();
        const V = st.querySelector('#nV'), I = st.querySelector('#nI');
        const done = () => {
          this.seen[m.id] = true; this.draw();
          sh.log(sh.mode === 'learn' ? `<b>${esc(m.n)}:</b> ${esc(m.res)}` : `${esc(m.n)}: ${esc(m.res.split(':')[0].toLowerCase())}.`, 'find');
          I.innerHTML = this.info(m);
          sh.explored('man:' + m.id);
        };
        if (m.kind === 'trend') {
          this.trend = trendView(V, { learn: () => sh.mode === 'learn', onDone: () => done() });
          I.innerHTML = this.info(m);
          return;
        }
        this.view = romView(V, { learn: () => sh.mode === 'learn', interactive: false, slider: false, cap: mm => mm.smax, status: null });
        I.innerHTML = '';
        this.view.play({ motion: m.motion, title: m.n, steps: m.steps, marks: m.marks, arrows: m.arrows, start: m.start }, this.speed, done);
      }
    };
    return sc;
  }

  /* ---- Escena 5: marcha ---- */
  function makeGaitScene() {
    const sc = {
      label: 'Marcha',
      hint: '',
      tools: [
        { id: 'walk', icon: '🚶', label: 'Marcha normal' },
        { id: 'heel', icon: '🦶', label: 'Marcha en talones' },
        { id: 'toe', icon: '🩰', label: 'Marcha en puntas de pie' },
        { id: 'tandem', icon: '➖', label: 'Marcha en tándem' },
        { id: 'trend', icon: '⚖️', label: 'Trendelenburg' }
      ],
      enter(stage, sh) {
        this.sh = sh; this.stage = stage; this.alive = true; this.playing = true; this.speed = 0.5; this.phi = 0; this.last = 0; this.mode = 'normal';
        const c = sh.case;
        stage.innerHTML = `<div class="msk-wrap"><div id="gG">
          <svg class="scene" viewBox="0 0 800 490" id="gS"></svg>
          <div class="msk-ctl"><button class="btn small" id="gPlay" style="width:auto;margin:0">⏸ Pausa</button>
            <label style="font-size:13px">Velocidad <select id="gSpd"><option value="0.25">0,25×</option><option value="0.5" selected>0,5×</option><option value="1">1×</option></select></label>
            <input type="range" id="gPh" min="0" max="100" value="0" aria-label="Fase del ciclo"><span id="gPhT" style="font-size:13px;min-width:48px">0 %</span></div>
          <div class="msk-pbar" id="gBar"><span style="flex:10;background:#1f6f8b">doble apoyo 10 %</span><span style="flex:40;background:#2c8e9c">apoyo simple 40 %</span><span style="flex:10;background:#1f6f8b">doble apoyo 10 %</span><span style="flex:40;background:#5a9e4b">balanceo 40 %</span><i class="mk" id="gMk"></i></div>
          <div class="msk-stat" id="gSt"></div></div><div id="gT" style="display:none"></div></div>`;
        const svg = this.svg = stage.querySelector('#gS');
        svg.innerHTML = `<rect width="800" height="490" fill="#e8eef4"/>
          <rect x="0" y="310" width="800" height="22" fill="#cfd8e2"/><g id="gt"></g>
          <g id="gfig"></g>
          <text x="16" y="24" class="svg-title" id="gTit"></text>
          <g id="gfp" transform="translate(0 345)"></g>`;
        const tk = svg.querySelector('#gt');
        let tks = '';
        for (let i = -4; i < 26; i++) tks += `<line x1="${i * 85}" x2="${i * 85}" y1="310" y2="322" stroke="#7f8c9a" stroke-width="2"/>`;
        tk.innerHTML = tks;
        // figura
        const fig = svg.querySelector('#gfig');
        const mk = (w, fill) => {
          const a = el('line', { stroke: SD, 'stroke-width': w + 4, 'stroke-linecap': 'round' }, fig), b = el('line', { stroke: fill, 'stroke-width': w, 'stroke-linecap': 'round' }, fig);
          return (x1, y1, x2, y2) => [a, b].forEach(n => { n.setAttribute('x1', x1); n.setAttribute('y1', y1); n.setAttribute('x2', x2); n.setAttribute('y2', y2); });
        };
        const FAR = '#dcb48f';
        this.parts = {
          farArm1: mk(14, FAR), farArm2: mk(12, FAR),
          farTh: mk(20, FAR), farSh: mk(15, FAR), farFt: mk(12, FAR),
          trunk: mk(36, SK2),
          nearTh: mk(20, SK), nearSh: mk(15, SK), nearFt: mk(12, SK),
          nearArm1: mk(14, SK), nearArm2: mk(12, SK)
        };
        this.head = el('circle', { r: 19, fill: SK, stroke: SD, 'stroke-width': 3 }, fig);
        this.nose = el('path', { fill: SK, stroke: SD, 'stroke-width': 2 }, fig);
        this.hipDot = el('circle', { r: 4, fill: '#38495a' }, fig);
        // el orden de los hijos ya fija el apilamiento (la cabeza queda sobre el tronco)
        stage.querySelector('#gPlay').addEventListener('click', () => { this.playing = !this.playing; stage.querySelector('#gPlay').textContent = this.playing ? '⏸ Pausa' : '▶ Reanudar'; this.last = performance.now(); });
        stage.querySelector('#gSpd').addEventListener('change', e => { this.speed = +e.target.value; });
        stage.querySelector('#gPh').addEventListener('input', e => {
          this.playing = false; stage.querySelector('#gPlay').textContent = '▶ Reanudar';
          this.phi = e.target.value / 100; this.draw(true);
        });
        this.trendHost = stage.querySelector('#gT');
        this.trend = trendView(this.trendHost, { learn: () => sh.mode === 'learn', onDone: s => { sh.log(sh.mode === 'learn' ? `<b>Trendelenburg ${s === 'L' ? 'derecho' : 'izquierdo'}:</b> negativo; pelvis nivelada durante 30 s.` : `Trendelenburg (apoyo ${s === 'L' ? 'derecho' : 'izquierdo'}): pelvis nivelada.`, 'find'); sh.explored('gait:trend:' + s); } });
        this.setMode('normal');
        this.last = performance.now();
        const token = this._tok = {};
        const loop = now => {
          if (!this.alive || this._tok !== token) return;
          if (this.playing && this.mode !== 'trend') {
            const per = 120 / c.msk.cad;                      // s por ciclo (zancada)
            this.phi = (this.phi + (now - this.last) / 1000 * this.speed / per) % 1;
            this.draw(false);
          }
          this.last = now;
          requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      },
      leave() { this.alive = false; if (this.trend) this.trend.destroy(); },
      refresh() { this.setMode(this.mode); },
      setTool(id) { this.setMode(id === 'walk' ? 'normal' : id); },
      setMode(mode) {
        const sh = this.sh, c = sh.case, learn = sh.mode === 'learn', st = this.stage;
        this.mode = mode;
        const G = st.querySelector('#gG'), T = st.querySelector('#gT');
        if (mode === 'trend') {
          G.style.display = 'none'; T.style.display = '';
          this.trend.redraw();
          sh.hint('Trendelenburg: elige la pierna que se levanta y observa el nivel de la pelvis desde atrás.');
          return;
        }
        G.style.display = ''; T.style.display = 'none';
        const H = c.v.height * 100;
        this.gait = makeGait(H, mode, ampFor(c, mode));
        this.phi = 0; this.gait.st.prints = [];
        for (let k = 0; k < 160; k++) this.gait.pose(k * 0.0065, true);   // calienta la simulación
        this.gait.st.prints = [];
        const tit = { normal: 'Marcha normal · vista lateral y huellas', heel: 'Marcha en talones', toe: 'Marcha en puntas de pie', tandem: 'Marcha en tándem (talón-punta)' }[mode];
        this.svg.querySelector('#gTit').textContent = tit;
        const hints = {
          normal: 'Marcha normal: observa las fases (barra inferior), el balanceo de los brazos y las huellas. Mueve el control de fase para detenerte en cada momento del ciclo.',
          heel: 'Marcha en talones: el paciente camina sin apoyar la punta de los pies (dorsiflexores, L4-L5).',
          toe: 'Marcha en puntas de pie: el paciente camina sobre el antepié (flexores plantares, S1).',
          tandem: 'Marcha en tándem: un pie delante del otro, talón con punta, en línea recta (equilibrio y propiocepción).'
        };
        sh.hint(hints[mode]);
        this.draw(true);
      },
      draw(scrub) {
        const sh = this.sh, c = sh.case, learn = sh.mode === 'learn', mode = this.mode, svg = this.svg;
        if (!this.gait) return;
        const g = this.gait;
        if (scrub) { g.st.anchor = null; }
        const r = g.pose(this.phi, !scrub);
        const PX = 1.7, CX = 330, GY = 310, S = g.S;
        const X = x => CX + x * PX, Y = y => GY - (r.py + y) * PX;
        const pp = this.parts;
        const legSet = (lg, th, sh2, ft) => {
          th(X(0), Y(0), X(lg.k[0]), Y(lg.k[1]));
          sh2(X(lg.k[0]), Y(lg.k[1]), X(lg.a[0]), Y(lg.a[1]));
          ft(X(lg.heel[0]), Y(lg.heel[1]), X(lg.toe[0]), Y(lg.toe[1]));
        };
        legSet(r.legs.L, pp.farTh, pp.farSh, pp.farFt);
        legSet(r.legs.R, pp.nearTh, pp.nearSh, pp.nearFt);
        const T = 49 * S, shx = 0, shy = T;
        pp.trunk(X(0), Y(0), X(shx), Y(shy));
        const hx = X(2), hy = Y(shy + 21 * S);
        this.head.setAttribute('cx', hx); this.head.setAttribute('cy', hy);
        this.nose.setAttribute('d', `M${hx + 17} ${hy - 2} l12 8 l-12 3 z`);
        this.hipDot.setAttribute('cx', X(0)); this.hipDot.setAttribute('cy', Y(0));
        // brazos: el brazo cercano avanza con la pierna contralateral (lejana)
        const armAng = ph => -16 * Math.cos(2 * Math.PI * ph) * (mode === 'tandem' ? 0.5 : 1);
        const arm = (a1, p1, p2) => {
          const a = rad(a1), e = rad(18 + 8 * Math.max(0, Math.sin(a * 3 + 1))), ex = shx + 28 * S * Math.sin(a), ey = shy - 28 * S * Math.cos(a);
          const wx = ex + 26 * S * Math.sin(a + e), wy = ey - 26 * S * Math.cos(a + e);
          p1(X(shx), Y(shy), X(ex), Y(ey)); p2(X(ex), Y(ey), X(wx), Y(wy));
        };
        arm(armAng(this.phi), pp.nearArm1, pp.nearArm2);
        arm(armAng(this.phi + 0.5), pp.farArm1, pp.farArm2);
        // ticks del suelo
        const off = -((r.x * PX) % 85);
        svg.querySelector('#gt').setAttribute('transform', `translate(${off} 0)`);
        // huellas
        const fp = svg.querySelector('#gfp');
        const lane = (mode === 'tandem' ? 0 : 8) * PX / 2, cy = 66;
        const prints = g.st.prints;
        let h = `<rect x="0" y="0" width="800" height="136" rx="8" fill="#dde6ee"/><text x="12" y="16" class="svg-small">Huellas (vista desde arriba)</text>
          <line x1="0" y1="${cy}" x2="800" y2="${cy}" stroke="#b7c4d1" stroke-dasharray="6 5"/>`;
        prints.forEach(p => {
          const x = X(p.wx - r.x + r.x) - r.x * PX + (GMODE[mode].toe ? 11 : 6) * PX * 0 + 0;
          const px = CX + (p.wx - r.x) * PX + (mode === 'toe' ? -6 : 11) * PX;
          const py = cy + (p.f === 'R' ? lane : -lane);
          const rot = (p.f === 'R' ? 1 : -1) * GMODE[mode].toe;
          if (px > -40 && px < 840) h += `<ellipse cx="${px}" cy="${py}" rx="${(mode === 'toe' ? 6 : 11) * PX}" ry="${(mode === 'toe' ? 4 : 4.5) * PX}" transform="rotate(${rot} ${px} ${py})" fill="${p.f === 'R' ? '#1f6f8b' : '#5a9e4b'}" opacity=".85"/>`;
        });
        let stepTxt = '', strideTxt = '';
        if (prints.length >= 3) {
          const a = prints[prints.length - 1], b = prints[prints.length - 2], c2 = prints[prints.length - 3];
          const st1 = Math.abs(a.wx - b.wx), st2 = Math.abs(a.wx - c2.wx);
          const ax = CX + (a.wx - r.x) * PX, bx = CX + (b.wx - r.x) * PX, cx2 = CX + (c2.wx - r.x) * PX;
          if (learn) {
            h += `<line x1="${bx}" x2="${ax}" y1="30" y2="30" stroke="#c0392b" stroke-width="2"/><text x="${(ax + bx) / 2}" y="26" text-anchor="middle" class="svg-small">paso ${Math.round(st1)} cm</text>
              <line x1="${cx2}" x2="${ax}" y1="118" y2="118" stroke="#2c7be5" stroke-width="2"/><text x="${(ax + cx2) / 2}" y="132" text-anchor="middle" class="svg-small">zancada ${Math.round(st2)} cm</text>`;
          }
          stepTxt = Math.round(st1); strideTxt = Math.round(st2);
        }
        if (learn && mode !== 'tandem') h += `<line x1="40" x2="40" y1="${cy - lane}" y2="${cy + lane}" stroke="#38495a" stroke-width="2"/><text x="48" y="${cy + 4}" class="svg-small">base ≈ 8 cm</text>`;
        fp.innerHTML = h;
        // fase
        const ph = ((this.phi % 1) + 1) % 1, name = phaseOf(ph);
        this.stage.querySelector('#gPhT').textContent = Math.round(ph * 100) + ' %';
        this.stage.querySelector('#gMk').style.left = (ph * 100) + '%';
        if (!scrub || true) this.stage.querySelector('#gPh').value = Math.round(ph * 100);
        const bar = this.stage.querySelector('#gBar');
        bar.style.display = learn ? '' : 'none';
        const stEl = this.stage.querySelector('#gSt');
        if (learn) {
          const m = c.msk, stp = Math.round(m.sim || m.step), sp = (stp * m.cad / 6000);
          const tx = {
            normal: `Ciclo = una zancada (dos pasos). <b>Apoyo 60 %</b> (doble apoyo 10 % + apoyo simple 40 % + doble apoyo 10 %) y <b>balanceo 40 %</b>. Cadencia ${m.cad} pasos/min (normal 100-120), longitud del paso ≈ ${stp} cm (60-80 cm), velocidad ≈ ${fmt(sp)} m/s (1,2-1,4 m/s en el adulto; algo menor en el adulto mayor), base de sustentación 5-10 cm, pies ligeramente abiertos (5-7°), braceo recíproco (el brazo avanza con la pierna contraria) y oscilación vertical de la pelvis de 4-5 cm.`,
            heel: 'Marcha en talones: sostiene la dorsiflexión durante todo el ciclo; explora el tibial anterior y los dorsiflexores (L4-L5, nervio peroneo profundo). Normal: camina sin que caigan las puntas ni pierda el equilibrio. Paso algo más corto.',
            toe: 'Marcha en puntas de pie: apoyo sobre el antepié sin que descienda el talón; explora gastrocnemio y sóleo (S1, nervio tibial). Normal: camina varios pasos con el talón elevado y sin balancearse.',
            tandem: 'Marcha en tándem: el talón de un pie toca la punta del otro, en línea recta; base de sustentación ≈ 0. Explora el equilibrio, la propiocepción y la función cerebelosa/vestibular. Normal: ≥ 10 pasos sin desviarse ni separar los pies.'
          }[mode];
          stEl.innerHTML = `<div class="msk-card"><p><b>Fase actual:</b> ${esc(name[2])} · <i>${esc(name[3])}</i> (${Math.round(ph * 100)} % del ciclo)${stepTxt ? ` · paso medido ${stepTxt} cm, zancada ${strideTxt} cm` : ''}</p><p>${tx}</p></div>`;
        } else {
          stEl.innerHTML = `<p>Observa la marcha y registra tus conclusiones en el cuestionario.</p>`;
        }
        if (!this._logged || this._logged !== mode) {
          this._logged = mode;
          if (this.playing && sh.mode === 'learn') sh.log({ normal: 'Marcha normal observada: apoyo 60 % / balanceo 40 %.', heel: 'Marcha en talones normal.', toe: 'Marcha en puntas de pie normal.', tandem: 'Marcha en tándem normal, sin desviaciones.' }[mode], 'find');
          else if (sh.mode !== 'learn') sh.log({ normal: 'Marcha observada.', heel: 'Marcha en talones observada.', toe: 'Marcha en puntas de pie observada.', tandem: 'Marcha en tándem observada.' }[mode]);
          sh.explored('gait:' + mode);
        }
      }
    };
    return sc;
  }

  /* ----------------------------------------------------------------- QUIZ */
  /* 8 preguntas; la 1.ª y la 2.ª dependen de la persona examinada. */
  const QUIZ = c => {
    const A = activeTope(MOT['sh.flex'], c), sch = c.msk.schober;
    return [
      { q: `Esta persona (${c.age} años) alcanza ${A}° de flexión activa de hombro, sin dolor y simétrica. ¿Cómo se interpreta?`, options: ['Limitación que requiere estudio por imágenes', 'Hipermovilidad', 'Normal: rango 0-180°, con leve descenso fisiológico con la edad', 'Solo es valorable la movilidad pasiva'], a: 2,
        why: 'La flexión normal del hombro llega a 180° (como la abducción); unos grados menos en el adulto mayor, sin dolor y de forma simétrica, son fisiológicos.' },
      { q: `Prueba de Schober en esta persona: la distancia de 10 cm pasa a ${fmt(sch)} cm en flexión máxima. Interpretación`, options: ['Rigidez lumbar (incremento insuficiente)', 'Normal: incremento ≥ 4-5 cm (≥ 15 cm)', 'Hipermovilidad lumbar', 'No es valorable en bipedestación'], a: 1,
        why: 'Marcas a nivel de la unión lumbosacral y 10 cm por encima; en flexión la distancia debe llegar a ≥ 15 cm. Un incremento menor sugiere rigidez (p. ej., espondilitis anquilosante).' },
      { q: 'Fuerza 5/5 en la escala 0-5 (MRC) significa', options: ['Contracción visible sin movimiento', 'Vence la gravedad pero no la resistencia', 'Movimiento solo con la gravedad eliminada', 'Fuerza normal: vence la resistencia máxima'], a: 3, why: '5 = fuerza normal; 4 = vence resistencia moderada; 3 = vence solo la gravedad; 2 = sin gravedad; 1 = contracción sin movimiento; 0 = ausente.' },
      { q: 'El miotoma C7 se explora principalmente con', options: ['Abducción del hombro', 'Flexión del codo', 'Extensión del codo (tríceps)', 'Extensión de la rodilla'], a: 2, why: 'C5 hombro/codo (deltoides, bíceps), C6 extensión de muñeca, C7 extensión del codo, C8 flexión de dedos, T1 abducción de dedos; L2 cadera, L3-L4 rodilla, L4 dorsiflexión, L5 extensión del hallux, S1 flexión plantar.' },
      { q: 'Phalen y Tinel en la muñeca exploran', options: ['El nervio cubital en el codo', 'El nervio radial', 'El nervio tibial', 'El nervio mediano en el túnel carpiano'], a: 3, why: 'En una persona sana son negativos: sin parestesias tras 60 s de flexión (Phalen) ni al percutir el mediano (Tinel).' },
      { q: 'En la marcha normal, la fase de apoyo ocupa aproximadamente', options: ['40 %', '50 %', '60 %', '70 %'], a: 2, why: 'Apoyo 60 % (con dos períodos de doble apoyo de 10 %) y balanceo 40 % del ciclo.' },
      { q: 'En un Trendelenburg negativo, al apoyarse sobre una pierna la pelvis del lado levantado', options: ['Se mantiene nivelada o asciende ligeramente', 'Cae', 'Rota hacia el lado de apoyo', 'Asciende más de 15°'], a: 0, why: 'Los abductores del lado de apoyo (glúteo medio y menor, L4-S1, nervio glúteo superior) estabilizan la pelvis.' },
      { q: 'El signo de Lasègue se considera positivo cuando', options: ['Aparece tensión en los isquiotibiales a 80-90°', 'Aparece dolor radicular (ciático) entre 30° y 70° de elevación', 'La rodilla se flexiona al elevar la pierna extendida', 'Duele la región lumbar al bajar la pierna'], a: 1,
        why: 'La tensión posterior del muslo cerca de 70-90° es normal; el dolor irradiado por debajo de la rodilla entre 30° y 70° indica compresión radicular L5-S1. En esta persona es negativo.' }
    ];
  };

  function recordHTML(c) {
    return QUIZ(c).map((q, i) => `<label class="field">${i + 1}. ${esc(q.q)}</label>
      <select data-q="${i}" style="width:100%;padding:5px;border:1px solid var(--line);border-radius:8px;background:var(--panel)">
      <option value="">–</option>${q.options.map((o, j) => `<option value="${j}">${esc(o)}</option>`).join('')}</select>`).join('');
  }
  function evaluate(c, rec) {
    const qs = QUIZ(c);
    let ok = 0;
    const rows = qs.map((q, i) => {
      const v = rec.querySelector(`select[data-q="${i}"]`).value, good = v !== '' && +v === q.a;
      if (good) ok++;
      return `<li>${good ? '<span class="m-ok">✔</span>' : '<span class="m-bad">✘</span>'} <b>${esc(q.options[q.a])}</b>. ${esc(q.why)}</li>`;
    }).join('');
    return { ok, total: qs.length, html: `<h4>Cuestionario</h4><p><b>${ok}</b> de ${qs.length} correctas.</p><ul>${rows}</ul>` };
  }

  /* Claves explorables (progreso): inspección y palpación por articulación, movilidad activa y pasiva por movimiento,
     columna, fuerza/tono/trofismo, maniobras y marcha. */
  const PROGRESS_TOTAL = (() => {
    const moves = Object.keys(MOT).filter(k => !MOT[k].hidden);
    return JOINTS.length * 2 + moves.length * 2 +
      (13 + 3 + 4) +                          // columna: inspección/plomada (13 regiones), palpación (3), Schober, Lasègue, Bragard, dedo-suelo
      MUS.length * 2 + 2 + 2 +                // fuerza: gravedad y resistencia por músculo; tono y trofismo por miembro
      MAN.length +                            // maniobras especiales
      4 + 2;                                  // marcha: 4 modos + Trendelenburg (2 lados)
  })();
  const REFS = [
    'Argente HA, Álvarez ME. <i>Semiología Médica</i>. Panamericana — Sistema osteoarticular y muscular: inspección, palpación, movilidad activa y pasiva, maniobras; columna vertebral; marcha.',
    'Norkin CC, White DJ. <i>Measurement of Joint Motion: A Guide to Goniometry</i>. F. A. Davis (rangos articulares y técnica goniométrica; donde las fuentes difieren se indica el rango).',
    'Medical Research Council. <i>Aids to the examination of the peripheral nervous system</i> (escala de fuerza 0-5).'
  ];

  function mount(root) {
    injectCSS();
    const sh = new Shell(root, {
      id: 'msk', progressTotal: PROGRESS_TOTAL, refs: REFS,
      cases: CASES,
      scenes: { rom: makeRomScene(), spine: makeColScene(), strength: makeStrScene(), special: makeManScene(), gait: makeGaitScene() },
      order: ['rom', 'spine', 'strength', 'special', 'gait'],
      hideDx: true,
      checkLabel: 'Comprobar mis respuestas', recordTitle: 'Cuestionario', patientTitle: 'Persona examinada',
      caseLabel: (c, i) => `Persona ${i + 1} · ${c.age} años, ${c.sex}`,
      record: recordHTML, evaluate,
      teaching: [
        'Examen osteoarticular en orden: inspección (tumefacción, deformidad, atrofia), palpación (dolor, calor, derrame, crepitación), movilidad activa y luego pasiva (goniometría) y maniobras especiales; siempre comparando ambos lados.',
        'Goniómetro: eje sobre el eje articular, brazo fijo en el segmento proximal y brazo móvil en el distal; los rangos normales varían según la fuente, por eso se indica un rango, y descienden levemente con la edad.',
        'La sensación terminal normal es firme, blanda (flexión de codo, rodilla y cadera) o dura (extensión de codo); un tope anormal o doloroso sugiere patología articular.',
        'Fuerza: motilidad activa contra gravedad y luego contra resistencia, graduada de 0 a 5, por miotomas (C5-T1, L2-S1); se completa con tono (motilidad pasiva) y trofismo (perímetros).',
        'Columna: curvaturas, plomada y niveles, palpación de apófisis espinosas y paravertebrales, Schober (10 → ≥ 15 cm), Lasègue (negativo: tensión isquiotibial a 70-90° sin dolor radicular) y distancia dedo-suelo.',
        'Las maniobras especiales se interpretan por comparación con el lado sano; en la exploración normal todas son negativas. La marcha normal tiene 60 % de apoyo y 40 % de balanceo.'
      ]
    });
    sh.start();
    return sh;
  }

  window.MskModule = { mount, _test: { makeGait, measureStep, ampFor, MOT, MAN, MUS, CASES, PROGRESS_TOTAL, QUIZ } };

  registerModule({
    id: 'msk', title: 'Aparato locomotor (normal)', icon: '🦴', group: 'Exploración normal',
    desc: 'Examen osteoarticular y muscular normal: inspección, palpación, movilidad activa y pasiva con goniómetro, columna, fuerza, tono y trofismo, maniobras especiales y marcha.',
    bullets: ['Inspección, palpación y goniómetro interactivo con movilidad activa y pasiva', 'Columna: curvaturas, plomada, palpación, Schober, Lasègue y dedo-suelo', 'Fuerza 0-5 por miotomas, tono y trofismo', 'Maniobras especiales animadas y marcha con fases del ciclo'],
    refs: REFS,
    mount: root => mount(root)
  });
})();
