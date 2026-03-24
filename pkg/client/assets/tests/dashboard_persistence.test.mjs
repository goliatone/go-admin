import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

const { DefaultPersistenceBehavior } = await import('../dist/dashboard/index.js');

test('dashboard persistence sends csrf token when present in admin shell meta tags', async () => {
  const originalFetch = globalThis.fetch;
  const originalDocument = globalThis.document;
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
          return 'dashboard-csrf-token';
        },
      };
    },
  };
  globalThis.fetch = mock.fn(async (url, init = {}) => {
    requests.push({ url: String(url), init });
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      async json() {
        return {};
      },
    };
  });

  try {
    const behavior = new DefaultPersistenceBehavior();
    await behavior.save('/admin/api/dashboard/preferences', {
      area_order: { 'admin.dashboard.main': ['widget-1'] },
      layout_rows: {},
      hidden_widget_ids: [],
    });
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
  }

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/admin/api/dashboard/preferences');
  assert.equal(requests[0].init.headers['Content-Type'], 'application/json');
  assert.equal(requests[0].init.headers['X-CSRF-Token'], 'dashboard-csrf-token');
});
