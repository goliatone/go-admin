import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const {
  trimTrailingSlash,
  normalizeBasePath,
  normalizeAPIBasePath,
  deriveBasePathFromAPIEndpoint,
} = await import('../dist/shared/path-normalization.js');

const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const columnVisibilitySourcePath = path.resolve(testFileDir, '../src/datatable/go-crud/column-visibility.ts');
const apiPathsSourcePath = path.resolve(testFileDir, '../src/content-type-builder/shared/api-paths.ts');
const translationFamilySourcePath = path.resolve(testFileDir, '../src/translation-family/index.ts');
const translationMatrixSourcePath = path.resolve(testFileDir, '../src/translation-matrix/index.ts');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

test('shared path normalization preserves the datatable base-path contracts', () => {
  assert.equal(normalizeBasePath(undefined), '');
  assert.equal(normalizeBasePath(''), '');
  assert.equal(normalizeBasePath('/'), '');
  assert.equal(normalizeBasePath('admin'), '/admin');
  assert.equal(normalizeBasePath('/admin/'), '/admin');

  assert.equal(normalizeAPIBasePath(undefined), '');
  assert.equal(normalizeAPIBasePath(''), '');
  assert.equal(normalizeAPIBasePath('/'), '');
  assert.equal(normalizeAPIBasePath('/admin/api/'), '/admin/api');
  assert.equal(normalizeAPIBasePath('/admin/preferences///'), '/admin/preferences');
});

test('shared path normalization preserves the content-type-builder API suffix rules', () => {
  assert.equal(trimTrailingSlash('/admin/api///'), '/admin/api');
  assert.equal(normalizeAPIBasePath('/', { ensureAPISuffix: true }), '/api');
  assert.equal(normalizeAPIBasePath('/admin', { ensureAPISuffix: true }), '/admin/api');
  assert.equal(normalizeAPIBasePath('/admin/api', { ensureAPISuffix: true }), '/admin/api');
  assert.equal(normalizeAPIBasePath('https://example.com/admin', { ensureAPISuffix: true }), 'https://example.com/admin/api');
});

test('shared path normalization preserves translation-family and translation-matrix base-path derivation rules', () => {
  assert.equal(trimTrailingSlash('/admin/api/'), '/admin/api');
  assert.equal(trimTrailingSlash('/admin/api///'), '/admin/api');
  assert.equal(deriveBasePathFromAPIEndpoint('/admin/api/translations/matrix'), '/admin');
  assert.equal(deriveBasePathFromAPIEndpoint('https://example.com/admin/api/translations/matrix'), '/admin');
  assert.equal(deriveBasePathFromAPIEndpoint(''), '');
});

test('datatable and content-type-builder callers now route through shared/path-normalization', () => {
  const columnVisibilitySource = read(columnVisibilitySourcePath);
  const apiPathsSource = read(apiPathsSourcePath);

  assert.match(columnVisibilitySource, /from '\.\.\/\.\.\/shared\/path-normalization\.js'/);
  assert.match(columnVisibilitySource, /normalizeBasePath/);
  assert.match(columnVisibilitySource, /normalizeAPIBasePath/);
  assert.doesNotMatch(columnVisibilitySource, /function normalizeBasePath\(/);
  assert.doesNotMatch(columnVisibilitySource, /function normalizeApiBasePath\(/);

  assert.match(apiPathsSource, /from '\.\.\/\.\.\/shared\/path-normalization\.js'/);
  assert.match(apiPathsSource, /normalizeSharedAPIBasePath/);
  assert.match(apiPathsSource, /trimTrailingSlash/);
  assert.doesNotMatch(apiPathsSource, /function trimTrailingSlash\(/);
  assert.doesNotMatch(apiPathsSource, /function normalizeApiBasePath\(/);
});

test('translation-family and translation-matrix callers now route through shared/path-normalization', () => {
  const translationFamilySource = read(translationFamilySourcePath);
  const translationMatrixSource = read(translationMatrixSourcePath);

  assert.match(translationFamilySource, /from '\.\.\/shared\/path-normalization\.js'/);
  assert.match(translationFamilySource, /trimTrailingSlash/);
  assert.doesNotMatch(translationFamilySource, /function trimTrailingSlash\(/);

  assert.match(translationMatrixSource, /from '\.\.\/shared\/path-normalization\.js'/);
  assert.match(translationMatrixSource, /trimTrailingSlash/);
  assert.match(translationMatrixSource, /deriveBasePathFromAPIEndpoint/);
  assert.doesNotMatch(translationMatrixSource, /function trimTrailingSlash\(/);
  assert.doesNotMatch(translationMatrixSource, /function deriveBasePathFromEndpoint\(/);
});
