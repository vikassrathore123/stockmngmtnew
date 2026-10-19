/* boot.js - Starts the app (always the last file). Part of ARTIME Stock; loaded by index.html in order. */
'use strict';
/* ================= boot ================= */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const hadSW = !!navigator.serviceWorker.controller; let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadSW && !reloaded) { reloaded = true; location.reload(); } });
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
setTimeout(autoCheckUpdate, 4000);
applyTheme();
if (!location.hash || location.hash === '#' || location.hash === '#/') { const hs = store.get('home', 'home'); if (hs !== 'home') location.hash = '#/' + hs; }
syncName();
onRoute();
lastVis = Date.now();
if (S.queue.length) sync(true); else refresh(true);
