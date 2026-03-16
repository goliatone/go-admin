import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { importDatatableModule } from './helpers/load-datatable-dist.mjs';

const {
  SchemaActionBuilder,
  getActionBlockDisplay,
  normalizeActionBlockCode,
} = await importDatatableModule();
const {
  extractStructuredError,
} = await import('../dist/toast/error-helpers.js');

async function loadFixture() {
  const fixtureURL = new URL('./fixtures/action_contracts_phase1/canonical_contracts.json', import.meta.url);
  return JSON.parse(await readFile(fixtureURL, 'utf8'));
}

function createBuilder() {
  return new SchemaActionBuilder({
    apiEndpoint: '/admin/api/panels/esign_documents',
    actionBasePath: '/admin/content/esign_documents',
    actionContext: 'row',
  });
}

function mockResponse(body, options = {}) {
  const headers = new Map([
    ['content-type', options.contentType || 'application/json'],
  ]);
  return {
    status: options.status || 409,
    headers: {
      get: (key) => headers.get(key.toLowerCase()) || null,
    },
    clone() {
      return this;
    },
    async text() {
      return JSON.stringify(body);
    },
    async json() {
      return body;
    },
  };
}

test('Phase 1 action contracts fixture exposes the canonical enriched action-state payloads', async () => {
  const fixture = await loadFixture();

  assert.equal(fixture.schema_version, 1);
  assert.ok(Array.isArray(fixture.disabled_reason_codes));
  assert.ok(Array.isArray(fixture.shared_execution_text_codes));

  const rowDeleteState = fixture.row_contract.record._action_state.delete;
  assert.equal(rowDeleteState.enabled, false);
  assert.equal(rowDeleteState.reason_code, 'RESOURCE_IN_USE');
  assert.equal(rowDeleteState.severity, 'warning');
  assert.equal(rowDeleteState.kind, 'business_rule');
  assert.equal(rowDeleteState.metadata.agreement_count, 2);
  assert.equal(rowDeleteState.remediation.kind, 'link');

  const detailDeleteState = fixture.detail_contract.data._action_state.delete;
  assert.equal(detailDeleteState.reason_code, 'RESOURCE_IN_USE');

  const bulkDeleteState = fixture.list_contract.$meta.bulk_action_state.delete;
  assert.equal(bulkDeleteState.reason_code, 'INVALID_SELECTION');
});

test('SchemaActionBuilder consumes enriched ActionState payloads from Phase 1 fixture without regression', async () => {
  const fixture = await loadFixture();
  const builder = createBuilder();

  const actions = builder.buildRowActions(
    fixture.row_contract.record,
    fixture.row_contract.schema.actions
  );

  assert.equal(actions.length, 1);
  assert.equal(actions[0].disabled, true);
  assert.equal(actions[0].disabledReason, 'Document is used by 2 agreements');
});

test('normalizeActionBlockCode normalizes reason_code and text_code through one path', async () => {
  const fixture = await loadFixture();
  const reasonCode = fixture.row_contract.record._action_state.delete.reason_code;
  const textCode = fixture.execution_failure.error.text_code;

  assert.equal(normalizeActionBlockCode(reasonCode), 'RESOURCE_IN_USE');
  assert.equal(normalizeActionBlockCode({ reason_code: reasonCode }), 'RESOURCE_IN_USE');
  assert.equal(normalizeActionBlockCode({ textCode }), 'RESOURCE_IN_USE');
  assert.equal(normalizeActionBlockCode({ text_code: textCode }), 'RESOURCE_IN_USE');
  assert.equal(normalizeActionBlockCode(fixture.execution_failure), 'RESOURCE_IN_USE');
});

test('getActionBlockDisplay routes both availability and execution codes through shared vocabulary', async () => {
  const fixture = await loadFixture();
  const rowDisplay = getActionBlockDisplay({
    reason_code: fixture.row_contract.record._action_state.delete.reason_code,
  });
  const failureDisplay = getActionBlockDisplay({
    textCode: fixture.execution_failure.error.text_code,
  });
  const envelopeDisplay = getActionBlockDisplay(fixture.execution_failure);

  assert.ok(rowDisplay);
  assert.ok(failureDisplay);
  assert.ok(envelopeDisplay);
  assert.equal(rowDisplay.shortMessage, 'Resource in use');
  assert.equal(failureDisplay.shortMessage, 'Resource in use');
  assert.equal(envelopeDisplay.shortMessage, 'Resource in use');
});

test('structured execution failure fixture preserves canonical text_code for shared vocabulary handling', async () => {
  const fixture = await loadFixture();
  const response = mockResponse(fixture.execution_failure);
  const error = await extractStructuredError(response);

  assert.equal(error.textCode, 'RESOURCE_IN_USE');
  assert.equal(error.message, 'Document cannot be deleted while attached to agreements');

  const display = getActionBlockDisplay({ textCode: error.textCode });
  assert.ok(display);
  assert.equal(display.shortMessage, 'Resource in use');
});
