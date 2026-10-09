/* Módulo patológico: Genitourinario y mama — hallazgos patológicos.
   Hereda las escenas de mod-gu.js (base 'gu': riñón y vías urinarias, genitales masculinos, genitales femeninos y mama)
   y sustituye los hallazgos normales por los de cada paciente mediante `path` (clave 'escena:region:instrumento' o más
   genérica) y `overlay` (SVG añadido al fondo). Solo diagramas esquemáticos y texto técnico; nomenclatura de Argente-Álvarez.
   Los apartados dependientes del sexo (genitales masculinos / femeninos) se bloquean para el sexo contrario con un aviso
   propio del módulo (los del módulo base se refieren a las personas sanas, no a estos pacientes). */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const TH = (t, h) => `<i>Técnica:</i> ${t} <i>Hallazgo:</i> ${h}`;
  const GU = NormalEngine.defs && NormalEngine.defs.gu;
  if (!GU) throw new Error('mod-pat-gu: el módulo base «gu» no está cargado');

  /* ---------------------------------------------------------------- animaciones propias (se limpian solas) */
  const FX = { cancel: [] };
  function clearFx() { FX.cancel.forEach(f => { try { f(); } catch (e) { /* noop */ } }); FX.cancel.length = 0; }
  const el = (name, attrs) => {
    const n = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach(k => n.setAttribute(k, attrs[k]));
    return n;
  };
  /* rótulo breve que asciende y se desvanece sobre el punto explorado (p. ej. «¡dolor!») */
  function note(txt, color) {
    return ctx => {
      const layer = ctx.svg.querySelector('#flash');
      if (!layer) return;
      clearFx();
      const p = ctx.point;
      const t = el('text', { x: p.x, y: p.y - 22, 'text-anchor': 'middle', class: 'svg-title', 'pointer-events': 'none', style: `fill:${color || '#b3261e'}` });
      t.textContent = txt; layer.appendChild(t);
      FX.cancel.push(U.tween(1500, u => { t.setAttribute('opacity', u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3); t.setAttribute('y', p.y - 22 - 12 * u); }, () => t.remove()));
    };
  }
  /* dolor: anillo rojo que se expande + rótulo */
  function pain(txt) {
    const n = note(txt || '¡dolor!');
    return ctx => {
      n(ctx);
      const layer = ctx.svg.querySelector('#flash');
      if (!layer) return;
      const r = el('circle', { cx: ctx.point.x, cy: ctx.point.y, r: 6, fill: 'none', stroke: '#b3261e', 'stroke-width': 4, 'pointer-events': 'none' });
      layer.appendChild(r);
      FX.cancel.push(U.tween(700, u => { r.setAttribute('r', 6 + 30 * u); r.setAttribute('opacity', 1 - u); }, () => r.remove()));
    };
  }
  const P = (html, txt) => ({ html, run: pain(txt) });                       // hallazgo doloroso
  const Nt = (html, txt, color) => ({ html, run: note(txt, color) });        // hallazgo con rótulo
  const DULL = html => ({ html, run: () => { try { Sound.percuss('dull'); } catch (e) { /* noop */ } } });
  const TYMP = html => ({ html, run: () => { try { Sound.percuss('hyper'); } catch (e) { /* noop */ } } });

  /* ---------------------------------------------------------------- dibujos auxiliares (overlay) */
  const tag = (x, y, t, anchor) => `<text class="svg-hint" x="${x}" y="${y}" text-anchor="${anchor || 'middle'}" style="fill:#b3261e;pointer-events:none">${t}</text>`;
  const CUP = 'M568,90 L652,90 L644,240 C643,252 628,258 610,258 C592,258 577,252 576,240 Z';   // misma silueta que el vaso del módulo base
  const urine = (color, op) => `<path d="${CUP}" fill="${color}" opacity="${op}" style="pointer-events:none"/>`;
  const turbid = () => urine('#e6dcae', 0.85) + `<g fill="#fff" opacity=".8" style="pointer-events:none">${[[590, 130], [622, 150], [604, 180], [632, 200], [596, 220], [616, 240], [638, 120]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3"/>`).join('')}</g>`;
  /* globo vesical en la vista anterior del esquema renal (vejiga distendida hasta el ombligo) */
  const globo = () => `<ellipse cx="385" cy="356" rx="46" ry="62" fill="#e8cd5a" fill-opacity=".55" stroke="#b79a1a" stroke-width="2" style="pointer-events:none"/>` +
    `<path d="M339,356 A46,62 0 0 1 431,356" fill="none" stroke="#b79a1a" stroke-width="2.5" stroke-dasharray="5 4" style="pointer-events:none"/>` + tag(500, 332, 'Globo vesical (matidez)', 'start');
  /* próstata (corte sagital del módulo base, centro 205,200): aumentada o con nódulo */
  const prostHBP = () => `<circle cx="205" cy="200" r="38" fill="#f2d6c6" fill-opacity=".9" stroke="#8a5a4a" stroke-width="2" style="pointer-events:none"/>` +
    `<path d="M205,166 V234" stroke="#c9a08a" stroke-width="1.5" stroke-dasharray="2 4" style="pointer-events:none"/>` + tag(240, 160, 'Próstata aumentada, lisa; surco borrado', 'start');
  const prostCa = () => `<path d="M212,182 C224,176 236,186 234,198 C240,208 228,220 216,216 C206,222 200,206 204,198 C200,190 206,182 212,182 Z" fill="#8a3a3a" fill-opacity=".85" stroke="#4a1f1f" stroke-width="1.5" style="pointer-events:none"/>` +
    tag(240, 160, 'Nódulo pétreo e irregular', 'start');
  /* hidrocele derecho: hemiescroto aumentado con halo de transiluminación */
  const hidro = () => `<ellipse cx="500" cy="322" rx="48" ry="60" fill="#f6e9a8" fill-opacity=".75" stroke="#5b7083" stroke-width="2.5" style="pointer-events:none"/>` +
    `<ellipse cx="500" cy="322" rx="36" ry="46" fill="#fff6c4" fill-opacity=".8" style="pointer-events:none"/>` +
    `<ellipse cx="500" cy="316" rx="20" ry="30" fill="#efe3d4" fill-opacity=".6" stroke="#5b7083" stroke-width="1" stroke-dasharray="3 3" style="pointer-events:none"/>` +
    tag(500, 400, 'Hidrocele: transiluminación +');
  /* hernia inguinal izquierda: saco que protruye por el anillo superficial hacia el escroto */
  const hernia = () => `<path d="M604,120 C590,150 598,200 616,236 C634,250 652,236 650,214 C648,180 650,140 636,118 Z" fill="#e9c0b0" fill-opacity=".75" stroke="#8a5a4a" stroke-width="2" style="pointer-events:none"/>` +
    `<path d="M620,96 L622,140" stroke="#b3261e" stroke-width="2.5" marker-end="none" style="pointer-events:none"/><path d="M616,132 l6,10 l6,-10" fill="none" stroke="#b3261e" stroke-width="2.5" style="pointer-events:none"/>` +
    tag(690, 250, 'Impulso con Valsalva', 'start');
  /* mama: nódulo irregular en el CSE derecho, piel de naranja, pezón retraído y adenopatía axilar (centro 150,236) */
  const caMama = () => `<g style="pointer-events:none"><path d="M86,176 C98,166 116,166 124,178 C136,184 134,202 124,208 C120,222 100,224 92,212 C80,208 76,186 86,176 Z" fill="#8a3a3a" fill-opacity=".85" stroke="#4a1f1f" stroke-width="1.5"/>` +
    `<path d="M124,208 L142,228" stroke="#4a1f1f" stroke-width="1.5" stroke-dasharray="3 2"/>` +
    `<g fill="#b3261e" opacity=".7">${[[70, 150], [82, 142], [96, 150], [110, 146], [64, 166], [60, 182], [68, 200], [78, 222], [96, 232], [116, 232], [130, 160], [136, 174]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2"/>`).join('')}</g>` +
    `<path d="M136,236 Q150,250 164,236" fill="none" stroke="#7a4b33" stroke-width="3"/>` +
    `<ellipse cx="655" cy="238" rx="14" ry="10" fill="#8a3a3a" fill-opacity=".8" stroke="#4a1f1f" stroke-width="1.5"/><ellipse cx="606" cy="206" rx="10" ry="7" fill="#8a3a3a" fill-opacity=".8" stroke="#4a1f1f" stroke-width="1.5"/></g>` +
    tag(40, 128, 'Nódulo duro, piel de naranja', 'start') + tag(150, 282, 'Pezón retraído') + tag(600, 300, 'Adenopatías axilares');
  /* mama: fibroadenoma liso y móvil en el CSE izquierdo (centro 370,236) */
  const fibro = () => `<ellipse cx="416" cy="190" rx="16" ry="12" transform="rotate(-20 416 190)" fill="#f0c8b4" stroke="#8a5a4a" stroke-width="2" style="pointer-events:none"/>` +
    `<path d="M436,176 l8,-6 M440,186 l10,0" stroke="#8a5a4a" stroke-width="1.5" style="pointer-events:none"/>` + tag(470, 150, 'Nódulo liso, móvil', 'start');
  /* ginecomastia: discos glandulares retroareolares concéntricos, bilaterales */
  const gineco = () => ['R', 'L'].map(k => { const cx = k === 'R' ? 150 : 370; return `<circle cx="${cx}" cy="236" r="34" fill="#f0c8b4" fill-opacity=".75" stroke="#c9927c" stroke-width="2" style="pointer-events:none"/><circle cx="${cx}" cy="236" r="22" fill="none" stroke="#c9927c" stroke-width="1.5" stroke-dasharray="3 3" style="pointer-events:none"/>`; }).join('') +
    tag(260, 300, 'Discos retroareolares de 4 cm, concéntricos');
  /* prolapso genital: abombamiento del introito y descenso del cuello en el corte sagital (VX = 170) */
  const prolapso = () => `<ellipse cx="170" cy="236" rx="22" ry="34" fill="#f2b9ae" fill-opacity=".8" stroke="#9a7b8a" stroke-width="2" style="pointer-events:none"/>` +
    `<ellipse cx="170" cy="248" rx="9" ry="8" fill="#f4c9c0" stroke="#9a7b8a" stroke-width="1.5" style="pointer-events:none"/>` +
    `<ellipse cx="372" cy="246" rx="13" ry="15" fill="#f4c9c0" fill-opacity=".9" stroke="#9a7b8a" stroke-width="2" stroke-dasharray="3 3" style="pointer-events:none"/>` +
    `<path d="M418,228 L384,246" stroke="#b3261e" stroke-width="2.5" style="pointer-events:none"/><path d="M394,238 l-10,8 l12,2" fill="none" stroke="#b3261e" stroke-width="2.5" style="pointer-events:none"/>` +
    `<path d="M322,258 Q340,246 356,254" fill="none" stroke="#b79a1a" stroke-width="3" style="pointer-events:none"/>` +
    tag(246, 262, 'Cuello en el introito (Valsalva)', 'start') + tag(330, 290, 'Cistocele', 'start');

  /* ---------------------------------------------------------------- textos comunes */
  const NORM_ACV = lado => `puñopercusión lumbar <b>negativa</b> a la ${lado} (signo de Giordano negativo): solo se percibe el golpe.`;
  const RIN_NP = lado => `riñón ${lado} <b>no palpable</b> con la maniobra de Guyon, sin peloteo renal; sin masas ni dolor.`;
  const PU = (nombre) => `punto ureteral ${nombre}: presión profunda <b>indolora</b>.`;
  const SUP_N = { palp: 'región suprapúbica blanda e indolora; <b>sin globo vesical</b>.', perc: TYMP('región suprapúbica: <b>timpanismo</b> (asas); sin matidez suprapúbica.') };
  const TIRA_N = 'tira reactiva sin alteraciones: pH 5,5–6, densidad 1,015–1,020; proteínas, glucosa, sangre, nitritos y esterasa leucocitaria <b>negativos</b>.';

  /* ---------------------------------------------------------------- pacientes */
  const PACIENTES = [
    /* 1 · Cólico renal ------------------------------------------------------------------------------- */
    {
      id: 'pg-col', age: 38, sex: 'M', diag: 'Cólico renal (litiasis ureteral derecha)',
      complaint: 'Hace 4 horas, dolor lumbar derecho de inicio brusco, muy intenso, en oleadas, que se corre hacia el flanco, la fosa ilíaca y el testículo derecho; náuseas y un vómito; «orina con sangre». No encuentra posición que lo alivie.',
      vitals: 'FC 96 · PA 142/88 · FR 18 · T 36,9 °C · SpO₂ 98 %',
      v: { hr: 96, sbp: 142, dbp: 88, rr: 18, temp: 36.9, spo2: 98, height: 1.75, weight: 80, waist: 92 },
      findings: [
        '<b>Dolor cólico lumbar</b> unilateral que irradia por el trayecto ureteral (flanco → fosa ilíaca → genitales), con paciente <b>inquieto</b> (a diferencia del abdomen agudo peritoneal, en el que está quieto); náuseas y vómitos reflejos.',
        '<b>Puñopercusión lumbar positiva</b> a la derecha (signo de Giordano) y <b>puntos ureterales superior y medio derechos dolorosos</b>; riñón no palpable (sin hidronefrosis a tensión todavía).',
        '<b>Hematuria macroscópica</b> sin coágulos ni fiebre: orina rojiza con sangre +++ en la tira, nitritos y esterasa leucocitaria negativos (no hay infección asociada).',
        'Región suprapúbica y testículo derecho sin alteraciones: el dolor testicular es <b>referido</b> (inervación T12-L1 compartida).'
      ],
      teaching: [
        'El <b>síndrome de cólico renal</b> es la obstrucción aguda de la vía urinaria: dolor cólico lumbar irradiado al trayecto ureteral + hematuria; explora puñopercusión, puntos ureterales y orina.',
        'Fiebre con cólico renal = <b>pielonefritis obstructiva</b> (urgencia): la puñopercusión positiva con fiebre y escalofríos cambia la conducta.',
        'Un dolor lumbar irradiado al testículo con testículo normal es referido; un testículo doloroso, elevado y tumefacto obliga a pensar en torsión.'
      ],
      overlay: {
        rin: urine('#b5423a', 0.6) + `<circle cx="352" cy="318" r="5" fill="#7a5a2a" stroke="#4a3a1a" stroke-width="1.5" style="pointer-events:none"/>` +
          tag(540, 290, 'Hematuria macroscópica') + tag(330, 310, 'Cálculo ureteral', 'end')
      },
      path: {
        'rin:cvd:perc': P(TH('golpe suave con el borde cubital del puño sobre la mano apoyada en el ángulo costovertebral.', '<b>puñopercusión lumbar positiva</b> a la derecha: dolor intenso que reproduce el cólico (signo de Giordano positivo).'), '¡dolor!'),
        'rin:cvi:perc': Nt(NORM_ACV('izquierda'), 'golpe suave', '#0e6a78'),
        'rin:rd:palp': P('riñón derecho <b>no palpable</b> con la maniobra de Guyon, sin peloteo; la palpación profunda del flanco derecho es <b>dolorosa</b>, con leve defensa; el paciente se mueve y cambia de posición durante el examen.', 'dolor en el flanco'),
        'rin:ri:palp': RIN_NP('izquierdo'),
        'rin:usd:palp': P('<b>punto ureteral superior derecho</b> (pieloureteral) <b>doloroso</b> a la presión profunda: obstrucción de la vía urinaria alta derecha.'),
        'rin:umd:palp': P('<b>punto ureteral medio derecho doloroso</b>: el cálculo progresa por el uréter (en la tira: hematuria).'),
        'rin:uid:palp': 'punto ureteral inferior derecho (yuxtavesical, por tacto rectal): leve molestia; el dolor predomina en los puntos superior y medio.',
        'rin:usi:palp': PU('superior izquierdo'), 'rin:umi:palp': PU('medio izquierdo'), 'rin:uii:palp': PU('inferior izquierdo'),
        'rin:sup:palp': SUP_N.palp, 'rin:sup:perc': SUP_N.perc,
        'rin:cup:ojo': 'orina <b>rojiza</b>, turbia por la sangre, <b>sin coágulos</b> (hematuria macroscópica de origen alto); diuresis conservada; micción sin disuria ni tenesmo. Sin fiebre ni escalofríos.',
        'rin:cup:tira': 'tira reactiva: <b>sangre +++</b> (hematuria), proteínas trazas (por la sangre), <b>nitritos y esterasa leucocitaria negativos</b> (no sugiere infección), pH 5,5, densidad 1,020.',
        'rin:strip:tira': 'tira reactiva: <b>sangre +++</b>; nitritos y leucocitos negativos; pH 5,5; densidad 1,020. Un pH persistentemente ácido favorece los cálculos de ácido úrico.',
        'rin:strip:ojo': 'la casilla de sangre vira a verde oscuro en 60 s (+++); el resto, sin cambios de color.',
        'masc:testD:insp': 'testículo derecho de aspecto normal, sin eritema ni edema escrotal: el dolor que refiere es <b>irradiado</b> desde el uréter.',
        'masc:testD:palp': 'testículo derecho de tamaño y consistencia normales, <b>no doloroso a la palpación</b>, en posición normal; epidídimo blando: no hay orquiepididimitis ni torsión (dolor referido).',
        'masc:testI:palp': 'testículo izquierdo normal: ovoide, firme-elástico, liso, móvil e indoloro.'
      }
    },
    /* 2 · Pielonefritis aguda ------------------------------------------------------------------------ */
    {
      id: 'pg-pie', age: 29, sex: 'F', diag: 'Pielonefritis aguda',
      complaint: 'Tres días con ardor al orinar y ganas frecuentes; desde ayer, fiebre de 39 °C con escalofríos, dolor sordo y continuo en la región lumbar izquierda, náuseas y decaimiento.',
      vitals: 'FC 108 · PA 108/68 · FR 20 · T 39,2 °C · SpO₂ 97 %',
      v: { hr: 108, sbp: 108, dbp: 68, rr: 20, temp: 39.2, spo2: 97, height: 1.65, weight: 60, waist: 74 },
      findings: [
        '<b>Síndrome febril</b> (39,2 °C, escalofríos, taquicardia) + <b>dolor lumbar</b> continuo + síndrome miccional previo (disuria, polaquiuria): infección urinaria alta.',
        '<b>Puñopercusión lumbar positiva</b> a la izquierda; fosa lumbar izquierda dolorosa a la palpación profunda; riñón no palpable.',
        '<b>Orina turbia y maloliente</b>; tira reactiva con <b>esterasa leucocitaria +++ y nitritos positivos</b> (bacteriuria por enterobacterias), hematuria leve y proteínas en trazas.',
        'Puntos ureterales izquierdos levemente dolorosos; región suprapúbica algo dolorosa (cistitis asociada), sin globo vesical. Genitales externos y mama sin alteraciones.'
      ],
      teaching: [
        'Diferencia la <b>infección urinaria baja</b> (cistitis: disuria, polaquiuria, tenesmo, sin fiebre, puñopercusión negativa) de la <b>alta</b> (pielonefritis: fiebre, escalofríos, dolor lumbar, puñopercusión positiva).',
        'La puñopercusión se hace con un golpe <b>suave</b>; en la pielonefritis el dolor es intenso y desproporcionado. Explora siempre ambos lados.',
        'Pide urocultivo antes del antibiótico; busca factores de complicación (embarazo, obstrucción, diabetes, sonda) y signos de sepsis.'
      ],
      overlay: {
        rin: turbid() + tag(540, 290, 'Orina turbia') +
          `<g style="pointer-events:none"><rect x="40" y="440" width="180" height="26" rx="13" fill="#fde8e6" stroke="#b3261e"/><text x="130" y="458" text-anchor="middle" class="svg-small" style="fill:#b3261e">T 39,2 °C · escalofríos</text></g>`
      },
      path: {
        'rin:cvi:perc': P(TH('golpe suave con el borde cubital del puño sobre la mano apoyada en el ángulo costovertebral.', '<b>puñopercusión lumbar positiva</b> a la izquierda: dolor intenso, la paciente retira el tronco (signo de Giordano positivo).'), '¡dolor!'),
        'rin:cvd:perc': Nt(NORM_ACV('derecha'), 'golpe suave', '#0e6a78'),
        'rin:ri:palp': P('riñón izquierdo <b>no palpable</b> (sin peloteo); la palpación profunda de la fosa lumbar y del flanco izquierdos es <b>dolorosa</b>, sin masa.', 'dolor'),
        'rin:rd:palp': RIN_NP('derecho'),
        'rin:usi:palp': P('punto ureteral superior izquierdo <b>levemente doloroso</b>.', 'molestia'),
        'rin:umi:palp': P('punto ureteral medio izquierdo <b>levemente doloroso</b>.', 'molestia'),
        'rin:uii:palp': 'punto ureteral inferior izquierdo (tacto vaginal): sin dolor franco.',
        'rin:usd:palp': PU('superior derecho'), 'rin:umd:palp': PU('medio derecho'), 'rin:uid:palp': PU('inferior derecho (tacto vaginal)'),
        'rin:sup:palp': P('región suprapúbica blanda, <b>algo dolorosa</b> a la presión (cistitis asociada), <b>sin globo vesical</b>.', 'molestia'),
        'rin:sup:perc': SUP_N.perc,
        'rin:cup:ojo': 'orina <b>turbia</b> (piuria), de color amarillo oscuro, con <b>olor fétido</b>; la paciente refiere ardor al orinar y micciones frecuentes de poco volumen (<b>polaquiuria</b>) con tenesmo.',
        'rin:cup:tira': 'tira reactiva: <b>esterasa leucocitaria +++</b>, <b>nitritos positivos</b>, sangre +, proteínas trazas, pH 7,0 (alcalino por bacterias ureasa positivas), densidad 1,015. Pedir urocultivo antes de tratar.',
        'rin:strip:tira': 'tira: leucocitos +++, nitritos +, sangre +, proteínas trazas, pH 7,0, densidad 1,015: infección urinaria.',
        'rin:strip:ojo': 'la casilla de nitritos vira a rosado y la de leucocitos a violeta intenso a los 120 s.',
        'fem:meato:insp': 'meato uretral en la línea media, con <b>leve eritema</b>; sin secreción. La paciente refiere disuria.',
        'fem:intro:insp': 'introito con mucosa rosada y húmeda, sin lesiones; sin flujo anormal (el síndrome miccional no es por vaginitis).',
        'fem:flujo:esp': 'paredes vaginales rosadas con rugosidades; <b>flujo fisiológico</b> escaso, sin leucorrea espumosa, purulenta ni maloliente: no hay vaginitis.',
        'fem:ut:bim': 'útero en anteversoflexión, de tamaño normal, móvil e indoloro: no hay dolor pélvico (el dolor es lumbar, renal).',
        'fem:movc:bim': 'movilización del cuello <b>indolora</b> (no sugiere enfermedad inflamatoria pélvica).'
      }
    },
    /* 3 · Retención aguda de orina por HBP ------------------------------------------------------------ */
    {
      id: 'pg-rao', age: 74, sex: 'M', diag: 'Retención aguda de orina (globo vesical) por hiperplasia prostática benigna',
      complaint: 'No orina desde hace 12 horas; dolor creciente en el bajo vientre con deseo imperioso de orinar sin lograrlo. Desde hace años, chorro débil y entrecortado, esfuerzo para iniciar la micción, goteo terminal y se levanta 3 veces por noche. Ayer tomó un antigripal.',
      vitals: 'FC 98 · PA 158/92 · FR 18 · T 36,8 °C · SpO₂ 96 %',
      v: { hr: 98, sbp: 158, dbp: 92, rr: 18, temp: 36.8, spo2: 96, height: 1.70, weight: 78, waist: 100 },
      findings: [
        '<b>Globo vesical</b>: tumoración hipogástrica <b>redondeada, lisa, tensa y dolorosa</b>, de convexidad superior, que llega al ombligo, con <b>matidez suprapúbica</b> a la percusión; la presión aumenta el deseo miccional.',
        'Tacto rectal: <b>próstata aumentada</b> (≈ 5 cm, grado III), <b>lisa, de consistencia elástica</b>, simétrica, de límites netos, móvil e indolora, con <b>surco medio borrado</b>: hiperplasia prostática benigna.',
        'Síntomas obstructivos previos (chorro débil, esfuerzo, goteo terminal) e irritativos (nicturia, polaquiuria); el anticolinérgico del antigripal desencadenó la retención.',
        'Hipertensión y taquicardia por dolor; sin fiebre; riñones no palpables, puñopercusión negativa.'
      ],
      teaching: [
        'Ante dolor hipogástrico con anuria, <b>palpa y percute la región suprapúbica</b>: la vejiga distendida es una masa mediana, lisa y mate; el sondaje la hace desaparecer (diagnóstico y tratamiento).',
        'En la <b>HBP</b> la próstata es grande, lisa, elástica y simétrica, con surco borrado; el tamaño al tacto no se correlaciona bien con el grado de obstrucción.',
        'Busca desencadenantes: anticolinérgicos, descongestivos, opioides, alcohol, estreñimiento, frío; y complicaciones (hidronefrosis, insuficiencia renal posrenal, infección).'
      ],
      overlay: { rin: globo(), masc: prostHBP() },
      path: {
        'rin:sup:palp': P(TH('palpación suave de la región hipogástrica.', '<b>tumoración hipogástrica</b> redondeada, de superficie <b>lisa</b>, <b>tensa</b> y <b>dolorosa</b>, de convexidad superior, que asciende hasta el ombligo; la presión provoca <b>deseo imperioso de orinar</b>: <b>globo vesical</b>.'), '¡dolor y urgencia!'),
        'rin:sup:perc': DULL(TH('percusión dígito-digital desde el ombligo hacia el pubis.', '<b>matidez suprapúbica</b> de límite superior convexo, que llega al ombligo (la vejiga vacía no sobrepasa la sínfisis): globo vesical.')),
        'rin:umd:palp': 'punto ureteral medio derecho: la presión es molesta por la vejiga distendida subyacente, no por el uréter.',
        'rin:umi:palp': 'punto ureteral medio izquierdo: molestia difusa por el globo vesical.',
        'rin:uid:palp': 'punto ureteral inferior derecho (tacto rectal): sin dolor ureteral; se percibe la vejiga distendida por delante del recto.',
        'rin:uii:palp': 'punto ureteral inferior izquierdo: sin dolor ureteral.',
        'rin:usd:palp': PU('superior derecho'), 'rin:usi:palp': PU('superior izquierdo'),
        'rin:cvd:perc': Nt(NORM_ACV('derecha') + ' (sin hidronefrosis dolorosa por ahora).', 'golpe suave', '#0e6a78'),
        'rin:cvi:perc': Nt(NORM_ACV('izquierda'), 'golpe suave', '#0e6a78'),
        'rin:rd:palp': RIN_NP('derecho'), 'rin:ri:palp': RIN_NP('izquierdo'),
        'rin:cup:ojo': '<b>no logra orinar</b> (retención aguda): solo unas gotas por rebosamiento; el vaso está vacío. Historia de chorro débil, entrecortado, con esfuerzo inicial y goteo terminal; nicturia × 3.',
        'rin:cup:tira': 'muestra insuficiente (retención). Tras el sondaje evacuador se analizará la orina: en la HBP no complicada la tira suele ser normal o mostrar hematuria leve.',
        'rin:strip:tira': 'sin muestra: la tira se leerá en la orina obtenida por sondaje (buscar sangre, nitritos y leucocitos).',
        'rin:strip:ojo': 'sin muestra para leer hasta el sondaje.',
        'masc:prost:tacto': Nt(TH('tacto rectal en decúbito lateral izquierdo, dedo enguantado y lubricado.', '<b>próstata aumentada de tamaño</b> (≈ 5 cm de diámetro, grado III; sobresale 3 cm hacia la luz rectal), <b>superficie lisa</b>, <b>consistencia elástica</b> homogénea, lóbulos simétricos con <b>surco medio borrado</b>, límites netos, <b>móvil</b> y <b>no dolorosa</b>; sin nódulos: hiperplasia prostática benigna.'), '☝ grande, lisa'),
        'masc:esf:tacto': Nt('esfínter anal normotónico; sin lesiones perianales. Al introducir el dedo se percibe por delante la vejiga distendida.', '☝ tono'),
        'masc:amp:tacto': Nt('ampolla rectal libre, paredes lisas; guante sin sangre. Vejiga distendida palpable a través de la pared anterior del recto.', '☝ paredes'),
        'masc:pene:insp': 'pene normal; prepucio retraíble; sin estenosis visible.',
        'masc:glande:insp': 'glande y <b>meato uretral de calibre normal</b>, sin estenosis ni secreción: la obstrucción es prostática, no uretral distal.',
        'masc:glande:palp': 'glande sin induraciones; sin secreción a la presión del meato.',
        'masc:pene:palp': 'uretra peneana sin induraciones (sin estenosis uretral palpable).'
      }
    },
    /* 4 · Carcinoma de próstata ---------------------------------------------------------------------- */
    {
      id: 'pg-cap', age: 71, sex: 'M', diag: 'Carcinoma de próstata',
      complaint: 'Control por un PSA de 28 ng/mL en un análisis de rutina. Refiere chorro algo más débil desde hace un año, nicturia × 2 y, desde hace dos meses, dolor sordo lumbosacro que no cede con el reposo.',
      vitals: 'FC 72 · PA 136/82 · FR 14 · T 36,5 °C · SpO₂ 97 %',
      v: { hr: 72, sbp: 136, dbp: 82, rr: 14, temp: 36.5, spo2: 97, height: 1.72, weight: 74, waist: 96 },
      findings: [
        'Tacto rectal: <b>nódulo duro (pétreo), irregular</b>, de ≈ 1,5 cm, en el lóbulo derecho, que borra parcialmente el surco medio; <b>superficie irregular</b>, <b>límites imprecisos</b> y glándula <b>fija</b> (adherida a planos vecinos), indolora.',
        'Contraste con la HBP: aquí el tamaño está poco aumentado, la consistencia es pétrea y asimétrica y la próstata no es móvil; en la HBP es grande, lisa, elástica, simétrica y móvil.',
        'Dolor lumbosacro persistente en reposo + PSA muy elevado: sospecha de <b>metástasis óseas</b> (osteoblásticas); puñopercusión negativa, columna lumbosacra sensible.',
        'Ganglios inguinales no palpables (el drenaje prostático es a los ganglios pélvicos profundos, no inguinales).'
      ],
      teaching: [
        'Al tacto rectal describe siempre <b>tamaño, consistencia, superficie, surco medio, límites, movilidad y sensibilidad</b>; un nódulo duro e irregular es carcinoma hasta que se demuestre lo contrario.',
        'La <b>consistencia pétrea</b> y la <b>fijeza</b> son los signos más específicos de carcinoma; la prostatitis es blanda, caliente y muy dolorosa; la HBP es elástica y lisa.',
        'El carcinoma nace en la zona periférica (accesible al dedo) y la HBP en la zona de transición: por eso el tacto detecta el cáncer aunque el PSA sea dudoso.'
      ],
      overlay: { masc: prostCa() },
      path: {
        'masc:prost:tacto': Nt(TH('tacto rectal: se recorre toda la cara posterior de la glándula, lóbulo por lóbulo.', 'próstata de tamaño poco aumentado (≈ 4 cm) con un <b>nódulo pétreo e irregular</b> de ≈ 1,5 cm en el <b>lóbulo derecho</b>; <b>superficie irregular</b>, <b>límites imprecisos</b>, surco medio asimétrico y parcialmente borrado; glándula <b>fija</b>, no se desplaza con el dedo; <b>indolora</b>: sospecha de carcinoma de próstata.'), '☝ pétrea, fija'),
        'masc:esf:tacto': Nt('esfínter anal normotónico; región perianal sin lesiones.', '☝ tono'),
        'masc:amp:tacto': Nt('ampolla rectal de paredes lisas; mucosa rectal <b>deslizable</b> sobre la próstata por delante (sin infiltración rectal); guante sin sangre.', '☝ paredes'),
        'masc:gang:palp': 'ganglios inguinales no palpables (el carcinoma de próstata drena a ganglios obturadores e ilíacos, no accesibles a la palpación).',
        'rin:cvd:perc': Nt('puñopercusión lumbar negativa a la derecha; el dolor que refiere es <b>lumbosacro, óseo</b>, sordo y persistente en reposo (sospecha de metástasis óseas), no renal.', 'golpe suave', '#0e6a78'),
        'rin:cvi:perc': Nt(NORM_ACV('izquierda'), 'golpe suave', '#0e6a78'),
        'rin:sup:palp': SUP_N.palp, 'rin:sup:perc': SUP_N.perc,
        'rin:cup:ojo': 'orina amarilla clara y transparente; chorro algo más débil que antes, nicturia × 2; sin hematuria.',
        'rin:cup:tira': TIRA_N, 'rin:strip:tira': TIRA_N
      }
    },
    /* 5 · Hidrocele ---------------------------------------------------------------------------------- */
    {
      id: 'pg-hid', age: 45, sex: 'M', diag: 'Hidrocele derecho',
      complaint: 'Desde hace seis meses, aumento progresivo e indoloro del tamaño del hemiescroto derecho, con sensación de peso al final del día; no cambia con el esfuerzo ni al acostarse. Sin fiebre ni traumatismo.',
      vitals: 'FC 70 · PA 124/78 · FR 14 · T 36,6 °C · SpO₂ 98 %',
      v: { hr: 70, sbp: 124, dbp: 78, rr: 14, temp: 36.6, spo2: 98, height: 1.76, weight: 79, waist: 90 },
      findings: [
        'Hemiescroto derecho <b>aumentado</b> (≈ 8 cm), piel normal; masa <b>quística, lisa, tensa, renitente e indolora</b> que <b>engloba el testículo</b> (no se delimita el testículo ni el epidídimo).',
        '<b>Transiluminación positiva</b>: la luz apoyada en la cara posterior atraviesa la masa (halo rosado luminoso): contenido líquido (túnica vaginal).',
        'Se puede <b>«llegar por encima»</b> de la masa (el cordón se palpa libre entre la masa y el anillo inguinal) y <b>no hay impulso con Valsalva</b> ni se reduce: no es hernia.',
        'Testículo izquierdo, cordones y ganglios inguinales normales. Un hidrocele de aparición reciente en un adulto obliga a descartar tumor testicular o epididimitis subyacentes (ecografía).'
      ],
      teaching: [
        'Ante un <b>aumento escrotal</b> contesta tres preguntas: ¿puedo llegar por encima de la masa? (sí: escrotal; no: inguinoescrotal), ¿se delimita el testículo?, ¿transilumina?',
        'Hidrocele: quístico, indoloro, transilumina, sin impulso con la tos. Hernia inguinoescrotal: no se llega por encima, impulso con Valsalva, reductible, no transilumina.',
        'Un hidrocele impide palpar el testículo: pide ecografía para no pasar por alto un tumor.'
      ],
      overlay: { masc: hidro() },
      path: {
        'masc:escroto:insp': '<b>escroto asimétrico</b>: hemiescroto derecho <b>aumentado</b> (≈ 8 cm), de superficie lisa, piel de aspecto normal (sin eritema, edema ni venas dilatadas); el izquierdo es normal. El tamaño <b>no cambia</b> al acostarse ni con el esfuerzo.',
        'masc:escroto:palp': 'piel escrotal móvil sobre una masa derecha tensa; el testículo izquierdo está en su sitio.',
        'masc:testD:insp': 'hemiescroto derecho aumentado, liso y simétrico en su contorno; sin cambios de la piel.',
        'masc:testD:palp': 'masa <b>quística</b>, <b>lisa</b>, <b>tensa y renitente</b>, <b>indolora</b>, de ≈ 8 cm, que ocupa el hemiescroto derecho: <b>no se delimita el testículo ni el epidídimo</b> (quedan englobados por el líquido de la túnica vaginal). Por encima de la masa el cordón es normal (se «llega por encima»).',
        'masc:testD:trans': Nt(TH('luz apoyada en la cara posterior del hemiescroto, en una habitación oscura.', '<b>transiluminación positiva</b>: toda la masa se ilumina con un halo rosado homogéneo; el testículo se ve como una sombra en su interior: contenido líquido (hidrocele).'), '🔦 halo luminoso', '#b07a1a'),
        'masc:epiD:palp': 'epidídimo derecho <b>no delimitable</b>, englobado por el hidrocele; sin dolor.',
        'masc:corD:palp': 'cordón espermático derecho de calibre normal por encima de la masa; conducto deferente palpable: se puede delimitar el polo superior de la masa (es escrotal, no inguinal).',
        'masc:corD:vals': '<b>sin impulso con la tos ni Valsalva</b> en el cordón derecho; la masa no cambia de tamaño ni se reduce.',
        'masc:corD:trans': 'cordón derecho sin transiluminación (la luz solo atraviesa la masa escrotal).',
        'masc:anD:vals': 'anillo inguinal derecho cerrado; <b>sin impulso ni protrusión</b> con la tos: no hay hernia inguinal asociada.',
        'masc:anD:palp': 'anillo inguinal superficial derecho cerrado, sin masas.',
        'masc:testI:palp': 'testículo izquierdo normal: ovoide, ≈ 4,5 cm, firme-elástico, liso, móvil e indoloro; epidídimo blando.',
        'masc:testI:trans': 'transiluminación <b>negativa</b> a la izquierda (testículo opaco): hallazgo normal, útil como comparación.',
        'masc:gang:palp': 'ganglios inguinales ≤ 1 cm, blandos, móviles e indoloros.'
      }
    },
    /* 6 · Hernia inguinal ---------------------------------------------------------------------------- */
    {
      id: 'pg-her', age: 52, sex: 'M', diag: 'Hernia inguinal indirecta izquierda (reductible)',
      complaint: 'Trabajador de la construcción. Desde hace un año nota un bulto en la ingle izquierda que aparece al toser, levantar peso o estar mucho de pie, y desaparece al acostarse; molestia tirante, sin dolor intenso ni vómitos.',
      vitals: 'FC 74 · PA 130/82 · FR 14 · T 36,6 °C · SpO₂ 98 %',
      v: { hr: 74, sbp: 130, dbp: 82, rr: 14, temp: 36.6, spo2: 98, height: 1.74, weight: 86, waist: 100 },
      findings: [
        'De pie: <b>abultamiento inguinoescrotal izquierdo</b> que aumenta con la tos y el Valsalva; en decúbito desaparece (<b>reductible</b>).',
        'Con el dedo invaginando el escroto hasta el anillo superficial: <b>impulso en la punta del dedo</b> y protrusión que <b>desciende por el canal</b> hacia el escroto, con <b>gorgoteo</b> al reducirla: hernia <b>indirecta</b> (oblicua externa).',
        '<b>No se puede llegar por encima</b> de la masa (se continúa con el canal inguinal); el testículo izquierdo se palpa normal y <b>separado</b> de ella; <b>transiluminación negativa</b>.',
        'Sin signos de complicación: no es dolorosa, es blanda y se reduce; sin náuseas, vómitos ni distensión. Anillo derecho sin impulso.'
      ],
      teaching: [
        'Explora las hernias <b>de pie</b> y luego en decúbito; pide toser y hacer Valsalva con el dedo en el anillo superficial: el impulso en la <b>punta</b> del dedo sugiere hernia indirecta y en el <b>pulpejo</b> (lateral), directa.',
        'Una hernia <b>irreductible, dolorosa, tensa</b>, con vómitos o distensión, es una hernia <b>estrangulada</b>: urgencia quirúrgica; no intentes reducirla con fuerza.',
        'Diferencia la hernia inguinoescrotal del hidrocele (transilumina, se llega por encima) y de la hernia crural (por debajo del ligamento inguinal, más frecuente en mujeres).'
      ],
      overlay: { masc: hernia() },
      path: {
        'masc:escroto:insp': 'de pie, <b>abultamiento inguinoescrotal izquierdo</b>, blando, que aumenta con la tos; en decúbito la tumefacción <b>desaparece</b>; piel normal. Hemiescroto derecho normal.',
        'masc:escroto:palp': 'piel escrotal normal; en el hemiescroto izquierdo se palpa, por encima del testículo, una masa <b>blanda y reductible</b> que se continúa hacia el conducto inguinal.',
        'masc:anI:vals': P(TH('con el paciente de pie, dedo índice invaginando la piel del escroto hasta el anillo inguinal superficial; se pide toser y hacer Valsalva.', '<b>impulso en la punta del dedo</b> y protrusión de una masa blanda que <b>desciende por el canal inguinal</b> hacia el escroto (<b>hernia indirecta</b>); al acostarse y con presión suave se <b>reduce</b> con un gorgoteo (contenido intestinal).'), 'impulso +'),
        'masc:anI:palp': '<b>anillo inguinal superficial izquierdo dilatado</b> (admite la punta del dedo con holgura); masa blanda, no dolorosa, reductible.',
        'masc:corI:palp': 'cordón espermático izquierdo <b>engrosado</b> por el saco herniario que lo acompaña; conducto deferente palpable; <b>no se puede llegar por encima</b> de la masa (se continúa con el canal).',
        'masc:corI:vals': 'con Valsalva, <b>impulso expansivo</b> a lo largo del cordón izquierdo (saco herniario); sin varicocele.',
        'masc:corI:trans': '<b>transiluminación negativa</b>: la masa es opaca (asa intestinal/epiplón), no líquida.',
        'masc:testI:palp': 'testículo izquierdo normal (≈ 4,5 cm, firme-elástico, liso, indoloro), <b>bien delimitado y separado</b> de la masa herniaria, que está por encima de él.',
        'masc:testI:trans': 'testículo izquierdo opaco: transiluminación negativa (normal).',
        'masc:testI:insp': 'hemiescroto izquierdo abultado en su parte superior por la hernia; testículo en posición normal.',
        'masc:anD:vals': '<b>sin hernia derecha</b>: no hay impulso ni protrusión con la tos ni con Valsalva.',
        'masc:anD:palp': 'anillo inguinal superficial derecho cerrado, sin masas ni dolor.',
        'masc:corD:vals': 'cordón derecho sin impulso con Valsalva; sin varicocele.',
        'masc:gang:palp': 'ganglios inguinales ≤ 1 cm, blandos, móviles e indoloros (sin adenopatías: la masa inguinal no es ganglionar).',
        'rin:sup:palp': SUP_N.palp, 'rin:sup:perc': SUP_N.perc
      }
    },
    /* 7 · Nódulo mamario sospechoso ------------------------------------------------------------------ */
    {
      id: 'pg-cam', age: 58, sex: 'F', diag: 'Nódulo mamario sospechoso de carcinoma (mama derecha)',
      complaint: 'Hace tres meses se notó un bulto duro en la parte superior externa de la mama derecha, que no duele; en las últimas semanas el pezón «se hundió» y la piel de esa zona parece «cáscara de naranja». Posmenopáusica; su madre tuvo cáncer de mama.',
      vitals: 'FC 76 · PA 132/82 · FR 15 · T 36,5 °C · SpO₂ 98 %',
      v: { hr: 76, sbp: 132, dbp: 82, rr: 15, temp: 36.5, spo2: 98, height: 1.62, weight: 66, waist: 86 },
      findings: [
        '<b>Nódulo</b> de ≈ 3 cm en el <b>cuadrante superoexterno derecho</b>: <b>duro (pétreo)</b>, de <b>bordes irregulares y mal definidos</b>, <b>indoloro</b>, <b>adherido</b> a la piel y a planos profundos (no se desplaza con la contracción del pectoral).',
        'Signos cutáneos: <b>hoyuelo/retracción</b> visible al elevar los brazos y con las manos en las caderas; <b>piel de naranja</b> (edema por obstrucción linfática) sobre el nódulo; <b>retracción reciente y unilateral del pezón</b>.',
        '<b>Adenopatías axilares</b> derechas centrales y pectorales, <b>duras y poco móviles</b>; fosa supraclavicular libre.',
        'Mama izquierda sin alteraciones. Antecedente familiar de primer grado. Contraste con el fibroadenoma: joven, liso, móvil y bien delimitado.'
      ],
      teaching: [
        'Describe todo nódulo mamario por <b>localización (cuadrante y hora), tamaño, consistencia, bordes, movilidad, adherencia, sensibilidad</b> y los cambios de piel y pezón; busca siempre los <b>ganglios axilares y supraclaviculares</b>.',
        'Las maniobras de inspección (brazos elevados, manos en las caderas) hacen visibles la retracción y los hoyuelos; la piel de naranja y la retracción reciente del pezón son signos de alarma.',
        'Sospecha de carcinoma: duro, irregular, fijo, indoloro, con cambios cutáneos o adenopatías → mamografía, ecografía y biopsia (tríada diagnóstica).'
      ],
      overlay: { mama: caMama() },
      path: {
        'mama:cseR:insp': TH('inspección con brazos caídos, brazos elevados y manos en las caderas.', 'en el cuadrante superoexterno derecho, <b>hoyuelo</b> (retracción cutánea) que se acentúa al <b>elevar los brazos</b> y al <b>contraer los pectorales</b> (manos en las caderas); <b>piel de naranja</b> (poros dilatados, edema) sobre la zona; asimetría del contorno.'),
        'mama:cseR:palp': P(TH('palpación en decúbito, brazo tras la cabeza, con la pulpa de los dedos y tres presiones.', '<b>nódulo de ≈ 3 cm</b> en el cuadrante superoexterno derecho (a las 10 h, a 4 cm del pezón): <b>duro, pétreo</b>, de <b>bordes irregulares y mal definidos</b>, <b>indoloro</b>, <b>adherido a la piel</b> (no se puede pellizcar la piel sobre él) y <b>fijo a planos profundos</b> (no se desplaza con el pectoral contraído).'), 'duro, fijo'),
        'mama:csiR:insp': 'cuadrante superointerno derecho sin cambios cutáneos; la asimetría del contorno se ve en el cuadrante externo.',
        'mama:csiR:palp': 'cuadrante superointerno derecho: tejido adiposo blando, sin nódulos.',
        'mama:cieR:insp': 'cuadrante inferoexterno derecho: piel de naranja leve en su límite superior; sin hoyuelos.',
        'mama:cieR:palp': 'cuadrante inferoexterno derecho: sin nódulos; cresta inframamaria firme (normal).',
        'mama:ciiR:palp': 'cuadrante inferointerno derecho: sin nódulos.',
        'mama:ciiR:insp': 'cuadrante inferointerno derecho: piel sin cambios.',
        'mama:spR:palp': 'cola de Spence derecha: tejido adiposo sin nódulos (el nódulo está en el CSE, cerca de la prolongación axilar).',
        'mama:spR:insp': 'prolongación axilar derecha con leve edema cutáneo; sin abultamiento.',
        'mama:areR:insp': TH('inspección comparativa de ambos pezones.', '<b>pezón derecho retraído</b> (invertido), de aparición <b>reciente y unilateral</b>, que no se evierte con la presión; areola sin eccema ni descamación (no es enfermedad de Paget); sin secreción.'),
        'mama:areR:palp': 'región retroareolar derecha: induración que se continúa con el nódulo del CSE; la compresión del pezón <b>no produce secreción</b>.',
        'mama:axCen:palp': P(TH('axila derecha con el brazo relajado y sostenido por el examinador.', '<b>adenopatía central</b> de ≈ 2 cm, <b>dura</b>, <b>poco móvil</b> (adherida), indolora.'), 'adenopatía dura'),
        'mama:axPec:palp': P('<b>ganglio pectoral</b> derecho de ≈ 1,5 cm, duro, indoloro.', 'adenopatía'),
        'mama:axSub:palp': 'ganglios subescapulares no palpables.',
        'mama:axLat:palp': 'ganglios laterales (humerales) no palpables.',
        'mama:axApi:palp': 'ganglios apicales (infraclaviculares) no palpables.',
        'mama:axSup:palp': 'fosa supraclavicular <b>libre</b>: sin adenopatías (su presencia indicaría enfermedad avanzada).',
        'mama:cseL:palp': 'cuadrante superoexterno izquierdo: tejido de predominio adiposo, blando, sin nódulos.',
        'mama:cseL:insp': 'mama izquierda sin cambios cutáneos ni retracciones.',
        'mama:areL:insp': 'pezón izquierdo <b>evertido</b>, simétrico con el aspecto previo; sin secreción (la asimetría de los pezones es nueva y unilateral).',
        'mama:auto:auto': 'a los 58 años corresponde <b>mamografía de cribado cada 1–2 años</b>; con un nódulo sospechoso se indica <b>mamografía diagnóstica, ecografía y biopsia</b> (tríada), sin esperar al cribado. Se recomienda autoexamen un día fijo cada mes y consulta ante cualquier cambio.'
      }
    },
    /* 8 · Fibroadenoma ------------------------------------------------------------------------------- */
    {
      id: 'pg-fib', age: 24, sex: 'F', diag: 'Fibroadenoma de mama',
      complaint: 'Hace cuatro meses se notó «una bolita» en la mama izquierda que no duele, no ha crecido y se mueve bajo la piel; se nota algo más antes de la menstruación. Sin antecedentes familiares.',
      vitals: 'FC 68 · PA 110/70 · FR 14 · T 36,6 °C · SpO₂ 99 %',
      v: { hr: 68, sbp: 110, dbp: 70, rr: 14, temp: 36.6, spo2: 99, height: 1.66, weight: 57, waist: 70 },
      findings: [
        'Nódulo de ≈ 2 cm en el <b>cuadrante superoexterno izquierdo</b>: <b>bien delimitado, liso, ovoide</b>, de consistencia <b>firme-elástica (gomosa)</b>, <b>muy móvil</b> («ratón mamario»: escapa de los dedos), <b>no adherido</b> a piel ni a planos profundos, <b>indoloro</b>.',
        'Piel y pezón sin cambios; sin secreción; <b>axila libre</b>. Mama derecha con tejido glandular nodular fisiológico.',
        'Mujer joven (15–35 años), nódulo estable: características clínicas típicas de <b>fibroadenoma</b> (tumor benigno más frecuente en jóvenes); se confirma con ecografía.',
        'Contraste con el nódulo sospechoso: duro, irregular, fijo, con cambios cutáneos, retracción del pezón o adenopatías.'
      ],
      teaching: [
        'En la mujer joven la mama es glandular y nodular: distingue la nodularidad fisiológica (bilateral, cambia con el ciclo) de un nódulo dominante (persistente, delimitable en tres dimensiones).',
        'Movilidad, bordes netos y consistencia elástica orientan a benignidad, pero <b>ningún signo clínico descarta el cáncer</b>: todo nódulo dominante se estudia (ecografía antes de los 30–35 años).',
        'Explora en la fase posmenstrual (días 5–7), cuando la mama está menos congestiva.'
      ],
      overlay: { mama: fibro() },
      path: {
        'mama:cseL:insp': 'cuadrante superoexterno izquierdo: piel sin cambios (sin hoyuelos, eritema ni retracción) en ninguna de las tres posturas; contorno regular.',
        'mama:cseL:palp': Nt(TH('palpación en decúbito con la pulpa de los dedos, fijando el nódulo entre dos dedos.', '<b>nódulo de ≈ 2 cm</b> en el cuadrante superoexterno izquierdo (a las 2 h): <b>bien delimitado</b>, <b>liso</b>, ovoide, <b>firme-elástico</b> (gomoso), <b>muy móvil</b> en todas direcciones («se escapa» de los dedos), <b>no adherido</b> a la piel ni al pectoral, <b>indoloro</b>; alrededor, tejido glandular nodular fisiológico.'), 'liso y móvil', '#0e6a78'),
        'mama:csiL:palp': 'cuadrante superointerno izquierdo: tejido glandular nodular fisiológico, sin nódulo dominante.',
        'mama:cieL:palp': 'cuadrante inferoexterno izquierdo: tejido glandular elástico, sin nódulos.',
        'mama:ciiL:palp': 'cuadrante inferointerno izquierdo: sin nódulos; cresta inframamaria firme (normal).',
        'mama:spL:palp': 'cola de Spence izquierda: tejido glandular fino, sin nódulos.',
        'mama:areL:insp': 'areola y pezón izquierdos normales, pezón evertido, sin retracción ni secreción.',
        'mama:areL:palp': 'región retroareolar izquierda sin masas; sin secreción al comprimir el pezón.',
        'mama:cseR:palp': 'cuadrante superoexterno derecho: tejido glandular nodular fisiológico (granular, elástico), simétrico; <b>sin nódulo dominante</b>.',
        'mama:axCen:palp': 'ganglios axilares centrales izquierdos <b>no palpables</b>.',
        'mama:axPec:palp': 'ganglios pectorales no palpables.',
        'mama:axSup:palp': 'fosa supraclavicular libre.',
        'mama:auto:auto': 'a los 24 años <b>no está indicada la mamografía</b> de cribado; el nódulo se estudia con <b>ecografía mamaria</b> (mama densa). Autoexamen mensual entre los días 5 y 7 tras la menstruación; consultar si el nódulo crece o cambia.'
      }
    },
    /* 9 · Ginecomastia ------------------------------------------------------------------------------- */
    {
      id: 'pg-gin', age: 64, sex: 'M', diag: 'Ginecomastia bilateral (farmacológica)',
      complaint: 'Desde hace cinco meses nota las dos mamas aumentadas y algo sensibles, sobre todo detrás del pezón; sin secreción. Toma espironolactona desde hace ocho meses por insuficiencia cardíaca.',
      vitals: 'FC 66 · PA 118/74 · FR 16 · T 36,5 °C · SpO₂ 96 %',
      v: { hr: 66, sbp: 118, dbp: 74, rr: 16, temp: 36.5, spo2: 96, height: 1.71, weight: 84, waist: 104 },
      findings: [
        '<b>Disco glandular retroareolar</b> bilateral de ≈ 4 cm, <b>firme-elástico</b>, <b>concéntrico al pezón</b>, móvil, algo <b>sensible</b>; piel y pezón normales; sin secreción: <b>ginecomastia</b> verdadera.',
        'Se diferencia de la <b>lipomastia</b> (pseudoginecomastia): tejido adiposo blando, difuso, sin disco palpable, propia de la obesidad.',
        'Se diferencia del <b>carcinoma de mama masculino</b>: nódulo <b>unilateral, excéntrico</b> al pezón, duro, fijo, con retracción, secreción o adenopatía.',
        'Testículos de tamaño y consistencia normales (sin atrofia ni masa); causa probable: <b>espironolactona</b> (antiandrógeno). Otras causas: cirrosis, hipogonadismo, hipertiroidismo, tumores productores de hCG o estrógenos.'
      ],
      teaching: [
        'Para distinguir ginecomastia de lipomastia, <b>pinza el tejido retroareolar entre el pulgar y el índice</b> y compáralo con la grasa vecina: el disco glandular es firme y concéntrico.',
        'En el varón con aumento mamario explora siempre los <b>testículos</b> (atrofia o tumor) y busca estigmas de hepatopatía e hipertiroidismo; revisa los fármacos.',
        'Un nódulo excéntrico, duro y unilateral en el varón se estudia como un posible carcinoma, aunque sea infrecuente.'
      ],
      overlay: { mama: gineco() },
      path: {
        'mama:areR:insp': 'areola y pezón derechos normales, sin retracción, eccema ni secreción; <b>mama aumentada</b> de forma simétrica con la izquierda.',
        'mama:areL:insp': 'areola y pezón izquierdos normales; mama aumentada, simétrica con la derecha.',
        'mama:areR:palp': Nt(TH('se pinza el tejido retroareolar entre el pulgar y el índice y se compara con la grasa de la periferia.', '<b>disco glandular retroareolar</b> de ≈ 4 cm, <b>firme-elástico</b>, <b>concéntrico al pezón</b>, de bordes definidos, <b>móvil</b>, algo <b>sensible</b>; sin nódulo excéntrico ni secreción: ginecomastia verdadera.'), 'disco glandular', '#0e6a78'),
        'mama:areL:palp': Nt('<b>disco glandular retroareolar izquierdo</b> de ≈ 4 cm, firme-elástico, concéntrico, móvil y algo sensible: ginecomastia bilateral y simétrica.', 'disco glandular', '#0e6a78'),
        'mama:cseR:insp': 'mama derecha <b>aumentada de volumen</b>, de contorno redondeado, con piel normal, sin hoyuelos ni retracción.',
        'mama:cseL:insp': 'mama izquierda aumentada de forma simétrica; piel normal.',
        'mama:cseR:palp': 'cuadrante superoexterno derecho: tejido <b>adiposo blando</b> en la periferia (el disco glandular es solo retroareolar); sin nódulos.',
        'mama:cseL:palp': 'cuadrante superoexterno izquierdo: tejido adiposo blando, sin nódulos excéntricos.',
        'mama:csiR:palp': 'tejido adiposo blando; sin nódulos.', 'mama:csiL:palp': 'tejido adiposo blando; sin nódulos.',
        'mama:cieR:palp': 'tejido adiposo blando; sin nódulos.', 'mama:cieL:palp': 'tejido adiposo blando; sin nódulos.',
        'mama:ciiR:palp': 'tejido adiposo blando; sin nódulos.', 'mama:ciiL:palp': 'tejido adiposo blando; sin nódulos.',
        'mama:axCen:palp': 'ganglios axilares no palpables (bilateral).',
        'mama:axPec:palp': 'ganglios pectorales no palpables.',
        'mama:auto:auto': 'en el varón con ginecomastia: revisar fármacos (espironolactona, antiandrógenos, cimetidina, antirretrovirales, anabolizantes), explorar testículos, hígado y tiroides; consultar ante un nódulo duro, unilateral o excéntrico, secreción o adenopatía.',
        'masc:testD:palp': 'testículo derecho de tamaño normal (≈ 4,5 cm), firme-elástico, liso, indoloro, <b>sin masas</b> (descartada atrofia o tumor testicular como causa).',
        'masc:testI:palp': 'testículo izquierdo de tamaño y consistencia normales, sin masas.',
        'masc:vello:insp': 'vello púbico de distribución androide conservada (sin signos de hipogonadismo).'
      }
    },
    /* 10 · Prolapso genital -------------------------------------------------------------------------- */
    {
      id: 'pg-pro', age: 68, sex: 'F', diag: 'Prolapso genital (cistocele e histerocele de grado II)',
      complaint: 'Sensación de «bulto» y peso en la vagina que aumenta al estar de pie y al final del día, y desaparece al acostarse; pierde orina al toser o reír; a veces debe empujar con los dedos para orinar bien. Cuatro partos vaginales; posmenopáusica.',
      vitals: 'FC 74 · PA 138/84 · FR 15 · T 36,4 °C · SpO₂ 97 %',
      v: { hr: 74, sbp: 138, dbp: 84, rr: 15, temp: 36.4, spo2: 97, height: 1.58, weight: 70, waist: 92 },
      findings: [
        'Con <b>Valsalva</b> en posición ginecológica: <b>abombamiento de la pared vaginal anterior</b> (cistocele) y <b>descenso del cuello uterino hasta el introito</b> (histerocele de grado II: llega al himen sin sobrepasarlo). En reposo se reduce.',
        '<b>Incontinencia urinaria de esfuerzo</b>: escape de orina por el meato con la tos (prueba de la tos positiva), con vejiga semillena.',
        'Espéculo: cuello descendido, algo <b>alargado</b>, con mucosa pálida y una pequeña <b>erosión por roce</b>; paredes vaginales atróficas (lisas, pálidas). Tacto bimanual: útero pequeño, descendido, móvil e indoloro; anexos no palpables.',
        'Periné con cicatriz de episiotomía y <b>hiato genital amplio</b>, tono perineal disminuido. Sin globo vesical; riñones no palpables.'
      ],
      teaching: [
        'Explora el prolapso <b>con Valsalva y de pie</b> si no se reproduce en decúbito; describe qué compartimento desciende (anterior: cistocele; apical: histerocele; posterior: rectocele) y hasta dónde (grados o POP-Q: por encima del himen, en el himen o fuera de él).',
        'Factores: partos vaginales, edad y menopausia (atrofia), obesidad, tos crónica, estreñimiento. Valora tono perineal y pide una contracción voluntaria (ejercicios del suelo pélvico).',
        'El prolapso puede obstruir la uretra y <b>enmascarar</b> una incontinencia de esfuerzo; descarta retención con residuo posmiccional y revisa la piel del cuello expuesto (úlceras por decúbito).'
      ],
      overlay: { fem: prolapso() },
      path: {
        'fem:intro:insp': P(TH('inspección del introito en reposo y durante Valsalva y tos, en posición ginecológica.', 'en reposo, introito amplio; con <b>Valsalva</b> protruye la <b>pared vaginal anterior</b> (cistocele) y desciende el <b>cuello uterino hasta el plano del himen</b> sin sobrepasarlo (<b>prolapso de grado II</b>); con la <b>tos</b>, escape de orina por el meato (incontinencia de esfuerzo). Mucosa pálida y fina (atrofia).'), 'Valsalva: desciende'),
        'fem:meato:insp': 'meato uretral en la línea media, con mucosa pálida; con la tos se observa <b>pérdida de orina</b> en chorro breve (prueba de la tos positiva); sin carúncula.',
        'fem:meato:palp': 'glándulas de Skene sin secreción ni dolor; la uretra está hipermóvil (desciende con el esfuerzo).',
        'fem:per:insp': 'periné con <b>cicatriz de episiotomía</b>, <b>hiato genital amplio</b>, cuerpo perineal corto; tono perineal disminuido a la contracción voluntaria; piel perianal sin lesiones; sin rectocele evidente.',
        'fem:lmay:insp': 'labios mayores poco turgentes (atrofia posmenopáusica), piel íntegra, sin lesiones.',
        'fem:lmen:insp': 'labios menores pequeños y pálidos, con mucosa fina; sin lesiones.',
        'fem:monte:insp': 'vello púbico ralo y canoso; piel sin lesiones.',
        'fem:cli:insp': 'clítoris de tamaño normal, sin lesiones.',
        'fem:bartD:palp': 'glándula de Bartolino a las 4 h no palpable; sin dolor ni secreción.',
        'fem:bartI:palp': 'glándula de Bartolino a las 8 h no palpable; sin dolor ni secreción.',
        'fem:cerv:esp': TH('espéculo atemperado, sin lubricante, retirando luego cada valva para ver las paredes.', '<b>cuello uterino descendido</b>, cerca del introito, algo <b>alargado</b> (elongación), de mucosa pálida, con una pequeña <b>erosión por roce</b> en el labio anterior; orificio cervical externo en hendidura (multípara); sin masas.'),
        'fem:oce:esp': 'orificio cervical externo en hendidura transversal (multípara), sin secreción ni sangrado al contacto.',
        'fem:cerv:pap': 'a los 68 años, con citologías previas normales, el cribado puede <b>suspenderse</b>; si no tuvo controles adecuados en los últimos 10 años, se toma citología (exocérvix y endocérvix) con la técnica habitual, evitando la zona erosionada.',
        'fem:oce:pap': 'toma endocervical con cepillo si está indicada (sin cribado adecuado previo); de lo contrario, no se repite a esta edad.',
        'fem:flujo:esp': 'al retirar la valva anterior, la <b>pared vaginal anterior abomba</b> hacia la luz (cistocele), más con Valsalva; paredes <b>lisas, pálidas y finas</b> (atrofia); fondos de saco acortados; sin flujo anormal; pared posterior sin rectocele.',
        'fem:ut:bim': Nt('<b>útero pequeño</b> (posmenopáusico), <b>descendido</b>: el cuello se alcanza en el tercio inferior de la vagina; con Valsalva desciende hasta el introito; móvil, de consistencia firme, <b>indoloro</b>.', 'útero descendido', '#0e6a78'),
        'fem:anex:bim': 'anexos no palpables (atrofia posmenopáusica normal); sin masas ni dolor.',
        'fem:fsp:bim': 'fondo de saco posterior libre, blando e indoloro; sin nodularidad.',
        'fem:movc:bim': 'movilización del cuello indolora; cuello hipermóvil que desciende con facilidad.',
        'rin:sup:palp': 'región suprapúbica blanda e indolora, <b>sin globo vesical</b>; tras orinar, refiere sensación de vaciado incompleto (medir residuo posmiccional).',
        'rin:sup:perc': SUP_N.perc,
        'rin:cup:ojo': 'orina amarilla clara y transparente; pierde orina con la tos y el esfuerzo (<b>incontinencia de esfuerzo</b>), sin urgencia; micción a veces con ayuda de los dedos (reducción manual del prolapso).',
        'rin:cup:tira': TIRA_N, 'rin:strip:tira': TIRA_N
      }
    }
  ];

  /* ---------------------------------------------------------------- bloqueo por sexo con aviso propio del módulo
     El módulo base avisa con «elige la persona 1 o 4» (personas sanas); aquí el aviso se refiere a los pacientes de este módulo.
     Para el sexo contrario se sustituyen todas las maniobras de la escena (solo las que existen en el módulo base, para no alterar
     el total de progreso) y se tapa el cartel del fondo con un overlay. */
  const listOf = sex => {
    const l = PACIENTES.map((p, i) => (p.sex === sex ? i + 1 : 0)).filter(Boolean);
    return l.length > 1 ? `${l.slice(0, -1).join(', ')} o ${l[l.length - 1]}` : String(l[0] || '');
  };
  const sceneOf = id => GU.scenes.find(s => s.id === id);
  const bannerFix = txt => `<g style="pointer-events:none"><rect x="150" y="4" width="460" height="26" rx="13" fill="#fff4d6" stroke="#e0a030"/><text x="380" y="22" text-anchor="middle" class="svg-small" style="fill:#7a5200">${txt}</text></g>`;
  PACIENTES.forEach(p => {
    p.overlay = p.overlay || {};
    if (p.sex === 'F') {
      const msg = `Este apartado corresponde a un varón. Esta paciente es una mujer: elige el paciente ${listOf('M')}, o ve a «Genitales femeninos».`;
      (sceneOf('masc').regions || []).forEach(r => Object.keys(r.tools || {}).forEach(t => { p.path[`masc:${r.id}:${t}`] = msg; }));
      p.overlay.masc = (p.overlay.masc || '') + bannerFix(`Apartado de varones: elige el paciente ${listOf('M')}.`);
    } else {
      const msg = `Este apartado corresponde a una mujer. Este paciente es un varón: elige la paciente ${listOf('F')}, o ve a «Genitales masculinos».`;
      (sceneOf('fem').regions || []).forEach(r => { if (r.id !== 'prep') Object.keys(r.tools || {}).forEach(t => { p.path[`fem:${r.id}:${t}`] = msg; }); });
      p.overlay.fem = (p.overlay.fem || '') + bannerFix(`Apartado de mujeres: elige la paciente ${listOf('F')}.`);
    }
  });

  /* ---------------------------------------------------------------- cuestionario (6 preguntas; 1 depende del paciente) */
  const Q_PAT = {
    'pg-col': { q: 'En este paciente, ¿qué combinación de hallazgos define el síndrome de cólico renal?', options: ['Fiebre, puñopercusión positiva y orina turbia', 'Dolor cólico lumbar irradiado al trayecto ureteral, puñopercusión y puntos ureterales dolorosos, hematuria', 'Globo vesical y matidez suprapúbica', 'Dolor en el punto de McBurney con Blumberg positivo'], a: 1,
      why: 'La obstrucción aguda de la vía urinaria produce dolor cólico lumbar irradiado, con puñopercusión y puntos ureterales dolorosos y hematuria; la fiebre indicaría pielonefritis obstructiva.' },
    'pg-pie': { q: 'En esta paciente, ¿qué hallazgo diferencia la pielonefritis de una cistitis?', options: ['La disuria', 'Los nitritos positivos en la tira', 'La fiebre con escalofríos y la puñopercusión lumbar positiva', 'La polaquiuria'], a: 2,
      why: 'Disuria, polaquiuria y nitritos pueden estar en ambas; la fiebre, los escalofríos, el dolor lumbar y la puñopercusión positiva señalan infección urinaria alta.' },
    'pg-rao': { q: 'En este paciente, ¿qué caracteriza al globo vesical en la exploración?', options: ['Masa hipogástrica lisa, tensa y dolorosa, de convexidad superior, con matidez suprapúbica', 'Masa dura e irregular en el flanco con peloteo', 'Timpanismo suprapúbico y dolor en los puntos ureterales', 'Matidez desplazable en los flancos'], a: 0,
      why: 'La vejiga distendida es una masa mediana, lisa y mate que puede llegar al ombligo; la presión aumenta el deseo miccional y desaparece tras el sondaje.' },
    'pg-cap': { q: 'En este paciente, ¿qué hallazgos del tacto rectal orientan a carcinoma y no a hiperplasia benigna?', options: ['Próstata grande, lisa, elástica y simétrica con surco borrado', 'Próstata blanda, caliente y muy dolorosa', 'Nódulo pétreo e irregular, límites imprecisos y glándula fija', 'Próstata pequeña y móvil'], a: 2,
      why: 'La consistencia pétrea, la irregularidad y la fijeza son los signos de carcinoma; la HBP es grande, lisa, elástica y móvil, y la prostatitis es blanda y dolorosa.' },
    'pg-hid': { q: 'En este paciente, ¿qué hallazgo confirma que la masa escrotal es un hidrocele y no una hernia?', options: ['Impulso con la tos', 'Transiluminación positiva y posibilidad de «llegar por encima» de la masa', 'Dolor intenso a la palpación', 'Reducción al acostarse'], a: 1,
      why: 'El hidrocele es líquido (transilumina), es escrotal (el cordón se palpa libre por encima) y no tiene impulso ni se reduce; la hernia es lo contrario.' },
    'pg-her': { q: 'En este paciente, ¿qué dato de la exploración indica que la hernia inguinal es indirecta?', options: ['El impulso se percibe en el pulpejo del dedo, medial', 'La masa transilumina', 'La protrusión desciende por el canal hacia el escroto y el impulso llega a la punta del dedo', 'Aparece por debajo del ligamento inguinal'], a: 2,
      why: 'La hernia indirecta sale por el anillo profundo y recorre el canal hacia el escroto; la directa protruye por la pared posterior (impulso en el pulpejo); la crural aparece bajo el ligamento inguinal.' },
    'pg-cam': { q: 'En esta paciente, ¿qué conjunto de hallazgos hace sospechar un carcinoma de mama?', options: ['Nódulo liso, móvil, elástico, sin cambios cutáneos', 'Nódulo duro, irregular, adherido, con piel de naranja, retracción del pezón y adenopatía axilar', 'Disco retroareolar bilateral y sensible', 'Nodularidad bilateral que cambia con el ciclo'], a: 1,
      why: 'Consistencia pétrea, bordes irregulares, fijación a piel o planos profundos, cambios cutáneos, retracción reciente del pezón y adenopatías duras son signos de alarma.' },
    'pg-fib': { q: 'En esta paciente, ¿qué características del nódulo orientan a fibroadenoma?', options: ['Duro, fijo y con retracción cutánea', 'Bien delimitado, liso, elástico, muy móvil e indoloro en una mujer joven', 'Doloroso, caliente y con eritema', 'Bilateral y retroareolar'], a: 1,
      why: 'El fibroadenoma es el tumor benigno típico de la mujer joven: liso, gomoso, móvil («ratón mamario») y no adherido; se confirma con ecografía.' },
    'pg-gin': { q: 'En este paciente, ¿cómo se diferencia la ginecomastia de la lipomastia (pseudoginecomastia)?', options: ['Por la presencia de un disco glandular retroareolar firme y concéntrico al pezón', 'Por el aumento difuso de tejido blando', 'Por la secreción por el pezón', 'Por la retracción del pezón'], a: 0,
      why: 'Al pinzar el tejido retroareolar, la ginecomastia muestra un disco firme concéntrico; la lipomastia es grasa blanda y difusa; la secreción o la retracción obligan a descartar carcinoma.' },
    'pg-pro': { q: 'En esta paciente, ¿cómo se grada el prolapso que desciende hasta el himen con Valsalva sin sobrepasarlo?', options: ['Grado I', 'Grado II', 'Grado III', 'Procidencia (grado IV)'], a: 1,
      why: 'Grado I: no llega al himen; II: llega al plano del himen; III: lo sobrepasa; IV: eversión completa (procidencia). Se explora con Valsalva y, si es preciso, de pie.' }
  };
  const quiz = c => [
    Q_PAT[c.id] || Q_PAT['pg-col'],
    { q: 'La puñopercusión lumbar positiva (signo de Giordano) indica…', options: ['Dolor de origen muscular', 'Cálculo vesical', 'Distensión aguda de la cápsula renal o de la vía urinaria (pielonefritis, obstrucción)', 'Peritonitis'], a: 2,
      why: 'El golpe suave sobre el ángulo costovertebral duele cuando el riñón o la vía urinaria están inflamados u obstruidos; se compara siempre con el lado contrario.' },
    { q: 'En el tacto rectal, una próstata grande, lisa, de consistencia elástica, simétrica, móvil, indolora y con surco medio borrado corresponde a…', options: ['Prostatitis aguda', 'Hiperplasia prostática benigna', 'Carcinoma de próstata', 'Próstata normal del adulto joven'], a: 1,
      why: 'La HBP crece en la zona de transición de forma homogénea; el carcinoma es pétreo, irregular y fijo; la prostatitis es blanda, caliente y muy dolorosa.' },
    { q: 'Una masa escrotal que transilumina, es indolora, no se reduce y permite «llegar por encima» de ella es…', options: ['Hernia inguinoescrotal', 'Varicocele', 'Hidrocele', 'Torsión testicular'], a: 2,
      why: 'El hidrocele es líquido y escrotal; la hernia no transilumina, tiene impulso con la tos y se continúa con el canal inguinal; el varicocele es una «bolsa de gusanos» que aumenta con Valsalva.' },
    { q: 'La maniobra de inspección que hace visibles los hoyuelos y la retracción cutánea de un carcinoma de mama es…', options: ['Decúbito supino con el brazo tras la cabeza', 'Brazos elevados y manos en las caderas (contracción de los pectorales)', 'Compresión del pezón', 'Transiluminación de la mama'], a: 1,
      why: 'La fijación a los ligamentos de Cooper o al pectoral se evidencia al elevar los brazos y al contraer los pectorales; la palpación se hace después en decúbito.' },
    { q: 'En el varón, un nódulo mamario unilateral, duro y excéntrico al pezón, con retracción, debe hacer pensar en…', options: ['Ginecomastia farmacológica', 'Lipomastia', 'Carcinoma de mama masculino', 'Tejido mamario normal'], a: 2,
      why: 'La ginecomastia es un disco concéntrico, firme-elástico y a menudo bilateral; un nódulo excéntrico, duro, fijo o con secreción o adenopatía se estudia como carcinoma.' }
  ];

  NormalEngine.build({
    base: 'gu', id: 'pat-gu', title: 'Genitourinario y mama: hallazgos patológicos', icon: '🚻', group: 'Exploración patológica', hideDx: false,
    desc: 'Diez pacientes sobre las escenas del módulo normal: cólico renal, pielonefritis, retención de orina con globo vesical por HBP, carcinoma de próstata, hidrocele, hernia inguinal, nódulo mamario sospechoso, fibroadenoma, ginecomastia y prolapso genital. Diagramas esquemáticos y texto técnico.',
    bullets: ['Puñopercusión positiva, puntos ureterales dolorosos, hematuria y piuria en la tira; globo vesical con matidez suprapúbica', 'Tacto rectal: HBP (grande, lisa, elástica, surco borrado) frente a carcinoma (nódulo pétreo, irregular, fijo); hidrocele (transilumina) frente a hernia (Valsalva, reductible)', 'Mama: nódulo sospechoso con piel de naranja, retracción del pezón y adenopatía, frente a fibroadenoma y ginecomastia; prolapso genital con incontinencia de esfuerzo'],
    refs: [
      'Argente HA, Álvarez ME. <i>Semiología Médica. Fisiopatología, semiotecnia y propedéutica</i>. Editorial Médica Panamericana — Aparato urinario (síndromes de cólico renal, infección urinaria y retención urinaria; puñopercusión, puntos ureterales, globo vesical), aparato genital masculino (tacto rectal: próstata; masas escrotales e inguinales), aparato genital femenino (prolapso genital) y examen de la mama (nódulo mamario, ginecomastia).',
      'Bickley LS. <i>Bates. Guía de exploración física e historia clínica</i>. Wolters Kluwer — Mama y axilas; genitales masculinos y hernias; genitales femeninos; próstata: hallazgos anormales.',
      'Guías de cribado (OMS; sociedades de ginecología, urología y oncología locales) — mamografía y citología cervical según la edad; estudio del nódulo mamario (tríada diagnóstica).'
    ],
    people: PACIENTES,
    teaching: [
      'Riñón y vías urinarias: combina puñopercusión lumbar, puntos ureterales, palpación y percusión suprapúbicas y examen de la orina (aspecto y tira reactiva) para separar cólico renal, pielonefritis y retención urinaria.',
      'Toda masa (próstata, escroto, ingle, mama) se describe por tamaño, consistencia, superficie, límites, movilidad, adherencia y sensibilidad; las maniobras (transiluminación, Valsalva, contracción pectoral, pinzamiento retroareolar) añaden el dato que decide.'
    ],
    quiz
  });
})();
