# Grabaciones de auscultación

Carpeta para grabaciones reales (OGG/MP3/WAV) con **licencia libre** (CC0, CC BY, CC BY-SA). `manifest.json` asocia cada
id de sonido de `js/mod-sounds.js` con un archivo y su atribución:

```json
"heart_as": { "file": "heart_as.ogg", "license": "CC BY 4.0", "source": "https://…", "attribution": "Autor / dataset", "gain": 1 }
```

Reglas: nada con cláusula NC o ND si el sitio llevará patrocinio; recortar a un bucle limpio de 6-10 s; normalizar a −3 dBFS;
mantener la fuente y la licencia en el manifiesto (se muestran en pantalla). Sin archivo, el sonido es sintetizado.
