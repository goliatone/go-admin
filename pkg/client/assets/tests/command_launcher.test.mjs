import test, { beforeEach } from 'node:test';
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
  } catch {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();
const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.resolve(testFileDir, '../src/debug/shared/panels/command-launcher.ts');
const panelActionsPath = path.resolve(testFileDir, '../src/debug/shared/panel-actions.ts');

async function importLauncher() {
  const stats = fs.statSync(sourcePath);
  const outputPath = path.join(
    os.tmpdir(),
    `go-admin-command-launcher-${crypto.createHash('sha1').update(`${sourcePath}:${stats.mtimeMs}`).digest('hex')}.mjs`
  );
  if (!fs.existsSync(outputPath)) {
    await build({
      entryPoints: [sourcePath],
      outfile: outputPath,
      bundle: true,
      format: 'esm',
      platform: 'browser',
      target: ['es2020'],
      logLevel: 'silent',
    });
  }
  return import(`${pathToFileURL(outputPath).href}`);
}

async function importPanelActions() {
  const outputPath = path.join(os.tmpdir(), `go-admin-panel-actions-${crypto.createHash('sha1').update(panelActionsPath).digest('hex')}.mjs`);
  await build({
    entryPoints: [panelActionsPath],
    outfile: outputPath,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: ['es2020'],
    logLevel: 'silent',
  });
  return import(`${pathToFileURL(outputPath).href}?${Date.now()}`);
}

const serverDefsPath = path.resolve(testFileDir, '../src/debug/shared/server-definitions.ts');
let integrationModule;

// Bundle command-launcher (side-effect registers the override) together with
// server-definitions so they share one module graph / override registry.
async function importIntegration() {
  if (integrationModule) {
    return integrationModule;
  }
  const out = path.join(os.tmpdir(), `go-admin-cmdl-integration-${crypto.createHash('sha1').update(`${sourcePath}:${serverDefsPath}`).digest('hex')}.mjs`);
  await build({
    stdin: {
      contents: `import ${JSON.stringify(sourcePath)};\nexport { panelDefinitionFromServer, registerServerPanelConsoleRenderer } from ${JSON.stringify(serverDefsPath)};`,
      resolveDir: testFileDir,
      loader: 'ts',
    },
    outfile: out,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: ['es2020'],
    logLevel: 'silent',
  });
  // The server-definitions graph pulls in syntax highlighting (prismjs), which
  // touches DOM globals at module load — set them up before importing.
  setWindowGlobals(new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' }).window);
  integrationModule = await import(`${pathToFileURL(out).href}`);
  return integrationModule;
}

function sampleDef() {
  return {
    id: 'commands',
    ui: {
      schema_version: '1',
      actions: [
        {
          id: 'dispatch_archive_generate',
          label: 'Generate projections',
          submit_label: 'Run command',
          confirm_text: 'Run Generate projections?',
          requires_confirm: true,
          payload: { command_id: 'archive.generate_projections', payload: {}, options: { mode: 'queued' } },
          form: {
            renderer: 'formgen',
            operation_id: 'dispatch_archive_generate.edit',
            html: '<div data-formgen-auto-init="true"><label for="fg-batch">Batch size</label><input id="fg-batch" name="batch_size" type="number" value="100"></div>',
          },
        },
        {
          id: 'dispatch_search_health',
          label: 'Search health',
          payload: { command_id: 'search.health', payload: {}, options: { mode: 'inline' } },
          form: { renderer: 'formgen', operation_id: 'dispatch_search_health.edit', html: '' },
        },
      ],
    },
  };
}

function sampleData() {
  return {
    commands: [
      { id: 'archive.generate_projections', group: 'Archive', summary: 'Generate archive content projections', mutating: true, execution_mode: 'queued', tags: ['batch'] },
      { id: 'search.health', group: 'Search', mutating: false, execution_mode: 'inline' },
    ],
    diagnostics: [{ severity: 'warning', code: 'option_provider_unavailable', message: 'No option provider configured' }],
  };
}

function generatedDef({ sensitive = false } = {}) {
  return {
    id: 'commands',
    ui: {
      schema_version: '1',
      actions: [{
        id: 'dispatch_generated',
        label: 'Generated command',
        payload: { command_id: 'generated.run', payload: {}, options: { mode: 'inline' } },
        form: {
          renderer: 'formgen',
          operation_id: 'dispatch_generated.edit',
          sensitive,
          html: '<div data-formgen-auto-init="true"><label for="fg-count">Count</label><input id="fg-count" name="count" type="number" value="7"></div>',
        },
      }],
    },
  };
}

function generatedData() {
  return { commands: [{ id: 'generated.run', group: 'Generated', execution_mode: 'inline' }], diagnostics: [] };
}

function installFormgenRuntime(initial = {}) {
  let values = structuredClone(initial);
  const controller = () => ({
    getValues: () => structuredClone(values),
    setValues(next) { values = structuredClone(next); },
    setErrors() {},
    clearErrors() {},
    onChange() { return () => {}; },
    focus() { return true; },
    destroy() {},
  });
  globalThis.FormgenRelationships = {
    async initFormgenRoot() { return { destroy() {} }; },
    Formgen: { attach: controller },
  };
  return {
    get: () => structuredClone(values),
    set(next) { values = structuredClone(next); },
  };
}

function setWindowGlobals(win) {
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.Element = win.Element;
  globalThis.Node = win.Node;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.HTMLFormElement = win.HTMLFormElement;
  globalThis.HTMLInputElement = win.HTMLInputElement;
  globalThis.HTMLSelectElement = win.HTMLSelectElement;
  globalThis.HTMLTextAreaElement = win.HTMLTextAreaElement;
  globalThis.CSS = win.CSS;
  Object.defineProperty(globalThis, 'localStorage', { value: win.localStorage, configurable: true, writable: true });
}

function mount(html) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="host">${html}</div></body></html>`, { url: 'http://localhost/' });
  setWindowGlobals(dom.window);
  return dom;
}

// Launcher session state is module-global by design (survives re-render); reset
// it between tests so cases stay isolated.
beforeEach(async () => {
  const { resetCommandLauncherState } = await importLauncher();
  resetCommandLauncherState();
  try { globalThis.localStorage?.clear(); } catch { /* no storage */ }
  delete globalThis.FormgenRelationships;
  delete globalThis.Formgen;
});

test('generated forms use the formgen controller for values, errors, drafts, and teardown', async () => {
  const {
    renderCommandLauncherConsole,
    attachCommandLauncherListeners,
    applyCommandLauncherControllerErrors,
  } = await importLauncher();
  const calls = { init: 0, attach: 0, setValues: [], errors: [], focus: [], destroy: 0 };
  let changeCallback;
  let values = { count: 7 };
  const runtime = {
    async initFormgenRoot(root) {
      calls.init += 1;
      assert.equal(root.hasAttribute('data-formgen-auto-init'), true);
      return { destroy() {} };
    },
    Formgen: {
      attach() {
        calls.attach += 1;
        return {
          getValues: () => ({ ...values }),
          setValues(next) { calls.setValues.push(next); values = { ...next }; },
          setErrors(next) { calls.errors.push(next); },
          clearErrors() {},
          onChange(callback) { changeCallback = callback; return () => {}; },
          focus(name) { calls.focus.push(name); return true; },
          destroy() { calls.destroy += 1; },
        };
      },
    },
  };
  globalThis.FormgenRelationships = runtime;

  const first = mount(renderCommandLauncherConsole({ def: generatedDef(), data: generatedData(), styles: {}, useIconCopyButton: true }));
  const firstHost = first.window.document.querySelector('#host');
  attachCommandLauncherListeners(firstHost);
  firstHost.querySelector('[data-cmdl-item]').dispatchEvent(new first.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));

  const form = firstHost.querySelector('[data-panel-action-form]');
  assert.equal(calls.init, 1);
  assert.equal(calls.attach, 2);
  assert.equal(form.querySelector('[data-cmdl-formgen-submit]').disabled, false);
  assert.deepEqual(JSON.parse(form.querySelector('[data-cmdl-controller-payload]').value), { count: 7 });

  values = { count: 12 };
  changeCallback(values, new first.window.Event('input'));
  assert.deepEqual(JSON.parse(form.querySelector('[data-cmdl-controller-payload]').value), { count: 12 });
  assert.equal(applyCommandLauncherControllerErrors('dispatch_generated', { 'payload.count': 'too large' }), true);
  assert.deepEqual(calls.errors.at(-1), { count: 'too large' });
  assert.equal(calls.focus.at(-1), 'count');

  const second = mount(renderCommandLauncherConsole({ def: generatedDef(), data: generatedData(), styles: {}, useIconCopyButton: true }));
  const secondHost = second.window.document.querySelector('#host');
  attachCommandLauncherListeners(secondHost);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(calls.destroy, 3);
  assert.deepEqual(calls.setValues.at(-1), { count: 12 });
});

test('Reset delegates default restoration to the formgen controller', async () => {
  const { renderCommandLauncherConsole, attachCommandLauncherListeners } = await importLauncher();
  let values = { count: 7 };
  let resets = 0;
  const controller = () => ({
    getValues: () => ({ ...values }),
    setValues(next) { values = { ...next }; },
    reset() { resets += 1; values = { count: 7 }; },
    setErrors() {},
    clearErrors() {},
    onChange() { return () => {}; },
    focus() { return true; },
    destroy() {},
  });
  globalThis.FormgenRelationships = {
    async initFormgenRoot() { return { destroy() {} }; },
    Formgen: { attach: controller },
  };

  const dom = mount(renderCommandLauncherConsole({ def: generatedDef(), data: generatedData(), styles: {}, useIconCopyButton: true }));
  const host = dom.window.document.querySelector('#host');
  attachCommandLauncherListeners(host);
  host.querySelector('[data-cmdl-item]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));

  const form = host.querySelector('[data-panel-action-form]');
  values = { count: 99 };
  form.dispatchEvent(new dom.window.Event('reset', { bubbles: true, cancelable: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(resets, 1);
  assert.deepEqual(JSON.parse(form.querySelector('[data-cmdl-controller-payload]').value), { count: 7 });
});

test('generated dynamic options adapt formgen requests to the protected panel action with current values and CSRF', async () => {
  const { renderCommandLauncherConsole, attachCommandLauncherListeners } = await importLauncher();
  const def = generatedDef();
  def.ui.metadata = { option_resolver_action: 'resolve_options' };
  let adaptedRequest;
  const controller = {
    getValues: () => ({ region: 'us', nested: { kind: 'archive' } }),
    setValues() {}, setErrors() {}, clearErrors() {}, onChange() { return () => {}; }, focus() { return true; }, destroy() {},
  };
  globalThis.FormgenRelationships = {
    async initFormgenRoot(_root, config) {
      const request = {
        url: 'command-options://generated.run/target?command_id=generated.run&field_path=target&source_id=targets.available&dependency_1=us',
        init: { method: 'POST', headers: { Accept: 'application/json' }, signal: new AbortController().signal },
      };
      await config.beforeFetch({ element: _root.querySelector('input'), request });
      adaptedRequest = request;
      return { destroy() {} };
    },
    Formgen: { attach: () => controller },
  };
  const dom = mount(renderCommandLauncherConsole({ def, data: generatedData(), styles: {}, useIconCopyButton: true }));
  const meta = dom.window.document.createElement('meta');
  meta.name = 'csrf-token';
  meta.content = 'csrf-test';
  dom.window.document.head.appendChild(meta);
  const host = dom.window.document.querySelector('#host');
  attachCommandLauncherListeners(host, { debugPath: '/admin/debug' });
  host.querySelector('[data-cmdl-item]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(adaptedRequest.url, '/admin/debug/api/panels/commands/actions/resolve_options');
  assert.equal(adaptedRequest.init.method, 'POST');
  assert.equal(adaptedRequest.init.credentials, 'same-origin');
  assert.equal(new Headers(adaptedRequest.init.headers).get('X-CSRF-Token'), 'csrf-test');
  assert.deepEqual(JSON.parse(adaptedRequest.init.body), {
    command_id: 'generated.run',
    field_path: 'target',
    source_id: 'targets.available',
    payload: { region: 'us', nested: { kind: 'archive' } },
  });
  assert.equal(adaptedRequest.init.signal.aborted, false);
});

test('generated sensitive forms mark the controller bridge sensitive and disable recall/JSON persistence', async () => {
  const { renderCommandLauncherConsole } = await importLauncher();
  const { panelActionHasSensitiveFields, buildPanelActionPayload } = await importPanelActions();
  const dom = mount(renderCommandLauncherConsole({ def: generatedDef({ sensitive: true }), data: generatedData(), styles: {}, useIconCopyButton: true }));
  const form = dom.window.document.querySelector('[data-panel-action-form]');
  const bridge = form.querySelector('[data-cmdl-controller-payload]');
  bridge.value = JSON.stringify({ token: 'live-only' });
  assert.equal(panelActionHasSensitiveFields(form), true);
  assert.deepEqual(buildPanelActionPayload(form), { command_id: 'generated.run', payload: { token: 'live-only' }, options: { mode: 'inline' } });
  assert.deepEqual(buildPanelActionPayload(form, { excludeSensitive: true }), { command_id: 'generated.run', options: { mode: 'inline' } });
  assert.equal(form.querySelector('[data-cmdl-recall]'), null);
  assert.equal(form.querySelector('[data-cmdl-json-toggle]'), null);
});

test('renders grouped catalog with execution + mutating badges', async () => {
  const { renderCommandLauncherConsole } = await importLauncher();
  const html = renderCommandLauncherConsole({ def: sampleDef(), data: sampleData(), styles: {}, useIconCopyButton: true });

  assert.match(html, /cmdl-group__label[^>]*>Archive</);
  assert.match(html, /cmdl-group__label[^>]*>Search</);
  // archive command: queued dot + mutating flag
  assert.match(html, /data-cmdl-item="dispatch_archive_generate"[\s\S]*?cmdl-item__dot--queued/);
  assert.match(html, /cmdl-item__flag--mutating/);
  // search command: inline dot + read flag
  assert.match(html, /data-cmdl-item="dispatch_search_health"[\s\S]*?cmdl-item__dot--inline/);
  assert.match(html, /cmdl-item__flag--read/);
  // diagnostics + result container present
  assert.match(html, /cmdl-diag--warning/);
  assert.match(html, /data-panel-action-result="commands"/);
});

test('generated commands with empty HTML render a no-arguments form', async () => {
  const { renderCommandLauncherConsole } = await importLauncher();
  const html = renderCommandLauncherConsole({ def: sampleDef(), data: sampleData(), styles: {}, useIconCopyButton: true });
  assert.match(html, /data-cmdl-detail="dispatch_search_health"[\s\S]*?cmdl-form__noargs/);
});

test('clicking a catalog row reveals its form; filtering narrows the list', async () => {
  const { renderCommandLauncherConsole, attachCommandLauncherListeners } = await importLauncher();
  const html = renderCommandLauncherConsole({ def: sampleDef(), data: sampleData(), styles: {}, useIconCopyButton: true });
  const dom = mount(html);
  const host = dom.window.document.getElementById('host');
  installFormgenRuntime({ batch_size: 100 });
  attachCommandLauncherListeners(host);
  host.querySelector('[data-cmdl-item="dispatch_archive_generate"]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));

  const archiveItem = host.querySelector('[data-cmdl-item="dispatch_archive_generate"]');
  archiveItem.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

  const detail = host.querySelector('[data-cmdl-detail="dispatch_archive_generate"]');
  assert.equal(detail.hidden, false);
  assert.equal(host.querySelector('[data-cmdl-detail="dispatch_search_health"]').hidden, true);
  assert.equal(host.querySelector('[data-cmdl-empty]').hidden, true);
  assert.ok(archiveItem.classList.contains('cmdl-item--active'));

  const filter = host.querySelector('[data-cmdl-filter]');
  filter.value = 'search';
  filter.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  assert.equal(host.querySelector('[data-cmdl-item="dispatch_archive_generate"]').hidden, true);
  assert.equal(host.querySelector('[data-cmdl-item="dispatch_search_health"]').hidden, false);
});

test('mutating commands confirm inline instead of using a browser dialog', async () => {
  const { renderCommandLauncherConsole, attachCommandLauncherListeners } = await importLauncher();
  const html = renderCommandLauncherConsole({ def: sampleDef(), data: sampleData(), styles: {}, useIconCopyButton: true });
  const dom = mount(html);
  const host = dom.window.document.getElementById('host');
  installFormgenRuntime({ batch_size: 100 });
  attachCommandLauncherListeners(host);
  host.querySelector('[data-cmdl-item="dispatch_archive_generate"]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));

  const form = host.querySelector('[data-action-id="dispatch_archive_generate"]');
  // The launcher owns confirmation: it tells the host to skip window.confirm.
  assert.equal(form.getAttribute('data-action-confirm-inline'), 'true');
  assert.equal(form.getAttribute('data-cmdl-confirm'), 'true');

  const barMain = form.querySelector('[data-cmdl-bar-main]');
  const confirmRow = form.querySelector('[data-cmdl-confirm-row]');
  assert.equal(barMain.hidden, false);
  assert.equal(confirmRow.hidden, true);

  // Stand in for the host dispatcher: a bubble-phase submit listener above the
  // launcher root. The inline gate runs in the capture phase, so a blocked submit
  // never reaches here.
  let dispatched = 0;
  host.addEventListener('submit', (event) => {
    event.preventDefault();
    dispatched += 1;
  });

  // First submit (a click or Enter) is gated: it reveals the inline confirm row
  // and never reaches the dispatcher.
  const submitOnce = new dom.window.Event('submit', { bubbles: true, cancelable: true });
  form.dispatchEvent(submitOnce);
  assert.equal(submitOnce.defaultPrevented, true);
  assert.equal(dispatched, 0);
  assert.equal(confirmRow.hidden, false);
  assert.equal(barMain.hidden, true);

  // Arming (what the "Confirm run" click does) lets the next submit through to the
  // dispatcher, then the inline confirm UI resets.
  form.dataset.cmdlArmed = 'true';
  const submitArmed = new dom.window.Event('submit', { bubbles: true, cancelable: true });
  form.dispatchEvent(submitArmed);
  assert.equal(dispatched, 1);
  assert.equal(form.dataset.cmdlArmed, undefined);
  assert.equal(confirmRow.hidden, true);
  assert.equal(barMain.hidden, false);
});

test('clicking Confirm run arms the form and dispatches', async () => {
  const { renderCommandLauncherConsole, attachCommandLauncherListeners } = await importLauncher();
  const html = renderCommandLauncherConsole({ def: sampleDef(), data: sampleData(), styles: {}, useIconCopyButton: true });
  const dom = mount(html);
  const host = dom.window.document.getElementById('host');
  installFormgenRuntime({ batch_size: 100 });
  attachCommandLauncherListeners(host);
  host.querySelector('[data-cmdl-item="dispatch_archive_generate"]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));
  const form = host.querySelector('[data-action-id="dispatch_archive_generate"]');
  let dispatched = 0;
  host.addEventListener('submit', (event) => {
    event.preventDefault();
    dispatched += 1;
  });

  // Reveal the confirm row, then click "Confirm run".
  form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  form.querySelector('[data-cmdl-confirm-run]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  // The click both arms the form and triggers the native submit, so the command
  // reaches the dispatcher and the inline confirm UI resets.
  assert.equal(dispatched, 1);
  assert.equal(form.dataset.cmdlArmed, undefined);
  assert.equal(form.querySelector('[data-cmdl-confirm-row]').hidden, true);
});

test('read-only commands dispatch immediately without inline confirmation', async () => {
  const { renderCommandLauncherConsole } = await importLauncher();
  const html = renderCommandLauncherConsole({ def: sampleDef(), data: sampleData(), styles: {}, useIconCopyButton: true });
  const dom = mount(html);
  const form = dom.window.document.querySelector('[data-action-id="dispatch_search_health"]');
  assert.equal(form.getAttribute('data-cmdl-confirm'), 'false');
  assert.equal(form.getAttribute('data-action-confirm-inline'), null);
  assert.equal(form.querySelector('[data-cmdl-confirm-row]'), null);
});

test('master list width persists and is adjustable via keyboard', async () => {
  const { renderCommandLauncherConsole, attachCommandLauncherListeners } = await importLauncher();
  const html = renderCommandLauncherConsole({ def: sampleDef(), data: sampleData(), styles: {}, useIconCopyButton: true });
  const dom = mount(html);
  // Persisted width is restored on attach (the panel re-renders on every snapshot).
  globalThis.localStorage.setItem('cmdl:sidebar-width', '300');
  const host = dom.window.document.getElementById('host');
  attachCommandLauncherListeners(host);

  const body = host.querySelector('[data-cmdl-body]');
  assert.equal(body.style.getPropertyValue('--cmdl-sidebar-w'), '300px');

  const resizer = host.querySelector('[data-cmdl-resizer]');
  resizer.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.equal(body.style.getPropertyValue('--cmdl-sidebar-w'), '324px');
  assert.equal(globalThis.localStorage.getItem('cmdl:sidebar-width'), '324');

  resizer.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
  assert.equal(body.style.getPropertyValue('--cmdl-sidebar-w'), '300px');
});

test('extractCommandLauncherResult parses receipt, validation errors and kinds', async () => {
  const { extractCommandLauncherResult } = await importLauncher();

  const ok = extractCommandLauncherResult('ok', 'Command dispatched', {
    receipt: { Accepted: true, Mode: 'queued', CorrelationID: 'corr-123', DispatchID: 'disp-9' },
  });
  assert.equal(ok.kind, 'ok');
  assert.equal(ok.correlationId, 'corr-123');
  assert.equal(ok.mode, 'queued');
  assert.equal(ok.dispatchId, 'disp-9');

  const invalid = extractCommandLauncherResult('ok', 'Command dispatched', {
    receipt: { Accepted: false },
    validation_errors: [{ path: 'batch_size', message: 'must be <= 1000', code: 'max' }],
  });
  assert.equal(invalid.kind, 'invalid');
  assert.equal(invalid.code, 'VALIDATION_ERROR');
  assert.equal(invalid.validationErrors.length, 1);
  assert.equal(invalid.validationErrors[0].path, 'batch_size');

  const failed = extractCommandLauncherResult('error', 'Forbidden', undefined);
  assert.equal(failed.kind, 'error');
  assert.equal(failed.message, 'Forbidden');
});

test('renderCommandLauncherResultCard surfaces status, code, meta and validation', async () => {
  const { extractCommandLauncherResult, renderCommandLauncherResultCard } = await importLauncher();
  const parsed = extractCommandLauncherResult('ok', 'Command dispatched', {
    receipt: { Accepted: false, Mode: 'queued', CorrelationID: 'corr-123' },
    validation_errors: [{ path: 'batch_size', message: 'must be <= 1000' }],
  });
  const card = renderCommandLauncherResultCard(parsed);
  assert.match(card, /cmdl-result__card--invalid/);
  assert.match(card, /Validation failed/);
  assert.match(card, /cmdl-result__code">VALIDATION_ERROR/);
  assert.match(card, /corr-123/);
  assert.match(card, /must be &lt;= 1000/);
  assert.match(card, /cmdl-result__path">batch_size/);

  const okCard = renderCommandLauncherResultCard(
    extractCommandLauncherResult('ok', 'Command dispatched', { receipt: { Accepted: true, Mode: 'inline' } })
  );
  assert.match(okCard, /cmdl-result__card--ok/);
  assert.match(okCard, /Command dispatched/);
  assert.doesNotMatch(okCard, /data-cmdl-retry/);

  const retryCard = renderCommandLauncherResultCard(
    extractCommandLauncherResult('ok', 'Command dispatched', { receipt: { Accepted: true, Mode: 'inline' } }),
    { canRetry: true }
  );
  assert.match(retryCard, /data-cmdl-retry/);
  assert.match(retryCard, />Retry</);
});

// A go-errors style rich error envelope (HTTP 500 body) — abbreviated.
function richErrorEnvelope() {
  return {
    error: {
      category: 'internal',
      code: 500,
      text_code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      source: 'archive cms variant repair requires event_ids or session_ids',
      metadata: { method: 'POST', path: '/admin/debug/api/panels/commands/actions/dispatch_archive_cms_variants_repair' },
      timestamp: '2026-06-18T14:37:39-07:00',
      stack_trace: [
        { function: 'github.com/goliatone/go-admin/admin.presentError', file: '/Users/x/go/pkg/mod/github.com/goliatone/go-admin@v0.100.0/admin/error_presenter.go', line: 93 },
        { function: 'github.com/Garchen-Archive/garchen-archive-admin/internal/adminapp.(*Module).prepareAdminServer.debugSessionMiddleware.func39.1', file: '/Users/x/Development/garchen-archive-admin/internal/adminapp/module.go', line: 1260 },
      ],
      location: { file: '/Users/x/go/pkg/mod/github.com/goliatone/go-admin@v0.100.0/admin/debug_transport.go', line: 580, function: 'github.com/goliatone/go-admin/admin.(*DebugModule).handleDebugPanelAction' },
      severity: 'ERROR',
    },
  };
}

test('extractCommandLauncherResult surfaces a rich error envelope', async () => {
  const { extractCommandLauncherResult } = await importLauncher();
  const parsed = extractCommandLauncherResult('error', 'An unexpected error occurred', richErrorEnvelope());
  assert.equal(parsed.kind, 'error');
  // text_code is preferred over the numeric HTTP code for the code pill.
  assert.equal(parsed.code, 'INTERNAL_ERROR');
  assert.ok(parsed.richError);
  assert.equal(parsed.richError.category, 'internal');
  assert.equal(parsed.richError.severity, 'ERROR');
  assert.equal(parsed.richError.httpCode, '500');
  assert.equal(parsed.richError.source, 'archive cms variant repair requires event_ids or session_ids');
  assert.equal(parsed.richError.metadata.find((m) => m.key === 'method').value, 'POST');
  assert.equal(parsed.richError.stackTrace.length, 2);
  // first-party frame flagged; module-cache (dependency) frame not.
  assert.equal(parsed.richError.stackTrace.find((f) => f.funcTitle.includes('adminapp')).app, true);
  assert.equal(parsed.richError.stackTrace.find((f) => f.funcTitle.includes('go-admin/admin.presentError')).app, false);
  assert.match(parsed.richError.location, /debug_transport\.go:580/);
});

test('renderCommandLauncherResultCard renders cause, metadata chips and stack trace', async () => {
  const { extractCommandLauncherResult, renderCommandLauncherResultCard } = await importLauncher();
  const card = renderCommandLauncherResultCard(
    extractCommandLauncherResult('error', 'An unexpected error occurred', richErrorEnvelope())
  );
  assert.match(card, /cmdl-result__card--error/);
  assert.match(card, /cmdl-result__code">INTERNAL_ERROR/);
  assert.match(card, /cmdl-result__cause/);
  assert.match(card, /archive cms variant repair requires event_ids or session_ids/);
  assert.match(card, /POST/);
  assert.match(card, /dispatch_archive_cms_variants_repair/);
  assert.match(card, /internal/);
  assert.match(card, /Stack trace · 2 frames/);
  assert.match(card, /cmdl-trace__frame--app/);
  assert.match(card, /debug_transport\.go:580/);
  // every result card is dismissable.
  assert.match(card, /data-cmdl-dismiss/);
});

test('result card without a rich error stays minimal', async () => {
  const { extractCommandLauncherResult, renderCommandLauncherResultCard } = await importLauncher();
  const card = renderCommandLauncherResultCard(extractCommandLauncherResult('error', 'Forbidden', undefined));
  assert.doesNotMatch(card, /cmdl-result__cause/);
  assert.doesNotMatch(card, /cmdl-result__trace/);
  assert.match(card, /data-cmdl-dismiss/);
});

test('result panel is docked inside the detail column', async () => {
  const { renderCommandLauncherConsole } = await importLauncher();
  const html = renderCommandLauncherConsole({ def: sampleDef(), data: sampleData(), styles: {}, useIconCopyButton: true });
  // The result target now lives within the detail column, not as a trailing
  // full-width strip under the whole master-detail body.
  const detailStart = html.indexOf('class="cmdl__detail"');
  const detailEnd = html.indexOf('</section>', detailStart);
  const detailSection = html.slice(detailStart, detailEnd);
  assert.match(detailSection, /data-panel-action-result="commands"/);
  // And only one such target exists.
  assert.equal(html.split('data-panel-action-result="commands"').length - 1, 1);
});

// ---- IR2-M1: visible-but-not-executable commands ----
test('shows visible-but-not-executable commands as locked, with no form', async () => {
  const { renderCommandLauncherConsole } = await importLauncher();
  const def = {
    id: 'commands',
    ui: {
      schema_version: '1',
      actions: [
        {
          id: 'dispatch_run_x',
          label: 'Run X',
          payload: { command_id: 'demo.x', payload: {}, options: { mode: 'inline' } },
          form: { renderer: 'formgen', operation_id: 'dispatch_run_x.edit', html: '<div data-formgen-auto-init="true"><input name="note"></div>' },
        },
      ],
    },
  };
  const data = {
    commands: [
      { id: 'demo.x', group: 'Demo', mutating: false, execution_mode: 'inline' },
      { id: 'demo.locked', group: 'Demo', mutating: true, execution_mode: 'queued' },
    ],
    diagnostics: [],
  };
  const html = renderCommandLauncherConsole({ def, data, styles: {}, useIconCopyButton: true });
  assert.match(html, /data-cmdl-item="dispatch_run_x"/);
  assert.match(html, /data-cmdl-item="cmd:demo\.locked"[\s\S]*?cmdl-item__flag--locked/);
  assert.match(html, /data-cmdl-detail="cmd:demo\.locked"[\s\S]*?cmdl-locked-note/);
  // exactly one dispatch form (only the executable command)
  assert.equal((html.match(/data-panel-action-form/g) || []).length, 1);
});

test('catalog shows visible commands even when nothing is executable', async () => {
  const { renderCommandLauncherConsole } = await importLauncher();
  const def = { id: 'commands', ui: { schema_version: '1', actions: [] } };
  const data = { commands: [{ id: 'demo.readonly', group: 'Demo', execution_mode: 'inline' }], diagnostics: [] };
  const html = renderCommandLauncherConsole({ def, data, styles: {}, useIconCopyButton: true });
  assert.match(html, /data-cmdl-item="cmd:demo\.readonly"/);
  assert.doesNotMatch(html, /No commands are available to run/);
});

test('actions without a generated form stay visible but cannot fall back to launcher fields', async () => {
  const { renderCommandLauncherConsole } = await importLauncher();
  const def = {
    id: 'commands',
    ui: { actions: [{
      id: 'dispatch_legacy',
      payload: { command_id: 'demo.legacy' },
      fields: [{ name: 'unsafe_fallback', kind: 'string' }],
    }] },
  };
  const data = { commands: [{ id: 'demo.legacy', group: 'Demo' }], diagnostics: [] };
  const html = renderCommandLauncherConsole({ def, data, styles: {}, useIconCopyButton: true });
  assert.match(html, /data-cmdl-item="cmd:demo\.legacy"/);
  assert.match(html, /cmdl-locked-note/);
  assert.doesNotMatch(html, /data-panel-action-form|unsafe_fallback/);
});

// ---- IR2-L1: rejected without validation errors ----
test('rejected-without-validation result is not mislabeled VALIDATION_ERROR', async () => {
  const { extractCommandLauncherResult, renderCommandLauncherResultCard } = await importLauncher();
  const parsed = extractCommandLauncherResult('ok', 'Rejected', { receipt: { Accepted: false } });
  assert.equal(parsed.kind, 'invalid');
  assert.equal(parsed.code, '');
  const card = renderCommandLauncherResultCard(parsed);
  assert.match(card, /Not accepted/);
  assert.doesNotMatch(card, /VALIDATION_ERROR/);
});

// ---- IR2-H1: form drafts survive a re-render ----
test('keyboard: ArrowDown from filter focuses first item, Enter selects it', async () => {
  const { renderCommandLauncherConsole, attachCommandLauncherListeners } = await importLauncher();
  const dom = mount(renderCommandLauncherConsole({ def: sampleDef(), data: sampleData(), styles: {}, useIconCopyButton: true }));
  const host = dom.window.document.getElementById('host');
  attachCommandLauncherListeners(host);
  const filter = host.querySelector('[data-cmdl-filter]');
  filter.focus();
  filter.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  const firstItem = host.querySelectorAll('[data-cmdl-item]')[0];
  assert.equal(dom.window.document.activeElement, firstItem);
  firstItem.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  const key = firstItem.getAttribute('data-cmdl-item');
  assert.equal(host.querySelector(`[data-cmdl-detail="${key}"]`).hidden, false);
});

// ---- result card timestamp + duration ----
test('result card renders round-trip duration and timestamp when provided', async () => {
  const { extractCommandLauncherResult, renderCommandLauncherResultCard } = await importLauncher();
  const parsed = extractCommandLauncherResult('ok', 'Command dispatched', { receipt: { Accepted: true, Mode: 'inline' } });
  const card = renderCommandLauncherResultCard(parsed, { at: 1700000000000, durationMs: 142 });
  assert.match(card, /142ms/);
  assert.match(card, /\d{1,2}:\d{2}/);
});

// ---- IR-T1: hydration → console override integration ----
test('panelDefinitionFromServer applies the commands console override (filters off); other panels stay generic', async () => {
  const { panelDefinitionFromServer } = await importIntegration();
  const commandsDef = panelDefinitionFromServer({
    id: 'commands',
    label: 'Commands',
    ui: {
      schema_version: '1',
      views: { console: { renderer: 'stack', sections: [] } },
      actions: [{
        id: 'dispatch_x',
        label: 'X',
        payload: { command_id: 'demo.x', payload: {}, options: { mode: 'inline' } },
        form: { renderer: 'formgen', operation_id: 'dispatch_x.edit', html: '' },
      }],
    },
  });
  assert.ok(commandsDef);
  assert.equal(commandsDef.showFilters, false);
  const data = { commands: [{ id: 'demo.x', group: 'Demo', execution_mode: 'inline' }], diagnostics: [] };
  assert.match(commandsDef.renderConsole(data, {}, {}), /data-cmdl-root/);

  const otherDef = panelDefinitionFromServer({
    id: 'cache',
    label: 'Cache',
    ui: {
      schema_version: '1',
      views: { console: { renderer: 'json', bind: '$' } },
      actions: [{
        id: 'authenticate',
        label: 'Authenticate',
        fields: [{ name: 'token', label: 'Token', sensitive: true, payload_path: 'credentials.token' }],
      }],
    },
  });
  const otherHTML = otherDef.renderConsole({ a: 1 }, {}, {});
  assert.doesNotMatch(otherHTML, /data-cmdl-root/);
  assert.match(otherHTML, /type="password"[^>]*data-action-field-sensitive="true"/);
  assert.match(otherHTML, /autocomplete="new-password"/);
});

// ---- Phase 3 T11: live command status over the debug WS ----
test('applyCommandLauncherStatusEvent stores live status and guards terminal states', async () => {
  const { applyCommandLauncherStatusEvent, getCommandLauncherLiveStatus } = await importLauncher();
  applyCommandLauncherStatusEvent({ correlation_id: 'c1', state: 'accepted' });
  assert.equal(getCommandLauncherLiveStatus('c1').state, 'accepted');
  applyCommandLauncherStatusEvent({ correlation_id: 'c1', state: 'running' });
  assert.equal(getCommandLauncherLiveStatus('c1').state, 'running');
  applyCommandLauncherStatusEvent({ correlation_id: 'c1', state: 'completed', message: 'done' });
  assert.equal(getCommandLauncherLiveStatus('c1').state, 'completed');
  // A late/stray earlier state must not regress a terminal one.
  applyCommandLauncherStatusEvent({ correlation_id: 'c1', state: 'accepted' });
  assert.equal(getCommandLauncherLiveStatus('c1').state, 'completed');
  // PascalCase keys (Go DispatchReceipt) are also accepted.
  applyCommandLauncherStatusEvent({ CorrelationID: 'c2', State: 'failed' });
  assert.equal(getCommandLauncherLiveStatus('c2').state, 'failed');
});

test('result card renders the live status pill', async () => {
  const { extractCommandLauncherResult, renderCommandLauncherResultCard } = await importLauncher();
  const parsed = extractCommandLauncherResult('ok', 'Command dispatched', { receipt: { Accepted: true, Mode: 'queued', CorrelationID: 'c9' } });
  const card = renderCommandLauncherResultCard(parsed, { liveStatus: { state: 'completed', message: 'done', at: '', code: '' } });
  assert.match(card, /cmdl-result__live--completed/);
  assert.match(card, />completed</);
});

// ---- Phase 3 T12: recent & saved invocations ----
test('recording an invocation surfaces a recall chip that loads it into the form', async () => {
  const { renderCommandLauncherConsole, attachCommandLauncherListeners, recordCommandLauncherInvocation } = await importLauncher();
  const dom = mount(renderCommandLauncherConsole({ def: sampleDef(), data: sampleData(), styles: {}, useIconCopyButton: true }));
  const host = dom.window.document.getElementById('host');
  const state = installFormgenRuntime({ batch_size: 100 });
  recordCommandLauncherInvocation({ command_id: 'archive.generate_projections', payload: { batch_size: 500, event_ids: ['evt_x'] } });
  attachCommandLauncherListeners(host);
  host.querySelector('[data-cmdl-item="dispatch_archive_generate"]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));

  const recall = host.querySelector('[data-cmdl-recall][data-cmdl-command="archive.generate_projections"]');
  const chip = recall.querySelector('[data-cmdl-load="recent:0"]');
  assert.ok(chip);
  chip.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.deepEqual(state.get(), { batch_size: 500, event_ids: ['evt_x'] });
});

test('saving and deleting a preset round-trips through storage', async () => {
  const { renderCommandLauncherConsole, attachCommandLauncherListeners } = await importLauncher();
  const dom = mount(renderCommandLauncherConsole({ def: sampleDef(), data: sampleData(), styles: {}, useIconCopyButton: true }));
  const host = dom.window.document.getElementById('host');
  dom.window.prompt = () => 'My preset';
  const state = installFormgenRuntime({ batch_size: 42 });
  attachCommandLauncherListeners(host);
  host.querySelector('[data-cmdl-item="dispatch_archive_generate"]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));

  const recall = host.querySelector('[data-cmdl-recall][data-cmdl-command="archive.generate_projections"]');
  recall.querySelector('[data-cmdl-save-preset]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  const preset = recall.querySelector('[data-cmdl-load="preset:0"]');
  assert.ok(preset);
  assert.match(preset.textContent, /My preset/);
  recall.querySelector('[data-cmdl-del-preset="0"]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.equal(recall.querySelector('[data-cmdl-load="preset:0"]'), null);
  assert.deepEqual(state.get(), { batch_size: 42 });
});

test('JSON toggle swaps editors and applies edited JSON back to the form', async () => {
  const { renderCommandLauncherConsole, attachCommandLauncherListeners } = await importLauncher();
  const dom = mount(renderCommandLauncherConsole({ def: sampleDef(), data: sampleData(), styles: {}, useIconCopyButton: true }));
  const host = dom.window.document.getElementById('host');
  const state = installFormgenRuntime({ batch_size: 7 });
  attachCommandLauncherListeners(host);
  host.querySelector('[data-cmdl-item="dispatch_archive_generate"]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));

  const form = host.querySelector('[data-panel-action-form][data-action-id="dispatch_archive_generate"]');
  form.querySelector('[data-cmdl-json-toggle]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.equal(form.dataset.cmdlMode, 'json');
  assert.equal(form.querySelector('[data-cmdl-fields]').hidden, true);
  const editor = form.querySelector('[data-cmdl-json-editor]');
  assert.match(editor.value, /"batch_size": 7/);

  editor.value = JSON.stringify({ batch_size: 99, locale: 'es' });
  form.querySelector('[data-cmdl-json-toggle]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.equal(form.dataset.cmdlMode, 'form');
  assert.deepEqual(state.get(), { batch_size: 99, locale: 'es' });
});

test('invalid JSON keeps the editor open and shows an error', async () => {
  const { renderCommandLauncherConsole, attachCommandLauncherListeners } = await importLauncher();
  const dom = mount(renderCommandLauncherConsole({ def: sampleDef(), data: sampleData(), styles: {}, useIconCopyButton: true }));
  const host = dom.window.document.getElementById('host');
  installFormgenRuntime({ batch_size: 7 });
  attachCommandLauncherListeners(host);
  host.querySelector('[data-cmdl-item="dispatch_archive_generate"]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));

  const form = host.querySelector('[data-panel-action-form][data-action-id="dispatch_archive_generate"]');
  form.querySelector('[data-cmdl-json-toggle]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  form.querySelector('[data-cmdl-json-editor]').value = '{ not valid json ';
  form.querySelector('[data-cmdl-json-toggle]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.equal(form.dataset.cmdlMode, 'json');
  const error = form.querySelector('[data-cmdl-json-error]');
  assert.equal(error.hidden, false);
  assert.match(error.textContent, /Invalid JSON/);
});
