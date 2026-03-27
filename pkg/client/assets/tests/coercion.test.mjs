import test from 'node:test';
import assert from 'node:assert/strict';

const coercion = await import('../dist/shared/coercion.js');

test('shared coercion helpers normalize primitive scalar values', () => {
  assert.equal(coercion.asString('  value  '), 'value');
  assert.equal(coercion.asString(10), '');

  assert.equal(coercion.asBoolean(true), true);
  assert.equal(coercion.asBoolean('true'), false);

  assert.equal(coercion.asLooseBoolean(true), true);
  assert.equal(coercion.asLooseBoolean(' true '), true);
  assert.equal(coercion.asLooseBoolean('1'), true);
  assert.equal(coercion.asLooseBoolean(1), true);
  assert.equal(coercion.asLooseBoolean('false'), false);

  assert.equal(coercion.asNumber(12, 3), 12);
  assert.equal(coercion.asNumber('12', 3), 3);

  assert.equal(coercion.asNumberish(12, 3), 12);
  assert.equal(coercion.asNumberish('12', 3), 12);
  assert.equal(coercion.asNumberish('bad', 3), 3);
});

test('shared coercion helpers normalize records and string arrays', () => {
  assert.deepEqual(coercion.asRecord({ id: 'one' }), { id: 'one' });
  assert.deepEqual(coercion.asRecord(['one']), {});
  assert.deepEqual(coercion.asRecord(null), {});

  assert.deepEqual(coercion.asStringArray([' one ', '', 10, 'two ']), ['one', 'two']);
  assert.deepEqual(coercion.asUniqueStringArray([' one ', 'two', 'one', ' two ']), ['one', 'two']);
});

test('shared coercion helpers expose optional variants for contracts', () => {
  assert.equal(coercion.asOptionalString('  value  '), 'value');
  assert.equal(coercion.asOptionalString('   '), undefined);
  assert.equal(coercion.asOptionalString(12), undefined);

  assert.equal(coercion.asOptionalNumber(42), 42);
  assert.equal(coercion.asOptionalNumber('42'), undefined);
});
