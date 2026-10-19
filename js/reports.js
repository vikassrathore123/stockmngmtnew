/* reports.js - Stock report. Part of ARTIME Stock; loaded by index.html in order. */
'use strict';
/* ---------- Reports ---------- */
const REP_TYPES = [['all', 'All'], ['in', 'Stock In'], ['out', 'Stock Out']];

/* ---- the period: a number of days, or any dates the person picks ---- */
function repWin() {
  if (S.repRange === 'custom' && S.repFrom && S.repTo) { let f = S.repFrom, t = S.repTo; if (f > t) { const x = f; f = t; t = x; } return { from: f, to: t, custom: true }; }
  const n = Number(S.repRange) || 7; return { from: ago(n - 1), to: today(), custom: false, days: n };
}
function winDays(win) {                                   // every date in the window, oldest first (at most about a year)
  const out = [], a = parseISO(win.from), b = parseISO(win.to);
  for (let d = new Date(a), n = 0; d <= b && n < 400; d.setDate(d.getDate() + 1), n++) out.push(iso(d));
  return out;
}
function winLabel(win) {
  if (win.custom) return win.from === win.to ? dShort(win.from) : dShort(win.from) + ' - ' + dLong(win.to);
  return win.days === 1 ? 'Today' : 'Last ' + win.days + ' days';
}
function repMoves() {                                       // movements for the chosen dates: from the sheet for custom dates, otherwise what the phone holds
  const w = repWin();
  if (w.custom && S.rangeHist && S.rangeHist.key === w.from + '|' + w.to) return S.queue.map((e) => Object.assign({}, e, { pending: true })).concat(S.rangeHist.rows);
  return moves();
}
async function loadRange() {                               // asks the Stock script for exactly these dates
  const w = repWin(); if (!w.custom || !S.url) return;
  const key = w.from + '|' + w.to; if ((S.rangeHist && S.rangeHist.key === key) || S.rangeBusy === key) return;
  if (!navigator.onLine) { S.rangeErr = 'net'; return; }
  S.rangeBusy = key; S.rangeErr = '';
  try {
    const j = await (await fetch(S.url + (S.url.indexOf('?') < 0 ? '?' : '&') + 'from=' + w.from + '&to=' + w.to, { redirect: 'follow' })).json();
    if (j && j.ok && j.range && Array.isArray(j.history)) S.rangeHist = { key, rows: j.history }; else S.rangeErr = 'old';
  } catch (e) { S.rangeErr = 'net'; }
  S.rangeBusy = '';
  const r = route(); if (r.name === 'reports' || r.name === 'dialreport') render();
}
function periodBar(extra) {                                 // ONE bar: period (+ item / size) - and two date boxes when "Custom dates" is chosen
  const ro = (v, l) => `<option value="${v}"${String(S.repRange) === String(v) ? ' selected' : ''}>${l}</option>`;
  const dates = S.repRange === 'custom' ? `<div class="daterow"><label><small>From</small><input type="date" data-bind="repFrom" value="${esc(S.repFrom)}" max="${today()}"></label><label><small>To</small><input type="date" data-bind="repTo" value="${esc(S.repTo)}" max="${today()}"></label></div>` : '';
  const w = repWin(), key = w.from + '|' + w.to;
  const note = !w.custom ? '' : S.rangeBusy === key ? `<div class="banner" style="margin-top:10px"><i class="clk"></i>Loading these dates from the sheet…</div>`
    : S.rangeErr === 'old' ? `<div class="banner bad" style="margin-top:10px">Older dates need the updated Stock script. Showing what is saved on this phone.</div>`
    : S.rangeErr === 'net' ? `<div class="banner bad" style="margin-top:10px">No connection. Showing what is saved on this phone.</div>` : '';
  return `<div class="fbar"><label class="catsel"><select data-bind="repRange" aria-label="Period">${ro(1, 'Today')}${ro(7, 'Last 7 Days')}${ro(14, 'Last 14 Days')}${ro(30, 'Last 30 Days')}${ro(90, 'Last 90 Days')}${ro('custom', 'Custom dates…')}</select></label>${extra || ''}</div>${dates}${note}`;
}

function repSrc(item) { const all = repMoves(); return item && isDial(item) ? all.filter((e) => e.code === item) : expMoves(all).filter((e) => !item || e.code === item); }
const inWin = (e, w) => e.date >= w.from && e.date <= w.to;
function repStats(item) {
  const w = repWin(); let ti = 0, to = 0, dials = 0;
  repMoves().forEach((e) => { if (inWin(e, w) && isDial(e.code) && e.type === 'out' && (!item || e.code === item)) dials += Number(e.qty) || 0; });
  repSrc(item).forEach((e) => { if (!inWin(e, w)) return; const q = Number(e.qty) || 0; if (e.type === 'in') ti += q; else to += q; });
  return { ti, to, dials };
}
function repTop(item) {                                     // per item: in, out, and how much of the out went inside dials
  const w = repWin(), per = {};
  repSrc(item).forEach((e) => { if (!inWin(e, w)) return; const q = Number(e.qty) || 0, p = per[e.code] || (per[e.code] = { i: 0, o: 0, v: 0 }); if (e.type === 'in') p.i += q; else { p.o += q; if (e.via) p.v += q; } });
  return per;
}
function repFiltered() {
  const nm = {}; items().forEach((i) => { nm[i.code] = i.title; });
  const w = repWin(), q = String(S.repQ || '').trim().toLowerCase(), item = S.repItem || '', all = repMoves();
  const raw = sortMoves(all.filter((e) => inWin(e, w)));
  let base, list;
  if (item) {
    base = isDial(item) ? raw.filter((e) => e.code === item) : sortMoves(expMoves(all).filter((e) => inWin(e, w) && e.code === item)); list = base;
    if (S.repType === 'in') list = base.filter((e) => e.type === 'in'); else if (S.repType === 'out') list = base.filter((e) => e.type === 'out');
  } else {
    base = raw; list = raw;                                  // a Dial Out stays ONE row; tap it to see the items
    if (S.repType === 'in') list = raw.filter((e) => e.type === 'in' && !isDial(e.code)); else if (S.repType === 'out') list = raw.filter((e) => e.type === 'out');
  }
  if (q) list = list.filter((e) => (String(nm[e.code] || '') + ' ' + e.code + ' ' + (e.party || '') + ' ' + (e.note || '') + ' ' + (e.ref || '') + ' ' + (e.by || '')).toLowerCase().includes(q));
  return { nm, base, list };
}
function repListHTML() {
  const { nm, list } = repFiltered();
  if (!list.length) return `<div class="empty"><b>No movements</b>Nothing recorded in this period.</div>`;
  let log = '', last = '';
  list.slice(0, 150).forEach((e) => {
    if (e.date !== last) { last = e.date; log += `<div class="daygroup">${esc(dRel(e.date))}${e.date === today() || e.date === ago(1) ? ', ' + esc(dShort(e.date)) : ''}</div>`; }
    log += actRow(e, nm);
  });
  return log;
}
function itemsWentHTML(per, nm, k) {                        // "Items that went out / came in" with the part that went inside Dial Outs
  const rows = Object.entries(per).filter((x) => x[1][k] > 0).sort((x, y) => y[1][k] - x[1][k]);
  if (!rows.length) return '';
  return `<div class="card sec" style="overflow:hidden"><div class="sec-h"><h2>${k === 'o' ? 'Items that went out' : 'Items that came in'}</h2><small class="cnt">${rows.length}</small></div>`
    + rows.map(([c, p]) => `<div class="iw2"><span class="in">${esc(nm[c] || c)}${k === 'o' && p.v ? `<small>${num(p.v)} inside Dial Out</small>` : ''}</span><b class="${k === 'o' ? 'r' : 'g'}">${k === 'o' ? '-' : '+'}${num(p[k])}</b></div>`).join('') + `</div>`;
}
function vReports() {
  const { nm, list } = repFiltered(), item = S.repItem || '', w = repWin();
  const c = chartData(0, item, w, repMoves()), st = repStats(item), per = repTop(item);
  const top = (k) => Object.entries(per).filter((x) => x[1][k] > 0).sort((x, y) => y[1][k] - x[1][k]).slice(0, 5).map((x) => [x[0], x[1][k]]);
  const tu = top('o'), tg = top('i');
  const tchip = (v, label) => `<button class="chip ${S.repType === v ? 'on' : ''}" data-act="rtype" data-v="${v}">${label}</button>`;
  const bars = (arr, cls, sign) => arr.length ? arr.map(([code, q]) => `<div class="row plain"><div style="display:flex;justify-content:space-between;gap:10px"><b style="font-weight:600">${esc(nm[code] || code)}</b><b class="${cls}">${sign}${num(q)}</b></div><div class="bar ${cls === 'g' ? 'gb' : ''}"><i style="width:${Math.max(4, Math.round((q / arr[0][1]) * 100))}%"></i></div></div>`).join('') : `<div class="empty"><b>Nothing here</b>No entries in this period.</div>`;
  const opts = items().slice().sort((x, y) => x.title.localeCompare(y.title)).map((i) => `<option value="${esc(i.code)}"${item === i.code ? ' selected' : ''}>${esc(i.title)}</option>`).join('');
  const net = st.ti - st.to;
  const itemSel = `<label class="catsel"><select data-bind="repItem" aria-label="Item"><option value="">All items</option>${opts}</select></label>`;
  return `${periodBar(itemSel)}
    <section class="rsum"><div class="g"><small>Stock In</small><b>+${num(st.ti)}</b></div><div class="r"><small>Stock Out</small><b>-${num(st.to)}</b></div>${item ? `<div class="${net < 0 ? 'r' : 'b'}"><small>Net</small><b>${net > 0 ? '+' : ''}${num(net)}</b></div>` : `<div class="b"><small>Dials made</small><b>${num(st.dials)}</b></div>`}</section>
    <div class="repact"><button class="btn ghost" data-act="repshare">${ic('send', 18)}Share summary</button><button class="btn ghost" data-act="repcsv">${ic('download', 18)}Download Excel (CSV)</button></div>
    <div class="card sec">${chartBlock(c)}</div>
    ${!item && S.repType === 'out' ? itemsWentHTML(per, nm, 'o') : ''}${!item && S.repType === 'in' ? itemsWentHTML(per, nm, 'i') : ''}
    ${item || S.repType !== 'all' ? '' : `<div class="dual"><div class="card sec"><div class="sec-h"><h2>Most used</h2></div>${bars(tu, 'r', '-')}</div>
    <div class="card sec"><div class="sec-h"><h2>Most received</h2></div>${bars(tg, 'g', '+')}</div></div>`}
    <div class="card sec" style="overflow:hidden"><div class="sec-h"><h2>All movements</h2><small class="cnt" id="repcnt">${list.length}</small></div>
      <div class="chips inner">${REP_TYPES.map((t) => tchip(t[0], t[1])).join('')}<a class="chip dialchip" href="#/dialreport">${ic('dial', 16)}Dial Out</a></div>
      <div class="search inner">${ic('search', 20)}<input id="rq" type="search" placeholder="Search item, supplier or note" value="${esc(S.repQ)}" data-bind="rq" autocomplete="off"></div>
      <div id="replist">${repListHTML()}</div></div>`;
}
function repSummaryText() {
  const { nm } = repFiltered(), item = S.repItem || '', st = repStats(item), per = repTop(item), w = repWin();
  const used = Object.entries(per).filter((x) => x[1].o > 0).sort((x, y) => y[1].o - x[1].o).slice(0, 5).map(([c, p]) => (nm[c] || c) + ' (' + num(p.o) + ')').join(', ');
  return `${APP_NAME} Stock${item ? ' - ' + (nm[item] || item) : ''} - ${winLabel(w)}\nStock In: +${num(st.ti)}\nStock Out: -${num(st.to)}${item ? '' : '\nDials made: ' + num(st.dials)}${used && !item ? '\nMost used: ' + used : ''}`;
}
function downloadCSV(name, rows) {
  const csv = rows.map((r) => r.map((x) => '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"').join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
  const l = document.createElement('a'); l.href = url; l.download = name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
window.ARTIME_csv = downloadCSV;
