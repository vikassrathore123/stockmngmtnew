/* sheet-toast.js - Menu and bottom sheets, toast messages, who is using the app. Part of ARTIME Stock; loaded by index.html in order. */
'use strict';
/* ---------- sheets ---------- */
function payName() { try { return String((JSON.parse(localStorage.getItem('artime.money.user')) || {}).name || '').trim(); } catch (e) { return ''; } }
function syncName() { const n = payName(); if (n && store.get('by', '') !== n) store.set('by', n); }   // Payments login name becomes the Stock name too
window.ARTIME_syncName = syncName;
function who() {
  syncName();
  let n = String(store.get('by', '') || '').trim();
  if (!n) { try { n = String((JSON.parse(localStorage.getItem('artime.money.user')) || {}).name || '').trim(); } catch (e) { /* ignore */ } }
  return n;
}
function renderSheet() {
  const el = $('#sheet'); const s = S.sheet;
  if (!s) { el.innerHTML = ''; return; }
  if (s.type === 'catalogs') { el.innerHTML = catalogSheetHTML(); return; }
  if (s.type === 'menu') {
    const link = (href, icon, title, sub, val) => `<a class="mi" href="${href}">${ic(icon, 24)}<span><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span>${val || ''}${ic('right', 18)}</a>`;
    const si = syncInfo(), nm = who(), [cs, cc] = connState(), th = store.get('theme', 'light');
    const dseg = (k, cur, opts) => `<div class="seg dseg">${opts.map(([v, l]) => `<button class="${cur === v ? 'on' : ''}" data-act="setv" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
    const inner = `      <a class="dh" href="#/set-profile">${avatarHTML()}<div class="dn">${nm ? `<b>${esc(nm)}</b>` : '<b class="addn">Add your name</b>'}<small>${roleLine()}</small></div>${ic('right', 18)}</a>
      <div class="dsync ${si.cls}">${si.cls === 'busy' ? '<i class="clk"></i>' : '<span class="pip"></span>'}<span class="t">${esc(si.txt)}</span><button data-act="sync">Sync now</button></div>
      <div class="dsec">Language</div>
      <div class="dlang">${langSeg()}</div>
      <div class="dsec">Appearance</div>
      <div class="dlang">${dseg('theme', th, [['light', 'Light'], ['dark', 'Dark'], ['system', 'System']])}</div>
      <div class="dsec">Settings</div>
      ${link('#/set-prefs', 'sun', 'Preferences', 'Default screen, main button, number format')}
      ${link('#/set-inv', 'cube', 'Inventory settings', 'Alerts, confirmations, notes')}
      ${link('#/set-pay', 'card', 'Payment settings', 'Cash or bank, date, notes')}
      ${link('#/set-sheets', 'cloud', 'Google Sheets', '', `<span class="sv st-${cc}"><i class="dot"></i>${cs}</span>`)}
      <div class="dsec">Tools</div>
      ${link('#/prod', 'dial', 'Production', 'Sent, ready and out dials')}
      ${link('#/categories', 'grid', 'Categories', 'Manage item categories')}
      ${payFirst() ? link('#/stock', 'cube', 'Stock Overview', 'Items and alerts') : ''}
      <div class="dsec">App</div>
      ${S.installEvt && !isStandalone() ? `<button class="mi" data-act="install">${ic('download', 24)}<span><b>Install app</b><small>Opens full screen like a normal app</small></span></button>` : ''}
      ${link('#/set-about', 'info', 'About ARTIME', 'Version and updates')}
      ${link('#/set-adv', 'gear', 'Advanced settings', 'Local data, cache, reminders')}
      ${catList().length ? `<div class="dsec">Share</div>
      <button class="mi" data-cat-open>${ic('file', 24)}<span><b>Catalogs</b><small>Share clock catalogs (PDF)</small></span>${ic('right', 18)}</button>` : ''}
      <div class="dfoot">${esc(APP_NAME)} &middot; v${APP_VER}</div>
    `;
    const dr = el.querySelector('.drawer');
    if (dr) { const top = dr.scrollTop; dr.innerHTML = inner; dr.scrollTop = top; }       // already open: change the content only, no flicker and no slide-in again
    else el.innerHTML = `<div class="scrim side" data-act="close"><aside class="drawer" role="dialog" aria-label="Settings">${inner}</aside></div>`;
    return;
  }
  if (s.type === 'payadd') {
    el.innerHTML = `<div class="scrim" data-act="close"><div class="sheet" role="dialog" aria-label="New payment"><div class="grab"></div><h3>New payment</h3><div class="acts">
      <a class="bigact in" href="#/pay?t=in">${ic('up', 34, 2.2)}<span><b>Payment In</b><small>Money received</small></span></a>
      <a class="bigact out" href="#/pay?t=out">${ic('down', 34, 2.2)}<span><b>Payment Out</b><small>Money paid</small></span></a></div></div></div>`;
    return;
  }
  if (s.type === 'add') {
    el.innerHTML = `<div class="scrim" data-act="close"><div class="sheet" role="dialog" aria-label="New entry"><div class="grab"></div><h3>New entry</h3><div class="acts">
      <a class="bigact in" href="#/in">${ic('up', 34, 2.2)}<span><b>Stock In</b><small>Add incoming stock</small></span></a>
      <a class="bigact out" href="#/out">${ic('down', 34, 2.2)}<span><b>Stock Out</b><small>Record outgoing stock</small></span></a>
      <a class="bigact dial" href="#/dial">${ic('dial', 34, 2.2)}<span><b>Send to Production</b><small>Parts go out for making dials</small></span></a>
      <a class="bigact in" href="#/ready">${ic('check', 34, 2.2)}<span><b>Dial Ready</b><small>Finished dials came back</small></span></a>
      <a class="bigact out" href="#/sold">${ic('down', 34, 2.2)}<span><b>Dial Out</b><small>Ready dials sold or sent out</small></span></a></div></div></div>`;
    return;
  }
  const it = items().find((i) => i.code === s.code);
  if (!it) { el.innerHTML = ''; return; }
  const nm = {}; items().forEach((i) => { nm[i.code] = i.title; });
  const mv = sortMoves(moves().filter((e) => e.code === it.code)).slice(0, 6);
  el.innerHTML = `<div class="scrim" data-act="close"><div class="sheet" role="dialog" aria-label="${esc(it.title)}"><div class="grab"></div>
    <div class="hd">${art(it.base, 64)}<div style="flex:1;min-width:0"><b>${esc(it.title)}</b><small>${esc(it.code)}</small></div>${pill(it.st, it.code)}</div>
    <div class="nums"><div><small>Current Stock</small><b>${num(it.eff)}</b></div><div><small>Reorder Level</small><b>${num(it.min)}</b></div><div><small>Unit</small><b style="font-size:17px;line-height:2">${esc(unitLabel(it.unit))}</b></div></div>
    ${isDial(it.code) ? `<div class="two" style="margin-top:0"><a class="bigact dial" style="padding:14px" href="#/dial?code=${encodeURIComponent(it.code)}">${ic('dial', 26, 2.2)}<b style="font-size:17px">Send to Production</b></a></div>` : `<div class="two" style="margin-top:0"><a class="bigact in" style="padding:14px" href="#/in?code=${encodeURIComponent(it.code)}">${ic('up', 26, 2.2)}<b style="font-size:17px">Stock In</b></a><a class="bigact out" style="padding:14px" href="#/out?code=${encodeURIComponent(it.code)}">${ic('down', 26, 2.2)}<b style="font-size:17px">Stock Out</b></a></div>`}
    <h4>Recent movements</h4>${mv.length ? mv.map((e) => actRow(e, nm)).join('') : '<div class="empty" style="padding:14px">No movements for this item yet.</div>'}</div></div>`;
}

/* ---------- toast ---------- */
let toastT;
function toast(msg, bad) {
  const t = $('#toast'); t.textContent = msg; t.className = 'show' + (bad ? ' bad' : '');
  clearTimeout(toastT); toastT = setTimeout(() => { t.className = ''; }, 3600);
}
