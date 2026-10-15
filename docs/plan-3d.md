# Plan 3D de SemioSim

Objetivo: usar 3D donde la maniobra es espacial (girar, rotar, ver capas) y mantener el 2D donde un esquema es más claro.

## Fase 0 · Prototipo (hecho)

- `3d/hombro.html` + `3d/hombro3d.js`: goniometría del hombro en 3D con Three.js (copiado en `vendor/three/`, sin CDN, funciona sin conexión).
- Flexión, extensión, abducción, rotación externa e interna; modo activa/pasiva/libre con los mismos topes que `js/mod-msk.js`.
- Goniómetro (eje, brazo fijo, brazo móvil, arco), plano del movimiento, rango normal, arco doloroso del caso de manguito rotador (`m5` de `js/mod-pat-msk.js`).
- Capa de huesos con piel transparente y ritmo escapulohumeral.
- Reto «estima el ángulo» para entrenar el ojo clínico.
- Figura esquemática hecha con primitivas: es el punto débil y lo que cambia en la fase 2.

## Fase 0b · Tórax respiratorio (hecho)

- `3d/torax.html` + `3d/torax3d.js`: proyección de lóbulos, cisuras, fondos de saco pleurales y área cardíaca sobre el tórax, calculada en el sombreador; la misma función en JS dice qué lóbulo hay bajo el punto tocado.
- Vistas anterior, laterales (brazos elevados) y posterior; líneas medioesternal, medioclavicular, axilar media y escapular; escápula y apófisis espinosas.
- Respiración: las bases bajan de T10 a T12 y ocupan el fondo de saco.
- Reto «¿dónde auscultarías?» con 8 consignas.
- Estilos comunes de las páginas 3D en `3d/base3d.css`.

## Fase 1 · Validar (1-2 semanas)

1. Probarlo en el celular propio y en 3-5 celulares de compañeros (gama media incluida). Anotar: ¿carga rápido?, ¿se entiende arrastrar el brazo?, ¿se ve mejor que el 2D?
2. Enseñárselo a un docente de semiología y pedir una corrección concreta.
3. Decidir con esos datos si se sigue con 3D.

## Fase 2 · Modelo anatómico real

- Fuentes libres: Z-Anatomy y BodyParts3D (licencia CC BY-SA: citar y compartir esos modelos con la misma licencia; el código sigue siendo MIT).
- Flujo: descargar el modelo → limpiarlo y simplificarlo con un script de Blender (Python, sin interfaz) → exportar `.glb` comprimido (meta: < 3 MB por escena) → cargarlo con `GLTFLoader` en lugar de las primitivas.
- Mantener los mismos puntos de articulación (hombro, codo) para no rehacer la lógica.

## Fase 3 · Más escenas 3D

Por orden de impacto:
1. Torso con focos de auscultación, líneas de referencia y decúbito lateral izquierdo (cardio).
2. Abdomen con 9 regiones y cuadrantes, vísceras con transparencia.
3. Ojo con músculos extraoculares (pares III, IV y VI, 9 posiciones de la mirada).
4. Rodilla y codo para reflejos (el martillo golpea y la pierna responde).
5. Cadera y rodilla en goniometría.

## Fase 4 · Integración

- Pestaña «3D» dentro de cada módulo (junto a la vista 2D), que solo carga Three.js al abrirse.
- Botón «Ver en 2D» siempre visible como respaldo (sin WebGL o celulares lentos).
- Registrar las maniobras 3D en el mismo progreso (`Progress`) y en la prueba automática.

## Reglas

- El 2D no se elimina.
- Cada modelo indica fuente y licencia en la página de bibliografía.
- Nada de contenido clínico nuevo sin revisión docente.
