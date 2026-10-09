# Guía para crear módulos de SemioSim

SemioSim es una web estática (HTML + JS clásico, sin build). Cada aparato o sistema es un módulo en `js/mod-*.js`.
Esta guía resume el contrato técnico. **Lee antes** `js/app.js` (Shell), `js/normal-engine.js` y, como ejemplo de módulo
personalizado, `js/neuro.js`. Para el sonido, `js/audio-engine.js`.

## Reglas generales

- Idioma de toda la interfaz y el contenido: **español** (terminología médica de Latinoamérica/España).
- JS clásico dentro de una IIFE `(function(){ 'use strict'; ... })();`. Sin módulos ES, sin dependencias externas, sin CDN.
- Un módulo = un archivo `js/mod-XXXX.js` que termina llamando a `registerModule({...})` (el motor `NormalEngine.build` ya lo hace).
- **No edites archivos compartidos** (`app.js`, `main.js`, `index.html`, `style.css`, `audio-engine.js`, `normal-engine.js`, `neuro.js`, `chest.js`).
  Si necesitas estilos extra, inyéctalos desde tu módulo con un `<style>` creado por JS (clases con prefijo propio, p. ej. `.vit-…`).
  Nombres globales propios con prefijo del módulo para no chocar con otros.
- Todo el contenido de este lote es **exploración NORMAL**. Valores, rangos y hallazgos normales deben ser **médicamente correctos y
  consistentes con la bibliografía estándar de semiología** (Surós, Argente-Álvarez, Bates, Swartz, Seidel, Talley-O'Connor). Evita datos dudosos:
  si un valor varía según la fuente, usa un rango.
- El tono es educativo y profesional. En genitales/mama usa solo diagramas esquemáticos y texto técnico, **nunca imágenes explícitas**.
- Valida la sintaxis con `node --check js/mod-XXXX.js`. **No uses el navegador ni el servidor de vista previa** (otros agentes trabajan a la vez);
  el integrador probará en el navegador.
- Responde al final con un resumen breve: archivos creados, id(s) de módulo, y cualquier limitación.

## Shell (js/app.js)

`new Shell(root, cfg).start()` construye la pantalla: panel de persona/caso, modo Aprendizaje/Examen, instrumentos, pestañas de escenas,
escena central, registro de maniobras y panel "Mis hallazgos". `cfg`:

```
cases:[{id, age, sex:'M'|'F', complaint, vitals, diag, v:{...}, findings?:[html], teaching?:[html]}]
scenes:{ id: { label, hint, tools:[{id,icon,label}], enter(stage, sh), leave(), setTool(id), refresh() } }
order:[ids de escenas]
record(case) -> html            // panel "Mis hallazgos"
evaluate(case, recordEl) -> html // al pulsar el botón de comprobar
hideDx:true                     // oculta el desplegable de diagnóstico (usar siempre en exploración normal)
checkLabel, recordTitle, patientTitle, caseLabel(c,i), teaching:[...]  // textos opcionales
```

API de la instancia `sh`: `sh.case`, `sh.mode` (`'learn'|'exam'`), `sh.tool`, `sh.log(html, cls)` (cls: `'find'|'patient'|'warn'|''`),
`sh.say(texto, 'yes'|'no')` (burbuja del paciente), `sh.hint(texto)`, `sh.selectTool(id)`, `sh.$(selector)`, `sh.destroy()`.
`stage` es el `div` central; las escenas dibujan ahí (normalmente un `<svg class="scene" viewBox=...>`). `enter` se llama en cada cambio de pestaña,
de caso y de escena; limpia animaciones en `leave()` (cancelar `requestAnimationFrame`, `Sound.stop()`, temporizadores).
El módulo debe devolver la instancia de Shell desde `mount(root)` (el router llama a `.destroy()`).

## Utilidades `U`

`U.clamp, U.lerp, U.esc(html), U.svgPoint(svgEl, evento) -> {x,y}` y `U.tween(ms, fn(u), done)` -> función cancelar.

## NormalEngine (js/normal-engine.js)

Motor declarativo para escenas "dibujo + regiones clicables + hallazgo por instrumento" con cuestionario. Mira la cabecera del archivo para el
contrato completo (`NormalEngine.build({...})`). Los valores normales de cada persona están en `c.v`
(`hr, sbp, dbp, rr, temp, spo2, height, weight, waist`) y hay 3 personas sanas (28 F, 45 M, 72 M) en `NormalEngine.people`.
Un hallazgo puede ser texto, función `(c, ctx) => html` o `{ html, run(ctx) }` para disparar sonido/animación.
Si necesitas widgets propios (deslizadores, animaciones) usa el gancho `after(stage, sh, ctx)` o escribe un Shell propio como `neuro.js`.

## Sonido (`Sound`, js/audio-engine.js)

- `Sound.listen({heart:{rate,s1,s2,s3,s4,snap,murmur}, heartGain, lung:{type:'normal'|'bronchial'|'diminished', adv:[]}, lungGain, mode:'diaphragm'|'bell'})`
  reproduce en bucle ruidos cardíacos/pulmonares (ver `chest.js` → `soundSpec` como ejemplo). `Sound.stop()` lo detiene. `Sound.current()` da datos para dibujar el fonocardiograma.
- `Sound.percuss('resonant'|'dull'|'hyper')` golpe de percusión.
- `Sound.beep(freq, dur, gain)`, `Sound.korotkoff(vol)`, `Sound.bowel(eventosPorMin, gain)` (ruidos hidroaéreos en bucle; se detiene con `Sound.stop()`).
- El audio solo arranca tras un gesto del usuario (clic), así que llámalo desde manejadores de clic.

## Convenciones visuales

- Fondo de escenas claro (`#e8eef4`); piel `#f1c9a5` con contorno `#b98a63`. Clases útiles: `svg-title`, `svg-small`, `svg-hint`, `hintring`
  (elementos que solo se ven en modo Aprendizaje), `.btn`, `.btn.small`, `.seg`, `.overlay-top`.
- El tema claro/oscuro usa variables CSS (`--panel`, `--ink`, `--muted`, `--line`, `--brand`, `--soft`, `--ok`, `--bad`, `--warn`).
  Las escenas SVG se pintan con colores fijos sobre fondo claro; el HTML propio debe usar las variables para ser legible en ambos temas.
- Debe funcionar con ratón y táctil (usa `pointerdown/pointermove` o `click`), y en ancho de móvil (SVG con `viewBox` y `width:100%`).
- Cada módulo debe tener: (1) varias escenas/pestañas, (2) interacción real (no solo texto), (3) hallazgos normales precisos con valores,
  (4) un cuestionario breve (5–8 preguntas, con explicación) que se evalúe al comprobar, y (5) 3–5 puntos de enseñanza sobre la técnica.

## Capa anatómica translúcida (`#anat`)

Cualquier escena puede dibujar la anatomía subyacente (huesos, órganos, tendones, nervios) en un grupo `<g id="anat">` colocado
**encima** del dibujo de la piel y **debajo** de los puntos clicables. El Shell detecta ese grupo tras `enter()` y añade un control
deslizante «Anatomía» que regula su opacidad (0 = oculta; el usuario lo recuerda entre escenas; en modo Examen arranca en 0).
En `NormalEngine.build` basta con declarar `anatomy: (learn, c) => '<g>…</g>'` en la escena. Reglas de dibujo: colores anatómicos
discretos (hueso `#f1e9dc`, pulmón `#d9a1a1`, corazón `#c0504d`, hígado `#9e4b3a`, tendón `#f5f0e6`, nervio `#f2d35b`), trazo fino,
rótulos con `class="svg-small"`, y nunca tapar los rótulos de los puntos. Debe verse bien a opacidad 30–70 %.
