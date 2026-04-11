/**
 * Phase 3 Lineage Contract Tests
 *
 * Tests for backend-aligned import-run adapters and debug-oriented import fixtures.
 * @see DOC_LINEAGE_V1_TSK.md Phase 3 Tasks 3.9-3.10
 */

import test from 'node:test';
import assert from 'node:assert/strict';

const {
  normalizeGoogleImportRunHandle,
  normalizeGoogleImportRunDetail,
  isTerminalGoogleImportStatus,
  resolveGoogleImportRedirectURL,
  importResponseFixtures,
  getImportResponseFixture,
  validateImportResponsePayload,
  getImportFixtureStates,
} = await import('../dist/esign/index.js');

test('normalizeGoogleImportRunHandle normalizes accepted import creation payload', () => {
  const handle = normalizeGoogleImportRunHandle({
    import_run_id: 'run-123',
    status: 'queued',
    status_url: '/admin/api/esign/google-drive/imports/run-123',
  });

  assert.equal(handle.import_run_id, 'run-123');
  assert.equal(handle.status, 'queued');
  assert.equal(handle.status_url, '/admin/api/esign/google-drive/imports/run-123');
});

test('normalizeGoogleImportRunDetail normalizes native import success payload', () => {
  const detail = normalizeGoogleImportRunDetail({
    import_run_id: 'run-1',
    status: 'succeeded',
    lineage_status: 'linked',
    document: { id: 'doc-1', title: 'Imported Doc' },
    agreement: { id: 'agr-1', document_id: 'doc-1' },
    source_document_id: 'src-doc-1',
    source_revision_id: 'src-rev-1',
    source_artifact_id: 'src-art-1',
    source_document: { id: 'src-doc-1', label: 'Source Doc' },
    source_revision: { id: 'src-rev-1', provider_revision_hint: 'v1' },
    source_artifact: { id: 'src-art-1', artifact_kind: 'signable_pdf' },
    fingerprint_status: { status: 'ready', evidence_available: true },
    candidate_status: [],
    document_detail_url: '/admin/esign/documents/doc-1',
    agreement_detail_url: '/admin/esign/agreements/agr-1',
    error: null,
  });

  assert.equal(detail.status, 'succeeded');
  assert.equal(detail.lineage_status, 'linked');
  assert.equal(detail.document?.id, 'doc-1');
  assert.equal(detail.agreement?.id, 'agr-1');
  assert.equal(detail.source_document?.id, 'src-doc-1');
  assert.equal(detail.source_revision_id, 'src-rev-1');
  assert.equal(detail.fingerprint_status.status, 'ready');
});

test('normalizeGoogleImportRunDetail normalizes import failure payload', () => {
  const detail = normalizeGoogleImportRunDetail({
    import_run_id: 'run-fail',
    status: 'failed',
    lineage_status: '',
    source_document: null,
    source_revision: null,
    source_artifact: null,
    fingerprint_status: { status: '', evidence_available: false },
    candidate_status: [],
    document_detail_url: null,
    agreement_detail_url: null,
    error: {
      code: 'IMPORT_FAILED',
      message: 'Export failed',
      details: { retryable: false },
    },
  });

  assert.equal(detail.status, 'failed');
  assert.equal(detail.source_document_id, null);
  assert.equal(detail.document, null);
  assert.equal(detail.error?.code, 'IMPORT_FAILED');
  assert.equal(detail.error?.details?.retryable, false);
});

test('normalizeGoogleImportRunDetail fills missing optional arrays and links safely', () => {
  const detail = normalizeGoogleImportRunDetail({
    import_run_id: 'run-partial',
    status: 'queued',
    lineage_status: 'queued',
  });

  assert.equal(detail.import_run_id, 'run-partial');
  assert.equal(detail.candidate_status.length, 0);
  assert.equal(detail.document_detail_url, null);
  assert.equal(detail.document, null);
  assert.equal(detail.fingerprint_status.status, '');
});

test('isTerminalGoogleImportStatus recognizes succeeded and failed states only', () => {
  assert.equal(isTerminalGoogleImportStatus('queued'), false);
  assert.equal(isTerminalGoogleImportStatus('running'), false);
  assert.equal(isTerminalGoogleImportStatus('succeeded'), true);
  assert.equal(isTerminalGoogleImportStatus('failed'), true);
});

test('resolveGoogleImportRedirectURL prefers backend-authored agreement detail link', () => {
  const url = resolveGoogleImportRedirectURL(
    {
      agreement_detail_url: '/admin/esign/agreements/agr-1',
      document_detail_url: '/admin/esign/documents/doc-1',
      agreement: { id: 'agr-1' },
      document: { id: 'doc-1' },
    },
    {
      agreements: '/admin/esign/agreements',
      documents: '/admin/esign/documents',
      fallback: '/admin/esign/documents',
    }
  );

  assert.equal(url, '/admin/esign/agreements/agr-1');
});

test('resolveGoogleImportRedirectURL falls back to route bases when detail links are absent', () => {
  const agreementURL = resolveGoogleImportRedirectURL(
    {
      agreement_detail_url: undefined,
      document_detail_url: undefined,
      agreement: { id: 'agr-route' },
      document: { id: 'doc-route' },
    },
    {
      agreements: '/admin/esign/agreements',
      documents: '/admin/esign/documents',
      fallback: '/admin/esign/documents',
    }
  );

  const documentURL = resolveGoogleImportRedirectURL(
    {
      agreement_detail_url: undefined,
      document_detail_url: undefined,
      agreement: null,
      document: { id: 'doc-route' },
    },
    {
      agreements: '/admin/esign/agreements',
      documents: '/admin/esign/documents',
      fallback: '/admin/esign/documents',
    }
  );

  assert.equal(agreementURL, '/admin/esign/agreements/agr-route');
  assert.equal(documentURL, '/admin/esign/documents/doc-route');
});

test('importResponseFixtures contains all five expected states', () => {
  const states = Object.keys(importResponseFixtures);

  assert.equal(states.length, 5);
  assert.ok(states.includes('native_import_success'));
  assert.ok(states.includes('duplicate_import'));
  assert.ok(states.includes('unchanged_reimport'));
  assert.ok(states.includes('changed_source_reimport'));
  assert.ok(states.includes('import_failure'));
});

test('native_import_success fixture reflects backend-owned linked import status', () => {
  const fixture = importResponseFixtures.native_import_success;

  assert.equal(fixture.status, 'succeeded');
  assert.equal(fixture.lineage_status, 'linked');
  assert.equal(fixture.source_document_id, fixture.source_document?.id);
  assert.equal(fixture.source_revision_id, fixture.source_revision?.id);
  assert.ok(fixture.document?.id);
  assert.ok(fixture.agreement?.id);
  assert.equal(fixture.error, null);
});

test('duplicate_import fixture reuses existing revision without creating agreement', () => {
  const fixture = importResponseFixtures.duplicate_import;

  assert.equal(fixture.status, 'succeeded');
  assert.equal(fixture.lineage_status, 'linked');
  assert.equal(fixture.source_revision_id, importResponseFixtures.native_import_success.source_revision_id);
  assert.ok(fixture.document?.id);
  assert.equal(fixture.agreement, null);
});

test('unchanged_reimport fixture keeps the original source revision', () => {
  const fixture = importResponseFixtures.unchanged_reimport;

  assert.equal(fixture.lineage_status, 'linked');
  assert.equal(fixture.source_revision_id, importResponseFixtures.native_import_success.source_revision_id);
  assert.ok(fixture.agreement?.id);
});

test('changed_source_reimport fixture advances to a newer source revision', () => {
  const fixture = importResponseFixtures.changed_source_reimport;

  assert.equal(fixture.lineage_status, 'linked');
  assert.notEqual(fixture.source_revision_id, importResponseFixtures.native_import_success.source_revision_id);
  assert.ok(fixture.source_revision_id?.includes('v2'));
});

test('import_failure fixture preserves failure error and null lineage links', () => {
  const fixture = importResponseFixtures.import_failure;

  assert.equal(fixture.status, 'failed');
  assert.equal(fixture.document, null);
  assert.equal(fixture.agreement, null);
  assert.equal(fixture.source_document_id, null);
  assert.equal(fixture.error?.code, 'IMPORT_FAILED');
});

test('getImportResponseFixture returns a copy, not the original', () => {
  const fixture1 = getImportResponseFixture('native_import_success');
  const fixture2 = getImportResponseFixture('native_import_success');

  fixture1.document.id = 'mutated';
  fixture1.fingerprint_status.status = 'changed';

  assert.notEqual(fixture1.document.id, fixture2.document.id);
  assert.notEqual(fixture1.fingerprint_status.status, fixture2.fingerprint_status.status);
});

test('getImportResponseFixture throws for unknown state', () => {
  assert.throws(
    () => getImportResponseFixture('unknown_state'),
    /Unknown import response fixture state/
  );
});

test('getImportFixtureStates returns all five states', () => {
  const states = getImportFixtureStates();

  assert.deepEqual(states, [
    'native_import_success',
    'duplicate_import',
    'unchanged_reimport',
    'changed_source_reimport',
    'import_failure',
  ]);
});

test('validateImportResponsePayload accepts valid backend-shaped fixtures', () => {
  const errors = validateImportResponsePayload(importResponseFixtures.native_import_success);
  assert.deepEqual(errors, []);
});

test('validateImportResponsePayload reports missing required backend fields', () => {
  const errors = validateImportResponsePayload({});

  assert.ok(errors.includes('import_run_id must be a string'));
  assert.ok(errors.includes('status must be a string'));
  assert.ok(errors.includes('lineage_status must be a string'));
  assert.ok(errors.includes('fingerprint_status must be an object'));
  assert.ok(errors.includes('candidate_status must be an array'));
});

test('validateImportResponsePayload rejects invalid backend field types', () => {
  const errors = validateImportResponsePayload({
    import_run_id: 'run-1',
    status: 'succeeded',
    status_url: 42,
    lineage_status: 'linked',
    fingerprint_status: {},
    candidate_status: [],
    document: 'not-an-object',
  });

  assert.ok(errors.includes('status_url must be a string or null'));
  assert.ok(errors.includes('document must be an object or null'));
});

test('all import fixtures pass validation', () => {
  for (const [state, fixture] of Object.entries(importResponseFixtures)) {
    const errors = validateImportResponsePayload(fixture);
    assert.deepEqual(errors, [], `Fixture ${state} should pass validation`);
  }
});

test('all import fixtures normalize without loss of identity fields', () => {
  for (const [state, fixture] of Object.entries(importResponseFixtures)) {
    const normalized = normalizeGoogleImportRunDetail(fixture);

    assert.equal(normalized.import_run_id, fixture.import_run_id, `${state} import_run_id mismatch`);
    assert.equal(normalized.status, fixture.status, `${state} status mismatch`);
    assert.equal(normalized.lineage_status, fixture.lineage_status, `${state} lineage_status mismatch`);
    assert.equal(normalized.source_revision_id, fixture.source_revision_id, `${state} source_revision_id mismatch`);
  }
});
