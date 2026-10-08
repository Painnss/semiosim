/* Módulo de exploración NORMAL: aparato respiratorio.
   Escenas: inspección, palpación (posterior y anterior), percusión (anterior y posterior) y auscultación (anterior y posterior).
   Nomenclatura según Argente-Álvarez: murmullo vesicular, respiración bronquial (normal solo sobre tráquea/laringe),
   respiración broncovesicular, soplo tubario (patológico), estertores secos/húmedos, vibraciones vocales, expansión torácica,
   excursión de las bases, sonoridad/matidez/submatidez/timpanismo, columna sonora, hepatimetría. */
(function () {
  'use strict';
  const SK = '#f1c9a5', SKD = '#b98a63', RIB = '#d6b99a', BONE = '#a97d58';
  const TORSO = 'M170,92 C140,100 85,100 62,118 C40,135 38,170 42,220 C46,300 62,380 70,460 L80,545 L340,545 L350,460 C358,380 374,300 378,220 C382,170 380,135 358,118 C335,100 280,100 250,92 Z';
  const NECK = 'M168,10 L252,10 L262,95 L158,95 Z';
  const mir = x => 420 - x;

  /* ------------------------------------------------------------ dibujo */
  function antBody(anim) {
    let g = `<path d="${NECK}" fill="${SK}" stroke="${SKD}" stroke-width="3"/>` +
      `<path d="M174,12 L202,92 M246,12 L218,92" fill="none" stroke="${SKD}" stroke-width="2" opacity=".45"/>` +
      `<path d="${TORSO}" fill="${SK}" stroke="${SKD}" stroke-width="3"/>`;
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
  const LMC = `<path class="hintring" d="M145,100 L145,420 M275,100 L275,420" stroke="#0e6a78" stroke-width="1.5" stroke-dasharray="2 6" fill="none"/>` + lbl('LMC', 145, 436) + lbl('LMC', 275, 436);

  /* ----------------------------------------------------------- regiones */
  const R = (id, label, short, cx, cy, r, tools, extra) => Object.assign({ id, label, short, cx, cy, r, tools }, extra || {});
  const RECT = (id, label, short, x, y, w, h, tools, extra) => Object.assign({ id, label, short, x, y, w, h, tools }, extra || {});
  const T = (tec, hal) => `<i>Técnica:</i> ${tec} <i>Hallazgo normal:</i> ${hal}`;
  /* posiciones compartidas de la región interescapular (rótulos hacia afuera para que no se encimen) */
  const IN_R = { lx: 250, ly: 182, anchor: 'start' }, IN_L = { lx: 170, ly: 182, anchor: 'end' };

  const LIMITS = 'Límites inferiores del pulmón en espiración: 6.ª costilla en la línea medioclavicular (LMC), 8.ª en la línea axilar media (LAM) y 10.ª en la línea escapular (T10 por detrás).';
  const typeTxt = c => (c.sex === 'F' ? 'costal superior (predomina en la mujer)' : 'costoabdominal (predomina en el varón)');

  /* ------------------------------------------------------------ INSPECCIÓN */
  let inspStop = null;
  const INSP = {
    id: 'insp', label: 'Inspección', viewBox: '0 0 420 560',
    hint: 'Observa la forma del tórax, la simetría y el patrón respiratorio (el tórax se mueve a la frecuencia real de la persona). Haz clic en cada zona.',
    tools: [{ id: 'look', icon: '👁️', label: 'Inspección', hint: 'Inspección: forma y simetría del tórax, ángulo epigástrico, frecuencia, ritmo y tipo respiratorio, tiraje y uso de músculos accesorios.' }],
    svg: () => {
      const inset = `<rect x="118" y="428" width="184" height="118" rx="10" fill="#fff" opacity=".93" stroke="#cfd8e2"/>
        <text x="210" y="446" text-anchor="middle" class="svg-small">Corte axial: diámetros AP y transverso</text>
        <ellipse cx="196" cy="494" rx="56" ry="30" fill="${SK}" stroke="${SKD}" stroke-width="3"/>
        <path d="M140,494 L252,494" stroke="#0e6a78" stroke-width="2"/><text x="196" y="540" text-anchor="middle" class="svg-small">Transverso</text>
        <path d="M196,464 L196,524" stroke="#0e6a78" stroke-width="2"/><text x="262" y="498" class="svg-small">AP</text>`;
      const charpy = `<path class="hintring" d="M181.7,334.3 A40,40 0 0 0 238.3,334.3" fill="none" stroke="#0e6a78" stroke-width="2"/>` + lbl('≈ 90°', 210, 362);
      return antBody(true) + SIDE_ANT + LUNG_ANT + charpy + inset;
    },
    regions: [
      RECT('forma', 'Forma y tamaño del tórax', 'Forma del tórax', 56, 104, 308, 206, {
        look: c => T('observar de frente, de perfil y por detrás, con buena luz.',
          `tórax <b>simétrico</b>, de forma cónica (más ancho en la base), con <b>diámetro anteroposterior menor que el transverso</b>; clavículas, fosas supraclaviculares y espacios intercostales simétricos; sin deformidades (tórax en tonel, en embudo o en quilla) ni cifoescoliosis${c.age >= 65 ? '; discreta cifosis dorsal propia de la edad' : ''}.`) },
        { rx: 24, lx: 64, ly: 122, anchor: 'start' }),
      R('ecmR', 'Músculos esternocleidomastoideos (D)', 'ECM D', 172, 60, 14, { look: T('observar el cuello durante la respiración tranquila.', 'esternocleidomastoideos y escalenos <b>relajados</b>: no se contraen al inspirar (<b>sin uso de músculos accesorios</b>).') }),
      R('ecmL', 'Músculos esternocleidomastoideos (I)', 'ECM I', 248, 60, 14, { look: T('observar el cuello durante la respiración tranquila.', 'esternocleidomastoideos y escalenos <b>relajados</b>, simétricos; sin uso de músculos accesorios.') }),
      R('supra', 'Fosa supraesternal y supraclaviculares', 'Supraesternal', 210, 106, 13, { look: T('observar las fosas supraesternal y supraclaviculares al inspirar.', '<b>sin tiraje</b> (no se deprimen en la inspiración); tráquea en la línea media.') }),
      R('hemiR', 'Hemitórax derecho', 'Hemitórax D', 96, 170, 20, { look: T('comparar ambos hemitórax en reposo y en inspiración profunda.', 'hemitórax derecho <b>simétrico</b> con el izquierdo en forma, volumen y amplitud de los movimientos; sin retracciones, abombamientos, cicatrices ni circulación colateral.') }),
      R('hemiL', 'Hemitórax izquierdo', 'Hemitórax I', 324, 170, 20, { look: T('comparar ambos hemitórax en reposo y en inspiración profunda.', 'hemitórax izquierdo <b>simétrico</b> con el derecho; sin retracciones ni abombamientos. En personas delgadas puede verse el choque de la punta en el 5.º EIC.') }),
      R('fr', 'Frecuencia, ritmo y tipo respiratorio', 'Patrón respiratorio', 210, 190, 24, {
        look: c => T('contar las respiraciones durante 1 minuto sin que la persona lo advierta (p. ej. mientras se simula tomar el pulso).',
          `<b>FR ${c.v.rr} respiraciones/min</b> (normal 12–20: <b>eupnea</b>), ritmo regular, amplitud normal, espiración algo más larga que la inspiración (I:E ≈ 1:2), sin pausas. Tipo respiratorio <b>${typeTxt(c)}</b>. Habla frases completas sin disnea.`) }),
      R('ic', 'Espacios intercostales (D)', 'Intercostales', 106, 240, 20, { look: T('observar los espacios intercostales durante la inspiración.', '<b>sin tiraje</b> intercostal ni subcostal; sin abombamiento espiratorio.') }),
      R('icL', 'Espacios intercostales (I)', 'Intercostales', 314, 240, 20, { look: T('observar los espacios intercostales durante la inspiración.', '<b>sin tiraje</b> ni abombamiento; movimiento costal simétrico con el lado derecho.') }),
      R('charpy', 'Ángulo epigástrico (de Charpy)', 'Ángulo de Charpy', 210, 322, 17, { look: T('observar el ángulo que forman los rebordes costales bajo el apéndice xifoides.', '<b>ángulo epigástrico ≈ 90°</b>, simétrico (más agudo en longilíneos y más obtuso en brevilíneos). Costillas oblicuas hacia abajo y adelante, con espacios intercostales regulares.') }),
      R('axial', 'Relación entre diámetros anteroposterior y transverso', '', 196, 494, 36, { look: T('observar el tórax desde arriba o de perfil.', 'el diámetro <b>anteroposterior es menor que el transverso</b> (relación ≈ 0,7; según la fuente, de 1:2 a 5:7). Se aproxima a 1:1 en el lactante y en el tórax en tonel (enfisema).') })
    ],
    after(stage, sh, ctx) {
      if (inspStop) inspStop();
      const g = ctx.svg.querySelector('#chestAnim'), T0 = 60000 / ctx.c.v.rr, t0 = performance.now();
      let on = true;
      const f = now => {
        if (!on) return;
        const u = ((now - t0) % T0) / T0;
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
  const VV_TEC = 'palma o borde cubital de la mano apoyada en la zona; la persona dice «treinta y tres» con voz grave; comparar zonas simétricas.';
  const vv = hal => T(VV_TEC, hal);
  const EXP_TEC = 'manos abiertas abrazando el tórax con los pulgares próximos a la línea media; la persona inspira profundo.';
  const exp = hal => T(EXP_TEC, hal + ' Expansión <b>simétrica y simultánea</b> en ambos hemitórax.');

  function palpScene(view) {
    const ant = view === 'ant';
    const wall = T('palpación de la piel, los músculos y el esqueleto torácico.', 'pared torácica <b>indolora</b>, sin lesiones cutáneas, masas, crepitación subcutánea (enfisema) ni frémito pleural; elasticidad torácica conservada.');
    const tools = (v, e, w) => Object.assign({}, v ? { vv: v } : {}, e ? { expan: e } : {}, w ? { wall: w } : {});
    const regions = ant ? [
      R('apR', 'Vértice derecho (anterior)', 'Vértice D', 140, 112, 15, tools(vv('vibraciones vocales <b>presentes y simétricas</b>; más intensas en las regiones infraclaviculares (cercanía de la tráquea y los bronquios).'), exp('Expansión de los vértices (manos sobre los trapecios, pulgares en C7): ambos vértices ascienden por igual.'))),
      R('apL', 'Vértice izquierdo (anterior)', 'Vértice I', 280, 112, 15, tools(vv('vibraciones vocales presentes, <b>simétricas</b> con el lado derecho (pueden ser algo menores que a la derecha).'), exp('Expansión de los vértices: ascenso simétrico.'))),
      R('man', 'Región esternal superior (manubrio)', 'Manubrio', 210, 132, 14, tools(vv('vibraciones <b>más intensas</b> junto al esternón superior (tráquea y bronquios principales): normal.'))),
      R('m2R', '2.º–3.er espacio intercostal derecho', '2.º EIC D', 128, 160, 15, tools(vv('vibraciones vocales presentes y simétricas, de intensidad media-alta (región infraclavicular).'))),
      R('m2L', '2.º–3.er espacio intercostal izquierdo', '2.º EIC I', 292, 160, 15, tools(vv('vibraciones vocales presentes y simétricas con el lado derecho.'))),
      R('m4R', '4.º–5.º espacio intercostal derecho', '4.º EIC D', 110, 212, 15, tools(vv('vibraciones vocales presentes, simétricas, de intensidad media.'))),
      R('m4L', '4.º–5.º espacio intercostal izquierdo (lateral)', '4.º EIC I', 314, 212, 15, tools(vv('vibraciones vocales presentes, simétricas con el lado derecho.'))),
      R('prec', 'Región precordial', 'Precordio', 238, 228, 15, tools(vv('vibraciones <b>disminuidas</b> sobre el área precordial (el corazón se interpone): normal.'))),
      R('bR', 'Base pulmonar derecha (anterior)', 'Base D', 108, 255, 14, tools(vv('vibraciones vocales presentes, de <b>menor intensidad</b> en las bases, simétricas.'))),
      R('bL', 'Base pulmonar izquierda (anterior)', 'Base I', 312, 255, 14, tools(vv('vibraciones vocales presentes, menos intensas en la base, simétricas con la derecha.'))),
      RECT('cost', 'Bases anteriores (reborde costal)', 'Expansión', 70, 286, 280, 80,
        tools(null, exp('Expansión de las bases por delante (manos en los rebordes costales, pulgares junto al apéndice xifoides): los pulgares se separan por igual (≈ 3–5 cm según la fuente).')), { rx: 10, lx: 210, ly: 380 }),
      RECT('ster', 'Esternón y clavículas', 'Pared', 199, 148, 16, 124, tools(null, null, wall), { rx: 6, lx: 207, ly: 288, anchor: 'middle' })
    ] : [
      R('apR', 'Vértice derecho (posterior)', 'Vértice D', 285, 112, 15, tools(vv('vibraciones vocales presentes, <b>simétricas</b> y algo más intensas que en las bases.'), exp('Expansión de los vértices: ambos trapecios ascienden por igual.'))),
      R('apL', 'Vértice izquierdo (posterior)', 'Vértice I', 135, 112, 15, tools(vv('vibraciones vocales presentes, simétricas con el lado derecho.'), exp('Expansión de los vértices: ascenso simétrico.'))),
      R('inR', 'Región interescapular derecha', 'Interesc. D', 232, 178, 14, tools(vv('<b>máxima intensidad</b> de las vibraciones vocales (bronquio principal derecho más corto, ancho y vertical); algo mayores que a la izquierda: normal.')), IN_R),
      R('inL', 'Región interescapular izquierda', 'Interesc. I', 188, 178, 14, tools(vv('vibraciones vocales intensas, algo <b>menores</b> que en la región interescapular derecha: normal.')), IN_L),
      R('fsR', 'Región infraescapular derecha', 'Infraesc. D', 278, 268, 16, tools(vv('vibraciones vocales de intensidad media, simétricas.'), exp('Expansión de la parte media del tórax simétrica.'))),
      R('fsL', 'Región infraescapular izquierda', 'Infraesc. I', 142, 268, 16, tools(vv('vibraciones vocales de intensidad media, simétricas con el lado derecho.'), exp('Expansión de la parte media del tórax simétrica.'))),
      R('bR', 'Base pulmonar derecha (posterior)', 'Base D', 285, 332, 16, tools(vv('vibraciones vocales <b>menos intensas</b> en las bases (mayor distancia a los bronquios), simétricas.'))),
      R('bL', 'Base pulmonar izquierda (posterior)', 'Base I', 135, 332, 16, tools(vv('vibraciones vocales menos intensas en la base, simétricas con la derecha.'))),
      RECT('thumbs', 'Bases (pulgares junto a la columna, nivel de la 10.ª costilla)', 'Pulgares en T10', 172, 354, 76, 40,
        tools(null, exp('Expansión de las bases por detrás (manos abrazando las bases, <b>pulgares junto a la columna a la altura de la 10.ª costilla</b>): los pulgares se separan por igual (≈ 3–5 cm según la fuente).')), { rx: 8, lx: 210, ly: 412 }),
      RECT('spine', 'Columna vertebral y pared posterior', 'Pared', 202, 140, 14, 188, tools(null, null, wall + ' Columna alineada, apófisis espinosas indoloras.'), { rx: 5, lx: 209, ly: 136 })
    ];
    return {
      id: ant ? 'palpA' : 'palpP', label: ant ? 'Palpación anterior' : 'Palpación posterior', viewBox: '0 0 420 560',
      hint: 'Elige una maniobra: expansión torácica, vibraciones vocales («treinta y tres») o palpación de la pared. Compara siempre zonas simétricas.',
      tools: [
        { id: 'expan', icon: '🙌', label: 'Expansión torácica', hint: 'Expansión torácica: haz clic en la zona donde apoyas las manos (' + (ant ? 'reborde costal o vértices' : 'bases con los pulgares en T10 o vértices') + ') mientras la persona inspira profundo.' },
        { id: 'vv', icon: '🗣️', label: 'Vibraciones vocales («33»)', hint: 'Vibraciones vocales: apoya la palma o el borde cubital de la mano y pide «treinta y tres»; compara áreas simétricas.' },
        { id: 'wall', icon: '✋', label: 'Palpación de la pared', hint: 'Palpación de la pared torácica: piel, dolor a la presión, masas, crepitación subcutánea, elasticidad.' }
      ],
      svg: () => (ant ? antBody(false) + SIDE_ANT + LUNG_ANT : postBody() + SIDE_POST + LUNG_POST),
      regions
    };
  }

  /* ------------------------------------------------------------ PERCUSIÓN */
  const perc = (kind, html) => ({ html, run: () => Sound.percuss(kind) });
  const PERC_TEC = 'percusión dígito-digital en los espacios intercostales, comparando con el lado opuesto.';
  const SON = '<b>sonoridad pulmonar</b> («claro pulmonar»: sonido grave, intenso y prolongado).';
  const RES = T(PERC_TEC, SON);
  const EXC_TEC = 'percutir la base de arriba abajo en espiración hasta que la sonoridad pasa a matidez; marcar el punto y repetir tras una inspiración profunda.';

  function percScene(view) {
    const ant = view === 'ant';
    const regions = ant ? [
      R('apR', 'Vértice derecho', 'Vértice D', 140, 112, 14, { perc: perc('resonant', RES + ' En el vértice se delimita el <b>campo de Krönig</b>: banda sonora de ≈ 4–6 cm entre el cuello y el hombro.') }),
      R('apL', 'Vértice izquierdo', 'Vértice I', 280, 112, 14, { perc: perc('resonant', RES + ' Campo de Krönig simétrico (≈ 4–6 cm).') }),
      R('s2R', '2.º espacio intercostal derecho', '2.º EIC D', 128, 160, 14, { perc: perc('resonant', RES) }),
      R('s2L', '2.º espacio intercostal izquierdo', '2.º EIC I', 292, 160, 14, { perc: perc('resonant', RES) }),
      R('s4R', '4.º espacio intercostal derecho', '4.º EIC D', 112, 206, 14, { perc: perc('resonant', RES) }),
      R('s4L', '4.º espacio intercostal izquierdo', '4.º EIC I', 308, 206, 14, { perc: perc('resonant', RES) }),
      R('s5R', 'Base pulmonar derecha (anterior)', 'Base D', 118, 238, 14, { perc: perc('resonant', RES + ' ' + LIMITS) }, { lx: 100, ly: 232, anchor: 'end' }),
      R('s5L', 'Base pulmonar izquierda (anterior)', 'Base I', 312, 238, 14, { perc: perc('resonant', RES + ' Límite inferior simétrico (6.ª costilla en la LMC).') }, { lx: 332, ly: 232, anchor: 'start' }),
      R('card', 'Área cardíaca', 'Matidez cardíaca', 240, 226, 17, { perc: perc('dull', T('percutir desde la sonoridad pulmonar hacia el corazón.', '<b>submatidez y matidez cardíacas</b> del 3.º al 5.º EIC izquierdo, desde el borde esternal hasta ≈ 1–2 cm por dentro de la LMC (la matidez absoluta es menor que la relativa).')) }),
      R('liver', 'Matidez hepática', 'Matidez hepática', 140, 298, 22, {
        perc: c => perc('dull', T('percutir de arriba abajo por la LMC derecha desde la sonoridad pulmonar.',
          `<b>matidez hepática</b> a partir del 5.º EIC (≈ 6.ª costilla) hasta el reborde costal. <b>Hepatimetría</b> (altura de la matidez en la LMC) ${c.sex === 'M' ? '≈ 10–12 cm en el varón adulto' : 'algo menor que en el varón'} (rango 6–12 cm según la fuente).`)) }, { lx: 140, ly: 340 }),
      R('traube', 'Espacio semilunar de Traube', 'Traube', 296, 330, 24, { perc: perc('hyper', T('percutir la parte inferior del hemitórax izquierdo, por delante.', '<b>espacio de Traube timpánico</b> (cámara de aire gástrica); lo limitan el pulmón (arriba), el reborde costal, el bazo (lateral) y el hígado (medial). Su matidez sugeriría derrame pleural izquierdo o esplenomegalia.')) }, { lx: 296, ly: 362 })
    ] : [
      R('apR', 'Vértice derecho (posterior)', 'Vértice D', 285, 112, 14, { perc: perc('resonant', RES + ' Campo de Krönig ≈ 4–6 cm.') }),
      R('apL', 'Vértice izquierdo (posterior)', 'Vértice I', 135, 112, 14, { perc: perc('resonant', RES + ' Campo de Krönig ≈ 4–6 cm, simétrico.') }),
      R('inR', 'Región interescapular derecha', 'Interesc. D', 232, 178, 14, { perc: perc('resonant', RES + ' Algo atenuada por la masa muscular, sin llegar a submatidez.') }, IN_R),
      R('inL', 'Región interescapular izquierda', 'Interesc. I', 188, 178, 14, { perc: perc('resonant', RES) }, IN_L),
      R('fsR', 'Región infraescapular derecha', 'Infraesc. D', 278, 268, 16, { perc: perc('resonant', RES) }),
      R('fsL', 'Región infraescapular izquierda', 'Infraesc. I', 142, 268, 16, { perc: perc('resonant', RES) }),
      R('bR', 'Base pulmonar derecha (posterior)', 'Base D', 285, 332, 16, {
        perc: perc('resonant', RES + ' ' + LIMITS),
        excur: { html: T(EXC_TEC, '<b>excursión de la base derecha ≈ 4–6 cm</b>: el límite de sonoridad baja de ≈ T10 (espiración) hasta ≈ T12 (inspiración profunda). Simétrica con la izquierda.'), run: () => { Sound.percuss('resonant'); setTimeout(() => Sound.percuss('dull'), 550); } }
      }),
      R('bL', 'Base pulmonar izquierda (posterior)', 'Base I', 135, 332, 16, {
        perc: perc('resonant', RES + ' Límite inferior en T10 (10.ª costilla), simétrico con el derecho.'),
        excur: { html: T(EXC_TEC, '<b>excursión de la base izquierda ≈ 4–6 cm</b>, igual que la derecha.'), run: () => { Sound.percuss('resonant'); setTimeout(() => Sound.percuss('dull'), 550); } }
      }),
      RECT('spine', 'Columna vertebral', 'Columna', 202, 140, 14, 188, { perc: perc('resonant', T('percutir las apófisis espinosas de arriba abajo.', '<b>columna sonora</b> en toda la región dorsal (desde C7 hasta ≈ T11). La matidez a lo largo de la columna sugeriría derrame pleural.')) }, { rx: 5, lx: 209, ly: 136 })
    ];
    const lineA = `<path class="hintring" d="M96,256 L192,256 M228,256 L324,256" stroke="#0e6a78" stroke-width="2" stroke-dasharray="6 4" fill="none"/>` +
      lbl('6.ª costilla (LMC)', 98, 272, 'start') + `<path class="hintring" d="M50,308 L92,308 M328,308 L370,308" stroke="#0e6a78" stroke-width="2" stroke-dasharray="6 4"/>` + lbl('8.ª LAM', 52, 302, 'start');
    const lineP = `<path class="hintring" d="M80,352 L340,352 M80,407 L340,407" stroke="#0e6a78" stroke-width="2" stroke-dasharray="6 4" fill="none"/>` +
      lbl('T10 · 10.ª costilla (espiración)', 340, 368, 'end') + lbl('Inspiración profunda: +4–6 cm', 340, 424, 'end');
    return {
      id: ant ? 'percA' : 'percP', label: ant ? 'Percusión anterior' : 'Percusión posterior', viewBox: '0 0 420 560',
      hint: 'Percusión dígito-digital: apoya el dedo medio de una mano (plesímetro) en el espacio intercostal y golpéalo con la punta del dedo medio de la otra. Compara zonas simétricas.',
      tools: [
        { id: 'perc', icon: '🖐️', label: 'Percusión dígito-digital', hint: 'Percusión: dedo plesímetro apoyado en el espacio intercostal; golpe seco y breve con la punta del dedo percutor, con movimiento de muñeca. Compara siempre con el lado opuesto.' }
      ].concat(ant ? [] : [{ id: 'excur', icon: '↕️', label: 'Excursión de las bases', hint: 'Excursión de las bases: percute la base en espiración y tras inspirar profundo hasta que la sonoridad pasa a matidez; la diferencia (≈ 4–6 cm) es la excursión.' }]),
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
  const AUS_TEC = 'diafragma sobre la piel; la persona respira profundo por la boca; un ciclo completo por punto, comparando lados.';
  const VES = T(AUS_TEC, '<b>murmullo vesicular</b> conservado: suave y grave, ocupa toda la inspiración y el comienzo de la espiración (I:E ≈ 3:1), sin pausa entre ambas. <b>Sin ruidos agregados</b>: sin estertores secos (sibilancias, roncus) ni húmedos (crepitantes, subcrepitantes), sin frote pleural.');
  const BV = T(AUS_TEC, '<b>respiración broncovesicular</b>: intensidad y tono intermedios entre el murmullo vesicular y la respiración bronquial, con inspiración y espiración de duración similar. Es normal donde los bronquios grandes están cerca de la pared: región esternal superior (1.º–2.º EIC) e interescapular (sobre todo a la derecha). Sin ruidos agregados.');
  const TRQ = T('diafragma sobre la tráquea, en el cuello.', '<b>respiración bronquial</b>: ruido intenso, agudo y soplante, con espiración igual o más larga que la inspiración y una pausa entre ambas. Es normal <b>solo sobre la tráquea y la laringe</b>; si aparece sobre el parénquima se denomina <b>soplo tubario</b> y es patológico (condensación).');
  const V_VES = 'la voz llega como un murmullo confuso, <b>sin distinguir las sílabas</b>, de igual intensidad en zonas simétricas.';
  const V_BV = 'la voz se oye algo más intensa y nítida, pero sin que se entiendan las palabras (broncofonía y pectoriloquia serían patológicas).';
  const V_TRQ = 'sobre la tráquea la voz se oye fuerte y se distinguen las sílabas: normal en este sitio.';
  const asc = (type, gain, html, voice) => ({ steth: { html, run: () => lungSound(type, gain) }, voice });
  const ves = v => asc('normal', 1, VES, v || V_VES);
  const bv = asc('broncovesicular', 0.8, BV, V_BV);

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
      R('inR', 'Región interescapular derecha', 'Interesc. D', 232, 178, 14, asc('broncovesicular', 0.8, BV, 'la voz se oye más intensa que en el resto de los campos (más a la derecha), pero sin distinguir las palabras: normal.'), IN_R),
      R('inL', 'Región interescapular izquierda', 'Interesc. I', 188, 178, 14, bv, IN_L),
      R('fsR', 'Región infraescapular derecha', 'Infraesc. D', 278, 268, 16, ves()),
      R('fsL', 'Región infraescapular izquierda', 'Infraesc. I', 142, 268, 16, ves()),
      R('bR', 'Base pulmonar derecha (posterior)', 'Base D', 285, 332, 16, ves()),
      R('bL', 'Base pulmonar izquierda (posterior)', 'Base I', 135, 332, 16, ves())
    ];
    regions.forEach(r => {
      const t = r.tools, v = t.voice;
      r.tools = { steth: t.steth, voice: v ? T('la persona dice «treinta y tres» mientras se ausculta; comparar lados.', '<b>auscultación de la voz</b> normal: ' + v) : undefined };
    });
    return {
      id: ant ? 'auscA' : 'auscP', label: ant ? 'Auscultación anterior' : 'Auscultación posterior', viewBox: '0 0 420 560',
      hint: 'Fonendoscopio con el diafragma sobre la piel; la persona respira profundo por la boca. Escucha un ciclo completo en cada punto y compara lados.',
      tools: [
        { id: 'steth', icon: '🩺', label: 'Fonendoscopio (diafragma)', hint: 'Auscultación: haz clic en un campo y escucha al menos un ciclo respiratorio completo; compara zonas simétricas, de arriba abajo.' },
        { id: 'voice', icon: '🗣️', label: 'Auscultación de la voz («33»)', hint: 'Auscultación de la voz: la persona dice «treinta y tres» mientras auscultas; normalmente la voz llega como un murmullo sin que se distingan las sílabas.' }
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

  /* ------------------------------------------------------------ CUESTIONARIO (depende de la persona en las preguntas 1 y 2) */
  const quiz = c => [
    { q: `La frecuencia respiratoria de esta persona es ${c.v.rr} rpm. ¿Cómo se clasifica?`,
      options: ['Bradipnea (menos de 12 rpm)', 'Taquipnea (más de 20 rpm)', 'Eupnea (12–20 rpm)', 'Polipnea (respiración rápida y profunda)'], a: 2,
      why: 'La FR normal del adulto en reposo es de 12–20 respiraciones por minuto; se cuenta durante un minuto sin que la persona lo advierta.' },
    { q: `En esta persona (${c.sex === 'F' ? 'mujer' : 'varón'}) el tipo respiratorio esperado es…`,
      options: [c.sex === 'F' ? 'Costoabdominal' : 'Costal superior', c.sex === 'F' ? 'Costal superior' : 'Costoabdominal', 'Paradójico', 'Periódico (Cheyne-Stokes)'], a: 1,
      why: 'El tipo respiratorio normal es costal superior en la mujer y costoabdominal en el varón; la respiración paradójica y la periódica son siempre patológicas.' },
    { q: 'Las vibraciones vocales normales son más intensas en…',
      options: ['Las bases pulmonares posteriores', 'La región precordial', 'El flanco izquierdo', 'La región interescapular derecha y las regiones infraclaviculares'], a: 3,
      why: 'Cerca de la tráquea y los bronquios principales (el derecho es más corto y vertical) la transmisión es mayor; disminuyen hacia las bases y sobre el corazón.' },
    { q: 'El sonido normal que se obtiene al percutir el pulmón se denomina…',
      options: ['Sonoridad (claro pulmonar)', 'Matidez', 'Timpanismo', 'Submatidez'], a: 0,
      why: 'El pulmón aireado da sonoridad; la matidez corresponde a órganos sólidos (hígado, corazón), el timpanismo a vísceras huecas (espacio de Traube) y la submatidez es intermedia.' },
    { q: 'Los límites inferiores del pulmón en espiración normal son…',
      options: ['4.ª costilla LMC, 6.ª LAM y 8.ª escapular', '6.ª costilla LMC, 8.ª LAM y 10.ª escapular', '8.ª costilla LMC, 10.ª LAM y 12.ª escapular', '2.ª costilla LMC, 4.ª LAM y 6.ª escapular'], a: 1,
      why: 'LMC = línea medioclavicular; LAM = línea axilar media. Por delante, la matidez hepática comienza en el 5.º EIC (≈ 6.ª costilla) de la LMC derecha.' },
    { q: 'La excursión normal de las bases (diferencia entre espiración e inspiración profunda) es de…',
      options: ['≈ 1 cm', '≈ 2 cm', '≈ 8–10 cm', '≈ 4–6 cm'], a: 3,
      why: 'Se mide percutiendo las bases por detrás en espiración y tras inspirar profundo; debe ser simétrica. Una excursión reducida sugiere patología pleural o diafragmática.' },
    { q: 'El murmullo vesicular normal se caracteriza por…',
      options: ['Inspiración y espiración de igual duración y tono alto', 'Solo espiración audible, con pausa entre ambas fases', 'Sonido suave y grave que ocupa toda la inspiración y el comienzo de la espiración', 'Estertores crepitantes al final de la inspiración'], a: 2,
      why: 'Se origina en el flujo de aire de las vías aéreas filtrado por el parénquima; es suave y de tono bajo. Los ruidos agregados (estertores, frote) siempre indican patología.' },
    { q: 'En una persona sana la respiración bronquial se ausculta…',
      options: ['En las bases pulmonares posteriores', 'Sobre la tráquea y la laringe (y, atenuada como broncovesicular, en la región esternal superior e interescapular)', 'En todo el campo pulmonar', 'Solo con la campana en el precordio'], a: 1,
      why: 'Si un ruido de tipo bronquial aparece sobre el parénquima se llama soplo tubario e indica condensación (p. ej. neumonía).' }
  ];

  NormalEngine.build({
    id: 'resp', title: 'Aparato respiratorio (normal)', icon: '🫁', group: 'Exploración normal',
    desc: 'Inspección, palpación, percusión y auscultación del tórax normal, con sonidos y hallazgos precisos.',
    bullets: [
      'Forma del tórax, ángulo epigástrico, frecuencia y tipo respiratorio animados',
      'Expansión torácica y vibraciones vocales; percusión con mapa (hígado, corazón, Traube, columna sonora)',
      'Murmullo vesicular, respiración broncovesicular y bronquial con sonido'
    ],
    refs: [
      'Argente HA, Álvarez ME. <i>Semiología Médica. Fisiopatología, semiotecnia y propedéutica</i>. Panamericana — Aparato respiratorio: inspección, palpación, percusión y auscultación del tórax.',
      'Argente HA, Álvarez ME. <i>Semiología Médica</i> — Examen físico general: frecuencia y tipo respiratorio; percusión de la columna y hepatimetría.',
      'Bickley LS. <i>Bates. Guía de exploración física e historia clínica</i> — Tórax y pulmones (expansión torácica y excursión de las bases).'
    ],
    scenes: [INSP, palpScene('ant'), palpScene('post'), percScene('ant'), percScene('post'), auscScene('ant'), auscScene('post')],
    quiz,
    teaching: [
      'Orden de la exploración: inspección, palpación, percusión y auscultación; compara siempre zonas simétricas y avanza de arriba abajo, por delante, por detrás y por los lados.',
      'Palpación: la expansión torácica (vértices y bases) es simétrica y simultánea; las vibraciones vocales («treinta y tres») son más intensas en las regiones infraclaviculares e interescapulares, sobre todo a la derecha, y disminuyen hacia las bases.',
      'Percusión dígito-digital en los espacios intercostales: sonoridad en todos los campos y columna sonora; matidez hepática (hepatimetría ≈ 10–12 cm en el varón) y cardíaca; espacio de Traube timpánico; excursión de las bases ≈ 4–6 cm.',
      'Auscultación con el diafragma y respiración profunda por la boca, un ciclo completo por punto: murmullo vesicular en los campos, respiración broncovesicular en la región esternal superior e interescapular y respiración bronquial solo sobre la tráquea. Un ruido agregado (estertores, frote) nunca es normal.',
      'Límites inferiores del pulmón en espiración: 6.ª costilla LMC, 8.ª LAM y 10.ª escapular (T10).'
    ]
  });
})();
