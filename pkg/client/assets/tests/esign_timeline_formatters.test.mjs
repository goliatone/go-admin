import test from 'node:test';
import assert from 'node:assert/strict';

const agreementDetail = await import('../dist/esign/agreement-detail.js');
const timelineFormatters = await import('../dist/esign/timeline-formatters.js');

test('esign timeline shared formatTimestamp preserves agreement-detail timestamp rendering', () => {
  const input = '2026-03-27T18:45:00Z';
  const expected = timelineFormatters.formatTimestamp(input);

  assert.equal(agreementDetail.formatTimestamp(input), expected);
});

test('esign timeline shared formatRelativeTime preserves agreement-detail relative-time rendering', () => {
  const input = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const expected = timelineFormatters.formatRelativeTime(input);

  assert.equal(agreementDetail.formatRelativeTime(input), expected);
});

test('esign timeline shared formatters preserve existing invalid-date behavior', () => {
  const input = 'not-a-date';

  assert.equal(agreementDetail.formatTimestamp(input), timelineFormatters.formatTimestamp(input));
  assert.equal(agreementDetail.formatRelativeTime(input), timelineFormatters.formatRelativeTime(input));
});
