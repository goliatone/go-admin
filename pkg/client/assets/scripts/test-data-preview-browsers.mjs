#!/usr/bin/env node
// Real-browser evidence for application preview (the Data explorer's App
// preview section and the preview session page). Serves the packaged Data page
// rendered from Go (tests/fixtures/data-console-page.html) with the Go-generated
// Data, explorer and preview fixtures behind the Data module's routes, and the
// preview page rendered by admin.RenderDataPreviewPage
// (tests/fixtures/data-preview-page.html) at its launch URL, then checks in
// Chromium and WebKit:
// - 1440px keyboard-only journey: Explore → View details → Prepared receipt →
//   App preview → Start preview → Open preview link → skip link → Close →
//   back on the exact Data details showing the preview closed;
// - 390px layout: launch controls and the preview chrome stack, no horizontal
//   overflow;
// - an ended session removes the previewed view and leaves only Return;
// - no Debug asset and no console runtime error on either page.

import { createServer } from 'node:http';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { chromium, webkit } from 'playwright';

const root = resolve(import.meta.dirname, '..');
const fixtures = resolve(root, 'tests/fixtures');
const golden = JSON.parse(readFileSync(resolve(fixtures, 'data-console-contract.json'), 'utf8'));
const explorer = JSON.parse(readFileSync(resolve(fixtures, 'data-explorer-contract.json'), 'utf8'));
const preview = JSON.parse(readFileSync(resolve(fixtures, 'data-preview-contract.json'), 'utf8'));
const dataPage = readFileSync(resolve(fixtures, 'data-console-page.html'), 'utf8');
const previewPage = readFileSync(resolve(fixtures, 'data-preview-page.html'), 'utf8');
const evidenceDir = process.env.PREVIEW_BROWSER_EVIDENCE_DIR || join(tmpdir(), 'go-admin-data-preview-browsers');
mkdirSync(evidenceDir, { recursive: true });

const types = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
]);

const EXPLORE = {
  metadata: '/admin/data/api/explore/metadata',
  samples: '/admin/data/api/explore/samples',
  related: '/admin/data/api/explore/related',
};
const ROUTES = preview.routes;

// The page runs without a live stream so HTTP snapshots drive every change.
const bootstrap = {
  ...golden.bootstrap,
  urls: Object.fromEntries(Object.entries(golden.bootstrap.urls).filter(([key]) => key !== 'live')),
  extensions: { data_explorer: EXPLORE, data_preview: ROUTES },
};
const page = dataPage.replace(/(data-console-bootstrap>)[\s\S]*?(<\/script>)/, (_match, open, close) => `${open}${JSON.stringify(bootstrap).replace(/</g, '\\u003c')}${close}`);

const selectionKey = (selection) => JSON.stringify([
  selection.context, selection.target_id, selection.dataset.provider, selection.dataset.id, selection.dataset.version, selection.dataset.digest,
  selection.scenario.id, selection.scenario.version, selection.scenario.profile_hash, selection.receipt_id || '', selection.content_revision ?? 0, selection.generation ?? -1,
]);
const metadata = new Map(explorer.metadata.map((item) => [selectionKey(item.selection), item]));
const ready = explorer.metadata.find((item) => item.selection.scenario.id === 'ready');
const capability = (name) => structuredClone(preview.capabilities.find((item) => item.name === name).response);
const session = (name) => structuredClone(preview.sessions.find((item) => item.name === name).response);
const readyPrepared = preview.sessions.find((item) => item.name === 'ready').request.selection;
const quietPrepared = preview.sessions.find((item) => item.name === 'quiet').request.selection;
const launchPath = session('ready').launch_url;

const state = { sessions: {}, opens: [], closes: [], checks: 0 };

// Fixture sessions expire at 12:15Z; preview answers are dated 12:00Z, so the
// page follows the server's clock rather than this machine's.
const FIXTURE_NOW = new Date(Date.parse('2026-10-03T12:00:00Z')).toUTCString();

function send(response, status, body, type = 'application/json; charset=utf-8') {
  if (new URL(response.req.url || '/', 'http://127.0.0.1').pathname.startsWith('/admin/data/api/preview/')) response.setHeader('date', FIXTURE_NOW);
  response.writeHead(status, { 'content-type': type, 'cache-control': 'private, no-store' });
  response.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

async function body(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1');
  const { pathname } = url;
  if (pathname === '/admin/data') return send(response, 200, page, types.get('.html'));
  if (pathname === '/admin/data/api/snapshot') return send(response, 200, golden.bootstrap.snapshot);
  const explore = pathname.match(/^\/admin\/data\/api\/explore\/(metadata|samples|related)$/);
  if (explore) {
    const selection = JSON.parse(url.searchParams.get('selection') || '{}');
    if (explore[1] !== 'metadata') return send(response, 404, { error: { message: 'gone' } });
    const found = selection.context === 'catalog_example' ? metadata.get(selectionKey(selection)) : { ...ready, selection, provenance: 'observed' };
    return found ? send(response, 200, found) : send(response, 404, { error: { message: 'gone' } });
  }
  if (pathname === ROUTES.capabilities) {
    const selection = JSON.parse(url.searchParams.get('selection') || '{}');
    if (selectionKey(selection) === selectionKey(readyPrepared)) return send(response, 200, capability('supported'));
    if (selectionKey(selection) === selectionKey(quietPrepared)) return send(response, 200, capability('quiet_supported'));
    return send(response, 200, capability('not_supported'));
  }
  if (pathname === ROUTES.open && request.method === 'POST') {
    const input = JSON.parse(await body(request));
    state.opens.push(input);
    const reply = selectionKey(input.selection) === selectionKey(readyPrepared) ? session('ready') : session('quiet');
    state.sessions[reply.session_id] = reply;
    return send(response, 200, reply);
  }
  const close = pathname.match(/^\/admin\/data\/api\/preview\/sessions\/([^/]+)\/close$/);
  if (close && request.method === 'POST') {
    state.closes.push({ id: decodeURIComponent(close[1]), csrf: request.headers['x-csrf-token'] || '' });
    const closed = { ...(state.sessions[decodeURIComponent(close[1])] || session('ready')), state: 'closed' };
    delete closed.launch_url;
    state.sessions[closed.session_id] = closed;
    return send(response, 200, closed);
  }
  const lookup = pathname.match(/^\/admin\/data\/api\/preview\/sessions\/([^/]+)$/);
  if (lookup) {
    state.checks += 1;
    const found = state.sessions[decodeURIComponent(lookup[1])];
    return found ? send(response, 200, found) : send(response, 404, { error: { text_code: 'gone' } });
  }
  if (pathname === launchPath) {
    const current = state.sessions['preview-ready-1'];
    if (current && current.state !== 'ready') return send(response, 404, '<!doctype html><title>Preview unavailable</title><main>This preview is no longer available.</main>', types.get('.html'));
    return send(response, 200, previewPage, types.get('.html'));
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
    if (/^\/admin\/assets\//.test(path) && !response.ok()) harness.assetFailures.push(`${response.status()} ${path}`);
  });
  return harness;
}

function assertHealthy(label, harness) {
  check(harness.assetFailures.length === 0, `${label}: assets failed: ${harness.assetFailures.join(', ')}`);
  check(harness.debugAssets.length === 0, `${label}: Debug assets loaded: ${harness.debugAssets.join(', ')}`);
  check(harness.pageErrors.length === 0, `${label}: page errors: ${harness.pageErrors.join('\n')}`);
}

const active = (target) => target.evaluate(() => {
  const element = document.activeElement;
  if (!element) return null;
  return {
    focus: element.getAttribute('data-explorer-focus') || '',
    section: element.getAttribute('data-explorer-section') || '',
    tab: element.getAttribute('data-console-tab') || '',
    launch: element.hasAttribute('data-preview-launch'),
    text: (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
    id: element.id || '',
    tag: element.tagName,
  };
});
const text = async (target, selector) => ((await target.innerText(selector)) || '').replace(/\s+/g, ' ').trim();
const overflow = (target) => target.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/**
 * Move focus to a control the way a keyboard user would. Chromium walks the
 * real Tab order; WebKit's default Tab order skips buttons and links (a
 * browser setting), so there the control is focused directly and the
 * remaining Enter/Arrow/Space steps stay real key presses.
 */
async function tabUntil(target, label, predicate, selector, message, limit = 24) {
  if (label === 'webkit') {
    await target.focus(selector);
  } else {
    for (let i = 0; i < limit && !predicate(await active(target)); i += 1) await target.keyboard.press('Tab');
  }
  check(predicate(await active(target)), `keyboard never reached ${message}: ${JSON.stringify(await active(target))}`);
}

async function openData(context, label, path = '/admin/data') {
  const target = await context.newPage();
  const harness = attachHarness(target);
  await target.goto(`${context.origin}${path}`);
  await eventually(async () => (await target.evaluate(() => document.querySelector('[data-console-id="data"]')?.dataset.consoleState)) === 'ready', `${label}: Data console ready`);
  return { target, harness };
}

async function newContext(browser, origin, options) {
  const context = await browser.newContext(options);
  context.origin = origin;
  context.setDefaultTimeout(8000);
  return context;
}

async function verifyKeyboard(label, browser, origin) {
  state.sessions = {};
  state.opens = [];
  state.closes = [];
  const context = await newContext(browser, origin, { viewport: { width: 1440, height: 900 } });
  try {
    const { target, harness } = await openData(context, label);
    await target.focus('[data-console-tab="overview"]');
    await target.keyboard.press('End');
    await eventually(async () => (await active(target))?.tab === 'explore', `${label}: End reaches the Explore tab`);
    await eventually(async () => (await text(target, '[data-data-explorer]')).includes('Customer corpus A'), `${label}: cards load`);
    await tabUntil(target, label, (focus) => focus?.focus.startsWith('open:'), '.console-explorer__card [data-explorer-action="open"]', 'View details');
    await target.keyboard.press('Enter');
    await eventually(async () => (await active(target))?.focus === 'title', `${label}: details focus the dataset heading`);

    // Prepared receipt by keyboard: the context radios are one group.
    if (label === 'webkit') {
      await target.focus('input[data-explorer-control="context"][value="prepared"]');
      await target.keyboard.press('Space');
    } else {
      await tabUntil(target, label, (focus) => focus?.focus === 'context:catalog_example', '', 'the context choices');
      await target.keyboard.press('ArrowRight');
    }
    await eventually(async () => (await target.isChecked('input[data-explorer-control="context"][value="prepared"]')), `${label}: Prepared receipt chosen`);

    await tabUntil(target, label, (focus) => Boolean(focus?.section), '[data-explorer-section][aria-selected="true"]', 'section tabs');
    for (let i = 0; i < 3; i += 1) await target.keyboard.press('ArrowRight');
    await eventually(async () => (await active(target))?.section === 'app-preview', `${label}: arrows reach App preview`);
    await eventually(async () => (await target.$('[data-preview-action="open"][data-surface-id="synthetic-orders-report"]')) !== null, `${label}: surfaces load`);
    check((await text(target, '.console-preview')).includes('Prepared receipt rcpt-ready-1'), `${label}: exact receipt identity shown`);
    await tabUntil(target, label, (focus) => focus?.focus === 'preview:open:synthetic-orders-report', '[data-preview-action="open"][data-surface-id="synthetic-orders-report"]', 'Start preview');
    await target.keyboard.press('Enter');
    await eventually(async () => (await active(target))?.launch === true, `${label}: focus moves to the Open preview link`);
    check((await text(target, '.console-preview__surface')).includes('(in 15 minutes)'), `${label}: expiry follows the server clock`);
    check(state.opens.length === 1 && /^[0-9a-f-]{36}$/.test(state.opens[0].request_id), `${label}: one open with a generated request ID`);
    check(await overflow(target) <= 1, `${label}: no horizontal overflow at 1440px`);
    await target.screenshot({ path: join(evidenceDir, `${label}-1440-launch.png`) });
    assertHealthy(`${label} Data`, harness);

    // Explicit navigation to the preview page by keyboard.
    await Promise.all([target.waitForURL(`**${launchPath}`), target.keyboard.press('Enter')]);
    await target.waitForSelector('[data-preview-page] [data-preview-close]:not([hidden])');
    check((await target.title()).includes('Application preview'), `${label}: preview page title`);
    check((await text(target, '.data-preview__chrome')).includes('Read-only'), `${label}: read-only flag`);
    if (label !== 'webkit') {
      await target.keyboard.press('Tab');
      const skip = await active(target);
      check(skip?.text === 'Skip to the previewed view', `${label}: the skip link comes first (${JSON.stringify(skip)})`);
      await target.keyboard.press('Enter');
      await eventually(async () => (await active(target))?.id === 'data-preview-main', `${label}: skip lands on the view`);
    }
    await target.screenshot({ path: join(evidenceDir, `${label}-1440-preview.png`) });
    await tabUntil(target, label, (focus) => focus?.text === 'Close preview', '[data-preview-close]', 'Close preview');
    await Promise.all([target.waitForURL(/\/admin\/data\?selection=/), target.keyboard.press('Enter')]);
    check(state.closes.length === 1 && state.closes[0].id === 'preview-ready-1' && state.closes[0].csrf === 'csrf-1', `${label}: close sent with the page CSRF token`);

    // Back on the exact details: App preview shows the closed session.
    await eventually(async () => (await target.evaluate(() => document.querySelector('[data-console-id="data"]')?.dataset.consoleState)) === 'ready', `${label}: Data console ready again`);
    await eventually(async () => (await target.$('[data-preview-state="closed"]')) !== null, `${label}: the closed session is shown`);
    check(await target.evaluate(() => document.querySelector('.console-explorer__section')?.dataset.explorerSectionPanel) === 'app-preview', `${label}: lands on App preview`);
    check(await target.isChecked('input[data-explorer-control="context"][value="prepared"]'), `${label}: lands on the prepared receipt`);
    check(!new URL(target.url()).searchParams.has('selection'), `${label}: the selection parameter is dropped`);
    check((await active(target))?.focus === 'section-panel', `${label}: focus lands on the section`);
    await target.screenshot({ path: join(evidenceDir, `${label}-1440-returned.png`) });
  } finally {
    await context.close();
  }
}

async function verifyMobile(label, browser, origin, isMobile) {
  state.sessions = {};
  const context = await newContext(browser, origin, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile });
  try {
    const { target, harness } = await openData(context, `${label} mobile`);
    const sectionShown = () => target.evaluate(() => document.querySelector('.console-explorer__section')?.dataset.explorerSectionPanel);
    await target.click('[data-console-tab="explore"]');
    await target.click('.console-explorer__card [data-explorer-action="open"]');
    await eventually(async () => (await text(target, '.console-explorer__section')).includes('2026-01-01 (UTC)'), `${label}: mobile details`);
    await target.click('input[data-explorer-control="context"][value="prepared"]');
    await eventually(async () => (await target.isChecked('input[data-explorer-control="context"][value="prepared"]')) && (await text(target, '.console-explorer__summary')).length > 0, `${label}: mobile prepared receipt`);
    // Each tap waits for the explorer to settle: a re-render replaces the tapped control.
    await eventually(async () => {
      if ((await sectionShown()) !== 'app-preview') await target.click('[data-explorer-section="app-preview"]');
      return (await sectionShown()) === 'app-preview';
    }, `${label}: mobile App preview`);
    await target.click('[data-preview-action="open"][data-surface-id="synthetic-orders-report"]');
    await target.waitForSelector('[data-preview-launch]');
    check(await overflow(target) <= 1, `${label}: no horizontal overflow in App preview at 390px`);
    await target.screenshot({ path: join(evidenceDir, `${label}-390-launch.png`), fullPage: true });
    assertHealthy(`${label} mobile Data`, harness);
    await Promise.all([target.waitForURL(`**${launchPath}`), target.click('[data-preview-launch]')]);
    await target.waitForSelector('[data-preview-close]:not([hidden])');
    check(await overflow(target) <= 1, `${label}: no horizontal overflow on the preview page at 390px`);
    const stacked = await target.evaluate(() => {
      const [back, close] = ['[data-preview-return]', '[data-preview-close]'].map((selector) => document.querySelector(selector).getBoundingClientRect());
      return back.width > 100 && close.width > 100 && Math.abs(back.top - close.top) < 2;
    });
    check(stacked, `${label}: Return and Close share a full-width row`);
    await target.screenshot({ path: join(evidenceDir, `${label}-390-preview.png`), fullPage: true });
  } finally {
    await context.close();
  }
}

async function verifyEnded(label, browser, origin) {
  state.sessions = { 'preview-ready-1': session('ready') };
  const context = await newContext(browser, origin, { viewport: { width: 1440, height: 900 } });
  try {
    const target = await context.newPage();
    const harness = attachHarness(target);
    await target.goto(`${origin}${launchPath}`);
    await target.waitForSelector('[data-preview-close]:not([hidden])');
    state.sessions['preview-ready-1'] = session('expired');
    // The page reads the session state when the tab is shown again.
    await target.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await target.waitForSelector('[data-preview-ended="expired"]');
    check((await target.$('[data-orders-report]')) === null, `${label}: the ended view's content is removed`);
    check(await target.isHidden('[data-preview-close]'), `${label}: Close is withdrawn`);
    check((await target.getAttribute('[data-preview-ended] a', 'href')).startsWith('/admin/data?selection='), `${label}: Return keeps the exact selection`);
    await target.screenshot({ path: join(evidenceDir, `${label}-1440-ended.png`) });
    assertHealthy(`${label} ended`, harness);
  } finally {
    await context.close();
  }
}

async function verifyBrowser(label, browserType, isMobile, origin) {
  const browser = await browserType.launch({ headless: true });
  try {
    await verifyKeyboard(label, browser, origin);
    await verifyMobile(label, browser, origin, isMobile);
    await verifyEnded(label, browser, origin);
    const version = browser.version();
    process.stdout.write(`✔ ${label} ${version}: keyboard launch/close/return, 390px layout, ended session\n`);
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
