import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const preferencesSourcePath = path.resolve(testFileDir, '../src/formgen/preferences.ts');
const schemaEditorSourcePath = path.resolve(testFileDir, '../src/formgen/schema_editor.ts');
const blockLibraryPickerSourcePath = path.resolve(testFileDir, '../src/formgen/block_library_picker.ts');

test('formgen JSON input helpers route through shared json-parse while preserving local contracts', () => {
  const preferencesSource = readFileSync(preferencesSourcePath, 'utf8');
  const schemaEditorSource = readFileSync(schemaEditorSourcePath, 'utf8');
  const blockLibraryPickerSource = readFileSync(blockLibraryPickerSourcePath, 'utf8');

  assert.match(preferencesSource, /from '\.\.\/shared\/json-parse\.js'/);
  assert.match(preferencesSource, /parseJSONValue<unknown>\(trimmed, null/);
  assert.ok(!preferencesSource.includes('return { value: JSON.parse(trimmed), empty: false };'));

  assert.match(schemaEditorSource, /from '\.\.\/shared\/json-parse\.js'/);
  assert.match(schemaEditorSource, /parseJSONValue<any>\(trimmed, null/);
  assert.ok(!schemaEditorSource.includes('return { value: JSON.parse(trimmed) };'));

  assert.match(blockLibraryPickerSource, /from '\.\.\/shared\/json-parse\.js'/);
  assert.match(blockLibraryPickerSource, /function parseJSONAttr<T>\(value: string \| null \| undefined, fallback: T\): T \{\s*return parseJSONValue<T>\(value, fallback\);/m);
  assert.ok(!blockLibraryPickerSource.includes('return JSON.parse(value) as T;'));
});
