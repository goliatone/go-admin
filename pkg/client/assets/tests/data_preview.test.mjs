import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Application preview launch controls bound into the Data explorer's details,
// through the shipped Data console entry (which loads `console/data-preview`
// on demand) against stubbed explore and preview routes answering with the
// Go-generated explorer and preview fixtures.

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
const preview = JSON.parse(fs.readFileSync(path.join(here, 'fixtures/data-preview-contract.json'), 'utf8'));

const dom = new JSDOM('<!doctype html><html><head><meta name="csrf-token" content="csrf-1"></head><body></body></html>', {
  url: 'https://admin.example.test/admin/data',
  pretendToBeVisual: true,
});
const win = dom.window;
for (const name of [
  'window', 'document', 'Node', 'Element', 'HTMLElement', 'HTMLButtonElement', 'HTMLFormElement', 'HTMLAnchorElement',
  'HTMLInputElement', 'HTMLSelectElement', 'HTMLTextAreaElement', 'HTMLScriptElement', 'HTMLTemplateElement',
  'Event', 'CustomEvent', 'KeyboardEvent', 'MouseEvent', 'SubmitEvent', 'MutationObserver',
]) {
  globalThis[name] = name === 'window' ? win : name === 'document' ? win.document : win[name];
}
globalThis.location = win.location;
for (const name of ['localStorage', 'sessionStorage']) {
  Object.defineProperty(globalThis, name, { value: win[name], configurable: true, writable: true });
}

const EXPLORE = {
  metadata: '/admin/data/api/explore/metadata',
  samples: '/admin/data/api/explore/samples',
  related: '/admin/data/api/explore/related',
};
const ROUTES = preview.routes;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const errorResponse = (status, textCode = '', message = 'failed') => jsonResponse({ error: { code: status, text_code: textCode, message } }, status);
const clone = (value) => structuredClone(value);

function key(selection) {
  const { dataset, scenario } = selection;
  return JSON.stringify([
    selection.context, selection.target_id, dataset.provider, dataset.id, dataset.version, dataset.digest,
    scenario.id, scenario.version, scenario.profile_hash, selection.receipt_id || '', selection.content_revision ?? 0, selection.generation ?? -1,
  ]);
}

const capabilityNamed = (name) => clone(preview.capabilities.find((item) => item.name === name).response);
const sessionCase = (name) => clone(preview.sessions.find((item) => item.name === name));
const sessionNamed = (name) => sessionCase(name).response;
const readyPrepared = sessionCase('ready').request.selection;
const quietPrepared = sessionCase('quiet').request.selection;

function observedMetadata(selection) {
  const ready = explorer.metadata.find((metadata) => metadata.selection.scenario.id === 'ready');
  return { ...ready, selection, provenance: 'observed' };
}

/** The session the stub opens for a selection (Ready or Quiet), else none. */
function defaultSession(selection) {
  if (key(selection) === key(readyPrepared)) return sessionNamed('ready');
  if (key(selection) === key(quietPrepared)) return sessionNamed('quiet');
  return null;
}

/**
 * Explore/preview stub. `answers[kind](request)` may return a Response,
 * `{ deferred: () => Response }` (held until `release`), or undefined for the
 * fixture default. Every request records its method, URL, body and headers.
 */
function server(answers = {}) {
  const state = { requests: [], deferred: [], snapshot: golden.bootstrap.snapshot };
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input), 'https://admin.example.test');
    const method = String(init.method || 'GET').toUpperCase();
    if (url.pathname === '/admin/data/api/snapshot') return jsonResponse(state.snapshot);
    let kind = '';
    const request = { method, url, signal: init.signal, headers: new Headers(init.headers || {}) };
    if (url.pathname.startsWith('/admin/data/api/explore/')) {
      kind = url.pathname.split('/').at(-1);
      request.selection = JSON.parse(url.searchParams.get('selection'));
    } else if (url.pathname === ROUTES.capabilities && method === 'GET') {
      kind = 'capabilities';
      request.selection = JSON.parse(url.searchParams.get('selection'));
    } else if (url.pathname === ROUTES.open && method === 'POST') {
      kind = 'open';
      request.body = JSON.parse(init.body);
    } else {
      const close = url.pathname.match(/^\/admin\/data\/api\/preview\/sessions\/([^/]+)\/close$/);
      const session = url.pathname.match(/^\/admin\/data\/api\/preview\/sessions\/([^/]+)$/);
      if (close && method === 'POST') {
        kind = 'close';
        request.sessionId = decodeURIComponent(close[1]);
        request.body = init.body;
      } else if (session && method === 'GET') {
        kind = 'session';
        request.sessionId = decodeURIComponent(session[1]);
      }
    }
    if (!kind) return new Response('{}', { status: 404 });
    request.kind = kind;
    state.requests.push(request);
    const answer = answers[kind]?.(request, state);
    const fallback = () => {
      switch (kind) {
        case 'metadata': return jsonResponse(observedMetadata(request.selection));
        case 'capabilities': {
          if (key(request.selection) === key(readyPrepared)) return jsonResponse(capabilityNamed('supported'));
          if (key(request.selection) === key(quietPrepared)) return jsonResponse(capabilityNamed('quiet_supported'));
          return jsonResponse(capabilityNamed('not_supported'));
        }
        case 'open': {
          const session = defaultSession(request.body.selection);
          return session ? jsonResponse(session) : errorResponse(404, 'gone');
        }
        case 'session': return jsonResponse(state.sessions?.[request.sessionId] || sessionNamed('ready'));
        case 'close': {
          const closed = { ...(state.sessions?.[request.sessionId] || sessionNamed('ready')), state: 'closed' };
          delete closed.launch_url;
          return jsonResponse(closed);
        }
        default: return errorResponse(404, 'gone');
      }
    };
    if (answer && typeof answer.deferred === 'function') {
      return new Promise((resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new win.DOMException('aborted', 'AbortError')), { once: true });
        state.deferred.push({ request, release: () => resolve(answer.deferred()) });
      });
    }
    if (answer && typeof answer.reject === 'function') throw answer.reject();
    return answer || fallback();
  };
  return state;
}

const { mountDataConsole } = await import('../dist/console/data.js');
const previewModule = await import('../dist/console/data-preview.js');

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

/** Fixture sessions expire at 12:15Z: the page's clock reads 12:00Z unless a test moves it. */
const FIXED_NOW = Date.parse('2026-10-03T12:00:00Z');

function mount({ previewRoutes = true, now = () => FIXED_NOW, keepStorage = false } = {}) {
  win.document.body.innerHTML = '';
  // A remount with keepStorage is the same tab after navigating back to Data.
  if (!keepStorage) win.sessionStorage.clear();
  const extensions = { data_explorer: EXPLORE, ...(previewRoutes ? { data_preview: ROUTES } : {}) };
  const bootstrap = { ...golden.bootstrap, extensions };
  const root = win.document.createElement('section');
  root.setAttribute('data-console-root', '');
  root.setAttribute('data-console-manual', '');
  root.innerHTML = `<script type="application/json" data-console-bootstrap>${JSON.stringify(bootstrap).replace(/</g, '\\u003c')}</script>`;
  win.document.body.appendChild(root);
  // Routes come from the bootstrap; the test only supplies the clock.
  const runtime = mountDataConsole(root, { live: false, recoveryDelaysMs: [5], maxRecoveryAttempts: 1, explorer: { preview: { now } } });
  mounted.push(runtime);
  return { root, runtime };
}

// A failed assertion must not leave a mounted console (and its expiry timer) behind.
const mounted = [];
afterEach(() => {
  mounted.splice(0).forEach((runtime) => runtime.destroy());
});

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
const requests = (state, kind) => state.requests.filter((request) => request.kind === kind);
const surface = (root, id = 'synthetic-orders-report') => root.querySelector(`.console-preview__surface[data-surface-id="${id}"]`);
const action = (root, name, id = 'synthetic-orders-report') => surface(root, id)?.querySelector(`[data-preview-action="${name}"]`);

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

/** Open Ready's details on its prepared receipt and show App preview with its surfaces. */
async function showPreparedPreview(root, runtime) {
  await openReady(root, runtime);
  await chooseContext(root, 'prepared');
  await showSection(root, 'app-preview');
  await waitFor(() => assert.ok(surface(root), sectionText(root)));
}

// ---------------------------------------------------------------------------
// Contract and transport units

test('capability and session parsers keep only safe, exact answers', () => {
  const { parseCapability, parseSession } = previewModule;
  assert.deepEqual(parseCapability(capabilityNamed('supported')).surfaces.map((item) => item.id), ['synthetic-orders-report', 'orders-screen']);
  const unsafe = capabilityNamed('supported');
  unsafe.guarantees.isolation = false;
  assert.equal(parseCapability(unsafe), null, 'a supported answer without every guarantee is malformed');
  const empty = capabilityNamed('supported');
  empty.surfaces = [];
  assert.equal(parseCapability(empty), null, 'supported without surfaces is malformed');
  const duplicate = capabilityNamed('supported');
  duplicate.surfaces.push(duplicate.surfaces[0]);
  assert.equal(parseCapability(duplicate), null);
  const leaking = capabilityNamed('not_supported');
  leaking.surfaces = capabilityNamed('supported').surfaces;
  assert.deepEqual(parseCapability(leaking).surfaces, [], 'an unsupported answer never offers surfaces');
  assert.equal(parseCapability({ ...capabilityNamed('not_supported'), reason: 'future_reason' }).reason, 'unknown');
  const tooMany = capabilityNamed('supported');
  tooMany.surfaces = Array.from({ length: 17 }, (_, index) => ({ id: `s${index}`, label: `S${index}`, kind: 'report' }));
  assert.equal(parseCapability(tooMany), null, 'over the 16-surface cap');

  const ready = sessionNamed('ready');
  assert.equal(parseSession(ready, readyPrepared, 'synthetic-orders-report').launch_url, '/admin/data/preview/preview-ready-1/surfaces/synthetic-orders-report');
  assert.equal(parseSession(ready, quietPrepared, 'synthetic-orders-report'), null, 'a session for another receipt is foreign');
  assert.equal(parseSession(ready, readyPrepared, 'orders-screen'), null, 'a session for another surface is foreign');
  assert.equal(parseSession(ready, readyPrepared, 'synthetic-orders-report', 'preview-other'), null, 'another locator is foreign');
  for (const launch of ['https://evil.test/x', '//evil.test/x', 'javascript:alert(1)', '/a\\b', '']) {
    assert.equal(parseSession({ ...ready, launch_url: launch }, readyPrepared, 'synthetic-orders-report'), null, `launch ${launch}`);
  }
  assert.equal(parseSession({ ...ready, read_only: false }, readyPrepared, 'synthetic-orders-report'), null, 'never a writable preview');
  const closed = parseSession({ ...sessionNamed('closed'), launch_url: '/admin/data/preview/x' }, readyPrepared, 'synthetic-orders-report');
  assert.equal(closed.launch_url, '', 'only a ready session keeps a launch URL');
});

test('failures are classified by status and lifecycle text code', () => {
  const { classifyPreviewFailure, sessionPath } = previewModule;
  assert.equal(classifyPreviewFailure(409, 'busy'), 'busy');
  assert.equal(classifyPreviewFailure(409, 'fingerprint_conflict'), 'conflict');
  assert.equal(classifyPreviewFailure(409, 'stale_generation'), 'stale');
  assert.equal(classifyPreviewFailure(400, 'ADMIN_CSRF_INVALID'), 'expired', 'a rejected CSRF token asks for a reload');
  assert.equal(classifyPreviewFailure(403, 'FORBIDDEN'), 'denied');
  assert.equal(classifyPreviewFailure(404, 'gone'), 'gone');
  assert.equal(classifyPreviewFailure(503), 'unavailable');
  assert.equal(sessionPath(ROUTES.close, 'a/b c'), '/admin/data/api/preview/sessions/a%2Fb%20c/close');
});

// ---------------------------------------------------------------------------
// Explorer integration

test('App preview follows Used by only when the page offers preview routes and reads nothing until shown', async () => {
  let state = server();
  let mounted = mount();
  await openReady(mounted.root, mounted.runtime);
  assert.deepEqual(Array.from(mounted.root.querySelectorAll('[data-explorer-section]')).map((tab) => tab.dataset.explorerSection),
    ['about', 'contents', 'usage', 'app-preview', 'scenarios', 'evidence']);
  await settle();
  assert.equal(requests(state, 'capabilities').length, 0, 'nothing is read before App preview is shown');
  mounted.runtime.destroy();

  state = server();
  mounted = mount({ previewRoutes: false });
  await openReady(mounted.root, mounted.runtime);
  assert.ok(!mounted.root.querySelector('[data-explorer-section="app-preview"]'));
  mounted.runtime.destroy();
});

test('catalog and active contexts explain that previews open prepared receipts and offer the receipt', async () => {
  const state = server();
  const { root, runtime } = mount();
  await openReady(root, runtime);
  await showSection(root, 'app-preview');
  await waitFor(() => assert.ok(root.querySelector('[data-preview-state="context"]'), sectionText(root)));
  assert.ok(sectionText(root).includes('A catalog example is not prepared data.'));
  assert.equal(requests(state, 'capabilities').length, 0, 'a catalog example is never sent for preview');
  await chooseContext(root, 'active');
  await waitFor(() => assert.ok(sectionText(root).includes('Active data is what preview serves now'), sectionText(root)));
  click(root.querySelector('[data-explorer-action="prepared"]'));
  await waitFor(() => assert.ok(surface(root), sectionText(root)));
  assert.equal(root.querySelector('input[value="prepared"]').checked, true);
  const [read] = requests(state, 'capabilities');
  assert.equal(key(read.selection), key(readyPrepared), 'the capability read names the exact prepared selection');
  assert.equal(win.document.activeElement?.dataset.explorerFocus, 'section-panel');
  runtime.destroy();
});

test('a prepared receipt lists readable surfaces with its exact identity and guarantees', async () => {
  server();
  const { root, runtime } = mount();
  await showPreparedPreview(root, runtime);
  const text = sectionText(root);
  for (const expected of ['Prepared receipt rcpt-ready-1', 'Content revision 2', 'Target preview', 'Lifecycle status Active',
    'does not verify or activate the receipt', 'This receipt is also the active one', 'Read-only', 'Expires automatically',
    'Synthetic orders report Report', 'Orders screen Screen']) {
    assert.ok(text.includes(expected), `${expected} in ${text}`);
  }
  const start = action(root, 'open');
  assert.equal(start.textContent.trim(), 'Start preview');
  assert.ok(!root.querySelector('[data-preview-launch]'), 'no launch link before a session exists');
  runtime.destroy();
});

test('unsupported hosts and denied or failed checks never offer a launch', async () => {
  const cases = [
    ['not_supported', 'This application does not offer previews of prepared data.', false],
    ['runtime_unavailable', 'The application cannot open a preview of this receipt right now.', true],
    ['no_readable_surfaces', 'No application view you can open is registered for this data.', false],
  ];
  for (const [name, message, retry] of cases) {
    const state = server({ capabilities: () => jsonResponse(capabilityNamed(name)) });
    const { root, runtime } = mount();
    await openReady(root, runtime);
    await chooseContext(root, 'prepared');
    await showSection(root, 'app-preview');
    const notice = await waitFor(() => {
      const found = root.querySelector('[data-preview-state="unsupported"]');
      assert.ok(found, sectionText(root));
      return found;
    });
    assert.equal(notice.dataset.previewReason, name);
    assert.ok(textOf(notice).includes(message), textOf(notice));
    assert.equal(root.querySelectorAll('[data-preview-action="open"], [data-preview-launch]').length, 0, `${name} offers no launch`);
    assert.equal(Boolean(notice.querySelector('[data-preview-action="retry"]')), retry);
    if (retry) {
      click(notice.querySelector('[data-preview-action="retry"]'));
      await waitFor(() => assert.equal(requests(state, 'capabilities').length, 2));
    }
    runtime.destroy();
  }

  const denied = server({ capabilities: () => errorResponse(403, 'FORBIDDEN') });
  let mounted = mount();
  await openReady(mounted.root, mounted.runtime);
  await chooseContext(mounted.root, 'prepared');
  await showSection(mounted.root, 'app-preview');
  await waitFor(() => assert.ok(mounted.root.querySelector('[data-preview-failure="capability:denied"]'), sectionText(mounted.root)));
  assert.ok(!mounted.root.querySelector('[data-preview-action="retry"]'), 'denial is not retried');
  assert.equal(requests(denied, 'capabilities').length, 1);
  mounted.runtime.destroy();

  server({ capabilities: () => jsonResponse({ supported: true, surfaces: [], guarantees: {} }) });
  mounted = mount();
  await openReady(mounted.root, mounted.runtime);
  await chooseContext(mounted.root, 'prepared');
  await showSection(mounted.root, 'app-preview');
  await waitFor(() => assert.ok(mounted.root.querySelector('[data-preview-failure="capability:malformed"]'), sectionText(mounted.root)));
  assert.ok(mounted.root.querySelector('[data-preview-action="retry"]'));
  mounted.runtime.destroy();
});

test('surface labels are escaped', async () => {
  server({ capabilities: () => jsonResponse(capabilityNamed('hostile')) });
  const { root, runtime } = mount();
  await openReady(root, runtime);
  await chooseContext(root, 'prepared');
  await showSection(root, 'app-preview');
  await waitFor(() => assert.ok(root.querySelector('.console-preview__surface[data-surface-id="hostile-report"]'), sectionText(root)));
  assert.ok(sectionText(root).includes('<img src=x onerror="window.__previewXSS=1">"quoted" & \'single\''));
  assert.equal(root.querySelector('.console-preview img'), null);
  assert.equal(win.__previewXSS, undefined);
  runtime.destroy();
});

test('Start preview sends one CSRF-protected open with a generated request ID and shows the launch link', async () => {
  const state = server({ open: () => ({ deferred: () => jsonResponse(sessionNamed('ready')) }) });
  const { root, runtime } = mount();
  await showPreparedPreview(root, runtime);
  click(action(root, 'open'));
  await waitFor(() => assert.equal(state.deferred.length, 1));
  const [open] = requests(state, 'open');
  assert.equal(open.url.pathname, ROUTES.open);
  assert.equal(open.headers.get('X-CSRF-Token'), 'csrf-1');
  assert.deepEqual(Object.keys(open.body).sort(), ['request_id', 'selection', 'surface_id']);
  assert.equal(key(open.body.selection), key(readyPrepared));
  assert.equal(open.body.surface_id, 'synthetic-orders-report');
  assert.match(open.body.request_id, UUID);

  // Busy: the control stays focusable, announces busy and never sends twice.
  const busy = await waitFor(() => {
    const found = action(root, 'open');
    assert.equal(found.getAttribute('aria-busy'), 'true');
    return found;
  });
  assert.equal(busy.getAttribute('aria-disabled'), 'true');
  assert.equal(busy.textContent.trim(), 'Starting preview…');
  click(busy);
  await settle();
  assert.equal(requests(state, 'open').length, 1);

  state.deferred[0].release();
  const link = await waitFor(() => {
    const found = root.querySelector('[data-preview-launch]');
    assert.ok(found, sectionText(root));
    return found;
  });
  assert.equal(link.tagName, 'A');
  assert.equal(link.getAttribute('href'), 'https://admin.example.test/admin/data/preview/preview-ready-1/surfaces/synthetic-orders-report');
  assert.equal(link.getAttribute('target'), null, 'explicit same-tab navigation, never a popup');
  assert.equal(textOf(link), 'Open preview of Synthetic orders report');
  assert.equal(win.document.activeElement, link, 'focus moves to the launch link');
  assert.ok(sectionText(root).includes('Read-only preview of receipt rcpt-ready-1'), sectionText(root));
  assert.ok(sectionText(root).includes('Expires at') && sectionText(root).includes('(in 15 minutes)'), sectionText(root));
  assert.ok(action(root, 'close'));
  assert.ok(!sectionText(root).includes('preview-ready-1'), 'the session locator is never shown');
  runtime.destroy();
});

test('an open without a definitive answer is retried with the same request ID to reattach', async () => {
  let attempt = 0;
  const state = server({
    open: () => {
      attempt += 1;
      return attempt === 1 ? { reject: () => new TypeError('network down') } : undefined;
    },
  });
  const { root, runtime } = mount();
  await showPreparedPreview(root, runtime);
  click(action(root, 'open'));
  const failure = await waitFor(() => {
    const found = root.querySelector('[data-preview-failure="open:network"]');
    assert.ok(found, sectionText(root));
    return found;
  });
  assert.ok(textOf(failure).includes('The preview may have started: try again to reattach to it.'));
  assert.equal(failure.querySelector('[data-preview-action]'), null, 'the callout explains; the surface control acts');
  assert.equal(action(root, 'open').textContent.trim(), 'Try again');
  click(action(root, 'open'));
  await waitFor(() => assert.ok(root.querySelector('[data-preview-launch]'), sectionText(root)));
  const [first, second] = requests(state, 'open');
  assert.equal(second.body.request_id, first.body.request_id, 'the replay reuses the uncertain request ID');
  runtime.destroy();
});

test('definitive open failures start explicitly identified new work', async () => {
  const answers = [errorResponse(409, 'busy'), errorResponse(409, 'fingerprint_conflict')];
  const state = server({ open: () => answers.shift() });
  const { root, runtime } = mount();
  await showPreparedPreview(root, runtime);

  click(action(root, 'open'));
  const busy = await waitFor(() => {
    const found = root.querySelector('[data-preview-failure="open:busy"]');
    assert.ok(found, sectionText(root));
    return found;
  });
  assert.ok(textOf(busy).includes('You already have the most previews open at once.'));
  assert.equal(action(root, 'open').textContent.trim(), 'Try again');
  click(action(root, 'open'));
  const conflict = await waitFor(() => {
    const found = root.querySelector('[data-preview-failure="open:conflict"]');
    assert.ok(found, sectionText(root));
    return found;
  });
  assert.ok(textOf(conflict).includes('Start a new preview'));
  assert.equal(action(root, 'open').textContent.trim(), 'Start a new preview');
  click(action(root, 'open'));
  await waitFor(() => assert.ok(root.querySelector('[data-preview-launch]'), sectionText(root)));
  const ids = requests(state, 'open').map((request) => request.body.request_id);
  assert.equal(ids.length, 3);
  assert.equal(new Set(ids).size, 3, 'each definitive answer reserves a new request ID');
  ids.forEach((id) => assert.match(id, UUID));
  runtime.destroy();
});

test('stale, gone, denied and expired opens offer only safe next steps', async () => {
  const cases = [
    [errorResponse(409, 'stale_generation'), 'open:stale', 'refresh'],
    [errorResponse(404, 'gone'), 'open:gone', 'refresh'],
    [errorResponse(403, 'FORBIDDEN'), 'open:denied', ''],
    [errorResponse(401, 'UNAUTHORIZED'), 'open:expired', ''],
    [errorResponse(400, 'ADMIN_CSRF_INVALID'), 'open:expired', ''],
  ];
  for (const [response, marker, next] of cases) {
    server({ open: () => response.clone() });
    const { root, runtime } = mount();
    await showPreparedPreview(root, runtime);
    click(action(root, 'open'));
    const failure = await waitFor(() => {
      const found = root.querySelector(`[data-preview-failure="${marker}"]`);
      assert.ok(found, `${marker}: ${sectionText(root)}`);
      return found;
    });
    assert.equal(Boolean(failure.querySelector('[data-explorer-action="refresh"]')), next === 'refresh', marker);
    assert.equal(surface(root).querySelector('[data-preview-action="open"], [data-preview-action="new"]'), null, `${marker} offers no retry of the same launch`);
    assert.ok(action(root, 'open', 'orders-screen'), 'other views stay available');
    assert.ok(!root.querySelector('[data-preview-launch]'));
    runtime.destroy();
  }
});

test('a foreign or unreadable open answer is never shown and is retried as uncertain', async () => {
  const state = server({ open: (request) => (requests(state, 'open').length === 1 ? jsonResponse(sessionNamed('quiet')) : undefined) });
  const { root, runtime } = mount();
  await showPreparedPreview(root, runtime);
  click(action(root, 'open'));
  await waitFor(() => assert.ok(root.querySelector('[data-preview-failure="open:malformed"]'), sectionText(root)));
  assert.ok(!root.querySelector('[data-preview-launch]'), 'a session for another receipt never becomes a link');
  click(action(root, 'open'));
  await waitFor(() => assert.ok(root.querySelector('[data-preview-launch]')));
  const [first, second] = requests(state, 'open');
  assert.equal(second.body.request_id, first.body.request_id);
  runtime.destroy();
});

test('Close ends the session through its locator and a new launch uses a new request ID', async () => {
  const state = server();
  const { root, runtime } = mount();
  await showPreparedPreview(root, runtime);
  click(action(root, 'open'));
  await waitFor(() => assert.ok(root.querySelector('[data-preview-launch]')));
  click(action(root, 'close'));
  await waitFor(() => assert.ok(root.querySelector('[data-preview-state="closed"]'), sectionText(root)));
  const [close] = requests(state, 'close');
  assert.equal(close.url.pathname, '/admin/data/api/preview/sessions/preview-ready-1/close');
  assert.equal(close.headers.get('X-CSRF-Token'), 'csrf-1');
  assert.ok(!root.querySelector('[data-preview-launch]'), 'a closed session has no link');
  assert.ok(sectionText(root).includes('This preview was closed.'));
  const again = action(root, 'new');
  assert.equal(win.document.activeElement, again, 'focus moves to Start a new preview');
  click(again);
  await waitFor(() => assert.ok(root.querySelector('[data-preview-launch]')));
  const [first, second] = requests(state, 'open');
  assert.notEqual(second.body.request_id, first.body.request_id);
  runtime.destroy();
});

test('a close the server no longer recognizes ends the preview locally', async () => {
  server({ close: () => errorResponse(404, 'gone') });
  const { root, runtime } = mount();
  await showPreparedPreview(root, runtime);
  click(action(root, 'open'));
  await waitFor(() => assert.ok(root.querySelector('[data-preview-launch]')));
  click(action(root, 'close'));
  await waitFor(() => assert.ok(root.querySelector('[data-preview-failure="close:gone"]'), sectionText(root)));
  assert.ok(!root.querySelector('[data-preview-launch]'), 'the link is withdrawn');
  assert.ok(action(root, 'new'));
  runtime.destroy();
});

test('a stale close means the server ended the preview; the link is withdrawn', async () => {
  server({ close: () => errorResponse(409, 'stale_generation') });
  const { root, runtime } = mount();
  await showPreparedPreview(root, runtime);
  click(action(root, 'open'));
  await waitFor(() => assert.ok(root.querySelector('[data-preview-launch]')));
  click(action(root, 'close'));
  const failure = await waitFor(() => {
    const found = root.querySelector('[data-preview-failure="close:stale"]');
    assert.ok(found, sectionText(root));
    return found;
  });
  assert.ok(textOf(failure).includes('The prepared data changed, so this preview has ended.'));
  assert.ok(!root.querySelector('[data-preview-launch]'));
  assert.ok(root.querySelector('[data-preview-state="unavailable"]'));
  assert.ok(action(root, 'new'));
});

test('a transient close failure keeps the session and its Close control', async () => {
  let attempt = 0;
  const state = server({ close: () => {
    attempt += 1;
    return attempt === 1 ? errorResponse(503, 'CONSOLE_PROVIDER_FAILED') : undefined;
  } });
  const { root, runtime } = mount();
  await showPreparedPreview(root, runtime);
  click(action(root, 'open'));
  await waitFor(() => assert.ok(root.querySelector('[data-preview-launch]')));
  click(action(root, 'close'));
  await waitFor(() => assert.ok(root.querySelector('[data-preview-failure="close:unavailable"]'), sectionText(root)));
  assert.ok(root.querySelector('[data-preview-launch]'), 'the session is still open');
  assert.equal(root.querySelector('[data-preview-failure] [data-preview-action]'), null);
  click(action(root, 'close'));
  await waitFor(() => assert.ok(root.querySelector('[data-preview-state="closed"]'), sectionText(root)));
  assert.equal(requests(state, 'close').length, 2);
});

test('an expired session stops offering its link and asks the server for its state', async () => {
  let clock = Date.parse('2026-10-03T12:00:00Z');
  const state = server({ session: () => jsonResponse({ ...sessionNamed('expired') }) });
  const { root, runtime } = mount({ now: () => clock });
  await showPreparedPreview(root, runtime);
  click(action(root, 'open'));
  await waitFor(() => assert.ok(root.querySelector('[data-preview-launch]')));
  assert.ok(sectionText(root).includes('(in 15 minutes)'), sectionText(root));
  clock = Date.parse('2026-10-03T12:15:01Z');
  // The next re-render (here: switching tabs) withdraws the link at once.
  await showSection(root, 'usage');
  await showSection(root, 'app-preview');
  await waitFor(() => assert.ok(root.querySelector('[data-preview-state="expired"]'), sectionText(root)));
  assert.ok(!root.querySelector('[data-preview-launch]'));
  assert.ok(sectionText(root).includes('This preview expired at'));
  assert.ok(action(root, 'new'));
  runtime.destroy();
  void state;
});

test('expiry follows the server clock when the answer is dated', async () => {
  // This browser's clock runs an hour ahead; the server says it is 12:00Z.
  const ahead = Date.parse('2026-10-03T13:00:00Z');
  server({ open: () => {
    const response = jsonResponse(sessionNamed('ready'));
    response.headers.set('date', new Date(FIXED_NOW).toUTCString());
    return response;
  } });
  const { root, runtime } = mount({ now: () => ahead });
  await showPreparedPreview(root, runtime);
  click(action(root, 'open'));
  await waitFor(() => assert.ok(root.querySelector('[data-preview-launch]'), sectionText(root)));
  assert.ok(sectionText(root).includes('(in 15 minutes)'), sectionText(root));
});

test('sessions stay with their exact receipt across scenario switches', async () => {
  const state = server();
  const { root, runtime } = mount();
  await showPreparedPreview(root, runtime);
  click(action(root, 'open'));
  await waitFor(() => assert.ok(root.querySelector('[data-preview-launch]')));
  await chooseScenario(root, 'Quiet');
  await waitFor(() => assert.ok(surface(root), sectionText(root)));
  assert.ok(sectionText(root).includes('Prepared receipt rcpt-empty-1'), sectionText(root));
  assert.ok(!root.querySelector('[data-preview-launch]'), 'nothing of Ready is shown for Quiet');
  assert.equal(key(requests(state, 'capabilities').at(-1).selection), key(quietPrepared));
  await chooseScenario(root, 'Ready');
  await waitFor(() => assert.ok(root.querySelector('[data-preview-launch]'), sectionText(root)));
  assert.equal(requests(state, 'open').length, 1, 'returning shows the same session without a new launch');
  runtime.destroy();
});

test('a new snapshot re-reads the shown session state in the background', async () => {
  const state = server();
  state.sessions = { 'preview-ready-1': sessionNamed('ready') };
  const { root, runtime } = mount();
  await showPreparedPreview(root, runtime);
  click(action(root, 'open'));
  await waitFor(() => assert.ok(root.querySelector('[data-preview-launch]')));
  state.sessions['preview-ready-1'] = { ...sessionNamed('unavailable') };
  await runtime.refresh();
  await waitFor(() => assert.equal(requests(state, 'session').length, 1));
  await waitFor(() => assert.ok(root.querySelector('[data-preview-state="unavailable"]'), sectionText(root)));
  assert.ok(!root.querySelector('[data-preview-launch]'), 'an ended session withdraws its link');
  assert.ok(sectionText(root).includes('This preview ended because the receipt, your access or the application runtime changed.'));
  assert.equal(requests(state, 'capabilities').length, 2, 'the capability is authorized again too');
  runtime.destroy();
});

test('a session stays closable when a later capability check no longer offers its view', async () => {
  let unavailable = false;
  const state = server({ capabilities: () => (unavailable ? jsonResponse(capabilityNamed('runtime_unavailable')) : undefined) });
  const { root, runtime } = mount();
  await showPreparedPreview(root, runtime);
  click(action(root, 'open'));
  await waitFor(() => assert.ok(root.querySelector('[data-preview-launch]')));
  unavailable = true;
  await runtime.refresh();
  await waitFor(() => assert.ok(root.querySelector('[data-preview-state="unsupported"]'), sectionText(root)));
  const opened = root.querySelector('[aria-label="Previews opened from this page"]');
  assert.ok(opened, 'the opened session is still listed');
  assert.ok(opened.querySelector('[data-preview-launch]'));
  assert.ok(opened.querySelector('[data-preview-action="close"]'));
  click(opened.querySelector('[data-preview-action="close"]'));
  await waitFor(() => assert.ok(root.querySelector('[data-preview-state="closed"]'), sectionText(root)));
  assert.equal(root.querySelector('[data-preview-action="new"]'), null, 'no new launch of a view the capability does not offer');
  assert.equal(requests(state, 'close').length, 1);
});

test('console denial drops preview state and cancels in-flight requests', async () => {
  const state = server({ open: () => ({ deferred: () => jsonResponse(sessionNamed('ready')) }) });
  const { root, runtime } = mount();
  await showPreparedPreview(root, runtime);
  click(action(root, 'open'));
  await waitFor(() => assert.equal(state.deferred.length, 1));
  state.snapshot = null;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'denied' } }), { status: 403, headers: { 'content-type': 'application/json' } });
  await runtime.refresh();
  await waitFor(() => assert.equal(runtime.getState(), 'denied'));
  assert.equal(state.deferred[0].request.signal.aborted, true, 'the in-flight open is aborted');
  assert.equal(root.querySelector('.console-preview'), null);
  runtime.destroy();
});

// ---------------------------------------------------------------------------
// Live binding: navigation away and back, deep links

const storedLaunches = () => {
  const key = Object.keys(win.sessionStorage).find((name) => name.startsWith('go-admin:data-preview:v1:'));
  return key ? JSON.parse(win.sessionStorage.getItem(key)) : [];
};

test('a session opened before navigating away is found again after returning, without a new launch', async () => {
  const state = server();
  state.sessions = { 'preview-ready-1': sessionNamed('ready') };
  let mounted = mount();
  await showPreparedPreview(mounted.root, mounted.runtime);
  click(action(mounted.root, 'open'));
  await waitFor(() => assert.ok(mounted.root.querySelector('[data-preview-launch]')));
  const [remembered] = storedLaunches();
  assert.equal(remembered.session_id, 'preview-ready-1');
  assert.equal(remembered.surface.id, 'synthetic-orders-report');
  assert.equal(remembered.launch_url, undefined, 'launch URLs are never remembered');
  mounted.runtime.destroy();

  // The operator followed the link and came back to Data in the same tab.
  mounted = mount({ keepStorage: true });
  await showPreparedPreview(mounted.root, mounted.runtime);
  await waitFor(() => assert.ok(mounted.root.querySelector('[data-preview-launch]'), sectionText(mounted.root)));
  assert.equal(requests(state, 'open').length, 1, 'no new launch');
  assert.deepEqual(requests(state, 'session').map((request) => request.sessionId), ['preview-ready-1'], 'shown only after the server answered for it');
});

test('a remembered session the server closed is shown closed, and one it no longer grants is forgotten', async () => {
  const state = server();
  state.sessions = { 'preview-ready-1': sessionNamed('ready') };
  let mounted = mount();
  await showPreparedPreview(mounted.root, mounted.runtime);
  click(action(mounted.root, 'open'));
  await waitFor(() => assert.ok(mounted.root.querySelector('[data-preview-launch]')));
  mounted.runtime.destroy();

  // Closed from the preview page's chrome before returning.
  state.sessions['preview-ready-1'] = sessionNamed('closed');
  mounted = mount({ keepStorage: true });
  await showPreparedPreview(mounted.root, mounted.runtime);
  await waitFor(() => assert.ok(mounted.root.querySelector('[data-preview-state="closed"]'), sectionText(mounted.root)));
  assert.ok(action(mounted.root, 'new'));
  mounted.runtime.destroy();

  // Gone (cleaned up or another actor's): forgotten without a message.
  server({ session: () => errorResponse(404, 'gone') });
  mounted = mount({ keepStorage: true });
  await showPreparedPreview(mounted.root, mounted.runtime);
  await waitFor(() => assert.equal(action(mounted.root, 'open')?.textContent.trim(), 'Start preview', sectionText(mounted.root)));
  assert.equal(mounted.root.querySelector('[data-preview-failure]'), null);
  assert.deepEqual(storedLaunches(), []);
});

test('a remembered launch without a definitive answer is replayed with its request ID', async () => {
  let attempt = 0;
  const state = server({ open: () => {
    attempt += 1;
    return attempt === 1 ? { reject: () => new TypeError('network down') } : undefined;
  } });
  let mounted = mount();
  await showPreparedPreview(mounted.root, mounted.runtime);
  click(action(mounted.root, 'open'));
  await waitFor(() => assert.ok(mounted.root.querySelector('[data-preview-failure="open:network"]')));
  assert.match(storedLaunches()[0].request_id, UUID);
  mounted.runtime.destroy();

  mounted = mount({ keepStorage: true });
  await showPreparedPreview(mounted.root, mounted.runtime);
  assert.equal(action(mounted.root, 'open').textContent.trim(), 'Try again');
  click(action(mounted.root, 'open'));
  await waitFor(() => assert.ok(mounted.root.querySelector('[data-preview-launch]'), sectionText(mounted.root)));
  const [first, second] = requests(state, 'open');
  assert.equal(second.body.request_id, first.body.request_id, 'the replay reattaches after navigation');
});

test('remembered launches belong to one console identity and are wiped on denial', async () => {
  server();
  const mounted = mount();
  await showPreparedPreview(mounted.root, mounted.runtime);
  click(action(mounted.root, 'open'));
  await waitFor(() => assert.ok(mounted.root.querySelector('[data-preview-launch]')));
  const [key] = Object.keys(win.sessionStorage).filter((name) => name.startsWith('go-admin:data-preview:v1:'));
  const { application_id: application, environment_id: environment, actor_id: actor, scope_key: scope } = golden.bootstrap;
  assert.equal(key, `go-admin:data-preview:v1:${[application, environment, actor, scope].join('\u0000')}`);
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'denied' } }), { status: 403, headers: { 'content-type': 'application/json' } });
  await mounted.runtime.refresh();
  await waitFor(() => assert.equal(mounted.runtime.getState(), 'denied'));
  assert.equal(win.sessionStorage.getItem(key), null);
});

test('a Data URL with an exact prepared selection opens its App preview and leaves the URL', async () => {
  const state = server();
  state.sessions = { 'preview-ready-1': sessionNamed('ready') };
  let mounted = mount();
  await showPreparedPreview(mounted.root, mounted.runtime);
  click(action(mounted.root, 'open'));
  await waitFor(() => assert.ok(mounted.root.querySelector('[data-preview-launch]')));
  mounted.runtime.destroy();

  // The chrome's Return link: /admin/data?selection=<exact selection>.
  win.history.replaceState(null, '', `/admin/data?selection=${encodeURIComponent(JSON.stringify(readyPrepared))}&tab=keep`);
  mounted = mount({ keepStorage: true });
  await waitFor(() => assert.equal(mounted.root.querySelector('.console-explorer__section')?.dataset.explorerSectionPanel, 'app-preview'));
  assert.equal(mounted.runtime.getActivePanel(), 'explore');
  assert.equal(mounted.root.querySelector('input[value="prepared"]').checked, true);
  await waitFor(() => assert.ok(mounted.root.querySelector('[data-preview-launch]'), sectionText(mounted.root)));
  assert.equal(win.location.search, '?tab=keep', 'the selection parameter is dropped, others kept');
  assert.equal(requests(state, 'open').length, 1);
  win.history.replaceState(null, '', '/admin/data');
});

test('a deep link to a receipt the snapshot no longer offers explains the change instead of repinning', async () => {
  server();
  const replaced = { ...readyPrepared, receipt_id: 'rcpt-ready-0', content_revision: 1 };
  win.history.replaceState(null, '', `/admin/data?selection=${encodeURIComponent(JSON.stringify(replaced))}`);
  const { root } = mount();
  await waitFor(() => assert.ok(root.querySelector('[data-explorer-state="stale"]'), textOf(explorerRoot(root))));
  assert.ok(sectionText(root).includes('It is now receipt rcpt-ready-1 (content revision 2).'), sectionText(root));
  assert.equal(root.querySelector('.console-preview'), null, 'nothing is previewed for a drifted pin');
  win.history.replaceState(null, '', '/admin/data');
});

// ---------------------------------------------------------------------------
// Review fixes (FX): unanswered launches, unreadable remembered sessions

test('an open still in flight when leaving the page is remembered and replays its request ID', async () => {
  let state = server({ open: () => ({ deferred: () => jsonResponse(sessionNamed('ready')) }) });
  let mounted = mount();
  await showPreparedPreview(mounted.root, mounted.runtime);
  click(action(mounted.root, 'open'));
  await waitFor(() => assert.equal(state.deferred.length, 1));
  const sent = requests(state, 'open')[0].body.request_id;
  assert.equal(storedLaunches()[0]?.request_id, sent, 'remembered before any answer');
  mounted.runtime.destroy();

  // The server may have created the session: back on Data, Try again reattaches.
  state = server();
  mounted = mount({ keepStorage: true });
  await showPreparedPreview(mounted.root, mounted.runtime);
  assert.equal(action(mounted.root, 'open').textContent.trim(), 'Try again');
  click(action(mounted.root, 'open'));
  await waitFor(() => assert.ok(mounted.root.querySelector('[data-preview-launch]'), sectionText(mounted.root)));
  assert.equal(requests(state, 'open')[0].body.request_id, sent);
});

test('a remembered session whose state cannot be read asks to check again before any new launch', async () => {
  let state = server();
  state.sessions = { 'preview-ready-1': sessionNamed('ready') };
  let mounted = mount();
  await showPreparedPreview(mounted.root, mounted.runtime);
  click(action(mounted.root, 'open'));
  await waitFor(() => assert.ok(mounted.root.querySelector('[data-preview-launch]')));
  mounted.runtime.destroy();

  let reads = 0;
  state = server({ session: () => {
    reads += 1;
    return reads === 1 ? errorResponse(503, 'CONSOLE_PROVIDER_FAILED') : undefined;
  } });
  state.sessions = { 'preview-ready-1': sessionNamed('ready') };
  mounted = mount({ keepStorage: true });
  await showPreparedPreview(mounted.root, mounted.runtime).catch(() => {});
  await waitFor(() => assert.ok(mounted.root.querySelector('[data-preview-state="unknown"]'), sectionText(mounted.root)));
  assert.equal(action(mounted.root, 'open'), null, 'no plain Start preview while the earlier session may be open');
  assert.ok(action(mounted.root, 'new'), 'a new preview stays an explicit choice');
  assert.equal(storedLaunches()[0].session_id, 'preview-ready-1', 'the locator is kept');
  click(action(mounted.root, 'check'));
  await waitFor(() => assert.ok(mounted.root.querySelector('[data-preview-launch]'), sectionText(mounted.root)));
  assert.equal(requests(state, 'open').length, 0, 'the earlier session is found, not replaced');
});

test('a new snapshot reads an unreadable remembered session again', async () => {
  let state = server();
  state.sessions = { 'preview-ready-1': sessionNamed('ready') };
  let mounted = mount();
  await showPreparedPreview(mounted.root, mounted.runtime);
  click(action(mounted.root, 'open'));
  await waitFor(() => assert.ok(mounted.root.querySelector('[data-preview-launch]')));
  mounted.runtime.destroy();

  let reads = 0;
  state = server({ session: () => {
    reads += 1;
    return reads === 1 ? { reject: () => new TypeError('offline') } : undefined;
  } });
  state.sessions = { 'preview-ready-1': sessionNamed('ready') };
  mounted = mount({ keepStorage: true });
  await showPreparedPreview(mounted.root, mounted.runtime).catch(() => {});
  await waitFor(() => assert.ok(mounted.root.querySelector('[data-preview-state="unknown"]'), sectionText(mounted.root)));
  await mounted.runtime.refresh();
  await waitFor(() => assert.ok(mounted.root.querySelector('[data-preview-launch]'), sectionText(mounted.root)));
  assert.equal(reads, 2);
});

test('a denial before the App preview module loaded still forgets remembered launches', async () => {
  server();
  const { application_id: application, environment_id: environment, actor_id: actor, scope_key: scope } = golden.bootstrap;
  const key = `go-admin:data-preview:v1:${[application, environment, actor, scope].join('\u0000')}`;
  win.sessionStorage.setItem(key, JSON.stringify([{ selection: readyPrepared, surface: { id: 'synthetic-orders-report', label: 'Synthetic orders report', kind: 'report' }, session_id: 'preview-ready-1', at: FIXED_NOW }]));
  const mounted = mount({ keepStorage: true });
  await waitFor(() => assert.equal(mounted.runtime.getState(), 'ready'));
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'denied' } }), { status: 403, headers: { 'content-type': 'application/json' } });
  await mounted.runtime.refresh();
  await waitFor(() => assert.equal(mounted.runtime.getState(), 'denied'));
  assert.equal(win.sessionStorage.getItem(key), null);
});

test('Refresh of the same selection lets a launch blocked by a stale answer start again', async () => {
  const answers = [errorResponse(409, 'stale_generation')];
  const state = server({ open: () => answers.shift() });
  const { root, runtime } = mount();
  await showPreparedPreview(root, runtime);
  click(action(root, 'open'));
  const failure = await waitFor(() => {
    const found = root.querySelector('[data-preview-failure="open:stale"]');
    assert.ok(found, sectionText(root));
    return found;
  });
  assert.equal(action(root, 'open'), null);
  const before = requests(state, 'capabilities').length;
  click(failure.querySelector('[data-explorer-action="refresh"]'));
  await waitFor(() => assert.equal(action(root, 'open')?.textContent.trim(), 'Start preview', sectionText(root)));
  assert.ok(requests(state, 'capabilities').length > before, 'the capability is read again');
  click(action(root, 'open'));
  await waitFor(() => assert.ok(root.querySelector('[data-preview-launch]'), sectionText(root)));
});
