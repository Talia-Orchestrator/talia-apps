'use strict';

const italian = String(window.orkasApp.host.getContext().language || '').toLowerCase().startsWith('it');
const copy = italian ? {
  title: 'Visualizzatore CSV', intro: 'Apri un file CSV per cercare e ordinare i dati. Il file resta sul tuo dispositivo.',
  file: 'Apri file CSV', search: 'Cerca', example: 'Carica esempio',
  limits: 'Fino a 2 MB, 5.000 righe e 100 colonne. File UTF-8 separati da virgole.',
  error: 'Impossibile leggere il CSV. Controlla virgolette, colonne e limiti del file.',
  sampleError: 'Impossibile caricare l’esempio. Puoi riprovare o aprire un file.',
  empty: 'Nessuna riga corrisponde alla ricerca.', rows: 'righe',
} : {
  title: 'CSV Viewer', intro: 'Open a CSV file to search and sort it. Your file stays on your device.',
  file: 'Open CSV file', search: 'Search', example: 'Load example',
  limits: 'Up to 2 MB, 5,000 rows and 100 columns. Comma-separated UTF-8 files.',
  error: 'Could not read CSV. Check quotes, columns and file size limits.',
  sampleError: 'Could not load the example. Retry or open your own file.',
  empty: 'No rows match your search.', rows: 'rows',
};
document.documentElement.lang = italian ? 'it' : 'en';
document.title = copy.title;
for (const [selector, key] of Object.entries({ '[data-title]': 'title', '[data-intro]': 'intro',
  '[data-file-label]': 'file', '[data-search-label]': 'search', '[data-example]': 'example', '[data-limits]': 'limits' })) {
  document.querySelector(selector).textContent = copy[key];
}
const status = document.querySelector('[role="status"]');
const host = document.querySelector('[data-table]');
const count = document.querySelector('[data-count]');
const search = document.querySelector('[data-search]');
const upload = document.querySelector('[data-file]');
let rows = [];
let headers = [];
let sort = { field: '', direction: 'asc' };
let generation = 0;

function render() {
  const query = search.value.trim().toLocaleLowerCase();
  const filtered = rows.filter(row => Object.values(row).some(value => value.toLocaleLowerCase().includes(query)));
  filtered.sort((a, b) => String(a[sort.field] || '').localeCompare(String(b[sort.field] || ''), italian ? 'it' : 'en',
    { sensitivity: 'base', numeric: true }) * (sort.direction === 'asc' ? 1 : -1));
  host.replaceChildren();
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const field of headers) {
    const th = document.createElement('th');
    th.scope = 'col';
    if (sort.field === field) th.setAttribute('aria-sort', sort.direction === 'asc' ? 'ascending' : 'descending');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = field + (sort.field === field ? (sort.direction === 'asc' ? ' ▲' : ' ▼') : '');
    button.addEventListener('click', () => {
      sort = { field, direction: sort.field === field && sort.direction === 'asc' ? 'desc' : 'asc' };
      render();
    });
    th.append(button);
    headRow.append(th);
  }
  thead.append(headRow);
  const tbody = document.createElement('tbody');
  for (const row of filtered) {
    const tr = document.createElement('tr');
    for (const field of headers) {
      const td = document.createElement('td');
      td.textContent = row[field];
      tr.append(td);
    }
    tbody.append(tr);
  }
  table.append(thead, tbody);
  host.append(table);
  count.textContent = filtered.length + ' / ' + rows.length + ' ' + copy.rows;
  status.textContent = filtered.length ? '' : copy.empty;
}

function display(text) {
  const parsed = window.TaliaCsvViewer.parseDocument(text);
  rows = parsed.rows;
  headers = parsed.headers;
  sort = { field: headers[0] || '', direction: 'asc' };
  search.value = '';
  render();
}
function fail(message) {
  rows = [];
  headers = [];
  host.replaceChildren();
  count.textContent = '';
  status.textContent = message;
}
async function loadExample() {
  const requested = ++generation;
  try {
    const response = await fetch('./fixtures/contacts.csv');
    if (!response.ok) throw new Error('sample_unavailable');
    const text = await response.text();
    if (requested !== generation) return;
    display(text);
    upload.value = '';
  } catch { if (requested === generation) fail(copy.sampleError); }
}
upload.addEventListener('change', async () => {
  const file = upload.files[0];
  if (!file) return;
  const requested = ++generation;
  try {
    if (file.size > window.TaliaCsvViewer.MAX_BYTES) throw new Error('file_too_large');
    const text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
    if (requested === generation) display(text);
  } catch { if (requested === generation) fail(copy.error); }
  upload.value = '';
});
search.addEventListener('input', render);
document.querySelector('[data-example]').addEventListener('click', () => void loadExample());
void loadExample();
