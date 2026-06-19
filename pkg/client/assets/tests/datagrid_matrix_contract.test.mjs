import test from 'node:test';
import assert from 'node:assert/strict';

const {
  AdvancedSearch,
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

function createTestElement(tagName = 'div') {
  const listeners = new Map();
  const classes = new Set();
  const element = {
    tagName: String(tagName).toUpperCase(),
    children: [],
    dataset: {},
    style: {},
    value: '',
    innerHTML: '',
    textContent: '',
    className: '',
    classList: {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      contains: (name) => classes.has(name),
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    addEventListener(type, handler) {
      const handlers = listeners.get(type) || [];
      handlers.push(handler);
      listeners.set(type, handlers);
    },
    dispatchEvent(event) {
      const handlers = listeners.get(event.type) || [];
      handlers.forEach((handler) => handler(event));
    },
    querySelector: () => null,
    querySelectorAll: () => [],
  };
  return element;
}

function installTestGlobals({ search = '', width = 1280, storage = {}, elements = {} } = {}) {
  const prev = {
    window: globalThis.window,
    document: globalThis.document,
    localStorage: globalThis.localStorage,
  };

  const { window, calls } = createTestWindow(search, width);
  const document = {
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: (id) => elements[id] || null,
    createElement: (tagName) => createTestElement(tagName),
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

test('matrix contract: view remains selectable without breaking grouped-mode routing', () => {
  const { cleanup } = installTestGlobals({ width: 420 });

  try {
    const grid = new DataGrid({
      tableId: 'translations-table',
      apiEndpoint: '/admin/api/panels/pages',
      columns: [],
      enableGroupedMode: true,
      defaultViewMode: 'flat',
      groupByField: 'family_id',
    });

    grid.refresh = async () => {};
    grid.setViewMode('matrix');

    assert.equal(grid.getViewMode(), 'matrix');
  } finally {
    cleanup();
  }
});

test('matrix contract: datagrid query preserves filters/search/sort/grouping', () => {
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
      groupByField: 'family_id',
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
    assert.equal(query.get('group_by'), 'family_id');
  } finally {
    cleanup();
  }
});

test('matrix contract: DataGrid restores snake_case URL state only', async () => {
  const { cleanup } = installTestGlobals({
    search: '?per_page=25&hidden_columns=%5B%22summary%22%5D&perPage=99&hiddenColumns=%5B%22title%22%5D',
  });

  try {
    const grid = new DataGrid({
      tableId: 'translations-table',
      apiEndpoint: '/admin/api/panels/pages',
      columns: [
        { field: 'title', label: 'Title' },
        { field: 'summary', label: 'Summary' },
      ],
      perPage: 10,
    });

    grid.restoreStateFromURL();

    assert.equal(grid.state.perPage, 25);
    assert.deepEqual(Array.from(grid.state.hiddenColumns), ['summary']);
    await new Promise((resolve) => setTimeout(resolve, 0));
  } finally {
    cleanup();
  }
});

test('matrix contract: DataGrid sync emits snake_case URL state', () => {
  const { calls, cleanup } = installTestGlobals({
    search: '?channel=prod&perPage=99&hiddenColumns=%5B%22title%22%5D&advancedSearch=%5B%5D',
  });

  try {
    const grid = new DataGrid({
      tableId: 'translations-table',
      apiEndpoint: '/admin/api/panels/pages',
      columns: [{ field: 'title', label: 'Title' }],
      enableGroupedMode: true,
      defaultViewMode: 'flat',
      perPage: 10,
    });

    grid.state.currentPage = 2;
    grid.state.perPage = 25;
    grid.state.search = 'hello';
    grid.state.viewMode = 'grouped';
    grid.state.hiddenColumns = new Set(['title']);
    grid.syncURL();

    assert.equal(calls.length, 1);
    const parsed = new URL(calls[0].url, 'http://localhost');
    assert.equal(parsed.searchParams.get('channel'), 'prod');
    assert.equal(parsed.searchParams.get('page'), '2');
    assert.equal(parsed.searchParams.get('per_page'), '25');
    assert.equal(parsed.searchParams.get('hidden_columns'), '["title"]');
    assert.equal(parsed.searchParams.get('view_mode'), 'grouped');
    assert.equal(parsed.searchParams.get('perPage'), null);
    assert.equal(parsed.searchParams.get('hiddenColumns'), null);
    assert.equal(parsed.searchParams.get('advancedSearch'), null);
  } finally {
    cleanup();
  }
});

test('matrix contract: DataGrid sync represents visible default-hidden columns', () => {
  const { calls, cleanup } = installTestGlobals();

  try {
    const grid = new DataGrid({
      tableId: 'translations-table',
      apiEndpoint: '/admin/api/panels/pages',
      columns: [{ field: 'title', label: 'Title', hidden: true }],
      perPage: 10,
    });

    grid.state.hiddenColumns = new Set();
    grid.syncURL();

    assert.equal(calls.length, 1);
    const parsed = new URL(calls[0].url, 'http://localhost');
    assert.equal(parsed.searchParams.get('hidden_columns'), '[]');
  } finally {
    cleanup();
  }
});

test('matrix contract: AdvancedSearch restores only snake_case URL state', () => {
  const encoded = encodeURIComponent(JSON.stringify([
    { field: 'title', operator: 'eq', value: 'hello', logic: 'or' },
    { field: 'unknown', operator: 'eq', value: 'ignored' },
  ]));
  const { cleanup } = installTestGlobals({
    search: `?advanced_search=${encoded}&advancedSearch=%5B%5D`,
  });

  try {
    const advancedSearch = new AdvancedSearch({
      fields: [{ name: 'title', label: 'Title', type: 'text' }],
      onSearch() {},
      onClear() {},
    });

    advancedSearch.restoreCriteriaFromURL();

    assert.deepEqual(advancedSearch.getCriteria(), [
      { field: 'title', operator: 'eq', value: 'hello', logic: 'or' },
    ]);
  } finally {
    cleanup();
  }
});

test('matrix contract: AdvancedSearch init applies restored URL criteria', () => {
  const encoded = encodeURIComponent(JSON.stringify([
    { field: 'title', operator: 'eq', value: 'hello', logic: 'or' },
  ]));
  const applied = [];
  const { cleanup } = installTestGlobals({
    search: `?advanced_search=${encoded}`,
    elements: {
      'advanced-search-modal': createTestElement('div'),
      'search-criteria-container': createTestElement('div'),
      'table-search': createTestElement('input'),
      'search-clear-btn': createTestElement('button'),
    },
  });

  try {
    const advancedSearch = new AdvancedSearch({
      fields: [{ name: 'title', label: 'Title', type: 'text' }],
      onSearch(criteria) {
        applied.push(criteria);
      },
      onClear() {},
    });

    advancedSearch.init();

    assert.deepEqual(applied, [[
      { field: 'title', operator: 'eq', value: 'hello', logic: 'or' },
    ]]);
  } finally {
    cleanup();
  }
});

test('matrix contract: AdvancedSearch clear removes URL criteria state', () => {
  const encoded = encodeURIComponent(JSON.stringify([
    { field: 'title', operator: 'eq', value: 'hello', logic: 'and' },
  ]));
  const { calls, cleanup } = installTestGlobals({
    search: `?advanced_search=${encoded}&filters=${encoded}&advancedSearch=%5B%5D&perPage=99&hiddenColumns=%5B%22title%22%5D`,
  });

  try {
    let clearCount = 0;
    const advancedSearch = new AdvancedSearch({
      fields: [{ name: 'title', label: 'Title', type: 'text' }],
      onSearch() {},
      onClear() {
        clearCount += 1;
      },
    });
    advancedSearch.setCriteria([
      { field: 'title', operator: 'eq', value: 'hello', logic: 'and' },
    ]);

    advancedSearch.clearAllChips();

    assert.equal(clearCount, 1);
    assert.equal(calls.length, 1);
    const parsed = new URL(calls[0].url, 'http://localhost');
    assert.equal(parsed.searchParams.get('advanced_search'), null);
    assert.equal(parsed.searchParams.get('filters'), null);
    assert.equal(parsed.searchParams.get('advancedSearch'), null);
    assert.equal(parsed.searchParams.get('perPage'), null);
    assert.equal(parsed.searchParams.get('hiddenColumns'), null);
  } finally {
    cleanup();
  }
});

test('matrix contract: AdvancedSearch chip removal rewrites snake_case URL criteria', () => {
  const { calls, cleanup } = installTestGlobals();

  try {
    const searched = [];
    const advancedSearch = new AdvancedSearch({
      fields: [
        { name: 'title', label: 'Title', type: 'text' },
        { name: 'status', label: 'Status', type: 'text' },
      ],
      onSearch(criteria) {
        searched.push(criteria);
      },
      onClear() {},
    });
    advancedSearch.setCriteria([
      { field: 'title', operator: 'eq', value: 'hello', logic: 'and' },
      { field: 'status', operator: 'eq', value: 'ready', logic: 'and' },
    ]);

    advancedSearch.removeChip(0);

    assert.equal(calls.length, 1);
    const parsed = new URL(calls[0].url, 'http://localhost');
    assert.deepEqual(JSON.parse(parsed.searchParams.get('advanced_search')), [
      { field: 'status', operator: 'eq', value: 'ready', logic: 'and' },
    ]);
    assert.equal(parsed.searchParams.get('advancedSearch'), null);
    assert.deepEqual(searched, [[
      { field: 'status', operator: 'eq', value: 'ready', logic: 'and' },
    ]]);
  } finally {
    cleanup();
  }
});

test('matrix contract: advanced_search counts as DataGrid URL state override', async () => {
  const encoded = encodeURIComponent(JSON.stringify([
    { field: 'title', operator: 'eq', value: 'hello', logic: 'and' },
  ]));
  const { cleanup } = installTestGlobals({
    search: `?advanced_search=${encoded}`,
  });

  try {
    const grid = new DataGrid({
      tableId: 'translations-table',
      apiEndpoint: '/admin/api/panels/pages',
      columns: [{ field: 'title', label: 'Title' }],
      perPage: 10,
    });

    grid.restoreStateFromURL();

    assert.equal(grid.hasURLStateOverrides, true);
    await new Promise((resolve) => setTimeout(resolve, 0));
  } finally {
    cleanup();
  }
});

test('matrix contract: URL state falls back to short token when payload exceeds budget', () => {
  const { calls, cleanup } = installTestGlobals({ search: '?channel=prod' });

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
        return 'tok_matrix';
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

    grid.state.search = 'hello-world-matrix';
    grid.state.filters = [{ column: 'title', operator: 'ilike', value: 'very-long-filter-value-to-trigger-token' }];
    grid.syncURL();

    assert.equal(calls.length, 1);
    const parsed = new URL(calls[0].url, 'http://localhost');
    assert.equal(parsed.searchParams.get('state'), 'tok_matrix');
    assert.equal(parsed.searchParams.get('filters'), null);
    assert.equal(parsed.searchParams.get('search'), null);
    assert.equal(parsed.searchParams.get('channel'), 'prod');
    assert.ok(stateStore.tokenSaved, 'expected share state snapshot to be created');
  } finally {
    cleanup();
  }
});

test('matrix contract: go-crud bulk behavior preserves endpoint and payload shape', async () => {
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
