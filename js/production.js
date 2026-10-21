/* production.js - Production: material in stock, dials at production, ready dials, dials out. Part of ARTIME Stock; loaded by index.html in order.
   Flow: Stock In (parts) > Send to Production (type 'out' on a DIL code, parts leave stock) > Dial Ready (type 'in' on the DIL code) > Dial Out (type 'sold', its own sheet). */
'use strict';
const isOpening = (n) => /^\s*opening/i.test(String(n || ''));

/* numbers per dial size: what the sheet already knows (S.dials) + entries still waiting on this phone */
function prodRows() {
  const base = {}; (S.dials || []).forEach((d) => { base[d.code] = d; });
  const start = S.prodStart || '';
  const all = items(), byCode = {}; all.forEach((x) => { byCode[x.code] = x; });
  return all.filter((i) => isDial(i.code)).map((i) => {
    const b = base[i.code] || {};
    const r = { code: i.code, title: i.title, size: i.size, sent: Number(b.sent) || 0, ready: Number(b.ready) || 0, opening: Number(b.opening) || 0, sold: Number(b.sold) || 0 };
    S.queue.forEach((e) => {
      if (e.code !== i.code) return;
      const q = Number(e.qty) || 0;
      if (e.type === 'out') { if (!start || e.date >= start) r.sent += q; }
      else if (e.type === 'in') { r.ready += q; if (isOpening(e.note)) r.opening += q; }
      else if (e.type === 'sold') r.sold += q;
    });
    // material: how many dials the parts in stock can make (the scarcest part decides; Hindi or Roman paper, whichever has more)
    const ps = dialParts(i.code).map((c, k) => ({ k, it: byCode[c] })).filter((x) => x.it);
    const isP = (x) => x.k === PAPER_IDX.H || x.k === PAPER_IDX.R;
    const pap = ps.filter(isP).sort((a, b) => b.it.eff - a.it.eff)[0];
    const need = ps.filter((x) => !isP(x)).concat(pap ? [pap] : []);
    const low = need.length ? need.reduce((a, x) => (x.it.eff < a.it.eff ? x : a)) : null;
    r.make = low ? Math.max(0, Math.floor(low.it.eff)) : 0;
    r.limit = low ? (isP(low) ? 'PVC Paper' : DIAL_PART_NAMES[low.k]) : '';
    r.wip = r.sent - (r.ready - r.opening);      // sent to production and not back yet
    r.stock = r.ready - r.sold;                  // ready and not sold yet
    return r;
  });
}
const prodTotals = (rows) => rows.reduce((t, r) => ({ wip: t.wip + Math.max(0, r.wip), ready: t.ready + Math.max(0, r.stock), sold: t.sold + r.sold }), { wip: 0, ready: 0, sold: 0 });
const soldOn = (d) => moves().filter((e) => e.type === 'sold' && e.date === d).reduce((n, e) => n + (Number(e.qty) || 0), 0);

/* small card for Home */
function prodCard() {
  const rows = prodRows(); if (!rows.length) return '';
  const t = prodTotals(rows), c = (l, v, cls) => `<div style="flex:1;text-align:center"><small>${l}</small><b class="${cls}" style="display:block;font-size:24px">${num(v)}</b></div>`;
  return `<a class="card hm-sec" href="#/prod" style="display:block;color:inherit;text-decoration:none"><div class="hm-h"><h2>Production</h2><span class="link">Open ${ic('right', 16, 2.4)}</span></div>
    <div style="display:flex;gap:8px">${c('At production', t.wip, 'a')}${c('Ready dials', t.ready, 'g')}${c('Out today', soldOn(today()), 'r')}</div></a>`;
}

/* material list: every part by name, with its stock for each size (tap a size to open the item) */
function matList(its) {
  const parts = its.filter((i) => !isDial(i.code)), groups = {};
  parts.forEach((i) => { const k = i.cat + '|' + i.base + (i.variant ? ' (' + i.variant + ')' : ''); (groups[k] = groups[k] || { cat: i.cat, name: i.base + (i.variant ? ' (' + i.variant + ')' : ''), rows: [] }).rows.push(i); });
  const chip = (i) => `<button data-act="open-item" data-code="${esc(i.code)}" style="border:0;font:inherit;color:inherit;cursor:pointer;padding:5px 10px;border-radius:999px;background:var(--soft2)">${esc(sizeLabel(i.size) || 'All')} <b class="${i.st === 'out' ? 'r' : i.st === 'low' ? 'a' : ''}">${num(i.eff)}</b></button>`;
  const block = (cat) => {
    const gs = Object.keys(groups).map((k) => groups[k]).filter((g) => g.cat === cat);
    return gs.length ? `<div class="fl" style="margin:12px 0 2px">${esc(CAT_NAME[cat] || cat)}</div>` + gs.map((g) => `<div style="padding:9px 0;border-top:1px solid var(--soft2)"><b>${esc(g.name)}</b><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${g.rows.map(chip).join('')}</div></div>`).join('') : '';
  };
  const cats = uniq(parts.map((i) => i.cat)).sort((a, b) => (a === 'clock' ? -1 : b === 'clock' ? 1 : 0));
  return parts.length ? `<section class="card hm-sec"><div class="hm-h"><h2>Material in stock</h2><a class="link" href="#/items">All items ${ic('right', 16, 2.4)}</a></div>
    <div class="hint" style="margin:0">Red = out of stock, amber = running low.</div>${cats.map(block).join('')}</section>` : '';
}

/* Production screen */
function vProd() {
  if (!S.url) return `<div class="banner bad">No Google Sheets link yet. <button data-act="go-more">Add it in More</button></div>`;
  const its = items(), rows = prodRows(), t = prodTotals(rows);
  const parts = its.filter((i) => !isDial(i.code) && i.st !== 'none');
  const alertN = parts.filter((i) => i.st === 'out' || i.st === 'low').length;
  const nm = {}; its.forEach((i) => { nm[i.code] = i.title; });
  const tile = (cls, href, icon, label, val, sub) => `<a class="hm-st ${cls}" href="${href}"><span class="hm-ico">${ic(icon, 22, 2.2)}</span><span><small>${label}</small><b>${val}</b>${sub ? `<small>${sub}</small>` : ''}</span></a>`;
  const grid = `<section class="card hm-sec"><div class="hm-grid">
      ${tile('blue', '#/items', 'cube', 'Material in stock', num(parts.length) + ' items', alertN ? alertN + ' to reorder' : 'All fine')}
      ${tile('amber', '#/prod', 'gear', 'At production', num(t.wip), 'dials')}
      ${tile('green', '#/prod', 'check', 'Ready dials', num(t.ready), 'in stock')}
      ${tile('red', '#/reports', 'down', 'Dials out', num(t.sold), 'today ' + num(soldOn(today())))}
    </div></section>`;
  const cell = 'display:grid;grid-template-columns:.9fr 1.1fr 1fr 1fr 1fr;gap:4px;padding:9px 0;align-items:center;text-align:center';
  const table = rows.length ? `<section class="card hm-sec"><div class="hm-h"><h2>By dial size</h2></div>
      <div class="hint" style="margin:0 0 6px">Material = dials your parts in stock can make. The small name is the part that runs out first.</div>
      <div style="${cell};font-size:12px;opacity:.7;padding-top:0"><span style="text-align:left">Size</span><span>Material (dials)</span><span>At production</span><span>Ready</span><span>Out (all)</span></div>
      ${rows.map((r) => `<div style="${cell};border-top:1px solid var(--soft2)"><b style="text-align:left">${esc(sizeLabel(r.size) || r.size)}</b><span><b class="${r.make > 0 ? '' : 'r'}">${num(r.make)}</b>${r.limit ? `<small style="display:block;font-size:10px;opacity:.7">${esc(r.limit)}</small>` : ''}</span><b class="${r.wip > 0 ? 'a' : ''}">${num(Math.max(0, r.wip))}</b><b class="${r.stock > 0 ? 'g' : ''}">${num(Math.max(0, r.stock))}</b><span>${num(r.sold)}</span></div>`).join('')}
    </section>` : `<div class="card empty"><b>No dial items yet</b>Sync first so the dial sizes load.</div>`;
  const act = `<div class="acts" style="margin:12px 0">
      <a class="bigact dial" href="#/dial">${ic('dial', 34, 2.2)}<span><b>Send to Production</b><small>Parts go out for making dials</small></span></a>
      <a class="bigact in" href="#/ready">${ic('check', 34, 2.2)}<span><b>Dial Ready</b><small>Finished dials came back</small></span></a>
      <a class="bigact out" href="#/sold">${ic('down', 34, 2.2)}<span><b>Dial Out</b><small>Ready dials sold or sent out</small></span></a></div>`;
  const recent = sortMoves(moves().filter((e) => isDial(e.code))).slice(0, 8);
  const rec = `<section class="card hm-sec"><div class="hm-h"><h2>Recent</h2></div>${recent.length ? recent.map((e) => actRow(e, nm)).join('') : '<div class="empty"><b>Nothing yet</b>Send dials to production to start.</div>'}</section>`;
  const note = S.prodStart ? `<div class="hint" style="margin:4px 4px 10px">Counting dials sent to production from ${esc(dLong(S.prodStart))}.</div>` : '';
  return `${act}${grid}${table}${note}${matList(its)}${rec}`;
}

/* Dial Ready / Dial Out forms */
function prodState(type) {
  const f = ensureForm(type), rows = prodRows();
  if (!rows.some((r) => r.code === f.dcode)) f.dcode = rows.length ? rows[0].code : null;
  const row = rows.find((r) => r.code === f.dcode) || null, q = Number(f.qty);
  const open = type === 'ready' && !!f.opening;
  const cap = !row ? 0 : type === 'ready' ? Math.max(0, row.wip) : Math.max(0, row.stock);
  let err = '';
  if (!row) err = 'Choose a dial size.';
  else if (!(q > 0)) err = 'Enter a quantity above 0.';
  else if (type === 'sold' && q > cap) err = cap > 0 ? `Only ${num(cap)} ready dial${cap === 1 ? '' : 's'} available.` : 'No ready dials of this size.';
  else if (type === 'ready' && !open && q > cap) err = cap > 0 ? `Only ${num(cap)} dial${cap === 1 ? ' is' : 's are'} at production. Tick "opening stock" if these were made earlier.` : 'Nothing is at production for this size. Tick "opening stock" if these were made earlier.';
  return { f, rows, row, q, cap, open, err, ok: !err };
}
function vProdForm(type) {
  const st = prodState(type), f = st.f, ready = type === 'ready';
  const who2 = uniq(S.history.filter((e) => e.type === 'sold' && e.party).map((e) => e.party)).slice(0, 40);
  return `<div class="form dial">
    <div class="fl">Dial size<i>*</i></div>
    <div class="sizes">${st.rows.map((d) => `<button class="size ${d.code === f.dcode ? 'on' : ''}" data-act="psize" data-v="${esc(d.code)}">${esc(sizeLabel(d.size) || d.size)}</button>`).join('') || '<div class="empty-card">No dial items loaded yet. Go back and sync first.</div>'}</div>
    <div id="fcard"></div>
    <label class="fl" for="qty">How many dials<i>*</i></label>
    <div class="qty"><button data-act="qminus" aria-label="Decrease">${ic('minus', 22, 2.2)}</button><input id="qty" type="number" inputmode="decimal" min="0" step="any" value="${esc(f.qty)}" data-bind="qty"><button data-act="qplus" aria-label="Increase">${ic('plus', 22, 2.2)}</button><span class="unit">Pcs</span></div>
    <div class="hint" id="qhint"></div>
    ${ready ? `<button class="part pick ${f.opening ? 'on' : 'off'}" data-act="popen" role="checkbox" aria-checked="${!!f.opening}" style="margin:6px 0"><span class="cb">${f.opening ? ic('check', 16, 3) : ''}</span><span class="pn">These dials were made earlier (opening stock)</span></button>` : ''}
    <div class="fl" style="margin-top:8px">Date<i>*</i></div>
    <div class="field datef" data-act="pick">${ic('cal', 22)}<span class="val">${esc(dLong(f.date))}</span>${ic('chev', 20)}<input id="date" type="date" value="${esc(f.date)}" data-bind="date" aria-label="Date"></div>
    <div class="pair">
      <div><label class="fl" for="used">${ready ? 'Received from' : 'Sold to / Order'}</label><div class="field">${ic(ready ? 'truck' : 'layers', 22)}<input id="used" list="dl-used" placeholder="${ready ? 'Production' : 'Customer or order'}" value="${esc(f.used)}" data-bind="used" autocomplete="off"><datalist id="dl-used">${who2.map((x) => `<option value="${esc(x)}">`).join('')}</datalist></div></div>
      <div><label class="fl" for="ref">Reference No.</label><div class="field">${ic('file', 22)}<input id="ref" placeholder="Voucher / Order No." value="${esc(f.ref)}" data-bind="ref" autocomplete="off"></div></div>
    </div>
    <label class="fl" for="note">Notes <small>(optional)</small></label>
    <div class="field">${ic('pencil', 20)}<input id="note" placeholder="Add notes..." value="${esc(f.note)}" data-bind="note" autocomplete="off"></div>
    <button class="submit" id="fsubmit" data-act="submit">${ic(ready ? 'up' : 'down', 24, 2.2)}<span>${ready ? 'Record Dial Ready' : 'Record Dial Out'}</span></button>
  </div>`;
}
function updateProdForm() {
  const type = route().name, st = prodState(type), card = $('#fcard'); if (!card) return;
  const r = st.row, ready = type === 'ready';
  card.innerHTML = r ? `<div class="pcard"><div class="head">${art('Dial', 76)}<div><b>${esc(r.code)}</b><small>${esc(r.title)}</small></div></div>
    <div class="nums"><div><small>At production</small><b class="a">${num(Math.max(0, r.wip))}</b><span>dials</span></div>
    <div><small>Ready</small><b class="g">${num(Math.max(0, r.stock))}</b><span>dials</span></div>
    <div><small>Out (all)</small><b class="u">${num(r.sold)}</b><span>dials</span></div></div></div>` : '';
  const hint = $('#qhint');
  if (hint) {
    if (st.err && st.q > 0) { hint.textContent = st.err; hint.className = 'hint bad'; }
    else if (r) { hint.textContent = ready ? (st.open ? 'Opening stock adds to ready dials only.' : `Up to ${num(st.cap)} dial${st.cap === 1 ? '' : 's'} can come back.`) : `Ready to go out: ${num(st.cap)} dial${st.cap === 1 ? '' : 's'}.`; hint.className = 'hint'; }
    else { hint.textContent = ''; hint.className = 'hint'; }
  }
  const btn = $('#fsubmit'); if (btn) btn.disabled = !st.ok;
}
async function submitProd(type) {
  if (S.busy) return;
  const st = prodState(type); if (!st.ok) return;
  S.busy = true;
  const f = st.f, ready = type === 'ready';
  const note = [st.open ? 'Opening stock' : '', (f.note || '').trim()].filter(Boolean).join(' ');
  const e = { id: newId(), ts: Date.now(), type: ready ? 'in' : 'sold', code: st.row.code, qty: st.q, date: f.date || today(), party: (f.used || '').trim() || (ready ? 'Production' : ''), ref: (f.ref || '').trim(), note };
  S.queue.push(e); saveQueue();
  const online = navigator.onLine && S.url;
  const pop = { kind: ready ? 'in' : 'out', title: ready ? 'Dial Ready recorded' : 'Dial Out recorded', item: st.row.title, qty: (ready ? '+' : '-') + num(e.qty) + ' dial' + (e.qty === 1 ? '' : 's'), now: '', status: online ? 'ok' : 'warn', msg: online ? 'Saving to Google Sheets in background' : 'Saved on this phone. It will sync when you are online.' };
  f.qty = 1; f.ref = ''; f.note = ''; f.opening = false;
  render();
  showPopup(pop);
  clearTimeout(popT);
  popT = setTimeout(closePopup, 1200);
  flushEntry(e.id, pop);
}
