# Paciente 3D para la marcha (SemioSim)

| Archivo | Uso |
|---|---|
| `marcha.glb` (7,8 MB) | Persona con esqueleto, el marco de una puerta y las 7 marchas de los pacientes neurológicos. Siempre se carga. |
| `marcha_neuro2.glb` (1,4 MB) | Solo animaciones: tijera, taloneante, anserina, apráxica y coreica (glosario). |
| `marcha_msk.glb` (1,2 MB) | Solo animaciones: las marchas de los pacientes del aparato locomotor. |
| `marcha_pruebas.glb` (2,3 MB) | Solo animaciones: tándem, talones y puntas, normales y patológicas. |
| `marcha.blend` | Fuente en Blender: persona, escena y scripts. No incluye las animaciones horneadas, para no engordar el repositorio; se regeneran con los scripts. |
| `scripts/*.py` | Los mismos scripts que hay dentro del `.blend`, para leerlos sin abrir Blender. |
| `marchas_meta.json` | Duración de cada animación. |
| `textures/` | Texturas modificadas: camiseta sin logotipo y pelo canoso. |

`js/gait3d.js` descarga los paquetes de animación solo cuando hacen falta y aplica sus clips sobre la persona de `marcha.glb`. Funciona porque todos comparten el mismo esqueleto.

## Origen y licencia

- La persona se generó con **MPFB 2** (MakeHuman para Blender). Usa recursos **CC0** de MakeHuman: el paquete *makehuman_system_assets* (cuerpo, piel, ojos, pelo, cejas, pestañas, ropa `male_casualsuit06` y zapatillas `shoes06`).
- CC0 no exige atribución. Aun así se agradece mencionar «MakeHuman / MPFB».
- Cambios hechos sobre esos recursos:
  - el pantalón se cortó a la altura de la rodilla para que se vean la rodilla y el tobillo;
  - se borró el logotipo de la camiseta y el pelo se pasó a canoso;
  - las texturas se redujeron a 1024 px.
- Las animaciones y el resto del modelo son de SemioSim y tienen la misma licencia que el repositorio.

## Cómo están hechas las animaciones

| Script | Contenido |
|---|---|
| `gait2` | El motor. Planifica los pasos con su apoyo (talón, pie plano, despegue con giro sobre el metatarso, marcha sobre talones o en puntas, pie en rotación externa) y su balanceo (altura, circunducción, pie caído, roce de la punta). Calcula la pelvis y su altura según el alcance de las piernas, resuelve las piernas con IK analítica para que los pies no resbalen y mueve tronco, cabeza, brazos y dedos con ángulos anatómicos. `Plan.home()` devuelve los pies a su posición inicial para que el bucle cierre. |
| `gait_ub` | Gestos comunes: braceo según el pie adelantado, rotación de la pelvis y mirada que se adelanta en los giros. |
| `gaits_all` | Marchas de los pacientes neurológicos: `N_def`, `H_def`, `P_def`, `A_def`, `S_def`, `L_def`. |
| `gaits_neuro2` | `T_def` (tijera), `TA_def` (taloneante), `AN_def` (anserina), `AP_def` (apráxica), `CH_def` (coreica). |
| `gaits_msk` | `M1_def`, `M2_def`, `M3_def`, `M4_def`, `M7_def`, `M8_def`: pacientes m1–m8 del aparato locomotor. |
| `gaits_tests` | Pruebas: `TN/TX/TH/TI_def` (tándem), `HN/HR/HB/HX_def` (talones), `PN/PR/PX_def` (puntas). |
| `person_lib` | `make_person()`: vuelve a generar la persona con MPFB. |

En todas las marchas la persona recorre un pasillo de unos 4 m de ida y vuelta, con dos giros, y la animación hace un bucle.

### Marchas de los pacientes neurológicos (`marcha.glb`)

| Animación | Clave | Qué reproduce |
|---|---|---|
| `Marcha_Normal` | `normal` | Base de 10 cm, paso de 66 cm, ≈113 pasos/min, braceo simétrico, apoyo del talón y despegue de la punta, giro sin vacilación. |
| `Marcha_Hemiparetica_Derecha` | `hemi` | Pierna derecha en extensión y circunducción; pie en equino-varo que roza con la punta; elevación de la hemipelvis; tronco inclinado a la izquierda; brazo en Wernicke-Mann, sin braceo. |
| `Marcha_Parkinsoniana` | `park` | Flexión; vacilación al iniciar; pasos cortos y arrastrados con festinación; bloqueo ante la puerta; giro en bloque; sin braceo; temblor de reposo de la mano derecha. |
| `Marcha_Ataxica_Cerebelosa` | `atax` | Base amplia; pasos irregulares; oscilación del tronco y lateropulsión; brazos separados; giro inseguro. |
| `Marcha_Steppage` | `step` | Pies caídos en ambos lados; gran flexión de cadera y rodilla; apoyo de golpe; mira el suelo. |
| `Marcha_Steppage_Derecha` | `stepR` | Steppage solo en el lado derecho; braceo derecho reducido y mano en garra. |
| `Marcha_Lenta_Insegura` | `slow` | Pasos cortos, base amplia, retropulsión con un paso atrás; se agarra del acompañante (que no se muestra). |

### Otras marchas neurológicas (`marcha_neuro2.glb`, glosario)

| Animación | Clave | Qué reproduce |
|---|---|---|
| `Marcha_Tijera` | `tijera` | Muslos en aducción con los pies cruzándose, rodillas semiflexionadas, equino con roce de la punta, balanceo compensador del tronco. |
| `Marcha_Taloneante` | `taloneante` | Base amplia, lanza las piernas hacia delante y afuera, golpea con los talones, mira el suelo. |
| `Marcha_Anserina` | `anserina` | Caída de la pelvis del lado que se eleva, tronco que se balancea hacia el apoyo, hiperlordosis, base amplia. |
| `Marcha_Apraxica` | `apraxica` | Le cuesta iniciar; pasos muy cortos que deslizan sin despegar; base amplia con pies en rotación externa; giro en muchos pasos; tronco erguido y braceo conservado. |
| `Marcha_Coreica` | `coreica` | Movimientos involuntarios breves e irregulares de brazos, tronco y cabeza; pasos irregulares con flexiones bruscas de las rodillas. |

### Aparato locomotor (`marcha_msk.glb`)

| Animación | Clave | Paciente | Qué reproduce |
|---|---|---|---|
| `Marcha_Antalgica_Lumbar` | `m1` | m1, lumbociática | Apoyo breve y cauteloso sobre la pierna derecha, tronco rígido inclinado hacia delante y a la izquierda, braceo escaso. |
| `Marcha_Rigida_Espondilitis` | `m2` | m2, espondilitis anquilosante | Tronco en bloque inclinado hacia delante, mirada al suelo, gira todo el cuerpo, pasos cortos. |
| `Marcha_Gonartrosis_Derecha` | `m3` | m3, gonartrosis | Lenta, apoyo derecho acortado, rodilla derecha en flexión durante el apoyo. |
| `Marcha_LCA_Izquierdo` | `m4` | m4, rotura del LCA | Apoyo izquierdo breve con la rodilla semiflexionada; inestabilidad al girar. |
| `Marcha_Metatarsalgia` | `m7` | m7, artritis reumatoide | Marcha conservada con el despegue del antepié acortado. |
| `Marcha_Claudicante_Cadera` | `m8` | m8, coxartrosis | Apoyo derecho acortado, caída de la pelvis izquierda (Trendelenburg), tronco hacia la derecha (Duchenne), pie derecho en rotación externa. |

Los pacientes m5 y m6 (hombro y túnel carpiano) usan la marcha normal.

### Pruebas de marcha (`marcha_pruebas.glb`)

| Clave | Qué reproduce | Quién la usa |
|---|---|---|
| `tandN` | Tándem normal. | Examen normal, paciente con parálisis de Bell y pacientes del aparato locomotor sin hallazgos. |
| `tandAtax` | Se sale de la línea y separa los pies. | Síndrome cerebeloso. |
| `tandHemi` | No puede poner el pie derecho delante. | Síndrome piramidal. |
| `tandIns` | Posible pero lenta e insegura. | Parkinson, polineuropatía, neurona motora inferior, m3, m4 y m8. |
| `heelN` | Talones normal. | Examen normal y Parkinson. |
| `heelR` | No eleva la punta derecha. | Síndrome piramidal y neurona motora inferior. |
| `heelB` | No puede en ningún lado: pies caídos. | Polineuropatía. |
| `heelX` | Fuerza conservada pero inestable. | Síndrome cerebeloso. |
| `toesN` | Puntas normal. | Examen normal y Parkinson. |
| `toesR` | El talón derecho desciende. | Síndrome piramidal, neurona motora inferior y m1. |
| `toesX` | Inestable, apoya el talón. | Síndrome cerebeloso y polineuropatía. |

Para cambiar una marcha:

1. En `marcha.blend`, edita su función en el script que corresponda.
2. Hornéala con `bake(nombre, *X_def(ns))`.
3. Exporta el paquete con el filtro de acciones del exportador glTF. Para `marcha.glb` exporta el armature, las mallas `Human*` y `Puerta`; para los paquetes, solo el armature, sin pieles ni materiales.
4. Ajusta los tiempos de los rótulos en `js/gait3d.js`.
