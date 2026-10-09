/* Módulo patológico: aparato respiratorio (síndromes). Hereda las escenas de mod-resp.js (base 'resp').
   Ocho pacientes con los grandes síndromes de Argente-Álvarez: condensación, derrame pleural, neumotórax, atelectasia,
   obstrucción bronquial (asma), enfisema/EPOC, intersticial (fibrosis) y bronquiectasias/cavitación.
   Cada paciente define `path` (hallazgo patológico por 'escena:region:instrumento') según la localización de la lesión;
   las regiones no listadas devuelven el hallazgo normal del módulo base. */
(function () {
  'use strict';

  /* ------------------------------------------------------------ utilidades */
  const H = (tec, hal) => `<i>Técnica:</i> ${tec} <i>Hallazgo:</i> ${hal}`;
  let timer = null;
  function lungSound(type, adv, gain) {
    Sound.listen({ lung: { type, adv: adv || [] }, lungGain: gain == null ? 1 : gain, mode: 'diaphragm' });
    clearTimeout(timer);
    timer = setTimeout(() => Sound.stop(), 16000);
  }
  const au = (html, type, adv, gain) => ({ html, run: () => lungSound(type, adv, gain) });
  const pc = (kind, html) => ({ html, run: () => Sound.percuss(kind) });
  const exc = (html, k1, k2) => ({ html, run: () => { Sound.percuss(k1); setTimeout(() => Sound.percuss(k2 || k1), 550); } });

  const VV_TEC = 'palma o borde cubital apoyado; la persona dice «treinta y tres»; comparar con el lado opuesto.';
  const PERC_TEC = 'percusión dígito-digital comparativa en los espacios intercostales.';
  const AUS_TEC = 'diafragma sobre la piel, respiración profunda por la boca, un ciclo completo por punto.';
  const VOZ_TEC = 'la persona dice «treinta y tres» (y luego cuchichea) mientras se ausculta; comparar lados.';

  /* Clasificación de las regiones heredadas por lado (R = derecho, L = izquierdo, C = central) y nivel. */
  const AP = ['R', 'apex'], AL = ['L', 'apex'];
  const REG = {
    palpA: { apR: AP, apL: AL, man: ['C', 'apex'], m2R: ['R', 'upper'], m2L: ['L', 'upper'], m4R: ['R', 'mid'], m4L: ['L', 'mid'], prec: ['C', 'mid'], bR: ['R', 'base'], bL: ['L', 'base'] },
    palpP: { apR: AP, apL: AL, inR: ['R', 'upper'], inL: ['L', 'upper'], fsR: ['R', 'mid'], fsL: ['L', 'mid'], bR: ['R', 'base'], bL: ['L', 'base'] },
    percA: { apR: AP, apL: AL, s2R: ['R', 'upper'], s2L: ['L', 'upper'], s4R: ['R', 'mid'], s4L: ['L', 'mid'], s5R: ['R', 'base'], s5L: ['L', 'base'] },
    percP: { apR: AP, apL: AL, inR: ['R', 'upper'], inL: ['L', 'upper'], fsR: ['R', 'mid'], fsL: ['L', 'mid'], bR: ['R', 'base'], bL: ['L', 'base'] },
    auscA: { apR: AP, apL: AL, man: ['C', 'apex'], m2R: ['R', 'upper'], m2L: ['L', 'upper'], m4R: ['R', 'mid'], m4L: ['L', 'mid'], axR: ['R', 'mid'], axL: ['L', 'mid'], bR: ['R', 'base'], bL: ['L', 'base'] },
    auscP: { apR: AP, apL: AL, inR: ['R', 'upper'], inL: ['L', 'upper'], fsR: ['R', 'mid'], fsL: ['L', 'mid'], bR: ['R', 'base'], bL: ['L', 'base'] }
  };
  /* regiones de palpación que admiten la maniobra de expansión en el módulo base */
  const EXPAN = { palpA: ['apR', 'apL'], palpP: ['apR', 'apL', 'fsR', 'fsL'] };
  const ALL = ['apex', 'upper', 'mid', 'base'];

  /* zones: [{ sides:[...], levels:[...], f:{ vv, expan, perc:[kind, html] | fn, steth:[html,type,adv,gain], voice } }]
     Las zonas posteriores sobrescriben a las anteriores (declarar primero lo difuso y luego lo focal). */
  function zonePath(zones, extra) {
    const P = {};
    Object.keys(REG).forEach(scene => Object.keys(REG[scene]).forEach(rid => {
      const [side, level] = REG[scene][rid];
      zones.forEach(z => {
        if (!z.sides.includes(side) || !z.levels.includes(level)) return;
        const f = z.f;
        if (scene.startsWith('palp')) {
          if (f.vv) P[`${scene}:${rid}:vv`] = H(VV_TEC, f.vv);
          if (f.expan && EXPAN[scene].includes(rid)) P[`${scene}:${rid}:expan`] = f.expan;
        } else if (scene.startsWith('perc')) {
          if (f.perc) P[`${scene}:${rid}:perc`] = pc(f.perc[0], H(PERC_TEC, f.perc[1]));
        } else {
          if (f.steth) P[`${scene}:${rid}:steth`] = au(H(AUS_TEC, f.steth[0]), f.steth[1], f.steth[2], f.steth[3]);
          if (f.voice) P[`${scene}:${rid}:voice`] = H(VOZ_TEC, f.voice);
        }
      });
    }));
    return Object.assign(P, extra || {});
  }

  /* ------------------------------------------------------------ overlays de inspección (viewBox 420×560; vista anterior:
     el lado derecho del paciente queda a la izquierda del dibujo) */
  const SK = '#f1c9a5', SKD = '#b98a63';
  const tiraje = (both) => {
    let g = '<g opacity=".55">';
    [[150, 185], [142, 212], [136, 238]].forEach(([x, y]) => {
      g += `<path d="M${x - 50},${y} Q${x - 10},${y + 10} ${x + 30},${y + 2}" fill="none" stroke="#8a6a50" stroke-width="5" stroke-linecap="round"/>`;
      if (both) g += `<path d="M${420 - x - 30},${y + 2} Q${420 - x + 10},${y + 10} ${420 - x + 50},${y}" fill="none" stroke="#8a6a50" stroke-width="5" stroke-linecap="round"/>`;
    });
    return g + '</g>';
  };
  const supraTiraje = '<ellipse cx="210" cy="104" rx="15" ry="7" fill="#c9a386" opacity=".7"/>' +
    '<ellipse cx="150" cy="100" rx="22" ry="6" fill="#c9a386" opacity=".5"/><ellipse cx="270" cy="100" rx="22" ry="6" fill="#c9a386" opacity=".5"/>';
  const ecmTenso = `<path d="M176,14 L204,90 M244,14 L216,90" fill="none" stroke="${SKD}" stroke-width="7" stroke-linecap="round" opacity=".55"/>`;
  const traquea = (dx, txt) => `<path d="M${210 + dx * 0.3},22 L${210 + dx},92" fill="none" stroke="#7a5a44" stroke-width="5" stroke-linecap="round" opacity=".6"/>` +
    `<path d="M${210 + dx * 0.3},30 L${210 + dx},84" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="3 4" opacity=".8"/>` +
    `<text x="${dx > 0 ? 232 : 188}" y="52" class="svg-small" text-anchor="${dx > 0 ? 'start' : 'end'}">${txt}</text>`;
  const sombra = (side, op) => (side === 'R'
    ? `<path d="M64,120 C44,138 40,172 44,222 C48,300 64,380 72,460 L80,540 L205,540 L205,100 C180,98 120,100 64,120 Z" fill="#9a7458" opacity="${op}"/>`
    : `<path d="M356,120 C376,138 380,172 376,222 C372,300 356,380 348,460 L340,540 L215,540 L215,100 C240,98 300,100 356,120 Z" fill="#9a7458" opacity="${op}"/>`);
  const nota = (txt, y) => `<rect x="8" y="${y - 14}" width="${8 + txt.length * 6.2}" height="20" rx="5" fill="#fff" opacity=".9" stroke="#cfd8e2"/><text x="14" y="${y}" class="svg-small">${txt}</text>`;
  const acropaquia = `<g transform="translate(318 440)"><rect x="0" y="0" width="94" height="104" rx="8" fill="#fff" opacity=".93" stroke="#cfd8e2"/>
    <text x="47" y="16" text-anchor="middle" class="svg-small">Acropaquia</text>
    <path d="M18,96 L18,46 C18,30 30,24 44,26 C58,28 62,38 60,52 L60,96 Z" fill="${SK}" stroke="${SKD}" stroke-width="2"/>
    <path d="M30,36 C34,28 52,28 56,38 L56,50 C52,56 34,56 30,50 Z" fill="#e8b3a0" stroke="${SKD}" stroke-width="1.5"/>
    <text x="47" y="92" text-anchor="middle" class="svg-small" style="font-size:9px">ángulo &gt; 180°</text></g>`;
  const tonel = `<path d="M172,92 C136,100 70,98 44,118 C14,138 12,176 18,224 C22,300 44,380 56,460 L66,545 L354,545 L364,460 C376,380 398,300 402,224 C408,176 406,138 376,118 C350,98 284,100 248,92 Z" fill="${SK}" stroke="${SKD}" stroke-width="3" opacity=".55"/>` +
    `<path d="M50,160 L370,160 M40,200 L380,200 M38,240 L382,240 M44,280 L376,280" fill="none" stroke="#d6b99a" stroke-width="2" opacity=".8"/>` +
    `<ellipse cx="196" cy="494" rx="52" ry="44" fill="${SK}" stroke="${SKD}" stroke-width="3"/><path d="M144,494 L248,494 M196,450 L196,538" stroke="#0e6a78" stroke-width="2"/>` +
    `<text x="262" y="498" class="svg-small">AP ≈ transv.</text>` + nota('Tórax en tonel, cifosis dorsal, espiración con labios fruncidos', 560 - 6);

  /* ------------------------------------------------------------ pacientes */
  const PACIENTES = [
    /* 1. CONDENSACIÓN: neumonía lobar del lóbulo inferior derecho */
    {
      id: 'cond', age: 54, sex: 'M', diag: 'Síndrome de condensación (neumonía lobar)',
      complaint: 'Varón de 54 años con fiebre de 39 °C, escalofríos, tos con expectoración herrumbrosa y dolor en puntada de costado derecho de 3 días.',
      vitals: 'FC 104 · PA 118/72 · FR 26 · T 38,9 °C · SpO₂ 92 %',
      v: { hr: 104, sbp: 118, dbp: 72, rr: 26, temp: 38.9, spo2: 92, height: 1.74, weight: 80, waist: 96 },
      path: zonePath([
        { sides: ['R'], levels: ['base', 'mid'], f: {
          vv: 'vibraciones vocales <b>aumentadas</b> en la base derecha (el parénquima consolidado transmite mejor la voz, con bronquio permeable).',
          expan: H('manos abrazando las bases; inspiración profunda.', '<b>expansión disminuida</b> de la base derecha; el lado izquierdo se expande con normalidad (asimetría por dolor pleurítico y pérdida de aire en el lóbulo).'),
          perc: ['dull', '<b>matidez</b> en la base derecha, con límite superior irregular; sonoridad conservada por encima y en el lado izquierdo.'],
          steth: ['murmullo vesicular reemplazado por <b>soplo tubario</b> (ruido intenso, soplante, con espiración prolongada y pausa entre fases) acompañado de <b>estertores crepitantes</b> al final de la inspiración, en «lluvia», que no se modifican con la tos.', 'bronchial', ['fine_crackles'], 1],
          voice: '<b>broncofonía</b> (la voz se oye más intensa y nítida) y <b>pectoriloquia áfona</b>: la voz cuchicheada se entiende con claridad sobre la base derecha.'
        } }
      ], {
        'insp:fr:look': c => H('contar la FR durante un minuto.', `<b>taquipnea: FR ${c.v.rr} rpm</b>, respiración superficial, aleteo nasal leve; la inspiración profunda despierta dolor en puntada de costado derecho.`),
        'insp:hemiR:look': H('comparar ambos hemitórax en inspiración profunda.', 'hemitórax derecho con <b>menor amplitud</b> de los movimientos respiratorios (la persona lo «inmoviliza» por el dolor); sin abombamiento ni retracción.'),
        'insp:forma:look': 'Tórax de forma normal, simétrico en reposo; <b>disminución de la movilidad de la base derecha</b> con la inspiración profunda. Facies febril, herpes labial.',
        'percP:bR:excur': exc(H('percutir la base en espiración y tras inspiración profunda.', '<b>excursión de la base derecha abolida</b>: la matidez no se modifica con la inspiración. Base izquierda ≈ 4–6 cm.'), 'dull', 'dull'),
        'percP:spine:perc': pc('resonant', H('percutir las apófisis espinosas de arriba abajo.', '<b>columna sonora</b> (a diferencia del derrame pleural, la condensación no vuelve mate la columna).'))
      }),
      overlay: { insp: sombra('R', 0.14) + nota('Hemitórax derecho menos móvil · facies febril', 24) },
      findings: [
        '<b>Inspección:</b> taquipnea (26 rpm), menor amplitud respiratoria del hemitórax derecho por dolor pleurítico.',
        '<b>Palpación:</b> vibraciones vocales <b>aumentadas</b> en la base derecha; expansión de esa base disminuida.',
        '<b>Percusión:</b> <b>matidez</b> en la base derecha con columna sonora; excursión de la base derecha abolida.',
        '<b>Auscultación:</b> <b>soplo tubario</b> con estertores <b>crepitantes</b> en la base derecha; <b>broncofonía</b> y <b>pectoriloquia áfona</b>.',
        'Tétrada de la condensación con bronquio permeable: VV ↑, matidez, soplo tubario, broncofonía/pectoriloquia áfona.'
      ],
      teaching: [
        'El parénquima consolidado y sin aire transmite muy bien las vibraciones de la laringe: por eso las VV aumentan, aparece el soplo tubario y la voz se entiende (pectoriloquia áfona). Si el bronquio está obstruido, el síndrome se vuelve «mudo» (VV abolidas, silencio).',
        'Distingue la matidez de condensación (columna sonora, VV ↑) de la del derrame (columna mate, VV abolidas, egofonía en el límite superior).'
      ]
    },

    /* 2. DERRAME PLEURAL izquierdo */
    {
      id: 'derr', age: 66, sex: 'F', diag: 'Síndrome de derrame pleural',
      complaint: 'Mujer de 66 años con disnea progresiva de 2 semanas, dolor de tipo pleurítico izquierdo al inicio (ahora sordo), tos seca y pérdida de peso.',
      vitals: 'FC 92 · PA 124/78 · FR 24 · T 37,4 °C · SpO₂ 93 %',
      v: { hr: 92, sbp: 124, dbp: 78, rr: 24, temp: 37.4, spo2: 93, height: 1.60, weight: 54, waist: 80 },
      path: zonePath([
        { sides: ['L'], levels: ['base', 'mid'], f: {
          vv: 'vibraciones vocales <b>abolidas</b> en el hemitórax izquierdo inferior (el líquido interpuesto no transmite la voz).',
          expan: H('manos abrazando las bases; inspiración profunda.', '<b>expansión abolida</b> de la base izquierda; el pulgar derecho se separa y el izquierdo apenas se mueve (asimetría franca).'),
          perc: ['dull', '<b>matidez</b> franca («hídrica») en la mitad inferior del hemitórax izquierdo, con límite superior cóncavo hacia arriba que asciende hacia la axila (curva de Damoiseau); no se modifica con la respiración.'],
          steth: ['<b>murmullo vesicular abolido</b>: silencio auscultatorio en la mitad inferior del hemitórax izquierdo; sin estertores.', 'absent', [], 1],
          voice: 'voz <b>abolida</b> (no se transmite a través del líquido).'
        } },
        { sides: ['L'], levels: ['mid'], f: {
          vv: 'vibraciones vocales <b>disminuidas</b> en el límite superior del derrame.',
          perc: ['dull', '<b>submatidez</b>: límite superior del derrame (aquí la lámina de líquido es más delgada); matidez por debajo y sonoridad por encima.'],
          steth: ['en el <b>límite superior del derrame</b>: murmullo vesicular disminuido con un <b>soplo pleurítico</b> suave (espiratorio, lejano) por el pulmón comprimido por encima del líquido.', 'bronchial', [], 0.45],
          voice: '<b>egofonía</b> (voz de cabra: timbre nasal y tembloroso) en la franja del límite superior del derrame, con <b>pectoriloquia áfona</b> en la misma zona.'
        } }
      ], {
        'insp:fr:look': c => H('contar la FR durante un minuto.', `<b>taquipnea: FR ${c.v.rr} rpm</b>, respiración superficial; prefiere el decúbito lateral izquierdo (sobre el lado del derrame).`),
        'insp:hemiL:look': H('comparar ambos hemitórax.', 'hemitórax izquierdo <b>abombado</b> en su mitad inferior, con <b>espacios intercostales borrados</b> y <b>disminución o abolición de los movimientos respiratorios</b> de ese lado.'),
        'insp:icL:look': 'Espacios intercostales izquierdos inferiores <b>ensanchados y borrados</b> (no se deprimen al inspirar).',
        'insp:forma:look': 'Tórax asimétrico: <b>hemitórax izquierdo más voluminoso e inmóvil</b> en su parte inferior; el derecho se mueve con normalidad.',
        'percA:traube:perc': pc('dull', H('percutir el espacio semilunar de Traube.', '<b>espacio de Traube mate</b> (ocupado por el derrame izquierdo que desplaza el fondo gástrico hacia abajo).')),
        'percP:spine:perc': pc('dull', H('percutir las apófisis espinosas de arriba abajo.', '<b>columna mate</b> desde ≈ T6 hacia abajo (signo propio del derrame pleural, ausente en la condensación).')),
        'percP:bL:excur': exc(H('percutir la base en espiración y tras inspiración profunda.', '<b>excursión de la base izquierda abolida</b>: la matidez hídrica no desciende con la inspiración. Base derecha ≈ 4–6 cm.'), 'dull', 'dull'),
        'palpP:spine:wall': H('palpación de la pared posterior.', 'pared posterior indolora; <b>sin frote pleural palpable</b> (puede percibirse en la fase inicial, seca, de la pleuresía).')
      }),
      overlay: { insp: sombra('L', 0.18) + `<path d="M232,250 C300,246 350,262 364,300 C372,340 360,420 346,470" fill="none" stroke="#9a7458" stroke-width="3" opacity=".35"/>` + nota('Hemitórax izquierdo abombado e inmóvil, espacios intercostales borrados', 24) },
      findings: [
        '<b>Inspección:</b> taquipnea, hemitórax izquierdo abombado, inmóvil, con espacios intercostales borrados.',
        '<b>Palpación:</b> expansión de la base izquierda abolida; vibraciones vocales <b>abolidas</b> en la zona del derrame y disminuidas en su límite superior.',
        '<b>Percusión:</b> <b>matidez hídrica</b> con límite superior en curva de Damoiseau; <b>columna mate</b>; espacio de Traube mate; excursión de la base abolida.',
        '<b>Auscultación:</b> murmullo vesicular y voz <b>abolidos</b>; en el límite superior, soplo pleurítico, <b>egofonía</b> y pectoriloquia áfona.'
      ],
      teaching: [
        'Tríada del derrame: VV abolidas, matidez con columna mate, murmullo vesicular abolido. La egofonía y el soplo pleurítico se buscan en la franja de pulmón comprimido justo por encima del líquido.',
        'Un derrame grande desplaza el mediastino (tráquea y choque de la punta) hacia el lado sano; uno pequeño solo borra el seno costofrénico (matidez de la base y columna mate baja).'
      ]
    },

    /* 3. NEUMOTÓRAX espontáneo derecho */
    {
      id: 'ntx', age: 24, sex: 'M', diag: 'Síndrome de neumotórax',
      complaint: 'Varón de 24 años, alto y delgado, fumador, con dolor torácico derecho brusco en puntada y disnea de inicio súbito hace 4 horas, en reposo.',
      vitals: 'FC 108 · PA 116/74 · FR 24 · T 36,8 °C · SpO₂ 93 %',
      v: { hr: 108, sbp: 116, dbp: 74, rr: 24, temp: 36.8, spo2: 93, height: 1.86, weight: 66, waist: 76 },
      path: zonePath([
        { sides: ['R'], levels: ALL, f: {
          vv: 'vibraciones vocales <b>abolidas</b> en todo el hemitórax derecho (el aire pleural interpuesto no transmite la vibración).',
          expan: H('manos abrazando el tórax; inspiración profunda.', '<b>expansión disminuida</b> del hemitórax derecho (se mueve en bloque, con retraso); izquierdo normal.'),
          perc: ['hyper', '<b>hipersonoridad</b> (sonido más intenso, grave y prolongado que la sonoridad normal, cercano al timpanismo) en todo el hemitórax derecho; límites de la matidez hepática descendidos y matidez cardíaca desplazada hacia la izquierda.'],
          steth: ['<b>murmullo vesicular abolido</b> en el hemitórax derecho: <b>silencio auscultatorio</b>; sin estertores ni frote.', 'absent', [], 1],
          voice: 'voz <b>abolida</b> (no se transmite a través de la cámara aérea).'
        } }
      ], {
        'insp:fr:look': c => H('contar la FR durante un minuto.', `<b>taquipnea: FR ${c.v.rr} rpm</b>, respiración superficial y dolorosa; ansiedad.`),
        'insp:hemiR:look': H('comparar ambos hemitórax.', 'hemitórax derecho <b>abombado</b>, con <b>disminución de la movilidad respiratoria</b> y espacios intercostales ensanchados; el izquierdo se expande con normalidad.'),
        'insp:supra:look': 'Fosa supraesternal: <b>tráquea discretamente desviada hacia la izquierda</b> (lado sano) por el aire a tensión en el hemitórax derecho; sin tiraje. Vigilar: una desviación franca con hipotensión y yugulares ingurgitadas indica neumotórax hipertensivo.',
        'insp:forma:look': 'Tórax <b>longilíneo, en embudo leve</b>, con hemitórax derecho abombado y menos móvil (hábito propio del neumotórax espontáneo primario).',
        'insp:ic:look': 'Espacios intercostales derechos <b>ensanchados</b>, sin tiraje.',
        'percA:liver:perc': pc('hyper', H('percutir de arriba abajo por la LMC derecha.', '<b>matidez hepática descendida</b>: la hipersonoridad del neumotórax llega hasta el reborde costal (desaparece el límite superior habitual en el 5.º EIC).')),
        'percA:card:perc': pc('hyper', H('percutir desde la sonoridad hacia el corazón.', '<b>matidez cardíaca desplazada hacia la izquierda</b> y reducida (el aire del hemitórax derecho empuja el mediastino).')),
        'percP:bR:excur': exc(H('percutir la base en espiración y tras inspiración profunda.', 'hipersonoridad hasta la base; <b>no se delimita la excursión</b> de la base derecha. Izquierda ≈ 4–6 cm.'), 'hyper', 'hyper'),
        'auscA:trq:steth': au(H('diafragma sobre la tráquea.', 'respiración bronquial normal; se percibe la <b>desviación traqueal</b> hacia la izquierda al apoyar el fonendoscopio.'), 'bronchial', [], 1)
      }),
      overlay: { insp: `<path d="M62,118 C36,136 30,172 36,222 C40,300 56,380 66,460" fill="none" stroke="${SKD}" stroke-width="3" opacity=".6"/>` + `<path d="M62,118 C36,136 30,172 36,222 C40,300 56,380 66,460 L72,460 C62,380 46,300 42,222 C38,170 40,135 62,118 Z" fill="${SK}" opacity=".9"/>` + traquea(-9, 'tráquea desviada a la izquierda') + nota('Hemitórax derecho abombado e hipomóvil', 24) },
      findings: [
        '<b>Inspección:</b> taquipnea, hemitórax derecho abombado y poco móvil, tráquea discretamente desviada hacia la izquierda.',
        '<b>Palpación:</b> vibraciones vocales <b>abolidas</b> en todo el hemitórax derecho; expansión disminuida.',
        '<b>Percusión:</b> <b>hipersonoridad</b> en el hemitórax derecho; matidez hepática descendida y matidez cardíaca desplazada hacia la izquierda.',
        '<b>Auscultación:</b> <b>silencio auscultatorio</b> (murmullo vesicular y voz abolidos) en el lado derecho.'
      ],
      teaching: [
        'Hipersonoridad + VV abolidas + silencio auscultatorio = neumotórax. El enfisema también da hipersonoridad, pero es bilateral y con murmullo vesicular disminuido (no abolido) y VV disminuidas.',
        'Busca signos de tensión: desviación traqueal contralateral, ingurgitación yugular, taquicardia e hipotensión: es una urgencia que se descomprime antes de la radiografía.'
      ]
    },

    /* 4. ATELECTASIA obstructiva del lóbulo inferior izquierdo */
    {
      id: 'atel', age: 70, sex: 'M', diag: 'Síndrome de atelectasia',
      complaint: 'Varón de 70 años, gran fumador, con disnea progresiva de un mes, tos seca persistente, un episodio de hemoptisis y pérdida de 6 kg.',
      vitals: 'FC 90 · PA 134/82 · FR 22 · T 36,9 °C · SpO₂ 92 %',
      v: { hr: 90, sbp: 134, dbp: 82, rr: 22, temp: 36.9, spo2: 92, height: 1.70, weight: 62, waist: 86 },
      path: zonePath([
        { sides: ['L'], levels: ['base', 'mid'], f: {
          vv: 'vibraciones vocales <b>disminuidas o abolidas</b> en la base izquierda (bronquio obstruido: el parénquima colapsado no recibe la vibración).',
          expan: H('manos abrazando las bases; inspiración profunda.', '<b>expansión disminuida</b> de la base izquierda, con <b>retracción</b> de ese hemitórax; derecha normal.'),
          perc: ['dull', '<b>matidez</b> en la base izquierda (pulmón colapsado, sin aire), de límite superior poco neto; sonoridad en el resto.'],
          steth: ['<b>murmullo vesicular abolido</b> en la base izquierda (bronquio obstruido): silencio, sin soplo ni estertores.', 'absent', [], 1],
          voice: 'voz <b>abolida</b> en la base izquierda (no hay bronquio permeable que la conduzca).'
        } }
      ], {
        'insp:fr:look': c => H('contar la FR durante un minuto.', `FR ${c.v.rr} rpm (<b>taquipnea leve</b>), ritmo regular; tos seca durante el examen.`),
        'insp:hemiL:look': H('comparar ambos hemitórax.', 'hemitórax izquierdo <b>retraído</b> (más pequeño), con hombro izquierdo descendido, <b>espacios intercostales estrechados</b> y <b>disminución de los movimientos respiratorios</b> en la base.'),
        'insp:icL:look': 'Espacios intercostales izquierdos inferiores <b>estrechados y hundidos</b> (retracción del hemitórax).',
        'insp:supra:look': 'Fosa supraesternal: <b>tráquea desviada hacia la izquierda</b> (hacia el lado de la lesión: el pulmón colapsado atrae el mediastino). Sin tiraje.',
        'insp:forma:look': 'Tórax <b>asimétrico por retracción del hemitórax izquierdo</b>; hombro izquierdo más bajo; adelgazamiento.',
        'percA:card:perc': pc('dull', H('percutir desde la sonoridad hacia el corazón.', 'matidez cardíaca <b>desplazada hacia la izquierda</b> (el mediastino es atraído hacia la atelectasia).')),
        'percP:bL:excur': exc(H('percutir la base en espiración y tras inspiración profunda.', '<b>excursión de la base izquierda abolida</b>; derecha ≈ 4–6 cm.'), 'dull', 'dull'),
        'percP:spine:perc': pc('resonant', H('percutir las apófisis espinosas.', 'columna sonora (matidez solo en la zona de la base izquierda).')),
        'auscA:trq:steth': au(H('diafragma sobre la tráquea.', 'respiración bronquial normal; tráquea <b>desplazada hacia la izquierda</b>.'), 'bronchial', [], 1)
      }),
      overlay: { insp: `<path d="M358,118 C380,135 382,170 378,220 C374,300 358,380 350,460 L340,545 L330,545 L338,460 C346,380 360,300 364,220 C368,170 366,135 348,120 Z" fill="#e8eef4" stroke="${SKD}" stroke-width="3"/>` + sombra('L', 0.12) + traquea(10, 'tráquea desviada a la izquierda') + nota('Hemitórax izquierdo retraído, espacios intercostales estrechos', 24) },
      findings: [
        '<b>Inspección:</b> hemitórax izquierdo retraído e hipomóvil, espacios intercostales estrechados, <b>tráquea desviada hacia el lado de la lesión</b>.',
        '<b>Palpación:</b> vibraciones vocales <b>disminuidas/abolidas</b> en la base izquierda; expansión reducida.',
        '<b>Percusión:</b> <b>matidez</b> de la base izquierda, matidez cardíaca desplazada a la izquierda, columna sonora.',
        '<b>Auscultación:</b> <b>silencio auscultatorio</b> en la base izquierda (bronquio obstruido): sin soplo tubario ni estertores.',
        'En un fumador con hemoptisis y pérdida de peso, la atelectasia obliga a descartar un carcinoma broncogénico.'
      ],
      teaching: [
        'La atelectasia obstructiva es un «síndrome de condensación con bronquio ocluido»: matidez como en la neumonía, pero VV y murmullo vesicular abolidos y sin soplo tubario, con retracción del hemitórax y desviación del mediastino <b>hacia la lesión</b>.',
        'Regla de la tráquea: se desvía hacia el lado enfermo en la atelectasia y la fibrosis; hacia el lado sano en el derrame grande y el neumotórax hipertensivo.'
      ]
    },

    /* 5. OBSTRUCCIÓN BRONQUIAL: crisis asmática */
    {
      id: 'asma', age: 22, sex: 'F', diag: 'Síndrome de obstrucción bronquial (crisis asmática)',
      complaint: 'Mujer de 22 años, asmática desde la infancia, con disnea, sibilancias audibles y tos seca desde hace 6 horas tras un cuadro catarral; no mejora con el inhalador habitual.',
      vitals: 'FC 112 · PA 126/80 · FR 28 · T 37,1 °C · SpO₂ 92 %',
      v: { hr: 112, sbp: 126, dbp: 80, rr: 28, temp: 37.1, spo2: 92, height: 1.63, weight: 57, waist: 72 },
      path: zonePath([
        { sides: ['R', 'L', 'C'], levels: ALL, f: {
          vv: 'vibraciones vocales <b>conservadas o algo disminuidas</b>, simétricas (atrapamiento aéreo).',
          expan: H('manos abrazando el tórax; inspiración profunda.', 'expansión <b>disminuida de forma simétrica</b> (tórax en inspiración casi permanente, con poca excursión).'),
          perc: ['hyper', '<b>sonoridad aumentada (hipersonoridad leve) y simétrica</b> por el atrapamiento de aire.'],
          steth: ['murmullo vesicular <b>disminuido</b> con <b>espiración prolongada</b> (I:E ≈ 1:3) y <b>sibilancias</b> difusas, polifónicas, sobre todo espiratorias, en ambos campos; algunos roncus.', 'diminished', ['wheeze'], 1],
          voice: 'voz transmitida con normalidad, simétrica; no se distinguen las sílabas.'
        } }
      ], {
        'insp:fr:look': c => H('contar la FR durante un minuto.', `<b>taquipnea: FR ${c.v.rr} rpm</b>, <b>espiración prolongada y audible</b> (sibilancias a distancia); habla con frases cortas; sentada e inclinada hacia delante.`),
        'insp:ecmR:look': H('observar el cuello durante la inspiración.', '<b>uso de músculos accesorios</b>: esternocleidomastoideos y escalenos se contraen en cada inspiración.'),
        'insp:ecmL:look': H('observar el cuello durante la inspiración.', '<b>esternocleidomastoideo izquierdo contraído</b> con cada inspiración (músculos accesorios en actividad).'),
        'insp:supra:look': '<b>Tiraje supraesternal y supraclavicular</b>: las fosas se deprimen en la inspiración; tráquea en la línea media.',
        'insp:ic:look': '<b>Tiraje intercostal</b> bilateral: los espacios se hunden en la inspiración; <b>tiraje subcostal</b> leve.',
        'insp:icL:look': '<b>Tiraje intercostal</b> simétrico con el lado derecho.',
        'insp:forma:look': 'Tórax simétrico, <b>fijo en inspiración</b> (hiperinsuflado), con escasa excursión; tiraje generalizado.',
        'insp:hemiR:look': 'Ambos hemitórax hiperinsuflados y simétricos, con <b>poca movilidad</b> respiratoria.',
        'insp:hemiL:look': 'Simétrico con el derecho: hiperinsuflación y poca movilidad.',
        'percA:liver:perc': pc('dull', H('percutir por la LMC derecha.', 'límite superior de la matidez hepática <b>algo descendido</b> (6.º EIC) por la hiperinsuflación.')),
        'percP:bR:excur': exc(H('percutir la base en espiración y tras inspiración profunda.', '<b>excursión de las bases reducida</b> (≈ 2 cm) y simétrica, por el atrapamiento aéreo.'), 'hyper', 'dull'),
        'percP:bL:excur': exc(H('percutir la base en espiración y tras inspiración profunda.', 'excursión de la base izquierda reducida (≈ 2 cm), igual que la derecha.'), 'hyper', 'dull'),
        'auscA:trq:steth': au(H('diafragma sobre la tráquea.', 'respiración bronquial con <b>espiración prolongada</b> y sibilancias transmitidas.'), 'bronchial', ['wheeze'], 1)
      }),
      overlay: { insp: tiraje(true) + supraTiraje + ecmTenso + nota('Tiraje supraesternal e intercostal; músculos accesorios en actividad', 24) },
      findings: [
        '<b>Inspección:</b> taquipnea, espiración prolongada y audible, uso de músculos accesorios, <b>tiraje</b> supraesternal e intercostal, tórax hiperinsuflado.',
        '<b>Palpación:</b> vibraciones vocales conservadas o algo disminuidas, simétricas; expansión reducida.',
        '<b>Percusión:</b> hipersonoridad leve y simétrica; excursión de las bases reducida.',
        '<b>Auscultación:</b> murmullo vesicular disminuido, <b>espiración prolongada</b> y <b>sibilancias difusas</b> (estertores secos) en ambos campos.',
        'Signos de gravedad a vigilar: imposibilidad de hablar, bradicardia, cianosis y <b>tórax silencioso</b> (desaparición de las sibilancias por obstrucción extrema).'
      ],
      teaching: [
        'Las sibilancias son estertores secos agudos, continuos, que predominan en la espiración; su intensidad no se correlaciona con la gravedad: el «tórax silencioso» es el signo de mayor alarma.',
        'El síndrome de obstrucción bronquial es difuso y simétrico; a diferencia del enfisema, es reversible y no deforma el tórax.'
      ]
    },

    /* 6. ENFISEMA / EPOC */
    {
      id: 'epoc', age: 68, sex: 'M', diag: 'Síndrome de enfisema pulmonar (EPOC)',
      complaint: 'Varón de 68 años, fumador de 50 paquetes-año, con disnea de esfuerzo progresiva de varios años (ahora al caminar 100 m), tos matinal con expectoración mucosa y pérdida de peso.',
      vitals: 'FC 88 · PA 136/84 · FR 22 · T 36,5 °C · SpO₂ 90 %',
      v: { hr: 88, sbp: 136, dbp: 84, rr: 22, temp: 36.5, spo2: 90, height: 1.70, weight: 56, waist: 82 },
      path: zonePath([
        { sides: ['R', 'L', 'C'], levels: ALL, f: {
          vv: 'vibraciones vocales <b>disminuidas</b> de forma difusa y simétrica (el pulmón hiperinsuflado y la pared gruesa transmiten mal la vibración).',
          expan: H('manos abrazando el tórax; inspiración profunda.', '<b>expansión muy disminuida y simétrica</b>: el tórax está ya en posición inspiratoria y se mueve en bloque (respiración costal superior).'),
          perc: ['hyper', '<b>hipersonoridad</b> generalizada y simétrica (atrapamiento aéreo); límites inferiores descendidos.'],
          steth: ['<b>murmullo vesicular disminuido</b> de forma difusa, con <b>espiración prolongada</b>; <b>roncus</b> (estertores secos graves) y algunas sibilancias espiratorias que se modifican con la tos.', 'diminished', ['rhonchi', 'wheeze'], 1],
          voice: 'voz <b>disminuida</b> de forma difusa, simétrica, sin broncofonía.'
        } }
      ], {
        'insp:fr:look': c => H('contar la FR durante un minuto.', `FR ${c.v.rr} rpm, <b>espiración prolongada con labios fruncidos</b>; respiración costal superior; disnea al hablar en frases largas.`),
        'insp:forma:look': H('observar de frente, de perfil y por detrás.', '<b>tórax en tonel</b>: aumento del diámetro anteroposterior (relación AP/transverso ≈ 1), costillas horizontalizadas, espacios intercostales anchos, cifosis dorsal, hombros elevados, cuello corto.'),
        'insp:axial:look': 'Corte axial: <b>diámetro anteroposterior ≈ transverso</b> (relación 1:1, tórax en tonel).',
        'insp:charpy:look': '<b>Ángulo epigástrico obtuso</b> (> 90°) por la horizontalización de las costillas.',
        'insp:ecmR:look': '<b>Uso de músculos accesorios</b> (esternocleidomastoideos hipertrofiados y contraídos en la inspiración).',
        'insp:ecmL:look': 'Esternocleidomastoideo izquierdo hipertrofiado, contraído en cada inspiración.',
        'insp:supra:look': 'Fosas supraclaviculares <b>llenas</b> (vértices hiperinsuflados); <b>tiraje supraesternal</b> leve; tráquea central con <b>descenso inspiratorio</b> (signo de Campbell).',
        'insp:ic:look': 'Espacios intercostales <b>anchos</b> con <b>tiraje intercostal</b> inferior y retracción paradójica de las costillas inferiores en la inspiración (signo de Hoover).',
        'insp:icL:look': 'Igual que el lado derecho: espacios anchos, tiraje y signo de Hoover.',
        'insp:hemiR:look': 'Hemitórax derecho hiperinsuflado y <b>poco móvil</b>; simétrico con el izquierdo.',
        'insp:hemiL:look': 'Hemitórax izquierdo hiperinsuflado y poco móvil; simétrico.',
        'percA:liver:perc': pc('dull', H('percutir por la LMC derecha.', '<b>matidez hepática descendida</b>: comienza en el 7.º EIC (hígado desplazado hacia abajo por el pulmón hiperinsuflado).')),
        'percA:card:perc': pc('hyper', H('percutir desde la sonoridad hacia el corazón.', '<b>matidez cardíaca reducida o ausente</b>: el pulmón hiperinsuflado se interpone delante del corazón.')),
        'percA:traube:perc': pc('hyper', H('percutir el espacio de Traube.', 'espacio de Traube timpánico, <b>descendido</b>.')),
        'percP:bR:excur': exc(H('percutir la base en espiración y tras inspiración profunda.', '<b>excursión de la base derecha reducida</b> (≈ 1–2 cm), con límite inferior descendido (T11–T12).'), 'hyper', 'dull'),
        'percP:bL:excur': exc(H('percutir la base en espiración y tras inspiración profunda.', 'excursión de la base izquierda reducida (≈ 1–2 cm), simétrica.'), 'hyper', 'dull'),
        'auscA:trq:steth': au(H('diafragma sobre la tráquea.', 'respiración bronquial con <b>espiración muy prolongada</b> y roncus transmitidos.'), 'bronchial', ['rhonchi'], 1),
        'auscA:man:steth': au(H(AUS_TEC, 'respiración broncovesicular atenuada, con espiración prolongada y roncus.'), 'broncovesicular', ['rhonchi'], 0.7)
      }),
      overlay: { insp: tonel + ecmTenso },
      findings: [
        '<b>Inspección:</b> <b>tórax en tonel</b> (AP ≈ transverso), ángulo epigástrico obtuso, espiración prolongada con labios fruncidos, músculos accesorios, signo de Hoover.',
        '<b>Palpación:</b> expansión muy disminuida; vibraciones vocales <b>disminuidas</b> de forma difusa y simétrica.',
        '<b>Percusión:</b> <b>hipersonoridad</b> generalizada; matidez hepática y cardíaca reducidas o descendidas; excursión de las bases ≈ 1–2 cm.',
        '<b>Auscultación:</b> murmullo vesicular <b>disminuido</b> con espiración prolongada, <b>roncus</b> y sibilancias.'
      ],
      teaching: [
        'Síndrome de enfisema (hiperinsuflación crónica): todo lo que depende del aire aumenta (hipersonoridad, límites descendidos) y todo lo que depende de la transmisión disminuye (VV, murmullo vesicular, voz), de forma bilateral y simétrica.',
        'El neumotórax da también hipersonoridad y silencio, pero es unilateral y agudo; en el enfisema la hipersonoridad se acompaña de tórax en tonel y la EPOC suele añadir roncus y sibilancias por bronquitis crónica.'
      ]
    },

    /* 7. FIBROSIS INTERSTICIAL */
    {
      id: 'fibr', age: 63, sex: 'F', diag: 'Síndrome intersticial (fibrosis pulmonar)',
      complaint: 'Mujer de 63 años con disnea de esfuerzo lentamente progresiva de 2 años y tos seca persistente; ex trabajadora en un aviario; dedos «en palillo de tambor».',
      vitals: 'FC 86 · PA 128/78 · FR 24 · T 36,6 °C · SpO₂ 91 %',
      v: { hr: 86, sbp: 128, dbp: 78, rr: 24, temp: 36.6, spo2: 91, height: 1.58, weight: 60, waist: 84 },
      path: zonePath([
        { sides: ['R', 'L'], levels: ['base'], f: {
          vv: 'vibraciones vocales <b>conservadas o levemente aumentadas</b> en ambas bases (el intersticio engrosado transmite bien), simétricas.',
          expan: H('manos abrazando las bases; inspiración profunda.', '<b>expansión de las bases disminuida</b>, simétrica (pulmones rígidos, de volumen reducido).'),
          perc: ['resonant', 'sonoridad conservada o <b>submatidez</b> leve en ambas bases; límites inferiores algo ascendidos.'],
          steth: ['murmullo vesicular conservado o algo rudo, con <b>estertores crepitantes «tipo velcro»</b> bibasales, finos, secos, al final de la inspiración, que <b>no se modifican con la tos</b> y son muy constantes de un día a otro.', 'normal', ['fine_crackles'], 1],
          voice: 'voz transmitida con normalidad o algo aumentada en las bases, simétrica.'
        } },
        { sides: ['R', 'L'], levels: ['mid'], f: {
          steth: ['murmullo vesicular conservado; <b>crepitantes finos</b> escasos, al final de la inspiración, menos abundantes que en las bases.', 'normal', ['fine_crackles'], 0.8]
        } }
      ], {
        'insp:fr:look': c => H('contar la FR durante un minuto.', `<b>taquipnea: FR ${c.v.rr} rpm</b>, respiración <b>superficial y rápida</b> (patrón restrictivo); tos seca al inspirar profundo.`),
        'insp:forma:look': H('observar el tórax de frente y de perfil.', 'tórax simétrico, de volumen <b>algo reducido</b>, con poca excursión respiratoria. <b>Acropaquia</b> (dedos en palillo de tambor: ángulo ungueal > 180°, uñas en vidrio de reloj) y cianosis distal leve al esfuerzo.'),
        'insp:hemiR:look': 'Hemitórax derecho simétrico con el izquierdo; excursión respiratoria reducida en ambos.',
        'insp:hemiL:look': 'Hemitórax izquierdo simétrico; excursión reducida.',
        'percP:bR:excur': exc(H('percutir la base en espiración y tras inspiración profunda.', '<b>excursión de la base derecha reducida</b> (≈ 2–3 cm); límite inferior algo elevado (T9).'), 'resonant', 'dull'),
        'percP:bL:excur': exc(H('percutir la base en espiración y tras inspiración profunda.', 'excursión de la base izquierda reducida (≈ 2–3 cm), simétrica.'), 'resonant', 'dull')
      }),
      overlay: { insp: acropaquia + nota('Taquipnea superficial · acropaquia', 24) },
      findings: [
        '<b>Inspección:</b> taquipnea superficial, acropaquia; tórax simétrico de volumen algo reducido.',
        '<b>Palpación:</b> expansión de las bases disminuida; vibraciones vocales conservadas o levemente aumentadas.',
        '<b>Percusión:</b> sonoridad conservada o submatidez leve en las bases; excursión reducida.',
        '<b>Auscultación:</b> <b>estertores crepitantes «tipo velcro»</b> bibasales, teleinspiratorios, que no cambian con la tos; sin sibilancias.'
      ],
      teaching: [
        'El síndrome intersticial es «pobre» en la palpación y la percusión y «rico» en la auscultación: crepitantes finos, secos, bibasales y persistentes (velcro). Los crepitantes de la insuficiencia cardíaca son más húmedos, cambian de un día a otro y se acompañan de signos cardíacos.',
        'La acropaquia acompaña a la fibrosis, las bronquiectasias y el cáncer de pulmón; no es propia de la EPOC simple.'
      ]
    },

    /* 8. BRONQUIECTASIAS / cavitación con secreciones */
    {
      id: 'bqx', age: 48, sex: 'M', diag: 'Síndrome de bronquiectasias (cavitación con secreciones)',
      complaint: 'Varón de 48 años con tos productiva crónica (expectoración abundante, mucopurulenta, en «capas», mayor por las mañanas), infecciones respiratorias repetidas desde la infancia y dos episodios de hemoptisis.',
      vitals: 'FC 84 · PA 122/76 · FR 20 · T 37,6 °C · SpO₂ 94 %',
      v: { hr: 84, sbp: 122, dbp: 76, rr: 20, temp: 37.6, spo2: 94, height: 1.72, weight: 66, waist: 84 },
      path: zonePath([
        { sides: ['L'], levels: ['base'], f: {
          vv: 'vibraciones vocales <b>conservadas o algo aumentadas</b> en la base izquierda (fibrosis peribronquial).',
          perc: ['resonant', 'sonoridad conservada o <b>submatidez</b> en la base izquierda.'],
          steth: ['murmullo vesicular conservado o rudo con abundantes <b>estertores subcrepitantes</b> («de burbuja», húmedos, gruesos, inspiratorios y espiratorios) y <b>roncus</b> en la base izquierda, que <b>se modifican con la tos</b> (disminuyen tras expectorar). Puede oírse un <b>soplo cavernoso</b> (grave, hueco) sobre una cavidad grande.', 'normal', ['coarse_crackles', 'rhonchi'], 1],
          voice: 'broncofonía discreta sobre la base izquierda (cavidad con bronquio permeable); sin pectoriloquia áfona neta.'
        } },
        { sides: ['R'], levels: ['base'], f: {
          steth: ['murmullo vesicular conservado con <b>subcrepitantes escasos</b> en la base derecha, que desaparecen con la tos.', 'normal', ['coarse_crackles'], 0.7]
        } }
      ], {
        'insp:fr:look': c => H('contar la FR durante un minuto.', `FR ${c.v.rr} rpm, ritmo regular; <b>tos húmeda productiva</b> durante el examen, con expectoración mucopurulenta abundante; halitosis.`),
        'insp:forma:look': 'Tórax simétrico, sin deformidades. <b>Acropaquia</b> (dedos en palillo de tambor) por la supuración bronquial crónica.',
        'palpP:spine:wall': H('palpación de la pared posterior.', 'pared indolora; al apoyar la palma en la base izquierda se perciben <b>frémitos bronquiales</b> (vibraciones de las secreciones) que desaparecen al toser.'),
        'auscA:trq:steth': au(H('diafragma sobre la tráquea.', 'respiración bronquial con <b>roncus</b> transmitidos de las secreciones, que cambian al toser.'), 'bronchial', ['rhonchi'], 1)
      }),
      overlay: { insp: acropaquia + nota('Tos productiva con expectoración abundante en «capas»', 24) },
      findings: [
        '<b>Inspección:</b> tos húmeda productiva, acropaquia; tórax simétrico.',
        '<b>Palpación:</b> vibraciones vocales conservadas o algo aumentadas en la base izquierda; frémitos bronquiales que cambian con la tos.',
        '<b>Percusión:</b> sonoridad conservada o submatidez localizada.',
        '<b>Auscultación:</b> <b>estertores subcrepitantes (de burbuja)</b> y roncus en la base izquierda, <b>que se modifican con la tos</b>; broncofonía discreta; eventual soplo cavernoso.'
      ],
      teaching: [
        'Los estertores húmedos se dividen en crepitantes (finos, teleinspiratorios, no cambian con la tos: condensación, fibrosis, edema) y subcrepitantes o de burbuja (gruesos, en ambas fases, se movilizan con la tos: bronquiectasias, bronquitis, cavidades con secreciones).',
        'Una cavidad grande, superficial y comunicada con un bronquio da el síndrome cavitario: soplo cavernoso (o anfórico), VV aumentadas, submatidez o timpanismo y subcrepitantes.'
      ]
    }
  ];

  /* ------------------------------------------------------------ cuestionario (6 preguntas; 1 y 2 dependen del paciente) */
  const quiz = c => {
    const byId = {
      cond: { q: 'En este paciente, sobre la base derecha se espera encontrar…', o: ['VV abolidas, hipersonoridad y silencio', 'VV aumentadas, matidez, soplo tubario y pectoriloquia áfona', 'VV abolidas, matidez con columna mate y egofonía', 'Sibilancias difusas con hipersonoridad'], a: 1, w: 'Síndrome de condensación con bronquio permeable: el parénquima sin aire transmite mejor la voz y los ruidos laringotraqueales.' },
      derr: { q: 'En esta paciente, el hallazgo que distingue su síndrome de una condensación es…', o: ['El soplo tubario', 'La broncofonía', 'La columna mate con VV abolidas y egofonía en el límite superior', 'La hipersonoridad del hemitórax'], a: 2, w: 'En el derrame la columna se vuelve mate, las VV se abolen y en el límite superior aparecen egofonía y soplo pleurítico.' },
      ntx: { q: 'En este paciente, la combinación esperada en el hemitórax derecho es…', o: ['Hipersonoridad, VV abolidas y silencio auscultatorio', 'Matidez, VV aumentadas y soplo tubario', 'Matidez, columna mate y egofonía', 'Sonoridad normal con crepitantes velcro'], a: 0, w: 'El aire pleural interpuesto aumenta la sonoridad e impide la transmisión de vibraciones y ruidos respiratorios.' },
      atel: { q: 'En este paciente, ¿hacia dónde se desvía la tráquea y por qué?', o: ['Hacia la derecha, empujada por el líquido', 'Hacia la izquierda, atraída por el pulmón colapsado', 'No se desvía nunca en la atelectasia', 'Hacia la derecha, por el aire a tensión'], a: 1, w: 'La atelectasia reduce el volumen del hemitórax y atrae el mediastino hacia la lesión; el derrame y el neumotórax lo empujan al lado sano.' },
      asma: { q: 'En esta paciente, el signo de mayor gravedad sería…', o: ['Sibilancias más intensas', 'Tiraje supraesternal', 'Taquipnea de 28 rpm', 'Desaparición de las sibilancias («tórax silencioso»)'], a: 3, w: 'Cuando la obstrucción es extrema el flujo no alcanza a producir sibilancias: el tórax silencioso anuncia claudicación respiratoria.' },
      epoc: { q: 'En este paciente, la matidez cardíaca y hepática están…', o: ['Aumentadas por congestión', 'Reducidas o descendidas por la hiperinsuflación', 'Normales', 'Ausentes por derrame'], a: 1, w: 'El pulmón hiperinsuflado se interpone delante del corazón y empuja el hígado hacia abajo.' },
      fibr: { q: 'En esta paciente, los estertores característicos son…', o: ['Subcrepitantes que cambian con la tos', 'Roncus espiratorios', 'Crepitantes finos «tipo velcro» bibasales, teleinspiratorios y persistentes', 'Sibilancias inspiratorias'], a: 2, w: 'El intersticio fibrosado produce crepitantes finos y secos al final de la inspiración, muy constantes y que no se modifican con la tos.' },
      bqx: { q: 'En este paciente, los estertores subcrepitantes se diferencian de los crepitantes porque…', o: ['Son más finos y solo teleinspiratorios', 'Se oyen en ambas fases, son más gruesos y se modifican con la tos', 'Nunca se acompañan de roncus', 'Indican siempre fibrosis'], a: 1, w: 'Los subcrepitantes (de burbuja) nacen del paso de aire por secreciones en bronquios o cavidades; por eso cambian al toser.' }
    };
    const own = byId[c.id] || byId.cond;
    return [
      { q: own.q, options: own.o, a: own.a, why: own.w },
      { q: `Las vibraciones vocales de este paciente (${c.diag.toLowerCase()}) están…`,
        options: [
          { cond: 'Aumentadas en la base derecha', derr: 'Abolidas en el hemitórax izquierdo inferior', ntx: 'Abolidas en todo el hemitórax derecho', atel: 'Disminuidas o abolidas en la base izquierda', asma: 'Conservadas y simétricas', epoc: 'Disminuidas de forma difusa y simétrica', fibr: 'Conservadas o levemente aumentadas en las bases', bqx: 'Conservadas o algo aumentadas en la base izquierda' }[c.id],
          'Aumentadas de forma difusa en ambos vértices', 'Abolidas solo sobre el precordio', 'Aumentadas en el lado sano y abolidas en el enfermo'
        ].sort(() => 0), a: 0, why: 'Las VV aumentan cuando hay parénquima sin aire con bronquio permeable (condensación); disminuyen o se abolen cuando se interpone aire o líquido pleural, cuando el bronquio está obstruido o cuando el pulmón está hiperinsuflado.' },
      { q: 'El soplo tubario sobre el parénquima pulmonar indica…', options: ['Neumotórax', 'Enfisema', 'Condensación con bronquio permeable', 'Asma bronquial'], a: 2, why: 'La respiración bronquial es normal solo sobre la tráquea y la laringe; si aparece sobre el pulmón se llama soplo tubario y traduce condensación.' },
      { q: 'La columna mate a la percusión es propia de…', options: ['Derrame pleural', 'Neumotórax', 'Enfisema', 'Asma'], a: 0, why: 'La columna sonora se conserva en la condensación y la atelectasia; el líquido pleural la vuelve mate (signo de Signorelli).' },
      { q: 'Las sibilancias y los roncus se clasifican como…', options: ['Estertores húmedos', 'Frotes pleurales', 'Soplos', 'Estertores secos'], a: 3, why: 'Estertores secos (continuos: sibilancias agudas, roncus graves) frente a estertores húmedos (discontinuos: crepitantes y subcrepitantes).' },
      { q: 'La tríada hipersonoridad + VV abolidas + silencio auscultatorio unilateral corresponde a…', options: ['Condensación', 'Neumotórax', 'Fibrosis intersticial', 'Derrame pleural'], a: 1, why: 'El aire en la cavidad pleural aumenta la sonoridad y bloquea la transmisión; en el derrame hay matidez, y en el enfisema los cambios son bilaterales.' }
    ];
  };

  NormalEngine.build({
    base: 'resp', id: 'pat-resp', title: 'Aparato respiratorio: síndromes', icon: '🫁', group: 'Exploración patológica', hideDx: false,
    desc: 'Ocho pacientes con los grandes síndromes pleuropulmonares: condensación, derrame, neumotórax, atelectasia, obstrucción bronquial, enfisema, fibrosis y bronquiectasias.',
    bullets: [
      'Hallazgos según la localización de la lesión; el resto del tórax es normal',
      'Soplo tubario, estertores secos y húmedos, silencio auscultatorio con sonido',
      'Tiraje, tórax en tonel, asimetrías y desviación traqueal en la inspección'
    ],
    people: PACIENTES,
    refs: [
      'Argente HA, Álvarez ME. <i>Semiología Médica. Fisiopatología, semiotecnia y propedéutica</i>. Panamericana — Aparato respiratorio: síndromes y patologías (condensación, atelectasia, derrame pleural, neumotórax, obstrucción bronquial, enfisema, intersticial, cavitario).',
      'Argente HA, Álvarez ME. <i>Semiología Médica</i> — Aparato respiratorio: auscultación (ruidos agregados: estertores secos y húmedos, frote pleural; auscultación de la voz).',
      'Global Initiative for Chronic Obstructive Lung Disease (GOLD) y Global Initiative for Asthma (GINA) — definiciones clínicas de EPOC y asma.'
    ],
    quiz,
    teaching: [
      'Para cada síndrome razona los cuatro tiempos: inspección (simetría, movilidad, tiraje, tráquea), palpación (expansión y VV), percusión (sonoridad, matidez, hipersonoridad, columna) y auscultación (murmullo vesicular, soplos, estertores, voz).',
      'Lo que no tiene aire pero conserva el bronquio permeable transmite más (condensación: VV ↑, soplo tubario, pectoriloquia áfona); lo que interpone aire o líquido, o pierde el bronquio, transmite menos (derrame, neumotórax, atelectasia: VV ↓/abolidas, silencio).',
      'La percusión separa el líquido y el sólido (matidez) del aire (hipersonoridad); la columna mate es propia del derrame pleural.',
      'Estertores secos (sibilancias, roncus) = obstrucción bronquial; crepitantes = alvéolo (condensación, fibrosis, edema); subcrepitantes = secreciones en bronquios o cavidades (cambian con la tos).',
      'Siempre compara con el lado opuesto y con el hallazgo normal: en estos pacientes las regiones no afectadas conservan los hallazgos normales.'
    ]
  });
})();
