import test from 'node:test';
import assert from 'node:assert/strict';

const recordNormalization = await import('../dist/shared/record-normalization.js');

test('shared record normalization preserves caller key policies for string maps', () => {
  assert.deepEqual(
    recordNormalization.normalizeStringRecord(
      { ' keep ': '  value  ', blank: '   ', '': 'ignored' },
      { omitEmptyValues: true }
    ),
    { ' keep ': 'value', '': 'ignored' }
  );

  assert.deepEqual(
    recordNormalization.normalizeStringRecord(
      { ' keep ': '  value  ', blank: '   ', '   ': 'ignored' },
      { trimKeys: true, omitBlankKeys: true }
    ),
    { keep: 'value', blank: '' }
  );
});

test('shared record normalization preserves caller key policies for number maps', () => {
  assert.deepEqual(
    recordNormalization.normalizeNumberRecord(
      { ' count ': 2, total: 'bad', '   ': 4 },
      { trimKeys: true, omitBlankKeys: true, fallback: 9 }
    ),
    { count: 2, total: 9 }
  );
});
