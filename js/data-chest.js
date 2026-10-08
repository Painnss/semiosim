/* Casos de tórax. heart.kind: sys_ejection | holosystolic | early_diastolic | diastolic_rumble.
   heart.int: intensidad (0-1) del soplo en cada foco (AO aórtico, PU pulmonar, ER Erb, TR tricuspídeo, MI mitral, AX axila, CR/CL carótidas).
   lung.base: sonido por defecto en todo el tórax; lung.over: excepciones por punto.
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
      findings: ['S1 y S2 normales, sin soplos ni ruidos agregados.', 'Murmullo vesicular simétrico, sin ruidos agregados.', 'Percusión resonante en ambos campos pulmonares.'],
      teaching: [
        'Ausculta un ciclo respiratorio completo en cada punto y compara siempre lados simétricos.',
        'Murmullo vesicular normal: suave, inspiración más larga e intensa que la espiración.',
        'Ruidos cardíacos: S1 ("lub") marca el inicio de la sístole; S2 ("dub"), el cierre de válvulas aórtica y pulmonar.'
      ]
    },
    {
      id: 'c1', age: 74, sex: 'M', diag: 'Estenosis aórtica',
      complaint: 'Falta de aire al subir escaleras, presión en el pecho y un episodio de desmayo al esfuerzo.',
      vitals: 'FC 78 · PA 120/80 (presión de pulso estrecha)',
      heart: heart({ kind: 'sys_ejection', s2: 0.4, int: { AO: 1, PU: 0.6, ER: 0.8, TR: 0.45, MI: 0.45, CR: 0.8, CL: 0.55 } }),
      lung: { base: N, over: {} },
      truth: { heart: ['sys_ejection'], lung: ['vesicular'], adv: ['none'], perc: ['resonant'] },
      findings: ['Soplo sistólico eyectivo (en rombo), áspero, máximo en el foco aórtico.', 'Irradiación a las carótidas.', 'S2 disminuido (válvula aórtica rígida).', 'Pulmones normales.'],
      teaching: [
        'El soplo de estenosis aórtica es creciente-decreciente: cuanto más grave, más tardío es su pico.',
        'Prueba con el fonendoscopio en el foco aórtico y desliza hasta las carótidas: el soplo se transmite.',
        'Tríada clásica de síntomas: angina, síncope y disnea; el pulso carotídeo es lento y de poca amplitud (parvus et tardus).',
        'Causa más frecuente en mayores: calcificación degenerativa de la válvula.'
      ]
    },
    {
      id: 'c2', age: 58, sex: 'F', diag: 'Insuficiencia mitral',
      complaint: 'Cansancio y falta de aire al esfuerzo que han ido en aumento. Siente palpitaciones.',
      vitals: 'FC 88 irregular · PA 125/75',
      heart: heart({ rate: 88, kind: 'holosystolic', s1: 0.55, int: { MI: 1, AX: 0.85, TR: 0.5, ER: 0.45, PU: 0.25, AO: 0.2 } }),
      lung: { base: N, over: {} },
      truth: { heart: ['holosystolic'], lung: ['vesicular'], adv: ['none'], perc: ['resonant'] },
      findings: ['Soplo holosistólico, aspirativo-soplante, máximo en el foco mitral (ápex).', 'Irradiación a la axila izquierda.', 'S1 disminuido.'],
      teaching: [
        'Soplo "en meseta": ocupa toda la sístole porque la sangre regurgita hacia la aurícula desde el inicio.',
        'Ausculta el ápex y luego la axila izquierda: la irradiación es característica.',
        'Causas: prolapso de la válvula, enfermedad isquémica, endocarditis, enfermedad reumática.',
        'Valorar el tamaño del ventrículo izquierdo: el choque de la punta se desplaza hacia afuera y abajo.'
      ]
    },
    {
      id: 'c3', age: 41, sex: 'F', diag: 'Estenosis mitral',
      complaint: 'Falta de aire al esfuerzo y palpitaciones. De niña tuvo fiebre reumática.',
      vitals: 'FC 92 · PA 110/70',
      heart: heart({ rate: 92, kind: 'diastolic_rumble', s1: 1.5, snap: true, int: { MI: 1, TR: 0.5, ER: 0.3, AX: 0.3, PU: 0.15, AO: 0.1 } }),
      lung: { base: N, over: {} },
      truth: { heart: ['rumble'], lung: ['vesicular'], adv: ['none'], perc: ['resonant'] },
      findings: ['S1 intenso.', 'Chasquido de apertura poco después de S2.', 'Retumbo diastólico de baja frecuencia en el foco mitral con refuerzo presistólico.'],
      teaching: [
        'El retumbo es grave: se oye mejor con la campana (prueba el cambio de instrumento: con el diafragma casi desaparece).',
        'Técnica clásica: paciente en decúbito lateral izquierdo, ausculta el ápex al final de la espiración.',
        'El intervalo entre S2 y el chasquido es más corto cuanto más grave es la estenosis.',
        'Casi siempre es de origen reumático; si aparece fibrilación auricular, se pierde el refuerzo presistólico.'
      ]
    },
    {
      id: 'c4', age: 35, sex: 'M', diag: 'Insuficiencia aórtica',
      complaint: 'Latidos fuertes en el cuello, falta de aire al esfuerzo. Estatura alta y brazos largos.',
      vitals: 'FC 84 · PA 150/50 (presión de pulso amplia)',
      heart: heart({ rate: 84, kind: 'early_diastolic', s2: 0.6, int: { ER: 1, AO: 0.8, PU: 0.6, TR: 0.5, MI: 0.3, CR: 0.2 } }),
      lung: { base: N, over: {} },
      truth: { heart: ['early_diastolic'], lung: ['vesicular'], adv: ['none'], perc: ['resonant'] },
      findings: ['Soplo diastólico decreciente, aspirativo, de tono agudo, máximo en el borde esternal izquierdo (Erb).', 'S2 disminuido.', 'Pulmones normales.'],
      teaching: [
        'Soplo agudo, "soplante", que comienza justo después de S2: se oye mejor con el diafragma.',
        'Maniobra: paciente sentado e inclinado hacia delante, en espiración sostenida.',
        'Signos periféricos: presión de pulso amplia, pulso saltón (de Corrigan), latido de la úvula (Müller).',
        'Causas: dilatación de la raíz aórtica (Marfan, hipertensión), válvula bicúspide, endocarditis.'
      ]
    },
    {
      id: 'c5', age: 68, sex: 'M', diag: 'Insuficiencia cardíaca congestiva',
      complaint: 'Falta de aire que empeora al acostarse, hinchazón de los tobillos y aumento de peso.',
      vitals: 'FC 98 · FR 24 · PA 140/90 · SpO₂ 92 %',
      heart: heart({ rate: 98, s3: true }),
      lung: { base: N, over: only(['RB', 'LB', 'pRL', 'pRB', 'pLL', 'pLB'], { type: 'normal', adv: ['fine_crackles'], perc: 'resonant' }) },
      truth: { heart: ['s3'], lung: ['vesicular'], adv: ['crackles'], perc: ['resonant'] },
      findings: ['Tercer ruido (S3, galope ventricular) con taquicardia.', 'Crepitantes finos en ambas bases pulmonares.', 'Percusión resonante.'],
      teaching: [
        'El S3 es un ruido grave, protodiastólico (poco después de S2); se oye mejor en el ápex con la campana, en decúbito lateral izquierdo.',
        'Los crepitantes de la insuficiencia cardíaca son bilaterales, de predominio basal y cambian con la tos y la postura.',
        'Busca ingurgitación yugular, edemas maleolares y hepatomegalia para completar el síndrome.',
        'En un adulto, S3 casi siempre es patológico; en jóvenes sanos puede ser normal.'
      ]
    },
    {
      id: 'c6', age: 52, sex: 'M', diag: 'Neumonía lobar derecha (síndrome de condensación)',
      complaint: 'Fiebre de 39 °C, tos con expectoración amarillenta y dolor al respirar en la base derecha.',
      vitals: 'FC 105 · FR 26 · T 39,2 °C · SpO₂ 93 %',
      heart: heart({ rate: 105 }),
      lung: { base: N, over: only(['pRL', 'pRB', 'RB'], { type: 'bronchial', adv: ['fine_crackles'], perc: 'dull' }) },
      truth: { heart: ['normal'], lung: ['bronchial'], adv: ['crackles'], perc: ['dull'] },
      findings: ['Soplo tubárico (respiración bronquial) en la base derecha.', 'Crepitantes en la misma zona.', 'Matidez a la percusión en la base derecha.', 'Pulmón izquierdo normal.'],
      teaching: [
        'Síndrome de condensación: matidez + aumento de las vibraciones vocales + soplo tubárico + crepitantes (y egofonía).',
        'El soplo tubárico es parecido al sonido que se oye sobre la tráquea: espiración tan larga y audible como la inspiración.',
        'Compara siempre con el lado sano en el mismo nivel.',
        'La condensación transmite mejor los sonidos de las vías aéreas porque el parénquima ocupado por exudado conduce mejor el sonido.'
      ]
    },
    {
      id: 'c7', age: 24, sex: 'F', diag: 'Crisis asmática',
      complaint: 'Tos nocturna, opresión torácica y silbidos al respirar desde ayer. Antecedente de rinitis alérgica.',
      vitals: 'FC 108 · FR 24 · SpO₂ 94 %',
      heart: heart({ rate: 108 }),
      lung: { base: { type: 'normal', adv: ['wheeze'], perc: 'resonant' }, over: {} },
      truth: { heart: ['normal'], lung: ['vesicular'], adv: ['wheeze'], perc: ['resonant'] },
      findings: ['Sibilancias espiratorias difusas en ambos campos pulmonares.', 'Espiración prolongada.', 'Taquicardia sinusal.'],
      teaching: [
        'Las sibilancias son sonidos agudos y musicales por estrechamiento de la vía aérea; se oyen sobre todo en la espiración.',
        'Obstrucción reversible: mejoran con broncodilatadores.',
        'En una crisis muy grave puede haber "tórax silente": el flujo es tan bajo que las sibilancias desaparecen. Eso es una señal de alarma.',
        'Valora el uso de músculos accesorios, la capacidad de hablar y la saturación para graduar la crisis.'
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
      findings: ['Murmullo vesicular muy disminuido o abolido en la base izquierda.', 'Matidez "en tabla" a la percusión en la base izquierda.', 'Pulmón derecho normal.'],
      teaching: [
        'El líquido entre las pleuras atenúa la transmisión del sonido: murmullo vesicular disminuido y matidez pétrea.',
        'Las vibraciones vocales están disminuidas o abolidas sobre el derrame.',
        'En el límite superior del líquido puede aparecer un pequeño soplo tubárico (por el pulmón comprimido).',
        'Una radiografía o una ecografía confirman el diagnóstico; la toracocentesis orienta la causa.'
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
      findings: ['Murmullo vesicular abolido en todo el hemitórax derecho.', 'Hiperresonancia a la percusión del lado derecho.', 'Pulmón izquierdo normal.'],
      teaching: [
        'El aire en el espacio pleural aísla el pulmón de la pared: no se oye el murmullo vesicular y la percusión es hiperresonante (timpánica).',
        'Neumotórax espontáneo primario: típico en varones jóvenes, altos y delgados, a menudo fumadores.',
        'Si hay desviación de la tráquea, hipotensión e ingurgitación yugular, sospecha neumotórax a tensión: urgencia vital.',
        'Contrasta: derrame (mate, sin sonido) frente a neumotórax (hiperresonante, sin sonido).'
      ]
    },
    {
      id: 'c10', age: 70, sex: 'M', diag: 'EPOC (bronquitis crónica y enfisema)',
      complaint: 'Tos con expectoración todas las mañanas y falta de aire progresiva. Fumó 50 paquetes-año.',
      vitals: 'FC 92 · FR 22 · SpO₂ 90 %',
      heart: heart({ rate: 92 }),
      lung: { base: { type: 'diminished', adv: ['wheeze', 'rhonchi'], perc: 'hyper' }, over: {} },
      truth: { heart: ['normal'], lung: ['diminished'], adv: ['wheeze', 'rhonchi'], perc: ['hyper'] },
      findings: ['Murmullo vesicular disminuido de forma difusa.', 'Sibilancias y roncus con espiración prolongada.', 'Hiperresonancia a la percusión.'],
      teaching: [
        'Los roncus son graves y continuos (como un ronquido) y suelen cambiar o desaparecer con la tos; las sibilancias son agudas y musicales.',
        'El tórax "en tonel" y la hiperresonancia reflejan atrapamiento aéreo; los ruidos cardíacos se oyen más lejanos.',
        'La obstrucción es crónica y poco reversible, a diferencia del asma.',
        'Los pacientes pueden mostrar espiración con labios fruncidos y uso de músculos accesorios.'
      ]
    }
  ];
})();
