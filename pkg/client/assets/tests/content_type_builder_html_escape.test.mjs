import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { escapeHTML } = await import('../dist/shared/html.js');

const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const blockEditorPanelSourcePath = path.resolve(testFileDir, '../src/content-type-builder/block-editor-panel.ts');
const blockLibraryIdeSourcePath = path.resolve(testFileDir, '../src/content-type-builder/block-library-ide.ts');
const fieldPalettePanelSourcePath = path.resolve(testFileDir, '../src/content-type-builder/field-palette-panel.ts');
const entityHeaderSourcePath = path.resolve(testFileDir, '../src/content-type-builder/shared/entity-header.ts');
const fieldCardSourcePath = path.resolve(testFileDir, '../src/content-type-builder/shared/field-card.ts');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

test('shared HTML escape helper preserves content-type-builder escaping semantics', () => {
  assert.equal(escapeHTML(`<&>"'`), '&lt;&amp;&gt;&quot;&#39;');
  assert.equal(escapeHTML('already safe'), 'already safe');
});

test('content-type-builder callers now route esc(...) through shared/html', () => {
  const blockEditorPanelSource = read(blockEditorPanelSourcePath);
  const blockLibraryIdeSource = read(blockLibraryIdeSourcePath);
  const fieldPalettePanelSource = read(fieldPalettePanelSourcePath);
  const entityHeaderSource = read(entityHeaderSourcePath);
  const fieldCardSource = read(fieldCardSourcePath);

  assert.match(blockEditorPanelSource, /escapeHTML as esc/);
  assert.match(blockLibraryIdeSource, /escapeHTML as esc/);
  assert.match(fieldPalettePanelSource, /escapeHTML as esc/);
  assert.match(entityHeaderSource, /escapeHTML as esc/);
  assert.match(fieldCardSource, /escapeHTML as esc/);
});

test('content-type-builder files no longer keep local esc helper definitions', () => {
  const sources = [
    read(blockEditorPanelSourcePath),
    read(blockLibraryIdeSourcePath),
    read(fieldPalettePanelSourcePath),
    read(entityHeaderSourcePath),
    read(fieldCardSourcePath),
  ];

  for (const source of sources) {
    assert.doesNotMatch(source, /function esc\(/);
  }
});
