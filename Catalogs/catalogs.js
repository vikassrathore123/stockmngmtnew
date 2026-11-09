/* catalogs.js - the list of PDF catalogs that can be shared from the app menu (Menu > Catalogs).
   HOW TO ADD A CATALOG: put the PDF in this "catalogs" folder, then add one line below.
   "file" must match the PDF's file name exactly (capital/small letters count). */
/* The picture that shows how to open the wholesale catalog from the PDFs. Put it in this folder with exactly this name.
   It is sent FIRST when you tap "Share all catalogs". If the file is not there, the app simply skips it. */
window.CATALOG_GUIDE = { name: 'How to open the wholesale catalog', file: 'how-to-open-wholesale-catalog.jpg' };
window.CATALOGS = [
  { name: 'Station Clocks', file: 'Station clocks.pdf' },
  { name: 'Wall Clocks', file: 'Wall clocks.pdf' },
  { name: 'Table Clocks', file: 'Table clocks.pdf' },
  { name: 'Painting Clocks', file: 'Painting clocks.pdf' }
];
