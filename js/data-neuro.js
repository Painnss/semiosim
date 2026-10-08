/* Casos de neurología. Todo es dato: para añadir un caso basta con agregar un objeto.
   reflexes: grado 0-4 por reflejo y lado (R = derecho, L = izquierdo).
   eyes: modelo del ojo (aff = vía aferente, eff = vía eferente, lim = rango de movimiento por dirección). */
(function () {
  'use strict';

  const rf = (biceps, triceps, brachio, patellar, achilles) => ({ biceps, triceps, brachio, patellar, achilles });
  const normalReflex = () => ({ R: rf(2, 2, 2, 2, 2), L: rf(2, 2, 2, 2, 2) });

  const eyes = mod => {
    const e = {
      aff: { R: 1, L: 1 },
      eff: { R: 1, L: 1 },
      base: { R: 11, L: 11 },
      ptosis: { R: 0, L: 0 },
      lim: { R: { abd: 1, add: 1, up: 1, down: 1 }, L: { abd: 1, add: 1, up: 1, down: 1 } },
      rest: { R: { a: 0, y: 0 }, L: { a: 0, y: 0 } },
      nyst: { R: false, L: false }
    };
    if (mod) mod(e);
    return e;
  };

  const feet = o => Object.assign({
    lost: { R: [], L: [] },
    vibLost: { R: false, L: false },
    ulcer: {},
    inspection: 'Piel de aspecto normal, sin lesiones, deformidades ni úlceras. Pulsos pedios presentes.'
  }, o || {});

  const distal = ['hallux', 't3', 't5', 'm1', 'm3', 'm5'];

  window.NEURO_CASES = [
    {
      id: 'n0', age: 31, sex: 'F', diag: 'Examen neurológico normal',
      complaint: 'Control médico previo a un empleo. Sin síntomas.',
      vitals: 'FC 70 · PA 112/70 · afebril',
      reflexes: normalReflex(), clonus: { R: false, L: false }, babinski: { R: false, L: false },
      feet: feet(), eyes: eyes(),
      findings: [
        'Reflejos osteotendinosos 2+ y simétricos en las cuatro extremidades.',
        'Respuesta plantar flexora bilateral, sin clonus.',
        'Sensibilidad y vibración conservadas en ambos pies.',
        'Pupilas isocóricas y fotorreactivas; movimientos oculares completos y conjugados.'
      ],
      teaching: [
        'Golpea con la cabeza del martillo y con el miembro relajado; compara siempre un lado con el otro.',
        'La asimetría de reflejos tiene más valor que el grado absoluto: hay personas sanas con reflejos vivos o apagados.',
        'Pupila normal: 3-4 mm, redonda, central y simétrica; reacciona directa y consensualmente.'
      ]
    },
    {
      id: 'n1', age: 68, sex: 'M', diag: 'ACV isquémico hemisférico izquierdo (síndrome de motoneurona superior derecho)',
      complaint: 'Desde hace 2 semanas, debilidad y torpeza en el brazo y la pierna derechos tras un ACV.',
      vitals: 'FC 84 · PA 150/90 · hipertenso conocido',
      reflexes: { R: rf(3, 3, 3, 3, 4), L: rf(2, 2, 2, 2, 2) },
      clonus: { R: true, L: false }, babinski: { R: true, L: false },
      feet: feet(), eyes: eyes(),
      findings: [
        'Hiperreflexia en el hemicuerpo derecho (3+ y aquíleo 4+) frente a reflejos normales a la izquierda.',
        'Clonus aquíleo derecho sostenido.',
        'Signo de Babinski derecho (extensión del hallux con apertura en abanico).'
      ],
      teaching: [
        'Triada de la lesión de motoneurona superior: hiperreflexia, espasticidad y signo de Babinski.',
        'La lesión es contralateral al déficit: hemiparesia derecha implica lesión del hemisferio izquierdo.',
        'En la fase aguda del ACV los reflejos pueden estar disminuidos (shock cerebral) y volverse hiperactivos con los días.',
        'Un clonus agotable (2-3 sacudidas) puede ser normal; el sostenido es patológico.'
      ]
    },
    {
      id: 'n2', age: 59, sex: 'M', diag: 'Polineuropatía diabética con úlcera neuropática',
      complaint: 'Diabético hace 15 años. Hormigueo y "pies dormidos". Refiere una herida en el pie derecho que no le duele.',
      vitals: 'FC 78 · PA 135/85 · glucemia 210 mg/dl',
      reflexes: { R: rf(2, 2, 2, 1, 0), L: rf(2, 2, 2, 1, 0) },
      clonus: { R: false, L: false }, babinski: { R: false, L: false },
      feet: feet({
        lost: { R: distal, L: distal }, vibLost: { R: true, L: true },
        ulcer: { R: 'm1' },
        inspection: 'Piel seca y fisurada. Callosidad con úlcera indolora bajo la cabeza del 1.er metatarsiano derecho. Vello escaso en el dorso.'
      }),
      eyes: eyes(),
      findings: [
        'Arreflexia aquílea bilateral y rotuliano disminuido (1+); reflejos de miembros superiores conservados.',
        'Pérdida de la sensibilidad al monofilamento en dedos y cabezas metatarsianas (patrón "en calcetín").',
        'Ausencia de sensibilidad vibratoria en el hallux.',
        'Úlcera plantar neuropática indolora bajo la cabeza del 1.er metatarsiano derecho.'
      ],
      teaching: [
        'Polineuropatía distal simétrica: se afectan primero las fibras más largas, por eso los reflejos se pierden de distal a proximal (primero el aquíleo).',
        'El monofilamento de 10 g es la prueba de cribado de riesgo de úlcera; revisa al menos 3 puntos por pie (cabezas de 1.º y 5.º metatarsiano y pulpejo del hallux).',
        'La pérdida de sensibilidad protectora, junto con deformidad y presión repetida, produce úlceras que el paciente no percibe.',
        'Al explorar siempre se inspecciona el pie completo: callosidades, fisuras, color, temperatura y pulsos.'
      ]
    },
    {
      id: 'n3', age: 54, sex: 'F', diag: 'Parálisis del III par craneal derecho',
      complaint: 'Cefalea intensa de aparición súbita y "se me cayó el párpado derecho". Ve doble.',
      vitals: 'FC 88 · PA 145/88',
      reflexes: normalReflex(), clonus: { R: false, L: false }, babinski: { R: false, L: false },
      feet: feet(),
      eyes: eyes(e => {
        e.eff.R = 0; e.base.R = 20; e.ptosis.R = 0.75;
        e.lim.R = { abd: 1, add: 0, up: 0, down: 0.3 };
        e.rest.R = { a: 0.55, y: 0.35 };
      }),
      findings: [
        'Ptosis completa del párpado derecho.',
        'Ojo derecho en posición "hacia abajo y hacia afuera" en reposo.',
        'Midriasis derecha sin respuesta a la luz (ni directa ni consensual al iluminar el ojo derecho).',
        'No aduce, no eleva y apenas desciende el ojo derecho.'
      ],
      teaching: [
        'Al iluminar el ojo derecho, el izquierdo se contrae (consensual): la vía aferente está sana y falla la eferente del III par derecho.',
        'La pupila dilatada indica afectación de las fibras parasimpáticas externas del III par: pensar en compresión (aneurisma de la comunicante posterior) y actuar como urgencia.',
        'En la oftalmoplejía isquémica diabética el III par suele respetar la pupila.',
        'Los músculos que quedan activos (recto lateral, VI par; oblicuo superior, IV par) explican la posición del ojo.'
      ]
    },
    {
      id: 'n4', age: 47, sex: 'M', diag: 'Parálisis del VI par craneal derecho',
      complaint: 'Visión doble horizontal que empeora al mirar hacia la derecha. Cefalea matutina.',
      vitals: 'FC 74 · PA 128/82',
      reflexes: normalReflex(), clonus: { R: false, L: false }, babinski: { R: false, L: false },
      feet: feet(),
      eyes: eyes(e => {
        e.lim.R = { abd: 0.05, add: 1, up: 1, down: 1 };
        e.rest.R = { a: -0.3, y: 0 };
      }),
      findings: [
        'El ojo derecho no abduce: se queda en la línea media al mirar a la derecha.',
        'Leve desviación del ojo derecho hacia la nariz en reposo (esotropía).',
        'Diplopía horizontal que aumenta al mirar hacia el lado afectado. Pupilas normales.'
      ],
      teaching: [
        'El VI par inerva únicamente el recto lateral; su parálisis impide la abducción.',
        'Tiene un trayecto intracraneal largo y es "falso localizador" en la hipertensión intracraneal.',
        'La diplopía horizontal es máxima en la dirección de acción del músculo paralizado.',
        'Causas habituales: microvascular (diabetes, hipertensión), traumatismo, hipertensión intracraneal, tumores.'
      ]
    },
    {
      id: 'n5', age: 27, sex: 'F', diag: 'Oftalmoplejía internuclear izquierda (esclerosis múltiple)',
      complaint: 'Visión doble ocasional al mirar a los lados. Episodio previo de hormigueo en las piernas.',
      vitals: 'FC 76 · PA 108/68',
      reflexes: { R: rf(2, 2, 2, 3, 3), L: rf(2, 2, 2, 3, 3) },
      clonus: { R: false, L: false }, babinski: { R: false, L: true },
      feet: feet(),
      eyes: eyes(e => {
        e.lim.L = { abd: 1, add: 0.1, up: 1, down: 1 };
        e.nyst.R = true;
      }),
      findings: [
        'Al mirar hacia la derecha del paciente, el ojo izquierdo no aduce.',
        'El ojo derecho (que abduce) muestra nistagmo en el extremo de la mirada.',
        'Hiperreflexia patelar y aquílea bilateral (3+) y Babinski izquierdo.'
      ],
      teaching: [
        'La lesión del fascículo longitudinal medial (FLM) interrumpe la conexión entre el VI par de un lado y el III par del lado contrario.',
        'El déficit de aducción está en el ojo del lado de la lesión; el nistagmo, en el ojo que abduce.',
        'La convergencia suele estar conservada, porque no usa el FLM.',
        'En adultos jóvenes sugiere esclerosis múltiple (a menudo bilateral); en mayores, un ACV de tronco.'
      ]
    },
    {
      id: 'n6', age: 63, sex: 'M', diag: 'Síndrome de Horner izquierdo',
      complaint: 'Su familia nota que el ojo izquierdo "se ve más pequeño". Fumador de 40 paquetes-año con dolor en el hombro izquierdo.',
      vitals: 'FC 80 · PA 130/80',
      reflexes: normalReflex(), clonus: { R: false, L: false }, babinski: { R: false, L: false },
      feet: feet(),
      eyes: eyes(e => { e.ptosis.L = 0.3; e.base.L = 6; }),
      findings: [
        'Ptosis leve del párpado superior izquierdo.',
        'Miosis izquierda (anisocoria), con reacción a la luz conservada.',
        'Movimientos oculares normales.'
      ],
      teaching: [
        'Tríada: ptosis leve, miosis y anhidrosis facial, todas ipsilaterales a la lesión de la vía simpática.',
        'La anisocoria es mayor en la oscuridad, porque la pupila afectada no se dilata bien.',
        'La ptosis es leve porque falla el músculo de Müller, no el elevador del párpado (que es del III par).',
        'Causas: tumor de vértice pulmonar (Pancoast), disección carotídea, ACV bulbar lateral. Este cuadro obliga a buscar la causa.'
      ]
    },
    {
      id: 'n7', age: 29, sex: 'F', diag: 'Neuritis óptica izquierda (defecto pupilar aferente relativo)',
      complaint: 'Pérdida de visión en el ojo izquierdo desde hace 3 días, con dolor al mover el ojo.',
      vitals: 'FC 72 · PA 110/70',
      reflexes: normalReflex(), clonus: { R: false, L: false }, babinski: { R: false, L: false },
      feet: feet(),
      eyes: eyes(e => { e.aff.L = 0.35; }),
      findings: [
        'Pupilas de igual tamaño en reposo.',
        'Al iluminar el ojo izquierdo, la constricción es débil en ambos ojos.',
        'Prueba de la linterna oscilante: al pasar la luz del ojo derecho al izquierdo, ambas pupilas se dilatan (Marcus Gunn).'
      ],
      teaching: [
        'El defecto pupilar aferente relativo (DPAR) indica lesión de la vía aferente: nervio óptico o retina extensa.',
        'En la prueba de la linterna oscilante, alterna la luz cada 2-3 segundos y observa la pupila que se ilumina.',
        'No hay anisocoria: ambas pupilas reciben la misma señal eferente, lo que cambia es cuánta señal llega.',
        'La neuritis óptica puede ser la primera manifestación de la esclerosis múltiple.'
      ]
    },
    {
      id: 'n8', age: 42, sex: 'M', diag: 'Radiculopatía S1 izquierda (hernia discal L5-S1)',
      complaint: 'Dolor lumbar que baja por la cara posterior de la pierna izquierda hasta el borde externo del pie, desde hace 3 semanas.',
      vitals: 'FC 70 · PA 120/76',
      reflexes: { R: rf(2, 2, 2, 2, 2), L: rf(2, 2, 2, 2, 0) },
      clonus: { R: false, L: false }, babinski: { R: false, L: false },
      feet: feet({
        lost: { R: [], L: ['t5', 'm5', 'mid', 'heel'] },
        inspection: 'Sin lesiones cutáneas. Dificultad para ponerse de puntillas sobre el pie izquierdo.'
      }),
      eyes: eyes(),
      findings: [
        'Reflejo aquíleo izquierdo abolido, con el derecho normal (asimetría).',
        'Pérdida de sensibilidad en el borde lateral, el talón y los dedos externos del pie izquierdo (dermatoma S1).',
        'Respuesta plantar flexora bilateral: no hay signos de motoneurona superior.'
      ],
      teaching: [
        'Una raíz comprometida da arreflexia en su nivel (S1 para el aquíleo) y déficit sensitivo en su dermatoma: es un síndrome de motoneurona inferior.',
        'Aquí la asimetría de reflejos es la pista principal: el derecho es normal y sirve de comparación.',
        'Pruebas complementarias en la clínica: Lasègue, marcha en puntillas y fuerza de flexión plantar.',
        'Compara con el caso del ACV: arreflexia con Babinski negativo (motoneurona inferior) frente a hiperreflexia con Babinski positivo (motoneurona superior).'
      ]
    }
  ];
})();
