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
  renderSchemaListRow,
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

function rowKeys(root) {
  return [...root.querySelectorAll('[data-row-key]')].map((e) => e.getAttribute('data-row-key'));
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
    getRenderOptions: () => ({}),
    shouldDisplay: over.shouldDisplay,
    onNeedFullRender: over.onNeedFullRender || (() => {}),
    scheduleFrame: (cb) => frames.push(cb),
  });
  return { manager, tick: () => frames.splice(0).forEach((cb) => cb()) };
}

// Sort direction is owned by the def's liveList.newestFirst (the single source
// shared with the renderer), not by the host.
const LIVE_DEF = {
  id: 'queue',
  label: 'Queue',
  render: () => '',
  liveList: {
    renderRow: (item) => `<tr data-row-key="${item.id}"><td>${item.id}</td></tr>`,
    keyOf: (item) => item.id,
    newestFirst: true,
  },
};

const PLAIN_DEF = { id: 'plain', label: 'Plain', render: () => '' };

test('handles() reflects the liveList opt-in', () => {
  const { manager } = makeManager();
  assert.ok(manager.handles(LIVE_DEF));
  assert.ok(!manager.handles(PLAIN_DEF));
  assert.ok(!manager.handles(undefined));
});

test('hosts that cannot render focused upserts fall back to full rendering', () => {
  const manager = new RegistryLiveListManager({
    styles: consoleStyles,
    allowUpsert: false,
    getRenderOptions: () => ({}),
    onNeedFullRender: () => {},
  });
  assert.equal(manager.handles({
    id: 'runs', label: 'Runs', render: () => '',
    liveList: { updateMode: 'upsert', renderRow: () => '', keyOf: () => 'run-1' },
  }), false);
  assert.equal(manager.handles(LIVE_DEF), true, 'append live lists remain supported');
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

test('keyed upsert replaces a logical row and rejects duplicate or older revisions', () => {
  const root = mount(`<table><tbody data-live-list>
    <tr data-row-key="run-1" data-row-revision="2" data-row-terminal="false"><td>two</td></tr>
    <tr data-detail-for="run-1"><td>old detail</td></tr>
  </tbody></table>`);
  const def = {
    id: 'runs', label: 'Runs', render: () => '',
    liveList: {
      updateMode: 'upsert',
      keyOf: (item) => item.run_id,
      revisionOf: (item) => item.revision,
      terminalOf: (item) => item.terminal === true,
      renderRow: (item) => `<tr data-row-key="${item.run_id}" data-row-revision="${item.revision}" data-row-terminal="${item.terminal}"><td>${item.message}</td></tr><tr data-detail-for="${item.run_id}"><td>${item.message} detail</td></tr>`,
    },
  };
  const { manager, tick } = makeManager();
  manager.adopt(def, root);

  manager.enqueue(def, { run_id: 'run-1', revision: 1, message: 'older', terminal: false });
  manager.enqueue(def, { run_id: 'run-1', revision: 2, message: 'duplicate', terminal: false });
  tick();
  assert.equal(root.querySelector('[data-row-key="run-1"] td').textContent, 'two');
  assert.equal(root.querySelectorAll('[data-row-key="run-1"]').length, 1);

  manager.enqueue(def, { run_id: 'run-1', revision: 3, message: 'three', terminal: false });
  tick();
  assert.equal(root.querySelector('[data-row-key="run-1"] td').textContent, 'three');
  assert.equal(root.querySelector('[data-detail-for="run-1"] td').textContent, 'three detail');
  assert.equal(root.querySelectorAll('[data-row-key="run-1"]').length, 1);
});

test('keyed upsert coalesces progress bursts and flushes terminal state immediately', () => {
  const root = mount(`<table><tbody data-live-list></tbody></table>`);
  let renders = 0;
  const def = {
    id: 'runs-burst', label: 'Runs', render: () => '',
    liveList: {
      updateMode: 'upsert',
      keyOf: (item) => item.run_id,
      revisionOf: (item) => item.revision,
      terminalOf: (item) => item.terminal === true,
      renderRow: (item) => {
        renders += 1;
        return `<tr data-row-key="${item.run_id}" data-row-revision="${item.revision}" data-row-terminal="${item.terminal}"><td>${item.message}</td></tr>`;
      },
    },
  };
  const { manager, tick } = makeManager();
  manager.adopt(def, root);
  manager.enqueue(def, { run_id: 'run-1', revision: 1, message: 'one', terminal: false });
  manager.enqueue(def, { run_id: 'run-1', revision: 2, message: 'two', terminal: false });
  manager.enqueue(def, { run_id: 'run-1', revision: 3, message: 'three', terminal: false });
  assert.equal(renders, 0, 'progress waits for the scheduled frame');
  tick();
  assert.equal(renders, 1, 'only the newest progress update renders');
  assert.equal(root.querySelector('[data-row-key="run-1"] td').textContent, 'three');

  manager.enqueue(def, { run_id: 'run-1', revision: 4, message: 'done', terminal: true });
  assert.equal(renders, 2, 'terminal update renders synchronously');
  assert.equal(root.querySelector('[data-row-key="run-1"] td').textContent, 'done');
  manager.enqueue(def, { run_id: 'run-1', revision: 5, message: 'late progress', terminal: false });
  tick();
  assert.equal(root.querySelector('[data-row-key="run-1"] td').textContent, 'done', 'terminal state cannot regress');
});

test('keyed upsert keeps a sustained single-run progress burst to one render per frame', () => {
  const root = mount('<table><tbody data-live-list></tbody></table>');
  let renders = 0;
  const def = {
    id: 'runs-stress', label: 'Runs', render: () => '',
    liveList: {
      updateMode: 'upsert',
      keyOf: (item) => item.run_id,
      revisionOf: (item) => item.revision,
      terminalOf: (item) => item.terminal === true,
      renderRow: (item) => {
        renders += 1;
        return `<tr data-row-key="${item.run_id}" data-row-revision="${item.revision}" data-row-terminal="false"><td>${item.revision}</td></tr>`;
      },
    },
  };
  const { manager, tick } = makeManager();
  manager.adopt(def, root);
  for (let revision = 1; revision <= 1000; revision += 1) {
    manager.enqueue(def, { run_id: 'run-hot', revision, terminal: false });
  }
  tick();
  assert.equal(renders, 1);
  assert.equal(root.querySelector('[data-row-key="run-hot"] td').textContent, '1000');
});

test('keyed upsert respects arrival order when revision and terminal guards conflict', () => {
  const makeDef = (id) => ({
    id, label: 'Runs', render: () => '',
    liveList: {
      updateMode: 'upsert',
      keyOf: (item) => item.run_id,
      revisionOf: (item) => item.revision,
      terminalOf: (item) => item.terminal === true,
      renderRow: (item) => `<tr data-row-key="${item.run_id}" data-row-revision="${item.revision}" data-row-terminal="${item.terminal}"><td>${item.message}</td></tr>`,
    },
  });

  const progressFirst = mount('<table><tbody data-live-list></tbody></table>');
  const first = makeManager();
  const firstDef = makeDef('arrival-progress-first');
  first.manager.adopt(firstDef, progressFirst);
  first.manager.enqueue(firstDef, { run_id: 'run-1', revision: 3, message: 'newer progress', terminal: false });
  first.manager.enqueue(firstDef, { run_id: 'run-1', revision: 2, message: 'older terminal', terminal: true });
  assert.equal(progressFirst.querySelector('td').textContent, 'newer progress', 'older terminal is rejected');

  const terminalFirst = mount('<table><tbody data-live-list></tbody></table>');
  const second = makeManager();
  const secondDef = makeDef('arrival-terminal-first');
  second.manager.adopt(secondDef, terminalFirst);
  second.manager.enqueue(secondDef, { run_id: 'run-1', revision: 2, message: 'terminal', terminal: true });
  second.manager.enqueue(secondDef, { run_id: 'run-1', revision: 3, message: 'regression', terminal: false });
  second.tick();
  assert.equal(terminalFirst.querySelector('td').textContent, 'terminal', 'terminal cannot regress');
});

test('keyed upsert eviction removes the complete oldest logical row', () => {
  const root = mount(`<table><tbody data-live-list>
    <tr data-row-key="run-1" data-row-revision="1"><td>one</td></tr><tr data-detail-for="run-1"><td>detail one</td></tr>
    <tr data-row-key="run-2" data-row-revision="1"><td>two</td></tr><tr data-detail-for="run-2"><td>detail two</td></tr>
  </tbody></table>`);
  const evicted = [];
  const def = {
    id: 'runs-cap', label: 'Runs', render: () => '',
    liveList: {
      updateMode: 'upsert',
      keyOf: (item) => item.run_id,
      revisionOf: (item) => item.revision,
      renderRow: (item) => `<tr data-row-key="${item.run_id}" data-row-revision="${item.revision}"><td>${item.run_id}</td></tr><tr data-detail-for="${item.run_id}"><td>detail</td></tr>`,
      getMaxEntries: () => 2,
      onEvict: (keys) => evicted.push(...keys),
    },
  };
  const { manager, tick } = makeManager();
  manager.adopt(def, root);
  manager.enqueue(def, { run_id: 'run-3', revision: 1 });
  tick();
  assert.deepEqual(rowKeys(root), ['run-2', 'run-3']);
  assert.equal(root.querySelector('[data-detail-for="run-1"]'), null);
  assert.deepEqual(evicted, ['run-1']);
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

// Regression: H2 — a `table` view without declared columns derives columns from
// the first row on full render but per-item on append, so it must NOT opt in.
test('panelDefinitionFromServer derives liveList.newestFirst from events.order', () => {
  assert.equal(panelDefinitionFromServer(serverDef('append', 'table')).liveList.newestFirst, false, 'default chronological');
  const ordered = {
    id: 'svc', label: 'Service', snapshot_key: 'svc', event_types: 'svc',
    ui: {
      events: { mode: 'append', max_entries: 50, order: 'newest_first' },
      views: { console: { renderer: 'table', options: { columns: [{ label: 'ID', bind: 'id' }], key_bind: 'id' } } },
    },
  };
  assert.equal(panelDefinitionFromServer(ordered).liveList.newestFirst, true, 'order: newest_first -> prepend');
});

test('panelDefinitionFromServer requires declared columns to opt a table in', () => {
  const noCols = {
    id: 'svc', label: 'Service', snapshot_key: 'svc', event_types: 'svc',
    ui: { events: { mode: 'append' }, views: { console: { renderer: 'table' } } },
  };
  assert.equal(panelDefinitionFromServer(noCols).liveList, undefined, 'table w/o columns stays full-render');

  const statusNoCols = {
    id: 'svc', label: 'Service', snapshot_key: 'svc', event_types: 'svc',
    ui: { events: { mode: 'append' }, views: { console: { renderer: 'status_list' } } },
  };
  assert.ok(panelDefinitionFromServer(statusNoCols).liveList, 'status_list needs no columns -> opts in');
});

// Regression: H1 — a chronological list (no liveList.newestFirst) renders newest
// at the bottom AND appends at the bottom. The def's newestFirst is the single
// source for both the renderer and the engine, so they can't diverge.
test('registry live append matches schema chronological order (newest at bottom)', () => {
  const view = { renderer: 'table', options: { columns: [{ label: 'ID', bind: 'id' }], key_bind: 'id' } };
  // Full render with newestFirst=false (chronological) — newest at the bottom.
  const root = mount(renderSchemaTable('Q', [{ id: 'a' }, { id: 'b' }], view, consoleStyles, false));
  assert.deepEqual(rowKeys(root), ['a', 'b'], 'full render is chronological');

  const def = {
    id: 'q',
    label: 'Q',
    render: () => '',
    liveList: {
      renderRow: (item, styles) => renderSchemaListRow('table', item, view, styles),
      keyOf: (item) => schemaRowKey(item, 'id'),
      // no newestFirst -> chronological (append at bottom)
    },
  };
  const frames = [];
  const manager = new RegistryLiveListManager({
    styles: consoleStyles,
    getRenderOptions: () => ({}),
    onNeedFullRender: () => {},
    scheduleFrame: (cb) => frames.push(cb),
  });
  manager.adopt(def, root);
  manager.enqueue(def, { id: 'c' });
  frames.splice(0).forEach((cb) => cb());
  assert.deepEqual(rowKeys(root), ['a', 'b', 'c'], 'append lands at the bottom, staying chronological');
});

// Complement: newestFirst:true reverses the full render AND prepends on append.
test('registry live append honors liveList.newestFirst (newest at top)', () => {
  const view = { renderer: 'table', options: { columns: [{ label: 'ID', bind: 'id' }], key_bind: 'id' } };
  const root = mount(renderSchemaTable('Q', [{ id: 'a' }, { id: 'b' }], view, consoleStyles, true));
  assert.deepEqual(rowKeys(root), ['b', 'a'], 'full render reversed (newest first)');

  const def = {
    id: 'q',
    label: 'Q',
    render: () => '',
    liveList: {
      renderRow: (item, styles) => renderSchemaListRow('table', item, view, styles),
      keyOf: (item) => schemaRowKey(item, 'id'),
      newestFirst: true,
    },
  };
  const frames = [];
  const manager = new RegistryLiveListManager({
    styles: consoleStyles,
    getRenderOptions: () => ({}),
    onNeedFullRender: () => {},
    scheduleFrame: (cb) => frames.push(cb),
  });
  manager.adopt(def, root);
  manager.enqueue(def, { id: 'c' });
  frames.splice(0).forEach((cb) => cb());
  assert.deepEqual(rowKeys(root), ['c', 'b', 'a'], 'append prepends, staying newest-first');
});
