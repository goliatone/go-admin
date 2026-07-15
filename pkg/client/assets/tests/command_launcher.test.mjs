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
          fields: [
            { name: 'full_dataset', label: 'Full dataset', kind: 'boolean', payload_path: 'payload.full_dataset' },
            { name: 'event_ids', label: 'Event IDs', kind: 'string_list', payload_path: 'payload.event_ids' },
            { name: 'batch_size', label: 'Batch size', kind: 'number', payload_path: 'payload.batch_size', default: 100 },
            { name: 'locale', label: 'Locale', kind: 'string', payload_path: 'payload.locale', options: ['en', 'es'] },
          ],
        },
        {
          id: 'dispatch_search_health',
          label: 'Search health',
          payload: { command_id: 'search.health', payload: {}, options: { mode: 'inline' } },
          fields: [],
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

function hintedDef() {
  return {
    id: 'commands',
    ui: {
      schema_version: '1',
      metadata: {
        serialized_schemas: {
          'archive.generate_projections': {
            fields: [
              {
                name: 'batch_size',
                path: 'batch_size',
                help: 'Schema fallback help',
                default: 250,
                display_hints: { section: 'Schema scope', advanced: true, units: 'items' },
              },
              {
                name: 'locale',
                path: 'locale',
                help: 'Locale from schema',
                default: 'es',
                display_hints: { section: 'Localization', units: 'locale code' },
              },
            ],
          },
        },
      },
      actions: [
        {
          id: 'dispatch_archive_generate',
          label: 'Generate projections',
          payload: { command_id: 'archive.generate_projections', payload: {}, options: { mode: 'queued' } },
          fields: [
            {
              name: 'batch_size',
              label: 'Batch size',
              kind: 'number',
              payload_path: 'payload.batch_size',
              description: 'Action help wins',
              default: 100,
              display_hints: { section: 'Scope', units: 'records' },
            },
            { name: 'locale', label: 'Locale', kind: 'string', payload_path: 'payload.locale', options: ['en', 'es'] },
            { name: 'dry_run', label: 'Dry run', kind: 'boolean', payload_path: 'payload.dry_run', display_hints: { advanced: true } },
          ],
        },
      ],
    },
  };
}

function setWindowGlobals(win) {
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.Element = win.Element;
  globalThis.Node = win.Node;
  globalThis.HTMLElement = win.HTMLElement;
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

test('maps field kinds to the right controls and reuses the dispatch contract', async () => {
  const { renderCommandLauncherConsole } = await importLauncher();
  const html = renderCommandLauncherConsole({ def: sampleDef(), data: sampleData(), styles: {}, useIconCopyButton: true });

  // form carries the existing data-panel-action-* contract
  assert.match(html, /data-panel-action-form/);
  assert.match(html, /data-action-id="dispatch_archive_generate"/);
  assert.match(html, /data-action-requires-confirm="true"/);
  assert.match(html, /data-action-payload='[^']*archive\.generate_projections/);

  // boolean -> toggle checkbox
  assert.match(html, /type="checkbox"[^>]*data-action-field="full_dataset"[^>]*data-action-field-kind="boolean"/);
  // string_list -> chips with hidden value holder
  assert.match(html, /data-cmdl-chips-value[^>]*data-action-field-kind="string_list"|data-action-field-kind="string_list"[^>]*data-cmdl-chips-value/);
  // number -> number input with default value
  assert.match(html, /type="number"[^>]*data-action-field="batch_size"[^>]*value="100"|value="100"[^>]*data-action-field="batch_size"/);
  // options -> select
  assert.match(html, /<select[^>]*data-action-field="locale"[\s\S]*?<option value="en"/);
  // payload path preserved
  assert.match(html, /data-action-field-path="payload\.batch_size"/);
});

test('renders rich scalar choices and keeps multi-value choices as chips', async () => {
  const { renderCommandLauncherConsole } = await importLauncher();
  const def = {
    id: 'commands',
    ui: {
      schema_version: '1',
      actions: [{
        id: 'dispatch_rich',
        label: 'Rich options',
        payload: { command_id: 'demo.rich', payload: {}, options: { mode: 'inline' } },
        fields: [
          {
            name: 'environment', label: 'Environment', kind: 'select', payload_path: 'payload.environment',
            description: 'Deployment environment.', help: 'Choose the environment that owns the data.',
            option_items: [
              { value: 'prod', label: 'Production', description: 'Live data' },
              { value: 'retired', label: 'Retired', description: 'No longer writable', disabled: true },
            ],
          },
          {
            name: 'indexes', label: 'Indexes', kind: 'string_list', payload_path: 'payload.indexes',
            option_items: [
              { value: 'site_content', label: 'Site content', description: 'Pages and articles' },
              { value: 'archive_media', label: 'Archive media' },
            ],
          },
        ],
      }],
    },
  };
  const data = { commands: [{ id: 'demo.rich', group: 'Demo', execution_mode: 'inline' }], diagnostics: [] };
  const html = renderCommandLauncherConsole({ def, data, styles: {}, useIconCopyButton: true });

  assert.match(html, /<option value="prod"[^>]*data-option-description="Live data"[^>]*>Production<\/option>/);
  assert.match(html, /<option value="retired" disabled[^>]*>Retired<\/option>/);
  assert.match(html, /Deployment environment\./);
  assert.match(html, /Choose the environment that owns the data\./);
  assert.match(html, /data-cmdl-chips-value[^>]*data-action-field="indexes"|data-action-field="indexes"[^>]*data-cmdl-chips-value/);
  assert.match(html, /data-cmdl-option-value="site_content"[\s\S]*?Site content[\s\S]*?Pages and articles/);
  assert.doesNotMatch(html, /<select[^>]*data-action-field="indexes"/);
});

test('refreshes dependent dynamic choices with the current form payload', async () => {
  const { renderCommandLauncherConsole, attachCommandLauncherListeners } = await importLauncher();
  const def = {
    id: 'commands',
    ui: {
      schema_version: '1',
      metadata: { option_resolver_action: 'resolve_options' },
      actions: [{
        id: 'dispatch_ingest',
        label: 'Ingest',
        payload: { command_id: 'transcript.ingest', payload: {}, options: { mode: 'inline' } },
        fields: [
          { name: 'source_kind', label: 'Source kind', kind: 'select', payload_path: 'payload.source_kind', options: ['folder', 'sql'] },
          {
            name: 'source_ref', label: 'Source', kind: 'select', payload_path: 'payload.source_ref',
            option_source: { id: 'garchen.transcript_sources', dynamic: true, params: { depends_on: ['source_kind'] } },
          },
        ],
      }],
    },
  };
  const data = { commands: [{ id: 'transcript.ingest', group: 'Transcript', execution_mode: 'inline' }], diagnostics: [] };
  const dom = mount(renderCommandLauncherConsole({ def, data, styles: {}, useIconCopyButton: true }));
  const host = dom.window.document.getElementById('host');
  const requests = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    requests.push({ url: String(url), body });
    const kind = body.payload.source_kind || 'all';
    return new Response(JSON.stringify({
      data: {
        option_items: [{ value: `${kind}-source`, label: `${kind.toUpperCase()} source`, description: `Approved ${kind} source` }],
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    attachCommandLauncherListeners(host, { debugPath: '/admin/debug' });
    host.querySelector('[data-cmdl-item="dispatch_ingest"]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 20));

    const kind = host.querySelector('[data-action-field="source_kind"]');
    kind.value = 'sql';
    kind.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 260));

    const last = requests.at(-1);
    assert.equal(last.url, '/admin/debug/api/panels/commands/actions/resolve_options');
    assert.equal(last.body.command_id, 'transcript.ingest');
    assert.equal(last.body.field_path, 'source_ref');
    assert.equal(last.body.source_id, 'garchen.transcript_sources');
    assert.equal(last.body.payload.source_kind, 'sql');
    const source = host.querySelector('[data-action-field="source_ref"]');
    assert.equal(source.disabled, false);
    assert.equal(source.options[1].value, 'sql-source');
    assert.equal(source.options[1].textContent, 'SQL source');
    assert.match(host.querySelector('[data-cmdl-option-status]').textContent, /1 option available/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('groups required/list fields as Parameters and booleans as Options', async () => {
  const { renderCommandLauncherConsole } = await importLauncher();
  const html = renderCommandLauncherConsole({ def: sampleDef(), data: sampleData(), styles: {}, useIconCopyButton: true });
  assert.match(html, /cmdl-section__head">Parameters/);
  assert.match(html, /cmdl-section__head">Options/);
});

test('uses authored sections, units and defaults from action fields first', async () => {
  const { renderCommandLauncherConsole } = await importLauncher();
  const html = renderCommandLauncherConsole({ def: hintedDef(), data: sampleData(), styles: {}, useIconCopyButton: true });

  assert.match(html, /cmdl-section__head">Scope/);
  assert.doesNotMatch(html, /cmdl-section__head">Schema scope/);
  assert.match(html, /cmdl-section__head--toggle[\s\S]*?Advanced/);
  assert.match(html, /data-action-field="batch_size"[^>]*value="100"|value="100"[^>]*data-action-field="batch_size"/);
  assert.match(html, /Action help wins/);
  assert.match(html, /Units: records/);
});

test('uses serialized schema presentation only when action fields omit it', async () => {
  const { renderCommandLauncherConsole } = await importLauncher();
  const html = renderCommandLauncherConsole({ def: hintedDef(), data: sampleData(), styles: {}, useIconCopyButton: true });

  assert.match(html, /cmdl-section__head">Localization/);
  assert.match(html, /<select[^>]*data-action-field="locale"[\s\S]*?<option value="es" selected>es<\/option>/);
  assert.match(html, /Locale from schema/);
  assert.match(html, /Units: locale code/);
});

test('commands with no fields render a no-arguments form', async () => {
  const { renderCommandLauncherConsole } = await importLauncher();
  const html = renderCommandLauncherConsole({ def: sampleDef(), data: sampleData(), styles: {}, useIconCopyButton: true });
  assert.match(html, /data-cmdl-detail="dispatch_search_health"[\s\S]*?cmdl-form__noargs/);
});

test('clicking a catalog row reveals its form; filtering narrows the list', async () => {
  const { renderCommandLauncherConsole, attachCommandLauncherListeners } = await importLauncher();
  const html = renderCommandLauncherConsole({ def: sampleDef(), data: sampleData(), styles: {}, useIconCopyButton: true });
  const dom = mount(html);
  const host = dom.window.document.getElementById('host');
  attachCommandLauncherListeners(host);

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
  attachCommandLauncherListeners(host);

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
  attachCommandLauncherListeners(host);
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

test('chips input accepts tokens via Enter and syncs the hidden value', async () => {
  const { renderCommandLauncherConsole, attachCommandLauncherListeners } = await importLauncher();
  const html = renderCommandLauncherConsole({ def: sampleDef(), data: sampleData(), styles: {}, useIconCopyButton: true });
  const dom = mount(html);
  const host = dom.window.document.getElementById('host');
  attachCommandLauncherListeners(host);

  const holder = host.querySelector('[data-cmdl-chips]');
  const entry = holder.querySelector('[data-cmdl-chips-entry]');
  entry.value = 'evt_1';
  entry.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

  const hidden = holder.querySelector('[data-cmdl-chips-value]');
  assert.equal(hidden.value, 'evt_1');
  assert.match(holder.innerHTML, /cmdl-chip-tag/);
  assert.equal(entry.value, '');
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
        { id: 'dispatch_run_x', label: 'Run X', payload: { command_id: 'demo.x', payload: {}, options: { mode: 'inline' } }, fields: [{ name: 'note', label: 'Note', kind: 'string', payload_path: 'payload.note' }] },
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
test('form drafts (selection + field values + chips) survive a re-render', async () => {
  const { renderCommandLauncherConsole, attachCommandLauncherListeners } = await importLauncher();
  const render = () => renderCommandLauncherConsole({ def: sampleDef(), data: sampleData(), styles: {}, useIconCopyButton: true });

  const dom1 = mount(render());
  const host1 = dom1.window.document.getElementById('host');
  attachCommandLauncherListeners(host1);
  host1.querySelector('[data-cmdl-item="dispatch_archive_generate"]').dispatchEvent(new dom1.window.MouseEvent('click', { bubbles: true }));
  const batch = host1.querySelector('[data-action-field="batch_size"]');
  batch.value = '999';
  batch.dispatchEvent(new dom1.window.Event('input', { bubbles: true }));
  const entry1 = host1.querySelector('[data-cmdl-chips-entry]');
  entry1.value = 'evt_keep';
  entry1.dispatchEvent(new dom1.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

  // Fresh re-render + re-attach; module-scope drafts must rehydrate the DOM.
  const dom2 = mount(render());
  const host2 = dom2.window.document.getElementById('host');
  attachCommandLauncherListeners(host2);
  assert.equal(host2.querySelector('[data-cmdl-detail="dispatch_archive_generate"]').hidden, false);
  assert.equal(host2.querySelector('[data-action-field="batch_size"]').value, '999');
  assert.equal(host2.querySelector('[data-cmdl-chips-value]').value, 'evt_keep');
});

// ---- IR2-L2: pending chip flush + required enforcement on the visible input ----
test('pending chip text is committed on submit', async () => {
  const { renderCommandLauncherConsole, attachCommandLauncherListeners } = await importLauncher();
  const dom = mount(renderCommandLauncherConsole({ def: sampleDef(), data: sampleData(), styles: {}, useIconCopyButton: true }));
  const host = dom.window.document.getElementById('host');
  attachCommandLauncherListeners(host);
  const form = host.querySelector('[data-panel-action-form][data-action-id="dispatch_archive_generate"]');
  const holder = form.querySelector('[data-cmdl-chips]');
  const entry = holder.querySelector('[data-cmdl-chips-entry]');
  entry.value = 'pending_value';
  // This is a confirm-required command; arm it so the submit reaches the dispatch
  // path where pending chip text is flushed (the inline gate is covered elsewhere).
  form.dataset.cmdlArmed = 'true';
  form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  assert.equal(holder.querySelector('[data-cmdl-chips-value]').value, 'pending_value');
  assert.equal(entry.value, '');
});

test('required list field validates on the visible entry, not the hidden input', async () => {
  const { renderCommandLauncherConsole, attachCommandLauncherListeners } = await importLauncher();
  const def = {
    id: 'commands',
    ui: { schema_version: '1', actions: [{ id: 'dispatch_req', label: 'Req', payload: { command_id: 'demo.req', payload: {}, options: { mode: 'inline' } }, fields: [{ name: 'ids', label: 'IDs', kind: 'string_list', payload_path: 'payload.ids', required: true }] }] },
  };
  const data = { commands: [{ id: 'demo.req', group: 'Demo', execution_mode: 'inline' }], diagnostics: [] };
  const dom = mount(renderCommandLauncherConsole({ def, data, styles: {}, useIconCopyButton: true }));
  const host = dom.window.document.getElementById('host');
  attachCommandLauncherListeners(host);
  const holder = host.querySelector('[data-cmdl-chips]');
  const entry = holder.querySelector('[data-cmdl-chips-entry]');
  assert.equal(entry.required, true);
  assert.equal(holder.querySelector('[data-cmdl-chips-value]').hasAttribute('required'), false);
  entry.value = 'a';
  entry.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  assert.equal(entry.required, false);
});

// ---- keyboard selection ----
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
      actions: [{ id: 'dispatch_x', label: 'X', payload: { command_id: 'demo.x', payload: {}, options: { mode: 'inline' } }, fields: [] }],
    },
  });
  assert.ok(commandsDef);
  assert.equal(commandsDef.showFilters, false);
  const data = { commands: [{ id: 'demo.x', group: 'Demo', execution_mode: 'inline' }], diagnostics: [] };
  assert.match(commandsDef.renderConsole(data, {}, {}), /data-cmdl-root/);

  const otherDef = panelDefinitionFromServer({
    id: 'cache',
    label: 'Cache',
    ui: { schema_version: '1', views: { console: { renderer: 'json', bind: '$' } } },
  });
  assert.doesNotMatch(otherDef.renderConsole({ a: 1 }, {}, {}), /data-cmdl-root/);
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
  recordCommandLauncherInvocation({ command_id: 'archive.generate_projections', payload: { batch_size: 500, event_ids: ['evt_x'] } });
  attachCommandLauncherListeners(host);

  const recall = host.querySelector('[data-cmdl-recall][data-cmdl-command="archive.generate_projections"]');
  const chip = recall.querySelector('[data-cmdl-load="recent:0"]');
  assert.ok(chip);
  chip.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.equal(host.querySelector('[data-action-field="batch_size"]').value, '500');
  assert.equal(host.querySelector('[data-cmdl-chips-value]').value, 'evt_x');
});

test('saving and deleting a preset round-trips through storage', async () => {
  const { renderCommandLauncherConsole, attachCommandLauncherListeners } = await importLauncher();
  const dom = mount(renderCommandLauncherConsole({ def: sampleDef(), data: sampleData(), styles: {}, useIconCopyButton: true }));
  const host = dom.window.document.getElementById('host');
  dom.window.prompt = () => 'My preset';
  attachCommandLauncherListeners(host);

  const recall = host.querySelector('[data-cmdl-recall][data-cmdl-command="archive.generate_projections"]');
  host.querySelector('[data-action-field="batch_size"]').value = '42';
  recall.querySelector('[data-cmdl-save-preset]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  const preset = recall.querySelector('[data-cmdl-load="preset:0"]');
  assert.ok(preset);
  assert.match(preset.textContent, /My preset/);
  recall.querySelector('[data-cmdl-del-preset="0"]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.equal(recall.querySelector('[data-cmdl-load="preset:0"]'), null);
});

// ---- Phase 3 T13: JSON ↔ form power mode ----
test('JSON toggle swaps editors and applies edited JSON back to the form', async () => {
  const { renderCommandLauncherConsole, attachCommandLauncherListeners } = await importLauncher();
  const dom = mount(renderCommandLauncherConsole({ def: sampleDef(), data: sampleData(), styles: {}, useIconCopyButton: true }));
  const host = dom.window.document.getElementById('host');
  attachCommandLauncherListeners(host);

  const form = host.querySelector('[data-panel-action-form][data-action-id="dispatch_archive_generate"]');
  host.querySelector('[data-action-field="batch_size"]').value = '7';
  form.querySelector('[data-cmdl-json-toggle]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.equal(form.dataset.cmdlMode, 'json');
  assert.equal(form.querySelector('[data-cmdl-fields]').hidden, true);
  const editor = form.querySelector('[data-cmdl-json-editor]');
  assert.match(editor.value, /"batch_size": 7/);

  editor.value = JSON.stringify({ batch_size: 99, locale: 'es' });
  form.querySelector('[data-cmdl-json-toggle]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.equal(form.dataset.cmdlMode, 'form');
  assert.equal(form.querySelector('[data-action-field="batch_size"]').value, '99');
  assert.equal(form.querySelector('[data-action-field="locale"]').value, 'es');
});

test('invalid JSON keeps the editor open and shows an error', async () => {
  const { renderCommandLauncherConsole, attachCommandLauncherListeners } = await importLauncher();
  const dom = mount(renderCommandLauncherConsole({ def: sampleDef(), data: sampleData(), styles: {}, useIconCopyButton: true }));
  const host = dom.window.document.getElementById('host');
  attachCommandLauncherListeners(host);

  const form = host.querySelector('[data-panel-action-form][data-action-id="dispatch_archive_generate"]');
  form.querySelector('[data-cmdl-json-toggle]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  form.querySelector('[data-cmdl-json-editor]').value = '{ not valid json ';
  form.querySelector('[data-cmdl-json-toggle]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.equal(form.dataset.cmdlMode, 'json');
  const error = form.querySelector('[data-cmdl-json-error]');
  assert.equal(error.hidden, false);
  assert.match(error.textContent, /Invalid JSON/);
});
