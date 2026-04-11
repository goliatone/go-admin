/**
 * Phase 6 Lineage Diagnostics Tests
 *
 * Runtime smoke tests that exercise document detail, agreement detail,
 * and diagnostics links in the example app.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 6 Tasks 6.6-6.7
 */

import test from 'node:test';
import assert from 'node:assert/strict';

const {
  // Presentation mappers
  mapDocumentProvenance,
  mapAgreementProvenance,
  // Fixture data
  documentLineageFixtures,
  agreementLineageFixtures,
  getDocumentLineageFixture,
  getAgreementLineageFixture,
  // Phase 6 Task 6.6 - Diagnostic rendering
  determineDiagnosticState,
  createEmptyDisplayConfig,
  createNativeDisplayConfig,
  createFingerprintPendingDisplayConfig,
  createCandidateWarningDisplayConfig,
  createLoadingDisplayConfig,
  createErrorDisplayConfig,
  createWarningCard,
  createWarningCards,
  createFingerprintCard,
  createSourceCard,
  createNewerSourceCard,
  createDocumentDiagnosticViewModel,
  createAgreementDiagnosticViewModel,
  isDiagnosticEmpty,
  isDiagnosticNative,
  isDiagnosticFingerprintPending,
  isDiagnosticCandidateWarning,
  getPrimaryWarningCard,
  hasDiagnosticActionableWarnings,
  validateDocumentDiagnosticViewModel,
  validateAgreementDiagnosticViewModel,
} = await import('../dist/esign/index.js');

// ============================================================================
// Task 6.6 - Diagnostic Rendering State Tests
// ============================================================================

test('determineDiagnosticState returns empty for upload-only documents', () => {
  const empty = getDocumentLineageFixture('empty');
  const vm = mapDocumentProvenance(empty);
  const state = determineDiagnosticState(vm);

  assert.equal(state, 'empty', 'Empty document should have empty diagnostic state');
});

test('determineDiagnosticState returns native for Google-imported documents', () => {
  const native = getDocumentLineageFixture('native');
  const vm = mapDocumentProvenance(native);
  const state = determineDiagnosticState(vm);

  assert.equal(state, 'native', 'Native document should have native diagnostic state');
});

test('determineDiagnosticState returns fingerprint_pending for pending fingerprints', () => {
  const fpPending = getDocumentLineageFixture('fingerprint_pending');
  const vm = mapDocumentProvenance(fpPending);
  const state = determineDiagnosticState(vm);

  assert.equal(state, 'fingerprint_pending', 'Fingerprint pending document should have fingerprint_pending state');
});

test('determineDiagnosticState returns candidate_warning for documents with candidate warnings', () => {
  const candidateWarning = getDocumentLineageFixture('candidate_warning');
  const vm = mapDocumentProvenance(candidateWarning);
  const state = determineDiagnosticState(vm);

  assert.equal(state, 'candidate_warning', 'Candidate warning document should have candidate_warning state');
});

test('determineDiagnosticState returns empty for upload-only agreements', () => {
  const empty = getAgreementLineageFixture('empty');
  const vm = mapAgreementProvenance(empty);
  const state = determineDiagnosticState(vm);

  assert.equal(state, 'empty', 'Empty agreement should have empty diagnostic state');
});

test('determineDiagnosticState returns native for Google-imported agreements', () => {
  const native = getAgreementLineageFixture('native');
  const vm = mapAgreementProvenance(native);
  const state = determineDiagnosticState(vm);

  assert.equal(state, 'native', 'Native agreement should have native diagnostic state');
});

// ============================================================================
// Task 6.6 - Display Configuration Tests
// ============================================================================

test('createEmptyDisplayConfig returns valid empty state configuration', () => {
  const config = createEmptyDisplayConfig({
    kind: 'no_source',
    title: 'No source lineage',
    description: 'This record has no linked source provenance.',
    showPlaceholder: true,
  }, '/admin/debug/lineage/documents/doc-empty');

  assert.equal(config.state, 'empty');
  assert.equal(config.title, 'No source lineage');
  assert.equal(config.description, 'This record has no linked source provenance.');
  assert.ok(config.cssClass, 'Should have CSS class');
  assert.ok(config.ariaLabel, 'Should have aria label');
  assert.equal(config.showDetails, false, 'Should not show details');
  assert.equal(config.showDiagnosticsLink, true, 'Should preserve diagnostics link');
  assert.equal(config.diagnosticsUrl, '/admin/debug/lineage/documents/doc-empty');
});

test('createNativeDisplayConfig returns valid native state configuration', () => {
  const diagnosticsUrl = '/admin/api/v1/diagnostics/documents/test-doc';
  const config = createNativeDisplayConfig(diagnosticsUrl);

  assert.equal(config.state, 'native');
  assert.ok(config.title, 'Should have title');
  assert.ok(config.description, 'Should have description');
  assert.ok(config.cssClass, 'Should have CSS class');
  assert.ok(config.ariaLabel, 'Should have aria label');
  assert.equal(config.showDetails, true, 'Should show details');
  assert.equal(config.showDiagnosticsLink, true, 'Should show diagnostics link');
  assert.equal(config.diagnosticsUrl, diagnosticsUrl, 'Should include diagnostics URL');
});

test('createFingerprintPendingDisplayConfig returns valid fingerprint-pending configuration', () => {
  const config = createFingerprintPendingDisplayConfig();

  assert.equal(config.state, 'fingerprint_pending');
  assert.ok(config.title, 'Should have title');
  assert.ok(config.description.includes('fingerprint'), 'Description should mention fingerprinting');
  assert.ok(config.cssClass, 'Should have CSS class');
  assert.ok(config.ariaLabel, 'Should have aria label');
  assert.equal(config.showDetails, true, 'Should show details');
});

test('createCandidateWarningDisplayConfig returns valid candidate-warning configuration', () => {
  const config = createCandidateWarningDisplayConfig('warning');

  assert.equal(config.state, 'candidate_warning');
  assert.ok(config.title.includes('Warning'), 'Title should indicate warning');
  assert.ok(config.description, 'Should have description');
  assert.ok(config.cssClass.includes('warning'), 'CSS class should include warning');
  assert.ok(config.ariaLabel, 'Should have aria label');
  assert.equal(config.showDetails, true, 'Should show details');
});

test('createLoadingDisplayConfig returns valid loading state configuration', () => {
  const config = createLoadingDisplayConfig();

  assert.equal(config.state, 'loading');
  assert.ok(config.title, 'Should have title');
  assert.ok(config.cssClass, 'Should have CSS class');
  assert.ok(config.ariaLabel, 'Should have aria label');
  assert.equal(config.showDetails, false, 'Should not show details');
});

test('createErrorDisplayConfig returns valid error state configuration', () => {
  const errorMessage = 'Test error message';
  const config = createErrorDisplayConfig(errorMessage);

  assert.equal(config.state, 'error');
  assert.ok(config.title, 'Should have title');
  assert.equal(config.description, errorMessage, 'Should include error message');
  assert.ok(config.cssClass, 'Should have CSS class');
  assert.ok(config.ariaLabel, 'Should have aria label');
  assert.equal(config.showDetails, false, 'Should not show details');
});

// ============================================================================
// Task 6.6 - Card Builder Tests
// ============================================================================

test('createWarningCard returns valid warning card from provenance warning', () => {
  const candidateWarning = getDocumentLineageFixture('candidate_warning');
  const vm = mapDocumentProvenance(candidateWarning);
  const warning = vm.warnings[0];

  const card = createWarningCard(warning);

  assert.ok(card.id, 'Should have id');
  assert.ok(card.type, 'Should have type');
  assert.ok(card.severity, 'Should have severity');
  assert.ok(card.title, 'Should have title');
  assert.ok(card.description, 'Should have description');
  assert.ok(card.icon, 'Should have icon');
  assert.ok(card.cssClass, 'Should have CSS class');
  assert.ok(card.ariaLabel, 'Should have aria label');
});

test('createWarningCards returns array of warning cards', () => {
  const candidateWarning = getDocumentLineageFixture('candidate_warning');
  const vm = mapDocumentProvenance(candidateWarning);

  const cards = createWarningCards(vm.warnings);

  assert.ok(Array.isArray(cards), 'Should return array');
  assert.equal(cards.length, vm.warnings.length, 'Should have same length as warnings');
});

test('createFingerprintCard returns valid fingerprint card for pending status', () => {
  const fpPending = getDocumentLineageFixture('fingerprint_pending');
  const vm = mapDocumentProvenance(fpPending);

  const card = createFingerprintCard(vm.fingerprintStatus);

  assert.equal(card.isPending, true, 'Should be pending');
  assert.equal(card.isReady, false, 'Should not be ready');
  assert.ok(card.statusLabel, 'Should have status label');
  assert.ok(card.cssClass.includes('pending'), 'CSS class should include pending');
  assert.ok(card.ariaLabel, 'Should have aria label');
});

test('createFingerprintCard returns valid fingerprint card for ready status', () => {
  const native = getDocumentLineageFixture('native');
  const vm = mapDocumentProvenance(native);

  const card = createFingerprintCard(vm.fingerprintStatus);

  assert.equal(card.isReady, true, 'Should be ready');
  assert.equal(card.isPending, false, 'Should not be pending');
  assert.ok(card.statusLabel, 'Should have status label');
  assert.ok(card.ariaLabel, 'Should have aria label');
});

test('createSourceCard returns valid source card for Google-imported documents', () => {
  const native = getDocumentLineageFixture('native');
  const vm = mapDocumentProvenance(native);

  const card = createSourceCard(vm);

  assert.ok(card, 'Should return source card');
  assert.equal(card.provider, 'google_drive', 'Provider should be google_drive');
  assert.ok(card.providerLabel, 'Should have provider label');
  assert.ok(card.providerIcon, 'Should have provider icon');
  assert.ok(card.fileId, 'Should have file ID');
  assert.ok(card.webUrl, 'Should have web URL');
  assert.ok(card.title, 'Should have title');
  assert.ok(card.ariaLabel, 'Should have aria label');
});

test('createSourceCard returns null for upload-only documents', () => {
  const empty = getDocumentLineageFixture('empty');
  const vm = mapDocumentProvenance(empty);

  const card = createSourceCard(vm);

  assert.equal(card, null, 'Should return null for upload-only documents');
});

test('createNewerSourceCard returns card when newer source exists', () => {
  const newerSource = getAgreementLineageFixture('newer_source_exists');
  const vm = mapAgreementProvenance(newerSource);

  const card = createNewerSourceCard(vm);

  assert.ok(card, 'Should return newer source card');
  assert.equal(card.visible, true, 'Should be visible');
  assert.ok(card.title, 'Should have title');
  assert.ok(card.description, 'Should have description');
  assert.ok(card.ariaLabel, 'Should have aria label');
});

test('createNewerSourceCard returns null when no newer source exists', () => {
  const native = getAgreementLineageFixture('native');
  const vm = mapAgreementProvenance(native);

  const card = createNewerSourceCard(vm);

  assert.equal(card, null, 'Should return null when no newer source');
});

// ============================================================================
// Task 6.7 - Document Detail Diagnostic View Model Tests
// ============================================================================

test('createDocumentDiagnosticViewModel creates valid empty state view model', () => {
  const empty = getDocumentLineageFixture('empty');
  const provenance = mapDocumentProvenance(empty);
  const diagnostic = createDocumentDiagnosticViewModel(provenance);

  // Validate structure
  const errors = validateDocumentDiagnosticViewModel(diagnostic);
  assert.deepEqual(errors, [], 'Should pass validation');

  // Check state
  assert.equal(diagnostic.displayConfig.state, 'empty');
  assert.equal(isDiagnosticEmpty(diagnostic), true);
  assert.equal(isDiagnosticNative(diagnostic), false);
  assert.equal(diagnostic.displayConfig.title, provenance.emptyState.title);
  assert.equal(diagnostic.displayConfig.description, provenance.emptyState.description);
  assert.equal(diagnostic.displayConfig.showDiagnosticsLink, true);
  assert.equal(diagnostic.displayConfig.diagnosticsUrl, provenance.diagnosticsUrl);

  // Check source card
  assert.equal(diagnostic.sourceCard, null, 'Should have no source card');

  // Check warnings
  assert.equal(diagnostic.warningCards.length, 0, 'Should have no warning cards');
});

test('createDocumentDiagnosticViewModel creates valid native state view model', () => {
  const native = getDocumentLineageFixture('native');
  const provenance = mapDocumentProvenance(native);
  const diagnostic = createDocumentDiagnosticViewModel(provenance);

  // Validate structure
  const errors = validateDocumentDiagnosticViewModel(diagnostic);
  assert.deepEqual(errors, [], 'Should pass validation');

  // Check state
  assert.equal(diagnostic.displayConfig.state, 'native');
  assert.equal(isDiagnosticNative(diagnostic), true);
  assert.equal(isDiagnosticEmpty(diagnostic), false);

  // Check source card
  assert.ok(diagnostic.sourceCard, 'Should have source card');
  assert.equal(diagnostic.sourceCard.provider, 'google_drive');

  // Check fingerprint card
  assert.ok(diagnostic.fingerprintCard, 'Should have fingerprint card');
  assert.equal(diagnostic.fingerprintCard.isReady, true);

  // Check diagnostics link
  assert.equal(diagnostic.displayConfig.showDiagnosticsLink, true);
  assert.ok(diagnostic.displayConfig.diagnosticsUrl);
});

test('createDocumentDiagnosticViewModel creates valid fingerprint-pending state view model', () => {
  const fpPending = getDocumentLineageFixture('fingerprint_pending');
  const provenance = mapDocumentProvenance(fpPending);
  const diagnostic = createDocumentDiagnosticViewModel(provenance);

  // Validate structure
  const errors = validateDocumentDiagnosticViewModel(diagnostic);
  assert.deepEqual(errors, [], 'Should pass validation');

  // Check state
  assert.equal(diagnostic.displayConfig.state, 'fingerprint_pending');
  assert.equal(isDiagnosticFingerprintPending(diagnostic), true);

  // Check fingerprint card
  assert.equal(diagnostic.fingerprintCard.isPending, true);
  assert.equal(diagnostic.fingerprintCard.isReady, false);
});

test('createDocumentDiagnosticViewModel creates valid candidate-warning state view model', () => {
  const candidateWarning = getDocumentLineageFixture('candidate_warning');
  const provenance = mapDocumentProvenance(candidateWarning);
  const diagnostic = createDocumentDiagnosticViewModel(provenance);

  // Validate structure
  const errors = validateDocumentDiagnosticViewModel(diagnostic);
  assert.deepEqual(errors, [], 'Should pass validation');

  // Check state
  assert.equal(diagnostic.displayConfig.state, 'candidate_warning');
  assert.equal(isDiagnosticCandidateWarning(diagnostic), true);

  // Check warning cards
  assert.ok(diagnostic.warningCards.length > 0, 'Should have warning cards');
  const primaryCard = getPrimaryWarningCard(diagnostic);
  assert.ok(primaryCard, 'Should have primary warning card');
  assert.ok(primaryCard.severity, 'Primary card should have severity');

  // Check actionable warnings
  assert.equal(hasDiagnosticActionableWarnings(diagnostic), true);
});

// ============================================================================
// Task 6.7 - Agreement Detail Diagnostic View Model Tests
// ============================================================================

test('createAgreementDiagnosticViewModel creates valid empty state view model', () => {
  const empty = getAgreementLineageFixture('empty');
  const provenance = mapAgreementProvenance(empty);
  const diagnostic = createAgreementDiagnosticViewModel(provenance);

  // Validate structure
  const errors = validateAgreementDiagnosticViewModel(diagnostic);
  assert.deepEqual(errors, [], 'Should pass validation');

  // Check state
  assert.equal(diagnostic.displayConfig.state, 'empty');
  assert.equal(isDiagnosticEmpty(diagnostic), true);
  assert.equal(diagnostic.displayConfig.title, provenance.emptyState.title);
  assert.equal(diagnostic.displayConfig.description, provenance.emptyState.description);
  assert.equal(diagnostic.displayConfig.showDiagnosticsLink, true);
  assert.equal(diagnostic.displayConfig.diagnosticsUrl, provenance.diagnosticsUrl);

  // Check source card
  assert.equal(diagnostic.sourceCard, null, 'Should have no source card');

  // Check newer source card
  assert.equal(diagnostic.newerSourceCard, null, 'Should have no newer source card');
});

test('createAgreementDiagnosticViewModel creates valid native state view model', () => {
  const native = getAgreementLineageFixture('native');
  const provenance = mapAgreementProvenance(native);
  const diagnostic = createAgreementDiagnosticViewModel(provenance);

  // Validate structure
  const errors = validateAgreementDiagnosticViewModel(diagnostic);
  assert.deepEqual(errors, [], 'Should pass validation');

  // Check state
  assert.equal(diagnostic.displayConfig.state, 'native');
  assert.equal(isDiagnosticNative(diagnostic), true);

  // Check source card
  assert.ok(diagnostic.sourceCard, 'Should have source card');
  assert.equal(diagnostic.sourceCard.provider, 'google_drive');

  // Check newer source card
  assert.equal(diagnostic.newerSourceCard, null, 'Should not have newer source card');

  // Check diagnostics link
  assert.equal(diagnostic.displayConfig.showDiagnosticsLink, true);
  assert.ok(diagnostic.displayConfig.diagnosticsUrl);
});

test('createAgreementDiagnosticViewModel creates valid newer-source-exists state view model', () => {
  const newerSource = getAgreementLineageFixture('newer_source_exists');
  const provenance = mapAgreementProvenance(newerSource);
  const diagnostic = createAgreementDiagnosticViewModel(provenance);

  // Validate structure
  const errors = validateAgreementDiagnosticViewModel(diagnostic);
  assert.deepEqual(errors, [], 'Should pass validation');

  // Check newer source card
  assert.ok(diagnostic.newerSourceCard, 'Should have newer source card');
  assert.equal(diagnostic.newerSourceCard.visible, true);
  assert.ok(diagnostic.newerSourceCard.title.includes('Newer'));
});

test('createAgreementDiagnosticViewModel creates valid candidate-warning state view model', () => {
  const candidateWarning = getAgreementLineageFixture('candidate_warning');
  const provenance = mapAgreementProvenance(candidateWarning);
  const diagnostic = createAgreementDiagnosticViewModel(provenance);

  // Validate structure
  const errors = validateAgreementDiagnosticViewModel(diagnostic);
  assert.deepEqual(errors, [], 'Should pass validation');

  // Check state
  assert.equal(diagnostic.displayConfig.state, 'candidate_warning');
  assert.equal(isDiagnosticCandidateWarning(diagnostic), true);

  // Check warning cards
  assert.ok(diagnostic.warningCards.length > 0, 'Should have warning cards');
  assert.equal(hasDiagnosticActionableWarnings(diagnostic), true);
});

// ============================================================================
// Task 6.7 - Diagnostics Links Tests
// ============================================================================

test('document diagnostics URL is propagated to diagnostic view model', () => {
  const native = getDocumentLineageFixture('native');
  const provenance = mapDocumentProvenance(native);
  const diagnostic = createDocumentDiagnosticViewModel(provenance);

  assert.ok(diagnostic.displayConfig.diagnosticsUrl, 'Should have diagnostics URL');
  // Diagnostics URL contains the document ID for backend-owned diagnostics routing
  assert.ok(
    diagnostic.displayConfig.diagnosticsUrl.includes(native.document_id),
    'Diagnostics URL should contain document ID'
  );
  assert.equal(diagnostic.displayConfig.showDiagnosticsLink, true, 'Should show diagnostics link');
});

test('agreement diagnostics URL is propagated to diagnostic view model', () => {
  const native = getAgreementLineageFixture('native');
  const provenance = mapAgreementProvenance(native);
  const diagnostic = createAgreementDiagnosticViewModel(provenance);

  assert.ok(diagnostic.displayConfig.diagnosticsUrl, 'Should have diagnostics URL');
  // Diagnostics URL contains the agreement ID for backend-owned diagnostics routing
  assert.ok(
    diagnostic.displayConfig.diagnosticsUrl.includes(native.agreement_id),
    'Diagnostics URL should contain agreement ID'
  );
  assert.equal(diagnostic.displayConfig.showDiagnosticsLink, true, 'Should show diagnostics link');
});

test('diagnostics URL is preserved for upload-only documents', () => {
  const empty = getDocumentLineageFixture('empty');
  const provenance = mapDocumentProvenance(empty);
  const diagnostic = createDocumentDiagnosticViewModel(provenance);

  assert.equal(diagnostic.displayConfig.diagnosticsUrl, provenance.diagnosticsUrl, 'Should preserve diagnostics URL');
  assert.equal(diagnostic.displayConfig.showDiagnosticsLink, true, 'Should show diagnostics link');
});

test('diagnostics URL is preserved for upload-only agreements', () => {
  const empty = getAgreementLineageFixture('empty');
  const provenance = mapAgreementProvenance(empty);
  const diagnostic = createAgreementDiagnosticViewModel(provenance);

  assert.equal(diagnostic.displayConfig.diagnosticsUrl, provenance.diagnosticsUrl, 'Should preserve diagnostics URL');
  assert.equal(diagnostic.displayConfig.showDiagnosticsLink, true, 'Should show diagnostics link');
});

// ============================================================================
// Task 6.7 - Complete Fixture Coverage Tests
// ============================================================================

test('all document fixtures produce valid diagnostic view models', () => {
  const fixtures = ['empty', 'native', 'repeated_import', 'candidate_warning', 'fingerprint_pending'];

  for (const state of fixtures) {
    const detail = getDocumentLineageFixture(state);
    const provenance = mapDocumentProvenance(detail);
    const diagnostic = createDocumentDiagnosticViewModel(provenance);

    const errors = validateDocumentDiagnosticViewModel(diagnostic);
    assert.deepEqual(errors, [], `${state} fixture should produce valid diagnostic view model`);

    // Verify all required fields are present
    assert.ok(diagnostic.provenance, `${state} should have provenance`);
    assert.ok(diagnostic.displayConfig, `${state} should have displayConfig`);
    assert.ok(Array.isArray(diagnostic.warningCards), `${state} should have warningCards array`);
    assert.ok(diagnostic.fingerprintCard, `${state} should have fingerprintCard`);
  }
});

test('all agreement fixtures produce valid diagnostic view models', () => {
  const fixtures = ['empty', 'native', 'newer_source_exists', 'candidate_warning'];

  for (const state of fixtures) {
    const detail = getAgreementLineageFixture(state);
    const provenance = mapAgreementProvenance(detail);
    const diagnostic = createAgreementDiagnosticViewModel(provenance);

    const errors = validateAgreementDiagnosticViewModel(diagnostic);
    assert.deepEqual(errors, [], `${state} fixture should produce valid diagnostic view model`);

    // Verify all required fields are present
    assert.ok(diagnostic.provenance, `${state} should have provenance`);
    assert.ok(diagnostic.displayConfig, `${state} should have displayConfig`);
    assert.ok(Array.isArray(diagnostic.warningCards), `${state} should have warningCards array`);
  }
});

// ============================================================================
// Task 6.7 - Validation Function Tests
// ============================================================================

test('validateDocumentDiagnosticViewModel returns errors for invalid input', () => {
  const errors = validateDocumentDiagnosticViewModel(null);
  assert.ok(errors.includes('diagnostic view model must be an object'));
});

test('validateDocumentDiagnosticViewModel returns errors for missing fields', () => {
  const errors = validateDocumentDiagnosticViewModel({});

  assert.ok(errors.includes('provenance must be an object'));
  assert.ok(errors.includes('displayConfig must be an object'));
  assert.ok(errors.includes('warningCards must be an array'));
  assert.ok(errors.includes('fingerprintCard must be an object'));
});

test('validateAgreementDiagnosticViewModel returns errors for invalid input', () => {
  const errors = validateAgreementDiagnosticViewModel(null);
  assert.ok(errors.includes('diagnostic view model must be an object'));
});

test('validateAgreementDiagnosticViewModel returns errors for missing fields', () => {
  const errors = validateAgreementDiagnosticViewModel({});

  assert.ok(errors.includes('provenance must be an object'));
  assert.ok(errors.includes('displayConfig must be an object'));
  assert.ok(errors.includes('warningCards must be an array'));
});

// ============================================================================
// Task 6.7 - State Check Utility Tests
// ============================================================================

test('state check utilities work correctly for all document states', () => {
  const states = {
    empty: { empty: true, native: false, fpPending: false, candidateWarning: false },
    native: { empty: false, native: true, fpPending: false, candidateWarning: false },
    fingerprint_pending: { empty: false, native: false, fpPending: true, candidateWarning: false },
    candidate_warning: { empty: false, native: false, fpPending: false, candidateWarning: true },
  };

  for (const [fixture, expected] of Object.entries(states)) {
    const detail = getDocumentLineageFixture(fixture);
    const provenance = mapDocumentProvenance(detail);
    const diagnostic = createDocumentDiagnosticViewModel(provenance);

    assert.equal(isDiagnosticEmpty(diagnostic), expected.empty, `${fixture}: isDiagnosticEmpty`);
    assert.equal(isDiagnosticNative(diagnostic), expected.native, `${fixture}: isDiagnosticNative`);
    assert.equal(
      isDiagnosticFingerprintPending(diagnostic),
      expected.fpPending,
      `${fixture}: isDiagnosticFingerprintPending`
    );
    assert.equal(
      isDiagnosticCandidateWarning(diagnostic),
      expected.candidateWarning,
      `${fixture}: isDiagnosticCandidateWarning`
    );
  }
});

test('state check utilities work correctly for all agreement states', () => {
  const states = {
    empty: { empty: true, native: false, candidateWarning: false },
    native: { empty: false, native: true, candidateWarning: false },
    newer_source_exists: { empty: false, native: true, candidateWarning: false },
    candidate_warning: { empty: false, native: false, candidateWarning: true },
  };

  for (const [fixture, expected] of Object.entries(states)) {
    const detail = getAgreementLineageFixture(fixture);
    const provenance = mapAgreementProvenance(detail);
    const diagnostic = createAgreementDiagnosticViewModel(provenance);

    assert.equal(isDiagnosticEmpty(diagnostic), expected.empty, `${fixture}: isDiagnosticEmpty`);
    assert.equal(isDiagnosticNative(diagnostic), expected.native, `${fixture}: isDiagnosticNative`);
    assert.equal(
      isDiagnosticCandidateWarning(diagnostic),
      expected.candidateWarning,
      `${fixture}: isDiagnosticCandidateWarning`
    );
  }
});

// ============================================================================
// Task 6.7 - Template Integration Smoke Tests
// ============================================================================

test('diagnostic view model provides all template-required fields for documents', () => {
  const fixtures = ['empty', 'native', 'repeated_import', 'candidate_warning', 'fingerprint_pending'];

  for (const state of fixtures) {
    const detail = getDocumentLineageFixture(state);
    const provenance = mapDocumentProvenance(detail);
    const diagnostic = createDocumentDiagnosticViewModel(provenance);

    // Template display config fields
    assert.ok(typeof diagnostic.displayConfig.state === 'string', `${state}: state`);
    assert.ok(typeof diagnostic.displayConfig.title === 'string', `${state}: title`);
    assert.ok(typeof diagnostic.displayConfig.description === 'string', `${state}: description`);
    assert.ok(typeof diagnostic.displayConfig.cssClass === 'string', `${state}: cssClass`);
    assert.ok(typeof diagnostic.displayConfig.ariaLabel === 'string', `${state}: ariaLabel`);
    assert.ok(typeof diagnostic.displayConfig.showDetails === 'boolean', `${state}: showDetails`);
    assert.ok(typeof diagnostic.displayConfig.showDiagnosticsLink === 'boolean', `${state}: showDiagnosticsLink`);

    // Fingerprint card fields
    assert.ok(typeof diagnostic.fingerprintCard.status === 'string', `${state}: fingerprint status`);
    assert.ok(typeof diagnostic.fingerprintCard.statusLabel === 'string', `${state}: fingerprint statusLabel`);
    assert.ok(typeof diagnostic.fingerprintCard.isPending === 'boolean', `${state}: fingerprint isPending`);
    assert.ok(typeof diagnostic.fingerprintCard.isReady === 'boolean', `${state}: fingerprint isReady`);
  }
});

test('diagnostic view model provides all template-required fields for agreements', () => {
  const fixtures = ['empty', 'native', 'newer_source_exists', 'candidate_warning'];

  for (const state of fixtures) {
    const detail = getAgreementLineageFixture(state);
    const provenance = mapAgreementProvenance(detail);
    const diagnostic = createAgreementDiagnosticViewModel(provenance);

    // Template display config fields
    assert.ok(typeof diagnostic.displayConfig.state === 'string', `${state}: state`);
    assert.ok(typeof diagnostic.displayConfig.title === 'string', `${state}: title`);
    assert.ok(typeof diagnostic.displayConfig.description === 'string', `${state}: description`);
    assert.ok(typeof diagnostic.displayConfig.cssClass === 'string', `${state}: cssClass`);
    assert.ok(typeof diagnostic.displayConfig.ariaLabel === 'string', `${state}: ariaLabel`);
    assert.ok(typeof diagnostic.displayConfig.showDetails === 'boolean', `${state}: showDetails`);
    assert.ok(typeof diagnostic.displayConfig.showDiagnosticsLink === 'boolean', `${state}: showDiagnosticsLink`);

    // Check newer source card for applicable fixtures
    if (state === 'newer_source_exists') {
      assert.ok(diagnostic.newerSourceCard, `${state}: should have newer source card`);
      assert.ok(typeof diagnostic.newerSourceCard.visible === 'boolean', `${state}: newerSourceCard.visible`);
    }
  }
});
