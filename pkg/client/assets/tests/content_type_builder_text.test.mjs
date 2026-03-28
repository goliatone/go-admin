import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const textHelpers = await import('../dist/content-type-builder/shared/text.js');

const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const apiClientSourcePath = path.resolve(testFileDir, '../src/content-type-builder/api-client.ts');
const blockEditorPanelSourcePath = path.resolve(testFileDir, '../src/content-type-builder/block-editor-panel.ts');
const blockFieldTypeRegistrySourcePath = path.resolve(testFileDir, '../src/content-type-builder/block-field-type-registry.ts');
const blockLibraryIdeSourcePath = path.resolve(testFileDir, '../src/content-type-builder/block-library-ide.ts');
const blockLibraryManagerSourcePath = path.resolve(testFileDir, '../src/content-type-builder/block-library-manager.ts');
const contentTypeEditorSourcePath = path.resolve(testFileDir, '../src/content-type-builder/content-type-editor.ts');
const blockPickerSourcePath = path.resolve(testFileDir, '../src/content-type-builder/shared/block-picker.ts');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

test('content-type-builder shared text helpers preserve identifier title casing', () => {
  assert.equal(textHelpers.titleCaseIdentifier('heroBanner'), 'Hero Banner');
  assert.equal(textHelpers.titleCaseIdentifier('seo_meta-title'), 'Seo Meta Title');
});

test('content-type-builder shared text helpers preserve underscore word title casing', () => {
  assert.equal(textHelpers.titleCaseWords('rich_text'), 'Rich Text');
  assert.equal(textHelpers.titleCaseWords('advanced_field'), 'Advanced Field');
});

test('content-type-builder shared text helpers preserve single-token capitalization', () => {
  assert.equal(textHelpers.capitalizeLabel('media'), 'Media');
  assert.equal(textHelpers.capitalizeLabel('LAYOUT'), 'Layout');
});

test('content-type-builder shared text helpers preserve slug normalization', () => {
  assert.equal(textHelpers.nameToSlug('Hero Banner'), 'hero-banner');
  assert.equal(textHelpers.nameToSlug('  SEO_Meta Title  '), 'seo-meta-title');
});

test('content-type-builder title-case callers now route through the shared text helper module', () => {
  const apiClientSource = read(apiClientSourcePath);
  const blockEditorPanelSource = read(blockEditorPanelSourcePath);
  const blockFieldTypeRegistrySource = read(blockFieldTypeRegistrySourcePath);
  const blockLibraryIdeSource = read(blockLibraryIdeSourcePath);
  const blockLibraryManagerSource = read(blockLibraryManagerSourcePath);
  const contentTypeEditorSource = read(contentTypeEditorSourcePath);
  const blockPickerSource = read(blockPickerSourcePath);

  assert.match(apiClientSource, /titleCaseIdentifier/);
  assert.match(blockEditorPanelSource, /titleCaseWords/);
  assert.match(blockFieldTypeRegistrySource, /titleCaseWords/);
  assert.match(blockLibraryIdeSource, /capitalizeLabel/);
  assert.match(blockLibraryManagerSource, /capitalizeLabel/);
  assert.match(contentTypeEditorSource, /titleCaseIdentifier/);
  assert.match(blockPickerSource, /titleCaseWords/);
});

test('content-type-builder slug callers now route through the shared text helper module', () => {
  const blockLibraryIdeSource = read(blockLibraryIdeSourcePath);
  const contentTypeEditorSource = read(contentTypeEditorSourcePath);

  assert.match(blockLibraryIdeSource, /nameToSlug/);
  assert.match(contentTypeEditorSource, /nameToSlug/);
});
