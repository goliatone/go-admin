/**
 * Phase 4 Lineage Contract Tests
 *
 * Tests for document/agreement detail payloads with lineage linkage after import,
 * and seeded Google import QA scenarios.
 * @see DOC_LINEAGE_V1_TSK.md Phase 4 Tasks 4.9-4.10
 */

import test from 'node:test';
import assert from 'node:assert/strict';

const {
  // Phase 4 Task 4.9 - Document/Agreement detail payload fixtures
  documentDetailPayloadFixtures,
  agreementDetailPayloadFixtures,
  getDocumentDetailPayloadFixture,
  getAgreementDetailPayloadFixture,
  validateDocumentDetailPayloadWithLineage,
  validateAgreementDetailPayloadWithLineage,
  hasDocumentLineageLinkage,
  hasAgreementPinnedProvenance,
  getDetailPayloadFixtureStates,
  // Phase 4 Task 4.10 - Seeded Google import QA fixtures
  seededGoogleImportScenarios,
  getSeededGoogleImportScenario,
  getSeededScenarioIds,
  validateSeededScenarioLineage,
} = await import('../dist/esign/index.js');

// ============================================================================
// Task 4.9 - Document Detail Payload Fixtures Tests
// Proves document detail payloads can include lineage linkage after import
// ============================================================================

test('documentDetailPayloadFixtures contains upload_only, google_import, and google_reimport', () => {
  const states = Object.keys(documentDetailPayloadFixtures);

  assert.equal(states.length, 3);
  assert.ok(states.includes('upload_only'));
  assert.ok(states.includes('google_import'));
  assert.ok(states.includes('google_reimport'));
});

test('upload_only document has no lineage linkage', () => {
  const fixture = documentDetailPayloadFixtures.upload_only;

  assert.equal(fixture.source_type, 'upload');
  assert.equal(fixture.source_document_id, null);
  assert.equal(fixture.source_revision_id, null);
  assert.equal(fixture.source_artifact_id, null);
  assert.equal(fixture.source_google_file_id, null);
  assert.equal(hasDocumentLineageLinkage(fixture), false);
});

test('google_import document has lineage linkage', () => {
  const fixture = documentDetailPayloadFixtures.google_import;

  assert.equal(fixture.source_type, 'google_drive');
  assert.ok(fixture.source_document_id);
  assert.ok(fixture.source_revision_id);
  assert.ok(fixture.source_artifact_id);
  assert.ok(fixture.source_google_file_id);
  assert.equal(hasDocumentLineageLinkage(fixture), true);
});

test('google_reimport document has updated lineage linkage', () => {
  const fixture = documentDetailPayloadFixtures.google_reimport;
  const original = documentDetailPayloadFixtures.google_import;

  // Same source_document_id (same Google file)
  assert.equal(fixture.source_document_id, original.source_document_id);
  // Different revision and artifact
  assert.notEqual(fixture.source_revision_id, original.source_revision_id);
  assert.notEqual(fixture.source_artifact_id, original.source_artifact_id);
  assert.equal(hasDocumentLineageLinkage(fixture), true);
});

test('all document detail fixtures pass validation', () => {
  for (const [state, fixture] of Object.entries(documentDetailPayloadFixtures)) {
    const errors = validateDocumentDetailPayloadWithLineage(fixture);
    assert.deepEqual(errors, [], `Document fixture ${state} should pass validation`);
  }
});

test('getDocumentDetailPayloadFixture returns copy, not original', () => {
  const fixture1 = getDocumentDetailPayloadFixture('google_import');
  const fixture2 = getDocumentDetailPayloadFixture('google_import');

  assert.notStrictEqual(fixture1, fixture2);
  assert.deepEqual(fixture1, fixture2);
});

test('getDocumentDetailPayloadFixture throws for unknown state', () => {
  assert.throws(
    () => getDocumentDetailPayloadFixture('unknown_state'),
    /Unknown document detail payload fixture state/
  );
});

// ============================================================================
// Task 4.9 - Agreement Detail Payload Fixtures Tests
// Proves agreement detail payloads can include lineage linkage after import
// ============================================================================

test('agreementDetailPayloadFixtures contains upload_only, google_import, and google_reimport', () => {
  const states = Object.keys(agreementDetailPayloadFixtures);

  assert.equal(states.length, 3);
  assert.ok(states.includes('upload_only'));
  assert.ok(states.includes('google_import'));
  assert.ok(states.includes('google_reimport'));
});

test('upload_only agreement has no pinned provenance', () => {
  const fixture = agreementDetailPayloadFixtures.upload_only;

  assert.equal(fixture.source_type, 'upload');
  assert.equal(fixture.source_revision_id, null);
  assert.equal(fixture.source_google_file_id, null);
  assert.equal(hasAgreementPinnedProvenance(fixture), false);
});

test('google_import agreement has pinned provenance', () => {
  const fixture = agreementDetailPayloadFixtures.google_import;

  assert.equal(fixture.source_type, 'google_drive');
  assert.ok(fixture.source_revision_id);
  assert.ok(fixture.source_google_file_id);
  assert.equal(hasAgreementPinnedProvenance(fixture), true);
});

test('google_reimport agreement has updated pinned provenance', () => {
  const fixture = agreementDetailPayloadFixtures.google_reimport;
  const original = agreementDetailPayloadFixtures.google_import;

  // Different revision (newer source)
  assert.notEqual(fixture.source_revision_id, original.source_revision_id);
  assert.equal(hasAgreementPinnedProvenance(fixture), true);
});

test('all agreement detail fixtures pass validation', () => {
  for (const [state, fixture] of Object.entries(agreementDetailPayloadFixtures)) {
    const errors = validateAgreementDetailPayloadWithLineage(fixture);
    assert.deepEqual(errors, [], `Agreement fixture ${state} should pass validation`);
  }
});

test('getAgreementDetailPayloadFixture returns copy, not original', () => {
  const fixture1 = getAgreementDetailPayloadFixture('google_import');
  const fixture2 = getAgreementDetailPayloadFixture('google_import');

  assert.notStrictEqual(fixture1, fixture2);
  assert.deepEqual(fixture1, fixture2);
});

test('getAgreementDetailPayloadFixture throws for unknown state', () => {
  assert.throws(
    () => getAgreementDetailPayloadFixture('unknown_state'),
    /Unknown agreement detail payload fixture state/
  );
});

// ============================================================================
// Task 4.9 - Validation Tests for Lineage Fields
// ============================================================================

test('validateDocumentDetailPayloadWithLineage returns errors for null payload', () => {
  const errors = validateDocumentDetailPayloadWithLineage(null);
  assert.ok(errors.includes('payload must be an object'));
});

test('validateDocumentDetailPayloadWithLineage returns errors for missing required fields', () => {
  const errors = validateDocumentDetailPayloadWithLineage({});

  assert.ok(errors.includes('id must be a string'));
  assert.ok(errors.includes('tenant_id must be a string'));
  assert.ok(errors.includes('title must be a string'));
  assert.ok(errors.includes('source_type must be a string'));
  assert.ok(errors.includes('page_count must be a number'));
  assert.ok(errors.includes('size_bytes must be a number'));
});

test('validateDocumentDetailPayloadWithLineage allows null lineage fields', () => {
  const validPayload = {
    id: 'test-doc',
    tenant_id: 'tenant-1',
    org_id: 'org-1',
    title: 'Test Document',
    source_type: 'upload',
    page_count: 1,
    size_bytes: 1024,
    source_document_id: null,
    source_revision_id: null,
    source_artifact_id: null,
    source_google_file_id: null,
    source_google_doc_url: null,
    source_modified_time: null,
    source_exported_at: null,
  };

  const errors = validateDocumentDetailPayloadWithLineage(validPayload);
  assert.deepEqual(errors, []);
});

test('validateAgreementDetailPayloadWithLineage returns errors for null payload', () => {
  const errors = validateAgreementDetailPayloadWithLineage(null);
  assert.ok(errors.includes('payload must be an object'));
});

test('validateAgreementDetailPayloadWithLineage returns errors for missing required fields', () => {
  const errors = validateAgreementDetailPayloadWithLineage({});

  assert.ok(errors.includes('id must be a string'));
  assert.ok(errors.includes('tenant_id must be a string'));
  assert.ok(errors.includes('document_id must be a string'));
  assert.ok(errors.includes('status must be a string'));
  assert.ok(errors.includes('title must be a string'));
  assert.ok(errors.includes('version must be a number'));
});

test('validateAgreementDetailPayloadWithLineage allows null source_revision_id', () => {
  const validPayload = {
    id: 'test-agr',
    tenant_id: 'tenant-1',
    org_id: 'org-1',
    document_id: 'doc-1',
    status: 'draft',
    title: 'Test Agreement',
    version: 1,
    source_revision_id: null,
    source_google_file_id: null,
    source_google_doc_url: null,
    source_modified_time: null,
    source_exported_at: null,
  };

  const errors = validateAgreementDetailPayloadWithLineage(validPayload);
  assert.deepEqual(errors, []);
});

// ============================================================================
// Task 4.9 - Detail Payload Fixture States Tests
// ============================================================================

test('getDetailPayloadFixtureStates returns all expected states', () => {
  const states = getDetailPayloadFixtureStates();

  assert.deepEqual(states.documents, ['upload_only', 'google_import', 'google_reimport']);
  assert.deepEqual(states.agreements, ['upload_only', 'google_import', 'google_reimport']);
});

// ============================================================================
// Task 4.10 - Seeded Google Import QA Fixtures Tests
// ============================================================================

test('seededGoogleImportScenarios contains first_import scenario', () => {
  const scenarioIds = Object.keys(seededGoogleImportScenarios);

  assert.ok(scenarioIds.includes('first_import'));
});

test('first_import scenario has complete lineage linkage', () => {
  const scenario = seededGoogleImportScenarios.first_import;

  // Check document lineage
  assert.ok(scenario.document.source_document_id);
  assert.ok(scenario.document.source_revision_id);
  assert.ok(scenario.document.source_artifact_id);
  assert.equal(hasDocumentLineageLinkage(scenario.document), true);

  // Check agreement pinned provenance
  assert.ok(scenario.agreement.source_revision_id);
  assert.equal(hasAgreementPinnedProvenance(scenario.agreement), true);

  // Check lineage summary
  assert.equal(scenario.lineage_summary.is_new_source, true);
  assert.equal(scenario.lineage_summary.revision_reused, false);
});

test('first_import scenario has consistent lineage IDs', () => {
  const scenario = seededGoogleImportScenarios.first_import;

  // Document and lineage_summary should match
  assert.equal(
    scenario.document.source_document_id,
    scenario.lineage_summary.source_document_id
  );
  assert.equal(
    scenario.document.source_revision_id,
    scenario.lineage_summary.source_revision_id
  );
  assert.equal(
    scenario.document.source_artifact_id,
    scenario.lineage_summary.source_artifact_id
  );

  // Agreement revision should match document revision
  assert.equal(
    scenario.agreement.source_revision_id,
    scenario.document.source_revision_id
  );

  // Agreement document_id should match document id
  assert.equal(scenario.agreement.document_id, scenario.document.id);
});

test('getSeededGoogleImportScenario returns copy, not original', () => {
  const scenario1 = getSeededGoogleImportScenario('first_import');
  const scenario2 = getSeededGoogleImportScenario('first_import');

  assert.notStrictEqual(scenario1, scenario2);
  assert.notStrictEqual(scenario1.document, scenario2.document);
  assert.notStrictEqual(scenario1.agreement, scenario2.agreement);
  assert.notStrictEqual(scenario1.lineage_summary, scenario2.lineage_summary);
  assert.deepEqual(scenario1, scenario2);
});

test('getSeededGoogleImportScenario throws for unknown scenario', () => {
  assert.throws(
    () => getSeededGoogleImportScenario('unknown_scenario'),
    /Unknown seeded Google import scenario/
  );
});

test('getSeededScenarioIds returns all scenario IDs', () => {
  const ids = getSeededScenarioIds();

  assert.ok(ids.includes('first_import'));
  assert.equal(ids.length, 1); // Currently only first_import
});

test('validateSeededScenarioLineage returns empty array for valid scenario', () => {
  const scenario = seededGoogleImportScenarios.first_import;
  const errors = validateSeededScenarioLineage(scenario);

  assert.deepEqual(errors, []);
});

test('validateSeededScenarioLineage detects missing document lineage', () => {
  const scenario = {
    ...seededGoogleImportScenarios.first_import,
    document: {
      ...seededGoogleImportScenarios.first_import.document,
      source_document_id: null,
    },
  };

  const errors = validateSeededScenarioLineage(scenario);

  assert.ok(errors.includes('seeded document missing lineage linkage'));
});

test('validateSeededScenarioLineage detects missing agreement provenance', () => {
  const scenario = {
    ...seededGoogleImportScenarios.first_import,
    agreement: {
      ...seededGoogleImportScenarios.first_import.agreement,
      source_revision_id: null,
    },
  };

  const errors = validateSeededScenarioLineage(scenario);

  assert.ok(errors.includes('seeded agreement missing pinned source_revision_id'));
});

test('validateSeededScenarioLineage detects lineage ID mismatch', () => {
  const scenario = {
    ...seededGoogleImportScenarios.first_import,
    document: {
      ...seededGoogleImportScenarios.first_import.document,
      source_document_id: 'different-id',
    },
  };

  const errors = validateSeededScenarioLineage(scenario);

  assert.ok(errors.includes('document source_document_id does not match lineage_summary'));
});

test('validateSeededScenarioLineage detects document/agreement link mismatch', () => {
  const scenario = {
    ...seededGoogleImportScenarios.first_import,
    agreement: {
      ...seededGoogleImportScenarios.first_import.agreement,
      document_id: 'wrong-document-id',
    },
  };

  const errors = validateSeededScenarioLineage(scenario);

  assert.ok(errors.includes('agreement document_id does not match document id'));
});

// ============================================================================
// Frontend Consumer Compatibility Tests
// Proves existing frontend consumers can handle payloads with lineage fields
// ============================================================================

test('google_import document payload has all fields expected by detail template', () => {
  const fixture = documentDetailPayloadFixtures.google_import;

  // Fields used by document detail template
  assert.ok(fixture.id);
  assert.ok(fixture.title);
  assert.ok(fixture.source_original_name);
  assert.ok(fixture.source_object_key);
  assert.ok(fixture.source_sha256);
  assert.ok(typeof fixture.page_count === 'number');
  assert.ok(typeof fixture.size_bytes === 'number');
  assert.ok(fixture.created_at);

  // New lineage fields should not break existing consumers
  assert.ok(fixture.source_document_id !== undefined);
  assert.ok(fixture.source_revision_id !== undefined);
  assert.ok(fixture.source_artifact_id !== undefined);
});

test('google_import agreement payload has all fields expected by detail template', () => {
  const fixture = agreementDetailPayloadFixtures.google_import;

  // Fields used by agreement detail/form templates
  assert.ok(fixture.id);
  assert.ok(fixture.document_id);
  assert.ok(fixture.title);
  assert.ok(fixture.status);
  assert.ok(typeof fixture.version === 'number');
  assert.ok(fixture.created_at);

  // New lineage field should not break existing consumers
  assert.ok(fixture.source_revision_id !== undefined);
});

test('upload_only payloads remain backward compatible with null lineage', () => {
  const doc = documentDetailPayloadFixtures.upload_only;
  const agr = agreementDetailPayloadFixtures.upload_only;

  // Document with null lineage should still work
  assert.equal(doc.source_document_id, null);
  assert.equal(doc.source_revision_id, null);
  assert.equal(doc.source_artifact_id, null);
  assert.ok(doc.id);
  assert.ok(doc.title);

  // Agreement with null lineage should still work
  assert.equal(agr.source_revision_id, null);
  assert.ok(agr.id);
  assert.ok(agr.title);
});
