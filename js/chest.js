/* Módulo de tórax: auscultación cardíaca y pulmonar, y percusión. */
(function () {
  'use strict';
  const { svgPoint } = U;

  const PTS = {
    // focos cardíacos (cara anterior)
    AO: { x: 190, y: 149, type: 'focus', view: 'ant', short: 'Aórtico', label: 'Foco aórtico (2.º EIC, borde esternal derecho)' },
    PU: { x: 230, y: 149, type: 'focus', view: 'ant', short: 'Pulmonar', label: 'Foco pulmonar (2.º EIC, borde esternal izquierdo)' },
    ER: { x: 230, y: 181, type: 'focus', view: 'ant', short: 'Mesocárdico', label: 'Foco mesocárdico o de Erb (3.er EIC, borde esternal izquierdo)' },
    TR: { x: 230, y: 213, type: 'focus', view: 'ant', short: 'Tricuspídeo', label: 'Foco tricuspídeo (4.º-5.º EIC, borde esternal izquierdo)' },
    MI: { x: 275, y: 246, type: 'focus', view: 'ant', short: 'Mitral', label: 'Foco mitral o apexiano (5.º EIC, línea medioclavicular izquierda)' },
    CR: { x: 172, y: 64, type: 'carotid', view: 'ant', short: 'Carótida D', label: 'Carótida derecha' },
    CL: { x: 248, y: 64, type: 'carotid', view: 'ant', short: 'Carótida I', label: 'Carótida izquierda' },
    AX: { x: 346, y: 216, type: 'ax', view: 'ant', short: 'Axila I', label: 'Axila izquierda (línea axilar anterior)' },
    // campos pulmonares anteriores
    RU: { x: 140, y: 118, type: 'lung', view: 'ant', short: 'Sup. D', label: 'Campo pulmonar superior derecho (anterior)' },
    RM: { x: 130, y: 190, type: 'lung', view: 'ant', short: 'Medio D', label: 'Campo pulmonar medio derecho (anterior)' },
    RB: { x: 128, y: 268, type: 'lung', view: 'ant', short: 'Base D', label: 'Base pulmonar derecha (anterior)' },
    LU: { x: 280, y: 118, type: 'lung', view: 'ant', short: 'Sup. I', label: 'Campo pulmonar superior izquierdo (anterior)' },
    LM: { x: 292, y: 190, type: 'lung', view: 'ant', short: 'Medio I', label: 'Campo pulmonar medio izquierdo (anterior)' },
    LB: { x: 298, y: 292, type: 'lung', view: 'ant', short: 'Base I', label: 'Base pulmonar izquierda (anterior)' },
    // campos pulmonares posteriores (derecha del paciente = derecha de la pantalla)
    pRU: { x: 285, y: 115, type: 'lung', view: 'post', short: 'Sup. D', label: 'Campo superior derecho (posterior)' },
    pRM: { x: 248, y: 185, type: 'lung', view: 'post', short: 'Interesc. D', label: 'Campo interescapular derecho (posterior)' },
    pRL: { x: 280, y: 265, type: 'lung', view: 'post', short: 'Inferior D', label: 'Campo infraescapular derecho (posterior)' },
    pRB: { x: 295, y: 335, type: 'lung', view: 'post', short: 'Base D', label: 'Base pulmonar derecha (posterior)' },
    pLU: { x: 135, y: 115, type: 'lung', view: 'post', short: 'Sup. I', label: 'Campo superior izquierdo (posterior)' },
    pLM: { x: 172, y: 185, type: 'lung', view: 'post', short: 'Interesc. I', label: 'Campo interescapular izquierdo (posterior)' },
    pLL: { x: 140, y: 265, type: 'lung', view: 'post', short: 'Inferior I', label: 'Campo infraescapular izquierdo (posterior)' },
    pLB: { x: 125, y: 335, type: 'lung', view: 'post', short: 'Base I', label: 'Base pulmonar izquierda (posterior)' }
  };

  /* Nomenclatura de Argente-Álvarez en los textos visibles; las claves de código (s1, s2, resonant, dull…) no cambian. */
  const KIND_TXT = {
    sys_ejection: 'soplo sistólico eyectivo (mesosistólico, «en rombo»)', holosystolic: 'soplo sistólico regurgitativo (holosistólico)',
    early_diastolic: 'soplo diastólico regurgitativo (protodiastólico, decreciente)', diastolic_rumble: 'rolido (retumbo) mitral diastólico'
  };
  const LUNG_TXT = {
    normal: 'murmullo vesicular conservado', bronchial: 'soplo tubario (respiración bronquial sobre el parénquima)',
    broncovesicular: 'respiración broncovesicular', diminished: 'murmullo vesicular disminuido o abolido', absent: 'murmullo vesicular abolido (silencio auscultatorio)'
  };
  const ADV_TXT = {
    fine_crackles: 'estertores crepitantes', coarse_crackles: 'estertores subcrepitantes (de burbuja)',
    wheeze: 'sibilancias', rhonchi: 'roncus', rub: 'frote pleural'
  };
  const PERC_TXT = { resonant: 'sonoridad (normal)', dull: 'matidez', hyper: 'hipersonoridad' };

  const lungAt = (c, id) => Object.assign({}, c.lung.base, c.lung.over[id] || {});

  /* Vista 3D (js/torso3d.js): focos del glb (modelos/torso3d/README.md) → puntos PTS. Las carótidas no tienen foco en el modelo.
     Aproximaciones: el foco lateral inferior representa la base anterior y el lateral superior izquierdo la axila;
     por detrás, el foco posterior inferior representa la base (el campo infraescapular queda solo en el esquema). */
  const T3D = {
    ant: {
      Foco_Aortico: 'AO', Foco_Pulmonar: 'PU', Foco_Erb: 'ER', Foco_Tricuspideo: 'TR', Foco_Mitral: 'MI', Foco_Pulm_Lat_Sup_I: 'AX',
      Foco_Pulm_Vertice_D: 'RU', Foco_Pulm_Ant_Sup_D: 'RU', Foco_Pulm_Ant_Inf_D: 'RM', Foco_Pulm_Lat_Inf_D: 'RB',
      Foco_Pulm_Vertice_I: 'LU', Foco_Pulm_Ant_Sup_I: 'LU', Foco_Pulm_Ant_Inf_I: 'LM', Foco_Pulm_Lat_Inf_I: 'LB'
    },
    post: {
      Foco_Pulm_Post_Sup_D: 'pRU', Foco_Pulm_Post_Med_D: 'pRM', Foco_Pulm_Post_Inf_D: 'pRB',
      Foco_Pulm_Post_Sup_I: 'pLU', Foco_Pulm_Post_Med_I: 'pLM', Foco_Pulm_Post_Inf_I: 'pLB'
    },
    hint: 'Vista 3D: arrastra para girar, rueda o pellizco para acercar. Haz clic sobre un foco para auscultarlo o percutirlo con el instrumento elegido.'
  };
  const T3D_LABELS = Object.fromEntries(Object.keys(PTS).map(k => [k, PTS[k].label]));

  function soundSpec(c, id) {
    const p = PTS[id], h = c.heart;
    const maxInt = Math.max(0, ...Object.values(h.int));
    let hg, lvl, lg, lungSpec = lungAt(c, id);
    if (p.type === 'focus') { hg = 1; lvl = h.int[id] || 0; lg = 0.35; }
    else if (p.type === 'carotid') { hg = 0.4; lvl = h.int[id] || 0; lg = 0; }
    else if (p.type === 'ax') { hg = 0.3; lvl = h.int.AX || 0; lg = 0.9; }
    else if (p.view === 'ant') { hg = 0.22; lvl = maxInt * 0.45; lg = 1; }
    else { hg = 0.06; lvl = maxInt * 0.3; lg = 1; }
    const heart = {
      rate: h.rate, s1: h.s1, s2: h.s2, s3: h.s3, s4: h.s4, snap: h.snap,
      murmur: h.kind && lvl > 0 ? { kind: h.kind, level: +lvl.toFixed(2) } : null
    };
    return {
      heart, heartGain: hg,
      lung: { type: lungSpec.type, adv: lungSpec.adv || [] }, lungGain: lg,
      lvl
    };
  }

  function describe(c, id) {
    const p = PTS[id], s = soundSpec(c, id), h = c.heart, parts = [];
    const lungPart = () => {
      const l = lungAt(c, id), t = [LUNG_TXT[l.type] || l.type].concat((l.adv || []).map(a => ADV_TXT[a])).filter(Boolean);
      return t.join(' + ');
    };
    if (p.type === 'lung') return lungPart();
    if (p.type === 'ax') {
      if (h.kind && s.lvl >= 0.2) parts.push(KIND_TXT[h.kind] + ' irradiado');
      parts.push(lungPart());
      return parts.join('; ');
    }
    if (p.type === 'carotid') return h.kind && s.lvl >= 0.2 ? KIND_TXT[h.kind] + ' irradiado' : 'sin soplo carotídeo';
    // foco cardíaco
    parts.push(h.s1 > 1.2 ? 'R1 intenso' : h.s1 < 0.7 ? 'R1 disminuido' : 'R1 normal');
    parts.push(h.s2 < 0.7 ? 'R2 disminuido' : 'R2 normal');
    if (h.s3) parts.push('R3 (galope ventricular, protodiastólico)');
    if (h.s4) parts.push('R4 (galope auricular, presistólico)');
    if (h.snap) parts.push('chasquido de apertura tras R2');
    if (h.kind && s.lvl >= 0.6) parts.push(KIND_TXT[h.kind]);
    else if (h.kind && s.lvl >= 0.2) parts.push(KIND_TXT[h.kind] + ' suave (irradiado)');
    else parts.push('sin soplos');
    return parts.join('; ');
  }

  /* ----- dibujo del torso ----- */
  const TORSO = 'M170,92 C140,100 85,100 62,118 C40,135 38,170 42,220 C46,300 62,380 70,460 L80,545 L340,545 L350,460 C358,380 374,300 378,220 C382,170 380,135 358,118 C335,100 280,100 250,92 Z';
  const NECK = 'M178,10 L242,10 L250,95 L170,95 Z';

  function torsoSVG(view, learn) {
    let body = `<path d="${NECK}" fill="#f1c9a5" stroke="#b98a63" stroke-width="3"/><path d="${TORSO}" fill="#f1c9a5" stroke="#b98a63" stroke-width="3"/>`;
    if (view === 'ant') {
      let ribs = '';
      for (let j = 1; j <= 9; j++) {
        const y = 110 + 26 * (j - 1);
        ribs += `<path d="M210,${y} Q150,${y + 6} 68,${y + 52}" fill="none" stroke="#d6b99a" stroke-width="2"/>` +
                `<path d="M210,${y} Q270,${y + 6} 352,${y + 52}" fill="none" stroke="#d6b99a" stroke-width="2"/>`;
      }
      body += ribs;
      body += `<path d="M172,100 Q130,108 80,124 M248,100 Q290,108 340,124" fill="none" stroke="#a97d58" stroke-width="3"/>`;  // clavículas
      body += `<path d="M210,100 L210,305" fill="none" stroke="#a97d58" stroke-width="5" stroke-linecap="round" opacity=".7"/>`; // esternón
      body += `<circle cx="145" cy="218" r="6" fill="#c98f7a"/><circle cx="275" cy="218" r="6" fill="#c98f7a"/>`;
      if (learn) {
        body += `<path d="M205,112 C150,100 96,128 92,215 C90,270 118,300 160,300 C190,300 204,285 204,260 Z" fill="#7ec3d9" opacity=".28"/>` +
                `<path d="M216,112 C268,100 322,128 326,215 C328,270 300,300 262,300 C240,300 224,290 216,262 Z" fill="#7ec3d9" opacity=".28"/>` +
                `<ellipse cx="236" cy="212" rx="46" ry="60" transform="rotate(-12 236 212)" fill="#d9534f" opacity=".3"/>`;
      }
      body += `<text x="40" y="40" class="svg-small">D</text><text x="372" y="40" class="svg-small">I</text>`;
    } else {
      let ribs = '';
      for (let j = 1; j <= 10; j++) {
        const y = 108 + 24 * j;
        ribs += `<path d="M210,${y} Q290,${y + 8} 355,${y + 20}" fill="none" stroke="#d6b99a" stroke-width="2"/>` +
                `<path d="M210,${y} Q130,${y + 8} 65,${y + 20}" fill="none" stroke="#d6b99a" stroke-width="2"/>`;
      }
      body += ribs;
      body += `<path d="M210,96 L210,470" stroke="#a97d58" stroke-width="4" stroke-dasharray="3 7" stroke-linecap="round"/>`;
      body += `<ellipse cx="262" cy="172" rx="34" ry="58" transform="rotate(-12 262 172)" fill="#e7bf9a" stroke="#a97d58" stroke-width="3"/>` +
              `<ellipse cx="158" cy="172" rx="34" ry="58" transform="rotate(12 158 172)" fill="#e7bf9a" stroke="#a97d58" stroke-width="3"/>`;
      if (learn) {
        body += `<ellipse cx="288" cy="235" rx="62" ry="115" fill="#7ec3d9" opacity=".25"/><ellipse cx="132" cy="235" rx="62" ry="115" fill="#7ec3d9" opacity=".25"/>`;
      }
      body += `<text x="40" y="40" class="svg-small">I</text><text x="372" y="40" class="svg-small">D</text>`;
    }
    return body;
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

  function anatPost() {
    const K = AC, m = x => 420 - x;
    let a = '';
    // pulmones (derecho del paciente = derecha de la pantalla), cisuras oblicuas y senos costofrénicos
    const lung = s => `<path d="M${s(216)},104 C${s(232)},92 ${s(258)},96 ${s(272)},112 C${s(312)},152 ${s(350)},220 ${s(358)},296 C${s(320)},330 ${s(260)},348 ${s(218)},348 Z" fill="${K.lung}" stroke="${K.ink}" stroke-width="1"/>` +
      `<path d="M${s(220)},176 C${s(260)},200 ${s(320)},250 ${s(356)},296" fill="none" stroke="${K.ink}" stroke-width="1" stroke-dasharray="4 3"/>` +
      `<path d="M${s(218)},392 C${s(270)},390 ${s(330)},360 ${s(360)},318" fill="none" stroke="${K.ink}" stroke-width="1.2" stroke-dasharray="2 3"/>`;
    a += lung(x => x) + lung(m);
    a += lbl(316, 150, 'LSD') + lbl(335, 240, 'LID') + lbl(104, 150, 'LSI', 'end') + lbl(85, 240, 'LII', 'end') +
         lbl(300, 208, 'Cisura oblicua') + lbl(120, 208, 'Cisura oblicua', 'end') +
         lbl(300, 374, 'Seno costofrénico', 'middle') + lbl(120, 374, 'Seno costofrénico', 'middle');
    // riñones (el derecho más bajo) y bazo
    a += `<ellipse cx="252" cy="424" rx="20" ry="36" fill="${K.kidney}" stroke="${K.ink}" stroke-width="1"/><path d="M236,414 Q242,424 236,434" fill="none" stroke="${K.ink}" stroke-width="1"/>` +
         `<ellipse cx="168" cy="412" rx="20" ry="36" fill="${K.kidney}" stroke="${K.ink}" stroke-width="1"/><path d="M184,402 Q178,412 184,422" fill="none" stroke="${K.ink}" stroke-width="1"/>` +
         `<ellipse cx="96" cy="342" rx="13" ry="26" transform="rotate(28 96 342)" fill="${K.spleen}" stroke="${K.ink}" stroke-width="1"/>`;
    a += lbl(252, 478, 'Riñón D', 'middle') + lbl(168, 466, 'Riñón I', 'middle') + lbl(72, 384, 'Bazo', 'middle');
    // costillas 1-12 por encima (las 11.ª y 12.ª, flotantes)
    for (let j = 1; j <= 10; j++) {
      const y = 108 + 24 * j;
      a += `<path d="M210,${y} Q290,${y + 8} 355,${y + 20} M210,${y} Q130,${y + 8} 65,${y + 20}" fill="none" stroke="${K.bone}" stroke-width="3" opacity=".75"/>`;
    }
    a += `<path d="M210,372 Q262,380 302,394 M210,372 Q158,380 118,394 M210,396 Q248,402 272,414 M210,396 Q172,402 148,414" fill="none" stroke="${K.bone}" stroke-width="3" opacity=".75"/>`;
    // escápulas (borde medial, ángulo inferior y espina)
    const scap = s => `<path d="M${s(238)},118 L${s(286)},118 L${s(300)},132 L${s(248)},236 L${s(236)},232 Z" fill="${K.bone}" stroke="${K.ink}" stroke-width="1" opacity=".9"/>` +
      `<path d="M${s(238)},152 L${s(305)},132" stroke="${K.ink}" stroke-width="1.6"/>`;
    a += scap(x => x) + scap(m);
    a += lbl(268, 112, 'Escápula', 'end') + lbl(152, 112, 'Escápula');
    // columna: apófisis espinosas C7-L4 (24 px por vértebra), con niveles de referencia
    const names = ['C7', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12', 'L1', 'L2', 'L3', 'L4'];
    names.forEach((n, i) => {
      const y = 104 + 24 * i;
      a += `<rect x="203" y="${y - 8}" width="14" height="17" rx="4" fill="${K.bone}" stroke="${K.ink}" stroke-width="1"/><circle cx="210" cy="${y}" r="2.2" fill="${K.ink}"/>`;
      if (['C7', 'T3', 'T7', 'T10', 'T12'].includes(n)) a += lbl(198, y + 4, n, 'end', 'font-weight:700');
    });
    a += lbl(210, 60, 'C7: apófisis más prominente al flexionar el cuello', 'middle') +
         lbl(210, 510, 'T3: espina de la escápula · T7: ángulo inferior · T10: base pulmonar · T12: 12.ª costilla', 'middle', 'font-size:10.5px');
    return a;
  }

  class ChestScene {
    constructor(view) {
      this.view = view;
      this.label = view === 'ant' ? 'Cara anterior' : 'Cara posterior';
      this.hint = '';
      this.tools = [
        { id: 'steth', icon: '🩺', label: 'Estetoscopio · membrana (diafragma)' },
        { id: 'bell', icon: '🔔', label: 'Estetoscopio · campana' },
        { id: 'perc', icon: '🖐️', label: 'Percusión dígito-digital' }
      ];
    }

    enter(stage, sh) {
      this.sh = sh; this.alive = true; this.active = null; this.peaks = null;
      const ids = Object.keys(PTS).filter(k => PTS[k].view === this.view);
      const learn = sh.mode === 'learn';
      const LP = { AO: 'l', PU: 'r', ER: 'l', TR: 'l', MI: 'r' };
      const marks = ids.map(k => {
        const p = PTS[k], lp = LP[k] || 'u';
        const tx = lp === 'l' ? p.x - 18 : lp === 'r' ? p.x + 18 : p.x, ty = lp === 'u' ? p.y - 19 : p.y + 4;
        const anchor = lp === 'l' ? 'end' : lp === 'r' ? 'start' : 'middle';
        return `<g class="pt" data-id="${k}">
          <circle class="hr hintring" cx="${p.x}" cy="${p.y}" r="14" fill="none" stroke="#0e6a78" stroke-width="2" stroke-dasharray="4 3"/>
          <text class="svg-hint hintring" x="${tx}" y="${ty}" text-anchor="${anchor}">${p.short}</text>
          <circle cx="${p.x}" cy="${p.y}" r="22" fill="transparent"/></g>`;
      }).join('');
      stage.innerHTML = `
      <svg class="scene point" viewBox="0 0 420 560" style="max-height:640px;margin:0 auto">
        <rect width="420" height="560" fill="#e8eef4"/>
        <g id="body">${torsoSVG(this.view, learn)}</g>
        <g id="anat" style="opacity:0">${this.view === 'ant' ? anatAnt() : anatPost()}</g>
        <g id="pts">${marks}</g>
        <g id="act" style="display:none"><circle r="17" fill="#0e6a78" opacity=".25"><animate attributeName="r" values="14;24;14" dur="1.4s" repeatCount="indefinite"/></circle><circle r="8" fill="#0e6a78" stroke="#fff" stroke-width="2"/></g>
      </svg>
      <div class="wave">
        <div class="where"><b id="wTitle">Sin escucha</b><span id="wSub">Elige un instrumento y haz clic en el tórax.</span></div>
        <canvas id="pcg" width="600" height="70"></canvas>
        <button class="btn small" id="stopBtn" style="width:auto;margin:0">Detener</button>
      </div>`;
      this.svg = stage.querySelector('svg');
      this.cv = stage.querySelector('#pcg');
      this.svg.addEventListener('pointerdown', e => this.click(e));
      stage.querySelector('#stopBtn').addEventListener('click', () => this.stop());
      this.refresh();
      const loop = () => { if (!this.alive) return; this.draw(); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
      sh.torso3dControl(stage, {
        view: this.view, map: T3D[this.view], labels: T3D_LABELS, hint: T3D.hint,
        onPick: id => (sh.tool === 'perc' ? this.percuss(id) : this.listen(id))
      });
    }

    leave() { this.alive = false; Sound.stop(); }

    stop() {
      Sound.stop(); this.active = null;
      this.svg.querySelector('#act').style.display = 'none';
      this.sh.$('#wTitle').textContent = 'Sin escucha';
      this.sh.$('#wSub').textContent = 'Elige un instrumento y haz clic en el tórax.';
    }

    refresh() {
      const learn = this.sh.mode === 'learn';
      this.svg.querySelectorAll('.hintring').forEach(n => { n.style.display = learn ? '' : 'none'; });
      this.svg.querySelector('#body').innerHTML = torsoSVG(this.view, learn);
    }

    setTool(id) {
      const t = {
        steth: 'Membrana: sonidos agudos (R1, R2, soplos regurgitativos, murmullo vesicular y estertores). Haz clic en un punto y escucha un ciclo completo; compara puntos simétricos.',
        bell: 'Campana: sonidos graves (R3, R4, rolido mitral). Apóyala con presión leve; los sonidos agudos se atenúan.',
        perc: 'Percusión dígito-digital: haz clic sobre los campos pulmonares. Compara un lado con el otro (sonoridad, matidez, hipersonoridad).'
      };
      this.sh.hint(t[id]);
      if (id === 'steth' || id === 'bell') {
        if (this.active) this.listen(this.active);   // cambia de filtro sin cambiar de punto
      }
    }

    nearest(p) {
      let best = null, bd = 1e9;
      for (const k of Object.keys(PTS)) {
        const q = PTS[k];
        if (q.view !== this.view) continue;
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < bd) { bd = d; best = k; }
      }
      return bd <= 26 ? best : null;
    }

    click(e) {
      const p = svgPoint(this.svg, e), id = this.nearest(p), sh = this.sh;
      if (!id) { sh.log('No hay un punto de exploración ahí. Prueba sobre los focos o los campos pulmonares.', 'warn'); return; }
      if (sh.tool === 'perc') this.percuss(id);
      else this.listen(id);
    }

    percuss(id) {
      const sh = this.sh, c = sh.case, pt = PTS[id];
      if (pt.type !== 'lung') { sh.log('La percusión se hace sobre los campos pulmonares.', 'warn'); return; }
      const k = lungAt(c, id).perc || 'resonant';
      Sound.percuss(k);
      sh.explored(`perc:${id}`);
      sh.log(sh.mode === 'learn'
        ? `<b>Percusión · ${pt.label}</b>: ${PERC_TXT[k]}.`
        : `Percusión en ${pt.label.toLowerCase()}. Escucha el sonido y regístralo en “Mis hallazgos”.`, sh.mode === 'learn' ? 'find' : '');
    }

    listen(id) {
      const sh = this.sh, c = sh.case, pt = PTS[id], spec = soundSpec(c, id);
      const bell = sh.tool === 'bell';
      const cur = Sound.listen({ ...spec, mode: bell ? 'bell' : 'diaphragm' });
      this.peaks = null;
      this.spec = spec;
      const first = this.active !== id;
      this.active = id;
      const act = this.svg.querySelector('#act');
      act.style.display = ''; act.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
      sh.$('#wTitle').textContent = pt.label;
      sh.$('#wSub').textContent = bell ? 'Campana' : 'Membrana';
      sh.explored(`${bell ? 'bell' : 'steth'}:${id}`);
      if (first || sh.tool === 'steth' || sh.tool === 'bell') {
        sh.log(sh.mode === 'learn'
          ? `<b>${pt.label}</b> (${bell ? 'campana' : 'membrana'}): ${describe(c, id)}.`
          : `Auscultación en ${pt.label.toLowerCase()} con ${bell ? 'la campana' : 'la membrana'}.`, sh.mode === 'learn' ? 'find' : '');
      }
      void cur;
    }

    draw() {
      const cv = this.cv, g = cv.getContext('2d'), W = cv.width, H = cv.height;
      g.clearRect(0, 0, W, H);
      const cs = getComputedStyle(document.body);
      const ink = cs.getPropertyValue('--muted').trim() || '#666', brand = cs.getPropertyValue('--brand').trim() || '#0e6a78';
      g.strokeStyle = ink; g.globalAlpha = 0.35; g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke(); g.globalAlpha = 1;
      const cur = Sound.current();
      if (!cur) {
        g.fillStyle = ink; g.font = '13px system-ui'; g.fillText('El fonocardiograma aparece al auscultar un punto.', 14, H / 2 + 4);
        return;
      }
      if (!this.peaks) {
        const n = W, step = cur.arr.length / n; this.peaks = new Float32Array(n);
        for (let x = 0; x < n; x++) {
          let m = 0; for (let i = Math.floor(x * step); i < Math.floor((x + 1) * step); i++) m = Math.max(m, Math.abs(cur.arr[i]));
          this.peaks[x] = m;
        }
      }
      g.strokeStyle = brand; g.lineWidth = 1.5; g.beginPath();
      for (let x = 0; x < W; x++) {
        const a = Math.min(1, this.peaks[x] * cur.gain * 1.4) * (H / 2 - 4);
        g.moveTo(x + 0.5, H / 2 - a); g.lineTo(x + 0.5, H / 2 + a);
      }
      g.stroke();
      if (this.sh.mode === 'learn' && this.spec) {
        const t = Sound.timing(cur.spec.rate);
        g.fillStyle = ink; g.font = '11px system-ui';
        g.fillText('R1', t.tS1 / t.T * W - 4, 11); g.fillText('R2', t.tS2 / t.T * W - 4, 11);
      }
      const x = cur.pos * W;
      g.strokeStyle = '#d9534f'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke();
    }
  }

  /* ------------------------------------------------------------ REGISTRO */
  const OPT = {
    heart: [['normal', 'R1 y R2 normales, sin soplos'], ['sys_ejection', 'Soplo sistólico eyectivo (en rombo)'], ['holosystolic', 'Soplo sistólico regurgitativo (holosistólico)'],
      ['early_diastolic', 'Soplo diastólico regurgitativo (decreciente)'], ['rumble', 'Rolido mitral + chasquido de apertura'], ['s3', 'Tercer ruido (R3, galope)']],
    lung: [['vesicular', 'Murmullo vesicular conservado'], ['bronchial', 'Soplo tubario (respiración bronquial)'], ['diminished', 'Disminuido o abolido']],
    adv: [['none', 'Ninguno'], ['crackles', 'Estertores crepitantes'], ['wheeze', 'Sibilancias'], ['rhonchi', 'Roncus'], ['rub', 'Frote pleural']],
    perc: [['resonant', 'Sonoridad (normal)'], ['dull', 'Matidez'], ['hyper', 'Hipersonoridad']]
  };
  const ROWS = [['heart', 'Ruidos cardíacos y soplos'], ['lung', 'Murmullo vesicular'], ['adv', 'Ruidos agregados'], ['perc', 'Percusión (zona alterada)']];
  const label = (k, v) => (OPT[k].find(o => o[0] === v) || [0, v])[1];

  function recordHTML() {
    return ROWS.map(([k, t]) => `<label class="field">${t}</label>
      <select data-k="${k}" style="width:100%;padding:5px;border:1px solid var(--line);border-radius:8px;background:var(--panel)">
      <option value="">–</option>${OPT[k].map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>`).join('');
  }

  function evaluate(c, rec) {
    let ok = 0;
    const rows = ROWS.map(([k, t]) => {
      const mine = rec.querySelector(`select[data-k="${k}"]`).value, real = c.truth[k];
      const good = mine !== '' && real.includes(mine);
      if (good) ok++;
      return `<tr><td>${t}</td><td>${good ? '<span class="m-ok">✔</span>' : mine === '' ? '<span class="m-bad">–</span>' : '<span class="m-bad">✘</span>'} ${mine ? label(k, mine) : ''}</td>
        <td><small>${real.map(v => label(k, v)).join(' / ')}</small></td></tr>`;
    }).join('');
    const html = `<h4>Comparación con el caso</h4>
      <table class="res"><tr><th></th><th>Tú</th><th>Real</th></tr>${rows}</table>
      <p><b>${ok}</b> de ${ROWS.length} correctos.</p>`;
    return { html, ok, total: ROWS.length };
  }

  const CHEST_REFS = [
    'Argente HA, Álvarez ME. <i>Semiología Médica</i> (Panamericana) — Aparato respiratorio: percusión (sonoridad, matidez, hipersonoridad) y auscultación (murmullo vesicular, soplo tubario, estertores, frote pleural); síndromes de condensación, derrame pleural, neumotórax y obstrucción bronquial.',
    'Argente HA, Álvarez ME. <i>Semiología Médica</i> — Aparato cardiovascular: focos de auscultación, ruidos cardíacos (R1-R4, chasquido de apertura) y soplos (eyectivos, regurgitativos, rolido mitral); síndromes valvulares e insuficiencia cardíaca.',
    'Guías GINA (asma) y GOLD (EPOC): valoración clínica de la gravedad de la obstrucción bronquial.'
  ];
  /* Claves explorables: cada punto con membrana y campana; además percusión en los campos pulmonares. */
  const CHEST_TOTAL = Object.keys(PTS).reduce((n, k) => n + 2 + (PTS[k].type === 'lung' ? 1 : 0), 0);

  window.ChestModule = {
    mount(root) {
      const sh = new Shell(root, {
        id: 'chest',
        progressTotal: CHEST_TOTAL,
        cases: window.CHEST_CASES,
        scenes: { ant: new ChestScene('ant'), post: new ChestScene('post') },
        order: ['ant', 'post'],
        record: recordHTML,
        evaluate,
        refs: CHEST_REFS
      });
      sh.start();
      return sh;
    }
  };

  registerModule({
    id: 'chest', title: 'Tórax: auscultación y percusión', icon: '🫀', group: 'Casos clínicos',
    desc: 'Auscultación cardíaca y pulmonar, y percusión (11 casos).',
    bullets: ['Focos cardíacos, soplos, R3, chasquido de apertura', 'Estertores crepitantes, sibilancias, roncus, soplo tubario', 'Membrana, campana y percusión (sonoridad, matidez, hipersonoridad)'],
    refs: CHEST_REFS,
    mount: root => window.ChestModule.mount(root)
  });
})();
