import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Data explorer (Explore panel) rendered by the shipped Data console entry
// from the Go-generated Data golden. Explore reads go through the real HTTP
// transport against a stubbed fetch that answers with explorer fixtures built
// from the frozen data.Explore* wire types (pkg/client/data_explorer_contract_test.go).

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
const explorer = JSON.parse(fs.readFileSync(path.join(here, 'fixtures/data-explorer-contract.json'), 'utf8'));

const dom = new JSDOM('<!doctype html><html><head><meta name="csrf-token" content="csrf-1"></head><body></body></html>', {
  url: 'https://admin.example.test/admin/data',
  pretendToBeVisual: true,
});
const win = dom.window;
for (const name of [
  'window', 'document', 'Node', 'Element', 'HTMLElement', 'HTMLButtonElement', 'HTMLFormElement',
  'HTMLInputElement', 'HTMLSelectElement', 'HTMLTextAreaElement', 'HTMLScriptElement', 'HTMLTemplateElement',
  'Event', 'CustomEvent', 'KeyboardEvent', 'MouseEvent', 'SubmitEvent', 'MutationObserver',
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

const ROUTES = {
  metadata: '/admin/data/api/explore/metadata',
  samples: '/admin/data/api/explore/samples',
  related: '/admin/data/api/explore/related',
};

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const errorResponse = (status, message) => jsonResponse({ error: { message } }, status);

/** Same identity tuple as the explorer's selectionKey. */
function key(selection) {
  const { dataset, scenario } = selection;
  return JSON.stringify([
    selection.context, selection.target_id, dataset.provider, dataset.id, dataset.version, dataset.digest,
    scenario.id, scenario.version, scenario.profile_hash, selection.receipt_id || '', selection.content_revision ?? 0, selection.generation ?? -1,
  ]);
}

const fixtureMetadata = new Map(explorer.metadata.map((metadata) => [key(metadata.selection), metadata]));

function sampleKey(request) {
  return JSON.stringify([key(request.selection), request.entity_id, request.cursor || '', request.record_key || '', request.relationship_id || '']);
}

const fixtureSamples = new Map(explorer.samples.map((page) => [sampleKey(page.request), page.response]));

/**
 * Explore read stub. Metadata `answers` map a selection key (or 'default') to
 * a response factory; `answers.samples(request)` may answer a samples or
 * related read (undefined falls back to the fixture). Deferred answers wait
 * for `release`. Every request records its parsed URL and abort signal.
 */
function exploreServer(answers = {}) {
  const server = { requests: [], deferred: [] };
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input), 'https://admin.example.test');
    if (url.pathname === '/admin/data/api/snapshot') {
      server.snapshots = (server.snapshots || 0) + 1;
      return answers.snapshot ? answers.snapshot() : jsonResponse(golden.bootstrap.snapshot);
    }
    if (!url.pathname.startsWith('/admin/data/api/explore/')) return new Response('{}', { status: 404 });
    const selection = JSON.parse(url.searchParams.get('selection'));
    const kind = url.pathname.split('/').pop();
    const read = {
      selection,
      entity_id: url.searchParams.get('entity_id') || '',
      cursor: url.searchParams.get('cursor') || '',
      record_key: url.searchParams.get('record_key') || '',
      relationship_id: url.searchParams.get('relationship_id') || '',
    };
    const request = { url, kind, selection, read, signal: init.signal };
    server.requests.push(request);
    const answer = kind === 'metadata' ? answers[key(selection)] || answers.default : answers.samples?.(read);
    const respond = () => {
      if (answer) return answer(selection, read);
      if (kind !== 'metadata') {
        const page = fixtureSamples.get(sampleKey(read));
        return page ? jsonResponse(page) : errorResponse(404, 'gone');
      }
      const metadata = fixtureMetadata.get(key(selection));
      return metadata ? jsonResponse(metadata) : errorResponse(404, 'gone');
    };
    if (answer?.deferred) {
      return new Promise((resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new win.DOMException('aborted', 'AbortError')), { once: true });
        server.deferred.push({ request, release: () => resolve(respond()) });
      });
    }
    return respond();
  };
  return server;
}

function deferred(factory) {
  const answer = (selection) => factory(selection);
  answer.deferred = true;
  return answer;
}

const { mountDataConsole, getDataExplorer } = await import('../dist/console/data.js');

const settle = () => new Promise((resolve) => setTimeout(resolve, 15));

async function waitFor(assertion, timeoutMs = 1500) {
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

function bootstrapWith(extra = {}) {
  return { ...golden.bootstrap, extensions: { data_explorer: ROUTES }, ...extra };
}

function mount(bootstrap = bootstrapWith(), options = {}) {
  win.document.body.innerHTML = '';
  win.sessionStorage.clear();
  const root = win.document.createElement('section');
  root.setAttribute('data-console-root', '');
  root.setAttribute('data-console-manual', '');
  root.innerHTML = `<script type="application/json" data-console-bootstrap>${JSON.stringify(bootstrap).replace(/</g, '\\u003c')}</script>`;
  win.document.body.appendChild(root);
  const runtime = mountDataConsole(root, { live: false, recoveryDelaysMs: [5], maxRecoveryAttempts: 1, ...options });
  return { root, runtime };
}

const squash = (value) => value.replace(/\s+/g, ' ').trim();
/** Visible and screen-reader text with element boundaries kept as spaces. */
function textOf(element) {
  if (!element) return '';
  const walker = win.document.createTreeWalker(element, win.NodeFilter.SHOW_TEXT);
  const parts = [];
  while (walker.nextNode()) parts.push(walker.currentNode.nodeValue);
  return squash(parts.join(' '));
}
const explorerRoot = (root) => root.querySelector('[data-console-panel] > [data-data-explorer]');
const explorerText = (root) => textOf(explorerRoot(root));
const cards = (root) => Array.from(root.querySelectorAll('.console-explorer__card'));
const click = (element) => element.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));
const key_ = (element, keyName) => element.dispatchEvent(new win.KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true }));

function cardFor(root, title) {
  const card = cards(root).find((candidate) => textOf(candidate.querySelector('.console-card__title')).startsWith(title));
  assert.ok(card, `card ${title} is rendered`);
  return card;
}

async function openDetails(root, title) {
  click(cardFor(root, title).querySelector('[data-explorer-action="open"]'));
  return waitFor(() => {
    const heading = root.querySelector('.console-explorer__title');
    assert.ok(heading, 'details heading is rendered');
    return heading;
  });
}

function sectionText(root) {
  return textOf(root.querySelector('.console-explorer__section'));
}

async function showSection(root, id) {
  click(root.querySelector(`[data-explorer-section="${id}"]`));
  await waitFor(() => assert.equal(root.querySelector('.console-explorer__section').dataset.explorerSectionPanel, id));
  return sectionText(root);
}

test('Explore cards describe authorized datasets lazily and keep catalog counts scoped', async () => {
  const server = exploreServer();
  const { root, runtime } = mount();
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  assert.equal(server.requests.length, 0, 'nothing is read before Explore is shown');
  assert.equal(runtime.selectPanel('explore'), true);
  await waitFor(() => assert.ok(explorerText(root).includes('Customer corpus A')));
  assert.equal(cards(root).length, 2, 'one card per authorized dataset');

  const corpusA = textOf(cardFor(root, 'Customer corpus A'));
  for (const fragment of [
    'Synthetic', 'v1', 'Synthetic customers and their orders for sales reporting checks.',
    'Ready Active', 'Quiet Verified — not active', 'dst-week v1 Prepared — not verified',
    'Catalog inventory orders 40, people 120', 'Provider crm', 'View details',
  ]) {
    assert.ok(corpusA.includes(fragment), `corpus A card shows ${fragment}: ${corpusA}`);
  }
  assert.ok(!corpusA.includes('aaaaaaaaaaaa'), 'hashes stay out of the card');

  // Only one description per card, for the card's own catalog example.
  assert.deepEqual(server.requests.map((request) => `${request.selection.dataset.id}/${request.selection.scenario.id}/${request.selection.context}`).sort(),
    ['corpus-a/ready/catalog_example', 'corpus-b/reprofiled/catalog_example']);
  assert.equal(server.requests[0].url.pathname, ROUTES.metadata);
  runtime.destroy();
});

test('provider strings render as text, never markup or links', async () => {
  exploreServer();
  window.__explorerXSS = undefined;
  const { root, runtime } = mount();
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  runtime.selectPanel('explore');
  await waitFor(() => assert.ok(explorerText(root).includes('Corpus B <img')));
  await openDetails(root, 'Corpus B');
  for (const section of ['about', 'contents', 'usage', 'scenarios', 'evidence']) {
    await showSection(root, section);
    assert.equal(explorerRoot(root).querySelectorAll('img, script, a[href^="javascript"]').length, 0, `${section} renders no provider markup`);
  }
  await settle();
  assert.equal(window.__explorerXSS, undefined, 'no provider handler ran');
  runtime.destroy();
});

test('details compose About, Contents, Used by, Scenarios and Evidence for the exact selection', async () => {
  exploreServer();
  const { root, runtime } = mount();
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  runtime.selectPanel('explore');
  await waitFor(() => assert.ok(explorerText(root).includes('Customer corpus A')));
  const heading = await openDetails(root, 'Customer corpus A');
  await waitFor(() => assert.equal(win.document.activeElement, heading, 'opening details focuses the dataset heading'));

  const header = textOf(root.querySelector('.console-explorer__header'));
  assert.ok(header.includes('Catalog example: what the provider declares this scenario contains. It is not observed data'), header);
  assert.equal(root.querySelector('select[data-explorer-control="scenario"]').value.startsWith('scenario-'), true);
  assert.equal(root.querySelector('input[value="catalog_example"]').checked, true, 'details open on the catalog example');
  assert.equal(root.querySelector('input[value="prepared"]').disabled, false, 'Ready has a prepared receipt');
  assert.equal(root.querySelector('input[value="active"]').disabled, false, 'Ready is active on preview');

  const about = sectionText(root);
  for (const fragment of ['Declared period 2026-01-01 (UTC)', 'Prerequisites audience-definitions', 'Synthetic data generated for go-admin examples', 'Origin Synthetic · Generated fixture']) {
    assert.ok(about.includes(fragment), `About shows ${fragment}: ${about}`);
  }
  const identity = root.querySelector('.console-explorer__identity');
  assert.equal(identity.open, false, 'technical identity is secondary');
  assert.ok(identity.querySelector(`[data-copy-content="${'a'.repeat(64)}"]`), 'the full digest is copyable');

  // Keyboard: arrows move between sections and keep focus on the tabs.
  key_(root.querySelector('[data-explorer-section="about"]'), 'ArrowRight');
  const contents = await waitFor(() => {
    assert.equal(win.document.activeElement?.dataset.explorerSection, 'contents');
    return sectionText(root);
  });
  for (const fragment of ['Orders Catalog inventory 3', 'Orders Selected scenario 3', 'People Selected scenario Unknown', 'Amount amount integer USD cents Order total before tax.', 'Declared relationships Customer → People']) {
    assert.ok(contents.includes(fragment), `Contents shows ${fragment}: ${contents}`);
  }
  key_(win.document.activeElement, 'End');
  await waitFor(() => assert.equal(win.document.activeElement?.dataset.explorerSection, 'evidence'));
  const evidence = sectionText(root);
  for (const fragment of ['Data shown Catalog example', 'Provenance Example — declared by the provider, not observed', 'Receipt None — catalog example', 'Lifecycle status Active']) {
    assert.ok(evidence.includes(fragment), `Evidence shows ${fragment}: ${evidence}`);
  }
  key_(win.document.activeElement, 'Home');
  await waitFor(() => assert.equal(win.document.activeElement?.dataset.explorerSection, 'about'));

  const usage = await showSection(root, 'usage');
  assert.ok(usage.includes('Daily sales report Report') && usage.includes('Customer search Screen'), usage);
  assert.ok(usage.includes('Other uses may exist'), 'declared usage never claims exhaustive discovery');

  const scenarios = await showSection(root, 'scenarios');
  for (const fragment of ['Ready Active', 'Expected outcomes (declared, not verified) Three orders totaling 250', 'Quiet Verified — not active No orders at all.', 'Explore this scenario']) {
    assert.ok(scenarios.includes(fragment), `Scenarios shows ${fragment}: ${scenarios}`);
  }

  click(root.querySelector('[data-explorer-action="back"]'));
  await waitFor(() => assert.equal(win.document.activeElement?.dataset.datasetKey, cardFor(root, 'Customer corpus A').dataset.rowKey, 'back returns focus to the card'));
  runtime.destroy();
});

test('switching scenario reads the exact selection and discards the superseded answer', async () => {
  const quiet = explorer.metadata.find((metadata) => metadata.selection.scenario.id === 'empty-history');
  const server = exploreServer({ [key(quiet.selection)]: deferred(() => jsonResponse(quiet)) });
  const { root, runtime } = mount();
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  runtime.selectPanel('explore');
  await waitFor(() => assert.ok(explorerText(root).includes('Customer corpus A')));
  await openDetails(root, 'Customer corpus A');
  const picker = root.querySelector('select[data-explorer-control="scenario"]');
  const readyKey = picker.value;
  const quietOption = Array.from(picker.options).find((option) => option.textContent.startsWith('Quiet'));
  picker.value = quietOption.value;
  picker.dispatchEvent(new win.Event('change', { bubbles: true }));
  await waitFor(() => assert.equal(server.deferred.length, 1));
  assert.ok(sectionText(root).includes('Loading details'), 'old scenario content is cleared while the new one loads');
  assert.equal(win.document.activeElement?.dataset.explorerControl, 'scenario', 'the picker keeps focus');

  const nextPicker = root.querySelector('select[data-explorer-control="scenario"]');
  nextPicker.value = readyKey;
  nextPicker.dispatchEvent(new win.Event('change', { bubbles: true }));
  await waitFor(() => assert.equal(server.deferred[0].request.signal.aborted, true, 'the superseded read is canceled'));
  server.deferred[0].release();
  await settle();
  await waitFor(() => assert.ok(sectionText(root).includes('Declared period 2026-01-01 (UTC)')));
  assert.ok(!sectionText(root).includes('Loading details'));
  assert.ok(root.querySelector('.console-explorer__note').textContent.includes('Catalog example'));
  runtime.destroy();
});

test('Quiet stays empty for its scenario while the catalog inventory stays three', async () => {
  exploreServer();
  const { root, runtime } = mount();
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  runtime.selectPanel('explore');
  await waitFor(() => assert.ok(explorerText(root).includes('Customer corpus A')));
  await openDetails(root, 'Customer corpus A');
  await showSection(root, 'scenarios');
  const quiet = Array.from(root.querySelectorAll('.console-explorer__scenario')).find((item) => item.textContent.includes('Quiet'));
  click(quiet.querySelector('[data-explorer-action="scenario"]'));
  await waitFor(() => assert.ok(root.querySelector('select[data-explorer-control="scenario"]').selectedOptions[0].textContent.startsWith('Quiet')));
  await showSection(root, 'contents');
  await waitFor(() => assert.ok(sectionText(root).includes('Orders Selected scenario 0'), sectionText(root)));
  assert.ok(sectionText(root).includes('Orders Catalog inventory 3'), 'catalog inventory never masquerades as the scenario count');
  const usage = await showSection(root, 'usage');
  assert.ok(usage.includes('No usage is declared. Impact on application features is unknown.'), usage);
  runtime.destroy();
});

test('unsupported and suppressed replies stay distinct and withhold descriptions', async () => {
  const ready = explorer.metadata.find((metadata) => metadata.selection.scenario.id === 'ready');
  exploreServer({ [key(ready.selection)]: () => jsonResponse(explorer.variants.ready_unsupported) });
  const { root, runtime } = mount();
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  runtime.selectPanel('explore');
  const card = await waitFor(() => {
    const found = cardFor(root, 'crm/corpus-a v1');
    assert.ok(found.textContent.includes('No description provided by this dataset’s provider.'), found.textContent);
    return found;
  });
  assert.equal(textOf(card.querySelector('.console-card__title')), 'crm/corpus-a v1', 'an unsupported reply never titles the card with the raw dataset ID');
  await openDetails(root, 'crm/corpus-a v1');
  assert.ok(root.querySelector('[data-explorer-state="unsupported"]'), sectionText(root));
  assert.ok(sectionText(root).includes('Prerequisites audience-definitions'), 'lifecycle catalog facts remain');
  const contents = await showSection(root, 'contents');
  assert.ok(contents.includes('does not describe its contents') && !contents.includes('Orders'), contents);

  // Suppressed: dst-week withholds every description, count and entity.
  const picker = root.querySelector('select[data-explorer-control="scenario"]');
  picker.value = Array.from(picker.options).find((option) => option.textContent.startsWith('dst-week')).value;
  picker.dispatchEvent(new win.Event('change', { bubbles: true }));
  await waitFor(() => assert.ok(root.querySelector('[data-explorer-state="suppressed"]'), sectionText(root)));
  assert.equal(root.querySelectorAll('.console-explorer__section table, .console-explorer__entity').length, 0);
  assert.ok(!sectionText(root).includes('Orders'));
  runtime.destroy();
});

async function detailsAfterFailure(status) {
  const ready = explorer.metadata.find((metadata) => metadata.selection.scenario.id === 'ready');
  const answer = { status };
  const server = exploreServer({ [key(ready.selection)]: () => (answer.status === 200 ? jsonResponse(ready) : errorResponse(answer.status, 'no')) });
  const { root, runtime } = mount();
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  runtime.selectPanel('explore');
  await waitFor(() => assert.ok(cardFor(root, 'crm/corpus-a v1').textContent.includes('Description unavailable.')));
  await openDetails(root, 'crm/corpus-a v1');
  await waitFor(() => assert.ok(root.querySelector('[data-explorer-failure]')));
  return { root, runtime, server, answer, ready };
}

test('an outage is retryable and Try again reads the same selection once', async () => {
  const { root, runtime, server, answer, ready } = await detailsAfterFailure(503);
  const failure = root.querySelector('[data-explorer-failure]');
  assert.equal(failure.dataset.explorerFailure, 'unavailable');
  assert.equal(failure.getAttribute('role'), 'alert');
  answer.status = 200;
  const requests = server.requests.length;
  click(root.querySelector('[data-explorer-action="retry"]'));
  await waitFor(() => assert.ok(sectionText(root).includes('Declared period 2026-01-01 (UTC)')));
  assert.equal(server.requests.length, requests + 1);
  assert.equal(key(server.requests.at(-1).selection), key(ready.selection));
  runtime.destroy();
});

for (const [status, kind, control] of [[403, 'denied', ''], [401, 'expired', ''], [404, 'gone', 'refresh'], [409, 'stale', 'refresh'], [504, 'timeout', 'retry'], [400, 'invalid', 'refresh']]) {
  test(`HTTP ${status} reads as ${kind} without partial content`, async () => {
    const { root, runtime } = await detailsAfterFailure(status);
    assert.equal(root.querySelector('[data-explorer-failure]').dataset.explorerFailure, kind);
    const actions = Array.from(root.querySelectorAll('.console-explorer__state [data-explorer-action]')).map((button) => button.dataset.explorerAction);
    assert.deepEqual(actions, control ? [control] : [], `${kind} offers ${control || 'no'} recovery`);
    assert.equal(root.querySelectorAll('.console-explorer__section table, .console-explorer__entity').length, 0);
    runtime.destroy();
  });
}

test('a reply for any other selection is rejected as malformed', async () => {
  const ready = explorer.metadata.find((metadata) => metadata.selection.scenario.id === 'ready');
  const quiet = explorer.metadata.find((metadata) => metadata.selection.scenario.id === 'empty-history');
  exploreServer({ [key(ready.selection)]: () => jsonResponse(quiet) });
  const { root, runtime } = mount();
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  runtime.selectPanel('explore');
  await waitFor(() => assert.ok(cardFor(root, 'crm/corpus-a v1').textContent.includes('Description unavailable.')));
  await openDetails(root, 'crm/corpus-a v1');
  await waitFor(() => assert.equal(root.querySelector('[data-explorer-failure]')?.dataset.explorerFailure, 'malformed'));
  runtime.destroy();
});

test('without explore routes the explorer shows lifecycle cards and never reads', async () => {
  const server = exploreServer();
  const { extensions: _extensions, ...plain } = bootstrapWith();
  const { root, runtime } = mount(plain);
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  runtime.selectPanel('explore');
  await waitFor(() => assert.ok(explorerText(root).includes('not offered on this installation')));
  assert.ok(cardFor(root, 'crm/corpus-a v1'));
  await openDetails(root, 'crm/corpus-a v1');
  assert.ok(sectionText(root).includes('Exploration is not available on this installation.'));
  await settle();
  assert.equal(server.requests.length, 0);
  runtime.destroy();
});

test('console denial drops explorer content and cancels reads', async () => {
  const ready = explorer.metadata.find((metadata) => metadata.selection.scenario.id === 'ready');
  const server = exploreServer({ [key(ready.selection)]: deferred(() => jsonResponse(ready)) });
  const { root, runtime } = mount();
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  runtime.selectPanel('explore');
  await waitFor(() => assert.equal(server.deferred.length, 1));
  const snapshotFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => (String(input).endsWith('/api/snapshot')
    ? errorResponse(403, 'revoked')
    : snapshotFetch(input, init));
  await runtime.refresh();
  await waitFor(() => assert.equal(runtime.getState(), 'denied'));
  assert.equal(explorerRoot(root), null, 'no explorer markup survives denial');
  assert.equal(server.deferred[0].request.signal.aborted, true, 'in-flight reads are canceled');
  server.deferred[0].release();
  await settle();
  assert.equal(explorerRoot(root), null);
  runtime.destroy();
});

test('a new authorized snapshot re-reads shown descriptions under current policy', async () => {
  const ready = explorer.metadata.find((metadata) => metadata.selection.scenario.id === 'ready');
  const answer = { status: 200 };
  const server = exploreServer({ [key(ready.selection)]: () => (answer.status === 200 ? jsonResponse(ready) : errorResponse(answer.status, 'revoked')) });
  const explore = globalThis.fetch;
  globalThis.fetch = async (input, init) => (String(input).endsWith('/api/snapshot') ? jsonResponse(golden.bootstrap.snapshot) : explore(input, init));
  const { root, runtime } = mount();
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  runtime.selectPanel('explore');
  await waitFor(() => assert.ok(explorerText(root).includes('Customer corpus A')));
  await openDetails(root, 'Customer corpus A');
  await waitFor(() => assert.ok(sectionText(root).includes('Declared period 2026-01-01 (UTC)')));
  const reads = server.requests.length;

  // The explore grant is revoked; the console itself stays readable.
  answer.status = 403;
  await runtime.refresh();
  await waitFor(() => assert.equal(root.querySelector('[data-explorer-failure]')?.dataset.explorerFailure, 'denied'));
  assert.ok(server.requests.length > reads, 'the shown selection was read again');
  assert.ok(!sectionText(root).includes('Declared period 2026-01-01 (UTC)'), 'previously shown descriptions are gone');
  assert.equal(textOf(root.querySelector('.console-explorer__title')), 'crm/corpus-a v1', 'the heading falls back to lifecycle identity');
  runtime.destroy();
});


async function readyContents(server) {
  const { root, runtime } = mount();
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  runtime.selectPanel('explore');
  await waitFor(() => assert.ok(explorerText(root).includes('Customer corpus A')));
  await openDetails(root, 'Customer corpus A');
  await waitFor(() => assert.ok(sectionText(root).includes('Declared period 2026-01-01 (UTC)')));
  await showSection(root, 'contents');
  return { root, runtime, server };
}

const previewFor = (root, entity) => root.querySelector(`[data-explorer-preview="${entity}"]`);
const reads = (server, kind) => server.requests.filter((request) => request.kind === kind);

test('record previews page through bounded samples with explained fields', async () => {
  const server = exploreServer();
  const { root, runtime } = await readyContents(server);
  assert.equal(reads(server, 'samples').length, 0, 'records are read only on request');
  click(root.querySelector('[data-explorer-action="samples"][data-entity-id="orders"]'));
  await waitFor(() => assert.ok(textOf(previewFor(root, 'orders')).includes('Records 1–2 of 3')));
  await waitFor(() => assert.equal(win.document.activeElement?.dataset.explorerAction, 'samples-hide', 'focus moves into the opened preview'));
  const preview = textOf(previewFor(root, 'orders'));
  for (const fragment of ['Sampling: declared fixture order. Example records declared by the provider, not observed data.', 'Order', 'Amount USD cents', 'Placed on', 'order-1 120 2026-01-01', 'order-2 80 2026-01-01', 'Customer']) {
    assert.ok(preview.includes(fragment), `preview shows ${fragment}: ${preview}`);
  }
  const first = reads(server, 'samples')[0];
  assert.equal(first.url.pathname, ROUTES.samples);
  assert.deepEqual([first.read.entity_id, first.read.cursor, first.url.searchParams.get('limit')], ['orders', '', '25']);
  assert.equal(key(first.selection), key(explorer.metadata[0].selection), 'the preview reads the exact selection shown');

  click(previewFor(root, 'orders').querySelector('[data-explorer-action="page-next"]'));
  await waitFor(() => assert.ok(textOf(previewFor(root, 'orders')).includes('Records 3–3 of 3')));
  assert.ok(textOf(previewFor(root, 'orders')).includes('order-3 50 2026-01-01'));
  assert.equal(reads(server, 'samples').at(-1).read.cursor, 'cursor-orders-2', 'Next sends the server cursor');
  const next = previewFor(root, 'orders').querySelector('[data-explorer-action="page-next"]');
  assert.equal(next.getAttribute('aria-disabled'), 'true', 'the last page keeps Next focusable but unavailable');
  assert.equal(win.document.activeElement?.dataset.explorerAction, 'page-next', 'focus stays on Next through the page load');
  const reads_ = reads(server, 'samples').length;
  click(next);
  await settle();
  assert.equal(reads(server, 'samples').length, reads_, 'an unavailable Next does not read');
  click(previewFor(root, 'orders').querySelector('[data-explorer-action="page-previous"]'));
  await waitFor(() => assert.ok(textOf(previewFor(root, 'orders')).includes('Records 1–2 of 3')));
  assert.equal(reads(server, 'samples').at(-1).read.cursor, '', 'Previous reads the first page again');

  click(previewFor(root, 'orders').querySelector('[data-explorer-action="samples-hide"]'));
  await waitFor(() => assert.equal(previewFor(root, 'orders'), null));
  assert.equal(win.document.activeElement?.dataset.explorerAction, 'samples', 'focus returns to the preview control');
  runtime.destroy();
});

test('withheld, null and unknown cells stay distinct and a partial page says so', async () => {
  const server = exploreServer();
  const { root, runtime } = await readyContents(server);
  click(root.querySelector('[data-explorer-action="samples"][data-entity-id="people"]'));
  await waitFor(() => assert.ok(previewFor(root, 'people')?.querySelector('tbody tr')));
  const preview = previewFor(root, 'people');
  const rows = Array.from(preview.querySelectorAll('tbody tr')).map((row) => textOf(row));
  assert.deepEqual(rows.map((row) => row.split(' ')[0]), ['person-1', 'person-2', 'person-3']);
  assert.ok(rows[0].includes('Withheld (value withheld by policy)'), rows[0]);
  assert.ok(rows[1].includes('null (no value recorded)'), rows[1]);
  assert.ok(rows[2].includes('Unknown (value not available)'), rows[2]);
  assert.ok(textOf(preview).includes('Partial preview: some records or values were left out.'));
  assert.ok(textOf(preview).includes('Records 1–3; total unknown'));
  assert.equal(preview.querySelectorAll('.console-explorer__cell--redacted').length, 1);
  runtime.destroy();
});

test('an empty scenario preview says empty, never zero rows of data', async () => {
  exploreServer();
  const { root, runtime } = mount();
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  runtime.selectPanel('explore');
  await waitFor(() => assert.ok(explorerText(root).includes('Customer corpus A')));
  await openDetails(root, 'Customer corpus A');
  const picker = root.querySelector('select[data-explorer-control="scenario"]');
  picker.value = Array.from(picker.options).find((option) => option.textContent.startsWith('Quiet')).value;
  picker.dispatchEvent(new win.Event('change', { bubbles: true }));
  await waitFor(() => assert.ok(sectionText(root).includes('Declared period 2026-01-01 (UTC)')));
  await showSection(root, 'contents');
  click(root.querySelector('[data-explorer-action="samples"][data-entity-id="orders"]'));
  await waitFor(() => assert.ok(textOf(previewFor(root, 'orders')).includes('No Orders records in this selection.')));
  assert.equal(previewFor(root, 'orders').querySelectorAll('table').length, 0);
  runtime.destroy();
});

test('a scenario switch aborts in-flight pages and drops the old previews', async () => {
  const server = exploreServer({ samples: (read) => (read.entity_id === 'orders' && read.selection.scenario.id === 'ready' ? deferred(() => jsonResponse(fixtureSamples.get(sampleKey(read)))) : undefined) });
  const { root, runtime } = await readyContents(server);
  click(root.querySelector('[data-explorer-action="samples"][data-entity-id="orders"]'));
  await waitFor(() => assert.equal(server.deferred.length, 1));
  assert.ok(textOf(previewFor(root, 'orders')).includes('Loading records'));
  const picker = root.querySelector('select[data-explorer-control="scenario"]');
  picker.value = Array.from(picker.options).find((option) => option.textContent.startsWith('Quiet')).value;
  picker.dispatchEvent(new win.Event('change', { bubbles: true }));
  await waitFor(() => assert.equal(server.deferred[0].request.signal.aborted, true, 'the superseded page read is canceled'));
  server.deferred[0].release();
  await settle();
  await showSection(root, 'contents');
  await waitFor(() => assert.ok(root.querySelector('[data-explorer-action="samples"][data-entity-id="orders"]')));
  assert.equal(previewFor(root, 'orders'), null, 'previews never carry over to another selection');
  runtime.destroy();
});

test('related records open one level deep in a drawer and return focus to the row', async () => {
  const server = exploreServer();
  const { root, runtime } = await readyContents(server);
  click(root.querySelector('[data-explorer-action="samples"][data-entity-id="orders"]'));
  await waitFor(() => assert.ok(previewFor(root, 'orders')?.querySelector('[data-explorer-action="related"]')));
  const invoker = previewFor(root, 'orders').querySelector('[data-explorer-action="related"][data-record-key="order-1"]');
  invoker.focus();
  click(invoker);
  const drawer = await waitFor(() => {
    const found = root.querySelector('[data-console-drawer][data-panel-id="explore"]');
    assert.ok(found && textOf(found).includes('person-1'), textOf(found));
    return found;
  });
  const text = textOf(drawer);
  for (const fragment of ['Related records', 'Customer', 'Declared People records related to Orders record order-1', 'Withheld']) {
    assert.ok(text.includes(fragment), `drawer shows ${fragment}: ${text}`);
  }
  assert.equal(drawer.querySelectorAll('[data-explorer-action="related"]').length, 0, 'related rows offer no further traversal');
  const related = reads(server, 'related')[0];
  assert.equal(related.url.pathname, ROUTES.related);
  assert.deepEqual([related.read.entity_id, related.read.record_key, related.read.relationship_id], ['orders', 'order-1', 'customer']);
  drawer.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  win.document.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await waitFor(() => assert.equal(root.querySelector('[data-console-drawer]'), null));
  await waitFor(() => assert.equal(win.document.activeElement?.dataset.recordKey, 'order-1', 'focus returns to the invoking row control'));
  runtime.destroy();
});

test('declared impact lists per-phase effects and only same-origin links', async () => {
  exploreServer();
  const { root, runtime } = mount();
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  runtime.selectPanel('explore');
  await waitFor(() => assert.ok(explorerText(root).includes('Customer corpus A')));
  await openDetails(root, 'Customer corpus A');
  await showSection(root, 'usage');
  const usages = Array.from(root.querySelectorAll('.console-explorer__usage')).map((item) => textOf(item));
  assert.ok(usages[0].includes('Prepare Builds report inputs in the prepared stage. Verify Checks the daily total. Activate Report shows the scenario’s orders.') || usages[0].includes("Activate Report shows the scenario's orders."), usages[0]);
  assert.ok(usages[1].includes('Prepare Not declared — effect unknown Verify Not declared — effect unknown Activate Search lists the scenario\'s people.'), usages[1]);
  const links = Array.from(root.querySelectorAll('[data-explorer-usage-link]'));
  assert.deepEqual(links.map((link) => link.getAttribute('href')), ['https://admin.example.test/admin/reports/sales'], 'links are absolute and same-origin');
  assert.ok(usages[1].includes('No link available'));
  click(root.querySelector('[data-explorer-action="back"]'));
  await waitFor(() => assert.ok(cardFor(root, 'Corpus B')));
  await openDetails(root, 'Corpus B');
  await showSection(root, 'usage');
  assert.equal(root.querySelectorAll('[data-explorer-usage-link], a[href^="javascript"]').length, 0, 'a script link is never rendered');
  runtime.destroy();
});

test('a failed page read is safe and Try again reads the same page', async () => {
  let status = 503;
  const server = exploreServer({ samples: (read) => (read.entity_id === 'orders' && status !== 200 ? () => errorResponse(status, 'no') : undefined) });
  const { root, runtime } = await readyContents(server);
  click(root.querySelector('[data-explorer-action="samples"][data-entity-id="orders"]'));
  await waitFor(() => assert.equal(previewFor(root, 'orders')?.querySelector('[data-explorer-failure]')?.dataset.explorerFailure, 'unavailable'));
  assert.equal(previewFor(root, 'orders').querySelectorAll('table').length, 0);
  status = 200;
  click(previewFor(root, 'orders').querySelector('[data-explorer-action="page-retry"]'));
  await waitFor(() => assert.ok(textOf(previewFor(root, 'orders')).includes('Records 1–2 of 3')));
  assert.equal(reads(server, 'samples').at(-1).read.cursor, '');
  runtime.destroy();
});

test('a stale preview offers Refresh, which reads the description and the preview again', async () => {
  let stale = true;
  const server = exploreServer({ samples: (read) => (read.entity_id === 'orders' && stale ? () => errorResponse(409, 'stale') : undefined) });
  const { root, runtime } = await readyContents(server);
  click(root.querySelector('[data-explorer-action="samples"][data-entity-id="orders"]'));
  await waitFor(() => assert.equal(previewFor(root, 'orders')?.querySelector('[data-explorer-failure]')?.dataset.explorerFailure, 'stale'));
  assert.equal(previewFor(root, 'orders').querySelector('[data-explorer-action="page-retry"]'), null, 'stale is not retried blindly');
  const metadataReads = reads(server, 'metadata').length;
  stale = false;
  click(previewFor(root, 'orders').querySelector('[data-explorer-action="refresh"]'));
  await waitFor(() => assert.ok(textOf(previewFor(root, 'orders')).includes('Records 1–2 of 3')));
  assert.equal(reads(server, 'metadata').length, metadataReads + 1, 'the description is read again');
  runtime.destroy();
});


/** A metadata reply for exactly `selection`, observed from its receipt. */
function observedMetadata(selection) {
  const ready = explorer.metadata.find((metadata) => metadata.selection.scenario.id === 'ready');
  return { ...ready, selection, provenance: 'observed' };
}

/** The golden snapshot with the preview target moved to another generation or deactivated. */
function snapshotWith(mutate) {
  const snapshot = structuredClone(golden.bootstrap.snapshot);
  const overview = snapshot.panels.find((panel) => panel.id === 'overview').records[0];
  mutate(overview.data.targets[0], snapshot);
  overview.revision += 1;
  snapshot.watermark += 1;
  return snapshot;
}

test('prepared and active contexts read the exact receipt, revision and generation', async () => {
  const server = exploreServer({ default: (selection) => jsonResponse(observedMetadata(selection)) });
  const { root, runtime } = mount();
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  runtime.selectPanel('explore');
  await waitFor(() => assert.ok(explorerText(root).includes('Customer corpus A')));
  await openDetails(root, 'Customer corpus A');

  const prepared = root.querySelector('input[value="prepared"]');
  prepared.checked = true;
  prepared.dispatchEvent(new win.Event('change', { bubbles: true }));
  await waitFor(() => assert.equal(reads(server, 'metadata').at(-1).selection.context, 'prepared'));
  let selection = reads(server, 'metadata').at(-1).selection;
  assert.deepEqual([selection.receipt_id, selection.content_revision, selection.generation], ['rcpt-ready-1', 2, undefined]);
  await waitFor(() => assert.ok(root.querySelector('.console-explorer__note').textContent.includes('Prepared receipt rcpt-ready-1 (content revision 2) on preview')));
  assert.equal(win.document.activeElement?.value, 'prepared', 'focus stays on the chosen context');

  const active = root.querySelector('input[value="active"]');
  active.checked = true;
  active.dispatchEvent(new win.Event('change', { bubbles: true }));
  await waitFor(() => assert.equal(reads(server, 'metadata').at(-1).selection.context, 'active'));
  selection = reads(server, 'metadata').at(-1).selection;
  assert.deepEqual([selection.receipt_id, selection.content_revision, selection.generation], ['rcpt-ready-1', 2, 3]);
  await waitFor(() => assert.ok(sectionText(root).includes('Declared period 2026-01-01 (UTC)')));
  assert.ok(root.querySelector('.console-explorer__note').textContent.includes('Active on preview at generation 3 (receipt rcpt-ready-1)'));
  const evidence = await showSection(root, 'evidence');
  for (const fragment of ['Data shown Active data', 'Provenance Observed', 'Receipt rcpt-ready-1', 'Content revision 2', 'Generation 3']) {
    assert.ok(evidence.includes(fragment), `Evidence shows ${fragment}: ${evidence}`);
  }
  runtime.destroy();
});

test('a generation change marks the active view stale until an explicit refresh', async () => {
  let snapshot = golden.bootstrap.snapshot;
  const server = exploreServer({ default: (selection) => jsonResponse(observedMetadata(selection)), snapshot: () => jsonResponse(snapshot) });
  const { root, runtime } = mount();
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  runtime.selectPanel('explore');
  await waitFor(() => assert.ok(explorerText(root).includes('Customer corpus A')));
  await openDetails(root, 'Customer corpus A');
  const active = root.querySelector('input[value="active"]');
  active.checked = true;
  active.dispatchEvent(new win.Event('change', { bubbles: true }));
  await waitFor(() => assert.ok(sectionText(root).includes('Declared period 2026-01-01 (UTC)')));
  await showSection(root, 'contents');
  click(root.querySelector('[data-explorer-action="samples"][data-entity-id="orders"]'));
  await waitFor(() => assert.ok(previewFor(root, 'orders')));

  // Another operator activates: the snapshot now pins generation 4.
  snapshot = snapshotWith((target) => {
    target.generation = 4;
    target.explore_active = { ...target.explore_active, generation: 4 };
  });
  const before = reads(server, 'metadata').length;
  await runtime.refresh();
  await waitFor(() => assert.ok(root.querySelector('[data-explorer-state="stale"]'), sectionText(root)));
  assert.ok(sectionText(root).includes('The active data changed since you opened it. It is now receipt rcpt-ready-1 at generation 4.'), sectionText(root));
  assert.equal(previewFor(root, 'orders'), null, 'records of the stale generation are gone');
  assert.ok(!sectionText(root).includes('Orders Catalog inventory 3'), 'descriptions of the stale generation are gone');
  await settle();
  assert.equal(reads(server, 'metadata').filter((request) => request.selection.generation === 4).length, 0, 'nothing is repinned silently');
  assert.equal(reads(server, 'metadata').length, before);

  click(root.querySelector('[data-explorer-action="refresh"]'));
  await waitFor(() => assert.ok(reads(server, 'metadata').some((request) => request.selection.generation === 4)));
  await waitFor(() => assert.equal(root.querySelector('[data-explorer-state="stale"]'), null));
  assert.ok(root.querySelector('.console-explorer__note').textContent.includes('generation 4'));
  runtime.destroy();
});

test('a scenario that stops being active becomes unavailable, never substituted', async () => {
  let snapshot = golden.bootstrap.snapshot;
  const server = exploreServer({ default: (selection) => jsonResponse(observedMetadata(selection)), snapshot: () => jsonResponse(snapshot) });
  const { root, runtime } = mount();
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  runtime.selectPanel('explore');
  await waitFor(() => assert.ok(explorerText(root).includes('Customer corpus A')));
  await openDetails(root, 'Customer corpus A');
  const active = root.querySelector('input[value="active"]');
  active.checked = true;
  active.dispatchEvent(new win.Event('change', { bubbles: true }));
  await waitFor(() => assert.equal(reads(server, 'metadata').at(-1).selection.context, 'active'));

  snapshot = snapshotWith((target) => {
    delete target.explore_active;
  });
  await runtime.refresh();
  await waitFor(() => assert.ok(sectionText(root).includes('The active data you were exploring is no longer available for this scenario.'), sectionText(root)));
  assert.equal(root.querySelector('input[value="active"]').disabled, true);
  const reads_ = reads(server, 'metadata').length;
  click(root.querySelector('[data-explorer-action="refresh"]'));
  await waitFor(() => assert.equal(root.querySelector('[data-explorer-state="stale"]'), null));
  assert.equal(root.querySelector('input[value="catalog_example"]').checked, true, 'refresh falls back to an available context');
  assert.ok(reads(server, 'metadata').length >= reads_);
  assert.ok(!reads(server, 'metadata').slice(reads_).some((request) => request.selection.context === 'active'), 'active data is never substituted');
  runtime.destroy();
});

test('a hidden explorer defers re-reading open previews until it is shown', async () => {
  const server = exploreServer();
  const { root, runtime } = await readyContents(server);
  click(root.querySelector('[data-explorer-action="samples"][data-entity-id="orders"]'));
  await waitFor(() => assert.ok(textOf(previewFor(root, 'orders')).includes('Records 1–2 of 3')));
  runtime.selectPanel('overview');
  const before = reads(server, 'samples').length;
  await runtime.refresh();
  await runtime.refresh();
  await settle();
  assert.equal(reads(server, 'samples').length, before, 'no record reads while Explore is hidden');
  runtime.selectPanel('explore');
  await waitFor(() => assert.ok(textOf(previewFor(root, 'orders')).includes('Records 1–2 of 3')));
  assert.equal(reads(server, 'samples').length, before + 1, 'one read of the first page once shown');
  runtime.destroy();
});


test('live revalidation keeps the shown page, focus and disclosure, and only withdraws on a policy answer', async () => {
  FakeSocket.instances = [];
  const answer = { status: 200 };
  const ready = explorer.metadata.find((metadata) => metadata.selection.scenario.id === 'ready');
  const server = exploreServer({ [key(ready.selection)]: () => (answer.status === 200 ? jsonResponse(ready) : errorResponse(answer.status, 'revoked')) });
  const { root, runtime } = mount(bootstrapWith(), { live: true, snapshotWaitMs: 60000 });
  await waitFor(() => assert.equal(FakeSocket.instances.length, 1));
  const socket = FakeSocket.instances[0];
  socket.open();
  socket.message(golden.bootstrap.snapshot);
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  runtime.selectPanel('explore');
  await waitFor(() => assert.ok(explorerText(root).includes('Customer corpus A')));
  await openDetails(root, 'Customer corpus A');
  await waitFor(() => assert.ok(sectionText(root).includes('Declared period 2026-01-01 (UTC)')));
  const identity = root.querySelector('[data-explorer-disclosure="identity"]');
  identity.open = true;
  identity.dispatchEvent(new win.Event('toggle'));
  await showSection(root, 'contents');
  click(root.querySelector('[data-explorer-action="samples"][data-entity-id="orders"]'));
  await waitFor(() => assert.ok(textOf(previewFor(root, 'orders')).includes('Records 1–2 of 3')));
  click(previewFor(root, 'orders').querySelector('[data-explorer-action="page-next"]'));
  await waitFor(() => assert.ok(textOf(previewFor(root, 'orders')).includes('Records 3–3 of 3')));
  const next = previewFor(root, 'orders').querySelector('[data-explorer-action="page-next"]');
  next.focus();
  const before = { metadata: reads(server, 'metadata').length, samples: reads(server, 'samples').length };

  // The host's periodic revalidation: an invalidation and an equal-watermark snapshot.
  socket.message({ ...golden.bootstrap.snapshot, kind: undefined });
  socket.message({ console_id: 'data', application_id: 'crm', environment_id: 'staging', actor_id: 'operator-1', scope_key: 'synthetic-org', kind: 'invalidate', sequence: golden.bootstrap.snapshot.watermark });
  socket.message(golden.bootstrap.snapshot);
  await waitFor(() => assert.ok(reads(server, 'samples').length > before.samples, 'the shown page is authorized again'));
  await settle();
  assert.ok(reads(server, 'metadata').length > before.metadata, 'the shown description is authorized again');
  assert.equal(reads(server, 'samples').at(-1).read.cursor, 'cursor-orders-2', 'the shown page is read with its own cursor');
  assert.ok(textOf(previewFor(root, 'orders')).includes('Records 3–3 of 3'), 'the shown page survives revalidation');
  assert.equal(win.document.activeElement, next, 'focus survives revalidation');
  assert.ok(!sectionText(root).includes('Loading'), 'nothing reloads visibly');
  await showSection(root, 'about');
  assert.equal(root.querySelector('[data-explorer-disclosure="identity"]').open, true, 'an opened disclosure stays open across re-renders');

  // A policy answer on the next revalidation withdraws what was shown.
  answer.status = 403;
  socket.message(golden.bootstrap.snapshot);
  await waitFor(() => assert.equal(root.querySelector('[data-explorer-failure]')?.dataset.explorerFailure, 'denied'));
  assert.ok(!sectionText(root).includes('Declared period 2026-01-01 (UTC)'));
  runtime.destroy();
});

test('a normalized protocol-relative link stays on the page origin', async () => {
  const ready = explorer.metadata.find((metadata) => metadata.selection.scenario.id === 'ready');
  const tricky = { ...ready, usages: [{ ...ready.usages[0], href: '/reports/../..//evil.example/login' }] };
  exploreServer({ [key(ready.selection)]: () => jsonResponse(tricky) });
  const { root, runtime } = mount();
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  runtime.selectPanel('explore');
  await waitFor(() => assert.ok(explorerText(root).includes('Customer corpus A')));
  await openDetails(root, 'Customer corpus A');
  await showSection(root, 'usage');
  const href = root.querySelector('[data-explorer-usage-link]')?.getAttribute('href') || '';
  assert.equal(new URL(href, 'https://other.example/').origin, 'https://admin.example.test', `link stays on the page origin: ${href}`);
  assert.ok(!href.startsWith('//'), 'never protocol-relative');
  runtime.destroy();
});

test('a dataset with no explorable scenario says its description is unknown', async () => {
  exploreServer();
  const snapshot = structuredClone(golden.bootstrap.snapshot);
  const scenarios = snapshot.panels.find((panel) => panel.id === 'scenarios');
  const corpusB = snapshot.panels.find((panel) => panel.id === 'datasets').records.find((record) => record.data.dataset_id === 'corpus-b').record_key;
  scenarios.records = scenarios.records.filter((record) => record.data.dataset_key !== corpusB);
  const { root, runtime } = mount(bootstrapWith({ snapshot }));
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  runtime.selectPanel('explore');
  const card = await waitFor(() => {
    const found = cardFor(root, 'crm/corpus-b v2');
    assert.ok(textOf(found).includes('Description unknown: no scenario of this dataset can be explored.'), textOf(found));
    return found;
  });
  assert.equal(card.querySelector('[aria-busy="true"]'), null, 'nothing pretends to load');
  await openDetails(root, 'crm/corpus-b v2');
  assert.equal(root.querySelector('.console-explorer__header [aria-busy="true"]'), null);
  assert.ok(textOf(root.querySelector('.console-explorer__header')).includes('Description unknown'));
  runtime.destroy();
});

test('the prepared view of the active receipt says it is the active one', async () => {
  exploreServer({ default: (selection) => jsonResponse(observedMetadata(selection)) });
  const { root, runtime } = mount();
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  runtime.selectPanel('explore');
  await waitFor(() => assert.ok(explorerText(root).includes('Customer corpus A')));
  await openDetails(root, 'Customer corpus A');
  const prepared = root.querySelector('input[value="prepared"]');
  prepared.checked = true;
  prepared.dispatchEvent(new win.Event('change', { bubbles: true }));
  await waitFor(() => assert.equal(root.querySelector('.console-explorer__note').dataset.context, 'prepared'));
  const note = root.querySelector('.console-explorer__note').textContent;
  assert.ok(note.includes('This receipt is the active one') && !note.includes('It is not active'), note);
  runtime.destroy();
});

test('a sample page shows its own read time and an unknown completeness', async () => {
  const server = exploreServer({ samples: (read) => (read.entity_id === 'orders' ? () => jsonResponse({ ...fixtureSamples.get(sampleKey(read)), completeness: 'unknown', observed_at: '2026-10-02T11:00:00Z' }) : undefined) });
  const { root, runtime } = await readyContents(server);
  click(root.querySelector('[data-explorer-action="samples"][data-entity-id="orders"]'));
  await waitFor(() => assert.ok(textOf(previewFor(root, 'orders')).includes('Records 1–2 of 3')));
  const preview = previewFor(root, 'orders');
  assert.ok(preview.querySelector('[data-explorer-completeness="unknown"]'), 'unknown completeness is said, not implied complete');
  assert.equal(preview.querySelector('time')?.getAttribute('datetime'), '2026-10-02T11:00:00.000Z', 'the page shows its own read time');
  runtime.destroy();
});
