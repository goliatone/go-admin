import test from 'node:test';
import assert from 'node:assert/strict';

const esignUtils = await import('../dist/esign/index.js');

test('source-management shared date formatter preserves locale-string rendering', () => {
  const input = '2026-03-27T18:45:00Z';
  const expected = new Date(input).toLocaleString();

  assert.equal(esignUtils.formatSourceManagementDateTime(input), expected);
});

test('source-management shared date formatter escapes invalid input', () => {
  const input = '<script>alert(1)</script>';

  assert.equal(
    esignUtils.formatSourceManagementDateTime(input),
    '&lt;script&gt;alert(1)&lt;/script&gt;'
  );
});

test('source-management shared relative-time formatter preserves recent-age display', () => {
  const input = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  assert.equal(esignUtils.formatSourceManagementRelativeTime(input), '2h ago');
});

test('source-management shared relative-time formatter preserves empty invalid-date behavior', () => {
  assert.equal(esignUtils.formatSourceManagementRelativeTime('not-a-date'), '');
  assert.equal(esignUtils.formatSourceManagementRelativeTime(''), '');
});
