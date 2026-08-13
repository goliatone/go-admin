import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';

const {
  BulkImportModal,
  COMMON_IMPORT_MODES,
  FileDropzone,
  ImportReportView,
  ImportTransportError,
  legacyUsersReport,
} = await import('../dist/components/import-modal.js');

function setup(markup = '<button id="open">Open</button><div id="host"></div>') {
  const dom = new JSDOM(`<!doctype html><html><body>${markup}</body></html>`, {
    url: 'http://localhost/admin',
    pretendToBeVisual: true,
  });
  const win = dom.window;
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.Node = win.Node;
  globalThis.Element = win.Element;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.HTMLButtonElement = win.HTMLButtonElement;
  globalThis.HTMLInputElement = win.HTMLInputElement;
  globalThis.File = win.File;
  globalThis.FormData = win.FormData;
  globalThis.KeyboardEvent = win.KeyboardEvent;
  globalThis.MouseEvent = win.MouseEvent;
  globalThis.requestAnimationFrame = (callback) => callback(0);
  win.matchMedia = (query) => ({
    matches: query === '(prefers-reduced-motion: reduce)',
    media: query,
    addEventListener() {},
    removeEventListener() {},
  });
  win.confirm = () => true;
  return dom;
}

function file(name = 'contacts.csv', size = 12, type = 'text/csv') {
  return new File(['x'.repeat(size)], name, { type });
}

function tick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function customSource(overrides = {}) {
  return {
    key: 'custom',
    label: 'Custom source',
    kind: 'custom',
    workflow: 'preview-apply',
    mode: { key: 'custom-mode', label: 'Custom policy', description: 'Owned by the application.' },
    mountInput(root, api) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Custom source ready';
      root.appendChild(button);
      api.setReady(true);
    },
    readInput: () => ({ bounded: true }),
    ...overrides,
  };
}

function previewReport(mode = 'custom-mode', rows = []) {
  return {
    phase: 'preview',
    mode,
    metrics: [{ key: 'planned', label: 'Planned', value: rows.length }],
    rows,
    bounds: { returnedRows: rows.length, totalRows: rows.length, truncated: false },
  };
}

test('FileDropzone scopes selection, validates hints, renders names safely, and releases stale files', () => {
  setup('<div id="one"></div><div id="two"></div>');
  const changes = [];
  const errors = [];
  const first = new FileDropzone({
    root: document.getElementById('one'),
    accept: '.csv,text/csv',
    maxBytes: 20,
    onChange: (value) => changes.push(value?.name || ''),
    onInvalid: (message) => errors.push(message),
  });
  const second = new FileDropzone({ root: document.getElementById('two'), accept: '.json' });

  assert.equal(first.setFile(file('<script>alert(1)</script>.csv')), true);
  assert.equal(document.querySelector('#one [data-import-file-name]').textContent, '<script>alert(1)</script>.csv');
  assert.equal(document.querySelector('#two [data-import-file-name]').textContent, '');
  assert.equal(first.setFile(file('large.csv', 21)), false);
  assert.match(errors.at(-1), /size limit/i);
  assert.equal(first.setFile(file('wrong.json', 4, 'application/json')), false);
  assert.match(errors.at(-1), /not supported/i);
  first.reset();
  assert.equal(first.file, null);
  assert.deepEqual(changes, ['<script>alert(1)</script>.csv', '']);
  first.destroy();
  second.destroy();
  assert.equal(first.file, null);
});

test('ImportReportView renders application vocabularies, bounds, unknown categories, and text safely', () => {
  setup('<div id="report"></div>');
  const root = document.getElementById('report');
  const view = new ImportReportView(root, {
    columns: [
      { key: 'reference', label: 'Reference' },
      { key: 'action', label: 'Application action' },
      { key: 'safe', label: 'Safe metadata' },
      { key: 'message', label: 'Message' },
    ],
    filters: [{ key: 'custom', label: 'Custom', action: 'custom_action' }],
  });
  view.render({
    phase: 'preview',
    mode: 'future-policy',
    metrics: [{ key: 'queued', label: 'Queued by app', value: 2, filter: { key: 'queued', label: 'Queued', outcome: 'queued' } }],
    rows: [
      { reference: 'row-1', outcome: 'queued', action: 'custom_action', message: '<img src=x onerror=alert(1)>', metadata: { safe: 'allowlisted' } },
      { reference: 'row-2', outcome: 'unexpected_future_value', action: 'future_action' },
    ],
    bounds: { returnedRows: 99, totalRows: 12, truncated: true, continuation: { available: true, label: 'More safe rows available' } },
    partial: true,
    replayed: true,
  });

  assert.equal(root.querySelectorAll('tbody tr').length, 2);
  assert.ok(root.querySelector('[data-outcome="unexpected_future_value"]'));
  assert.equal(root.querySelector('img'), null);
  assert.match(root.querySelector('[data-outcome="queued"]').textContent, /<img src=x/);
  assert.match(root.querySelector('.go-admin-import__bounds').textContent, /2 returned rows \(12 total\).*truncated/);
  assert.match(root.querySelector('.go-admin-import__flags').textContent, /Partial result.*Idempotent replay.*More safe rows/);
  root.querySelector('[data-active="false"]').click();
  assert.equal(root.querySelectorAll('tbody tr').length, 1);
});

test('ImportReportView localizes shared filters, bounds, truncation, and result flags', () => {
  setup('<div id="report"></div>');
  const root = document.getElementById('report');
  const view = new ImportReportView(root, {
    filters: [{ key: 'kept', label: 'Këpt', outcome: 'kept' }],
    copy: {
      allRows: 'Àll localized',
      reportFiltersLabel: 'Localized filter label',
      reportBounds: '{visible} visible / {returned} returned / {total} total localized',
      reportTruncated: 'Localized truncation',
      partialResult: 'Localized partial',
      replayedResult: 'Localized replay',
    },
  });
  view.render({
    phase: 'apply', mode: 'localized', metrics: [],
    rows: [{ reference: 'row:1', outcome: 'kept' }],
    bounds: { returnedRows: 1, totalRows: 2, truncated: true },
    partial: true, replayed: true,
  });
  assert.equal(root.querySelector('[role="toolbar"]').getAttribute('aria-label'), 'Localized filter label');
  assert.match(root.textContent, /Àll localized/);
  assert.match(root.textContent, /1 visible \/ 1 returned \/ 2 total localized Localized truncation/);
  assert.match(root.textContent, /Localized partial · Localized replay/);
  assert.doesNotMatch(root.textContent, /Showing|Details are truncated|Partial result|Idempotent replay/);
});

test('BulkImportModal supports fixed and selectable application modes without executing mode semantics', async () => {
  setup();
  const seenModes = [];
  const modal = new BulkImportModal({
    root: document.getElementById('host'),
    sources: [customSource({
      modes: [COMMON_IMPORT_MODES.createOnly, COMMON_IMPORT_MODES.upsert],
      selectableModes: true,
      preview: async (_input, context) => { seenModes.push(context.mode.key); return { mode: context.mode.key }; },
      adaptPreview: (response) => ({ state: 'opaque', report: previewReport(response.mode), eligibility: { allowed: false, reason: 'No actionable rows.' } }),
      apply: async () => ({}),
      adaptApply: () => previewReport(),
    })],
  });
  await modal.show();
  const select = document.querySelector('[data-import-mode] select');
  assert.equal(select.value, 'create-only');
  select.value = 'upsert';
  select.dispatchEvent(new window.Event('change', { bubbles: true }));
  document.querySelector('[data-import-primary]').click();
  await tick();
  assert.deepEqual(seenModes, ['upsert']);
  assert.equal(modal.state, 'preview-ready');
  assert.equal(document.querySelector('[data-import-primary]').disabled, true);
  assert.match(document.querySelector('[data-import-status]').textContent, /No actionable rows/);
  modal.destroy();
});

test('preview/apply preserves one attempt through unknown retry and allows explicitly eligible partial previews', async () => {
  setup();
  const attempts = [];
  let calls = 0;
  const modal = new BulkImportModal({
    root: document.getElementById('host'),
    attemptFactory: () => ({ attemptId: 'attempt-stable', idempotencyKey: 'key-stable' }),
    sources: [customSource({
      preview: async () => ({ receipt: 'opaque-not-rendered' }),
      adaptPreview: () => ({
        state: { receipt: 'opaque-not-rendered' },
        report: { ...previewReport('custom-mode'), partial: true },
        eligibility: { allowed: true },
      }),
      apply: async (_input, _preview, context) => {
        attempts.push(context.attempt);
        calls += 1;
        if (calls === 1) throw new ImportTransportError('Connection lost after submit.', 'unknown');
        return { completed: true };
      },
      adaptApply: () => ({ ...previewReport('custom-mode'), phase: 'apply', replayed: true }),
    })],
  });
  await modal.show();

  document.querySelector('[data-import-primary]').click();
  await tick();
  assert.equal(modal.state, 'preview-ready');

  document.querySelector('[data-import-primary]').click();
  await tick();
  document.querySelector('[data-modal-confirm]').click();
  await tick();
  assert.equal(modal.state, 'recoverable-error');
  assert.equal(modal.activeAttempt.idempotencyKey, 'key-stable');

  modal.hide();
  assert.equal(modal.isOpen, false);
  await modal.show();
  assert.equal(modal.activeAttempt.idempotencyKey, 'key-stable');
  document.querySelector('[data-import-primary]').click();
  await tick();
  document.querySelector('[data-modal-confirm]').click();
  await tick();
  assert.equal(modal.state, 'complete');
  assert.equal(attempts.length, 2);
  assert.equal(attempts[0], attempts[1]);
  assert.equal(document.querySelector('[data-import-report]').textContent.includes('opaque-not-rendered'), false);
  modal.destroy();
});

test('completed and terminal applies retire their attempt before any later apply', async () => {
  setup();
  const attempts = [];
  let sequence = 0;
  const source = (key, terminal = false) => customSource({
    key,
    label: key,
    preview: async () => ({ receipt: `${key}-receipt` }),
    adaptPreview: (response) => ({ state: response, report: previewReport(), eligibility: { allowed: true } }),
    apply: async (_input, _preview, context) => {
      attempts.push([key, context.attempt.idempotencyKey]);
      if (terminal) throw new ImportTransportError('Rejected without writes.', 'terminal');
      return {};
    },
    adaptApply: () => ({ ...previewReport(), phase: 'apply' }),
  });
  const modal = new BulkImportModal({
    root: document.getElementById('host'),
    sources: [source('first'), source('second')],
    attemptFactory: () => ({ attemptId: `attempt-${++sequence}`, idempotencyKey: `key-${sequence}` }),
  });
  await modal.show();

  document.querySelector('[data-import-primary]').click();
  await tick();
  document.querySelector('[data-import-primary]').click();
  await tick();
  document.querySelector('[data-modal-confirm]').click();
  await tick();
  assert.equal(modal.state, 'complete');
  assert.equal(document.querySelector('[data-import-primary]').disabled, true);

  document.querySelector('[data-import-source-tab="1"]').click();
  await tick();
  document.querySelector('[data-import-primary]').click();
  await tick();
  document.querySelector('[data-import-primary]').click();
  await tick();
  document.querySelector('[data-modal-confirm]').click();
  await tick();
  assert.deepEqual(attempts, [['first', 'key-1'], ['second', 'key-2']]);
  modal.destroy();

  setup();
  const terminalAttempts = [];
  let terminalSequence = 0;
  let reject = true;
  const terminalModal = new BulkImportModal({
    root: document.getElementById('host'),
    attemptFactory: () => ({ attemptId: `terminal-${++terminalSequence}`, idempotencyKey: `terminal-key-${terminalSequence}` }),
    sources: [customSource({
      preview: async () => ({}),
      adaptPreview: () => ({ state: {}, report: previewReport(), eligibility: { allowed: true } }),
      apply: async (_input, _preview, context) => {
        terminalAttempts.push(context.attempt.idempotencyKey);
        if (reject) throw new ImportTransportError('Rejected without writes.', 'terminal');
        return {};
      },
      adaptApply: () => ({ ...previewReport(), phase: 'apply' }),
    })],
  });
  await terminalModal.show();
  document.querySelector('[data-import-primary]').click(); await tick();
  document.querySelector('[data-import-primary]').click(); await tick();
  document.querySelector('[data-modal-confirm]').click(); await tick();
  assert.equal(terminalModal.state, 'terminal-error');
  assert.equal(document.querySelector('[data-import-primary]').disabled, true);
  reject = false;
  document.querySelector('[data-import-reset]').click(); await tick();
  document.querySelector('[data-import-primary]').click(); await tick();
  document.querySelector('[data-import-primary]').click(); await tick();
  document.querySelector('[data-modal-confirm]').click(); await tick();
  assert.deepEqual(terminalAttempts, ['terminal-key-1', 'terminal-key-2']);
  terminalModal.destroy();
});

test('completion callback failures cannot downgrade or replay a committed import', async () => {
  setup();
  const completionErrors = [];
  let globalCompletionRan = false;
  const modal = new BulkImportModal({
    root: document.getElementById('host'),
    copy: { completionError: 'Localized refresh failure', importFailed: 'Localized import failure' },
    onComplete: async () => { globalCompletionRan = true; },
    onCompletionError: async (error, completion) => completionErrors.push([error.message, completion.sourceKey]),
    sources: [customSource({
      preview: async () => ({}),
      adaptPreview: () => ({ state: {}, report: previewReport(), eligibility: { allowed: true } }),
      apply: async () => ({ committed: true }),
      adaptApply: () => ({ ...previewReport(), phase: 'apply' }),
      onComplete: async () => { throw new Error('grid refresh failed'); },
    })],
  });
  await modal.show();
  document.querySelector('[data-import-primary]').click(); await tick();
  document.querySelector('[data-import-primary]').click(); await tick();
  document.querySelector('[data-modal-confirm]').click(); await tick(); await tick();

  assert.equal(modal.state, 'complete');
  assert.equal(globalCompletionRan, true);
  assert.equal(document.querySelector('[data-import-primary]').disabled, true);
  assert.equal(document.querySelector('[data-import-error]').textContent, 'Localized refresh failure');
  assert.deepEqual(completionErrors, [['grid refresh failed', 'custom']]);
  modal.destroy();
});

test('mode and custom-input changes invalidate preview state before apply', async () => {
  setup();
  let panelAPI;
  let inputVersion = 1;
  const applied = [];
  const modal = new BulkImportModal({
    root: document.getElementById('host'),
    sources: [customSource({
      modes: [COMMON_IMPORT_MODES.createOnly, COMMON_IMPORT_MODES.upsert],
      selectableModes: true,
      mountInput(root, api) {
        panelAPI = api;
        root.textContent = 'Custom input';
        api.setReady(true);
      },
      readInput: () => ({ version: inputVersion }),
      preview: async (input, context) => ({ receipt: `${context.mode.key}-${input.version}` }),
      adaptPreview: (response, mode) => ({ state: response, report: previewReport(mode.key), eligibility: { allowed: true } }),
      apply: async (input, preview, context) => { applied.push({ input, preview, mode: context.mode.key }); return {}; },
      adaptApply: (_response, mode) => ({ ...previewReport(mode.key), phase: 'apply' }),
    })],
  });
  await modal.show();
  document.querySelector('[data-import-primary]').click(); await tick();
  assert.equal(modal.state, 'preview-ready');

  const select = document.querySelector('[data-import-mode] select');
  select.value = 'upsert';
  select.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(modal.state, 'selected');
  assert.equal(document.querySelector('[data-import-primary]').textContent, 'Preview');

  document.querySelector('[data-import-primary]').click(); await tick();
  inputVersion = 2;
  panelAPI.inputChanged(true);
  assert.equal(modal.state, 'selected');
  document.querySelector('[data-import-primary]').click(); await tick();
  document.querySelector('[data-import-primary]').click(); await tick();
  document.querySelector('[data-modal-confirm]').click(); await tick();
  assert.deepEqual(applied, [{ input: { version: 2 }, preview: { receipt: 'upsert-2' }, mode: 'upsert' }]);
  modal.destroy();
});

test('source switching confirms before discarding selected or preview-ready work', async () => {
  setup();
  const source = (key, label) => customSource({
    key, label,
    preview: async () => ({}),
    adaptPreview: () => ({ state: {}, report: previewReport(), eligibility: { allowed: false } }),
  });
  const modal = new BulkImportModal({
    root: document.getElementById('host'),
    sources: [source('first', 'First'), source('second', 'Second')],
    copy: { discardTitle: 'Discard localized?', discardSourceChange: 'Localized source warning', discard: 'Localized discard', cancel: 'Localized cancel' },
  });
  await modal.show();
  document.querySelector('[data-import-source-tab="1"]').click();
  await tick();
  assert.equal(document.querySelector('[data-modal-cancel]').textContent.trim(), 'Localized cancel');
  document.querySelector('[data-modal-cancel]').click();
  await tick();
  assert.equal(document.querySelector('[data-import-source-tab="0"]').getAttribute('aria-selected'), 'true');

  document.querySelector('[data-import-source-tab="1"]').click();
  await tick();
  document.querySelector('[data-modal-confirm]').click();
  await tick();
  assert.equal(document.querySelector('[data-import-source-tab="1"]').getAttribute('aria-selected'), 'true');
  assert.equal(document.querySelector('[role="tabpanel"]').getAttribute('aria-labelledby').endsWith('source-tab-1'), true);

  document.querySelector('[data-import-primary]').click();
  await tick();
  assert.equal(modal.state, 'preview-ready');
  document.querySelector('[data-import-source-tab="0"]').click();
  await tick();
  assert.match(document.body.textContent, /Localized source warning/);
  document.querySelector('[data-modal-confirm]').click();
  await tick();
  assert.equal(document.querySelector('[data-import-source-tab="0"]').getAttribute('aria-selected'), 'true');
  modal.destroy();
});

test('BulkImportModal prevents double submit, uses maximize before Escape close, and isolates instances', async () => {
  setup('<button id="open">Open</button><div id="one"></div><div id="two"></div>');
  let resolveSubmit;
  let submits = 0;
  const source = {
    key: 'single', label: 'Single', kind: 'custom', workflow: 'single',
    mode: { key: 'app-owned', label: 'App owned' },
    mountInput(_root, api) { api.setReady(true); },
    readInput: () => ({ ready: true }),
    submit: () => { submits += 1; return new Promise((resolve) => { resolveSubmit = resolve; }); },
    adaptSubmit: () => previewReport('app-owned'),
  };
  const first = new BulkImportModal({ root: document.getElementById('one'), sources: [source] });
  const second = new BulkImportModal({ root: document.getElementById('two'), sources: [{ ...source, key: 'other' }] });
  await first.show();
  const primary = document.querySelector('[data-import-primary]');
  primary.click();
  primary.click();
  assert.equal(submits, 1);
  resolveSubmit({ ok: true });
  await tick();

  document.querySelector('[data-import-maximize]').click();
  assert.equal(first.isMaximized, true);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(first.isMaximized, false);
  assert.equal(first.isOpen, true);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(first.isOpen, false);

  await second.show();
  assert.equal(second.isOpen, true);
  second.destroy();
});

test('legacy Users adapter keeps Users response vocabulary in the application adapter', () => {
  const report = legacyUsersReport({
    summary: { processed: 2, succeeded: 1, failed: 1 },
    results: [
      { index: 0, email: 'safe@example.test', user_id: 'user-1', status: 'created' },
      { index: 1, error: 'email is required' },
    ],
  });
  assert.deepEqual(report.metrics.map(({ key, value }) => [key, value]), [['processed', 2], ['succeeded', 1], ['failed', 1]]);
  assert.deepEqual(report.rows.map(({ outcome, action }) => [outcome, action]), [['succeeded', 'created'], ['failed', 'rejected']]);
  assert.equal(report.partial, true);
});

test('Users template configures the public component and does not retain a parallel modal runtime', () => {
  const source = readFileSync(resolve(import.meta.dirname, '../../templates/resources/users/list.html'), 'utf8');
  assert.match(source, /import \{ BulkImportModal, legacyUsersReport \}/);
  assert.match(source, /new BulkImportModal\(/);
  assert.match(source, /httpRequest\(`\$\{apiRoot\}\/users-import`/);
  assert.doesNotMatch(source, /id="import-users-modal"|new ImportModal\(/);
});
