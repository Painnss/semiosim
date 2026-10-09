/* Módulo "Genitourinario y mama (normal)".
   Solo diagramas esquemáticos y texto técnico: mapas de cuadrantes, cortes esquemáticos y siluetas lineales abstractas.
   Usa NormalEngine.build con ganchos `after` para controles propios. */
(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const INK = '#5b7083', FILL = '#f6efe6', SOFT = '#fbf3d5', TEAL = '#0e6a78';

  /* ---------- datos normales por persona (clave = id de NormalEngine.people; valor por defecto según sexo) ---------- */
  const PD = {
    p1: { diu: '1 500', mic: '5', nic: 'sin nicturia', dens: '1,015', ph: '6,0', kidney: true, color: '#f3e27c', meno: false },
    p2: { diu: '1 400', mic: '5', nic: 'sin nicturia', dens: '1,020', ph: '5,5', kidney: false, color: '#efd45f',
          testL: '5', testV: '22', prost: '3–3,5', prostG: '≈ 20 g', prostNote: '' },
    p3: { diu: '1 200', mic: '5–6', nic: 'nicturia ≤ 1 (habitual a esta edad)', dens: '1,012', ph: '6,0', kidney: false, color: '#f5e68a',
          testL: '4', testV: '15', prost: '4', prostG: '≈ 25 g', prostNote: ' Está en el límite superior de lo normal, como es habitual a esta edad, sin asimetría ni borramiento del surco.' },
    p4: { diu: '1 300', mic: '5–6', nic: 'nicturia ocasional (≤ 1), sin urgencia ni incontinencia', dens: '1,018', ph: '6,0', kidney: false, color: '#f1dc74', meno: true }
  };
  const pd = c => PD[c.id] || (c.sex === 'F' ? (c.age >= 50 ? PD.p4 : PD.p1) : PD.p2);
  const isF = c => c.sex === 'F';
  const isMeno = c => isF(c) && (PD[c.id] ? !!PD[c.id].meno : c.age >= 50);

  /* personas disponibles de cada sexo (según NormalEngine.people), para los avisos */
  const whoIs = sex => {
    const l = (NormalEngine.people || []).map((p, i) => (p.sex === sex ? i + 1 : 0)).filter(Boolean);
    return l.length ? `elige la persona ${l.join(' o ')}` : 'elige una persona de ese sexo';
  };
  const NOT_M = () => `Este apartado corresponde a un varón. Esta persona es una mujer: ${whoIs('M')}, o ve a «Genitales femeninos».`;
  const NOT_F = () => `Este apartado corresponde a una mujer. Esta persona es un varón: ${whoIs('F')}, o ve a «Genitales masculinos».`;
  const mOnly = f => (c, ctx) => (isF(c) ? NOT_M() : (typeof f === 'function' ? f(c, ctx) : f));
  const fOnly = f => (c, ctx) => (!isF(c) ? NOT_F() : (typeof f === 'function' ? f(c, ctx) : f));

  /* ---------- estado y limpieza ---------- */
  const ST = { key: '', posture: 'caidos', tech: 'bandas' };
  function st(c) {
    const k = c.age + c.sex;
    if (ST.key !== k) { ST.key = k; ST.posture = 'caidos'; ST.tech = 'bandas'; }
    return ST;
  }
  const RT = { handCancel: null, handG: null };
  function clearRT() {
    if (RT.handCancel) { RT.handCancel(); RT.handCancel = null; }
    if (RT.handG && RT.handG.parentNode) RT.handG.remove();
    RT.handG = null;
  }

  /* ---------- mano y notas animadas ---------- */
  function hand(ctx, deep, bim) {
    clearRT();
    const fl = ctx.svg.querySelector('#flash');
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('pointer-events', 'none');
    const back = bim ? '<rect x="-17" y="-6" width="34" height="34" rx="10" fill="#e6b88d" stroke="#b98a63" stroke-width="1.5" stroke-dasharray="4 3" opacity=".6" transform="translate(16 16) rotate(14)"/>' : '';
    g.innerHTML = back + `<g fill="#f1c9a5" stroke="#b98a63" stroke-width="1.6"><rect x="-17" y="0" width="34" height="26" rx="10"/>` +
      `<rect x="-17" y="-30" width="7" height="34" rx="3.5"/><rect x="-9" y="-33" width="7" height="37" rx="3.5"/>` +
      `<rect x="-1" y="-33" width="7" height="37" rx="3.5"/><rect x="7" y="-29" width="7" height="33" rx="3.5"/>` +
      `<ellipse cx="-21" cy="10" rx="5" ry="12" transform="rotate(25 -21 10)"/></g>`;
    fl.appendChild(g);
    RT.handG = g;
    const p = ctx.point;
    RT.handCancel = U.tween(1600, u => {
      let dx, dy, sc, op;
      if (u < 0.25) { const t = u / 0.25; dx = 50 * (1 - t); dy = 60 * (1 - t); sc = 1.04; op = t; }
      else if (u < 0.5) { const t = (u - 0.25) / 0.25; dx = 0; dy = (deep ? 3 : 1) * t; sc = 1.04 - (deep ? 0.1 : 0.04) * t; op = 1; }
      else if (u < 0.78) { const t = (u - 0.5) / 0.28; dx = Math.sin(t * Math.PI * 2) * (deep ? 4 : 7); dy = (deep ? 3 : 1) + Math.cos(t * Math.PI * 2) * (deep ? 1 : 3); sc = 1.04 - (deep ? 0.1 : 0.04); op = 1; }
      else { const t = (u - 0.78) / 0.22; dx = 40 * t; dy = 50 * t; sc = 0.98 + 0.06 * t; op = 1 - t; }
      g.setAttribute('transform', `translate(${p.x + dx} ${p.y + 14 + dy}) scale(${sc})`);
      g.setAttribute('opacity', op);
    }, () => { g.remove(); if (RT.handG === g) RT.handG = null; });
  }
  function note(ctx, txt) {
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', ctx.point.x); t.setAttribute('y', ctx.point.y - 22);
    t.setAttribute('text-anchor', 'middle'); t.setAttribute('class', 'svg-title'); t.setAttribute('pointer-events', 'none');
    t.textContent = txt;
    ctx.svg.querySelector('#flash').appendChild(t);
    U.tween(1500, u => { t.setAttribute('opacity', u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3); t.setAttribute('y', ctx.point.y - 22 - 10 * u); }, () => t.remove());
  }
  const H = (html, deep, bim) => ({ html, run: ctx => hand(ctx, deep, bim) });
  const N = (html, txt) => ({ html, run: ctx => note(ctx, txt) });

  const banner = (c, need) => ((need === 'M' && isF(c)) || (need === 'F' && !isF(c)))
    ? `<g><rect x="150" y="4" width="460" height="26" rx="13" fill="#fff4d6" stroke="#e0a030"/><text x="380" y="22" text-anchor="middle" class="svg-small" style="fill:#7a5200">${need === 'M' ? `Apartado de varones: ${whoIs('M')}.` : `Apartado de mujeres: ${whoIs('F')}.`}</text></g>` : '';

  const panelTitle = (x, y, t) => `<text x="${x}" y="${y}" class="svg-title" text-anchor="middle">${t}</text>`;

  /* ---------- capa anatómica translúcida (#anat) ----------
     Diagramas esquemáticos: riñón #c0504d, vejiga #e8cd5a, glándula/ovario #e8d27a, hueso #f1e9dc, tendón #f5f0e6, ganglio #cfe0b0. */
  const al = (txt, x, y, anchor) => `<text class="svg-small" x="${x}" y="${y}" text-anchor="${anchor || 'middle'}" style="paint-order:stroke;stroke:#fff;stroke-width:3px;stroke-linejoin:round">${txt}</text>`;
  const kidney = (cx, cy, rot, hil) => `<ellipse cx="${cx}" cy="${cy}" rx="15" ry="32" transform="rotate(${rot} ${cx} ${cy})" fill="#c0504d" fill-opacity=".8" stroke="#8a3a3a" stroke-width="1.2"/>` +
    (hil ? `<ellipse cx="${cx + hil}" cy="${cy}" rx="5" ry="10" fill="#f2d6c6" fill-opacity=".9" stroke="#8a3a3a" stroke-width=".8"/>` : '');
  const bladder = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#e8cd5a" fill-opacity=".85" stroke="#b79a1a" stroke-width="1.5"/>`;
  const uterusSm = (cx, cy) => `<path d="M${cx - 13},${cy + 6} C${cx - 27},${cy - 2} ${cx - 37},${cy + 4} ${cx - 39},${cy + 14} M${cx + 13},${cy + 6} C${cx + 27},${cy - 2} ${cx + 37},${cy + 4} ${cx + 39},${cy + 14}" fill="none" stroke="#a35a6c" stroke-width="2"/>` +
    `<ellipse cx="${cx - 41}" cy="${cy + 18}" rx="5" ry="7" fill="#e8d27a" stroke="#a35a6c" stroke-width="1"/><ellipse cx="${cx + 41}" cy="${cy + 18}" rx="5" ry="7" fill="#e8d27a" stroke="#a35a6c" stroke-width="1"/>` +
    `<path d="M${cx},${cy} C${cx + 13},${cy} ${cx + 19},${cy + 14} ${cx + 15},${cy + 28} C${cx + 11},${cy + 40} ${cx - 11},${cy + 40} ${cx - 15},${cy + 28} C${cx - 19},${cy + 14} ${cx - 13},${cy} ${cx},${cy} Z" fill="#d98fa0" fill-opacity=".9" stroke="#a35a6c" stroke-width="1.5"/>`;

  function anatRin(learn, c) {
    let s = '';
    /* vista posterior: riñones bajo la 12.ª costilla (el izquierdo más alto; a la izquierda de la pantalla) */
    s += kidney(96, 160, 8) + kidney(164, 172, -8);
    /* vista anterior: riñones, pelvis renal, uréteres, vejiga y próstata o útero según el sexo */
    s += kidney(338, 225, 10, 6) + kidney(432, 213, -10, -6);
    s += `<path d="M344,256 C346,300 356,350 370,396 M426,244 C424,300 414,350 400,396" fill="none" stroke="#c9a23a" stroke-width="3.5"/>`;
    if (isF(c)) s += uterusSm(385, 362);
    s += bladder(385, 402, 30, 18);
    if (!isF(c)) s += `<circle cx="385" cy="424" r="9" fill="#f2d6c6" stroke="#9a7b8a" stroke-width="1.5"/>`;
    s += al('Riñón I', 96, 214) + al('Riñón D', 164, 226) + al('Riñón D', 338, 186) + al('Riñón I', 432, 174) + al('Uréter D', 356, 318, 'start') + al('Vejiga', 385, 406);
    s += isF(c) ? al('Útero', 402, 372, 'start') : al('Próstata', 398, 428, 'start');
    return s;
  }

  function anatMasc() {
    let s = '';
    /* esquema frontal: conducto inguinal (del anillo profundo al superficial), conducto deferente, vasos femorales y ganglios */
    [[452, 500, 448, 460, 476, -1], [668, 620, 672, 660, 644, 1]].forEach(([dx, sx, ax, vx, ex, d]) => {
      s += `<path d="M${dx},104 L${sx},130" stroke="#d9d0bd" stroke-width="16" stroke-linecap="round"/><path d="M${dx},104 L${sx},130" stroke="#f5f0e6" stroke-width="12" stroke-linecap="round"/>`;
      s += `<circle cx="${dx}" cy="104" r="7" fill="none" stroke="#9a7b5a" stroke-width="1.5" stroke-dasharray="3 2"/>`;
      s += `<path d="M${ax},120 L${ax},190" stroke="#c0392b" stroke-width="5" stroke-linecap="round"/><path d="M${vx},122 L${vx},192" stroke="#4a6fa5" stroke-width="5" stroke-linecap="round"/>`;
      [[-24, 20], [-6, 30], [14, 38]].forEach(([ox, oy]) => { s += `<ellipse cx="${dx + d * -ox}" cy="${104 + oy}" rx="6" ry="4" transform="rotate(${-d * 17} ${dx + d * -ox} ${104 + oy})" fill="#cfe0b0" stroke="#7f9a5a" stroke-width="1"/>`; });
      s += `<path d="M${ex},300 C${ex + d * 16},260 ${sx},190 ${sx},140 L${dx},104 C${dx - d * 12},92 ${dx - d * 32},96 ${dx - d * 42},110" fill="none" stroke="#8a6a4a" stroke-width="2"/>`;
    });
    s += al('Anillo profundo', 444, 90, 'end') + al('Conducto inguinal', 512, 112, 'start') + al('Vasos femorales', 446, 196, 'end') + al('Conducto deferente', 508, 238, 'start');
    return s;
  }

  function anatFem() {
    let s = '';
    /* mapa vulvar: bulbos vestibulares, glándulas de Bartolino (4 y 8 h) y de Skene */
    s += `<ellipse cx="${VX - 27}" cy="226" rx="7" ry="28" fill="#c98ea0" fill-opacity=".6" stroke="#9a5a6c" stroke-width="1"/><ellipse cx="${VX + 27}" cy="226" rx="7" ry="28" fill="#c98ea0" fill-opacity=".6" stroke="#9a5a6c" stroke-width="1"/>`;
    s += `<ellipse cx="${VX - 24}" cy="264" rx="7" ry="9" fill="#e8d27a" stroke="#a08a3a" stroke-width="1"/><ellipse cx="${VX + 24}" cy="264" rx="7" ry="9" fill="#e8d27a" stroke="#a08a3a" stroke-width="1"/>`;
    s += `<circle cx="${VX - 7}" cy="186" r="3" fill="#e8d27a" stroke="#a08a3a" stroke-width=".8"/><circle cx="${VX + 7}" cy="186" r="3" fill="#e8d27a" stroke="#a08a3a" stroke-width=".8"/>`;
    /* corte sagital: sacro, trompa y ovario (anexo) */
    s += `<path d="M548,86 C574,160 566,250 540,330" fill="none" stroke="#c9b99a" stroke-width="16" stroke-linecap="round"/><path d="M548,86 C574,160 566,250 540,330" fill="none" stroke="#f1e9dc" stroke-width="12" stroke-linecap="round"/>`;
    s += `<path d="M380,122 C408,100 438,112 452,132" fill="none" stroke="#a35a6c" stroke-width="2.5"/><ellipse cx="456" cy="148" rx="8" ry="12" fill="#e8d27a" stroke="#a35a6c" stroke-width="1"/>`;
    s += al('Bulbo vestibular', VX - 36, 196, 'end') + al('Gl. de Skene', VX + 14, 170, 'start') + al('Trompa', 414, 100) + al('Sacro', 556, 72);
    return s;
  }

  function anatMama(learn, c) {
    let s = '';
    ['R', 'L'].forEach(k => {
      const { cx, cy } = BR[k], dir = k === 'R' ? -1 : 1;
      /* pectoral mayor (plano profundo) esbozado */
      s += `<ellipse cx="${cx + dir * 10}" cy="${cy - 24}" rx="116" ry="92" fill="none" stroke="#e6c7a8" stroke-width="2" stroke-dasharray="6 5"/>`;
      if (isF(c)) {
        /* lóbulos glandulares en torno al pezón con sus conductos; prolongación axilar (cola de Spence) */
        for (let i = 0; i < 12; i++) {
          const a = i * 30, r = a * Math.PI / 180, lx = cx + 58 * Math.cos(r), ly = cy + 58 * Math.sin(r);
          s += `<ellipse cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" rx="26" ry="12" transform="rotate(${a} ${lx.toFixed(1)} ${ly.toFixed(1)})" fill="#f0c8b4" fill-opacity=".85" stroke="#c9927c" stroke-width="1"/>`;
          s += `<path d="M${lx.toFixed(1)},${ly.toFixed(1)} L${cx},${cy}" stroke="#c9927c" stroke-width="1.3"/>`;
        }
        const tx = cx + dir * 98, ty = cy - 94;
        s += `<ellipse cx="${tx}" cy="${ty}" rx="24" ry="10" transform="rotate(${dir === -1 ? -138 : -42} ${tx} ${ty})" fill="#f0c8b4" fill-opacity=".85" stroke="#c9927c" stroke-width="1"/>`;
        s += `<path d="M${tx},${ty} L${cx + dir * 42},${cy - 42}" stroke="#c9927c" stroke-width="1.3"/>`;
      } else {
        s += `<circle cx="${cx}" cy="${cy}" r="12" fill="#f0c8b4" fill-opacity=".85" stroke="#c9927c" stroke-width="1" stroke-dasharray="3 2"/>`;
      }
      s += al(isF(c) ? 'Lóbulos glandulares' : 'Disco retroareolar (< 2 cm)', cx, cy - 36) + al(isF(c) ? 'Conductos galactóforos' : 'Pectoral mayor', cx, cy + 66) + (isF(c) ? al('Pectoral mayor', cx, cy + 110) : '');
    });
    /* axila: ganglios (centrales, pectorales, subescapulares, laterales, apicales y supraclaviculares) y vías linfáticas */
    s += `<path d="M655,336 L655,238 L655,150 L655,84 M606,206 L655,238 M706,206 L655,238 M704,288 L655,238" fill="none" stroke="#7f9a5a" stroke-width="1.5" stroke-dasharray="4 4"/>`;
    [[655, 238], [606, 206], [706, 206], [704, 288], [655, 150], [655, 84]].forEach(([x, y]) => {
      [[-7, -4], [6, -2], [-1, 6]].forEach(([ox, oy]) => { s += `<ellipse cx="${x + ox}" cy="${y + oy}" rx="5" ry="3.5" fill="#cfe0b0" stroke="#7f9a5a" stroke-width="1"/>`; });
    });
    s += al('Vías linfáticas', 650, 292, 'end');
    return s;
  }

  /* =====================================================================
     1) RIÑÓN Y VÍAS URINARIAS
     ===================================================================== */
  function rinSvg(learn, c) {
    const p = pd(c);
    let s = '';
    /* vista posterior */
    s += panelTitle(130, 26, 'Vista posterior');
    s += `<path d="M40,40 L220,40 C228,150 214,260 222,330 L210,430 L50,430 L38,330 C46,260 32,150 40,40 Z" fill="${FILL}" stroke="${INK}" stroke-width="2.5"/>`;
    s += `<path d="M130,40 V430" stroke="${INK}" stroke-width="3" stroke-dasharray="3 6" stroke-linecap="round"/>`;
    s += `<path d="M130,128 Q168,140 206,186 M130,128 Q92,140 54,186" fill="none" stroke="#b5a48f" stroke-width="3"/>`;
    s += `<path d="M44,330 Q130,296 216,330" fill="none" stroke="#b5a48f" stroke-width="3"/>`;
    s += `<text x="238" y="58" class="svg-small">D</text><text x="14" y="58" class="svg-small">I</text>`;
    s += `<g class="hintring"><text x="130" y="116" text-anchor="middle" class="svg-hint">12.ª costilla</text><text x="130" y="318" text-anchor="middle" class="svg-hint">Cresta ilíaca</text></g>`;
    /* vista anterior */
    s += panelTitle(385, 26, 'Vista anterior (esquema)');
    s += `<path d="M290,40 L480,40 C488,150 474,260 482,340 L470,446 L300,446 L288,340 C296,260 282,150 290,40 Z" fill="${FILL}" stroke="${INK}" stroke-width="2.5"/>`;
    s += `<ellipse cx="385" cy="270" rx="5" ry="7" fill="#d8c3a8" stroke="${INK}" stroke-width="1.2"/>`;
    s += `<text x="272" y="58" class="svg-small">D</text><text x="490" y="58" class="svg-small">I</text>`;
    s += `<g class="hintring"><path d="M300,350 H470" stroke="${TEAL}" stroke-width="1.4" stroke-dasharray="4 5" fill="none"/><text x="472" y="354" class="svg-hint">línea biilíaca</text></g>`;
    /* muestra de orina y tira reactiva */
    s += panelTitle(610, 26, 'Orina');
    s += `<path d="M568,90 L652,90 L644,240 C643,252 628,258 610,258 C592,258 577,252 576,240 Z" fill="${p.color}" fill-opacity=".72" stroke="${INK}" stroke-width="2.5"/>`;
    s += `<path d="M568,90 L652,90" stroke="${INK}" stroke-width="3.5"/><path d="M580,128 H640" stroke="#fff" stroke-opacity=".5" stroke-width="3"/>`;
    s += `<text x="610" y="282" text-anchor="middle" class="svg-small">Muestra de orina</text>`;
    s += `<rect x="676" y="90" width="18" height="170" rx="4" fill="#fff" stroke="${INK}" stroke-width="1.6"/>`;
    const tint = ['#f5ecc0', '#f3e29a', '#e8e8b8', '#f2f2f2', '#f2f2f2', '#f0f0e8', '#f5e8c0', '#f5e8d0'];
    tint.forEach((t, i) => { s += `<rect x="679" y="${94 + i * 20.5}" width="12" height="16" fill="${t}"/>`; });
    s += `<text x="685" y="282" text-anchor="middle" class="svg-small">Tira</text>`;
    return s;
  }
  const TIRA = c => `tira reactiva normal: <b>pH ${pd(c).ph}</b> (habitual 5–7), <b>densidad ${pd(c).dens}</b> (1,010–1,025); proteínas, glucosa, cetonas, sangre, nitritos, esterasa leucocitaria y bilirrubina <b>negativos</b>; urobilinógeno normal (0,2–1 mg/dL).`;
  const rinRegions = [
    { id: 'cvd', label: 'Ángulo costovertebral derecho', short: 'ACV D', cx: 158, cy: 168, r: 17, lx: 190, ly: 140, anchor: 'start',
      tools: { perc: () => N('<b>puñopercusión lumbar negativa a la derecha</b> (signo de Giordano negativo): el golpe suave con el borde cubital del puño sobre la mano apoyada en el ángulo costovertebral (entre la 12.ª costilla y la columna) <b>no provoca dolor</b>; solo se percibe el golpe. Puntos costovertebral y costomuscular indoloros a la presión.', 'golpe suave') } },
    { id: 'cvi', label: 'Ángulo costovertebral izquierdo', short: 'ACV I', cx: 102, cy: 168, r: 17, lx: 70, ly: 140, anchor: 'end',
      tools: { perc: () => N('<b>puñopercusión lumbar negativa a la izquierda</b>: sin dolor; el hallazgo es simétrico con el lado derecho.', 'golpe suave') } },
    { id: 'rd', label: 'Riñón derecho (palpación bimanual)', short: 'Riñón D', cx: 338, cy: 232, r: 17, lx: 316, ly: 236, anchor: 'end',
      tools: { palp: c => H(pd(c).kidney
        ? '<b>riñón derecho</b>: con la <b>maniobra de Guyon</b> (bimanual: mano izquierda en la fosa lumbar, que empuja hacia delante, y mano derecha en el flanco, que presiona en inspiración profunda) se palpa el <b>polo inferior</b> en esta persona delgada: liso, redondeado, firme, con <b>peloteo renal</b> (los impulsos de la mano posterior se perciben en la anterior), móvil con la respiración e indoloro. Variante normal en personas delgadas.'
        : '<b>riñón derecho no palpable</b> con la maniobra de Guyon (bimanual) y sin peloteo renal: sin masas ni dolor. Los riñones normales habitualmente no se palpan; el derecho es más bajo que el izquierdo.', true, true) } },
    { id: 'ri', label: 'Riñón izquierdo (palpación bimanual)', short: 'Riñón I', cx: 432, cy: 220, r: 17, lx: 454, ly: 224, anchor: 'start',
      tools: { palp: () => H('<b>riñón izquierdo no palpable</b> con la maniobra de Guyon y sin peloteo: el riñón izquierdo es más alto y más posterior que el derecho; sin masas ni dolor.', true, true) } },
    { id: 'usd', label: 'Punto ureteral superior derecho', short: 'U. sup. D', cx: 347, cy: 268, r: 10, lx: 328, ly: 290, anchor: 'end',
      tools: { palp: () => H('<b>punto ureteral superior derecho</b> (pieloureteral: borde externo del músculo recto a la altura del ombligo): presión profunda <b>indolora</b>.', true, false) } },
    { id: 'usi', label: 'Punto ureteral superior izquierdo', short: 'U. sup. I', cx: 423, cy: 268, r: 10, lx: 442, ly: 290, anchor: 'start',
      tools: { palp: () => H('<b>punto ureteral superior izquierdo</b>: presión profunda <b>indolora</b>.', true, false) } },
    { id: 'umd', label: 'Punto ureteral medio derecho', short: 'U. medio D', cx: 347, cy: 350, r: 10, lx: 328, ly: 372, anchor: 'end',
      tools: { palp: () => H('<b>punto ureteral medio derecho</b> (cruce de la línea biilíaca con el borde externo del recto, en la vertical del tubérculo púbico): <b>indoloro</b>.', true, false) } },
    { id: 'umi', label: 'Punto ureteral medio izquierdo', short: 'U. medio I', cx: 423, cy: 350, r: 10, lx: 442, ly: 372, anchor: 'start',
      tools: { palp: () => H('<b>punto ureteral medio izquierdo</b>: <b>indoloro</b>.', true, false) } },
    { id: 'uid', label: 'Punto ureteral inferior derecho (vía tacto vaginal o rectal)', short: '', cx: 362, cy: 386, r: 8,
      tools: { palp: () => H('<b>punto ureteral inferior</b> (porción yuxtavesical del uréter): no es accesible por palpación abdominal; se explora con el tacto vaginal o rectal y es <b>indoloro</b> en la persona sana.', true, false) } },
    { id: 'uii', label: 'Punto ureteral inferior izquierdo', short: '', cx: 408, cy: 386, r: 8,
      tools: { palp: () => H('<b>punto ureteral inferior izquierdo</b>: indoloro al tacto (vaginal o rectal).', true, false) } },
    { id: 'sup', label: 'Región suprapúbica', short: 'Suprapúbica', cx: 385, cy: 426, r: 16, lx: 385, ly: 466,
      tools: {
        palp: () => H('<b>región suprapúbica</b> blanda e indolora; <b>sin globo vesical</b> (la vejiga vacía no se palpa por encima de la sínfisis del pubis).', false, false),
        perc: () => ({ html: 'región suprapúbica: <b>timpanismo</b> (asas intestinales), sin matidez suprapúbica; no hay globo vesical.', run: () => { try { Sound.percuss('hyper'); } catch (e) { /* noop */ } } })
      } },
    { id: 'cup', label: 'Muestra de orina', short: '', x: 566, y: 88, w: 90, h: 172, rx: 10,
      tools: {
        ojo: c => `orina de color <b>amarillo claro</b>, <b>transparente</b> (límpida), de olor característico suave, con espuma escasa que desaparece pronto. Diuresis normal: <b>800–2 000 mL/día</b> (en esta persona ≈ ${pd(c).diu} mL/día); micción <b>${pd(c).mic} veces al día</b>, ${pd(c).nic}; chorro continuo, sin disuria ni tenesmo.`,
        tira: TIRA
      } },
    { id: 'strip', label: 'Tira reactiva', short: '', x: 672, y: 88, w: 26, h: 176, rx: 6,
      tools: {
        ojo: () => 'la tira reactiva se lee a los 30–120 s según la casilla, comparando con la escala de colores del envase; sin cambios de color anormales.',
        tira: TIRA
      } }
  ];
  const rinon = {
    id: 'rin', label: 'Riñón y vías urinarias', viewBox: '0 0 720 520',
    hint: 'Diagrama esquemático. Puñopercusión lumbar en la vista posterior; palpación bimanual (Guyon), peloteo renal y puntos ureterales en la vista anterior; muestra de orina y tira reactiva.',
    svg: rinSvg,
    anatomy: anatRin,
    tools: [
      { id: 'perc', icon: '👊', label: 'Puñopercusión lumbar', hint: 'Haz clic en un ángulo costovertebral (vista posterior; signo de Giordano) o percute la región suprapúbica.' },
      { id: 'palp', icon: '🤲', label: 'Palpación', hint: 'Palpación bimanual de los riñones (maniobra de Guyon, peloteo), puntos ureterales y región suprapúbica en la vista anterior.' },
      { id: 'ojo', icon: '👁️', label: 'Aspecto de la orina', hint: 'Haz clic en la muestra de orina para ver sus características.' },
      { id: 'tira', icon: '🧪', label: 'Tira reactiva', hint: 'Haz clic en la muestra o en la tira para leer pH, densidad y parámetros químicos.' }
    ],
    regions: rinRegions,
    after(stage) {
      const d = document.createElement('div');
      d.style.cssText = 'padding:10px 14px;border-top:1px solid var(--line);background:var(--panel);font-size:13px;line-height:1.5';
      d.innerHTML = '<b>Orina normal:</b> amarilla clara y transparente · pH 5–7 · densidad 1,010–1,025 · diuresis 800–2 000 mL/día · 4–6 micciones/día. ' +
        '<b>Riñón:</b> puñopercusión lumbar negativa; no palpable con la maniobra de Guyon (salvo el polo inferior derecho en personas delgadas) · <b>puntos ureterales</b> superior, medio e inferior indoloros.';
      stage.appendChild(d);
    },
    onLeave: clearRT
  };

  /* =====================================================================
     2) GENITALES MASCULINOS (diagramas esquemáticos)
     ===================================================================== */
  function mascSvg(learn, c) {
    let s = banner(c, 'M');
    /* corte sagital esquemático */
    s += panelTitle(175, 46, 'Corte sagital (diagrama)');
    s += `<rect x="116" y="110" width="16" height="64" rx="8" fill="#e6dccd" stroke="${INK}" stroke-width="2"/>`;           // sínfisis
    s += `<ellipse cx="192" cy="104" rx="56" ry="36" fill="${SOFT}" stroke="#b79a1a" stroke-width="2"/>`;                 // vejiga
    s += `<circle cx="205" cy="200" r="26" fill="#f2d6c6" stroke="${INK}" stroke-width="2"/>`;                              // próstata
    s += `<path d="M205,138 V236 Q205,264 160,272 L148,278" fill="none" stroke="#9a7b5a" stroke-width="4"/>`;              // uretra
    s += `<path d="M148,262 L52,262 Q34,262 34,279 Q34,296 52,296 L148,296 Z" fill="${FILL}" stroke="${INK}" stroke-width="2"/>`; // pene (esquema)
    s += `<path d="M70,262 V296" stroke="${INK}" stroke-width="1.5"/><circle cx="36" cy="279" r="3" fill="#9a7b5a"/>`;
    s += `<path d="M112,300 Q160,386 236,300" fill="none" stroke="${INK}" stroke-width="2"/>`;                              // escroto
    s += `<ellipse cx="170" cy="334" rx="15" ry="24" fill="#efe3d4" stroke="${INK}" stroke-width="2"/>`;                    // testículo
    s += `<path d="M184,318 C196,332 196,346 184,358" fill="none" stroke="#b79a7a" stroke-width="4"/>`;                    // epidídimo
    s += `<path d="M244,70 C240,150 230,210 244,258 L252,336 M298,70 C302,150 314,210 300,258 L292,336" fill="none" stroke="${INK}" stroke-width="2.5"/>`; // recto
    s += `<path d="M252,310 H292 M254,322 H290" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;                 // esfínter
    s += `<text x="272" y="356" class="svg-small" text-anchor="middle">canal anal</text>`;
    s += `<g class="hintring"><path d="M290,368 L272,236" stroke="#d9534f" stroke-width="3" stroke-dasharray="6 5" fill="none"/><path d="M272,236 l-5,12 m5,-12 l7,11" stroke="#d9534f" stroke-width="3" fill="none"/>` +
         `<text x="296" y="384" class="svg-hint">dedo (tacto rectal)</text>` +
         `<text x="192" y="62" class="svg-hint" text-anchor="middle">Vejiga</text>` +
         `<text x="104" y="150" class="svg-hint" text-anchor="end">Sínfisis</text><text x="306" y="160" class="svg-hint">Ampolla rectal</text></g>`;
    /* esquema inguinoescrotal frontal */
    s += panelTitle(560, 46, 'Esquema inguinoescrotal (frontal)');
    s += `<rect x="440" y="70" width="240" height="40" rx="12" fill="none" stroke="#b5a48f" stroke-width="2" stroke-dasharray="2 5"/>`;
    s += `<path d="M400,100 L500,130 M720,100 L620,130" stroke="#c9a283" stroke-width="3" fill="none"/>`;                     // ligamentos inguinales
    s += `<circle cx="500" cy="130" r="10" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="620" cy="130" r="10" fill="#fff" stroke="${INK}" stroke-width="2"/>`;
    s += `<path d="M500,140 C500,190 494,230 494,262 M620,140 C620,190 626,236 626,276" fill="none" stroke="#b79a7a" stroke-width="7" stroke-linecap="round"/>`;  // cordones
    s += `<path d="M456,236 Q426,310 470,388 Q560,436 650,388 Q694,310 664,236" fill="none" stroke="${INK}" stroke-width="2.5"/><path d="M560,250 V418" stroke="#b5a48f" stroke-width="2" stroke-dasharray="4 5"/>`;
    s += `<ellipse cx="500" cy="316" rx="24" ry="36" fill="#efe3d4" stroke="${INK}" stroke-width="2.5"/>`;
    s += `<ellipse cx="620" cy="330" rx="24" ry="36" fill="#efe3d4" stroke="${INK}" stroke-width="2.5"/>`;
    s += `<path d="M472,290 C456,310 456,336 474,356" fill="none" stroke="#b79a7a" stroke-width="6"/><path d="M648,304 C664,324 664,350 646,370" fill="none" stroke="#b79a7a" stroke-width="6"/>`;
    s += `<text x="402" y="90" class="svg-small">D</text><text x="706" y="90" class="svg-small">I</text>`;
    s += `<g class="hintring"><text x="560" y="94" class="svg-hint" text-anchor="middle">Vello púbico</text>` +
         `<text x="500" y="154" class="svg-hint" text-anchor="middle">Anillo superficial</text><text x="620" y="154" class="svg-hint" text-anchor="middle">Anillo superficial</text>` +
         `<text x="440" y="316" class="svg-hint" text-anchor="end">Epidídimo</text><text x="500" y="372" class="svg-hint" text-anchor="middle">Testículo D</text><text x="620" y="388" class="svg-hint" text-anchor="middle">Testículo I</text></g>`;
    return s;
  }
  const tdim = c => `${pd(c).testL || '4,5'} cm de longitud (≈ ${pd(c).testV || '20'} mL)`;
  const mTools = (o) => { const r = {}; Object.keys(o).forEach(k => { r[k] = mOnly(o[k]); }); return r; };
  const testis = (lado) => ({
    insp: () => `testículo ${lado} en el escroto, de posición normal; el izquierdo suele colgar algo más bajo. Escroto de piel rugosa, algo pigmentada, sin eritema, edema ni lesiones.`,
    palp: c => `testículo ${lado} (palpado entre el pulgar y los dedos índice y medio, comparando ambos lados): ovoide, de ${tdim(c)} (normal 4–5 cm de eje mayor, 15–25 mL), de consistencia <b>firme-elástica</b>, superficie <b>lisa</b>, <b>móvil</b> e indoloro, sin nódulos ni masas; la presión leve produce la sensibilidad testicular normal.`,
    trans: () => '<b>transiluminación negativa</b>: con la luz apoyada en la cara posterior del escroto el testículo se ve opaco y no hay halo luminoso; no hay hidrocele.'
  });
  const masc = {
    id: 'masc', label: 'Genitales masculinos', viewBox: '0 0 760 520',
    hint: 'Diagrama esquemático. Garantiza consentimiento, privacidad y, si procede, acompañante. Inspección, palpación testicular, transiluminación, hernias con Valsalva y tacto rectal.',
    svg: mascSvg,
    anatomy: anatMasc,
    tools: [
      { id: 'insp', icon: '👁️', label: 'Inspección', hint: 'Vello púbico, pene, glande y meato, escroto y testículos.' },
      { id: 'palp', icon: '✋', label: 'Palpación', hint: 'Testículos, epidídimo, cordón espermático y ganglios inguinales con ambas manos, comparando los dos lados.' },
      { id: 'trans', icon: '🔦', label: 'Transiluminación', hint: 'Luz en la cara posterior del escroto: distingue contenido líquido de sólido.' },
      { id: 'vals', icon: '💨', label: 'Valsalva (hernias)', hint: 'Con el paciente de pie, tos o Valsalva con el dedo en el anillo inguinal superficial.' },
      { id: 'tacto', icon: '☝️', label: 'Tacto rectal', hint: 'Decúbito lateral izquierdo (Sims), genupectoral o de pie inclinado: dedo enguantado y lubricado; evalúa el esfínter, la ampolla rectal y la próstata.' }
    ],
    regions: [
      { id: 'vello', label: 'Vello púbico', short: '', x: 440, y: 70, w: 240, h: 40, rx: 12,
        tools: { insp: mOnly(() => 'vello púbico de tipo adulto (<b>Tanner 5</b>): distribución androide, en rombo, con extensión hacia el ombligo y la cara interna de los muslos; piel sin lesiones, sin parásitos ni eritema.') } },
      { id: 'pene', label: 'Pene', short: 'Pene', x: 50, y: 262, w: 98, h: 34, rx: 16, lx: 98, ly: 252,
        tools: mTools({
          insp: () => 'pene de tamaño y forma normales, piel sin lesiones; en el varón no circuncidado el prepucio se retrae con facilidad hasta exponer el glande, sin fimosis ni adherencias; sin placas ni curvatura.',
          palp: () => 'pene: cuerpos cavernosos y esponjoso blandos, sin induraciones ni placas (sin nódulos de Peyronie), sin dolor; uretra palpable sin masas ni secreción.'
        }) },
      { id: 'glande', label: 'Glande y meato uretral', short: 'Glande', cx: 40, cy: 279, r: 14, lx: 40, ly: 258,
        tools: mTools({
          insp: () => 'glande liso, rosado y húmedo, sin lesiones ni secreción; <b>meato uretral central</b> (ortotópico), sin estenosis, sin eritema ni secreción; surco balanoprepucial limpio.',
          palp: () => 'glande sin induraciones; la presión suave del meato no produce secreción.'
        }) },
      { id: 'escroto', label: 'Escroto', short: 'Escroto', cx: 174, cy: 330, r: 44, lx: 174, ly: 392,
        tools: mTools({
          insp: () => 'escroto simétrico, de piel rugosa, algo pigmentada y con rugosidades (dartos); el hemiescroto izquierdo cuelga algo más bajo; sin eritema, edema, lesiones ni masas visibles.',
          palp: () => 'piel del escroto móvil, sin nódulos; ambos testículos presentes y descendidos.'
        }) },
      { id: 'testD', label: 'Testículo derecho', short: '', cx: 500, cy: 316, r: 30, tools: mTools(testis('derecho')) },
      { id: 'testI', label: 'Testículo izquierdo', short: '', cx: 620, cy: 330, r: 30, tools: mTools(testis('izquierdo')) },
      { id: 'epiD', label: 'Epidídimo derecho', short: '', cx: 468, cy: 322, r: 14,
        tools: mTools({ palp: () => 'epidídimo derecho: cordón blando, de contorno liso, en la cara posterolateral del testículo, <b>indoloro</b>, sin nódulos ni induración.' }) },
      { id: 'epiI', label: 'Epidídimo izquierdo', short: '', cx: 654, cy: 336, r: 14,
        tools: mTools({ palp: () => 'epidídimo izquierdo: blando, liso y <b>indoloro</b>, sin nódulos ni induración.' }) },
      { id: 'corD', label: 'Cordón espermático derecho', short: 'Cordón D', cx: 497, cy: 205, r: 18, lx: 462, ly: 210, anchor: 'end',
        tools: mTools({
          palp: () => 'cordón espermático derecho: cordón liso, no doloroso; el <b>conducto deferente</b> se palpa como un cordón firme, “como un espagueti”, sin nódulos; sin dilataciones venosas.',
          vals: () => 'con Valsalva y en bipedestación <b>no hay varicocele</b> (no se palpa la “bolsa de gusanos”), ni aumento de tamaño de las venas del plexo pampiniforme.',
          trans: () => 'cordón sin transiluminación (estructura sólida); no hay hidrocele del cordón.'
        }) },
      { id: 'corI', label: 'Cordón espermático izquierdo', short: 'Cordón I', cx: 623, cy: 205, r: 18, lx: 658, ly: 210, anchor: 'start',
        tools: mTools({
          palp: () => 'cordón espermático izquierdo: liso e indoloro; el conducto deferente se palpa como un cordón firme y fino, sin nódulos.',
          vals: () => 'con Valsalva y en bipedestación <b>no hay varicocele izquierdo</b> (el lado en que suele buscarse); venas del plexo pampiniforme no palpables.',
          trans: () => 'cordón sin transiluminación; sin hidrocele.'
        }) },
      { id: 'anD', label: 'Anillo inguinal superficial derecho', short: '', cx: 500, cy: 130, r: 16,
        tools: mTools({
          vals: () => '<b>sin hernia inguinal derecha</b>: invaginando el escroto con el dedo hasta el anillo superficial, la tos y el Valsalva no producen impulso ni protrusión; canal libre.',
          palp: () => 'anillo inguinal superficial derecho cerrado, sin masas ni dolor.'
        }) },
      { id: 'anI', label: 'Anillo inguinal superficial izquierdo', short: '', cx: 620, cy: 130, r: 16,
        tools: mTools({
          vals: () => '<b>sin hernia inguinal izquierda</b>: no hay impulso ni protrusión con tos o Valsalva; canal libre.',
          palp: () => 'anillo inguinal superficial izquierdo cerrado, sin masas ni dolor.'
        }) },
      { id: 'gang', label: 'Ganglios inguinales', short: 'Ganglios ing.', cx: 448, cy: 168, r: 14, lx: 430, ly: 172, anchor: 'end',
        tools: mTools({ palp: () => 'ganglios inguinales (cadena horizontal, bajo el ligamento inguinal): <b>≤ 1 cm</b>, blandos, móviles e indoloros (hallazgo normal); sin adenopatías.' }) },
      { id: 'prost', label: 'Próstata (tacto rectal)', short: 'Próstata', cx: 205, cy: 200, r: 26, lx: 205, ly: 166,
        tools: mTools({ tacto: c => N(`<b>próstata</b> de <b>tamaño</b> normal, ${pd(c).prost} cm de diámetro (${pd(c).prostG}; se compara con una castaña), con dos lóbulos simétricos y <b>surco medio conservado</b>; <b>consistencia</b> firme-elástica y homogénea (como la eminencia tenar con el pulgar en oposición o la punta de la nariz); <b>superficie</b> lisa, de <b>límites</b> netos; <b>móvil</b> y <b>no dolorosa</b> al tacto; sin nódulos ni induraciones.${pd(c).prostNote || ''}`, '☝ tacto') }) },
      { id: 'esf', label: 'Esfínter anal', short: 'Esfínter', cx: 272, cy: 316, r: 18, lx: 306, ly: 318, anchor: 'start',
        tools: mTools({ tacto: () => N('inspección perianal sin lesiones (fisuras, hemorroides externas ni fístulas); <b>esfínter anal normotónico</b>: se percibe cierre firme alrededor del dedo, que se contrae a la orden de apretar y se relaja después.', '☝ tono') }) },
      { id: 'amp', label: 'Ampolla rectal', short: '', x: 252, y: 80, w: 44, h: 150, rx: 18,
        tools: mTools({ tacto: () => N('<b>ampolla rectal</b> libre, de paredes lisas, sin masas ni induraciones en las paredes ni en el fondo de saco; al retirar el dedo, el guante muestra heces de color normal, <b>sin sangre ni moco</b>.', '☝ paredes') }) }
    ],
    onLeave: clearRT
  };

  /* =====================================================================
     3) GENITALES FEMENINOS (diagramas esquemáticos)
     ===================================================================== */
  const VX = 170;   // centro horizontal del mapa vulvar
  function femSvg(learn, c) {
    let s = banner(c, 'F');
    /* mapa vulvar abstracto */
    s += panelTitle(VX, 54, 'Región vulvar (diagrama)');
    s += `<path d="M${VX - 66},86 Q${VX},60 ${VX + 66},86" fill="none" stroke="#b5a48f" stroke-width="2" stroke-dasharray="2 5"/>`;
    s += `<ellipse cx="${VX}" cy="214" rx="58" ry="104" fill="${FILL}" stroke="${INK}" stroke-width="2.2"/>`;   // labios mayores
    s += `<ellipse cx="${VX}" cy="216" rx="28" ry="74" fill="#f8e3dc" stroke="#9a7b8a" stroke-width="2"/>`;    // labios menores
    s += `<circle cx="${VX}" cy="150" r="6" fill="#e9b5a8" stroke="#9a7b8a" stroke-width="1.5"/>`;              // clítoris
    s += `<circle cx="${VX}" cy="180" r="4" fill="#9a7b5a"/>`;                                                  // meato
    s += `<ellipse cx="${VX}" cy="230" rx="13" ry="26" fill="#fff" stroke="#9a7b8a" stroke-width="1.8" stroke-dasharray="4 3"/>`; // introito
    s += `<circle cx="${VX - 20}" cy="256" r="4" fill="#c9a23a"/><circle cx="${VX + 20}" cy="256" r="4" fill="#c9a23a"/>`;  // Bartolino
    s += `<path d="M${VX},292 V312" stroke="#b5a48f" stroke-width="2"/><circle cx="${VX}" cy="326" r="7" fill="#efe3d4" stroke="${INK}" stroke-width="1.5"/>`;
    s += `<g class="hintring"><text x="${VX}" y="82" class="svg-hint" text-anchor="middle">Monte del pubis</text>` +
         `<text x="${VX}" y="132" class="svg-hint" text-anchor="middle">Clítoris</text>` +
         `<text x="${VX + 66}" y="262" class="svg-hint">Bartolino</text><text x="${VX}" y="350" class="svg-hint" text-anchor="middle">Periné y ano</text></g>`;
    /* corte sagital pélvico esquemático */
    s += panelTitle(390, 54, 'Corte sagital pélvico (diagrama)');
    s += `<rect x="296" y="150" width="16" height="64" rx="8" fill="#e6dccd" stroke="${INK}" stroke-width="2"/>`;           // sínfisis
    s += `<ellipse cx="344" cy="126" rx="42" ry="28" fill="${SOFT}" stroke="#b79a1a" stroke-width="2"/>`;                   // vejiga
    s += `<path d="M322,150 L314,232" fill="none" stroke="#9a7b5a" stroke-width="3.5"/>`;                                    // uretra
    s += `<path d="M314,244 L420,212" fill="none" stroke="${INK}" stroke-width="2"/><path d="M322,266 L424,230" fill="none" stroke="${INK}" stroke-width="2"/>`; // vagina
    s += `<path d="M420,212 L426,230" stroke="${INK}" stroke-width="2"/>`;
    s += `<ellipse cx="428" cy="222" rx="13" ry="15" fill="#f4c9c0" stroke="#9a7b8a" stroke-width="2"/>`;                    // cuello
    s += `<ellipse cx="398" cy="168" rx="22" ry="52" transform="rotate(-24 398 168)" fill="#f2d6c6" stroke="#9a7b8a" stroke-width="2"/>`;  // útero anteversoflexión
    s += `<path d="M470,86 C462,150 450,214 462,276 L468,336 M522,86 C528,150 540,214 526,276 L520,336" fill="none" stroke="${INK}" stroke-width="2.5"/>`; // recto
    s += `<path d="M482,326 H512" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><text x="494" y="352" class="svg-small" text-anchor="middle">ano</text>`;
    s += `<g class="hintring"><text x="344" y="80" class="svg-hint" text-anchor="middle">Vejiga</text>` +
         `<text x="372" y="112" class="svg-hint" text-anchor="end">Útero</text><text x="452" y="248" class="svg-hint" text-anchor="start">Cuello</text>` +
         `<text x="500" y="168" class="svg-hint" text-anchor="middle">Recto</text><text x="470" y="274" class="svg-hint" text-anchor="end">F. saco post.</text></g>`;
    /* vista especular esquemática */
    s += panelTitle(660, 54, 'Vista con espéculo (diagrama)');
    s += `<circle cx="660" cy="200" r="86" fill="#f6dcd4" stroke="#9a7b8a" stroke-width="2.5"/>`;
    s += `<circle cx="660" cy="196" r="46" fill="#f2b9ae" stroke="#b07a74" stroke-width="2"/>`;
    s += `<ellipse cx="660" cy="196" rx="7" ry="5" fill="#8f4c46"/>`;
    s += `<path d="M652,180 A18,18 0 0 1 668,180" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3"/>`;
    s += `<path d="M590,260 Q660,300 730,260" fill="none" stroke="#c9d8e0" stroke-width="6" opacity=".7"/>`;
    s += `<g class="hintring"><circle cx="660" cy="196" r="24" fill="none" stroke="#0e6a78" stroke-width="1.6" stroke-dasharray="3 3"/>` +
         `<text x="660" y="320" class="svg-hint" text-anchor="middle">Fondos de saco y paredes</text>` +
         `<text x="660" y="100" class="svg-hint" text-anchor="middle">Cuello uterino</text><text x="700" y="198" class="svg-hint">OCE</text></g>`;
    s += `<rect x="270" y="400" width="480" height="90" rx="14" fill="#fff" fill-opacity=".6" stroke="${INK}" stroke-dasharray="5 4"/>`;
    s += `<text x="510" y="432" class="svg-title" text-anchor="middle">Preparación de la exploración</text>`;
    s += `<text x="510" y="456" class="svg-small" text-anchor="middle">Consentimiento informado · acompañante · privacidad</text>`;
    s += `<text x="510" y="476" class="svg-small" text-anchor="middle">Posición ginecológica, cubierta con sábana, explicar cada paso</text>`;
    return s;
  }
  const FEM = {
    prep: 'Antes de la exploración: <b>explicar el procedimiento y obtener el consentimiento</b>; ofrecer un <b>acompañante</b>; garantizar <b>privacidad</b> y <b>confidencialidad</b>; vejiga vacía. Paciente en <b>posición ginecológica</b> (litotomía dorsal) cubierta con una sábana; manos lavadas y enguantadas, espéculo atemperado; avisar antes de cada contacto y permitir interrumpir en cualquier momento.',
    papInd: c => `<b>Papanicolaou (citología cervicovaginal)</b>: cribado del cáncer de cuello uterino a partir de los 21 años; 21–29 años, citología cada 3 años; 30–65 años, citología cada 3 años o citología + prueba de VPH cada 5 años, según la guía local; se puede suspender a los 65 años si los cribados previos fueron normales.${isMeno(c) ? ` En esta persona (${c.age} años) sigue indicado hasta los 65 años.` : ''} <b>Técnica</b>: sin duchas, óvulos ni relaciones 24–48 h antes y fuera de la menstruación; espéculo sin lubricante (o con agua tibia); toma del exocérvix con espátula de Ayre (giro de 360°) y del endocérvix con cepillo (zona de transformación); extender y <b>fijar de inmediato</b>; rotular. Resultado esperado: citología negativa para lesión intraepitelial o malignidad.`
  };
  const fTools = o => { const r = {}; Object.keys(o).forEach(k => { r[k] = fOnly(o[k]); }); return r; };
  /* hallazgo según estado hormonal: fértil (p1) o posmenopáusica (p4) */
  const byMeno = (fertil, meno) => c => (isMeno(c) ? meno : fertil);
  const fem = {
    id: 'fem', label: 'Genitales femeninos', viewBox: '0 0 780 520',
    hint: 'Diagrama esquemático. Prepara a la paciente (consentimiento, acompañante, privacidad) y sigue el orden: inspección externa, espéculo, tacto bimanual.',
    svg: femSvg,
    anatomy: anatFem,
    tools: [
      { id: 'prep', icon: '🤝', label: 'Preparación', hint: 'Haz clic en el recuadro inferior: consentimiento, acompañante, privacidad y posición.' },
      { id: 'insp', icon: '👁️', label: 'Inspección externa', hint: 'Vello, labios, clítoris, meato uretral, introito y periné.' },
      { id: 'palp', icon: '✋', label: 'Palpación de glándulas', hint: 'Glándulas de Bartolino (entre pulgar e índice) y de Skene (presión suave sobre la uretra).' },
      { id: 'esp', icon: '🔍', label: 'Espéculo', hint: 'Haz clic en el cuello uterino o en las paredes vaginales de la vista con espéculo.' },
      { id: 'bim', icon: '🤲', label: 'Tacto bimanual', hint: 'Dos dedos intravaginales y mano abdominal: útero, anexos y fondos de saco.' },
      { id: 'pap', icon: '🧪', label: 'Papanicolaou', hint: 'Haz clic en el cuello uterino: indicaciones según la edad y técnica de toma.' }
    ],
    regions: [
      { id: 'prep', label: 'Preparación', short: '', x: 272, y: 402, w: 476, h: 86, rx: 14, tools: { prep: FEM.prep } },
      { id: 'monte', label: 'Monte del pubis', short: '', x: VX - 66, y: 66, w: 132, h: 40, rx: 14,
        tools: fTools({ insp: byMeno('<b>vello púbico de tipo adulto (Tanner 5)</b>: distribución ginecoide, en triángulo de base superior; piel sin lesiones, eritema ni parásitos.',
          '<b>vello púbico de tipo adulto</b>, de distribución ginecoide, más ralo y con canas (cambio fisiológico posmenopáusico); piel sin lesiones, eritema ni parásitos.') }) },
      { id: 'lmay', label: 'Labios mayores', short: 'Labios mayores', x: VX - 54, y: 112, w: 24, h: 200, rx: 12, lx: VX - 60, ly: 220, anchor: 'end',
        tools: fTools({ insp: byMeno('labios mayores simétricos, turgentes, de piel íntegra y pigmentada, con vello; sin lesiones, tumefacciones ni eritema.',
          'labios mayores simétricos, <b>menos turgentes</b> por pérdida del tejido adiposo (atrofia fisiológica posmenopáusica), de piel íntegra; sin lesiones, tumefacciones ni eritema.') }) },
      { id: 'lmen', label: 'Labios menores', short: 'Labios menores', x: VX - 27, y: 150, w: 14, h: 130, rx: 7, lx: VX + 62, ly: 236, anchor: 'start',
        tools: fTools({ insp: byMeno('labios menores rosados, húmedos, simétricos o con ligera asimetría fisiológica, sin lesiones ni úlceras.',
          'labios menores <b>más pequeños y pálidos</b>, con mucosa más fina y menos húmeda (atrofia vulvar fisiológica), sin lesiones, fisuras ni úlceras.') }) },
      { id: 'cli', label: 'Clítoris', short: '', cx: VX, cy: 150, r: 11,
        tools: fTools({ insp: () => 'clítoris de tamaño normal (glande < 1 cm), cubierto por su capuchón, sin lesiones, adherencias ni dolor.' }) },
      { id: 'meato', label: 'Meato uretral', short: 'Meato', cx: VX, cy: 180, r: 9, lx: VX + 16, ly: 184, anchor: 'start',
        tools: fTools({
          insp: byMeno('<b>meato uretral</b> en la línea media, por debajo del clítoris, con bordes lisos, sin secreción, prolapso ni carúncula.',
            '<b>meato uretral</b> en la línea media, con bordes lisos y mucosa algo pálida; sin secreción, carúncula ni prolapso de la mucosa uretral.'),
          palp: () => 'glándulas de <b>Skene</b> (parauretrales): la presión suave sobre la uretra, desde la vagina, no produce secreción ni dolor; sin tumefacción.'
        }) },
      { id: 'intro', label: 'Introito vaginal', short: 'Introito', cx: VX, cy: 232, r: 20, lx: VX, ly: 206,
        tools: fTools({ insp: byMeno('<b>introito</b> con himen (anillo o restos carunculares) sin lesiones; mucosa rosada y húmeda; sin flujo anormal ni prolapso al esfuerzo (Valsalva).',
          '<b>introito</b> con carúnculas himeneales; mucosa <b>rosada pálida, más fina y seca</b> (atrofia fisiológica por descenso de estrógenos), sin lesiones; sin descenso de las paredes vaginales ni del cuello al esfuerzo (Valsalva) y sin pérdida de orina con la tos.') }) },
      { id: 'bartD', label: 'Glándula de Bartolino (4 h)', short: '', cx: VX - 20, cy: 256, r: 10,
        tools: fTools({ palp: () => 'glándula de <b>Bartolino</b> a las 4 h: se palpa entre el pulgar (externo) y el índice (intravaginal); <b>sin tumefacción, dolor ni secreción</b>; la glándula normal no es palpable.' }) },
      { id: 'bartI', label: 'Glándula de Bartolino (8 h)', short: '', cx: VX + 20, cy: 256, r: 10,
        tools: fTools({ palp: () => 'glándula de <b>Bartolino</b> a las 8 h: sin tumefacción, dolor ni secreción; no palpable.' }) },
      { id: 'per', label: 'Periné y ano', short: '', cx: VX, cy: 312, r: 22,
        tools: fTools({ insp: () => 'periné íntegro, sin cicatrices (episiotomía) ni lesiones; horquilla posterior conservada; piel perianal sin lesiones, fisuras ni hemorroides.' }) },
      { id: 'cerv', label: 'Cuello uterino', short: '', cx: 660, cy: 196, r: 46,
        tools: fTools({
          esp: byMeno('<b>cuello uterino</b> rosado, liso y simétrico, de 2–3 cm de diámetro, de posición central; <b>orificio cervical externo</b> pequeño (puntiforme o circular en la nulípara; en hendidura transversal en la multípara); sin lesiones, úlceras ni masas; puede verse una pequeña ectopia (ectropión) fisiológica en la edad fértil.',
            '<b>cuello uterino</b> más pequeño, liso, de color rosado pálido; <b>orificio cervical externo</b> puntiforme o estenótico; la unión escamocolumnar se ha retraído hacia el canal endocervical (no se ve ectopia); sin lesiones, úlceras ni masas.'),
          pap: FEM.papInd
        }) },
      { id: 'oce', label: 'Orificio cervical externo', short: '', cx: 660, cy: 196, r: 9,
        tools: fTools({
          esp: byMeno('orificio cervical externo central, puntiforme o circular; sin secreción purulenta ni sangrado al contacto.',
            'orificio cervical externo puntiforme (puede ser estenótico tras la menopausia); sin secreción purulenta ni sangrado al contacto.'),
          pap: FEM.papInd
        }) },
      { id: 'flujo', label: 'Fondos de saco y paredes vaginales', short: '', x: 590, y: 256, w: 140, h: 46, rx: 16,
        tools: fTools({ esp: byMeno('paredes vaginales rosadas, húmedas y con rugosidades; fondos de saco libres; <b>flujo fisiológico</b> claro o blanquecino, filante o cremoso según el ciclo, inodoro, de pH 3,8–4,5; sin secreción espumosa, purulenta ni maloliente.',
          'paredes vaginales <b>lisas (pérdida de las rugosidades), pálidas y más finas</b>, con escaso flujo (atrofia vaginal fisiológica); el pH vaginal suele subir a 5–6 por el descenso de estrógenos; fondos de saco libres; sin secreción espumosa, purulenta ni maloliente ni sangrado.') }) },
      { id: 'ut', label: 'Útero', short: '', cx: 398, cy: 168, r: 36,
        tools: fTools({ bim: byMeno(H('<b>útero</b> en <b>anteversoflexión</b>, de 7–8 cm de longitud, en forma de pera, consistencia firme-elástica, superficie lisa, <b>móvil</b> en todos los ejes e <b>indoloro</b> a la palpación bimanual; el cuello es firme y su movilización no es dolorosa.', true, true),
          H('<b>útero</b> en anteversoflexión, <b>más pequeño</b> (≈ 5–6 cm: involución posmenopáusica), de consistencia firme, superficie lisa, <b>móvil</b> e <b>indoloro</b>; su tamaño debe seguir disminuyendo con los años; el cuello es firme y su movilización no es dolorosa.', true, true)) }) },
      { id: 'anex', label: 'Anexos', short: 'Anexos', cx: 452, cy: 140, r: 22, lx: 452, ly: 112,
        tools: fTools({ bim: byMeno(H('<b>anexos no palpables</b> (el ovario normal mide ≈ 3 × 2 × 1 cm y solo se percibe en mujeres delgadas); sin masas, engrosamientos ni dolor.', true, true),
          H('<b>anexos no palpables</b>: tras la menopausia los ovarios se atrofian (≈ 1–2 cm) y <b>no deben palparse</b>; un ovario palpable en una mujer posmenopáusica obliga a estudiarlo. Sin masas ni dolor.', true, true)) }) },
      { id: 'fsp', label: 'Fondo de saco posterior', short: '', cx: 446, cy: 268, r: 20,
        tools: fTools({ bim: () => H('fondos de saco vaginales libres, blandos e indoloros; sin masas ni nodularidad.', true, false) }) },
      { id: 'movc', label: 'Cuello (movilización)', short: '', cx: 428, cy: 222, r: 15,
        tools: fTools({ bim: () => H('la <b>movilización del cuello</b> es indolora; el cuello es firme, móvil y de tamaño normal.', true, false) }) }
    ],
    onLeave: clearRT
  };

  /* =====================================================================
     4) MAMA (mapas de cuadrantes)
     ===================================================================== */
  const BR = { R: { cx: 150, cy: 236 }, L: { cx: 370, cy: 236 } }, BRAD = 100;
  function qd(cx, cy, r, q) {
    switch (q) {
      case 'ul': return `M${cx},${cy} L${cx},${cy - r} A${r},${r} 0 0 0 ${cx - r},${cy} Z`;
      case 'ur': return `M${cx},${cy} L${cx + r},${cy} A${r},${r} 0 0 0 ${cx},${cy - r} Z`;
      case 'll': return `M${cx},${cy} L${cx - r},${cy} A${r},${r} 0 0 0 ${cx},${cy + r} Z`;
      default: return `M${cx},${cy} L${cx},${cy + r} A${r},${r} 0 0 0 ${cx + r},${cy} Z`;
    }
  }
  function mamaSvg(learn, c) {
    let s = '';
    ['R', 'L'].forEach(k => {
      const { cx, cy } = BR[k];
      const dir = k === 'R' ? -1 : 1;     // dirección lateral (hacia la axila) en pantalla
      s += `<circle cx="${cx}" cy="${cy}" r="${BRAD}" fill="${isF(c) ? '#f9e7da' : FILL}" stroke="${INK}" stroke-width="2.5"/>`;
      if (isF(c)) s += `<path d="M${cx + dir * 66},${cy - 66} C${cx + dir * 100},${cy - 94} ${cx + dir * 124},${cy - 112} ${cx + dir * 128},${cy - 122} C${cx + dir * 104},${cy - 116} ${cx + dir * 74},${cy - 98} ${cx + dir * 54},${cy - 80} Z" fill="#f9e7da" stroke="${INK}" stroke-width="2"/>`;
      s += `<circle cx="${cx}" cy="${cy}" r="${isF(c) ? 26 : 14}" fill="${isF(c) ? '#e3b79c' : '#d8b8a0'}" stroke="#a97d58" stroke-width="1.5"/><circle cx="${cx}" cy="${cy}" r="${isF(c) ? 6 : 4}" fill="#c98f7a"/>`;
      s += `<path d="M${cx - BRAD},${cy} H${cx + BRAD} M${cx},${cy - BRAD} V${cy + BRAD}" stroke="${TEAL}" stroke-width="1.3" stroke-dasharray="4 5" fill="none" class="hintring"/>`;
      s += `<text x="${cx}" y="${cy - BRAD - 8}" class="svg-hint hintring" text-anchor="middle">12 h</text><text x="${cx}" y="${cy + BRAD + 16}" class="svg-hint hintring" text-anchor="middle">6 h</text>`;
    });
    s += panelTitle(150, 40, 'Mama derecha');
    s += panelTitle(370, 40, 'Mama izquierda');
    s += `<text x="150" y="364" class="svg-small" text-anchor="middle">CSE = superoexterno · CSI = superointerno</text>`;
    s += `<text x="260" y="384" class="svg-small" text-anchor="middle">CIE = inferoexterno · CII = inferointerno</text>`;
    /* axila esquemática: fosa supraclavicular por encima de la clavícula, grupos axilares por debajo */
    s += panelTitle(655, 40, 'Axila (esquema)');
    s += `<path d="M590,70 Q655,52 720,70 Q742,150 718,260 Q700,330 655,336 Q610,330 592,260 Q568,150 590,70 Z" fill="${FILL}" stroke="${INK}" stroke-width="2.2"/>`;
    s += `<path d="M606,110 Q655,98 704,110" fill="none" stroke="#b5a48f" stroke-width="3"/><text x="655" y="124" class="svg-small" text-anchor="middle">clavícula</text>`;
    s += `<g class="hintring"><text x="655" y="356" class="svg-hint" text-anchor="middle">Grupos axilares</text></g>`;
    /* recuadro del autoexamen */
    s += `<rect x="270" y="410" width="480" height="76" rx="14" fill="#fff" fill-opacity=".6" stroke="${INK}" stroke-dasharray="5 4"/>`;
    s += `<text x="510" y="440" class="svg-title" text-anchor="middle">Autoexamen mensual y cribado</text>`;
    s += `<text x="510" y="464" class="svg-small" text-anchor="middle">Haz clic aquí con la herramienta «Autoexamen»</text>`;
    return s;
  }
  const POST = {
    caidos: 'sentada con los <b>brazos caídos</b> a los lados: mamas simétricas en tamaño, forma y posición (una ligera asimetría de volumen es fisiológica); piel de color y textura uniformes, sin eritema, edema ni “piel de naranja”, sin venas prominentes unilaterales',
    arriba: 'con los <b>brazos elevados</b> sobre la cabeza: ambas mamas ascienden de forma simétrica, se aprecia el surco submamario, sin hoyuelos, retracción ni fijación de la piel y sin retracción de los pezones',
    caderas: 'con las <b>manos en las caderas</b> haciendo presión (contracción de los pectorales): sin hoyuelos, retracción de piel o pezón ni asimetría del contorno; las mamas se mueven simétricamente'
  };
  const TECH = {
    bandas: 'técnica de <b>bandas verticales</b> (franjas), de la clavícula al surco submamario y de la línea axilar media al esternón',
    espiral: 'técnica en <b>espiral</b>, de la periferia al pezón en círculos concéntricos',
    radial: 'técnica <b>radial</b>, como los radios de una rueda desde el pezón hacia la periferia'
  };
  const quadNames = { cse: 'cuadrante superoexterno', csi: 'cuadrante superointerno', cii: 'cuadrante inferointerno', cie: 'cuadrante inferoexterno' };
  const mamaQuad = (key, lado) => ({
    insp: (c) => {
      const post = st(c).posture;
      return isF(c)
        ? `${quadNames[key]} ${lado}: piel sin cambios (sin eritema, hoyuelos ni retracción), contorno regular${isMeno(c) ? '; mamas algo más laxas y de menor volumen (involución posmenopáusica), simétricas' : ''}. Con la paciente ${POST[post]}.`
        : `${quadNames[key]} ${lado}: tórax masculino con tejido mamario <b>plano</b>, sin masas ni asimetrías; sin ginecomastia. Con el paciente ${POST[post]}.`;
    },
    palp: (c, ctx) => {
      const t = TECH[st(c).tech];
      const extra = key === 'cse' ? ' Es el cuadrante con más tejido glandular y se continúa con la cola de Spence.' : (key === 'cie' || key === 'cii' ? ' Se palpa la cresta inframamaria como una banda firme normal (no es una masa).' : '');
      return H(isF(c)
        ? (isMeno(c)
          ? `${quadNames[key]} ${lado} (${t}): tejido de <b>predominio adiposo</b>, blando y homogéneo, con poco tejido glandular residual (involución posmenopáusica), simétrico con el lado contrario, <b>sin masas</b> ni dolor; en esta mama un nódulo se detecta con más facilidad.${extra}`
          : `${quadNames[key]} ${lado} (${t}): tejido <b>glandular nodular fisiológico</b>, de consistencia elástica y granular (más sensible y nodular en la fase premenstrual), simétrico con el lado contrario, móvil, <b>sin masas</b> ni dolor.${extra}`)
        : `${quadNames[key]} ${lado} (${t}): <b>tejido mamario plano</b>, graso y pectoral, sin masas ni nódulos; sin disco glandular retroareolar palpable mayor de 2 cm.`, false, false);
    }
  });
  const mamaReg = (id, key, lado, cx, cy, lx, ly, anchor, q) => ({
    id, label: `${quadNames[key][0].toUpperCase()}${quadNames[key].slice(1)} (${lado})`, short: key.toUpperCase(), d: qd(cx, cy, BRAD - 4, q), lx, ly, anchor, tools: mamaQuad(key, lado)
  });
  const axilaReg = (id, label, short, cx, cy, txt, lx, ly, anchor) => ({
    id, label, short, cx, cy, r: 15, lx, ly, anchor,
    tools: { palp: (c) => H(`${txt} Axila examinada con el brazo relajado y apoyado por el examinador: <b>ganglios no palpables</b>, sin dolor ni masas.`, true, false) }
  });
  const mama = {
    id: 'mama', label: 'Mama', viewBox: '0 0 780 520',
    hint: 'Mapa de cuadrantes. Elige la postura para la inspección y la técnica para la palpación (decúbito).',
    svg: mamaSvg,
    anatomy: anatMama,
    tools: [
      { id: 'insp', icon: '👁️', label: 'Inspección (sentada)', hint: 'Elige la postura arriba a la izquierda: brazos caídos, brazos elevados o manos en las caderas.' },
      { id: 'palp', icon: '✋', label: 'Palpación (decúbito)', hint: 'Decúbito supino, brazo homolateral tras la cabeza; con la pulpa de los dedos y movimientos circulares con tres presiones (superficial, media, profunda).' },
      { id: 'auto', icon: '📅', label: 'Autoexamen', hint: 'Educación: cuándo y cómo practicar el autoexamen mensual.' }
    ],
    regions: [
      mamaReg('cseR', 'cse', 'derecha', BR.R.cx, BR.R.cy, 72, 168, 'middle', 'ul'),
      mamaReg('csiR', 'csi', 'derecha', BR.R.cx, BR.R.cy, 228, 168, 'middle', 'ur'),
      mamaReg('ciiR', 'cii', 'derecha', BR.R.cx, BR.R.cy, 228, 316, 'middle', 'lr'),
      mamaReg('cieR', 'cie', 'derecha', BR.R.cx, BR.R.cy, 72, 316, 'middle', 'll'),
      mamaReg('csiL', 'csi', 'izquierda', BR.L.cx, BR.L.cy, 312, 168, 'middle', 'ul'),
      mamaReg('cseL', 'cse', 'izquierda', BR.L.cx, BR.L.cy, 448, 168, 'middle', 'ur'),
      mamaReg('cieL', 'cie', 'izquierda', BR.L.cx, BR.L.cy, 448, 316, 'middle', 'lr'),
      mamaReg('ciiL', 'cii', 'izquierda', BR.L.cx, BR.L.cy, 312, 316, 'middle', 'll'),
      { id: 'spR', label: 'Cola de Spence derecha', short: 'Cola de Spence', cx: 38, cy: 128, r: 16, lx: 6, ly: 100, anchor: 'start',
        tools: { palp: (c) => H(isF(c) ? `<b>cola de Spence</b> derecha (prolongación axilar del cuadrante superoexterno): ${isMeno(c) ? 'tejido blando, de predominio adiposo' : 'tejido glandular fino y elástico'}, sin masas ni dolor.` : 'prolongación axilar: sin tejido glandular palpable ni masas.', true, false),
          insp: (c) => (isF(c) ? 'prolongación axilar de la mama sin abultamientos ni cambios de la piel.' : 'región axilar anterior sin abultamientos ni cambios de la piel.') } },
      { id: 'spL', label: 'Cola de Spence izquierda', short: 'Cola de Spence', cx: 482, cy: 128, r: 16, lx: 482, ly: 100,
        tools: { palp: (c) => H(isF(c) ? `<b>cola de Spence</b> izquierda: ${isMeno(c) ? 'tejido blando, de predominio adiposo' : 'tejido glandular fino y elástico'}, sin masas ni dolor.` : 'prolongación axilar: sin tejido glandular palpable ni masas.', true, false),
          insp: (c) => (isF(c) ? 'prolongación axilar de la mama sin abultamientos ni cambios de la piel.' : 'región axilar anterior sin abultamientos ni cambios de la piel.') } },
      { id: 'areR', label: 'Región retroareolar derecha (areola y pezón)', short: 'Retroareolar', cx: BR.R.cx, cy: BR.R.cy, r: 24, lx: BR.R.cx, ly: BR.R.cy + 44,
        tools: {
          insp: (c) => (isF(c)
            ? `<b>areola y pezón</b> derechos: areola de 3–4 cm con tubérculos de Montgomery, pigmentada de forma homogénea${isMeno(c) ? ' (algo más clara tras la menopausia)' : ''}; pezón evertido, simétrico con el contralateral, <b>sin retracción, descamación, ulceración ni secreción</b>.`
            : 'areola y pezón derechos pequeños, simétricos con los contralaterales, sin retracción, descamación ni secreción.'),
          palp: (c) => H(isF(c)
            ? '<b>región retroareolar derecha</b>: tejido glandular y conductos subyacentes sin masas ni dolor; la compresión suave del pezón <b>no produce secreción</b>.'
            : 'región retroareolar derecha: sin masas ni disco glandular > 2 cm (sin ginecomastia); sin dolor ni secreción.', false, false)
        } },
      { id: 'areL', label: 'Región retroareolar izquierda (areola y pezón)', short: 'Retroareolar', cx: BR.L.cx, cy: BR.L.cy, r: 24, lx: BR.L.cx, ly: BR.L.cy + 44,
        tools: {
          insp: (c) => (isF(c)
            ? '<b>areola y pezón</b> izquierdos: simétricos con los derechos, pezón evertido, sin retracción, descamación, ulceración ni secreción.'
            : 'areola y pezón izquierdos simétricos con los derechos, sin retracción, descamación ni secreción.'),
          palp: (c) => H(isF(c)
            ? '<b>región retroareolar izquierda</b>: sin masas ni dolor; la compresión suave del pezón no produce secreción.'
            : 'región retroareolar izquierda: sin masas ni disco glandular > 2 cm; sin dolor ni secreción.', false, false)
        } },
      axilaReg('axCen', 'Ganglios axilares centrales', 'Centrales', 655, 238, 'Ganglios centrales (en el centro de la axila).', 655, 214),
      axilaReg('axPec', 'Ganglios pectorales (anteriores)', 'Pectorales', 606, 206, 'Ganglios pectorales (borde inferior del pectoral mayor).', 590, 182, 'end'),
      axilaReg('axSub', 'Ganglios subescapulares (posteriores)', 'Subescapulares', 706, 206, 'Ganglios subescapulares (pared posterior).', 706, 184),
      axilaReg('axLat', 'Ganglios laterales (humerales)', 'Laterales', 704, 288, 'Ganglios laterales (cara medial del húmero).', 704, 318),
      axilaReg('axApi', 'Ganglios apicales (infraclaviculares)', 'Apicales', 655, 150, 'Ganglios apicales, bajo la clavícula.', 674, 154, 'start'),
      axilaReg('axSup', 'Fosa supraclavicular', 'Supraclaviculares', 655, 84, 'Fosa supraclavicular, por encima de la clavícula.', 655, 62),
      { id: 'auto', label: 'Autoexamen y cribado', short: '', x: 270, y: 410, w: 480, h: 76, rx: 14,
        tools: { auto: (c) => (isF(c)
          ? `<b>autoexamen mensual</b>: ${isMeno(c) ? 'tras la menopausia, un <b>día fijo cada mes</b>' : 'en mujeres que menstrúan, <b>5–7 días después de la menstruación</b> (mama menos sensible); tras la menopausia, un día fijo cada mes'}. Frente al espejo (brazos caídos, elevados y manos en las caderas) buscar cambios de forma, piel o pezón; luego en decúbito o en la ducha palpar toda la mama y la axila con la pulpa de los dedos (bandas, espiral o radial). <b>Cribado:</b> ${c.age >= 50 ? `a los ${c.age} años, <b>mamografía cada 1–2 años</b> (habitualmente entre los 50 y los 69–74 años, según la guía local).` : (c.age >= 40 ? 'entre los 40 y los 49 años la mamografía se decide de forma individual según el riesgo.' : 'antes de los 40 años, sin factores de riesgo, no está indicada la mamografía de cribado; examen clínico en los controles de salud.')} Consultar ante cualquier cambio.`
          : 'el varón también puede notar cambios en el tejido mamario: se recomienda consultar ante cualquier nódulo, secreción o cambio cutáneo en el pezón o la areola (la ginecomastia y el cáncer de mama masculino son infrecuentes, pero existen).') } }
    ],
    after(stage, sh, ctx) {
      const c = ctx.c;
      const box = document.createElement('div');
      box.className = 'overlay-top';
      box.style.cssText += ';flex-wrap:wrap';
      box.innerHTML = `<div class="seg" data-g="posture" title="Postura para la inspección"><button data-v="caidos">Brazos caídos</button><button data-v="arriba">Brazos arriba</button><button data-v="caderas">Manos en caderas</button></div>` +
        `<div class="seg" data-g="tech" title="Técnica de palpación"><button data-v="bandas">Bandas</button><button data-v="espiral">Espiral</button><button data-v="radial">Radial</button></div>`;
      stage.appendChild(box);
      const set = () => box.querySelectorAll('.seg').forEach(sg => sg.querySelectorAll('button').forEach(b => b.classList.toggle('active', st(c)[sg.dataset.g] === b.dataset.v)));
      set();
      box.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        const g = b.parentNode.dataset.g;
        st(c)[g] = b.dataset.v; set();
        sh.log(g === 'posture' ? `Postura de inspección: ${b.textContent.toLowerCase()}.` : `Técnica de palpación: ${b.textContent.toLowerCase()}.`, '');
      });
    },
    onLeave: clearRT
  };

  /* =====================================================================
     CUESTIONARIO
     ===================================================================== */
  /* posición de la respuesta correcta: varía con la persona (índice en la lista) y con la pregunta */
  const kOf = c => { const i = (NormalEngine.people || []).findIndex(p => p.id === c.id); return i >= 0 ? i : (c.age % 4); };
  function mk(k, q, correct, wrongs, why) {
    const opts = wrongs.slice();
    const pos = k % (opts.length + 1);
    opts.splice(pos, 0, correct);
    return { q, options: opts, a: pos, why };
  }
  const quiz = c => {
    const k = kOf(c), meno = isMeno(c), f = isF(c), p = pd(c);
    return [
      mk(k, 'Valores normales de la orina', 'pH 5–7, densidad 1,010–1,025, amarilla clara y transparente',
        ['pH 8–9, densidad 1,040, turbia', 'pH 3, densidad 1,000, rojiza', 'pH 7–9, densidad 1,030–1,045, ámbar oscura'],
        'Diuresis normal 800–2 000 mL/día y 4–6 micciones al día; la tira reactiva es negativa para proteínas, glucosa, sangre y nitritos.'),
      mk(k + 1, 'La puñopercusión lumbar (signo de Giordano) se realiza sobre', 'El ángulo costovertebral (entre la 12.ª costilla y la columna)',
        ['El punto de McBurney', 'La región suprapúbica', 'El reborde costal anterior derecho'],
        'En la persona sana el golpe suave con el borde cubital del puño sobre la mano apoyada no provoca dolor (puñopercusión negativa).'),
      mk(k + 2, 'Maniobra bimanual para palpar el riñón y signo que lo caracteriza', 'Maniobra de Guyon y peloteo renal',
        ['Maniobra de Middleton y signo de Murphy', 'Maniobra de Mathieu y signo de Blumberg', 'Maniobra de Valsalva y transiluminación'],
        'Mano posterior en la fosa lumbar y mano anterior en el flanco, en inspiración profunda; el riñón normal no se palpa (salvo el polo inferior derecho en personas delgadas) y no hay peloteo.'),
      f
        ? mk(k + 3, `Hallazgo normal esperado en el tacto bimanual de esta persona (${c.age} años, ${meno ? 'posmenopáusica' : 'en edad fértil'})`,
          meno ? 'Útero más pequeño (≈ 5–6 cm), móvil e indoloro; anexos no palpables' : 'Útero en anteversoflexión de 7–8 cm, móvil e indoloro; anexos no palpables',
          meno ? ['Útero de 7–8 cm con ovarios fácilmente palpables', 'Útero fijo y doloroso a la movilización', 'Tras la menopausia no se explora el útero']
            : ['Útero de 5–6 cm y ovarios de 5 cm palpables', 'Retroversión fija y dolorosa', 'No se palpa nunca el útero'],
          meno ? 'Tras la menopausia el útero y los ovarios involucionan: un ovario palpable en una mujer posmenopáusica debe estudiarse.'
            : 'Los anexos normales solo se perciben en mujeres delgadas; la movilización del cuello no debe doler.')
        : mk(k + 3, `Próstata esperada al tacto rectal en esta persona (${c.age} años)`, `≈ ${p.prost} cm, firme-elástica, lisa, con surco medio conservado e indolora`,
          ['Pétrea, con nódulos y surco borrado', 'Muy blanda, fluctuante y dolorosa', 'No palpable a ninguna edad'],
          `Se valoran tamaño, consistencia, superficie, surco medio, límites, movilidad y sensibilidad; además, el tono del esfínter y la ausencia de masas en la ampolla.${p.prostNote || ''}`),
      mk(k, 'Tamaño normal del testículo del adulto', '4–5 cm de eje mayor (15–25 mL), firme-elástico y liso',
        ['2 cm de longitud (3 mL)', '8 cm de longitud y duro', '4–5 cm, pétreo y nodular'],
        'Se palpa entre el pulgar y los dedos, comparando ambos lados; el epidídimo es posterolateral y blando, y la transiluminación es negativa.'),
      mk(k + 1, 'En la toma del Papanicolaou se obtiene muestra de', 'Exocérvix y endocérvix (zona de transformación), con fijación inmediata',
        ['Solo del fondo de saco posterior', 'Del endometrio mediante legrado', 'De la vulva y los labios menores'],
        'Espátula de Ayre en el exocérvix y cepillo en el endocérvix, sin duchas ni relaciones previas y fuera de la menstruación; cribado desde los 21 hasta los 65 años.'),
      mk(k + 2, 'Cuadrante de la mama con más tejido glandular, que se prolonga hacia la axila', 'Superoexterno (con la cola de Spence)',
        ['Inferointerno', 'Superointerno', 'Inferoexterno'],
        'Es donde con más frecuencia se localizan los nódulos; la palpación sistemática (bandas, espiral o radial) debe incluir la cola de Spence, la región retroareolar y la axila.'),
      f
        ? mk(k + 3, `Autoexamen de mama y cribado recomendados para esta persona (${c.age} años, ${meno ? 'posmenopáusica' : 'menstrúa'})`,
          meno ? 'Autoexamen un día fijo cada mes y mamografía cada 1–2 años' : 'Autoexamen 5–7 días después de la menstruación; sin mamografía de cribado antes de los 40',
          meno ? ['Autoexamen 5–7 días tras la menstruación y sin mamografía', 'Solo cuando hay síntomas', 'Mamografía mensual'] : ['Autoexamen justo antes de la menstruación y mamografía anual', 'Solo cuando hay síntomas', 'Autoexamen un día fijo y mamografía cada 2 años'],
          meno ? 'Tras la menopausia la mama es de predominio adiposo y menos nodular; el cribado mamográfico se recomienda habitualmente entre los 50 y los 69–74 años según la guía local.'
            : 'En la fase posmenstrual la mama está menos congestiva y sensible; antes de los 40 años y sin factores de riesgo no se indica mamografía de cribado.')
        : mk(k + 3, 'Momento recomendado para el autoexamen mensual de mama en una mujer que menstrúa', 'Entre los días 5 y 7 tras la menstruación',
          ['Justo antes de la menstruación', 'Durante la ovulación solamente', 'Solo cuando hay síntomas'],
          'La mama está menos congestiva y sensible; tras la menopausia se elige un día fijo cada mes.')
    ];
  };

  NormalEngine.build({
    id: 'gu', title: 'Genitourinario y mama (normal)', icon: '🚻', group: 'Exploración normal',
    desc: 'Exploración normal del riñón y vías urinarias, genitales masculinos y femeninos, y mama, con diagramas esquemáticos.',
    bullets: ['Puñopercusión lumbar, maniobra de Guyon, puntos ureterales y orina normal', 'Testículos, tacto rectal y próstata; exploración ginecológica y Papanicolaou', 'Mapa de cuadrantes, cola de Spence, axila, autoexamen y cribado'],
    refs: [
      'Argente HA, Álvarez ME. <i>Semiología Médica. Fisiopatología, semiotecnia y propedéutica</i>. Editorial Médica Panamericana — Aparato urinario (puñopercusión lumbar, palpación renal y puntos ureterales), aparato genital masculino y tacto rectal, aparato genital femenino y examen de la mama.',
      'Bickley LS. <i>Bates. Guía de exploración física e historia clínica</i>. Wolters Kluwer — Mama y axilas; genitales femeninos (cambios posmenopáusicos); genitales masculinos y próstata.',
      'Guías de cribado (OMS; sociedades de ginecología y oncología locales) — citología cervical y mamografía según la edad; los intervalos pueden variar según el país.'
    ],
    teaching: [
      'Antes de explorar genitales y mama: explicar el procedimiento, obtener el consentimiento, ofrecer un acompañante, garantizar la privacidad y la confidencialidad, y cubrir al paciente salvo la zona explorada.',
      'Riñón: puñopercusión lumbar (signo de Giordano) en el ángulo costovertebral, palpación bimanual (maniobra de Guyon, peloteo renal) y puntos ureterales superior, medio e inferior; en la persona sana todo es indoloro y los riñones no se palpan (salvo el polo inferior derecho en delgados).',
      'Varón: compara ambos testículos (4–5 cm, 15–25 mL, firme-elásticos y lisos), palpa epidídimo y cordón, usa la transiluminación y busca hernias con Valsalva; el tacto rectal valora el esfínter, la ampolla y la próstata (tamaño, consistencia, superficie, surco medio, límites, movilidad y sensibilidad).',
      'Mujer: inspección externa, espéculo (cuello rosado y liso, flujo fisiológico), Papanicolaou según la edad y tacto bimanual (útero en anteversoflexión de 7–8 cm; anexos no palpables). Tras la menopausia son normales la atrofia vulvovaginal, el útero más pequeño y los ovarios no palpables.',
      'Mama: inspección sentada con brazos caídos, elevados y manos en las caderas; palpación en decúbito con bandas verticales, espiral o radial, incluyendo cola de Spence, región retroareolar, pezón y axila. Tras la menopausia la mama es de predominio adiposo; cribado mamográfico según la edad.'
    ],
    scenes: [rinon, masc, fem, mama],
    quiz
  });
})();
