import test from 'node:test';
import assert from 'node:assert/strict';

const dateFormatters = await import('../dist/content-type-builder/shared/date-formatters.js');

test('content-type-builder shared date formatter preserves localized version date rendering', () => {
  const input = '2026-03-27T10:45:00Z';
  const expected = new Date(input).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  assert.equal(dateFormatters.formatContentTypeDate(input), expected);
});

test('content-type-builder shared date formatter preserves existing invalid-date behavior', () => {
  const input = 'not-a-date';
  const expected = new Date(input).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  assert.equal(dateFormatters.formatContentTypeDate(input), expected);
});
