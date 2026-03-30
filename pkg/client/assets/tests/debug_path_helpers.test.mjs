import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { normalizeDebugBasePath } = await import('../dist/debug/shared/path-helpers.js');

const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const debugManagerSourcePath = path.resolve(testFileDir, '../src/debug/toolbar/debug-manager.ts');
const debugStreamSourcePath = path.resolve(testFileDir, '../src/debug/debug-stream.ts');
const replTerminalSourcePath = path.resolve(testFileDir, '../src/debug/repl/repl-terminal.ts');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

test('debug shared path helper preserves base-path normalization semantics', () => {
  assert.equal(normalizeDebugBasePath(undefined), '');
  assert.equal(normalizeDebugBasePath(''), '');
  assert.equal(normalizeDebugBasePath('/'), '');
  assert.equal(normalizeDebugBasePath('debug'), '/debug');
  assert.equal(normalizeDebugBasePath('/debug/'), '/debug');
  assert.equal(normalizeDebugBasePath(' //debug// '), '/debug');
});

test('debug callers now route through the shared path helper module', () => {
  const debugManagerSource = read(debugManagerSourcePath);
  const debugStreamSource = read(debugStreamSourcePath);
  const replTerminalSource = read(replTerminalSourcePath);

  assert.match(debugManagerSource, /normalizeDebugBasePath/);
  assert.match(debugStreamSource, /normalizeDebugBasePath/);
  assert.match(replTerminalSource, /normalizeDebugBasePath/);

  assert.doesNotMatch(debugManagerSource, /const normalizeBasePath =/);
  assert.doesNotMatch(debugStreamSource, /const normalizeBasePath =/);
  assert.doesNotMatch(replTerminalSource, /const normalizeBasePath =/);
});
