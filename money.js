/* Payments module: a normal page inside the app (#/pay). Own storage, own queue, own backend link.
   Loaded only when used, so it can never slow or break stock. Each entry is Cash or Bank. */
(function () {
  'use strict';
  const K = 'artime.money.';
  const g = (k, d) => { try { const v = localStorage.getItem(K + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const s = (k, v) => { try { localStorage.setItem(K + k, JSON.stringify(v)); } catch (e) { /* full */ } };
  const esc = (x) => String(x == null ? '' : x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ag = (k, d) => { try { const v = localStorage.getItem('artime.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };   // settings made in the app
  const rs = (n) => '₹' + Number(n || 0).toLocaleString(ag('numfmt', 'in') === 'intl' ? 'en-US' : 'en-IN', { maximumFractionDigits: 2 });
  const M = { user: (() => { const u = g('user', null); return u && u.name ? u : null; })(), q: g('q', []), failed: g('failed', []), hist: g('hist', []), msg: '', type: g('type', 'in') === 'out' ? 'out' : 'in', mode: g('mode', 'cash') === 'bank' ? 'bank' : 'cash', bank: g('bank', ''),
    view: 'entry', range: '7', rtype: 'all', racct: 'all', rwho: 'all', rq: '', rfrom: '', rto: '', repC: null, repCBusy: '', repCErr: '', pin: g('pin', null), pinBuf: '', pinMode: 'login', rep: g('rep', null), repBusy: false, repErr: '' };
  const dev = g('dev', null) || (() => { const d = 'd' + Math.random().toString(36).slice(2, 10); s('dev', d); return d; })();
  const url = () => g('url', '') || (window.APP_CONFIG && APP_CONFIG.moneyUrl) || '';
  const keep = () => { s('q', M.q); s('failed', M.failed); s('hist', M.hist); s('user', M.user); s('pin', M.pin); };
  const today = () => new Date().toLocaleDateString('en-CA');
  const $ = (q) => document.querySelector(q);
  const ic = (n, z) => (window.ARTIME_ic ? window.ARTIME_ic(n, z || 22) : '');
  const toast = (m, bad) => { try { if (window.ARTIME_toast) window.ARTIME_toast(m, bad); } catch (e) { /* ignore */ } };
  const banks = () => String((M.user && M.user.bank) || '').split(/[,;/|]/).map((x) => x.trim()).filter((x) => x && x.toLowerCase() !== 'cash');

  const CLK = '<i class="clk"></i>';
  const idTime = (id) => { const n = parseInt(String(id || '').slice(1, 9), 36); return n > 1e12 ? n : 0; };        // phone-made ids carry their creation time
  const editLeft = (at, by) => (by && M.user && by === M.user.name && at && Date.now() - at < 30 * 60000 ? Math.max(1, Math.ceil((at + 30 * 60000 - Date.now()) / 60000)) : 0);
  const ebtn = (id, left) => `<button class="ebtn" data-m="pedit" data-id="${esc(id)}" aria-label="Change this entry">${ic('pencil', 16)}<small>${left} min</small></button>`;
  async function post(body, u) {                       // never hangs, never throws; says why it failed
    const c = new AbortController(), t = setTimeout(() => c.abort(), window.__MONEY_TMO || 15000);
    try {
      const r = await fetch(u || url(), { method: 'POST', body: JSON.stringify(body), signal: c.signal });
      if (r.ok === false) return { ok: false, error: 'The Payments link returned an error (HTTP ' + r.status + '). Check the deployment: Execute as Me, access Anyone.' };
      try { return JSON.parse(await r.text()); } catch (e) { return { ok: false, error: 'The Payments link did not answer correctly. Use the link ending in /exec, deployed for Anyone.' }; }
    } catch (e) { return { ok: false, net: true, why: c.signal.aborted ? 'no answer in 15 seconds' : String((e && e.message) || e) }; } finally { clearTimeout(t); }
  }
  const netMsg = (j) => 'No connection (' + (j.why || 'unknown') + '). Check the internet and the Payments link, then try again.';

  let syncing = false, rt;
  const later = (ms) => { clearTimeout(rt); rt = setTimeout(sync, ms); };
  async function sync() {
    if (syncing || !M.user || !url()) return;
    const mine = M.q.filter((e) => e.u === M.user.name);     // each person's queue is separate
    if (!mine.length) { ui(); return; }
    syncing = true; ui();
    try {
      const j = await post({ action: 'save', user: M.user.name, dev, entries: mine });
    if (j && typeof j.bank === 'string' && M.user && j.bank !== M.user.bank) { M.user.bank = j.bank; keep(); }
      if (j.busy) later(1500 + Math.random() * 2500);          // lock busy: not an error, just retry
      else if (j.ok && j.results) {
        const r = {}; j.results.forEach((x) => { r[x.id] = x; });
        mine.forEach((e) => {
          const x = r[e.id]; if (!x) return;
          if (x.s === 'ok' || x.s === 'dup' || x.s === 'held') { M.q = M.q.filter((y) => y.id !== e.id); M.hist.unshift(Object.assign({}, e, { held: x.s === 'held' })); }
          else if (x.s === 'bad') { M.q = M.q.filter((y) => y.id !== e.id); M.failed.push(Object.assign({}, e, { why: x.why || 'Rejected' })); }
        });
        M.hist = M.hist.slice(0, 15);
        if (mine.some((e) => r[e.id] && r[e.id].s !== 'bad')) setTimeout(() => { if ($('#paydash') || $('#m-rep')) loadReport(true); }, 800);
        if (M.q.some((e) => e.u === M.user.name)) later(4000);
      } else later(j.net ? 8000 + Math.random() * 4000 : 15000);   // unknown reply: keep entries, never fail them
    } catch (e) { later(15000); } finally { syncing = false; keep(); ui(); }
  }

  function ui() {                                           // refresh only the status list, never the form being typed in
    const el = $('#m-list'); if (!el) return;
    try {
      const me = M.user && M.user.name;
      const mine = M.q.filter((e) => e.u === me);
      const row = (e, tag, ed) => `<div class="pmrow"><span class="pmi ${e.type}">${e.type === 'in' ? '+' : '−'}</span>
        <div class="pmm"><b>${rs(e.amount)}</b><small>${esc(e.bank || 'Cash')}${e.party ? ' · ' + esc(e.party) : e.note ? ' · ' + esc(e.note) : ''} · by ${esc(e.u || me)}</small></div>${tag}${ed || ''}</div>`;
      el.innerHTML = `<div class="card group"><h2>${mine.length ? mine.length + ' waiting to sync' : 'All synced ✓'}</h2>
        ${mine.map((e) => row(e, '<span class="pmtag w">waiting</span>')).join('')}
        ${M.hist.slice(0, 8).map((e) => { const l = e.held ? 0 : editLeft((M.rep && (M.rep.rows.find((x) => x[7] === e.id) || [])[8]) || idTime(e.id), e.u); return row(e, `<span class="pmtag">${e.held ? 'held' : 'saved'}</span>`, l ? ebtn(e.id, l) : ''); }).join('')}
        <div class="btns"><button class="btn ghost" data-m="syncnow">${syncing ? CLK + 'Syncing…' : 'Sync now'}</button></div></div>
        ${M.failed.length ? `<div class="card group"><h2 class="r">${M.failed.length} could not be saved</h2>${M.failed.map((e) => `<div class="pmrow"><div class="pmm"><b>${rs(e.amount)}</b><small class="r">${esc(e.why)}</small></div><span><button class="btn ghost" data-m="retry" data-id="${esc(e.id)}">Retry</button> <button class="btn danger" data-m="del" data-id="${esc(e.id)}">Delete</button></span></div>`).join('')}</div>` : ''}`;
    } catch (e) { /* a display problem must never stop saving */ }
  }

  function findPay(id) {
    const r = M.rep && M.rep.rows.find((x) => x[7] === id);
    if (r) return { id, amount: r[2], party: r[3], bank: r[4], note: r[5], date: r[0], type: r[1], at: r[8], by: r[6] };
    const h = M.hist.find((e) => e.id === id);
    return h ? { id, amount: h.amount, party: h.party || '', bank: h.bank || 'Cash', note: h.note || '', date: h.date, type: h.type, at: idTime(id), by: h.u } : null;
  }
  function openPayEdit(id) {
    const e = findPay(id); if (!e) return;
    const left = editLeft(e.at, e.by); if (!left) { toast('The 30 minutes to change this entry are over', true); return; }
    const old = $('#pe'); if (old) old.remove();
    const el = document.createElement('div'); el.id = 'pe'; document.body.appendChild(el);
    const accts = ['Cash'].concat(banks()); if (!accts.includes(e.bank)) accts.push(e.bank);
    el.innerHTML = `<div class="rsb"><div class="rsc"><div class="grab"></div><h3>Change this entry</h3>
      <small>${e.type === 'in' ? 'Payment In' : 'Payment Out'} · by ${esc(e.by)} · you can change it for ${left} more min</small>
      <label>Amount</label><input id="pe-amt" inputmode="decimal" value="${esc(e.amount)}">
      <label>Cash or bank</label><div class="ddwrap"><select id="pe-bank">${accts.map((a) => `<option value="${esc(a)}"${a === e.bank ? ' selected' : ''}>${esc(a)}</option>`).join('')}</select></div>
      <label>Party / name</label><input id="pe-party" value="${esc(e.party)}">
      <label>Note</label><input id="pe-note" value="${esc(e.note)}">
      <label>Date</label><input id="pe-date" type="date" value="${esc(e.date)}">
      <div class="hint bad" id="pe-msg"></div>
      <button class="go" data-m="pesave" data-id="${esc(id)}">Save changes</button>
      <button class="rcancel dng" data-m="pedel" data-id="${esc(id)}">Delete entry</button>
      <button class="rcancel" data-m="peclose">Cancel</button></div></div>`;
    el.firstChild.addEventListener('click', (ev) => { if (ev.target === el.firstChild) el.remove(); });
  }
  async function payEditSend(id, del) {
    const msg = (t) => { const x = $('#pe-msg'); if (x) x.innerHTML = t; };
    if (!M.pin) { msg('Open the Report tab and enter your PIN once, then try again.'); return; }
    const v = (k) => String(($('#pe-' + k) || {}).value || '').trim();
    const body = del ? { action: 'edit', pin: M.pin, dev, id, void: true } : { action: 'edit', pin: M.pin, dev, id, amount: parseFloat(v('amt').replace(/,/g, '')), bank: v('bank'), party: v('party'), note: v('note'), date: v('date') };
    if (!del && !(body.amount > 0)) { msg('Enter an amount'); return; }
    msg(CLK + 'Saving…');
    const j = await post(body);
    if (j.ok) {
      const h = M.hist.find((e) => e.id === id);
      if (h) { if (del) M.hist = M.hist.filter((e) => e.id !== id); else Object.assign(h, { amount: body.amount, bank: body.bank, party: body.party, note: body.note, date: body.date || h.date }); keep(); }
      const x = $('#pe'); if (x) x.remove();
      toast(del ? 'Entry deleted' : 'Entry updated'); ui(); loadReport(true);
    } else msg(esc(j.net ? 'No internet. Try again when you are online.' : (j.error || 'Could not save the change.')));
  }
  function savedPop(e) {                                          // "Saved" confirmation: shows exactly what was saved
    const old = $('#pd'); if (old) old.remove();
    const el = document.createElement('div'); el.id = 'pd'; document.body.appendChild(el);
    el.innerHTML = `<div class="rsb"><div class="rsc savedc"><div class="savedic ${e.type}">${ic('check', 34, 2.8)}</div><h3>Saved ✓</h3>
      <div class="savedamt ${e.type === 'in' ? 'g' : 'r'}">${e.type === 'in' ? '+' : '−'}${rs(e.amount)}</div>
      <small>${e.type === 'in' ? 'Payment In' : 'Payment Out'} · ${esc(e.bank)}${e.party ? ' · ' + esc(e.party) : ''}</small>
      <small class="subtle">It is saved on this phone and goes to the sheet now.</small>
      <button class="go" data-m="padd">Add another</button><button class="rcancel" data-m="pdone">Done</button></div></div>`;
  }
  const say = (m) => { M.msg = m; const el = $('#m-msg'); if (el) el.textContent = m; };

  const parties = () => {                              // people you used recently: one tap to fill the name
    const seen = [], add = (p) => { p = String(p || '').trim(); if (p && !seen.some((x) => x.toLowerCase() === p.toLowerCase())) seen.push(p); };
    M.q.slice().reverse().forEach((e) => add(e.party)); M.hist.forEach((e) => add(e.party)); if (M.rep && M.rep.rows) M.rep.rows.forEach((r) => add(r[3]));
    return seen.slice(0, 8);
  };
  const dotsHTML = () => { const n = M.pinBuf.length, t = Math.max(4, n); return Array.from({ length: t }, (_, i) => `<i class="${i < n ? 'f' : ''}"></i>`).join(''); };
  function pinPad(mode, title, sub, err) {
    M.pinMode = mode;
    return `<div class="pinbox"><div class="lock">${ic('lock', 30)}</div><h2>${title}</h2><p>${sub}</p>
      <div class="dots ${err && err !== 'Checking…' && !/^Checking/.test(err) ? 'shake' : ''}" id="m-dots">${dotsHTML()}</div>
      <div class="hint bad" id="m-pmsg">${esc(err)}</div>
      <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => `<button data-m="pk" data-v="${k}">${k}</button>`).join('')}<button class="alt" data-m="pk" data-v="del" aria-label="Delete">${ic('back', 26)}</button><button data-m="pk" data-v="0">0</button><button class="ok" data-m="pk" data-v="go" aria-label="Log in">${ic('check', 28, 2.6)}</button></div>
      <button class="plink" data-m="ping">Test connection</button></div>`;
  }
  const dayAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toLocaleDateString('en-CA'); };

  function draw() {
    const el = $('#money'); if (!el) return;
    try {
      if (!url()) { el.innerHTML = '<div class="card group"><h2>No payments sheet link yet</h2><p>Add the Payments Google Sheet link in Settings.</p><div class="btns"><a class="btn" href="#/set-sheets">Open Settings</a></div></div>'; return; }
      if (!M.user) { el.innerHTML = `<div class="form pay in">${pinPad('login', 'Log in to Payments', 'Enter your PIN. Only the first time on this phone.', M.msg)}</div>`; return; }
      const bl = banks(), ps = parties();
      if (!bl.includes(M.bank)) M.bank = bl[0] || '';
      if (M.mode === 'bank' && !bl.length) M.mode = 'cash';
      const m = (v) => (M.mode === v ? 'on' : '');
      el.innerHTML = `<div class="form pay ${M.type}" id="m-form">
        <div class="pmwho"><span>Logged in as <b>${esc(M.user.name)}</b></span><button data-m="logout">Log out</button></div>
        <div id="m-entry" style="display:${M.view === 'entry' ? 'block' : 'none'}">
          <div class="pmamt"><label for="m-amt">Amount<i>*</i></label>
            <div class="big"><b>₹</b><input id="m-amt" inputmode="decimal" placeholder="0" autocomplete="off"></div>
            <div class="qchips"><button data-m="add" data-v="100">+100</button><button data-m="add" data-v="500">+500</button><button data-m="add" data-v="1000">+1,000</button><button data-m="add" data-v="5000">+5,000</button><button class="clr" data-m="add" data-v="0">Clear</button></div></div>
          <div class="fl">Cash or bank<i>*</i></div>
          <div class="pmmode"><button class="pmtile ${m('cash')}" data-m="mode" data-v="cash">${ic('cash', 26)}<b>Cash</b></button><button class="pmtile ${m('bank')}${bl.length ? '' : ' dis'}" data-m="mode" data-v="bank">${ic('bank', 26)}<b>Bank</b></button></div>
          <div id="m-bankbox" style="display:${M.mode === 'bank' ? 'block' : 'none'}">
            <div class="fl">Your bank accounts <small>(set in the sheet)</small></div>
            ${bl.length ? `<div class="sizes">${bl.map((b) => `<button class="size ${b === M.bank ? 'on' : ''}" data-m="bank" data-v="${esc(b)}">${ic('bank', 16)}${esc(b)}</button>`).join('')}</div>` : `<div class="note warn">${ic('lock', 18)}<span>No bank account is set for you in the sheet. Ask the admin to add it in the Users tab (Bank column).</span></div>`}
          </div>
          <label class="fl" for="m-party">Party / name</label>
          <div class="field">${ic('truck', 20)}<input id="m-party" placeholder="Who paid or who was paid" autocomplete="off"></div>
          ${ps.length ? `<div class="qchips left">${ps.map((p) => `<button data-m="party" data-v="${esc(p)}">${esc(p)}</button>`).join('')}</div>` : ''}
          <label class="fl" for="m-note">Note <small>(optional)</small></label>
          <div class="field">${ic('pencil', 20)}<input id="m-note" placeholder="Add note..." autocomplete="off"></div>
          <label class="fl" for="m-date">Date</label>
          <div class="field">${ic('cal', 20)}<input id="m-date" type="date" value="${dayAgo(ag('payDate', 'today') === 'yesterday' ? 1 : 0)}"></div>
          <div class="qchips left"><button data-m="dsel" data-v="0">Today</button><button data-m="dsel" data-v="1">Yesterday</button></div>
          <div class="hint bad" id="m-msg">${esc(M.msg)}</div>
          <button class="submit" id="m-submit" data-m="save"><span id="m-sl">${M.type === 'in' ? 'Save Payment In' : 'Save Payment Out'}</span></button>
          <div id="m-list"></div>
        </div>
        <div id="m-rep" style="display:${M.view === 'report' ? 'block' : 'none'}"></div></div>`;
      ui(); drawReport(); if (M.view === 'report') loadReport();
    } catch (e) { el.innerHTML = '<div class="card group"><h2 class="r">Payments had a problem</h2><div class="btns"><button class="btn" data-m="mount">Retry</button></div></div>'; }
  }

  /* ---------- Report (read back from the Cash Book) ---------- */
  const RANGES = [['today', 'Today'], ['7', '7 Days'], ['30', '30 Days'], ['month', 'This month'], ['custom', 'Custom dates…']];
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
  async function loadReport(force) {
    if (!M.user || !url() || M.repBusy) return;
    if (!M.pin) { drawReport(); drawDash(); return; }
    if (!force && M.rep && M.rep.user === M.user.name && Date.now() - (M.repAt || 0) < 60000) { drawReport(); drawDash(); return; }
    if (!navigator.onLine) { drawReport(); drawDash(); return; }
    if (!force && Date.now() - (M.repTry || 0) < 60000) { drawReport(); drawDash(); return; }    // failed or tried a moment ago: wait
    M.repTry = Date.now(); M.repBusy = true; M.repErr = ''; drawReport(); drawDash();
    const j = await post({ action: 'report', pin: M.pin, dev });
    M.repBusy = false;
    if (j.ok && Array.isArray(j.rows)) { M.rep = j; M.repAt = Date.now(); s('rep', j); if (typeof j.bank === 'string' && M.user && j.bank !== M.user.bank) { M.user.bank = j.bank; keep(); } }
    else if (j.net) M.repErr = 'No connection. Showing the last saved report.';
    else if (j.error === 'Unknown action') M.repErr = 'The Payments script is an old version. Paste the new MoneyScript.gs, then Deploy > Manage deployments > New version.';
    else { M.repErr = j.error || 'Could not load the report.'; if (/PIN/i.test(M.repErr)) { M.pin = null; keep(); } }
    drawReport(); drawDash();
  }

  /* ---------- Home dashboard (shown on Home when Payments is the main button) ---------- */
  function drawDash() {
    const el = $('#paydash'); if (!el) return;
    try {
      if (!url()) { el.innerHTML = '<div class="card group"><h2>No payments sheet link yet</h2><p>Add the Payments Google Sheet link in Settings.</p><div class="btns"><a class="btn" href="#/set-sheets">Open Settings</a></div></div>'; return; }
      if (!M.user) { el.innerHTML = '<div class="card group"><h2>Log in to see payments</h2><p>Enter your PIN once on this phone.</p><div class="btns"><a class="btn" style="background:var(--green)" href="#/pay">Enter PIN</a></div></div>'; return; }
      const R = M.rep && M.rep.user === M.user.name ? M.rep : null;
      const td = today(), pend = M.q.filter((e) => e.u === M.user.name);
      let tin = 0, tout = 0; const bal = {};
      if (R) {
        Object.keys(R.totals || {}).forEach((k) => { bal[k] = (R.totals[k].in || 0) - (R.totals[k].out || 0); });
        R.rows.forEach((r) => { if (r[0] === td) { if (r[1] === 'in') tin += r[2]; else tout += r[2]; } });
      }
      pend.forEach((e) => {                                   // entries still on this phone count too
        const a = e.bank && String(e.bank).toLowerCase() !== 'cash' ? e.bank : 'Cash';
        bal[a] = (bal[a] || 0) + (e.type === 'in' ? 1 : -1) * e.amount;
        if (e.date === td) { if (e.type === 'in') tin += e.amount; else tout += e.amount; }
      });
      const net = tin - tout;
      const names = Object.keys(bal).sort((x, y) => (x === 'Cash' ? -1 : y === 'Cash' ? 1 : x.localeCompare(y)));
      const row = (e, tag) => { const l = e.id ? editLeft(e.at, e.by) : 0; return `<div class="pmrow" style="padding:10px 16px"><span class="pmi ${e.type}">${e.type === 'in' ? '+' : '−'}</span><div class="pmm"><b class="${e.type === 'in' ? 'g' : 'r'}">${rs(e.amount)}</b><small>${esc(e.bank || 'Cash')}${e.party ? ' · ' + esc(e.party) : ''}${e.by ? ' · by ' + esc(e.by) : ''}</small></div>${tag}${l ? ebtn(e.id, l) : ''}</div>`; };
      const recent = pend.slice().reverse().map((e) => row({ type: e.type, amount: e.amount, bank: e.bank, party: e.party, by: e.u }, '<span class="pmtag w">waiting</span>')).concat(R ? R.rows.slice(0, 6).map((r) => row({ type: r[1], amount: r[2], bank: r[4], party: r[3], by: r[6], id: r[7], at: r[8] }, `<span class="pmtag">${esc(r[0] === td ? 'Today' : dShort(r[0]))}</span>`)) : []).slice(0, 6);
      const days7 = []; for (let k = 6; k >= 0; k--) days7.push(dayAgo(k));
      const rows7 = (R ? R.rows : []).concat(pend.map((e) => [e.date, e.type, e.amount, e.party || '', e.bank || 'Cash', '', e.u]));
      const total7 = rows7.filter((r) => days7.includes(r[0])).length;
      el.innerHTML = `<div class="pmbar" style="margin-top:2px"><span>${R ? (R.scope === 'all' ? 'Everyone\'s entries' : 'Your entries') : (M.repBusy ? 'Loading…' : (M.pin ? '' : 'Enter PIN to load totals'))}</span><button data-m="dashreload">${M.repBusy ? CLK + 'Loading…' : 'Refresh'}</button></div>
        <div class="pmhero ${net < 0 ? 'neg' : ''}" style="margin-top:6px"><small>Net today</small><b>${net < 0 ? '−' : ''}${rs(Math.abs(net))}</b>
          <div class="hrow"><div><small>Received today</small><b>${rs(tin)}</b></div><div><small>Paid today</small><b>${rs(tout)}</b></div></div></div>
        ${names.length ? `<div class="sethead" style="margin:18px 2px 8px">Money in hand</div><div class="acctgrid">${names.map((n) => `<div class="acct ${n === 'Cash' ? 'cash' : 'bank'}"><span class="ai">${ic(n === 'Cash' ? 'cash' : 'bank', 20)}</span><small>${esc(n)}</small><b class="${bal[n] < 0 ? 'r' : ''}">${bal[n] < 0 ? '−' : ''}${rs(Math.abs(bal[n]))}</b></div>`).join('')}</div>` : ''}
        ${total7 ? `<div class="card sec" style="margin-top:12px"><div class="sec-h"><h2>Last 7 days</h2><a href="#/payreport">Full report</a></div><div style="padding:0 12px 12px">${payChart(days7, rows7)}</div></div>` : ''}
        <div class="card sec" style="margin-top:12px;overflow:hidden"><div class="sec-h" style="padding:14px 16px 4px"><h2>Recent payments</h2><a href="#/payreport">Full report</a></div>${recent.length ? recent.join('') : '<div class="empty"><b>No entries</b>Nothing recorded in this period.</div>'}</div>
        ${M.repErr ? `<div class="banner bad" style="margin-top:10px">${esc(M.repErr)}</div>` : ''}`;
    } catch (e) { /* dashboard problems must never block the app */ }
  }
  /* data for the chosen period: rows in range (account filter applied), the previous period for comparison */
  const addDays = (d, n) => { const [y, mo, dd] = String(d).split('-').map(Number); return new Date(y, mo - 1, dd + n, 12).toLocaleDateString('en-CA'); };
  const spanDays = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5) + 1;
  function cwin() { let f = M.rfrom || dayAgo(29), t = M.rto || today(); if (f > t) { const x = f; f = t; t = x; } return { from: f, to: t }; }
  function datesOf(kind) {
    const out = [], t = new Date();
    if (M.range === 'custom') {
      const w = cwin(), n = Math.min(400, spanDays(w.from, w.to));
      for (let k = 0; k < n; k++) out.push(addDays(kind === 'prev' ? addDays(w.from, -n) : w.from, k));
      return out;
    }
    if (M.range === 'today') { const d = new Date(t); d.setDate(d.getDate() - (kind === 'prev' ? 1 : 0)); out.push(d.toLocaleDateString('en-CA')); return out; }
    if (M.range === 'month') {
      const y = t.getFullYear(), mo = t.getMonth() - (kind === 'prev' ? 1 : 0), n = kind === 'prev' ? new Date(y, mo + 1, 0).getDate() : t.getDate();
      for (let k = 1; k <= n; k++) out.push(new Date(y, mo, k, 12).toLocaleDateString('en-CA'));
      return out;
    }
    const n = Number(M.range), off = kind === 'prev' ? n : 0;
    for (let k = n - 1; k >= 0; k--) { const d = new Date(t); d.setDate(d.getDate() - k - off); out.push(d.toLocaleDateString('en-CA')); }
    return out;
  }
  function srcRows(R) { const w = cwin(); return M.range === 'custom' && M.repC && M.repC.key === w.from + '|' + w.to ? M.repC.rows : R.rows; }
  async function loadCustom() {                                    // asks the sheet for exactly these dates (plus the same number of days before, for the comparison)
    if (M.range !== 'custom' || !M.user || !M.pin || !url()) return;
    const w = cwin(), key = w.from + '|' + w.to; if ((M.repC && M.repC.key === key) || M.repCBusy === key) return;
    if (!navigator.onLine) { M.repCErr = 'net'; return; }
    M.repCBusy = key; M.repCErr = ''; drawReport();
    const n = Math.min(400, spanDays(w.from, w.to)), j = await post({ action: 'report', pin: M.pin, dev, from: addDays(w.from, -n), to: w.to });
    M.repCBusy = '';
    if (j.ok && Array.isArray(j.rows) && j.range) M.repC = { key, rows: j.rows };
    else M.repCErr = j.net ? 'net' : (j.ok ? 'old' : 'err');
    drawReport();
  }
  function repBase() {
    const R = M.rep && M.rep.user === (M.user && M.user.name) ? M.rep : null; if (!R) return null;
    const days = datesOf('cur'), pd = datesOf('prev'), ds = new Set(days), ps = new Set(pd);
    const meN = M.user && M.user.name, okA = (r) => (M.racct === 'all' || r[4] === M.racct) && (R.scope !== 'all' || M.rwho === 'all' || (M.rwho === 'me' ? r[6] === meN : r[6] === M.rwho));
    const rows = srcRows(R), base = rows.filter((r) => ds.has(r[0]) && okA(r)), prev = rows.filter((r) => ps.has(r[0]) && okA(r));
    const sum = (rows, ty) => rows.reduce((s, r) => s + (r[1] === ty ? r[2] : 0), 0);
    return { R, days, base, tin: sum(base, 'in'), tout: sum(base, 'out'), pin: sum(prev, 'in'), pout: sum(prev, 'out') };
  }
  function listRows(base) {
    let l = base; if (M.rtype !== 'all') l = l.filter((r) => r[1] === M.rtype);
    const q = String(M.rq || '').trim().toLowerCase();
    if (q) l = l.filter((r) => (r[3] + ' ' + r[4] + ' ' + r[5] + ' ' + r[6]).toLowerCase().includes(q));
    return l;
  }
  function listHTML(base, scope) {
    const l = listRows(base); if (!l.length) return '<div class="empty"><b>No entries</b>Nothing recorded in this period.</div>';
    let h = '', last = '';
    l.slice(0, 150).forEach((r) => {
      if (r[0] !== last) { last = r[0]; h += `<div class="daygroup">${esc(dRel(r[0]))}</div>`; }
      const l = editLeft(r[8], r[6]);
      h += `<div class="pmrow" style="padding:10px 16px"><span class="pmi ${r[1]}">${r[1] === 'in' ? '+' : '−'}</span><div class="pmm"><b class="${r[1] === 'in' ? 'g' : 'r'}">${rs(r[2])}</b><small>${esc(r[4])}${r[3] ? ' · ' + esc(r[3]) : ''}${r[6] ? ' · by ' + esc(r[6]) : ''}${r[5] ? ' · ' + esc(r[5]) : ''}</small></div>${l ? ebtn(r[7], l) : ''}</div>`;
    });
    return h;
  }
  function payChart(days, rows) {
    const mm = {}; days.forEach((d) => { mm[d] = { i: 0, o: 0 }; });
    rows.forEach((r) => { const b = mm[r[0]]; if (b) { if (r[1] === 'in') b.i += r[2]; else b.o += r[2]; } });
    const svg = days.length < 2 ? '<p class="subtle" style="margin:6px 4px 10px">Pick 7 days or more to see the trend line.</p>'
      : (window.ARTIME_lineSVG ? window.ARTIME_lineSVG({ ds: days, a: days.map((d) => mm[d].i), b: days.map((d) => mm[d].o), ca: '#16a34a', cb: '#dc2626', fmt: (v) => Number(v).toLocaleString(ag('numfmt', 'in') === 'intl' ? 'en-US' : 'en-IN'), label: dShort, aria: 'Received and paid per day' }) : '');
    return `<div class="chart">${svg}</div><div class="pmleg"><span><i class="g"></i>Received</span><span><i class="r"></i>Paid</span></div>`;
  }
  const delta = (cur, prev) => {
    if (M.range === 'today' && false) return '';
    if (!prev) return cur > 0 ? '<em>new</em>' : '';
    const p = Math.round(((cur - prev) / prev) * 100); return `<em>${p >= 0 ? '▲' : '▼'} ${Math.abs(p)}%</em>`;
  };
  const periodName = () => (M.range === 'custom' ? (cwin().from === cwin().to ? dShort(cwin().from) : dShort(cwin().from) + ' - ' + dShort(cwin().to)) : { today: 'Today', 7: 'Last 7 days', 30: 'Last 30 days', month: 'This month' }[M.range]);
  function drawReport() {
    const el = $('#m-rep'); if (!el || !M.user) return;
    try {
      const waiting = M.q.filter((e) => e.u === M.user.name).length;
      const chips = '';
      if (!M.pin) { el.innerHTML = `<div class="form pay in">${pinPad('repin', 'Enter your PIN to see reports', 'Asked once, so the report can be read safely from the sheet.', M.repErr)}</div>`; return; }
      const B = repBase(), R = B && B.R;
      const cw = cwin(), ck = cw.from + '|' + cw.to;
      const dateRow = M.range === 'custom' ? `<div class="daterow"><label><small>From</small><input type="date" data-mdate="from" value="${esc(cw.from)}" max="${today()}"></label><label><small>To</small><input type="date" data-mdate="to" value="${esc(cw.to)}" max="${today()}"></label></div>`
        + (M.repCBusy === ck ? `<div class="banner" style="margin-top:10px">${CLK}Loading these dates from the sheet…</div>` : M.repCErr === 'old' ? '<div class="banner bad" style="margin-top:10px">Older dates need the updated Payments script. Showing the last 3 months only.</div>' : M.repCErr === 'net' ? '<div class="banner bad" style="margin-top:10px">No connection. Showing the last 3 months only.</div>' : '') : '';
      const bar = `<div class="pmbar"><span>${R ? (R.scope === 'all' ? 'Everyone\'s entries' : 'Your entries') + ' · updated ' + new Date(R.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}</span><button data-m="reload">${M.repBusy ? CLK + 'Loading…' : 'Refresh'}</button></div>`;
      const msg = (M.repErr ? `<div class="banner bad" style="margin-top:10px">${esc(M.repErr)}</div>` : '') + (waiting ? `<div class="banner" style="margin-top:10px">${waiting} ${waiting === 1 ? 'entry is' : 'entries are'} still waiting to sync and not in this report yet.</div>` : '');
      if (!B) { el.innerHTML = `<div class="fbar"><label class="catsel"><select data-msel="range" aria-label="Period">${RANGES.map((r) => `<option value="${r[0]}"${String(M.range) === String(r[0]) ? ' selected' : ''}>${r[1]}</option>`).join('')}</select></label></div>` + bar + msg + `<div class="card empty" style="margin-top:12px"><b>${M.repBusy ? CLK + 'Loading report…' : 'No report yet'}</b>${M.repBusy ? '' : 'Tap Refresh to load it from the sheet.'}</div>`; return; }
      const accts = Object.keys(R.totals || {}).sort((x, y) => (x === 'Cash' ? -1 : y === 'Cash' ? 1 : x.localeCompare(y)));
      const acc = {}; B.base.forEach((r) => { const a = acc[r[4]] || (acc[r[4]] = { in: 0, out: 0 }); a[r[1]] += r[2]; });
      const bal = B.tin - B.tout;
      const hero = `<div class="pmhero ${bal < 0 ? 'neg' : ''}"><small>Balance for ${esc(periodName())}</small><b>${bal < 0 ? '−' : ''}${rs(Math.abs(bal))}</b>
        <div class="hrow"><div><small>Received</small><b>${rs(B.tin)}</b>${delta(B.tin, B.pin)}</div><div><small>Paid</small><b>${rs(B.tout)}</b>${delta(B.tout, B.pout)}</div></div><div class="hnote">${M.range === 'today' ? 'Compared with yesterday' : 'Compared with the period before'}</div></div>`;
      const people = [...new Set(srcRows(R).map((r) => r[6]).filter((x) => x && x !== M.user.name))].sort();
      const opt = (v, l, cur) => `<option value="${esc(v)}"${String(cur) === String(v) ? ' selected' : ''}>${esc(l)}</option>`;
      const acctChips = `<div class="fbar"><label class="catsel"><select data-msel="range" aria-label="Period">${RANGES.map((r) => opt(r[0], r[1], M.range)).join('')}</select></label>`
        + (accts.length > 1 ? `<label class="catsel"><select data-msel="acct" aria-label="Account">${opt('all', 'All accounts', M.racct)}${accts.map((n) => opt(n, n, M.racct)).join('')}</select></label>` : '')
        + (R.scope === 'all' ? `<label class="catsel"><select data-msel="who" aria-label="Person">${opt('all', 'Everyone', M.rwho)}${opt('me', 'My entries', M.rwho)}${people.map((n) => opt(n, n, M.rwho)).join('')}</select></label>` : '') + `</div>`;
      const chart = M.range === 'today' ? '' : `<div class="card sec" style="margin-top:12px"><div class="sec-h"><h2>Day by day</h2></div><div style="padding:0 12px 12px">${payChart(B.days, B.base)}</div></div>`;
      const accHTML = Object.keys(acc).length || accts.length ? `<div class="card group" style="margin-top:12px"><h2>Cash and banks</h2><p>Received and paid in this period. Right side = balance now (all time).</p>${accts.concat(Object.keys(acc).filter((k) => !accts.includes(k))).map((n) => {
        const tt = (R.totals && R.totals[n]) || { in: 0, out: 0 }, nb = tt.in - tt.out, a = acc[n] || { in: 0, out: 0 };
        return `<div class="pmrow"><span class="pmi ${n === 'Cash' ? 'in' : 'md'}">${ic(n === 'Cash' ? 'cash' : 'bank', 18)}</span><div class="pmm"><b>${esc(n)}</b><small><span class="g">+${rs(a.in)}</span> &nbsp; <span class="r">−${rs(a.out)}</span></small></div><div class="pmbal ${nb < 0 ? 'r' : ''}"><small>Balance now</small><b>${nb < 0 ? '−' : ''}${rs(Math.abs(nb))}</b></div></div>`; }).join('')}</div>` : '';
      const agg = {}; B.base.forEach((r) => { const p = String(r[3] || '').trim(); if (!p) return; const x = agg[p] || (agg[p] = { i: 0, o: 0 }); x[r[1] === 'in' ? 'i' : 'o'] += r[2]; });
      const tp = Object.entries(agg).sort((x, y) => (y[1].i + y[1].o) - (x[1].i + x[1].o)).slice(0, 5), mx = tp.length ? tp[0][1].i + tp[0][1].o : 1;
      const parts = tp.length ? `<div class="card sec" style="margin-top:12px"><div class="sec-h"><h2>Top parties</h2></div>${tp.map(([n, v]) => `<div class="row plain"><div style="display:flex;justify-content:space-between;gap:10px"><b style="font-weight:600">${esc(n)}</b><span><b class="g">+${rs(v.i)}</b> <b class="r">−${rs(v.o)}</b></span></div><div class="bar"><i style="width:${Math.max(4, Math.round(((v.i + v.o) / mx) * 100))}%"></i></div></div>`).join('')}</div>` : '';
      const tch = (v, l) => `<button class="chip ${M.rtype === v ? 'on' : ''}" data-m="rtype" data-v="${v}">${l}</button>`;
      el.innerHTML = chips + acctChips + dateRow + bar + msg + hero
        + `<div class="repact"><button class="btn ghost" data-m="repshare">${ic('send', 18)}Share summary</button><button class="btn ghost" data-m="repcsv">${ic('download', 18)}Download Excel (CSV)</button></div>`
        + chart + accHTML + parts
        + `<div class="card sec" style="margin-top:12px;overflow:hidden"><div class="sec-h" style="padding:14px 16px 4px"><h2>Entries</h2><small class="cnt" id="m-repcnt">${listRows(B.base).length}</small></div>
          <div class="chips inner">${tch('all', 'All')}${tch('in', 'Received')}${tch('out', 'Paid')}</div>
          <div class="search inner">${ic('search', 20)}<input id="m-rq" type="search" placeholder="Search party, bank or note" value="${esc(M.rq)}" autocomplete="off"></div>
          <div id="m-replist">${listHTML(B.base, R.scope)}</div></div>`;
    } catch (e) { el.innerHTML = '<div class="card empty"><b>Report could not be shown</b></div>'; }
  }
  function shareText() {
    const B = repBase(); if (!B) return '';
    const acc = {}; B.base.forEach((r) => { const a = acc[r[4]] || (acc[r[4]] = { in: 0, out: 0 }); a[r[1]] += r[2]; });
    const nm = (window.APP_CONFIG && APP_CONFIG.appName) || 'ARTIME';
    return `${nm} Payments - ${periodName()}\nReceived: ${rs(B.tin)}\nPaid: ${rs(B.tout)}\nBalance: ${rs(B.tin - B.tout)}` + Object.keys(acc).map((k) => `\n${k}: +${rs(acc[k].in)} / -${rs(acc[k].out)}`).join('');
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
      } else if (a === 'pedit') openPayEdit(b.dataset.id);
      else if (a === 'peclose') { const x = $('#pe'); if (x) x.remove(); }
      else if (a === 'pesave') payEditSend(b.dataset.id, false);
      else if (a === 'pedel') { if (confirm((window.ARTIME_tr || ((x) => x))('Delete this entry?'))) payEditSend(b.dataset.id, true); }
      else if (a === 'range') { M.range = b.dataset.v; drawReport(); }
      else if (a === 'rtype') { M.rtype = b.dataset.v; drawReport(); }
      else if (a === 'racct') { M.racct = b.dataset.v; drawReport(); }
      else if (a === 'add') { const i = $('#m-amt'); if (!i) return; const n = Number(b.dataset.v); i.value = n ? String((parseFloat(String(i.value).replace(/,/g, '')) || 0) + n) : ''; }
      else if (a === 'party') { const i = $('#m-party'); if (i) i.value = b.dataset.v; }
      else if (a === 'dsel') { const i = $('#m-date'); if (i) i.value = dayAgo(Number(b.dataset.v)); }
      else if (a === 'repshare') window.open('https://wa.me/?text=' + encodeURIComponent(shareText()), '_blank');
      else if (a === 'repcsv') { const B = repBase(); if (B && window.ARTIME_csv) window.ARTIME_csv('payments-report.csv', [['Date', 'Type', 'Amount', 'Party', 'Account', 'Note', 'By']].concat(listRows(B.base).map((r) => [r[0], r[1] === 'in' ? 'Received' : 'Paid', r[2], r[3], r[4], r[5], r[6]]))); }
      else if (a === 'reload' || a === 'dashreload') loadReport(true);
      else if (a === 'pk') {
        const k = b.dataset.v;
        if (k === 'del') M.pinBuf = M.pinBuf.slice(0, -1);
        else if (k === 'go') { if (M.pinBuf) act(M.pinMode === 'repin' ? 'repin' : 'pin'); return; }
        else if (M.pinBuf.length < 8) M.pinBuf += k;
        const d = $('#m-dots'); if (d) { d.classList.remove('shake'); d.innerHTML = dotsHTML(); }
      } else if (a === 'repin') {
        const pin = M.pinBuf; if (!pin) return;
        M.repErr = 'Checking…'; drawReport();
        post({ action: 'login', pin, dev }).then((j) => {
          if (j.ok && j.name === (M.user && M.user.name)) { M.pin = pin; M.pinBuf = ''; M.repErr = ''; keep(); loadReport(); }
          else { M.pinBuf = ''; M.repErr = j.net ? 'No connection. Try again.' : (j.ok ? 'That PIN belongs to someone else.' : (j.error || 'Wrong PIN')); drawReport(); }
        });
      } else if (a === 'mount') { M.msg = ''; draw(); sync(); }
      else if (a === 'close') { location.hash = '#/home'; }
      else if (a === 'type') {                              // switch in place, so typed text is never lost
        M.type = b.dataset.v; s('type', M.type); flip('#money [data-m="type"]', M.type);
        const fm = $('#m-form'), sl = $('#m-sl'); if (fm) { fm.classList.remove('in', 'out'); fm.classList.add(M.type); }
        if (sl) sl.textContent = M.type === 'in' ? 'Save Payment In' : 'Save Payment Out';
      } else if (a === 'mode') {
        if (b.dataset.v === 'bank' && !banks().length) { say('No bank account is set for you in the sheet.'); return; }
        M.mode = b.dataset.v; s('mode', M.mode); flip('#money [data-m="mode"]', M.mode);
        const bx = $('#m-bankbox'); if (bx) bx.style.display = M.mode === 'bank' ? 'block' : 'none';
        say('');
      } else if (a === 'bank') {
        M.bank = b.dataset.v; s('bank', M.bank); flip('#money [data-m="bank"]', M.bank);
      } else if (a === 'syncnow') sync();
      else if (a === 'ping') {
        const say2 = (x) => { const el = $('#m-pmsg'); if (el) el.innerHTML = x; };
        say2(CLK + 'Checking…');
        post({ action: 'ping' }).then((j) => say2(j.ok ? 'Payments sheet is reachable ✓' : (j.net ? netMsg(j) : j.error || 'Not reachable')));
      } else if (a === 'pin') {
        const pin = M.pinBuf; if (!pin) return;
        const t0 = Date.now(), el0 = $('#m-pmsg'); if (el0) el0.innerHTML = CLK + 'Checking…';
        const tick = setInterval(() => { const el = $('#m-pmsg'); if (el) el.innerHTML = CLK + 'Checking… ' + Math.round((Date.now() - t0) / 1000) + 's'; }, 1000);
        post({ action: 'login', pin, dev }).then((j) => {
          if (j.ok && !j.name) { M.msg = 'This PIN has no name in the Users tab. Type the name in the Name column.'; }
          else if (j.ok) { M.user = { name: j.name, bank: j.bank || '', admin: !!j.admin }; M.pin = pin; M.msg = ''; keep(); toast('Welcome ' + j.name); try { window.store.set('by', j.name); } catch (e) { /* ignore */ } sync(); if (window.ARTIME_render) setTimeout(window.ARTIME_render, 0); }
          else M.msg = j.net ? netMsg(j) : (j.error || 'Wrong PIN');
        }).catch(() => { M.msg = 'Something went wrong. Try again.'; }).finally(() => { clearInterval(tick); M.pinBuf = ''; draw(); });
      } else if (a === 'save') {
        const amt = parseFloat(String(($('#m-amt') || {}).value || '').replace(/,/g, ''));
        if (!(amt > 0)) { say('Enter an amount'); return; }
        let bank = 'Cash';
        if (M.mode === 'bank') {
          const bl = banks();
          if (!bl.length) { say('No bank account is set for you in the sheet.'); return; }
          if (!bl.includes(M.bank)) M.bank = bl[0];
          bank = M.bank; s('bank', bank);
        }
        const val = (id) => String(($(id) || {}).value || '').trim();
        if (ag('payReqNote', false) && !val('#m-note')) { say('Add a note'); return; }
        if (ag('payConfirm', false) && !confirm((M.type === 'in' ? 'Payment In ' : 'Payment Out ') + rs(amt) + ' (' + bank + ')?')) return;
        if (Date.now() - (M.savedAt || 0) < 900) return;                                                // a fast double tap is one entry
        const sig = [M.type, amt, val('#m-party').toLowerCase(), bank, val('#m-date')].join('|');
        M.recent = (M.recent || []).filter((r) => Date.now() - r.at < 120000);
        if (M.recent.some((r) => r.sig === sig) && !confirm((window.ARTIME_tr || ((x) => x))('Same entry was saved a moment ago. Save again?'))) return;
        M.savedAt = Date.now(); M.recent.push({ sig, at: Date.now() });
        const ent = { id: 'M' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), u: M.user.name, type: M.type, mode: M.mode, amount: amt, party: val('#m-party'), bank, note: val('#m-note'), date: val('#m-date') || today() };
        M.q.push(ent);
        ['#m-amt', '#m-party', '#m-note'].forEach((id) => { const i = $(id); if (i) i.value = ''; });
        say(''); keep(); ui(); sync();                                                                  // saved on the phone first, uploaded in the background
        savedPop(ent);
      } else if (a === 'padd') { const x = $('#pd'); if (x) x.remove(); const i = $('#m-amt'); if (i) i.focus(); }
      else if (a === 'pdone') {
        const x = $('#pd'); if (x) x.remove();
        const go = () => { location.hash = '#/home'; };
        if (window.ARTIME_closeThen) window.ARTIME_closeThen(go); else go();
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
  document.addEventListener('keydown', (ev) => {                 // typing on a computer keyboard works on the PIN pad too
    if (!$('#m-dots') || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const k = /^\d$/.test(ev.key) ? ev.key : ev.key === 'Backspace' ? 'del' : ev.key === 'Enter' ? 'go' : '';
    if (k) { ev.preventDefault(); act('pk', { dataset: { v: k } }); }
  });
  document.addEventListener('change', (ev) => {                  // the three menus above the report
    const k = ev.target && ev.target.dataset && ev.target.dataset.msel; if (!k) return;
    if (k === 'range') { M.range = ev.target.value; if (M.range === 'custom') { if (!M.rfrom) M.rfrom = dayAgo(29); if (!M.rto) M.rto = today(); } }
    else if (k === 'acct') M.racct = ev.target.value; else if (k === 'who') M.rwho = ev.target.value;
    drawReport(); if (M.range === 'custom') loadCustom();
  });
  document.addEventListener('change', (ev) => {
    const k = ev.target && ev.target.dataset && ev.target.dataset.mdate; if (!k || !ev.target.value) return;
    if (k === 'from') M.rfrom = ev.target.value; else M.rto = ev.target.value;
    drawReport(); loadCustom();
  });
  document.addEventListener('input', (ev) => {
    if (ev.target && ev.target.id === 'm-rq') { M.rq = ev.target.value; const B = repBase(), l = $('#m-replist'); if (B && l) { l.innerHTML = listHTML(B.base, B.R.scope); const n = $('#m-repcnt'); if (n) n.textContent = listRows(B.base).length; } return; } if (ev.target && ev.target.id === 'm-bank') { M.bank = ev.target.value; flip('#money [data-m="bank"]', M.bank); } });
  window.addEventListener('online', () => later(500));
  window.Money = { act, boot: () => later(800), mount: (view, t) => { M.msg = ''; M.view = view === 'report' ? 'report' : 'entry'; if (t === 'in' || t === 'out') { M.type = t; s('type', t); } const pm = ag('payMode', 'last'); if (pm === 'cash' || pm === 'bank') { M.mode = pm; s('mode', pm); } draw(); sync(); if (M.range === 'custom') loadCustom(); },
    warm: () => {                          // quietly fills Home's payments card; at most once per 5 minutes, never loops
      if (!M.user || !M.pin || M.repBusy || !navigator.onLine || Date.now() - (M.repTry || 0) < 300000) return;
      if (M.rep && M.rep.user === M.user.name && Date.now() - (M.repAt || 0) < 300000) return;
      const before = M.repAt || 0;
      loadReport(true).then(() => { if ((M.repAt || 0) > before && window.ARTIME_render && /^#?\/?(home)?$/.test(location.hash)) window.ARTIME_render(); });
    },
    dash: () => { M.msg = ''; drawDash(); loadReport(); sync(); } };
})();
