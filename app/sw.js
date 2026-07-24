// oheedet PWA service worker — офлайн через cache-first + runtime-кэш.
// Версию кэша бампать при изменении статики (иначе старьё останется у установленных).
const CACHE = 'oheedet-v6';
const ASSETS = [
  './', './index.html', './app.js', './render.js', './tracker.js',
  './tokens.css', './styles.css', './manifest.json',
  './src/targets.js', './src/safety.js', './src/planner.js', './src/couple.js', './src/grocery.js',
  './data/recipes.json', './data/treats.json',
  './icons/icon-192.png', './icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok && new URL(e.request.url).origin === location.origin) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))
  );
});
