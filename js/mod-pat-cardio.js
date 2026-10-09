/* Módulo patológico: aparato cardiovascular (síndromes). Hereda las escenas de mod-cardio.js (base 'cardio').
   Ocho pacientes con los grandes síndromes de Argente-Álvarez: estenosis aórtica, insuficiencia mitral, estenosis mitral,
   insuficiencia aórtica, insuficiencia cardíaca, pericarditis aguda, cardiopatía hipertensiva e insuficiencia arterial periférica.
   Cada paciente define `path` (hallazgo patológico por 'escena:region:instrumento'): soplos con irradiación coherente por foco,
   pulsos por punto y lado, yugulares, perfusión y presión arterial; las regiones no listadas devuelven el hallazgo normal. */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const H = (tec, hal) => `<i>Técnica:</i> ${tec} <i>Hallazgo:</i> ${hal}`;
  const fmt = n => String(n).replace('.', ',');

  /* ------------------------------------------------------------ efectos (temporizadores propios, acotados) */
  let timers = [];
  const clearT = () => { timers.forEach(clearTimeout); timers.length = 0; };
  function floatTxt(ctx, txt, dy) {
    const layer = ctx.svg.querySelector('#flash'); if (!layer) return;
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('class', 'svg-hint'); t.setAttribute('x', ctx.point.x); t.setAttribute('y', ctx.point.y - (dy == null ? 22 : dy)); t.setAttribute('text-anchor', 'middle');
    t.textContent = txt; layer.appendChild(t);
    timers.push(setTimeout(() => t.remove(), 3000));
  }
  /* anillos de pulso: opt = { hr, col, beep, r0, dr, dur, alt (pulso alternante), vol } */
  function rings(ctx, n, opt) {
    opt = opt || {}; clearT();
    const layer = ctx.svg.querySelector('#flash'); if (!layer) return;
    const hr = opt.hr || ctx.c.v.hr, T = 60000 / hr;
    const fire = i => {
      if (!layer.isConnected) return;
      const k = opt.alt && i % 2 ? 0.45 : 1;
      const el = document.createElementNS(NS, 'circle');
      el.setAttribute('cx', ctx.point.x); el.setAttribute('cy', ctx.point.y); el.setAttribute('fill', 'none');
      el.setAttribute('stroke', opt.col || '#d9534f'); el.setAttribute('stroke-width', 3);
      layer.appendChild(el);
      U.tween(opt.dur || 520, u => { el.setAttribute('r', (opt.r0 || 6) + (opt.dr || 16) * k * u); el.setAttribute('opacity', 0.85 * (1 - u)); }, () => el.remove());
      if (opt.beep) Sound.beep(opt.beep, 0.05, (opt.vol || 0.12) * k);
    };
    for (let i = 0; i < n; i++) { if (i === 0) fire(0); else timers.push(setTimeout(() => fire(i), i * T)); }
  }
  const absent = (ctx) => { clearT(); floatTxt(ctx, '0 · ausente'); };
  function kor(hr, n) { clearT(); for (let i = 0; i < n; i++) timers.push(setTimeout(() => Sound.korotkoff(0.7), i * 60000 / hr)); }
  const PULSE = {
    normal: { col: '#d9534f', beep: 500 },
    small: { col: '#d9534f', beep: 420, r0: 4, dr: 8, vol: 0.07 },                 // parvus
    tardus: { col: '#d9534f', beep: 400, r0: 4, dr: 9, dur: 900, vol: 0.07 },      // parvus et tardus
    celer: { col: '#d9534f', beep: 640, r0: 7, dr: 26, dur: 300, vol: 0.16 },      // saltón, celer
    alt: { col: '#d9534f', beep: 480, r0: 5, dr: 14, alt: true, vol: 0.1 },        // alternante
    hard: { col: '#d9534f', beep: 520, r0: 6, dr: 18, vol: 0.13 }                  // amplio, pared rígida
  };

  /* ------------------------------------------------------------ auscultación: focos, irradiación y sonido */
  const FB = { ao: [0.75, 1.25], pu: [0.75, 1.2], er: [0.9, 1.1], tr: [1.1, 0.85], mi: [1.3, 0.7] };
  const FN = { ao: 'Foco aórtico', pu: 'Foco pulmonar', er: 'Foco mesocárdico (Erb)', tr: 'Foco tricuspídeo', mi: 'Foco mitral (apexiano)' };
  const XY = { ao: [190, 149], pu: [230, 149], er: [230, 181], tr: [230, 213], mi: [275, 246] };
  const HIGH = { sys_ejection: 1, holosystolic: 1, early_diastolic: 1 };
  /* h = { s1m, s2m, s3 (1 solo campana, 2 también con diafragma: galope), s4 (ídem), snap, s2split, murmur:{kind,level}, rumble:level (rolido añadido con campana), lung, lungGain } */
  function play(ctx, id, tool, h) {
    const c = ctx.c, bell = tool === 'bell';
    const heart = { rate: c.v.hr, s1: FB[id][0] * (h.s1m || 1), s2: FB[id][1] * (h.s2m || 1) };
    if (bell) { heart.s1 *= 0.8; heart.s2 *= 0.8; }
    if (h.s3 && (bell || h.s3 >= 2)) heart.s3 = 1;
    if (h.s4 && (bell || h.s4 >= 2)) heart.s4 = 1;
    if (h.snap) heart.snap = 1;
    if (h.s2split) heart.s2split = h.s2split;
    let m = h.murmur;
    if (bell && h.rumble) m = { kind: 'diastolic_rumble', level: h.rumble };
    if (m && m.level > 0) {
      let lv = m.level;
      if (bell && HIGH[m.kind]) lv *= 0.5;
      if (!bell && m.kind === 'diastolic_rumble') lv *= 0.45;
      heart.murmur = { kind: m.kind, level: Math.min(1, lv) };
    }
    const o = { heart, heartGain: 1, mode: bell ? 'bell' : 'diaphragm' };
    if (h.lung && h.lungGain) { o.lung = h.lung; o.lungGain = bell ? h.lungGain * 0.6 : h.lungGain; }
    Sound.listen(o);
    /* marcador y rótulo del fonocardiograma de la escena base */
    const a = ctx.svg.querySelector('#cvAct');
    if (a) { a.style.display = ''; a.setAttribute('transform', `translate(${XY[id][0]} ${XY[id][1]})`); }
    const stage = ctx.svg.parentElement;
    if (stage) {
      const t = stage.querySelector('#cvTitle'), s = stage.querySelector('#cvSub');
      if (t) t.textContent = FN[id];
      if (s) s.textContent = (bell ? 'Campana' : 'Diafragma') + ' · ' + c.diag;
    }
  }
  const AUS_TEC = 'diafragma con presión firme; identificar R1 y R2 y analizar sístole y diástole por separado.';
  const BELL_TEC = 'campana apoyada sin presión (ruidos graves: R3, R4, rolido).';
  /* foci = { ao:{ d, b, h, hb }, … }: d/b = hallazgo con diafragma/campana; h = sonido; hb = sonido con campana (por defecto h). */
  function ausPath(foci) {
    const P = {};
    Object.keys(foci).forEach(id => {
      const f = foci[id];
      P[`aus:${id}:steth`] = { html: H(AUS_TEC, f.d), run: ctx => play(ctx, id, 'steth', f.h || {}) };
      P[`aus:${id}:bell`] = { html: H(BELL_TEC, f.b || f.d), run: ctx => play(ctx, id, 'bell', f.hb || f.h || {}) };
    });
    return P;
  }
  /* pulsos: table = { car:{ D:[grado, html, efecto], I:[…] }, … }; grado 0 = ausente */
  const SN = { car: 'carotídeo', bra: 'braquial', rad: 'radial', cub: 'cubital', fem: 'femoral', pop: 'poplíteo', tib: 'tibial posterior', ped: 'pedio' };
  function pulsePath(table) {
    const P = {};
    Object.keys(table).forEach(k => Object.keys(table[k]).forEach(side => {
      const [g, html, fx] = table[k][side];
      const nm = `Pulso ${SN[k]} ${side === 'D' ? 'derecho' : 'izquierdo'}`;
      P[`pul:${k}${side}:palp`] = {
        html: `<i>Técnica:</i> pulpejos de 2-3 dedos, comparar con el lado opuesto. <i>Hallazgo:</i> ${nm} <b>${g === 0 ? '0 (ausente)' : g}</b>: ${html}`,
        run: ctx => (g === 0 ? absent(ctx) : rings(ctx, 6, PULSE[fx || 'normal']))
      };
    }));
    return P;
  }

  /* ------------------------------------------------------------ overlays (precordio/auscultación 420×560; pulsos 460×720; perfusión 840×570) */
  const SK = '#f1c9a5', SKD = '#b98a63';
  const nota = (txt, x, y) => `<rect x="${x}" y="${y - 14}" width="${10 + txt.length * 6.1}" height="20" rx="5" fill="#fff" opacity=".92" stroke="#cfd8e2"/><text x="${x + 6}" y="${y}" class="svg-small">${txt}</text>`;
  const pulseDot = (x, y, r, col) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" opacity=".35"><animate attributeName="r" values="${r};${r + 8};${r}" dur="0.9s" repeatCount="indefinite"/></circle><circle cx="${x}" cy="${y}" r="4" fill="${col}"/>`;
  /* choque de la punta desplazado y amplio (6.º EIC, por fuera de la LMC) */
  const apexDesp = pulseDot(302, 266, 12, '#d9534f') + `<path d="M275,246 L298,264" stroke="#d9534f" stroke-width="1.5" stroke-dasharray="3 3" fill="none"/>` +
    `<circle cx="275" cy="246" r="4" fill="none" stroke="#d9534f" stroke-width="1.2" stroke-dasharray="2 2"/>` + nota('Choque de la punta desplazado (6.º EIC, por fuera de la LMC)', 8, 384);
  /* latido paraesternal sostenido del ventrículo derecho */
  const vdLift = `<ellipse cx="230" cy="205" rx="16" ry="30" fill="#d9534f" opacity=".16"><animate attributeName="opacity" values=".1;.28;.1" dur="0.9s" repeatCount="indefinite"/></ellipse>`;
  /* yugulares ingurgitadas en el cuello del torso anterior */
  const jugTorso = `<path d="M236,16 C240,40 244,66 248,92" fill="none" stroke="#2f62a8" stroke-width="4" stroke-linecap="round" opacity=".55"/>` +
    `<path d="M184,16 C180,40 176,66 172,92" fill="none" stroke="#2f62a8" stroke-width="4" stroke-linecap="round" opacity=".55"/>` + nota('Ingurgitación yugular bilateral', 8, 404);
  const cuelloNota = txt => nota(txt, 40, 96);
  /* perfusión: cianosis distal en el dorso de la mano (uñas y pulpejos) */
  const cianosis = (() => {
    const lens = [86, 96, 90, 74]; let g = '';
    for (let i = 0; i < 4; i++) { const fx = 64 + i * 24, top = 140 - lens[i]; g += `<rect x="${fx + 3.5}" y="${top + 4}" width="14" height="18" rx="5" fill="#7f8fc9" opacity=".75"/><rect x="${fx + 1}" y="${top + 1}" width="19" height="30" rx="9" fill="#6f7fc0" opacity=".25"/>`; }
    return g + nota('Cianosis distal (uñas y pulpejos)', 20, 262);
  })();
  /* perfusión: edema maleolar y pretibial con fóvea */
  const edema = `<path d="M166,400 C156,440 160,470 170,486 L252,486 C262,470 268,440 256,400 Z" fill="${SK}" stroke="${SKD}" stroke-width="3"/>` +
    `<ellipse cx="211" cy="488" rx="52" ry="14" fill="${SK}" stroke="${SKD}" stroke-width="3"/>` +
    `<ellipse cx="208" cy="452" rx="7" ry="4" fill="#c98f7a" opacity=".8"/><ellipse cx="226" cy="470" rx="6" ry="3.5" fill="#c98f7a" opacity=".7"/>` +
    `<path d="M176,500 L250,500" stroke="${SKD}" stroke-width="1" opacity=".5"/>` +
    nota('Edema maleolar y pretibial, con fóvea (++), bilateral', 20, 552);
  /* perfusión: pie pálido y frío, sin vello (insuficiencia arterial) */
  const piePalido = `<path d="M170,486 L252,486 L266,522 C272,540 250,550 212,550 C174,550 160,540 168,522 Z" fill="#f6ebe2" stroke="${SKD}" stroke-width="3"/>` +
    `<path d="M232,520 L232,548 M246,516 L248,545 M220,522 L220,548 M196,522 L196,548" stroke="${SKD}" stroke-width="1.5" fill="none"/>` +
    `<path d="M172,342 C166,392 174,446 180,484 L240,484 C248,446 256,392 250,342 Z" fill="#f4e4d6" opacity=".7"/>` +
    nota('Pie izquierdo pálido y frío, sin vello, uñas gruesas', 20, 552);
  /* pulsos: palidez del miembro inferior izquierdo (a la derecha del dibujo) */
  const piernaPalida = `<path d="M260,500 L260,640" stroke="#f6ebe2" stroke-width="52" stroke-linecap="round" opacity=".85"/>` +
    `<path d="M276,660 C280,680 276,696 262,698 L240,698 C236,684 240,668 246,660 Z" fill="#f6ebe2" opacity=".9"/>` +
    `<text x="300" y="560" class="svg-small">pierna izquierda</text><text x="300" y="574" class="svg-small">pálida y fría</text>`;
  /* pulsos: danza arterial (insuficiencia aórtica) */
  const danza = pulseDot(216, 112, 9, '#d9534f') + pulseDot(244, 112, 9, '#d9534f') + `<text x="262" y="96" class="svg-small">danza carotídea visible</text>`;

  /* ------------------------------------------------------------ pacientes */
  const PACIENTES = [
    /* 1. ESTENOSIS AÓRTICA */
    {
      id: 'eao', age: 74, sex: 'M', diag: 'Estenosis aórtica',
      complaint: 'Varón de 74 años con disnea de esfuerzo progresiva de un año, dos episodios de síncope al subir escaleras y dolor precordial opresivo con el esfuerzo.',
      vitals: 'FC 68 · PA 112/86 · FR 16 · T 36,5 °C · SpO₂ 96 %',
      v: { hr: 68, sbp: 112, dbp: 86, rr: 16, temp: 36.5, spo2: 96, height: 1.70, weight: 76, waist: 96 },
      path: Object.assign(ausPath({
        ao: { d: '<b>soplo sistólico eyectivo</b> (mesosistólico, «en rombo», rudo y áspero) de <b>intensidad 4/6</b>, máximo en el foco aórtico, que comienza tras el R1 y termina antes del R2; <b>R2 disminuido</b> (A2 débil, válvula calcificada poco móvil); puede haber clic de eyección al inicio del soplo. Irradia a las carótidas y al foco mesocárdico.',
          b: 'con la campana el soplo (agudo) se atenúa; R2 débil; sin R3.', h: { s2m: 0.45, murmur: { kind: 'sys_ejection', level: 1 } } },
        pu: { d: 'soplo sistólico eyectivo irradiado, 3/6, algo menos intenso que en el foco aórtico; R2 débil, sin desdoblamiento apreciable (A2 retrasado).', h: { s2m: 0.6, murmur: { kind: 'sys_ejection', level: 0.6 } } },
        er: { d: 'soplo sistólico eyectivo bien audible (3-4/6) por irradiación desde la base; R1 y R2 de intensidad reducida.', h: { s2m: 0.6, murmur: { kind: 'sys_ejection', level: 0.8 } } },
        tr: { d: 'soplo eyectivo irradiado de menor intensidad (2/6); R1 conservado.', h: { murmur: { kind: 'sys_ejection', level: 0.45 } } },
        mi: { d: 'en la punta el soplo eyectivo sigue oyéndose (2-3/6), aquí de timbre más musical (fenómeno de Gallavardin, no confundir con una insuficiencia mitral); R1 conservado.',
          b: 'con la campana se oye un <b>R4</b> (ruido grave presistólico, antes del R1) por hipertrofia ventricular izquierda; sin rolido.', h: { murmur: { kind: 'sys_ejection', level: 0.5 }, s4: 1 } }
      }), {
        'pre:ao:palp': 'Con la palma sobre el 2.º EIC derecho, en apnea espiratoria: <b>frémito sistólico</b> (vibración palpable, «como el ronroneo de un gato») en el foco aórtico, que se extiende a la fúrcula.',
        'pre:fu:palp': 'En la fúrcula se palpa el <b>frémito sistólico</b> transmitido desde la base; tráquea central.',
        'pre:mi:palp': H('palma y luego pulpejos sobre el ápex, en decúbito dorsal.', '<b>choque de la punta sostenido</b> (prolongado, «empuja» la mano durante casi toda la sístole) y algo más amplio, <b>no desplazado</b>: 5.º EIC, en la LMC. Traduce hipertrofia concéntrica del ventrículo izquierdo por sobrecarga de presión.'),
        'cue:car:palp': { html: H('pulpejos sobre la carótida, un lado cada vez.', `pulso carotídeo <b>pequeño y de ascenso lento</b> (<b>parvus et tardus</b>): amplitud 1+, cúspide tardía y aplanada, a 68 lpm; a veces se palpa un frémito carotídeo transmitido.`), run: ctx => rings(ctx, 6, PULSE.tardus) },
        'cue:car:aus': 'Con el diafragma sobre cada carótida, en apnea breve: <b>soplo sistólico transmitido</b> desde el foco aórtico (rudo, bilateral y simétrico), no un soplo carotídeo propio.',
        'cue:ijv:insp': 'A 45° la columna venosa yugular mide ≈3 cm sobre el ángulo esternal (normal): <b>sin ingurgitación</b>; no hay insuficiencia cardíaca derecha.',
        ...pulsePath({
          car: { D: [1, 'pequeño y de ascenso lento (parvus et tardus), cúspide tardía; frémito transmitido.', 'tardus'], I: [1, 'parvus et tardus, simétrico con el derecho.', 'tardus'] },
          rad: { D: [1, 'pulso pequeño (parvus), rítmico a 68 lpm, igual; pared arterial firme.', 'small'], I: [1, 'pequeño, simétrico con el derecho.', 'small'] },
          bra: { D: [1, 'amplitud disminuida, ascenso lento.', 'tardus'], I: [1, 'amplitud disminuida, simétrico.', 'tardus'] }
        }),
        'pul:carD:aus': 'Soplo sistólico rudo <b>transmitido</b> a la carótida derecha desde el foco aórtico.',
        'pul:carI:aus': 'Soplo sistólico transmitido a la carótida izquierda, igual que en la derecha (bilateral: irradiación, no estenosis carotídea).',
        'per:brD:pa': c => ({ html: H('método palpatorio y luego auscultatorio, brazo a la altura del corazón.', `PA brazo derecho <b>${c.v.sbp}/${c.v.dbp} mmHg</b>: <b>presión de pulso reducida (${c.v.sbp - c.v.dbp} mmHg</b>, normal 30–50) por el obstáculo a la eyección ventricular.`), run: () => kor(c.v.hr, 4) }),
        'per:brI:pa': c => ({ html: `PA brazo izquierdo <b>${c.v.sbp - 4}/${c.v.dbp - 2} mmHg</b> (diferencia &lt;10 mmHg); presión de pulso estrecha en ambos brazos.`, run: () => kor(c.v.hr, 4) }),
        'per:brD:pul': 'Pulso braquial y radial derechos <b>pequeños y de ascenso lento</b> (1+).'
      }),
      overlay: { pre: nota('Frémito sistólico en el foco aórtico · choque de la punta sostenido', 8, 384), aus: nota('Soplo eyectivo máximo en el foco aórtico, irradiado a carótidas', 8, 384) },
      findings: [
        '<b>Precordio:</b> frémito sistólico en el foco aórtico y la fúrcula; choque de la punta sostenido, no desplazado.',
        '<b>Auscultación:</b> <b>soplo sistólico eyectivo</b> rudo 4/6 máximo en el foco aórtico, irradiado a carótidas y foco mesocárdico; <b>R2 disminuido</b>; R4 en la punta con la campana.',
        '<b>Pulsos:</b> carotídeo y radial <b>parvus et tardus</b> (pequeños y de ascenso lento).',
        '<b>PA:</b> presión de pulso reducida (112/86).'
      ],
      teaching: [
        'El soplo eyectivo nace del paso de la sangre por una válvula estrecha durante la eyección: empieza después del R1, crece y decrece («en rombo») y termina antes del R2; cuanto más tardío es su pico y más débil el A2, más grave es la estenosis.',
        'La tríada disnea-angina-síncope de esfuerzo junto a un pulso parvus et tardus y un soplo rudo en la base orienta a estenosis aórtica grave; el frémito indica un soplo ≥4/6.'
      ]
    },

    /* 2. INSUFICIENCIA MITRAL */
    {
      id: 'imi', age: 58, sex: 'F', diag: 'Insuficiencia mitral',
      complaint: 'Mujer de 58 años con disnea de esfuerzo progresiva de 8 meses, palpitaciones y fatiga; soplo conocido desde la juventud (fiebre reumática en la infancia).',
      vitals: 'FC 86 · PA 118/72 · FR 18 · T 36,6 °C · SpO₂ 97 %',
      v: { hr: 86, sbp: 118, dbp: 72, rr: 18, temp: 36.6, spo2: 97, height: 1.60, weight: 64, waist: 86 },
      path: Object.assign(ausPath({
        mi: { d: '<b>soplo holosistólico (pansistólico) regurgitativo</b> de intensidad <b>3/6</b>, «en chorro de vapor», de igual intensidad desde el R1 hasta el R2 (al que incluso tapa), máximo en la punta e <b>irradiado a la axila</b>; <b>R1 disminuido</b>. Se oye mejor en decúbito lateral izquierdo y no cambia con la inspiración.',
          b: 'con la campana y en decúbito lateral izquierdo: <b>R3</b> protodiastólico (sobrecarga de volumen del ventrículo izquierdo) seguido de un rolido corto de hiperflujo; el soplo sistólico se oye más suave.', h: { s1m: 0.55, murmur: { kind: 'holosystolic', level: 1 }, s3: 1 } },
        tr: { d: 'soplo holosistólico irradiado desde la punta (2/6), menos intenso; no aumenta con la inspiración (lo que lo distingue de una insuficiencia tricuspídea).', h: { s1m: 0.75, murmur: { kind: 'holosystolic', level: 0.5 } } },
        er: { d: 'soplo regurgitativo sistólico apenas audible por irradiación (1-2/6); R1 y R2 normales.', h: { murmur: { kind: 'holosystolic', level: 0.35 } } },
        pu: { d: 'ruidos normales con <b>R2 algo reforzado</b> (P2) y leve soplo irradiado; sin fenómenos propios de este foco.', h: { s2m: 1.15, murmur: { kind: 'holosystolic', level: 0.2 } } },
        ao: { d: 'R1 y R2 conservados; el soplo apenas llega a este foco (1/6): la irradiación de la insuficiencia mitral es hacia la axila y el dorso, no hacia la base.', h: { murmur: { kind: 'holosystolic', level: 0.15 } } }
      }), {
        'pre:mi:insp': 'Latido de la punta <b>visible, amplio y desplazado</b> hacia fuera de la LMC (6.º EIC), hiperdinámico.',
        'pre:mi:palp': H('palma y pulpejos sobre el ápex en decúbito dorsal.', '<b>choque de la punta desplazado</b> (6.º EIC, 1-2 cm por fuera de la LMC), <b>amplio (≈3 cm) e hiperdinámico</b>, breve: dilatación del ventrículo izquierdo por sobrecarga de volumen. Sin frémito (soplo de 3/6).'),
        'pre:tr:palp': 'Sin levantamiento paraesternal derecho; a veces se percibe un latido tardío por expansión sistólica de la aurícula izquierda.',
        'cue:ijv:insp': 'A 45° columna venosa ≈3 cm sobre el ángulo esternal: <b>sin ingurgitación yugular</b> (todavía sin fallo derecho).',
        ...pulsePath({
          car: { D: [2, 'amplitud normal, de ascenso rápido (pulso algo «vivo»), rítmico a 86 lpm.'], I: [2, 'simétrico con el derecho.'] },
          rad: { D: [2, 'rítmico a 86 lpm, de ascenso rápido y amplitud normal; igual y simétrico.'], I: [2, 'simétrico con el derecho.'] }
        })
      }),
      overlay: { pre: apexDesp, aus: nota('Soplo holosistólico máximo en la punta, irradiado a la axila', 8, 384) },
      findings: [
        '<b>Precordio:</b> choque de la punta desplazado hacia fuera y abajo, amplio e hiperdinámico.',
        '<b>Auscultación:</b> <b>soplo holosistólico regurgitativo</b> 3/6 en la punta, <b>irradiado a la axila</b>, con <b>R1 disminuido</b>; R3 con la campana en decúbito lateral izquierdo.',
        '<b>Pulsos:</b> normales, de ascenso rápido. <b>Yugulares:</b> sin ingurgitación.'
      ],
      teaching: [
        'El soplo regurgitativo sistólico comienza con el R1 y dura toda la sístole con intensidad uniforme (holosistólico), porque la aurícula izquierda está a baja presión desde el inicio de la contracción; se irradia en la dirección del chorro (axila).',
        'La sobrecarga de volumen dilata el ventrículo izquierdo: choque de la punta desplazado y amplio y R3; la sobrecarga de presión (estenosis aórtica, hipertensión) lo hace sostenido y produce R4.'
      ]
    },

    /* 3. ESTENOSIS MITRAL */
    {
      id: 'emi', age: 42, sex: 'F', diag: 'Estenosis mitral',
      complaint: 'Mujer de 42 años con disnea de esfuerzo de 2 años, ortopnea reciente, dos episodios de hemoptisis y palpitaciones; antecedente de fiebre reumática a los 11 años.',
      vitals: 'FC 88 · PA 108/72 · FR 20 · T 36,6 °C · SpO₂ 95 %',
      v: { hr: 88, sbp: 108, dbp: 72, rr: 20, temp: 36.6, spo2: 95, height: 1.58, weight: 55, waist: 76 },
      path: Object.assign(ausPath({
        mi: { d: '<b>R1 intenso y «chasqueante»</b>; tras el R2, <b>chasquido de apertura</b> (ruido breve, agudo, protodiastólico); luego, con el diafragma, apenas se insinúa un ruido grave diastólico: hay que pasar a la <b>campana</b>.',
          b: 'con la campana, en decúbito lateral izquierdo y tras un pequeño esfuerzo: <b>rolido (retumbo) diastólico</b> grave, de baja intensidad (2/6), que comienza tras el chasquido de apertura y se <b>refuerza al final de la diástole (refuerzo presistólico)</b> por la contracción auricular; localizado en un área pequeña de la punta, no irradia.',
          h: { s1m: 1.5, snap: 1, murmur: { kind: 'diastolic_rumble', level: 1 } } },
        tr: { d: 'R1 intenso transmitido y chasquido de apertura aún audible (se oye entre la punta y el borde esternal izquierdo); sin soplo sistólico.', b: 'rolido diastólico apenas audible por vecindad (el rolido mitral queda circunscrito a la punta).', h: { s1m: 1.25, snap: 1, murmur: { kind: 'diastolic_rumble', level: 0.35 } } },
        er: { d: 'chasquido de apertura audible (es donde mejor se separa del R2); R1 intenso; sin soplo.', h: { s1m: 1.1, snap: 1 } },
        pu: { d: '<b>R2 reforzado</b> por aumento del componente pulmonar (<b>P2 intenso</b>, hipertensión pulmonar secundaria); R1 algo aumentado; sin soplo.', h: { s2m: 1.4, s1m: 1.1 } },
        ao: { d: 'R1 y R2 conservados; sin soplo sistólico en la base. Los hallazgos de la estenosis mitral se concentran en la punta.', h: {} }
      }), {
        'pre:mi:insp': '<b>Facies mitral</b>: chapetas malares cianóticas con palidez del resto de la cara (en la inspección general). Choque de la punta no visible.',
        'pre:mi:palp': H('palma y pulpejos sobre el ápex, en decúbito lateral izquierdo.', '<b>choque de la punta de localización normal</b> (5.º EIC, LMC), pequeño; se palpa el <b>R1 intenso</b> como un golpe seco y, con la mano bien apoyada, un <b>frémito diastólico</b> suave en un área pequeña de la punta (el rolido palpable).'),
        'pre:tr:palp': 'Con el talón de la mano sobre el borde esternal izquierdo, en espiración: <b>levantamiento paraesternal sostenido</b> (ventrículo derecho sobrecargado por la hipertensión pulmonar).',
        'pre:pu:palp': 'En el foco pulmonar se palpa el <b>cierre pulmonar (P2)</b> como un pequeño golpe al final de la sístole: signo de hipertensión pulmonar.',
        'cue:ijv:insp': 'A 45° columna venosa ≈4 cm sobre el ángulo esternal (límite alto) con <b>onda «a» prominente</b> (contracción auricular derecha contra un ventrículo derecho hipertrófico).',
        ...pulsePath({
          car: { D: [2, 'amplitud normal o algo pequeña, rítmico a 88 lpm (si aparece fibrilación auricular el pulso se vuelve irregular y desigual).'], I: [2, 'simétrico con el derecho.'] },
          rad: { D: [1, 'pulso <b>pequeño</b> (bajo volumen sistólico), regular a 88 lpm, igual y simétrico.', 'small'], I: [1, 'pequeño, simétrico.', 'small'] }
        }),
        'per:nail:insp': 'Lecho ungueal con <b>cianosis leve</b> y dedos fríos (bajo gasto y vasoconstricción periférica).',
        'per:nail:cap': { html: 'Llenado capilar ≈2,5 s (algo <b>enlentecido</b>), con extremidades frías.', run: ctx => floatTxt(ctx, '≈2,5 s', 30) },
        'per:dors:temp': 'Dorso de las manos <b>frío</b>, simétrico, con cianosis distal.'
      }),
      overlay: { pre: vdLift + nota('Levantamiento paraesternal (VD) · R1 palpable en la punta', 8, 384), aus: nota('Rolido diastólico en la punta: campana, decúbito lateral izquierdo', 8, 384), per: cianosis },
      findings: [
        '<b>Precordio:</b> choque de la punta normal; R1 palpable; frémito diastólico apexiano; levantamiento paraesternal del ventrículo derecho.',
        '<b>Auscultación:</b> <b>R1 intenso</b>, <b>chasquido de apertura</b> y <b>rolido diastólico con refuerzo presistólico</b> en la punta (campana, decúbito lateral izquierdo); <b>P2 reforzado</b>.',
        '<b>Pulsos:</b> pequeños, regulares. <b>Perfusión:</b> cianosis distal, facies mitral.'
      ],
      teaching: [
        'La «ritmo de Duroziez» de la estenosis mitral: R1 fuerte, R2, chasquido de apertura y rolido con refuerzo presistólico. Todo ocurre en la diástole y en la punta, y solo se oye con la campana apoyada suavemente, en decúbito lateral izquierdo.',
        'Cuanto más cerca del R2 está el chasquido de apertura y más largo es el rolido, mayor es la presión auricular izquierda (estenosis más grave). El refuerzo presistólico desaparece si aparece fibrilación auricular.'
      ]
    },

    /* 4. INSUFICIENCIA AÓRTICA */
    {
      id: 'iao', age: 36, sex: 'M', diag: 'Insuficiencia aórtica',
      complaint: 'Varón de 36 años, alto y delgado, con palpitaciones que percibe en el cuello y al acostarse, disnea de esfuerzo leve y «latidos en la cabeza»; válvula aórtica bicúspide conocida.',
      vitals: 'FC 76 · PA 150/52 · FR 16 · T 36,5 °C · SpO₂ 98 %',
      v: { hr: 76, sbp: 150, dbp: 52, rr: 16, temp: 36.5, spo2: 98, height: 1.88, weight: 74, waist: 82 },
      path: Object.assign(ausPath({
        er: { d: '<b>soplo diastólico regurgitativo</b> (protodiastólico, decreciente, <b>aspirativo</b>, agudo y suave) de <b>3/6</b> que comienza inmediatamente después del R2 y decrece; máximo en el foco mesocárdico (Erb), se oye mejor <b>sentado, inclinado hacia delante y en apnea espiratoria</b>. R2 algo disminuido.',
          b: 'con la campana el soplo (agudo) se atenúa mucho; sin R3.', h: { s2m: 0.8, murmur: { kind: 'early_diastolic', level: 1 } } },
        ao: { d: 'soplo diastólico regurgitativo aspirativo 2-3/6 (menor que en Erb: la regurgitación se irradia hacia abajo por el borde esternal izquierdo) y, además, un <b>soplo sistólico eyectivo suave de hiperflujo</b> (2/6) por el gran volumen que atraviesa la válvula; R2 débil.', h: { s2m: 0.8, murmur: { kind: 'early_diastolic', level: 0.8 } } },
        pu: { d: 'soplo diastólico regurgitativo irradiado, 2/6; R2 débil; en jóvenes puede confundirse con un soplo pulmonar (Graham Steell): aquí la PA diastólica baja y el pulso saltón lo aclaran.', h: { s2m: 0.85, murmur: { kind: 'early_diastolic', level: 0.5 } } },
        tr: { d: 'soplo diastólico irradiado por el borde esternal izquierdo (2/6), decreciente; R1 normal.', h: { murmur: { kind: 'early_diastolic', level: 0.5 } } },
        mi: { d: 'en la punta el soplo regurgitativo aórtico llega atenuado (1-2/6); <b>R1 normal o algo disminuido</b> (cierre mitral precoz). Choque de la punta hiperdinámico bajo el fonendoscopio.',
          b: 'con la campana y en decúbito lateral izquierdo: <b>rolido diastólico suave (soplo de Austin Flint)</b> por el chorro de regurgitación que choca con la valva anterior mitral; sin chasquido de apertura ni R1 intenso (a diferencia de la estenosis mitral).',
          h: { s1m: 0.85, murmur: { kind: 'early_diastolic', level: 0.4 }, rumble: 0.55 } }
      }), {
        'pre:mi:insp': 'Latido de la punta <b>visible, amplio y desplazado</b> hacia fuera y abajo (6.º EIC, por fuera de la LMC), muy hiperdinámico.',
        'pre:mi:palp': H('palma y pulpejos sobre el ápex.', '<b>choque de la punta desplazado</b> hacia abajo y afuera (6.º EIC, 2 cm por fuera de la LMC), <b>amplio e hiperdinámico</b> («en cúpula»), breve: dilatación del ventrículo izquierdo por sobrecarga de volumen. Sin frémito.'),
        'pre:fu:insp': 'Latido visible de las carótidas en el cuello (<b>danza arterial</b>) y pulsación de la fúrcula con cada sístole.',
        'pre:er:palp': 'Sin frémito (el soplo diastólico es suave); a veces se percibe un latido sistólico vivo en el borde esternal izquierdo.',
        'cue:car:insp': '<b>Danza arterial</b>: latidos carotídeos amplios, visibles a distancia; cabeza con ligero balanceo sincrónico con el pulso (signo de Musset).',
        'cue:car:palp': { html: H('pulpejos sobre la carótida, un lado cada vez.', 'pulso carotídeo <b>amplio, de ascenso rápido y colapso brusco</b> (<b>pulso celer o saltón, de Corrigan</b>), 3+/4+, rítmico a 76 lpm; a veces doble cúspide (bisferiens).'), run: ctx => rings(ctx, 6, PULSE.celer) },
        'cue:car:aus': 'Sobre la carótida: ruidos cardíacos transmitidos, sin soplo carotídeo; el soplo diastólico no se transmite al cuello.',
        ...pulsePath({
          car: { D: [3, '<b>celer (saltón, de Corrigan)</b>: ascenso rápido, gran amplitud y colapso brusco.', 'celer'], I: [3, 'celer, simétrico.', 'celer'] },
          rad: { D: [3, 'saltón, de ascenso y descenso rápidos («en martillo de agua»), rítmico a 76 lpm; se exagera al elevar el brazo.', 'celer'], I: [3, 'saltón, simétrico.', 'celer'] },
          bra: { D: [3, 'amplio y celer.', 'celer'], I: [3, 'amplio y celer, simétrico.', 'celer'] },
          fem: { D: [3, 'saltón; véase la auscultación femoral.', 'celer'], I: [3, 'saltón, simétrico.', 'celer'] },
          ped: { D: [3, 'amplio y celer, bilateral.', 'celer'], I: [3, 'amplio y celer.', 'celer'] }
        }),
        'pul:femD:aus': 'Diafragma apoyado suavemente sobre la femoral: <b>ruido «en pistoletazo» (signo de Traube)</b> con cada sístole; al comprimir gradualmente la arteria con el borde del fonendoscopio aparece un <b>doble soplo (sistólico y diastólico) de Duroziez</b>.',
        'pul:femI:aus': 'Pistoletazo femoral (signo de Traube) y doble soplo de Duroziez al comprimir, igual que en el lado derecho.',
        'pul:radD:cmp': 'Radial derecho e izquierdo <b>saltones y simétricos</b>; sin retraso radiofemoral.',
        'per:nail:cap': { html: 'Lecho ungueal: al presionar suavemente el borde de la uña se ve un <b>enrojecimiento y palidez alternantes sincrónicos con el pulso</b> (<b>pulso capilar de Quincke</b>). Llenado capilar inmediato (&lt;1 s).', run: ctx => rings(ctx, 6, { col: '#e0a030', r0: 4, dr: 10, beep: 0, dur: 350 }) },
        'per:brD:pa': c => ({ html: H('método palpatorio y auscultatorio.', `PA brazo derecho <b>${c.v.sbp}/${c.v.dbp} mmHg</b>: <b>presión de pulso muy amplia (${c.v.sbp - c.v.dbp} mmHg)</b> por la elevación de la sistólica (gran volumen eyectado) y el descenso de la diastólica (fuga hacia el ventrículo). Los ruidos de Korotkoff se oyen a veces hasta 0 mmHg (se toma la fase IV como diastólica).`), run: () => kor(c.v.hr, 5) }),
        'per:brI:pa': c => ({ html: `PA brazo izquierdo <b>${c.v.sbp - 4}/${c.v.dbp}</b> mmHg (diferencia &lt;10 mmHg); presión de pulso amplia en ambos brazos. En el miembro inferior la sistólica supera a la del brazo en &gt;40-60 mmHg (signo de Hill).`, run: () => kor(c.v.hr, 5) }),
        'per:brD:pul': 'Pulso braquial y radial derechos <b>saltones (celer)</b>, 3+, de ascenso rápido y colapso brusco.',
        'per:brI:pul': 'Pulso braquial y radial izquierdos saltones, simétricos.'
      }),
      overlay: { pre: apexDesp + nota('Danza arterial en el cuello', 8, 404), aus: nota('Soplo diastólico aspirativo en Erb: sentado, inclinado, apnea espiratoria', 8, 384), pul: danza },
      findings: [
        '<b>Precordio:</b> choque de la punta desplazado, amplio e hiperdinámico; danza arterial en el cuello.',
        '<b>Auscultación:</b> <b>soplo diastólico regurgitativo aspirativo</b> 3/6 máximo en el foco mesocárdico, sentado e inclinado hacia delante; soplo eyectivo de hiperflujo en la base; rolido de Austin Flint en la punta.',
        '<b>Pulsos:</b> <b>celer, saltón (Corrigan)</b> en todos los puntos; pistoletazo femoral y doble soplo de Duroziez; pulso capilar de Quincke.',
        '<b>PA:</b> 150/52, <b>presión de pulso amplia</b>.'
      ],
      teaching: [
        'El soplo regurgitativo aórtico es agudo, aspirativo y decreciente porque la sangre vuelve al ventrículo desde el comienzo de la diástole y con gradiente decreciente; se busca con el diafragma, con la persona sentada, inclinada hacia delante y en apnea espiratoria.',
        'Los «signos periféricos» (pulso celer, danza arterial, Musset, Quincke, Traube, Duroziez, presión de pulso amplia) traducen el gran volumen sistólico con fuga diastólica, y son tanto más llamativos cuanto más grave y crónica es la insuficiencia.'
      ]
    },

    /* 5. INSUFICIENCIA CARDÍACA */
    {
      id: 'icc', age: 69, sex: 'M', diag: 'Insuficiencia cardíaca (síndrome de insuficiencia cardíaca congestiva)',
      complaint: 'Varón de 69 años, con infarto previo, que consulta por disnea progresiva hasta hacerse de mínimos esfuerzos, ortopnea (duerme con 3 almohadas), disnea paroxística nocturna y edemas en los tobillos de 3 semanas.',
      vitals: 'FC 104 · PA 100/68 · FR 24 · T 36,4 °C · SpO₂ 92 %',
      v: { hr: 104, sbp: 100, dbp: 68, rr: 24, temp: 36.4, spo2: 92, height: 1.72, weight: 84, waist: 102 },
      path: Object.assign(ausPath({
        mi: { d: '<b>taquicardia</b> (104 lpm) rítmica con <b>R3 protodiastólico</b> que, por la frecuencia elevada, da una cadencia de tres tiempos: <b>ritmo de galope ventricular</b>. Soplo holosistólico suave (2/6) de insuficiencia mitral funcional por dilatación del ventrículo. Al desplazar el fonendoscopio hacia las bases pulmonares: <b>estertores crepitantes bibasales</b>.',
          b: 'con la campana el <b>R3 (galope)</b> es muy evidente, grave, ≈0,15 s tras el R2; ritmo de galope a 104 lpm.',
          h: { s3: 2, s1m: 0.8, murmur: { kind: 'holosystolic', level: 0.4 }, lung: { type: 'normal', adv: ['fine_crackles'] }, lungGain: 0.35 } },
        tr: { d: 'taquicardia con R3 audible (galope); soplo sistólico suave; en la base pulmonar vecina, crepitantes.', h: { s3: 2, murmur: { kind: 'holosystolic', level: 0.25 }, lung: { type: 'normal', adv: ['fine_crackles'] }, lungGain: 0.3 } },
        er: { d: 'ruidos taquicárdicos y apagados; R3 audible; sin soplos relevantes.', h: { s3: 1, s1m: 0.8, s2m: 0.9 } },
        pu: { d: 'ruidos taquicárdicos; <b>R2 reforzado (P2)</b> por hipertensión venocapilar pulmonar.', h: { s2m: 1.3, s1m: 0.8 } },
        ao: { d: 'ruidos taquicárdicos, de intensidad algo disminuida; sin soplo eyectivo.', h: { s1m: 0.8, s2m: 0.9 } }
      }), {
        'pre:mi:insp': 'Latido de la punta visible, <b>desplazado hacia fuera y abajo</b>, difuso. Ortopnea: la persona no tolera el decúbito dorsal plano (explorar semisentado).',
        'pre:mi:palp': H('palma y pulpejos sobre el ápex, semisentado.', '<b>choque de la punta desplazado</b> (6.º EIC, por fuera de la LMC), <b>amplio y difuso</b>, de poca fuerza (cardiomegalia con disfunción sistólica); puede palparse el R3 como un golpe suave en protodiástole.'),
        'pre:fu:insp': '<b>Ingurgitación yugular visible</b> a ambos lados del cuello, incluso semisentado.',
        'pre:ep:palp': 'Epigastrio: <b>hígado palpable, doloroso y congestivo</b>, 3-4 cm por debajo del reborde costal (hepatomegalia congestiva); latido epigástrico del ventrículo derecho.',
        'cue:ijv:insp': { html: H('tronco a 45°, luz tangencial.', '<b>ingurgitación yugular</b>: la columna venosa llega hasta el ángulo mandibular, <b>≈8-9 cm sobre el ángulo esternal</b> (normal ≤3-4 cm; presión venosa central ≈13-14 cmH₂O), con ondas «a» y «v» visibles; sigue visible con el tronco a 60-90°. Traduce hipertensión venosa sistémica por fallo derecho.'), run: ctx => { const v = ctx.svg.querySelector('#nkV1'); if (v) { v.setAttribute('stroke', '#2f62a8'); v.setAttribute('stroke-width', '1.8'); } } },
        'cue:ijv:palp': 'La columna yugular ingurgitada <b>no es palpable</b> y se oblitera con presión suave en la base del cuello (lo que la distingue de la carótida); su nivel desciende poco con la inspiración.',
        'cue:hig:rhy': { html: H('presión firme y mantenida sobre el hipocondrio derecho 10-30 s, respirando con normalidad.', '<b>reflujo hepatoyugular positivo</b>: la columna yugular <b>asciende ≥3-4 cm y se mantiene elevada durante toda la compresión</b> (el ventrículo derecho no acepta el retorno venoso extra); el hígado está aumentado de tamaño y es doloroso a la presión.'), run: ctx => { const v = ctx.svg.querySelector('#nkV1'); if (v) { v.setAttribute('stroke', '#2f62a8'); v.setAttribute('stroke-width', '2.4'); } } },
        'cue:car:palp': { html: H('pulpejos sobre la carótida, un lado cada vez.', 'pulso carotídeo <b>pequeño</b>, rápido (104 lpm), rítmico; en algunos latidos <b>alterna una pulsación fuerte con otra débil (pulso alternante)</b>, signo de disfunción ventricular izquierda grave.'), run: ctx => rings(ctx, 6, PULSE.alt) },
        ...pulsePath({
          car: { D: [1, 'pequeño y rápido (104 lpm), rítmico, <b>alternante</b>.', 'alt'], I: [1, 'pequeño, alternante, simétrico.', 'alt'] },
          rad: { D: [1, 'pequeño, rápido (104 lpm), rítmico, <b>alternante</b> (se aprecia mejor al desinflar lentamente el manguito: primero se oyen la mitad de los latidos).', 'alt'], I: [1, 'pequeño y alternante, simétrico.', 'alt'] },
          bra: { D: [1, 'amplitud disminuida.', 'small'], I: [1, 'amplitud disminuida, simétrico.', 'small'] },
          ped: { D: [1, 'presente pero débil, pie frío y edematoso (difícil de palpar por el edema).', 'small'], I: [1, 'débil, simétrico; edema del dorso del pie.', 'small'] },
          tib: { D: [1, 'débil, difícil de localizar por el edema maleolar.', 'small'], I: [1, 'débil, simétrico.', 'small'] }
        }),
        'per:tib:fov': { html: '<b>Signo de fóvea positivo (++)</b>: tras presionar ≈5 s sobre la cara anterior de la tibia queda una depresión de ≈4 mm que tarda 10-15 s en desaparecer. <b>Edema bilateral y simétrico</b>, blando, frío e indoloro, que aumenta por la tarde: edema cardíaco (de declive).', run: ctx => { const layer = ctx.svg.querySelector('#flash'); if (!layer) return; const d = document.createElementNS(NS, 'ellipse'); d.setAttribute('cx', ctx.point.x); d.setAttribute('cy', ctx.point.y); d.setAttribute('rx', 10); d.setAttribute('ry', 6); d.setAttribute('fill', '#c98f7a'); d.setAttribute('opacity', '.8'); layer.appendChild(d); timers.push(setTimeout(() => d.remove(), 12000)); } },
        'per:tib:insp': 'Pierna <b>aumentada de volumen</b>, piel tensa y brillante, con <b>edema pretibial y maleolar bilateral</b>; sin eritema ni cambios tróficos.',
        'per:tib:temp': 'Piernas <b>frías</b> (vasoconstricción por bajo gasto), simétricas.',
        'per:tib:pul': 'Pulsos distales presentes pero débiles (1+), difíciles de palpar por el edema.',
        'per:var:fov': '<b>Fóvea positiva (++)</b> en el maléolo y el tobillo, bilateral.',
        'per:var:insp': 'Tobillo <b>edematoso</b>, con el relieve de los maléolos borrado; sin várices.',
        'per:pie:fov': '<b>Fóvea positiva</b> en el dorso del pie (++), bilateral.',
        'per:pie:insp': 'Dorso del pie <b>edematoso</b>, con huella del calzado y de los calcetines; color pálido-cianótico distal.',
        'per:pie:temp': 'Pies <b>fríos</b>, simétricos.',
        'per:pie:pul': 'Pedio y tibial posterior débiles (1+) bilaterales, difíciles de palpar por el edema.',
        'per:dors:temp': 'Manos <b>frías y algo sudorosas</b>, simétricas (hipoperfusión periférica).',
        'per:dors:insp': 'Dorso de las manos con <b>cianosis distal</b> leve; sin edema en los miembros superiores.',
        'per:nail:cap': { html: '<b>Llenado capilar enlentecido: ≈3 s</b> (normal &lt;2 s), con lecho ungueal pálido-cianótico: hipoperfusión por bajo gasto.', run: ctx => floatTxt(ctx, '≈3 s', 30) },
        'per:nail:insp': 'Lecho ungueal <b>pálido y algo cianótico</b>; dedos fríos.',
        'per:brD:pa': c => ({ html: H('método palpatorio y auscultatorio, semisentado.', `PA brazo derecho <b>${c.v.sbp}/${c.v.dbp} mmHg</b>, presión de pulso ${c.v.sbp - c.v.dbp} mmHg (reducida: bajo volumen sistólico); FC ${c.v.hr} lpm. Al desinflar lentamente se oyen al principio solo la mitad de los latidos (<b>pulso alternante</b>).`), run: () => kor(c.v.hr, 5) }),
        'per:brI:pa': c => ({ html: `PA brazo izquierdo <b>${c.v.sbp - 4}/${c.v.dbp - 2} mmHg</b> (diferencia &lt;10 mmHg).`, run: () => kor(c.v.hr, 5) }),
        'per:ort0:pa': c => ({ html: `PA en decúbito (semisentado, no tolera el plano): <b>${c.v.sbp}/${c.v.dbp} mmHg</b>, FC ${c.v.hr} lpm.`, run: () => kor(c.v.hr, 4) }),
        'per:ort1:pa': c => ({ html: `PA al minuto de pie: <b>${c.v.sbp - 10}/${c.v.dbp - 2} mmHg</b>, FC ${c.v.hr + 8} lpm; mareo leve. Caída de 10 mmHg: todavía no cumple el criterio de hipotensión ortostática (≥20/10).`, run: () => kor(c.v.hr + 8, 4) }),
        'per:ort3:pa': c => ({ html: `PA a los 3 min de pie: <b>${c.v.sbp - 12}/${c.v.dbp - 4} mmHg</b>, FC ${c.v.hr + 10} lpm; el ortostatismo lo fatiga: interrumpir la prueba.`, run: () => kor(c.v.hr + 10, 4) })
      }),
      overlay: { pre: apexDesp + jugTorso, aus: nota('Galope por R3 en la punta · crepitantes bibasales', 8, 384), cue: cuelloNota('Ingurgitación yugular hasta el ángulo mandibular (≈8-9 cm a 45°)'), per: edema + cianosis },
      findings: [
        '<b>Inspección:</b> ortopnea, taquipnea, <b>ingurgitación yugular</b> a 45° (≈8-9 cm), edemas maleolares y pretibiales bilaterales <b>con fóvea</b>, cianosis distal.',
        '<b>Precordio:</b> choque de la punta desplazado, amplio y difuso; hepatomegalia congestiva dolorosa.',
        '<b>Auscultación:</b> taquicardia con <b>R3: ritmo de galope</b>; soplo sistólico suave de insuficiencia mitral funcional; P2 reforzado; <b>estertores crepitantes bibasales</b>.',
        '<b>Cuello:</b> <b>reflujo hepatoyugular positivo</b>. <b>Pulsos:</b> pequeños, rápidos, <b>alternantes</b>; llenado capilar ≈3 s; extremidades frías. PA 100/68 con presión de pulso reducida.'
      ],
      teaching: [
        'Signos de fallo izquierdo (congestión pulmonar): disnea, ortopnea, crepitantes bibasales, R3 con galope, P2 reforzado. Signos de fallo derecho (congestión sistémica): ingurgitación yugular, reflujo hepatoyugular positivo, hepatomegalia dolorosa, edema con fóvea de declive. Signos de bajo gasto: pulso pequeño y alternante, extremidades frías, llenado capilar lento, presión de pulso reducida.',
        'El R3 es un ruido grave y protodiastólico (llenado rápido de un ventrículo dilatado): fisiológico en jóvenes, pero en un adulto mayor con taquicardia constituye el galope ventricular, uno de los signos más específicos de insuficiencia cardíaca.'
      ]
    },

    /* 6. PERICARDITIS AGUDA */
    {
      id: 'peri', age: 29, sex: 'M', diag: 'Pericarditis aguda',
      complaint: 'Varón de 29 años con dolor retroesternal punzante de 2 días, que aumenta con la inspiración profunda, la tos y el decúbito dorsal y se alivia sentado e inclinado hacia delante; cuadro gripal la semana anterior; fiebre de 38 °C.',
      vitals: 'FC 98 · PA 118/76 · FR 20 · T 38,1 °C · SpO₂ 97 %',
      v: { hr: 98, sbp: 118, dbp: 76, rr: 20, temp: 38.1, spo2: 97, height: 1.78, weight: 72, waist: 84 },
      path: Object.assign(ausPath({
        er: { d: '<b>frote pericárdico</b>: ruido <b>rudo, superficial, «como cuero nuevo» o «como pisar nieve»</b>, que parece nacer bajo el fonendoscopio, en <b>tres tiempos</b> (presistólico, sistólico y protodiastólico) que se superponen a R1 y R2. Máximo en el <b>foco mesocárdico y borde esternal izquierdo</b>, <b>sentado e inclinado hacia delante en apnea espiratoria</b>, con presión firme del diafragma; <b>no irradia</b>, varía de un momento a otro y persiste al contener la respiración (no es pleural). Taquicardia 98 lpm.',
          b: 'con la campana el frote (agudo, raspante) se oye peor; ruidos cardíacos de intensidad normal.',
          h: { lung: { type: 'absent', adv: ['rub'] }, lungGain: 0.9 } },
        tr: { d: 'frote pericárdico en tres tiempos bien audible en el borde paraesternal izquierdo bajo, raspante, que no se modifica con la apnea.', h: { lung: { type: 'absent', adv: ['rub'] }, lungGain: 0.8 } },
        mi: { d: 'frote pericárdico audible en la punta pero <b>menos intenso</b> que en el mesocardio; R1 y R2 conservados, sin soplos ni R3.', h: { lung: { type: 'absent', adv: ['rub'] }, lungGain: 0.55 } },
        ao: { d: 'frote pericárdico atenuado en la base; R2 normal; sin soplo eyectivo.', h: { lung: { type: 'absent', adv: ['rub'] }, lungGain: 0.45 } },
        pu: { d: 'frote pericárdico atenuado; R2 normal con desdoblamiento fisiológico conservado.', h: { lung: { type: 'absent', adv: ['rub'] }, lungGain: 0.45 } }
      }), {
        'pre:er:palp': 'Con la palma sobre el borde esternal izquierdo, sentado e inclinado hacia delante: a veces se percibe el <b>frote pericárdico como una vibración rasposa</b> en tres tiempos; sin frémito de soplo.',
        'pre:mi:palp': H('palma y pulpejos sobre el ápex.', 'choque de la punta de localización y tamaño normales (5.º EIC, LMC); el dolor obliga al paciente a inclinarse hacia delante. Si el choque desapareciera y los ruidos se apagaran habría que pensar en derrame pericárdico.'),
        'pre:mi:insp': 'Postura antiálgica: <b>sentado e inclinado hacia delante</b> (posición de plegaria mahometana). Sin latido visible de la punta.',
        'cue:ijv:insp': 'A 45° columna venosa ≈3 cm sobre el ángulo esternal: <b>sin ingurgitación</b>. Vigilar: su aparición junto a hipotensión y ruidos apagados (tríada de Beck) indicaría taponamiento.',
        'cue:car:palp': { html: H('pulpejos sobre la carótida.', 'pulso 2+, rítmico, a 98 lpm (taquicardia por fiebre y dolor); <b>sin pulso paradójico</b> (la amplitud no cae en inspiración).'), run: ctx => rings(ctx, 6, PULSE.normal) },
        ...pulsePath({
          rad: { D: [2, 'rítmico a 98 lpm, amplitud normal, <b>sin pulso paradójico</b> (no disminuye en inspiración; comprobar con el manguito: la PA sistólica cae &lt;10 mmHg al inspirar).'], I: [2, 'simétrico con el derecho.'] }
        }),
        'per:brD:pa': c => ({ html: H('medir la PA y, además, buscar el pulso paradójico: desinflar lentamente y anotar la presión a la que los ruidos se oyen solo en espiración y la presión a la que se oyen en todo el ciclo.', `PA brazo derecho <b>${c.v.sbp}/${c.v.dbp} mmHg</b>; diferencia inspiración-espiración de la sistólica <b>6 mmHg</b> (normal &lt;10): <b>sin pulso paradójico</b>, sin signos de taponamiento.`), run: () => kor(c.v.hr, 4) })
      }),
      overlay: { pre: nota('Sentado e inclinado hacia delante (alivia el dolor)', 8, 384), aus: nota('Frote pericárdico en tres tiempos: diafragma, borde esternal izquierdo', 8, 384) },
      findings: [
        '<b>Inspección:</b> fiebre, taquicardia, postura antiálgica inclinada hacia delante.',
        '<b>Auscultación:</b> <b>frote pericárdico</b> rudo, superficial, en <b>tres tiempos</b>, máximo en el foco mesocárdico y borde esternal izquierdo, sentado e inclinado hacia delante; no irradia y persiste en apnea.',
        '<b>Sin signos de taponamiento:</b> yugulares normales, PA conservada, sin pulso paradójico, ruidos no apagados.'
      ],
      teaching: [
        'El frote pericárdico se distingue de un soplo porque es superficial, raspante, en tres tiempos, cambia con la posición y de un examen a otro, y no irradia; se distingue del frote pleural porque persiste al contener la respiración.',
        'En toda pericarditis hay que buscar los signos de taponamiento: ingurgitación yugular, hipotensión, ruidos apagados (tríada de Beck) y pulso paradójico (caída inspiratoria de la PA sistólica ≥10 mmHg).'
      ]
    },

    /* 7. CARDIOPATÍA HIPERTENSIVA */
    {
      id: 'hta', age: 63, sex: 'F', diag: 'Cardiopatía hipertensiva (hipertensión arterial con hipertrofia ventricular izquierda)',
      complaint: 'Mujer de 63 años, hipertensa desde hace 15 años con mal cumplimiento del tratamiento, con cefalea occipital matinal, disnea de esfuerzo leve y palpitaciones ocasionales.',
      vitals: 'FC 76 · PA 172/104 · FR 16 · T 36,5 °C · SpO₂ 97 %',
      v: { hr: 76, sbp: 172, dbp: 104, rr: 16, temp: 36.5, spo2: 97, height: 1.60, weight: 74, waist: 94 },
      path: Object.assign(ausPath({
        mi: { d: 'R1 normal; con el diafragma apenas se intuye un ruido presistólico; <b>sin soplos</b> en la punta. Hay que pasar a la campana.',
          b: 'con la campana, en decúbito lateral izquierdo: <b>R4</b> (ruido grave, presistólico, justo antes del R1) por la contracción auricular contra un ventrículo izquierdo hipertrófico y rígido: <b>ritmo de galope auricular (presistólico)</b> a 76 lpm. Sin R3 ni rolido.',
          h: { s4: 1 } },
        tr: { d: 'R1 y R2 normales; sin soplos; R4 apenas audible con la campana.', h: { s4: 1 } },
        er: { d: 'ruidos normales; a veces un soplo sistólico eyectivo muy suave (1/6) de esclerosis aórtica; sin soplo diastólico.', h: { murmur: { kind: 'sys_ejection', level: 0.2 } } },
        ao: { d: '<b>R2 intenso y «metálico»</b> (componente aórtico A2 reforzado por la hipertensión); soplo sistólico eyectivo suave 1-2/6 de esclerosis aórtica, sin irradiación a carótidas ni frémito.', h: { s2m: 1.45, murmur: { kind: 'sys_ejection', level: 0.3 } } },
        pu: { d: 'R2 reforzado (A2 intenso) con desdoblamiento fisiológico conservado en inspiración; sin soplos.', h: { s2m: 1.3 } }
      }), {
        'pre:mi:insp': 'Latido de la punta <b>visible y desplazado</b> hacia fuera de la LMC (6.º EIC).',
        'pre:mi:palp': H('palma y pulpejos sobre el ápex, en decúbito dorsal.', '<b>choque de la punta sostenido</b> (ocupa casi toda la sístole, «empuja» la mano) <b>y desplazado</b> hacia fuera y abajo (6.º EIC, 1-2 cm por fuera de la LMC), amplio (≈3 cm), enérgico: hipertrofia ventricular izquierda por sobrecarga de presión. En decúbito lateral izquierdo puede palparse el R4 como una onda presistólica.'),
        'pre:ao:palp': 'Sin frémito; a veces se palpa el <b>cierre aórtico (A2) reforzado</b> en el 2.º EIC derecho.',
        'cue:car:palp': { html: H('pulpejos sobre la carótida, un lado cada vez.', 'pulso carotídeo <b>2+, amplio y de tensión aumentada</b> (difícil de deprimir), rítmico a 76 lpm, simétrico; sin frémito.'), run: ctx => rings(ctx, 6, PULSE.hard) },
        'cue:car:aus': 'Con el diafragma sobre cada carótida: <b>sin soplo</b> carotídeo (ruidos transmitidos únicamente).',
        'cue:ijv:insp': 'A 45° columna venosa ≈3 cm: <b>sin ingurgitación</b> (función derecha conservada).',
        ...pulsePath({
          car: { D: [2, 'amplio, de <b>tensión aumentada</b>, rítmico a 76 lpm, simétrico.', 'hard'], I: [2, 'simétrico con el derecho.', 'hard'] },
          rad: { D: [2, 'rítmico a 76 lpm, <b>tenso (duro)</b>: la arteria se deprime con dificultad; pared arterial firme; igual y simétrico.', 'hard'], I: [2, 'tenso, simétrico.', 'hard'] },
          bra: { D: [2, 'amplio y tenso.', 'hard'], I: [2, 'amplio y tenso, simétrico.', 'hard'] },
          fem: { D: [2, 'amplio, sincrónico con el radial (<b>sin retraso radiofemoral</b>: descarta coartación).', 'hard'], I: [2, 'simétrico.', 'hard'] }
        }),
        'per:brD:pa': c => ({ html: H('sentada tras 5 min de reposo, manguito adecuado al perímetro del brazo, método palpatorio y luego auscultatorio.', `PA brazo derecho <b>${c.v.sbp}/${c.v.dbp} mmHg</b> (<b>hipertensión arterial</b>: grado 2 según la guía europea, estadio 2 según ACC/AHA); presión de pulso ${c.v.sbp - c.v.dbp} mmHg; FC ${c.v.hr} lpm. Confirmar en una segunda medición y en otra visita.`), run: () => kor(c.v.hr, 5) }),
        'per:brI:pa': c => ({ html: `PA brazo izquierdo <b>${c.v.sbp - 6}/${c.v.dbp - 2} mmHg</b>: <b>elevada en ambos brazos</b> con diferencia &lt;10 mmHg (una diferencia ≥15-20 mmHg sugeriría estenosis de la subclavia). Se toma como referencia el brazo de cifra más alta (derecho).`, run: () => kor(c.v.hr, 5) }),
        'per:ort0:pa': c => ({ html: `PA tras 5 min en decúbito: <b>${c.v.sbp}/${c.v.dbp} mmHg</b>, FC ${c.v.hr} lpm.`, run: () => kor(c.v.hr, 4) }),
        'per:ort1:pa': c => ({ html: `PA al minuto de pie: <b>${c.v.sbp - 6}/${c.v.dbp} mmHg</b>, FC ${c.v.hr + 8} lpm: sin hipotensión ortostática (importante antes de iniciar o aumentar fármacos antihipertensivos).`, run: () => kor(c.v.hr + 8, 4) }),
        'per:ort3:pa': c => ({ html: `PA a los 3 min de pie: <b>${c.v.sbp - 4}/${c.v.dbp + 2} mmHg</b>, FC ${c.v.hr + 8} lpm: respuesta normal.`, run: () => kor(c.v.hr + 8, 4) }),
        'per:brD:pul': 'Pulso braquial y radial derechos 2+, <b>tensos</b>, simétricos.',
        'per:brI:pul': 'Pulso braquial y radial izquierdos 2+, tensos, simétricos.'
      }),
      overlay: { pre: apexDesp + nota('Choque de la punta sostenido (hipertrofia del VI)', 8, 404), aus: nota('R4 en la punta con la campana · A2 reforzado en la base', 8, 384) },
      findings: [
        '<b>PA:</b> <b>172/104 mmHg, elevada en ambos brazos</b> (diferencia &lt;10 mmHg); sin hipotensión ortostática; sin retraso radiofemoral.',
        '<b>Precordio:</b> <b>choque de la punta sostenido y desplazado</b> hacia fuera y abajo (hipertrofia ventricular izquierda).',
        '<b>Auscultación:</b> <b>R4</b> en la punta con la campana (galope presistólico); <b>R2 aórtico reforzado</b>; soplo eyectivo suave de esclerosis aórtica sin irradiación.',
        '<b>Pulsos:</b> amplios y tensos, simétricos; sin soplos carotídeos.'
      ],
      teaching: [
        'El R4 es un ruido grave presistólico (contracción auricular contra un ventrículo rígido): aparece en la hipertrofia por sobrecarga de presión (hipertensión, estenosis aórtica) y en la isquemia; nunca es fisiológico en el adulto y nunca existe en fibrilación auricular.',
        'En el hipertenso busca el daño de órgano blanco accesible al examen físico: choque de la punta sostenido y desplazado, R4, A2 reforzado, pulsos tensos, soplos carotídeos y femorales, fondo de ojo; y descarta coartación (retraso radiofemoral) y diferencia de PA entre brazos.'
      ]
    },

    /* 8. INSUFICIENCIA ARTERIAL PERIFÉRICA */
    {
      id: 'eap', age: 67, sex: 'M', diag: 'Insuficiencia arterial periférica crónica (síndrome de isquemia crónica del miembro inferior izquierdo)',
      complaint: 'Varón de 67 años, fumador de 45 paquetes-año y diabético, con dolor en la pantorrilla izquierda que aparece al caminar ≈150 m y cede en 2-3 min al detenerse (claudicación intermitente), de 8 meses de evolución; frialdad del pie izquierdo.',
      vitals: 'FC 72 · PA 146/86 · FR 16 · T 36,5 °C · SpO₂ 96 %',
      v: { hr: 72, sbp: 146, dbp: 86, rr: 16, temp: 36.5, spo2: 96, height: 1.72, weight: 78, waist: 100 },
      path: Object.assign({
        ...pulsePath({
          fem: { D: [2, 'amplitud normal, rítmico a 72 lpm.'], I: [2, 'presente, de amplitud normal o algo reducida; <b>soplo sistólico</b> a la auscultación (ver «Auscultar soplos»).'] },
          pop: { D: [2, 'presente, amplitud normal.'], I: [1, '<b>disminuido</b> (1+), difícil de palpar: obstrucción femoropoplítea.', 'small'] },
          tib: { D: [2, 'presente, amplitud normal.'], I: [0, '<b>ausente</b> detrás del maléolo medial izquierdo, incluso tras buscarlo con paciencia; pie frío.'] },
          ped: { D: [2, 'presente, amplitud normal (el pedio derecho se palpa bien).'], I: [0, '<b>ausente</b> en el dorso del pie izquierdo; el tibial posterior izquierdo también falta, por lo que no es una ausencia congénita.'] },
          car: { D: [2, 'rítmico a 72 lpm, amplitud normal; pared arterial firme.'], I: [2, 'simétrico con el derecho.'] },
          rad: { D: [2, 'rítmico a 72 lpm, pared arterial dura y tortuosa (ateroesclerosis); igual y simétrico.'], I: [2, 'simétrico.'] }
        }),
        'pul:femI:aus': 'Diafragma sobre el trayecto de la femoral izquierda: <b>soplo sistólico</b> de flujo turbulento (estenosis ateroesclerótica en la femoral); en la derecha no se oye.',
        'pul:femD:aus': 'Femoral derecha: sin soplo.',
        'pul:aor:aus': 'Línea media por encima del ombligo: <b>sin soplo aórtico</b>; soplo solo en la femoral izquierda.',
        'pul:pedI:cmp': 'Pedio izquierdo <b>ausente</b> frente al derecho presente (<b>asimetría</b>); pie izquierdo más frío y pálido que el derecho.',
        'pul:tibI:cmp': 'Tibial posterior izquierdo <b>ausente</b>; derecho 2+: asimetría franca.',
        'pul:popI:cmp': 'Poplíteo izquierdo 1+ frente al derecho 2+.',
        'pul:femI:cmp': 'Femorales simétricas en amplitud, pero con soplo solo en la izquierda; sin retraso radiofemoral.',
        'pul:pedD:cmp': 'Pedio derecho presente (2+) y pedio izquierdo <b>ausente</b>: asimetría.',
        'pul:tibD:cmp': 'Tibial posterior derecho 2+, izquierdo <b>ausente</b>.',
        'pul:popD:cmp': 'Poplíteo derecho 2+, izquierdo 1+.',
        'per:pie:insp': 'Pie izquierdo (el afectado) <b>pálido</b>, con piel fina, brillante y seca, <b>sin vello en el dorso</b>, <b>uñas engrosadas</b> y de crecimiento lento; <b>palidez al elevar el miembro a 45°</b> durante 1 min y <b>rubor de declive</b> (eritema rojo-violáceo) al colgarlo; sin úlceras ni gangrena. Pie derecho de aspecto normal.',
        'per:pie:temp': 'Pie izquierdo <b>frío</b>, con <b>gradiente térmico</b> neto a partir del tercio inferior de la pierna; derecho tibio: asimetría clara.',
        'per:pie:cap': { html: '<b>Llenado capilar enlentecido: ≈4-5 s</b> en los dedos del pie izquierdo (normal &lt;2-3 s); en el derecho ≈2 s. Tras la elevación, el relleno venoso tarda &gt;20 s en reaparecer.', run: ctx => floatTxt(ctx, '≈4-5 s', 30) },
        'per:pie:pul': 'Pedio y tibial posterior <b>ausentes (0)</b> en el pie izquierdo; presentes (2+) en el derecho.',
        'per:pie:fov': 'Sin edema (fóvea negativa): el edema no es propio de la isquemia crónica (salvo que el paciente mantenga el pie colgando por dolor).',
        'per:tib:insp': 'Pierna izquierda con piel <b>fina, brillante y sin vello</b>, atrofia muscular leve de la pantorrilla; sin edema ni várices.',
        'per:tib:temp': 'Pierna izquierda <b>más fría</b> que la derecha, con gradiente de proximal a distal.',
        'per:tib:pul': 'Poplíteo izquierdo 1+, tibial posterior y pedio izquierdos ausentes; lado derecho normal.',
        'per:var:insp': 'Sin várices; venas superficiales colapsadas (relleno venoso lento).',
        'per:brD:pa': c => ({ html: H('método palpatorio y auscultatorio.', `PA brazo derecho <b>${c.v.sbp}/${c.v.dbp} mmHg</b> (elevada). Para el índice tobillo-brazo se mide además la sistólica en la tibial posterior y la pedia con Doppler: en este paciente ≈0,6 en el lado izquierdo (normal 0,9-1,3).`), run: () => kor(c.v.hr, 4) }),
        'per:brI:pa': c => ({ html: `PA brazo izquierdo <b>${c.v.sbp - 4}/${c.v.dbp - 2} mmHg</b> (diferencia &lt;10 mmHg).`, run: () => kor(c.v.hr, 4) }),
        'cue:car:aus': 'Con el diafragma sobre cada carótida: <b>sin soplo</b> en este paciente (siempre se buscan: la ateroesclerosis es sistémica).'
      }),
      overlay: { per: piePalido, pul: piernaPalida },
      findings: [
        '<b>Anamnesis:</b> claudicación intermitente de la pantorrilla izquierda a 150 m; fumador y diabético.',
        '<b>Pulsos:</b> femoral izquierda presente con <b>soplo sistólico</b>, poplíteo izquierdo 1+, <b>tibial posterior y pedio izquierdos ausentes</b>; lado derecho normal.',
        '<b>Perfusión:</b> pie izquierdo <b>frío, pálido</b>, sin vello, uñas engrosadas, <b>llenado capilar ≈4-5 s</b>, palidez a la elevación y rubor de declive; sin edema.',
        '<b>Corazón:</b> examen cardíaco normal; PA 146/86.'
      ],
      teaching: [
        'En la insuficiencia arterial crónica el nivel de la obstrucción se deduce de los pulsos: femoral presente con soplo y poplíteo/distales ausentes = obstrucción femoropoplítea; la claudicación aparece un segmento por debajo de la lesión (pantorrilla).',
        'Cinco signos de isquemia crónica: pulsos ausentes, frialdad, palidez (a la elevación) con rubor de declive, trastornos tróficos (piel fina, sin vello, uñas gruesas, úlceras) y llenado capilar lento. Compara siempre con el lado opuesto y confirma con el índice tobillo-brazo (&lt;0,9).'
      ]
    }
  ];

  /* ------------------------------------------------------------ cuestionario (6 preguntas; 1 y 2 dependen del paciente) */
  const quiz = c => {
    const byId = {
      eao: { q: 'En este paciente, el soplo que se espera y su irradiación son…', o: ['Holosistólico en la punta, irradiado a la axila', 'Diastólico aspirativo en Erb, sin irradiación', 'Sistólico eyectivo rudo en el foco aórtico, irradiado a las carótidas', 'Rolido diastólico en la punta'], a: 2, w: 'La válvula aórtica estrecha produce un soplo eyectivo «en rombo» que sigue la dirección del chorro: hacia las carótidas.' },
      imi: { q: 'En esta paciente, el soplo holosistólico de la punta se irradia hacia…', o: ['Las carótidas', 'La axila', 'El epigastrio', 'No se irradia'], a: 1, w: 'El chorro de regurgitación mitral se dirige hacia la aurícula izquierda, y el soplo se transmite a la axila y al dorso.' },
      emi: { q: 'En esta paciente, el rolido diastólico se busca…', o: ['Con el diafragma, sentada e inclinada hacia delante', 'Con la campana, en decúbito lateral izquierdo, en la punta', 'Con el diafragma en el foco aórtico', 'Con la campana en el foco pulmonar, en inspiración'], a: 1, w: 'El rolido es grave y de baja intensidad: campana apoyada sin presión, en decúbito lateral izquierdo, sobre un área pequeña de la punta.' },
      iao: { q: 'En este paciente, la combinación PA 150/52 + pulso saltón + soplo diastólico aspirativo indica…', o: ['Estenosis aórtica', 'Insuficiencia aórtica', 'Estenosis mitral', 'Pericarditis'], a: 1, w: 'La fuga diastólica baja la presión diastólica y aumenta el volumen sistólico (presión de pulso amplia, pulso celer) y produce el soplo regurgitativo protodiastólico decreciente.' },
      icc: { q: 'En este paciente, el reflujo hepatoyugular positivo significa que…', o: ['La columna yugular sube de forma transitoria y vuelve a su nivel en pocos latidos', 'La columna yugular asciende ≥3-4 cm y se mantiene elevada durante toda la compresión', 'Las yugulares se colapsan al comprimir el hígado', 'El hígado no es palpable'], a: 1, w: 'Un ventrículo derecho insuficiente no acepta el aumento del retorno venoso que provoca la compresión del hígado, y la presión venosa yugular se mantiene elevada.' },
      peri: { q: 'En este paciente, el frote pericárdico se distingue de un soplo porque…', o: ['Es grave, musical y se irradia a la axila', 'Es superficial, raspante, en tres tiempos, cambia con la posición y no irradia', 'Solo se oye con la campana en decúbito lateral izquierdo', 'Desaparece al contener la respiración'], a: 1, w: 'El frote nace del roce de las hojas pericárdicas inflamadas: ruido superficial en tres tiempos, variable, no irradiado, que persiste en apnea (a diferencia del frote pleural).' },
      hta: { q: 'En esta paciente, el ruido grave presistólico que se oye con la campana en la punta es…', o: ['Un R3 fisiológico', 'Un chasquido de apertura', 'Un R4 por hipertrofia ventricular izquierda', 'Un desdoblamiento del R1'], a: 2, w: 'El R4 se produce por la contracción auricular contra un ventrículo hipertrófico y rígido; es típico de la cardiopatía hipertensiva.' },
      eap: { q: 'En este paciente, la ausencia de pulsos tibial posterior y pedio izquierdos con femoral presente y con soplo indica obstrucción…', o: ['Aortoilíaca', 'Femoropoplítea', 'De la arteria subclavia', 'Carotídea'], a: 1, w: 'El pulso se pierde por debajo de la lesión: femoral presente (con soplo por la estenosis) y poplíteo/distales disminuidos o ausentes localizan la obstrucción en el sector femoropoplíteo.' }
    };
    const own = byId[c.id] || byId.eao;
    const pulso = { eao: 'Parvus et tardus (pequeño y de ascenso lento)', imi: 'Normal, de ascenso rápido', emi: 'Pequeño y regular', iao: 'Celer, saltón (de Corrigan)', icc: 'Pequeño, rápido y alternante', peri: 'Normal, sin pulso paradójico', hta: 'Amplio y tenso (duro)', eap: 'Normal en el brazo; ausente en el pie izquierdo' }[c.id];
    return [
      { q: own.q, options: own.o, a: own.a, why: own.w },
      { q: `El pulso arterial de este paciente (${c.diag.split(' (')[0].toLowerCase()}) se describe como…`,
        options: ['Irregular y desigual (fibrilación auricular)', pulso, 'Bigeminado', 'Paradójico'], a: 1,
        why: 'El pulso se describe por frecuencia, ritmo, amplitud, tensión, igualdad y simetría; su forma (parvus-tardus, celer, alternante, paradójico) orienta a la lesión subyacente.' },
      { q: 'Un soplo sistólico que comienza después del R1, crece y decrece («en rombo») y termina antes del R2 es…', options: ['Regurgitativo (holosistólico)', 'Eyectivo (mesosistólico)', 'Continuo', 'Diastólico'], a: 1, why: 'Los soplos eyectivos nacen del paso de la sangre por una válvula sigmoidea durante la eyección; los regurgitativos ocupan toda la sístole desde el R1.' },
      { q: 'El R3 y el R4 se oyen mejor…', options: ['Con el diafragma en el foco aórtico', 'Con la campana, en la punta, en decúbito lateral izquierdo', 'Con el diafragma en el foco pulmonar en inspiración', 'Solo de pie'], a: 1, why: 'Son ruidos graves (llenado ventricular): campana apoyada sin presión, punta y decúbito lateral izquierdo, que acerca el ventrículo izquierdo a la pared.' },
      { q: 'La ingurgitación yugular se define a 45° como una columna venosa…', options: ['Visible por debajo de la clavícula', '> 3-4 cm por encima del ángulo esternal', 'Que desaparece en espiración', 'Palpable y de un solo pico por latido'], a: 1, why: 'A 45° la columna normal no supera los 3-4 cm sobre el ángulo esternal (la aurícula derecha está ≈5 cm por debajo); más altura indica hipertensión venosa (fallo derecho, taponamiento).' },
      { q: 'El edema de la insuficiencia cardíaca es característicamente…', options: ['Unilateral, caliente y doloroso', 'Bilateral, de declive, blando, frío y con fóvea', 'Duro y sin fóvea', 'Limitado a la cara y los párpados'], a: 1, why: 'Es un edema de causa hidrostática: simétrico, en las zonas declives (tobillos, sacro en el encamado), con signo de fóvea (godet) y que aumenta a lo largo del día.' }
    ];
  };

  /* Las escenas con `redrawOnMode` (precordio y auscultación) redibujan el fondo con `svg()` en cada refresh y perderían el
     `overlay` del paciente; se envuelven (copia superficial, sin tocar el módulo base) para que el dibujo incluya el overlay. */
  const SCENES = NormalEngine.defs.cardio.scenes.map(sc => (sc.redrawOnMode && sc.svg
    ? Object.assign({}, sc, { svg: (learn, c) => sc.svg(learn, c) + (c && c.overlay && c.overlay[sc.id] ? c.overlay[sc.id] : '') })
    : sc));

  NormalEngine.build({
    base: 'cardio', id: 'pat-cardio', title: 'Aparato cardiovascular: síndromes', icon: '❤️', group: 'Exploración patológica', hideDx: false, scenes: SCENES,
    desc: 'Ocho pacientes con los grandes síndromes cardiovasculares: estenosis e insuficiencia aórtica y mitral, insuficiencia cardíaca, pericarditis aguda, cardiopatía hipertensiva e insuficiencia arterial periférica.',
    bullets: [
      'Soplos eyectivos, regurgitativos, aspirativos y rolidos, con irradiación por foco y sonido',
      'R3, R4, chasquido de apertura y frote pericárdico; posición y fonendoscopio adecuados',
      'Pulsos parvus-tardus, celer, alternante o ausentes; yugulares, reflujo hepatoyugular, edema y perfusión'
    ],
    people: PACIENTES,
    refs: [
      'Argente HA, Álvarez ME. <i>Semiología Médica. Fisiopatología, semiotecnia y propedéutica</i>. Panamericana — Aparato cardiovascular: síndromes valvulares (estenosis e insuficiencia aórtica y mitral), insuficiencia cardíaca, pericarditis, hipertensión arterial e insuficiencia arterial periférica.',
      'Argente HA, Álvarez ME. <i>Semiología Médica</i> — Aparato cardiovascular: auscultación (ruidos agregados, soplos, frote pericárdico), pulso arterial y venoso, presión arterial.',
      'Guía ESC/ESH de hipertensión arterial (clasificación de la PA de consultorio) y guía ESC de valvulopatías (definiciones clínicas).'
    ],
    quiz,
    teaching: [
      'Para cada soplo describe momento (sistólico/diastólico), forma (eyectivo, regurgitativo, aspirativo, rolido), intensidad (1-6/6; frémito desde 4/6), foco de máxima intensidad, irradiación y cómo cambia con la posición y la respiración.',
      'Elige el fonendoscopio y la posición: diafragma para R1, R2, soplos agudos (aspirativo aórtico, regurgitativos) y frote; campana para R3, R4 y rolido mitral, en decúbito lateral izquierdo; sentado e inclinado hacia delante en apnea espiratoria para la base.',
      'La sobrecarga de volumen (insuficiencias) desplaza y amplía el choque de la punta y da R3; la sobrecarga de presión (estenosis aórtica, hipertensión) lo hace sostenido y da R4.',
      'Ingurgitación yugular, reflujo hepatoyugular positivo, hepatomegalia y edema con fóvea = congestión sistémica (fallo derecho); galope por R3 y crepitantes bibasales = congestión pulmonar (fallo izquierdo); pulso pequeño y alternante, frialdad y llenado capilar lento = bajo gasto.',
      'En los miembros, la ausencia asimétrica de pulsos con pie frío, pálido y de llenado capilar lento localiza la obstrucción arterial; compara siempre ambos lados y de proximal a distal.'
    ]
  });
})();
