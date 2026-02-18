import test from 'node:test';
import assert from 'node:assert/strict';

const {
  DataGrid,
  GoCrudPaginationBehavior,
  GoCrudSearchBehavior,
  GoCrudFilterBehavior,
  GoCrudSortBehavior,
  GoCrudBulkActionBehavior,
} = await import('../dist/datatable/index.js');

function createLocalStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key) {
      store.delete(key);
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
  };
}

function createTestWindow(search = '', width = 1280) {
  const calls = [];
  const location = {
    pathname: '/admin/content/pages',
    search,
  };

  const applyURL = (url) => {
    const parsed = new URL(String(url), 'http://localhost');
    location.pathname = parsed.pathname;
    location.search = parsed.search;
  };

  const history = {
    pushState(_state, _title, url) {
      calls.push({ type: 'push', url: String(url) });
      applyURL(url);
    },
    replaceState(_state, _title, url) {
      calls.push({ type: 'replace', url: String(url) });
      applyURL(url);
    },
  };

  return {
    calls,
    window: {
      location,
      history,
      innerWidth: width,
    },
  };
}

function installTestGlobals({ search = '', width = 1280, storage = {} } = {}) {
  const prev = {
    window: globalThis.window,
    document: globalThis.document,
    localStorage: globalThis.localStorage,
  };

  const { window, calls } = createTestWindow(search, width);
  const document = {
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    addEventListener: () => {},
  };

  globalThis.window = window;
  globalThis.document = document;
  globalThis.localStorage = createLocalStorage(storage);

  return {
    calls,
    cleanup() {
      if (prev.window === undefined) {
        delete globalThis.window;
      } else {
        globalThis.window = prev.window;
      }
      if (prev.document === undefined) {
        delete globalThis.document;
      } else {
        globalThis.document = prev.document;
      }
      if (prev.localStorage === undefined) {
        delete globalThis.localStorage;
      } else {
        globalThis.localStorage = prev.localStorage;
      }
    },
  };
}

test('phase4 contract: matrix view remains selectable without breaking grouped-mode routing', () => {
  const { cleanup } = installTestGlobals({ width: 420 });

  try {
    const grid = new DataGrid({
      tableId: 'translations-table',
      apiEndpoint: '/admin/api/panels/pages',
      columns: [],
      enableGroupedMode: true,
      defaultViewMode: 'flat',
      groupByField: 'translation_group_id',
    });

    grid.refresh = async () => {};
    grid.setViewMode('matrix');

    assert.equal(grid.getViewMode(), 'matrix');
  } finally {
    cleanup();
  }
});

test('phase4 contract: datagrid query contract preserves filters/search/sort/grouping', () => {
  const { cleanup } = installTestGlobals();

  try {
    const grid = new DataGrid({
      tableId: 'translations-table',
      apiEndpoint: '/admin/api/panels/pages',
      columns: [
        { field: 'title', label: 'Title' },
        { field: 'status', label: 'Status' },
      ],
      enableGroupedMode: true,
      defaultViewMode: 'grouped',
      groupByField: 'translation_group_id',
      behaviors: {
        pagination: new GoCrudPaginationBehavior(),
        search: new GoCrudSearchBehavior(['title']),
        filter: new GoCrudFilterBehavior(),
        sort: new GoCrudSortBehavior(),
      },
    });

    grid.state.currentPage = 2;
    grid.state.perPage = 25;
    grid.state.search = 'hello';
    grid.state.filters = [{ column: 'status', operator: 'eq', value: 'draft' }];
    grid.state.sort = [{ field: 'title', direction: 'asc' }];

    const query = new URLSearchParams(grid.buildQueryString());

    assert.equal(query.get('limit'), '25');
    assert.equal(query.get('offset'), '25');
    assert.equal(query.get('title__ilike'), '%hello%');
    assert.equal(query.get('status'), 'draft');
    assert.equal(query.get('order'), 'title asc');
    assert.equal(query.get('group_by'), 'translation_group_id');
  } finally {
    cleanup();
  }
});

test('phase4 contract: URL state falls back to short token when payload exceeds budget', () => {
  const { calls, cleanup } = installTestGlobals({ search: '?env=prod' });

  try {
    const stateStore = {
      tokenSaved: null,
      loadPersistedState() {
        return null;
      },
      savePersistedState() {},
      resolveShareState() {
        return null;
      },
      createShareState(payload) {
        this.tokenSaved = payload;
        return 'tok_phase4';
      },
    };

    const grid = new DataGrid({
      tableId: 'translations-table',
      apiEndpoint: '/admin/api/panels/pages',
      columns: [{ field: 'title', label: 'Title' }],
      stateStore,
      urlState: {
        maxURLLength: 120,
        maxFiltersLength: 20,
        enableStateToken: true,
      },
    });

    grid.state.search = 'hello-world-phase4';
    grid.state.filters = [{ column: 'title', operator: 'ilike', value: 'very-long-filter-value-to-trigger-token' }];
    grid.syncURL();

    assert.equal(calls.length, 1);
    const parsed = new URL(calls[0].url, 'http://localhost');
    assert.equal(parsed.searchParams.get('state'), 'tok_phase4');
    assert.equal(parsed.searchParams.get('filters'), null);
    assert.equal(parsed.searchParams.get('search'), null);
    assert.equal(parsed.searchParams.get('env'), 'prod');
    assert.ok(stateStore.tokenSaved, 'expected share state snapshot to be created');
  } finally {
    cleanup();
  }
});

test('phase4 contract: go-crud bulk behavior preserves endpoint and payload shape', async () => {
  let requestCapture = null;
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url, init) => {
    requestCapture = {
      url: String(url),
      method: init?.method,
      body: init?.body,
      headers: init?.headers,
    };
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const behavior = new GoCrudBulkActionBehavior('/admin/api/panels/page');
    const grid = {
      refreshed: false,
      async refresh() {
        this.refreshed = true;
      },
    };

    await behavior.execute('publish', ['a1', 'a2'], grid);

    assert.equal(requestCapture.url, '/admin/api/panels/pages/bulk/publish');
    assert.equal(requestCapture.method, 'POST');
    assert.equal(JSON.parse(String(requestCapture.body)).ids.length, 2);
    assert.equal(grid.refreshed, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
