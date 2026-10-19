/* state.js - App state, items and movements, talking to Google Sheets, sync. Part of ARTIME Stock; loaded by index.html in order. */
'use strict';
/* ================= state ================= */
const S = {
  url: store.get('url', '') || CFG.scriptUrl || '',
  items: store.get('items', []),
  history: store.get('history', []),
  queue: store.get('queue', []),
  failed: store.get('failed', []),
  synced: store.get('synced', null),
  loading: false, syncing: false, error: '',
  filter: { q: '', cat: 'all', status: 'all' },
  homeRange: 7, repRange: 7, repFrom: '', repTo: '', repType: 'all', repQ: '', repItem: '', dialSize: '', rangeHist: null, rangeBusy: '', rangeErr: '', reorderF: 'all', reopenMenu: false,
  form: {},
  sheet: null,
  busy: false,
  installEvt: null
};
window.store = store;
window.ARTIME_ic = (n, z) => ic(n, z);
window.ARTIME_toast = (m, b) => toast(m, b);
window.ARTIME_render = () => render();   // Settings uses it from an inline onchange
const saveQueue = () => { store.set('queue', S.queue); store.set('failed', S.failed); };

/* ================= data model ================= */
function parseName(name) {
  const m = /^(.*?)\s*\((Offline|Online)\)\s*$/i.exec(name || '');
  return m ? { base: m[1].trim(), variant: cap(m[2].toLowerCase()) } : { base: String(name || '').trim(), variant: null };
}

function items() {
  const pend = {};
  S.queue.forEach((e) => {
    pend[e.code] = (pend[e.code] || 0) + (e.type === 'in' ? 1 : -1) * Number(e.qty);
    if (e.type === 'out' && isDial(e.code)) { const sk = skippedOf(e.note); dialParts(e.code).filter((c) => !sk.includes(c)).forEach((c) => { pend[c] = (pend[c] || 0) - Number(e.qty); }); }
  });
  return S.items.map((r) => {
    const p = parseName(r.item);
    const d = pend[r.code] || 0;
    const eff = r.stock + d;
    const cat = isDial(r.code) ? 'dial' : r.cat || (CLOCK_ITEMS.includes(p.base) ? 'clock' : 'packing');
    const st = isDial(r.code) || (r.status === '-' && d === 0) ? 'none' : eff <= 0 ? 'out' : eff <= r.min ? 'low' : 'ok';
    const sz = sizeLabel(r.size);
    return Object.assign({}, r, p, { cat, pend: d, eff, st, sz, title: r.item + (sz ? ' - ' + sz : '') });
  });
}

function moves() {
  return S.queue.map((e) => Object.assign({}, e, { pending: true })).concat(S.history);
}
function sortMoves(list) {
  return list.slice().sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0) || String(b.id || '').localeCompare(String(a.id || '')) || (b.row || 0) - (a.row || 0));
}
function tsOf(e) {
  let ms = e.ts;
  if (!ms && e.id && /^e[0-9a-z]{8}/.test(e.id)) ms = parseInt(e.id.slice(1, 9), 36);
  if (!ms || ms < 1.5e12 || ms > 4.1e12) return '';
  const d = new Date(ms);
  if (iso(d) !== e.date) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
const when = (e) => { const t = tsOf(e); return dRel(e.date) + (t ? ', ' + t : ''); };

const ST = {
  out: { cls: 'out', label: 'Out of Stock' },
  low: { cls: 'low', label: 'Reorder Soon' },
  ok: { cls: 'ok', label: 'In Stock' },
  none: { cls: 'none', label: 'No Entries' }
};
const pill = (st, code) => {
  if (code && (st === 'low' || st === 'out')) {
    const r = reorderedFor(code);
    return r ? `<span class="pill rbtn done" role="button" data-r="${esc(code)}">Reordered ${num(r.qty)} · ${esc(dRel(r.date))}</span>`
             : `<span class="pill ${ST[st].cls} rbtn" role="button" data-r="${esc(code)}">Reorder</span>`;
  }
  return `<span class="pill ${ST[st].cls}">${ST[st].label}</span>`;
};

/* ================= API ================= */
async function apiGet() {
  const r = await fetch(S.url, { redirect: 'follow' });
  return r.json();
}
async function apiPost(body) {
  const r = await fetch(S.url, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
  return r.json();
}
function applyData(j) {
  if (Array.isArray(j.items)) { S.items = j.items; store.set('items', S.items); }
  if (Array.isArray(j.history)) { S.history = j.history; store.set('history', S.history); }
  if (Array.isArray(j.reorderSetup)) store.set('rsetup', j.reorderSetup);
  if (j.reorderMessage) store.set('rmsg', j.reorderMessage);
  if (Array.isArray(j.reorders)) store.set('rlog', j.reorders);
  S.synced = Date.now(); store.set('synced', S.synced);
  S.error = '';
}
const errText = (e) => {
  const m = String((e && e.message) || e || '');
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return navigator.onLine ? 'Could not reach Google Sheets. Check the link in More.' : 'You are offline.';
  if (/JSON|Unexpected token/i.test(m)) return 'The Google Sheets link did not answer correctly. Check it is deployed for "Anyone".';
  return m;
};

async function refresh(quiet) {
  if (!S.url || S.loading) return;
  if (S.queue.length || (store.get('rq', [])).length) { await sync(true); return; }
  S.loading = true;
  try { softRender(); } catch (e) { /* display problem must not block loading */ }
  try {
    const j = await apiGet();
    if (!j.ok) throw new Error(j.error || 'Sheet error');
    applyData(j);
  } catch (e) {
    S.error = errText(e);
    if (!quiet) toast(S.error, true);
  } finally { S.loading = false; try { softRender(); } catch (e) { /* ignore */ } }
}

async function sync(quiet) {
  if (S.syncing || (!S.queue.length && !(store.get('rq', [])).length) || !S.url) return;
  S.syncing = true; softRender();
  const batch = S.queue.slice();
  let okRun = false;
  try {
    const j = await apiPost({ v: 2, reorders: store.get('rq', []), entries: batch.map(({ id, type, code, qty, date, party, ref, note }) => ({ id, type, code, qty, date, party, ref, note, by: store.get('by', '') || '-' })) });
    if (!j.ok) throw new Error(j.error || 'Sheet error');
    const res = {};
    (j.results || []).forEach((r) => { res[r.id] = r; });
    const rdone = new Set((j.reorderResults || []).filter((r) => r.status !== undefined).map((r) => r.id));
    if (rdone.size) store.set('rq', store.get('rq', []).filter((r) => !rdone.has(r.id)));
    const done = new Set();
    batch.forEach((e) => {
      const r = res[e.id];
      if (!r) return;
      if (r.status === 'ok' || r.status === 'dup') done.add(e.id);
      else if (r.status === 'error') { done.add(e.id); S.failed.push(Object.assign({}, e, { msg: r.msg })); }
    });
    S.queue = S.queue.filter((e) => !done.has(e.id));
    saveQueue();
    applyData(j);
    okRun = true;
  } catch (e) {
    S.error = errText(e);
    if (!quiet) toast('Saved on this phone. ' + S.error, true);
  } finally {
    S.syncing = false; softRender();
    if (okRun && S.queue.length) setTimeout(() => sync(true), 0);   // entries added while this sync was running
  }
}
