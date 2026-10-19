/* events.js - Taps, typing, keys and other events. Part of ARTIME Stock; loaded by index.html in order. */
'use strict';
/* ================= events ================= */
document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act, v = el.dataset.v;
  const r = route(); const type = r.name;
  switch (act) {
    case 'sync': S.queue.length ? sync() : refresh(); break;
    case 'refresh': refresh(); break;
    case 'lang': store.set('lang', v === 'hi' ? 'hi' : 'en'); document.documentElement.lang = lang(); render(); break;
    case 'add': S.sheet = { type: 'add' }; renderSheet(); break;
    case 'setv': { const k = el.dataset.k; store.set(k, v); if (k === 'theme') applyTheme(); render(); break; }
    case 'tog': { const k = el.dataset.k; store.set(k, !store.get(k, el.dataset.d === '1')); render(); break; }
    case 'togmanage': S.manage = !S.manage; render(); break;
    case 'saveprofile': {
      const pn = $('#pname'), old = who(), m = store.get('avatars', {}) || {};
      if (pn && !pn.readOnly) { const n = pn.value.trim(); store.set('by', n); if (n && old !== n && m[old] !== undefined) { m[n] = m[old]; store.set('avatars', m); } }
      toast('Profile saved'); S.reopenMenu = true; location.hash = '#/home'; break;
    }
    case 'dialdetail': openDialDetail(el.dataset.id); break;
    case 'editmv': openEditMove(el.dataset.id, el.dataset.t); break;
    case 'upcheck': checkUpdate(); break;
    case 'upforce': hardRefresh(); break;
    case 'payadd': S.sheet = { type: 'payadd' }; renderSheet(); break;
    case 'avatar': { const pn = $('#pname'); if (pn && !pn.readOnly && pn.value.trim()) store.set('by', pn.value.trim()); const m = store.get('avatars', {}) || {}, k = who() || '_'; if (v === '-1') delete m[k]; else m[k] = Number(v); store.set('avatars', m); render(); break; }
    case 'menu': S.sheet = { type: 'menu' }; renderSheet(); break;
    case 'close': if (ev.target === el) { S.sheet = null; renderSheet(); } break;
    case 'open-item': S.sheet = { type: 'item', code: el.dataset.code }; renderSheet(); break;
    case 'go-more': location.hash = '#/set-sheets'; break;
    case 'menuback': S.reopenMenu = true; break;
    case 'fc': S.filter.cat = v; render(); break;
    case 'fs': S.filter.status = v; render(); break;
    case 'rrange': S.repRange = Number(v); render(); break;
    case 'rtype': S.repType = v; render(); break;
    case 'repshare': window.open('https://wa.me/?text=' + encodeURIComponent(repSummaryText()), '_blank'); break;
    case 'repcsv': { const { nm, list } = repFiltered(); downloadCSV('stock-report.csv', [['Date', 'Type', 'Item', 'Code', 'Quantity', 'Supplier / Used for', 'Reference', 'Note', 'By']].concat(list.map((e) => [e.date, isDial(e.code) ? 'Dial Out' : e.type === 'in' ? 'Stock In' : 'Stock Out', nm[e.code] || e.code, e.code, e.qty, e.party || '', e.ref || '', e.note || '', e.by || '']))); break; }
    case 'fcat': ensureForm(type).cat = v; render(); break;
    case 'fsize': ensureForm(type).size = v; render(); break;
    case 'dpart': { const f = ensureForm('dial'); const i = Number(v);
      if (i === PAPER_IDX.H || i === PAPER_IDX.R) f.paper = i === PAPER_IDX.H ? 'H' : 'R';   // exactly one paper is always selected
      else f.skip = f.skip.includes(i) ? f.skip.filter((x) => x !== i) : f.skip.concat(i);
      updateDial(); break; }
    case 'dall': { const f = ensureForm('dial'); const anyOff = dialState().parts.some((p) => !p.on && p.i !== PAPER_IDX.H && p.i !== PAPER_IDX.R);
      if (anyOff) f.skip = []; else f.skip = DIAL_PART_NAMES.map((_, i) => i).filter((i) => i !== PAPER_IDX.H && i !== PAPER_IDX.R);
      updateDial(); break; }
    case 'dsize': ensureForm('dial').dcode = v; render(); break;
    case 'fvar': ensureForm(type).variant = v; render(); break;
    case 'qplus': case 'qminus': {
      const f = ensureForm(type); const n = Number(f.qty) || 0;
      f.qty = Math.max(0, n + (act === 'qplus' ? 1 : -1));
      const i = $('#qty'); if (i) i.value = f.qty; updateFormDynamic(); break;
    }
    case 'pick': { const i = $('#date'); if (i && i.showPicker) { try { i.showPicker(); } catch (e) { /* not supported */ } } break; }
    case 'submit': if (type === 'dial') submitDial(); else submitForm(type); break;
    case 'pop-ok': closePopup(); break;
    case 'save-url': {
      const val = ($('#url').value || '').trim();
      if (!/^https:\/\/script\.google\.com\/.+\/exec/.test(val)) { toast('That does not look like a Web app link ending in /exec.', true); break; }
      S.url = val; store.set('url', val); S.error = ''; toast('Link saved'); refresh(); break;
    }
    case 'reset-url': S.url = CFG.scriptUrl; store.set('url', S.url); render(); refresh(); break;
    case 'discard': S.queue = S.queue.filter((e) => e.id !== el.dataset.id); saveQueue(); render(); break;
    case 'discard-failed': S.failed = S.failed.filter((e) => e.id !== el.dataset.id); saveQueue(); render(); break;
    case 'install': if (S.installEvt) { S.installEvt.prompt(); S.installEvt = null; render(); } break;
    default: break;
  }
});
document.addEventListener('input', (ev) => {
  const el = ev.target.closest('[data-bind]'); if (!el) return;
  const k = el.dataset.bind, r = route(), type = r.name;
  if (k === 'q') { S.filter.q = el.value; renderItemList(); return; }
  if (k === 'rq') { S.repQ = el.value; const l = $('#replist'); if (l) { l.innerHTML = repListHTML(); const n = $('#repcnt'); if (n) n.textContent = repFiltered().list.length; } return; }
  if (k === 'url') return;
  if (!isFormRoute(type)) return;
  const f = ensureForm(type);
  if (k === 'qty') { f.qty = el.value; updateFormDynamic(); }
  else if (k === 'date') { f.date = el.value || today(); const v = $('.datef .val'); if (v) v.textContent = dLong(f.date); }
  else if (k === 'party' || k === 'ref' || k === 'note' || k === 'used') f[k] = el.value;
});
document.addEventListener('change', (ev) => {
  const el = ev.target.closest('[data-bind]'); if (!el) return;
  const k = el.dataset.bind, r = route(), type = r.name;
  if (k === 'base') { const f = ensureForm(type); f.base = el.value; f.size = null; f.variant = null; render(); }
  else if (k === 'homeRange') { S.homeRange = Number(el.value); render(); }
  else if (k === 'cat') { S.filter.cat = el.value; render(); }
  else if (k === 'repItem') { S.repItem = el.value; render(); }
  else if (k === 'repRange') {
    if (el.value === 'custom') { S.repRange = 'custom'; if (!S.repFrom) S.repFrom = ago(29); if (!S.repTo) S.repTo = today(); loadRange(); } else S.repRange = Number(el.value);
    render();
  }
  else if (k === 'repFrom' || k === 'repTo') { if (el.value) { S[k] = el.value; loadRange(); render(); } }
  else if (k === 'dialSize') { S.dialSize = el.value; render(); }
});
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && S.sheet) { S.sheet = null; renderSheet(); } });
window.addEventListener('hashchange', onRoute);
window.addEventListener('online', () => { if (S.queue.length) sync(true); else refresh(true); });
window.addEventListener('offline', () => softRender());
let lastVis = 0;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && Date.now() - lastVis > 30000) { lastVis = Date.now(); S.queue.length ? sync(true) : refresh(true); }
});
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); S.installEvt = e; if (['more', 'home'].includes(route().name)) render(); });
window.addEventListener('appinstalled', () => { S.installEvt = null; toast('App installed'); });
