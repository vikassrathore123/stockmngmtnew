/* router.js - Screens: which page is open and drawing it. Part of ARTIME Stock; loaded by index.html in order. */
'use strict';
/* ================= router ================= */
function route() {
  const h = location.hash.replace(/^#\/?/, '') || 'home';
  const [name, qs] = h.split('?');
  return { name, q: new URLSearchParams(qs || '') };
}
let lastRouteKey = '';
function onRoute() {
  const r = route();
  if (r.name === 'more') { S.reopenMenu = true; location.replace('#/home'); return; }          // Settings live in the side menu now
  if (r.name === 'reorder') S.reorderF = r.q.get('f') || 'all';
  if (r.name === 'reports') store.set('repview', 'stock'); else if (r.name === 'payreport') store.set('repview', 'pay');
  const key = location.hash;
  if (r.name === 'reports') { const t = r.q.get('t'), rr = r.q.get('r'); if (t) S.repType = t === 'dial' ? 'all' : t; if (rr) S.repRange = Number(rr); }
  if (r.name === 'dialreport' && r.q.get('r')) S.repRange = Number(r.q.get('r'));
  if ((r.name === 'reports' || r.name === 'dialreport') && S.repRange === 'custom') loadRange();
  if (r.name === 'items') S.filter = { q: '', cat: r.q.get('cat') || 'all', status: r.q.get('status') || (store.get('itemsDef', 'all') === 'alert' ? 'alert' : 'all') };
  if (isFormRoute(r.name)) {
    const f = ensureForm(r.name);
    f.date = today();
    if (r.name === 'dial') f.skip = [];     // every part ticked each time, so nothing is left out by mistake
    const code = r.q.get('code');
    if (code && r.name === 'dial') f.dcode = code;
    else if (code) f.wantCode = code;
  }
  lastRouteKey = key;
  S.sheet = S.reopenMenu ? { type: 'menu' } : null; S.reopenMenu = false;
  render();
  window.scrollTo(0, 0);
  if (r.name === 'items' && r.q.get('focus')) setTimeout(() => { const i = $('#q'); if (i) i.focus(); }, 50);
}

/* ================= render ================= */
function render() {
  const r = route();
  const isForm = isFormRoute(r.name);
  const app = $('#app');
  app.className = isForm ? 'noNav' : '';
  let top = '', body = '';
  switch (r.name) {
    case 'in': case 'out': top = topForm(r.name); body = vForm(r.name); break;
    case 'dial': top = topForm('dial'); body = vDial(); break;
    case 'ready': case 'sold': top = topForm(r.name); body = vProdForm(r.name); break;
    case 'prod': top = topBack('Production', 'Material, dials in production, ready and out', '#/home'); body = vProd(); break;
    case 'items': top = topPlain('Items', 'View and manage all items', true); body = vItems(); break;
    case 'categories': top = topPlain('Categories', 'Manage item categories', true); body = vCategories(); break;
    case 'reports': top = topReports('stock'); body = vReports(); break;
    case 'dialreport': top = topBack('Material to Production report', 'Which dials and which items', '#/reports'); body = vDialReport(); break;
    case 'more': top = topPlain('Settings'); body = vMore(); break;
    case 'set-profile': top = topSub('Edit Profile'); body = vSetProfile(); break;
    case 'set-prefs': top = topSub('Preferences'); body = vSetPrefs(); break;
    case 'set-sheets': top = topSub('Google Sheets'); body = vSetSheets(); break;
    case 'set-inv': top = topSub('Inventory settings'); body = vSetInv(); break;
    case 'set-pay': top = topSub('Payment settings'); body = vSetPay(); break;
    case 'set-adv': top = topSub('Advanced settings'); body = vSetAdv(); break;
    case 'set-about': top = topSub('About ARTIME'); body = vSetAbout(); break;
    case 'reorder': { const f = S.reorderF; top = topPlain(f === 'out' ? 'Out of Stock' : f === 'low' ? 'Reorder Soon' : 'To Reorder', f === 'out' ? 'Items with no stock left' : f === 'low' ? 'Items that are running low' : 'Items that are low or out of stock', true); body = vReorder(); break; }
    case 'pay': { const t = r.q.get('t'); top = topPay(t); body = '<div id="money"></div>'; break; }
    case 'payreport': top = topReports('pay'); body = '<div id="money"></div>'; break;
    case 'stock': top = topPlain('Stock Overview', 'Items and alerts', true) + syncLine(); body = vHome(); break;
    default: if (payFirst()) { top = topHome(); body = vHomePay(); } else { top = topHome(); body = vHome(); }
  }
  app.innerHTML = top + body;
  $('#nav').innerHTML = isForm ? '' : navHTML(r.name);
  if (r.name === 'reports') store.set('repview', 'stock'); else if (r.name === 'payreport') store.set('repview', 'pay');
  renderSheet();
  if (isForm) updateFormDynamic();
  if (r.name === 'pay' || r.name === 'payreport') withMoney(() => window.Money.mount(r.name === 'payreport' ? 'report' : 'entry', r.q.get('t')));
  else if (r.name === 'home' && payFirst()) withMoney(() => window.Money.dash());
  else if (r.name === 'home' && moneyUser()) withMoney(() => window.Money.warm());
}
// refresh without clobbering what the person is typing
function softRender() {
  const r = route();
  const ae = document.activeElement;
  if (r.name === 'pay' || r.name === 'payreport') return;           // Payments draws and refreshes itself
  if (isFormRoute(r.name)) { updateFormDynamic(); return; }
  if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'SELECT')) { if (r.name === 'items') renderItemList(); return; }
  render();
}
