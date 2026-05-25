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
  toolbar.setAttribute('panels', 'requests,sql,logs,jserrors,routes,config,doctor,export_pipeline,site-render-cache,scope');
  toolbar.setAttribute('live-transport', 'false');
  bootstrapDOM.window.document.body.appendChild(toolbar);
  await flushMicrotasks();

  const styleText = toolbar.shadowRoot?.querySelector('style')?.textContent || '';
  // Core overflow constraints
  assert.match(styleText, /\.toolbar-tabs\s*\{[\s\S]*flex: 1 1 auto;[\s\S]*min-width: 0;[\s\S]*overflow-x: auto;/);
  assert.match(styleText, /\.tab\s*\{[\s\S]*flex: 0 0 auto;/);
  // Visible scrollbar (not hidden)
  assert.match(styleText, /\.toolbar-tabs\s*\{[\s\S]*scrollbar-width: thin;/);
  assert.match(styleText, /\.toolbar-tabs::-webkit-scrollbar\s*\{[\s\S]*height:\s*\d+px;/);
  // Scroll snap for better UX
  assert.match(styleText, /\.toolbar-tabs\s*\{[\s\S]*scroll-snap-type: x proximity;/);
  assert.match(styleText, /\.tab\s*\{[\s\S]*scroll-snap-align: start;/);
  assert.equal(toolbar.shadowRoot?.querySelectorAll('.toolbar-tabs .tab').length, 10);
});

test('debug console constrains tab strip as horizontal scroll container with visible scrollbar', () => {
  const styleText = fs.readFileSync(debugConsoleStylesPath, 'utf8');

  // Core overflow constraints
  assert.match(styleText, /\.debug-tabs\s*\{[\s\S]*width: 100%;[\s\S]*max-width: 100%;[\s\S]*min-width: 0;[\s\S]*overflow-x: auto;/);
  assert.match(styleText, /\.debug-tab\s*\{[\s\S]*flex: 0 0 auto;/);
  // Visible scrollbar (not hidden)
  assert.match(styleText, /\.debug-tabs\s*\{[\s\S]*scrollbar-width: thin;/);
  assert.match(styleText, /\.debug-tabs::-webkit-scrollbar\s*\{[\s\S]*height:\s*\d+px;/);
  // Scroll snap for better UX
  assert.match(styleText, /\.debug-tabs\s*\{[\s\S]*scroll-snap-type: x proximity;/);
  assert.match(styleText, /\.debug-tab\s*\{[\s\S]*scroll-snap-align: start;/);
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
