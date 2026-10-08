/* Service worker: permite usar SemioSim sin conexión una vez visitado.
   Estrategia: red primero para el HTML (para recibir actualizaciones), caché primero para el resto. */
const VERSION = 'semiosim-v2';
const CORE = ['./', 'index.html', 'css/style.css', 'icon.svg', 'manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const isHTML = req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html');
  if (isHTML) {
    e.respondWith(fetch(req).then(r => { caches.open(VERSION).then(c => c.put(req, r.clone())); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(r => { if (r.ok) caches.open(VERSION).then(c => c.put(req, r.clone())); return r; }).catch(() => hit);
    return hit || net;
  }));
});
