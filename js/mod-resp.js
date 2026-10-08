/* Módulo de exploración NORMAL: aparato respiratorio.
   Escenas: inspección, palpación (posterior y anterior), percusión (anterior y posterior) y auscultación (anterior y posterior). */
(function () {
  'use strict';
  const SK = '#f1c9a5', SKD = '#b98a63', RIB = '#d6b99a', BONE = '#a97d58';
  const TORSO = 'M170,92 C140,100 85,100 62,118 C40,135 38,170 42,220 C46,300 62,380 70,460 L80,545 L340,545 L350,460 C358,380 374,300 378,220 C382,170 380,135 358,118 C335,100 280,100 250,92 Z';
  const NECK = 'M178,10 L242,10 L250,95 L170,95 Z';
  const fmt = (x, d) => Number(x).toFixed(d == null ? 1 : d).replace('.', ',');
  const mir = x => 420 - x;

  /* ------------------------------------------------------------ dibujo */
  function antBody(anim) {
    let g = `<path d="${NECK}" fill="${SK}" stroke="${SKD}" stroke-width="3"/><path d="${TORSO}" fill="${SK}" stroke="${SKD}" stroke-width="3"/>`;
    for (let j = 1; j <= 7; j++) {
      const y = 110 + 26 * (j - 1);
      g += `<path d="M210,${y} Q150,${y + 6} 68,${y + 52}" fill="none" stroke="${RIB}" stroke-width="2"/>` +
           `<path d="M210,${y} Q270,${y + 6} 352,${y + 52}" fill="none" stroke="${RIB}" stroke-width="2"/>`;
    }
    [['M170,346 Q115,356 62,408'], ['M144,372 Q100,386 60,436'], ['M120,396 Q88,412 62,462']].forEach(p => {
      g += `<path d="${p[0]}" fill="none" stroke="${RIB}" stroke-width="2"/>` +
           `<path d="${p[0].replace(/(\d+),(\d+)/g, (m, a, b) => mir(+a) + ',' + b)}" fill="none" stroke="${RIB}" stroke-width="2"/>`;
    });
    g += `<path d="M172,100 Q130,108 80,124 M248,100 Q290,108 340,124" fill="none" stroke="${BONE}" stroke-width="3"/>`;
    g += `<path d="M210,100 L210,300" fill="none" stroke="${BONE}" stroke-width="5" stroke-linecap="round" opacity=".7"/>`;
    g += `<path d="M205,296 L215,296 L210,312 Z" fill="${BONE}" opacity=".8"/>`;
    g += `<path d="M210,306 L132,384 Q96,420 74,470 M210,306 L288,384 Q324,420 346,470" fill="none" stroke="${BONE}" stroke-width="3" opacity=".8"/>`;
    g += `<circle cx="145" cy="218" r="6" fill="#c98f7a"/><circle cx="275" cy="218" r="6" fill="#c98f7a"/>`;
    return anim ? `<g id="chestAnim">${g}</g>` : g;
  }
  function postBody() {
    let g = `<path d="${NECK}" fill="${SK}" stroke="${SKD}" stroke-width="3"/><path d="${TORSO}" fill="${SK}" stroke="${SKD}" stroke-width="3"/>`;
    for (let j = 1; j <= 10; j++) {
      const y = 108 + 24 * j;
      g += `<path d="M210,${y} Q290,${y + 8} 355,${y + 20}" fill="none" stroke="${RIB}" stroke-width="2"/>` +
           `<path d="M210,${y} Q130,${y + 8} 65,${y + 20}" fill="none" stroke="${RIB}" stroke-width="2"/>`;
    }
    g += `<path d="M210,96 L210,470" stroke="${BONE}" stroke-width="4" stroke-dasharray="3 7" stroke-linecap="round"/>`;
    g += `<ellipse cx="278" cy="178" rx="28" ry="52" transform="rotate(-8 278 178)" fill="#e7bf9a" stroke="${BONE}" stroke-width="3"/>` +
         `<ellipse cx="142" cy="178" rx="28" ry="52" transform="rotate(8 142 178)" fill="#e7bf9a" stroke="${BONE}" stroke-width="3"/>`;
    return g;
  }
  const lbl = (txt, x, y, anchor) => `<text class="svg-hint hintring" x="${x}" y="${y}" text-anchor="${anchor || 'middle'}">${txt}</text>`;
  const LUNG_ANT = `<path class="hintring" d="M205,112 C150,100 98,128 94,210 C93,240 108,262 140,262 C175,262 204,258 204,250 Z" fill="#7ec3d9" opacity=".3"/>` +
    `<path class="hintring" d="M216,112 C268,100 322,128 326,210 C327,240 312,264 280,264 C255,264 240,255 234,236 C226,210 218,190 216,150 Z" fill="#7ec3d9" opacity=".3"/>`;
  const LUNG_POST = `<ellipse class="hintring" cx="290" cy="232" rx="62" ry="118" fill="#7ec3d9" opacity=".25"/><ellipse class="hintring" cx="130" cy="232" rx="62" ry="118" fill="#7ec3d9" opacity=".25"/>`;
  const HEART = `<ellipse class="hintring" cx="238" cy="222" rx="32" ry="42" transform="rotate(-15 238 222)" fill="#d9534f" opacity=".3"/>`;
  const LIVER = `<path class="hintring" d="M100,262 C130,255 190,255 215,262 C220,290 214,322 196,332 C150,338 112,322 100,262 Z" fill="#a0603a" opacity=".3"/>`;
  const TRAUBE = `<ellipse class="hintring" cx="296" cy="330" rx="36" ry="26" fill="#e0c060" opacity=".35"/>`;
  const SIDE_ANT = `<text x="40" y="40" class="svg-small">D</text><text x="372" y="40" class="svg-small">I</text>`;
  const SIDE_POST = `<text x="40" y="40" class="svg-small">I</text><text x="372" y="40" class="svg-small">D</text>`;
  const LMC = `<path class="hintring" d="M145,100 L145,420 M275,100 L275,420" stroke="#0e6a78" stroke-width="1.5" stroke-dasharray="2 6" fill="none"/>` + lbl('LMC', 145, 96) + lbl('LMC', 275, 96);

  /* ----------------------------------------------------------- regiones */
  const R = (id, label, short, cx, cy, r, tools, extra) => Object.assign({ id, label, short, cx, cy, r, tools }, extra || {});
  const RECT = (id, label, short, x, y, w, h, tools, extra) => Object.assign({ id, label, short, x, y, w, h, tools }, extra || {});

  const LIMITS = 'Límites inferiores del pulmón en espiración normal: 6.ª costilla en la línea medioclavicular (LMC), 8.ª en la línea axilar media (LAM) y 10.ª en la línea escapular (T10 por detrás).';
  const typeTxt = c => (c.age >= 60 ? 'mixto (costoabdominal)' : c.sex === 'F' ? 'costal superior (torácico), más marcado en la mujer' : 'abdominal o costodiafragmático, predominante en el varón');

  /* ------------------------------------------------------------ INSPECCIÓN */
  let inspStop = null;
  const INSP = {
    id: 'insp', label: 'Inspección', viewBox: '0 0 420 560',
    hint: 'Observa la forma del tórax, la simetría y el patrón respiratorio (el tórax se mueve a la frecuencia real de la persona). Haz clic en cada zona.',
    tools: [{ id: 'look', icon: '👁️', label: 'Inspección', hint: 'Inspección: forma del tórax, simetría, ángulo epigástrico, frecuencia y patrón respiratorio, uso de músculos accesorios y tiraje.' }],
    svg: () => {
      const inset = `<rect x="118" y="428" width="184" height="118" rx="10" fill="#fff" opacity=".93" stroke="#cfd8e2"/>
        <text x="210" y="446" text-anchor="middle" class="svg-small">Corte axial (visto desde abajo)</text>
        <ellipse cx="210" cy="494" rx="64" ry="34" fill="${SK}" stroke="${SKD}" stroke-width="3"/>
        <path d="M146,516 L274,516" stroke="#0e6a78" stroke-width="2"/><text x="210" y="535" text-anchor="middle" class="svg-small">Transverso</text>
        <path d="M296,460 L296,528" stroke="#0e6a78" stroke-width="2"/><text x="292" y="494" text-anchor="end" class="svg-small">AP</text>`;
      const charpy = `<path class="hintring" d="M181.7,334.3 A40,40 0 0 0 238.3,334.3" fill="none" stroke="#0e6a78" stroke-width="2"/>` + lbl('≈ 90°', 210, 362);
      return antBody(true) + SIDE_ANT + LUNG_ANT + charpy + inset;
    },
    regions: [
      RECT('forma', 'Forma y tamaño del tórax', 'Forma del tórax', 56, 104, 308, 206, {
        look: c => `Tórax de forma <b>elíptica (cónica)</b>, más ancho en la base, simétrico y bien proporcionado. <b>Diámetro anteroposterior menor que el transverso (relación ≈ 1:2, hasta 5:7)</b>. Sin deformidades (tórax en tonel, en embudo, en quilla), clavículas e hileras costales simétricas y columna alineada${c.age >= 65 ? '; discreta cifosis dorsal fisiológica del adulto mayor, sin llegar a un diámetro AP igual al transverso' : ''}.` },
        { rx: 24, lx: 64, ly: 122, anchor: 'start' }),
      R('ecmR', 'Músculos esternocleidomastoideos (D)', 'ECM D', 162, 62, 16, { look: 'Esternocleidomastoideo y escalenos <b>relajados</b> en reposo: no se contraen ni se marcan al inspirar (<b>no hay uso de músculos accesorios</b>).' }),
      R('ecmL', 'Músculos esternocleidomastoideos (I)', 'ECM I', 258, 62, 16, { look: 'Esternocleidomastoideo y escalenos <b>relajados</b> en reposo: no se contraen ni se marcan al inspirar (<b>no hay uso de músculos accesorios</b>).' }),
      R('supra', 'Fosa supraesternal y supraclavicular', 'Supraesternal', 210, 106, 13, { look: 'Fosas supraesternal y supraclaviculares <b>sin tiraje</b> (no se hunden durante la inspiración). Tráquea en la línea media.' }),
      R('hemiR', 'Hemitórax derecho', 'Hemitórax D', 96, 170, 20, { look: 'Hemitórax derecho simétrico al izquierdo en forma, volumen y <b>amplitud de movimientos</b>; sin retracciones, abombamientos, cicatrices ni circulación colateral.' }),
      R('hemiL', 'Hemitórax izquierdo', 'Hemitórax I', 324, 170, 20, { look: 'Hemitórax izquierdo simétrico al derecho en forma, volumen y <b>amplitud de movimientos</b>; sin retracciones, abombamientos ni cicatrices. El latido de la punta puede verse en el 5.º EIC.' }),
      R('fr', 'Frecuencia, ritmo y patrón respiratorio', 'Patrón respiratorio', 210, 190, 24, {
        look: c => `<b>FR ${c.v.rr} respiraciones/min</b> (normal 12–20): <b>eupnea</b>, ritmo regular, con inspiración ≈ 1/3 y espiración ≈ 2/3 del ciclo (I:E ≈ 1:2), sin pausas, amplitud normal. Tipo respiratorio ${typeTxt(c)}. Habla frases completas sin disnea.` }),
      R('ic', 'Espacios intercostales (D)', 'Intercostales', 106, 240, 20, { look: 'Espacios intercostales <b>sin tiraje</b> (no se retraen en la inspiración) ni abombamiento en la espiración; sin retracción subcostal.' }),
      R('icL', 'Espacios intercostales (I)', 'Intercostales', 314, 240, 20, { look: 'Espacios intercostales <b>sin tiraje</b> ni abombamiento; movimiento costal simétrico con el lado derecho.' }),
      R('charpy', 'Ángulo epigástrico (de Charpy)', 'Ángulo de Charpy', 210, 322, 17, { look: '<b>Ángulo epigástrico (de Charpy) ≈ 90°</b> (normal 70–110°), formado por los rebordes costales en el apéndice xifoides; simétrico. Las costillas se dirigen de arriba abajo y de atrás adelante (oblicuas ≈ 45°) con espacios intercostales regulares.' }),
      R('axial', 'Relación entre diámetros anteroposterior y transverso', 'Diámetros', 210, 494, 44, { look: 'Corte axial del tórax: <b>diámetro AP &lt; transverso (≈ 1:2 a 5:7)</b>. En el recién nacido es ≈ 1:1 y en el tórax en tonel (p. ej. EPOC) tiende a 1:1: pérdida de la elipse normal.' }, { ly: 460 })
    ],
    after(stage, sh, ctx) {
      if (inspStop) inspStop();
      const g = ctx.svg.querySelector('#chestAnim'), T = 60000 / ctx.c.v.rr, t0 = performance.now();
      let on = true;
      const f = now => {
        if (!on) return;
        const u = ((now - t0) % T) / T;
        const b = u < 1 / 3 ? 0.5 - 0.5 * Math.cos(Math.PI * u * 3) : 0.5 + 0.5 * Math.cos(Math.PI * (u - 1 / 3) * 1.5);
        g.setAttribute('transform', `translate(210 230) scale(${(1 + 0.022 * b).toFixed(4)} ${(1 + 0.012 * b).toFixed(4)}) translate(-210 -230)`);
        requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
      inspStop = () => { on = false; };
    },
    onLeave() { if (inspStop) { inspStop(); inspStop = null; } }
  };

  /* ------------------------------------------------------------ PALPACIÓN */
  const FREM_NOTE = ' Técnica: borde cubital de la mano (o palma) sobre cada zona, la persona dice «treinta y tres» con voz grave y constante; compara zonas simétricas.';
  const EXP_NOTE = ' Es simétrica (hemitórax D = I).';

  function palpScene(view) {
    const ant = view === 'ant';
    const wall = 'Pared torácica: piel sin lesiones, temperatura normal, <b>indolora</b> a la palpación y a la presión de las costillas y del esternón; sin masas, sin crepitación subcutánea (enfisema) ni frémito pleural.';
    const tools = (vv, exp, w) => Object.assign({}, vv ? { vv } : {}, exp ? { expan: exp } : {}, w ? { wall: w } : {});
    const regions = ant ? [
      R('apR', 'Vértice derecho (anterior)', 'Vértice D', 140, 112, 15, tools('Vibraciones vocales <b>presentes y simétricas</b>; algo más intensas en los vértices y en la región paraesternal superior derecha (cerca de la tráquea y los bronquios).' + FREM_NOTE, 'Expansibilidad de los vértices: ascenso simétrico de ambas clavículas y hombros al inspirar profundo (manos sobre los trapecios).' + EXP_NOTE)),
      R('apL', 'Vértice izquierdo (anterior)', 'Vértice I', 280, 112, 15, tools('Vibraciones vocales <b>presentes y simétricas</b> con el lado derecho (puede ser algo menores que en el derecho).' + FREM_NOTE, 'Expansibilidad de los vértices: ascenso simétrico al inspirar profundo.' + EXP_NOTE)),
      R('man', 'Región esternal superior (manubrio)', 'Manubrio', 210, 132, 14, tools('Vibraciones <b>más intensas</b> en la región paraesternal superior (cercanía de la tráquea y los bronquios principales): normal.' + FREM_NOTE)),
      R('m2R', '2.º–3.er espacio intercostal derecho', '2.º EIC D', 128, 160, 15, tools('Vibraciones vocales presentes y simétricas, de intensidad media-alta.' + FREM_NOTE)),
      R('m2L', '2.º–3.er espacio intercostal izquierdo', '2.º EIC I', 292, 160, 15, tools('Vibraciones vocales presentes y simétricas con el lado derecho.' + FREM_NOTE)),
      R('m4R', '4.º–5.º espacio intercostal derecho', '4.º EIC D', 110, 212, 15, tools('Vibraciones vocales presentes, simétricas, de intensidad media.' + FREM_NOTE)),
      R('m4L', '4.º–5.º espacio intercostal izquierdo (lateral)', '4.º EIC I', 314, 212, 15, tools('Vibraciones vocales presentes, simétricas con el lado derecho.' + FREM_NOTE)),
      R('prec', 'Región precordial', 'Precordio', 238, 228, 15, tools('Vibraciones <b>disminuidas</b> sobre el área precordial (el corazón se interpone): normal.' + FREM_NOTE)),
      R('bR', 'Base pulmonar derecha (anterior)', 'Base D', 108, 255, 14, tools('Vibraciones vocales presentes pero de <b>menor intensidad</b> en las bases, simétricas.' + FREM_NOTE)),
      R('bL', 'Base pulmonar izquierda (anterior)', 'Base I', 312, 255, 14, tools('Vibraciones vocales presentes, de menor intensidad en la base, simétricas con la derecha.' + FREM_NOTE)),
      RECT('cost', 'Base torácica anterior (reborde costal)', 'Expansibilidad', 70, 286, 280, 80,
        tools(null, 'Manos sobre el reborde costal con los pulgares en el apéndice xifoides: durante una inspiración profunda <b>se separan ≈ 3–5 cm</b> de forma simétrica y a la vez (excursión de ≈ 3–5 cm por hemitórax).' + EXP_NOTE), { rx: 10, lx: 210, ly: 380 }),
      RECT('ster', 'Esternón y clavículas', 'Pared', 199, 148, 16, 124, tools(null, null, wall), { rx: 6, lx: 207, ly: 288, anchor: 'middle' })
    ] : [
      R('apR', 'Vértice derecho (posterior)', 'Vértice D', 285, 112, 15, tools('Vibraciones vocales presentes, <b>simétricas</b> y discretamente más intensas que en las bases.' + FREM_NOTE, 'Expansibilidad de los vértices: ambos trapecios ascienden por igual al inspirar profundo.' + EXP_NOTE)),
      R('apL', 'Vértice izquierdo (posterior)', 'Vértice I', 135, 112, 15, tools('Vibraciones vocales presentes, simétricas con el lado derecho.' + FREM_NOTE, 'Expansibilidad de los vértices: ascenso simétrico.' + EXP_NOTE)),
      R('inR', 'Región interescapular derecha', 'Interesc. D', 232, 178, 14, tools('<b>Máxima intensidad</b>: es la zona donde las vibraciones vocales son más intensas (el bronquio principal derecho es más corto, ancho y vertical); normalmente algo mayor que en la izquierda.' + FREM_NOTE)),
      R('inL', 'Región interescapular izquierda', 'Interesc. I', 188, 178, 14, tools('Vibraciones vocales intensas, algo <b>menores</b> que en la región interescapular derecha: normal.' + FREM_NOTE)),
      R('fsR', 'Región infraescapular derecha', 'Infraesc. D', 278, 268, 16, tools('Vibraciones vocales de intensidad media, simétricas.' + FREM_NOTE, 'Expansibilidad de la parte media del tórax simétrica.' + EXP_NOTE)),
      R('fsL', 'Región infraescapular izquierda', 'Infraesc. I', 142, 268, 16, tools('Vibraciones vocales de intensidad media, simétricas con el lado derecho.' + FREM_NOTE, 'Expansibilidad de la parte media del tórax simétrica.' + EXP_NOTE)),
      R('bR', 'Base pulmonar derecha (posterior)', 'Base D', 285, 332, 16, tools('Vibraciones vocales <b>menos intensas</b> en las bases (mayor distancia a los bronquios), simétricas.' + FREM_NOTE)),
      R('bL', 'Base pulmonar izquierda (posterior)', 'Base I', 135, 332, 16, tools('Vibraciones vocales menos intensas en la base, simétricas con la derecha.' + FREM_NOTE)),
      RECT('thumbs', 'Bases (pulgares junto a la columna, nivel de la 10.ª costilla)', 'Pulgares en T10', 172, 354, 76, 40,
        tools(null, 'Expansibilidad posterior: manos abrazando las bases con los <b>pulgares junto a la columna a nivel de la 10.ª costilla</b>; al inspirar profundo se separan <b>≈ 3–5 cm</b>, de forma simétrica y simultánea.' + EXP_NOTE), { rx: 8, lx: 210, ly: 412 }),
      RECT('spine', 'Columna vertebral y pared posterior', 'Pared', 202, 140, 14, 188, tools(null, null, wall + ' Columna alineada, apófisis espinosas indoloras.'), { rx: 5, lx: 209, ly: 136 })
    ];
    return {
      id: ant ? 'palpA' : 'palpP', label: ant ? 'Palpación anterior' : 'Palpación posterior', viewBox: '0 0 420 560',
      hint: 'Elige una maniobra: expansibilidad torácica, vibraciones vocales («treinta y tres») o palpación de la pared. Compara siempre zonas simétricas.',
      tools: [
        { id: 'expan', icon: '🙌', label: 'Expansibilidad torácica', hint: 'Expansibilidad: haz clic en la zona donde apoyas las manos (' + (ant ? 'reborde costal o vértices' : 'bases con los pulgares en T10 o vértices') + ') mientras la persona inspira profundo.' },
        { id: 'vv', icon: '🗣️', label: 'Vibraciones vocales («33»)', hint: 'Vibraciones vocales: apoya el borde cubital de la mano y pide «treinta y tres»; compara áreas simétricas.' },
        { id: 'wall', icon: '✋', label: 'Palpación de la pared', hint: 'Palpación de la pared torácica: piel, dolor a la presión, masas, crepitación subcutánea.' }
      ],
      svg: () => (ant ? antBody(false) + SIDE_ANT + LUNG_ANT : postBody() + SIDE_POST + LUNG_POST),
      regions
    };
  }

  /* ------------------------------------------------------------ PERCUSIÓN */
  const perc = (kind, html) => ({ html, run: () => Sound.percuss(kind) });
  const RES = 'Sonoridad pulmonar normal: <b>resonante</b> (sonido grave, intenso y de larga duración, «claro pulmonar»).';

  function percScene(view) {
    const ant = view === 'ant';
    const regions = ant ? [
      R('apR', 'Vértice derecho', 'Vértice D', 140, 112, 14, { perc: perc('resonant', RES + ' En el vértice se percute el <b>campo de Kronig</b> (banda resonante de ≈ 5 cm, 4–6, entre el cuello y el hombro).') }),
      R('apL', 'Vértice izquierdo', 'Vértice I', 280, 112, 14, { perc: perc('resonant', RES + ' Campo de Kronig simétrico (≈ 5 cm).') }),
      R('s2R', '2.º espacio intercostal derecho', '2.º EIC D', 128, 160, 14, { perc: perc('resonant', RES) }),
      R('s2L', '2.º espacio intercostal izquierdo', '2.º EIC I', 292, 160, 14, { perc: perc('resonant', RES) }),
      R('s4R', '4.º espacio intercostal derecho', '4.º EIC D', 112, 206, 14, { perc: perc('resonant', RES) }),
      R('s4L', '4.º espacio intercostal izquierdo', '4.º EIC I', 308, 206, 14, { perc: perc('resonant', RES) }),
      R('s5R', 'Base pulmonar derecha (anterior)', 'Base D', 118, 238, 14, { perc: perc('resonant', RES + ' ' + LIMITS) }, { lx: 100, ly: 232, anchor: 'end' }),
      R('s5L', 'Base pulmonar izquierda (anterior)', 'Base I', 312, 238, 14, { perc: perc('resonant', RES + ' El límite inferior es simétrico (6.ª costilla en la LMC).') }, { lx: 332, ly: 232, anchor: 'start' }),
      R('card', 'Área cardíaca', 'Matidez cardíaca', 240, 226, 17, { perc: perc('dull', '<b>Matidez cardíaca</b> (sonido mate): del 3.º al 5.º EIC izquierdo, desde el borde esternal hasta ≈ 1–2 cm por dentro de la línea medioclavicular; la matidez absoluta es menor que la relativa.') }),
      R('liver', 'Matidez hepática', 'Matidez hepática', 140, 298, 22, { perc: perc('dull', '<b>Matidez hepática</b>: el sonido pasa de resonante a mate a la altura de la <b>6.ª costilla (5.º EIC) en la LMC derecha</b> y se mantiene hasta el reborde costal; hepatimetría en la LMC ≈ 6–12 cm (≈ 7 en la mujer y ≈ 10 en el varón).') }, { lx: 140, ly: 340 }),
      R('traube', 'Espacio semilunar de Traube', 'Traube', 296, 330, 24, { perc: perc('hyper', '<b>Espacio de Traube: timpánico</b> (cámara de aire gástrica), en la parte inferior del hemitórax izquierdo; lo limitan el pulmón (arriba, 6.ª costilla), el reborde costal izquierdo, el bazo (lateral) y el hígado (medial). Si fuera mate sugiere derrame pleural o esplenomegalia.') }, { lx: 296, ly: 362 })
    ] : [
      R('apR', 'Vértice derecho (posterior)', 'Vértice D', 285, 112, 14, { perc: perc('resonant', RES + ' Campo de Kronig ≈ 5 cm.') }),
      R('apL', 'Vértice izquierdo (posterior)', 'Vértice I', 135, 112, 14, { perc: perc('resonant', RES + ' Campo de Kronig ≈ 5 cm, simétrico.') }),
      R('inR', 'Región interescapular derecha', 'Interesc. D', 232, 178, 14, { perc: perc('resonant', RES + ' Algo atenuada por la masa muscular y la escápula, sin llegar a ser mate.') }),
      R('inL', 'Región interescapular izquierda', 'Interesc. I', 188, 178, 14, { perc: perc('resonant', RES) }),
      R('fsR', 'Región infraescapular derecha', 'Infraesc. D', 278, 268, 16, { perc: perc('resonant', RES) }),
      R('fsL', 'Región infraescapular izquierda', 'Infraesc. I', 142, 268, 16, { perc: perc('resonant', RES) }),
      R('bR', 'Base pulmonar derecha (posterior)', 'Base D', 285, 332, 16, {
        perc: perc('resonant', RES + ' ' + LIMITS),
        excur: { html: '<b>Excursión diafragmática</b>: se percute hacia abajo hasta que cambia a mate (≈ <b>10.ª costilla / T10</b> en espiración forzada, línea escapular) y se repite tras una inspiración profunda: el límite desciende <b>4–6 cm</b> (hasta ≈ T12). Simétrica con el lado izquierdo.', run: () => { Sound.percuss('resonant'); setTimeout(() => Sound.percuss('dull'), 550); } }
      }),
      R('bL', 'Base pulmonar izquierda (posterior)', 'Base I', 135, 332, 16, {
        perc: perc('resonant', RES + ' Límite inferior en T10 (10.ª costilla), simétrico con el derecho.'),
        excur: { html: '<b>Excursión diafragmática izquierda</b>: el límite de sonoridad desciende <b>4–6 cm</b> entre la espiración y la inspiración profundas, igual que en el lado derecho.', run: () => { Sound.percuss('resonant'); setTimeout(() => Sound.percuss('dull'), 550); } }
      }),
      RECT('spine', 'Columna vertebral', 'Columna', 202, 140, 14, 188, { perc: perc('dull', 'Sobre las apófisis espinosas el sonido es <b>mate</b> (hueso): no se percute sobre la columna ni la escápula para valorar el parénquima.') }, { rx: 5, lx: 209, ly: 136 })
    ];
    const lineA = `<path class="hintring" d="M96,256 L192,256 M228,256 L324,256" stroke="#0e6a78" stroke-width="2" stroke-dasharray="6 4" fill="none"/>` +
      lbl('6.ª costilla (LMC)', 96, 250, 'start') + `<path class="hintring" d="M50,308 L92,308 M328,308 L370,308" stroke="#0e6a78" stroke-width="2" stroke-dasharray="6 4"/>` + lbl('8.ª LAM', 52, 302, 'start');
    const lineP = `<path class="hintring" d="M80,352 L340,352 M80,407 L340,407" stroke="#0e6a78" stroke-width="2" stroke-dasharray="6 4" fill="none"/>` +
      lbl('T10 · 10.ª costilla (espiración)', 340, 346, 'end') + lbl('Inspiración profunda: +4–6 cm', 340, 424, 'end');
    return {
      id: ant ? 'percA' : 'percP', label: ant ? 'Percusión anterior' : 'Percusión posterior', viewBox: '0 0 420 560',
      hint: 'Percusión dedo-dedo: apoya el dedo medio de una mano (plesímetro) y golpéalo con la punta del dedo medio de la otra. Compara zonas simétricas.',
      tools: [
        { id: 'perc', icon: '🖐️', label: 'Percusión dedo-dedo', hint: 'Percusión: dedo plesímetro apoyado en el espacio intercostal; golpe seco y rápido con la yema del dedo percutor, con movimiento de muñeca. Compara siempre con el lado opuesto.' }
      ].concat(ant ? [] : [{ id: 'excur', icon: '↕️', label: 'Excursión diafragmática', hint: 'Excursión diafragmática: percute las bases en espiración forzada y tras inspirar profundo hasta que el sonido pasa de resonante a mate; la diferencia (≈ 4–6 cm) es la excursión.' }]),
      svg: () => (ant ? antBody(false) + SIDE_ANT + LUNG_ANT + HEART + LIVER + TRAUBE + LMC + lineA : postBody() + SIDE_POST + LUNG_POST + lineP),
      regions
    };
  }

  /* ------------------------------------------------------------ AUSCULTACIÓN */
  let auscTimer = null;
  function lungSound(type, gain) {
    Sound.listen({ lung: { type, adv: [] }, lungGain: gain, mode: 'diaphragm' });
    clearTimeout(auscTimer);
    auscTimer = setTimeout(() => Sound.stop(), 16000);
  }
  const VES = 'Murmullo vesicular normal: suave, de tono bajo; se oye <b>toda la inspiración y el primer tercio de la espiración</b> (I:E ≈ 3:1), sin pausa entre ambas. <b>Sin ruidos agregados</b> (sin crepitantes, sibilancias, roncus ni roce pleural).';
  const BV = 'Murmullo <b>broncovesicular</b> normal: intensidad y tono intermedios, con inspiración y espiración de duración similar (I:E ≈ 1:1); es normal en la región esternal superior (1.º–2.º EIC paraesternal) y en la región interescapular (más intenso a la derecha). Sin ruidos agregados.';
  const TRQ = '<b>Soplo traqueal (bronquial) normal</b>: ruido fuerte, agudo y tubular; la espiración es igual o más larga e intensa que la inspiración, con una pausa entre ambas. Es normal solo sobre la tráquea; en el parénquima pulmonar sería patológico (soplo tubárico).';
  const V_VES = 'Resonancia vocal normal: al decir «treinta y tres» la voz llega <b>amortiguada e ininteligible</b>, simétrica con el lado opuesto.';
  const V_BV = 'Resonancia vocal algo más intensa y clara, pero sin que se distingan las palabras (broncofonía y pectoriloquia serían patológicas).';
  const V_TRQ = 'Sobre la tráquea la voz se oye fuerte y tubular: normal en este sitio.';
  const asc = (type, gain, html, voice) => ({ steth: { html, run: () => lungSound(type, gain) }, voice });
  const ves = v => asc('normal', 1, VES, v || V_VES);
  const bv = asc('bronchial', 0.55, BV, V_BV);

  function auscScene(view) {
    const ant = view === 'ant';
    const regions = ant ? [
      R('trq', 'Tráquea (cuello)', 'Tráquea', 210, 62, 15, asc('bronchial', 1, TRQ, V_TRQ)),
      R('man', 'Región esternal superior (1.º–2.º EIC paraesternal)', 'Esternal sup.', 210, 134, 14, bv),
      R('apR', 'Vértice derecho (anterior)', 'Vértice D', 140, 112, 14, ves()),
      R('apL', 'Vértice izquierdo (anterior)', 'Vértice I', 280, 112, 14, ves()),
      R('m2R', '2.º espacio intercostal derecho', '2.º EIC D', 124, 160, 14, ves()),
      R('m2L', '2.º espacio intercostal izquierdo', '2.º EIC I', 296, 160, 14, ves()),
      R('m4R', '4.º espacio intercostal derecho', '4.º EIC D', 112, 208, 14, ves()),
      R('m4L', '4.º espacio intercostal izquierdo', '4.º EIC I', 308, 208, 14, ves()),
      R('bR', 'Base pulmonar derecha (anterior)', 'Base D', 112, 252, 14, ves()),
      R('bL', 'Base pulmonar izquierda (anterior)', 'Base I', 308, 252, 14, ves()),
      R('axR', 'Región axilar derecha', 'Axila D', 58, 210, 13, ves()),
      R('axL', 'Región axilar izquierda', 'Axila I', 362, 210, 13, ves())
    ] : [
      R('apR', 'Vértice derecho (posterior)', 'Vértice D', 285, 112, 14, ves()),
      R('apL', 'Vértice izquierdo (posterior)', 'Vértice I', 135, 112, 14, ves()),
      R('inR', 'Región interescapular derecha', 'Interesc. D', 232, 178, 14, asc('bronchial', 0.55, BV, 'Resonancia vocal más intensa que en el resto de los campos (más a la derecha), pero ininteligible: normal.')),
      R('inL', 'Región interescapular izquierda', 'Interesc. I', 188, 178, 14, bv),
      R('fsR', 'Región infraescapular derecha', 'Infraesc. D', 278, 268, 16, ves()),
      R('fsL', 'Región infraescapular izquierda', 'Infraesc. I', 142, 268, 16, ves()),
      R('bR', 'Base pulmonar derecha (posterior)', 'Base D', 285, 332, 16, ves()),
      R('bL', 'Base pulmonar izquierda (posterior)', 'Base I', 135, 332, 16, ves())
    ];
    regions.forEach(r => {
      const t = r.tools, v = t.voice;
      r.tools = { steth: t.steth, voice: v ? '<b>Resonancia vocal</b> (pide «treinta y tres»): ' + v : undefined };
    });
    return {
      id: ant ? 'auscA' : 'auscP', label: ant ? 'Auscultación anterior' : 'Auscultación posterior', viewBox: '0 0 420 560',
      hint: 'Fonendoscopio con el diafragma sobre la piel; la persona respira profundamente por la boca. Escucha un ciclo completo en cada punto y compara lados.',
      tools: [
        { id: 'steth', icon: '🩺', label: 'Fonendoscopio (diafragma)', hint: 'Auscultación: haz clic en un campo y escucha al menos un ciclo respiratorio completo; compara zonas simétricas, de arriba abajo.' },
        { id: 'voice', icon: '🗣️', label: 'Resonancia vocal («33»)', hint: 'Resonancia vocal: la persona dice «treinta y tres» mientras auscultas; la voz normal llega amortiguada e ininteligible.' }
      ],
      svg: () => (ant ? antBody(false) + SIDE_ANT + LUNG_ANT : postBody() + SIDE_POST + LUNG_POST),
      regions,
      after(stage) {
        const bar = document.createElement('div');
        bar.className = 'overlay-top';
        bar.innerHTML = '<span></span><button class="btn small" type="button">⏹ Detener sonido</button>';
        bar.querySelector('button').addEventListener('click', () => { Sound.stop(); clearTimeout(auscTimer); });
        stage.appendChild(bar);
      },
      onLeave() { Sound.stop(); clearTimeout(auscTimer); }
    };
  }

  /* ------------------------------------------------------------ CUESTIONARIO */
  const quiz = [
    { q: 'Relación normal entre el diámetro anteroposterior (AP) y el transverso del tórax del adulto:',
      options: ['≈ 1:1, como en el tórax en tonel', '≈ 1:2 (hasta 5:7): AP menor que el transverso', '≈ 2:1: AP mayor que el transverso', '≈ 1:3, tórax aplanado'], a: 1,
      why: 'El tórax normal es una elipse más ancha que profunda. Una relación cercana a 1:1 (tórax en tonel) es propia del lactante y de la hiperinsuflación crónica.' },
    { q: 'El ángulo epigástrico (de Charpy) normal mide aproximadamente…',
      options: ['≈ 45°', '≈ 150°', '≈ 90° (70–110°)', '≈ 120–130°'], a: 2,
      why: 'Es el ángulo que forman los rebordes costales en el apéndice xifoides; se ensancha en el tórax en tonel y se estrecha en los tórax largos y estrechos.' },
    { q: 'Las vibraciones vocales normales son más intensas en…',
      options: ['Las bases pulmonares posteriores', 'La región precordial', 'El flanco izquierdo', 'La región interescapular derecha y los vértices'], a: 3,
      why: 'Cerca de la tráquea y los bronquios principales (el derecho es más corto y vertical) la transmisión es mayor; disminuyen en las bases y sobre el corazón.' },
    { q: 'En la percusión dedo-dedo del tórax…',
      options: ['Se golpea con el pulgar sobre la piel desnuda', 'Se apoya el dedo medio (plesímetro) en el espacio intercostal y se golpea su falange con la punta del dedo medio de la otra mano, de forma seca', 'Se percute siempre sobre las costillas y la escápula', 'Se compara solo con el valor del manual, no con el lado opuesto'], a: 1,
      why: 'El golpe es seco, rápido y con la muñeca suelta; se percute en los espacios intercostales (no sobre hueso) y se compara siempre con la zona simétrica.' },
    { q: 'Los límites inferiores del pulmón en espiración normal son…',
      options: ['4.ª costilla LMC, 6.ª LAM y 8.ª escapular', '6.ª costilla LMC, 8.ª LAM y 10.ª escapular', '8.ª costilla LMC, 10.ª LAM y 12.ª escapular', '2.ª costilla LMC, 4.ª LAM y 6.ª escapular'], a: 1,
      why: 'LMC = línea medioclavicular; LAM = línea axilar media. Por delante, la matidez hepática comienza en la 6.ª costilla de la LMC derecha.' },
    { q: 'La excursión diafragmática normal (diferencia entre espiración e inspiración profundas) es de…',
      options: ['≈ 1 cm', '≈ 2 cm', '≈ 8–10 cm', '≈ 4–6 cm'], a: 3,
      why: 'Se mide percutiendo las bases por detrás en espiración y tras inspirar profundo; debe ser simétrica. Una excursión reducida sugiere patología pleural o diafragmática.' },
    { q: 'El murmullo vesicular normal se caracteriza por…',
      options: ['Inspiración y espiración de igual duración y tono alto', 'Solo espiración audible, con pausa entre ambas fases', 'Sonido suave que ocupa toda la inspiración y el primer tercio de la espiración', 'Crepitantes finos al final de la inspiración'], a: 2,
      why: 'Se origina en el flujo turbulento de las vías aéreas distales filtrado por el parénquima; su tono es bajo y suave. Los ruidos agregados siempre indican patología.' },
    { q: 'El soplo traqueal / bronquial (tubular) en una persona sana se oye…',
      options: ['Sobre la tráquea (y, atenuado como broncovesicular, en la región esternal superior e interescapular)', 'En las bases pulmonares posteriores', 'En todo el campo pulmonar', 'Solo con la campana del fonendoscopio en el precordio'], a: 0,
      why: 'Sobre el parénquima un soplo tubular indicaría consolidación (soplo tubárico). La resonancia vocal normal es amortiguada e ininteligible.' }
  ];

  NormalEngine.build({
    id: 'resp', title: 'Aparato respiratorio (normal)', icon: '🫁', group: 'Exploración normal',
    desc: 'Inspección, palpación, percusión y auscultación del tórax normal, con sonidos y hallazgos precisos.',
    bullets: [
      'Forma del tórax, ángulo de Charpy, patrón respiratorio animado',
      'Expansibilidad y vibraciones vocales; percusión con mapa (hígado, corazón, Traube)',
      'Murmullo vesicular, broncovesicular y soplo traqueal con sonido'
    ],
    scenes: [INSP, palpScene('ant'), palpScene('post'), percScene('ant'), percScene('post'), auscScene('ant'), auscScene('post')],
    quiz,
    teaching: [
      'Orden de la exploración: inspección, palpación, percusión y auscultación; compara siempre zonas simétricas y avanza de arriba abajo, por delante, por detrás y por los lados.',
      'Palpación: la expansibilidad normal separa los pulgares ≈ 3–5 cm de forma simétrica; las vibraciones vocales se exploran con el borde cubital de la mano y son más intensas en los vértices y la región interescapular derecha.',
      'Percusión dedo-dedo en los espacios intercostales: sonoridad pulmonar (resonante) en todos los campos; matidez hepática y cardíaca; espacio de Traube timpánico; excursión diafragmática de 4–6 cm.',
      'Auscultación con el diafragma y respiración profunda por la boca, un ciclo completo por punto: murmullo vesicular en los campos, soplo traqueal solo sobre la tráquea y broncovesicular en la región esternal superior e interescapular. Un ruido agregado nunca es normal.',
      'Límites inferiores del pulmón en espiración: 6.ª costilla LMC, 8.ª LAM y 10.ª escapular (T10).'
    ]
  });
})();
