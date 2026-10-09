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

  /* Datos normales por persona (clave = id de NormalEngine.people; hay valor por defecto según sexo).
     span = hepatimetría en la LMC (cm): 6–12 cm; ≈ 10–12 en el varón adulto y menor en la mujer (Argente-Álvarez). */
  const PD = {
    p1: {   // 28 F, delgada
      form: 'plano', bulge: 0, span: 8, aorta: '2,0', liver: 1,
      formTxt: 'abdomen plano, de contorno suave (la pared abdominal queda al nivel del plano que une el apéndice xifoides con el pubis)',
      skin: 'piel lisa, elástica y de color uniforme; sin estrías, cicatrices ni lesiones; vello púbico de distribución ginecoide (triángulo de base superior)',
      resp: 'predominio costal superior, propio de la mujer, con discreto movimiento abdominal',
      amp: 0.012, pulse: 'se aprecia un latido aórtico epigástrico discreto (frecuente en personas delgadas), no expansivo',
      bw: { csd: 10, csi: 10, cid: 20, cii: 10 }, kidney: true
    },
    p2: {   // 45 M
      form: 'plano-globoso', bulge: 6, span: 11, aorta: '2,2', liver: 0,
      formTxt: 'abdomen plano a ligeramente globoso por panículo adiposo fisiológico, simétrico y sin distensión',
      skin: 'piel íntegra, de color uniforme, con vello abdominal escaso de distribución normal; sin estrías, cicatrices ni lesiones; vello púbico de distribución androide (en rombo, hacia el ombligo)',
      resp: 'predominio costoabdominal (diafragmático), propio del varón',
      amp: 0.03, pulse: 'no se ven latidos ni movimientos peristálticos',
      bw: { csd: 10, csi: 10, cid: 20, cii: 10 }, kidney: false
    },
    p3: {   // 72 M, cintura 94 cm
      form: 'globoso', bulge: 14, span: 10, aorta: '2,6', liver: 0,
      formTxt: 'abdomen globoso por aumento del panículo adiposo y menor tono de la pared (cintura 94 cm, en el límite de riesgo cardiometabólico); es simétrico, blando y sin distensión',
      skin: 'piel más fina y seca, con pérdida fisiológica de elasticidad; algún angioma rubí aislado y lentigos solares (benignos, propios de la edad); sin cicatrices ni circulación colateral',
      resp: 'predominio costoabdominal (diafragmático), propio del varón',
      amp: 0.026, pulse: 'no se ven latidos ni movimientos peristálticos',
      bw: { csd: 10, csi: 10, cid: 10, cii: 10 }, kidney: false
    },
    p4: {   // 60 F, posmenopáusica, IMC 23,8, cintura 82 cm
      form: 'plano-globoso', bulge: 6, span: 9, aorta: '2,2', liver: 0,
      formTxt: 'abdomen plano a ligeramente globoso por panículo adiposo fisiológico (cintura 82 cm, por encima del umbral de 80 cm de la OMS para la mujer, sin otros datos de riesgo), simétrico y sin distensión',
      skin: 'piel íntegra, de color uniforme, con discreta pérdida de elasticidad propia de la edad; sin estrías activas, cicatrices ni lesiones; vello púbico de distribución ginecoide, más ralo tras la menopausia',
      resp: 'predominio costal superior, propio de la mujer, con discreto movimiento abdominal',
      amp: 0.016, pulse: 'no se ven latidos ni movimientos peristálticos',
      bw: { csd: 10, csi: 10, cid: 15, cii: 10 }, kidney: false
    }
  };
  const pd = c => PD[c.id] || (c.sex === 'F' ? PD.p4 : PD.p2);
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
          `<text x="94" y="234" class="svg-hint" text-anchor="end">Reborde costal</text>` +
          `<text x="218" y="98" class="svg-hint">Apéndice xifoides</text>` +
          `<text x="216" y="56" class="svg-hint">Línea media</text>` +
          `<text x="226" y="${UMB + 16}" class="svg-hint">Ombligo</text>` +
          `<text x="94" y="${ASY - 10}" class="svg-hint" text-anchor="end">EIAS</text><text x="326" y="${ASY - 10}" class="svg-hint">EIAS</text>` +
          `<text x="210" y="418" class="svg-hint" text-anchor="middle">Sínfisis del pubis</text>` +
          `<text x="${LX}" y="438" class="svg-hint" text-anchor="middle">LMC D</text><text x="${RX}" y="438" class="svg-hint" text-anchor="middle">LMC I</text></g>`;
        s += `<g class="hintring" fill="none" stroke="${TEAL}" stroke-width="1.4" stroke-dasharray="2 4" opacity=".6"><path d="M${LX},130 V424 M${RX},130 V424"/></g>`;
      }
      /* marcas de la hepatimetría (los órganos se dibujan en la capa anatómica) */
      if (o.liver) {
        const y5v = y5;
        s += `<g class="hintring">` +
          `<circle cx="${LX}" cy="${y5v}" r="4" fill="#d9534f"/><circle cx="${LX}" cy="${LMCY}" r="4" fill="#d9534f"/>` +
          `<text x="${LX - 26}" y="${y5v - 6}" class="svg-hint" text-anchor="end">5.º EIC (LMC)</text>` +
          `<path d="M${LX - 16},${y5v} V${LMCY}" stroke="#d9534f" stroke-width="2"/>` +
          `<text x="${LX - 22}" y="${(y5v + LMCY) / 2 + 4}" class="svg-hint" text-anchor="end">${p.span} cm</text></g>`;
      }
      if (o.bladder) {
        s += `<text x="210" y="348" class="svg-hint hintring" text-anchor="middle">${st(c).bladder ? 'Vejiga llena (≈ 400 mL)' : 'Vejiga'}</text>`;
      }
      return s;
    };
  }

  /* ---------- capa anatómica translúcida (#anat): vísceras bajo la piel ----------
     Depende de la persona: límite superior del hígado (hepatimetría), sexo (útero) y estado de la vejiga.
     Colores: hígado #9e4b3a, estómago #e9c48a, bazo #8e5a9b, riñón #c0504d, colon #e2b48a, aorta #c0392b, vejiga #e8cd5a. */
  const al = (txt, x, y, anchor) => `<text class="svg-small" x="${x}" y="${y}" text-anchor="${anchor || 'middle'}" style="paint-order:stroke;stroke:#fff;stroke-width:3px;stroke-linejoin:round">${txt}</text>`;
  function anatAbd(opts) {
    return function (learn, c) {
      const o = opts || {}, y5 = y5of(c), full = st(c).bladder;
      let s = '';
      /* riñones (retroperitoneales: contorno discontinuo; el izquierdo más alto) y arterias renales */
      s += `<ellipse cx="150" cy="238" rx="15" ry="30" transform="rotate(12 150 238)" fill="#c0504d" fill-opacity=".5" stroke="#8a3a3a" stroke-width="1.2" stroke-dasharray="4 3"/>`;
      s += `<ellipse cx="268" cy="226" rx="15" ry="30" transform="rotate(-12 268 226)" fill="#c0504d" fill-opacity=".5" stroke="#8a3a3a" stroke-width="1.2" stroke-dasharray="4 3"/>`;
      /* vena cava inferior y aorta con su bifurcación (L4, a la altura del ombligo) e ilíacas */
      s += `<path d="M198,140 V266 M198,266 L170,318 M198,266 L236,318" fill="none" stroke="#4a6fa5" stroke-width="7" stroke-linecap="round" opacity=".6"/>`;
      s += `<path d="M212,214 L166,232 M212,214 L258,222" stroke="#c0392b" stroke-width="3" fill="none"/>`;
      s += `<path d="M212,140 V${UMB}" stroke="#c0392b" stroke-width="8" stroke-linecap="round"/>`;
      s += `<path d="M212,${UMB} L178,322 L152,382 M212,${UMB} L246,322 L270,382" fill="none" stroke="#c0392b" stroke-width="5" stroke-linecap="round"/>`;
      /* intestino delgado esbozado */
      s += `<path d="M150,236 C180,230 200,250 170,262 C140,274 150,300 186,296 C220,292 230,320 196,332 C160,344 184,372 214,360 C244,350 262,318 236,300 C214,286 226,256 256,262 C280,268 272,300 268,330" fill="none" stroke="#cfa781" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>`;
      s += `<path d="M150,236 C180,230 200,250 170,262 C140,274 150,300 186,296 C220,292 230,320 196,332 C160,344 184,372 214,360 C244,350 262,318 236,300 C214,286 226,256 256,262 C280,268 272,300 268,330" fill="none" stroke="#f3dcc0" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>`;
      /* colon: ciego, ascendente, transverso, descendente y sigmoides */
      const colon = 'M112,350 C100,340 100,320 102,300 L104,210 C106,196 120,188 136,186 L170,190 C200,240 260,236 300,190 L316,186 C330,184 330,196 328,210 L324,330 C322,350 300,362 282,370 C262,378 236,376 226,392';
      s += `<path d="${colon}" fill="none" stroke="#b98a63" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>`;
      s += `<path d="${colon}" fill="none" stroke="#e2b48a" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>`;
      s += `<path d="${colon}" fill="none" stroke="#c9a283" stroke-width="16" stroke-dasharray="2 10" opacity=".45"/>`;
      s += `<circle cx="112" cy="346" r="14" fill="#e2b48a" stroke="#b98a63" stroke-width="1.5"/><path d="M114,358 C108,372 98,380 92,392" fill="none" stroke="#b98a63" stroke-width="3" stroke-linecap="round"/>`;
      /* bazo (bajo las costillas 9.ª–11.ª, línea axilar media izquierda) y estómago con la cámara gástrica */
      s += `<ellipse cx="318" cy="170" rx="11" ry="28" transform="rotate(-15 318 170)" fill="#8e5a9b" fill-opacity=".85" stroke="#5e3a68" stroke-width="1.2"/>`;
      s += `<path d="M250,118 C256,92 294,86 310,108 C324,130 318,164 300,190 C286,210 258,218 236,210 C218,204 214,188 226,180 C240,176 250,186 254,172 C258,152 248,136 250,118 Z" fill="#e9c48a" fill-opacity=".9" stroke="#c99a55" stroke-width="1.5"/>`;
      s += `<ellipse cx="282" cy="118" rx="17" ry="13" fill="#f8ecd2" stroke="#c99a55" stroke-width="1" stroke-dasharray="3 2"/>`;
      /* páncreas esbozado (retrogástrico: cabeza en el marco duodenal, cola hacia el bazo) */
      s += `<path d="M190,200 C182,214 196,228 212,222 C250,210 274,196 300,176 C296,170 290,168 284,172 C256,190 236,204 212,206 C204,206 198,196 190,200 Z" fill="#efd8b0" fill-opacity=".7" stroke="#b89a6a" stroke-width="1.2" stroke-dasharray="4 3"/>`;
      /* hígado: borde superior en el 5.º EIC (según la hepatimetría de la persona) e inferior en el reborde costal; vesícula en el punto cístico */
      s += `<path d="M${LX - 40},${y5 + 40} C${LX - 30},${y5 + 6} ${LX + 10},${y5 - 8} ${LX + 50},${y5 + 4} C${LX + 95},${y5 + 14} ${LX + 125},${y5 + 46} ${LX + 118},${y5 + 76} C${LX + 100},${y5 + 96} ${LX + 60},${LMCY - 12} ${LX + 10},${LMCY + 2} C${LX - 16},${LMCY + 14} ${LX - 36},${LMCY + 36} ${LX - 38},${LMCY + 50} C${LX - 50},${LMCY + 20} ${LX - 50},${y5 + 70} ${LX - 40},${y5 + 40} Z" fill="#9e4b3a" fill-opacity=".85" stroke="#6e3326" stroke-width="1.5"/>`;
      s += `<ellipse cx="150" cy="152" rx="8" ry="13" transform="rotate(-25 150 152)" fill="#7fa36b" stroke="#4f7a3b" stroke-width="1.2"/>`;
      /* útero (mujer) detrás de la vejiga; vejiga vacía tras el pubis o llena por encima de la sínfisis */
      if (isF(c)) {
        s += `<path d="M196,346 C180,338 170,342 166,352 M224,346 C240,338 250,342 254,352" fill="none" stroke="#a35a6c" stroke-width="2"/>` +
             `<ellipse cx="164" cy="356" rx="6" ry="8" fill="#e8d27a" stroke="#a35a6c" stroke-width="1"/><ellipse cx="256" cy="356" rx="6" ry="8" fill="#e8d27a" stroke="#a35a6c" stroke-width="1"/>` +
             `<path d="M210,340 C224,340 230,354 226,370 C222,384 198,384 194,370 C190,354 196,340 210,340 Z" fill="#d98fa0" fill-opacity=".9" stroke="#a35a6c" stroke-width="1.5"/>`;
      }
      s += full
        ? `<ellipse cx="210" cy="378" rx="36" ry="26" fill="#e8cd5a" fill-opacity=".85" stroke="#b79a1a" stroke-width="1.5"/>`
        : `<ellipse cx="210" cy="394" rx="22" ry="11" fill="#e8cd5a" fill-opacity=".85" stroke="#b79a1a" stroke-width="1.5"/>`;
      /* rótulos */
      s += al('Hígado', 160, 98, 'start') + al('Estómago', 304, 114, 'start') + al('Traube', 282, 122) + al('Bazo', 334, 172, 'start');
      s += al('Páncreas', 236, 224, 'start') + al('Riñón D', 110, 243, 'end') + al('Riñón I', 298, 222, 'start') + al('Aorta', 194, 164, 'end') + al('Bifurcación L4', 222, 257, 'start');
      s += al('Colon transverso', 156, 256, 'end') + al('Colon asc.', 100, 316) + al('Colon desc.', 324, 298) + al('Intestino delgado', 248, 322, 'start');
      if (isF(c)) s += al('Útero', 238, 366, 'start');
      /* vista posterior (maniobras): riñones bajo la 12.ª costilla */
      if (o.back) {
        s += `<g transform="translate(440 0)">` +
          `<ellipse cx="138" cy="182" rx="16" ry="34" transform="rotate(-8 138 182)" fill="#c0504d" fill-opacity=".6" stroke="#8a3a3a" stroke-width="1.2"/>` +
          `<ellipse cx="62" cy="170" rx="16" ry="34" transform="rotate(8 62 170)" fill="#c0504d" fill-opacity=".6" stroke="#8a3a3a" stroke-width="1.2"/>` +
          al('Riñón D', 138, 236) + al('Riñón I', 62, 224) + '</g>';
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
    const learn = ctx.sh.mode === 'learn';
    ctx.svg.querySelector('#bg').innerHTML = sc.svg(learn, ctx.c);
    const an = ctx.svg.querySelector('#anat');
    if (an && sc.anatomy) an.innerHTML = sc.anatomy(learn, ctx.c);
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
    hint: 'Paciente en decúbito dorsal, brazos a los lados, abdomen descubierto del xifoides al pubis, buena luz. Observa desde los pies y desde el lateral.',
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
        id: 'omb', label: 'Ombligo', short: '', cx: 210, cy: UMB, r: 15,
        tools: {
          ojo: () => 'Ombligo en la línea media, deprimido (invertido), de forma ovalada con piel normal; sin secreción, eritema, equimosis periumbilical ni nódulos; sin protrusión (anillo umbilical cerrado).',
          luz: () => 'Cicatriz umbilical sin abultamiento; no se ve protrusión al esfuerzo en reposo.'
        }
      },
      {
        id: 'ing', label: 'Región inguinal derecha', short: 'Ingle D', cx: 160, cy: 378, r: 18, lx: 160, ly: 354,
        tools: {
          ojo: () => 'Regiones inguinal y crural derechas sin abultamientos en reposo, simétricas con las izquierdas (las hernias se buscan de pie y con Valsalva en la palpación).',
          luz: () => 'Sin masas inguinales visibles en reposo.'
        }
      },
      {
        id: 'ing2', label: 'Región inguinal izquierda', short: 'Ingle I', cx: 260, cy: 378, r: 18, lx: 260, ly: 354,
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
        sh.log(`<b>Movimientos respiratorios:</b> el abdomen se eleva en la inspiración y desciende en la espiración, de forma simétrica y sincrónica (FR ${c.v.rr}/min); ${p.resp}. Sin respiración paradójica ni inmovilidad localizada (el abdomen que no se mueve con la respiración sugiere peritonitis).`, 'find');
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
    cid: ['Cuadrante inferior derecho', 'ciego, íleon terminal (válvula ileocecal)', 'Sobre la válvula ileocecal los RHA suelen ser algo más frecuentes.'],
    cii: ['Cuadrante inferior izquierdo', 'colon descendente y sigmoides', 'RHA algo más espaciados.']
  };
  function setStatus(ctx, title, sub) {
    const a = ctx.sh.$('#abdWT'), b = ctx.sh.$('#abdWS');
    if (a) a.textContent = title;
    if (b) b.textContent = sub;
  }
  const quadTool = id => (c, ctx) => {
    const rate = pd(c).bw[id], n10 = Math.round(rate / 6), q = QN[id];
    return {
      html: `<b>ruidos hidroaéreos (RHA)</b> presentes, ≈ ${rate}/min (normal 5–30/min; ≈ ${n10} en 10 s), de tono medio e intensidad moderada, irregulares; sin RHA aumentados ni de timbre metálico, sin borborigmos (RHA audibles a distancia) y sin silencio abdominal. Zona: ${q[1]}. ${q[2]}`,
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
    hint: 'Se ausculta ANTES de percutir y palpar (la palpación modifica el peristaltismo). Diafragma tibio en los 4 cuadrantes; los RHA se dan por ausentes solo tras escuchar varios minutos (2–5 min según la fuente).',
    svg: ausSvg,
    anatomy: anatAbd(),
    tools: [{ id: 'steth', icon: '🩺', label: 'Estetoscopio · diafragma', hint: 'Haz clic en un cuadrante (ruidos hidroaéreos) o en un punto vascular (soplos). “Contar 10 s” ayuda a estimar la frecuencia.' }],
    regions: [
      { id: 'csd', label: 'Cuadrante superior derecho', short: 'CSD', x: 90, y: 130, w: 118, h: 136, lx: 150, ly: 152, tools: { steth: quadTool('csd') } },
      { id: 'csi', label: 'Cuadrante superior izquierdo', short: 'CSI', x: 212, y: 130, w: 118, h: 136, lx: 270, ly: 152, tools: { steth: quadTool('csi') } },
      { id: 'cid', label: 'Cuadrante inferior derecho', short: 'CID', x: 90, y: 270, w: 118, h: 130, lx: 150, ly: 306, tools: { steth: quadTool('cid') } },
      { id: 'cii', label: 'Cuadrante inferior izquierdo', short: 'CII', x: 212, y: 270, w: 118, h: 130, lx: 270, ly: 306, tools: { steth: quadTool('cii') } },
      { id: 'ao', label: 'Aorta abdominal (epigastrio)', short: 'Aorta', cx: 210, cy: 214, r: 12, lx: 210, ly: 192,
        tools: { steth: bruit('Aorta abdominal', 'sin soplo sistólico en el epigastrio ni sobre la línea media supraumbilical; sin roce.', rateTop) } },
      { id: 'rd', label: 'Arteria renal derecha', short: 'Renal D', cx: 178, cy: 238, r: 11, lx: 164, ly: 244, anchor: 'end',
        tools: { steth: bruit('Arteria renal derecha', 'sin soplo renal (se ausculta 2–3 cm por encima del ombligo y 2–3 cm por fuera de la línea media); sin roce.', rateTop) } },
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
        if (!RT.act) { sh.log('Primero apoya el estetoscopio en un cuadrante y luego cuenta durante 10 s.', 'warn'); return; }
        if (RT.timer) clearInterval(RT.timer);
        const a = RT.act; let t = 10;
        setStatus({ sh }, a.label, `Contando… ${t} s`);
        RT.timer = setInterval(() => {
          t--;
          if (t > 0) { setStatus({ sh }, a.label, `Contando… ${t} s`); return; }
          clearInterval(RT.timer); RT.timer = null;
          const n = Math.round(a.rate / 6);
          setStatus({ sh }, a.label, `≈ ${n} ruidos en 10 s`);
          sh.log(`<b>${a.label}:</b> en 10 s se cuentan ≈ ${n} RHA (≈ ${a.rate}/min; regla práctica: ~3 ruidos en 10 s ≈ 18/min). Normal: 5–30/min.`, 'find');
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
  const TYM = 'timpanismo (sonido de tono alto, intenso y de duración larga, “de tambor”) por el gas intraluminal';
  function percNine(id) {
    return (c) => {
      const full = st(c).bladder;
      switch (id) {
        case 'hd': return dullT(`<b>matidez hepática</b> (sonido mate: tono bajo, poco intenso y de corta duración) donde el hígado contacta con la pared; la hepatimetría se mide en la franja LMC D. Por debajo del reborde costal pasa a timpanismo.`);
        case 'ep': return tymp(`${TYM}, correspondiente a la cámara gástrica; submatidez solo en la zona alta bajo el xifoides (lóbulo izquierdo del hígado).`);
        case 'hi': return tymp(`${TYM}: cámara gástrica y ángulo esplénico del colon.`);
        case 'fd': return tymp(`${TYM} (colon ascendente); sin matidez en el flanco.`);
        case 'mes': return tymp(`${TYM}: asas de intestino delgado y colon transverso.`);
        case 'fi': return tymp(`${TYM} (colon descendente); sin matidez en el flanco.`);
        case 'fid': return tymp(`${TYM} (ciego e íleon terminal).`);
        case 'fii': return tymp(`${TYM} (sigmoides).`);
        default:
          return full
            ? dullT('<b>matidez suprapúbica</b> de límite superior convexo hacia arriba (vejiga distendida, ≈ 400 mL), que no sobrepasa 2–3 cm sobre la sínfisis. Desaparece al orinar: es un hallazgo fisiológico.')
            : tymp(`${TYM}: sin matidez suprapúbica (vejiga vacía).`);
      }
    };
  }
  const dispTool = (c) => ({
    html: '<b>matidez desplazable negativa</b>: en decúbito dorsal los flancos son timpánicos; al girar al paciente al decúbito lateral el flanco declive sigue timpánico y el límite de la nota no cambia (no hay líquido libre en la cavidad; la maniobra necesita un volumen apreciable de líquido, del orden de 1 L según la fuente).',
    run: () => Sound.percuss('hyper')
  });
  const waveTool = () => ({
    html: '<b>onda ascítica negativa</b>: con el borde cubital de la mano de un ayudante apoyado en la línea media (para bloquear la onda de la pared), un golpe seco en un flanco no transmite ninguna onda líquida a la mano apoyada en el flanco opuesto.',
    run: ctx => note(ctx, 'golpe → sin onda')
  });
  const percNineRegs = nine(id => {
    const t = { perc: percNine(id) };
    if (id === 'fd' || id === 'fi') { t.desp = dispTool; t.onda = waveTool; }
    return t;
  });
  const percSvg = abdSVG({ grid: 'nine', liver: true, bladder: true });
  const lmcStrip = {
    id: 'lmc', label: 'Franja LMC derecha (hepatimetría)', short: 'Franja LMC D', x: LX - 22, y: 8, w: 44, h: 214, rx: 8, lx: LX, ly: 20,
    tools: {
      perc: (c, ctx) => {
        const p = pd(c), y5 = y5of(c), y = ctx.point.y, alt = p.span;
        const NORM = `(normal 6–12 cm; ≈ 10–12 cm en el varón adulto y menor en la mujer)`;
        if (y < y5 - 8) return { html: '<b>sonoridad pulmonar</b> (sonido claro: tono bajo, intenso y prolongado) sobre la base del pulmón derecho.', run: () => Sound.percuss('resonant') };
        if (y < y5 + 4) return { html: `<b>límite superior de la matidez hepática</b> en el 5.º espacio intercostal (LMC): la sonoridad pulmonar pasa a matidez. Hepatimetría hasta el reborde costal ≈ <b>${alt} cm</b> ${NORM}.`, run: () => Sound.percuss('dull') };
        if (y < LMCY - 4) return { html: `<b>matidez hepática</b> (sonido mate). Hepatimetría en la LMC ≈ ${alt} cm ${NORM}.`, run: () => Sound.percuss('dull') };
        if (y < LMCY + 6) return { html: `<b>límite inferior de la matidez hepática</b> a nivel del reborde costal (se percute de abajo arriba, desde el timpanismo). Hepatimetría en la LMC = <b>${alt} cm</b> ${NORM}.`, run: () => Sound.percuss('dull') };
        return { html: 'por debajo del reborde costal: <b>timpanismo</b> (asas con gas); el hígado normal no sobrepasa el reborde.', run: () => Sound.percuss('hyper') };
      }
    }
  };
  const percusion = {
    id: 'perc', label: 'Percusión', viewBox: '0 0 420 520',
    hint: 'Percusión dígito-digital: el dedo medio percute sobre el dedo plesímetro apoyado en la pared. Recorre las regiones buscando el patrón normal de timpanismo y mide la matidez hepática (hepatimetría) en la LMC.',
    svg: percSvg,
    anatomy: anatAbd(),
    tools: [
      { id: 'perc', icon: '🖐️', label: 'Percusión dígito-digital', hint: 'Percute las regiones y recorre la franja LMC D de arriba abajo para hallar los límites superior e inferior de la matidez hepática.' },
      { id: 'desp', icon: '↔️', label: 'Matidez desplazable', hint: 'Haz clic en un flanco: se compara la nota en decúbito dorsal y en decúbito lateral.' },
      { id: 'onda', icon: '〰️', label: 'Onda ascítica', hint: 'Haz clic en un flanco: golpe en un flanco con la mano de un ayudante en la línea media.' }
    ],
    regions: percNineRegs.concat([
      lmcStrip,
      {
        id: 'traube', label: 'Espacio de Traube', short: '', cx: 268, cy: 128, r: 19,
        tools: { perc: () => tymp('<b>espacio de Traube timpánico</b> (semiluna en la base del hemitórax izquierdo, sobre la cámara gástrica; limitado por el 6.º cartílago costal, el reborde costal izquierdo y la línea axilar anterior). La matidez en esta zona no es normal (esplenomegalia, derrame pleural izquierdo).') }
      },
      {
        id: 'castell', label: 'Área esplénica (línea axilar media izquierda)', short: 'Área esplénica', cx: 326, cy: 200, r: 13, lx: 332, ly: 236,
        tools: { perc: () => tymp('<b>matidez esplénica normal</b>: pequeña franja de matidez entre la 9.ª y la 11.ª costilla sobre la línea axilar media izquierda, que no sobrepasa la línea axilar anterior ni el reborde costal (espacio de Traube timpánico). Al percutir el último espacio intercostal en la línea axilar anterior la nota sigue timpánica en inspiración y espiración (signo de Castell negativo, según la fuente).') }
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
  const SUP = lbl => `<i>Palpación superficial</i> en ${lbl.toLowerCase()}: pared <b>blanda y depresible</b>, <b>indolora</b>, sin defensa voluntaria ni contractura involuntaria, sin hiperestesia cutánea ni masas superficiales; tono muscular normal y temperatura simétrica.`;
  const DEEP = {
    hd: 'Hipocondrio derecho: sin masas ni dolor; el borde hepático y la vesícula se exploran en sus puntos específicos.',
    ep: 'Epigastrio: sin masas ni dolor; se percibe el latido de la aorta (punto “Aorta”); el estómago y el páncreas normales no se palpan.',
    hi: 'Hipocondrio izquierdo: sin masas ni dolor; el bazo no es palpable en inspiración profunda.',
    fd: 'Flanco derecho: colon ascendente blando, sin masas ni dolor.',
    mes: 'Región umbilical: sin masas ni dolor a la palpación profunda; se transmite el latido aórtico; asas blandas y depresibles.',
    fi: 'Flanco izquierdo: colon descendente blando, sin masas ni dolor.',
    fid: 'Fosa ilíaca derecha: sin masas ni dolor a la presión profunda; el ciego se percibe como una estructura blanda (punto “Ciego”).',
    hip: 'Hipogastrio: sin masas ni dolor; no se palpan la vejiga ni el útero por encima del pubis.',
    fii: 'Fosa ilíaca izquierda: sin masas ni dolor; el sigmoides se palpa como un cordón (punto “Sigmoides”).'
  };
  const palpNine = nine(id => ({
    sup: (c, ctx) => T(SUP(ctx.region.label), false, false),
    prof: (c, ctx) => T(`<i>Palpación profunda.</i> ${DEEP[id]} Pared blanda, sin defensa ni dolor a la descompresión.`, true, false)
  }));
  const liverTool = (c, ctx) => {
    const p = pd(c);
    const txt = p.liver
      ? `<b>borde hepático palpable</b> ≈ 1 cm por debajo del reborde costal derecho (LMC) en inspiración profunda: <b>liso, romo (no cortante), de consistencia blanda</b>, regular e indoloro; superficie lisa. Hepatimetría: ${p.span} cm. Variante normal en personas delgadas.`
      : `<b>borde hepático no palpable</b> bajo el reborde costal derecho en inspiración profunda (en algunas personas se palpa hasta 1–2 cm bajo el reborde, blando, liso, romo e indoloro). Hepatimetría: ${p.span} cm; el hígado normal no sobrepasa el reborde.`;
    return T(txt + ' <i>Técnica:</i> palpación monomanual simple (mano derecha plana, paralela al reborde, que asciende desde la fosa ilíaca en cada espiración y “recibe” el borde en la inspiración), <b>mano en cuchara</b> (dedos flexionados bajo el reborde) o <b>maniobra del enganche de Mathieu</b> (ambas manos desde arriba, dedos en gancho bajo el reborde).', true, false);
  };
  const aortaTool = c => T(`<b>aorta abdominal</b>: latido en la línea media (algo a la izquierda), por encima del ombligo, con <b>expansión lateral</b> al colocar una mano a cada lado (no solo anteroposterior); diámetro estimado ≈ ${pd(c).aorta} cm (normal < 3 cm); no se palpa masa pulsátil ni expansiva.`, true, false);
  const palpOrgans = [
    { id: 'hig', label: 'Hígado (borde hepático)', short: 'Hígado', cx: 124, cy: 176, r: 14, lx: 124, ly: 206, tools: { prof: liverTool } },
    { id: 'ves', label: 'Vesícula biliar (punto cístico)', short: 'Vesícula', cx: 152, cy: 146, r: 11, lx: 170, ly: 118, anchor: 'start',
      tools: { prof: () => T('<b>vesícula no palpable</b> (la vesícula normal no se palpa); sin dolor a la presión en el punto cístico (unión del reborde costal derecho con el borde externo del recto). Signo de Murphy negativo.', true, false) } },
    { id: 'baz', label: 'Bazo', short: 'Bazo', cx: 296, cy: 172, r: 13, lx: 316, ly: 150, anchor: 'start',
      tools: { prof: () => T('<b>bazo no palpable</b> en inspiración profunda (solo se palpa cuando su tamaño aumenta 2–3 veces). <i>Técnica:</i> bimanual en decúbito dorsal (mano izquierda en la fosa lumbar que empuja hacia delante y mano derecha bajo el reborde), <b>maniobra de Middleton</b> (puño del paciente bajo el hemitórax izquierdo; el examinador, a la izquierda y mirando a los pies, engancha el reborde con los dedos durante la inspiración) y, si hace falta, en decúbito lateral derecho (posición de Schuster). Espacio de Traube timpánico.', true, true) } },
    { id: 'rd', label: 'Riñón derecho', short: 'Riñón D', cx: 166, cy: 238, r: 13, lx: 150, ly: 268, anchor: 'end',
      tools: { prof: c => T(pd(c).kidney
        ? '<b>riñón derecho</b>: en esta persona delgada se palpa el <b>polo inferior</b> en inspiración profunda con la <b>maniobra de Guyon</b> (bimanual: mano izquierda en la fosa lumbar y mano derecha en el flanco, que presiona en inspiración): liso, redondeado, firme, con <b>peloteo renal</b> positivo (los impulsos de la mano posterior se perciben en la anterior), móvil con la respiración e indoloro. Variante normal en personas delgadas.'
        : '<b>riñón derecho no palpable</b> con la <b>maniobra de Guyon</b> (bimanual: mano posterior en la fosa lumbar, que empuja hacia delante, y mano anterior en el flanco, que presiona en inspiración profunda); sin peloteo renal; habitualmente los riñones no se palpan.', true, true) } },
    { id: 'ri', label: 'Riñón izquierdo', short: 'Riñón I', cx: 254, cy: 238, r: 13, lx: 270, ly: 268, anchor: 'start',
      tools: { prof: () => T('<b>riñón izquierdo no palpable</b> con la maniobra de Guyon (el riñón izquierdo es más alto y más difícil de palpar que el derecho); sin peloteo, sin dolor ni masas en el flanco.', true, true) } },
    { id: 'ao', label: 'Aorta abdominal', short: 'Aorta', cx: 210, cy: 204, r: 12, lx: 228, ly: 208, anchor: 'start', tools: { prof: aortaTool } },
    { id: 'cie', label: 'Ciego', short: 'Ciego', cx: 118, cy: 354, r: 13, lx: 104, ly: 394, anchor: 'end',
      tools: { prof: () => T('<b>ciego</b> palpable como una masa blanda, de unos 4–5 cm, ligeramente gorgoteante, móvil e <b>indolora</b> en la fosa ilíaca derecha; el apéndice normal no se palpa.', true, false) } },
    { id: 'sig', label: 'Colon sigmoides', short: 'Sigmoides', cx: 302, cy: 354, r: 13, lx: 316, ly: 394, anchor: 'start',
      tools: { prof: () => T('<b>sigmoides</b>: cordón liso y firme de 2–3 cm de diámetro (“cuerda cólica”), móvil, a veces con heces en su interior, <b>indoloro</b> (el colon descendente se palpa de forma similar en el flanco).', true, false) } },
    { id: 'vej', label: 'Vejiga', short: '', cx: 210, cy: 372, r: 20,
      tools: { sup: c => T(st(c).bladder ? '<b>vejiga llena</b>: se palpa una masa suave, lisa, simétrica y de límite superior convexo por encima de la sínfisis (≈ 400 mL), que despierta deseo miccional; es mate a la percusión y desaparece al orinar.' : '<b>vejiga no palpable</b> por encima de la sínfisis del pubis (vacía); región suprapúbica blanda e indolora, sin globo vesical.', false, false),
        prof: c => T(st(c).bladder ? '<b>vejiga llena</b>: masa suave de límite superior convexo, indolora aunque algo molesta; mate a la percusión.' : '<b>vejiga no palpable</b>; hipogastrio blando e indoloro a la presión profunda.', true, false) } },
    { id: 'gl', label: 'Ganglios inguinales derechos', short: 'Ganglios ing. D', cx: 138, cy: 398, r: 12, lx: 122, ly: 416, anchor: 'end',
      tools: { sup: () => T('ganglios inguinales (cadena horizontal, bajo el ligamento inguinal) pequeños: ≤ 1 cm, blandos, móviles e indoloros (hallazgo normal); sin adenopatías.', false, false),
        prof: () => T('ganglios inguinales ≤ 1 cm, blandos, móviles e indoloros (hallazgo normal); sin adenopatías ni masas.', true, false) } },
    { id: 'gl2', label: 'Ganglios inguinales izquierdos', short: 'Ganglios ing. I', cx: 282, cy: 398, r: 12, lx: 298, ly: 416, anchor: 'start',
      tools: { sup: () => T('ganglios inguinales ≤ 1 cm, blandos, móviles e indoloros (normal).', false, false),
        prof: () => T('ganglios inguinales ≤ 1 cm, blandos, móviles e indoloros (normal); sin adenopatías.', true, false) } },
    { id: 'omb', label: 'Anillo umbilical', short: '', cx: 210, cy: UMB, r: 13,
      tools: { vals: () => T('<b>sin hernia umbilical</b>: con Valsalva (toser o elevar la cabeza) el anillo umbilical está cerrado y no se produce protrusión ni impulso a la tos.', false, false), sup: () => T('ombligo sin masas ni dolor; anillo cerrado.', false, false) } },
    { id: 'ingd', label: 'Región inguinal derecha', short: 'Ingle D', cx: 176, cy: 372, r: 14, lx: 176, ly: 398,
      tools: { vals: () => T('<b>sin hernias inguinales ni crurales derechas</b>: con Valsalva, tos y de pie no hay protrusión ni impulso en el trayecto inguinal (dedo en el anillo inguinal superficial).', false, false) } },
    { id: 'ingi', label: 'Región inguinal izquierda', short: 'Ingle I', cx: 244, cy: 372, r: 14, lx: 244, ly: 398,
      tools: { vals: () => T('<b>sin hernias inguinales ni crurales izquierdas</b>: sin protrusión ni impulso con Valsalva y tos.', false, false) } },
    { id: 'lin', label: 'Línea alba', short: 'Línea alba', x: 200, y: 126, w: 20, h: 60, rx: 6, lx: 226, ly: 150, anchor: 'start',
      tools: { vals: () => T('<b>sin diástasis de los rectos ni hernia epigástrica</b>: al elevar la cabeza (Valsalva) la línea alba no se abomba ni se palpa defecto aponeurótico.', false, false) } }
  ];
  const palpSvg = abdSVG({ grid: 'nine', liver: true, bladder: true });
  const palpacion = {
    id: 'palp', label: 'Palpación', viewBox: '0 0 420 520',
    hint: 'Manos tibias, uñas cortas, paciente relajado en decúbito dorsal con las rodillas semiflexionadas. Empieza lejos de cualquier zona dolorosa; primero superficial, luego profunda.',
    svg: palpSvg,
    anatomy: anatAbd(),
    tools: [
      { id: 'sup', icon: '✋', label: 'Palpación superficial', hint: 'Presión suave (1–2 cm) con la palma y los dedos juntos: busca defensa, dolor, masas superficiales y hernias.' },
      { id: 'prof', icon: '🤲', label: 'Profunda / bimanual', hint: 'Presión profunda para vísceras y masas: hígado, vesícula, bazo, riñones, aorta, ciego, sigmoides. Aprovecha la inspiración profunda.' },
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
    hint: 'Puntos dolorosos, signos de irritación peritoneal y maniobras clásicas. En esta persona sana todos son negativos.',
    svg: manSvg,
    anatomy: anatAbd({ back: true }),
    tools: [
      { id: 'murphy', icon: '🫗', label: 'Murphy (punto cístico)', hint: 'Presiona bajo el reborde costal derecho (borde externo del recto) y pide inspirar profundamente.' },
      { id: 'mcburney', icon: '📍', label: 'McBurney', hint: 'Presiona el punto de McBurney: unión del tercio externo con los dos tercios internos de la línea que une la EIAS derecha con el ombligo.' },
      { id: 'blumberg', icon: '↩️', label: 'Blumberg (descompresión)', hint: 'Presiona lentamente y suelta de golpe. Prueba en la fosa ilíaca derecha y en el resto del abdomen (Gueneau de Mussy).' },
      { id: 'rovsing', icon: '🔄', label: 'Rovsing', hint: 'Presiona la fosa ilíaca izquierda, desplazando el gas del colon hacia el ciego, y pregunta por dolor en la derecha.' },
      { id: 'psoas', icon: '🦵', label: 'Signo del psoas', hint: 'Haz clic en el muslo derecho: elevar el muslo extendido contra resistencia.' },
      { id: 'obt', icon: '🌀', label: 'Signo del obturador', hint: 'Haz clic en el muslo derecho: flexión de cadera y rodilla a 90° con rotación interna.' },
      { id: 'onda', icon: '〰️', label: 'Onda ascítica', hint: 'Haz clic en un flanco: golpe en un flanco con la mano de un ayudante en la línea media.' },
      { id: 'giordano', icon: '👊', label: 'Puñopercusión lumbar', hint: 'Haz clic en el ángulo costovertebral de la vista posterior: golpe suave con el borde cubital del puño sobre la mano apoyada (signo de Giordano).' }
    ],
    regions: [
      { id: 'abd', label: 'Abdomen', short: '', x: 88, y: 118, w: 244, h: 284, rx: 14,
        tools: { blumberg: () => mt('<b>Blumberg negativo</b>: tras presionar lentamente y soltar de golpe no hay dolor a la descompresión (no hay irritación peritoneal); tampoco en zonas alejadas del punto explorado (signo de Gueneau de Mussy negativo); sin defensa ni contractura.', '↓ presionar … ↑ soltar') } },
      { id: 'mur', label: 'Punto cístico (Murphy)', short: 'Murphy', cx: 150, cy: 146, r: 12, lx: 150, ly: 124,
        tools: { murphy: () => mt('<b>signo de Murphy negativo</b>: al presionar en el punto cístico (bajo el reborde costal derecho, en el borde externo del recto) el paciente inspira profundamente sin dolor y sin interrumpir la inspiración.', 'inspire …') } },
      { id: 'mcb', label: 'Punto de McBurney', short: 'McBurney', cx: 139, cy: 319, r: 12, lx: 139, ly: 300,
        tools: {
          mcburney: () => mt('<b>punto de McBurney indoloro</b>: la presión en la unión del tercio externo con los dos tercios internos de la línea EIAS derecha-ombligo no provoca dolor ni defensa muscular.', '↓ presión'),
          blumberg: () => mt('<b>Blumberg negativo</b> en la fosa ilíaca derecha: no hay dolor al soltar de golpe tras la presión lenta.', '↓ presionar … ↑ soltar')
        } },
      { id: 'lif', label: 'Fosa ilíaca izquierda', short: 'Rovsing', cx: 296, cy: 340, r: 18, lx: 296, ly: 372, anchor: 'middle',
        tools: {
          rovsing: () => mt('<b>Rovsing negativo</b>: la presión en la fosa ilíaca izquierda (desplazando el contenido gaseoso del colon hacia el ciego) no provoca dolor en la fosa ilíaca derecha.', '↓ presión FII'),
          blumberg: () => mt('<b>Blumberg negativo</b> en la fosa ilíaca izquierda: sin dolor a la descompresión.', '↓ presionar … ↑ soltar')
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
        tools: { giordano: () => mt('<b>puñopercusión lumbar negativa a la derecha</b> (signo de Giordano negativo): el golpe suave con el borde cubital del puño sobre la mano apoyada en el ángulo costovertebral (entre la 12.ª costilla y la columna) no provoca dolor.', 'golpe suave') } },
      { id: 'cvi', label: 'Ángulo costovertebral izquierdo', short: 'ACV I', cx: 440 + 62, cy: 188, r: 17, lx: 440 + 100 - 62, ly: 164,
        tools: { giordano: () => mt('<b>puñopercusión lumbar negativa a la izquierda</b>: sin dolor; el hallazgo es simétrico con el lado derecho.', 'golpe suave') } }
    ],
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
    const p = pd(c), k = kOf(c);
    const span = p.span;
    return [
      mk(k, 'Orden de la exploración del abdomen', 'Inspección, auscultación, percusión y palpación',
        ['Inspección, palpación, percusión y auscultación', 'Palpación, percusión, auscultación e inspección', 'Percusión, palpación, inspección y auscultación'],
        'A diferencia del resto del examen físico, en el abdomen se ausculta antes de percutir y palpar, porque la manipulación modifica el peristaltismo y los RHA.'),
      mk(k + 1, 'Frecuencia normal de los ruidos hidroaéreos (RHA)', '5–30 por minuto',
        ['1–2 por minuto', '40–60 por minuto', 'Ausentes en reposo'],
        'Se consideran ausentes (silencio abdominal) solo tras auscultar varios minutos (2–5 min según la fuente). Regla práctica: ~3 ruidos en 10 s ≈ 18/min.'),
      mk(k + 2, `Hepatimetría en la LMC de esta persona (${c.age} años, ${c.sex === 'F' ? 'mujer' : 'varón'}; normal 6–12 cm)`, `${span} cm`,
        [`${span - 4} cm`, `${span + 6} cm`, 'No se puede medir por percusión'],
        `Percutiendo en la LMC derecha, la matidez comienza en el 5.º espacio intercostal y termina en el reborde costal: ≈ ${span} cm en esta persona (≈ 10–12 cm en el varón adulto y menor en la mujer).`),
      mk(k + 3, 'Límite superior de la matidez hepática en la línea medioclavicular', '5.º espacio intercostal',
        ['2.º espacio intercostal', '8.º espacio intercostal', 'Reborde costal'],
        'Se percute desde la sonoridad pulmonar hacia abajo; el límite superior está en el 5.º EIC en la LMC y el inferior coincide con el reborde costal.'),
      mk(k, 'Sonido normal en el espacio de Traube', 'Timpanismo (cámara gástrica)',
        ['Matidez por el bazo', 'Matidez por el hígado', 'Sonoridad pulmonar'],
        'En la base del hemitórax izquierdo se encuentra la cámara gástrica: el timpanismo es normal; la matidez en esa zona (esplenomegalia, derrame) no lo es.'),
      mk(k + 1, 'Borde hepático a la palpación en esta persona',
        p.liver ? 'Palpable ≈ 1 cm bajo el reborde en inspiración, liso, romo y blando' : 'No palpable bajo el reborde costal',
        p.liver
          ? ['No palpable', 'Palpable 5 cm, duro e irregular', 'Palpable, doloroso y de borde cortante']
          : ['Palpable 5 cm bajo el reborde, duro e irregular', 'Palpable 1 cm, doloroso y de borde cortante', 'Siempre palpable 3 cm en todas las personas'],
        p.liver ? 'En personas delgadas el borde puede palparse 1–2 cm bajo el reborde en inspiración profunda: liso, romo, blando e indoloro.'
          : 'El hígado normal suele no palparse; si se palpa, no sobrepasa 1–2 cm bajo el reborde y es liso, romo, blando e indoloro.'),
      mk(k + 2, 'Diámetro normal de la aorta abdominal a la palpación', 'Menor de 3 cm, con latido y expansión lateral',
        ['Mayor de 4 cm y sin latido', 'Exactamente 5 cm', 'No debe percibirse nunca en ninguna persona'],
        'Un diámetro ≥ 3 cm define un aneurisma de aorta abdominal; en personas delgadas la aorta normal se palpa como un latido en la línea media supraumbilical.'),
      mk(k + 3, 'Un signo de Murphy negativo significa que', 'Al presionar en el punto cístico el paciente inspira profundamente sin dolor ni interrupción',
        ['El paciente detiene la inspiración por dolor', 'Hay dolor a la descompresión en la fosa ilíaca derecha', 'El hígado es palpable y doloroso'],
        'Se presiona bajo el reborde costal derecho en el borde externo del recto (punto cístico); la interrupción de la inspiración por dolor lo hace positivo.')
    ];
  };

  NormalEngine.build({
    id: 'abdomen', title: 'Abdomen (normal)', icon: '🫃', group: 'Exploración normal',
    desc: 'Exploración física normal del abdomen: inspección, auscultación, percusión, palpación y maniobras.',
    bullets: ['Cuadrantes y 9 regiones', 'Ruidos hidroaéreos, timpanismo y hepatimetría', 'Palpación superficial y profunda; Murphy, McBurney, Blumberg, puñopercusión lumbar'],
    refs: [
      'Argente HA, Álvarez ME. <i>Semiología Médica. Fisiopatología, semiotecnia y propedéutica</i>. Editorial Médica Panamericana — Aparato digestivo: examen físico del abdomen (inspección, auscultación, percusión y palpación), hígado, bazo y riñón; signos peritoneales.',
      'Surós Batlló A, Surós Batlló J. <i>Semiología médica y técnica exploratoria</i>. Elsevier Masson — Abdomen: maniobras de palpación de hígado, bazo y riñón.',
      'Bickley LS. <i>Bates. Guía de exploración física e historia clínica</i>. Wolters Kluwer — Abdomen: ruidos hidroaéreos, hepatimetría y ascitis.'
    ],
    teaching: [
      'Orden: inspección → auscultación → percusión → palpación; la auscultación va antes para no modificar los ruidos hidroaéreos con la manipulación.',
      'Paciente en decúbito dorsal, relajado, con las rodillas semiflexionadas; manos y estetoscopio tibios; comienza lejos de cualquier zona dolorosa y termina con las maniobras y los puntos dolorosos.',
      'RHA normales: 5–30/min; se dan por ausentes solo tras varios minutos de escucha (2–5 min según la fuente). Busca soplos en aorta, arterias renales, ilíacas y femorales.',
      'Hepatimetría en la LMC: 6–12 cm (≈ 10–12 cm en el varón adulto, menor en la mujer); límite superior en el 5.º EIC y límite inferior en el reborde costal; el espacio de Traube es timpánico.',
      'Palpa en inspiración profunda: hígado (mano en cuchara o enganche de Mathieu: borde romo, blando, liso), bazo (Middleton: no palpable), riñón (Guyon y peloteo: no palpable), aorta (< 3 cm), ciego y sigmoides. La vesícula normal no se palpa.'
    ],
    scenes: [inspeccion, auscultacion, percusion, palpacion, maniobras],
    quiz
  });
})();
