import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Data console views rendered by the shipped console runtime from the
// Go-generated Data golden (pkg/client/data_console_contract_test.go). The
// golden carries the six Data panel declarations (Overview, Scenarios,
// Operations, Verification, Coverage, Explore), representative lifecycle
// states projected by admin/data_panels.go, the operator's drawer actions and
// row references, all served by a real console host.

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

const operator = golden.operator_bootstrap;
const panelOf = (bootstrap, id) => bootstrap.snapshot.panels.find((panel) => panel.id === id);
const recordOf = (bootstrap, id, predicate) => panelOf(bootstrap, id).records.find((record) => predicate(record.data));
const actionOf = (bootstrap, id, predicate) => panelOf(bootstrap, id).ui.actions.find(predicate);
const receiptOptions = {
  items: [
    { value: 'rcpt-empty-1', label: 'Quiet · revision 1 · Verified · rcpt-empty-1', description: 'rcpt-empty-1' },
    { value: 'rcpt-empty-0', label: 'Quiet · revision 0 · Prepared · rcpt-empty-0', description: 'Activation requires a passed verification of the current content.', disabled: true },
  ],
  selected: [{ value: 'rcpt-empty-1', label: 'Quiet · revision 1 · Verified · rcpt-empty-1' }],
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function badges(root) {
  return Array.from(root.querySelectorAll('[data-console-panel] .console-badge')).map((badge) => [badge.textContent.trim(), Array.from(badge.classList).find((name) => name.startsWith('console-badge--'))?.replace('console-badge--', '') || '']);
}

function refButton(root, actionId) {
  return root.querySelector(`[data-console-panel] [data-console-action-ref][data-action-id="${actionId}"]`);
}

function drawerForm(root) {
  return root.querySelector('[data-console-drawer] form[data-panel-action-form]');
}

/** Routes operator traffic: snapshot refreshes, receipt option pages and action posts. */
function operatorServer(results) {
  const server = { posts: [], options: [], snapshots: 0 };
  fetchRoute = (call) => {
    const url = new URL(call.url, 'https://admin.example.test');
    if (call.method === 'POST') {
      server.posts.push({ path: url.pathname, body: call.body });
      return jsonResponse(results.shift() || golden.action_results.accepted);
    }
    if (url.pathname.endsWith('/api/snapshot')) {
      server.snapshots += 1;
      return jsonResponse(operator.snapshot);
    }
    if (url.pathname.includes('/options/')) {
      server.options.push(url);
      // The pinned default resolves through `value=`, as the module does with an exact lookup.
      const pinned = url.searchParams.getAll('value').filter(Boolean);
      const selected = pinned.map((value) => receiptOptions.items.find((item) => item.value === value) || { value, label: `${value} · revision 1 · Prepared · ${value}` });
      return jsonResponse({ ...receiptOptions, selected });
    }
    return new Response('{}', { status: 404 });
  };
  return server;
}


const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

async function waitFor(assertion, timeoutMs = 1000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      return assertion();
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

/** Text with a space between inline elements, so a title and its secondary line stay readable. */
function nodeText(node) {
  if (node.nodeType === 3) return node.textContent;
  return Array.from(node.childNodes).map(nodeText).join(' ');
}

function rowTexts(root) {
  return Array.from(root.querySelectorAll('[data-console-panel] tbody tr'))
    .map((row) => squash(Array.from(row.cells).map((cell) => nodeText(cell)).join(' | ')));
}

function filterTo(root, id, value) {
  const select = root.querySelector(`[data-console-filters] select[data-filter="${id}"]`);
  assert.ok(select, `filter ${id} is rendered`);
  select.value = value;
  select.dispatchEvent(new win.Event('change', { bubbles: true }));
}

test('data console renders the six Go-declared panels in the approved order', async () => {
  const { root, runtime } = mount(golden.bootstrap);
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  assert.deepEqual(runtime.getPanels(), ['overview', 'scenarios', 'operations', 'verification', 'coverage', 'explore']);
  assert.equal(runtime.getActivePanel(), 'overview');
  const tabs = Array.from(root.querySelectorAll('[data-console-tab] .console-tab__label')).map((tab) => tab.textContent);
  assert.deepEqual(tabs, ['Overview', 'Scenarios', 'Operations', 'Verification', 'Coverage', 'Explore']);
  assert.equal(root.querySelector('[data-panel-degraded]'), null, 'every declared view uses a supported renderer');
  assert.equal(root.querySelector('[data-console-tab-count="overview"]').hidden, true, 'the Overview shows no count');
  const count = (id) => root.querySelector(`[data-console-tab-count="${id}"]`);
  assert.deepEqual([count('scenarios').textContent, count('explore').textContent, count('coverage').textContent], ['5', '2', '5'], 'catalog and evidence counts are neutral');
  assert.equal(count('operations').textContent, '4', 'Operations badges queued, running and failed work');
  assert.equal(count('operations').dataset.tone, 'error');
  assert.equal(count('verification').textContent, '2', 'Verification badges failed checks');
  assert.equal(count('verification').dataset.tone, 'error');
  runtime.destroy();
});

test('overview answers what each target serves, what needs attention and what is next, without the capability matrix', async () => {
  const { root, runtime } = mount(golden.bootstrap);
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  const text = panelText(root, runtime, 'overview');
  for (const fragment of [
    'Needs attention', 'staging needs recovery', 'Activate Quiet failed',
    'Managed targets', 'Ready', 'Customer corpus A · ready v1', 'Recovery required', 'Writes are paused until recovery completes.',
    'Up next', 'Quiet', 'dst-week v1', 'Recent operations', 'Refresh Ready', 'Running · preparing', 'Active · generation 3', 'All operations',
  ]) {
    assert.ok(text.includes(fragment), `overview shows ${fragment}: ${text}`);
  }
  for (const noise of ['Availability', 'safe_reset_unavailable', 'Summary', 'Running operations', 'Failed operations', 'Latest operation', 'NOTHING ACTIVE']) {
    assert.ok(!text.includes(noise), `overview no longer shows ${noise}`);
  }
  const cards = root.querySelectorAll('[data-console-panel] .console-card');
  assert.equal(cards.length, 2, 'up to four targets render as cards');
  assert.ok(badges(root).some(([label, tone]) => label === 'Active' && tone === 'success'));
  assert.ok(badges(root).some(([label, tone]) => label === 'Recovery required' && tone === 'error'));
  assert.ok(root.querySelector('[data-console-panel] .console-progress__bar'), 'the running refresh shows progress');
  assert.equal(root.querySelectorAll('[data-console-panel] [data-console-action-ref], [data-console-panel] form').length, 0, 'a read-only console renders no action controls');
  runtime.destroy();
});

test('scenarios are the workspace: titles, lifecycle steps, tones and short copyable receipts', async () => {
  const { root, runtime } = mount(golden.bootstrap);
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  panelText(root, runtime, 'scenarios');
  const headers = Array.from(root.querySelectorAll('[data-console-panel] thead th')).map((th) => th.textContent.trim());
  assert.deepEqual(headers, ['Scenario', 'Lifecycle', 'Status', 'Receipt', 'Last activity', 'Actions']);
  const rows = rowTexts(root);
  assert.equal(rows.length, 5);
  assert.ok(rows[0].startsWith('Ready Customer corpus A · ready v1 |'), rows[0]);
  assert.ok(rows[1].startsWith('Quiet Customer corpus A · empty-history v1 |'), rows[1]);
  assert.ok(rows[4].startsWith('backfill v1 crm/corpus-b v2 · backfill v1 |'), 'datasets without declared titles fall back to identifiers');
  for (const status of ['Active', 'Verified', 'Prepared', 'Changed since verification', 'Not prepared']) {
    assert.ok(rows.some((row) => row.includes(`| ${status} |`)), `scenarios show ${status}`);
  }
  assert.equal(root.querySelectorAll('[data-console-panel] ol.console-steps').length, 5, 'every row shows its lifecycle steps');
  assert.ok(root.querySelector('[data-console-panel] .console-step--current .console-step__label').textContent.includes('Active'), 'the active row is at its last step');
  assert.ok(badges(root).some(([label, tone]) => label === 'Changed since verification' && tone === 'warning'));
  assert.ok(root.querySelector('[data-console-panel] [data-copy-content="rcpt-ready-1"]'), 'receipts are copyable');
  const text = squash(root.querySelector('[data-console-panel]').textContent);
  for (const noise of ['Profile', 'Digest', '111111111111', 'aaaaaaaaaaaa']) {
    assert.ok(!text.includes(noise), `scenarios no longer show ${noise}`);
  }
  assert.ok(root.querySelector('[data-console-panel] time.console-timestamp'), 'last activity is relative');
  runtime.destroy();
});

test('operations, verification and coverage keep lifecycle states distinct with tones instead of raw enums', async () => {
  const { root, runtime } = mount(golden.bootstrap);
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));

  panelText(root, runtime, 'operations');
  const operations = rowTexts(root).join('\n');
  for (const fragment of [
    'Validate backfill v1', 'Validation found problems', 'Prepare dst-week v1', 'Queued', 'Refresh Ready', 'Running · preparing', '40 of 100 · Seeding audiences',
    'Activate Quiet', 'Failed: active dataset changed', 'Prepare reprofiled v2', 'Canceled', 'Recovering, writes paused', 'Verified', 'Active · generation 3', 'Plan ready, nothing changed',
  ]) {
    assert.ok(operations.includes(fragment), `operations show ${fragment}: ${operations}`);
  }
  assert.ok(!operations.includes('| succeeded |') && !operations.includes('| failed |'), 'no raw state enum column');
  const tones = badges(root);
  assert.ok(tones.some(([label, tone]) => label === 'Plan ready, nothing changed' && tone === 'planned'), 'planned work is visually distinct');
  assert.ok(tones.some(([label, tone]) => label === 'Failed: active dataset changed' && tone === 'error'));
  assert.ok(root.querySelector('[data-console-panel] [data-copy-content="op-0003"]'), 'the reference stays copyable');

  panelText(root, runtime, 'verification');
  const checks = rowTexts(root).join('\n');
  for (const fragment of [
    'Holiday calendar present prerequisite.holiday-calendar | Failed | present | missing | backfill v1 Validation · operation op-0001',
    'Customer search customer-search | Passed | 42 matches | 42 matches | Ready Verification · receipt rcpt-ready-1 | evidence/search',
    'Report export report-export | Failed | 120 rows | 118 rows',
    'analytics-render analytics-render | Unavailable',
    'Source matches the catalog source-identity | Passed | aaaaaaaaaaaa… | aaaaaaaaaaaa…',
    'Report export report-export | Planned, not executed | 120 rows | — | dst-week v1 Dry-run plan',
  ]) {
    assert.ok(checks.includes(fragment), `verification shows ${fragment}: ${checks}`);
  }
  const planned = rowTexts(root).filter((row) => row.includes('Dry-run plan'));
  assert.equal(planned.length, 1);
  assert.ok(planned[0].includes('| Planned, not executed |') && !planned[0].includes('Passed'), 'dry-run checks never read as executed');

  panelText(root, runtime, 'coverage');
  const coverage = rowTexts(root).join('\n');
  for (const fragment of [
    '2026-03-08 | America/Los_Angeles | Covered, no records | Ready receipt rcpt-ready-1 | evidence/2026-03-08',
    'Suppressed by policy', 'Not covered', 'Partially covered', '2026-03-12 | America/Los_Angeles | Unavailable',
  ]) {
    assert.ok(coverage.includes(fragment), `coverage shows ${fragment}`);
  }
  runtime.destroy();
});

test('the Explore panel serves the dataset catalog without the explorer controller', async () => {
  const { root, runtime } = mount(golden.bootstrap);
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  const text = panelText(root, runtime, 'explore');
  for (const fragment of ['Customer corpus A', 'Synthetic customers and their orders for sales reporting checks.', 'crm/corpus-b v2', 'Source-backed', '40 orders, 120 people', 'America/Los_Angeles']) {
    assert.ok(text.includes(fragment), `explore shows ${fragment}: ${text}`);
  }
  assert.equal(rowTexts(root).length, 2);
  assert.ok(!text.includes('aaaaaaaaaaaa'), 'digests stay out of the catalog');
  assert.equal(root.querySelectorAll('[data-console-panel] form, [data-console-panel] [data-console-action-ref]').length, 0);
  runtime.destroy();
});

test('declared select filters narrow rows by projected labels', async () => {
  const { root, runtime } = mount(golden.bootstrap);
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  panelText(root, runtime, 'operations');
  filterTo(root, 'state', 'Failed');
  assert.deepEqual(rowTexts(root).map((row) => row.split(' | ')[0]), ['Activate Quiet Customer corpus A · preview']);
  panelText(root, runtime, 'scenarios');
  filterTo(root, 'status', 'Changed since verification');
  assert.equal(rowTexts(root).length, 1);
  assert.ok(rowTexts(root)[0].startsWith('reprofiled v2'));
  panelText(root, runtime, 'coverage');
  filterTo(root, 'coverage', 'Suppressed by policy');
  assert.deepEqual(rowTexts(root).map((row) => row.split(' | ')[0]), ['2026-03-09']);
  runtime.destroy();
});

test('an empty catalog renders each view\'s own guidance and hides the attention list', async () => {
  const { root, runtime } = mount(golden.empty_bootstrap);
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  const overview = panelText(root, runtime, 'overview');
  assert.ok(!overview.includes('Needs attention'), 'nothing needs attention, so the list is not rendered');
  assert.ok(overview.includes('No managed targets.'));
  assert.ok(overview.includes('Nothing is waiting on a step. Prepare a scenario to start.'));
  assert.ok(overview.includes('No operations yet.'));
  assert.ok(panelText(root, runtime, 'scenarios').includes('No scenarios yet. Datasets appear here once a provider publishes them.'));
  assert.ok(panelText(root, runtime, 'operations').includes('No operations yet. Prepare a scenario to start.'));
  assert.ok(panelText(root, runtime, 'verification').includes('No checks yet. Validation and verification results appear here.'));
  assert.ok(panelText(root, runtime, 'coverage').includes('No verified coverage yet. Verify a prepared receipt to see which days it covers.'));
  assert.ok(panelText(root, runtime, 'explore').includes('No datasets are available to explore.'));
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
  assert.deepEqual(live.searchParams.get('panels').split(',').sort(), ['coverage', 'explore', 'operations', 'overview', 'scenarios', 'verification'], 'live delivery selects only the authorized Data panels');
  socket.open();
  socket.message(golden.bootstrap.snapshot);
  await waitFor(() => assert.equal(root.dataset.consoleSync, 'current'));
  const [started, switching, removed] = golden.events;

  socket.message(started);
  panelText(root, runtime, 'operations');
  await waitFor(() => assert.ok(rowTexts(root).some((row) => row.startsWith('Prepare dst-week v1 Customer corpus A · preview | Running · allocating | 1 of 4 · Allocating stage'))));

  socket.message(switching);
  await waitFor(() => assert.ok(panelText(root, runtime, 'overview').includes('Switching')));
  assert.ok(panelText(root, runtime, 'overview').includes('An activation is in progress.'));

  socket.message(removed);
  panelText(root, runtime, 'explore');
  await waitFor(() => assert.equal(rowTexts(root).length, 1));
  assert.ok(rowTexts(root)[0].startsWith('Customer corpus A'));

  socket.message({ ...started, sequence: removed.sequence + 1, revision: started.revision - 1, data: { ...started.data, outcome: 'Queued' } });
  await settle();
  panelText(root, runtime, 'operations');
  assert.ok(rowTexts(root).some((row) => row.includes('Running · allocating')), 'an older revision never overwrites a newer row');
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
  for (const fragment of ['Needs attention', 'Managed targets', 'Ready', 'Recovery required', 'Up next', 'Recent operations']) {
    assert.ok(text.includes(fragment), `widget shows ${fragment}`);
  }
  assert.equal(root.querySelector('[data-console-tabs]')?.hidden ?? true, true);
  assert.equal(root.querySelectorAll('[data-panel-action], form[data-panel-action-form], [data-console-action-ref], [data-console-filters] select').length, 0);
  assert.equal(FakeSocket.instances.length, 0, 'widgets open no live stream');
  runtime.destroy();
});

test('an operator activates from the scenario row: drawer, receipt picker, generated request ID and before/after confirmation', async () => {
  const server = operatorServer([golden.action_results.accepted]);
  const confirmations = [];
  const { root, runtime } = mount(operator, { confirm: (message, request) => { confirmations.push(request); return true; } });
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  runtime.selectPanel('scenarios');
  assert.equal(root.querySelector('[data-panel-action-picker]'), null, 'no global action picker');
  const quiet = recordOf(operator, 'scenarios', (data) => data.title === 'Quiet');
  const primary = quiet.data.actions.find((ref) => ref.emphasis === 'primary');
  const button = refButton(root, primary.action_id);
  assert.ok(button, 'the next step is a row button');
  assert.equal(button.textContent.trim(), 'Activate');
  assert.ok(button.classList.contains('console-btn--primary'));
  assert.ok(root.querySelector(`[data-console-panel] details.console-menu [data-action-id="${quiet.data.actions.find((ref) => ref.emphasis === 'menu').action_id}"]`), 'routine work sits in the overflow menu');

  button.click();
  const form = await waitFor(() => {
    const found = drawerForm(root);
    assert.ok(found, 'the row action opens a drawer');
    return found;
  });
  const drawer = root.querySelector('[data-console-drawer]');
  assert.equal(drawer.querySelector('.console-drawer__title').textContent, 'Activate Quiet');
  const drawerText = squash(drawer.textContent);
  for (const fragment of ['Switches preview to the chosen prepared receipt', 'Prepared', 'Verified', 'Customer corpus A', 'Preview plan', 'Advanced']) {
    assert.ok(drawerText.includes(fragment), `drawer explains ${fragment}: ${drawerText}`);
  }
  assert.ok(!drawerText.includes('Request key'), 'operators never type a request key');
  const generated = form.querySelector('input[data-action-field-generated]');
  assert.ok(generated.readOnly && UUID.test(generated.value), 'the request ID is generated, read-only and under Advanced');
  assert.equal(generated.closest('.console-advanced')?.dataset.expanded, 'false', 'Advanced starts collapsed');
  const receipt = await waitFor(() => {
    const select = form.querySelector('select[data-action-field="receipt_id"]');
    assert.ok(select && Array.from(select.options).some((option) => option.value === 'rcpt-empty-1'));
    return select;
  });
  assert.equal(receipt.value, 'rcpt-empty-1', 'the newest verified receipt is preselected');
  assert.ok(Array.from(receipt.options).some((option) => option.value === 'rcpt-empty-0' && option.disabled), 'unverified receipts are listed disabled');
  assert.ok(server.options[0].pathname.endsWith(`/api/panels/scenarios/actions/${primary.action_id}/options/receipt_id`));

  form.requestSubmit(form.querySelector('[data-submitter="primary"]'));
  await waitFor(() => assert.equal(server.posts.length, 1));
  assert.equal(confirmations.length, 1);
  assert.equal(confirmations[0].title, 'Activate Quiet on preview?');
  assert.deepEqual(confirmations[0].changes.map((change) => [change.label, change.before, change.after]), [['Scenario', 'Ready', 'Quiet'], ['Receipt', 'rcpt-ready-1', 'rcpt-empty-1'], ['Generation', '3', '4']]);
  assert.equal(server.posts[0].path, `/admin/data/api/panels/scenarios/actions/${primary.action_id}`);
  const { idempotency_key: requestID, ...rest } = server.posts[0].body;
  assert.deepEqual(rest, { expected_generation: 3, receipt_id: 'rcpt-empty-1', page_limit: 10, timeout_seconds: 60, dry_run: false });
  assert.equal(requestID, generated.value, 'the generated ID is the submitted request ID');
  await waitFor(() => assert.equal(drawerForm(root), null, 'the outcome closes its drawer'));
  const banner = root.querySelector('[data-console-banner]');
  assert.ok(banner && banner.textContent.includes('accepted. It has not run yet; what preview serves is unchanged.'), banner?.textContent);
  assert.equal(banner.dataset.tone, 'info');
  assert.ok(banner.querySelector('[data-console-record-link][data-record-key="op-0010"]'), 'the result links to its operation');
  runtime.destroy();
});

test('Preview plan is a separate submitter with its own request ID, and not-permitted work stays visible but inert', async () => {
  const server = operatorServer([golden.action_results.planned]);
  const { root, runtime } = mount(operator, { confirm: () => true });
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  runtime.selectPanel('scenarios');
  const dst = recordOf(operator, 'scenarios', (data) => data.title === 'dst-week v1');
  const verify = dst.data.actions.find((ref) => ref.emphasis === 'primary');
  refButton(root, verify.action_id).click();
  const form = await waitFor(() => {
    const found = drawerForm(root);
    assert.ok(found);
    return found;
  });
  await waitFor(() => assert.equal(form.querySelector('select[data-action-field="receipt_id"]').value, 'rcpt-dst-1', 'the preselected receipt beyond the page resolves through the exact lookup'));
  const planID = form.querySelector('input[data-action-field-generated]').value;
  form.requestSubmit(form.querySelector('[data-submitter="secondary"]'));
  await waitFor(() => assert.equal(server.posts.length, 1));
  assert.equal(server.posts[0].body.dry_run, true, 'Preview plan runs a dry run');
  assert.equal(server.posts[0].body.idempotency_key, planID);
  const banner = await waitFor(() => {
    const found = root.querySelector('[data-console-banner]');
    assert.ok(found);
    return found;
  });
  assert.equal(banner.dataset.tone, 'planned');
  assert.ok(banner.textContent.includes('Nothing changed; 1 check is planned, not executed.'), banner.textContent);

  // A disabled declaration renders with its reason and never dispatches.
  const prepare = actionOf(operator, 'scenarios', (action) => action.kind === 'prepare');
  assert.equal(prepare.availability, 'not_permitted');
  const bootstrap = structuredClone(operator);
  const backfill = panelOf(bootstrap, 'scenarios').records.find((record) => record.data.title === 'backfill v1');
  backfill.data.actions = [{ panel_id: 'scenarios', action_id: prepare.id, emphasis: 'primary' }];
  runtime.destroy();
  const second = mount(bootstrap, { confirm: () => true });
  await waitFor(() => assert.equal(second.runtime.getState(), 'ready'));
  second.runtime.selectPanel('scenarios');
  const disabled = refButton(second.root, prepare.id);
  assert.equal(disabled.getAttribute('aria-disabled'), 'true');
  assert.equal(disabled.getAttribute('title'), 'Requires admin.data.prepare');
  disabled.click();
  await settle();
  assert.equal(drawerForm(second.root), null);
  assert.equal(server.posts.length, 1, 'the disabled action never posts');
  second.runtime.destroy();
});

test('operations offer Cancel, Recover and Try again from their rows with structured confirmations', async () => {
  const server = operatorServer([{ ok: true, message: 'Cancellation requested for Refresh of Ready. It stops at the next safe point; a committed activation is not undone.', refresh: false, tone: 'info' }]);
  const confirmations = [];
  const { root, runtime } = mount(operator, { confirm: (message, request) => { confirmations.push(request); return true; } });
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  runtime.selectPanel('operations');
  const running = recordOf(operator, 'operations', (data) => data.operation_id === 'op-0003');
  const cancel = running.data.actions.find((ref) => ref.action_id.startsWith('cancel-'));
  const failed = recordOf(operator, 'operations', (data) => data.operation_id === 'op-0004');
  const retry = failed.data.actions.find((ref) => ref.emphasis === 'primary');
  assert.equal(refButton(root, retry.action_id).textContent.trim(), 'Try again');
  const recovering = recordOf(operator, 'operations', (data) => data.operation_id === 'op-0006');
  assert.equal(refButton(root, recovering.data.actions[0].action_id).textContent.trim(), 'Recover');

  refButton(root, cancel.action_id).click();
  const form = await waitFor(() => {
    const found = drawerForm(root);
    assert.ok(found);
    return found;
  });
  assert.ok(squash(root.querySelector('[data-console-drawer]').textContent).includes('stop at its next safe point'));
  form.requestSubmit(form.querySelector('[data-submitter="primary"]'));
  await waitFor(() => assert.equal(server.posts.length, 1));
  assert.equal(confirmations[0].title, 'Cancel the work on Ready?');
  assert.equal(server.posts[0].path, `/admin/data/api/panels/operations/actions/${cancel.action_id}`);
  assert.ok(UUID.test(server.posts[0].body.idempotency_key));
  assert.equal(server.posts[0].body.dry_run, undefined, 'cancellation has no plan');
  await waitFor(() => assert.ok(root.querySelector('[data-console-banner]')?.textContent.includes('Cancellation requested for Refresh of Ready.')));
  runtime.destroy();
});

test('read-only Data consoles declare no action controls', async () => {
  const { root, runtime } = mount(golden.bootstrap);
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  for (const panel of runtime.getPanels()) {
    runtime.selectPanel(panel);
    assert.equal(root.querySelectorAll('[data-panel-action-picker], form[data-panel-action-form], [data-panel-action], [data-console-action-ref]').length, 0, `${panel} is read-only`);
  }
  runtime.destroy();
});
