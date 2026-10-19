/* icons.js - Icons and item pictures. Part of ARTIME Stock; loaded by index.html in order. */
'use strict';
/* ================= icons ================= */
const P = {
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.6v.01"/>',
  cloud: '<path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 10.5a3.8 3.8 0 0 1-.5 7.5z"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/><path d="M12 14.5v2.5"/>',
  back: '<path d="M9 5h11a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 20 19H9l-6-7z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/>',
  card: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18"/><path d="M7 15h3"/>',
  send: '<path d="M21 3L10.5 13.5"/><path d="M21 3l-6.8 18-3.7-7.5L3 9.8z"/>',
  dial: '<circle cx="12" cy="12" r="9"/><path d="M12 3.8v2.2M12 18v2.2M3.8 12H6M18 12h2.2"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/>',
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5.5h4V20"/>',
  cube: '<path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  up: '<path d="M12 19V5"/><path d="M5 12l7-7 7 7"/>',
  down: '<path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  bell: '<path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 003.4 0"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  right: '<path d="M9 6l6 6-6 6"/>',
  left: '<path d="M15 6l-6 6 6 6"/>',
  chev: '<path d="M6 9l6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  truck: '<path d="M2.5 6.5h11v10h-11z"/><path d="M13.5 9.5h4l3 3.5v3.5h-7"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>',
  file: '<path d="M14 3H6.5a1 1 0 00-1 1v16a1 1 0 001 1h11a1 1 0 001-1V8z"/><path d="M14 3v5h4.5M9 13h6M9 17h6"/>',
  pencil: '<path d="M4 20l1-4L16.5 4.5a2 2 0 013 3L8 19z"/><path d="M14.5 6.5l3 3"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  chart: '<path d="M5 20v-7M11 20V5M17 20v-10"/><path d="M3 20.5h18"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><path d="M12 16.5v.5"/>',
  warn: '<path d="M12 3.5L2.5 20h19z"/><path d="M12 10v4.5M12 17.3v.4"/>',
  layers: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 17.5h7M17.5 14v7"/>',
  more: '<path d="M4 8h16M4 12h16M4 16h16"/>',
  refresh: '<path d="M20 11a8 8 0 00-14.5-3.5L4 9"/><path d="M4 4v5h5"/><path d="M4 13a8 8 0 0014.5 3.5L20 15"/><path d="M20 20v-5h-5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  cash: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.8"/><path d="M6 9.5v.01M18 14.5v.01"/>',
  bank: '<path d="M3 9.5L12 4l9 5.5z"/><path d="M5.5 11v7M10 11v7M14 11v7M18.5 11v7"/><path d="M3 20.5h18"/>',
  download: '<path d="M12 4v11"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/>'
};
const ic = (n, s = 22, sw = 1.9) => `<svg class="ic ${n === 'chev' || n === 'right' ? 'chev' : ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

/* ---- little product illustrations (48x48) ---- */
const ART = {
  dial: '<circle cx="24" cy="24" r="18" fill="#fff" stroke="#1f5fe6" stroke-width="3"/><g stroke="#1f2937" stroke-width="2.4" stroke-linecap="round"><path d="M24 9.5v3.5M24 35v3.5M9.5 24H13M35 24h3.5"/></g><g stroke="#9aa6b8" stroke-width="1.6" stroke-linecap="round"><path d="M31.2 11.5l-1.5 2.6M36.5 16.8l-2.6 1.5M36.5 31.2l-2.6-1.5M31.2 36.5l-1.5-2.6M16.8 36.5l1.5-2.6M11.5 31.2l2.6-1.5M11.5 16.8l2.6 1.5M16.8 11.5l1.5 2.6"/></g><circle cx="24" cy="24" r="2.4" fill="#1f5fe6"/>',
  box: '<path d="M24 5l17 9-17 9-17-9z" fill="#e2b87e"/><path d="M7 14l17 9v20L7 34z" fill="#c4914f"/><path d="M41 14L24 23v20l17-9z" fill="#a97a3b"/><path d="M19 8l17 9-5 2.7-17-9z" fill="#f1dfc2" opacity=".85"/>',
  thm: '<path d="M6 17l18-8 18 8-18 8z" fill="#fff" stroke="#cdd5e1"/><path d="M6 17v6l18 8v-6z" fill="#e5e9f0"/><path d="M42 17v6l-18 8v-6z" fill="#cfd6e1"/><path d="M6 25v6l18 8v-6z" fill="#dfe4ec"/><path d="M42 25v6l-18 8v-6z" fill="#c3ccd9"/>',
  hands: '<circle cx="24" cy="24" r="17" fill="#fff" stroke="#cfd6e1" stroke-width="2"/><path d="M24 24V11" stroke="#1f2937" stroke-width="3.2" stroke-linecap="round"/><path d="M24 24l9 5" stroke="#1f2937" stroke-width="3.2" stroke-linecap="round"/><circle cx="24" cy="24" r="2.6" fill="#e03a3e"/>',
  ring: '<circle cx="24" cy="24" r="14" fill="none" stroke="#d7dde6" stroke-width="7"/><circle cx="24" cy="24" r="14" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="14 74" stroke-linecap="round"/>',
  ironring: '<circle cx="24" cy="24" r="14" fill="none" stroke="#6b7685" stroke-width="7"/><circle cx="24" cy="24" r="14" fill="none" stroke="#a9b2bf" stroke-width="2" stroke-dasharray="14 74" stroke-linecap="round"/>',
  paper: '<rect x="11" y="6" width="26" height="36" rx="3" fill="#fff" stroke="#cfd6e1" stroke-width="2"/><path d="M16 15h16M16 21h16M16 27h10" stroke="#b9c2cf" stroke-width="2.4" stroke-linecap="round"/>',
  glass: '<circle cx="24" cy="24" r="16" fill="#d9ecfb" stroke="#9cc7ea" stroke-width="2"/><path d="M14 19a11 11 0 016-6" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/>',
  plate: '<ellipse cx="24" cy="29" rx="17" ry="8" fill="#6f7a89"/><ellipse cx="24" cy="25" rx="17" ry="8" fill="#a8b1bf"/><ellipse cx="24" cy="25" rx="9" ry="3.8" fill="#c9d0da"/>',
  machine: '<g stroke="#5f6b7c" stroke-width="5" stroke-linecap="round"><path d="M24 6v6M24 36v6M6 24h6M36 24h6M11.3 11.3l4.2 4.2M32.5 32.5l4.2 4.2M11.3 36.7l4.2-4.2M32.5 15.5l4.2-4.2"/></g><circle cx="24" cy="24" r="12" fill="#6f7b8d"/><circle cx="24" cy="24" r="5" fill="#e6eaf0"/>',
  tikkla: '<circle cx="16" cy="18" r="6" fill="#e9b949"/><circle cx="32" cy="18" r="6" fill="#d9a22a"/><circle cx="24" cy="31" r="6" fill="#f0c968"/>',
  kerosene: '<rect x="11" y="14" width="26" height="28" rx="5" fill="#3b82f6"/><rect x="11" y="14" width="26" height="8" rx="4" fill="#2f6fdc"/><path d="M17 14V9a3 3 0 013-3h8a3 3 0 013 3v5" fill="none" stroke="#1e50a8" stroke-width="3"/><circle cx="24" cy="31" r="5" fill="#fff" opacity=".85"/>',
  tape: '<circle cx="24" cy="24" r="16" fill="#f0a21a"/><circle cx="24" cy="24" r="7" fill="#fff"/><circle cx="24" cy="24" r="7" fill="none" stroke="#d98d0a" stroke-width="2"/>',
  battery: '<rect x="10" y="14" width="26" height="22" rx="4" fill="#22a06b"/><rect x="36" y="21" width="4" height="8" rx="1.5" fill="#22a06b"/><path d="M22 18l-4 8h5l-2 6 8-9h-5z" fill="#fff"/>',
  color: '<path d="M24 5c7 9 12 14 12 22a12 12 0 01-24 0c0-8 5-13 12-22z" fill="#b8742f"/><path d="M18 28a6 6 0 004 6" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".7"/>',
  panni: '<path d="M11 10h26l3 30H8z" fill="#cfe5f7" stroke="#9cc7ea" stroke-width="2"/><path d="M11 10h26" stroke="#7fb3df" stroke-width="3"/><path d="M17 20h14" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
  leker: '<rect x="14" y="17" width="20" height="25" rx="5" fill="#d6483f"/><rect x="19" y="8" width="10" height="10" rx="2" fill="#3b4658"/><rect x="18" y="26" width="12" height="9" rx="2" fill="#fff" opacity=".85"/>'
};
function artKey(base) {
  const b = String(base).toLowerCase();
  if (b.includes('dial')) return 'dial';
  if (b.includes('box')) return 'box';
  if (b.includes('thermacol') || b.includes('thermocol')) return 'thm';
  if (b.includes('hand')) return 'hands';
  if (b.includes('iron ring')) return 'ironring';
  if (b.includes('ring')) return 'ring';
  if (b.includes('paper')) return 'paper';
  if (b.includes('glass')) return 'glass';
  if (b.includes('plate')) return 'plate';
  if (b.includes('machine')) return 'machine';
  if (b.includes('tikkla')) return 'tikkla';
  if (b.includes('kerosene')) return 'kerosene';
  if (b.includes('tape')) return 'tape';
  if (b.includes('battery')) return 'battery';
  if (b.includes('color') || b.includes('colour')) return 'color';
  if (b.includes('panni')) return 'panni';
  if (b.includes('leker')) return 'leker';
  return 'box';
}
const art = (base, size = 56) => `<span class="art" style="width:${size}px;height:${size}px"><svg viewBox="0 0 48 48" width="${Math.round(size * 0.78)}" height="${Math.round(size * 0.78)}" aria-hidden="true">${ART[artKey(base)]}</svg></span>`;
