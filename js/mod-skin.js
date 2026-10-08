/* Módulo: Piel, faneras y mucosas (exploración NORMAL).
   Escenas: piel, lunares (regla ABCDE), cabello y cuero cabelludo, uñas, mucosas y conjuntivas. */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const fmt = n => String(n).replace('.', ',');
  const elder = c => c.age >= 65;

  /* ------------------------------------------------------------ estado y utilidades */
  const K = { live: false, tok: 0, tm: [], cancel: [], dia: 4, ang: 160, fold: 1, folding: false };

  function clearFx() {
    K.tm.forEach(clearTimeout); K.tm.length = 0;
    K.cancel.forEach(f => { try { f(); } catch (e) { /* noop */ } }); K.cancel.length = 0;
  }
  function leaveAll() { K.live = false; K.tok++; clearFx(); K.folding = false; }

  function injectCss() {
    if (document.getElementById('sk-style')) return;
    const st = document.createElement('style');
    st.id = 'sk-style';
    st.textContent = `
      .sk-bar{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;padding:8px 12px;background:var(--panel);border-top:1px solid var(--line);font-size:13px;color:var(--ink)}
      .sk-bar input[type=range]{width:200px;accent-color:var(--brand)}
      .sk-bar .btn{width:auto;margin:0}
      .sk-lbl{font-weight:600;color:var(--muted)}
      .sk-read{font-variant-numeric:tabular-nums}
      .sk-note{padding:8px 12px;font-size:12.5px;color:var(--muted);background:var(--panel);border-top:1px solid var(--line);line-height:1.45}
      .sk-note b{color:var(--ink)}
      .sk-terms{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;padding:10px 12px;background:var(--panel);border-top:1px solid var(--line)}
      .sk-term{border:1px solid var(--line);border-radius:8px;padding:6px 8px;font-size:12px;color:var(--ink);line-height:1.35}
      .sk-term svg{display:block;width:100%;height:34px;background:#e8eef4;border-radius:6px;margin-bottom:4px}
      .sk-term b{display:block}
      .sk-term span{color:var(--muted)}
      .sk-ok{color:var(--ok);font-weight:600}
      .sk-warn{color:var(--warn);font-weight:600}
    `;
    document.head.appendChild(st);
  }

  const el = (name, attrs) => {
    const n = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach(k => n.setAttribute(k, attrs[k]));
    return n;
  };

  /* PRNG determinista (los dibujos no cambian entre pasadas) */
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  /* Fototipo y colores según persona */
  const TONES = [
    { skin: '#e5b78e', line: '#b58459', light: '#efcba7', ph: 'III', lip: '#d9857d', nev: ['#7a4b33', '#8e5a3d', '#a06a48'], hair: ['#3b2a20', '#4a3426', '#5a4030'], eye: '#5a3d26', name: 'beige-dorado' },
    { skin: '#c99466', line: '#97663b', light: '#d8a87e', ph: 'IV', lip: '#b8695f', nev: ['#4d2d1d', '#5e3825', '#704631'], hair: ['#231915', '#2e211b', '#3a2a22'], eye: '#3b2616', name: 'moreno claro' },
    { skin: '#f3d3b9', line: '#c19a7a', light: '#f8e1cd', ph: 'II', lip: '#d0928a', nev: ['#8a5a40', '#9d6c4c', '#b07d5a'], hair: ['#c9c9c9', '#b8b8b8', '#dcdcdc'], eye: '#6b7f8c', name: 'claro' }
  ];
  const tn = c => (c.age < 35 ? TONES[0] : c.age < 60 ? TONES[1] : TONES[2]);

  const NOLES = 'sin lesiones primarias (mácula, pápula, placa, vesícula, ampolla, pústula, nódulo, habón) ni secundarias (escama, costra, excoriación, erosión, úlcera, fisura, cicatriz, liquenificación)';
  const LEX = '<br><small><b>Mini-guía de lesiones elementales:</b> <b>mácula</b> = cambio de color plano &lt;1 cm (mancha si ≥1 cm); <b>pápula</b> = elevación sólida &lt;1 cm; <b>placa</b> = elevación plana de superficie amplia ≥1 cm; <b>vesícula</b> = elevación con líquido claro &lt;1 cm (<b>ampolla</b> ≥1 cm); <b>pústula</b> = elevación con pus; <b>nódulo</b> = lesión sólida palpable, más profunda, ≥1 cm; <b>habón</b> = placa edematosa, pruriginosa y fugaz (&lt;24 h).</small>';

  /* ============================================================ ESCENA 1: PIEL */
  const FX = 0.86;
  const P = (x, y) => [+(10 + FX * x).toFixed(1), +(10 + FX * y).toFixed(1)];
  const cir = (id, label, short, x, y, r, lx, ly, anchor, tools) => {
    const [cx, cy] = P(x, y), [a, b] = P(lx, ly);
    return { id, label, short, cx, cy, r: +(r * FX).toFixed(1), lx: a, ly: b, anchor, tools };
  };
  const rct = (id, label, short, x, y, w, h, lx, ly, anchor, tools) => {
    const [X, Y] = P(x, y), [a, b] = P(lx, ly);
    return { id, label, short, x: X, y: Y, w: +(w * FX).toFixed(1), h: +(h * FX).toFixed(1), lx: a, ly: b, anchor, tools };
  };
  const poly = (id, label, short, pts, lx, ly, anchor, tools) => {
    const [a, b] = P(lx, ly);
    return { id, label, short, d: 'M' + pts.map(p => P(p[0], p[1]).join(',')).join(' L') + ' Z', lx: a, ly: b, anchor, tools };
  };

  const turgT = c => (c.age < 35 ? 0.5 : c.age < 60 ? 0.8 : 1.6);
  function pinchFx(x, c) {
    const layer = x.svg.querySelector('#flash');
    clearFx();
    layer.querySelectorAll('.sk-fx').forEach(n => n.remove());
    const t = turgT(c), p = x.point;
    const g = el('g', { class: 'sk-fx' }), tent = el('path', { fill: 'none', stroke: '#7a4b33', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    g.appendChild(tent); layer.appendChild(g);
    const setH = h => tent.setAttribute('d', `M${p.x - 20},${p.y} Q${p.x - 7},${p.y} ${p.x},${p.y - h} Q${p.x + 7},${p.y} ${p.x + 20},${p.y}`);
    setH(0);
    K.cancel.push(U.tween(350, u => setH(20 * u), () => {
      K.tm.push(setTimeout(() => {
        K.cancel.push(U.tween(t * 1000, u => setH(20 * (1 - u)), () => {
          const tx = el('text', { x: p.x, y: p.y - 26, 'text-anchor': 'middle', class: 'svg-hint' });
          tx.textContent = `${fmt(t.toFixed(1))} s`; g.appendChild(tx);
          K.tm.push(setTimeout(() => g.remove(), 1800));
        }));
      }, 900));
    }));
  }
  const turgHtml = (where) => (c) => ({
    html: `Pellizco de un pliegue de piel en ${where} (entre 2 dedos, ≈2 s) y liberación: <b>vuelve a su posición en ≈${fmt(turgT(c).toFixed(1))} s</b> (normal <b>&lt;2 s</b>). Turgor y elasticidad conservados, sin pliegue que persista.` +
      (elder(c) ? ' En el adulto mayor la elasticidad dérmica disminuye de forma fisiológica (regresa algo más lento) y el signo del pliegue no es fiable para valorar la hidratación.' : ''),
    run: x => pinchFx(x, c)
  });

  function skinTools(kind) {
    const T = {
      cara: {
        insp: c => `Color <b>uniforme</b> (fototipo ${tn(c).ph}, piel ${tn(c).name}), mejillas rosadas; <b>sin palidez, cianosis ni ictericia</b> (esclera blanca) ni eritema malar. Textura lisa con poros visibles, ${c.age < 35 ? 'brillo sebáceo leve en la zona T' : c.age < 60 ? 'finas líneas de expresión' : 'arrugas y lentigos solares benignos, piel más seca y fina'}; ${NOLES}.`,
        palp: c => 'Piel <b>tibia</b> (≈34 °C), suave, de humedad normal (ni seca ni sudorosa), sin induración, nódulos ni dolor; simétrica con el lado contrario.',
        turg: c => ({ html: 'En la cara el turgor no se explora de rutina: pellizca el dorso de la mano, la región infraclavicular o el abdomen. La piel facial se pliega con facilidad y regresa de inmediato.' }),
        mov: 'Piel fina (≈0,5 mm en los párpados) y muy móvil sobre los planos profundos, salvo en la nariz y el pabellón auricular, donde está más adherida al cartílago.'
      },
      tronco: {
        insp: c => `Color uniforme, algo más claro que en la cara y las manos (menos fotoexpuesto); ${NOLES}. Pueden verse pocos nevus regulares${elder(c) ? ' y, como cambios benignos de la edad, algunos angiomas rubí y queratosis seborreicas' : ''}. Sin estrías, cicatrices ni telangiectasias llamativas.`,
        palp: 'Piel <b>tibia</b> (≈34-35 °C), lisa, de humedad normal, simétrica; sin nódulos, induración ni dolor; no hay prurito ni descamación.',
        turg: turgHtml('la región infraclavicular o el abdomen'),
        mov: 'Piel móvil, de grosor normal (epidermis 0,05-1,5 mm y dermis 1-4 mm en conjunto), no adherida a planos profundos; el pliegue cutáneo abdominal es fino y se pellizca sin dificultad.'
      },
      brazo: {
        insp: c => `Color homogéneo, algo más oscuro en la cara extensora y el antebrazo (fotoexposición) y más claro y fino en la cara flexora; vello según sexo y edad; ${NOLES}.`,
        palp: 'Brazos y antebrazos <b>tibios</b> (≈32-33 °C), simétricos con el lado contrario, humedad normal, sin edema, nódulos ni dolor.',
        turg: turgHtml('la cara dorsal del antebrazo'),
        mov: 'Piel móvil sobre el músculo y de grosor normal; la cara extensora es algo más gruesa que la flexora.'
      },
      pierna: {
        insp: c => `Color uniforme, vello distribuido de forma homogénea (más escaso en la mujer y en el anciano); ${NOLES}. Sin edema, sin várices, sin hiperpigmentación ni cambios tróficos.`,
        palp: 'Piernas <b>tibias</b> (≈31-33 °C) y simétricas, sin gradiente de temperatura entre ambas, humedad normal; sin edema (<b>fóvea negativa</b>), cordones ni dolor.',
        turg: turgHtml('la cara anterior del muslo'),
        mov: 'Piel móvil en el muslo y algo más adherida sobre la tibia (poco tejido subcutáneo); grosor normal.'
      },
      pliegue: {
        insp: c => `Piel más fina y algo más oscura de forma fisiológica según el fototipo; ${NOLES}. <b>Sin maceración, eritema ni fisuras</b> (no hay intertrigo) y sin acantosis nigricans.`,
        palp: 'Piel <b>más cálida y ligeramente húmeda</b> (sudoración normal en axilas e ingles), lisa, sin induración ni adenopatías palpables en la región.',
        turg: turgHtml('el pliegue (se evalúa mejor en otra zona)'),
        mov: 'Piel fina, laxa y móvil, con vello normal en axilas e ingles.'
      },
      mano: {
        insp: c => `Dorso de mano y dedos: color uniforme, piel fina y laxa, venas dorsales visibles${elder(c) ? ' (más prominentes con la edad, con lentigos solares benignos)' : ''}; ${NOLES}. Sin edema ni cianosis.`,
        palp: 'Manos <b>tibias</b> (≈31-33 °C) y secas, simétricas, sin gradiente de temperatura hacia los dedos; sin edema ni dolor.',
        turg: turgHtml('el dorso de la mano'),
        mov: 'Piel del dorso muy fina (<1 mm) y móvil: se levanta con facilidad entre dos dedos.'
      },
      pie: {
        insp: c => `Dorso del pie y dedos: color uniforme, vello presente, piel lisa; <b>espacios interdigitales secos</b>, sin descamación ni maceración; ${NOLES}. Sin edema ni deformidades.`,
        palp: 'Pies <b>tibios</b> (≈30-32 °C), simétricos, algo más frescos que las piernas; sin edema ni dolor.',
        turg: turgHtml('el dorso del pie'),
        mov: 'Piel del dorso fina y móvil; la de los talones y la planta es gruesa.'
      },
      palma: {
        insp: c => `Palma: color rosado uniforme, <b>crestas dérmicas</b> (huellas) y pliegues palmares marcados, <b>sin pelo ni glándulas sebáceas</b>; sin eritema palmar ni palidez de los pliegues; ${NOLES}.`,
        palp: 'Palma <b>tibia</b> y ligeramente húmeda (abundantes glándulas sudoríparas ecrinas), de textura gruesa y firme; simétrica con la otra mano.',
        turg: c => ({ html: 'En la palma el pliegue no es pellizcable (piel gruesa y adherida a la aponeurosis): no se usa para el turgor.' }),
        mov: 'Piel muy gruesa (epidermis hasta ≈1,5 mm) y poco móvil por su fijación a la fascia palmar: es normal.'
      },
      planta: {
        insp: c => `Planta: piel gruesa y uniforme, con ligera <b>callosidad</b> en los puntos de apoyo (talón y cabezas metatarsianas), arco plantar conservado; ${NOLES}. Sin fisuras ni maceración.`,
        palp: 'Planta <b>tibia</b>, seca o con humedad leve, firme y gruesa; sin dolor, nódulos ni verrugas.',
        turg: c => ({ html: 'En la planta no se explora el turgor (piel gruesa y adherida).' }),
        mov: 'Es la piel más gruesa del cuerpo (epidermis hasta ≈1,5 mm; el estrato córneo es grueso) y apenas se desliza sobre los planos profundos.'
      }
    };
    const t = T[kind];
    return {
      insp: t.insp, palp: t.palp, turg: t.turg, mov: t.mov,
      lex: c => `${(kind === 'palma' || kind === 'planta') ? 'Zona sin pelo y con piel gruesa' : 'En esta región'}: ${NOLES}.${LEX}`
    };
  }

  function bodyFig(t) {
    const limb = (pts, w) => {
      const d = 'M' + pts.map(p => p.join(',')).join(' L');
      return `<path d="${d}" fill="none" stroke="${t.line}" stroke-width="${w + 4}" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<path d="${d}" fill="none" stroke="${t.skin}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    };
    const mir = pts => pts.map(p => [460 - p[0], p[1]]);
    const arm = [[168, 138], [128, 250], [88, 360], [78, 398]], leg = [[206, 340], [200, 500], [200, 640]];
    let b = `<g transform="translate(10 10) scale(${FX})">`;
    b += limb(arm, 34) + limb(mir(arm), 34) + limb(leg, 54) + limb(mir(leg), 54);
    b += `<ellipse cx="80" cy="410" rx="17" ry="27" fill="${t.skin}" stroke="${t.line}" stroke-width="4" transform="rotate(8 80 410)"/>`;
    b += `<ellipse cx="380" cy="410" rx="17" ry="27" fill="${t.skin}" stroke="${t.line}" stroke-width="4" transform="rotate(-8 380 410)"/>`;
    b += `<path d="M166,130 C166,100 190,118 230,118 C270,118 294,100 294,130 L282,340 C260,352 200,352 178,340 Z" fill="${t.skin}" stroke="${t.line}" stroke-width="4"/>`;
    b += `<rect x="208" y="94" width="44" height="30" fill="${t.skin}"/>`;
    b += `<ellipse cx="230" cy="62" rx="32" ry="38" fill="${t.skin}" stroke="${t.line}" stroke-width="4"/>`;
    b += `<path d="M200,40 Q230,14 260,40 Q250,28 230,26 Q210,28 200,40 Z" fill="${t.hair[1]}"/>`;
    b += `<circle cx="218" cy="62" r="2.5" fill="#4a3a30"/><circle cx="242" cy="62" r="2.5" fill="#4a3a30"/><path d="M220,82 Q230,88 240,82" fill="none" stroke="#a5605a" stroke-width="2.5" stroke-linecap="round"/>`;
    b += `<path d="M184,660 C180,680 184,696 198,698 L220,698 C224,684 220,668 214,660 Z" fill="${t.skin}" stroke="${t.line}" stroke-width="4"/>`;
    b += `<path d="M276,660 C280,680 276,696 262,698 L240,698 C236,684 240,668 246,660 Z" fill="${t.skin}" stroke="${t.line}" stroke-width="4"/>`;
    b += `<circle cx="230" cy="262" r="3" fill="${t.line}"/><circle cx="202" cy="170" r="3.5" fill="#c98f7a"/><circle cx="258" cy="170" r="3.5" fill="#c98f7a"/>`;
    b += '</g>';
    return b;
  }

  function bigHand(ox, oy, t) {
    const lens = [90, 104, 96, 78];
    let h = `<rect x="${ox}" y="${oy + 100}" width="150" height="130" rx="34" fill="${t.light}" stroke="${t.line}" stroke-width="3"/>`;
    for (let i = 0; i < 4; i++) {
      const fx = ox + 4 + i * 36, top = oy + 100 - lens[i];
      h += `<rect x="${fx}" y="${top}" width="32" height="${lens[i] + 20}" rx="15" fill="${t.light}" stroke="${t.line}" stroke-width="3"/>`;
    }
    h += `<rect x="${ox - 36}" y="${oy + 120}" width="36" height="86" rx="17" fill="${t.light}" stroke="${t.line}" stroke-width="3" transform="rotate(-30 ${ox - 18} ${oy + 160})"/>`;
    h += `<path d="M${ox + 16},${oy + 140} Q${ox + 80},${oy + 165} ${ox + 138},${oy + 138} M${ox + 14},${oy + 170} Q${ox + 60},${oy + 182} ${ox + 100},${oy + 218} M${ox + 26},${oy + 118} Q${ox + 52},${oy + 150} ${ox + 36},${oy + 200}" fill="none" stroke="${t.line}" stroke-width="2" opacity=".55"/>`;
    for (let i = 0; i < 4; i++) h += `<path d="M${ox + 6 + i * 36},${oy + 100 - lens[i] + 28} h24 M${ox + 6 + i * 36},${oy + 100 - lens[i] + 58} h24" stroke="${t.line}" stroke-width="1.5" opacity=".45"/>`;
    return h;
  }
  function sole(t) {
    let s = '';
    const xs = [[536, 376, 14], [566, 362, 13], [592, 360, 12.5], [615, 366, 11.5], [635, 380, 10.5]];
    xs.forEach(([x, y, r]) => { s += `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r + 4}" fill="${t.light}" stroke="${t.line}" stroke-width="3"/>`; });
    s += `<path d="M528,400 C560,385 625,385 652,408 C660,450 640,480 636,520 C632,560 622,600 584,606 C548,610 534,580 534,545 C534,505 520,470 518,440 C516,420 520,408 528,400 Z" fill="${t.light}" stroke="${t.line}" stroke-width="3"/>`;
    s += `<ellipse cx="584" cy="588" rx="36" ry="20" fill="${t.line}" opacity=".18"/><ellipse cx="560" cy="418" rx="28" ry="14" fill="${t.line}" opacity=".16"/><ellipse cx="624" cy="424" rx="20" ry="12" fill="${t.line}" opacity=".16"/>`;
    s += `<path d="M538,470 Q552,500 556,540" fill="none" stroke="#fff" stroke-width="10" opacity=".25" stroke-linecap="round"/>`;
    return s;
  }

  const termCard = () => {
    const sk = '<path d="M2,27 H68" stroke="#b58459" stroke-width="2"/>';
    const T = [
      ['Mácula', '<1 cm, plana, solo color', '<rect x="18" y="25" width="34" height="3" fill="#a56b4a"/>'],
      ['Pápula', 'elevación sólida <1 cm', '<path d="M25,27 Q35,10 45,27 Z" fill="#c98f7a" stroke="#a16a58"/>'],
      ['Placa', 'elevación plana ≥1 cm', '<path d="M10,27 L14,17 H56 L60,27 Z" fill="#d49a86" stroke="#a16a58"/>'],
      ['Vesícula', 'líquido claro <1 cm', '<path d="M26,27 Q35,12 44,27 Z" fill="#d6ecf7" stroke="#7aa6bd"/>'],
      ['Ampolla', 'líquido claro ≥1 cm', '<path d="M17,27 Q35,0 53,27 Z" fill="#d6ecf7" stroke="#7aa6bd"/>'],
      ['Pústula', 'contenido purulento', '<path d="M26,27 Q35,12 44,27 Z" fill="#f2e08a" stroke="#c4a93d"/>'],
      ['Nódulo', 'sólido profundo ≥1 cm', '<circle cx="35" cy="30" r="7" fill="#c98f7a" stroke="#a16a58"/><path d="M26,27 Q35,19 44,27" fill="none" stroke="#b58459" stroke-width="2"/>'],
      ['Habón', 'placa edematosa fugaz', '<path d="M8,27 Q12,14 22,13 H48 Q58,14 62,27 Z" fill="#f3b8b0" stroke="#d98a80"/><path d="M26,24 H44" stroke="#fde3df" stroke-width="3"/>']
    ];
    return `<div class="sk-terms">${T.map(([n, d, s]) => `<div class="sk-term"><svg viewBox="0 0 70 36" preserveAspectRatio="xMidYMid meet">${sk}${s}</svg><b>${n}</b><span>${d}</span></div>`).join('')}</div>`;
  };

  const piel = {
    id: 'piel', label: 'Piel: inspección y palpación', viewBox: '0 0 760 640', redrawOnMode: false,
    hint: 'Inspecciona y palpa cada región; usa el pellizco para el turgor y la elasticidad.',
    svg: (learn, c) => {
      const t = tn(c);
      let b = `<rect x="410" y="10" width="340" height="300" rx="10" fill="#f7fafc" stroke="#c5d0db" stroke-width="2"/><text class="svg-title" x="424" y="34">Palma de la mano</text>`;
      b += `<rect x="410" y="320" width="340" height="310" rx="10" fill="#f7fafc" stroke="#c5d0db" stroke-width="2"/><text class="svg-title" x="424" y="344">Planta del pie</text>`;
      b += bodyFig(t) + bigHand(520, 70, t) + sole(t);
      b += `<text class="svg-small" x="26" y="30">Fototipo ${t.ph} de Fitzpatrick (${t.name})</text>`;
      return b;
    },
    tools: [
      { id: 'insp', icon: '👁️', label: 'Inspección', hint: 'Color, uniformidad, textura y lesiones; con buena luz natural.' },
      { id: 'palp', icon: '🖐️', label: 'Palpación', hint: 'Dorso de la mano para la temperatura; yemas para la textura y la humedad.' },
      { id: 'turg', icon: '🤏', label: 'Turgor / elasticidad', hint: 'Pellizca un pliegue entre dos dedos, suéltalo y mide cuánto tarda en aplanarse.' },
      { id: 'mov', icon: '↔️', label: 'Movilidad y grosor', hint: 'Desliza y pellizca la piel: movilidad sobre planos profundos y grosor.' },
      { id: 'lex', icon: '📖', label: 'Lesiones elementales', hint: 'Busca lesiones primarias y secundarias y repasa la terminología.' }
    ],
    regions: [
      cir('cara', 'Cara', 'Cara', 230, 62, 38, 280, 28, 'start', skinTools('cara')),
      rct('tronco', 'Tronco (tórax y abdomen)', 'Tronco', 176, 160, 108, 170, 230, 252, 'middle', skinTools('tronco')),
      poly('sD', 'Extremidad superior derecha (brazo y antebrazo)', 'Brazo D', [[150, 130], [180, 150], [112, 372], [66, 352]], 60, 240, 'end', skinTools('brazo')),
      poly('sI', 'Extremidad superior izquierda (brazo y antebrazo)', 'Brazo I', [[310, 130], [280, 150], [348, 372], [394, 352]], 400, 240, 'start', skinTools('brazo')),
      cir('mD', 'Mano derecha (dorso)', 'Mano D', 80, 410, 24, 50, 452, 'end', skinTools('mano')),
      cir('mI', 'Mano izquierda (dorso)', 'Mano I', 380, 410, 24, 410, 452, 'start', skinTools('mano')),
      rct('iD', 'Extremidad inferior derecha', 'Pierna D', 180, 360, 48, 292, 168, 520, 'end', skinTools('pierna')),
      rct('iI', 'Extremidad inferior izquierda', 'Pierna I', 232, 360, 48, 292, 292, 520, 'start', skinTools('pierna')),
      rct('pD', 'Pie derecho (dorso)', 'Pie D', 182, 658, 40, 46, 172, 706, 'end', skinTools('pie')),
      rct('pI', 'Pie izquierdo (dorso)', 'Pie I', 238, 658, 40, 46, 288, 706, 'start', skinTools('pie')),
      cir('axD', 'Pliegue axilar derecho', 'Axila', 172, 148, 14, 130, 138, 'end', skinTools('pliegue')),
      cir('axI', 'Pliegue axilar izquierdo', 'Axila', 288, 148, 14, 330, 138, 'start', skinTools('pliegue')),
      cir('ingD', 'Pliegue inguinal derecho', 'Ingle', 192, 348, 14, 160, 346, 'end', skinTools('pliegue')),
      cir('ingI', 'Pliegue inguinal izquierdo', 'Ingle', 268, 348, 14, 300, 346, 'start', skinTools('pliegue')),
      { id: 'palma', label: 'Palma de la mano', short: 'Palma', x: 462, y: 36, w: 230, h: 266, lx: 706, ly: 292, anchor: 'end', tools: skinTools('palma') },
      { id: 'planta', label: 'Planta del pie', short: 'Planta', x: 506, y: 352, w: 150, h: 262, lx: 670, ly: 620, anchor: 'end', tools: skinTools('planta') }
    ],
    after: (stage) => {
      leaveAll(); injectCss();
      stage.insertAdjacentHTML('beforeend', termCard() +
        `<div class="sk-note"><b>Normal:</b> color uniforme según el fototipo, sin palidez, cianosis, ictericia ni eritema; textura lisa; temperatura tibia y simétrica; humedad normal; turgor con regreso del pliegue en &lt;2 s; piel móvil, sin lesiones primarias ni secundarias.</div>`);
    },
    onLeave: leaveAll
  };

  /* ============================================================ ESCENA 2: LUNARES */
  function nevusMarkup(dMM, s, mode, t, learn) {
    const cx = 235, cy = 245, rx = dMM * 10, ry = rx * 0.94;
    const half = (side) => {
      if (mode === 'v') return side === 'a' ? `M${cx},${cy - ry} A${rx},${ry} 0 0 0 ${cx},${cy + ry} Z` : `M${cx},${cy - ry} A${rx},${ry} 0 0 1 ${cx},${cy + ry} Z`;
      return side === 'a' ? `M${cx - rx},${cy} A${rx},${ry} 0 0 1 ${cx + rx},${cy} Z` : `M${cx - rx},${cy} A${rx},${ry} 0 0 0 ${cx + rx},${cy} Z`;
    };
    const tr = mode === 'v' ? `translate(${cx} 0) scale(${s} 1) translate(${-cx} 0)` : `translate(0 ${cy}) scale(1 ${s}) translate(0 ${-cy})`;
    const dots = [[0.4, 0.2], [0.55, -0.35], [0.2, 0.6], [0.7, 0.1], [0.3, -0.7], [0.1, 0.25]];
    let dd = '';
    dots.forEach(([u, v]) => [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([a, b]) => {
      dd += `<circle cx="${(cx + a * u * rx).toFixed(1)}" cy="${(cy + b * v * ry).toFixed(1)}" r="${Math.max(1, dMM * 0.28).toFixed(1)}" fill="${t.nev[0]}" opacity=".55"/>`;
    }));
    const grad = `<defs><radialGradient id="skNvG"><stop offset="0" stop-color="${t.nev[0]}"/><stop offset=".65" stop-color="${t.nev[1]}"/><stop offset="1" stop-color="${t.nev[2]}"/></radialGradient>
      <clipPath id="skNvClipA"><path d="${half('a')}"/></clipPath><clipPath id="skNvClipB"><path d="${half('b')}"/></clipPath></defs>`;
    let m = grad;
    m += `<ellipse cx="${cx}" cy="${cy + ry * 0.9}" rx="${rx * 0.95}" ry="${ry * 0.18}" fill="#000" opacity=".08"/>`;
    m += `<g><path d="${half('a')}" fill="url(#skNvG)"/><g clip-path="url(#skNvClipA)">${dd}</g></g>`;
    m += `<g transform="${tr}"><path d="${half('b')}" fill="url(#skNvG)"/><g clip-path="url(#skNvClipB)">${dd}</g></g>`;
    m += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${t.nev[0]}" stroke-width="2.4" opacity="${s < 0.99 ? 0 : 1}"/>`;
    m += `<g class="hintring"><path d="${mode === 'v' ? `M${cx},${cy - ry - 14} V${cy + ry + 14}` : `M${cx - rx - 14},${cy} H${cx + rx + 14}`}" stroke="#0e6a78" stroke-width="1.6" stroke-dasharray="5 4"/>
      <ellipse cx="${cx}" cy="${cy}" rx="60" ry="60" fill="none" stroke="#d9534f" stroke-width="1.4" stroke-dasharray="3 4"/>
      <text class="svg-small" x="${cx + 64}" y="${cy - 52}" fill="#d9534f">6 mm</text></g>`;
    return m;
  }

  function ruler() {
    let r = `<path d="M40,462 H240" stroke="#38495a" stroke-width="2"/>`;
    for (let i = 0; i <= 10; i++) r += `<path d="M${40 + i * 20},462 v${i % 5 === 0 ? 10 : 6}" stroke="#38495a" stroke-width="1.5"/>`;
    r += `<text class="svg-small" x="40" y="488" text-anchor="middle">0</text><text class="svg-small" x="140" y="488" text-anchor="middle">5</text><text class="svg-small" x="240" y="488" text-anchor="middle">10 mm</text>`;
    return r;
  }

  const ABCDE = [
    ['A', 'Asimetría', 'Las dos mitades coinciden', 'Nevus <b>simétrico</b>: al dividirlo por cualquier eje las dos mitades son iguales (forma redonda u oval regular). Usa «Doblar sobre el eje» para comprobarlo.'],
    ['B', 'Bordes', 'Regulares y bien definidos', 'Bordes <b>regulares, lisos y bien delimitados</b> (nítidos respecto a la piel vecina), sin muescas ni zonas desdibujadas.'],
    ['C', 'Color', 'Uniforme, un solo tono', 'Color <b>uniforme</b> (un solo tono de marrón, algo más oscuro en el centro), sin zonas negras, rojas, blancas ni azuladas.'],
    ['D', 'Diámetro', '<6 mm', 'Diámetro <b>&lt;6 mm</b> (aprox. el borde de una goma de lápiz); usa el control deslizante para medir.'],
    ['E', 'Evolución', 'Estable en el tiempo', '<b>Sin cambios</b> de tamaño, forma, color o relieve en meses o años; sin picor, dolor ni sangrado. Todos los nevus de la persona se parecen entre sí (sin «patito feo»).']
  ];

  const lunares = {
    id: 'nev', label: 'Lunares (regla ABCDE)', viewBox: '0 0 760 520', redrawOnMode: false,
    hint: 'Revisa cada criterio ABCDE, cambia el diámetro del nevus y comprueba la simetría doblando la figura.',
    svg: (learn, c) => {
      const t = tn(c);
      let b = `<rect x="20" y="20" width="430" height="480" rx="12" fill="${t.skin}" stroke="${t.line}" stroke-width="3"/>`;
      b += `<text class="svg-title" x="34" y="48" style="fill:#3a2a1f">Nevus (vista ampliada)</text>`;
      b += ruler();
      ABCDE.forEach((r, i) => {
        const y = 28 + i * 58;
        b += `<rect x="470" y="${y}" width="280" height="50" rx="9" fill="#f7fafc" stroke="#c5d0db" stroke-width="2"/>
          <text x="496" y="${y + 36}" font-size="30" font-weight="700" fill="#0e6a78" text-anchor="middle" font-family="system-ui">${r[0]}</text>
          <text class="svg-title" x="520" y="${y + 22}">${r[1]}</text>
          <text class="svg-small hintring" x="520" y="${y + 40}">${r[2]}</text>`;
      });
      b += `<rect x="470" y="330" width="280" height="170" rx="10" fill="#f7fafc" stroke="#c5d0db" stroke-width="2"/><text class="svg-title" x="484" y="356">Tipos de nevus</text>`;
      b += `<ellipse cx="520" cy="430" rx="22" ry="20" fill="${t.nev[2]}" stroke="${t.nev[0]}" stroke-width="1.5"/>`;
      b += `<defs><radialGradient id="skNvC"><stop offset="0" stop-color="${t.nev[1]}"/><stop offset="1" stop-color="${t.nev[2]}"/></radialGradient><radialGradient id="skNvI"><stop offset="0" stop-color="#f4d9c0"/><stop offset="1" stop-color="${t.nev[2]}"/></radialGradient></defs>`;
      b += `<ellipse cx="610" cy="432" rx="23" ry="21" fill="url(#skNvC)" stroke="${t.nev[0]}" stroke-width="1.5"/><ellipse cx="604" cy="424" rx="8" ry="6" fill="#fff" opacity=".28"/>`;
      b += `<ellipse cx="700" cy="432" rx="25" ry="23" fill="url(#skNvI)" stroke="${t.nev[2]}" stroke-width="1.5"/><ellipse cx="692" cy="422" rx="9" ry="7" fill="#fff" opacity=".4"/>`;
      return b;
    },
    tools: [
      { id: 'insp', icon: '👁️', label: 'Inspección', hint: 'Evalúa A, B, C, D y E en cada nevus; compara con los demás de la persona.' },
      { id: 'dermo', icon: '🔍', label: 'Dermatoscopio', hint: 'Dermatoscopia: estructura interna del nevus.' },
      { id: 'medir', icon: '📏', label: 'Medir diámetro', hint: 'Mide el diámetro máximo con una regla milimetrada.' },
      { id: 'palp', icon: '🖐️', label: 'Palpación', hint: 'Relieve y consistencia del nevus.' }
    ],
    regions: [
      {
        id: 'nv', label: 'Nevus melanocítico', short: 'Nevus', cx: 235, cy: 245, r: 105, lx: 235, ly: 124, anchor: 'middle',
        tools: {
          insp: c => `Nevus <b>redondo-oval, simétrico</b>, de bordes regulares y color marrón <b>uniforme</b>, de ≈${fmt(K.dia.toFixed(1))} mm, estable. ${elder(c) ? 'A esta edad los nevus se hacen más escasos y aparecen lentigos solares y angiomas rubí benignos. ' : 'Un adulto suele tener entre 10 y 40 nevus. '}Todos los nevus de la persona se parecen entre sí.`,
          dermo: 'Dermatoscopia: <b>patrón reticular regular</b> (red de pigmento fina y homogénea que se adelgaza hacia la periferia) o globular/homogéneo simétrico; sin velo azul-blanquecino, estrías irregulares ni puntos y glóbulos irregulares.',
          medir: () => `Diámetro máximo ≈<b>${fmt(K.dia.toFixed(1))} mm</b> ${K.dia < 6 ? '(<b>&lt;6 mm</b>: dentro de lo normal)' : '(≥6 mm: supera el umbral de la regla ABCDE; si es simétrico, regular y estable puede ser un nevus grande normal, pero conviene vigilarlo)'}.`,
          palp: 'Máculo-pápula <b>lisa</b>, de superficie regular, consistencia blanda, indolora, sin ulceración, descamación ni sangrado; no está adherida a planos profundos.'
        }
      },
      ...ABCDE.map((r, i) => ({
        id: 'ab' + r[0], label: `${r[0]} · ${r[1]}`, short: '', x: 470, y: 28 + i * 58, w: 280, h: 50,
        tools: {
          insp: r[3],
          dermo: r[0] === 'B' ? 'Dermatoscopia: la red de pigmento termina de forma gradual y regular en el borde; sin cortes abruptos.' : r[0] === 'C' ? 'Dermatoscopia: <b>un solo patrón y un solo color</b> (marrón claro-oscuro), distribución homogénea del pigmento.' : r[0] === 'A' ? 'Dermatoscopia: simetría de la estructura en uno o dos ejes.' : undefined,
          medir: r[0] === 'D' ? () => `Diámetro actual ≈${fmt(K.dia.toFixed(1))} mm. Normal &lt;6 mm.` : undefined
        }
      })),
      {
        id: 'tj', label: 'Nevus juntural', short: 'Juntural', cx: 520, cy: 430, r: 24, lx: 520, ly: 468, anchor: 'middle',
        tools: {
          insp: 'Nevus <b>juntural</b>: mácula marrón plana, uniforme, bien delimitada, pequeña (&lt;6 mm); típico de la infancia y la juventud (melanocitos en la unión dermoepidérmica).',
          palp: 'No se palpa: es plano, a nivel de la piel.',
          dermo: 'Patrón reticular regular, red de pigmento fina.'
        }
      },
      {
        id: 'tc', label: 'Nevus compuesto', short: 'Compuesto', cx: 610, cy: 432, r: 24, lx: 610, ly: 468, anchor: 'middle',
        tools: {
          insp: 'Nevus <b>compuesto</b>: pápula marrón ligeramente elevada con zona central más pigmentada, simétrica y de bordes regulares; frecuente en adultos jóvenes (melanocitos en la unión y en la dermis).',
          palp: 'Ligeramente elevado, de superficie lisa o algo rugosa, blando e indoloro.',
          dermo: 'Patrón globular o reticulo-globular simétrico, sin estructuras atípicas.'
        }
      },
      {
        id: 'ti', label: 'Nevus intradérmico', short: 'Intradérmico', cx: 700, cy: 432, r: 26, lx: 700, ly: 468, anchor: 'middle',
        tools: {
          insp: 'Nevus <b>intradérmico</b>: pápula o cúpula del color de la piel a marrón claro, blanda, a veces con pelo, de bordes regulares; frecuente en adultos y personas mayores (melanocitos en la dermis).',
          palp: 'Elevado en forma de cúpula, <b>blando</b>, indoloro y móvil con la piel.',
          dermo: 'Patrón homogéneo con vasos en coma o glóbulos color piel-marrón claro, simétrico.'
        }
      }
    ],
    after: (stage, sh, ctx) => {
      leaveAll(); injectCss();
      K.live = true; K.dia = 4; K.fold = 1;
      const t = tn(sh.case);
      let mode = 'v';
      const dyn = el('g', { id: 'nvDyn', style: 'pointer-events:none' });
      ctx.svg.insertBefore(dyn, ctx.svg.querySelector('#hits'));
      const draw = () => { dyn.innerHTML = nevusMarkup(K.dia, K.fold, mode, t, sh.mode === 'learn'); ctx.scene.refresh(); };
      draw();
      stage.insertAdjacentHTML('beforeend', `<div class="sk-bar">
        <span class="sk-lbl">Diámetro</span><input type="range" id="skDia" min="2" max="10" step="0.5" value="4"><b class="sk-read" id="skDiaTxt">4,0 mm</b>
        <span id="skDiaMsg" class="sk-ok">&lt;6 mm: normal</span>
        <button type="button" class="btn small" id="skFoldV">Doblar sobre el eje vertical</button>
        <button type="button" class="btn small" id="skFoldH">Doblar sobre el eje horizontal</button></div>
        <div class="sk-note" id="skFoldMsg"><b>Regla ABCDE:</b> Asimetría · Bordes · Color · Diámetro (≥6 mm es el umbral de atención) · Evolución. Un nevus normal es simétrico, de bordes regulares, color uniforme, &lt;6 mm y estable.</div>`);
      const dia = stage.querySelector('#skDia');
      dia.addEventListener('input', () => {
        K.dia = +dia.value; stage.querySelector('#skDiaTxt').textContent = fmt(K.dia.toFixed(1)) + ' mm';
        const m = stage.querySelector('#skDiaMsg');
        m.textContent = K.dia < 6 ? '<6 mm: normal' : '≥6 mm: supera el umbral (vigilar)';
        m.className = K.dia < 6 ? 'sk-ok' : 'sk-warn';
        draw();
      });
      const doFold = (m) => {
        if (K.folding) return;
        K.folding = true; mode = m; K.fold = 1; draw();
        const msg = stage.querySelector('#skFoldMsg');
        K.cancel.push(U.tween(900, u => { K.fold = 1 - 2 * u; draw(); }, () => {
          msg.innerHTML = `<b>Al doblar sobre el eje ${m === 'v' ? 'vertical' : 'horizontal'} las dos mitades coinciden</b>: el nevus es simétrico (criterio A normal).`;
          K.tm.push(setTimeout(() => {
            K.cancel.push(U.tween(700, u => { K.fold = -1 + 2 * u; draw(); }, () => { K.fold = 1; K.folding = false; draw(); }));
          }, 1200));
        }));
      };
      stage.querySelector('#skFoldV').addEventListener('click', () => doFold('v'));
      stage.querySelector('#skFoldH').addEventListener('click', () => doFold('h'));
    },
    onLeave: leaveAll
  };

  /* ============================================================ ESCENA 3: CABELLO */
  function headSvg(c, learn) {
    const t = tn(c), male = c.sex === 'M', R = rng(c.age * 31 + 7);
    const cx = 240, cy = 290, a = 160, b = 190, W = { x: 240, y: 335 };
    const hl = x => {
      const dx = (x - cx) / a;
      let y = 128 + 40 * dx * dx;
      if (male) y += 16 * Math.exp(-Math.pow((Math.abs(dx) - 0.62) / 0.2, 2));
      return y;
    };
    const pts = [];
    for (let i = 0; i < 60; i++) {
      const th = i / 60 * 2 * Math.PI, x = cx + a * Math.cos(th), y = Math.max(cy + b * Math.sin(th), hl(x));
      pts.push([x.toFixed(1), y.toFixed(1)]);
    }
    const dPoly = 'M' + pts.map(p => p.join(',')).join(' L') + ' Z';
    let s = `<rect x="10" y="10" width="450" height="510" rx="12" fill="#f7fafc" stroke="#c5d0db" stroke-width="2"/>`;
    s += `<text class="svg-title" x="24" y="34">Cuero cabelludo (vista superior)</text>`;
    s += `<ellipse cx="72" cy="290" rx="13" ry="34" fill="${t.skin}" stroke="${t.line}" stroke-width="3"/><ellipse cx="408" cy="290" rx="13" ry="34" fill="${t.skin}" stroke="${t.line}" stroke-width="3"/>`;
    s += `<path d="M215,76 L240,38 L265,76 Z" fill="${t.skin}" stroke="${t.line}" stroke-width="3" stroke-linejoin="round"/>`;
    s += `<ellipse cx="${cx}" cy="${cy}" rx="${a}" ry="${b}" fill="${t.skin}" stroke="${t.line}" stroke-width="3"/>`;
    s += `<path d="M150,108 Q190,92 215,100 M265,100 Q290,92 330,108" fill="none" stroke="${t.hair[0]}" stroke-width="6" stroke-linecap="round" opacity=".75"/>`;
    s += `<clipPath id="skHairClip"><path d="${dPoly}"/></clipPath><path d="${dPoly}" fill="${t.hair[0]}" opacity="${elder(c) ? 0.28 : 0.55}"/>`;
    const N = elder(c) ? 820 : 1150, wave = c.sex === 'F' ? 0.75 : 0.25;
    let hs = '';
    for (let i = 0; i < N; i++) {
      const rr = Math.sqrt(R()) * 0.985, th = R() * 2 * Math.PI;
      const x = cx + a * rr * Math.cos(th), y = cy + b * rr * Math.sin(th);
      if (y < hl(x) + 2) continue;
      const phi = Math.atan2(y - W.y, x - W.x) + 0.55, L = 15 + R() * 12, cv = (R() - 0.5) * wave * 2 + 0.3;
      const ex = x + L * Math.cos(phi), ey = y + L * Math.sin(phi), qx = x + L / 2 * Math.cos(phi + cv), qy = y + L / 2 * Math.sin(phi + cv);
      const col = t.hair[Math.floor(R() * 3)];
      const gray = c.age >= 40 && !elder(c) && R() < 0.1 ? '#a8a8a8' : col;
      hs += `<path d="M${x.toFixed(1)},${y.toFixed(1)} Q${qx.toFixed(1)},${qy.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}" stroke="${gray}" stroke-width="${elder(c) ? 1.2 : 1.6}" fill="none" opacity=".9"/>`;
    }
    s += `<g clip-path="url(#skHairClip)">${hs}</g>`;
    s += `<g class="hintring"><path d="M${W.x - 14},${W.y} a14,14 0 1,1 14,14" fill="none" stroke="#0e6a78" stroke-width="2"/><text class="svg-small" x="${W.x + 20}" y="${W.y + 30}">remolino (vértex)</text></g>`;
    s += `<text class="svg-small" x="30" y="505">Cabello ${elder(c) ? 'canoso, fino' : c.sex === 'F' ? 'castaño oscuro, ondulado' : 'oscuro, liso'}</text>`;
    /* lupa */
    s += `<rect x="480" y="10" width="280" height="250" rx="12" fill="#f7fafc" stroke="#c5d0db" stroke-width="2"/><text class="svg-title" x="494" y="34">Tricoscopia (lupa)</text>`;
    s += `<clipPath id="skLupaClip"><circle cx="620" cy="150" r="82"/></clipPath><circle cx="620" cy="150" r="82" fill="${t.skin}" stroke="#5b6978" stroke-width="5"/>`;
    const R2 = rng(c.age + 99);
    let lp = '';
    [[590, 118], [640, 108], [668, 150], [606, 168], [640, 190], [575, 156], [612, 138], [660, 132]].forEach(([x, y]) => {
      const n = 2 + Math.floor(R2() * 2);
      lp += `<circle cx="${x}" cy="${y}" r="3.5" fill="${t.line}" opacity=".55"/>`;
      for (let k = 0; k < n; k++) {
        const ang = -1.2 + (k - (n - 1) / 2) * 0.5 + R2() * 0.3;
        lp += `<path d="M${x},${y} q${14 * Math.cos(ang) + 4},${-16 + 8 * Math.sin(ang)} ${28 * Math.cos(ang)},${-34}" stroke="${t.hair[1]}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
      }
    });
    s += `<g clip-path="url(#skLupaClip)">${lp}</g>`;
    s += `<text class="svg-small" x="494" y="250">Unidades foliculares de 1-4 pelos</text>`;
    s += `<rect x="480" y="272" width="280" height="248" rx="12" fill="#f7fafc" stroke="#c5d0db" stroke-width="2"/><text class="svg-title" x="494" y="296">Datos de referencia</text>`;
    ['Ciclo del cabello:', '· Anágeno (crecimiento): 85-90 %, 2-6 años', '· Catágeno (transición): 1-2 %, ≈2 semanas', '· Telógeno (reposo): 10-15 %, ≈3 meses', 'Caída normal: 50-100 pelos al día', 'Crecimiento: ≈1 cm al mes', 'Densidad: ≈150-300 pelos/cm² (≈100 000 en total)', 'Prueba de tracción: salen <10 % de un mechón'].forEach((l, i) => {
      s += `<text class="svg-small" x="494" y="${322 + i * 22}" ${i === 0 ? 'style="font-weight:700"' : ''}>${l}</text>`;
    });
    return s;
  }

  function hairTools(zone) {
    const hairDesc = c => (elder(c) ? 'canoso (≈70-100 % de canas), de calibre más fino, brillo menor' : c.age >= 40 ? 'oscuro con escasas canas, liso, brillante' : 'oscuro, ondulado, brillante y flexible');
    const Z = {
      front: c => `Línea de implantación frontal <b>regular y simétrica</b>${c.sex === 'M' ? ', con leve entrada bitemporal (normal en el varón adulto; Norwood I-II)' : ', sin entradas'}; implantación densa y homogénea hasta la frente. Cabello ${hairDesc(c)}.`,
      tem: c => `Implantación temporal simétrica${c.sex === 'M' ? ' con ligera recesión bitemporal fisiológica' : ''}; sin placas de alopecia ni cabellos rotos; vello fino habitual en las sienes.`,
      ver: c => 'Región del <b>vértex</b>: remolino de dirección regular y cabello <b>denso</b>, sin adelgazamiento ni zonas sin pelo; cuero cabelludo apenas visible entre los pelos.',
      par: c => `Región parietal: distribución <b>uniforme y densa</b>, sin parches de alopecia ni zonas de rarefacción; textura ${elder(c) ? 'fina y lisa' : 'sin quebraduras ni puntas abiertas excesivas'}.`,
      occ: c => 'Región occipital y nuca: cabello denso y uniforme, implantación baja regular en la nuca; sin placas, costras ni adenopatías occipitales palpables.'
    };
    return {
      insp: c => `${Z[zone](c)} Cuero cabelludo de color uniforme (rosado según fototipo), <b>sin descamación (caspa), eritema, costras, pústulas ni liendres</b>; sin cicatrices ni otras lesiones primarias o secundarias.`,
      palp: 'Cuero cabelludo <b>tibio, flexible y móvil</b> sobre el cráneo, de superficie lisa, sin nódulos, quistes ni dolor a la palpación; grasa moderada (≈humedad normal); sin induración ni áreas atróficas.',
      trac: (c, ctx) => ({
        html: '<b>Prueba de tracción negativa:</b> al traccionar suavemente un mechón de ≈50-60 pelos desde la raíz hasta la punta salen <b>≤2-3 pelos (&lt;10 %)</b>; la caída fisiológica es de 50-100 pelos al día.',
        run: x => {
          const layer = x.svg.querySelector('#flash');
          clearFx(); layer.querySelectorAll('.sk-fx').forEach(n => n.remove());
          const g = el('g', { class: 'sk-fx' }); layer.appendChild(g);
          const ls = [-0.4, 0, 0.4].map(a => el('path', { stroke: '#38495a', 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round' }));
          ls.forEach(l => g.appendChild(l));
          K.cancel.push(U.tween(700, u => {
            ls.forEach((l, i) => {
              const a = -Math.PI / 2 + [-0.4, 0, 0.4][i], L = 12 + 26 * Math.sin(Math.PI * Math.min(1, u));
              l.setAttribute('d', `M${x.point.x},${x.point.y} L${x.point.x + L * Math.cos(a)},${x.point.y + L * Math.sin(a)}`);
            });
          }, () => {
            const tx = el('text', { x: x.point.x, y: x.point.y - 34, 'text-anchor': 'middle', class: 'svg-hint' });
            tx.textContent = '0-2 pelos'; g.appendChild(tx);
            K.tm.push(setTimeout(() => g.remove(), 1800));
          }));
        }
      }),
      lupa: c => 'Tricoscopia: <b>densidad conservada</b> (≈150-300 pelos/cm²), unidades foliculares de 1-4 pelos, calibre uniforme (<20 % de variación), sin pelos cortos en exceso, sin descamación perifolicular ni puntos amarillos o negros.'
    };
  }

  const cabello = {
    id: 'cab', label: 'Cabello y cuero cabelludo', viewBox: '0 0 770 530', redrawOnMode: false,
    hint: 'Inspecciona distribución, cantidad, implantación y textura; palpa el cuero cabelludo y realiza la prueba de tracción.',
    svg: (learn, c) => headSvg(c, learn),
    tools: [
      { id: 'insp', icon: '👁️', label: 'Inspección', hint: 'Distribución, cantidad, implantación, color y textura del cabello; estado del cuero cabelludo.' },
      { id: 'palp', icon: '🖐️', label: 'Palpación', hint: 'Textura, temperatura y lesiones del cuero cabelludo.' },
      { id: 'trac', icon: '💇', label: 'Prueba de tracción', hint: 'Traccionar suavemente un mechón de ≈50-60 pelos y contar los que salen.' },
      { id: 'lupa', icon: '🔍', label: 'Tricoscopia', hint: 'Lupa/dermatoscopio sobre el cuero cabelludo.' }
    ],
    regions: [
      { id: 'front', label: 'Región frontal y línea de implantación', short: 'Frontal', x: 150, y: 110, w: 180, h: 72, lx: 240, ly: 104, anchor: 'middle', tools: hairTools('front') },
      { id: 'temD', label: 'Región temporal derecha', short: 'Temporal D', cx: 372, cy: 200, r: 38, lx: 405, ly: 166, anchor: 'middle', tools: hairTools('tem') },
      { id: 'temI', label: 'Región temporal izquierda', short: 'Temporal I', cx: 108, cy: 200, r: 38, lx: 78, ly: 166, anchor: 'middle', tools: hairTools('tem') },
      { id: 'parD', label: 'Región parietal derecha', short: 'Parietal D', cx: 338, cy: 290, r: 42, lx: 338, ly: 242, anchor: 'middle', tools: hairTools('par') },
      { id: 'parI', label: 'Región parietal izquierda', short: 'Parietal I', cx: 142, cy: 290, r: 42, lx: 142, ly: 242, anchor: 'middle', tools: hairTools('par') },
      { id: 'ver', label: 'Vértex (coronilla)', short: 'Vértex', cx: 240, cy: 338, r: 44, lx: 240, ly: 288, anchor: 'middle', tools: hairTools('ver') },
      { id: 'occ', label: 'Región occipital y nuca', short: 'Occipital', cx: 240, cy: 440, r: 48, lx: 240, ly: 494, anchor: 'middle', tools: hairTools('occ') },
      { id: 'lupa', label: 'Tricoscopia (lupa)', short: 'Lupa', cx: 620, cy: 150, r: 82, lx: 620, ly: 56, anchor: 'middle', tools: { lupa: hairTools('ver').lupa, insp: hairTools('ver').lupa } }
    ],
    after: (stage) => {
      leaveAll(); injectCss();
      stage.insertAdjacentHTML('beforeend', `<div class="sk-note"><b>Normal:</b> cabello de distribución homogénea y densidad adecuada, buena implantación (línea frontal regular), textura flexible y resistente, brillante; cuero cabelludo sin descamación, eritema, costras, nódulos ni parásitos; sin alopecia; tracción negativa (&lt;10 %).</div>`);
    },
    onLeave: leaveAll
  };

  /* ============================================================ ESCENA 4: UÑAS */
  function profileMarkup(A, t) {
    const B = { x: 560, y: 165 }, r = A * Math.PI / 180, L = 120;
    const Pp = { x: B.x + L * Math.cos(r), y: B.y - L * Math.sin(r) }, D = { x: B.x + 120, y: B.y };
    const arcR = 46, a1 = { x: B.x + arcR, y: B.y }, a2 = { x: B.x + arcR * Math.cos(r), y: B.y - arcR * Math.sin(r) };
    let m = `<path d="M${Pp.x.toFixed(1)},${Pp.y.toFixed(1)} L${B.x},${B.y} L${D.x},${D.y} Q${D.x + 38},${D.y + 8} ${D.x + 30},${D.y + 48} L${D.x + 18},${D.y + 66} L${Pp.x.toFixed(1)},${B.y + 66} Z" fill="${t.skin}" stroke="${t.line}" stroke-width="3" stroke-linejoin="round"/>`;
    m += `<path d="M${B.x},${B.y - 1} L${D.x + 4},${D.y - 1}" stroke="#f0b5ab" stroke-width="9" stroke-linecap="round"/><path d="M${B.x + 6},${B.y - 5} L${D.x},${D.y - 5}" stroke="#fff" stroke-width="2" opacity=".6" stroke-linecap="round"/>`;
    m += `<path d="M${B.x - L},${B.y} L${B.x},${B.y}" stroke="#7a8a99" stroke-width="1.6" stroke-dasharray="5 4"/>`;
    m += `<path d="M${a1.x},${a1.y} A${arcR},${arcR} 0 ${A > 180 ? 1 : 0} 0 ${a2.x.toFixed(1)},${a2.y.toFixed(1)}" fill="none" stroke="#d9534f" stroke-width="2.4"/>`;
    m += `<circle cx="${B.x}" cy="${B.y}" r="4" fill="#d9534f"/>`;
    const mid = r / 2;
    m += `<text x="${(B.x + 72 * Math.cos(mid)).toFixed(1)}" y="${(B.y - 72 * Math.sin(mid) + 4).toFixed(1)}" font-size="17" font-weight="700" fill="#d9534f" text-anchor="middle" font-family="system-ui">${A}°</text>`;
    const cls = A < 170 ? ['Ángulo normal (≈160°)', '#237a4b'] : A < 180 ? ['Ángulo en el límite (170-179°)', '#9a6a05'] : ['Ángulo ≥180°: perfil sin concavidad', '#b3372f'];
    m += `<text x="610" y="258" font-size="13" font-weight="700" fill="${cls[1]}" text-anchor="middle" font-family="system-ui">${cls[0]}</text>`;
    /* signo de Schamroth: la ventana se cierra al acercarse a 180° */
    const hw = Math.max(0, Math.min(28, (180 - A) * 1.2)), hh = hw * 1.5;
    const Xc = 610, Y0 = 350, Y1 = 428;
    m += `<rect x="${Xc - 62}" y="${Y0}" width="62" height="170" rx="26" fill="${t.skin}" stroke="${t.line}" stroke-width="3"/><rect x="${Xc}" y="${Y0}" width="62" height="170" rx="26" fill="${t.skin}" stroke="${t.line}" stroke-width="3"/>`;
    m += `<rect x="${Xc - 50}" y="${Y0 + 14}" width="50" height="${Y1 - Y0 - 8}" rx="10" fill="#f3c1b8" stroke="#d99a90" stroke-width="1.5"/><rect x="${Xc}" y="${Y0 + 14}" width="50" height="${Y1 - Y0 - 8}" rx="10" fill="#f3c1b8" stroke="#d99a90" stroke-width="1.5"/>`;
    if (hw > 0.5) m += `<path d="M${Xc},${Y1 - hh} L${Xc + hw},${Y1} L${Xc},${Y1 + hh} L${Xc - hw},${Y1} Z" fill="#f7fafc" stroke="#7a8a99" stroke-width="1.5"/>`;
    m += `<text x="${Xc + 74}" y="${Y1 + 4}" class="svg-small">${hw > 0.5 ? 'ventana en rombo' : 'sin ventana'}</text>`;
    return m;
  }

  const unas = {
    id: 'una', label: 'Uñas', viewBox: '0 0 800 540', redrawOnMode: false,
    hint: 'Acércate a la uña: color, superficie, lúnula, pliegues; mide el ángulo de Lovibond y el llenado capilar.',
    svg: (learn, c) => {
      const t = tn(c);
      let b = `<rect x="10" y="10" width="400" height="520" rx="12" fill="#f7fafc" stroke="#c5d0db" stroke-width="2"/><text class="svg-title" x="24" y="34">Uña (vista dorsal)</text>`;
      b += `<rect x="430" y="10" width="360" height="270" rx="12" fill="#f7fafc" stroke="#c5d0db" stroke-width="2"/><text class="svg-title" x="444" y="34">Perfil: ángulo de Lovibond</text>`;
      b += `<rect x="430" y="290" width="360" height="240" rx="12" fill="#f7fafc" stroke="#c5d0db" stroke-width="2"/><text class="svg-title" x="444" y="314">Signo de Schamroth</text>`;
      b += `<path d="M130,520 L130,120 Q130,40 210,40 Q290,40 290,120 L290,520 Z" fill="${t.skin}" stroke="${t.line}" stroke-width="3"/>`;
      b += `<path d="M146,300 h128 M150,330 h120 M150,360 h120" stroke="${t.line}" stroke-width="1.5" opacity=".35"/>`;
      b += `<rect x="146" y="106" width="14" height="150" rx="6" fill="#e8b2a2" opacity=".85"/><rect x="260" y="106" width="14" height="150" rx="6" fill="#e8b2a2" opacity=".85"/>`;
      b += `<rect x="158" y="96" width="104" height="156" rx="22" fill="#f6cbc2" stroke="#d99a90" stroke-width="2" id="unNail"/>`;
      b += `<path d="M178,112 V236 M196,108 V240 M214,106 V240 M232,108 V240 M248,112 V236" stroke="#fff" stroke-width="1.2" opacity=".3"/>`;
      b += `<rect x="160" y="98" width="100" height="12" rx="6" fill="#fbf3ee"/><path d="M160,110 h100" stroke="#e6c9bf" stroke-width="1"/>`;
      b += `<path d="M172,252 Q172,214 210,210 Q248,214 248,252 Z" fill="#fdf6f2" opacity=".95"/>`;
      b += `<path d="M160,250 Q210,236 260,250 L260,268 Q210,254 160,268 Z" fill="#e3a090" stroke="#c98577" stroke-width="1.5"/>`;
      b += `<path d="M168,108 q8,-6 20,-6" stroke="#fff" stroke-width="3" opacity=".6" stroke-linecap="round" fill="none"/>`;
      return b;
    },
    tools: [
      { id: 'insp', icon: '👁️', label: 'Inspección', hint: 'Color, superficie, forma, lúnula y pliegues ungueales.' },
      { id: 'palp', icon: '🖐️', label: 'Palpación', hint: 'Consistencia de la lámina, pliegues y dolor.' },
      { id: 'cap', icon: '🔴', label: 'Llenado capilar', hint: 'Presiona la uña ≈5 s y mide el tiempo que tarda en volver el color.' },
      { id: 'lov', icon: '📐', label: 'Ángulo de Lovibond', hint: 'Mide el ángulo del perfil ungueal; arrastra el control para ver cómo cambia.' }
    ],
    regions: [
      {
        id: 'lib', label: 'Borde libre', short: 'Borde libre', x: 160, y: 94, w: 100, h: 18, lx: 210, ly: 84, anchor: 'middle',
        tools: {
          insp: 'Borde libre blanquecino, liso y regular, de 1-2 mm; sin fisuras, descamación ni onicólisis (la lámina está adherida al lecho). Hiponiquio íntegro.',
          palp: 'Lámina <b>dura pero flexible</b>, sin fragilidad ni dolor al presionar el borde.'
        }
      },
      {
        id: 'lam', label: 'Lámina y lecho ungueal', short: 'Lámina / lecho', x: 160, y: 114, w: 100, h: 94, lx: 210, ly: 152, anchor: 'middle',
        tools: {
          insp: c => `Lámina <b>rosada</b> (por la vascularización del lecho), translúcida, <b>lisa y brillante</b>, de curvatura normal, sin surcos ni punteado${elder(c) ? ' (con finas estrías longitudinales y algo más opaca y gruesa, cambios fisiológicos de la edad)' : ''}. <b>Sin líneas de Beau</b> (surcos transversales), <b>leuconiquia</b> (blancura), <b>coiloniquia</b> (uña en cuchara), onicólisis, pitting, hemorragias en astilla ni melanoniquia. Crecimiento ≈3 mm/mes en las manos (≈1 mm/mes en los pies).`,
          palp: 'Lámina firme y flexible, adherida al lecho, sin dolor ni fluctuación en la base; no se mueve al presionar (no hay «uña flotante»).',
          cap: (c, ctx) => {
            const tt = c.age < 35 ? 1.0 : c.age < 60 ? 1.3 : 1.6;
            return {
              html: `<b>Llenado capilar ≈${fmt(tt.toFixed(1))} s</b> (normal <b>&lt;2 s</b>): al comprimir la uña ≈5 s se blanquea el lecho y al soltar vuelve el color rosado en menos de 2 s. Mano a la altura del corazón y a temperatura ambiente.`,
              run: x => {
                const nl = x.svg.querySelector('#unNail');
                clearFx();
                if (!nl) return;
                const hex = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
                const tw = (f, to, ms, done) => { const a = hex(f), b = hex(to); K.cancel.push(U.tween(ms, u => nl.setAttribute('fill', '#' + a.map((v, i) => Math.round(v + (b[i] - v) * u).toString(16).padStart(2, '0')).join('')), done)); };
                tw('#f6cbc2', '#faf3ee', 450, () => K.tm.push(setTimeout(() => {
                  tw('#faf3ee', '#f6cbc2', tt * 1000, null);
                  const lay = x.svg.querySelector('#flash'), tx = el('text', { x: 210, y: 76, 'text-anchor': 'middle', class: 'svg-hint sk-fx' });
                  tx.textContent = `${fmt(tt.toFixed(1))} s`; lay.appendChild(tx); K.tm.push(setTimeout(() => tx.remove(), 3000));
                }, 700)));
              }
            };
          }
        }
      },
      {
        id: 'lun', label: 'Lúnula', short: 'Lúnula', x: 172, y: 212, w: 76, h: 38, lx: 210, ly: 238, anchor: 'middle',
        tools: {
          insp: 'Lúnula <b>blanquecina en media luna</b> en la base de la uña (visible sobre todo en pulgares e índices; puede no verse en otros dedos); bordes netos, sin cambio de color ni tamaño anormal.',
          palp: 'No es palpable; la lámina continúa lisa sobre la lúnula.'
        }
      },
      {
        id: 'cut', label: 'Cutícula y pliegue ungueal proximal', short: 'Cutícula', x: 160, y: 252, w: 100, h: 20, lx: 300, ly: 266, anchor: 'start',
        tools: {
          insp: 'Cutícula <b>íntegra</b>, lisa y adherida a la lámina; pliegue proximal sin eritema, edema ni supuración (<b>sin paroniquia</b>); sin padrastros ni telangiectasias periungueales.',
          palp: 'Pliegue proximal blando y <b>no doloroso</b>, sin calor ni fluctuación.'
        }
      },
      {
        id: 'plL', label: 'Pliegue ungueal lateral', short: 'Pliegue lateral', x: 138, y: 108, w: 20, h: 148, lx: 132, ly: 196, anchor: 'end',
        tools: {
          insp: 'Pliegues laterales lisos, de color normal, sin eritema, edema ni supuración; la lámina no se incrusta en ellos (sin uña encarnada).',
          palp: 'Pliegue lateral blando, <b>indoloro</b>, sin calor ni bultos.'
        }
      },
      {
        id: 'plR', label: 'Pliegue ungueal lateral', short: '', x: 262, y: 108, w: 20, h: 148,
        tools: {
          insp: 'Pliegues laterales lisos, de color normal, sin eritema, edema ni supuración.',
          palp: 'Pliegue lateral blando, <b>indoloro</b>, sin calor ni bultos.'
        }
      },
      {
        id: 'perfil', label: 'Perfil de la uña (ángulo de Lovibond)', short: 'Perfil', x: 440, y: 44, w: 340, h: 226, lx: 700, ly: 62, anchor: 'middle',
        tools: {
          lov: () => {
            const A = K.ang;
            if (A < 170) return `Ángulo de Lovibond ≈<b>${A}°</b>: <b>normal</b> (≈160°). Entre la lámina y el pliegue ungueal proximal existe una ligera concavidad. Un ángulo de 180° (perfil recto) o mayor indica pérdida del ángulo (hipocratismo); aquí no existe.`;
            if (A < 180) return `Ángulo ≈${A}°: en el límite superior; lo normal es ≈160° (menor de 170°). Valora también el signo de Schamroth y la ausencia de abombamiento de la uña.`;
            return `Ángulo ≈${A}°: perfil <b>sin concavidad</b> (≥180°); en la persona examinada el ángulo normal es ≈160°. Con este valor se pierde la ventana de Schamroth.`;
          },
          insp: 'Visto de perfil, la uña sale del pliegue proximal con un ángulo de ≈160° (concavidad leve); la <b>falange distal no está engrosada</b> ni la uña abombada (sin hipocratismo digital).',
          palp: 'Pulpejo y falange distal de grosor normal, sin esponjosidad ni fluctuación en la base de la uña.'
        }
      },
      {
        id: 'sch', label: 'Signo de Schamroth', short: 'Schamroth', x: 440, y: 334, w: 340, h: 188, lx: 700, ly: 346, anchor: 'middle',
        tools: {
          insp: 'Al enfrentar las uñas de dos dedos homólogos por su cara dorsal se observa una <b>ventana en forma de rombo (diamante)</b> entre los pliegues proximales: <b>signo de Schamroth negativo</b> (normal). Su pérdida acompaña al hipocratismo digital.',
          lov: 'La ventana de Schamroth mide ≈ los grados que separan el perfil de 180°: con ≈160° la ventana está bien abierta (normal).'
        }
      }
    ],
    after: (stage, sh, ctx) => {
      leaveAll(); injectCss();
      K.live = true; K.ang = 160;
      const t = tn(sh.case);
      const dyn = el('g', { id: 'unDyn', style: 'pointer-events:none' });
      ctx.svg.insertBefore(dyn, ctx.svg.querySelector('#hits'));
      const draw = () => { dyn.innerHTML = profileMarkup(K.ang, t); };
      draw();
      stage.insertAdjacentHTML('beforeend', `<div class="sk-bar"><span class="sk-lbl">Ángulo del perfil ungueal</span>
        <input type="range" id="skAng" min="140" max="200" step="2" value="160"><b class="sk-read" id="skAngTxt">160°</b>
        <span class="sk-read" style="color:var(--muted)">Normal ≈160°; ≥180° = pérdida del ángulo</span></div>
        <div class="sk-note"><b>Normal:</b> uñas rosadas, lisas y brillantes, ángulo de Lovibond ≈160°, ventana de Schamroth presente, llenado capilar &lt;2 s; sin líneas de Beau, leuconiquia, coiloniquia, hemorragias en astilla ni onicólisis.</div>`);
      const sl = stage.querySelector('#skAng');
      sl.addEventListener('input', () => { K.ang = +sl.value; stage.querySelector('#skAngTxt').textContent = K.ang + '°'; draw(); });
    },
    onLeave: leaveAll
  };

  /* ============================================================ ESCENA 5: MUCOSAS */
  function mucSvg(c) {
    const t = tn(c), R = rng(c.age * 13 + 5);
    let s = '';
    const panel = (x, y, w, h, tt) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#f7fafc" stroke="#c5d0db" stroke-width="2"/><text class="svg-title" x="${x + 14}" y="${y + 24}">${tt}</text>`;
    s += panel(10, 10, 400, 260, 'Ojo: conjuntiva palpebral y esclera') + panel(420, 10, 390, 260, 'Labios y mucosa labial') + panel(10, 280, 400, 250, 'Boca abierta') + panel(420, 280, 390, 250, 'Lengua: dorso y cara ventral');
    /* ojo */
    const almond = 'M110,138 Q210,58 310,138 Q210,166 110,138 Z';
    s += `<ellipse cx="210" cy="150" rx="150" ry="92" fill="${t.skin}" stroke="${t.line}" stroke-width="2"/>`;
    s += `<path d="M108,146 Q210,176 312,146 L316,166 Q210,216 104,166 Z" fill="#df6f6a" stroke="#b9514c" stroke-width="2"/>`;
    for (let i = 0; i < 16; i++) { const x = 126 + i * 11.5, y = 160 + Math.sin(i / 3) * 4 + Math.abs(i - 8) * 0.6 * 0.0; s += `<path d="M${x.toFixed(1)},${(152 + R() * 4).toFixed(1)} q${(R() * 6 - 3).toFixed(1)},${(10 + R() * 8).toFixed(1)} ${(R() * 8 - 4).toFixed(1)},${(22 + R() * 14).toFixed(1)}" stroke="#c0443f" stroke-width="1" fill="none" opacity=".6"/>`; }
    s += `<path d="M104,166 Q210,216 316,166" fill="none" stroke="${t.line}" stroke-width="3.5" stroke-linecap="round"/>`;
    s += `<path d="${almond}" fill="#fbfbf8" stroke="${t.line}" stroke-width="2.5"/>`;
    s += `<clipPath id="skEyeClip"><path d="${almond}"/></clipPath><g clip-path="url(#skEyeClip)"><circle cx="210" cy="124" r="32" fill="${t.eye}"/><circle cx="210" cy="124" r="12" fill="#111"/><circle cx="220" cy="114" r="4.5" fill="#fff" opacity=".85"/>${elder(c) ? '<circle cx="210" cy="124" r="32" fill="none" stroke="#cfd4d6" stroke-width="5" opacity=".7"/>' : ''}</g>`;
    s += `<path d="M110,138 Q210,58 310,138" fill="none" stroke="${t.line}" stroke-width="5" stroke-linecap="round"/>`;
    for (let i = 0; i < 14; i++) { const u = i / 13, x = 118 + u * 184, y = 138 - Math.sin(Math.PI * u) * 40; s += `<path d="M${x.toFixed(1)},${(y + 4).toFixed(1)} l${((u - 0.5) * 8).toFixed(1)},-9" stroke="#2c211c" stroke-width="2" stroke-linecap="round"/>`; }
    /* labios */
    s += `<ellipse cx="560" cy="165" rx="150" ry="100" fill="${t.skin}" stroke="${t.line}" stroke-width="2"/>`;
    s += `<path d="M540,100 v22 M580,100 v22" stroke="${t.line}" stroke-width="2" opacity=".35"/>`;
    s += `<path d="M470,150 Q510,120 545,132 Q560,125 575,132 Q610,120 650,150 Q560,170 470,150 Z" fill="${t.lip}" stroke="#8a4540" stroke-width="2"/>`;
    s += `<path d="M470,150 Q560,184 650,150 Q630,205 560,212 Q490,205 470,150 Z" fill="${t.lip}" stroke="#8a4540" stroke-width="2"/><path d="M500,168 Q560,196 620,168" fill="none" stroke="#fff" stroke-width="5" opacity=".15" stroke-linecap="round"/>`;
    s += `<path d="M470,150 Q560,172 650,150" fill="none" stroke="#7a3a35" stroke-width="3" stroke-linecap="round"/>`;
    s += `<circle cx="735" cy="168" r="56" fill="#d9776f" stroke="#5b6978" stroke-width="5"/>`;
    for (let i = 0; i < 12; i++) { const a = R() * 6.28, rr = Math.sqrt(R()) * 42; s += `<circle cx="${(735 + rr * Math.cos(a)).toFixed(1)}" cy="${(168 + rr * Math.sin(a)).toFixed(1)}" r="${(2 + R() * 2).toFixed(1)}" fill="#e89a92" opacity=".8"/>`; }
    s += `<path d="M710,150 q22,-16 44,0" fill="none" stroke="#fff" stroke-width="5" opacity=".3" stroke-linecap="round"/><text class="svg-small" x="735" y="244" text-anchor="middle">Mucosa labial interna</text>`;
    /* boca abierta */
    s += `<ellipse cx="210" cy="395" rx="150" ry="100" fill="#8a3535" stroke="#6a2626" stroke-width="3"/>`;
    s += `<ellipse cx="84" cy="398" rx="26" ry="56" fill="#e58f88"/><ellipse cx="336" cy="398" rx="26" ry="56" fill="#e58f88"/>`;
    s += `<ellipse cx="210" cy="372" rx="72" ry="26" fill="#e9a29a"/><path d="M160,364 q10,6 20,0 M190,366 q10,6 20,0 M220,366 q10,6 20,0 M250,364 q10,6 20,0" stroke="#d98179" stroke-width="2" fill="none"/>`;
    s += `<ellipse cx="210" cy="428" rx="78" ry="36" fill="#e0807c" stroke="#b85b57" stroke-width="2"/><path d="M210,396 V452" stroke="#c4605b" stroke-width="2"/>`;
    s += `<ellipse cx="210" cy="396" rx="8" ry="16" fill="#e9a29a" stroke="#c4605b" stroke-width="1.5"/>`;
    s += `<path d="M188,380 Q184,404 196,420 M232,380 Q236,404 224,420" fill="none" stroke="#b85b57" stroke-width="2"/>`;
    s += `<path d="M96,338 Q210,298 324,338" fill="none" stroke="#e88e86" stroke-width="18" stroke-linecap="round"/><path d="M100,462 Q210,502 320,462" fill="none" stroke="#e88e86" stroke-width="16" stroke-linecap="round"/>`;
    for (let i = 0; i < 8; i++) s += `<rect x="${104 + i * 27}" y="${338 + Math.abs(i - 3.5) * 1.8}" width="24" height="24" rx="6" fill="#fdfcf6" stroke="#d8d2c0" stroke-width="1.2"/>`;
    for (let i = 0; i < 8; i++) s += `<rect x="${108 + i * 26}" y="${440 - Math.abs(i - 3.5) * 1.5}" width="23" height="21" rx="6" fill="#fdfcf6" stroke="#d8d2c0" stroke-width="1.2"/>`;
    s += `<circle cx="98" cy="374" r="4" fill="#f4b3a7"/><circle cx="322" cy="374" r="4" fill="#f4b3a7"/><circle cx="82" cy="404" r="2" fill="#f0e2a8"/><circle cx="90" cy="414" r="2" fill="#f0e2a8"/><circle cx="332" cy="410" r="2" fill="#f0e2a8"/>`;
    /* lengua */
    const tongue = (cx0, fill) => `<path d="M${cx0 - 50},330 Q${cx0},310 ${cx0 + 50},330 Q${cx0 + 70},380 ${cx0 + 60},430 Q${cx0 + 40},496 ${cx0},498 Q${cx0 - 40},496 ${cx0 - 60},430 Q${cx0 - 70},380 ${cx0 - 50},330 Z" fill="${fill}" stroke="#b85b57" stroke-width="2.5"/>`;
    s += tongue(520, '#e07f7b') + `<path d="M520,336 V478" stroke="#c4605b" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="520" cy="410" rx="46" ry="66" fill="#fff" opacity=".16"/>`;
    for (let i = 0; i < 26; i++) { const a = R() * 6.28, rr = Math.sqrt(R()) * 44; s += `<circle cx="${(520 + rr * Math.cos(a) * 0.9).toFixed(1)}" cy="${(410 + rr * Math.sin(a) * 1.4).toFixed(1)}" r="${(1.6 + R() * 1.2).toFixed(1)}" fill="#c4413d" opacity=".7"/>`; }
    s += tongue(700, '#e8908b') + `<path d="M700,420 V478" stroke="#c4605b" stroke-width="3" stroke-linecap="round"/><path d="M682,350 Q678,420 680,474 M718,350 Q722,420 720,474" stroke="#6a7fb5" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".85"/>`;
    s += `<circle cx="690" cy="482" r="3.5" fill="#f5b4ac"/><circle cx="710" cy="482" r="3.5" fill="#f5b4ac"/>`;
    s += `<text class="svg-small" x="520" y="520" text-anchor="middle">Dorso</text><text class="svg-small" x="700" y="520" text-anchor="middle">Cara ventral</text>`;
    return s;
  }

  const mucosas = {
    id: 'muc', label: 'Mucosas y conjuntivas', viewBox: '0 0 820 540', redrawOnMode: false,
    hint: 'Inspecciona y palpa (con guantes) conjuntivas, labios, mucosa yugal, encías, paladar y lengua; evierte el párpado inferior.',
    svg: (learn, c) => mucSvg(c),
    tools: [
      { id: 'insp', icon: '👁️', label: 'Inspección', hint: 'Color, humedad, brillo, integridad; con buena luz y baja lengua si es necesario.' },
      { id: 'evert', icon: '🔍', label: 'Evertir párpado', hint: 'Tira suavemente del párpado inferior hacia abajo mientras el paciente mira hacia arriba.' },
      { id: 'palp', icon: '🖐️', label: 'Palpación', hint: 'Con guantes: consistencia, superficie y dolor.' }
    ],
    regions: [
      {
        id: 'esc', label: 'Esclera y conjuntiva bulbar', short: 'Esclera', x: 112, y: 76, w: 196, h: 66, lx: 210, ly: 68, anchor: 'middle',
        tools: {
          insp: c => `<b>Esclera blanca</b> (sin tinte amarillo: sin ictericia) y conjuntiva bulbar transparente, lisa, húmeda y brillante, con escasos vasos finos; sin inyección, hemorragias, pterigion, secreción ni lagrimeo anormal. Córnea transparente${elder(c) ? ' (arco senil: anillo blanco-grisáceo periférico, frecuente y benigno en mayores de 60 años)' : ''}.`,
          palp: 'No se palpa el globo ocular; solo se valora el párpado: blando, sin tumefacción ni dolor.'
        }
      },
      {
        id: 'cpal', label: 'Conjuntiva palpebral inferior', short: 'Conjuntiva palpebral', x: 112, y: 150, w: 196, h: 62, lx: 210, ly: 232, anchor: 'middle',
        tools: {
          insp: 'Al evertir el párpado: conjuntiva palpebral <b>rosada-rojiza, húmeda, lisa y brillante</b>, con red vascular fina visible; <b>sin palidez</b> (se compara con el color de la propia piel), sin folículos, papilas ni hiperemia, sin cuerpos extraños.',
          evert: 'Con el paciente mirando hacia arriba y tirando del párpado inferior hacia abajo: conjuntiva palpebral <b>rosada, húmeda</b> y de aspecto normal; la palidez conjuntival (ausente aquí) se busca como signo de anemia.',
          palp: 'Párpado inferior blando y móvil, sin tumefacción, chalazión ni dolor.'
        }
      },
      {
        id: 'lab', label: 'Labios', short: 'Labios', x: 468, y: 118, w: 184, h: 98, lx: 560, ly: 112, anchor: 'middle',
        tools: {
          insp: 'Labios <b>simétricos</b>, de color rosado (según el fototipo), húmedos y lisos, con el borde bermellón neto; <b>sin cianosis, fisuras, costras, vesículas ni queilitis</b>; comisuras íntegras y sin desviación al sonreír.',
          palp: 'Labios blandos, de superficie lisa, sin induración, nódulos ni dolor.'
        }
      },
      {
        id: 'lmuc', label: 'Mucosa labial interna', short: 'Mucosa labial', cx: 735, cy: 168, r: 56, lx: 735, ly: 102, anchor: 'middle',
        tools: {
          insp: 'Mucosa labial interna <b>rosada-rojiza, húmeda y lisa</b>, con pequeñas elevaciones puntiformes (glándulas salivales menores); frenillo íntegro; sin úlceras ni placas.',
          palp: 'Se palpan las glándulas salivales menores como <b>pequeños granos blandos e indoloros</b>; mucosa lisa y deslizante, sin induración.'
        }
      },
      {
        id: 'yugD', label: 'Mucosa yugal derecha', short: 'M. yugal', cx: 84, cy: 398, r: 30, lx: 52, ly: 346, anchor: 'middle',
        tools: {
          insp: 'Mucosa yugal <b>rosada, húmeda y lisa</b>, con la línea alba oclusal; <b>papila del conducto de Stensen</b> frente al 2.º molar superior (sin enrojecimiento ni secreción). Pueden verse <b>puntos de Fordyce</b> (glándulas sebáceas ectópicas amarillentas, normales en la mayoría de los adultos). Sin placas, úlceras ni manchas.',
          palp: 'Mucosa blanda, de superficie lisa, sin induración ni nódulos; el conducto de Stensen no está engrosado ni doloroso.'
        }
      },
      {
        id: 'yugI', label: 'Mucosa yugal izquierda', short: 'M. yugal', cx: 336, cy: 398, r: 30, lx: 368, ly: 346, anchor: 'middle',
        tools: {
          insp: 'Mucosa yugal <b>rosada, húmeda y lisa</b>, simétrica con la contralateral; papila del conducto de Stensen normal; sin placas, úlceras ni manchas.',
          palp: 'Mucosa blanda, lisa e indolora, sin induración ni nódulos.'
        }
      },
      {
        id: 'enc', label: 'Encías', short: 'Encías', x: 98, y: 316, w: 224, h: 20, lx: 210, ly: 306, anchor: 'middle',
        tools: {
          insp: 'Encías <b>rosado-coral</b>, firmes, con punteado en «piel de naranja», márgenes festoneados y papilas interdentales puntiagudas; <b>sin enrojecimiento, hinchazón, sangrado ni retracción</b>; sin úlceras.',
          palp: 'Encía firme, adherida al hueso, indolora y que no sangra al roce suave.'
        }
      },
      {
        id: 'den', label: 'Dientes', short: 'Dientes', x: 100, y: 338, w: 220, h: 26, lx: 210, ly: 332, anchor: 'middle',
        tools: {
          insp: c => `Dentición ${elder(c) ? 'con alguna pieza ausente o prótesis bien adaptada (esperable en el adulto mayor)' : 'completa (32 piezas en el adulto, 28 sin cordales)'}, de color uniforme, sin caries ni fracturas visibles, con oclusión correcta; mucosa de soporte sana.`,
          palp: 'Piezas firmes, sin movilidad ni dolor a la presión.'
        }
      },
      {
        id: 'pal', label: 'Paladar duro y blando', short: 'Paladar', x: 142, y: 364, w: 136, h: 30, lx: 286, ly: 378, anchor: 'start',
        tools: {
          insp: 'Paladar duro <b>rosado</b>, firme, con rugas palatinas transversales y rafe medio; paladar blando móvil y rosado; sin petequias, úlceras, tumefacciones ni exudados.',
          palp: 'Paladar duro firme y liso; sin masas ni dolor; el torus palatino (si existe) es una variante normal.'
        }
      },
      {
        id: 'oro', label: 'Orofaringe y úvula', short: 'Orofaringe', cx: 210, cy: 400, r: 18, lx: 270, ly: 396, anchor: 'start',
        tools: {
          insp: 'Úvula <b>central y móvil</b>, pilares amigdalinos simétricos, mucosa faríngea rosada y húmeda; amígdalas no aumentadas de tamaño, sin exudados ni eritema.',
          palp: 'No se palpa de rutina; el reflejo nauseoso está presente.'
        }
      },
      {
        id: 'leng', label: 'Dorso de la lengua', short: 'Lengua (dorso)', x: 462, y: 320, w: 116, h: 176, lx: 520, ly: 312, anchor: 'middle',
        tools: {
          insp: 'Lengua <b>rosada y húmeda</b>, de tamaño normal, con papilas filiformes uniformes y una <b>capa blanquecina fina</b>; papilas fungiformes rojizas dispersas; surco medio. Sin fisuras, úlceras, placas ni masas. Protruye en la <b>línea media</b>, sin desviación ni temblor (XII par), y se mueve con libertad.',
          palp: 'Lengua blanda y flexible, de superficie lisa; sin induración, nódulos ni dolor a la palpación de los bordes.'
        }
      },
      {
        id: 'lengv', label: 'Cara ventral de la lengua', short: 'Lengua (ventral)', x: 642, y: 320, w: 116, h: 176, lx: 700, ly: 312, anchor: 'middle',
        tools: {
          insp: 'Mucosa ventral <b>lisa, rosada y húmeda</b>, con las <b>venas raninas azuladas</b> visibles a cada lado del frenillo (normal); frenillo íntegro; carúnculas sublinguales simétricas; sin placas, úlceras ni masas.',
          palp: 'Suelo de boca blando; sin induración ni nódulos; los conductos de Wharton no están dolorosos.'
        }
      }
    ],
    after: (stage) => {
      leaveAll(); injectCss();
      stage.insertAdjacentHTML('beforeend', `<div class="sk-note"><b>Normal:</b> mucosas <b>húmedas, rosadas y brillantes</b>, sin palidez, cianosis ni ictericia; conjuntiva palpebral rosada; labios simétricos y lisos; lengua rosada, húmeda y móvil; sin placas, úlceras, fisuras ni sangrado. <small>Usa guantes para palpar la cavidad oral.</small></div>`);
    },
    onLeave: leaveAll
  };

  /* ============================================================ CUESTIONARIO */
  const quiz = [
    { q: 'En la regla ABCDE de los nevus, el diámetro normal es…', options: ['<6 mm', '≥10 mm', 'Siempre <1 mm', 'Cualquier tamaño si es pigmentado'], a: 0,
      why: 'Un diámetro <6 mm (aprox. el de una goma de lápiz) se considera normal; junto con la simetría, los bordes regulares, el color uniforme y la estabilidad.' },
    { q: 'El ángulo de Lovibond normal entre la lámina ungueal y el pliegue proximal es…', options: ['≥180°', '≈160°', '≈120°', '≈200°'], a: 1,
      why: 'Normalmente ≈160° (ligera concavidad); al llegar a 180° o más se pierde el ángulo, como ocurre en el hipocratismo digital.' },
    { q: 'El llenado capilar del lecho ungueal normal es…', options: ['<2 s', '5-10 s', '>10 s', 'Siempre inmediato (<0,1 s)'], a: 0,
      why: 'Tras comprimir la uña unos 5 s, el color rosado vuelve en menos de 2 s.' },
    { q: 'Al soltar un pliegue de piel pellizcado (turgor), en una persona sana la piel…', options: ['Persiste en pliegue más de 5 s', 'Regresa en <2 s', 'Nunca debe regresar completamente', 'Regresa solo con masaje'], a: 1,
      why: 'La elasticidad conservada hace que el pliegue se aplane en <2 s; en ancianos regresa más lento y el signo no es fiable para la hidratación.' },
    { q: 'Una mácula es…', options: ['Una elevación sólida <1 cm', 'Un cambio de color plano <1 cm', 'Una lesión con pus', 'Una elevación con líquido claro ≥1 cm'], a: 1,
      why: 'Mácula: cambio de color, plano, no palpable, <1 cm (mancha si ≥1 cm). Pápula: elevación sólida <1 cm; pústula: con pus; ampolla: líquido claro ≥1 cm.' },
    { q: 'La conjuntiva palpebral normal es…', options: ['Pálida y seca', 'Rosada-rojiza, húmeda y lisa', 'Amarilla y brillante', 'Azulada con vasos prominentes'], a: 1,
      why: 'Se evalúa evirtiendo el párpado inferior; normalmente es rosada y húmeda, con red vascular fina visible; la palidez orienta a anemia.' },
    { q: 'La pérdida diaria fisiológica de cabello es de aproximadamente…', options: ['0-5 pelos', '50-100 pelos', '300-500 pelos', '>1000 pelos'], a: 1,
      why: 'Se pierden normalmente 50-100 cabellos al día (fase telógena); en la prueba de tracción salen <10 % de un mechón.' },
    { q: 'Respecto a la piel de palmas y plantas es cierto que…', options: ['Tienen abundantes folículos pilosos', 'Tienen glándulas sebáceas abundantes', 'Son la piel más gruesa y carecen de pelo y de glándulas sebáceas', 'Son siempre más delgadas que la del dorso'], a: 2,
      why: 'Palmas y plantas tienen epidermis gruesa (hasta ≈1,5 mm), crestas dérmicas, muchas glándulas ecrinas y no tienen pelo ni glándulas sebáceas.' }
  ];

  const teaching = [
    'Inspecciona con <b>buena luz natural</b> y compara siempre ambos lados y zonas fotoexpuestas con no expuestas; describe color, textura, humedad, temperatura (con el dorso de la mano), turgor, movilidad y lesiones con la terminología correcta (mácula, pápula, placa, vesícula, ampolla, pústula, nódulo, habón).',
    'El <b>turgor</b> se explora pellizcando el dorso de la mano o la región infraclavicular: el pliegue debe aplanarse en <b>&lt;2 s</b>. En el anciano la piel pierde elasticidad y el signo no es fiable para valorar la hidratación.',
    'Aplica la regla <b>ABCDE</b> a los nevus (asimetría, bordes, color, diámetro ≥6 mm, evolución) y la del «patito feo»: un nevus que no se parece a los demás merece atención. Un nevus normal es simétrico, regular, uniforme, <6 mm y estable.',
    'En las uñas valora color, superficie, lúnula y pliegues; mide el <b>ángulo de Lovibond</b> (≈160°) y el signo de Schamroth (ventana en rombo presente) y el llenado capilar (<2 s). En el cabello, evalúa distribución, densidad, implantación y textura, y haz la prueba de tracción (<10 %).',
    'Para las mucosas: luz adecuada y guantes; compara conjuntivas (evirtiendo el párpado inferior), labios, mucosa yugal, encías, paladar y lengua; deben ser <b>húmedas, rosadas y lisas</b>, sin palidez, cianosis ni ictericia.'
  ];

  NormalEngine.build({
    id: 'skin', title: 'Piel, faneras y mucosas (normal)', icon: '🖐️', group: 'Exploración normal',
    desc: 'Inspección y palpación de la piel, regla ABCDE de los nevus, cabello, uñas (Lovibond y llenado capilar), mucosas y conjuntivas en personas sanas.',
    bullets: ['Turgor con animación de pellizco y terminología dermatológica', 'Nevus con regla ABCDE y control de diámetro', 'Uñas con ángulo de Lovibond interactivo y mucosas'],
    teaching, quiz,
    scenes: [piel, lunares, cabello, unas, mucosas]
  });
})();
