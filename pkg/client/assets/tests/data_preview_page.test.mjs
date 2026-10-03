import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The application preview page script (`console/data-preview-page`) on the
// page the Data module renders around a host view: the Go-generated
// data-preview-page.html fixture (admin.RenderDataPreviewPage).

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();
const here = path.dirname(fileURLToPath(import.meta.url));
const pageHTML = fs.readFileSync(path.join(here, 'fixtures/data-preview-page.html'), 'utf8');
const contract = JSON.parse(fs.readFileSync(path.join(here, 'fixtures/data-preview-contract.json'), 'utf8'));

const dom = new JSDOM('<!doctype html><html><head><meta name="csrf-token" content="csrf-1"></head><body></body></html>', {
  url: 'https://admin.example.test/admin/data/preview/preview-ready-1/surfaces/synthetic-orders-report',
  pretendToBeVisual: true,
});
const win = dom.window;
for (const name of ['window', 'document', 'Node', 'Element', 'HTMLElement', 'HTMLButtonElement', 'Event', 'MouseEvent', 'DOMParser']) {
  globalThis[name] = name === 'window' ? win : name === 'document' ? win.document : win[name];
}
globalThis.location = win.location;

// Imported before any page root exists, so the module's own start mounts nothing.
const { mountPreviewPage, readPreviewPageConfig } = await import('../dist/console/data-preview-page.js');

const NOW = Date.parse('2026-10-03T12:00:00Z');
const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const closedSession = () => {
  const session = structuredClone(contract.sessions.find((item) => item.name === 'closed').response);
  return session;
};

const mounted = [];
afterEach(() => {
  mounted.splice(0).forEach((page) => page?.dispose());
});

/** A fresh page root from the fixture, attached to the test document. */
function pageRoot(mutate) {
  const parsed = new win.DOMParser().parseFromString(pageHTML, 'text/html');
  const root = parsed.querySelector('[data-preview-page]');
  mutate?.(root);
  win.document.body.innerHTML = '';
  const adopted = win.document.importNode(root, true);
  win.document.body.appendChild(adopted);
  return adopted;
}

function mount(root, options = {}) {
  const navigations = [];
  const page = mountPreviewPage(root, { now: () => NOW, navigate: (url) => navigations.push(url), ...options });
  mounted.push(page);
  return { page, navigations };
}

function server(answer) {
  const requests = [];
  globalThis.fetch = async (input, init = {}) => {
    const request = { url: new URL(String(input), 'https://admin.example.test'), method: String(init.method || 'GET').toUpperCase(), headers: new Headers(init.headers || {}), body: init.body };
    requests.push(request);
    return answer(request);
  };
  return requests;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 10));

test('the page reads its exact session, selection and routes from the server render', () => {
  const root = pageRoot();
  const config = readPreviewPageConfig(root, NOW);
  assert.equal(config.sessionId, 'preview-ready-1');
  assert.equal(config.surfaceId, 'synthetic-orders-report');
  assert.equal(config.selection.receipt_id, 'rcpt-ready-1');
  assert.equal(config.closeURL, '/admin/data/api/preview/sessions/preview-ready-1/close');
  assert.ok(config.returnURL.startsWith('/admin/data?selection='));
  assert.equal(config.skew, 0);
  assert.equal(readPreviewPageConfig(pageRoot((node) => node.setAttribute('data-preview-selection', '{}')), NOW), null);
  assert.equal(readPreviewPageConfig(pageRoot((node) => node.setAttribute('data-preview-close-url', '//evil.test/close')), NOW), null);
});

test('mounting reveals Close and shows the remaining time on the server clock', () => {
  const root = pageRoot();
  assert.equal(root.querySelector('[data-preview-close]').hidden, true, 'Close needs the script');
  mount(root);
  assert.equal(root.querySelector('[data-preview-close]').hidden, false);
  assert.equal(root.querySelector('[data-preview-remaining]').textContent, '(in 15 minutes)');
  assert.notEqual(root.querySelector('[data-preview-expiry]').textContent, '12:15 UTC', 'the expiry shows in local time');

  // This browser's clock runs an hour ahead; the page's server time corrects it.
  const ahead = pageRoot();
  const page = mountPreviewPage(ahead, { now: () => NOW + 60 * 60 * 1000, navigate: () => {} });
  mounted.push(page);
  assert.equal(ahead.querySelector('[data-preview-remaining]').textContent, '(in 15 minutes)');
});

test('Close posts the session close with CSRF, then returns to the exact Data details', async () => {
  const requests = server(() => jsonResponse(closedSession()));
  const root = pageRoot();
  const { navigations } = mount(root);
  root.querySelector('[data-preview-close]').dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));
  await settle();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, 'POST');
  assert.equal(requests[0].url.pathname, '/admin/data/api/preview/sessions/preview-ready-1/close');
  assert.equal(requests[0].headers.get('X-CSRF-Token'), 'csrf-1');
  assert.deepEqual(JSON.parse(requests[0].body), {});
  assert.deepEqual(navigations, [root.dataset.previewReturnUrl]);
  assert.equal(root.querySelector('[data-preview-status]').textContent, 'Preview closed. Returning to Data…');
});

test('a transient close failure keeps the page and lets the operator try again', async () => {
  let attempt = 0;
  const requests = server(() => {
    attempt += 1;
    return attempt === 1 ? jsonResponse({ error: { text_code: 'CONSOLE_PROVIDER_FAILED' } }, 503) : jsonResponse(closedSession());
  });
  const root = pageRoot();
  const { navigations } = mount(root);
  const close = root.querySelector('[data-preview-close]');
  close.click();
  await settle();
  assert.equal(root.querySelector('[data-preview-status]').textContent, 'Closing the preview failed. Try again.');
  assert.equal(close.getAttribute('aria-busy'), null);
  assert.equal(close.textContent, 'Close preview');
  assert.deepEqual(navigations, []);
  close.click();
  await settle();
  assert.equal(requests.length, 2);
  assert.equal(navigations.length, 1);
});

test('a close answer that means the session already ended returns to Data', async () => {
  server(() => jsonResponse({ error: { text_code: 'gone' } }, 404));
  const root = pageRoot();
  const { navigations } = mount(root);
  root.querySelector('[data-preview-close]').click();
  await settle();
  assert.equal(root.querySelector('[data-preview-status]').textContent, 'This preview has already ended. Returning to Data…');
  assert.equal(navigations.length, 1);
});

test('a busy Close is not sent twice', async () => {
  let release;
  const requests = server(() => new Promise((resolve) => { release = () => resolve(jsonResponse(closedSession())); }));
  const root = pageRoot();
  mount(root);
  const close = root.querySelector('[data-preview-close]');
  close.click();
  close.click();
  await settle();
  assert.equal(requests.length, 1);
  assert.equal(close.getAttribute('aria-busy'), 'true');
  release();
  await settle();
});

test('an incomplete page is not enhanced', () => {
  const root = pageRoot((node) => node.removeAttribute('data-preview-session'));
  assert.equal(mountPreviewPage(root, { now: () => NOW }), null);
  assert.equal(root.querySelector('[data-preview-close]').hidden, true);
});
