#!/usr/bin/env node
// Real-browser evidence for the operator console runtime. Loads the packaged
// console shell rendered from Go (tests/fixtures/console-page.html) and the
// Go-generated wire golden (tests/fixtures/console-contract.json), then checks
// shipped asset imports, live snapshot/event/invalidation handling, keyboard
// tabs, typed actions with CSRF, policy-close revocation, a mobile viewport,
// two independent consoles on a page without Debug, and the workflow golden's
// drawers, request drafts, confirmation modal and reload reconciliation.

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
const CLIENT_CAPABILITIES = golden.workflow.client_capabilities.join(',');

// Workflow fixture: the Go-generated workflow panel beside the golden panels,
// served under /fixture/wf without live delivery so HTTP outcomes drive it.
const workflowSnapshot = {
  ...golden.bootstrap.snapshot,
  panels: [golden.workflow.panel, ...golden.bootstrap.snapshot.panels],
};
const workflowBootstrap = (() => {
  const urls = Object.fromEntries(Object.entries(golden.bootstrap.urls)
    .filter(([key]) => key !== 'live')
    .map(([key, value]) => [key, value.replace('/fixture/data/', '/fixture/wf/')]));
  return { ...golden.bootstrap, urls, snapshot: workflowSnapshot };
})();
const workflow = {
  posts: [],
  lookups: [],
  options: [],
  // Responses consumed in order by action POSTs. 'timeout' answers like a
  // gateway that lost the upstream response (delivery unknown). Destroying the
  // socket instead lets browsers transparently resend the POST.
  outcomes: [],
  status: golden.workflow.request_status[1],
  snapshots: 0,
};

function workflowPage() {
  return consolePage.replace(/(data-console-bootstrap>)[\s\S]*?(<\/script>)/, (_match, open, close) => `${open}${jsonForScript(workflowBootstrap)}${close}`);
}

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
  if (pathname === '/fixture/workflow.html') return send(response, 200, workflowPage(), types.get('.html'));
  if (pathname.startsWith('/fixture/wf/')) return serveWorkflow(request, response, url);
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

function serveWorkflow(request, response, url) {
  const { pathname } = url;
  const capabilities = request.headers['x-console-capabilities'] || '';
  if (pathname === '/fixture/wf/api/snapshot') {
    workflow.snapshots += 1;
    return send(response, 200, workflowSnapshot);
  }
  if (/^\/fixture\/wf\/api\/panels\/[^/]+\/actions\/[^/]+\/options\/[^/]+$/.test(pathname)) {
    workflow.options.push({ path: pathname, query: Object.fromEntries(url.searchParams), capabilities });
    return send(response, 200, golden.workflow.option_page);
  }
  if (/^\/fixture\/wf\/api\/panels\/[^/]+\/requests\/[^/]+$/.test(pathname)) {
    workflow.lookups.push({ path: pathname, query: Object.fromEntries(url.searchParams), capabilities });
    return send(response, 200, workflow.status);
  }
  const action = pathname.match(/^\/fixture\/wf\/api\/panels\/([^/]+)\/actions\/([^/]+)$/);
  if (action && request.method === 'POST') {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      workflow.posts.push({ panel: action[1], action: action[2], capabilities, body: JSON.parse(body || '{}') });
      const outcome = workflow.outcomes.shift() || { ok: true, message: 'Done.' };
      if (outcome === 'timeout') {
        send(response, 504, { error: { code: 504, text_code: 'GATEWAY_TIMEOUT', message: 'The upstream did not answer in time.' } });
        return;
      }
      const { delayMs = 0, ...result } = outcome;
      setTimeout(() => send(response, 200, result), delayMs);
    });
    return undefined;
  }
  return send(response, 404, { error: { code: 404, text_code: 'NOT_FOUND', message: 'not found' } });
}

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
    const liveURL = new URL(socket.url());
    check(liveURL.searchParams.get('panels') === 'operations,targets,audit', `${label}: live selection ${socket.url()}`);
    check(liveURL.searchParams.get('capabilities') === CLIENT_CAPABILITIES, `${label}: live capabilities ${socket.url()}`);

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

const activeIn = (page, selector) => page.evaluate((target) => Boolean(document.activeElement?.closest(target)), selector);

// Evidence is captured once the drawer/modal finished opening (reduced motion aside).
async function settledShot(page, path) {
  await page.waitForFunction(() => {
    const layers = [...document.querySelectorAll('[data-console-drawer-layer], [data-go-admin-modal-backdrop]')];
    return layers.every((layer) => layer.dataset.state === 'open');
  });
  await page.waitForTimeout(250);
  await page.screenshot({ path });
}

async function openWorkflow(page, label) {
  await page.goto(`${page.fixtureOrigin}/fixture/workflow.html`);
  await eventually(async () => (await consoleState(page)) === 'ready', `${label}: workflow console ready`);
  await page.click('[data-console-tab="scenarios"]');
  await eventually(async () => await page.locator('[data-row-key="ready"] [data-console-action-ref][data-action-id="refresh"]').count() === 1, `${label}: row actions rendered`);
}

async function verifyWorkflow(label, browser, origin) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  try {
    const page = await context.newPage();
    page.fixtureOrigin = origin;
    const harness = await attachHarness(page);
    Object.assign(workflow, { posts: [], lookups: [], options: [], outcomes: [], snapshots: 0, status: golden.workflow.request_status[1] });
    await openWorkflow(page, label);
    const refreshRef = '[data-row-key="ready"] [data-console-action-ref][data-action-id="refresh"]';
    check(await page.locator('[data-console-panel-actions] form').count() === 0, `${label}: drawer layout renders no inline forms`);
    check(await page.getAttribute('[data-row-key="ready"] .console-menu [data-action-id="reset"]', 'aria-disabled') === 'true', `${label}: unsupported reset is disabled`);
    check(/no safe reset/.test(await page.getAttribute('[data-row-key="ready"] .console-menu [data-action-id="reset"]', 'title')), `${label}: disabled reset explains why`);

    // Keyboard: open, trap focus, close with Escape back to the invoker.
    await page.focus(refreshRef);
    await page.keyboard.press('Enter');
    await eventually(() => activeIn(page, '[data-console-drawer]'), `${label}: focus moves into the drawer`);
    for (let index = 0; index < 14; index += 1) {
      await page.keyboard.press('Tab');
      check(await activeIn(page, '[data-console-drawer]'), `${label}: Tab stays inside the drawer (${index})`);
    }
    await page.keyboard.press('Shift+Tab');
    check(await activeIn(page, '[data-console-drawer]'), `${label}: Shift+Tab stays inside the drawer`);
    await page.keyboard.press('Escape');
    await eventually(async () => await page.locator('[data-console-drawer]').count() === 0, `${label}: Escape closes the drawer`);
    check(await page.evaluate((selector) => document.activeElement === document.querySelector(selector), refreshRef), `${label}: focus returns to the row action`);

    // Preview plan with unknown delivery, then an unchanged resubmit.
    await page.click(refreshRef);
    workflow.outcomes.push('timeout');
    await page.click('[data-console-drawer] [data-submitter="secondary"]');
    await eventually(async () => /may not have been received/.test(await page.textContent('[data-console-drawer] [data-request-status]')), `${label}: unknown delivery is shown`);
    check(workflow.posts.length === 1, `${label}: one Preview plan dispatch (${workflow.posts.length})`);
    const preview = workflow.posts[0];
    check(preview.body.dry_run === true && /^[0-9a-f-]{36}$/.test(preview.body.request_id), `${label}: Preview plan request ${JSON.stringify(preview.body)}`);
    check(preview.capabilities === CLIENT_CAPABILITIES, `${label}: action capability header`);
    await settledShot(page, join(evidenceDir, `${label}-workflow-uncertain.png`));
    workflow.outcomes.push(golden.workflow.results[0]);
    await page.click('[data-console-drawer] [data-request-resubmit]');
    await eventually(async () => await page.locator('[data-console-drawer]').count() === 0, `${label}: planned outcome closes the drawer`);
    check(JSON.stringify(workflow.posts[1].body) === JSON.stringify(preview.body), `${label}: resubmit replays the frozen request`);
    check(await page.getAttribute('[data-console-banner]', 'data-tone') === 'planned', `${label}: planned banner tone`);
    check(await activeIn(page, '[data-console-banner]'), `${label}: the result banner takes focus`);

    // Execution is new work with its own ID; every submitter is busy in flight.
    await page.click(refreshRef);
    workflow.outcomes.push({ ...golden.workflow.request_status[0].result, delayMs: 400 });
    await page.click('[data-console-drawer] [data-submitter="primary"]');
    await eventually(async () => (await page.locator('[data-console-drawer] button[type="submit"]:disabled').count()) === 2, `${label}: all submitters busy`);
    await eventually(async () => await page.locator('[data-console-drawer]').count() === 0, `${label}: execution accepted`);
    const execution = workflow.posts[2].body;
    check(execution.dry_run === false && execution.request_id !== preview.body.request_id, `${label}: execution has a distinct ID ${JSON.stringify(execution)}`);

    // A follow-up offers Activate: paged receipts, refresh-before-confirm, the admin modal.
    await page.click('[data-row-key="ready"] summary');
    workflow.outcomes.push(golden.workflow.results[1]);
    await page.click('[data-row-key="ready"] .console-menu [data-action-id="validate"]');
    await page.click('[data-console-drawer] [data-submitter="primary"]');
    await eventually(async () => await page.locator('[data-console-banner] [data-action-id="activate"]').count() === 1, `${label}: stale outcome offers the follow-up`);
    await page.click('[data-console-banner] [data-action-id="activate"]');
    await eventually(async () => await page.locator('[data-console-drawer] select[data-action-field="receipt_id"] option[value="rcpt-empty-1"]').count() === 1, `${label}: receipt page loaded`);
    check(workflow.options[0].query.limit === '25' && workflow.options[0].capabilities === CLIENT_CAPABILITIES, `${label}: paged option request ${JSON.stringify(workflow.options[0])}`);
    check(await page.locator('[data-console-drawer] select[data-action-field="receipt_id"] option[value="rcpt-old-7"]').count() === 1, `${label}: pinned selection stays reachable`);
    await page.selectOption('[data-console-drawer] select[data-action-field="receipt_id"]', 'rcpt-empty-1');
    const snapshotsBefore = workflow.snapshots;
    await page.click('[data-console-drawer] [data-submitter="primary"]');
    await eventually(async () => await page.locator('.console-modal').count() === 1, `${label}: confirmation modal`);
    check(workflow.snapshots === snapshotsBefore + 1, `${label}: state reloads before confirmation`);
    check(/rcpt-empty-1/.test(await page.textContent('.console-modal')) && await page.locator('.console-modal .console-modal__changes tbody tr').count() === 3, `${label}: confirmation shows the changes`);
    await eventually(() => activeIn(page, '.console-modal'), `${label}: focus moves into the modal`);
    await settledShot(page, join(evidenceDir, `${label}-workflow-confirm.png`));
    await page.keyboard.press('Escape');
    await eventually(async () => await page.locator('.console-modal').count() === 0, `${label}: Escape cancels the confirmation`);
    check(workflow.posts.length === 4, `${label}: a cancelled confirmation never dispatches`);
    await eventually(() => activeIn(page, '[data-console-drawer]'), `${label}: focus returns to the drawer`);
    await page.click('[data-console-drawer] [data-submitter="primary"]');
    await eventually(async () => await page.locator('.console-modal [data-modal-confirm]').count() === 1, `${label}: confirmation again`);
    await page.click('.console-modal [data-modal-confirm]');
    await eventually(() => workflow.posts.length === 5, `${label}: confirmed activation dispatched`);
    const activation = workflow.posts[4].body;
    check(activation.expected_generation === 3 && activation.receipt_id === 'rcpt-empty-1' && /^[0-9a-f-]{36}$/.test(activation.request_id), `${label}: confirmed payload ${JSON.stringify(activation)}`);

    // Reload restores an unresolved request and reconciles it before new work.
    await eventually(async () => await page.locator('[data-console-drawer]').count() === 0, `${label}: activation settled`);
    await page.click(refreshRef);
    workflow.outcomes.push('timeout');
    await page.click('[data-console-drawer] [data-submitter="primary"]');
    await eventually(async () => /may not have been received/.test(await page.textContent('[data-console-drawer] [data-request-status]')), `${label}: second unknown delivery`);
    const dropped = workflow.posts.at(-1).body;
    await openWorkflow(page, `${label} reload`);
    await eventually(() => workflow.lookups.length === 1, `${label}: reload reconciles the pending request`);
    const lookup = workflow.lookups[0];
    check(lookup.path.endsWith(`/requests/${dropped.request_id}`) && lookup.query.action === 'refresh' && lookup.query.scope === 'refresh:preview' && lookup.query.submitted_at, `${label}: reconciliation query ${JSON.stringify(lookup)}`);
    await page.click(refreshRef);
    await eventually(async () => /was not received/.test(await page.textContent('[data-console-drawer] [data-request-status]')), `${label}: reopened drawer shows the reconciled state`);
    check(await page.inputValue('[data-console-drawer] input[data-action-field-generated]') === dropped.request_id, `${label}: reopen resumes the submitted ID`);
    await settledShot(page, join(evidenceDir, `${label}-workflow-reconciled.png`));
    assertHealthy(`${label} workflow`, harness);
  } finally {
    await context.close();
  }

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  try {
    const page = await mobile.newPage();
    page.fixtureOrigin = origin;
    const harness = await attachHarness(page);
    Object.assign(workflow, { posts: [], lookups: [], options: [], outcomes: [], snapshots: 0 });
    await openWorkflow(page, `${label} mobile`);
    const rows = await page.evaluate(() => {
      const cell = document.querySelector('[data-row-key="ready"] td[data-label]');
      return { display: cell ? getComputedStyle(cell).display : '', overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    check(rows.display === 'grid' && rows.overflow <= 1, `${label}: rows become cards at 390px (${JSON.stringify(rows)})`);
    await page.click('[data-row-key="ready"] [data-console-action-ref][data-action-id="refresh"]');
    const drawer = await page.evaluate(() => {
      const box = document.querySelector('[data-console-drawer]')?.getBoundingClientRect();
      const footer = document.querySelector('[data-console-drawer] .console-drawer__footer');
      return { width: box?.width ?? 0, footer: footer ? getComputedStyle(footer).flexDirection : '' };
    });
    check(drawer.width >= 389 && drawer.footer === 'column-reverse', `${label}: drawer fills the phone (${JSON.stringify(drawer)})`);
    await settledShot(page, join(evidenceDir, `${label}-workflow-mobile.png`));
    assertHealthy(`${label} workflow mobile`, harness);
  } finally {
    await mobile.close();
  }
}

async function verifyBrowser(label, browserType, isMobile, origin) {
  const browser = await browserType.launch({ headless: true });
  try {
    await verifyDesktop(label, browser, origin);
    await verifyMobile(label, browser, origin, isMobile);
    await verifyTwoConsoles(label, browser, origin);
    await verifyRecoveryAndRegrant(label, browser, origin);
    await verifyWorkflow(label, browser, origin);
    const version = browser.version();
    process.stdout.write(`✔ ${label} ${version}: shell, recovery races, regrant, keyboard, actions, revocation, mobile, two consoles and workflow drafts\n`);
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
