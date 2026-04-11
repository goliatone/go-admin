/**
 * Phase 10 Lineage End-to-End Smoke Tests
 *
 * Runtime smoke coverage for the complete Version 1 lineage path across:
 * - Document detail
 * - Agreement detail
 * - Fingerprint visibility
 * - Candidate-warning visibility
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 10 Tasks 10.5-10.6
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = resolve(__dirname, '..');
const DIST_DIR = resolve(ASSETS_DIR, 'dist');

// ============================================================================
// Task 10.5 - End-to-End Runtime Smoke Coverage
// Validates the complete Version 1 lineage path is operational
// ============================================================================

// -----------------------------------------------------------------------------
// Section 1: Core Module Availability
// Verify all required lineage modules are built and exportable
// -----------------------------------------------------------------------------

test('Task 10.5: dist/esign/index.js exists and is importable', async () => {
  const path = resolve(DIST_DIR, 'esign/index.js');
  assert.ok(existsSync(path), `Expected dist file to exist: ${path}`);

  const module = await import('../dist/esign/index.js');
  assert.ok(module, 'esign module should be importable');
});

test('Task 10.5: esign module exports all lineage contract types', async () => {
  const module = await import('../dist/esign/index.js');

  // Core lineage contracts (Phase 1)
  assert.ok(module.normalizeDocumentLineageDetail, 'normalizeDocumentLineageDetail should be exported');
  assert.ok(module.normalizeAgreementLineageDetail, 'normalizeAgreementLineageDetail should be exported');
  assert.ok(module.normalizeGoogleImportLineageStatus, 'normalizeGoogleImportLineageStatus should be exported');

  // Fingerprint status (Phase 7)
  assert.ok(module.FINGERPRINT_STATUS, 'FINGERPRINT_STATUS should be exported');
  assert.ok(module.isValidFingerprintStatus, 'isValidFingerprintStatus should be exported');

  // Candidate relationship constants (Phase 8)
  assert.ok(module.CANDIDATE_RELATIONSHIP_STATUS, 'CANDIDATE_RELATIONSHIP_STATUS should be exported');
  assert.ok(module.CANDIDATE_RELATIONSHIP_TYPE, 'CANDIDATE_RELATIONSHIP_TYPE should be exported');
  assert.ok(module.CONFIDENCE_BAND, 'CONFIDENCE_BAND should be exported');
});

test('Task 10.5: esign module exports presentation mappers', async () => {
  const module = await import('../dist/esign/index.js');

  // Presentation mappers (Phase 5)
  assert.ok(module.mapDocumentProvenance, 'mapDocumentProvenance should be exported');
  assert.ok(module.mapAgreementProvenance, 'mapAgreementProvenance should be exported');
  assert.ok(module.validateDocumentProvenanceViewModel, 'validateDocumentProvenanceViewModel should be exported');
  assert.ok(module.validateAgreementProvenanceViewModel, 'validateAgreementProvenanceViewModel should be exported');
});

test('Task 10.5: esign module exports diagnostic view model builders', async () => {
  const module = await import('../dist/esign/index.js');

  // Diagnostic rendering (Phase 6)
  assert.ok(module.createDocumentDiagnosticViewModel, 'createDocumentDiagnosticViewModel should be exported');
  assert.ok(module.createAgreementDiagnosticViewModel, 'createAgreementDiagnosticViewModel should be exported');
  assert.ok(module.determineDiagnosticState, 'determineDiagnosticState should be exported');
  assert.ok(module.createWarningCards, 'createWarningCards should be exported');
});

test('Task 10.5: esign module exports provenance card interactivity', async () => {
  const module = await import('../dist/esign/index.js');

  // Provenance card (Phase 9)
  assert.ok(module.initProvenanceCards, 'initProvenanceCards should be exported');
  assert.ok(module.bootstrapProvenanceCards, 'bootstrapProvenanceCards should be exported');
  assert.ok(module.PROVENANCE_CARD_SELECTOR, 'PROVENANCE_CARD_SELECTOR should be exported');
  assert.ok(module.getProvenanceCards, 'getProvenanceCards should be exported');
});

test('Task 10.5: esign module exports all fixture types', async () => {
  const module = await import('../dist/esign/index.js');

  // Document/Agreement fixtures (Phase 2)
  assert.ok(module.documentLineageFixtures, 'documentLineageFixtures should be exported');
  assert.ok(module.agreementLineageFixtures, 'agreementLineageFixtures should be exported');
  assert.ok(module.getDocumentLineageFixture, 'getDocumentLineageFixture should be exported');
  assert.ok(module.getAgreementLineageFixture, 'getAgreementLineageFixture should be exported');

  // Import fixtures (Phase 3)
  assert.ok(module.importResponseFixtures, 'importResponseFixtures should be exported');
  assert.ok(module.getImportResponseFixture, 'getImportResponseFixture should be exported');

  // Candidate warning fixtures (Phase 8)
  assert.ok(module.candidateWarningFixtures, 'candidateWarningFixtures should be exported');
  assert.ok(module.getCandidateWarningFixture, 'getCandidateWarningFixture should be exported');
});

// -----------------------------------------------------------------------------
// Section 2: Document Detail Complete Path Smoke Tests
// Validates document detail rendering for all lineage states
// -----------------------------------------------------------------------------

test('Task 10.5: document detail empty state complete path', async () => {
  const {
    getDocumentLineageFixture,
    mapDocumentProvenance,
    createDocumentDiagnosticViewModel,
    validateDocumentProvenanceViewModel,
    validateDocumentDiagnosticViewModel,
    isDiagnosticEmpty,
  } = await import('../dist/esign/index.js');

  const fixture = getDocumentLineageFixture('empty');
  const provenance = mapDocumentProvenance(fixture);
  const diagnostic = createDocumentDiagnosticViewModel(provenance);

  // Validate all transformation steps
  const provenanceErrors = validateDocumentProvenanceViewModel(provenance);
  assert.deepEqual(provenanceErrors, [], 'empty state provenance should be valid');

  const diagnosticErrors = validateDocumentDiagnosticViewModel(diagnostic);
  assert.deepEqual(diagnosticErrors, [], 'empty state diagnostic should be valid');

  assert.equal(isDiagnosticEmpty(diagnostic), true, 'should be identified as empty state');
  assert.ok(diagnostic.displayConfig.ariaLabel, 'should have accessibility label');
});

test('Task 10.5: document detail native lineage complete path', async () => {
  const {
    getDocumentLineageFixture,
    mapDocumentProvenance,
    createDocumentDiagnosticViewModel,
    validateDocumentProvenanceViewModel,
    validateDocumentDiagnosticViewModel,
    isDiagnosticNative,
    createSourceCard,
    createFingerprintCard,
  } = await import('../dist/esign/index.js');

  const fixture = getDocumentLineageFixture('native');
  const provenance = mapDocumentProvenance(fixture);
  const diagnostic = createDocumentDiagnosticViewModel(provenance);

  // Validate transformation chain
  const provenanceErrors = validateDocumentProvenanceViewModel(provenance);
  assert.deepEqual(provenanceErrors, [], 'native lineage provenance should be valid');

  const diagnosticErrors = validateDocumentDiagnosticViewModel(diagnostic);
  assert.deepEqual(diagnosticErrors, [], 'native lineage diagnostic should be valid');

  // Verify state identification
  assert.equal(isDiagnosticNative(diagnostic), true, 'should be identified as native state');

  // Verify card generation
  const sourceCard = createSourceCard(provenance);
  assert.ok(sourceCard, 'should generate source card for native lineage');
  assert.ok(sourceCard.providerIcon, 'source card should have provider icon');
  assert.ok(sourceCard.webUrl, 'source card should have web URL');

  const fingerprintCard = createFingerprintCard(provenance.fingerprintStatus);
  assert.ok(fingerprintCard, 'should generate fingerprint card');
  assert.ok(fingerprintCard.ariaLabel, 'fingerprint card should have accessibility label');
});

test('Task 10.5: document detail fingerprint pending complete path', async () => {
  const {
    getDocumentLineageFixture,
    mapDocumentProvenance,
    createDocumentDiagnosticViewModel,
    validateDocumentDiagnosticViewModel,
    isDiagnosticFingerprintPending,
    getFingerprintStatusIcon,
    isFingerprintTerminal,
  } = await import('../dist/esign/index.js');

  const fixture = getDocumentLineageFixture('fingerprint_pending');
  const provenance = mapDocumentProvenance(fixture);
  const diagnostic = createDocumentDiagnosticViewModel(provenance);

  const errors = validateDocumentDiagnosticViewModel(diagnostic);
  assert.deepEqual(errors, [], 'fingerprint pending diagnostic should be valid');

  assert.equal(isDiagnosticFingerprintPending(diagnostic), true, 'should be identified as fingerprint pending');

  // Verify fingerprint status helpers work correctly
  const icon = getFingerprintStatusIcon(provenance.fingerprintStatus);
  assert.equal(icon, 'hourglass', 'pending status should use hourglass icon');

  assert.equal(isFingerprintTerminal(provenance.fingerprintStatus), false, 'pending should not be terminal');
});

test('Task 10.5: document detail fingerprint failed complete path', async () => {
  const {
    getDocumentLineageFixture,
    mapDocumentProvenance,
    createDocumentDiagnosticViewModel,
    validateDocumentDiagnosticViewModel,
    isDiagnosticFingerprintFailed,
    hasFingerprintError,
    isFingerprintTerminal,
  } = await import('../dist/esign/index.js');

  const fixture = getDocumentLineageFixture('fingerprint_failed');
  const provenance = mapDocumentProvenance(fixture);
  const diagnostic = createDocumentDiagnosticViewModel(provenance);

  const errors = validateDocumentDiagnosticViewModel(diagnostic);
  assert.deepEqual(errors, [], 'fingerprint failed diagnostic should be valid');

  assert.equal(isDiagnosticFingerprintFailed(diagnostic), true, 'should be identified as fingerprint failed');
  assert.equal(hasFingerprintError(provenance.fingerprintStatus), true, 'should have fingerprint error');
  assert.equal(isFingerprintTerminal(provenance.fingerprintStatus), true, 'failed should be terminal');
});

test('Task 10.5: document detail candidate warning complete path', async () => {
  const {
    getCandidateWarningFixture,
    mapDocumentProvenance,
    createDocumentDiagnosticViewModel,
    validateDocumentDiagnosticViewModel,
    isDiagnosticCandidateWarning,
    hasDiagnosticActionableWarnings,
    createWarningCards,
    getPrimaryWarningCard,
  } = await import('../dist/esign/index.js');

  const fixture = getCandidateWarningFixture('single_likely_continuity');
  const provenance = mapDocumentProvenance(fixture);
  const diagnostic = createDocumentDiagnosticViewModel(provenance);

  const errors = validateDocumentDiagnosticViewModel(diagnostic);
  assert.deepEqual(errors, [], 'candidate warning diagnostic should be valid');

  assert.equal(isDiagnosticCandidateWarning(diagnostic), true, 'should be identified as candidate warning');
  assert.equal(hasDiagnosticActionableWarnings(diagnostic), true, 'pending_review should be actionable');

  // Verify warning cards are generated
  const warningCards = createWarningCards(provenance.warnings);
  assert.ok(warningCards.length > 0, 'should generate warning cards');

  const primaryCard = getPrimaryWarningCard(diagnostic);
  assert.ok(primaryCard, 'should have primary warning card');
  assert.ok(primaryCard.title, 'primary card should have title');
  assert.ok(primaryCard.ariaLabel, 'primary card should have accessibility label');
});

// -----------------------------------------------------------------------------
// Section 3: Agreement Detail Complete Path Smoke Tests
// Validates agreement detail rendering for all lineage states
// -----------------------------------------------------------------------------

test('Task 10.5: agreement detail empty state complete path', async () => {
  const {
    getAgreementLineageFixture,
    mapAgreementProvenance,
    createAgreementDiagnosticViewModel,
    validateAgreementProvenanceViewModel,
    validateAgreementDiagnosticViewModel,
  } = await import('../dist/esign/index.js');

  const fixture = getAgreementLineageFixture('empty');
  const provenance = mapAgreementProvenance(fixture);
  const diagnostic = createAgreementDiagnosticViewModel(provenance);

  const provenanceErrors = validateAgreementProvenanceViewModel(provenance);
  assert.deepEqual(provenanceErrors, [], 'empty agreement provenance should be valid');

  const diagnosticErrors = validateAgreementDiagnosticViewModel(diagnostic);
  assert.deepEqual(diagnosticErrors, [], 'empty agreement diagnostic should be valid');

  assert.equal(provenance.hasLineage, false, 'empty agreement should not have lineage');
});

test('Task 10.5: agreement detail native lineage complete path', async () => {
  const {
    getAgreementLineageFixture,
    mapAgreementProvenance,
    createAgreementDiagnosticViewModel,
    validateAgreementProvenanceViewModel,
    validateAgreementDiagnosticViewModel,
    createSourceCard,
  } = await import('../dist/esign/index.js');

  const fixture = getAgreementLineageFixture('native');
  const provenance = mapAgreementProvenance(fixture);
  const diagnostic = createAgreementDiagnosticViewModel(provenance);

  const provenanceErrors = validateAgreementProvenanceViewModel(provenance);
  assert.deepEqual(provenanceErrors, [], 'native agreement provenance should be valid');

  const diagnosticErrors = validateAgreementDiagnosticViewModel(diagnostic);
  assert.deepEqual(diagnosticErrors, [], 'native agreement diagnostic should be valid');

  assert.equal(provenance.hasLineage, true, 'native agreement should have lineage');
  assert.ok(provenance.revision, 'should have pinned revision');

  const sourceCard = createSourceCard(provenance);
  assert.ok(sourceCard, 'should generate source card for native agreement');
});

test('Task 10.5: agreement detail newer source exists complete path', async () => {
  const {
    getAgreementLineageFixture,
    mapAgreementProvenance,
    createAgreementDiagnosticViewModel,
    validateAgreementDiagnosticViewModel,
    createNewerSourceCard,
  } = await import('../dist/esign/index.js');

  const fixture = getAgreementLineageFixture('newer_source_exists');
  const provenance = mapAgreementProvenance(fixture);
  const diagnostic = createAgreementDiagnosticViewModel(provenance);

  const errors = validateAgreementDiagnosticViewModel(diagnostic);
  assert.deepEqual(errors, [], 'newer source exists diagnostic should be valid');

  assert.equal(provenance.newerSourceExists, true, 'should flag newer source exists');

  const newerSourceCard = createNewerSourceCard(provenance);
  assert.ok(newerSourceCard, 'should generate newer source card');
  assert.equal(newerSourceCard.visible, true, 'newer source card should be visible');
  assert.ok(newerSourceCard.ariaLabel, 'newer source card should have accessibility label');
});

test('Task 10.5: agreement detail candidate warning complete path', async () => {
  const {
    getAgreementCandidateWarningFixture,
    mapAgreementProvenance,
    createAgreementDiagnosticViewModel,
    validateAgreementDiagnosticViewModel,
    hasDiagnosticActionableWarnings,
  } = await import('../dist/esign/index.js');

  const fixture = getAgreementCandidateWarningFixture('single_likely_continuity');
  const provenance = mapAgreementProvenance(fixture);
  const diagnostic = createAgreementDiagnosticViewModel(provenance);

  const errors = validateAgreementDiagnosticViewModel(diagnostic);
  assert.deepEqual(errors, [], 'agreement candidate warning diagnostic should be valid');

  assert.equal(provenance.hasCandidateWarnings, true, 'should have candidate warnings');
  assert.equal(hasDiagnosticActionableWarnings(diagnostic), true, 'should have actionable warnings');
});

// -----------------------------------------------------------------------------
// Section 4: Import Flow Complete Path Smoke Tests
// Validates import response handling for all states
// -----------------------------------------------------------------------------

test('Task 10.5: import native success complete path', async () => {
  const {
    getImportResponseFixture,
    validateImportResponsePayload,
    normalizeGoogleImportRunDetail,
    isTerminalGoogleImportStatus,
  } = await import('../dist/esign/index.js');

  const fixture = getImportResponseFixture('native_import_success');
  const errors = validateImportResponsePayload(fixture);
  assert.deepEqual(errors, [], 'native import success should be valid');

  const normalized = normalizeGoogleImportRunDetail(fixture);
  assert.equal(normalized.status, 'succeeded', 'status should be succeeded');
  assert.equal(isTerminalGoogleImportStatus(normalized.status), true, 'succeeded is terminal');

  assert.ok(normalized.source_document, 'should have source document');
  assert.ok(normalized.source_revision, 'should have source revision');
  assert.ok(normalized.source_artifact, 'should have source artifact');
});

test('Task 10.5: import unchanged reimport complete path', async () => {
  const {
    getImportResponseFixture,
    validateImportResponsePayload,
    normalizeGoogleImportRunDetail,
  } = await import('../dist/esign/index.js');

  const fixture = getImportResponseFixture('unchanged_reimport');
  const errors = validateImportResponsePayload(fixture);
  assert.deepEqual(errors, [], 'unchanged reimport should be valid');

  const normalized = normalizeGoogleImportRunDetail(fixture);
  assert.equal(normalized.status, 'succeeded');
  assert.ok(normalized.source_revision_id, 'should have reused revision ID');
});

test('Task 10.5: import changed source reimport complete path', async () => {
  const {
    getImportResponseFixture,
    validateImportResponsePayload,
    normalizeGoogleImportRunDetail,
  } = await import('../dist/esign/index.js');

  const fixture = getImportResponseFixture('changed_source_reimport');
  const errors = validateImportResponsePayload(fixture);
  assert.deepEqual(errors, [], 'changed source reimport should be valid');

  const normalized = normalizeGoogleImportRunDetail(fixture);
  assert.equal(normalized.status, 'succeeded');
  assert.ok(normalized.source_revision, 'should have new source revision');
});

test('Task 10.5: import failure complete path', async () => {
  const {
    getImportResponseFixture,
    validateImportResponsePayload,
    normalizeGoogleImportRunDetail,
    isTerminalGoogleImportStatus,
  } = await import('../dist/esign/index.js');

  const fixture = getImportResponseFixture('import_failure');
  const errors = validateImportResponsePayload(fixture);
  assert.deepEqual(errors, [], 'import failure should be valid');

  const normalized = normalizeGoogleImportRunDetail(fixture);
  assert.equal(normalized.status, 'failed', 'status should be failed');
  assert.equal(isTerminalGoogleImportStatus(normalized.status), true, 'failed is terminal');

  assert.ok(normalized.error, 'should have error');
  assert.ok(normalized.error.code, 'error should have code');
  assert.ok(normalized.error.message, 'error should have message');
});

// -----------------------------------------------------------------------------
// Section 5: Candidate Warning States Complete Path Smoke Tests
// Validates all candidate warning fixture states work correctly
// -----------------------------------------------------------------------------

test('Task 10.5: all candidate warning states produce valid diagnostic view models', async () => {
  const {
    getCandidateWarningFixtureStates,
    getCandidateWarningFixture,
    mapDocumentProvenance,
    createDocumentDiagnosticViewModel,
    validateDocumentDiagnosticViewModel,
  } = await import('../dist/esign/index.js');

  const states = getCandidateWarningFixtureStates();

  for (const state of states) {
    const fixture = getCandidateWarningFixture(state);
    const provenance = mapDocumentProvenance(fixture);
    const diagnostic = createDocumentDiagnosticViewModel(provenance);
    const errors = validateDocumentDiagnosticViewModel(diagnostic);

    assert.deepEqual(errors, [], `${state} should produce valid diagnostic view model`);
    assert.ok(diagnostic.displayConfig.ariaLabel, `${state} should have accessibility label`);
    assert.ok(diagnostic.warningCards.length > 0, `${state} should have warning cards`);
  }
});

test('Task 10.5: candidate status helpers work correctly', async () => {
  const {
    getCandidateWarningFixture,
    isCandidateActionable,
    isCandidateResolved,
    getPrimaryCandidateWarning,
    countCandidatesByStatus,
  } = await import('../dist/esign/index.js');

  // Pending review should be actionable
  const pendingFixture = getCandidateWarningFixture('single_likely_continuity');
  const pendingWarning = pendingFixture.candidate_warning_summary[0];
  assert.equal(isCandidateActionable(pendingWarning), true, 'pending_review should be actionable');
  assert.equal(isCandidateResolved(pendingWarning), false, 'pending_review should not be resolved');

  // Rejected should be resolved and not actionable
  const rejectedFixture = getCandidateWarningFixture('previously_rejected');
  const rejectedWarning = rejectedFixture.candidate_warning_summary[0];
  assert.equal(isCandidateActionable(rejectedWarning), false, 'rejected should not be actionable');
  assert.equal(isCandidateResolved(rejectedWarning), true, 'rejected should be resolved');

  // Auto-linked should be resolved
  const autoLinkedFixture = getCandidateWarningFixture('high_confidence_auto_linked');
  const autoLinkedWarning = autoLinkedFixture.candidate_warning_summary[0];
  assert.equal(isCandidateResolved(autoLinkedWarning), true, 'auto_linked should be resolved');

  // Multiple candidates should return primary correctly
  const multipleFixture = getCandidateWarningFixture('multiple_ambiguous_candidates');
  const primary = getPrimaryCandidateWarning(multipleFixture.candidate_warning_summary);
  assert.ok(primary, 'should return primary warning');
  assert.equal(primary.status, 'pending_review', 'primary should be pending_review');

  const counts = countCandidatesByStatus(multipleFixture.candidate_warning_summary);
  assert.ok(counts.pending_review >= 2, 'should count multiple pending_review');
});

// -----------------------------------------------------------------------------
// Section 6: Warning Precedence Complete Path Smoke Tests
// Validates warning precedence rules are correctly applied
// -----------------------------------------------------------------------------

test('Task 10.5: warning precedence rules applied correctly', async () => {
  const {
    getDocumentLineageFixture,
    getCandidateWarningFixture,
    mapDocumentProvenance,
    determineDiagnosticState,
  } = await import('../dist/esign/index.js');

  // Candidate warning has highest precedence
  const candidateFixture = getCandidateWarningFixture('single_likely_continuity');
  const candidateProvenance = mapDocumentProvenance(candidateFixture);
  const candidateState = determineDiagnosticState(candidateProvenance);
  assert.equal(candidateState, 'candidate_warning', 'candidate_warning should have highest precedence');

  // Fingerprint failed takes precedence over native
  const failedFixture = getDocumentLineageFixture('fingerprint_failed');
  const failedProvenance = mapDocumentProvenance(failedFixture);
  const failedState = determineDiagnosticState(failedProvenance);
  assert.equal(failedState, 'fingerprint_failed', 'fingerprint_failed should take precedence');

  // Fingerprint pending takes precedence over native
  const pendingFixture = getDocumentLineageFixture('fingerprint_pending');
  const pendingProvenance = mapDocumentProvenance(pendingFixture);
  const pendingState = determineDiagnosticState(pendingProvenance);
  assert.equal(pendingState, 'fingerprint_pending', 'fingerprint_pending should take precedence');

  // Native state when no warnings/issues
  const nativeFixture = getDocumentLineageFixture('native');
  const nativeProvenance = mapDocumentProvenance(nativeFixture);
  const nativeState = determineDiagnosticState(nativeProvenance);
  assert.equal(nativeState, 'native', 'native should be state when no warnings');

  // Empty state when no lineage
  const emptyFixture = getDocumentLineageFixture('empty');
  const emptyProvenance = mapDocumentProvenance(emptyFixture);
  const emptyState = determineDiagnosticState(emptyProvenance);
  assert.equal(emptyState, 'empty', 'empty should be state when no lineage');
});

// -----------------------------------------------------------------------------
// Section 7: Accessibility Coverage Smoke Tests
// Validates all states have proper accessibility attributes
// -----------------------------------------------------------------------------

test('Task 10.5: all document states have accessibility labels', async () => {
  const {
    getDocumentLineageFixture,
    mapDocumentProvenance,
    createDocumentDiagnosticViewModel,
  } = await import('../dist/esign/index.js');

  const states = ['empty', 'native', 'repeated_import', 'candidate_warning', 'fingerprint_pending', 'fingerprint_failed'];

  for (const state of states) {
    const fixture = getDocumentLineageFixture(state);
    const provenance = mapDocumentProvenance(fixture);
    const diagnostic = createDocumentDiagnosticViewModel(provenance);

    assert.ok(diagnostic.displayConfig.ariaLabel, `${state} displayConfig should have ariaLabel`);
    assert.ok(diagnostic.displayConfig.ariaLabel.length > 0, `${state} ariaLabel should not be empty`);
  }
});

test('Task 10.5: all agreement states have accessibility labels', async () => {
  const {
    getAgreementLineageFixture,
    mapAgreementProvenance,
    createAgreementDiagnosticViewModel,
  } = await import('../dist/esign/index.js');

  const states = ['empty', 'native', 'newer_source_exists', 'candidate_warning'];

  for (const state of states) {
    const fixture = getAgreementLineageFixture(state);
    const provenance = mapAgreementProvenance(fixture);
    const diagnostic = createAgreementDiagnosticViewModel(provenance);

    assert.ok(diagnostic.displayConfig.ariaLabel, `${state} displayConfig should have ariaLabel`);
    assert.ok(diagnostic.displayConfig.ariaLabel.length > 0, `${state} ariaLabel should not be empty`);
  }
});

// -----------------------------------------------------------------------------
// Section 8: Seeded QA Scenario Validation
// Validates QA fixtures are properly structured for runtime use
// -----------------------------------------------------------------------------

test('Task 10.5: seeded QA scenario lineage validation', async () => {
  const {
    getSeededGoogleImportScenario,
    validateSeededScenarioLineage,
    hasDocumentLineageLinkage,
    hasAgreementPinnedProvenance,
  } = await import('../dist/esign/index.js');

  const scenario = getSeededGoogleImportScenario('first_import');
  const errors = validateSeededScenarioLineage(scenario);

  assert.deepEqual(errors, [], 'seeded scenario should pass lineage validation');
  assert.equal(hasDocumentLineageLinkage(scenario.document), true, 'document should have lineage linkage');
  assert.equal(hasAgreementPinnedProvenance(scenario.agreement), true, 'agreement should have pinned provenance');
});

// -----------------------------------------------------------------------------
// Section 9: Detail Payload Fixtures Validation
// Validates detail payload fixtures work with lineage data
// -----------------------------------------------------------------------------

test('Task 10.5: detail payload fixtures have correct lineage structure', async () => {
  const {
    getDetailPayloadFixtureStates,
    getDocumentDetailPayloadFixture,
    getAgreementDetailPayloadFixture,
    validateDocumentDetailPayloadWithLineage,
    validateAgreementDetailPayloadWithLineage,
    hasDocumentLineageLinkage,
    hasAgreementPinnedProvenance,
  } = await import('../dist/esign/index.js');

  const states = getDetailPayloadFixtureStates();

  // Validate document fixtures
  for (const docState of states.documents) {
    const fixture = getDocumentDetailPayloadFixture(docState);
    const errors = validateDocumentDetailPayloadWithLineage(fixture);
    assert.deepEqual(errors, [], `document ${docState} should be valid`);

    if (docState !== 'upload_only') {
      assert.equal(hasDocumentLineageLinkage(fixture), true, `${docState} should have lineage linkage`);
    }
  }

  // Validate agreement fixtures
  for (const agrState of states.agreements) {
    const fixture = getAgreementDetailPayloadFixture(agrState);
    const errors = validateAgreementDetailPayloadWithLineage(fixture);
    assert.deepEqual(errors, [], `agreement ${agrState} should be valid`);

    if (agrState !== 'upload_only') {
      assert.equal(hasAgreementPinnedProvenance(fixture), true, `${agrState} should have pinned provenance`);
    }
  }
});

// -----------------------------------------------------------------------------
// Section 10: Google Import Redirect URL Resolution
// Validates redirect URL logic for import flow
// -----------------------------------------------------------------------------

test('Task 10.5: Google import redirect URL resolution', async () => {
  const {
    getImportResponseFixture,
    resolveGoogleImportRedirectURL,
  } = await import('../dist/esign/index.js');

  const routes = {
    documents: '/admin/esign/documents',
    agreements: '/admin/esign/agreements',
    fallback: '/admin/esign',
  };

  // Native success should redirect to agreement detail
  const successFixture = getImportResponseFixture('native_import_success');
  const successUrl = resolveGoogleImportRedirectURL(successFixture, routes);
  assert.ok(successUrl.includes('agreement'), 'success should redirect to agreement');

  // Duplicate import should redirect to document detail
  const duplicateFixture = getImportResponseFixture('duplicate_import');
  const duplicateUrl = resolveGoogleImportRedirectURL(duplicateFixture, routes);
  assert.ok(duplicateUrl.includes('document'), 'duplicate should redirect to document');

  // Failed import should use fallback
  const failedFixture = getImportResponseFixture('import_failure');
  const failedUrl = resolveGoogleImportRedirectURL(failedFixture, routes);
  assert.equal(failedUrl, routes.fallback, 'failed should use fallback');
});

// ============================================================================
// Task 10.6 - Runtime Wiring Verification
// Validates that example runtime is properly configured for Version 1 QA
// ============================================================================

test('Task 10.6: provenance card selectors match expected patterns', async () => {
  const {
    PROVENANCE_CARD_SELECTOR,
    EVIDENCE_TOGGLE_SELECTOR,
    EVIDENCE_CONTAINER_SELECTOR,
  } = await import('../dist/esign/index.js');

  assert.equal(PROVENANCE_CARD_SELECTOR, '[data-lineage-card]', 'card selector should match templates');
  assert.equal(EVIDENCE_TOGGLE_SELECTOR, '[data-evidence-toggle]', 'toggle selector should match templates');
  assert.equal(EVIDENCE_CONTAINER_SELECTOR, '[data-evidence-container]', 'container selector should match templates');
});

test('Task 10.6: provenance card config defaults are sensible', async () => {
  const { DEFAULT_PROVENANCE_CARD_CONFIG } = await import('../dist/esign/index.js');

  assert.equal(DEFAULT_PROVENANCE_CARD_CONFIG.enableEvidenceToggle, true, 'evidence toggle should be enabled by default');
  assert.equal(DEFAULT_PROVENANCE_CARD_CONFIG.enableFingerprintPolling, false, 'fingerprint polling should be disabled by default');
  assert.ok(DEFAULT_PROVENANCE_CARD_CONFIG.fingerprintPollInterval >= 1000, 'poll interval should be at least 1 second');
});

test('Task 10.6: all lineage fixture states are consistent across phases', async () => {
  const module = await import('../dist/esign/index.js');

  // Phase 2 document fixture states
  const documentStates = ['empty', 'native', 'repeated_import', 'candidate_warning', 'fingerprint_pending', 'fingerprint_failed'];
  for (const state of documentStates) {
    const fixture = module.getDocumentLineageFixture(state);
    assert.ok(fixture, `document fixture '${state}' should exist`);
    assert.ok(fixture.document_id, `document fixture '${state}' should have document_id`);
  }

  // Phase 2 agreement fixture states
  const agreementStates = ['empty', 'native', 'newer_source_exists', 'candidate_warning'];
  for (const state of agreementStates) {
    const fixture = module.getAgreementLineageFixture(state);
    assert.ok(fixture, `agreement fixture '${state}' should exist`);
    assert.ok(fixture.agreement_id, `agreement fixture '${state}' should have agreement_id`);
  }

  // Phase 3 import fixture states
  const importStates = module.getImportFixtureStates();
  assert.ok(importStates.includes('native_import_success'), 'should have native_import_success');
  assert.ok(importStates.includes('import_failure'), 'should have import_failure');

  // Phase 8 candidate warning fixture states
  const warningStates = module.getCandidateWarningFixtureStates();
  assert.ok(warningStates.includes('single_likely_continuity'), 'should have single_likely_continuity');
  assert.ok(warningStates.includes('previously_rejected'), 'should have previously_rejected');
  assert.ok(warningStates.includes('high_confidence_auto_linked'), 'should have high_confidence_auto_linked');
});

// ============================================================================
// Version 1 Exit Criteria Validation
// Validates all Version 1 exit criteria are testable from frontend
// ============================================================================

test('Task 10.5: Version 1 exit criteria - document lineage traceability', async () => {
  const {
    getDocumentLineageFixture,
    mapDocumentProvenance,
  } = await import('../dist/esign/index.js');

  const fixture = getDocumentLineageFixture('native');
  const provenance = mapDocumentProvenance(fixture);

  // Exit criteria: Every Google-imported PDF can be traced to source_document, source_revision, source_artifact
  assert.ok(provenance.source, 'should have source reference');
  assert.ok(provenance.revision, 'should have revision reference');
  assert.ok(provenance.artifact, 'should have artifact reference');
  assert.ok(provenance.source.id, 'source should have ID');
  assert.ok(provenance.revision.id, 'revision should have ID');
  assert.ok(provenance.artifact.id, 'artifact should have ID');
});

test('Task 10.5: Version 1 exit criteria - agreement pinned provenance', async () => {
  const {
    getAgreementLineageFixture,
    mapAgreementProvenance,
  } = await import('../dist/esign/index.js');

  const fixture = getAgreementLineageFixture('native');
  const provenance = mapAgreementProvenance(fixture);

  // Exit criteria: Agreements expose provenance through lineage-aware read models
  assert.ok(provenance.revision, 'agreement should have pinned revision');
  assert.ok(provenance.revision.id, 'pinned revision should have ID');
});

test('Task 10.5: Version 1 exit criteria - newer source visibility', async () => {
  const {
    getAgreementLineageFixture,
    mapAgreementProvenance,
  } = await import('../dist/esign/index.js');

  const fixture = getAgreementLineageFixture('newer_source_exists');
  const provenance = mapAgreementProvenance(fixture);

  // Exit criteria: Current detail pages surface newer-source visibility
  assert.equal(provenance.newerSourceExists, true, 'should flag newer source exists');
});

test('Task 10.5: Version 1 exit criteria - candidate warning visibility', async () => {
  const {
    getCandidateWarningFixture,
    mapDocumentProvenance,
    createDocumentDiagnosticViewModel,
  } = await import('../dist/esign/index.js');

  const fixture = getCandidateWarningFixture('single_likely_continuity');
  const provenance = mapDocumentProvenance(fixture);
  const diagnostic = createDocumentDiagnosticViewModel(provenance);

  // Exit criteria: Current detail pages surface candidate warnings
  assert.ok(provenance.hasCandidateWarnings, 'should have candidate warnings');
  assert.ok(provenance.primaryWarning, 'should have primary warning');
  assert.ok(diagnostic.warningCards.length > 0, 'should have warning cards for display');
});

test('Task 10.5: Version 1 exit criteria - fingerprint status visibility', async () => {
  const {
    getDocumentLineageFixture,
    mapDocumentProvenance,
    createFingerprintCard,
  } = await import('../dist/esign/index.js');

  const nativeFixture = getDocumentLineageFixture('native');
  const nativeProvenance = mapDocumentProvenance(nativeFixture);

  // Exit criteria: Fingerprints are visible through presentation-focused frontend work
  assert.ok(nativeProvenance.fingerprintStatus, 'should have fingerprint status');

  const fingerprintCard = createFingerprintCard(nativeProvenance.fingerprintStatus);
  assert.ok(fingerprintCard, 'should generate fingerprint card');
  assert.ok(fingerprintCard.ariaLabel, 'fingerprint card should be accessible');
});