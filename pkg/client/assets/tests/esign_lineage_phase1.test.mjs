import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const {
  normalizeCandidateWarningSummary,
  normalizeDocumentLineageDetail,
  normalizeAgreementLineageDetail,
  normalizeGoogleImportLineageStatus,
  normalizePhase1LineageContractFixtures,
} = await import('../dist/esign/index.js');

async function loadFixture() {
  const fixtureURL = new URL('./fixtures/esign_lineage_phase1/contract_fixtures.json', import.meta.url);
  return JSON.parse(await readFile(fixtureURL, 'utf8'));
}

test('Phase 1 lineage contracts fixture exposes backend-owned presentation rules', async () => {
  const fixture = normalizePhase1LineageContractFixtures(await loadFixture());

  assert.equal(fixture.schema_version, 1);
  assert.equal(fixture.presentation_rules.frontend_presentation_only, true);
  assert.equal(fixture.presentation_rules.diagnostics_owned_by_backend, true);
  assert.deepEqual(fixture.presentation_rules.warning_precedence, [
    'candidate_warning',
    'fingerprint_failed',
    'newer_source_exists',
    'fingerprint_pending',
    'empty_state',
  ]);
  assert.equal(fixture.presentation_rules.candidate_review_visibility, 'admin_debug_only');
});

test('Phase 1 lineage contracts normalize document provenance detail without client inference', async () => {
  const raw = await loadFixture();
  const detail = normalizeDocumentLineageDetail(raw.states.document_native);

  assert.equal(detail.document_id, 'doc_001');
  assert.equal(detail.source_document?.id, 'src_doc_001');
  assert.equal(detail.source_revision?.id, 'src_rev_001');
  assert.equal(detail.source_artifact?.artifact_kind, 'signable_pdf');
  assert.equal(detail.google_source?.external_file_id, 'google-file-123');
  assert.equal(detail.fingerprint_status.status, 'ready');
  assert.equal(detail.candidate_warning_summary[0].review_action_visible, 'admin_debug_only');
});

test('Phase 1 lineage contracts normalize explicit empty-state payloads for upload-only records', async () => {
  const raw = await loadFixture();
  const documentDetail = normalizeDocumentLineageDetail(raw.states.document_empty);
  const agreementDetail = normalizeAgreementLineageDetail(raw.states.agreement_empty);

  assert.equal(documentDetail.source_document, null);
  assert.equal(documentDetail.empty_state.kind, 'no_source');
  assert.equal(documentDetail.fingerprint_status.status, 'not_applicable');
  assert.equal(documentDetail.fingerprint_status.evidence_available, false);

  assert.equal(agreementDetail.source_revision, null);
  assert.equal(agreementDetail.empty_state.kind, 'no_source');
  assert.equal(agreementDetail.newer_source_exists, false);
});

test('Phase 1 lineage contracts normalize import status payloads and candidate summaries', async () => {
  const raw = await loadFixture();
  const running = normalizeGoogleImportLineageStatus(raw.states.import_running);
  const linked = normalizeGoogleImportLineageStatus(raw.states.import_linked);
  const candidate = normalizeCandidateWarningSummary(raw.states.import_linked.candidate_status[0]);

  assert.equal(running.lineage_status, 'running');
  assert.equal(running.fingerprint_status.status, 'pending');

  assert.equal(linked.lineage_status, 'linked');
  assert.equal(linked.source_document?.id, 'src_doc_001');
  assert.equal(linked.document_detail_url, '/admin/content/documents/doc_001');
  assert.equal(candidate.confidence_band, 'medium');
  assert.equal(candidate.evidence[0].code, 'normalized_text_match');
});
