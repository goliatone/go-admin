import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const statusBadges = await import('../dist/content-type-builder/shared/status-badges.js');

const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const blockLibraryIdeSourcePath = path.resolve(testFileDir, '../src/content-type-builder/block-library-ide.ts');
const blockLibraryManagerSourcePath = path.resolve(testFileDir, '../src/content-type-builder/block-library-manager.ts');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

test('content-type-builder shared status helpers preserve block status normalization', () => {
  assert.equal(statusBadges.normalizeBlockStatus('draft'), 'draft');
  assert.equal(statusBadges.normalizeBlockStatus('deprecated'), 'deprecated');
  assert.equal(statusBadges.normalizeBlockStatus('active'), 'active');
  assert.equal(statusBadges.normalizeBlockStatus(''), 'active');
  assert.equal(statusBadges.normalizeBlockStatus(undefined), 'active');
});

test('content-type-builder shared status helpers preserve block status badge labels', () => {
  assert.match(statusBadges.renderBlockStatusBadge('draft'), />Draft</);
  assert.match(statusBadges.renderBlockStatusBadge('deprecated'), />Deprecated</);
  assert.match(statusBadges.renderBlockStatusBadge('active'), />Active</);
});

test('content-type-builder shared status helpers no longer expose the color-only dot', () => {
  // T05 removed renderBlockStatusDot in favor of the accessible text+color badge,
  // so every modeling surface presents status as label + tone (never color alone).
  assert.equal(statusBadges.renderBlockStatusDot, undefined);
});

test('content-type-builder block status callers route through the shared badge helper', () => {
  const blockLibraryIdeSource = read(blockLibraryIdeSourcePath);
  const blockLibraryManagerSource = read(blockLibraryManagerSourcePath);

  assert.match(blockLibraryIdeSource, /renderBlockStatusBadge/);
  assert.doesNotMatch(blockLibraryIdeSource, /renderBlockStatusDot/);
  assert.match(blockLibraryManagerSource, /renderBlockStatusBadge/);
});
