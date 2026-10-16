/* Payments module: a normal page inside the app (#/pay). Own storage, own queue, own backend link.
   Loaded only when used, so it can never slow or break stock. Each entry is Cash or Bank. */
(function () {
  'use strict';
  const K = 'artime.money.';
  const g = (k, d) => { try { const v = localStorage.getItem(K + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const s = (k, v) => { try { localStorage.setItem(K + k, JSON.stringify(v)); } catch (e) { /* full */ } };
  const esc = (x) => String(x == null ? '' : x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rs = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const M = { user: (() => { const u = g('user', null); return u && u.name ? u : null; })(), q: g('q', []), failed: g('failed', []), hist: g('hist', []), msg: '', type: 'in', mode: g('mode', 'cash') === 'bank' ? 'bank' : 'cash', bank: g('bank', ''),
    view: 'entry', range: '7', pin: g('pin', null), rep: g('rep', null), repBusy: false, repErr: '' };
  const dev = g('dev', null) || (() => { const d = 'd' + Math.random().toString(36).slice(2, 10); s('dev', d); return d; })();
  const url = () => g('url', '') || (window.APP_CONFIG && APP_CONFIG.moneyUrl) || '';
  const keep = () => { s('q', M.q); s('failed', M.failed); s('hist', M.hist); s('user', M.user); s('pin', M.pin); };
  const today = () => new Date().toLocaleDateString('en-CA');
  const $ = (q) => document.querySelector(q);
  const ic = (n, z) => (window.ARTIME_ic ? window.ARTIME_ic(n, z || 22) : '');
  const toast = (m, bad) => { try { if (window.ARTIME_toast) window.ARTIME_toast(m, bad); } catch (e) { /* ignore */ } };
  const banks = () => String((M.user && M.user.bank) || '').split(/[,;/|]/).map((x) => x.trim()).filter((x) => x && x.toLowerCase() !== 'cash');

  async function post(body, u) {                       // never hangs, never throws
    const c = new AbortController(), t = setTimeout(() => c.abort(), 20000);
    try {
      const r = await fetch(u || url(), { method: 'POST', body: JSON.stringify(body), signal: c.signal });
      try { return JSON.parse(await r.text()); } catch (e) { return { ok: false, error: 'The Payments link did not answer correctly. Use the link ending in /exec, deployed for Anyone.' }; }
    } catch (e) { return { ok: false, net: true }; } finally { clearTimeout(t); }
  }

  let syncing = false, rt;
  const later = (ms) => { clearTimeout(rt); rt = setTimeout(sync, ms); };
  async function sync() {
    if (syncing || !M.user || !url()) return;
    const mine = M.q.filter((e) => e.u === M.user.name);     // each person's queue is separate
    if (!mine.length) { ui(); return; }
    syncing = true; ui();
    try {
      const j = await post({ action: 'save', user: M.user.name, dev, entries: mine });
      if (j.busy) later(1500 + Math.random() * 2500);          // lock busy: not an error, just retry
      else if (j.ok && j.results) {
        const r = {}; j.results.forEach((x) => { r[x.id] = x; });
        mine.forEach((e) => {
          const x = r[e.id]; if (!x) return;
          if (x.s === 'ok' || x.s === 'dup' || x.s === 'held') { M.q = M.q.filter((y) => y.id !== e.id); M.hist.unshift(Object.assign({}, e, { held: x.s === 'held' })); }
          else if (x.s === 'bad') { M.q = M.q.filter((y) => y.id !== e.id); M.failed.push(Object.assign({}, e, { why: x.why || 'Rejected' })); }
        });
        M.hist = M.hist.slice(0, 15);
        if (M.q.some((e) => e.u === M.user.name)) later(4000);
      } else later(j.net ? 8000 + Math.random() * 4000 : 15000);   // unknown reply: keep entries, never fail them
    } catch (e) { later(15000); } finally { syncing = false; keep(); ui(); }
  }

  function ui() {                                           // refresh only the status list, never the form being typed in
    const el = $('#m-list'); if (!el) return;
    try {
      const me = M.user && M.user.name;
      const mine = M.q.filter((e) => e.u === me);
      const row = (e, tag) => `<div class="pmrow"><span class="pmi ${e.type}">${e.type === 'in' ? '+' : '−'}</span>
        <div class="pmm"><b>${rs(e.amount)}</b><small>${esc(e.bank || 'Cash')}${e.party ? ' · ' + esc(e.party) : e.note ? ' · ' + esc(e.note) : ''}</small></div>${tag}</div>`;
      el.innerHTML = `<div class="card group"><h2>${mine.length ? mine.length + ' waiting to sync' : 'All synced ✓'}</h2>
        ${mine.map((e) => row(e, '<span class="pmtag w">waiting</span>')).join('')}
        ${M.hist.slice(0, 8).map((e) => row(e, `<span class="pmtag">${e.held ? 'held' : 'saved'}</span>`)).join('')}
        <div class="btns"><button class="btn ghost" data-m="syncnow">${syncing ? 'Syncing…' : 'Sync now'}</button></div></div>
        ${M.failed.length ? `<div class="card group"><h2 class="r">${M.failed.length} could not be saved</h2>${M.failed.map((e) => `<div class="pmrow"><div class="pmm"><b>${rs(e.amount)}</b><small class="r">${esc(e.why)}</small></div><span><button class="btn ghost" data-m="retry" data-id="${esc(e.id)}">Retry</button> <button class="btn danger" data-m="del" data-id="${esc(e.id)}">Delete</button></span></div>`).join('')}</div>` : ''}`;
    } catch (e) { /* a display problem must never stop saving */ }
  }

  const say = (m) => { M.msg = m; const el = $('#m-msg'); if (el) el.textContent = m; };

  function draw() {
    const el = $('#money'); if (!el) return;
    try {
      if (!url()) { el.innerHTML = '<div class="card group"><h2>No payments sheet link yet</h2><p>Add the Payments Google Sheet link in Settings.</p><div class="btns"><a class="btn" href="#/more">Open Settings</a></div></div>'; return; }
      if (!M.user) {
        el.innerHTML = `<div class="form pay"><div class="card group"><h2>Enter your PIN</h2><p>Only the first time on this phone.</p>
          <div class="field"><input id="mpin" type="password" inputmode="numeric" enterkeyhint="go" autocomplete="off" placeholder="PIN"></div>
          <div class="hint bad">${esc(M.msg)}</div><div class="btns"><button class="btn" style="background:var(--green)" data-m="pin">Continue</button></div></div></div>`;
        return;
      }
      const bl = banks();
      if (!M.bank && bl[0]) M.bank = bl[0];
      const t = (v) => (M.type === v ? 'on' : ''), m = (v) => (M.mode === v ? 'on' : '');
      el.innerHTML = `<div class="form pay">
        <div class="pmwho"><span>Logged in as <b>${esc(M.user.name)}</b></span><button data-m="logout">Log out</button></div>
        <div class="tabs"><button class="tab ${M.view === 'entry' ? 'on' : ''}" data-m="view" data-v="entry">${ic('plus')}New entry</button><button class="tab ${M.view === 'report' ? 'on' : ''}" data-m="view" data-v="report">${ic('chart')}Report</button></div>
        <div id="m-entry" style="display:${M.view === 'entry' ? 'block' : 'none'}">
        <div class="tabs" style="margin-top:14px"><button class="tab rcv ${t('in')}" data-m="type" data-v="in">${ic('down')}Received</button><button class="tab pd ${t('out')}" data-m="type" data-v="out">${ic('up')}Paid</button></div>
        <label class="fl" for="m-amt">Amount<i>*</i></label>
        <div class="field"><b class="rup">₹</b><input id="m-amt" inputmode="decimal" placeholder="0" autocomplete="off"></div>
        <div class="fl">Cash or bank<i>*</i></div>
        <div class="tabs"><button class="tab md ${m('cash')}" data-m="mode" data-v="cash">${ic('cash')}Cash</button><button class="tab md ${m('bank')}" data-m="mode" data-v="bank">${ic('bank')}Bank</button></div>
        <div id="m-bankbox" style="display:${M.mode === 'bank' ? 'block' : 'none'}">
          <label class="fl" for="m-bank">Which bank<i>*</i></label>
          ${bl.length ? `<div class="sizes">${bl.map((b) => `<button class="size ${b === M.bank ? 'on' : ''}" data-m="bank" data-v="${esc(b)}">${esc(b)}</button>`).join('')}</div>` : ''}
          <div class="field"${bl.length ? ' style="margin-top:8px"' : ''}>${ic('bank', 20)}<input id="m-bank" placeholder="Bank name" value="${esc(M.bank)}" autocomplete="off"></div>
        </div>
        <label class="fl" for="m-party">Party / name</label>
        <div class="field">${ic('truck', 20)}<input id="m-party" placeholder="Who paid or who was paid" autocomplete="off"></div>
        <label class="fl" for="m-note">Note <small>(optional)</small></label>
        <div class="field">${ic('pencil', 20)}<input id="m-note" placeholder="Add note..." autocomplete="off"></div>
        <label class="fl" for="m-date">Date</label>
        <div class="field">${ic('cal', 20)}<input id="m-date" type="date" value="${today()}"></div>
        <div class="hint bad" id="m-msg">${esc(M.msg)}</div>
        <button class="submit ${M.type === 'out' ? 'out' : ''}" id="m-submit" data-m="save"><span id="m-sl">${M.type === 'in' ? 'Save Received' : 'Save Paid'}</span></button>
      <div id="m-list"></div></div>
      <div id="m-rep" style="display:${M.view === 'report' ? 'block' : 'none'}"></div></div>`;
      ui(); drawReport(); if (M.view === 'report') loadReport();
    } catch (e) { el.innerHTML = '<div class="card group"><h2 class="r">Payments had a problem</h2><div class="btns"><button class="btn" data-m="mount">Retry</button></div></div>'; }
  }

  /* ---------- Report (read back from the Cash Book) ---------- */
  const RANGES = [['today', 'Today'], ['7', '7 Days'], ['30', '30 Days'], ['month', 'This month']];
  const loc = () => { try { return JSON.parse(localStorage.getItem('artime.lang')) === 'hi' ? 'hi-IN' : 'en-GB'; } catch (e) { return 'en-GB'; } };
  const dShort = (d) => new Date(d + 'T12:00:00').toLocaleDateString(loc(), { day: 'numeric', month: 'short' });
  const dRel = (d) => (d === today() ? 'Today' : dShort(d));
  function inRange(d) {
    const t = today();
    if (M.range === 'today') return d === t;
    if (M.range === 'month') return d.slice(0, 7) === t.slice(0, 7);
    const f = new Date(); f.setDate(f.getDate() - (Number(M.range) - 1));
    return d >= f.toLocaleDateString('en-CA');
  }
  async function loadReport() {
    if (!M.user || !url() || M.repBusy) return;
    if (!M.pin) { drawReport(); return; }
    M.repBusy = true; M.repErr = ''; drawReport();
    const j = await post({ action: 'report', pin: M.pin, dev });
    M.repBusy = false;
    if (j.ok && Array.isArray(j.rows)) { M.rep = j; s('rep', j); }
    else if (j.net) M.repErr = 'No connection. Showing the last saved report.';
    else if (j.error === 'Unknown action') M.repErr = 'The Payments script is an old version. Paste the new MoneyScript.gs, then Deploy > Manage deployments > New version.';
    else { M.repErr = j.error || 'Could not load the report.'; if (/PIN/i.test(M.repErr)) { M.pin = null; keep(); } }
    drawReport();
  }
  function drawReport() {
    const el = $('#m-rep'); if (!el || !M.user) return;
    try {
      const waiting = M.q.filter((e) => e.u === M.user.name).length;
      const chips = `<div class="chips" style="margin-top:14px">${RANGES.map((r) => `<button class="chip ${M.range === r[0] ? 'on' : ''}" data-m="range" data-v="${r[0]}">${r[1]}</button>`).join('')}</div>`;
      if (!M.pin) {
        el.innerHTML = `<div class="card group" style="margin-top:14px"><h2>Enter your PIN to see reports</h2><p>Asked once, so the report can be read safely from the sheet.</p>
          <div class="field"><input id="m-rpin" type="password" inputmode="numeric" enterkeyhint="go" autocomplete="off" placeholder="PIN"></div>
          <div class="hint bad">${esc(M.repErr)}</div><div class="btns"><button class="btn" style="background:var(--green)" data-m="repin">Show report</button></div></div>`;
        return;
      }
      const R = M.rep && M.rep.user === M.user.name ? M.rep : null;
      const bar = `<div class="pmbar"><span>${R ? (R.scope === 'all' ? 'Everyone\'s entries' : 'Your entries') + ' · updated ' + new Date(R.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}</span><button data-m="reload">${M.repBusy ? 'Loading…' : 'Refresh'}</button></div>`;
      const msg = (M.repErr ? `<div class="banner bad" style="margin-top:10px">${esc(M.repErr)}</div>` : '') + (waiting ? `<div class="banner" style="margin-top:10px">${waiting} ${waiting === 1 ? 'entry is' : 'entries are'} still waiting to sync and not in this report yet.</div>` : '');
      if (!R) { el.innerHTML = chips + bar + msg + `<div class="card empty" style="margin-top:12px"><b>${M.repBusy ? 'Loading report…' : 'No report yet'}</b>${M.repBusy ? '' : 'Tap Refresh to load it from the sheet.'}</div>`; return; }
      const rows = R.rows.filter((r) => inRange(r[0]));
      let tin = 0, tout = 0; const acc = {};
      rows.forEach((r) => { const a = acc[r[4]] || (acc[r[4]] = { in: 0, out: 0 }); a[r[1]] += r[2]; if (r[1] === 'in') tin += r[2]; else tout += r[2]; });
      Object.keys(R.totals || {}).forEach((k) => { if (!acc[k]) acc[k] = { in: 0, out: 0 }; });
      const names = Object.keys(acc).sort((x, y) => (x === 'Cash' ? -1 : y === 'Cash' ? 1 : x.localeCompare(y)));
      const bal = tin - tout;
      const summary = `<div class="pmsum"><div class="g"><small>Received</small><b>${rs(tin)}</b></div><div class="r"><small>Paid</small><b>${rs(tout)}</b></div><div class="${bal < 0 ? 'r' : 'g'}"><small>Balance</small><b>${bal < 0 ? '−' : ''}${rs(Math.abs(bal))}</b></div></div>`;
      const accHTML = names.length ? `<div class="card group" style="margin-top:12px"><h2>Cash and banks</h2><p>Received and paid in this period. Right side = balance now (all time).</p>${names.map((n) => {
        const tt = (R.totals && R.totals[n]) || { in: 0, out: 0 }, nb = tt.in - tt.out;
        return `<div class="pmrow"><span class="pmi ${n === 'Cash' ? 'in' : 'md'}">${ic(n === 'Cash' ? 'cash' : 'bank', 18)}</span><div class="pmm"><b>${esc(n)}</b><small><span class="g">+${rs(acc[n].in)}</span> &nbsp; <span class="r">−${rs(acc[n].out)}</span></small></div><div class="pmbal ${nb < 0 ? 'r' : ''}"><small>Balance now</small><b>${nb < 0 ? '−' : ''}${rs(Math.abs(nb))}</b></div></div>`; }).join('')}</div>` : '';
      let list = '', last = '';
      rows.slice(0, 150).forEach((r) => {
        if (r[0] !== last) { last = r[0]; list += `<div class="daygroup">${esc(dRel(r[0]))}</div>`; }
        list += `<div class="pmrow" style="padding:10px 16px"><span class="pmi ${r[1]}">${r[1] === 'in' ? '+' : '−'}</span><div class="pmm"><b class="${r[1] === 'in' ? 'g' : 'r'}">${rs(r[2])}</b><small>${esc(r[4])}${r[3] ? ' · ' + esc(r[3]) : ''}${R.scope === 'all' && r[6] ? ' · by ' + esc(r[6]) : ''}${r[5] ? ' · ' + esc(r[5]) : ''}</small></div></div>`;
      });
      el.innerHTML = chips + bar + msg + summary + accHTML + `<div class="card sec" style="margin-top:12px;overflow:hidden"><div class="sec-h" style="padding:14px 16px 4px"><h2>Entries</h2></div>${rows.length ? list : '<div class="empty"><b>No entries</b>Nothing recorded in this period.</div>'}</div>`;
    } catch (e) { el.innerHTML = '<div class="card empty"><b>Report could not be shown</b></div>'; }
  }

  function flip(sel, val) { document.querySelectorAll(sel).forEach((b) => b.classList.toggle('on', b.dataset.v === val)); }

  const act = (a, b) => {
    try {
      if (a === 'open') { location.hash = '#/pay'; }
      else if (a === 'view') {
        M.view = b.dataset.v; flip('#money [data-m="view"]', M.view);
        const e1 = $('#m-entry'), e2 = $('#m-rep');
        if (e1) e1.style.display = M.view === 'entry' ? 'block' : 'none'; if (e2) e2.style.display = M.view === 'report' ? 'block' : 'none';
        if (M.view === 'report') { drawReport(); loadReport(); }
      } else if (a === 'range') { M.range = b.dataset.v; drawReport(); }
      else if (a === 'reload') loadReport();
      else if (a === 'repin') {
        const pin = String(($('#m-rpin') || {}).value || '').trim(); if (!pin) return;
        M.repErr = 'Checking…'; drawReport();
        post({ action: 'login', pin, dev }).then((j) => {
          if (j.ok && j.name === (M.user && M.user.name)) { M.pin = pin; M.repErr = ''; keep(); loadReport(); }
          else { M.repErr = j.net ? 'No connection. Try again.' : (j.ok ? 'That PIN belongs to someone else.' : (j.error || 'Wrong PIN')); drawReport(); }
        });
      } else if (a === 'mount') { M.msg = ''; draw(); sync(); }
      else if (a === 'close') { location.hash = '#/home'; }
      else if (a === 'type') {                              // switch in place, so typed text is never lost
        M.type = b.dataset.v; flip('#money [data-m="type"]', M.type);
        const sb = $('#m-submit'), sl = $('#m-sl');
        if (sb) sb.classList.toggle('out', M.type === 'out'); if (sl) sl.textContent = M.type === 'in' ? 'Save Received' : 'Save Paid';
      } else if (a === 'mode') {
        M.mode = b.dataset.v; s('mode', M.mode); flip('#money [data-m="mode"]', M.mode);
        const bx = $('#m-bankbox'); if (bx) bx.style.display = M.mode === 'bank' ? 'block' : 'none';
        say('');
      } else if (a === 'bank') {
        M.bank = b.dataset.v; s('bank', M.bank); const i = $('#m-bank'); if (i) i.value = M.bank; flip('#money [data-m="bank"]', M.bank);
      } else if (a === 'syncnow') sync();
      else if (a === 'pin') {
        const pin = ($('#mpin') || {}).value; if (!pin) return; M.msg = 'Checking…'; draw();
        post({ action: 'login', pin, dev }).then((j) => {
          if (j.ok && !j.name) { M.msg = 'This PIN has no name in the Users tab. Type the name in the Name column.'; }
          else if (j.ok) { M.user = { name: j.name, bank: j.bank || '', admin: !!j.admin }; M.pin = pin; M.msg = ''; keep(); toast('Welcome ' + j.name); try { window.store.set('by', j.name); } catch (e) { /* ignore */ } sync(); if (window.ARTIME_render) setTimeout(window.ARTIME_render, 0); }
          else M.msg = j.net ? 'No connection. Try again.' : (j.error || 'Wrong PIN');
          draw();
        });
      } else if (a === 'save') {
        const amt = parseFloat(String(($('#m-amt') || {}).value || '').replace(/,/g, ''));
        if (!(amt > 0)) { say('Enter an amount'); return; }
        let bank = 'Cash';
        if (M.mode === 'bank') {
          bank = String(($('#m-bank') || {}).value || '').trim();
          if (!bank) { say('Choose or type the bank'); return; }
          M.bank = bank; s('bank', bank);
        }
        const val = (id) => String(($(id) || {}).value || '').trim();
        M.q.push({ id: 'M' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), u: M.user.name, type: M.type, mode: M.mode, amount: amt, party: val('#m-party'), bank, note: val('#m-note'), date: val('#m-date') || today() });
        ['#m-amt', '#m-party', '#m-note'].forEach((id) => { const i = $(id); if (i) i.value = ''; });
        say(''); keep(); ui(); toast('Saved on this phone'); sync();          // saved on the phone first, uploaded in the background
      } else if (a === 'retry') { const e = M.failed.find((x) => x.id === b.dataset.id); if (e) { M.failed = M.failed.filter((x) => x !== e); delete e.why; M.q.push(e); keep(); ui(); sync(); } }
      else if (a === 'del') { M.failed = M.failed.filter((x) => x.id !== b.dataset.id); keep(); ui(); }
      else if (a === 'logout') {
        const n = M.q.filter((e) => e.u === (M.user && M.user.name)).length;
        if (n && !confirm((window.ARTIME_tr || ((x) => x))(n + ' entries have not synced yet. They stay on this phone until you log in again. Log out?'))) return;
        M.user = null; M.pin = null; M.rep = null; s('rep', null); keep(); toast('Logged out'); draw(); if (window.ARTIME_render && !$('#money')) window.ARTIME_render();
      } else if (a === 'saveurl') {
        const v = ($('#murl') || {}).value.trim(); if (!/^https:\/\/script\.google\.com\//.test(v)) { toast('That does not look like a Google Apps Script link.', true); return; }
        post({ action: 'ping' }, v).then((j) => { if (j.ok) { s('url', v); toast('Connected ✓'); } else toast('Could not connect. Your old link is kept.', true); });
      }
    } catch (e) { toast('Something went wrong in Payments. Your saved entries are safe.', true); }
  };
  document.addEventListener('keydown', (ev) => { if (ev.key !== 'Enter' || !ev.target) return; if (ev.target.id === 'mpin') act('pin'); else if (ev.target.id === 'm-rpin') act('repin', ev.target); });
  document.addEventListener('input', (ev) => { if (ev.target && ev.target.id === 'm-bank') { M.bank = ev.target.value; flip('#money [data-m="bank"]', M.bank); } });
  window.addEventListener('online', () => later(500));
  window.Money = { act, boot: () => later(800), mount: () => { M.msg = ''; if (/[?&]v=report/.test(location.hash)) M.view = 'report'; draw(); sync(); } };
})();
