/* shell.js - Headers, bottom bar, updates, theme, sync line. Part of ARTIME Stock; loaded by index.html in order. */
'use strict';
const rupee = (n) => '₹' + num(n);
function payToday() {                       // today's money in/out from what this phone already knows (no network)
  const u = moneyUser(); if (!u) return null;
  let rep = null, q = []; try { rep = JSON.parse(localStorage.getItem('artime.money.rep')); } catch (e) { /* none */ } try { q = JSON.parse(localStorage.getItem('artime.money.q')) || []; } catch (e) { /* none */ }
  const mine = q.filter((e) => e.u === u.name), has = rep && rep.user === u.name;
  if (!has && !mine.length) return null;
  const td = today(); let i = 0, o = 0;
  if (has) rep.rows.forEach((r) => { if (r[0] === td) { if (r[1] === 'in') i += r[2]; else o += r[2]; } });
  mine.forEach((e) => { if (e.date === td) { if (e.type === 'in') i += e.amount; else o += e.amount; } });
  return { i, o };
}
function quickTiles(withPay) {
  return `<section class="qa"><a class="qt in" href="#/in">${ic('up', 28, 2.2)}<b>Stock In</b></a><a class="qt out" href="#/out">${ic('down', 28, 2.2)}<b>Stock Out</b></a><a class="qt dial" href="#/dial">${ic('dial', 28, 2.2)}<b>Dial Out</b></a>${withPay ? `<a class="qt pay" href="#/pay">${ic('cash', 28, 2)}<b>Payments</b></a>` : `<a class="qt items" href="#/items">${ic('cube', 28, 2)}<b>Items</b></a>`}</section>`;
}
function updBar() { return S.newVer ? `<div class="updbar"><span>${ic('download', 18)}New version v${S.newVer} is ready</span><button data-act="upcheck">Update now</button></div>` : ''; }
async function autoCheckUpdate() {              // once every 6 hours at most, only to show the "new version" message
  if (!store.get('updAlert', true) || !navigator.onLine || Date.now() - store.get('updAt', 0) < 6 * 3600 * 1000) return;
  store.set('updAt', Date.now());
  try {
    const t = await (await fetch('sw.js?x=' + Date.now(), { cache: 'no-store' })).text(), mm = /artime-stock-v(\d+)/.exec(t);
    if (mm && Number(mm[1]) > APP_VER) { S.newVer = Number(mm[1]); softRender(); }
  } catch (e) { /* offline is fine */ }
}
function hardRefresh() {                       // forget the saved app files and load the newest ones (entries stay)
  const jobs = [];
  if (navigator.serviceWorker) jobs.push(navigator.serviceWorker.getRegistrations().then((rs) => Promise.all(rs.map((r) => r.unregister()))));
  if (window.caches) jobs.push(caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))));
  Promise.all(jobs).catch(() => {}).then(() => location.replace(location.pathname + '?v=' + Date.now() + location.hash));
}
async function checkUpdate() {
  const say = (t) => { const m = $('#upmsg'); if (m) m.innerHTML = (/^(Checking|Updating)/.test(t) ? '<i class="clk"></i>' : '') + esc(t); };
  say('Checking…');
  try {
    const t = await (await fetch('sw.js?x=' + Date.now(), { cache: 'no-store' })).text(), mm = /artime-stock-v(\d+)/.exec(t), v = mm ? Number(mm[1]) : 0;
    if (v > APP_VER) { say('Updating to version v' + v + '…'); setTimeout(hardRefresh, 600); }
    else say('You already have the latest version (v' + APP_VER + ').');
  } catch (e) { say('Could not check. Check your internet and try again.'); }
}
function applyTheme() {
  const t = store.get('theme', 'light'); document.documentElement.dataset.theme = t;
  const mc = document.querySelector('meta[name=theme-color]'); if (mc) mc.content = t === 'dark' || (t === 'system' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) ? '#0d1320' : '#f3f5f9';
}
function greet() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }
function topHome() {
  const alerts = items().filter((i) => i.st === 'out' || i.st === 'low').length, nm = who();
  return `<header class="top home">
    <button class="ibtn" data-act="menu" aria-label="Menu">${ic('menu', 26)}</button>
    <a class="hav" href="#/set-profile" aria-label="Profile">${avatarHTML('sm')}</a>
    <div class="grow"><div class="hi">${greet()}</div><h1>${nm ? esc(nm) : esc(APP_NAME)}</h1></div>
    <a class="ibtn" href="#/items?focus=1" aria-label="Search">${ic('search', 26)}</a>
    <a class="ibtn" href="#/reorder" aria-label="Low stock alerts">${ic('bell', 26)}${alerts ? '<span class="dot"></span>' : ''}</a>
  </header>${syncLine()}`;
}
function topPlain(title, sub, back) {
  return `<header class="top plain">${back ? `<a class="ibtn" href="#/home" aria-label="Back">${ic('left', 26)}</a>` : ''}<div class="grow"><h1>${esc(title)}</h1>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</div></header>`;
}
function topBack(title, sub, href) {
  return `<header class="top center"><a class="ibtn" href="${href}" aria-label="Back">${ic('left', 26)}</a><div class="grow"><h1>${esc(title)}</h1>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</div><span class="spacer"></span></header>`;
}
function topReports(which) {
  const sub = which === 'stock' ? 'Stock movement over time' : 'Cash and bank totals';
  return `<header class="top plain"><div class="grow"><h1>Reports</h1><div class="sub">${sub}</div></div>
    <div class="repsw" role="tablist" aria-label="Report type"><a class="${which === 'stock' ? 'on' : ''}" href="#/reports">${ic('cube', 15)}Stock</a><a class="${which === 'pay' ? 'on pay' : ''}" href="#/payreport">${ic('cash', 15)}Payments</a></div></header>`;
}
function topPay(t) {
  if (t !== 'in' && t !== 'out') { try { t = JSON.parse(localStorage.getItem('artime.money.type')) === 'out' ? 'out' : 'in'; } catch (e) { t = 'in'; } }
  const title = t === 'in' ? 'Payment In' : 'Payment Out', sub = t === 'in' ? 'Money received' : 'Money paid';
  return `<header class="top center ${t}"><a class="ibtn" href="#/home" aria-label="Back">${ic('left', 26)}</a>
    <div class="grow"><h1>${title}</h1><div class="sub">${sub}</div></div><span class="spacer"></span></header>`;
}
function topPayOld() {
  const title = 'Payments', sub = 'Record money in or out';
  return `<header class="top center"><a class="ibtn" href="#/home" aria-label="Back">${ic('left', 26)}</a>
    <div class="grow"><h1>${title}</h1><div class="sub">${sub}</div></div><span class="spacer"></span></header>`;
}
function vHomePay() {
  const al = items().filter((i) => i.st === 'out' || i.st === 'low').length;
  return `${updBar()}<div id="paydash"></div>
    ${al ? `<a class="card payalert" href="#/reorder">${ic('bell', 24)}<span><b>${al} ${al === 1 ? 'item' : 'items'} to order</b><small>Items that are low or out of stock</small></span>${ic('right', 18)}</a>` : ''}
    <a class="card payalert" href="#/stock">${ic('cube', 24)}<span><b>Stock Overview</b><small>Items and alerts</small></span>${ic('right', 18)}</a>`;
}
function topForm(type) {
  if (type === 'dial') return `<header class="top center"><a class="ibtn" href="#/home" aria-label="Back">${ic('left', 26)}</a>
    <div class="grow"><h1>Dial Out</h1><div class="sub">Make dials - the parts go out together</div></div><span class="spacer"></span></header>`;
  return `<header class="top center"><a class="ibtn" href="#/home" aria-label="Back">${ic('left', 26)}</a>
    <div class="grow"><h1>Stock ${type === 'in' ? 'In' : 'Out'}</h1><div class="sub">${type === 'in' ? 'Add incoming stock to inventory' : 'Remove stock from inventory'}</div></div><span class="spacer"></span></header>`;
}
const APP_VER = 30;                                  // must match the cache number in sw.js
const payFirst = () => store.get('pref', 'stock') === 'pay';
function syncInfo() {
  const n = S.queue.length;
  let cls = '', txt = '';
  if (S.syncing || S.loading) { cls = 'busy'; txt = S.syncing ? 'Saving to Google Sheets...' : 'Updating...'; }
  else if (n) { cls = 'warn'; txt = `${n} ${n === 1 ? 'entry' : 'entries'} waiting to sync. Tap to retry`; }
  else if (S.error) { cls = 'bad'; txt = S.error + ' Tap to retry'; }
  else if (S.synced) { txt = 'Synced ' + ago_(S.synced); }
  else { txt = 'Not synced yet. Tap to load'; }
  return { cls, txt };
}
function syncLine() {
  const { cls, txt } = syncInfo();
  return `<button class="syncline ${cls}" data-act="sync">${cls === 'busy' ? '<i class="clk"></i>' : '<span class="pip"></span>'}${esc(txt)}</button>`;
}
function ago_(ms) {
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + ' min ago';
  const h = Math.round(m / 60);
  return h < 24 ? h + ' h ago' : dShort(iso(new Date(ms)));
}

function navHTML(name) {
  const on = (n) => (n === name || (n === 'items' && name === 'categories') ? 'on' : '');
  const pf = payFirst(), isPay = name === 'pay' || name === 'payreport';
  const stockFab = `<span class="fabwrap"><button class="fab" data-act="add" aria-label="Add stock entry">${ic('plus', 30, 2.4)}</button></span>`;
  const payFab = `<span class="fabwrap"><button class="fab pay" data-act="payadd" aria-label="Add payment">${ic('plus', 30, 2.4)}</button></span>`;
  const stockMini = `<button class="n mini st" data-act="add" aria-label="Add stock entry"><i class="mfab b">${ic('plus', 20, 2.8)}</i>Stock</button>`;
  const payMini = `<button class="n mini pm ${isPay ? 'on' : ''}" data-act="payadd" aria-label="Add payment"><i class="mfab g">${ic('plus', 20, 2.8)}</i>Payments</button>`;
  return `<a class="n ${on('home')}" href="#/home">${ic('home', 26)}Home</a>
    <a class="n ${on('items')}" href="#/items">${ic('cube', 26)}Items</a>
    ${pf ? payFab : stockFab}
    <a class="n ${name === 'payreport' || name === 'dialreport' ? 'on' : on('reports')}" href="${store.get('repview', pf ? 'pay' : 'stock') === 'pay' ? '#/payreport' : '#/reports'}">${ic('chart', 26)}Reports</a>
    ${pf ? stockMini : payMini}`;
}
