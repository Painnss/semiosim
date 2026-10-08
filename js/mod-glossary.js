/* Referencia: glosario de semiología (nomenclatura de Argente-Álvarez) y bibliografía.
   Definiciones redactadas para este proyecto; no reproducen texto de ninguna obra. */
(function () {
  'use strict';
  const { esc } = U;

  /* [término, definición, sistema] */
  const TERMS = [
    // Método clínico y examen general
    ['Semiología', 'Estudio de los signos y síntomas de las enfermedades: cómo buscarlos (semiotecnia), cómo interpretarlos (clínica semiológica) y cómo agruparlos en síndromes.', 'General'],
    ['Síntoma', 'Manifestación subjetiva que refiere el paciente (dolor, disnea, náuseas). Se obtiene con la anamnesis.', 'General'],
    ['Signo', 'Hallazgo objetivo que el médico comprueba en el examen físico o en estudios (soplo, matidez, ictericia).', 'General'],
    ['Síndrome', 'Conjunto de síntomas y signos que suelen presentarse juntos y responden a un mismo mecanismo fisiopatológico, con distintas causas posibles.', 'General'],
    ['Anamnesis', 'Interrogatorio ordenado del paciente: filiación, motivo de consulta, enfermedad actual, antecedentes personales y familiares, hábitos y revisión por aparatos.', 'General'],
    ['Motivo de consulta', 'Síntoma o problema principal, en pocas palabras y con las del paciente, que origina la consulta.', 'General'],
    ['Enfermedad actual', 'Relato cronológico y detallado del motivo de consulta: inicio, características, evolución, factores que lo modifican y síntomas acompañantes.', 'General'],
    ['Impresión general', 'Primer juicio al ver al paciente: estado de conciencia, actitud, decúbito, facies, hábito, nutrición, hidratación, marcha y gravedad aparente.', 'General'],
    ['Facies', 'Conjunto de rasgos de la cara (expresión, color, forma) que puede orientar a una enfermedad (p. ej. facies hipertiroidea, cushingoide, mitral).', 'General'],
    ['Decúbito', 'Posición del paciente acostado. Puede ser activo (lo elige), pasivo (no puede cambiarlo) u obligado (forzado por la enfermedad, p. ej. ortopnea).', 'General'],
    ['Hábito constitucional', 'Tipo corporal predominante: longilíneo (asténico), brevilíneo (pícnico) o normolíneo.', 'General'],
    ['Eupnea', 'Respiración normal: 12–20 ciclos por minuto, regular y sin esfuerzo.', 'General'],
    ['Taquipnea / bradipnea', 'Aumento (> 20/min) o disminución (< 12/min) de la frecuencia respiratoria en el adulto.', 'General'],
    ['Taquicardia / bradicardia', 'Frecuencia cardíaca mayor de 100 o menor de 60 latidos por minuto en reposo.', 'General'],
    ['Presión de pulso', 'Diferencia entre presión sistólica y diastólica; normal 30–50 mmHg.', 'General'],
    ['Fases de Korotkoff', 'Sonidos auscultados al desinflar el manguito: aparición (fase I = sistólica), cambios de tono y desaparición (fase V = diastólica).', 'General'],
    ['Pozo (agujero) auscultatorio', 'Silencio transitorio entre la sistólica y la diastólica en algunos hipertensos; se evita con el método palpatorio previo.', 'General'],
    ['Escala de Glasgow', 'Puntaje de nivel de conciencia: apertura ocular (1–4), respuesta verbal (1–5) y motora (1–6). Normal 15; ≤ 8 indica coma.', 'General'],
    ['Índice de masa corporal (IMC)', 'Peso (kg) / talla² (m²). Normal 18,5–24,9; sobrepeso 25–29,9; obesidad ≥ 30.', 'General'],
    // Piel
    ['Lesiones elementales primarias', 'Aparecen sobre piel sana: mácula, pápula, placa, nódulo, tubérculo, vesícula, ampolla, pústula, habón.', 'Piel'],
    ['Lesiones elementales secundarias', 'Derivan de la evolución de otras lesiones: escama, costra, erosión, úlcera, fisura, cicatriz, atrofia, liquenificación.', 'Piel'],
    ['Mácula', 'Cambio de color de la piel sin relieve ni cambio de consistencia.', 'Piel'],
    ['Pápula', 'Elevación sólida, circunscrita y pequeña (< 1 cm). Si es mayor y plana se denomina placa.', 'Piel'],
    ['Nódulo', 'Lesión sólida, palpable, más profunda que la pápula, de 1 cm o más.', 'Piel'],
    ['Vesícula / ampolla', 'Elevaciones de contenido líquido: menor de 0,5 cm (vesícula) o mayor (ampolla).', 'Piel'],
    ['Pústula', 'Elevación de contenido purulento.', 'Piel'],
    ['Habón (roncha)', 'Elevación edematosa, rosada, pruriginosa y fugaz, típica de la urticaria.', 'Piel'],
    ['Turgor', 'Resistencia y rapidez con que el pliegue cutáneo vuelve a su posición; disminuye en la deshidratación y con la edad.', 'Piel'],
    ['Cianosis', 'Coloración azulada de piel y mucosas por aumento de hemoglobina reducida (> 5 g/dL en sangre capilar).', 'Piel'],
    ['Ictericia', 'Coloración amarilla de piel, mucosas y escleras por aumento de bilirrubina (visible desde ≈ 2–3 mg/dL).', 'Piel'],
    ['Palidez', 'Disminución del color por menor hemoglobina o vasoconstricción; se busca en conjuntivas, mucosas y palmas.', 'Piel'],
    // Cabeza y cuello
    ['Adenopatía', 'Ganglio linfático aumentado de tamaño o de consistencia alterada. Se describen tamaño, consistencia, movilidad, sensibilidad y adherencia.', 'Cabeza y cuello'],
    ['Bocio', 'Aumento de tamaño de la tiroides. Grados OMS: 0 (no palpable ni visible), I (palpable, no visible con el cuello en posición normal), II (visible).', 'Cabeza y cuello'],
    ['Anisocoria', 'Pupilas de distinto tamaño. Puede ser fisiológica (≤ 1 mm) o indicar lesión de la vía simpática o parasimpática.', 'Cabeza y cuello'],
    ['Miosis / midriasis', 'Pupila contraída (< 2 mm) o dilatada (> 5 mm).', 'Cabeza y cuello'],
    ['Ptosis', 'Caída del párpado superior (III par, vía simpática, miastenia).', 'Cabeza y cuello'],
    ['Nistagmo', 'Movimiento ocular rítmico e involuntario, con una fase lenta y otra rápida.', 'Cabeza y cuello'],
    ['Prueba de Rinne', 'Compara conducción aérea y ósea con un diapasón en la mastoides y frente al conducto; normal: aérea > ósea (Rinne positivo).', 'Cabeza y cuello'],
    ['Prueba de Weber', 'Diapasón en el vértice del cráneo; normal: se oye igual en ambos oídos. Lateraliza al oído sano en hipoacusia neurosensorial y al enfermo en la de conducción.', 'Cabeza y cuello'],
    ['Fauces', 'Región de la orofaringe limitada por el paladar blando, los pilares y la base de la lengua, donde se ven las amígdalas.', 'Cabeza y cuello'],
    ['Clasificación de Mallampati', 'Visibilidad de las estructuras de la orofaringe con la boca abierta y la lengua afuera (I–IV); predice la dificultad de intubación.', 'Cabeza y cuello'],
    // Respiratorio
    ['Murmullo vesicular', 'Sonido respiratorio normal sobre el parénquima pulmonar: suave, de tono bajo, con inspiración más larga y audible que la espiración.', 'Respiratorio'],
    ['Respiración bronquial', 'Sonido normal sobre la tráquea y la laringe: intenso, de tono alto, con espiración tan larga o más que la inspiración. Si aparece sobre el parénquima se llama soplo tubario.', 'Respiratorio'],
    ['Respiración broncovesicular', 'Intermedia entre las dos anteriores; normal en la región interescapular y bajo las clavículas.', 'Respiratorio'],
    ['Soplo tubario', 'Respiración bronquial auscultada donde debería haber murmullo vesicular; signo de condensación pulmonar.', 'Respiratorio'],
    ['Estertores', 'Ruidos agregados. Secos: sibilancias y roncus (obstrucción bronquial). Húmedos: crepitantes y subcrepitantes (líquido o apertura alveolar).', 'Respiratorio'],
    ['Sibilancias', 'Estertores secos, agudos y musicales, sobre todo espiratorios; indican estrechamiento bronquial.', 'Respiratorio'],
    ['Roncus', 'Estertores secos, graves, como un ronquido; cambian con la tos (secreciones en bronquios gruesos).', 'Respiratorio'],
    ['Crepitantes', 'Estertores húmedos finos, al final de la inspiración, como frotar cabellos; no se modifican con la tos.', 'Respiratorio'],
    ['Subcrepitantes (de burbuja)', 'Estertores húmedos más gruesos, en inspiración y espiración, que se modifican con la tos.', 'Respiratorio'],
    ['Frote pleural', 'Ruido áspero, como cuero nuevo, en ambas fases, por roce de pleuras inflamadas.', 'Respiratorio'],
    ['Vibraciones vocales', 'Vibración de la pared torácica al hablar («treinta y tres»), percibida con la palma; aumentan en la condensación y disminuyen en derrame y neumotórax.', 'Respiratorio'],
    ['Expansión torácica', 'Desplazamiento simétrico de las bases y los vértices con la inspiración, valorado con las manos sobre el tórax.', 'Respiratorio'],
    ['Sonoridad', 'Sonido normal de la percusión del pulmón: claro, de intensidad y duración medias.', 'Respiratorio'],
    ['Hipersonoridad', 'Sonido más intenso y grave que la sonoridad, por aumento del aire (enfisema, neumotórax).', 'Respiratorio'],
    ['Matidez / submatidez', 'Sonido apagado y breve, por ausencia de aire (condensación, derrame) o por un órgano macizo (hígado). La submatidez es intermedia.', 'Respiratorio'],
    ['Timpanismo', 'Sonido musical, de tono alto, por aire a tensión en una cavidad (estómago, intestino, neumotórax a tensión).', 'Respiratorio'],
    ['Columna sonora', 'Percusión de las apófisis espinosas: normalmente sonora; se vuelve mate en el derrame pleural.', 'Respiratorio'],
    ['Excursión de las bases', 'Diferencia entre el límite inferior de la sonoridad pulmonar en espiración e inspiración profundas: 4–6 cm.', 'Respiratorio'],
    ['Broncofonía / pectoriloquia áfona / egofonía', 'Variantes de la resonancia de la voz sobre una condensación: voz más intensa, voz cuchicheada que se oye con claridad y voz de timbre nasal («de cabra»).', 'Respiratorio'],
    ['Tiraje', 'Depresión de los espacios intercostales, supraclaviculares o supraesternal en la inspiración por obstrucción de la vía aérea.', 'Respiratorio'],
    // Cardiovascular
    ['R1 (primer ruido)', 'Cierre de las válvulas mitral y tricúspide; marca el inicio de la sístole. Más intenso en el ápex.', 'Cardiovascular'],
    ['R2 (segundo ruido)', 'Cierre de las válvulas aórtica (A2) y pulmonar (P2); inicio de la diástole. Más intenso en la base. Se desdobla de manera fisiológica en la inspiración.', 'Cardiovascular'],
    ['R3 (tercer ruido)', 'Ruido grave y protodiastólico por llenado ventricular rápido. Fisiológico en jóvenes; en adultos sugiere insuficiencia cardíaca (galope).', 'Cardiovascular'],
    ['R4 (cuarto ruido)', 'Ruido presistólico por contracción auricular contra un ventrículo rígido (hipertrofia, isquemia). Siempre patológico.', 'Cardiovascular'],
    ['Chasquido de apertura', 'Ruido breve y agudo tras el R2 por apertura de una válvula mitral estenótica.', 'Cardiovascular'],
    ['Soplo sistólico eyectivo', 'Soplo mesosistólico creciente-decreciente («en rombo») por paso de sangre a través de una válvula semilunar estrecha (estenosis aórtica) o por hiperflujo.', 'Cardiovascular'],
    ['Soplo regurgitativo', 'Soplo holosistólico «en meseta» por reflujo de sangre a través de una válvula auriculoventricular insuficiente (insuficiencia mitral o tricuspídea).', 'Cardiovascular'],
    ['Rolido (retumbo) mitral', 'Soplo diastólico grave, de baja frecuencia, de la estenosis mitral; se oye mejor con la campana en decúbito lateral izquierdo.', 'Cardiovascular'],
    ['Soplo diastólico aórtico', 'Soplo regurgitativo protodiastólico, aspirativo y decreciente, de la insuficiencia aórtica; mejor con el diafragma, sentado e inclinado hacia delante.', 'Cardiovascular'],
    ['Frémito', 'Vibración palpable sobre el precordio producida por un soplo intenso (≥ 4/6).', 'Cardiovascular'],
    ['Choque de la punta (latido apexiano)', 'Impulso del ápex ventricular en el 5.º espacio intercostal izquierdo, por dentro de la línea medioclavicular, de ≈ 2 cm de diámetro.', 'Cardiovascular'],
    ['Foco mesocárdico (de Erb)', 'Tercer espacio intercostal izquierdo junto al esternón; útil para los soplos aórticos de regurgitación.', 'Cardiovascular'],
    ['Ingurgitación yugular', 'Distensión de las yugulares; a 45° la columna no debe superar 3–4 cm sobre el ángulo esternal.', 'Cardiovascular'],
    ['Reflujo hepatoyugular', 'Aumento sostenido de la columna yugular al comprimir el abdomen durante 10–15 s; positivo en insuficiencia cardíaca derecha.', 'Cardiovascular'],
    ['Pulso parvus et tardus', 'Pulso de pequeña amplitud y ascenso lento, característico de la estenosis aórtica.', 'Cardiovascular'],
    ['Pulso celer (saltón, de Corrigan)', 'Pulso amplio, de ascenso y descenso rápidos, típico de la insuficiencia aórtica.', 'Cardiovascular'],
    ['Pulso paradójico', 'Caída inspiratoria de la presión sistólica > 10 mmHg (taponamiento cardíaco, asma grave).', 'Cardiovascular'],
    ['Pulso alternante', 'Latidos fuertes y débiles que se alternan con ritmo regular; indica disfunción ventricular grave.', 'Cardiovascular'],
    ['Signo de la fóvea (godet)', 'Depresión que deja el dedo al presionar sobre un edema; se gradúa de + a ++++.', 'Cardiovascular'],
    ['Llenado capilar', 'Tiempo en que recupera el color el lecho ungueal tras comprimirlo; normal < 2 s.', 'Cardiovascular'],
    ['Claudicación intermitente', 'Dolor muscular en los miembros inferiores al caminar que cede con el reposo; isquemia arterial crónica.', 'Cardiovascular'],
    // Abdomen
    ['Ruidos hidroaéreos (RHA)', 'Sonidos del tránsito intestinal: 5–30 por minuto. Aumentan en la obstrucción inicial y desaparecen en el íleo.', 'Abdomen'],
    ['Hepatimetría', 'Altura de la matidez hepática en la línea medioclavicular: 6–12 cm (≈ 10–12 cm en el varón adulto).', 'Abdomen'],
    ['Espacio de Traube', 'Área timpánica del hipocondrio izquierdo (cámara gástrica); se vuelve mate con esplenomegalia o derrame pleural izquierdo.', 'Abdomen'],
    ['Matidez desplazable', 'Cambio de la zona mate del flanco al girar al paciente; indica líquido libre (ascitis).', 'Abdomen'],
    ['Onda ascítica', 'Transmisión de un golpe en un flanco al otro, con la mano de un ayudante en la línea media; signo de ascitis voluminosa.', 'Abdomen'],
    ['Signo de Murphy', 'Detención de la inspiración por dolor al palpar el punto cístico; colecistitis aguda.', 'Abdomen'],
    ['Punto de McBurney', 'Unión del tercio externo con los dos tercios internos de la línea espino-umbilical derecha; dolor en apendicitis.', 'Abdomen'],
    ['Signo de Blumberg', 'Dolor a la descompresión brusca; indica irritación peritoneal.', 'Abdomen'],
    ['Signo de Rovsing', 'Dolor en fosa ilíaca derecha al comprimir la izquierda.', 'Abdomen'],
    ['Signos del psoas y del obturador', 'Dolor al extender la cadera o al rotarla internamente flexionada; apendicitis retrocecal o pélvica.', 'Abdomen'],
    ['Puñopercusión lumbar', 'Golpe suave con el puño sobre la región lumbar; dolor en pielonefritis o litiasis (signo de Giordano, Murphy renal).', 'Abdomen'],
    ['Peloteo renal', 'Impulso del riñón hacia la mano anterior al empujar desde atrás (maniobra de Guyon); riñón palpable o aumentado.', 'Abdomen'],
    ['Puntos ureterales', 'Superior (borde del recto a la altura del ombligo), medio (línea biilíaca) e inferior (tacto); dolor en cólico renal.', 'Abdomen'],
    ['Defensa abdominal', 'Contractura muscular involuntaria al palpar; «abdomen en tabla» cuando es generalizada (peritonitis).', 'Abdomen'],
    ['Visceromegalia', 'Aumento de tamaño de un órgano: hepatomegalia, esplenomegalia.', 'Abdomen'],
    ['Globo vesical', 'Tumoración hipogástrica mate y dolorosa por retención urinaria.', 'Abdomen'],
    // Neurológico
    ['Reflejos osteotendinosos (profundos)', 'Respuesta muscular a la percusión del tendón. Escala 0 (arreflexia), 1+ (hiporreflexia), 2+ (normal), 3+ (hiperreflexia), 4+ (con clonus).', 'Neurológico'],
    ['Reflejos cutáneos (superficiales)', 'Respuesta a la estimulación de la piel: cutáneo-abdominales, cremasteriano, plantar.', 'Neurológico'],
    ['Signo de Babinski', 'Extensión del hallux con apertura en abanico de los dedos al estimular la planta; lesión de la vía piramidal.', 'Neurológico'],
    ['Clonus', 'Sacudidas rítmicas sostenidas al estirar bruscamente un músculo (pie, rótula); hiperreflexia de origen piramidal.', 'Neurológico'],
    ['Síndrome de motoneurona superior (piramidal)', 'Paresia, hipertonía espástica, hiperreflexia, clonus y Babinski; lesión de corteza, cápsula, tronco o médula.', 'Neurológico'],
    ['Síndrome de motoneurona inferior', 'Paresia con hipotonía, hiporreflexia o arreflexia, atrofia y fasciculaciones; lesión de asta anterior, raíz, plexo o nervio.', 'Neurológico'],
    ['Tono muscular', 'Resistencia al movimiento pasivo. Hipertonía espástica (en navaja, piramidal) o rigidez (en rueda dentada, extrapiramidal); hipotonía.', 'Neurológico'],
    ['Trofismo', 'Volumen y estado de la masa muscular; atrofia en lesiones de motoneurona inferior o desuso.', 'Neurológico'],
    ['Taxia (coordinación)', 'Se explora con dedo-nariz, talón-rodilla, diadococinesia y marcha; ataxia cuando falla (cerebelosa, sensitiva o vestibular).', 'Neurológico'],
    ['Dismetría / adiadococinesia', 'Error en la medida del movimiento y dificultad para alternar movimientos rápidos; signos cerebelosos.', 'Neurológico'],
    ['Signo de Romberg', 'Pérdida del equilibrio al cerrar los ojos de pie con los pies juntos; ataxia sensitiva o vestibular (no cerebelosa).', 'Neurológico'],
    ['Praxia', 'Capacidad de ejecutar actos motores aprendidos; su pérdida es la apraxia.', 'Neurológico'],
    ['Palestesia', 'Sensibilidad vibratoria (diapasón de 128 Hz sobre prominencias óseas).', 'Neurológico'],
    ['Batiestesia', 'Sensibilidad posicional (reconocer la posición de un dedo movido por el examinador).', 'Neurológico'],
    ['Barestesia', 'Sensibilidad a la presión.', 'Neurológico'],
    ['Parestesia / hipoestesia / anestesia', 'Sensación anormal espontánea (hormigueo), disminución o abolición de la sensibilidad.', 'Neurológico'],
    ['Paresia / plejía', 'Disminución o pérdida total de la fuerza. Según distribución: mono-, hemi-, para- o cuadri-.', 'Neurológico'],
    ['Signos meníngeos', 'Rigidez de nuca, signo de Kernig (dolor al extender la rodilla con la cadera flexionada) y de Brudzinski (flexión de las piernas al flexionar el cuello).', 'Neurológico'],
    ['Afasia / disartria', 'Trastorno del lenguaje (comprensión o expresión) frente a trastorno de la articulación de la palabra.', 'Neurológico'],
    ['Mini-Mental (MMSE)', 'Prueba breve de funciones cognitivas (orientación, memoria, atención, lenguaje, praxia) sobre 30 puntos; < 24 sugiere deterioro, según escolaridad.', 'Neurológico'],
    // Locomotor
    ['Goniometría', 'Medición de los ángulos de movilidad articular con goniómetro; se compara con el lado opuesto y con los valores normales.', 'Locomotor'],
    ['Movilidad activa y pasiva', 'La realiza el paciente por sí mismo (activa) o el examinador (pasiva). La limitación solo activa sugiere lesión muscular o tendinosa; la pasiva, articular.', 'Locomotor'],
    ['Prueba de Schober', 'Marca a 10 cm sobre la unión lumbosacra; con la flexión debe aumentar al menos 5 cm (≥ 15 cm).', 'Locomotor'],
    ['Signo de Lasègue', 'Dolor ciático al elevar la pierna extendida entre 30° y 70°; compresión radicular L5-S1.', 'Locomotor'],
    ['Signo de Trendelenburg', 'Caída de la pelvis del lado contrario al apoyar sobre una pierna; debilidad del glúteo medio.', 'Locomotor'],
    ['Phalen y Tinel', 'Parestesias en territorio mediano con la flexión forzada de muñecas (Phalen) o al percutir el nervio (Tinel); síndrome del túnel carpiano.', 'Locomotor'],
    ['Peloteo rotuliano', 'Rebote de la rótula al presionarla con derrame articular de rodilla.', 'Locomotor'],
    ['Escala de fuerza (MRC)', '0 sin contracción; 1 contracción visible; 2 movimiento sin gravedad; 3 vence la gravedad; 4 vence resistencia moderada; 5 normal.', 'Locomotor'],
    // Genitourinario y mama
    ['Tacto rectal', 'Exploración digital del canal anal, la ampolla y, en el varón, la próstata (tamaño, consistencia, surco medio, superficie, sensibilidad).', 'Genitourinario'],
    ['Cola de Spence', 'Prolongación axilar de la glándula mamaria; se incluye siempre en la palpación.', 'Genitourinario'],
    ['Estadios de Tanner', 'Etapas del desarrollo puberal (mama, genitales y vello) del I al V.', 'Genitourinario'],
    ['Papanicolaou', 'Citología del cuello uterino para cribado de cáncer; se recomienda desde los 21–25 años según el programa.', 'Genitourinario']
  ];

  const SYSTEMS = [...new Set(TERMS.map(t => t[2]))];

  const GLOSS_HTML = `
  <div class="home ref">
    <h1>Glosario de semiología</h1>
    <p class="lead">Términos de la exploración física con la nomenclatura de <i>Argente-Álvarez</i>. Definiciones propias de SemioSim, pensadas para repasar; no sustituyen al libro.</p>
    <div class="gl-bar">
      <input id="glq" type="search" placeholder="Buscar término o palabra clave…" aria-label="Buscar en el glosario">
      <select id="gls" aria-label="Filtrar por sistema"><option value="">Todos los sistemas</option>${SYSTEMS.map(s => `<option>${s}</option>`).join('')}</select>
      <span id="gln" class="stat"></span>
    </div>
    <div id="gll" class="gl-list"></div>
  </div>`;

  const BIBLIO_HTML = `
  <div class="home ref">
    <h1>Bibliografía y fuentes</h1>
    <p class="lead">SemioSim sigue la organización, la técnica y la nomenclatura de la obra de referencia del curso. Los textos de la aplicación son redacciones propias y <b>no reproducen</b> fragmentos de ninguna obra.</p>
    <h2 class="gh">Obra de referencia</h2>
    <ul class="bib">
      <li><b>Argente HA, Álvarez ME.</b> <i>Semiología Médica. Fisiopatología, Semiotecnia y Propedéutica. Enseñanza-aprendizaje centrada en la persona.</i> Buenos Aires: Editorial Médica Panamericana. (Partes: La historia clínica · Examen físico general · Piel y faneras · Cabeza y cuello · Aparato respiratorio · Aparato cardiovascular · Abdomen · Aparato urinario · Aparato genital · Mama · Sistema osteoarticular · Sistema nervioso.)</li>
    </ul>
    <h2 class="gh">Fuentes complementarias para valores y escalas</h2>
    <ul class="bib">
      <li>Bickley LS. <i>Bates. Guía de exploración física e historia clínica.</i> Wolters Kluwer.</li>
      <li>Surós Batlló A, Surós Batlló J. <i>Semiología médica y técnica exploratoria.</i> Elsevier-Masson.</li>
      <li>Organización Mundial de la Salud: clasificación del IMC y circunferencia de cintura; grados de bocio.</li>
      <li>Guías de hipertensión arterial (ESC/ESH; ACC/AHA) para la clasificación de la presión arterial.</li>
      <li>Teasdale G, Jennett B. Escala de coma de Glasgow. Folstein MF. Mini-Mental State Examination.</li>
      <li>Medical Research Council. Escala de fuerza muscular (0–5).</li>
    </ul>
    <h2 class="gh">Correspondencia por módulo</h2>
    <table class="res bibtab"><tr><th>Módulo</th><th>Temas de Argente-Álvarez que cubre</th></tr>
      <tr><td>Anamnesis</td><td>La historia clínica: datos de filiación, motivo de consulta, enfermedad actual, antecedentes, hábitos, anamnesis por aparatos; la entrevista médica.</td></tr>
      <tr><td>Signos vitales</td><td>Examen físico general: impresión general, signos vitales, presión arterial, estado de conciencia, nutrición.</td></tr>
      <tr><td>Piel, faneras y mucosas</td><td>Semiología de la piel: lesiones elementales; pelo y uñas.</td></tr>
      <tr><td>Cabeza y cuello</td><td>Cabeza, ojos, oídos, nariz, boca y fauces; cuello, tiroides, ganglios linfáticos.</td></tr>
      <tr><td>Pares craneales, motor y estado mental</td><td>Examen neurológico: funciones cerebrales superiores, pares craneales, motilidad, tono, trofismo, taxia, sensibilidad, signos meníngeos.</td></tr>
      <tr><td>Respiratorio</td><td>Examen físico del aparato respiratorio: inspección, palpación, percusión y auscultación; ruidos agregados.</td></tr>
      <tr><td>Cardiovascular</td><td>Examen físico cardiovascular: pulsos, presión venosa, precordio, ruidos y soplos; sistema vascular periférico.</td></tr>
      <tr><td>Abdomen</td><td>Examen físico del abdomen: inspección, auscultación, percusión, palpación; hígado, bazo, riñón; maniobras.</td></tr>
      <tr><td>Genitourinario y mama</td><td>Aparato urinario, genital masculino y femenino; semiología de la mama.</td></tr>
      <tr><td>Locomotor</td><td>Sistema osteoarticular y muscular: examen de columna y articulaciones, maniobras, marcha.</td></tr>
      <tr><td>Casos de neurología y tórax</td><td>Síndromes piramidal y de neurona motora inferior, polineuropatías, pares craneales; síndromes de condensación, derrame, neumotórax, obstrucción bronquial, insuficiencia cardíaca y valvulopatías.</td></tr>
    </table>
  </div>`;

  function injectStyle() {
    if (document.getElementById('gl-style')) return;
    const st = document.createElement('style'); st.id = 'gl-style';
    st.textContent = `
      .ref .gl-bar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px}
      .ref .gl-bar input,.ref .gl-bar select{padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--ink);font:inherit}
      .ref .gl-bar input{flex:1;min-width:200px}
      .gl-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px}
      .gl-item{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px 12px}
      .gl-item b{display:block;margin-bottom:2px}
      .gl-item small{color:var(--brand);font-size:11px;text-transform:uppercase;letter-spacing:.05em}
      .gl-item p{margin:4px 0 0;font-size:13.5px;color:var(--muted)}
      .gl-empty{color:var(--muted)}
      .bib{padding-left:18px}.bib li{margin-bottom:8px}
      .bibtab td,.bibtab th{vertical-align:top;font-size:13.5px}`;
    document.head.appendChild(st);
  }

  function mountGlossary(root) {
    injectStyle();
    root.innerHTML = GLOSS_HTML;
    const q = root.querySelector('#glq'), s = root.querySelector('#gls'), list = root.querySelector('#gll'), n = root.querySelector('#gln');
    const norm = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const paint = () => {
      const qq = norm(q.value.trim()), sys = s.value;
      const hits = TERMS.filter(t => (!sys || t[2] === sys) && (!qq || norm(t[0] + ' ' + t[1]).includes(qq)));
      list.innerHTML = hits.length ? hits.map(t => `<div class="gl-item"><small>${esc(t[2])}</small><b>${esc(t[0])}</b><p>${esc(t[1])}</p></div>`).join('')
        : '<p class="gl-empty">No hay términos que coincidan.</p>';
      n.textContent = `${hits.length} términos`;
    };
    q.addEventListener('input', paint); s.addEventListener('change', paint);
    paint();
    Progress.touch('glossary');
    return { destroy() { root.innerHTML = ''; } };
  }

  function mountBiblio(root) {
    injectStyle();
    root.innerHTML = BIBLIO_HTML;
    return { destroy() { root.innerHTML = ''; } };
  }

  registerModule({
    id: 'glossary', title: 'Glosario de semiología', icon: '📖', group: 'Referencia',
    desc: `${TERMS.length} términos con la nomenclatura de Argente-Álvarez, con buscador y filtro por sistema.`,
    bullets: ['Ruidos y soplos, estertores, percusión', 'Signos y maniobras del abdomen', 'Examen neurológico y locomotor'],
    mount: mountGlossary
  });
  registerModule({
    id: 'biblio', title: 'Bibliografía y fuentes', icon: '📚', group: 'Referencia',
    desc: 'Obra de referencia, fuentes complementarias y correspondencia de cada módulo con los temas del libro.',
    bullets: [], mount: mountBiblio
  });
  window.SEMIO_GLOSSARY = TERMS;
})();
