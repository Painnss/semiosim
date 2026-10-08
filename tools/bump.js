/* Actualiza el número de versión en index.html (?v=) y en sw.js (nombre de la caché)
   a partir de package.json. Ejecutar con `npm run bump` antes de publicar una versión nueva. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const v = require(path.join(ROOT, 'package.json')).version;

const idx = path.join(ROOT, 'index.html');
fs.writeFileSync(idx, fs.readFileSync(idx, 'utf8').replace(/\?v=[0-9A-Za-z.\-]+/g, '?v=' + v));
const sw = path.join(ROOT, 'sw.js');
fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replace(/const VERSION = '[^']+'/, `const VERSION = 'semiosim-v${v}'`));
console.log('Versión aplicada: ' + v);
