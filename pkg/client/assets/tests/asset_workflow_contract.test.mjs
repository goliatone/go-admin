import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const packageJSONPath = path.resolve(testFileDir, '../package.json');
const packageJSON = JSON.parse(fs.readFileSync(packageJSONPath, 'utf8'));

test('asset test workflow does not delete embedded dist before rebuilding', () => {
  const testScript = packageJSON?.scripts?.test || '';

  assert.ok(testScript, 'expected package.json scripts.test to exist');
  assert.doesNotMatch(testScript, /\bnpm run clean\b/);
  assert.match(testScript, /\bnpm run build\b/);
});

test('asset workflow keeps an explicit clean-and-test script for isolated rebuilds', () => {
  const cleanScript = packageJSON?.scripts?.clean || '';
  const cleanTestScript = packageJSON?.scripts?.['test:clean'] || '';

  assert.ok(cleanScript, 'expected package.json scripts.clean to exist');
  assert.equal(cleanTestScript, 'npm run clean && npm test');
});
