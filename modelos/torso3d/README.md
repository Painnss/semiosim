# Torso de auscultación (SemioSim)

| Archivo | Uso |
|---|---|
| `torso_auscultacion_draco.glb` (0,8 MB) | Para la web. Necesita `DRACOLoader` en three.js. |
| `torso_auscultacion.glb` (5,5 MB) | Igual, sin compresión, por si no usas Draco. |
| `torso_auscultacion.blend` | Fuente editable a resolución completa. La reducción de polígonos es un modificador. |

Unidades en metros, eje Y hacia arriba (glTF). El paciente mira hacia +Z en glTF y su lado derecho (`_D`) queda en −X.

## Objetos (los nombres llegan intactos al .glb)

- **Piel**
- **Huesos:** `Costillas_1_D` … `Costillas_12_I` (con su cartílago costal), `Esternon`, `Clavicula_D/I`, `Escapula_D/I`, `Columna` (C7–T12)
- **Pulmones:** `Pulmon_D_Superior`, `Pulmon_D_Medio`, `Pulmon_D_Inferior`, `Pulmon_I_Superior` (con língula), `Pulmon_I_Inferior`, `Traquea_Bronquios`
- **Corazón y vasos:** `Corazon`, `Pericardio`, `Aorta`, `Ramas_Aorticas`, `Vena_Cava_Superior`, `Vena_Cava_Inferior`, `Arterias_Pulmonares`, `Venas_Pulmonares`
- `Diafragma`
- **Focos cardíacos:** `Foco_Aortico`, `Foco_Pulmonar`, `Foco_Erb`, `Foco_Tricuspideo`, `Foco_Mitral`
- **Focos pulmonares** (`_D` / `_I`): `Foco_Pulm_Vertice`, `Foco_Pulm_Ant_Sup`, `Foco_Pulm_Ant_Inf`, `Foco_Pulm_Lat_Sup`, `Foco_Pulm_Lat_Inf`, `Foco_Pulm_Post_Sup`, `Foco_Pulm_Post_Med`, `Foco_Pulm_Post_Inf`
- **Líneas:** `Linea_Medioesternal`, `Linea_Medioespinal` y, por lado, `Linea_Paraesternal`, `Linea_Medioclavicular`, `Linea_Axilar_Anterior/Media/Posterior`, `Linea_Escapular`, `Linea_Paravertebral`

## Capas: un material por grupo (alphaMode BLEND)

`Piel`, `Huesos`, `Pulmones`, `Corazon`, `Pericardio`, `Diafragma`, `Vasos_Arteriales`, `Vasos_Venosos`, `Lineas_Referencia`.
Los lóbulos comparten el material `Pulmones`; cada uno tiene su color en el atributo `COLOR_0`. Una sola opacidad controla todos los pulmones.

```js
const loader = new GLTFLoader();
const draco = new DRACOLoader();
draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
loader.setDRACOLoader(draco);

loader.load('torso_auscultacion_draco.glb', (gltf) => {
  const mats = {};
  gltf.scene.traverse((o) => { if (o.isMesh) mats[o.material.name] = o.material; });
  const setOpacity = (name, v) => {
    const m = mats[name];
    m.opacity = v;
    m.transparent = v < 1;
    m.depthWrite = v >= 0.99;
  };
  setOpacity('Piel', 0.15);     // ver el interior
  setOpacity('Huesos', 0.4);
  // Click en un foco: raycaster → intersects[0].object.name === 'Foco_Mitral'
});
```

## Créditos (obligatorios, ver LICENSE-modelo.txt)

> Modelo anatómico derivado de [Z-Anatomy](https://github.com/Z-Anatomy/The-blend) (CC BY-SA 4.0), basado en BodyParts3D © The Database Center for Life Science (CC BY-SA 2.1 Japón). Modificado por SemioSim. Licencia del modelo: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
