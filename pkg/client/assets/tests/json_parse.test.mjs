import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const jsonParse = await import('../dist/shared/json-parse.js');

const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const entryNavigationSourcePath = path.resolve(testFileDir, '../src/entry-navigation/index.ts');
const translationFamilySourcePath = path.resolve(testFileDir, '../src/translation-family/index.ts');
const contentTypeEditorRuntimeSourcePath = path.resolve(testFileDir, '../src/content-type-builder/content-editor-runtime.ts');
const contentTypeEditorSourcePath = path.resolve(testFileDir, '../src/content-type-builder/content-type-editor.ts');
const blockEditorPanelSourcePath = path.resolve(testFileDir, '../src/content-type-builder/block-editor-panel.ts');
const blockLibraryIdeSourcePath = path.resolve(testFileDir, '../src/content-type-builder/block-library-ide.ts');
const fieldConfigFormSourcePath = path.resolve(testFileDir, '../src/content-type-builder/field-config-form.ts');

test('shared json parser preserves fallback and script bootstrap behavior', () => {
  assert.deepEqual(jsonParse.parseJSONValue('{"enabled":true}', {}), { enabled: true });
  assert.deepEqual(jsonParse.parseJSONValue('   ', { fallback: true }), { fallback: true });
  assert.equal(jsonParse.parseJSONValue('null', 'fallback'), null);

  let handledError = null;
  assert.deepEqual(
    jsonParse.parseJSONValue('{bad json}', { fallback: true }, {
      onError: (error) => {
        handledError = error;
      },
    }),
    { fallback: true }
  );
  assert.ok(handledError instanceof Error);

  const root = {
    getElementById(id) {
      if (id === 'config') {
        return { textContent: ' {"page":"runtime"} ' };
      }
      if (id === 'broken') {
        return { textContent: '{bad json}' };
      }
      return null;
    },
  };

  assert.deepEqual(jsonParse.readJSONScriptValue('config', null, { root }), { page: 'runtime' });
  assert.equal(jsonParse.readJSONScriptValue('missing', null, { root }), null);
  assert.deepEqual(jsonParse.readJSONScriptValue('broken', { safe: true }, { root }), { safe: true });

  const selectorRoot = {
    querySelector(selector) {
      if (selector === '#config') {
        return { textContent: ' {"page":"selector"} ' };
      }
      if (selector === '#broken') {
        return { textContent: '{bad json}' };
      }
      return null;
    },
  };

  assert.deepEqual(jsonParse.readJSONSelectorValue('#config', null, { root: selectorRoot }), {
    page: 'selector',
  });
  assert.equal(jsonParse.readJSONSelectorValue('#missing', null, { root: selectorRoot }), null);
  assert.deepEqual(
    jsonParse.readJSONSelectorValue('#broken', { safe: true }, { root: selectorRoot }),
    { safe: true }
  );
});

test('json/bootstrap callers now route through shared json-parse helper', () => {
  const entryNavigationSource = readFileSync(entryNavigationSourcePath, 'utf8');
  const translationFamilySource = readFileSync(translationFamilySourcePath, 'utf8');
  const contentTypeEditorRuntimeSource = readFileSync(contentTypeEditorRuntimeSourcePath, 'utf8');
  const contentTypeEditorSource = readFileSync(contentTypeEditorSourcePath, 'utf8');
  const blockEditorPanelSource = readFileSync(blockEditorPanelSourcePath, 'utf8');
  const blockLibraryIdeSource = readFileSync(blockLibraryIdeSourcePath, 'utf8');
  const fieldConfigFormSource = readFileSync(fieldConfigFormSourcePath, 'utf8');

  assert.match(entryNavigationSource, /from '\.\.\/shared\/json-parse\.js'/);
  assert.match(entryNavigationSource, /parseJSONValue/);
  assert.ok(!entryNavigationSource.includes('JSON.parse('));

  assert.match(translationFamilySource, /from '\.\.\/shared\/json-parse\.js'/);
  assert.ok(!translationFamilySource.includes('function parseJSONAttribute('));

  assert.match(contentTypeEditorRuntimeSource, /from '\.\.\/shared\/json-parse\.js'/);
  assert.match(contentTypeEditorRuntimeSource, /parseJSONValue/);
  assert.ok(!contentTypeEditorRuntimeSource.includes('JSON.parse('));

  assert.match(contentTypeEditorSource, /from '\.\.\/shared\/json-parse\.js'/);
  assert.match(contentTypeEditorSource, /parseJSONValue/);
  assert.ok(!contentTypeEditorSource.includes('JSON.parse('));

  assert.match(blockEditorPanelSource, /from '\.\.\/shared\/json-parse\.js'/);
  assert.match(blockEditorPanelSource, /parseJSONValue/);
  assert.ok(!blockEditorPanelSource.includes('JSON.parse('));

  assert.match(blockLibraryIdeSource, /from '\.\.\/shared\/json-parse\.js'/);
  assert.match(blockLibraryIdeSource, /parseJSONValue/);
  assert.ok(!blockLibraryIdeSource.includes('JSON.parse('));

  assert.match(fieldConfigFormSource, /from '\.\.\/shared\/json-parse\.js'/);
  assert.match(fieldConfigFormSource, /parseJSONValue/);
  assert.ok(!fieldConfigFormSource.includes('JSON.parse('));
});
