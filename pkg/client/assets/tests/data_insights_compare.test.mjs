import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Two-side comparison controls, views and read state from the shipped
// `console/data-insights` entry. Candidates come from the Data console golden's
// projected selections; replies are built from the frozen data.Insight* types
// (pkg/client/data_insights_contract_test.go).

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();
const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(fs.readFileSync(path.join(here, 'fixtures/data-insights-contract.json'), 'utf8'));
const golden = JSON.parse(fs.readFileSync(path.join(here, 'fixtures/data-console-contract.json'), 'utf8'));
const {
  CompareSession,
  InsightsSession,
  catalogTitle,
  compareCandidates,
  defaultPair,
  describeSelection,
  parseComparison,
  parseInsights,
  renderCompare,
} = await import('../dist/console/data-insights.js');

const METRIC_SET = fixture.metric_set_id;
const clone = (value) => JSON.parse(JSON.stringify(value));
const squash = (value) => value.replace(/\s+/g, ' ').trim();

function fragment(html) {
  const dom = new JSDOM(`<!doctype html><body><div id="host">${html}</div></body>`);
  return dom.window.document.getElementById('host');
}

function textOf(element) {
  if (!element) return '';
  const walker = element.ownerDocument.createTreeWalker(element, element.ownerDocument.defaultView.NodeFilter.SHOW_TEXT);
  const parts = [];
  while (walker.nextNode()) parts.push(walker.currentNode.nodeValue);
  return squash(parts.join(' '));
}

// The corpus-a catalog exactly as the explorer builds it from the golden rows.
const panels = Object.fromEntries(golden.bootstrap.snapshot.panels.map((panel) => [panel.id, (panel.records || []).map((record) => record.data)]));
const datasetRow = panels.datasets.find((row) => row.dataset_id === 'corpus-a');
const dataset = {
  key: datasetRow.key,
  label: datasetRow.label,
  provider: datasetRow.provider,
  datasetId: datasetRow.dataset_id,
  version: datasetRow.version,
  digest: datasetRow.digest,
  scenarios: panels.scenarios.filter((row) => row.dataset_key === datasetRow.key).map((row) => ({
    key: row.key,
    label: row.label,
    scenarioId: row.scenario_id,
    version: row.version,
    targetId: row.target_id,
    selections: { ...(row.explore || {}) },
  })),
};
const active = panels.overview[0].targets.find((target) => target.target_id === 'preview').explore_active;
const scenarioSelection = (id, context) => dataset.scenarios.find((scenario) => scenario.scenarioId === id).selections[context];
const title = catalogTitle([dataset]);

const comparisonCase = (name) => {
  const found = fixture.comparisons.find((item) => item.name === name);
  assert.ok(found, `comparison ${name}`);
  return clone(found);
};

function model(name, display, overrides = {}) {
  const item = comparisonCase(name);
  const value = parseComparison(item.response, item.request.left, item.request.right, METRIC_SET);
  assert.ok(value, `${name} parses`);
  const shown = overrides.shown || item.request.left;
  return {
    scope: 'compare-test',
    shown,
    candidates: compareCandidates(dataset, shown, active, title),
    choice: '',
    pair: { left: item.request.left, right: item.request.right },
    describe: (selection) => describeSelection(selection, shown, title),
    entry: { status: 'ready', value },
    display,
    ...overrides,
  };
}

const render = (name, display, overrides) => fragment(renderCompare(model(name, display, overrides)));

/** [metric, A, B, difference, change, note] from the chart pairs. */
function chartRows(root) {
  return Array.from(root.querySelectorAll('.console-insights__pair')).map((pair) => {
    const side = (letter) => textOf(pair.querySelector(`.console-insights__pair-bars [data-side="${letter}"] .console-insights__bar-value`)).replace(/^[AB]: /, '').replace(/ Example$/, '');
    const delta = pair.querySelector('.console-insights__delta');
    const change = textOf(delta.querySelector('.console-insights__delta-change')).replace(/^Change /, '');
    return [pair.dataset.metricId, side('a'), side('b'), textOf(delta.querySelector('.console-insights__delta-value')), change || '—', textOf(delta.querySelector('.console-insights__delta-note')) || '—'];
  });
}

function tableRows(root) {
  return Array.from(root.querySelectorAll('[data-insights-table="compare"] tbody tr')).map((row) => {
    const value = (label) => textOf(row.querySelector(`td[data-label="${label}"]`));
    // Side columns are "A"/"B", or "A (example)"/"B (example)" for example sides.
    const side = (letter) => textOf(row.querySelector(`td[data-label^="${letter}"]`));
    const unit = value('Unit');
    const withUnit = (text) => (/^[-\d.,]+$/.test(text) && unit !== '—' ? `${text} ${unit}` : text);
    return [row.dataset.metricId, withUnit(side('A')), withUnit(side('B')), value('Difference (B − A)'), value('Change'), value('Notes')];
  });
}

function chartCoverage(root) {
  return ['a', 'b'].map((side) => Array.from(root.querySelectorAll(`.console-insights__coverage-side[data-side="${side}"] .console-insights__day`))
    .map((day) => [day.dataset.localDay, day.dataset.status]));
}

function tableCoverage(root) {
  const rows = Array.from(root.querySelectorAll('[data-insights-table="compare-coverage"] tbody tr'));
  return ['a', 'b'].map((side) => rows.map((row) => [row.dataset.localDay, row.getAttribute(`data-side-${side}`)]));
}

test('every Go-typed comparison normalizes for its exact pair only', () => {
  for (const item of fixture.comparisons) {
    assert.ok(parseComparison(clone(item.response), item.request.left, item.request.right, METRIC_SET), `${item.name} parses`);
  }
  const item = comparisonCase('ready_vs_quiet_prepared');
  assert.equal(parseComparison(item.response, item.request.right, item.request.left, METRIC_SET), null, 'swapped sides are a different pair');
  assert.equal(parseComparison(item.response, item.request.left, item.request.right, 'customers'), null, 'another metric set is foreign');

  // A delta the server did not mark comparable, or between examples, is never kept.
  const forged = clone(comparisonCase('ready_vs_quiet_catalog').response);
  forged.metrics[0].compatibility = 'comparable';
  forged.metrics[0].delta = -3;
  const examples = comparisonCase('ready_vs_quiet_catalog').request;
  const parsedForged = parseComparison(forged, examples.left, examples.right, METRIC_SET);
  assert.deepEqual([parsedForged.metrics[0].compatibility, parsedForged.metrics[0].delta, parsedForged.metrics[0].reason], ['incompatible', null, 'not_observed']);

  // One withheld side withholds both sides and every declaration.
  const leaked = clone(comparisonCase('ready_vs_quiet_prepared').response);
  leaked.left = clone(comparisonCase('withheld').response.left);
  const pair = comparisonCase('ready_vs_quiet_prepared').request;
  const withheld = parseComparison(leaked, pair.left, pair.right, METRIC_SET);
  assert.deepEqual([withheld.metrics.length, withheld.right.metrics.length, withheld.right.coverage.length, withheld.right_declarations.usages.length], [0, 0, 0, 0]);
});

test('candidates: the active data pinned at its generation and other scenario contexts, never the shown selection', () => {
  const shown = scenarioSelection('ready', 'prepared');
  const candidates = compareCandidates(dataset, shown, active, title);
  assert.deepEqual(candidates.map((candidate) => candidate.label), [
    'Active data on preview: ready v1 at generation 3',
    'ready v1: catalog example',
    'empty-history v1: catalog example',
    'empty-history v1: prepared receipt rcpt-empty-1',
    'dst-week v1: catalog example',
    'dst-week v1: prepared receipt rcpt-dst-1',
  ]);
  assert.deepEqual(candidates[0].selection, active, 'the active candidate is the projected selection, unchanged');
  assert.equal(compareCandidates(dataset, active, active, title).some((candidate) => candidate.active), false, 'the shown active data is not its own candidate');
  assert.equal(compareCandidates(dataset, shown, { ...active, target_id: 'staging' }, title).some((candidate) => candidate.active), false, 'active data of another target is not offered');

  const pair = defaultPair(scenarioSelection('empty-history', 'prepared'), candidates[0]);
  assert.deepEqual([pair.left.context, pair.right.context], ['active', 'prepared'], 'the active data is the default baseline');
  assert.deepEqual(defaultPair(shown, candidates[3]).left, shown, 'otherwise the shown selection is the baseline');
});

test('sides name their exact identity, role and baseline', () => {
  const root = render('ready_vs_quiet_prepared', 'chart');
  const sides = Array.from(root.querySelectorAll('.console-insights__side')).map(textOf);
  assert.equal(sides[0], 'A A, baseline: ready v1 Prepared receipt · Shown selection · Baseline receipt rcpt-ready-1 · content revision 2 · target preview Observed · Complete · Read ' + textOf(root.querySelector('.console-insights__side[data-side="a"] time')));
  assert.ok(sides[1].startsWith('B B: empty-history v1 Prepared receipt · Compared selection receipt rcpt-empty-1 · content revision 1 · target preview Observed · Complete'), sides[1]);
  const activeSide = textOf(render('quiet_prepared_vs_ready_active', 'chart').querySelector('.console-insights__side[data-side="b"]'));
  assert.ok(activeSide.includes('B: ready v1 Active data receipt rcpt-ready-1 · content revision 2 · generation 3 · target preview'), activeSide);
  const activeBaseline = textOf(render('ready_active_vs_quiet_prepared', 'chart', { shown: comparisonCase('ready_active_vs_quiet_prepared').request.right }).querySelector('.console-insights__side[data-side="a"]'));
  assert.ok(activeBaseline.includes('Active data · Baseline receipt rcpt-ready-1'), activeBaseline);
});

test('Ready versus Quiet: server deltas for comparable observed values, reasons otherwise, same in chart and table', () => {
  const chart = render('ready_vs_quiet_prepared', 'chart');
  const table = render('ready_vs_quiet_prepared', 'table');
  const expected = [
    ['orders.count', '3 orders', '0 orders', '−3', '−100%', '—'],
    ['orders.amount', '250 USD cents', '0 USD cents', '−250', '−100%', '—'],
    ['orders.status', '3 orders', '0 orders', 'Not compared', '—', 'Denominators differ or are unknown.'],
  ];
  assert.deepEqual(chartRows(chart), expected);
  assert.deepEqual(tableRows(table), expected);
  const categories = Array.from(chart.querySelectorAll('.console-insights__pair[data-metric-id="orders.status"] .console-insights__pair-bucket'))
    .map((bucket) => [
      textOf(bucket.querySelector('.console-insights__bar-label')),
      ...['a', 'b'].map((side) => textOf(bucket.querySelector(`[data-side="${side}"] .console-insights__bar-value`)).replace(/^[AB]: /, '')),
    ].join(' '));
  assert.deepEqual(categories, ['Paid 2 Not reported', 'Refunded 1 Not reported'], 'categories show values side by side, never a per-category difference');
  const categoryTable = Array.from(table.querySelectorAll('[data-insights-table="compare-categories"] tbody tr')).map(textOf);
  assert.deepEqual(categoryTable, ['Paid 2 Not reported', 'Refunded 1 Not reported']);
  assert.deepEqual(chartCoverage(chart), tableCoverage(table), 'coverage states match');
  assert.deepEqual(chartCoverage(chart), [[['2026-01-01', 'covered']], [['2026-01-01', 'covered_empty']]]);
  assert.ok(textOf(chart).includes('Differences are computed by the server only for comparable observed values'), 'the basis is stated');
});

test('a zero baseline keeps the absolute difference and says the percentage is not defined', () => {
  for (const display of ['chart', 'table']) {
    const root = render('quiet_prepared_vs_ready_active', display);
    const rows = display === 'chart' ? chartRows(root) : tableRows(root);
    assert.deepEqual(rows[0], ['orders.count', '0 orders', '3 orders', '+3', 'Not defined (zero baseline)', '—']);
    assert.ok(!textOf(root).includes('Infinity') && !textOf(root).includes('NaN'), 'no infinite percentage');
  }
});

test('catalog examples sit side by side with Example tags and no difference', () => {
  const chart = render('ready_vs_quiet_catalog', 'chart');
  const text = textOf(chart);
  assert.ok(text.includes('Both sides are catalog examples: values the providers declare. They are not observed, so no difference is computed.'), text);
  for (const row of chartRows(chart)) {
    assert.equal(row[3], 'Not compared', `${row[0]} has no difference`);
    assert.equal(row[5], 'Example values are declarations, not observations, so no difference is computed.');
  }
  const rows = Array.from(chart.querySelectorAll('.console-insights__pair-row'));
  assert.ok(rows.length > 0 && rows.every((row) => row.querySelector('.console-insights__tag[data-provenance="example"]')), 'every example value carries its own tag');
  const table = render('ready_vs_quiet_catalog', 'table');
  assert.equal(textOf(table.querySelector('[data-insights-table="compare"] caption')), 'Metrics (example values declared by the providers, not observed)');
  assert.deepEqual(Array.from(table.querySelectorAll('[data-insights-table="compare"] thead th')).map(textOf).slice(2, 4), ['A (example)', 'B (example)']);
  const coverage = chartCoverage(chart);
  assert.deepEqual(coverage, [[['2026-01-01', 'uncovered']], [['2026-01-01', 'uncovered']]], 'expected days are never coverage');
});

test('mismatched populations and a missing metric explain themselves; distant periods stay aligned', () => {
  const chart = render('ready_vs_dst_prepared', 'chart');
  const table = render('ready_vs_dst_prepared', 'table');
  assert.deepEqual(chartRows(chart), tableRows(table));
  const byId = Object.fromEntries(chartRows(chart).map((row) => [row[0], row]));
  assert.deepEqual(byId['orders.count'].slice(1), ['3 orders', '12 orders', 'Not compared', '—', 'At least one side is incomplete.']);
  assert.deepEqual(byId['customers.count'].slice(1), ['Not reported', 'Unavailable', 'Not compared', '—', 'Only one side reports this metric.']);
  const [a, b] = chartCoverage(chart);
  assert.equal(a.length, 91, 'both calendars span the same 91 local days');
  assert.deepEqual(a.filter(([, status]) => status !== 'not_reported'), [['2026-01-01', 'covered']]);
  assert.deepEqual(b.filter(([, status]) => status !== 'not_reported').map(([day]) => day), ['2026-03-26', '2026-03-27', '2026-03-28', '2026-03-30', '2026-03-31', '2026-04-01']);
  assert.deepEqual(chartCoverage(chart), tableCoverage(table));
  assert.ok(textOf(chart).includes('Local days in UTC (A) and Europe/London (B).'), 'differing timezones are named per side');
});

test('a withheld comparison shows neither side’s values', () => {
  for (const display of ['chart', 'table']) {
    const root = render('withheld', display);
    assert.equal(root.querySelector('[data-insights-state]').dataset.insightsState, 'suppressed');
    assert.equal(root.querySelectorAll('.console-insights__pair, table, .console-insights__day, .console-insights__declared').length, 0);
  }
});

test('declared outcomes and usage appear per side as declarations, not checks', () => {
  const root = render('ready_vs_quiet_prepared', 'chart');
  const [a, b] = Array.from(root.querySelectorAll('.console-insights__declared')).map(textOf);
  assert.ok(a.includes('Expected outcomes (declared, not verified) Three orders totaling 250 All orders on 2026-01-01 (UTC)'), a);
  assert.ok(b.includes('No orders'), b);
  assert.ok(a.includes('Daily sales report Report Prepare Not declared — effect unknown Verify Checks the daily total. Activate Report shows the scenario\'s orders.'), a);
  assert.ok(textOf(root).includes('Declarations are not executed checks or observed effects. Both sides declare the same outcomes and usage.') === false, 'outcomes differ, so they are not called the same');
  assert.ok(textOf(root).includes('Other uses may exist; this list is declared, not discovered.'));
});

test('controls: a labelled select of candidates, Swap only with a pinned pair, stale pins ask for a new choice', () => {
  const shown = scenarioSelection('ready', 'prepared');
  const candidates = compareCandidates(dataset, shown, active, title);
  const base = { scope: 's', shown, candidates, choice: '', pair: undefined, describe: (selection) => describeSelection(selection, shown, title), entry: undefined, display: 'chart' };
  const unchosen = fragment(renderCompare(base));
  const select = unchosen.querySelector('select[data-insights-control="compare"]');
  assert.equal(textOf(select.closest('label')).startsWith('Compare with'), true);
  assert.deepEqual(Array.from(select.options).map((option) => option.value).slice(1), candidates.map((candidate) => candidate.key));
  assert.equal(select.value, '', 'nothing is compared until chosen');
  assert.equal(unchosen.querySelector('[data-insights-action="swap"]').getAttribute('aria-disabled'), 'true');
  assert.equal(unchosen.querySelector('[data-insights-state]').dataset.insightsState, 'unchosen');

  const chosen = fragment(renderCompare({ ...base, choice: candidates[2].key, pair: defaultPair(shown, candidates[2]), entry: { status: 'loading' } }));
  assert.equal(chosen.querySelector('select').value, candidates[2].key);
  assert.equal(chosen.querySelector('[data-insights-action="swap"]').hasAttribute('aria-disabled'), false);
  assert.equal(chosen.querySelector('[role="status"]').getAttribute('aria-busy'), 'true');

  const gone = fragment(renderCompare({ ...base, choice: 'missing', pair: defaultPair(shown, candidates[0]), stale: 'The active data changed to generation 4. Compare again to use the current active data.' }));
  assert.equal(gone.querySelector('select option:checked').textContent, 'The chosen selection is no longer offered');
  const stale = gone.querySelector('[data-insights-state="stale"]');
  assert.ok(textOf(stale).includes('generation 4'));
  assert.ok(stale.querySelector('[data-insights-action="compare-current"]'));
  assert.equal(gone.querySelectorAll('.console-insights__pair').length, 0, 'a stale pin shows no values');

  const failed = fragment(renderCompare({ ...base, choice: candidates[2].key, pair: defaultPair(shown, candidates[2]), entry: { status: 'failed', failure: { kind: 'timeout', status: 504 } } }));
  assert.equal(failed.querySelector('[role="alert"] button').dataset.insightsAction, 'compare-retry');

  const none = fragment(renderCompare({ ...base, candidates: [] }));
  assert.equal(none.querySelector('[data-insights-state]').dataset.insightsState, 'no-candidates');
  assert.equal(none.querySelector('select').disabled, true);
});

test('provider strings render as text in comparisons', () => {
  const item = comparisonCase('ready_vs_quiet_prepared');
  const value = parseComparison(item.response, item.request.left, item.request.right, METRIC_SET);
  const hostile = '<img src=x onerror="window.__insightsXSS=1">';
  value.metrics[0].left.label = hostile;
  value.left_declarations.expected_outcomes = [hostile];
  value.left_declarations.usages[0].label = hostile;
  const root = fragment(renderCompare({ ...model('ready_vs_quiet_prepared', 'chart'), entry: { status: 'ready', value }, describe: () => ({ title: hostile, context: hostile, identity: hostile, dataset: hostile }) }));
  assert.equal(root.querySelectorAll('img, script').length, 0);
  assert.ok(textOf(root).includes(hostile));
});

/** A read stub whose answers wait for `release`, recording each request. */
function deferredReads() {
  const calls = [];
  const read = (key, signal) => new Promise((resolve) => {
    calls.push({ key, signal, resolve });
  });
  return { calls, read };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

test('CompareSession: choosing again, swapping and drift drop every superseded answer', async () => {
  const shown = scenarioSelection('ready', 'prepared');
  const candidates = compareCandidates(dataset, shown, active, title);
  const reads = deferredReads();
  let changes = 0;
  const session = new CompareSession((pair, signal) => reads.read(pair, signal), () => { changes += 1; });
  const answer = (name) => {
    const item = comparisonCase(name);
    return { ok: true, value: parseComparison(item.response, item.request.left, item.request.right, METRIC_SET) };
  };

  session.choose(shown, candidates[3]); // Quiet prepared
  session.choose(shown, candidates[0]); // active data: A is the active baseline
  assert.equal(reads.calls[0].signal.aborted, true, 'the superseded read is aborted');
  reads.calls[0].resolve(answer('ready_vs_quiet_prepared'));
  await flush();
  assert.equal(changes, 0, 'a late answer for another pair is dropped');
  assert.deepEqual([session.pair.left.context, session.pair.right.context], ['active', 'prepared']);

  session.swap();
  assert.equal(reads.calls[1].signal.aborted, true, 'swapping aborts the read for the old orientation');
  assert.deepEqual([reads.calls[2].key.left.context, reads.calls[2].key.right.context], ['prepared', 'active']);
  reads.calls[1].resolve(answer('ready_active_vs_quiet_prepared'));
  await flush();
  assert.equal(session.entry.status, 'loading');
  reads.calls[2].resolve({ ok: false, failure: { kind: 'stale', status: 409 } });
  await flush();
  assert.deepEqual([changes, session.entry.status, session.entry.failure.kind], [1, 'failed', 'stale']);

  session.markDrifted('The active data changed.');
  assert.equal(session.entry, undefined, 'a drifted pin keeps nothing it loaded');
  session.swap();
  session.retry();
  assert.equal(reads.calls.length, 3, 'a drifted pin is never read again without a new choice');
  session.choose(shown, candidates[3]);
  assert.equal(session.stale, '');
  assert.equal(reads.calls.length, 4);
});

test('CompareSession and InsightsSession re-authorize shown answers without flicker', async () => {
  const pair = comparisonCase('ready_vs_quiet_prepared');
  const value = parseComparison(pair.response, pair.request.left, pair.request.right, METRIC_SET);
  const reads = deferredReads();
  let changes = 0;
  const session = new CompareSession((request, signal) => reads.read(request, signal), () => { changes += 1; });
  const shown = pair.request.left;
  const candidate = compareCandidates(dataset, shown, active, title).find((item) => item.selection.receipt_id === 'rcpt-empty-1');
  session.choose(shown, candidate);
  reads.calls[0].resolve({ ok: true, value });
  await flush();
  assert.equal(changes, 1);

  session.revalidate();
  assert.equal(reads.calls.length, 1, 'nothing is read again until a new snapshot asks');
  session.markStale();
  session.revalidate();
  const reread = clone(value);
  reread.observed_at = '2026-10-03T13:00:00Z';
  reread.comparison_id = 'comparison-later';
  reread.left.observed_at = reread.observed_at;
  reads.calls[1].resolve({ ok: true, value: reread });
  await flush();
  assert.equal(changes, 1, 'an equal answer read later is not a change');

  session.markStale();
  session.revalidate();
  reads.calls[2].resolve({ ok: false, failure: { kind: 'timeout', status: 504 } });
  await flush();
  assert.deepEqual([changes, session.entry.status], [1, 'ready'], 'a transient failure keeps what is shown');

  session.markStale();
  session.revalidate();
  reads.calls[3].resolve({ ok: false, failure: { kind: 'denied', status: 403 } });
  await flush();
  assert.deepEqual([changes, session.entry.status, session.entry.failure.kind], [2, 'failed', 'denied'], 'a withdrawing failure replaces it');

  const insightsReads = deferredReads();
  let insightChanges = 0;
  const insights = new InsightsSession((selection, signal) => insightsReads.read(selection, signal), () => { insightChanges += 1; });
  const ready = fixture.insights.find((item) => item.name === 'ready_prepared');
  const quiet = fixture.insights.find((item) => item.name === 'quiet_prepared');
  insights.load(ready.request.selection);
  insights.load(quiet.request.selection);
  assert.equal(insightsReads.calls[0].signal.aborted, true);
  insightsReads.calls[0].resolve({ ok: true, value: parseInsights(clone(ready.response), ready.request.selection, METRIC_SET) });
  await flush();
  assert.equal(insights.entry(ready.request.selection), undefined, 'the superseded selection never lands');
  insightsReads.calls[1].resolve({ ok: true, value: parseInsights(clone(quiet.response), quiet.request.selection, METRIC_SET) });
  await flush();
  assert.equal(insights.entry(quiet.request.selection).status, 'ready');
  assert.equal(insightChanges, 1);
  insights.load(quiet.request.selection);
  assert.equal(insightsReads.calls.length, 2, 'a loaded selection is not read again without force');
});

test('a mixed comparison labels only the example side as example values', () => {
  const examples = comparisonCase('ready_vs_quiet_catalog');
  const observed = fixture.insights.find((item) => item.name === 'ready_prepared');
  const reply = clone(examples.response);
  reply.left = clone(observed.response);
  const value = parseComparison(reply, observed.request.selection, examples.request.right, METRIC_SET);
  assert.ok(value, 'an observed A and an example B parse');
  const base = model('ready_vs_quiet_catalog', 'chart', { shown: observed.request.selection });
  const chart = fragment(renderCompare({ ...base, pair: { left: observed.request.selection, right: examples.request.right }, entry: { status: 'ready', value } }));
  const tagged = (side) => Array.from(chart.querySelectorAll(`.console-insights__pair-row[data-side="${side}"]`)).map((row) => Boolean(row.querySelector('.console-insights__tag')));
  assert.ok(tagged('a').length > 0 && tagged('a').every((tag) => !tag), 'observed A values carry no Example tag');
  assert.ok(tagged('b').every(Boolean), 'every example B value is tagged');
  assert.ok(textOf(chart).includes('B is a catalog example: values the provider declares for this scenario. They are not observed and not verified. No difference is computed against it.'), textOf(chart));
  const table = fragment(renderCompare({ ...base, display: 'table', pair: { left: observed.request.selection, right: examples.request.right }, entry: { status: 'ready', value } }));
  assert.equal(textOf(table.querySelector('[data-insights-table="compare"] caption')), 'Metrics (B shows example values declared by the provider, not observed)');
  assert.deepEqual(Array.from(table.querySelectorAll('[data-insights-table="compare"] thead th')).map(textOf).slice(2, 4), ['A', 'B (example)']);
  assert.ok(table.querySelector('td[data-label="B (example)"]') && table.querySelector('td[data-label="A"]'), 'narrow row cards name the example side too');
});

test('a comparison never reads before the metric set is known, then reads the pinned pair once', async () => {
  const shown = scenarioSelection('ready', 'prepared');
  const candidates = compareCandidates(dataset, shown, active, title);
  const reads = deferredReads();
  let ready = false;
  const session = new CompareSession((pair, signal) => reads.read(pair, signal), () => {}, () => ready);
  session.choose(shown, candidates[3]);
  session.swap();
  session.retry();
  session.markStale();
  session.revalidate();
  assert.equal(reads.calls.length, 0, 'choose, swap, retry and revalidation wait for the metric set');
  assert.deepEqual([session.pair.left.receipt_id, session.pair.right.receipt_id], ['rcpt-empty-1', 'rcpt-ready-1'], 'the swapped pin is kept');
  assert.equal(session.entry, undefined);
  ready = true;
  session.ensure();
  session.ensure();
  assert.equal(reads.calls.length, 1, 'the pinned pair is read once when ready');
  assert.deepEqual([reads.calls[0].key.left.receipt_id, reads.calls[0].key.right.receipt_id], ['rcpt-empty-1', 'rcpt-ready-1']);

  // Swap is unavailable while the shown selection's metric set is unknown.
  const base = { scope: 's', shown, candidates, choice: candidates[3].key, pair: defaultPair(shown, candidates[3]), describe: (selection) => describeSelection(selection, shown, title), entry: undefined, display: 'chart' };
  for (const prerequisite of [{ status: 'loading' }, { status: 'failed', failure: { kind: 'timeout', status: 504 } }]) {
    const root = fragment(renderCompare({ ...base, prerequisite }));
    assert.equal(root.querySelector('[data-insights-action="swap"]').getAttribute('aria-disabled'), 'true', `swap waits while ${prerequisite.status}`);
  }
  assert.equal(fragment(renderCompare(base)).querySelector('[data-insights-action="swap"]').hasAttribute('aria-disabled'), false);
});

test('coverage evidence that does not bind keeps nothing and covered-empty needs a verification', () => {
  const example = fixture.insights.find((item) => item.name === 'ready_catalog');
  const claimed = clone(example.response);
  claimed.coverage[0] = { ...claimed.coverage[0], status: 'covered', evidence: { selection: example.request.selection, ref: 'expected', verification_id: 'ver-x' } };
  assert.deepEqual(parseInsights(claimed, example.request.selection, METRIC_SET).coverage[0], { local_day: '2026-01-01', timezone: 'UTC', status: 'unavailable', evidence: null, reason: 'unbound_evidence' });
  const quiet = fixture.insights.find((item) => item.name === 'quiet_prepared');
  const unverified = clone(quiet.response);
  unverified.coverage[0].evidence.verification_id = '';
  const day = parseInsights(unverified, quiet.request.selection, METRIC_SET).coverage[0];
  assert.deepEqual([day.status, day.evidence, day.reason], ['unavailable', null, 'unbound_evidence'], 'covered-empty without a verification is not coverage');
});
