/* avatars.js - Profile pictures (classic and anime). Part of ARTIME Stock; loaded by index.html in order. */
'use strict';
/* ---------- Settings: profile, language, preferences, payments link (payments code loads only when used) ---------- */
const AVATARS = [['🦁', '#f59e0b', '#ef4444'], ['🐯', '#fb923c', '#f43f5e'], ['🐼', '#64748b', '#1e293b'], ['🦊', '#fb923c', '#c2410c'], ['🐻', '#a16207', '#78350f'], ['🦉', '#8b5cf6', '#4338ca'],
  ['🐬', '#06b6d4', '#1d4ed8'], ['🦄', '#ec4899', '#8b5cf6'], ['🚀', '#3b82f6', '#1e3a8a'], ['🎯', '#ef4444', '#7f1d1d'], ['🌟', '#facc15', '#f97316'], ['🌈', '#34d399', '#3b82f6'],
  ['⚡', '#fbbf24', '#d97706'], ['🌸', '#f472b6', '#be185d'], ['🍀', '#4ade80', '#15803d'], ['🔥', '#fb7185', '#dc2626']];
/* ---- original anime-style characters and cute animals (drawn here, not taken from any show) ---- */
// Original anime-style characters (not copied from any show): a face, eyes, hair style and one accessory each.
function animeSVG(c) {
  const skin = c.skin || '#ffe3cf', hair = c.hair, shade = c.shade || 'rgba(0,0,0,.14)', eye = c.eye, out = c.out || '#4f6df5';
  const eyes = [25, 39].map((x) => `<ellipse cx="${x}" cy="36.5" rx="3.9" ry="4.9" fill="#fff"/><ellipse cx="${x}" cy="37" rx="2.9" ry="4.1" fill="${eye}"/><ellipse cx="${x}" cy="37.4" rx="1.5" ry="2.5" fill="#1b1b2b"/><circle cx="${x - 1.1}" cy="35.2" r="1.25" fill="#fff"/><circle cx="${x + 1}" cy="39" r=".6" fill="#fff"/><path d="M${x - 4.6} 33.6 Q${x} 30.6 ${x + 4.6} 33.6" fill="none" stroke="#2a2233" stroke-width="1.5" stroke-linecap="round"/>`).join('');
  const brows = `<path d="M20.5 29.5 Q25 27.6 29 29.2M35 29.2 Q39 27.6 43.5 29.5" fill="none" stroke="${hair}" stroke-width="1.3" stroke-linecap="round"/>`;
  const face = `<ellipse cx="18.2" cy="37" rx="2.2" ry="3" fill="${skin}"/><ellipse cx="45.8" cy="37" rx="2.2" ry="3" fill="${skin}"/><rect x="28" y="44" width="8" height="10" fill="${skin}"/><rect x="28" y="44" width="8" height="4" fill="${shade}"/><path d="M17 36 C17 24 23 19 32 19 C41 19 47 24 47 36 C47 45 40 50.5 32 50.5 C24 50.5 17 45 17 36Z" fill="${skin}"/>`;
  const cheeks = `<ellipse cx="22" cy="42" rx="3" ry="1.7" fill="#ff8fa3" opacity=".42"/><ellipse cx="42" cy="42" rx="3" ry="1.7" fill="#ff8fa3" opacity=".42"/>`;
  const mouth = c.grin ? `<path d="M28.5 44.6 Q32 49 35.5 44.6 Z" fill="#7a2e3a"/>` : `<path d="M29 45 Q32 47.4 35 45" fill="none" stroke="#b5483f" stroke-width="1.3" stroke-linecap="round"/>`;
  const body = `<path d="M8 66 C8 55 20 50.5 32 50.5 C44 50.5 56 55 56 66Z" fill="${out}"/><path d="M26 50.6 L32 57 L38 50.6" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.6" stroke-linejoin="round"/>`;
  const bangs = `M16 37 C14 20 23 12 32 12 C41 12 50 20 48 37 C46.5 31 44 27.5 40.5 25.5 C38 29 34 29.5 31.5 25 C29 28.5 24.5 29 23.4 25.4 C19.6 27.4 17.4 31.5 16 37Z`;
  let back = '', front = `<path d="${bangs}" fill="${hair}"/><path d="M24 22.5 C28 19.5 36 19.5 40 22.5" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="1.6" stroke-linecap="round"/>`, acc = '';
  switch (c.style) {
    case 'spiky':
      front = `<path d="M15.5 38 C12 22 19 11 32 10 C45 11 52 22 48.5 38 C47 32 44.5 28 41 25.5 L39 30 L35 24 L31.5 30 L27 24.5 L24 30 L21 25.5 C18 28 16.5 33 15.5 38Z" fill="${hair}"/><path d="M19 15 L12 3 L27 10Z M29 11 L31 -2 L38 10Z M39 11 L50 2 L47 16Z M45 20 L58 14 L49 27Z M19 21 L6 17 L16 29Z" fill="${hair}"/>`; break;
    case 'twin':
      back = `<ellipse cx="9.5" cy="44" rx="6.2" ry="15" fill="${hair}" transform="rotate(12 9.5 44)"/><ellipse cx="54.5" cy="44" rx="6.2" ry="15" fill="${hair}" transform="rotate(-12 54.5 44)"/><path d="M14 38 C12 14 52 14 50 38Z" fill="${hair}"/>`;
      acc = `<circle cx="14" cy="27" r="3.2" fill="${c.acc || '#ff3b6b'}"/><circle cx="50" cy="27" r="3.2" fill="${c.acc || '#ff3b6b'}"/>`; break;
    case 'long':
      back = `<path d="M13 40 C10 8 54 8 51 40 L55 66 L9 66Z" fill="${hair}"/>`;
      acc = c.acc ? `<path d="M44 20 l1.6 3.4 3.7.5 -2.7 2.6 .7 3.7 -3.3 -1.8 -3.3 1.8 .7 -3.7 -2.7 -2.6 3.7 -.5z" fill="${c.acc}"/>` : ''; break;
    case 'pony':
      back = `<path d="M44 20 C60 14 66 34 56 50 C58 36 52 28 44 28Z" fill="${hair}"/><path d="M14 38 C12 14 52 14 50 38Z" fill="${hair}"/>`;
      acc = `<circle cx="47" cy="22.5" r="3" fill="${c.acc || '#ff9f1c'}"/>`; break;
    case 'messy':
      front = `<circle cx="22.5" cy="16.5" r="7" fill="${hair}"/><circle cx="32" cy="12.5" r="8" fill="${hair}"/><circle cx="41.5" cy="16.5" r="7" fill="${hair}"/><path d="M15.5 38 C12.5 22 20 12.5 32 12.5 C44 12.5 51.5 22 48.5 38 C47 32 45 28.5 41.5 26 L40 31 L36 25 L32 31 L28 25.5 L24 30.5 L22 26 C18.5 28.5 16.8 33 15.5 38Z" fill="${hair}"/><path d="M26 17 C29 15 35 15 38 17" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="1.6" stroke-linecap="round"/>`; break;
    case 'bob':
      back = `<path d="M13 40 C11 10 53 10 51 40 L52 53 Q32 58 12 53Z" fill="${hair}"/>`; break;
    case 'bun':
      back = `<circle cx="16.5" cy="17" r="7.5" fill="${hair}"/><circle cx="47.5" cy="17" r="7.5" fill="${hair}"/><path d="M14 38 C12 14 52 14 50 38Z" fill="${hair}"/>`;
      acc = `<circle cx="16.5" cy="17" r="2.2" fill="${c.acc || '#fb7185'}"/><circle cx="47.5" cy="17" r="2.2" fill="${c.acc || '#fb7185'}"/>`; break;
    case 'topknot':
      back = `<circle cx="32" cy="8.5" r="5.8" fill="${hair}"/><rect x="29" y="12" width="6" height="6" fill="${hair}"/>`;
      acc = `<rect x="28.5" y="12.2" width="7" height="3" rx="1.2" fill="${c.acc || '#f8fafc'}"/>`; break;
    case 'cat':
      back = `<path d="M15 21 L16 4 L29 13Z" fill="${hair}"/><path d="M49 21 L48 4 L35 13Z" fill="${hair}"/><path d="M18.2 17 L18.6 8.5 L24.5 13.5Z" fill="#ff9db5"/><path d="M45.8 17 L45.4 8.5 L39.5 13.5Z" fill="#ff9db5"/><path d="M14 40 C12 14 52 14 50 40 L50 46 L14 46Z" fill="${hair}"/>`; break;
    case 'witch':
      back = `<path d="M13 40 C10 10 54 10 51 40 L53 64 L11 64Z" fill="${hair}"/>`;
      acc = `<ellipse cx="32" cy="17.5" rx="21" ry="5.2" fill="${c.acc || '#5b3cc4'}"/><path d="M20 17 C22 8 28 0 36 -6 C35 2 40 9 44 17Z" fill="${c.acc || '#5b3cc4'}"/><path d="M20.2 15.4 Q32 19.6 43.8 15.4 L44 17.6 Q32 21.6 20 17.6Z" fill="#f5b301"/><path d="M32 4.2 l1.3 2.7 3 .4 -2.2 2.1 .5 3 -2.6 -1.4 -2.6 1.4 .5 -3 -2.2 -2.1 3 -.4z" fill="#ffe27a"/>`; break;
  }
  if (c.band) acc += `<path d="M15.8 26.5 Q32 20.4 48.2 26.5 L48 30.6 Q32 24.8 16 30.6Z" fill="${c.band}"/><rect x="29.2" y="23.4" width="5.6" height="5" rx="1.2" fill="#e5e7eb" opacity=".9"/><path d="M48 28 L56 24 L53 31Z M48 29 L57 31 L52 35Z" fill="${c.band}"/>`;
  if (c.halo) acc += `<ellipse cx="32" cy="8" rx="13" ry="3.8" fill="none" stroke="#fde047" stroke-width="2.6"/><ellipse cx="32" cy="8" rx="13" ry="3.8" fill="none" stroke="#fff7b0" stroke-width=".8" opacity=".9"/>`;
  if (c.horns) acc += `<path d="M18 22 L14 8 L26 17Z" fill="#ef4444"/><path d="M46 22 L50 8 L38 17Z" fill="#ef4444"/>`;
  if (c.phones) acc += `<path d="M14.5 36 C12 12 52 12 49.5 36" fill="none" stroke="#374151" stroke-width="3.4" stroke-linecap="round"/><rect x="10" y="32" width="7" height="13" rx="3.4" fill="${c.phones}"/><rect x="47" y="32" width="7" height="13" rx="3.4" fill="${c.phones}"/>`;
  if (c.cap) acc += `<path d="M14.5 27 C14 11 50 11 49.5 27Z" fill="${c.cap}"/><path d="M12 27 Q34 31.5 56 25.5 L55 29.5 Q34 36 12 31Z" fill="rgba(0,0,0,.28)"/><circle cx="32" cy="12.5" r="1.8" fill="rgba(255,255,255,.7)"/>`;
  if (c.crown) acc += `<path d="M20 15 L22.5 4 L27.5 11 L32 2.5 L36.5 11 L41.5 4 L44 15Z" fill="#fbbf24" stroke="#f59e0b" stroke-width="1"/><circle cx="32" cy="7.5" r="1.7" fill="#ef4444"/><circle cx="23" cy="9" r="1.3" fill="#38bdf8"/><circle cx="41" cy="9" r="1.3" fill="#22c55e"/>`;
  if (c.bow) acc += `<path d="M47 14 L55 9 L54 19Z M47 14 L39 9 L40 19Z" fill="${c.bow}"/><circle cx="47" cy="14" r="2.4" fill="${c.bow}" stroke="rgba(0,0,0,.15)"/>`;
  if (c.earring) acc += `<circle cx="18.2" cy="42" r="1.9" fill="#fbbf24"/>`;
  if (c.goggles) acc += `<path d="M15.5 21 Q32 14.5 48.5 21" fill="none" stroke="#374151" stroke-width="3"/><circle cx="25" cy="18.5" r="5" fill="#7dd3fc" stroke="#374151" stroke-width="2"/><circle cx="39" cy="18.5" r="5" fill="#7dd3fc" stroke="#374151" stroke-width="2"/><circle cx="23.5" cy="17" r="1.4" fill="#fff" opacity=".85"/><circle cx="37.5" cy="17" r="1.4" fill="#fff" opacity=".85"/>`;
  if (c.glasses) acc += `<circle cx="25" cy="37" r="6.6" fill="rgba(255,255,255,.18)" stroke="#2f2a3a" stroke-width="1.6"/><circle cx="39" cy="37" r="6.6" fill="rgba(255,255,255,.18)" stroke="#2f2a3a" stroke-width="1.6"/><path d="M31.6 36.6 H32.4" stroke="#2f2a3a" stroke-width="1.6"/>`;
  if (c.tie) acc += `<path d="M29 51 L35 51 L34 54 L36.5 63 L32 66 L27.5 63 L30 54Z" fill="${c.tie}"/>`;
  if (c.mask) acc += `<path d="M17.5 40.5 C24 46.5 40 46.5 46.5 40.5 L45.5 49.6 C38.5 55 25.5 55 18.5 49.6Z" fill="${c.mask}"/><path d="M19 43 C26 48 38 48 45 43" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>`;
  if (c.scarf) acc += `<path d="M20 49 C26 54 38 54 44 49 L46 55 C38 60 26 60 18 55Z" fill="${c.scarf}"/><path d="M40 55 L45 66 L38 66 L36 57Z" fill="${c.scarf}"/>`;
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${back}${body}${face}${cheeks}${eyes}${brows}${c.mask ? '' : mouth}${front}${acc}</svg>`;
}
const ANIME = [
  { n: 'Kenji', bg: ['#38bdf8', '#6366f1'], c: { style: 'spiky', hair: '#1f2937', eye: '#8b5a2b', out: '#3b82f6', band: '#e11d48', grin: 1 } },
  { n: 'Sakura', bg: ['#f9a8d4', '#fb7185'], c: { style: 'twin', hair: '#ff8fb8', eye: '#d6336c', out: '#fff1f5', acc: '#ef4444' } },
  { n: 'Ryu', bg: ['#2dd4bf', '#0f766e'], c: { style: 'spiky', hair: '#2563eb', eye: '#14b8a6', out: '#1f2937', scarf: '#ef4444' } },
  { n: 'Mika', bg: ['#c4b5fd', '#ec4899'], c: { style: 'cat', hair: '#7c3aed', eye: '#f5b301', out: '#f472b6', grin: 1 } },
  { n: 'Aoi', bg: ['#a5f3fc', '#3b82f6'], c: { style: 'long', hair: '#0d9488', eye: '#0ea5e9', out: '#e0f2fe', acc: '#fde047' } },
  { n: 'Hana', bg: ['#fde68a', '#fb923c'], c: { style: 'pony', hair: '#f5c542', eye: '#16a34a', out: '#fb923c', acc: '#e11d48', grin: 1 } },
  { n: 'Taro', bg: ['#86efac', '#16a34a'], c: { style: 'messy', hair: '#6b4423', eye: '#3b2f2f', out: '#22c55e', glasses: 1 } },
  { n: 'Yuki', bg: ['#e0f2fe', '#818cf8'], c: { style: 'messy', hair: '#e5e7eb', shade: 'rgba(80,90,130,.16)', eye: '#60a5fa', out: '#111827', scarf: '#93c5fd' } },
  { n: 'Rei', bg: ['#fdba74', '#ef4444'], c: { style: 'spiky', hair: '#dc2626', eye: '#f97316', out: '#1d4ed8', goggles: 1, grin: 1 } },
  { n: 'Luna', bg: ['#4c1d95', '#1e1b4b'], c: { style: 'witch', hair: '#3b1f6e', eye: '#a78bfa', out: '#7c3aed', acc: '#5b3cc4' } }
  ,
  { n: 'Hikari', bg: ['#fef9c3', '#fda4af'], c: { style: 'long', hair: '#f5c542', eye: '#38bdf8', out: '#ffffff', halo: 1, acc: '' } },
  { n: 'Kage', bg: ['#64748b', '#0f172a'], c: { style: 'spiky', hair: '#111827', eye: '#ef4444', out: '#1e293b', mask: '#334155', band: '#94a3b8' } },
  { n: 'Akira', bg: ['#fecaca', '#dc2626'], c: { style: 'topknot', hair: '#1f2937', eye: '#22d3ee', out: '#b91c1c', grin: 1 } },
  { n: 'Nana', bg: ['#a7f3d0', '#06b6d4'], c: { style: 'bob', hair: '#c026d3', eye: '#22c55e', out: '#0ea5e9', phones: '#f43f5e' } },
  { n: 'Daichi', bg: ['#bae6fd', '#0284c7'], c: { style: 'plain', hair: '#7c4a21', eye: '#6b4423', out: '#f8fafc', cap: '#f97316', grin: 1 } },
  { n: 'Mio', bg: ['#fbcfe8', '#a78bfa'], c: { style: 'bob', hair: '#14b8a6', eye: '#a855f7', out: '#f9a8d4', bow: '#f43f5e' } },
  { n: 'Ren', bg: ['#cbd5e1', '#475569'], c: { style: 'messy', hair: '#0f172a', eye: '#64748b', out: '#1e3a8a', tie: '#ef4444', earring: 1 } },
  { n: 'Emi', bg: ['#fda4af', '#7f1d1d'], c: { style: 'bun', hair: '#18181b', eye: '#ef4444', out: '#7f1d1d', horns: 1, grin: 1, acc: '#ef4444' } },
  { n: 'Kai', bg: ['#99f6e4', '#2563eb'], c: { style: 'spiky', hair: '#38bdf8', eye: '#1d4ed8', out: '#0f172a', phones: '#22d3ee' } },
  { n: 'Sora', bg: ['#e9d5ff', '#6366f1'], c: { style: 'long', hair: '#e5e7eb', shade: 'rgba(80,90,130,.16)', eye: '#a78bfa', out: '#6366f1', acc: '#f472b6' } },
  { n: 'Prince', bg: ['#fde68a', '#7c3aed'], c: { style: 'messy', hair: '#fbbf24', eye: '#2563eb', out: '#7c3aed', crown: 1, grin: 1 } }
];

function animalSVG(k) {
  const eyes = (x1, x2, y, col) => `<circle cx="${x1}" cy="${y}" r="3.1" fill="${col || '#1f2937'}"/><circle cx="${x2}" cy="${y}" r="3.1" fill="${col || '#1f2937'}"/><circle cx="${x1 - 1}" cy="${y - 1.1}" r="1.1" fill="#fff"/><circle cx="${x2 - 1}" cy="${y - 1.1}" r="1.1" fill="#fff"/>`;
  const blush = (y) => `<ellipse cx="19" cy="${y}" rx="3.2" ry="1.9" fill="#ff8fa3" opacity=".5"/><ellipse cx="45" cy="${y}" rx="3.2" ry="1.9" fill="#ff8fa3" opacity=".5"/>`;
  const nose = (col) => `<path d="M29.5 41 Q32 39.4 34.5 41 Q32 44.4 29.5 41Z" fill="${col || '#1f2937'}"/>`;
  const mouth = `<path d="M32 43.6 Q29.6 47.6 26.4 45.6 M32 43.6 Q34.4 47.6 37.6 45.6" fill="none" stroke="#1f2937" stroke-width="1.4" stroke-linecap="round"/>`;
  const whisk = `<path d="M14 40 L5 38 M14 44 L5 45 M50 40 L59 38 M50 44 L59 45" stroke="#1f2937" stroke-width="1.1" stroke-linecap="round" opacity=".55"/>`;
  const head = (col) => `<ellipse cx="32" cy="38" rx="21" ry="18.5" fill="${col}"/>`;
  switch (k) {
    case 'cat': return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M12 30 L12 8 L28 19Z M52 30 L52 8 L36 19Z" fill="#f59e0b"/><path d="M15.5 24 L15.5 13 L23.5 19Z M48.5 24 L48.5 13 L40.5 19Z" fill="#fda4af"/>${head('#fbbf24')}<path d="M32 19.5 V27 M26 20.5 L27.5 26 M38 20.5 L36.5 26" stroke="#d97706" stroke-width="2.2" stroke-linecap="round"/><ellipse cx="32" cy="45" rx="9" ry="6.5" fill="#fff7ed"/>${eyes(24, 40, 36)}${nose('#f43f5e')}${mouth}${whisk}${blush(42)}</svg>`;
    case 'dog': return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><ellipse cx="11" cy="32" rx="8" ry="16" fill="#7c4a21" transform="rotate(14 11 32)"/><ellipse cx="53" cy="32" rx="8" ry="16" fill="#7c4a21" transform="rotate(-14 53 32)"/>${head('#e8c39e')}<ellipse cx="32" cy="46" rx="11.5" ry="9" fill="#fff4e6"/><path d="M22 28 Q27 22 31 28 Q27 35 22 28Z" fill="#7c4a21" opacity=".85"/>${eyes(24, 40, 35)}${nose('#1f2937')}<path d="M32 44 V47" stroke="#1f2937" stroke-width="1.4"/><path d="M32 47 Q29 50 26.5 47.5 M32 47 Q35 50 37.5 47.5" fill="none" stroke="#1f2937" stroke-width="1.4" stroke-linecap="round"/><path d="M29.4 49 Q32 55.5 34.6 49Z" fill="#fb7185"/>${blush(43)}</svg>`;
    case 'panda': return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><circle cx="14" cy="16" r="8" fill="#1f2937"/><circle cx="50" cy="16" r="8" fill="#1f2937"/>${head('#ffffff')}<ellipse cx="23.5" cy="36" rx="6" ry="7.6" fill="#1f2937" transform="rotate(20 23.5 36)"/><ellipse cx="40.5" cy="36" rx="6" ry="7.6" fill="#1f2937" transform="rotate(-20 40.5 36)"/>${eyes(24, 40, 36, '#1f2937').replace(/fill="#1f2937"/,'fill="#1f2937"')}<ellipse cx="32" cy="43" rx="3" ry="2.2" fill="#1f2937"/>${mouth}${blush(44)}</svg>`;
    case 'fox': return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M9 30 L10 5 L28 18Z M55 30 L54 5 L36 18Z" fill="#f97316"/><path d="M13 24 L13.6 11 L23 18.6Z M51 24 L50.4 11 L41 18.6Z" fill="#1f2937"/>${head('#fb923c')}<path d="M11 41 Q32 62 53 41 Q44 38 32 44 Q20 38 11 41Z" fill="#fff7ed"/>${eyes(24, 40, 35)}<ellipse cx="32" cy="43" rx="2.6" ry="2" fill="#1f2937"/><path d="M32 45 Q30 48 27.6 46.4 M32 45 Q34 48 36.4 46.4" fill="none" stroke="#1f2937" stroke-width="1.3" stroke-linecap="round"/>${blush(41)}</svg>`;
    case 'bunny': return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><ellipse cx="22" cy="14" rx="6.5" ry="15" fill="#fff" transform="rotate(-8 22 14)"/><ellipse cx="42" cy="14" rx="6.5" ry="15" fill="#fff" transform="rotate(8 42 14)"/><ellipse cx="22" cy="15" rx="3" ry="10.5" fill="#fbcfe8" transform="rotate(-8 22 15)"/><ellipse cx="42" cy="15" rx="3" ry="10.5" fill="#fbcfe8" transform="rotate(8 42 15)"/>${head('#ffffff')}${eyes(24, 40, 37, '#be185d')}${nose('#f472b6')}<path d="M32 43.6 Q30 47 27.4 45.6 M32 43.6 Q34 47 36.6 45.6" fill="none" stroke="#be185d" stroke-width="1.3" stroke-linecap="round"/><rect x="29.6" y="46" width="4.8" height="4.2" rx="1.2" fill="#fff" stroke="#e5e7eb" stroke-width=".8"/>${blush(43)}</svg>`;
    case 'bear': return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><circle cx="13" cy="17" r="8.5" fill="#92400e"/><circle cx="51" cy="17" r="8.5" fill="#92400e"/><circle cx="13" cy="17" r="4.2" fill="#fcd9b6"/><circle cx="51" cy="17" r="4.2" fill="#fcd9b6"/>${head('#b45309')}<ellipse cx="32" cy="45" rx="10.5" ry="8" fill="#fcd9b6"/>${eyes(24, 40, 35)}${nose('#1f2937')}<path d="M32 43 V46 M32 46 Q29.5 49 27 47 M32 46 Q34.5 49 37 47" fill="none" stroke="#1f2937" stroke-width="1.3" stroke-linecap="round"/>${blush(42)}</svg>`;
  }
}
const ANIMALS = [
  { n: 'Cat', bg: ['#fde68a', '#f59e0b'], k: 'cat' }, { n: 'Dog', bg: ['#bae6fd', '#38bdf8'], k: 'dog' }, { n: 'Panda', bg: ['#bbf7d0', '#22c55e'], k: 'panda' },
  { n: 'Fox', bg: ['#fed7aa', '#ea580c'], k: 'fox' }, { n: 'Bunny', bg: ['#fbcfe8', '#ec4899'], k: 'bunny' }, { n: 'Bear', bg: ['#fde68a', '#b45309'], k: 'bear' }
];

const ANIME_START = AVATARS.length;
ANIME.forEach((x) => AVATARS.push([null, x.bg[0], x.bg[1], animeSVG(x.c)]));
const ANIMAL_START = AVATARS.length;
ANIMALS.forEach((x) => AVATARS.push([null, x.bg[0], x.bg[1], animalSVG(x.k)]));
function avatarHTML(cls) {
  const id = (store.get('avatars', {}) || {})[who() || '_'], nm = who(), x = AVATARS[id];
  return x && x[3] ? `<span class="av anime ${cls || ''}" style="background:linear-gradient(135deg,${x[1]},${x[2]})">${x[3]}</span>` : x ? `<span class="av emo ${cls || ''}" style="background:linear-gradient(135deg,${x[1]},${x[2]})">${x[0]}</span>` : `<span class="av ${cls || ''}">${esc((nm || '?')[0].toUpperCase())}</span>`;
}
function avatarPicker() {
  const cur = (store.get('avatars', {}) || {})[who() || '_'];
  const opt = (x, i) => `<button class="avopt ${cur === i ? 'on' : ''}" data-act="avatar" data-v="${i}" aria-label="Picture ${i + 1}"><span class="av ${x[3] ? 'anime' : 'emo'}" style="background:linear-gradient(135deg,${x[1]},${x[2]})">${x[3] || x[0]}</span></button>`;
  const ini = `<button class="avopt ${cur === undefined ? 'on' : ''}" data-act="avatar" data-v="-1" aria-label="Initial"><span class="av">${esc((who() || '?')[0].toUpperCase())}</span></button>`;
  const grp = (label, from, to, first) => `<div class="avlab">${label}</div><div class="avgrid">${first || ''}${AVATARS.map((x, i) => (i >= from && i < to ? opt(x, i) : '')).join('')}</div>`;
  return grp('Anime', ANIME_START, ANIMAL_START) + grp('Animals', ANIMAL_START, AVATARS.length) + grp('Classic', 0, ANIME_START, ini);
}
