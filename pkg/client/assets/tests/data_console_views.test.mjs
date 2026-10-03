import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Data console views rendered by the shipped console runtime from the
// Go-generated Data golden (pkg/client/data_console_contract_test.go). The
// golden carries the six Data panel declarations and representative lifecycle
// states projected by admin/data_panels.go and served by a real console host.

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();
const here = path.dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(fs.readFileSync(path.join(here, 'fixtures/data-console-contract.json'), 'utf8'));

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
    FakeSocket.instances.push(this);
  }

  open() {
    this.readyState = FakeSocket.OPEN;
    this.onopen?.();
  }

  message(payload) {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }

  send() {}

  close(code = 1000) {
    if (this.readyState === FakeSocket.CLOSED) return;
    this.readyState = FakeSocket.CLOSED;
    this.onclose?.({ code });
  }
}

globalThis.WebSocket = FakeSocket;
win.WebSocket = FakeSocket;

let fetchRoute = () => new Response('{}', { status: 404 });
globalThis.fetch = async (input, init = {}) => fetchRoute({
  url: String(input),
  method: init.method || 'GET',
  body: init.body ? JSON.parse(init.body) : undefined,
});

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const { mountConsole } = await import('../dist/console/index.js');

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

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

function mount(bootstrap, options = {}) {
  win.document.body.innerHTML = '';
  win.sessionStorage.clear();
  FakeSocket.instances = [];
  const root = win.document.createElement('section');
  root.setAttribute('data-console-root', '');
  root.setAttribute('data-console-manual', '');
  root.innerHTML = `<script type="application/json" data-console-bootstrap>${JSON.stringify(bootstrap).replace(/</g, '\\u003c')}</script>`;
  win.document.body.appendChild(root);
  const runtime = mountConsole(root, { live: false, recoveryDelaysMs: [5], maxRecoveryAttempts: 1, ...options });
  return { root, runtime };
}

const squash = (value) => value.replace(/\s+/g, ' ').trim();

function panelText(root, runtime, panelId) {
  assert.equal(runtime.selectPanel(panelId), true, `panel ${panelId} is authorized and rendered`);
  return squash(root.querySelector('[data-console-panel]').textContent);
}

function rowTexts(root) {
  return Array.from(root.querySelectorAll('[data-console-panel] tbody tr'))
    .map((row) => squash(Array.from(row.cells).map((cell) => cell.textContent).join(' | ')));
}

function filterTo(root, id, value) {
  const select = root.querySelector(`[data-console-filters] select[data-filter="${id}"]`);
  assert.ok(select, `filter ${id} is rendered`);
  select.value = value;
  select.dispatchEvent(new win.Event('change', { bubbles: true }));
}

test('data console renders all seven Go-declared panels from the golden', async () => {
  const { root, runtime } = mount(golden.bootstrap);
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  assert.deepEqual([...runtime.getPanels()].sort(), ['coverage', 'datasets', 'explore', 'operations', 'overview', 'scenarios', 'verification']);
  const tabs = Array.from(root.querySelectorAll('[data-console-tab] .console-tab__label')).map((tab) => tab.textContent);
  assert.deepEqual([...tabs].sort(), ['Coverage', 'Datasets', 'Explore', 'Operations', 'Overview', 'Scenarios', 'Verification']);
  assert.equal(root.querySelector('[data-panel-degraded]'), null, 'every declared view uses a supported renderer');
  runtime.destroy();
});

test('without the explorer controller the Explore panel renders its own guidance', async () => {
  const { root, runtime } = mount(golden.bootstrap);
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  const text = panelText(root, runtime, 'explore');
  assert.ok(text.includes('Open the Data page to explore dataset descriptions'), text);
  assert.equal(root.querySelector('[data-console-tab-count="explore"]').hidden, true, 'Explore shows no count badge');
  assert.equal(root.querySelectorAll('[data-console-panel] form, [data-console-panel] [data-panel-action]').length, 0);
  runtime.destroy();
});

test('overview leads with the active dataset and explains unavailable actions', async () => {
  const { root, runtime } = mount(golden.bootstrap);
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  const text = panelText(root, runtime, 'overview');
  for (const fragment of [
    'ACTIVE', 'ready v1', 'crm/corpus-a v1', 'rcpt-ready-1',
    'Running operations', 'Failed operations',
    'staging | Recovery required',
    'Reset | Unsupported | Preview target has no safe deactivation',
    'Generate | Not permitted | Requires the data custodian grant',
    'Failed — stale generation',
  ]) {
    assert.ok(text.includes(fragment) || rowTexts(root).some((row) => row.includes(fragment)), `overview shows ${fragment}`);
  }
  runtime.destroy();
});

test('catalog, operation and evidence panels keep lifecycle states distinct', async () => {
  const { root, runtime } = mount(golden.bootstrap);
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));

  panelText(root, runtime, 'datasets');
  const datasets = rowTexts(root).join('\n');
  for (const fragment of ['crm/corpus-a v1 | aaaaaaaaaaaa | Synthetic', 'Source-backed', 'orders 40, people 120', 'holiday-calendar', 'Prepare: not permitted (Requires admin.data.prepare)']) {
    assert.ok(datasets.includes(fragment), `datasets show ${fragment}`);
  }

  panelText(root, runtime, 'scenarios');
  const scenarios = rowTexts(root).join('\n');
  for (const status of ['Active', 'Verified — not active', 'Prepared — not verified', 'Changed since verification', 'Not prepared']) {
    assert.ok(scenarios.includes(`| ${status} |`), `scenarios show ${status}`);
  }

  panelText(root, runtime, 'operations');
  const operations = rowTexts(root).join('\n');
  for (const outcome of [
    'Accepted — not started', 'Running — preparing', 'Recovering — writes paused', 'Failed — stale generation', 'Canceled',
    'Validation found problems', 'Verified — not active', 'Active — generation 3', 'Dry run planned — nothing changed',
    '40 of 100 · seed audiences',
  ]) {
    assert.ok(operations.includes(outcome), `operations show ${outcome}`);
  }

  panelText(root, runtime, 'verification');
  const checks = rowTexts(root).join('\n');
  for (const fragment of [
    'prerequisite.holiday-calendar | Failed | present | missing',
    'customer-search | Passed | 42 matches | 42 matches | evidence/search | Verification',
    'report-export | Failed | 120 rows | 118 rows',
    'analytics-render | Unavailable',
    'report-export | Planned — not executed | 120 rows',
    'Dry-run plan',
  ]) {
    assert.ok(checks.includes(fragment), `verification shows ${fragment}`);
  }
  const planned = rowTexts(root).filter((row) => row.includes('| Dry-run plan |'));
  assert.equal(planned.length, 1);
  assert.ok(planned[0].includes('| Planned — not executed |') && !planned[0].includes('Passed'), 'dry-run checks never read as executed');

  panelText(root, runtime, 'coverage');
  const coverage = rowTexts(root).join('\n');
  for (const fragment of [
    '2026-03-08 | America/Los_Angeles | Covered — no records | evidence/2026-03-08',
    'Suppressed by policy', 'Not covered', 'Partially covered', '2026-03-12 | America/Los_Angeles | Unavailable',
  ]) {
    assert.ok(coverage.includes(fragment), `coverage shows ${fragment}`);
  }
  runtime.destroy();
});

test('declared select filters narrow rows by projected labels', async () => {
  const { root, runtime } = mount(golden.bootstrap);
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  panelText(root, runtime, 'operations');
  filterTo(root, 'state', 'failed');
  assert.deepEqual(rowTexts(root).map((row) => row.split(' | ')[0]), ['op-0004']);
  panelText(root, runtime, 'scenarios');
  filterTo(root, 'status', 'Changed since verification');
  assert.equal(rowTexts(root).length, 1);
  assert.ok(rowTexts(root)[0].startsWith('reprofiled v2'));
  panelText(root, runtime, 'coverage');
  filterTo(root, 'coverage', 'Suppressed by policy');
  assert.deepEqual(rowTexts(root).map((row) => row.split(' | ')[0]), ['2026-03-09']);
  runtime.destroy();
});

test('an empty catalog renders explicit empty states instead of stale data', async () => {
  const { root, runtime } = mount(golden.empty_bootstrap);
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  assert.ok(panelText(root, runtime, 'overview').includes('No active dataset details available'));
  assert.ok(panelText(root, runtime, 'overview').includes('No managed targets rows available'));
  assert.ok(panelText(root, runtime, 'datasets').includes('No dataset catalog rows available'));
  assert.ok(panelText(root, runtime, 'operations').includes('No operation history rows available'));
  assert.ok(panelText(root, runtime, 'coverage').includes('No coverage periods rows available'));
  runtime.destroy();
});

test('a denied snapshot shows the access notice and no Data panels', async () => {
  fetchRoute = (call) => (call.url.endsWith('/api/snapshot')
    ? new Response(JSON.stringify({ error: { code: 'FORBIDDEN', message: 'forbidden' } }), { status: 403, headers: { 'content-type': 'application/json' } })
    : new Response('{}', { status: 404 }));
  const { snapshot: _snapshot, ...withoutSnapshot } = golden.bootstrap;
  const { root, runtime } = mount(withoutSnapshot);
  await waitFor(() => assert.equal(runtime.getState(), 'denied'));
  assert.ok(squash(root.querySelector('[data-console-notice]').textContent).includes('You do not have access to this console.'));
  assert.deepEqual(runtime.getPanels(), []);
  assert.equal(root.querySelectorAll('[data-console-panel] tbody tr').length, 0);
  runtime.destroy();
});

test('live Data events update rows, ignore stale revisions and remove deleted records', async () => {
  const { root, runtime } = mount(golden.bootstrap, { live: true });
  await waitFor(() => assert.equal(FakeSocket.instances.length, 1));
  const socket = FakeSocket.instances[0];
  const live = new URL(socket.url);
  assert.equal(live.pathname, '/admin/data/ws');
  assert.deepEqual(live.searchParams.get('panels').split(',').sort(), ['coverage', 'datasets', 'explore', 'operations', 'overview', 'scenarios', 'verification'], 'live delivery selects only the authorized Data panels');
  socket.open();
  socket.message(golden.bootstrap.snapshot);
  await waitFor(() => assert.equal(root.dataset.consoleSync, 'current'));
  const [started, switching, removed] = golden.events;

  socket.message(started);
  panelText(root, runtime, 'operations');
  await waitFor(() => assert.ok(rowTexts(root).some((row) => row.startsWith('op-0002 | Prepare | Running — allocating | running | 1 of 4 · allocate stage'))));

  socket.message(switching);
  await waitFor(() => assert.ok(panelText(root, runtime, 'overview').includes('SWITCH IN PROGRESS')));
  assert.ok(rowTexts(root).some((row) => row.startsWith('preview | Switch in progress')));

  socket.message(removed);
  panelText(root, runtime, 'datasets');
  await waitFor(() => assert.equal(rowTexts(root).length, 1));
  assert.ok(rowTexts(root)[0].startsWith('crm/corpus-a v1'));

  socket.message({ ...started, sequence: removed.sequence + 1, revision: started.revision - 1, data: { ...started.data, outcome: 'Accepted — not started' } });
  await settle();
  panelText(root, runtime, 'operations');
  assert.ok(rowTexts(root).some((row) => row.includes('Running — allocating')), 'an older revision never overwrites a newer row');
  runtime.destroy();
});

test('a policy close clears Data records, panels and identity-bound preferences', async () => {
  const { root, runtime } = mount(golden.bootstrap, { live: true });
  await waitFor(() => assert.equal(FakeSocket.instances.length, 1));
  const socket = FakeSocket.instances[0];
  socket.open();
  socket.message(golden.bootstrap.snapshot);
  runtime.selectPanel('operations');
  const namespace = `go-admin:console:${golden.bootstrap.preferences_namespace}:`;
  assert.ok(Object.keys(win.sessionStorage).some((key) => key.startsWith(namespace)), 'the active panel is remembered per identity');

  fetchRoute = (call) => (call.url.endsWith('/api/snapshot')
    ? new Response(JSON.stringify({ error: { code: 'FORBIDDEN', message: 'revoked' } }), { status: 403, headers: { 'content-type': 'application/json' } })
    : new Response('{}', { status: 404 }));
  socket.close(1008);
  await waitFor(() => assert.equal(runtime.getState(), 'denied'));
  assert.deepEqual(runtime.getPanels(), []);
  assert.equal(root.querySelectorAll('[data-console-panel] tbody tr').length, 0);
  assert.equal(Object.keys(win.sessionStorage).some((key) => key.startsWith(namespace)), false);
  await settle();
  assert.equal(FakeSocket.instances.length, 1, 'a revoked Data console does not reconnect');
  runtime.destroy();
});

test('the overview dashboard widget renders read-only from the host payload', async () => {
  win.document.body.innerHTML = '';
  const root = win.document.createElement('div');
  root.setAttribute('data-console-root', '');
  root.setAttribute('data-console-display', '');
  root.setAttribute('data-console-manual', '');
  root.innerHTML = `<script type="application/json" data-console-widget>${JSON.stringify(golden.widget).replace(/</g, '\\u003c')}</script><section class="console-panel" data-console-panel></section>`;
  win.document.body.appendChild(root);
  FakeSocket.instances = [];
  const runtime = mountConsole(root);
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  const text = squash(root.querySelector('[data-console-panel]').textContent);
  for (const fragment of ['ACTIVE', 'ready v1', 'Managed targets', 'Recovery required', 'Failed — stale generation']) {
    assert.ok(text.includes(fragment), `widget shows ${fragment}`);
  }
  assert.equal(root.querySelector('[data-console-tabs]')?.hidden ?? true, true);
  assert.equal(root.querySelectorAll('[data-panel-action], form[data-panel-action-form], [data-console-filters] select').length, 0);
  assert.equal(FakeSocket.instances.length, 0, 'widgets open no live stream');
  runtime.destroy();
});

test('an operator runs a server-offered action and sees acceptance without activation', async () => {
  const posts = [];
  let snapshots = 0;
  let next = golden.action_results.accepted;
  fetchRoute = (call) => {
    if (call.method === 'POST') {
      posts.push(call);
      return jsonResponse(next);
    }
    if (call.url.endsWith('/api/snapshot')) {
      snapshots += 1;
      return jsonResponse(golden.operator_bootstrap.snapshot);
    }
    return new Response('{}', { status: 404 });
  };
  const confirms = [];
  const { root, runtime } = mount(golden.operator_bootstrap, { confirm: (message) => { confirms.push(message); return true; } });
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  runtime.selectPanel('overview');
  const picker = root.querySelector('[data-panel-action-picker="overview"]');
  assert.ok(picker, 'the overview offers an action picker');
  const offered = Array.from(picker.options).map((option) => option.textContent.trim());
  assert.deepEqual(offered, ['Choose an action', 'Prepare dst-week v1 on preview', 'Activate another empty-history receipt', 'Activate rcpt-empty-1 (empty-history v1) at generation 3']);
  const prepare = Array.from(picker.options).find((option) => option.textContent.includes('Prepare'));
  picker.value = prepare.value;
  picker.dispatchEvent(new win.Event('change', { bubbles: true }));
  const form = root.querySelector(`form[data-panel-action-form][data-action-id="${prepare.value}"]`);
  assert.equal(form.closest('[data-panel-action-choice]').hidden, false);
  assert.deepEqual(Array.from(form.querySelectorAll('[data-action-field]')).map((field) => field.dataset.actionField), ['idempotency_key', 'dry_run', 'batch_limit']);
  form.querySelector('[data-action-field="idempotency_key"]').value = 'key-1';
  form.querySelector('[data-action-field="dry_run"]').checked = true;
  form.dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true }));

  await waitFor(() => assert.equal(posts.length, 1));
  assert.equal(new URL(posts[0].url, 'https://admin.example.test').pathname, `/admin/data/api/panels/overview/actions/${prepare.value}`);
  assert.deepEqual(posts[0].body, { idempotency_key: 'key-1', dry_run: true }, 'only operator request fields are submitted');
  await waitFor(() => assert.ok(squash(root.querySelector('[data-panel-action-result="overview"]').textContent).includes('Accepted prepare operation op-0010. It has not run yet; the active dataset is unchanged.')));
  await waitFor(() => assert.ok(snapshots >= 1, 'the outcome refreshes the panels from the read model'));
  assert.deepEqual(confirms, [], 'preparation needs no confirmation');

  next = golden.action_results.invalid;
  const again = root.querySelector(`form[data-panel-action-form][data-action-id="${prepare.value}"]`);
  again.querySelector('[data-action-field="idempotency_key"]').value = 'key-1';
  again.dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true }));
  await waitFor(() => assert.equal(posts.length, 2));
  await waitFor(() => {
    const error = root.querySelector(`form[data-action-id="${prepare.value}"] [data-action-field-error="idempotency_key"]`);
    assert.equal(error.hidden, false);
    assert.equal(error.textContent, 'Request keys must be unique per request.');
  });

  next = golden.action_results.stale;
  const activate = Array.from(picker.options).find((option) => option.textContent.includes('Activate rcpt-empty-1'));
  const activation = root.querySelector(`form[data-panel-action-form][data-action-id="${activate.value}"]`);
  activation.querySelector('[data-action-field="idempotency_key"]').value = 'key-2';
  activation.dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true }));
  await waitFor(() => assert.equal(posts.length, 3));
  assert.deepEqual(posts[2].body, { expected_generation: 3, idempotency_key: 'key-2', dry_run: false }, 'activation forwards the captured generation');
  assert.ok(confirms[0].includes('changes the active dataset on target preview'), 'activation asks for confirmation');
  await waitFor(() => assert.ok(squash(root.querySelector('[data-panel-action-result="overview"]').textContent).includes('The active dataset changed since this page loaded.')));

  runtime.selectPanel('operations');
  assert.ok(root.querySelector('[data-panel-action-picker="operations"] option:nth-child(2)').textContent.includes('Cancel op-0003'));
  runtime.destroy();
});

test('retained receipt and recovery controls submit only their declared inputs', async () => {
  const posts = [];
  const confirmations = [];
  fetchRoute = (call) => {
    if (call.method === 'POST') {
      posts.push(call);
      return jsonResponse({ ok: true, message: 'Completed.', refresh: false });
    }
    return new Response('{}', { status: 404 });
  };
  const { root, runtime } = mount(golden.operator_bootstrap, { confirm: (message) => { confirmations.push(message); return true; } });
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  runtime.selectPanel('overview');
  const picker = root.querySelector('[data-panel-action-picker="overview"]');
  const retained = Array.from(picker.options).find((option) => option.textContent.includes('Activate another'));
  picker.value = retained.value;
  picker.dispatchEvent(new win.Event('change', { bubbles: true }));
  const form = root.querySelector(`form[data-action-id="${retained.value}"]`);
  form.querySelector('[data-action-field="idempotency_key"]').value = 'retained-key';
  form.querySelector('[data-action-field="receipt_id"]').value = 'retained-receipt';
  form.dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true }));
  await waitFor(() => assert.equal(posts.length, 1));
  assert.deepEqual(posts[0].body, { expected_generation: 3, idempotency_key: 'retained-key', receipt_id: 'retained-receipt', dry_run: false });

  runtime.selectPanel('operations');
  const operations = root.querySelector('[data-panel-action-picker="operations"]');
  const recover = Array.from(operations.options).find((option) => option.textContent.includes('Recover'));
  operations.value = recover.value;
  operations.dispatchEvent(new win.Event('change', { bubbles: true }));
  const recovery = root.querySelector(`[data-panel-action][data-action-id="${recover.value}"]`);
  assert.ok(recovery, 'recovery renders a button without a form');
  assert.equal(root.querySelector(`[data-panel-action-choice="${recover.value}"] [data-action-field]`), null, 'recovery has no editable lifecycle inputs');
  recovery.click();
  await waitFor(() => assert.equal(posts.length, 2));
  assert.deepEqual(posts[1].body, {});
  assert.equal(confirmations.length, 2);
  assert.ok(confirmations[1].includes('op-0007'));
  runtime.destroy();
});

test('read-only Data consoles declare no action controls', async () => {
  const { root, runtime } = mount(golden.bootstrap);
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  for (const panel of runtime.getPanels()) {
    runtime.selectPanel(panel);
    assert.equal(root.querySelectorAll('[data-panel-action-picker], form[data-panel-action-form], [data-panel-action]').length, 0, `${panel} is read-only`);
  }
  runtime.destroy();
});

test('data console tabs follow declared panel order', async () => {
  const { runtime } = mount(golden.bootstrap);
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  assert.deepEqual(runtime.getPanels(), ['overview', 'datasets', 'scenarios', 'operations', 'verification', 'coverage', 'explore']);
  assert.equal(runtime.getActivePanel(), 'overview');
  runtime.destroy();
});
