import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = resolve(__dirname, '..');
const DIST_DIR = resolve(ASSETS_DIR, 'dist');

// =============================================================================
// Phase P-F1 Runtime Smoke Tests: TX-087
// Verify the example actually loads expected dist modules/styles
// These tests simulate ADMIN_ASSETS_DEBUG=1 runtime behavior
// =============================================================================

// -----------------------------------------------------------------------------
// Section 1: Critical dist file existence checks
// -----------------------------------------------------------------------------

test('dist/datatable/index.js exists', () => {
  const path = resolve(DIST_DIR, 'datatable/index.js');
  assert.ok(existsSync(path), `Expected dist file to exist: ${path}`);
});

test('dist/output.css exists', () => {
  const path = resolve(DIST_DIR, 'output.css');
  assert.ok(existsSync(path), `Expected dist file to exist: ${path}`);
});

test('dist/styles/datatable-actions.css exists', () => {
  const path = resolve(DIST_DIR, 'styles/datatable-actions.css');
  assert.ok(existsSync(path), `Expected dist file to exist: ${path}`);
});

test('dist/toast/init.js exists', () => {
  const path = resolve(DIST_DIR, 'toast/init.js');
  assert.ok(existsSync(path), `Expected dist file to exist: ${path}`);
});

test('dist/translation-operations/index.js exists', () => {
  const path = resolve(DIST_DIR, 'translation-operations/index.js');
  assert.ok(existsSync(path), `Expected dist file to exist: ${path}`);
});

// -----------------------------------------------------------------------------
// Section 2: JS module import tests (verifies modules are valid ES modules)
// -----------------------------------------------------------------------------

test('datatable/index.js exports DataGrid', async () => {
  const module = await import('../dist/datatable/index.js');
  assert.ok(module.DataGrid, 'DataGrid should be exported');
  assert.equal(typeof module.DataGrid, 'function', 'DataGrid should be a constructor');
});

test('datatable/index.js exports core translation UX components', async () => {
  const module = await import('../dist/datatable/index.js');

  // Phase 1 components
  assert.ok(module.StatusLegend, 'StatusLegend should be exported');

  // Phase 2 components
  assert.ok(module.QuickFilters, 'QuickFilters should be exported');
  assert.ok(module.transformToGroups, 'transformToGroups should be exported');

  // Phase 3 components
  assert.ok(module.FallbackBanner, 'FallbackBanner should be exported');
  assert.ok(module.AutosaveIndicator, 'AutosaveIndicator should be exported');
  assert.ok(module.KeyboardShortcutRegistry, 'KeyboardShortcutRegistry should be exported');

  // Phase 4 components
  assert.ok(module.CapabilityGate, 'CapabilityGate should be exported');
  assert.ok(module.TranslatorDashboard, 'TranslatorDashboard should be exported');
  assert.ok(module.ExchangeImport, 'ExchangeImport should be exported');
  assert.ok(module.AsyncProgress, 'AsyncProgress should be exported');

  // Phase 5 components
  assert.ok(module.SideBySideEditor, 'SideBySideEditor should be exported');
  assert.ok(module.getStatusDisplay, 'getStatusDisplay should be exported (shared vocabulary)');
});

test('datatable/index.js exports schema action utilities', async () => {
  const module = await import('../dist/datatable/index.js');

  assert.ok(module.SchemaActionBuilder, 'SchemaActionBuilder should be exported');
  assert.ok(module.buildSchemaRowActions, 'buildSchemaRowActions should be exported');
  assert.ok(module.extractSchemaActions, 'extractSchemaActions should be exported');
});

test('translation-operations/index.js is importable', async () => {
  const module = await import('../dist/translation-operations/index.js');
  assert.ok(module.initTranslationOperations, 'initTranslationOperations should be exported');
});

test('toast/init.js is importable', async () => {
  // This module has side effects but should be importable
  try {
    await import('../dist/toast/init.js');
    assert.ok(true, 'toast/init.js should be importable');
  } catch (err) {
    // DOM-dependent code may throw in Node.js - that's expected
    // The important thing is the file parses correctly
    if (err.message.includes('document is not defined') ||
        err.message.includes('window is not defined') ||
        err.message.includes('is not defined')) {
      assert.ok(true, 'toast/init.js parsed correctly (DOM dependency expected in Node)');
    } else {
      throw err;
    }
  }
});

// -----------------------------------------------------------------------------
// Section 3: CSS content validation
// -----------------------------------------------------------------------------

test('datatable-actions.css contains action dropdown styles', () => {
  const path = resolve(DIST_DIR, 'styles/datatable-actions.css');
  const content = readFileSync(path, 'utf-8');

  // Core selectors that must be present
  assert.match(content, /\.actions-dropdown/, 'Should have .actions-dropdown class');
  assert.match(content, /\.actions-menu-trigger/, 'Should have .actions-menu-trigger class');
  assert.match(content, /\.actions-menu/, 'Should have .actions-menu class');
  assert.match(content, /\.action-item/, 'Should have .action-item class');
});

test('datatable-actions.css contains aria-disabled styles for visible-disabled actions', () => {
  const path = resolve(DIST_DIR, 'styles/datatable-actions.css');
  const content = readFileSync(path, 'utf-8');

  // Per TX-026, disabled actions must be visible with aria-disabled styling
  assert.match(content, /aria-disabled.*true/, 'Should have aria-disabled="true" selector');
  assert.match(content, /cursor:\s*not-allowed/, 'Should have cursor: not-allowed for disabled');
});

test('output.css has non-zero size (Tailwind output)', () => {
  const path = resolve(DIST_DIR, 'output.css');
  const content = readFileSync(path, 'utf-8');

  // Tailwind output should be substantial
  assert.ok(content.length > 1000, 'output.css should have substantial content');
});

// -----------------------------------------------------------------------------
// Section 4: Module entry point completeness
// -----------------------------------------------------------------------------

const EXPECTED_ENTRY_POINTS = [
  'activity/index.js',
  'datatable/index.js',
  'dashboard/index.js',
  'feature-flags/index.js',
  'searchbox/index.js',
  'tabs/index.js',
  'toast/init.js',
  'toast/error-helpers.js',
  'formgen/file_uploader.js',
  'formgen/block_editor.js',
  'debug/index.js',
  'translation-exchange/index.js',
  'translation-operations/index.js',
  'services/index.js',
];

for (const entryPoint of EXPECTED_ENTRY_POINTS) {
  test(`dist/${entryPoint} exists`, () => {
    const path = resolve(DIST_DIR, entryPoint);
    assert.ok(existsSync(path), `Expected entry point to exist: dist/${entryPoint}`);
  });
}

// -----------------------------------------------------------------------------
// Section 5: Style entry point completeness
// -----------------------------------------------------------------------------

const EXPECTED_STYLE_FILES = [
  'output.css',
  'styles/datatable-actions.css',
  'styles/activity.css',
  'styles/debug.css',
  'styles/error-page.css',
  'styles/export.css',
  'styles/widgets.css',
];

for (const styleFile of EXPECTED_STYLE_FILES) {
  test(`dist/${styleFile} exists`, () => {
    const path = resolve(DIST_DIR, styleFile);
    assert.ok(existsSync(path), `Expected style file to exist: dist/${styleFile}`);
  });
}

// -----------------------------------------------------------------------------
// Section 6: TypeScript declaration files (for IDE support)
// -----------------------------------------------------------------------------

test('datatable/index.d.ts exists for IDE support', () => {
  const path = resolve(DIST_DIR, 'datatable/index.d.ts');
  assert.ok(existsSync(path), `Expected TypeScript declaration to exist: ${path}`);
});

// -----------------------------------------------------------------------------
// Section 7: Critical export shape validation (API contract)
// -----------------------------------------------------------------------------

test('DataGrid constructor accepts config object', async () => {
  const { DataGrid } = await import('../dist/datatable/index.js');

  // Verify constructor signature accepts expected config shape
  const mockConfig = {
    basePath: '/admin',
    entityName: 'pages',
    container: null, // Would be DOM element in browser
  };

  // Should not throw when constructing (actual DOM operations are lazy)
  try {
    const grid = new DataGrid(mockConfig);
    assert.ok(grid, 'DataGrid should be constructible');
  } catch (err) {
    // DOM operations may fail in Node - verify it's not a config parsing error
    if (!err.message.includes('null') && !err.message.includes('undefined')) {
      throw err;
    }
  }
});

test('SchemaActionBuilder can be instantiated', async () => {
  const { SchemaActionBuilder } = await import('../dist/datatable/index.js');

  const mockConfig = {
    basePath: '/admin',
    entityName: 'pages',
  };

  const builder = new SchemaActionBuilder(mockConfig);
  assert.ok(builder, 'SchemaActionBuilder should be constructible');
  assert.equal(typeof builder.resolveActionOrder, 'function', 'Should have resolveActionOrder method');
});
