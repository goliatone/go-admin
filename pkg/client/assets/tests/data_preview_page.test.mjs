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

// ---------------------------------------------------------------------------
// Session state while the page is open

const readySession = () => structuredClone(contract.sessions.find((item) => item.name === 'ready').response);
const named = (name) => structuredClone(contract.sessions.find((item) => item.name === name).response);

test('a session the server reports ended removes the view and leaves only a way back', async () => {
  for (const [answer, reason, message] of [
    [() => jsonResponse(named('closed')), 'closed', 'This preview was closed.'],
    [() => jsonResponse(named('expired')), 'expired', 'This preview expired.'],
    [() => jsonResponse(named('unavailable')), 'unavailable', 'This preview ended because'],
    [() => jsonResponse({ error: { text_code: 'gone' } }, 404), 'unavailable', 'This preview ended because'],
    [() => jsonResponse({ error: { text_code: 'FORBIDDEN' } }, 403), 'unavailable', 'This preview ended because'],
    [() => jsonResponse({ error: { text_code: 'UNAUTHORIZED' } }, 401), 'signed-out', 'Your session expired.'],
  ]) {
    const requests = server(answer);
    const root = pageRoot();
    const { page } = mount(root);
    assert.ok(root.querySelector('[data-orders-report]'));
    await page.check(true);
    assert.equal(requests.at(-1).url.pathname, '/admin/data/api/preview/sessions/preview-ready-1');
    assert.equal(requests.at(-1).method, 'GET');
    assert.equal(page.endedBy(), reason);
    assert.equal(root.querySelector('[data-orders-report]'), null, `${reason}: the view is removed`);
    const notice = root.querySelector('[data-preview-ended]');
    assert.ok(notice.textContent.includes(message), notice.textContent);
    assert.equal(notice.querySelector('a').getAttribute('href'), root.dataset.previewReturnUrl);
    assert.equal(root.querySelector('[data-preview-close]').hidden, true);
    assert.equal(root.querySelector('.data-preview__views').hidden, true);
    page.dispose();
  }
});

test('a ready answer or a transient failure keeps the view', async () => {
  for (const answer of [() => jsonResponse(readySession()), () => jsonResponse({ error: {} }, 503), () => { throw new TypeError('offline'); }]) {
    server(answer);
    const root = pageRoot();
    const { page } = mount(root);
    await page.check(true);
    assert.equal(page.endedBy(), null);
    assert.ok(root.querySelector('[data-orders-report]'));
    page.dispose();
  }
});

test('at expiry the view goes at once and the state read confirms it', async () => {
  const requests = server(() => jsonResponse(named('expired')));
  const root = pageRoot((node) => node.setAttribute('data-preview-expires', node.dataset.previewServerNow));
  const { page } = mount(root);
  await new Promise((resolve) => setTimeout(resolve, 120));
  assert.equal(page.endedBy(), 'expired');
  assert.equal(root.querySelector('[data-orders-report]'), null);
  assert.equal(root.querySelector('[data-preview-remaining]').textContent, '(expired)');
  assert.equal(requests.length, 1, 'one confirming state read');
});

test('state reads are bounded: a shown tab reads at most once per gap', async () => {
  const requests = server(() => jsonResponse(readySession()));
  let clock = NOW;
  const root = pageRoot();
  const page = mountPreviewPage(root, { now: () => clock, navigate: () => {} });
  mounted.push(page);
  const visible = () => win.document.dispatchEvent(new win.Event('visibilitychange'));
  visible();
  visible();
  await settle();
  assert.equal(requests.length, 1);
  clock += 6000;
  visible();
  await settle();
  assert.equal(requests.length, 2);
  page.dispose();
  clock += 6000;
  visible();
  await settle();
  assert.equal(requests.length, 2, 'a disposed page reads nothing');
});

test('at expiry focus stays on the notice through the confirming read, announced once', async () => {
  let answer;
  server(() => new Promise((resolve) => { answer = () => resolve(jsonResponse(named('closed'))); }));
  const root = pageRoot((node) => node.setAttribute('data-preview-expires', node.dataset.previewServerNow));
  root.querySelector('[data-preview-main]').focus();
  const { page } = mount(root);
  await new Promise((resolve) => setTimeout(resolve, 120));
  const notice = root.querySelector('[data-preview-ended]');
  assert.equal(notice.dataset.previewEnded, 'expired');
  assert.equal(win.document.activeElement, notice, 'focus moves from the removed view to the notice');
  answer();
  await settle();
  assert.equal(page.endedBy(), 'closed', 'the confirming read refines the reason');
  assert.equal(root.querySelectorAll('[data-preview-ended]').length, 1);
  assert.equal(root.querySelector('[data-preview-ended]'), notice, 'the notice is updated in place');
  assert.ok(notice.textContent.includes('This preview was closed.'));
  assert.equal(win.document.activeElement, notice, 'focus stays on the notice');
});

test('a session that ends while Close has focus moves focus to the notice', async () => {
  server(() => jsonResponse(named('unavailable')));
  const root = pageRoot();
  const { page } = mount(root);
  root.querySelector('[data-preview-close]').focus();
  await page.check(true);
  assert.equal(root.querySelector('[data-preview-close]').hidden, true);
  assert.equal(win.document.activeElement, root.querySelector('[data-preview-ended]'));
});

test('a session that ends while Return has focus keeps it there', async () => {
  server(() => jsonResponse(named('closed')));
  const root = pageRoot();
  const { page } = mount(root);
  const back = root.querySelector('[data-preview-return]');
  back.focus();
  await page.check(true);
  assert.equal(win.document.activeElement, back);
});
