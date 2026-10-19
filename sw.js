// Service worker: keeps the app opening instantly and working offline.
// When you change any app file, bump CACHE (v1 -> v2) so phones pick up the update.
const CACHE = 'artime-stock-v31';
const SHELL = [
  './', './index.html', './styles.css', './config.js', './money.js',
  './js/core.js', './js/lang-words.js', './js/lang-engine.js', './js/icons.js', './js/state.js', './js/router.js', './js/shell.js', './js/avatars.js', './js/money-link.js', './js/home.js', './js/charts.js', './js/items.js', './js/reports.js', './js/dial-report.js', './js/reorder-list.js', './js/settings.js', './js/forms.js', './js/sheet-toast.js', './js/events.js', './js/dial.js', './js/reorder-popups.js', './js/dropdown.js', './js/back-layers.js', './js/boot.js',
  './manifest.json', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
  './icons/apple-touch-icon.png', './icons/favicon.png'
];

self.addEventListener('install', (e) => {
  // one missing file must never stop the app from installing, so cache files one by one
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// App files: ask the server first (always the newest copy), use the saved copy only when offline.
// Google Sheet calls (other origin) are never touched here.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  e.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((res) => { if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; })
      .catch(async () => {
        const cache = await caches.open(CACHE);
        return (await cache.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? cache.match('./index.html') : Response.error());
      })
  );
});
