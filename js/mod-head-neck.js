/* Módulo: Cabeza y cuello (exploración normal).
   Escenas: cara y facies, fondo de ojo, oído, nariz, boca y fauces, cuello, tiroides y cadenas ganglionares.
   Usa NormalEngine.build; los controles extra (ojo D/I, ROM cervical, lengua, etc.) se añaden con el gancho `after`.
   Nomenclatura y técnica según Argente-Álvarez (Semiología Médica); hallazgos en el esquema «Técnica / Hallazgo normal». */
(function () {
  'use strict';
  const { clamp, tween, esc, svgPoint } = U;
  const NS = 'http://www.w3.org/2000/svg';
  const SKIN = '#f1c9a5', SKIN_D = '#b98a63';

  /* ---------------------------------------------------------------- utilidades */
  function injectStyle() {
    if (document.getElementById('hn-style')) return;
    const s = document.createElement('style');
    s.id = 'hn-style';
    s.textContent = `
.hn-panel{display:flex;flex-wrap:wrap;gap:12px;padding:10px 12px;background:var(--panel);color:var(--ink);border-top:1px solid var(--line)}
.hn-box{flex:1 1 260px;min-width:240px}
.hn-box h5{margin:0 0 6px;font-size:13px;color:var(--muted);font-weight:600}
.hn-btns{display:flex;flex-wrap:wrap;gap:6px}
.hn-btns button{border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:8px;padding:4px 9px;font-size:12.5px;cursor:pointer}
.hn-btns button:hover{border-color:var(--brand)}
.hn-btns button.on{background:var(--brand);color:var(--brand-ink);border-color:var(--brand);font-weight:600}
.hn-read{font-size:13px;margin-top:6px;min-height:38px;color:var(--ink)}
.hn-box input[type=range]{width:100%}
.hn-tag{background:var(--panel);color:var(--ink);padding:4px 9px;border-radius:8px;border:1px solid var(--line);font-size:12px}
.hn-box svg{display:block}`;
    document.head.appendChild(s);
  }
  const mk = (tag, attrs, html) => {
    const e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(k => e.setAttribute(k, attrs[k]));
    if (html) e.innerHTML = html;
    return e;
  };
  const poly = (pts, mx) => 'M' + pts.map(p => `${mx ? mx(p[0]) : p[0]} ${p[1]}`).join(' L') + ' Z';
  const ellPts = (cx, cy, rx, ry, n) => {
    const a = [];
    for (let i = 0; i < n; i++) { const t = 2 * Math.PI * i / n; a.push([+(cx + rx * Math.cos(t)).toFixed(1), +(cy + ry * Math.sin(t)).toFixed(1)]); }
    return a;
  };
  const seg = (stage, items, current, onPick) => {
    const bar = document.createElement('div');
    bar.className = 'overlay-top';
    bar.innerHTML = '<div class="seg">' + items.map(([v, t]) => `<button data-v="${v}" class="${v === current ? 'active' : ''}">${t}</button>`).join('') + '</div>';
    bar.addEventListener('click', e => { const b = e.target.closest('button'); if (b) onPick(b.dataset.v); });
    stage.appendChild(bar);
    return bar;
  };
  /* Linterna de bolsillo que aparece un instante junto al punto explorado. */
  function penlight(svg, p, ms) {
    const g = mk('g', { 'pointer-events': 'none', transform: `translate(${p.x + 50} ${p.y + 50}) rotate(-45)` },
      '<polygon points="-24,-6 24,-6 7,-62 -7,-62" fill="#fff6a8" opacity=".5"/><rect x="-7" y="0" width="14" height="64" rx="5" fill="#4a5560"/><rect x="-8" y="-6" width="16" height="12" rx="3" fill="#f4d03f"/>');
    svg.appendChild(g);
    tween(ms || 1500, () => {}, () => g.remove());
  }
  function fingers(svg, x, y, ms, n) {
    const g = mk('g', { 'pointer-events': 'none' });
    const k = n || 2;
    for (let i = 0; i < k; i++) g.appendChild(mk('ellipse', { cx: x + (i - (k - 1) / 2) * 15, cy: y, rx: 8, ry: 12, fill: SKIN, stroke: SKIN_D, 'stroke-width': 2, opacity: .92 }));
    svg.appendChild(g);
    tween(ms || 1300, u => g.setAttribute('opacity', u < .7 ? 1 : 1 - (u - .7) / .3), () => g.remove());
  }
  /* Cambios involutivos (canicie marcada, arco senil, arrugas) solo a partir de los 65 años; la persona de 60 años
     solo muestra presbicia y canas dispersas. */
  const ageOld = c => c.age >= 65;
  /* Esquema de redacción de los hallazgos: «Técnica: … Hallazgo normal: …» */
  const TH = (t, h) => `<i>Técnica:</i> ${t} <i>Hallazgo normal:</i> ${h}`;

  /* ============================================================ 1. CABEZA Y CARA */
  const HX = 270;
  function faceSvg(learn, c) {
    const old = ageOld(c), f = c.sex === 'F';
    const hair = old ? '#c8ccd2' : (f ? '#4a2f20' : '#3a2a1e');
    const hl = old ? 150 : 166;
    const eye = (cx, id) => `
      <clipPath id="hnCl${id}"><path d="M${cx - 37} 272 Q${cx} 248 ${cx + 37} 272 Q${cx} 295 ${cx - 37} 272 Z"/></clipPath>
      <path d="M${cx - 37} 272 Q${cx} 248 ${cx + 37} 272 Q${cx} 295 ${cx - 37} 272 Z" fill="#fbfbfb"/>
      <g clip-path="url(#hnCl${id})">
        <circle cx="${cx}" cy="272" r="15" fill="#6b4a2f"/><circle cx="${cx}" cy="272" r="11" fill="#7d5a3a"/>
        <circle id="hnPup${id}" cx="${cx}" cy="272" r="5" fill="#0b0b0b"/>
        <circle cx="${cx + 5}" cy="267" r="2.4" fill="#fff" opacity=".9"/>
        ${old ? `<circle cx="${cx}" cy="272" r="14.4" fill="none" stroke="#d9d9d2" stroke-width="1.3" opacity=".85"/>` : ''}
      </g>
      <path d="M${cx - 37} 272 Q${cx} 246 ${cx + 37} 272" fill="none" stroke="#6b4a3a" stroke-width="2.6"/>
      <path d="M${cx - 37} 272 Q${cx} 295 ${cx + 37} 272" fill="none" stroke="#a37c63" stroke-width="1.4"/>`;

    /* ojo ampliado (derecho del paciente) */
    const IX = 660, IY = 215;
    let lashes = '';
    for (let i = 0; i <= 14; i++) {
      const t = i / 14, x = 550 + 220 * t, y = 215 - 4 * (1 - Math.pow(2 * t - 1, 2)) * 17.5 - 0;
      const yy = 215 - 75 * (1 - Math.pow(2 * t - 1, 2)) * 0.5 + 0; // aproximación del borde palpebral
      lashes += `<line x1="${x.toFixed(1)}" y1="${yy.toFixed(1)}" x2="${(x + (t - .5) * 10).toFixed(1)}" y2="${(yy - 12).toFixed(1)}" stroke="#3a2a1e" stroke-width="2" stroke-linecap="round"/>`;
    }
    let vess = '';
    [[560, 222, 590, 214, 616, 224], [748, 214, 722, 228, 706, 218], [600, 236, 624, 246, 640, 242]].forEach(v => {
      vess += `<path d="M${v[0]} ${v[1]} Q${v[2]} ${v[3]} ${v[4]} ${v[5]}" fill="none" stroke="#d98a8a" stroke-width="1" opacity=".7"/>`;
    });
    const inset = `
      <rect x="520" y="62" width="280" height="300" rx="14" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="2"/>
      <text x="660" y="84" text-anchor="middle" class="svg-title">Ojo derecho · vista ampliada</text>
      <clipPath id="hnClI"><path d="M550 215 Q660 140 770 215 Q660 292 550 215 Z"/></clipPath>
      <path d="M550 215 Q660 140 770 215 Q660 292 550 215 Z" fill="#fbfbfb"/>
      <g clip-path="url(#hnClI)">
        ${vess}
        <circle cx="${IX}" cy="${IY}" r="52" fill="#6b4a2f"/><circle cx="${IX}" cy="${IY}" r="42" fill="#7d5a3a"/>
        <g stroke="#5a3d25" stroke-width="1" opacity=".5">${[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(a => `<line x1="${IX + 20 * Math.cos(a * Math.PI / 180)}" y1="${IY + 20 * Math.sin(a * Math.PI / 180)}" x2="${IX + 44 * Math.cos(a * Math.PI / 180)}" y2="${IY + 44 * Math.sin(a * Math.PI / 180)}"/>`).join('')}</g>
        <circle id="hnPupI" cx="${IX}" cy="${IY}" r="17" fill="#0b0b0b"/>
        <ellipse cx="${IX + 14}" cy="${IY - 15}" rx="9" ry="6" fill="#fff" opacity=".85"/>
        ${old ? `<circle cx="${IX}" cy="${IY}" r="51" fill="none" stroke="#dcdcd4" stroke-width="3" opacity=".6"/>` : ''}
      </g>
      <ellipse cx="760" cy="222" rx="9" ry="7" fill="#e49a92"/>
      <path d="M575 256 Q660 288 745 256 Q660 274 575 256 Z" fill="#e4807a" opacity=".85"/>
      <path d="M550 215 Q660 140 770 215" fill="none" stroke="#6b4a3a" stroke-width="5"/>
      <path d="M552 214 Q660 292 768 214" fill="none" stroke="#a37c63" stroke-width="2.5"/>
      <path d="M540 190 Q660 100 780 190" fill="none" stroke="${SKIN_D}" stroke-width="2.2"/>
      ${lashes}`;

    const wr = old ? `<path d="M215 156 Q270 148 325 156 M222 172 Q270 164 318 172 M170 280 q-12 2 -17 10 M370 280 q12 2 17 10 M170 296 q-12 6 -14 16 M370 296 q12 6 14 16" fill="none" stroke="${SKIN_D}" stroke-width="1.3" opacity=".55"/>` : '';
    const sideHair = f ? `<path d="M132 262 C118 360 122 430 150 462 L168 440 C154 390 152 320 152 262 Z" fill="${hair}"/><path d="M408 262 C422 360 418 430 390 462 L372 440 C386 390 388 320 388 262 Z" fill="${hair}"/>` : '';
    return `
    <rect x="0" y="0" width="820" height="600" fill="#e8eef4"/>
    <path d="M205 440 L205 520 Q120 540 40 600 L500 600 Q420 540 335 520 L335 440 Z" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3"/>
    <path d="M40 600 Q120 548 205 528 L270 566 L335 528 Q420 548 500 600 Z" fill="#9fb4c4"/>
    <ellipse cx="${HX - 140}" cy="305" rx="15" ry="38" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3"/>
    <ellipse cx="${HX + 140}" cy="305" rx="15" ry="38" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3"/>
    <ellipse cx="${HX}" cy="300" rx="140" ry="180" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3"/>
    ${sideHair}
    <path d="M132 276 C124 118 215 92 270 92 C325 92 416 118 408 276 C396 214 350 ${hl} 270 ${hl} C190 ${hl} 144 214 132 276 Z" fill="${hair}"/>
    <path d="M150 218 Q140 188 152 160" fill="none" stroke="#b05a5a" stroke-width="2" opacity=".35"/>
    <path d="M390 218 Q400 188 388 160" fill="none" stroke="#b05a5a" stroke-width="2" opacity=".35"/>
    <path d="M172 252 Q208 232 246 248 M294 248 Q332 232 368 252" fill="none" stroke="${hair}" stroke-width="6" stroke-linecap="round"/>
    ${eye(210, 'R')}${eye(330, 'L')}
    <path d="M270 262 Q262 322 248 342 Q270 354 292 342 Q278 322 270 262" fill="none" stroke="${SKIN_D}" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="258" cy="344" rx="5" ry="3" fill="#7a4a35"/><ellipse cx="282" cy="344" rx="5" ry="3" fill="#7a4a35"/>
    <ellipse id="hnMouthO" cx="270" cy="411" rx="28" ry="1" fill="#4a1a1d"/>
    <path d="M238 410 Q254 398 270 404 Q286 398 302 410 Q270 414 238 410 Z" fill="#c46a63"/>
    <g id="hnLow"><path d="M238 410 Q270 440 302 410 Q270 422 238 410 Z" fill="#d27d73"/></g>
    <text id="hnMm" x="332" y="440" opacity="0" class="svg-title">≈ 45 mm</text>
    ${wr}
    ${inset}
    ${learn ? '' : ''}`;
  }

  const eyeLook = c => TH('inspección de párpados, conjuntivas, esclera, córnea e iris con buena luz, comparando ambos ojos.',
    `párpados simétricos, sin edema ni ptosis (el superior cubre 1-2 mm del limbo); conjuntivas rosadas y húmedas, esclera blanca, córnea transparente y brillante; pupilas redondas, centrales e isocóricas de <b>2-4 mm</b>.${ageOld(c) ? ' <b>Arco senil</b> (anillo blanco-grisáceo en la periferia de la córnea): variante normal del adulto mayor.' : ''}`);
  const snellenTxt = c => TH('cartilla de Snellen a 6 m, cada ojo por separado (con sus lentes si los usa); visión cercana con cartilla de Jaeger a 35 cm.',
    `agudeza visual lejana <b>20/20 (6/6)</b> en ambos ojos y visión cercana normal.${c.age >= 45 ? ' Necesita lentes para leer de cerca: <b>presbicia</b>, pérdida fisiológica de la acomodación desde los 40-45 años.' : ''}`);
  const lightTxt = TH('en penumbra, luz de la linterna desde el lado hacia una pupila: se observa esa pupila (reflejo fotomotor directo) y la contralateral (consensual); luego se pide mirar un objeto cercano (acomodación-convergencia).',
    'ambas pupilas se contraen con rapidez y de forma simétrica (de 2-4 mm a ≈ 2 mm) y se redilatan al retirar la luz; miosis y convergencia al mirar de cerca.');
  const pupilRun = ctx => { penlight(ctx.svg, ctx.point, 2200); pupilReflex(ctx.svg); if (ctx.sh.say) ctx.sh.say('(sigue la luz sin molestia)', 'yes', 1800); };
  function pupilReflex(svg) {
    const ps = [['hnPupR', 5, 3], ['hnPupL', 5, 3], ['hnPupI', 17, 10]];
    tween(2200, u => {
      const k = u < .18 ? u / .18 : u < .6 ? 1 : 1 - (u - .6) / .4;
      ps.forEach(([id, a, b]) => { const e = svg.querySelector('#' + id); if (e) e.setAttribute('r', (a - (a - b) * k).toFixed(2)); });
    });
  }
  function openMouth(svg) {
    const mo = svg.querySelector('#hnMouthO'), low = svg.querySelector('#hnLow'), lbl = svg.querySelector('#hnMm');
    if (!mo) return;
    tween(2800, u => {
      const k = u < .3 ? u / .3 : u < .72 ? 1 : 1 - (u - .72) / .28;
      const h = 1 + 56 * k;
      mo.setAttribute('ry', (h / 2).toFixed(1)); mo.setAttribute('cy', (410 + h / 2).toFixed(1));
      low.setAttribute('transform', `translate(0 ${h.toFixed(1)})`);
      lbl.setAttribute('opacity', k > .9 ? 1 : 0);
    });
  }

  const faceRegions = [
    { id: 'cranio', label: 'Cráneo y cuero cabelludo', short: 'Cráneo', cx: 270, cy: 134, r: 34, lx: 270, ly: 82,
      tools: {
        look: c => TH('inspección del cráneo (tamaño, forma, simetría) y del cabello (implantación, distribución, cantidad).',
          `cráneo normocéfalo y simétrico, sin deformidades ni cicatrices; ${ageOld(c) ? 'cabello canoso y más ralo, con entradas propias de la edad' : c.age >= 50 ? 'cabello bien implantado, con canas dispersas' : 'cabello bien implantado, de distribución uniforme y brillante'}; cuero cabelludo sin descamación ni lesiones.`),
        touch: TH('palpación con las yemas, en círculos, de adelante hacia atrás.', 'superficie ósea lisa y uniforme, sin masas, hundimientos, crepitación ni dolor; cuero cabelludo móvil.')
      } },
    { id: 'frente', label: 'Frente y facies', short: 'Frente / facies', cx: 270, cy: 204, r: 20,
      tools: {
        look: c => TH('observar la expresión, la simetría y la mímica mientras el paciente habla.',
          `<b>facies compuesta</b> (normal): expresión tranquila y atenta, simétrica, mímica conservada (arruga la frente, surcos nasogenianos simétricos); piel de color uniforme, sin edema${ageOld(c) ? ', con arrugas propias de la edad' : ''}.`),
        touch: TH('palpación de la frente y las mejillas con el dorso y las yemas de los dedos.', 'piel tibia, de humedad normal, elástica; sin masas, nódulos ni dolor.')
      } },
    { id: 'temR', label: 'Arteria temporal superficial derecha', short: 'A. temporal', cx: 148, cy: 206, r: 15, anchor: 'end', lx: 128, ly: 190,
      tools: {
        look: 'Arteria no visible o apenas insinuada sobre la sien; sin tortuosidad, engrosamiento ni eritema.',
        touch: c => TH('palpación con las yemas por delante del trago y sobre la sien.', `pulso temporal superficial presente y simétrico (≈ ${c.v.hr}/min), de amplitud normal; pared blanda, no engrosada, nodular ni dolorosa.`)
      } },
    { id: 'temL', label: 'Arteria temporal superficial izquierda', short: 'A. temporal', cx: 392, cy: 206, r: 15, anchor: 'start', lx: 412, ly: 190,
      tools: {
        look: 'Arteria no visible o apenas insinuada; sin tortuosidad, engrosamiento ni eritema.',
        touch: c => `Pulso temporal izquierdo presente (≈ ${c.v.hr}/min), de igual amplitud que el derecho; pared blanda e indolora.`
      } },
    { id: 'frontR', label: 'Seno frontal derecho', short: 'S. frontal', cx: 232, cy: 224, r: 12, anchor: 'end', lx: 206, ly: 214,
      tools: {
        look: 'Región frontal sin tumefacción ni eritema.',
        touch: TH('presión con el pulgar hacia arriba, bajo el reborde orbitario superior (techo de la órbita).', '<b>indolora</b>, sin edema ni eritema.'),
        tap: TH('percusión suave con el dedo sobre el seno frontal.', 'indolora y simétrica con el otro lado.')
      } },
    { id: 'frontL', label: 'Seno frontal izquierdo', short: 'S. frontal', cx: 308, cy: 224, r: 12, anchor: 'start', lx: 334, ly: 214,
      tools: {
        look: 'Región frontal sin tumefacción ni eritema.',
        touch: 'Presión bajo el reborde orbitario superior izquierdo: indolora.',
        tap: 'Percusión del seno frontal izquierdo: indolora y simétrica.'
      } },
    { id: 'ojoR', label: 'Ojo derecho (del paciente)', short: 'Ojo D', cx: 210, cy: 272, r: 25, lx: 210, ly: 306,
      tools: {
        look: c => eyeLook(c), light: { html: lightTxt, run: pupilRun },
        snellen: c => ({ html: snellenTxt(c), run: ctx => ctx.sh.say('Leo toda la línea 20/20', 'yes') }),
        touch: TH('palpación suave del globo ocular a través del párpado cerrado, con ambos índices, mientras el paciente mira hacia abajo.', 'tensión similar en ambos ojos (firme-elástica), sin dolor.')
      } },
    { id: 'ojoL', label: 'Ojo izquierdo (del paciente)', short: 'Ojo I', cx: 330, cy: 272, r: 25, lx: 330, ly: 306,
      tools: {
        look: c => eyeLook(c), light: { html: lightTxt, run: pupilRun },
        snellen: c => ({ html: snellenTxt(c), run: ctx => ctx.sh.say('Leo toda la línea 20/20', 'yes') }),
        touch: 'Palpación del globo ocular a través del párpado cerrado: tensión igual a la del ojo derecho; sin dolor.'
      } },
    { id: 'maxR', label: 'Seno maxilar derecho', short: 'S. maxilar', cx: 212, cy: 350, r: 15, lx: 212, ly: 378,
      tools: {
        look: 'Mejillas simétricas, sin tumefacción ni eritema.',
        touch: TH('presión con los pulgares sobre los pómulos, bajo el reborde orbitario inferior.', '<b>indolora</b>, sin edema ni eritema.'),
        tap: TH('percusión suave con el dedo sobre la fosa canina.', 'indolora y simétrica; sin molestia dentaria.')
      } },
    { id: 'maxL', label: 'Seno maxilar izquierdo', short: 'S. maxilar', cx: 328, cy: 350, r: 15, lx: 328, ly: 378,
      tools: {
        look: 'Mejillas simétricas, sin tumefacción.',
        touch: 'Presión sobre el pómulo izquierdo: indolora.',
        tap: 'Percusión sobre la fosa canina izquierda: indolora y simétrica.'
      } },
    { id: 'atmR', label: 'Articulación temporomandibular derecha', short: 'ATM', cx: 158, cy: 322, r: 12, anchor: 'start', lx: 172, ly: 348,
      tools: {
        touch: { html: TH('yemas de los índices por delante del trago mientras el paciente abre y cierra la boca.', 'movimiento simétrico y suave, <b>sin chasquidos, crepitación ni dolor</b>; apertura bucal de <b>40-50 mm</b> (≈ 3 traveses de dedo) sin desviación de la mandíbula.'), run: ctx => openMouth(ctx.svg) },
        look: { html: 'Al abrir la boca la mandíbula desciende sin desviarse de la línea media; sin tumefacción preauricular.', run: ctx => openMouth(ctx.svg) }
      } },
    { id: 'atmL', label: 'Articulación temporomandibular izquierda', short: 'ATM', cx: 382, cy: 322, r: 12, anchor: 'end', lx: 368, ly: 348,
      tools: {
        touch: { html: 'Movimiento simétrico con el lado derecho, sin ruidos ni dolor; apertura de 40-50 mm en la línea media.', run: ctx => openMouth(ctx.svg) },
        look: { html: 'Apertura simétrica, mandíbula en la línea media.', run: ctx => openMouth(ctx.svg) }
      } },
    { id: 'parR', label: 'Parótida derecha', short: 'Parótida', cx: 160, cy: 392, r: 19, anchor: 'start', lx: 182, ly: 402,
      tools: {
        look: 'Región parotídea sin aumento de volumen: el ángulo de la mandíbula se ve bien y el lóbulo de la oreja no está desplazado.',
        touch: TH('palpación con las yemas por delante y debajo del pabellón; con un dedo en la mucosa yugal se examina el conducto de Stenon (frente al 2.º molar superior).', 'glándula <b>no palpable</b> (blanda, no se distingue del masetero); sin masas ni dolor; conducto no engrosado.')
      } },
    { id: 'parL', label: 'Parótida izquierda', short: 'Parótida', cx: 380, cy: 392, r: 19, anchor: 'end', lx: 358, ly: 402,
      tools: {
        look: 'Región parotídea simétrica, sin tumefacción.',
        touch: 'Parótida no palpable, sin masas ni dolor; simétrica con la derecha.'
      } },
    { id: 'subR', label: 'Glándula submaxilar (submandibular) derecha', short: 'Submaxilar', cx: 214, cy: 474, r: 16, anchor: 'end', lx: 192, ly: 496,
      tools: {
        look: 'Región submaxilar sin abultamientos.',
        touch: TH('palpación bimanual: un dedo enguantado en el piso de la boca y los dedos de la otra mano por debajo del cuerpo de la mandíbula.', 'glándula <b>no palpable</b> o blanda, lisa, móvil e indolora; no confundir con ganglios submaxilares (si se palpan, &lt; 1 cm, blandos y móviles).')
      } },
    { id: 'subL', label: 'Glándula submaxilar (submandibular) izquierda', short: 'Submaxilar', cx: 326, cy: 474, r: 16, anchor: 'start', lx: 348, ly: 496,
      tools: {
        look: 'Región submaxilar simétrica, sin abultamientos.',
        touch: 'Glándula no palpable o blanda, lisa y móvil; indolora; simétrica con la derecha.'
      } },
    /* ---- ojo ampliado ---- */
    { id: 'lids', label: 'Párpados y pestañas', short: 'Párpados', x: 560, y: 108, w: 200, h: 34, rx: 10,
      tools: {
        look: TH('inspección con el paciente mirando al frente y luego hacia arriba y abajo.', 'el párpado superior cubre 1-2 mm del limbo y el inferior roza el borde del iris; parpadeo simétrico, borde palpebral liso, pestañas hacia afuera; sin edema, ptosis, ectropión ni entropión.'),
        touch: 'Párpados blandos, sin nódulos ni dolor; reborde orbitario sin masas.'
      } },
    { id: 'cornea', label: 'Córnea e iris', short: 'Córnea / iris', cx: 660, cy: 215, r: 50, lx: 660, ly: 318,
      tools: {
        look: c => TH('luz oblicua sobre la córnea y reflejos corneales con la linterna a ≈ 40 cm.', `córnea <b>transparente</b> y brillante, con reflejo luminoso nítido y centrado en ambos ojos; iris de color y relieve uniformes.${ageOld(c) ? ' Arco senil periférico, normal en el adulto mayor.' : ''}`),
        light: { html: lightTxt, run: pupilRun }
      } },
    { id: 'pupila', label: 'Pupila', short: '', cx: 660, cy: 215, r: 17,
      tools: {
        look: TH('inspección con luz ambiental difusa, comparando ambas pupilas.', 'pupila negra, redonda, central y de bordes regulares; diámetro de <b>2-4 mm</b> (hasta 5 mm en jóvenes o en penumbra); isocoria (diferencia &lt; 1 mm).'),
        light: { html: lightTxt, run: pupilRun }
      } },
    { id: 'scl', label: 'Esclera', short: 'Esclera', cx: 590, cy: 215, r: 16, anchor: 'end', lx: 568, ly: 219,
      tools: { look: 'Esclera <b>blanca</b>, sin tinte amarillo (ictericia) ni enrojecimiento; algún vaso conjuntival fino es normal.' } },
    { id: 'conj', label: 'Conjuntiva palpebral', short: 'Conjuntiva', x: 575, y: 258, w: 170, h: 24, rx: 10,
      tools: {
        look: TH('se desciende el párpado inferior con el pulgar mientras el paciente mira hacia arriba.', 'conjuntiva palpebral <b>rosada</b>, húmeda, lisa y brillante, sin palidez, folículos ni secreción; conjuntiva bulbar transparente.'),
        touch: 'Tracción suave del párpado inferior: indolora; sin secreción.'
      } }
  ];
  /* ============================================================ 2. FONDO DE OJO */
  let fSide = 'OD', fTimer = null;
  const fx = x => (fSide === 'OD' ? x : 676 - x);
  const FUND_ARC = [
    'M448 242 C425 150 300 118 140 170', 'M448 256 C425 360 300 396 140 346',
    'M456 238 C490 205 530 185 575 172', 'M456 260 C490 295 530 320 575 340'
  ];
  const FUND_TWIG = [
    'M344 152 C310 175 270 205 262 232', 'M344 355 C310 335 272 312 262 298', 'M231 149 C215 130 195 122 170 122',
    'M231 365 C215 385 195 392 170 392', 'M520 190 C535 170 560 160 590 158', 'M520 322 C535 340 560 350 590 352'
  ];
  function fundusSvg(learn, c) {
    const flip = fSide === 'OD' ? '' : 'translate(676 0) scale(-1 1)';
    const old = ageOld(c);
    const veins = FUND_ARC.map(d => `<path d="${d}" transform="translate(0 6)" fill="none" stroke="#7a1414" stroke-width="7" stroke-linecap="round"/>`).join('');
    const arts = FUND_ARC.map(d => `<path d="${d}" transform="translate(0 -6)" fill="none" stroke="#cf3220" stroke-width="4.4" stroke-linecap="round"/>` +
      `<path d="${d}" transform="translate(0 -6)" fill="none" stroke="#ffb59a" stroke-width="1.1" stroke-linecap="round" opacity=".8"/>`).join('');
    const twigs = FUND_TWIG.map(d => `<path d="${d}" fill="none" stroke="#a82a1c" stroke-width="2.4" stroke-linecap="round"/>`).join('');
    const ttl = fSide === 'OD' ? 'Ojo derecho (OD)' : 'Ojo izquierdo (OI)';
    const panel = learn ? `
      <text x="598" y="64" class="svg-title">${ttl}</text>
      <text x="598" y="92" class="svg-small">• Retina rojo-anaranjada,</text>
      <text x="598" y="108" class="svg-small">  uniforme</text>
      <text x="598" y="130" class="svg-small">• Disco: borde nítido, rosado</text>
      <text x="598" y="152" class="svg-small">• Excavación/disco ≈ 0,3</text>
      <text x="598" y="174" class="svg-small">• Arteria : vena = 2 : 3</text>
      <text x="598" y="196" class="svg-small">• Mácula avascular con</text>
      <text x="598" y="212" class="svg-small">  reflejo foveal</text>
      <text x="598" y="244" class="svg-small">El disco está del lado nasal:</text>
      <text x="598" y="260" class="svg-small">${fSide === 'OD' ? 'a la derecha de la mácula (OD)' : 'a la izquierda de la mácula (OI)'}</text>` : `
      <text x="598" y="64" class="svg-title">${ttl}</text>
      <text x="598" y="92" class="svg-small">Examina disco, vasos,</text>
      <text x="598" y="108" class="svg-small">mácula y retina.</text>`;
    return `
    <defs>
      <radialGradient id="hnRet" cx=".5" cy=".5" r=".62"><stop offset="0" stop-color="#e2663a"/><stop offset=".65" stop-color="#cf4b27"/><stop offset="1" stop-color="#8f2415"/></radialGradient>
      <radialGradient id="hnDisc" cx=".5" cy=".5" r=".55"><stop offset="0" stop-color="#fbe6bd"/><stop offset=".7" stop-color="#f1b585"/><stop offset="1" stop-color="#e8946a"/></radialGradient>
      <clipPath id="hnFc"><circle cx="338" cy="262" r="238"/></clipPath>
    </defs>
    <circle cx="338" cy="262" r="252" fill="#0a0a0a"/>
    <g transform="${flip}">
      <g clip-path="url(#hnFc)">
        <circle cx="338" cy="262" r="244" fill="url(#hnRet)"/>
        <g opacity=".12" fill="#5a1208"><ellipse cx="300" cy="230" rx="60" ry="26"/><ellipse cx="190" cy="330" rx="50" ry="22"/><ellipse cx="380" cy="360" rx="70" ry="20"/><ellipse cx="260" cy="120" rx="60" ry="16"/></g>
        <ellipse cx="225" cy="268" rx="50" ry="44" fill="#a8341b" opacity=".5"/>
        <ellipse cx="225" cy="268" rx="22" ry="20" fill="#9a2b17" opacity=".55"/>
        <circle cx="225" cy="268" r="15" fill="none" stroke="#f2a65a" stroke-width="1.6" opacity=".45"/>
        <circle cx="225" cy="268" r="3.6" fill="#f7cf86"/>
        ${twigs}${veins}${arts}
        <ellipse cx="450" cy="248" rx="36" ry="41" fill="url(#hnDisc)" stroke="#dc8a5c" stroke-width="2"/>
        <ellipse cx="445" cy="250" rx="11" ry="12.5" fill="#fff3d6"/>
        <path d="M446 244 C441 236 440 230 442 224" fill="none" stroke="#c9301f" stroke-width="4" stroke-linecap="round"/>
        <path d="M450 252 C456 262 456 270 452 276" fill="none" stroke="#7a1414" stroke-width="5" stroke-linecap="round"/>
      </g>
    </g>
    <circle cx="338" cy="262" r="244" fill="none" stroke="#050505" stroke-width="22" opacity=".75"/>
    ${panel}`;
  }
  function fundusRegions() {
    const X = fx, T = t => ({ oft: t, foto: t });
    return [
      { id: 'retina', label: 'Retina periférica', short: 'Retina', cx: X(215), cy: 400, r: 36, lx: X(215), ly: 456,
        tools: T('Retina de color <b>rojo-anaranjado</b> uniforme (varía con la pigmentación de la persona), brillante, sin hemorragias, exudados ni manchas pigmentadas.') },
      { id: 'macula', label: 'Mácula', short: 'Mácula', cx: X(225), cy: 268, r: 46,
        tools: T('<b>Mácula</b>: zona oval algo más oscura y <b>avascular</b>, a ≈ 2 diámetros papilares del lado temporal del disco; sin exudados ni hemorragias. Se examina al final (es la zona que más deslumbra) pidiendo al paciente que mire la luz.') },
      { id: 'fovea', label: 'Fóvea (reflejo foveal)', short: 'Fóvea', cx: X(225), cy: 268, r: 8, lx: X(225), ly: 336,
        tools: T('<b>Reflejo foveal</b>: punto luminoso puntiforme en el centro de la mácula; indica una fóvea sana (zona de máxima agudeza visual).') },
      { id: 'disco', label: 'Disco óptico (papila)', short: 'Disco óptico', cx: X(450), cy: 248, r: 44,
        tools: T('<b>Disco óptico (papila)</b>: redondo u oval, de color <b>rosado-anaranjado</b>, con <b>bordes nítidos</b> (algo menos definidos del lado nasal), de ≈ 1,5 mm; anillo neurorretiniano rosado y uniforme; sin edema, palidez ni elevación. De su centro emergen los vasos.') },
      { id: 'copa', label: 'Excavación fisiológica', short: 'Excavación', cx: X(445), cy: 250, r: 11, lx: X(505), ly: 312,
        tools: T('<b>Excavación fisiológica</b>: depresión central más pálida; <b>relación excavación/disco ≈ 0,3</b> (normal 0,1-0,5); &gt; 0,6 o una asimetría &gt; 0,2 entre ambos ojos es sospechosa.') },
      { id: 'art', label: 'Arteriola retiniana', short: 'Arteria', cx: X(376), cy: 156, r: 6, lx: X(376), ly: 128,
        tools: T('<b>Arteriolas</b>: más finas y de rojo más claro que las venas, con <b>reflejo luminoso central</b> brillante; calibre <b>arteria : vena = 2 : 3</b>; cruces arteriovenosos sin muescas ni desviación de la vena.') },
      { id: 'vena', label: 'Vena retiniana', short: 'Vena', cx: X(311), cy: 152, r: 6, lx: X(311), ly: 178,
        tools: T('<b>Vénulas</b>: más gruesas y oscuras (rojo vinoso), de calibre uniforme y sin reflejo central; <b>pulso venoso espontáneo</b> en la papila en ≈ 80 % de las personas sanas (indica presión intracraneal normal).') }
    ];
  }
  /* ============================================================ 3. OÍDO */
  let earSide = 'D';
  const aX = x => (earSide === 'D' ? x : 340 - x);
  const tX = x => (earSide === 'D' ? x : 1180 - x);
  function earSvg(learn, c) {
    const fl = earSide === 'D' ? '' : 'translate(340 0) scale(-1 1)';
    const flT = earSide === 'D' ? '' : 'translate(1180 0) scale(-1 1)';
    const hair = ageOld(c) ? '#c8ccd2' : (c.sex === 'F' ? '#4a2f20' : '#3a2a1e');
    return `
    <defs>
      <radialGradient id="hnTMg" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#e7dad1"/><stop offset=".7" stop-color="#d3c3b8"/><stop offset="1" stop-color="#bfae9f"/></radialGradient>
      <radialGradient id="hnCan" cx=".5" cy=".5" r=".55"><stop offset=".7" stop-color="#c58c7c"/><stop offset="1" stop-color="#8f5547"/></radialGradient>
      <clipPath id="hnCc"><circle cx="590" cy="300" r="172"/></clipPath>
    </defs>
    <g transform="${fl}">
      <path d="M10 44 Q170 0 330 44 L330 556 L10 556 Z" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="2"/>
      <path d="M10 44 Q170 -8 330 44 L330 118 Q250 96 200 108 Q120 90 70 124 L10 160 Z" fill="${hair}"/>
      <ellipse cx="55" cy="410" rx="22" ry="32" fill="#e6bd98" opacity=".65"/>
      <g id="hnAur" transform="translate(0 55)">
        <path d="M235 95 C150 60 70 120 80 230 C88 320 120 380 150 430 C170 470 235 470 245 425 L250 390 L250 110 Z" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3"/>
        <path d="M228 112 C150 90 100 150 108 232 C114 300 140 350 170 405" fill="none" stroke="${SKIN_D}" stroke-width="3" stroke-linecap="round"/>
        <path d="M185 372 C150 330 148 262 166 205 C178 170 205 150 232 158" fill="none" stroke="${SKIN_D}" stroke-width="3" stroke-linecap="round"/>
        <path d="M166 205 C150 185 160 160 185 150" fill="none" stroke="${SKIN_D}" stroke-width="2" stroke-linecap="round"/>
        <ellipse cx="205" cy="280" rx="34" ry="48" fill="#e2b48c"/>
        <ellipse cx="222" cy="285" rx="12" ry="20" fill="#5a2f25"/>
        <path d="M250 258 C228 258 224 292 250 304 Z" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="2.5"/>
        <ellipse cx="200" cy="347" rx="14" ry="10" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="2.5"/>
      </g>
    </g>
    <text x="170" y="546" text-anchor="middle" class="svg-title">${earSide === 'D' ? 'Oído derecho' : 'Oído izquierdo'} · vista lateral</text>
    <circle cx="590" cy="300" r="205" fill="#0d0d0d"/>
    <circle cx="590" cy="300" r="172" fill="url(#hnCan)"/>
    <g clip-path="url(#hnCc)"><g transform="${flT}">
      <path d="M418 300 a172 172 0 0 1 344 0" fill="none" stroke="#7a3f33" stroke-width="2" opacity=".5"/>
      <g id="hnTM">
        <ellipse cx="590" cy="300" rx="130" ry="145" fill="url(#hnTMg)" stroke="#a8978a" stroke-width="7"/>
        <path d="M575 160 Q615 150 655 168 Q640 190 600 188 Q585 180 575 160 Z" fill="#e3b9ad" opacity=".85"/>
        <path d="M548 225 Q560 255 572 288" fill="none" stroke="#f3eadf" stroke-width="5" stroke-linecap="round" opacity=".55"/>
        <path d="M590 312 L648 208" stroke="#efe4d2" stroke-width="12" stroke-linecap="round"/>
        <path d="M586 316 L644 214 M595 308 L653 204" stroke="#c97b6e" stroke-width="1.2" opacity=".55"/>
        <circle cx="649" cy="206" r="8" fill="#fbf5e8" stroke="#d9c7a8"/>
        <circle cx="590" cy="313" r="6" fill="#bfa896"/>
        <path d="M590 316 L618 412 Q655 412 681 358 Z" fill="#fffbee" opacity=".88"/>
        <path d="M648 208 L610 178 M648 208 L690 226" stroke="#e6d6c6" stroke-width="2.5" opacity=".7"/>
      </g>
    </g></g>
    <text x="590" y="30" text-anchor="middle" class="svg-title">Otoscopia · membrana timpánica</text>
    <text x="590" y="548" text-anchor="middle" class="svg-small">${earSide === 'D' ? 'Cono luminoso a las 5 h (oído derecho)' : 'Cono luminoso a las 7 h (oído izquierdo)'}</text>`;
  }
  const forkRun = (f) => ctx => { try { Sound.beep(f || 512, 1.1, 0.16); } catch (e) { /* noop */ } };
  function earRegions() {
    const right = earSide === 'D';
    const O = t => ({ oto: t });
    const tmPoly = pts => poly(pts, tX);
    const tmEll = tmPoly(ellPts(590, 300, 130, 145, 28));
    const cone = tmPoly([[590, 314], [618, 412], [650, 408], [670, 388], [681, 358]]);
    const handle = tmPoly([[597, 316], [654, 216], [640, 204], [583, 308]]);
    return [
      { id: 'vertex', label: 'Vértex / frente (línea media)', short: 'Vértex', cx: aX(170), cy: 76, r: 17,
        tools: { fork: { html: TH('<b>Weber</b>: diapasón (256-512 Hz) vibrando, apoyado por su pie en el vértex o la frente, en la línea media.', 'el sonido se oye <b>en el centro o por igual en ambos oídos</b>: el Weber no lateraliza.'), run: forkRun(512) } } },
      { id: 'mast', label: 'Apófisis mastoides', short: 'Mastoides', cx: aX(55), cy: 410, r: 21,
        tools: {
          look: 'Región mastoidea sin eritema, edema ni deformidad; pliegue retroauricular conservado.',
          pull: TH('presión firme sobre la mastoides.', 'indolora.'),
          fork: { html: TH('<b>Rinne</b>, conducción ósea: pie del diapasón sobre la mastoides hasta que el paciente deja de oírlo; entonces se acercan las ramas al meato (conducción aérea).', 'vuelve a oírlo por vía aérea: <b>Rinne positivo (CA &gt; CO)</b>; la conducción aérea dura ≈ el doble que la ósea.'), run: forkRun(512) }
        } },
      { id: 'helix', label: 'Pabellón auricular (hélix)', short: 'Pabellón', cx: aX(112), cy: 295, r: 15,
        tools: {
          look: c => TH('inspección de ambos pabellones: implantación, tamaño, forma y piel.', `implantación normal (el borde superior del hélix a la altura del canto externo del ojo), simétricos, sin deformidades, nódulos ni lesiones.${ageOld(c) ? ' Lóbulos algo alargados por la edad.' : ''}`),
          pull: { html: TH('tracción del pabellón hacia atrás y arriba (en el adulto) y presión sobre el trago.', '<b>indoloras</b>; la tracción endereza el conducto para la otoscopia.'), run: ctx => { const a = ctx.svg.querySelector('#hnAur'); if (a) tween(700, u => a.setAttribute('transform', `translate(${(-8 * Math.sin(Math.PI * u)).toFixed(1)} ${(55 - 10 * Math.sin(Math.PI * u)).toFixed(1)})`), () => a.setAttribute('transform', 'translate(0 55)')); } }
        } },
      { id: 'anti', label: 'Antihélix y concha', short: 'Antihélix', cx: aX(160), cy: 350, r: 13, lx: aX(160), ly: 376,
        tools: { look: 'Relieves del hélix, antihélix, fosa triangular y concha bien definidos y simétricos; piel sin lesiones.' } },
      { id: 'tragus', label: 'Trago', short: 'Trago', cx: aX(246), cy: 332, r: 9, lx: aX(284), ly: 318,
        tools: { look: 'Trago íntegro, sin lesiones.', pull: TH('presión sobre el trago.', '<b>indolora</b> (descarta inflamación del conducto).') } },
      { id: 'meato', label: 'Conducto auditivo externo (meato)', short: 'Meato', cx: aX(214), cy: 342, r: 12, lx: aX(214), ly: 400,
        tools: {
          look: 'Meato permeable, piel rosada y lisa, sin secreción, edema ni eritema; algo de cerumen y vellos finos es normal.',
          pull: 'Tracción del pabellón y presión del trago: indoloras.',
          whisper: { html: TH('voz cuchicheada a ≈ 60 cm, fuera del campo visual del paciente, ocluyendo y frotando el trago del oído contrario.', 'repite correctamente las palabras o números: audición conversacional normal.'), run: ctx => ctx.sh.say('Sí, le escucho: "tres, nueve, cuatro"', 'yes') },
          fork: { html: TH('<b>Rinne</b>, conducción aérea: ramas del diapasón vibrando a 2-3 cm del meato.', 'se oye más tiempo y más fuerte que sobre la mastoides: <b>CA &gt; CO (Rinne positivo)</b>.'), run: forkRun(512) }
        } },
      { id: 'lobulo', label: 'Lóbulo', short: 'Lóbulo', cx: aX(198), cy: 497, r: 16,
        tools: { look: 'Lóbulo simétrico, sin lesiones ni nódulos.', pull: 'Tracción del lóbulo: indolora.' } },
      /* ---- otoscopia ---- */
      { id: 'canal', label: 'Pared del conducto', short: 'Conducto', cx: tX(590), cy: 300, r: 170, lx: tX(590), ly: 124,
        tools: O('<b>Conducto auditivo externo</b>: ≈ 2,5 cm, con forma de S (tercio externo cartilaginoso, con pelos y glándulas ceruminosas; dos tercios internos óseos); piel <b>rosada y lisa</b>, sin eritema, edema ni secreción; cerumen escaso y blando.') },
      { id: 'tm', label: 'Pars tensa de la membrana timpánica', short: 'Pars tensa', d: tmEll, lx: tX(550), ly: 380,
        tools: Object.assign(O('<b>Membrana timpánica</b>: íntegra, de color <b>gris perla (nacarada)</b>, brillante y translúcida, ligeramente cóncava, de ≈ 9-10 mm; se describe por cuadrantes (anterosuperior, anteroinferior, posterosuperior, posteroinferior). Sin perforación, retracción, abombamiento ni nivel líquido.'), {
          pneu: { html: TH('<b>otoscopia neumática</b>: otoscopio con pera, espéculo que selle el conducto y presión positiva y negativa suaves.', 'la membrana se desplaza hacia adentro y hacia afuera con agilidad: oído medio aireado.'), run: ctx => { const g = ctx.svg.querySelector('#hnTM'); if (g) tween(1400, u => { const s = 1 - 0.035 * Math.sin(2 * Math.PI * u) * (1 - u); g.setAttribute('transform', `translate(590 300) scale(${s.toFixed(4)}) translate(-590 -300)`); }, () => g.removeAttribute('transform')); } }
        }) },
      { id: 'flac', label: 'Pars flaccida (membrana de Shrapnell)', short: 'Pars flácida', cx: tX(615), cy: 175, r: 16, lx: tX(600), ly: 150,
        tools: O('<b>Pars flaccida</b> (membrana de Shrapnell): pequeña zona superior, más delgada y laxa, por encima de los pliegues maleolares; sin retracción ni costras.') },
      { id: 'inc', label: 'Rama larga del yunque', short: 'Yunque', cx: tX(556), cy: 252, r: 11, lx: tX(520), ly: 232,
        tools: O('<b>Rama larga del yunque</b>: línea blanquecina tenue, vista por transparencia en el cuadrante posterosuperior, por detrás del mango del martillo.') },
      { id: 'mango', label: 'Mango del martillo', short: 'Mango', d: handle, lx: tX(676), ly: 262,
        tools: O(`<b>Mango del martillo</b>: franja blanco-amarillenta incluida en la membrana, que desde el umbo se dirige hacia arriba y adelante (≈ a las ${right ? '1' : '11'} h en el oído ${right ? 'derecho' : 'izquierdo'}).`) },
      { id: 'corta', label: 'Apófisis corta del martillo', short: 'Ap. corta', cx: tX(649), cy: 207, r: 10, lx: tX(690), ly: 196,
        tools: O('<b>Apófisis corta del martillo</b>: prominencia blanquecina puntiforme en el extremo superior del mango; de ella parten los pliegues maleolares que separan la pars tensa de la pars flaccida.') },
      { id: 'umbo', label: 'Ombligo (umbo)', short: 'Umbo', cx: tX(590), cy: 313, r: 8, lx: tX(560), ly: 340,
        tools: O('<b>Umbo (ombligo)</b>: extremo inferior del mango, punto más deprimido de la membrana; desde él parte el cono luminoso.') },
      { id: 'cono', label: 'Cono luminoso', short: 'Cono luminoso', d: cone, lx: tX(650), ly: 436,
        tools: O(`<b>Cono o triángulo luminoso</b>: reflejo brillante en el cuadrante anteroinferior, a las <b>${right ? '5' : '7'} h en el oído ${right ? 'derecho' : 'izquierdo'}</b>, con el vértice en el umbo; indica una membrana de tensión y posición normales.`) }
    ];
  }
  /* ============================================================ 4. NARIZ */
  let occl = null;
  function noseSvg(learn, c) {
    const nares = (cx, cy, s) => {
      const sp = s; // +1: tabique a la derecha (fosa derecha del paciente)
      return `
      <circle cx="${cx}" cy="${cy}" r="102" fill="#0d0d0d"/>
      <clipPath id="hnNc${s > 0 ? 'R' : 'L'}"><circle cx="${cx}" cy="${cy}" r="96"/></clipPath>
      <g clip-path="url(#hnNc${s > 0 ? 'R' : 'L'})">
        <circle cx="${cx}" cy="${cy}" r="96" fill="url(#hnNg)"/>
        <ellipse cx="${cx + sp * 78}" cy="${cy}" rx="34" ry="96" fill="#eaa89c"/>
        <ellipse cx="${cx + sp * 78}" cy="${cy}" rx="34" ry="96" fill="none" stroke="#c9786d" stroke-width="2"/>
        <ellipse cx="${cx - sp * 46}" cy="${cy + 40}" rx="46" ry="27" fill="#da7e72"/>
        <ellipse cx="${cx - sp * 46}" cy="${cy + 34}" rx="38" ry="14" fill="#e79a8f" opacity=".7"/>
        <ellipse cx="${cx - sp * 50}" cy="${cy - 36}" rx="32" ry="19" fill="#d98578"/>
        <ellipse cx="${cx - sp * 6}" cy="${cy + 4}" rx="22" ry="31" fill="#2a0c0b"/>
        <path d="M${cx - 80} ${cy + 78} Q${cx} ${cy + 96} ${cx + 80} ${cy + 78}" fill="none" stroke="#b66257" stroke-width="3"/>
        <ellipse cx="${cx + sp * 52}" cy="${cy - 8}" rx="9" ry="10" fill="#e7a091" opacity=".8"/>
      </g>`;
    };
    return `
    <defs><linearGradient id="hnNz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4d3b4" stop-opacity="0"/><stop offset=".22" stop-color="#f4d3b4"/><stop offset="1" stop-color="#f4d3b4"/></linearGradient><radialGradient id="hnNg" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#4a1612"/><stop offset=".6" stop-color="#b9645a"/><stop offset="1" stop-color="#9c4a41"/></radialGradient></defs>
    <rect x="10" y="40" width="340" height="500" rx="16" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="2"/>
    <text x="180" y="30" text-anchor="middle" class="svg-title">Nariz externa</text>
    <path d="M130 120 Q120 220 100 320 Q96 350 120 358 Q150 372 180 372 Q210 372 240 358 Q264 350 260 320 Q240 220 230 120" fill="none" stroke="${SKIN_D}" stroke-width="2.5"/>
    <path d="M150 130 Q150 230 142 312 M210 130 Q210 230 218 312" fill="none" stroke="${SKIN_D}" stroke-width="2" opacity=".5"/>
    <path d="M118 322 Q100 345 128 360 Q142 356 148 344" fill="none" stroke="${SKIN_D}" stroke-width="3"/>
    <path d="M242 322 Q260 345 232 360 Q218 356 212 344" fill="none" stroke="${SKIN_D}" stroke-width="3"/>
    <ellipse cx="152" cy="360" rx="12" ry="7" fill="#6b3a2d"/><ellipse cx="208" cy="360" rx="12" ry="7" fill="#6b3a2d"/>
    <path d="M180 366 L180 400" stroke="${SKIN_D}" stroke-width="2.5" opacity=".6"/>
    <path d="M140 408 Q180 396 220 408" fill="none" stroke="#c46a63" stroke-width="8" stroke-linecap="round"/>
    <rect x="108" y="440" width="144" height="42" rx="7" fill="#cfd8e2" stroke="#8a97a6" stroke-width="2"/>
    <text x="180" y="500" text-anchor="middle" class="svg-small">Espejo de Glatzel (permeabilidad)</text>
    <ellipse id="hnFogR" cx="146" cy="461" rx="26" ry="12" fill="#fff" opacity="0"/>
    <ellipse id="hnFogL" cx="214" cy="461" rx="26" ry="12" fill="#fff" opacity="0"/>
    <text x="580" y="30" text-anchor="middle" class="svg-title">Rinoscopia anterior</text>
    ${nares(480, 270, 1)}${nares(690, 270, -1)}
    <text x="480" y="410" text-anchor="middle" class="svg-small">Fosa nasal derecha</text>
    <text x="690" y="410" text-anchor="middle" class="svg-small">Fosa nasal izquierda</text>
    <text x="585" y="470" text-anchor="middle" class="svg-small">${learn ? 'Tabique en el lado interno de cada fosa;' : ''}</text>
    <text x="585" y="488" text-anchor="middle" class="svg-small">${learn ? 'cornetes en la pared externa.' : ''}</text>`;
  }
  const fogRun = side => ctx => {
    const R = ctx.svg.querySelector('#hnFogR'), L = ctx.svg.querySelector('#hnFogL');
    if (!R || !L) return;
    const open = side === 'R' ? L : R, shut = side === 'R' ? R : L;
    shut.setAttribute('opacity', 0);
    tween(2200, u => { const k = u < .4 ? u / .4 : u < .8 ? 1 : 1 - (u - .8) / .2; open.setAttribute('opacity', (0.85 * k).toFixed(2)); }, () => open.setAttribute('opacity', 0));
  };
  const noseRegions = [
    { id: 'dorso', label: 'Raíz y dorso nasal', short: 'Dorso nasal', cx: 180, cy: 190, r: 28,
      tools: {
        look: TH('inspección de frente y de perfil.', 'pirámide nasal <b>en la línea media</b>, dorso recto, sin deformidades, edema ni eritema; piel sin lesiones.'),
        palp: TH('palpación de los huesos propios y los cartílagos entre el pulgar y el índice.', 'lisos, firmes y estables, <b>sin dolor, crepitación ni desviación</b>.')
      } },
    { id: 'punta', label: 'Punta nasal', short: 'Punta', cx: 180, cy: 322, r: 20, lx: 180, ly: 296,
      tools: {
        look: 'Punta bien definida, simétrica y centrada.',
        palp: 'Cartílagos alares elásticos y móviles; tabique anterior en la línea media; sin dolor.'
      } },
    { id: 'alaR', label: 'Ala nasal derecha', short: 'Ala D', cx: 126, cy: 342, r: 16, anchor: 'end', lx: 100, ly: 336,
      tools: {
        look: 'Alas nasales simétricas, sin aleteo ni colapso al inspirar; piel íntegra.',
        occl: { html: TH('se ocluye la fosa derecha con un dedo sobre el ala y el paciente inspira y espira por la izquierda; el espejo de Glatzel bajo las narinas muestra el empañamiento.', 'el aire pasa sin dificultad y la condensación es <b>simétrica</b> en ambas fosas: permeabilidad nasal normal.'), run: fogRun('R') }
      } },
    { id: 'alaL', label: 'Ala nasal izquierda', short: 'Ala I', cx: 234, cy: 342, r: 16, anchor: 'start', lx: 260, ly: 336,
      tools: {
        look: 'Alas nasales simétricas, sin colapso al inspirar.',
        occl: { html: 'Ocluida la fosa <b>izquierda</b>, respira sin dificultad por la derecha; el empañamiento del espejo es similar al del otro lado: permeabilidad normal.', run: fogRun('L') }
      } },
    { id: 'colu', label: 'Columela y vestíbulo nasal', short: 'Vestíbulo', cx: 180, cy: 372, r: 10, lx: 180, ly: 396,
      tools: {
        look: 'Columela centrada; vestíbulo nasal con vibrisas (pelos) y piel sin lesiones, costras ni secreción.',
        spec: TH('el espéculo se introduce ≈ 1 cm en el vestíbulo y se abre en sentido vertical, sin apoyar en el tabique.', 'vestíbulo sin lesiones.')
      } },
    /* Rinoscopia */
    { id: 'sepR', label: 'Tabique nasal (fosa derecha)', short: 'Tabique', cx: 558, cy: 270, r: 26, anchor: 'end', lx: 556, ly: 214,
      tools: { spec: '<b>Tabique nasal</b> en la línea media, con mucosa rosada, lisa y húmeda, sin perforaciones, úlceras ni costras; en la porción anteroinferior (área de Kiesselbach) pueden verse pequeños vasos. Una desviación leve que no obstruye es frecuente.' } },
    { id: 'infR', label: 'Cornete inferior derecho', short: 'C. inferior', cx: 434, cy: 310, r: 22, lx: 434, ly: 350,
      tools: { spec: '<b>Cornete inferior</b> rosado, húmedo y de superficie lisa; ocupa menos de la mitad de la fosa y deja ver el meato inferior y el piso; secreción mucosa escasa y clara.' } },
    { id: 'midR', label: 'Cornete medio derecho', short: 'C. medio', cx: 430, cy: 234, r: 15, anchor: 'end', lx: 412, ly: 222,
      tools: { spec: '<b>Cornete medio</b> rosado y liso, en la parte alta de la fosa; meato medio <b>sin pólipos</b> (masas pálidas y translúcidas) ni secreción purulenta.' } },
    { id: 'sepL', label: 'Tabique nasal (fosa izquierda)', short: 'Tabique', cx: 612, cy: 270, r: 26, anchor: 'start', lx: 614, ly: 214,
      tools: { spec: 'Tabique rosado y liso, en la línea media, sin perforación ni hematoma; simétrico con el lado derecho.' } },
    { id: 'infL', label: 'Cornete inferior izquierdo', short: 'C. inferior', cx: 736, cy: 310, r: 22, lx: 736, ly: 350,
      tools: { spec: 'Cornete inferior rosado, húmedo y liso; fosa permeable, con el meato inferior visible; simétrico con el contralateral.' } },
    { id: 'midL', label: 'Cornete medio izquierdo', short: 'C. medio', cx: 740, cy: 234, r: 15, anchor: 'start', lx: 758, ly: 222,
      tools: { spec: 'Cornete medio rosado y liso, sin pólipos ni secreción purulenta.' } }
  ];
  /* ============================================================ 5. BOCA Y OROFARINGE */
  let tongueUp = false, mallTimer = null;
  const TW = [27, 20, 23, 21, 20, 30, 30, 27], TTH = [50, 44, 50, 40, 38, 34, 34, 32], KW = 1.55;
  const TEETH = (function () {
    const a = 170, b = 215, N = 800, arr = [[0, 0]];
    let L = 0, px = 0, pz = 0;
    for (let i = 1; i <= N; i++) {
      const phi = Math.PI / 2 * i / N, x = a * Math.sin(phi), z = b * (1 - Math.cos(phi));
      L += Math.hypot(x - px, z - pz); px = x; pz = z; arr.push([phi, L]);
    }
    let cum = 0; const out = [];
    for (let k = 0; k < 8; k++) {
      const w = TW[k] * KW, mid = cum + w / 2; cum += w;
      let j = 0; while (j < arr.length - 1 && arr[j][1] < mid) j++;
      const phi = arr[j][0];
      out.push({ k, phi, x: a * Math.sin(phi), z: b * (1 - Math.cos(phi)), w: TW[k] * KW * Math.cos(phi) + 15 * Math.sin(phi), h: TTH[k] });
    }
    return out;
  })();
  function teethSvg() {
    const CX = 410;
    let up = '', lo = '', gu = [], gl = [], n = 0;
    [-1, 1].forEach(s => {
      TEETH.forEach(t => {
        const xc = CX + s * t.x, rot = (s * t.phi * 180 / Math.PI * 0.3).toFixed(1);
        const eU = 215 - t.z * 0.22, eL = 405 + t.z * 0.22;
        up += `<rect class="hnT" data-n="${n}" x="${(xc - t.w / 2).toFixed(1)}" y="${(eU - t.h).toFixed(1)}" width="${t.w.toFixed(1)}" height="${t.h}" rx="9" fill="#f8f2e4" stroke="#c9ba9a" stroke-width="1.6" transform="rotate(${rot} ${xc.toFixed(1)} ${(eU - t.h / 2).toFixed(1)})"/>`;
        lo += `<rect class="hnT" data-n="${n + 16}" x="${(xc - t.w / 2).toFixed(1)}" y="${eL.toFixed(1)}" width="${t.w.toFixed(1)}" height="${t.h}" rx="9" fill="#f6f0e0" stroke="#c9ba9a" stroke-width="1.6" transform="rotate(${(-rot).toString()} ${xc.toFixed(1)} ${(eL + t.h / 2).toFixed(1)})"/>`;
        gu.push([xc, eU - t.h - 10]); gl.push([xc, eL + t.h + 10]);
        n++;
      });
    });
    const line = pts => 'M' + pts.sort((p, q) => p[0] - q[0]).map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L');
    return `<path d="${line(gu)}" fill="none" stroke="#e07b86" stroke-width="32" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="${line(gl)}" fill="none" stroke="#e07b86" stroke-width="32" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="${line(gu.map(p => [p[0], p[1] + 12]))}" fill="none" stroke="#f0a0a8" stroke-width="5" opacity=".7"/>
      ${up}${lo}`;
  }
  function papillae() {
    let s = 7, out = '';
    const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 150; i++) {
      const x = 275 + r() * 270, y = 345 + r() * 90;
      if (((x - 410) / 145) ** 2 + ((y - 392) / 60) ** 2 > 0.92) continue;
      out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.7" fill="#f3d9d2" opacity=".75"/>`;
    }
    for (let i = 0; i < 22; i++) {
      const a = r() * 2 * Math.PI, rr = 0.5 + r() * 0.42;
      out += `<circle cx="${(410 + 130 * rr * Math.cos(a)).toFixed(1)}" cy="${(398 + 52 * rr * Math.sin(a)).toFixed(1)}" r="2.8" fill="#c63e45" opacity=".9"/>`;
    }
    return out;
  }
  function mouthSvg(learn, c) {
    const lipsFace = `
      <rect width="820" height="600" fill="#e8eef4"/>
      <ellipse cx="410" cy="300" rx="375" ry="290" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3"/>
      <ellipse cx="410" cy="300" rx="290" ry="240" fill="#c9776d" stroke="#9a4f46" stroke-width="3"/>
      <ellipse cx="410" cy="300" rx="246" ry="196" fill="#6a262b"/>`;
    if (tongueUp) {
      return `${lipsFace}
      <ellipse cx="410" cy="400" rx="168" ry="70" fill="#d98a84"/>
      <path d="M262 400 Q410 350 558 400" fill="none" stroke="#b8605f" stroke-width="3" opacity=".7"/>
      <path d="M398 352 L396 394 Q410 400 424 394 L422 352 Z" fill="#f0b3ac" stroke="#c97d78" stroke-width="2"/>
      <ellipse cx="396" cy="398" rx="4" ry="3" fill="#fff" stroke="#b8605f"/><ellipse cx="424" cy="398" rx="4" ry="3" fill="#fff" stroke="#b8605f"/>
      <path d="M338 392 Q370 380 396 392 M424 392 Q450 380 482 392" fill="none" stroke="#c0605f" stroke-width="3" opacity=".6"/>
      <ellipse cx="410" cy="292" rx="112" ry="70" fill="#e9a79f" stroke="#c97d78" stroke-width="2"/>
      <path d="M382 352 Q366 318 374 286 M438 352 Q454 318 446 286" fill="none" stroke="#6f8fd0" stroke-width="5" stroke-linecap="round" opacity=".85"/>
      <path d="M410 232 L410 350" stroke="#d9918a" stroke-width="2" opacity=".5"/>
      ${teethSvg()}`;
    }
    const tonsil = (cx, s) => `
      <path d="M${cx - s * 32} 300 Q${cx - s * 40} 340 ${cx - s * 22} 378" fill="none" stroke="#d27a78" stroke-width="15" stroke-linecap="round"/>
      <path d="M${cx + s * 24} 296 Q${cx + s * 32} 336 ${cx + s * 20} 372" fill="none" stroke="#c46a6c" stroke-width="10" stroke-linecap="round"/>
      <ellipse cx="${cx}" cy="333" rx="19" ry="33" fill="#e4958f"/>
      <circle cx="${cx - s * 3}" cy="320" r="2" fill="#b0545a"/><circle cx="${cx + s * 4}" cy="335" r="2" fill="#b0545a"/><circle cx="${cx - s * 2}" cy="348" r="2" fill="#b0545a"/>`;
    return `${lipsFace}
      <ellipse cx="410" cy="310" rx="102" ry="58" fill="#a84449"/>
      <g fill="#c5656a" opacity=".6">${[[372, 318], [392, 330], [428, 326], [450, 316], [410, 338], [388, 300], [436, 304]].map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3.4"/>`).join('')}</g>
      <path d="M300 215 C330 240 370 255 410 255 C450 255 490 240 520 215 Z" fill="#e8a6a0"/>
      <path d="M410 218 L410 254 M360 228 Q372 236 380 232 M440 228 Q428 236 420 232 M340 220 Q352 228 360 224 M480 220 Q468 228 460 224" fill="none" stroke="#c97b78" stroke-width="2" opacity=".6"/>
      ${tonsil(322, 1)}${tonsil(498, -1)}
      <g id="hnPal">
        <path d="M275 320 C270 275 335 252 410 252 C485 252 550 275 545 320 C515 292 470 282 410 282 C350 282 305 292 275 320 Z" fill="#d9777a"/>
        <path d="M410 254 L410 282" stroke="#b85a60" stroke-width="2" opacity=".6"/>
        <path d="M399 280 Q394 305 404 328 Q410 334 416 328 Q426 305 421 280 Z" fill="#cf6e72" stroke="#b85a60" stroke-width="1.5"/>
      </g>
      <g id="hnTg">
        <ellipse cx="410" cy="400" rx="150" ry="62" fill="#e08a8e" stroke="#c76b70" stroke-width="2"/>
        ${papillae()}
        <path d="M410 372 L410 440" stroke="#b85a60" stroke-width="2.5" opacity=".7"/>
        <g fill="#c9686f" stroke="#a84a52" stroke-width="1">${[[372, 352], [388, 360], [403, 365], [417, 365], [432, 360], [448, 352]].map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3.6"/>`).join('')}</g>
      </g>
      <g id="hnDep" style="display:none"><rect x="400" y="372" width="230" height="26" rx="12" fill="#cfd6de" stroke="#8a97a6" stroke-width="2" transform="rotate(-12 410 384)"/></g>
      ${teethSvg()}`;
  }
  function mouthRegions() {
    const R = [];
    const pharyn = (extra) => Object.assign({
      look: 'Mucosa de las fauces rosada, húmeda y brillante, sin placas, exudado, úlceras ni petequias.'
    }, extra);
    const sayAh = ctx => {
      const g = ctx.svg.querySelector('#hnPal'); if (!g) return;
      tween(2000, u => { const k = Math.sin(Math.PI * Math.min(1, u * 1.15)); g.setAttribute('transform', `translate(0 ${(-16 * k).toFixed(1)})`); }, () => g.removeAttribute('transform'));
      ctx.sh.say('Aaaaah…', 'yes', 2000);
    };
    const AH = { html: TH('se pide al paciente que diga <b>"ah"</b> con la boca abierta.', 'el velo del paladar se eleva de forma simétrica y la úvula se mantiene en la <b>línea media</b> (pares craneales IX y X indemnes).'), run: sayAh };
    const depress = { html: TH('depresor sobre los dos tercios anteriores de la lengua (sin tocar la base, para no provocar náuseas) y luz frontal o linterna.', 'se ven pilares, amígdalas, úvula y pared posterior de la faringe sin lesiones.'), run: ctx => {
      const d = ctx.svg.querySelector('#hnDep'), t = ctx.svg.querySelector('#hnTg'); if (!d || !t) return;
      d.style.display = '';
      tween(1600, u => { const k = Math.sin(Math.PI * u); t.setAttribute('transform', `translate(0 ${(8 * k).toFixed(1)})`); }, () => { d.style.display = 'none'; t.removeAttribute('transform'); });
    } };
    const mall = { html: TH('<b>Mallampati</b>: paciente sentado, boca abierta al máximo y lengua afuera, sin fonar.', '<b>clase I</b>: se ven paladar blando, fauces, úvula y pilares. Las clases I y II son normales y predicen una vía aérea de acceso fácil.'), run: ctx => ctx.sh.say('Mallampati I', 'yes', 2400) };
    R.push({ id: 'orof', label: 'Orofaringe (fauces)', short: 'Fauces', x: 296, y: 252, w: 228, h: 100, rx: 22, lx: 430, ly: 240, anchor: 'start',
      tools: { look: '<b>Fauces</b>: paladar blando, úvula, pilares, amígdalas y pared posterior con mucosa rosada y húmeda, sin exudados ni lesiones.', depress, mall, say: AH } });
    R.push({ id: 'labS', label: 'Labio superior', short: 'Labios', cx: 410, cy: 80, r: 26, lx: 410, ly: 46,
      tools: {
        look: 'Labios rosados, húmedos, simétricos y de bordes definidos, sin fisuras, úlceras, costras ni nódulos; comisuras íntegras; filtrum simétrico.',
        palp: 'Labios blandos, sin induraciones ni nódulos (palpación bimanual).',
        smell: { html: TH('se percibe el aliento mientras el paciente espira por la boca.', 'sin olor patológico: no hay halitosis ni olor a acetona (cetosis), amoniacal (uremia) o <i>fetor hepático</i>.'), run: ctx => ctx.sh.say('(sin olor particular)', 'yes', 1800) }
      } });
    R.push({ id: 'labI', label: 'Labio inferior', short: '', cx: 410, cy: 520, r: 26,
      tools: {
        look: 'Labio inferior de color y textura normales, sin lesiones ni fisuras; comisuras simétricas.',
        palp: 'Blando y sin nódulos.',
        smell: { html: 'Aliento sin olor patológico.', run: ctx => ctx.sh.say('(sin olor particular)', 'yes', 1800) }
      } });
    R.push({ id: 'dS', label: 'Dientes superiores', short: 'Dientes (32)', x: 208, y: 138, w: 404, h: 90, rx: 18, lx: 212, ly: 130, anchor: 'start',
      tools: {
        look: c => ({ html: `<b>Dentición permanente completa: 32 piezas</b> (16 por arcada; en total 8 incisivos, 4 caninos, 8 premolares y 12 molares, incluidos los terceros molares), bien alineadas, de color marfil, sin caries visibles, fracturas ni movilidad.${ageOld(c) ? ' En el adulto mayor son frecuentes las ausencias, el desgaste y las prótesis; se muestra la dentición completa de referencia.' : ''}`, run: ctx => countTeeth(ctx.svg, ctx.sh) }),
        palp: 'Piezas firmes, sin movilidad ni dolor a la presión.',
        say: AH
      } });
    R.push({ id: 'dI', label: 'Dientes inferiores', short: '', x: 208, y: 398, w: 404, h: 88, rx: 18,
      tools: {
        look: { html: 'Arcada inferior con 16 piezas alineadas; oclusión normal (los incisivos superiores cubren 1-2 mm a los inferiores).', run: ctx => countTeeth(ctx.svg, ctx.sh) },
        palp: 'Piezas firmes, sin movilidad ni dolor.'
      } });
    R.push({ id: 'eS', label: 'Encía superior', short: 'Encías', cx: 410, cy: 148, r: 12, lx: 410, ly: 126,
      tools: {
        look: 'Encías de color <b>rosado coral</b> (pueden estar pigmentadas), firmes, festoneadas y adheridas al cuello de los dientes; sin eritema, edema, retracción ni sangrado.',
        palp: 'Encía firme y puntillada, que no sangra ni duele al tacto.'
      } });
    R.push({ id: 'eI', label: 'Encía inferior', short: '', cx: 410, cy: 470, r: 12,
      tools: {
        look: 'Encía rosada, firme, de borde festoneado, sin sangrado ni lesiones.',
        palp: 'Firme, sin dolor ni sangrado.'
      } });
    R.push({ id: 'lengua', label: 'Lengua (dorso)', short: 'Lengua', x: 326, y: 346, w: 168, h: 54, rx: 26, lx: 560, ly: 392, anchor: 'start',
      tools: {
        look: 'Lengua <b>rosada, húmeda y simétrica</b>, de tamaño normal, con papilas filiformes y fungiformes (puntos rojos) y surco medio; una capa blanquecina fina (saburra) es normal. Sin atrofia papilar, fisuras profundas ni úlceras.',
        depress,
        palp: TH('con guante y una gasa se sujeta la punta y se palpan el dorso y los bordes.', 'blanda y móvil, sin induraciones ni nódulos; bordes laterales sin lesiones.')
      } });
    R.push({ id: 'cal', label: 'Papilas caliciformes (V lingual)', short: 'V lingual', cx: 410, cy: 358, r: 11, lx: 430, ly: 362, anchor: 'start',
      tools: { look: 'Papilas caliciformes (8-12) dispuestas en V abierta hacia adelante, en el límite del tercio posterior; no confundirlas con lesiones.' } });
    R.push({ id: 'pd', label: 'Paladar duro', short: 'Paladar duro', cx: 410, cy: 236, r: 14, lx: 390, ly: 240, anchor: 'end',
      tools: {
        look: 'Paladar duro rosado pálido, con rugosidades transversales y rafe medio; sin úlceras, petequias ni masas (el torus palatino es una variante normal).',
        palp: 'Consistencia ósea, liso, sin masas ni dolor.'
      } });
    R.push({ id: 'pb', label: 'Paladar blando', short: 'Paladar blando', cx: 345, cy: 275, r: 13, lx: 326, ly: 280, anchor: 'end',
      tools: pharyn({ say: AH, depress }) });
    R.push({ id: 'uvula', label: 'Úvula', short: 'Úvula', cx: 410, cy: 306, r: 11, lx: 396, ly: 310, anchor: 'end',
      tools: pharyn({ look: 'Úvula de ≈ 1 cm, <b>en la línea media</b>, rosada, sin edema ni desviación.', say: AH, depress }) });
    R.push({ id: 'pilR', label: 'Pilares amigdalinos derechos', short: 'Pilares', cx: 292, cy: 338, r: 11, lx: 268, ly: 372,
      tools: pharyn({ look: 'Pilares anterior (palatogloso) y posterior (palatofaríngeo) simétricos y rosados, sin eritema ni desplazamiento.', say: AH, depress }) });
    R.push({ id: 'pilL', label: 'Pilares amigdalinos izquierdos', short: '', cx: 528, cy: 338, r: 11,
      tools: pharyn({ look: 'Pilares simétricos con los del lado derecho, rosados y sin lesiones.', say: AH, depress }) });
    R.push({ id: 'amiR', label: 'Amígdala palatina derecha', short: 'Amígdalas', cx: 322, cy: 333, r: 15, lx: 322, ly: 300,
      tools: pharyn({ look: '<b>Amígdalas</b> dentro de la fosa amigdalina o que apenas sobresalen (grado 0-1 de Brodsky), rosadas, simétricas, con criptas visibles; <b>sin exudado, eritema ni detritus</b>.', say: AH, depress }) });
    R.push({ id: 'amiL', label: 'Amígdala palatina izquierda', short: '', cx: 498, cy: 333, r: 15,
      tools: pharyn({ look: 'Amígdala izquierda de igual tamaño que la derecha, rosada y sin exudado.', say: AH, depress }) });
    R.push({ id: 'pared', label: 'Pared posterior de la faringe', short: 'Pared posterior', cx: 458, cy: 322, r: 13, lx: 476, ly: 300, anchor: 'start',
      tools: pharyn({ look: 'Pared posterior de la faringe rosada y húmeda, con algunos folículos linfoides pequeños (normal); sin secreción retronasal ni enrojecimiento.', say: AH, depress }) });
    return R;
  }
  function mouthRegionsUp() {
    const base = mouthRegions().filter(r => ['labS', 'labI', 'dS', 'dI', 'eS', 'eI'].includes(r.id));
    return base.concat([
      { id: 'lenguaV', label: 'Cara ventral de la lengua', short: 'Cara ventral', cx: 410, cy: 270, r: 36, lx: 452, ly: 262, anchor: 'start',
        tools: { look: 'Cara ventral lisa, rosada y brillante, sin lesiones; la punta alcanza el paladar: <b>movilidad lingual normal</b>.', palp: 'Blanda, sin nódulos ni induraciones; bordes laterales sin lesiones.' } },
      { id: 'ranR', label: 'Vena ranina derecha', short: 'Vena ranina', cx: 376, cy: 320, r: 10, lx: 362, ly: 308, anchor: 'end',
        tools: { look: 'Venas raninas <b>azuladas</b>, finas y simétricas a ambos lados del frenillo (más prominentes en el adulto mayor): normales.' } },
      { id: 'ranL', label: 'Vena ranina izquierda', short: '', cx: 444, cy: 320, r: 10,
        tools: { look: 'Vena ranina izquierda simétrica con la derecha.' } },
      { id: 'fren', label: 'Frenillo lingual', short: 'Frenillo', x: 399, y: 352, w: 22, h: 40, rx: 6, lx: 410, ly: 346,
        tools: { look: '<b>Frenillo lingual</b>: pliegue mucoso fino en la línea media, que permite elevar la lengua hasta el paladar y protruirla sin que se retraiga.', palp: 'Fino y elástico; sin dolor.' } },
      { id: 'carun', label: 'Carúnculas sublinguales (conductos de Wharton)', short: 'Carúnculas', cx: 410, cy: 398, r: 11, lx: 450, ly: 404, anchor: 'start',
        tools: { look: 'Carúnculas sublinguales a cada lado de la base del frenillo (desembocadura de los conductos de <b>Wharton</b>); al comprimir la glándula sale saliva clara; sin enrojecimiento ni cálculos.', palp: TH('palpación bimanual del piso de la boca.', 'tejido blando, sin masas ni cálculos; la glándula submaxilar se nota como un abultamiento blando y móvil.') } },
      { id: 'suelo', label: 'Piso de la boca', short: 'Piso de boca', x: 270, y: 380, w: 280, h: 14, rx: 6, lx: 540, ly: 372,
        tools: { look: 'Mucosa del piso de la boca rosada, lisa y húmeda; sin placas blancas o rojas ni úlceras.', palp: 'Blando, sin induraciones, masas ni dolor (palpación bimanual).' } }
    ]);
  }
  function countTeeth(svg, sh) {
    const ts = svg.querySelectorAll('.hnT');
    if (!ts.length) return;
    const n = ts.length;
    tween(1800, u => {
      const k = Math.min(n, Math.floor(u * n * 1.02));
      ts.forEach((t, i) => t.setAttribute('fill', i < k ? '#fff0b0' : (i < 16 ? '#f8f2e4' : '#f6f0e0')));
    }, () => { ts.forEach((t, i) => t.setAttribute('fill', i < 16 ? '#f8f2e4' : '#f6f0e0')); if (sh && sh.say) sh.say('32 piezas', 'yes', 1800); });
  }

  /* ============================================================ 6. CUELLO */
  const JUG = { v: 0 };
  function neckSvg(learn, c) {
    return `
    <rect width="820" height="600" fill="#e8eef4"/>
    <path d="M345 120 L345 230 C345 270 270 290 150 310 L60 330 L60 600 L760 600 L760 330 L670 310 C550 290 475 270 475 230 L475 120 Z" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3"/>
    <path d="M300 20 C300 110 340 150 410 152 C480 150 520 110 520 20 Z" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3"/>
    <path d="M380 82 Q410 90 440 82" fill="none" stroke="#b86a5c" stroke-width="5" stroke-linecap="round"/>
    <path d="M60 440 Q410 380 760 440 L760 600 L60 600 Z" fill="#9fb4c4"/>
    <path d="M410 346 Q330 332 230 326 M410 346 Q490 332 590 326" fill="none" stroke="${SKIN_D}" stroke-width="2.6" stroke-linecap="round" opacity=".8"/>
    <path d="M312 70 L338 66 L412 328 L384 340 Z" fill="#ecc09a" stroke="${SKIN_D}" stroke-width="2" opacity=".9"/>
    <path d="M508 70 L482 66 L408 328 L436 340 Z" fill="#ecc09a" stroke="${SKIN_D}" stroke-width="2" opacity=".9"/>
    <path d="M410 172 L396 186 L410 200 L424 186 Z" fill="#f6d9b8" stroke="${SKIN_D}" stroke-width="2"/>
    <ellipse cx="410" cy="218" rx="15" ry="6" fill="#f6d9b8" stroke="${SKIN_D}" stroke-width="1.6"/>
    <rect x="399" y="224" width="22" height="104" rx="8" fill="none" stroke="${SKIN_D}" stroke-width="1.6" stroke-dasharray="6 5" opacity=".7"/>
    <ellipse cx="410" cy="338" rx="12" ry="5" fill="#d9a77a" opacity=".7"/>
    <path id="hnJugR" d="M326 120 Q344 190 360 305" fill="none" stroke="#5b7cc4" stroke-width="1" stroke-linecap="round" opacity=".25"/>
    <path id="hnJugL" d="M494 120 Q476 190 460 305" fill="none" stroke="#5b7cc4" stroke-width="1" stroke-linecap="round" opacity=".25"/>
`;
  }
  const neckRegions = [
    { id: 'laring', label: 'Cartílago tiroides y laringe', short: 'Laringe', cx: 410, cy: 186, r: 13,
      tools: {
        look: c => TH('inspección de frente y de perfil, con el cuello en leve extensión.', `cuello cilíndrico y simétrico, de piel sin lesiones, cicatrices ni tumefacciones; el cartílago tiroides (${c.sex === 'F' ? 'poco prominente en la mujer' : 'prominente en el varón: "nuez de Adán"'}) está en la línea media y asciende al deglutir.`),
        palp: TH('se toma la laringe entre el pulgar y el índice y se desplaza hacia los lados.', 'móvil 1-2 cm hacia ambos lados, con crepitación laríngea normal al rozar la columna; sin dolor.')
      } },
    { id: 'tiroR', label: 'Región tiroidea', short: 'Región tiroidea', cx: 410, cy: 252, r: 15, lx: 410, ly: 232,
      tools: {
        look: TH('inspección con luz tangencial, cuello en posición normal y en leve extensión, en reposo y al deglutir.', 'región pretraqueal plana, sin tumefacción visible ni al deglutir: <b>bocio grado 0 (OMS)</b>. Detalle en la escena "Tiroides".'),
        palp: 'Sin masas; el tamaño, la consistencia y los nódulos se describen en la escena "Tiroides".'
      } },
    { id: 'trq', label: 'Tráquea', short: 'Tráquea', cx: 410, cy: 292, r: 14, lx: 430, ly: 296, anchor: 'start',
      tools: {
        look: 'Sin desviación visible de la línea media.',
        palp: TH('índice en la escotadura supraesternal; se compara el espacio entre la tráquea y el esternocleidomastoideo de cada lado.', '<b>tráquea central y móvil</b>: espacios simétricos; sin tirón traqueal con la inspiración.')
      } },
    { id: 'esc', label: 'Escotadura supraesternal', short: 'Escotadura', cx: 410, cy: 338, r: 11, lx: 410, ly: 370,
      tools: {
        look: 'Sin retracción con la inspiración tranquila (sin tiraje).',
        palp: 'Tráquea en la línea media, justo sobre el manubrio; sin masas ni latidos anormales.'
      } },
    { id: 'carR', label: 'Arteria carótida derecha', short: 'Carótida', cx: 380, cy: 205, r: 13, anchor: 'end', lx: 366, ly: 188,
      tools: {
        look: 'Latido carotídeo no visible con el paciente sentado o a 45°.',
        palp: c => TH('índice y medio por dentro del borde anterior del esternocleidomastoideo, a la altura del cartílago tiroides, con suavidad y <b>un lado a la vez</b> (nunca ambas carótidas juntas ni masajear el seno carotídeo).', `pulso regular, ≈ ${c.v.hr}/min, de ascenso rápido y amplitud normal, igual al contralateral; sin frémito.`),
        ausc: TH('campana sobre la carótida, con el paciente en apnea breve.', '<b>sin soplos</b>.')
      } },
    { id: 'carL', label: 'Arteria carótida izquierda', short: 'Carótida', cx: 440, cy: 205, r: 13, anchor: 'start', lx: 454, ly: 188,
      tools: {
        look: 'Sin latido visible.',
        palp: 'Pulso carotídeo izquierdo de amplitud y ritmo iguales al derecho (siempre por separado y con suavidad: el estímulo del seno carotídeo puede provocar bradicardia o hipotensión).',
        ausc: 'Sin soplos a la auscultación.'
      } },
    { id: 'yugR', label: 'Vena yugular externa derecha', short: 'V. yugular ext.', cx: 351, cy: 255, r: 11, anchor: 'end', lx: 330, ly: 240,
      tools: {
        look: TH('paciente a 45° con luz tangencial; se observan la yugular externa y el nivel superior de la columna de la yugular interna respecto del ángulo esternal.', 'yugular externa <b>colapsada</b> (no visible) a 45°-90° y llena solo en decúbito; la columna de la yugular interna no sube más de 3-4 cm sobre el ángulo esternal (presión venosa normal). Usa el control inferior para cambiar la inclinación.'),
        palp: 'Sin latido palpable; la vena se colapsa al comprimirla en su extremo inferior.'
      } },
    { id: 'yugL', label: 'Vena yugular externa izquierda', short: 'V. yugular ext.', cx: 469, cy: 255, r: 11, anchor: 'start', lx: 490, ly: 240,
      tools: {
        look: 'Yugular externa izquierda colapsada a 45°-90°, sin ingurgitación; simétrica con la derecha.',
        palp: 'Sin latido palpable; se colapsa con el dedo.'
      } },
    { id: 'ecmR', label: 'Esternocleidomastoideo derecho', short: 'ECM', cx: 352, cy: 140, r: 14, anchor: 'end', lx: 334, ly: 120,
      tools: {
        look: 'Músculo visible y simétrico, de borde anterior nítido al rotar la cabeza; sin hipertrofia ni atrofia.',
        palp: 'Blando, sin masas ni dolor.',
        move: TH('rotación de la cabeza contra la mano del examinador (XI par).', 'el esternocleidomastoideo contralateral se contrae y es visible; <b>fuerza 5/5</b>, simétrica.')
      } },
    { id: 'ecmL', label: 'Esternocleidomastoideo izquierdo', short: 'ECM', cx: 468, cy: 140, r: 14, anchor: 'start', lx: 486, ly: 120,
      tools: {
        look: 'Esternocleidomastoideo simétrico con el derecho.',
        palp: 'Sin masas ni dolor.',
        move: 'Rotación contra resistencia con contracción visible del músculo; fuerza 5/5 simétrica.'
      } },
    { id: 'trapR', label: 'Trapecio derecho', short: 'Trapecio', cx: 215, cy: 322, r: 18, lx: 215, ly: 296,
      tools: {
        look: 'Contorno del trapecio y altura de los hombros simétricos, sin atrofia ni fasciculaciones.',
        palp: 'Tono y volumen normales, sin puntos dolorosos.',
        move: TH('<b>elevación de los hombros contra resistencia</b> (XI par).', 'fuerza 5/5, simétrica.')
      } },
    { id: 'trapL', label: 'Trapecio izquierdo', short: 'Trapecio', cx: 605, cy: 322, r: 18, lx: 605, ly: 296,
      tools: {
        look: 'Hombros simétricos, sin atrofia.',
        palp: 'Tono y volumen normales.',
        move: 'Elevación de los hombros con fuerza 5/5, simétrica con el lado opuesto.'
      } }
  ];
  const ROM = [
    ['flex', 'Flexión', '45-50°', 'el mentón se acerca al esternón (queda a ≈ 2 traveses de dedo)'],
    ['ext', 'Extensión', '55-60°', 'la mirada llega al techo'],
    ['rotD', 'Rotación derecha', '70-80°', 'el mentón casi alcanza el hombro'],
    ['rotI', 'Rotación izquierda', '70-80°', 'el mentón casi alcanza el hombro'],
    ['incD', 'Inclinación derecha', '40-45°', 'la oreja se acerca al hombro sin elevarlo'],
    ['incI', 'Inclinación izquierda', '40-45°', 'la oreja se acerca al hombro sin elevarlo']
  ];
  const ROMA = c => (ageOld(c) ? { flex: 45, ext: 55, rot: 70, inc: 40 } : { flex: 48, ext: 58, rot: 76, inc: 43 });
  let romCancel = null;
  function neckAfter(stage, sh, ctx) {
    injectStyle();
    const c = sh.case, A = ROMA(c);
    const P = document.createElement('div');
    P.className = 'hn-panel';
    P.innerHTML = `
      <div class="hn-box" style="flex:1.3 1 340px">
        <h5>Movilidad cervical activa (pide al paciente que mueva el cuello)</h5>
        <svg viewBox="0 0 440 135" style="width:100%;max-width:470px;height:auto;background:#e8eef4;border-radius:8px">
          <text x="70" y="14" text-anchor="middle" class="svg-small">Perfil</text>
          <text x="220" y="14" text-anchor="middle" class="svg-small">Vista desde arriba</text>
          <text x="370" y="14" text-anchor="middle" class="svg-small">Frente</text>
          <line x1="70" y1="20" x2="70" y2="96" stroke="#8a97a6" stroke-dasharray="4 4"/>
          <rect x="60" y="78" width="20" height="46" rx="7" fill="${SKIN}" stroke="${SKIN_D}"/>
          <path d="M16 130 Q70 104 124 130" fill="${SKIN}" stroke="${SKIN_D}"/>
          <g id="hnRomP"><circle cx="70" cy="52" r="26" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="2"/><path d="M47 49 L34 58 L47 62 Z" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="2"/><circle cx="57" cy="46" r="2.4" fill="#333"/><ellipse cx="78" cy="53" rx="4" ry="8" fill="#e2b48c" stroke="${SKIN_D}"/></g>
          <ellipse cx="220" cy="100" rx="62" ry="15" fill="#9fb4c4" stroke="#7d93a6"/>
          <line x1="220" y1="20" x2="220" y2="60" stroke="#8a97a6" stroke-dasharray="4 4"/>
          <g id="hnRomT"><circle cx="220" cy="66" r="29" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="2"/><path d="M211 40 L220 28 L229 40 Z" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="2"/><ellipse cx="190" cy="66" rx="5" ry="9" fill="#e2b48c" stroke="${SKIN_D}"/><ellipse cx="250" cy="66" rx="5" ry="9" fill="#e2b48c" stroke="${SKIN_D}"/></g>
          <line x1="310" y1="112" x2="430" y2="112" stroke="#7d93a6" stroke-width="2"/>
          <line x1="370" y1="20" x2="370" y2="40" stroke="#8a97a6" stroke-dasharray="4 4"/>
          <rect x="360" y="78" width="20" height="34" rx="7" fill="${SKIN}" stroke="${SKIN_D}"/>
          <g id="hnRomF"><circle cx="370" cy="52" r="26" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="2"/><circle cx="361" cy="48" r="2.4" fill="#333"/><circle cx="379" cy="48" r="2.4" fill="#333"/><path d="M362 62 Q370 67 378 62" fill="none" stroke="#a5574d" stroke-width="2"/></g>
        </svg>
        <div class="hn-btns" id="hnRomB" style="margin-top:8px">${ROM.map(r => `<button data-k="${r[0]}">${r[1]}</button>`).join('')}<button data-k="n">Posición neutra</button></div>
        <div class="hn-read" id="hnRomR">Elige un movimiento. La amplitud normal aparece aquí.</div>
      </div>
      <div class="hn-box">
        <h5>Yugular externa según la inclinación del paciente</h5>
        <input type="range" id="hnJugS" min="0" max="90" step="5" value="45" aria-label="Inclinación del paciente">
        <div class="hn-read" id="hnJugRd"></div>
      </div>`;
    stage.appendChild(P);
    const gP = P.querySelector('#hnRomP'), gT = P.querySelector('#hnRomT'), gF = P.querySelector('#hnRomF');
    const cur = { p: 0, t: 0, f: 0 };
    const apply = () => {
      gP.setAttribute('transform', `rotate(${cur.p.toFixed(1)} 70 94)`);
      gT.setAttribute('transform', `rotate(${cur.t.toFixed(1)} 220 66)`);
      gF.setAttribute('transform', `rotate(${cur.f.toFixed(1)} 370 94)`);
    };
    apply();
    P.querySelector('#hnRomB').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const k = b.dataset.k, tg = { p: 0, t: 0, f: 0 };
      let txt = 'Posición neutra: cabeza erguida, mirada al frente.';
      if (k === 'flex') tg.p = -A.flex; else if (k === 'ext') tg.p = A.ext;
      else if (k === 'rotD') tg.t = A.rot; else if (k === 'rotI') tg.t = -A.rot;
      else if (k === 'incD') tg.f = -A.inc; else if (k === 'incI') tg.f = A.inc;
      const r = ROM.find(x => x[0] === k);
      if (r) {
        const val = k === 'flex' ? A.flex : k === 'ext' ? A.ext : k.startsWith('rot') ? A.rot : A.inc;
        txt = `<b>${r[1]}: ${val}°</b> (normal ${r[2]}): ${r[3]}. Movimiento completo, simétrico, sin dolor ni resistencia.`;
        sh.log(`<b>Movilidad cervical, ${r[1].toLowerCase()}:</b> ${val}° (normal ${r[2]}), sin dolor ni limitación.`, 'find');
      }
      P.querySelector('#hnRomR').innerHTML = txt;
      P.querySelectorAll('#hnRomB button').forEach(x => x.classList.toggle('on', x === b));
      if (romCancel) romCancel();
      const from = { p: cur.p, t: cur.t, f: cur.f };
      romCancel = tween(700, u => {
        const s = u * u * (3 - 2 * u);
        cur.p = from.p + (tg.p - from.p) * s; cur.t = from.t + (tg.t - from.t) * s; cur.f = from.f + (tg.f - from.f) * s;
        apply();
      });
    });
    const sl = P.querySelector('#hnJugS'), rd = P.querySelector('#hnJugRd');
    const upd = () => {
      const a = +sl.value, v = clamp((45 - a) / 35, 0, 1);
      ['#hnJugR', '#hnJugL'].forEach(id => {
        const p = ctx.svg.querySelector(id);
        if (p) { p.setAttribute('stroke-width', (1 + 5 * v).toFixed(1)); p.setAttribute('opacity', (0.22 + 0.7 * v).toFixed(2)); }
      });
      rd.innerHTML = `<b>Inclinación ${a}°</b>: ` + (a <= 15
        ? 'la yugular externa <b>se llena</b> y es visible (normal en decúbito: la vena queda por debajo de la aurícula derecha).'
        : a < 45 ? 'la yugular externa se ve parcialmente, con llenado decreciente al incorporar al paciente.'
          : 'yugular externa <b>colapsada</b> (no visible), como es normal a 45°-90°. La columna de la yugular interna no sube más de 3-4 cm sobre el ángulo esternal (presión venosa normal).');
    };
    sl.addEventListener('input', upd);
    upd();
  }

  /* ============================================================ 7. TIROIDES */
  function thySvg(learn, c) {
    const a = learn ? 0.85 : 0.22;
    let rings = '';
    for (let y = 222; y < 430; y += 12) rings += `<path d="M397 ${y} Q410 ${y + 5} 423 ${y}" fill="none" stroke="#c9a888" stroke-width="2.4" opacity=".8"/>`;
    return `
    <rect width="820" height="600" fill="#e8eef4"/>
    <path d="M250 0 L250 330 C250 400 150 430 20 470 L20 600 L800 600 L800 470 C670 430 570 400 570 330 L570 0 Z" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3"/>
    <path d="M262 30 L306 30 L398 498 L350 506 Z" fill="#ecc09a" stroke="${SKIN_D}" stroke-width="2" opacity=".75"/>
    <path d="M558 30 L514 30 L422 498 L470 506 Z" fill="#ecc09a" stroke="${SKIN_D}" stroke-width="2" opacity=".75"/>
    <path d="M410 520 Q330 494 230 480 M410 520 Q490 494 590 480" fill="none" stroke="${SKIN_D}" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="410" cy="520" rx="16" ry="7" fill="#d9a77a" opacity=".7"/>
    <g id="hnLar">
      <rect x="360" y="64" width="100" height="8" rx="4" fill="#f6d9b8" stroke="${SKIN_D}" stroke-width="1.6"/>
      <path d="M372 108 L410 126 L448 108 L444 170 L410 182 L376 170 Z" fill="#f6d9b8" stroke="${SKIN_D}" stroke-width="2.4" opacity=".95"/>
      <path d="M410 126 L410 178" stroke="${SKIN_D}" stroke-width="1.6" opacity=".6"/>
      <ellipse cx="410" cy="205" rx="38" ry="12" fill="#f0d0ad" stroke="${SKIN_D}" stroke-width="2"/>
      <rect x="396" y="214" width="28" height="210" rx="10" fill="#f2dcc4" stroke="${SKIN_D}" stroke-width="1.6" opacity=".9"/>
      ${rings}
      <g opacity="${a}" transform="translate(0 -24)">
        <path d="M388 262 C345 252 332 300 346 336 C356 362 384 362 392 334 C396 310 392 286 388 262 Z" fill="#b8605a" stroke="#8d3f3a" stroke-width="2"/>
        <path d="M432 262 C475 252 488 300 474 336 C464 362 436 362 428 334 C424 310 428 286 432 262 Z" fill="#b8605a" stroke="#8d3f3a" stroke-width="2"/>
        <rect x="386" y="254" width="48" height="22" rx="8" fill="#b8605a" stroke="#8d3f3a" stroke-width="2"/>
      </g>
    </g>
    ${learn ? '<text x="410" y="590" text-anchor="middle" class="svg-small">Vista anterior del cuello · la glándula se ve por transparencia (solo en Aprendizaje)</text>' : ''}`;
  }
  const swallow = ctx => {
    const g = ctx.svg.querySelector('#hnLar'); if (!g) return;
    tween(1500, u => { const k = u < .35 ? u / .35 : u < .55 ? 1 : 1 - (u - .55) / .45; g.setAttribute('transform', `translate(0 ${(-20 * k).toFixed(1)})`); }, () => g.removeAttribute('transform'));
    ctx.sh.say('(traga un sorbo de agua)', 'yes', 1700);
  };
  const OMS = 'grados OMS: 0 = no palpable ni visible; I = palpable pero no visible con el cuello en posición normal; II = visible con el cuello en posición normal';
  const thyRegions = [
    { id: 'cart', label: 'Cartílago tiroides', short: 'C. tiroides', cx: 410, cy: 144, r: 26, lx: 410, ly: 108,
      tools: {
        look: 'Prominencia laríngea ("nuez") en la línea media; asciende con la deglución.',
        ant: 'Escudo duro en la línea media (C4-C5): referencia superior para ubicar la glándula.',
        post: 'Desde atrás se identifican el cartílago tiroides y, por debajo, el cricoides.',
        swallow: { html: 'El cartílago tiroides <b>asciende 1-3 cm</b> con la deglución y vuelve a su posición.', run: swallow }
      } },
    { id: 'crico', label: 'Cartílago cricoides', short: 'Cricoides', cx: 410, cy: 205, r: 12,
      tools: {
        ant: 'Anillo duro bajo el cartílago tiroides (C6); el <b>istmo</b> se busca justo por debajo, sobre los anillos traqueales 2.º a 4.º.',
        post: 'Referencia para colocar los dedos: el istmo queda debajo del cricoides.',
        look: 'No visible.'
      } },
    { id: 'lobR', label: 'Lóbulo derecho', short: 'Lóbulo D', x: 332, y: 206, w: 56, h: 140, rx: 26, lx: 330, ly: 200, anchor: 'end',
      tools: {
        look: TH('inspección tangencial con el cuello en posición normal y en leve extensión, en reposo y al deglutir.', `sin aumento de volumen ni asimetría: <b>bocio grado 0</b> (${OMS}).`),
        ant: { html: TH('<b>palpación anterior</b>: examinador frente al paciente, cuello relajado; con el pulgar de una mano desplaza el cartílago tiroides hacia el lado que explora y con el pulgar e índice de la otra palpa el lóbulo por dentro del esternocleidomastoideo mientras el paciente traga.', '<b>lóbulo no palpable o apenas palpable</b>; si se palpa, blando-elástico, liso, indoloro, de ≈ 4-5 cm de alto y 2 cm de ancho, <b>sin nódulos</b>.'), run: ctx => fingers(ctx.svg, ctx.point.x, ctx.point.y, 1500, 2) },
        post: { html: TH('<b>palpación posterior</b>: examinador detrás del paciente sentado, cuello en leve flexión; índices y medios de ambas manos a los lados de la tráquea, bajo el cricoides; el paciente traga un sorbo de agua.', 'el lóbulo se desliza bajo los dedos: no palpable o apenas palpable, blando, liso, sin nódulos; glándula de ≈ 15-25 g.'), run: ctx => fingers(ctx.svg, ctx.point.x, ctx.point.y, 1500, 3) },
        swallow: { html: 'El lóbulo <b>asciende con la deglución</b> (la glándula está fijada a la laringe y la tráquea por la fascia pretraqueal) y se desliza bajo los dedos.', run: swallow },
        ausc: TH('campana sobre cada lóbulo, con el paciente en apnea breve.', '<b>sin soplos ni frémito</b>.')
      } },
    { id: 'lobL', label: 'Lóbulo izquierdo', short: 'Lóbulo I', x: 432, y: 206, w: 56, h: 140, rx: 26, lx: 490, ly: 200, anchor: 'start',
      tools: {
        look: 'Sin aumento de volumen; simétrico con el derecho (bocio grado 0).',
        ant: { html: 'Lóbulo izquierdo <b>no palpable o apenas palpable</b>; blando-elástico, liso e indoloro; sin nódulos; consistencia igual a la del derecho.', run: ctx => fingers(ctx.svg, ctx.point.x, ctx.point.y, 1500, 2) },
        post: { html: 'Desde atrás, con la deglución, el lóbulo izquierdo se desliza bajo los dedos: no palpable o apenas, blando, liso y sin nódulos.', run: ctx => fingers(ctx.svg, ctx.point.x, ctx.point.y, 1500, 3) },
        swallow: { html: 'Asciende con la deglución, de forma simétrica con el derecho.', run: swallow },
        ausc: 'Sin soplos.'
      } },
    { id: 'istmo', label: 'Istmo tiroideo', short: 'Istmo', x: 388, y: 228, w: 44, h: 28, rx: 8, lx: 410, ly: 270,
      tools: {
        look: 'Con luz tangencial no hay abultamiento pretraqueal; al deglutir se ve un ligero ascenso.',
        ant: { html: TH('pulgar sobre la línea media, bajo el cricoides, mientras el paciente traga.', '<b>istmo</b> (≈ 1-2 cm de ancho) palpable solo de forma ocasional, como una banda blanda y lisa que asciende al deglutir; sin nódulos.'), run: ctx => fingers(ctx.svg, ctx.point.x, ctx.point.y, 1500, 2) },
        post: { html: 'Desde atrás, con los índices bajo el cricoides: istmo no palpable o banda blanda y lisa que sube al deglutir; sin nódulos.', run: ctx => fingers(ctx.svg, ctx.point.x, ctx.point.y, 1500, 3) },
        swallow: { html: 'Con la deglución el istmo asciende junto con la laringe (≈ 1-2 cm) y pasa bajo los dedos como una banda blanda y lisa.', run: swallow },
        ausc: 'Sin soplos.'
      } },
    { id: 'trq2', label: 'Tráquea', short: 'Tráquea', cx: 410, cy: 395, r: 20, lx: 410, ly: 366,
      tools: {
        look: 'En la línea media, sin desviación.',
        ant: '<b>Tráquea central</b>: espacios laterales simétricos; anillos cartilaginosos palpables.',
        post: 'Tráquea en la línea media entre ambos lóbulos, sin desviación.'
      } },
    { id: 'esc2', label: 'Escotadura supraesternal', short: 'Escotadura', cx: 410, cy: 520, r: 14, lx: 410, ly: 560,
      tools: {
        look: 'Sin retracción ni masas.',
        ant: 'Tráquea palpable en la línea media; el dedo queda equidistante de ambos esternocleidomastoideos.'
      } }
  ];
  /* ============================================================ 8. GANGLIOS */
  let seen = new Set();
  const NODE_N = 9;
  function nodeRun(id) {
    return ctx => {
      seen.add(id);
      const lbl = ctx.svg.parentNode.querySelector('#hnNodeCnt');
      if (lbl) lbl.textContent = `Cadenas exploradas: ${seen.size}/${NODE_N}`;
      fingers(ctx.svg, ctx.point.x, ctx.point.y, 1300, 3);
      if (seen.size === NODE_N) ctx.sh.log('<b>Exploración completa de las 9 cadenas.</b> Sin adenopatías: ganglios no palpables o &lt; 1 cm, blandos, móviles e indoloros.', 'find');
    };
  }
  const NODE_LOOK = 'Sin adenopatías visibles ni asimetrías; piel suprayacente normal.';
  function nodeTxt(zone, drain) {
    return TH(`palpación de la cadena <b>${zone}</b> con las yemas de 2-3 dedos, en círculos suaves, comparando ambos lados.`,
      `ganglios <b>no palpables</b> o, si se palpan, de <b>menos de 1 cm</b>, de consistencia blanda, lisos, <b>móviles</b> (no adheridos a la piel ni a planos profundos) e <b>indoloros</b>; piel suprayacente normal. Drenan: ${drain}.`);
  }
  function nodesSvg(learn, c) {
    const hair = ageOld(c) ? '#c8ccd2' : (c.sex === 'F' ? '#4a2f20' : '#3a2a1e');
    return `
    <rect width="820" height="600" fill="#e8eef4"/>
    <path d="M210 80 C180 110 188 150 188 165 L166 197 Q172 208 189 208 Q187 224 191 236 Q178 242 191 250 Q184 264 194 270 Q190 292 206 308 Q232 336 286 330 L300 345 L300 460 Q296 540 330 620 L820 620 L820 470 Q690 380 522 338 C560 280 500 230 470 190 C480 100 420 25 330 30 C270 30 235 50 210 80 Z" fill="${SKIN}"/>
    <path d="M210 80 C180 110 188 150 188 165 L166 197 Q172 208 189 208 Q187 224 191 236 Q178 242 191 250 Q184 264 194 270 Q190 292 206 308 Q232 336 286 330 L300 345 L300 460 Q296 540 330 620" fill="none" stroke="${SKIN_D}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M820 470 Q690 380 522 338 C560 280 500 230 470 190 C480 100 420 25 330 30 C270 30 235 50 210 80" fill="none" stroke="${SKIN_D}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M210 80 C235 50 270 30 330 30 C420 25 480 100 470 190 L478 238 C450 215 430 170 410 150 C380 118 300 98 210 80 Z" fill="${hair}"/>
    <path d="M418 232 L446 240 L372 520 L330 505 Z" fill="#ecc09a" stroke="${SKIN_D}" stroke-width="2" opacity=".85"/>
    <path d="M506 292 L640 455" stroke="${SKIN_D}" stroke-width="3" stroke-linecap="round" opacity=".7"/>
    <path d="M254 328 C300 302 360 272 400 238" fill="none" stroke="${SKIN_D}" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>
    <ellipse cx="226" cy="150" rx="15" ry="7" fill="#fff" stroke="${SKIN_D}" stroke-width="2"/><circle cx="222" cy="150" r="4.6" fill="#6b4a2f"/>
    <path d="M198 128 Q226 118 250 130" fill="none" stroke="${hair}" stroke-width="5" stroke-linecap="round"/>
    <path d="M186 282 Q200 280 214 284" fill="none" stroke="#b86a5c" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="402" cy="192" rx="22" ry="38" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3"/>
    <path d="M404 166 C388 174 386 206 404 218" fill="none" stroke="${SKIN_D}" stroke-width="2"/>
    <path d="M300 362 Q289 374 300 386" fill="none" stroke="${SKIN_D}" stroke-width="2.2"/>
    <path d="M305 486 Q450 512 640 458" fill="none" stroke="${SKIN_D}" stroke-width="4" stroke-linecap="round"/>
`;
  }
  const nodeReg = (id, label, short, cx, cy, look, palp, lx, ly, anchor) => ({
    id, label, short, cx, cy, r: 12, lx, ly, anchor,
    tools: { look: NODE_LOOK, palp: { html: palp, run: nodeRun(id) } }
  });
  const nodeRegions = [
    nodeReg('pre', 'Cadena preauricular', 'Preauricular', 360, 190, '', nodeTxt('preauricular', 'piel de la sien y la frente lateral, párpados y conjuntiva laterales, cara anterior del pabellón'), 332, 214, 'end'),
    nodeReg('ret', 'Cadena retroauricular (mastoidea)', 'Retroauricular', 436, 218, '', nodeTxt('retroauricular (mastoidea)', 'cuero cabelludo temporoparietal posterior y cara posterior del pabellón'), 470, 214, 'start'),
    nodeReg('occ', 'Cadena occipital', 'Occipital', 482, 244, '', nodeTxt('occipital', 'cuero cabelludo occipital y parte alta de la nuca'), 520, 244, 'start'),
    nodeReg('ami', 'Cadena amigdalina (yugulodigástrica)', 'Amigdalino', 354, 288, '', nodeTxt('amigdalina (yugulodigástrica, bajo el ángulo de la mandíbula)', 'amígdalas, base de la lengua y faringe'), 322, 270, 'end'),
    nodeReg('sbm', 'Cadena submaxilar (submandibular)', 'Submaxilar', 278, 322, '', nodeTxt('submaxilar (sobre el borde inferior de la mandíbula)', 'mejilla, labios, encías, lengua anterior y dientes; en personas sanas pueden palparse algunos de hasta 1 cm'), 296, 340, 'start'),
    nodeReg('sbt', 'Cadena submentoniana', 'Submentoniano', 232, 342, '', nodeTxt('submentoniana (bajo el mentón)', 'centro del labio inferior, piso de la boca, punta de la lengua e incisivos inferiores'), 150, 360, 'middle'),
    nodeReg('cva', 'Cadena cervical anterior (yugular)', 'Cervical ant.', 352, 392, '', nodeTxt('cervical anterior (cadena yugular, a lo largo del borde anterior del esternocleidomastoideo)', 'faringe, laringe, tiroides y, en última instancia, toda la cabeza y el cuello'), 320, 410, 'end'),
    nodeReg('cvp', 'Cadena cervical posterior (espinal)', 'Cervical post.', 492, 392, '', nodeTxt('cervical posterior (espinal, en el triángulo posterior, por delante del trapecio)', 'cuero cabelludo posterior, nuca y piel de la parte alta del tórax'), 540, 412, 'start'),
    nodeReg('sup', 'Cadena supraclavicular', 'Supraclavicular', 430, 466, '', nodeTxt('supraclavicular (fosa sobre la clavícula, entre el esternocleidomastoideo y el trapecio)', 'a la derecha, mediastino, pulmón y esófago; a la izquierda (ganglio de Virchow), también las vísceras abdominales. En condiciones normales no se palpa'), 470, 440, 'start')
  ];
  /* ============================================================ definición del módulo */
  const quizFor = c => {
    const hr = c.v.hr;
    const ocular = ageOld(c)
      ? { q: `En esta persona de ${c.age} años, un anillo blanco-grisáceo en la periferia de la córnea corresponde a…`, options: ['Queratitis', 'Ictericia', 'Arco senil (variante normal de la edad)', 'Pterigion'], a: 2,
        why: 'El arco senil (gerontoxon) es un depósito lipídico periférico de la córnea, frecuente y sin significado patológico en el adulto mayor.' }
      : c.age >= 45
        ? { q: `A los ${c.age} años, con visión lejana 20/20, necesitar alejar el texto para leer de cerca corresponde a…`, options: ['Miopía', 'Presbicia fisiológica', 'Catarata', 'Glaucoma'], a: 1,
          why: 'La presbicia es la pérdida fisiológica de la acomodación a partir de los 40-45 años; la visión lejana se conserva.' }
        : { q: `En esta persona de ${c.age} años con agudeza 20/20, ¿cuál de estos hallazgos NO sería una variante normal?`, options: ['Pupilas de 2-4 mm, isocóricas', 'Reflejo foveal presente', 'Pulso venoso espontáneo en la papila', 'Arco corneal'], a: 3,
          why: 'Un arco corneal antes de los 40-50 años no es un hallazgo esperable y obliga a descartar dislipidemia; los otros tres son normales.' };
    return [
      { q: 'Cono luminoso normal del oído derecho', options: ['A las 1 h', 'A las 3 h', 'A las 5 h', 'A las 7 h', 'A las 11 h'], a: 2,
        why: 'En el oído derecho el cono luminoso se ve a las 5 h (cuadrante anteroinferior); en el izquierdo, a las 7 h.' },
      { q: 'Prueba de Rinne normal', options: ['Conducción aérea > ósea (Rinne positivo)', 'Conducción ósea > aérea', 'Ambas iguales', 'Se oye solo en la mastoides', 'No se oye frente al meato'], a: 0,
        why: 'Rinne positivo: la conducción aérea se oye más tiempo (≈ el doble) y más fuerte que la ósea.' },
      { q: 'Clasificación de Mallampati compatible con una vía aérea de acceso fácil', options: ['III', 'IV', 'Solo clase 0', 'I-II', 'Solo clase IV'], a: 3,
        why: 'En las clases I y II se ven la úvula (completa o en parte) y los pilares; las clases III y IV predicen vía aérea difícil.' },
      ocular,
      { q: 'Con la deglución, el tiroides normal', options: ['Se mantiene inmóvil', 'Desciende hacia el tórax', 'Se desvía hacia un lado', 'Asciende junto con la laringe', 'Produce un soplo'], a: 3,
        why: 'La fascia pretraqueal fija la glándula a la laringe y la tráquea: asciende al deglutir y vuelve a su sitio; por eso se palpa haciendo tragar al paciente.' },
      { q: 'Según la OMS, un bocio palpable pero no visible con el cuello en posición normal es de grado…', options: ['I', '0', 'II', 'III'], a: 0,
        why: 'Grado 0: no palpable ni visible; grado I: palpable pero no visible con el cuello en posición normal; grado II: visible con el cuello en posición normal.' },
      { q: `Pulso carotídeo esperable en esta persona (FC ${hr}/min)`, options: [`≈ ${hr - 25}/min, irregular`, `≈ ${hr + 40}/min`, `≈ ${hr}/min, regular, palpando una carótida por vez`, 'No se palpa en personas sanas'], a: 2,
        why: 'El pulso carotídeo refleja la frecuencia cardíaca; se palpa de un lado a la vez y con suavidad para no estimular el seno carotídeo.' },
      { q: 'Un ganglio cervical normal, si se palpa, es', options: ['Duro y fijo, de 2 cm', '< 1 cm, blando, móvil e indoloro', 'Doloroso y caliente', 'Adherido a planos profundos', 'Solo en la región supraclavicular'], a: 1,
        why: 'Los ganglios normales no se palpan o son pequeños (&lt; 1 cm), blandos, móviles e indoloros; un ganglio supraclavicular palpable siempre es anormal.' }
    ];
  };

  injectStyle();
  NormalEngine.build({
    id: 'headneck', title: 'Cabeza y cuello (normal)', icon: '👤', group: 'Exploración normal',
    desc: 'Exploración normal de cabeza, facies, ojos, oído, nariz, boca y fauces, cuello, tiroides y ganglios, con instrumentos y animaciones.',
    bullets: ['Cara y facies, senos paranasales, ATM, pupilas y agudeza visual', 'Fondo de ojo y otoscopia (Rinne y Weber con diapasón)', 'Boca y fauces (Mallampati), tiroides (bocio OMS 0-II) y mapa de ganglios cervicales'],
    refs: [
      'Argente HA, Álvarez ME. <i>Semiología Médica</i>. Ed. Médica Panamericana — Cabeza y cuello: facies; examen del ojo y fondo de ojo; oído; nariz; boca y fauces; cuello, tiroides y ganglios linfáticos.',
      'OMS / ICCIDD / UNICEF. Clasificación clínica del bocio por palpación: grados 0, I y II.',
      'Mallampati SR y cols. (1985), modificada por Samsoon y Young (1987): clasificación de la vía aérea (clases I-IV).'
    ],
    teaching: [
      'Inspecciona antes de palpar y compara siempre ambos lados: la simetría es el primer criterio de normalidad. Describe la facies (compuesta en la persona sana).',
      'Otoscopia: tracciona el pabellón hacia atrás y arriba (adulto) para enderezar el conducto y apoya la mano que sostiene el otoscopio en la mejilla del paciente.',
      'Oftalmoscopia: acércate al ojo derecho con tu ojo derecho (y viceversa), a 3-5 cm; sigue un vaso hacia el disco y deja la mácula para el final.',
      'Tiroides: inspección con luz tangencial y palpación anterior y posterior mientras el paciente traga; describe tamaño (grados OMS 0-II), consistencia, superficie, nódulos, dolor y soplos.',
      'Ganglios: yemas de 2-3 dedos en círculos suaves y con un orden fijo; describe tamaño, consistencia, movilidad (adherencia), sensibilidad y piel suprayacente. Carótidas: palpa de a una.'
    ],
    scenes: [
      { id: 'face', label: 'Cabeza y cara', viewBox: '0 0 820 600', hint: 'Inspección, palpación, percusión de senos, linterna y agudeza visual: haz clic en cada zona.',
        svg: faceSvg, regions: faceRegions, redrawOnMode: false,
        tools: [
          { id: 'look', icon: '👁️', label: 'Inspección', hint: 'Inspección: observa simetría, piel, cabello, ojos y facies.' },
          { id: 'touch', icon: '✋', label: 'Palpación / presión', hint: 'Palpación: cráneo, arteria temporal, senos (presión), ATM y glándulas salivales.' },
          { id: 'tap', icon: '🔨', label: 'Percusión (senos)', hint: 'Percusión de los senos frontales y maxilares con el dedo.' },
          { id: 'light', icon: '🔦', label: 'Linterna (pupilas)', hint: 'Linterna: haz clic sobre un ojo; ambas pupilas se contraen (reflejo directo y consensual).' },
          { id: 'snellen', icon: '🔤', label: 'Agudeza visual', hint: 'Cartilla de Snellen a 6 m, cada ojo por separado.' }
        ] },
      { id: 'fundus', label: 'Fondo de ojo', viewBox: '0 0 800 520', redrawOnMode: true,
        hint: 'Oftalmoscopio: mueve el cursor para recorrer el fondo del ojo (campo limitado) y haz clic en cada estructura.',
        svg: fundusSvg, get regions() { return fundusRegions(); },
        tools: [
          { id: 'oft', icon: '🔎', label: 'Oftalmoscopio (campo limitado)', hint: 'Oftalmoscopio: mueve el cursor para iluminar una zona estrecha del fondo y haz clic en lo que ves.' },
          { id: 'foto', icon: '🖼️', label: 'Retinografía (vista completa)', hint: 'Retinografía: se ve todo el fondo de ojo. Haz clic en cada estructura.' }
        ],
        after(stage, sh, ctx) {
          clearInterval(fTimer);
          seg(stage, [['OD', 'Ojo derecho'], ['OI', 'Ojo izquierdo']], fSide, v => { fSide = v; ctx.scene.enter(stage, sh); });
          const svg = ctx.svg;
          const g = mk('g', { 'pointer-events': 'none' },
            '<defs><mask id="hnScopeM"><rect x="0" y="0" width="800" height="520" fill="#fff"/><circle id="hnScopeC" cx="338" cy="262" r="96" fill="#000"/></mask></defs>' +
            '<rect x="70" y="0" width="520" height="520" fill="#050505" opacity=".95" mask="url(#hnScopeM)"/>' +
            '<circle id="hnScopeR" cx="338" cy="262" r="96" fill="none" stroke="#1a1a1a" stroke-width="4"/>');
          svg.appendChild(g);
          const mv = e => {
            const p = svgPoint(svg, e);
            ['#hnScopeC', '#hnScopeR'].forEach(s => { const n = g.querySelector(s); n.setAttribute('cx', p.x); n.setAttribute('cy', p.y); });
          };
          svg.addEventListener('pointermove', mv);
          svg.addEventListener('pointerdown', mv);
          fTimer = setInterval(() => { g.style.display = sh.tool === 'oft' ? '' : 'none'; }, 120);
        },
        onLeave() { clearInterval(fTimer); fTimer = null; } },
      { id: 'ear', label: 'Oído', viewBox: '0 0 820 560', redrawOnMode: false,
        hint: 'Inspecciona el pabellón, haz la otoscopia y explora Rinne (mastoides y meato) y Weber (vértex) con el diapasón.',
        svg: earSvg, get regions() { return earRegions(); },
        tools: [
          { id: 'look', icon: '👁️', label: 'Inspección', hint: 'Inspección del pabellón, la mastoides y el meato.' },
          { id: 'pull', icon: '🤏', label: 'Tracción del pabellón / trago', hint: 'Tracción del pabellón hacia atrás y arriba y presión del trago.' },
          { id: 'oto', icon: '🔦', label: 'Otoscopio', hint: 'Otoscopio: haz clic en las estructuras de la membrana timpánica (círculo de la derecha).' },
          { id: 'pneu', icon: '💨', label: 'Otoscopia neumática', hint: 'Otoscopia neumática: haz clic sobre la membrana para ver su movilidad.' },
          { id: 'fork', icon: '🎵', label: 'Diapasón (256-512 Hz)', hint: 'Rinne: mastoides y luego meato. Weber: vértex. Se oye un tono de diapasón.' },
          { id: 'whisper', icon: '🗣️', label: 'Voz cuchicheada', hint: 'Voz cuchicheada a 60 cm: haz clic en el meato.' }
        ],
        after(stage, sh, ctx) {
          seg(stage, [['D', 'Oído derecho'], ['I', 'Oído izquierdo']], earSide, v => { earSide = v; ctx.scene.enter(stage, sh); });
        } },
      { id: 'nose', label: 'Nariz', viewBox: '0 0 820 560', redrawOnMode: false,
        hint: 'Inspecciona y palpa la pirámide nasal, comprueba la permeabilidad (espejo) y haz la rinoscopia anterior.',
        svg: noseSvg, regions: noseRegions,
        tools: [
          { id: 'look', icon: '👁️', label: 'Inspección', hint: 'Inspección de la pirámide nasal y las narinas.' },
          { id: 'palp', icon: '✋', label: 'Palpación', hint: 'Palpa dorso y punta de la nariz.' },
          { id: 'occl', icon: '👃', label: 'Permeabilidad (ocluir una fosa)', hint: 'Ocluye una fosa haciendo clic en el ala nasal: el aire debe pasar por la otra.' },
          { id: 'spec', icon: '🔦', label: 'Rinoscopia (espéculo + luz)', hint: 'Rinoscopia anterior: haz clic en tabique y cornetes de cada fosa.' }
        ] },
      { id: 'mouth', label: 'Boca y fauces', viewBox: '0 0 820 600', redrawOnMode: false,
        hint: 'Linterna, depresor lingual y "diga ah": explora labios, dientes, encías, lengua y fauces.',
        svg: mouthSvg, get regions() { return tongueUp ? mouthRegionsUp() : mouthRegions(); },
        tools: [
          { id: 'look', icon: '🔦', label: 'Inspección con linterna', hint: 'Inspección con linterna: haz clic en cada estructura.' },
          { id: 'depress', icon: '🥄', label: 'Depresor lingual', hint: 'Depresor lingual: baja la lengua para ver las fauces.' },
          { id: 'say', icon: '🗣️', label: 'Pedir "ah"', hint: 'Pide al paciente decir "ah": observa cómo se elevan el paladar blando y la úvula.' },
          { id: 'mall', icon: '👅', label: 'Mallampati (lengua afuera)', hint: 'Mallampati: boca abierta, lengua afuera sin fonar; haz clic en las fauces.' },
          { id: 'palp', icon: '✋', label: 'Palpación', hint: 'Palpa labios, encías, lengua y paladar (con guantes).' },
          { id: 'smell', icon: '👃', label: 'Aliento', hint: 'Valora el olor del aliento (clic en los labios).' }
        ],
        after(stage, sh, ctx) {
          const P = document.createElement('div');
          P.className = 'hn-panel';
          P.innerHTML = `
            <div class="hn-box"><h5>Lengua</h5>
              <div class="hn-btns"><button id="hnUp" class="${tongueUp ? 'on' : ''}">${tongueUp ? 'Lengua elevada (ver dorso)' : 'Elevar la lengua (piso de la boca)'}</button></div></div>
            <div class="hn-box"><h5>Clasificación de Mallampati (referencia)</h5>
              <div class="hn-btns" id="hnMB"><button data-k="I">I</button><button data-k="II">II</button><button data-k="III">III</button><button data-k="IV">IV</button></div>
              <div class="hn-read" id="hnMR">Haz clic en una clase para ver qué estructuras se visualizan.</div></div>`;
          stage.appendChild(P);
          const defs = {
            I: 'Se ven paladar blando, fauces, úvula y pilares amigdalinos. <b>Normal.</b>',
            II: 'Se ven paladar blando, fauces y parte de la úvula (la base queda oculta por la lengua). <b>Normal.</b>',
            III: 'Solo se ven el paladar blando y la base de la úvula. (Predice vía aérea difícil.)',
            IV: 'Solo se ve el paladar duro. (Predice vía aérea difícil.)'
          };
          P.querySelector('#hnMB').addEventListener('click', e => {
            const b = e.target.closest('button'); if (!b) return;
            P.querySelectorAll('#hnMB button').forEach(x => x.classList.toggle('on', x === b));
            P.querySelector('#hnMR').innerHTML = `<b>Clase ${b.dataset.k}:</b> ${defs[b.dataset.k]}`;
          });
          P.querySelector('#hnUp').addEventListener('click', () => { tongueUp = !tongueUp; ctx.scene.enter(stage, sh); });
        } },
      { id: 'neck', label: 'Cuello', viewBox: '0 0 820 600', redrawOnMode: false,
        hint: 'Inspecciona, palpa tráquea y carótidas (una a la vez), ausculta y usa el panel inferior para la movilidad y la yugular.',
        svg: neckSvg, regions: neckRegions, after: neckAfter,
        tools: [
          { id: 'look', icon: '👁️', label: 'Inspección', hint: 'Inspección del cuello: forma, piel, simetría, yugulares y latidos.' },
          { id: 'palp', icon: '✋', label: 'Palpación', hint: 'Palpa tráquea (línea media) y carótidas (de una en una).' },
          { id: 'ausc', icon: '🩺', label: 'Auscultación (carótidas)', hint: 'Campana sobre la carótida en apnea breve.' },
          { id: 'move', icon: '💪', label: 'Fuerza ECM / trapecio', hint: 'Rotación del cuello y elevación de los hombros contra resistencia (XI par).' }
        ] },
      { id: 'thyroid', label: 'Tiroides', viewBox: '0 0 820 600', redrawOnMode: true,
        hint: 'Compara la palpación anterior y posterior (técnica de Argente); pide al paciente que trague para ver ascender la glándula.',
        svg: thySvg, regions: thyRegions,
        tools: [
          { id: 'look', icon: '👁️', label: 'Inspección', hint: 'Inspección tangencial de la región tiroidea, en reposo y al deglutir (bocio OMS 0-II).' },
          { id: 'ant', icon: '🤚', label: 'Palpación anterior', hint: 'Palpación anterior: examinador frente al paciente, desplazando la laringe hacia el lado explorado.' },
          { id: 'post', icon: '🙌', label: 'Palpación posterior', hint: 'Palpación posterior: examinador detrás del paciente, con los dedos bajo el cricoides.' },
          { id: 'swallow', icon: '🥤', label: 'Pedir deglutir', hint: 'Pide al paciente tragar un sorbo de agua y observa el ascenso.' },
          { id: 'ausc', icon: '🩺', label: 'Auscultación', hint: 'Campana sobre los lóbulos: no debe haber soplo.' }
        ] },
      { id: 'nodes', label: 'Ganglios cervicales', viewBox: '0 0 820 600', redrawOnMode: false,
        hint: 'Palpa las 9 cadenas con la yema de 2-3 dedos, en orden: preauricular, retroauricular, occipital, amigdalina, submaxilar, submentoniana, cervical anterior, cervical posterior y supraclavicular.',
        svg: nodesSvg, regions: nodeRegions,
        tools: [
          { id: 'look', icon: '👁️', label: 'Inspección', hint: 'Inspección: busca abultamientos o asimetrías.' },
          { id: 'palp', icon: '🤚', label: 'Palpación (yemas, en círculos)', hint: 'Palpación suave con movimientos circulares sobre cada cadena; describe tamaño, consistencia, movilidad y sensibilidad.' }
        ],
        after(stage, sh, ctx) {
          seen = new Set();
          const t = document.createElement('div');
          t.className = 'overlay-top';
          t.innerHTML = `<span class="hn-tag" id="hnNodeCnt">Cadenas exploradas: 0/${NODE_N}</span>`;
          stage.appendChild(t);
        } }
    ],
    quiz: quizFor
  });
})();