/* dial.js - Dial Out screen. Part of ARTIME Stock; loaded by index.html in order. */
'use strict';
/* ---------- Dial Out form ---------- */
function dialState() {
  const f = ensureForm('dial');
  const ds = items().filter((i) => isDial(i.code));
  if (!ds.some((d) => d.code === f.dcode)) f.dcode = ds.length ? ds[0].code : null;
  const row = ds.find((d) => d.code === f.dcode) || null;
  const q = Number(f.qty);
  const byCode = {}; items().forEach((i) => { byCode[i.code] = i; });
  const parts = row ? dialParts(row.code).map((c, i) => ({ i, code: c, name: DIAL_PART_NAMES[i], it: byCode[c], on: !f.skip.includes(i) })).filter((p) => p.it) : [];
  const chosen = parts.filter((p) => p.on);
  const short = chosen.filter((p) => p.it.eff < q);
  const limit = chosen.length ? chosen.reduce((a, p) => (p.it.eff < a.it.eff ? p : a)) : null;
  const canMake = limit ? Math.max(0, Math.floor(limit.it.eff)) : 0;
  let err = '';
  if (!row) err = 'Choose a dial size.'; else if (!(q > 0)) err = 'Enter a quantity above 0.'; else if (!chosen.length) err = 'Tick at least one part.';
  return { f, ds, row, q, parts, chosen, short, limit, canMake, err, ok: !err };
}
function vDial() {
  const st = dialState(); const f = st.f;
  const usedFor = uniq(['Production', 'Order', 'Sample'].concat(S.history.filter((e) => e.type === 'out' && e.party).map((e) => e.party))).slice(0, 40);
  return `<div class="form dial">
    <div class="fl">Dial size<i>*</i></div>
    <div class="sizes">${st.ds.map((d) => `<button class="size ${d.code === f.dcode ? 'on' : ''}" data-act="dsize" data-v="${esc(d.code)}">${esc(sizeLabel(d.size) || d.size)}</button>`).join('') || '<div class="empty-card">No dial items loaded yet. Go back and sync first.</div>'}</div>
    <div id="fcard"></div>
    <label class="fl" for="qty">How many dials<i>*</i></label>
    <div class="qty"><button data-act="qminus" aria-label="Decrease">${ic('minus', 22, 2.2)}</button><input id="qty" type="number" inputmode="decimal" min="0" step="any" value="${esc(f.qty)}" data-bind="qty"><button data-act="qplus" aria-label="Increase">${ic('plus', 22, 2.2)}</button><span class="unit">Pcs</span></div>
    <div class="hint" id="qhint"></div>
    <div class="fl" style="margin-top:8px">Date<i>*</i></div>
    <div class="field datef" data-act="pick">${ic('cal', 22)}<span class="val">${esc(dLong(f.date))}</span>${ic('chev', 20)}<input id="date" type="date" value="${esc(f.date)}" data-bind="date" aria-label="Date"></div>
    <div class="pair">
      <div><label class="fl" for="used">Used for</label><div class="field">${ic('layers', 22)}<input id="used" list="dl-used" placeholder="Production" value="${esc(f.used)}" data-bind="used" autocomplete="off"><datalist id="dl-used">${usedFor.map((x) => `<option value="${esc(x)}">`).join('')}</datalist></div></div>
      <div><label class="fl" for="ref">Reference No.</label><div class="field">${ic('file', 22)}<input id="ref" placeholder="Voucher / Order No." value="${esc(f.ref)}" data-bind="ref" autocomplete="off"></div></div>
    </div>
    <label class="fl" for="note">Notes <small>(optional)</small></label>
    <div class="field">${ic('pencil', 20)}<input id="note" placeholder="Add notes..." value="${esc(f.note)}" data-bind="note" autocomplete="off"></div>
    <button class="submit" id="fsubmit" data-act="submit">${ic('down', 24, 2.2)}<span>Record Dial Out</span></button>
  </div>`;
}
function updateDial() {
  const st = dialState(); const card = $('#fcard'); if (!card) return;
  const q = st.q > 0 ? st.q : 0;
  if (st.row) {
    card.innerHTML = `<div class="pcard"><div class="head">${art('Dial', 76)}<div><b>${esc(st.row.code)}</b><small>${esc(st.row.title)}</small></div></div>
      <div class="parts-h"><span>Tick the parts that go out for ${num(q)} dial${q === 1 ? '' : 's'}</span><button class="selall" data-act="dall">${st.parts.some((p) => !p.on) ? 'Select all' : 'Clear all'}</button></div>
      ${st.parts.map((p) => `<button class="part pick ${p.on ? 'on' : 'off'}" data-act="dpart" data-v="${p.i}" role="checkbox" aria-checked="${p.on}"><span class="cb">${p.on ? ic('check', 16, 3) : ''}</span><span class="pn">${esc(p.it.title)}</span>${p.on ? `<span class="pv">${num(p.it.eff)} &rarr; <b class="${p.it.eff - q < 0 ? 'r' : ''}">${num(p.it.eff - q)}</b></span>` : '<span class="pv skip">Not used</span>'}</button>`).join('')}</div>`;
  } else card.innerHTML = '';
  const hint = $('#qhint');
  if (hint) {
    if (st.row && st.short.length && q > 0) { hint.textContent = 'Not enough ' + st.short.map((p) => p.it.title).join(', ') + '. Stock will go below zero.'; hint.className = 'hint bad'; }
    else if (st.row && st.limit) { hint.textContent = `Stock allows up to ${num(st.canMake)} dial${st.canMake === 1 ? '' : 's'} (limited by ${st.limit.name}).`; hint.className = 'hint'; }
    else { hint.textContent = ''; hint.className = 'hint'; }
  }
  const btn = $('#fsubmit'); if (btn) btn.disabled = !st.ok;
}
async function submitDial() {
  if (S.busy) return;
  const st = dialState(); if (!st.ok) return;
  S.busy = true;
  const f = st.f;
  const left = st.parts.filter((p) => !p.on);
  const note = [(f.note || '').trim()].concat(left.map((p) => skipTok(p.code))).filter(Boolean).join(' ');
  const e = { id: newId(), ts: Date.now(), type: 'out', code: st.row.code, qty: st.q, date: f.date || today(), party: (f.used || '').trim() || 'Production', ref: (f.ref || '').trim(), note };
  S.queue.push(e); saveQueue();
  const online = navigator.onLine && S.url;
  const pop = { kind: 'out', title: 'Dial Out recorded', item: st.row.title, qty: '-' + num(e.qty) + ' dial' + (e.qty === 1 ? '' : 's'), now: left.length ? 'Without ' + left.map((p) => p.name).join(', ') : 'All parts for this size were taken out', status: online ? 'ok' : 'warn', msg: online ? 'Saving to Google Sheets in background' : 'Saved on this phone. It will sync when you are online.' };
  f.qty = 1; f.ref = ''; f.note = ''; f.skip = [];
  render();
  showPopup(pop);
  clearTimeout(popT);
  popT = setTimeout(closePopup, 1200);
  flushEntry(e.id, pop);
}
