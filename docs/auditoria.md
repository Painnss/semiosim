# Auditoría crítica de SemioSim y decisiones (octubre 2026)

Revisión hecha como responsable del proyecto, con la pregunta: *¿qué impide que esto salga a la luz y se use en un curso de semiología?*
Referencia bibliográfica del curso: **Argente HA, Álvarez ME. Semiología Médica** (Panamericana).

## 1. Diagnóstico

### Lo que estaba bien
- La idea central funciona: pacientes virtuales explorables con instrumentos, modo Aprendizaje/Examen, cuestionario y solución.
- Arquitectura simple y portable: HTML + JS sin compilación, un archivo por módulo, un marco común (`Shell`) y un motor declarativo (`NormalEngine`).
- Cobertura amplia: 10 módulos de exploración normal y 2 de casos clínicos, todos funcionales (0 errores en 6.000 clics automáticos).

### Lo que no podía salir así
| Problema | Gravedad | Por qué importa |
|---|---|---|
| **Contenido sin revisión contra una fuente única.** Cinco agentes escribieron en paralelo con criterios propios: mezcla de nomenclaturas (S1/S2 vs R1/R2, «crepitantes finos» vs «estertores», «resonante» vs «sonoridad», «tubárico» vs «tubario»), valores con fuentes distintas, textos largos. | Alta | Un estudiante que usa Argente-Álvarez encontraría términos que no coinciden con su libro ni con su examen. Es el defecto que más credibilidad resta. |
| **Sin control de versiones.** | Alta | Imposible revisar cambios, volver atrás o colaborar. |
| **Sin pruebas automáticas.** Solo una prueba manual en el navegador. | Alta | Cualquier cambio podía romper un módulo sin que nadie lo notara. |
| **Bug real en `U.tween`** (progreso negativo en el primer fotograma). | Media | Rompía animaciones de pares craneales de forma intermitente. |
| **Dependencia frágil del número de personas.** `mod-msk.js` indexaba por posición. | Media | Añadir una persona rompía el módulo (comprobado con la nueva prueba). |
| **Sin progreso ni memoria.** Al recargar se perdía todo. | Media | Sin progreso no hay motivación para completar los 12 módulos ni forma de saber qué falta. |
| **Sin bibliografía ni glosario.** | Media | Para un material docente es obligatorio decir de dónde salen los valores y poder consultar los términos. |
| **Personas de referencia incompletas**: 3 personas (28 F, 45 M, 72 M); ninguna mujer de edad media/mayor, relevante para mama, ginecología y cambios de la menopausia. | Media | Hallazgos normales sesgados. |
| **Errores silenciosos.** Un fallo de JS dejaba la escena en blanco sin aviso. | Media | El usuario no sabe si es él o la aplicación. |
| **Sonido**: sin control de volumen; R2 sin desdoblamiento; sin respiración broncovesicular. | Baja-media | Limita la fidelidad de dos módulos. |
| **Accesibilidad**: regiones solo con ratón; sin `aria`; sin foco visible. | Media | Excluye teclado y lectores de pantalla. |
| **Móvil no verificado**; pestañas e instrumentos desbordaban en pantallas estrechas. | Media | Muchos estudiantes repasan en el teléfono. |
| **Sin uso sin conexión / instalable.** | Baja | En el hospital o en el aula la conexión falla. |
| Detalles visuales: rótulos encimados (abdomen), figuras esquemáticas poco legibles (hombro en locomotor), inconsistencia entre módulos. | Baja-media | Afecta a la sensación de calidad. |
| Un archivo ajeno (`.pptx` de otro curso) en la carpeta del proyecto. | Baja | Confusión y riesgo de publicarlo por error. Se excluye del repositorio; no se borra. |

## 2. Decisiones

### Se mantiene
- Arquitectura sin compilación (un estudiante o docente puede abrir `index.html` y ver el código).
- Un módulo por aparato/sistema, con escenas, instrumentos, registro, cuestionario y solución.
- Sonido sintetizado como solución provisional (ver hoja de ruta).

### Se cambia
1. **Nomenclatura y contenido alineados con Argente-Álvarez** en los 12 módulos, con una lista de verificación común (`docs/revision-argente.md`): R1–R4, soplos eyectivos/regurgitativos, rolido, estertores secos/húmedos, sonoridad/matidez/timpanismo, soplo tubario, vibraciones vocales, RHA, hepatimetría, palestesia/batiestesia, reflejos 0–4+, facies, etc. Hallazgos en formato «Técnica → Hallazgo normal», breves y con cifras. **Sin copiar texto del libro**: solo se cita por tema.
2. **Bibliografía por módulo** (tarjeta en cada módulo) y **página de bibliografía** con la correspondencia módulo → temas del libro.
3. **Glosario** de ~130 términos con buscador y filtro por sistema.
4. **Cuarta persona**: mujer de 60 años, posmenopáusica (IMC 23,8). Todos los módulos deben funcionar con cualquier número de personas.
5. **Progreso persistente** (localStorage): maniobras exploradas por módulo, mejor puntaje de cuestionario, panel de progreso en la portada y barra en cada módulo. Botón para reiniciar.
6. **Pruebas automáticas** (`npm test`, jsdom): monta cada módulo y recorre personas × escenas × instrumentos × regiones; falla con cualquier error. Se ejecuta antes de cada versión.
7. **Git** con historial desde el prototipo.
8. **Errores visibles** (aviso en pantalla) y corrección del bug de `U.tween`.
9. **Audio**: volumen y silencio en la cabecera (recordados), desdoblamiento del R2 (`s2split`), respiración broncovesicular.
10. **Accesibilidad**: regiones navegables por teclado (Tab, Enter/Espacio), `aria-pressed` en instrumentos, `aria-live` en registro, foco visible, `prefers-reduced-motion`.
11. **Móvil**: pestañas con desplazamiento horizontal, instrumentos en cuadrícula, cabecera compacta, SVG a ancho completo.
12. **PWA**: `manifest` + service worker (funciona sin conexión tras la primera visita) e icono.
13. **Portada rediseñada**: cómo usar en 3 pasos, orden didáctico del libro (anamnesis → examen general → piel → cabeza y cuello → neurológico → respiratorio → cardiovascular → abdomen → genitourinario → locomotor), progreso por tarjeta, hoja de ruta.

### Se quita
- Textos largos y repetidos en hallazgos (se reducen a lo esencial).
- Afirmaciones sin respaldo o con valores en conflicto entre fuentes (se eliminan o se expresan como rango).
- Las «próximamente» vagas de la portada (se sustituyen por una hoja de ruta concreta).
- El archivo `.pptx` ajeno queda fuera del repositorio.

## 3. Lo que sigue pendiente (y es honesto decirlo)

1. **Revisión clínica por un docente.** La nomenclatura y los valores se alinearon con Argente-Álvarez con la mejor diligencia posible, pero
   el proyecto lo escribió una IA. Antes de usarlo en un curso, un docente de semiología debe revisar cada módulo (hay un cuestionario y
   una lista de hallazgos por módulo que facilitan esa revisión).
2. **Sonidos reales.** El sonido es sintetizado; para entrenar el oído hacen falta grabaciones con licencia abierta.
3. **Patología por aparato**: la siguiente fase, reutilizando las mismas escenas con los síndromes del libro.
4. **Figuras**: son esquemáticas. Para una versión pública conviene un ilustrador o modelos 3D.
5. **Evaluación pedagógica**: medir si mejora el desempeño en el examen físico real (antes/después con estudiantes).
