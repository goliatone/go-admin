import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { deepCloneJSON } = await import('../dist/shared/deep-clone.js');

const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const apiClientSourcePath = path.resolve(testFileDir, '../src/content-type-builder/api-client.ts');
const layoutEditorSourcePath = path.resolve(testFileDir, '../src/content-type-builder/layout-editor.ts');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

test('shared deep clone helper preserves json-compatible clone semantics', () => {
  const original = {
    type: 'tabs',
    tabs: [{ id: 'main', title: 'Main', sections: ['hero'] }],
    flags: { draft: true },
  };

  const cloned = deepCloneJSON(original);

  assert.deepEqual(cloned, original);
  assert.notEqual(cloned, original);
  assert.notEqual(cloned.tabs, original.tabs);
  assert.notEqual(cloned.flags, original.flags);
});

test('content-type-builder callers route deep cloning through shared helper', () => {
  const apiClientSource = read(apiClientSourcePath);
  const layoutEditorSource = read(layoutEditorSourcePath);

  assert.match(apiClientSource, /from '\.\.\/shared\/deep-clone\.js'/);
  assert.match(apiClientSource, /deepCloneJSON/);
  assert.ok(!apiClientSource.includes('JSON.parse(JSON.stringify('));

  assert.match(layoutEditorSource, /from '\.\.\/shared\/deep-clone\.js'/);
  assert.match(layoutEditorSource, /deepCloneJSON/);
  assert.ok(!layoutEditorSource.includes('JSON.parse(JSON.stringify('));
});
