# SemioSim · Semiología médica interactiva

**Web publicada:** <https://painnss.github.io/semiosim/> · Código: <https://github.com/Painnss/semiosim>

Simulaciones interactivas de exploración física para estudiantes de medicina. Pacientes virtuales que se exploran con instrumentos
(martillo de reflejos, fonendoscopio, linterna, monofilamento, goniómetro…), con modo Aprendizaje y modo Examen, cuestionario y solución.
Nomenclatura y técnica según **Argente-Álvarez, *Semiología Médica*** (Panamericana).

Web estática: HTML + CSS + JavaScript, sin compilación ni dependencias en tiempo de ejecución. Funciona sin conexión tras la primera visita (PWA).

## Cómo abrirlo

Doble clic en `index.html`, o con un servidor estático (recomendado, habilita el modo sin conexión):

```bash
python -m http.server 8780
```

y abre <http://localhost:8780>. En el teléfono, «Añadir a la pantalla de inicio» instala la aplicación.

## Qué incluye

**Exploración normal** (10 módulos, 4 personas sanas: 28 F · 45 M · 72 M · 60 F):
Anamnesis e historia clínica · Signos vitales y estado general · Piel, faneras y mucosas · Cabeza y cuello · Pares craneales, motor y
estado mental · Aparato respiratorio · Aparato cardiovascular y pulsos · Abdomen · Genitourinario y mama · Aparato locomotor.

**Exploración patológica** (8 módulos que reutilizan las escenas normales con pacientes que presentan síndromes; con diagnóstico a adivinar en modo Examen): piel, cabeza y cuello, neurológico, respiratorio, cardiovascular, abdomen, genitourinario y mama, locomotor; más la **biblioteca de auscultación** (26 sonidos normales y patológicos con comparación A/B).

**Casos clínicos** (pacientes con hallazgos patológicos):
- Neurología: reflejos con martillo (0 a 4+), clonus, Babinski, monofilamento, diapasón, pares craneales y reflejo pupilar (9 casos).
- Tórax: auscultación cardíaca y pulmonar, percusión, fonocardiograma (11 casos).

**Referencia**: glosario de semiología con buscador y página de bibliografía con la correspondencia módulo → temas del libro.

Cada módulo tiene modo **Aprendizaje** (con pistas) y **Examen** (sin pistas), registro de maniobras, cuestionario y puntos de enseñanza.
El progreso (maniobras exploradas y mejor puntaje) se guarda en el navegador y se ve en la portada.

## Pruebas

```bash
npm install
npm test
```

`npm test` carga la aplicación en jsdom, monta cada módulo y recorre todas las personas × escenas × instrumentos × regiones;
falla con cualquier error de JavaScript. `npm run check` solo valida la sintaxis.

## Cómo añadir contenido

- **Un módulo**: lee `docs/guia-modulos.md` (contrato técnico) y `docs/revision-argente.md` (criterios de contenido y nomenclatura).
  Un módulo es un archivo `js/mod-xxx.js` que llama a `registerModule({...})` o a `NormalEngine.build({...})`, más una línea `<script>` en `index.html`.
- **Un caso clínico**: `js/data-neuro.js` y `js/data-chest.js` son datos puros; basta con añadir un objeto.
- **Un término del glosario**: `js/mod-glossary.js`, lista `TERMS`.

## Estructura

```
index.html, manifest.webmanifest, sw.js, icon.svg
css/style.css
js/app.js           utilidades, progreso persistente, registro de módulos y marco común (Shell)
js/normal-engine.js motor declarativo para módulos de exploración normal (personas de referencia)
js/audio-engine.js  síntesis de sonidos (ruidos cardíacos, respiratorios, percusión, Korotkoff, RHA)
js/mod-*.js         un módulo por aparato o sistema; mod-glossary.js = glosario y bibliografía
js/neuro.js, js/chest.js, js/data-*.js   casos clínicos
js/main.js          navegación, portada con progreso, volumen, service worker
test/smoke.js       prueba automática (jsdom)
docs/               guía de módulos, criterios de revisión, auditoría
```

## Estado y límites

- Los textos los redactó una IA siguiendo la nomenclatura de Argente-Álvarez; **antes de usarlo en un curso debe revisarlo un docente**.
  `docs/auditoria.md` resume la crítica y las decisiones tomadas.
- Los sonidos son sintetizados (aproximaciones didácticas), no grabaciones reales.
- Las figuras son esquemáticas (SVG), no modelos anatómicos.
- Herramienta educativa: los casos son ficticios y no sustituyen la práctica con pacientes reales ni el criterio clínico.

Licencia del código: MIT. El contenido no reproduce texto de ninguna obra; las referencias bibliográficas se citan por tema.
