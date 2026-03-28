import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sharedTimeFormatters = await import('../dist/shared/time-formatters.js');

const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const feedbackSourcePath = path.resolve(testFileDir, '../src/esign/pages/agreement-form/feedback.ts');
const compositionSourcePath = path.resolve(testFileDir, '../src/esign/pages/agreement-form/composition.ts');

function withFixedNow(isoString, fn) {
  const originalNow = Date.now;
  Date.now = () => new Date(isoString).getTime();
  try {
    return fn();
  } finally {
    Date.now = originalNow;
  }
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

test('agreement-form verbose past-relative helper preserves feedback controller wording', () => {
  withFixedNow('2026-03-27T12:00:00Z', () => {
    assert.equal(
      sharedTimeFormatters.formatRelativeTimeVerbosePast('2026-03-27T11:58:00Z', {
        emptyFallback: 'unknown',
        invalidFallback: 'Invalid Date',
      }),
      '2 minutes ago'
    );
    assert.equal(
      sharedTimeFormatters.formatRelativeTimeVerbosePast('2026-03-27T10:00:00Z', {
        emptyFallback: 'unknown',
        invalidFallback: 'Invalid Date',
      }),
      '2 hours ago'
    );
    assert.equal(
      sharedTimeFormatters.formatRelativeTimeVerbosePast('2026-03-25T12:00:00Z', {
        emptyFallback: 'unknown',
        invalidFallback: 'Invalid Date',
      }),
      '2 days ago'
    );
  });
});

test('agreement-form verbose past-relative helper preserves empty, invalid, and older-date fallback behavior', () => {
  withFixedNow('2026-03-27T12:00:00Z', () => {
    const older = '2026-03-18T12:00:00Z';

    assert.equal(
      sharedTimeFormatters.formatRelativeTimeVerbosePast('', {
        emptyFallback: 'unknown',
        invalidFallback: 'Invalid Date',
      }),
      'unknown'
    );
    assert.equal(
      sharedTimeFormatters.formatRelativeTimeVerbosePast('not-a-date', {
        emptyFallback: 'unknown',
        invalidFallback: 'Invalid Date',
      }),
      'Invalid Date'
    );
    assert.equal(
      sharedTimeFormatters.formatRelativeTimeVerbosePast(older, {
        emptyFallback: 'unknown',
        invalidFallback: 'Invalid Date',
      }),
      new Date(older).toLocaleDateString()
    );
  });
});

test('agreement-form source contract uses shared verbose past-relative helper in feedback and composition', () => {
  const feedbackSource = read(feedbackSourcePath);
  const compositionSource = read(compositionSourcePath);

  assert.match(feedbackSource, /formatRelativeTimeVerbosePast/);
  assert.match(compositionSource, /formatRelativeTimeVerbosePast/);
  assert.doesNotMatch(compositionSource, /feedbackController\?\.formatRelativeTime/);
});
