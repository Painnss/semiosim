/* Módulo "Abdomen: síndromes y hallazgos patológicos".
   Hereda las escenas de mod-abdomen.js (NormalEngine.build({ base: 'abdomen' })) y define 8 pacientes con síndromes
   de Argente-Álvarez. Cada paciente sustituye los hallazgos normales mediante `path` (clave 'escena:region:instrumento')
   y añade signos visibles con `overlay` (SVG por escena sobre el abdomen de 420 × 520).
   Escenas heredadas: insp (ojo, luz) · aus (steth) · perc (perc, desp, onda) · palp (sup, prof, vals) · man (murphy, mcburney,
   blumberg, rovsing, psoas, obt, onda, giordano). */
(function () {
  'use strict';

  const SKIN = '#f1c9a5', EDGE = '#b98a63', NS = 'http://www.w3.org/2000/svg';
  const NINE = ['hd', 'ep', 'hi', 'fd', 'mes', 'fi', 'fid', 'hip', 'fii'];
  const NLBL = { hd: 'hipocondrio derecho', ep: 'epigastrio', hi: 'hipocondrio izquierdo', fd: 'flanco derecho', mes: 'mesogastrio', fi: 'flanco izquierdo', fid: 'fosa ilíaca derecha', hip: 'hipogastrio', fii: 'fosa ilíaca izquierda' };
  const QUAD = { csd: 'cuadrante superior derecho', csi: 'cuadrante superior izquierdo', cid: 'cuadrante inferior derecho', cii: 'cuadrante inferior izquierdo' };

  /* ---------- utilidades de hallazgo ---------- */
  const TH = (tec, hal) => `<i>Técnica:</i> ${tec} <i>Hallazgo:</i> ${hal}`;
  /* nota breve animada sobre el dibujo (como en el módulo base) */
  function note(ctx, txt) {
    const fl = ctx.svg && ctx.svg.querySelector('#flash');
    if (!fl) return;
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', ctx.point.x); t.setAttribute('y', ctx.point.y - 22);
    t.setAttribute('text-anchor', 'middle'); t.setAttribute('class', 'svg-title');
    t.setAttribute('pointer-events', 'none');
    t.textContent = txt;
    fl.appendChild(t);
    U.tween(1600, u => { t.setAttribute('opacity', u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3); t.setAttribute('y', ctx.point.y - 22 - 10 * u); }, () => t.remove());
  }
  /* mano que presiona (sin dependencia del módulo base) */
  function press(ctx, deep) {
    const fl = ctx.svg && ctx.svg.querySelector('#flash');
    if (!fl) return;
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('pointer-events', 'none');
    g.innerHTML = `<g fill="${SKIN}" stroke="${EDGE}" stroke-width="1.6"><rect x="-17" y="0" width="34" height="26" rx="10"/>` +
      `<rect x="-17" y="-30" width="7" height="34" rx="3.5"/><rect x="-9" y="-33" width="7" height="37" rx="3.5"/>` +
      `<rect x="-1" y="-33" width="7" height="37" rx="3.5"/><rect x="7" y="-29" width="7" height="33" rx="3.5"/>` +
      `<ellipse cx="-21" cy="10" rx="5" ry="12" transform="rotate(25 -21 10)"/></g>`;
    fl.appendChild(g);
    const p = ctx.point;
    U.tween(1400, u => {
      const sc = u < 0.5 ? 1.04 - (deep ? 0.1 : 0.04) * (u / 0.5) : 1.04 - (deep ? 0.1 : 0.04) * (1 - (u - 0.5) / 0.5);
      g.setAttribute('transform', `translate(${p.x} ${p.y + 14}) scale(${sc})`);
      g.setAttribute('opacity', u < 0.15 ? u / 0.15 : u > 0.8 ? 1 - (u - 0.8) / 0.2 : 1);
    }, () => g.remove());
  }
  const setStat = (ctx, t, s) => { const a = ctx.sh.$('#abdWT'), b = ctx.sh.$('#abdWS'); if (a) a.textContent = t; if (b) b.textContent = s; };

  const F = (tec, hal) => ({ html: TH(tec, hal), run: ctx => press(ctx, false) });        // palpación superficial
  const D = (tec, hal) => ({ html: TH(tec, hal), run: ctx => press(ctx, true) });         // palpación profunda
  const M = (tec, hal, txt) => ({ html: TH(tec, hal), run: ctx => note(ctx, txt) });      // maniobra con rótulo
  const P = (tec, hal, kind) => ({ html: TH(tec, hal), run: () => Sound.percuss(kind) }); // percusión
  const A = (tec, hal, rate, gain, label, sub) => ({                                      // auscultación con RHA
    html: TH(tec, hal),
    run: ctx => { if (rate > 0) Sound.bowel(rate, gain); else Sound.stop(); setStat(ctx, label, sub); }
  });
  const TEC = {
    ojo: 'inspección desde los pies de la cama y de perfil, con buena luz.',
    luz: 'luz tangencial desde el lateral.',
    steth: 'diafragma tibio apoyado sin presionar; escuchar 1–2 min por cuadrante antes de concluir.',
    perc: 'percusión dígito-digital, suave, comparando regiones.',
    sup: 'palpación superficial con la mano plana (1–2 cm), empezando lejos del dolor.',
    prof: 'palpación profunda, mono o bimanual, aprovechando la espiración.',
    vals: 'pedir tos o maniobra de Valsalva mientras se observa y se palpa la zona.'
  };
  /* los 4 cuadrantes con el mismo hallazgo de RHA */
  function quads(tec, hal, rate, gain, sub) {
    const o = {};
    Object.keys(QUAD).forEach(q => { o[`aus:${q}:steth`] = A(tec, `${hal} (${QUAD[q]}).`, rate, gain, QUAD[q].charAt(0).toUpperCase() + QUAD[q].slice(1), sub); });
    return o;
  }
  /* las 9 regiones con una plantilla: f(id, label) → hallazgo */
  function nine(prefix, f) { const o = {}; NINE.forEach(id => { o[`${prefix}:${id}`] = f(id, NLBL[id]); }); return o; }
  const soplos = (tec, hal) => {
    const o = {};
    ['ao', 'rd', 'ri', 'id', 'ii', 'fd', 'fi'].forEach(id => { o[`aus:${id}:steth`] = A(tec, hal, 6, 0.25, 'Punto vascular', 'Sin soplo'); });
    return o;
  };

  /* ---------- overlays: fragmentos SVG reutilizables (abdomen 420 × 520; tronco del dibujo base: x 68–352) ---------- */
  const TRUNK = 'M68,0 L352,0 C356,110 342,170 342,300 C342,360 360,380 360,440 L352,520 L220,520 L214,440 L210,436 L206,440 L200,520 L68,520 L60,440 C60,380 78,360 78,300 C78,170 64,110 68,0 Z';
  const tint = (color, op) => `<path d="${TRUNK}" fill="${color}" opacity="${op}" pointer-events="none"/>`;
  const label = (x, y, txt, anchor) => `<text class="svg-small hintring" x="${x}" y="${y}" text-anchor="${anchor || 'middle'}" style="paint-order:stroke;stroke:#fff;stroke-width:3px;stroke-linejoin:round;fill:#8a2f2f">${txt}</text>`;
  const forAll = s => ({ insp: s, aus: s, perc: s, palp: s, man: s });

  /* ascitis: flancos abombados ("vientre de batracio"), ombligo evertido, circulación colateral, ictericia, telangiectasias */
  const OV_ASCITIS = (() => {
    let s = '<g id="pat-ascitis">';
    s += `<path d="M78,170 C40,230 36,330 70,392 C78,406 88,410 96,404 C96,330 88,250 96,222 Z" fill="${SKIN}" stroke="${EDGE}" stroke-width="3" stroke-linejoin="round"/>`;
    s += `<path d="M342,170 C380,230 384,330 350,392 C342,406 332,410 324,404 C324,330 332,250 324,222 Z" fill="${SKIN}" stroke="${EDGE}" stroke-width="3" stroke-linejoin="round"/>`;
    s += `<path d="M104,236 Q210,420 316,236" fill="none" stroke="#d6b99a" stroke-width="2.5"/>`;
    s += `<path d="M126,300 Q210,378 294,300" fill="none" stroke="#e1c3a3" stroke-width="2"/>`;
    s += tint('#e8d36a', 0.18);
    /* ombligo evertido */
    s += `<ellipse cx="210" cy="268" rx="10" ry="12" fill="#e3b08a" stroke="#9c6f4a" stroke-width="1.5"/><ellipse cx="210" cy="266" rx="4" ry="5" fill="#c98f6a"/>`;
    /* circulación colateral periumbilical */
    const rays = [[150, 190], [180, 150], [250, 150], [270, 190], [150, 340], [185, 372], [240, 372], [272, 340], [120, 268], [300, 268]];
    s += `<g fill="none" stroke="#4a6fa5" stroke-width="2.2" opacity=".75" stroke-linecap="round">`;
    rays.forEach(([x, y]) => { const mx = (210 + x) / 2 + (y > 268 ? 10 : -10), my = (268 + y) / 2 + (x > 210 ? 8 : -8); s += `<path d="M210,268 Q${mx},${my} ${x},${y}"/>`; });
    s += `<path d="M120,268 Q110,230 118,196 M300,268 Q312,230 304,196 M120,268 Q108,310 122,344 M300,268 Q314,310 298,344"/></g>`;
    /* telangiectasias (arañas vasculares) en la parte alta */
    [[150, 90], [250, 72], [300, 110]].forEach(([x, y]) => {
      s += `<g stroke="#c0392b" stroke-width="1" fill="none"><circle cx="${x}" cy="${y}" r="2" fill="#c0392b"/>`;
      for (let a = 0; a < 6; a++) { const r = a * Math.PI / 3; s += `<path d="M${x},${y} l${(8 * Math.cos(r)).toFixed(1)},${(8 * Math.sin(r)).toFixed(1)}"/>`; }
      s += '</g>';
    });
    s += label(210, 452, 'Flancos abombados · ombligo evertido · circulación colateral') + '</g>';
    return s;
  })();

  /* peritonitis: palidez, sudoración, abdomen plano e inmóvil */
  const OV_PERITONITIS = (() => {
    let s = '<g id="pat-peritonitis">' + tint('#e4e9ee', 0.42);
    [[110, 60], [300, 80], [160, 120], [262, 110], [330, 150]].forEach(([x, y]) => { s += `<path d="M${x},${y} c-4,6 -4,10 0,12 c4,-2 4,-6 0,-12 Z" fill="#9cc7e6" stroke="#5d9bc9" stroke-width=".8"/>`; });
    s += `<path d="M110,236 L310,236" stroke="#c9a283" stroke-width="1.6" stroke-dasharray="1 5" opacity=".8"/>`;
    s += label(210, 452, 'Pálido y sudoroso · abdomen plano, inmóvil con la respiración') + '</g>';
    return s;
  })();

  /* obstrucción intestinal: distensión central, cicatriz mediana, ondas peristálticas visibles */
  const OV_OBSTRUCCION = (() => {
    let s = '<g id="pat-obstruccion">';
    s += `<ellipse cx="210" cy="275" rx="112" ry="118" fill="${SKIN}" stroke="#d6b99a" stroke-width="2.5"/>`;
    s += `<path d="M120,340 Q210,420 300,340" fill="none" stroke="#d6b99a" stroke-width="2.5"/><path d="M130,210 Q210,170 290,210" fill="none" stroke="#e1c3a3" stroke-width="2"/>`;
    /* ondas peristálticas (asas distendidas en escalera) */
    s += `<g fill="none" stroke="#c9a283" stroke-width="3" opacity=".6" stroke-linecap="round"><path d="M136,232 Q210,214 284,232"/><path d="M128,262 Q210,244 292,262"/><path d="M132,296 Q210,278 288,296"/><path d="M146,330 Q210,312 274,330"/></g>`;
    /* cicatriz de laparotomía mediana supra e infraumbilical */
    s += `<path d="M210,130 V254 M210,284 V376" stroke="#c98f7a" stroke-width="4" stroke-linecap="round"/><path d="M210,130 V254 M210,284 V376" stroke="#f3dcd0" stroke-width="1.5" stroke-dasharray="3 3"/>`;
    s += `<g stroke="#c98f7a" stroke-width="1.4">${[140, 160, 180, 200, 220, 240, 300, 320, 340, 360].map(y => `<path d="M204,${y} H216"/>`).join('')}</g>`;
    s += `<ellipse cx="210" cy="268" rx="5" ry="7.5" fill="#d9a77e" stroke="#9c6f4a" stroke-width="1.5"/>`;
    s += label(210, 452, 'Distensión central · cicatriz mediana · ondas peristálticas') + '</g>';
    return s;
  })();

  /* colecistitis en paciente obesa: panículo abundante */
  const OV_OBESA = (() => {
    let s = '<g id="pat-obesa">';
    s += `<path d="M78,170 C50,240 48,330 76,392 C84,404 92,406 96,400 L96,222 Z" fill="${SKIN}" stroke="${EDGE}" stroke-width="3"/>`;
    s += `<path d="M342,170 C370,240 372,330 344,392 C336,404 328,406 324,400 L324,222 Z" fill="${SKIN}" stroke="${EDGE}" stroke-width="3"/>`;
    s += `<path d="M110,330 Q210,400 310,330" fill="none" stroke="#d6b99a" stroke-width="2.5"/><path d="M96,386 Q210,430 324,386" fill="none" stroke="#dcbf9f" stroke-width="2"/>`;
    s += `<g stroke="#e3b7a4" stroke-width="2" opacity=".8" fill="none"><path d="M112,300 l6,24 M122,312 l6,22 M300,300 l-6,24 M290,312 l-6,22"/></g>`;
    s += label(210, 452, 'Panículo adiposo abundante (IMC 29,7) · estrías blancas en flancos') + '</g>';
    return s;
  })();

  /* insuficiencia cardíaca derecha: edema de miembros inferiores, leve distensión, tinte subictérico */
  const OV_ICC = (() => {
    let s = '<g id="pat-icc">' + tint('#e8d36a', 0.08);
    s += `<path d="M60,440 C40,470 40,500 48,520 L200,520 L206,440 Z" fill="${SKIN}" stroke="${EDGE}" stroke-width="3"/>`;
    s += `<path d="M360,440 C380,470 380,500 372,520 L220,520 L214,440 Z" fill="${SKIN}" stroke="${EDGE}" stroke-width="3"/>`;
    s += `<g fill="none" stroke="#dcbf9f" stroke-width="2"><path d="M70,470 Q120,480 190,470"/><path d="M230,470 Q300,480 350,470"/><path d="M78,500 Q120,508 180,500"/><path d="M240,500 Q300,508 342,500"/></g>`;
    s += `<path d="M134,330 Q210,382 286,330" fill="none" stroke="#dcbf9f" stroke-width="2"/>`;
    /* hígado grande: insinúa su borde bajo el reborde (solo con luz / Aprendizaje) */
    s += `<path d="M98,226 C130,250 190,262 240,246" fill="none" stroke="#d6b99a" stroke-width="2" stroke-dasharray="6 4" class="hintring"/>`;
    s += label(210, 452, 'Edema de miembros inferiores con fóvea · abdomen levemente globoso') + '</g>';
    return s;
  })();

  /* esplenomegalia: abultamiento del hipocondrio y flanco izquierdos */
  const OV_ESPLENO = (() => {
    let s = '<g id="pat-espleno">';
    s += `<path d="M342,170 C372,220 374,300 352,372 C344,392 332,396 324,388 L324,222 Z" fill="${SKIN}" stroke="${EDGE}" stroke-width="3"/>`;
    s += `<path d="M250,186 C286,196 318,240 318,300 C318,330 302,356 282,364" fill="none" stroke="#d6b99a" stroke-width="2.5"/>`;
    s += `<path d="M300,150 C330,200 332,270 312,330" fill="none" stroke="#e1c3a3" stroke-width="2"/>`;
    s += label(210, 452, 'Abultamiento del hipocondrio y flanco izquierdos') + '</g>';
    return s;
  })();

  /* globo vesical: tumoración hipogástrica hemisférica */
  const OV_GLOBO = (() => {
    let s = '<g id="pat-globo">';
    s += `<ellipse cx="210" cy="330" rx="74" ry="62" fill="${SKIN}" stroke="#d6b99a" stroke-width="2.5"/>`;
    s += `<path d="M146,300 Q210,246 274,300" fill="none" stroke="#e1c3a3" stroke-width="2"/><path d="M150,356 Q210,396 270,356" fill="none" stroke="#d6b99a" stroke-width="2.5"/>`;
    s += `<ellipse cx="210" cy="268" rx="5" ry="7.5" fill="#d9a77e" stroke="#9c6f4a" stroke-width="1.5"/>`;
    s += `<circle cx="210" cy="398" r="5" fill="#e7bf9a" stroke="#a97d58" stroke-width="1.5"/>`;
    s += label(210, 452, 'Tumoración hipogástrica hemisférica, de la sínfisis hasta el ombligo') + '</g>';
    return s;
  })();

  /* apendicitis: muslo derecho semiflexionado (actitud antálgica), sin otros signos visibles */
  const OV_APEND = (() => {
    let s = '<g id="pat-apend">';
    s += `<path d="M68,440 C56,470 40,500 30,520 L200,520 L206,440 Z" fill="${SKIN}" stroke="${EDGE}" stroke-width="3"/>`;
    s += `<path d="M60,470 Q110,462 190,468" fill="none" stroke="#dcbf9f" stroke-width="2"/>`;
    s += label(210, 452, 'Muslo derecho semiflexionado (actitud antálgica)') + '</g>';
    return s;
  })();

  /* ---------- PACIENTES ---------- */
  const PACIENTES = [
    /* 1 · síndrome ascítico-edematoso por cirrosis */
    {
      id: 'pa1', age: 54, sex: 'M', diag: 'Síndrome ascítico-edematoso (cirrosis hepática)',
      complaint: 'Varón de 54 años, consumo de alcohol de 120 g/día durante 25 años. Desde hace 2 meses nota aumento del perímetro abdominal, hinchazón de piernas y ha subido 7 kg. Orina poco.',
      vitals: 'FC 88 · PA 104/62 · FR 18 · T 36,8 °C · SpO₂ 96 %',
      v: { hr: 88, sbp: 104, dbp: 62, rr: 18, temp: 36.8, spo2: 96, height: 1.72, weight: 84, waist: 112 },
      findings: [
        'Abdomen globoso con flancos abombados («vientre de batracio»), ombligo evertido, circulación colateral periumbilical y tinte ictérico; arañas vasculares en la parte alta del tronco.',
        'Matidez de los flancos con timpanismo periumbilical, <b>matidez desplazable</b> y <b>onda ascítica</b> positivas.',
        'Hígado de borde duro, irregular e indoloro; bazo palpable 3 cm bajo el reborde (hipertensión portal).',
        'Edema con fóvea en miembros inferiores; ausencia de dolor y de signos peritoneales.'
      ],
      teaching: [
        'La ascitis se sospecha por la inspección (flancos abombados, ombligo evertido) y se confirma percutiendo: matidez declive que se desplaza al cambiar de decúbito.',
        'La onda ascítica necesita la mano de un ayudante en la línea media para no confundirla con la onda de la pared en el obeso.',
        'Busca siempre los estigmas de hepatopatía crónica (ictericia, arañas vasculares, eritema palmar, ginecomastia, circulación colateral) y la esplenomegalia: orientan a hipertensión portal.',
        'La ascitis a tensión con dolor espontáneo o fiebre obliga a descartar peritonitis bacteriana espontánea.'
      ],
      overlay: forAll(OV_ASCITIS),
      path: Object.assign({
        'insp:forma:ojo': TH(TEC.ojo, '<b>abdomen globoso</b> con <b>flancos abombados</b> en decúbito dorsal («vientre de batracio»), que se desplaza hacia la parte declive al girar al paciente; perímetro 112 cm; piel tensa y brillante. Simétrico, sin masas localizadas.'),
        'insp:forma:luz': TH(TEC.luz, 'se confirma el abombamiento de los flancos; sin ondas peristálticas. Con luz rasante se ven mejor las venas dilatadas de la pared.'),
        'insp:piel:ojo': TH(TEC.ojo, 'piel con <b>tinte ictérico</b> (también escleras), seca; <b>arañas vasculares</b> en la parte alta del tronco; sin cicatrices. Vello corporal escaso. Edema con fóvea en ambos miembros inferiores.'),
        'insp:piel:luz': TH(TEC.luz, 'telangiectasias aracniformes que palidecen al comprimir el punto central y se rellenan desde él; piel tensa sin estrías rojas.'),
        'insp:circ:ojo': TH(TEC.ojo, '<b>circulación colateral</b> periumbilical en «cabeza de medusa»: venas dilatadas que irradian desde el ombligo (tipo portocava).'),
        'insp:circ:luz': TH(TEC.luz, 'al vaciar un segmento venoso con dos dedos y soltar, el llenado es <b>centrífugo</b> desde el ombligo (hacia arriba por encima y hacia abajo por debajo): patrón portocava de la hipertensión portal.'),
        'insp:epi:ojo': TH(TEC.ojo, 'epigastrio abombado, sin latidos ni peristaltismo visibles.'),
        'insp:epi:luz': TH(TEC.luz, 'sin latidos ni ondas peristálticas; el gran volumen de líquido amortigua el latido aórtico.'),
        'insp:omb:ojo': TH(TEC.ojo, '<b>ombligo evertido</b> (protruido, aplanado), con el anillo ampliado por la presión del líquido: hernia umbilical incipiente.'),
        'insp:omb:luz': TH(TEC.luz, 'protrusión umbilical que aumenta con la tos.'),
        'insp:ing:ojo': TH(TEC.ojo, 'región inguinal derecha sin abultamientos; edema del escroto y de los miembros inferiores.'),
        'insp:ing2:ojo': TH(TEC.ojo, 'región inguinal izquierda sin abultamientos; edema de miembros inferiores con fóvea (2+).')
      },
      quads(TEC.steth, '<b>RHA presentes pero atenuados</b> (≈ 6/min, lejanos): el líquido interpuesto amortigua el sonido; sin timbre metálico', 6, 0.45, '≈ 6 ruidos/min, apagados'),
      soplos(TEC.steth, 'sin soplos arteriales; a veces se ausculta un <b>zumbido venoso</b> continuo periumbilical (Cruveilhier-Baumgarten) por la recanalización de la vena umbilical: aquí no se detecta.'),
      nine('perc', (id, l) => {
        if (id === 'fd' || id === 'fi') return { html: '', run: null };
        if (id === 'mes') return P(TEC.perc, `<b>timpanismo periumbilical</b> (las asas flotan en el líquido y se agrupan en la zona más alta); el límite con la matidez de los flancos es cóncavo hacia arriba.`, 'hyper');
        if (id === 'hd') return P(TEC.perc, 'matidez hepática que se continúa con la matidez del flanco; la hepatimetría se mide en la franja LMC D.', 'dull');
        if (id === 'hi') return P(TEC.perc, '<b>matidez</b> en el hipocondrio izquierdo (bazo aumentado y líquido): no hay timpanismo.', 'dull');
        if (id === 'hip') return P(TEC.perc, '<b>matidez suprapúbica de límite superior cóncavo</b> hacia arriba (líquido libre declive), a diferencia de la convexa del globo vesical.', 'dull');
        if (id === 'fid' || id === 'fii') return P(TEC.perc, `<b>matidez</b> en ${l} por líquido libre declive.`, 'dull');
        return P(TEC.perc, `timpanismo en ${l} (zona alta, ocupada por asas con gas).`, 'hyper');
      }),
      {
        'perc:fd:perc': P(TEC.perc, '<b>matidez del flanco derecho</b> en decúbito dorsal (el líquido ocupa las zonas declives); la nota mate se extiende hacia la línea media con límite cóncavo.', 'dull'),
        'perc:fi:perc': P(TEC.perc, '<b>matidez del flanco izquierdo</b>, simétrica a la derecha; límite cóncavo hacia arriba.', 'dull'),
        'perc:fd:desp': P('marcar el límite de la matidez en decúbito dorsal y girar al paciente al decúbito lateral izquierdo; volver a percutir el flanco derecho.', '<b>matidez desplazable positiva</b>: el flanco derecho, antes mate, se vuelve timpánico al quedar arriba, y el límite de la matidez baja hacia el lado declive (líquido libre ≥ 1 L).', 'hyper'),
        'perc:fi:desp': P('percutir el flanco izquierdo en decúbito dorsal y después en decúbito lateral izquierdo.', '<b>matidez desplazable positiva</b>: en decúbito lateral izquierdo el flanco declive sigue mate y la matidez asciende hasta la línea media; al girar al otro lado, se vuelve timpánico.', 'dull'),
        'perc:fd:onda': M('mano de un ayudante con el borde cubital en la línea media; golpe seco en un flanco y palma apoyada en el otro.', '<b>onda ascítica positiva</b>: la mano del flanco opuesto recibe un impulso líquido claro, no transmitido por la pared.', 'golpe → onda ✔'),
        'perc:fi:onda': M('golpe en el flanco izquierdo con la mano del ayudante en la línea media.', '<b>onda ascítica positiva</b>: se percibe la onda en el flanco derecho (ascitis voluminosa).', 'golpe → onda ✔'),
        'perc:lmc:perc': (c, ctx) => {
          const y = ctx.point.y;
          if (y < 56) return { html: TH(TEC.perc, 'sonoridad pulmonar sobre la base derecha (derrame pleural ausente).'), run: () => Sound.percuss('resonant') };
          if (y < 155) return { html: TH(TEC.perc, '<b>matidez hepática</b>: límite superior en el 5.º EIC; la matidez se continúa bajo el reborde con la del flanco (ascitis), por lo que la hepatimetría percutoria es poco fiable. Hepatimetría estimada ≈ 13 cm.'), run: () => Sound.percuss('dull') };
          return { html: TH(TEC.perc, 'bajo el reborde costal la nota sigue <b>mate</b>: hígado que sobrepasa el reborde ≈ 2 cm y líquido libre en el flanco.'), run: () => Sound.percuss('dull') };
        },
        'perc:traube:perc': P(TEC.perc, '<b>espacio de Traube mate</b>: la esplenomegalia ocupa la semiluna que normalmente es timpánica.', 'dull'),
        'perc:castell:perc': P(TEC.perc, 'matidez esplénica aumentada: sobrepasa la línea axilar anterior y el reborde; signo de Castell positivo.', 'dull'),
        'perc:vej:perc': P(TEC.perc, 'matidez suprapúbica de límite cóncavo hacia arriba por líquido libre (no es globo vesical: el paciente ha orinado).', 'dull')
      },
      nine('palp:', () => undefined),
      {
        'palp:hig:prof': D('mano en cuchara bajo el reborde o enganche de Mathieu, en inspiración profunda; con ascitis a tensión, palpación por «peloteo» (signo del témpano).', '<b>hígado palpable 3 cm bajo el reborde</b> en la LMC: borde <b>duro, irregular (nodular), fino e indoloro</b>; superficie granulosa. Con la ascitis se percibe el <b>signo del témpano</b>: al deprimir bruscamente la pared, el hígado se hunde y vuelve a chocar con los dedos.'),
        'palp:ves:prof': D(TEC.prof, 'vesícula no palpable; punto cístico indoloro; Murphy negativo.'),
        'palp:baz:prof': D('bimanual en decúbito dorsal y maniobra de Middleton; en decúbito lateral derecho (Schuster) si hay duda.', '<b>bazo palpable 3 cm bajo el reborde costal izquierdo</b> en inspiración profunda: borde anterior con <b>escotadura</b>, consistencia firme, liso, indoloro, móvil con la respiración, sin peloteo lumbar (lo distingue del riñón). Esplenomegalia moderada por hipertensión portal.'),
        'palp:rd:prof': D('maniobra de Guyon.', 'riñón derecho no palpable; sin peloteo; palpación difícil por el líquido libre.'),
        'palp:ri:prof': D('maniobra de Guyon.', 'riñón izquierdo no palpable; la masa del hipocondrio izquierdo tiene escotadura y no pelotea: es el bazo.'),
        'palp:ao:prof': D(TEC.prof, 'latido aórtico apenas perceptible a través del líquido; sin masa expansiva.'),
        'palp:cie:prof': D(TEC.prof, 'ciego no delimitable por la ascitis; región indolora.'),
        'palp:sig:prof': D(TEC.prof, 'sigmoides no delimitable; sin dolor ni masas.'),
        'palp:vej:sup': F(TEC.sup, 'hipogastrio tenso por el líquido; sin globo vesical (el paciente acaba de orinar); indoloro.'),
        'palp:vej:prof': D(TEC.prof, 'sin masa suprapúbica delimitable; matidez por líquido libre, no por la vejiga.'),
        'palp:gl:sup': F(TEC.sup, 'ganglios inguinales pequeños, blandos y móviles (normales).'),
        'palp:gl:prof': D(TEC.prof, 'sin adenopatías inguinales.'),
        'palp:gl2:sup': F(TEC.sup, 'ganglios inguinales pequeños, blandos y móviles (normales).'),
        'palp:gl2:prof': D(TEC.prof, 'sin adenopatías inguinales.'),
        'palp:omb:sup': F(TEC.sup, 'ombligo evertido, blando, con anillo umbilical ampliado (≈ 2 cm); indoloro.'),
        'palp:omb:vals': M(TEC.vals, '<b>hernia umbilical</b>: protrusión e impulso a la tos a través del anillo dilatado; reductible. Frecuente en la ascitis por el aumento de presión intraabdominal.', 'tos → impulso'),
        'palp:ingd:vals': M(TEC.vals, 'sin hernia inguinal ni crural derecha; impulso a la tos negativo.', 'tos'),
        'palp:ingi:vals': M(TEC.vals, 'sin hernia inguinal ni crural izquierda.', 'tos'),
        'palp:lin:vals': M(TEC.vals, 'línea alba distendida; sin defecto aponeurótico ni hernia epigástrica.', 'tos'),
        'man:abd:blumberg': M('presión lenta y descompresión brusca.', '<b>Blumberg negativo</b>: pared tensa por el líquido pero sin dolor a la descompresión; sin signos de peritonitis bacteriana espontánea.', '↓ … ↑ sin dolor'),
        'man:mur:murphy': M('presión en el punto cístico durante la inspiración profunda.', 'Murphy negativo.', 'inspire …'),
        'man:mcb:mcburney': M('presión en el punto de McBurney.', 'indoloro.', '↓ presión'),
        'man:mcb:blumberg': M('descompresión brusca en la fosa ilíaca derecha.', 'Blumberg negativo.', '↓ … ↑'),
        'man:lif:rovsing': M('presión en la fosa ilíaca izquierda.', 'Rovsing negativo.', '↓ presión FII'),
        'man:lif:blumberg': M('descompresión brusca en la fosa ilíaca izquierda.', 'Blumberg negativo.', '↓ … ↑'),
        'man:flD:onda': M('golpe seco en el flanco con la mano de un ayudante en la línea media.', '<b>onda ascítica positiva</b>: impulso líquido nítido en la palma apoyada en el flanco izquierdo.', 'golpe → onda ✔'),
        'man:flI:onda': M('golpe seco en el flanco izquierdo con la mano de un ayudante en la línea media.', '<b>onda ascítica positiva</b>: la onda llega al flanco derecho.', 'golpe → onda ✔'),
        'man:muslo:psoas': M('elevación del muslo derecho extendido contra resistencia.', 'signo del psoas negativo.', '↑ elevar'),
        'man:muslo:obt': M('flexión de cadera y rodilla a 90° con rotación interna.', 'signo del obturador negativo.', '⟲ rotación'),
        'man:cvd:giordano': M('puñopercusión lumbar derecha sobre la mano apoyada.', 'negativa (sin dolor).', 'golpe suave'),
        'man:cvi:giordano': M('puñopercusión lumbar izquierda.', 'negativa.', 'golpe suave')
      })
    },

    /* 2 · apendicitis aguda */
    {
      id: 'pa2', age: 22, sex: 'M', diag: 'Apendicitis aguda',
      complaint: 'Varón de 22 años. Hace 20 h comenzó con dolor periumbilical sordo, náuseas y un vómito; desde hace 8 h el dolor se fijó en la fosa ilíaca derecha y aumenta al caminar y con la tos. Anorexia.',
      vitals: 'FC 102 · PA 118/74 · FR 18 · T 38,0 °C (axilar) · SpO₂ 98 %',
      v: { hr: 102, sbp: 118, dbp: 74, rr: 18, temp: 38.0, spo2: 98, height: 1.78, weight: 72, waist: 82 },
      findings: [
        'Dolor que migra del epigastrio/periumbilical a la fosa ilíaca derecha (cronología de Murphy), con fiebre y taquicardia.',
        'Dolor y <b>defensa muscular</b> en la fosa ilíaca derecha; punto de <b>McBurney</b> doloroso; <b>Blumberg</b> positivo (irritación peritoneal localizada).',
        'Signos de <b>Rovsing</b> y del <b>psoas</b> positivos (apéndice retrocecal); hiperestesia cutánea en la FID.',
        'RHA disminuidos; el resto del abdomen es blando y sin dolor a la descompresión (sin peritonitis generalizada).'
      ],
      teaching: [
        'Explora primero las zonas no dolorosas y deja la fosa ilíaca derecha para el final: la defensa voluntaria del paciente asustado invalida el examen.',
        'El Blumberg localizado en la FID indica irritación del peritoneo parietal; si se generaliza (Gueneau de Mussy) sospecha perforación.',
        'El psoas positivo orienta a apéndice retrocecal y el obturador a apéndice pélvico; su negatividad no descarta la apendicitis.',
        'En la mujer joven el diagnóstico diferencial incluye patología anexial: completa con examen ginecológico.'
      ],
      overlay: forAll(OV_APEND),
      path: Object.assign({
        'insp:forma:ojo': TH(TEC.ojo, 'abdomen <b>plano</b>, simétrico, que <b>se mueve poco con la respiración en la mitad inferior</b>; el paciente está quieto, con el muslo derecho semiflexionado (actitud antálgica). Sin distensión.'),
        'insp:forma:luz': TH(TEC.luz, 'sin masas ni ondas peristálticas; respiración de predominio torácico.'),
        'insp:piel:ojo': TH(TEC.ojo, 'piel de color normal, sin cicatrices (no hay apendicectomía previa) ni lesiones; facies de dolor; lengua saburral.'),
        'insp:piel:luz': TH(TEC.luz, 'sin relieves ni lesiones; sin circulación colateral.'),
        'insp:circ:ojo': TH(TEC.ojo, 'sin circulación colateral.'),
        'insp:epi:ojo': TH(TEC.ojo, 'sin latidos ni peristaltismo visibles.'),
        'insp:epi:luz': TH(TEC.luz, 'latido aórtico discreto propio del joven delgado; sin ondas peristálticas.'),
        'insp:omb:ojo': TH(TEC.ojo, 'ombligo normal, deprimido, sin equimosis.'),
        'insp:ing:ojo': TH(TEC.ojo, 'región inguinal derecha sin abultamientos (descarta hernia complicada como causa del dolor).'),
        'insp:ing2:ojo': TH(TEC.ojo, 'región inguinal izquierda normal.')
      },
      quads(TEC.steth, '<b>RHA disminuidos</b> (≈ 4/min), de tono bajo, por íleo reflejo', 4, 0.6, '≈ 4 ruidos/min, disminuidos'),
      soplos(TEC.steth, 'sin soplos.'),
      {
        'perc:fid:perc': P('percusión suave sobre la fosa ilíaca derecha.', '<b>dolor a la percusión</b> en la fosa ilíaca derecha (equivalente delicado del Blumberg); nota timpánica.', 'hyper'),
        'perc:hip:perc': P(TEC.perc, 'timpanismo; dolor leve en la zona próxima a la FID.', 'hyper'),
        'perc:mes:perc': P(TEC.perc, 'timpanismo, indoloro.', 'hyper'),
        'perc:fd:perc': P(TEC.perc, 'timpanismo; percusión apenas molesta.', 'hyper'),
        'perc:vej:perc': P(TEC.perc, 'timpanismo suprapúbico, vejiga vacía; molestia leve hacia la derecha.', 'hyper'),
        'palp:fid:sup': F('palpación superficial; se explora al final, tras el resto del abdomen.', '<b>dolor y defensa muscular</b> (contractura localizada, en parte voluntaria) en la fosa ilíaca derecha; <b>hiperestesia cutánea</b>: el roce suave de la piel es doloroso (triángulo de Sherren).'),
        'palp:fid:prof': D('palpación profunda al final del examen.', '<b>dolor intenso</b> en la FID con <b>defensa</b> que impide la palpación profunda; sin masa palpable (sin plastrón); <b>dolor a la descompresión</b> (Blumberg) presente.'),
        'palp:hip:sup': F(TEC.sup, 'hipogastrio blando, con molestia leve en su parte derecha; sin defensa.'),
        'palp:hip:prof': D(TEC.prof, 'dolor referido a la fosa ilíaca derecha al presionar el hipogastrio; sin masa.'),
        'palp:fd:sup': F(TEC.sup, 'flanco derecho blando, molestia leve en su parte baja; sin defensa.'),
        'palp:fd:prof': D(TEC.prof, 'flanco derecho sin masas; dolor leve en su parte inferior.'),
        'palp:mes:sup': F(TEC.sup, 'región umbilical blanda e indolora ahora (el dolor inicial periumbilical era visceral, referido).'),
        'palp:mes:prof': D(TEC.prof, 'sin masas; presión profunda periumbilical que irradia molestia hacia la FID.'),
        'palp:fii:sup': F(TEC.sup, 'fosa ilíaca izquierda blanda e indolora.'),
        'palp:fii:prof': D('presión profunda en la fosa ilíaca izquierda.', 'sin dolor local, pero el paciente refiere <b>dolor en la fosa ilíaca derecha</b> (Rovsing positivo).'),
        'palp:cie:prof': D(TEC.prof, '<b>dolor</b> al palpar el ciego; defensa muscular; no se delimita masa.'),
        'palp:sig:prof': D(TEC.prof, 'sigmoides normal e indoloro.'),
        'palp:ingd:vals': M(TEC.vals, 'sin hernia inguinal derecha; la tos provoca dolor en la fosa ilíaca derecha (signo de la tos positivo).', 'tos → dolor FID'),
        'man:abd:blumberg': M('presión lenta y descompresión brusca en un punto alejado de la FID (p. ej. flanco izquierdo).', '<b>sin dolor a la descompresión en el resto del abdomen</b> (Gueneau de Mussy negativo): la irritación peritoneal está localizada en la FID.', '↓ … ↑ sin dolor'),
        'man:mur:murphy': M('presión en el punto cístico en inspiración profunda.', 'Murphy negativo.', 'inspire …'),
        'man:mcb:mcburney': M('presión en la unión del tercio externo con los dos tercios internos de la línea EIAS-ombligo.', '<b>punto de McBurney doloroso</b> con defensa muscular.', '↓ ¡dolor!'),
        'man:mcb:blumberg': M('presión lenta y profunda en la FID; soltar de golpe.', '<b>Blumberg positivo</b>: el dolor es mayor al soltar que al presionar (irritación del peritoneo parietal).', '↑ ¡dolor al soltar!'),
        'man:lif:rovsing': M('presión en la fosa ilíaca izquierda, desplazando el gas del colon hacia el ciego.', '<b>Rovsing positivo</b>: dolor referido a la fosa ilíaca derecha.', '↓ FII → dolor FID'),
        'man:lif:blumberg': M('descompresión brusca en la fosa ilíaca izquierda.', 'Blumberg negativo a la izquierda.', '↓ … ↑'),
        'man:flD:onda': M('golpe en el flanco con la mano del ayudante en la línea media.', 'onda ascítica negativa.', 'sin onda'),
        'man:flI:onda': M('golpe en el flanco izquierdo.', 'onda ascítica negativa.', 'sin onda'),
        'man:muslo:psoas': M('elevación del muslo derecho extendido contra resistencia (o extensión de la cadera en decúbito lateral izquierdo).', '<b>signo del psoas positivo</b>: dolor en la fosa ilíaca derecha (apéndice retrocecal en contacto con el psoas).', '↑ ¡dolor!'),
        'man:muslo:obt': M('flexión de cadera y rodilla derechas a 90° y rotación interna.', 'signo del obturador <b>dudoso</b>: molestia leve en el hipogastrio.', '⟲ molestia leve'),
        'man:cvd:giordano': M('puñopercusión lumbar derecha.', 'negativa (sin dolor): no orienta a patología renal.', 'golpe suave'),
        'man:cvi:giordano': M('puñopercusión lumbar izquierda.', 'negativa.', 'golpe suave')
      })
    },

    /* 3 · peritonitis aguda generalizada */
    {
      id: 'pa3', age: 68, sex: 'F', diag: 'Peritonitis aguda generalizada (abdomen agudo perforativo)',
      complaint: 'Mujer de 68 años, consumidora crónica de antiinflamatorios por artrosis. Hace 6 h dolor epigástrico brusco «como una puñalada» que se extendió a todo el abdomen; no se mueve porque el dolor empeora. Náuseas; no ha vomitado.',
      vitals: 'FC 118 · PA 92/56 · FR 26 · T 38,6 °C · SpO₂ 94 %',
      v: { hr: 118, sbp: 92, dbp: 56, rr: 26, temp: 38.6, spo2: 94, height: 1.60, weight: 64, waist: 90 },
      findings: [
        'Paciente inmóvil, pálida y sudorosa, con taquicardia, hipotensión y taquipnea (sepsis de origen abdominal).',
        'Abdomen plano, <b>que no se mueve con la respiración</b>; <b>contractura generalizada</b> («abdomen en tabla») y <b>Blumberg positivo difuso</b> (Gueneau de Mussy).',
        '<b>Silencio auscultatorio</b> (íleo paralítico) y <b>desaparición de la matidez hepática</b> (neumoperitoneo: signo de Jobert).',
        'Perforación de úlcera péptica como causa probable; la puñopercusión y los puntos renales son negativos.'
      ],
      teaching: [
        'La contractura involuntaria (rigidez que no cede al distraer al paciente ni con la flexión de las rodillas) distingue el abdomen en tabla de la defensa voluntaria.',
        'En la peritonitis el abdomen deja de respirar: pide una inspiración profunda y observa la inmovilidad; la tos es muy dolorosa.',
        'Ausculta 2–3 minutos antes de afirmar el silencio abdominal; el timpanismo sobre el área hepática (Jobert) sugiere aire libre por perforación de víscera hueca.',
        'La peritonitis generalizada es una urgencia quirúrgica: el examen debe ser breve y el dolor no debe retrasar la analgesia ni la cirugía.'
      ],
      overlay: forAll(OV_PERITONITIS),
      path: Object.assign({
        'insp:forma:ojo': TH(TEC.ojo, 'abdomen <b>plano, inmóvil</b>: no participa en la respiración (respiración costal superior rápida y superficial, FR 26). La paciente permanece quieta en decúbito dorsal con las rodillas flexionadas y evita toser. Sin distensión.'),
        'insp:forma:luz': TH(TEC.luz, 'pared tensa, sin relieve de los rectos al respirar; sin ondas peristálticas.'),
        'insp:piel:ojo': TH(TEC.ojo, 'piel <b>pálida, fría y sudorosa</b>; sin cicatrices ni ictericia. Facies de dolor y ansiedad; lengua seca.'),
        'insp:piel:luz': TH(TEC.luz, 'sudoración fina en la pared; sin lesiones.'),
        'insp:circ:ojo': TH(TEC.ojo, 'sin circulación colateral.'),
        'insp:epi:ojo': TH(TEC.ojo, 'epigastrio plano, inmóvil; sin latidos visibles.'),
        'insp:epi:luz': TH(TEC.luz, 'sin latidos ni peristaltismo; el epigastrio no se mueve con la respiración.'),
        'insp:omb:ojo': TH(TEC.ojo, 'ombligo normal, sin equimosis.'),
        'insp:ing:ojo': TH(TEC.ojo, 'regiones inguinales sin abultamientos (siempre descartar hernia estrangulada).'),
        'insp:ing2:ojo': TH(TEC.ojo, 'región inguinal izquierda normal.')
      },
      quads('diafragma apoyado 2–3 min en cada cuadrante antes de concluir.', '<b>silencio auscultatorio</b>: no se oyen ruidos hidroaéreos (íleo paralítico por peritonitis)', 0, 0, 'Silencio abdominal (0 ruidos en 3 min)'),
      soplos(TEC.steth, 'sin soplos; silencio intestinal de fondo.'),
      nine('perc', (id, l) => {
        if (id === 'hd') return P('percusión suave sobre el área hepática.', '<b>desaparición de la matidez hepática</b>: nota timpánica donde debería haber matidez (<b>signo de Jobert</b>) por aire libre entre el hígado y la pared (neumoperitoneo). Dolor a la percusión.', 'hyper');
        return P('percusión suave, muy dolorosa.', `<b>dolor a la percusión</b> en ${l}; timpanismo generalizado. La paciente contrae la pared con cada golpe.`, 'hyper');
      }),
      {
        'perc:lmc:perc': (c, ctx) => ctx.point.y < 56
          ? { html: TH(TEC.perc, 'sonoridad pulmonar.'), run: () => Sound.percuss('resonant') }
          : { html: TH(TEC.perc, '<b>timpanismo sobre el área hepática</b> (signo de Jobert): el aire libre se interpone entre el hígado y la pared; la hepatimetría no puede medirse.'), run: () => Sound.percuss('hyper') },
        'perc:traube:perc': P(TEC.perc, 'timpanismo (normal); dolor a la percusión.', 'hyper'),
        'perc:castell:perc': P(TEC.perc, 'matidez esplénica normal; dolor.', 'dull'),
        'perc:vej:perc': P(TEC.perc, 'timpanismo suprapúbico; dolor a la percusión.', 'hyper'),
        'perc:fd:desp': P('comparación de la nota en decúbito dorsal y lateral.', 'sin matidez desplazable; el paciente tolera mal el cambio de decúbito.', 'hyper'),
        'perc:fi:desp': P('comparación de la nota en ambos decúbitos.', 'sin matidez desplazable.', 'hyper'),
        'perc:fd:onda': M('golpe en el flanco con la mano del ayudante en la línea media.', 'sin onda ascítica; la maniobra es muy dolorosa.', 'sin onda'),
        'perc:fi:onda': M('golpe en el flanco izquierdo.', 'sin onda ascítica.', 'sin onda')
      },
      nine('palp', (id, l) => ({
        sup: F('palpación superficial muy suave.', `<b>contractura muscular involuntaria</b> en ${l}: pared <b>rígida como una tabla</b>, que no cede con la flexión de las rodillas ni al distraer a la paciente; dolor intenso al mínimo contacto; hiperestesia cutánea.`),
        prof: D('la palpación profunda no es posible.', `la contractura generalizada impide deprimir la pared en ${l}; dolor intenso con <b>dolor a la descompresión</b> difuso.`)
      })),
      {}),
      /* la plantilla anterior devuelve objetos por región sin instrumento: se expanden abajo */
      _expand: true
    },

    /* 4 · obstrucción intestinal mecánica */
    {
      id: 'pa4', age: 76, sex: 'M', diag: 'Síndrome de obstrucción intestinal (íleo mecánico)',
      complaint: 'Varón de 76 años operado hace 10 años de una laparotomía por un tumor de colon. Desde hace 36 h dolor abdominal cólico, vómitos (al principio alimentarios, luego biliosos y por último fecaloides) y distensión progresiva; no elimina gases ni heces desde hace 2 días.',
      vitals: 'FC 108 · PA 110/70 · FR 22 · T 37,2 °C · SpO₂ 95 %',
      v: { hr: 108, sbp: 110, dbp: 70, rr: 22, temp: 37.2, spo2: 95, height: 1.70, weight: 68, waist: 104 },
      findings: [
        'Tétrada de la obstrucción: dolor cólico, vómitos, distensión y detención de gases y heces; cicatriz de laparotomía (bridas como causa probable).',
        '<b>Distensión central</b> simétrica, timpánica, con <b>ondas peristálticas visibles</b> con luz tangencial.',
        '<b>RHA aumentados, de timbre metálico</b> y en salvas coincidiendo con el cólico («ruidos de lucha»); en fases tardías desaparecen (silencio por agotamiento).',
        'Abdomen doloroso de forma difusa pero <b>sin contractura ni Blumberg</b> (sin sufrimiento peritoneal todavía); orificios herniarios libres; deshidratación.'
      ],
      teaching: [
        'Ante una obstrucción, explora los orificios herniarios (inguinal, crural, umbilical) y busca cicatrices: bridas y hernias son las causas más frecuentes.',
        'RHA aumentados y metálicos, con dolor cólico simultáneo, orientan a obstrucción mecánica; el silencio orienta a íleo paralítico o a obstrucción evolucionada.',
        'Aparición de contractura, Blumberg o fiebre significa sufrimiento de asa (estrangulación) y urgencia quirúrgica.',
        'Completa con tacto rectal (ampolla vacía, fecaloma, tumor) y valora la deshidratación (mucosas, pliegue, taquicardia).'
      ],
      overlay: forAll(OV_OBSTRUCCION),
      path: Object.assign({
        'insp:forma:ojo': TH(TEC.ojo, '<b>abdomen distendido</b>, de predominio <b>central</b> (asas de intestino delgado), simétrico y tenso; perímetro 104 cm (ha aumentado). <b>Cicatriz de laparotomía mediana</b> supra e infraumbilical. El paciente se queja en oleadas (dolor cólico).'),
        'insp:forma:luz': TH(TEC.luz, '<b>ondas peristálticas visibles</b>: relieves alargados «en escalera» que recorren el mesogastrio y coinciden con el dolor cólico (signo de lucha intestinal).'),
        'insp:piel:ojo': TH(TEC.ojo, 'piel seca con <b>pliegue persistente</b> (deshidratación); <b>cicatriz quirúrgica mediana</b> de 25 cm, bien cicatrizada, sin eventración visible en reposo. Sin ictericia.'),
        'insp:piel:luz': TH(TEC.luz, 'cicatriz lineal con marcas de sutura; sin relieve de eventración en reposo (comprobar con tos).'),
        'insp:circ:ojo': TH(TEC.ojo, 'sin circulación colateral.'),
        'insp:epi:ojo': TH(TEC.ojo, 'epigastrio distendido; sin latidos visibles.'),
        'insp:epi:luz': TH(TEC.luz, 'ondas peristálticas de progresión lenta que se dirigen hacia el flanco derecho.'),
        'insp:omb:ojo': TH(TEC.ojo, 'ombligo aplanado por la distensión, junto a la cicatriz; sin hernia visible.'),
        'insp:omb:luz': TH(TEC.luz, 'sin protrusión umbilical.'),
        'insp:ing:ojo': TH(TEC.ojo, 'región inguinal derecha <b>sin abultamiento</b> (se descarta hernia estrangulada como causa).'),
        'insp:ing2:ojo': TH(TEC.ojo, 'región inguinal izquierda sin abultamiento.')
      },
      quads(TEC.steth, '<b>RHA aumentados</b> (≈ 40/min), <b>de timbre metálico</b> y en salvas que coinciden con el cólico (ruidos de lucha); también borborigmos audibles a distancia', 40, 1.0, '≈ 40 ruidos/min, metálicos, en salvas'),
      soplos(TEC.steth, 'sin soplos arteriales; se oyen los RHA metálicos de fondo.'),
      nine('perc', (id, l) => P(TEC.perc, `<b>timpanismo aumentado</b> en ${l} (asas distendidas por gas); ${id === 'hd' ? 'la matidez hepática está reducida, desplazada hacia arriba por la distensión' : 'molestia difusa, sin dolor localizado'}.`, 'hyper')),
      {
        'perc:lmc:perc': (c, ctx) => ctx.point.y < 70
          ? { html: TH(TEC.perc, 'sonoridad pulmonar (el diafragma está elevado por la distensión).'), run: () => Sound.percuss('resonant') }
          : ctx.point.y < 140
            ? { html: TH(TEC.perc, 'matidez hepática reducida (≈ 7 cm) por interposición de asas distendidas y elevación del diafragma.'), run: () => Sound.percuss('dull') }
            : { html: TH(TEC.perc, 'timpanismo: asas distendidas bajo el reborde y por delante del hígado.'), run: () => Sound.percuss('hyper') },
        'perc:traube:perc': P(TEC.perc, 'timpanismo acentuado (cámara gástrica distendida).', 'hyper'),
        'perc:castell:perc': P(TEC.perc, 'matidez esplénica normal.', 'dull'),
        'perc:vej:perc': P(TEC.perc, 'timpanismo suprapúbico (vejiga vacía: el paciente orina poco por la deshidratación).', 'hyper'),
        'perc:fd:desp': P('percusión en decúbito dorsal y lateral.', 'sin matidez desplazable: la nota timpánica no cambia (distensión gaseosa, no líquido).', 'hyper'),
        'perc:fi:desp': P('percusión en ambos decúbitos.', 'sin matidez desplazable.', 'hyper'),
        'perc:fd:onda': M('golpe en el flanco con la mano del ayudante en la línea media.', 'onda ascítica negativa.', 'sin onda'),
        'perc:fi:onda': M('golpe en el flanco izquierdo.', 'onda ascítica negativa.', 'sin onda')
      },
      nine('palp', (id, l) => ({
        sup: F(TEC.sup, `pared <b>distendida y tensa</b> en ${l}, pero <b>depresible</b>; dolor difuso moderado, <b>sin defensa ni contractura</b>; temperatura normal.`),
        prof: D(TEC.prof, `en ${l} se palpan <b>asas distendidas, elásticas y timpánicas</b>; dolor difuso sin dolor a la descompresión; sin masas (no se palpa tumor).`)
      })),
      {
        'palp:hig:prof': D('mano en cuchara en inspiración.', 'borde hepático no palpable (dificultado por la distensión); indoloro.'),
        'palp:ves:prof': D(TEC.prof, 'vesícula no palpable; Murphy negativo.'),
        'palp:baz:prof': D(TEC.prof, 'bazo no palpable.'),
        'palp:rd:prof': D('maniobra de Guyon.', 'riñón no palpable; palpación dificultada por la distensión.'),
        'palp:ri:prof': D('maniobra de Guyon.', 'riñón no palpable.'),
        'palp:ao:prof': D(TEC.prof, 'latido aórtico no delimitable por la distensión; sin masa expansiva.'),
        'palp:cie:prof': D(TEC.prof, 'ciego distendido, timpánico, poco doloroso.'),
        'palp:sig:prof': D(TEC.prof, 'sigmoides vacío, no distendido (obstrucción del intestino delgado: el colon está colapsado).'),
        'palp:vej:sup': F(TEC.sup, 'sin globo vesical.'),
        'palp:vej:prof': D(TEC.prof, 'hipogastrio distendido por asas; vejiga no palpable.'),
        'palp:omb:sup': F(TEC.sup, 'anillo umbilical cerrado, junto a la cicatriz.'),
        'palp:omb:vals': M(TEC.vals, 'sin hernia umbilical; con la tos no hay impulso a través del anillo.', 'tos'),
        'palp:lin:vals': M('tos con la mano sobre la cicatriz mediana.', '<b>pequeña eventración</b> de 3 cm en la parte alta de la cicatriz: impulso a la tos, <b>reductible e indolora</b> (no es la causa de la obstrucción; probable brida).', 'tos → impulso'),
        'palp:ingd:vals': M(TEC.vals, '<b>orificios herniarios derechos libres</b>: sin protrusión ni impulso a la tos; sin masa crural.', 'tos'),
        'palp:ingi:vals': M(TEC.vals, 'orificios herniarios izquierdos libres.', 'tos'),
        'man:abd:blumberg': M('presión lenta y descompresión brusca.', '<b>Blumberg negativo</b>: molestia por la distensión, sin dolor neto a la descompresión (sin sufrimiento peritoneal por ahora; vigilar).', '↓ … ↑'),
        'man:mur:murphy': M('presión en el punto cístico.', 'Murphy negativo.', 'inspire …'),
        'man:mcb:mcburney': M('presión en McBurney.', 'molestia difusa, no localizada; sin defensa.', '↓ presión'),
        'man:mcb:blumberg': M('descompresión en la FID.', 'Blumberg negativo.', '↓ … ↑'),
        'man:lif:rovsing': M('presión en la FII.', 'Rovsing negativo.', '↓ presión FII'),
        'man:lif:blumberg': M('descompresión en la FII.', 'Blumberg negativo.', '↓ … ↑'),
        'man:flD:onda': M('golpe en el flanco con la mano del ayudante en la línea media.', 'onda ascítica negativa (distensión gaseosa).', 'sin onda'),
        'man:flI:onda': M('golpe en el flanco izquierdo.', 'onda ascítica negativa.', 'sin onda'),
        'man:muslo:psoas': M('elevación del muslo contra resistencia.', 'psoas negativo.', '↑ elevar'),
        'man:muslo:obt': M('rotación interna de la cadera.', 'obturador negativo.', '⟲ rotación'),
        'man:cvd:giordano': M('puñopercusión lumbar derecha.', 'negativa.', 'golpe suave'),
        'man:cvi:giordano': M('puñopercusión lumbar izquierda.', 'negativa.', 'golpe suave')
      }),
      _expand: true
    },

    /* 5 · colecistitis aguda */
    {
      id: 'pa5', age: 47, sex: 'F', diag: 'Colecistitis aguda',
      complaint: 'Mujer de 47 años, obesa, con litiasis vesicular conocida. Desde hace 18 h dolor continuo en el hipocondrio derecho que irradia a la escápula derecha, tras una comida grasa; náuseas, dos vómitos y escalofríos.',
      vitals: 'FC 96 · PA 128/80 · FR 18 · T 38,2 °C · SpO₂ 97 %',
      v: { hr: 96, sbp: 128, dbp: 80, rr: 18, temp: 38.2, spo2: 97, height: 1.62, weight: 78, waist: 96 },
      findings: [
        'Dolor continuo en el hipocondrio derecho irradiado al dorso/escápula, con fiebre y vómitos, tras una comida grasa.',
        '<b>Signo de Murphy positivo</b>: la inspiración se interrumpe por dolor al presionar el punto cístico.',
        'Dolor y <b>defensa localizada</b> en el hipocondrio derecho; <b>vesícula palpable</b> como una masa piriforme, dolorosa, que desciende con la inspiración (en una minoría de casos).',
        'Sin ictericia franca ni signos de peritonitis generalizada; Blumberg negativo fuera del hipocondrio.'
      ],
      teaching: [
        'El Murphy se busca con los dedos bajo el reborde costal derecho en el borde externo del recto: el paciente «corta» la inspiración por dolor.',
        'Una vesícula palpable, dolorosa y con fiebre es colecistitis; una vesícula palpable, indolora y con ictericia (ley de Courvoisier-Terrier) sugiere obstrucción neoplásica del colédoco.',
        'Vigila la aparición de ictericia (coledocolitiasis asociada) y de Blumberg difuso (perforación vesicular).',
        'En la paciente obesa la palpación profunda es difícil: aprovecha la espiración y la mano en cuchara.'
      ],
      overlay: forAll(OV_OBESA),
      path: Object.assign({
        'insp:forma:ojo': TH(TEC.ojo, 'abdomen <b>globoso por panículo adiposo</b> (IMC 29,7; cintura 96 cm), simétrico, sin distensión. La paciente respira de forma superficial para no movilizar el hipocondrio derecho.'),
        'insp:forma:luz': TH(TEC.luz, 'sin masas ni ondas peristálticas; limitación respiratoria del hemiabdomen superior derecho.'),
        'insp:piel:ojo': TH(TEC.ojo, 'piel de color normal, <b>sin ictericia</b> franca (escleras blancas); estrías blancas nacaradas en flancos (antiguas); sin cicatrices.'),
        'insp:piel:luz': TH(TEC.luz, 'estrías atróficas antiguas; sin otras lesiones.'),
        'insp:circ:ojo': TH(TEC.ojo, 'sin circulación colateral.'),
        'insp:epi:ojo': TH(TEC.ojo, 'sin latidos ni peristaltismo visibles.'),
        'insp:epi:luz': TH(TEC.luz, 'sin latidos visibles (panículo grueso).'),
        'insp:omb:ojo': TH(TEC.ojo, 'ombligo deprimido, profundo por el panículo; sin hernia.'),
        'insp:ing:ojo': TH(TEC.ojo, 'regiones inguinales sin abultamientos.'),
        'insp:ing2:ojo': TH(TEC.ojo, 'región inguinal izquierda normal.')
      },
      quads(TEC.steth, 'RHA presentes, algo <b>disminuidos</b> (≈ 6/min) por íleo reflejo leve', 6, 0.7, '≈ 6 ruidos/min'),
      soplos(TEC.steth, 'sin soplos.'),
      {
        'perc:hd:perc': P('percusión suave del hipocondrio derecho.', 'matidez hepática de extensión normal; la percusión es <b>dolorosa</b> en el hipocondrio derecho.', 'dull'),
        'perc:ep:perc': P(TEC.perc, 'timpanismo; molestia leve en la parte derecha del epigastrio.', 'hyper'),
        'perc:fd:perc': P(TEC.perc, 'timpanismo; molestia en la parte alta del flanco.', 'hyper'),
        'perc:lmc:perc': (c, ctx) => ctx.point.y < 76
          ? { html: TH(TEC.perc, 'sonoridad pulmonar en la base derecha.'), run: () => Sound.percuss('resonant') }
          : ctx.point.y < 160
            ? { html: TH(TEC.perc, 'matidez hepática: hepatimetría ≈ 9 cm (normal); dolor al percutir cerca del reborde.'), run: () => Sound.percuss('dull') }
            : { html: TH(TEC.perc, 'timpanismo bajo el reborde; percusión dolorosa en el punto cístico.'), run: () => Sound.percuss('hyper') },
        'palp:hd:sup': F('palpación superficial que se deja para el final.', '<b>dolor y defensa muscular localizada</b> en el hipocondrio derecho; hiperestesia cutánea leve. El resto de la pared es blando.'),
        'palp:hd:prof': D('palpación profunda con mano en cuchara durante la espiración.', '<b>dolor intenso</b> en el hipocondrio derecho con defensa; en el punto cístico se palpa una <b>masa piriforme, tensa y dolorosa</b> que desciende con la inspiración: <b>vesícula distendida</b>.'),
        'palp:ep:sup': F(TEC.sup, 'epigastrio blando; molestia en su parte derecha.'),
        'palp:ep:prof': D(TEC.prof, 'dolor en la parte derecha del epigastrio; sin masas; latido aórtico normal.'),
        'palp:fd:sup': F(TEC.sup, 'flanco derecho blando; molestia en su parte alta.'),
        'palp:fd:prof': D(TEC.prof, 'sin masas; dolor referido al hipocondrio.'),
        'palp:hig:prof': D('mano en cuchara bajo el reborde en inspiración profunda.', 'borde hepático palpable 1 cm bajo el reborde, <b>liso, romo y doloroso</b> (reacción inflamatoria perivesicular); hepatimetría normal.'),
        'palp:ves:prof': D('presión en el punto cístico (unión del reborde costal derecho con el borde externo del recto) durante la inspiración.', '<b>vesícula palpable</b>: masa piriforme, renitente, de unos 4 cm, <b>muy dolorosa</b>, que se desplaza con la inspiración; <b>signo de Murphy positivo</b>.'),
        'man:abd:blumberg': M('presión lenta y descompresión brusca lejos del hipocondrio derecho.', 'Blumberg negativo en el resto del abdomen (sin peritonitis generalizada); en el hipocondrio derecho hay dolor a la descompresión localizado.', '↓ … ↑'),
        'man:mur:murphy': M('dedos bajo el reborde costal derecho en el borde externo del recto; pedir inspiración profunda.', '<b>signo de Murphy positivo</b>: la paciente <b>interrumpe bruscamente la inspiración</b> por dolor cuando la vesícula inflamada contacta con los dedos.', 'inspire… ¡para!'),
        'man:mcb:mcburney': M('presión en McBurney.', 'indoloro.', '↓ presión'),
        'man:mcb:blumberg': M('descompresión en la FID.', 'Blumberg negativo.', '↓ … ↑'),
        'man:lif:rovsing': M('presión en la FII.', 'Rovsing negativo.', '↓ presión FII'),
        'man:lif:blumberg': M('descompresión en la FII.', 'Blumberg negativo.', '↓ … ↑'),
        'man:flD:onda': M('golpe en el flanco con la mano del ayudante en la línea media.', 'onda ascítica negativa (la mano del ayudante bloquea la onda de la pared, importante en la obesa).', 'sin onda'),
        'man:flI:onda': M('golpe en el flanco izquierdo.', 'onda ascítica negativa.', 'sin onda'),
        'man:muslo:psoas': M('elevación del muslo contra resistencia.', 'psoas negativo.', '↑ elevar'),
        'man:muslo:obt': M('rotación interna de la cadera.', 'obturador negativo.', '⟲ rotación'),
        'man:cvd:giordano': M('puñopercusión lumbar derecha.', '<b>negativa</b>: el dolor se irradia a la escápula, no a la fosa lumbar (no es cólico renal).', 'golpe suave'),
        'man:cvi:giordano': M('puñopercusión lumbar izquierda.', 'negativa.', 'golpe suave')
      })
    },

    /* 6 · hepatomegalia congestiva por insuficiencia cardíaca derecha */
    {
      id: 'pa6', age: 70, sex: 'M', diag: 'Hepatomegalia congestiva (insuficiencia cardíaca derecha)',
      complaint: 'Varón de 70 años con EPOC grave y cor pulmonale. Desde hace 3 semanas, hinchazón de piernas, pesadez en el hipocondrio derecho que aumenta al caminar, disnea y nicturia. Ha subido 5 kg.',
      vitals: 'FC 92 · PA 118/76 · FR 22 · T 36,5 °C · SpO₂ 91 % (aire ambiente)',
      v: { hr: 92, sbp: 118, dbp: 76, rr: 22, temp: 36.5, spo2: 91, height: 1.70, weight: 80, waist: 102 },
      findings: [
        'Ingurgitación yugular a 45°, <b>reflujo hepatoyugular positivo</b> y edema con fóvea de miembros inferiores: síndrome de insuficiencia cardíaca derecha.',
        '<b>Hepatomegalia</b> (hepatimetría 16 cm; borde 5 cm bajo el reborde): borde <b>romo, liso, blando-elástico y doloroso</b> a la palpación (distensión de la cápsula de Glisson).',
        'Sin ascitis significativa (matidez desplazable y onda negativas), sin esplenomegalia ni estigmas de hepatopatía crónica.',
        'Abdomen levemente globoso, sin signos peritoneales; RHA normales.'
      ],
      teaching: [
        'La hepatomegalia congestiva es dolorosa y de borde romo y liso; el hígado cirrótico es duro, irregular e indoloro, y el tumoral, pétreo y nodular.',
        'La hepatimetría se mide en la LMC desde el límite superior (5.º EIC) hasta el borde inferior palpado o percutido; un hígado descendido por enfisema no es hepatomegalia: mide siempre la altura.',
        'El reflujo hepatoyugular (compresión del hipocondrio derecho 10–15 s con el paciente a 45°) eleva la columna yugular de forma sostenida cuando hay falla derecha.',
        'En la insuficiencia tricuspídea grave el hígado late con la sístole (pulso hepático): aquí no se observa.'
      ],
      overlay: forAll(OV_ICC),
      path: Object.assign({
        'insp:forma:ojo': TH(TEC.ojo, 'abdomen <b>levemente globoso</b>, simétrico, con discreto abombamiento del hipocondrio derecho; perímetro 102 cm. <b>Edema con fóvea</b> en ambos miembros inferiores hasta las rodillas. Ingurgitación yugular visible a 45°.'),
        'insp:forma:luz': TH(TEC.luz, 'se insinúa el relieve del borde hepático bajo el reborde costal derecho durante la inspiración; sin ondas peristálticas.'),
        'insp:piel:ojo': TH(TEC.ojo, 'piel con <b>discreto tinte subictérico</b> (congestión hepática), cianosis leve de labios y lechos ungueales; sin arañas vasculares ni circulación colateral; sin cicatrices.'),
        'insp:piel:luz': TH(TEC.luz, 'sin lesiones; piel brillante y tensa en los miembros inferiores por el edema.'),
        'insp:circ:ojo': TH(TEC.ojo, 'sin circulación colateral abdominal; venas yugulares ingurgitadas.'),
        'insp:circ:luz': TH(TEC.luz, 'sin venas dilatadas en la pared abdominal.'),
        'insp:epi:ojo': TH(TEC.ojo, '<b>latido epigástrico</b> amplio, de ventrículo derecho dilatado (signo de Harzer), que se palpa bajo el xifoides; sin peristaltismo.'),
        'insp:epi:luz': TH(TEC.luz, 'latido epigástrico visible, sincrónico con el pulso; sin ondas peristálticas.'),
        'insp:omb:ojo': TH(TEC.ojo, 'ombligo normal.'),
        'insp:ing:ojo': TH(TEC.ojo, 'región inguinal derecha sin hernias; edema de miembros inferiores.'),
        'insp:ing2:ojo': TH(TEC.ojo, 'región inguinal izquierda sin hernias; edema bilateral simétrico.')
      },
      quads(TEC.steth, 'RHA normales (≈ 12/min), de tono e intensidad medios', 12, 0.9, '≈ 12 ruidos/min'),
      soplos(TEC.steth, 'sin soplos arteriales.'),
      {
        'perc:hd:perc': P(TEC.perc, '<b>matidez hepática aumentada</b>: la nota mate continúa <b>5 cm por debajo del reborde costal</b>; percusión molesta.', 'dull'),
        'perc:fd:perc': P(TEC.perc, '<b>matidez</b> en la parte alta del flanco derecho (hígado descendido); timpanismo más abajo. Sin matidez declive (no hay ascitis significativa).', 'dull'),
        'perc:ep:perc': P(TEC.perc, '<b>submatidez</b> en el epigastrio por el lóbulo izquierdo aumentado; timpanismo gástrico más a la izquierda.', 'dull'),
        'perc:lmc:perc': (c, ctx) => {
          const y = ctx.point.y;
          if (y < 48) return { html: TH(TEC.perc, 'sonoridad pulmonar (hipersonora por el enfisema).'), run: () => Sound.percuss('resonant') };
          if (y < 62) return { html: TH(TEC.perc, 'límite superior de la matidez hepática en el 5.º–6.º EIC (algo descendido por el enfisema).'), run: () => Sound.percuss('dull') };
          if (y < 200) return { html: TH(TEC.perc, '<b>matidez hepática</b> que sobrepasa el reborde costal. <b>Hepatimetría ≈ 16 cm</b> (normal 6–12): hepatomegalia verdadera, no solo descenso por el enfisema.'), run: () => Sound.percuss('dull') };
          return { html: TH(TEC.perc, 'límite inferior de la matidez ≈ 5 cm bajo el reborde; por debajo, timpanismo.'), run: () => Sound.percuss('hyper') };
        },
        'perc:traube:perc': P(TEC.perc, 'espacio de Traube timpánico (sin esplenomegalia).', 'hyper'),
        'perc:castell:perc': P(TEC.perc, 'matidez esplénica normal; Castell negativo.', 'dull'),
        'perc:fd:desp': P('percusión en decúbito dorsal y lateral.', '<b>matidez desplazable negativa</b>: la matidez alta del flanco derecho corresponde al hígado y no cambia de posición; el flanco izquierdo es timpánico.', 'dull'),
        'perc:fi:desp': P('percusión en ambos decúbitos.', 'matidez desplazable negativa.', 'hyper'),
        'perc:fd:onda': M('golpe en el flanco con la mano del ayudante en la línea media.', 'onda ascítica negativa.', 'sin onda'),
        'perc:fi:onda': M('golpe en el flanco izquierdo.', 'onda ascítica negativa.', 'sin onda'),
        'palp:hd:sup': F(TEC.sup, 'pared blanda; <b>dolor sordo</b> a la presión en el hipocondrio derecho, sin defensa.'),
        'palp:hd:prof': D(TEC.prof, 'se palpa una <b>masa lisa que sobrepasa el reborde</b>: hígado aumentado y doloroso; sin defensa.'),
        'palp:ep:prof': D(TEC.prof, 'lóbulo izquierdo hepático palpable en el epigastrio, liso y sensible; <b>latido epigástrico</b> de ventrículo derecho (Harzer); aorta normal.'),
        'palp:fd:prof': D(TEC.prof, 'borde hepático palpable en la parte alta del flanco derecho; colon normal.'),
        'palp:hig:prof': D('mano en cuchara / enganche de Mathieu en inspiración profunda; después, compresión sostenida 10–15 s observando las yugulares.', '<b>hepatomegalia</b>: borde hepático <b>5 cm bajo el reborde</b> en la LMC, <b>romo, liso, de consistencia blanda-elástica y doloroso</b>; superficie lisa; se mueve con la respiración; sin latido hepático. <b>Reflujo hepatoyugular positivo</b>: la compresión del hipocondrio eleva de forma sostenida la columna yugular (> 3 cm, más de 10 s).'),
        'palp:ves:prof': D(TEC.prof, 'vesícula no palpable; molestia por el hígado congestivo; Murphy negativo.'),
        'palp:baz:prof': D('bimanual y maniobra de Middleton.', 'bazo no palpable; Traube timpánico.'),
        'palp:rd:prof': D('maniobra de Guyon.', 'riñón derecho no palpable; la masa del hipocondrio es el hígado (sigue al reborde, desciende con la inspiración, sin peloteo).'),
        'palp:ri:prof': D('maniobra de Guyon.', 'riñón izquierdo no palpable.'),
        'palp:ao:prof': D(TEC.prof, 'aorta de calibre normal (≈ 2,4 cm), con latido y expansión lateral; sin aneurisma.'),
        'palp:vej:sup': F(TEC.sup, 'sin globo vesical.'),
        'palp:vej:prof': D(TEC.prof, 'vejiga no palpable; hipogastrio indoloro.'),
        'man:abd:blumberg': M('presión lenta y descompresión brusca.', 'Blumberg negativo (dolor sordo continuo por distensión capsular, no peritoneal).', '↓ … ↑'),
        'man:mur:murphy': M('presión en el punto cístico en inspiración profunda.', 'Murphy <b>negativo</b>: el hígado doloroso molesta, pero el paciente no interrumpe la inspiración; sin vesícula palpable.', 'inspire …'),
        'man:mcb:mcburney': M('presión en McBurney.', 'indoloro.', '↓ presión'),
        'man:mcb:blumberg': M('descompresión en la FID.', 'Blumberg negativo.', '↓ … ↑'),
        'man:lif:rovsing': M('presión en la FII.', 'Rovsing negativo.', '↓ presión FII'),
        'man:lif:blumberg': M('descompresión en la FII.', 'Blumberg negativo.', '↓ … ↑'),
        'man:flD:onda': M('golpe en el flanco con la mano del ayudante en la línea media.', 'onda ascítica negativa.', 'sin onda'),
        'man:flI:onda': M('golpe en el flanco izquierdo.', 'onda ascítica negativa.', 'sin onda'),
        'man:muslo:psoas': M('elevación del muslo contra resistencia.', 'psoas negativo.', '↑ elevar'),
        'man:muslo:obt': M('rotación interna de la cadera.', 'obturador negativo.', '⟲ rotación'),
        'man:cvd:giordano': M('puñopercusión lumbar derecha.', 'negativa.', 'golpe suave'),
        'man:cvi:giordano': M('puñopercusión lumbar izquierda.', 'negativa.', 'golpe suave')
      })
    },

    /* 7 · esplenomegalia */
    {
      id: 'pa7', age: 34, sex: 'F', diag: 'Esplenomegalia (síndrome linfoproliferativo)',
      complaint: 'Mujer de 34 años con astenia, sudoración nocturna, pérdida de 6 kg en 3 meses y sensación de pesadez y saciedad precoz en el hipocondrio izquierdo. Nota «bultos» en el cuello.',
      vitals: 'FC 84 · PA 112/70 · FR 16 · T 37,6 °C · SpO₂ 98 %',
      v: { hr: 84, sbp: 112, dbp: 70, rr: 16, temp: 37.6, spo2: 98, height: 1.66, weight: 54, waist: 74 },
      findings: [
        'Síntomas B (fiebre vespertina, sudoración nocturna, adelgazamiento) con adenopatías cervicales e inguinales firmes e indoloras.',
        '<b>Espacio de Traube mate</b> y matidez esplénica que sobrepasa la línea axilar anterior (signo de Castell positivo).',
        '<b>Bazo palpable 8 cm bajo el reborde costal izquierdo</b>: borde anterior con <b>escotadura</b>, consistencia firme, liso, indoloro, móvil con la respiración y sin peloteo lumbar.',
        'Hígado de tamaño normal; sin ascitis ni estigmas de hepatopatía (no es hipertensión portal).'
      ],
      teaching: [
        'El bazo solo se palpa cuando ha aumentado 2–3 veces: primero se percute Traube, después se palpa bimanual, con Middleton y en decúbito lateral derecho (Schuster).',
        'Un bazo se diferencia de un riñón izquierdo por la escotadura del borde anterior, porque sigue al reborde y desciende en la inspiración, porque no pelotea y porque no se puede introducir la mano entre la masa y el reborde.',
        'Esplenomegalia + adenopatías generalizadas orienta a síndrome linfoproliferativo o infeccioso (mononucleosis); esplenomegalia + estigmas de hepatopatía, a hipertensión portal.',
        'El bazo grande es frágil: palpa con suavidad y evita las maniobras bruscas.'
      ],
      overlay: forAll(OV_ESPLENO),
      path: Object.assign({
        'insp:forma:ojo': TH(TEC.ojo, 'abdomen plano en general, con <b>abultamiento del hipocondrio y el flanco izquierdos</b> que desciende con la inspiración; asimetría evidente desde los pies de la cama. Paciente delgada (IMC 19,6).'),
        'insp:forma:luz': TH(TEC.luz, 'relieve de una masa que se desplaza hacia abajo y adentro con la inspiración, bajo el reborde costal izquierdo; sin ondas peristálticas.'),
        'insp:piel:ojo': TH(TEC.ojo, 'piel pálida (anemia), sin ictericia ni arañas vasculares; sin cicatrices. Pequeñas equimosis en los miembros (trombocitopenia).'),
        'insp:piel:luz': TH(TEC.luz, 'sin circulación colateral ni lesiones de la pared.'),
        'insp:circ:ojo': TH(TEC.ojo, 'sin circulación colateral (no hay hipertensión portal).'),
        'insp:epi:ojo': TH(TEC.ojo, 'latido aórtico discreto de la persona delgada; sin peristaltismo.'),
        'insp:epi:luz': TH(TEC.luz, 'latido aórtico visible, no expansivo.'),
        'insp:omb:ojo': TH(TEC.ojo, 'ombligo normal.'),
        'insp:ing:ojo': TH(TEC.ojo, 'región inguinal derecha con <b>abultamientos pequeños</b> bajo el ligamento inguinal (adenopatías).'),
        'insp:ing2:ojo': TH(TEC.ojo, 'región inguinal izquierda con adenopatías visibles en la paciente delgada.')
      },
      quads(TEC.steth, 'RHA normales (≈ 10/min)', 10, 0.9, '≈ 10 ruidos/min'),
      soplos(TEC.steth, 'sin soplos; sin roce esplénico (su presencia indicaría infarto esplénico).'),
      {
        'perc:hi:perc': P(TEC.perc, '<b>matidez en el hipocondrio izquierdo</b> que se continúa con la del espacio de Traube: bazo aumentado.', 'dull'),
        'perc:fi:perc': P(TEC.perc, '<b>matidez en la parte alta del flanco izquierdo</b> (polo inferior del bazo); timpanismo por debajo.', 'dull'),
        'perc:ep:perc': P(TEC.perc, 'timpanismo gástrico desplazado hacia la línea media.', 'hyper'),
        'perc:traube:perc': P('percusión de la semiluna de Traube (6.º cartílago, reborde costal izquierdo, línea axilar anterior) en espiración.', '<b>espacio de Traube mate</b>: la esplenomegalia ocupa la cámara gástrica.', 'dull'),
        'perc:castell:perc': P('percusión del último espacio intercostal en la línea axilar anterior izquierda, en inspiración y espiración.', '<b>signo de Castell positivo</b>: la nota es mate en inspiración; la matidez esplénica sobrepasa la línea axilar anterior y el reborde costal.', 'dull'),
        'perc:fi:desp': P('percusión del flanco en decúbito dorsal y lateral.', 'matidez desplazable negativa: la matidez alta del flanco izquierdo es fija (bazo), no se desplaza.', 'dull'),
        'perc:fd:desp': P('percusión en ambos decúbitos.', 'matidez desplazable negativa.', 'hyper'),
        'perc:fi:onda': M('golpe en el flanco con la mano del ayudante en la línea media.', 'onda ascítica negativa.', 'sin onda'),
        'perc:fd:onda': M('golpe en el flanco derecho.', 'onda ascítica negativa.', 'sin onda'),
        'palp:hi:sup': F(TEC.sup, 'pared blanda; se percibe una <b>masa firme</b> bajo el reborde izquierdo, indolora, sin defensa.'),
        'palp:hi:prof': D(TEC.prof, '<b>masa lisa y firme</b> que ocupa el hipocondrio izquierdo y desciende con la inspiración; borde con escotadura: bazo.'),
        'palp:fi:sup': F(TEC.sup, 'flanco izquierdo blando; polo inferior de la masa esplénica a nivel del ombligo.'),
        'palp:fi:prof': D(TEC.prof, '<b>polo inferior del bazo</b> palpable a la altura del ombligo, 8 cm bajo el reborde, liso e indoloro.'),
        'palp:baz:prof': D('bimanual en decúbito dorsal (mano izquierda en la fosa lumbar), maniobra de Middleton y decúbito lateral derecho (Schuster), en inspiración profunda y con suavidad.', '<b>esplenomegalia: bazo palpable 8 cm bajo el reborde costal izquierdo</b>, borde anterior <b>con escotadura</b>, consistencia <b>firme</b>, superficie lisa, <b>indoloro</b>, que desciende con la inspiración hacia la fosa ilíaca derecha, <b>sin peloteo</b>; no es posible introducir los dedos entre la masa y el reborde.'),
        'palp:ri:prof': D('maniobra de Guyon.', 'riñón izquierdo no palpable; la masa del hipocondrio no pelotea, tiene escotadura y sigue al reborde: es el bazo, no el riñón.'),
        'palp:rd:prof': D('maniobra de Guyon.', 'riñón derecho no palpable.'),
        'palp:hig:prof': D('mano en cuchara en inspiración.', 'borde hepático palpable 1 cm bajo el reborde (persona delgada): liso, romo, blando e indoloro; hepatimetría 9 cm (normal).'),
        'palp:ves:prof': D(TEC.prof, 'vesícula no palpable; Murphy negativo.'),
        'palp:gl:sup': F('palpación de la cadena inguinal con los pulpejos.', '<b>adenopatías inguinales derechas</b> múltiples, de 1,5–2,5 cm, <b>firmes, elásticas, móviles e indoloras</b>, sin signos inflamatorios.'),
        'palp:gl:prof': D(TEC.prof, 'adenopatías firmes, móviles e indoloras; sin adherencia a planos profundos.'),
        'palp:gl2:sup': F('palpación de la cadena inguinal izquierda.', '<b>adenopatías inguinales izquierdas</b> de características similares (firmes, indoloras, móviles).'),
        'palp:gl2:prof': D(TEC.prof, 'adenopatías firmes, móviles e indoloras.'),
        'man:abd:blumberg': M('presión lenta y descompresión brusca.', 'Blumberg negativo.', '↓ … ↑'),
        'man:mur:murphy': M('presión en el punto cístico.', 'Murphy negativo.', 'inspire …'),
        'man:mcb:mcburney': M('presión en McBurney.', 'indoloro.', '↓ presión'),
        'man:mcb:blumberg': M('descompresión en la FID.', 'Blumberg negativo.', '↓ … ↑'),
        'man:lif:rovsing': M('presión en la FII.', 'Rovsing negativo; se palpa el polo inferior del bazo por encima.', '↓ presión FII'),
        'man:lif:blumberg': M('descompresión en la FII.', 'Blumberg negativo.', '↓ … ↑'),
        'man:flD:onda': M('golpe en el flanco con la mano del ayudante en la línea media.', 'onda ascítica negativa.', 'sin onda'),
        'man:flI:onda': M('golpe en el flanco izquierdo.', 'onda ascítica negativa (la masa esplénica es sólida).', 'sin onda'),
        'man:muslo:psoas': M('elevación del muslo contra resistencia.', 'psoas negativo.', '↑ elevar'),
        'man:muslo:obt': M('rotación interna de la cadera.', 'obturador negativo.', '⟲ rotación'),
        'man:cvd:giordano': M('puñopercusión lumbar derecha.', 'negativa.', 'golpe suave'),
        'man:cvi:giordano': M('puñopercusión lumbar izquierda.', 'negativa: el bazo grande no duele a la puñopercusión (lo haría un riñón).', 'golpe suave')
      })
    },

    /* 8 · retención aguda de orina: globo vesical */
    {
      id: 'pa8', age: 81, sex: 'M', diag: 'Retención aguda de orina (globo vesical)',
      complaint: 'Varón de 81 años con hiperplasia prostática y chorro débil desde hace años. Desde hace 14 h no puede orinar, pese a un intenso deseo miccional, y tiene dolor creciente en el hipogastrio. Tomó un anticatarral con antihistamínico anoche.',
      vitals: 'FC 96 · PA 150/88 · FR 18 · T 36,7 °C · SpO₂ 96 %',
      v: { hr: 96, sbp: 150, dbp: 88, rr: 18, temp: 36.7, spo2: 96, height: 1.68, weight: 74, waist: 98 },
      findings: [
        'Anuria dolorosa con deseo miccional (retención, no anuria secretora) en un paciente con prostatismo, desencadenada por un anticolinérgico.',
        '<b>Tumoración hipogástrica</b> hemisférica, en la línea media, de la sínfisis hasta el ombligo: <b>mate a la percusión, de límite superior convexo</b>, lisa, renitente y <b>dolorosa</b>, que despierta deseo miccional.',
        'El resto del abdomen es normal; puñopercusión lumbar negativa (sin repercusión renal aguda aparente).',
        'El tacto rectal muestra una próstata aumentada, lisa y de consistencia elástica (hiperplasia). El sondaje vesical evacuador confirma el diagnóstico.'
      ],
      teaching: [
        'Globo vesical: masa hipogástrica mediana, mate, de límite superior convexo, que desaparece tras el sondaje; se diferencia de la ascitis (límite cóncavo, matidez desplazable) y del útero gestante o de un tumor pélvico.',
        'La presión sobre la masa provoca dolor y deseo miccional: es un signo casi patognomónico.',
        'Pregunta siempre por fármacos anticolinérgicos, opioides y por síntomas prostáticos; completa con tacto rectal.',
        'En el anciano la retención puede manifestarse como confusión o incontinencia por rebosamiento (micción por goteo con vejiga llena).'
      ],
      overlay: forAll(OV_GLOBO),
      path: Object.assign({
        'insp:forma:ojo': TH(TEC.ojo, 'abdomen plano en su mitad superior con <b>abultamiento hipogástrico hemisférico</b>, en la línea media, que llega hasta el ombligo. Paciente inquieto, con deseo miccional.'),
        'insp:forma:luz': TH(TEC.luz, 'relieve suprapúbico liso, de bordes bien definidos, sin ondas peristálticas.'),
        'insp:piel:ojo': TH(TEC.ojo, 'piel de la persona mayor, fina, con lentigos; sin cicatrices (no hay cirugía previa) ni ictericia.'),
        'insp:piel:luz': TH(TEC.luz, 'sin lesiones; piel tensa sobre el abultamiento hipogástrico.'),
        'insp:circ:ojo': TH(TEC.ojo, 'sin circulación colateral.'),
        'insp:epi:ojo': TH(TEC.ojo, 'epigastrio plano; sin latidos ni peristaltismo visibles.'),
        'insp:epi:luz': TH(TEC.luz, 'sin latidos visibles.'),
        'insp:omb:ojo': TH(TEC.ojo, 'ombligo normal, en el límite superior del abultamiento.'),
        'insp:ing:ojo': TH(TEC.ojo, 'región inguinal derecha sin hernias.'),
        'insp:ing2:ojo': TH(TEC.ojo, 'región inguinal izquierda sin hernias.')
      },
      quads(TEC.steth, 'RHA normales (≈ 10/min)', 10, 0.9, '≈ 10 ruidos/min'),
      soplos(TEC.steth, 'sin soplos.'),
      {
        'perc:hip:perc': P('percusión desde el ombligo hacia el pubis.', '<b>matidez suprapúbica</b> que asciende <b>hasta el ombligo</b>, de <b>límite superior convexo</b> hacia arriba; dolorosa y acompañada de deseo miccional.', 'dull'),
        'perc:vej:perc': P(TEC.perc, '<b>matidez franca</b> sobre la región suprapúbica (vejiga con > 500 mL); el límite superior convexo la diferencia de la ascitis (cóncavo).', 'dull'),
        'perc:mes:perc': P(TEC.perc, 'timpanismo por encima del ombligo; límite neto con la matidez vesical.', 'hyper'),
        'perc:fid:perc': P(TEC.perc, 'timpanismo lateral a la masa (la matidez es central, en la línea media).', 'hyper'),
        'perc:fii:perc': P(TEC.perc, 'timpanismo lateral a la masa.', 'hyper'),
        'perc:fd:desp': P('percusión en decúbito dorsal y lateral.', 'matidez desplazable negativa: la matidez es central y <b>no se desplaza</b> con los decúbitos (vejiga, no líquido libre).', 'hyper'),
        'perc:fi:desp': P('percusión en ambos decúbitos.', 'matidez desplazable negativa.', 'hyper'),
        'perc:fd:onda': M('golpe en el flanco con la mano del ayudante en la línea media.', 'onda ascítica negativa.', 'sin onda'),
        'perc:fi:onda': M('golpe en el flanco izquierdo.', 'onda ascítica negativa.', 'sin onda'),
        'palp:hip:sup': F(TEC.sup, '<b>masa hipogástrica</b> lisa, tensa, renitente, de límite superior convexo; <b>dolorosa</b> y que provoca deseo miccional al presionarla; sin defensa.'),
        'palp:hip:prof': D(TEC.prof, '<b>globo vesical</b>: masa redondeada, lisa, mate, que no se moviliza con la respiración; dolor y deseo imperioso de orinar al comprimirla.'),
        'palp:fid:sup': F(TEC.sup, 'fosa ilíaca derecha blanda, indolora; borde lateral derecho de la masa vesical.'),
        'palp:fid:prof': D(TEC.prof, 'sin masas propias; se delimita el borde derecho del globo vesical.'),
        'palp:fii:sup': F(TEC.sup, 'fosa ilíaca izquierda blanda, indolora.'),
        'palp:fii:prof': D(TEC.prof, 'sigmoides normal; borde izquierdo del globo vesical.'),
        'palp:mes:sup': F(TEC.sup, 'región umbilical blanda; el polo superior de la masa llega al ombligo.'),
        'palp:mes:prof': D(TEC.prof, 'latido aórtico normal; polo superior convexo del globo vesical.'),
        'palp:vej:sup': F(TEC.sup, '<b>globo vesical</b>: masa suprapúbica lisa, renitente, dolorosa, con deseo miccional; límite superior a la altura del ombligo.'),
        'palp:vej:prof': D(TEC.prof, 'masa mate, renitente, dolorosa, que no se puede reducir; desaparecerá tras el sondaje evacuador.'),
        'palp:ingd:vals': M(TEC.vals, 'sin hernia inguinal ni crural derecha.', 'tos'),
        'palp:ingi:vals': M(TEC.vals, 'sin hernia inguinal ni crural izquierda.', 'tos'),
        'palp:rd:prof': D('maniobra de Guyon.', 'riñón derecho no palpable e indoloro.'),
        'palp:ri:prof': D('maniobra de Guyon.', 'riñón izquierdo no palpable.'),
        'palp:ao:prof': D(TEC.prof, 'aorta de ≈ 2,6 cm, con expansión lateral; sin aneurisma.'),
        'man:abd:blumberg': M('presión lenta y descompresión brusca.', 'Blumberg negativo; la presión sobre el hipogastrio duele por la distensión vesical, pero no hay dolor a la descompresión.', '↓ … ↑'),
        'man:mur:murphy': M('presión en el punto cístico.', 'Murphy negativo.', 'inspire …'),
        'man:mcb:mcburney': M('presión en McBurney.', 'indoloro (lateral a la masa).', '↓ presión'),
        'man:mcb:blumberg': M('descompresión en la FID.', 'Blumberg negativo.', '↓ … ↑'),
        'man:lif:rovsing': M('presión en la FII.', 'Rovsing negativo.', '↓ presión FII'),
        'man:lif:blumberg': M('descompresión en la FII.', 'Blumberg negativo.', '↓ … ↑'),
        'man:flD:onda': M('golpe en el flanco con la mano del ayudante en la línea media.', 'onda ascítica negativa.', 'sin onda'),
        'man:flI:onda': M('golpe en el flanco izquierdo.', 'onda ascítica negativa.', 'sin onda'),
        'man:muslo:psoas': M('elevación del muslo contra resistencia.', 'psoas negativo.', '↑ elevar'),
        'man:muslo:obt': M('rotación interna de la cadera.', 'obturador negativo.', '⟲ rotación'),
        'man:cvd:giordano': M('puñopercusión lumbar derecha sobre la mano apoyada.', '<b>negativa</b>: sin dolor (el dolor es hipogástrico, por la vejiga, no renal).', 'golpe suave'),
        'man:cvi:giordano': M('puñopercusión lumbar izquierda.', 'negativa.', 'golpe suave')
      })
    }
  ];

  /* Expansión de las plantillas nine('palp', …) que devuelven { sup, prof } por región → claves 'palp:id:sup' / 'palp:id:prof'.
     También se eliminan las entradas vacías. */
  PACIENTES.forEach(p => {
    const out = {};
    Object.keys(p.path).forEach(k => {
      const v = p.path[k];
      if (v === undefined || v === null) return;
      if (v && typeof v === 'object' && !('html' in v) && (v.sup || v.prof)) {
        if (v.sup) out[`${k}:sup`] = v.sup;
        if (v.prof) out[`${k}:prof`] = v.prof;
        return;
      }
      if (v && typeof v === 'object' && 'html' in v && v.html === '' && !v.run) return;
      out[k] = v;
    });
    p.path = out;
    delete p._expand;
  });

  /* ---------- CUESTIONARIO (6 preguntas; 4 propias del paciente + 2 generales) ---------- */
  function mk(k, q, correct, wrongs, why) {
    const opts = wrongs.slice();
    const pos = k % (opts.length + 1);
    opts.splice(pos, 0, correct);
    return { q, options: opts, a: pos, why };
  }
  const QP = {
    pa1: k => [
      mk(k, 'Signo percutorio que confirma líquido libre en este paciente', 'Matidez desplazable (cambia con el decúbito)', ['Timpanismo en los flancos', 'Matidez hepática aumentada', 'Espacio de Traube timpánico'], 'El líquido ocupa las zonas declives: la matidez de los flancos se desplaza al girar al paciente.'),
      mk(k + 1, 'El sentido del flujo en la circulación colateral periumbilical de este paciente es', 'Centrífugo desde el ombligo (patrón portocava)', ['Hacia el ombligo desde la periferia', 'Siempre hacia arriba', 'Siempre hacia abajo'], 'En la hipertensión portal la sangre sale de la vena umbilical recanalizada hacia las venas de la pared.'),
      mk(k + 2, 'Características del borde hepático en la cirrosis', 'Duro, irregular (nodular), fino e indoloro', ['Romo, liso, blando y doloroso', 'Pétreo, liso y pulsátil', 'No se puede palpar nunca'], 'El hígado congestivo es romo, liso y doloroso; el cirrótico, duro y nodular; el tumoral, pétreo y nodular.'),
      mk(k + 3, '¿Qué indica el bazo palpable 3 cm bajo el reborde en este paciente?', 'Hipertensión portal', ['Peritonitis bacteriana espontánea', 'Hernia umbilical', 'Insuficiencia cardíaca derecha'], 'La esplenomegalia congestiva acompaña a la hipertensión portal de la cirrosis.')
    ],
    pa2: k => [
      mk(k, 'El dolor a la descompresión en la fosa ilíaca derecha (Blumberg) indica', 'Irritación del peritoneo parietal', ['Obstrucción intestinal', 'Dolor visceral referido', 'Hernia inguinal'], 'El Blumberg traduce inflamación del peritoneo parietal bajo la zona explorada.'),
      mk(k + 1, 'Signo del psoas positivo: orienta a', 'Apéndice retrocecal', ['Apéndice pélvico', 'Colecistitis', 'Cólico renal'], 'La elevación del muslo contra resistencia contrae el psoas, que roza el apéndice retrocecal.'),
      mk(k + 2, 'El signo de Rovsing consiste en', 'Dolor en la FID al presionar la fosa ilíaca izquierda', ['Dolor en la FII al presionar la FID', 'Dolor al toser', 'Dolor al rotar la cadera'], 'La presión en la FII desplaza el gas del colon hacia el ciego y distiende la zona inflamada.'),
      mk(k + 3, 'En este paciente los RHA están', 'Disminuidos (íleo reflejo)', ['Aumentados y metálicos', 'Ausentes tras 3 min', 'Normales con borborigmos'], 'La inflamación peritoneal localizada reduce el peristaltismo; el silencio total sugiere peritonitis generalizada.')
    ],
    pa3: k => [
      mk(k, '«Abdomen en tabla» significa', 'Contractura muscular involuntaria generalizada', ['Distensión gaseosa', 'Defensa voluntaria por miedo', 'Abdomen plano normal'], 'La rigidez no cede al distraer al paciente ni con las rodillas flexionadas: es un reflejo por irritación peritoneal.'),
      mk(k + 1, 'La desaparición de la matidez hepática (signo de Jobert) sugiere', 'Neumoperitoneo por perforación de víscera hueca', ['Ascitis', 'Hepatomegalia', 'Derrame pleural derecho'], 'El aire libre se interpone entre el hígado y la pared y la nota se vuelve timpánica.'),
      mk(k + 2, 'Para afirmar silencio auscultatorio hay que escuchar', '2–3 minutos (hasta 5 según la fuente)', ['10 segundos', '30 segundos', 'No hace falta auscultar'], 'Los RHA se dan por ausentes solo tras varios minutos de auscultación.'),
      mk(k + 3, 'El signo de Gueneau de Mussy es', 'Dolor a la descompresión en cualquier punto del abdomen', ['Dolor a la descompresión solo en la FID', 'Dolor al elevar el muslo', 'Dolor en el punto cístico'], 'Blumberg generalizado: traduce peritonitis difusa.')
    ],
    pa4: k => [
      mk(k, 'Los RHA aumentados y de timbre metálico orientan a', 'Obstrucción intestinal mecánica', ['Íleo paralítico', 'Peritonitis', 'Ascitis'], 'Las asas luchan contra el obstáculo; en el íleo paralítico y en la obstrucción evolucionada hay silencio.'),
      mk(k + 1, 'En toda obstrucción intestinal hay que explorar', 'Los orificios herniarios y las cicatrices', ['Solo el espacio de Traube', 'El signo de Murphy', 'La onda ascítica'], 'Hernias y bridas posquirúrgicas son las causas más frecuentes de obstrucción del intestino delgado.'),
      mk(k + 2, 'La aparición de contractura y Blumberg en este paciente indicaría', 'Sufrimiento de asa (estrangulación)', ['Mejoría espontánea', 'Íleo biliar', 'Ascitis'], 'El sufrimiento vascular del asa produce irritación peritoneal: urgencia quirúrgica.'),
      mk(k + 3, 'Las ondas peristálticas visibles se buscan con', 'Luz tangencial, observando desde el lateral', ['Percusión dígito-digital', 'Palpación profunda', 'Auscultación con campana'], 'La luz rasante resalta los relieves de las asas distendidas que se contraen.')
    ],
    pa5: k => [
      mk(k, 'Signo de Murphy positivo', 'Interrupción de la inspiración por dolor al presionar el punto cístico', ['Dolor a la descompresión en la FID', 'Dolor al elevar el muslo', 'Matidez en Traube'], 'La vesícula inflamada desciende con la inspiración y choca con los dedos del examinador.'),
      mk(k + 1, 'Localización del punto cístico', 'Unión del reborde costal derecho con el borde externo del recto', ['Unión del tercio externo con los dos tercios internos de la línea EIAS-ombligo', 'Ángulo costovertebral derecho', 'Línea axilar media izquierda'], 'El punto de McBurney es el apendicular; el ángulo costovertebral es el renal.'),
      mk(k + 2, 'Vesícula palpable, indolora, con ictericia progresiva (Courvoisier-Terrier) sugiere', 'Obstrucción neoplásica del colédoco', ['Colecistitis aguda', 'Cólico biliar simple', 'Hepatitis viral'], 'En la colecistitis la vesícula es dolorosa y hay fiebre; la vesícula indolora con ictericia orienta a tumor periampular.'),
      mk(k + 3, 'En esta paciente la puñopercusión lumbar derecha es', 'Negativa: el dolor irradia a la escápula, no a la fosa lumbar', ['Positiva por litiasis renal', 'Positiva por la fiebre', 'No se puede realizar'], 'La irradiación escapular es típica del dolor biliar; el dolor renal irradia hacia el flanco y la ingle.')
    ],
    pa6: k => [
      mk(k, 'Características del hígado congestivo', 'Borde romo, liso, blando-elástico y doloroso', ['Duro, nodular e indoloro', 'Pétreo y nodular', 'No palpable'], 'La distensión aguda de la cápsula de Glisson explica el dolor; el borde es liso porque el parénquima está congestivo, no fibroso.'),
      mk(k + 1, 'Hepatimetría de este paciente y su interpretación', '16 cm: hepatomegalia verdadera', ['11 cm: normal', '16 cm: hígado descendido por el enfisema, tamaño normal', '6 cm: hígado pequeño'], 'Un hígado solo descendido conserva la altura normal (6–12 cm); aquí la altura está aumentada.'),
      mk(k + 2, 'Reflujo hepatoyugular positivo', 'Elevación sostenida de la columna yugular al comprimir el hipocondrio derecho', ['Descenso de la yugular al comprimir el abdomen', 'Latido del hígado con cada sístole', 'Dolor a la descompresión'], 'Con el paciente a 45°, la compresión 10–15 s eleva la yugular > 3 cm de forma sostenida si el ventrículo derecho no maneja el retorno venoso.'),
      mk(k + 3, 'En este paciente la matidez desplazable es', 'Negativa: la matidez del flanco derecho es hepática y fija', ['Positiva en ambos flancos', 'Positiva solo a la izquierda', 'No se puede explorar'], 'Sin ascitis significativa, la matidez alta del flanco derecho corresponde al hígado aumentado.')
    ],
    pa7: k => [
      mk(k, 'Primer paso para detectar la esplenomegalia', 'Percutir el espacio de Traube (mate si el bazo está aumentado)', ['Palpar la fosa ilíaca izquierda', 'Auscultar el hipocondrio izquierdo', 'Puñopercusión lumbar'], 'La matidez de Traube y el signo de Castell preceden a la palpación; el bazo solo se palpa si ha crecido 2–3 veces.'),
      mk(k + 1, 'Dato que diferencia el bazo del riñón izquierdo', 'Escotadura del borde anterior y ausencia de peloteo', ['Peloteo lumbar positivo', 'Dolor a la puñopercusión', 'Se puede meter la mano entre la masa y el reborde'], 'El bazo sigue al reborde, desciende en inspiración, tiene escotadura y no pelotea.'),
      mk(k + 2, 'Esplenomegalia con adenopatías generalizadas y síntomas B orienta a', 'Síndrome linfoproliferativo', ['Hipertensión portal', 'Colecistitis aguda', 'Retención urinaria'], 'Con estigmas de hepatopatía y ascitis se pensaría en hipertensión portal.'),
      mk(k + 3, 'La maniobra de Middleton consiste en', 'Enganchar el reborde izquierdo desde la cabecera, con el puño del paciente bajo el hemitórax', ['Golpear el ángulo costovertebral', 'Presionar la fosa ilíaca izquierda', 'Elevar el muslo contra resistencia'], 'El examinador se coloca a la izquierda, mirando a los pies, y engancha el borde del bazo en la inspiración.')
    ],
    pa8: k => [
      mk(k, 'Límite superior de la matidez hipogástrica en el globo vesical', 'Convexo hacia arriba', ['Cóncavo hacia arriba', 'Horizontal y desplazable', 'No hay matidez'], 'La vejiga es una esfera que crece desde la pelvis; la ascitis da un límite cóncavo porque el líquido rodea las asas.'),
      mk(k + 1, 'Signo casi patognomónico del globo vesical', 'La presión sobre la masa provoca deseo miccional', ['Dolor a la descompresión', 'Onda ascítica positiva', 'Soplo sobre la masa'], 'La compresión de la vejiga distendida desencadena el deseo de orinar y dolor.'),
      mk(k + 2, 'Para diferenciar la matidez vesical de la ascitis se usa', 'Matidez desplazable (negativa en el globo vesical)', ['Signo de Murphy', 'Signo del psoas', 'Signo de Castell'], 'La matidez de la vejiga es central y fija; la del líquido libre se desplaza con el decúbito.'),
      mk(k + 3, 'Factor desencadenante probable en este paciente', 'Fármaco anticolinérgico (antihistamínico)', ['Comida grasa', 'Consumo de alcohol', 'Esfuerzo físico'], 'Anticolinérgicos, opioides y alfaadrenérgicos precipitan la retención en el prostático.')
    ]
  };
  const GEN = k => [
    mk(k + 2, 'Orden correcto de la exploración del abdomen', 'Inspección, auscultación, percusión y palpación', ['Inspección, palpación, percusión y auscultación', 'Palpación, auscultación, percusión e inspección', 'Auscultación, inspección, palpación y percusión'], 'Se ausculta antes de percutir y palpar porque la manipulación modifica los RHA.'),
    mk(k + 3, 'Frecuencia normal de los ruidos hidroaéreos', '5–30 por minuto', ['1–2 por minuto', '40–60 por minuto', 'Ausentes en reposo'], 'Por debajo o ausentes: íleo; aumentados y metálicos: obstrucción mecánica.')
  ];
  const quiz = c => {
    const k = Math.max(0, PACIENTES.findIndex(p => p.id === c.id));
    const f = QP[c.id];
    return (f ? f(k) : []).concat(GEN(k));
  };

  NormalEngine.build({
    base: 'abdomen', id: 'pat-abdomen', title: 'Abdomen: síndromes y hallazgos patológicos', icon: '🫃', group: 'Exploración patológica',
    hideDx: false, people: PACIENTES,
    desc: 'Ocho pacientes con síndromes abdominales (ascitis por cirrosis, apendicitis, peritonitis, obstrucción intestinal, colecistitis, hepatomegalia congestiva, esplenomegalia y globo vesical) para explorar y diagnosticar.',
    bullets: ['Matidez desplazable, onda ascítica y circulación colateral', 'Murphy, McBurney, Blumberg, Rovsing y psoas positivos', 'Silencio auscultatorio, RHA metálicos, Traube mate y globo vesical'],
    refs: [
      'Argente HA, Álvarez ME. <i>Semiología Médica. Fisiopatología, semiotecnia y propedéutica</i>. Editorial Médica Panamericana — Aparato digestivo: síndrome ascítico-edematoso, abdomen agudo (apendicitis, peritonitis, obstrucción intestinal), síndrome coledociano y vesícula, hepatomegalia y esplenomegalia; Aparato urinario: retención urinaria.',
      'Surós Batlló A, Surós Batlló J. <i>Semiología médica y técnica exploratoria</i>. Elsevier Masson — Abdomen: signos de irritación peritoneal, ascitis, hígado y bazo.',
      'Bickley LS. <i>Bates. Guía de exploración física e historia clínica</i>. Wolters Kluwer — Abdomen: ascitis, apendicitis, colecistitis y masas abdominales.'
    ],
    teaching: [
      'Explora en orden (inspección, auscultación, percusión, palpación, maniobras) y deja la zona dolorosa para el final.',
      'Distingue defensa voluntaria de contractura involuntaria, y dolor visceral referido de irritación peritoneal (Blumberg).',
      'Caracteriza toda masa u organomegalia: tamaño, borde, consistencia, superficie, dolor, movilidad con la respiración y peloteo.',
      'Integra los hallazgos en un síndrome (ascítico, peritoneal, oclusivo, hepatomegalia, esplenomegalia, retención urinaria) antes de proponer la causa.'
    ],
    quiz
  });
})();
