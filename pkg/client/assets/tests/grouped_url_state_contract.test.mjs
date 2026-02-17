import test from 'node:test';
import assert from 'node:assert/strict';

const {
  DataGrid,
  parseViewMode,
  encodeExpandedGroupsToken,
  decodeExpandedGroupsToken,
} = await import('../dist/datatable/index.js');

function createGrid() {
  return new DataGrid({
    tableId: 'translations-table',
    apiEndpoint: '/admin/api/panels/pages',
    columns: [],
    enableGroupedMode: true,
    defaultViewMode: 'flat',
    groupByField: 'translation_group_id',
  });
}

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

function createTestWindow(search = '') {
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
      innerWidth: 1200,
    },
  };
}

function installTestGlobals({ search = '', storage = {} } = {}) {
  const prev = {
    window: globalThis.window,
    document: globalThis.document,
    localStorage: globalThis.localStorage,
  };

  const { window, calls } = createTestWindow(search);
  const document = {
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
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

test('grouped URL contract: view mode parser validates accepted values', () => {
  assert.equal(parseViewMode('flat'), 'flat');
  assert.equal(parseViewMode('grouped'), 'grouped');
  assert.equal(parseViewMode('matrix'), 'matrix');
  assert.equal(parseViewMode('invalid'), null);
  assert.equal(parseViewMode(null), null);
});

test('grouped URL contract: expanded groups token encodes deterministically and decodes safely', () => {
  const token = encodeExpandedGroupsToken(new Set([' tg_beta ', 'tg/alpha', '', 'tg_beta']));
  assert.equal(token, 'tg%2Falpha,tg_beta');

  const decoded = decodeExpandedGroupsToken(token);
  assert.equal(decoded.size, 2);
  assert.ok(decoded.has('tg/alpha'));
  assert.ok(decoded.has('tg_beta'));
});

test('datatable grouped URL restore: URL params override persisted grouped state', async () => {
  const { cleanup } = installTestGlobals({
    search: '?view_mode=matrix&expanded_groups=tg_url_a,tg_url_b',
    storage: {
      'datagrid-view-mode-translations-table': 'grouped',
      'datagrid-expand-state-translations-table': JSON.stringify(['tg_local']),
    },
  });

  try {
    const grid = createGrid();
    grid.restoreStateFromURL();
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(grid.getViewMode(), 'matrix');
    assert.deepEqual(Array.from(grid.state.expandedGroups).sort(), ['tg_url_a', 'tg_url_b']);
  } finally {
    cleanup();
  }
});

test('datatable grouped URL restore: empty expanded_groups param clears persisted expand state', async () => {
  const { cleanup } = installTestGlobals({
    search: '?expanded_groups=',
    storage: {
      'datagrid-expand-state-translations-table': JSON.stringify(['tg_local']),
    },
  });

  try {
    const grid = createGrid();
    grid.restoreStateFromURL();
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(grid.state.expandedGroups.size, 0);
  } finally {
    cleanup();
  }
});

test('datatable grouped URL sync: preserves unrelated params and writes grouped state', () => {
  const { calls, cleanup } = installTestGlobals({
    search: '?env=production&tab=translations',
  });

  try {
    const grid = createGrid();
    grid.state.viewMode = 'grouped';
    grid.state.expandedGroups = new Set(['tg_b', 'tg_a']);

    grid.syncURL();

    assert.equal(calls.length, 1);
    assert.equal(calls[0].type, 'push');

    const parsed = new URL(calls[0].url, 'http://localhost');
    assert.equal(parsed.searchParams.get('env'), 'production');
    assert.equal(parsed.searchParams.get('tab'), 'translations');
    assert.equal(parsed.searchParams.get('view_mode'), 'grouped');
    assert.equal(parsed.searchParams.get('expanded_groups'), 'tg_a,tg_b');
  } finally {
    cleanup();
  }
});

test('datatable grouped URL sync: toggleGroup uses replaceState for expanded token updates', () => {
  const { calls, cleanup } = installTestGlobals({
    search: '?view_mode=grouped',
  });

  try {
    const grid = createGrid();
    grid.state.viewMode = 'grouped';
    grid.state.groupedData = {
      groups: [
        {
          groupId: 'tg_alpha',
          records: [],
          summary: {
            totalItems: 0,
            availableLocales: [],
            missingLocales: [],
            readinessState: null,
            readyForPublish: false,
          },
          expanded: false,
          summaryFromBackend: false,
        },
      ],
      ungrouped: [],
      totalGroups: 1,
      totalRecords: 0,
    };

    grid.toggleGroup('tg_alpha');

    assert.equal(calls.length, 1);
    assert.equal(calls[0].type, 'replace');

    const parsed = new URL(calls[0].url, 'http://localhost');
    assert.equal(parsed.searchParams.get('view_mode'), 'grouped');
    assert.equal(parsed.searchParams.get('expanded_groups'), 'tg_alpha');
  } finally {
    cleanup();
  }
});
