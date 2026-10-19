/* dropdown.js - our own smooth dropdown list instead of the phone's system picker. Part of ARTIME Stock; loaded by index.html in order. */
'use strict';
let DD = null;            // { sel, el }
function closeDropdown(now) {
  if (!DD) return;
  const el = DD.el; DD = null;
  if (now) { el.remove(); return; }
  el.classList.add('out'); setTimeout(() => el.remove(), 130);
}
function openDropdown(sel) {
  if (DD && DD.sel === sel) { closeDropdown(true); return; }
  closeDropdown(true);
  const opts = [...sel.options], box = sel.closest('label, .field, .ddwrap') || sel, r = box.getBoundingClientRect();
  const searchable = opts.length > 8;
  const el = document.createElement('div'); el.id = 'dd';
  el.innerHTML = `<div class="ddb"></div><div class="ddp" role="listbox" aria-label="${esc(sel.getAttribute('aria-label') || '')}">
    ${searchable ? `<div class="dds">${ic('search', 18)}<input type="search" placeholder="Search" autocomplete="off"></div>` : ''}
    <div class="ddl">${opts.map((o, i) => `<button type="button" class="ddo${o.selected ? ' on' : ''}" role="option" aria-selected="${o.selected}" data-i="${i}"><span>${esc(o.textContent)}</span>${o.selected ? ic('check', 18, 2.6) : ''}</button>`).join('')}</div></div>`;
  document.body.appendChild(el);
  DD = { sel, el };
  const p = el.querySelector('.ddp'), vw = window.innerWidth, vh = window.innerHeight, w = Math.min(vw - 16, Math.max(r.width, 230));
  p.style.width = w + 'px'; p.style.left = Math.max(8, Math.min(r.left, vw - w - 8)) + 'px';
  const room = vh - r.bottom - 12, up = room < 240 && r.top > room;           // no room below: open upwards
  p.style.maxHeight = Math.max(180, Math.min(vh * 0.6, up ? r.top - 12 : room)) + 'px';
  if (up) { p.style.bottom = (vh - r.top + 6) + 'px'; p.classList.add('up'); } else p.style.top = (r.bottom + 6) + 'px';
  const on = el.querySelector('.ddo.on'), list = el.querySelector('.ddl'); if (on && list) list.scrollTop = Math.max(0, on.offsetTop - list.clientHeight / 2 + on.offsetHeight / 2);   // show the chosen option
  const inp = el.querySelector('.dds input');
  if (inp) inp.addEventListener('input', () => { const q = inp.value.trim().toLowerCase(); el.querySelectorAll('.ddo').forEach((b) => { b.style.display = !q || b.textContent.toLowerCase().includes(q) ? '' : 'none'; }); });
}
document.addEventListener('click', (ev) => {
  const t = ev.target; if (!t || !t.closest) return;
  const o = t.closest('#dd .ddo');
  if (o && DD) {                                           // choose an option: the real <select> changes, so every screen works as before
    const sel = DD.sel, i = Number(o.dataset.i);
    closeDropdown(); sel.selectedIndex = i;
    sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); return;
  }
  if (t.closest('#dd .ddb')) { closeDropdown(); return; }
  if (t.closest('#dd')) return;
  const own = t.closest('select'), wrap = own || (t.closest('label.catsel, label.sel, .ddwrap, .field') || {}).querySelector && t.closest('label.catsel, label.sel, .ddwrap, .field').querySelector('select');
  if (wrap && !wrap.disabled && !wrap.dataset.native) { ev.preventDefault(); ev.stopPropagation(); openDropdown(wrap); }
}, true);
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && DD) { closeDropdown(); return; }
  const t = ev.target; if (t && t.tagName === 'SELECT' && (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'ArrowDown') && !t.dataset.native) { ev.preventDefault(); openDropdown(t); }
});
window.addEventListener('resize', () => closeDropdown(true));
