import test from 'node:test';
import assert from 'node:assert/strict';

const {
  fetchTranslationShellData,
  renderTranslationSurfaceShell,
} = await import('../dist/translation-operations/index.js');

function createRoot(dataset = {}) {
  return {
    dataset,
    innerHTML: '',
  };
}

test('fetchTranslationShellData returns empty state when endpoint is not wired', async () => {
  const result = await fetchTranslationShellData('');
  assert.equal(result.status, 'empty');
  assert.match(result.message, /backing api contract has not been connected yet/i);
});

test('fetchTranslationShellData captures request and trace ids for empty payloads', async () => {
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    headers: {
      get(name) {
        const key = String(name).toLowerCase();
        if (key === 'x-request-id') return 'req-42';
        if (key === 'x-trace-id') return 'trace-42';
        return null;
      },
    },
    async json() {
      return { items: [] };
    },
  });

  const result = await fetchTranslationShellData('/admin/api/translations/queue');
  assert.equal(result.status, 'empty');
  assert.equal(result.requestId, 'req-42');
  assert.equal(result.traceId, 'trace-42');
});

test('fetchTranslationShellData maps 409 responses to conflict state', async () => {
  globalThis.fetch = async () => ({
    ok: false,
    status: 409,
    headers: {
      get(name) {
        const key = String(name).toLowerCase();
        if (key === 'content-type') return 'application/json';
        if (key === 'x-request-id') return 'req-99';
        if (key === 'x-correlation-id') return 'corr-99';
        return null;
      },
    },
    clone() {
      return this;
    },
    async text() {
      return JSON.stringify({
        error: {
          text_code: 'VERSION_CONFLICT',
          message: 'record version mismatch',
        },
      });
    },
  });

  const result = await fetchTranslationShellData('/admin/api/translations/families/family-1');
  assert.equal(result.status, 'conflict');
  assert.equal(result.requestId, 'req-99');
  assert.equal(result.traceId, 'corr-99');
});

test('renderTranslationSurfaceShell includes trace chips for diagnostics', () => {
  const root = createRoot({ title: 'Translation Queue' });
  renderTranslationSurfaceShell(root, {
    status: 'empty',
    message: 'No queue items yet.',
    requestId: 'req-7',
    traceId: 'trace-7',
  });

  assert.match(root.innerHTML, /Request req-7/);
  assert.match(root.innerHTML, /Trace trace-7/);
  assert.match(root.innerHTML, /No queue items yet/);
});
