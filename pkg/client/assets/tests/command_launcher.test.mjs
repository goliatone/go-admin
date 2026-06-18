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

function mount(html) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="host">${html}</div></body></html>`);
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.CSS = dom.window.CSS;
  return dom;
}

test('renders grouped catalog with execution + mutating badges', async () => {
  const { renderCommandLauncherConsole } = await importLauncher();
  const html = renderCommandLauncherConsole({ def: sampleDef(), data: sampleData(), styles: {}, useIconCopyButton: true });

  assert.match(html, /cmdl-group__label">Archive</);
  assert.match(html, /cmdl-group__label">Search</);
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
});
