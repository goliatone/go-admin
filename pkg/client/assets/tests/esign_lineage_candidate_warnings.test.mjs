/**
 * Phase 8 Lineage Candidate Warning Tests
 *
 * Rendering specs and tests for operator-facing warning banners and evidence
 * summaries that remain read-only in Version 1.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 8 Tasks 8.9-8.10
 */

import test from 'node:test';
import assert from 'node:assert/strict';

const {
  // Candidate relationship constants (Task 8.9)
  CANDIDATE_RELATIONSHIP_STATUS,
  CANDIDATE_RELATIONSHIP_TYPE,
  CONFIDENCE_BAND,
  isValidCandidateRelationshipStatus,
  // Candidate warning fixtures (Task 8.9)
  candidateWarningFixtures,
  agreementCandidateWarningFixtures,
  getCandidateWarningFixture,
  getAgreementCandidateWarningFixture,
  getCandidateWarningFixtureStates,
  isCandidateActionable,
  isCandidateResolved,
  getPrimaryCandidateWarning,
  countCandidatesByStatus,
  validateCandidateWarningFixture,
  // Presentation mappers
  mapDocumentProvenance,
  mapAgreementProvenance,
  validateDocumentProvenanceViewModel,
  validateAgreementProvenanceViewModel,
  // Diagnostic view model builders
  createDocumentDiagnosticViewModel,
  createAgreementDiagnosticViewModel,
  createWarningCard,
  createWarningCards,
  validateDocumentDiagnosticViewModel,
  validateAgreementDiagnosticViewModel,
  isDiagnosticCandidateWarning,
  getPrimaryWarningCard,
  hasDiagnosticActionableWarnings,
  // Warning severity helpers
  getWarningSeverityClass,
  getWarningSeverityIcon,
} = await import('../dist/esign/index.js');

// ============================================================================
// Task 8.9 - Candidate Relationship Status Constants Tests
// ============================================================================

test('CANDIDATE_RELATIONSHIP_STATUS contains all expected status values', () => {
  assert.equal(CANDIDATE_RELATIONSHIP_STATUS.PENDING_REVIEW, 'pending_review');
  assert.equal(CANDIDATE_RELATIONSHIP_STATUS.CONFIRMED, 'confirmed');
  assert.equal(CANDIDATE_RELATIONSHIP_STATUS.REJECTED, 'rejected');
  assert.equal(CANDIDATE_RELATIONSHIP_STATUS.SUPERSEDED, 'superseded');
  assert.equal(CANDIDATE_RELATIONSHIP_STATUS.AUTO_LINKED, 'auto_linked');
});

test('CANDIDATE_RELATIONSHIP_TYPE contains all expected type values', () => {
  assert.equal(CANDIDATE_RELATIONSHIP_TYPE.COPIED_FROM, 'copied_from');
  assert.equal(CANDIDATE_RELATIONSHIP_TYPE.PREDECESSOR_OF, 'predecessor_of');
  assert.equal(CANDIDATE_RELATIONSHIP_TYPE.SUCCESSOR_OF, 'successor_of');
  assert.equal(CANDIDATE_RELATIONSHIP_TYPE.MIGRATED_FROM, 'migrated_from');
  assert.equal(CANDIDATE_RELATIONSHIP_TYPE.EXACT_DUPLICATE, 'exact_duplicate');
});

test('CONFIDENCE_BAND contains all expected band values', () => {
  assert.equal(CONFIDENCE_BAND.HIGH, 'high');
  assert.equal(CONFIDENCE_BAND.MEDIUM, 'medium');
  assert.equal(CONFIDENCE_BAND.LOW, 'low');
  assert.equal(CONFIDENCE_BAND.EXACT, 'exact');
});

test('isValidCandidateRelationshipStatus returns true for valid statuses', () => {
  assert.equal(isValidCandidateRelationshipStatus('pending_review'), true);
  assert.equal(isValidCandidateRelationshipStatus('confirmed'), true);
  assert.equal(isValidCandidateRelationshipStatus('rejected'), true);
  assert.equal(isValidCandidateRelationshipStatus('superseded'), true);
  assert.equal(isValidCandidateRelationshipStatus('auto_linked'), true);
});

test('isValidCandidateRelationshipStatus returns false for invalid statuses', () => {
  assert.equal(isValidCandidateRelationshipStatus('invalid'), false);
  assert.equal(isValidCandidateRelationshipStatus(''), false);
  assert.equal(isValidCandidateRelationshipStatus('pending'), false);
});

// ============================================================================
// Task 8.9 - Candidate Warning Fixture Existence Tests
// ============================================================================

test('candidateWarningFixtures includes all expected states', () => {
  assert.ok(candidateWarningFixtures.single_likely_continuity, 'should have single_likely_continuity');
  assert.ok(candidateWarningFixtures.multiple_ambiguous_candidates, 'should have multiple_ambiguous_candidates');
  assert.ok(candidateWarningFixtures.previously_rejected, 'should have previously_rejected');
  assert.ok(candidateWarningFixtures.superseded_candidate, 'should have superseded_candidate');
  assert.ok(candidateWarningFixtures.high_confidence_auto_linked, 'should have high_confidence_auto_linked');
  assert.ok(candidateWarningFixtures.cross_account_migration, 'should have cross_account_migration');
});

test('agreementCandidateWarningFixtures includes expected states', () => {
  assert.ok(agreementCandidateWarningFixtures.single_likely_continuity, 'should have single_likely_continuity');
  assert.ok(agreementCandidateWarningFixtures.multiple_ambiguous_candidates, 'should have multiple_ambiguous_candidates');
  assert.ok(agreementCandidateWarningFixtures.previously_rejected, 'should have previously_rejected');
});

test('getCandidateWarningFixtureStates returns all state names', () => {
  const states = getCandidateWarningFixtureStates();
  assert.ok(Array.isArray(states));
  assert.ok(states.includes('single_likely_continuity'));
  assert.ok(states.includes('multiple_ambiguous_candidates'));
  assert.ok(states.includes('previously_rejected'));
  assert.ok(states.includes('superseded_candidate'));
  assert.ok(states.includes('high_confidence_auto_linked'));
  assert.ok(states.includes('cross_account_migration'));
});

// ============================================================================
// Task 8.9 - Single Likely Continuity Match Tests
// ============================================================================

test('single_likely_continuity fixture has correct structure', () => {
  const fixture = getCandidateWarningFixture('single_likely_continuity');

  assert.ok(fixture.document_id, 'should have document_id');
  assert.ok(fixture.candidate_warning_summary, 'should have candidate_warning_summary');
  assert.equal(fixture.candidate_warning_summary.length, 1, 'should have exactly one candidate');

  const warning = fixture.candidate_warning_summary[0];
  assert.equal(warning.status, 'pending_review', 'status should be pending_review');
  assert.equal(warning.confidence_band, 'high', 'confidence should be high');
  assert.ok(warning.confidence_score >= 0.9, 'confidence score should be high');
  assert.ok(warning.evidence.length > 0, 'should have evidence');
});

test('single_likely_continuity produces valid provenance view model', () => {
  const fixture = getCandidateWarningFixture('single_likely_continuity');
  const vm = mapDocumentProvenance(fixture);

  const errors = validateDocumentProvenanceViewModel(vm);
  assert.deepEqual(errors, [], 'should produce valid view model');

  assert.equal(vm.hasCandidateWarnings, true, 'should have candidate warnings');
  assert.ok(vm.primaryWarning, 'should have primary warning');
  assert.equal(vm.primaryWarning.severity, 'warning', 'primary warning severity should be warning');
});

// ============================================================================
// Task 8.9 - Multiple Ambiguous Candidates Tests
// ============================================================================

test('multiple_ambiguous_candidates fixture has multiple warnings', () => {
  const fixture = getCandidateWarningFixture('multiple_ambiguous_candidates');

  assert.ok(fixture.candidate_warning_summary.length >= 2, 'should have at least 2 candidates');

  for (const warning of fixture.candidate_warning_summary) {
    assert.equal(warning.status, 'pending_review', 'all should be pending_review');
    assert.equal(warning.confidence_band, 'medium', 'all should be medium confidence');
  }
});

test('multiple_ambiguous_candidates produces presentation warning with candidate count', () => {
  const fixture = getCandidateWarningFixture('multiple_ambiguous_candidates');
  const vm = mapDocumentProvenance(fixture);

  assert.equal(vm.hasCandidateWarnings, true);
  assert.ok(vm.primaryWarning, 'should have primary warning');
  assert.ok(
    vm.primaryWarning.description.includes('Multiple') ||
    vm.primaryWarning.title.includes('Multiple'),
    'warning should mention multiple candidates'
  );
});

// ============================================================================
// Task 8.9 - Previously Rejected Candidate Tests
// ============================================================================

test('previously_rejected fixture has rejected status', () => {
  const fixture = getCandidateWarningFixture('previously_rejected');

  assert.equal(fixture.candidate_warning_summary.length, 1);
  const warning = fixture.candidate_warning_summary[0];
  assert.equal(warning.status, 'rejected', 'status should be rejected');
  assert.equal(warning.review_action_visible, 'none', 'no action should be visible for rejected');
});

test('previously_rejected has info severity (read-only)', () => {
  const fixture = getCandidateWarningFixture('previously_rejected');

  assert.ok(fixture.presentation_warnings.length > 0);
  const presentationWarning = fixture.presentation_warnings[0];
  assert.equal(presentationWarning.severity, 'info', 'rejected should have info severity');
});

test('isCandidateResolved returns true for rejected status', () => {
  const fixture = getCandidateWarningFixture('previously_rejected');
  const warning = fixture.candidate_warning_summary[0];

  assert.equal(isCandidateResolved(warning), true);
  assert.equal(isCandidateActionable(warning), false);
});

// ============================================================================
// Task 8.9 - Superseded Candidate Tests
// ============================================================================

test('superseded_candidate fixture has superseded status', () => {
  const fixture = getCandidateWarningFixture('superseded_candidate');

  assert.equal(fixture.candidate_warning_summary.length, 1);
  const warning = fixture.candidate_warning_summary[0];
  assert.equal(warning.status, 'superseded', 'status should be superseded');
});

test('superseded_candidate has info severity (read-only, historical)', () => {
  const fixture = getCandidateWarningFixture('superseded_candidate');

  assert.ok(fixture.presentation_warnings.length > 0);
  const presentationWarning = fixture.presentation_warnings[0];
  assert.equal(presentationWarning.severity, 'info', 'superseded should have info severity');
});

test('isCandidateResolved returns true for superseded status', () => {
  const fixture = getCandidateWarningFixture('superseded_candidate');
  const warning = fixture.candidate_warning_summary[0];

  assert.equal(isCandidateResolved(warning), true);
  assert.equal(isCandidateActionable(warning), false);
});

// ============================================================================
// Task 8.9 - Auto-Linked Exact Match Tests
// ============================================================================

test('high_confidence_auto_linked fixture has auto_linked status', () => {
  const fixture = getCandidateWarningFixture('high_confidence_auto_linked');

  assert.equal(fixture.candidate_warning_summary.length, 1);
  const warning = fixture.candidate_warning_summary[0];
  assert.equal(warning.status, 'auto_linked', 'status should be auto_linked');
  assert.equal(warning.confidence_band, 'exact', 'confidence should be exact');
  assert.equal(warning.confidence_score, 1.0, 'confidence score should be 1.0');
});

test('high_confidence_auto_linked has exact artifact match evidence', () => {
  const fixture = getCandidateWarningFixture('high_confidence_auto_linked');
  const warning = fixture.candidate_warning_summary[0];

  const hasExactMatch = warning.evidence.some(e => e.code === 'exact_artifact_match');
  assert.ok(hasExactMatch, 'should have exact_artifact_match evidence');
});

test('isCandidateResolved returns true for auto_linked status', () => {
  const fixture = getCandidateWarningFixture('high_confidence_auto_linked');
  const warning = fixture.candidate_warning_summary[0];

  assert.equal(isCandidateResolved(warning), true);
  assert.equal(isCandidateActionable(warning), false);
});

// ============================================================================
// Task 8.9 - Cross-Account Migration Tests
// ============================================================================

test('cross_account_migration fixture has correct structure', () => {
  const fixture = getCandidateWarningFixture('cross_account_migration');

  assert.equal(fixture.candidate_warning_summary.length, 1);
  const warning = fixture.candidate_warning_summary[0];
  assert.equal(warning.relationship_type, 'migrated_from', 'type should be migrated_from');
  assert.equal(warning.status, 'pending_review', 'status should be pending_review');
  assert.equal(warning.confidence_band, 'high', 'confidence should be high');
});

test('cross_account_migration has URL history evidence', () => {
  const fixture = getCandidateWarningFixture('cross_account_migration');
  const warning = fixture.candidate_warning_summary[0];

  const hasURLHistory = warning.evidence.some(e => e.code === 'url_history');
  assert.ok(hasURLHistory, 'should have url_history evidence');
});

// ============================================================================
// Task 8.9 - Candidate Helper Functions Tests
// ============================================================================

test('isCandidateActionable correctly identifies actionable candidates', () => {
  const pendingReview = { status: 'pending_review', id: '1', relationship_type: 'copied_from', confidence_band: 'high', summary: '', evidence: [] };
  const confirmed = { status: 'confirmed', id: '2', relationship_type: 'copied_from', confidence_band: 'high', summary: '', evidence: [] };
  const rejected = { status: 'rejected', id: '3', relationship_type: 'copied_from', confidence_band: 'high', summary: '', evidence: [] };

  assert.equal(isCandidateActionable(pendingReview), true);
  assert.equal(isCandidateActionable(confirmed), false);
  assert.equal(isCandidateActionable(rejected), false);
});

test('isCandidateResolved correctly identifies resolved candidates', () => {
  const pendingReview = { status: 'pending_review', id: '1', relationship_type: 'copied_from', confidence_band: 'high', summary: '', evidence: [] };
  const confirmed = { status: 'confirmed', id: '2', relationship_type: 'copied_from', confidence_band: 'high', summary: '', evidence: [] };
  const rejected = { status: 'rejected', id: '3', relationship_type: 'copied_from', confidence_band: 'high', summary: '', evidence: [] };
  const superseded = { status: 'superseded', id: '4', relationship_type: 'copied_from', confidence_band: 'high', summary: '', evidence: [] };
  const autoLinked = { status: 'auto_linked', id: '5', relationship_type: 'copied_from', confidence_band: 'exact', summary: '', evidence: [] };

  assert.equal(isCandidateResolved(pendingReview), false);
  assert.equal(isCandidateResolved(confirmed), true);
  assert.equal(isCandidateResolved(rejected), true);
  assert.equal(isCandidateResolved(superseded), true);
  assert.equal(isCandidateResolved(autoLinked), true);
});

test('getPrimaryCandidateWarning returns pending_review first', () => {
  const warnings = [
    { status: 'rejected', id: '1', relationship_type: 'copied_from', confidence_band: 'high', confidence_score: 0.9, summary: '', evidence: [] },
    { status: 'pending_review', id: '2', relationship_type: 'copied_from', confidence_band: 'medium', confidence_score: 0.7, summary: '', evidence: [] },
    { status: 'superseded', id: '3', relationship_type: 'copied_from', confidence_band: 'high', confidence_score: 0.95, summary: '', evidence: [] },
  ];

  const primary = getPrimaryCandidateWarning(warnings);
  assert.equal(primary.status, 'pending_review', 'pending_review should have highest priority');
});

test('getPrimaryCandidateWarning sorts by confidence when status is equal', () => {
  const warnings = [
    { status: 'pending_review', id: '1', relationship_type: 'copied_from', confidence_band: 'medium', confidence_score: 0.7, summary: '', evidence: [] },
    { status: 'pending_review', id: '2', relationship_type: 'copied_from', confidence_band: 'high', confidence_score: 0.95, summary: '', evidence: [] },
  ];

  const primary = getPrimaryCandidateWarning(warnings);
  assert.equal(primary.confidence_score, 0.95, 'higher confidence should win when status is equal');
});

test('countCandidatesByStatus returns correct counts', () => {
  const fixture = getCandidateWarningFixture('multiple_ambiguous_candidates');
  const counts = countCandidatesByStatus(fixture.candidate_warning_summary);

  assert.ok(counts.pending_review >= 2, 'should have at least 2 pending_review');
});

// ============================================================================
// Task 8.9 - Fixture Validation Tests
// ============================================================================

test('all candidate warning fixtures pass validation', () => {
  const states = getCandidateWarningFixtureStates();

  for (const state of states) {
    const fixture = getCandidateWarningFixture(state);
    const errors = validateCandidateWarningFixture(fixture);
    assert.deepEqual(errors, [], `${state} fixture should pass validation`);
  }
});

// ============================================================================
// Task 8.10 - Warning Banner Rendering Tests
// ============================================================================

test('candidate warning produces diagnostic view model with warning state', () => {
  const fixture = getCandidateWarningFixture('single_likely_continuity');
  const provenance = mapDocumentProvenance(fixture);
  const diagnostic = createDocumentDiagnosticViewModel(provenance);

  const errors = validateDocumentDiagnosticViewModel(diagnostic);
  assert.deepEqual(errors, [], 'should produce valid diagnostic view model');

  assert.equal(isDiagnosticCandidateWarning(diagnostic), true);
  assert.equal(diagnostic.displayConfig.state, 'candidate_warning');
});

test('warning banner has correct CSS class for severity', () => {
  const fixture = getCandidateWarningFixture('single_likely_continuity');
  const provenance = mapDocumentProvenance(fixture);
  const diagnostic = createDocumentDiagnosticViewModel(provenance);

  assert.ok(
    diagnostic.displayConfig.cssClass.includes('candidate-warning'),
    'should have candidate-warning CSS class'
  );
});

test('warning banner shows diagnostics link when available', () => {
  const fixture = getCandidateWarningFixture('single_likely_continuity');
  const provenance = mapDocumentProvenance(fixture);
  const diagnostic = createDocumentDiagnosticViewModel(provenance);

  assert.equal(diagnostic.displayConfig.showDiagnosticsLink, true);
  assert.ok(diagnostic.displayConfig.diagnosticsUrl, 'should have diagnostics URL');
});

test('warning banner has accessible aria label', () => {
  const fixture = getCandidateWarningFixture('single_likely_continuity');
  const provenance = mapDocumentProvenance(fixture);
  const diagnostic = createDocumentDiagnosticViewModel(provenance);

  assert.ok(diagnostic.displayConfig.ariaLabel, 'should have aria label');
  assert.ok(
    diagnostic.displayConfig.ariaLabel.includes('warning') ||
    diagnostic.displayConfig.ariaLabel.includes('Warning'),
    'aria label should mention warning'
  );
});

// ============================================================================
// Task 8.10 - Evidence Summary Rendering Tests
// ============================================================================

test('warning card includes evidence summaries', () => {
  const fixture = getCandidateWarningFixture('single_likely_continuity');
  const provenance = mapDocumentProvenance(fixture);

  const warningCards = createWarningCards(provenance.warnings);
  assert.ok(warningCards.length > 0, 'should have warning cards');

  const primaryCard = warningCards[0];
  assert.ok(primaryCard.evidence, 'card should have evidence');
  assert.ok(primaryCard.evidence.length > 0, 'evidence should not be empty');
});

test('evidence summaries have required fields', () => {
  const fixture = getCandidateWarningFixture('single_likely_continuity');
  const provenance = mapDocumentProvenance(fixture);
  const warningCards = createWarningCards(provenance.warnings);

  for (const card of warningCards) {
    for (const evidence of card.evidence) {
      assert.ok(evidence.label, 'evidence should have label');
      // details is optional
    }
  }
});

test('evidence summaries include similarity scores when available', () => {
  const fixture = getCandidateWarningFixture('single_likely_continuity');
  const warning = fixture.candidate_warning_summary[0];

  const textMatchEvidence = warning.evidence.find(e => e.code === 'normalized_text_match');
  assert.ok(textMatchEvidence, 'should have text match evidence');
  assert.ok(textMatchEvidence.details, 'text match should have details');
  assert.ok(textMatchEvidence.details.includes('similarity'), 'details should mention similarity');
});

// ============================================================================
// Task 8.10 - Warning Severity Class Tests
// ============================================================================

test('getWarningSeverityClass returns correct classes', () => {
  assert.equal(getWarningSeverityClass('critical'), 'warning-critical');
  assert.equal(getWarningSeverityClass('warning'), 'warning-medium');
  assert.equal(getWarningSeverityClass('info'), 'warning-info');
  assert.equal(getWarningSeverityClass('none'), '');
});

test('getWarningSeverityIcon returns correct icons', () => {
  assert.equal(getWarningSeverityIcon('critical'), 'exclamation-triangle');
  assert.equal(getWarningSeverityIcon('warning'), 'exclamation-circle');
  assert.equal(getWarningSeverityIcon('info'), 'info-circle');
  assert.equal(getWarningSeverityIcon('none'), '');
});

// ============================================================================
// Task 8.10 - Read-Only Warning Tests (Version 1 Constraint)
// ============================================================================

test('pending_review warnings are read-only in V1 (admin_debug_only visibility)', () => {
  const fixture = getCandidateWarningFixture('single_likely_continuity');
  const warning = fixture.candidate_warning_summary[0];

  // In Version 1, review actions are admin_debug_only
  assert.equal(warning.review_action_visible, 'admin_debug_only',
    'pending_review should have admin_debug_only visibility in V1');
});

test('rejected warnings have no action visibility', () => {
  const fixture = getCandidateWarningFixture('previously_rejected');
  const warning = fixture.candidate_warning_summary[0];

  assert.equal(warning.review_action_visible, 'none',
    'rejected should have no action visibility');
});

test('superseded warnings have no action visibility', () => {
  const fixture = getCandidateWarningFixture('superseded_candidate');
  const warning = fixture.candidate_warning_summary[0];

  assert.equal(warning.review_action_visible, 'none',
    'superseded should have no action visibility');
});

test('auto_linked warnings have no action visibility', () => {
  const fixture = getCandidateWarningFixture('high_confidence_auto_linked');
  const warning = fixture.candidate_warning_summary[0];

  assert.equal(warning.review_action_visible, 'none',
    'auto_linked should have no action visibility');
});

// ============================================================================
// Task 8.10 - Agreement Candidate Warning Tests
// ============================================================================

test('agreement single_likely_continuity produces valid view model', () => {
  const fixture = getAgreementCandidateWarningFixture('single_likely_continuity');
  const vm = mapAgreementProvenance(fixture);

  const errors = validateAgreementProvenanceViewModel(vm);
  assert.deepEqual(errors, [], 'should produce valid view model');

  assert.equal(vm.hasCandidateWarnings, true);
});

test('agreement multiple_ambiguous_candidates produces valid view model', () => {
  const fixture = getAgreementCandidateWarningFixture('multiple_ambiguous_candidates');
  const vm = mapAgreementProvenance(fixture);

  const errors = validateAgreementProvenanceViewModel(vm);
  assert.deepEqual(errors, [], 'should produce valid view model');

  assert.ok(vm.warnings.length > 0, 'should have warnings');
});

test('agreement previously_rejected produces valid diagnostic view model', () => {
  const fixture = getAgreementCandidateWarningFixture('previously_rejected');
  const provenance = mapAgreementProvenance(fixture);
  const diagnostic = createAgreementDiagnosticViewModel(provenance);

  const errors = validateAgreementDiagnosticViewModel(diagnostic);
  assert.deepEqual(errors, [], 'should produce valid diagnostic view model');
});

// ============================================================================
// Task 8.10 - Complete Coverage Tests
// ============================================================================

test('all candidate warning fixtures produce valid provenance view models', () => {
  const states = getCandidateWarningFixtureStates();

  for (const state of states) {
    const fixture = getCandidateWarningFixture(state);
    const vm = mapDocumentProvenance(fixture);
    const errors = validateDocumentProvenanceViewModel(vm);

    assert.deepEqual(errors, [], `${state} should produce valid provenance view model`);
    assert.ok(vm.hasCandidateWarnings || vm.warnings.length > 0,
      `${state} should have warnings`);
  }
});

test('all candidate warning fixtures produce valid diagnostic view models', () => {
  const states = getCandidateWarningFixtureStates();

  for (const state of states) {
    const fixture = getCandidateWarningFixture(state);
    const provenance = mapDocumentProvenance(fixture);
    const diagnostic = createDocumentDiagnosticViewModel(provenance);
    const errors = validateDocumentDiagnosticViewModel(diagnostic);

    assert.deepEqual(errors, [], `${state} should produce valid diagnostic view model`);
    assert.ok(diagnostic.warningCards.length > 0, `${state} should have warning cards`);
    assert.ok(diagnostic.displayConfig.cssClass, `${state} should have CSS class`);
    assert.ok(diagnostic.displayConfig.ariaLabel, `${state} should have aria label`);
  }
});

test('hasDiagnosticActionableWarnings identifies actionable states', () => {
  // Pending review should be actionable
  const pending = getCandidateWarningFixture('single_likely_continuity');
  const pendingProvenance = mapDocumentProvenance(pending);
  const pendingDiagnostic = createDocumentDiagnosticViewModel(pendingProvenance);
  assert.equal(hasDiagnosticActionableWarnings(pendingDiagnostic), true,
    'pending_review should be actionable');

  // Rejected should not be actionable (info severity)
  const rejected = getCandidateWarningFixture('previously_rejected');
  const rejectedProvenance = mapDocumentProvenance(rejected);
  const rejectedDiagnostic = createDocumentDiagnosticViewModel(rejectedProvenance);
  assert.equal(hasDiagnosticActionableWarnings(rejectedDiagnostic), false,
    'rejected should not be actionable');
});

test('getPrimaryWarningCard returns correct card', () => {
  const fixture = getCandidateWarningFixture('multiple_ambiguous_candidates');
  const provenance = mapDocumentProvenance(fixture);
  const diagnostic = createDocumentDiagnosticViewModel(provenance);

  const primaryCard = getPrimaryWarningCard(diagnostic);
  assert.ok(primaryCard, 'should have primary card');
  assert.ok(primaryCard.id, 'primary card should have id');
  assert.ok(primaryCard.title, 'primary card should have title');
});
