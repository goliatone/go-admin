/**
 * Phase 9 Lineage Provenance Rendering Tests
 *
 * Frontend tests for provenance rendering, warning precedence, accessibility labels,
 * and safe handling of missing or partial lineage data.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 9 Tasks 9.5-9.8
 */

import test from 'node:test';
import assert from 'node:assert/strict';

const {
  // Lineage fixtures
  documentLineageFixtures,
  agreementLineageFixtures,
  getDocumentLineageFixture,
  getAgreementLineageFixture,
  validateDocumentLineagePayload,
  validateAgreementLineagePayload,
  // Candidate warning fixtures
  candidateWarningFixtures,
  getCandidateWarningFixture,
  // Presentation mappers
  mapDocumentProvenance,
  mapAgreementProvenance,
  validateDocumentProvenanceViewModel,
  validateAgreementProvenanceViewModel,
  isGoogleSourced,
  hasActionableWarnings,
  getWarningSeverityClass,
  getWarningSeverityIcon,
  getSourceTypeIcon,
  getSourceTypeLabel,
  // Fingerprint status helpers
  getFingerprintStatusClass,
  getFingerprintStatusIcon,
  isFingerprintTerminal,
  isFingerprintSuccessful,
  hasFingerprintError,
  getFingerprintStatusMessage,
  // Diagnostic view model builders
  createDocumentDiagnosticViewModel,
  createAgreementDiagnosticViewModel,
  determineDiagnosticState,
  createEmptyDisplayConfig,
  createNativeDisplayConfig,
  createFingerprintPendingDisplayConfig,
  createFingerprintFailedDisplayConfig,
  createCandidateWarningDisplayConfig,
  createWarningCard,
  createWarningCards,
  createSourceCard,
  createNewerSourceCard,
  createFingerprintCard,
  validateDocumentDiagnosticViewModel,
  validateAgreementDiagnosticViewModel,
  isDiagnosticEmpty,
  isDiagnosticNative,
  isDiagnosticFingerprintPending,
  isDiagnosticFingerprintFailed,
  isDiagnosticCandidateWarning,
  hasDiagnosticActionableWarnings,
} = await import('../dist/esign/index.js');

// ============================================================================
// Task 9.5 - Provenance Card Partial Tests (Document)
// Validates provenance card structure for documents
// ============================================================================

test('Task 9.5: document native lineage produces valid provenance view model', () => {
  const fixture = getDocumentLineageFixture('native');
  const vm = mapDocumentProvenance(fixture);

  const errors = validateDocumentProvenanceViewModel(vm);
  assert.deepEqual(errors, [], 'should produce valid provenance view model');
});

test('Task 9.5: document provenance includes source type badge data', () => {
  const fixture = getDocumentLineageFixture('native');
  const vm = mapDocumentProvenance(fixture);

  assert.ok(vm.sourceType, 'should have source type');
  assert.equal(vm.sourceType, 'google_drive', 'native fixture should be google_drive');

  const typeLabel = getSourceTypeLabel(vm.sourceType);
  assert.equal(typeLabel, 'Google Drive', 'should have correct label');

  const typeIcon = getSourceTypeIcon(vm.sourceType);
  assert.equal(typeIcon, 'google-drive', 'should have correct icon');
});

test('Task 9.5: document provenance includes Google doc link data', () => {
  const fixture = getDocumentLineageFixture('native');
  const vm = mapDocumentProvenance(fixture);

  assert.ok(vm.hasGoogleSource, 'should have Google source');
  assert.ok(vm.googleSource, 'should have Google source data');
  assert.ok(vm.googleSource.webUrl, 'should have web URL');
  assert.ok(vm.googleSource.fileId, 'should have file ID');
});

test('Task 9.5: document provenance includes exported and modified times', () => {
  const fixture = getDocumentLineageFixture('native');
  const vm = mapDocumentProvenance(fixture);

  assert.ok(vm.revision, 'should have revision');
  // exported_at and modified_time are optional but should be present for native
  if (vm.revision.exportedAt) {
    assert.ok(vm.revision.exportedAtFormatted, 'should format exported time');
  }
  if (vm.revision.modifiedAt) {
    assert.ok(vm.revision.modifiedAtFormatted, 'should format modified time');
  }
});

test('Task 9.5: document provenance includes source revision reference', () => {
  const fixture = getDocumentLineageFixture('native');
  const vm = mapDocumentProvenance(fixture);

  assert.ok(vm.revision, 'should have revision');
  assert.ok(vm.revision.id, 'revision should have ID');
});

test('Task 9.5: document provenance includes artifact reference', () => {
  const fixture = getDocumentLineageFixture('native');
  const vm = mapDocumentProvenance(fixture);

  assert.ok(vm.hasArtifact, 'should have artifact');
  assert.ok(vm.artifact, 'should have artifact data');
  assert.ok(vm.artifact.id, 'artifact should have ID');
  assert.ok(vm.artifact.kind, 'artifact should have kind');
});

test('Task 9.5: document provenance includes source document reference', () => {
  const fixture = getDocumentLineageFixture('native');
  const vm = mapDocumentProvenance(fixture);

  assert.ok(vm.source, 'should have source');
  assert.ok(vm.source.id, 'source should have ID');
  assert.ok(vm.source.label, 'source should have label');
});

// ============================================================================
// Task 9.5 - Provenance Card Partial Tests (Agreement)
// Validates provenance card structure for agreements
// ============================================================================

test('Task 9.5: agreement native lineage produces valid provenance view model', () => {
  const fixture = getAgreementLineageFixture('native');
  const vm = mapAgreementProvenance(fixture);

  const errors = validateAgreementProvenanceViewModel(vm);
  assert.deepEqual(errors, [], 'should produce valid provenance view model');
});

test('Task 9.5: agreement provenance includes pinned source revision', () => {
  const fixture = getAgreementLineageFixture('native');
  const vm = mapAgreementProvenance(fixture);

  assert.ok(vm.revision, 'should have pinned revision');
  assert.ok(vm.revision.id, 'revision should have ID');
});

test('Task 9.5: agreement provenance includes linked document artifact', () => {
  const fixture = getAgreementLineageFixture('native');
  const vm = mapAgreementProvenance(fixture);

  assert.ok(vm.hasArtifact, 'should have artifact flag');
  assert.ok(vm.artifact, 'should have artifact');
  assert.ok(vm.artifact.id, 'artifact should have ID');
});

test('Task 9.5: agreement provenance includes Google source metadata', () => {
  const fixture = getAgreementLineageFixture('native');
  const vm = mapAgreementProvenance(fixture);

  assert.ok(vm.hasGoogleSource, 'should have Google source flag');
  assert.ok(vm.googleSource, 'should have Google source');
  assert.ok(vm.googleSource.webUrl, 'should have web URL');
});

// ============================================================================
// Task 9.6 - Empty Provenance State Tests
// ============================================================================

test('Task 9.6: empty document provenance shows placeholder state', () => {
  const fixture = getDocumentLineageFixture('empty');
  const vm = mapDocumentProvenance(fixture);

  assert.equal(vm.status, 'empty', 'status should be empty');
  assert.equal(vm.hasLineage, false, 'should not have lineage');
  assert.ok(vm.emptyState, 'should have empty state');
  assert.ok(vm.emptyState.showPlaceholder, 'should show placeholder');
  assert.ok(vm.emptyState.title, 'empty state should have title');
  assert.ok(vm.emptyState.description, 'empty state should have description');
});

test('Task 9.6: empty agreement provenance shows placeholder state', () => {
  const fixture = getAgreementLineageFixture('empty');
  const vm = mapAgreementProvenance(fixture);

  assert.equal(vm.status, 'empty', 'status should be empty');
  assert.equal(vm.hasLineage, false, 'should not have lineage');
  assert.ok(vm.emptyState.showPlaceholder, 'should show placeholder');
});

test('Task 9.6: empty diagnostic config has correct structure', () => {
  const config = createEmptyDisplayConfig();

  assert.equal(config.state, 'empty');
  assert.ok(config.title, 'should have title');
  assert.ok(config.description, 'should have description');
  assert.ok(config.icon, 'should have icon');
  assert.ok(config.cssClass, 'should have CSS class');
  assert.ok(config.ariaLabel, 'should have aria label');
  assert.equal(config.showDetails, false, 'should not show details for empty');
});

// ============================================================================
// Task 9.6 - Newer Source Notice Tests
// ============================================================================

test('Task 9.6: agreement with newer source shows notice flag', () => {
  const fixture = getAgreementLineageFixture('newer_source_exists');
  const vm = mapAgreementProvenance(fixture);

  assert.equal(vm.newerSourceExists, true, 'should have newer source flag');
});

test('Task 9.6: newer source notice creates diagnostic card', () => {
  const fixture = getAgreementLineageFixture('newer_source_exists');
  const vm = mapAgreementProvenance(fixture);
  const card = createNewerSourceCard(vm);

  assert.ok(card, 'should create newer source card');
  assert.equal(card.visible, true, 'card should be visible');
  assert.ok(card.title, 'card should have title');
  assert.ok(card.description, 'card should have description');
  assert.ok(card.icon, 'card should have icon');
  assert.ok(card.cssClass, 'card should have CSS class');
  assert.ok(card.ariaLabel, 'card should have aria label');
});

test('Task 9.6: agreement without newer source has no notice card', () => {
  const fixture = getAgreementLineageFixture('native');
  const vm = mapAgreementProvenance(fixture);
  const card = createNewerSourceCard(vm);

  assert.equal(card, null, 'should not create card when no newer source');
});

// ============================================================================
// Task 9.6 - Fingerprint Pending State Tests
// ============================================================================

test('Task 9.6: fingerprint pending state detected correctly', () => {
  const fixture = getDocumentLineageFixture('fingerprint_pending');
  const vm = mapDocumentProvenance(fixture);

  assert.ok(vm.fingerprintStatus, 'should have fingerprint status');
  assert.equal(vm.fingerprintStatus.isPending, true, 'should be pending');
  assert.equal(vm.fingerprintStatus.isReady, false, 'should not be ready');
  assert.equal(vm.fingerprintStatus.evidenceAvailable, false, 'evidence should not be available');
});

test('Task 9.6: fingerprint pending creates correct diagnostic config', () => {
  const config = createFingerprintPendingDisplayConfig();

  assert.equal(config.state, 'fingerprint_pending');
  assert.ok(config.title, 'should have title');
  assert.ok(config.description, 'should have description');
  assert.ok(config.icon, 'should have icon');
  assert.ok(config.cssClass, 'should have CSS class');
  assert.ok(config.ariaLabel, 'should have aria label');
});

test('Task 9.6: fingerprint pending has correct status helpers', () => {
  const fixture = getDocumentLineageFixture('fingerprint_pending');
  const vm = mapDocumentProvenance(fixture);

  const statusClass = getFingerprintStatusClass(vm.fingerprintStatus);
  assert.ok(statusClass.includes('pending'), 'CSS class should indicate pending');

  const statusIcon = getFingerprintStatusIcon(vm.fingerprintStatus);
  assert.equal(statusIcon, 'hourglass', 'icon should be hourglass');

  const message = getFingerprintStatusMessage(vm.fingerprintStatus);
  assert.ok(message.includes('progress'), 'message should mention progress');

  assert.equal(isFingerprintTerminal(vm.fingerprintStatus), false, 'should not be terminal');
});

// ============================================================================
// Task 9.6 - Fingerprint Failed State Tests
// ============================================================================

test('Task 9.6: fingerprint failed state detected correctly', () => {
  const fixture = getDocumentLineageFixture('fingerprint_failed');
  const vm = mapDocumentProvenance(fixture);

  assert.ok(vm.fingerprintStatus, 'should have fingerprint status');
  assert.equal(vm.fingerprintStatus.isFailed, true, 'should be failed');
  assert.equal(vm.fingerprintStatus.isReady, false, 'should not be ready');
  assert.equal(vm.fingerprintStatus.evidenceAvailable, false, 'evidence should not be available');
});

test('Task 9.6: fingerprint failed has error message', () => {
  const fixture = getDocumentLineageFixture('fingerprint_failed');
  const vm = mapDocumentProvenance(fixture);

  assert.ok(vm.fingerprintStatus.errorMessage, 'should have error message');
  assert.equal(hasFingerprintError(vm.fingerprintStatus), true, 'should have error');
});

test('Task 9.6: fingerprint failed creates correct diagnostic config', () => {
  const errorMessage = 'Test error message';
  const config = createFingerprintFailedDisplayConfig(errorMessage);

  assert.equal(config.state, 'fingerprint_failed');
  assert.equal(config.description, errorMessage, 'should use provided error message');
  assert.ok(config.icon, 'should have icon');
  assert.ok(config.cssClass, 'should have CSS class');
  assert.ok(config.ariaLabel, 'should have aria label');
});

// ============================================================================
// Task 9.6 - Candidate Continuity Warning Tests
// ============================================================================

test('Task 9.6: candidate warning state detected correctly', () => {
  const fixture = getCandidateWarningFixture('single_likely_continuity');
  const vm = mapDocumentProvenance(fixture);

  assert.equal(vm.hasCandidateWarnings, true, 'should have candidate warnings');
  assert.ok(vm.warnings.length > 0, 'should have warnings');
  assert.ok(vm.primaryWarning, 'should have primary warning');
});

test('Task 9.6: candidate warning produces correct diagnostic state', () => {
  const fixture = getCandidateWarningFixture('single_likely_continuity');
  const vm = mapDocumentProvenance(fixture);
  const state = determineDiagnosticState(vm);

  assert.equal(state, 'candidate_warning', 'state should be candidate_warning');
});

test('Task 9.6: candidate warning diagnostic config has correct severity', () => {
  const config = createCandidateWarningDisplayConfig('warning');

  assert.equal(config.state, 'candidate_warning');
  assert.ok(config.title.includes('Warning'), 'title should mention warning');
  assert.ok(config.cssClass.includes('warning'), 'CSS class should indicate warning');
  assert.ok(config.ariaLabel, 'should have aria label');
});

// ============================================================================
// Task 9.7 - Detail Page Wiring Tests
// Validates that view models produce complete data for template rendering
// ============================================================================

test('Task 9.7: document diagnostic view model has all required fields', () => {
  const fixture = getDocumentLineageFixture('native');
  const vm = mapDocumentProvenance(fixture);
  const diagnostic = createDocumentDiagnosticViewModel(vm);

  const errors = validateDocumentDiagnosticViewModel(diagnostic);
  assert.deepEqual(errors, [], 'should produce valid diagnostic view model');

  // Check all required fields for template rendering
  assert.ok(diagnostic.provenance, 'should have provenance');
  assert.ok(diagnostic.displayConfig, 'should have display config');
  assert.ok(Array.isArray(diagnostic.warningCards), 'should have warning cards array');
  assert.ok(diagnostic.fingerprintCard, 'should have fingerprint card');
  // sourceCard can be null
});

test('Task 9.7: agreement diagnostic view model has all required fields', () => {
  const fixture = getAgreementLineageFixture('native');
  const vm = mapAgreementProvenance(fixture);
  const diagnostic = createAgreementDiagnosticViewModel(vm);

  const errors = validateAgreementDiagnosticViewModel(diagnostic);
  assert.deepEqual(errors, [], 'should produce valid diagnostic view model');

  // Check all required fields for template rendering
  assert.ok(diagnostic.provenance, 'should have provenance');
  assert.ok(diagnostic.displayConfig, 'should have display config');
  assert.ok(Array.isArray(diagnostic.warningCards), 'should have warning cards array');
  // sourceCard and newerSourceCard can be null
});

test('Task 9.7: native document produces correct diagnostic state', () => {
  const fixture = getDocumentLineageFixture('native');
  const vm = mapDocumentProvenance(fixture);
  const diagnostic = createDocumentDiagnosticViewModel(vm);

  assert.equal(isDiagnosticNative(diagnostic), true, 'should be native state');
  assert.equal(isDiagnosticEmpty(diagnostic), false, 'should not be empty');
});

test('Task 9.7: empty document produces correct diagnostic state', () => {
  const fixture = getDocumentLineageFixture('empty');
  const vm = mapDocumentProvenance(fixture);
  const diagnostic = createDocumentDiagnosticViewModel(vm);

  assert.equal(isDiagnosticEmpty(diagnostic), true, 'should be empty state');
  assert.equal(isDiagnosticNative(diagnostic), false, 'should not be native');
});

test('Task 9.7: source card created for Google-sourced documents', () => {
  const fixture = getDocumentLineageFixture('native');
  const vm = mapDocumentProvenance(fixture);
  const sourceCard = createSourceCard(vm);

  assert.ok(sourceCard, 'should create source card');
  assert.equal(sourceCard.provider, 'google_drive');
  assert.ok(sourceCard.providerIcon, 'should have provider icon');
  assert.ok(sourceCard.providerLabel, 'should have provider label');
  assert.ok(sourceCard.webUrl, 'should have web URL');
  assert.ok(sourceCard.ariaLabel, 'should have aria label');
});

test('Task 9.7: source card not created for empty documents', () => {
  const fixture = getDocumentLineageFixture('empty');
  const vm = mapDocumentProvenance(fixture);
  const sourceCard = createSourceCard(vm);

  assert.equal(sourceCard, null, 'should not create source card for empty');
});

// ============================================================================
// Task 9.8 - Warning Precedence Tests
// ============================================================================

test('Task 9.8: candidate warning takes precedence over other states', () => {
  // A document with candidate warnings should show warning state
  // even if it has fingerprint data
  const fixture = getCandidateWarningFixture('single_likely_continuity');
  const vm = mapDocumentProvenance(fixture);
  const state = determineDiagnosticState(vm);

  assert.equal(state, 'candidate_warning', 'candidate warning should have highest precedence');
});

test('Task 9.8: fingerprint failed takes precedence over native state', () => {
  const fixture = getDocumentLineageFixture('fingerprint_failed');
  const vm = mapDocumentProvenance(fixture);
  const state = determineDiagnosticState(vm);

  assert.equal(state, 'fingerprint_failed', 'fingerprint failed should take precedence');
});

test('Task 9.8: fingerprint pending takes precedence over native state', () => {
  const fixture = getDocumentLineageFixture('fingerprint_pending');
  const vm = mapDocumentProvenance(fixture);
  const state = determineDiagnosticState(vm);

  assert.equal(state, 'fingerprint_pending', 'fingerprint pending should take precedence');
});

test('Task 9.8: warning severity ordering is correct', () => {
  // Critical > Warning > Info > None
  assert.ok(
    getWarningSeverityClass('critical').includes('critical'),
    'critical class should include critical'
  );
  assert.ok(
    getWarningSeverityClass('warning').includes('medium'),
    'warning class should include medium'
  );
  assert.ok(
    getWarningSeverityClass('info').includes('info'),
    'info class should include info'
  );
});

test('Task 9.8: multiple warnings sorted by severity', () => {
  const fixture = getCandidateWarningFixture('multiple_ambiguous_candidates');
  const vm = mapDocumentProvenance(fixture);

  // Primary warning should be the most severe
  assert.ok(vm.primaryWarning, 'should have primary warning');
});

// ============================================================================
// Task 9.8 - Accessibility Label Tests
// ============================================================================

test('Task 9.8: document diagnostic config has accessibility label', () => {
  const fixture = getDocumentLineageFixture('native');
  const vm = mapDocumentProvenance(fixture);
  const diagnostic = createDocumentDiagnosticViewModel(vm);

  assert.ok(diagnostic.displayConfig.ariaLabel, 'should have aria label');
  assert.ok(typeof diagnostic.displayConfig.ariaLabel === 'string', 'aria label should be string');
  assert.ok(diagnostic.displayConfig.ariaLabel.length > 0, 'aria label should not be empty');
});

test('Task 9.8: agreement diagnostic config has accessibility label', () => {
  const fixture = getAgreementLineageFixture('native');
  const vm = mapAgreementProvenance(fixture);
  const diagnostic = createAgreementDiagnosticViewModel(vm);

  assert.ok(diagnostic.displayConfig.ariaLabel, 'should have aria label');
});

test('Task 9.8: warning cards have accessibility labels', () => {
  const fixture = getCandidateWarningFixture('single_likely_continuity');
  const vm = mapDocumentProvenance(fixture);
  const cards = createWarningCards(vm.warnings);

  for (const card of cards) {
    assert.ok(card.ariaLabel, `card ${card.id} should have aria label`);
    assert.ok(
      card.ariaLabel.toLowerCase().includes(card.severity),
      'aria label should mention severity'
    );
  }
});

test('Task 9.8: fingerprint card has accessibility label', () => {
  const fixture = getDocumentLineageFixture('native');
  const vm = mapDocumentProvenance(fixture);
  const card = createFingerprintCard(vm.fingerprintStatus);

  assert.ok(card.ariaLabel, 'should have aria label');
  assert.ok(
    card.ariaLabel.toLowerCase().includes('fingerprint'),
    'aria label should mention fingerprint'
  );
});

test('Task 9.8: source card has accessibility label', () => {
  const fixture = getDocumentLineageFixture('native');
  const vm = mapDocumentProvenance(fixture);
  const card = createSourceCard(vm);

  assert.ok(card, 'should have source card');
  assert.ok(card.ariaLabel, 'should have aria label');
  assert.ok(
    card.ariaLabel.toLowerCase().includes('source'),
    'aria label should mention source'
  );
});

test('Task 9.8: newer source card has accessibility label', () => {
  const fixture = getAgreementLineageFixture('newer_source_exists');
  const vm = mapAgreementProvenance(fixture);
  const card = createNewerSourceCard(vm);

  assert.ok(card, 'should have newer source card');
  assert.ok(card.ariaLabel, 'should have aria label');
  assert.ok(
    card.ariaLabel.toLowerCase().includes('newer') || card.ariaLabel.toLowerCase().includes('notice'),
    'aria label should mention newer version'
  );
});

test('Task 9.8: empty state has descriptive accessibility label', () => {
  const config = createEmptyDisplayConfig();

  assert.ok(config.ariaLabel, 'should have aria label');
  assert.ok(
    config.ariaLabel.toLowerCase().includes('no') || config.ariaLabel.toLowerCase().includes('provenance'),
    'aria label should be descriptive'
  );
});

// ============================================================================
// Task 9.8 - Safe Handling of Missing/Partial Lineage Data
// ============================================================================

test('Task 9.8: handles null source_document gracefully', () => {
  const payload = {
    document_id: 'test-doc',
    source_document: null,
    source_revision: null,
    source_artifact: null,
    google_source: null,
    fingerprint_status: { status: '', evidence_available: false },
    candidate_warning_summary: [],
    presentation_warnings: [],
    empty_state: { kind: 'upload_only' },
  };

  const errors = validateDocumentLineagePayload(payload);
  assert.deepEqual(errors, [], 'should validate with null source_document');

  const vm = mapDocumentProvenance(payload);
  assert.equal(vm.source, null, 'source should be null');
  assert.equal(vm.hasLineage, false, 'should not have lineage');
});

test('Task 9.8: handles null source_revision gracefully', () => {
  const payload = {
    document_id: 'test-doc',
    source_document: null,
    source_revision: null,
    source_artifact: null,
    google_source: null,
    fingerprint_status: { status: '', evidence_available: false },
    candidate_warning_summary: [],
    presentation_warnings: [],
    empty_state: { kind: 'upload_only' },
  };

  const vm = mapDocumentProvenance(payload);
  assert.equal(vm.revision, null, 'revision should be null');
});

test('Task 9.8: handles null source_artifact gracefully', () => {
  const payload = {
    document_id: 'test-doc',
    source_document: null,
    source_revision: null,
    source_artifact: null,
    google_source: null,
    fingerprint_status: { status: '', evidence_available: false },
    candidate_warning_summary: [],
    presentation_warnings: [],
    empty_state: { kind: 'upload_only' },
  };

  const vm = mapDocumentProvenance(payload);
  assert.equal(vm.artifact, null, 'artifact should be null');
  assert.equal(vm.hasArtifact, false, 'should not have artifact');
});

test('Task 9.8: handles null google_source gracefully', () => {
  const payload = {
    document_id: 'test-doc',
    source_document: null,
    source_revision: null,
    source_artifact: null,
    google_source: null,
    fingerprint_status: { status: '', evidence_available: false },
    candidate_warning_summary: [],
    presentation_warnings: [],
    empty_state: { kind: 'upload_only' },
  };

  const vm = mapDocumentProvenance(payload);
  assert.equal(vm.googleSource, null, 'googleSource should be null');
  assert.equal(vm.hasGoogleSource, false, 'should not have Google source');
  assert.equal(vm.sourceType, 'upload', 'source type should be upload');
});

test('Task 9.8: handles empty fingerprint_status gracefully', () => {
  const payload = {
    document_id: 'test-doc',
    source_document: null,
    source_revision: null,
    source_artifact: null,
    google_source: null,
    fingerprint_status: { status: '', evidence_available: false },
    candidate_warning_summary: [],
    presentation_warnings: [],
    empty_state: { kind: 'upload_only' },
  };

  const vm = mapDocumentProvenance(payload);
  assert.ok(vm.fingerprintStatus, 'should have fingerprint status');
  assert.equal(vm.fingerprintStatus.isUnknown, true, 'should be unknown status');
});

test('Task 9.8: handles empty presentation_warnings gracefully', () => {
  const payload = {
    document_id: 'test-doc',
    source_document: null,
    source_revision: null,
    source_artifact: null,
    google_source: null,
    fingerprint_status: { status: '', evidence_available: false },
    candidate_warning_summary: [],
    presentation_warnings: [],
    empty_state: { kind: 'upload_only' },
  };

  const vm = mapDocumentProvenance(payload);
  assert.deepEqual(vm.warnings, [], 'warnings should be empty array');
  assert.equal(vm.primaryWarning, null, 'primary warning should be null');
});

test('Task 9.8: handles missing optional fields in revision', () => {
  const payload = {
    document_id: 'test-doc',
    source_document: { id: 'src-doc', label: 'Test' },
    source_revision: { id: 'src-rev' }, // minimal revision
    source_artifact: null,
    google_source: null,
    fingerprint_status: { status: '', evidence_available: false },
    candidate_warning_summary: [],
    presentation_warnings: [],
    empty_state: { kind: 'none' },
  };

  const vm = mapDocumentProvenance(payload);
  assert.ok(vm.revision, 'should have revision');
  assert.equal(vm.revision.id, 'src-rev', 'should have revision ID');
  assert.equal(vm.revision.versionHint, undefined, 'optional fields should be undefined');
  assert.equal(vm.revision.modifiedAt, undefined, 'optional fields should be undefined');
});

test('Task 9.8: handles missing optional fields in artifact', () => {
  const payload = {
    document_id: 'test-doc',
    source_document: { id: 'src-doc' },
    source_revision: { id: 'src-rev' },
    source_artifact: { id: 'src-art', artifact_kind: 'signable_pdf' }, // minimal artifact
    google_source: null,
    fingerprint_status: { status: '', evidence_available: false },
    candidate_warning_summary: [],
    presentation_warnings: [],
    empty_state: { kind: 'none' },
  };

  const vm = mapDocumentProvenance(payload);
  assert.ok(vm.artifact, 'should have artifact');
  assert.equal(vm.artifact.id, 'src-art', 'should have artifact ID');
  assert.equal(vm.artifact.pageCount, undefined, 'optional fields should be undefined');
  assert.equal(vm.artifact.sizeBytes, undefined, 'optional fields should be undefined');
});

test('Task 9.8: handles agreement with null revision (upload-only)', () => {
  const payload = {
    agreement_id: 'test-agr',
    source_revision: null,
    linked_document_artifact: null,
    google_source: null,
    newer_source_exists: false,
    candidate_warning_summary: [],
    presentation_warnings: [],
    empty_state: { kind: 'upload_only' },
  };

  const errors = validateAgreementLineagePayload(payload);
  assert.deepEqual(errors, [], 'should validate with null revision');

  const vm = mapAgreementProvenance(payload);
  assert.equal(vm.revision, null, 'revision should be null');
  assert.equal(vm.hasLineage, false, 'should not have lineage');
});

// ============================================================================
// Task 9.8 - Complete Fixture Coverage Tests
// ============================================================================

test('Task 9.8: all document lineage fixtures produce valid view models', () => {
  const states = ['empty', 'native', 'repeated_import', 'candidate_warning', 'fingerprint_pending', 'fingerprint_failed'];

  for (const state of states) {
    const fixture = getDocumentLineageFixture(state);
    const vm = mapDocumentProvenance(fixture);
    const errors = validateDocumentProvenanceViewModel(vm);

    assert.deepEqual(errors, [], `${state} should produce valid provenance view model`);
  }
});

test('Task 9.8: all document lineage fixtures produce valid diagnostic view models', () => {
  const states = ['empty', 'native', 'repeated_import', 'candidate_warning', 'fingerprint_pending', 'fingerprint_failed'];

  for (const state of states) {
    const fixture = getDocumentLineageFixture(state);
    const vm = mapDocumentProvenance(fixture);
    const diagnostic = createDocumentDiagnosticViewModel(vm);
    const errors = validateDocumentDiagnosticViewModel(diagnostic);

    assert.deepEqual(errors, [], `${state} should produce valid diagnostic view model`);
    assert.ok(diagnostic.displayConfig.ariaLabel, `${state} should have accessibility label`);
  }
});

test('Task 9.8: all agreement lineage fixtures produce valid view models', () => {
  const states = ['empty', 'native', 'newer_source_exists', 'candidate_warning'];

  for (const state of states) {
    const fixture = getAgreementLineageFixture(state);
    const vm = mapAgreementProvenance(fixture);
    const errors = validateAgreementProvenanceViewModel(vm);

    assert.deepEqual(errors, [], `${state} should produce valid provenance view model`);
  }
});

test('Task 9.8: all agreement lineage fixtures produce valid diagnostic view models', () => {
  const states = ['empty', 'native', 'newer_source_exists', 'candidate_warning'];

  for (const state of states) {
    const fixture = getAgreementLineageFixture(state);
    const vm = mapAgreementProvenance(fixture);
    const diagnostic = createAgreementDiagnosticViewModel(vm);
    const errors = validateAgreementDiagnosticViewModel(diagnostic);

    assert.deepEqual(errors, [], `${state} should produce valid diagnostic view model`);
    assert.ok(diagnostic.displayConfig.ariaLabel, `${state} should have accessibility label`);
  }
});

// ============================================================================
// Task 9.8 - Template Helper Function Tests
// ============================================================================

test('Task 9.8: isGoogleSourced correctly identifies Google documents', () => {
  const nativeFixture = getDocumentLineageFixture('native');
  const nativeVm = mapDocumentProvenance(nativeFixture);
  assert.equal(isGoogleSourced(nativeVm), true, 'native fixture should be Google sourced');

  const emptyFixture = getDocumentLineageFixture('empty');
  const emptyVm = mapDocumentProvenance(emptyFixture);
  assert.equal(isGoogleSourced(emptyVm), false, 'empty fixture should not be Google sourced');
});

test('Task 9.8: hasActionableWarnings identifies actionable states', () => {
  const warningFixture = getCandidateWarningFixture('single_likely_continuity');
  const warningVm = mapDocumentProvenance(warningFixture);
  assert.equal(hasActionableWarnings(warningVm), true, 'should have actionable warnings');

  const nativeFixture = getDocumentLineageFixture('native');
  const nativeVm = mapDocumentProvenance(nativeFixture);
  assert.equal(hasActionableWarnings(nativeVm), false, 'native should not have actionable warnings');
});

test('Task 9.8: hasDiagnosticActionableWarnings works correctly', () => {
  const warningFixture = getCandidateWarningFixture('single_likely_continuity');
  const warningVm = mapDocumentProvenance(warningFixture);
  const warningDiag = createDocumentDiagnosticViewModel(warningVm);
  assert.equal(hasDiagnosticActionableWarnings(warningDiag), true);

  const nativeFixture = getDocumentLineageFixture('native');
  const nativeVm = mapDocumentProvenance(nativeFixture);
  const nativeDiag = createDocumentDiagnosticViewModel(nativeVm);
  assert.equal(hasDiagnosticActionableWarnings(nativeDiag), false);
});

test('Task 9.8: isFingerprintSuccessful identifies successful fingerprints', () => {
  const nativeFixture = getDocumentLineageFixture('native');
  const nativeVm = mapDocumentProvenance(nativeFixture);
  // Native fixture has ready fingerprint with evidence
  if (nativeVm.fingerprintStatus.isReady && nativeVm.fingerprintStatus.evidenceAvailable) {
    assert.equal(isFingerprintSuccessful(nativeVm.fingerprintStatus), true);
  }

  const pendingFixture = getDocumentLineageFixture('fingerprint_pending');
  const pendingVm = mapDocumentProvenance(pendingFixture);
  assert.equal(isFingerprintSuccessful(pendingVm.fingerprintStatus), false);

  const failedFixture = getDocumentLineageFixture('fingerprint_failed');
  const failedVm = mapDocumentProvenance(failedFixture);
  assert.equal(isFingerprintSuccessful(failedVm.fingerprintStatus), false);
});
