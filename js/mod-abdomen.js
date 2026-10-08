/* Módulo "Abdomen (normal)": inspección, auscultación, percusión, palpación y maniobras.
   Usa NormalEngine.build con ganchos `after` para controles propios (respiración, silencio, vejiga, mano). */
(function () {
  'use strict';

  const SKIN = '#f1c9a5', EDGE = '#b98a63', LINE = '#a97d58', TEAL = '#0e6a78';
  const NS = 'http://www.w3.org/2000/svg';
  /* Geometría común (viewBox 420 x 520; 9 px por cm aprox.) */
  const LX = 134, RX = 286;          // líneas medioclaviculares (D / I del paciente = izquierda / derecha de la pantalla)
  const LMCY = 155;                  // reborde costal derecho a nivel de la LMC
  const UMB = 268, ASY = 344;        // ombligo y EIAS
  const P1 = 222, P2 = 312;          // plano subcostal y plano intertubercular
  const PX = 9;                      // píxeles por cm

  /* Datos normales por persona (clave = edad) */
  const PD = {
    28: {
      form: 'plano', bulge: 0, span: 7, aorta: '2,0', liver: 1,
      formTxt: 'abdomen plano, de contorno suave (el plano de la pared abdominal queda a la altura del pubis y la parrilla costal)',
      skin: 'piel lisa, elástica y de color uniforme; sin estrías, cicatrices ni lesiones; vello púbico de distribución ginecoide (triángulo de base superior)',
      resp: 'predominio costal (torácico) propio de la mujer, con discreto movimiento abdominal',
      amp: 0.012, pulse: 'se aprecia una pulsación aórtica epigástrica discreta (frecuente en personas delgadas), no expansiva',
      bw: { csd: 10, csi: 10, cid: 20, cii: 10 }, kidney: true
    },
    45: {
      form: 'plano-globoso', bulge: 6, span: 10, aorta: '2,2', liver: 0,
      formTxt: 'abdomen plano a ligeramente globoso por panículo adiposo fisiológico, simétrico y sin distensión',
      skin: 'piel íntegra, de color uniforme, con vello abdominal escaso distribuido normalmente; sin estrías, cicatrices ni lesiones; vello púbico de distribución androide (en rombo)',
      resp: 'predominio abdominal (diafragmático), propio del varón',
      amp: 0.03, pulse: 'no se ven pulsaciones ni peristaltismo',
      bw: { csd: 10, csi: 10, cid: 20, cii: 10 }, kidney: false
    },
    72: {
      form: 'globoso fisiológico', bulge: 14, span: 8, aorta: '2,6', liver: 0,
      formTxt: 'abdomen globoso fisiológico (aumento del panículo adiposo y laxitud de la pared); es simétrico, blando y no hay distensión',
      skin: 'piel más fina y seca, con pérdida fisiológica de elasticidad; algún angioma rubí aislado y lentigos solares (benignos, propios de la edad); sin cicatrices ni circulación colateral',
      resp: 'predominio abdominal (diafragmático), propio del varón',
      amp: 0.026, pulse: 'no se ven pulsaciones ni peristaltismo',
      bw: { csd: 10, csi: 10, cid: 10, cii: 10 }, kidney: false
    }
  };
  const pd = c => PD[c.age] || PD[45];
  const y5of = c => LMCY - pd(c).span * PX;
  const isF = c => c.sex === 'F';

  /* Estado compartido (se reinicia al cambiar de persona) */
  const ST = { key: '', bladder: false };
  function st(c) {
    const k = c.age + c.sex;
    if (ST.key !== k) { ST.key = k; ST.bladder = false; }
    return ST;
  }

  /* Elementos con animación o temporizadores que hay que limpiar al salir */
  const RT = { handCancel: null, handG: null, breath: null, timer: null, act: null };
  function clearRT() {
    try { Sound.stop(); } catch (e) { /* noop */ }
    if (RT.handCancel) { RT.handCancel(); RT.handCancel = null; }
    if (RT.handG && RT.handG.parentNode) RT.handG.remove();
    RT.handG = null;
    if (RT.breath) { RT.breath(); RT.breath = null; }
    if (RT.timer) { clearInterval(RT.timer); RT.timer = null; }
    RT.act = null;
  }

  /* ---------- dibujo del abdomen ---------- */
  function abdSVG(opts) {
    return function (learn, c) {
      const o = opts || {};
      const p = pd(c), W = 126 + p.bulge, y5 = y5of(c);
      let s = '';
      s += `<defs><clipPath id="abdClip"><path d="M0,0 H420 V222 H324 C302,158 252,112 210,104 C168,112 118,158 96,222 H0 Z"/></clipPath></defs>`;
      s += '<g id="abdMove">';
      /* tronco y muslos */
      s += `<path d="M68,0 L352,0 C356,110 ${210 + W},170 ${210 + W},300 C${210 + W},360 360,380 360,440 L352,520 L220,520 L214,440 L210,436 L206,440 L200,520 L68,520 L60,440 C60,380 ${210 - W},360 ${210 - W},300 C${210 - W},170 64,110 68,0 Z" fill="${SKIN}" stroke="${EDGE}" stroke-width="3"/>`;
      /* tórax: costillas por encima del reborde (recortadas) */
      let ribs = '';
      for (let j = -6; j <= 6; j++) {
        const yr = y5 - 9 + 18 * j;
        if (yr < -30) continue;
        ribs += `<path d="M210,${yr - 20} C170,${yr - 8} 150,${yr - 2} ${LX},${yr} S96,${yr + 22} 64,${yr + 44}" fill="none" stroke="#d6b99a" stroke-width="2"/>` +
                `<path d="M210,${yr - 20} C250,${yr - 8} 270,${yr - 2} ${RX},${yr} S324,${yr + 22} 356,${yr + 44}" fill="none" stroke="#d6b99a" stroke-width="2"/>`;
      }
      s += `<g clip-path="url(#abdClip)">${ribs}</g>`;
      s += `<path d="M210,0 L210,104" stroke="${LINE}" stroke-width="3" opacity=".7"/><path d="M205,98 L210,118 L215,98 Z" fill="#e7bf9a" stroke="${LINE}" stroke-width="1.5"/>`;
      s += `<path d="M96,222 C118,158 168,112 210,104 C252,112 302,158 324,222" fill="none" stroke="${LINE}" stroke-width="3.5"/>`;
      /* pezones (4.º EIC en la LMC) */
      const ny = y5 - 18;
      const nr = isF(c) ? 11 : 5;
      s += `<circle cx="${LX}" cy="${ny}" r="${nr}" fill="${isF(c) ? '#e3b79c' : '#c98f7a'}"/><circle cx="${RX}" cy="${ny}" r="${nr}" fill="${isF(c) ? '#e3b79c' : '#c98f7a'}"/>`;
      if (isF(c)) s += `<circle cx="${LX}" cy="${ny}" r="3.5" fill="#c98f7a"/><circle cx="${RX}" cy="${ny}" r="3.5" fill="#c98f7a"/>`;
      /* contorno del vientre según la persona */
      if (p.bulge >= 14) {
        s += `<path d="M120,318 Q210,${392 + p.bulge / 2} 300,318" fill="none" stroke="#d6b99a" stroke-width="2.5"/>`;
        s += `<path d="M150,300 Q210,${362} 270,300" fill="none" stroke="#e1c3a3" stroke-width="2"/>`;
      } else if (p.bulge >= 6) {
        s += `<path d="M134,330 Q210,${378} 286,330" fill="none" stroke="#dcbf9f" stroke-width="2"/>`;
      }
      /* ombligo, EIAS, ligamento inguinal, sínfisis */
      s += `<ellipse cx="210" cy="${UMB}" rx="5" ry="7.5" fill="#d9a77e" stroke="#9c6f4a" stroke-width="1.5"/>`;
      s += `<ellipse cx="104" cy="${ASY}" rx="8" ry="6" fill="#e7bf9a" stroke="${LINE}" stroke-width="1.5"/><ellipse cx="316" cy="${ASY}" rx="8" ry="6" fill="#e7bf9a" stroke="${LINE}" stroke-width="1.5"/>`;
      s += `<path d="M110,350 L194,394 M310,350 L226,394" stroke="#c9a283" stroke-width="2.5" stroke-dasharray="2 4" fill="none"/>`;
      s += `<circle cx="210" cy="398" r="5" fill="#e7bf9a" stroke="${LINE}" stroke-width="1.5"/>`;
      s += `<text x="40" y="40" class="svg-small">D</text><text x="372" y="40" class="svg-small">I</text>`;
      s += '</g>';

      /* cuadrículas de referencia (solo en Aprendizaje) */
      if (o.grid === 'nine') {
        s += `<g class="hintring" fill="none" stroke="${TEAL}" stroke-width="1.6" stroke-dasharray="6 5" opacity=".75">` +
             `<path d="M84,${P1} H336 M84,${P2} H336"/><path d="M${LX},118 V404 M${RX},118 V404"/></g>`;
      }
      if (o.grid === 'quad' || o.grid === 'nine') {
        s += `<g class="hintring" fill="none" stroke="${TEAL}" stroke-width="1.6" stroke-dasharray="3 5" opacity=".7"><path d="M210,108 V404"/>` +
             (o.grid === 'quad' ? `<path d="M84,${UMB} H336"/>` : '') + '</g>';
      }
      /* etiquetas de referencia */
      if (o.refs !== false) {
        s += `<g class="hintring">` +
          `<text x="100" y="128" class="svg-hint">Reborde costal</text>` +
          `<text x="218" y="98" class="svg-hint">Apéndice xifoides</text>` +
          `<text x="226" y="${UMB + 4}" class="svg-hint">Ombligo</text>` +
          `<text x="92" y="${ASY + 24}" class="svg-hint" text-anchor="end">EIAS</text><text x="328" y="${ASY + 24}" class="svg-hint">EIAS</text>` +
          `<text x="210" y="416" class="svg-hint" text-anchor="middle">Sínfisis del pubis</text>` +
          `<text x="${LX}" y="424" class="svg-hint" text-anchor="middle">LMC D</text><text x="${RX}" y="424" class="svg-hint" text-anchor="middle">LMC I</text>` +
          `<text x="214" y="440" class="svg-hint">Línea media</text></g>`;
        s += `<g class="hintring" fill="none" stroke="${TEAL}" stroke-width="1.4" stroke-dasharray="2 4" opacity=".6"><path d="M${LX},130 V420 M${RX},130 V420"/></g>`;
      }
      /* vísceras de referencia */
      if (o.liver) {
        const y5v = y5;
        s += `<g class="hintring">` +
          `<path d="M90,${y5v + 20} C108,${y5v + 4} 160,${y5v - 4} 205,${y5v + 8} C240,${y5v + 16} 262,${y5v + 38} 258,${y5v + 62} L210,118 C170,128 140,${LMCY - 6} 118,${LMCY + 16} L98,214 Z" fill="#b5651d" opacity=".22" stroke="#8a4b12" stroke-width="1.5"/>` +
          `<circle cx="${LX}" cy="${y5v}" r="4" fill="#d9534f"/><circle cx="${LX}" cy="${LMCY}" r="4" fill="#d9534f"/>` +
          `<text x="${LX - 10}" y="${y5v - 6}" class="svg-hint" text-anchor="end">5.º EIC (LMC)</text>` +
          `<path d="M${LX - 16},${y5v} V${LMCY}" stroke="#d9534f" stroke-width="2"/>` +
          `<text x="${LX - 22}" y="${(y5v + LMCY) / 2 + 4}" class="svg-hint" text-anchor="end">${p.span} cm</text></g>`;
      }
      if (o.organs) {
        s += `<g class="hintring">` +
          `<ellipse cx="268" cy="126" rx="24" ry="14" fill="#7ec3d9" opacity=".4"/><text x="268" y="130" class="svg-hint" text-anchor="middle">Traube</text>` +
          `<ellipse cx="322" cy="176" rx="9" ry="26" transform="rotate(-8 322 176)" fill="#8e5a9b" opacity=".28"/>` +
          `<ellipse cx="172" cy="238" rx="9" ry="22" fill="#c0504d" opacity=".2"/><ellipse cx="248" cy="238" rx="9" ry="22" fill="#c0504d" opacity=".2"/>` +
          `<path d="M210,150 V${UMB} L192,326 M210,${UMB} L228,326" stroke="#c0392b" stroke-width="5" opacity=".25" fill="none"/></g>`;
      }
      if (o.bladder && st(c).bladder) {
        s += `<g class="hintring"><ellipse cx="210" cy="386" rx="36" ry="24" fill="#e8cd5a" opacity=".45" stroke="#b79a1a" stroke-width="1.5"/>` +
             `<text x="210" y="372" class="svg-hint" text-anchor="middle">Vejiga llena</text></g>`;
      }
      return s;
    };
  }

  /* ---------- las nueve regiones ---------- */
  const R9 = [
    { id: 'hd', label: 'Hipocondrio derecho', short: 'Hipocond. D', x: 88, y: 140, w: 46, h: 82, lx: 82, ly: 186, anchor: 'end' },
    { id: 'ep', label: 'Epigastrio', short: 'Epigastrio', d: 'M134,156 C156,134 182,118 210,108 C238,118 264,134 286,156 L286,222 L134,222 Z', lx: 210, ly: 186 },
    { id: 'hi', label: 'Hipocondrio izquierdo', short: 'Hipocond. I', x: 286, y: 140, w: 46, h: 82, lx: 338, ly: 186, anchor: 'start' },
    { id: 'fd', label: 'Flanco derecho', short: 'Flanco D', x: 88, y: 222, w: 46, h: 90, lx: 82, ly: 270, anchor: 'end' },
    { id: 'mes', label: 'Mesogastrio (región umbilical)', short: 'Mesogastrio', x: 134, y: 222, w: 152, h: 90, lx: 210, ly: 302 },
    { id: 'fi', label: 'Flanco izquierdo', short: 'Flanco I', x: 286, y: 222, w: 46, h: 90, lx: 338, ly: 270, anchor: 'start' },
    { id: 'fid', label: 'Fosa ilíaca derecha', short: 'F. ilíaca D', x: 88, y: 312, w: 46, h: 88, lx: 82, ly: 366, anchor: 'end' },
    { id: 'hip', label: 'Hipogastrio', short: 'Hipogastrio', x: 134, y: 312, w: 152, h: 88, lx: 210, ly: 332 },
    { id: 'fii', label: 'Fosa ilíaca izquierda', short: 'F. ilíaca I', x: 286, y: 312, w: 46, h: 88, lx: 338, ly: 366, anchor: 'start' }
  ];
  const nine = f => R9.map(r => Object.assign({}, r, { tools: f(r.id) }));

  /* ---------- mano animada ---------- */
  function handSVG(bim) {
    const h = `<g fill="${SKIN}" stroke="${EDGE}" stroke-width="1.6">` +
      `<rect x="-17" y="0" width="34" height="26" rx="10"/>` +
      `<rect x="-17" y="-30" width="7" height="34" rx="3.5"/><rect x="-9" y="-33" width="7" height="37" rx="3.5"/>` +
      `<rect x="-1" y="-33" width="7" height="37" rx="3.5"/><rect x="7" y="-29" width="7" height="33" rx="3.5"/>` +
      `<ellipse cx="-21" cy="10" rx="5" ry="12" transform="rotate(25 -21 10)"/></g>`;
    const back = bim ? `<g opacity=".55" transform="translate(16 16) rotate(14)"><rect x="-17" y="-8" width="34" height="34" rx="10" fill="#e6b88d" stroke="${EDGE}" stroke-width="1.5" stroke-dasharray="4 3"/></g>` : '';
    return back + h;
  }
  function hand(ctx, deep, bim) {
    if (RT.handCancel) { RT.handCancel(); RT.handCancel = null; }
    if (RT.handG && RT.handG.parentNode) RT.handG.remove();
    const fl = ctx.svg.querySelector('#flash');
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('pointer-events', 'none');
    g.innerHTML = handSVG(bim);
    fl.appendChild(g);
    RT.handG = g;
    const p = ctx.point;
    RT.handCancel = U.tween(1700, u => {
      let dx, dy, sc, op;
      if (u < 0.25) { const t = u / 0.25; dx = 50 * (1 - t); dy = 60 * (1 - t); sc = 1.04; op = t; }
      else if (u < 0.5) { const t = (u - 0.25) / 0.25; dx = 0; dy = deep ? 3 * t : 1 * t; sc = 1.04 - (deep ? 0.1 : 0.04) * t; op = 1; }
      else if (u < 0.78) { const t = (u - 0.5) / 0.28; dx = Math.sin(t * Math.PI * 2) * (deep ? 4 : 7); dy = (deep ? 3 : 1) + Math.cos(t * Math.PI * 2) * (deep ? 1 : 3); sc = 1.04 - (deep ? 0.1 : 0.04); op = 1; }
      else { const t = (u - 0.78) / 0.22; dx = 40 * t; dy = 50 * t; sc = 1.04 - 0.06 * (1 - t); op = 1 - t; }
      g.setAttribute('transform', `translate(${p.x + dx} ${p.y + 14 + dy}) scale(${sc})`);
      g.setAttribute('opacity', op);
    }, () => { g.remove(); if (RT.handG === g) RT.handG = null; });
  }
  const T = (html, deep, bim) => ({ html, run: ctx => hand(ctx, deep, bim) });

  /* nota breve animada sobre el dibujo (flecha / indicación de maniobra) */
  function note(ctx, txt) {
    const fl = ctx.svg.querySelector('#flash');
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', ctx.point.x); t.setAttribute('y', ctx.point.y - 22);
    t.setAttribute('text-anchor', 'middle'); t.setAttribute('class', 'svg-title');
    t.setAttribute('pointer-events', 'none');
    t.textContent = txt;
    fl.appendChild(t);
    U.tween(1600, u => { t.setAttribute('opacity', u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3); t.setAttribute('y', ctx.point.y - 22 - 10 * u); }, () => t.remove());
  }

  const redraw = (ctx, sc) => {
    ctx.svg.querySelector('#bg').innerHTML = sc.svg(ctx.sh.mode === 'learn', ctx.c);
    ctx.scene.refresh();
  };

  function bladderSeg(stage, sh, ctx0, sc) {
    const ctx = Object.assign({ sh }, ctx0);
    const box = document.createElement('div');
    box.className = 'overlay-top';
    box.innerHTML = `<span></span><div class="seg"><button data-b="0">Vejiga vacía</button><button data-b="1">Vejiga llena (≈ 400 mL)</button></div>`;
    stage.appendChild(box);
    const set = () => box.querySelectorAll('button').forEach(b => b.classList.toggle('active', (b.dataset.b === '1') === st(ctx.c).bladder));
    set();
    box.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      st(ctx.c).bladder = b.dataset.b === '1';
      set(); redraw(ctx, sc);
      sh.log(st(ctx.c).bladder ? 'Se simula una vejiga con ≈ 400 mL (deseo miccional normal): variante fisiológica.' : 'Se simula una vejiga recién vaciada.', '');
    });
  }

  /* =====================================================================
     1) INSPECCIÓN
     ===================================================================== */
  const insSvg = abdSVG({ grid: 'none' });
  const inspeccion = {
    id: 'insp', label: 'Inspección', viewBox: '0 0 420 520',
    hint: 'Paciente en decúbito supino, brazos a los lados, abdomen descubierto del xifoides al pubis, buena luz. Observa desde los pies y desde el lateral.',
    svg: insSvg,
    tools: [
      { id: 'ojo', icon: '👁️', label: 'Inspección general', hint: 'Observa forma, simetría, ombligo, piel y movimientos respiratorios. Haz clic en cada zona.' },
      { id: 'luz', icon: '🔦', label: 'Luz tangencial', hint: 'Con luz tangencial (desde el lateral) se ven mejor las pulsaciones, el peristaltismo y las pequeñas masas.' }
    ],
    regions: [
      {
        id: 'forma', label: 'Contorno abdominal', short: 'Forma y simetría', x: 92, y: 118, w: 236, h: 282, rx: 14, lx: 210, ly: 128,
        tools: {
          ojo: c => `${pd(c).formTxt}. Simetría conservada: sin abultamientos ni depresiones localizadas, flancos simétricos y línea media centrada. Sin distensión, sin masas visibles, sin diástasis de rectos ni hernias en reposo.`,
          luz: c => `Con luz tangencial no se ven masas ni abultamientos; ${pd(c).pulse}. No hay ondas peristálticas visibles (el peristaltismo visible no es normal en el adulto sano).`
        }
      },
      {
        id: 'piel', label: 'Piel de la pared abdominal', short: 'Piel y cicatrices', cx: 112, cy: 262, r: 20, lx: 56, ly: 296, anchor: 'start',
        tools: {
          ojo: c => `${pd(c).skin}. Sin cicatrices quirúrgicas ni traumáticas, sin eritema ni equimosis, sin ictericia (escleras y piel de color normal).`,
          luz: () => 'Superficie cutánea uniforme, sin lesiones ni relieves anormales; no se ven estrías ni venas dilatadas.'
        }
      },
      {
        id: 'circ', label: 'Red venosa superficial', short: 'Venas', cx: 296, cy: 240, r: 20, lx: 296, ly: 208,
        tools: {
          ojo: () => 'Red venosa superficial poco visible; sin circulación colateral (ni “cabeza de medusa” periumbilical) ni telangiectasias.',
          luz: () => 'Sin circulación colateral. (Si existiera, el sentido del flujo se comprueba con dos dedos: normalmente, por debajo del ombligo va hacia abajo y por encima hacia arriba.)'
        }
      },
      {
        id: 'epi', label: 'Epigastrio (pulsaciones y peristaltismo)', short: 'Epigastrio', cx: 210, cy: 180, r: 22, lx: 210, ly: 150,
        tools: {
          ojo: c => `Sin peristaltismo visible; ${pd(c).pulse}.`,
          luz: c => `${pd(c).pulse.charAt(0).toUpperCase() + pd(c).pulse.slice(1)}. Sin ondas peristálticas ni masas pulsátiles.`
        }
      },
      {
        id: 'omb', label: 'Ombligo', short: 'Ombligo', cx: 210, cy: UMB, r: 15, lx: 246, ly: UMB - 2, anchor: 'start',
        tools: {
          ojo: () => 'Ombligo en la línea media, deprimido (invertido), de forma ovalada con piel normal; sin secreción, eritema, equimosis periumbilical ni nódulos; sin protrusión (anillo umbilical cerrado).',
          luz: () => 'Cicatriz umbilical sin abultamiento; no se ve protrusión al esfuerzo en reposo.'
        }
      },
      {
        id: 'ing', label: 'Regiones inguinales', short: 'Ingles', cx: 160, cy: 378, r: 18, lx: 160, ly: 354,
        tools: {
          ojo: () => 'Regiones inguinales y crurales simétricas, sin abultamientos en reposo (las hernias se buscan en bipedestación y con Valsalva en la palpación).',
          luz: () => 'Sin masas inguinales visibles en reposo.'
        }
      },
      {
        id: 'ing2', label: 'Región inguinal izquierda', short: 'Ingles', cx: 260, cy: 378, r: 18, lx: 260, ly: 354,
        tools: {
          ojo: () => 'Región inguinal izquierda simétrica con la derecha, sin abultamientos en reposo.',
          luz: () => 'Sin masas inguinales visibles en reposo.'
        }
      }
    ],
    after(stage, sh, ctx) {
      const c = ctx.c, p = pd(c);
      const box = document.createElement('div');
      box.className = 'overlay-top';
      box.innerHTML = `<span></span><button class="btn small" id="abdBreath" style="width:auto;margin:0">🫁 Pedir respiración profunda</button>`;
      stage.appendChild(box);
      box.querySelector('#abdBreath').addEventListener('click', () => {
        const g = ctx.svg.querySelector('#abdMove');
        if (RT.breath) RT.breath();
        const per = Math.min(4500, 60000 / c.v.rr), cyc = 2;
        RT.breath = U.tween(per * cyc, u => {
          const e = (1 - Math.cos(u * cyc * Math.PI * 2)) / 2;
          g.setAttribute('transform', `translate(210 ${UMB}) scale(${1 + p.amp * 0.9 * e} ${1 + p.amp * e}) translate(-210 -${UMB})`);
        }, () => { g.removeAttribute('transform'); RT.breath = null; });
        sh.log(`<b>Movimientos respiratorios:</b> el abdomen se eleva en la inspiración y desciende en la espiración, de forma simétrica y sincrónica (FR ${c.v.rr}/min); ${p.resp}. Sin movimiento paradójico ni inmovilidad localizada.`, 'find');
      });
    },
    onLeave: clearRT
  };

  /* =====================================================================
     2) AUSCULTACIÓN
     ===================================================================== */
  const QN = {
    csd: ['Cuadrante superior derecho', 'hígado, vesícula y ángulo hepático del colon', 'Sin roce hepático.'],
    csi: ['Cuadrante superior izquierdo', 'estómago, bazo y ángulo esplénico del colon', 'Sin roce esplénico.'],
    cid: ['Cuadrante inferior derecho', 'ciego, íleon terminal (válvula ileocecal)', 'La válvula ileocecal es una zona de ruidos algo más frecuentes.'],
    cii: ['Cuadrante inferior izquierdo', 'colon descendente y sigmoides', 'Ruidos algo más espaciados.']
  };
  function setStatus(ctx, title, sub) {
    const a = ctx.sh.$('#abdWT'), b = ctx.sh.$('#abdWS');
    if (a) a.textContent = title;
    if (b) b.textContent = sub;
  }
  const quadTool = id => (c, ctx) => {
    const rate = pd(c).bw[id], n10 = Math.round(rate / 6), q = QN[id];
    return {
      html: `ruidos hidroaéreos presentes, ≈ ${rate}/min (normal 5–30/min; ≈ ${n10} en 10 s), de tono medio, intensidad moderada e irregulares (“borborigmos”); sin ruidos metálicos ni silencio. Zona: ${q[1]}. ${q[2]}`,
      run: cx => { Sound.bowel(rate, 0.9); RT.act = { rate, label: q[0] }; setStatus(cx, q[0], `≈ ${rate} ruidos/min · escuchando`); }
    };
  };
  const bruit = (label, txt, rateOf) => (c, ctx) => ({
    html: txt,
    run: cx => { Sound.bowel(rateOf(c), 0.3); RT.act = null; setStatus(cx, label, 'Sin soplo (se oyen solo ruidos intestinales lejanos)'); }
  });
  const rateTop = c => pd(c).bw.csd;
  const rateLow = c => pd(c).bw.cid;
  const ausSvg = abdSVG({ grid: 'quad' });
  const auscultacion = {
    id: 'aus', label: 'Auscultación', viewBox: '0 0 420 520',
    hint: 'Se ausculta ANTES de percutir y palpar. Diafragma tibio en los 4 cuadrantes; escucha al menos 1 minuto en cada uno antes de dar los ruidos por ausentes.',
    svg: ausSvg,
    tools: [{ id: 'steth', icon: '🩺', label: 'Fonendoscopio · diafragma', hint: 'Haz clic en un cuadrante (ruidos hidroaéreos) o en un punto vascular (soplos). “Contar 10 s” ayuda a estimar la frecuencia.' }],
    regions: [
      { id: 'csd', label: 'Cuadrante superior derecho', short: 'CSD', x: 90, y: 130, w: 118, h: 136, lx: 150, ly: 152, tools: { steth: quadTool('csd') } },
      { id: 'csi', label: 'Cuadrante superior izquierdo', short: 'CSI', x: 212, y: 130, w: 118, h: 136, lx: 270, ly: 152, tools: { steth: quadTool('csi') } },
      { id: 'cid', label: 'Cuadrante inferior derecho', short: 'CID', x: 90, y: 270, w: 118, h: 130, lx: 150, ly: 292, tools: { steth: quadTool('cid') } },
      { id: 'cii', label: 'Cuadrante inferior izquierdo', short: 'CII', x: 212, y: 270, w: 118, h: 130, lx: 270, ly: 292, tools: { steth: quadTool('cii') } },
      { id: 'ao', label: 'Aorta abdominal (epigastrio)', short: 'Aorta', cx: 210, cy: 214, r: 12, lx: 210, ly: 192,
        tools: { steth: bruit('Aorta abdominal', 'sin soplo sistólico en el epigastrio (ruido vascular ausente); sin roce.', rateTop) } },
      { id: 'rd', label: 'Arteria renal derecha', short: 'Renal D', cx: 178, cy: 238, r: 11, lx: 164, ly: 244, anchor: 'end',
        tools: { steth: bruit('Arteria renal derecha', 'sin soplo renal (se ausculta 2-3 cm por encima del ombligo y 2-3 cm lateral a la línea media); sin roce.', rateTop) } },
      { id: 'ri', label: 'Arteria renal izquierda', short: 'Renal I', cx: 242, cy: 238, r: 11, lx: 256, ly: 244, anchor: 'start',
        tools: { steth: bruit('Arteria renal izquierda', 'sin soplo renal; sin roce.', rateTop) } },
      { id: 'id', label: 'Arteria ilíaca derecha', short: 'Ilíaca D', cx: 174, cy: 328, r: 11, lx: 160, ly: 334, anchor: 'end',
        tools: { steth: bruit('Arteria ilíaca derecha', 'sin soplo ilíaco (línea del ombligo al punto medio del ligamento inguinal).', rateLow) } },
      { id: 'ii', label: 'Arteria ilíaca izquierda', short: 'Ilíaca I', cx: 246, cy: 328, r: 11, lx: 260, ly: 334, anchor: 'start',
        tools: { steth: bruit('Arteria ilíaca izquierda', 'sin soplo ilíaco.', rateLow) } },
      { id: 'fd', label: 'Arteria femoral derecha', short: 'Femoral D', cx: 150, cy: 380, r: 11, lx: 136, ly: 386, anchor: 'end',
        tools: { steth: bruit('Arteria femoral derecha', 'sin soplo femoral (punto medio del ligamento inguinal); pulso femoral presente y simétrico.', rateLow) } },
      { id: 'fi', label: 'Arteria femoral izquierda', short: 'Femoral I', cx: 270, cy: 380, r: 11, lx: 284, ly: 386, anchor: 'start',
        tools: { steth: bruit('Arteria femoral izquierda', 'sin soplo femoral; pulso presente y simétrico.', rateLow) } }
    ],
    after(stage, sh, ctx) {
      const bar = document.createElement('div');
      bar.className = 'wave';
      bar.innerHTML = `<div class="where"><b id="abdWT">Sin escucha</b><span id="abdWS">Haz clic en un cuadrante o en un punto vascular.</span></div>
        <span style="flex:1"></span>
        <button class="btn small" id="abdCount" style="width:auto;margin:0">⏱ Contar 10 s</button>
        <button class="btn small" id="abdStop" style="width:auto;margin:0">🔇 Silencio</button>`;
      stage.appendChild(bar);
      bar.querySelector('#abdStop').addEventListener('click', () => {
        Sound.stop(); RT.act = null;
        if (RT.timer) { clearInterval(RT.timer); RT.timer = null; }
        setStatus({ sh }, 'Sin escucha', 'Haz clic en un cuadrante o en un punto vascular.');
      });
      bar.querySelector('#abdCount').addEventListener('click', () => {
        if (!RT.act) { sh.log('Primero apoya el fonendoscopio en un cuadrante y luego cuenta durante 10 s.', 'warn'); return; }
        if (RT.timer) clearInterval(RT.timer);
        const a = RT.act; let t = 10;
        setStatus({ sh }, a.label, `Contando… ${t} s`);
        RT.timer = setInterval(() => {
          t--;
          if (t > 0) { setStatus({ sh }, a.label, `Contando… ${t} s`); return; }
          clearInterval(RT.timer); RT.timer = null;
          const n = Math.round(a.rate / 6);
          setStatus({ sh }, a.label, `≈ ${n} ruidos en 10 s`);
          sh.log(`<b>${a.label}:</b> en 10 s se cuentan ≈ ${n} ruidos hidroaéreos (≈ ${a.rate}/min; regla práctica: ~3 ruidos en 10 s ≈ 18/min). Normal: 5–30/min.`, 'find');
        }, 1000);
      });
    },
    onLeave: clearRT
  };

  /* =====================================================================
     3) PERCUSIÓN
     ===================================================================== */
  const tymp = (txt) => ({ html: txt, run: () => Sound.percuss('hyper') });
  const dullT = (txt) => ({ html: txt, run: () => Sound.percuss('dull') });
  const TYM = 'timpanismo (sonido de tono alto, intensidad fuerte y duración larga, “de tambor”) por el gas intraluminal';
  function percNine(id) {
    return (c) => {
      const full = st(c).bladder;
      switch (id) {
        case 'hd': return dullT(`matidez hepática (sonido mate, de tono bajo y corta duración) en la zona en que el hígado contacta con la pared; la altura se mide en la franja LMC D. Por debajo del reborde costal pasa a timpanismo.`);
        case 'ep': return tymp(`${TYM}, correspondiente a la cámara gástrica; matidez ligera solo en la zona alta bajo el xifoides (lóbulo izquierdo hepático).`);
        case 'hi': return tymp(`${TYM}: cámara gástrica y ángulo esplénico del colon.`);
        case 'fd': return tymp(`${TYM} (colon ascendente); sin matidez en el flanco.`);
        case 'mes': return tymp(`${TYM}: asas de intestino delgado y colon transverso.`);
        case 'fi': return tymp(`${TYM} (colon descendente); sin matidez en el flanco.`);
        case 'fid': return tymp(`${TYM} (ciego e íleon terminal).`);
        case 'fii': return tymp(`${TYM} (sigmoides).`);
        default:
          return full
            ? dullT('matidez suprapúbica de borde superior convexo hacia arriba (vejiga distendida, ≈ 400 mL), que no sobrepasa 2–3 cm sobre la sínfisis. Al orinar desaparece: es un hallazgo fisiológico.')
            : tymp(`${TYM}: sin matidez suprapúbica (vejiga vacía).`);
      }
    };
  }
  const dispTool = (c) => ({
    html: 'matidez desplazable <b>negativa</b>: en decúbito supino los flancos son timpánicos; al girar al paciente a decúbito lateral el flanco declive sigue timpánico y la nota no cambia (no hay líquido libre; la maniobra detecta aprox. > 500 mL).',
    run: () => Sound.percuss('hyper')
  });
  const waveTool = () => ({
    html: 'signo de la onda ascítica <b>negativo</b>: con el borde cubital de la mano de un ayudante sobre la línea media, un golpecito en un flanco no transmite onda líquida a la mano apoyada en el flanco opuesto.',
    run: ctx => note(ctx, 'golpe → sin onda')
  });
  const percNineRegs = nine(id => {
    const t = { perc: percNine(id) };
    if (id === 'fd' || id === 'fi') { t.desp = dispTool; t.onda = waveTool; }
    return t;
  });
  const percSvg = abdSVG({ grid: 'nine', liver: true, organs: true, bladder: true });
  const lmcStrip = {
    id: 'lmc', label: 'Franja LMC derecha (altura hepática)', short: 'LMC D: percute de arriba abajo', x: LX - 22, y: 8, w: 44, h: 214, rx: 8, lx: LX, ly: 16,
    tools: {
      perc: (c, ctx) => {
        const p = pd(c), y5 = y5of(c), y = ctx.point.y, alt = p.span;
        if (y < y5 - 8) return { html: 'sonoridad pulmonar: <b>resonante</b> (tono bajo, intensidad fuerte).', run: () => Sound.percuss('resonant') };
        if (y < y5 + 4) return { html: `<b>borde superior de la matidez hepática</b> en el 5.º espacio intercostal (LMC): el sonido pasa de resonante a mate. Altura hepática hasta el reborde costal ≈ <b>${alt} cm</b> (normal 6–12 cm; típico 7–10).`, run: () => Sound.percuss('dull') };
        if (y < LMCY - 4) return { html: `<b>matidez hepática</b> (sonido mate). Altura hepática en la LMC ≈ ${alt} cm (normal 6–12 cm).`, run: () => Sound.percuss('dull') };
        if (y < LMCY + 6) return { html: `<b>borde inferior de la matidez hepática</b> a nivel del reborde costal. Altura hepática en la LMC = <b>${alt} cm</b> (normal 6–12 cm; varía con el sexo y la talla: menor en mujeres).`, run: () => Sound.percuss('dull') };
        return { html: 'por debajo del reborde costal: <b>timpanismo</b> (asas con gas); no hay matidez hepática.', run: () => Sound.percuss('hyper') };
      }
    }
  };
  const percusion = {
    id: 'perc', label: 'Percusión', viewBox: '0 0 420 520',
    hint: 'Percute con el dedo medio sobre el dedo plesímetro. Recorre los cuadrantes en espiral buscando el patrón de timpanismo y mide la matidez hepática en la LMC.',
    svg: percSvg,
    tools: [
      { id: 'perc', icon: '🖐️', label: 'Percusión digitodigital', hint: 'Percute las regiones y percute la franja LMC D de arriba abajo para hallar el borde superior e inferior del hígado.' },
      { id: 'desp', icon: '↔️', label: 'Matidez desplazable', hint: 'Haz clic en un flanco: se compara la nota en supino y en decúbito lateral.' },
      { id: 'onda', icon: '〰️', label: 'Signo de la onda', hint: 'Haz clic en un flanco: golpeteo lateral con la mano de un ayudante en la línea media.' }
    ],
    regions: percNineRegs.concat([
      lmcStrip,
      {
        id: 'traube', label: 'Espacio de Traube', short: 'Traube', cx: 268, cy: 128, r: 19, lx: 268, ly: 100,
        tools: { perc: () => tymp('<b>espacio de Traube timpánico</b> (hemitórax izquierdo inferior, sobre la cámara gástrica; limitado por el 6.º espacio intercostal, el reborde costal izquierdo y el bazo). La matidez en esta zona no es normal.') }
      },
      {
        id: 'castell', label: 'Punto de Castell', short: 'Castell', cx: 326, cy: 200, r: 13, lx: 336, ly: 232, anchor: 'start',
        tools: { perc: () => tymp('<b>signo de Castell negativo</b>: en el último espacio intercostal en la línea axilar anterior izquierda la nota es timpánica en inspiración y espiración (no hay matidez esplénica). El bazo normal no se palpa ni se percute fuera de su zona.') }
      },
      {
        id: 'vej', label: 'Región suprapúbica', short: '', cx: 210, cy: 372, r: 22,
        tools: { perc: percNine('hip') }
      }
    ]),
    after(stage, sh, ctx) { bladderSeg(stage, sh, ctx, percusion); },
    onLeave: clearRT
  };

  /* =====================================================================
     4) PALPACIÓN
     ===================================================================== */
  const SUP = lbl => `Palpación superficial en ${lbl.toLowerCase()}: pared <b>blanda y depresible</b>, <b>indolora</b>, sin defensa voluntaria ni involuntaria (sin rigidez), sin hiperestesia cutánea ni masas superficiales; tono muscular normal y temperatura simétrica.`;
  const DEEP = {
    hd: 'Hipocondrio derecho: sin masas ni dolor; el borde hepático y la vesícula se exploran en sus puntos específicos.',
    ep: 'Epigastrio: sin masas ni dolor; se percibe la pulsación de la aorta (punto “Aorta”); el estómago y el páncreas no son palpables.',
    hi: 'Hipocondrio izquierdo: sin masas ni dolor; el bazo no es palpable en inspiración profunda.',
    fd: 'Flanco derecho: colon ascendente blando, sin masas ni dolor.',
    mes: 'Región umbilical: sin masas ni dolor a la palpación profunda; se transmite la pulsación aórtica; asas blandas y depresibles.',
    fi: 'Flanco izquierdo: colon descendente blando, sin masas ni dolor.',
    fid: 'Fosa ilíaca derecha: sin masas ni dolor a la presión profunda; el ciego se percibe como estructura blanda (punto “Ciego”).',
    hip: 'Hipogastrio: sin masas ni dolor; no se palpa la vejiga ni el útero por encima del pubis.',
    fii: 'Fosa ilíaca izquierda: sin masas ni dolor; el sigmoides se palpa como un cordón (punto “Sigmoides”).'
  };
  const palpNine = nine(id => ({
    sup: (c, ctx) => T(SUP(ctx.region.label), false, false),
    prof: (c, ctx) => T(`${DEEP[id]} Pared blanda sin defensa ni dolor a la descompresión.`, true, false)
  }));
  const liverTool = (c, ctx) => {
    const p = pd(c);
    const txt = p.liver
      ? `<b>borde hepático palpable</b> ≈ 1 cm por debajo del reborde costal derecho (LMC) en inspiración profunda: <b>liso, romo (no cortante), de consistencia blanda</b>, regular e indoloro; la superficie es lisa. Altura por percusión: ${p.span} cm. Variante normal en personas delgadas.`
      : `<b>borde hepático no palpable</b> bajo el reborde costal derecho en inspiración profunda (a veces se palpa hasta 1–2 cm bajo el reborde, blando, liso, romo e indoloro). Altura por percusión: ${p.span} cm; el hígado normal no desborda el reborde.`;
    return T(txt + ' Técnica: mano derecha plana, paralela al reborde, desde la fosa ilíaca hacia arriba, que sube en cada espiración y “recibe” el borde en la inspiración.', true, false);
  };
  const aortaTool = c => T(`<b>aorta abdominal</b>: pulsátil en la línea media (algo a la izquierda), por encima del ombligo, con <b>expansión lateral</b> al colocar una mano a cada lado (no solo anteroposterior); diámetro estimado ≈ ${pd(c).aorta} cm (normal < 3 cm); no se palpa masa pulsátil.`, true, false);
  const palpOrgans = [
    { id: 'hig', label: 'Hígado (borde hepático)', short: 'Hígado', cx: 124, cy: 176, r: 14, lx: 100, ly: 200, anchor: 'end', tools: { prof: liverTool } },
    { id: 'ves', label: 'Vesícula biliar', short: 'Vesícula', cx: 152, cy: 146, r: 11, lx: 172, ly: 134, anchor: 'start',
      tools: { prof: () => T('<b>vesícula no palpable</b> (la vesícula normal no se palpa); sin dolor a la palpación bajo el reborde costal derecho, en el borde lateral del recto. Murphy negativo.', true, false) } },
    { id: 'baz', label: 'Bazo', short: 'Bazo', cx: 296, cy: 172, r: 13, lx: 316, ly: 150, anchor: 'start',
      tools: { prof: () => T('<b>bazo no palpable</b> en inspiración profunda (solo se palpa si su tamaño aumenta 2–3 veces); técnica: mano izquierda en el flanco posterior que lo empuja hacia delante y mano derecha en el reborde. Espacio de Traube timpánico.', true, true) } },
    { id: 'rd', label: 'Riñón derecho', short: 'Riñón D', cx: 166, cy: 238, r: 13, lx: 150, ly: 268, anchor: 'end',
      tools: { prof: c => T(pd(c).kidney
        ? '<b>riñón derecho</b>: en esta persona delgada se palpa el polo inferior en inspiración profunda (técnica bimanual: mano posterior en el ángulo costovertebral que empuja hacia delante): liso, redondeado, firme, móvil con la respiración e indoloro.'
        : '<b>riñón derecho no palpable</b> (técnica bimanual con peloteo: la mano posterior empuja hacia delante en el ángulo costovertebral y la anterior hace presión profunda en inspiración); habitualmente los riñones no se palpan.', true, true) } },
    { id: 'ri', label: 'Riñón izquierdo', short: 'Riñón I', cx: 254, cy: 238, r: 13, lx: 270, ly: 268, anchor: 'start',
      tools: { prof: () => T('<b>riñón izquierdo no palpable</b> (el riñón izquierdo es más alto y más difícil de palpar que el derecho); sin dolor ni masas en el flanco.', true, true) } },
    { id: 'ao', label: 'Aorta abdominal', short: 'Aorta', cx: 210, cy: 204, r: 12, lx: 210, ly: 190, tools: { prof: aortaTool } },
    { id: 'cie', label: 'Ciego', short: 'Ciego', cx: 118, cy: 354, r: 13, lx: 112, ly: 376, anchor: 'end',
      tools: { prof: () => T('<b>ciego</b> palpable como una masa blanda, de unos 4–5 cm, ligeramente gorgoteante, móvil e <b>indolora</b> en la fosa ilíaca derecha; el apéndice normal no se palpa.', true, false) } },
    { id: 'sig', label: 'Colon sigmoides', short: 'Sigmoides', cx: 302, cy: 354, r: 13, lx: 308, ly: 376, anchor: 'start',
      tools: { prof: () => T('<b>sigmoides</b>: cordón liso y firme de 2–3 cm, móvil, a veces con heces en su interior, <b>indoloro</b> (el colon descendente se palpa de forma similar en el flanco).', true, false) } },
    { id: 'vej', label: 'Vejiga', short: 'Vejiga', cx: 210, cy: 372, r: 20, lx: 210, ly: 420,
      tools: { sup: c => T(st(c).bladder ? '<b>vejiga llena</b>: se palpa una masa suave, lisa, simétrica y de borde superior convexo por encima de la sínfisis (≈ 400 mL), que genera deseo miccional; es mate a la percusión y desaparece al orinar.' : '<b>vejiga no palpable</b> por encima de la sínfisis del pubis (vacía); región suprapúbica blanda e indolora, sin globo vesical.', false, false),
        prof: c => T(st(c).bladder ? '<b>vejiga llena</b>: masa suave de borde superior convexo, indolora, algo molesta; mate a la percusión.' : '<b>vejiga no palpable</b>; hipogastrio blando e indoloro a la presión profunda.', true, false) } },
    { id: 'gl', label: 'Ganglios inguinales derechos', short: 'Ganglios ing. D', cx: 138, cy: 398, r: 12, lx: 124, ly: 428, anchor: 'end',
      tools: { sup: () => T('ganglios inguinales (horizontales) pequeños: ≤ 1 cm, blandos, móviles e indoloros (hallazgo normal); sin adenopatías.', false, false),
        prof: () => T('ganglios inguinales ≤ 1 cm, blandos, móviles e indoloros (hallazgo normal); sin adenopatías ni masas.', true, false) } },
    { id: 'gl2', label: 'Ganglios inguinales izquierdos', short: 'Ganglios ing. I', cx: 282, cy: 398, r: 12, lx: 296, ly: 428, anchor: 'start',
      tools: { sup: () => T('ganglios inguinales ≤ 1 cm, blandos, móviles e indoloros (normal).', false, false),
        prof: () => T('ganglios inguinales ≤ 1 cm, blandos, móviles e indoloros (normal); sin adenopatías.', true, false) } },
    { id: 'omb', label: 'Anillo umbilical', short: 'Ombligo', cx: 210, cy: UMB, r: 13,
      tools: { vals: () => T('<b>sin hernia umbilical</b>: con Valsalva (toser o elevar la cabeza) el anillo umbilical está cerrado y no se produce protrusión ni impulso a la tos.', false, false), sup: () => T('ombligo sin masas ni dolor; anillo cerrado.', false, false) } },
    { id: 'ingd', label: 'Región inguinal derecha', short: 'Hernia ing. D', cx: 176, cy: 372, r: 14, lx: 176, ly: 350,
      tools: { vals: () => T('<b>sin hernias inguinales ni crurales derechas</b>: con Valsalva, tos y en bipedestación no hay protrusión ni impulso en el canal inguinal (dedo en el anillo superficial).', false, false) } },
    { id: 'ingi', label: 'Región inguinal izquierda', short: 'Hernia ing. I', cx: 244, cy: 372, r: 14, lx: 244, ly: 350,
      tools: { vals: () => T('<b>sin hernias inguinales ni crurales izquierdas</b>: sin protrusión ni impulso con Valsalva y tos.', false, false) } },
    { id: 'lin', label: 'Línea alba', short: 'Línea alba', x: 198, y: 120, w: 24, h: 66, rx: 6, lx: 230, ly: 150, anchor: 'start',
      tools: { vals: () => T('<b>sin diástasis de los rectos ni hernia epigástrica</b>: al elevar la cabeza (Valsalva) la línea alba no se abomba ni se palpa defecto aponeurótico.', false, false) } }
  ];
  const palpSvg = abdSVG({ grid: 'nine', liver: true, organs: true, bladder: true });
  const palpacion = {
    id: 'palp', label: 'Palpación', viewBox: '0 0 420 520',
    hint: 'Manos tibias, uñas cortas, paciente relajado con las rodillas semiflexionadas. Empieza lejos de cualquier zona dolorosa; primero superficial, luego profunda.',
    svg: palpSvg,
    tools: [
      { id: 'sup', icon: '✋', label: 'Palpación superficial', hint: 'Presión suave (1-2 cm) con la palma y los dedos juntos: busca defensa, dolor, masas superficiales y hernias.' },
      { id: 'prof', icon: '🤲', label: 'Profunda / bimanual', hint: 'Presión profunda para vísceras y masas: hígado, vesícula, bazo, riñones, aorta, ciego, sigmoides. Respeta la inspiración profunda.' },
      { id: 'vals', icon: '💨', label: 'Valsalva / tos (hernias)', hint: 'Pide toser o hacer Valsalva y busca protrusión o impulso en el ombligo, la línea alba y las regiones inguinales.' }
    ],
    regions: palpNine.concat(palpOrgans),
    after(stage, sh, ctx) { bladderSeg(stage, sh, ctx, palpacion); },
    onLeave: clearRT
  };

  /* =====================================================================
     5) MANIOBRAS (todas negativas) + vista posterior para Giordano
     ===================================================================== */
  function backSVG() {
    const x0 = 440;
    let s = `<g transform="translate(${x0} 0)">`;
    s += `<text x="100" y="24" class="svg-title" text-anchor="middle">Región lumbar (posterior)</text>`;
    s += `<path d="M20,40 L180,40 C186,140 176,260 182,340 L172,420 L28,420 L18,340 C24,260 14,140 20,40 Z" fill="${SKIN}" stroke="${EDGE}" stroke-width="3"/>`;
    s += `<path d="M100,40 V420" stroke="${LINE}" stroke-width="4" stroke-dasharray="3 6" stroke-linecap="round"/>`;
    s += `<path d="M100,150 Q140,162 172,206 M100,150 Q60,162 28,206" fill="none" stroke="#c9a283" stroke-width="3"/>`;
    s += `<path d="M26,332 Q100,296 174,332" fill="none" stroke="#c9a283" stroke-width="3"/>`;
    s += `<text x="12" y="62" class="svg-small">I</text><text x="180" y="62" class="svg-small">D</text>`;
    s += `<g class="hintring"><text x="100" y="140" class="svg-hint" text-anchor="middle">12.ª costilla</text><text x="100" y="318" class="svg-hint" text-anchor="middle">Cresta ilíaca</text></g>`;
    s += '</g>';
    return s;
  }
  const manSvg = (learn, c) => abdSVG({ grid: 'nine' })(learn, c) + backSVG();
  const mt = (html, anim) => ({ html, run: anim ? (ctx => note(ctx, anim)) : null });
  const maniobras = {
    id: 'man', label: 'Maniobras', viewBox: '0 0 660 520',
    hint: 'Maniobras de irritación peritoneal y signos clásicos. En esta persona sana todas son negativas.',
    svg: manSvg,
    tools: [
      { id: 'murphy', icon: '🫗', label: 'Murphy', hint: 'Presiona bajo el reborde costal derecho (borde lateral del recto) y pide inspirar profundamente.' },
      { id: 'mcburney', icon: '📍', label: 'McBurney', hint: 'Presiona el punto de McBurney: unión del tercio externo con los dos tercios internos de la línea EIAS derecha-ombligo.' },
      { id: 'blumberg', icon: '↩️', label: 'Blumberg (rebote)', hint: 'Presiona lentamente en cualquier zona y suelta de golpe. Prueba en la fosa ilíaca derecha y en el resto del abdomen.' },
      { id: 'rovsing', icon: '🔄', label: 'Rovsing', hint: 'Presiona la fosa ilíaca izquierda, empujando el gas hacia el ciego, y pregunta por dolor en la derecha.' },
      { id: 'psoas', icon: '🦵', label: 'Signo del psoas', hint: 'Haz clic en el muslo derecho: elevar el muslo extendido contra resistencia.' },
      { id: 'obt', icon: '🌀', label: 'Signo del obturador', hint: 'Haz clic en el muslo derecho: flexión de cadera y rodilla a 90° con rotación interna.' },
      { id: 'onda', icon: '〰️', label: 'Onda ascítica', hint: 'Haz clic en un flanco: golpe en un flanco con la mano de un ayudante en la línea media.' },
      { id: 'giordano', icon: '👊', label: 'Giordano (puñopercusión)', hint: 'Haz clic en el ángulo costovertebral de la vista posterior: golpe suave con el borde cubital del puño sobre la mano apoyada.' }
    ],
    regions: [
      { id: 'abd', label: 'Abdomen', short: '', x: 88, y: 118, w: 244, h: 284, rx: 14,
        tools: { blumberg: () => mt('<b>Blumberg negativo</b>: tras presionar lentamente y soltar de golpe no hay dolor al descomprimir (no hay irritación peritoneal); no hay defensa ni rigidez.', '↓ presionar … ↑ soltar') } },
      { id: 'mur', label: 'Punto de Murphy', short: 'Murphy', cx: 150, cy: 146, r: 12, lx: 150, ly: 124,
        tools: { murphy: () => mt('<b>signo de Murphy negativo</b>: al presionar bajo el reborde costal derecho (borde lateral del recto) el paciente inspira profundamente sin dolor y sin detener la inspiración.', 'inspire …') } },
      { id: 'mcb', label: 'Punto de McBurney', short: 'McBurney', cx: 139, cy: 319, r: 12, lx: 126, ly: 346, anchor: 'end',
        tools: {
          mcburney: () => mt('<b>McBurney negativo</b>: la presión en el punto de McBurney (1/3 externo de la línea EIAS-ombligo) es <b>indolora</b>, sin defensa muscular.', '↓ presión'),
          blumberg: () => mt('<b>Blumberg negativo</b> en fosa ilíaca derecha: no hay dolor al soltar de golpe tras la presión lenta.', '↓ presionar … ↑ soltar')
        } },
      { id: 'lif', label: 'Fosa ilíaca izquierda', short: 'Rovsing', cx: 296, cy: 340, r: 18, lx: 296, ly: 366, anchor: 'middle',
        tools: {
          rovsing: () => mt('<b>Rovsing negativo</b>: la presión en la fosa ilíaca izquierda (con empuje retrógrado del colon descendente) no provoca dolor en la fosa ilíaca derecha.', '↓ presión FII'),
          blumberg: () => mt('<b>Blumberg negativo</b> en fosa ilíaca izquierda: sin dolor al descomprimir.', '↓ presionar … ↑ soltar')
        } },
      { id: 'flD', label: 'Flanco derecho', short: '', x: 88, y: 222, w: 46, h: 90, lx: 82, ly: 270, anchor: 'end',
        tools: { onda: waveTool } },
      { id: 'flI', label: 'Flanco izquierdo', short: '', x: 286, y: 222, w: 46, h: 90, lx: 338, ly: 270,
        tools: { onda: waveTool } },
      { id: 'muslo', label: 'Muslo derecho', short: 'Psoas / obturador', x: 70, y: 448, w: 128, h: 68, rx: 14, lx: 134, ly: 470,
        tools: {
          psoas: () => mt('<b>signo del psoas negativo</b>: al elevar el muslo derecho extendido contra la resistencia de la mano del examinador (o al extender la cadera en decúbito lateral izquierdo) no aparece dolor abdominal.', '↑ elevar el muslo'),
          obt: () => mt('<b>signo del obturador negativo</b>: con cadera y rodilla a 90°, la rotación interna de la cadera derecha no produce dolor en el hipogastrio ni en la fosa ilíaca derecha.', '⟲ rotación interna')
        } },
      { id: 'cvd', label: 'Ángulo costovertebral derecho', short: 'ACV D', cx: 440 + 138, cy: 188, r: 17, lx: 440 + 100 + 62, ly: 164,
        tools: { giordano: () => mt('<b>Giordano (puñopercusión lumbar) negativo a la derecha</b>: el golpe suave con el borde cubital del puño en el ángulo costovertebral (entre la 12.ª costilla y la columna) no provoca dolor.', 'golpe suave') } },
      { id: 'cvi', label: 'Ángulo costovertebral izquierdo', short: 'ACV I', cx: 440 + 62, cy: 188, r: 17, lx: 440 + 100 - 62, ly: 164,
        tools: { giordano: () => mt('<b>Giordano negativo a la izquierda</b>: sin dolor a la puñopercusión lumbar; es un signo simétrico.', 'golpe suave') } }
    ],
    onLeave: clearRT
  };

  /* =====================================================================
     CUESTIONARIO
     ===================================================================== */
  const PK = { 28: 0, 45: 1, 72: 2 };
  function mk(k, q, correct, wrongs, why) {
    const opts = wrongs.slice();
    const pos = k % (opts.length + 1);
    opts.splice(pos, 0, correct);
    return { q, options: opts, a: pos, why };
  }
  const quiz = c => {
    const p = pd(c), k = (PK[c.age] || 0);
    const span = p.span;
    return [
      mk(k, 'Orden clásico de la exploración abdominal', 'Inspección, auscultación, percusión y palpación',
        ['Inspección, palpación, percusión y auscultación', 'Palpación, percusión, auscultación e inspección', 'Percusión, palpación, inspección y auscultación'],
        'La percusión y la palpación pueden modificar la actividad intestinal; por eso se ausculta antes de tocar el abdomen.'),
      mk(k + 1, 'Frecuencia normal de ruidos hidroaéreos', '5–30 por minuto',
        ['1–2 por minuto', '40–60 por minuto', 'Ausentes en reposo'],
        'Se consideran ausentes solo tras auscultar 2-5 minutos en cada cuadrante. Regla práctica: ~3 ruidos en 10 s ≈ 18/min.'),
      mk(k + 2, 'Altura de la matidez hepática en la LMC de esta persona (normal 6–12 cm)', `${span} cm`,
        [`${span - 4} cm`, `${span + 6} cm`, 'No se puede medir'],
        `Percutiendo de arriba abajo en la LMC derecha la matidez comienza en el 5.º espacio intercostal y termina en el reborde costal: ≈ ${span} cm en esta persona.`),
      mk(k + 3, 'Límite superior de la matidez hepática en la línea medioclavicular', '5.º espacio intercostal',
        ['2.º espacio intercostal', '8.º espacio intercostal', 'Reborde costal'],
        'El hígado se percute desde la sonoridad pulmonar hacia abajo; el borde superior es el 5.º EIC en la LMC y el inferior coincide con el reborde costal.'),
      mk(k, 'Sonido normal en el espacio de Traube', 'Timpánico (cámara gástrica)',
        ['Mate por el bazo', 'Mate por el hígado', 'Resonante pulmonar'],
        'Bajo el hemitórax izquierdo se encuentra la burbuja gástrica: el timpanismo es normal; la matidez en esa zona no lo es.'),
      mk(k + 1, 'Borde hepático a la palpación en esta persona',
        p.liver ? 'Palpable ≈ 1 cm bajo el reborde en inspiración, liso, romo y blando' : 'No palpable bajo el reborde costal',
        p.liver
          ? ['No palpable', 'Palpable 5 cm, duro e irregular', 'Palpable, doloroso y de borde cortante']
          : ['Palpable 5 cm bajo el reborde, duro e irregular', 'Palpable 1 cm, doloroso y de borde cortante', 'Siempre palpable 3 cm en todas las personas'],
        p.liver ? 'En personas delgadas el borde puede palparse 1–2 cm bajo el reborde en inspiración profunda: liso, romo, blando e indoloro.'
          : 'El hígado normal suele no palparse; si se palpa, no pasa de 1–2 cm bajo el reborde y es liso, romo, blando e indoloro.'),
      mk(k + 2, 'Diámetro normal de la aorta abdominal', 'Menor de 3 cm, pulsátil con expansión lateral',
        ['Mayor de 4 cm y no pulsátil', 'Exactamente 5 cm', 'No debe percibirse nunca en ninguna persona'],
        'Un diámetro ≥ 3 cm define un aneurisma de aorta abdominal; en personas delgadas la aorta normal se palpa como pulsación en la línea media.'),
      mk(k + 3, 'Un signo de Murphy negativo significa que', 'Al presionar bajo el reborde costal derecho se inspira profundamente sin dolor ni interrupción',
        ['El paciente detiene la inspiración por dolor', 'Hay dolor al soltar de golpe en la fosa ilíaca derecha', 'El hígado es palpable y doloroso'],
        'El Murphy se busca con presión en el punto cístico; la detención de la inspiración por dolor lo hace positivo.')
    ];
  };

  NormalEngine.build({
    id: 'abdomen', title: 'Abdomen (normal)', icon: '🫃', group: 'Exploración normal',
    desc: 'Exploración física normal del abdomen: inspección, auscultación, percusión, palpación y maniobras.',
    bullets: ['Cuadrantes y 9 regiones', 'Ruidos hidroaéreos y matidez hepática', 'Palpación superficial y profunda, Murphy, McBurney, Blumberg'],
    teaching: [
      'Orden: inspección → auscultación → percusión → palpación; la auscultación va antes para no alterar los ruidos intestinales.',
      'Paciente en decúbito supino, relajado, con las rodillas semiflexionadas, manos y fonendoscopio tibios; comienza lejos de cualquier zona dolorosa.',
      'Ruidos hidroaéreos normales: 5–30/min; se dan por ausentes solo tras 2–5 minutos de escucha. Busca soplos en aorta, renales, ilíacas y femorales.',
      'Altura hepática en la LMC: 6–12 cm (típico 7–10); borde superior en el 5.º EIC y borde inferior en el reborde costal; el espacio de Traube es timpánico.',
      'Palpa en inspiración profunda: hígado (borde romo, blando, liso), aorta (< 3 cm) y ciego/sigmoides; el bazo, la vesícula y los riñones normales no se palpan (salvo variantes en personas delgadas).'
    ],
    scenes: [inspeccion, auscultacion, percusion, palpacion, maniobras],
    quiz
  });
})();
