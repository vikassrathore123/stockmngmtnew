/* money-link.js - Link to the Payments module (loads only when used), small settings helpers. Part of ARTIME Stock; loaded by index.html in order. */
'use strict';
function moneyUser() { try { return JSON.parse(localStorage.getItem('artime.money.user')) || null; } catch (e) { return null; } }
function roleLine() { const u = moneyUser(); return u ? (u.admin ? 'Admin · Logged in to Payments' : 'Staff · Logged in to Payments') : 'Not logged in to Payments'; }
function langSeg() {
  const hi = lang() === 'hi';
  return `<div class="seg"><button class="${hi ? '' : 'on'}" data-act="lang" data-v="en">English</button><button class="${hi ? 'on' : ''}" data-act="lang" data-v="hi">हिन्दी</button></div>`;
}
function prefHTML() {
  syncName();
  const nm = who(), byName = esc(store.get('by', '')), locked = !!payName(), u = moneyUser();
  const pay = store.get('pref', 'stock') === 'pay', mu = store.get('money.url', '') || (window.APP_CONFIG && APP_CONFIG.moneyUrl) || '';
  return `<div class="card profile"><div class="prow">${avatarHTML('big')}<div class="pn"><b>${nm ? esc(nm) : 'Add your name'}</b><small>${roleLine()}</small></div></div>
      <div class="pick">Choose your picture</div>${avatarPicker()}</div>
    <div class="sethead">Preferences</div>
    <div class="card prefcard"><b>Language</b><small>Choose the language of the app.</small>${langSeg()}</div>
    <div class="card prefcard"><b>Your name</b><small>${locked ? 'Taken automatically from your Payments login. Log out of Payments to change it.' : 'Saved on every stock entry and reorder you make. Log in to Payments and it fills in by itself.'}</small>
      <input placeholder="Your name" value="${byName}"${locked ? ' readonly' : ''} onchange="store.set('by', this.value.trim())"></div>
    <div class="card prefcard"><b>Main button</b><small>The one you pick gets the big middle button and shows on Home. The other moves to the small button on the right.</small>
      <div class="seg"><button class="${pay ? '' : 'on'}" data-m="pref" data-v="stock">Stock <i class="dot b"></i></button><button class="${pay ? 'on g' : ''}" data-m="pref" data-v="pay">Payments <i class="dot g"></i></button></div></div>
    <div class="sethead">Payments</div>
    <div class="card prefcard"><b>Payments</b><small>${u ? 'Logged in as ' + esc(u.name) : 'Not logged in'}</small><small class="${mu ? 'okc' : ''}">${mu ? 'Sheet connected' : 'No sheet link yet'}</small>
      <input id="murl" placeholder="Payments Google Sheet link" value="${mu ? esc(mu.slice(0, 40)) + '…' : ''}" onfocus="this.value=''">
      <div class="seg"><button data-m="saveurl">Test and save link</button>${u ? '<button data-m="logout">Log out</button>' : ''}</div></div>`;
}
function withMoney(cb) {
  if (window.Money) return cb();
  const sc = document.createElement('script'); sc.src = 'money.js'; sc.onload = cb;
  sc.onerror = () => alert('Payments could not load. Check your connection.'); document.head.appendChild(sc);
}
document.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-m]'); if (!b) return;
  if (b.dataset.m === 'pref') { store.set('pref', b.dataset.v); render(); return; }
  withMoney(() => window.Money.act(b.dataset.m, b));
});
try { if ((JSON.parse(localStorage.getItem('artime.money.q')) || []).length) withMoney(() => window.Money.boot()); } catch (e) { /* ignore */ }
