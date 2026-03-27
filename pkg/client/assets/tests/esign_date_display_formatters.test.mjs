import test from 'node:test';
import assert from 'node:assert/strict';

const esignUtils = await import('../dist/esign/index.js');

test('lineage shared date formatter preserves optional locale-string rendering', () => {
  const input = '2026-03-27T18:45:00Z';
  const expected = new Date(input).toLocaleString();

  assert.equal(esignUtils.formatLineageDateTime(input), expected);
  assert.equal(esignUtils.formatLineageDateTime(''), undefined);
  assert.equal(esignUtils.formatLineageDateTime('not-a-date'), undefined);
});

test('google drive shared date formatter preserves date-only rendering', () => {
  const input = '2026-03-27T18:45:00Z';
  const expected = new Date(input).toLocaleDateString();

  assert.equal(esignUtils.formatGoogleDriveDate(input), expected);
  assert.equal(esignUtils.formatDriveDate(input), expected);
});

test('google drive shared date formatter preserves fallback behavior for empty and invalid input', () => {
  assert.equal(esignUtils.formatGoogleDriveDate(''), '-');
  assert.equal(esignUtils.formatGoogleDriveDate('not-a-date'), '-');
});
