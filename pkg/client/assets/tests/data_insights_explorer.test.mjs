import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Insights and comparisons bound into the Data explorer's details, through
// the shipped Data console entry (which loads `console/data-insights` on
// demand) against stubbed explore/insights/compare routes answering with the
// Go-generated explorer and insights fixtures.

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
const insightsFixture = JSON.parse(fs.readFileSync(path.join(here, 'fixtures/data-insights-contract.json'), 'utf8'));

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

const ROUTES = {
  metadata: '/admin/data/api/explore/metadata',
  samples: '/admin/data/api/explore/samples',
  related: '/admin/data/api/explore/related',
};
const INSIGHT_ROUTES = { insights: '/admin/data/api/explore/insights', compare: '/admin/data/api/explore/compare' };

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const errorResponse = (status, message) => jsonResponse({ error: { message } }, status);
const clone = (value) => structuredClone(value);

/** Same identity tuple as the explorer's selectionKey. */
function key(selection) {
  const { dataset, scenario } = selection;
  return JSON.stringify([
    selection.context, selection.target_id, dataset.provider, dataset.id, dataset.version, dataset.digest,
    scenario.id, scenario.version, scenario.profile_hash, selection.receipt_id || '', selection.content_revision ?? 0, selection.generation ?? -1,
  ]);
}
const pairKey = (left, right) => `${key(left)}|${key(right)}`;

const metadataByKey = new Map(explorer.metadata.map((metadata) => [key(metadata.selection), metadata]));
const insightsByKey = new Map(insightsFixture.insights.map((item) => [key(item.request.selection), item.response]));
const comparisonsByPair = new Map(insightsFixture.comparisons.filter((item) => item.name !== 'withheld')
  .map((item) => [pairKey(item.request.left, item.request.right), item.response]));
const comparison = (name) => clone(insightsFixture.comparisons.find((item) => item.name === name).response);
const insightsNamed = (name) => clone(insightsFixture.insights.find((item) => item.name === name).response);

function observedMetadata(selection) {
  const ready = explorer.metadata.find((metadata) => metadata.selection.scenario.id === 'ready');
  return { ...ready, selection, provenance: 'observed' };
}

/** Ready's observed insights answered under another exact selection. */
function observedInsights(selection) {
  const reply = insightsNamed('ready_prepared');
  reply.selection = selection;
  reply.coverage.forEach((day) => {
    if (day.evidence) day.evidence.selection = selection;
  });
  return reply;
}

/** A comparison fixture re-issued for other exact sides. */
function comparisonFor(name, left, right) {
  const reply = comparison(name);
  for (const [side, selection] of [['left', left], ['right', right]]) {
    reply[side].selection = selection;
    reply[side].coverage.forEach((day) => {
      if (day.evidence) day.evidence.selection = selection;
    });
  }
  return reply;
}

/**
 * Explore/insights/compare stub. `answers[kind](request)` may return a
 * Response, `{ deferred: () => Response }` (held until `release`), or
 * undefined for the fixture default. Every request records its parsed
 * selections, metric set and abort signal.
 */
function server(answers = {}) {
  const state = { requests: [], deferred: [], snapshot: golden.bootstrap.snapshot };
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input), 'https://admin.example.test');
    if (url.pathname === '/admin/data/api/snapshot') return answers.snapshot ? answers.snapshot() : jsonResponse(state.snapshot);
    const match = url.pathname.match(/^\/admin\/data\/api\/explore\/(\w+)$/);
    if (!match) return new Response('{}', { status: 404 });
    const kind = match[1];
    const request = { kind, url, signal: init.signal, metricSet: url.searchParams.get('metric_set_id') };
    if (kind === 'compare') {
      request.left = JSON.parse(url.searchParams.get('left'));
      request.right = JSON.parse(url.searchParams.get('right'));
    } else {
      request.selection = JSON.parse(url.searchParams.get('selection'));
    }
    state.requests.push(request);
    const answer = answers[kind]?.(request);
    const fallback = () => {
      if (kind === 'metadata') {
        const found = request.selection.context === 'catalog_example' ? metadataByKey.get(key(request.selection)) : observedMetadata(request.selection);
        return found ? jsonResponse(found) : errorResponse(404, 'gone');
      }
      if (kind === 'insights') {
        const found = insightsByKey.get(key(request.selection));
        return jsonResponse(found ? clone(found) : observedInsights(request.selection));
      }
      if (kind === 'compare') {
        const found = comparisonsByPair.get(pairKey(request.left, request.right));
        return found ? jsonResponse(clone(found)) : errorResponse(404, 'gone');
      }
      return errorResponse(404, 'gone');
    };
    if (answer && typeof answer.deferred === 'function') {
      return new Promise((resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new win.DOMException('aborted', 'AbortError')), { once: true });
        state.deferred.push({ request, release: () => resolve(answer.deferred()) });
      });
    }
    return answer || fallback();
  };
  return state;
}

const { mountDataConsole } = await import('../dist/console/data.js');

const settle = () => new Promise((resolve) => setTimeout(resolve, 15));

async function waitFor(assertion, timeoutMs = 2000) {
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

function mount({ insights = true } = {}) {
  win.document.body.innerHTML = '';
  win.sessionStorage.clear();
  const bootstrap = { ...golden.bootstrap, extensions: { data_explorer: ROUTES, ...(insights ? { data_insights: INSIGHT_ROUTES } : {}) } };
  const root = win.document.createElement('section');
  root.setAttribute('data-console-root', '');
  root.setAttribute('data-console-manual', '');
  root.innerHTML = `<script type="application/json" data-console-bootstrap>${JSON.stringify(bootstrap).replace(/</g, '\\u003c')}</script>`;
  win.document.body.appendChild(root);
  const runtime = mountDataConsole(root, { live: false, recoveryDelaysMs: [5], maxRecoveryAttempts: 1 });
  return { root, runtime };
}

const squash = (value) => value.replace(/\s+/g, ' ').trim();
function textOf(element) {
  if (!element) return '';
  const walker = win.document.createTreeWalker(element, win.NodeFilter.SHOW_TEXT);
  const parts = [];
  while (walker.nextNode()) parts.push(walker.currentNode.nodeValue);
  return squash(parts.join(' '));
}
const explorerRoot = (root) => root.querySelector('[data-console-panel] > [data-data-explorer]');
const sectionText = (root) => textOf(root.querySelector('.console-explorer__section'));
const click = (element) => element.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));
const change = (element) => element.dispatchEvent(new win.Event('change', { bubbles: true }));
const keydown = (element, keyName) => element.dispatchEvent(new win.KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true }));
const reads = (state, kind) => state.requests.filter((request) => request.kind === kind);

async function openReady(root, runtime) {
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  runtime.selectPanel('explore');
  await waitFor(() => assert.ok(textOf(explorerRoot(root)).includes('Customer corpus A')));
  const card = Array.from(root.querySelectorAll('.console-explorer__card')).find((item) => textOf(item).includes('Customer corpus A'));
  click(card.querySelector('[data-explorer-action="open"]'));
  await waitFor(() => assert.ok(root.querySelector('.console-explorer__title')));
}

async function chooseContext(root, context) {
  const input = root.querySelector(`input[value="${context}"]`);
  input.checked = true;
  change(input);
  await waitFor(() => assert.equal(root.querySelector(`input[value="${context}"]`).checked, true));
}

async function chooseScenario(root, startsWith) {
  const picker = root.querySelector('select[data-explorer-control="scenario"]');
  picker.value = Array.from(picker.options).find((option) => option.textContent.startsWith(startsWith)).value;
  change(picker);
  await waitFor(() => assert.ok(root.querySelector('select[data-explorer-control="scenario"]').selectedOptions[0].textContent.startsWith(startsWith)));
}

async function showSection(root, id) {
  click(root.querySelector(`[data-explorer-section="${id}"]`));
  await waitFor(() => assert.equal(root.querySelector('.console-explorer__section').dataset.explorerSectionPanel, id));
}

async function chooseCompare(root, startsWith) {
  const select = await waitFor(() => {
    const found = root.querySelector('select[data-insights-control="compare"]');
    assert.ok(found && !found.disabled, 'the compare select is ready');
    return found;
  });
  const option = Array.from(select.options).find((item) => item.textContent.startsWith(startsWith));
  assert.ok(option, `candidate ${startsWith}: ${Array.from(select.options).map((item) => item.textContent)}`);
  select.value = option.value;
  change(select);
}

/** [metric, difference, change] rows of the shown comparison chart. */
function deltas(root) {
  return Array.from(root.querySelectorAll('.console-insights__pair')).map((pair) => [
    pair.dataset.metricId,
    textOf(pair.querySelector('.console-insights__delta-value')),
    textOf(pair.querySelector('.console-insights__delta-change')).replace(/^Change /, ''),
  ]);
}

/** The golden snapshot with the preview target moved to another generation. */
function snapshotWith(mutate) {
  const snapshot = structuredClone(golden.bootstrap.snapshot);
  const overview = snapshot.panels.find((panel) => panel.id === 'overview').records[0];
  mutate(overview.data.targets[0], snapshot);
  overview.revision += 1;
  snapshot.watermark += 1;
  return snapshot;
}

test('Insights and Compare follow Contents only when the page offers insights routes', async () => {
  let state = server();
  let mounted = mount();
  await openReady(mounted.root, mounted.runtime);
  assert.deepEqual(Array.from(mounted.root.querySelectorAll('[data-explorer-section]')).map((tab) => tab.dataset.explorerSection),
    ['about', 'contents', 'insights', 'compare', 'usage', 'scenarios', 'evidence']);
  await settle();
  assert.equal(reads(state, 'insights').length, 0, 'nothing is read before Insights is shown');
  mounted.runtime.destroy();

  state = server();
  mounted = mount({ insights: false });
  await openReady(mounted.root, mounted.runtime);
  assert.deepEqual(Array.from(mounted.root.querySelectorAll('[data-explorer-section]')).map((tab) => tab.dataset.explorerSection),
    ['about', 'contents', 'usage', 'scenarios', 'evidence']);
  await settle();
  assert.equal(reads(state, 'insights').length, 0);
  mounted.runtime.destroy();
});

test('Insights load on demand for the shown selection and the server names the metric set', async () => {
  const state = server();
  const { root, runtime } = mount();
  await openReady(root, runtime);
  await showSection(root, 'contents');
  keydown(root.querySelector('[data-explorer-section="contents"]'), 'ArrowRight');
  await waitFor(() => assert.equal(win.document.activeElement?.dataset.explorerSection, 'insights', 'arrows reach the Insights tab'));
  await waitFor(() => assert.ok(sectionText(root).includes('Orders Example 3 orders'), sectionText(root)));
  const [request] = reads(state, 'insights');
  assert.equal(request.url.pathname, INSIGHT_ROUTES.insights);
  assert.equal(request.metricSet, null, 'the first read lets the server choose the registered metric set');
  assert.equal(request.selection.context, 'catalog_example');
  assert.equal(root.querySelector('.console-insights__provenance').dataset.provenance, 'example');
  assert.ok(sectionText(root).includes('Metric set orders'));

  // Show as Table keeps the same values and keeps focus on the choice.
  const table = root.querySelector('input[data-insights-control="display"][value="table"]');
  table.checked = true;
  change(table);
  await waitFor(() => assert.ok(root.querySelector('[data-insights-table="totals"]')));
  assert.equal(win.document.activeElement?.dataset.explorerFocus, 'insights:display:table');
  assert.equal(reads(state, 'insights').length, 1, 'switching the view reads nothing');
  runtime.destroy();
});

test('a context switch aborts the superseded insights read and never shows its answer', async () => {
  const state = server({
    insights: (request) => (request.selection.context === 'catalog_example' ? { deferred: () => jsonResponse(insightsNamed('ready_catalog')) } : undefined),
  });
  const { root, runtime } = mount();
  await openReady(root, runtime);
  await showSection(root, 'insights');
  await waitFor(() => assert.equal(state.deferred.length, 1));
  assert.ok(sectionText(root).includes('Loading insights'));
  await chooseContext(root, 'prepared');
  await waitFor(() => assert.equal(state.deferred[0].request.signal.aborted, true, 'the superseded read is aborted'));
  state.deferred[0].release();
  await waitFor(() => assert.ok(sectionText(root).includes('Observed in prepared receipt rcpt-ready-1 (content revision 2) on preview.'), sectionText(root)));
  assert.ok(!sectionText(root).includes('Catalog example: values the provider declares'), 'the late example answer never lands');
  const latest = reads(state, 'insights').at(-1).selection;
  assert.deepEqual([latest.context, latest.receipt_id, latest.content_revision], ['prepared', 'rcpt-ready-1', 2]);
  runtime.destroy();
});

test('Ready versus Quiet compares both exact sides with the metric set the shown read named', async () => {
  const readyPrepared = insightsFixture.insights.find((item) => item.name === 'ready_prepared').request.selection;
  const quietPrepared = insightsFixture.insights.find((item) => item.name === 'quiet_prepared').request.selection;
  const state = server({
    compare: (request) => (key(request.left) === key(quietPrepared) && key(request.right) === key(readyPrepared)
      ? jsonResponse(comparisonFor('quiet_prepared_vs_ready_active', quietPrepared, readyPrepared))
      : undefined),
  });
  const { root, runtime } = mount();
  await openReady(root, runtime);
  await chooseContext(root, 'prepared');
  await showSection(root, 'compare');
  await chooseCompare(root, 'Quiet: prepared receipt rcpt-empty-1');
  await waitFor(() => assert.deepEqual(deltas(root), [['orders.count', '−3', '−100%'], ['orders.amount', '−250', '−100%'], ['orders.status', 'Not compared', '']]));
  const [request] = reads(state, 'compare');
  assert.equal(request.metricSet, 'orders', 'the comparison names the metric set learned for the shown selection');
  assert.deepEqual([key(request.left), key(request.right)], [key(readyPrepared), key(quietPrepared)], 'A is the shown selection');
  assert.equal(win.document.activeElement?.dataset.insightsControl, 'compare', 'focus stays on the choice');
  assert.ok(textOf(root.querySelector('.console-insights__side[data-side="b"]')).includes('Quiet'), 'sides use declared titles');

  click(root.querySelector('[data-insights-action="swap"]'));
  await waitFor(() => assert.deepEqual(deltas(root)[0], ['orders.count', '+3', 'Not defined (zero baseline)']));
  const swapped = reads(state, 'compare').at(-1);
  assert.deepEqual([key(swapped.left), key(swapped.right)], [key(quietPrepared), key(readyPrepared)]);
  assert.equal(win.document.activeElement?.dataset.insightsAction, 'swap');
  runtime.destroy();
});

test('selected versus active pins the active generation and stops when it changes', async () => {
  const quietPrepared = insightsFixture.insights.find((item) => item.name === 'quiet_prepared').request.selection;
  const state = server({
    compare: (request) => (request.left.context === 'active' && request.left.generation === 4
      ? jsonResponse(comparisonFor('ready_active_vs_quiet_prepared', request.left, request.right))
      : undefined),
  });
  const { root, runtime } = mount();
  await openReady(root, runtime);
  await chooseScenario(root, 'Quiet');
  await chooseContext(root, 'prepared');
  await showSection(root, 'compare');
  await chooseCompare(root, 'Active data on preview: Ready at generation 3');
  await waitFor(() => assert.deepEqual(deltas(root)[0], ['orders.count', '−3', '−100%']));
  const first = reads(state, 'compare')[0];
  assert.deepEqual([first.left.context, first.left.generation, key(first.right)], ['active', 3, key(quietPrepared)], 'the active data is the baseline, pinned at generation 3');

  // Another operator activates: the snapshot now offers generation 4.
  state.snapshot = snapshotWith((target) => {
    target.generation = 4;
    target.explore_active = { ...target.explore_active, generation: 4 };
  });
  const before = reads(state, 'compare').length;
  await runtime.refresh();
  const stale = await waitFor(() => {
    const found = root.querySelector('[data-insights-state="stale"]');
    assert.ok(found, sectionText(root));
    return found;
  });
  assert.ok(textOf(stale).includes('it is now Ready at generation 4 (receipt rcpt-ready-1). Compare again to use the current active data.'), textOf(stale));
  assert.equal(root.querySelectorAll('.console-insights__pair').length, 0, 'values of the old generation are gone');
  await settle();
  assert.equal(reads(state, 'compare').length, before, 'nothing is repinned silently');

  click(stale.querySelector('[data-insights-action="compare-current"]'));
  await waitFor(() => assert.equal(reads(state, 'compare').at(-1).left.generation, 4));
  await waitFor(() => assert.deepEqual(deltas(root)[0], ['orders.count', '−3', '−100%']));
  assert.equal(root.querySelector('[data-insights-state="stale"]'), null);
  runtime.destroy();
});

test('a generation change during the comparison read answers stale and offers Refresh', async () => {
  server({ compare: () => errorResponse(409, 'stale') });
  const { root, runtime } = mount();
  await openReady(root, runtime);
  await chooseContext(root, 'prepared');
  await showSection(root, 'compare');
  await chooseCompare(root, 'Active data on preview');
  const failure = await waitFor(() => {
    const found = root.querySelector('[data-insights-failure]');
    assert.ok(found, sectionText(root));
    return found;
  });
  assert.equal(failure.dataset.insightsFailure, 'stale');
  assert.ok(textOf(failure).includes('The data changed since this view loaded. Refresh to read the current state.'));
  assert.ok(failure.querySelector('[data-explorer-action="refresh"]'), 'stale offers Refresh, not Try again');
  assert.equal(root.querySelectorAll('.console-insights__pair').length, 0);
  runtime.destroy();
});

test('a provider without insights explains itself and blocks comparison', async () => {
  server();
  const { root, runtime } = mount();
  await openReady(root, runtime);
  await chooseScenario(root, 'dst-week');
  await showSection(root, 'insights');
  await waitFor(() => assert.ok(root.querySelector('[data-insights-state="unsupported"]'), sectionText(root)));
  await showSection(root, 'compare');
  await waitFor(() => assert.ok(root.querySelector('[data-insights-state="blocked"]'), sectionText(root)));
  assert.ok(sectionText(root).includes('does not offer insights for the data shown, so it cannot be compared'));
  assert.equal(root.querySelector('select[data-insights-control="compare"]').disabled, true);
  runtime.destroy();
});

test('console denial drops insights and cancels in-flight reads', async () => {
  const state = server({ insights: () => ({ deferred: () => jsonResponse(insightsNamed('ready_catalog')) }) });
  const { root, runtime } = mount();
  await openReady(root, runtime);
  await showSection(root, 'insights');
  await waitFor(() => assert.equal(state.deferred.length, 1));
  const explore = globalThis.fetch;
  globalThis.fetch = async (input, init) => (String(input).endsWith('/api/snapshot') ? errorResponse(403, 'revoked') : explore(input, init));
  await runtime.refresh();
  await waitFor(() => assert.equal(runtime.getState(), 'denied'));
  assert.equal(explorerRoot(root), null, 'no explorer or insights markup survives denial');
  assert.equal(state.deferred[0].request.signal.aborted, true, 'the in-flight insights read is canceled');
  state.deferred[0].release();
  await settle();
  assert.equal(root.querySelectorAll('.console-insights').length, 0);
  runtime.destroy();
});

test('a new authorized snapshot re-authorizes shown insights and withdraws them on denial', async () => {
  const answer = { status: 200 };
  const state = server({ insights: (request) => (answer.status === 200 ? undefined : errorResponse(answer.status, 'revoked')) });
  const { root, runtime } = mount();
  await openReady(root, runtime);
  await showSection(root, 'insights');
  await waitFor(() => assert.ok(sectionText(root).includes('Orders Example 3 orders')));
  const shown = root.querySelector('.console-insights');
  const count = reads(state, 'insights').length;

  await runtime.refresh();
  await waitFor(() => assert.ok(reads(state, 'insights').length > count, 'the shown selection is read again'));
  await settle();
  assert.equal(root.querySelector('.console-insights'), shown, 'an unchanged answer does not re-render');

  answer.status = 403;
  await runtime.refresh();
  await waitFor(() => assert.equal(root.querySelector('[data-insights-failure]')?.dataset.insightsFailure, 'denied', sectionText(root)));
  assert.ok(!sectionText(root).includes('Orders Example 3 orders'), 'withdrawn values are gone');
  runtime.destroy();
});

test('a comparison chosen while the shown selection is read waits for its metric set', async () => {
  const state = server({
    insights: (request) => (request.selection.context === 'prepared' ? { deferred: () => jsonResponse(insightsNamed('ready_prepared')) } : undefined),
  });
  const { root, runtime } = mount();
  await openReady(root, runtime);
  await chooseContext(root, 'prepared');
  await showSection(root, 'compare');
  await waitFor(() => assert.equal(state.deferred.length, 1, 'the shown selection is read first'));
  await chooseCompare(root, 'Quiet: prepared receipt rcpt-empty-1');
  await waitFor(() => assert.ok(sectionText(root).includes('Reading the data shown'), sectionText(root)));
  const swap = root.querySelector('[data-insights-action="swap"]');
  assert.equal(swap.getAttribute('aria-disabled'), 'true', 'Swap waits for the metric set');
  click(swap);
  await settle();
  assert.equal(reads(state, 'compare').length, 0, 'nothing is compared before the metric set is known');
  state.deferred[0].release();
  await waitFor(() => assert.deepEqual(deltas(root)[0], ['orders.count', '−3', '−100%']));
  assert.deepEqual(reads(state, 'compare').map((request) => request.metricSet), ['orders'], 'one comparison, with the learned metric set');
  runtime.destroy();
});

test('keyboard focus stays in the details when a lazy read lands', async () => {
  const state = server({ insights: () => ({ deferred: () => jsonResponse(insightsNamed('ready_catalog')) }) });
  const { root, runtime } = mount();
  await openReady(root, runtime);
  await showSection(root, 'insights');
  await waitFor(() => assert.equal(state.deferred.length, 1));
  root.querySelector('[data-explorer-section-panel]').focus();
  assert.equal(win.document.activeElement?.dataset.explorerFocus, 'section-panel');
  state.deferred[0].release();
  await waitFor(() => assert.ok(sectionText(root).includes('Orders Example 3 orders')));
  assert.equal(win.document.activeElement?.dataset.explorerSectionPanel, 'insights', 'focus returns to the re-rendered panel, never the page body');
  runtime.destroy();
});

test('a second drift names the active data offered now', async () => {
  const state = server({
    compare: (request) => (request.left.context === 'active' ? jsonResponse(comparisonFor('ready_active_vs_quiet_prepared', request.left, request.right)) : undefined),
  });
  const { root, runtime } = mount();
  await openReady(root, runtime);
  await chooseScenario(root, 'Quiet');
  await chooseContext(root, 'prepared');
  await showSection(root, 'compare');
  await chooseCompare(root, 'Active data on preview');
  await waitFor(() => assert.deepEqual(deltas(root)[0], ['orders.count', '−3', '−100%']));
  for (const generation of [4, 5]) {
    state.snapshot = snapshotWith((target) => {
      target.generation = generation;
      target.explore_active = { ...target.explore_active, generation };
    });
    await runtime.refresh();
    await waitFor(() => assert.ok(textOf(root.querySelector('[data-insights-state="stale"]')).includes(`at generation ${generation} (receipt rcpt-ready-1)`), sectionText(root)));
  }
  click(root.querySelector('[data-insights-action="compare-current"]'));
  await waitFor(() => assert.equal(reads(state, 'compare').at(-1).left.generation, 5, 'the current generation is pinned on request'));
  runtime.destroy();
});

test('a pinned active side that is briefly withdrawn and returns unchanged is not called changed', async () => {
  const state = server({
    compare: (request) => (request.left.context === 'active' ? jsonResponse(comparisonFor('ready_active_vs_quiet_prepared', request.left, request.right)) : undefined),
  });
  const { root, runtime } = mount();
  await openReady(root, runtime);
  await chooseScenario(root, 'Quiet');
  await chooseContext(root, 'prepared');
  await showSection(root, 'compare');
  await chooseCompare(root, 'Active data on preview');
  await waitFor(() => assert.deepEqual(deltas(root)[0], ['orders.count', '−3', '−100%']));
  // The target switches: the Overview withholds its active selection, then shows the same one again.
  state.snapshot = snapshotWith((target) => {
    delete target.explore_active;
  });
  await runtime.refresh();
  await waitFor(() => assert.ok(textOf(root.querySelector('[data-insights-state="stale"]')).includes('you chose is no longer offered'), sectionText(root)));
  state.snapshot = snapshotWith(() => {});
  await runtime.refresh();
  await waitFor(() => assert.ok(textOf(root.querySelector('[data-insights-state="stale"]')).includes('The active data on preview was briefly unavailable. Compare again to read it.'), sectionText(root)));
  click(root.querySelector('[data-insights-action="compare-current"]'));
  await waitFor(() => assert.deepEqual(deltas(root)[0], ['orders.count', '−3', '−100%']));
  assert.equal(reads(state, 'compare').at(-1).left.generation, 3);
  runtime.destroy();
});
