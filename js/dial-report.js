/* dial-report.js - Dial Out report: which dials were made, with which items, by size and dates. Part of ARTIME Stock; loaded by index.html in order. */
'use strict';
function vDialReport() {
  const nm = {}; items().forEach((i) => { nm[i.code] = i.title; });
  const w = repWin(), dials = items().filter((i) => isDial(i.code)).sort((x, y) => x.title.localeCompare(y.title));
  const size = S.dialSize || '';
  const entries = sortMoves(repMoves().filter((e) => isDial(e.code) && e.type === 'out' && inWin(e, w) && (!size || e.code === size)));
  const sizeSel = `<label class="catsel"><select data-bind="dialSize" aria-label="Size"><option value="">All sizes</option>${dials.map((d) => `<option value="${esc(d.code)}"${size === d.code ? ' selected' : ''}>${esc(d.title)}</option>`).join('')}</select></label>`;
  const made = entries.reduce((s, e) => s + (Number(e.qty) || 0), 0);
  const groups = {}; entries.forEach((e) => { (groups[e.code] = groups[e.code] || []).push(e); });
  const codes = Object.keys(groups).sort((x, y) => (nm[x] || x).localeCompare(nm[y] || y));
  const card = (code) => {
    const list = groups[code], n = list.reduce((s, e) => s + (Number(e.qty) || 0), 0);
    const used = dialParts(code).map((c) => [c, list.reduce((s, e) => s + (skippedOf(e.note).includes(c) ? 0 : Number(e.qty) || 0), 0)]);
    const open = !!(S.dialOpen && S.dialOpen[code]);
    return `<details class="card sec dcard" data-c="${esc(code)}"${open ? ' open' : ''} ontoggle="(S.dialOpen=S.dialOpen||{})[this.dataset.c]=this.open">
      <summary class="sec-h"><div><h2>${esc(nm[code] || code)}</h2><small class="subtle">${list.length} ${list.length === 1 ? 'entry' : 'entries'} &middot; tap for item details</small></div><span class="dialn">${num(n)}<small>dials</small></span><i class="dchev">${ic('chev', 20, 2.4)}</i></summary>
      <div class="iw2 head"><span>Items used</span><span>Qty</span></div>
      ${used.map(([c, q]) => `<div class="iw2"><span class="in">${esc(nm[c] || c)}</span><b class="${q ? 'r' : ''}">${q ? '-' + num(q) : 'not used'}</b></div>`).join('')}
      <div class="iw2 head"><span>Entries</span><span></span></div>${list.map((e) => actRow(e, nm)).join('')}</details>`;
  };
  return `${periodBar(sizeSel)}
    <section class="rsum"><div class="b"><small>Dials made</small><b>${num(made)}</b></div><div class="g"><small>Entries</small><b>${num(entries.length)}</b></div><div class="r"><small>Sizes</small><b>${codes.length}</b></div></section>
    ${codes.length ? codes.map(card).join('') : `<div class="card empty"><b>No Dial Out</b>Nothing recorded in this period.</div>`}`;
}
