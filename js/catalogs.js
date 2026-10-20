/* catalogs.js - Menu > Catalogs: share the PDF catalogs from the "catalogs" folder (WhatsApp, email, etc.). Part of ARTIME Stock; loaded by index.html in order. */
'use strict';
const CAT_FILES = {};   // PDFs already downloaded in this session, so a second share is instant
const catList = () => (Array.isArray(window.CATALOGS) ? window.CATALOGS : []).filter((c) => c && c.file);
const catUrl = (c) => new URL('catalogs/' + encodeURIComponent(c.file), document.baseURI).href;
function catalogSheetHTML() {
  const list = catList();
  const rows = list.length
    ? list.map((c, i) => `<div class="catrow"><span class="cico">${ic('file', 24, 2)}</span><span class="cm"><b>${esc(c.name || c.file)}</b><small>PDF catalog</small></span>
        <a class="catopen" href="${esc(catUrl(c))}" target="_blank" rel="noopener">Open</a>
        <button class="catshare" data-cat-share="${i}">${ic('send', 18, 2.2)}<span>Share</span></button></div>`).join('')
    : '<div class="empty" style="padding:14px">No catalogs yet. Put the PDF files in the catalogs folder and add them in catalogs/catalogs.js.</div>';
  return `<div class="scrim" data-act="close"><div class="sheet" role="dialog" aria-label="Catalogs"><div class="grab"></div>
    <h3>Catalogs</h3><p class="catsub">Pick a catalog and share it on WhatsApp, email or any app.</p>${rows}</div></div>`;
}
async function catLoad(c) {
  if (CAT_FILES[c.file]) return CAT_FILES[c.file];
  const r = await fetch(catUrl(c));
  if (!r.ok) throw new Error('missing');
  const b = await r.blob();
  return (CAT_FILES[c.file] = new File([b], c.file, { type: 'application/pdf' }));
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
    if (!e || e.name !== 'AbortError') toast(e && e.message === 'missing' ? 'File not found: catalogs/' + c.file : 'Could not share this catalog', true);
  } finally { btn.disabled = false; if (!again) lab.textContent = old; }
}
document.addEventListener('click', (ev) => {
  const t = ev.target.closest && ev.target.closest('[data-cat-open],[data-cat-share]'); if (!t) return;
  if (t.hasAttribute('data-cat-open')) { S.sheet = { type: 'catalogs' }; renderSheet(); return; }
  catShare(Number(t.getAttribute('data-cat-share')), t);
});
