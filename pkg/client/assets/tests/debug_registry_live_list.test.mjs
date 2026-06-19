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
}

const bootstrapDOM = new JSDOM(`<!doctype html><html><body></body></html>`, { url: 'http://127.0.0.1:9090/' });
setGlobals(bootstrapDOM.window);

const {
  RegistryLiveListManager,
  renderSchemaTable,
  renderSchemaStatusList,
  renderSchemaTimeline,
  schemaRowKey,
  isSchemaListRenderer,
  panelDefinitionFromServer,
  consoleStyles,
} = await import('../dist/debug/index.js');

function mount(html) {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
}

// ---------------------------------------------------------------------------
// Schema list renderers emit live-list markup
// ---------------------------------------------------------------------------

test('schemaRowKey uses key_bind, else a deterministic hash', () => {
  assert.equal(schemaRowKey({ id: 'x' }, 'id'), 'x');
  const a = schemaRowKey({ a: 1, b: 2 });
  assert.equal(a, schemaRowKey({ a: 1, b: 2 }));
  assert.notEqual(a, schemaRowKey({ a: 1, b: 3 }));
  assert.match(a, /^schema-/);
});

test('isSchemaListRenderer covers list kinds only', () => {
  assert.ok(isSchemaListRenderer('table'));
  assert.ok(isSchemaListRenderer('status_list'));
  assert.ok(isSchemaListRenderer('timeline'));
  assert.ok(!isSchemaListRenderer('json'));
  assert.ok(!isSchemaListRenderer('metrics'));
  assert.ok(!isSchemaListRenderer('stack'));
});

test('renderSchemaTable emits a live-list tbody with keyed rows', () => {
  const view = { renderer: 'table', options: { columns: [{ label: 'ID', bind: 'id' }], key_bind: 'id' } };
  const html = renderSchemaTable('Queue', [{ id: 'a' }, { id: 'b' }], view, consoleStyles);
  assert.match(html, /<tbody data-live-list>/);
  assert.match(html, /data-row-key="a"/);
  assert.match(html, /data-row-key="b"/);
});

test('renderSchemaStatusList and renderSchemaTimeline emit live-list tbodies', () => {
  const statusHtml = renderSchemaStatusList('Health', [{ label: 'db', status: 'ok' }], { renderer: 'status_list' }, consoleStyles);
  assert.match(statusHtml, /<tbody data-live-list>/);
  assert.match(statusHtml, /data-row-key="schema-/);

  const timelineHtml = renderSchemaTimeline('Events', [{ timestamp: '2026-06-18T10:00:00Z', message: 'hi' }], { renderer: 'timeline' }, consoleStyles);
  assert.match(timelineHtml, /<tbody data-live-list>/);
  assert.match(timelineHtml, /data-row-key="schema-/);
});

// ---------------------------------------------------------------------------
// RegistryLiveListManager
// ---------------------------------------------------------------------------

function makeManager(over = {}) {
  const frames = [];
  const manager = new RegistryLiveListManager({
    styles: consoleStyles,
    getData: over.getData || (() => []),
    getRenderOptions: () => ({ newestFirst: true }),
    shouldDisplay: over.shouldDisplay,
    onNeedFullRender: over.onNeedFullRender || (() => {}),
    scheduleFrame: (cb) => frames.push(cb),
  });
  return { manager, tick: () => frames.splice(0).forEach((cb) => cb()) };
}

const LIVE_DEF = {
  id: 'queue',
  label: 'Queue',
  render: () => '',
  liveList: {
    renderRow: (item) => `<tr data-row-key="${item.id}"><td>${item.id}</td></tr>`,
    keyOf: (item) => item.id,
  },
};

const PLAIN_DEF = { id: 'plain', label: 'Plain', render: () => '' };

test('handles() reflects the liveList opt-in', () => {
  const { manager } = makeManager();
  assert.ok(manager.handles(LIVE_DEF));
  assert.ok(!manager.handles(PLAIN_DEF));
  assert.ok(!manager.handles(undefined));
});

test('adopt + enqueue append a row incrementally (newest-first)', () => {
  const root = mount(`<table><tbody data-live-list><tr data-row-key="a"><td>a</td></tr></tbody></table>`);
  const { manager, tick } = makeManager();
  manager.adopt(LIVE_DEF, root);
  manager.enqueue(LIVE_DEF, { id: 'b' });
  tick();
  const keys = [...root.querySelectorAll('[data-row-key]')].map((e) => e.getAttribute('data-row-key'));
  assert.deepEqual(keys, ['b', 'a'], 'b prepended');
});

test('enqueue evicts beyond getMaxEntries', () => {
  const root = mount(`<table><tbody data-live-list><tr data-row-key="a"><td>a</td></tr><tr data-row-key="b"><td>b</td></tr></tbody></table>`);
  const def = { ...LIVE_DEF, liveList: { ...LIVE_DEF.liveList, getMaxEntries: () => 2 } };
  const { manager, tick } = makeManager();
  manager.adopt(def, root);
  manager.enqueue(def, { id: 'c' });
  tick();
  const keys = [...root.querySelectorAll('[data-row-key]')].map((e) => e.getAttribute('data-row-key'));
  assert.deepEqual(keys, ['c', 'a'], 'newest-first prepend c, evict oldest (b) from bottom');
});

test('enqueue falls back to full render when not mounted', () => {
  const root = mount(`<div>no live list here</div>`);
  let fullRenders = 0;
  const { manager, tick } = makeManager({ onNeedFullRender: () => { fullRenders += 1; } });
  manager.adopt(LIVE_DEF, root);
  manager.enqueue(LIVE_DEF, { id: 'x' });
  tick();
  assert.equal(fullRenders, 1);
});

test('shouldDisplay gates incremental inserts', () => {
  const root = mount(`<table><tbody data-live-list></tbody></table>`);
  const { manager, tick } = makeManager({ shouldDisplay: (_def, item) => item.id !== 'skip' });
  manager.adopt(LIVE_DEF, root);
  manager.enqueue(LIVE_DEF, { id: 'skip' });
  manager.enqueue(LIVE_DEF, { id: 'keep' });
  tick();
  const keys = [...root.querySelectorAll('[data-row-key]')].map((e) => e.getAttribute('data-row-key'));
  assert.deepEqual(keys, ['keep']);
});

test('a non-mounted enqueue for a plain (non-liveList) def is a no-op', () => {
  const root = mount(`<table><tbody data-live-list></tbody></table>`);
  const { manager, tick } = makeManager();
  manager.adopt(PLAIN_DEF, root);
  manager.enqueue(PLAIN_DEF, { id: 'a' });
  tick();
  assert.equal(root.querySelectorAll('[data-row-key]').length, 0);
});

// ---------------------------------------------------------------------------
// panelDefinitionFromServer auto-derivation
// ---------------------------------------------------------------------------

function serverDef(mode, renderer) {
  return {
    id: 'svc',
    label: 'Service',
    snapshot_key: 'svc',
    event_types: 'svc',
    ui: {
      events: { mode, max_entries: 50 },
      views: { console: { renderer, options: { columns: [{ label: 'ID', bind: 'id' }], key_bind: 'id' } } },
    },
  };
}

test('panelDefinitionFromServer sets liveList for append + list view', () => {
  const def = panelDefinitionFromServer(serverDef('append', 'table'));
  assert.ok(def.liveList, 'append table -> liveList');
  assert.equal(typeof def.liveList.renderRow, 'function');
  assert.equal(def.liveList.getMaxEntries(), 50);
  const rowHtml = def.liveList.renderRow({ id: 'z' }, consoleStyles, {});
  assert.match(rowHtml, /data-row-key="z"/);
  assert.equal(def.liveList.keyOf({ id: 'z' }), 'z');
});

test('panelDefinitionFromServer leaves non-append / non-list panels on full render', () => {
  assert.equal(panelDefinitionFromServer(serverDef('upsert', 'table')).liveList, undefined, 'upsert');
  assert.equal(panelDefinitionFromServer(serverDef('merge', 'table')).liveList, undefined, 'merge');
  assert.equal(panelDefinitionFromServer(serverDef('append', 'json')).liveList, undefined, 'append json');
  assert.equal(panelDefinitionFromServer(serverDef('append', 'metrics')).liveList, undefined, 'append metrics');
});
