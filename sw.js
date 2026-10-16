/* Service worker: permite usar SemioSim sin conexión una vez visitado.
   Estrategia: red primero (siempre la versión más reciente cuando hay conexión) y caché como respaldo. */
const VERSION = 'semiosim-v0.6.2';
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
  e.respondWith(
    fetch(req).then(r => {
      if (r && r.ok) caches.open(VERSION).then(c => c.put(req, r.clone()));
      return r;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined)))
  );
});
