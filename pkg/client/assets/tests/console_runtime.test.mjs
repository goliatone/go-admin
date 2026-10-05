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
  urls,
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

// Every live URL advertises the implemented workflow capabilities (DESIGN, frozen handshake).
const LIVE_CAPABILITIES = 'capabilities=action_availability.v1%2Caction_drawer.v1%2Crequest_id.v1%2Crich_views.v1%2Csecondary_submit.v1';

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
  assert.equal(socket.url, `wss://admin.example.test/admin/data/ws?panels=operations%2Ctargets%2Caudit%2Cbroken&${LIVE_CAPABILITIES}`);
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
  assert.equal(new URL(FakeSocket.instances[0].url).searchParams.get('panels'), '', 'nothing selected before an authorized snapshot');
  FakeSocket.instances[0].open();
  FakeSocket.instances[0].message(snapshot());
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  await waitFor(() => assert.equal(FakeSocket.instances.length, 2, 'newly authorized panels reconnect the selection'));
  assert.equal(FakeSocket.instances[0].readyState, FakeSocket.CLOSED);
  const socket = FakeSocket.instances[1];
  assert.ok(socket.url.endsWith(`panels=operations%2Ctargets%2Caudit%2Cbroken&${LIVE_CAPABILITIES}`));
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
  assert.equal(new URL(narrowed.url).searchParams.get('panels'), 'operations');
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
  assert.equal(new URL(empty.url).searchParams.get('panels'), '');
  first.message(event());
  assert.deepEqual(runtime.getPanels(), [], 'queued frames from the old connection stay fenced');
  empty.open();
  empty.message(denied);
  empty.message(granted);
  assert.equal(empty.readyState, FakeSocket.CLOSED);
  const restored = FakeSocket.instances[2];
  assert.equal(new URL(restored.url).searchParams.get('panels'), 'operations');
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
  assert.equal(fetchCalls.length, 1, 'one access check, with no HTTP recovery loop');
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

// Page header controls rendered by resources/console/base.html outside the root.
function pageControls(forId) {
  const group = win.document.createElement('div');
  group.className = 'console-page-actions';
  group.setAttribute('data-console-page-actions', '');
  group.setAttribute('data-console-for', forId);
  group.innerHTML = `
    <span class="console-connection" data-console-status data-status="offline"><span class="console-connection__dot"></span><span data-console-connection>Not live</span></span>
    <button type="button" class="console-btn" data-console-action="refresh" disabled><span>Refresh</span></button>
  `;
  win.document.body.appendChild(group);
  return group;
}

function pageRoot(payload, id, attributes = '') {
  const root = win.document.createElement('section');
  root.setAttribute('data-console-root', '');
  root.setAttribute('data-console-manual', '');
  if (id) root.id = id;
  for (const attribute of attributes.split(/\s+/).filter(Boolean)) root.setAttribute(attribute, '');
  root.innerHTML = `<script type="application/json" data-console-bootstrap>${JSON.stringify(payload).replace(/</g, '\\u003c')}</script>`;
  win.document.body.appendChild(root);
  return root;
}

const snapshotGets = (prefix) => fetchCalls.filter((call) => call.method === 'GET' && call.url === `${prefix}/api/snapshot`).length;

test('page header live status and Refresh bind to their own root by DOM id', async () => {
  resetEnvironment();
  const firstGroup = pageControls('console-data-a');
  const secondGroup = pageControls('console-data-b');
  const firstRoot = pageRoot(bootstrap(), 'console-data-a');
  const otherUrls = { ...urls, snapshot: '/admin/data-b/api/snapshot', live: '/admin/data-b/ws' };
  const secondRoot = pageRoot(bootstrap({ urls: otherUrls }), 'console-data-b');
  const first = mountConsole(firstRoot, { live: true, recoveryDelaysMs: [5] });
  const second = mountConsole(secondRoot, { live: true, recoveryDelaysMs: [5] });
  await waitFor(() => assert.equal(FakeSocket.instances.length, 2));
  assert.equal(first.identity.console_id, second.identity.console_id, 'both instances share console id "data"');
  assert.equal(firstRoot.dataset.consoleControls, 'page');
  assert.equal(secondRoot.dataset.consoleControls, 'page');
  const firstRefresh = firstGroup.querySelector('[data-console-action="refresh"]');
  const secondRefresh = secondGroup.querySelector('[data-console-action="refresh"]');
  assert.equal(firstRefresh.disabled, false, 'a bound Refresh is enabled');
  assert.equal(secondRefresh.disabled, false);

  const [firstSocket] = FakeSocket.instances;
  firstSocket.open();
  firstSocket.message(snapshot());
  await waitFor(() => assert.equal(firstGroup.querySelector('[data-console-connection]').textContent, 'Live'));
  assert.equal(firstGroup.querySelector('[data-console-status]').dataset.status, 'connected');
  assert.notEqual(secondGroup.querySelector('[data-console-connection]').textContent, 'Live', 'live state is per instance');

  firstRefresh.click();
  await waitFor(() => assert.equal(snapshotGets('/admin/data'), 1));
  assert.equal(snapshotGets('/admin/data-b'), 0, 'one header never refreshes another instance');
  secondRefresh.click();
  await waitFor(() => assert.equal(snapshotGets('/admin/data-b'), 1));
  assert.equal(snapshotGets('/admin/data'), 1);

  first.destroy();
  assert.equal(firstRefresh.disabled, true, 'disposal disables the bound Refresh');
  assert.equal(firstGroup.querySelector('[data-console-connection]').textContent, 'Not live');
  assert.equal(firstGroup.querySelector('[data-console-status]').dataset.status, 'offline');
  firstRefresh.disabled = false;
  firstRefresh.click();
  await settle();
  assert.equal(snapshotGets('/admin/data'), 1, 'disposal releases the header listener');
  secondRefresh.click();
  await waitFor(() => assert.equal(snapshotGets('/admin/data-b'), 2, 'the other instance keeps its binding'));

  firstRefresh.disabled = true;
  const remounted = mountConsole(firstRoot, { live: false, recoveryDelaysMs: [5] });
  assert.equal(firstRoot.dataset.consoleControls, 'page', 'a released group binds again on remount');
  assert.equal(firstRefresh.disabled, false);
  remounted.destroy();
  second.destroy();
});

test('ambiguous or foreign page header bindings bind nothing', async () => {
  resetEnvironment();
  const duplicates = [pageControls('console-twice'), pageControls('console-twice')];
  const doubled = pageRoot(bootstrap(), 'console-twice');
  const doubledRuntime = mountConsole(doubled, { live: false });
  assert.equal(doubled.dataset.consoleControls, 'ambiguous', 'two groups for one root are rejected');
  duplicates.forEach((group) => {
    assert.equal(group.querySelector('[data-console-action="refresh"]').disabled, true);
    group.querySelector('[data-console-action="refresh"]').disabled = false;
    group.querySelector('[data-console-action="refresh"]').click();
  });
  await settle();
  assert.equal(snapshotGets('/admin/data'), 0, 'unbound controls dispatch nothing');
  doubledRuntime.destroy();

  resetEnvironment();
  const shared = pageControls('console-same');
  const left = pageRoot(bootstrap(), 'console-same');
  const right = pageRoot(bootstrap(), 'console-same');
  const leftRuntime = mountConsole(left, { live: false });
  const rightRuntime = mountConsole(right, { live: false });
  assert.equal(left.dataset.consoleControls, 'ambiguous', 'a duplicated root id never binds');
  assert.equal(right.dataset.consoleControls, 'ambiguous');
  assert.equal(shared.querySelector('[data-console-action="refresh"]').disabled, true);
  leftRuntime.destroy();
  rightRuntime.destroy();

  resetEnvironment();
  const anonymous = pageRoot(bootstrap(), '');
  pageControls('');
  const anonymousRuntime = mountConsole(anonymous, { live: false });
  assert.equal(anonymous.dataset.consoleControls, 'none', 'a root without an id binds nothing');
  anonymousRuntime.destroy();

  resetEnvironment();
  const host = pageRoot(bootstrap(), 'console-host');
  const nested = pageControls('console-guest');
  host.appendChild(nested);
  const guest = pageRoot(bootstrap(), 'console-guest');
  const hostRuntime = mountConsole(host, { live: false });
  const guestRuntime = mountConsole(guest, { live: false });
  assert.equal(guest.dataset.consoleControls, 'none', 'groups inside another console root are ignored');
  hostRuntime.destroy();
  guestRuntime.destroy();
});

test('in-root controls take precedence and display widgets never bind header controls', async () => {
  resetEnvironment();
  const group = pageControls('console-inline');
  const root = pageRoot(bootstrap(), 'console-inline');
  root.insertAdjacentHTML('afterbegin', '<div class="console-header"><span class="console-connection" data-console-status data-status="offline"><span data-console-connection>Not live</span></span><button type="button" class="console-btn" data-console-action="refresh">Refresh</button></div>');
  const runtime = mountConsole(root, { live: false, recoveryDelaysMs: [5] });
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  assert.equal(root.dataset.consoleControls, 'root');
  assert.equal(group.querySelector('[data-console-action="refresh"]').disabled, true, 'the page group stays unbound');
  root.querySelector('[data-console-action="refresh"]').click();
  await waitFor(() => assert.equal(snapshotGets('/admin/data'), 1, 'the in-root Refresh drives this instance'));
  runtime.destroy();
  assert.equal(root.querySelector('[data-console-action="refresh"]').disabled, true, 'disposal disables in-root Refresh too');

  resetEnvironment();
  const widgetGroup = pageControls('console-widget');
  const widget = pageRoot({}, 'console-widget', 'data-console-display');
  widget.querySelector('script').remove();
  const golden = JSON.parse(fs.readFileSync(path.resolve(dist, '../tests/fixtures/console-contract.json'), 'utf8'));
  widget.insertAdjacentHTML('beforeend', `<script type="application/json" data-console-widget>${JSON.stringify(golden.widget).replace(/</g, '\\u003c')}</script>`);
  const display = mountConsole(widget);
  await waitFor(() => assert.equal(display.getState(), 'ready'));
  assert.equal(widget.dataset.consoleControls, 'none', 'display-only widgets never bind header controls');
  assert.equal(widgetGroup.querySelector('[data-console-action="refresh"]').disabled, true);
  display.destroy();
});

test('denied access disables the bound Refresh and clears live status', async () => {
  resetEnvironment();
  const group = pageControls('console-denied');
  fetchRoute = () => jsonResponse({ error: { code: 'FORBIDDEN', message: 'revoked' } }, 403);
  const root = pageRoot(bootstrap({ snapshot: undefined }), 'console-denied');
  const runtime = mountConsole(root, { live: false, recoveryDelaysMs: [5] });
  await waitFor(() => assert.equal(runtime.getState(), 'denied'));
  const refresh = group.querySelector('[data-console-action="refresh"]');
  assert.equal(refresh.disabled, true, 'Refresh cannot restore access');
  assert.equal(group.querySelector('[data-console-connection]').textContent, 'Not live');
  assert.equal(group.querySelector('[data-console-status]').dataset.status, 'offline');
  assert.match(root.querySelector('[data-console-notice]').textContent, /do not have access/);
  assert.ok(root.querySelector('[data-console-action="reload"]'), 'the in-root notice offers Reload');
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
  assert.equal(socket.url, `wss://admin.example.test/fixture/data/ws?panels=operations%2Ctargets%2Caudit&${LIVE_CAPABILITIES}`);
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

// ---------------------------------------------------------------------------
// Workflow forms, request drafts and rich views (ADR-0003/0004, UX redesign T04)

const WORKFLOW_IDS = Object.freeze([
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
  '66666666-6666-4666-8666-666666666666',
  '77777777-7777-4777-8777-777777777777',
  '88888888-8888-4888-8888-888888888888',
]);

const CLIENT_CAPABILITIES = 'action_availability.v1,action_drawer.v1,request_id.v1,rich_views.v1,secondary_submit.v1';

const workflowUrls = Object.freeze({
  ...urls,
  options: '/admin/data/api/panels/:panel/actions/:action/options/:field',
  requests: '/admin/data/api/panels/:panel/requests/:request',
});

function requestIDs(offset = 0) {
  let index = offset;
  return () => WORKFLOW_IDS[index++] || '';
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function workflowActions({ generation = 3, prepare = true } = {}) {
  return [
    ...(prepare ? [{
      id: 'prepare',
      label: 'Prepare',
      submit_label: 'Prepare',
      payload: { scenario: 'ready' },
      request_scope: 'prepare:preview',
      requires: ['action_drawer.v1', 'request_id.v1', 'secondary_submit.v1'],
      drawer: {
        eyebrow: 'Prepare',
        title: 'Prepare ready on preview',
        effect: 'Preview keeps serving its active receipt while this runs.',
        steps: [{ label: 'Prepare', state: 'current' }, { label: 'Verify', state: 'pending' }],
        details: [{ label: 'Dataset', value: 'crm/corpus-a v1', format: 'mono' }],
      },
      secondary_submit: { label: 'Preview plan', field: 'dry_run', value: true },
      fields: [
        { name: 'batch_limit', label: 'Batch limit', kind: 'integer', min: 1, max: 500, default: 100 },
        { name: 'request_id', label: 'Request ID', kind: 'text', generate: 'request_id', advanced: true },
        { name: 'dry_run', label: 'Dry run', kind: 'hidden', default: false },
      ],
    }] : []),
    {
      id: 'activate',
      label: 'Activate',
      payload: { expected_generation: generation },
      request_scope: 'activate:preview',
      requires: ['action_drawer.v1', 'request_id.v1'],
      drawer: { title: 'Activate ready' },
      confirmation: {
        title: 'Activate ready',
        message: 'Preview will serve ready v1.',
        changes: [{ label: 'Generation', before: String(generation), after: String(generation + 1) }],
        confirm_label: 'Activate',
      },
      fields: [{ name: 'request_id', label: 'Request ID', kind: 'text', generate: 'request_id', advanced: true }],
    },
    {
      id: 'verify',
      label: 'Verify',
      request_scope: 'verify:preview',
      requires: ['action_drawer.v1', 'request_id.v1'],
      fields: [
        { name: 'receipt_id', label: 'Receipt', kind: 'select', required: true, option_source: { id: 'receipts', paginated: true, searchable: true } },
        { name: 'request_id', label: 'Request ID', kind: 'text', generate: 'request_id', advanced: true },
      ],
    },
    { id: 'reset', label: 'Reset', availability: 'unsupported', reason: 'Preview has no safe deactivation.' },
    { id: 'future', label: 'Future', requires: ['quantum.v9'] },
    { id: 'cleanup', label: 'Clean up' },
  ];
}

function workflowPanel(options = {}) {
  return {
    id: 'work',
    label: 'Work',
    snapshot_key: 'work',
    supports_toolbar: false,
    order: 1,
    ui: {
      schema_version: '1',
      views: {
        console: {
          renderer: 'table',
          title: 'Scenarios',
          description: 'Prepare, verify and activate.',
          options: {
            key_bind: 'id',
            actions_bind: 'actions',
            notify_bind: 'notice',
            columns: [
              { label: 'Scenario', bind: 'name', secondary_bind: 'dataset' },
              { label: 'Status', bind: 'status', format: 'badge', tone_bind: 'tone' },
              { label: 'Track', bind: 'track', format: 'steps' },
              { label: 'Receipt', bind: 'receipt', format: 'copy', truncate: 8 },
            ],
          },
        },
      },
      count: { mode: 'matching_rows', bind: 'attention', tone_bind: 'tone' },
      action_layout: { mode: 'drawer' },
      actions: workflowActions(options),
    },
  };
}

function workflowRecord(overrides = {}) {
  return {
    record_key: 'ready',
    revision: 1,
    data: {
      id: 'ready',
      name: 'ready v1',
      dataset: 'crm/corpus-a v1',
      status: 'Prepared — not verified',
      tone: 'warning',
      attention: true,
      receipt: 'rcpt-ready-0001-abcdef',
      track: [{ label: 'Prepare', state: 'done' }, { label: 'Verify', state: 'current' }, { label: 'Activate', state: 'pending' }],
      actions: [
        { panel_id: 'work', action_id: 'prepare', emphasis: 'primary' },
        { panel_id: 'work', action_id: 'activate' },
        { panel_id: 'work', action_id: 'verify' },
        { panel_id: 'work', action_id: 'reset', emphasis: 'menu' },
        { panel_id: 'work', action_id: 'future', emphasis: 'menu' },
        { panel_id: 'work', action_id: 'cleanup', emphasis: 'menu' },
        { panel_id: 'operations', action_id: 'preview' },
        { panel_id: 'work', action_id: 'undeclared' },
      ],
      ...overrides,
    },
  };
}

function workflowSnapshot(options = {}, records = [workflowRecord()]) {
  return snapshot({ watermark: options.watermark ?? 21, panels: [{ ...workflowPanel(options), records }, { ...operationsPanel, records: [operationRecord()] }] });
}

function workflowBootstrap(options = {}) {
  return bootstrap({ urls: { ...workflowUrls }, snapshot: workflowSnapshot(options) });
}

function rowRef(root, actionId) {
  return root.querySelector(`[data-console-panel] [data-console-action-ref][data-action-id="${actionId}"]`);
}

function drawerForm(root) {
  return root.querySelector('[data-console-drawer] form[data-panel-action-form]');
}

function ledgerEntries() {
  const key = Object.keys(win.sessionStorage).find((name) => name.endsWith(':requests'));
  return key ? JSON.parse(win.sessionStorage.getItem(key)) : [];
}

test('workflow drawers replay unchanged requests and give Preview plan and execution distinct IDs', async () => {
  resetEnvironment();
  const posts = [];
  let respond = () => { throw new TypeError('offline'); };
  fetchRoute = (call) => {
    if (call.url.endsWith('/api/snapshot')) return jsonResponse(workflowSnapshot());
    if (call.method === 'POST') {
      posts.push(call);
      return respond(call);
    }
    if (call.url.includes('/requests/')) return jsonResponse({ status: 'unclaimed', retry_until: new Date(Date.now() + 3600000).toISOString() });
    return jsonResponse({}, 404);
  };
  const { root, runtime } = mount(workflowBootstrap(), { generateRequestID: requestIDs() });
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  runtime.selectPanel('work');

  // Drawer layout: rows carry exact authorized references, nothing renders inline.
  assert.equal(root.querySelector('[data-console-panel-actions] form'), null);
  const tabCount = root.querySelector('[data-console-tab-count="work"]');
  assert.equal(tabCount.textContent, '1');
  assert.equal(tabCount.dataset.tone, 'warning', 'attention rows tone the tab count');
  assert.ok(root.querySelector('[data-console-panel] .console-steps [aria-current="step"]'), 'steps render with the current step');
  assert.match(root.querySelector('[data-console-panel] td[data-label="Scenario"]').textContent, /ready v1\s*crm\/corpus-a v1/);
  assert.equal(root.querySelector('[data-console-panel] [data-action-id="preview"][data-console-action-ref]'), null, 'foreign-panel references never render');
  assert.equal(rowRef(root, 'undeclared'), null, 'undeclared references never render');
  assert.ok(rowRef(root, 'prepare').classList.contains('console-btn--primary'));
  const reset = root.querySelector('.console-menu [data-action-id="reset"]');
  assert.equal(reset.getAttribute('aria-disabled'), 'true');
  assert.match(reset.textContent, /Preview has no safe deactivation/);

  const invoker = rowRef(root, 'prepare');
  invoker.focus();
  invoker.click();
  const drawer = root.querySelector('[data-console-drawer]');
  assert.ok(drawer, 'the action opens an in-root drawer');
  assert.equal(drawer.getAttribute('role'), 'dialog');
  assert.equal(drawer.getAttribute('aria-modal'), 'true');
  assert.ok(drawer.contains(win.document.activeElement), 'focus moves into the drawer');
  assert.match(drawer.textContent, /Preview keeps serving its active receipt/);
  const generated = drawer.querySelector('input[data-action-field-generated]');
  assert.equal(generated.value, WORKFLOW_IDS[0]);
  assert.ok(generated.readOnly);
  assert.ok(generated.closest('.console-advanced[data-expanded="false"]'), 'the request ID sits under a collapsed Advanced section');
  const advancedToggle = drawer.querySelector('[data-advanced-toggle]');
  advancedToggle.click();
  assert.equal(advancedToggle.getAttribute('aria-expanded'), 'true');
  assert.equal(generated.closest('.console-advanced').dataset.expanded, 'true');
  assert.equal(drawer.querySelector('[data-action-field="dry_run"]'), null, 'the submitter sets dry_run');

  // Escape closes and returns focus to the invoking row action.
  win.document.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(root.querySelector('[data-console-drawer]'), null);
  assert.equal(win.document.activeElement, invoker);

  rowRef(root, 'prepare').click();
  let form = drawerForm(root);
  assert.equal(form.querySelector('input[data-action-field-generated]').value, WORKFLOW_IDS[1], 'a discarded unsubmitted draft gets a fresh ID');
  form.requestSubmit(form.querySelector('[data-submitter="secondary"]'));
  await waitFor(() => assert.equal(posts.length, 1));
  assert.deepEqual(posts[0].body, { scenario: 'ready', batch_limit: 100, dry_run: true, request_id: WORKFLOW_IDS[1] });
  assert.equal(posts[0].headers.get('X-Console-Capabilities'), CLIENT_CAPABILITIES);
  await waitFor(() => assert.match(form.querySelector('[data-request-status]').textContent, /may not have been received/));
  assert.ok(form.querySelector('[data-request-check]') && form.querySelector('[data-request-resubmit]'));
  assert.deepEqual(ledgerEntries().map((entry) => [entry.request_id, entry.scope, entry.mode, entry.state]), [[WORKFLOW_IDS[1], 'prepare:preview', 'secondary', 'uncertain']]);

  // Unknown delivery needs bounded host authority before it can be replayed.
  form.querySelector('[data-request-check]').click();
  await waitFor(() => assert.equal(ledgerEntries()[0]?.state, 'unclaimed'));

  // Unchanged resubmission replays the submitted ID and frozen payload.
  respond = () => jsonResponse({ ok: true, planned: true, message: 'Planned. Nothing changed.', record: { panel_id: 'work', record_key: 'ready' } });
  form.requestSubmit(form.querySelector('[data-submitter="secondary"]'));
  await waitFor(() => assert.equal(posts.length, 2));
  assert.deepEqual(posts[1].body, posts[0].body);
  await waitFor(() => assert.equal(root.querySelector('[data-console-drawer]'), null));
  const banner = root.querySelector('[data-console-banner]');
  assert.equal(banner.dataset.tone, 'planned', 'planned work never reads as executed');
  assert.equal(win.document.activeElement, banner, 'the result banner takes focus');
  assert.ok(root.querySelector('[data-row-key="ready"][data-console-highlight]'), 'the outcome row is highlighted');
  assert.deepEqual(ledgerEntries(), []);

  // Execution is new work with its own ID; every submitter is busy while in flight.
  rowRef(root, 'prepare').click();
  form = drawerForm(root);
  const executionID = form.querySelector('input[data-action-field-generated]').value;
  assert.ok(!WORKFLOW_IDS.slice(0, 2).includes(executionID));
  form.querySelector('[data-action-field="batch_limit"]').value = '600';
  form.requestSubmit(form.querySelector('[data-submitter="primary"]'));
  await settle();
  assert.equal(posts.length, 2, 'declared bounds are checked before submission');
  assert.equal(form.querySelector('[data-action-field-error="batch_limit"]').textContent, 'Enter 500 or less.');
  form.querySelector('[data-action-field="batch_limit"]').value = '50';
  const pending = deferred();
  respond = () => pending.promise;
  form.requestSubmit(form.querySelector('[data-submitter="primary"]'));
  await waitFor(() => assert.equal(posts.length, 3));
  assert.deepEqual(posts[2].body, { scenario: 'ready', batch_limit: 50, dry_run: false, request_id: executionID });
  assert.equal(form.getAttribute('aria-busy'), 'true');
  assert.ok(Array.from(form.querySelectorAll('button[type="submit"]')).every((button) => button.disabled), 'all submitters are busy together');
  form.requestSubmit(form.querySelector('[data-submitter="secondary"]'));
  await settle();
  assert.equal(posts.length, 3, 'no second dispatch while one is in flight');
  pending.resolve(jsonResponse({ ok: true, message: 'Accepted prepare operation op-0010.', tone: 'info' }));
  await waitFor(() => assert.match(root.querySelector('[data-console-banner]').textContent, /Accepted prepare operation op-0010/));
  runtime.destroy();
});

test('unknown delivery reconciles before new work and reload restores the pending request', async () => {
  resetEnvironment();
  const posts = [];
  const lookups = [];
  let status = { status: 'unclaimed', retry_until: new Date(Date.now() + 3600000).toISOString() };
  let respond = () => { throw new TypeError('offline'); };
  fetchRoute = (call) => {
    if (call.url.endsWith('/api/snapshot')) return jsonResponse(workflowSnapshot());
    if (call.method === 'POST') {
      posts.push(call);
      return respond(call);
    }
    if (call.url.includes('/requests/')) {
      lookups.push(call);
      return jsonResponse(status);
    }
    return jsonResponse({}, 404);
  };
  const first = mount(workflowBootstrap(), { generateRequestID: requestIDs() });
  await waitFor(() => assert.equal(first.runtime.getState(), 'ready'));
  first.runtime.selectPanel('work');
  rowRef(first.root, 'prepare').click();
  let form = drawerForm(first.root);
  form.requestSubmit(form.querySelector('[data-submitter="primary"]'));
  await waitFor(() => assert.equal(posts.length, 1));
  await waitFor(() => assert.equal(ledgerEntries()[0]?.state, 'uncertain'));
  const submitted = posts[0].body;

  form.querySelector('[data-action-field="batch_limit"]').value = '25';
  form.requestSubmit(form.querySelector('[data-submitter="primary"]'));
  await settle();
  assert.equal(posts.length, 1, 'changed input waits for reconciliation');
  assert.match(form.querySelector('[data-request-status]').textContent, /Check its status before starting new work/);

  // Reload: a new instance restores the request and reconciles it first.
  first.runtime.destroy();
  first.root.remove();
  const second = mount(workflowBootstrap(), { generateRequestID: requestIDs() });
  await waitFor(() => assert.equal(lookups.length, 1));
  const lookup = new URL(lookups[0].url, 'https://admin.example.test');
  assert.equal(lookup.pathname, `/admin/data/api/panels/work/requests/${submitted.request_id}`);
  assert.equal(lookup.searchParams.get('action'), 'prepare');
  assert.equal(lookup.searchParams.get('scope'), 'prepare:preview');
  assert.ok(lookup.searchParams.get('submitted_at'));
  assert.equal(lookups[0].headers.get('X-Console-Capabilities'), CLIENT_CAPABILITIES);
  second.runtime.selectPanel('work');
  rowRef(second.root, 'prepare').click();
  form = drawerForm(second.root);
  await waitFor(() => assert.match(form.querySelector('[data-request-status]').textContent, /was not received/));
  assert.equal(form.querySelector('input[data-action-field-generated]').value, submitted.request_id, 'reopen resumes the submitted ID');
  assert.equal(form.querySelector('[data-action-field="batch_limit"]').value, '100', 'reopen shows the frozen input');
  respond = () => jsonResponse({ ok: true, message: 'Accepted.' });
  form.querySelector('[data-request-resubmit]').click();
  await waitFor(() => assert.equal(posts.length, 2));
  assert.deepEqual(posts[1].body, submitted, 'Resubmit unchanged replays the frozen payload');
  await waitFor(() => assert.deepEqual(ledgerEntries(), []));
  second.runtime.destroy();
  second.root.remove();

  // A claimed request resolves from the durable lookup without resubmitting.
  resetEnvironment();
  posts.length = 0;
  lookups.length = 0;
  respond = () => { throw new TypeError('offline'); };
  fetchRoute = (call) => {
    if (call.url.endsWith('/api/snapshot')) return jsonResponse(workflowSnapshot());
    if (call.method === 'POST') {
      posts.push(call);
      return respond(call);
    }
    if (call.url.includes('/requests/')) {
      lookups.push(call);
      return jsonResponse(status);
    }
    return jsonResponse({}, 404);
  };
  const third = mount(workflowBootstrap(), { generateRequestID: requestIDs() });
  await waitFor(() => assert.equal(third.runtime.getState(), 'ready'));
  third.runtime.selectPanel('work');
  rowRef(third.root, 'prepare').click();
  form = drawerForm(third.root);
  form.requestSubmit(form.querySelector('[data-submitter="primary"]'));
  await waitFor(() => assert.equal(ledgerEntries()[0]?.state, 'uncertain'));
  status = { status: 'claimed', result: { ok: true, message: 'Prepare op-0011 is running.', tone: 'info' } };
  form.querySelector('[data-request-check]').click();
  await waitFor(() => assert.match(third.root.querySelector('[data-console-banner]').textContent, /Prepare op-0011 is running/));
  assert.equal(posts.length, 1, 'a claimed request never resubmits');
  assert.deepEqual(ledgerEntries(), []);
  third.runtime.destroy();
});

test('confirmation reloads authoritative state, freezes the confirmed generation and replays keep it', async () => {
  resetEnvironment();
  const posts = [];
  const confirmations = [];
  let generation = 3;
  let respond = () => { throw new TypeError('offline'); };
  fetchRoute = (call) => {
    if (call.url.endsWith('/api/snapshot')) return jsonResponse(workflowSnapshot({ generation, watermark: 21 + generation }));
    if (call.method === 'POST') {
      posts.push(call);
      return respond(call);
    }
    if (call.url.includes('/requests/')) return jsonResponse({ status: 'unclaimed', retry_until: new Date(Date.now() + 3600000).toISOString() });
    return jsonResponse({}, 404);
  };
  const { root, runtime } = mount(workflowBootstrap(), {
    generateRequestID: requestIDs(),
    confirm: (message, request) => {
      confirmations.push(request);
      return true;
    },
  });
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  runtime.selectPanel('work');
  rowRef(root, 'activate').click();
  let form = drawerForm(root);
  generation = 4; // the target moved after the page loaded
  form.requestSubmit();
  await waitFor(() => assert.equal(posts.length, 1));
  assert.equal(confirmations.length, 1);
  assert.deepEqual(confirmations[0].changes, [{ label: 'Generation', before: '4', after: '5' }], 'confirmation shows the reloaded state');
  assert.equal(confirmations[0].confirmLabel, 'Activate');
  assert.equal(posts[0].body.expected_generation, 4, 'the confirmed generation is frozen into the payload');
  await waitFor(() => assert.equal(ledgerEntries()[0]?.state, 'uncertain'));

  generation = 5;
  await runtime.refresh();
  form = drawerForm(root);
  form.requestSubmit();
  await settle();
  assert.equal(posts.length, 1, 'a later generation is new work and waits for reconciliation');
  respond = () => jsonResponse({ ok: false, code: 'stale_generation', tone: 'error', message: 'The active dataset changed since you confirmed.' });
  form.querySelector('[data-request-check]').click();
  await waitFor(() => assert.equal(ledgerEntries()[0]?.state, 'unclaimed'));
  form.querySelector('[data-request-resubmit]').click();
  await waitFor(() => assert.equal(posts.length, 2));
  assert.deepEqual(posts[1].body, posts[0].body, 'replay keeps the confirmed generation');
  assert.equal(confirmations.length, 1, 'replays never ask again');
  await waitFor(() => assert.match(root.querySelector('[data-console-banner]').textContent, /changed since you confirmed/));
  runtime.destroy();
});

test('unavailable, capability-gated, foreign and withdrawn actions never dispatch and stale clients reload', async () => {
  resetEnvironment();
  const posts = [];
  let current = workflowSnapshot();
  let respond = () => jsonResponse({ ok: true, message: 'Done.' });
  fetchRoute = (call) => {
    if (call.url.endsWith('/api/snapshot')) return jsonResponse(current);
    if (call.method === 'POST') {
      posts.push(call);
      return respond(call);
    }
    return jsonResponse({}, 404);
  };
  const { root, runtime } = mount(workflowBootstrap(), { generateRequestID: requestIDs() });
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  runtime.selectPanel('work');

  root.querySelector('.console-menu [data-action-id="reset"]').click();
  const future = root.querySelector('.console-menu [data-action-id="future"]');
  assert.match(future.getAttribute('title'), /Reload the page/);
  future.click();
  const forged = win.document.createElement('button');
  forged.setAttribute('data-console-action-ref', '');
  forged.dataset.panelId = 'operations';
  forged.dataset.actionId = 'preview';
  root.querySelector('[data-console-panel-body]').appendChild(forged);
  forged.click();
  await settle();
  assert.equal(posts.length, 0);
  assert.equal(root.querySelector('[data-console-drawer]'), null);

  // A declaration withdrawn while its drawer is open can no longer submit.
  rowRef(root, 'prepare').click();
  const form = drawerForm(root);
  current = { ...workflowSnapshot({ prepare: false }), watermark: 30 };
  await runtime.refresh();
  assert.ok(Array.from(form.querySelectorAll('button[data-submitter]')).every((button) => button.disabled));
  assert.match(form.textContent, /no longer available/);
  form.requestSubmit();
  await settle();
  assert.equal(posts.length, 0);
  win.document.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

  // The host refuses stale assets; the console asks for a reload and stops dispatching.
  respond = () => jsonResponse({ error: { code: 409, text_code: 'CONSOLE_CLIENT_OUTDATED', message: 'This console was updated. Reload the page to use this action.', metadata: { action: 'reload' } } }, 409);
  root.querySelector('.console-menu [data-action-id="cleanup"]').click();
  await waitFor(() => assert.equal(posts.length, 1));
  assert.equal(posts[0].headers.get('X-Console-Capabilities'), CLIENT_CAPABILITIES);
  await waitFor(() => assert.ok(root.querySelector('[data-console-banner] [data-console-action="reload"]')));
  assert.equal(root.dataset.consoleOutdated, 'true');
  root.querySelector('.console-menu [data-action-id="cleanup"]').click();
  await settle();
  assert.equal(posts.length, 1);
  runtime.destroy();
});

test('paginated options load authorized pages, search and load more without inventing values', async () => {
  resetEnvironment();
  const lookups = [];
  fetchRoute = (call) => {
    if (call.url.endsWith('/api/snapshot')) return jsonResponse(workflowSnapshot());
    if (call.url.includes('/options/')) {
      lookups.push(new URL(call.url, 'https://admin.example.test'));
      const url = lookups.at(-1);
      if (url.searchParams.get('q')) return jsonResponse({ items: [{ value: 'rcpt-9', label: 'rcpt-9 (old)' }] });
      if (url.searchParams.get('cursor') === 'page-2') return jsonResponse({ items: [{ value: 'rcpt-3', label: 'rcpt-3' }] });
      return jsonResponse({ items: [{ value: 'rcpt-1', label: 'rcpt-1 (active)' }, { value: 'rcpt-2', label: 'rcpt-2', disabled: true }], next_cursor: 'page-2' });
    }
    return jsonResponse({}, 404);
  };
  const { root, runtime } = mount(workflowBootstrap(), { generateRequestID: requestIDs() });
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  runtime.selectPanel('work');
  rowRef(root, 'verify').click();
  const form = drawerForm(root);
  const select = form.querySelector('select[data-action-field="receipt_id"]');
  await waitFor(() => assert.deepEqual(Array.from(select.options).map((option) => option.value), ['', 'rcpt-1', 'rcpt-2']));
  assert.equal(lookups[0].pathname, '/admin/data/api/panels/work/actions/verify/options/receipt_id');
  assert.equal(lookups[0].searchParams.get('limit'), '25');
  assert.ok(select.options[2].disabled);
  const more = form.querySelector('[data-option-more]');
  assert.equal(more.hidden, false);
  more.click();
  await waitFor(() => assert.deepEqual(Array.from(select.options).map((option) => option.value), ['', 'rcpt-1', 'rcpt-2', 'rcpt-3']));
  assert.equal(lookups[1].searchParams.get('cursor'), 'page-2');
  assert.equal(more.hidden, true);
  const search = form.querySelector('[data-option-search]');
  search.value = 'rcpt-9';
  search.dispatchEvent(new win.Event('input', { bubbles: true }));
  await waitFor(() => assert.deepEqual(Array.from(select.options).map((option) => option.value), ['', 'rcpt-9']));
  assert.equal(lookups.at(-1).searchParams.get('q'), 'rcpt-9');

  // A required paginated selection is validated before submission.
  form.requestSubmit();
  await settle();
  assert.equal(form.querySelector('[data-action-field-error="receipt_id"]').textContent, 'Enter a value.');
  runtime.destroy();
});

test('background completions toast once and snapshots never replay notifications', async () => {
  resetEnvironment();
  const toasts = [];
  const announced = workflowRecord({ notice: { id: 'op-1:succeeded', message: 'Prepare op-1 finished.', tone: 'success' } });
  fetchRoute = (call) => (call.url.endsWith('/api/snapshot')
    ? jsonResponse(workflowSnapshot({}, [announced]))
    : jsonResponse({}, 404));
  const { runtime } = mount(bootstrap({ urls: { ...workflowUrls }, snapshot: workflowSnapshot({}, [announced]) }), {
    live: true,
    snapshotWaitMs: 60000,
    notify: (tone, message) => toasts.push([tone, message]),
  });
  await waitFor(() => assert.equal(FakeSocket.instances.length, 1));
  const socket = FakeSocket.instances[0];
  socket.open();
  socket.message(workflowSnapshot({}, [announced]));
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  assert.deepEqual(toasts, [], 'snapshot notifications are history');
  const finished = { ...identity, panel_id: 'work', record_key: 'ready', revision: 2, sequence: 22, kind: 'upsert', data: { ...announced.data, notice: { id: 'op-2:succeeded', message: 'Verify op-2 passed.', tone: 'success' } } };
  socket.message(finished);
  socket.message({ ...finished, revision: 3, sequence: 23 });
  await settle();
  assert.deepEqual(toasts, [['success', 'Verify op-2 passed.']]);
  runtime.destroy();
});

test('two instances with the same console id keep drafts, drawers and ledgers apart', async () => {
  resetEnvironment();
  const posts = [];
  fetchRoute = (call) => {
    if (call.url.endsWith('/api/snapshot')) return jsonResponse(workflowSnapshot());
    if (call.method === 'POST') {
      posts.push(call);
      throw new TypeError('offline');
    }
    return jsonResponse({}, 404);
  };
  const other = identityFor({ scope_key: 'other-org' });
  const a = mount(workflowBootstrap(), { generateRequestID: requestIDs() });
  const bPayload = bootstrap({ identity: other, urls: { ...workflowUrls }, snapshot: snapshot({ ...other, panels: workflowSnapshot().panels }) });
  const b = mount(bPayload, { generateRequestID: requestIDs(4) });
  await waitFor(() => assert.equal(a.runtime.getState(), 'ready'));
  await waitFor(() => assert.equal(b.runtime.getState(), 'ready'));
  a.runtime.selectPanel('work');
  b.runtime.selectPanel('work');
  rowRef(a.root, 'prepare').click();
  assert.ok(a.root.querySelector('[data-console-drawer]'));
  assert.equal(b.root.querySelector('[data-console-drawer]'), null, 'drawers belong to one root');
  const form = drawerForm(a.root);
  form.requestSubmit(form.querySelector('[data-submitter="primary"]'));
  await waitFor(() => assert.equal(posts.length, 1));
  await waitFor(() => assert.equal(ledgerEntries().length, 1));
  const keys = Object.keys(win.sessionStorage).filter((name) => name.endsWith(':requests'));
  assert.equal(keys.length, 1);
  assert.ok(keys[0].includes('synthetic-org') && !keys[0].includes('other-org'), 'the ledger is namespaced by identity');
  rowRef(b.root, 'prepare').click();
  const otherForm = drawerForm(b.root);
  assert.equal(otherForm.querySelector('[data-request-status]').hidden, true, 'another instance never resumes a foreign request');
  assert.notEqual(otherForm.querySelector('input[data-action-field-generated]').value, posts[0].body.request_id);
  a.runtime.destroy();
  b.runtime.destroy();
});

test('display-only widgets render workflow rows without action affordances', async () => {
  resetEnvironment();
  const widgetRoot = win.document.createElement('div');
  widgetRoot.setAttribute('data-console-root', '');
  widgetRoot.setAttribute('data-console-display', '');
  widgetRoot.setAttribute('data-console-manual', '');
  widgetRoot.innerHTML = `<script type="application/json" data-console-widget>${JSON.stringify({ ...identity, watermark: 21, panel: { ...workflowPanel(), records: [workflowRecord()] } }).replace(/</g, '\\u003c')}</script><section class="console-panel" data-console-panel></section>`;
  win.document.body.appendChild(widgetRoot);
  const widget = mountConsole(widgetRoot);
  await waitFor(() => assert.equal(widget.getState(), 'ready'));
  assert.match(widgetRoot.querySelector('[data-console-panel]').textContent, /ready v1/);
  assert.equal(widgetRoot.querySelectorAll('[data-console-action-ref], form, [data-console-drawer]').length, 0);
  widget.destroy();
});

test('restored requests of withdrawn actions still reconcile through panel read access', async () => {
  resetEnvironment();
  const payload = workflowBootstrap({ prepare: false });
  const key = `go-admin:console:${payload.preferences_namespace}:requests`;
  const seed = (requestID) => win.sessionStorage.setItem(key, JSON.stringify([{
    panel_id: 'work',
    action_id: 'prepare',
    request_id: requestID,
    mode: 'primary',
    scope: 'prepare:preview',
    submitted_at: new Date(Date.now() - 60000).toISOString(),
    signature: '{"batch_limit":100}',
    state: 'uncertain',
    payload: { batch_limit: 100, request_id: requestID },
  }]));
  let status = { status: 'claimed', result: { ok: true, message: 'Prepare op-0020 finished.', tone: 'success' } };
  const lookups = [];
  fetchRoute = (call) => {
    if (call.url.endsWith('/api/snapshot')) return jsonResponse(payload.snapshot);
    if (call.url.includes('/requests/')) {
      lookups.push(call.url);
      return jsonResponse(status);
    }
    return jsonResponse({}, 404);
  };
  seed(WORKFLOW_IDS[0]);
  const first = mount(payload);
  await waitFor(() => assert.equal(lookups.length, 1));
  assert.ok(lookups[0].includes(`/requests/${WORKFLOW_IDS[0]}?action=prepare`));
  first.runtime.selectPanel('work');
  await waitFor(() => assert.match(first.root.querySelector('[data-console-banner]').textContent, /Prepare op-0020 finished/));
  assert.notEqual(win.document.activeElement, first.root.querySelector('[data-console-banner]'), 'restored outcomes never steal focus');
  assert.equal(win.sessionStorage.getItem(key), null);
  first.runtime.destroy();
  first.root.remove();

  status = { status: 'unclaimed', message: 'No request with this ID was received.' };
  seed(WORKFLOW_IDS[1]);
  const second = mount(payload);
  await waitFor(() => assert.equal(lookups.length, 2));
  second.runtime.selectPanel('work');
  await waitFor(() => assert.match(second.root.querySelector('[data-console-banner]').textContent, /no longer offered/));
  assert.equal(win.sessionStorage.getItem(key), null, 'a withdrawn action cannot be resumed, so the entry is dropped');
  second.runtime.destroy();
});

test('confirmation never proceeds on state that could not be reloaded', async () => {
  resetEnvironment();
  const posts = [];
  const confirmations = [];
  let failSnapshots = false;
  fetchRoute = (call) => {
    if (call.url.endsWith('/api/snapshot')) return failSnapshots ? jsonResponse({ error: { code: 503, message: 'unavailable' } }, 503) : jsonResponse(workflowSnapshot());
    if (call.method === 'POST') {
      posts.push(call);
      return jsonResponse({ ok: true });
    }
    return jsonResponse({}, 404);
  };
  const { root, runtime } = mount(workflowBootstrap(), {
    generateRequestID: requestIDs(),
    recoveryDelaysMs: [60000],
    confirm: (message, request) => {
      confirmations.push(request);
      return true;
    },
  });
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  runtime.selectPanel('work');
  rowRef(root, 'activate').click();
  const form = drawerForm(root);
  failSnapshots = true;
  form.requestSubmit();
  await waitFor(() => assert.match(form.textContent, /could not be loaded/));
  assert.equal(confirmations.length, 0);
  assert.equal(posts.length, 0);
  runtime.destroy();
});

test('a late reconciliation outcome never closes a drawer opened for other work', async () => {
  resetEnvironment();
  const payload = workflowBootstrap();
  const key = `go-admin:console:${payload.preferences_namespace}:requests`;
  win.sessionStorage.setItem(key, JSON.stringify([{
    panel_id: 'work',
    action_id: 'prepare',
    request_id: WORKFLOW_IDS[7],
    mode: 'primary',
    scope: 'prepare:preview',
    submitted_at: new Date(Date.now() - 60000).toISOString(),
    signature: '{"batch_limit":100,"dry_run":false,"scenario":"ready"}',
    state: 'uncertain',
    payload: { scenario: 'ready', batch_limit: 100, dry_run: false, request_id: WORKFLOW_IDS[7] },
  }]));
  const lookup = deferred();
  fetchRoute = (call) => {
    if (call.url.endsWith('/api/snapshot')) return jsonResponse(payload.snapshot);
    if (call.url.includes('/requests/')) return lookup.promise;
    if (call.url.includes('/options/')) return jsonResponse({ items: [] });
    return jsonResponse({}, 404);
  };
  const { root, runtime } = mount(payload, { generateRequestID: requestIDs() });
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  runtime.selectPanel('work');
  rowRef(root, 'verify').click();
  assert.ok(drawerForm(root));
  lookup.resolve(jsonResponse({ status: 'claimed', result: { ok: true, message: 'Prepare op-0030 is running.', tone: 'info' } }));
  await waitFor(() => assert.match(root.querySelector('[data-console-banner]').textContent, /Prepare op-0030 is running/));
  assert.equal(root.querySelector('[data-console-drawer]').dataset.actionId, 'verify', 'the operator keeps the drawer they opened');
  assert.ok(root.querySelector('[data-console-drawer]').contains(win.document.activeElement));
  runtime.destroy();
});

test('full and incremental table rows share rich formatting while Debug rows keep their markup', async () => {
  const { renderSchemaPanelView, renderSchemaListRow, consoleStyleConfig } = consoleModule;
  const panel = workflowPanel();
  const view = panel.ui.views.console;
  const record = workflowRecord().data;
  const squash = (html) => html.replace(/\s+/g, ' ').replace(/> </g, '><').trim();
  const full = squash(renderSchemaPanelView(panel, view, [record], consoleStyleConfig));
  const fullRow = full.match(/<tr data-row-key="ready">.*?<\/tr>/)[0];
  assert.equal(squash(renderSchemaListRow('table', record, view, consoleStyleConfig, panel)), fullRow, 'incremental rows equal full rows');
  for (const fragment of ['data-label="Scenario"', 'console-cell-sub', 'console-steps', 'console-badge--warning', 'data-copy-content="rcpt-ready-0001-abcdef"', 'rcpt-rea…', 'data-console-action-ref']) {
    assert.ok(fullRow.includes(fragment), `rich row carries ${fragment}`);
  }
  assert.match(full, /<th[^>]*>Actions<\/th>|<th[^>]*><span class="console-sr-only">Actions<\/span><\/th>/, 'the action slot has a column header');

  const { consoleStyles } = await import('../dist/debug/index.js');
  const plain = { renderer: 'table', options: { key_bind: 'id', columns: [{ label: 'Name', bind: 'name' }] } };
  const debugRow = renderSchemaListRow('table', { id: 'x', name: '<n>' }, plain, consoleStyles);
  assert.doesNotMatch(debugRow, /data-label|console-/, 'Debug rows keep their legacy markup');
  assert.match(debugRow, /&lt;n&gt;/);
});

test('cards and lists render tones, progress, metadata and slots, and many targets become a compact table', async () => {
  const { renderSchemaPanelView, consoleStyleConfig } = consoleModule;
  const panel = workflowPanel();
  const target = (id, overrides = {}) => ({
    key: id,
    target: id,
    scenario: 'ready v1',
    status: 'Active',
    tone: 'success',
    generation: 3,
    receipt: `rcpt-${id}-0001`,
    note: 'Since 2026-10-01',
    actions: [{ panel_id: 'work', action_id: 'prepare', emphasis: 'primary' }, { panel_id: 'work', action_id: 'reset', emphasis: 'menu' }],
    ...overrides,
  });
  const cardsView = {
    renderer: 'cards',
    title: 'Targets',
    empty: 'No managed targets yet.',
    options: {
      key_bind: 'key',
      eyebrow_bind: 'target',
      title_bind: 'scenario',
      status_bind: 'status',
      tone_bind: 'tone',
      note_bind: 'note',
      actions_bind: 'actions',
      max_cards: 4,
      fields: [{ label: 'Generation', bind: 'generation' }, { label: 'Receipt', bind: 'receipt', format: 'mono', truncate: 8 }],
      columns: [{ label: 'Target', bind: 'target' }, { label: 'Status', bind: 'status', format: 'badge', tone_bind: 'tone' }],
    },
  };
  const cards = renderSchemaPanelView(panel, cardsView, [target('preview'), target('staging', { status: 'Recovery required', tone: 'error' })], consoleStyleConfig);
  assert.equal((cards.match(/class="console-card"/g) || []).length, 2);
  assert.match(cards, /console-card__eyebrow">staging/);
  assert.match(cards, /console-badge--error">Recovery required/);
  assert.match(cards, /<dt>Generation<\/dt><dd>3<\/dd>/);
  assert.match(cards, /title="rcpt-preview-0001"/, 'truncated identifiers keep the full value');
  assert.match(cards, /data-console-action-ref[^>]*data-action-id="prepare"/);
  assert.match(cards, /console-menu[\s\S]*data-action-id="reset"[^>]*aria-disabled="true"/);
  const many = renderSchemaPanelView(panel, cardsView, ['a', 'b', 'c', 'd', 'e'].map((id) => target(id)), consoleStyleConfig);
  assert.doesNotMatch(many, /class="console-card"/, 'beyond max_cards the view becomes a compact table');
  assert.equal((many.match(/<tr data-row-key=/g) || []).length, 5);
  assert.match(renderSchemaPanelView(panel, cardsView, [], consoleStyleConfig), /No managed targets yet\./);

  const listView = {
    renderer: 'list',
    title: 'Recent operations',
    options: { key_bind: 'id', limit: 2, title_bind: 'title', subtitle_bind: 'subtitle', status_bind: 'state', tone_bind: 'tone', progress_bind: 'progress', time_bind: 'at' },
  };
  const now = new Date(Date.now() - 5 * 60000).toISOString();
  const list = renderSchemaPanelView(panel, listView, [
    { id: 'op-3', title: 'Refresh ready v1', subtitle: 'preview', state: 'Running', tone: 'info', progress: { completed: 40, total: 100, label: '40 of 100 · seed audiences' }, at: now },
    { id: 'op-2', title: 'Prepare', subtitle: 'preview', state: 'Planned', tone: 'planned', at: now },
    { id: 'op-1', title: 'Hidden by limit' },
  ], consoleStyleConfig);
  assert.equal((list.match(/console-list__item/g) || []).length, 2, 'lists honor their limit');
  assert.match(list, /role="progressbar"[^>]*aria-valuenow="40"/);
  assert.match(list, /style="width:40%"/);
  assert.match(list, /console-badge--planned">Planned/);
  assert.match(list, /<time class="console-timestamp" datetime="[^"]+"[^>]*>5 min ago<\/time>/);
  assert.doesNotMatch(list, /Hidden by limit/);
});


for (const submitPath of ['resubmit', 'form', 'reopen']) {
  test(`replay authority expires before ${submitPath} can send another POST`, async () => {
    resetEnvironment();
    const posts = [];
    const lookups = [];
    let answer;
    fetchRoute = (call) => {
      if (call.url.endsWith('/api/snapshot')) return jsonResponse(workflowSnapshot());
      if (call.method === 'POST') {
        posts.push(call);
        return jsonResponse({ error: { message: 'gateway timeout' } }, 504);
      }
      if (call.url.includes('/requests/')) {
        lookups.push(call);
        return jsonResponse(answer);
      }
      return jsonResponse({}, 404);
    };
    const { root, runtime } = mount(workflowBootstrap(), { generateRequestID: requestIDs() });
    try {
      await waitFor(() => assert.equal(runtime.getState(), 'ready'));
      runtime.selectPanel('work');
      rowRef(root, 'prepare').click();
      let form = drawerForm(root);
      form.requestSubmit(form.querySelector('[data-submitter="primary"]'));
      await waitFor(() => assert.equal(ledgerEntries()[0]?.state, 'uncertain'));
      const submitted = posts[0].body;
      answer = { status: 'unclaimed', retry_until: new Date(Date.now() + 250).toISOString() };
      form.querySelector('[data-request-check]').click();
      await waitFor(() => assert.equal(ledgerEntries()[0]?.state, 'unclaimed'));
      assert.equal(ledgerEntries()[0].retry_until, answer.retry_until, 'the absolute deadline persists with the frozen request');
      await new Promise((resolve) => setTimeout(resolve, 300));
      answer = { status: 'expired' };
      if (submitPath === 'reopen') {
        root.querySelector('[data-drawer-close]').click();
        rowRef(root, 'prepare').click();
        form = drawerForm(root);
        assert.equal(form.querySelector('input[data-action-field-generated]').value, submitted.request_id);
      }
      if (submitPath === 'form') form.requestSubmit(form.querySelector('[data-submitter="primary"]'));
      else form.querySelector('[data-request-resubmit]').click();
      await waitFor(() => assert.equal(ledgerEntries()[0]?.state, 'expired'));
      assert.equal(lookups.length, 2, 'expired authority rechecks without silently replaying');
      assert.equal(posts.length, 1, 'no POST under expired authority');
      assert.ok(form.querySelector('[data-request-new]'), 'explicit new work remains available');
    } finally {
      runtime.destroy();
    }
  });
}

test('reload reconciles expired replay authority without sending the frozen request', async () => {
  resetEnvironment();
  const posts = [];
  const lookups = [];
  let answer = { status: 'unclaimed', retry_until: new Date(Date.now() + 1000).toISOString() };
  fetchRoute = (call) => {
    if (call.url.endsWith('/api/snapshot')) return jsonResponse(workflowSnapshot());
    if (call.method === 'POST') {
      posts.push(call);
      return jsonResponse({ error: { message: 'gateway timeout' } }, 504);
    }
    if (call.url.includes('/requests/')) {
      lookups.push(call);
      return jsonResponse(answer);
    }
    return jsonResponse({}, 404);
  };
  const first = mount(workflowBootstrap(), { generateRequestID: requestIDs() });
  let id;
  try {
    await waitFor(() => assert.equal(first.runtime.getState(), 'ready'));
    first.runtime.selectPanel('work');
    rowRef(first.root, 'prepare').click();
    const form = drawerForm(first.root);
    form.requestSubmit(form.querySelector('[data-submitter="primary"]'));
    await waitFor(() => assert.equal(ledgerEntries()[0]?.state, 'uncertain'));
    form.querySelector('[data-request-check]').click();
    await waitFor(() => assert.equal(ledgerEntries()[0]?.state, 'unclaimed'));
    id = posts[0].body.request_id;
  } finally {
    first.runtime.destroy();
    first.root.remove();
  }
  answer = { status: 'expired' };
  const second = mount(workflowBootstrap(), { generateRequestID: requestIDs(4) });
  try {
    await waitFor(() => assert.equal(ledgerEntries()[0]?.state, 'expired'));
    second.runtime.selectPanel('work');
    rowRef(second.root, 'prepare').click();
    const form = drawerForm(second.root);
    assert.equal(form.querySelector('input[data-action-field-generated]').value, id);
    form.requestSubmit(form.querySelector('[data-submitter="primary"]'));
    await settle();
    assert.equal(posts.length, 1);
    assert.equal(lookups.length, 2);
    form.querySelector('[data-request-new]').click();
    assert.notEqual(form.querySelector('input[data-action-field-generated]').value, id, 'new work requires an explicit fresh ID');
  } finally {
    second.runtime.destroy();
  }
});

for (const deadline of [undefined, 'invalid', '2000-01-01T00:00:00Z']) {
  test(`an unclaimed response with deadline ${deadline} never authorizes replay`, async () => {
    resetEnvironment();
    const posts = [];
    fetchRoute = (call) => {
      if (call.url.endsWith('/api/snapshot')) return jsonResponse(workflowSnapshot());
      if (call.method === 'POST') {
        posts.push(call);
        return jsonResponse({ error: { message: 'gateway timeout' } }, 504);
      }
      if (call.url.includes('/requests/')) return jsonResponse({ status: 'unclaimed', retry_until: deadline });
      return jsonResponse({}, 404);
    };
    const { root, runtime } = mount(workflowBootstrap(), { generateRequestID: requestIDs() });
    try {
      await waitFor(() => assert.equal(runtime.getState(), 'ready'));
      runtime.selectPanel('work');
      rowRef(root, 'prepare').click();
      const form = drawerForm(root);
      form.requestSubmit(form.querySelector('[data-submitter="primary"]'));
      await waitFor(() => assert.equal(ledgerEntries()[0]?.state, 'uncertain'));
      form.querySelector('[data-request-check]').click();
      await waitFor(() => assert.equal(ledgerEntries()[0]?.state, deadline?.startsWith('2000') ? 'expired' : 'unknown'));
      form.requestSubmit(form.querySelector('[data-submitter="primary"]'));
      await settle();
      assert.equal(posts.length, 1);
      assert.equal(form.querySelector('[data-request-resubmit]'), null);
    } finally {
      runtime.destroy();
    }
  });
}

test('failed handshakes verify access before retrying and stop on expired sessions', async () => {
  for (const status of [401, 403]) {
    resetEnvironment();
    const { runtime } = mount(bootstrap(), { live: true, liveOptions: { reconnectDelayMs: 5, maxReconnectDelayMs: 5 } });
    await waitFor(() => assert.equal(FakeSocket.instances.length, 1));
    fetchRoute = () => jsonResponse({ error: { message: 'access lost' } }, status);
    FakeSocket.instances[0].close(1006);
    await waitFor(() => assert.equal(runtime.getState(), 'denied'));
    await settle();
    assert.equal(FakeSocket.instances.length, 1, 'rejected auth cannot create another handshake');
    assert.deepEqual(runtime.getPanels(), []);
    runtime.destroy();
  }
});

test('handshake access checks wait for admission and honor disposal', async () => {
  resetEnvironment();
  const { runtime } = mount(bootstrap(), { live: true, liveOptions: { reconnectDelayMs: 5, maxReconnectDelayMs: 5 } });
  await waitFor(() => assert.equal(FakeSocket.instances.length, 1));
  let finish;
  fetchRoute = () => new Promise((resolve) => { finish = resolve; });
  FakeSocket.instances[0].close(1006);
  await waitFor(() => assert.equal(typeof finish, 'function'));
  await settle();
  assert.equal(FakeSocket.instances.length, 1, 'no reconnect before the access check finishes');
  finish(jsonResponse(snapshot()));
  await waitFor(() => assert.equal(FakeSocket.instances.length, 2));
  const current = FakeSocket.instances[1];
  finish = undefined;
  current.close(1006);
  await waitFor(() => assert.equal(typeof finish, 'function'));
  runtime.destroy();
  finish(jsonResponse(snapshot()));
  await settle();
  assert.equal(FakeSocket.instances.length, 2, 'disposed checks cannot resurrect the socket');
});


test('transient handshake admission failures retain a bounded retry budget', async () => {
  resetEnvironment();
  const { runtime } = mount(bootstrap(), { live: true, liveOptions: {
    reconnectDelayMs: 5, maxReconnectDelayMs: 5, maxInitialReconnectAttempts: 1,
  } });
  await waitFor(() => assert.equal(FakeSocket.instances.length, 1));
  fetchRoute = () => jsonResponse({ error: { message: 'temporarily unavailable' } }, 503);
  FakeSocket.instances[0].close(1006);
  await waitFor(() => assert.equal(FakeSocket.instances.length, 2));
  assert.notEqual(runtime.getState(), 'denied', 'an outage is not revocation');
  FakeSocket.instances[1].close(1006);
  await settle();
  await settle();
  assert.equal(FakeSocket.instances.length, 2, 'admission checks cannot reset the retry budget');
  runtime.destroy();
});
