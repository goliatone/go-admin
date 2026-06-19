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
  Object.defineProperty(globalThis, 'navigator', { value: win.navigator, configurable: true, writable: true });
  globalThis.Node = win.Node;
  globalThis.Element = win.Element;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.HTMLInputElement = win.HTMLInputElement;
  globalThis.Event = win.Event;
  globalThis.MouseEvent = win.MouseEvent;
}

const bootstrapDOM = new JSDOM(`<!doctype html><html><body></body></html>`, { url: 'http://127.0.0.1:9090/' });
setGlobals(bootstrapDOM.window);

const {
  LiveListView,
  appendListRow,
  evictListOverflow,
  hashString,
  renderLogsPanel,
  renderLogRow,
  logRowKey,
  consoleStyles,
} = await import('../dist/debug/index.js');

// ---------------------------------------------------------------------------
// Helpers: a minimal generic keyed list
// ---------------------------------------------------------------------------

function makeContainer() {
  const root = document.createElement('div');
  root.innerHTML = `<table><tbody data-live-list></tbody></table>`;
  document.body.appendChild(root);
  return root;
}

/** Build a generic LiveListView over `items` with a manual frame scheduler. */
function makeView(items, opts = {}) {
  const root = makeContainer();
  const frames = [];
  const renderRow =
    opts.renderRow ||
    ((item) => `<tr data-row-key="${item.id}"><td>${item.id}</td></tr>`);
  const view = new LiveListView({
    styles: consoleStyles,
    keyOf: (item) => item.id,
    renderRow,
    getItems: () => items,
    getRenderOptions: () => ({ newestFirst: opts.newestFirst ?? true }),
    getMaxEntries: () => opts.maxEntries ?? 50,
    shouldDisplay: opts.shouldDisplay,
    onNeedFullRender: opts.onNeedFullRender,
    onAfterAppend: opts.onAfterAppend,
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
    keys() {
      return [...root.querySelectorAll('tbody [data-row-key]')].map((el) => el.getAttribute('data-row-key'));
    },
    rowCount() {
      return root.querySelectorAll('tbody tr').length;
    },
  };
}

// ---------------------------------------------------------------------------
// Generic DOM helpers
// ---------------------------------------------------------------------------

test('hashString is deterministic and base36', () => {
  assert.equal(hashString('abc'), hashString('abc'));
  assert.notEqual(hashString('abc'), hashString('abd'));
  assert.match(hashString('hello world'), /^[0-9a-z]+$/);
});

test('appendListRow inserts at the correct edge', () => {
  const root = makeContainer();
  const tbody = root.querySelector('tbody');
  appendListRow(tbody, `<tr data-row-key="a"><td>a</td></tr>`, true);
  appendListRow(tbody, `<tr data-row-key="b"><td>b</td></tr>`, true);
  assert.deepEqual([...tbody.querySelectorAll('[data-row-key]')].map((e) => e.getAttribute('data-row-key')), ['b', 'a']);
  appendListRow(tbody, `<tr data-row-key="c"><td>c</td></tr>`, false);
  assert.deepEqual([...tbody.querySelectorAll('[data-row-key]')].map((e) => e.getAttribute('data-row-key')), ['b', 'a', 'c']);
});

test('evictListOverflow removes whole multi-row logical items', () => {
  const root = makeContainer();
  const tbody = root.querySelector('tbody');
  // Each logical item = a keyed primary row + a non-keyed detail row.
  for (const id of ['a', 'b', 'c']) {
    tbody.insertAdjacentHTML(
      'beforeend',
      `<tr data-row-key="${id}"><td>${id}</td></tr><tr class="detail"><td>${id} detail</td></tr>`
    );
  }
  assert.equal(tbody.querySelectorAll('tr').length, 6, 'three items, two rows each');

  const evicted = evictListOverflow(tbody, '[data-row-key]', 'data-row-key', 2, false);
  assert.deepEqual(evicted, ['a'], 'oldest (top) evicted when not newest-first');
  assert.equal(tbody.querySelectorAll('tr').length, 4, 'primary + detail removed together');
  assert.equal(tbody.querySelector('.detail')?.textContent, 'b detail', 'a-detail gone, b-detail is now first');
});

// ---------------------------------------------------------------------------
// LiveListView engine
// ---------------------------------------------------------------------------

test('newest-first: enqueue prepends and evicts the oldest from the bottom', () => {
  const items = [{ id: 'a' }, { id: 'b' }];
  const root = makeContainer();
  // Pre-seed the rendered rows (chronological -> reversed for newest-first).
  root.querySelector('tbody').innerHTML = `<tr data-row-key="b"><td>b</td></tr><tr data-row-key="a"><td>a</td></tr>`;
  const ctx = (() => {
    const frames = [];
    const view = new LiveListView({
      styles: consoleStyles,
      keyOf: (i) => i.id,
      renderRow: (i) => `<tr data-row-key="${i.id}"><td>${i.id}</td></tr>`,
      getItems: () => items,
      getRenderOptions: () => ({ newestFirst: true }),
      getMaxEntries: () => 2,
      scheduleFrame: (cb) => frames.push(cb),
    });
    view.adopt(root);
    return { view, frames, root };
  })();

  items.push({ id: 'c' });
  ctx.view.enqueue([{ id: 'c' }]);
  ctx.frames.splice(0).forEach((cb) => cb());

  const keys = [...ctx.root.querySelectorAll('[data-row-key]')].map((e) => e.getAttribute('data-row-key'));
  assert.deepEqual(keys, ['c', 'b'], 'c prepended, oldest (a) evicted');
});

test('oldest-first: enqueue appends and evicts the oldest from the top', () => {
  const items = [{ id: 'a' }, { id: 'b' }];
  const ctx = makeView(items, { newestFirst: false, maxEntries: 50 });
  // Seed initial DOM in chronological order.
  ctx.root.querySelector('tbody').innerHTML = `<tr data-row-key="a"><td>a</td></tr><tr data-row-key="b"><td>b</td></tr>`;
  // Re-adopt to bind the seeded container (same element).
  ctx.view.adopt(ctx.root);

  items.push({ id: 'c' });
  ctx.view.enqueue([{ id: 'c' }]);
  ctx.tick();
  assert.deepEqual(ctx.keys(), ['a', 'b', 'c'], 'c appended at the bottom');
});

test('a burst of enqueues within one frame coalesces to a single flush', () => {
  const items = [];
  const ctx = makeView(items);
  ctx.view.enqueue([{ id: 'a' }]);
  ctx.view.enqueue([{ id: 'b' }]);
  ctx.view.enqueue([{ id: 'c' }]);
  assert.equal(ctx.frames.length, 1, 'one frame scheduled for the burst');
  ctx.tick();
  assert.deepEqual(ctx.keys(), ['c', 'b', 'a'], 'all applied in one pass, newest-first');
});

test('shouldDisplay filters incremental inserts', () => {
  const items = [];
  const ctx = makeView(items, { shouldDisplay: (i) => i.id !== 'skip' });
  ctx.view.enqueue([{ id: 'keep' }, { id: 'skip' }]);
  ctx.tick();
  assert.deepEqual(ctx.keys(), ['keep'], 'filtered item not inserted');
});

test('pause buffers with a pending count; resume flushes', () => {
  const items = [];
  let pending = -1;
  const root = makeContainer();
  const frames = [];
  const view = new LiveListView({
    styles: consoleStyles,
    keyOf: (i) => i.id,
    renderRow: (i) => `<tr data-row-key="${i.id}"><td>${i.id}</td></tr>`,
    getItems: () => items,
    getRenderOptions: () => ({ newestFirst: true }),
    getMaxEntries: () => 50,
    onPendingChange: (n) => { pending = n; },
    scheduleFrame: (cb) => frames.push(cb),
  });
  view.adopt(root);

  view.setPaused(true);
  view.enqueue([{ id: 'a' }]);
  assert.equal(frames.length, 0, 'no frame scheduled while paused');
  assert.equal(pending, 1);
  assert.equal(view.pendingCount, 1);

  view.setPaused(false);
  frames.splice(0).forEach((cb) => cb());
  assert.equal(pending, 0, 'pending cleared after flush');
  assert.equal(root.querySelectorAll('[data-row-key]').length, 1);
});

test('discardPending drops buffered items without rendering', () => {
  const items = [];
  const root = makeContainer();
  const frames = [];
  const view = new LiveListView({
    styles: consoleStyles,
    keyOf: (i) => i.id,
    renderRow: (i) => `<tr data-row-key="${i.id}"><td>${i.id}</td></tr>`,
    getItems: () => items,
    getRenderOptions: () => ({ newestFirst: true }),
    getMaxEntries: () => 50,
    scheduleFrame: (cb) => frames.push(cb),
  });
  view.adopt(root);
  view.setPaused(true);
  view.enqueue([{ id: 'a' }, { id: 'b' }]);
  view.discardPending();
  assert.equal(view.pendingCount, 0);
  view.setPaused(false);
  frames.splice(0).forEach((cb) => cb());
  assert.equal(root.querySelectorAll('[data-row-key]').length, 0, 'nothing rendered');
});

test('not-mounted live update requests a full render', () => {
  const items = [];
  let fullRenders = 0;
  const root = document.createElement('div'); // no [data-live-list] container
  document.body.appendChild(root);
  const frames = [];
  const view = new LiveListView({
    styles: consoleStyles,
    keyOf: (i) => i.id,
    renderRow: (i) => `<tr data-row-key="${i.id}"><td>${i.id}</td></tr>`,
    getItems: () => items,
    getRenderOptions: () => ({ newestFirst: true }),
    getMaxEntries: () => 50,
    onNeedFullRender: () => { fullRenders += 1; },
    scheduleFrame: (cb) => frames.push(cb),
  });
  view.adopt(root);
  view.enqueue([{ id: 'a' }]);
  frames.splice(0).forEach((cb) => cb());
  assert.equal(fullRenders, 1, 'host asked to do a full render');
});

test('onAfterAppend fires with the appended keys', () => {
  const items = [];
  let lastKeys = null;
  const ctx = makeView(items, { onAfterAppend: (_c, keys) => { lastKeys = keys; } });
  ctx.view.enqueue([{ id: 'x' }, { id: 'y' }]);
  ctx.tick();
  assert.deepEqual(lastKeys, ['x', 'y']);
});

// ---------------------------------------------------------------------------
// Logs panel adoption
// ---------------------------------------------------------------------------

function logEntry(over = {}) {
  return {
    timestamp: over.timestamp ?? '2026-06-18T10:00:00Z',
    level: over.level ?? 'INFO',
    source: over.source ?? 'app',
    message: over.message ?? 'hello',
  };
}

test('logRowKey is deterministic per content', () => {
  const e = logEntry();
  assert.equal(logRowKey(e), logRowKey({ ...e }));
  assert.notEqual(logRowKey(e), logRowKey({ ...e, message: 'different' }));
});

test('renderLogsPanel marks a live-list tbody and keyed rows', () => {
  const html = renderLogsPanel([logEntry()], consoleStyles, { showSource: true });
  assert.match(html, /<tbody data-live-list>/);
  assert.match(html, /data-row-key="log-/);
});

test('logs panel appends incrementally without rebuilding', () => {
  const logs = [logEntry({ message: 'first' })];
  const root = document.createElement('div');
  root.innerHTML = renderLogsPanel(logs, consoleStyles, { newestFirst: true, maxEntries: 50, showSource: true });
  document.body.appendChild(root);

  const frames = [];
  let scrolls = 0;
  const view = new LiveListView({
    styles: consoleStyles,
    keyOf: logRowKey,
    renderRow: (e) => renderLogRow(e, consoleStyles, { showSource: true }),
    getItems: () => logs,
    getRenderOptions: () => ({ newestFirst: true }),
    getMaxEntries: () => 50,
    onAfterAppend: () => { scrolls += 1; },
    scheduleFrame: (cb) => frames.push(cb),
  });
  view.adopt(root);
  const firstRow = root.querySelector('tbody tr');

  const next = logEntry({ message: 'second' });
  logs.push(next);
  view.enqueue([next]);
  frames.splice(0).forEach((cb) => cb());

  assert.equal(root.querySelectorAll('tbody tr').length, 2, 'one row appended');
  assert.equal(root.querySelectorAll('tbody tr')[1], firstRow, 'original row untouched (now second, newest-first prepend)');
  assert.equal(scrolls, 1, 'auto-scroll hook fired');
});
