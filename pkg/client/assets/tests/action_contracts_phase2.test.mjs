import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const {
  normalizeActionStateRecord,
  normalizeListActionStatePayload,
  normalizeDetailActionStatePayload,
} = await import('../dist/datatable/index.js');

async function loadFixture() {
  const fixtureURL = new URL('./fixtures/action_contracts_phase1/canonical_contracts.json', import.meta.url);
  return JSON.parse(await readFile(fixtureURL, 'utf8'));
}

test('shared action-state parser normalizes row and bulk state through one list payload path', async () => {
  const fixture = await loadFixture();
  const payload = {
    records: [fixture.row_contract.record],
    $meta: fixture.list_contract.$meta,
  };

  const normalized = normalizeListActionStatePayload(payload);
  assert.ok(normalized);
  assert.equal(normalized.records[0]._action_state.delete.reason_code, 'RESOURCE_IN_USE');
  assert.equal(normalized.$meta.bulk_action_state.delete.reason_code, 'INVALID_SELECTION');
});

test('shared action-state parser normalizes detail payload state without page-specific parsing', async () => {
  const fixture = await loadFixture();
  const normalized = normalizeDetailActionStatePayload(fixture.detail_contract);

  assert.ok(normalized);
  assert.equal(normalized.data._action_state.delete.reason_code, 'RESOURCE_IN_USE');
  assert.equal(normalized.data._action_state.delete.remediation.kind, 'link');
});

test('row action-state records normalize consistently outside list/detail wrappers', async () => {
  const fixture = await loadFixture();
  const normalized = normalizeActionStateRecord(fixture.row_contract.record);

  assert.ok(normalized);
  assert.equal(normalized._action_state.delete.reason_code, 'RESOURCE_IN_USE');
  assert.equal(normalized._action_state.delete.metadata.agreement_count, 2);
});
