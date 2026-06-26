import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { build } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch (error) {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();
const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(testFileDir, '../src/services');
const commandRuntimeSourcePath = path.resolve(sourceRoot, 'command-runtime.ts');
const compiledModuleCache = new Map();

async function importSourceModule(relativePath) {
  const sourcePath = path.resolve(sourceRoot, relativePath);
  const sourceStats = fs.statSync(sourcePath);
  const cacheKey = `${sourcePath}:${sourceStats.mtimeMs}`;

  if (!compiledModuleCache.has(cacheKey)) {
    const outputPath = path.join(
      os.tmpdir(),
      `go-admin-${path.basename(relativePath, path.extname(relativePath))}-${crypto.createHash('sha1').update(cacheKey).digest('hex')}.mjs`,
    );
    await build({
      entryPoints: [sourcePath],
      outfile: outputPath,
      bundle: true,
      format: 'esm',
      platform: 'browser',
      target: ['es2020'],
      sourcemap: 'inline',
      logLevel: 'silent',
    });
    compiledModuleCache.set(cacheKey, outputPath);
  }

  const outputPath = compiledModuleCache.get(cacheKey);
  return import(`${pathToFileURL(outputPath).href}?t=${Date.now()}`);
}

function setGlobals(win) {
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.Document = win.Document;
  globalThis.Node = win.Node;
  globalThis.Element = win.Element;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.HTMLButtonElement = win.HTMLButtonElement;
  globalThis.HTMLFormElement = win.HTMLFormElement;
  globalThis.HTMLInputElement = win.HTMLInputElement;
  globalThis.HTMLTextAreaElement = win.HTMLTextAreaElement;
  globalThis.HTMLSelectElement = win.HTMLSelectElement;
  globalThis.DOMParser = win.DOMParser;
  globalThis.CustomEvent = win.CustomEvent;
  globalThis.Event = win.Event;
  globalThis.SubmitEvent = win.SubmitEvent;
  globalThis.FormData = win.FormData;
  Object.defineProperty(globalThis, 'navigator', { value: win.navigator, configurable: true });
}

function setupDom(markup) {
  const dom = new JSDOM(markup, {
    url: 'http://localhost:8082/admin/content/esign_agreements/agreement-1?channel=default&tenant_id=tenant-1&org_id=org-1',
  });
  setGlobals(dom.window);
  return dom;
}

function nextTick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function deferred() {
  let resolve;
  const promise = new Promise((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

function createNotifier() {
  return {
    successes: [],
    errors: [],
    success(message) {
      this.successes.push(message);
    },
    error(message) {
      this.errors.push(message);
    },
    warning() {},
    info() {},
    show() {},
    async confirm() {
      return true;
    },
  };
}

test('CommandRuntimeController dispatches rpc commands and refreshes fragments', async () => {
  setupDom(`<!doctype html>
    <html>
      <body>
        <script id="agreement-review-bootstrap" type="application/json">{"status":"in_review","participants":[]}</script>
        <div id="mount">
          <div id="status-panel">before</div>
          <button
            id="notify-btn"
            type="button"
            data-command-name="notify_reviewers"
            data-command-transport="rpc"
            data-command-dispatch="esign.agreements.notify_reviewers"
            data-command-success="Reviewers notified"
            data-command-refresh="#status-panel"
            data-command-payload-participant-id="participant-1"
            data-command-payload-recipient-id=""
          >Notify</button>
        </div>
      </body>
    </html>`);

  const { initCommandRuntime } = await importSourceModule('command-runtime.ts');
  const notifier = createNotifier();
  const requests = [];
  const dispatches = [];

  const fetchImpl = async (input, init = {}) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.endsWith('/rpc')) {
      return new Response(JSON.stringify({
        data: {
          receipt: {
            Accepted: true,
            Mode: 'inline',
            CommandID: 'esign.agreements.notify_reviewers',
            DispatchID: 'dispatch-1',
            CorrelationID: 'corr-1',
          },
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(`<!doctype html>
      <html>
        <body>
          <script id="agreement-review-bootstrap" type="application/json">{"status":"approved","participants":[{"id":"participant-1"}]}</script>
          <div id="mount">
            <div id="status-panel">after</div>
          </div>
        </body>
      </html>`, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  };

  const refreshed = [];
  initCommandRuntime({
    mount: document.getElementById('mount'),
    apiBasePath: '/admin/api/v1',
    panelName: 'esign_agreements',
    recordId: 'agreement-1',
    rpcEndpoint: '/admin/api/v1/rpc',
    tenantId: 'tenant-1',
    orgId: 'org-1',
    notifier,
    fetchImpl,
    onAfterRefresh(detail) {
      refreshed.push(detail.sourceDocument.getElementById('agreement-review-bootstrap')?.textContent || '');
    },
    onAfterDispatch(detail) {
      dispatches.push(detail);
    },
  });

  document.getElementById('notify-btn').click();
  await nextTick();
  await nextTick();

  assert.equal(notifier.errors.length, 0);
  assert.deepEqual(notifier.successes, ['Reviewers notified']);
  assert.equal(document.getElementById('status-panel')?.textContent, 'after');
  assert.equal(requests.length, 2);

  const rpcRequest = JSON.parse(String(requests[0].init.body));
  assert.equal(rpcRequest.method, 'admin.commands.dispatch');
  assert.equal(rpcRequest.params.data.name, 'esign.agreements.notify_reviewers');
  assert.deepEqual(rpcRequest.params.data.ids, ['agreement-1']);
  assert.equal(rpcRequest.params.data.payload.participant_id, 'participant-1');
  assert.equal(rpcRequest.params.data.payload.recipient_id, '');
  assert.equal(rpcRequest.params.data.payload.tenant_id, 'tenant-1');
  assert.equal(rpcRequest.params.data.payload.org_id, 'org-1');
  assert.equal(dispatches[0].receipt.accepted, true);
  assert.equal(dispatches[0].receipt.mode, 'inline');
  assert.equal(dispatches[0].receipt.commandId, 'esign.agreements.notify_reviewers');
  assert.equal(dispatches[0].receipt.dispatchId, 'dispatch-1');
  assert.equal(dispatches[0].receipt.correlationId, 'corr-1');
  assert.equal(refreshed.length, 1);
  assert.match(refreshed[0], /"status":"approved"/);
});

test('CommandRuntimeController serializes forms for panel actions', async () => {
  setupDom(`<!doctype html>
    <html>
      <body>
        <div id="mount">
          <div id="comment-panel">before</div>
          <form
            id="comment-form"
            data-command-name="create_comment_thread"
            data-command-success="Comment added"
            data-command-refresh="#comment-panel"
          >
            <input type="hidden" name="review_id" value="review-1" />
            <textarea name="body">hello world</textarea>
            <button id="submit-btn" type="submit">Submit</button>
          </form>
        </div>
      </body>
    </html>`);

  const { initCommandRuntime } = await importSourceModule('command-runtime.ts');
  const notifier = createNotifier();
  const requests = [];

  const fetchImpl = async (input, init = {}) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.includes('/actions/create_comment_thread')) {
      return new Response(JSON.stringify({ status: 'ok', data: { ok: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(`<!doctype html>
      <html>
        <body>
          <div id="mount">
            <div id="comment-panel">after</div>
          </div>
        </body>
      </html>`, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  };

  initCommandRuntime({
    mount: document.getElementById('mount'),
    apiBasePath: '/admin/api/v1',
    panelName: 'esign_agreements',
    recordId: 'agreement-1',
    notifier,
    fetchImpl,
  });

  const form = document.getElementById('comment-form');
  const submitter = document.getElementById('submit-btn');
  form.dispatchEvent(new window.SubmitEvent('submit', {
    bubbles: true,
    cancelable: true,
    submitter,
  }));
  await nextTick();
  await nextTick();

  assert.equal(notifier.errors.length, 0);
  assert.deepEqual(notifier.successes, ['Comment added']);
  assert.equal(document.getElementById('comment-panel')?.textContent, 'after');
  assert.equal(requests.length, 2);
  assert.equal(requests[0].url, '/admin/api/v1/panels/esign_agreements/actions/create_comment_thread');

  const actionPayload = JSON.parse(String(requests[0].init.body));
  assert.equal(actionPayload.id, 'agreement-1');
  assert.equal(actionPayload.review_id, 'review-1');
  assert.equal(actionPayload.body, 'hello world');
});

test('CommandRuntimeController uses shared busy behavior for button triggers and busy targets', async () => {
  setupDom(`<!doctype html>
    <html>
      <body>
        <div id="mount">
          <div id="busy-target" aria-busy="false">
            <button
              id="sync-btn"
              type="button"
              data-command-name="sync_status"
              data-command-success="Synced"
              data-command-busy-target="#busy-target"
              data-busy-label="Sending..."
            ><span data-busy-spinner hidden></span><span data-busy-label-target>Sync</span></button>
            <button id="already-disabled" type="button" disabled>Locked</button>
          </div>
        </div>
      </body>
    </html>`);

  const { initCommandRuntime } = await importSourceModule('command-runtime.ts');
  const notifier = createNotifier();
  const gate = deferred();
  const requests = [];
  const fetchImpl = async (input, init = {}) => {
    requests.push({ input, init });
    await gate.promise;
    return new Response(JSON.stringify({ status: 'ok', data: { ok: true } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  initCommandRuntime({
    mount: document.getElementById('mount'),
    apiBasePath: '/admin/api/v1',
    panelName: 'esign_agreements',
    recordId: 'agreement-1',
    notifier,
    fetchImpl,
  });

  document.getElementById('sync-btn').click();
  await nextTick();

  assert.equal(requests.length, 1);
  assert.equal(document.getElementById('busy-target').getAttribute('aria-busy'), 'true');
  assert.equal(document.getElementById('sync-btn').disabled, true);
  assert.equal(document.querySelector('[data-busy-label-target]').textContent, 'Sending...');
  assert.equal(document.querySelector('[data-busy-spinner]').hidden, false);
  assert.equal(document.getElementById('already-disabled').disabled, true);

  gate.resolve();
  await nextTick();
  await nextTick();

  assert.equal(document.getElementById('busy-target').getAttribute('aria-busy'), 'false');
  assert.equal(document.getElementById('sync-btn').disabled, false);
  assert.equal(document.querySelector('[data-busy-label-target]').textContent, 'Sync');
  assert.equal(document.querySelector('[data-busy-spinner]').hidden, true);
  assert.equal(document.getElementById('already-disabled').disabled, true);
  assert.deepEqual(notifier.successes, ['Synced']);
});

test('CommandRuntimeController suppresses duplicate clicks while shared busy state is active', async () => {
  setupDom(`<!doctype html>
    <html>
      <body>
        <div id="mount">
          <button
            id="sync-btn"
            type="button"
            data-command-name="sync_status"
            data-command-success="Synced"
          >Sync</button>
        </div>
      </body>
    </html>`);

  const { initCommandRuntime } = await importSourceModule('command-runtime.ts');
  const gate = deferred();
  const requests = [];
  const fetchImpl = async (input, init = {}) => {
    requests.push({ input, init });
    await gate.promise;
    return new Response(JSON.stringify({ status: 'ok', data: { ok: true } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  initCommandRuntime({
    mount: document.getElementById('mount'),
    apiBasePath: '/admin/api/v1',
    panelName: 'esign_agreements',
    recordId: 'agreement-1',
    notifier: createNotifier(),
    fetchImpl,
  });

  const button = document.getElementById('sync-btn');
  button.click();
  button.click();
  await nextTick();

  assert.equal(requests.length, 1);
  assert.equal(button.getAttribute('aria-busy'), 'true');

  gate.resolve();
  await nextTick();
  await nextTick();
});

test('CommandRuntimeController manual dispatch uses shared busy target state', async () => {
  setupDom(`<!doctype html>
    <html>
      <body>
        <div id="mount">
          <div id="manual-target"><button id="nested">Nested</button></div>
        </div>
      </body>
    </html>`);

  const { initCommandRuntime } = await importSourceModule('command-runtime.ts');
  const gate = deferred();
  const fetchImpl = async () => {
    await gate.promise;
    return new Response(JSON.stringify({ status: 'ok', data: { ok: true } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const controller = initCommandRuntime({
    mount: document.getElementById('mount'),
    apiBasePath: '/admin/api/v1',
    panelName: 'esign_agreements',
    recordId: 'agreement-1',
    notifier: createNotifier(),
    fetchImpl,
  });

  const target = document.getElementById('manual-target');
  const dispatch = controller.dispatch({
    commandName: 'sync_status',
    busyTarget: target,
  });
  await nextTick();

  assert.equal(target.getAttribute('aria-busy'), 'true');
  assert.equal(document.getElementById('nested').disabled, true);

  gate.resolve();
  const detail = await dispatch;

  assert.equal(detail.success, true);
  assert.equal(target.hasAttribute('aria-busy'), false);
  assert.equal(document.getElementById('nested').disabled, false);
});

test('CommandRuntimeController routes duplicate success-body parsing through one local helper', () => {
  const source = fs.readFileSync(commandRuntimeSourcePath, 'utf8');

  assert.match(source, /async function readCommandResponseBody\(response: Response\): Promise<unknown>/);
  assert.match(source, /const body = await readCommandResponseBody\(response\);/);
  assert.match(source, /from '\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(source, /readHTTPJSONValue<unknown>\(response, null\)/);
  assert.equal((source.match(/response\.json\(\)\.catch\(\(\) => null\)/g) || []).length, 0);
});
