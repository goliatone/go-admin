import test from 'node:test';
import assert from 'node:assert/strict';

const { DataGrid, ServerColumnVisibilityBehavior, createDataGridStateStore } = await import('../dist/datatable/index.js');

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

function installTestGlobals({ tableId = 'test-datatable', search = '' } = {}) {
  const prev = {
    window: globalThis.window,
    document: globalThis.document,
    localStorage: globalThis.localStorage,
    fetch: globalThis.fetch,
    location: globalThis.location,
  };

  const location = {
    origin: 'http://localhost',
    pathname: '/admin/content/pages',
    search,
  };
  const history = {
    pushState(_state, _title, url) {
      const parsed = new URL(String(url), location.origin);
      location.pathname = parsed.pathname;
      location.search = parsed.search;
    },
    replaceState(_state, _title, url) {
      const parsed = new URL(String(url), location.origin);
      location.pathname = parsed.pathname;
      location.search = parsed.search;
    },
  };
  const table = {
    id: tableId,
    dataset: {},
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
  };
  const document = {
    querySelector(selector) {
      return selector === `#${tableId}` ? table : null;
    },
    querySelectorAll: () => [],
    getElementById(id) {
      return id === tableId ? table : null;
    },
    addEventListener: () => {},
  };

  globalThis.window = {
    location,
    history,
    innerWidth: 1280,
    setTimeout,
    clearTimeout,
  };
  globalThis.location = location;
  globalThis.document = document;
  globalThis.localStorage = createLocalStorage();

  return {
    table,
    cleanup() {
      for (const [key, value] of Object.entries(prev)) {
        if (value === undefined) {
          delete globalThis[key];
        } else {
          globalThis[key] = value;
        }
      }
    },
  };
}

function createGrid(overrides = {}) {
  return new DataGrid({
    tableId: 'test-datatable',
    apiEndpoint: '/admin/api/panels/pages',
    columns: [{ field: 'title', label: 'Title' }],
    ...overrides,
  });
}

function createListResponse(total = 0) {
  return new Response(JSON.stringify({ records: [], total }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

test('DataGrid refresh coalesces repeated calls into one active fetch and one trailing fetch', async () => {
  const { cleanup } = installTestGlobals();
  const calls = [];
  let releaseFirst;
  const firstFetchReleased = new Promise((resolve) => {
    releaseFirst = resolve;
  });

  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (calls.length === 1) {
      await firstFetchReleased;
    }
    return createListResponse();
  };

  try {
    const grid = createGrid();
    grid.renderData = () => {};
    grid.updatePaginationUI = () => {};
    grid.updateBulkActionsBar = () => {};

    const first = grid.refresh();
    const second = grid.refresh();
    const third = grid.refresh();

    assert.equal(calls.length, 1);
    releaseFirst();
    await Promise.all([first, second, third]);

    assert.equal(calls.length, 2);
  } finally {
    cleanup();
  }
});

test('DataGrid ignores stale refresh responses', async () => {
  const { cleanup } = installTestGlobals();
  let releaseFetch;
  const fetchReleased = new Promise((resolve) => {
    releaseFetch = resolve;
  });
  let renderCalls = 0;

  globalThis.fetch = async () => {
    await fetchReleased;
    return createListResponse();
  };

  try {
    const grid = createGrid();
    grid.renderData = () => {
      renderCalls++;
    };
    grid.updatePaginationUI = () => {};
    grid.updateBulkActionsBar = () => {};

    const refresh = grid.refresh();
    await Promise.resolve();
    grid.activeRefreshSeq = 999;
    releaseFetch();
    await refresh;

    assert.equal(renderCalls, 0);
  } finally {
    cleanup();
  }
});

test('DataGrid init hydrates preferences before the first refresh', async () => {
  const { cleanup } = installTestGlobals();
  const events = [];
  let releaseHydrate;
  const hydrateReleased = new Promise((resolve) => {
    releaseHydrate = resolve;
  });
  let hydrated = false;
  const stateStore = {
    hydrate: async () => {
      events.push('hydrate:start');
      await hydrateReleased;
      hydrated = true;
      events.push('hydrate:done');
    },
    loadPersistedState: () => {
      events.push(hydrated ? 'load:hydrated' : 'load:initial');
      return hydrated ? { viewMode: 'grouped' } : null;
    },
    savePersistedState: () => {},
    clearPersistedState: () => {},
    createShareState: () => '',
    resolveShareState: () => null,
  };

  try {
    const grid = createGrid({
      enableGroupedMode: true,
      defaultViewMode: 'flat',
      stateStore,
    });
    grid.refresh = async () => {
      events.push(`refresh:${grid.state.perPage}:${grid.state.viewMode}`);
    };

    grid.init();
    await Promise.resolve();

    assert.deepEqual(events, ['load:initial', 'hydrate:start']);

    releaseHydrate();
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.deepEqual(events, [
      'load:initial',
      'hydrate:start',
      'hydrate:done',
      'load:hydrated',
      'refresh:10:grouped',
    ]);
  } finally {
    cleanup();
  }
});

test('DataGrid URL state remains authoritative over hydrated preferences', async () => {
  const { cleanup } = installTestGlobals({ search: '?view_mode=flat' });
  const events = [];
  const stateStore = {
    hydrate: async () => {
      events.push('hydrate');
    },
    loadPersistedState: () => {
      events.push('load');
      return { viewMode: 'grouped' };
    },
    savePersistedState: () => {},
    clearPersistedState: () => {},
    createShareState: () => '',
    resolveShareState: () => null,
  };

  try {
    const grid = createGrid({
      enableGroupedMode: true,
      defaultViewMode: 'matrix',
      stateStore,
    });
    grid.refresh = async () => {
      events.push(`refresh:${grid.state.viewMode}`);
    };

    grid.init();
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.deepEqual(events, [
      'load',
      'hydrate',
      'refresh:flat',
    ]);
  } finally {
    cleanup();
  }
});

test('preferences state hydration times out instead of blocking the grid', async () => {
  const { cleanup } = installTestGlobals();
  let aborted = false;

  globalThis.fetch = async (_url, options = {}) => new Promise((_resolve, reject) => {
    options.signal?.addEventListener('abort', () => {
      aborted = true;
      const error = new Error('aborted');
      error.name = 'AbortError';
      reject(error);
    });
  });

  try {
    const store = createDataGridStateStore({
      key: 'pages',
      mode: 'preferences',
      preferencesEndpoint: '/admin/api/panels/preferences',
      hydrateTimeoutMs: 1,
    });

    await store.hydrate();

    assert.equal(aborted, true);
  } finally {
    cleanup();
  }
});

test('server column visibility hydration times out instead of blocking grid construction', async () => {
  const { cleanup } = installTestGlobals();
  let aborted = false;

  globalThis.fetch = async (_url, options = {}) => new Promise((_resolve, reject) => {
    options.signal?.addEventListener('abort', () => {
      aborted = true;
      const error = new Error('aborted');
      error.name = 'AbortError';
      reject(error);
    });
  });

  try {
    const behavior = new ServerColumnVisibilityBehavior(['title'], {
      resource: 'pages',
      preferencesEndpoint: '/admin/api/panels/preferences',
      loadTimeoutMs: 1,
    });

    const result = await behavior.loadFromServer();

    assert.equal(result, null);
    assert.equal(aborted, true);
  } finally {
    cleanup();
  }
});
