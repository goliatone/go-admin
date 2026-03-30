import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const fileUploaderSourcePath = path.resolve(testFileDir, '../src/formgen/file_uploader.ts');
const blockEditorSourcePath = path.resolve(testFileDir, '../src/formgen/block_editor.ts');
const blockLibraryPickerSourcePath = path.resolve(testFileDir, '../src/formgen/block_library_picker.ts');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

test('formgen config parsers route object-shaped config reads through shared json-parse', () => {
  const fileUploaderSource = read(fileUploaderSourcePath);
  const blockEditorSource = read(blockEditorSourcePath);
  const blockLibraryPickerSource = read(blockLibraryPickerSourcePath);

  assert.match(fileUploaderSource, /from '\.\.\/shared\/json-parse\.js'/);
  assert.match(fileUploaderSource, /parseJSONValue/);
  assert.ok(!fileUploaderSource.includes('const parsed = JSON.parse(raw)'));

  assert.match(blockEditorSource, /from '\.\.\/shared\/json-parse\.js'/);
  assert.match(blockEditorSource, /parseJSONValue/);
  assert.ok(!blockEditorSource.includes('const parsed = JSON.parse(raw)'));

  assert.match(blockLibraryPickerSource, /from '\.\.\/shared\/json-parse\.js'/);
  assert.match(blockLibraryPickerSource, /from '\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(blockLibraryPickerSource, /parseJSONValue/);
  assert.match(blockLibraryPickerSource, /readHTTPJSON<T>\(resp\)/);
  assert.ok(!blockLibraryPickerSource.includes('const parsed = JSON.parse(raw)'));
  assert.equal((blockLibraryPickerSource.match(/resp\.json\(\) as Promise</g) || []).length, 0);
});
