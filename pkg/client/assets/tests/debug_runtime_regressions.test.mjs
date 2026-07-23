import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();

const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const syntaxHighlightSourcePath = path.resolve(testFileDir, '../src/debug/syntax-highlight.ts');
const debugPanelSourcePath = path.resolve(testFileDir, '../src/debug/debug-panel.ts');
const debugReplPanelSourcePath = path.resolve(testFileDir, '../src/debug/repl/repl-panel.ts');
const debugConsoleStylesPath = path.resolve(testFileDir, '../src/styles/debug/console.css');

function setGlobals(win) {
  globalThis.window = win;
  globalThis.self = win;
  globalThis.document = win.document;
  Object.defineProperty(globalThis, 'navigator', {
    value: win.navigator,
    configurable: true,
    writable: true,
  });
  globalThis.Element = win.Element;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.HTMLButtonElement = win.HTMLButtonElement;
  globalThis.HTMLFormElement = win.HTMLFormElement;
  globalThis.HTMLInputElement = win.HTMLInputElement;
  globalThis.HTMLSelectElement = win.HTMLSelectElement;
  globalThis.HTMLTextAreaElement = win.HTMLTextAreaElement;
  globalThis.DocumentFragment = win.DocumentFragment;
  globalThis.CustomEvent = win.CustomEvent;
  globalThis.Event = win.Event;
  globalThis.Node = win.Node;
  globalThis.MutationObserver = win.MutationObserver;
  globalThis.customElements = win.customElements;
  Object.defineProperty(globalThis, 'localStorage', {
    value: win.localStorage,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: win.sessionStorage,
    configurable: true,
    writable: true,
  });
  globalThis.location = win.location;
  globalThis.Headers = globalThis.Headers || win.Headers;
  globalThis.Response = globalThis.Response || win.Response;
}

function installDOMFormgenRuntime() {
  const readValues = (root) => {
    const values = {};
    root.querySelectorAll('[name]').forEach((input) => {
      const segments = input.name.split('.').filter(Boolean);
      if (segments.length === 0) return;
      let target = values;
      segments.forEach((segment, index) => {
        if (index === segments.length - 1) {
          target[segment] = input.value;
          return;
        }
        target[segment] ||= {};
        target = target[segment];
      });
    });
    return values;
  };
  globalThis.FormgenRelationships = {
    async initFormgenRoot() { return { destroy() {} }; },
    Formgen: {
      attach(root) {
        return {
          getValues: () => readValues(root),
          setValues() {},
          setErrors() {},
          clearErrors() {},
          onChange() { return () => {}; },
          focus() { return true; },
          destroy() {},
        };
      },
    },
  };
}

function createDebugDOM() {
  return new JSDOM(`
    <!doctype html>
    <html>
      <body>
        <div class="debug-connection" data-debug-status="disconnected">
          <span data-debug-connection>disconnected</span>
        </div>
        <nav data-debug-tabs></nav>
        <section data-debug-filters></section>
        <main
          data-debug-panel
          data-debug-console
          data-debug-path="/admin/debug"
          data-panels='["template","sql","config"]'
          data-repl-commands='[]'
          data-max-log-entries="25"
          data-max-sql-queries="25"
          data-slow-threshold-ms="50"
        ></main>
        <span data-debug-events>0</span>
        <span data-debug-last>--</span>
      </body>
    </html>
  `, { url: 'http://127.0.0.1:9090/admin/debug' });
}

function createSiteRenderCacheDebugDOM() {
  return new JSDOM(`
    <!doctype html>
    <html>
      <body>
        <div class="debug-connection" data-debug-status="disconnected">
          <span data-debug-connection>disconnected</span>
        </div>
        <nav data-debug-tabs></nav>
        <section data-debug-filters></section>
        <main
          data-debug-panel
          data-debug-console
          data-debug-path="/admin/debug"
          data-panels='["site-render-cache"]'
          data-repl-commands='[]'
          data-max-log-entries="25"
          data-max-sql-queries="25"
          data-slow-threshold-ms="50"
        ></main>
        <span data-debug-events>0</span>
        <span data-debug-last>--</span>
      </body>
    </html>
  `, { url: 'http://127.0.0.1:9090/admin/debug' });
}

function flushMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function waitForAssertion(assertion, timeoutMs = 1000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await flushMicrotasks();
    }
  }
  if (lastError) {
    throw lastError;
  }
  assertion();
}

function debugTabOrder(doc) {
  return Array.from(doc.querySelectorAll('[data-debug-tabs] [data-panel]')).map((tab) => tab.dataset.panel);
}

const bootstrapDOM = createDebugDOM();
setGlobals(bootstrapDOM.window);
Object.defineProperty(globalThis.document, 'readyState', { value: 'loading', configurable: true });

class OpenWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url) {
    this.url = url;
    this.readyState = OpenWebSocket.CONNECTING;
    queueMicrotask(() => {
      this.readyState = OpenWebSocket.OPEN;
      this.onopen?.();
    });
  }

  send() {}

  close() {
    this.readyState = OpenWebSocket.CLOSED;
    this.onclose?.(new window.Event('close'));
  }
}

globalThis.WebSocket = OpenWebSocket;
bootstrapDOM.window.WebSocket = OpenWebSocket;
globalThis.fetch = async (input) => {
  if (String(input).endsWith('/api/snapshot')) {
    return new Response(JSON.stringify({
      template: { request_id: 'req-1', debug: true },
      sql: [{ query: 'select * from pages where id = 1', duration: '12ms', timestamp: '2026-04-07T19:00:00Z' }],
      config: { env: 'test' },
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (String(input).endsWith('/api/sessions')) {
    return new Response(JSON.stringify({ sessions: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
  return new Response('{}', {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};

const debugModule = await import('../dist/debug/index.js');
await import('../dist/debug/toolbar.js');

test('debug bundle initializes without throwing in a browser-like environment', async () => {
  const dom = createDebugDOM();
  setGlobals(dom.window);
  globalThis.WebSocket = OpenWebSocket;
  dom.window.WebSocket = OpenWebSocket;
  globalThis.fetch = async (input) => {
    if (String(input).endsWith('/api/snapshot')) {
      return new Response(JSON.stringify({
        template: { request_id: 'req-2', debug: true },
        sql: [],
        config: { env: 'test' },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ sessions: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const panel = debugModule.initDebugPanel(dom.window.document.querySelector('[data-debug-console]'));
  await flushMicrotasks();

  assert.ok(panel, 'expected debug panel to initialize');
  assert.match(
    dom.window.document.querySelector('[data-debug-tabs]').innerHTML,
    /Template|SQL|Config/i,
  );
  assert.match(
    dom.window.document.querySelector('[data-debug-panel]').innerHTML,
    /request_id|No template data available/i,
  );
});

test('debug icon lookup covers registered panels and repl panels', () => {
  assert.equal(debugModule.getPanelIcon('doctor'), 'iconoir-heart');
  assert.equal(debugModule.getPanelIcon('permissions'), 'iconoir-shield-check');
  assert.equal(debugModule.getPanelIcon('site-render-cache'), 'iconoir-database');
  assert.equal(debugModule.getPanelIcon('shell'), 'iconoir:terminal');
  assert.equal(debugModule.getPanelIcon('console'), 'iconoir:code');
});

test('debug console tabs render shared panel icons for built-in and repl panels', async () => {
  const dom = createDebugDOM();
  setGlobals(dom.window);
  globalThis.WebSocket = OpenWebSocket;
  dom.window.WebSocket = OpenWebSocket;
  const consoleEl = dom.window.document.querySelector('[data-debug-console]');
  consoleEl.dataset.panels = JSON.stringify(['doctor', 'permissions', 'site-render-cache', 'shell', 'console']);
  globalThis.fetch = async (input) => {
    if (String(input).endsWith('/api/panels')) {
      return new Response(JSON.stringify({ panels: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (String(input).endsWith('/api/snapshot')) {
      return new Response(JSON.stringify({
        doctor: { verdict: 'ok', summary: { checks: 1, ok: 1, info: 0, warn: 0, error: 0 }, checks: [] },
        permissions: { verdict: 'healthy', summary: { module_count: 0, required_keys: 0, claims_keys: 0, missing_keys: 0 }, entries: [] },
        'site-render-cache': { configured: true, active: true, status: 'healthy', observed_keys: [], recent_operations: [], recent_errors: [] },
        repl_commands: [],
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ sessions: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  debugModule.initDebugPanel(consoleEl);
  await flushMicrotasks();

  const tabs = dom.window.document.querySelector('[data-debug-tabs]');
  assert.ok(tabs.querySelector('[data-panel="doctor"] .debug-icon .iconoir-heart'));
  assert.ok(tabs.querySelector('[data-panel="permissions"] .debug-icon .iconoir-shield-check'));
  assert.ok(tabs.querySelector('[data-panel="site-render-cache"] .debug-icon .iconoir-database'));
  assert.ok(tabs.querySelector('[data-panel="shell"] .debug-icon .iconoir-terminal'));
  assert.ok(tabs.querySelector('[data-panel="console"] .debug-icon .iconoir-code'));
});

test('debug Doctor and Permissions rich panels render icon markup without reviewed raw glyphs', () => {
  const doctorHTML = debugModule.renderDoctorPanel({
    verdict: 'warn',
    summary: { checks: 2, ok: 1, info: 0, warn: 1, error: 0 },
    checks: [{
      id: 'cache',
      label: 'Cache',
      status: 'warn',
      findings: [{
        severity: 'warn',
        message: 'Cache is local only',
        hint: 'Use a shared cache backend',
      }],
    }],
    next_actions: ['Configure Redis'],
  }, debugModule.consoleStyles, { showRawJSON: false });

  assert.match(doctorHTML, /class="[^"]*iconoir-warning-triangle/);
  assert.match(doctorHTML, /class="[^"]*iconoir-light-bulb/);
  assert.match(doctorHTML, /class="[^"]*iconoir-list/);
  assert.doesNotMatch(doctorHTML, /[✓✗⚠ℹ💡📋]/u);

  const permissionsHTML = debugModule.renderPermissionsPanel({
    verdict: 'missing_grants',
    summary: { module_count: 1, required_keys: 1, claims_keys: 0, missing_keys: 1 },
    entries: [{
      permission: 'posts.edit',
      module: 'posts',
      required: true,
      in_claims: false,
      allows: false,
      status: 'error',
      diagnosis: 'Missing grant',
    }],
  }, debugModule.consoleStyles, { showRawJSON: false });

  assert.match(permissionsHTML, /class="[^"]*iconoir-xmark/);
  assert.match(permissionsHTML, /class="[^"]*iconoir-check/);
  assert.doesNotMatch(permissionsHTML, /[✓✗⚠]/u);
  assert.doesNotMatch(permissionsHTML, />\s*\?\s*</);
});

test('debug REPL overlay terminal icon uses stylesheet-controlled sizing', () => {
  const replSource = fs.readFileSync(debugReplPanelSourcePath, 'utf8');
  const styleText = fs.readFileSync(debugConsoleStylesPath, 'utf8');

  assert.match(replSource, /size:\s*'var\(--debug-repl-overlay-icon-size,\s*48px\)'/);
  assert.doesNotMatch(replSource, /replOverlayIcon[\s\S]*size:\s*'20px'/);
  assert.match(styleText, /\.debug-repl__overlay-icon\s*\{[\s\S]*--debug-repl-overlay-icon-size:\s*48px;/);
});

test('debug panel restores a valid active panel from same-tab storage after hydration', async () => {
  const dom = createDebugDOM();
  setGlobals(dom.window);
  globalThis.WebSocket = OpenWebSocket;
  dom.window.WebSocket = OpenWebSocket;
  dom.window.sessionStorage.setItem('debug-console-active-panel', ' sql ');
  globalThis.fetch = async (input) => {
    if (String(input).endsWith('/api/panels')) {
      return new Response(JSON.stringify({ panels: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (String(input).endsWith('/api/snapshot')) {
      return new Response(JSON.stringify({
        template: { request_id: 'req-3' },
        sql: [{ query: 'select 1', duration: '1ms' }],
        config: {},
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ sessions: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  debugModule.initDebugPanel(dom.window.document.querySelector('[data-debug-console]'));
  await flushMicrotasks();

  assert.equal(
    dom.window.document.querySelector('[data-debug-tabs] .debug-tab--active')?.dataset.panel,
    'sql',
  );
});

test('debug panel ignores stale stored active panels and tolerates storage failures', async () => {
  const dom = createDebugDOM();
  setGlobals(dom.window);
  globalThis.WebSocket = OpenWebSocket;
  dom.window.WebSocket = OpenWebSocket;
  dom.window.sessionStorage.setItem('debug-console-active-panel', 'missing-panel');
  globalThis.fetch = async (input) => {
    if (String(input).endsWith('/api/panels')) {
      return new Response(JSON.stringify({ panels: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (String(input).endsWith('/api/snapshot')) {
      return new Response(JSON.stringify({ template: {}, sql: [], config: {} }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ sessions: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  debugModule.initDebugPanel(dom.window.document.querySelector('[data-debug-console]'));
  await flushMicrotasks();

  assert.equal(
    dom.window.document.querySelector('[data-debug-tabs] .debug-tab--active')?.dataset.panel,
    'template',
  );

  Object.defineProperty(globalThis, 'sessionStorage', {
    value: {
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('blocked');
      },
    },
    configurable: true,
  });

  const sqlTab = dom.window.document.querySelector('[data-debug-tabs] [data-panel="sql"]');
  assert.ok(sqlTab, 'expected SQL tab to render');
  sqlTab.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

  assert.equal(
    dom.window.document.querySelector('[data-debug-tabs] .debug-tab--active')?.dataset.panel,
    'sql',
  );
});

test('debug panel restores local tab order while ignoring malformed duplicate and unknown panel ids', async () => {
  const dom = createDebugDOM();
  setGlobals(dom.window);
  globalThis.WebSocket = OpenWebSocket;
  dom.window.WebSocket = OpenWebSocket;
  dom.window.localStorage.setItem('debug-console-panel-order', JSON.stringify([
    ' sql ',
    '',
    'sql',
    'missing-panel',
    'template',
    'bad panel',
    7,
    'config',
  ]));
  globalThis.fetch = async (input) => {
    if (String(input).endsWith('/api/panels')) {
      return new Response(JSON.stringify({ panels: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (String(input).endsWith('/api/snapshot')) {
      return new Response(JSON.stringify({ template: {}, sql: [], config: {} }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ sessions: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  debugModule.initDebugPanel(dom.window.document.querySelector('[data-debug-console]'));
  await flushMicrotasks();

  assert.deepEqual(debugTabOrder(dom.window.document), ['sql', 'template', 'config', 'sessions']);
});

test('debug panel falls back to configured tab order when local panel order storage is malformed', async () => {
  const dom = createDebugDOM();
  setGlobals(dom.window);
  globalThis.WebSocket = OpenWebSocket;
  dom.window.WebSocket = OpenWebSocket;
  dom.window.localStorage.setItem('debug-console-panel-order', '{not-json');
  globalThis.fetch = async (input) => {
    if (String(input).endsWith('/api/panels')) {
      return new Response(JSON.stringify({ panels: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (String(input).endsWith('/api/snapshot')) {
      return new Response(JSON.stringify({ template: {}, sql: [], config: {} }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ sessions: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  debugModule.initDebugPanel(dom.window.document.querySelector('[data-debug-console]'));
  await flushMicrotasks();

  assert.deepEqual(debugTabOrder(dom.window.document), ['template', 'sql', 'config', 'sessions']);
});

test('debug panel preserves saved position for asynchronously discovered server panels', async () => {
  const dom = createDebugDOM();
  setGlobals(dom.window);
  globalThis.WebSocket = OpenWebSocket;
  dom.window.WebSocket = OpenWebSocket;
  const consoleEl = dom.window.document.querySelector('[data-debug-console]');
  consoleEl.dataset.debugPath = '/admin/debug-dynamic-order';
  dom.window.localStorage.setItem('debug-console-panel-order', JSON.stringify(['sql', 'async-panel', 'template']));
  globalThis.fetch = async (input) => {
    if (String(input).endsWith('/api/panels')) {
      return new Response(JSON.stringify({
        panels: [{
          id: 'async-panel',
          label: 'Async Panel',
          snapshot_key: 'async-panel',
          ui: {
            views: {
              console: { renderer: 'json', title: 'Async Panel' },
            },
          },
        }],
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (String(input).endsWith('/api/snapshot')) {
      return new Response(JSON.stringify({ template: {}, sql: [], config: {}, 'async-panel': { ok: true } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ sessions: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  debugModule.initDebugPanel(consoleEl);
  await flushMicrotasks();

  assert.deepEqual(debugTabOrder(dom.window.document), ['sql', 'async-panel', 'template', 'config', 'sessions']);
});

test('debug console renders server-declared Scope panel with bundled iconoir icon', async () => {
  const dom = createDebugDOM();
  setGlobals(dom.window);
  globalThis.WebSocket = OpenWebSocket;
  dom.window.WebSocket = OpenWebSocket;
  const consoleEl = dom.window.document.querySelector('[data-debug-console]');
  consoleEl.dataset.debugPath = '/admin/debug-scope-icon';
  consoleEl.dataset.panels = JSON.stringify(['scope']);
  globalThis.fetch = async (input) => {
    if (String(input).endsWith('/api/panels')) {
      return new Response(JSON.stringify({
        panels: [{
          id: 'scope',
          label: 'Scope',
          icon: 'iconoir-gps',
          snapshot_key: 'scope',
          ui: {
            views: {
              console: { renderer: 'json', title: 'Scope' },
            },
          },
        }],
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (String(input).endsWith('/api/snapshot')) {
      return new Response(JSON.stringify({
        scope: { count: 0, entries: [] },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ sessions: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  debugModule.initDebugPanel(consoleEl);

  await waitForAssertion(() => {
    const tabs = dom.window.document.querySelector('[data-debug-tabs]');
    assert.ok(
      tabs.querySelector('[data-panel="scope"] .debug-icon .iconoir-gps'),
      tabs.innerHTML,
    );
  });
});

test('debug panel prefers found server panel order over local panel order', async () => {
  const dom = createDebugDOM();
  setGlobals(dom.window);
  globalThis.WebSocket = OpenWebSocket;
  dom.window.WebSocket = OpenWebSocket;
  const consoleEl = dom.window.document.querySelector('[data-debug-console]');
  consoleEl.dataset.panelOrderPreferencesPath = '/admin/debug/api/preferences/panel-order';
  dom.window.localStorage.setItem('debug-console-panel-order', JSON.stringify(['sql', 'template']));
  globalThis.fetch = async (input) => {
    if (String(input).endsWith('/api/preferences/panel-order')) {
      return new Response(JSON.stringify({
        available: true,
        found: true,
        panel_order: ['config', 'template'],
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (String(input).endsWith('/api/panels')) {
      return new Response(JSON.stringify({ panels: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (String(input).endsWith('/api/snapshot')) {
      return new Response(JSON.stringify({ template: {}, sql: [], config: {} }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ sessions: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  debugModule.initDebugPanel(consoleEl);
  await flushMicrotasks();

  assert.deepEqual(debugTabOrder(dom.window.document), ['config', 'template', 'sql', 'sessions']);
  assert.deepEqual(JSON.parse(dom.window.localStorage.getItem('debug-console-panel-order')), [
    'config',
    'template',
    'sql',
    'sessions',
  ]);
});

test('debug panel falls back to local panel order when server preference is unavailable', async () => {
  const dom = createDebugDOM();
  setGlobals(dom.window);
  globalThis.WebSocket = OpenWebSocket;
  dom.window.WebSocket = OpenWebSocket;
  const consoleEl = dom.window.document.querySelector('[data-debug-console]');
  consoleEl.dataset.panelOrderPreferencesPath = '/admin/debug/api/preferences/panel-order';
  dom.window.localStorage.setItem('debug-console-panel-order', JSON.stringify(['sql', 'template']));
  globalThis.fetch = async (input) => {
    if (String(input).endsWith('/api/preferences/panel-order')) {
      return new Response(JSON.stringify({ available: false, found: false, panel_order: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (String(input).endsWith('/api/panels')) {
      return new Response(JSON.stringify({ panels: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (String(input).endsWith('/api/snapshot')) {
      return new Response(JSON.stringify({ template: {}, sql: [], config: {} }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ sessions: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  debugModule.initDebugPanel(consoleEl);
  await flushMicrotasks();

  assert.deepEqual(debugTabOrder(dom.window.document), ['sql', 'template', 'config', 'sessions']);
});

test('debug panel persists Sortable tab order through the local panel order cache', async () => {
  const dom = createDebugDOM();
  setGlobals(dom.window);
  globalThis.WebSocket = OpenWebSocket;
  dom.window.WebSocket = OpenWebSocket;
  globalThis.fetch = async (input) => {
    if (String(input).endsWith('/api/panels')) {
      return new Response(JSON.stringify({ panels: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (String(input).endsWith('/api/snapshot')) {
      return new Response(JSON.stringify({ template: {}, sql: [], config: {} }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ sessions: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const panel = debugModule.initDebugPanel(dom.window.document.querySelector('[data-debug-console]'));
  await flushMicrotasks();

  const tabs = dom.window.document.querySelector('[data-debug-tabs]');
  const configTab = tabs.querySelector('[data-panel="config"]');
  const templateTab = tabs.querySelector('[data-panel="template"]');
  tabs.insertBefore(configTab, templateTab);
  panel.tabsSortable.options.onEnd();

  assert.deepEqual(JSON.parse(dom.window.localStorage.getItem('debug-console-panel-order')), [
    'config',
    'template',
    'sql',
    'sessions',
  ]);
});

test('debug panel attempts server panel order persistence after Sortable drag end', async () => {
  const dom = createDebugDOM();
  setGlobals(dom.window);
  globalThis.WebSocket = OpenWebSocket;
  dom.window.WebSocket = OpenWebSocket;
  const consoleEl = dom.window.document.querySelector('[data-debug-console]');
  consoleEl.dataset.panelOrderPreferencesPath = '/admin/debug/api/preferences/panel-order';
  const requests = [];
  globalThis.fetch = async (input, init = {}) => {
    requests.push({ url: String(input), method: init.method || 'GET', body: init.body || '' });
    if (String(input).endsWith('/api/preferences/panel-order')) {
      return new Response(JSON.stringify({ available: false, found: false, panel_order: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (String(input).endsWith('/api/panels')) {
      return new Response(JSON.stringify({ panels: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (String(input).endsWith('/api/snapshot')) {
      return new Response(JSON.stringify({ template: {}, sql: [], config: {} }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ sessions: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const panel = debugModule.initDebugPanel(consoleEl);
  await flushMicrotasks();

  const tabs = dom.window.document.querySelector('[data-debug-tabs]');
  const configTab = tabs.querySelector('[data-panel="config"]');
  const templateTab = tabs.querySelector('[data-panel="template"]');
  tabs.insertBefore(configTab, templateTab);
  panel.tabsSortable.options.onEnd();
  await flushMicrotasks();

  const save = requests.find((request) => request.method === 'PUT' && request.url.endsWith('/api/preferences/panel-order'));
  assert.ok(save, `expected server panel-order save request, got ${JSON.stringify(requests)}`);
  assert.deepEqual(JSON.parse(save.body).panel_order, ['config', 'template', 'sql', 'sessions']);
});

test('debug panel re-renders content when the active dynamic panel is unregistered', async (t) => {
  const panelID = 'ephemeral-panel';
  debugModule.panelRegistry.unregister(panelID);
  t.after(() => debugModule.panelRegistry.unregister(panelID));
  debugModule.panelRegistry.register({
    id: panelID,
    label: 'Ephemeral',
    snapshotKey: panelID,
    showFilters: false,
    render: () => '<div data-ephemeral-panel>Ephemeral Active</div>',
  });

  const dom = createDebugDOM();
  setGlobals(dom.window);
  globalThis.WebSocket = OpenWebSocket;
  dom.window.WebSocket = OpenWebSocket;
  const consoleEl = dom.window.document.querySelector('[data-debug-console]');
  consoleEl.dataset.panels = JSON.stringify([panelID, 'template', 'sql', 'config']);
  dom.window.sessionStorage.setItem('debug-console-active-panel', panelID);
  globalThis.fetch = async (input) => {
    if (String(input).endsWith('/api/panels')) {
      return new Response(JSON.stringify({ panels: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (String(input).endsWith('/api/snapshot')) {
      return new Response(JSON.stringify({
        [panelID]: { ok: true },
        template: { request_id: 'req-dynamic' },
        sql: [],
        config: {},
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ sessions: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  debugModule.initDebugPanel(consoleEl);
  await flushMicrotasks();

  assert.equal(
    dom.window.document.querySelector('[data-debug-tabs] .debug-tab--active')?.dataset.panel,
    panelID,
  );
  assert.match(dom.window.document.querySelector('[data-debug-panel]').innerHTML, /Ephemeral Active/);

  debugModule.panelRegistry.unregister(panelID);
  await flushMicrotasks();

  assert.equal(
    dom.window.document.querySelector('[data-debug-tabs] .debug-tab--active')?.dataset.panel,
    'template',
  );
  assert.doesNotMatch(dom.window.document.querySelector('[data-debug-panel]').innerHTML, /Ephemeral Active/);
  assert.match(dom.window.document.querySelector('[data-debug-panel]').innerHTML, /req-dynamic|Template Context/);
});

test('debug panel preserves action result data across refresh rerender', async (t) => {
  const panelID = 'ops-result-refresh';
  debugModule.panelRegistry.unregister(panelID);
  t.after(() => debugModule.panelRegistry.unregister(panelID));

  const dom = createDebugDOM();
  setGlobals(dom.window);
  globalThis.WebSocket = OpenWebSocket;
  dom.window.WebSocket = OpenWebSocket;
  const consoleEl = dom.window.document.querySelector('[data-debug-console]');
  consoleEl.dataset.debugPath = '/admin/debug-action-result-refresh';
  consoleEl.dataset.panels = JSON.stringify([panelID]);
  dom.window.sessionStorage.setItem('debug-console-active-panel', panelID);
  const requests = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    requests.push({ url, method: init.method || 'GET' });
    if (url.endsWith('/api/panels')) {
      return new Response(JSON.stringify({
        panels: [{
          id: panelID,
          label: 'Operational Commands',
          snapshot_key: panelID,
          ui: {
            views: {
              console: { renderer: 'json', title: 'Operational Commands' },
            },
            actions: [{
              id: 'health',
              label: 'Health',
              refresh: true,
            }],
          },
        }],
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (url.endsWith(`/api/panels/${panelID}/actions/health`)) {
      return new Response(JSON.stringify({
        ok: true,
        message: 'Command completed',
        refresh: true,
        data: {
          status: 'healthy',
          indexes: ['archive_media'],
        },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (url.endsWith('/api/snapshot')) {
      return new Response(JSON.stringify({
        [panelID]: { rendered_at: requests.filter((request) => request.url.endsWith('/api/snapshot')).length },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ sessions: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  debugModule.initDebugPanel(consoleEl);
  await waitForAssertion(() => {
    assert.ok(dom.window.document.querySelector(`[data-panel-action][data-action-id="health"]`));
  });

  dom.window.document
    .querySelector(`[data-panel-action][data-action-id="health"]`)
    .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

  await waitForAssertion(() => {
    const result = dom.window.document.querySelector(`[data-panel-action-result="${panelID}"]`);
    assert.ok(result, 'expected panel action result target');
    assert.match(result.textContent, /Command completed/);
    assert.match(result.textContent, /healthy/);
    assert.match(result.textContent, /archive_media/);
  });
  assert.ok(
    requests.filter((request) => request.url.endsWith('/api/snapshot')).length >= 2,
    `expected action refresh to fetch a new snapshot, got ${JSON.stringify(requests)}`,
  );
});

test('debug panel renders selectable action forms and field validation errors', async (t) => {
  const panelID = 'ops-selectable-actions';
  debugModule.panelRegistry.unregister(panelID);
  t.after(() => debugModule.panelRegistry.unregister(panelID));

  const dom = createDebugDOM();
  setGlobals(dom.window);
  globalThis.WebSocket = OpenWebSocket;
  dom.window.WebSocket = OpenWebSocket;
  const consoleEl = dom.window.document.querySelector('[data-debug-console]');
  consoleEl.dataset.debugPath = '/admin/debug-selectable-actions';
  consoleEl.dataset.panels = JSON.stringify([panelID]);
  dom.window.sessionStorage.setItem('debug-console-active-panel', panelID);
  let submittedPayload = null;
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.endsWith('/api/panels')) {
      return new Response(JSON.stringify({
        panels: [{
          id: panelID,
          label: 'Operational Commands',
          snapshot_key: panelID,
          ui: {
            views: {
              console: { renderer: 'json', title: 'Operational Commands' },
            },
            action_layout: {
              mode: 'select',
              picker_label: 'Command',
              empty_text: 'Choose command',
            },
            actions: [{
              id: 'archive_repair',
              label: 'Archive repair',
              payload: { command_id: 'archive.repair', payload: {} },
              fields: [{
                name: 'indexes',
                label: 'Indexes',
                kind: 'string_list',
                payload_path: 'payload.indexes',
              }],
            }, {
              id: 'search_reindex',
              label: 'Reindex search',
              submit_label: 'Queue reindex',
              payload: { command_id: 'search.reindex', payload: {} },
              fields: [{
                name: 'indexes',
                label: 'Indexes',
                kind: 'string_list',
                payload_path: 'payload.indexes',
              }],
            }],
          },
        }],
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (url.endsWith(`/api/panels/${panelID}/actions/search_reindex`)) {
      submittedPayload = JSON.parse(init.body);
      return new Response(JSON.stringify({
        ok: false,
        message: 'Validation failed',
        errors: {
          'payload.indexes': 'Unknown index',
          form: 'Review the selected command payload',
        },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (url.endsWith('/api/snapshot')) {
      return new Response(JSON.stringify({ [panelID]: { ready: true } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ sessions: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  debugModule.initDebugPanel(consoleEl);
  await waitForAssertion(() => {
    assert.ok(dom.window.document.querySelector(`[data-panel-action-picker="${panelID}"]`));
  });

  const launcher = dom.window.document.querySelector(`[data-panel-action-launcher="${panelID}"]`);
  const choice = dom.window.document.querySelector('[data-panel-action-choice="search_reindex"]');
  assert.ok(launcher);
  assert.equal(choice.hidden, true);

  const picker = dom.window.document.querySelector(`[data-panel-action-picker="${panelID}"]`);
  picker.value = 'search_reindex';
  picker.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  assert.equal(choice.hidden, false);

  const field = choice.querySelector('[data-action-field="indexes"]');
  field.value = 'archive_media, archive_events';
  dom.window.document
    .querySelector(`[data-panel-action-form][data-action-id="search_reindex"]`)
    .dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

  await waitForAssertion(() => {
    assert.deepEqual(submittedPayload, {
      command_id: 'search.reindex',
      payload: { indexes: ['archive_media', 'archive_events'] },
    });
    const result = dom.window.document.querySelector(`[data-panel-action-result="${panelID}"]`);
    assert.match(result.textContent, /Validation failed/);
    assert.match(result.textContent, /Review the selected command payload/);
    const selectedError = dom.window.document.querySelector('[data-action-field-error="payload.indexes"][data-action-id="search_reindex"]');
    const hiddenError = dom.window.document.querySelector('[data-action-field-error="payload.indexes"][data-action-id="archive_repair"]');
    assert.match(selectedError.textContent, /Unknown index/);
    assert.equal(hiddenError.textContent, '');
  });
});

test('commands panel confirms inline (no browser dialog) and retry reuses the last submitted payload', async () => {
  const dom = createDebugDOM();
  setGlobals(dom.window);
  installDOMFormgenRuntime();
  globalThis.WebSocket = OpenWebSocket;
  dom.window.WebSocket = OpenWebSocket;
  const consoleEl = dom.window.document.querySelector('[data-debug-console]');
  consoleEl.dataset.debugPath = '/admin/debug-commands';
  consoleEl.dataset.panels = JSON.stringify(['commands']);
  dom.window.sessionStorage.setItem('debug-console-active-panel', 'commands');

  const confirmations = [];
  dom.window.confirm = (message) => {
    confirmations.push(message);
    return true;
  };

  const submittedPayloads = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.endsWith('/api/panels')) {
      return new Response(JSON.stringify({
        panels: [{
          id: 'commands',
          label: 'Commands',
          snapshot_key: 'commands',
          ui: {
            views: {
              console: { renderer: 'json', title: 'Commands' },
            },
            actions: [{
              id: 'dispatch_archive_generate',
              label: 'Generate archive',
              submit_label: 'Run command',
              confirm_text: 'Run Generate archive?',
              requires_confirm: true,
              payload: { command_id: 'archive.generate', payload: {}, options: { mode: 'queued' } },
              form: {
                renderer: 'formgen',
                operation_id: 'dispatch_archive_generate.edit',
                html: '<div data-formgen-auto-init="true"><label for="scope">Scope</label><input id="scope" name="scope" value="daily"></div>',
              },
            }],
          },
        }],
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (url.endsWith('/api/snapshot')) {
      return new Response(JSON.stringify({
        commands: {
          commands: [{
            id: 'archive.generate',
            label: 'Generate archive',
            group: 'Archive',
            mutating: true,
            execution_mode: 'queued',
          }],
          diagnostics: [],
        },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (url.endsWith('/api/panels/commands/actions/dispatch_archive_generate')) {
      submittedPayloads.push(JSON.parse(init.body));
      return new Response(JSON.stringify({
        ok: true,
        message: 'Command dispatched',
        data: {
          receipt: {
            Accepted: true,
            Mode: 'queued',
            CorrelationID: `corr-${submittedPayloads.length}`,
            DispatchID: `disp-${submittedPayloads.length}`,
          },
        },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ sessions: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  debugModule.initDebugPanel(consoleEl);
  await waitForAssertion(() => {
    const item = dom.window.document.querySelector('[data-cmdl-item="dispatch_archive_generate"]');
    assert.ok(item);
    item.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  });
  await waitForAssertion(() => {
    const form = dom.window.document.querySelector('[data-panel-action-form][data-action-id="dispatch_archive_generate"]');
    assert.ok(form);
    assert.equal(form.dataset.cmdlFormgenReady, 'true');
  });

  const form = dom.window.document.querySelector('[data-panel-action-form][data-action-id="dispatch_archive_generate"]');
  const input = form.querySelector('[name="scope"]');
  input.value = 'custom-run';

  // First submit reveals the inline confirmation instead of dispatching.
  form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  const confirmRow = form.querySelector('[data-cmdl-confirm-row]');
  assert.ok(confirmRow && !confirmRow.hidden, 'inline confirm row is shown');
  assert.equal(submittedPayloads.length, 0, 'nothing dispatches before confirmation');

  // Confirming dispatches once with the entered payload.
  form.querySelector('[data-cmdl-confirm-run]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

  await waitForAssertion(() => {
    assert.equal(submittedPayloads.length, 1);
    assert.deepEqual(submittedPayloads[0], {
      command_id: 'archive.generate',
      payload: { scope: 'custom-run' },
      options: { mode: 'queued' },
    });
    assert.ok(dom.window.document.querySelector('[data-cmdl-retry]'));
  });

  // Retry reuses the last submitted payload and dispatches directly (an explicit
  // re-run of an already-confirmed command does not re-confirm).
  input.value = 'changed-after-submit';
  dom.window.document
    .querySelector('[data-cmdl-retry]')
    .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

  await waitForAssertion(() => {
    assert.equal(submittedPayloads.length, 2);
    assert.deepEqual(submittedPayloads[1], submittedPayloads[0]);
  });
  // The blocking browser dialog is gone: window.confirm is never called.
  assert.deepEqual(confirmations, []);
});

test('commands panel dispatches sensitive values without retaining them for recall or retry', async () => {
  const dom = createDebugDOM();
  setGlobals(dom.window);
  installDOMFormgenRuntime();
  globalThis.WebSocket = OpenWebSocket;
  dom.window.WebSocket = OpenWebSocket;
  const consoleEl = dom.window.document.querySelector('[data-debug-console]');
  consoleEl.dataset.debugPath = '/admin/debug-commands-sensitive';
  consoleEl.dataset.panels = JSON.stringify(['commands']);
  dom.window.sessionStorage.setItem('debug-console-active-panel', 'commands');

  let submittedPayload;
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.endsWith('/api/panels')) {
      return new Response(JSON.stringify({
        panels: [{
          id: 'commands',
          label: 'Commands',
          snapshot_key: 'commands',
          ui: {
            views: { console: { renderer: 'json', title: 'Commands' } },
            actions: [{
              id: 'dispatch_secure',
              label: 'Secure operation',
              payload: { command_id: 'secure.operation', payload: {}, options: { mode: 'inline' } },
              form: {
                renderer: 'formgen',
                operation_id: 'dispatch_secure.edit',
                sensitive: true,
                html: '<div data-formgen-auto-init="true"><label for="scope">Scope</label><input id="scope" name="context.scope"><label for="api-token">API token</label><input id="api-token" name="credentials.api_token" type="password"></div>',
              },
            }],
          },
        }],
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.endsWith('/api/snapshot')) {
      return new Response(JSON.stringify({
        commands: {
          commands: [{ id: 'secure.operation', label: 'Secure operation', group: 'Secure', execution_mode: 'inline' }],
          diagnostics: [],
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.endsWith('/api/panels/commands/actions/dispatch_secure')) {
      submittedPayload = JSON.parse(init.body);
      return new Response(JSON.stringify({ ok: true, message: 'Command complete', data: { receipt: { Accepted: true, Mode: 'inline' } } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ sessions: [] }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  debugModule.initDebugPanel(consoleEl);
  await waitForAssertion(() => {
    const item = dom.window.document.querySelector('[data-cmdl-item="dispatch_secure"]');
    assert.ok(item);
    item.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  });
  await waitForAssertion(() => {
    const form = dom.window.document.querySelector('[data-panel-action-form][data-action-id="dispatch_secure"]');
    assert.ok(form);
    assert.equal(form.dataset.cmdlFormgenReady, 'true');
  });
  const form = dom.window.document.querySelector('[data-panel-action-form][data-action-id="dispatch_secure"]');
  assert.equal(form.querySelector('[data-cmdl-controller-payload]').dataset.actionFieldSensitive, 'true');
  form.querySelector('[name="context.scope"]').value = 'archive';
  form.querySelector('[name="credentials.api_token"]').value = 'dispatch-only-secret';
  form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

  await waitForAssertion(() => {
    assert.deepEqual(submittedPayload, {
      command_id: 'secure.operation',
      payload: { context: { scope: 'archive' }, credentials: { api_token: 'dispatch-only-secret' } },
      options: { mode: 'inline' },
    });
    assert.equal(dom.window.document.querySelector('[data-cmdl-retry]'), null);
    const persisted = dom.window.localStorage.getItem('cmdl:recent:secure.operation') || '';
    assert.equal(persisted, '', 'sensitive generated forms do not persist partial or complete payloads');
  });
});

test('commands panel surfaces rich error details from a failed dispatch', async () => {
  const dom = createDebugDOM();
  setGlobals(dom.window);
  installDOMFormgenRuntime();
  globalThis.WebSocket = OpenWebSocket;
  dom.window.WebSocket = OpenWebSocket;
  const consoleEl = dom.window.document.querySelector('[data-debug-console]');
  // Unique debug path: server-definition hydration is cached per base path, so
  // reusing another commands test's path would replay its cached panel def.
  consoleEl.dataset.debugPath = '/admin/debug-commands-error';
  consoleEl.dataset.panels = JSON.stringify(['commands']);
  dom.window.sessionStorage.setItem('debug-console-active-panel', 'commands');

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith('/api/panels')) {
      return new Response(JSON.stringify({
        panels: [{
          id: 'commands', label: 'Commands', snapshot_key: 'commands',
          ui: {
            views: { console: { renderer: 'json', title: 'Commands' } },
            actions: [{
              id: 'dispatch_archive_repair', label: 'Repair variants', submit_label: 'Run command',
              payload: { command_id: 'archive.repair', payload: {}, options: { mode: 'inline' } },
              form: { renderer: 'formgen', operation_id: 'dispatch_archive_repair.edit', html: '' },
            }],
          },
        }],
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.endsWith('/api/snapshot')) {
      return new Response(JSON.stringify({
        commands: { commands: [{ id: 'archive.repair', label: 'Repair variants', group: 'Archive', mutating: false, execution_mode: 'inline' }], diagnostics: [] },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.endsWith('/api/panels/commands/actions/dispatch_archive_repair')) {
      // HTTP 500 with the full rich error envelope — previously reduced to a one-liner.
      return new Response(JSON.stringify({
        error: {
          category: 'internal', code: 500, text_code: 'INTERNAL_ERROR', message: 'An unexpected error occurred',
          source: 'archive cms variant repair requires event_ids or session_ids',
          metadata: { method: 'POST', path: '/admin/debug/api/panels/commands/actions/dispatch_archive_repair' },
          timestamp: '2026-06-18T14:37:39-07:00',
          stack_trace: [
            { function: 'github.com/goliatone/go-admin/admin.presentError', file: '/x/go/pkg/mod/github.com/goliatone/go-admin@v0.100.0/admin/error_presenter.go', line: 93 },
            { function: 'github.com/Garchen-Archive/garchen-archive-admin/internal/adminapp.(*Module).prepareAdminServer', file: '/x/Development/garchen-archive-admin/internal/adminapp/module.go', line: 1260 },
          ],
          location: { file: '/x/go/pkg/mod/github.com/goliatone/go-admin@v0.100.0/admin/debug_transport.go', line: 580, function: 'github.com/goliatone/go-admin/admin.(*DebugModule).handleDebugPanelAction' },
          severity: 'ERROR',
        },
      }), { status: 500, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify({ sessions: [] }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  debugModule.initDebugPanel(consoleEl);
  await waitForAssertion(() => {
    const item = dom.window.document.querySelector('[data-cmdl-item="dispatch_archive_repair"]');
    assert.ok(item);
    item.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  });
  await waitForAssertion(() => {
    const form = dom.window.document.querySelector('[data-panel-action-form][data-action-id="dispatch_archive_repair"]');
    assert.ok(form);
    assert.equal(form.dataset.cmdlFormgenReady, 'true');
  });

  const form = dom.window.document.querySelector('[data-panel-action-form][data-action-id="dispatch_archive_repair"]');
  form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

  await waitForAssertion(() => {
    const card = dom.window.document.querySelector('[data-panel-action-result="commands"] .cmdl-result__card--error');
    assert.ok(card, 'rich error card rendered');
    const html = card.innerHTML;
    assert.match(html, /INTERNAL_ERROR/);
    assert.match(html, /archive cms variant repair requires event_ids or session_ids/);
    assert.match(html, /Stack trace · 2 frames/);
    assert.match(html, /cmdl-trace__frame--app/);
    assert.match(html, /debug_transport\.go:580/);
  });

  // The result panel is dismissable: clicking × clears it and forgets the stored result.
  dom.window.document
    .querySelector('[data-panel-action-result="commands"] [data-cmdl-dismiss]')
    .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.equal(
    dom.window.document.querySelector('[data-panel-action-result="commands"]').innerHTML.trim(),
    '',
    'dismiss clears the result panel',
  );
});

test('commands panel reports followed login HTML as authentication required', async () => {
  const dom = createDebugDOM();
  setGlobals(dom.window);
  installDOMFormgenRuntime();
  globalThis.WebSocket = OpenWebSocket;
  dom.window.WebSocket = OpenWebSocket;
  const consoleEl = dom.window.document.querySelector('[data-debug-console]');
  consoleEl.dataset.debugPath = '/admin/debug-commands-auth-redirect';
  consoleEl.dataset.panels = JSON.stringify(['commands']);
  dom.window.sessionStorage.setItem('debug-console-active-panel', 'commands');

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith('/api/panels')) {
      return new Response(JSON.stringify({
        panels: [{
          id: 'commands', label: 'Commands', snapshot_key: 'commands',
          ui: {
            views: { console: { renderer: 'json', title: 'Commands' } },
            actions: [{
              id: 'dispatch_archive_repair', label: 'Repair variants', submit_label: 'Run command',
              payload: { command_id: 'archive.repair', payload: {}, options: { mode: 'inline' } },
              form: { renderer: 'formgen', operation_id: 'dispatch_archive_repair.edit', html: '' },
            }],
          },
        }],
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.endsWith('/api/snapshot')) {
      return new Response(JSON.stringify({
        commands: { commands: [{ id: 'archive.repair', label: 'Repair variants', group: 'Archive', mutating: false, execution_mode: 'inline' }], diagnostics: [] },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.endsWith('/api/panels/commands/actions/dispatch_archive_repair')) {
      const response = new Response('<!doctype html><title>Admin login</title>', {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
      Object.defineProperties(response, {
        redirected: { value: true },
        url: { value: 'http://127.0.0.1:9090/admin/login' },
      });
      return response;
    }
    return new Response(JSON.stringify({ sessions: [] }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  debugModule.initDebugPanel(consoleEl);
  await waitForAssertion(() => {
    const item = dom.window.document.querySelector('[data-cmdl-item="dispatch_archive_repair"]');
    assert.ok(item);
    item.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  });
  await waitForAssertion(() => {
    const form = dom.window.document.querySelector('[data-panel-action-form][data-action-id="dispatch_archive_repair"]');
    assert.ok(form);
    assert.equal(form.dataset.cmdlFormgenReady, 'true');
  });

  const form = dom.window.document.querySelector('[data-panel-action-form][data-action-id="dispatch_archive_repair"]');
  form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

  await waitForAssertion(() => {
    const card = dom.window.document.querySelector('[data-panel-action-result="commands"] .cmdl-result__card--error');
    assert.ok(card, 'authentication error card rendered');
    assert.match(card.textContent, /Authentication required\. Please sign in and try again\./);
    assert.doesNotMatch(card.textContent, /Unexpected token/);
  });
});

test('debug panel restores built-in Site Cache when it remains enabled', async () => {
  const dom = new JSDOM(`
    <!doctype html>
    <html>
      <body>
        <div class="debug-connection" data-debug-status="disconnected">
          <span data-debug-connection>disconnected</span>
        </div>
        <nav data-debug-tabs></nav>
        <section data-debug-filters></section>
        <main
          data-debug-panel
          data-debug-console
          data-debug-path="/admin/site-cache-debug"
          data-panels='["template","site-render-cache"]'
          data-repl-commands='[]'
          data-max-log-entries="25"
          data-max-sql-queries="25"
          data-slow-threshold-ms="50"
        ></main>
        <span data-debug-events>0</span>
        <span data-debug-last>--</span>
      </body>
    </html>
  `, { url: 'http://127.0.0.1:9090/admin/site-cache-debug' });
  setGlobals(dom.window);
  globalThis.WebSocket = OpenWebSocket;
  dom.window.WebSocket = OpenWebSocket;
  dom.window.sessionStorage.setItem('debug-console-active-panel', 'site-render-cache');
  globalThis.fetch = async (input) => {
    if (String(input).endsWith('/api/panels')) {
      return new Response(JSON.stringify({ panels: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (String(input).endsWith('/api/snapshot')) {
      return new Response(JSON.stringify({
        template: {},
        'site-render-cache': {
          configured: true,
          active: true,
          backend: 'memory',
          status: 'healthy',
          scope: 'process_local',
          counters: { lookups: 1, hits: 1, misses: 0, errors: 0 },
          observed_keys: [],
          recent_operations: [],
          recent_errors: [],
        },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ sessions: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  debugModule.initDebugPanel(dom.window.document.querySelector('[data-debug-console]'));
  await flushMicrotasks();

  assert.equal(
    dom.window.document.querySelector('[data-debug-tabs] .debug-tab--active')?.dataset.panel,
    'site-render-cache',
  );
});

test('debug toolbar persists active panel with existing toolbar preferences', async () => {
  setGlobals(bootstrapDOM.window);
  globalThis.WebSocket = OpenWebSocket;
  bootstrapDOM.window.WebSocket = OpenWebSocket;
  bootstrapDOM.window.document.body.innerHTML = '';
  bootstrapDOM.window.localStorage.clear();
  bootstrapDOM.window.localStorage.setItem('debug-toolbar-expanded', 'true');
  bootstrapDOM.window.localStorage.setItem('debug-toolbar-height', '420');
  bootstrapDOM.window.localStorage.setItem('debug-toolbar-sort-order', JSON.stringify({ requests: false, sql: true }));
  bootstrapDOM.window.localStorage.setItem('debug-toolbar-active-panel', ' sql ');
  globalThis.fetch = async (input) => {
    if (String(input).endsWith('/api/panels')) {
      return new Response(JSON.stringify({ panels: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (String(input).endsWith('/api/snapshot')) {
      return new Response(JSON.stringify({
        requests: [{ status: 200 }],
        sql: [{ query: 'select 1', duration: '1ms' }],
        'site-render-cache': {
          configured: true,
          active: true,
          backend: 'memory',
          status: 'healthy',
          scope: 'process_local',
          counters: { lookups: 1, hits: 1, misses: 0, errors: 0 },
          observed_keys: [],
          recent_operations: [],
          recent_errors: [],
        },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response('{}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const toolbar = bootstrapDOM.window.document.createElement('debug-toolbar');
  toolbar.setAttribute('debug-path', '/admin/toolbar-persistence');
  toolbar.setAttribute('panels', 'requests,sql,site-render-cache');
  toolbar.setAttribute('live-transport', 'false');
  bootstrapDOM.window.document.body.appendChild(toolbar);
  await flushMicrotasks();

  assert.equal(toolbar.shadowRoot?.querySelector('.tab.active')?.dataset.panel, 'sql');

  const siteCacheTab = toolbar.shadowRoot?.querySelector('[data-panel="site-render-cache"]');
  assert.ok(siteCacheTab, 'expected Site Cache toolbar tab to render');
  siteCacheTab.dispatchEvent(new bootstrapDOM.window.MouseEvent('click', { bubbles: true }));

  assert.equal(bootstrapDOM.window.localStorage.getItem('debug-toolbar-active-panel'), 'site-render-cache');
  assert.equal(bootstrapDOM.window.localStorage.getItem('debug-toolbar-expanded'), 'true');
  assert.equal(bootstrapDOM.window.localStorage.getItem('debug-toolbar-height'), '420');
  assert.deepEqual(JSON.parse(bootstrapDOM.window.localStorage.getItem('debug-toolbar-sort-order')), {
    requests: false,
    sql: true,
  });
});

test('debug toolbar constrains tab strip as horizontal scroll container with visible scrollbar', async () => {
  setGlobals(bootstrapDOM.window);
  globalThis.WebSocket = OpenWebSocket;
  bootstrapDOM.window.WebSocket = OpenWebSocket;
  bootstrapDOM.window.document.body.innerHTML = '';
  bootstrapDOM.window.localStorage.clear();
  bootstrapDOM.window.localStorage.setItem('debug-toolbar-expanded', 'true');
  globalThis.fetch = async (input) => {
    if (String(input).endsWith('/api/panels')) {
      return new Response(JSON.stringify({ panels: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response('{}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const toolbar = bootstrapDOM.window.document.createElement('debug-toolbar');
  toolbar.setAttribute('debug-path', '/admin/toolbar-tabs');
  toolbar.setAttribute('panels', 'requests,sql,logs,jserrors,routes,config,doctor,permissions,export_pipeline,site-render-cache,shell,console,scope');
  toolbar.setAttribute('live-transport', 'false');
  bootstrapDOM.window.document.body.appendChild(toolbar);
  await flushMicrotasks();

  const styleText = toolbar.shadowRoot?.querySelector('style')?.textContent || '';
  // Core overflow constraints
  assert.match(styleText, /\.toolbar-tabs\s*\{[\s\S]*flex: 1 1 auto;[\s\S]*min-width: 0;[\s\S]*overflow-x: auto;/);
  assert.match(styleText, /\.tab\s*\{[\s\S]*flex: 0 0 auto;/);
  assert.match(styleText, /\.tab \.debug-icon\s*\{[\s\S]*flex: 0 0 14px;/);
  assert.ok(toolbar.shadowRoot?.querySelector('[data-panel="doctor"] .debug-icon .iconoir-heart'));
  assert.ok(toolbar.shadowRoot?.querySelector('[data-panel="permissions"] .debug-icon .iconoir-shield-check'));
  assert.ok(toolbar.shadowRoot?.querySelector('[data-panel="site-render-cache"] .debug-icon .iconoir-database'));
  assert.ok(toolbar.shadowRoot?.querySelector('[data-panel="shell"] .debug-icon .iconoir-terminal'));
  assert.ok(toolbar.shadowRoot?.querySelector('[data-panel="console"] .debug-icon .iconoir-code'));
  // Visible scrollbar (not hidden)
  assert.match(styleText, /\.toolbar-tabs\s*\{[\s\S]*scrollbar-width: thin;/);
  assert.match(styleText, /\.toolbar-tabs::-webkit-scrollbar\s*\{[\s\S]*height:\s*\d+px;/);
  // Scroll snap for better UX
  assert.match(styleText, /\.toolbar-tabs\s*\{[\s\S]*scroll-snap-type: x proximity;/);
  assert.match(styleText, /\.tab\s*\{[\s\S]*scroll-snap-align: start;/);
  assert.equal(toolbar.shadowRoot?.querySelectorAll('.toolbar-tabs .tab').length, 13);
});

test('debug console constrains tab strip as horizontal scroll container with visible scrollbar', () => {
  const styleText = fs.readFileSync(debugConsoleStylesPath, 'utf8');

  // Core overflow constraints
  assert.match(styleText, /\.debug-tabs\s*\{[\s\S]*width: 100%;[\s\S]*max-width: 100%;[\s\S]*min-width: 0;[\s\S]*overflow-x: auto;/);
  assert.match(styleText, /\.debug-tab\s*\{[\s\S]*flex: 0 0 auto;/);
  assert.match(styleText, /\.debug-tab \.debug-icon\s*\{[\s\S]*flex: 0 0 14px;/);
  // Visible scrollbar (not hidden)
  assert.match(styleText, /\.debug-tabs\s*\{[\s\S]*scrollbar-width: thin;/);
  assert.match(styleText, /\.debug-tabs\s*\{[\s\S]*touch-action: pan-x;/);
  assert.match(styleText, /\.debug-tabs::-webkit-scrollbar\s*\{[\s\S]*height:\s*\d+px;/);
  // Scroll snap for better UX
  assert.match(styleText, /\.debug-tabs\s*\{[\s\S]*scroll-snap-type: x proximity;/);
  assert.match(styleText, /\.debug-tab\s*\{[\s\S]*scroll-snap-align: start;/);
  assert.match(styleText, /\.debug-tab\s*\{[\s\S]*cursor: grab;/);
  assert.doesNotMatch(styleText, /\.debug-tabs\s*\{[^}]*cursor:\s*grab;/);
});

test('debug console Sortable config tolerates clicks and horizontal touch scrolling', () => {
  const source = fs.readFileSync(debugPanelSourcePath, 'utf8');

  assert.match(source, /draggable:\s*['"]\.debug-tab['"]/);
  assert.match(source, /fallbackTolerance:\s*5/);
  assert.match(source, /delayOnTouchOnly:\s*true/);
  assert.match(source, /delay:\s*120/);
  assert.match(source, /touchStartThreshold:\s*8/);
  assert.match(source, /bubbleScroll:\s*true/);
});

test('debug toolbar falls back to the first configured panel when stored active panel is unavailable', async () => {
  setGlobals(bootstrapDOM.window);
  globalThis.WebSocket = OpenWebSocket;
  bootstrapDOM.window.WebSocket = OpenWebSocket;
  bootstrapDOM.window.document.body.innerHTML = '';
  bootstrapDOM.window.localStorage.clear();
  bootstrapDOM.window.localStorage.setItem('debug-toolbar-expanded', 'true');
  bootstrapDOM.window.localStorage.setItem('debug-toolbar-active-panel', 'missing-panel');
  globalThis.fetch = async (input) => {
    if (String(input).endsWith('/api/panels')) {
      return new Response(JSON.stringify({ panels: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (String(input).endsWith('/api/snapshot')) {
      return new Response(JSON.stringify({
        sql: [{ query: 'select 1', duration: '1ms' }],
        routes: [{ method: 'GET', path: '/health', handler: 'health' }],
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response('{}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const toolbar = bootstrapDOM.window.document.createElement('debug-toolbar');
  toolbar.setAttribute('debug-path', '/admin/toolbar-fallback');
  toolbar.setAttribute('panels', 'sql,routes');
  toolbar.setAttribute('live-transport', 'false');
  bootstrapDOM.window.document.body.appendChild(toolbar);
  await flushMicrotasks();

  assert.equal(toolbar.shadowRoot?.querySelector('.tab.active')?.dataset.panel, 'sql');
  assert.equal(toolbar.shadowRoot?.querySelectorAll('.tab.active').length, 1);
});

test('debug panel delegates dynamic clear-panel actions after panel rerender', async () => {
  const dom = createSiteRenderCacheDebugDOM();
  setGlobals(dom.window);
  globalThis.WebSocket = OpenWebSocket;
  dom.window.WebSocket = OpenWebSocket;

  const requests = [];
  globalThis.fetch = async (input, init = {}) => {
    requests.push({ url: String(input), method: init.method || 'GET' });
    if (String(input).endsWith('/api/snapshot')) {
      return new Response(JSON.stringify({
        'site-render-cache': {
          configured: true,
          active: true,
          backend: 'memory',
          status: 'healthy',
          scope: 'process_local',
          counters: { lookups: 1, hits: 1, misses: 0, errors: 0 },
          observed_keys: [],
          recent_operations: [],
          recent_errors: [],
        },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (String(input).endsWith('/api/sessions')) {
      return new Response(JSON.stringify({ sessions: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const panel = debugModule.initDebugPanel(dom.window.document.querySelector('[data-debug-console]'));
  await flushMicrotasks();

  assert.ok(panel, 'expected debug panel to initialize');
  const button = dom.window.document.querySelector('[data-debug-panel] [data-debug-action="clear-panel"]');
  assert.ok(button, 'expected site render cache panel to render a clear button');

  button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await flushMicrotasks();

  assert.ok(
    requests.some((request) => request.method === 'POST' && request.url.endsWith('/api/clear/site-render-cache')),
    `expected clear-panel POST request, got ${JSON.stringify(requests)}`,
  );
});

test('debug syntax highlighting renders bundled SQL and JSON safely', () => {
  const sqlHTML = debugModule.renderSQLPanel([{
    query: 'select id, title from pages where id = 1',
    duration: '12ms',
    timestamp: '2026-04-07T19:00:00Z',
    row_count: 1,
  }], debugModule.consoleStyles, {
    maxEntries: 10,
    newestFirst: true,
  });
  const jsonHTML = debugModule.renderJSONPanel('Config', {
    env: 'test',
    enabled: true,
  }, debugModule.consoleStyles);

  assert.match(sqlHTML, /token keyword/i);
  assert.match(sqlHTML, /token number/i);
  assert.match(jsonHTML, /token property/i);
  assert.match(jsonHTML, /token boolean/i);
});

test('debug syntax highlight source does not use Prism dynamic language loading', () => {
  const source = fs.readFileSync(syntaxHighlightSourcePath, 'utf8');

  assert.doesNotMatch(source, /prismjs\/components\/index\.js/);
  assert.doesNotMatch(source, /loadLanguages\s*\(/);
  assert.match(source, /Prism\.languages\.json\s*=/);
  assert.match(source, /Prism\.languages\.sql\s*=/);
});

test('debug stream bounds websocket retries when the initial connection fails', async () => {
  const dom = createDebugDOM();
  setGlobals(dom.window);

  const scheduled = [];
  let timerID = 0;
  const originalSetTimeout = dom.window.setTimeout.bind(dom.window);
  const originalClearTimeout = dom.window.clearTimeout.bind(dom.window);

  dom.window.setTimeout = (callback) => {
    scheduled.push(callback);
    timerID += 1;
    return timerID;
  };
  dom.window.clearTimeout = () => {};
  globalThis.window.setTimeout = dom.window.setTimeout.bind(dom.window);
  globalThis.window.clearTimeout = dom.window.clearTimeout.bind(dom.window);

  let attempts = 0;
  class FailingWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    constructor(url) {
      this.url = url;
      this.readyState = FailingWebSocket.CONNECTING;
      attempts += 1;
      queueMicrotask(() => {
        this.onerror?.(new dom.window.Event('error'));
        this.readyState = FailingWebSocket.CLOSED;
        this.onclose?.(new dom.window.Event('close'));
      });
    }

    send() {}

    close() {
      this.readyState = FailingWebSocket.CLOSED;
      this.onclose?.(new dom.window.Event('close'));
    }
  }

  globalThis.WebSocket = FailingWebSocket;
  dom.window.WebSocket = FailingWebSocket;

  const statuses = [];
  const stream = new debugModule.DebugStream({
    url: 'ws://127.0.0.1:9090/admin/debug/ws',
    maxInitialReconnectAttempts: 1,
    reconnectDelayMs: 1,
    maxReconnectDelayMs: 1,
    onStatusChange: (status) => statuses.push(status),
  });

  stream.connect();
  await flushMicrotasks();

  while (scheduled.length > 0) {
    const callback = scheduled.shift();
    callback();
    await flushMicrotasks();
  }

  assert.equal(attempts, 2, 'expected only one retry after the initial failure');
  assert.equal(stream.getStatus(), 'disconnected');
  assert.match(statuses.join(','), /reconnecting/);

  dom.window.setTimeout = originalSetTimeout;
  dom.window.clearTimeout = originalClearTimeout;
});

test('debug stream keeps retry backoff across short-lived successful upgrades', async () => {
  const dom = createDebugDOM();
  setGlobals(dom.window);

  const timers = new Map();
  let timerID = 0;
  dom.window.setTimeout = (callback, delay = 0) => {
    timerID += 1;
    timers.set(timerID, { callback, delay });
    return timerID;
  };
  dom.window.clearTimeout = (id) => timers.delete(id);
  globalThis.window.setTimeout = dom.window.setTimeout.bind(dom.window);
  globalThis.window.clearTimeout = dom.window.clearTimeout.bind(dom.window);

  const sockets = [];
  class ShortLivedWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    constructor(url) {
      this.url = url;
      this.readyState = ShortLivedWebSocket.CONNECTING;
      sockets.push(this);
    }

    open() {
      this.readyState = ShortLivedWebSocket.OPEN;
      this.onopen?.(new dom.window.Event('open'));
    }

    close() {
      this.readyState = ShortLivedWebSocket.CLOSED;
      this.onclose?.(new dom.window.Event('close'));
    }

    send() {}
  }

  globalThis.WebSocket = ShortLivedWebSocket;
  dom.window.WebSocket = ShortLivedWebSocket;
  const originalRandom = Math.random;
  Math.random = () => 0;

  const stream = new debugModule.DebugStream({
    url: 'ws://127.0.0.1:9090/admin/debug/ws',
    maxReconnectAttempts: 3,
    reconnectDelayMs: 10,
    maxReconnectDelayMs: 100,
    reconnectStabilityMs: 1000,
  });
  stream.connect();

  const reconnectDelays = [];
  for (let index = 0; index < 4; index += 1) {
    sockets[index].open();
    sockets[index].close();
    const reconnect = [...timers.entries()].sort((a, b) => a[1].delay - b[1].delay)[0];
    if (!reconnect) break;
    const [id, timer] = reconnect;
    timers.delete(id);
    reconnectDelays.push(timer.delay);
    timer.callback();
  }

  assert.equal(sockets.length, 4, 'three retries should follow the first provisional connection');
  assert.equal(stream.getStatus(), 'disconnected');
  assert.deepEqual(reconnectDelays, [12, 24, 48]);
  Math.random = originalRandom;
});

test('debug stream resets retry budget only after the stability window', () => {
  const dom = createDebugDOM();
  setGlobals(dom.window);

  const timers = new Map();
  let timerID = 0;
  dom.window.setTimeout = (callback, delay = 0) => {
    timerID += 1;
    timers.set(timerID, { callback, delay });
    return timerID;
  };
  dom.window.clearTimeout = (id) => timers.delete(id);
  globalThis.window.setTimeout = dom.window.setTimeout.bind(dom.window);
  globalThis.window.clearTimeout = dom.window.clearTimeout.bind(dom.window);

  const sockets = [];
  class StableWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    constructor() {
      this.readyState = StableWebSocket.CONNECTING;
      sockets.push(this);
    }
    open() {
      this.readyState = StableWebSocket.OPEN;
      this.onopen?.(new dom.window.Event('open'));
    }
    close() {
      this.readyState = StableWebSocket.CLOSED;
      this.onclose?.(new dom.window.Event('close'));
    }
    send() {}
  }
  globalThis.WebSocket = StableWebSocket;
  dom.window.WebSocket = StableWebSocket;

  const stream = new debugModule.DebugStream({
    url: 'ws://127.0.0.1:9090/admin/debug/ws',
    maxReconnectAttempts: 1,
    reconnectDelayMs: 1,
    maxReconnectDelayMs: 1,
    reconnectStabilityMs: 50,
  });
  stream.connect();
  sockets[0].open();
  sockets[0].close();

  let next = [...timers.entries()].sort((a, b) => a[1].delay - b[1].delay)[0];
  timers.delete(next[0]);
  next[1].callback();
  sockets[1].open();

  const stableTimer = [...timers.entries()].find(([, timer]) => timer.delay === 50);
  assert.ok(stableTimer, 'stable connection should schedule a retry-budget reset');
  timers.delete(stableTimer[0]);
  stableTimer[1].callback();
  sockets[1].close();

  next = [...timers.entries()].sort((a, b) => a[1].delay - b[1].delay)[0];
  assert.ok(next, 'closing after stability should receive a fresh retry budget');
  timers.delete(next[0]);
  next[1].callback();
  assert.equal(sockets.length, 3);
});
