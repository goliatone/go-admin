import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const {
  normalizeMenuBuilderPath,
  normalizeMenuBuilderRoute,
  normalizeMenuBuilderAPIBasePath,
} = await import('../dist/menu-builder/shared/path-helpers.js');

const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const apiClientSourcePath = path.resolve(testFileDir, '../src/menu-builder/api-client.ts');
const editorSourcePath = path.resolve(testFileDir, '../src/menu-builder/editor.ts');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

test('menu-builder shared path helper preserves API client path normalization', () => {
  assert.equal(normalizeMenuBuilderPath('/admin/api', ''), '/admin/api');
  assert.equal(normalizeMenuBuilderPath('/admin/api', 'menus'), '/admin/api/menus');
  assert.equal(normalizeMenuBuilderPath('/admin/api/', '/menus'), '/menus');
  assert.equal(normalizeMenuBuilderPath('/admin/api', 'https://example.com/menu-contracts'), 'https://example.com/menu-contracts');
});

test('menu-builder shared route helper preserves editor base-path normalization', () => {
  assert.equal(normalizeMenuBuilderRoute('/', '/admin'), '/admin');
  assert.equal(normalizeMenuBuilderRoute('/admin', 'menus'), '/admin/menus');
  assert.equal(normalizeMenuBuilderRoute('/admin', ''), '');
  assert.equal(normalizeMenuBuilderRoute('/', 'https://example.com/admin'), 'https://example.com/admin');
});

test('menu-builder shared API-base helper preserves /api suffix normalization', () => {
  assert.equal(normalizeMenuBuilderAPIBasePath('/admin', ''), '/admin/api');
  assert.equal(normalizeMenuBuilderAPIBasePath('/admin', '/admin/api'), '/admin/api');
  assert.equal(normalizeMenuBuilderAPIBasePath('/admin', 'custom'), '/admin/custom/api');
  assert.equal(normalizeMenuBuilderAPIBasePath('/admin', 'https://example.com/admin'), 'https://example.com/admin/api');
});

test('menu-builder callers now route through the shared path helper module', () => {
  const apiClientSource = read(apiClientSourcePath);
  const editorSource = read(editorSourcePath);

  assert.match(apiClientSource, /normalizeMenuBuilderPath/);
  assert.doesNotMatch(apiClientSource, /function normalizePath\(/);

  assert.match(editorSource, /normalizeMenuBuilderRoute/);
  assert.match(editorSource, /normalizeMenuBuilderAPIBasePath/);
  assert.doesNotMatch(editorSource, /function normalizeRoute\(/);
  assert.doesNotMatch(editorSource, /function normalizeAPIBasePath\(/);
});
