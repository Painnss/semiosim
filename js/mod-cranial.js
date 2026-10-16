/* Módulo: Examen neurológico normal (conciencia y estado mental, pares craneales, motilidad, taxia, sensibilidad, marcha y signos meníngeos).
   Orden de las escenas según Argente-Álvarez: estado mental → pares craneales I-XII → motilidad (fuerza, tono, trofismo) → taxia → sensibilidad
   superficial y profunda → marcha y equilibrio → signos meníngeos. Los reflejos se exploran en el módulo «Neurología: reflejos, pies y ojos».
   Usa NormalEngine.build; las animaciones y controles extra se hacen con `run` y con el gancho `after`. */
(function () {
  'use strict';
  const { clamp, lerp, tween, svgPoint } = U;
  const NS = 'http://www.w3.org/2000/svg';
  const SKIN = '#f1c9a5', SKIN_D = '#b98a63';
  const SLEEVE = '#cfdbe6', SLEEVE_D = '#9fb2c4', PANTS = '#8fa6bb', PANTS_D = '#6f879d';
  const DEG = Math.PI / 180;

  /* ---------------------------------------------------------------- utilidades */
  function injectStyle() {
    if (document.getElementById('cr-style')) return;
    const s = document.createElement('style');
    s.id = 'cr-style';
    s.textContent = `
.cr-panel{padding:10px 12px;background:var(--panel);color:var(--ink);border-top:1px solid var(--line);font-size:13px}
.cr-panel h5{margin:0 0 6px;font-size:13px;color:var(--muted);font-weight:600}
.cr-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:8px 14px}
.cr-dom{border:1px solid var(--line);border-radius:10px;padding:6px 8px;background:var(--bg)}
.cr-dom b{font-size:12.5px}
.cr-dom .sc{float:right;font-weight:700;color:var(--brand)}
.cr-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}
.cr-chips button{border:1px solid var(--line);background:var(--panel);color:var(--ink);border-radius:999px;padding:2px 8px;font-size:11.5px;cursor:pointer}
.cr-chips button:hover{border-color:var(--brand)}
.cr-chips button.ok{background:var(--ok-bg);border-color:var(--ok);color:var(--ok);font-weight:600}
.cr-read{margin-top:8px;min-height:36px;font-size:13px}
.cr-tag{background:var(--panel);color:var(--ink);padding:4px 9px;border-radius:8px;border:1px solid var(--line);font-size:12px}
.cr-btn{border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:8px;padding:4px 10px;font-size:12.5px;cursor:pointer}
.cr-btn:hover{border-color:var(--brand)}`;
    document.head.appendChild(s);
  }
  const mk = (tag, attrs, html) => {
    const e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(k => e.setAttribute(k, attrs[k]));
    if (html) e.innerHTML = html;
    return e;
  };
  const $q = (svg, id) => svg.querySelector('#' + id);
  const ageOld = c => c.age >= 60;          // solo para el dibujo (canas)
  const elder = c => c.age >= 65;           // cambios fisiológicos del envejecimiento en los textos
  const hairOf = c => (ageOld(c) ? '#c8ccd2' : (c.sex === 'F' ? '#4a2f20' : '#3a2a1e'));
  /* temporizadores de la escena (se cancelan al salir) */
  const timers = [];
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
  function clearTimers() { while (timers.length) clearTimeout(timers.pop()); }
  const smooth = u => u * u * (3 - 2 * u);
  const tri = (u, a, b) => (u < a ? u / a : u < b ? 1 : 1 - (u - b) / (1 - b));   // 0→1, meseta, 1→0

  let anim = null;
  function play(ms, fn, done) {
    if (anim) anim();
    anim = tween(ms, fn, () => { anim = null; if (done) done(); });
  }
  function stopAnim() { if (anim) { anim(); anim = null; } clearTimers(); }

  /* texto flotante (p. ej. "5/5") junto al punto explorado */
  function popText(svg, p, txt, color) {
    const t = mk('text', { x: p.x, y: p.y, 'text-anchor': 'middle', 'font-family': 'system-ui,sans-serif', 'font-size': 20, 'font-weight': 700, fill: color || '#237a4b', stroke: '#fff', 'stroke-width': 3, 'paint-order': 'stroke', 'pointer-events': 'none' });
    t.textContent = txt;
    svg.appendChild(t);
    tween(1500, u => { t.setAttribute('y', p.y - 8 - 30 * u); t.setAttribute('opacity', u < .6 ? 1 : 1 - (u - .6) / .4); }, () => t.remove());
  }
  /* instrumento (algodón, alfiler, tubo, diapasón) que aparece un instante sobre el punto */
  function instrument(svg, p, kind) {
    const g = mk('g', { 'pointer-events': 'none', transform: `translate(${p.x} ${p.y})` });
    if (kind === 'cotton') g.innerHTML = '<circle r="8" fill="#fff" stroke="#9aa8b6" stroke-width="2"/><circle cx="3" cy="-3" r="3" fill="#eef2f6"/><line x1="6" y1="-6" x2="30" y2="-30" stroke="#c9a56b" stroke-width="3" stroke-linecap="round"/>';
    else if (kind === 'pin') g.innerHTML = '<line x1="0" y1="0" x2="26" y2="-34" stroke="#8a97a6" stroke-width="3" stroke-linecap="round"/><circle cx="26" cy="-34" r="5" fill="#c0392b"/><circle r="2.2" fill="#444"/>';
    else if (kind === 'cold') g.innerHTML = '<rect x="-6" y="-34" width="14" height="30" rx="4" transform="rotate(25)" fill="#8fc7ef" stroke="#4a8fc0" stroke-width="2"/>';
    else if (kind === 'warm') g.innerHTML = '<rect x="-6" y="-34" width="14" height="30" rx="4" transform="rotate(25)" fill="#f0a08a" stroke="#c0604a" stroke-width="2"/>';
    else if (kind === 'fork') g.innerHTML = '<path d="M-5 -42 L-5 -12 Q0 -4 5 -12 L5 -42" fill="none" stroke="#8a97a6" stroke-width="3.4" stroke-linecap="round"/><line x1="0" y1="-4" x2="0" y2="14" stroke="#8a97a6" stroke-width="3.4"/><path d="M-12 -30 q-6 8 0 16 M12 -30 q6 8 0 16" fill="none" stroke="#7a4fc0" stroke-width="2"/>';
    else if (kind === 'ham') g.innerHTML = '<line x1="0" y1="0" x2="30" y2="-34" stroke="#8a97a6" stroke-width="5" stroke-linecap="round"/><rect x="-10" y="-6" width="20" height="14" rx="5" fill="#c0392b"/>';
    svg.appendChild(g);
    tween(1300, u => g.setAttribute('opacity', u < .75 ? 1 : 1 - (u - .75) / .25), () => g.remove());
  }
  const limb = (x1, y1, x2, y2, w, fill, st) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${st || SKIN_D}" stroke-width="${w + 4}" stroke-linecap="round"/>` +
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${fill || SKIN}" stroke-width="${w}" stroke-linecap="round"/>`;
  const mirror = x => 600 - x;

  /* ---------------------------------------------------------------- capa anatómica translúcida (control «Anatomía» del Shell)
     Cada escena declara `anatomy: (learn, c) => '<g>…</g>'`; NormalEngine la envuelve en <g id="anat"> sobre la piel y bajo los puntos. */
  const BONE = '#f1e9dc', BONE_D = '#b9a98f', MUSC = '#b85c55', MUSC_D = '#8d3f3a', NERV = '#f2d35b', NERV_D = '#b89a2c';
  const DERM = ['#6fb1e0', '#f0a35a', '#8fcf7a', '#e07aa8', '#b58ad8'];
  const aLab = (x, y, lines, anchor, size) => `<text class="svg-small" x="${x}" y="${y}" text-anchor="${anchor || 'start'}" style="font-size:${size || 10.5}px;paint-order:stroke;stroke:#e8eef4;stroke-width:3px">${
    (Array.isArray(lines) ? lines : [lines]).map((l, i) => `<tspan x="${x}" dy="${i ? 12 : 0}">${l}</tspan>`).join('')}</text>`;
  const musc = (cx, cy, rx, ry, rot) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot || 0} ${cx} ${cy})" fill="${MUSC}" fill-opacity=".6" stroke="${MUSC_D}" stroke-width="1.2"/>`;
  const nerve = (pts, w) => {
    const d = 'M' + pts.map(p => p.join(' ')).join(' L'), ww = w || 2;
    return `<path d="${d}" fill="none" stroke="${NERV_D}" stroke-width="${ww + 1.4}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${NERV}" stroke-width="${ww}" stroke-linecap="round" stroke-linejoin="round"/>`;
  };
  const band = (pts, w, col) => `<path d="${'M' + pts.map(p => p.join(' ')).join(' L')}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>`;
  const leader = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#8a97a6" stroke-width="1"/>`;

  /* figura frontal de pie (centro x = 300) usada en las escenas de motor y sensibilidad */
  function bodyFront(c) {
    const hair = hairOf(c), F = c.sex === 'F';
    let s = '';
    [0, 1].forEach(i => {
      const X = x => (i ? mirror(x) : x);
      s += limb(X(280), 352, X(272), 452, 48, PANTS, PANTS_D);
      s += limb(X(272), 458, X(266), 572, 32, SKIN, SKIN_D);
      s += `<ellipse cx="${X(258)}" cy="597" rx="27" ry="11" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3"/>`;
    });
    s += `<path d="M232 146 Q300 128 368 146 L354 302 Q358 330 352 352 L248 352 Q242 330 246 302 Z" fill="${SLEEVE}" stroke="${SLEEVE_D}" stroke-width="3"/>`;
    s += `<path d="M246 330 L354 330 L360 388 L300 372 L240 388 Z" fill="${PANTS}" stroke="${PANTS_D}" stroke-width="3"/>`;
    s += `<rect x="285" y="104" width="30" height="34" rx="10" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3"/>`;
    [0, 1].forEach(i => {
      const X = x => (i ? mirror(x) : x);
      s += limb(X(240), 152, X(224), 200, 36, SLEEVE, SLEEVE_D);
      s += limb(X(224), 200, X(206), 256, 28, SKIN, SKIN_D);
      s += limb(X(206), 256, X(192), 346, 24, SKIN, SKIN_D);
      s += `<ellipse cx="${X(187)}" cy="364" rx="13" ry="18" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="2.5"/>`;
    });
    s += `<ellipse cx="300" cy="72" rx="34" ry="42" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3"/>`;
    s += `<path d="M266 66 C264 34 336 34 334 66 C326 50 274 50 266 66 Z" fill="${hair}"/>`;
    if (F) s += `<path d="M266 60 C258 90 262 104 270 112 L274 90 Z M334 60 C342 90 338 104 330 112 L326 90 Z" fill="${hair}"/>`;
    s += `<circle cx="288" cy="74" r="2.6" fill="#333"/><circle cx="312" cy="74" r="2.6" fill="#333"/><path d="M290 94 Q300 99 310 94" fill="none" stroke="#a5574d" stroke-width="2.4" stroke-linecap="round"/>`;
    return s;
  }

  /* ============================================================ 1. PARES CRANEALES */
  const NERVES = [
    { n: 1, rn: 'I', name: 'Olfatorio', kind: 'Sensitivo', tag: 'Olfato',
      fn: 'Olfato. Los filamentos olfatorios atraviesan la lámina cribosa del etmoides y llegan al bulbo olfatorio.',
      how: 'Con los ojos cerrados y ocluyendo una narina, se acerca a la otra una sustancia aromática <b>no irritante</b> (café, vainilla, clavo, menta, jabón) y se pregunta si la percibe y cuál es; luego se repite con la otra fosa. Se evita el amoníaco o el alcohol, que estimulan el trigémino. Antes se comprueba que las fosas estén permeables.',
      normal: 'Percibe e identifica el aroma en cada fosa nasal por separado (basta reconocer que huele; nombrarlo es mejor). Después de los 65 años puede haber una hiposmia leve sin significado patológico.' },
    { n: 2, rn: 'II', name: 'Óptico', kind: 'Sensitivo', tag: 'Visión',
      fn: 'Visión. Retina → nervio óptico → quiasma → cintilla → cuerpo geniculado lateral → radiaciones ópticas → corteza occipital. Es la vía aferente del reflejo fotomotor.',
      how: '<b>Agudeza visual</b> (Snellen a 6 m; tabla de Jaeger de cerca), <b>visión de los colores</b>, <b>campos visuales por confrontación</b> (cada ojo por separado, enfrentado al ojo del examinador, en los 4 cuadrantes), <b>fondo de ojo</b> y <b>reflejo fotomotor</b>.',
      normal: 'Agudeza 20/20 (6/6), con corrección si la usa; distingue los colores; campos visuales completos por confrontación; papila de bordes nítidos; reflejo fotomotor directo y consensual presentes.' },
    { n: 3, rn: 'III', name: 'Oculomotor', kind: 'Motor y parasimpático', tag: 'Ojo y pupila',
      fn: 'Rectos superior, inferior y medial, oblicuo inferior y elevador del párpado. Sus fibras parasimpáticas inervan el esfínter de la pupila (miosis) y el músculo ciliar (acomodación).',
      how: 'Seguimiento de un dedo en <b>H</b> (movimientos conjugados en las 6 posiciones cardinales de la mirada), observación de los <b>párpados</b> (hendidura palpebral), tamaño y forma de las <b>pupilas</b>, reflejo fotomotor directo y consensual y reflejo de acomodación-convergencia.',
      normal: 'Movimientos oculares completos y conjugados, sin diplopía ni nistagmo; sin ptosis (hendiduras palpebrales simétricas); pupilas de 2-4 mm, redondas, isocóricas, con reflejo fotomotor directo y consensual y reflejo de acomodación-convergencia presentes.' },
    { n: 4, rn: 'IV', name: 'Troclear', kind: 'Motor', tag: 'Mirada abajo y adentro',
      fn: 'Oblicuo superior (hace descender y rotar hacia adentro el ojo, sobre todo en aducción). Es el único par que emerge por la cara dorsal del tronco y tiene el trayecto intracraneal más largo.',
      how: 'Se pide mirar hacia <b>abajo y adentro</b> (hacia la nariz; como al leer o bajar escaleras). Se explora junto con III y VI en el patrón en H.',
      normal: 'Descenso del ojo en aducción completo, sin diplopía vertical ni inclinación compensadora de la cabeza.' },
    { n: 5, rn: 'V', name: 'Trigémino', kind: 'Mixto', tag: 'Cara · masticación',
      fn: '<b>Sensitivo</b>: cara, córnea, mucosa nasal y bucal y 2/3 anteriores de la lengua (sensibilidad general). Tiene tres ramas: <b>V1 oftálmica</b> (frente, párpado superior, dorso de la nariz, córnea), <b>V2 maxilar</b> (mejilla, ala nasal, labio superior) y <b>V3 mandibular</b> (mentón, mandíbula, labio inferior). <b>Motor</b> (V3): masetero, temporal y pterigoideos.',
      how: '<b>Sensibilidad</b> (algodón para el tacto, alfiler para el dolor, tubo frío) en las 3 ramas, comparando ambos lados; <b>reflejo corneal</b> (algodón sobre la córnea desde un lado: parpadeo); <b>maseteros y temporales</b> (palpar al apretar los dientes) y apertura bucal con la mandíbula en línea media.',
      normal: 'Sensibilidad facial simétrica en V1, V2 y V3; reflejo corneal presente y bilateral (aferente V1, eferente VII); maseteros y temporales firmes y simétricos al apretar los dientes; la mandíbula abre sin desviarse.' },
    { n: 6, rn: 'VI', name: 'Abducens', kind: 'Motor', tag: 'Abducción ocular',
      fn: 'Recto lateral: abducción del ojo (mirada hacia afuera).',
      how: 'Pedir mirar hacia la derecha y la izquierda con la cabeza quieta; comprobar que ambos ojos llegan al ángulo externo y no hay diplopía horizontal.',
      normal: 'Abducción completa y simétrica de ambos ojos, sin diplopía. Un nistagmo breve y agotable en la mirada extrema puede ser fisiológico.' },
    { n: 7, rn: 'VII', name: 'Facial', kind: 'Mixto', tag: 'Mímica facial',
      fn: '<b>Motor</b>: músculos de la mímica y estapedio. <b>Sensitivo</b> (cuerda del tímpano): gusto de los 2/3 anteriores de la lengua. <b>Parasimpático</b>: glándulas lagrimal, submandibular y sublingual.',
      how: 'Observar la simetría en reposo (surcos nasolabiales, hendiduras palpebrales) y pedir: <b>arrugar la frente</b> y elevar las cejas, <b>cerrar los ojos con fuerza</b> (el examinador intenta abrirlos), <b>mostrar los dientes o sonreír</b>, inflar las mejillas y silbar.',
      normal: 'Cara simétrica en reposo y en movimiento; frente que se arruga por igual (la frente está inervada por ambos hemisferios, por eso la parálisis central la respeta); cierre ocular con fuerza vencible solo con gran esfuerzo; sonrisa simétrica sin desviación de la comisura.' },
    { n: 8, rn: 'VIII', name: 'Vestibulococlear', kind: 'Sensitivo', tag: 'Oído · equilibrio',
      fn: '<b>Coclear</b>: audición. <b>Vestibular</b>: equilibrio y orientación en el espacio (reflejo vestíbulo-ocular).',
      how: '<b>Audición</b>: voz susurrada a 60 cm, frotar los dedos junto al oído, diapasón de 256-512 Hz (pruebas de Rinne y Weber) tras la otoscopia. <b>Vestibular</b>: buscar nistagmo, vértigo, Romberg y marcha.',
      normal: 'Oye el susurro a 60 cm con cada oído; Rinne positivo (conducción aérea mayor que la ósea) y Weber en la línea media (no lateraliza); sin nistagmo espontáneo ni vértigo; Romberg y marcha normales.' },
    { n: 9, rn: 'IX', name: 'Glosofaríngeo', kind: 'Mixto', tag: 'Deglución · gusto',
      fn: '<b>Sensitivo</b>: tercio posterior de la lengua (gusto y sensibilidad), faringe, amígdala, oído medio y seno carotídeo (barorreceptores). <b>Motor</b>: estilofaríngeo. <b>Parasimpático</b>: parótida.',
      how: 'Se explora con el X: pedir decir <b>"ah"</b>, <b>reflejo nauseoso</b> (tocar la pared posterior de la faringe con un depresor: aferente IX, eferente X), observar la <b>deglución</b> y la voz.',
      normal: 'Reflejo nauseoso presente y simétrico, sensibilidad faríngea conservada, deglución sin atragantamiento ni regurgitación nasal.' },
    { n: 10, rn: 'X', name: 'Vago', kind: 'Mixto', tag: 'Paladar · voz',
      fn: '<b>Motor</b>: paladar blando, faringe y laringe (cuerdas vocales). <b>Parasimpático</b>: corazón y vísceras torácicas y abdominales. <b>Sensitivo</b>: faringe, laringe, oído externo y vísceras.',
      how: 'Decir <b>"ah"</b>: el paladar blando y la úvula deben elevarse de forma simétrica con la úvula en la línea media; escuchar la <b>voz</b> (sin ronquera ni tono nasal), la tos, la deglución y el reflejo nauseoso.',
      normal: 'Úvula central que se eleva simétricamente al decir "ah"; voz clara, ni ronca ni nasal; tos eficaz; deglución sin disfagia; reflejo nauseoso presente.' },
    { n: 11, rn: 'XI', name: 'Espinal (accesorio)', kind: 'Motor', tag: 'Trapecio · ECM',
      fn: 'Inerva el esternocleidomastoideo (ECM) y la porción superior del trapecio.',
      how: '<b>Trapecio</b>: elevar (encoger) los hombros contra la resistencia de las manos del examinador. <b>ECM</b>: girar la cabeza contra la mano del examinador (el ECM de un lado gira la cabeza hacia el lado contrario); observar contorno, atrofia y fasciculaciones.',
      normal: 'Fuerza 5/5 simétrica en ambos trapecios y ECM; volumen y contorno normales, sin atrofia ni fasciculaciones.' },
    { n: 12, rn: 'XII', name: 'Hipogloso', kind: 'Motor', tag: 'Lengua',
      fn: 'Inerva los músculos intrínsecos y extrínsecos de la lengua (excepto el palatogloso, X).',
      how: 'Observar la lengua en reposo dentro de la boca (atrofia, fasciculaciones); pedir <b>sacarla</b>: debe salir en la línea media; moverla de lado a lado y empujar la mejilla contra el dedo del examinador; valorar la articulación (la, ta, ka).',
      normal: 'Lengua de bordes lisos, sin atrofia ni fasciculaciones; protruye en la línea media; fuerza simétrica al empujar la mejilla; articulación clara.' }
  ];

  /* tarjetas de los 12 pares (columna derecha de la escena) */
  const CARD_W = 128, CARD_X = i => 530 + (i % 2) * 138, CARD_Y = i => 50 + Math.floor(i / 2) * 92;
  const WAY = [[0, 0], [-1, 0], [-1, -1], [-1, 1], [-1, 0], [1, 0], [1, -1], [1, 1], [1, 0], [0, 0]];
  function setMouth(svg, k) {
    const g = $q(svg, 'crMouthO'); if (!g) return;
    g.style.display = k > 0.02 ? '' : 'none';
    g.setAttribute('transform', `translate(270 382) scale(1 ${Math.max(k, 0.01).toFixed(3)}) translate(-270 -382)`);
  }
  const RUN = {
    1: ctx => {
      const a = $q(ctx.svg, 'crAroma'); if (!a) return;
      play(2400, u => { a.setAttribute('opacity', tri(u, .2, .7).toFixed(2)); a.setAttribute('transform', `translate(0 ${(-16 * u).toFixed(1)})`); }, () => a.setAttribute('opacity', 0));
      ctx.sh.say('Huele a café', 'yes', 2200);
    },
    2: ctx => {
      play(2200, u => {
        const k = tri(u, .18, .6), r = 4.6 - 1.9 * k;
        ['crPuR', 'crPuL'].forEach(id => { const e = $q(ctx.svg, id); if (e) e.setAttribute('r', r.toFixed(2)); });
      });
    },
    3: ctx => runEyes(ctx),
    4: ctx => runEyes(ctx),
    6: ctx => runEyes(ctx),
    5: ctx => {
      const svg = ctx.svg, cot = $q(svg, 'crCot');
      play(2600, u => {
        if (cot) { const k = smooth(Math.min(1, u / .5)); cot.setAttribute('transform', `translate(${(150 + 55 * k).toFixed(1)} ${(236 + 22 * k).toFixed(1)})`); cot.setAttribute('opacity', u < .75 ? 1 : 0); }
        const b = u > .5 && u < .72 ? Math.sin(Math.PI * (u - .5) / .22) : 0;
        ['crEyeR', 'crEyeL'].forEach(id => {
          const e = $q(svg, id), cx = id === 'crEyeR' ? 222 : 318;
          if (e) e.setAttribute('transform', `translate(${cx} 262) scale(1 ${(1 - 0.92 * b).toFixed(3)}) translate(${-cx} -262)`);
        });
      }, () => { if (cot) cot.setAttribute('opacity', 0); });
    },
    7: ctx => {
      const svg = ctx.svg, sm = $q(svg, 'crSmile'), br = $q(svg, 'crBrows');
      play(3200, u => {
        const kb = tri(Math.min(1, u / .5), .3, .7) * (u < .5 ? 1 : 0), ks = u < .5 ? 0 : tri((u - .5) / .5, .3, .7);
        if (br) br.setAttribute('transform', `translate(0 ${(-9 * kb).toFixed(1)})`);
        if (sm) { const k = ks, r = 2 + 9 * k, q = 6 + 22 * k; sm.setAttribute('d', `M${238 - 2 * k} ${388 - r} Q270 ${388 + q} ${302 + 2 * k} ${388 - r}`); }
      }, () => { if (br) br.removeAttribute('transform'); if (sm) sm.setAttribute('d', 'M238 388 Q270 394 302 388'); });
      ctx.sh.say('Arrugue la frente… ahora muestre los dientes', 'yes', 2800);
    },
    8: ctx => { try { Sound.beep(512, 1.1, 0.14); } catch (e) { /* noop */ } ctx.sh.say('Sí, lo oigo por ambos oídos', 'yes', 2200); },
    9: ctx => runAh(ctx),
    10: ctx => runAh(ctx),
    11: ctx => {
      const sh = $q(ctx.svg, 'crSh'); if (!sh) return;
      play(2600, u => { const k = tri(u, .25, .75); sh.setAttribute('transform', `translate(0 ${(-14 * k).toFixed(1)})`); }, () => sh.removeAttribute('transform'));
      ctx.sh.say('(encoge los hombros contra mis manos)', 'yes', 2400);
    },
    12: ctx => {
      const svg = ctx.svg, tg = $q(svg, 'crTongue');
      play(3000, u => {
        const k = tri(u, .25, .75);
        setMouth(svg, 0.5 * k);
        if (tg) tg.setAttribute('transform', `translate(270 394) scale(1 ${Math.max(k, 0.01).toFixed(3)}) translate(-270 -394)`);
      }, () => { setMouth(svg, 0); if (tg) tg.setAttribute('transform', 'translate(270 394) scale(1 0.01) translate(-270 -394)'); });
      ctx.sh.say('Aaah (saca la lengua en la línea media)', 'yes', 2600);
    }
  };
  function runEyes(ctx) {
    const svg = ctx.svg, tip = $q(svg, 'crTip');
    play(7000, u => {
      const s = u * (WAY.length - 1), i = Math.min(WAY.length - 2, Math.floor(s)), f = smooth(s - i);
      const gx = lerp(WAY[i][0], WAY[i + 1][0], f), gy = lerp(WAY[i][1], WAY[i + 1][1], f);
      ['crIrR', 'crIrL'].forEach(id => { const e = $q(svg, id); if (e) e.setAttribute('transform', `translate(${(gx * 9).toFixed(1)} ${(gy * 4.5).toFixed(1)})`); });
      if (tip) { tip.setAttribute('transform', `translate(${(270 + gx * 190).toFixed(1)} ${(262 + gy * 95).toFixed(1)})`); tip.setAttribute('opacity', 1); }
    }, () => {
      ['crIrR', 'crIrL'].forEach(id => { const e = $q(svg, id); if (e) e.removeAttribute('transform'); });
      if (tip) tip.setAttribute('opacity', 0);
    });
    ctx.sh.say('Sigo el dedo sin ver doble', 'yes', 2600);
  }
  function runAh(ctx) {
    const svg = ctx.svg, pal = $q(svg, 'crPalM');
    play(3000, u => {
      setMouth(svg, Math.min(1, tri(u, .2, .85) * 1.15));
      if (pal) { const k = u > .3 && u < .8 ? Math.sin(Math.PI * (u - .3) / .5) : 0; pal.setAttribute('transform', `translate(0 ${(-7 * k).toFixed(1)})`); }
    }, () => { setMouth(svg, 0); if (pal) pal.removeAttribute('transform'); });
    ctx.sh.say('Aaaaah…', 'yes', 2400);
  }

  function nervesSvg(learn, c) {
    const hair = hairOf(c), old = ageOld(c);
    const cards = NERVES.map((n, i) => {
      const x = CARD_X(i), y = CARD_Y(i);
      return `<rect x="${x}" y="${y}" width="${CARD_W}" height="84" rx="10" fill="#fff" stroke="#c9d3dd" stroke-width="2"/>
        <text x="${x + 10}" y="${y + 30}" font-family="system-ui,sans-serif" font-size="24" font-weight="700" fill="#0e6a78">${n.rn}</text>
        <text x="${x + 10}" y="${y + 50}" font-family="system-ui,sans-serif" font-size="12.5" font-weight="600" fill="#38495a">${n.name.length > 15 ? n.name.replace(' (accesorio)', '') : n.name}</text>
        <text x="${x + 10}" y="${y + 68}" font-family="system-ui,sans-serif" font-size="10.5" fill="#55677a">${n.tag}</text>`;
    }).join('');
    const eye = (cx, id) => `
      <clipPath id="crCl${id}"><path d="M${cx - 30} 262 Q${cx} 242 ${cx + 30} 262 Q${cx} 282 ${cx - 30} 262 Z"/></clipPath>
      <g id="crEye${id}">
        <path d="M${cx - 30} 262 Q${cx} 242 ${cx + 30} 262 Q${cx} 282 ${cx - 30} 262 Z" fill="#fbfbfb"/>
        <g clip-path="url(#crCl${id})"><g id="crIr${id}"><circle cx="${cx}" cy="262" r="11.5" fill="#6b4a2f"/><circle id="crPu${id}" cx="${cx}" cy="262" r="4.6" fill="#0b0b0b"/><circle cx="${cx + 4}" cy="258" r="2" fill="#fff" opacity=".9"/></g></g>
        <path d="M${cx - 30} 262 Q${cx} 240 ${cx + 30} 262" fill="none" stroke="#6b4a3a" stroke-width="2.4"/>
        <path d="M${cx - 30} 262 Q${cx} 282 ${cx + 30} 262" fill="none" stroke="#a37c63" stroke-width="1.3"/>
      </g>`;
    return `
    <rect width="820" height="620" fill="#e8eef4"/>
    <text x="270" y="34" text-anchor="middle" class="svg-title">Pares craneales · cara y cuello</text>
    <text x="663" y="34" text-anchor="middle" class="svg-title">Los 12 pares (haz clic)</text>
    <g id="crSh">
      <path d="M205 460 L205 520 Q120 540 40 620 L500 620 Q420 540 335 520 L335 460 Z" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3"/>
      <path d="M40 620 Q120 552 205 530 L270 580 L335 530 Q420 552 500 620 Z" fill="#9fb4c4"/>
    </g>
    <ellipse cx="145" cy="285" rx="13" ry="34" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3"/>
    <ellipse cx="395" cy="285" rx="13" ry="34" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3"/>
    <ellipse cx="270" cy="290" rx="125" ry="170" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3"/>
    <path d="M147 262 C140 130 205 108 270 108 C335 108 400 130 393 262 C382 205 340 ${old ? 150 : 166} 270 ${old ? 150 : 166} C200 ${old ? 150 : 166} 158 205 147 262 Z" fill="${hair}"/>
    ${c.sex === 'F' ? `<path d="M147 262 C136 350 140 420 160 450 L176 428 C166 380 166 320 166 262 Z M393 262 C404 350 400 420 380 450 L364 428 C374 380 374 320 374 262 Z" fill="${hair}"/>` : ''}
    <g id="crBrows"><path d="M184 238 Q222 220 256 234 M284 234 Q318 220 356 238" fill="none" stroke="${hair}" stroke-width="6" stroke-linecap="round"/></g>
    ${eye(222, 'R')}${eye(318, 'L')}
    <path d="M270 252 Q262 308 250 328 Q270 340 290 328 Q278 308 270 252" fill="none" stroke="${SKIN_D}" stroke-width="3" stroke-linecap="round"/>
    <path id="crSmile" d="M238 388 Q270 394 302 388" fill="none" stroke="#b0554c" stroke-width="6" stroke-linecap="round"/>
    <g id="crMouthO" style="display:none" transform="translate(270 382) scale(1 0.01) translate(-270 -382)">
      <ellipse cx="270" cy="392" rx="32" ry="24" fill="#5a1f24" stroke="#b0554c" stroke-width="4"/>
      <ellipse cx="270" cy="408" rx="22" ry="9" fill="#d46a70"/>
      <g id="crPalM"><path d="M246 384 Q270 366 294 384 Q270 376 246 384 Z" fill="#c9565c"/><path d="M266 380 Q270 398 274 380 Z" fill="#b0434a"/></g>
    </g>
    <g id="crTongue" transform="translate(270 394) scale(1 0.01) translate(-270 -394)"><path d="M255 394 L285 394 L285 424 Q270 444 255 424 Z" fill="#e0707a" stroke="#b0434a" stroke-width="2"/><line x1="270" y1="396" x2="270" y2="432" stroke="#b0434a" stroke-width="1.6" opacity=".7"/></g>
    <g id="crAroma" opacity="0"><text x="318" y="318" font-size="26">☕</text><path d="M330 300 q-6 -10 0 -20 q6 -10 0 -20" fill="none" stroke="#8a97a6" stroke-width="2" stroke-linecap="round"/></g>
    <circle id="crCot" r="8" fill="#fff" stroke="#9aa8b6" stroke-width="2" opacity="0" transform="translate(150 236)"/>
    <circle id="crTip" r="9" fill="#d9534f" stroke="#fff" stroke-width="2.5" opacity="0"/>
    <path d="M170 252 q-9 4 -12 12 M370 252 q9 4 12 12" fill="none" stroke="${SKIN_D}" stroke-width="1.2" opacity="${old ? '.5' : '0'}"/>
    ${cards}`;
  }

  /* capa anatómica: territorio sensitivo del V (V1-V3) en la hemicara izquierda y ramas motoras del VII en la derecha */
  function nervesAnat() {
    let s = '';
    s += `<path d="M272 122 L335 126 L378 170 L394 250 L350 270 L300 280 L270 300 Z" fill="${DERM[0]}" fill-opacity=".42" stroke="${DERM[0]}" stroke-width="1"/>`;
    s += `<path d="M270 300 L300 280 L350 270 L394 250 L395 300 L380 360 L330 392 L270 398 Z" fill="${DERM[1]}" fill-opacity=".42" stroke="${DERM[1]}" stroke-width="1"/>`;
    s += `<path d="M270 398 L330 392 L380 360 L372 420 L330 452 L270 460 Z" fill="${DERM[2]}" fill-opacity=".42" stroke="${DERM[2]}" stroke-width="1"/>`;
    s += `<ellipse cx="362" cy="258" rx="10" ry="7" fill="${NERV}" stroke="${NERV_D}" stroke-width="1.4"/>`;
    s += nerve([[362, 258], [345, 230], [322, 212]]) + nerve([[362, 258], [356, 300], [344, 334]]) + nerve([[362, 258], [376, 330], [362, 390], [354, 412]]);
    [[322, 212], [344, 334], [354, 412]].forEach(p => { s += `<circle cx="${p[0]}" cy="${p[1]}" r="3.2" fill="${NERV_D}"/>`; });
    s += aLab(404, 196, ['V1 · oftálmica', 'frente, párpado sup.', 'y córnea']) + aLab(404, 334, ['V2 · maxilar', 'mejilla, labio sup.']) + aLab(404, 418, ['V3 · mandibular', 'mentón, labio inf.']);
    s += aLab(376, 246, ['ganglio', 'de Gasser'], 'start', 9.5);
    /* VII: sale por el agujero estilomastoideo, atraviesa la parótida y da 5 ramas */
    s += `<circle cx="150" cy="322" r="3.4" fill="${NERV_D}"/>`;
    s += nerve([[150, 322], [175, 345]], 2.6);
    s += nerve([[175, 345], [165, 300], [185, 236], [206, 202]]) + nerve([[175, 345], [190, 300], [212, 272]]) + nerve([[175, 345], [208, 360], [238, 374]]);
    s += nerve([[175, 345], [190, 395], [232, 410]]) + nerve([[175, 345], [178, 420], [196, 470]]);
    s += aLab(24, 330, 'N. facial (VII)') + leader(100, 326, 148, 322);
    s += aLab(24, 222, 'r. temporal (frontal)') + leader(118, 218, 185, 236);
    s += aLab(24, 246, 'r. cigomática (orbicular)') + leader(130, 242, 190, 300);
    s += aLab(24, 362, 'r. bucal (mejilla, labio sup.)') + leader(150, 358, 208, 360);
    s += aLab(24, 402, 'r. marginal mandibular') + leader(134, 398, 190, 395);
    s += aLab(24, 440, 'r. cervical (platisma)') + leader(126, 436, 178, 420);
    return s;
  }

  /* regiones: cada par aparece en la cara y/o como tarjeta */
  function nerveTools(list, run, extra) {
    const head = list.map(n => `<b>${n.rn} · ${n.name}</b> (${n.kind.toLowerCase()})`).join(' · ');
    const info = (extra ? extra + '<br>' : '') + list.map(n => `<b>${n.rn} · ${n.name}</b> (${n.kind.toLowerCase()}). ${n.fn}`).join('<br>');
    const html = list.map(n => `<b>${n.rn} · ${n.name}.</b> <i>Técnica:</i> ${n.how}<br><i>Hallazgo normal:</i> ${n.normal}`).join('<br><br>');
    return { info, exam: { html, run } };
  }
  const NV = i => NERVES[i - 1];
  const nervRegions = (() => {
    const R = [];
    R.push({ id: 'fI', label: 'Nariz (I par)', short: 'I', cx: 270, cy: 332, r: 16, tools: nerveTools([NV(1)], RUN[1]) });
    ['R', 'L'].forEach(s => {
      const cx = s === 'R' ? 222 : 318;
      R.push({ id: 'f346' + s, label: 'Músculos oculares (III, IV, VI)', short: s === 'R' ? 'III·IV·VI' : '', cx, cy: 262, r: 32, lx: cx, ly: 300, tools: nerveTools([NV(3), NV(4), NV(6)], RUN[3]) });
    });
    ['R', 'L'].forEach(s => {
      const cx = s === 'R' ? 222 : 318;
      R.push({ id: 'f2' + s, label: 'Pupila y retina (II par)', short: s === 'R' ? 'II' : '', cx, cy: 262, r: 9, lx: cx - 6, ly: 232, tools: nerveTools([NV(2)], RUN[2]) });
    });
    ['R', 'L'].forEach(s => {
      const cx = s === 'R' ? 218 : 322;
      R.push({ id: 'fV1' + s, label: 'Frente, V1 (rama oftálmica)', short: s === 'R' ? 'V1' : '', cx, cy: 205, r: 17,
        tools: nerveTools([NV(5)], RUN[5], '<b>V1 (oftálmica)</b>: frente, párpado superior, dorso de la nariz y córnea (reflejo corneal: aferente V1, eferente VII).') });
    });
    ['R', 'L'].forEach(s => {
      const cx = s === 'R' ? 196 : 344;
      R.push({ id: 'fV2' + s, label: 'Mejilla, V2 (rama maxilar)', short: s === 'R' ? 'V2' : '', cx, cy: 335, r: 19,
        tools: nerveTools([NV(5)], RUN[5], '<b>V2 (maxilar)</b>: mejilla, ala de la nariz, labio superior, encía y dientes superiores.') });
    });
    ['R', 'L'].forEach(s => {
      const cx = s === 'R' ? 186 : 354;
      R.push({ id: 'fV3' + s, label: 'Mandíbula, V3 (rama mandibular)', short: s === 'R' ? 'V3' : '', cx, cy: 412, r: 19,
        tools: nerveTools([NV(5)], RUN[5], '<b>V3 (mandibular)</b>: mentón, mandíbula, labio inferior, encía y dientes inferiores y 2/3 anteriores de la lengua; es además la rama motora de los músculos masticadores.') });
    });
    R.push({ id: 'fVIIf', label: 'Frente (VII par)', short: 'VII', cx: 270, cy: 176, r: 15, tools: nerveTools([NV(7)], RUN[7]) });
    R.push({ id: 'fVIIm', label: 'Boca (VII par)', short: '', cx: 270, cy: 388, r: 22, tools: nerveTools([NV(7)], RUN[7]) });
    R.push({ id: 'fXII', label: 'Lengua (XII par)', short: 'XII', cx: 270, cy: 428, r: 13, lx: 305, ly: 440, anchor: 'start', tools: nerveTools([NV(12)], RUN[12]) });
    ['R', 'L'].forEach(s => {
      const cx = s === 'R' ? 145 : 395;
      R.push({ id: 'fVIII' + s, label: 'Oído (VIII par)', short: s === 'R' ? 'VIII' : '', cx, cy: 285, r: 17, lx: cx - 26, anchor: 'end', tools: nerveTools([NV(8)], RUN[8]) });
    });
    R.push({ id: 'fIXX', label: 'Faringe y paladar (IX, X)', short: 'IX·X', cx: 270, cy: 488, r: 20, tools: nerveTools([NV(9), NV(10)], RUN[9]) });
    ['R', 'L'].forEach(s => {
      const cx = s === 'R' ? 232 : 308;
      R.push({ id: 'fXIe' + s, label: 'Esternocleidomastoideo (XI)', short: s === 'R' ? 'XI' : '', cx, cy: 505, r: 13, lx: cx - 22, anchor: 'end', tools: nerveTools([NV(11)], RUN[11]) });
    });
    ['R', 'L'].forEach(s => {
      const cx = s === 'R' ? 150 : 390;
      R.push({ id: 'fXIt' + s, label: 'Trapecio (XI)', short: s === 'R' ? 'XI' : '', cx, cy: 565, r: 22, tools: nerveTools([NV(11)], RUN[11]) });
    });
    NERVES.forEach((n, i) => {
      R.push({ id: 'c' + n.n, label: `${n.rn} · ${n.name}`, short: '', x: CARD_X(i), y: CARD_Y(i), w: CARD_W, h: 84, rx: 10, tools: nerveTools([n], RUN[n.n]) });
    });
    return R;
  })();

  /* ============================================================ 2. MOTOR */
  const MUS = [
    { id: 'del', label: 'Deltoides', x: 236, y: 160, r: 16, man: 'Abducción del brazo a 90° contra la resistencia de la mano del examinador sobre el codo.', root: 'C5 · nervio axilar', limb: 'a',
      lab: 'Deltoides' },
    { id: 'bic', label: 'Bíceps braquial', x: 224, y: 204, r: 11, man: 'Flexión del codo con el antebrazo en supinación; el examinador intenta extender el codo.', root: 'C5-C6 · nervio musculocutáneo', limb: 'a', lab: 'Bíceps' },
    { id: 'tri', label: 'Tríceps braquial (cara posterior)', x: 207, y: 242, r: 11, man: 'Extensión del codo desde la flexión; el examinador empuja el antebrazo para flexionarlo.', root: 'C6-C8 · nervio radial', limb: 'a', lab: 'Tríceps' },
    { id: 'ext', label: 'Extensores de la muñeca', x: 197, y: 304, r: 12, man: 'Extensión de la muñeca con el puño cerrado contra resistencia sobre el dorso de la mano.', root: 'C6-C7 · nervio radial', limb: 'b', lab: 'Ext. muñeca' },
    { id: 'fle', label: 'Flexores de los dedos', x: 187, y: 364, r: 14, man: 'Prensión: "apriete mis dedos" y flexión de las interfalángicas distales contra resistencia (flexor profundo).', root: 'C7-T1 · nervios mediano y cubital', limb: 'b', lab: 'Flexores dedos' },
    { id: 'ili', label: 'Iliopsoas', x: 282, y: 356, r: 13, man: 'Flexión de la cadera (en decúbito o sentado) elevando el muslo contra la resistencia de la mano sobre la rodilla.', root: 'L1-L3 · plexo lumbar y nervio femoral', limb: 'c', lab: 'Iliopsoas' },
    { id: 'cua', label: 'Cuádriceps', x: 277, y: 418, r: 18, man: 'Extensión de la rodilla desde 90° de flexión (sentado) contra resistencia sobre la pierna.', root: 'L2-L4 · nervio femoral', limb: 'c', lab: 'Cuádriceps' },
    { id: 'gas', label: 'Gastrocnemio (flexión plantar)', x: 262, y: 492, r: 12, man: 'Flexión plantar del pie contra resistencia; en la práctica, ponerse en puntas de pie sobre un pie (10-20 repeticiones).', root: 'S1-S2 · nervio tibial', limb: 'd', lab: 'Gastrocnemio' },
    { id: 'tib', label: 'Tibial anterior', x: 275, y: 536, r: 12, man: 'Dorsiflexión del pie contra resistencia (caminar sobre los talones).', root: 'L4-L5 · nervio peroneo profundo', limb: 'd', lab: 'Tibial anterior' }
  ];
  const TONE = {
    a: '<i>Técnica:</i> motilidad pasiva del hombro y del codo con el paciente relajado (flexo-extensión, balanceo del brazo). <i>Hallazgo normal:</i> resistencia <b>mínima y uniforme</b> en todo el recorrido, sin rigidez ("rueda dentada") ni espasticidad ("navaja"); al soltarlo, el miembro cae y se balancea libremente.',
    b: '<i>Técnica:</i> flexo-extensión pasiva de la muñeca y los dedos y sacudida de la mano. <i>Hallazgo normal:</i> resistencia mínima y uniforme; la muñeca oscila con soltura. Tono normal (eutonía).',
    c: '<i>Técnica:</i> motilidad pasiva de cadera y rodilla (rodar el muslo, levantar y soltar la rodilla flexionada, prueba del péndulo de la pierna). <i>Hallazgo normal:</i> resistencia mínima y uniforme, sin rigidez ni espasticidad; el talón se levanta y cae con facilidad.',
    d: '<i>Técnica:</i> dorsiflexión y flexión plantar pasivas del pie, incluida una dorsiflexión brusca. <i>Hallazgo normal:</i> resistencia suave y uniforme, sin rigidez ni clonus.'
  };
  const TROPH = {
    a: '<i>Técnica:</i> inspección y palpación comparativa de hombro y brazo; perímetro braquial a 10 cm del olécranon. <i>Hallazgo normal:</i> volumen y contorno <b>simétricos</b>; sin atrofia, hipertrofia ni <b>fasciculaciones</b>; diferencia de perímetro entre ambos lados &lt; 1 cm.',
    b: '<i>Técnica:</i> inspección de antebrazo y mano (eminencias tenar e hipotenar, espacios interóseos). <i>Hallazgo normal:</i> masa muscular conservada y simétrica, sin atrofia ni fasciculaciones.',
    c: '<i>Técnica:</i> inspección del muslo y perímetro a 15 cm del borde superior de la rótula. <i>Hallazgo normal:</i> volumen simétrico, sin atrofia ni fasciculaciones; diferencia entre ambos muslos ≤ 1-2 cm (según la fuente).',
    d: '<i>Técnica:</i> inspección de la pantorrilla y del compartimento anterior de la pierna; perímetro máximo de la pantorrilla. <i>Hallazgo normal:</i> simétricas, sin atrofia ni fasciculaciones; diferencia ≤ 1-2 cm.'
  };
  function motorSvg(learn, c) {
    const rows = [['5', 'Normal: vence la resistencia máxima'], ['4', 'Vence gravedad y resistencia parcial'], ['3', 'Vence la gravedad, no la resistencia'],
      ['2', 'Movimiento solo sin gravedad'], ['1', 'Contracción visible, sin movimiento'], ['0', 'Sin contracción']];
    return `
    <rect width="820" height="620" fill="#e8eef4"/>
    ${bodyFront(c)}
    <text x="300" y="20" text-anchor="middle" class="svg-title">Persona examinada (vista anterior)</text>
    <text x="670" y="34" text-anchor="middle" class="svg-title">Escala de fuerza 0-5 (MRC)</text>
    ${rows.map((r, i) => `<g id="crMrc${r[0]}"><rect x="530" y="${50 + i * 62}" width="280" height="54" rx="10" fill="#fff" stroke="#c9d3dd" stroke-width="2"/>
      <text x="548" y="${88 + i * 62}" font-family="system-ui,sans-serif" font-size="26" font-weight="700" fill="${r[0] === '5' ? '#237a4b' : '#7b8a99'}">${r[0]}</text>
      <text x="580" y="${74 + i * 62}" font-family="system-ui,sans-serif" font-size="12" fill="#38495a">${r[1]}</text>
      <text x="580" y="${92 + i * 62}" font-family="system-ui,sans-serif" font-size="10.5" fill="#55677a">${['Valor esperado en esta persona', '4-, 4 y 4+ según la resistencia', '', '', '', ''][i]}</text></g>`).join('')}
    <text x="670" y="440" text-anchor="middle" class="svg-small">Motilidad activa y fuerza (5/5), tono</text>
    <text x="670" y="458" text-anchor="middle" class="svg-small">(motilidad pasiva) y trofismo:</text>
    <text x="670" y="476" text-anchor="middle" class="svg-small">compara siempre ambos lados.</text>`;
  }
  /* capa anatómica: músculos explorados (vientre fusiforme), plexos y nervios; rótulos con raíz y nervio en el hemicuerpo izquierdo */
  function motorAnat() {
    let s = '';
    [0, 1].forEach(i => {
      const X = x => (i ? mirror(x) : x), R = i ? -1 : 1;
      s += nerve([[X(292), 140], [X(252), 168]], 2.6);                                 // plexo braquial
      s += nerve([[X(252), 168], [X(240), 162]]) + nerve([[X(252), 168], [X(228), 210]]);  // axilar, musculocutáneo
      s += nerve([[X(250), 170], [X(214), 236], [X(200), 296]]);                       // radial
      s += nerve([[X(252), 172], [X(218), 250], [X(204), 320], [X(190), 358]]);        // mediano y cubital
      s += nerve([[X(300), 330], [X(288), 350], [X(278), 406]]);                       // femoral
      s += nerve([[X(296), 342], [X(278), 400], [X(268), 470], [X(262), 500]], 2.6);   // ciático → tibial
      s += nerve([[X(268), 470], [X(278), 514]]);                                      // peroneo
      s += musc(X(238), 166, 13, 20, R * 20) + musc(X(224), 222, 9, 28, R * 18) + musc(X(207), 240, 8, 22, R * 18);
      s += musc(X(198), 300, 7, 30, R * 10) + musc(X(206), 314, 6, 26, R * 10);
      s += musc(X(284), 352, 8, 18, R * -12) + musc(X(277), 410, 13, 42, R * 4) + musc(X(261), 500, 7, 30, R * 3) + musc(X(277), 515, 6, 36, R * 3);
    });
    s += aLab(330, 132, 'plexo braquial (C5-T1)');
    s += aLab(386, 160, ['Deltoides · C5', 'n. axilar']) + aLab(392, 210, ['Bíceps · C5-C6', 'n. musculocutáneo']) + aLab(408, 248, ['Tríceps · C6-C8', 'n. radial']);
    s += aLab(418, 300, ['Ext. muñeca · C6-C7', 'n. radial']) + aLab(418, 340, ['Flexores · C7-T1', 'n. mediano y cubital']);
    s += aLab(336, 348, ['Iliopsoas · L1-L3', 'n. femoral']) + aLab(342, 406, ['Cuádriceps · L2-L4', 'n. femoral']);
    s += aLab(352, 486, ['Gastrocnemio · S1-S2', 'n. tibial']) + aLab(338, 530, ['Tibial anterior · L4-L5', 'n. peroneo profundo']);
    return s;
  }
  const strengthRun = m => ctx => {
    popText(ctx.svg, ctx.point, '5/5');
    const g = $q(ctx.svg, 'crMrc5'); if (!g) return;
    const r = g.querySelector('rect');
    tween(1600, u => r.setAttribute('fill', u < .85 ? (u % .3 < .15 ? '#e3f4ea' : '#fff') : '#fff'), () => r.setAttribute('fill', '#fff'));
  };
  const motorRegions = (() => {
    const R = [];
    ['R', 'L'].forEach(s => {
      MUS.forEach(m => {
        const x = s === 'R' ? m.x : mirror(m.x);
        const side = s === 'R' ? 'derecho' : 'izquierdo';
        R.push({
          id: m.id + s, label: `${m.label} (${side})`, short: s === 'R' ? m.lab : '', cx: x, cy: m.y, r: m.r, anchor: 'end', lx: x - m.r - 6, ly: m.y + 4,
          tools: {
            strength: { html: `<i>Técnica:</i> ${m.man} <i>Hallazgo normal:</i> motilidad activa completa y <b>fuerza 5/5</b> (vence la gravedad y la resistencia máxima del examinador), simétrica con el lado contrario. Raíz y nervio: ${m.root}.`, run: strengthRun(m) },
            tone: TONE[m.limb],
            trophy: TROPH[m.limb]
          }
        });
      });
    });
    return R;
  })();

  /* ============================================================ 3. CEREBELO */
  const IKSEG = (S, T, L1, L2, sign) => {
    const dx = T.x - S.x, dy = T.y - S.y, d = Math.min(Math.hypot(dx, dy), L1 + L2 - 0.5);
    const a = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const ang = Math.atan2(dy, dx) + sign * a;
    return { x: S.x + L1 * Math.cos(ang), y: S.y + L1 * Math.sin(ang) };
  };
  const pathOf = pts => 'M' + pts.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L');
  function handShape(face) {
    return `<ellipse cx="0" cy="18" rx="30" ry="40" fill="${face ? '#f6d3b3' : '#e8b890'}" stroke="${SKIN_D}" stroke-width="3"/>
      ${[-22, -8, 7, 21].map((x, i) => `<rect x="${x - 6}" y="${-52 + Math.abs(i - 1.5) * 8}" width="12" height="46" rx="6" fill="${face ? '#f6d3b3' : '#e8b890'}" stroke="${SKIN_D}" stroke-width="2.4"/>`).join('')}
      <rect x="-48" y="-2" width="22" height="12" rx="6" transform="rotate(-30 -34 8)" fill="${face ? '#f6d3b3' : '#e8b890'}" stroke="${SKIN_D}" stroke-width="2.4"/>
      ${face ? '<path d="M-14 22 Q0 30 14 22 M-16 38 Q0 46 16 38" fill="none" stroke="#c99a76" stroke-width="2"/>' : [-22, -8, 7, 21].map(x => `<circle cx="${x}" cy="-8" r="3.4" fill="#d9a07a"/>`).join('')}`;
  }
  const A_S = { x: 190, y: 215 }, A_N = { x: 238, y: 141 }, A_T = { x: 395, y: 160 };
  const L1A = 118, L2A = 126;
  function setArmA(svg, tip) {
    const e = IKSEG(A_S, tip, L1A, L2A, 1);
    const p = pathOf([A_S, e, tip]);
    const o = $q(svg, 'crArmO'), f = $q(svg, 'crArmF'), h = $q(svg, 'crArmH');
    if (o) { o.setAttribute('d', p); f.setAttribute('d', p); h.setAttribute('cx', tip.x); h.setAttribute('cy', tip.y); }
  }
  const runFN = ctx => {
    const svg = ctx.svg, cyc = [A_N, A_T, A_N, A_T, A_N];
    play(7000, u => {
      const s = u * (cyc.length - 1), i = Math.min(cyc.length - 2, Math.floor(s)), f = smooth(Math.min(1, (s - i) * 1.25));
      setArmA(svg, { x: lerp(cyc[i].x, cyc[i + 1].x, f), y: lerp(cyc[i].y, cyc[i + 1].y, f) - 14 * Math.sin(Math.PI * f) * 0 });
    }, () => setArmA(svg, A_N));
    ctx.sh.say('Toco mi nariz y su dedo, cada vez más rápido', 'yes', 3000);
  };
  const runDia = ctx => {
    const svg = ctx.svg;
    play(5000, u => {
      const ph = u * 5 * 2 * Math.PI * 1.1;  // ≈ 2-3 alternancias por segundo
      ['crHandA', 'crHandB'].forEach((id, k) => {
        const g = $q(svg, id), th = ph + (k ? Math.PI * 0.0 : 0), cs = Math.cos(th);
        const cx = k ? 735 : 595;
        g.setAttribute('transform', `translate(${cx} 190) scale(${Math.abs(cs) < 0.08 ? 0.08 * Math.sign(cs || 1) : cs} 1)`);
        g.querySelector('.hP').style.display = cs >= 0 ? '' : 'none';
        g.querySelector('.hD').style.display = cs >= 0 ? 'none' : '';
      });
    }, () => {
      ['crHandA', 'crHandB'].forEach((id, k) => { const g = $q(svg, id); g.setAttribute('transform', `translate(${k ? 735 : 595} 190)`); g.querySelector('.hP').style.display = ''; g.querySelector('.hD').style.display = 'none'; });
    });
    ctx.sh.say('Palma, dorso, palma, dorso… (rápido y regular)', 'yes', 3000);
  };
  const C_H = { x: 300, y: 508 }, L1C = 100, L2C = 100;
  function setLegC(svg, heel) {
    const k = IKSEG(C_H, heel, L1C, L2C, -1);
    const p = pathOf([C_H, k, heel]);
    ['crLegO', 'crLegF'].forEach(id => { const e = $q(svg, id); if (e) e.setAttribute('d', p); });
    const ft = $q(svg, 'crLegFt'); if (ft) { ft.setAttribute('cx', heel.x + 4); ft.setAttribute('cy', heel.y - 12); }
  }
  const runHeel = ctx => {
    const svg = ctx.svg, K = { x: 400, y: 486 }, Ak = { x: 495, y: 487 }, rest = { x: 492, y: 500 };
    const pts = [rest, K, Ak, K, Ak, rest];
    play(7600, u => {
      const s = u * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(s)), f = smooth(s - i);
      const lift = (i === 0 || i === pts.length - 2) ? 28 * Math.sin(Math.PI * f) : 0;
      setLegC(svg, { x: lerp(pts[i].x, pts[i + 1].x, f), y: lerp(pts[i].y, pts[i + 1].y, f) - lift });
    }, () => setLegC(svg, rest));
    ctx.sh.say('Llevo el talón a la rodilla y lo deslizo por la espinilla', 'yes', 3200);
  };
  function cerebSvg(learn, c) {
    const hair = hairOf(c);
    return `
    <rect width="820" height="600" fill="#e8eef4"/>
    <rect x="10" y="28" width="470" height="288" rx="12" fill="#f4f7fa" stroke="#c9d3dd" stroke-width="2"/>
    <rect x="500" y="28" width="310" height="288" rx="12" fill="#f4f7fa" stroke="#c9d3dd" stroke-width="2"/>
    <rect x="10" y="342" width="800" height="250" rx="12" fill="#f4f7fa" stroke="#c9d3dd" stroke-width="2"/>
    <text x="245" y="20" text-anchor="middle" class="svg-title">Prueba índice-nariz</text>
    <text x="655" y="20" text-anchor="middle" class="svg-title">Diadococinesia</text>
    <text x="410" y="336" text-anchor="middle" class="svg-title">Prueba talón-rodilla</text>
    <!-- paciente de perfil -->
    <path d="M155 192 L225 192 L232 316 L150 316 Z" fill="${SLEEVE}" stroke="${SLEEVE_D}" stroke-width="3"/>
    <rect x="178" y="170" width="26" height="28" rx="9" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3"/>
    <ellipse cx="192" cy="125" rx="38" ry="46" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3"/>
    <path d="M154 120 C150 70 222 70 230 112 C216 96 176 96 154 120 Z" fill="${hair}"/>
    <path d="M226 130 L246 146 L227 152 Z" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="217" cy="118" r="2.8" fill="#333"/>
    <!-- dedo del examinador -->
    <path d="M474 200 L440 170" stroke="${SKIN_D}" stroke-width="30" stroke-linecap="round"/><path d="M474 200 L440 170" stroke="#f6d3b3" stroke-width="25" stroke-linecap="round"/>
    <path d="M440 170 L${A_T.x + 8} ${A_T.y}" stroke="${SKIN_D}" stroke-width="20" stroke-linecap="round"/><path d="M440 170 L${A_T.x + 8} ${A_T.y}" stroke="#f6d3b3" stroke-width="15" stroke-linecap="round"/>
    <text x="400" y="240" text-anchor="middle" class="svg-small">Dedo del examinador</text>
    <!-- brazo del paciente -->
    <path id="crArmO" d="" fill="none" stroke="${SKIN_D}" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
    <path id="crArmF" d="" fill="none" stroke="${SKIN}" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
    <circle id="crArmH" cx="0" cy="0" r="11" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="2.5"/>
    <path d="M168 200 L190 214" stroke="${SLEEVE_D}" stroke-width="2"/>
    <!-- diadococinesia -->
    <rect x="520" y="256" width="270" height="44" rx="10" fill="#8fa6bb" opacity=".55"/>
    <text x="655" y="284" text-anchor="middle" class="svg-small">Muslos (manos apoyadas)</text>
    ${[595, 735].map((cx, k) => `<g id="crHand${k ? 'B' : 'A'}" transform="translate(${cx} 190)"><g class="hP">${handShape(true)}</g><g class="hD" style="display:none">${handShape(false)}</g></g>`).join('')}
    <!-- talón-rodilla -->
    <rect x="30" y="548" width="760" height="22" rx="6" fill="#b9c6d4"/>
    <ellipse cx="86" cy="520" rx="46" ry="14" fill="#fff" stroke="#c9d3dd" stroke-width="2"/>
    <circle cx="88" cy="498" r="30" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3"/>
    <path d="M58 504 C56 474 74 470 84 472 C72 482 70 494 72 520 C64 518 59 512 58 504 Z" fill="${hair}"/>
    <path d="M82 469 L94 469 L88 456 Z" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="78" cy="490" r="2.4" fill="#333"/>
    <rect x="124" y="484" width="190" height="56" rx="24" fill="${SLEEVE}" stroke="${SLEEVE_D}" stroke-width="3"/>
    <line x1="300" y1="522" x2="400" y2="522" stroke="${PANTS_D}" stroke-width="40" stroke-linecap="round"/><line x1="300" y1="522" x2="400" y2="522" stroke="${PANTS}" stroke-width="34" stroke-linecap="round"/>
    <line x1="402" y1="524" x2="498" y2="525" stroke="${SKIN_D}" stroke-width="28" stroke-linecap="round"/><line x1="402" y1="524" x2="498" y2="525" stroke="${SKIN}" stroke-width="22" stroke-linecap="round"/>
    <ellipse cx="506" cy="508" rx="12" ry="26" transform="rotate(-8 506 508)" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="2.5"/>
    <path id="crLegO" d="" fill="none" stroke="${SKIN_D}" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/>
    <path id="crLegF" d="" fill="none" stroke="${SKIN}" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
    <ellipse id="crLegFt" cx="0" cy="0" rx="11" ry="22" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="2.5"/>
    <text x="540" y="400" class="svg-small">Decúbito dorsal: el talón sube a la</text>
    <text x="540" y="418" class="svg-small">rodilla contraria y baja por la tibia.</text>`;
  }
  const cerebLook = '<i>Técnica:</i> observación en reposo, sentado y de pie (taxia estática: ver Romberg en «Marcha y equilibrio»). <i>Hallazgo normal:</i> sin temblor ni movimientos anormales, sin nistagmo, con postura y tono normales.';
  const cerebRegions = [
    { id: 'fn', label: 'Prueba índice-nariz', short: 'Índice-nariz', x: 20, y: 36, w: 450, h: 272, rx: 12, lx: 245, ly: 56,
      tools: {
        do: { html: '<i>Técnica:</i> con los ojos abiertos y luego cerrados, el paciente toca alternadamente la punta de su nariz y el dedo del examinador (que cambia de sitio), cada vez más rápido. <i>Hallazgo normal:</i> trayectoria <b>suave y precisa</b>, llega al blanco sin pasarse ni quedarse corto (<b>sin dismetría</b>), sin <b>temblor intencional</b> ni descomposición del movimiento; igual en ambos lados.', run: runFN },
        look: cerebLook
      } },
    { id: 'dia', label: 'Diadococinesia', short: 'Diadococinesia', x: 510, y: 36, w: 290, h: 272, rx: 12, lx: 655, ly: 56,
      tools: {
        do: { html: '<i>Técnica:</i> pronación y supinación alternadas y rápidas de las manos sobre los muslos (prueba de las marionetas). <i>Hallazgo normal:</i> movimiento <b>regular, rítmico y de amplitud constante</b>, sin enlentecimiento; la mano dominante es algo más rápida. Sin adiadococinesia.', run: runDia },
        look: cerebLook
      } },
    { id: 'heel', label: 'Prueba talón-rodilla', short: 'Talón-rodilla', x: 20, y: 350, w: 780, h: 234, rx: 12, lx: 410, ly: 370,
      tools: {
        do: { html: '<i>Técnica:</i> en decúbito dorsal, el paciente lleva el talón de un pie a la rodilla contraria y lo desliza por la cresta tibial hasta el tobillo y de vuelta, con los ojos abiertos y cerrados. <i>Hallazgo normal:</i> movimiento <b>fluido</b>, el talón <b>permanece sobre la tibia</b> sin oscilar ni descomponerse; igual en ambos lados.', run: runHeel },
        look: cerebLook
      } }
  ];
  function cerebAfter(stage, sh, ctx) { setArmA(ctx.svg, A_N); setLegC(ctx.svg, { x: 492, y: 500 }); }

  /* ============================================================ 4. EQUILIBRIO Y MARCHA */
  function frontFigure(c, sway, eyesClosed) {
    const hair = hairOf(c), X = 410 + sway;
    return `<g>
      <line x1="${X - 9}" y1="318" x2="${X - 9}" y2="446" stroke="${PANTS_D}" stroke-width="30" stroke-linecap="round"/><line x1="${X - 9}" y1="318" x2="${X - 9}" y2="446" stroke="${PANTS}" stroke-width="24" stroke-linecap="round"/>
      <line x1="${X + 9}" y1="318" x2="${X + 9}" y2="446" stroke="${PANTS_D}" stroke-width="30" stroke-linecap="round"/><line x1="${X + 9}" y1="318" x2="${X + 9}" y2="446" stroke="${PANTS}" stroke-width="24" stroke-linecap="round"/>
      <ellipse cx="${X - 12}" cy="452" rx="20" ry="9" fill="#555"/><ellipse cx="${X + 12}" cy="452" rx="20" ry="9" fill="#555"/>
      <path d="M${X - 46} 178 Q${X} 166 ${X + 46} 178 L${X + 38} 322 L${X - 38} 322 Z" fill="${SLEEVE}" stroke="${SLEEVE_D}" stroke-width="3"/>
      ${limb(X - 48, 184, X - 60, 262, 22, SLEEVE, SLEEVE_D)}${limb(X - 60, 262, X - 62, 322, 18, SKIN, SKIN_D)}
      ${limb(X + 48, 184, X + 60, 262, 22, SLEEVE, SLEEVE_D)}${limb(X + 60, 262, X + 62, 322, 18, SKIN, SKIN_D)}
      <rect x="${X - 9}" y="150" width="18" height="26" rx="7" fill="${SKIN}"/>
      <ellipse cx="${X}" cy="130" rx="25" ry="31" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3"/>
      <path d="M${X - 25} 124 C${X - 28} 92 ${X + 28} 92 ${X + 25} 124 C${X + 14} 108 ${X - 14} 108 ${X - 25} 124 Z" fill="${hair}"/>
      ${eyesClosed ? `<path d="M${X - 14} 130 q5 4 10 0 M${X + 4} 130 q5 4 10 0" fill="none" stroke="#333" stroke-width="2.4" stroke-linecap="round"/>` : `<circle cx="${X - 9}" cy="130" r="2.8" fill="#333"/><circle cx="${X + 9}" cy="130" r="2.8" fill="#333"/>`}
      <path d="M${X - 8} 146 Q${X} 151 ${X + 8} 146" fill="none" stroke="#a5574d" stroke-width="2.4" stroke-linecap="round"/>
    </g>`;
  }
  function sideFigure(c, t, mode) {
    const hair = hairOf(c);
    const tandem = mode === 'tandem', heels = mode === 'heels', toes = mode === 'toes';
    const f = tandem ? 0.75 : 0.9;                   // frecuencia de ciclo (pasos/2 por segundo)
    const A = tandem ? 0.3 : toes ? 0.36 : 0.46;     // amplitud del muslo (rad)
    const psi = 2 * Math.PI * f * t;
    const lift = toes ? 20 : 0;
    const H = { x: 410, y: 258 - lift + 3 * Math.abs(Math.sin(psi)) };
    const T1 = 92, T2 = 92;
    const leg = k => {
      const p = psi + k * Math.PI;
      const th = A * Math.sin(p);
      const kappa = (6 + 56 * Math.pow(Math.max(0, Math.cos(p + 0.5)), 1.5)) * DEG * (tandem ? 0.7 : 1);
      const kn = { x: H.x + T1 * Math.sin(th), y: H.y + T1 * Math.cos(th) };
      const sa = th - kappa;
      const an = { x: kn.x + T2 * Math.sin(sa), y: kn.y + T2 * Math.cos(sa) };
      const fa = heels ? -0.5 : toes ? 0.75 : 0.12 + 0.5 * sa;
      const toe = { x: an.x + 34 * Math.cos(fa), y: an.y + 34 * Math.sin(fa) + 6 };
      return { kn, an, toe };
    };
    const drawLeg = (L, col, colD) => limb(H.x, H.y, L.kn.x, L.kn.y, 30, col, colD) + limb(L.kn.x, L.kn.y, L.an.x, L.an.y, 26, col, colD) +
      `<line x1="${L.an.x}" y1="${L.an.y + 2}" x2="${L.toe.x}" y2="${L.toe.y}" stroke="#333" stroke-width="13" stroke-linecap="round"/>`;
    const L0 = leg(0), L1 = leg(1);
    const arm = k => {
      const a = -0.5 * Math.sin(psi + k * Math.PI) * (tandem ? 0.5 : 1);
      const S = { x: H.x, y: H.y - 78 };
      const E = { x: S.x + 54 * Math.sin(a), y: S.y + 54 * Math.cos(a) };
      const W = { x: E.x + 52 * Math.sin(a + 0.3 + (a > 0 ? 0.25 : 0)), y: E.y + 52 * Math.cos(a + 0.3 + (a > 0 ? 0.25 : 0)) };
      return limb(S.x, S.y, E.x, E.y, 22, SLEEVE, SLEEVE_D) + limb(E.x, E.y, W.x, W.y, 18, SKIN, SKIN_D);
    };
    return `<g>
      ${arm(1)}${drawLeg(L1, '#7a93ad', '#5a7088')}
      <path d="M${H.x - 28} ${H.y - 100} L${H.x + 28} ${H.y - 100} L${H.x + 24} ${H.y + 6} L${H.x - 24} ${H.y + 6} Z" fill="${SLEEVE}" stroke="${SLEEVE_D}" stroke-width="3" stroke-linejoin="round"/>
      <rect x="${H.x - 8}" y="${H.y - 122}" width="16" height="26" rx="6" fill="${SKIN}"/>
      <ellipse cx="${H.x + 2}" cy="${H.y - 146}" rx="24" ry="29" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3"/>
      <path d="M${H.x - 22} ${H.y - 150} C${H.x - 24} ${H.y - 182} ${H.x + 28} ${H.y - 182} ${H.x + 26} ${H.y - 150} C${H.x + 12} ${H.y - 166} ${H.x - 10} ${H.y - 166} ${H.x - 22} ${H.y - 150} Z" fill="${hair}"/>
      <path d="M${H.x + 26} ${H.y - 146} l10 8 l-10 4 z" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="2"/>
      <circle cx="${H.x + 14}" cy="${H.y - 150}" r="2.6" fill="#333"/>
      ${drawLeg(L0, PANTS, PANTS_D)}${arm(0)}
    </g>`;
  }
  function gaitSvg(learn, c) {
    return `
    <rect width="820" height="520" fill="#e8eef4"/>
    <text x="410" y="40" text-anchor="middle" class="svg-title" id="crGLbl">Elige una prueba y haz clic sobre la persona</text>
    <rect x="30" y="456" width="760" height="10" rx="5" fill="#cfd8e2"/>
    <g id="crTicks"></g>
    <g id="crFig">${frontFigure(c, 0, false)}</g>`;
  }
  const GDEF = {
    romberg: { title: 'Romberg: pies juntos, brazos a los lados' },
    gait: { title: 'Marcha libre' }, tandem: { title: 'Marcha en tándem (talón-punta)' }, heels: { title: 'Marcha sobre talones' }, toes: { title: 'Marcha en puntas de pie' }
  };
  function runRomberg(ctx) {
    const svg = ctx.svg, c = ctx.c, fig = $q(svg, 'crFig'), lbl = $q(svg, 'crGLbl');
    $q(svg, 'crTicks').innerHTML = '';
    play(9000, u => {
      const t = u * 9, closed = t > 4;
      const amp = closed ? 2.2 : 1.2;
      fig.innerHTML = frontFigure(c, amp * Math.sin(2 * Math.PI * 0.55 * t) + 0.6 * Math.sin(2 * Math.PI * 1.3 * t), closed);
      lbl.textContent = closed ? 'Romberg: ojos CERRADOS (se mantiene estable)' : 'Romberg: ojos ABIERTOS (30 s)';
    }, () => { lbl.textContent = 'Romberg negativo: sin caída ni oscilación apreciable'; });
  }
  function runGait(mode) {
    const svgRun = runGaitSvg(mode);
    /* la marcha libre se muestra con el maniquí 3D (js/gait3d.js); si no hay WebGL se usa el dibujo SVG */
    if (mode !== 'gait') return svgRun;
    return ctx => {
      if (!window.Gait3D) return svgRun(ctx);
      Gait3D.show(ctx.svg.parentElement, 'normal').then(ok => { if (!ok) svgRun(ctx); });
    };
  }
  function runGaitSvg(mode) {
    return ctx => {
      const svg = ctx.svg, c = ctx.c, fig = $q(svg, 'crFig'), lbl = $q(svg, 'crGLbl'), tk = $q(svg, 'crTicks');
      const speed = mode === 'tandem' ? 90 : mode === 'toes' ? 150 : mode === 'heels' ? 160 : (ageOld(c) ? 210 : 250);
      let marks = '';
      for (let i = 0; i < 30; i++) marks += mode === 'tandem'
        ? `<rect x="${40 + i * 64}" y="451" width="30" height="8" rx="3" fill="#c0392b"/>`
        : `<line x1="${40 + i * 90}" y1="466" x2="${40 + i * 90}" y2="478" stroke="#9aa8b6" stroke-width="3"/>`;
      tk.innerHTML = marks;
      lbl.textContent = GDEF[mode].title;
      const dur = 7000;
      play(dur, u => {
        const t = u * dur / 1000;
        fig.innerHTML = sideFigure(c, t, mode);
        const off = -((t * speed) % (mode === 'tandem' ? 64 : 90));
        tk.setAttribute('transform', `translate(${off.toFixed(1)} 0)`);
      }, () => {
        fig.innerHTML = frontFigure(c, 0, false); tk.innerHTML = '';
        lbl.textContent = 'Prueba completada: ' + GDEF[mode].title.toLowerCase();
      });
    };
  }
  const gaitRegions = [
    { id: 'pers', label: 'Persona examinada', short: 'Persona', x: 300, y: 80, w: 220, h: 390, rx: 18, lx: 410, ly: 96,
      tools: {
        romberg: { html: '<i>Técnica (taxia estática):</i> de pie, pies juntos y brazos a los lados, 30 s con los ojos abiertos y luego cerrados; el examinador se mantiene cerca para sujetarlo. <i>Hallazgo normal:</i> <b>Romberg negativo</b>, mantiene la postura sin caer ni oscilar de forma apreciable (propiocepción y función vestibular conservadas).', run: runRomberg },
        gait: c => ({ html: `<i>Técnica:</i> se observa caminar ida y vuelta, de frente y de perfil, con y sin calzado. <i>Hallazgo normal:</i> marcha eubásica: base de sustentación de 5-10 cm, paso de ≈ 60-75 cm, cadencia de 100-120 pasos/min (velocidad ≈ ${elder(c) ? '1,0-1,2' : '1,2-1,4'} m/s), braceo simétrico, cabeza y tronco erguidos, apoyo del talón y despegue de la punta bien marcados y giro sin vacilación.`, run: runGait('gait') }),
        tandem: { html: '<i>Técnica:</i> marcha en tándem, talón con punta en línea recta, unos 10 pasos. <i>Hallazgo normal:</i> la realiza <b>sin separarse de la línea ni balancearse</b> (en mayores de 70 años puede haber una ligera oscilación). Es sensible para la ataxia de línea media (vermis cerebeloso).', run: runGait('tandem') },
        heels: { html: '<i>Técnica:</i> caminar sobre los talones (dorsiflexión, L4-L5). <i>Hallazgo normal:</i> varios pasos con las puntas elevadas, sin que caigan.', run: runGait('heels') },
        toes: { html: '<i>Técnica:</i> caminar en puntas de pie (flexión plantar, S1). <i>Hallazgo normal:</i> varios pasos sin que descienda el talón ni pierda el equilibrio.', run: runGait('toes') }
      } }
  ];

  /* ============================================================ 5. SENSIBILIDAD */
  const SENS = [
    { id: 'face', label: 'Cara (V1, V2, V3)', x: 300, y: 76, r: 28, both: false, lab: 'Cara (V1-V3)' },
    { id: 'neck', label: 'Cuello y hombro (C3-C4)', x: 262, y: 138, r: 13, lab: 'C3-C4' },
    { id: 'arm', label: 'Cara lateral del brazo (C5)', x: 226, y: 196, r: 14, lab: 'C5' },
    { id: 'fore', label: 'Antebrazo (C6 lateral, T1 medial)', x: 205, y: 288, r: 14, lab: 'C6-T1' },
    { id: 'hand', label: 'Mano (C6 pulgar, C7 medio, C8 meñique)', x: 187, y: 364, r: 15, lab: 'C6-C8' },
    { id: 'chest', label: 'Tórax (T4 a nivel del pezón)', x: 268, y: 190, r: 14, lab: 'T4', up: true },
    { id: 'abd', label: 'Abdomen (T10 a nivel del ombligo)', x: 272, y: 270, r: 14, lab: 'T10' },
    { id: 'thigh', label: 'Muslo anterior (L2-L3)', x: 276, y: 420, r: 17, lab: 'L2-L3' },
    { id: 'leg', label: 'Pierna (L4 medial, L5 lateral)', x: 268, y: 518, r: 14, lab: 'L4-L5' },
    { id: 'foot', label: 'Pie (L5 dorso, S1 borde lateral)', x: 260, y: 596, r: 15, lab: 'S1' }
  ];
  const SENS_TXT = {
    touch: z => `<i>Técnica:</i> sensibilidad <b>táctil</b> con un algodón, con los ojos cerrados, comparando zonas homólogas. <i>Hallazgo normal:</i> percibe cada roce y lo localiza correctamente, de forma simétrica. Territorio: ${z}.`,
    pain: z => `<i>Técnica:</i> sensibilidad <b>dolorosa</b> con un alfiler, alternando punta y cabeza. <i>Hallazgo normal:</i> distingue "punzante" de "romo" sin errores y de forma simétrica. Territorio: ${z}.`,
    temp: z => `<i>Técnica:</i> sensibilidad <b>térmica</b> con dos tubos, uno con agua fría y otro con agua tibia. <i>Hallazgo normal:</i> identifica frío y calor con igual percepción en ambos lados. Territorio: ${z}.`,
    bar: z => `<i>Técnica:</i> <b>barestesia</b> (sensibilidad a la presión): se presiona con el pulpejo del dedo o con un objeto romo las masas musculares o la piel con distinta intensidad. <i>Hallazgo normal:</i> percibe la presión, la distingue del tacto y reconoce intensidades diferentes, de forma simétrica. Territorio: ${z}.`
  };
  const sensRun = (kind, snd) => ctx => {
    instrument(ctx.svg, ctx.point, kind);
    if (snd) { try { Sound.beep(128, 1.2, 0.14); } catch (e) { /* noop */ } }
  };
  function sensTools(z) {
    const T = {};
    T.touch = { html: SENS_TXT.touch(z.label), run: sensRun('cotton') };
    T.pain = { html: SENS_TXT.pain(z.label), run: sensRun('pin') };
    T.temp = { html: SENS_TXT.temp(z.label), run: sensRun('cold') };
    T.bar = { html: SENS_TXT.bar(z.label), run: ctx => popText(ctx.svg, ctx.point, '👆', '#38495a') };
    if (['neck', 'arm', 'fore', 'hand', 'thigh', 'leg', 'foot'].includes(z.id)) {
      T.vib = c => ({ html: `<i>Técnica:</i> <b>palestesia</b> (sensibilidad vibratoria) con el diapasón de 128 Hz sobre ${z.id === 'foot' ? 'la interfalángica del hallux y el maléolo' : z.id === 'hand' ? 'la interfalángica distal del índice y la apófisis estiloides' : z.id === 'leg' ? 'la tuberosidad tibial y el maléolo' : 'una prominencia ósea cercana'}; el paciente avisa cuándo deja de sentirla. <i>Hallazgo normal:</i> percibe la vibración un tiempo similar al del examinador y simétrico.${elder(c) && ['foot', 'leg'].includes(z.id) ? ' En el adulto mayor puede estar <b>ligeramente disminuida</b> en maléolos y dedos de los pies, hallazgo frecuente y sin significado patológico.' : ''}`, run: sensRun('fork', true) });
    }
    if (['hand', 'foot'].includes(z.id)) {
      T.pos = { html: `<i>Técnica:</i> <b>batiestesia</b> (sensibilidad posicional): con los ojos cerrados, el examinador toma por los bordes laterales la falange distal ${z.id === 'foot' ? 'del hallux' : 'del dedo'} y la mueve hacia arriba o hacia abajo. <i>Hallazgo normal:</i> identifica la dirección del movimiento, incluso con desplazamientos pequeños, de forma simétrica.`, run: ctx => popText(ctx.svg, ctx.point, '↑ / ↓') };
    }
    if (z.id === 'hand') {
      T.cort = { html: '<i>Técnica:</i> sensibilidad <b>discriminativa (cortical)</b> con los ojos cerrados: reconocer un objeto por el tacto (<b>estereognosia</b>), una cifra trazada en la palma (<b>grafestesia</b>) y la <b>discriminación de dos puntos</b> en el pulpejo. <i>Hallazgo normal:</i> reconoce el objeto y la cifra y distingue dos puntos separados 2-5 mm.', run: ctx => popText(ctx.svg, ctx.point, 'moneda') };
    }
    return T;
  }
  function sensSvg(learn, c) {
    return `
    <rect width="820" height="620" fill="#e8eef4"/>
    ${bodyFront(c)}
    <text x="300" y="20" text-anchor="middle" class="svg-title">Persona examinada · explora ambos lados</text>
    ${learn ? `<text x="560" y="40" class="svg-title">Sensibilidad superficial y profunda</text>
      <text x="560" y="60" class="svg-small">Superficial: táctil, dolorosa y térmica.</text>
      <text x="560" y="76" class="svg-small">Profunda: palestesia, batiestesia y</text>
      <text x="560" y="92" class="svg-small">barestesia. Cortical: estereognosia,</text>
      <text x="560" y="108" class="svg-small">grafestesia y discriminación de 2 puntos.</text>
      <text x="560" y="140" class="svg-title">Referencias dermatómicas</text>
      ${[['C6', 'pulgar'], ['C7', 'dedo medio'], ['C8', 'meñique'], ['T4', 'nivel del pezón'], ['T10', 'nivel del ombligo'], ['L1', 'ingle'], ['L4', 'rodilla y maléolo medial'], ['L5', 'dorso del pie y hallux'], ['S1', 'borde lateral del pie y talón']].map((r, i) => `<text x="560" y="${166 + i * 24}" class="svg-small"><tspan font-weight="700" fill="#0e6a78">${r[0]}</tspan>  ${r[1]}</text>`).join('')}` :
      '<text x="560" y="60" class="svg-small">Compara siempre zonas homólogas</text><text x="560" y="78" class="svg-small">con los ojos cerrados.</text>'}`;
  }
  /* capa anatómica: dermatomas principales (hemicuerpo izquierdo y tronco) y nervios periféricos (hemicuerpo derecho) */
  function sensAnat() {
    const X = x => mirror(x);
    let s = '';
    /* niveles del tronco (línea a lo ancho del tórax/abdomen con rótulo en la línea media) */
    [[146, 'C4'], [160, 'T2'], [190, 'T4'], [215, 'T6'], [240, 'T8'], [270, 'T10'], [300, 'T12'], [334, 'L1']].forEach(([y, t]) => {
      const hw = y <= 302 ? 68 - (y - 146) * 14 / 156 : 52;
      s += `<line x1="${300 - hw}" y1="${y}" x2="${300 + hw}" y2="${y}" stroke="#55677a" stroke-width="1.2" stroke-dasharray="4 3"/>` + aLab(300, y - 3, t, 'middle', 10);
    });
    /* cara: V1, V2, V3 */
    [[54, 30, 0], [77, 33, 1], [100, 25, 2]].forEach(([y, hw, k]) => { s += band([[300 - hw, y], [300 + hw, y]], 18, DERM[k]); });
    s += aLab(342, 58, 'V1') + aLab(342, 81, 'V2') + aLab(336, 104, 'V3');
    /* miembro superior izquierdo */
    s += band([[X(231), 150], [X(215), 200], [X(206), 232]], 10, DERM[0]) + band([[X(249), 162], [X(233), 200], [X(222), 240]], 10, DERM[4]);
    s += band([[X(204), 250], [X(197), 256], [X(183), 346], [X(178), 372]], 10, DERM[1]) + band([[X(219), 250], [X(215), 256], [X(201), 346], [X(198), 376]], 10, DERM[3]);
    s += band([[X(192), 346], [X(187), 384]], 8, DERM[2]);
    s += aLab(412, 212, 'C5') + aLab(362, 266, 'T1') + aLab(436, 372, 'C6') + aLab(413, 404, 'C7', 'middle') + aLab(392, 372, 'C8', 'end');
    /* miembro inferior izquierdo */
    s += band([[X(262), 366], [X(298), 386]], 14, DERM[0]) + band([[X(258), 408], [X(296), 428]], 14, DERM[1]);
    s += band([[X(282), 470], [X(277), 560]], 10, DERM[2]) + band([[X(262), 470], [X(257), 560], [X(258), 592]], 10, DERM[3]) + band([[X(236), 590], [X(246), 604]], 8, DERM[4]);
    s += aLab(350, 378, 'L2') + aLab(350, 420, 'L3') + aLab(300, 476, 'L4', 'middle') + aLab(352, 522, 'L5') + aLab(372, 602, 'S1');
    /* nervios periféricos del hemicuerpo derecho (rótulos a la izquierda con línea guía) */
    s += nerve([[292, 140], [252, 168]], 2.6);
    s += nerve([[252, 168], [228, 212], [210, 262], [197, 330], [190, 362]]) + nerve([[257, 170], [236, 206], [218, 260], [204, 332], [200, 374]]);
    s += nerve([[248, 172], [226, 216], [204, 252], [190, 300], [183, 340]]);
    s += nerve([[296, 342], [278, 400], [268, 460]], 2.6) + nerve([[268, 460], [264, 520], [263, 575]]) + nerve([[268, 460], [256, 476], [260, 520], [262, 560], [258, 590]]);
    s += aLab(24, 232, 'n. radial (C5-T1)') + leader(110, 228, 204, 252);
    s += aLab(24, 268, 'n. mediano (C6-T1)') + leader(118, 264, 210, 262);
    s += aLab(24, 312, 'n. cubital (C8-T1)') + leader(112, 308, 204, 332);
    s += aLab(24, 410, 'n. ciático (L4-S3)') + leader(112, 406, 278, 396);
    s += aLab(24, 470, 'n. peroneo común (L4-S1)') + leader(150, 466, 256, 476);
    s += aLab(24, 556, 'n. tibial (L4-S3)') + leader(104, 552, 262, 548);
    return s;
  }
  const sensRegions = (() => {
    const R = [];
    SENS.forEach(z => {
      const sides = z.id === 'face' ? ['C'] : ['R', 'L'];
      sides.forEach(s => {
        const x = s === 'L' ? mirror(z.x) : z.x;
        R.push({
          id: z.id + s, label: z.label + (s === 'C' ? '' : ' ' + (s === 'R' ? 'derecho' : 'izquierdo')), short: s === 'L' ? '' : z.lab, cx: x, cy: z.y, r: z.r,
          anchor: s === 'C' || z.up ? 'middle' : 'end', lx: s === 'C' || z.up ? x : x - z.r - 6, ly: s === 'C' || z.up ? z.y - z.r - 6 : z.y + 4,
          tools: sensTools(z)
        });
      });
    });
    return R;
  })();

  /* ============================================================ 6. SIGNOS MENINGEOS */
  const M_H = { x: 400, y: 388 }, L1M = 112, L2M = 108;
  function legPts(alpha, kappa) {
    const a = -alpha * DEG;
    const kn = { x: M_H.x + L1M * Math.cos(a), y: M_H.y + L1M * Math.sin(a) };
    const sa = a + kappa * DEG;
    const an = { x: kn.x + L2M * Math.cos(sa), y: kn.y + L2M * Math.sin(sa) };
    const fa = sa - Math.PI / 2;
    const ft = { x: an.x + 30 * Math.cos(fa), y: an.y + 30 * Math.sin(fa) };
    return { kn, an, ft };
  }
  function setLegM(svg, alpha, kappa) {
    const L = legPts(alpha, kappa);
    const p = pathOf([M_H, L.kn, L.an]);
    ['crMLegO', 'crMLegF'].forEach(id => { const e = $q(svg, id); if (e) e.setAttribute('d', p); });
    const ft = $q(svg, 'crMFoot'); if (ft) { ft.setAttribute('x1', L.an.x); ft.setAttribute('y1', L.an.y); ft.setAttribute('x2', L.ft.x); ft.setAttribute('y2', L.ft.y); }
    const hd = $q(svg, 'crMHand'); if (hd) hd.setAttribute('transform', `translate(${L.an.x.toFixed(1)} ${L.an.y.toFixed(1)})`);
    /* capa anatómica: el nervio ciático sigue la cara posterior del muslo y de la pierna */
    const nv = $q(svg, 'crMNerve');
    if (nv) {
      const unit = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1; return { x: -dy / l, y: dx / l }; };
      const n1 = unit(M_H, L.kn), n2 = unit(L.kn, L.an);
      nv.setAttribute('d', pathOf([{ x: 396, y: 418 }, { x: M_H.x + n1.x * 12, y: M_H.y + n1.y * 12 }, { x: L.kn.x + (n1.x + n2.x) * 5, y: L.kn.y + (n1.y + n2.y) * 5 }, { x: L.an.x + n2.x * 8, y: L.an.y + n2.y * 8 }]));
    }
  }
  /* capa anatómica: columna lumbosacra con cuerpos y discos (anterior = arriba), conducto raquídeo con meninges,
     cono medular, cola de caballo y nervio ciático (id crMNerve, se actualiza con la pierna) */
  function meningAnat() {
    let s = '';
    for (let x = 182; x <= 366; x += 24) s += `<rect x="${x}" y="392" width="18" height="16" rx="3" fill="${BONE}" stroke="${BONE_D}" stroke-width="1.2"/><rect x="${x + 18}" y="394" width="6" height="12" rx="2" fill="#d8c48f"/>`;
    s += `<path d="M386 392 L406 396 L404 420 L386 414 Z" fill="${BONE}" stroke="${BONE_D}" stroke-width="1.2"/>`;
    s += `<rect x="178" y="408" width="222" height="12" rx="5" fill="#9fb4c4" fill-opacity=".55" stroke="#5b7cc4" stroke-width="1.4"/>`;
    s += nerve([[180, 414], [330, 414]], 4);
    s += nerve([[330, 414], [396, 411]], 1.2) + nerve([[330, 414], [396, 415]], 1.2) + nerve([[330, 414], [396, 419]], 1.2);
    s += `<path id="crMNerve" d="" fill="none" stroke="${NERV}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += aLab(230, 386, 'cuerpos vertebrales y discos', 'middle');
    s += aLab(172, 446, 'meninges (duramadre, aracnoides, piamadre)', 'middle') + aLab(400, 446, 'cono medular L1-L2 y cola de caballo', 'middle');
    s += aLab(420, 377, 'n. ciático');
    return s;
  }
  function setHeadM(svg, ang) {
    const g = $q(svg, 'crMHead'); if (g) g.setAttribute('transform', `rotate(${ang.toFixed(1)} 178 372)`);
  }
  function meningSvg(learn, c) {
    const hair = hairOf(c);
    return `
    <rect x="0" y="0" width="820" height="520" fill="#e8eef4"/>
    <text x="410" y="132" text-anchor="middle" class="svg-title">Decúbito supino · exploración de signos meníngeos</text>
    <rect x="30" y="430" width="760" height="26" rx="8" fill="#b9c6d4"/>
    <rect x="30" y="456" width="760" height="40" rx="8" fill="#dfe6ed"/>
    <ellipse cx="120" cy="420" rx="62" ry="12" fill="#fff" stroke="#c9d3dd" stroke-width="2"/>
    <rect x="170" y="364" width="236" height="62" rx="26" fill="${SLEEVE}" stroke="${SLEEVE_D}" stroke-width="3"/>
    <g id="crMHead">
      <circle cx="116" cy="384" r="34" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3"/>
      <path d="M83 388 C80 350 104 348 116 352 C98 362 94 376 98 414 C88 410 84 400 83 388 Z" fill="${hair}"/>
      <path d="M112 351 L126 351 L120 336 Z" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="106" cy="368" r="2.6" fill="#333"/>
      <g><ellipse cx="108" cy="428" rx="30" ry="12" fill="#f6d3b3" stroke="${SKIN_D}" stroke-width="2.5"/><line x1="82" y1="436" x2="20" y2="470" stroke="${SLEEVE_D}" stroke-width="20" stroke-linecap="round"/></g>
    </g>
    <line x1="400" y1="426" x2="508" y2="426" stroke="${PANTS_D}" stroke-width="42" stroke-linecap="round"/><line x1="400" y1="426" x2="508" y2="426" stroke="${PANTS}" stroke-width="36" stroke-linecap="round"/>
    <line x1="510" y1="426" x2="618" y2="427" stroke="${SKIN_D}" stroke-width="30" stroke-linecap="round"/><line x1="510" y1="426" x2="618" y2="427" stroke="${SKIN}" stroke-width="24" stroke-linecap="round"/>
    <ellipse cx="628" cy="408" rx="12" ry="28" transform="rotate(-6 628 408)" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="2.5"/>
    <path id="crMLegO" d="" fill="none" stroke="${SKIN_D}" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/>
    <path id="crMLegF" d="" fill="none" stroke="${PANTS}" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>
    <line id="crMFoot" x1="0" y1="0" x2="0" y2="0" stroke="${SKIN_D}" stroke-width="20" stroke-linecap="round"/>
    <g id="crMHand"><ellipse cx="6" cy="6" rx="16" ry="12" fill="#f6d3b3" stroke="${SKIN_D}" stroke-width="2.5"/><line x1="14" y1="12" x2="60" y2="40" stroke="${SLEEVE_D}" stroke-width="20" stroke-linecap="round"/></g>
    <text id="crMNote" x="410" y="162" text-anchor="middle" class="svg-title" opacity="0"></text>`;
  }
  const mRun = {
    neck: ctx => {
      const svg = ctx.svg, note = $q(svg, 'crMNote');
      play(5000, u => {
        const k = tri(u, .35, .7);
        setHeadM(svg, 50 * k);
        note.textContent = k > .9 ? 'Cuello flexible; caderas y rodillas inmóviles' : '';
        note.setAttribute('opacity', k > .9 ? 1 : 0);
        setLegM(svg, 0, 0);
      }, () => { setHeadM(svg, 0); note.setAttribute('opacity', 0); });
      ctx.sh.say(`Sin dolor de cabeza ni molestia a la luz (T ${String(ctx.c.v.temp).replace('.', ',')} °C)`, 'yes', 3000);
    },
    kernig: ctx => {
      const svg = ctx.svg, note = $q(svg, 'crMNote');
      play(8000, u => {
        let a, k;
        if (u < .2) { const s = smooth(u / .2); a = 90 * s; k = 90 * s; }
        else if (u < .6) { const s = smooth((u - .2) / .4); a = 90; k = 90 - 78 * s; }
        else if (u < .7) { a = 90; k = 12; }
        else { const s = smooth((u - .7) / .3); a = 90 * (1 - s); k = 12 + (0 - 12) * s; }
        setLegM(svg, a, k);
        note.textContent = (u > .5 && u < .7) ? 'Rodilla extendida casi por completo, sin dolor' : '';
        note.setAttribute('opacity', (u > .5 && u < .7) ? 1 : 0);
      }, () => { setLegM(svg, 0, 0); note.setAttribute('opacity', 0); });
      ctx.sh.say('No siento dolor ni tirantez importante', 'yes', 3000);
    },
    brud2: ctx => {
      const svg = ctx.svg, note = $q(svg, 'crMNote');
      play(5000, u => {
        const k = tri(u, .3, .7);
        setLegM(svg, 90 * k, 90 * k);
        note.textContent = k > .9 ? 'La pierna contraria permanece extendida' : '';
        note.setAttribute('opacity', k > .9 ? 1 : 0);
      }, () => { setLegM(svg, 0, 0); note.setAttribute('opacity', 0); });
    }
  };
  const meningRegions = [
    { id: 'mhead', label: 'Cabeza y cuello', short: 'Cuello', cx: 120, cy: 384, r: 52, lx: 120, ly: 322,
      tools: {
        neck: c => ({ html: `<i>Técnica:</i> en decúbito dorsal, con una mano bajo el occipucio, se flexiona pasivamente el cuello intentando llevar el mentón al esternón. <i>Hallazgo normal:</i> <b>sin rigidez de nuca</b> (flexión libre, sin resistencia ni dolor) y <b>signo de Brudzinski (de la nuca) negativo</b>: no se flexionan caderas ni rodillas. Persona afebril (${String(c.v.temp).replace('.', ',')} °C), sin cefalea ni fotofobia.`, run: mRun.neck }),
        look: '<i>Técnica:</i> inspección de la actitud en decúbito. <i>Hallazgo normal:</i> paciente tranquilo, sin actitud en opistótonos ni «en gatillo de fusil», sin fotofobia ni cefalea.'
      } },
    { id: 'mleg', label: 'Pierna explorada', short: 'Kernig', x: 394, y: 255, w: 226, h: 180, rx: 26, lx: 520, ly: 245,
      tools: {
        kernig: { html: '<i>Técnica:</i> signo de Kernig: se flexionan cadera y rodilla a 90° y se extiende pasivamente la rodilla (variante: elevar el miembro inferior extendido, o sentar pasivamente al paciente y observar las rodillas). <i>Hallazgo normal:</i> <b>Kernig negativo</b>, la rodilla se extiende casi por completo <b>sin dolor, resistencia ni flexión refleja</b>; al sentarlo o elevar la pierna extendida, las rodillas no se flexionan. Una ligera tensión de los isquiotibiales al final no es patológica.', run: mRun.kernig },
        brud2: { html: '<i>Técnica:</i> signo de Brudzinski contralateral: se flexionan pasivamente la cadera y la rodilla de una pierna. <i>Hallazgo normal:</i> negativo, la pierna contraria <b>permanece extendida y relajada</b>.', run: mRun.brud2 },
        look: '<i>Hallazgo normal:</i> miembros inferiores simétricos, relajados y en extensión.'
      } },
    { id: 'mfix', label: 'Pierna contraria', short: 'Pierna contraria', cx: 560, cy: 440, r: 46, lx: 560, ly: 380,
      tools: {
        brud2: { html: '<i>Técnica:</i> se flexiona pasivamente la otra pierna y se observa esta. <i>Hallazgo normal:</i> <b>Brudzinski contralateral negativo</b>, esta pierna <b>no se flexiona</b> de forma refleja.', run: mRun.brud2 },
        look: '<i>Hallazgo normal:</i> pierna relajada, en extensión, sin posturas anormales.'
      } }
  ];
  function meningAfter(stage, sh, ctx) { setLegM(ctx.svg, 0, 0); setHeadM(ctx.svg, 0); }

  /* ============================================================ 7. ESTADO MENTAL */
  const MM_DOM = [
    { id: 'ot', name: 'Orientación en el tiempo', max: 5 }, { id: 'os', name: 'Orientación en el espacio', max: 5 },
    { id: 'reg', name: 'Registro (3 palabras)', max: 3 }, { id: 'att', name: 'Atención y cálculo', max: 5 },
    { id: 'rec', name: 'Recuerdo diferido', max: 3 }, { id: 'lang', name: 'Lenguaje', max: 8 }, { id: 'prax', name: 'Praxia constructiva', max: 1 }
  ];
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function mmItems() {
    const d = new Date();
    return {
      ot: [['¿En qué año estamos?', String(d.getFullYear())], ['¿En qué estación del año estamos?', 'la que corresponde a la fecha'], ['¿Qué día del mes es hoy?', String(d.getDate())],
        ['¿Qué día de la semana es hoy?', DIAS[d.getDay()]], ['¿En qué mes estamos?', MESES[d.getMonth()]]],
      os: [['¿En qué país estamos?', 'el país correcto'], ['¿En qué provincia, estado o departamento?', 'el correcto'], ['¿En qué ciudad?', 'la correcta'],
        ['¿Cómo se llama este lugar (hospital o consultorio)?', 'el nombre correcto'], ['¿En qué piso o planta estamos?', 'el correcto']],
      reg: [['Repita: árbol…', 'árbol'], ['…mesa…', 'mesa'], ['…perro', 'perro']],
      att: [['A 100 réstele 7…', '93'], ['…y siga restando 7', '86'], ['…', '79'], ['…', '72'], ['…', '65']],
      rec: [['¿Recuerda la primera palabra?', 'árbol'], ['¿La segunda?', 'mesa'], ['¿La tercera?', 'perro']],
      lang: [['¿Qué es esto? (reloj)', 'un reloj'], ['¿Y esto? (lápiz)', 'un lápiz'], ['Repita: "ni sí, ni no, ni pero"', 'ni sí, ni no, ni pero'],
        ['Tome este papel con la mano derecha…', 'lo toma con la derecha'], ['…dóblelo por la mitad…', 'lo dobla por la mitad'], ['…y déjelo en el suelo', 'lo deja en el suelo'],
        ['Lea y haga lo que dice: "CIERRE LOS OJOS"', 'cierra los ojos'], ['Escriba una frase', '"Hoy hace buen día" (sujeto y verbo)']],
      prax: [['Copie este dibujo (dos pentágonos que se cruzan)', 'copia los 2 pentágonos con el cruce de 4 lados']]
    };
  }
  let MM = { cid: null, done: {} };
  const mmScore = () => Object.keys(MM.done).filter(k => MM.done[k]).length;
  function mmReset(c) { if (MM.cid !== c.id) MM = { cid: c.id, done: {} }; }
  function mmRefresh(root) {
    if (!root) return;
    const items = mmItems(), tot = mmScore();
    MM_DOM.forEach(d => {
      const box = root.querySelector(`[data-d="${d.id}"]`); if (!box) return;
      const got = items[d.id].filter((_, i) => MM.done[d.id + ':' + i]).length;
      box.querySelector('.sc').textContent = `${got}/${d.max}`;
      box.querySelectorAll('button').forEach((b, i) => b.classList.toggle('ok', !!MM.done[d.id + ':' + i]));
    });
    const t = root.querySelector('#crMmTot'); if (t) t.textContent = `Mini-Mental: ${tot}/30`;
    const svg = root.parentNode && root.parentNode.querySelector('svg');
    if (svg) {
      const g = $q(svg, 'crMm'); if (g) g.textContent = `${tot}/30`;
      const a = $q(svg, 'crArc'); if (a) a.setAttribute('stroke-dashoffset', (390 * (1 - tot / 30)).toFixed(1));
      const v = $q(svg, 'crMmV'); if (v) v.textContent = tot === 30 ? 'Puntuación máxima: sin déficit' : tot >= 24 ? 'Dentro del punto de corte (≥ 24)' : 'Por debajo del punto de corte (24)';
    }
  }
  function mmComplete(sh, ids) {
    const items = mmItems();
    ids.forEach(id => items[id].forEach((_, i) => { MM.done[id + ':' + i] = true; }));
    const root = sh.$('#crMmPanel'); mmRefresh(root);
  }
  const pentagon = (cx, cy, r, a0) => Array.from({ length: 5 }, (_, k) => `${(cx + r * Math.cos((a0 + 72 * k) * DEG)).toFixed(1)},${(cy + r * Math.sin((a0 + 72 * k) * DEG)).toFixed(1)}`).join(' ');
  function mentalSvg(learn, c) {
    const cards = [
      ['Nivel de conciencia', 'Alerta · Glasgow 15/15'], ['Orientación', 'Tiempo, espacio y persona (10 pts)'], ['Atención y cálculo', 'Restas de 7 (5 pts)'],
      ['Memoria', 'Registro y recuerdo de 3 palabras (6 pts)'], ['Lenguaje', 'Nombrar, repetir, comprender, leer, escribir (8 pts)'],
      ['Praxia y gnosia', 'Copia de pentágonos, gestos (1 pt)'], ['Afecto, pensamiento y juicio', 'Ánimo, curso, contenido, introspección']
    ];
    return `
    <rect width="820" height="540" fill="#e8eef4"/>
    ${cards.map((k, i) => `<rect x="20" y="${22 + i * 72}" width="480" height="62" rx="12" fill="#fff" stroke="#c9d3dd" stroke-width="2"/>
      <text x="40" y="${50 + i * 72}" font-family="system-ui,sans-serif" font-size="16" font-weight="700" fill="#0e6a78">${i + 1}. ${k[0]}</text>
      <text x="40" y="${70 + i * 72}" font-family="system-ui,sans-serif" font-size="12.5" fill="#55677a">${k[1]}</text>`).join('')}
    <circle cx="660" cy="120" r="62" fill="#fff" stroke="#c9d3dd" stroke-width="2"/>
    <circle id="crArc" cx="660" cy="120" r="62" fill="none" stroke="#237a4b" stroke-width="12" stroke-dasharray="390" stroke-dashoffset="390" transform="rotate(-90 660 120)" stroke-linecap="round"/>
    <text id="crMm" x="660" y="128" text-anchor="middle" font-family="system-ui,sans-serif" font-size="28" font-weight="700" fill="#38495a">0/30</text>
    <text x="660" y="162" text-anchor="middle" class="svg-small">Mini-Mental</text>
    <text id="crMmV" x="660" y="216" text-anchor="middle" class="svg-small"></text>
    <text x="660" y="236" text-anchor="middle" class="svg-small">Máximo 30 · corte habitual &lt; 24</text>
    <text x="660" y="252" text-anchor="middle" class="svg-small">(ajustar por edad y escolaridad)</text>
    <rect x="520" y="278" width="280" height="226" rx="12" fill="#fff" stroke="#c9d3dd" stroke-width="2"/>
    <text x="660" y="300" text-anchor="middle" class="svg-small">Copia de dos pentágonos</text>
    <g id="crPent" fill="none" stroke="#38495a" stroke-width="3" stroke-linejoin="round">
      <polygon class="pp" points="${pentagon(610, 400, 62, 0)}"/><polygon class="pp" points="${pentagon(700, 400, 62, 180)}"/></g>`;
  }
  const dateTxt = () => { const d = new Date(); return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`; };
  const mentalRegions = [
    { id: 'conc', label: 'Nivel de conciencia', short: '', x: 20, y: 22, w: 480, h: 62, rx: 12,
      tools: {
        obs: 'Paciente <b>alerta</b>: ojos abiertos espontáneamente, contacto visual, respuestas rápidas y coherentes, atención sostenida durante toda la entrevista, sin somnolencia. <b>Glasgow 15/15</b>: apertura ocular 4 (espontánea), respuesta verbal 5 (orientado), respuesta motora 6 (obedece órdenes).',
        ask: { html: 'Responde de inmediato a su nombre y a la conversación, orientado y sin inatención. <b>Glasgow 15/15</b> (O4 V5 M6). Nivel de conciencia: alerta.', run: ctx => ctx.sh.say('Buenos días, doctor', 'yes') }
      } },
    { id: 'orie', label: 'Orientación', short: '', x: 20, y: 94, w: 480, h: 62, rx: 12,
      tools: {
        obs: 'Se ubica en el consultorio y reconoce a las personas presentes; actúa de forma apropiada al contexto.',
        ask: () => ({ html: `Orientado en <b>tiempo</b> (${dateTxt()}), en <b>espacio</b> (país, estado, ciudad, lugar y piso) y en <b>persona</b> (dice su nombre, edad, ocupación y reconoce a su acompañante): <b>10/10</b> en los ítems del Mini-Mental.`, run: ctx => { mmComplete(ctx.sh, ['ot', 'os']); ctx.sh.say(dateTxt(), 'yes', 2800); } })
      } },
    { id: 'aten', label: 'Atención y cálculo', short: '', x: 20, y: 166, w: 480, h: 62, rx: 12,
      tools: {
        obs: 'Mantiene la atención durante la entrevista sin distraerse; repite series de <b>dígitos</b> directos (habitualmente 5-7 cifras) e inversos (4-5).',
        ask: { html: '<i>Técnica:</i> <b>restas seriadas de 7</b> desde 100 (alternativa: deletrear "MUNDO" al revés). <i>Hallazgo normal:</i> 93, 86, 79, 72, 65 (5/5), sin errores ni enlentecimiento; atención y concentración conservadas.', run: ctx => { mmComplete(ctx.sh, ['att']); ['93', '86', '79', '72', '65'].forEach((n, i) => later(() => ctx.sh.say(n, 'yes', 900), i * 900)); } }
      } },
    { id: 'memo', label: 'Memoria', short: '', x: 20, y: 238, w: 480, h: 62, rx: 12,
      tools: {
        obs: 'Relata con detalle y coherencia su historia reciente y remota (fecha de nacimiento, hechos personales).',
        ask: { html: '<b>Registro</b>: repite las 3 palabras ("árbol, mesa, perro") a la primera (3/3). <b>Recuerdo diferido</b> a los 3-5 minutos, tras la prueba de atención: las 3 palabras sin ayuda (3/3). Memoria inmediata, reciente y remota conservadas.', run: ctx => { mmComplete(ctx.sh, ['reg', 'rec']); ctx.sh.say('Árbol, mesa, perro', 'yes', 2500); } }
      } },
    { id: 'leng', label: 'Lenguaje', short: '', x: 20, y: 310, w: 480, h: 62, rx: 12,
      tools: {
        obs: 'Habla <b>fluente</b>, de ritmo, volumen y prosodia normales, con articulación clara; sin parafasias, anomia ni disartria; comprende la conversación.',
        ask: { html: '<b>Denominación</b> (reloj, lápiz), <b>repetición</b> ("ni sí, ni no, ni pero"), <b>comprensión</b> de una orden de 3 pasos (toma el papel con la mano derecha, lo dobla por la mitad y lo deja en el suelo), <b>lectura</b> ("cierre los ojos") y <b>escritura</b> de una frase con sentido: 8/8 sin errores.', run: ctx => { mmComplete(ctx.sh, ['lang']); ctx.sh.say('Ni sí, ni no, ni pero', 'yes', 2500); } }
      } },
    { id: 'prax', label: 'Praxia y gnosia', short: '', x: 20, y: 382, w: 480, h: 62, rx: 12,
      tools: {
        obs: 'Realiza con soltura los gestos habituales: se peina, se abotona, se despide con la mano; no hay apraxia ni agnosia.',
        ask: { html: '<b>Praxia ideomotora</b> (imitar o pantomima: saludar, peinarse, cepillarse los dientes), <b>ideatoria</b> (secuencia de varios actos) y <b>constructiva</b>: copia correctamente los dos pentágonos con un cruce de cuatro lados (1/1). Reconoce objetos y caras (gnosia conservada).', run: ctx => {
          mmComplete(ctx.sh, ['prax']);
          const pp = ctx.svg.querySelectorAll('#crPent .pp'); const L = []; pp.forEach(p => L.push(p.getTotalLength ? p.getTotalLength() : 320));
          pp.forEach((p, i) => { p.setAttribute('stroke-dasharray', L[i]); p.setAttribute('stroke-dashoffset', L[i]); });
          tween(2600, u => pp.forEach((p, i) => p.setAttribute('stroke-dashoffset', (L[i] * (1 - Math.min(1, Math.max(0, u * 2 - i * 0.9)))).toFixed(1))), () => pp.forEach(p => { p.removeAttribute('stroke-dasharray'); p.removeAttribute('stroke-dashoffset'); }));
        } }
      } },
    { id: 'afec', label: 'Afecto, pensamiento y juicio', short: '', x: 20, y: 454, w: 480, h: 62, rx: 12,
      tools: {
        obs: 'Aspecto cuidado y acorde a la edad; actitud colaboradora; <b>ánimo eutímico</b> con afecto adecuado y reactivo; <b>pensamiento</b> de curso normal (coherente y organizado), contenido sin delirios ni ideas obsesivas, sin alucinaciones.',
        ask: 'Juicio y crítica conservados, buena introspección: comprende el motivo de la consulta y toma decisiones razonables. Sin ideas de muerte ni de daño.'
      } }
  ];
  function mentalAfter(stage, sh, ctx) {
    const c = sh.case;
    mmReset(c);
    const items = mmItems();
    const P = document.createElement('div');
    P.className = 'cr-panel'; P.id = 'crMmPanel';
    P.innerHTML = `<h5>Mini-Mental (MMSE de Folstein) · desglose interactivo: pulsa cada ítem para preguntar <span id="crMmTot" style="float:right;font-weight:700;color:var(--brand)"></span></h5>
      <div class="cr-grid">${MM_DOM.map(d => `<div class="cr-dom" data-d="${d.id}"><b>${d.name}</b><span class="sc">0/${d.max}</span>
        <div class="cr-chips">${items[d.id].map((it, i) => `<button data-i="${i}">${i + 1}</button>`).join('')}</div></div>`).join('')}</div>
      <div class="cr-read" id="crMmR">Pulsa un número para ver la pregunta y la respuesta del paciente (cada acierto vale 1 punto, total 30).</div>
      <div style="margin-top:6px"><button class="cr-btn" id="crMmAll">Aplicar todo el Mini-Mental</button> <button class="cr-btn" id="crMmClr">Reiniciar</button></div>`;
    stage.appendChild(P);
    P.addEventListener('click', e => {
      const b = e.target.closest('.cr-chips button');
      if (b) {
        const id = b.closest('.cr-dom').dataset.d, i = +b.dataset.i, it = mmItems()[id][i];
        MM.done[id + ':' + i] = true;
        P.querySelector('#crMmR').innerHTML = `<b>Pregunta:</b> ${it[0]} &nbsp; <b>Respuesta:</b> ${it[1]} ✔ (+1)`;
        sh.say(it[1], 'yes', 1600);
        mmRefresh(P);
      } else if (e.target.id === 'crMmAll') {
        mmComplete(sh, MM_DOM.map(d => d.id));
        P.querySelector('#crMmR').innerHTML = '<b>Mini-Mental 30/30</b>: orientación 10, registro 3, atención y cálculo 5, recuerdo 3, lenguaje 8 y praxia constructiva 1. Punto de corte habitual de deterioro cognitivo: &lt; 24 (ajustar por edad y escolaridad).';
        sh.log('<b>Mini-Mental:</b> 30/30, sin déficit cognitivo.', 'find');
      } else if (e.target.id === 'crMmClr') {
        MM = { cid: c.id, done: {} }; P.querySelector('#crMmR').textContent = 'Puntuación reiniciada.'; mmRefresh(P);
      }
    });
    mmRefresh(P);
  }

  /* ============================================================ definición del módulo */
  /* 8 preguntas; la 4.ª y la 6.ª dependen de la persona examinada (edad). */
  const QUIZ = c => [
    { q: 'Reflejo corneal: vías aferente y eferente', options: ['Aferente II, eferente III', 'Aferente V, eferente VII', 'Aferente VII, eferente V', 'Aferente III, eferente VI', 'Aferente IX, eferente X'], a: 1,
      why: 'El estímulo corneal viaja por V1 (trigémino) y el parpadeo lo produce el orbicular de los párpados (VII).' },
    { q: 'Al decir "ah", la úvula normal', options: ['Se desvía hacia el lado sano', 'Se desvía hacia el lado enfermo', 'No se mueve', 'Se eleva simétricamente en la línea media', 'Se eleva solo con el reflejo nauseoso'], a: 3,
      why: 'La elevación simétrica del paladar blando con la úvula central indica integridad de IX y X.' },
    { q: 'Fuerza muscular normal en la escala 0-5 (MRC)', options: ['3/5', '4/5', '4+/5', '5/5 (vence la resistencia máxima)', '5-/5 siempre'], a: 3,
      why: 'Con 5/5 el paciente vence la gravedad y la resistencia máxima del examinador; 3/5 solo vence la gravedad.' },
    { q: `En esta persona (${c.age} años), ¿cuál de estos hallazgos sensitivos puede considerarse fisiológico?`,
      options: ['Reflejo fotomotor ausente', 'Anestesia táctil en un dermatoma', elder(c) ? 'Palestesia algo disminuida en maléolos y dedos de los pies' : 'Ninguno: palestesia y batiestesia conservadas y simétricas', 'Batiestesia abolida en los dedos', 'Grafestesia ausente en una mano'], a: 2,
      why: elder(c) ? 'En el adulto mayor la sensibilidad vibratoria distal de los miembros inferiores puede estar algo disminuida sin significado patológico; el resto es siempre anormal.' : 'A esta edad toda la sensibilidad superficial y profunda debe ser normal y simétrica; una disminución distal de la palestesia se tolera solo en el adulto mayor.' },
    { q: 'Signo de Kernig negativo (normal)', options: ['Dolor y resistencia al extender la rodilla', 'Flexión refleja de la otra pierna', 'Con cadera y rodilla a 90°, la rodilla se extiende sin dolor ni resistencia', 'Imposibilidad de flexionar la cadera', 'Rigidez de nuca'], a: 2,
      why: 'Es negativo cuando la extensión pasiva de la rodilla (o la elevación de la pierna extendida) no despierta dolor, resistencia ni flexión de las rodillas.' },
    { q: `Velocidad de marcha habitual esperada en esta persona (${c.age} años)`, options: ['0,3-0,5 m/s', '0,8 m/s con base amplia', '2,5-3 m/s', elder(c) ? '≈ 1,0-1,2 m/s' : '≈ 1,2-1,4 m/s', 'No se valora en la exploración'], a: 3,
      why: elder(c) ? 'En el adulto mayor sano la velocidad de marcha es algo menor (≈ 1,0-1,2 m/s), con base de 5-10 cm y braceo conservado.' : 'En el adulto la marcha normal tiene una velocidad de ≈ 1,2-1,4 m/s, con base de 5-10 cm y braceo simétrico.' },
    { q: 'Puntuación máxima del Mini-Mental (MMSE) y punto de corte habitual', options: ['Máximo 24; corte 20', '30; corte &lt; 24 (ajustado por edad y escolaridad)', 'Máximo 15 (como el Glasgow)', '30; corte 10', '100; corte 70'], a: 1,
      why: 'El Mini-Mental suma 30 puntos; por debajo de 24 (ajustado por edad y escolaridad) se sospecha deterioro cognitivo. Esta persona obtiene 30/30.' },
    { q: 'Al protruir la lengua (XII) normal', options: ['Se desvía hacia el lado débil', 'Sale en la línea media, sin atrofia ni fasciculaciones', 'Se desvía hacia el lado sano', 'Presenta fasciculaciones', 'No puede moverse lateralmente'], a: 1,
      why: 'La protrusión en línea media indica función simétrica del hipogloso.' }
  ];

  injectStyle();
  NormalEngine.build({
    id: 'cranial', title: 'Examen neurológico (normal)', icon: '🧠', group: 'Exploración normal',
    desc: 'Examen neurológico normal en el orden de Argente-Álvarez: conciencia y estado mental, pares craneales I-XII, motilidad (fuerza, tono, trofismo), taxia, sensibilidad superficial y profunda, marcha y signos meníngeos. Los reflejos se exploran en «Neurología: reflejos, pies y ojos».',
    bullets: ['Conciencia, Glasgow 15/15 y Mini-Mental 30/30 interactivo', 'Pares craneales I-XII con función, técnica y hallazgo normal', 'Fuerza 0-5, tono, trofismo, taxia, Romberg y marcha animados', 'Sensibilidad superficial, profunda (palestesia, batiestesia, barestesia) y signos meníngeos'],
    refs: [
      'Argente HA, Álvarez ME. <i>Semiología Médica</i>. Panamericana — Examen neurológico: conciencia y estado mental, pares craneales, motilidad, taxia, sensibilidad, marcha y signos meníngeos.',
      'Folstein MF, Folstein SE, McHugh PR. "Mini-Mental State": a practical method for grading the cognitive state of patients for the clinician. <i>J Psychiatr Res</i> 1975 (MMSE, 30 puntos).',
      'Medical Research Council. <i>Aids to the examination of the peripheral nervous system</i> (escala de fuerza 0-5).'
    ],
    teaching: [
      'Orden del examen: conciencia y estado mental, pares craneales, motilidad (activa, pasiva/tono, trofismo, fuerza), reflejos, taxia, praxia, sensibilidad, marcha y signos meníngeos; se compara siempre con el lado contrario.',
      'Los pares craneales se exploran en orden del I al XII; los pares mixtos (V, VII, IX, X) tienen componente sensitivo y motor.',
      'Fuerza: cada grupo muscular contra resistencia, graduada de 0 a 5 (5/5 vence la gravedad y la resistencia máxima). Las maniobras de Mingazzini y Barré descubren paresias leves.',
      'Sensibilidad superficial (táctil, dolorosa, térmica) y profunda (palestesia con diapasón de 128 Hz, batiestesia, barestesia), con los ojos cerrados y por dermatomas.',
      'Romberg: pies juntos, ojos abiertos y luego cerrados; es negativo si mantiene la postura. Kernig y Brudzinski se buscan en decúbito y, sin fiebre ni cefalea, son negativos.',
      'Mini-Mental: máximo 30; por debajo de 24 (ajustado por edad y escolaridad) se sospecha deterioro cognitivo.'
    ],
    scenes: [
      { id: 'mental', label: 'Conciencia y estado mental', viewBox: '0 0 820 540', redrawOnMode: false,
        hint: 'Haz clic en cada dominio: observa y aplica la prueba; el Mini-Mental suma puntos hasta 30/30 (también por ítems en el panel inferior).',
        svg: mentalSvg, regions: mentalRegions, after: mentalAfter,
        tools: [
          { id: 'obs', icon: '👁️', label: 'Observar / conversar', hint: 'Observación y entrevista: conciencia, lenguaje espontáneo, ánimo.' },
          { id: 'ask', icon: '🗣️', label: 'Preguntar / aplicar la prueba', hint: 'Aplica las preguntas de cada dominio (suma puntos al Mini-Mental).' }
        ],
        onLeave: stopAnim },
      { id: 'nerves', label: 'Pares craneales I-XII', viewBox: '0 0 820 620', redrawOnMode: false,
        hint: 'Haz clic en la zona de la cara o en la tarjeta de cada par. Usa "Función" o "Técnica y hallazgo normal".',
        svg: nervesSvg, regions: nervRegions, anatomy: nervesAnat,
        tools: [
          { id: 'info', icon: '📖', label: 'Función y trayecto', hint: 'Función del par craneal que elijas (cara o tarjeta).' },
          { id: 'exam', icon: '🩺', label: 'Técnica y hallazgo normal', hint: 'Cómo se explora y qué se espera encontrar (algunas maniobras se animan).' }
        ],
        onLeave: stopAnim },
      { id: 'motor', label: 'Motilidad: fuerza, tono y trofismo', viewBox: '0 0 820 620', redrawOnMode: false,
        hint: 'Motilidad activa y fuerza contra resistencia (0-5), tono (motilidad pasiva) y trofismo de nueve grupos musculares, en ambos lados.',
        svg: motorSvg, regions: motorRegions, anatomy: motorAnat,
        tools: [
          { id: 'strength', icon: '💪', label: 'Fuerza (motilidad activa contra resistencia)', hint: 'Fuerza: haz clic en el grupo muscular y compara con el lado contrario.' },
          { id: 'tone', icon: '🤲', label: 'Tono (motilidad pasiva)', hint: 'Tono: movilización pasiva del miembro relajado.' },
          { id: 'trophy', icon: '👁️', label: 'Trofismo (inspección y palpación)', hint: 'Trofismo: volumen muscular, simetría, atrofia y fasciculaciones.' }
        ],
        onLeave: stopAnim },
      { id: 'cereb', label: 'Taxia (coordinación)', viewBox: '0 0 820 600', redrawOnMode: false,
        hint: 'Taxia dinámica: índice-nariz, diadococinesia y talón-rodilla (animación); observa también en reposo.',
        svg: cerebSvg, regions: cerebRegions, after: cerebAfter,
        tools: [
          { id: 'do', icon: '🧪', label: 'Realizar la prueba', hint: 'Haz clic en el recuadro de cada prueba: índice-nariz, diadococinesia o talón-rodilla.' },
          { id: 'look', icon: '👁️', label: 'Observar en reposo', hint: 'Observa temblor y movimientos anormales en reposo.' }
        ],
        onLeave: stopAnim },
      { id: 'sens', label: 'Sensibilidad', viewBox: '0 0 820 620', redrawOnMode: true,
        hint: 'Elige el estímulo y haz clic en cada zona (compara ambos lados con los ojos cerrados).',
        svg: sensSvg, regions: sensRegions, anatomy: sensAnat,
        tools: [
          { id: 'touch', icon: '🪶', label: 'Táctil (algodón)', hint: 'Sensibilidad táctil con algodón.' },
          { id: 'pain', icon: '📍', label: 'Dolorosa (alfiler)', hint: 'Sensibilidad dolorosa con alfiler (punzante / romo).' },
          { id: 'temp', icon: '🌡️', label: 'Térmica (frío / calor)', hint: 'Sensibilidad térmica con tubos de agua fría y tibia.' },
          { id: 'vib', icon: '🎵', label: 'Palestesia (diapasón 128 Hz)', hint: 'Sensibilidad vibratoria con el diapasón sobre prominencias óseas.' },
          { id: 'pos', icon: '🖐️', label: 'Batiestesia (posición)', hint: 'Sensibilidad posicional en los dedos de la mano y del pie.' },
          { id: 'bar', icon: '👆', label: 'Barestesia (presión)', hint: 'Sensibilidad a la presión sobre piel y masas musculares.' },
          { id: 'cort', icon: '🔑', label: 'Discriminativa (cortical)', hint: 'Estereognosia, grafestesia y discriminación de dos puntos (mano).' }
        ],
        onLeave: stopAnim },
      { id: 'gait', label: 'Marcha y equilibrio', viewBox: '0 0 820 520', redrawOnMode: false,
        hint: 'Elige una prueba y haz clic sobre la persona: Romberg (taxia estática), marcha, tándem, talones y puntas de pie.',
        svg: gaitSvg, regions: gaitRegions,
        tools: [
          { id: 'romberg', icon: '🧍', label: 'Romberg', hint: 'Romberg: pies juntos, ojos abiertos y luego cerrados.' },
          { id: 'gait', icon: '🚶', label: 'Marcha libre', hint: 'Marcha libre: observa base, paso, braceo y giro.' },
          { id: 'tandem', icon: '🦶', label: 'Marcha en tándem', hint: 'Marcha en tándem: talón con punta en línea recta.' },
          { id: 'heels', icon: '⬆️', label: 'Marcha sobre talones', hint: 'Marcha sobre talones (dorsiflexión).' },
          { id: 'toes', icon: '🩰', label: 'Marcha en puntas de pie', hint: 'Marcha en puntas de pie (flexión plantar).' }
        ],
        onLeave: stopAnim },
      { id: 'mening', label: 'Signos meníngeos', viewBox: '0 100 820 420', redrawOnMode: false,
        hint: 'Flexión pasiva del cuello (rigidez de nuca y Brudzinski) y signo de Kernig en decúbito.',
        svg: meningSvg, regions: meningRegions, after: meningAfter, anatomy: meningAnat,
        tools: [
          { id: 'neck', icon: '🙆', label: 'Flexión pasiva del cuello', hint: 'Haz clic en la cabeza: rigidez de nuca y Brudzinski.' },
          { id: 'kernig', icon: '🦵', label: 'Kernig', hint: 'Haz clic en la pierna: cadera y rodilla a 90° y extensión de la rodilla.' },
          { id: 'brud2', icon: '↕️', label: 'Brudzinski contralateral', hint: 'Flexiona una pierna y observa la contraria.' },
          { id: 'look', icon: '👁️', label: 'Inspección', hint: 'Observa la actitud y el estado general.' }
        ],
        onLeave: stopAnim }
    ],
    quiz: QUIZ
  });
})();
