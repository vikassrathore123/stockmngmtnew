/* charts.js - Line graph. Part of ARTIME Stock; loaded by index.html in order. */
'use strict';
/* ---------- chart ---------- */
function chartData(days, item, win, list) {
  const ds = win ? winDays(win) : []; if (!win) for (let k = days - 1; k >= 0; k--) ds.push(ago(k));
  const m = {}; ds.forEach((d) => { m[d] = { i: 0, o: 0 }; });
  let ti = 0, to = 0;
  const src = item && isDial(item) ? (list || moves()).filter((e) => e.code === item && e.type === 'out') : expMoves(list).filter((e) => !item || e.code === item);   // a Dial Out counts every part that went
  src.forEach((e) => { const b = m[e.date]; if (!b) return; const q = Number(e.qty) || 0; if (e.type === 'in') { b.i += q; ti += q; } else { b.o += q; to += q; } });
  return { ds, m, ti, to };
}
function niceStep(peak) {
  const p = Math.pow(10, Math.floor(Math.log10(peak)));
  const r = peak / p;
  return Math.max(1, (r <= 2 ? 0.5 : r <= 5 ? 1 : 2) * p);
}
function lineSVG(o) {                           // two lines over time: o = {ds, a, b, ca, cb, fmt, label}
  const { ds, a: A, b: B } = o, n = ds.length, fmt = o.fmt || num, lab = o.label || dShort;
  const peak = Math.max(1, ...A, ...B), step = niceStep(peak), top = Math.ceil(peak / step) * step;
  const W = 360, H = 190, L = 40, R = 12, T = 10, B_ = 26, pw = W - L - R, ph = H - T - B_;
  const X = (k) => (n === 1 ? L + pw / 2 : L + (pw * k) / (n - 1)), Y = (v) => T + ph - (v / top) * ph;
  let g = '';
  for (let v = 0; v <= top; v += step) { const y = Y(v); g += `<line x1="${L}" x2="${W - R}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" style="stroke:var(--line)" stroke-width="1"/><text x="${L - 6}" y="${(y + 3.5).toFixed(1)}" text-anchor="end">${fmt(v)}</text>`; }
  const path = (arr) => arr.map((v, k) => (k ? 'L' : 'M') + X(k).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ');
  const line = (arr, col) => `<path d="${path(arr)} L${X(n - 1).toFixed(1)} ${(T + ph).toFixed(1)} L${X(0).toFixed(1)} ${(T + ph).toFixed(1)} Z" fill="${col}" opacity=".10"/><path d="${path(arr)}" fill="none" stroke="${col}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`
    + (n <= 16 ? arr.map((v, k) => `<circle cx="${X(k).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="3.2" fill="${col}" stroke="var(--card)" stroke-width="1.5"/>`).join('') : '');
  const every = Math.ceil(n / 6);
  ds.forEach((d, k) => { if ((n - 1 - k) % every === 0) g += `<text x="${X(k).toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(lab(d))}</text>`; });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || 'Trend over time')}">${g}${line(B, o.cb)}${line(A, o.ca)}</svg>`;
}
window.ARTIME_lineSVG = lineSVG;
function chartBlock(c) {
  const { ds, m } = c;
  const chart = ds.length < 2 ? `<p class="subtle" style="margin:6px 16px 10px">Pick 7 days or more to see the trend line.</p>`
    : `<div class="chart">${lineSVG({ ds, a: ds.map((d) => m[d].i), b: ds.map((d) => m[d].o), ca: '#2fae8a', cb: '#ec5757', aria: 'Stock in and out per day' })}</div>`;
  return `<div class="legend"><span><i style="background:#2fae8a"></i>Stock In</span><span><i style="background:#ec5757"></i>Stock Out</span></div>
    ${chart}
    <div class="tot"><div><span class="aic in">${ic('up', 20, 2.2)}</span><span><small>Total In</small><b>${num(c.ti)}</b></span></div>
    <div><span class="aic out">${ic('down', 20, 2.2)}</span><span><small>Total Out</small><b>${num(c.to)}</b></span></div></div>`;
}
