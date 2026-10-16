/* Payments module: own storage, own queue, own backend link. Loaded only when used, so it can never slow or break stock. */
(function () {
  'use strict';
  const K = 'artime.money.';
  const g = (k, d) => { try { const v = localStorage.getItem(K + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const s = (k, v) => { try { localStorage.setItem(K + k, JSON.stringify(v)); } catch (e) { /* full */ } };
  const esc = (x) => String(x == null ? '' : x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const M = { user: g('user', null), q: g('q', []), failed: g('failed', []), hist: g('hist', []), msg: '', type: 'in', open: false };
  const dev = g('dev', null) || (() => { const d = 'd' + Math.random().toString(36).slice(2, 10); s('dev', d); return d; })();
  const url = () => g('url', '') || (window.APP_CONFIG && APP_CONFIG.moneyUrl) || '';
  const keep = () => { s('q', M.q); s('failed', M.failed); s('hist', M.hist); s('user', M.user); };
  const today = () => new Date().toISOString().slice(0, 10);
  const $ = (q) => document.querySelector(q);

  async function post(body, u) {                       // never hangs, never throws
    const c = new AbortController(), t = setTimeout(() => c.abort(), 20000);
    try {
      const r = await fetch(u || url(), { method: 'POST', body: JSON.stringify(body), signal: c.signal });
      try { return JSON.parse(await r.text()); } catch (e) { return { ok: false, net: true }; }
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
    const el = $('#m-list'); if (!el || !M.open) return;
    try {
      const mine = M.q.filter((e) => e.u === (M.user && M.user.name));
      const row = (e, tag) => `<div class="row"><span>${e.type === 'in' ? '+' : '−'} ₹${esc(e.amount)} <small>${esc(e.party || e.note || '')}</small></span>${tag}</div>`;
      el.innerHTML = `<div class="mc"><b>${mine.length ? mine.length + ' waiting to sync' : 'All synced ✓'}</b>
        ${mine.map((e) => row(e, '<span class="pill w">waiting</span>')).join('')}
        ${M.hist.slice(0, 8).map((e) => row(e, `<span class="pill">${e.held ? 'held' : 'saved'}</span>`)).join('')}
        <button class="seg" style="all:unset;color:var(--green);font-weight:700" data-m="syncnow">${syncing ? 'Syncing…' : 'Sync now'}</button></div>
        ${M.failed.length ? `<div class="mc"><b class="err">${M.failed.length} could not be saved</b>${M.failed.map((e) => `<div class="row"><span>₹${esc(e.amount)} <small class="err">${esc(e.why)}</small></span><span><button data-m="retry" data-id="${e.id}">Retry</button> <button data-m="del" data-id="${e.id}">Delete</button></span></div>`).join('')}</div>` : ''}`;
    } catch (e) { /* a display problem must never stop saving */ }
  }

  function draw() {
    let el = $('#money'); if (!el) { el = document.createElement('div'); el.id = 'money'; document.body.appendChild(el); }
    M.open = true;
    try {
      if (!url()) { el.innerHTML = '<h2>Payments<button class="x" data-m="close">×</button></h2><div class="mc">No payments sheet link yet.<br>Add it in Settings → Payments.</div>'; return; }
      if (!M.user) {
        el.innerHTML = `<h2>Payments<button class="x" data-m="close">×</button></h2><div class="mc"><b>Enter your PIN</b><small>Only the first time on this phone.</small><input id="mpin" type="password" inputmode="numeric" autocomplete="off" placeholder="PIN"><div class="err">${esc(M.msg)}</div><button class="go" data-m="pin">Continue</button></div>`;
        return;
      }
      el.innerHTML = `<h2>${esc(M.user.name)}<button class="x" data-m="close">×</button></h2>
        <div class="mc"><div class="tg"><button class="${M.type === 'in' ? 'on in' : ''}" data-m="type" data-v="in">Received</button><button class="${M.type === 'out' ? 'on out' : ''}" data-m="type" data-v="out">Paid</button></div>
        <input id="m-amt" inputmode="decimal" placeholder="Amount ₹"><input id="m-party" placeholder="Party / name"><input id="m-bank" placeholder="Bank / cash" value="${esc(M.user.bank)}"><input id="m-note" placeholder="Note (optional)"><input id="m-date" type="date" value="${today()}">
        <div class="err">${esc(M.msg)}</div><button class="go" data-m="save">Save entry</button></div><div id="m-list"></div>`;
      ui();
    } catch (e) { el.innerHTML = '<div class="mc err">Payments had a problem. <button data-m="open">Retry</button> <button data-m="close">Close</button></div>'; }
  }

  const act = (a, b) => {
    try {
      if (a === 'open') { M.msg = ''; draw(); sync(); }
      else if (a === 'close') { M.open = false; const el = $('#money'); if (el) el.remove(); }
      else if (a === 'type') { M.type = b.dataset.v; draw(); }
      else if (a === 'syncnow') sync();
      else if (a === 'pin') {
        const pin = ($('#mpin') || {}).value; if (!pin) return; M.msg = 'Checking…'; draw();
        post({ action: 'login', pin, dev }).then((j) => {
          if (j.ok) { M.user = { name: j.name, bank: j.bank || '', admin: !!j.admin }; M.msg = ''; keep(); sync(); }
          else M.msg = j.net ? 'No connection. Try again.' : (j.error || 'Wrong PIN');
          draw();
        });
      } else if (a === 'save') {
        const amt = parseFloat(($('#m-amt') || {}).value);
        if (!(amt > 0)) { M.msg = 'Enter an amount'; draw(); return; }
        M.q.push({ id: 'M' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), u: M.user.name, type: M.type, amount: amt, party: $('#m-party').value.trim(), bank: $('#m-bank').value.trim(), note: $('#m-note').value.trim(), date: $('#m-date').value || today() });
        M.msg = ''; keep(); draw(); sync();                  // saved on the phone first, uploaded in the background
      } else if (a === 'retry') { const e = M.failed.find((x) => x.id === b.dataset.id); if (e) { M.failed = M.failed.filter((x) => x !== e); delete e.why; M.q.push(e); keep(); ui(); sync(); } }
      else if (a === 'del') { M.failed = M.failed.filter((x) => x.id !== b.dataset.id); keep(); ui(); }
      else if (a === 'logout') {
        const n = M.q.filter((e) => e.u === (M.user && M.user.name)).length;
        if (n && !confirm(n + ' entries have not synced yet. They stay on this phone until you log in again. Log out?')) return;
        M.user = null; keep(); alert('Logged out.'); if (M.open) draw();
      } else if (a === 'saveurl') {
        const v = ($('#murl') || {}).value.trim(); if (!/^https:\/\/script\.google\.com\//.test(v)) { alert('That does not look like a Google Apps Script link.'); return; }
        post({ action: 'ping' }, v).then((j) => { if (j.ok) { s('url', v); alert('Connected ✓'); } else alert('Could not connect. Your old link is kept.'); });
      }
    } catch (e) { alert('Something went wrong in Payments. Your saved entries are safe.'); }
  };
  window.addEventListener('online', () => later(500));
  window.Money = { act, boot: () => later(800) };
})();
