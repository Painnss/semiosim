/* Módulo "Aparato locomotor: patología". Reutiliza las escenas del módulo normal (js/mod-msk.js) a través de
   window.MskModule.mountWith(root, opts): mismas pestañas (examen articular y goniometría, columna y postura, fuerza,
   maniobras especiales y marcha), pero con 8 pacientes cuyos datos `msk` extendidos sustituyen los hallazgos normales:
     rom[movimiento] = { a, p, note, pnote?, say? }   topes activo/pasivo en grados, descripción del tope y queja del paciente
     path[clave]     = hallazgo por clave ('insp:<art>', 'palp:<art>', 'spine:look|palp:<región>', 'str:resist|tone|trophism:…',
                       'man:<maniobra>' positiva, 'gait:<modo>', 'gait:trend:<L|R>' positivo); { R:…, L:… } para un solo lado
     schober / las / fd con sus notas patológicas, gk (cinemática de la marcha) y overlay.posture (SVG extra en la postura).
   Nomenclatura de Argente-Álvarez (examen osteoarticular y muscular, columna, marcha). Lado: en Trendelenburg la clave 'L'
   es «levantar la pierna izquierda» (apoyo derecho). */
(function () {
  'use strict';

  /* ---------- pacientes ---------- */
  const PAT = [
    {
      id: 'm1', age: 42, sex: 'M', diag: 'Lumbociática por hernia discal L5-S1',
      complaint: 'Albañil. Hace 10 días, al levantar una bolsa de cemento, dolor lumbar agudo que en 48 h se irradió al glúteo, la cara posterior del muslo y la pantorrilla derechos hasta el borde externo del pie y el 5.º dedo. Empeora al toser y al sentarse; hormigueo en el pie derecho.',
      vitals: 'FC 82 · PA 130/84 · FR 16 · T 36,7 °C · SpO₂ 98 %', v: { height: 1.75, weight: 80 },
      msk: {
        g3d: { normal: 'm1', toe: 'toesR' },   // animación 3D de la marcha (js/gait3d.js) por modo; el resto usa la normal
        f: 0.96, las: 40, schober: 13.5, fd: 35, step: 48, cad: 92, perim: [31, 51, 35],
        lasNote: 'dolor lumbar que se irradia por la cara posterior del muslo y la pierna derechos hasta el pie (dolor radicular ciático, raíz S1) con la pierna extendida a 40°; también duele al elevar la pierna contralateral (Lasègue cruzado) a 70°.',
        bragardNote: 'al descender la pierna unos grados hasta que cede el dolor, la dorsiflexión pasiva del pie lo reproduce: confirma el origen radicular (tensión del ciático).',
        schoberNote: 'flexión lumbar limitada por el dolor y la contractura paravertebral (no por anquilosis).',
        fdNote: 'flexión del tronco detenida por dolor lumbar irradiado a la pierna derecha.',
        gk: { side: 'R', asym: 0.7, lean: 6, arm: 0.6 },
        rom: {
          'lu.flex': { a: 20, p: 25, note: 'dolor lumbar irradiado al miembro inferior derecho y contractura paravertebral; movimiento en bloque', say: 'Me tira por toda la pierna derecha' },
          'lu.ext': { a: 10, p: 12, note: 'dolor lumbar bajo, sin irradiación', say: 'Me aprieta abajo' },
          'lu.lat': { a: 15, p: 18, note: 'inclinación hacia la derecha dolorosa (cierra el agujero de conjunción); hacia la izquierda, 30°' },
          'lu.rot': { a: 20, p: 24, note: 'rotación limitada por contractura paravertebral' }
        },
        path: {
          'insp:lu': 'Actitud antálgica: rectificación de la lordosis lumbar y escoliosis antálgica con el tronco inclinado hacia la izquierda (se aleja de la raíz comprimida); se sienta sobre el glúteo izquierdo y se levanta apoyando las manos en los muslos.',
          'palp:lu': 'Contractura paravertebral lumbar bilateral, mayor a la derecha; dolor a la presión sobre la apófisis espinosa de L5 y el espacio L5-S1; dolor a la presión en la escotadura ciática derecha (punto de Valleix).',
          'spine:look:lumb': 'Lordosis lumbar rectificada (aplanada) por la contractura; el tronco se desvía hacia la izquierda (escoliosis antálgica).',
          'spine:look:pl_post': 'Plomada posterior: desde C7 cae 2-3 cm a la izquierda del pliegue interglúteo (escoliosis antálgica, no estructurada: desaparece al mejorar el dolor).',
          'spine:look:crestas': 'Crestas ilíacas niveladas; la pelvis no está basculada (la desviación es del tronco).',
          'spine:palp:paraR': 'Musculatura paravertebral derecha: contracturada, dura y dolorosa a la presión desde L3 hasta el sacro.',
          'spine:palp:paraL': 'Musculatura paravertebral izquierda: contractura moderada, menos dolorosa que la derecha.',
          'spine:palp:spine': { levels: { L5: 'dolorosa a la presión y a la puñopercusión; el dolor irradia al glúteo derecho.', S1: 'espacio L5-S1 doloroso a la presión.' } },
          'str:resist:gast': { R: { g: '4', txt: 'flexión plantar derecha debilitada (raíz S1): no logra ponerse en puntas de pie sobre el pie derecho más de 2-3 veces.' } },
          'str:resist:ham': { R: { g: '4', txt: 'flexión de la rodilla derecha algo débil y dolorosa en la cara posterior del muslo (S1).' } },
          'str:tone:leg': { R: 'tono normal; reflejo aquíleo derecho abolido (S1) con rotuliano conservado (L3-L4); hipoestesia táctil y dolorosa en el borde lateral del pie y el 5.º dedo (dermatoma S1).' },
          'str:trophism:leg': { R: 'pantorrilla derecha 33 cm frente a 34,5 cm la izquierda (atrofia leve del tríceps sural); muslo 51 cm simétrico; sin fasciculaciones.' },
          'gait:normal': { txt: 'Marcha antálgica: paso corto, apoyo breve y cauteloso sobre el miembro derecho, tronco rígido e inclinado hacia delante y a la izquierda, con escaso braceo.', exam: 'Marcha con apoyo breve del lado derecho y tronco rígido.' },
          'gait:toe': { txt: 'Marcha en puntas de pie: el talón derecho desciende a los pocos pasos (debilidad de los flexores plantares, S1).', exam: 'No sostiene la punta de pie derecha.' }
        }
      },
      findings: ['Lasègue positivo a 40° (dolor radicular S1) y Bragard positivo; Lasègue cruzado a 70°.', 'Hipoestesia en el dermatoma S1 (borde lateral del pie y 5.º dedo) y reflejo aquíleo derecho abolido.', 'Debilidad 4/5 de la flexión plantar (tríceps sural, S1); dificultad para la marcha en puntas de pie.', 'Actitud antálgica con escoliosis y rectificación lumbar; contractura paravertebral; Schober 13,5 cm limitado por dolor.', 'Marcha antálgica con apoyo breve del lado derecho.'],
      teaching: ['El síndrome de compresión radicular se reconoce por dolor que sigue un dermatoma, Lasègue positivo entre 30° y 70°, hipoestesia, debilidad del miotoma y abolición del reflejo correspondiente: S1 → aquíleo y flexión plantar; L5 → extensor del hallux y marcha en talones; L4 → rotuliano.', 'Bragard y Lasègue cruzado aumentan la especificidad: la tensión del ciático reproduce el dolor radicular, no el isquiotibial.', 'Schober y dedo-suelo reducidos por dolor no significan rigidez estructural: compara con la espondilitis anquilosante.'],
      quiz: [
        { q: 'En este paciente, el Lasègue despierta dolor irradiado hasta el pie a 40°. ¿Cómo se interpreta?', options: ['Negativo: la tensión aparece antes de 70°', 'Positivo: dolor radicular entre 30° y 70° (compresión L5-S1)', 'Positivo solo si aparece después de 70°', 'No es valorable sin flexionar la rodilla'], a: 1, why: 'El Lasègue es positivo cuando reproduce el dolor radicular (no la tensión isquiotibial) entre 30° y 70° de elevación.' },
        { q: 'El reflejo aquíleo abolido y la hipoestesia del borde lateral del pie señalan la raíz', options: ['L4', 'L5', 'S1', 'L3'], a: 2, why: 'S1: dermatoma del borde lateral del pie y 5.º dedo, reflejo aquíleo y flexión plantar (tríceps sural).' },
        { q: 'La maniobra de Bragard consiste en', options: ['Flexionar la rodilla con la cadera a 90°', 'Comprimir ambas crestas ilíacas', 'Percutir la apófisis espinosa de L5', 'Dorsiflexionar el pie con la pierna elevada justo por debajo del ángulo doloroso'], a: 3, why: 'Reproduce el dolor radicular por tensión del nervio ciático; confirma el origen radicular del Lasègue.' },
        { q: 'La escoliosis de este paciente', options: ['Es estructurada y requiere corsé', 'Indica dismetría de miembros', 'Es antálgica: desaparece al ceder el dolor y la contractura', 'Es congénita'], a: 2, why: 'La desviación antálgica del tronco se debe a la contractura paravertebral y aleja la raíz comprimida; no es una escoliosis estructurada.' },
        { q: '¿Qué marcha explora mejor el miotoma S1?', options: ['Marcha en talones', 'Marcha en puntas de pie', 'Marcha en tándem', 'Marcha con los ojos cerrados'], a: 1, why: 'Puntas de pie = flexores plantares (S1, nervio tibial); talones = dorsiflexores (L4-L5).' },
        { q: 'Un Schober de 13,5 cm en este paciente se explica por', options: ['Anquilosis de la columna lumbar', 'Limitación por dolor y contractura muscular', 'Hiperlaxitud', 'Una técnica incorrecta: debe medirse en decúbito'], a: 1, why: 'La flexión está frenada por el dolor radicular y la contractura, no por rigidez estructural (como en la espondilitis anquilosante).' }
      ]
    },
    {
      id: 'm2', age: 29, sex: 'M', diag: 'Espondilitis anquilosante',
      complaint: 'Dolor lumbar y glúteo alternante de 4 años de evolución, de tipo inflamatorio: despierta de madrugada, mejora al moverse y empeora con el reposo. Rigidez matinal de más de 1 hora. Episodios de uveítis anterior. HLA-B27 positivo.',
      vitals: 'FC 76 · PA 118/74 · FR 15 · T 36,8 °C · SpO₂ 98 %', v: { height: 1.72, weight: 68 },
      msk: {
        g3d: { normal: 'm2' },   // animación 3D de la marcha (js/gait3d.js) por modo; el resto usa la normal
        f: 0.92, las: 70, schober: 12, fd: 30, step: 55, cad: 100, perim: [28, 47, 33],
        schoberNote: 'rigidez lumbar por anquilosis incipiente (sin dolor radicular): típico de la espondilitis anquilosante.',
        fdNote: 'rigidez de la columna lumbar; las caderas compensan solo en parte.',
        gk: { lean: 10, arm: 0.4, ha: 0.85 },
        overlay: { posture: '<path d="M270 76 Q318 160 250 262 Q238 290 240 300" fill="none" stroke="#b3372f" stroke-width="5" stroke-linecap="round" stroke-dasharray="9 6" opacity=".75"/>' +
          '<path d="M300 44 L300 112" stroke="#b3372f" stroke-width="2" stroke-dasharray="4 3"/><text x="306" y="98" class="svg-small" style="fill:#b3372f">occipucio-pared 4 cm</text>' +
          '<text x="332" y="206" class="svg-small" style="fill:#b3372f;font-weight:600">cifosis dorsal acentuada</text><text x="332" y="222" class="svg-small" style="fill:#b3372f">lordosis lumbar rectificada</text>' },
        rom: {
          'lu.flex': { a: 15, p: 17, note: 'tope duro y precoz, sin dolor radicular: la columna se mueve en bloque (rigidez)', say: 'No bajo más; estoy tieso' },
          'lu.ext': { a: 5, p: 6, note: 'extensión casi abolida, tope duro' },
          'lu.lat': { a: 8, p: 10, note: 'inclinación lateral muy reducida y simétrica (dato precoz en la espondilitis anquilosante)' },
          'lu.rot': { a: 12, p: 14, note: 'rotación del tronco reducida; el tronco gira en bloque' },
          'ne.flex': { a: 30, p: 34, note: 'rigidez cervical; el mentón queda a 4 cm del esternón' },
          'ne.ext': { a: 25, p: 28, note: 'extensión cervical limitada, tope duro' },
          'ne.lat': { a: 20, p: 22, note: 'inclinación cervical reducida y simétrica' },
          'ne.rot': { a: 45, p: 50, note: 'rotación cervical limitada: para mirar hacia los lados gira todo el cuerpo' },
          'hi.flex': { a: 100, p: 105, note: 'leve limitación por coxitis bilateral (afectación de caderas en la espondilitis)' }
        },
        path: {
          'insp:lu': 'Cifosis dorsal acentuada con rectificación de la lordosis lumbar, hombros adelantados y abdomen prominente; postura "del esquiador" incipiente.',
          'palp:lu': 'Apófisis espinosas lumbares indoloras; dolor a la presión directa y a la compresión de ambas articulaciones sacroilíacas; expansión torácica de 1,5 cm (normal ≥ 5 cm, medida a nivel del 4.º espacio intercostal) por afectación costovertebral.',
          'insp:ne': 'Cabeza proyectada hacia delante: distancia occipucio-pared de 4 cm (normal 0 cm) con los talones y la espalda contra la pared.',
          'palp:ne': 'Apófisis espinosas cervicales indoloras; musculatura paravertebral con tono aumentado, sin puntos dolorosos.',
          'spine:look:cerv': 'Lordosis cervical disminuida con proyección anterior de la cabeza (occipucio-pared 4 cm).',
          'spine:look:dors': 'Cifosis dorsal acentuada (> 45°), rígida: no se corrige al pedir que se enderece.',
          'spine:look:lumb': 'Lordosis lumbar rectificada (aplanada): pérdida de la curvatura fisiológica.',
          'spine:look:pl_lat': 'Plomada lateral: el meato auditivo y el acromion caen por delante del trocánter; el centro de gravedad se adelanta.',
          'spine:look:venus': 'Hoyuelos de Venus simétricos; la región sacroilíaca está tumefacta de forma difusa.',
          'spine:palp:venus': 'Articulaciones sacroilíacas: dolor a la presión directa sobre ambas espinas ilíacas posterosuperiores y a la compresión lateral de la pelvis (sacroileítis bilateral).',
          'spine:palp:spine': { txt: 'indolora; al palpar mientras el paciente flexiona, las apófisis espinosas no se separan: la columna lumbar se mueve en bloque.' },
          'man:faber': { txt: 'dolor en ambas regiones sacroilíacas (glúteas), sin dolor inguinal: sacroileítis bilateral.' },
          'gait:normal': { txt: 'Marcha rígida: el tronco avanza en bloque, inclinado hacia delante y con la mirada dirigida al suelo; escaso braceo y pasos cortos; para mirar hacia los lados gira todo el cuerpo.', exam: 'Marcha rígida con tronco inclinado hacia delante y poco braceo.' }
        }
      },
      findings: ['Schober 10 → 12 cm (incremento de 2 cm; normal ≥ 15 cm): rigidez lumbar estructural.', 'Cifosis dorsal acentuada con rectificación lumbar; occipucio-pared 4 cm; dedo-suelo 30 cm.', 'Expansión torácica reducida (1,5 cm) por afectación costovertebral.', 'Limitación simétrica de todos los movimientos lumbares y cervicales, con tope duro y sin dolor radicular.', 'Dolor a la presión y compresión de ambas sacroilíacas; FABER positivo (dolor glúteo).'],
      teaching: ['Lumbalgia inflamatoria: inicio antes de los 40 años, insidiosa, rigidez matinal > 30-60 min, mejora con el ejercicio y no con el reposo, dolor nocturno.', 'Schober, inclinación lateral lumbar, occipucio-pared y expansión torácica son las medidas metrológicas de la espondilitis; se repiten en cada control para seguir la evolución.', 'La rigidez es simétrica y con tope duro (anquilosis), a diferencia de la limitación dolorosa y asimétrica de la lumbociática.'],
      quiz: [
        { q: 'Un Schober de 12 cm en este paciente indica', options: ['Normal', 'Rigidez lumbar: incremento < 4-5 cm', 'Hipermovilidad', 'Que la marca inicial estaba mal colocada'], a: 1, why: 'Desde 10 cm en bipedestación, la distancia debe llegar a ≥ 15 cm; 12 cm (+2 cm) revela rigidez lumbar.' },
        { q: '¿Qué característica del dolor lumbar orienta a espondilitis anquilosante?', options: ['Empeora con el movimiento y mejora con el reposo', 'Se irradia por debajo de la rodilla', 'Aparece tras un esfuerzo de carga', 'Mejora con el ejercicio, empeora en reposo y despierta de madrugada'], a: 3, why: 'Es el patrón de dolor inflamatorio, con rigidez matinal prolongada, en un paciente joven.' },
        { q: 'La expansión torácica normal medida a nivel del 4.º espacio intercostal es', options: ['≥ 5 cm', '1-2 cm', '≥ 10 cm', 'No se mide en el examen locomotor'], a: 0, why: 'La afectación costovertebral de la espondilitis la reduce (aquí 1,5 cm).' },
        { q: 'La distancia occipucio-pared de 4 cm traduce', options: ['Lordosis cervical aumentada', 'Cifosis dorsal con proyección anterior de la cabeza', 'Tortícolis', 'Dismetría de miembros'], a: 1, why: 'Con talones y espalda contra la pared, el occipucio normalmente la toca (0 cm).' },
        { q: 'El FABER de este paciente provoca dolor glúteo bilateral. Esto sugiere', options: ['Coxartrosis', 'Sacroileítis', 'Lesión del psoas', 'Bursitis trocantérea'], a: 1, why: 'El dolor inguinal apunta a la cadera; el dolor sacro/glúteo, a la articulación sacroilíaca.' },
        { q: 'La sensación terminal al explorar la movilidad lumbar de este paciente es', options: ['Blanda, por aproximación de partes blandas', 'Firme y dolorosa con irradiación a la pierna', 'Dura y precoz, sin dolor radicular (anquilosis)', 'Elástica, con rebote'], a: 2, why: 'La anquilosis da un tope duro y simétrico; la hernia discal, un tope doloroso con irradiación.' }
      ]
    },
    {
      id: 'm3', age: 68, sex: 'F', diag: 'Gonartrosis',
      complaint: 'Dolor en la rodilla derecha de 3 años de evolución, mecánico: aparece al caminar, al subir y bajar escaleras y al levantarse de la silla; cede con el reposo. Rigidez de pocos minutos al iniciar la marcha. Sensación de crujidos. Obesidad (IMC 29,6).',
      vitals: 'FC 74 · PA 138/86 · FR 15 · T 36,5 °C · SpO₂ 97 %', v: { height: 1.58, weight: 74 },
      msk: {
        g3d: { normal: 'm3', tandem: 'tandIns' },   // animación 3D de la marcha (js/gait3d.js) por modo; el resto usa la normal
        f: 0.93, las: 75, schober: 15.5, fd: 10, step: 50, cad: 96, perim: [28, 45, 35],
        gk: { side: 'R', kf: 0.6, asym: 0.85 },
        rom: {
          'kn.flex': { a: 95, p: 105, note: 'crepitación gruesa palpable y audible durante todo el recorrido; dolor en la interlínea medial al final; tope firme', pnote: 'pasivamente gana unos grados, con crepitación y dolor', say: 'Me cruje y me duele por dentro' },
          'kn.ext': { a: 0, p: 0, note: 'no alcanza la extensión completa: déficit de extensión de 5-10° (flexo de rodilla)', say: 'No la puedo estirar del todo' },
          'hi.ir': { a: 30, p: 34, note: 'rotación interna de cadera levemente reducida por la edad; cadera indolora (descarta coxartrosis como origen del dolor)' }
        },
        path: {
          'insp:kn': 'Genu varo bilateral, mayor a la derecha ("piernas en paréntesis"), con aumento de volumen de la rodilla derecha por engrosamiento óseo y derrame leve (borramiento de los fondos de saco pararrotulianos); atrofia del cuádriceps derecho; sin eritema.',
          'palp:kn': 'Crepitación gruesa al movilizar la rodilla; dolor en la interlínea femorotibial medial y sobre los osteofitos del borde articular; signo de la onda positivo (derrame leve), peloteo rotuliano negativo; sin calor marcado.',
          'str:resist:quad': { R: { g: '4', txt: 'extensión de la rodilla derecha debilitada e inhibida por el dolor; contracción palpable pero menor que la izquierda.' } },
          'str:trophism:leg': { R: 'muslo derecho 42 cm frente a 45 cm el izquierdo (atrofia del cuádriceps de 3 cm por desuso); pantorrillas simétricas de 35 cm.' },
          'man:pelot': { txt: 'peloteo rotuliano negativo (la rótula no "choca"), pero al vaciar el fondo de saco medial y comprimir el lateral se observa la onda líquida (signo de la onda): derrame leve.' },
          'man:mcm': { txt: 'dolor en la interlínea medial al extender con rotación externa, sin chasquido ni bloqueo: sugiere artrosis del compartimento medial más que lesión meniscal.' },
          'gait:normal': { txt: 'Marcha lenta con claudicación leve del miembro derecho (apoyo acortado) y rodilla derecha en ligera flexión durante el apoyo, sin extensión completa; se ayuda del pasamanos para bajar escaleras.', exam: 'Marcha lenta con apoyo acortado del lado derecho y rodilla semiflexionada.' },
          'gait:tandem': { txt: 'Marcha en tándem posible pero insegura por la inestabilidad de la rodilla derecha; sin ataxia.', exam: 'Tándem insegura por la rodilla derecha.' }
        }
      },
      findings: ['Dolor mecánico de rodilla con rigidez breve (< 30 min) y crepitación gruesa.', 'Flexión limitada a 95° (activa) con déficit de extensión; genu varo.', 'Derrame leve: signo de la onda positivo, peloteo rotuliano negativo.', 'Atrofia del cuádriceps (3 cm) y fuerza 4/5; marcha claudicante lenta.', 'Cadera indolora con rotación interna conservada (el dolor no es referido de la cadera).'],
      teaching: ['Dolor mecánico (con el uso, cede con el reposo, rigidez < 30 min) frente a dolor inflamatorio (en reposo, rigidez > 1 h).', 'Derrame articular: leve → signo de la onda; moderado o importante → peloteo rotuliano.', 'Siempre explora la cadera ante un dolor de rodilla: la coxartrosis puede referir dolor a la rodilla.'],
      quiz: [
        { q: 'El derrame de esta paciente se detecta por el signo de la onda y no por el peloteo rotuliano. Esto indica', options: ['Derrame importante', 'Derrame leve', 'Hemartrosis', 'Ausencia de derrame'], a: 1, why: 'El peloteo requiere un derrame moderado-importante; la onda líquida detecta cantidades pequeñas.' },
        { q: 'El "genu varo" se describe como', options: ['Rodillas que se juntan (en X)', 'Hiperextensión de la rodilla', 'Rótula lateralizada', 'Rodillas separadas con las piernas en paréntesis'], a: 3, why: 'Varo: el segmento distal se desvía hacia la línea media; típico de la artrosis del compartimento medial.' },
        { q: 'La rigidez matinal en la artrosis', options: ['Dura más de 1 hora', 'Dura pocos minutos (< 30 min)', 'No existe', 'Es nocturna'], a: 1, why: 'Rigidez breve tras el reposo ("de puesta en marcha"); en la artritis reumatoide supera 1 hora.' },
        { q: 'La crepitación gruesa de esta rodilla se debe a', options: ['Aire en la articulación', 'Rotura meniscal', 'Un cuerpo libre', 'Fricción de superficies articulares irregulares (pérdida de cartílago, osteofitos)'], a: 3, why: 'Se palpa y a veces se oye durante el movimiento; refleja el daño del cartílago.' },
        { q: 'Antes de atribuir el dolor a la rodilla conviene explorar', options: ['El tobillo', 'La cadera homolateral (dolor referido de la coxartrosis)', 'La columna cervical', 'La muñeca'], a: 1, why: 'La coxartrosis refiere dolor a la cara anterior del muslo y la rodilla; aquí la cadera es indolora.' },
        { q: 'La fuerza del cuádriceps 4/5 con muslo 3 cm menor indica', options: ['Atrofia por desuso e inhibición dolorosa', 'Lesión del nervio femoral', 'Miopatía', 'Rotura del tendón rotuliano'], a: 0, why: 'Sin déficit neurológico, el dolor y el desuso explican la atrofia y la debilidad.' }
      ]
    },
    {
      id: 'm4', age: 24, sex: 'M', diag: 'Rotura del ligamento cruzado anterior',
      complaint: 'Futbolista. Ayer, al cambiar de dirección con el pie izquierdo apoyado, sintió un "chasquido" en la rodilla y cayó; dolor inmediato e hinchazón en las primeras 2 horas. No pudo seguir jugando; sensación de que la rodilla "se le va" al apoyar.',
      vitals: 'FC 70 · PA 120/76 · FR 14 · T 36,6 °C · SpO₂ 99 %', v: { height: 1.80, weight: 78 },
      msk: {
        g3d: { normal: 'm4', tandem: 'tandIns' },   // animación 3D de la marcha (js/gait3d.js) por modo; el resto usa la normal
        f: 0.98, las: 90, schober: 17, fd: 0, step: 60, cad: 100, perim: [31, 54, 38],
        gk: { side: 'L', asym: 0.8, kf: 0.75 },
        rom: {
          'kn.flex': { a: 110, p: 120, note: 'limitada por el derrame a tensión y el dolor; tope blando-elástico', say: 'Está hinchada, no la puedo doblar más' },
          'kn.ext': { a: 0, p: 0, note: 'extensión completa dolorosa; sin bloqueo mecánico' }
        },
        path: {
          'insp:kn': 'Rodilla izquierda globulosa con derrame a tensión (hemartrosis de aparición en las primeras horas), borramiento de los contornos y de los fondos de saco pararrotulianos; equimosis incipiente; apoya con la rodilla semiflexionada.',
          'palp:kn': 'Derrame a tensión con peloteo rotuliano positivo; calor local; dolor en la interlínea medial y en la cara posterolateral; ligamentos colaterales indoloros y estables.',
          'str:resist:quad': { L: { g: '4', txt: 'extensión de la rodilla inhibida por el dolor y el derrame; sin déficit neurológico.', say: 'Me duele al estirar' } },
          'man:lachman': { txt: 'traslación anterior de la tibia aumentada (> 5 mm respecto de la rodilla derecha) con tope final blando o ausente: es la prueba más sensible para la rotura del LCA.', say: 'Se me va hacia delante' },
          'man:drawA': { txt: 'cajón anterior positivo: la tibia se desplaza hacia delante sin tope firme, a diferencia de la rodilla derecha; el cajón posterior es negativo.' },
          'man:pelot': { txt: 'la rótula "flota" y choca contra el fémur al presionarla: derrame articular importante (hemartrosis).' },
          'gait:normal': { txt: 'Marcha antálgica con apoyo breve del miembro izquierdo y rodilla semiflexionada; evita la extensión completa y refiere inestabilidad al girar.', exam: 'Apoyo breve del lado izquierdo con rodilla semiflexionada.' },
          'gait:tandem': { txt: 'Marcha en tándem insegura por inestabilidad y dolor de la rodilla izquierda; sin ataxia.', exam: 'Tándem insegura por la rodilla izquierda.' }
        }
      },
      findings: ['Hemartrosis precoz (derrame a tensión en < 2 h) tras un mecanismo de giro con el pie fijo.', 'Lachman positivo (traslación anterior aumentada, tope blando) y cajón anterior positivo; cajón posterior negativo.', 'Peloteo rotuliano positivo; flexión limitada a 110° por el derrame.', 'Colaterales estables (bostezo negativo); sin bloqueo mecánico.', 'Marcha antálgica e inestabilidad subjetiva.'],
      teaching: ['Lachman (20-30° de flexión) es más sensible que el cajón anterior (90°) porque los isquiotibiales no bloquean la traslación; compara siempre con la rodilla sana.', 'La hemartrosis que aparece en pocas horas sugiere lesión del LCA, fractura osteocondral o luxación rotuliana; el derrame que tarda 12-24 h es más típico de las lesiones meniscales.', 'El tope final (firme vs blando) importa tanto como la magnitud de la traslación.'],
      quiz: [
        { q: 'La prueba más sensible para la rotura del LCA es', options: ['Cajón posterior', 'Lachman', 'McMurray', 'Bostezo en valgo'], a: 1, why: 'Se realiza a 20-30° de flexión, con los isquiotibiales relajados; busca traslación anterior con tope blando.' },
        { q: 'Un derrame que aparece en las 2 primeras horas tras un traumatismo de rodilla sugiere', options: ['Lesión meniscal degenerativa', 'Hemartrosis (LCA, fractura osteocondral, luxación rotuliana)', 'Artrosis', 'Bursitis prerrotuliana'], a: 1, why: 'La sangre llena la articulación rápidamente; el derrame sinovial tarda más.' },
        { q: 'El cajón anterior se explora con la rodilla a', options: ['90° con el pie fijo', '0°', '20-30°', '135°'], a: 0, why: 'Supino, cadera a 45° y rodilla a 90°; el examinador se sienta sobre el pie y tracciona la tibia hacia delante.' },
        { q: 'El peloteo rotuliano positivo indica', options: ['Derrame moderado-importante', 'Luxación de rótula', 'Condromalacia', 'Rotura del tendón rotuliano'], a: 0, why: 'La rótula flota sobre el líquido y choca contra el fémur al presionarla.' },
        { q: 'En este paciente el bostezo en valgo es negativo. Eso significa que', options: ['El LCA está íntegro', 'El ligamento colateral medial está íntegro', 'Los meniscos están sanos', 'Hay rotura del LCP'], a: 1, why: 'El estrés en valgo explora el colateral medial; el varo, el lateral.' },
        { q: 'El "tope blando" al final del Lachman', options: ['Es normal en deportistas', 'Indica que el LCA no frena la traslación', 'Indica lesión del colateral lateral', 'Se debe al derrame'], a: 1, why: 'Normalmente el LCA detiene la traslación con un tope firme y neto.' }
      ]
    },
    {
      id: 'm5', age: 55, sex: 'M', diag: 'Hombro doloroso por tendinopatía del manguito rotador',
      complaint: 'Pintor. Dolor en la cara anterolateral del hombro derecho de 4 meses, que empeora al trabajar con los brazos por encima de la cabeza y por la noche al apoyarse sobre ese lado. Dificultad para peinarse y para alcanzar el bolsillo trasero.',
      vitals: 'FC 72 · PA 128/80 · FR 15 · T 36,6 °C · SpO₂ 98 %', v: { height: 1.74, weight: 82 },
      msk: {
        f: 0.95, las: 80, schober: 16, fd: 5, step: 68, cad: 108, perim: [30, 50, 36],
        rom: {
          'sh.abd': { a: 120, p: 165, note: 'arco doloroso entre 60° y 120°; el paciente "encoge" el hombro (sustitución escapular) y se detiene', pnote: 'pasivamente llega más lejos, con dolor al atravesar el arco 60-120° y alivio por encima', say: 'Ahí, a mitad de camino, me duele' },
          'sh.flex': { a: 150, p: 170, note: 'dolor al final del recorrido en la cara anterolateral del hombro' },
          'sh.er': { a: 60, p: 70, note: 'rotación externa algo limitada y dolorosa' },
          'sh.ir': { a: 50, p: 60, note: 'rotación interna limitada: por detrás de la espalda la mano llega a L5 (lado sano: T7)', say: 'No llego más atrás' }
        },
        path: {
          'insp:sh': 'Leve atrofia de la fosa supraespinosa derecha; contornos conservados, sin tumefacción ni deformidad; al elevar el brazo "encoge" el hombro (ritmo escapulohumeral alterado).',
          'palp:sh': 'Dolor a la presión sobre el troquíter (inserción del supraespinoso) y bajo el borde anterolateral del acromion; crepitación subacromial al abducir; corredera bicipital poco dolorosa; articulación acromioclavicular indolora.',
          'str:resist:delt': { R: { g: '4', txt: 'abducción dolorosa y algo débil por inhibición dolorosa del supraespinoso; el deltoides en sí está conservado.', say: 'Me duele al sostenerlo' } },
          'str:trophism:arm': { R: 'brazo 30 cm simétrico; leve atrofia de la fosa supraespinosa derecha (desuso del supraespinoso).' },
          'man:neer': { txt: 'dolor en la cara anterolateral del hombro al elevar pasivamente el brazo en rotación interna por encima de 120°: pinzamiento subacromial.', say: '¡Ay!' },
          'man:hawkins': { txt: 'dolor con la rotación interna forzada a 90° de flexión: pinzamiento del supraespinoso bajo el ligamento coracoacromial.' },
          'man:jobe': { txt: 'dolor y debilidad (4/5) al resistir la abducción en "lata vacía": tendinopatía o rotura parcial del supraespinoso.', say: 'No puedo aguantarlo' }
        }
      },
      findings: ['Arco doloroso de abducción entre 60° y 120°, con movilidad pasiva mayor que la activa.', 'Neer, Hawkins y Jobe positivos (pinzamiento subacromial y supraespinoso).', 'Dolor a la presión en el troquíter y bajo el acromion; leve atrofia de la fosa supraespinosa.', 'Rotación interna limitada (mano a L5) y rotación externa dolorosa.', 'Speed negativo: el tendón del bíceps no es el origen principal.'],
      teaching: ['Movilidad pasiva conservada con activa limitada y dolorosa apunta a tendón o músculo (manguito), no a la articulación; si ambas están limitadas, piensa en capsulitis adhesiva (hombro congelado) o artrosis.', 'El arco doloroso 60-120° es característico del pinzamiento subacromial: el troquíter pasa bajo el acromion.', 'Neer y Hawkins provocan el pinzamiento; Jobe explora el supraespinoso; Speed, la porción larga del bíceps.'],
      quiz: [
        { q: 'El arco doloroso de 60° a 120° de abducción es característico de', options: ['Capsulitis adhesiva', 'Pinzamiento subacromial (manguito rotador)', 'Artrosis acromioclavicular', 'Luxación recidivante'], a: 1, why: 'En ese arco el troquíter y el supraespinoso pasan bajo el arco coracoacromial.' },
        { q: 'En este paciente la movilidad pasiva supera ampliamente a la activa. Esto sugiere', options: ['Rigidez capsular', 'Lesión tendinosa o muscular con articulación libre', 'Fractura', 'Simulación'], a: 1, why: 'La cápsula permite el movimiento; el dolor y la debilidad del tendón limitan el movimiento activo.' },
        { q: 'La maniobra de Jobe ("lata vacía") explora', options: ['El supraespinoso', 'La porción larga del bíceps', 'El subescapular', 'La articulación acromioclavicular'], a: 0, why: 'Abducción de 90° en el plano escapular con rotación interna, contra resistencia hacia abajo.' },
        { q: 'La maniobra de Neer consiste en', options: ['Rotación interna forzada a 90° de flexión', 'Elevación pasiva forzada del brazo con la escápula fija', 'Flexión resistida con el codo extendido y supinado', 'Abducción resistida a 90°'], a: 1, why: 'Provoca el choque del troquíter contra el acromion; Hawkins es la rotación interna forzada.' },
        { q: 'La mano del paciente llega a L5 por detrás de la espalda, y en el lado sano a T7. Esto mide', options: ['La rotación interna', 'La rotación externa', 'La abducción', 'La extensión del codo'], a: 0, why: 'La mano a la espalda combina rotación interna, extensión y aducción; se compara el nivel vertebral alcanzado.' },
        { q: 'Si la movilidad activa y la pasiva estuvieran igualmente limitadas en todas las direcciones, se pensaría en', options: ['Tendinopatía del manguito', 'Capsulitis adhesiva (hombro congelado)', 'Epicondilitis', 'Síndrome del túnel carpiano'], a: 1, why: 'La limitación global y pasiva es propia de la cápsula articular.' }
      ]
    },
    {
      id: 'm6', age: 48, sex: 'F', diag: 'Síndrome del túnel carpiano',
      complaint: 'Trabajadora de limpieza, hipotiroidea. Hormigueos y dolor en el pulgar, el índice y el dedo medio de la mano derecha desde hace 6 meses, sobre todo por la noche (se despierta y "sacude" la mano para aliviarse) y al sostener el volante o el teléfono. Últimamente se le caen los objetos.',
      vitals: 'FC 70 · PA 124/78 · FR 14 · T 36,5 °C · SpO₂ 98 %', v: { height: 1.62, weight: 70 },
      msk: {
        f: 0.96, las: 80, schober: 16, fd: 4, step: 64, cad: 110, perim: [27, 49, 35],
        path: {
          'insp:wr': 'Mano derecha: aplanamiento de la eminencia tenar (atrofia del abductor corto y del oponente del pulgar); sin tumefacción articular ni deformidades; piel seca en los pulpejos de los tres primeros dedos.',
          'palp:wr': 'Sin sinovitis ni dolor en la interlínea radiocarpiana; molestia a la presión sobre el retináculo flexor (cara palmar de la muñeca); tabaquera anatómica y estiloides radial indoloras.',
          'str:tone:arm': { R: 'tono normal; hipoestesia táctil y dolorosa en el pulgar, el índice, el medio y la mitad radial del anular (territorio del nervio mediano), con el meñique conservado; sensibilidad del dorso de la mano conservada (rama sensitiva dorsal, previa al túnel).' },
          'str:trophism:arm': { R: 'brazo 27 cm simétrico; atrofia de la eminencia tenar derecha con oposición y abducción del pulgar debilitadas (4/5); eminencia hipotenar e interóseos conservados.' },
          'man:phalen': { txt: 'parestesias en el pulgar, el índice y el medio a los 30 s de flexión máxima de las muñecas (positivo antes de 60 s).', say: 'Se me duermen los dedos' },
          'man:tinel': { txt: 'descarga eléctrica que irradia a los tres primeros dedos al percutir el nervio mediano en la cara palmar de la muñeca.', say: '¡Como un calambre!' }
        }
      },
      findings: ['Parestesias nocturnas en el territorio del mediano (pulgar, índice, medio y mitad radial del anular) que alivian al sacudir la mano.', 'Phalen positivo a los 30 s y Tinel positivo sobre el túnel carpiano.', 'Hipoestesia en el territorio palmar del mediano con sensibilidad conservada en el meñique y el dorso de la mano.', 'Atrofia de la eminencia tenar con debilidad de la abducción y la oposición del pulgar (4/5).', 'Sin sinovitis de muñeca; Finkelstein negativo.'],
      teaching: ['El túnel carpiano comprime el nervio mediano: síntomas sensitivos en los tres primeros dedos y medio anular, y motores en la eminencia tenar (abductor corto, oponente); el meñique y el dorso de la mano se respetan.', 'Phalen (flexión máxima 60 s) y Tinel (percusión) son las maniobras de provocación; su negatividad no excluye el síndrome.', 'Factores asociados: trabajo manual repetitivo, hipotiroidismo, embarazo, diabetes, artritis reumatoide.'],
      quiz: [
        { q: 'El Phalen es positivo cuando', options: ['Aparece dolor en la estiloides radial', 'Aparecen parestesias en el territorio del mediano antes de 60 s de flexión máxima', 'Se produce un chasquido en la muñeca', 'Duele al extender la muñeca contra resistencia'], a: 1, why: 'La flexión mantenida aumenta la presión dentro del túnel carpiano.' },
        { q: '¿Qué dedo queda respetado en el síndrome del túnel carpiano?', options: ['Pulgar', 'Índice', 'Dedo medio', 'Meñique'], a: 3, why: 'El meñique y la mitad cubital del anular dependen del nervio cubital.' },
        { q: 'La atrofia de la eminencia tenar en esta paciente se debe a', options: ['Compresión del nervio cubital en el codo', 'Denervación del abductor corto y el oponente del pulgar (nervio mediano)', 'Artrosis trapeciometacarpiana', 'Tenosinovitis de De Quervain'], a: 1, why: 'Son los músculos tenares inervados por el mediano tras atravesar el túnel.' },
        { q: 'La sensibilidad del dorso de la mano se conserva porque', options: ['El mediano no da ramas sensitivas', 'La rama sensitiva palmar/dorsal correspondiente nace antes del túnel o depende del radial', 'Hay compensación del cubital', 'El túnel solo comprime fibras motoras'], a: 1, why: 'El dorso radial de la mano lo inerva el radial; la rama cutánea palmar del mediano se origina proximal al túnel.' },
        { q: 'El Finkelstein negativo descarta en esta paciente', options: ['Tenosinovitis de De Quervain', 'Túnel carpiano', 'Epicondilitis', 'Artritis reumatoide'], a: 0, why: 'Finkelstein (desviación cubital con el pulgar dentro del puño) explora el 1.er compartimento extensor.' },
        { q: 'Un signo de Tinel positivo consiste en', options: ['Dolor a la presión sobre la tabaquera anatómica', 'Parestesias irradiadas a los dedos al percutir el trayecto del nervio', 'Debilidad al oponer el pulgar', 'Palidez de los dedos al elevar la mano'], a: 1, why: 'Traduce irritabilidad del nervio en el sitio de compresión o regeneración.' }
      ]
    },
    {
      id: 'm7', age: 52, sex: 'F', diag: 'Artritis reumatoide',
      complaint: 'Dolor y tumefacción de ambas muñecas y de los nudillos de ambas manos desde hace 8 meses, simétricos, con rigidez matinal de más de 1 hora que mejora con la actividad. Astenia, pérdida de 3 kg. Le cuesta abrir frascos y abrocharse.',
      vitals: 'FC 84 · PA 122/76 · FR 16 · T 37,2 °C · SpO₂ 98 %', v: { height: 1.60, weight: 58 },
      msk: {
        g3d: { normal: 'm7' },   // animación 3D de la marcha (js/gait3d.js) por modo; el resto usa la normal
        f: 0.92, las: 80, schober: 16, fd: 6, step: 60, cad: 106, perim: [25, 45, 33],
        rom: {
          'wr.flex': { a: 45, p: 50, note: 'limitación dolorosa por sinovitis radiocarpiana; tope blando y doloroso', say: 'Me duele toda la muñeca' },
          'wr.ext': { a: 35, p: 40, note: 'extensión limitada y dolorosa (sinovitis)', say: 'Ahí no puedo' },
          'wr.rad': { a: 8, p: 10, note: 'desviación radial casi abolida: la mano está fija en desviación cubital' },
          'wr.uln': { a: 35, p: 35, note: 'desviación cubital completa (actitud habitual de la mano)' },
          'el.flex': { a: 135, p: 140, note: 'flexión casi completa; existe además un déficit de extensión de 10° en el codo' }
        },
        path: {
          'insp:wr': 'Tumefacción simétrica de ambas muñecas y de las metacarpofalángicas 2.ª y 3.ª, dedos fusiformes por tumefacción de las interfalángicas proximales; desviación cubital de los dedos; atrofia de los interóseos; las interfalángicas distales están respetadas.',
          'palp:wr': 'Sinovitis: engrosamiento blando, esponjoso y caliente de muñecas, MCF e IFP; dolor a la compresión lateral de las MCF (prueba del apretón o "squeeze" positiva); crepitación de los tendones flexores; sin nódulos de Heberden.',
          'insp:el': 'Nódulos subcutáneos de 1 cm sobre el olécranon derecho (nódulos reumatoideos); codos en leve flexo (déficit de extensión de 10°).',
          'palp:el': 'Nódulos firmes, móviles e indoloros sobre la cara extensora del olécranon; sinovitis leve en los recesos paraolecraneanos.',
          'str:resist:fflex': { g: '4', txt: 'prensión debilitada y dolorosa por la sinovitis de muñecas y MCF; sin déficit neurológico.', say: 'No tengo fuerza en las manos' },
          'str:resist:inter': { g: '4', txt: 'abducción de los dedos débil por atrofia de los interóseos y dolor de las MCF.' },
          'str:trophism:arm': 'atrofia de los interóseos dorsales ("espacios hundidos" entre los metacarpianos) en ambas manos; brazo 25 cm simétrico.',
          'gait:normal': { txt: 'Marcha conservada; en los pies, dolor a la compresión de las metatarsofalángicas que acorta levemente el despegue.', exam: 'Marcha conservada; apoyo del antepié algo doloroso.' }
        }
      },
      findings: ['Poliartritis simétrica de muñecas, MCF e IFP con sinovitis (engrosamiento blando, caliente) y rigidez matinal > 1 h.', 'Desviación cubital de los dedos y atrofia de interóseos; IFD respetadas.', 'Prueba del apretón (compresión lateral de las MCF) positiva.', 'Nódulos reumatoideos en el olécranon; déficit de extensión del codo.', 'Movilidad de muñeca limitada y dolorosa (flexión 45°, extensión 35°); fuerza de prensión 4/5.'],
      teaching: ['Artritis (sinovitis) frente a artralgia: tumefacción blanda, caliente y dolorosa de la articulación, no solo dolor. La compresión lateral de las MCF/MTF (apretón) es un tamizaje sensible.', 'Patrón de la artritis reumatoide: poliarticular, simétrico, de pequeñas articulaciones (muñecas, MCF, IFP), con rigidez matinal > 1 h; respeta las IFD (que afecta la artrosis con nódulos de Heberden).', 'Deformidades: desviación cubital, dedos en cuello de cisne y en ojal; nódulos reumatoideos en superficies de presión.'],
      quiz: [
        { q: 'La rigidez matinal de más de 1 hora que mejora con la actividad orienta a', options: ['Artrosis', 'Artritis inflamatoria (p. ej., artritis reumatoide)', 'Tendinopatía', 'Fibromialgia'], a: 1, why: 'En la artrosis la rigidez dura pocos minutos; en la artritis inflamatoria supera 30-60 min.' },
        { q: '¿Qué articulaciones suele respetar la artritis reumatoide?', options: ['Muñecas', 'Metacarpofalángicas', 'Interfalángicas proximales', 'Interfalángicas distales'], a: 3, why: 'Las IFD se afectan en la artrosis (nódulos de Heberden) y en la artritis psoriásica.' },
        { q: 'La sinovitis se reconoce a la palpación como', options: ['Engrosamiento duro y óseo del borde articular', 'Crepitación gruesa sin dolor', 'Nódulos duros en la articulación', 'Engrosamiento blando, esponjoso y caliente'], a: 3, why: 'El engrosamiento óseo duro corresponde a osteofitos (artrosis).' },
        { q: 'La prueba del apretón ("squeeze") consiste en', options: ['Comprimir lateralmente las MCF o las MTF buscando dolor', 'Apretar la mano del examinador', 'Comprimir el túnel carpiano', 'Presionar la rótula'], a: 0, why: 'Es un tamizaje sensible de sinovitis de pequeñas articulaciones.' },
        { q: 'Los nódulos sobre el olécranon de esta paciente son', options: ['Tofos gotosos', 'Nódulos de Heberden', 'Nódulos reumatoideos', 'Lipomas'], a: 2, why: 'Nódulos subcutáneos firmes e indoloros en superficies de presión, en pacientes seropositivos.' },
        { q: 'La desviación cubital de los dedos se produce en', options: ['Las interfalángicas distales', 'La muñeca únicamente', 'El codo', 'Las metacarpofalángicas'], a: 3, why: 'La sinovitis de las MCF y el desequilibrio tendinoso desvían los dedos hacia el lado cubital.' }
      ]
    },
    {
      id: 'm8', age: 71, sex: 'M', diag: 'Coxartrosis',
      complaint: 'Dolor inguinal derecho de 2 años, mecánico, que irradia a la cara anterior del muslo hasta la rodilla; aparece al caminar más de 300 m y al levantarse, y cede con el reposo. Rigidez breve al iniciar la marcha. Le cuesta ponerse los calcetines y cortarse las uñas del pie derecho. Cojea.',
      vitals: 'FC 68 · PA 142/86 · FR 16 · T 36,4 °C · SpO₂ 96 %', v: { height: 1.70, weight: 84 },
      msk: {
        g3d: { normal: 'm8', tandem: 'tandIns' },   // animación 3D de la marcha (js/gait3d.js) por modo; el resto usa la normal
        f: 0.9, las: 70, schober: 15, fd: 15, step: 46, cad: 92, perim: [29, 44, 34],
        fdNote: 'limitación de la flexión de la cadera derecha (la columna lumbar flexiona con normalidad: Schober conservado).',
        gk: { side: 'R', asym: 0.7, lean: 4 },
        rom: {
          'hi.ir': { a: 10, p: 12, note: 'rotación interna muy limitada y dolorosa: es el primer movimiento que se pierde en la coxartrosis; tope duro', say: '¡Eso duele en la ingle!' },
          'hi.er': { a: 25, p: 30, note: 'rotación externa reducida, menos dolorosa que la interna' },
          'hi.flex': { a: 90, p: 95, note: 'dolor inguinal al final del recorrido; tope duro', say: 'Me pincha en la ingle' },
          'hi.abd': { a: 20, p: 25, note: 'abducción limitada y dolorosa' },
          'hi.ext': { a: 5, p: 8, note: 'extensión casi abolida: contractura en flexión de la cadera (Thomas positivo)' },
          'kn.flex': { a: 125, p: 130, note: 'rodilla indolora y con movilidad casi completa: el dolor de rodilla es referido de la cadera' }
        },
        path: {
          'insp:hi': 'Miembro inferior derecho en actitud de leve flexión, aducción y rotación externa; acortamiento aparente de 1,5 cm con pelvis basculada (espina ilíaca derecha más baja); atrofia glútea y del muslo derechos.',
          'palp:hi': 'Dolor a la presión en el pliegue inguinal derecho (sobre la cabeza femoral); trocánter mayor poco doloroso; pulso femoral presente y simétrico.',
          'spine:look:crestas': 'Cresta ilíaca derecha más baja: pelvis basculada por la actitud en aducción y la contractura de la cadera derecha (dismetría aparente de 1,5 cm; la real es menor).',
          'spine:look:hombros': 'Hombros nivelados; la asimetría es pélvica, no del tronco.',
          'str:resist:gmed': { R: { g: '4', txt: 'abducción de la cadera derecha débil y dolorosa (inhibición de los abductores): explica el Trendelenburg positivo.', say: 'Me duele al separar la pierna' } },
          'str:resist:ilio': { R: { g: '4', txt: 'flexión de la cadera derecha dolorosa en la ingle y algo débil.' } },
          'str:trophism:leg': { R: 'muslo derecho 42 cm frente a 44 cm el izquierdo (atrofia de 2 cm); glúteo derecho aplanado; pantorrillas simétricas.' },
          'man:faber': { txt: 'dolor inguinal derecho y limitación: la rodilla derecha queda muy por encima de la horizontal, asimétrica respecto de la izquierda (patología de la cadera).', say: 'En la ingle' },
          'man:thomas': { txt: 'al flexionar la cadera izquierda contra el abdomen, el muslo derecho se despega de la camilla: contractura en flexión de la cadera derecha de ≈ 15°.' },
          'gait:trend:L': { txt: 'al apoyar sobre la pierna derecha (levantando la izquierda), la pelvis cae hacia el lado izquierdo y el tronco se inclina hacia la derecha para compensar (signo de Duchenne): insuficiencia dolorosa de los abductores derechos.', say: 'Me duele y me voy de lado' },
          'gait:normal': { txt: 'Marcha claudicante (antálgica y de Trendelenburg): apoyo acortado del miembro derecho, caída de la pelvis izquierda en cada apoyo derecho e inclinación compensadora del tronco hacia la derecha; pie derecho en rotación externa y paso corto.', exam: 'Claudica del lado derecho con inclinación del tronco hacia ese lado.' },
          'gait:tandem': { txt: 'Marcha en tándem posible pero lenta e insegura por la limitación de la cadera; sin ataxia.', exam: 'Tándem lenta por la cadera derecha.' }
        }
      },
      findings: ['Dolor inguinal mecánico irradiado a la cara anterior del muslo y la rodilla, con rodilla sana.', 'Rotación interna de cadera limitada (10°) y dolorosa; flexión 90°, abducción 20°, extensión casi abolida.', 'FABER y Thomas positivos (contractura en flexión de ≈ 15°).', 'Trendelenburg positivo del lado derecho y marcha claudicante (Trendelenburg/antálgica).', 'Actitud en flexión-aducción-rotación externa, acortamiento aparente y atrofia del muslo y el glúteo.'],
      teaching: ['En la coxartrosis el primer movimiento que se limita es la rotación interna (con la cadera en flexión); después la abducción y la extensión.', 'El dolor de la cadera se refiere a la ingle y a la cara anterior del muslo y la rodilla: ante dolor de rodilla con rodilla normal, explora la cadera.', 'Trendelenburg positivo: la pelvis cae hacia el lado de la pierna levantada por insuficiencia de los abductores de la cadera de apoyo; la marcha resultante es claudicante, a veces con inclinación del tronco hacia el lado afectado (Duchenne).'],
      quiz: [
        { q: 'El primer movimiento que se limita en la coxartrosis suele ser', options: ['Flexión', 'Rotación interna', 'Aducción', 'Rotación externa'], a: 1, why: 'Rotación interna limitada y dolorosa es el signo más precoz; luego abducción y extensión.' },
        { q: 'En el Trendelenburg positivo de este paciente, al apoyarse sobre la pierna derecha', options: ['La pelvis se eleva del lado izquierdo', 'La pelvis cae hacia el lado izquierdo (levantado)', 'La pelvis se mantiene nivelada', 'La rodilla derecha se flexiona'], a: 1, why: 'Los abductores de la cadera de apoyo (derecha) no sostienen la pelvis y esta cae hacia el lado contrario.' },
        { q: 'La prueba de Thomas positiva indica', options: ['Lesión meniscal', 'Rotura del tendón de Aquiles', 'Sacroileítis', 'Contractura en flexión de la cadera'], a: 3, why: 'Al flexionar la cadera contraria (aplanando la lordosis), el muslo afectado se despega de la camilla.' },
        { q: 'El FABER con dolor inguinal apunta a', options: ['La articulación sacroilíaca', 'La columna lumbar', 'La cadera', 'La rodilla'], a: 2, why: 'Dolor inguinal → cadera; dolor glúteo o sacro → sacroilíaca.' },
        { q: 'La actitud típica del miembro en la coxartrosis evolucionada es', options: ['Extensión, abducción y rotación interna', 'Flexión, aducción y rotación externa', 'Flexión, abducción y rotación interna', 'Extensión y aducción'], a: 1, why: 'Produce acortamiento aparente y basculación pélvica.' },
        { q: 'La marcha de este paciente se describe como', options: ['Marcha claudicante (antálgica y de Trendelenburg)', 'Marcha en estepaje', 'Marcha atáxica', 'Marcha parkinsoniana'], a: 0, why: 'Apoyo breve del lado doloroso, caída de la pelvis contralateral e inclinación del tronco hacia el lado afectado.' }
      ]
    }
  ];

  const REFS = [
    'Argente HA, Álvarez ME. <i>Semiología Médica</i>. Panamericana — Sistema osteoarticular y muscular: síndromes articulares (artritis y artrosis), columna vertebral (lumbalgia, lumbociática, espondiloartritis), hombro doloroso, síndromes de atrapamiento nervioso, examen de la cadera y la rodilla, marcha.',
    'Norkin CC, White DJ. <i>Measurement of Joint Motion: A Guide to Goniometry</i>. F. A. Davis (rangos articulares de referencia).',
    'Medical Research Council. <i>Aids to the examination of the peripheral nervous system</i> (escala de fuerza 0-5).'
  ];
  const TEACHING = [
    'Ante un paciente con síntomas locomotores, el examen sigue el mismo orden que en la persona sana (inspección, palpación, movilidad activa y pasiva, maniobras, marcha); la patología se reconoce por la desviación respecto del hallazgo normal y por la asimetría con el lado sano.',
    'Movilidad activa limitada con pasiva conservada → tendón, músculo o dolor; ambas limitadas → cápsula, hueso o anquilosis. Fíjate en la sensación terminal: dura (anquilosis, osteofitos), blanda-elástica (derrame), dolorosa (sinovitis, hernia discal).',
    'Dolor mecánico (con el uso, rigidez breve) frente a inflamatorio (en reposo y nocturno, rigidez matinal > 1 h): orienta a artrosis o a artritis/espondiloartritis.',
    'Las maniobras especiales son positivas cuando reproducen el dolor o la inestabilidad que el paciente refiere; se interpretan siempre comparando con el lado contralateral y en el contexto clínico.',
    'Marcha: antálgica (apoyo breve del lado doloroso), claudicante de Trendelenburg (caída de la pelvis contralateral, inclinación del tronco), rígida (espondilitis) o con rodilla semiflexionada (derrame, artrosis).'
  ];

  function mount(root) {
    return window.MskModule.mountWith(root, {
      id: 'pat-msk', cases: PAT, hideDx: false, refs: REFS, teaching: TEACHING,
      quiz: c => c.quiz,
      patientTitle: 'Paciente', checkLabel: 'Comprobar diagnóstico y respuestas',
      caseLabel: (c, i) => `Paciente ${i + 1} · ${c.age} años, ${c.sex}`
    });
  }

  window.MskPatModule = { mount, _test: { PAT } };

  registerModule({
    id: 'pat-msk', title: 'Aparato locomotor: patología', icon: '🦴', group: 'Exploración patológica',
    desc: 'Ocho pacientes con síndromes del aparato locomotor: lumbociática por hernia discal, espondilitis anquilosante, gonartrosis, rotura del ligamento cruzado anterior, hombro doloroso (manguito rotador), síndrome del túnel carpiano, artritis reumatoide y coxartrosis. Mismas escenas que el módulo normal: goniometría con topes dolorosos, columna (Schober, Lasègue y Bragard positivos), fuerza por miotomas, maniobras positivas y marchas patológicas.',
    bullets: ['Rangos articulares limitados con dolor o tope anormal por articulación y movimiento', 'Lasègue, Bragard, Schober, Trendelenburg y maniobras especiales positivas con su descripción', 'Fuerza disminuida por grupo muscular, atrofias y déficits sensitivos asociados', 'Marchas antálgica, claudicante y rígida; diagnóstico seleccionable y cuestionario de 6 preguntas por paciente'],
    refs: REFS,
    mount: root => mount(root)
  });
})();
