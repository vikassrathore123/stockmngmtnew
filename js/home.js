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
  const okN = Math.max(0, total - outN - lowN), alertN = outN + lowN;
  const nm = {}; its.forEach((i) => { nm[i.code] = i.title; });
  const recent = sortMoves(moves()).slice(0, 3);
  const showInstall = S.installEvt && !isStandalone();
  const td = today(); let tin = 0, tout = 0;
  expMoves().forEach((e) => { if (e.date === td) { const q = Number(e.qty) || 0; if (e.type === 'in') tin += q; else tout += q; } });
  const pt = payToday();
  const dialsToday = moves().filter((e) => e.date === td && isDial(e.code) && e.type === 'out').reduce((n, e) => n + (Number(e.qty) || 0), 0);

  const today3 = `<section class="hm-today"><div class="hm-h"><h2>Today</h2><small>${esc(dLong(td))}</small></div>
    <div class="card hm-io">
      <a class="hm-io-c in" href="#/reports?t=in&r=1"><span class="hm-ico">${ic('up', 26, 2.6)}</span><span><small>Stock in</small><b>+${num(tin)}</b></span></a>
      <a class="hm-io-c out" href="#/reports?t=out&r=1"><span class="hm-ico">${ic('down', 26, 2.6)}</span><span><small>Stock out</small><b>-${num(tout)}</b></span></a>
    </div></section>`;

  const reorder = alertN
    ? `<a class="hm-reorder" href="#/reorder"><span class="hm-ico">${ic('alert', 26, 2.6)}</span>
        <span class="hm-rm"><span class="hm-rn"><b>${alertN}</b> ${alertN === 1 ? 'item' : 'items'} to reorder</span>${outN ? `<em>${outN} out of stock</em>` : ''}</span>
        <span class="hm-rbtn">Reorder now ${ic('right', 16, 2.6)}</span></a>`
    : `<div class="hm-reorder fine"><span class="hm-ico">${ic('check', 26, 2.6)}</span><span class="hm-rm"><span class="hm-rn">Nothing to reorder</span><small>All items are above their reorder level</small></span></div>`;

  const C = 2 * Math.PI * 42; let off = 0;
  const seg = (n, col) => {
    if (!n) return '';
    const len = (n / total) * C, gap = total > n ? 2 : 0;
    const r = `<circle cx="60" cy="60" r="42" fill="none" stroke="${col}" stroke-width="13" stroke-dasharray="${Math.max(0, len - gap).toFixed(2)} ${(C - Math.max(0, len - gap)).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}"/>`;
    off += len; return r;
  };
  const donut = `<div class="hm-donut"><svg viewBox="0 0 120 120" role="img" aria-label="Items: ${okN} fine, ${lowN} low, ${outN} out"><g transform="rotate(-90 60 60)"><circle cx="60" cy="60" r="42" fill="none" style="stroke:var(--soft2)" stroke-width="13"/>${seg(okN, '#2fae8a')}${seg(lowN, '#f5b301')}${seg(outN, '#ec5757')}</g></svg><div class="hm-dc"><b>${num(stock)}</b><small>Total stock</small></div></div>`;

  const overview = `<section class="card hm-sec"><div class="hm-h"><h2>Stock overview</h2><a class="link" href="#/items">See sizes &amp; items ${ic('right', 16, 2.4)}</a></div>
    <div class="hm-ov">${donut}
      <div class="hm-grid">
        <a class="hm-st blue" href="#/items"><span class="hm-ico">${ic('cube', 22, 2.2)}</span><span><small>Total items</small><b>${num(total)}</b></span></a>
        <a class="hm-st green" href="#/items?status=ok"><span class="hm-ico">${ic('layers', 22, 2.2)}</span><span><small>Total stock</small><b>${num(stock)}</b></span></a>
        <a class="hm-st red" href="#/reorder?f=out"><span class="hm-ico">${ic('alert', 22, 2.4)}</span><span><small>Out of stock</small><b>${outN}</b></span></a>
        <a class="hm-st amber" href="#/reorder?f=low"><span class="hm-ico">${ic('warn', 22, 2.2)}</span><span><small>Reorder soon</small><b>${lowN}</b></span></a>
      </div></div></section>`;

  const dialRow = `<a class="hm-line" href="#/dialreport?r=1"><span class="hm-ico dial">${ic('dial', 22, 2.2)}</span><span class="hm-lm"><b>${num(dialsToday)}</b> Dials made</span><small>See sizes &amp; items</small>${ic('right', 18, 2.2)}</a>`;
  const payRow = pt ? `<a class="hm-line" href="#/payreport"><span class="hm-ico pay">${ic('cash', 22, 2.2)}</span><span class="hm-lm">Payments</span><span class="hm-pr"><b class="g">+${rupee(pt.i)}</b><b class="r">-${rupee(pt.o)}</b></span>${ic('right', 18, 2.2)}</a>` : '';
  const activity = `<section class="card hm-sec"><div class="hm-h"><h2>Today's activity</h2><a class="link" href="#/reports">See all ${ic('right', 16, 2.4)}</a></div>
    ${dialRow}${payRow}
    ${recent.length ? recent.map((e) => actRow(e, nm)).join('') : `<div class="empty"><b>No movements yet</b>Add your first Stock In or Stock Out.</div>`}
  </section>`;

  return `${updBar()}${showInstall ? `<div class="install"><span class="t"><b>Install ARTIME Stock</b><small>Opens full screen like a normal app</small></span><button data-act="install">Install</button></div>` : ''}
  ${today3}${reorder}${overview}${activity}`;
}

function itemRow(i) {
  return `<button class="row st-${esc(i.st)}" data-act="open-item" data-code="${esc(i.code)}">${art(i.base, 56)}
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
