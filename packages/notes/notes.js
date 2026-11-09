'use strict';

const api = window.orkasApp;
const form = document.querySelector('form');
const status = document.querySelector('[role="status"]');
const reload = document.querySelector('[data-reload]');
const host = document.querySelector('[data-notes]');
const italian = String(api.host.getContext().language || '').toLowerCase().startsWith('it');
const copy = italian ? {
  title: 'Note', intro: 'Crea una nota e consulta quelle salvate.', titleLabel: 'Titolo',
  bodyLabel: 'Nota', save: 'Salva nota', listHeading: 'Note salvate', reload: 'Riprova caricamento',
  empty: 'Non ci sono ancora note.', saved: 'Nota salvata.', loading: 'Caricamento…',
  loadError: 'Impossibile caricare le note. Riprova il caricamento.',
  saveError: 'Salvataggio non confermato. Premi Salva nota per riprovare la stessa nota.',
} : {
  title: 'Notes', intro: 'Create a note and browse your saved notes.', titleLabel: 'Title',
  bodyLabel: 'Note', save: 'Save note', listHeading: 'Saved notes', reload: 'Retry loading',
  empty: 'No notes yet.', saved: 'Note saved.', loading: 'Loading…',
  loadError: 'Could not load notes. Retry loading.',
  saveError: 'Save was not confirmed. Press Save note to retry the same note.',
};
document.documentElement.lang = italian ? 'it' : 'en';
document.title = copy.title;
for (const [selector, key] of Object.entries({
  '[data-title]': 'title', '[data-intro]': 'intro', '[data-title-label]': 'titleLabel',
  '[data-body-label]': 'bodyLabel', '[data-save]': 'save', '[data-list-heading]': 'listHeading',
  '[data-reload]': 'reload',
})) document.querySelector(selector).textContent = copy[key];

async function refresh() {
  reload.hidden = true;
  const records = [];
  try {
    for (let offset = 0; offset < 500; offset += 100) {
      const result = await api.data.query({ table: 'notes', fields: ['title', 'body', 'createdAt'],
        order: { field: 'createdAt', direction: 'desc' }, limit: 100, offset });
      records.push(...result.records);
      if (result.records.length < 100) break;
    }
    host.replaceChildren();
    for (const record of records) {
      const article = document.createElement('article');
      const title = document.createElement('h3');
      title.textContent = record.title;
      const time = document.createElement('time');
      time.dateTime = record.createdAt;
      time.textContent = new Date(record.createdAt).toLocaleString(italian ? 'it-IT' : 'en-US');
      const body = document.createElement('p');
      body.textContent = record.body;
      article.append(title, time, body);
      host.append(article);
    }
    if (!records.length) host.textContent = copy.empty;
    return true;
  } catch {
    status.textContent = copy.loadError;
    reload.hidden = false;
    return false;
  }
}

let pending = null;
form.addEventListener('submit', async event => {
  event.preventDefault();
  const title = form.elements.title.value.trim();
  const body = form.elements.body.value.trim();
  if (!title || !body) return;
  const button = form.querySelector('button');
  button.disabled = true;
  pending ||= { table: 'notes', values: { title, body }, requestId: crypto.randomUUID() };
  // La stessa richiesta viene riutilizzata dopo un esito incerto, senza duplicare la nota.
  form.elements.title.readOnly = true;
  form.elements.body.readOnly = true;
  try {
    await api.data.insert(pending);
    pending = null;
    form.reset();
    form.elements.title.readOnly = false;
    form.elements.body.readOnly = false;
    if (await refresh()) status.textContent = copy.saved;
  } catch {
    status.textContent = copy.saveError;
  } finally {
    button.disabled = false;
  }
});
reload.addEventListener('click', async () => { if (await refresh()) status.textContent = ''; });
status.textContent = copy.loading;
void refresh().then(loaded => { if (loaded) status.textContent = ''; });
