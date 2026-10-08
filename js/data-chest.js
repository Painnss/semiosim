/* Casos de tórax. heart.kind: sys_ejection (soplo sistólico eyectivo) | holosystolic (sistólico regurgitativo) |
   early_diastolic (diastólico regurgitativo aórtico) | diastolic_rumble (rolido mitral).
   heart.int: intensidad (0-1) del soplo en cada foco (AO aórtico, PU pulmonar, ER mesocárdico/Erb, TR tricuspídeo, MI mitral, AX axila, CR/CL carótidas).
   heart.s1/s2 (claves de código): intensidad relativa de R1 y R2; s3/s4: galopes; snap: chasquido de apertura.
   lung.base: sonido por defecto en todo el tórax; lung.over: excepciones por punto.
   lung.perc (clave de código): resonant = sonoridad normal, dull = matidez, hyper = hipersonoridad.
   truth: respuestas aceptadas para el registro del estudiante. */
(function () {
  'use strict';

  const heart = o => Object.assign({ rate: 75, s1: 1, s2: 1, s3: false, s4: false, snap: false, kind: null, int: {} }, o);
  const N = { type: 'normal', adv: [], perc: 'resonant' };

  const only = (keys, spec) => Object.fromEntries(keys.map(k => [k, spec]));

  window.CHEST_CASES = [
    {
      id: 'c0', age: 28, sex: 'F', diag: 'Tórax normal',
      complaint: 'Examen de salud previo a un empleo. Asintomática.',
      vitals: 'FC 72 · FR 14 · PA 110/70 · SpO₂ 98 %',
      heart: heart({}), lung: { base: N, over: {} },
      truth: { heart: ['normal'], lung: ['vesicular'], adv: ['none'], perc: ['resonant'] },
      findings: [
        'R1 y R2 normales en los cuatro focos, sin soplos, ruidos agregados ni galope.',
        'Murmullo vesicular conservado y simétrico, sin estertores.',
        'Sonoridad normal a la percusión en ambos campos pulmonares, con excursión de las bases conservada.'
      ],
      teaching: [
        'Ausculta un ciclo respiratorio completo en cada punto, con el paciente respirando por la boca, y compara siempre puntos simétricos.',
        'Murmullo vesicular normal: suave y de tono bajo, con inspiración más larga e intensa que la espiración (que casi no se oye).',
        'Ruidos cardíacos: R1 (cierre de las válvulas mitral y tricúspide) marca el inicio de la sístole; R2 (cierre de las sigmoideas aórtica y pulmonar), el inicio de la diástole. El desdoblamiento fisiológico del R2 se oye en el foco pulmonar durante la inspiración.',
        'Percusión dígito-digital: el dedo plexímetro apoyado en el espacio intercostal, golpes secos con el dedo percutor; en el pulmón sano se obtiene sonoridad.'
      ]
    },
    {
      id: 'c1', age: 74, sex: 'M', diag: 'Estenosis aórtica',
      complaint: 'Falta de aire al subir escaleras, presión en el pecho y un episodio de desmayo al esfuerzo.',
      vitals: 'FC 78 · PA 115/85 (presión de pulso estrecha)',
      heart: heart({ kind: 'sys_ejection', s2: 0.4, int: { AO: 1, PU: 0.6, ER: 0.8, TR: 0.45, MI: 0.45, CR: 0.8, CL: 0.55 } }),
      lung: { base: N, over: {} },
      truth: { heart: ['sys_ejection'], lung: ['vesicular'], adv: ['none'], perc: ['resonant'] },
      findings: [
        'Soplo sistólico eyectivo (mesosistólico, «en rombo»), áspero, máximo en el foco aórtico.',
        'Irradiación a las carótidas (y a lo largo del borde esternal).',
        'R2 disminuido (válvula aórtica rígida y calcificada).',
        'Murmullo vesicular conservado y sonoridad normal.'
      ],
      teaching: [
        'Soplo eyectivo: empieza después de R1, crece y decrece (creciente-decreciente) y termina antes de R2. Cuanto más grave la estenosis, más tardío es su pico.',
        'Desliza el estetoscopio desde el foco aórtico hasta las carótidas: el soplo se transmite por el flujo. Busca también frémito en el 2.º espacio intercostal derecho.',
        'Tríada clásica de síntomas: angina, síncope y disnea. El pulso carotídeo es de ascenso lento y poca amplitud (parvus et tardus) y la presión de pulso es estrecha.',
        'Causa más frecuente en mayores: calcificación degenerativa de la válvula; en jóvenes, válvula bicúspide.'
      ]
    },
    {
      id: 'c2', age: 58, sex: 'F', diag: 'Insuficiencia mitral',
      complaint: 'Cansancio y falta de aire al esfuerzo que han ido en aumento. Siente palpitaciones.',
      vitals: 'FC 88 · PA 125/75',
      heart: heart({ rate: 88, kind: 'holosystolic', s1: 0.55, int: { MI: 1, AX: 0.85, TR: 0.5, ER: 0.45, PU: 0.25, AO: 0.2 } }),
      lung: { base: N, over: {} },
      truth: { heart: ['holosystolic'], lung: ['vesicular'], adv: ['none'], perc: ['resonant'] },
      findings: [
        'Soplo sistólico regurgitativo (holosistólico), «en chorro de vapor», máximo en el foco mitral (ápex).',
        'Irradiación a la axila izquierda.',
        'R1 disminuido (la válvula no cierra bien).'
      ],
      teaching: [
        'Soplo regurgitativo: ocupa toda la sístole con intensidad uniforme («en meseta» o «en barra») porque la sangre refluye a la aurícula desde el inicio y tapa R1 y R2.',
        'Ausculta el ápex y luego la axila izquierda: la irradiación axilar es característica; en la insuficiencia tricuspídea, en cambio, el soplo aumenta con la inspiración (maniobra de Rivero Carvallo).',
        'Causas: prolapso de la válvula mitral, cardiopatía isquémica (disfunción de músculos papilares), endocarditis, enfermedad reumática.',
        'Valora el tamaño del ventrículo izquierdo: el choque de la punta se desplaza hacia afuera y abajo cuando hay dilatación.'
      ]
    },
    {
      id: 'c3', age: 41, sex: 'F', diag: 'Estenosis mitral',
      complaint: 'Falta de aire al esfuerzo y palpitaciones. De niña tuvo fiebre reumática.',
      vitals: 'FC 92 · PA 110/70',
      heart: heart({ rate: 92, kind: 'diastolic_rumble', s1: 1.5, snap: true, int: { MI: 1, TR: 0.5, ER: 0.3, AX: 0.3, PU: 0.15, AO: 0.1 } }),
      lung: { base: N, over: {} },
      truth: { heart: ['rumble'], lung: ['vesicular'], adv: ['none'], perc: ['resonant'] },
      findings: [
        'R1 intenso («brillante»).',
        'Chasquido de apertura poco después de R2.',
        'Rolido (retumbo) mitral diastólico de baja frecuencia en el foco mitral, con refuerzo presistólico.'
      ],
      teaching: [
        'El rolido es un soplo grave: se oye mejor con la campana apoyada con suavidad (prueba a cambiar de instrumento: con la membrana casi desaparece).',
        'Técnica clásica: paciente en decúbito lateral izquierdo, ausculta el ápex al final de la espiración; el rolido se localiza en un área pequeña (en «moneda»).',
        'El intervalo entre R2 y el chasquido de apertura es más corto cuanto más grave es la estenosis.',
        'Casi siempre es de origen reumático; si aparece fibrilación auricular, se pierde el refuerzo presistólico (que depende de la contracción auricular).'
      ]
    },
    {
      id: 'c4', age: 35, sex: 'M', diag: 'Insuficiencia aórtica',
      complaint: 'Latidos fuertes en el cuello, falta de aire al esfuerzo. Estatura alta y brazos largos.',
      vitals: 'FC 84 · PA 150/50 (presión de pulso amplia)',
      heart: heart({ rate: 84, kind: 'early_diastolic', s2: 0.6, int: { ER: 1, AO: 0.8, PU: 0.6, TR: 0.5, MI: 0.3, CR: 0.2 } }),
      lung: { base: N, over: {} },
      truth: { heart: ['early_diastolic'], lung: ['vesicular'], adv: ['none'], perc: ['resonant'] },
      findings: [
        'Soplo diastólico regurgitativo (protodiastólico, decreciente), aspirativo y de tono alto, máximo en el foco mesocárdico (Erb) y en el aórtico.',
        'R2 disminuido.',
        'Murmullo vesicular conservado y sonoridad normal.'
      ],
      teaching: [
        'Soplo agudo, «aspirativo», que comienza inmediatamente después de R2 y decrece: se oye mejor con la membrana, en el foco mesocárdico (3.er espacio intercostal izquierdo).',
        'Maniobra: paciente sentado e inclinado hacia delante, en espiración forzada sostenida.',
        'Signos periféricos: presión de pulso amplia, pulso celer o saltón (Corrigan), pulsación de la úvula (signo de Müller) y de la cabeza (signo de Musset).',
        'Causas: dilatación de la raíz aórtica (síndrome de Marfan, hipertensión), válvula bicúspide, endocarditis, enfermedad reumática.'
      ]
    },
    {
      id: 'c5', age: 68, sex: 'M', diag: 'Insuficiencia cardíaca congestiva',
      complaint: 'Falta de aire que empeora al acostarse, hinchazón de los tobillos y aumento de peso.',
      vitals: 'FC 98 · FR 24 · PA 140/90 · SpO₂ 92 %',
      heart: heart({ rate: 98, s3: true }),
      lung: { base: N, over: only(['RB', 'LB', 'pRL', 'pRB', 'pLL', 'pLB'], { type: 'normal', adv: ['fine_crackles'], perc: 'resonant' }) },
      truth: { heart: ['s3'], lung: ['vesicular'], adv: ['crackles'], perc: ['resonant'] },
      findings: [
        'Tercer ruido (R3, galope ventricular) con taquicardia.',
        'Estertores crepitantes en ambas bases pulmonares, al final de la inspiración.',
        'Sonoridad conservada a la percusión.'
      ],
      teaching: [
        'El R3 es un ruido grave, protodiastólico (poco después de R2), por llenado rápido de un ventrículo dilatado; se oye mejor en el ápex con la campana, en decúbito lateral izquierdo.',
        'Los estertores crepitantes de la insuficiencia cardíaca son bilaterales, de predominio basal, al final de la inspiración, y no se modifican con la tos (a diferencia de los subcrepitantes por secreciones).',
        'Síndrome de insuficiencia cardíaca: completa el examen con la ingurgitación yugular, el reflujo hepatoyugular, los edemas con fóvea y la hepatomegalia congestiva.',
        'En un adulto el R3 casi siempre es patológico; en jóvenes sanos y en el embarazo puede ser fisiológico.'
      ]
    },
    {
      id: 'c6', age: 52, sex: 'M', diag: 'Neumonía lobar derecha (síndrome de condensación)',
      complaint: 'Fiebre de 39 °C, tos con expectoración amarillenta y dolor al respirar en la base derecha.',
      vitals: 'FC 105 · FR 26 · T 39,2 °C · SpO₂ 93 %',
      heart: heart({ rate: 105 }),
      lung: { base: N, over: only(['pRL', 'pRB', 'RB'], { type: 'bronchial', adv: ['fine_crackles'], perc: 'dull' }) },
      truth: { heart: ['normal'], lung: ['bronchial'], adv: ['crackles'], perc: ['dull'] },
      findings: [
        'Soplo tubario (respiración bronquial sobre el parénquima) en la base derecha.',
        'Estertores crepitantes en la misma zona.',
        'Matidez a la percusión en la base derecha, con vibraciones vocales aumentadas y broncofonía (pectoriloquia áfona).',
        'Pulmón izquierdo normal.'
      ],
      teaching: [
        'Síndrome de condensación con bronquio permeable: matidez + vibraciones vocales aumentadas + soplo tubario + estertores crepitantes + broncofonía y pectoriloquia áfona.',
        'El soplo tubario se parece a la respiración bronquial que se oye sobre la tráquea: soplante, de tono alto, con espiración tan larga y audible como la inspiración. Sobre el parénquima siempre es patológico.',
        'Compara siempre con el lado sano al mismo nivel; en la fase inicial y en la resolución predominan los crepitantes.',
        'El parénquima lleno de exudado, sin aire, transmite mejor el sonido de las vías aéreas; si el bronquio se obstruye (atelectasia), hay matidez pero con silencio auscultatorio.'
      ]
    },
    {
      id: 'c7', age: 24, sex: 'F', diag: 'Crisis asmática (síndrome de obstrucción bronquial)',
      complaint: 'Tos nocturna, opresión torácica y silbidos al respirar desde ayer. Antecedente de rinitis alérgica.',
      vitals: 'FC 108 · FR 24 · SpO₂ 94 %',
      heart: heart({ rate: 108 }),
      lung: { base: { type: 'normal', adv: ['wheeze'], perc: 'resonant' }, over: {} },
      truth: { heart: ['normal'], lung: ['vesicular'], adv: ['wheeze'], perc: ['resonant'] },
      findings: [
        'Sibilancias (estertores secos) espiratorias difusas en ambos campos pulmonares.',
        'Espiración prolongada.',
        'Taquicardia sinusal; sonoridad conservada.'
      ],
      teaching: [
        'Síndrome de obstrucción bronquial: espiración prolongada, sibilancias y roncus difusos (estertores secos), con murmullo vesicular conservado o disminuido según la gravedad.',
        'Las sibilancias son sonidos agudos y musicales por estrechamiento de la vía aérea; se oyen sobre todo en la espiración. Obstrucción reversible: mejoran con broncodilatadores.',
        'En una crisis muy grave puede haber «tórax silente»: el flujo es tan bajo que las sibilancias desaparecen. Es una señal de alarma.',
        'Para graduar la crisis valora el uso de músculos accesorios, la capacidad de hablar, la frecuencia respiratoria y cardíaca y la saturación (guías GINA).'
      ]
    },
    {
      id: 'c8', age: 63, sex: 'M', diag: 'Derrame pleural izquierdo',
      complaint: 'Falta de aire progresiva y dolor sordo en la parte baja del tórax izquierdo. Antecedente de cáncer de colon.',
      vitals: 'FC 90 · FR 22 · SpO₂ 94 %',
      heart: heart({ rate: 90 }),
      lung: {
        base: N, over: {
          pLB: { type: 'diminished', adv: [], perc: 'dull' }, pLL: { type: 'diminished', adv: [], perc: 'dull' },
          LB: { type: 'diminished', adv: [], perc: 'dull' }
        }
      },
      truth: { heart: ['normal'], lung: ['diminished'], adv: ['none'], perc: ['dull'] },
      findings: [
        'Murmullo vesicular muy disminuido o abolido en la base izquierda.',
        'Matidez a la percusión en la base izquierda, con vibraciones vocales abolidas.',
        'Pulmón derecho normal.'
      ],
      teaching: [
        'Síndrome de derrame pleural: matidez (de límite superior cóncavo, desplazable con los cambios de posición) + vibraciones vocales abolidas + murmullo vesicular abolido.',
        'La columna vertebral, normalmente sonora, se vuelve mate a la altura del derrame (columna mate): es un signo útil cuando el derrame es pequeño.',
        'En el límite superior del líquido pueden oírse un soplo pleurítico (suave, espiratorio) y egofonía, por el pulmón comprimido.',
        'La radiografía o la ecografía confirman el derrame; la toracocentesis orienta la causa (aquí, sospecha de derrame neoplásico).'
      ]
    },
    {
      id: 'c9', age: 22, sex: 'M', diag: 'Neumotórax derecho',
      complaint: 'Dolor súbito en el costado derecho y falta de aire mientras estudiaba. Alto y delgado.',
      vitals: 'FC 105 · FR 24 · SpO₂ 93 %',
      heart: heart({ rate: 105 }),
      lung: {
        base: N, over: only(['RU', 'RM', 'RB', 'pRU', 'pRM', 'pRL', 'pRB'], { type: 'diminished', adv: [], perc: 'hyper' })
      },
      truth: { heart: ['normal'], lung: ['diminished'], adv: ['none'], perc: ['hyper'] },
      findings: [
        'Murmullo vesicular abolido en todo el hemitórax derecho (silencio auscultatorio).',
        'Hipersonoridad (timpanismo) a la percusión del hemitórax derecho, con vibraciones vocales abolidas.',
        'Pulmón izquierdo normal.'
      ],
      teaching: [
        'Síndrome de neumotórax: el aire en el espacio pleural aísla el pulmón de la pared: hipersonoridad o timpanismo, vibraciones vocales abolidas y murmullo vesicular abolido.',
        'Neumotórax espontáneo primario: típico en varones jóvenes, altos y delgados, a menudo fumadores.',
        'Si hay desviación de la tráquea, hipotensión e ingurgitación yugular, sospecha neumotórax hipertensivo (a tensión): urgencia vital.',
        'Contrasta: derrame (matidez, silencio auscultatorio) frente a neumotórax (hipersonoridad, silencio auscultatorio); en ambos las vibraciones vocales están abolidas.'
      ]
    },
    {
      id: 'c10', age: 70, sex: 'M', diag: 'EPOC (bronquitis crónica y enfisema)',
      complaint: 'Tos con expectoración todas las mañanas y falta de aire progresiva. Fumó 50 paquetes-año.',
      vitals: 'FC 92 · FR 22 · SpO₂ 90 %',
      heart: heart({ rate: 92 }),
      lung: { base: { type: 'diminished', adv: ['wheeze', 'rhonchi'], perc: 'hyper' }, over: {} },
      truth: { heart: ['normal'], lung: ['diminished'], adv: ['wheeze', 'rhonchi'], perc: ['hyper'] },
      findings: [
        'Murmullo vesicular disminuido de forma difusa.',
        'Sibilancias y roncus (estertores secos) con espiración prolongada.',
        'Hipersonoridad a la percusión en ambos campos, con excursión de las bases disminuida.'
      ],
      teaching: [
        'Los roncus son graves y continuos (como un ronquido) y suelen cambiar o desaparecer con la tos; las sibilancias son agudas y musicales.',
        'Síndrome de enfisema (atrapamiento aéreo): tórax «en tonel», hipersonoridad, excursión de las bases disminuida, murmullo vesicular disminuido y ruidos cardíacos alejados.',
        'La obstrucción es crónica y poco reversible, a diferencia del asma; la gravedad se gradúa con espirometría (guías GOLD).',
        'Los pacientes pueden mostrar espiración con labios fruncidos, uso de músculos accesorios y signo de Hoover (retracción inspiratoria del reborde costal).'
      ]
    }
  ];
})();
