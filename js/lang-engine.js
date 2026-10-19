/* lang-engine.js - Hindi engine: swaps screen text for Hindi when Hindi is chosen. Part of ARTIME Stock; loaded by index.html in order. */
'use strict';
const trAge = (s) => s.replace(/^just now$/, 'अभी').replace(/^(\d+) min ago$/, '$1 मिनट पहले').replace(/^(\d+) h ago$/, '$1 घंटे पहले');
const HI_RULES = [
  [/^Show more \((\d+)\)$/, (m) => 'और दिखाएँ (' + m[1] + ')'],
  [/^(\d+) (?:entry|entries)$/, (m) => m[1] + ' एंट्री'],
  [/^(\d+) (?:dial|dials) · (.+?)(?: · by (.+))?$/, (m) => m[1] + ' डायल · ' + T(m[2]) + (m[3] ? ' · ' + m[3] + ' द्वारा' : '')],
  [/^(\d+) inside Dial Out$/, (m) => m[1] + ' डायल आउट के अंदर'],
  [/^by (.+)$/, (m) => m[1] + ' द्वारा'],
  [/^(\d+) min$/, (m) => m[1] + ' मिनट'],
  [/^(.+) · by (.+) · you can change it for (\d+) more min$/, (m) => T(m[1]) + ' · ' + m[2] + ' द्वारा · ' + m[3] + ' मिनट और बदल सकते हैं'],
  [/^(\d+) out of stock$/, (m) => m[1] + ' स्टॉक खत्म'],
  [/^Last sync: (.+)$/, (m) => 'आख़िरी सिंक: ' + trAge(m[1])],
  [/^New version v(\d+) is ready$/, (m) => 'नया वर्ज़न v' + m[1] + ' तैयार है'],
  [/^Version v(\d+)$/, (m) => 'वर्ज़न v' + m[1]],
  [/^(\d+) items? · (.+)$/, (m) => m[1] + ' आइटम · ' + m[2]],
  [/^Stock (\S+) · Min (\S+)$/, (m) => 'स्टॉक ' + m[1] + ' · न्यूनतम ' + m[2]],
  [/^(\d+) Out of Stock$/, (m) => m[1] + ' स्टॉक खत्म'],
  [/^(\d+) Reorder Soon$/, (m) => m[1] + ' जल्द ऑर्डर करें'],
  [/^Order all from (.+)$/, (m) => m[1] + ' से सब ऑर्डर करें'],
  [/^You are using version v(\d+)\. Update to get the newest features and fixes\. Your saved entries are kept\.$/, (m) => 'आप वर्ज़न v' + m[1] + ' इस्तेमाल कर रहे हैं। नई सुविधाओं के लिए अपडेट करें। आपकी सेव एंट्री सुरक्षित रहती हैं।'],
  [/^You already have the latest version \(v(\d+)\)\.$/, (m) => 'आपके पास सबसे नया वर्ज़न (v' + m[1] + ') है।'],
  [/^Updating to version v(\d+)…$/, (m) => 'वर्ज़न v' + m[1] + ' पर अपडेट हो रहा है…'],
  [/^Balance for (.+)$/, (m) => T(m[1]) + ' का बैलेंस'],
  [/^Last (\d+) days$/, (m) => 'पिछले ' + m[1] + ' दिन'],
  [/^Stock - Last (\d+) days$/, (m) => 'स्टॉक - पिछले ' + m[1] + ' दिन'],
  [/^Checking… (\d+)s$/, (m) => 'जाँच हो रही है… ' + m[1] + ' सेकंड'],
  [/^No connection \((.*)\)\. Check the internet and the Payments link, then try again\.$/, (m) => 'कनेक्शन नहीं है (' + m[1] + ')। इंटरनेट और भुगतान लिंक जाँचें, फिर कोशिश करें।'],
  [/^The Payments link returned an error \(HTTP (\d+)\)\..*$/, (m) => 'भुगतान लिंक ने एरर दिया (HTTP ' + m[1] + ')। डिप्लॉयमेंट जाँचें: Execute as Me, access Anyone।'],
  [/^Welcome (.+)$/, (m) => 'स्वागत है ' + m[1]],
  [/^(Today|Yesterday)(, .*)?$/, (m) => T(m[1]) + (m[2] || '')],
  [/^(\d+) min ago$/, (m) => m[1] + ' मिनट पहले'],
  [/^(\d+) h ago$/, (m) => m[1] + ' घंटे पहले'],
  [/^Logged in as (.+)$/, (m) => 'लॉगिन: ' + m[1]],
  [/^(.+?) - (\S+) Inch$/, (m) => T(m[1]) + ' - ' + m[2] + ' इंच'],
  [/^(\S+) Inch$/, (m) => m[1] + ' इंच'],
  [/^(\d+) (?:entry|entries) waiting to sync\. Tap to retry$/, (m) => m[1] + ' एंट्री सिंक के लिए रुकी हैं। दोबारा कोशिश के लिए दबाएँ'],
  [/^(.+) Tap to retry$/, (m) => T(m[1]) + ' दोबारा कोशिश के लिए दबाएँ'],
  [/^Synced (.+)$/, (m) => 'सिंक हुआ: ' + trAge(m[1])],
  [/^(\d+) items?$/, (m) => m[1] + ' आइटम'],
  [/^(\d+) items, (.+) in stock$/, (m) => m[1] + ' आइटम, ' + m[2] + ' स्टॉक में'],
  [/^(\d+) need attention$/, (m) => m[1] + ' पर ध्यान चाहिए'],
  [/^(\d+) items? to order$/, (m) => m[1] + ' आइटम ऑर्डर करने हैं'],
  [/^(.*) - without (.*)$/, (m) => m[1] + ' - बिना ' + m[2]],
  [/^Without (.+)$/, (m) => 'बिना ' + m[1]],
  [/^Reordered (.+) · (.+)$/, (m) => 'ऑर्डर किया ' + m[1] + ' · ' + T(m[2])],
  [/^Reorder (.+)$/, (m) => 'ऑर्डर करें: ' + m[1]],
  [/^(.+) · Stock (.+) · Min (.+)$/, (m) => m[1] + ' · स्टॉक ' + U(m[2]) + ' · न्यूनतम ' + U(m[3])],
  [/^Max available: (.+)$/, (m) => 'ज़्यादा से ज़्यादा उपलब्ध: ' + T(m[1])],
  [/^Only (.+) available\.$/, (m) => 'सिर्फ़ ' + T(m[1]) + ' उपलब्ध।'],
  [/^Stock now (.+)$/, (m) => 'अभी स्टॉक ' + T(m[1])],
  [/^Tick the parts that go out for (\S+) dials?$/, (m) => m[1] + ' डायल के लिए जो पार्ट्स निकलेंगे उन्हें चुनें'],
  [/^Not enough (.+)\. Stock will go below zero\.$/, (m) => m[1] + ' पूरा नहीं है। स्टॉक शून्य से नीचे जाएगा।'],
  [/^Stock allows up to (\S+) dials? \(limited by (.+)\)\.$/, (m) => 'स्टॉक से ज़्यादा से ज़्यादा ' + m[1] + ' डायल बन सकते हैं (' + T(m[2]) + ' की वजह से)।'],
  [/^The sheet rejected it: (.+)$/, (m) => 'शीट ने मना कर दिया: ' + m[1]],
  [/^Saved on this phone\. (.+)$/, (m) => 'इस फ़ोन में सेव हुआ। ' + T(m[1])],
  [/^(.*?)\s*You can still pick a contact in WhatsApp\.$/, (m) => (m[1] ? T(m[1]) + ' ' : '') + 'फिर भी आप WhatsApp में कोई संपर्क चुन सकते हैं।'],
  [/^(\d+) waiting to sync$/, (m) => m[1] + ' सिंक के लिए रुकी हैं'],
  [/^(\d+) could not be saved$/, (m) => m[1] + ' सेव नहीं हो सकीं'],
  [/^(\d+) (?:entry is|entries are) still waiting to sync and not in this report yet\.$/, (m) => m[1] + ' एंट्री अभी सिंक के लिए रुकी हैं और इस रिपोर्ट में नहीं हैं।'],
  [/^(Everyone's entries|Your entries) · updated (.+)$/, (m) => T(m[1]) + ' · अपडेट: ' + m[2]],
  [/^(\d+) entries have not synced yet\. They stay on this phone until you log in again\. Log out\?$/, (m) => m[1] + ' एंट्री सिंक नहीं हुई हैं। दोबारा लॉगिन तक वे इसी फ़ोन में रहेंगी। लॉग आउट करें?']
];
const U = (s) => s.replace(/\b(Pcs|Kg|Ltr|Mtr)\b/g, (x) => HI[x]);
function T(s) {
  s = String(s); const t = s.trim(); if (!t) return s;
  let out = HI[t];
  if (out === undefined) { for (let i = 0; i < HI_RULES.length; i++) { const m = HI_RULES[i][0].exec(t); if (m) { out = HI_RULES[i][1](m); break; } } }
  if (out === undefined) { const u = U(t); if (u !== t) out = u; }
  return out === undefined ? s : s.replace(t, out);
}
window.ARTIME_tr = (s) => (lang() === 'hi' ? T(s) : s);
function trNode(root) {
  if (lang() !== 'hi' || !root) return;
  if (root.nodeType === 3) { const p = root.parentNode && root.parentNode.nodeName; if (p !== 'TEXTAREA' && p !== 'SCRIPT' && p !== 'STYLE') { const v = T(root.nodeValue); if (v !== root.nodeValue) root.nodeValue = v; } return; }
  if (root.nodeType !== 1) return;
  const w = document.createTreeWalker(root, 4 /* text */); let n; const list = [];
  while ((n = w.nextNode())) list.push(n);
  list.forEach((x) => trNode(x));
  const els = (root.matches && root.matches('[placeholder],[aria-label],[title]') ? [root] : []).concat([...root.querySelectorAll('[placeholder],[aria-label],[title]')]);
  els.forEach((el) => ['placeholder', 'aria-label', 'title'].forEach((a) => { const v = el.getAttribute(a); if (v) { const t = T(v); if (t !== v) el.setAttribute(a, t); } }));
}
const langObs = new MutationObserver((recs) => {
  if (lang() !== 'hi') return;
  recs.forEach((r) => { if (r.type === 'characterData') trNode(r.target); else r.addedNodes.forEach((n) => trNode(n)); });
  langObs.takeRecords();       // ignore our own edits
});
langObs.observe(document.body, { childList: true, subtree: true, characterData: true });
document.documentElement.lang = lang();
