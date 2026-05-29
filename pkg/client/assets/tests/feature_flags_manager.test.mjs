import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

const { FeatureFlagsManager } = await import('../dist/feature-flags/index.js');

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

async function withFeatureFlagsDOM(flags, callback, { mutable = true } = {}) {
  const { JSDOM } = await loadJSDOM();
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const dom = new JSDOM(`
    <!doctype html>
    <html>
      <body>
        <input id="flag-search" value="">
        <table>
          <tbody id="flags-table"></tbody>
        </table>
        <div id="flags-empty" class="hidden"></div>
      </body>
    </html>
  `, { url: 'http://localhost/admin/feature-flags?scope=system' });

  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  dom.window.toastManager = null;

  try {
    const manager = new FeatureFlagsManager({
      apiPath: '/admin/api/feature-flags',
      basePath: '/admin',
    });
    manager.tableBody = dom.window.document.querySelector('#flags-table');
    manager.emptyState = dom.window.document.querySelector('#flags-empty');
    manager.searchInput = dom.window.document.querySelector('#flag-search');
    manager.allFlags = flags;
    manager.isMutable = mutable;
    manager.renderFlags(flags, mutable);

    await callback({ dom, manager });
  } finally {
    dom.window.close();
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
}

const describedFlag = {
  key: 'debug.panel',
  description: 'Shows debug panel details.',
  effective: true,
  source: 'default',
  default: { set: true, value: true },
  override: { state: 'missing' },
};

const plainFlag = {
  key: 'plain.flag',
  effective: false,
  source: 'default',
  default: { set: true, value: false },
  override: { state: 'missing' },
};

test('feature flags manager renders descriptions as expandable full-width rows', async () => {
  await withFeatureFlagsDOM([describedFlag, plainFlag], async ({ dom }) => {
    const document = dom.window.document;

    assert.equal(document.querySelectorAll('#flags-table > tr').length, 2);
    assert.equal(document.querySelectorAll('.feature-flag-description-row').length, 0);

    const toggle = document.querySelector('.feature-flag-key-toggle');
    assert.ok(toggle, 'described flag should render a key toggle');
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    assert.ok(toggle.getAttribute('aria-controls'));
    assert.equal(document.querySelectorAll('.feature-flag-key-toggle').length, 1);
    assert.match(document.querySelector('#flags-table').textContent, /plain\.flag/);

    toggle.click();

    const expandedToggle = document.querySelector('.feature-flag-key-toggle');
    const detailRow = document.querySelector('.feature-flag-description-row');
    assert.ok(detailRow, 'expanding should insert a detail row');
    assert.equal(document.querySelectorAll('#flags-table > tr').length, 3);
    assert.equal(expandedToggle.getAttribute('aria-expanded'), 'true');
    assert.equal(expandedToggle.getAttribute('aria-controls'), detailRow.id);
    assert.equal(detailRow.querySelector('td')?.getAttribute('colspan'), '6');
    assert.match(detailRow.textContent, /Shows debug panel details\./);

    expandedToggle.click();

    assert.equal(document.querySelectorAll('.feature-flag-description-row').length, 0);
    assert.equal(document.querySelector('.feature-flag-key-toggle').getAttribute('aria-expanded'), 'false');
  });
});

test('feature flags manager escapes expanded description content', async () => {
  await withFeatureFlagsDOM([
    {
      ...describedFlag,
      description: 'Unsafe <script>alert("x")</script> & copy',
    },
  ], async ({ dom }) => {
    const document = dom.window.document;

    document.querySelector('.feature-flag-key-toggle').click();

    const detailRow = document.querySelector('.feature-flag-description-row');
    assert.ok(detailRow);
    assert.match(detailRow.textContent, /Unsafe <script>alert\("x"\)<\/script> & copy/);
    assert.match(detailRow.innerHTML, /&lt;script&gt;alert\("x"\)&lt;\/script&gt; &amp; copy/);
    assert.equal(detailRow.querySelectorAll('script').length, 0);
  });
});

test('feature flags manager filters row pairs without orphaned detail rows', async () => {
  await withFeatureFlagsDOM([describedFlag, plainFlag], async ({ dom, manager }) => {
    const document = dom.window.document;

    document.querySelector('.feature-flag-key-toggle').click();
    assert.equal(document.querySelectorAll('.feature-flag-description-row').length, 1);

    manager.searchInput.value = 'plain';
    manager.renderFlags(manager.allFlags, manager.isMutable);

    assert.equal(document.querySelectorAll('#flags-table > tr').length, 1);
    assert.equal(document.querySelectorAll('.feature-flag-description-row').length, 0);
    assert.match(document.querySelector('#flags-table').textContent, /plain\.flag/);
    assert.doesNotMatch(document.querySelector('#flags-table').textContent, /debug\.panel/);

    manager.searchInput.value = 'debug';
    manager.renderFlags(manager.allFlags, manager.isMutable);

    assert.equal(document.querySelectorAll('#flags-table > tr').length, 2);
    assert.equal(document.querySelectorAll('.feature-flag-description-row').length, 1);
    assert.match(document.querySelector('.feature-flag-description-row').textContent, /Shows debug panel details\./);
  });
});

test('feature flags manager action menu does not toggle description rows', async () => {
  await withFeatureFlagsDOM([describedFlag], async ({ dom, manager }) => {
    const document = dom.window.document;
    const updates = [];
    manager.updateFlag = async (key, state) => {
      updates.push({ key, state });
    };

    document.querySelector('.feature-flag-key-toggle').click();
    assert.equal(document.querySelectorAll('.feature-flag-description-row').length, 1);
    assert.equal(document.querySelector('.feature-flag-key-toggle').getAttribute('aria-expanded'), 'true');

    document.querySelector('.action-menu-trigger').click();
    assert.equal(document.querySelectorAll('.feature-flag-description-row').length, 1);
    assert.equal(document.querySelector('.feature-flag-key-toggle').getAttribute('aria-expanded'), 'true');
    assert.equal(document.querySelector('.action-menu-dropdown').classList.contains('hidden'), false);

    document.querySelector('.action-menu-item[data-value="disabled"]').click();
    await new Promise((resolve) => setImmediate(resolve));

    assert.deepEqual(updates, [{ key: 'debug.panel', state: 'disabled' }]);
    assert.equal(document.querySelectorAll('.feature-flag-description-row').length, 1);
    assert.equal(document.querySelector('.feature-flag-key-toggle').getAttribute('aria-expanded'), 'true');
  });
});

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
