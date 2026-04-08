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
  globalThis.localStorage = win.localStorage;
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
