/* ARTIME Stock - PWA front end. Talks to the Google Apps Script web app (no password). */
(() => {
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
  return ['HND-' + s, 'PVR-' + s, 'PVP-' + s, 'GLS-' + s, 'IRR-' + s, 'MCH-ALL', 'IRP-' + s, sz === '06' ? 'TIK-06' : 'TIK-08-18'];
}
const DIAL_PART_NAMES = ['Clock Hands', 'PVC Ring', 'PVC Paper', 'Glass', 'Iron Ring', 'Machine', 'Iron Plate', 'Tikkla'];
// A dial out with some parts left out carries a tag like [-TIK-08-18] in its note.
// The Google Sheet ("Dial Recipe" tab) reads that tag and does not deduct that part.
const skipTok = (c) => '[-' + c + ']';
const skippedOf = (note) => { const out = []; String(note || '').replace(/\[-([A-Z0-9-]+)\]/g, (m, c) => { out.push(c); return m; }); return out; };
const cleanNote = (note) => String(note || '').replace(/\s*\[-[A-Z0-9-]+\]/g, '').trim();
const CAT_NAME = { clock: 'Clock Items', packing: 'Packaging Items' };

/* ================= helpers ================= */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
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
const HI = {
  'Home': 'होम', 'Items': 'आइटम', 'Stock': 'स्टॉक', 'Payments': 'भुगतान', 'Reports': 'रिपोर्ट', 'Report': 'रिपोर्ट', 'Settings': 'सेटिंग्स',
  'Categories': 'श्रेणियाँ', 'Back': 'वापस', 'Menu': 'मेन्यू', 'Search': 'खोजें', 'Stock Management': 'स्टॉक प्रबंधन',
  'Total Items': 'कुल आइटम', 'Total Stock': 'कुल स्टॉक', 'Out of Stock': 'स्टॉक खत्म', 'Reorder Soon': 'जल्द ऑर्डर करें', 'In Stock': 'स्टॉक में', 'No Entries': 'कोई एंट्री नहीं', 'Reorder': 'ऑर्डर करें',
  'View and manage all items': 'सभी आइटम देखें और संभालें', 'Manage item categories': 'आइटम की श्रेणियाँ संभालें',
  'Low Stock Alerts': 'कम स्टॉक अलर्ट', 'View All': 'सभी देखें', 'Recent Stock Activity': 'हाल की स्टॉक गतिविधि', 'Stock Overview': 'स्टॉक सारांश',
  'Last 7 Days': 'पिछले 7 दिन', 'Last 14 Days': 'पिछले 14 दिन', 'Last 30 Days': 'पिछले 30 दिन', 'Last 90 Days': 'पिछले 90 दिन',
  'Nothing is running low': 'कुछ भी कम नहीं है', 'Items show here when they reach their reorder level.': 'आइटम रीऑर्डर स्तर पर पहुँचते ही यहाँ दिखेंगे।',
  'No movements yet': 'अभी कोई लेन-देन नहीं', 'Add your first Stock In or Stock Out.': 'अपना पहला स्टॉक इन या स्टॉक आउट जोड़ें।',
  'No Google Sheets link yet.': 'अभी Google Sheets लिंक नहीं है।', 'Add it in More': 'सेटिंग्स में जोड़ें',
  'Loading your stock...': 'आपका स्टॉक लोड हो रहा है...', 'One moment.': 'एक पल।', 'No stock data yet': 'अभी स्टॉक डेटा नहीं',
  'Tap the sync line above to load from Google Sheets.': 'Google Sheets से लोड करने के लिए ऊपर की सिंक लाइन दबाएँ।',
  'Install ARTIME Stock': 'ARTIME Stock इंस्टॉल करें', 'Opens full screen like a normal app': 'सामान्य ऐप की तरह फुल स्क्रीन में खुलेगा', 'Install': 'इंस्टॉल करें',
  'Saving to Google Sheets...': 'Google Sheets में सेव हो रहा है...', 'Updating...': 'अपडेट हो रहा है...', 'Not synced yet. Tap to load': 'अभी सिंक नहीं हुआ। लोड करने के लिए दबाएँ',
  'Could not reach Google Sheets. Check the link in More.': 'Google Sheets तक नहीं पहुँच सके। सेटिंग्स में लिंक जाँचें।', 'You are offline.': 'आप ऑफ़लाइन हैं।',
  'The Google Sheets link did not answer correctly. Check it is deployed for "Anyone".': 'Google Sheets लिंक ने सही जवाब नहीं दिया। जाँचें कि वह "Anyone" के लिए डिप्लॉय है।',
  'Dial Out': 'डायल आउट', 'Stock In': 'स्टॉक इन', 'Stock Out': 'स्टॉक आउट', 'Waiting to sync': 'सिंक के लिए रुका है', 'Today': 'आज', 'Yesterday': 'कल', 'Total In': 'कुल इन', 'Total Out': 'कुल आउट',
  'Search item or code': 'आइटम या कोड खोजें', 'All': 'सभी', 'Packaging Items': 'पैकेजिंग आइटम', 'Clock Items': 'घड़ी के आइटम', 'Any status': 'कोई भी स्थिति', 'Needs attention': 'ध्यान चाहिए',
  'No items loaded': 'कोई आइटम लोड नहीं', 'Open Home and tap the sync line.': 'होम खोलें और सिंक लाइन दबाएँ।', 'No items match': 'कोई आइटम मेल नहीं खाता', 'Try a different search or filter.': 'दूसरी खोज या फ़िल्टर आज़माएँ।',
  'All good': 'सब ठीक है', 'Stock movement over time': 'समय के साथ स्टॉक की आवाजाही', 'Most used': 'सबसे ज़्यादा इस्तेमाल', 'No stock out in this period.': 'इस अवधि में कोई स्टॉक आउट नहीं।',
  'All movements': 'सभी लेन-देन', 'No movements': 'कोई लेन-देन नहीं', 'Nothing recorded in this period.': 'इस अवधि में कुछ दर्ज नहीं हुआ।',
  'Item': 'आइटम', 'Size': 'साइज़', 'Type': 'प्रकार', 'Quantity': 'मात्रा', 'Date': 'तारीख', 'Supplier': 'सप्लायर', 'Used for': 'किसके लिए', 'Reference No.': 'रेफ़रेंस नंबर', 'Notes': 'नोट', 'Note': 'नोट', '(optional)': '(वैकल्पिक)',
  'Supplier name': 'सप्लायर का नाम', 'Order, Sample...': 'ऑर्डर, सैंपल...', 'Invoice / GRN No.': 'इनवॉइस / GRN नंबर', 'Voucher / Order No.': 'वाउचर / ऑर्डर नंबर', 'Add notes...': 'नोट लिखें...',
  'Add Stock In': 'स्टॉक इन जोड़ें', 'Remove Stock Out': 'स्टॉक आउट करें', 'Record Dial Out': 'डायल आउट दर्ज करें', 'Dial size': 'डायल साइज़', 'How many dials': 'कितने डायल', 'Production': 'प्रोडक्शन',
  'Make dials - the parts go out together': 'डायल बनाएँ - पार्ट्स साथ में निकलते हैं', 'Add incoming stock to inventory': 'आया हुआ स्टॉक जोड़ें', 'Remove stock from inventory': 'स्टॉक बाहर निकालें',
  'Add incoming stock': 'आया हुआ स्टॉक जोड़ें', 'Record outgoing stock': 'बाहर गया स्टॉक दर्ज करें', 'Make dials - all parts go out together': 'डायल बनाएँ - सभी पार्ट्स साथ निकलते हैं',
  'Current Stock': 'मौजूदा स्टॉक', 'Reorder Level': 'रीऑर्डर स्तर', 'Unit': 'यूनिट', 'No matching item.': 'कोई मेल खाता आइटम नहीं।', 'No items loaded yet. Go back and sync first.': 'अभी कोई आइटम लोड नहीं। वापस जाकर पहले सिंक करें।',
  'Choose an item.': 'आइटम चुनें।', 'Enter a quantity above 0.': '0 से ज़्यादा मात्रा डालें।', 'This item is out of stock.': 'यह आइटम स्टॉक में नहीं है।',
  'No dial items loaded yet. Go back and sync first.': 'अभी कोई डायल आइटम लोड नहीं। वापस जाकर पहले सिंक करें।', 'Choose a dial size.': 'डायल साइज़ चुनें।', 'Tick at least one part.': 'कम से कम एक पार्ट चुनें।',
  'Select all': 'सभी चुनें', 'Clear all': 'सभी हटाएँ', 'Not used': 'इस्तेमाल नहीं', 'Pcs': 'नग', 'Kg': 'किलो', 'Ltr': 'लीटर', 'Mtr': 'मीटर',
  'Clock Hands': 'घड़ी की सुइयाँ', 'PVC Ring': 'PVC रिंग', 'PVC Paper': 'PVC पेपर', 'Glass': 'काँच', 'Iron Ring': 'आयरन रिंग', 'Machine': 'मशीन', 'Iron Plate': 'आयरन प्लेट', 'Tikkla': 'टिक्कला',
  'Added to Stock In': 'स्टॉक इन में जुड़ गया', 'Added to Stock Out': 'स्टॉक आउट में जुड़ गया', 'Dial Out recorded': 'डायल आउट दर्ज हुआ', 'Not added': 'जुड़ा नहीं',
  'Saving to Google Sheets in background': 'Google Sheets में पीछे सेव हो रहा है', 'Saved on this phone. It will sync when you are online.': 'इस फ़ोन में सेव हुआ। ऑनलाइन होते ही सिंक हो जाएगा।',
  'All parts for this size were taken out': 'इस साइज़ के सभी पार्ट्स निकाले गए', 'OK': 'ठीक है', 'New entry': 'नई एंट्री', 'Recent movements': 'हाल के लेन-देन', 'No movements for this item yet.': 'इस आइटम का अभी कोई लेन-देन नहीं।',
  'Message': 'संदेश', 'Send on WhatsApp': 'WhatsApp पर भेजें', 'Cancel': 'रद्द करें', 'To:': 'किसको:', 'just now': 'अभी',
  'Reading supplier from the sheet...': 'शीट से सप्लायर पढ़ रहे हैं...', 'No WhatsApp number for this item in the Reorder Setup sheet.': 'Reorder Setup शीट में इस आइटम का WhatsApp नंबर नहीं है।',
  'This code is not filled in the Reorder Setup sheet.': 'यह कोड Reorder Setup शीट में भरा नहीं है।', 'Enter a quantity': 'मात्रा डालें', 'Reorder had a problem. Nothing was lost.': 'ऑर्डर में दिक्कत आई। कुछ नहीं खोया।',
  'Link saved': 'लिंक सेव हुआ', 'App installed': 'ऐप इंस्टॉल हो गया', 'That does not look like a Web app link ending in /exec.': 'यह /exec पर खत्म होने वाला Web app लिंक नहीं लगता।',
  /* side menu + settings */
  'new': 'नया', 'Good morning': 'सुप्रभात', 'Good afternoon': 'नमस्कार', 'Good evening': 'शुभ संध्या', 'Choose your picture': 'अपनी तस्वीर चुनें', 'Stock in': 'स्टॉक इन', 'Stock out': 'स्टॉक आउट', 'To reorder': 'ऑर्डर करना है',
  'Payments today': 'आज के भुगतान', 'Record money in or out': 'पैसा आया या गया दर्ज करें', 'Share summary': 'सारांश शेयर करें', 'Download Excel (CSV)': 'Excel (CSV) डाउनलोड करें', 'Dials made': 'बने डायल', 'Most received': 'सबसे ज़्यादा आया',
  'Nothing here': 'यहाँ कुछ नहीं', 'No entries in this period.': 'इस अवधि में कोई एंट्री नहीं।', 'Search item, supplier or note': 'आइटम, सप्लायर या नोट खोजें', 'Search party, bank or note': 'पार्टी, बैंक या नोट खोजें',
  'Save Payment In': 'पैसा आया सेव करें', 'Save Payment Out': 'पैसा गया सेव करें', 'Clear': 'हटाएँ', 'All accounts': 'सभी खाते', 'Day by day': 'दिन-दिन का हिसाब', 'Top parties': 'मुख्य पार्टियाँ', 'Compared with yesterday': 'कल से तुलना', 'Compared with the period before': 'पिछली अवधि से तुलना',
  'Payment In': 'पैसा आया', 'Payment Out': 'पैसा गया', 'Money received': 'मिला हुआ पैसा', 'Money paid': 'दिया हुआ पैसा', 'New payment': 'नया भुगतान',
  'Stock Overview': 'स्टॉक की स्थिति', 'Items and alerts': 'आइटम और अलर्ट', 'Items that are low or out of stock': 'जो आइटम कम या खत्म हैं', 'Received today': 'आज मिला', 'Paid today': 'आज दिया', 'Net today': 'आज का नेट',
  'Recent payments': 'हाल के भुगतान', 'Full report': 'पूरी रिपोर्ट', 'Log in to see payments': 'भुगतान देखने के लिए लॉगिन करें', 'Enter PIN': 'PIN डालें', 'Enter PIN to load totals': 'हिसाब लोड करने के लिए PIN डालें',
  'Admin · Logged in to Payments': 'एडमिन · भुगतान में लॉगिन', 'Staff · Logged in to Payments': 'स्टाफ · भुगतान में लॉगिन', 'Not logged in to Payments': 'भुगतान में लॉगिन नहीं',
  'Add your name': 'अपना नाम जोड़ें', 'Today at a glance': 'आज एक नज़र में', 'In today': 'आज इन', 'Out today': 'आज आउट', 'To reorder': 'ऑर्डर करना है',
  'Tools': 'टूल्स', 'Reorder List': 'ऑर्डर सूची', 'Nothing to order': 'ऑर्डर करने को कुछ नहीं', 'Items that are low or out of stock': 'जो आइटम कम या खत्म हैं',
  'Make dials, choose the parts': 'डायल बनाएँ, पार्ट्स चुनें', 'Payments Report': 'भुगतान रिपोर्ट', 'Cash and bank totals': 'नकद और बैंक का हिसाब',
  'Language': 'भाषा', 'App': 'ऐप', 'Name, language, links, install': 'नाम, भाषा, लिंक, इंस्टॉल', 'Sync now': 'अभी सिंक करें', 'No supplier set': 'सप्लायर तय नहीं',
  'Preferences': 'पसंद', 'Choose the language of the app.': 'ऐप की भाषा चुनें।', 'Your name': 'आपका नाम',
  'Taken automatically from your Payments login. Log out of Payments to change it.': 'भुगतान लॉगिन से अपने-आप लिया गया है। बदलने के लिए भुगतान से लॉग आउट करें।',
  'Saved on every stock entry and reorder you make. Log in to Payments and it fills in by itself.': 'हर स्टॉक एंट्री और ऑर्डर पर सेव होता है। भुगतान में लॉगिन करते ही अपने-आप भर जाएगा।',
  'Main button': 'मुख्य बटन', 'The one you pick gets the big middle button and shows on Home. The other moves to the small button on the right.': 'जिसे चुनेंगे उसे बीच का बड़ा बटन मिलेगा और वही होम पर दिखेगा। दूसरा दाईं ओर छोटे बटन में चला जाएगा।',
  'Logged in as': 'लॉगिन:', 'Not logged in': 'लॉगिन नहीं', 'Sheet connected': 'शीट जुड़ी है', 'No sheet link yet': 'अभी शीट लिंक नहीं', 'Payments Google Sheet link': 'भुगतान Google Sheet का लिंक',
  'Test and save link': 'लिंक जाँचकर सेव करें', 'Log out': 'लॉग आउट', 'Stock sheet': 'स्टॉक शीट', 'Google Sheet connection': 'Google Sheet कनेक्शन', 'Paste the Web app link that ends with /exec.': '/exec पर खत्म होने वाला Web app लिंक यहाँ चिपकाएँ।',
  'Save and sync': 'सेव करके सिंक करें', 'Use default link': 'डिफ़ॉल्ट लिंक इस्तेमाल करें', 'Last sync': 'आख़िरी सिंक', 'Never': 'कभी नहीं',
  'Data on this phone': 'इस फ़ोन का डेटा', 'Saved on this phone. They are sent to the sheet as soon as you are online.': 'इस फ़ोन में सेव हैं। ऑनलाइन होते ही शीट में भेज दिए जाएँगे।', 'Everything is saved to the sheet.': 'सब कुछ शीट में सेव है।',
  'Discard': 'हटाएँ', 'Not saved': 'सेव नहीं हुए', 'The sheet rejected these entries. Fix the cause, then enter them again.': 'शीट ने ये एंट्री मना कर दीं। कारण ठीक करके दोबारा डालें।',
  'Install app': 'ऐप इंस्टॉल करें', 'Installed. You are using the app version.': 'इंस्टॉल है। आप ऐप वर्ज़न इस्तेमाल कर रहे हैं।', 'Add ARTIME Stock to your home screen so it opens like a normal app.': 'ARTIME Stock को होम स्क्रीन पर जोड़ें ताकि यह सामान्य ऐप की तरह खुले।',
  'On iPhone: tap the Share button, then Add to Home Screen.': 'iPhone पर: Share बटन दबाएँ, फिर Add to Home Screen।', 'Use your browser menu and choose Install app or Add to Home screen.': 'ब्राउज़र मेन्यू में Install app या Add to Home screen चुनें।',
  'This phone': 'यह फ़ोन', 'Items cached': 'सेव किए आइटम', 'Movements cached': 'सेव किए लेन-देन', 'Reload from sheet': 'शीट से दोबारा लोड करें', 'App version': 'ऐप वर्ज़न', 'About': 'जानकारी',
  /* payments */
  'Payments had a problem': 'भुगतान में दिक्कत आई', 'Retry': 'फिर कोशिश करें', 'No payments sheet link yet': 'अभी भुगतान शीट का लिंक नहीं', 'Add the Payments Google Sheet link in Settings.': 'सेटिंग्स में भुगतान Google Sheet का लिंक जोड़ें।',
  'Open Settings': 'सेटिंग्स खोलें', 'Enter your PIN': 'अपना PIN डालें', 'Test connection': 'कनेक्शन जाँचें', 'Payments sheet is reachable ✓': 'भुगतान शीट से कनेक्शन ठीक है ✓', 'Not reachable': 'पहुँच नहीं सके', 'Only the first time on this phone.': 'इस फ़ोन पर सिर्फ़ पहली बार।', 'PIN': 'PIN', 'Continue': 'आगे बढ़ें',
  'Cash and bank entries': 'नकद और बैंक की एंट्री', 'Received': 'मिला', 'Paid': 'दिया', 'Amount': 'राशि', 'Cash or bank': 'नकद या बैंक', 'Cash': 'नकद', 'Bank': 'बैंक', 'Which bank': 'कौन सा बैंक', 'Bank name': 'बैंक का नाम',
  'Party / name': 'पार्टी / नाम', 'Who paid or who was paid': 'किसने दिया या किसे दिया', 'Add note...': 'नोट लिखें...', 'Save Received': 'मिला हुआ सेव करें', 'Save Paid': 'दिया हुआ सेव करें',
  'All synced ✓': 'सब सिंक हो गया ✓', 'waiting': 'रुका है', 'held': 'होल्ड पर', 'saved': 'सेव', 'Syncing…': 'सिंक हो रहा है…', 'Delete': 'मिटाएँ',
  '7 Days': '7 दिन', '30 Days': '30 दिन', 'This month': 'इस महीने', 'Enter your PIN to see reports': 'रिपोर्ट देखने के लिए PIN डालें', 'Asked once, so the report can be read safely from the sheet.': 'सिर्फ़ एक बार पूछा जाता है ताकि रिपोर्ट शीट से सुरक्षित पढ़ी जा सके।',
  'Show report': 'रिपोर्ट दिखाएँ', 'Refresh': 'रिफ़्रेश', 'Loading…': 'लोड हो रहा है…', 'Loading report…': 'रिपोर्ट लोड हो रही है…', 'No report yet': 'अभी कोई रिपोर्ट नहीं', 'Tap Refresh to load it from the sheet.': 'शीट से लोड करने के लिए Refresh दबाएँ।',
  'Balance': 'बैलेंस', 'Cash and banks': 'नकद और बैंक', 'Received and paid in this period. Right side = balance now (all time).': 'इस अवधि में मिला और दिया। दाईं ओर = अभी का बैलेंस (कुल)।', 'Balance now': 'अभी का बैलेंस',
  'Entries': 'एंट्री', 'No entries': 'कोई एंट्री नहीं', 'Report could not be shown': 'रिपोर्ट नहीं दिख सकी', "Everyone's entries": 'सभी की एंट्री', 'Your entries': 'आपकी एंट्री',
  'Saved on this phone': 'इस फ़ोन में सेव हुआ', 'Logged out': 'लॉग आउट हो गया', 'Enter an amount': 'राशि डालें', 'Choose or type the bank': 'बैंक चुनें या लिखें', 'Checking…': 'जाँच हो रही है…',
  'No connection. Try again.': 'कनेक्शन नहीं है। फिर कोशिश करें।', 'Wrong PIN': 'गलत PIN', 'Connected ✓': 'जुड़ गया ✓', 'Could not connect. Your old link is kept.': 'जुड़ नहीं सके। पुराना लिंक रखा गया है।',
  'That does not look like a Google Apps Script link.': 'यह Google Apps Script का लिंक नहीं लगता।', 'No connection. Showing the last saved report.': 'कनेक्शन नहीं है। आख़िरी सेव की हुई रिपोर्ट दिख रही है।',
  'Something went wrong in Payments. Your saved entries are safe.': 'भुगतान में कुछ गड़बड़ हुई। आपकी सेव एंट्री सुरक्षित हैं।', 'That PIN belongs to someone else.': 'यह PIN किसी और का है।',
  'This PIN has no name in the Users tab. Type the name in the Name column.': 'इस PIN के आगे Users टैब में नाम नहीं है। Name कॉलम में नाम लिखें।', 'The Payments link did not answer correctly. Use the link ending in /exec, deployed for Anyone.': 'भुगतान लिंक ने सही जवाब नहीं दिया। /exec पर खत्म होने वाला लिंक इस्तेमाल करें, जो Anyone के लिए डिप्लॉय हो।', 'User list unavailable. Try again later.': 'यूज़र सूची उपलब्ध नहीं। बाद में कोशिश करें।', 'This PIN is used by two people. Ask the admin.': 'यह PIN दो लोगों का है। एडमिन से कहें।',
  'Too many wrong PINs. Wait 10 minutes.': 'बहुत ज़्यादा गलत PIN। 10 मिनट रुकें।', 'This user is switched off.': 'यह यूज़र बंद है।'
};
const trAge = (s) => s.replace(/^just now$/, 'अभी').replace(/^(\d+) min ago$/, '$1 मिनट पहले').replace(/^(\d+) h ago$/, '$1 घंटे पहले');
const HI_RULES = [
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

/* ================= icons ================= */
const P = {
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

/* ================= state ================= */
const S = {
  url: store.get('url', '') || CFG.scriptUrl || '',
  items: store.get('items', []),
  history: store.get('history', []),
  queue: store.get('queue', []),
  failed: store.get('failed', []),
  synced: store.get('synced', null),
  loading: false, syncing: false, error: '',
  filter: { q: '', cat: 'all', status: 'all' },
  homeRange: 7, repRange: 7, repType: 'all', repQ: '',
  form: {},
  sheet: null,
  busy: false,
  installEvt: null
};
window.store = store;
window.ARTIME_ic = (n, z) => ic(n, z);
window.ARTIME_toast = (m, b) => toast(m, b);
window.ARTIME_render = () => render();   // Settings uses it from an inline onchange
const saveQueue = () => { store.set('queue', S.queue); store.set('failed', S.failed); };

/* ================= data model ================= */
function parseName(name) {
  const m = /^(.*?)\s*\((Offline|Online)\)\s*$/i.exec(name || '');
  return m ? { base: m[1].trim(), variant: cap(m[2].toLowerCase()) } : { base: String(name || '').trim(), variant: null };
}

function items() {
  const pend = {};
  S.queue.forEach((e) => {
    pend[e.code] = (pend[e.code] || 0) + (e.type === 'in' ? 1 : -1) * Number(e.qty);
    if (e.type === 'out' && isDial(e.code)) { const sk = skippedOf(e.note); dialParts(e.code).filter((c) => !sk.includes(c)).forEach((c) => { pend[c] = (pend[c] || 0) - Number(e.qty); }); }
  });
  return S.items.map((r) => {
    const p = parseName(r.item);
    const d = pend[r.code] || 0;
    const eff = r.stock + d;
    const cat = isDial(r.code) ? 'dial' : r.cat || (CLOCK_ITEMS.includes(p.base) ? 'clock' : 'packing');
    const st = isDial(r.code) || (r.status === '-' && d === 0) ? 'none' : eff <= 0 ? 'out' : eff <= r.min ? 'low' : 'ok';
    const sz = sizeLabel(r.size);
    return Object.assign({}, r, p, { cat, pend: d, eff, st, sz, title: r.item + (sz ? ' - ' + sz : '') });
  });
}

function moves() {
  return S.queue.map((e) => Object.assign({}, e, { pending: true })).concat(S.history);
}
function sortMoves(list) {
  return list.slice().sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0) || String(b.id || '').localeCompare(String(a.id || '')) || (b.row || 0) - (a.row || 0));
}
function tsOf(e) {
  let ms = e.ts;
  if (!ms && e.id && /^e[0-9a-z]{8}/.test(e.id)) ms = parseInt(e.id.slice(1, 9), 36);
  if (!ms || ms < 1.5e12 || ms > 4.1e12) return '';
  const d = new Date(ms);
  if (iso(d) !== e.date) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
const when = (e) => { const t = tsOf(e); return dRel(e.date) + (t ? ', ' + t : ''); };

const ST = {
  out: { cls: 'out', label: 'Out of Stock' },
  low: { cls: 'low', label: 'Reorder Soon' },
  ok: { cls: 'ok', label: 'In Stock' },
  none: { cls: 'none', label: 'No Entries' }
};
const pill = (st, code) => {
  if (code && (st === 'low' || st === 'out')) {
    const r = reorderedFor(code);
    return r ? `<span class="pill rbtn done" role="button" data-r="${esc(code)}">Reordered ${num(r.qty)} · ${esc(dRel(r.date))}</span>`
             : `<span class="pill ${ST[st].cls} rbtn" role="button" data-r="${esc(code)}">Reorder</span>`;
  }
  return `<span class="pill ${ST[st].cls}">${ST[st].label}</span>`;
};

/* ================= API ================= */
async function apiGet() {
  const r = await fetch(S.url, { redirect: 'follow' });
  return r.json();
}
async function apiPost(body) {
  const r = await fetch(S.url, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
  return r.json();
}
function applyData(j) {
  if (Array.isArray(j.items)) { S.items = j.items; store.set('items', S.items); }
  if (Array.isArray(j.history)) { S.history = j.history; store.set('history', S.history); }
  if (Array.isArray(j.reorderSetup)) store.set('rsetup', j.reorderSetup);
  if (j.reorderMessage) store.set('rmsg', j.reorderMessage);
  if (Array.isArray(j.reorders)) store.set('rlog', j.reorders);
  S.synced = Date.now(); store.set('synced', S.synced);
  S.error = '';
}
const errText = (e) => {
  const m = String((e && e.message) || e || '');
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return navigator.onLine ? 'Could not reach Google Sheets. Check the link in More.' : 'You are offline.';
  if (/JSON|Unexpected token/i.test(m)) return 'The Google Sheets link did not answer correctly. Check it is deployed for "Anyone".';
  return m;
};

async function refresh(quiet) {
  if (!S.url || S.loading) return;
  if (S.queue.length || (store.get('rq', [])).length) { await sync(true); return; }
  S.loading = true;
  try { softRender(); } catch (e) { /* display problem must not block loading */ }
  try {
    const j = await apiGet();
    if (!j.ok) throw new Error(j.error || 'Sheet error');
    applyData(j);
  } catch (e) {
    S.error = errText(e);
    if (!quiet) toast(S.error, true);
  } finally { S.loading = false; try { softRender(); } catch (e) { /* ignore */ } }
}

async function sync(quiet) {
  if (S.syncing || (!S.queue.length && !(store.get('rq', [])).length) || !S.url) return;
  S.syncing = true; softRender();
  const batch = S.queue.slice();
  let okRun = false;
  try {
    const j = await apiPost({ v: 2, reorders: store.get('rq', []), entries: batch.map(({ id, type, code, qty, date, party, ref, note }) => ({ id, type, code, qty, date, party, ref, note, by: store.get('by', '') || '-' })) });
    if (!j.ok) throw new Error(j.error || 'Sheet error');
    const res = {};
    (j.results || []).forEach((r) => { res[r.id] = r; });
    const rdone = new Set((j.reorderResults || []).filter((r) => r.status !== undefined).map((r) => r.id));
    if (rdone.size) store.set('rq', store.get('rq', []).filter((r) => !rdone.has(r.id)));
    const done = new Set();
    batch.forEach((e) => {
      const r = res[e.id];
      if (!r) return;
      if (r.status === 'ok' || r.status === 'dup') done.add(e.id);
      else if (r.status === 'error') { done.add(e.id); S.failed.push(Object.assign({}, e, { msg: r.msg })); }
    });
    S.queue = S.queue.filter((e) => !done.has(e.id));
    saveQueue();
    applyData(j);
    okRun = true;
  } catch (e) {
    S.error = errText(e);
    if (!quiet) toast('Saved on this phone. ' + S.error, true);
  } finally {
    S.syncing = false; softRender();
    if (okRun && S.queue.length) setTimeout(() => sync(true), 0);   // entries added while this sync was running
  }
}

/* ================= router ================= */
function route() {
  const h = location.hash.replace(/^#\/?/, '') || 'home';
  const [name, qs] = h.split('?');
  return { name, q: new URLSearchParams(qs || '') };
}
let lastRouteKey = '';
function onRoute() {
  const r = route();
  const key = location.hash;
  if (r.name === 'items') S.filter = { q: '', cat: r.q.get('cat') || 'all', status: r.q.get('status') || 'all' };
  if (isFormRoute(r.name)) {
    const f = ensureForm(r.name);
    f.date = today();
    if (r.name === 'dial') f.skip = [];     // every part ticked each time, so nothing is left out by mistake
    const code = r.q.get('code');
    if (code && r.name === 'dial') f.dcode = code;
    else if (code) f.wantCode = code;
  }
  lastRouteKey = key;
  S.sheet = null;
  render();
  window.scrollTo(0, 0);
  if (r.name === 'items' && r.q.get('focus')) setTimeout(() => { const i = $('#q'); if (i) i.focus(); }, 50);
}

/* ================= render ================= */
function render() {
  const r = route();
  const isForm = isFormRoute(r.name);
  const app = $('#app');
  app.className = isForm ? 'noNav' : '';
  let top = '', body = '';
  switch (r.name) {
    case 'in': case 'out': top = topForm(r.name); body = vForm(r.name); break;
    case 'dial': top = topForm('dial'); body = vDial(); break;
    case 'items': top = topPlain('Items', 'View and manage all items', true); body = vItems(); break;
    case 'categories': top = topPlain('Categories', 'Manage item categories', true); body = vCategories(); break;
    case 'reports': top = topPlain('Reports', 'Stock movement over time'); body = vReports(); break;
    case 'more': top = topPlain('Settings'); body = vMore(); break;
    case 'reorder': top = topPlain('Reorder List', 'Items that are low or out of stock', true); body = vReorder(); break;
    case 'pay': { const t = r.q.get('t'); top = topPay(t); body = '<div id="money"></div>'; break; }
    case 'payreport': top = topPlain('Payments Report', 'Cash and bank totals', true); body = '<div id="money"></div>'; break;
    case 'stock': top = topPlain('Stock Overview', 'Items and alerts', true) + syncLine(); body = vHome(); break;
    default: if (payFirst()) { top = topHome(); body = vHomePay(); } else { top = topHome(); body = vHome(); }
  }
  app.innerHTML = top + body;
  $('#nav').innerHTML = isForm ? '' : navHTML(r.name);
  renderSheet();
  if (isForm) updateFormDynamic();
  if (r.name === 'pay' || r.name === 'payreport') withMoney(() => window.Money.mount(r.name === 'payreport' ? 'report' : 'entry', r.q.get('t')));
  else if (r.name === 'home' && payFirst()) withMoney(() => window.Money.dash());
  else if (r.name === 'home' && moneyUser()) withMoney(() => window.Money.warm());
}
// refresh without clobbering what the person is typing
function softRender() {
  const r = route();
  const ae = document.activeElement;
  if (r.name === 'pay' || r.name === 'payreport') return;           // Payments draws and refreshes itself
  if (isFormRoute(r.name)) { updateFormDynamic(); return; }
  if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'SELECT')) { if (r.name === 'items') renderItemList(); return; }
  render();
}

const rupee = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
function payToday() {                       // today's money in/out from what this phone already knows (no network)
  const u = moneyUser(); if (!u) return null;
  let rep = null, q = []; try { rep = JSON.parse(localStorage.getItem('artime.money.rep')); } catch (e) { /* none */ } try { q = JSON.parse(localStorage.getItem('artime.money.q')) || []; } catch (e) { /* none */ }
  const mine = q.filter((e) => e.u === u.name), has = rep && rep.user === u.name;
  if (!has && !mine.length) return null;
  const td = today(); let i = 0, o = 0;
  if (has) rep.rows.forEach((r) => { if (r[0] === td) { if (r[1] === 'in') i += r[2]; else o += r[2]; } });
  mine.forEach((e) => { if (e.date === td) { if (e.type === 'in') i += e.amount; else o += e.amount; } });
  return { i, o };
}
function quickTiles(withPay) {
  return `<section class="qa"><a class="qt in" href="#/in">${ic('up', 28, 2.2)}<b>Stock In</b></a><a class="qt out" href="#/out">${ic('down', 28, 2.2)}<b>Stock Out</b></a><a class="qt dial" href="#/dial">${ic('dial', 28, 2.2)}<b>Dial Out</b></a>${withPay ? `<a class="qt pay" href="#/pay">${ic('cash', 28, 2)}<b>Payments</b></a>` : `<a class="qt items" href="#/items">${ic('cube', 28, 2)}<b>Items</b></a>`}</section>`;
}
function greet() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }
function topHome() {
  const alerts = items().filter((i) => i.st === 'out' || i.st === 'low').length, nm = who();
  return `<header class="top home">
    <button class="ibtn" data-act="menu" aria-label="Menu">${ic('menu', 26)}</button>
    <a class="hav" href="#/more" aria-label="Profile">${avatarHTML('sm')}</a>
    <div class="grow"><div class="hi">${greet()}</div><h1>${nm ? esc(nm) : esc(APP_NAME)}</h1></div>
    <a class="ibtn" href="#/items?focus=1" aria-label="Search">${ic('search', 26)}</a>
    <a class="ibtn" href="#/items?status=alert" aria-label="Low stock alerts">${ic('bell', 26)}${alerts ? '<span class="dot"></span>' : ''}</a>
  </header>${syncLine()}`;
}
function topPlain(title, sub, back) {
  return `<header class="top plain">${back ? `<a class="ibtn" href="#/home" aria-label="Back">${ic('left', 26)}</a>` : ''}<div class="grow"><h1>${esc(title)}</h1>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</div></header>`;
}
function topPay() {
  const title = 'Payments', sub = 'Record money in or out';
  return `<header class="top center"><a class="ibtn" href="#/home" aria-label="Back">${ic('left', 26)}</a>
    <div class="grow"><h1>${title}</h1><div class="sub">${sub}</div></div><span class="spacer"></span></header>`;
}
function vHomePay() {
  const al = items().filter((i) => i.st === 'out' || i.st === 'low').length;
  return `<div id="paydash"></div>
    <div class="sethead" style="margin:18px 16px 8px">Stock</div>${quickTiles(false)}
    ${al ? `<a class="card payalert" href="#/reorder">${ic('bell', 24)}<span><b>${al} ${al === 1 ? 'item' : 'items'} to order</b><small>Items that are low or out of stock</small></span>${ic('right', 18)}</a>` : ''}
    <a class="card payalert" href="#/stock">${ic('cube', 24)}<span><b>Stock Overview</b><small>Items and alerts</small></span>${ic('right', 18)}</a>`;
}
function topForm(type) {
  if (type === 'dial') return `<header class="top center"><a class="ibtn" href="#/home" aria-label="Back">${ic('left', 26)}</a>
    <div class="grow"><h1>Dial Out</h1><div class="sub">Make dials - the parts go out together</div></div><span class="spacer"></span></header>`;
  return `<header class="top center"><a class="ibtn" href="#/home" aria-label="Back">${ic('left', 26)}</a>
    <div class="grow"><h1>Stock ${type === 'in' ? 'In' : 'Out'}</h1><div class="sub">${type === 'in' ? 'Add incoming stock to inventory' : 'Remove stock from inventory'}</div></div><span class="spacer"></span></header>`;
}
const payFirst = () => store.get('pref', 'stock') === 'pay';
function syncInfo() {
  const n = S.queue.length;
  let cls = '', txt = '';
  if (S.syncing || S.loading) { cls = 'busy'; txt = S.syncing ? 'Saving to Google Sheets...' : 'Updating...'; }
  else if (n) { cls = 'warn'; txt = `${n} ${n === 1 ? 'entry' : 'entries'} waiting to sync. Tap to retry`; }
  else if (S.error) { cls = 'bad'; txt = S.error + ' Tap to retry'; }
  else if (S.synced) { txt = 'Synced ' + ago_(S.synced); }
  else { txt = 'Not synced yet. Tap to load'; }
  return { cls, txt };
}
function syncLine() {
  const { cls, txt } = syncInfo();
  return `<button class="syncline ${cls}" data-act="sync"><span class="pip"></span>${esc(txt)}</button>`;
}
function ago_(ms) {
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + ' min ago';
  const h = Math.round(m / 60);
  return h < 24 ? h + ' h ago' : dShort(iso(new Date(ms)));
}

function navHTML(name) {
  const on = (n) => (n === name || (n === 'items' && name === 'categories') ? 'on' : '');
  const pf = payFirst(), isPay = name === 'pay' || name === 'payreport';
  const stockFab = `<span class="fabwrap"><button class="fab" data-act="add" aria-label="Add stock entry">${ic('plus', 30, 2.4)}</button></span>`;
  const payFab = `<span class="fabwrap"><button class="fab pay" data-act="payadd" aria-label="Add payment">${ic('plus', 30, 2.4)}</button></span>`;
  const stockMini = `<button class="n mini st" data-act="add" aria-label="Add stock entry"><i class="mfab b">${ic('plus', 20, 2.8)}</i>Stock</button>`;
  const payMini = `<button class="n mini pm ${isPay ? 'on' : ''}" data-act="payadd" aria-label="Add payment"><i class="mfab g">${ic('plus', 20, 2.8)}</i>Payments</button>`;
  return `<a class="n ${on('home')}" href="#/home">${ic('home', 26)}Home</a>
    <a class="n ${on('items')}" href="#/items">${ic('cube', 26)}Items</a>
    ${pf ? payFab : stockFab}
    <a class="n ${on('reports')}" href="#/reports">${ic('chart', 26)}Reports</a>
    ${pf ? stockMini : payMini}`;
}

/* ---------- Settings: profile, language, preferences, payments link (payments code loads only when used) ---------- */
const AVATARS = [['🦁', '#f59e0b', '#ef4444'], ['🐯', '#fb923c', '#f43f5e'], ['🐼', '#64748b', '#1e293b'], ['🦊', '#fb923c', '#c2410c'], ['🐻', '#a16207', '#78350f'], ['🦉', '#8b5cf6', '#4338ca'],
  ['🐬', '#06b6d4', '#1d4ed8'], ['🦄', '#ec4899', '#8b5cf6'], ['🚀', '#3b82f6', '#1e3a8a'], ['🎯', '#ef4444', '#7f1d1d'], ['🌟', '#facc15', '#f97316'], ['🌈', '#34d399', '#3b82f6'],
  ['⚡', '#fbbf24', '#d97706'], ['🌸', '#f472b6', '#be185d'], ['🍀', '#4ade80', '#15803d'], ['🔥', '#fb7185', '#dc2626']];
function avatarHTML(cls) {
  const id = (store.get('avatars', {}) || {})[who() || '_'], nm = who(), x = AVATARS[id];
  return x ? `<span class="av emo ${cls || ''}" style="background:linear-gradient(135deg,${x[1]},${x[2]})">${x[0]}</span>` : `<span class="av ${cls || ''}">${esc((nm || '?')[0].toUpperCase())}</span>`;
}
function avatarPicker() {
  const cur = (store.get('avatars', {}) || {})[who() || '_'];
  return `<div class="avgrid"><button class="avopt ${cur === undefined ? 'on' : ''}" data-act="avatar" data-v="-1" aria-label="Initial"><span class="av">${esc((who() || '?')[0].toUpperCase())}</span></button>${AVATARS.map((x, i) => `<button class="avopt ${cur === i ? 'on' : ''}" data-act="avatar" data-v="${i}" aria-label="Picture ${i + 1}"><span class="av emo" style="background:linear-gradient(135deg,${x[1]},${x[2]})">${x[0]}</span></button>`).join('')}</div>`;
}
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

/* ---------- Home ---------- */
function vHome() {
  const its = items();
  if (!S.url) return `<div class="banner bad">No Google Sheets link yet. <button data-act="go-more">Add it in More</button></div>`;
  if (!its.length) {
    return S.loading || S.syncing
      ? `<div class="card empty"><b>Loading your stock...</b>One moment.</div>`
      : `<div class="card empty"><b>No stock data yet</b>${esc(S.error || 'Tap the sync line above to load from Google Sheets.')}</div>`;
  }
  const total = its.length;
  const stock = its.filter((i) => !isDial(i.code)).reduce((a, i) => a + i.eff, 0);
  const outN = its.filter((i) => i.st === 'out').length;
  const lowN = its.filter((i) => i.st === 'low').length;
  const alerts = its.filter((i) => i.st === 'out' || i.st === 'low').sort((a, b) => (a.st === 'out' ? 0 : 1) - (b.st === 'out' ? 0 : 1) || a.eff - b.eff).slice(0, 4);
  const nm = {}; its.forEach((i) => { nm[i.code] = i.title; });
  const recent = sortMoves(moves()).slice(0, 4);
  const c = chartData(S.homeRange);
  const showInstall = S.installEvt && !isStandalone();
  const td = today(); let tin = 0, tout = 0;
  moves().forEach((e) => { if (e.date === td && !isDial(e.code)) { const q = Number(e.qty) || 0; if (e.type === 'in') tin += q; else tout += q; } });
  const alertN = its.filter((i) => i.st === 'out' || i.st === 'low').length, pt = payToday();
  const hero = `<section class="hero"><div class="hh"><span>Today</span><small>${esc(dLong(td))}</small></div><div class="hm"><div><b>+${num(tin)}</b><small>Stock in</small></div><div><b>-${num(tout)}</b><small>Stock out</small></div><a href="#/reorder"><b>${alertN}</b><small>To reorder</small></a></div></section>`;
  const paycard = pt ? `<a class="card paytoday" href="#/payreport"><span class="ico">${ic('cash', 24)}</span><div class="pt"><small>Payments today</small><div class="pr"><b class="g">+${rupee(pt.i)}</b><b class="r">-${rupee(pt.o)}</b></div></div>${ic('right', 20)}</a>` : '';
  return `${showInstall ? `<div class="install"><span class="t"><b>Install ARTIME Stock</b><small>Opens full screen like a normal app</small></span><button data-act="install">Install</button></div>` : ''}
  ${hero}
  ${quickTiles(true)}
  ${paycard}
  <section class="stats">
    <a class="stat blue" href="#/items"><span class="ico">${ic('cube', 24)}</span><span><small>Total Items</small><b>${num(total)}</b></span></a>
    <a class="stat green" href="#/items?status=ok"><span class="ico">${ic('layers', 24)}</span><span><small>Total Stock</small><b>${num(stock)}</b></span></a>
    <a class="stat red" href="#/items?status=out"><span class="ico">${ic('alert', 26, 2.2)}</span><span><small>Out of Stock</small><b>${outN}</b></span></a>
    <a class="stat amber" href="#/items?status=low"><span class="ico">${ic('warn', 24, 2.1)}</span><span><small>Reorder Soon</small><b>${lowN}</b></span></a>
  </section>
  <section class="card sec">
    <div class="sec-h"><h2>Low Stock Alerts</h2><a class="link" href="#/items?status=alert">View All ${ic('right', 16, 2.4)}</a></div>
    ${alerts.length ? alerts.map((i) => itemRow(i)).join('') : `<div class="empty"><b>Nothing is running low</b>Items show here when they reach their reorder level.</div>`}
  </section>
  <section class="dual">
    <div class="card">
      <div class="sec-h"><h2>Recent Stock Activity</h2><a class="link" href="#/reports">View All ${ic('right', 16, 2.4)}</a></div>
      ${recent.length ? recent.map((e) => actRow(e, nm)).join('') : `<div class="empty"><b>No movements yet</b>Add your first Stock In or Stock Out.</div>`}
    </div>
    <div class="card">
      <div class="sec-h"><h2>Stock Overview</h2><label class="sel"><select data-bind="homeRange" aria-label="Range"><option value="7"${S.homeRange === 7 ? ' selected' : ''}>Last 7 Days</option><option value="14"${S.homeRange === 14 ? ' selected' : ''}>Last 14 Days</option><option value="30"${S.homeRange === 30 ? ' selected' : ''}>Last 30 Days</option></select>${ic('chev', 16)}</label></div>
      ${chartBlock(c)}
    </div>
  </section>`;
}

function itemRow(i) {
  return `<button class="row" data-act="open-item" data-code="${esc(i.code)}">${art(i.base, 56)}
    <span class="mid"><b>${esc(i.title)}</b><small>${esc(i.code)}</small></span>
    <span class="pillcol">${pill(i.st, i.code)}</span>
    <span class="end"><b>${num(i.eff)}</b><small>${esc(unitLabel(i.unit))}</small></span></button>`;
}
function actRow(e, nm) {
  const inn = e.type === 'in';
  const dl = !inn && isDial(e.code);
  const left = dl ? skippedOf(e.note).map((c) => String(nm[c] || c).split(' - ')[0]) : [];
  return `<div class="act"><span class="aic ${inn ? 'in' : 'out'}">${ic(inn ? 'up' : 'down', 22, 2.2)}</span>
    <div class="am"><b>${dl ? 'Dial Out' : 'Stock ' + (inn ? 'In' : 'Out')}</b><span>${esc(nm[e.code] || e.code)}${left.length ? ' - without ' + esc(left.join(', ')) : ''}</span></div>
    <div class="ar"><b class="${inn ? 'g' : 'r'}">${inn ? '+' : '-'}${num(e.qty)}</b><span class="${e.pending ? 'pend' : ''}">${e.pending ? 'Waiting to sync' : esc(when(e))}</span></div></div>`;
}

/* ---------- chart ---------- */
function chartData(days) {
  const ds = []; for (let k = days - 1; k >= 0; k--) ds.push(ago(k));
  const m = {}; ds.forEach((d) => { m[d] = { i: 0, o: 0 }; });
  let ti = 0, to = 0;
  moves().forEach((e) => { const b = m[e.date]; if (!b) return; const q = Number(e.qty) || 0; if (e.type === 'in') { b.i += q; ti += q; } else { b.o += q; to += q; } });
  return { ds, m, ti, to };
}
function niceStep(peak) {
  const p = Math.pow(10, Math.floor(Math.log10(peak)));
  const r = peak / p;
  return Math.max(1, (r <= 2 ? 0.5 : r <= 5 ? 1 : 2) * p);
}
function chartBlock(c) {
  const { ds, m } = c;
  const peak = Math.max(1, ...ds.map((d) => Math.max(m[d].i, m[d].o)));
  const step = niceStep(peak), top = Math.ceil(peak / step) * step;
  const W = 360, H = 190, L = 34, R = 6, T = 8, B = 26, pw = W - L - R, ph = H - T - B, gw = pw / ds.length;
  const bw = Math.min(14, gw * (ds.length <= 7 ? 0.32 : 0.36));
  let g = '';
  for (let v = 0; v <= top; v += step) {
    const y = T + ph - (v / top) * ph;
    g += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="#e7ebf1" stroke-width="1"/><text x="${L - 6}" y="${y + 3.5}" text-anchor="end">${num(v)}</text>`;
  }
  const every = Math.ceil(ds.length / 7);
  ds.forEach((d, k) => {
    const cx = L + gw * k + gw / 2;
    const hi = (m[d].i / top) * ph, ho = (m[d].o / top) * ph;
    if (m[d].i) g += `<rect x="${(cx - bw - 0.8).toFixed(1)}" y="${(T + ph - hi).toFixed(1)}" width="${bw.toFixed(1)}" height="${hi.toFixed(1)}" rx="2" fill="#2fae8a"/>`;
    if (m[d].o) g += `<rect x="${(cx + 0.8).toFixed(1)}" y="${(T + ph - ho).toFixed(1)}" width="${bw.toFixed(1)}" height="${ho.toFixed(1)}" rx="2" fill="#ec5757"/>`;
    if ((ds.length - 1 - k) % every === 0) g += `<text x="${cx}" y="${H - 8}" text-anchor="middle">${esc(dShort(d))}</text>`;
  });
  return `<div class="legend"><span><i style="background:#2fae8a"></i>Stock In</span><span><i style="background:#ec5757"></i>Stock Out</span></div>
    <div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Stock in and out per day">${g}</svg></div>
    <div class="tot"><div><span class="aic in">${ic('up', 20, 2.2)}</span><span><small>Total In</small><b>${num(c.ti)}</b></span></div>
    <div><span class="aic out">${ic('down', 20, 2.2)}</span><span><small>Total Out</small><b>${num(c.to)}</b></span></div></div>`;
}

/* ---------- Items ---------- */
function filtered() {
  const f = S.filter, q = f.q.trim().toLowerCase();
  return items().filter((i) => {
    if (f.cat !== 'all' && i.cat !== f.cat) return false;
    if (f.status === 'alert' ? !(i.st === 'out' || i.st === 'low') : f.status !== 'all' && i.st !== f.status) return false;
    if (q && !(i.title + ' ' + i.code + ' ' + i.applies).toLowerCase().includes(q)) return false;
    return true;
  });
}
function vItems() {
  const f = S.filter;
  const chip = (act, v, cur, label) => `<button class="chip ${v === cur ? 'on' : ''}" data-act="${act}" data-v="${v}">${label}</button>`;
  return `<div class="search">${ic('search', 20)}<input id="q" type="search" placeholder="Search item or code" value="${esc(f.q)}" data-bind="q" autocomplete="off"></div>
    <div class="chips">${chip('fc', 'all', f.cat, 'All')}${chip('fc', 'packing', f.cat, 'Packaging Items')}${chip('fc', 'clock', f.cat, 'Clock Items')}</div>
    <div class="chips">${chip('fs', 'all', f.status, 'Any status')}${chip('fs', 'alert', f.status, 'Needs attention')}${chip('fs', 'out', f.status, 'Out of Stock')}${chip('fs', 'low', f.status, 'Reorder Soon')}${chip('fs', 'ok', f.status, 'In Stock')}</div>
    <div id="itemlist">${itemListHTML()}</div>`;
}
function itemListHTML() {
  const list = filtered();
  if (!S.items.length) return `<div class="card empty sec"><b>No items loaded</b>Open Home and tap the sync line.</div>`;
  if (!list.length) return `<div class="card empty sec"><b>No items match</b>Try a different search or filter.</div>`;
  return `<div class="count">${list.length} ${list.length === 1 ? 'item' : 'items'}</div><div class="card">${list.map(itemRow).join('')}</div>`;
}
function renderItemList() { const el = $('#itemlist'); if (el) el.innerHTML = itemListHTML(); }

/* ---------- Categories ---------- */
function vCategories() {
  const its = items();
  const card = (key, icon, cls) => {
    const l = its.filter((i) => i.cat === key);
    const need = l.filter((i) => i.st === 'out' || i.st === 'low').length;
    return `<a class="card catcard" href="#/items?cat=${key}"><span class="ico ${cls}">${ic(icon, 28)}</span>
      <span class="t"><b>${CAT_NAME[key]}</b><small>${l.length} items, ${num(l.reduce((a, i) => a + i.eff, 0))} in stock</small>
      <small>${need ? `<span class="${l.some((i) => i.st === 'out') ? 'r' : ''}" style="font-weight:600">${need} need attention</span>` : 'All good'}</small></span>${ic('right', 20)}</a>`;
  };
  if (!its.length) return `<div class="card empty"><b>No items loaded</b>Open Home and tap the sync line.</div>`;
  return `<div class="cats">${card('packing', 'cube', '')}${card('clock', 'gear', 'c')}</div>`;
}

/* ---------- Reports ---------- */
const REP_TYPES = [['all', 'All'], ['in', 'Stock In'], ['out', 'Stock Out'], ['dial', 'Dial Out']];
function repFiltered() {
  const nm = {}; items().forEach((i) => { nm[i.code] = i.title; });
  const from = ago(S.repRange - 1), q = String(S.repQ || '').trim().toLowerCase();
  let list = sortMoves(moves().filter((e) => e.date >= from));
  const base = list;
  if (S.repType === 'in') list = list.filter((e) => e.type === 'in' && !isDial(e.code));
  else if (S.repType === 'out') list = list.filter((e) => e.type === 'out' && !isDial(e.code));
  else if (S.repType === 'dial') list = list.filter((e) => isDial(e.code));
  if (q) list = list.filter((e) => (String(nm[e.code] || '') + ' ' + e.code + ' ' + (e.party || '') + ' ' + (e.note || '') + ' ' + (e.ref || '')).toLowerCase().includes(q));
  return { nm, base, list };
}
function repListHTML() {
  const { nm, list } = repFiltered();
  if (!list.length) return `<div class="empty"><b>No movements</b>Nothing recorded in this period.</div>`;
  let log = '', last = '';
  list.slice(0, 150).forEach((e) => {
    if (e.date !== last) { last = e.date; log += `<div class="daygroup">${esc(dRel(e.date))}${e.date === today() || e.date === ago(1) ? ', ' + esc(dShort(e.date)) : ''}</div>`; }
    log += actRow(e, nm);
  });
  return log;
}
function vReports() {
  const { nm, base, list } = repFiltered();
  const c = chartData(S.repRange);
  const sum = { in: 0, out: 0, dial: 0 }, used = {}, got = {};
  base.forEach((e) => { const q = Number(e.qty) || 0; if (isDial(e.code)) { if (e.type === 'out') sum.dial += q; return; } if (e.type === 'in') { sum.in += q; got[e.code] = (got[e.code] || 0) + q; } else { sum.out += q; used[e.code] = (used[e.code] || 0) + q; } });
  const top = (o) => Object.entries(o).sort((x, y) => y[1] - x[1]).slice(0, 5);
  const tu = top(used), tg = top(got);
  const chip = (v, label) => `<button class="chip ${S.repRange === v ? 'on' : ''}" data-act="rrange" data-v="${v}">${label}</button>`;
  const tchip = (v, label) => `<button class="chip ${S.repType === v ? 'on' : ''}" data-act="rtype" data-v="${v}">${label}</button>`;
  const bars = (arr, cls, sign) => arr.length ? arr.map(([code, q]) => `<div class="row plain"><div style="display:flex;justify-content:space-between;gap:10px"><b style="font-weight:600">${esc(nm[code] || code)}</b><b class="${cls}">${sign}${num(q)}</b></div><div class="bar ${cls === 'g' ? 'gb' : ''}"><i style="width:${Math.max(4, Math.round((q / arr[0][1]) * 100))}%"></i></div></div>`).join('') : `<div class="empty"><b>Nothing here</b>No entries in this period.</div>`;
  return `<div class="chips" style="margin-top:0">${chip(7, 'Last 7 Days')}${chip(14, 'Last 14 Days')}${chip(30, 'Last 30 Days')}${chip(90, 'Last 90 Days')}</div>
    <section class="rsum"><div class="g"><small>Stock In</small><b>+${num(sum.in)}</b></div><div class="r"><small>Stock Out</small><b>-${num(sum.out)}</b></div><div class="b"><small>Dials made</small><b>${num(sum.dial)}</b></div></section>
    <div class="repact"><button class="btn ghost" data-act="repshare">${ic('send', 18)}Share summary</button><button class="btn ghost" data-act="repcsv">${ic('download', 18)}Download Excel (CSV)</button></div>
    <div class="card sec">${chartBlock(c)}</div>
    <div class="dual"><div class="card sec"><div class="sec-h"><h2>Most used</h2></div>${bars(tu, 'r', '-')}</div>
    <div class="card sec"><div class="sec-h"><h2>Most received</h2></div>${bars(tg, 'g', '+')}</div></div>
    <div class="card sec" style="overflow:hidden"><div class="sec-h"><h2>All movements</h2><small class="cnt" id="repcnt">${list.length}</small></div>
      <div class="chips inner">${REP_TYPES.map((t) => tchip(t[0], t[1])).join('')}</div>
      <div class="search inner">${ic('search', 20)}<input id="rq" type="search" placeholder="Search item, supplier or note" value="${esc(S.repQ)}" data-bind="rq" autocomplete="off"></div>
      <div id="replist">${repListHTML()}</div></div>`;
}
function repSummaryText() {
  const { nm, base } = repFiltered(); let i = 0, o = 0, d = 0; const used = {};
  base.forEach((e) => { const q = Number(e.qty) || 0; if (isDial(e.code)) { if (e.type === 'out') d += q; return; } if (e.type === 'in') i += q; else { o += q; used[e.code] = (used[e.code] || 0) + q; } });
  const top = Object.entries(used).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([c, q]) => (nm[c] || c) + ' (' + num(q) + ')').join(', ');
  return `${APP_NAME} Stock - Last ${S.repRange} days\nStock In: +${num(i)}\nStock Out: -${num(o)}\nDials made: ${num(d)}${top ? '\nMost used: ' + top : ''}`;
}
function downloadCSV(name, rows) {
  const csv = rows.map((r) => r.map((x) => '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"').join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
  const l = document.createElement('a'); l.href = url; l.download = name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
window.ARTIME_csv = downloadCSV;

/* ---------- Reorder List (all low / out items, grouped by supplier) ---------- */
function vReorder() {
  const its = items().filter((i) => i.st === 'out' || i.st === 'low');
  if (!S.items.length) return `<div class="card empty"><b>No items loaded</b>Open Home and tap the sync line.</div>`;
  if (!its.length) return `<div class="card empty">${ic('check', 40)}<b>Nothing is running low</b>Items show here when they reach their reorder level.</div>`;
  const setup = store.get('rsetup', []), groups = {};
  its.sort((x, y) => (x.st === y.st ? x.title.localeCompare(y.title) : x.st === 'out' ? -1 : 1)).forEach((i) => {
    const r = setup.find((q) => String(q.code).trim().toUpperCase() === String(i.code).trim().toUpperCase());
    const k = (r && r.supplier) || '';
    (groups[k] = groups[k] || []).push(i);
  });
  const names = Object.keys(groups).sort((x, y) => (x === '' ? 1 : y === '' ? -1 : x.localeCompare(y)));
  return `<div class="count">${its.length} items to order</div>` + names.map((k) => `<div class="card sec"><div class="sec-h"><h2>${k ? esc(k) : 'No supplier set'}</h2></div>${groups[k].map((i) => itemRow(i)).join('')}</div>`).join('');
}

/* ---------- More ---------- */
function vMore() { return prefHTML() + vMore0(); }
function vMore0() {
  const q = S.queue, f = S.failed;
  const nm = {}; items().forEach((i) => { nm[i.code] = i.title; });
  const ent = (e, x) => `<div class="q"><span class="aic ${e.type}" style="width:38px;height:38px">${ic(e.type === 'in' ? 'up' : 'down', 18, 2.2)}</span><div class="m"><b>${e.type === 'in' ? '+' : '-'}${num(e.qty)} ${esc(nm[e.code] || e.code)}</b><small>${esc(dShort(e.date))}${e.msg ? ' - ' + esc(e.msg) : ''}</small></div><button class="x" data-act="${x}" data-id="${esc(e.id)}">Discard</button></div>`;
  const installable = S.installEvt && !isStandalone();
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !isStandalone();
  return `<div class="sethead">Stock sheet</div>
    <div class="card group"><h2>Google Sheet connection</h2><p>Paste the Web app link that ends with /exec.</p>
      <label class="field">${ic('file', 20)}<input id="url" type="url" inputmode="url" placeholder="https://script.google.com/macros/s/.../exec" value="${esc(S.url)}" data-bind="url" autocomplete="off"></label>
      <div class="btns"><button class="btn" data-act="save-url">Save and sync</button>${CFG.scriptUrl && S.url !== CFG.scriptUrl ? '<button class="btn ghost" data-act="reset-url">Use default link</button>' : ''}</div>
      <div class="kv" style="margin-top:8px"><span>Last sync</span><b>${S.synced ? esc(ago_(S.synced)) : 'Never'}</b></div>
      ${S.error ? `<div class="banner bad" style="margin:8px 0 0">${esc(S.error)}</div>` : ''}</div>
    <div class="sethead">Data on this phone</div>
    <div class="card group"><h2>Waiting to sync</h2><p>${q.length ? 'Saved on this phone. They are sent to the sheet as soon as you are online.' : 'Everything is saved to the sheet.'}</p>
      ${q.map((e) => ent(e, 'discard')).join('')}
      ${q.length ? `<div class="btns"><button class="btn" data-act="sync">${ic('refresh', 18)}Sync now</button></div>` : ''}</div>
    ${f.length ? `<div class="card group"><h2>Not saved</h2><p>The sheet rejected these entries. Fix the cause, then enter them again.</p>${f.map((e) => ent(e, 'discard-failed')).join('')}</div>` : ''}
    <div class="sethead">App</div>
    <div class="card group"><h2>Install app</h2><p>${isStandalone() ? 'Installed. You are using the app version.' : installable ? 'Add ARTIME Stock to your home screen so it opens like a normal app.' : ios ? 'On iPhone: tap the Share button, then Add to Home Screen.' : 'Use your browser menu and choose Install app or Add to Home screen.'}</p>
      ${installable ? `<div class="btns"><button class="btn" data-act="install">${ic('download', 18)}Install</button></div>` : ''}</div>
    <div class="card group"><h2>This phone</h2><div class="kv"><span>App version</span><b>v22</b></div><div class="kv"><span>Items cached</span><b>${S.items.length}</b></div><div class="kv"><span>Movements cached</span><b>${S.history.length}</b></div>
      <div class="btns"><button class="btn ghost" data-act="refresh">${ic('refresh', 18)}Reload from sheet</button></div></div>`;
}

/* ---------- Stock In / Out form ---------- */
function ensureForm(type) {
  if (!S.form[type]) S.form[type] = { t: type, cat: 'packing', base: null, variant: null, size: null, qty: 1, date: today(), party: '', ref: '', note: '', used: '', skip: [] };
  return S.form[type];
}
function resolve(f) {
  if (f.wantCode) {                      // opened from an item or shortcut: jump to that item once data is there
    const it = items().find((i) => i.code === f.wantCode);
    if (it) { Object.assign(f, { cat: it.cat, base: it.base, variant: it.variant, size: it.size }); f.wantCode = null; }
    else if (S.items.length) f.wantCode = null;
  }
  const its = items().filter((i) => i.cat === f.cat && !isDial(i.code));
  const bases = uniq(its.map((i) => i.base));
  if (!bases.includes(f.base)) f.base = bases[0] || null;
  const rows = its.filter((i) => i.base === f.base);
  const variants = uniq(rows.map((r) => r.variant).filter(Boolean));
  f.variant = variants.length ? (variants.includes(f.variant) ? f.variant : variants[0]) : null;
  const rv = rows.filter((r) => r.variant === f.variant);
  const sizes = uniq(rv.map((r) => r.size));
  if (!sizes.includes(f.size)) f.size = sizes[0] || null;
  return { bases, variants, sizes, row: rv.find((r) => r.size === f.size) || null };
}
function vForm(type) {
  const f = ensureForm(type);
  const R = resolve(f);
  const tab = (k, icon) => `<button class="tab ${f.cat === k ? 'on' : ''}" data-act="fcat" data-v="${k}">${ic(icon, 22)}${CAT_NAME[k]}</button>`;
  const hasSize = !(R.sizes.length === 1 && (R.sizes[0] === 'n/a' || !R.sizes[0]));
  const sup = uniq(S.history.filter((e) => e.type === 'in' && e.party).map((e) => e.party)).slice(0, 40);
  const usedFor = uniq(['Order', 'Production', 'Damaged', 'Sample'].concat(S.history.filter((e) => e.type === 'out' && e.party).map((e) => e.party))).slice(0, 40);
  const unit = unitLabel(R.row ? R.row.unit : 'pcs');
  return `<div class="form ${type}">
    <div class="tabs">${tab('clock', 'gear')}${tab('packing', 'cube')}</div>
    <label class="fl" for="item">Item<i>*</i></label>
    <div class="field">${ic('cube', 22)}<select id="item" data-bind="base">${R.bases.map((b) => `<option ${b === f.base ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select>${ic('chev', 20)}</div>
    ${hasSize ? `<div class="fl">Size<i>*</i></div><div class="sizes">${R.sizes.map((s) => `<button class="size ${s === f.size ? 'on' : ''}" data-act="fsize" data-v="${esc(s)}">${esc(sizeLabel(s) || s)}</button>`).join('')}</div>` : ''}
    ${R.variants.length > 1 ? `<div class="fl">Type<i>*</i></div><div class="seg">${R.variants.map((v) => `<button class="size ${v === f.variant ? 'on' : ''}" data-act="fvar" data-v="${esc(v)}">${esc(v)}</button>`).join('')}</div>` : ''}
    <div id="fcard"></div>
    <label class="fl" for="qty">Quantity<i>*</i></label>
    <div class="qty"><button data-act="qminus" aria-label="Decrease">${ic('minus', 22, 2.2)}</button><input id="qty" type="number" inputmode="decimal" min="0" step="any" value="${esc(f.qty)}" data-bind="qty"><button data-act="qplus" aria-label="Increase">${ic('plus', 22, 2.2)}</button><span class="unit">${esc(unit)}</span></div>
    <div class="hint" id="qhint"></div>
    <div class="fl" style="margin-top:8px">Date<i>*</i></div>
    <div class="field datef" data-act="pick">${ic('cal', 22)}<span class="val">${esc(dLong(f.date))}</span>${ic('chev', 20)}<input id="date" type="date" value="${esc(f.date)}" data-bind="date" aria-label="Date"></div>
    <div class="pair">
      <div>${type === 'in'
        ? `<label class="fl" for="party">Supplier</label><div class="field">${ic('truck', 22)}<input id="party" list="dl-party" placeholder="Supplier name" value="${esc(f.party)}" data-bind="party" autocomplete="off"><datalist id="dl-party">${sup.map((s) => `<option value="${esc(s)}">`).join('')}</datalist></div>`
        : `<label class="fl" for="used">Used for</label><div class="field">${ic('layers', 22)}<input id="used" list="dl-used" placeholder="Order, Sample..." value="${esc(f.used)}" data-bind="used" autocomplete="off"><datalist id="dl-used">${usedFor.map((s) => `<option value="${esc(s)}">`).join('')}</datalist></div>`}</div>
      <div><label class="fl" for="ref">Reference No.</label><div class="field">${ic('file', 22)}<input id="ref" placeholder="${type === 'in' ? 'Invoice / GRN No.' : 'Voucher / Order No.'}" value="${esc(f.ref)}" data-bind="ref" autocomplete="off"></div></div>
    </div>
    <label class="fl" for="note">Notes <small>(optional)</small></label>
    <div class="field">${ic('pencil', 20)}<input id="note" placeholder="Add notes..." value="${esc(f.note)}" data-bind="note" autocomplete="off"></div>
    <button class="submit" id="fsubmit" data-act="submit">${ic(type === 'in' ? 'up' : 'down', 24, 2.2)}<span>${type === 'in' ? 'Add Stock In' : 'Remove Stock Out'}</span></button>
  </div>`;
}
function formState(type) {
  const f = ensureForm(type); const R = resolve(f); const row = R.row;
  const q = Number(f.qty);
  const avail = row ? row.eff : 0;
  let err = '';
  if (!row) err = 'Choose an item.';
  else if (!(q > 0)) err = 'Enter a quantity above 0.';
  else if (type === 'out' && q > avail) err = avail > 0 ? `Only ${num(avail)} ${unitLabel(row.unit)} available.` : 'This item is out of stock.';
  return { f, R, row, q, avail, err, ok: !err };
}
function updateFormDynamic() {
  const r = route(); if (r.name === 'dial') { updateDial(); return; }
  if (r.name !== 'in' && r.name !== 'out') return;
  const type = r.name; const st = formState(type); const row = st.row;
  const card = $('#fcard'); if (!card) return;
  if (!row) { card.innerHTML = `<div class="empty-card">${S.items.length ? 'No matching item.' : 'No items loaded yet. Go back and sync first.'}</div>`; }
  else {
    const stCls = row.st === 'out' ? 'r' : row.st === 'low' ? 'a' : 'g';
    card.innerHTML = `<div class="pcard"><div class="head">${art(row.base, 76)}<div><b>${esc(row.code)}</b><small>${esc(row.title)}</small></div></div>
      <div class="nums"><div><small>Current Stock</small><b class="${stCls}">${num(row.eff)}</b><span>${esc(unitLabel(row.unit))}</span></div>
      <div><small>Reorder Level</small><b class="a">${num(row.min)}</b><span>${esc(unitLabel(row.unit))}</span></div>
      <div><small>Unit</small><b class="u">${esc(unitLabel(row.unit))}</b></div></div></div>`;
  }
  const hint = $('#qhint');
  if (hint) {
    if (type === 'out' && row) { hint.textContent = st.err && st.q > 0 ? st.err : `Max available: ${num(st.avail)} ${unitLabel(row.unit)}`; hint.className = 'hint' + (st.err && st.q > 0 ? ' bad' : ''); }
    else { hint.textContent = ''; hint.className = 'hint'; }
  }
  const btn = $('#fsubmit'); if (btn) btn.disabled = !st.ok;
}
async function submitForm(type) {
  if (S.busy) return;                       // ignore double taps while the popup is up
  const st = formState(type); if (!st.ok) return;
  S.busy = true;
  const f = st.f;
  const e = { id: newId(), ts: Date.now(), type, code: st.row.code, qty: st.q, date: f.date || today(), party: (type === 'in' ? f.party : f.used).trim(), ref: f.ref.trim(), note: f.note.trim() };
  S.queue.push(e); saveQueue();             // entry has a unique id, so the sheet can never double-count it
  const unit = unitLabel(st.row.unit);
  const now = items().find((i) => i.code === e.code);
  const pop = { kind: type, title: 'Added to Stock ' + (type === 'in' ? 'In' : 'Out'), item: st.row.title, qty: (type === 'in' ? '+' : '-') + num(e.qty) + ' ' + unit, now: now ? 'Stock now ' + num(now.eff) + ' ' + unit : '', status: 'ok', msg: navigator.onLine && S.url ? 'Saving to Google Sheets in background' : 'Saved on this phone. It will sync when you are online.' };
  if (!navigator.onLine || !S.url) pop.status = 'warn';
  f.qty = 1; f.ref = ''; f.note = '';
  render();
  showPopup(pop);
  clearTimeout(popT);
  popT = setTimeout(closePopup, 1200);      // popup is instant; the sheet saves in the background
  flushEntry(e.id, pop);
}
// send to the sheet without blocking the screen; only interrupt if the sheet rejects the entry
async function flushEntry(id, pop) {
  if (!navigator.onLine || !S.url) return;
  while (S.syncing) await new Promise((r) => setTimeout(r, 200));
  if (S.queue.some((x) => x.id === id)) await sync(true);
  const bad = S.failed.find((x) => x.id === id);
  if (bad) {
    clearTimeout(popT);
    showPopup(Object.assign({}, pop, { kind: 'bad', status: 'bad', title: 'Not added', now: '', msg: 'The sheet rejected it: ' + bad.msg }));
    S.busy = true;                          // stays until the person taps OK
  }
}

/* ---------- confirmation popup ---------- */
let popT;
function showPopup(p) {
  const icon = p.status === 'busy' ? '<span class="spin"></span>' : p.status === 'bad' ? ic('x', 34, 2.6) : p.status === 'warn' ? ic('check', 34, 2.6) : ic('check', 34, 2.6);
  $('#popup').innerHTML = `<div class="pop-scrim"><div class="pop ${p.kind} ${p.status}" role="alertdialog" aria-live="assertive" aria-label="${esc(p.title)}">
    <div class="pop-ic">${icon}</div><h3>${esc(p.title)}</h3>
    <div class="pop-item">${esc(p.item)}</div><div class="pop-qty">${esc(p.qty)}</div>
    ${p.now ? `<div class="pop-sub">${esc(p.now)}</div>` : ''}
    <div class="pop-msg">${esc(p.msg)}</div>
    ${p.status === 'bad' ? '<button class="pop-ok" data-act="pop-ok">OK</button>' : ''}</div></div>`;
}
function closePopup() { clearTimeout(popT); $('#popup').innerHTML = ''; S.busy = false; }

/* ---------- sheets ---------- */
function payName() { try { return String((JSON.parse(localStorage.getItem('artime.money.user')) || {}).name || '').trim(); } catch (e) { return ''; } }
function syncName() { const n = payName(); if (n && store.get('by', '') !== n) store.set('by', n); }   // Payments login name becomes the Stock name too
window.ARTIME_syncName = syncName;
function who() {
  syncName();
  let n = String(store.get('by', '') || '').trim();
  if (!n) { try { n = String((JSON.parse(localStorage.getItem('artime.money.user')) || {}).name || '').trim(); } catch (e) { /* ignore */ } }
  return n;
}
function renderSheet() {
  const el = $('#sheet'); const s = S.sheet;
  if (!s) { el.innerHTML = ''; return; }
  if (s.type === 'menu') {
    const link = (href, icon, title, sub) => `<a class="mi" href="${href}">${ic(icon, 24)}<span><b>${title}</b><small>${sub}</small></span>${ic('right', 18)}</a>`;
    const al = items().filter((i) => i.st === 'out' || i.st === 'low').length;
    const td = today(); let tin = 0, tout = 0;
    moves().forEach((e) => { if (e.date === td && !isDial(e.code)) { const q = Number(e.qty) || 0; if (e.type === 'in') tin += q; else tout += q; } });
    const si = syncInfo(), nm = who();
    el.innerHTML = `<div class="scrim side" data-act="close"><aside class="drawer" role="dialog" aria-label="Menu">
      <div class="dh">${avatarHTML()}<div class="dn">${nm ? `<b>${esc(nm)}</b>` : '<a href="#/more"><b>Add your name</b></a>'}<small>${roleLine()}</small></div></div>
      <div class="dsync ${si.cls}"><span class="pip"></span><span class="t">${esc(si.txt)}</span><button data-act="sync">Sync now</button></div>
      <div class="dsec">Today at a glance</div>
      <div class="dtoday"><div class="g"><b>+${num(tin)}</b><small>In today</small></div><div class="r"><b>-${num(tout)}</b><small>Out today</small></div><div class="${al ? 'a' : ''}"><b>${al}</b><small>To reorder</small></div></div>
      <div class="dsec">Tools</div>
      ${link('#/reorder', 'bell', 'Reorder List', al ? al + (al === 1 ? ' item' : ' items') + ' to order' : 'Nothing to order')}
      ${link('#/dial', 'dial', 'Dial Out', 'Make dials, choose the parts')}
      ${link('#/categories', 'grid', 'Categories', 'Manage item categories')}
      ${payFirst() ? link('#/stock', 'cube', 'Stock Overview', 'Items and alerts') : ''}
      ${link('#/payreport', 'chart', 'Payments Report', 'Cash and bank totals')}
      <div class="dsec">Language</div>
      <div class="dlang">${langSeg()}</div>
      <div class="dsec">App</div>
      ${link('#/more', 'gear', 'Settings', 'Name, language, links, install')}
      ${S.installEvt && !isStandalone() ? `<button class="mi" data-act="install">${ic('download', 24)}<span><b>Install app</b><small>Opens full screen like a normal app</small></span></button>` : ''}
      <div class="dfoot">${esc(APP_NAME)} &middot; v22</div>
    </aside></div>`;
    return;
  }
  if (s.type === 'payadd') {
    el.innerHTML = `<div class="scrim" data-act="close"><div class="sheet" role="dialog" aria-label="New payment"><div class="grab"></div><h3>New payment</h3><div class="acts">
      <a class="bigact in" href="#/pay?t=in">${ic('up', 34, 2.2)}<span><b>Payment In</b><small>Money received</small></span></a>
      <a class="bigact out" href="#/pay?t=out">${ic('down', 34, 2.2)}<span><b>Payment Out</b><small>Money paid</small></span></a></div></div></div>`;
    return;
  }
  if (s.type === 'add') {
    el.innerHTML = `<div class="scrim" data-act="close"><div class="sheet" role="dialog" aria-label="New entry"><div class="grab"></div><h3>New entry</h3><div class="acts">
      <a class="bigact in" href="#/in">${ic('up', 34, 2.2)}<span><b>Stock In</b><small>Add incoming stock</small></span></a>
      <a class="bigact out" href="#/out">${ic('down', 34, 2.2)}<span><b>Stock Out</b><small>Record outgoing stock</small></span></a>
      <a class="bigact dial" href="#/dial">${ic('dial', 34, 2.2)}<span><b>Dial Out</b><small>Make dials - all parts go out together</small></span></a></div></div></div>`;
    return;
  }
  const it = items().find((i) => i.code === s.code);
  if (!it) { el.innerHTML = ''; return; }
  const nm = {}; items().forEach((i) => { nm[i.code] = i.title; });
  const mv = sortMoves(moves().filter((e) => e.code === it.code)).slice(0, 6);
  el.innerHTML = `<div class="scrim" data-act="close"><div class="sheet" role="dialog" aria-label="${esc(it.title)}"><div class="grab"></div>
    <div class="hd">${art(it.base, 64)}<div style="flex:1;min-width:0"><b>${esc(it.title)}</b><small>${esc(it.code)}</small></div>${pill(it.st, it.code)}</div>
    <div class="nums"><div><small>Current Stock</small><b>${num(it.eff)}</b></div><div><small>Reorder Level</small><b>${num(it.min)}</b></div><div><small>Unit</small><b style="font-size:17px;line-height:2">${esc(unitLabel(it.unit))}</b></div></div>
    ${isDial(it.code) ? `<div class="two" style="margin-top:0"><a class="bigact dial" style="padding:14px" href="#/dial?code=${encodeURIComponent(it.code)}">${ic('dial', 26, 2.2)}<b style="font-size:17px">Dial Out</b></a></div>` : `<div class="two" style="margin-top:0"><a class="bigact in" style="padding:14px" href="#/in?code=${encodeURIComponent(it.code)}">${ic('up', 26, 2.2)}<b style="font-size:17px">Stock In</b></a><a class="bigact out" style="padding:14px" href="#/out?code=${encodeURIComponent(it.code)}">${ic('down', 26, 2.2)}<b style="font-size:17px">Stock Out</b></a></div>`}
    <h4>Recent movements</h4>${mv.length ? mv.map((e) => actRow(e, nm)).join('') : '<div class="empty" style="padding:14px">No movements for this item yet.</div>'}</div></div>`;
}

/* ---------- toast ---------- */
let toastT;
function toast(msg, bad) {
  const t = $('#toast'); t.textContent = msg; t.className = 'show' + (bad ? ' bad' : '');
  clearTimeout(toastT); toastT = setTimeout(() => { t.className = ''; }, 3600);
}

/* ================= events ================= */
document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act, v = el.dataset.v;
  const r = route(); const type = r.name;
  switch (act) {
    case 'sync': S.queue.length ? sync() : refresh(); break;
    case 'refresh': refresh(); break;
    case 'lang': store.set('lang', v === 'hi' ? 'hi' : 'en'); document.documentElement.lang = lang(); render(); break;
    case 'add': S.sheet = { type: 'add' }; renderSheet(); break;
    case 'payadd': S.sheet = null; location.hash = '#/pay'; break;
    case 'avatar': { const m = store.get('avatars', {}) || {}, k = who() || '_'; if (v === '-1') delete m[k]; else m[k] = Number(v); store.set('avatars', m); render(); break; }
    case 'menu': S.sheet = { type: 'menu' }; renderSheet(); break;
    case 'close': if (ev.target === el) { S.sheet = null; renderSheet(); } break;
    case 'open-item': S.sheet = { type: 'item', code: el.dataset.code }; renderSheet(); break;
    case 'go-more': location.hash = '#/more'; break;
    case 'fc': S.filter.cat = v; render(); break;
    case 'fs': S.filter.status = v; render(); break;
    case 'rrange': S.repRange = Number(v); render(); break;
    case 'rtype': S.repType = v; render(); break;
    case 'repshare': window.open('https://wa.me/?text=' + encodeURIComponent(repSummaryText()), '_blank'); break;
    case 'repcsv': { const { nm, list } = repFiltered(); downloadCSV('stock-report.csv', [['Date', 'Type', 'Item', 'Code', 'Quantity', 'Supplier / Used for', 'Reference', 'Note', 'By']].concat(list.map((e) => [e.date, isDial(e.code) ? 'Dial Out' : e.type === 'in' ? 'Stock In' : 'Stock Out', nm[e.code] || e.code, e.code, e.qty, e.party || '', e.ref || '', e.note || '', e.by || '']))); break; }
    case 'fcat': ensureForm(type).cat = v; render(); break;
    case 'fsize': ensureForm(type).size = v; render(); break;
    case 'dpart': { const f = ensureForm('dial'); const i = Number(v); f.skip = f.skip.includes(i) ? f.skip.filter((x) => x !== i) : f.skip.concat(i); updateDial(); break; }
    case 'dall': { const f = ensureForm('dial'); f.skip = f.skip.length ? [] : DIAL_PART_NAMES.map((_, i) => i); updateDial(); break; }
    case 'dsize': ensureForm('dial').dcode = v; render(); break;
    case 'fvar': ensureForm(type).variant = v; render(); break;
    case 'qplus': case 'qminus': {
      const f = ensureForm(type); const n = Number(f.qty) || 0;
      f.qty = Math.max(0, n + (act === 'qplus' ? 1 : -1));
      const i = $('#qty'); if (i) i.value = f.qty; updateFormDynamic(); break;
    }
    case 'pick': { const i = $('#date'); if (i && i.showPicker) { try { i.showPicker(); } catch (e) { /* not supported */ } } break; }
    case 'submit': if (type === 'dial') submitDial(); else submitForm(type); break;
    case 'pop-ok': closePopup(); break;
    case 'save-url': {
      const val = ($('#url').value || '').trim();
      if (!/^https:\/\/script\.google\.com\/.+\/exec/.test(val)) { toast('That does not look like a Web app link ending in /exec.', true); break; }
      S.url = val; store.set('url', val); S.error = ''; toast('Link saved'); refresh(); break;
    }
    case 'reset-url': S.url = CFG.scriptUrl; store.set('url', S.url); render(); refresh(); break;
    case 'discard': S.queue = S.queue.filter((e) => e.id !== el.dataset.id); saveQueue(); render(); break;
    case 'discard-failed': S.failed = S.failed.filter((e) => e.id !== el.dataset.id); saveQueue(); render(); break;
    case 'install': if (S.installEvt) { S.installEvt.prompt(); S.installEvt = null; render(); } break;
    default: break;
  }
});
document.addEventListener('input', (ev) => {
  const el = ev.target.closest('[data-bind]'); if (!el) return;
  const k = el.dataset.bind, r = route(), type = r.name;
  if (k === 'q') { S.filter.q = el.value; renderItemList(); return; }
  if (k === 'rq') { S.repQ = el.value; const l = $('#replist'); if (l) { l.innerHTML = repListHTML(); const n = $('#repcnt'); if (n) n.textContent = repFiltered().list.length; } return; }
  if (k === 'url') return;
  if (!isFormRoute(type)) return;
  const f = ensureForm(type);
  if (k === 'qty') { f.qty = el.value; updateFormDynamic(); }
  else if (k === 'date') { f.date = el.value || today(); const v = $('.datef .val'); if (v) v.textContent = dLong(f.date); }
  else if (k === 'party' || k === 'ref' || k === 'note' || k === 'used') f[k] = el.value;
});
document.addEventListener('change', (ev) => {
  const el = ev.target.closest('[data-bind]'); if (!el) return;
  const k = el.dataset.bind, r = route(), type = r.name;
  if (k === 'base') { const f = ensureForm(type); f.base = el.value; f.size = null; f.variant = null; render(); }
  else if (k === 'homeRange') { S.homeRange = Number(el.value); render(); }
});
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && S.sheet) { S.sheet = null; renderSheet(); } });
window.addEventListener('hashchange', onRoute);
window.addEventListener('online', () => { if (S.queue.length) sync(true); else refresh(true); });
window.addEventListener('offline', () => softRender());
let lastVis = 0;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && Date.now() - lastVis > 30000) { lastVis = Date.now(); S.queue.length ? sync(true) : refresh(true); }
});
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); S.installEvt = e; if (['more', 'home'].includes(route().name)) render(); });
window.addEventListener('appinstalled', () => { S.installEvt = null; toast('App installed'); });

/* ---------- Dial Out form ---------- */
function dialState() {
  const f = ensureForm('dial');
  const ds = items().filter((i) => isDial(i.code));
  if (!ds.some((d) => d.code === f.dcode)) f.dcode = ds.length ? ds[0].code : null;
  const row = ds.find((d) => d.code === f.dcode) || null;
  const q = Number(f.qty);
  const byCode = {}; items().forEach((i) => { byCode[i.code] = i; });
  const parts = row ? dialParts(row.code).map((c, i) => ({ i, code: c, name: DIAL_PART_NAMES[i], it: byCode[c], on: !f.skip.includes(i) })).filter((p) => p.it) : [];
  const chosen = parts.filter((p) => p.on);
  const short = chosen.filter((p) => p.it.eff < q);
  const limit = chosen.length ? chosen.reduce((a, p) => (p.it.eff < a.it.eff ? p : a)) : null;
  const canMake = limit ? Math.max(0, Math.floor(limit.it.eff)) : 0;
  let err = '';
  if (!row) err = 'Choose a dial size.'; else if (!(q > 0)) err = 'Enter a quantity above 0.'; else if (!chosen.length) err = 'Tick at least one part.';
  return { f, ds, row, q, parts, chosen, short, limit, canMake, err, ok: !err };
}
function vDial() {
  const st = dialState(); const f = st.f;
  const usedFor = uniq(['Production', 'Order', 'Sample'].concat(S.history.filter((e) => e.type === 'out' && e.party).map((e) => e.party))).slice(0, 40);
  return `<div class="form dial">
    <div class="fl">Dial size<i>*</i></div>
    <div class="sizes">${st.ds.map((d) => `<button class="size ${d.code === f.dcode ? 'on' : ''}" data-act="dsize" data-v="${esc(d.code)}">${esc(sizeLabel(d.size) || d.size)}</button>`).join('') || '<div class="empty-card">No dial items loaded yet. Go back and sync first.</div>'}</div>
    <div id="fcard"></div>
    <label class="fl" for="qty">How many dials<i>*</i></label>
    <div class="qty"><button data-act="qminus" aria-label="Decrease">${ic('minus', 22, 2.2)}</button><input id="qty" type="number" inputmode="decimal" min="0" step="any" value="${esc(f.qty)}" data-bind="qty"><button data-act="qplus" aria-label="Increase">${ic('plus', 22, 2.2)}</button><span class="unit">Pcs</span></div>
    <div class="hint" id="qhint"></div>
    <div class="fl" style="margin-top:8px">Date<i>*</i></div>
    <div class="field datef" data-act="pick">${ic('cal', 22)}<span class="val">${esc(dLong(f.date))}</span>${ic('chev', 20)}<input id="date" type="date" value="${esc(f.date)}" data-bind="date" aria-label="Date"></div>
    <div class="pair">
      <div><label class="fl" for="used">Used for</label><div class="field">${ic('layers', 22)}<input id="used" list="dl-used" placeholder="Production" value="${esc(f.used)}" data-bind="used" autocomplete="off"><datalist id="dl-used">${usedFor.map((x) => `<option value="${esc(x)}">`).join('')}</datalist></div></div>
      <div><label class="fl" for="ref">Reference No.</label><div class="field">${ic('file', 22)}<input id="ref" placeholder="Voucher / Order No." value="${esc(f.ref)}" data-bind="ref" autocomplete="off"></div></div>
    </div>
    <label class="fl" for="note">Notes <small>(optional)</small></label>
    <div class="field">${ic('pencil', 20)}<input id="note" placeholder="Add notes..." value="${esc(f.note)}" data-bind="note" autocomplete="off"></div>
    <button class="submit" id="fsubmit" data-act="submit">${ic('down', 24, 2.2)}<span>Record Dial Out</span></button>
  </div>`;
}
function updateDial() {
  const st = dialState(); const card = $('#fcard'); if (!card) return;
  const q = st.q > 0 ? st.q : 0;
  if (st.row) {
    card.innerHTML = `<div class="pcard"><div class="head">${art('Dial', 76)}<div><b>${esc(st.row.code)}</b><small>${esc(st.row.title)}</small></div></div>
      <div class="parts-h"><span>Tick the parts that go out for ${num(q)} dial${q === 1 ? '' : 's'}</span><button class="selall" data-act="dall">${st.parts.some((p) => !p.on) ? 'Select all' : 'Clear all'}</button></div>
      ${st.parts.map((p) => `<button class="part pick ${p.on ? 'on' : 'off'}" data-act="dpart" data-v="${p.i}" role="checkbox" aria-checked="${p.on}"><span class="cb">${p.on ? ic('check', 16, 3) : ''}</span><span class="pn">${esc(p.it.title)}</span>${p.on ? `<span class="pv">${num(p.it.eff)} &rarr; <b class="${p.it.eff - q < 0 ? 'r' : ''}">${num(p.it.eff - q)}</b></span>` : '<span class="pv skip">Not used</span>'}</button>`).join('')}</div>`;
  } else card.innerHTML = '';
  const hint = $('#qhint');
  if (hint) {
    if (st.row && st.short.length && q > 0) { hint.textContent = 'Not enough ' + st.short.map((p) => p.it.title).join(', ') + '. Stock will go below zero.'; hint.className = 'hint bad'; }
    else if (st.row && st.limit) { hint.textContent = `Stock allows up to ${num(st.canMake)} dial${st.canMake === 1 ? '' : 's'} (limited by ${st.limit.name}).`; hint.className = 'hint'; }
    else { hint.textContent = ''; hint.className = 'hint'; }
  }
  const btn = $('#fsubmit'); if (btn) btn.disabled = !st.ok;
}
async function submitDial() {
  if (S.busy) return;
  const st = dialState(); if (!st.ok) return;
  S.busy = true;
  const f = st.f;
  const left = st.parts.filter((p) => !p.on);
  const note = [(f.note || '').trim()].concat(left.map((p) => skipTok(p.code))).filter(Boolean).join(' ');
  const e = { id: newId(), ts: Date.now(), type: 'out', code: st.row.code, qty: st.q, date: f.date || today(), party: (f.used || '').trim() || 'Production', ref: (f.ref || '').trim(), note };
  S.queue.push(e); saveQueue();
  const online = navigator.onLine && S.url;
  const pop = { kind: 'out', title: 'Dial Out recorded', item: st.row.title, qty: '-' + num(e.qty) + ' dial' + (e.qty === 1 ? '' : 's'), now: left.length ? 'Without ' + left.map((p) => p.name).join(', ') : 'All parts for this size were taken out', status: online ? 'ok' : 'warn', msg: online ? 'Saving to Google Sheets in background' : 'Saved on this phone. It will sync when you are online.' };
  f.qty = 1; f.ref = ''; f.note = ''; f.skip = [];
  render();
  showPopup(pop);
  clearTimeout(popT);
  popT = setTimeout(closePopup, 1200);
  flushEntry(e.id, pop);
}

/* ================= boot ================= */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const hadSW = !!navigator.serviceWorker.controller; let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadSW && !reloaded) { reloaded = true; location.reload(); } });
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
syncName();
onRoute();
lastVis = Date.now();
if (S.queue.length) sync(true); else refresh(true);

/* ================= Reorder (button on low / out items -> WhatsApp) ================= */
function reorderedFor(code) {
  const all = store.get('rlog', []).concat(store.get('rq', []).map((r) => ({ code: r.code, qty: r.qty, date: r.date })));
  const mine = all.filter((r) => r.code === code).sort((x, y) => (x.date < y.date ? 1 : -1))[0];
  if (!mine) return null;
  const arrived = S.history.concat(S.queue).some((e) => e.type === 'in' && e.code === code && e.date >= mine.date);
  return arrived ? null : mine;                      // a Stock In after the reorder clears the mark
}
const waNum = (p) => { let d = String(p || '').replace(/\D/g, '').replace(/^0+/, ''); return d.length === 10 ? '91' + d : d; };
function rsMsg(it, row, qty) {
  const t = (row && row.msg) || store.get('rmsg', 'Hello {supplier}, please send {item} - {qty} {unit}. - ARTIME');
  const unit = String(unitLabel(it.unit)).toLowerCase();
  const v = { supplier: (row && row.supplier) || '', item: (row && row.sname) || it.title, qty: qty, quantity: qty, unit: unit, units: unit, stock: it.eff, date: dRel(today()) };
  let hasQty = false;
  let out = t.replace(/\{\s*(\w+)\s*\}/g, (m, k) => { k = k.toLowerCase(); if (k === 'qty' || k === 'quantity') hasQty = true; return k in v ? v[k] : m; });
  if (!hasQty) out = out.replace(/\s+$/, '') + ' Quantity: ' + qty + ' ' + unit;     // message in the sheet has no {qty}: always add the quantity
  return out;
}
const rowFor = (code) => store.get('rsetup', []).find((r) => String(r.code).trim().toUpperCase() === String(code).trim().toUpperCase()) || null;
function openReorder(code, fresh, note) {
  const it = items().find((i) => i.code === code); if (!it) return;
  const row = rowFor(code);
  // number / message missing on this phone: pull the latest Reorder Setup straight from the sheet, then reopen
  if (!fresh && (!row || !row.phone) && S.url && navigator.onLine) {
    apiGet().then((j) => {
      if (!document.getElementById('rs')) return;
      if (j && Array.isArray(j.reorderSetup)) { store.set('rsetup', j.reorderSetup); if (j.reorderMessage) store.set('rmsg', j.reorderMessage); openReorder(code, true); }
      else openReorder(code, true, 'Your Stock Google Script is an old version. Paste the new StockScript.gs, then Deploy > Manage deployments > New version.');
    }).catch(() => { if (document.getElementById('rs')) openReorder(code, true); });
  }
  const q0 = (row && row.qty) || Math.max(1, Math.round(it.min * 2 - it.eff));
  let el = document.getElementById('rs'); if (!el) { el = document.createElement('div'); el.id = 'rs'; document.body.appendChild(el); }
  el.innerHTML = `<div class="rsb" data-rx="close"><div class="rsc" onclick="event.stopPropagation()"><div class="grab"></div>
    <h3>Reorder ${esc(it.title)}</h3><small>${esc(it.code)} · Stock ${num(it.eff)} ${esc(unitLabel(it.unit))} · Min ${num(it.min)}</small>
    <p class="rsup">${row && row.phone ? 'To: <b>' + esc(row.supplier || 'Supplier') + '</b> (' + esc(row.phone) + ')' : '<span class="r">' + esc(note || (row ? 'No WhatsApp number for this item in the Reorder Setup sheet.' : (fresh ? 'This code is not filled in the Reorder Setup sheet.' : 'Reading supplier from the sheet...'))) + ' You can still pick a contact in WhatsApp.</span>'}</p>
    <label>Quantity</label><input id="rqty" type="number" inputmode="decimal" value="${q0}">
    <label>Message</label><textarea id="rtxt" rows="4">${esc(rsMsg(it, row, q0))}</textarea>
    <button class="go" data-rx="send" data-code="${esc(code)}">Send on WhatsApp</button><button class="rcancel" data-rx="close">Cancel</button></div></div>`;
  document.getElementById('rqty').addEventListener('input', (e) => { document.getElementById('rtxt').value = rsMsg(it, row, e.target.value); });
}
document.addEventListener('click', (ev) => {
  try {
    const r = ev.target.closest('[data-r]'), x = ev.target.closest('[data-rx]');
    if (r) { ev.stopPropagation(); ev.preventDefault(); openReorder(r.dataset.r); return; }
    if (!x) return;
    if (x.classList.contains('rsb') && ev.target !== x) return;     // tapping inside the popup (quantity, message) must not close it
    ev.stopPropagation();
    const el = document.getElementById('rs');
    if (x.dataset.rx === 'close') { if (el) el.remove(); return; }
    if (x.dataset.rx === 'send') {
      const code = x.dataset.code, qty = parseFloat(document.getElementById('rqty').value);
      if (!(qty > 0)) { toast('Enter a quantity', true); return; }
      const row = rowFor(code) || {}, text = document.getElementById('rtxt').value;
      store.set('rq', store.get('rq', []).concat([{ id: 'R' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), code, qty, date: today(), supplier: row.supplier || '', phone: row.phone || '', by: store.get('by', '') || '-' }]));
      if (el) el.remove();
      window.open('https://wa.me/' + waNum(row.phone) + '?text=' + encodeURIComponent(text), '_blank');
      sync(true); render();
    }
  } catch (e) { toast('Reorder had a problem. Nothing was lost.', true); }
}, true);
})();
