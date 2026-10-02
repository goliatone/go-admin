import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditPanel,
  bootstrap,
  brokenPanel,
  event,
  identity,
  identityFor,
  operationRecord,
  operationsPanel,
  snapshot,
  targetsPanel,
} from './fixtures/console-inputs.mjs';

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');

const dom = new JSDOM('<!doctype html><html><head><meta name="csrf-token" content="csrf-1"></head><body></body></html>', {
  url: 'https://admin.example.test/admin/data',
});
const win = dom.window;
for (const name of [
  'window', 'document', 'Node', 'Element', 'HTMLElement', 'HTMLButtonElement', 'HTMLFormElement',
  'HTMLInputElement', 'HTMLSelectElement', 'HTMLTextAreaElement', 'HTMLScriptElement', 'Event',
  'CustomEvent', 'KeyboardEvent', 'MouseEvent', 'SubmitEvent',
]) {
  globalThis[name] = name === 'window' ? win : name === 'document' ? win.document : win[name];
}
globalThis.location = win.location;
for (const name of ['localStorage', 'sessionStorage']) {
  Object.defineProperty(globalThis, name, { value: win[name], configurable: true, writable: true });
}

class FakeSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances = [];

  constructor(url) {
    this.url = url;
    this.readyState = FakeSocket.CONNECTING;
    this.sent = [];
    FakeSocket.instances.push(this);
  }

  open() {
    this.readyState = FakeSocket.OPEN;
    this.onopen?.();
  }

  message(payload) {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }

  send(data) {
    this.sent.push(JSON.parse(data));
  }

  close(code = 1000) {
    if (this.readyState === FakeSocket.CLOSED) return;
    this.readyState = FakeSocket.CLOSED;
    this.onclose?.({ code });
  }
}

globalThis.WebSocket = FakeSocket;
win.WebSocket = FakeSocket;

let fetchCalls = [];
let fetchRoute = () => jsonResponse({}, 404);

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

globalThis.fetch = async (input, init = {}) => {
  const url = String(input);
  const headers = new Headers(init.headers || {});
  const call = { url, method: init.method || 'GET', body: init.body ? JSON.parse(init.body) : undefined, headers };
  fetchCalls.push(call);
  return fetchRoute(call);
};

const consoleModule = await import('../dist/console/index.js');
const { ConsoleRecordStore, mountConsole, getMountedConsole, createPanelRegistry } = consoleModule;

const settle = () => new Promise((resolve) => setTimeout(resolve, 30));

async function waitFor(assertion, timeoutMs = 1000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await settle();
    }
  }
  throw lastError;
}

function createRoot(payload, attributes = '') {
  const root = win.document.createElement('section');
  root.setAttribute('data-console-root', '');
  root.setAttribute('data-console-manual', '');
  for (const attribute of attributes.split(/\s+/).filter(Boolean)) root.setAttribute(attribute, '');
  root.innerHTML = `
    <div class="console-connection" data-console-status><span data-console-connection></span></div>
    <script type="application/json" data-console-bootstrap>${JSON.stringify(payload).replace(/</g, '\\u003c')}</script>
  `;
  win.document.body.appendChild(root);
  return root;
}

function resetEnvironment() {
  win.document.body.innerHTML = '';
  win.localStorage.clear();
  win.sessionStorage.clear();
  FakeSocket.instances = [];
  fetchCalls = [];
  fetchRoute = (call) => (call.url.endsWith('/api/snapshot') ? jsonResponse(snapshot()) : jsonResponse({}, 404));
}

function mount(payload = bootstrap(), options = {}) {
  const root = createRoot(payload);
  const runtime = mountConsole(root, { confirm: () => true, live: false, recoveryDelaysMs: [5], ...options });
  return { root, runtime };
}

function rowTexts(root) {
  return Array.from(root.querySelectorAll('[data-console-panel-body] tbody tr'))
    .map((row) => Array.from(row.cells).map((cell) => cell.textContent.trim()).join(' '));
}

test('record store applies contiguous events and rejects duplicates, stale revisions and foreign identities', () => {
  const store = new ConsoleRecordStore({ identity });
  assert.equal(store.applyEvent(event()), 'buffered', 'events before the first snapshot wait for it');
  const outcome = store.applySnapshot(snapshot());
  assert.deepEqual({ ok: outcome.ok, replayed: outcome.replayed, needsRecovery: outcome.needsRecovery }, { ok: true, replayed: 1, needsRecovery: false });
  assert.equal(store.watermark(), 22);
  assert.equal(store.records('operations')[0].data.state, 'succeeded');

  assert.equal(store.applyEvent(event()), 'duplicate');
  assert.equal(store.applyEvent(event({ sequence: 23, revision: 4 })), 'stale', 'an older or equal revision never overwrites');
  assert.equal(store.watermark(), 23, 'a rejected contiguous event still consumes its sequence');
  assert.equal(store.applyEvent(event({ sequence: 24, revision: 5, actor_id: 'operator-2' })), 'foreign');
  assert.equal(store.applyEvent(event({ sequence: 24, revision: 5, scope_key: 'other-org' })), 'foreign');
  assert.equal(store.applyEvent(event({ sequence: 24, revision: 5, panel_id: 'debug-sql' })), 'foreign', 'unauthorized panels are rejected');
  assert.equal(store.applyEvent(event({ sequence: 25, revision: 6, kind: 'delete', data: undefined })), 'applied');
  assert.deepEqual(store.records('operations'), []);
  assert.equal(store.applyEvent({ ...identity, sequence: 26 }), 'malformed');
});

test('record store rejects backward snapshots, retains recovery buffers and accepts equal-watermark policy removal', () => {
  const store = new ConsoleRecordStore({ identity, sequenceMode: 'contiguous' });
  store.applySnapshot(snapshot());
  store.applyEvent(event());
  assert.equal(store.watermark(), 22);
  assert.equal(store.applySnapshot(snapshot()).reason, 'stale');
  assert.equal(store.records('operations')[0].data.state, 'succeeded');
  assert.equal(store.watermark(), 22);
  store.beginRecovery();
  store.applyEvent(event({ sequence: 23, revision: 5, data: { state: 'archived' } }));
  assert.equal(store.applySnapshot(snapshot()).needsRecovery, true);
  const recovered = store.applySnapshot(snapshot({ watermark: 22 }));
  assert.equal(recovered.replayed, 1, 'stale snapshots must not consume the buffer');
  assert.equal(store.watermark(), 23);
  assert.equal(store.records('operations')[0].data.state, 'archived');
  assert.equal(store.applySnapshot(snapshot({ watermark: 23, panels: [] })).ok, true);
  assert.deepEqual(store.panelIds(), [], 'policy removals at the same cursor are authoritative');
});

test('record store rewinds for a new delivery sequence and can drop held events', () => {
  const store = new ConsoleRecordStore({ identity });
  store.applySnapshot(snapshot());
  store.applyEvent(event());
  store.beginRecovery();
  assert.equal(store.applyEvent(event({ sequence: 23, revision: 5, data: { id: 'op-1', name: 'Seed <baseline>', state: 'archived' } })), 'buffered');
  store.discardBuffered();
  assert.equal(store.applySnapshot(snapshot({ watermark: 2 })).reason, 'stale', 'a lower watermark is stale by default');
  const restarted = store.applySnapshot(snapshot({ watermark: 2 }), { rewind: true });
  assert.equal(restarted.ok, true);
  assert.equal(restarted.replayed, 0, 'events from the previous sequence are gone');
  assert.equal(store.watermark(), 2);
  assert.equal(store.records('operations')[0].data.state, 'running');
  assert.equal(store.applyEvent(event({ sequence: 3 })), 'applied');
  assert.equal(store.records('operations')[0].data.state, 'succeeded');
});

test('record store recovers gaps and invalidations and rejects old generations', () => {
  const monotonic = new ConsoleRecordStore({ identity });
  monotonic.applySnapshot(snapshot());
  assert.equal(monotonic.applyEvent(event({ sequence: 24 })), 'applied', 'host-filtered sequences may skip');

  const store = new ConsoleRecordStore({ identity, sequenceMode: 'contiguous' });
  store.applySnapshot(snapshot());
  assert.equal(store.applyEvent(event({ sequence: 24 })), 'gap', 'missed sequence 22 and 23');
  assert.equal(store.isRecovering(), true);
  assert.equal(store.applyEvent(event({ sequence: 25, revision: 6, data: { id: 'op-1', state: 'failed' } })), 'buffered');

  const replay = store.applySnapshot(snapshot({ watermark: 24, panels: [{ ...operationsPanel, records: [operationRecord({ revision: 5, data: { id: 'op-1', state: 'canceled' } })] }] }));
  assert.equal(replay.ok, true);
  assert.equal(replay.replayed, 1, 'only events newer than the watermark replay');
  assert.equal(replay.needsRecovery, false);
  assert.equal(store.records('operations')[0].data.state, 'failed');

  assert.equal(store.applyEvent({ ...identity, sequence: 26, kind: 'invalidate' }), 'invalidated');
  assert.equal(store.isRecovering(), true);
  store.applySnapshot(snapshot({ watermark: 30, panels: [{ ...operationsPanel, records: [operationRecord({ target_id: 'preview', generation: 2, revision: 9 })] }] }));
  assert.equal(store.applyEvent(event({ sequence: 31, revision: 10, target_id: 'preview', generation: 1 })), 'stale');
  assert.equal(store.applyEvent(event({ sequence: 32, revision: 10, target_id: 'preview', generation: 3 })), 'applied');

  assert.equal(store.applySnapshot(snapshot({ scope_key: 'other-org' })).reason, 'foreign');
  assert.equal(store.applySnapshot({ ...identity, watermark: 'x', panels: [] }).reason, 'malformed');
});

test('runtime renders authorized panels with escaped data, safe fallback, empty and read-only states', async () => {
  resetEnvironment();
  const { root, runtime } = mount();
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  assert.ok(root.classList.contains('console-root'));
  assert.deepEqual(runtime.getPanels(), ['operations', 'targets', 'audit', 'broken']);
  const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
  assert.deepEqual(tabs.map((tab) => tab.dataset.consoleTab), ['operations', 'targets', 'audit', 'broken']);
  assert.equal(tabs[0].getAttribute('aria-selected'), 'true');
  assert.equal(root.querySelector('[data-console-tab-count="operations"]').textContent, '1');
  assert.deepEqual(rowTexts(root), ['Seed <baseline> running']);
  assert.ok(root.querySelector('[data-console-panel-body]').innerHTML.includes('Seed &lt;baseline&gt;'));
  assert.ok(root.querySelector('form[data-panel-action-form][data-action-id="preview"]'));
  assert.ok(root.querySelector('.console-filter select[data-filter="state"]'), 'declared filters use the console vocabulary');
  assert.equal(root.querySelector('[class*="debug-"]'), null, 'no Debug class names leak into a neutral console');

  runtime.selectPanel('targets');
  assert.match(root.querySelector('[data-console-panel]').textContent, /No targets statuses available/);

  runtime.selectPanel('audit');
  assert.equal(root.querySelector('[data-console-panel] [data-panel-action], [data-console-panel] form'), null, 'read-only panel has no controls');
  assert.match(root.querySelector('[data-console-panel]').textContent, /Reset requested/);

  runtime.selectPanel('broken');
  const panel = root.querySelector('[data-console-panel]');
  assert.ok(panel.querySelector('[data-panel-degraded="broken"]'), 'unsupported schema degrades visibly');
  assert.equal(panel.querySelector('script'), null);
  assert.ok(panel.innerHTML.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(panel.querySelector('code[data-console-syntax="json"]'));
  runtime.destroy();
});

test('runtime posts declared actions to the resolved route and maps results and field errors', async () => {
  resetEnvironment();
  fetchRoute = (call) => {
    if (call.url.endsWith('/api/snapshot')) return jsonResponse(snapshot());
    if (call.url.includes('/actions/preview') && call.body?.dataset === 'baseline') {
      return jsonResponse({ ok: false, message: 'Validation failed', errors: { dataset: 'Dataset is locked' } });
    }
    return jsonResponse({ error: { code: 'FORBIDDEN', message: 'nope' } }, 403);
  };
  const { root, runtime } = mount();
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  const form = root.querySelector('form[data-panel-action-form]');
  const select = form.querySelector('select[data-action-field="dataset"]');
  select.value = 'baseline';
  form.dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true }));
  await waitFor(() => assert.match(root.querySelector('[data-panel-action-result="operations"]').textContent, /Validation failed/));
  const actionCall = fetchCalls.find((call) => call.method === 'POST');
  assert.equal(actionCall.url, '/admin/data/api/panels/operations/actions/preview');
  assert.deepEqual(actionCall.body, { dataset: 'baseline' });
  assert.equal(actionCall.headers.get('X-CSRF-Token'), 'csrf-1');
  const fieldError = form.querySelector('[data-action-field-error="dataset"]');
  assert.equal(fieldError.hidden, false);
  assert.equal(fieldError.textContent, 'Dataset is locked');

  // Undeclared actions are never dispatched; a 403 action keeps read access.
  const forged = win.document.createElement('button');
  forged.setAttribute('data-panel-action', '');
  forged.dataset.panelId = 'operations';
  forged.dataset.actionId = 'reset-production';
  root.querySelector('[data-console-panel-actions]').appendChild(forged);
  const posts = fetchCalls.filter((call) => call.method === 'POST').length;
  forged.click();
  await settle();
  assert.equal(fetchCalls.filter((call) => call.method === 'POST').length, posts);

  select.value = '';
  form.dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true }));
  await waitFor(() => assert.match(root.querySelector('[data-panel-action-result="operations"]').textContent, /not allowed/));
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  runtime.destroy();
});

test('two roots with the same panel id keep ids, records, events and preferences isolated', async () => {
  resetEnvironment();
  const other = identityFor({ actor_id: 'operator-2', scope_key: 'other-org' });
  fetchRoute = () => jsonResponse({}, 500);
  const first = mount(bootstrap(), { live: true });
  const second = mount(bootstrap({ identity: other }), { live: true });
  await waitFor(() => assert.equal(FakeSocket.instances.length, 2));
  assert.notEqual(first.runtime.registry, second.runtime.registry);
  assert.notEqual(first.runtime.idScope, second.runtime.idScope);
  const ids = Array.from(win.document.querySelectorAll('[id]')).map((element) => element.id);
  assert.equal(new Set(ids).size, ids.length, 'element ids never collide across roots');

  second.runtime.selectPanel('audit');
  assert.equal(first.runtime.getActivePanel(), 'operations');
  const keys = Object.keys(win.sessionStorage);
  assert.equal(keys.length, 1);
  assert.ok(keys[0].includes('operator-2') && keys[0].includes('other-org'), 'active panel persisted under the second identity only');

  fetchRoute = () => jsonResponse(snapshot());
  const [firstSocket, secondSocket] = FakeSocket.instances;
  firstSocket.open();
  firstSocket.message(snapshot());
  await waitFor(() => assert.equal(first.runtime.getState(), 'ready'));
  // An event for the first identity delivered to the second root is foreign.
  secondSocket.message(event());
  firstSocket.message(event());
  await waitFor(() => assert.deepEqual(rowTexts(first.root), ['Seed <baseline> succeeded']));
  second.runtime.selectPanel('operations');
  assert.deepEqual(rowTexts(second.root), ['Seed <baseline> running']);
  first.runtime.destroy();
  second.runtime.destroy();
});

test('live stream selects authorized panels, applies host snapshots and events, and waits for invalidation snapshots', async () => {
  resetEnvironment();
  const { root, runtime } = mount(bootstrap(), { live: true, snapshotWaitMs: 200 });
  await waitFor(() => assert.equal(FakeSocket.instances.length, 1));
  const socket = FakeSocket.instances[0];
  assert.equal(socket.url, 'wss://admin.example.test/admin/data/ws?panels=operations%2Ctargets%2Caudit%2Cbroken');
  const before = fetchCalls.length;
  socket.open();
  await waitFor(() => assert.equal(runtime.getConnectionState(), 'connected'));
  assert.equal(root.dataset.consoleSync, 'recovering', 'events wait for the host snapshot');
  socket.message(event());
  socket.message(snapshot());
  await waitFor(() => assert.deepEqual(rowTexts(root), ['Seed <baseline> succeeded'], 'the event after the watermark replays'));
  assert.equal(root.dataset.consoleSync, 'current');
  assert.deepEqual(socket.sent, [], 'selection travels in the URL, not as commands');

  socket.message(event({ sequence: 29, revision: 6, data: { id: 'op-1', name: 'Seed <baseline>', state: 'verified' } }));
  await waitFor(() => assert.deepEqual(rowTexts(root), ['Seed <baseline> verified'], 'host-filtered sequence gaps are benign'));

  socket.message({ ...identity, panel_id: '', record_key: '', revision: 0, sequence: 30, kind: 'invalidate' });
  socket.message(event({ sequence: 31, revision: 8, data: { id: 'op-1', name: 'Seed <baseline>', state: 'archived' } }));
  await settle();
  assert.deepEqual(rowTexts(root), ['Seed <baseline> verified'], 'held until the invalidation snapshot');
  socket.message(snapshot({ watermark: 30, panels: [{ ...operationsPanel, records: [operationRecord({ revision: 7, data: { id: 'op-1', name: 'Seed <baseline>', state: 'reset' } })] }] }));
  await waitFor(() => assert.deepEqual(rowTexts(root), ['Seed <baseline> archived']));
  const narrowed = FakeSocket.instances.at(-1);
  assert.notEqual(narrowed, socket, 'authorized panel removals reconcile the selection');
  narrowed.open();
  narrowed.message(snapshot({ watermark: 31, panels: [{ ...operationsPanel, records: [operationRecord({ revision: 8, data: { id: 'op-1', name: 'Seed <baseline>', state: 'archived' } })] }] }));
  assert.equal(fetchCalls.length, before, 'host snapshots need no HTTP recovery');

  fetchRoute = () => jsonResponse(snapshot({ watermark: 32, panels: [{ ...operationsPanel, records: [operationRecord({ revision: 8, data: { id: 'op-1', name: 'Seed <baseline>', state: 'archived' } })] }] }));
  narrowed.message({ ...identity, panel_id: '', record_key: '', revision: 0, sequence: 32, kind: 'invalidate' });
  await waitFor(() => assert.equal(fetchCalls.length, before + 1, 'a missing host snapshot falls back to HTTP'));
  runtime.destroy();
});

test('newer live state supersedes a delayed HTTP recovery response', async () => {
  resetEnvironment();
  const { root, runtime } = mount(bootstrap(), { live: true });
  const socket = FakeSocket.instances[0];
  socket.open();
  socket.message(snapshot());
  let respond;
  fetchRoute = () => new Promise((resolve) => { respond = resolve; });
  const recovery = runtime.refresh();
  await waitFor(() => assert.ok(respond));
  socket.message(snapshot());
  socket.message(event());
  await waitFor(() => assert.deepEqual(rowTexts(root), ['Seed <baseline> succeeded']));
  respond(jsonResponse(snapshot()));
  await recovery;
  await settle();
  assert.deepEqual(rowTexts(root), ['Seed <baseline> succeeded']);
  assert.equal(root.dataset.consoleSync, 'current');
  runtime.destroy();
});

test('same-watermark live policy removals supersede delayed HTTP snapshots', async () => {
  resetEnvironment();
  const { runtime } = mount(bootstrap(), { live: true });
  const socket = FakeSocket.instances[0];
  socket.open();
  socket.message(snapshot());
  let respond;
  fetchRoute = () => new Promise((resolve) => { respond = resolve; });
  const recovery = runtime.refresh();
  await waitFor(() => assert.ok(respond));
  socket.message(snapshot({ panels: [] }));
  assert.deepEqual(runtime.getPanels(), []);
  respond(jsonResponse(snapshot()));
  await recovery;
  assert.deepEqual(runtime.getPanels(), [], 'old HTTP data cannot restore denied panels');
  runtime.destroy();
});

test('invalidation supersedes in-flight HTTP recovery until an authoritative live snapshot arrives', async () => {
  resetEnvironment();
  const { root, runtime } = mount(bootstrap(), { live: true, snapshotWaitMs: 60000 });
  const socket = FakeSocket.instances[0];
  socket.open();
  socket.message(snapshot());
  let respond;
  fetchRoute = () => new Promise((resolve) => { respond = resolve; });
  const recovery = runtime.refresh();
  await waitFor(() => assert.ok(respond));
  socket.message(event({ kind: 'invalidate', sequence: 22 }));
  socket.message(event({ sequence: 23, revision: 5 }));
  respond(jsonResponse(snapshot()));
  await recovery;
  assert.equal(root.dataset.consoleSync, 'recovering');
  socket.message(snapshot({ watermark: 22 }));
  await waitFor(() => assert.deepEqual(rowTexts(root), ['Seed <baseline> succeeded']));
  assert.equal(root.dataset.consoleSync, 'current');
  runtime.destroy();
});

test('a refresh requested after live supersession still gets its own current HTTP snapshot', async () => {
  resetEnvironment();
  const { runtime } = mount(bootstrap(), { live: true });
  const socket = FakeSocket.instances[0];
  socket.open();
  socket.message(snapshot());
  let respond;
  let requests = 0;
  fetchRoute = () => {
    requests += 1;
    return requests === 1 ? new Promise((resolve) => { respond = resolve; }) : jsonResponse(snapshot({ panels: [] }));
  };
  const first = runtime.refresh();
  await waitFor(() => assert.ok(respond));
  socket.message(snapshot());
  const second = runtime.refresh();
  respond(jsonResponse(snapshot()));
  await Promise.all([first, second]);
  assert.equal(requests, 2);
  assert.deepEqual(runtime.getPanels(), []);
  runtime.destroy();
});

test('late snapshots widen live selection, keep mounted forms and refresh revives stopped delivery', async () => {
  resetEnvironment();
  fetchRoute = () => jsonResponse({}, 503);
  const { root, runtime } = mount(bootstrap({ snapshot: undefined }), {
    live: true,
    recoveryDelaysMs: [60000],
    snapshotWaitMs: 60000,
    liveOptions: { maxReconnectAttempts: 0, maxInitialReconnectAttempts: 0 },
  });
  await waitFor(() => assert.equal(FakeSocket.instances.length, 1));
  assert.match(FakeSocket.instances[0].url, /\?panels=$/, 'nothing selected before an authorized snapshot');
  FakeSocket.instances[0].open();
  FakeSocket.instances[0].message(snapshot());
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  await waitFor(() => assert.equal(FakeSocket.instances.length, 2, 'newly authorized panels reconnect the selection'));
  assert.equal(FakeSocket.instances[0].readyState, FakeSocket.CLOSED);
  const socket = FakeSocket.instances[1];
  assert.match(socket.url, /panels=operations%2Ctargets%2Caudit%2Cbroken$/);
  socket.open();
  socket.message(snapshot());

  fetchRoute = () => jsonResponse(snapshot());
  const select = root.querySelector('select[data-action-field="dataset"]');
  select.value = 'baseline';
  await runtime.refresh();
  assert.equal(root.querySelector('select[data-action-field="dataset"]'), select, 'an unchanged definition keeps the mounted form');
  assert.equal(select.value, 'baseline');

  const changed = snapshot({
    panels: [{ ...operationsPanel, ui: { ...operationsPanel.ui, actions: [{ id: 'cancel', label: 'Cancel run' }] }, records: [operationRecord()] }],
  });
  fetchRoute = () => jsonResponse(changed);
  await runtime.refresh();
  assert.equal(root.querySelector('form[data-panel-action-form]'), null, 'a changed definition rebuilds the controls');
  assert.ok(root.querySelector('[data-panel-action][data-action-id="cancel"]'));
  assert.equal(FakeSocket.instances.length, 3, 'removed panels reconcile the requested selection');
  const narrowed = FakeSocket.instances[2];
  assert.match(narrowed.url, /panels=operations$/);
  narrowed.open();
  narrowed.message(changed);

  narrowed.close(1006);
  await waitFor(() => assert.equal(runtime.getConnectionState(), 'disconnected'));
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  await runtime.refresh();
  await waitFor(() => assert.equal(FakeSocket.instances.length, 4, 'refresh reconnects stopped live delivery'));
  runtime.destroy();
});

test('revoke and regrant reconciles live selection and resumes subsequent events', async () => {
  resetEnvironment();
  const granted = snapshot({ panels: [{ ...operationsPanel, records: [operationRecord()] }] });
  const denied = snapshot({ panels: [] });
  const { root, runtime } = mount(bootstrap({ snapshot: granted }), { live: true });
  const first = FakeSocket.instances[0];
  first.open();
  first.message(granted);
  first.message(denied);
  assert.deepEqual(runtime.getPanels(), []);
  assert.equal(first.readyState, FakeSocket.CLOSED);
  const empty = FakeSocket.instances[1];
  assert.match(empty.url, /panels=$/);
  first.message(event());
  assert.deepEqual(runtime.getPanels(), [], 'queued frames from the old connection stay fenced');
  empty.open();
  empty.message(denied);
  empty.message(granted);
  assert.equal(empty.readyState, FakeSocket.CLOSED);
  const restored = FakeSocket.instances[2];
  assert.match(restored.url, /panels=operations$/);
  restored.open();
  restored.message(granted);
  restored.message(event());
  await waitFor(() => assert.deepEqual(rowTexts(root), ['Seed <baseline> succeeded']));
  assert.equal(fetchCalls.length, 0, 'live policy snapshots and re-selection recover without polling');
  runtime.destroy();
});

test('tabs, the default panel and live selection follow declared panel order', async () => {
  resetEnvironment();
  // Hosts list panels by ID. Declared order decides presentation, an unset
  // order ranks as 100 and snapshot order breaks ties.
  const ordered = snapshot({ panels: [
    { ...auditPanel, order: 30, records: [] },
    { ...brokenPanel, records: [] },
    { ...operationsPanel, order: 10, records: [operationRecord()] },
    { ...targetsPanel, order: 30, records: [] },
  ] });
  const { root, runtime } = mount(bootstrap({ snapshot: ordered }), { live: true });
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  const expected = ['operations', 'audit', 'targets', 'broken'];
  assert.deepEqual(runtime.getPanels(), expected);
  assert.deepEqual(Array.from(root.querySelectorAll('[data-console-tab]'), (tab) => tab.dataset.consoleTab), expected);
  assert.equal(runtime.getActivePanel(), 'operations', 'the lowest declared order opens first');
  assert.equal(new URL(FakeSocket.instances[0].url).searchParams.get('panels'), expected.join(','));
  runtime.destroy();
});

test('a restarted host restarts the sequence: the next connection rewinds the cursor and drops held events', async () => {
  resetEnvironment();
  const { root, runtime } = mount(bootstrap(), {
    live: true,
    snapshotWaitMs: 60000,
    liveOptions: { reconnectDelayMs: 5, maxReconnectDelayMs: 5 },
  });
  const before = FakeSocket.instances[0];
  before.open();
  before.message(snapshot());
  before.message(event());
  await waitFor(() => assert.deepEqual(rowTexts(root), ['Seed <baseline> succeeded']));
  // Events held for an invalidation snapshot that never comes: the host dies.
  before.message({ ...identity, panel_id: '', record_key: '', revision: 0, sequence: 23, kind: 'invalidate' });
  before.message(event({ sequence: 24, revision: 9, data: { id: 'op-1', name: 'Seed <baseline>', state: 'pre-restart' } }));
  before.close(1006);
  await waitFor(() => assert.equal(FakeSocket.instances.length, 2, 'the stream reconnects after an outage'));

  const after = FakeSocket.instances[1];
  after.open();
  const restarted = snapshot({ watermark: 2 });
  restarted.panels[0].records = [operationRecord({ revision: 1, data: { id: 'op-1', name: 'Seed <baseline>', state: 'restarted' } })];
  after.message(restarted);
  await waitFor(() => assert.deepEqual(rowTexts(root), ['Seed <baseline> restarted'], 'the first frame of the new sequence is authoritative'));
  assert.equal(root.dataset.consoleSync, 'current');
  after.message(event({ sequence: 3, revision: 2, data: { id: 'op-1', name: 'Seed <baseline>', state: 'verified' } }));
  await waitFor(() => assert.deepEqual(rowTexts(root), ['Seed <baseline> verified'], 'events of the new sequence apply'));
  after.message(snapshot({ watermark: 1 }));
  await settle();
  assert.deepEqual(rowTexts(root), ['Seed <baseline> verified'], 'later frames on the same socket cannot rewind');
  assert.equal(fetchCalls.length, 0, 'no HTTP recovery loop');
  assert.ok(!/out of sync/i.test(root.textContent));
  runtime.destroy();
});

test('without live delivery a poll after a host restart replaces the cursor', async () => {
  resetEnvironment();
  const { root, runtime } = mount(bootstrap());
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  fetchRoute = () => jsonResponse(snapshot({ watermark: 2, panels: [{ ...operationsPanel, records: [operationRecord({ revision: 1, data: { id: 'op-1', name: 'Seed <baseline>', state: 'restarted' } })] }] }));
  await runtime.refresh();
  assert.deepEqual(rowTexts(root), ['Seed <baseline> restarted']);
  assert.equal(fetchCalls.length, 1);
  runtime.destroy();
});

test('revoked or expired access clears records, closes the stream and stops reconnecting', async () => {
  resetEnvironment();
  const { root, runtime } = mount(bootstrap(), { live: true });
  await waitFor(() => assert.equal(FakeSocket.instances.length, 1));
  const socket = FakeSocket.instances[0];
  socket.open();
  await waitFor(() => assert.equal(runtime.getConnectionState(), 'connected'));
  runtime.selectPanel('audit');
  assert.ok(Object.keys(win.sessionStorage).length > 0);

  fetchRoute = () => jsonResponse({ error: { code: 'FORBIDDEN', message: 'revoked' } }, 403);
  socket.close(4403);
  await waitFor(() => assert.equal(runtime.getState(), 'denied'));
  assert.equal(root.dataset.consoleState, 'denied');
  assert.deepEqual(runtime.getPanels(), []);
  assert.equal(root.querySelector('[data-console-tabs]').hidden, true);
  assert.equal(root.querySelector('[data-console-panel]').textContent.trim(), '');
  assert.match(root.querySelector('[data-console-notice]').textContent, /do not have access/);
  assert.ok(root.querySelector('[data-console-action="reload"]'));
  assert.equal(Object.keys(win.sessionStorage).length, 0, 'identity-bound preferences are cleared');
  await settle();
  assert.equal(FakeSocket.instances.length, 1, 'a policy close never reconnects');

  resetEnvironment();
  const outage = mount(bootstrap(), { live: true, liveOptions: { maxReconnectAttempts: 0, maxInitialReconnectAttempts: 0 } });
  await waitFor(() => assert.equal(FakeSocket.instances.length, 1));
  fetchRoute = () => jsonResponse({ error: { code: 'FORBIDDEN' } }, 403);
  FakeSocket.instances[0].close(1006);
  await waitFor(() => assert.equal(outage.runtime.getState(), 'denied', 'exhausted retries verify access over HTTP'));

  resetEnvironment();
  fetchRoute = () => jsonResponse({ error: { code: 'UNAUTHORIZED' } }, 401);
  const expired = mount(bootstrap({ snapshot: undefined }));
  await waitFor(() => assert.equal(expired.runtime.getState(), 'denied'));
  assert.match(expired.root.querySelector('[data-console-notice]').textContent, /session expired/);
});

test('disposed hosts release sockets, listeners and pending work', async () => {
  resetEnvironment();
  const { root, runtime } = mount(bootstrap(), { live: true });
  await waitFor(() => assert.equal(FakeSocket.instances.length, 1));
  const socket = FakeSocket.instances[0];
  socket.open();
  await waitFor(() => assert.equal(runtime.getConnectionState(), 'connected'));
  runtime.destroy();
  assert.equal(socket.readyState, FakeSocket.CLOSED);
  assert.equal(root.dataset.consoleState, 'disposed');
  assert.equal(getMountedConsole(root), null);
  const calls = fetchCalls.length;
  const html = root.innerHTML;
  socket.message(event());
  root.querySelector('[data-console-tab="audit"]').click();
  await settle();
  assert.equal(root.innerHTML, html, 'no rendering after disposal');
  assert.equal(fetchCalls.length, calls);
  runtime.destroy();

  const remounted = mountConsole(root, { live: false });
  assert.ok(remounted && remounted !== runtime, 'a disposed root can mount a fresh console');
  remounted.destroy();
});

test('storage failures and tab keyboard navigation do not break the console', async () => {
  resetEnvironment();
  const throwing = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
    removeItem() { throw new Error('blocked'); },
    key() { throw new Error('blocked'); },
    get length() { throw new Error('blocked'); },
  };
  const { root, runtime } = mount(bootstrap(), { storage: { local: throwing, session: throwing } });
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  const first = root.querySelector('[data-console-tab="operations"]');
  first.focus();
  first.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.equal(runtime.getActivePanel(), 'targets');
  assert.equal(win.document.activeElement, root.querySelector('[data-console-tab="targets"]'));
  assert.equal(root.querySelector('[data-console-tab="targets"]').getAttribute('tabindex'), '0');
  assert.equal(root.querySelector('[data-console-tab="operations"]').getAttribute('tabindex'), '-1');
  root.querySelector('[data-console-tab="targets"]').dispatchEvent(new win.KeyboardEvent('keydown', { key: 'End', bubbles: true }));
  assert.equal(runtime.getActivePanel(), 'broken');
  assert.equal(root.querySelector('[data-console-panel]').getAttribute('aria-labelledby'), `${runtime.idScope}-tab-broken`);
  runtime.destroy();
});

test('extension renderers stay instance-scoped and client definitions take precedence', async () => {
  resetEnvironment();
  const { root, runtime } = mount(bootstrap(), {
    renderers: { audit: ({ data }) => `<p data-custom-audit>${Array.isArray(data) ? data.length : 0} audit rows</p>` },
    panels: [{ id: 'targets', label: 'Targets (custom)', render: () => '<p data-custom-targets>custom</p>' }],
  });
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  runtime.selectPanel('audit');
  assert.ok(root.querySelector('[data-custom-audit]'));
  runtime.selectPanel('targets');
  assert.ok(root.querySelector('[data-custom-targets]'));
  assert.equal(root.querySelector('[data-console-tab="targets"] .console-tab__label').textContent, 'Targets (custom)');
  assert.equal(createPanelRegistry().has('audit'), false, 'registries are never shared');
  runtime.destroy();
});

test('Go-generated wire golden mounts, applies live frames and renders widget payloads', async () => {
  resetEnvironment();
  const golden = JSON.parse(fs.readFileSync(path.resolve(dist, '../tests/fixtures/console-contract.json'), 'utf8'));
  fetchRoute = (call) => (call.url === golden.bootstrap.urls.snapshot ? jsonResponse(golden.bootstrap.snapshot) : jsonResponse({}, 404));
  const { root, runtime } = mount(golden.bootstrap, { live: true, snapshotWaitMs: 60000 });
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  assert.deepEqual(runtime.getPanels(), ['operations', 'targets', 'audit']);
  await waitFor(() => assert.equal(FakeSocket.instances.length, 1));
  const socket = FakeSocket.instances[0];
  assert.equal(socket.url, 'wss://admin.example.test/fixture/data/ws?panels=operations%2Ctargets%2Caudit');
  socket.open();
  socket.message(golden.bootstrap.snapshot);
  socket.message(golden.upsert);
  await waitFor(() => assert.deepEqual(rowTexts(root), ['Seed <baseline> succeeded']));
  socket.message(golden.invalidate);
  await settle();
  assert.equal(root.dataset.consoleSync, 'recovering', 'a Go invalidation waits for the next snapshot');

  const form = root.querySelector('form[data-panel-action-form]');
  form.querySelector('select[data-action-field="dataset"]').value = 'baseline';
  fetchRoute = (call) => (call.method === 'POST' ? jsonResponse({ ok: true, message: 'Queued' }) : jsonResponse(golden.bootstrap.snapshot));
  form.dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true }));
  await waitFor(() => assert.ok(fetchCalls.some((call) => call.method === 'POST')));
  assert.equal(fetchCalls.find((call) => call.method === 'POST').url, '/fixture/data/api/panels/operations/actions/preview', 'Go route templates resolve with encoded IDs');
  runtime.destroy();

  const widgetRoot = createRoot({}, 'data-console-display');
  widgetRoot.querySelector('script').remove();
  widgetRoot.insertAdjacentHTML('beforeend', `<script type="application/json" data-console-widget>${JSON.stringify(golden.widget).replace(/</g, '\\u003c')}</script>`);
  const widget = mountConsole(widgetRoot);
  await waitFor(() => assert.equal(widget.getState(), 'ready'));
  assert.match(widgetRoot.querySelector('[data-console-panel]').textContent, /Seed <baseline>/);
  assert.equal(widgetRoot.querySelector('form'), null);
  widget.destroy();
});

test('console bundle carries no Debug runtime and Debug facades keep their contracts', async () => {
  const closure = new Set();
  const pending = [path.resolve(dist, 'console/index.js')];
  while (pending.length > 0) {
    const file = pending.pop();
    if (closure.has(file)) continue;
    closure.add(file);
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/\b(?:import|export)\s+(?:[^"'()]*?\s+from\s*)?["']([^"']+)["']/g)) {
      if (match[1].startsWith('.')) pending.push(path.resolve(path.dirname(file), match[1]));
    }
    assert.doesNotMatch(source, /__go_admin_panel_registry__|data-debug-console|debug-session-banner|command_runs|xterm|jsonpath|prism/i, path.relative(dist, file));
  }

  const helpers = await import('../dist/debug/shared-helpers.js');
  for (const name of ['panelRegistry', 'panelDefinitionFromServer', 'hydrateServerPanelDefinitions', 'fetchServerPanelDefinitions', 'registerServerPanelConsoleRenderer']) {
    assert.equal(typeof helpers[name] === 'function' || typeof helpers[name] === 'object', true, name);
  }
  assert.equal(globalThis.__go_admin_panel_registry__, helpers.panelRegistry, 'Debug keeps its legacy singleton');
  assert.notEqual(createPanelRegistry(), helpers.panelRegistry);

  const commandRuns = helpers.panelDefinitionFromServer({
    id: 'command_runs',
    label: 'Command runs',
    ui: {
      schema_version: '1',
      views: { console: { renderer: 'table' } },
      events: { mode: 'upsert', key: 'run_id' },
      filters: [{ id: 'state', label: 'State', kind: 'select', bind: 'phase' }],
    },
  });
  assert.equal(commandRuns.liveList.updateMode, 'upsert');
  assert.equal(commandRuns.showFilters, true, 'command runs keep their declared filters');
  const debugFilters = helpers.panelDefinitionFromServer({ ...auditPanel, ui: { ...auditPanel.ui, filters: [{ id: 'q', kind: 'search', label: 'Search' }] } }).renderFilters({});
  assert.match(debugFilters, /debug-filter/, 'Debug-hydrated filters keep Debug classes');
  const debugAction = helpers.panelDefinitionFromServer(operationsPanel).render([], { ...(await import('../dist/debug/index.js')).consoleStyles });
  assert.match(debugAction, /id="debug-action-operations-preview-dataset-0"/, 'Debug field ids are unchanged');
  assert.equal(targetsPanel.id, 'targets');
});
