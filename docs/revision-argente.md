# Revisión de módulos: criterios y nomenclatura (referencia: Argente-Álvarez, *Semiología Médica*)

Esta lista se aplica a cada módulo de SemioSim. El objetivo es que el contenido sea **correcto, consistente entre módulos y
alineado con la terminología de Argente y Álvarez** (Panamericana), que es el texto base de los usuarios.

## Reglas de oro

1. **No copiar texto del libro.** Las explicaciones se redactan con palabras propias. Se puede citar la obra por *tema o sección*
   (p. ej. «Argente-Álvarez, Semiología Médica — Aparato respiratorio: percusión y auscultación»), nunca párrafos ni tablas.
   No inventes números de capítulo ni de página.
2. Cada módulo debe declarar `refs: [...]` (en `NormalEngine.build` o en `registerModule`) con 1–3 referencias por tema; la primera siempre
   Argente-Álvarez. Pueden añadirse guías (OMS, AHA/ESC, ADA, GOLD…) cuando aporten valores.
3. Lo que no esté en Argente-Álvarez y sea dudoso, **se quita** o se marca como «según la fuente, …» con un rango.
4. Español neutro con terminología rioplatense/latinoamericana del libro. Evitar anglicismos innecesarios.

## Nomenclatura obligatoria (Argente-Álvarez)

| Tema | Usar | Evitar |
|---|---|---|
| Ruidos cardíacos | **R1, R2, R3, R4** (primer ruido, segundo ruido…), desdoblamiento fisiológico del R2, chasquido de apertura, clic | S1, S2 (solo como aclaración «R1 (S1)» una vez) |
| Soplos | sistólicos **eyectivos** (mesosistólicos, «en rombo») y **regurgitativos** (holosistólicos/pansistólicos); diastólicos: **regurgitativo** aórtico (protodiastólico decreciente) y **rolido/retumbo** mitral; irradiación; intensidad 1–6/6 (Levine) | «murmur» |
| Focos | aórtico, pulmonar, **mesocárdico (Erb)**, tricuspídeo, mitral (apexiano); **choque de la punta** (latido apexiano); frémito | — |
| Pulsos | frecuencia, ritmo, amplitud, tensión, igualdad, simetría; escala 0 a 4+ o «presentes y simétricos» | — |
| Presión arterial | presión arterial (sin. tensión arterial), PAS/PAD, presión de pulso, fases de Korotkoff, método palpatorio, **pozo o agujero auscultatorio** | — |
| Respiratorio | **murmullo vesicular**, **respiración bronquial** (sobre tráquea/laringe) y **soplo tubario** cuando aparece sobre el parénquima (patológico), **respiración broncovesicular**; ruidos agregados: **estertores secos** (sibilancias, roncus) y **estertores húmedos** (crepitantes, subcrepitantes/de burbuja); frote pleural; **vibraciones vocales**; **expansión torácica**; **excursión de las bases** | «rales», «soplo tubárico», «crepitantes finos/gruesos» (usar crepitantes/subcrepitantes) |
| Percusión | **sonoridad** (pulmón normal), **hipersonoridad**, **matidez**, **submatidez**, **timpanismo**; percusión **dígito-digital**; **columna sonora** | «resonante», «hiperresonante» |
| Abdomen | **ruidos hidroaéreos (RHA)**, timpanismo, matidez hepática, **hepatimetría**, espacio de Traube, palpación superficial y profunda, mano en cuchara/gancho, **puñopercusión lumbar**, peloteo renal, puntos ureterales, signos de Murphy, Blumberg, Rovsing, psoas, obturador; **matidez desplazable**, **onda ascítica** | «borborigmos» (solo como sinónimo) |
| Neurología | **reflejos osteotendinosos (profundos)** y **cutáneos (superficiales)**; escala 0–4+ (0 arreflexia, 1+ hiporreflexia, 2+ normal, 3+ hiperreflexia, 4+ con clonus); **signo de Babinski**; **taxia** (coordinación), **praxia**, **tono**, **trofismo**, **motilidad activa/pasiva**; sensibilidad superficial (táctil, dolorosa, térmica) y profunda (**palestesia** vibratoria, **batiestesia** posicional, **barestesia** presión); **signos meníngeos** | — |
| Cabeza y cuello | **facies**, fondo de ojo, otoscopia, rinoscopia, **fauces**, amígdalas, tiroides (bocio grados 0–II OMS), **adenopatías** | «fascies» |
| General | **impresión general**, actitud/postura, **decúbito**, facies, hábito constitucional, estado de nutrición e hidratación, **marcha** | — |
| Piel | lesiones elementales **primarias** (mácula, pápula, placa, nódulo, tubérculo, vesícula, ampolla, pústula, habón) y **secundarias** (escama, costra, erosión, úlcera, fisura, cicatriz, atrofia, liquenificación) | — |
| Locomotor | examen osteoarticular y muscular: inspección, palpación, **movilidad activa y pasiva**, goniometría, maniobras | — |

## Valores normales de referencia (adulto; usar rangos)

- FC 60–100 lpm · FR 12–20 rpm (eupnea) · PA normal < 120/80 mmHg (elevada 120–129/<80; HTA ≥ 140/90 en consultorio según guías europeas, ≥ 130/80 según ACC/AHA: mencionar la discrepancia una sola vez) · presión de pulso 30–50 mmHg.
- Temperatura: axilar 35,8–37,0 °C; oral ≈ +0,3–0,5; rectal ≈ +0,5–0,8. SpO₂ ≥ 95 % al aire ambiente.
- IMC: bajo peso < 18,5; normal 18,5–24,9; sobrepeso 25–29,9; obesidad ≥ 30. Cintura de riesgo: ≥ 94 cm varón / ≥ 80 cm mujer (OMS/IDF; riesgo elevado ≥ 102 / ≥ 88).
- Hepatimetría en LMC 6–12 cm (Argente: ~10–12 cm en el varón adulto, menor en la mujer). Bazo no palpable (Traube sonoro/timpánico).
- Pupilas 2–4 mm (hasta 5 en jóvenes/oscuridad), isocóricas, reflejos fotomotor y consensual presentes.
- Glasgow normal 15 (O4 V5 M6). Mini-Mental 30; corte habitual < 24 (ajustar por escolaridad).
- Ingurgitación yugular: a 45°, columna ≤ 3–4 cm sobre el ángulo esternal (PVC ≈ 8–9 cmH₂O máx.).
- Diámetro aórtico palpable < 3 cm. Llenado capilar < 2 s. Edema: signo de fóvea (godet) ausente.

## Personas de referencia

`NormalEngine.people` tiene ahora **4 personas**: 28 F, 45 M, 72 M y **60 F (posmenopáusica, IMC 23,8, cintura 82)**.
Todo módulo debe funcionar con cualquier cantidad de personas (no indexar por posición fija; si el módulo añade datos por persona,
que sean por `id` o con un valor por defecto). Los hallazgos dependientes de sexo/edad (mama, genitales, cambios fisiológicos del
envejecimiento, menopausia) deben contemplar a la persona 4.

## APIs nuevas del núcleo (app.js / normal-engine.js)

- `sh.explored(clave)`: marca una región/maniobra como explorada (progreso persistente). `NormalEngine` lo hace solo; los módulos con
  Shell propio deben llamarlo en cada maniobra válida (clave estable, p. ej. `'pa:sistolica'`) y declarar en `new Shell(root, {...})`
  `id: '<id del módulo>'` y `progressTotal: <número de claves distintas posibles>`.
- `evaluate(c, recordEl)` puede devolver `{ html, ok, total }` para que el puntaje del cuestionario se guarde; la cadena sigue funcionando.
- `refs: [...]` en `NormalEngine.build` o en `registerModule`/`Shell` muestra una tarjeta «Bibliografía».
- `U.toast(msg, 'ok'|'bad')` para avisos breves.
- Las regiones de `NormalEngine` ya son accesibles por teclado (`tabindex`, Enter/Espacio). Los botones propios de cada módulo deben tener
  texto o `aria-label`.

## Lista de comprobación por módulo

1. **Terminología**: aplicar la tabla anterior en todos los textos visibles (hallazgos, pistas, cuestionario, puntos de enseñanza, rótulos SVG).
   Mantener intactas las claves de código (`s1`, `s2`, `resonant`, etc.).
2. **Exactitud**: cada hallazgo normal con su valor o rango; técnica en orden (inspección → palpación → percusión → auscultación; en abdomen
   la auscultación va antes de percutir y palpar). Quitar afirmaciones dudosas o sin respaldo.
3. **Concisión**: los hallazgos siguen el esquema «*Técnica:* … *Hallazgo normal:* …» en 1–3 frases; nada de párrafos largos.
4. **Cuestionario**: 8 preguntas, respuesta correcta en posiciones variadas (no siempre la primera), explicación breve; al menos 2 preguntas
   que dependan de la persona cuando tenga sentido.
5. **Visual**: renderizar cada escena (p. ej. con `sharp` desde el scratchpad, como hicieron otros agentes) y corregir rótulos encimados o
   recortados, anillos fuera del dibujo, textos > 16 caracteres en rótulos cortos (usar `lx, ly, anchor` o abreviar). Tipografía y colores
   según `docs/guia-modulos.md`. El SVG debe verse bien a 360 px de ancho (nada esencial más pequeño que ~10 px de alto en el viewBox).
6. **Persona 4** y cualquier número de personas: comprobar con un arnés en Node (jsdom) todas las personas × escenas × instrumentos × regiones.
7. **Progreso**: Shell propio → `id`, `progressTotal`, `sh.explored()`; cuestionario → `{html, ok, total}`.
8. **Limpieza al salir** de escena/módulo: cancelar rAF, intervalos y `Sound.stop()`.
9. **Bibliografía** (`refs`).
10. `node --check` y, si es posible, el arnés jsdom sin errores. **No usar el navegador ni el servidor de vista previa.** No tocar archivos
    compartidos (`app.js`, `normal-engine.js`, `main.js`, `index.html`, `style.css`, `audio-engine.js`).
