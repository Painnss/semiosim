/* Módulo patológico: Cabeza y cuello. Hereda las escenas de «headneck» (NormalEngine, base) y sustituye los hallazgos
   por paciente con `path` ('escena:region:instrumento'), añade signos visibles con `overlay` (SVG estático por escena) y,
   para las escenas que cambian de lado (oído, fondo de ojo) o redibujan el fondo (tiroides, boca), con `dyn`: funciones
   que reciben el lado mostrado y devuelven el SVG extra. Nomenclatura de Argente-Álvarez (síndromes y signos). */
(function () {
  'use strict';
  if (!window.NormalEngine || !NormalEngine.defs.headneck) return;
  const { esc } = U;
  const SKIN = '#f1c9a5', SKIN_D = '#b98a63';
  const TH = (t, h) => `<i>Técnica:</i> ${t} <i>Hallazgo:</i> ${h}`;
  const fork = () => { try { Sound.beep(512, 1.1, 0.16); } catch (e) { /* sin audio */ } };
  const bruit = (rate) => () => { try { Sound.listen({ heart: { rate: rate || 100, s1: 0.12, s2: 0.08, murmur: { kind: 'sys_ejection', level: 0.9 } }, heartGain: 1, lung: null, lungGain: 0, mode: 'bell' }); } catch (e) { /* sin audio */ } };
  /* lado mostrado en la escena (el oído y el fondo de ojo tienen selector D/I y OD/OI; las regiones comparten id) */
  const earSide = ctx => (/Oído izquierdo/.test(ctx.svg.textContent) ? 'I' : 'D');
  const eyeSide = ctx => (/\(OI\)/.test(ctx.svg.textContent) ? 'OI' : 'OD');
  /* hallazgo distinto según el lado: side(D, I) devuelve una función de path */
  const bySide = (D, I) => (c, ctx) => (earSide(ctx) === 'D' ? D : I);
  const fx = (side, x) => (side === 'OI' ? 676 - x : x);

  /* ------------------------------------------------------------ dibujos patológicos reutilizables */
  function exophthalmos() {
    const eye = cx => `
      <path d="M${cx - 37} 272 Q${cx} 236 ${cx + 37} 272 Q${cx} 308 ${cx - 37} 272 Z" fill="#fbfbfb"/>
      <circle cx="${cx}" cy="272" r="15" fill="#6b4a2f"/><circle cx="${cx}" cy="272" r="11" fill="#7d5a3a"/><circle cx="${cx}" cy="272" r="4.5" fill="#0b0b0b"/>
      <circle cx="${cx + 5}" cy="267" r="2.4" fill="#fff" opacity=".9"/>
      <path d="M${cx - 37} 272 Q${cx} 234 ${cx + 37} 272" fill="none" stroke="#6b4a3a" stroke-width="2.6"/>
      <path d="M${cx - 37} 272 Q${cx} 308 ${cx + 37} 272" fill="none" stroke="#a37c63" stroke-width="1.4"/>`;
    return `<g id="patExo">${eye(210)}${eye(330)}
      <path d="M550 215 Q660 118 770 215 Q660 312 550 215 Z" fill="#fbfbfb"/>
      <g stroke="#d98a8a" stroke-width="1.2" fill="none" opacity=".8"><path d="M556 206 Q590 196 616 214"/><path d="M750 206 Q722 220 706 210"/><path d="M600 250 Q624 262 640 256"/><path d="M700 252 Q676 262 660 258"/></g>
      <circle cx="660" cy="215" r="52" fill="#6b4a2f"/><circle cx="660" cy="215" r="42" fill="#7d5a3a"/><circle cx="660" cy="215" r="15" fill="#0b0b0b"/>
      <ellipse cx="674" cy="200" rx="9" ry="6" fill="#fff" opacity=".85"/>
      <path d="M550 215 Q660 118 770 215" fill="none" stroke="#6b4a3a" stroke-width="5"/>
      <path d="M552 214 Q660 312 768 214" fill="none" stroke="#a37c63" stroke-width="2.5"/>
      <text x="660" y="346" text-anchor="middle" class="svg-small">Esclera visible por encima del limbo (retracción palpebral) · exoftalmos</text></g>`;
  }
  const goiterNeck = `<g id="patBocio">
      <path d="M368 222 C332 230 328 300 372 312 Q410 328 448 312 C492 300 488 230 452 222 Q410 208 368 222 Z" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="2.4"/>
      <path d="M410 226 L410 310" stroke="${SKIN_D}" stroke-width="1.4" opacity=".5"/>
      <path d="M376 238 C356 252 358 290 380 300 M444 238 C464 252 462 290 440 300" fill="none" stroke="${SKIN_D}" stroke-width="1.2" opacity=".55"/>
      <path d="M396 240 Q410 236 424 240 L424 252 Q410 248 396 252 Z" fill="${SKIN_D}" opacity=".18"/></g>`;
  const goiterThyroid = `<g id="patBocioT">
      <path d="M322 228 C262 236 258 352 318 388 Q368 416 410 400 Q452 416 502 388 C562 352 558 236 498 228 Q410 196 322 228 Z" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="2.6"/>
      <g opacity=".55"><path d="M384 238 C318 228 304 316 334 364 C354 400 388 398 394 356 Q400 300 384 238 Z" fill="#b8605a" stroke="#8d3f3a" stroke-width="2"/>
      <path d="M436 238 C502 228 516 316 486 364 C466 400 432 398 426 356 Q420 300 436 238 Z" fill="#b8605a" stroke="#8d3f3a" stroke-width="2"/>
      <rect x="380" y="232" width="60" height="30" rx="10" fill="#b8605a" stroke="#8d3f3a" stroke-width="2"/></g>
      <text x="410" y="446" text-anchor="middle" class="svg-small">Bocio difuso grado II: visible con el cuello en posición normal</text></g>`;
  const noduleNeck = `<g id="patNodN"><ellipse cx="392" cy="266" rx="16" ry="14" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="2"/><ellipse cx="388" cy="262" rx="6" ry="4" fill="#fff" opacity=".35"/></g>`;
  const noduleThyroid = `<g id="patNodT"><circle cx="360" cy="296" r="20" fill="#d3a28f" stroke="#8d3f3a" stroke-width="2.2"/><circle cx="354" cy="290" r="6" fill="#fff" opacity=".35"/>
      <text x="326" y="340" text-anchor="end" class="svg-small">nódulo 2,5 cm</text></g>`;
  const nodesLymphoma = `<g id="patAden">${[[352, 388, 17, 13], [350, 412, 13, 10], [356, 436, 12, 9], [492, 390, 14, 11], [498, 418, 11, 9], [430, 466, 15, 11], [354, 288, 12, 10]].map(n =>
    `<ellipse cx="${n[0]}" cy="${n[1]}" rx="${n[2]}" ry="${n[3]}" fill="#e9b995" stroke="${SKIN_D}" stroke-width="1.8"/><ellipse cx="${n[0] - 4}" cy="${n[1] - 3}" rx="${n[2] * 0.4}" ry="${n[3] * 0.3}" fill="#fff" opacity=".3"/>`).join('')}</g>`;
  const nodesPharyngitis = `<g id="patAdenAmi"><ellipse cx="354" cy="290" rx="13" ry="11" fill="#e8a98f" stroke="${SKIN_D}" stroke-width="1.8"/><ellipse cx="282" cy="324" rx="9" ry="7" fill="#e8b49a" stroke="${SKIN_D}" stroke-width="1.5"/></g>`;
  function omaTM(side) {
    if (side !== 'D') return '';
    let vessels = '';
    for (let a = 0; a < 360; a += 24) {
      const r = a * Math.PI / 180;
      vessels += `<path d="M${590 + 36 * Math.cos(r)} ${300 + 40 * Math.sin(r)} Q${590 + 80 * Math.cos(r + 0.15)} ${300 + 90 * Math.sin(r + 0.15)} ${590 + 126 * Math.cos(r)} ${300 + 140 * Math.sin(r)}" fill="none" stroke="#7d1d16" stroke-width="1.6" opacity=".75"/>`;
    }
    return `<g id="patOMA">
      <ellipse cx="590" cy="300" rx="134" ry="149" fill="#c8463a" stroke="#8c2a22" stroke-width="7"/>
      <ellipse cx="590" cy="300" rx="110" ry="122" fill="#d4584a"/>
      ${vessels}
      <ellipse cx="556" cy="256" rx="44" ry="30" fill="#e8847a" opacity=".55"/>
      <ellipse cx="548" cy="248" rx="16" ry="10" fill="#fff" opacity=".35"/>
      <rect x="400" y="534" width="380" height="22" fill="#e8eef4"/>
      <text x="590" y="548" text-anchor="middle" class="svg-small">Membrana abombada, hiperémica y opaca: sin cono luminoso ni reparos</text></g>`;
  }
  function papilledema(side) {
    const X = x => fx(side, x), cx = X(450), cy = 248;
    const flame = (x, y, rot) => `<path transform="rotate(${rot} ${x} ${y})" d="M${x} ${y - 10} q6 6 2 20 q-2 -6 -4 -9 q-2 3 -4 9 q-4 -14 6 -20 z" fill="#8d1a10"/>`;
    const vein = (d) => `<path d="${d}" fill="none" stroke="#5e0e0e" stroke-width="9" stroke-linecap="round"/>`;
    return `<g id="patPapil">
      <ellipse cx="${cx}" cy="${cy}" rx="66" ry="70" fill="#e59a6c" opacity=".3"/>
      <ellipse cx="${cx}" cy="${cy}" rx="56" ry="60" fill="#eda87a" opacity=".55"/>
      <ellipse cx="${cx}" cy="${cy}" rx="46" ry="50" fill="#f4b68a" opacity=".9"/>
      <ellipse cx="${cx}" cy="${cy}" rx="34" ry="38" fill="#f8c9a2"/>
      ${vein(`M${cx} ${cy + 6} C${X(456)} 282 ${X(452)} 300 ${X(448)} 322`)}${vein(`M${cx} ${cy - 4} C${X(444)} 220 ${X(446)} 196 ${X(442)} 176`)}
      ${vein(`M${cx} ${cy} C${X(430)} 236 ${X(380)} 200 ${X(344)} 160`)}${vein(`M${cx} ${cy} C${X(430)} 262 ${X(380)} 300 ${X(344)} 350`)}
      ${flame(X(500), 212, 20)}${flame(X(498), 290, -30)}${flame(X(404), 206, -20)}${flame(X(402), 292, 25)}${flame(X(470), 320, 0)}
      <ellipse cx="${X(380)}" cy="210" rx="16" ry="9" fill="#fff7e0" opacity=".85" transform="rotate(-30 ${X(380)} 210)"/>
      <text x="${X(450)}" y="140" text-anchor="middle" class="svg-small" style="paint-order:stroke;stroke:#000;stroke-width:3px;fill:#fff">Disco elevado, bordes borrados, venas ingurgitadas, hemorragias en llama</text></g>`;
  }
  function hypertensiveRetina(side) {
    const X = x => fx(side, x);
    const cotton = (x, y, r) => `<ellipse cx="${x}" cy="${y}" rx="${r * 1.5}" ry="${r}" fill="#fff8e6" opacity=".92" transform="rotate(-20 ${x} ${y})"/><ellipse cx="${x}" cy="${y}" rx="${r * 1.9}" ry="${r * 1.35}" fill="#fff8e6" opacity=".35" transform="rotate(-20 ${x} ${y})"/>`;
    const flame = (x, y, rot) => `<path transform="rotate(${rot} ${x} ${y})" d="M${x} ${y - 9} q5 5 2 18 q-2 -5 -3 -8 q-2 3 -3 8 q-4 -13 4 -18 z" fill="#8d1a10"/>`;
    const nick = (x, y, rot) => `<g transform="rotate(${rot} ${x} ${y})"><rect x="${x - 7}" y="${y - 7}" width="14" height="4" fill="#cf3220"/><path d="M${x - 12} ${y + 5} L${x - 3} ${y + 5} M${x + 3} ${y + 5} L${x + 12} ${y + 5}" stroke="#7a1414" stroke-width="7" stroke-linecap="round"/></g>`;
    const hard = (x, y) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#f6e27a"/>`;
    return `<g id="patRHT">
      ${nick(X(300), 132, -18)}${nick(X(300), 376, 18)}${nick(X(520), 190, 30)}
      ${cotton(X(352), 196, 11)}${cotton(X(290), 356, 9)}${cotton(X(400), 338, 8)}
      ${flame(X(380), 130, 15)}${flame(X(500), 320, -20)}${flame(X(330), 300, 30)}${flame(X(420), 330, -10)}
      ${[[262, 246], [276, 236], [250, 262], [268, 290], [240, 300], [288, 270], [258, 228]].map(p => hard(X(p[0]), p[1])).join('')}
      <path d="M${X(448)} 236 C${X(425)} 150 ${X(300)} 118 ${X(140)} 170" fill="none" stroke="#ffd9b3" stroke-width="1.4" opacity=".9"/>
      <path d="M${X(448)} 250 C${X(425)} 360 ${X(300)} 396 ${X(140)} 346" fill="none" stroke="#ffd9b3" stroke-width="1.4" opacity=".9"/>
      <text x="${X(338)}" y="470" text-anchor="middle" class="svg-small" style="paint-order:stroke;stroke:#000;stroke-width:3px;fill:#fff">Arteriolas estrechas en hilo de cobre, cruces AV patológicos, exudados algodonosos y hemorragias</text></g>`;
  }
  function tonsillitis(up) {
    if (up) return '';
    const tons = (cx, s) => `<ellipse cx="${cx + s * 6}" cy="333" rx="32" ry="46" fill="#d9544e" stroke="#9a2d2a" stroke-width="2"/>
      ${[[-8, -22], [10, -10], [-12, 4], [8, 16], [-4, 28], [14, 30], [-14, -6]].map(p => `<ellipse cx="${cx + s * 6 + p[0]}" cy="${333 + p[1]}" rx="6" ry="4" fill="#fbf4d6" stroke="#d9c89a" stroke-width=".8"/>`).join('')}`;
    return `<g id="patAmig">
      <path d="M275 320 C270 275 335 252 410 252 C485 252 550 275 545 320 C515 292 470 282 410 282 C350 282 305 292 275 320 Z" fill="#c9484d" opacity=".55"/>
      ${tons(322, 1)}${tons(498, -1)}
      <path d="M397 280 Q390 310 402 334 Q410 342 418 334 Q430 310 423 280 Z" fill="#c9484d" stroke="#8f2d31" stroke-width="1.5"/>
      <g fill="#8f1f26" opacity=".8">${[[360, 268], [376, 262], [440, 262], [456, 268], [410, 262], [392, 272], [428, 272]].map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="1.8"/>`).join('')}</g>
      <text x="410" y="246" text-anchor="middle" class="svg-small" style="paint-order:stroke;stroke:#6a262b;stroke-width:3px;fill:#fff">Amígdalas grado III con exudado · pilares y úvula eritematosos</text></g>`;
  }

  /* ------------------------------------------------------------ hallazgos normales breves para el lado sano del oído */
  const EAR_OK = {
    tm: 'Membrana timpánica íntegra, gris perla, brillante y translúcida; sin abombamiento ni retracción.',
    cono: 'Cono luminoso presente en el cuadrante anteroinferior.',
    mango: 'Mango del martillo visible como franja blanco-amarillenta.', umbo: 'Umbo en el centro de la membrana.', corta: 'Apófisis corta del martillo visible.',
    inc: 'Rama larga del yunque apenas visible por transparencia.', flac: 'Pars flaccida sin retracción.', canal: 'Conducto permeable, piel rosada, sin secreción.',
    pneu: 'La membrana se desplaza con la presión positiva y negativa: oído medio aireado.',
    rinne: 'Rinne positivo (CA &gt; CO).', whisper: { html: 'Repite correctamente la voz cuchicheada.', run: ctx => ctx.sh.say('Sí: "tres, nueve, cuatro"', 'yes') }
  };

  /* ================================================================ PACIENTES */
  const PACIENTES = [
    /* 1. Bocio difuso con hipertiroidismo (Graves-Basedow) */
    { id: 'hn1', age: 34, sex: 'F', diag: 'Bocio difuso con hipertiroidismo (enfermedad de Graves-Basedow)',
      complaint: 'Nerviosismo, palpitaciones, pérdida de 6 kg en 3 meses con apetito conservado, intolerancia al calor, sudoración y temblor fino de las manos. Nota el cuello más grueso y "los ojos saltones".',
      vitals: 'FC 108 · PA 138/66 · FR 18 · T 37,2 °C · SpO₂ 98 %',
      v: { hr: 108, sbp: 138, dbp: 66, rr: 18, temp: 37.2, spo2: 98, height: 1.63, weight: 52, waist: 70 },
      overlay: { face: exophthalmos(), neck: goiterNeck },
      dyn: { thyroid: () => goiterThyroid },
      path: {
        'face:frente:look': '<b>Facies hipertiroidea (basedowiana)</b>: expresión de susto o ansiedad, mirada brillante y fija, parpadeo escaso (signo de Stellwag); piel fina, caliente y húmeda; temblor fino de los párpados cerrados.',
        'face:frente:touch': 'Piel <b>caliente, húmeda y fina</b>; temblor fino perceptible al apoyar la mano.',
        'face:cranio:look': 'Cabello fino y quebradizo, con caída difusa.',
        'face:ojoR:look': '<b>Exoftalmos bilateral</b> (protrusión del globo, &gt; 18-20 mm con el exoftalmómetro de Hertel) con <b>retracción del párpado superior</b>: la esclera queda visible por encima del limbo (signo de Dalrymple). Al mirar hacia abajo el párpado superior se retrasa (<b>asinergia oculopalpebral, signo de Graefe</b>); convergencia débil (signo de Moebius).',
        'face:ojoL:look': 'Exoftalmos y retracción palpebral simétricos con el ojo derecho; esclera visible por encima del iris; conjuntiva con inyección leve.',
        'face:lids:look': 'Párpado superior retraído (borde por encima del limbo), edema palpebral leve; parpadeo infrecuente; cierre incompleto al dormir (lagoftalmos leve).',
        'face:cornea:look': 'Córnea transparente, sin queratitis de exposición; esclera visible alrededor del iris por la retracción palpebral y la proptosis.',
        'face:scl:look': 'Esclera blanca, visible por encima del limbo (retracción palpebral); inyección conjuntival leve.',
        'face:conj:look': 'Conjuntiva palpebral rosada; conjuntiva bulbar con hiperemia y quemosis leves.',
        'face:temR:touch': c => `Pulso temporal <b>rápido (${c.v.hr}/min)</b> y amplio.`,
        'face:temL:touch': c => `Pulso temporal izquierdo ${c.v.hr}/min, amplio, igual al derecho.`,
        'mouth:lengua:look': 'Lengua rosada y húmeda, con <b>temblor fino</b> al protruirla.',
        'neck:laring:look': 'Cuello con <b>aumento de volumen difuso y simétrico de la región anterior</b> (bocio) que asciende al deglutir; piel caliente.',
        'neck:tiroR:look': TH('inspección tangencial en posición normal y al deglutir.', '<b>bocio grado II (OMS)</b>: tumefacción pretraqueal difusa visible con el cuello en posición normal, simétrica, que asciende con la deglución.'),
        'neck:tiroR:palp': 'Glándula <b>aumentada de forma difusa</b> (2-3 veces su tamaño), de superficie lisa y consistencia blanda-elástica, indolora, sin nódulos; <b>frémito (thrill)</b> palpable sobre los lóbulos.',
        'neck:carR:palp': c => `Pulso carotídeo <b>rápido (${c.v.hr}/min)</b>, regular, amplio y saltón (presión diferencial aumentada).`,
        'neck:carL:palp': c => `Pulso carotídeo izquierdo ${c.v.hr}/min, amplio, igual al derecho.`,
        'neck:carR:ausc': 'Sin soplo carotídeo propio; en la base del cuello se transmite el soplo tiroideo.',
        'neck:carL:ausc': 'Sin soplo carotídeo; se transmite el soplo tiroideo.',
        'thyroid:cart:look': 'Prominencia laríngea desplazada hacia arriba por la glándula aumentada; asciende con la deglución.',
        'thyroid:lobR:look': '<b>Bocio grado II</b>: lóbulo derecho visible con el cuello en posición normal, de contorno liso; asciende al deglutir.',
        'thyroid:lobL:look': 'Lóbulo izquierdo visible y simétrico con el derecho (bocio difuso grado II).',
        'thyroid:istmo:look': 'Istmo visible como banda pretraqueal que asciende al deglutir.',
        'thyroid:lobR:ant': TH('palpación anterior desplazando la laringe hacia el lado explorado mientras traga.', 'lóbulo derecho <b>aumentado 2-3 veces</b>, liso, de consistencia <b>blanda-elástica</b>, indoloro, <b>sin nódulos</b>; <b>frémito</b> palpable con la yema de los dedos.'),
        'thyroid:lobR:post': 'Desde atrás, con la deglución, el lóbulo derecho se desliza bajo los dedos: grande, liso, elástico, sin nódulos; frémito.',
        'thyroid:lobL:ant': 'Lóbulo izquierdo aumentado, liso, elástico, indoloro y sin nódulos, simétrico con el derecho; frémito.',
        'thyroid:lobL:post': 'Lóbulo izquierdo grande, liso y elástico, sin nódulos; se desliza con la deglución.',
        'thyroid:istmo:ant': 'Istmo <b>engrosado</b> (≈ 2-3 cm), liso y elástico, que asciende con la deglución.',
        'thyroid:istmo:post': 'Istmo engrosado y liso bajo los índices; asciende al tragar.',
        'thyroid:lobR:swallow': 'Toda la glándula aumentada <b>asciende en bloque con la deglución</b>: confirma su origen tiroideo (fijada a la laringe por la fascia pretraqueal).',
        'thyroid:lobL:swallow': 'El lóbulo izquierdo asciende con la deglución junto con el resto de la glándula.',
        'thyroid:istmo:swallow': 'El istmo engrosado asciende 1-2 cm con la deglución.',
        'thyroid:lobR:ausc': { html: TH('campana sobre el lóbulo en apnea breve.', '<b>soplo tiroideo</b> sistólico suave y continuo (con frémito): hipervascularización de la glándula, propia del hipertiroidismo por Graves.'), run: bruit(108) },
        'thyroid:lobL:ausc': { html: 'Soplo tiroideo también audible sobre el lóbulo izquierdo.', run: bruit(108) },
        'thyroid:istmo:ausc': { html: 'Soplo sistólico suave sobre el istmo.', run: bruit(108) }
      },
      findings: ['Bocio difuso grado II (OMS), liso, elástico, con frémito y soplo tiroideo (hipervascularización).', 'Exoftalmos bilateral con retracción palpebral (Dalrymple), asinergia oculopalpebral (Graefe) y parpadeo escaso: oftalmopatía de Graves.',
        'Taquicardia (108/min) con pulso amplio, piel caliente y húmeda, temblor fino: síndrome hipertiroideo.'],
      teaching: ['El bocio se gradúa por inspección y palpación (OMS 0-II): grado II = visible con el cuello en posición normal. Describe tamaño, consistencia, superficie, nódulos, dolor, movilidad con la deglución, frémito y soplo.',
        'El soplo y el frémito tiroideos solo aparecen en glándulas hipervascularizadas (Graves); no se oyen en el bocio simple ni en el nódulo.',
        'La facies basedowiana y el exoftalmos orientan a Graves (autoinmune), mientras que el hipertiroidismo por nódulo tóxico cursa sin oftalmopatía.'],
      quiz: [
        { q: 'El soplo tiroideo con frémito en esta paciente indica', options: ['Compresión traqueal por el bocio', 'Hipervascularización glandular propia de la enfermedad de Graves', 'Soplo carotídeo transmitido', 'Nódulo tóxico'], a: 1, why: 'El soplo y el frémito tiroideos traducen el aumento del flujo sanguíneo glandular característico de Graves-Basedow.' },
        { q: 'Esclera visible por encima del limbo con la mirada al frente (signo de Dalrymple) corresponde a', options: ['Ptosis palpebral', 'Retracción del párpado superior', 'Enoftalmos', 'Ectropión'], a: 1, why: 'La retracción palpebral y el exoftalmos de la oftalmopatía de Graves dejan ver la esclera por encima del iris.' }
      ] },

    /* 2. Nódulo tiroideo */
    { id: 'hn2', age: 52, sex: 'F', diag: 'Nódulo tiroideo solitario del lóbulo derecho',
      complaint: 'Desde hace 4 meses nota un bulto indoloro en la cara anterior del cuello que no ha crecido con rapidez. Sin disfagia, disfonía, ni síntomas de hiper- o hipofunción tiroidea. Antecedente de radioterapia cervical en la infancia.',
      vitals: 'FC 72 · PA 124/78 · FR 14 · T 36,6 °C · SpO₂ 98 %',
      v: { hr: 72, sbp: 124, dbp: 78, rr: 14, temp: 36.6, spo2: 98, height: 1.61, weight: 64, waist: 84 },
      overlay: { neck: noduleNeck },
      dyn: { thyroid: () => noduleThyroid },
      path: {
        'neck:tiroR:look': TH('inspección tangencial, en reposo y al deglutir.', '<b>tumefacción localizada</b> a la derecha de la línea media, de ≈ 2-3 cm, que <b>asciende con la deglución</b>; el resto de la región pretraqueal es plano.'),
        'neck:tiroR:palp': 'Nódulo en el lóbulo derecho: único, de ≈ 2,5 cm, <b>duro-firme</b>, liso, indoloro, móvil con la deglución y no adherido a la piel; sin frémito.',
        'neck:trq:palp': 'Tráquea central; el nódulo no la desplaza.',
        'thyroid:lobR:look': 'Abultamiento localizado en la mitad inferior del lóbulo derecho, visible con el cuello en posición normal, que asciende al deglutir.',
        'thyroid:lobR:ant': TH('palpación anterior desplazando la laringe hacia la derecha mientras la paciente traga.', '<b>nódulo único de ≈ 2,5 cm</b> en el lóbulo derecho, <b>duro-firme</b>, de superficie lisa, <b>indoloro</b>, bien delimitado, <b>móvil con la deglución</b>, no adherido; resto del lóbulo de tamaño y consistencia normales.'),
        'thyroid:lobR:post': 'Desde atrás, al deglutir, el nódulo del lóbulo derecho pasa bajo los dedos: firme, liso, indoloro y bien delimitado.',
        'thyroid:lobR:swallow': 'El nódulo <b>asciende con la deglución</b> junto con la laringe (es tiroideo); no se fija ni queda inmóvil.',
        'thyroid:lobR:ausc': 'Sin soplo ni frémito sobre el nódulo.',
        'thyroid:lobL:ant': 'Lóbulo izquierdo no palpable o apenas palpable, blando, liso y sin nódulos (normal).',
        'thyroid:lobL:post': 'Lóbulo izquierdo normal: no palpable o apenas, sin nódulos.',
        'thyroid:istmo:ant': 'Istmo no palpable o banda fina y lisa, sin nódulos.',
        'nodes:cva:palp': 'Cadena cervical anterior (yugular) <b>sin adenopatías</b>: ganglios no palpables. Dato importante en todo nódulo tiroideo.',
        'nodes:sup:palp': 'Sin ganglios supraclaviculares palpables.'
      },
      findings: ['Nódulo tiroideo solitario de 2,5 cm en el lóbulo derecho: duro-firme, liso, indoloro, móvil con la deglución, sin adenopatías cervicales.',
        'Resto de la glándula normal; sin signos de hiper- ni hipofunción; sin soplo.', 'Factor de riesgo: irradiación cervical en la infancia.'],
      teaching: ['Ante un nódulo tiroideo describe: número, tamaño, consistencia (duro sugiere malignidad), superficie, dolor, movilidad con la deglución, adherencia y adenopatías regionales.',
        'Signos de alarma: consistencia pétrea, fijeza, crecimiento rápido, disfonía (parálisis recurrencial), adenopatías y antecedente de irradiación o edad < 20 o > 60 años.',
        'La movilidad con la deglución distingue las masas tiroideas de las extratiroideas (ganglios, quiste braquial, lipoma).'],
      quiz: [
        { q: 'Un nódulo cervical que asciende con la deglución es, con mayor probabilidad', options: ['Un ganglio yugular', 'Un quiste branquial', 'De origen tiroideo', 'Un lipoma subcutáneo'], a: 2, why: 'La glándula tiroides está fijada a la laringe por la fascia pretraqueal: todo lo tiroideo asciende al deglutir.' },
        { q: 'En esta paciente, el dato de la anamnesis que más aumenta el riesgo de malignidad del nódulo es', options: ['El sexo femenino', 'La radioterapia cervical en la infancia', 'La ausencia de dolor', 'La edad de 52 años'], a: 1, why: 'La irradiación cervical previa es un factor de riesgo reconocido de carcinoma tiroideo; también lo son la consistencia dura, la fijeza, el crecimiento rápido y las adenopatías.' }
      ] },

    /* 3. Adenopatías cervicales múltiples (linfoma) */
    { id: 'hn3', age: 26, sex: 'M', diag: 'Síndrome adenomegálico: adenopatías cervicales múltiples (linfoma)',
      complaint: 'Desde hace 2 meses nota "bolitas" en el lado izquierdo del cuello que crecen con lentitud y no duelen. Fiebre vespertina, sudoración nocturna profusa, pérdida de 7 kg y prurito generalizado. Cansancio.',
      vitals: 'FC 92 · PA 110/70 · FR 16 · T 37,9 °C · SpO₂ 97 %',
      v: { hr: 92, sbp: 110, dbp: 70, rr: 16, temp: 37.9, spo2: 97, height: 1.78, weight: 64, waist: 78 },
      overlay: { nodes: nodesLymphoma },
      path: {
        'face:frente:look': 'Facies <b>pálida</b> y adelgazada; expresión de cansancio.',
        'face:conj:look': TH('se desciende el párpado inferior mientras mira hacia arriba.', 'conjuntiva palpebral <b>pálida</b> (anemia de la enfermedad crónica o por infiltración medular); sin secreción.'),
        'face:scl:look': 'Esclera blanca, sin ictericia.',
        'face:ojoR:look': 'Conjuntivas pálidas; escleras blancas; pupilas normales.',
        'face:ojoL:look': 'Conjuntivas pálidas, simétricas; sin ictericia.',
        'nodes:cva:look': 'Tumefacción visible en la región laterocervical izquierda, a lo largo del borde anterior del esternocleidomastoideo; piel normal.',
        'nodes:cva:palp': TH('palpación en círculos con las yemas de 2-3 dedos, comparando ambos lados.', '<b>múltiples ganglios</b> (3-4) de <b>2-4 cm</b> en la cadena yugular izquierda, de consistencia <b>elástica (gomosa)</b>, <b>indoloros</b>, lisos, <b>móviles</b> y no adheridos a la piel ni a planos profundos, dispuestos "en rosario".'),
        'nodes:cvp:look': 'Abultamientos en el triángulo posterior izquierdo.',
        'nodes:cvp:palp': 'Dos ganglios de 1,5-3 cm en la cadena espinal izquierda: elásticos, indoloros, móviles; ninguno del lado derecho.',
        'nodes:sup:look': 'Fosa supraclavicular izquierda <b>ocupada</b> (abultada).',
        'nodes:sup:palp': '<b>Ganglio supraclavicular izquierdo de 2 cm</b>, elástico, indoloro y móvil. Un ganglio supraclavicular palpable <b>siempre es patológico</b>: obliga a buscar enfermedad torácica, abdominal o hematológica.',
        'nodes:ami:palp': 'Ganglio yugulodigástrico izquierdo de 1,5 cm, elástico, indoloro y móvil.',
        'nodes:sbm:palp': 'Ganglios submaxilares no palpables o < 1 cm, blandos (normal).',
        'neck:ecmL:look': 'Relieve del esternocleidomastoideo izquierdo borrado por las adenopatías subyacentes.',
        'neck:ecmL:palp': 'Músculo blando; por detrás y a lo largo de su borde se palpan los ganglios aumentados, no adheridos al músculo.'
      },
      findings: ['Adenopatías cervicales múltiples izquierdas (yugulares, espinales, yugulodigástrica y supraclavicular) de 1,5-4 cm: elásticas, indoloras, móviles, no adheridas.',
        'Síntomas B (fiebre, sudoración nocturna, pérdida de peso > 10 %) y prurito; conjuntivas pálidas (anemia).', 'Ganglio supraclavicular palpable: siempre patológico.'],
      teaching: ['Semiología del ganglio: tamaño, consistencia, sensibilidad, movilidad (adherencia a piel o planos profundos), número y agrupación, y piel suprayacente. Linfoma: elásticos (gomosos), indoloros, móviles, múltiples.',
        'Contraste: la adenopatía metastásica es dura (pétrea), fija y adherida, a menudo única; la infecciosa es dolorosa, blanda, caliente, con piel eritematosa y evoluciona en días.',
        'Ganglio supraclavicular izquierdo (de Virchow): drena el conducto torácico y sugiere neoplasia abdominal; el derecho, patología de mediastino, pulmón o esófago. Completa siempre con las demás cadenas (axilares, inguinales) y la palpación de bazo e hígado.'],
      quiz: [
        { q: 'La consistencia elástica (gomosa), indolora y móvil de múltiples ganglios orienta a', options: ['Metástasis de carcinoma', 'Adenitis bacteriana aguda', 'Linfoma', 'Tuberculosis ganglionar con fistulización'], a: 2, why: 'Los ganglios del linfoma son elásticos, indoloros y móviles; los metastásicos, duros y fijos; los infecciosos agudos, dolorosos y calientes.' },
        { q: 'Conjuntivas palpebrales pálidas en este paciente sugieren', options: ['Ictericia', 'Anemia', 'Conjuntivitis', 'Cianosis'], a: 1, why: 'La palidez de conjuntivas, mucosas y lechos ungueales es el signo clínico de la anemia; la ictericia se busca en la esclera.' }
      ] },

    /* 4. Otitis media aguda derecha */
    { id: 'hn4', age: 24, sex: 'M', diag: 'Otitis media aguda derecha (hipoacusia de conducción)',
      complaint: 'Otalgia derecha intensa y pulsátil desde hace 2 días, tras un resfrío; sensación de oído tapado y oye menos de ese lado; fiebre. Sin otorrea ni vértigo.',
      vitals: 'FC 96 · PA 118/74 · FR 16 · T 38,3 °C · SpO₂ 98 %',
      v: { hr: 96, sbp: 118, dbp: 74, rr: 16, temp: 38.3, spo2: 98, height: 1.75, weight: 72, waist: 84 },
      dyn: { ear: ({ side }) => omaTM(side) },
      path: {
        'ear:tm:oto': bySide(TH('otoscopio con tracción del pabellón hacia atrás y arriba.', '<b>membrana timpánica abombada</b> hacia el conducto, <b>hiperémica (roja)</b>, opaca y engrosada, con vasos radiados; los reparos (mango del martillo, apófisis corta, cono luminoso) están <b>borrados</b>. Sin perforación ni otorrea.'), EAR_OK.tm),
        'ear:cono:oto': bySide('<b>Cono luminoso ausente</b>: la membrana abombada y opaca no refleja la luz.', EAR_OK.cono),
        'ear:mango:oto': bySide('Mango del martillo <b>no identificable</b> por el abombamiento y la opacidad de la membrana.', EAR_OK.mango),
        'ear:umbo:oto': bySide('Umbo no reconocible; la membrana protruye hacia el examinador.', EAR_OK.umbo),
        'ear:corta:oto': bySide('Apófisis corta del martillo no visible (reparos borrados).', EAR_OK.corta),
        'ear:inc:oto': bySide('Yunque no visible: la membrana es opaca.', EAR_OK.inc),
        'ear:flac:oto': bySide('Pars flaccida hiperémica y abombada.', EAR_OK.flac),
        'ear:canal:oto': bySide('Conducto auditivo externo permeable, de piel normal, <b>sin otorrea</b> (membrana íntegra) ni edema (no es otitis externa).', EAR_OK.canal),
        'ear:tm:pneu': bySide(TH('otoscopia neumática con espéculo que selle el conducto.', 'membrana <b>inmóvil</b> con la presión positiva y negativa: derrame en el oído medio.'), EAR_OK.pneu),
        'ear:vertex:fork': { html: TH('<b>Weber</b>: diapasón de 512 Hz vibrando sobre el vértex.', 'el sonido <b>lateraliza al oído derecho (el enfermo)</b>: en la hipoacusia de conducción el oído afectado, al no recibir el ruido ambiental, percibe mejor la vibración ósea.'), run: fork },
        'ear:mast:fork': { html: bySide(TH('<b>Rinne</b>: pie del diapasón sobre la mastoides derecha hasta dejar de oírlo y luego ramas frente al meato.', 'ya no lo oye por vía aérea: <b>Rinne negativo (CO &gt; CA)</b> en el oído derecho, propio de la hipoacusia de conducción.'), 'Rinne <b>positivo</b> en el oído izquierdo (CA &gt; CO): normal.'), run: fork },
        'ear:meato:fork': { html: bySide('Vía aérea derecha más breve y débil que la ósea: <b>Rinne negativo</b> (hipoacusia de conducción).', 'Conducción aérea izquierda más prolongada que la ósea: Rinne positivo (normal).'), run: fork },
        'ear:meato:whisper': bySide({ html: 'No repite la voz cuchicheada con el oído derecho (hipoacusia de ese lado).', run: ctx => ctx.sh.say('¿Cómo? No le escucho por este oído…', 'no') }, EAR_OK.whisper),
        'ear:tragus:pull': bySide('Presión sobre el trago <b>indolora</b>: el dolor no aumenta (en la otitis externa sí dolería).', 'Presión del trago indolora.'),
        'ear:helix:pull': bySide('Tracción del pabellón <b>indolora</b> (el dolor de la otitis media no se modifica con la tracción).', 'Tracción indolora.'),
        'ear:mast:look': bySide('Región mastoidea sin eritema ni edema; pliegue retroauricular conservado (sin mastoiditis).', 'Mastoides normal.'),
        'ear:mast:pull': bySide('Presión mastoidea <b>indolora</b>: sin mastoiditis.', 'Indolora.'),
        'ear:helix:look': 'Pabellones de implantación y forma normales, sin lesiones.'
      },
      findings: ['Otoscopia derecha: membrana abombada, hiperémica, opaca, con reparos borrados y sin cono luminoso; inmóvil con la otoscopia neumática.',
        'Weber lateraliza al oído derecho y Rinne negativo en ese oído: hipoacusia de conducción derecha.', 'Tracción del pabellón y presión del trago indoloras (descarta otitis externa); mastoides normal.'],
      teaching: ['Hipoacusia de conducción: Weber lateraliza al oído enfermo y Rinne es negativo (CO > CA) en ese oído. Hipoacusia neurosensorial: Weber lateraliza al oído sano y Rinne es positivo en ambos.',
        'Describe la membrana por cuadrantes: color, brillo, posición (abombada, retraída), integridad, reparos y cono luminoso. La otoscopia neumática confirma el derrame (inmovilidad).',
        'El dolor con la tracción del pabellón o la presión del trago orienta a otitis externa; en la otitis media aguda el dolor no se modifica.'],
      quiz: [
        { q: 'Membrana abombada, hiperémica, sin cono luminoso e inmóvil con la otoscopia neumática indica', options: ['Otitis externa', 'Otitis media aguda con derrame', 'Tapón de cerumen', 'Perforación timpánica'], a: 1, why: 'El abombamiento con hiperemia y la inmovilidad traducen contenido purulento a tensión en el oído medio.' },
        { q: 'La presión sobre el trago fue indolora en este paciente. Esto', options: ['Confirma la mastoiditis', 'Descarta la otitis media', 'Orienta a que no se trata de otitis externa', 'Indica perforación'], a: 2, why: 'El signo del trago (dolor a la presión) es propio de la otitis externa; en la otitis media aguda la tracción del pabellón y la presión del trago no duelen.' }
      ] },

    /* 5. Hipoacusia neurosensorial izquierda */
    { id: 'hn5', age: 58, sex: 'M', diag: 'Hipoacusia neurosensorial (de percepción) izquierda',
      complaint: 'Hace 3 días, al despertar, notó que no oía bien por el oído izquierdo, con acúfeno agudo continuo y leve sensación de inestabilidad. Sin otalgia, fiebre, otorrea ni traumatismo.',
      vitals: 'FC 72 · PA 134/82 · FR 14 · T 36,5 °C · SpO₂ 97 %',
      v: { hr: 72, sbp: 134, dbp: 82, rr: 14, temp: 36.5, spo2: 97, height: 1.72, weight: 80, waist: 96 },
      path: {
        'ear:tm:oto': 'Membrana timpánica íntegra, gris perla, brillante y en posición normal en <b>ambos oídos</b>: la otoscopia es normal (la lesión está en el oído interno o en el nervio).',
        'ear:canal:oto': 'Conducto permeable, sin cerumen obstructivo ni secreción.',
        'ear:vertex:fork': { html: TH('<b>Weber</b>: diapasón sobre el vértex.', 'el sonido <b>lateraliza al oído derecho (el sano)</b>: en la hipoacusia neurosensorial el oído enfermo percibe peor la vibración, tanto aérea como ósea.'), run: fork },
        'ear:mast:fork': { html: bySide('Rinne <b>positivo</b> en el oído derecho (CA &gt; CO), con duración normal: oído sano.', TH('<b>Rinne</b> en el oído izquierdo.', 'vuelve a oírlo frente al meato: <b>Rinne positivo (CA &gt; CO)</b>, pero ambas conducciones están <b>acortadas</b>: patrón de hipoacusia neurosensorial (de percepción).')), run: fork },
        'ear:meato:fork': { html: bySide('Conducción aérea derecha normal, más prolongada que la ósea (Rinne positivo).', 'Conducción aérea izquierda disminuida pero todavía mayor que la ósea: Rinne positivo con hipoacusia (neurosensorial).'), run: fork },
        'ear:meato:whisper': bySide(EAR_OK.whisper, { html: 'Con el oído izquierdo <b>no repite</b> la voz cuchicheada ni la voz baja; solo entiende la voz alta.', run: ctx => ctx.sh.say('Por este lado no entiendo…', 'no') }),
        'ear:helix:pull': 'Tracción del pabellón y presión del trago indoloras.',
        'ear:tragus:pull': 'Indolora.',
        'ear:mast:pull': 'Indolora.'
      },
      findings: ['Otoscopia normal bilateral.', 'Weber lateraliza al oído derecho (sano) y Rinne positivo en ambos oídos, con conducciones acortadas a la izquierda: hipoacusia neurosensorial izquierda.',
        'Voz cuchicheada no percibida por el oído izquierdo; acúfeno. Hipoacusia súbita: urgencia otológica.'],
      teaching: ['Weber al oído sano + Rinne positivo en el enfermo = hipoacusia neurosensorial; Weber al enfermo + Rinne negativo = hipoacusia de conducción. Interpreta siempre ambas pruebas juntas.',
        'En la hipoacusia neurosensorial grave puede verse un "falso Rinne negativo": la vibración ósea se percibe por el oído contralateral sano; se evita enmascarando el oído sano.',
        'Una hipoacusia neurosensorial súbita unilateral requiere audiometría y tratamiento precoz; si es progresiva con acúfeno e inestabilidad hay que descartar un neurinoma del acústico.'],
      quiz: [
        { q: 'Weber que lateraliza al oído sano con Rinne positivo bilateral corresponde a', options: ['Hipoacusia de conducción del oído sano', 'Hipoacusia neurosensorial del oído enfermo', 'Audición normal', 'Tapón de cerumen'], a: 1, why: 'En la hipoacusia de percepción el oído afectado oye peor por ambas vías; la vibración del vértex se percibe mejor en el sano.' },
        { q: 'La otoscopia normal en este paciente indica que la lesión está', options: ['En el conducto auditivo externo', 'En el oído medio', 'En el oído interno o la vía nerviosa', 'En el pabellón'], a: 2, why: 'Con membrana y oído medio normales, una hipoacusia con patrón neurosensorial localiza la lesión en la cóclea o el nervio auditivo.' }
      ] },

    /* 6. Faringoamigdalitis aguda */
    { id: 'hn6', age: 19, sex: 'F', diag: 'Faringoamigdalitis aguda exudativa (estreptocócica)',
      complaint: 'Odinofagia intensa de 2 días, fiebre de 39 °C con escalofríos y cefalea; dificultad para tragar sólidos. Sin tos, rinorrea ni ronquera.',
      vitals: 'FC 104 · PA 112/70 · FR 18 · T 38,9 °C · SpO₂ 98 %',
      v: { hr: 104, sbp: 112, dbp: 70, rr: 18, temp: 38.9, spo2: 98, height: 1.66, weight: 58, waist: 72 },
      overlay: { nodes: nodesPharyngitis },
      dyn: { mouth: ({ up }) => tonsillitis(up) },
      path: {
        'face:frente:look': 'Facies febril: rubor malar, ojos brillantes; expresión de malestar.',
        'face:frente:touch': 'Piel caliente y algo sudorosa.',
        'mouth:orof:look': '<b>Fauces hiperémicas</b>: amígdalas hipertróficas con exudado, pilares y úvula enrojecidos; pared posterior congestiva.',
        'mouth:orof:depress': TH('depresor sobre los dos tercios anteriores de la lengua, con buena luz.', 'amígdalas <b>hipertróficas grado III</b> (sobrepasan los pilares y se acercan a la línea media), intensamente <b>eritematosas</b>, con <b>exudado blanco-amarillento</b> en las criptas; pilares y úvula edematosos y rojos.'),
        'mouth:orof:mall': 'Boca abierta y lengua afuera: se ven paladar blando y úvula (Mallampati II), con amígdalas aumentadas que estrechan las fauces.',
        'mouth:orof:say': { html: 'Al decir "ah" el velo se eleva de forma simétrica y la úvula, aunque edematosa, se mantiene <b>en la línea media</b> (sin absceso periamigdalino).', run: ctx => ctx.sh.say('Aaah… (duele)', 'no', 1800) },
        'mouth:amiR:look': '<b>Amígdala derecha grado III</b>: sobrepasa los pilares, roja, con <b>exudado blanquecino</b> en las criptas; sin ulceración ni membrana adherente.',
        'mouth:amiL:look': 'Amígdala izquierda hipertrófica y eritematosa, con exudado puntiforme en las criptas; simétrica con la derecha.',
        'mouth:amiR:depress': 'Con el depresor se confirma la hipertrofia (grado III) y el exudado cripto-amigdalino bilateral.',
        'mouth:amiL:depress': 'Exudado en criptas de la amígdala izquierda; sin abombamiento del pilar (sin absceso).',
        'mouth:pilR:look': 'Pilares anterior y posterior derechos <b>eritematosos</b> y edematosos; no abombados ni desplazados.',
        'mouth:pilL:look': 'Pilares izquierdos enrojecidos, simétricos con los derechos.',
        'mouth:uvula:look': 'Úvula <b>edematosa y eritematosa</b>, en la línea media (no desviada: sin absceso periamigdalino).',
        'mouth:pb:look': 'Paladar blando con <b>enantema</b> y <b>petequias</b> en la unión con el paladar duro (sugieren etiología estreptocócica).',
        'mouth:pared:look': 'Pared posterior de la faringe hiperémica, con folículos prominentes; sin secreción retronasal.',
        'mouth:lengua:look': 'Lengua saburral (capa blanquecina gruesa); papilas fungiformes prominentes y rojas.',
        'mouth:labS:smell': { html: '<b>Halitosis</b> (fetidez) por el exudado amigdalino.', run: ctx => ctx.sh.say('(aliento fétido)', 'no', 1600) },
        'mouth:labS:look': 'Labios secos y algo fisurados por la fiebre y la boca abierta.',
        'nodes:ami:look': 'Leve tumefacción bajo el ángulo de la mandíbula en ambos lados.',
        'nodes:ami:palp': TH('palpación bajo el ángulo de la mandíbula, con el cuello relajado.', '<b>adenopatías yugulodigástricas bilaterales de 1,5-2 cm</b>, <b>dolorosas</b>, de consistencia blanda-firme, móviles, sin fluctuación; piel normal: adenitis reactiva (drenan las amígdalas).'),
        'nodes:sbm:palp': 'Ganglios submaxilares de ≈ 1 cm, algo dolorosos, móviles.',
        'nodes:cva:palp': 'Cadena yugular con algún ganglio pequeño (< 1 cm) ligeramente sensible; sin adenopatías supraclaviculares.'
      },
      findings: ['Amígdalas hipertróficas grado III, eritematosas, con exudado en criptas; pilares y úvula edematosos y rojos (úvula centrada); petequias en el paladar blando.',
        'Adenopatías yugulodigástricas bilaterales dolorosas (adenitis reactiva).', 'Fiebre de 38,9 °C sin tos ni rinorrea: criterios de Centor completos (fiebre, exudado, adenopatías dolorosas, ausencia de tos).'],
      teaching: ['Gradúa el tamaño amigdalino (Brodsky 0-IV) y describe color, exudado (puntiforme, en placas, membrana adherente), simetría y pilares. Las petequias del paladar y la adenitis dolorosa orientan a estreptococo.',
        'La desviación de la úvula con abombamiento del pilar anterior y trismo indica absceso periamigdalino: siempre comprueba que la úvula esté centrada.',
        'Las adenopatías infecciosas son dolorosas, blandas o firmes, móviles y de evolución aguda, a diferencia de las del linfoma (elásticas, indoloras) o metastásicas (duras, fijas).'],
      quiz: [
        { q: 'La úvula edematosa pero centrada en esta paciente permite', options: ['Confirmar mononucleosis', 'Descartar razonablemente un absceso periamigdalino', 'Diagnosticar difteria', 'Afirmar etiología viral'], a: 1, why: 'El absceso periamigdalino desvía la úvula hacia el lado sano y abomba el pilar anterior, con trismo.' },
        { q: 'Las adenopatías yugulodigástricas dolorosas drenan principalmente', options: ['El cuero cabelludo', 'La tiroides', 'Las amígdalas y la faringe', 'El mediastino'], a: 2, why: 'La cadena amigdalina (yugulodigástrica), bajo el ángulo de la mandíbula, recibe el drenaje de amígdalas, base de la lengua y faringe.' }
      ] },

    /* 7. Hipertensión endocraneana: papiledema */
    { id: 'hn7', age: 29, sex: 'F', diag: 'Síndrome de hipertensión endocraneana: papiledema bilateral',
      complaint: 'Cefalea holocraneana progresiva de 6 semanas, peor al despertar y con los esfuerzos, con náuseas y vómitos matutinos; episodios de oscurecimiento visual de segundos al incorporarse y diplopía horizontal. Obesidad.',
      vitals: 'FC 64 · PA 128/82 · FR 14 · T 36,6 °C · SpO₂ 98 %',
      v: { hr: 64, sbp: 128, dbp: 82, rr: 14, temp: 36.6, spo2: 98, height: 1.62, weight: 94, waist: 104 },
      dyn: { fundus: ({ side }) => papilledema(side) },
      path: {
        'fundus:disco': (c, ctx) => `<b>Papiledema (${eyeSide(ctx)})</b>: disco óptico <b>elevado</b>, <b>hiperémico</b>, con <b>bordes borrados</b> (primero el nasal y el superior) y borramiento de la excavación; los vasos parecen "trepar" por el disco y se ocultan en su borde.`,
        'fundus:copa': 'Excavación fisiológica <b>obliterada</b> por el edema del disco.',
        'fundus:vena': '<b>Venas ingurgitadas y tortuosas</b>; <b>ausencia de pulso venoso espontáneo</b> en la papila (desaparece cuando la presión intracraneal supera ≈ 200 mm H₂O).',
        'fundus:art': 'Arteriolas de calibre normal o algo estrechas; <b>hemorragias en llama</b> peripapilares (capa de fibras nerviosas).',
        'fundus:retina': 'Retina peripapilar con exudados algodonosos y pliegues concéntricos (líneas de Paton); periferia normal.',
        'fundus:macula': 'Mácula sin edema ni exudados en estrella (aparecen en etapas avanzadas).',
        'fundus:fovea': 'Reflejo foveal conservado: la agudeza visual central se mantiene al inicio.',
        'face:ojoR:snellen': { html: 'Agudeza visual <b>20/20</b> en ambos ojos (en el papiledema la visión central se conserva hasta fases tardías; aumenta la mancha ciega).', run: ctx => ctx.sh.say('Leo toda la línea… pero a veces se me oscurece la vista', 'no') },
        'face:ojoL:snellen': { html: 'Agudeza visual 20/20; campimetría por confrontación con aumento de la mancha ciega.', run: ctx => ctx.sh.say('20/20', 'yes') },
        'face:ojoL:look': 'Ojo izquierdo: <b>limitación de la abducción</b> (paresia del VI par, signo de falsa localización por la hipertensión endocraneana) que explica la diplopía horizontal; pupila normal.',
        'face:ojoR:look': 'Ojo derecho de aspecto normal; abducción conservada; pupila isocórica y reactiva.',
        'face:pupila:look': 'Pupilas isocóricas de 3 mm, reactivas: el papiledema no altera los reflejos pupilares al inicio.',
        'face:frente:look': 'Facies de dolor; obesidad; sin edema palpebral.',
        'neck:carR:palp': c => `Pulso carotídeo regular, ${c.v.hr}/min (bradicardia relativa).`
      },
      findings: ['Fondo de ojo bilateral: disco elevado e hiperémico con bordes borrados, excavación obliterada, venas ingurgitadas sin pulso venoso espontáneo, hemorragias en llama peripapilares.',
        'Cefalea matutina con vómitos, oscurecimientos visuales transitorios y paresia del VI par izquierdo: síndrome de hipertensión endocraneana.', 'Agudeza visual y reflejos pupilares conservados.'],
      teaching: ['El papiledema es el edema del disco óptico por hipertensión intracraneal: siempre bilateral (puede ser asimétrico), con agudeza visual inicialmente conservada; la neuritis óptica, en cambio, es unilateral, dolorosa y con pérdida visual.',
        'Explora el disco siguiendo un vaso hacia la papila; evalúa borde, color, excavación, pulso venoso y hemorragias. La presencia de pulso venoso espontáneo hace improbable la hipertensión intracraneal.',
        'Ante papiledema: neuroimagen urgente antes de la punción lumbar; la paresia del VI par es un signo de falsa localización.'],
      quiz: [
        { q: 'La ausencia de pulso venoso espontáneo en la papila con bordes borrados sugiere', options: ['Glaucoma', 'Oclusión de la arteria central', 'Hipertensión intracraneal', 'Retinopatía diabética'], a: 2, why: 'El pulso venoso desaparece cuando la presión del líquido cefalorraquídeo supera la venosa intraocular; junto al disco elevado y borrado define el papiledema.' },
        { q: 'A diferencia de la neuritis óptica, el papiledema por hipertensión endocraneana', options: ['Es unilateral y doloroso', 'Conserva inicialmente la agudeza visual y es bilateral', 'Produce defecto pupilar aferente marcado', 'Cursa con disco pálido'], a: 1, why: 'El papiledema es bilateral, indoloro y respeta la visión central al inicio; la neuritis óptica da pérdida visual aguda, dolor con los movimientos oculares y defecto pupilar aferente.' }
      ] },

    /* 8. Retinopatía hipertensiva */
    { id: 'hn8', age: 61, sex: 'M', diag: 'Retinopatía hipertensiva (grado III de Keith-Wagener-Barker)',
      complaint: 'Hipertenso de larga data con mal cumplimiento del tratamiento. Cefalea occipital matutina y visión borrosa intermitente en las últimas semanas. Fumador.',
      vitals: 'FC 78 · PA 192/112 · FR 16 · T 36,5 °C · SpO₂ 97 %',
      v: { hr: 78, sbp: 192, dbp: 112, rr: 16, temp: 36.5, spo2: 97, height: 1.70, weight: 86, waist: 102 },
      dyn: { fundus: ({ side }) => hypertensiveRetina(side) },
      path: {
        'fundus:art': '<b>Arteriolas estrechadas</b> de forma difusa y focal (espasmos), con <b>reflejo luminoso aumentado</b> ("hilo de cobre"; "hilo de plata" en la esclerosis avanzada); relación arteria : vena ≈ <b>1 : 3</b>. En los <b>cruces arteriovenosos</b> la vena se afina y parece interrumpirse bajo la arteria (<b>signo de Gunn</b>) o se desvía en bayoneta (signo de Salus).',
        'fundus:vena': 'Vénulas de calibre irregular, dilatadas distalmente a los cruces patológicos; pulso venoso espontáneo presente.',
        'fundus:retina': '<b>Exudados algodonosos</b> (infartos de la capa de fibras nerviosas: manchas blancas de bordes difusos) y <b>hemorragias en llama</b> peripapilares; <b>exudados duros</b> (depósitos lipídicos amarillos, brillantes, de bordes netos).',
        'fundus:macula': 'Exudados duros alrededor de la mácula, con disposición radial incipiente (estrella macular).',
        'fundus:fovea': 'Reflejo foveal atenuado por el edema macular incipiente.',
        'fundus:disco': 'Disco óptico de <b>bordes nítidos</b>, rosado, <b>sin edema</b>: grado III de Keith-Wagener-Barker (con papiledema sería grado IV, hipertensión maligna).',
        'fundus:copa': 'Excavación fisiológica conservada (relación ≈ 0,3).',
        'face:temR:look': 'Arterias temporales <b>visibles y tortuosas</b> en ambas sienes.',
        'face:temR:touch': c => `Pulso temporal ${c.v.hr}/min, de pared <b>dura y tortuosa</b> (arterioesclerosis), indolora.`,
        'face:temL:touch': 'Pulso temporal izquierdo similar: pared endurecida, indolora.',
        'face:frente:look': 'Facies pletórica (rubicunda); sin edema.',
        'neck:carR:palp': c => `Pulso carotídeo ${c.v.hr}/min, regular, <b>amplio</b> (hipertensión).`,
        'neck:carR:ausc': 'Sin soplo carotídeo (la auscultación es obligada en el hipertenso arterioesclerótico).',
        'neck:carL:ausc': 'Sin soplo carotídeo izquierdo.'
      },
      findings: ['Fondo de ojo: arteriolas estrechas con reflejo en hilo de cobre, relación A:V 1:3, cruces AV patológicos (Gunn, Salus), exudados algodonosos, hemorragias en llama y exudados duros; disco de bordes nítidos.',
        'PA 192/112 mm Hg; arterias temporales tortuosas y de pared dura.', 'Retinopatía hipertensiva grado III (sin papiledema).'],
      teaching: ['Clasificación de Keith-Wagener-Barker: I estrechamiento arteriolar; II cruces AV patológicos e hilo de cobre/plata; III hemorragias y exudados; IV papiledema (hipertensión maligna).',
        'Las arteriolas se evalúan por calibre (A:V normal 2:3), reflejo luminoso y cruces; los exudados algodonosos son infartos isquémicos de fibras, y los duros, depósitos lipídicos.',
        'La retinopatía diabética, en cambio, muestra microaneurismas (puntos rojos), hemorragias puntiformes, exudados duros y, si es proliferativa, neovasos; a menudo coexisten en el mismo paciente.'],
      quiz: [
        { q: 'El afinamiento y la aparente interrupción de la vena al cruzar bajo la arteria (signo de Gunn) corresponde a', options: ['Papiledema', 'Cruce arteriovenoso patológico de la retinopatía hipertensiva', 'Oclusión de rama venosa', 'Microaneurisma diabético'], a: 1, why: 'La arteriola engrosada comprime la vena en el cruce: signo de Gunn; la desviación en bayoneta es el signo de Salus.' },
        { q: 'Con hemorragias y exudados sin edema de papila, la retinopatía hipertensiva es de grado', options: ['I', 'II', 'III', 'IV'], a: 2, why: 'Grado III: hemorragias y exudados; el grado IV añade papiledema (hipertensión maligna).' }
      ] }
  ];

  /* preguntas comunes (se añaden a las 2 propias de cada paciente: cuestionario de 6) */
  const COMMON = [
    { q: 'Weber que lateraliza al oído enfermo con Rinne negativo en ese oído indica', options: ['Hipoacusia neurosensorial', 'Hipoacusia de conducción', 'Audición normal', 'Lesión del nervio facial'], a: 1,
      why: 'En la hipoacusia de conducción el oído afectado percibe mejor la vibración ósea (Weber hacia él) y la conducción ósea supera a la aérea (Rinne negativo).' },
    { q: 'Un bocio visible con el cuello en posición normal es, según la OMS, de grado', options: ['0', 'I', 'II', 'III'], a: 2,
      why: 'Grado 0: no palpable ni visible; I: palpable pero no visible en posición normal; II: visible con el cuello en posición normal.' },
    { q: 'Un ganglio supraclavicular izquierdo duro y fijo (ganglio de Virchow) obliga a buscar', options: ['Faringoamigdalitis', 'Neoplasia abdominal (gástrica) por drenaje del conducto torácico', 'Otitis media', 'Tiroiditis'], a: 1,
      why: 'El ganglio supraclavicular es siempre patológico; el izquierdo recibe el conducto torácico (vísceras abdominales) y el derecho drena mediastino, pulmón y esófago.' },
    { q: 'Disco óptico elevado, de bordes borrados, con venas ingurgitadas y sin pulso venoso espontáneo corresponde a', options: ['Atrofia óptica', 'Papiledema', 'Excavación glaucomatosa', 'Retinopatía diabética'], a: 1,
      why: 'Es el cuadro del papiledema por hipertensión intracraneal; la atrofia óptica da un disco pálido de bordes netos y el glaucoma, excavación aumentada.' }
  ];
  const quizFor = c => (c.quiz || []).concat(COMMON);

  /* ------------------------------------------------------------ escenas heredadas con dibujo dinámico por paciente
     Object.create conserva los getters de regiones (oído, boca) y los ganchos `after`; solo se envuelve `svg`. */
  const scenes = NormalEngine.defs.headneck.scenes.map(sc => {
    const s = Object.create(sc);
    s.svg = (learn, c) => {
      const base = sc.svg ? sc.svg(learn, c) : '';
      const d = c && c.dyn && c.dyn[sc.id];
      if (!d) return base;
      const side = /Oído izquierdo/.test(base) ? 'I' : /\(OI\)/.test(base) ? 'OI' : (sc.id === 'fundus' ? 'OD' : 'D');
      const up = sc.id === 'mouth' && !/id="hnTg"/.test(base);
      return base + (d({ side, up, learn, c }) || '');
    };
    return s;
  });

  NormalEngine.build({
    base: 'headneck', id: 'pat-headneck', title: 'Cabeza y cuello: hallazgos patológicos', icon: '👤', group: 'Exploración patológica', hideDx: false,
    desc: 'Ocho pacientes con bocio hipertiroideo, nódulo tiroideo, adenopatías (linfoma), otitis media aguda, hipoacusia neurosensorial, faringoamigdalitis, papiledema y retinopatía hipertensiva. Explora con los mismos instrumentos, compara con lo normal y elige el diagnóstico.',
    bullets: ['Bocio difuso con soplo, exoftalmos y nódulo tiroideo', 'Adenopatías: linfoma frente a infecciosas y metastásicas', 'Otoscopia y diapasón: conducción frente a neurosensorial', 'Fondo de ojo: papiledema y retinopatía hipertensiva'],
    people: PACIENTES, scenes,
    teaching: ['Compara cada hallazgo con el normal del módulo «Cabeza y cuello (normal)»: la semiología patológica se describe con los mismos parámetros (tamaño, consistencia, color, movilidad, simetría).',
      'Rinne y Weber se interpretan juntos: conducción (Weber al enfermo, Rinne negativo) frente a neurosensorial (Weber al sano, Rinne positivo).',
      'En el fondo de ojo distingue el disco (bordes, color, excavación, pulso venoso), los vasos (calibre, reflejo, cruces) y la retina (hemorragias, exudados).'],
    quiz: quizFor
  });
})();
