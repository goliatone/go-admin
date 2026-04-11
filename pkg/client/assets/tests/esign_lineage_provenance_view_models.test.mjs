/**
 * Phase 5 Lineage Contract Tests
 *
 * Tests for shared presentation mappers that normalize native-lineage,
 * repeated-import, and no-lineage detail payloads into the same rendering model.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 5 Tasks 5.6-5.7
 */

import test from 'node:test';
import assert from 'node:assert/strict';

const {
  // Phase 5 Task 5.6 - Presentation mappers
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
  // Fixture data for testing
  documentLineageFixtures,
  agreementLineageFixtures,
  getDocumentLineageFixture,
  getAgreementLineageFixture,
} = await import('../dist/esign/index.js');

// ============================================================================
// Task 5.7 - Document Provenance Mapper Tests
// Native-lineage, repeated-import, and no-lineage payloads normalize to same model
// ============================================================================

test('mapDocumentProvenance normalizes empty (no-lineage) document to valid view model', () => {
  const empty = getDocumentLineageFixture('empty');
  const vm = mapDocumentProvenance(empty);

  // Validate structure
  const errors = validateDocumentProvenanceViewModel(vm);
  assert.deepEqual(errors, [], 'Empty document view model should pass validation');

  // Check status and flags
  assert.equal(vm.status, 'empty', 'Empty document should have empty status');
  assert.equal(vm.sourceType, 'upload', 'Empty document should be upload type');
  assert.equal(vm.hasLineage, false, 'Empty document should have no lineage');
  assert.equal(vm.hasGoogleSource, false, 'Empty document should have no Google source');
  assert.equal(vm.hasArtifact, false, 'Empty document should have no artifact');

  // Check nulls
  assert.equal(vm.source, null, 'Empty document should have null source');
  assert.equal(vm.revision, null, 'Empty document should have null revision');
  assert.equal(vm.artifact, null, 'Empty document should have null artifact');
  assert.equal(vm.googleSource, null, 'Empty document should have null Google source');

  // Check empty state
  assert.equal(vm.emptyState.showPlaceholder, true, 'Empty document should show placeholder');
  assert.equal(vm.emptyState.kind, 'no_source', 'Empty document should preserve canonical empty-state kind');
  assert.equal(vm.showDiagnosticsLink, true, 'Empty document should preserve backend diagnostics link');
  assert.ok(vm.diagnosticsUrl?.includes(empty.document_id), 'Diagnostics URL should match the empty document');
});

test('mapDocumentProvenance normalizes native-lineage document to valid view model', () => {
  const native = getDocumentLineageFixture('native');
  const vm = mapDocumentProvenance(native);

  // Validate structure
  const errors = validateDocumentProvenanceViewModel(vm);
  assert.deepEqual(errors, [], 'Native document view model should pass validation');

  // Check status and flags
  assert.equal(vm.status, 'native', 'Native document should have native status');
  assert.equal(vm.sourceType, 'google_drive', 'Native document should be google_drive type');
  assert.equal(vm.hasLineage, true, 'Native document should have lineage');
  assert.equal(vm.hasGoogleSource, true, 'Native document should have Google source');
  assert.equal(vm.hasArtifact, true, 'Native document should have artifact');
  assert.equal(vm.hasFingerprint, true, 'Native document should have fingerprint');

  // Check normalized data
  assert.ok(vm.source, 'Native document should have source');
  assert.ok(vm.source.id, 'Source should have id');
  assert.ok(vm.source.label, 'Source should have label');
  assert.equal(vm.source.provider, 'google_drive', 'Source provider should be google_drive');

  assert.ok(vm.revision, 'Native document should have revision');
  assert.ok(vm.revision.id, 'Revision should have id');

  assert.ok(vm.artifact, 'Native document should have artifact');
  assert.ok(vm.artifact.id, 'Artifact should have id');
  assert.ok(vm.artifact.kind, 'Artifact should have kind');

  assert.ok(vm.googleSource, 'Native document should have Google source');
  assert.ok(vm.googleSource.fileId, 'Google source should have fileId');
  assert.ok(vm.googleSource.webUrl, 'Google source should have webUrl');

  // Check empty state
  assert.equal(vm.emptyState.showPlaceholder, false, 'Native document should not show placeholder');
});

test('mapDocumentProvenance normalizes repeated-import document to valid view model', () => {
  const repeated = getDocumentLineageFixture('repeated_import');
  const vm = mapDocumentProvenance(repeated);

  // Validate structure
  const errors = validateDocumentProvenanceViewModel(vm);
  assert.deepEqual(errors, [], 'Repeated import view model should pass validation');

  // Check status and flags
  assert.equal(vm.status, 'native', 'Repeated import should have native status');
  assert.equal(vm.sourceType, 'google_drive', 'Repeated import should be google_drive type');
  assert.equal(vm.hasLineage, true, 'Repeated import should have lineage');

  // Repeated import should have a different revision than native
  const native = getDocumentLineageFixture('native');
  const nativeVm = mapDocumentProvenance(native);

  assert.notEqual(
    vm.revision?.id,
    nativeVm.revision?.id,
    'Repeated import should have different revision than native'
  );
});

test('mapDocumentProvenance normalizes candidate-warning document to valid view model', () => {
  const candidateWarning = getDocumentLineageFixture('candidate_warning');
  const vm = mapDocumentProvenance(candidateWarning);

  // Validate structure
  const errors = validateDocumentProvenanceViewModel(vm);
  assert.deepEqual(errors, [], 'Candidate warning view model should pass validation');

  // Check warnings
  assert.equal(vm.hasCandidateWarnings, true, 'Should have candidate warnings');
  assert.ok(vm.warnings.length > 0, 'Should have warnings array populated');
  assert.ok(vm.primaryWarning, 'Should have primary warning');

  // Check warning structure
  const warning = vm.warnings[0];
  assert.ok(warning.id, 'Warning should have id');
  assert.ok(warning.type, 'Warning should have type');
  assert.ok(warning.severity, 'Warning should have severity');
  assert.ok(warning.title, 'Warning should have title');
  assert.equal(warning.actionLabel, 'Review in diagnostics');
  assert.equal(warning.actionUrl, '/admin/debug/lineage/documents/doc-fixture-candidate');
  assert.equal(warning.reviewActionVisibility, 'admin_debug_only');
});

test('mapDocumentProvenance normalizes fingerprint-pending document to valid view model', () => {
  const fpPending = getDocumentLineageFixture('fingerprint_pending');
  const vm = mapDocumentProvenance(fpPending);

  // Validate structure
  const errors = validateDocumentProvenanceViewModel(vm);
  assert.deepEqual(errors, [], 'Fingerprint pending view model should pass validation');

  // Check fingerprint status
  assert.equal(vm.fingerprintStatus.isPending, true, 'Fingerprint should be pending');
  assert.equal(vm.fingerprintStatus.isReady, false, 'Fingerprint should not be ready');
  assert.equal(vm.fingerprintStatus.status, 'pending', 'Status should be pending');

  // Should have fingerprint pending warning
  const fpWarning = vm.warnings.find((w) => w.type === 'fingerprint_pending');
  assert.ok(fpWarning, 'Should have fingerprint pending warning');
});

// ============================================================================
// Task 5.7 - Agreement Provenance Mapper Tests
// Native-lineage, empty, and newer-source-exists payloads normalize to same model
// ============================================================================

test('mapAgreementProvenance normalizes empty (no-lineage) agreement to valid view model', () => {
  const empty = getAgreementLineageFixture('empty');
  const vm = mapAgreementProvenance(empty);

  // Validate structure
  const errors = validateAgreementProvenanceViewModel(vm);
  assert.deepEqual(errors, [], 'Empty agreement view model should pass validation');

  // Check status and flags
  assert.equal(vm.status, 'empty', 'Empty agreement should have empty status');
  assert.equal(vm.hasLineage, false, 'Empty agreement should have no lineage');
  assert.equal(vm.hasGoogleSource, false, 'Empty agreement should have no Google source');
  assert.equal(vm.newerSourceExists, false, 'Empty agreement should not have newer source');

  // Check nulls
  assert.equal(vm.revision, null, 'Empty agreement should have null revision');
  assert.equal(vm.artifact, null, 'Empty agreement should have null artifact');
  assert.equal(vm.googleSource, null, 'Empty agreement should have null Google source');

  // Check empty state
  assert.equal(vm.emptyState.showPlaceholder, true, 'Empty agreement should show placeholder');
  assert.equal(vm.emptyState.kind, 'no_source', 'Empty agreement should preserve canonical empty-state kind');
  assert.equal(vm.showDiagnosticsLink, true, 'Empty agreement should preserve backend diagnostics link');
  assert.ok(vm.diagnosticsUrl?.includes(empty.agreement_id), 'Diagnostics URL should match the empty agreement');
});

test('mapAgreementProvenance normalizes native-lineage agreement to valid view model', () => {
  const native = getAgreementLineageFixture('native');
  const vm = mapAgreementProvenance(native);

  // Validate structure
  const errors = validateAgreementProvenanceViewModel(vm);
  assert.deepEqual(errors, [], 'Native agreement view model should pass validation');

  // Check status and flags
  assert.equal(vm.status, 'native', 'Native agreement should have native status');
  assert.equal(vm.sourceType, 'google_drive', 'Native agreement should be google_drive type');
  assert.equal(vm.hasLineage, true, 'Native agreement should have lineage');
  assert.equal(vm.hasGoogleSource, true, 'Native agreement should have Google source');
  assert.equal(vm.newerSourceExists, false, 'Native agreement should not have newer source');

  // Check normalized data
  assert.ok(vm.revision, 'Native agreement should have revision');
  assert.ok(vm.revision.id, 'Revision should have id');

  assert.ok(vm.artifact, 'Native agreement should have artifact');
  assert.ok(vm.artifact.id, 'Artifact should have id');

  assert.ok(vm.googleSource, 'Native agreement should have Google source');
  assert.ok(vm.googleSource.fileId, 'Google source should have fileId');

  // Check empty state
  assert.equal(vm.emptyState.showPlaceholder, false, 'Native agreement should not show placeholder');
});

test('mapAgreementProvenance normalizes newer-source-exists agreement to valid view model', () => {
  const newer = getAgreementLineageFixture('newer_source_exists');
  const vm = mapAgreementProvenance(newer);

  // Validate structure
  const errors = validateAgreementProvenanceViewModel(vm);
  assert.deepEqual(errors, [], 'Newer source exists view model should pass validation');

  // Check newer source flag
  assert.equal(vm.newerSourceExists, true, 'Should have newer source exists');

  // Should have newer source warning
  const newerWarning = vm.warnings.find((w) => w.type === 'newer_source_exists');
  assert.ok(newerWarning, 'Should have newer source exists warning');
  assert.equal(newerWarning.severity, 'info', 'Newer source warning should be info severity');
});

test('mapAgreementProvenance normalizes candidate-warning agreement to valid view model', () => {
  const candidateWarning = getAgreementLineageFixture('candidate_warning');
  const vm = mapAgreementProvenance(candidateWarning);

  // Validate structure
  const errors = validateAgreementProvenanceViewModel(vm);
  assert.deepEqual(errors, [], 'Candidate warning view model should pass validation');

  // Check warnings
  assert.equal(vm.hasCandidateWarnings, true, 'Should have candidate warnings');
  assert.ok(vm.warnings.length > 0, 'Should have warnings array populated');
  assert.ok(vm.primaryWarning, 'Should have primary warning');
  assert.equal(vm.primaryWarning?.actionLabel, 'Review in diagnostics');
  assert.equal(vm.primaryWarning?.actionUrl, '/admin/debug/lineage/agreements/agr-fixture-candidate');
});

// ============================================================================
// Task 5.7 - View Model Structure Consistency Tests
// All payloads normalize to the same rendering model structure
// ============================================================================

test('all document fixtures normalize to same view model structure', () => {
  const fixtures = ['empty', 'native', 'repeated_import', 'candidate_warning', 'fingerprint_pending'];

  for (const state of fixtures) {
    const detail = getDocumentLineageFixture(state);
    const vm = mapDocumentProvenance(detail);

    // All should pass validation (have same structure)
    const errors = validateDocumentProvenanceViewModel(vm);
    assert.deepEqual(errors, [], `${state} should normalize to valid view model structure`);

    // All should have required fields
    assert.ok(typeof vm.documentId === 'string', `${state} should have documentId`);
    assert.ok(typeof vm.status === 'string', `${state} should have status`);
    assert.ok(typeof vm.sourceType === 'string', `${state} should have sourceType`);
    assert.ok(typeof vm.hasLineage === 'boolean', `${state} should have hasLineage`);
    assert.ok(typeof vm.hasGoogleSource === 'boolean', `${state} should have hasGoogleSource`);
    assert.ok(typeof vm.hasArtifact === 'boolean', `${state} should have hasArtifact`);
    assert.ok(typeof vm.hasFingerprint === 'boolean', `${state} should have hasFingerprint`);
    assert.ok(typeof vm.hasCandidateWarnings === 'boolean', `${state} should have hasCandidateWarnings`);
    assert.ok(Array.isArray(vm.warnings), `${state} should have warnings array`);
    assert.ok(typeof vm.emptyState === 'object', `${state} should have emptyState`);
    assert.ok(typeof vm.fingerprintStatus === 'object', `${state} should have fingerprintStatus`);
  }
});

test('all agreement fixtures normalize to same view model structure', () => {
  const fixtures = ['empty', 'native', 'newer_source_exists', 'candidate_warning'];

  for (const state of fixtures) {
    const detail = getAgreementLineageFixture(state);
    const vm = mapAgreementProvenance(detail);

    // All should pass validation (have same structure)
    const errors = validateAgreementProvenanceViewModel(vm);
    assert.deepEqual(errors, [], `${state} should normalize to valid view model structure`);

    // All should have required fields
    assert.ok(typeof vm.agreementId === 'string', `${state} should have agreementId`);
    assert.ok(typeof vm.status === 'string', `${state} should have status`);
    assert.ok(typeof vm.sourceType === 'string', `${state} should have sourceType`);
    assert.ok(typeof vm.hasLineage === 'boolean', `${state} should have hasLineage`);
    assert.ok(typeof vm.hasGoogleSource === 'boolean', `${state} should have hasGoogleSource`);
    assert.ok(typeof vm.hasArtifact === 'boolean', `${state} should have hasArtifact`);
    assert.ok(typeof vm.hasCandidateWarnings === 'boolean', `${state} should have hasCandidateWarnings`);
    assert.ok(typeof vm.newerSourceExists === 'boolean', `${state} should have newerSourceExists`);
    assert.ok(Array.isArray(vm.warnings), `${state} should have warnings array`);
    assert.ok(typeof vm.emptyState === 'object', `${state} should have emptyState`);
  }
});

// ============================================================================
// Task 5.7 - Validation Function Tests
// ============================================================================

test('validateDocumentProvenanceViewModel returns errors for null input', () => {
  const errors = validateDocumentProvenanceViewModel(null);
  assert.ok(errors.includes('view model must be an object'));
});

test('validateDocumentProvenanceViewModel returns errors for missing fields', () => {
  const errors = validateDocumentProvenanceViewModel({});

  assert.ok(errors.includes('documentId must be a string'));
  assert.ok(errors.includes('status must be a string'));
  assert.ok(errors.includes('sourceType must be a string'));
  assert.ok(errors.includes('hasLineage must be a boolean'));
  assert.ok(errors.includes('fingerprintStatus must be an object'));
  assert.ok(errors.includes('emptyState must be an object'));
  assert.ok(errors.includes('warnings must be an array'));
});

test('validateAgreementProvenanceViewModel returns errors for null input', () => {
  const errors = validateAgreementProvenanceViewModel(null);
  assert.ok(errors.includes('view model must be an object'));
});

test('validateAgreementProvenanceViewModel returns errors for missing fields', () => {
  const errors = validateAgreementProvenanceViewModel({});

  assert.ok(errors.includes('agreementId must be a string'));
  assert.ok(errors.includes('status must be a string'));
  assert.ok(errors.includes('sourceType must be a string'));
  assert.ok(errors.includes('hasLineage must be a boolean'));
  assert.ok(errors.includes('newerSourceExists must be a boolean'));
  assert.ok(errors.includes('emptyState must be an object'));
  assert.ok(errors.includes('warnings must be an array'));
});

// ============================================================================
// Task 5.7 - Helper Function Tests
// ============================================================================

test('isGoogleSourced returns true for google_drive source type', () => {
  const native = getDocumentLineageFixture('native');
  const vm = mapDocumentProvenance(native);

  assert.equal(isGoogleSourced(vm), true, 'Native Google import should be Google sourced');
});

test('isGoogleSourced returns false for upload source type', () => {
  const empty = getDocumentLineageFixture('empty');
  const vm = mapDocumentProvenance(empty);

  assert.equal(isGoogleSourced(vm), false, 'Upload document should not be Google sourced');
});

test('hasActionableWarnings returns true for critical/warning severity', () => {
  const candidateWarning = getDocumentLineageFixture('candidate_warning');
  const vm = mapDocumentProvenance(candidateWarning);

  // The candidate warning fixture has medium confidence, which maps to warning severity
  assert.equal(hasActionableWarnings(vm), true, 'Should have actionable warnings');
});

test('hasActionableWarnings returns false for empty warnings', () => {
  const native = getDocumentLineageFixture('native');
  const vm = mapDocumentProvenance(native);

  assert.equal(hasActionableWarnings(vm), false, 'Should not have actionable warnings');
});

test('getWarningSeverityClass returns correct CSS classes', () => {
  assert.equal(getWarningSeverityClass('critical'), 'warning-critical');
  assert.equal(getWarningSeverityClass('warning'), 'warning-medium');
  assert.equal(getWarningSeverityClass('info'), 'warning-info');
  assert.equal(getWarningSeverityClass('none'), '');
});

test('getWarningSeverityIcon returns correct icon names', () => {
  assert.equal(getWarningSeverityIcon('critical'), 'exclamation-triangle');
  assert.equal(getWarningSeverityIcon('warning'), 'exclamation-circle');
  assert.equal(getWarningSeverityIcon('info'), 'info-circle');
  assert.equal(getWarningSeverityIcon('none'), '');
});

test('getSourceTypeIcon returns correct icon names', () => {
  assert.equal(getSourceTypeIcon('google_drive'), 'google-drive');
  assert.equal(getSourceTypeIcon('upload'), 'upload');
  assert.equal(getSourceTypeIcon('unknown'), 'file');
});

test('getSourceTypeLabel returns correct labels', () => {
  assert.equal(getSourceTypeLabel('google_drive'), 'Google Drive');
  assert.equal(getSourceTypeLabel('upload'), 'Direct Upload');
  assert.equal(getSourceTypeLabel('unknown'), 'Unknown Source');
});

// ============================================================================
// Task 5.7 - Warning Precedence Tests
// ============================================================================

test('warnings preserve backend-authored precedence order', () => {
  // Create a fixture-like detail with backend-authored presentation warnings already ordered.
  const detailWithWarnings = {
    document_id: 'test-doc',
    source_document: { id: 'src-1', label: 'Test' },
    source_revision: { id: 'rev-1' },
    source_artifact: { id: 'art-1', artifact_kind: 'signable_pdf' },
    google_source: {
      account_id: 'acct-1',
      external_file_id: 'file-1',
      web_url: 'https://example.com',
      source_version_hint: 'v1',
      source_mime_type: 'application/vnd.google-apps.document',
      source_ingestion_mode: 'google_export_pdf',
      title_hint: 'Test',
      page_count_hint: 1,
    },
    fingerprint_status: { status: 'ready', evidence_available: true },
    candidate_warning_summary: [
      {
        id: 'low-1',
        relationship_type: 'same_logical_doc',
        status: 'pending_review',
        confidence_band: 'low',
        summary: 'Low confidence warning',
        evidence: [],
      },
      {
        id: 'high-1',
        relationship_type: 'same_logical_doc',
        status: 'pending_review',
        confidence_band: 'high',
        summary: 'High confidence warning',
        evidence: [],
      },
      {
        id: 'medium-1',
        relationship_type: 'same_logical_doc',
        status: 'pending_review',
        confidence_band: 'medium',
        summary: 'Medium confidence warning',
        evidence: [],
      },
    ],
    presentation_warnings: [
      {
        id: 'medium-1',
        type: 'candidate_relationship',
        severity: 'warning',
        title: 'Medium confidence warning',
        description: 'Medium confidence warning',
        evidence: [],
      },
      {
        id: 'high-1',
        type: 'candidate_relationship',
        severity: 'critical',
        title: 'High confidence warning',
        description: 'High confidence warning',
        evidence: [],
      },
      {
        id: 'low-1',
        type: 'candidate_relationship',
        severity: 'info',
        title: 'Low confidence warning',
        description: 'Low confidence warning',
        evidence: [],
      },
    ],
    empty_state: { kind: 'none' },
  };

  const vm = mapDocumentProvenance(detailWithWarnings);

  // The mapper should preserve backend order rather than re-sorting client-side.
  assert.equal(vm.warnings.length, 3);
  assert.equal(vm.warnings[0].id, 'medium-1');
  assert.equal(vm.warnings[1].id, 'high-1');
  assert.equal(vm.warnings[2].id, 'low-1');
  assert.equal(vm.primaryWarning?.id, 'medium-1');
});

test('mapDocumentProvenance does not infer candidate warnings from raw summaries without presentation warnings', () => {
  const vm = mapDocumentProvenance({
    document_id: 'doc-summary-only',
    source_document: { id: 'src-summary-only', label: 'Summary Only' },
    source_revision: { id: 'rev-summary-only' },
    source_artifact: { id: 'art-summary-only', artifact_kind: 'signable_pdf' },
    google_source: {
      account_id: 'acct-summary-only',
      external_file_id: 'file-summary-only',
      web_url: 'https://example.com/summary-only',
      source_version_hint: 'summary-only-v1',
      source_mime_type: 'application/vnd.google-apps.document',
      source_ingestion_mode: 'google_export_pdf',
      title_hint: 'Summary Only',
      page_count_hint: 1,
    },
    fingerprint_status: { status: 'ready', evidence_available: true },
    candidate_warning_summary: [
      {
        id: 'rel-summary-only',
        relationship_type: 'copied_from',
        status: 'pending_review',
        confidence_band: 'medium',
        summary: 'Server supplied candidate summary only',
        evidence: [],
      },
    ],
    presentation_warnings: [],
    diagnostics_url: '/admin/debug/lineage/documents/doc-summary-only',
    empty_state: { kind: 'none' },
  });

  assert.equal(vm.hasCandidateWarnings, false, 'Client should not infer warning state from raw candidate summaries');
  assert.deepEqual(vm.warnings, [], 'Only backend presentation warnings should drive rendered warnings');
  assert.equal(vm.primaryWarning, null, 'No presentation warning should mean no primary warning');
});

test('mapAgreementProvenance treats artifact-only lineage as partial instead of empty', () => {
  const vm = mapAgreementProvenance({
    agreement_id: 'agr-partial',
    source_revision: null,
    linked_document_artifact: {
      id: 'src-art-partial',
      artifact_kind: 'signable_pdf',
    },
    google_source: null,
    newer_source_exists: false,
    candidate_warning_summary: [],
    presentation_warnings: [],
    diagnostics_url: '/admin/debug/lineage/agreements/agr-partial',
    empty_state: { kind: 'none' },
  });

  assert.equal(vm.hasLineage, true);
  assert.equal(vm.status, 'partial');
});

// ============================================================================
// Task 5.7 - Formatted Field Tests
// ============================================================================

test('mapDocumentProvenance formats dates correctly', () => {
  const native = getDocumentLineageFixture('native');
  const vm = mapDocumentProvenance(native);

  // Should have formatted dates
  if (vm.revision?.modifiedAt) {
    assert.ok(vm.revision.modifiedAtFormatted, 'Should have formatted modified time');
  }
  if (vm.revision?.exportedAt) {
    assert.ok(vm.revision.exportedAtFormatted, 'Should have formatted exported time');
  }
  if (vm.googleSource?.modifiedTime) {
    assert.ok(vm.googleSource.modifiedTimeFormatted, 'Should have formatted Google modified time');
  }
});

test('mapDocumentProvenance formats size bytes correctly', () => {
  const native = getDocumentLineageFixture('native');
  const vm = mapDocumentProvenance(native);

  if (vm.artifact?.sizeBytes) {
    assert.ok(vm.artifact.sizeBytesFormatted, 'Should have formatted size');
    assert.ok(
      vm.artifact.sizeBytesFormatted.includes('KB') || vm.artifact.sizeBytesFormatted.includes('B'),
      'Formatted size should include unit'
    );
  }
});

// ============================================================================
// Task 5.7 - Template Compatibility Tests
// Proves view models provide data needed by templates without branching
// ============================================================================

test('document view model provides all template-required fields', () => {
  const native = getDocumentLineageFixture('native');
  const vm = mapDocumentProvenance(native);

  // Fields templates need for conditional rendering
  assert.ok(typeof vm.hasLineage === 'boolean');
  assert.ok(typeof vm.hasGoogleSource === 'boolean');
  assert.ok(typeof vm.hasArtifact === 'boolean');
  assert.ok(typeof vm.hasFingerprint === 'boolean');
  assert.ok(typeof vm.hasCandidateWarnings === 'boolean');
  assert.ok(typeof vm.showDiagnosticsLink === 'boolean');

  // Fields templates need for data display
  assert.ok(typeof vm.documentId === 'string');
  assert.ok(typeof vm.status === 'string');
  assert.ok(typeof vm.sourceType === 'string');

  // Empty state for placeholders
  assert.ok(typeof vm.emptyState.showPlaceholder === 'boolean');
  assert.ok(typeof vm.emptyState.title === 'string');
  assert.ok(typeof vm.emptyState.description === 'string');

  // Warnings for alerts
  assert.ok(Array.isArray(vm.warnings));
});

test('agreement view model provides all template-required fields', () => {
  const native = getAgreementLineageFixture('native');
  const vm = mapAgreementProvenance(native);

  // Fields templates need for conditional rendering
  assert.ok(typeof vm.hasLineage === 'boolean');
  assert.ok(typeof vm.hasGoogleSource === 'boolean');
  assert.ok(typeof vm.hasArtifact === 'boolean');
  assert.ok(typeof vm.hasCandidateWarnings === 'boolean');
  assert.ok(typeof vm.newerSourceExists === 'boolean');
  assert.ok(typeof vm.showDiagnosticsLink === 'boolean');

  // Fields templates need for data display
  assert.ok(typeof vm.agreementId === 'string');
  assert.ok(typeof vm.status === 'string');
  assert.ok(typeof vm.sourceType === 'string');

  // Empty state for placeholders
  assert.ok(typeof vm.emptyState.showPlaceholder === 'boolean');
  assert.ok(typeof vm.emptyState.title === 'string');
  assert.ok(typeof vm.emptyState.description === 'string');

  // Warnings for alerts
  assert.ok(Array.isArray(vm.warnings));
});

test('templates can render any document view model without null checks in display logic', () => {
  // Simulate template rendering by accessing all display fields
  const fixtures = ['empty', 'native', 'repeated_import', 'candidate_warning', 'fingerprint_pending'];

  for (const state of fixtures) {
    const detail = getDocumentLineageFixture(state);
    const vm = mapDocumentProvenance(detail);

    // These should never throw, even for empty states
    const displayData = {
      id: vm.documentId,
      status: vm.status,
      sourceLabel: getSourceTypeLabel(vm.sourceType),
      sourceIcon: getSourceTypeIcon(vm.sourceType),
      showEmpty: vm.emptyState.showPlaceholder,
      emptyTitle: vm.emptyState.title,
      emptyDesc: vm.emptyState.description,
      fpStatus: vm.fingerprintStatus.statusLabel,
      fpPending: vm.fingerprintStatus.isPending,
      warningCount: vm.warnings.length,
      primaryWarnTitle: vm.primaryWarning?.title ?? '',
      primaryWarnClass: vm.primaryWarning ? getWarningSeverityClass(vm.primaryWarning.severity) : '',
      showDiagnostics: vm.showDiagnosticsLink,
      diagnosticsUrl: vm.diagnosticsUrl ?? '',
    };

    // All values should be defined (not undefined)
    for (const [key, value] of Object.entries(displayData)) {
      assert.notEqual(value, undefined, `${state}: ${key} should not be undefined`);
    }
  }
});

test('templates can render any agreement view model without null checks in display logic', () => {
  const fixtures = ['empty', 'native', 'newer_source_exists', 'candidate_warning'];

  for (const state of fixtures) {
    const detail = getAgreementLineageFixture(state);
    const vm = mapAgreementProvenance(detail);

    // These should never throw, even for empty states
    const displayData = {
      id: vm.agreementId,
      status: vm.status,
      sourceLabel: getSourceTypeLabel(vm.sourceType),
      sourceIcon: getSourceTypeIcon(vm.sourceType),
      showEmpty: vm.emptyState.showPlaceholder,
      emptyTitle: vm.emptyState.title,
      emptyDesc: vm.emptyState.description,
      newerExists: vm.newerSourceExists,
      warningCount: vm.warnings.length,
      primaryWarnTitle: vm.primaryWarning?.title ?? '',
      primaryWarnClass: vm.primaryWarning ? getWarningSeverityClass(vm.primaryWarning.severity) : '',
      showDiagnostics: vm.showDiagnosticsLink,
      diagnosticsUrl: vm.diagnosticsUrl ?? '',
    };

    // All values should be defined (not undefined)
    for (const [key, value] of Object.entries(displayData)) {
      assert.notEqual(value, undefined, `${state}: ${key} should not be undefined`);
    }
  }
});
