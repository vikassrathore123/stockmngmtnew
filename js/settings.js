/* settings.js - Settings screens. Part of ARTIME Stock; loaded by index.html in order. */
'use strict';
/* ---------- Settings: a hub with a page for each group ---------- */
function topSub(title) { return `<header class="top center"><a class="ibtn" href="#/home" data-act="menuback" aria-label="Back">${ic('left', 26)}</a><div class="grow"><h1>${esc(title)}</h1></div><span class="spacer"></span></header>`; }
const THEME_NAMES = { light: 'Light', dark: 'Dark', system: 'System' };
const SCREEN_NAMES = { home: 'Home', items: 'Items', reports: 'Reports' };
const srow = (href, icon, title, val, sub) => `<a class="srow" href="${href}"><span class="si">${ic(icon, 22)}</span><span class="sx"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span>${val ? `<span class="sv">${val}</span>` : ''}${ic('right', 18)}</a>`;
const segBtns = (k, cur, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${cur === v ? 'on' : ''}" data-act="setv" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
const swRow = (icon, k, def, title, sub) => { const on = store.get(k, def); return `<div class="trow"><span class="si">${ic(icon, 22)}</span><span class="sx"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span><button class="sw ${on ? 'on' : ''}" role="switch" aria-checked="${on}" aria-label="${title}" data-act="tog" data-k="${k}" data-d="${def ? 1 : 0}"><i></i></button></div>`; };
const prefCard = (icon, title, body) => `<div class="card pcard"><div class="ph"><span class="si">${ic(icon, 22)}</span><b>${title}</b></div>${body}</div>`;
function connState() { return !S.url ? ['Not connected', 'warn'] : S.error ? ['Problem', 'bad'] : ['Connected', 'ok']; }

function vMore() {
  syncName();
  const nm = who(), [cs, cc] = connState();
  return `<a class="profrow" href="#/set-profile">${avatarHTML('big')}<div class="pn"><b>${nm ? esc(nm) : 'Add your name'}</b><small>${roleLine()}</small></div>${ic('right', 20)}</a>
    <div class="shead">App preferences</div>
    <div class="slist">${srow('#/set-prefs', 'globe', 'Language', lang() === 'hi' ? 'हिन्दी' : 'English')}${srow('#/set-prefs', store.get('theme', 'light') === 'dark' ? 'moon' : 'sun', 'Appearance', THEME_NAMES[store.get('theme', 'light')])}${srow('#/set-prefs', 'home', 'Default screen', SCREEN_NAMES[store.get('home', 'home')])}${srow('#/set-prefs', 'plus', 'Main action button', payFirst() ? 'Payments' : 'Stock')}</div>
    <div class="shead">Inventory & payments</div>
    <div class="slist">${srow('#/set-inv', 'cube', 'Inventory settings')}${srow('#/set-pay', 'card', 'Payment settings')}</div>
    <div class="shead">Data & sync</div>
    <div class="slist"><a class="srow" href="#/set-sheets"><span class="si">${ic('cloud', 22)}</span><span class="sx"><b>Google Sheets</b><small>Last sync: ${S.synced ? esc(ago_(S.synced)) : 'Never'}</small></span><span class="sv st-${cc}"><i class="dot"></i>${cs}</span>${ic('right', 18)}</a></div>
    <div class="shead">App & support</div>
    <div class="slist">${srow('#/set-about', 'info', 'About ARTIME')}${srow('#/set-adv', 'gear', 'Advanced settings')}</div>`;
}

function vSetProfile() {
  syncName();
  const nm = store.get('by', ''), locked = !!payName();
  return `<div class="pf"><div class="pfav">${avatarHTML('huge')}</div>
    <label class="field big"><input id="pname" placeholder="Your name" value="${esc(nm)}"${locked ? ' readonly' : ''} autocomplete="off"></label>
    <div class="field big ro"><span>${roleLine()}</span></div>
    <p class="subtle" style="text-align:center">${locked ? 'Taken automatically from your Payments login. Log out of Payments to change it.' : 'Saved on every stock entry and reorder you make. Log in to Payments and it fills in by itself.'}</p>
    <div class="pick">Choose your picture</div>${avatarPicker()}
    <button class="submit go" data-act="saveprofile">Save profile</button></div>`;
}
function vSetPrefs() {
  const th = store.get('theme', 'light'), hs = store.get('home', 'home'), nf = store.get('numfmt', 'in');
  return prefCard('globe', 'Language', `<div class="seg"><button class="${lang() === 'en' ? 'on' : ''}" data-act="lang" data-v="en">English</button><button class="${lang() === 'hi' ? 'on' : ''}" data-act="lang" data-v="hi">हिन्दी</button></div>`)
    + prefCard('sun', 'Appearance', segBtns('theme', th, [['light', 'Light'], ['dark', 'Dark'], ['system', 'System']]))
    + prefCard('home', 'Default screen', segBtns('home', hs, [['home', 'Home'], ['items', 'Items'], ['reports', 'Reports']]))
    + prefCard('plus', 'Main action button', `<div class="seg"><button class="${payFirst() ? '' : 'on'}" data-m="pref" data-v="stock">Stock</button><button class="${payFirst() ? 'on' : ''}" data-m="pref" data-v="pay">Payments</button></div><p class="subtle">The one you pick gets the big middle button and shows on Home. The other moves to the small button on the right.</p>`)
    + prefCard('layers', 'Number format', segBtns('numfmt', nf, [['in', 'Indian (1,00,000)'], ['intl', 'International (100,000)']]));
}
function vSetSheets() {
  const q = S.queue, f = S.failed, [cs, cc] = connState();
  const nm = {}; items().forEach((i) => { nm[i.code] = i.title; });
  const ent = (e, x) => `<div class="q"><span class="aic ${e.type}" style="width:38px;height:38px">${ic(e.type === 'in' ? 'up' : 'down', 18, 2.2)}</span><div class="m"><b>${e.type === 'in' ? '+' : '-'}${num(e.qty)} ${esc(nm[e.code] || e.code)}</b><small>${esc(dShort(e.date))}${e.msg ? ' - ' + esc(e.msg) : ''}</small></div><button class="x" data-act="${x}" data-id="${esc(e.id)}">Discard</button></div>`;
  const mu = store.get('money.url', '') || CFG.moneyUrl || '', u = moneyUser();
  return `<div class="card conn"><div class="ch"><span class="gs">${ic('file', 30)}</span><div><b>Connection status</b><div class="stt st-${cc}"><i class="dot"></i>${cs}</div></div></div>
      <div class="kv"><span>Last sync</span><b>${S.synced ? esc(ago_(S.synced)) : 'Never'}</b></div>
      <div class="kv"><span>Stock sheet</span><b class="st-${S.url ? 'ok' : 'warn'}"><i class="dot"></i>${S.url ? 'Connected' : 'Not connected'}</b></div>
      <div class="kv"><span>Payments sheet</span><b class="st-${mu ? 'ok' : 'warn'}"><i class="dot"></i>${mu ? 'Connected' : 'Not connected'}</b></div>
      ${S.error ? `<div class="banner bad" style="margin:8px 0 0">${esc(S.error)}</div>` : ''}</div>
    <button class="submit go" data-act="sync">${ic('refresh', 20)}Sync now</button>
    <button class="btn ghost wide" data-act="togmanage">${ic('gear', 18)}Manage connection</button>
    ${S.manage ? `<div class="card group"><h2>Stock sheet link</h2><p>Paste the Web app link that ends with /exec.</p>
      <label class="field">${ic('file', 20)}<input id="url" type="url" inputmode="url" placeholder="https://script.google.com/macros/s/.../exec" value="${esc(S.url)}" data-bind="url" autocomplete="off"></label>
      <div class="btns"><button class="btn" data-act="save-url">Save and sync</button>${CFG.scriptUrl && S.url !== CFG.scriptUrl ? '<button class="btn ghost" data-act="reset-url">Use default link</button>' : ''}</div></div>
    <div class="card group"><h2>Payments sheet link</h2><p>${u ? 'Logged in as ' + esc(u.name) : 'Not logged in'}</p>
      <label class="field">${ic('file', 20)}<input id="murl" placeholder="Payments Google Sheet link" value="${mu ? esc(mu.slice(0, 40)) + '…' : ''}" onfocus="this.value=''" autocomplete="off"></label>
      <div class="btns"><button class="btn" data-m="saveurl">Test and save link</button>${u ? '<button class="btn ghost" data-m="logout">Log out</button>' : ''}</div></div>` : ''}
    <div class="shead">Sync information</div>
    <div class="card group"><div class="kv"><span>Pending changes</span><b>${q.length + store.get('rq', []).length}</b></div><div class="kv"><span>Items cached</span><b>${S.items.length}</b></div><div class="kv"><span>Movements cached</span><b>${S.history.length}</b></div></div>
    ${q.length ? `<div class="card group"><h2>Waiting to sync</h2><p>Saved on this phone. They are sent to the sheet as soon as you are online.</p>${q.map((e) => ent(e, 'discard')).join('')}</div>` : ''}
    ${f.length ? `<div class="card group"><h2>Not saved</h2><p>The sheet rejected these entries. Fix the cause, then enter them again.</p>${f.map((e) => ent(e, 'discard-failed')).join('')}</div>` : ''}
    <div class="note ok">${ic('check', 18)}<span>All changes are saved on this phone first and synced to Google Sheets.</span></div>`;
}
function vSetInv() {
  const d = store.get('itemsDef', 'all');
  return `<div class="slist tlist">${swRow('alert', 'homeAlerts', true, 'Low stock alerts on Home', 'Show items that are running low on the Home screen')}${swRow('check', 'confirmStock', false, 'Confirm before saving', 'Ask once more before a Stock In or Stock Out is saved')}${swRow('pencil', 'reqNoteOut', false, 'Note required on Stock Out', 'Stock Out can only be saved with a note')}</div>`
    + prefCard('cube', 'Items page opens with', segBtns('itemsDef', d, [['all', 'All items'], ['alert', 'Needs attention']]));
}
function vSetPay() {
  const pm = store.get('payMode', 'last'), pd = store.get('payDate', 'today');
  return prefCard('cash', 'Payment mode', segBtns('payMode', pm, [['last', 'Last used'], ['cash', 'Cash'], ['bank', 'Bank']]))
    + prefCard('cal', 'Date on a new entry', segBtns('payDate', pd, [['today', 'Today'], ['yesterday', 'Yesterday']]))
    + `<div class="slist tlist">${swRow('pencil', 'payReqNote', false, 'Note required', 'A payment can only be saved with a note')}${swRow('check', 'payConfirm', false, 'Confirm before saving', 'Ask once more before a payment is saved')}</div>`;
}
function vSetAdv() {
  const installable = S.installEvt && !isStandalone(), ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !isStandalone();
  return `<div class="shead">Local data</div>
    <div class="card group"><div class="kv"><span>Items cached</span><b>${S.items.length}</b></div><div class="kv"><span>Movements cached</span><b>${S.history.length}</b></div>
      <button class="btn ghost wide" data-act="refresh">${ic('refresh', 18)}Reload from sheet</button>
      <button class="btn ghost wide danger" data-act="upforce">${ic('alert', 18)}Clear cache and reload</button>
      <p class="subtle">This forgets the saved app files and loads fresh ones. Entries waiting to sync and everything in Google Sheets stay safe.</p></div>
    <div class="slist tlist">${swRow('download', 'updAlert', true, 'Update reminder', 'Show a message on Home when a new version is available')}</div>
    <div class="card group"><h2>Install app</h2><p>${isStandalone() ? 'Installed. You are using the app version.' : installable ? 'Add ARTIME Stock to your home screen so it opens like a normal app.' : ios ? 'On iPhone: tap the Share button, then Add to Home Screen.' : 'Use your browser menu and choose Install app or Add to Home screen.'}</p>
      ${installable ? `<div class="btns"><button class="btn" data-act="install">${ic('download', 18)}Install</button></div>` : ''}</div>`;
}
function vSetAbout() {
  return `<div class="about"><div class="abicon">${ic('cube', 40, 1.8)}</div><h2>${esc(APP_NAME)}</h2><p>${esc(TAGLINE)}</p><span class="ver">Version v${APP_VER}</span></div>
    <div class="card group"><h2>App update</h2><p>You are using version v${APP_VER}. Update to get the newest features and fixes. Your saved entries are kept.</p>
      <div class="btns"><button class="btn" data-act="upcheck">Update to latest version</button></div><div class="hint" id="upmsg"></div></div>`;
}
