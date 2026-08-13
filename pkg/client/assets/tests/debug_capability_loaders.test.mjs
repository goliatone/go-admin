import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.HTMLInputElement = dom.window.HTMLInputElement;
globalThis.HTMLSelectElement = dom.window.HTMLSelectElement;
globalThis.CustomEvent = dom.window.CustomEvent;
globalThis.Event = dom.window.Event;
globalThis.Node = dom.window.Node;
globalThis.MutationObserver = dom.window.MutationObserver;
globalThis.customElements = dom.window.customElements;
globalThis.localStorage = dom.window.localStorage;
globalThis.sessionStorage = dom.window.sessionStorage;
globalThis.fetch = async () => new Response('{}', {
  status: 200,
  headers: { 'content-type': 'application/json' },
});

const debug = await import('../dist/debug/index.js');
const toolbar = await import('../dist/debug/toolbar.js');

test('capability loaders are single-flight and retain a resolved module', async () => {
  let calls = 0;
  let resolveImport;
  const module = { DebugReplPanel: class {} };
  const loader = debug.createDebugReplLoader(() => {
    calls += 1;
    return new Promise((resolve) => { resolveImport = resolve; });
  });

  const first = loader.load();
  const second = loader.load();
  assert.equal(first, second);
  assert.equal(calls, 1);
  resolveImport(module);
  assert.equal(await first, module);
  assert.equal(await loader.load(), module);
  assert.equal(calls, 1);
});

test('failed capability loads reset so the next interaction retries', async () => {
  let calls = 0;
  const expected = { filterObjectBySearch: () => ({ matched: true }) };
  const load = debug.createJSONPathLoader(async () => {
    calls += 1;
    if (calls === 1) throw new Error('temporary chunk failure');
    return expected;
  });

  await assert.rejects(load(), /temporary chunk failure/);
  assert.equal(await load(), expected);
  assert.equal(calls, 2);
});

test('toolbar loader coalesces repeated expansion requests', async () => {
  let calls = 0;
  const expected = { DebugToolbar: class extends HTMLElement {} };
  const load = toolbar.createDebugToolbarLoader(async () => {
    calls += 1;
    return expected;
  });

  const [first, second] = await Promise.all([load(), load()]);
  assert.equal(first, expected);
  assert.equal(second, expected);
  assert.equal(calls, 1);
});

test('debug manager constructs one full toolbar only after expansion', async () => {
  document.body.innerHTML = '';
  localStorage.clear();
  const manager = new toolbar.DebugManager({
    debugPath: '/admin/debug',
    liveTransportEnabled: false,
    container: document.body,
  });
  manager.init();
  assert.equal(document.querySelectorAll('debug-fab').length, 1);
  assert.equal(document.querySelectorAll('debug-toolbar').length, 0);

  manager.expand();
  assert.equal(document.querySelector('debug-fab')?.shadowRoot?.querySelector('.fab')?.getAttribute('aria-busy'), 'true');
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(document.querySelectorAll('debug-toolbar').length, 1);
  assert.equal(document.querySelector('debug-fab')?.shadowRoot?.querySelector('.fab')?.getAttribute('aria-busy'), 'false');
  manager.collapse();
  manager.expand();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(document.querySelectorAll('debug-toolbar').length, 1);

  manager.destroy();
  assert.equal(document.querySelectorAll('debug-fab, debug-toolbar').length, 0);
});
