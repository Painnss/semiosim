/* Casos de neurología. Todo es dato: para añadir un caso basta con agregar un objeto.
   reflexes: grado 0-4 por reflejo osteotendinoso y lado (R = derecho, L = izquierdo);
   escala de Argente-Álvarez: 0 arreflexia, 1+ hiporreflexia, 2+ normal, 3+ hiperreflexia, 4+ con clonus.
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
    inspection: 'Piel de aspecto y trofismo normales, sin lesiones, deformidades ni úlceras. Pulsos pedios palpables.'
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
        'Reflejos osteotendinosos 2+ y simétricos en los cuatro miembros.',
        'Reflejo cutáneo plantar flexor bilateral; sin clonus.',
        'Sensibilidad táctil (monofilamento) y palestesia conservadas en ambos pies.',
        'Pupilas isocóricas (2-4 mm), con reflejos fotomotor y consensual presentes; motilidad ocular completa y conjugada, sin diplopía.'
      ],
      teaching: [
        'Percute el tendón con el martillo dejándolo caer por su peso, con el miembro relajado y en semiflexión; compara siempre un lado con el otro.',
        'La asimetría de reflejos tiene más valor que el grado absoluto: hay personas sanas con reflejos vivos (3+) o apagados (1+) de forma simétrica.',
        'Si el reflejo no aparece, usa maniobras de facilitación (Jendrassik: tracción de las manos enganchadas) antes de hablar de arreflexia.',
        'Pupila normal: 2-4 mm, redonda, central y simétrica; se contrae con la luz directa (fotomotor) y al iluminar el otro ojo (consensual).'
      ]
    },
    {
      id: 'n1', age: 68, sex: 'M', diag: 'ACV isquémico hemisférico izquierdo (síndrome piramidal derecho)',
      complaint: 'Desde hace 2 semanas, debilidad y torpeza en el brazo y la pierna derechos tras un ACV.',
      vitals: 'FC 84 · PA 150/90 · hipertenso conocido',
      reflexes: { R: rf(3, 3, 3, 3, 4), L: rf(2, 2, 2, 2, 2) },
      clonus: { R: true, L: false }, babinski: { R: true, L: false },
      feet: feet(), eyes: eyes(),
      findings: [
        'Hiperreflexia en el hemicuerpo derecho (3+, con aquíleo 4+) frente a reflejos normales (2+) a la izquierda.',
        'Clonus de pie derecho inagotable.',
        'Signo de Babinski derecho (extensión del hallux con apertura en abanico de los demás dedos).'
      ],
      teaching: [
        'Síndrome piramidal (neurona motora superior): paresia, hipertonía espástica, hiperreflexia con clonus, signo de Babinski y abolición de los reflejos cutáneos abdominales.',
        'La lesión es contralateral al déficit: hemiparesia derecha implica lesión del hemisferio izquierdo.',
        'En la fase aguda del ACV puede haber hipotonía e hiporreflexia (fase de shock o diasquisis); la espasticidad y la hiperreflexia aparecen con los días o semanas.',
        'Un clonus agotable (2-3 sacudidas) puede ser normal en personas con reflejos vivos; el clonus inagotable es patológico.'
      ]
    },
    {
      id: 'n2', age: 59, sex: 'M', diag: 'Polineuropatía diabética con úlcera neuropática (mal perforante plantar)',
      complaint: 'Diabético hace 15 años. Hormigueo y "pies dormidos". Refiere una herida en el pie derecho que no le duele.',
      vitals: 'FC 78 · PA 135/85 · glucemia 210 mg/dl',
      reflexes: { R: rf(2, 2, 2, 1, 0), L: rf(2, 2, 2, 1, 0) },
      clonus: { R: false, L: false }, babinski: { R: false, L: false },
      feet: feet({
        lost: { R: distal, L: distal }, vibLost: { R: true, L: true },
        ulcer: { R: 'm1' },
        inspection: 'Piel seca y fisurada, con vello escaso en el dorso. Callosidad con úlcera indolora de bordes gruesos bajo la cabeza del 1.er metatarsiano derecho (mal perforante plantar). Pulsos pedios palpables.'
      }),
      eyes: eyes(),
      findings: [
        'Arreflexia aquílea bilateral e hiporreflexia rotuliana (1+); reflejos de los miembros superiores conservados.',
        'Hipoestesia táctil al monofilamento en los dedos y las cabezas metatarsianas de ambos pies, con conservación en el mediopié y el talón (distribución distal y simétrica, «en bota»).',
        'Apalestesia (ausencia de sensibilidad vibratoria) en ambos hallux: la sensibilidad profunda se pierde de forma temprana.',
        'Úlcera plantar neuropática indolora bajo la cabeza del 1.er metatarsiano derecho; sin clonus ni Babinski.'
      ],
      teaching: [
        'Síndrome de polineuropatía: déficit sensitivo (y luego motor) distal y simétrico, «en bota y guante», con hiporreflexia o arreflexia que empieza por el aquíleo, porque se afectan antes las fibras más largas.',
        'El monofilamento de 10 g (Semmes-Weinstein) es la prueba de cribado de pérdida de sensibilidad protectora: aplícalo hasta que se curve, 1-2 s, sin que el paciente mire, al menos en el pulpejo del hallux y en las cabezas del 1.º y 5.º metatarsianos.',
        'La pérdida de la sensibilidad protectora, junto con deformidades y presión repetida, produce úlceras que el paciente no percibe (mal perforante plantar).',
        'Explora siempre el pie completo: inspección (callosidades, fisuras, color, trofismo), temperatura y pulsos; la neuropatía suele coexistir con enfermedad arterial periférica.'
      ]
    },
    {
      id: 'n3', age: 54, sex: 'F', diag: 'Parálisis del III par craneal (motor ocular común) derecho',
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
        'Ptosis casi completa del párpado superior derecho (parálisis del elevador del párpado).',
        'Ojo derecho desviado «hacia abajo y hacia afuera» en reposo; no aduce, no eleva y apenas desciende.',
        'Midriasis derecha arreactiva: la pupila derecha no se contrae ni con la luz directa (fotomotor abolido) ni al iluminar el ojo izquierdo (consensual abolido).',
        'Al iluminar el ojo derecho, la pupila izquierda sí se contrae: la vía aferente derecha está sana; falla la eferente (III par).'
      ],
      teaching: [
        'Diferencia la vía aferente (II par) de la eferente (III par): en una lesión eferente, la pupila afectada no responde a ninguna luz, pero la del otro ojo responde cuando se ilumina el ojo enfermo.',
        'Las fibras pupilomotoras parasimpáticas viajan por la periferia del III par: una parálisis con midriasis sugiere compresión (aneurisma de la arteria comunicante posterior, herniación uncal) y es una urgencia.',
        'En la mononeuropatía isquémica (diabetes, hipertensión) el III par suele respetar la pupila.',
        'Los músculos que siguen activos explican la posición del ojo: el recto lateral (VI par) lo abduce y el oblicuo superior (IV par) lo deprime e intorsiona.'
      ]
    },
    {
      id: 'n4', age: 47, sex: 'M', diag: 'Parálisis del VI par craneal (motor ocular externo) derecho',
      complaint: 'Visión doble horizontal que empeora al mirar hacia la derecha. Cefalea matutina.',
      vitals: 'FC 74 · PA 128/82',
      reflexes: normalReflex(), clonus: { R: false, L: false }, babinski: { R: false, L: false },
      feet: feet(),
      eyes: eyes(e => {
        e.lim.R = { abd: 0.05, add: 1, up: 1, down: 1 };
        e.rest.R = { a: -0.3, y: 0 };
      }),
      findings: [
        'El ojo derecho no abduce: se queda en la línea media al mirar hacia la derecha.',
        'Leve desviación del ojo derecho hacia la nariz en reposo (estrabismo convergente).',
        'Diplopía horizontal que aumenta al mirar hacia el lado afectado. Pupilas normales, sin ptosis.'
      ],
      teaching: [
        'El VI par (motor ocular externo o abducens) inerva únicamente el recto lateral; su parálisis impide la abducción.',
        'Tiene un trayecto intracraneal largo y es un «falso signo localizador» en la hipertensión intracraneal (aquí, la cefalea matutina obliga a descartarla).',
        'La diplopía es máxima en la dirección de acción del músculo paralizado y las imágenes se separan en horizontal.',
        'Causas habituales: mononeuropatía microvascular (diabetes, hipertensión), traumatismo, hipertensión intracraneal, tumores de la base del cráneo.'
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
        'Hiperreflexia rotuliana y aquílea bilateral (3+) y signo de Babinski izquierdo: signos piramidales que apoyan una enfermedad desmielinizante.'
      ],
      teaching: [
        'La lesión del fascículo longitudinal medial (FLM) interrumpe la conexión entre el núcleo del VI par de un lado y el subnúcleo del recto medial (III par) del lado contrario.',
        'El déficit de aducción está en el ojo del lado de la lesión; el nistagmo, en el ojo que abduce.',
        'La convergencia suele estar conservada, porque no depende del FLM: eso la distingue de una paresia del recto medial por lesión del III par.',
        'En adultos jóvenes sugiere esclerosis múltiple (a menudo bilateral); en mayores, un ACV del tronco encefálico.'
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
        'Ptosis leve del párpado superior izquierdo (1-2 mm), con hendidura palpebral más estrecha que sugiere enoftalmos.',
        'Miosis izquierda (anisocoria), con reflejos fotomotor y consensual conservados.',
        'Motilidad ocular extrínseca normal, sin diplopía.'
      ],
      teaching: [
        'Tríada de Claude Bernard-Horner: ptosis leve, miosis y anhidrosis de la hemicara, todas del mismo lado que la lesión de la vía simpática.',
        'La anisocoria es mayor en la oscuridad, porque la pupila afectada no se dilata bien; la pupila sana es la que cambia de tamaño.',
        'La ptosis es leve porque falla el músculo tarsal superior (de Müller), de inervación simpática, y no el elevador del párpado (III par).',
        'Causas: tumor del vértice pulmonar (Pancoast), disección carotídea, ACV bulbar lateral (Wallenberg). En un fumador con dolor de hombro obliga a buscar un tumor del vértice.'
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
        'Pupilas isocóricas en reposo.',
        'Al iluminar el ojo izquierdo, la contracción es débil en ambas pupilas (fotomotor y consensual disminuidos).',
        'Prueba de la linterna oscilante: al pasar la luz del ojo derecho al izquierdo, ambas pupilas se dilatan (pupila de Marcus Gunn).'
      ],
      teaching: [
        'El defecto pupilar aferente relativo (DPAR) indica lesión de la vía aferente (II par): nervio óptico o retina de forma extensa.',
        'En la prueba de la linterna oscilante, alterna la luz cada 2-3 segundos y observa la pupila que se ilumina: la del lado enfermo se dilata de forma paradójica.',
        'No hay anisocoria: ambas pupilas reciben la misma señal eferente; lo que cambia es cuánta señal llega por cada nervio óptico.',
        'La neuritis óptica (dolor con los movimientos oculares, disminución de la agudeza visual y de la visión de los colores) puede ser la primera manifestación de la esclerosis múltiple.'
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
        inspection: 'Sin lesiones cutáneas ni atrofia evidente. Dificultad para ponerse de puntillas sobre el pie izquierdo (flexión plantar débil).'
      }),
      eyes: eyes(),
      findings: [
        'Reflejo aquíleo izquierdo abolido (0), con el derecho normal (2+): la asimetría es la clave.',
        'Hipoestesia en el borde externo del pie, el talón y el 5.º dedo izquierdos (dermatoma S1); hallux y mediopié interno conservados.',
        'Reflejo cutáneo plantar flexor bilateral, sin clonus: no hay signos de la vía piramidal.'
      ],
      teaching: [
        'Síndrome radicular: dolor irradiado por el dermatoma, hipoestesia en ese territorio, hiporreflexia o arreflexia del reflejo correspondiente (S1: aquíleo; L4: rotuliano) y, si hay compromiso motor, paresia y atrofia. Son signos de neurona motora inferior.',
        'Aquí la asimetría de reflejos es la pista principal: el lado derecho es normal y sirve de comparación.',
        'Maniobras complementarias: Lasègue (dolor radicular al elevar el miembro extendido entre 30 y 70°), marcha en puntillas (S1) y en talones (L5), fuerza de la flexión plantar.',
        'Compara con el caso del ACV: arreflexia con reflejo plantar flexor (neurona motora inferior) frente a hiperreflexia con signo de Babinski (neurona motora superior).'
      ]
    }
  ];
})();
