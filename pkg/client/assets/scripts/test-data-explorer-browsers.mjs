#!/usr/bin/env node
// Real-browser evidence for the Data explorer (the Data console's Explore
// panel). Serves the packaged Data page rendered from Go
// (tests/fixtures/data-console-page.html) with the Go-generated Data golden and
// explorer fixtures (tests/fixtures/data-explorer-contract.json) behind the
// Data module's explore routes, then checks in Chromium and WebKit:
// - 1440px keyboard-only journey: tabs → card → details → section tabs →
//   record preview → pagination → related drawer and back, focus never lost;
// - 390px layout: single-column cards, stacked contexts, row cards and no
//   horizontal overflow;
// - Ready versus Quiet, and rapid context changes landing only the last choice;
// - explore denial and console revocation removing every explorer read;
// - no Debug asset on the Data page and no console runtime error.

import { createServer } from 'node:http';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { chromium, webkit } from 'playwright';

const root = resolve(import.meta.dirname, '..');
const fixtures = resolve(root, 'tests/fixtures');
const golden = JSON.parse(readFileSync(resolve(fixtures, 'data-console-contract.json'), 'utf8'));
const explorer = JSON.parse(readFileSync(resolve(fixtures, 'data-explorer-contract.json'), 'utf8'));
const dataPage = readFileSync(resolve(fixtures, 'data-console-page.html'), 'utf8');
const evidenceDir = process.env.EXPLORER_BROWSER_EVIDENCE_DIR || join(tmpdir(), 'go-admin-data-explorer-browsers');
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

// The page runs without a live stream so HTTP snapshots drive every change.
const bootstrap = {
  ...golden.bootstrap,
  urls: Object.fromEntries(Object.entries(golden.bootstrap.urls).filter(([key]) => key !== 'live')),
  extensions: { data_explorer: ROUTES },
};
const page = dataPage.replace(/(data-console-bootstrap>)[\s\S]*?(<\/script>)/, (_match, open, close) => `${open}${JSON.stringify(bootstrap).replace(/</g, '\\u003c')}${close}`);

const selectionKey = (selection) => JSON.stringify([
  selection.context, selection.target_id, selection.dataset.provider, selection.dataset.id, selection.dataset.version, selection.dataset.digest,
  selection.scenario.id, selection.scenario.version, selection.scenario.profile_hash, selection.receipt_id || '', selection.content_revision ?? 0, selection.generation ?? -1,
]);
const sampleKey = (read) => JSON.stringify([selectionKey(read.selection), read.entity_id, read.cursor || '', read.record_key || '', read.relationship_id || '']);
const metadata = new Map(explorer.metadata.map((item) => [selectionKey(item.selection), item]));
const samples = new Map(explorer.samples.map((item) => [sampleKey(item.request), item.response]));
const ready = explorer.metadata.find((item) => item.selection.scenario.id === 'ready');

const state = { revoked: false, metadataStatus: 0, delays: {}, reads: [] };

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

/** Observed replies for prepared/active selections reuse the Ready fixtures under the requested identity. */
function observed(body, selection) {
  return { ...body, selection, provenance: 'observed' };
}

function exploreReply(kind, url) {
  const selection = JSON.parse(url.searchParams.get('selection') || '{}');
  const read = {
    selection,
    entity_id: url.searchParams.get('entity_id') || '',
    cursor: url.searchParams.get('cursor') || '',
    record_key: url.searchParams.get('record_key') || '',
    relationship_id: url.searchParams.get('relationship_id') || '',
  };
  state.reads.push({ kind, context: selection.context, scenario: selection.scenario?.id, entity: read.entity_id, cursor: read.cursor });
  if (kind === 'metadata' && state.metadataStatus) return [state.metadataStatus, { error: { message: 'denied' } }];
  const catalog = selection.context === 'catalog_example';
  if (kind === 'metadata') {
    const found = catalog ? metadata.get(selectionKey(selection)) : observed(ready, selection);
    return found ? [200, found] : [404, { error: { message: 'gone' } }];
  }
  const fixtureRead = catalog ? read : { ...read, selection: ready.selection };
  const found = samples.get(sampleKey(fixtureRead));
  if (!found) return [404, { error: { message: 'gone' } }];
  return [200, catalog ? found : observed(found, selection)];
}

const server = createServer((request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1');
  const { pathname } = url;
  if (pathname === '/admin/data') return send(response, 200, page, types.get('.html'));
  if (pathname === '/admin/data/api/snapshot') {
    if (state.revoked) return send(response, 403, { error: { code: 'FORBIDDEN', message: 'console access changed' } });
    return send(response, 200, golden.bootstrap.snapshot);
  }
  const explore = pathname.match(/^\/admin\/data\/api\/explore\/(metadata|samples|related)$/);
  if (explore) {
    const [status, body] = exploreReply(explore[1], url);
    const context = JSON.parse(url.searchParams.get('selection') || '{}').context;
    setTimeout(() => send(response, status, body), state.delays[context] || 0);
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

async function eventually(probe, message, timeoutMs = 5000) {
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
  const runtimeErrors = harness.pageErrors.filter((error) => /\/dist\/(console|chunks)\//.test(error) || /explorer/i.test(error));
  check(runtimeErrors.length === 0, `${label}: explorer threw: ${runtimeErrors.join('\n')}`);
}

const active = (target) => target.evaluate(() => {
  const element = document.activeElement;
  return element ? { focus: element.getAttribute('data-explorer-focus') || '', action: element.getAttribute('data-explorer-action') || '', section: element.getAttribute('data-explorer-section') || '', tab: element.getAttribute('data-console-tab') || '', record: element.getAttribute('data-record-key') || '', tag: element.tagName } : null;
});
const text = async (target, selector) => ((await target.innerText(selector)) || '').replace(/\s+/g, ' ').trim();
const overflow = (target) => target.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/**
 * Move focus to a control the way a keyboard user would. Chromium walks the
 * real Tab order; WebKit's default Tab order skips buttons (a browser
 * setting), so there the control is focused directly and the remaining
 * Enter/Arrow/Escape steps stay real key presses.
 */
async function tabUntil(target, label, predicate, selector, message, limit = 16) {
  if (label === 'webkit') {
    await target.focus(selector);
  } else {
    const key = label === 'shift' ? 'Shift+Tab' : 'Tab';
    for (let i = 0; i < limit && !predicate(await active(target)); i += 1) await target.keyboard.press(key);
  }
  check(predicate(await active(target)), `keyboard never reached ${message}: ${JSON.stringify(await active(target))}`);
}

async function openPage(context, origin, label) {
  const target = await context.newPage();
  const harness = attachHarness(target);
  await target.goto(`${origin}/admin/data`);
  await eventually(async () => (await target.evaluate(() => document.querySelector('[data-console-id="data"]')?.dataset.consoleState)) === 'ready', `${label}: Data console ready`);
  return { target, harness };
}

async function verifyKeyboard(label, browser, origin) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  try {
    context.setDefaultTimeout(8000);
    const { target, harness } = await openPage(context, origin, label);
    state.reads = [];
    await target.focus('[data-console-tab="overview"]');
    await target.keyboard.press('End');
    await eventually(async () => (await active(target))?.tab === 'explore', `${label}: End reaches the Explore tab`);
    await eventually(async () => (await text(target, '[data-data-explorer]')).includes('Customer corpus A'), `${label}: card descriptions load`);
    check(state.reads.every((read) => read.kind === 'metadata' && read.context === 'catalog_example'), `${label}: cards read only catalog descriptions`);
    check(await overflow(target) <= 1, `${label}: no horizontal overflow at 1440px`);
    await target.screenshot({ path: join(evidenceDir, `${label}-1440-catalog.png`) });

    await tabUntil(target, label, (focus) => focus?.action === 'open', '.console-explorer__card [data-explorer-action="open"]', 'View details');
    await target.keyboard.press('Enter');
    await eventually(async () => (await active(target))?.focus === 'title', `${label}: details focus the dataset heading`);
    await eventually(async () => (await text(target, '.console-explorer__section')).includes('2026-01-01 (UTC)'), `${label}: details load`);
    await tabUntil(target, label, (focus) => Boolean(focus?.section), '[data-explorer-section][aria-selected="true"]', 'section tabs');
    await target.keyboard.press('ArrowRight');
    await eventually(async () => (await active(target))?.section === 'contents', `${label}: ArrowRight moves to Contents`);
    await tabUntil(target, label, (focus) => focus?.action === 'samples', '[data-explorer-action="samples"][data-entity-id="orders"]', 'Preview records');
    await target.keyboard.press('Enter');
    await eventually(async () => (await text(target, '[data-explorer-preview="orders"]')).includes('Records 1–2 of 3'), `${label}: first record page`);
    check((await active(target))?.action === 'samples-hide', `${label}: focus moves into the preview`);
    await target.screenshot({ path: join(evidenceDir, `${label}-1440-preview.png`) });

    await tabUntil(target, label, (focus) => focus?.action === 'page-next', '[data-explorer-preview="orders"] [data-explorer-action="page-next"]', 'Next');
    await target.keyboard.press('Enter');
    await eventually(async () => (await text(target, '[data-explorer-preview="orders"]')).includes('Records 3–3 of 3'), `${label}: second record page`);
    check((await active(target))?.action === 'page-next', `${label}: focus stays on Next through the page load`);
    await tabUntil(target, label === 'webkit' ? label : 'shift', (focus) => focus?.action === 'page-previous', '[data-explorer-preview="orders"] [data-explorer-action="page-previous"]', 'Previous');
    await target.keyboard.press('Enter');
    await eventually(async () => (await text(target, '[data-explorer-preview="orders"]')).includes('Records 1–2 of 3'), `${label}: back to the first page`);

    await tabUntil(target, label === 'webkit' ? label : 'shift', (focus) => focus?.action === 'related' && focus.record === 'order-1', '[data-explorer-action="related"][data-record-key="order-1"]', 'Customer of order-1', 24);
    await target.keyboard.press('Enter');
    await eventually(async () => (await target.$('[data-console-drawer] tbody tr')) !== null, `${label}: related drawer`);
    check((await text(target, '[data-console-drawer]')).includes('Declared People records related to Orders record order-1'), `${label}: related context`);
    await target.waitForTimeout(250);
    await target.screenshot({ path: join(evidenceDir, `${label}-1440-related.png`) });
    await target.keyboard.press('Escape');
    await eventually(async () => (await target.$('[data-console-drawer]')) === null, `${label}: Escape closes the drawer`);
    const back = await active(target);
    check(back?.action === 'related' && back.record === 'order-1', `${label}: focus returns to the row control (${JSON.stringify(back)})`);

    await target.focus('[data-explorer-section="contents"]');
    await target.keyboard.press('ArrowRight');
    await eventually(async () => (await text(target, '.console-explorer__section')).includes('Daily sales report'), `${label}: Used by`);
    check((await target.$$('[data-explorer-usage-link]')).length === 1, `${label}: one same-origin usage link`);
    await target.screenshot({ path: join(evidenceDir, `${label}-1440-usage.png`) });
    assertHealthy(`${label} keyboard`, harness);
  } finally {
    await context.close();
  }
}

async function verifyMobile(label, browser, origin, isMobile) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile });
  try {
    context.setDefaultTimeout(8000);
    const { target, harness } = await openPage(context, origin, `${label} mobile`);
    await target.click('[data-console-tab="explore"]');
    await eventually(async () => (await text(target, '[data-data-explorer]')).includes('Customer corpus A'), `${label}: mobile cards`);
    const cards = await target.evaluate(() => new Set(Array.from(document.querySelectorAll('.console-explorer__card')).map((card) => Math.round(card.getBoundingClientRect().left))).size);
    check(cards === 1, `${label}: cards stack in one column at 390px`);
    check(await overflow(target) <= 1, `${label}: no horizontal overflow on the catalog`);
    await target.screenshot({ path: join(evidenceDir, `${label}-390-catalog.png`), fullPage: true });
    await target.click('.console-explorer__card [data-explorer-action="open"]');
    await eventually(async () => (await text(target, '.console-explorer__section')).includes('2026-01-01 (UTC)'), `${label}: mobile details`);
    const contexts = await target.evaluate(() => getComputedStyle(document.querySelector('.console-explorer__choices')).flexDirection);
    check(contexts === 'column', `${label}: context choices stack (${contexts})`);
    await target.click('[data-explorer-section="contents"]');
    await target.click('[data-explorer-action="samples"][data-entity-id="orders"]');
    await eventually(async () => (await text(target, '[data-explorer-preview="orders"]')).includes('Records 1–2 of 3'), `${label}: mobile preview`);
    const cell = await target.evaluate(() => getComputedStyle(document.querySelector('[data-explorer-preview="orders"] td[data-label]')).display);
    check(cell === 'grid', `${label}: sample rows become cards (${cell})`);
    check(await overflow(target) <= 1, `${label}: no horizontal overflow in details`);
    await target.screenshot({ path: join(evidenceDir, `${label}-390-preview.png`), fullPage: true });
    assertHealthy(`${label} mobile`, harness);
  } finally {
    await context.close();
  }
}

async function verifyContextsAndQuiet(label, browser, origin) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  try {
    context.setDefaultTimeout(8000);
    const { target, harness } = await openPage(context, origin, label);
    await target.click('[data-console-tab="explore"]');
    await eventually(async () => (await text(target, '[data-data-explorer]')).includes('Customer corpus A'), `${label}: cards`);
    await target.click('.console-explorer__card [data-explorer-action="open"]');
    await eventually(async () => (await text(target, '.console-explorer__section')).includes('2026-01-01 (UTC)'), `${label}: details`);

    // Rapid choices: slow prepared and active answers must never land over the last choice.
    state.delays = { prepared: 900, active: 500 };
    state.reads = [];
    await target.check('input[data-explorer-control="context"][value="prepared"]');
    await target.check('input[data-explorer-control="context"][value="active"]');
    await target.check('input[data-explorer-control="context"][value="catalog_example"]');
    await target.waitForTimeout(1300);
    const note = await target.getAttribute('.console-explorer__note', 'data-context');
    check(note === 'catalog_example', `${label}: the last choice is shown (${note})`);
    check((await text(target, '[data-explorer-section-panel]')).includes('Declared period 2026-01-01 (UTC)'), `${label}: the last choice's description is shown`);
    check(state.reads.some((read) => read.context === 'prepared') && state.reads.some((read) => read.context === 'active'), `${label}: superseded reads were issued`);
    await target.click('[data-explorer-section="evidence"]');
    check((await text(target, '.console-explorer__section')).includes('Data shown Catalog example'), `${label}: evidence names the shown context`);
    state.delays = {};

    // Ready against Quiet: three orders versus an empty scenario.
    const quiet = await target.$eval('select[data-explorer-control="scenario"]', (select) => Array.from(select.options).find((option) => option.textContent.startsWith('Quiet'))?.value || '');
    await target.selectOption('select[data-explorer-control="scenario"]', quiet);
    await target.click('[data-explorer-section="contents"]');
    await eventually(async () => (await text(target, '.console-explorer__section')).includes('Orders Selected scenario 0'), `${label}: Quiet counts`);
    await target.click('[data-explorer-action="samples"][data-entity-id="orders"]');
    await eventually(async () => (await text(target, '[data-explorer-preview="orders"]')).includes('No Orders records in this selection.'), `${label}: Quiet preview is empty`);
    check((await text(target, '.console-explorer__section')).includes('Orders Catalog inventory 3'), `${label}: catalog inventory stays three`);
    await target.screenshot({ path: join(evidenceDir, `${label}-1440-quiet.png`) });
    assertHealthy(`${label} contexts`, harness);
  } finally {
    await context.close();
  }
}

async function verifyRevocation(label, browser, origin) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  try {
    context.setDefaultTimeout(8000);
    const { target, harness } = await openPage(context, origin, label);
    await target.click('[data-console-tab="explore"]');
    await eventually(async () => (await text(target, '[data-data-explorer]')).includes('Customer corpus A'), `${label}: cards`);

    // Explore denial of a selection not read yet: the console stays readable and
    // the explorer shows no content for it.
    await target.click('.console-explorer__card [data-explorer-action="open"]');
    await eventually(async () => (await text(target, '.console-explorer__section')).includes('2026-01-01 (UTC)'), `${label}: details`);
    state.metadataStatus = 403;
    await target.check('input[data-explorer-control="context"][value="prepared"]');
    await eventually(async () => (await target.getAttribute('[data-explorer-failure]', 'data-explorer-failure').catch(() => '')) === 'denied', `${label}: explore denial`);
    check((await target.$$('.console-explorer__entity, .console-explorer__usage')).length === 0, `${label}: denial shows no descriptions`);
    state.metadataStatus = 0;

    // Console revocation: Refresh answers 403 and every explorer read disappears.
    state.revoked = true;
    await target.click('[data-console-page-actions] [data-console-action="refresh"]');
    await eventually(async () => (await target.evaluate(() => document.querySelector('[data-console-id="data"]')?.dataset.consoleState)) === 'denied', `${label}: console denied`);
    check((await target.$$('[data-data-explorer], [data-console-drawer]')).length === 0, `${label}: no explorer content survives revocation`);
    check((await text(target, '[data-console-notice]')).includes('You do not have access to this console.'), `${label}: denial notice`);
    await target.screenshot({ path: join(evidenceDir, `${label}-1440-revoked.png`) });
    state.revoked = false;
    assertHealthy(`${label} revocation`, harness);
  } finally {
    await context.close();
  }
}

async function verifyBrowser(label, browserType, isMobile, origin) {
  const browser = await browserType.launch({ headless: true });
  try {
    await verifyKeyboard(label, browser, origin);
    await verifyMobile(label, browser, origin, isMobile);
    await verifyContextsAndQuiet(label, browser, origin);
    await verifyRevocation(label, browser, origin);
    const version = browser.version();
    process.stdout.write(`✔ ${label} ${version}: keyboard journey, 390px layout, rapid contexts, Ready/Quiet, denial and revocation\n`);
    return version;
  } finally {
    await browser.close();
  }
}

await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
const { port } = server.address();
const origin = `http://127.0.0.1:${port}`;
try {
  const versions = {};
  versions.chromium = await verifyBrowser('chromium', chromium, true, origin);
  versions.webkit = await verifyBrowser('webkit', webkit, false, origin);
  writeFileSync(join(evidenceDir, 'summary.json'), `${JSON.stringify({ browsers: versions, evidence: evidenceDir }, null, 2)}\n`);
  process.stdout.write(`evidence: ${evidenceDir}\n`);
} finally {
  server.close();
}
