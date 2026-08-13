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
} = await import('../dist/components/import-modal.js');
const { configureLogging } = await import('../dist/shared/logger.js');

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
  assert.equal(root.querySelector('.go-admin-import__flags'), null, 'partial/replay/continuation state belongs to the modal banner, above the detail it describes');
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

test('source switching is single-flight, cancellation-safe, keyboard-safe, and teardown-safe', async () => {
  setup();
  const decisions = [];
  const mounts = new Map();
  const source = (key, label) => customSource({
    key,
    label,
    mountInput(root, api) {
      mounts.set(key, (mounts.get(key) || 0) + 1);
      root.textContent = `${label} ready`;
      api.setReady(true);
    },
  });
  const modal = new BulkImportModal({
    root: document.getElementById('host'),
    sources: [source('first', 'First'), source('second', 'Second'), source('third', 'Third')],
    confirmDiscard: (context) => new Promise((resolve) => decisions.push({ context, resolve })),
  });
  await modal.show();

  document.querySelector('[data-import-source-tab="1"]').click();
  document.querySelector('[data-import-source-tab="1"]').click();
  document.querySelector('[data-import-source-tab="2"]').click();
  await tick();
  assert.equal(decisions.length, 1, 'rapid same and different destinations share one pending decision');
  assert.equal(decisions[0].context.nextSourceKey, 'second', 'the first accepted request is authoritative');
  decisions[0].resolve(false);
  await tick();
  assert.equal(document.querySelector('[data-import-source-tab="0"]').getAttribute('aria-selected'), 'true', 'cancellation preserves the source');

  document.querySelector('[data-import-source-tab="2"]').click();
  await tick();
  assert.equal(decisions.length, 2, 'a new request is allowed after cancellation settles');
  decisions[1].resolve(true);
  await tick();
  const thirdTab = document.querySelector('[data-import-source-tab="2"]');
  assert.equal(thirdTab.getAttribute('aria-selected'), 'true');

  thirdTab.focus();
  thirdTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
  thirdTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
  await tick();
  assert.equal(decisions.length, 3, 'repeated keyboard activation stays single-flight');
  decisions[2].resolve(false);
  await tick();
  assert.equal(document.activeElement, thirdTab, 'cancelled keyboard activation does not move focus to a rejected destination');
  assert.equal(thirdTab.getAttribute('aria-selected'), 'true');

  document.querySelector('[data-import-source-tab="1"]').click();
  await tick();
  assert.equal(decisions.length, 4);
  modal.destroy();
  decisions[3].resolve(true);
  await tick();
  assert.equal(mounts.get('second') || 0, 0, 'a decision resolved after teardown cannot mount its destination');
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
  const first = new BulkImportModal({
    root: document.getElementById('one'),
    sources: [source],
    copy: { maximize: 'Expand localized', restore: 'Restore localized' },
  });
  const second = new BulkImportModal({ root: document.getElementById('two'), sources: [{ ...source, key: 'other' }] });
  await first.show();
  const primary = document.querySelector('[data-import-primary]');
  primary.click();
  primary.click();
  assert.equal(submits, 1);
  resolveSubmit({ ok: true });
  await tick();

  const maximize = document.querySelector('[data-import-maximize]');
  const maximizeIcon = maximize.querySelector('[data-import-maximize-icon]');
  assert.equal(maximize.textContent.trim(), '');
  assert.equal(maximize.getAttribute('aria-label'), 'Expand localized');
  assert.equal(maximize.getAttribute('aria-expanded'), 'false');
  assert.equal(maximizeIcon.dataset.importMaximizeIcon, 'expand');
  maximize.click();
  assert.equal(first.isMaximized, true);
  assert.equal(maximize.getAttribute('aria-label'), 'Restore localized');
  assert.equal(maximize.getAttribute('aria-expanded'), 'true');
  assert.equal(maximizeIcon.dataset.importMaximizeIcon, 'collapse');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(first.isMaximized, false);
  assert.equal(first.isOpen, true);
  assert.equal(maximize.getAttribute('aria-label'), 'Expand localized');
  assert.equal(maximize.getAttribute('aria-expanded'), 'false');
  assert.equal(maximizeIcon.dataset.importMaximizeIcon, 'expand');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(first.isOpen, false);

  await second.show();
  assert.equal(second.isOpen, true);
  second.destroy();
});

test('Users owns its response adapter while the public component remains application-neutral', () => {
  const componentSource = readFileSync(resolve(import.meta.dirname, '../src/components/import-modal.ts'), 'utf8');
  const usersAdapterSource = readFileSync(resolve(import.meta.dirname, '../src/users/import-adapter.ts'), 'utf8');
  const usersTemplate = readFileSync(resolve(import.meta.dirname, '../../templates/resources/users/list.html'), 'utf8');
  assert.doesNotMatch(componentSource, /legacyUsersReport|LegacyImportModalOptions|users-owned|user_id|class ImportModal/);
  assert.match(usersTemplate, /import \{ BulkImportModal \}/);
  assert.match(usersTemplate, /import \{ adaptUsersImportResult \} from .*users\/import-adapter\.js/);
  assert.match(usersAdapterSource, /metadata:\s*\{\s*email:.*user_id:/s);
  assert.match(usersAdapterSource, /status === 422/);
  assert.match(usersTemplate, /adaptSubmit: adaptUsersImportResult/);
  assert.match(usersTemplate, /new BulkImportModal\(/);
  assert.match(usersTemplate, /httpRequest\(`\$\{apiRoot\}\/users-import`/);
  assert.doesNotMatch(usersTemplate, /legacyUsersReport|id="import-users-modal"|new ImportModal\(/);
});

// --- T22 review-first presentation contract -------------------------------
// These lock the confirmed presentation defects recorded in the 2026-08-13 UI
// review. Quantitative layout gates live in scripts/test-import-browsers.mjs
// because JSDOM has no layout engine.

const componentCSS = () => readFileSync(resolve(import.meta.dirname, '../src/styles/components.css'), 'utf8');

function rowSource(overrides = {}) {
  return {
    key: 'rows',
    label: 'Row source',
    kind: 'custom',
    workflow: 'preview-apply',
    mode: { key: 'app-mode', label: 'Application policy' },
    mountInput(root, api) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'ready';
      root.appendChild(button);
      api.setReady(true);
    },
    readInput: () => ({ ready: true }),
    preview: async () => ({ ok: true }),
    adaptPreview: () => ({ state: 'opaque', eligibility: { allowed: true }, report: previewReport('app-mode', [{ reference: '1', outcome: 'kept' }]) }),
    ...overrides,
  };
}

async function openWith(options) {
  const modal = new BulkImportModal({ root: document.getElementById('host'), ...options });
  await modal.show();
  return modal;
}

test('T22 file chooser exposes mutually exclusive empty and selected structures', () => {
  setup('<div id="zone"></div>');
  const root = document.getElementById('zone');
  const dropzone = new FileDropzone({ root });

  assert.equal(root.dataset.importState, 'empty', 'chooser must expose a stable empty/selected state attribute');
  dropzone.setFile(file('contacts.csv'));
  assert.equal(root.dataset.importState, 'selected');
  assert.equal(root.querySelector('[data-import-empty]').hidden, true);
  assert.equal(root.querySelector('[data-import-selected]').hidden, false);

  const css = componentCSS();
  assert.doesNotMatch(
    css,
    /\.go-admin-import__dropzone\s*>\s*div\s*\{[^}]*display:\s*(flex|grid|block)/,
    'a blanket child display rule defeats native [hidden] and renders both chooser states at once',
  );
  assert.match(css, /\[hidden\]\s*\{[^}]*display:\s*none/, 'shared CSS must keep native [hidden] authoritative for import content');
  dropzone.destroy();
});

test('T22 shared stylesheet styles import controls, tones, and high-contrast output', () => {
  const css = componentCSS();
  assert.match(css, /\.go-admin-import__action\[data-import-priority="primary"\]/, 'primary import action must have shared component styling');
  assert.match(css, /\.go-admin-import__action\[data-import-priority="ghost"\]/, 'secondary and ghost actions share one control system');
  assert.match(css, /\.go-admin-import__filters button\[aria-pressed="true"\]/, 'filter pills must express active state through aria-pressed');
  assert.match(css, /\.go-admin-import__outcome/, 'row outcomes need a shared badge treatment, not raw token text');
  assert.match(css, /@media \(forced-colors: active\)/, 'import surfaces must survive forced-colors mode');
  assert.doesNotMatch(css, /would_create|skipped_duplicate|user_id/, 'shared CSS must not name application outcome vocabulary');
});

test('T22 report presentation is source-scoped and does not leak between sources', async () => {
  setup();
  const modal = await openWith({
    columns: [{ key: 'reference', label: 'Fallback row' }],
    filters: [{ key: 'fallback', label: 'Fallback filter', outcome: 'kept' }],
    sources: [
      rowSource({
        report: {
          columns: [{ key: 'reference', label: 'Scoped row' }, { key: 'outcome', label: 'Scoped outcome' }],
          filters: [{ key: 'scoped', label: 'Scoped filter', outcome: 'kept' }],
          outcomeLabels: { kept: 'Kept by policy' },
          outcomeTones: { kept: 'success' },
        },
        adaptPreview: () => ({
          state: 'opaque',
          report: { ...previewReport('app-mode', [{ reference: '1', outcome: 'kept' }]) },
          eligibility: { allowed: true },
        }),
      }),
      rowSource({ key: 'other', label: 'Other source' }),
    ],
  });

  document.querySelector('[data-import-primary]').click();
  await tick();
  const container = modal.container;
  assert.match(container.querySelector('thead').textContent, /Scoped row.*Scoped outcome/s, 'source columns must win over modal fallbacks');
  assert.doesNotMatch(container.querySelector('thead').textContent, /Fallback row/);
  assert.match(container.querySelector('[role="toolbar"]').textContent, /Scoped filter/);
  assert.doesNotMatch(container.querySelector('[role="toolbar"]').textContent, /Fallback filter/);
  assert.match(container.querySelector('tbody tr').textContent, /Kept by policy/, 'outcome cells must render source-declared labels, not raw keys');
  assert.equal(container.querySelector('tbody tr [data-tone]')?.dataset.tone, 'success');
  modal.destroy();
});

test('T22 aggregate detail mode is declared, never inferred from empty rows', async () => {
  setup();
  const aggregate = await openWith({
    sources: [rowSource({
      report: { runFields: [{ key: 'status', label: 'Run status' }], emptyState: 'Totals only by design.' },
      adaptPreview: () => ({
        state: 'opaque',
        eligibility: { allowed: true },
        report: {
          phase: 'preview', mode: 'app-mode', detailMode: 'aggregate',
          metrics: [{ key: 'read', label: 'Read', value: 100 }],
          rows: [],
          bounds: { returnedRows: 0, totalRows: 100, truncated: false },
          run: { status: 'partial', internal_cursor: 'must-not-render' },
        },
      }),
    })],
  });
  document.querySelector('[data-import-primary]').click();
  await tick();
  let container = aggregate.container;
  assert.equal(container.querySelector('.go-admin-import__report-table'), null, 'aggregate mode must not render a row table');
  assert.equal(container.querySelector('.go-admin-import__filters'), null, 'aggregate mode must not render row filters');
  assert.match(container.textContent, /Totals only by design/);
  assert.doesNotMatch(container.textContent, /truncated/i, 'absent-by-design detail must not be reported as truncation');
  assert.match(container.textContent, /Run status/);
  assert.doesNotMatch(container.textContent, /internal_cursor|must-not-render/, 'only declared run fields may reach the DOM');
  aggregate.destroy();

  setup();
  const rowMode = await openWith({
    sources: [rowSource({
      adaptPreview: () => ({
        state: 'opaque',
        eligibility: { allowed: true },
        report: {
          phase: 'preview', mode: 'app-mode',
          metrics: [], rows: [],
          bounds: { returnedRows: 0, totalRows: 40, truncated: true },
        },
      }),
    })],
  });
  document.querySelector('[data-import-primary]').click();
  await tick();
  container = rowMode.container;
  assert.ok(container.querySelector('.go-admin-import__report-table'), 'zero rows with a positive total stays row mode with a truthful empty table');
  rowMode.destroy();
});

test('T23 aggregate reports that ship row detail are diagnosed, not silently relabelled', async () => {
  setup();
  const warnings = [];
  const restoreLogging = configureLogging({ level: 'warn', sink: { warn: (...args) => warnings.push(args.map(String).join(' ')) } });
  try {
    const modal = await openWith({
      sources: [rowSource({
        adaptPreview: () => ({
          state: 'opaque',
          eligibility: { allowed: true },
          report: {
            phase: 'preview', mode: 'app-mode', detailMode: 'aggregate',
            metrics: [{ key: 'read', label: 'Read', value: 3 }],
            rows: [{ reference: '1', outcome: 'kept' }],
            bounds: { returnedRows: 1, totalRows: 3, truncated: false },
          },
        }),
      })],
    });
    document.querySelector('[data-import-primary]').click();
    await tick();
    assert.equal(modal.container.querySelector('.go-admin-import__report-table'), null, 'the declared aggregate mode still wins');
    assert.ok(warnings.some((entry) => /aggregate report declared with row detail/.test(entry)), 'the inconsistent payload is diagnosed');
    modal.destroy();
  } finally {
    restoreLogging();
  }
});

test('T22 result banner precedes report controls and renders before any report exists', async () => {
  setup();
  const modal = await openWith({
    sources: [rowSource({
      preview: async () => { throw new ImportTransportError('Preview rejected.', 'terminal'); },
      adaptPreview: () => { throw new Error('unreachable'); },
    })],
  });
  document.querySelector('[data-import-primary]').click();
  await tick();
  const banner = modal.container.querySelector('[data-import-banner]');
  assert.ok(banner, 'a banner must exist for errors raised before a report');
  assert.equal(banner.getAttribute('role'), 'alert');
  assert.match(banner.textContent, /Preview rejected/);
  assert.equal(banner.dataset.tone, 'danger');
  modal.destroy();

  setup();
  const settled = await openWith({
    sources: [rowSource({
      adaptPreview: () => ({ state: 'opaque', eligibility: { allowed: true }, report: previewReport('app-mode', [{ reference: '1', outcome: 'kept' }]) }),
      apply: async () => ({ ok: true }),
      adaptApply: () => ({ ...previewReport('app-mode', [{ reference: '1', outcome: 'kept' }]), phase: 'apply', partial: true, replayed: true }),
    })],
  });
  document.querySelector('[data-import-primary]').click();
  await tick();
  document.querySelector('[data-import-primary]').click();
  await tick();
  document.querySelector('[data-modal-confirm]').click();
  await tick(); await tick();
  const report = settled.container.querySelector('[data-import-report]');
  const resultBanner = settled.container.querySelector('[data-import-banner]');
  assert.ok(resultBanner, 'partial/replayed state must surface in the banner');
  assert.match(resultBanner.textContent, /Partial result.*Idempotent replay/);
  assert.equal(
    resultBanner.compareDocumentPosition(report) & 4 /* DOCUMENT_POSITION_FOLLOWING */,
    4,
    'banner must precede report metrics and controls',
  );
  assert.equal(settled.container.querySelector('.go-admin-import__flags'), null, 'flags must not remain below the table where they are unreachable');
  settled.destroy();
});

test('T22 phase attribute tracks compose and review ownership', async () => {
  setup();
  const modal = await openWith({
    sources: [rowSource({
      adaptPreview: () => ({ state: 'opaque', eligibility: { allowed: true }, report: previewReport('app-mode', [{ reference: '1', outcome: 'kept' }]) }),
    })],
  });
  assert.equal(modal.container.dataset.importPhase, 'compose');
  assert.equal(modal.container.dataset.importSource, 'rows');
  document.querySelector('[data-import-primary]').click();
  await tick();
  assert.equal(modal.container.dataset.importPhase, 'review');
  assert.ok(modal.container.querySelector('[data-import-summary]'), 'review must expose a compact source summary with a Change action');
  modal.container.querySelector('[data-import-summary] [data-import-change]').click();
  await tick();
  assert.equal(modal.container.dataset.importPhase, 'compose', 'Change returns to compose through preview invalidation');
  modal.destroy();
});

test('T22 settled results hide the primary action instead of disabling Preview', async () => {
  setup();
  const modal = await openWith({
    sources: [rowSource({
      adaptPreview: () => ({ state: 'opaque', eligibility: { allowed: true }, report: previewReport('app-mode', [{ reference: '1', outcome: 'kept' }]) }),
      apply: async () => ({ ok: true }),
      adaptApply: () => ({ ...previewReport('app-mode', [{ reference: '1', outcome: 'kept' }]), phase: 'apply' }),
    })],
  });
  document.querySelector('[data-import-primary]').click();
  await tick();
  document.querySelector('[data-import-primary]').click();
  await tick();
  document.querySelector('[data-modal-confirm]').click();
  await tick(); await tick();
  const primary = modal.container.querySelector('[data-import-primary]');
  const reset = modal.container.querySelector('[data-import-reset]');
  assert.equal(primary.hidden, true, 'a settled import must hide the primary, not leave a disabled Preview');
  assert.equal(reset.hidden, false);
  assert.equal(reset.dataset.importPriority, 'primary', 'Import another is promoted after completion');
  assert.match(modal.container.querySelector('[data-import-dismiss]').textContent, /close/i, 'settled dismissal reads Close, not Cancel');
  modal.destroy();
});

test('T22 report columns declare priority and identity instead of positional semantics', async () => {
  setup();
  const modal = await openWith({
    sources: [rowSource({
      report: {
        columns: [
          { key: 'reference', label: 'Row', priority: 'primary' },
          { key: 'codes', label: 'Codes', priority: 'secondary' },
        ],
      },
      adaptPreview: () => ({ state: 'opaque', eligibility: { allowed: true }, report: previewReport('app-mode', [{ reference: '1', outcome: 'kept', codes: ['a'] }]) }),
    })],
  });
  document.querySelector('[data-import-primary]').click();
  await tick();
  const heads = [...modal.container.querySelectorAll('thead th')];
  assert.deepEqual(heads.map((cell) => cell.dataset.column), ['reference', 'codes']);
  assert.deepEqual(heads.map((cell) => cell.dataset.priority), ['primary', 'secondary']);
  assert.deepEqual([...modal.container.querySelectorAll('tbody td')].map((cell) => cell.dataset.column), ['reference', 'codes']);
  assert.doesNotMatch(componentCSS(), /report-table (th|td):nth-child/, 'narrow column behavior must key on data-priority, not column index');
  modal.destroy();
});

test('T22 informational metrics are not disabled buttons and filters expose aria-pressed', async () => {
  setup();
  const modal = await openWith({
    sources: [rowSource({
      adaptPreview: () => ({
        state: 'opaque',
        eligibility: { allowed: true },
        report: {
          ...previewReport('app-mode', [{ reference: '1', outcome: 'kept' }]),
          metrics: [
            { key: 'processed', label: 'Processed', value: 1 },
            { key: 'kept', label: 'Kept', value: 1, tone: 'success', filter: { key: 'kept', label: 'Kept', outcome: 'kept' } },
          ],
        },
      }),
    })],
  });
  document.querySelector('[data-import-primary]').click();
  await tick();
  const metrics = [...modal.container.querySelectorAll('.go-admin-import__metric')];
  assert.equal(metrics[0].tagName, 'DIV', 'informational metrics must not render as disabled controls');
  assert.equal(metrics[1].tagName, 'BUTTON');
  assert.equal(metrics[1].getAttribute('aria-pressed'), 'false');
  metrics[1].click();
  assert.equal(modal.container.querySelector('.go-admin-import__metric[aria-pressed="true"]')?.textContent.includes('Kept'), true);
  assert.ok([...modal.container.querySelectorAll('.go-admin-import__filters button')].every((button) => button.hasAttribute('aria-pressed')));
  modal.destroy();
});

test('T22 a single available source hides the tablist and keeps the panel named', async () => {
  setup();
  const modal = await openWith({
    sources: [rowSource(), rowSource({ key: 'unavailable', label: 'Unavailable', available: false })],
  });
  const tablist = modal.container.querySelector('.go-admin-import__sources');
  assert.equal(tablist.hidden, true, 'one source must not leave a vestigial tab stop');
  const panel = modal.container.querySelector('[data-import-source-panel]');
  assert.equal(panel.getAttribute('aria-label'), 'Row source', 'the panel keeps an accessible name that does not depend on a hidden tab');
  assert.equal(panel.hasAttribute('aria-labelledby'), false);
  assert.deepEqual([...tablist.querySelectorAll('[data-import-source-tab]')].map((tab) => tab.tabIndex), [0, -1]);
  modal.destroy();
});

test('T32 source tabs establish and preserve one available roving tab stop', async () => {
  setup();
  const modal = await openWith({
    confirmDiscard: async () => true,
    sources: [
      rowSource({ key: 'first', label: 'First' }),
      rowSource({ key: 'unavailable', label: 'Unavailable', available: false }),
      rowSource({ key: 'third', label: 'Third' }),
    ],
  });
  const tabs = [...modal.container.querySelectorAll('[data-import-source-tab]')];
  assert.equal(modal.container.querySelector('.go-admin-import__sources').hidden, false);
  assert.deepEqual(tabs.map((tab) => tab.tabIndex), [0, -1, -1], 'only the selected available tab starts in the tab sequence');
  assert.equal(tabs[1].disabled, true);

  tabs[0].focus();
  tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  await tick(); await tick();
  assert.deepEqual(tabs.map((tab) => tab.tabIndex), [-1, -1, 0], 'ArrowRight skips unavailable sources');
  assert.equal(document.activeElement, tabs[2]);

  tabs[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
  await tick(); await tick();
  assert.deepEqual(tabs.map((tab) => tab.tabIndex), [0, -1, -1]);
  assert.equal(document.activeElement, tabs[0]);

  tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
  await tick(); await tick();
  assert.deepEqual(tabs.map((tab) => tab.tabIndex), [-1, -1, 0]);
  assert.equal(document.activeElement, tabs[2]);
  modal.destroy();
});

test('T32 initial selection and focus skip an unavailable first descriptor', async () => {
  setup();
  const modal = await openWith({
    sources: [
      rowSource({ key: 'unavailable', label: 'Unavailable', available: false }),
      rowSource({ key: 'second', label: 'Second' }),
      rowSource({ key: 'third', label: 'Third' }),
    ],
  });
  const tabs = [...modal.container.querySelectorAll('[data-import-source-tab]')];
  assert.deepEqual(tabs.map((tab) => tab.tabIndex), [-1, 0, -1]);
  assert.equal(tabs[1].getAttribute('aria-selected'), 'true');
  assert.equal(document.activeElement, tabs[1]);
  modal.destroy();
});

test('T22 every dismissal path shares one guard, veto and preserved-attempt policy', async () => {
  setup();
  const prompts = [];
  const modal = await openWith({
    confirmDiscard: async (context) => { prompts.push(context.reason); return false; },
    sources: [rowSource({
      adaptPreview: () => ({ state: 'opaque', eligibility: { allowed: true }, report: previewReport('app-mode', [{ reference: '1', outcome: 'kept' }]) }),
    })],
  });
  document.querySelector('[data-import-primary]').click();
  await tick();

  modal.container.querySelector('[data-import-close]').click();
  await tick();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await tick();
  assert.deepEqual(prompts, ['close', 'close'], 'header close and Escape share the same discard policy');
  assert.equal(modal.isOpen, true, 'a declined discard keeps the modal and its work');

  prompts.length = 0;
  modal.container.querySelector('[data-import-close]').click();
  modal.container.querySelector('[data-import-close]').click();
  await tick();
  assert.equal(prompts.length, 1, 'repeated close requests while a confirmation is pending create one prompt');
  modal.destroy();
});

test('T22 busy work vetoes dismissal with localized feedback and never claims cancellation', async () => {
  setup();
  let release;
  const modal = await openWith({
    copy: { busyDismissBlocked: 'An import is in progress.' },
    sources: [rowSource({ preview: () => new Promise((resolve) => { release = resolve; }) })],
  });
  document.querySelector('[data-import-primary]').click();
  await tick();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await tick();
  assert.equal(modal.isOpen, true);
  assert.equal(modal.container.querySelector('[data-import-status]').textContent, 'An import is in progress.');
  assert.doesNotMatch(modal.container.textContent, /cancell?ed|rolled back/i);
  release({});
  await tick();
  modal.destroy();
});

test('T25 footer dismissal and backdrop share the guard, and unknown applies survive close/reopen', async () => {
  setup();
  const prompts = [];
  const modal = await openWith({
    confirmDiscard: async (context) => { prompts.push(context.reason); return false; },
    sources: [rowSource()],
  });
  document.querySelector('[data-import-primary]').click();
  await tick();

  modal.container.querySelector('[data-import-dismiss]').click();
  await tick();
  modal.backdrop.click();
  await tick();
  assert.deepEqual(prompts, ['close', 'close'], 'footer dismissal and backdrop use the same discard policy as close and Escape');
  assert.equal(modal.isOpen, true);
  assert.match(modal.container.querySelector('[data-import-dismiss]').textContent, /cancel/i, 'editable pre-apply work reads Cancel');
  modal.destroy();

  setup();
  const uncertain = await openWith({
    confirmDiscard: async () => { throw new Error('an unresolved attempt must not be offered for discard'); },
    sources: [rowSource({
      apply: async () => { throw new ImportTransportError('No confirmed outcome.', 'unknown'); },
      adaptApply: () => previewReport('app-mode'),
      onReconcileAttempt: async () => false,
    })],
  });
  document.querySelector('[data-import-primary]').click();
  await tick();
  document.querySelector('[data-import-primary]').click();
  await tick();
  document.querySelector('[data-modal-confirm]').click();
  await tick(); await tick();
  assert.equal(uncertain.state, 'recoverable-error');
  const attempt = uncertain.activeAttempt;
  assert.ok(attempt?.idempotencyKey);

  uncertain.container.querySelector('[data-import-close]').click();
  await tick();
  assert.equal(uncertain.isOpen, false, 'an unresolved attempt closes without a discard prompt');
  await uncertain.show();
  assert.deepEqual(uncertain.activeAttempt, attempt, 'reopening reuses the exact attempt identity');
  assert.equal(uncertain.state, 'recoverable-error', 'the truthful uncertain outcome survives close/reopen');
  assert.match(uncertain.container.querySelector('[data-import-dismiss]').textContent, /close/i);
  uncertain.destroy();
});

test('T25 a confirmed dismissal discards editable work and closes in one authorized pass', async () => {
  setup();
  let passes = 0;
  const modal = await openWith({
    confirmDiscard: async () => { passes += 1; return true; },
    sources: [rowSource()],
  });
  document.querySelector('[data-import-primary]').click();
  await tick();
  assert.equal(modal.state, 'preview-ready');

  modal.container.querySelector('[data-import-close]').click();
  await tick();
  assert.equal(passes, 1, 'approval is requested exactly once');
  assert.equal(modal.isOpen, false);

  await modal.show();
  // A custom panel that re-mounts ready lands on `selected`; what must be gone
  // is the preview, its report and any attempt.
  assert.ok(['idle', 'selected'].includes(modal.state), `confirmed discard cleared the preview, got ${modal.state}`);
  assert.equal(modal.container.dataset.importPhase, 'compose');
  assert.equal(modal.container.querySelector('[data-import-report]').hidden, true);
  assert.equal(modal.container.querySelector('[data-import-banner]').hidden, true);
  assert.equal(modal.activeAttempt, null);
  modal.destroy();
});

test('T25 an approval that arrives after teardown does not arm a later dismissal', async () => {
  setup();
  let release;
  const modal = await openWith({
    confirmDiscard: () => new Promise((resolve) => { release = resolve; }),
    sources: [rowSource()],
  });
  document.querySelector('[data-import-primary]').click();
  await tick();
  modal.container.querySelector('[data-import-close]').click();
  await tick();

  modal.destroy();
  release(true);
  await tick();

  const prompts = [];
  const next = await openWith({
    confirmDiscard: async () => { prompts.push('asked'); return false; },
    sources: [rowSource()],
  });
  document.querySelector('[data-import-primary]').click();
  await tick();
  next.container.querySelector('[data-import-close]').click();
  await tick();
  assert.deepEqual(prompts, ['asked'], 'the later dismissal confirms on its own terms');
  assert.equal(next.isOpen, true);
  next.destroy();
});

test('T31 a close approval from an old lifecycle cannot mutate the same reopened instance', async () => {
  setup();
  let release;
  const modal = await openWith({
    confirmDiscard: () => new Promise((resolve) => { release = resolve; }),
    sources: [rowSource()],
  });
  document.querySelector('[data-import-primary]').click();
  await tick();
  assert.equal(modal.state, 'preview-ready');
  modal.container.querySelector('[data-import-close]').click();
  await tick();

  modal.destroy();
  await modal.show();
  const reopenedState = modal.state;
  assert.equal(reopenedState, 'preview-ready');
  assert.equal(modal.isOpen, true);

  release(true);
  await tick(); await tick();
  assert.equal(modal.isOpen, true, 'approval from the destroyed lifecycle cannot close the reopened modal');
  assert.equal(modal.state, reopenedState, 'approval from the destroyed lifecycle cannot clear reopened work');
  assert.equal(modal.container.dataset.importPhase, 'review');
  modal.destroy();
});

test('T31 Change, reset, and source switching share one reconciliation transition', async () => {
  setup();
  let resolveReconciliation;
  let reconciliationCalls = 0;
  const first = rowSource({
    key: 'first',
    label: 'First',
    apply: async () => { throw new ImportTransportError('Unknown result.', 'unknown'); },
    adaptApply: () => ({ ...previewReport('app-mode'), phase: 'apply' }),
    onReconcileAttempt: () => {
      reconciliationCalls += 1;
      return new Promise((resolve) => { resolveReconciliation = resolve; });
    },
  });
  const modal = await openWith({ sources: [first, rowSource({ key: 'second', label: 'Second' })] });
  document.querySelector('[data-import-primary]').click();
  await tick();
  document.querySelector('[data-import-primary]').click();
  await tick();
  document.querySelector('[data-modal-confirm]').click();
  await tick(); await tick();
  assert.equal(modal.state, 'recoverable-error');

  modal.container.querySelector('[data-import-change]').click();
  const resetResult = modal.reset();
  modal.container.querySelector('[data-import-source-tab="1"]')
    .dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await tick();
  assert.equal(reconciliationCalls, 1, 'all competing entry points share the authoritative reconciliation');
  assert.equal(await resetResult, false, 'a competing public reset is rejected while Change owns the transition');

  resolveReconciliation(true);
  await tick(); await tick();
  assert.equal(modal.state, 'selected');
  assert.equal(modal.container.querySelector('[data-import-source-tab="0"]').getAttribute('aria-selected'), 'true');
  assert.equal(modal.container.querySelector('[data-import-primary]').disabled, false, 'controls refresh after reconciliation settles');
  modal.destroy();
});

test('T31 teardown does not duplicate an in-flight attempt reconciliation', async () => {
  setup();
  let resolveReconciliation;
  let reconciliationCalls = 0;
  const modal = await openWith({
    sources: [rowSource({
      apply: async () => { throw new ImportTransportError('Unknown result.', 'unknown'); },
      adaptApply: () => ({ ...previewReport('app-mode'), phase: 'apply' }),
      onReconcileAttempt: () => {
        reconciliationCalls += 1;
        return new Promise((resolve) => { resolveReconciliation = resolve; });
      },
    })],
  });
  document.querySelector('[data-import-primary]').click();
  await tick();
  document.querySelector('[data-import-primary]').click();
  await tick();
  document.querySelector('[data-modal-confirm]').click();
  await tick(); await tick();

  modal.container.querySelector('[data-import-change]').click();
  await tick();
  assert.equal(reconciliationCalls, 1);
  modal.destroy();
  assert.equal(reconciliationCalls, 1, 'destroy joins the pending reconciliation instead of invoking it again');
  resolveReconciliation(true);
  await tick(); await tick();
  assert.equal(reconciliationCalls, 1);
});

test('T31 rejected application decisions are contained and preserve workflow state', async () => {
  setup();
  const modal = await openWith({
    copy: { importFailed: 'Safe transition failure' },
    confirmDiscard: async () => { throw new Error('private decision detail'); },
    sources: [rowSource()],
  });
  document.querySelector('[data-import-primary]').click();
  await tick();
  modal.container.querySelector('[data-import-close]').click();
  await tick(); await tick();
  assert.equal(modal.isOpen, true);
  assert.equal(modal.state, 'preview-ready');
  assert.equal(modal.container.querySelector('[data-import-banner]').textContent, 'Safe transition failure');
  assert.doesNotMatch(modal.container.textContent, /private decision detail/);
  assert.equal(modal.container.querySelector('[data-import-close]').disabled, false);
  modal.destroy();

  setup();
  const uncertain = await openWith({
    copy: { importFailed: 'Safe reconciliation failure' },
    sources: [rowSource({
      apply: async () => { throw new ImportTransportError('Unknown result.', 'unknown'); },
      adaptApply: () => ({ ...previewReport('app-mode'), phase: 'apply' }),
      onReconcileAttempt: async () => { throw new Error('private reconciliation detail'); },
    })],
  });
  document.querySelector('[data-import-primary]').click();
  await tick();
  document.querySelector('[data-import-primary]').click();
  await tick();
  document.querySelector('[data-modal-confirm]').click();
  await tick(); await tick();
  const attempt = uncertain.activeAttempt;
  uncertain.container.querySelector('[data-import-change]').click();
  await tick(); await tick();
  assert.equal(uncertain.state, 'recoverable-error');
  assert.deepEqual(uncertain.activeAttempt, attempt);
  assert.equal(uncertain.container.querySelector('[data-import-banner]').textContent, 'Safe reconciliation failure');
  assert.doesNotMatch(uncertain.container.textContent, /private reconciliation detail/);
  uncertain.destroy();
});
