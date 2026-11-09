'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const apps = path.resolve(__dirname, '..', 'packages');

for (const id of ['notes', 'task-board', 'csv-viewer']) {
  test(`${id} has an SDK v1 manifest, HTML entrypoint and package license`, () => {
    const root = path.join(apps, id);
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'orkas-app.json'), 'utf8'));
    const extension = JSON.parse(fs.readFileSync(path.join(root, 'talia-extension.json'), 'utf8'));
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    assert.equal(manifest.sdkVersion, 1);
    assert.ok(Array.isArray(manifest.capabilities));
    assert.equal(extension.kind, 'app');
    assert.match(html, /<!doctype html>/i);
    assert.match(html, /__orkas\/sdk\.js/);
    assert.ok(fs.statSync(path.join(root, 'LICENSE')).isFile());
    assert.ok(fs.statSync(path.join(root, 'NOTICE')).isFile());
    assert.equal(html.includes('/Users/'), false);
    assert.doesNotMatch(html, /Bearer\s+[A-Za-z0-9_-]{16,}/i);
  });
}

test('CSV viewer parses quoted commas, quotes, line breaks, and rejects malformed rows', () => {
  const { parseCsv } = require('../packages/csv-viewer/csv-viewer.js');
  const fixture = fs.readFileSync(path.join(apps, 'csv-viewer', 'fixtures', 'contacts.csv'), 'utf8');
  const rows = parseCsv(fixture);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].note, 'First line, with comma');
  assert.equal(rows[1].note, 'Uses "quoted" text');
  assert.equal(rows[2].note, 'Line one\nLine two');
  assert.throws(() => parseCsv('a,b\n1'), /different number of fields/);
  assert.throws(() => parseCsv('a,b\n"unfinished,field'), /Unclosed quoted field/);
});

test('CSV parser rejects malformed quoting and enforces file, row and column limits', () => {
  const { parseCsv, parseDocument, MAX_BYTES, MAX_ROWS, MAX_COLUMNS } = require('../packages/csv-viewer/csv-viewer.js');
  assert.throws(() => parseCsv('a,b\n"quoted"tail,2'), /Unexpected/);
  assert.throws(() => parseCsv('a,b\nunquoted"quote,2'), /Unexpected/);
  assert.throws(() => parseCsv('x'.repeat(MAX_BYTES + 1)), /2 MB/);
  assert.throws(() => parseCsv('name\n' + 'value\n'.repeat(MAX_ROWS + 1)), /5000/);
  assert.throws(() => parseCsv(Array.from({ length: MAX_COLUMNS + 1 }, (_, i) => 'c' + i).join(',')), /100 column/);
  assert.deepEqual(parseDocument('\uFEFFname,value\r\n'), { headers: ['name', 'value'], rows: [] });
  assert.deepEqual(parseCsv('name,value\r\nAda,"two\r\nlines"'), [{ name: 'Ada', value: 'two\r\nlines' }]);
});

test('Task Board resolves latest revisions and preserves pre-taskId records', () => {
  const { latestTasks } = require('../packages/task-board/task-board.js');
  const initial = { id: 'row-1', taskId: 'task-1', revision: 0, title: 'Task', status: 'todo', createdAt: '2026-11-09T10:00:00Z' };
  const changed = { ...initial, id: 'row-2', revision: 1, status: 'done' };
  const legacy = { id: 'old-row', title: 'Legacy task', status: 'doing', createdAt: '2026-11-08T10:00:00Z' };
  assert.deepEqual(latestTasks([changed, initial, legacy]), [{ ...changed }, { ...legacy, taskId: 'old-row' }]);
  assert.equal(latestTasks([initial, changed]).length, 1);
  const manifest = JSON.parse(fs.readFileSync(path.join(apps, 'task-board/orkas-app.json'), 'utf8'));
  assert.ok(manifest.data.tables[0].access.insert.includes('taskId'));
  assert.ok(manifest.data.tables[0].access.read.includes('revision'));
});

test('Notes retries failed loading and an uncertain save with the original request ID', async () => {
  const vm = require('node:vm');
  const element = () => ({ textContent: '', value: '', readOnly: false, disabled: false, hidden: false,
    listeners: {}, children: [], addEventListener(type, listener) { this.listeners[type] = listener; },
    append(...children) { this.children.push(...children); }, replaceChildren() { this.children = []; } });
  const fields = { title: element(), body: element() };
  const button = element();
  const form = Object.assign(element(), { elements: fields, querySelector: () => button,
    reset() { fields.title.value = ''; fields.body.value = ''; } });
  const selectors = new Map([['form', form]]);
  for (const selector of ['[role="status"]', '[data-reload]', '[data-notes]', '[data-title]', '[data-intro]',
    '[data-title-label]', '[data-body-label]', '[data-save]', '[data-list-heading]']) selectors.set(selector, element());
  let failLoading = true, failSaving = true;
  const requests = [];
  const records = [];
  const data = {
    async query() { if (failLoading) throw new Error('temporarily unavailable'); return { records }; },
    async insert(request) {
      requests.push(JSON.parse(JSON.stringify(request)));
      if (failSaving) throw new Error('uncertain result');
      records.push({ ...request.values, createdAt: new Date().toISOString() });
    },
  };
  const document = { documentElement: {}, querySelector: selector => selectors.get(selector), createElement: element };
  vm.runInNewContext(fs.readFileSync(path.join(apps, 'notes/notes.js'), 'utf8'), {
    document, window: { orkasApp: { host: { getContext: () => ({ language: 'en' }) }, data } },
    crypto: require('node:crypto').webcrypto,
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(selectors.get('[data-reload]').hidden, false);
  failLoading = false;
  await selectors.get('[data-reload]').listeners.click();
  assert.equal(selectors.get('[data-reload]').hidden, true);
  fields.title.value = 'Retry note'; fields.body.value = 'Keep this content';
  await form.listeners.submit({ preventDefault() {} });
  assert.equal(fields.title.value, 'Retry note');
  assert.equal(fields.body.readOnly, true);
  assert.match(selectors.get('[role="status"]').textContent, /not confirmed/);
  failSaving = false;
  await form.listeners.submit({ preventDefault() {} });
  assert.deepEqual(requests[0], requests[1]);
  assert.equal(records.length, 1);
  assert.equal(fields.body.readOnly, false);
  assert.equal(selectors.get('[data-notes]').children.length, 1);
});
