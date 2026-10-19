/* home.js - Home screen, item rows, activity rows. Part of ARTIME Stock; loaded by index.html in order. */
'use strict';
/* ---------- Home ---------- */
function vHome() {
  const its = items();
  if (!S.url) return `<div class="banner bad">No Google Sheets link yet. <button data-act="go-more">Add it in More</button></div>`;
  if (!its.length) {
    return S.loading || S.syncing
      ? `<div class="card empty"><span class="spin"></span><b>Loading your stock...</b>One moment.</div>`
      : `<div class="card empty"><b>No stock data yet</b>${esc(S.error || 'Tap the sync line above to load from Google Sheets.')}</div>`;
  }
  const total = its.length;
  const stock = its.filter((i) => !isDial(i.code)).reduce((a, i) => a + i.eff, 0);
  const outN = its.filter((i) => i.st === 'out').length;
  const lowN = its.filter((i) => i.st === 'low').length;
  const alerts = its.filter((i) => i.st === 'out' || i.st === 'low').sort((a, b) => (a.st === 'out' ? 0 : 1) - (b.st === 'out' ? 0 : 1) || a.eff - b.eff).slice(0, 4);
  const nm = {}; its.forEach((i) => { nm[i.code] = i.title; });
  const recent = sortMoves(moves()).slice(0, 4);
  const c = chartData(S.homeRange);
  const showInstall = S.installEvt && !isStandalone();
  const td = today(); let tin = 0, tout = 0;
  expMoves().forEach((e) => { if (e.date === td) { const q = Number(e.qty) || 0; if (e.type === 'in') tin += q; else tout += q; } });
  const alertN = its.filter((i) => i.st === 'out' || i.st === 'low').length, pt = payToday();
  const dialsToday = moves().filter((e) => e.date === td && isDial(e.code) && e.type === 'out').reduce((n, e) => n + (Number(e.qty) || 0), 0);
  const hero = `<section class="today3"><div class="th"><span>Today</span><small>${esc(dLong(td))}</small></div><div class="tg">
    <a class="tcard in" href="#/reports?t=in&r=1"><span class="ti">${ic('up', 22, 2.4)}</span><b>+${num(tin)}</b><small>Stock in</small></a>
    <a class="tcard out" href="#/reports?t=out&r=1"><span class="ti">${ic('down', 22, 2.4)}</span><b>-${num(tout)}</b><small>Stock out</small></a>
    <a class="tcard warn ${alertN ? 'urgent' : ''}" href="#/reorder"><span class="ti">${ic('alert', 22, 2.4)}</span><b>${alertN}</b><small>To reorder</small>${outN ? `<em>${outN} out of stock</em>` : ''}</a>
    <a class="tcard dial" href="#/dialreport?r=1"><span class="ti">${ic('dial', 22, 2.2)}</span><b>${num(dialsToday)}</b><small>Dials made</small><em>See sizes and items</em></a></div></section>`;
  const paycard = pt ? `<a class="card paytoday" href="#/payreport"><span class="ico">${ic('cash', 24)}</span><div class="pt"><small>Payments today</small><div class="pr"><b class="g">+${rupee(pt.i)}</b><b class="r">-${rupee(pt.o)}</b></div></div>${ic('right', 20)}</a>` : '';
  return `${updBar()}${showInstall ? `<div class="install"><span class="t"><b>Install ARTIME Stock</b><small>Opens full screen like a normal app</small></span><button data-act="install">Install</button></div>` : ''}
  ${hero}
  <section class="stats">
    <a class="stat blue" href="#/items"><span class="ico">${ic('cube', 24)}</span><span><small>Total Items</small><b>${num(total)}</b></span></a>
    <a class="stat green" href="#/items?status=ok"><span class="ico">${ic('layers', 24)}</span><span><small>Total Stock</small><b>${num(stock)}</b></span></a>
    <a class="stat red" href="#/reorder?f=out"><span class="ico">${ic('alert', 26, 2.2)}</span><span><small>Out of Stock</small><b>${outN}</b></span></a>
    <a class="stat amber" href="#/reorder?f=low"><span class="ico">${ic('warn', 24, 2.1)}</span><span><small>Reorder Soon</small><b>${lowN}</b></span></a>
  </section>
  ${paycard}
  ${store.get('homeAlerts', true) ? `<section class="card sec">
    <div class="sec-h"><h2>Low Stock Alerts</h2><a class="link" href="#/reorder">View All ${ic('right', 16, 2.4)}</a></div>
    ${alerts.length ? alerts.map((i) => itemRow(i)).join('') : `<div class="empty"><b>Nothing is running low</b>Items show here when they reach their reorder level.</div>`}
  </section>` : ''}
  <section class="dual">
    <div class="card">
      <div class="sec-h"><h2>Recent Stock Activity</h2><a class="link" href="#/reports">View All ${ic('right', 16, 2.4)}</a></div>
      ${recent.length ? recent.map((e) => actRow(e, nm)).join('') : `<div class="empty"><b>No movements yet</b>Add your first Stock In or Stock Out.</div>`}
    </div>
    <div class="card">
      <div class="sec-h"><h2>Stock Overview</h2><label class="sel"><select data-bind="homeRange" aria-label="Range"><option value="7"${S.homeRange === 7 ? ' selected' : ''}>Last 7 Days</option><option value="14"${S.homeRange === 14 ? ' selected' : ''}>Last 14 Days</option><option value="30"${S.homeRange === 30 ? ' selected' : ''}>Last 30 Days</option></select>${ic('chev', 16)}</label></div>
      ${chartBlock(c)}
    </div>
  </section>`;
}

function itemRow(i) {
  return `<button class="row" data-act="open-item" data-code="${esc(i.code)}">${art(i.base, 56)}
    <span class="mid"><b>${esc(i.title)}</b><small>${esc(i.code)}</small></span>
    <span class="pillcol">${pill(i.st, i.code)}</span>
    <span class="end"><b>${num(i.eff)}</b><small>${esc(unitLabel(i.unit))}</small></span></button>`;
}
function expMoves(src) {          // per-item movements: each Dial Out becomes one 'out' row for every part that went (ticked parts only)
  const out = [];
  (src || moves()).forEach((e) => {
    if (isDial(e.code)) {
      if (e.type !== 'out') return;
      const sk = skippedOf(e.note);
      dialParts(e.code).filter((c) => !sk.includes(c)).forEach((c) => out.push(Object.assign({}, e, { code: c, via: 'dial', dialCode: e.code })));
    } else out.push(e);
  });
  return out;
}
const editMs = 30 * 60 * 1000;
function moveLeft(e) {                            // minutes left to change this entry (0 = not allowed)
  const me = String(who() || '').trim().toLowerCase(), by = String(e.by || '').trim().toLowerCase();
  if (!e.id || !e.at || e.pending || e.via || !me || me === '-' || by !== me || Date.now() - e.at >= editMs) return 0;
  return Math.max(1, Math.ceil((e.at + editMs - Date.now()) / 60000));
}
function actRow(e, nm) {
  const inn = e.type === 'in';
  const dl = !inn && (isDial(e.code) || !!e.via);
  const left = dl ? skippedOf(e.note).map((c) => String(nm[c] || c).split(' - ')[0]) : [];
  const by = String(e.by || '').trim(), left2 = moveLeft(e);
  const tap = dl && e.id ? ` tap" data-act="dialdetail" data-id="${esc(e.id)}` : '';
  return `<div class="act${tap}"><span class="aic ${inn ? 'in' : 'out'}">${ic(inn ? 'up' : 'down', 22, 2.2)}</span>
    <div class="am"><b>${dl ? 'Dial Out' : 'Stock ' + (inn ? 'In' : 'Out')}</b><span>${esc(nm[e.code] || e.code)}${left.length ? ' - without ' + esc(left.join(', ')) : ''}</span>${by && by !== 'Old app' && by !== '-' ? `<span class="who">by ${esc(by)}</span>` : ''}</div>
    <div class="ar"><b class="${inn ? 'g' : 'r'}">${inn ? '+' : '-'}${num(e.qty)}</b><span class="${e.pending ? 'pend' : ''}">${e.pending ? 'Waiting to sync' : esc(when(e))}</span></div>${left2 ? `<button class="ebtn" data-act="editmv" data-id="${esc(e.id)}" data-t="${e.type}" aria-label="Change this entry">${ic('pencil', 16)}<small>${left2} min</small></button>` : ''}</div>`;
}
