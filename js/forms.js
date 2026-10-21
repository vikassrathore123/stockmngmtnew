/* forms.js - Stock In / Stock Out form and the saving popup. Part of ARTIME Stock; loaded by index.html in order. */
'use strict';
/* ---------- Stock In / Out form ---------- */
function ensureForm(type) {
  if (!S.form[type]) S.form[type] = { t: type, cat: 'packing', base: null, variant: null, size: null, qty: 1, date: today(), party: '', ref: '', note: '', used: '', skip: [], paper: 'H' };
  return S.form[type];
}
function resolve(f) {
  if (f.wantCode) {                      // opened from an item or shortcut: jump to that item once data is there
    const it = items().find((i) => i.code === f.wantCode);
    if (it) { Object.assign(f, { cat: it.cat, base: it.base, variant: it.variant, size: it.size }); f.wantCode = null; }
    else if (S.items.length) f.wantCode = null;
  }
  const its = items().filter((i) => i.cat === f.cat && !isDial(i.code));
  const bases = uniq(its.map((i) => i.base));
  if (!bases.includes(f.base)) f.base = bases[0] || null;
  const rows = its.filter((i) => i.base === f.base);
  const variants = uniq(rows.map((r) => r.variant).filter(Boolean));
  f.variant = variants.length ? (variants.includes(f.variant) ? f.variant : variants[0]) : null;
  const rv = rows.filter((r) => r.variant === f.variant);
  const sizes = uniq(rv.map((r) => r.size));
  if (!sizes.includes(f.size)) f.size = sizes[0] || null;
  return { bases, variants, sizes, row: rv.find((r) => r.size === f.size) || null };
}
function vForm(type) {
  const f = ensureForm(type);
  const R = resolve(f);
  const tab = (k, icon) => `<button class="tab ${f.cat === k ? 'on' : ''}" data-act="fcat" data-v="${k}">${ic(icon, 22)}${CAT_NAME[k]}</button>`;
  const hasSize = !(R.sizes.length === 1 && (R.sizes[0] === 'n/a' || !R.sizes[0]));
  const sup = uniq(S.history.filter((e) => e.type === 'in' && e.party).map((e) => e.party)).slice(0, 40);
  const usedFor = uniq(['Order', 'Production', 'Damaged', 'Sample'].concat(S.history.filter((e) => e.type === 'out' && e.party).map((e) => e.party))).slice(0, 40);
  const unit = unitLabel(R.row ? R.row.unit : 'pcs');
  return `<div class="form ${type}">
    <div class="tabs">${tab('clock', 'gear')}${tab('packing', 'cube')}</div>
    <label class="fl" for="item">Item<i>*</i></label>
    <div class="field">${ic('cube', 22)}<select id="item" data-bind="base">${R.bases.map((b) => `<option ${b === f.base ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select>${ic('chev', 20)}</div>
    ${hasSize ? `<div class="fl">Size<i>*</i></div><div class="sizes">${R.sizes.map((s) => `<button class="size ${s === f.size ? 'on' : ''}" data-act="fsize" data-v="${esc(s)}">${esc(sizeLabel(s) || s)}</button>`).join('')}</div>` : ''}
    ${R.variants.length > 1 ? `<div class="fl">Type<i>*</i></div><div class="seg">${R.variants.map((v) => `<button class="size ${v === f.variant ? 'on' : ''}" data-act="fvar" data-v="${esc(v)}">${esc(v)}</button>`).join('')}</div>` : ''}
    <div id="fcard"></div>
    <label class="fl" for="qty">Quantity<i>*</i></label>
    <div class="qty"><button data-act="qminus" aria-label="Decrease">${ic('minus', 22, 2.2)}</button><input id="qty" type="number" inputmode="decimal" min="0" step="any" value="${esc(f.qty)}" data-bind="qty"><button data-act="qplus" aria-label="Increase">${ic('plus', 22, 2.2)}</button><span class="unit">${esc(unit)}</span></div>
    <div class="hint" id="qhint"></div>
    <div class="fl" style="margin-top:8px">Date<i>*</i></div>
    <div class="field datef" data-act="pick">${ic('cal', 22)}<span class="val">${esc(dLong(f.date))}</span>${ic('chev', 20)}<input id="date" type="date" value="${esc(f.date)}" data-bind="date" aria-label="Date"></div>
    <div class="pair">
      <div>${type === 'in'
        ? `<label class="fl" for="party">Supplier</label><div class="field">${ic('truck', 22)}<input id="party" list="dl-party" placeholder="Supplier name" value="${esc(f.party)}" data-bind="party" autocomplete="off"><datalist id="dl-party">${sup.map((s) => `<option value="${esc(s)}">`).join('')}</datalist></div>`
        : `<label class="fl" for="used">Used for</label><div class="field">${ic('layers', 22)}<input id="used" list="dl-used" placeholder="Order, Sample..." value="${esc(f.used)}" data-bind="used" autocomplete="off"><datalist id="dl-used">${usedFor.map((s) => `<option value="${esc(s)}">`).join('')}</datalist></div>`}</div>
      <div><label class="fl" for="ref">Reference No.</label><div class="field">${ic('file', 22)}<input id="ref" placeholder="${type === 'in' ? 'Invoice / GRN No.' : 'Voucher / Order No.'}" value="${esc(f.ref)}" data-bind="ref" autocomplete="off"></div></div>
    </div>
    <label class="fl" for="note">Notes <small>(optional)</small></label>
    <div class="field">${ic('pencil', 20)}<input id="note" placeholder="Add notes..." value="${esc(f.note)}" data-bind="note" autocomplete="off"></div>
    <button class="submit" id="fsubmit" data-act="submit">${ic(type === 'in' ? 'up' : 'down', 24, 2.2)}<span>${type === 'in' ? 'Add Stock In' : 'Remove Stock Out'}</span></button>
  </div>`;
}
function formState(type) {
  const f = ensureForm(type); const R = resolve(f); const row = R.row;
  const q = Number(f.qty);
  const avail = row ? row.eff : 0;
  let err = '';
  if (!row) err = 'Choose an item.';
  else if (!(q > 0)) err = 'Enter a quantity above 0.';
  else if (type === 'out' && q > avail) err = avail > 0 ? `Only ${num(avail)} ${unitLabel(row.unit)} available.` : 'This item is out of stock.';
  return { f, R, row, q, avail, err, ok: !err };
}
function updateFormDynamic() {
  const r = route(); if (r.name === 'dial') { updateDial(); return; }
  if (r.name === 'ready' || r.name === 'sold') { updateProdForm(); return; }
  if (r.name !== 'in' && r.name !== 'out') return;
  const type = r.name; const st = formState(type); const row = st.row;
  const card = $('#fcard'); if (!card) return;
  if (!row) { card.innerHTML = `<div class="empty-card">${S.items.length ? 'No matching item.' : 'No items loaded yet. Go back and sync first.'}</div>`; }
  else {
    const stCls = row.st === 'out' ? 'r' : row.st === 'low' ? 'a' : 'g';
    card.innerHTML = `<div class="pcard"><div class="head">${art(row.base, 76)}<div><b>${esc(row.code)}</b><small>${esc(row.title)}</small></div></div>
      <div class="nums"><div><small>Current Stock</small><b class="${stCls}">${num(row.eff)}</b><span>${esc(unitLabel(row.unit))}</span></div>
      <div><small>Reorder Level</small><b class="a">${num(row.min)}</b><span>${esc(unitLabel(row.unit))}</span></div>
      <div><small>Unit</small><b class="u">${esc(unitLabel(row.unit))}</b></div></div></div>`;
  }
  const hint = $('#qhint');
  if (hint) {
    if (type === 'out' && row) { hint.textContent = st.err && st.q > 0 ? st.err : `Max available: ${num(st.avail)} ${unitLabel(row.unit)}`; hint.className = 'hint' + (st.err && st.q > 0 ? ' bad' : ''); }
    else { hint.textContent = ''; hint.className = 'hint'; }
  }
  const btn = $('#fsubmit'); if (btn) btn.disabled = !st.ok;
}
async function submitForm(type) {
  if (S.busy) return;                       // ignore double taps while the popup is up
  const st = formState(type); if (!st.ok) return;
  if (type === 'out' && store.get('reqNoteOut', false) && !String(st.f.note || '').trim()) { toast('Add a note for Stock Out', true); return; }
  if (store.get('confirmStock', false) && !confirm('Save Stock ' + (type === 'in' ? 'In' : 'Out') + ': ' + st.row.title + ' × ' + num(st.q) + '?')) return;
  S.busy = true;
  const f = st.f;
  const e = { id: newId(), ts: Date.now(), type, code: st.row.code, qty: st.q, date: f.date || today(), party: (type === 'in' ? f.party : f.used).trim(), ref: f.ref.trim(), note: f.note.trim() };
  S.queue.push(e); saveQueue();             // entry has a unique id, so the sheet can never double-count it
  const unit = unitLabel(st.row.unit);
  const now = items().find((i) => i.code === e.code);
  const pop = { kind: type, title: 'Added to Stock ' + (type === 'in' ? 'In' : 'Out'), item: st.row.title, qty: (type === 'in' ? '+' : '-') + num(e.qty) + ' ' + unit, now: now ? 'Stock now ' + num(now.eff) + ' ' + unit : '', status: 'ok', msg: navigator.onLine && S.url ? 'Saving to Google Sheets in background' : 'Saved on this phone. It will sync when you are online.' };
  if (!navigator.onLine || !S.url) pop.status = 'warn';
  f.qty = 1; f.ref = ''; f.note = '';
  render();
  showPopup(pop);
  clearTimeout(popT);
  popT = setTimeout(closePopup, 1200);      // popup is instant; the sheet saves in the background
  flushEntry(e.id, pop);
}
// send to the sheet without blocking the screen; only interrupt if the sheet rejects the entry
async function flushEntry(id, pop) {
  if (!navigator.onLine || !S.url) return;
  while (S.syncing) await new Promise((r) => setTimeout(r, 200));
  if (S.queue.some((x) => x.id === id)) await sync(true);
  const bad = S.failed.find((x) => x.id === id);
  if (bad) {
    clearTimeout(popT);
    showPopup(Object.assign({}, pop, { kind: 'bad', status: 'bad', title: 'Not added', now: '', msg: 'The sheet rejected it: ' + bad.msg }));
    S.busy = true;                          // stays until the person taps OK
  }
}

/* ---------- confirmation popup ---------- */
let popT;
function showPopup(p) {
  const icon = p.status === 'busy' ? '<span class="spin"></span>' : p.status === 'bad' ? ic('x', 34, 2.6) : p.status === 'warn' ? ic('check', 34, 2.6) : ic('check', 34, 2.6);
  $('#popup').innerHTML = `<div class="pop-scrim"><div class="pop ${p.kind} ${p.status}" role="alertdialog" aria-live="assertive" aria-label="${esc(p.title)}">
    <div class="pop-ic">${icon}</div><h3>${esc(p.title)}</h3>
    <div class="pop-item">${esc(p.item)}</div><div class="pop-qty">${esc(p.qty)}</div>
    ${p.now ? `<div class="pop-sub">${esc(p.now)}</div>` : ''}
    <div class="pop-msg">${esc(p.msg)}</div>
    ${p.status === 'bad' ? '<button class="pop-ok" data-act="pop-ok">OK</button>' : ''}</div></div>`;
}
function closePopup() { clearTimeout(popT); $('#popup').innerHTML = ''; S.busy = false; }
