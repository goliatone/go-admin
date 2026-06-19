import test from 'node:test';
import assert from 'node:assert/strict';

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();

function setGlobals(win) {
  globalThis.window = win;
  globalThis.self = win;
  globalThis.document = win.document;
  Object.defineProperty(globalThis, 'navigator', {
    value: win.navigator,
    configurable: true,
    writable: true,
  });
  globalThis.Node = win.Node;
  globalThis.Element = win.Element;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.HTMLInputElement = win.HTMLInputElement;
  globalThis.HTMLButtonElement = win.HTMLButtonElement;
  globalThis.Event = win.Event;
  globalThis.MouseEvent = win.MouseEvent;
}

const bootstrapDOM = new JSDOM(`<!doctype html><html><body></body></html>`, { url: 'http://127.0.0.1:9090/' });
setGlobals(bootstrapDOM.window);

const {
  renderSQLPanel,
  consoleStyles,
  SqlLiveView,
  sqlRowKey,
  appendSqlRowDOM,
  evictSqlOverflow,
} = await import('../dist/debug/index.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let seq = 0;
function entry(over = {}) {
  seq += 1;
  return {
    id: over.id ?? `id-${seq}`,
    timestamp: over.timestamp ?? `2026-06-18T10:00:${String(seq).padStart(2, '0')}Z`,
    duration: over.duration ?? 1_000_000,
    row_count: over.row_count ?? 1,
    query: over.query ?? `SELECT ${seq}`,
    error: over.error,
  };
}

/**
 * Build a console-style SQL panel for `queries` and return the root element plus
 * a controller wired with a manual frame scheduler so flushes are deterministic.
 */
function setup(queries, opts = {}) {
  const max = opts.maxEntries ?? 50;
  const newestFirst = opts.newestFirst ?? true;

  const root = document.createElement('div');
  root.innerHTML = renderSQLPanel(queries, consoleStyles, {
    newestFirst,
    maxEntries: max,
    useIconCopyButton: true,
    slowThresholdMs: 50,
  });
  document.body.appendChild(root);

  const frames = [];
  const view = new SqlLiveView({
    styles: consoleStyles,
    copyOptions: { useIconFeedback: true },
    getQueries: () => queries,
    getRenderOptions: () => ({
      newestFirst,
      maxEntries: max,
      useIconCopyButton: true,
      slowThresholdMs: 50,
    }),
    getMaxEntries: () => max,
    shouldDisplay: opts.shouldDisplay,
    onNeedFullRender: opts.onNeedFullRender,
    scheduleFrame: (cb) => frames.push(cb),
  });
  view.adopt(root);

  return {
    root,
    view,
    frames,
    tick() {
      frames.splice(0).forEach((cb) => cb());
    },
    rowIds() {
      return [...root.querySelectorAll('tbody tr[data-sql-id]')].map((tr) => tr.getAttribute('data-sql-id'));
    },
    checkbox(id) {
      return root.querySelector(`.sql-select-row[data-sql-id="${id}"]`);
    },
    summary(id) {
      return root.querySelector(`tr[data-sql-id="${id}"]`);
    },
    toolbarCount() {
      return root.querySelector('[data-sql-selected-count]')?.textContent;
    },
    toolbarVisible() {
      return root.querySelector('[data-sql-toolbar]')?.dataset.visible;
    },
    selectRow(id) {
      const cb = this.checkbox(id);
      cb.checked = true;
      cb.dispatchEvent(new window.Event('change', { bubbles: true }));
    },
    clickRow(id) {
      // Click the query-text cell (last cell) so it is not the checkbox/input.
      const cell = this.summary(id).querySelector('td:last-child');
      cell.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    },
    reRender() {
      // Simulate a host full re-render (panel switch / filter change / snapshot).
      root.innerHTML = renderSQLPanel(queries, consoleStyles, {
        newestFirst,
        maxEntries: max,
        useIconCopyButton: true,
        slowThresholdMs: 50,
      });
      view.adopt(root);
    },
  };
}

// ---------------------------------------------------------------------------
// Stable identity
// ---------------------------------------------------------------------------

test('sqlRowKey prefers server id', () => {
  assert.equal(sqlRowKey({ id: 'abc', query: 'SELECT 1' }), 'abc');
});

test('sqlRowKey falls back to a deterministic key when id is missing', () => {
  const e = { timestamp: '2026-06-18T10:00:00Z', duration: 5, query: 'SELECT 1' };
  const k1 = sqlRowKey(e);
  const k2 = sqlRowKey({ ...e });
  assert.equal(k1, k2, 'same entry yields same key');
  assert.notEqual(k1, sqlRowKey({ ...e, query: 'SELECT 2' }), 'different query yields different key');
  assert.ok(!k1.includes('undefined'));
});

test('rendered rows carry the stable id, not an array index', () => {
  const a = entry({ id: 'aaa' });
  const ctx = setup([a]);
  assert.deepEqual(ctx.rowIds(), ['aaa']);
  assert.ok(ctx.checkbox('aaa'), 'checkbox keyed by id');
  assert.equal(ctx.root.querySelector('[data-sql-index]'), null, 'no index-keyed attributes remain');
});

// ---------------------------------------------------------------------------
// Selection survival
// ---------------------------------------------------------------------------

test('selection survives an incremental append', () => {
  const a = entry({ id: 'a' });
  const b = entry({ id: 'b' });
  const queries = [a, b];
  const ctx = setup(queries);

  ctx.selectRow('a');
  assert.equal(ctx.toolbarCount(), '1 selected');
  assert.equal(ctx.toolbarVisible(), 'true');

  const c = entry({ id: 'c' });
  queries.push(c);
  ctx.view.enqueue([c]);
  ctx.tick();

  assert.deepEqual(ctx.rowIds(), ['c', 'b', 'a'], 'new row prepended (newest first)');
  assert.equal(ctx.checkbox('a').checked, true, 'previously selected row stays selected');
  assert.equal(ctx.checkbox('c').checked, false, 'new row starts unselected');
  assert.equal(ctx.toolbarCount(), '1 selected');
});

test('selection survives a full re-render (the lose-your-selection bug)', () => {
  const a = entry({ id: 'a' });
  const b = entry({ id: 'b' });
  const queries = [a, b];
  const ctx = setup(queries);

  ctx.selectRow('b');
  // A full re-render blows away and rebuilds the table DOM.
  ctx.reRender();

  assert.equal(ctx.checkbox('b').checked, true, 'selection restored after rebuild');
  assert.equal(ctx.toolbarCount(), '1 selected');
});

test('selection is pruned when an entry leaves the buffer entirely', () => {
  const a = entry({ id: 'a' });
  const b = entry({ id: 'b' });
  const queries = [a, b];
  const ctx = setup(queries);

  ctx.selectRow('a');
  // 'a' falls out of the backing buffer; re-render should drop its selection.
  queries.shift();
  ctx.reRender();

  assert.equal(ctx.toolbarCount(), '0 selected');
  assert.equal(ctx.toolbarVisible(), 'false');
});

// ---------------------------------------------------------------------------
// Expansion survival
// ---------------------------------------------------------------------------

test('expansion survives append and full re-render', () => {
  const a = entry({ id: 'a' });
  const b = entry({ id: 'b' });
  const queries = [a, b];
  const ctx = setup(queries);

  ctx.clickRow('b');
  assert.ok(ctx.summary('b').classList.contains('expanded'), 'row expands on click');

  const c = entry({ id: 'c' });
  queries.push(c);
  ctx.view.enqueue([c]);
  ctx.tick();
  assert.ok(ctx.summary('b').classList.contains('expanded'), 'expansion survives append');

  ctx.reRender();
  assert.ok(ctx.summary('b').classList.contains('expanded'), 'expansion restored after rebuild');
});

// ---------------------------------------------------------------------------
// Incremental append + eviction ordering
// ---------------------------------------------------------------------------

test('newest-first: new rows prepend and oldest evict from the bottom', () => {
  const a = entry({ id: 'a' });
  const b = entry({ id: 'b' });
  const queries = [a, b]; // chronological; rendered reversed -> [b, a]
  const ctx = setup(queries, { maxEntries: 2, newestFirst: true });
  assert.deepEqual(ctx.rowIds(), ['b', 'a']);

  const c = entry({ id: 'c' });
  queries.push(c);
  ctx.view.enqueue([c]);
  ctx.tick();

  assert.deepEqual(ctx.rowIds(), ['c', 'b'], 'c prepended, oldest (a) evicted');
  assert.equal(ctx.summary('a'), null, 'evicted summary row removed');
  assert.equal(ctx.root.querySelector('[data-expansion-for="sql-row-a"]'), null, 'evicted expansion row removed too');
});

test('oldest-first: new rows append and oldest evict from the top', () => {
  const a = entry({ id: 'a' });
  const b = entry({ id: 'b' });
  const queries = [a, b];
  const ctx = setup(queries, { maxEntries: 2, newestFirst: false });
  assert.deepEqual(ctx.rowIds(), ['a', 'b']);

  const c = entry({ id: 'c' });
  queries.push(c);
  ctx.view.enqueue([c]);
  ctx.tick();

  assert.deepEqual(ctx.rowIds(), ['b', 'c'], 'c appended, oldest (a) evicted from top');
});

test('evictSqlOverflow is a no-op under the cap', () => {
  const ctx = setup([entry({ id: 'a' })], { maxEntries: 5 });
  const tbody = ctx.root.querySelector('tbody');
  const removed = evictSqlOverflow(tbody, 5, true);
  assert.deepEqual(removed, []);
  assert.deepEqual(ctx.rowIds(), ['a']);
});

test('appendSqlRowDOM inserts at the correct edge', () => {
  const ctx = setup([entry({ id: 'a' })], { newestFirst: true });
  const tbody = ctx.root.querySelector('tbody');
  appendSqlRowDOM(tbody, entry({ id: 'z' }), consoleStyles, { newestFirst: true });
  assert.equal(ctx.rowIds()[0], 'z', 'prepended when newest-first');
});

// ---------------------------------------------------------------------------
// Filter-aware append
// ---------------------------------------------------------------------------

test('append respects the active filter predicate', () => {
  const a = entry({ id: 'a', query: 'SELECT 1' });
  const queries = [a];
  const ctx = setup(queries, {
    shouldDisplay: (e) => (e.query || '').startsWith('SELECT'),
  });

  const hidden = entry({ id: 'u', query: 'UPDATE t SET x=1' });
  const shown = entry({ id: 's', query: 'SELECT 2' });
  queries.push(hidden, shown);
  ctx.view.enqueue([hidden, shown]);
  ctx.tick();

  assert.ok(ctx.rowIds().includes('s'), 'matching row inserted');
  assert.ok(!ctx.rowIds().includes('u'), 'non-matching row skipped');
});

// ---------------------------------------------------------------------------
// Coalescing + pause
// ---------------------------------------------------------------------------

test('a burst of enqueues within one frame coalesces to a single flush', () => {
  const queries = [entry({ id: 'a' })];
  const ctx = setup(queries, { maxEntries: 50 });

  const b = entry({ id: 'b' });
  const c = entry({ id: 'c' });
  const d = entry({ id: 'd' });
  queries.push(b, c, d);
  ctx.view.enqueue([b]);
  ctx.view.enqueue([c]);
  ctx.view.enqueue([d]);

  assert.equal(ctx.frames.length, 1, 'only one frame scheduled for the burst');
  ctx.tick();
  assert.deepEqual(ctx.rowIds(), ['d', 'c', 'b', 'a'], 'all three applied in one pass');
});

test('while paused, entries buffer and report a pending count; resume flushes', () => {
  const queries = [entry({ id: 'a' })];
  let pending = -1;

  // Build directly so we can pass an onPendingChange callback (setup() omits it).
  const root = document.createElement('div');
  root.innerHTML = renderSQLPanel(queries, consoleStyles, { newestFirst: true, maxEntries: 50, useIconCopyButton: true });
  document.body.appendChild(root);
  const frames = [];
  const view = new SqlLiveView({
    styles: consoleStyles,
    getQueries: () => queries,
    getRenderOptions: () => ({ newestFirst: true, maxEntries: 50, useIconCopyButton: true }),
    getMaxEntries: () => 50,
    onPendingChange: (n) => { pending = n; },
    scheduleFrame: (cb) => frames.push(cb),
  });
  view.adopt(root);

  view.setPaused(true);
  const b = entry({ id: 'b' });
  queries.push(b);
  view.enqueue([b]);

  assert.equal(frames.length, 0, 'no frame scheduled while paused');
  assert.equal(pending, 1, 'pending count reported');
  assert.equal(root.querySelectorAll('tbody tr[data-sql-id]').length, 1, 'paused: DOM unchanged');

  view.setPaused(false);
  frames.splice(0).forEach((cb) => cb());
  assert.equal(pending, 0, 'pending cleared after flush');
  const ids = [...root.querySelectorAll('tbody tr[data-sql-id]')].map((tr) => tr.getAttribute('data-sql-id'));
  assert.deepEqual(ids, ['b', 'a'], 'buffered row rendered on resume');
});

test('not-mounted live update requests a full render instead of throwing', () => {
  const queries = [];
  let fullRenders = 0;
  // Empty queries -> renderSQLPanel emits an empty state (no table to adopt).
  const ctx = setup(queries, { onNeedFullRender: () => { fullRenders += 1; } });
  assert.equal(ctx.root.querySelector('[data-sql-table]'), null, 'no table mounted for empty state');

  const a = entry({ id: 'a' });
  queries.push(a);
  ctx.view.enqueue([a]);
  ctx.tick();
  assert.equal(fullRenders, 1, 'host asked to do a full render');
});
