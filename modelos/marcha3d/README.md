# Paciente 3D para la marcha (SemioSim)

| Archivo | Uso |
|---|---|
| `marcha.glb` (7,8 MB) | Persona con esqueleto, 7 animaciones y el marco de una puerta. Lo carga `js/gait3d.js`. |
| `marcha.blend` | Fuente en Blender, con las texturas empacadas. |
| `marchas_meta.json` | Duración de cada animación. |
| `textures/` | Texturas modificadas: camiseta sin logotipo y pelo canoso. |

## Origen y licencia

- La persona se generó con **MPFB 2** (MakeHuman para Blender). Usa recursos **CC0** de MakeHuman: el paquete *makehuman_system_assets* (cuerpo, piel, ojos, pelo, cejas, pestañas, ropa `male_casualsuit06` y zapatillas `shoes06`).
- CC0 no exige atribución. Aun así se agradece mencionar «MakeHuman / MPFB».
- Cambios hechos sobre esos recursos:
  - el pantalón se cortó a la altura de la rodilla para que se vean la rodilla y el tobillo;
  - se borró el logotipo de la camiseta y el pelo se pasó a canoso;
  - las texturas se redujeron a 1024 px.
- Las animaciones y el resto del modelo son de SemioSim y tienen la misma licencia que el repositorio.

## Cómo están hechas las animaciones

En `marcha.blend` hay tres textos internos:

- **`gait2`** es el motor:
  - planifica los pasos con su apoyo (talón, pie plano, despegue con giro sobre el metatarso) y su balanceo (altura, circunducción, pie caído, roce de la punta);
  - calcula la pelvis y su altura según el alcance de las piernas;
  - resuelve las piernas con IK analítica, así los pies no resbalan;
  - mueve tronco, cabeza, brazos y dedos con ángulos anatómicos.
- **`gait_ub`** tiene los gestos comunes: braceo según el pie adelantado, rotación de la pelvis y mirada que se adelanta en los giros.
- **`gaits_all`** define cada marcha a partir de su descripción. Las funciones son `N_def`, `H_def`, `P_def`, `A_def`, `S_def` y `L_def`.

En todas las marchas la persona recorre el pasillo de ida y vuelta (unos 4 m, con dos giros) y la animación hace un bucle.

| Animación | Clave en `Gait3D` | Qué reproduce |
|---|---|---|
| `Marcha_Normal` | `normal` | Base de 10 cm, paso de 66 cm, ≈113 pasos/min, braceo simétrico, apoyo del talón y despegue de la punta, giro sin vacilación. |
| `Marcha_Hemiparetica_Derecha` | `hemi` | Pierna derecha en extensión y circunducción; pie en equino-varo que roza con la punta; elevación de la hemipelvis; tronco inclinado a la izquierda; brazo derecho flexionado y aducido con el puño cerrado, sin braceo; paso corto y lento. |
| `Marcha_Parkinsoniana` | `park` | Flexión del tronco y las rodillas; vacilación al iniciar; pasos cortos y arrastrados que se aceleran (festinación); bloqueo ante la puerta; giro en bloque en 8 pasos; sin braceo (casi nulo el derecho); temblor de reposo de la mano derecha (≈5 Hz). |
| `Marcha_Ataxica_Cerebelosa` | `atax` | Base amplia (30 cm); pasos irregulares en longitud, dirección y ritmo; oscilación del tronco con lateropulsión; brazos separados; giro inseguro en 6 pasos. |
| `Marcha_Steppage` | `step` | Pies caídos en ambos lados; gran flexión de cadera y rodilla; apoyo de golpe con la punta; base algo ampliada; mira el suelo. |
| `Marcha_Steppage_Derecha` | `stepR` | Lo mismo solo en el lado derecho; braceo derecho reducido y mano derecha en garra. |
| `Marcha_Lenta_Insegura` | `slow` | Pasos cortos y lentos, base amplia, retropulsión con un paso atrás y tronco inclinado hacia atrás; el brazo izquierdo extendido se agarra del acompañante, que no se muestra. |

Para cambiar una marcha:

1. En `marcha.blend`, edita su función en `gaits_all`.
2. Ejecuta `bake(nombre, *X_def(ns))`.
3. Vuelve a exportar `marcha.glb` con el armature, las mallas `Human*` y `Puerta`, en modo de animación «Actions».
4. Ajusta los tiempos de los rótulos en `js/gait3d.js`.
