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
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://127.0.0.1:9090/admin/debug' });
globalThis.window = dom.window;
globalThis.self = dom.window;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.Element = dom.window.Element;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.CustomEvent = dom.window.CustomEvent;
globalThis.Event = dom.window.Event;
Object.defineProperty(globalThis, 'localStorage', { value: dom.window.localStorage, configurable: true, writable: true });
Object.defineProperty(globalThis, 'sessionStorage', { value: dom.window.sessionStorage, configurable: true, writable: true });
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true, writable: true });

const {
  RegistryLiveListManager,
  DebugStream,
  captureCommandRunSnapshotBaseline,
  commandRunsNavigationHref,
  commandRunsSelection,
  commandRunRevisionGap,
  consoleStyles,
  initDebugPanel,
  mergeAuthoritativeCommandRuns,
  panelRegistry,
  panelDefinitionFromServer,
  parseCommandRunsNavigation,
  reconcileCommandRunsRows,
  renderCommandRunsPanel,
  resetCommandRunsState,
  setCommandRunsNavigationTarget,
} = await import('../dist/debug/index.js');

function row(overrides = {}) {
  return {
    schema_version: 1,
    event_id: 'evt-1',
    run_id: 'run-1',
    revision: 1,
    command_id: 'reports.generate',
    dispatch_id: 'dispatch-1',
    correlation_id: 'correlation-1',
    phase: 'progress',
    occurred_at: '2026-07-22T12:00:00Z',
    updated_at: '2026-07-22T12:00:01Z',
    duration_ms: 1250,
    mode: 'queued',
    checkpoint: 'rendering',
    message: 'Rendering pages',
    current: 4,
    total: 10,
    attempt: 2,
    max_attempts: 3,
    failure: { category: 'dependency', code: 'provider_timeout' },
    metadata: { internal_provider_payload: 'must-not-render' },
    outcome: {
      summary: 'Processed <safe> records',
      fields: { processed: 4, dry_run: false },
    },
    ...overrides,
  };
}

function serverDefinition(maxEntries = 50) {
  return {
    id: 'command_runs',
    label: 'Command Runs',
    icon: 'iconoir-list',
    snapshot_key: 'command_runs',
    event_types: ['command_run'],
    ui: {
      events: { mode: 'upsert', key: 'run_id', max_entries: maxEntries },
      views: { console: { renderer: 'table', options: { columns: [{ label: 'Run', bind: 'run_id' }], key_bind: 'run_id' } } },
    },
  };
}

function mount(html) {
  document.body.innerHTML = `<main>${html}</main>`;
  return document.querySelector('main');
}

function manager() {
  const frames = [];
  return {
    frames,
    instance: new RegistryLiveListManager({
      styles: consoleStyles,
      getRenderOptions: () => ({}),
      onNeedFullRender: () => {},
      scheduleFrame: (cb) => frames.push(cb),
    }),
    tick() { frames.splice(0).forEach((cb) => cb()); },
  };
}

test.beforeEach(() => resetCommandRunsState());

test('Command Runs renders lifecycle detail accessibly, escapes outcome data, and hides generic metadata', () => {
  const root = mount(renderCommandRunsPanel([row()], consoleStyles));
  const primary = root.querySelector('[data-command-run-row]');
  assert.equal(primary.getAttribute('data-row-key'), 'run-1');
  assert.equal(primary.getAttribute('data-row-revision'), '1');
  assert.equal(primary.getAttribute('data-row-terminal'), 'false');
  assert.match(primary.textContent, /progress/);
  assert.match(primary.textContent, /4 \/ 10 \(40%\)/);
  assert.match(primary.textContent, /queued/);
  assert.match(primary.textContent, /2 \/ 3/);
  assert.match(primary.textContent, /1\.25 s/);
  assert.match(primary.textContent, /Rendering pages/);
  const toggle = primary.querySelector('[data-command-run-toggle]');
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.match(toggle.getAttribute('aria-label'), /Show details for reports\.generate run run-1 \(progress\)/);
  assert.equal(root.querySelector('[data-command-run-detail]').hidden, true);
  assert.match(root.textContent, /dependency \/ provider_timeout/);
  assert.match(root.textContent, /Processed <safe> records/);
  assert.match(root.textContent, /processed/);
  assert.match(root.textContent, /dry_run/);
  assert.match(root.innerHTML, /&lt;safe&gt;/);
  assert.doesNotMatch(root.innerHTML, /<safe>/);
  assert.doesNotMatch(root.textContent, /must-not-render/);
});

test('Command Runs always renders deterministic base details and an explicit empty outcome', () => {
  for (const phase of ['submitted', 'started', 'checkpoint', 'progress', 'succeeded', 'failed', 'canceled', 'rejected']) {
    const rendered = mount(renderCommandRunsPanel([row({
      run_id: `run-${phase}`,
      event_id: `event-${phase}`,
      phase,
      outcome: undefined,
      metadata: { arbitrary: `hidden-${phase}` },
    })], consoleStyles));
    const details = rendered.querySelector('[data-command-run-detail]');
    assert.match(details.textContent, new RegExp(`run-${phase}`));
    assert.match(details.textContent, /Dispatch ID/);
    assert.match(details.textContent, /First occurred/);
    assert.match(details.textContent, /Progress/);
    assert.match(details.textContent, /Attempt/);
    assert.match(details.textContent, /No additional result metadata was recorded\./);
    assert.doesNotMatch(details.textContent, new RegExp(`hidden-${phase}`));
  }
});

test('Command Runs keyed replacement preserves expansion, selection, focus, and scroll', () => {
  const def = panelDefinitionFromServer(serverDefinition());
  assert.equal(def.liveList.updateMode, 'upsert');
  const root = mount(def.render([row()], consoleStyles, {}));
  const live = manager();
  live.instance.adopt(def, root);
  const toggle = root.querySelector('[data-command-run-toggle]');
  toggle.click();
  toggle.focus();
  const container = root.querySelector('[data-live-list]');
  container.scrollTop = 37;
  assert.equal(commandRunsSelection(), 'run-1');
  assert.equal(root.querySelector('[data-command-run-detail]').hidden, false);

  live.instance.enqueue(def, row({ revision: 2, current: 8, message: 'Almost done' }));
  live.tick();
  const replacement = root.querySelector('[data-command-run-row]');
  assert.equal(root.querySelectorAll('[data-command-run-row]').length, 1);
  assert.equal(replacement.getAttribute('aria-selected'), 'true');
  assert.equal(replacement.querySelector('[data-command-run-toggle]').getAttribute('aria-expanded'), 'true');
  assert.match(replacement.querySelector('[data-command-run-toggle]').getAttribute('aria-label'), /^Hide details/);
  assert.equal(root.querySelector('[data-command-run-detail]').hidden, false);
  assert.equal(document.activeElement, replacement.querySelector('[data-command-run-toggle]'));
  assert.equal(container.scrollTop, 37);
  assert.match(replacement.textContent, /8 \/ 10 \(80%\)/);
  assert.match(replacement.textContent, /Almost done/);
});

test('Command Runs server definition inserts new runs and evicts retained state as logical rows', () => {
  const def = panelDefinitionFromServer(serverDefinition(2));
  const firstLiveState = def.handleEvent(undefined, row());
  assert.equal(Array.isArray(firstLiveState), true);
  assert.equal(firstLiveState[0].run_id, 'run-1');
  const root = mount(def.render([row(), row({ run_id: 'run-2', event_id: 'evt-2' })], consoleStyles, {}));
  const live = manager();
  live.instance.adopt(def, root);
  root.querySelector('[data-row-key="run-1"] [data-command-run-toggle]').click();
  live.instance.enqueue(def, row({ run_id: 'run-3', event_id: 'evt-3' }));
  live.tick();
  assert.deepEqual(
    [...root.querySelectorAll('[data-command-run-row]')].map((entry) => entry.getAttribute('data-row-key')),
    ['run-2', 'run-3'],
  );
  assert.equal(root.querySelector('[data-parent-key="run-1"]'), null);
  assert.equal(root.querySelector('[data-command-run-unavailable]').hidden, false);
});

test('Command Runs URL state supports run, dispatch, and correlation deep links without losing unrelated query state', () => {
  assert.deepEqual(parseCommandRunsNavigation('?panel=command_runs&run_id=run%2F1'), {
    runID: 'run/1', dispatchID: undefined, correlationID: undefined,
  });
  assert.deepEqual(parseCommandRunsNavigation('?dispatch_id=dispatch-8'), {
    runID: undefined, dispatchID: 'dispatch-8', correlationID: undefined,
  });
  assert.deepEqual(parseCommandRunsNavigation('?correlation_id=corr-9'), {
    runID: undefined, dispatchID: undefined, correlationID: 'corr-9',
  });
  const runHref = commandRunsNavigationHref('http://127.0.0.1:9090/admin/debug?tenant=t1#live', { runID: 'run/1' });
  assert.equal(runHref, '/admin/debug?tenant=t1&panel=command_runs&run_id=run%2F1#live');
  const dispatchHref = commandRunsNavigationHref(runHref, { dispatchID: 'dispatch 8', correlationID: 'ignored' });
  assert.equal(dispatchHref, '/admin/debug?tenant=t1&panel=command_runs&dispatch_id=dispatch+8#live');
  const correlationHref = commandRunsNavigationHref(dispatchHref, { correlationID: 'corr 9' });
  assert.equal(correlationHref, '/admin/debug?tenant=t1&panel=command_runs&correlation_id=corr+9#live');
});

test('authoritative snapshots restore dispatch and correlation targets and report evicted targets', () => {
  setCommandRunsNavigationTarget({ dispatchID: 'dispatch-target' });
  const dispatched = row({ run_id: 'run-dispatched', dispatch_id: 'dispatch-target', revision: 4 });
  assert.equal(reconcileCommandRunsRows([dispatched], true), 'run-dispatched');

  setCommandRunsNavigationTarget({ correlationID: 'corr-target' });
  const restored = row({ run_id: 'run-restored', correlation_id: 'corr-target', revision: 5, message: 'Recovered after reconnect' });
  assert.equal(reconcileCommandRunsRows([restored], true), 'run-restored');
  let root = mount(renderCommandRunsPanel([restored], consoleStyles));
  assert.equal(root.querySelector('[data-row-key="run-restored"]').getAttribute('aria-selected'), 'false', 'DOM state restores on adoption');
  const def = panelDefinitionFromServer(serverDefinition());
  const live = manager();
  live.instance.adopt(def, root);
  assert.equal(root.querySelector('[data-row-key="run-restored"]').getAttribute('aria-selected'), 'true');
  assert.match(root.textContent, /Recovered after reconnect/);

  setCommandRunsNavigationTarget({ runID: 'run-evicted' });
  reconcileCommandRunsRows([], true);
  root = mount(renderCommandRunsPanel([], consoleStyles));
  assert.equal(root.querySelector('[data-command-run-unavailable]').hidden, false);
});

test('authoritative snapshots merge per run without discarding recovery behind an unrelated live update', () => {
  const current = [
    row({ run_id: 'run-a', revision: 1, phase: 'running', updated_at: '2026-07-22T12:00:01Z' }),
    row({ run_id: 'run-b', revision: 1, phase: 'running', updated_at: '2026-07-22T12:00:01Z' }),
  ];
  const generations = new Map([['run-a', 1], ['run-b', 2]]);
  const baseline = captureCommandRunSnapshotBaseline(current, generations);
  const live = [
    current[0],
    row({ run_id: 'run-b', revision: 3, phase: 'progress', message: 'newer live B', updated_at: '2026-07-22T12:00:03Z' }),
  ];
  generations.set('run-b', 3);
  const snapshot = [
    row({ run_id: 'run-a', revision: 2, phase: 'succeeded', message: 'recovered A', updated_at: '2026-07-22T12:00:02Z' }),
    row({ run_id: 'run-b', revision: 2, phase: 'progress', message: 'stale B', updated_at: '2026-07-22T12:00:02Z' }),
  ];
  const merged = mergeAuthoritativeCommandRuns(live, snapshot, baseline, generations);
  assert.equal(merged.find((entry) => entry.run_id === 'run-a').message, 'recovered A');
  assert.equal(merged.find((entry) => entry.run_id === 'run-b').message, 'newer live B');
});

test('authoritative snapshots preserve newer terminal rows and remove only unchanged baseline absences', () => {
  const current = [
    row({ run_id: 'terminal', revision: 3, phase: 'succeeded', updated_at: '2026-07-22T12:00:03Z' }),
    row({ run_id: 'unchanged', revision: 1, phase: 'running' }),
    row({ run_id: 'advanced', revision: 2, phase: 'running' }),
    row({ run_id: 'new-live', revision: 1, phase: 'submitted' }),
  ];
  const generations = new Map([['terminal', 1], ['unchanged', 2], ['advanced', 4], ['new-live', 5]]);
  const baseline = new Map([
    ['terminal', { revision: 3, generation: 1 }],
    ['unchanged', { revision: 1, generation: 2 }],
    ['advanced', { revision: 1, generation: 3 }],
  ]);
  const merged = mergeAuthoritativeCommandRuns(current, [
    row({ run_id: 'terminal', revision: 4, phase: 'progress', updated_at: '2026-07-22T12:00:04Z' }),
  ], baseline, generations);
  assert.equal(merged.find((entry) => entry.run_id === 'terminal').phase, 'succeeded');
  assert.equal(merged.some((entry) => entry.run_id === 'unchanged'), false);
  assert.equal(merged.some((entry) => entry.run_id === 'advanced'), true);
  assert.equal(merged.some((entry) => entry.run_id === 'new-live'), true);
  assert.equal(commandRunRevisionGap(row({ revision: 2 }), row({ revision: 4 })), true);
  assert.equal(commandRunRevisionGap(row({ revision: 2 }), row({ revision: 3 })), false);
});

test('equal-revision snapshots cannot rewrite terminal phase and can safely complete fields', () => {
  const failed = row({
    run_id: 'terminal-conflict',
    revision: 8,
    phase: 'failed',
    message: 'live failure detail',
    outcome: undefined,
  });
  const conflict = row({
    run_id: 'terminal-conflict',
    revision: 8,
    phase: 'succeeded',
    message: 'stale success',
  });
  const retained = mergeAuthoritativeCommandRuns([failed], [conflict], new Map(), new Map());
  assert.equal(retained[0].phase, 'failed');
  assert.equal(retained[0].message, 'live failure detail');

  const completion = row({
    run_id: 'terminal-conflict',
    revision: 8,
    phase: 'failed',
    outcome: { summary: 'Failure details recorded', fields: { retryable: false } },
  });
  delete completion.message;
  const completed = mergeAuthoritativeCommandRuns([failed], [completion], new Map(), new Map());
  assert.equal(completed[0].phase, 'failed');
  assert.equal(completed[0].message, 'live failure detail');
  assert.equal(completed[0].outcome.summary, 'Failure details recorded');
});

test('DebugStream accepts a fresh snapshot before later deltas on initial connect and reconnect', () => {
  const scheduled = [];
  const originalSetTimeout = window.setTimeout;
  const originalClearTimeout = window.clearTimeout;
  window.setTimeout = (callback, delay) => {
    scheduled.push({ callback, delay });
    return scheduled.length;
  };
  window.clearTimeout = () => {};

  class FakeWebSocket {
    static OPEN = 1;
    static CONNECTING = 0;
    static instances = [];
    constructor() {
      this.readyState = FakeWebSocket.CONNECTING;
      this.sent = [];
      FakeWebSocket.instances.push(this);
    }
    send(value) { this.sent.push(JSON.parse(value)); }
    close() {}
  }
  globalThis.WebSocket = FakeWebSocket;
  const received = [];
  const stream = new DebugStream({
    url: 'ws://127.0.0.1/debug/ws',
    reconnectDelayMs: 0,
    onEvent: (event) => received.push(`${event.type}:${event.payload?.command_runs?.[0]?.revision ?? event.payload?.revision ?? ''}`),
  });
  stream.connect();
  const first = FakeWebSocket.instances[0];
  first.readyState = FakeWebSocket.OPEN;
  first.onopen();
  first.onmessage({ data: JSON.stringify({ type: 'snapshot', payload: { command_runs: [row({ revision: 1 })] } }) });
  first.onmessage({ data: JSON.stringify({ type: 'command_run', payload: row({ revision: 2 }) }) });
  first.readyState = 3;
  first.onclose();
  const reconnectTimer = scheduled.find((timer) => timer.delay === 0);
  assert.ok(reconnectTimer, 'close schedules a reconnect independently of the stability timer');
  reconnectTimer.callback();

  const second = FakeWebSocket.instances[1];
  second.readyState = FakeWebSocket.OPEN;
  second.onopen();
  second.onmessage({ data: JSON.stringify({ type: 'snapshot', payload: { command_runs: [row({ revision: 5 })] } }) });
  second.onmessage({ data: JSON.stringify({ type: 'command_run', payload: row({ revision: 6 }) }) });
  assert.deepEqual(received, ['snapshot:1', 'command_run:2', 'snapshot:5', 'command_run:6']);
  window.setTimeout = originalSetTimeout;
  window.clearTimeout = originalClearTimeout;
  stream.close();
});

test('DebugPanel restores a correlation deep link and rewrites row selection to stable run URL state', async () => {
  resetCommandRunsState();
  window.history.replaceState({}, '', '/admin/debug-nav?tenant=t1&panel=command_runs&correlation_id=correlation-1');
  document.body.innerHTML = `
    <div data-debug-status><span data-debug-connection></span></div>
    <nav data-debug-tabs></nav>
    <section data-debug-filters></section>
    <main data-debug-console data-debug-panel data-debug-path="/admin/debug-nav" data-panels='["command_runs"]' data-repl-commands='[]'></main>
    <span data-debug-events></span><span data-debug-last></span>
  `;
  class OpenWebSocket {
    static OPEN = 1;
    static CONNECTING = 0;
    constructor() { this.readyState = OpenWebSocket.CONNECTING; queueMicrotask(() => { this.readyState = OpenWebSocket.OPEN; this.onopen?.(); }); }
    send() {}
    close() {}
  }
  globalThis.WebSocket = OpenWebSocket;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith('/api/panels')) {
      return new Response(JSON.stringify({ panels: [serverDefinition()] }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.endsWith('/api/snapshot')) {
      return new Response(JSON.stringify({ command_runs: [row()] }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const debugPanel = initDebugPanel(document.querySelector('[data-debug-console]'));
  assert.ok(debugPanel);
  for (let attempt = 0; attempt < 8 && !document.querySelector('[data-command-run-row]'); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  assert.ok(document.querySelector('[data-panel="command_runs"].debug-tab--active'));
  assert.ok(document.querySelector('[data-panel="command_runs"] .debug-icon .iconoir-list'));
  const selected = document.querySelector('[data-command-run-row]');
  assert.equal(selected?.getAttribute('aria-selected'), 'true');
  selected.querySelector('[data-command-run-toggle]').click();
  assert.equal(window.location.search, '?tenant=t1&panel=command_runs&run_id=run-1');
  debugPanel.destroy();
  panelRegistry.unregister('command_runs');
});

test('a late HTTP snapshot cannot overwrite a newer WebSocket snapshot and delta', async () => {
  resetCommandRunsState();
  window.history.replaceState({}, '', '/admin/debug-race?panel=command_runs');
  document.body.innerHTML = `
    <div data-debug-status><span data-debug-connection></span></div>
    <nav data-debug-tabs></nav><section data-debug-filters></section>
    <main data-debug-console data-debug-panel data-debug-path="/admin/debug-race" data-panels='["command_runs"]' data-repl-commands='[]'></main>
    <span data-debug-events></span><span data-debug-last></span>
  `;
  class ControlledWebSocket {
    static OPEN = 1;
    static CONNECTING = 0;
    static instances = [];
    constructor() {
      this.readyState = ControlledWebSocket.CONNECTING;
      ControlledWebSocket.instances.push(this);
      queueMicrotask(() => { this.readyState = ControlledWebSocket.OPEN; this.onopen?.(); });
    }
    send() {}
    close() {}
  }
  globalThis.WebSocket = ControlledWebSocket;
  let resolveHTTP;
  const staleHTTP = new Promise((resolve) => { resolveHTTP = resolve; });
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith('/api/panels')) {
      return new Response(JSON.stringify({ panels: [serverDefinition()] }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.endsWith('/api/snapshot')) return staleHTTP;
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const debugPanel = initDebugPanel(document.querySelector('[data-debug-console]'));
  for (let attempt = 0; attempt < 8 && ControlledWebSocket.instances.length === 0; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  const socket = ControlledWebSocket.instances[0];
  socket.onmessage({ data: JSON.stringify({ type: 'snapshot', payload: { command_runs: [row({ revision: 5, message: 'socket snapshot' })] } }) });
  socket.onmessage({ data: JSON.stringify({ type: 'command_run', payload: row({ revision: 6, message: 'socket delta' }) }) });
  resolveHTTP(new Response(JSON.stringify({ command_runs: [row({ revision: 1, message: 'stale HTTP' })] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  }));
  await new Promise((resolve) => setTimeout(resolve, 0));
  const rendered = document.querySelector('[data-command-run-row]');
  assert.equal(rendered.getAttribute('data-row-revision'), '6');
  assert.match(rendered.textContent, /socket delta/);
  debugPanel.destroy();
  panelRegistry.unregister('command_runs');
});

test('Command Runs reconciliation owns one timer and stops after an authoritative terminal snapshot', async () => {
  resetCommandRunsState();
  window.history.replaceState({}, '', '/admin/debug-reconcile?panel=command_runs');
  document.body.innerHTML = `
    <div data-debug-status><span data-debug-connection></span></div>
    <nav data-debug-tabs></nav><section data-debug-filters></section>
    <main data-debug-console data-debug-panel data-debug-path="/admin/debug-reconcile" data-panels='["command_runs"]' data-repl-commands='[]'></main>
    <span data-debug-events></span><span data-debug-last></span>
  `;
  const originalSetTimeout = window.setTimeout;
  const originalClearTimeout = window.clearTimeout;
  const scheduled = new Map();
  let timerID = 100;
  window.setTimeout = (callback, delay) => {
    timerID += 1;
    scheduled.set(timerID, { callback, delay });
    return timerID;
  };
  window.clearTimeout = (id) => scheduled.delete(id);

  class ReconcileWebSocket {
    static OPEN = 1;
    static CONNECTING = 0;
    static instances = [];
    constructor() {
      this.readyState = ReconcileWebSocket.CONNECTING;
      this.sent = [];
      ReconcileWebSocket.instances.push(this);
      queueMicrotask(() => { this.readyState = ReconcileWebSocket.OPEN; this.onopen?.(); });
    }
    send(value) { this.sent.push(JSON.parse(value)); }
    close() {}
  }
  globalThis.WebSocket = ReconcileWebSocket;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith('/api/panels')) {
      return new Response(JSON.stringify({ panels: [serverDefinition()] }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.endsWith('/api/snapshot')) {
      return new Response(JSON.stringify({ command_runs: [row({ revision: 1, phase: 'running' })] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const debugPanel = initDebugPanel(document.querySelector('[data-debug-console]'));
  for (let attempt = 0; attempt < 8 && ReconcileWebSocket.instances.length === 0; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  const socket = ReconcileWebSocket.instances[0];
  socket.onmessage({ data: JSON.stringify({
    type: 'snapshot',
    payload: { command_runs: [row({ revision: 2, phase: 'running' })] },
  }) });
  const successTimer = [...scheduled.entries()].find(([, timer]) => timer.delay === 15000);
  assert.ok(successTimer, 'successful non-terminal reconciliation schedules one 15 second timer');
  assert.equal([...scheduled.values()].filter((timer) => timer.delay === 15000).length, 1);

  const snapshotsBefore = socket.sent.filter((command) => command.type === 'snapshot').length;
  scheduled.delete(successTimer[0]);
  successTimer[1].callback();
  assert.equal(socket.sent.filter((command) => command.type === 'snapshot').length, snapshotsBefore + 1);

  socket.onmessage({ data: JSON.stringify({
    type: 'snapshot',
    payload: { command_runs: [row({ revision: 3, phase: 'succeeded' })] },
  }) });
  assert.equal([...scheduled.values()].filter((timer) => timer.delay === 15000).length, 0);

  debugPanel.destroy();
  window.setTimeout = originalSetTimeout;
  window.clearTimeout = originalClearTimeout;
  panelRegistry.unregister('command_runs');
});

test('Command Runs reconciliation uses bounded failure backoff and cancels while hidden', async () => {
  resetCommandRunsState();
  window.history.replaceState({}, '', '/admin/debug-reconcile-backoff?panel=command_runs');
  document.body.innerHTML = `
    <div data-debug-status><span data-debug-connection></span></div>
    <nav data-debug-tabs></nav><section data-debug-filters></section>
    <main data-debug-console data-debug-panel data-debug-path="/admin/debug-reconcile-backoff" data-panels='["command_runs"]' data-repl-commands='[]'></main>
    <span data-debug-events></span><span data-debug-last></span>
  `;
  const originalSetTimeout = window.setTimeout;
  const originalClearTimeout = window.clearTimeout;
  const originalVisibility = document.visibilityState;
  const scheduled = new Map();
  let timerID = 200;
  window.setTimeout = (callback, delay) => {
    timerID += 1;
    scheduled.set(timerID, { callback, delay });
    return timerID;
  };
  window.clearTimeout = (id) => scheduled.delete(id);

  class BackoffWebSocket {
    static OPEN = 1;
    static CONNECTING = 0;
    static instances = [];
    constructor() {
      this.readyState = BackoffWebSocket.CONNECTING;
      this.sent = [];
      BackoffWebSocket.instances.push(this);
      queueMicrotask(() => { this.readyState = BackoffWebSocket.OPEN; this.onopen?.(); });
    }
    send(value) { this.sent.push(JSON.parse(value)); }
    close() {}
  }
  globalThis.WebSocket = BackoffWebSocket;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith('/api/panels')) {
      return new Response(JSON.stringify({ panels: [serverDefinition()] }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.endsWith('/api/snapshot')) {
      return new Response(JSON.stringify({ command_runs: [row({ revision: 1, phase: 'running' })] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const debugPanel = initDebugPanel(document.querySelector('[data-debug-console]'));
  try {
    for (let attempt = 0; attempt < 8 && BackoffWebSocket.instances.length === 0; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    const socket = BackoffWebSocket.instances[0];
    socket.onmessage({ data: JSON.stringify({
      type: 'snapshot',
      payload: { command_runs: [row({ revision: 2, phase: 'running' })] },
    }) });

    const successTimer = [...scheduled.entries()].find(([, timer]) => timer.delay === 15000);
    assert.ok(successTimer, 'running snapshot schedules the success interval');
    scheduled.delete(successTimer[0]);
    successTimer[1].callback();

    for (const expectedDelay of [5000, 10000, 20000, 40000, 60000, 60000]) {
      const timeout = [...scheduled.entries()].at(-1);
      assert.equal(timeout?.[1].delay, 10000, 'each in-flight snapshot owns one timeout');
      scheduled.delete(timeout[0]);
      timeout[1].callback();

      const retry = [...scheduled.entries()].at(-1);
      assert.equal(retry?.[1].delay, expectedDelay);
      scheduled.delete(retry[0]);
      retry[1].callback();
    }

    const activeRequestTimeout = [...scheduled.entries()].at(-1);
    assert.equal(activeRequestTimeout?.[1].delay, 10000);
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    assert.equal(scheduled.has(activeRequestTimeout[0]), false, 'hidden pages cancel reconciliation timers');
  } finally {
    debugPanel.destroy();
    window.setTimeout = originalSetTimeout;
    window.clearTimeout = originalClearTimeout;
    Object.defineProperty(document, 'visibilityState', { value: originalVisibility, configurable: true });
    panelRegistry.unregister('command_runs');
  }
});

test('destroyed DebugPanel removes lifecycle recovery and cannot schedule transport work', async () => {
  resetCommandRunsState();
  window.history.replaceState({}, '', '/admin/debug-destroy?panel=command_runs');
  document.body.innerHTML = `
    <div data-debug-status><span data-debug-connection></span></div>
    <nav data-debug-tabs></nav><section data-debug-filters></section>
    <main data-debug-console data-debug-panel data-debug-path="/admin/debug-destroy" data-panels='["command_runs"]' data-repl-commands='[]'></main>
    <span data-debug-events></span><span data-debug-last></span>
  `;
  const originalVisibility = document.visibilityState;
  class LifecycleWebSocket {
    static OPEN = 1;
    static CONNECTING = 0;
    static instances = [];
    constructor() {
      this.readyState = LifecycleWebSocket.CONNECTING;
      this.sent = [];
      LifecycleWebSocket.instances.push(this);
      queueMicrotask(() => {
        this.readyState = LifecycleWebSocket.OPEN;
        this.onopen?.();
      });
    }
    send(value) { this.sent.push(JSON.parse(value)); }
    close() { this.readyState = 3; }
  }
  globalThis.WebSocket = LifecycleWebSocket;
  let snapshotRequests = 0;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith('/api/panels')) {
      return new Response(JSON.stringify({ panels: [serverDefinition()] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (url.endsWith('/api/snapshot')) {
      snapshotRequests += 1;
      return new Response(JSON.stringify({
        command_runs: [row({ revision: 1, phase: 'running' })],
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const debugPanel = initDebugPanel(document.querySelector('[data-debug-console]'));
  try {
    for (let attempt = 0; attempt < 8 && LifecycleWebSocket.instances.length === 0; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
    debugPanel.destroy();
    const requestsAtDestroy = snapshotRequests;
    const socketsAtDestroy = LifecycleWebSocket.instances.length;
    const sentAtDestroy = LifecycleWebSocket.instances.reduce((total, socket) => total + socket.sent.length, 0);

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('pagehide'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(snapshotRequests, requestsAtDestroy);
    assert.equal(LifecycleWebSocket.instances.length, socketsAtDestroy);
    assert.equal(
      LifecycleWebSocket.instances.reduce((total, socket) => total + socket.sent.length, 0),
      sentAtDestroy,
    );
  } finally {
    debugPanel.destroy();
    Object.defineProperty(document, 'visibilityState', { value: originalVisibility, configurable: true });
    panelRegistry.unregister('command_runs');
  }
});
