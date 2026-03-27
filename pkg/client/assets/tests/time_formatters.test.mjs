import test from 'node:test';
import assert from 'node:assert/strict';

const sharedTimeFormatters = await import('../dist/shared/time-formatters.js');
const activity = await import('../dist/activity/index.js');
const tabs = await import('../dist/tabs/index.js');

function withFixedNow(isoString, fn) {
  const originalNow = Date.now;
  Date.now = () => new Date(isoString).getTime();
  try {
    return fn();
  } finally {
    Date.now = originalNow;
  }
}

test('shared time formatters parse timestamps and preserve fallback behavior', () => {
  const iso = '2026-03-27T12:00:00Z';

  assert.equal(sharedTimeFormatters.parseTimeValue(''), null);
  assert.equal(sharedTimeFormatters.parseTimeValue('not-a-date'), null);
  assert.equal(sharedTimeFormatters.parseTimeValue(iso)?.toISOString(), '2026-03-27T12:00:00.000Z');
  assert.equal(
    sharedTimeFormatters.formatAbsoluteDateTime('not-a-date', { invalidFallback: '__ORIGINAL__' }),
    'not-a-date'
  );
});

test('shared compact past relative formatter preserves activity-style output', () => {
  withFixedNow('2026-03-27T12:00:00Z', () => {
    assert.equal(
      sharedTimeFormatters.formatRelativeTimeCompactPast('2026-03-27T11:59:45Z', {
        emptyFallback: '',
        invalidFallback: '__ORIGINAL__',
      }),
      'just now'
    );
    assert.equal(
      sharedTimeFormatters.formatRelativeTimeCompactPast('2026-03-27T10:00:00Z', {
        emptyFallback: '',
        invalidFallback: '__ORIGINAL__',
      }),
      '2h ago'
    );
    assert.equal(
      sharedTimeFormatters.formatRelativeTimeCompactPast('not-a-date', {
        emptyFallback: '',
        invalidFallback: '__ORIGINAL__',
      }),
      'not-a-date'
    );
  });
});

test('shared natural relative formatter preserves tabs-style bidirectional output', () => {
  withFixedNow('2026-03-27T12:00:00Z', () => {
    const expectedFuture = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(2, 'hour');
    const expectedPast = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(-2, 'hour');

    assert.equal(
      sharedTimeFormatters.formatRelativeTimeNatural('2026-03-27T14:00:00Z', {
        emptyFallback: '',
        invalidFallback: '__ORIGINAL__',
        direction: 'bidirectional',
      }),
      expectedFuture
    );
    assert.equal(
      sharedTimeFormatters.formatRelativeTimeNatural('2026-03-27T10:00:00Z', {
        emptyFallback: '',
        invalidFallback: '__ORIGINAL__',
        direction: 'bidirectional',
      }),
      expectedPast
    );
  });
});

test('activity formatters preserve short and natural relative output through shared helpers', () => {
  withFixedNow('2026-03-27T12:00:00Z', () => {
    assert.equal(activity.formatRelativeTime('2026-03-27T11:00:00Z'), '1h ago');

    const expectedNatural = new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-2, 'day');
    assert.equal(activity.formatRelativeTimeIntl('2026-03-25T12:00:00Z'), expectedNatural);
    assert.equal(activity.formatRelativeTime('not-a-date'), 'not-a-date');
    assert.equal(activity.formatRelativeTimeIntl('not-a-date'), 'not-a-date');
  });
});

test('tabs formatters preserve parse, absolute, and relative output through shared helpers', () => {
  withFixedNow('2026-03-27T12:00:00Z', () => {
    const iso = '2026-03-27T14:00:00Z';
    const parsed = tabs.parseTimestamp(iso);

    assert.equal(parsed?.toISOString(), '2026-03-27T14:00:00.000Z');
    assert.equal(tabs.parseTimestamp('not-a-date'), null);
    assert.equal(
      tabs.formatAbsoluteTime(iso),
      new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(iso))
    );
    assert.equal(
      tabs.formatRelativeTime(iso),
      new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(2, 'hour')
    );
    assert.equal(tabs.formatAbsoluteTime('not-a-date'), 'not-a-date');
    assert.equal(tabs.formatRelativeTime('not-a-date'), 'not-a-date');
  });
});
