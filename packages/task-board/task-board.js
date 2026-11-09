'use strict';

// Ogni cambio di stato aggiunge una revisione. I record precedenti restano conservati.
function latestTasks(records) {
  const tasks = new Map();
  for (const record of records) {
    const taskId = record.taskId || record.id;
    const previous = tasks.get(taskId);
    if (!previous || (record.revision || 0) > (previous.revision || 0)
        || ((record.revision || 0) === (previous.revision || 0) && record.createdAt > previous.createdAt)) {
      tasks.set(taskId, { ...record, taskId });
    }
  }
  return [...tasks.values()];
}
if (typeof module !== 'undefined' && module.exports) module.exports = { latestTasks };

if (typeof document !== 'undefined') {
  const api = window.orkasApp;
  const form = document.querySelector('form');
  const status = document.querySelector('[role="status"]');
  const reload = document.querySelector('[data-reload]');
  const retrySave = document.querySelector('[data-retry-save]');
  retrySave.textContent = String(api.host.getContext().language || '').startsWith('it') ? 'Riprova salvataggio' : 'Retry saving';
  const italian = String(api.host.getContext().language || '').toLowerCase().startsWith('it');
  const labels = italian ? { todo: 'Da fare', doing: 'In corso', done: 'Completata' }
    : { todo: 'To do', doing: 'In progress', done: 'Done' };
  const copy = italian ? {
    title: 'Bacheca attività', intro: 'Aggiungi attività e spostale tra Da fare, In corso e Completata.',
    titleLabel: 'Attività', detailsLabel: 'Dettagli', statusLabel: 'Stato', add: 'Aggiungi attività',
    move: 'Salva stato', empty: 'Nessuna attività.', reload: 'Riprova caricamento', saved: 'Attività salvata.',
    saveError: 'Salvataggio non confermato. Riprova la stessa operazione.',
    loadError: 'Impossibile caricare le attività. Riprova il caricamento.',
  } : {
    title: 'Task Board', intro: 'Add tasks and move them between To do, In progress, and Done.',
    titleLabel: 'Task title', detailsLabel: 'Details', statusLabel: 'Status', add: 'Add task',
    move: 'Save status', empty: 'No tasks.', reload: 'Retry loading', saved: 'Task saved.',
    saveError: 'Save was not confirmed. Retry the same operation.',
    loadError: 'Could not load tasks. Retry loading.',
  };
  document.documentElement.lang = italian ? 'it' : 'en';
  document.title = copy.title;
  for (const [selector, key] of Object.entries({ '[data-title]': 'title', '[data-intro]': 'intro',
    '[data-title-label]': 'titleLabel', '[data-details-label]': 'detailsLabel',
    '[data-status-label]': 'statusLabel', '[data-add]': 'add', '[data-reload]': 'reload' })) {
    document.querySelector(selector).textContent = copy[key];
  }
  for (const key of Object.keys(labels)) {
    document.querySelector(`[data-heading="${key}"]`).textContent = labels[key];
    form.elements.status.querySelector(`option[value="${key}"]`).textContent = labels[key];
  }
  let busy = false;
  let pending = null;
  let pendingCreating = false;

  async function refresh() {
    reload.hidden = true;
    try {
      const records = [];
      for (let offset = 0; offset < 1000; offset += 100) {
        const result = await api.data.query({ table: 'tasks', fields: ['id', 'taskId', 'revision', 'title', 'details', 'status', 'createdAt'],
          order: { field: 'createdAt', direction: 'asc' }, limit: 100, offset });
        records.push(...result.records);
        if (result.records.length < 100) break;
      }
      for (const column of document.querySelectorAll('[data-column]')) column.replaceChildren();
      for (const task of latestTasks(records)) {
        const card = document.createElement('article');
        card.className = 'task';
        card.dataset.taskId = task.taskId;
        const title = document.createElement('h3');
        title.textContent = task.title;
        const details = document.createElement('p');
        details.textContent = task.details || '';
        const select = document.createElement('select');
        select.setAttribute('aria-label', copy.statusLabel + ' ' + task.title);
        for (const [value, label] of Object.entries(labels)) {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = label;
          select.append(option);
        }
        select.value = task.status;
        const save = document.createElement('button');
        save.type = 'button';
        save.textContent = copy.move;
        save.addEventListener('click', () => {
          if (!pending && select.value === task.status) return;
          void saveEvent({ taskId: task.taskId, revision: (task.revision || 0) + 1,
            title: task.title, details: task.details || '', status: select.value });
        });
        card.append(title, details, select, save);
        (document.querySelector(`[data-column="${task.status}"]`) || document.querySelector('[data-column="todo"]')).append(card);
      }
      for (const column of document.querySelectorAll('[data-column]')) {
        if (!column.childElementCount) column.textContent = copy.empty;
      }
      return true;
    } catch {
      status.textContent = copy.loadError;
      reload.hidden = false;
      return false;
    }
  }

  async function saveEvent(values, creating = false, retry = false) {
    if (busy || (pending && !retry)) return;
    pendingCreating = creating;
    retrySave.hidden = true;
    busy = true;
    pending ||= { table: 'tasks', values, requestId: crypto.randomUUID() };
    for (const control of document.querySelectorAll('input, textarea, select, button')) control.disabled = true;
    try {
      await api.data.insert(pending);
      pending = null;
      if (creating) form.reset();
      if (await refresh()) status.textContent = copy.saved;
    } catch {
      status.textContent = copy.saveError;
      retrySave.hidden = false;
    } finally {
      busy = false;
      for (const control of document.querySelectorAll('input, textarea, select, button')) control.disabled = !!pending;
      retrySave.disabled = false;
    }
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    const title = form.elements.title.value.trim();
    if (!title) return;
    void saveEvent({ taskId: crypto.randomUUID(), revision: 0, title,
      details: form.elements.details.value.trim(), status: form.elements.status.value }, true);
  });
  retrySave.addEventListener('click', () => { if (pending) void saveEvent(pending.values, pendingCreating, true); });
  reload.addEventListener('click', async () => { if (await refresh()) status.textContent = ''; });
  void refresh();
}
