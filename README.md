# SemioSim · Semiología médica interactiva

Prototipo web de práctica de exploración física con pacientes virtuales. No requiere instalación ni compilación.

## Cómo abrirlo

Haz doble clic en `index.html`, o sirve la carpeta con cualquier servidor estático:

```bash
python -m http.server 8765
```

y abre <http://localhost:8765>.

## Qué incluye

**Exploración normal** (10 módulos; la patología se añadirá después):
Anamnesis e historia clínica · Signos vitales y estado general · Piel, faneras y mucosas · Cabeza y cuello · Pares craneales, motor y estado mental · Aparato respiratorio · Aparato cardiovascular y pulsos · Abdomen · Genitourinario y mama · Aparato locomotor.

**Casos clínicos** (con pacientes virtuales y hallazgos patológicos):
- Neurología: reflejos con martillo (0 a 4+), clonus, Babinski, monofilamento, diapasón, pares craneales y reflejo pupilar (9 casos).
- Tórax: auscultación cardíaca y pulmonar, percusión, fonocardiograma (11 casos).

Cada módulo tiene modo **Aprendizaje** (con pistas) y modo **Examen** (sin pistas, con cuestionario y comparación final).

## Cómo añadir un módulo

Lee `docs/guia-modulos.md`. Un módulo es un archivo `js/mod-xxx.js` que llama a `registerModule({...})` (o a `NormalEngine.build`); se añade con una línea `<script>` en `index.html`. Para probarlos todos de una vez hay un script en `docs/smoke-test.js`.

## Cómo añadir casos

Los casos son datos puros:

- `js/data-neuro.js`: reflejos por lado, hallazgos de los pies y modelo ocular de cada caso.
- `js/data-chest.js`: soplos por foco, sonidos pulmonares por punto y percusión.

Basta con añadir un objeto a la lista y aparece en el selector.

## Sobre los sonidos

Los ruidos cardíacos y respiratorios se sintetizan con Web Audio (`js/audio-engine.js`). Son aproximaciones didácticas, no grabaciones reales. Para mayor fidelidad se pueden sustituir por audios reales con licencia abierta.

## Estructura

```
index.html
css/style.css
js/app.js           utilidades, registro de módulos y marco común (Shell)
js/normal-engine.js motor declarativo para módulos de exploración normal
js/mod-*.js         un módulo por aparato o sistema (exploración normal)
js/audio-engine.js  síntesis de sonidos
js/data-*.js        casos clínicos
js/neuro.js         escenas de neurología
js/chest.js         escenas de tórax
js/main.js          navegación
```

Herramienta educativa. Los casos son ficticios y no sustituyen la práctica con pacientes reales.
