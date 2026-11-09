/* catalogs.js - Menu > Catalogs: share the PDF catalogs from the "catalogs" folder (WhatsApp, email, etc.). Part of ARTIME Stock; loaded by index.html in order. */
'use strict';
const CAT_FILES = {};   // PDFs already downloaded in this session, so a second share is instant
const catList = () => (Array.isArray(window.CATALOGS) ? window.CATALOGS : []).filter((c) => c && c.file);
const catGuide = () => (window.CATALOG_GUIDE && window.CATALOG_GUIDE.file ? window.CATALOG_GUIDE : null);
const catMime = (c) => (/\.jpe?g$/i.test(c.file) ? 'image/jpeg' : /\.png$/i.test(c.file) ? 'image/png' : 'application/pdf');
const catUrl = (c) => new URL('Catalogs/' + encodeURIComponent(c.file), document.baseURI).href;
function catalogSheetHTML() {
  const list = catList();
  const rows = list.length
    ? list.map((c, i) => `<div class="catrow"><span class="cico">${ic('file', 24, 2)}</span><span class="cm"><b>${esc(c.name || c.file)}</b><small>PDF catalog</small></span>
        <a class="catopen" href="${esc(catUrl(c))}" target="_blank" rel="noopener">Open</a>
        <button class="catshare" data-cat-share="${i}">${ic('send', 18, 2.2)}<span>Share</span></button></div>`).join('')
    : '<div class="empty" style="padding:14px">No catalogs yet. Put the PDF files in the catalogs folder and add them in catalogs/catalogs.js.</div>';
  setTimeout(catProbe, 0);
  return `<div class="scrim" data-act="close"><div class="sheet" role="dialog" aria-label="Catalogs"><div class="grab"></div>
    <h3>Catalogs</h3><p class="catsub">Pick a catalog and share it on WhatsApp, email or any app.</p>
    ${list.length > 1 ? `<button class="catall" data-cat-all="1">${ic('send', 20, 2.2)}<span><b>Share all catalogs</b><small>${list.length} PDFs${catGuide() && CAT_FILES[catGuide().file] ? ' + how-to picture' : ''} in one go</small></span></button>` : ''}${rows}</div></div>`;
}
let CAT_PROBED = false;
async function catProbe() {                                  // is the how-to picture in the folder? Then say so on the button
  const g = catGuide(); if (!g || CAT_PROBED) return; CAT_PROBED = true;
  try { await catLoad(g); const s = document.querySelector('[data-cat-all] small'); if (s) s.textContent = catList().length + ' PDFs + how-to picture in one go'; } catch (e) { /* not added yet */ }
}
async function catLoad(c) {
  if (CAT_FILES[c.file]) return CAT_FILES[c.file];
  const r = await fetch(catUrl(c));
  if (!r.ok) throw new Error('missing');
  const b = await r.blob();
  return (CAT_FILES[c.file] = new File([b], c.file, { type: catMime(c) }));
}
async function catShare(i, btn) {
  const c = catList()[i]; if (!c || btn.disabled) return;
  const lab = btn.querySelector('span'), old = lab.textContent; let again = false;
  btn.disabled = true; if (!CAT_FILES[c.file]) lab.textContent = 'Preparing...';
  try {
    const f = await catLoad(c);
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      try { await navigator.share({ files: [f], title: c.name || c.file }); }
      catch (e) {
        if (e && e.name === 'NotAllowedError') { again = true; lab.textContent = 'Tap again'; }   // the phone wants a fresh tap after the download; the file is ready now
        else if (!e || e.name !== 'AbortError') throw e;
      }
    } else if (navigator.share) {
      await navigator.share({ title: c.name || c.file, url: catUrl(c) });
    } else {
      const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = c.file; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast('Catalog downloaded');
    }
  } catch (e) {
    if (!e || e.name !== 'AbortError') toast(e && e.message === 'missing' ? 'File not found: Catalogs/' + c.file : 'Could not share this catalog', true);
  } finally { btn.disabled = false; if (!again) lab.textContent = old; }
}
async function catShareAll(btn) {                         // every PDF (and the how-to picture, first) in ONE share
  if (btn.disabled) return;
  const lab = btn.querySelector('b'), sm = btn.querySelector('small'), old = lab.textContent, oldSm = sm.textContent; let again = false;
  const pdfs = catList(), guide = catGuide();
  btn.disabled = true;
  try {
    const files = []; let n = 0;
    if (guide) { try { files.push(await catLoad(guide)); } catch (e) { /* no picture yet: the PDFs are still sent */ } }
    for (const c of pdfs) { if (!CAT_FILES[c.file]) sm.textContent = 'Preparing ' + (++n) + ' of ' + pdfs.filter((x) => !CAT_FILES[x.file]).length + '…'; files.push(await catLoad(c)); }
    const mb = files.reduce((t, f) => t + f.size, 0) / 1048576;
    const text = APP_NAME + ' catalogs' + (guide && files[0] && files[0].type.indexOf('image') === 0 ? ' - see the picture to open the wholesale catalog' : '');
    if (navigator.canShare && navigator.canShare({ files })) {
      try { await navigator.share({ files, title: APP_NAME + ' catalogs', text }); }
      catch (e) {
        if (e && e.name === 'NotAllowedError') { again = true; lab.textContent = 'Ready: tap to send'; sm.textContent = files.length + ' files, ' + Math.round(mb) + ' MB'; }   // the downloads took a while; the files are ready now
        else if (!e || e.name !== 'AbortError') throw e;
      }
    } else if (navigator.share) {
      toast('This phone cannot send many files at once. Share them one by one.', true);
    } else {
      files.forEach((f, i) => setTimeout(() => { const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }, i * 600));
      toast(files.length + ' files downloaded');
    }
  } catch (e) {
    if (!e || e.name !== 'AbortError') toast(e && e.message === 'missing' ? 'A catalog file is missing in the Catalogs folder' : 'Could not share the catalogs', true);
  } finally { btn.disabled = false; if (!again) { lab.textContent = old; sm.textContent = oldSm; } }
}
document.addEventListener('click', (ev) => {
  const all = ev.target.closest && ev.target.closest('[data-cat-all]'); if (all) { catShareAll(all); return; }
  const t = ev.target.closest && ev.target.closest('[data-cat-open],[data-cat-share]'); if (!t) return;
  if (t.hasAttribute('data-cat-open')) { S.sheet = { type: 'catalogs' }; renderSheet(); return; }
  catShare(Number(t.getAttribute('data-cat-share')), t);
});
