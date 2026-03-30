import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const jsonParse = await import('../dist/shared/json-parse.js');

const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const blockEditorSourcePath = path.resolve(testFileDir, '../src/formgen/block_editor.ts');
const blockLibraryPickerSourcePath = path.resolve(testFileDir, '../src/formgen/block_library_picker.ts');

test('shared json parser preserves array-only fallback behavior', () => {
  assert.deepEqual(jsonParse.parseJSONArray('[1,2,3]', []), [1, 2, 3]);
  assert.deepEqual(jsonParse.parseJSONArray(' {"a":1} ', []), []);
  assert.deepEqual(jsonParse.parseJSONArray('   ', ['fallback']), ['fallback']);

  let handledError = null;
  assert.deepEqual(
    jsonParse.parseJSONArray('{bad json}', [], {
      onError: (error) => {
        handledError = error;
      },
    }),
    []
  );
  assert.ok(handledError instanceof Error);
});

test('formgen block payload readers route array decoding through shared json-parse', () => {
  const blockEditorSource = readFileSync(blockEditorSourcePath, 'utf8');
  const blockLibraryPickerSource = readFileSync(blockLibraryPickerSourcePath, 'utf8');

  assert.match(blockEditorSource, /from '\.\.\/shared\/json-parse\.js'/);
  assert.match(blockEditorSource, /parseJSONArray<any>\(output\.value, \[\]\)/);
  assert.match(blockEditorSource, /parseJSONArray<any>\(legacyBlocksAttr, \[\]\)/);
  assert.ok(!blockEditorSource.includes('JSON.parse(initialValue)'));
  assert.ok(!blockEditorSource.includes('JSON.parse(legacyBlocksAttr)'));

  assert.match(blockLibraryPickerSource, /from '\.\.\/shared\/json-parse\.js'/);
  assert.match(blockLibraryPickerSource, /parseJSONArray<any>\(output\?\.value, \[\]\)/);
  assert.ok(!blockLibraryPickerSource.includes('JSON.parse(output.value)'));
});
