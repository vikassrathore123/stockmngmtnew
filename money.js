// ARTIME Payments backend. Paste in the Payments sheet: Extensions > Apps Script.
// Run setup() once. Deploy > Web app > Execute as: Me, Access: Anyone.
const HEAD = ['Date', 'Type', 'Amount', 'Party', 'Bank', 'Note', 'Entered By', 'Entry ID', 'Saved At'];
const SS = SpreadsheetApp.getActiveSpreadsheet();
const out = (o) => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);

function setup() {                                  // creates tabs only if missing; never touches an existing Users tab
  if (!SS.getSheetByName('Users')) SS.insertSheet('Users').appendRow(['Name', 'PIN', 'Bank', 'Active', 'Admin']);
  tab('Cash Book'); tab('Held for Review');
}
function tab(n) { let t = SS.getSheetByName(n); if (!t) { t = SS.insertSheet(n); t.appendRow(HEAD); t.setFrozenRows(1); } return t; }
function doGet() { return out({ ok: true }); }
function doPost(e) {
  let b; try { b = JSON.parse(e.postData.contents); } catch (x) { return out({ ok: false, error: 'Bad request' }); }
  try {
    if (b.action === 'ping') return out({ ok: true });
    if (b.action === 'login') return out(login(b));
    if (b.action === 'save') return out(save(b));
    if (b.action === 'report') return out(report(b));
    return out({ ok: false, error: 'Unknown action' });
  } catch (err) { return out({ ok: false, error: 'Server error' }); }
}
function users() {                                  // null when the tab is missing/empty: that is "unavailable", never "wrong user"
  const t = SS.getSheetByName('Users'); if (!t || t.getLastRow() < 2) return null;
  const v = t.getRange(1, 1, t.getLastRow(), Math.max(5, t.getLastColumn())).getValues();
  const h = v[0].map((x) => String(x).trim().toLowerCase());       // columns are found by their heading, in any order
  const hasHead = h.some((x) => /name/.test(x)) && h.some((x) => /pin|pass/.test(x));        // real headings found: never guess positions
  const col = (re, d) => { const i = h.findIndex((x) => re.test(x)); return i < 0 ? (hasHead ? -1 : d) : i; };
  const cN = col(/^(user\s*)?name$|^user$/, 0), cP = col(/pin|pass/, 1), cB = col(/bank/, 2), cA = col(/active|status/, 3), cD = col(/admin/, 4);
  return v.slice(1).filter((r) => String(r[cN]).trim() !== '' || String(r[cP]).trim() !== '').map((r) => ({
    name: String(r[cN]).trim(), pin: String(r[cP]).trim(), bank: String(r[cB] || '').trim(),
    active: String(r[cA]).trim().toLowerCase() !== 'no', admin: String(r[cD]).trim().toLowerCase() === 'yes' }));
}
function login(b) {                                 // only typed PINs count toward the lockout
  const c = CacheService.getScriptCache(), k = 'f_' + String(b.dev || 'x').slice(0, 20);
  if (+c.get(k) >= 5) return { ok: false, error: 'Too many wrong PINs. Wait 10 minutes.' };
  const u = users(); if (!u) return { ok: false, error: 'User list unavailable. Try again later.' };
  const pin = String(b.pin || '').trim(), same = (a, c) => a === c || (/^\d+$/.test(a) && /^\d+$/.test(c) && Number(a) === Number(c)),   // 0123 typed in a sheet is stored as 123
    m = u.filter((x) => pin !== '' && same(x.pin, pin));
  if (m.length > 1) return { ok: false, error: 'This PIN is used by two people. Ask the admin.' };
  if (!m.length) { c.put(k, String((+c.get(k) || 0) + 1), 600); return { ok: false, error: 'Wrong PIN' }; }
  if (!m[0].name) return { ok: false, error: 'This PIN has no name in the Users tab. Type the name in the Name column.' };
  if (!m[0].active) return { ok: false, error: 'This user is switched off.' };
  c.remove(k); return { ok: true, name: m[0].name, bank: m[0].bank, admin: m[0].admin };
}
function seen(t) { const n = t.getLastRow(), o = {}; if (n > 1) t.getRange(Math.max(2, n - 2999), 8, Math.min(3000, n - 1), 1).getValues().forEach((r) => { o[r[0]] = 1; }); return o; }
function save(b) {
  const ents = (b.entries || []).filter((e) => e && e.id), res = [], rows = [];
  const me = (users() || []).filter((x) => x.name === b.user)[0], held = !!(me && !me.active);   // disabled user: hold, don't lose
  const lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (x) { return { ok: false, busy: true }; }   // busy = phone retries, not an error
  try {
    const cb = tab('Cash Book'), hb = tab('Held for Review'), tgt = held ? hb : cb, dup = Object.assign(seen(cb), seen(hb));
    ents.forEach((e) => {
      if (dup[e.id]) { res.push({ id: e.id, s: 'dup' }); return; }
      const a = Number(e.amount);
      if (!(a > 0) || (e.type !== 'in' && e.type !== 'out')) { res.push({ id: e.id, s: 'bad', why: 'Amount or type invalid' }); return; }
      dup[e.id] = 1; rows.push([e.date || '', e.type === 'in' ? 'Received' : 'Paid', a, e.party || '', e.bank || '', e.note || '', b.user, e.id, new Date()]);
      res.push({ id: e.id, s: held ? 'held' : 'ok' });
    });
    if (rows.length) { tgt.getRange(tgt.getLastRow() + 1, 1, rows.length, HEAD.length).setValues(rows); SpreadsheetApp.flush(); }
  } finally { lock.releaseLock(); }
  return { ok: true, results: res };
}

/* ---------- Report: the app reads the Cash Book back. Staff see their own entries, Admin = yes sees everyone's. ---------- */
function report(b) {
  const a = login(b); if (!a.ok) return a;                       // same PIN check and lockout as login
  const tz = 'Asia/Kolkata', all = !!a.admin, me = a.name;
  const res = { ok: true, user: me, admin: all, scope: all ? 'all' : 'mine', rows: [], totals: {}, time: new Date().toISOString() };
  const t = SS.getSheetByName('Cash Book'); if (!t || t.getLastRow() < 2) return res;
  const cutoff = Utilities.formatDate(new Date(Date.now() - 92 * 864e5), tz, 'yyyy-MM-dd');
  const day = (v) => v instanceof Date ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : String(v || '').slice(0, 10);
  const rows = [];
  t.getRange(2, 1, t.getLastRow() - 1, 9).getValues().forEach((r) => {
    const amt = Number(r[2]); if (!(amt > 0)) return;
    if (!all && String(r[6]).trim() !== me) return;
    let d = day(r[0]); if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) d = day(r[8]);
    const type = String(r[1]).toLowerCase().indexOf('rec') === 0 ? 'in' : 'out';
    let acct = String(r[4] || '').trim(); if (!acct || acct.toLowerCase() === 'cash') acct = 'Cash';
    const tt = res.totals[acct] || (res.totals[acct] = { in: 0, out: 0 }); tt[type] += amt;      // all-time, for "balance now"
    if (d >= cutoff) rows.push([d, type, amt, String(r[3] || ''), acct, String(r[5] || ''), String(r[6] || '')]);
  });
  rows.reverse();                                                 // newest entry first
  rows.sort(function (x, y) { return x[0] < y[0] ? 1 : x[0] > y[0] ? -1 : 0; });
  res.rows = rows.slice(0, 1500);
  return res;
}
