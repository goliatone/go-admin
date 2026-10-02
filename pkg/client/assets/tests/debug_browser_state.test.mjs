import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { identity, operationsPanel, operationRecord } from './fixtures/console-inputs.mjs';

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();
const testFileDir = path.dirname(fileURLToPath(import.meta.url));

const NAMESPACE_A = JSON.stringify({ console_id: 'debug', application_id: 'crm', environment_id: 'staging', actor_id: 'dev-1', scope_key: '["tenant-a",""]' });
const NAMESPACE_B = JSON.stringify({ console_id: 'debug', application_id: 'crm', environment_id: 'staging', actor_id: 'dev-2', scope_key: '["tenant-b",""]' });
const scopedKey = (namespace, key) => `go-admin:console:${namespace}:${key}`;

function setGlobals(win) {
  globalThis.window = win;
  globalThis.self = win;
  globalThis.document = win.document;
  Object.defineProperty(globalThis, 'navigator', { value: win.navigator, configurable: true, writable: true });
  for (const name of [
    'Element', 'HTMLElement', 'HTMLButtonElement', 'HTMLFormElement', 'HTMLInputElement', 'HTMLSelectElement',
    'HTMLTextAreaElement', 'HTMLScriptElement', 'DocumentFragment', 'CustomEvent', 'Event', 'KeyboardEvent', 'Node',
    'MutationObserver',
  ]) {
    globalThis[name] = win[name];
  }
  globalThis.customElements = win.customElements;
  for (const name of ['localStorage', 'sessionStorage']) {
    Object.defineProperty(globalThis, name, { value: win[name], configurable: true, writable: true });
  }
  globalThis.location = win.location;
}

class IdleSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static count = 0;

  constructor(url) {
    this.url = url;
    this.readyState = IdleSocket.CONNECTING;
    IdleSocket.count += 1;
  }

  send() {}

  close() {
    this.readyState = IdleSocket.CLOSED;
  }
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

let fetchCalls = 0;
function installFetch() {
  fetchCalls = 0;
  globalThis.fetch = async (input) => {
    fetchCalls += 1;
    const url = String(input);
    if (url.endsWith('/api/panels')) return jsonResponse({ panels: [] });
    if (url.endsWith('/api/snapshot')) return jsonResponse({ template: { ok: true }, config: { env: 'test' } });
    return jsonResponse({ sessions: [] });
  };
}

function debugMarkup(namespace) {
  return `
    <div class="debug-connection" data-debug-status="disconnected"><span data-debug-connection>disconnected</span></div>
    <nav data-debug-tabs></nav>
    <section data-debug-filters></section>
    <main data-debug-panel data-debug-console data-debug-path="/admin/debug"
      ${namespace === undefined ? '' : `data-preferences-namespace='${namespace}'`}
      data-panels='["template","config"]' data-repl-commands='[]'
      data-max-log-entries="25" data-max-sql-queries="25" data-slow-threshold-ms="50"></main>
    <span data-debug-events>0</span><span data-debug-last>--</span>
  `;
}

function createDebugDOM(namespace, body = '') {
  return new JSDOM(`<!doctype html><html><body data-debug-root>${body || debugMarkup(namespace)}</body></html>`, {
    url: 'https://admin.example.test/admin/debug',
  });
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 20));

async function waitFor(assertion, timeoutMs = 1000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await flush();
    }
  }
  throw lastError;
}

async function bundle(relativeSource) {
  const sourcePath = path.resolve(testFileDir, relativeSource);
  const stats = fs.statSync(sourcePath);
  const outputPath = path.join(
    os.tmpdir(),
    `go-admin-${path.basename(sourcePath, '.ts')}-${crypto.createHash('sha1').update(`${sourcePath}:${stats.mtimeMs}:${Date.now()}`).digest('hex')}.mjs`,
  );
  await build({ entryPoints: [sourcePath], outfile: outputPath, bundle: true, format: 'esm', platform: 'browser', target: ['es2020'], logLevel: 'silent' });
  return import(pathToFileURL(outputPath).href);
}

const bootstrapDOM = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://admin.example.test/admin' });
setGlobals(bootstrapDOM.window);
Object.defineProperty(globalThis.document, 'readyState', { value: 'loading', configurable: true });
globalThis.WebSocket = IdleSocket;
bootstrapDOM.window.WebSocket = IdleSocket;
installFetch();

const consoleModule = await import('../dist/console/index.js');
const debugModule = await import('../dist/debug/index.js');
const toolbarModule = await import('../dist/debug/toolbar.js');
bootstrapDOM.window.document.dispatchEvent(new bootstrapDOM.window.Event('DOMContentLoaded'));

function mountDebug(namespace, seed = () => {}) {
  const dom = createDebugDOM(namespace);
  seed(dom.window);
  setGlobals(dom.window);
  globalThis.WebSocket = IdleSocket;
  dom.window.WebSocket = IdleSocket;
  installFetch();
  const panel = debugModule.initDebugPanel(dom.window.document.querySelector('[data-debug-console]'));
  return { dom, panel };
}

function clickTab(dom, panel) {
  dom.window.document.querySelector(`[data-debug-tabs] [data-panel="${panel}"]`).click();
}

test('Debug console state is identity-scoped and never copies legacy keys into an identity', async () => {
  const { dom, panel } = mountDebug(NAMESPACE_A, (win) => {
    win.sessionStorage.setItem('debug-console-active-panel', 'config');
    win.localStorage.setItem('debug-console-panel-order', JSON.stringify(['config', 'template']));
  });
  await waitFor(() => assert.ok(dom.window.document.querySelector('[data-debug-tabs] .debug-tab--active')));
  assert.equal(dom.window.document.querySelector('[data-debug-tabs] .debug-tab--active').dataset.panel, 'template', 'legacy active panel is not adopted');
  assert.deepEqual(
    Array.from(dom.window.document.querySelectorAll('[data-debug-tabs] [data-panel]')).map((tab) => tab.dataset.panel).slice(0, 2),
    ['template', 'config'],
    'legacy panel order is not adopted',
  );
  clickTab(dom, 'config');
  assert.equal(dom.window.sessionStorage.getItem(scopedKey(NAMESPACE_A, 'debug-console-active-panel')), 'config');
  assert.equal(dom.window.sessionStorage.getItem('debug-console-active-panel'), 'config', 'legacy value is left untouched');
  panel.destroy();

  const second = mountDebug(NAMESPACE_B, (win) => {
    win.sessionStorage.setItem(scopedKey(NAMESPACE_A, 'debug-console-active-panel'), 'config');
  });
  await waitFor(() => assert.ok(second.dom.window.document.querySelector('[data-debug-tabs] .debug-tab--active')));
  assert.equal(
    second.dom.window.document.querySelector('[data-debug-tabs] .debug-tab--active').dataset.panel,
    'template',
    'another identity does not inherit the first identity or legacy state',
  );
  second.panel.destroy();
});

test('Unscoped Debug keeps its legacy browser keys', async () => {
  const { dom, panel } = mountDebug(undefined);
  await waitFor(() => assert.ok(dom.window.document.querySelector('[data-debug-tabs] [data-panel="config"]')));
  clickTab(dom, 'config');
  assert.equal(dom.window.sessionStorage.getItem('debug-console-active-panel'), 'config');
  assert.equal(Object.keys(dom.window.sessionStorage).filter((key) => key.startsWith('go-admin:console:')).length, 0);
  panel.destroy();
});

test('Debug survives blocked storage and releases its listeners on destroy', async () => {
  const dom = createDebugDOM(NAMESPACE_A);
  setGlobals(dom.window);
  const blocked = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
    removeItem() { throw new Error('blocked'); },
    key() { throw new Error('blocked'); },
    get length() { throw new Error('blocked'); },
  };
  for (const name of ['localStorage', 'sessionStorage']) {
    Object.defineProperty(globalThis, name, { value: blocked, configurable: true, writable: true });
  }
  globalThis.WebSocket = IdleSocket;
  installFetch();
  const panel = debugModule.initDebugPanel(dom.window.document.querySelector('[data-debug-console]'));
  await waitFor(() => assert.ok(dom.window.document.querySelector('[data-debug-tabs] [data-panel="config"]')));
  clickTab(dom, 'config');
  assert.equal(dom.window.document.querySelector('[data-debug-tabs] .debug-tab--active').dataset.panel, 'config');

  panel.destroy();
  const tabs = dom.window.document.querySelector('[data-debug-tabs]').innerHTML;
  clickTab(dom, 'template');
  await flush();
  assert.equal(dom.window.document.querySelector('[data-debug-tabs]').innerHTML, tabs, 'destroyed consoles ignore input');
});

test('Debug chrome lookups stay inside their own root', async () => {
  const dom = new JSDOM(`<!doctype html><html><body>
    <section data-debug-root id="first">${debugMarkup(NAMESPACE_A)}</section>
    <section data-debug-root id="second">${debugMarkup(NAMESPACE_B)}</section>
  </body></html>`, { url: 'https://admin.example.test/admin/debug' });
  setGlobals(dom.window);
  globalThis.WebSocket = IdleSocket;
  installFetch();
  const [firstEl, secondEl] = dom.window.document.querySelectorAll('[data-debug-console]');
  const first = new debugModule.DebugPanel(firstEl);
  const second = new debugModule.DebugPanel(secondEl);
  await waitFor(() => {
    assert.ok(dom.window.document.querySelector('#first [data-debug-tabs] [data-panel="config"]'));
    assert.ok(dom.window.document.querySelector('#second [data-debug-tabs] [data-panel="config"]'));
  });
  dom.window.document.querySelector('#second [data-debug-tabs] [data-panel="config"]').click();
  assert.equal(dom.window.document.querySelector('#first .debug-tab--active').dataset.panel, 'template');
  assert.equal(dom.window.document.querySelector('#second .debug-tab--active').dataset.panel, 'config');
  first.destroy();
  second.destroy();
});

test('Toolbar state follows the configured identity namespace', () => {
  setGlobals(bootstrapDOM.window);
  bootstrapDOM.window.localStorage.clear();
  bootstrapDOM.window.localStorage.setItem(scopedKey(NAMESPACE_A, 'debug-toolbar-expanded'), 'false');
  const manager = new toolbarModule.DebugManager({ debugPath: '/admin/debug', preferencesNamespace: NAMESPACE_A, container: bootstrapDOM.window.document.body });
  manager.init();
  const fab = bootstrapDOM.window.document.querySelector('debug-fab');
  assert.equal(fab.getAttribute('preferences-namespace'), NAMESPACE_A);
  manager.destroy();

  bootstrapDOM.window.DEBUG_CONFIG = { debugPath: '/admin/debug', preferencesNamespace: NAMESPACE_B };
  const fromConfig = toolbarModule.initDebugManager();
  assert.equal(bootstrapDOM.window.document.querySelector('debug-fab').getAttribute('preferences-namespace'), NAMESPACE_B);
  fromConfig.destroy();
  delete bootstrapDOM.window.DEBUG_CONFIG;
});

test('Command recall is stored under the Debug identity namespace', async () => {
  setGlobals(bootstrapDOM.window);
  bootstrapDOM.window.localStorage.clear();
  const stateModule = await bundle('../src/debug/shared/browser-state.ts');
  const launcher = await bundle('../src/debug/shared/panels/command-launcher.ts');
  launcher.configureCommandLauncherState(stateModule.createDebugBrowserState(NAMESPACE_A));
  launcher.recordCommandLauncherInvocation({ command_id: 'seed.dataset', payload: { dataset: 'baseline' } });
  const stored = JSON.parse(bootstrapDOM.window.localStorage.getItem(scopedKey(NAMESPACE_A, 'cmdl:recent:seed.dataset')));
  assert.deepEqual(stored.map((entry) => entry.payload), [{ dataset: 'baseline' }]);
  assert.equal(bootstrapDOM.window.localStorage.getItem('cmdl:recent:seed.dataset'), null);

  launcher.configureCommandLauncherState(stateModule.createDebugBrowserState(NAMESPACE_B));
  launcher.recordCommandLauncherInvocation({ command_id: 'seed.dataset', payload: { dataset: 'other' } });
  const other = JSON.parse(bootstrapDOM.window.localStorage.getItem(scopedKey(NAMESPACE_B, 'cmdl:recent:seed.dataset')));
  assert.deepEqual(other.map((entry) => entry.payload), [{ dataset: 'other' }], 'recall never crosses identities');
});

test('Dashboard widgets mount display-only panels, including roots inserted later, and dispose on removal', async () => {
  setGlobals(bootstrapDOM.window);
  installFetch();
  const sockets = IdleSocket.count;
  const payload = {
    ...identity,
    watermark: 21,
    panel: { ...operationsPanel, records: [operationRecord()] },
  };
  const root = bootstrapDOM.window.document.createElement('div');
  root.className = 'console-root console-root--widget';
  root.setAttribute('data-console-root', '');
  root.setAttribute('data-console-display', '');
  root.innerHTML = `<script type="application/json" data-console-widget>${JSON.stringify(payload).replace(/</g, '\\u003c')}</script><section class="console-panel" data-console-panel><p>SSR summary</p></section>`;
  bootstrapDOM.window.document.body.appendChild(root);
  await waitFor(() => assert.ok(consoleModule.getMountedConsole(root), 'late roots are mounted'));
  const runtime = consoleModule.getMountedConsole(root);
  await waitFor(() => assert.equal(runtime.getState(), 'ready'));
  assert.match(root.querySelector('[data-console-panel]').textContent, /Seed <baseline>/);
  assert.equal(root.querySelector('form, [data-panel-action]'), null, 'widgets never render actions');
  assert.equal(root.querySelector('[data-console-tabs]').hidden, true);
  assert.equal(fetchCalls, 0, 'display widgets do not fetch');
  assert.equal(IdleSocket.count, sockets, 'display widgets do not open live streams');

  root.remove();
  await waitFor(() => assert.equal(consoleModule.getMountedConsole(root), null, 'removed roots are disposed'));
  assert.equal(root.dataset.consoleState, 'disposed');
});
