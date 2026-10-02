#!/usr/bin/env node
// Real-browser evidence for the operator console runtime. Loads the packaged
// console shell rendered from Go (tests/fixtures/console-page.html) and the
// Go-generated wire golden (tests/fixtures/console-contract.json), then checks
// shipped asset imports, live snapshot/event/invalidation handling, keyboard
// tabs, typed actions with CSRF, policy-close revocation, a mobile viewport,
// and two independent consoles on a page without Debug.

import { createServer } from 'node:http';
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { chromium, webkit } from 'playwright';

const root = resolve(import.meta.dirname, '..');
const fixtures = resolve(root, 'tests/fixtures');
const golden = JSON.parse(readFileSync(resolve(fixtures, 'console-contract.json'), 'utf8'));
const consolePage = readFileSync(resolve(fixtures, 'console-page.html'), 'utf8');
const evidenceDir = process.env.CONSOLE_BROWSER_EVIDENCE_DIR || join(tmpdir(), 'go-admin-console-browsers');
mkdirSync(evidenceDir, { recursive: true });

const types = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
]);

const bootstraps = { data: golden.bootstrap, ops: golden.second_bootstrap };
const state = { revoked: new Set(), actions: [], snapshots: { data: 0, ops: 0 } };

function jsonForScript(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

// Two consoles with the same panel IDs, cloned from the packaged shell, on a
// page that loads no Debug assets.
function twoConsolePage() {
  const start = consolePage.indexOf('<section class="console-root"');
  const bootstrapAt = consolePage.indexOf('data-console-bootstrap', start);
  const end = consolePage.indexOf('</section>', bootstrapAt) + '</section>'.length;
  const headerStart = consolePage.indexOf('<div class="console-page-actions"');
  const headerEnd = consolePage.indexOf('</div>', headerStart) + '</div>'.length;
  if (start < 0 || bootstrapAt < 0 || end <= start || headerStart < 0 || headerEnd <= headerStart) {
    throw new Error('console shell section or page header controls not found in fixture');
  }
  // Each console keeps its own header group, bound by the root's DOM ID.
  const shell = consolePage.slice(headerStart, headerEnd) + consolePage.slice(start, end);
  const second = shell
    .replaceAll('"console-data"', '"console-ops"')
    .replace('data-console-id="data"', 'data-console-id="ops"')
    .replaceAll('Data operations', 'Operations review')
    .replace(/(data-console-bootstrap>)[\s\S]*?(<\/script>)/, (_match, open, close) => `${open}${jsonForScript(golden.second_bootstrap)}${close}`);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="csrf-token" content="fixture-csrf">
  <title>Two consoles</title>
  <link rel="stylesheet" href="/admin/assets/dist/styles/console.css">
  <style>body{margin:0;padding:16px;background:#f1f5f9}main{display:grid;gap:24px}</style>
</head>
<body><main>${shell}${second}</main><script type="module" src="/admin/assets/dist/console/index.js"></script></body>
</html>`;
}

function send(response, status, body, type = 'application/json; charset=utf-8') {
  response.writeHead(status, { 'content-type': type });
  response.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

const server = createServer((request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1');
  const { pathname } = url;
  if (pathname === '/fixture/console-page.html') return send(response, 200, consolePage, types.get('.html'));
  if (pathname === '/fixture/two-consoles.html') return send(response, 200, twoConsolePage(), types.get('.html'));
  const snapshot = pathname.match(/^\/fixture\/(data|ops)\/api\/snapshot$/);
  if (snapshot) {
    const id = snapshot[1];
    state.snapshots[id] += 1;
    if (state.revoked.has(id)) return send(response, 403, { error: { code: 'FORBIDDEN', message: 'console access changed' } });
    return send(response, 200, bootstraps[id].snapshot);
  }
  const action = pathname.match(/^\/fixture\/(data|ops)\/api\/panels\/([^/]+)\/actions\/([^/]+)$/);
  if (action && request.method === 'POST') {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      state.actions.push({ console: action[1], panel: action[2], action: action[3], csrf: request.headers['x-csrf-token'], body: JSON.parse(body || '{}') });
      send(response, 200, { ok: true, message: 'Queued preview' });
    });
    return undefined;
  }
  if (pathname.startsWith('/admin/assets/')) {
    const path = resolve(root, `.${pathname.slice('/admin/assets'.length)}`);
    if (path.startsWith(`${root}/`) && isFile(path)) {
      return send(response, 200, readFileSync(path), types.get(extname(path)) || 'application/octet-stream');
    }
  }
  return send(response, 404, 'not found', 'text/plain');
});

function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

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

async function attachHarness(page) {
  const harness = { sockets: { data: [], ops: [] }, pageErrors: [], assetFailures: [], debugAssets: [] };
  await page.routeWebSocket(/\/fixture\/(data|ops)\/ws/, (ws) => {
    const id = new URL(ws.url()).pathname.split('/')[2];
    harness.sockets[id].push(ws);
  });
  page.on('pageerror', (error) => harness.pageErrors.push(`${error.message}\n${error.stack || ''}`));
  // Fixture hosts run with Debug disabled: the neutral runtime must not pull
  // Debug entries, chunks or styles.
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (/^\/admin\/assets\/dist\/(debug\/|chunks\/debug-|styles\/debug\.css)/.test(path)) harness.debugAssets.push(path);
  });
  page.on('response', (response) => {
    const path = new URL(response.url()).pathname;
    if (/^\/admin\/assets\/dist\/(console\/|chunks\/|styles\/console\.css)/.test(path) && !response.ok()) {
      harness.assetFailures.push(`${response.status()} ${path}`);
    }
  });
  page.on('requestfailed', (request) => {
    const path = new URL(request.url()).pathname;
    if (/^\/admin\/assets\/dist\/(console\/|chunks\/)/.test(path)) harness.assetFailures.push(`failed ${path}`);
  });
  return harness;
}

const consoleState = (page, id = 'data') =>
  page.evaluate((consoleID) => document.querySelector(`[data-console-id="${consoleID}"]`)?.dataset.consoleState || '', id);

const bodyText = (page, id = 'data') =>
  page.evaluate((consoleID) => document.querySelector(`[data-console-id="${consoleID}"] [data-console-panel]`)?.textContent || '', id);

function assertHealthy(label, harness) {
  check(harness.assetFailures.length === 0, `${label}: shipped console assets failed: ${harness.assetFailures.join(', ')}`);
  check(harness.debugAssets.length === 0, `${label}: Debug assets loaded on a Debug-disabled host: ${harness.debugAssets.join(', ')}`);
  const consoleErrors = harness.pageErrors.filter((error) => /\/dist\/(console|chunks)\//.test(error));
  check(consoleErrors.length === 0, `${label}: console runtime threw: ${consoleErrors.join('\n')}`);
}

async function verifyDesktop(label, browser, origin) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  try {
    const page = await context.newPage();
    const harness = await attachHarness(page);
    state.actions = [];
    state.revoked.clear();
    await page.goto(`${origin}/fixture/console-page.html`);
    await eventually(async () => (await consoleState(page)) === 'ready', `${label}: console ready`);
    await eventually(async () => harness.sockets.data.length === 1, `${label}: live socket opened`);
    const socket = harness.sockets.data[0];
    check(new URL(socket.url()).search === '?panels=operations%2Ctargets%2Caudit', `${label}: live selection ${socket.url()}`);

    socket.send(JSON.stringify(golden.bootstrap.snapshot));
    const header = '[data-admin-page-actions] [data-console-page-actions][data-console-for="console-data"]';
    await eventually(async () => (await page.locator(`${header} span[data-console-connection]`).textContent()) === 'Live', `${label}: page header connection indicator`);
    check(await page.getAttribute(`${header} [data-console-status]`, 'data-status') === 'connected', `${label}: page header live state`);
    check(await page.getAttribute('[data-console-root]', 'data-console-live') === 'connected', `${label}: root live state`);
    check(await page.getAttribute('[data-console-root]', 'data-console-controls') === 'page', `${label}: header bound by root DOM id`);
    check(await page.locator('[data-console-root] [data-console-status]').count() === 0, `${label}: no duplicate in-root status`);
    // The fixture serves the bootstrap snapshot, so refresh before live events advance past it.
    const before = state.snapshots.data;
    await page.click(`${header} [data-console-action="refresh"]`);
    await eventually(async () => state.snapshots.data === before + 1, `${label}: page header Refresh recovers this console`);
    await eventually(async () => (await page.getAttribute('[data-console-root]', 'data-console-sync')) === 'current', `${label}: refreshed snapshot applied`);
    socket.send(JSON.stringify(golden.upsert));
    await eventually(async () => /succeeded/.test(await bodyText(page)), `${label}: live upsert applied`);

    await page.focus('[data-console-tab="operations"]');
    await page.keyboard.press('ArrowRight');
    check(await page.evaluate(() => document.activeElement?.dataset.consoleTab) === 'targets', `${label}: ArrowRight focus`);
    check(await page.getAttribute('[data-console-tab="targets"]', 'aria-selected') === 'true', `${label}: ArrowRight selection`);
    await page.keyboard.press('End');
    check(await page.evaluate(() => document.activeElement?.dataset.consoleTab) === 'audit', `${label}: End key`);
    await page.keyboard.press('Home');
    check(await page.evaluate(() => document.activeElement?.dataset.consoleTab) === 'operations', `${label}: Home key`);

    await page.selectOption('select[data-action-field="dataset"]', 'baseline');
    await page.click('form[data-panel-action-form] button[type="submit"]');
    await eventually(async () => /Queued preview/.test(await bodyText(page) + (await page.textContent('[data-panel-action-result="operations"]'))), `${label}: action result`);
    check(state.actions.length === 1, `${label}: one action dispatched`);
    check(state.actions[0].panel === 'operations' && state.actions[0].action === 'preview', `${label}: action route`);
    check(state.actions[0].csrf === 'fixture-csrf', `${label}: CSRF header`);
    check(state.actions[0].body.dataset === 'baseline', `${label}: typed payload`);

    // Grow filters widen along desktop rows but keep content height in the
    // column action launcher; checkbox fields keep their native box.
    const searchWidth = await page.evaluate(() => document.querySelector('[data-console-filters] .console-filter--grow')?.getBoundingClientRect().width ?? 0);
    check(searchWidth >= 200, `${label}: search filter grows along the filter row (${searchWidth}px)`);
    await page.click('[data-console-tab="targets"]');
    await page.selectOption('select[data-panel-action-picker="targets"]', 'retry');
    const launcher = await page.evaluate(() => {
      const root = document.querySelector('[data-console-root]');
      const picker = root.querySelector('[data-panel-action-launcher] > .console-filter--grow')?.getBoundingClientRect();
      const checkbox = root.querySelector('[data-panel-action-choice="retry"] input[type="checkbox"]')?.getBoundingClientRect();
      return { picker: picker ? picker.height : 0, checkbox: checkbox ? [checkbox.width, checkbox.height] : [] };
    });
    check(launcher.picker > 0 && launcher.picker <= 72, `${label}: action picker keeps content height (${launcher.picker}px)`);
    check(launcher.checkbox.length === 2 && Math.max(...launcher.checkbox) <= 24, `${label}: checkbox field keeps its native size (${launcher.checkbox})`);
    await page.click('[data-console-tab="operations"]');

    socket.send(JSON.stringify(golden.invalidate));
    await eventually(async () => (await page.getAttribute('[data-console-root]', 'data-console-sync')) === 'recovering', `${label}: invalidation holds events`);
    socket.send(JSON.stringify({ ...golden.bootstrap.snapshot, watermark: 30 }));
    await eventually(async () => (await page.getAttribute('[data-console-root]', 'data-console-sync')) === 'current', `${label}: host snapshot recovers`);
    await page.screenshot({ path: join(evidenceDir, `${label}-desktop.png`), fullPage: true });

    state.revoked.add('data');
    socket.close({ code: 1008, reason: 'console access changed' });
    await eventually(async () => (await consoleState(page)) === 'denied', `${label}: revocation denies`);
    check(await page.locator(`${header} [data-console-action="refresh"]`).isDisabled(), `${label}: denial disables the page header Refresh`);
    check(await page.locator(`${header} span[data-console-connection]`).textContent() === 'Not live', `${label}: denial clears the live status`);
    check(await page.locator('[data-console-tabs]').isHidden(), `${label}: tabs hidden after denial`);
    check((await bodyText(page)).trim() === '', `${label}: records cleared after denial`);
    check(/do not have access/.test(await page.textContent('[data-console-notice]')), `${label}: denial notice`);
    await page.waitForTimeout(300);
    check(harness.sockets.data.length === 1, `${label}: policy close never reconnects`);
    await page.screenshot({ path: join(evidenceDir, `${label}-revoked.png`), fullPage: true });
    assertHealthy(label, harness);
  } finally {
    await context.close();
  }
}

async function verifyMobile(label, browser, origin, isMobile) {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, ...(isMobile ? { isMobile: true } : {}) });
  try {
    const page = await context.newPage();
    const harness = await attachHarness(page);
    state.revoked.clear();
    await page.goto(`${origin}/fixture/console-page.html`);
    await eventually(async () => (await consoleState(page)) === 'ready', `${label}: mobile console ready`);
    const layout = await page.evaluate(() => {
      const consoleRoot = document.querySelector('[data-console-root]');
      const form = consoleRoot?.querySelector('form[data-panel-action-form]');
      return {
        overflow: consoleRoot ? consoleRoot.scrollWidth - consoleRoot.clientWidth : 999,
        formDirection: form ? getComputedStyle(form).flexDirection : '',
        fieldRatio: form ? form.querySelector('select').getBoundingClientRect().width / form.getBoundingClientRect().width : 0,
        searchHeight: consoleRoot.querySelector('[data-console-filters] .console-filter--grow')?.getBoundingClientRect().height ?? 0,
        tabsScroll: getComputedStyle(consoleRoot.querySelector('[data-console-tabs]')).overflowX,
        pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        header: (() => {
          const group = document.querySelector('[data-console-page-actions][data-console-for="console-data"]');
          const box = group?.getBoundingClientRect();
          return box ? { visible: box.width > 0 && box.height > 0, right: box.right, refresh: !group.querySelector('[data-console-action="refresh"]').disabled } : null;
        })(),
      };
    });
    check(layout.pageOverflow <= 1, `${label}: page overflows a 375px viewport by ${layout.pageOverflow}px`);
    check(layout.header?.visible && layout.header.right <= 376 && layout.header.refresh, `${label}: page header live status and Refresh stay reachable (${JSON.stringify(layout.header)})`);
    check(layout.searchHeight > 0 && layout.searchHeight <= 72, `${label}: stacked search filter keeps content height (${layout.searchHeight}px)`);
    check(layout.overflow <= 1, `${label}: console overflows a 375px viewport by ${layout.overflow}px`);
    check(layout.formDirection === 'column', `${label}: action form stacks on mobile (${layout.formDirection})`);
    check(layout.fieldRatio > 0.9, `${label}: action fields span the mobile width (${layout.fieldRatio})`);
    check(layout.tabsScroll === 'auto', `${label}: tabs scroll horizontally`);
    await page.screenshot({ path: join(evidenceDir, `${label}-mobile.png`), fullPage: true });
    assertHealthy(`${label} mobile`, harness);
  } finally {
    await context.close();
  }
}

async function verifyTwoConsoles(label, browser, origin) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1100 } });
  try {
    const page = await context.newPage();
    const harness = await attachHarness(page);
    state.revoked.clear();
    await page.goto(`${origin}/fixture/two-consoles.html`);
    await eventually(async () => (await consoleState(page, 'data')) === 'ready' && (await consoleState(page, 'ops')) === 'ready', `${label}: both consoles ready`);
    await eventually(async () => harness.sockets.data.length === 1 && harness.sockets.ops.length === 1, `${label}: one stream per console`);
    harness.sockets.data[0].send(JSON.stringify(golden.bootstrap.snapshot));
    harness.sockets.ops[0].send(JSON.stringify(golden.second_bootstrap.snapshot));
    harness.sockets.data[0].send(JSON.stringify(golden.upsert));
    // A foreign identity frame on the second stream is rejected.
    harness.sockets.ops[0].send(JSON.stringify(golden.upsert));
    await eventually(async () => /succeeded/.test(await bodyText(page, 'data')), `${label}: data console updated`);
    check(/running/.test(await bodyText(page, 'ops')) && !/succeeded/.test(await bodyText(page, 'ops')), `${label}: no event bleed into ops`);

    const isolation = await page.evaluate(() => {
      const ids = Array.from(document.querySelectorAll('[id]')).map((element) => element.id);
      return {
        duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
        debugRegistry: '__go_admin_panel_registry__' in globalThis,
        operationsPanels: document.querySelectorAll('[data-console-tab="operations"]').length,
      };
    });
    check(isolation.duplicateIds.length === 0, `${label}: duplicate element ids ${isolation.duplicateIds.join(',')}`);
    check(isolation.debugRegistry === false, `${label}: Debug runtime must not load on a Debug-disabled host`);
    check(isolation.operationsPanels === 2, `${label}: both consoles render the shared panel id`);

    const opsBefore = state.snapshots.ops;
    const dataBefore = state.snapshots.data;
    await page.click('[data-console-for="console-ops"] [data-console-action="refresh"]');
    await eventually(async () => state.snapshots.ops === opsBefore + 1, `${label}: ops header Refresh recovers ops`);
    await page.waitForTimeout(200);
    check(state.snapshots.data === dataBefore, `${label}: ops header Refresh never refreshes data`);
    const bindings = await page.evaluate(() => Array.from(document.querySelectorAll('[data-console-root]'), (root) => `${root.id}:${root.dataset.consoleControls}`));
    check(bindings.join(',') === 'console-data:page,console-ops:page', `${label}: each root binds its own header (${bindings})`);

    await page.click('[data-console-id="ops"] [data-console-tab="audit"]');
    const keys = await page.evaluate(() => Object.keys(sessionStorage));
    check(keys.length === 1 && keys[0].includes('"actor_id":"operator-2"') && keys[0].includes('"console_id":"ops"'), `${label}: preferences namespaced per identity ${keys}`);
    check(await page.getAttribute('[data-console-id="data"] [data-console-tab="operations"]', 'aria-selected') === 'true', `${label}: tab state isolated`);
    await page.screenshot({ path: join(evidenceDir, `${label}-two-consoles.png`), fullPage: true });
    assertHealthy(`${label} two consoles`, harness);
  } finally {
    await context.close();
  }
}

async function verifyRecoveryAndRegrant(label, browser, origin) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  try {
    const page = await context.newPage();
    const harness = await attachHarness(page);
    state.revoked.clear();
    let pending = null;
    let requests = 0;
    await page.route('**/fixture/data/api/snapshot', (route) => {
      requests += 1;
      pending = route;
    });
    await page.goto(`${origin}/fixture/console-page.html`);
    await eventually(async () => harness.sockets.data.length === 1, `${label}: race fixture socket`);
    const first = harness.sockets.data[0];
    first.send(JSON.stringify(golden.bootstrap.snapshot));
    const startRefresh = () => page.evaluate(async () => {
      const { getMountedConsole } = await import('/admin/assets/dist/console/index.js');
      globalThis.fixtureRecovery = getMountedConsole(document.querySelector('[data-console-root]')).refresh();
    });
    await startRefresh();
    await eventually(() => Boolean(pending), `${label}: paused recovery request`);
    first.send(JSON.stringify(golden.bootstrap.snapshot));
    first.send(JSON.stringify(golden.upsert));
    await eventually(async () => /succeeded/.test(await bodyText(page)), `${label}: newer live state`);
    await pending.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(golden.bootstrap.snapshot) });
    await page.evaluate(() => globalThis.fixtureRecovery);
    check(/succeeded/.test(await bodyText(page)), `${label}: delayed HTTP snapshot cannot roll back live state`);

    pending = null;
    await startRefresh();
    await eventually(() => Boolean(pending), `${label}: paused policy recovery request`);
    const watermark = golden.upsert.sequence;
    const denied = { ...golden.bootstrap.snapshot, watermark, panels: golden.bootstrap.snapshot.panels.filter((panel) => panel.id !== 'operations') };
    first.send(JSON.stringify(denied));
    await eventually(async () => await page.locator('[data-console-tab="operations"]').count() === 0, `${label}: panel removed`);
    await pending.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...golden.bootstrap.snapshot, watermark }) });
    await page.evaluate(() => globalThis.fixtureRecovery);
    check(await page.locator('[data-console-tab="operations"]').count() === 0, `${label}: equal-watermark old response cannot restore denied panel`);
    await eventually(() => harness.sockets.data.length === 2, `${label}: narrowed live selection`);
    const narrowed = harness.sockets.data[1];
    check(new URL(narrowed.url()).searchParams.get('panels') === 'targets,audit', `${label}: removed panel not requested`);
    narrowed.send(JSON.stringify(denied));
    const { sequence: _sequence, kind: _kind, panel_id: _panel, ...record } = golden.upsert;
    const granted = { ...golden.bootstrap.snapshot, watermark, panels: golden.bootstrap.snapshot.panels.map((panel) => panel.id === 'operations' ? { ...panel, records: [record] } : panel) };
    narrowed.send(JSON.stringify(granted));
    await eventually(() => harness.sockets.data.length === 3, `${label}: regranted selection`);
    const restored = harness.sockets.data[2];
    check(new URL(restored.url()).searchParams.get('panels').includes('operations'), `${label}: regranted panel requested`);
    restored.send(JSON.stringify(granted));
    await page.click('[data-console-tab="operations"]');
    restored.send(JSON.stringify({ ...golden.upsert, sequence: watermark + 1, revision: golden.upsert.revision + 1, data: { ...golden.upsert.data, state: 'verified' } }));
    await eventually(async () => /verified/.test(await bodyText(page)), `${label}: regranted live event delivered`);
    check(requests === 2, `${label}: regrant needs no extra HTTP polling`);
    assertHealthy(`${label} recovery/regrant`, harness);
  } finally {
    await context.close();
  }
}

async function verifyBrowser(label, browserType, isMobile, origin) {
  const browser = await browserType.launch({ headless: true });
  try {
    await verifyDesktop(label, browser, origin);
    await verifyMobile(label, browser, origin, isMobile);
    await verifyTwoConsoles(label, browser, origin);
    await verifyRecoveryAndRegrant(label, browser, origin);
    const version = browser.version();
    process.stdout.write(`✔ ${label} ${version}: shell, recovery races, regrant, keyboard, actions, revocation, mobile and two consoles\n`);
  } finally {
    await browser.close();
  }
}

await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
const { port } = server.address();
const origin = `http://127.0.0.1:${port}`;
try {
  await verifyBrowser('chromium', chromium, true, origin);
  await verifyBrowser('webkit', webkit, false, origin);
  process.stdout.write(`evidence: ${evidenceDir}\n`);
} finally {
  server.close();
}
