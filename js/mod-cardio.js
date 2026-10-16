/* Módulo: Aparato cardiovascular y pulsos (exploración NORMAL).
   Escenas: precordio, auscultación, cuello y yugulares, pulsos periféricos, perfusión y miembros. */
(function () {
  'use strict';
  const { esc, clamp } = U;
  const NS = 'http://www.w3.org/2000/svg';
  const SKIN = '#f1c9a5', LINE = '#b98a63';
  const fmt = n => String(n).replace('.', ',');

  /* ------------------------------------------------------------ estado y utilidades */
  const S = {
    live: false, tok: 0, tm: [], cancel: [], posture: 'sup', breath: 'norm', active: null, split: false,
    peaks: null, angle: 45, boost: 0, bc: null, side: 'D', cur: null
  };

  function clearFx() {
    S.tm.forEach(clearTimeout); S.tm.length = 0;
    S.cancel.forEach(f => { try { f(); } catch (e) { /* noop */ } }); S.cancel.length = 0;
  }
  function leaveAll() {
    S.live = false; S.tok++; clearFx(); S.active = null; S.cur = null; S.split = false;
    if (S.bc) { S.bc(); S.bc = null; }
    S.boost = 0;
    try { Sound.stop(); } catch (e) { /* noop */ }
  }

  function injectCss() {
    if (document.getElementById('cv-style')) return;
    const st = document.createElement('style');
    st.id = 'cv-style';
    st.textContent = `
      .cv-bar{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;padding:8px 12px;background:var(--panel);border-top:1px solid var(--line);font-size:13px;color:var(--ink)}
      .cv-bar .seg button{color:var(--ink)}
      .cv-bar .seg button.active{color:var(--brand-ink)}
      .cv-lbl{font-weight:600;color:var(--muted)}
      .cv-bar input[type=range]{width:190px;accent-color:var(--brand)}
      .cv-read{font-variant-numeric:tabular-nums;color:var(--ink)}
      .cv-note{padding:8px 12px;font-size:12.5px;color:var(--muted);background:var(--panel);border-top:1px solid var(--line);line-height:1.45}
      .cv-note b{color:var(--ink)}
      .cv-scale{border-collapse:collapse;font-size:12.5px;margin:2px 0}
      .cv-scale td,.cv-scale th{border:1px solid var(--line);padding:2px 8px;color:var(--ink)}
      .cv-scale th{background:var(--soft);font-weight:600}
      .cv-wave canvas{height:120px!important}
    `;
    document.head.appendChild(st);
  }

  function segHtml(id, label, items, cur) {
    return `<span class="cv-lbl">${label}</span><span class="seg" data-seg="${id}">${items.map(([v, t]) =>
      `<button type="button" data-v="${v}" class="${v === cur ? 'active' : ''}">${t}</button>`).join('')}</span>`;
  }
  function bindSeg(root, id, cb) {
    const el = root.querySelector(`[data-seg="${id}"]`);
    el.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      el.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
      cb(b.dataset.v);
    });
  }

  /* Anillos de pulso en una o varias posiciones, a la frecuencia c.v.hr, con pitido opcional. */
  function pulseFx(svg, pts, hr, beats, opt) {
    opt = opt || {};
    clearFx();
    const layer = svg.querySelector('#flash');
    layer.querySelectorAll('.cv-fx').forEach(n => n.remove());
    const T = 60000 / hr;
    pts = Array.isArray(pts) ? pts : [pts];
    for (let i = 0; i < beats; i++) {
      const fire = () => {
        if (!layer.isConnected) return;
        pts.forEach(p => {
          const c = document.createElementNS(NS, 'circle');
          c.setAttribute('class', 'cv-fx');
          c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); c.setAttribute('fill', opt.fill || 'none');
          c.setAttribute('stroke', opt.col || '#d9534f'); c.setAttribute('stroke-width', opt.sw || 3);
          layer.appendChild(c);
          S.cancel.push(U.tween(520, u => {
            c.setAttribute('r', (opt.r0 || 6) + (opt.dr || 16) * u); c.setAttribute('opacity', 0.85 * (1 - u));
          }, () => c.remove()));
        });
        if (opt.beep) Sound.beep(opt.beep, 0.05, 0.12);
      };
      if (i === 0) fire(); else S.tm.push(setTimeout(fire, i * T));
    }
  }

  const bmi = c => c.v.weight / (c.v.height * c.v.height);
  const elder = c => c.age >= 65;

  /* ------------------------------------------------------------ torso anterior */
  const TORSO = 'M170,92 C140,100 85,100 62,118 C40,135 38,170 42,220 C46,300 62,380 70,460 L80,545 L340,545 L350,460 C358,380 374,300 378,220 C382,170 380,135 358,118 C335,100 280,100 250,92 Z';
  const NECK = 'M178,10 L242,10 L250,95 L170,95 Z';
  const FOCI = {
    ao: { x: 190, y: 149, n: 'Foco aórtico', pos: '2.º espacio intercostal (EIC), borde esternal derecho' },
    pu: { x: 230, y: 149, n: 'Foco pulmonar', pos: '2.º EIC, borde esternal izquierdo' },
    er: { x: 230, y: 181, n: 'Foco mesocárdico (Erb)', pos: '3.er EIC, borde esternal izquierdo' },
    tr: { x: 230, y: 213, n: 'Foco tricuspídeo', pos: '4.º-5.º EIC, borde esternal izquierdo (cerca del apéndice xifoides)' },
    mi: { x: 275, y: 246, n: 'Foco mitral (apexiano)', pos: '5.º EIC, línea medioclavicular izquierda' }
  };

  function torsoSvg(learn) {
    let b = `<path d="${NECK}" fill="${SKIN}" stroke="${LINE}" stroke-width="3"/><path d="${TORSO}" fill="${SKIN}" stroke="${LINE}" stroke-width="3"/>`;
    for (let j = 1; j <= 9; j++) {
      const y = 110 + 26 * (j - 1);
      b += `<path d="M210,${y} Q150,${y + 6} 68,${y + 52}" fill="none" stroke="#d6b99a" stroke-width="2"/>` +
           `<path d="M210,${y} Q270,${y + 6} 352,${y + 52}" fill="none" stroke="#d6b99a" stroke-width="2"/>`;
    }
    b += `<path d="M172,100 Q130,108 80,124 M248,100 Q290,108 340,124" fill="none" stroke="#a97d58" stroke-width="3"/>`;
    b += `<path d="M210,100 L210,305" fill="none" stroke="#a97d58" stroke-width="5" stroke-linecap="round" opacity=".7"/>`;
    b += `<circle cx="145" cy="218" r="6" fill="#c98f7a"/><circle cx="275" cy="218" r="6" fill="#c98f7a"/>`;
    if (learn) {
      b += `<ellipse cx="236" cy="212" rx="46" ry="60" transform="rotate(-12 236 212)" fill="#d9534f" opacity=".28"/>`;
      b += `<path d="M275,116 L275,330" stroke="#0e6a78" stroke-width="1.6" stroke-dasharray="6 5" fill="none"/>` +
           `<text class="svg-small" x="275" y="342" text-anchor="middle">LMC izq.</text>`;
      [[149, '2.º'], [181, '3.º'], [213, '4.º'], [246, '5.º']].forEach(([y, t]) => {
        b += `<path d="M96,${y} L340,${y}" stroke="#0e6a78" stroke-width="1" stroke-dasharray="2 6" opacity=".55"/>` +
             `<text class="svg-small" x="62" y="${y + 4}">${t} EIC</text>`;
      });
    }
    b += `<text x="40" y="40" class="svg-small">D</text><text x="372" y="40" class="svg-small">I</text>`;
    return b;
  }

  /* ----- capa anatómica translúcida (#anat): huesos y vísceras bajo la piel, misma escala que el torso ----- */
  const AC = { bone: '#f1e9dc', lung: '#d9a1a1', heart: '#c0504d', heartLt: '#d98b84', heartDk: '#a8403d', liver: '#9e4b3a', stom: '#d8b08c',
    kidney: '#8c4a3f', spleen: '#7a3b4a', vein: '#6b8fc9', art: '#c0504d', trach: '#e9dfd0', diaph: '#b36b5e', ink: '#5a4636' };
  const lbl = (x, y, t, anchor, extra) => `<text class="svg-small" x="${x}" y="${y}"${anchor ? ` text-anchor="${anchor}"` : ''}${extra ? ` style="${extra}"` : ''}>${t}</text>`;

  function anatAnt() {
    const K = AC;
    let a = '';
    // tráquea (anillos) y bronquios principales; la carina queda a la altura del ángulo de Louis
    a += `<path d="M203,22 L203,122 Q210,132 217,122 L217,22 Z" fill="${K.trach}" stroke="${K.ink}" stroke-width="1"/>`;
    for (let y = 30; y <= 118; y += 9) a += `<path d="M204,${y} L216,${y}" stroke="${K.ink}" stroke-width=".8" opacity=".6"/>`;
    a += `<path d="M205,124 L188,146 L180,166 M215,124 L240,150 L252,166" fill="none" stroke="${K.ink}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>` +
         `<path d="M205,124 L188,146 L180,166 M215,124 L240,150 L252,166" fill="none" stroke="${K.trach}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
    // pulmones (el izquierdo con la escotadura cardíaca y la língula)
    a += `<path d="M198,112 C185,94 160,92 145,100 C110,118 86,160 76,210 C68,250 64,300 70,338 C100,318 130,280 150,258 C170,254 190,254 198,250 Z" fill="${K.lung}" stroke="${K.ink}" stroke-width="1"/>`;
    a += `<path d="M222,112 C235,94 260,92 275,100 C310,118 334,160 344,210 C352,250 356,300 350,338 C320,318 290,280 270,258 L244,262 C256,240 268,215 262,200 C254,180 236,172 224,160 Z" fill="${K.lung}" stroke="${K.ink}" stroke-width="1"/>`;
    // cisuras: horizontal (4.ª costilla) y oblicuas (del 5.º arco lateral al 6.º cartílago costal)
    a += `<path d="M196,190 Q140,200 74,250" fill="none" stroke="${K.ink}" stroke-width="1" stroke-dasharray="4 3"/>` +
         `<path d="M72,250 Q105,270 150,258 M348,250 Q315,270 270,258" fill="none" stroke="${K.ink}" stroke-width="1" stroke-dasharray="4 3"/>`;
    a += lbl(104, 150, 'LSD') + lbl(100, 232, 'LMD') + lbl(84, 272, 'LID') + lbl(320, 150, 'LSI') + lbl(322, 300, 'LII') + lbl(254, 290, 'Língula', 'middle');
    // diafragma, hígado y estómago (espacio de Traube)
    a += `<path d="M70,322 C92,246 160,236 208,268 L244,274 C250,300 236,322 210,324 C160,342 100,348 70,322 Z" fill="${K.liver}" stroke="${K.ink}" stroke-width="1"/>`;
    a += `<path d="M262,290 C282,268 322,276 334,304 C342,334 322,362 292,358 C266,352 254,326 262,300 Z" fill="${K.stom}" stroke="${K.ink}" stroke-width="1"/>`;
    a += `<path d="M70,322 C92,246 160,236 208,268 M212,268 C262,250 330,262 350,328" fill="none" stroke="${K.diaph}" stroke-width="2.5"/>`;
    a += lbl(170, 282, 'Diafragma', 'middle') + lbl(120, 318, 'Hígado', 'middle') + lbl(300, 352, 'Estómago (esp. de Traube)', 'middle');
    // grandes vasos: cava superior, aorta ascendente y cayado, tronco pulmonar
    a += `<path d="M200,108 L200,160" stroke="${K.vein}" stroke-width="7" stroke-linecap="round"/>`;
    a += `<path d="M242,128 C238,160 236,200 238,250" fill="none" stroke="${K.art}" stroke-width="4" opacity=".55" stroke-dasharray="6 3"/>`;
    a += `<path d="M216,174 C214,150 210,136 214,122 C222,108 240,110 246,124" fill="none" stroke="${K.art}" stroke-width="9" stroke-linecap="round"/>`;
    a += `<path d="M224,160 C230,150 236,142 240,134 M240,134 L204,140 M240,134 L262,146" fill="none" stroke="#5b7fb5" stroke-width="6" stroke-linecap="round"/>`;
    // corazón: aurícula derecha, ventrículo derecho (cara anterior), ventrículo izquierdo (punta) y orejuela izquierda
    a += `<ellipse cx="254" cy="160" rx="14" ry="8" fill="${K.heartLt}" stroke="${K.ink}" stroke-width="1"/>`;
    a += `<path d="M197,160 C186,185 188,228 203,250 L222,248 C214,220 214,185 214,160 Z" fill="${K.heartLt}" stroke="${K.ink}" stroke-width="1"/>`;
    a += `<path d="M214,160 C214,185 214,220 222,248 L262,254 C252,220 244,185 240,158 Z" fill="${K.heart}" stroke="${K.ink}" stroke-width="1"/>`;
    a += `<path d="M240,158 C244,185 252,220 262,254 L280,250 C292,236 288,196 272,168 C266,160 252,156 240,158 Z" fill="${K.heartDk}" stroke="${K.ink}" stroke-width="1"/>`;
    a += `<path d="M197,160 C186,185 188,228 203,250 C230,262 262,264 280,250 C292,236 288,196 272,168 C262,150 236,140 222,150 C214,146 204,150 197,160 Z" fill="none" stroke="${K.ink}" stroke-width="1.4"/>`;
    a += lbl(188, 240, 'AD', 'end') + lbl(238, 230, 'VD', 'middle', 'fill:#fff') + lbl(270, 212, 'VI', 'middle', 'fill:#fff') + lbl(258, 168, 'AI', 'middle', 'fill:#fff');
    // huesos encima de las vísceras: clavículas, esternón con ángulo de Louis y xifoides, costillas y reborde costal
    for (let j = 1; j <= 9; j++) {
      const y = 110 + 26 * (j - 1);
      a += `<path d="M210,${y} Q150,${y + 6} 68,${y + 52} M210,${y} Q270,${y + 6} 352,${y + 52}" fill="none" stroke="${K.bone}" stroke-width="3" opacity=".75"/>`;
    }
    a += `<path d="M210,320 C190,330 150,345 110,345 C90,345 75,335 68,318 M210,320 C230,330 270,345 310,345 C330,345 345,335 352,318" fill="none" stroke="${K.bone}" stroke-width="3" opacity=".75"/>`;
    a += `<path d="M172,100 Q130,108 80,124 M248,100 Q290,108 340,124" fill="none" stroke="${K.ink}" stroke-width="9" stroke-linecap="round"/>` +
         `<path d="M172,100 Q130,108 80,124 M248,100 Q290,108 340,124" fill="none" stroke="${K.bone}" stroke-width="7" stroke-linecap="round"/>`;
    a += `<path d="M201,98 L219,98 L221,126 L217,128 L215,298 Q210,316 205,298 L203,128 L199,126 Z" fill="${K.bone}" fill-opacity=".6" stroke="${K.ink}" stroke-width="1"/>` +
         `<path d="M198,126 L222,126" stroke="${K.ink}" stroke-width="1.2"/>`;
    a += lbl(84, 112, 'Clavícula') + lbl(226, 131, 'Ángulo de Louis') + lbl(196, 308, 'Xifoides', 'end') + lbl(210, 30, 'Tráquea', 'middle');
    // válvulas (proyección real) y línea discontinua hacia el foco donde se propaga el sonido
    const V = [['P', 224, 160, 230, 149], ['A', 216, 176, 190, 149], ['M', 222, 194, 275, 246], ['T', 210, 212, 230, 213]];
    V.forEach(([t, x, y, fx, fy]) => {
      a += `<path d="M${x},${y} L${fx},${fy}" stroke="#2b2b2b" stroke-width="1.2" stroke-dasharray="3 3"/>`;
    });
    V.forEach(([t, x, y]) => {
      a += `<ellipse cx="${x}" cy="${y}" rx="7" ry="4.5" fill="#fff8e6" stroke="${K.ink}" stroke-width="1"/>` +
           `<text class="svg-small" x="${x}" y="${y + 3.5}" text-anchor="middle" style="font-size:9px;font-weight:700;fill:#2b2b2b">${t}</text>`;
    });
    a += lbl(210, 440, 'Válvulas: P pulmonar · A aórtica · M mitral · T tricúspide', 'middle') +
         lbl(210, 456, '- - - : el sonido de cada válvula se propaga hasta su foco de auscultación', 'middle');
    return a;
  }


  /* Pulsos periféricos (viewBox 460×720): trayecto de las arterias bajo los puntos de palpación. */
  function pulsAnat() {
    const K = AC, m = x => 460 - x;
    const art = (d, w, dash) => `<path d="${d}" fill="none" stroke="${K.art}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${dash ? ' stroke-dasharray="6 4"' : ''}/>`;
    const mir = d => d.replace(/([ML])(\d+(?:\.\d+)?),/g, (q, c, x) => c + m(+x) + ',').replace(/ (\d+(?:\.\d+)?),/g, (q, x) => ' ' + m(+x) + ',');
    let a = '';
    // corazón y cayado aórtico; aorta descendente y abdominal hasta la bifurcación ilíaca
    a += `<ellipse cx="238" cy="182" rx="22" ry="27" transform="rotate(-20 238 182)" fill="${K.heart}" stroke="${K.ink}" stroke-width="1"/>`;
    a += art('M232,165 L228,142 L244,140 L240,160 L238,200 L236,262 L236,278', 5);
    a += `<text class="svg-small" x="252" y="140">Cayado aórtico</text><text class="svg-small" x="250" y="236">Aorta</text>`;
    // ligamento inguinal (de la espina ilíaca anterosuperior al pubis): el pulso femoral se palpa bajo su punto medio
    a += `<path d="M176,334 L222,354 M284,334 L238,354" fill="none" stroke="${K.bone}" stroke-width="2.5" stroke-dasharray="5 3"/>`;
    const side = [
      ['M228,142 L218,124 L216,112 L214,100', 3.5, false],                 // carótida común
      ['M216,112 L214,100', 3.5, false],
      ['M232,142 L196,138 L168,146 L150,196 L132,250 L128,258', 3.5, false], // subclavia · axilar · braquial
      ['M128,258 L100,300 L76,366 L82,392', 2.5, false],                     // radial
      ['M128,258 L112,300 L100,366 L82,392', 2.5, false],                    // cubital y arco palmar
      ['M236,278 L214,318 L205,346', 4, false],                              // ilíaca común y externa
      ['M205,346 L203,420 L200,506', 3.5, false],                            // femoral (cara anteromedial del muslo)
      ['M200,506 L200,536', 3.5, true],                                      // poplítea (posterior, discontinua)
      ['M200,536 L206,590 L208,648 L200,690', 2.5, false],                   // tibial posterior (tras el maléolo medial)
      ['M200,536 L192,590 L190,650 L192,676 L188,696', 2.2, false]           // tibial anterior → pedia
    ];
    side.forEach(([d, w, dash]) => { a += art(d, w, dash) + art(mir(d), w, dash); });
    // rótulos en el lado izquierdo del paciente (los rótulos de los puntos quedan por fuera de cada miembro)
    const L = [[256, 100, 'A. carótida común'], [330, 214, 'A. braquial'], [396, 334, 'A. radial'], [250, 308, 'A. ilíaca'], [262, 420, 'A. femoral'],
      [262, 476, 'A. poplítea (posterior)'], [268, 586, 'A. tibial posterior'], [268, 602, 'A. tibial anterior → pedia']];
    L.forEach(([x, y, t]) => { a += `<text class="svg-small" x="${x}" y="${y}">${t}</text>`; });
    a += `<text class="svg-small" x="344" y="334" text-anchor="end">A. cubital</text>`;
    return a;
  }

  /* Cuello (vista lateral derecha, coordenadas locales en cm, giradas con el tronco): tráquea, ECM, carótida, yugulares, AD. */
  function nkAnat(th) {
    const K = AC, { PX, PY, K: sc } = NK;
    const ve = 'vector-effect="non-scaling-stroke"';
    let a = `<g transform="translate(${PX} ${PY}) rotate(${th + 180}) scale(${sc})">
      <path d="M20,9.3 L36,9.3 L40.5,8.3" fill="none" stroke="${K.bone}" stroke-width="3.5" ${ve} stroke-linecap="round"/>
      <path d="M51.5,6.4 L42,4.4" fill="none" stroke="${K.trach}" stroke-width="5" ${ve} stroke-linecap="round"/>
      <circle cx="49.5" cy="6.2" r=".7" fill="${K.bone}" stroke="${K.ink}" stroke-width="1" ${ve}/>
      <path d="M57,0.5 L41.5,8" fill="none" stroke="#c98a7a" stroke-width="7" ${ve} stroke-linecap="round" opacity=".75"/>
      <ellipse cx="29" cy="2.5" rx="5.5" ry="4" transform="rotate(-15 29 2.5)" fill="${K.heart}" stroke="${K.ink}" stroke-width="1" ${ve}/>
      <circle cx="31" cy="3.5" r=".7" fill="${K.heartLt}" stroke="${K.ink}" stroke-width="1" ${ve}/>
      <path d="M31,4.5 C34,6.8 37,7.6 40,7.7 L43.5,7.6 L50,6.8 L53.5,6.2 M53.5,6.2 L56.2,7.2 M53.5,6.2 L56.2,5.2" fill="none" stroke="${K.art}" stroke-width="2.5" ${ve} stroke-linecap="round"/>
      <path d="M33,4.2 C34.5,4.6 35.5,6 37,7.2 L51,5.7 L55.5,4.2" fill="none" stroke="${K.vein}" stroke-width="2.5" ${ve} stroke-linecap="round"/>
      <path d="M56.5,3 L44,2.4" fill="none" stroke="#7fa0d0" stroke-width="1.5" ${ve} stroke-dasharray="4 3"/>
    </g>`;
    const T = (x, y, t, anchor) => { const q = lpt(x, y, th); return `<text class="svg-small" x="${q.x.toFixed(1)}" y="${q.y.toFixed(1)}"${anchor ? ` text-anchor="${anchor}"` : ''}>${t}</text>`; };
    a += T(44, 11.5, 'Carótida') + T(50.5, 9, 'Yugular interna') + T(47, -1.5, 'ECM', 'middle') + T(31, 1, 'AD');
    a += `<text class="svg-small" x="60" y="70">Capa anatómica: carótida (rojo) · yugular interna (azul) · yugular externa (discontinua) · ECM (rosado) · tráquea (banda clara)</text>`;
    return a;
  }

  /* ============================================================ ESCENA 1: PRECORDIO */
  const POSTURES = { sup: 'decúbito dorsal', lat: 'decúbito lateral izquierdo', sen: 'sentado' };

  function ictusText(c) {
    const p = S.posture;
    if (p === 'lat') {
      return `En decúbito lateral izquierdo el choque de la punta se desplaza ≈2-3 cm hacia la axila y se hace más amplio y fácil de palpar: es normal en esta posición. Para decidir si está desplazado hay que localizarlo en <b>decúbito dorsal</b>.`;
    }
    if (p === 'sen') {
      return `Sentado el choque de la punta es más tenue y a veces no se palpa: no es anormal. Si no se encuentra, repetir en decúbito dorsal y luego en decúbito lateral izquierdo.`;
    }
    return `<i>Técnica:</i> palma y luego pulpejos de los dedos sobre el ápex, en decúbito dorsal. <i>Hallazgo normal:</i> <b>choque de la punta</b> en el 5.º EIC, <b>en o por dentro de la línea medioclavicular izquierda</b>, ` +
      `de <b>≈2 cm de diámetro</b> (una yema de dedo), <b>breve</b> (golpe suave de la primera parte de la sístole, no alcanza el R2), ` +
      `sincrónico con el pulso carotídeo. Sin levantamientos sostenidos ni frémito.`;
  }

  /* Vista 3D (js/torso3d.js): focos cardíacos del glb → regiones del esquema (el resto de regiones queda solo en el esquema) */
  const T3D = {
    view: 'ant',
    map: { Foco_Aortico: 'ao', Foco_Pulmonar: 'pu', Foco_Erb: 'er', Foco_Tricuspideo: 'tr', Foco_Mitral: 'mi' },
    layers: { pulm: false, huesos: false, lineas: false },   // solo corazón y grandes vasos; el resto se activa con los botones de capas
    hint: 'Vista 3D: arrastra para girar, rueda o pellizco para acercar. Haz clic sobre un foco para explorarlo con el instrumento elegido; «Anatomía» regula la transparencia de la piel.'
  };

  const precordio = {
    id: 'pre', label: 'Precordio', viewBox: '0 0 420 560', redrawOnMode: true,
    hint: 'Inspecciona y palpa el precordio con el paciente en decúbito dorsal; cambia la posición para ver su efecto sobre el choque de la punta.',
    svg: learn => torsoSvg(learn),
    anatomy: () => anatAnt(),
    torso3d: T3D,
    tools: [
      { id: 'insp', icon: '👁️', label: 'Inspección', hint: 'Mira de frente y tangencialmente: abombamientos, cicatrices, latidos visibles (choque de la punta).' },
      { id: 'palp', icon: '🖐️', label: 'Palpación', hint: 'Palma/yemas: choque de la punta en el 5.º EIC, levantamientos paraesternales y frémitos en la base.' },
      { id: 'loc', icon: '📍', label: 'Localizar foco', hint: 'Haz clic en un foco para ver su localización anatómica; cuenta los EIC desde el ángulo esternal.' }
    ],
    regions: [
      {
        id: 'lu', label: 'Ángulo esternal (de Louis)', short: 'Louis', cx: 210, cy: 126, r: 10, lx: 196, ly: 123, anchor: 'end',
        tools: {
          insp: 'Reborde óseo transversal en la unión manubrio-cuerpo del esternón. Marca el 2.º cartílago costal: punto de partida para contar costillas y EIC.',
          palp: 'Cresta transversal palpable en la línea media; se desliza el dedo lateralmente hasta la 2.ª costilla y se baja al 2.º EIC.',
          loc: 'Ángulo de Louis: 2.ª costilla/2.º cartílago costal. El espacio justo debajo es el 2.º EIC. También es la referencia para medir la presión venosa yugular (la aurícula derecha está ≈5 cm por debajo).'
        }
      },
      {
        id: 'fu', label: 'Fúrcula esternal (hueco supraesternal)', short: 'Fúrcula', cx: 210, cy: 102, r: 9, lx: 226, ly: 98, anchor: 'start',
        tools: {
          insp: 'Tráquea en la línea media, sin latido anormal visible ni retracción.',
          palp: 'Tráquea central y móvil. No se palpa el arco aórtico; <b>sin frémito</b> ni latido sobreelevado.',
          loc: 'Hueco por encima del manubrio: se usa para comprobar la posición de la tráquea y para detectar frémitos del arco aórtico.'
        }
      },
      {
        id: 'ao', label: 'Foco aórtico', short: 'Aórtico', cx: 190, cy: 149, r: 13, lx: 176, ly: 153, anchor: 'end',
        tools: {
          insp: 'Sin abombamiento ni latidos visibles. Tórax simétrico, sin cicatrices ni deformidades (sin pectus ni cifoescoliosis marcada).',
          palp: 'Sin <b>frémito</b> ni latidos palpables; no se palpa el cierre aórtico del R2.',
          loc: `${FOCI.ao.n}: ${FOCI.ao.pos}. Aquí se oye mejor el componente aórtico del R2 (A2) y los soplos eyectivos aórticos.`
        }
      },
      {
        id: 'pu', label: 'Foco pulmonar', short: 'Pulmonar', cx: 230, cy: 149, r: 13, lx: 244, ly: 153, anchor: 'start',
        tools: {
          insp: 'Sin abombamiento ni pulsaciones visibles.',
          palp: 'Sin frémito. No se palpa el componente pulmonar del R2 (en jóvenes delgados puede percibirse levemente sin significado patológico).',
          loc: `${FOCI.pu.n}: ${FOCI.pu.pos}. Se oye mejor el componente pulmonar del R2 (P2) y su desdoblamiento fisiológico en inspiración.`
        }
      },
      {
        id: 'er', label: 'Foco mesocárdico (Erb)', short: 'Mesocárdico', cx: 230, cy: 181, r: 13, lx: 246, ly: 185, anchor: 'start',
        tools: {
          insp: 'Sin latidos ni abombamientos visibles.',
          palp: 'Sin frémito ni latidos palpables.',
          loc: `${FOCI.er.n}: ${FOCI.er.pos}. Foco donde se perciben bien los fenómenos de las válvulas aórtica y pulmonar (p. ej. el soplo regurgitativo aórtico).`
        }
      },
      {
        id: 'tr', label: 'Foco tricuspídeo y borde paraesternal izquierdo', short: 'Tricúspide', cx: 230, cy: 213, r: 13, lx: 244, ly: 217, anchor: 'start',
        tools: {
          insp: 'Sin latidos paraesternales visibles ni abombamiento del hemitórax izquierdo.',
          palp: 'Con la base de la mano (talón) sobre el borde esternal izquierdo, 3.º-5.º EIC, durante una espiración breve: <b>sin levantamientos paraesternales</b> (ventrículo derecho no hiperdinámico ni sobrecargado), sin frémitos.',
          loc: `${FOCI.tr.n}: ${FOCI.tr.pos}. Mejor lugar para los ruidos de la válvula tricúspide y del ventrículo derecho.`
        }
      },
      {
        id: 'mi', label: 'Foco mitral · choque de la punta', short: 'Mitral / punta', cx: 275, cy: 246, r: 14, lx: 275, ly: 272, anchor: 'middle',
        tools: {
          insp: (c, ctx) => {
            const vis = bmi(c) < 25.2 && !elder(c) && S.posture !== 'sen';
            if (vis) {
              return {
                html: 'En decúbito dorsal se ve un <b>pequeño latido en el 5.º EIC, en o por dentro de la LMC</b>, de ≈2 cm, sincrónico con el pulso (el choque de la punta solo es visible en una parte de las personas sanas, sobre todo delgadas). Sin abombamientos precordiales ni retracciones sistólicas.',
                run: x => pulseFx(x.svg, x.point, c.v.hr, 4, { col: '#e0a030', r0: 4, dr: 9 })
              };
            }
            return 'No se ve el choque de la punta: es normal (en adultos con tórax grueso, mayores o sentados con frecuencia no se ve). Sin abombamientos ni retracciones sistólicas; tórax simétrico.';
          },
          palp: (c, ctx) => ({
            html: ictusText(c) + ` <span style="color:var(--muted)">(Posición: ${POSTURES[S.posture]}.)</span>`,
            run: x => { if (S.posture !== 'sen') pulseFx(x.svg, x.point, c.v.hr, 6, { col: '#d9534f', r0: S.posture === 'lat' ? 9 : 6, dr: 14 }); }
          }),
          loc: `${FOCI.mi.n}: ${FOCI.mi.pos}. Corresponde a la punta del ventrículo izquierdo; aquí se palpa el choque de la punta y se auscultan mejor el R1 y los fenómenos mitrales.`
        }
      },
      {
        id: 'ep', label: 'Epigastrio', short: 'Epigastrio', cx: 210, cy: 336, r: 16, lx: 210, ly: 312, anchor: 'middle',
        tools: {
          insp: 'En personas delgadas puede verse una pulsación epigástrica leve (aorta abdominal), sin significado. Sin latido sostenido.',
          palp: 'Pulsación aórtica abdominal suave y sin expansión. <b>Sin latido epigástrico sostenido</b> del ventrículo derecho (signo de Harzer negativo).',
          loc: 'Zona epigástrica, bajo el apéndice xifoides: se palpa la aorta abdominal y se descarta un latido del ventrículo derecho.'
        }
      }
    ],
    after: (stage, sh, ctx) => {
      leaveAll(); injectCss();
      S.posture = 'sup';
      const bar = document.createElement('div');
      bar.className = 'cv-bar';
      bar.innerHTML = segHtml('post', 'Posición del paciente:', [['sup', 'Decúbito dorsal'], ['lat', 'Decúbito lateral izq.'], ['sen', 'Sentado']], 'sup') +
        `<span class="cv-read" id="cvPostTxt" style="color:var(--muted)">Recomendada: decúbito dorsal con la cabecera a ≈30°, examinador a la derecha del paciente.</span>`;
      stage.appendChild(bar);
      bindSeg(bar, 'post', v => {
        S.posture = v;
        bar.querySelector('#cvPostTxt').textContent = v === 'lat'
          ? 'El choque de la punta se acerca a la pared y se palpa mejor (se desplaza ≈2-3 cm).'
          : v === 'sen' ? 'Sentado el choque de la punta se palpa peor.' : 'Recomendada: decúbito dorsal con la cabecera a ≈30°.';
      });
    },
    onLeave: leaveAll
  };

  /* ============================================================ ESCENA 2: AUSCULTACIÓN */
  const FOC = {
    ao: { s1: 0.75, s2: 1.25, base: true, desc: 'R1 suave y <b>R2 intenso</b> (cierre aórtico, A2).' },
    pu: { s1: 0.75, s2: 1.2, base: true, desc: 'R1 suave y <b>R2 intenso</b> (A2 con P2).' },
    er: { s1: 0.9, s2: 1.1, base: true, desc: 'R1 y R2 de intensidad similar.' },
    tr: { s1: 1.1, s2: 0.85, base: false, desc: 'R1 (componente tricuspídeo) algo mayor que R2.' },
    mi: { s1: 1.3, s2: 0.7, base: false, desc: '<b>R1 intenso</b> (cierre mitral) y R2 más débil.' }
  };

  function auscHtml(id, c, tool) {
    const f = FOC[id], hr = c.v.hr;
    let t = `FC ${hr} lpm, rítmica. ${f.desc} `;
    if (tool === 'bell') {
      t = `Campana (presión leve; filtra los agudos, R1 y R2 se atenúan): FC ${hr} lpm, rítmica. Ruidos graves: <b>sin R4</b>, sin rolido diastólico ni ruidos añadidos. `;
      if (c.age < 35 && S.posture === 'lat' && id === 'mi') {
        t += '<b>R3 fisiológico</b>: ruido suave, grave y protodiastólico (≈0,12-0,18 s tras el R2), normal en jóvenes (<35-40 años); desaparece al sentarse. ';
      } else {
        t += '<b>R3 ausente</b> (el R3 fisiológico puede oírse en jóvenes en decúbito lateral izquierdo, en la punta y con la campana). ';
      }
    } else {
      t += 'Silencios sistólico y diastólico limpios: <b>sin soplos</b>, sin clics, chasquidos ni frote pericárdico; R3 y R4 ausentes. ';
    }
    if (S.posture === 'lat') {
      t += id === 'mi' ? 'En decúbito lateral izquierdo la punta se acerca a la pared: ruidos más nítidos; es la mejor posición para R3, R4 y el rolido mitral (ausentes aquí). ' : 'Esta posición no mejora este foco. ';
    } else if (S.posture === 'fwd') {
      t += (id === 'ao' || id === 'er') ? 'Sentado, inclinado hacia delante y en apnea espiratoria la raíz aórtica se acerca a la pared: mejor posición para un soplo regurgitativo aórtico o un frote pericárdico (ausentes). ' : 'Esta posición no mejora este foco. ';
    }
    if (S.breath === 'insp') {
      if (id === 'pu') t += '<b>Inspiración: desdoblamiento fisiológico del R2</b> (A2 seguido de P2, separados ≈0,03-0,04 s), que desaparece en espiración. ';
      else if (id === 'tr') t += 'Inspiración: los fenómenos derechos aumentan ligeramente; sin soplos. ';
      else if (id === 'ao') t += 'Inspiración: el R2 se mantiene único en el foco aórtico (solo se oye A2). ';
    } else if (S.breath === 'esp') {
      t += id === 'pu' ? 'Espiración: R2 único (A2 y P2 casi superpuestos). ' : 'Espiración: los fenómenos izquierdos se oyen algo mejor. ';
    }
    return t;
  }

  function specFor(id, c, tool) {
    const f = FOC[id];
    const heart = { rate: c.v.hr, s1: f.s1, s2: f.s2 };
    if (tool === 'bell') { heart.s1 = f.s1 * 0.8; heart.s2 = f.s2 * 0.8; }
    if (tool === 'bell' && c.age < 35 && S.posture === 'lat' && id === 'mi') heart.s3 = 1;
    /* desdoblamiento fisiológico del R2 en inspiración (foco pulmonar): el motor acepta s2split en ms; si no lo conoce, lo ignora */
    if (id === 'pu' && S.breath === 'insp') heart.s2split = 40;
    return { heart, heartGain: 1, mode: tool === 'bell' ? 'bell' : 'diaphragm' };
  }

  function listenAt(id, logIt) {
    const k = S.cur;
    if (!k || k.kind !== 'aus') return;
    const sh = k.sh, c = sh.case, tool = sh.tool === 'bell' ? 'bell' : 'steth';
    Sound.listen(specFor(id, c, tool));
    S.active = id; S.peaks = null;
    S.split = id === 'pu' && S.breath === 'insp';
    const a = k.svg.querySelector('#cvAct'), pt = FOCI[id];
    a.style.display = ''; a.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
    k.stage.querySelector('#cvTitle').textContent = pt.n;
    k.stage.querySelector('#cvSub').textContent = (tool === 'bell' ? 'Campana' : 'Diafragma') + ' · ' + (S.breath === 'insp' ? 'inspiración' : S.breath === 'esp' ? 'espiración' : 'respiración normal');
    if (logIt) sh.log(`<b>${pt.n}</b> (${tool === 'bell' ? 'campana' : 'diafragma'}): ${auscHtml(id, c, tool)}`, 'find');
  }

  function drawPcg(cv, sh) {
    const g = cv.getContext('2d'), W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H);
    const cs = getComputedStyle(document.body);
    const ink = cs.getPropertyValue('--muted').trim() || '#666', brand = cs.getPropertyValue('--brand').trim() || '#0e6a78';
    g.strokeStyle = ink; g.globalAlpha = 0.35; g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke(); g.globalAlpha = 1;
    const cur = Sound.current();
    if (!cur) { g.fillStyle = ink; g.font = '13px system-ui'; g.fillText('El fonocardiograma aparece al auscultar un foco.', 14, H / 2 + 4); return; }
    if (!S.peaks || S.peaksSrc !== cur.arr) {
      S.peaksSrc = cur.arr;
      const n = W, step = cur.arr.length / n; S.peaks = new Float32Array(n);
      for (let x = 0; x < n; x++) {
        let m = 0; for (let i = Math.floor(x * step); i < Math.floor((x + 1) * step); i++) m = Math.max(m, Math.abs(cur.arr[i]));
        S.peaks[x] = m;
      }
    }
    g.strokeStyle = brand; g.lineWidth = 1.5; g.beginPath();
    for (let x = 0; x < W; x++) {
      const a = Math.min(1, S.peaks[x] * cur.gain * 1.4) * (H / 2 - 4);
      g.moveTo(x + 0.5, H / 2 - a); g.lineTo(x + 0.5, H / 2 + a);
    }
    g.stroke();
    const t = Sound.timing(cur.spec.rate);
    if (sh.mode === 'learn') {
      g.fillStyle = ink; g.font = '11px system-ui';
      g.fillText('R1', t.tS1 / t.T * W - 4, 11); g.fillText('R2', t.tS2 / t.T * W - 4, 11);
      g.fillText('sístole', (t.tS1 + 0.1) / t.T * W, H - 5); g.fillText('diástole', (t.tS2 + 0.15) / t.T * W, H - 5);
    }
    if (S.split) {
      const x2 = (t.tS2 + 0.04) / t.T * W;
      g.strokeStyle = '#e0a030'; g.lineWidth = 3; g.beginPath(); g.moveTo(x2, H / 2 - 14); g.lineTo(x2, H / 2 + 14); g.stroke();
      g.fillStyle = '#e0a030'; g.font = '11px system-ui'; g.fillText('P2 (R2 desdoblado)', x2 + 5, H / 2 - 16);
    }
    const x = cur.pos * W;
    g.strokeStyle = '#d9534f'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke();
  }

  const focReg = (id, short, lx, ly, anchor) => ({
    id, label: FOCI[id].n, short, cx: FOCI[id].x, cy: FOCI[id].y, r: 14, lx, ly, anchor,
    tools: {
      steth: (c, ctx) => ({ html: auscHtml(id, c, 'steth'), run: () => listenAt(id, false) }),
      bell: (c, ctx) => ({ html: auscHtml(id, c, 'bell'), run: () => listenAt(id, false) })
    }
  });

  const auscultacion = {
    id: 'aus', label: 'Auscultación normal', viewBox: '0 0 420 560', redrawOnMode: true,
    hint: 'Ausculta los 5 focos con diafragma y campana. Cambia la posición y la fase respiratoria y observa el fonocardiograma.',
    svg: learn => torsoSvg(learn),
    anatomy: () => anatAnt(),
    torso3d: T3D,
    tools: [
      { id: 'steth', icon: '🩺', label: 'Fonendoscopio · diafragma', hint: 'Diafragma, presión firme: ruidos agudos (R1, R2, soplos).' },
      { id: 'bell', icon: '🔔', label: 'Fonendoscopio · campana', hint: 'Campana, presión leve: ruidos graves (R3, R4, rolido mitral).' }
    ],
    regions: [
      focReg('ao', 'Aórtico', 176, 153, 'end'), focReg('pu', 'Pulmonar', 244, 153, 'start'), focReg('er', 'Mesocárdico', 246, 185, 'start'),
      focReg('tr', 'Tricúspide', 244, 217, 'start'), focReg('mi', 'Mitral', 275, 272, 'middle')
    ],
    after: (stage, sh, ctx) => {
      leaveAll(); injectCss();
      S.live = true; const tok = ++S.tok;
      S.posture = 'sup'; S.breath = 'norm'; S.active = null; S.peaks = null; S.split = false;
      S.cur = { kind: 'aus', sh, svg: ctx.svg, stage, scene: ctx.scene };
      const act = document.createElementNS(NS, 'g');
      act.setAttribute('id', 'cvAct'); act.setAttribute('style', 'display:none;pointer-events:none');
      act.innerHTML = '<circle r="17" fill="#0e6a78" opacity=".25"><animate attributeName="r" values="14;24;14" dur="1.4s" repeatCount="indefinite"/></circle><circle r="8" fill="#0e6a78" stroke="#fff" stroke-width="2"/>';
      ctx.svg.appendChild(act);
      stage.insertAdjacentHTML('beforeend', `
        <div class="wave cv-wave">
          <div class="where"><b id="cvTitle">Sin escucha</b><span id="cvSub">Elige un instrumento y haz clic en un foco.</span></div>
          <canvas id="cvPcg" width="600" height="120"></canvas>
          <button class="btn small" id="cvStop" style="width:auto;margin:0">Detener</button>
        </div>
        <div class="cv-bar">${segHtml('post', 'Posición:', [['sup', 'Decúbito dorsal'], ['lat', 'Lateral izq.'], ['fwd', 'Sentado inclinado']], 'sup')}
          ${segHtml('resp', 'Respiración:', [['norm', 'Normal'], ['insp', 'Inspiración'], ['esp', 'Espiración']], 'norm')}</div>
        <div class="cv-note"><b>Qué esperar:</b> R1 (S1; cierre mitral y tricuspídeo) más intenso en la punta; R2 (S2; cierre aórtico y pulmonar) más intenso en la base; ritmo regular; sin soplos; R3 y R4 ausentes (el R3 puede ser fisiológico en jóvenes). En inspiración el R2 se desdobla de forma fisiológica en el foco pulmonar.</div>`);
      stage.querySelector('#cvStop').addEventListener('click', () => {
        Sound.stop(); S.active = null; ctx.svg.querySelector('#cvAct').style.display = 'none';
        stage.querySelector('#cvTitle').textContent = 'Sin escucha';
        stage.querySelector('#cvSub').textContent = 'Elige un instrumento y haz clic en un foco.';
      });
      const bars = stage.querySelectorAll('.cv-bar')[0];
      bindSeg(bars, 'post', v => {
        S.posture = v;
        if (S.active) listenAt(S.active, true);
        else sh.log(v === 'lat' ? 'Decúbito lateral izquierdo: acerca la punta a la pared (mejor para R3, R4 y rolido mitral, con campana).'
          : v === 'fwd' ? 'Sentado e inclinado hacia delante, en apnea espiratoria: mejor para los soplos de la base (regurgitativo aórtico, frote).' : 'Decúbito dorsal: posición estándar.', '');
      });
      bindSeg(bars, 'resp', v => {
        S.breath = v;
        if (S.active) listenAt(S.active, true);
        else sh.log(v === 'insp' ? 'Inspiración: ausculta el foco pulmonar para oír el desdoblamiento fisiológico del R2.' : v === 'esp' ? 'Espiración: R2 único; los fenómenos izquierdos se oyen algo mejor.' : 'Respiración normal.', '');
      });
      const sc = ctx.scene;
      if (!sc._cvWrap) {
        const o = sc.setTool;
        sc.setTool = function (id) { o.call(this, id); if (S.cur && S.cur.kind === 'aus' && S.active) listenAt(S.active, true); };
        sc._cvWrap = true;
      }
      const cv = stage.querySelector('#cvPcg');
      const loop = () => { if (!S.live || tok !== S.tok) return; drawPcg(cv, sh); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    },
    onLeave: leaveAll
  };

  /* ============================================================ ESCENA 3: CUELLO Y YUGULARES */
  const NK = { PX: 560, PY: 440, K: 6 };
  function lpt(x, y, th) {
    const a = (th + 180) * Math.PI / 180;
    return { x: NK.PX + NK.K * (x * Math.cos(a) - y * Math.sin(a)), y: NK.PY + NK.K * (x * Math.sin(a) + y * Math.cos(a)) };
  }
  const NA = { ijv: [49, 5.6], car: [43.5, 7.6], ang: [36, 10], hig: [14, 9] };
  const TH0 = 45;
  const yv = x => 7.2 - 0.107 * (x - 37);
  const jvpOf = c => (c.age < 35 ? 2.5 : c.age < 60 ? 3 : 3.5);
  function veinTop(th, Jp) {
    const r = th * Math.PI / 180, s = Math.sin(r), cc = Math.cos(r);
    const h = x => (x - 36) * s + (yv(x) - 10) * cc;
    if (h(51) <= Jp) return 51;
    if (h(37) >= Jp) return 37;
    return 37 + (Jp - h(37)) / (h(51) - h(37)) * 14;
  }
  const gs = (p, mu, sg) => { let d = Math.abs(p - mu); d = Math.min(d, 1 - d); return Math.exp(-0.5 * (d / sg) * (d / sg)); };
  const jug = p => 0.55 * gs(p, 0.97, 0.035) + 0.18 * gs(p, 0.10, 0.02) - 0.30 * gs(p, 0.22, 0.055) + 0.42 * gs(p, 0.43, 0.055) - 0.28 * gs(p, 0.66, 0.07);
  const art = p => (p < 0.15 ? gs(p, 0.15, 0.045) : gs(p, 0.15, 0.09)) + 0.16 * gs(p, 0.43, 0.04) - 0.12 * gs(p, 0.38, 0.02);

  function nkMarkup(th, J) {
    const { PX, PY, K } = NK;
    const Sa = lpt(36, 10, th), Rx = Math.min(Sa.x + 90, 760);
    let m = `<path d="M${PX},${PY - 48} L760,${PY - 28} L760,${PY + 36} L${PX},${PY + 57} Z" fill="${SKIN}"/>` +
      `<path d="M${PX},${PY - 48} L760,${PY - 28} L760,${PY + 36} L${PX},${PY + 57}" fill="none" stroke="${LINE}" stroke-width="2.5" stroke-linejoin="round"/>` +
      `<rect x="30" y="${PY + 60}" width="730" height="16" rx="6" fill="#aebccb"/>`;
    m += `<g transform="translate(${PX} ${PY}) rotate(${th + 180}) scale(${K})">
      <rect x="-3" y="-12.4" width="50" height="2" rx=".8" fill="#aebccb"/>
      <circle cx="58.5" cy="3.5" r="9.5" fill="${SKIN}" stroke="${LINE}" stroke-width="2.5" vector-effect="non-scaling-stroke"/>
      <path d="M62,12.6 L64.2,15.4 L66,12" fill="${SKIN}" stroke="${LINE}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" transform="translate(-5 -2.4)"/>
      <ellipse cx="57.4" cy="1.6" rx="1.3" ry="2.1" fill="#e0b08c" stroke="${LINE}" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
      <path d="M-3,-9.5 L38,-10.5 L43,-8 L46,-5.5 L50,-5 L50,7.5 L45,7.2 L41.5,8.8 L36,10 L28,10.5 L14,9 L0,8 L-3,8 Z" fill="${SKIN}"/>
      <path d="M50,-5 L46,-5.5 L43,-8 L38,-10.5 L-3,-9.5 M50,7.5 L45,7.2 L41.5,8.8 L36,10 L28,10.5 L14,9 L0,8 L-3,8" fill="none" stroke="${LINE}" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="M41.2,9.2 L41.2,6.4" stroke="#a97d58" stroke-width="2" vector-effect="non-scaling-stroke"/>
      <path id="nkV1" d="M37,${yv(37)} L51,${yv(51)}" stroke="#9db8d6" stroke-width="1" fill="none" stroke-linecap="round"/>
      <path id="nkV2" d="M37,${yv(37)} L37,${yv(37)}" stroke="#2f62a8" stroke-width="1" fill="none" stroke-linecap="round"/>
      <path d="M41.2,9.2 L41.2,6.4" stroke="#a97d58" stroke-width="2" vector-effect="non-scaling-stroke"/>
      <circle cx="36" cy="10" r=".7" fill="#d9534f"/>
    </g>`;
    /* referencias de medida (solo Aprendizaje; con el tronco casi horizontal no se mide y la regla se omite) */
    const zero = Sa.y;
    if (th < 25) {
      m += `<text class="svg-small" x="60" y="34">Paciente semisentado: inclinación del tronco ${th}°</text>
      <text class="svg-small" x="60" y="52">Con el tronco casi horizontal las yugulares se llenan: eleva a ≈45° para medir</text>`;
      return { html: m, Sa, Rx };
    }
    m += `<g class="hintring">
      <path d="M${Sa.x},${zero} L${Rx},${zero}" stroke="#237a4b" stroke-width="1.6" stroke-dasharray="5 4"/>
      <rect x="${Rx - 9}" y="${zero - 4 * K}" width="18" height="${4 * K}" fill="#237a4b" opacity=".22"/>
      <path d="M${Rx},${zero} L${Rx},${zero - 10 * K}" stroke="#38495a" stroke-width="1.6"/>`;
    for (let i = 0; i <= 10; i++) {
      m += `<path d="M${Rx - (i % 2 ? 4 : 7)},${zero - i * K} L${Rx + (i % 2 ? 4 : 7)},${zero - i * K}" stroke="#38495a" stroke-width="1.2"/>`;
      if (i % 2 === 0) m += `<text class="svg-small" x="${Rx + 11}" y="${zero - i * K + 4}">${i}</text>`;
    }
    m += `<text class="svg-small" x="${Rx - 4}" y="${zero - 10 * K - 8}" text-anchor="middle">cm sobre el ángulo</text>
      <circle cx="${Rx}" cy="${zero + 5 * K}" r="4" fill="#d9534f"/>
      <text class="svg-small" x="${Rx}" y="${zero + 5 * K + 16}" text-anchor="middle">Aurícula derecha</text>
      <text class="svg-small" x="${Rx}" y="${zero + 5 * K + 30}" text-anchor="middle">(≈5 cm bajo el ángulo)</text>
      <path id="nkLvl" d="M0,0 L0,0" stroke="#0e6a78" stroke-width="2" stroke-dasharray="3 3"/>
      <text class="svg-hint" id="nkRead" x="${Sa.x - 8}" y="${zero - 80}" text-anchor="end"></text>
    </g>`;
    m += `<text class="svg-small" x="60" y="34">Paciente semisentado: inclinación del tronco ${th}°</text>
      <text class="svg-small" x="60" y="52">Cabeza ligeramente girada al lado contrario del explorado</text>`;
    return { html: m, Sa, Rx };
  }

  function carotidText(c) {
    const side = S.side === 'D' ? 'derecha' : 'izquierda';
    return `<i>Técnica:</i> pulpejos de los dedos en el borde anterior del esternocleidomastoideo, a la altura del cartílago cricoides, <b>un lado cada vez</b> y sin masajear (riesgo de reflejo del seno carotídeo). ` +
      `<i>Hallazgo normal:</i> carótida ${side} con pulso <b>2+</b>, rítmico a ${c.v.hr} lpm, amplitud normal, ascenso rápido y descenso más lento, un solo pico por latido, simétrico con el otro lado; sin frémito.`;
  }

  const cuello = {
    id: 'cue', label: 'Cuello y yugulares', viewBox: '0 0 780 500',
    hint: 'Ajusta la inclinación del tronco (≈45°), observa la columna venosa yugular interna y compárala con el pulso carotídeo.',
    svg: () => '',
    tools: [
      { id: 'insp', icon: '👁️', label: 'Inspección', hint: 'Tangencial, con luz lateral: busca el pulso venoso yugular y el menisco.' },
      { id: 'palp', icon: '🖐️', label: 'Palpación', hint: 'Compara el pulso carotídeo (palpable) con el pulso venoso (no palpable).' },
      { id: 'aus', icon: '🩺', label: 'Auscultar carótida', hint: 'Diafragma sobre la carótida con el paciente conteniendo la respiración un momento.' },
      { id: 'rhy', icon: '✋', label: 'Reflujo hepatoyugular', hint: 'Presión firme sobre el hipocondrio derecho durante 10–30 s, con respiración tranquila (sin Valsalva), observando la columna yugular.' }
    ],
    regions: [
      {
        id: 'ijv', label: 'Vena yugular interna derecha', short: 'Yugular interna', cx: nkPosX('ijv'), cy: nkPosY('ijv'), r: 17, lx: nkPosX('ijv') - 26, ly: nkPosY('ijv') - 14, anchor: 'end',
        tools: {
          insp: (c) => {
            const th = S.angle, J = jvpOf(c), xt = veinTop(th, J);
            if (xt >= 50.5) return `A ${th}° (poco incorporado) la columna venosa llega hasta el ángulo mandibular: es lo esperado con el tronco casi horizontal y no indica ingurgitación. Eleva el tronco hasta ≈45° para medir.`;
            if (xt < 42) return `A ${th}° el menisco queda por debajo de la clavícula: <b>no se ven las yugulares</b>, lo normal con el tronco erguido. Reclina a la persona hacia 45° (30-60°) hasta ver el pulso venoso.`;
            return `<i>Técnica:</i> tronco a ${th}°, cabeza algo girada al lado opuesto, luz tangencial. <i>Hallazgo normal:</i> <b>pulso venoso ondulante, bifásico</b> (ondas a y v, descensos x e y) en la base del cuello; <b>columna ≈${fmt(J)} cm sobre el ángulo esternal</b> (normal ≤3-4 cm): <b>sin ingurgitación yugular</b>. El nivel baja en inspiración y la columna se colapsa al sentarse.`;
          },
          palp: 'El pulso venoso <b>no es palpable</b>; desaparece al comprimir suavemente la vena en la base del cuello y su nivel cae en inspiración. El pulso carotídeo, en cambio, se palpa y no se modifica con la presión suave.'
        }
      },
      {
        id: 'car', label: 'Arteria carótida (un lado cada vez)', short: 'Carótida', cx: nkPosX('car'), cy: nkPosY('car'), r: 15, lx: nkPosX('car') - 22, ly: nkPosY('car') + 4, anchor: 'end',
        tools: {
          insp: 'Latido carotídeo apenas visible: un solo impulso por latido, de dentro hacia fuera, que no cambia con la respiración ni con la posición del paciente.',
          palp: (c, ctx) => ({
            html: carotidText(c),
            run: x => pulseFx(x.svg, x.point, c.v.hr, 6, { beep: 560, col: '#d9534f' })
          }),
          aus: 'Con el diafragma sobre cada carótida y con apnea breve: <b>sin soplo</b> carotídeo, ruidos cardíacos transmitidos únicamente.'
        }
      },
      {
        id: 'ang', label: 'Ángulo esternal (de Louis)', short: 'Ángulo esternal', cx: nkPosX('ang'), cy: nkPosY('ang'), r: 14, lx: nkPosX('ang') - 14, ly: nkPosY('ang') + 24, anchor: 'end',
        tools: {
          insp: 'Referencia ósea para medir la presión venosa: distancia vertical entre el ángulo esternal y el punto más alto del pulso venoso (normal ≤3-4 cm a 45°, que equivale a una presión venosa central ≈8-9 cmH₂O como máximo, pues la aurícula derecha está ≈5 cm por debajo del ángulo).',
          palp: 'Reborde transversal palpable (unión manubrio-cuerpo del esternón, 2.ª costilla). Se traza una horizontal desde el menisco venoso hasta una regla vertical apoyada en este punto.'
        }
      },
      {
        id: 'hig', label: 'Hipocondrio derecho (hígado)', short: 'Hipocondrio dcho.', cx: nkPosX('hig'), cy: nkPosY('hig'), r: 30, lx: nkPosX('hig'), ly: nkPosY('hig') + 48, anchor: 'middle',
        tools: {
          rhy: (c) => ({
            html: '<i>Técnica:</i> presión firme y mantenida sobre el hipocondrio derecho (10–30 s según la fuente), respirando con normalidad, sin Valsalva. <i>Hallazgo normal:</i> <b>reflujo hepatoyugular negativo</b>: la columna yugular sube solo de forma transitoria (<3 cm) y vuelve a su nivel en pocos latidos aunque se mantenga la compresión. Sería positivo si se mantuviera elevada (≥3-4 cm) durante toda la compresión.',
            run: () => {
              if (S.bc) S.bc();
              S.bc = U.tween(1200, u => { S.boost = 1.6 * u; }, () => {
                S.bc = U.tween(3500, u => { S.boost = 1.6 * (1 - u); }, () => { S.boost = 0; S.bc = null; });
              });
            }
          })
        }
      }
    ],
    after: (stage, sh, ctx) => {
      leaveAll(); injectCss();
      S.live = true; const tok = ++S.tok;
      S.angle = 45; S.side = 'D'; S.boost = 0;
      S.cur = { kind: 'cue', sh };
      const svg = ctx.svg, c = sh.case;
      const dyn = document.createElementNS(NS, 'g');
      dyn.setAttribute('id', 'nkdyn'); dyn.setAttribute('style', 'pointer-events:none');
      svg.insertBefore(dyn, svg.querySelector('#hits'));
      /* capa anatómica propia (clase .anat): se redibuja con cada cambio de inclinación y el Shell regula su opacidad */
      const anatG = document.createElementNS(NS, 'g');
      anatG.setAttribute('class', 'anat'); anatG.setAttribute('style', 'opacity:0;pointer-events:none');
      svg.insertBefore(anatG, svg.querySelector('#hits'));
      stage.insertAdjacentHTML('beforeend', `
        <div class="cv-bar">
          <span class="cv-lbl">Inclinación del tronco</span>
          <input type="range" id="cvAng" min="0" max="90" step="5" value="45">
          <b class="cv-read" id="cvAngTxt">45°</b>
          ${segHtml('side', 'Lado explorado:', [['D', 'Derecho'], ['I', 'Izquierdo']], 'D')}
          <span class="cv-read" id="cvJRead" style="color:var(--muted)"></span>
        </div>
        <div class="wave cv-wave">
          <div class="where"><b>Pulso venoso vs. arterial</b><span>Arriba: yugular (ondas a, c, v). Abajo: carotídeo.</span></div>
          <canvas id="cvJcv" width="600" height="120"></canvas>
        </div>
        <div class="cv-note"><b>Pulso venoso:</b> 2 ondas positivas (a, v) y 2 descensos (x, y) por latido; no palpable, se oblitera con presión suave, su nivel baja con la inspiración y con la posición erguida; <b>ingurgitación yugular normal ≤3-4 cm sobre el ángulo esternal a 45°</b>. <b>Pulso carotídeo:</b> 1 onda por latido, palpable, no se oblitera con presión suave ni cambia con la inspiración.</div>`);
      let refs = {}, geo = null;
      const build = () => {
        const th = S.angle, J = jvpOf(c);
        const mk = nkMarkup(th, J);
        dyn.innerHTML = mk.html; geo = mk;
        anatG.innerHTML = nkAnat(th);
        refs = { v2: dyn.querySelector('#nkV2'), lvl: dyn.querySelector('#nkLvl'), rd: dyn.querySelector('#nkRead') };
        Object.keys(NA).forEach(k => {
          const b = lpt(NA[k][0], NA[k][1], TH0), n = lpt(NA[k][0], NA[k][1], th);
          const g = svg.querySelector(`[data-rid="${k}"]`);
          if (g) {
            g.setAttribute('transform', `translate(${(n.x - b.x).toFixed(1)} ${(n.y - b.y).toFixed(1)})`);
            g.querySelectorAll('text').forEach(t => { t.style.visibility = th < 25 ? 'hidden' : ''; });
          }
        });
        stage.querySelector('#cvAngTxt').textContent = th + '°';
        const xt = veinTop(th, J);
        stage.querySelector('#cvJRead').textContent = xt >= 50.5 ? 'Columna llena hasta el ángulo mandibular (tronco casi horizontal).'
          : xt < 42 ? 'Menisco bajo la clavícula: yugulares no visibles (tronco erguido).'
            : `Menisco ≈${fmt(J)} cm sobre el ángulo esternal (normal ≤3-4 cm).`;
        ctx.scene.refresh();
      };
      build();
      stage.querySelector('#cvAng').addEventListener('input', e => { S.angle = +e.target.value; build(); });
      const bar = stage.querySelector('.cv-bar');
      bindSeg(bar, 'side', v => { S.side = v; sh.log(`Explorando la carótida ${v === 'D' ? 'derecha' : 'izquierda'}: se palpa un lado cada vez.`, ''); });
      const cvJ = stage.querySelector('#cvJcv');
      const t0 = performance.now();
      const frame = () => {
        if (!S.live || tok !== S.tok) return;
        const now = performance.now(), T = 60000 / c.v.hr, p = ((now - t0) % T) / T;
        const th = S.angle, J = jvpOf(c);
        const Jbase = J + S.boost, Jw = Jbase + 0.3 * jug(p);
        const xt = veinTop(th, Jw), xb = veinTop(th, Jbase);
        if (refs.v2) {
          refs.v2.setAttribute('d', `M37,${yv(37)} L${xt.toFixed(2)},${yv(xt).toFixed(2)}`);
          const tip = lpt(xb, yv(xb), th);
          if (refs.lvl && geo) refs.lvl.setAttribute('d', `M${tip.x.toFixed(1)},${tip.y.toFixed(1)} L${geo.Rx},${tip.y.toFixed(1)}`);
          if (refs.rd) refs.rd.textContent = xb < 42 ? '' : `≈ ${fmt((Jbase).toFixed(1))} cm`;
        }
        drawJcv(cvJ, p, c.v.hr, sh);
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    },
    onLeave: leaveAll
  };

  function nkPosX(k) { return Math.round(lpt(NA[k][0], NA[k][1], TH0).x); }
  function nkPosY(k) { return Math.round(lpt(NA[k][0], NA[k][1], TH0).y); }

  function drawJcv(cv, p, hr, sh) {
    const g = cv.getContext('2d'), W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H);
    const cs = getComputedStyle(document.body);
    const ink = cs.getPropertyValue('--muted').trim() || '#666', brand = cs.getPropertyValue('--brand').trim() || '#0e6a78';
    const t = Sound.timing(hr);
    const mid1 = H * 0.27, mid2 = H * 0.78, A1 = 34, A2 = 26;
    g.strokeStyle = ink; g.globalAlpha = 0.3; g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, mid1); g.lineTo(W, mid1); g.moveTo(0, mid2 + 4); g.lineTo(W, mid2 + 4); g.stroke(); g.globalAlpha = 1;
    // S1 y S2
    g.strokeStyle = ink; g.globalAlpha = 0.5; g.setLineDash([3, 4]);
    [t.tS1 / t.T, t.tS2 / t.T].forEach(x => { g.beginPath(); g.moveTo(x * W, 0); g.lineTo(x * W, H); g.stroke(); });
    g.setLineDash([]); g.globalAlpha = 1;
    g.fillStyle = ink; g.font = '11px system-ui';
    g.fillText('R1', t.tS1 / t.T * W + 3, H - 3); g.fillText('R2', t.tS2 / t.T * W + 3, H - 3);
    // curvas
    const curve = (fn, mid, A, col) => {
      g.strokeStyle = col; g.lineWidth = 2; g.beginPath();
      for (let x = 0; x <= W; x++) { const y = mid - fn(x / W) * A; if (x) g.lineTo(x, y); else g.moveTo(x, y); }
      g.stroke();
    };
    curve(jug, mid1, A1, '#2f62a8');
    curve(art, mid2, A2, '#d9534f');
    if (sh.mode === 'learn') {
      g.fillStyle = '#2f62a8'; g.font = 'bold 11px system-ui';
      [['a', 0.97, 0.5], ['c', 0.10, 0.18], ['x', 0.22, -0.32], ['v', 0.43, 0.42], ['y', 0.66, -0.3]].forEach(([l, mu, v]) => {
        const xx = mu * W, yy = mid1 - jug(mu) * A1 + (v > 0 ? -5 : 12);
        g.fillText(l, Math.min(W - 10, xx - 3), yy);
      });
    }
    g.fillStyle = '#2f62a8'; g.font = '11px system-ui'; g.fillText('Yugular', 4, 12);
    g.fillStyle = '#d9534f'; g.fillText('Carótida', 4, H - 14);
    g.strokeStyle = brand; g.lineWidth = 2; g.beginPath(); g.moveTo(p * W, 0); g.lineTo(p * W, H); g.stroke();
  }

  /* ============================================================ ESCENA 4: PULSOS PERIFÉRICOS */
  const SITES = [
    { k: 'car', n: 'Carotídeo', x: 216, y: 112, ldx: -16, tech: 'Borde anterior del esternocleidomastoideo, a la altura del cricoides; un lado cada vez, sin masajear.', aus: true },
    { k: 'bra', n: 'Braquial', x: 128, y: 252, ldx: -16, tech: 'Fosa antecubital, medial al tendón del bíceps; con el pulgar o los dedos, brazo semiflexionado y apoyado.', aus: false },
    { k: 'rad', n: 'Radial', x: 76, y: 366, ldx: -16, tech: 'Cara lateral-anterior de la muñeca, contra el radio, con la yema de 2-3 dedos; contar 30 s (×2) si el ritmo es regular.', aus: false },
    { k: 'cub', n: 'Cubital', x: 100, y: 366, ldx: 16, tech: 'Cara medial de la muñeca, profundo al tendón flexor cubital; suele ser más tenue que el radial.', aus: false },
    { k: 'fem', n: 'Femoral', x: 205, y: 346, ldx: -16, tech: 'Bajo el ligamento inguinal, en el punto medio entre la espina ilíaca anterosuperior y la sínfisis del pubis; presión firme con dos manos superpuestas.', aus: true },
    { k: 'pop', n: 'Poplíteo', x: 200, y: 506, ldx: -16, tech: 'Fosa poplítea (cara posterior de la rodilla) con la rodilla semiflexionada y el pie apoyado; presión profunda con ambas manos, pulgares en la tibia.', aus: false },
    { k: 'tib', n: 'Tibial posterior', x: 208, y: 648, ldx: -16, tech: 'Detrás y debajo del maléolo medial (entre el maléolo y el tendón de Aquiles), con 2 dedos.', aus: false },
    { k: 'ped', n: 'Pedio', x: 192, y: 676, ldx: -16, tech: 'Dorso del pie, lateral al tendón extensor del primer dedo. Puede faltar de forma congénita en una minoría de personas sanas si el tibial posterior está presente.', aus: false }
  ];

  function pulseHtml(site, side, c) {
    const nm = `${site.n} ${side === 'D' ? 'derecho' : 'izquierdo'}`;
    let t = `<i>Técnica:</i> ${site.tech} <i>Hallazgo normal:</i> ${nm} <b>2+</b> (escala 0 a 4+: 0 ausente, 1+ disminuido, 2+ normal, 3+ aumentado, 4+ saltón). ` +
      `<b>Frecuencia</b> ${c.v.hr} lpm, <b>ritmo</b> regular, <b>amplitud</b> normal, <b>tensión</b> normal (se deprime con presión moderada), <b>igual</b> en todos los latidos y <b>simétrico</b> con el contralateral. `;
    if (site.k === 'rad') t += `Coincide con la frecuencia cardíaca auscultada (sin déficit de pulso). `;
    if (elder(c)) t += 'Pared arterial lisa, algo más firme por la rigidez propia de la edad; pulsos distales algo más tenues pero 2+. ';
    else t += 'Pared arterial blanda y elástica. ';
    return t;
  }

  function pulsReg(site, side) {
    const x = side === 'D' ? site.x : 460 - site.x, y = site.y;
    const lx = x + (side === 'D' ? site.ldx : -site.ldx);
    const anchor = (side === 'D' ? site.ldx < 0 : site.ldx > 0) ? 'end' : 'start';
    return {
      id: site.k + side, label: `Pulso ${site.n.toLowerCase()} ${side === 'D' ? 'derecho' : 'izquierdo'}`,
      short: `${site.n} ${side}`, cx: x, cy: y, r: 11, lx, ly: y + 4, anchor,
      tools: {
        palp: (c, ctx) => ({
          html: pulseHtml(site, side, c),
          run: x2 => pulseFx(x2.svg, x2.point, c.v.hr, 6, { beep: 480 + Object.keys({ car: 1, bra: 1, rad: 1, cub: 1, fem: 1, pop: 1, tib: 1, ped: 1 }).indexOf(site.k) * 25, col: '#d9534f' })
        }),
        aus: site.aus ? `Soplo ${site.n === 'Femoral' ? 'femoral' : 'carotídeo'}: <b>ausente</b> (con el diafragma sobre el trayecto del vaso no se oye ruido de flujo turbulento).` : `${site.n}: no se ausculta de rutina; sin soplos.`,
        cmp: (c) => {
          if (site.k === 'car') return 'No se palpan ambas carótidas a la vez (riesgo de reducir el flujo cerebral y de reflejo sinocarotídeo): se comparan por separado. Ambas 2+, simétricas, con la misma intensidad y contorno.';
          let t = `${site.n} derecho vs. izquierdo: ambos <b>2+</b>, <b>simétricos</b> en amplitud, tensión, ritmo y sincronía; sin diferencia de temperatura entre ambos lados.`;
          if (site.k === 'rad') t += ' Comparación radial-femoral: ver el botón «Radial + femoral simultáneos»; normalmente <b>sin retraso radiofemoral</b>.';
          if (site.k === 'fem') t += ' Con el radial: se palpan casi al mismo tiempo (<b>sin retraso radiofemoral</b>).';
          if (site.k === 'bra') t += ' La presión arterial difiere <10 mmHg entre ambos brazos (ver «Perfusión y miembros»).';
          return t;
        }
      }
    };
  }

  const pulsos = {
    id: 'pul', label: 'Pulsos periféricos', viewBox: '0 0 460 720',
    hint: 'Palpa cada pulso (derecho e izquierdo), compara ambos lados y ausculta carótidas, femorales y aorta abdominal.',
    svg: learn => {
      const limb = (pts, w) => {
        const d = 'M' + pts.map(p => p.join(',')).join(' L');
        return `<path d="${d}" fill="none" stroke="${LINE}" stroke-width="${w + 4}" stroke-linecap="round" stroke-linejoin="round"/>` +
               `<path d="${d}" fill="none" stroke="${SKIN}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
      };
      const mir = pts => pts.map(p => [460 - p[0], p[1]]);
      const arm = [[168, 138], [128, 250], [88, 360], [78, 398]];
      const leg = [[206, 340], [200, 500], [200, 640]];
      let b = limb(arm, 34) + limb(mir(arm), 34) + limb(leg, 54) + limb(mir(leg), 54);
      b += `<path d="M166,130 C166,100 190,118 230,118 C270,118 294,100 294,130 L282,340 C260,352 200,352 178,340 Z" fill="${SKIN}" stroke="${LINE}" stroke-width="4"/>`;
      b += `<rect x="208" y="94" width="44" height="30" fill="${SKIN}"/>`;
      b += `<ellipse cx="230" cy="62" rx="32" ry="38" fill="${SKIN}" stroke="${LINE}" stroke-width="4"/>`;
      b += `<path d="M184,660 C180,680 184,696 198,698 L220,698 C224,684 220,668 214,660 Z" fill="${SKIN}" stroke="${LINE}" stroke-width="4"/>`;
      b += `<path d="M276,660 C280,680 276,696 262,698 L240,698 C236,684 240,668 246,660 Z" fill="${SKIN}" stroke="${LINE}" stroke-width="4"/>`;
      b += `<circle cx="230" cy="262" r="3" fill="#a97d58"/>`;
      b += `<text x="40" y="24" class="svg-small">D</text><text x="410" y="24" class="svg-small">I</text>`;
      b += `<text x="230" y="716" class="svg-small" text-anchor="middle">Poplíteo: se palpa en la cara posterior de la rodilla</text>`;
      return b;
    },
    anatomy: () => pulsAnat(),
    tools: [
      { id: 'palp', icon: '🖐️', label: 'Palpar pulso', hint: 'Palpa con la yema de los dedos (no con el pulgar); al palpar suena un pitido a la frecuencia del paciente.' },
      { id: 'aus', icon: '🩺', label: 'Auscultar soplos', hint: 'Ausculta carótidas, femorales y aorta abdominal en busca de soplos.' },
      { id: 'cmp', icon: '⚖️', label: 'Comparar lados', hint: 'Compara el pulso con el del lado contralateral (amplitud, sincronía).' }
    ],
    regions: (() => {
      const r = [];
      SITES.forEach(s => { r.push(pulsReg(s, 'D')); r.push(pulsReg(s, 'I')); });
      r.push({
        id: 'aor', label: 'Aorta abdominal', short: 'Aorta abdominal', cx: 236, cy: 258, r: 12, lx: 236, ly: 284, anchor: 'middle',
        tools: {
          palp: (c) => ({
            html: `<i>Técnica:</i> ambas manos a los lados de la línea media del epigastrio, presionando en profundidad. <i>Hallazgo normal:</i> aorta abdominal con latido suave, <b>diámetro palpable <3 cm</b>, sin masa pulsátil expansiva (se palpa con facilidad en personas delgadas; puede no palparse en obesos).`,
            run: x => pulseFx(x.svg, x.point, c.v.hr, 5, { beep: 400, col: '#d9534f' })
          }),
          aus: 'Ausculta en la línea media por encima del ombligo y sobre las arterias renales (flancos): <b>sin soplos</b> abdominales ni femorales.',
          cmp: 'Sin pulsatilidad asimétrica; la aorta no se compara lateralmente. Las pulsaciones femorales son simétricas con ella.'
        }
      });
      return r;
    })(),
    after: (stage, sh, ctx) => {
      leaveAll(); injectCss();
      stage.insertAdjacentHTML('beforeend', `
        <div class="cv-bar"><button type="button" class="btn small" id="cvRF" style="width:auto;margin:0">Radial + femoral simultáneos (lado derecho)</button>
          <span class="cv-read" style="color:var(--muted)">Escala: 0 ausente · 1+ disminuido · 2+ normal · 3+ aumentado · 4+ saltón</span></div>
        <div class="cv-note"><b>Normal:</b> en cada pulso se valoran <b>frecuencia, ritmo, amplitud, tensión, igualdad y simetría</b>: todos presentes, <b>2+</b>, regulares, iguales, simétricos y sincrónicos; sin soplos carotídeos ni femorales; aorta abdominal <3 cm.</div>`);
      stage.querySelector('#cvRF').addEventListener('click', () => {
        const c = sh.case, r = SITES.find(s => s.k === 'rad'), f = SITES.find(s => s.k === 'fem');
        pulseFx(ctx.svg, [{ x: r.x, y: r.y }, { x: f.x, y: f.y }], c.v.hr, 6, { beep: 500, col: '#0e6a78' });
        sh.log('<b>Radial y femoral derechos a la vez:</b> las pulsaciones son <b>sincrónicas</b>, sin retraso radiofemoral y de amplitud similar (normal).', 'find');
      });
    },
    onLeave: leaveAll
  };

  /* ============================================================ ESCENA 5: PERFUSIÓN Y MIEMBROS */
  const capTime = c => (c.age < 35 ? 1.0 : c.age < 60 ? 1.3 : 1.6);
  function bpArms(c) {
    const dR = elder(c) ? 4 : c.age < 35 ? 2 : 3, dI = elder(c) ? 2 : 1;
    return { R: [c.v.sbp, c.v.dbp], L: [c.v.sbp - dR, c.v.dbp - dI], dS: dR, dD: dI };
  }
  function orthoVals(c) {
    const e = elder(c);
    return {
      s0: [c.v.sbp, c.v.dbp, c.v.hr],
      s1: [c.v.sbp - (e ? 8 : 4), c.v.dbp + (e ? 0 : 2), c.v.hr + (e ? 7 : 9)],
      s3: [c.v.sbp - (e ? 6 : 2), c.v.dbp + (e ? 2 : 3), c.v.hr + (e ? 8 : 10)]
    };
  }
  function kor(hr, n) {
    clearFx();
    const T = 60000 / hr;
    for (let i = 0; i < n; i++) S.tm.push(setTimeout(() => Sound.korotkoff(0.7), i * T));
  }

  function tintTween(el, from, to, ms, done) {
    const hex = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
    const a = hex(from), b = hex(to);
    S.cancel.push(U.tween(ms, u => {
      el.setAttribute('fill', '#' + a.map((v, i) => Math.round(v + (b[i] - v) * u).toString(16).padStart(2, '0')).join(''));
    }, done));
  }
  function floatTxt(svg, x, y, txt) {
    const layer = svg.querySelector('#flash');
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('class', 'cv-fx svg-hint'); t.setAttribute('x', x); t.setAttribute('y', y); t.setAttribute('text-anchor', 'middle');
    t.textContent = txt; layer.appendChild(t);
    S.tm.push(setTimeout(() => t.remove(), 3200));
  }

  function hand(ox, oy, fill, dorsum) {
    const lens = [86, 96, 90, 74];
    let h = `<rect x="${ox}" y="${oy + 70}" width="100" height="100" rx="24" fill="${fill}" stroke="${LINE}" stroke-width="3" ${dorsum ? '' : 'id="palmFill"'}/>`;
    h += `<rect x="${ox + 16}" y="${oy + 160}" width="68" height="40" rx="10" fill="${SKIN}" stroke="${LINE}" stroke-width="3"/>`;
    for (let i = 0; i < 4; i++) {
      const fx = ox + 4 + i * 24, top = oy + 70 - lens[i];
      h += `<rect x="${fx}" y="${top}" width="21" height="${lens[i] + 16}" rx="10" fill="${fill}" stroke="${LINE}" stroke-width="2.5"/>`;
      if (dorsum) h += `<rect x="${fx + 3.5}" y="${top + 4}" width="14" height="18" rx="5" fill="#f3b9b0" stroke="#d99a90" stroke-width="1.2" ${i === 0 ? 'id="nailFill"' : ''}/>`;
    }
    h += `<rect x="${ox - 28}" y="${oy + 98}" width="26" height="64" rx="12" fill="${fill}" stroke="${LINE}" stroke-width="2.5" transform="rotate(-28 ${ox - 15} ${oy + 130})"/>`;
    if (!dorsum) {
      h += `<path d="M${ox + 12},${oy + 105} Q${ox + 50},${oy + 125} ${ox + 92},${oy + 100} M${ox + 14},${oy + 125} Q${ox + 40},${oy + 140} ${ox + 62},${oy + 160}" fill="none" stroke="#c9946f" stroke-width="2" opacity=".7"/>`;
      h += `<circle cx="${ox + 24}" cy="${oy + 192}" r="4" fill="#d9534f"/><circle cx="${ox + 76}" cy="${oy + 192}" r="4" fill="#d9534f"/>`;
      h += `<text class="svg-small" x="${ox + 14}" y="${oy + 196}" text-anchor="end">a. radial</text><text class="svg-small" x="${ox + 88}" y="${oy + 196}">a. cubital</text>`;
    }
    return h;
  }
  function stand(x, y) {
    return `<circle cx="${x}" cy="${y + 16}" r="14" fill="${SKIN}" stroke="${LINE}" stroke-width="3"/>
      <rect x="${x - 18}" y="${y + 34}" width="36" height="70" rx="14" fill="#9fc3d8" stroke="#6b93aa" stroke-width="3"/>
      <rect x="${x - 15}" y="${y + 100}" width="13" height="74" rx="6" fill="${SKIN}" stroke="${LINE}" stroke-width="3"/>
      <rect x="${x + 2}" y="${y + 100}" width="13" height="74" rx="6" fill="${SKIN}" stroke="${LINE}" stroke-width="3"/>
      <path d="M${x - 18},${y + 40} L${x - 30},${y + 100} M${x + 18},${y + 40} L${x + 30},${y + 100}" stroke="${LINE}" stroke-width="8" stroke-linecap="round" fill="none"/>`;
  }

  const perfusion = {
    id: 'per', label: 'Perfusión y miembros', viewBox: '0 0 840 570',
    hint: 'Evalúa llenado capilar, prueba de Allen, temperatura y color, fóvea, várices, PA en ambos brazos y PA ortostática.',
    svg: () => {
      const panel = (x, y, w, h, t) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#f7fafc" stroke="#c5d0db" stroke-width="2"/><text class="svg-title" x="${x + 14}" y="${y + 24}">${t}</text>`;
      let b = panel(10, 10, 400, 270, 'Mano: uña (dorso) y palma') + panel(430, 10, 400, 270, 'Presión arterial en ambos brazos') +
        panel(10, 290, 400, 270, 'Miembro inferior') + panel(430, 290, 400, 270, 'Presión arterial ortostática');
      b += hand(60, 70, SKIN, true) + hand(260, 70, '#f2cdb0', false);
      b += `<text class="svg-small" x="168" y="200">Dorso</text><text class="svg-small" x="366" y="200">Palma</text>`;
      /* brazos con manguito */
      [[62, 'D'], [160, 'I']].forEach(([y, s]) => {
        b += `<rect x="452" y="${y}" width="320" height="44" rx="21" fill="${SKIN}" stroke="${LINE}" stroke-width="3"/>
              <ellipse cx="786" cy="${y + 22}" rx="26" ry="20" fill="${SKIN}" stroke="${LINE}" stroke-width="3"/>
              <rect x="540" y="${y - 6}" width="64" height="56" rx="8" fill="#5b87b3" stroke="#3d6486" stroke-width="3"/>
              <text class="svg-small" x="470" y="${y + 26}" fill="#fff">${s === 'D' ? 'D' : 'I'}</text>`;
      });
      b += `<text class="svg-small" x="452" y="252">Diferencia entre ambos brazos normalmente &lt;10 mmHg</text>`;
      /* pierna */
      b += `<path d="M168,330 C162,390 172,445 178,486 L244,486 C250,445 258,390 252,330 Z" fill="${SKIN}" stroke="${LINE}" stroke-width="3"/>
            <path d="M170,486 L252,486 L266,522 C272,540 250,550 212,550 C174,550 160,540 168,522 Z" fill="${SKIN}" stroke="${LINE}" stroke-width="3"/>
            <path d="M210,360 L210,470" stroke="#d6b99a" stroke-width="2" stroke-dasharray="3 5" fill="none"/>
            <path d="M182,500 L204,520 M232,500 L218,522" stroke="#a9c1d6" stroke-width="2" fill="none" opacity=".7"/>
            <path d="M232,520 L232,548 M246,516 L248,545 M220,522 L220,548 M196,522 L196,548" stroke="${LINE}" stroke-width="1.5" fill="none"/>`;
      b += `<text class="svg-small" x="290" y="372">Fóvea: presionar ≈5 s sobre la tibia</text>
            <text class="svg-small" x="290" y="392">Normal: sin huella (0)</text>
            <text class="svg-small" x="290" y="420">Várices: venas dilatadas</text>
            <text class="svg-small" x="290" y="438">y tortuosas (&gt;3 mm): ausentes</text>`;
      /* ortostatismo */
      b += `<rect x="452" y="470" width="150" height="10" rx="4" fill="#aebccb"/>
            <circle cx="472" cy="440" r="14" fill="${SKIN}" stroke="${LINE}" stroke-width="3"/>
            <rect x="490" y="428" width="86" height="28" rx="12" fill="#9fc3d8" stroke="#6b93aa" stroke-width="3"/>
            <rect x="570" y="432" width="48" height="20" rx="9" fill="${SKIN}" stroke="${LINE}" stroke-width="3"/>`;
      b += stand(690, 330) + stand(780, 330);
      b += `<text class="svg-small" x="530" y="500" text-anchor="middle">Acostado 5 min</text><text class="svg-small" x="690" y="518" text-anchor="middle">De pie 1 min</text><text class="svg-small" x="780" y="518" text-anchor="middle">De pie 3 min</text>`;
      b += `<text class="svg-small" x="450" y="538">Normal: caída &lt;20 mmHg (sistólica) y &lt;10 mmHg</text><text class="svg-small" x="450" y="554">(diastólica); la FC sube ligeramente (≈10-15 lpm)</text>`;
      return b;
    },
    tools: [
      { id: 'insp', icon: '👁️', label: 'Inspección', hint: 'Color, simetría, edema, várices.' },
      { id: 'temp', icon: '🌡️', label: 'Temperatura y color', hint: 'Dorso de la mano del examinador: compara ambos lados y de proximal a distal.' },
      { id: 'cap', icon: '🔴', label: 'Llenado capilar', hint: 'Presiona el lecho ungueal ≈5 s y mide el tiempo de recuperación del color.' },
      { id: 'allen', icon: '✋', label: 'Prueba de Allen', hint: 'Ocluye radial y cubital con el puño cerrado; abre la mano y suelta una arteria.' },
      { id: 'fov', icon: '👇', label: 'Signo de fóvea', hint: 'Presión firme con el pulgar ≈5 s sobre la tibia o el dorso del pie.' },
      { id: 'pa', icon: '🩺', label: 'Presión arterial', hint: 'Toma la PA en cada brazo y en las posiciones ortostáticas.' },
      { id: 'pul', icon: '🖐️', label: 'Pulsos', hint: 'Compara pulsos entre ambos lados.' }
    ],
    regions: [
      {
        id: 'dors', label: 'Dorso de la mano', short: 'Dorso mano', x: 58, y: 108, w: 106, h: 132, lx: 110, ly: 266, anchor: 'middle',
        tools: {
          insp: 'Color uniforme según el fototipo, sin palidez ni cianosis, sin edema (se ven los tendones extensores y las venas dorsales). Piel fina y laxa.',
          temp: 'Dorso de la mano <b>tibio y seco</b>, simétrico con la otra mano, sin gradiente de temperatura entre dedos y antebrazo.',
          fov: 'Sin edema: <b>signo de fóvea negativo</b> en el dorso de la mano.'
        }
      },
      {
        id: 'nail', label: 'Lecho ungueal (llenado capilar)', short: 'Uña', cx: 75, cy: 66, r: 14, lx: 75, ly: 44, anchor: 'middle',
        tools: {
          insp: 'Lecho ungueal rosado, uniforme, sin palidez ni cianosis; uña lisa.',
          cap: (c, ctx) => {
            const t = capTime(c);
            return {
              html: `<b>Llenado capilar ≈${fmt(t.toFixed(1))} s</b> (normal <2 s): al soltar la presión mantenida ≈5 s sobre la uña, el lecho vuelve de blanco a rosado en menos de 2 s. Mano a la altura del corazón, a temperatura ambiente.`,
              run: x => {
                const el = x.svg.querySelector('#nailFill');
                clearFx();
                if (!el) return;
                tintTween(el, '#f3b9b0', '#f8f2ee', 450, () => {
                  S.tm.push(setTimeout(() => {
                    tintTween(el, '#f8f2ee', '#f3b9b0', t * 1000, null);
                    floatTxt(x.svg, 75, 36, `${fmt(t.toFixed(1))} s`);
                  }, 700));
                });
              }
            };
          }
        }
      },
      {
        id: 'palm', label: 'Palma y muñeca (arcos palmares)', short: 'Palma', x: 258, y: 100, w: 106, h: 148, lx: 311, ly: 266, anchor: 'middle',
        tools: {
          insp: 'Palma rosada, sin eritema ni palidez de los pliegues; humedad normal.',
          temp: 'Palma <b>tibia</b> y ligeramente húmeda; simétrica con la otra mano.',
          allen: (c, ctx) => ({
            html: '<b>Prueba de Allen normal:</b> con el puño cerrado y comprimidas la arteria radial y la cubital la palma se blanquea; al abrir la mano y liberar solo la <b>cubital</b>, el color vuelve en <b>menos de 5-6 s</b> (aquí ≈3 s), lo que indica que la circulación colateral cubital es suficiente (se repite liberando la radial). Se evalúa en ambas manos.',
            run: x => {
              const el = x.svg.querySelector('#palmFill');
              clearFx();
              if (!el) return;
              tintTween(el, '#f2cdb0', '#f1ece8', 700, () => {
                S.tm.push(setTimeout(() => {
                  tintTween(el, '#f1ece8', '#f2cdb0', 2800, null);
                  floatTxt(x.svg, 311, 94, '≈3 s');
                }, 600));
              });
            }
          })
        }
      },
      {
        id: 'brD', label: 'Brazo derecho', short: 'Brazo D', x: 452, y: 56, w: 340, h: 56, lx: 700, ly: 52, anchor: 'middle',
        tools: {
          pa: (c) => {
            const a = bpArms(c), pp = a.R[0] - a.R[1];
            const ppTxt = pp <= 50 ? `<b>presión de pulso ${pp} mmHg</b> (normal 30–50)` : `<b>presión de pulso ${pp} mmHg</b> (normal 30–50; algo mayor en el adulto mayor por rigidez arterial)`;
            return { html: `<i>Técnica:</i> sentado tras 5 min de reposo, brazo apoyado a la altura del corazón, manguito adecuado; método palpatorio y luego auscultatorio (fases de Korotkoff). <i>Hallazgo normal:</i> PA brazo derecho <b>${a.R[0]}/${a.R[1]} mmHg</b>, ${ppTxt}; FC ${c.v.hr} lpm.`, run: () => kor(c.v.hr, 4) };
          },
          pul: 'Pulso braquial y radial derechos <b>2+</b>, rítmicos y simétricos con los del lado izquierdo.',
          insp: 'Brazo de color uniforme, sin edema ni cambios tróficos, sin asimetría de diámetro.',
          temp: 'Brazo tibio, simétrico con el contralateral.'
        }
      },
      {
        id: 'brI', label: 'Brazo izquierdo', short: 'Brazo I', x: 452, y: 154, w: 340, h: 56, lx: 700, ly: 150, anchor: 'middle',
        tools: {
          pa: (c) => {
            const a = bpArms(c);
            return { html: `PA brazo izquierdo: <b>${a.L[0]}/${a.L[1]} mmHg</b> (diferencia con el derecho ${a.dS}/${a.dD} mmHg: <b>&lt;10 mmHg</b>, normal). En la primera consulta se mide en ambos brazos y se toma como referencia el de cifra más alta.`, run: () => kor(c.v.hr, 4) };
          },
          pul: 'Pulso braquial y radial izquierdos <b>2+</b>, simétricos con el derecho y sincrónicos.',
          insp: 'Brazo de color uniforme, sin edema ni cambios tróficos.',
          temp: 'Brazo tibio, simétrico con el contralateral.'
        }
      },
      {
        id: 'tib', label: 'Cara anterior de la tibia (pretibial)', short: 'Tibia', x: 176, y: 340, w: 76, h: 124, lx: 214, ly: 320, anchor: 'middle',
        tools: {
          fov: (c, ctx) => ({
            html: '<b>Signo de fóvea negativo:</b> tras presionar firmemente con el pulgar ≈5 s sobre la cara anterior de la tibia no queda huella (0). No hay edema en ambos miembros.',
            run: x => {
              const layer = x.svg.querySelector('#flash');
              const d = document.createElementNS(NS, 'circle');
              d.setAttribute('class', 'cv-fx'); d.setAttribute('cx', x.point.x); d.setAttribute('cy', x.point.y); d.setAttribute('fill', '#c98f7a'); d.setAttribute('opacity', '.7');
              layer.appendChild(d);
              S.cancel.push(U.tween(1500, u => { d.setAttribute('r', 9 * Math.min(1, u * 4)); }, () => d.remove()));
            }
          }),
          insp: 'Piel lisa, de color uniforme, sin edema ni hiperpigmentación, sin úlceras ni cambios tróficos; vello distribuido de forma homogénea.',
          temp: 'Piernas <b>tibias y simétricas</b>, sin gradiente de temperatura de proximal a distal.',
          pul: 'Pulsos distales (poplíteo, tibial posterior y pedio) <b>2+</b> y simétricos; ver escena de pulsos.'
        }
      },
      {
        id: 'var', label: 'Cara interna de la pierna (trayecto de la safena)', short: 'Safena', x: 236, y: 340, w: 20, h: 130, lx: 290, ly: 468, anchor: 'start',
        tools: {
          insp: '<b>Sin várices:</b> no hay venas dilatadas, tortuosas ni prominentes en bipedestación, sin telangiectasias llamativas, sin eccema ni pigmentación por estasis ni úlceras.',
          temp: 'Sin dolor ni cordones palpables, sin calor local ni eritema en el trayecto venoso.',
          fov: 'Sin edema ni fóvea en el tobillo ni en el maléolo.'
        }
      },
      {
        id: 'pie', label: 'Pie y dedos', short: 'Pie', x: 168, y: 490, w: 100, h: 62, lx: 290, ly: 520, anchor: 'start',
        tools: {
          insp: 'Color uniforme, sin cianosis ni rubor de declive, sin palidez a la elevación; sin úlceras ni fisuras; vello presente en el dorso.',
          temp: 'Pies <b>tibios, simétricos</b> y algo más frescos que la pierna, sin cambio brusco de temperatura.',
          cap: (c) => ({ html: `Llenado capilar del dedo del pie ≈${fmt((capTime(c) + 0.4).toFixed(1))} s (normal <2 s; algo más lento en los pies, según la fuente hasta 3 s).` }),
          fov: 'Sin edema en el dorso del pie: <b>fóvea negativa</b>.',
          pul: 'Pedio y tibial posterior <b>2+</b> bilaterales (el pedio puede faltar de forma congénita en una minoría de personas sanas).'
        }
      },
      {
        id: 'ort0', label: 'Acostado 5 min', short: '5 min acostado', x: 450, y: 410, w: 180, h: 80, lx: 540, ly: 404, anchor: 'middle',
        tools: {
          pa: (c) => { const o = orthoVals(c).s0; return { html: `PA tras 5 min en decúbito: <b>${o[0]}/${o[1]} mmHg</b>, FC <b>${o[2]} lpm</b> (basal).`, run: () => kor(c.v.hr, 4) }; }
        }
      },
      {
        id: 'ort1', label: 'De pie, 1 minuto', short: '1 min de pie', x: 656, y: 350, w: 70, h: 160, lx: 692, ly: 340, anchor: 'middle',
        tools: {
          pa: (c) => {
            const o = orthoVals(c), a = o.s0, b = o.s1;
            return { html: `PA al minuto de ponerse de pie: <b>${b[0]}/${b[1]} mmHg</b>, FC <b>${b[2]} lpm</b>. Variación ${b[0] - a[0]}/${b[1] - a[1]} mmHg y FC ${b[2] - a[2] >= 0 ? '+' : ''}${b[2] - a[2]} lpm: <b>respuesta normal</b> (caída &lt;20/10 mmHg, ligero aumento de la FC, sin mareo ni síncope).`, run: () => kor(b[2], 4) };
          }
        }
      },
      {
        id: 'ort3', label: 'De pie, 3 minutos', short: '3 min de pie', x: 746, y: 350, w: 70, h: 160, lx: 782, ly: 340, anchor: 'middle',
        tools: {
          pa: (c) => {
            const o = orthoVals(c), a = o.s0, b = o.s3;
            return { html: `PA a los 3 min de pie: <b>${b[0]}/${b[1]} mmHg</b>, FC <b>${b[2]} lpm</b>. Variación ${b[0] - a[0]}/${b[1] - a[1]} mmHg: <b>sin hipotensión ortostática</b> (se define como caída ≥20 mmHg sistólica o ≥10 mmHg diastólica en los 3 primeros minutos).`, run: () => kor(b[2], 4) };
          }
        }
      }
    ],
    after: (stage, sh, ctx) => {
      leaveAll(); injectCss();
      stage.insertAdjacentHTML('beforeend', `<div class="cv-note"><b>Normal:</b> llenado capilar &lt;2 s · prueba de Allen: color de la palma en &lt;5-6 s · extremidades tibias, de color y temperatura simétricos · sin edema (fóvea 0) ni várices · PA en ambos brazos con diferencia &lt;10 mmHg y presión de pulso 30–50 mmHg · PA ortostática: caída &lt;20/10 mmHg.</div>`);
    },
    onLeave: leaveAll
  };

  /* ============================================================ CUESTIONARIO */
  /* Cuestionario: las preguntas 1 y 2 dependen de la persona examinada. */
  const quiz = c => {
    const pp = c.v.sbp - c.v.dbp, pam = Math.round((c.v.sbp + 2 * c.v.dbp) / 3);
    return [
      { q: `La PA de esta persona es ${c.v.sbp}/${c.v.dbp} mmHg. Su presión de pulso (diferencial) es…`,
        options: [`${pam} mmHg`, `${c.v.sbp} mmHg`, `${pp} mmHg${pp <= 50 ? ' (normal 30–50)' : ' (algo por encima de 30–50, aceptable en el adulto mayor)'}`, `${c.v.dbp} mmHg`], a: 2,
        why: 'La presión de pulso es la diferencia entre la PA sistólica y la diastólica (normal ≈30–50 mmHg); aumenta con la rigidez arterial de la edad y en la insuficiencia aórtica, y disminuye en el shock y el taponamiento.' },
      { q: `Al palpar el pulso radial de esta persona (FC ${c.v.hr} lpm) el hallazgo normal es…`,
        options: [`Frecuencia ${c.v.hr} lpm, regular, amplitud 2+, igual y simétrico`, `Frecuencia ${c.v.hr + 45} lpm, irregular, amplitud 4+`, `Frecuencia ${c.v.hr} lpm, desigual y asimétrico`, 'Ausente (0), con retraso radiofemoral'], a: 0,
        why: 'En cada pulso se describen frecuencia, ritmo, amplitud, tensión, igualdad y simetría; el pulso normal coincide con la FC auscultada y es igual en ambos lados.' },
      { q: '¿Dónde se palpa el choque de la punta normal?', options: ['4.º EIC, 2 cm por fuera de la línea medioclavicular', '5.º EIC, en o por dentro de la línea medioclavicular izquierda', '6.º EIC, en la línea axilar anterior', '3.er EIC, en el borde esternal izquierdo'], a: 1,
        why: 'La punta del ventrículo izquierdo golpea la pared torácica en el 5.º EIC, en o ligeramente por dentro de la LMC; mide ≈2 cm y es breve.' },
      { q: 'Intensidad normal de los ruidos cardíacos según el foco:', options: ['R1 más intenso en la base y R2 más intenso en la punta', 'R1 y R2 de igual intensidad en todos los focos', 'R1 más intenso en la punta y R2 más intenso en la base', 'R2 solo se oye en el foco mitral'], a: 2,
        why: 'R1 (cierre mitral y tricuspídeo) predomina en la punta; R2 (cierre aórtico y pulmonar) predomina en la base (focos aórtico y pulmonar).' },
      { q: 'El desdoblamiento fisiológico del R2 se oye mejor…', options: ['en espiración, en el foco mitral', 'en inspiración, en el foco pulmonar', 'en ambas fases por igual, en el foco aórtico', 'solo en decúbito lateral izquierdo, con la campana'], a: 1,
        why: 'En inspiración aumenta el retorno venoso al corazón derecho y P2 se retrasa: A2 y P2 se separan ≈0,03-0,04 s; en espiración se funden.' },
      { q: 'Presión venosa yugular normal con el tronco a 45°:', options: ['Las yugulares siempre llegan hasta el ángulo mandibular', '6-8 cm sobre el ángulo esternal', 'Debe ser imposible verla', '≤3-4 cm sobre el ángulo esternal'], a: 3,
        why: 'Se mide la distancia vertical entre el ángulo esternal y el menisco de la columna venosa; normal ≤3-4 cm (presión venosa central ≈8-9 cmH₂O como máximo).' },
      { q: '¿Cuál es la técnica correcta para el pulso carotídeo?', options: ['Palpar ambas carótidas a la vez para compararlas', 'Masajear el seno carotídeo para valorar el contorno', 'Palpar un lado cada vez, sin masajear, y auscultar antes en busca de soplos', 'Palparlas solo con la persona de pie'], a: 2,
        why: 'La compresión bilateral o el masaje pueden provocar bradicardia, hipotensión o isquemia cerebral; se palpa y ausculta cada lado por separado.' },
      { q: 'Valores normales de perfusión y respuesta ortostática:', options: ['Llenado capilar 5 s; caída de PA ≥30/15 mmHg', 'Llenado capilar <2 s; caída de PA al ponerse de pie <20/10 mmHg', 'Llenado capilar <2 s; caída de PA ≥20/10 mmHg', 'Llenado capilar <10 s; aumento de PA ≥20 mmHg'], a: 1,
        why: 'El lecho ungueal recupera el color en <2 s. La hipotensión ortostática se define como caída ≥20 mmHg sistólica o ≥10 diastólica en los 3 primeros minutos de pie.' }
    ];
  };

  const teaching = [
    'Cuenta los espacios intercostales desde el <b>ángulo esternal</b> (2.ª costilla). El choque de la punta se palpa en el 5.º EIC, en o por dentro de la línea medioclavicular, en <b>decúbito dorsal</b>; en lateral izquierdo se desplaza 2-3 cm y se amplía. Busca frémitos en la base.',
    'Ausculta los 5 focos (aórtico, pulmonar, mesocárdico, tricuspídeo y mitral) con diafragma y campana, y añade la posición adecuada (lateral izquierdo para la punta, sentado inclinado hacia delante para la base). Identifica primero R1 y R2 y analiza sístole y diástole por separado; en inspiración el R2 se desdobla en el foco pulmonar.',
    'La <b>presión venosa yugular</b> se mide a ≈45° como la distancia vertical entre el ángulo esternal y el menisco de la columna venosa (normal ≤3-4 cm). El pulso venoso es bifásico, no palpable y varía con la respiración; el carotídeo es único y palpable. Completa con el reflujo hepatoyugular.',
    'Palpa los pulsos con los pulpejos de 2-3 dedos, compara siempre ambos lados (carótidas por separado) y describe frecuencia, ritmo, amplitud (0 a 4+), tensión, igualdad y simetría; la comparación radial-femoral descarta retraso.',
    'Completa con la perfusión y la presión arterial: llenado capilar <2 s, temperatura y color simétricos, sin edema ni várices; PA en ambos brazos (diferencia <10 mmHg), presión de pulso 30–50 mmHg y PA ortostática (caída <20/10 mmHg).'
  ];

  NormalEngine.build({
    id: 'cardio', title: 'Aparato cardiovascular y pulsos (normal)', icon: '❤️', group: 'Exploración normal',
    desc: 'Precordio, auscultación de los 5 focos, yugulares, pulsos periféricos, perfusión y presión arterial ortostática en personas sanas.',
    bullets: ['Choque de la punta y focos cardíacos (incluido el mesocárdico)', 'Auscultación con fonocardiograma y desdoblamiento fisiológico del R2', 'Pulso venoso yugular, reflujo hepatoyugular y 8 pulsos periféricos bilaterales'],
    refs: [
      'Argente HA, Álvarez ME. <i>Semiología Médica. Fisiopatología, semiotecnia y propedéutica</i>. Panamericana — Aparato cardiovascular: examen del precordio, auscultación cardíaca, pulso venoso y arterial.',
      'Argente HA, Álvarez ME. <i>Semiología Médica</i> — Examen físico general: presión arterial (método palpatorio y auscultatorio, fases de Korotkoff) y pulsos periféricos.',
      'Guía ESC/ESH de hipertensión arterial — medición de la PA en ambos brazos e hipotensión ortostática (caída ≥20/10 mmHg a los 3 min).'
    ],
    teaching, quiz,
    scenes: [precordio, auscultacion, cuello, pulsos, perfusion]
  });
})();
