import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Data insights presentation (composition and coverage) from the shipped
// `console/data-insights` entry, rendered from replies built with the frozen
// data.Insight* wire types (pkg/client/data_insights_contract_test.go).

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
const insights = await import('../dist/console/data-insights.js');
const { parseInsights, renderInsights, renderComposition, renderCoverage } = insights;

const METRIC_SET = fixture.metric_set_id;
const clone = (value) => JSON.parse(JSON.stringify(value));
const named = (name) => {
  const found = fixture.insights.find((item) => item.name === name);
  assert.ok(found, `fixture ${name}`);
  return clone(found);
};
const parsed = (name) => {
  const item = named(name);
  const value = parseInsights(item.response, item.request.selection, METRIC_SET);
  assert.ok(value, `${name} parses`);
  return value;
};

function fragment(html) {
  const dom = new JSDOM(`<!doctype html><body><div id="host">${html}</div></body>`);
  return dom.window.document.getElementById('host');
}

const squash = (value) => value.replace(/\s+/g, ' ').trim();

function textOf(element) {
  if (!element) return '';
  const walker = element.ownerDocument.createTreeWalker(element, element.ownerDocument.defaultView.NodeFilter.SHOW_TEXT);
  const parts = [];
  while (walker.nextNode()) parts.push(walker.currentNode.nodeValue);
  return squash(parts.join(' '));
}

function render(name, display) {
  const value = parsed(name);
  return fragment(renderInsights({ scope: 'insights-test', selection: value.selection, entry: { status: 'ready', value }, display }));
}

/** [metric id, value text] from the chart's stat tiles and distribution totals. */
function chartTotals(root) {
  const stats = Array.from(root.querySelectorAll('.console-insights__stat')).map((stat) => [
    stat.dataset.metricId,
    textOf(stat.querySelector('.console-insights__stat-value')),
  ]);
  return stats;
}

function tableTotals(root) {
  return Array.from(root.querySelectorAll('[data-insights-table="totals"] tbody tr')).map((row) => {
    const value = textOf(row.querySelector('td[data-label="Value"]'));
    const unit = textOf(row.querySelector('td[data-label="Unit"]'));
    const known = row.dataset.status === 'known';
    return [row.dataset.metricId, known && unit !== '—' ? `${value} ${unit}` : value];
  });
}

function chartBuckets(root) {
  return Array.from(root.querySelectorAll('.console-insights__distribution')).map((figure) => [
    figure.dataset.metricId,
    Array.from(figure.querySelectorAll('.console-insights__bar-row')).map((row) => [
      textOf(row.querySelector('.console-insights__bar-label')),
      textOf(row.querySelector('.console-insights__bar-value')),
    ]),
  ]);
}

function tableBuckets(root) {
  return Array.from(root.querySelectorAll('.console-insights__distribution-table')).map((table) => [
    table.dataset.metricId,
    Array.from(table.querySelectorAll('tbody tr')).map((row) => {
      const share = textOf(row.querySelector('td[data-label="Share"]'));
      const value = textOf(row.querySelector('td[data-label="Value"]'));
      return [textOf(row.querySelector('td[data-label="Category"]')), share === '—' ? value : `${value} (${share})`];
    }),
  ]);
}

function chartDays(root) {
  return Array.from(root.querySelectorAll('.console-insights__day')).map((day) => [day.dataset.localDay, day.dataset.status]);
}

function tableDays(root) {
  return Array.from(root.querySelectorAll('[data-insights-table="coverage"] tbody tr')).map((row) => [row.dataset.localDay, row.dataset.status]);
}

test('every Go-typed insights reply normalizes for its exact selection and metric set only', () => {
  for (const item of fixture.insights) {
    const value = parseInsights(clone(item.response), item.request.selection, METRIC_SET);
    assert.ok(value, `${item.name} parses`);
    assert.equal(value.metric_set_id, METRIC_SET);
  }
  const ready = named('ready_prepared');
  const quiet = named('quiet_prepared');
  assert.equal(parseInsights(ready.response, quiet.request.selection, METRIC_SET), null, 'an answer for another selection is foreign');
  assert.equal(parseInsights(ready.response, ready.request.selection, 'customers'), null, 'an answer for another metric set is foreign');
  const active = named('ready_active');
  const stalePin = { ...active.request.selection, generation: 4 };
  assert.equal(parseInsights(active.response, stalePin, METRIC_SET), null, 'an active answer at another generation is foreign');
});

test('caps and bounded windows are enforced: over-cap lists are malformed, never truncated', () => {
  const base = named('ready_prepared');
  const metric = base.response.metrics[0];
  const tooMany = clone(base.response);
  tooMany.metrics = Array.from({ length: 17 }, (_, index) => ({ ...metric, id: `metric-${index}` }));
  assert.equal(parseInsights(tooMany, base.request.selection, METRIC_SET), null, '17 metrics exceed the cap');

  const buckets = clone(base.response);
  const distribution = buckets.metrics.find((item) => item.kind === 'distribution');
  distribution.buckets = Array.from({ length: 33 }, (_, index) => ({ id: `b${index}`, label: `B${index}`, value: 1, status: 'known' }));
  assert.equal(parseInsights(buckets, base.request.selection, METRIC_SET), null, '33 categories exceed the cap');

  const wide = clone(base.response);
  const evidence = wide.coverage[0].evidence;
  wide.coverage = [
    { local_day: '2026-01-01', timezone: 'UTC', status: 'covered', evidence },
    { local_day: '2026-04-01', timezone: 'UTC', status: 'covered', evidence },
  ];
  assert.equal(parseInsights(wide, base.request.selection, METRIC_SET), null, 'coverage beyond the 90-day window is malformed');

  const duplicate = clone(base.response);
  duplicate.coverage = [duplicate.coverage[0], duplicate.coverage[0]];
  assert.equal(parseInsights(duplicate, base.request.selection, METRIC_SET), null, 'a repeated local day is malformed');

  const badDay = clone(base.response);
  badDay.coverage[0].local_day = '2026-02-30';
  assert.equal(parseInsights(badDay, base.request.selection, METRIC_SET), null, 'an impossible calendar day is malformed');
});

test('missing, withheld and malformed values never become zero', () => {
  const base = named('ready_prepared');
  const reply = clone(base.response);
  const [count, amount, distribution] = reply.metrics;
  delete count.value; // known without a value
  amount.status = 'suppressed';
  amount.value = 250; // a withheld value is never revealed
  distribution.buckets[0].status = 'unknown';
  distribution.buckets[0].value = 2;
  distribution.denominator = null;
  const value = parseInsights(reply, base.request.selection, METRIC_SET);
  assert.ok(value);
  const byId = Object.fromEntries(value.metrics.map((metric) => [metric.id, metric]));
  assert.deepEqual([byId['orders.count'].status, byId['orders.count'].value], ['unknown', null]);
  assert.deepEqual([byId['orders.amount'].status, byId['orders.amount'].value, byId['orders.amount'].denominator], ['suppressed', null, null]);
  assert.deepEqual([byId['orders.status'].buckets[0].status, byId['orders.status'].buckets[0].value], ['unknown', null]);
  assert.equal(byId['orders.status'].denominator, null, 'a missing declared denominator stays unknown');

  const negative = clone(base.response);
  negative.metrics[0].value = -1;
  negative.metrics[0].kind = 'count';
  assert.equal(parseInsights(negative, base.request.selection, METRIC_SET).metrics[0].status, 'unknown', 'a negative count is not a count');
  const fractional = clone(base.response);
  fractional.metrics[0].value = 2.5;
  assert.equal(parseInsights(fractional, base.request.selection, METRIC_SET).metrics[0].value, null, 'a fractional count is not a count');

  const root = fragment(renderComposition('t', value, 'chart'));
  const text = textOf(root);
  assert.ok(text.includes('Orders Unknown'), text);
  assert.ok(text.includes('Order amount Withheld'), text);
  assert.ok(!/Orders 0\b/.test(text) && !text.includes('Withheld 250'), 'no false zero and no withheld value');
  assert.ok(text.includes('Denominator unknown: bars compare categories with the largest one and no shares are stated.'), text);
});

test('coverage counts as observed only with evidence bound to the exact selection', () => {
  const base = named('ready_prepared');
  const unbound = clone(base.response);
  delete unbound.coverage[0].evidence;
  assert.deepEqual(parseInsights(unbound, base.request.selection, METRIC_SET).coverage.map((day) => [day.status, day.reason]), [['unavailable', 'unbound_evidence']]);

  const foreign = clone(base.response);
  foreign.coverage[0].evidence.selection = named('quiet_prepared').request.selection;
  assert.equal(parseInsights(foreign, base.request.selection, METRIC_SET).coverage[0].status, 'unavailable', 'evidence for another selection is not coverage');

  const example = named('ready_catalog');
  const claimed = clone(example.response);
  claimed.coverage[0] = { ...claimed.coverage[0], status: 'covered', evidence: { selection: example.request.selection, ref: 'expected', verification_id: '' } };
  assert.equal(parseInsights(claimed, example.request.selection, METRIC_SET).coverage[0].status, 'unavailable', 'a catalog example is never coverage');

  const unknownState = clone(base.response);
  unknownState.coverage[0].status = 'certified';
  assert.deepEqual(parseInsights(unknownState, base.request.selection, METRIC_SET).coverage.map((day) => [day.status, day.reason]), [['unavailable', 'unknown_status']]);
});

test('chart and table views state the same totals, categories and coverage', () => {
  for (const name of ['ready_catalog', 'ready_prepared', 'quiet_prepared', 'dst_prepared']) {
    const chart = render(name, 'chart');
    const table = render(name, 'table');
    assert.ok(chart.querySelector('[data-insights-display="chart"]') && !chart.querySelector('table'), `${name} chart view has no tables`);
    assert.ok(table.querySelector('[data-insights-table="totals"]') && !table.querySelector('.console-insights__bar-row'), `${name} table view has no bars`);
    assert.deepEqual(chartTotals(chart), tableTotals(table), `${name} totals match`);
    assert.deepEqual(chartBuckets(chart), tableBuckets(table), `${name} categories match`);
    assert.deepEqual(chartDays(chart), tableDays(table), `${name} coverage days match`);
    assert.ok(chartTotals(chart).length > 0, `${name} has totals`);
  }
});

test('Ready: observed values with units, shares of the declared denominator and verified coverage', () => {
  const root = render('ready_prepared', 'chart');
  const text = textOf(root);
  assert.ok(text.includes('Observed in prepared receipt rcpt-ready-1 (content revision 2) on preview.'), text);
  assert.ok(text.includes('Orders 3 orders scenario orders · 2026-01-01 (UTC) · Sampling: complete count of the immutable stage'), text);
  assert.ok(text.includes('Order amount 250 USD cents'), text);
  assert.deepEqual(chartBuckets(root), [['orders.status', [['Paid', '2 (66.7%)'], ['Refunded', '1 (33.3%)']]]]);
  assert.ok(text.includes('Shares of 3 orders (declared denominator).'), text);
  const widths = Array.from(root.querySelectorAll('.console-insights__bar-fill')).map((bar) => bar.getAttribute('style'));
  assert.deepEqual(widths, ['width:66.7%', 'width:33.3%']);
  const day = root.querySelector('.console-insights__day');
  assert.equal(day.dataset.status, 'covered');
  assert.ok(day.getAttribute('title').includes('Verification ver-ready · ref day-2026-01-01'), day.getAttribute('title'));
  assert.ok(textOf(day).includes('Thursday 1 January 2026: Covered'), textOf(day));
  assert.ok(text.includes('Local days in UTC.'), text);

  const active = textOf(render('ready_active', 'chart'));
  assert.ok(active.includes('Observed in the active data on preview at generation 3 (receipt rcpt-ready-1).'), active);
});

test('catalog examples read as declarations, and their expected day is not coverage', () => {
  const root = render('ready_catalog', 'table');
  const provenance = root.querySelector('.console-insights__provenance');
  assert.equal(provenance.dataset.provenance, 'example');
  assert.ok(textOf(provenance).includes('They are not observed and not verified.'), textOf(provenance));
  const row = root.querySelector('[data-insights-table="coverage"] tbody tr');
  assert.equal(row.dataset.status, 'uncovered');
  assert.ok(textOf(row).includes('Not covered') && textOf(row).includes('Expected by the catalog example; not verified.'), textOf(row));
  assert.ok(textOf(root).includes('A catalog example is never coverage'), 'the coverage note explains examples');
  assert.ok(!textOf(root).includes('Observed in'), 'an example never claims observation');
  assert.equal(textOf(root.querySelector('[data-insights-table="totals"] caption')), 'Totals (example values declared by the provider, not observed)');
  assert.ok(textOf(root.querySelector('[data-insights-table="distribution"] caption')).startsWith('Orders by status (example values)'));

  // Every example tile and figure carries its own Example tag; observed ones none.
  const chart = render('ready_catalog', 'chart');
  const tagged = Array.from(chart.querySelectorAll('.console-insights__stat, .console-insights__distribution'))
    .map((element) => [element.dataset.metricId, Boolean(element.querySelector('.console-insights__tag[data-provenance="example"]'))]);
  assert.deepEqual(tagged, [['orders.count', true], ['orders.amount', true], ['orders.status', true]]);
  assert.equal(render('ready_prepared', 'chart').querySelectorAll('.console-insights__tag').length, 0);
});

test('Quiet: known zeros, a zero denominator without shares and covered-empty evidence', () => {
  const root = render('quiet_prepared', 'chart');
  const text = textOf(root);
  assert.ok(text.includes('This selection contains no records.'), text);
  assert.ok(text.includes('Orders 0 orders'), 'a known zero is a real zero');
  assert.ok(text.includes('No categories reported.'), text);
  const day = root.querySelector('.console-insights__day');
  assert.equal(day.dataset.status, 'covered_empty');
  assert.ok(textOf(day).includes('Covered — no records'), textOf(day));
  assert.ok(day.getAttribute('title').includes('Verification ver-empty'), day.getAttribute('title'));
});

test('dst-week: month boundary, gap day, every state with its own glyph and a partial read', () => {
  const root = render('dst_prepared', 'chart');
  const text = textOf(root);
  assert.ok(text.includes('Partial: some values could not be read, so totals may be incomplete.'), text);
  assert.ok(text.includes('Customers Unavailable'), text);
  assert.ok(text.includes('Order amount 5,400.5 USD cents'), text);
  assert.ok(text.includes('Denominator 40 orders'), 'a declared denominator of a count is stated');
  assert.deepEqual(chartBuckets(root), [['orders.status', [['Paid', '9 (75%)'], ['Refunded', '2 (16.7%)'], ['Pending', 'Unknown']]]]);

  const months = Array.from(root.querySelectorAll('.console-insights__month-title')).map(textOf);
  assert.deepEqual(months, ['March 2026', 'April 2026']);
  assert.deepEqual(chartDays(root), [
    ['2026-03-26', 'covered'], ['2026-03-27', 'covered'], ['2026-03-28', 'partial'], ['2026-03-29', 'not_reported'],
    ['2026-03-30', 'uncovered'], ['2026-03-31', 'unavailable'], ['2026-04-01', 'covered'],
  ]);
  const first = root.querySelectorAll('.console-insights__days');
  assert.ok(first[0].firstElementChild.classList.contains('console-insights__day--col-4'), '26 March 2026 is a Thursday');
  assert.ok(first[1].firstElementChild.classList.contains('console-insights__day--col-3'), '1 April 2026 is a Wednesday');
  const glyphs = new Map(Array.from(root.querySelectorAll('.console-insights__day')).map((day) => [day.dataset.status, textOf(day.querySelector('.console-insights__day-glyph'))]));
  assert.equal(new Set(glyphs.values()).size, glyphs.size, 'each coverage state has its own glyph');
  const legend = Array.from(root.querySelectorAll('.console-insights__legend li')).map(textOf);
  assert.deepEqual(legend, [
    '✓ Covered 3 days', '◐ Partially covered 1 day', '– Not covered 1 day', '? Unavailable 1 day', '· Not reported 1 day',
  ]);
  assert.ok(text.includes('Local days in Europe/London.'), text);
  const table = render('dst_prepared', 'table');
  const uncovered = table.querySelector('[data-insights-table="coverage"] tr[data-local-day="2026-03-30"]');
  assert.ok(textOf(uncovered).includes('No evidence.'), textOf(uncovered));
});

test('withheld and unsupported insights show a reason and no numbers', () => {
  for (const [name, state, message] of [
    ['ready_suppressed', 'suppressed', 'Insights for this selection are hidden by policy.'],
    ['ready_unsupported', 'unsupported', 'does not offer composition or coverage insights'],
  ]) {
    const reply = clone(fixture.variants[name]);
    const value = parseInsights(reply, reply.selection, METRIC_SET);
    assert.ok(value, `${name} parses`);
    const root = fragment(renderInsights({ scope: 't', selection: value.selection, entry: { status: 'ready', value }, display: 'chart' }));
    assert.equal(root.querySelector('[data-insights-state]')?.dataset.insightsState, state);
    assert.ok(textOf(root).includes(message), textOf(root));
    assert.equal(root.querySelectorAll('.console-insights__stat, .console-insights__day, table').length, 0, `${name} shows no values`);
  }
  // Content sent with a withheld state is never shown.
  const leaked = clone(fixture.variants.ready_suppressed);
  leaked.metrics = named('ready_catalog').response.metrics;
  assert.deepEqual(parseInsights(leaked, leaked.selection, METRIC_SET).metrics, []);
});

test('loading and failure states replace the content with safe actions', () => {
  const selection = named('ready_prepared').request.selection;
  const loading = fragment(renderInsights({ scope: 't', selection, entry: { status: 'loading' }, display: 'chart' }));
  assert.equal(loading.querySelector('[role="status"]').getAttribute('aria-busy'), 'true');
  const expectations = {
    timeout: ['insights:retry', 'Try again'],
    stale: ['refresh', 'Refresh'],
    denied: [null, null],
    bogus: ['insights:retry', 'Try again'],
  };
  for (const [kind, [focus, label]] of Object.entries(expectations)) {
    const root = fragment(renderInsights({ scope: 't', selection, entry: { status: 'failed', failure: { kind, status: 0 } }, display: 'table' }));
    const alert = root.querySelector('[role="alert"]');
    assert.ok(alert, `${kind} is announced`);
    const button = alert.querySelector('button');
    assert.equal(button?.dataset.explorerFocus ?? null, focus, `${kind} action`);
    if (label) assert.equal(textOf(button), label);
    assert.equal(root.querySelectorAll('table, .console-insights__stat').length, 0);
  }
});

test('the Show as choice is a labelled radio group reflecting the current view', () => {
  const chart = render('ready_prepared', 'chart');
  const radios = Array.from(chart.querySelectorAll('input[data-insights-control="display"]'));
  assert.deepEqual(radios.map((radio) => [radio.value, radio.checked]), [['chart', true], ['table', false]]);
  assert.equal(textOf(chart.querySelector('.console-insights__display legend')), 'Show as');
  assert.ok(radios.every((radio) => radio.closest('label')?.getAttribute('for') === radio.id), 'each choice is labelled');
  const table = render('ready_prepared', 'table');
  assert.equal(table.querySelector('input[value="table"]').checked, true);
});

test('provider strings render as text, never markup', () => {
  for (const display of ['chart', 'table']) {
    const root = render('reprofiled_catalog', display);
    assert.equal(root.querySelectorAll('img, script').length, 0, `${display} renders no provider markup`);
    assert.ok(textOf(root).includes('<img src=x onerror="window.__insightsXSS=1">'), 'markup is shown as text');
  }
  const widths = Array.from(render('reprofiled_catalog', 'chart').querySelectorAll('[style]')).map((element) => element.getAttribute('style'));
  assert.ok(widths.every((style) => /^width:(100|\d{1,2}(\.\d)?)%$/.test(style)), `only clamped widths reach inline styles: ${widths}`);
});

test('coverage renders a note and nothing else when no day is reported', () => {
  const value = parsed('ready_prepared');
  value.coverage = [];
  const root = fragment(renderCoverage('t', value, 'chart'));
  assert.equal(root.querySelector('[data-insights-coverage]').dataset.insightsCoverage, 'none');
  assert.equal(root.querySelectorAll('.console-insights__day').length, 0);
});
