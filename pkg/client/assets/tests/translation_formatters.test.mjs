import test from 'node:test';
import assert from 'node:assert/strict';

const translationFormatters = await import('../dist/translation-shared/formatters.js');

test('translation shared formatters preserve UTC timestamp rendering for detail views', () => {
  assert.equal(
    translationFormatters.formatTranslationTimestampUTC('2026-03-27T10:45:00Z'),
    '2026-03-27 10:45 UTC'
  );
  assert.equal(translationFormatters.formatTranslationTimestampUTC(''), '');
  assert.equal(translationFormatters.formatTranslationTimestampUTC('not-a-date'), 'not-a-date');
});

test('translation shared formatters preserve compact date rendering with caller fallback labels', () => {
  assert.equal(
    translationFormatters.formatTranslationShortDateTime('', 'Pending'),
    'Pending'
  );
  assert.equal(
    translationFormatters.formatTranslationShortDateTime('not-a-date', 'Pending'),
    'not-a-date'
  );

  const formatted = translationFormatters.formatTranslationShortDateTime('2026-03-27T10:45:00Z', 'Pending');
  assert.match(formatted, /(:45|10|11|12)/);
});

test('translation shared formatters preserve sentence casing for underscore-delimited tokens', () => {
  assert.equal(translationFormatters.sentenceCaseToken('in_review'), 'In review');
  assert.equal(translationFormatters.sentenceCaseToken(''), '');
  assert.equal(translationFormatters.sentenceCaseToken('draft'), 'Draft');
});
