import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sizeFormatters = await import('../dist/shared/size-formatters.js');

const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const debugUtilsSourcePath = path.resolve(testFileDir, '../src/debug/shared/utils.ts');
const debugRequestsSourcePath = path.resolve(testFileDir, '../src/debug/shared/panels/requests.ts');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function formatDebugBytes(value) {
  return sizeFormatters.formatByteSize(value, {
    emptyFallback: '0 B',
    zeroFallback: '0 B',
    invalidFallback: '0 B',
    unitLabels: ['B', 'KB', 'MB'],
    precisionByUnit: [0, 1, 1],
  });
}

test('shared size formatter preserves the debug byte-count contract', () => {
  assert.equal(formatDebugBytes(undefined), '0 B');
  assert.equal(formatDebugBytes(0), '0 B');
  assert.equal(formatDebugBytes(1536), '1.5 KB');
  assert.equal(formatDebugBytes(1024 * 1024 * 1024), '1024.0 MB');
});

test('debug byte formatter source contract uses the shared size formatter', () => {
  const debugUtilsSource = read(debugUtilsSourcePath);
  const debugRequestsSource = read(debugRequestsSourcePath);

  assert.match(debugUtilsSource, /formatByteSize/);
  assert.match(debugUtilsSource, /unitLabels:\s*\['B', 'KB', 'MB'\]/);
  assert.match(debugRequestsSource, /formatBytes\(entry\.request_size\)/);
  assert.match(debugRequestsSource, /formatBytes\(entry\.response_size\)/);
});
