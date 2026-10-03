#!/usr/bin/env node
// Real-browser evidence for Data insights (the explorer's Insights and Compare
// sections). Serves the packaged Data page rendered from Go
// (tests/fixtures/data-console-page.html) with the Go-generated Data golden,
// explorer fixtures and insights fixtures (tests/fixtures/data-insights-contract.json)
// behind the Data module's explore, insights and compare routes, then checks in
// Chromium and WebKit:
// - 1440px keyboard journey: Explore → details → Insights → Show as Table and
//   back → prepared context → Compare → choose Quiet → Swap, with chart and
//   table stating the same values and focus never lost;
// - 390px layout: stacked bars, a seven-column calendar, stacked sides and no
//   horizontal overflow;
// - example versus observed labelling, a withheld comparison, an unsupported
//   provider and an over-wide coverage reply rejected as unreadable;
// - races: rapid context changes land only the last choice, a new active
//   generation stops the comparison until chosen again, a 409 offers Refresh;
// - console revocation removes every insight, and no Debug asset loads.

import { createServer } from 'node:http';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { chromium, webkit } from 'playwright';

const root = resolve(import.meta.dirname, '..');
const fixtures = resolve(root, 'tests/fixtures');
const golden = JSON.parse(readFileSync(resolve(fixtures, 'data-console-contract.json'), 'utf8'));
const explorer = JSON.parse(readFileSync(resolve(fixtures, 'data-explorer-contract.json'), 'utf8'));
const insights = JSON.parse(readFileSync(resolve(fixtures, 'data-insights-contract.json'), 'utf8'));
const dataPage = readFileSync(resolve(fixtures, 'data-console-page.html'), 'utf8');
const evidenceDir = process.env.INSIGHTS_BROWSER_EVIDENCE_DIR || join(tmpdir(), 'go-admin-data-insights-browsers');
mkdirSync(evidenceDir, { recursive: true });

const types = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
]);

const ROUTES = {
  metadata: '/admin/data/api/explore/metadata',
  samples: '/admin/data/api/explore/samples',
  related: '/admin/data/api/explore/related',
};
const INSIGHT_ROUTES = { insights: '/admin/data/api/explore/insights', compare: '/admin/data/api/explore/compare' };

// The page runs without a live stream so HTTP snapshots drive every change.
const bootstrap = {
  ...golden.bootstrap,
  urls: Object.fromEntries(Object.entries(golden.bootstrap.urls).filter(([key]) => key !== 'live')),
  extensions: { data_explorer: ROUTES, data_insights: INSIGHT_ROUTES },
};
const page = dataPage.replace(/(data-console-bootstrap>)[\s\S]*?(<\/script>)/, (_match, open, close) => `${open}${JSON.stringify(bootstrap).replace(/</g, '\\u003c')}${close}`);

const clone = (value) => structuredClone(value);
const selectionKey = (selection) => JSON.stringify([
  selection.context, selection.target_id, selection.dataset.provider, selection.dataset.id, selection.dataset.version, selection.dataset.digest,
  selection.scenario.id, selection.scenario.version, selection.scenario.profile_hash, selection.receipt_id || '', selection.content_revision ?? 0, selection.generation ?? -1,
]);
const pairKey = (left, right) => `${selectionKey(left)}|${selectionKey(right)}`;
const metadata = new Map(explorer.metadata.map((item) => [selectionKey(item.selection), item]));
const readyMetadata = explorer.metadata.find((item) => item.selection.scenario.id === 'ready');
const insightsByKey = new Map(insights.insights.map((item) => [selectionKey(item.request.selection), item.response]));
const comparisonsByPair = new Map(insights.comparisons.filter((item) => item.name !== 'withheld').map((item) => [pairKey(item.request.left, item.request.right), item.response]));
const named = (name) => clone(insights.comparisons.find((item) => item.name === name).response);

/** A fixture reply re-issued for other exact selections (evidence follows its side). */
function rebind(reply, selection) {
  reply.selection = selection;
  reply.coverage.forEach((day) => {
    if (day.evidence) day.evidence.selection = selection;
  });
  return reply;
}

function observedInsights(selection) {
  return rebind(clone(insights.insights.find((item) => item.name === 'ready_prepared').response), selection);
}

function comparisonFor(name, left, right) {
  const reply = named(name);
  rebind(reply.left, left);
  rebind(reply.right, right);
  return reply;
}

/**
 * Other pinned pairs reuse the Ready/Quiet answers under the requested
 * identities, as the service would answer them: a catalog side is an example
 * and leaves every row without a difference.
 */
function synthesize(left, right) {
  const observed = (selection) => selection.context !== 'catalog_example';
  let base = left.scenario.id === 'ready' ? 'ready_vs_quiet_prepared' : 'quiet_prepared_vs_ready_active';
  if (!observed(left) || !observed(right)) base = 'ready_vs_quiet_catalog';
  else if (left.context === 'active') base = 'ready_active_vs_quiet_prepared';
  else if (right.context === 'active') base = 'quiet_prepared_vs_ready_active';
  const reply = comparisonFor(base, left, right);
  reply.left.provenance = observed(left) ? 'observed' : 'example';
  reply.right.provenance = observed(right) ? 'observed' : 'example';
  return reply;
}

const state = { revoked: false, snapshot: golden.bootstrap.snapshot, delays: {}, reads: [], compareStatus: 0, withheld: false, wideCoverage: false };

function reset() {
  Object.assign(state, { revoked: false, snapshot: golden.bootstrap.snapshot, delays: {}, reads: [], compareStatus: 0, withheld: false, wideCoverage: false });
}

function send(response, status, body, type = 'application/json; charset=utf-8') {
  response.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  response.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function exploreReply(kind, url) {
  if (kind === 'compare') {
    const left = JSON.parse(url.searchParams.get('left') || '{}');
    const right = JSON.parse(url.searchParams.get('right') || '{}');
    state.reads.push({ kind, left: left.context, right: right.context, generation: left.generation ?? right.generation ?? null, metricSet: url.searchParams.get('metric_set_id') });
    if (state.compareStatus) return [state.compareStatus, { error: { message: 'stale' } }];
    if (!url.searchParams.get('metric_set_id')) return [400, { error: { message: 'metric set required' } }];
    if (state.withheld) {
      const reply = named('withheld');
      reply.left.selection = left;
      reply.right.selection = right;
      return [200, reply];
    }
    const found = comparisonsByPair.get(pairKey(left, right));
    if (found) return [200, clone(found)];
    return [200, synthesize(left, right)];
  }
  const selection = JSON.parse(url.searchParams.get('selection') || '{}');
  state.reads.push({ kind, context: selection.context, scenario: selection.scenario?.id, metricSet: url.searchParams.get('metric_set_id') });
  if (kind === 'insights') {
    const found = insightsByKey.get(selectionKey(selection));
    const reply = found ? clone(found) : observedInsights(selection);
    if (state.wideCoverage && reply.coverage.length > 0) {
      // A reply spanning more than the 90-day window is unreadable, never truncated.
      reply.coverage = [{ ...reply.coverage[0], local_day: '2026-01-01' }, { ...reply.coverage[0], local_day: '2026-06-01' }];
    }
    return [200, reply];
  }
  if (kind === 'metadata') {
    const found = selection.context === 'catalog_example' ? metadata.get(selectionKey(selection)) : { ...readyMetadata, selection, provenance: 'observed' };
    return found ? [200, found] : [404, { error: { message: 'gone' } }];
  }
  return [404, { error: { message: 'gone' } }];
}

const server = createServer((request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1');
  const { pathname } = url;
  if (pathname === '/admin/data') return send(response, 200, page, types.get('.html'));
  if (pathname === '/admin/data/api/snapshot') {
    if (state.revoked) return send(response, 403, { error: { code: 'FORBIDDEN', message: 'console access changed' } });
    return send(response, 200, state.snapshot);
  }
  const explore = pathname.match(/^\/admin\/data\/api\/explore\/(metadata|samples|related|insights|compare)$/);
  if (explore) {
    const [status, body] = exploreReply(explore[1], url);
    const context = explore[1] === 'compare' ? 'compare' : JSON.parse(url.searchParams.get('selection') || '{}').context;
    setTimeout(() => send(response, status, body), state.delays[`${explore[1]}:${context}`] || 0);
    return undefined;
  }
  if (pathname.startsWith('/admin/assets/')) {
    const path = resolve(root, `.${pathname.slice('/admin/assets'.length)}`);
    if (path.startsWith(`${root}/`) && isFile(path)) {
      return send(response, 200, readFileSync(path), types.get(extname(path)) || 'application/octet-stream');
    }
  }
  return send(response, 404, { error: { message: 'not found' } });
});

function check(condition, message) {
  if (!condition) throw new Error(message);
}

async function eventually(probe, message, timeoutMs = 6000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await probe()) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 25));
  }
  throw new Error(`timed out: ${message}`);
}

function attachHarness(target) {
  const harness = { pageErrors: [], assetFailures: [], debugAssets: [] };
  target.on('pageerror', (error) => harness.pageErrors.push(`${error.message}\n${error.stack || ''}`));
  target.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (/^\/admin\/assets\/dist\/(debug\/|chunks\/debug-|styles\/debug\.css)/.test(path)) harness.debugAssets.push(path);
  });
  target.on('response', (response) => {
    const path = new URL(response.url()).pathname;
    if (/^\/admin\/assets\/dist\/(console\/|chunks\/|styles\/console\.css)/.test(path) && !response.ok()) harness.assetFailures.push(`${response.status()} ${path}`);
  });
  return harness;
}

function assertHealthy(label, harness) {
  check(harness.assetFailures.length === 0, `${label}: console assets failed: ${harness.assetFailures.join(', ')}`);
  check(harness.debugAssets.length === 0, `${label}: Debug assets loaded on the Data page: ${harness.debugAssets.join(', ')}`);
  const runtimeErrors = harness.pageErrors.filter((error) => /\/dist\/(console|chunks)\//.test(error) || /insight|explorer/i.test(error));
  check(runtimeErrors.length === 0, `${label}: insights threw: ${runtimeErrors.join('\n')}`);
}

const active = (target) => target.evaluate(() => {
  const element = document.activeElement;
  return element ? {
    focus: element.getAttribute('data-explorer-focus') || '',
    action: element.getAttribute('data-explorer-action') || element.getAttribute('data-insights-action') || '',
    control: element.getAttribute('data-insights-control') || '',
    section: element.getAttribute('data-explorer-section') || '',
    tab: element.getAttribute('data-console-tab') || '',
    value: element.value || '',
    tag: element.tagName,
  } : null;
});
const text = async (target, selector) => ((await target.innerText(selector).catch(() => '')) || '').replace(/\s+/g, ' ').trim();
const overflow = (target) => target.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** Same keyboard model as the explorer suite: Chromium walks Tab; WebKit's default Tab order skips controls, so focus directly. */
async function tabUntil(target, label, predicate, selector, message, limit = 24) {
  if (label === 'webkit') {
    await target.focus(selector);
  } else {
    for (let i = 0; i < limit && !predicate(await active(target)); i += 1) await target.keyboard.press('Tab');
  }
  check(predicate(await active(target)), `keyboard never reached ${message}: ${JSON.stringify(await active(target))}`);
}

/** The chart's [metric, A, B, difference] rows and the table's, normalized alike. */
async function comparisonRows(target) {
  return target.evaluate(() => {
    const squash = (value) => (value || '').replace(/\s+/g, ' ').trim();
    const chart = Array.from(document.querySelectorAll('.console-insights__pair')).map((pair) => {
      const side = (letter) => squash(pair.querySelector(`.console-insights__pair-bars [data-side="${letter}"] .console-insights__bar-value`)?.textContent).replace(/^[AB]: /, '').replace(/ Example$/, '');
      return [pair.dataset.metricId, side('a'), side('b'), squash(pair.querySelector('.console-insights__delta-value')?.textContent)];
    });
    const table = Array.from(document.querySelectorAll('[data-insights-table="compare"] tbody tr')).map((row) => {
      const cell = (selector) => squash(row.querySelector(selector)?.textContent);
      const unit = cell('td[data-label="Unit"]');
      const withUnit = (value) => (/^[-\d.,]+$/.test(value) && unit !== '—' ? `${value} ${unit}` : value);
      return [row.dataset.metricId, withUnit(cell('td[data-label^="A"]')), withUnit(cell('td[data-label^="B"]')), cell('td[data-label="Difference (B − A)"]')];
    });
    return { chart, table };
  });
}

async function insightRows(target) {
  return target.evaluate(() => {
    const squash = (value) => (value || '').replace(/\s+/g, ' ').trim();
    return {
      stats: Array.from(document.querySelectorAll('.console-insights__stat')).map((stat) => [stat.dataset.metricId, squash(stat.querySelector('.console-insights__stat-value')?.textContent)]),
      rows: Array.from(document.querySelectorAll('[data-insights-table="totals"] tbody tr')).map((row) => {
        const value = squash(row.querySelector('td[data-label="Value"]')?.textContent);
        const unit = squash(row.querySelector('td[data-label="Unit"]')?.textContent);
        return [row.dataset.metricId, row.dataset.status === 'known' && unit !== '—' ? `${value} ${unit}` : value];
      }),
      days: Array.from(document.querySelectorAll('.console-insights__day')).map((day) => [day.dataset.localDay, day.dataset.status]),
      tableDays: Array.from(document.querySelectorAll('[data-insights-table="coverage"] tbody tr')).map((row) => [row.dataset.localDay, row.dataset.status]),
    };
  });
}

/** Choose a Compare candidate once the on-demand module has rendered it. */
async function chooseCandidate(target, label, matches) {
  const selector = 'select[data-insights-control="compare"]';
  let value = '';
  await eventually(async () => {
    value = await target.$eval(selector, (select, source) => {
      const pattern = new RegExp(source);
      return select.disabled ? '' : Array.from(select.options).find((option) => pattern.test(option.textContent))?.value || '';
    }, matches.source).catch(() => '');
    return Boolean(value);
  }, `${label}: candidate ${matches}`);
  await target.selectOption(selector, value);
}

/**
 * Select a details section by pointer. A reply landing mid-click re-renders
 * the explorer and can swallow that click, so click again until selected.
 */
async function showSection(target, label, id) {
  const selector = `[data-explorer-section="${id}"]`;
  await eventually(async () => {
    if ((await target.getAttribute(selector, 'aria-selected').catch(() => '')) === 'true') return true;
    await target.click(selector).catch(() => {});
    return (await target.getAttribute(selector, 'aria-selected').catch(() => '')) === 'true';
  }, `${label}: ${id} section`);
}

/** Choose a Data shown context and wait for its description to land. */
async function chooseContext(target, label, context) {
  await target.check(`input[data-explorer-control="context"][value="${context}"]`);
  await eventually(async () => (await target.getAttribute('.console-explorer__note', 'data-context').catch(() => '')) === context
    && (await text(target, '.console-explorer__observed')).includes('Description revision'), `${label}: ${context} description`);
}

async function openPage(context, origin, label) {
  const target = await context.newPage();
  const harness = attachHarness(target);
  await target.goto(`${origin}/admin/data`);
  await eventually(async () => (await target.evaluate(() => document.querySelector('[data-console-id="data"]')?.dataset.consoleState)) === 'ready', `${label}: Data console ready`);
  return { target, harness };
}

async function openDetails(target, label) {
  await target.click('[data-console-tab="explore"]');
  await eventually(async () => (await text(target, '[data-data-explorer]')).includes('Customer corpus A'), `${label}: cards`);
  await target.click('.console-explorer__card [data-explorer-action="open"]');
  await eventually(async () => (await text(target, '.console-explorer__section')).includes('2026-01-01 (UTC)'), `${label}: details`);
}

/** Choose an option of a select by keyboard where the browser allows it, else directly. */
async function chooseByKeyboard(target, label, selector, wanted, notes) {
  await target.waitForSelector(`${selector}:not([disabled])`);
  await target.focus(selector);
  const wantedValue = await target.$eval(selector, (select, prefix) => Array.from(select.options).find((option) => option.textContent.startsWith(prefix))?.value || '', wanted);
  check(wantedValue, `${label}: option ${wanted}`);
  if (label !== 'webkit') {
    for (let i = 0; i < 12 && (await target.$eval(selector, (select) => select.value)) !== wantedValue; i += 1) await target.keyboard.press('ArrowDown');
  }
  if ((await target.$eval(selector, (select) => select.value)) !== wantedValue) {
    notes.push(`${label}: ${selector} chosen directly (the browser's closed select does not change on arrow keys)`);
    await target.selectOption(selector, wantedValue);
  }
}

async function verifyKeyboard(label, browser, origin, notes) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1400 } });
  try {
    context.setDefaultTimeout(8000);
    reset();
    const { target, harness } = await openPage(context, origin, label);
    await target.focus('[data-console-tab="overview"]');
    await target.keyboard.press('End');
    await eventually(async () => (await active(target))?.tab === 'explore', `${label}: End reaches the Explore tab`);
    await eventually(async () => (await text(target, '[data-data-explorer]')).includes('Customer corpus A'), `${label}: cards`);
    await tabUntil(target, label, (focus) => focus?.action === 'open', '.console-explorer__card [data-explorer-action="open"]', 'View details');
    await target.keyboard.press('Enter');
    await eventually(async () => (await active(target))?.focus === 'title', `${label}: details focus the heading`);
    check(!state.reads.some((read) => read.kind === 'insights'), `${label}: nothing is read before Insights is shown`);

    await tabUntil(target, label, (focus) => Boolean(focus?.section), '[data-explorer-section][aria-selected="true"]', 'section tabs');
    await target.keyboard.press('ArrowRight');
    await target.keyboard.press('ArrowRight');
    await eventually(async () => (await active(target))?.section === 'insights', `${label}: arrows reach Insights`);
    await eventually(async () => (await text(target, '.console-explorer__section')).includes('Orders Example 3 orders'), `${label}: example insights`);
    check(state.reads.find((read) => read.kind === 'insights')?.metricSet === null, `${label}: the first read lets the server name the metric set`);
    check((await target.getAttribute('.console-insights__provenance', 'data-provenance')) === 'example', `${label}: the catalog example reads as an example`);
    const chart = await insightRows(target);
    await target.screenshot({ path: join(evidenceDir, `${label}-1440-insights-chart.png`) });

    await tabUntil(target, label, (focus) => focus?.focus === 'insights:display:chart', 'input[data-insights-control="display"][value="chart"]', 'Show as');
    await target.keyboard.press('ArrowRight');
    await eventually(async () => (await target.$('[data-insights-table="totals"]')) !== null, `${label}: Table view`);
    check((await active(target))?.focus === 'insights:display:table', `${label}: focus stays on the Show as choice`);
    const table = await insightRows(target);
    check(JSON.stringify(chart.stats) === JSON.stringify(table.rows), `${label}: chart and table totals match ${JSON.stringify([chart.stats, table.rows])}`);
    check(JSON.stringify(chart.days) === JSON.stringify(table.tableDays), `${label}: chart and table coverage match`);
    await target.screenshot({ path: join(evidenceDir, `${label}-1440-insights-table.png`) });
    await target.keyboard.press('ArrowLeft');
    await eventually(async () => (await target.$('.console-insights__stat')) !== null, `${label}: back to Chart`);

    // Prepared receipt by keyboard, then Compare.
    await tabUntil(target, label, (focus) => focus?.focus === 'context:catalog_example', 'input[data-explorer-control="context"][value="catalog_example"]', 'Data shown', 32);
    await target.keyboard.press('ArrowRight');
    await eventually(async () => (await text(target, '.console-explorer__section')).includes('Observed in prepared receipt rcpt-ready-1 (content revision 2) on preview.'), `${label}: observed insights`);
    check(!(await text(target, '.console-explorer__section')).includes('Example'), `${label}: observed values carry no Example tag`);
    await target.focus('[data-explorer-section="insights"]');
    await target.keyboard.press('ArrowRight');
    await eventually(async () => (await active(target))?.section === 'compare', `${label}: arrows reach Compare`);
    await chooseByKeyboard(target, label, 'select[data-insights-control="compare"]', 'Quiet: prepared receipt rcpt-empty-1', notes);
    await eventually(async () => (await target.$$('.console-insights__pair')).length === 3, `${label}: Ready vs Quiet comparison`);
    const rows = await comparisonRows(target);
    check(JSON.stringify(rows.chart.slice(0, 2).map((row) => row[3])) === JSON.stringify(['−3', '−250']), `${label}: server deltas ${JSON.stringify(rows.chart)}`);
    check(state.reads.filter((read) => read.kind === 'compare').every((read) => read.metricSet === 'orders'), `${label}: comparisons name the learned metric set`);
    check((await active(target))?.control === 'compare', `${label}: focus stays on the choice`);
    await target.screenshot({ path: join(evidenceDir, `${label}-1440-compare-chart.png`) });

    await tabUntil(target, label, (focus) => focus?.action === 'swap', '[data-insights-action="swap"]', 'Swap A and B');
    await target.keyboard.press('Enter');
    await eventually(async () => (await comparisonRows(target)).chart[0]?.[3] === '+3', `${label}: swapped comparison`);
    check((await active(target))?.action === 'swap', `${label}: focus stays on Swap`);
    await target.check('input[data-insights-control="display"][value="table"]');
    await eventually(async () => (await target.$('[data-insights-table="compare"]')) !== null, `${label}: comparison table`);
    const swapped = await comparisonRows(target);
    check(JSON.stringify(swapped.table) === JSON.stringify((await (async () => {
      await target.check('input[data-insights-control="display"][value="chart"]');
      await eventually(async () => (await target.$$('.console-insights__pair')).length === 3, `${label}: chart again`);
      return (await comparisonRows(target)).chart;
    })())), `${label}: comparison chart and table match`);
    assertHealthy(`${label} keyboard`, harness);
  } finally {
    await context.close();
  }
}

async function verifyMobile(label, browser, origin, isMobile) {
  const context = await browser.newContext({ viewport: { width: 390, height: 1600 }, hasTouch: true, isMobile });
  try {
    context.setDefaultTimeout(8000);
    reset();
    const { target, harness } = await openPage(context, origin, `${label} mobile`);
    await openDetails(target, label);
    await chooseContext(target, label, 'prepared');
    await showSection(target, label, 'insights');
    try {
      await eventually(async () => (await text(target, '.console-explorer__section')).includes('Observed in prepared receipt'), `${label}: mobile insights`);
    } catch (error) {
      await target.screenshot({ path: join(evidenceDir, `${label}-390-insights-failure.png`), fullPage: true });
      throw new Error(`${error.message}: ${await text(target, '.console-explorer__section')} | reads ${JSON.stringify(state.reads.slice(-4))}`);
    }
    const layout = await target.evaluate(() => {
      const row = document.querySelector('.console-insights__bar-row');
      const track = row?.querySelector('.console-insights__bar-track');
      const days = document.querySelector('.console-insights__days');
      return {
        trackRow: track ? getComputedStyle(track).gridRowStart : '',
        dayColumns: days ? getComputedStyle(days).gridTemplateColumns.split(' ').length : 0,
        display: getComputedStyle(document.querySelector('.console-insights__display .console-explorer__choices')).flexDirection,
      };
    });
    check(layout.trackRow === '2', `${label}: bars sit under their labels at 390px (${layout.trackRow})`);
    check(layout.dayColumns === 7, `${label}: the calendar keeps seven columns (${layout.dayColumns})`);
    check(layout.display === 'row', `${label}: Show as stays side by side (${layout.display})`);
    check(await overflow(target) <= 1, `${label}: no horizontal overflow in Insights`);
    await target.screenshot({ path: join(evidenceDir, `${label}-390-insights.png`), fullPage: true });
    await showSection(target, label, 'compare');
    await chooseCandidate(target, label, /^Quiet: catalog example/);
    await eventually(async () => (await target.$$('.console-insights__pair')).length > 0, `${label}: mobile comparison`);
    const sides = await target.evaluate(() => new Set(Array.from(document.querySelectorAll('.console-insights__side')).map((side) => Math.round(side.getBoundingClientRect().left))).size);
    check(sides === 1, `${label}: sides stack at 390px`);
    check((await text(target, '.console-insights__provenance[data-provenance="example"]')).includes('B is a catalog example'), `${label}: the example side is named`);
    check(await overflow(target) <= 1, `${label}: no horizontal overflow in Compare (with Example tags)`);
    await target.screenshot({ path: join(evidenceDir, `${label}-390-compare.png`), fullPage: true });
    await target.check('input[data-insights-control="display"][value="table"]');
    await eventually(async () => (await target.$('[data-insights-table="compare"]')) !== null, `${label}: mobile comparison table`);
    const cell = await target.evaluate(() => getComputedStyle(document.querySelector('[data-insights-table="compare"] td[data-label]')).display);
    check(cell === 'grid', `${label}: comparison rows become cards (${cell})`);
    check(await overflow(target) <= 1, `${label}: no horizontal overflow in the comparison table`);
    await target.screenshot({ path: join(evidenceDir, `${label}-390-compare-table.png`), fullPage: true });
    assertHealthy(`${label} mobile`, harness);
  } finally {
    await context.close();
  }
}

/** The golden snapshot with the preview target at another generation. */
function snapshotAt(generation) {
  const snapshot = structuredClone(golden.bootstrap.snapshot);
  const overview = snapshot.panels.find((panel) => panel.id === 'overview').records[0];
  const target = overview.data.targets[0];
  target.generation = generation;
  target.explore_active = { ...target.explore_active, generation };
  overview.revision += 1;
  snapshot.watermark += 1;
  return snapshot;
}

async function verifyRaces(label, browser, origin) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1400 } });
  try {
    context.setDefaultTimeout(8000);
    reset();
    const { target, harness } = await openPage(context, origin, label);
    await openDetails(target, label);
    await showSection(target, label, 'insights');
    await eventually(async () => (await text(target, '.console-explorer__section')).includes('Orders Example 3 orders'), `${label}: insights`);

    // Rapid choices: slow prepared and active answers never land over the last choice.
    state.delays = { 'insights:prepared': 900, 'insights:active': 500 };
    await target.check('input[data-explorer-control="context"][value="prepared"]');
    await target.check('input[data-explorer-control="context"][value="active"]');
    await target.check('input[data-explorer-control="context"][value="catalog_example"]');
    await target.waitForTimeout(1300);
    check((await target.getAttribute('.console-insights__provenance', 'data-provenance')) === 'example', `${label}: the last choice's insights are shown`);
    state.delays = {};

    // Quiet prepared against the active data, pinned at generation 3.
    const quiet = await target.$eval('select[data-explorer-control="scenario"]', (select) => Array.from(select.options).find((option) => option.textContent.startsWith('Quiet'))?.value || '');
    await target.selectOption('select[data-explorer-control="scenario"]', quiet);
    await chooseContext(target, label, 'prepared');
    await showSection(target, label, 'compare');
    await chooseCandidate(target, label, /^Active data/);
    await eventually(async () => (await comparisonRows(target)).chart[0]?.[3] === '−3', `${label}: active comparison`);
    check((await text(target, '.console-insights__side[data-side="a"]')).includes('generation 3'), `${label}: the active baseline is pinned at generation 3`);

    // Another operator activates: generation 4 stops the comparison until chosen again.
    state.snapshot = snapshotAt(4);
    const before = state.reads.filter((read) => read.kind === 'compare').length;
    await target.click('[data-console-page-actions] [data-console-action="refresh"]');
    await eventually(async () => (await text(target, '[data-insights-state="stale"]')).includes('at generation 4'), `${label}: stale comparison`);
    check((await target.$$('.console-insights__pair')).length === 0, `${label}: no values of the old generation`);
    await target.waitForTimeout(300);
    check(state.reads.filter((read) => read.kind === 'compare').length === before, `${label}: nothing is repinned silently`);
    await target.screenshot({ path: join(evidenceDir, `${label}-1440-active-stale.png`) });
    await target.click('[data-insights-action="compare-current"]');
    await eventually(async () => state.reads.filter((read) => read.kind === 'compare').at(-1)?.generation === 4, `${label}: generation 4 pinned on request`);
    await eventually(async () => (await target.$$('.console-insights__pair')).length > 0, `${label}: current comparison`);

    // The generation changes during the read: the server answers 409.
    state.compareStatus = 409;
    await target.click('[data-insights-action="swap"]');
    await eventually(async () => (await target.getAttribute('[data-insights-failure]', 'data-insights-failure').catch(() => '')) === 'stale', `${label}: stale answer`);
    check((await target.$('[data-insights-failure="stale"] [data-explorer-action="refresh"]')) !== null, `${label}: stale offers Refresh`);
    state.compareStatus = 0;
    assertHealthy(`${label} races`, harness);
  } finally {
    await context.close();
  }
}

async function verifyStates(label, browser, origin) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1400 } });
  try {
    context.setDefaultTimeout(8000);
    reset();
    const { target, harness } = await openPage(context, origin, label);
    await openDetails(target, label);
    await chooseContext(target, label, 'prepared');
    await showSection(target, label, 'compare');

    // A withheld comparison shows neither side's values.
    state.withheld = true;
    await chooseCandidate(target, label, /^Quiet: prepared/);
    await eventually(async () => (await target.$('[data-insights-state="suppressed"]')) !== null, `${label}: withheld comparison`);
    check((await target.$$('.console-insights__pair, .console-insights__day, .console-insights__declared')).length === 0, `${label}: withheld values stay hidden`);
    await target.screenshot({ path: join(evidenceDir, `${label}-1440-withheld.png`) });
    state.withheld = false;

    // An unsupported provider explains itself and blocks comparison.
    const dst = await target.$eval('select[data-explorer-control="scenario"]', (select) => Array.from(select.options).find((option) => option.textContent.startsWith('dst-week'))?.value || '');
    await target.selectOption('select[data-explorer-control="scenario"]', dst);
    await target.check('input[data-explorer-control="context"][value="catalog_example"]');
    await eventually(async () => (await target.$('[data-insights-state="blocked"]')) !== null, `${label}: blocked comparison`);
    check(await target.$eval('select[data-insights-control="compare"]', (select) => select.disabled), `${label}: the choice is disabled`);

    // A coverage reply wider than the bounded window is unreadable, never truncated.
    state.wideCoverage = true;
    // The suppressed dst-week description leaves lifecycle labels ("ready v1") in the picker.
    const ready = await target.$eval('select[data-explorer-control="scenario"]', (select) => Array.from(select.options).find((option) => /^ready/i.test(option.textContent))?.value || '');
    await target.selectOption('select[data-explorer-control="scenario"]', ready);
    await showSection(target, label, 'insights');
    await eventually(async () => (await target.getAttribute('[data-insights-failure]', 'data-insights-failure').catch(() => '')) === 'malformed', `${label}: over-wide coverage rejected`);
    check((await target.$$('.console-insights__day, .console-insights__stat')).length === 0, `${label}: nothing from the unreadable reply is shown`);
    state.wideCoverage = false;
    assertHealthy(`${label} states`, harness);
  } finally {
    await context.close();
  }
}

async function verifyRevocation(label, browser, origin) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1400 } });
  try {
    context.setDefaultTimeout(8000);
    reset();
    const { target, harness } = await openPage(context, origin, label);
    await openDetails(target, label);
    await showSection(target, label, 'insights');
    await eventually(async () => (await text(target, '.console-explorer__section')).includes('Orders Example 3 orders'), `${label}: insights`);
    state.revoked = true;
    await target.click('[data-console-page-actions] [data-console-action="refresh"]');
    await eventually(async () => (await target.evaluate(() => document.querySelector('[data-console-id="data"]')?.dataset.consoleState)) === 'denied', `${label}: console denied`);
    check((await target.$$('.console-insights, [data-data-explorer]')).length === 0, `${label}: no insight survives revocation`);
    state.revoked = false;
    assertHealthy(`${label} revocation`, harness);
  } finally {
    await context.close();
  }
}

async function verifyBrowser(label, browserType, isMobile, origin, notes) {
  const browser = await browserType.launch({ headless: true });
  try {
    await verifyKeyboard(label, browser, origin, notes);
    await verifyMobile(label, browser, origin, isMobile);
    await verifyRaces(label, browser, origin);
    await verifyStates(label, browser, origin);
    await verifyRevocation(label, browser, origin);
    const version = browser.version();
    process.stdout.write(`✔ ${label} ${version}: keyboard journey, 390px layout, races, withheld/unsupported/unreadable states and revocation\n`);
    return version;
  } finally {
    await browser.close();
  }
}

await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
const { port } = server.address();
const origin = `http://127.0.0.1:${port}`;
try {
  const notes = [];
  const versions = {};
  versions.chromium = await verifyBrowser('chromium', chromium, true, origin, notes);
  versions.webkit = await verifyBrowser('webkit', webkit, false, origin, notes);
  writeFileSync(join(evidenceDir, 'summary.json'), `${JSON.stringify({ browsers: versions, notes, evidence: evidenceDir }, null, 2)}\n`);
  notes.forEach((note) => process.stdout.write(`note: ${note}\n`));
  process.stdout.write(`evidence: ${evidenceDir}\n`);
} finally {
  server.close();
}
