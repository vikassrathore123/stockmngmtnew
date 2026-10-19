/* reorder-popups.js - Reorder, bulk order and change-entry popups. Part of ARTIME Stock; loaded by index.html in order. */
'use strict';
/* ================= Reorder (button on low / out items -> WhatsApp) ================= */
function reorderedFor(code) {
  const all = store.get('rlog', []).concat(store.get('rq', []).map((r) => ({ code: r.code, qty: r.qty, date: r.date })));
  const mine = all.filter((r) => r.code === code).sort((x, y) => (x.date < y.date ? 1 : -1))[0];
  if (!mine) return null;
  const arrived = S.history.concat(S.queue).some((e) => e.type === 'in' && e.code === code && e.date >= mine.date);
  return arrived ? null : mine;                      // a Stock In after the reorder clears the mark
}
const waNum = (p) => { let d = String(p || '').replace(/\D/g, '').replace(/^0+/, ''); return d.length === 10 ? '91' + d : d; };
function rsMsg(it, row, qty) {
  const t = (row && row.msg) || store.get('rmsg', 'Hello {supplier}, please send {item} - {qty} {unit}. - ARTIME');
  const unit = String(unitLabel(it.unit)).toLowerCase();
  const v = { supplier: (row && row.supplier) || '', item: (row && row.sname) || it.title, qty: qty, quantity: qty, unit: unit, units: unit, stock: it.eff, date: dRel(today()) };
  let hasQty = false;
  let out = t.replace(/\{\s*(\w+)\s*\}/g, (m, k) => { k = k.toLowerCase(); if (k === 'qty' || k === 'quantity') hasQty = true; return k in v ? v[k] : m; });
  if (!hasQty) out = out.replace(/\s+$/, '') + ' Quantity: ' + qty + ' ' + unit;     // message in the sheet has no {qty}: always add the quantity
  return out;
}
const rowFor = (code) => store.get('rsetup', []).find((r) => String(r.code).trim().toUpperCase() === String(code).trim().toUpperCase()) || null;
function openReorder(code, fresh, note) {
  const it = items().find((i) => i.code === code); if (!it) return;
  const row = rowFor(code);
  // number / message missing on this phone: pull the latest Reorder Setup straight from the sheet, then reopen
  if (!fresh && (!row || !row.phone) && S.url && navigator.onLine) {
    apiGet().then((j) => {
      if (!document.getElementById('rs')) return;
      if (j && Array.isArray(j.reorderSetup)) { store.set('rsetup', j.reorderSetup); if (j.reorderMessage) store.set('rmsg', j.reorderMessage); openReorder(code, true); }
      else openReorder(code, true, 'Your Stock Google Script is an old version. Paste the new StockScript.gs, then Deploy > Manage deployments > New version.');
    }).catch(() => { if (document.getElementById('rs')) openReorder(code, true); });
  }
  const q0 = (row && row.qty) || Math.max(1, Math.round(it.min * 2 - it.eff));
  let el = document.getElementById('rs'); if (!el) { el = document.createElement('div'); el.id = 'rs'; document.body.appendChild(el); }
  el.innerHTML = `<div class="rsb" data-rx="close"><div class="rsc" onclick="event.stopPropagation()"><div class="grab"></div>
    <h3>Reorder ${esc(it.title)}</h3><small>${esc(it.code)} · Stock ${num(it.eff)} ${esc(unitLabel(it.unit))} · Min ${num(it.min)}</small>
    <p class="rsup">${row && row.phone ? 'To: <b>' + esc(row.supplier || 'Supplier') + '</b> (' + esc(row.phone) + ')' : '<span class="r">' + esc(note || (row ? 'No WhatsApp number for this item in the Reorder Setup sheet.' : (fresh ? 'This code is not filled in the Reorder Setup sheet.' : 'Reading supplier from the sheet...'))) + ' You can still pick a contact in WhatsApp.</span>'}</p>
    <label>Quantity</label><input id="rqty" type="number" inputmode="decimal" value="${q0}">
    <label>Message</label><textarea id="rtxt" rows="4">${esc(rsMsg(it, row, q0))}</textarea>
    <button class="go" data-rx="send" data-code="${esc(code)}">Send on WhatsApp</button><button class="rcancel" data-rx="close">Cancel</button></div></div>`;
  document.getElementById('rqty').addEventListener('input', (e) => { document.getElementById('rtxt').value = rsMsg(it, row, e.target.value); });
}
function openDialDetail(id) {                      // tap a Dial Out: which items went with it
  const e = repMoves().concat(moves()).find((x) => x.id === id && isDial(x.code) || x.id === id && x.via); if (!e) return;
  const code = e.dialCode || e.code, nm = {}; items().forEach((i) => { nm[i.code] = i.title; });
  const sk = skippedOf(e.note), left = moveLeft(Object.assign({}, e, { code }));
  let el = document.getElementById('rs'); if (!el) { el = document.createElement('div'); el.id = 'rs'; document.body.appendChild(el); }
  el.innerHTML = `<div class="rsb" data-rx="close"><div class="rsc" onclick="event.stopPropagation()"><div class="grab"></div>
    <h3>Dial Out - ${esc(nm[code] || code)}</h3>
    <small>${num(e.qty)} ${Number(e.qty) === 1 ? 'dial' : 'dials'} · ${esc(e.pending ? 'Waiting to sync' : when(e))}${e.by && e.by !== 'Old app' && e.by !== '-' ? ' · by ' + esc(e.by) : ''}</small>
    <div class="bl">${dialParts(code).map((c) => { const used = !sk.includes(c); return `<div class="bi"><span class="bn"><b>${esc(nm[c] || c)}</b></span><b class="${used ? 'r' : ''}" style="min-width:70px;text-align:right">${used ? '-' + num(e.qty) : 'not used'}</b></div>`; }).join('')}</div>
    ${left ? `<button class="go" data-act="editmv" data-id="${esc(e.id)}" data-t="out">Change this entry</button>` : ''}
    <button class="rcancel" data-rx="close">Close</button></div></div>`;
}
function openEditMove(id, type) {
  const e = S.history.find((x) => x.id === id && x.type === type); if (!e) return;
  const left = moveLeft(e); if (!left) { toast('The 30 minutes to change this entry are over', true); return; }
  const dl = isDial(e.code), nm = {}; items().forEach((i) => { nm[i.code] = i.title; });
  let el = document.getElementById('rs'); if (!el) { el = document.createElement('div'); el.id = 'rs'; document.body.appendChild(el); }
  el.innerHTML = `<div class="rsb" data-rx="close"><div class="rsc" onclick="event.stopPropagation()"><div class="grab"></div><h3>Change this entry</h3>
    <small>${esc(nm[e.code] || e.code)} · ${dl ? 'Dial Out' : e.type === 'in' ? 'Stock In' : 'Stock Out'} · by ${esc(e.by)} · you can change it for ${left} more min</small>
    <label>${dl ? 'How many dials' : 'Quantity'}</label><input id="ed-qty" type="number" inputmode="decimal" value="${esc(e.qty)}">
    ${dl ? '' : `<label>${e.type === 'in' ? 'Supplier' : 'Used for'}</label><input id="ed-party" value="${esc(e.party || '')}">
    <label>Reference No.</label><input id="ed-ref" value="${esc(e.ref || '')}">
    <label>Notes</label><input id="ed-note" value="${esc(e.note || '')}">`}
    <label>Date</label><input id="ed-date" type="date" value="${esc(e.date)}">
    <div class="hint bad" id="ed-msg"></div>
    <button class="go" data-rx="msave" data-id="${esc(id)}" data-t="${e.type}">Save changes</button>
    <button class="rcancel dng" data-rx="mdel" data-id="${esc(id)}" data-t="${e.type}">Delete entry</button>
    <button class="rcancel" data-rx="close">Cancel</button></div></div>`;
}
async function stockEdit(id, type, del) {
  const e = S.history.find((x) => x.id === id && x.type === type); if (!e) return;
  const msg = (t, clock) => { const m = document.getElementById('ed-msg'); if (m) m.innerHTML = (clock ? '<i class="clk"></i>' : '') + esc(t); };
  const v = (k) => String((document.getElementById('ed-' + k) || {}).value || '').trim(), dl = isDial(e.code);
  const q = Number(v('qty'));
  if (!del && !(q > 0)) { msg('Enter a quantity above 0.'); return; }
  const ed = del ? { id, type, by: store.get('by', ''), void: true } : { id, type, by: store.get('by', ''), qty: q, date: v('date') || e.date, party: dl ? e.party || '' : v('party'), ref: dl ? e.ref || '' : v('ref'), note: dl ? e.note || '' : v('note') };
  msg('Saving…', true);
  try {
    const j = await apiPost({ v: 2, entries: [], edits: [ed] });
    if (!j || !j.ok) { msg((j && j.error) || 'Could not save the change.'); return; }
    applyData(j);
    const r = (j.editResults || [])[0] || {};
    if (r.status === 'ok') { const x = document.getElementById('rs'); if (x) x.remove(); toast(del ? 'Entry deleted' : 'Entry updated'); render(); }
    else msg(r.msg || 'Could not save the change.');
  } catch (err) { msg(navigator.onLine ? 'Could not reach Google Sheets.' : 'No internet. Try again when you are online.'); }
}
function openBulk(gi) {
  const g = BULK[gi]; if (!g) return;
  const rows = g.rows.map(({ i, r }) => ({ i, r, qty: Math.max(1, Math.round((r && r.qty) || (Number(i.min) * 2 - Number(i.eff)) || 1)), on: true }));
  // The sheet's own message is used ONCE: the words before the item part open the message, the words after it close it.
  const withRow = g.rows.find((x) => x.r && x.r.msg);
  const tmpl = String((withRow && withRow.r.msg) || store.get('rmsg', '') || 'Hello {supplier}, please send {item} - {qty} {unit}. - ' + APP_NAME);
  const itemRe = /\{\s*(item|qty|quantity|unit|units)\s*\}/gi;
  let first = -1, last = -1, mm;
  while ((mm = itemRe.exec(tmpl))) { if (first < 0) first = mm.index; last = mm.index + mm[0].length; }
  const fill = (t) => t.replace(/\{\s*supplier\s*\}/gi, g.supplier || '').replace(/\{\s*date\s*\}/gi, dRel(today()));
  const head = fill(first < 0 ? tmpl : tmpl.slice(0, first)).replace(/\s+,/g, ',').trim() || (g.supplier ? 'Hello ' + g.supplier + ',' : 'Hello,');
  const tail = first < 0 ? '' : fill(tmpl.slice(last)).replace(/^[\s.,;:]+/, '').trim();
  const build = () => {
    const sel = rows.filter((x) => x.on && x.qty > 0);
    return head + '\n' + sel.map((x, k) => (k + 1) + '. ' + ((x.r && x.r.sname) || x.i.title) + ' - ' + x.qty + ' ' + String(unitLabel(x.i.unit)).toLowerCase()).join('\n') + (tail ? '\n' + tail : '');
  };
  let el = document.getElementById('rs'); if (!el) { el = document.createElement('div'); el.id = 'rs'; document.body.appendChild(el); }
  el.innerHTML = `<div class="rsb" data-rx="close"><div class="rsc" onclick="event.stopPropagation()"><div class="grab"></div>
    <h3>Order all from ${esc(g.supplier || 'supplier')}</h3><small>Tick the items and set the quantities</small>
    <div class="bl">${rows.map((x, k) => `<div class="bi"><input type="checkbox" data-k="${k}" checked aria-label="Include"><span class="bn"><b>${esc((x.r && x.r.sname) || x.i.title)}</b><small>${x.r && x.r.sname && x.r.sname !== x.i.title ? esc(x.i.title) + ' · ' : ''}Stock ${num(x.i.eff)} · Min ${num(x.i.min)}</small></span><input class="bq" type="number" inputmode="decimal" data-k="${k}" value="${x.qty}"></div>`).join('')}</div>
    <label>Message</label><textarea id="btxt" rows="6">${esc(build())}</textarea>
    <button class="go" data-rx="bsend" data-g="${gi}">Send on WhatsApp</button><button class="rcancel" data-rx="close">Cancel</button></div></div>`;
  const upd = (e) => { const k = Number(e.target.dataset.k); if (Number.isNaN(k) || !rows[k]) return; if (e.target.type === 'checkbox') rows[k].on = e.target.checked; else rows[k].qty = parseFloat(e.target.value) || 0; document.getElementById('btxt').value = build(); };
  el.querySelectorAll('.bl input').forEach((inp) => { inp.addEventListener('input', upd); inp.addEventListener('change', upd); });
  el.__rows = rows;
}
document.addEventListener('click', (ev) => {
  try {
    const r = ev.target.closest('[data-r]'), x = ev.target.closest('[data-rx]');
    if (x && (x.dataset.rx === 'msave' || x.dataset.rx === 'mdel')) {
      ev.stopPropagation();
      if (x.dataset.rx === 'mdel' && !confirm(window.ARTIME_tr('Delete this entry?'))) return;
      stockEdit(x.dataset.id, x.dataset.t, x.dataset.rx === 'mdel'); return;
    }
    if (x && x.dataset.rx === 'bulk') { ev.stopPropagation(); ev.preventDefault(); openBulk(Number(x.dataset.g)); return; }
    if (x && x.dataset.rx === 'bsend') {
      ev.stopPropagation();
      const el = document.getElementById('rs'), rows = el && el.__rows, g = BULK[Number(x.dataset.g)];
      if (!rows || !g) return;
      const sel = rows.filter((q) => q.on && q.qty > 0);
      if (!sel.length) { toast('Tick at least one item', true); return; }
      const text = document.getElementById('btxt').value, rq = store.get('rq', []);
      sel.forEach((q) => rq.push({ id: 'R' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), code: q.i.code, qty: q.qty, date: today(), supplier: g.supplier || '', phone: g.phone || '', by: store.get('by', '') || '-' }));
      store.set('rq', rq); el.remove();
      window.open('https://wa.me/' + waNum(g.phone) + '?text=' + encodeURIComponent(text), '_blank');
      sync(true); render(); return;
    }
    if (r) { ev.stopPropagation(); ev.preventDefault(); openReorder(r.dataset.r); return; }
    if (!x) return;
    if (x.classList.contains('rsb') && ev.target !== x) return;     // tapping inside the popup (quantity, message) must not close it
    ev.stopPropagation();
    const el = document.getElementById('rs');
    if (x.dataset.rx === 'close') { if (el) el.remove(); return; }
    if (x.dataset.rx === 'send') {
      const code = x.dataset.code, qty = parseFloat(document.getElementById('rqty').value);
      if (!(qty > 0)) { toast('Enter a quantity', true); return; }
      const row = rowFor(code) || {}, text = document.getElementById('rtxt').value;
      store.set('rq', store.get('rq', []).concat([{ id: 'R' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), code, qty, date: today(), supplier: row.supplier || '', phone: row.phone || '', by: store.get('by', '') || '-' }]));
      if (el) el.remove();
      window.open('https://wa.me/' + waNum(row.phone) + '?text=' + encodeURIComponent(text), '_blank');
      sync(true); render();
    }
  } catch (e) { toast('Reorder had a problem. Nothing was lost.', true); }
}, true);
