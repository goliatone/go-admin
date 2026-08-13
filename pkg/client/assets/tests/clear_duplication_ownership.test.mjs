import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testFileDir = path.dirname(fileURLToPath(import.meta.url));

function source(relativePath) {
  return fs.readFileSync(path.resolve(testFileDir, '../src', relativePath), 'utf8');
}

test('media and DataTable filters use the shared HTML escaper', () => {
  for (const relativePath of ['media/index.ts', 'datatable/filter-builder.ts']) {
    const contents = source(relativePath);
    assert.match(contents, /shared\/html\.js/);
    assert.doesNotMatch(contents, /function escapeHTML\(/);
  }
});

test('entry navigation uses the shared path resolver', () => {
  for (const relativePath of ['entry-navigation/index.ts', 'entry-navigation/api-client.ts']) {
    const contents = source(relativePath);
    assert.match(contents, /shared\/path-normalization\.js/);
    assert.match(contents, /resolvePath/);
    assert.doesNotMatch(contents, /function normalizePath\(/);
  }
});

test('services relative time delegates to the shared compact formatter', () => {
  const contents = source('services/pages/formatters.ts');
  assert.match(contents, /shared\/time-formatters\.js/);
  assert.match(contents, /formatRelativeTimeCompact/);
  assert.doesNotMatch(contents, /const diffMs/);
});

test('debug panels use the shared sort-toggle renderer', () => {
  for (const panel of ['sql', 'requests', 'logs', 'jserrors']) {
    const contents = source(`debug/shared/panels/${panel}.ts`);
    assert.match(contents, /\.\.\/panel-controls\.js/);
    assert.doesNotMatch(contents, /function renderSortToggle\(/);
  }

  const owner = source('debug/shared/panel-controls.ts');
  assert.match(owner, /export function renderSortToggle\(/);
  assert.match(owner, /<span>Newest first<\/span>/);
});
