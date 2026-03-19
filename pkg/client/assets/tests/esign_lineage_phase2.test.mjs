import test from 'node:test';
import assert from 'node:assert/strict';

const {
  documentLineageFixtures,
  agreementLineageFixtures,
  getDocumentLineageFixture,
  getAgreementLineageFixture,
  validateDocumentLineagePayload,
  validateAgreementLineagePayload,
  normalizeDocumentLineageDetail,
  normalizeAgreementLineageDetail,
} = await import('../dist/esign/index.js');

test('Phase 2 lineage fixtures: document detail states are exposed through the executed asset suite', () => {
  for (const state of ['empty', 'native', 'repeated_import']) {
    const fixture = documentLineageFixtures[state];
    assert.equal(validateDocumentLineagePayload(fixture).length, 0, `expected valid payload for ${state}`);

    const normalized = normalizeDocumentLineageDetail(fixture);
    assert.equal(normalized.document_id, fixture.document_id);
    assert.equal(normalized.empty_state.kind, fixture.empty_state.kind);
  }

  assert.equal(documentLineageFixtures.empty.source_document, null);
  assert.equal(documentLineageFixtures.empty.empty_state.kind, 'no_source');
  assert.ok(documentLineageFixtures.empty.diagnostics_url?.includes(documentLineageFixtures.empty.document_id));
  assert.equal(
    documentLineageFixtures.native.source_revision.provider_revision_hint,
    documentLineageFixtures.native.google_source.source_version_hint
  );
  assert.equal(documentLineageFixtures.repeated_import.source_revision.provider_revision_hint, 'v2');
});

test('Phase 2 lineage fixtures: agreement detail states normalize without branching on ad hoc payloads', () => {
  for (const state of ['empty', 'native', 'newer_source_exists']) {
    const fixture = agreementLineageFixtures[state];
    assert.equal(validateAgreementLineagePayload(fixture).length, 0, `expected valid payload for ${state}`);

    const normalized = normalizeAgreementLineageDetail(fixture);
    assert.equal(normalized.agreement_id, fixture.agreement_id);
    assert.equal(normalized.newer_source_exists, fixture.newer_source_exists);
  }

  assert.equal(agreementLineageFixtures.empty.source_revision, null);
  assert.equal(agreementLineageFixtures.empty.empty_state.kind, 'no_source');
  assert.ok(agreementLineageFixtures.empty.diagnostics_url?.includes(agreementLineageFixtures.empty.agreement_id));
  assert.equal(agreementLineageFixtures.native.newer_source_exists, false);
  assert.equal(agreementLineageFixtures.newer_source_exists.newer_source_exists, true);
});

test('Phase 2 lineage fixture helpers return detached normalized copies', () => {
  const documentFixture = getDocumentLineageFixture('native');
  documentFixture.source_document.label = 'Mutated Title';
  assert.notEqual(
    documentFixture.source_document.label,
    documentLineageFixtures.native.source_document.label,
    'document fixture helper should not leak nested mutations to the canonical fixture'
  );

  const agreementFixture = getAgreementLineageFixture('native');
  agreementFixture.source_revision.provider_revision_hint = 'mutated';
  assert.notEqual(
    agreementFixture.source_revision.provider_revision_hint,
    agreementLineageFixtures.native.source_revision.provider_revision_hint,
    'agreement fixture helper should not leak nested mutations to the canonical fixture'
  );
});
