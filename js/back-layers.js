/* back-layers.js - the phone's Back button closes the open pop-up first; pressing Back again goes to the previous page. Part of ARTIME Stock; loaded by index.html in order. */
'use strict';
const LAYERS = { stack: [], silent: 0, after: null, base: '' };
const byId = (id) => document.getElementById(id);
const rmById = (id) => () => { const x = byId(id); if (x) x.remove(); };
const LAYER_DEFS = {
  sheet: { present: () => !!byId('sheet') && byId('sheet').innerHTML.trim() !== '', close: () => { S.sheet = null; renderSheet(); } },   // side menu, + sheets, item sheet
  rs: { present: () => !!byId('rs'), close: rmById('rs') },                                                                                 // reorder, bulk order, change entry, dial items
  pe: { present: () => !!byId('pe'), close: rmById('pe') },                                                                                 // change a payment
  pd: { present: () => !!byId('pd'), close: rmById('pd') },                                                                                 // payment saved
  dd: { present: () => !!byId('dd'), close: () => closeDropdown(true) }                                                                     // dropdown list
};
function layersSync() {                                    // called after anything appears or disappears
  Object.keys(LAYER_DEFS).forEach((id) => {
    const open = LAYER_DEFS[id].present(), idx = LAYERS.stack.findIndex((l) => l.id === id);
    if (open && idx < 0) {
      if (!LAYERS.stack.length) LAYERS.base = location.href;
      LAYERS.stack.push({ id }); history.pushState({ artimeLayer: id }, '', location.href);       // one history step per pop-up
    } else if (!open && idx >= 0) {                      // closed with its own button: remove its history step too
      const top = idx === LAYERS.stack.length - 1; LAYERS.stack.splice(idx, 1);
      if (top && location.href === LAYERS.base) { LAYERS.silent++; history.back(); }
    }
  });
}
function layersCloseThen(fn) {                              // close every pop-up cleanly, then run fn (used before moving to another page)
  const n = LAYERS.stack.length; if (!n) { fn(); return; }
  LAYERS.stack.splice(0).reverse().forEach((l) => { try { LAYER_DEFS[l.id].close(); } catch (e) { /* ignore */ } });
  LAYERS.silent++; LAYERS.after = fn; history.go(-n);
}
window.ARTIME_closeThen = layersCloseThen;
window.addEventListener('popstate', (ev) => {
  if (LAYERS.silent > 0) { LAYERS.silent--; if (!LAYERS.silent && LAYERS.after) { const f = LAYERS.after; LAYERS.after = null; f(); } return; }
  if (!LAYERS.stack.length) return;
  const st = ev.state && ev.state.artimeLayer, keep = st ? LAYERS.stack.findIndex((l) => l.id === st) : -1;
  if (st && keep < 0) return;                                                   // an old step: nothing to close
  if (!st && location.href !== LAYERS.base) { LAYERS.stack.length = 0; return; }   // moved to another page: the pop-ups go with it
  LAYERS.stack.splice(keep + 1).reverse().forEach((l) => { try { LAYER_DEFS[l.id].close(); } catch (e) { /* ignore */ } });   // Back closes the pop-up first
});
document.addEventListener('click', (ev) => {               // a link inside the side menu: close it properly, then go
  const a = ev.target.closest && ev.target.closest('#sheet a[href^="#/"]');
  if (!a || !LAYERS.stack.length) return;
  ev.preventDefault(); const href = a.getAttribute('href'); layersCloseThen(() => { location.hash = href; });
}, true);
let layersQueued = false;
const layersObs = new MutationObserver(() => { if (layersQueued) return; layersQueued = true; Promise.resolve().then(() => { layersQueued = false; layersSync(); }); });
layersObs.observe(document.body, { childList: true });
if (byId('sheet')) layersObs.observe(byId('sheet'), { childList: true });
