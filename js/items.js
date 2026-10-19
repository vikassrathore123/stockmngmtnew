/* items.js - Items and Categories screens. Part of ARTIME Stock; loaded by index.html in order. */
'use strict';
/* ---------- Items ---------- */
function filtered() {
  const f = S.filter, q = f.q.trim().toLowerCase();
  return items().filter((i) => {
    if (f.cat !== 'all' && i.cat !== f.cat) return false;
    if (f.status === 'alert' ? !(i.st === 'out' || i.st === 'low') : f.status !== 'all' && i.st !== f.status) return false;
    if (q && !(i.title + ' ' + i.code + ' ' + i.applies).toLowerCase().includes(q)) return false;
    return true;
  });
}
function vItems() {
  const f = S.filter, base = items().filter((i) => f.cat === 'all' || i.cat === f.cat);
  const n = { all: base.length, alert: 0, out: 0, low: 0, ok: 0 };
  base.forEach((i) => { if (i.st === 'out') { n.out++; n.alert++; } else if (i.st === 'low') { n.low++; n.alert++; } else if (i.st === 'ok') n.ok++; });
  const sc = (v, cls, label) => `<button class="sch ${cls} ${f.status === v ? 'on' : ''}" data-act="fs" data-v="${v}"><i></i>${label}<em>${n[v]}</em></button>`;
  const opt = (v, label) => `<option value="${v}"${f.cat === v ? ' selected' : ''}>${label}</option>`;
  return `<div class="itbar"><div class="search">${ic('search', 20)}<input id="q" type="search" placeholder="Search item or code" value="${esc(f.q)}" data-bind="q" autocomplete="off"></div>
      <label class="catsel"><select data-bind="cat" aria-label="Category">${opt('all', 'All items')}${opt('packing', 'Packaging Items')}${opt('clock', 'Clock Items')}</select></label></div>
    <div class="schips">${sc('all', 'any', 'Any status')}${sc('alert', 'warn', 'Needs attention')}${sc('out', 'out', 'Out of Stock')}${sc('low', 'low', 'Reorder Soon')}${sc('ok', 'ok', 'In Stock')}</div>
    <div id="itemlist">${itemListHTML()}</div>`;
}
function itemListHTML() {
  const list = filtered();
  if (!S.items.length) return `<div class="card empty sec"><b>No items loaded</b>Open Home and tap the sync line.</div>`;
  if (!list.length) return `<div class="card empty sec"><b>No items match</b>Try a different search or filter.</div>`;
  return `<div class="count">${list.length} ${list.length === 1 ? 'item' : 'items'}</div><div class="card">${list.map(itemRow).join('')}</div>`;
}
function renderItemList() { const el = $('#itemlist'); if (el) el.innerHTML = itemListHTML(); }

/* ---------- Categories ---------- */
function vCategories() {
  const its = items();
  const card = (key, icon, cls) => {
    const l = its.filter((i) => i.cat === key);
    const need = l.filter((i) => i.st === 'out' || i.st === 'low').length;
    return `<a class="card catcard" href="#/items?cat=${key}"><span class="ico ${cls}">${ic(icon, 28)}</span>
      <span class="t"><b>${CAT_NAME[key]}</b><small>${l.length} items, ${num(l.reduce((a, i) => a + i.eff, 0))} in stock</small>
      <small>${need ? `<span class="${l.some((i) => i.st === 'out') ? 'r' : ''}" style="font-weight:600">${need} need attention</span>` : 'All good'}</small></span>${ic('right', 20)}</a>`;
  };
  if (!its.length) return `<div class="card empty"><b>No items loaded</b>Open Home and tap the sync line.</div>`;
  return `<div class="cats">${card('packing', 'cube', '')}${card('clock', 'gear', 'c')}</div>`;
}
