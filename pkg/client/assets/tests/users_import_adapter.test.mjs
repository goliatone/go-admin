import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import { BulkImportModal } from '../dist/components/import-modal.js';
import {
  adaptUsersImportResult,
  isReportableUsersImportResult,
} from '../dist/users/import-adapter.js';

const transportResult = (status, payload) => ({
  response: { ok: status >= 200 && status < 300, status },
  payload,
});

const mixedPayload = {
  error: 'validation failed',
  summary: { processed: 2, succeeded: 1, failed: 1 },
  results: [
    { index: 0, status: 'created', email: 'created@example.test', user_id: 'user-1' },
    { index: 1, error: 'invalid role', email: 'rejected@example.test' },
  ],
};

function setup() {
  const dom = new JSDOM('<!doctype html><html><body><div id="host"></div></body></html>', {
    url: 'http://localhost/admin/users',
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
  globalThis.requestAnimationFrame = (callback) => callback(0);
  win.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  return dom;
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test('Users import response classification reports only success or structured row-level 422 results', () => {
  assert.equal(isReportableUsersImportResult(transportResult(200, { summary: {}, results: [] })), true);
  assert.equal(isReportableUsersImportResult(transportResult(200, { error: 'Import failed', summary: {}, results: 'not-json' })), false);
  assert.equal(isReportableUsersImportResult(transportResult(422, mixedPayload)), true);
  assert.equal(isReportableUsersImportResult(transportResult(422, { error: 'validation failed', summary: { processed: 2 }, results: [] })), false);
  assert.equal(isReportableUsersImportResult(transportResult(422, { error: 'validation failed', summary: {}, results: [null] })), false);
  for (const status of [400, 401, 403, 500]) {
    assert.equal(isReportableUsersImportResult(transportResult(status, mixedPayload)), false, `${status} remains a request failure`);
    assert.throws(() => adaptUsersImportResult(transportResult(status, { error: `request ${status}`, results: [] })), new RegExp(`request ${status}`));
  }

  const report = adaptUsersImportResult(transportResult(422, mixedPayload));
  assert.equal(report.partial, true);
  assert.equal(report.rows.length, 2);
  assert.deepEqual(report.metrics.map((metric) => metric.value), [2, 1, 1]);

  const derived = adaptUsersImportResult(transportResult(422, { summary: {}, results: mixedPayload.results }));
  assert.deepEqual(derived.metrics.map((metric) => metric.value), [2, 1, 1], 'row outcomes keep missing summary counts coherent');
  assert.equal(derived.partial, true);
});

test('Users request failures stay retryable while a later structured 422 completes with its report', async () => {
  setup();
  let result = transportResult(403, { error: 'forbidden', summary: {}, results: [] });
  let completions = 0;
  const modal = new BulkImportModal({
    root: document.getElementById('host'),
    sources: [{
      key: 'users-file',
      label: 'Users file',
      kind: 'custom',
      workflow: 'single',
      mode: { key: 'users-create', label: 'Create users' },
      mountInput(_root, api) { api.setReady(true); },
      readInput: () => ({ ready: true }),
      submit: async () => result,
      adaptSubmit: adaptUsersImportResult,
      onComplete: async () => { completions += 1; },
    }],
  });
  await modal.show();
  modal.container.querySelector('[data-import-primary]').click();
  await tick(); await tick();
  assert.equal(modal.state, 'recoverable-error');
  assert.equal(modal.container.dataset.importPhase, 'compose');
  assert.match(modal.container.querySelector('[data-import-banner]').textContent, /forbidden/);
  assert.match(modal.container.querySelector('[data-import-primary]').textContent, /retry/i);
  assert.equal(completions, 0);

  result = transportResult(422, mixedPayload);
  modal.container.querySelector('[data-import-primary]').click();
  await tick(); await tick();
  assert.equal(modal.state, 'complete');
  assert.equal(modal.container.dataset.importPhase, 'review');
  assert.equal(modal.container.querySelectorAll('tbody tr').length, 2);
  assert.match(modal.container.querySelector('[data-import-banner]').textContent, /partial/i);
  assert.equal(completions, 1);
  modal.destroy();
});
