/**
 * Phase 7 Lineage Fingerprint Tests
 *
 * Contract tests for fingerprint-ready, fingerprint-pending, and fingerprint-failed
 * detail states without exposing raw evidence blobs in the main UI.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 7 Tasks 7.7-7.8
 */

import test from 'node:test';
import assert from 'node:assert/strict';

const {
  // Fingerprint status constants (Task 7.7)
  FINGERPRINT_STATUS,
  isValidFingerprintStatus,
  // Presentation mappers
  mapDocumentProvenance,
  validateDocumentProvenanceViewModel,
  // Fingerprint status helpers (Task 7.7)
  getFingerprintStatusClass,
  getFingerprintStatusIcon,
  isFingerprintTerminal,
  isFingerprintSuccessful,
  hasFingerprintError,
  getFingerprintStatusMessage,
  // Fixture data (Task 7.8)
  documentLineageFixtures,
  getDocumentLineageFixture,
  // Diagnostic view model builders
  createDocumentDiagnosticViewModel,
  createFingerprintCard,
  isDiagnosticFingerprintPending,
  isDiagnosticFingerprintFailed,
  validateDocumentDiagnosticViewModel,
} = await import('../dist/esign/index.js');

// ============================================================================
// Task 7.7 - Fingerprint Status Constants Tests
// ============================================================================

test('FINGERPRINT_STATUS contains all expected status values', () => {
  assert.equal(FINGERPRINT_STATUS.UNKNOWN, 'unknown');
  assert.equal(FINGERPRINT_STATUS.READY, 'ready');
  assert.equal(FINGERPRINT_STATUS.PENDING, 'pending');
  assert.equal(FINGERPRINT_STATUS.FAILED, 'failed');
  assert.equal(FINGERPRINT_STATUS.NOT_APPLICABLE, 'not_applicable');
});

test('isValidFingerprintStatus returns true for valid statuses', () => {
  assert.equal(isValidFingerprintStatus('unknown'), true);
  assert.equal(isValidFingerprintStatus('ready'), true);
  assert.equal(isValidFingerprintStatus('pending'), true);
  assert.equal(isValidFingerprintStatus('failed'), true);
  assert.equal(isValidFingerprintStatus('not_applicable'), true);
});

test('isValidFingerprintStatus returns false for invalid statuses', () => {
  assert.equal(isValidFingerprintStatus('invalid'), false);
  assert.equal(isValidFingerprintStatus(''), false);
  assert.equal(isValidFingerprintStatus('completed'), false);
});

// ============================================================================
// Task 7.7 - ProvenanceFingerprintStatus Extended Fields Tests
// ============================================================================

test('fingerprint status includes canMatch flag for ready status with evidence', () => {
  const native = getDocumentLineageFixture('native');
  const vm = mapDocumentProvenance(native);

  assert.equal(vm.fingerprintStatus.isReady, true);
  assert.equal(vm.fingerprintStatus.evidenceAvailable, true);
  assert.equal(vm.fingerprintStatus.canMatch, true, 'Ready fingerprint with evidence should be able to match');
});

test('fingerprint status includes canMatch flag as false for pending status', () => {
  const pending = getDocumentLineageFixture('fingerprint_pending');
  const vm = mapDocumentProvenance(pending);

  assert.equal(vm.fingerprintStatus.isPending, true);
  assert.equal(vm.fingerprintStatus.evidenceAvailable, false);
  assert.equal(vm.fingerprintStatus.canMatch, false, 'Pending fingerprint should not be able to match');
});

test('fingerprint status includes canMatch flag as false for failed status', () => {
  const failed = getDocumentLineageFixture('fingerprint_failed');
  const vm = mapDocumentProvenance(failed);

  assert.equal(vm.fingerprintStatus.isFailed, true);
  assert.equal(vm.fingerprintStatus.evidenceAvailable, false);
  assert.equal(vm.fingerprintStatus.canMatch, false, 'Failed fingerprint should not be able to match');
});

test('fingerprint status includes error details for failed status', () => {
  const failed = getDocumentLineageFixture('fingerprint_failed');
  const vm = mapDocumentProvenance(failed);

  assert.equal(vm.fingerprintStatus.isFailed, true);
  assert.ok(vm.fingerprintStatus.errorMessage, 'Failed fingerprint should have error message');
  assert.ok(vm.fingerprintStatus.errorCode, 'Failed fingerprint should have error code');
});

test('fingerprint status includes extractVersion when available', () => {
  const native = getDocumentLineageFixture('native');
  const vm = mapDocumentProvenance(native);

  assert.ok(vm.fingerprintStatus.extractVersion, 'Ready fingerprint should have extract version');
  assert.equal(typeof vm.fingerprintStatus.extractVersion, 'string');
});

// ============================================================================
// Task 7.7 - Fingerprint Status Helper Functions Tests
// ============================================================================

test('getFingerprintStatusClass returns correct CSS classes', () => {
  const native = getDocumentLineageFixture('native');
  const pending = getDocumentLineageFixture('fingerprint_pending');
  const failed = getDocumentLineageFixture('fingerprint_failed');
  const empty = getDocumentLineageFixture('empty');

  const nativeVm = mapDocumentProvenance(native);
  const pendingVm = mapDocumentProvenance(pending);
  const failedVm = mapDocumentProvenance(failed);
  const emptyVm = mapDocumentProvenance(empty);

  assert.equal(getFingerprintStatusClass(nativeVm.fingerprintStatus), 'fingerprint-ready');
  assert.equal(getFingerprintStatusClass(pendingVm.fingerprintStatus), 'fingerprint-pending');
  assert.equal(getFingerprintStatusClass(failedVm.fingerprintStatus), 'fingerprint-failed');
  assert.equal(getFingerprintStatusClass(emptyVm.fingerprintStatus), 'fingerprint-not-applicable');
});

test('getFingerprintStatusIcon returns correct icon names', () => {
  const native = getDocumentLineageFixture('native');
  const pending = getDocumentLineageFixture('fingerprint_pending');
  const failed = getDocumentLineageFixture('fingerprint_failed');

  const nativeVm = mapDocumentProvenance(native);
  const pendingVm = mapDocumentProvenance(pending);
  const failedVm = mapDocumentProvenance(failed);

  assert.equal(getFingerprintStatusIcon(nativeVm.fingerprintStatus), 'check-circle');
  assert.equal(getFingerprintStatusIcon(pendingVm.fingerprintStatus), 'hourglass');
  assert.equal(getFingerprintStatusIcon(failedVm.fingerprintStatus), 'exclamation-triangle');
});

test('isFingerprintTerminal correctly identifies terminal states', () => {
  const native = getDocumentLineageFixture('native');
  const pending = getDocumentLineageFixture('fingerprint_pending');
  const failed = getDocumentLineageFixture('fingerprint_failed');
  const empty = getDocumentLineageFixture('empty');

  const nativeVm = mapDocumentProvenance(native);
  const pendingVm = mapDocumentProvenance(pending);
  const failedVm = mapDocumentProvenance(failed);
  const emptyVm = mapDocumentProvenance(empty);

  assert.equal(isFingerprintTerminal(nativeVm.fingerprintStatus), true, 'Ready is terminal');
  assert.equal(isFingerprintTerminal(pendingVm.fingerprintStatus), false, 'Pending is not terminal');
  assert.equal(isFingerprintTerminal(failedVm.fingerprintStatus), true, 'Failed is terminal');
  assert.equal(isFingerprintTerminal(emptyVm.fingerprintStatus), true, 'Not applicable is terminal');
});

test('isFingerprintSuccessful correctly identifies successful fingerprints', () => {
  const native = getDocumentLineageFixture('native');
  const pending = getDocumentLineageFixture('fingerprint_pending');
  const failed = getDocumentLineageFixture('fingerprint_failed');

  const nativeVm = mapDocumentProvenance(native);
  const pendingVm = mapDocumentProvenance(pending);
  const failedVm = mapDocumentProvenance(failed);

  assert.equal(isFingerprintSuccessful(nativeVm.fingerprintStatus), true, 'Ready with evidence is successful');
  assert.equal(isFingerprintSuccessful(pendingVm.fingerprintStatus), false, 'Pending is not successful');
  assert.equal(isFingerprintSuccessful(failedVm.fingerprintStatus), false, 'Failed is not successful');
});

test('hasFingerprintError correctly identifies failed fingerprints', () => {
  const native = getDocumentLineageFixture('native');
  const pending = getDocumentLineageFixture('fingerprint_pending');
  const failed = getDocumentLineageFixture('fingerprint_failed');

  const nativeVm = mapDocumentProvenance(native);
  const pendingVm = mapDocumentProvenance(pending);
  const failedVm = mapDocumentProvenance(failed);

  assert.equal(hasFingerprintError(nativeVm.fingerprintStatus), false);
  assert.equal(hasFingerprintError(pendingVm.fingerprintStatus), false);
  assert.equal(hasFingerprintError(failedVm.fingerprintStatus), true);
});

test('getFingerprintStatusMessage returns appropriate messages', () => {
  const native = getDocumentLineageFixture('native');
  const pending = getDocumentLineageFixture('fingerprint_pending');
  const failed = getDocumentLineageFixture('fingerprint_failed');
  const empty = getDocumentLineageFixture('empty');

  const nativeVm = mapDocumentProvenance(native);
  const pendingVm = mapDocumentProvenance(pending);
  const failedVm = mapDocumentProvenance(failed);
  const emptyVm = mapDocumentProvenance(empty);

  const nativeMsg = getFingerprintStatusMessage(nativeVm.fingerprintStatus);
  const pendingMsg = getFingerprintStatusMessage(pendingVm.fingerprintStatus);
  const failedMsg = getFingerprintStatusMessage(failedVm.fingerprintStatus);
  const emptyMsg = getFingerprintStatusMessage(emptyVm.fingerprintStatus);

  assert.ok(nativeMsg.includes('ready'), 'Ready message should mention ready');
  assert.ok(pendingMsg.includes('progress'), 'Pending message should mention progress');
  assert.ok(failedMsg.includes('failed') || failedMsg.includes('Failed'), 'Failed message should mention failed');
  assert.ok(emptyMsg.includes('not applicable'), 'Empty message should mention not applicable');
});

// ============================================================================
// Task 7.8 - Fingerprint Fixture Existence Tests
// ============================================================================

test('documentLineageFixtures includes fingerprint_failed fixture', () => {
  assert.ok(
    documentLineageFixtures.fingerprint_failed,
    'documentLineageFixtures should include fingerprint_failed'
  );
});

test('fingerprint_failed fixture has correct structure', () => {
  const fixture = documentLineageFixtures.fingerprint_failed;

  assert.ok(fixture.document_id, 'Should have document_id');
  assert.ok(fixture.source_document, 'Should have source_document (has lineage)');
  assert.ok(fixture.source_revision, 'Should have source_revision');
  assert.ok(fixture.source_artifact, 'Should have source_artifact');
  assert.ok(fixture.google_source, 'Should have google_source');
  assert.ok(fixture.fingerprint_status, 'Should have fingerprint_status');
  assert.equal(fixture.fingerprint_status.status, 'failed', 'Fingerprint status should be failed');
  assert.ok(fixture.diagnostics_url, 'Should have diagnostics_url');
});

test('fingerprint_failed fixture has error details', () => {
  const fixture = documentLineageFixtures.fingerprint_failed;

  assert.ok(fixture.fingerprint_status.error_message, 'Should have error_message');
  assert.ok(fixture.fingerprint_status.error_code, 'Should have error_code');
  assert.equal(fixture.fingerprint_status.evidence_available, false, 'Evidence should not be available');
});

test('getDocumentLineageFixture returns fingerprint_failed fixture', () => {
  const fixture = getDocumentLineageFixture('fingerprint_failed');

  assert.ok(fixture, 'Should return fixture');
  assert.equal(fixture.fingerprint_status.status, 'failed');
});

// ============================================================================
// Task 7.8 - Fingerprint State Rendering Tests
// ============================================================================

test('fingerprint-ready state produces valid provenance view model', () => {
  const native = getDocumentLineageFixture('native');
  const vm = mapDocumentProvenance(native);

  const errors = validateDocumentProvenanceViewModel(vm);
  assert.deepEqual(errors, [], 'Should produce valid view model');

  assert.equal(vm.fingerprintStatus.isReady, true);
  assert.equal(vm.fingerprintStatus.isPending, false);
  assert.equal(vm.fingerprintStatus.isFailed, false);
  assert.equal(vm.hasFingerprint, true, 'Should have fingerprint');
});

test('fingerprint-pending state produces valid provenance view model', () => {
  const pending = getDocumentLineageFixture('fingerprint_pending');
  const vm = mapDocumentProvenance(pending);

  const errors = validateDocumentProvenanceViewModel(vm);
  assert.deepEqual(errors, [], 'Should produce valid view model');

  assert.equal(vm.fingerprintStatus.isPending, true);
  assert.equal(vm.fingerprintStatus.isReady, false);
  assert.equal(vm.fingerprintStatus.isFailed, false);
  assert.equal(vm.hasFingerprint, true, 'Pending fingerprint still counts as hasFingerprint');
});

test('fingerprint-failed state produces valid provenance view model', () => {
  const failed = getDocumentLineageFixture('fingerprint_failed');
  const vm = mapDocumentProvenance(failed);

  const errors = validateDocumentProvenanceViewModel(vm);
  assert.deepEqual(errors, [], 'Should produce valid view model');

  assert.equal(vm.fingerprintStatus.isFailed, true);
  assert.equal(vm.fingerprintStatus.isReady, false);
  assert.equal(vm.fingerprintStatus.isPending, false);
  assert.equal(vm.hasFingerprint, false, 'Failed fingerprint should not count as hasFingerprint');
});

// ============================================================================
// Task 7.8 - Fingerprint Card Tests
// ============================================================================

test('createFingerprintCard returns correct card for ready status', () => {
  const native = getDocumentLineageFixture('native');
  const vm = mapDocumentProvenance(native);
  const card = createFingerprintCard(vm.fingerprintStatus);

  assert.equal(card.isReady, true);
  assert.equal(card.isPending, false);
  assert.equal(card.isFailed, false);
  assert.ok(card.statusLabel.includes('Ready'), 'Status label should mention Ready');
  assert.ok(card.cssClass.includes('ready'), 'CSS class should include ready');
  assert.ok(card.ariaLabel, 'Should have aria label');
});

test('createFingerprintCard returns correct card for pending status', () => {
  const pending = getDocumentLineageFixture('fingerprint_pending');
  const vm = mapDocumentProvenance(pending);
  const card = createFingerprintCard(vm.fingerprintStatus);

  assert.equal(card.isPending, true);
  assert.equal(card.isReady, false);
  assert.equal(card.isFailed, false);
  assert.ok(card.statusLabel.includes('Pending'), 'Status label should mention Pending');
  assert.ok(card.cssClass.includes('pending'), 'CSS class should include pending');
});

test('createFingerprintCard returns correct card for failed status', () => {
  const failed = getDocumentLineageFixture('fingerprint_failed');
  const vm = mapDocumentProvenance(failed);
  const card = createFingerprintCard(vm.fingerprintStatus);

  assert.equal(card.isFailed, true);
  assert.equal(card.isReady, false);
  assert.equal(card.isPending, false);
  assert.ok(card.statusLabel.includes('Failed'), 'Status label should mention Failed');
  assert.ok(card.cssClass.includes('failed'), 'CSS class should include failed');
});

// ============================================================================
// Task 7.8 - Diagnostic View Model Tests for Fingerprint States
// ============================================================================

test('createDocumentDiagnosticViewModel handles fingerprint-ready state', () => {
  const native = getDocumentLineageFixture('native');
  const provenance = mapDocumentProvenance(native);
  const diagnostic = createDocumentDiagnosticViewModel(provenance);

  const errors = validateDocumentDiagnosticViewModel(diagnostic);
  assert.deepEqual(errors, [], 'Should produce valid diagnostic view model');

  assert.equal(diagnostic.fingerprintCard.isReady, true);
  assert.equal(diagnostic.fingerprintCard.evidenceAvailable, true);
});

test('createDocumentDiagnosticViewModel handles fingerprint-pending state', () => {
  const pending = getDocumentLineageFixture('fingerprint_pending');
  const provenance = mapDocumentProvenance(pending);
  const diagnostic = createDocumentDiagnosticViewModel(provenance);

  const errors = validateDocumentDiagnosticViewModel(diagnostic);
  assert.deepEqual(errors, [], 'Should produce valid diagnostic view model');

  assert.equal(diagnostic.fingerprintCard.isPending, true);
  assert.equal(isDiagnosticFingerprintPending(diagnostic), true);
});

test('createDocumentDiagnosticViewModel handles fingerprint-failed state', () => {
  const failed = getDocumentLineageFixture('fingerprint_failed');
  const provenance = mapDocumentProvenance(failed);
  const diagnostic = createDocumentDiagnosticViewModel(provenance);

  const errors = validateDocumentDiagnosticViewModel(diagnostic);
  assert.deepEqual(errors, [], 'Should produce valid diagnostic view model');

  assert.equal(diagnostic.fingerprintCard.isFailed, true);
  assert.equal(diagnostic.fingerprintCard.evidenceAvailable, false);
  assert.equal(diagnostic.displayConfig.state, 'fingerprint_failed');
  assert.equal(isDiagnosticFingerprintFailed(diagnostic), true);
  assert.ok(diagnostic.displayConfig.description.includes('failed'));
});

// ============================================================================
// Task 7.8 - Evidence Blob Protection Tests
// ============================================================================

test('fingerprint status does not expose raw evidence blobs', () => {
  const native = getDocumentLineageFixture('native');
  const vm = mapDocumentProvenance(native);

  // The view model should have evidence_available flag but not raw evidence data
  assert.equal(vm.fingerprintStatus.evidenceAvailable, true);

  // Ensure no raw fingerprint blobs are exposed in the view model
  assert.equal('rawEvidence' in vm.fingerprintStatus, false, 'Should not expose rawEvidence');
  assert.equal('fingerprints' in vm.fingerprintStatus, false, 'Should not expose fingerprints array');
  assert.equal('simHash' in vm.fingerprintStatus, false, 'Should not expose simHash');
  assert.equal('minHash' in vm.fingerprintStatus, false, 'Should not expose minHash');
  assert.equal('chunkHashes' in vm.fingerprintStatus, false, 'Should not expose chunkHashes');
});

test('diagnostic fingerprint card does not expose raw evidence blobs', () => {
  const native = getDocumentLineageFixture('native');
  const provenance = mapDocumentProvenance(native);
  const diagnostic = createDocumentDiagnosticViewModel(provenance);

  // The diagnostic card should have evidenceAvailable flag but not raw evidence data
  assert.equal(diagnostic.fingerprintCard.evidenceAvailable, true);

  // Ensure no raw fingerprint blobs are exposed in the diagnostic card
  assert.equal('rawEvidence' in diagnostic.fingerprintCard, false, 'Should not expose rawEvidence');
  assert.equal('fingerprints' in diagnostic.fingerprintCard, false, 'Should not expose fingerprints array');
});

// ============================================================================
// Task 7.8 - All Fingerprint Fixture States Complete Coverage
// ============================================================================

test('all fingerprint fixture states produce valid view models', () => {
  const fingerprintStates = ['native', 'fingerprint_pending', 'fingerprint_failed'];

  for (const state of fingerprintStates) {
    const fixture = getDocumentLineageFixture(state);
    const vm = mapDocumentProvenance(fixture);
    const errors = validateDocumentProvenanceViewModel(vm);

    assert.deepEqual(errors, [], `${state} fixture should produce valid view model`);
    assert.ok(vm.fingerprintStatus, `${state} should have fingerprintStatus`);
    assert.ok(typeof vm.fingerprintStatus.status === 'string', `${state} should have status string`);
    assert.ok(typeof vm.fingerprintStatus.statusLabel === 'string', `${state} should have statusLabel string`);
  }
});

test('all fingerprint fixture states produce valid diagnostic view models', () => {
  const fingerprintStates = ['native', 'fingerprint_pending', 'fingerprint_failed'];

  for (const state of fingerprintStates) {
    const fixture = getDocumentLineageFixture(state);
    const provenance = mapDocumentProvenance(fixture);
    const diagnostic = createDocumentDiagnosticViewModel(provenance);
    const errors = validateDocumentDiagnosticViewModel(diagnostic);

    assert.deepEqual(errors, [], `${state} fixture should produce valid diagnostic view model`);
    assert.ok(diagnostic.fingerprintCard, `${state} should have fingerprintCard`);
    assert.ok(diagnostic.fingerprintCard.cssClass, `${state} should have CSS class`);
    assert.ok(diagnostic.fingerprintCard.ariaLabel, `${state} should have aria label`);
  }
});

// ============================================================================
// Task 7.8 - Fingerprint Status in Document List Context
// ============================================================================

test('fingerprint status flags are mutually exclusive', () => {
  const states = ['native', 'fingerprint_pending', 'fingerprint_failed', 'empty'];

  for (const state of states) {
    const fixture = getDocumentLineageFixture(state);
    const vm = mapDocumentProvenance(fixture);
    const fp = vm.fingerprintStatus;

    // Count how many status flags are true
    const trueCount = [fp.isReady, fp.isPending, fp.isFailed, fp.isNotApplicable].filter(Boolean).length;

    assert.equal(trueCount, 1, `${state}: exactly one fingerprint status flag should be true`);
  }
});
