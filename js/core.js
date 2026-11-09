/* core.js - Settings, small helpers, the saved-data store, language switch. Part of ARTIME Stock; loaded by index.html in order. */
'use strict';
const CFG = window.APP_CONFIG || {};
const APP_NAME = CFG.appName || 'ARTIME';
const TAGLINE = CFG.tagline || 'Stock Management';
const CLOCK_ITEMS = ['Clock Hands', 'PVC Ring', 'PVC Paper', 'Glass', 'Iron Ring', 'Machine', 'Iron Plate', 'Tikkla'];
// Dial = a stand-alone item (no category). It is never bought, only made: one dial uses 1 each of Clock Hands, PVC Ring, PVC Paper, Glass, Iron Ring, Machine, Iron Plate and Tikkla of its size.
// The Google Sheet ("Dial Recipe" tab) does the real deduction; this list is only used to show the parts on screen.
const isDial = (c) => /^DIL-/.test(c || '');
const isFormRoute = (n) => n === 'in' || n === 'out' || n === 'dial';
function dialParts(code) {
  const sz = String(code).slice(4); const s = (sz === '12' || sz === '18') ? '12-18' : sz;
  return ['HND-' + s, 'PVR-' + s, 'HPVP-' + s, 'RPVP-' + s, 'GLS-' + s, 'IRR-' + s, 'MCH-ALL', 'IRP-' + s, sz === '06' ? 'TIK-06' : 'TIK-08-18'];
}
const DIAL_PART_NAMES = ['Clock Hands', 'PVC Ring', 'PVC Paper Hindi', 'PVC Paper Roman', 'Glass', 'Iron Ring', 'Machine', 'Iron Plate', 'Tikkla'];
// Positions 2 and 3 are the two paper types. A dial uses ONE of them, so the form treats them as a pick-one pair (Hindi / Roman).
const PAPER_IDX = { H: 2, R: 3 };
// A dial out with some parts left out carries a tag like [-TIK-08-18] in its note.
// The Google Sheet ("Dial Recipe" tab) reads that tag and does not deduct that part.
const skipTok = (c) => '[-' + c + ']';
const skippedOf = (note) => { const out = []; String(note || '').replace(/\[-([A-Z0-9-]+)\]/g, (m, c) => { out.push(c); return m; }); return out; };
const cleanNote = (note) => String(note || '').replace(/\s*\[-[A-Z0-9-]+\]/g, '').trim();
const CAT_NAME = { clock: 'Clock Items', packing: 'Packaging Items' };

/* ================= helpers ================= */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n) => Number(n || 0).toLocaleString((() => { try { return JSON.parse(localStorage.getItem('artime.numfmt')) === 'intl' ? 'en-US' : 'en-IN'; } catch (e) { return 'en-IN'; } })(), { maximumFractionDigits: 2 });
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');
const uniq = (a) => [...new Set(a)];
const iso = (d) => d.toLocaleDateString('en-CA');
const today = () => iso(new Date());
const ago = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
const parseISO = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const dLong = (s) => parseISO(s).toLocaleDateString(loc(), { day: '2-digit', month: 'short', year: 'numeric' });
const dShort = (s) => parseISO(s).toLocaleDateString(loc(), { day: 'numeric', month: 'short' });
const dRel = (s) => (s === today() ? 'Today' : s === ago(1) ? 'Yesterday' : dShort(s));
const sizeLabel = (s) => (!s || s === 'n/a' ? '' : String(s).replace(/\s*in$/i, ' Inch'));
const unitLabel = (u) => cap(u || 'pcs');
const isStandalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
const newId = () => 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6).padEnd(4, '0');

const store = {
  get(k, d) { try { const v = localStorage.getItem('artime.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('artime.' + k, JSON.stringify(v)); } catch (e) { /* storage full or blocked */ } }
};

/* ================= language (English / Hindi) =================
   The screens are written in English. When Hindi is chosen, every piece of text on screen is swapped
   using this list, so no screen can be forgotten and the English version never changes. */
const lang = () => (store.get('lang', 'en') === 'hi' ? 'hi' : 'en');
const loc = () => (lang() === 'hi' ? 'hi-IN' : 'en-GB');
