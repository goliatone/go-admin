import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

const { FeatureFlagsManager } = await import('../dist/feature-flags/index.js');

test('feature flags manager sends csrf token on flag updates', async () => {
  const originalFetch = globalThis.fetch;
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const requests = [];

  globalThis.document = {
    querySelector(selector) {
      if (selector !== 'meta[name="csrf-token"]') {
        return null;
      }
      return {
        getAttribute(name) {
          if (name !== 'content') {
            return null;
          }
          return 'feature-flags-csrf-token';
        },
      };
    },
  };
  globalThis.window = { toastManager: null };
  globalThis.fetch = mock.fn(async (url, init = {}) => {
    requests.push({ url: String(url), init });
    return {
      ok: true,
      status: 200,
      async json() {
        return {};
      },
      async text() {
        return '';
      },
    };
  });

  try {
    const manager = new FeatureFlagsManager({
      apiPath: '/admin/api/feature-flags',
      basePath: '/admin',
    });

    manager.scopeSelect = { value: 'system' };
    manager.scopeIdInput = { value: '' };
    manager.loadFlags = async () => {};

    await manager.updateFlag('debug', 'enabled');
  } finally {
    if (originalFetch === undefined) {
      delete globalThis.fetch;
    } else {
      globalThis.fetch = originalFetch;
    }
    if (originalDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = originalDocument;
    }
    if (originalWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }
  }

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/admin/api/feature-flags');
  assert.equal(requests[0].init.method, 'POST');
  const headers = requests[0].init.headers instanceof Headers
    ? requests[0].init.headers
    : new Headers(requests[0].init.headers || {});
  assert.equal(headers.get('Content-Type'), 'application/json');
  assert.equal(headers.get('X-CSRF-Token'), 'feature-flags-csrf-token');
  assert.equal(requests[0].init.body, JSON.stringify({
    key: 'debug',
    scope: 'system',
    enabled: true,
  }));
});
