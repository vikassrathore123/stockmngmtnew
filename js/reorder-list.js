/* reorder-list.js - Reorder list screen. Part of ARTIME Stock; loaded by index.html in order. */
'use strict';
/* ---------- Reorder List (all low / out items, grouped by supplier) ---------- */
let BULK = [];
function vReorder() {
  const all = items().filter((i) => i.st === 'out' || i.st === 'low'), f = S.reorderF || 'all';
  const its = f === 'out' ? all.filter((i) => i.st === 'out') : f === 'low' ? all.filter((i) => i.st === 'low') : all;
  const outTotal = all.filter((i) => i.st === 'out').length, lowTotal = all.length - outTotal;
  const tab = (v, cls, label, n) => `<a class="rc ${cls} ${f === v ? 'on' : ''}" href="#/reorder${v === 'all' ? '' : '?f=' + v}">${label}<em>${n}</em></a>`;
  const tabs = `<div class="rchips">${tab('all', 'all', 'To reorder', all.length)}${tab('out', 'out', 'Out of Stock', outTotal)}${tab('low', 'low', 'Reorder Soon', lowTotal)}</div>`;
  if (!S.items.length) return `<div class="card empty"><b>No items loaded</b>Open Home and tap the sync line.</div>`;
  if (!its.length) return `<div class="rhead">${tabs}</div><div class="card empty">${ic('check', 40)}<b>Nothing is running low</b>Items show here when they reach their reorder level.</div>`;
  const setup = store.get('rsetup', []), groups = {};
  its.sort((x, y) => (x.st === y.st ? x.title.localeCompare(y.title) : x.st === 'out' ? -1 : 1)).forEach((i) => {
    const r = setup.find((q) => String(q.code).trim().toUpperCase() === String(i.code).trim().toUpperCase()) || null, k = (r && r.supplier) || '';
    const g = groups[k] || (groups[k] = { supplier: k, phone: '', rows: [] });
    if (r && r.phone && !g.phone) g.phone = r.phone;
    g.rows.push({ i, r });
  });
  const names = Object.keys(groups).sort((x, y) => (x === '' ? 1 : y === '' ? -1 : x.localeCompare(y)));
  BULK = names.map((k) => groups[k]);
  return `<div class="rhead">${tabs}<div class="count">${its.length} ${its.length === 1 ? 'item' : 'items'} to order</div></div>`
    + BULK.map((g, gi) => `<div class="card sec"><div class="sec-h"><div><h2>${g.supplier ? esc(g.supplier) : 'No supplier set'}</h2><small class="subtle">${g.rows.length} ${g.rows.length === 1 ? 'item' : 'items'}${g.phone ? ' · ' + esc(g.phone) : ''}</small></div>${g.rows.length > 1 ? `<button class="bulkbtn" data-rx="bulk" data-g="${gi}">${ic('send', 16)}Order all</button>` : ''}</div>${g.rows.map((x) => itemRow(x.i)).join('')}</div>`).join('');
}
