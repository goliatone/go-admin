/**
 * Lineage Contract Fixtures
 *
 * Backend-owned payload fixtures for document and agreement detail pages.
 * These fixtures support QA and frontend smoke tests for lineage states:
 * - Empty (upload-only, no lineage)
 * - Native (single import with lineage)
 * - Repeated import (multiple revisions)
 * - Candidate warning states
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 2 Task 2.7-2.9
 */

import type {
  DocumentLineageDetail,
  AgreementLineageDetail,
  Phase1LineageContractFixtures,
  SourceMetadataBaseline,
  SourceRevisionSummary,
  SourceArtifactSummary,
  FingerprintStatusSummary,
  CandidateWarningSummary,
  LineagePresentationWarning,
  LineageEmptyState,
  LineageReference,
  GoogleImportRunDetail,
} from './lineage-contracts.js';
import {
  normalizeAgreementLineageDetail,
  normalizeDocumentLineageDetail,
  normalizePhase1LineageContractFixtures,
} from './lineage-contracts.js';
import phase1ContractFixturesSnapshot from '../../tests/fixtures/esign_lineage_phase1/contract_fixtures.json';

/**
 * Fixture state types for lineage rendering scenarios.
 * Extended for Phase 7 with fingerprint_failed state.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 7 Task 7.8
 */
export type LineageFixtureState =
  | 'empty'
  | 'native'
  | 'repeated_import'
  | 'candidate_warning'
  | 'fingerprint_pending'
  | 'fingerprint_failed';

/**
 * Document detail fixture collection.
 * Extended for Phase 7 with fingerprint_failed state.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 7 Task 7.8
 */
export interface DocumentLineageFixtures {
  empty: DocumentLineageDetail;
  native: DocumentLineageDetail;
  repeated_import: DocumentLineageDetail;
  candidate_warning: DocumentLineageDetail;
  fingerprint_pending: DocumentLineageDetail;
  fingerprint_failed: DocumentLineageDetail;
}

/**
 * Agreement detail fixture collection.
 */
export interface AgreementLineageFixtures {
  empty: AgreementLineageDetail;
  native: AgreementLineageDetail;
  newer_source_exists: AgreementLineageDetail;
  candidate_warning: AgreementLineageDetail;
}

// Shared fixture data

const phase1ContractFixtures: Phase1LineageContractFixtures =
  normalizePhase1LineageContractFixtures(phase1ContractFixturesSnapshot);

function cloneDocumentLineageDetail(detail: DocumentLineageDetail): DocumentLineageDetail {
  return normalizeDocumentLineageDetail(detail);
}

function cloneAgreementLineageDetail(detail: AgreementLineageDetail): AgreementLineageDetail {
  return normalizeAgreementLineageDetail(detail);
}

function withDocumentDiagnosticsURL(
  detail: DocumentLineageDetail,
  documentID: string
): DocumentLineageDetail {
  const diagnosticsURL = `/admin/debug/lineage/documents/${documentID}`;
  return {
    ...detail,
    document_id: documentID,
    diagnostics_url: diagnosticsURL,
    presentation_warnings: detail.presentation_warnings.map((warning) => ({
      ...warning,
      action_url: warning.action_url ? diagnosticsURL : warning.action_url,
      evidence: warning.evidence.map((evidence) => ({ ...evidence })),
    })),
  };
}

function withAgreementDiagnosticsURL(
  detail: AgreementLineageDetail,
  agreementID: string
): AgreementLineageDetail {
  const diagnosticsURL = `/admin/debug/lineage/agreements/${agreementID}`;
  return {
    ...detail,
    agreement_id: agreementID,
    diagnostics_url: diagnosticsURL,
    presentation_warnings: detail.presentation_warnings.map((warning) => ({
      ...warning,
      action_url: warning.action_url ? diagnosticsURL : warning.action_url,
      evidence: warning.evidence.map((evidence) => ({ ...evidence })),
    })),
  };
}

function withoutCandidateWarnings(detail: DocumentLineageDetail): DocumentLineageDetail {
  return {
    ...detail,
    candidate_warning_summary: [],
    presentation_warnings: detail.presentation_warnings.filter(
      (warning) => warning.type !== 'candidate_relationship'
    ),
  };
}

function withoutAgreementWarnings(detail: AgreementLineageDetail): AgreementLineageDetail {
  return {
    ...detail,
    candidate_warning_summary: [],
    presentation_warnings: detail.presentation_warnings.filter(
      (warning) => warning.type === 'newer_source_exists'
    ),
  };
}

const fixtureSourceMetadata: SourceMetadataBaseline = {
  ...phase1ContractFixtures.metadata_baseline,
};

const fixtureSourceDocument: LineageReference = {
  ...(phase1ContractFixtures.states.document_native.source_document ?? {
    id: 'src-doc-fixture-1',
  }),
  url: phase1ContractFixtures.metadata_baseline.web_url,
};

const fixtureFirstRevision: SourceRevisionSummary = {
  ...(phase1ContractFixtures.states.document_native.source_revision ?? {
    id: 'src-rev-fixture-v1',
  }),
};

const fixtureSecondRevision: SourceRevisionSummary = {
  id: 'src-rev-fixture-v2',
  provider_revision_hint: 'v2',
  modified_time: '2026-03-18T14:00:00Z',
  exported_at: '2026-03-18T14:05:00Z',
  exported_by_user_id: 'fixture-user',
  source_mime_type: 'application/vnd.google-apps.document',
};

const fixtureFirstArtifact: SourceArtifactSummary = {
  ...(phase1ContractFixtures.states.document_native.source_artifact ?? {
    id: 'src-artifact-fixture-v1',
    artifact_kind: 'signable_pdf',
  }),
};

const fixtureSecondArtifact: SourceArtifactSummary = {
  id: 'src-artifact-fixture-v2',
  artifact_kind: 'signable_pdf',
  object_key: 'fixtures/google-v2.pdf',
  sha256: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  page_count: 4,
  size_bytes: 5120,
  compatibility_tier: 'full',
  normalization_status: 'completed',
};

const fixtureFingerprintReady: FingerprintStatusSummary = {
  ...phase1ContractFixtures.states.document_native.fingerprint_status,
};

const fixtureFingerprintPending: FingerprintStatusSummary = {
  status: 'pending',
  evidence_available: false,
};

const fixtureFingerprintEmpty: FingerprintStatusSummary = {
  status: 'not_applicable',
  evidence_available: false,
};

/**
 * Fingerprint failed fixture for Phase 7 Task 7.8.
 * Represents a document where fingerprint extraction failed.
 */
const fixtureFingerprintFailed: FingerprintStatusSummary = {
  status: 'failed',
  extract_version: 'v1.0',
  evidence_available: false,
  error_message: 'PDF text extraction failed: document is encrypted or corrupted',
  error_code: 'EXTRACTION_FAILED',
};

const fixtureCandidateWarning: CandidateWarningSummary = {
  ...(phase1ContractFixtures.states.document_native.candidate_warning_summary[0] ?? {
    id: 'rel-fixture-1',
    relationship_type: 'copied_from',
    status: 'pending_review',
    confidence_band: 'medium',
    summary: 'Potential duplicate document detected',
    evidence: [],
    review_action_visible: 'admin_debug_only',
  }),
};

function buildCandidatePresentationWarning(
  diagnosticsUrl: string
): LineagePresentationWarning {
  const warning = phase1ContractFixtures.states.document_native.presentation_warnings[0];
  return {
    ...(warning ?? {
      id: fixtureCandidateWarning.id,
      type: 'candidate_relationship',
      severity: 'warning',
      title: 'Copied From - Pending Review',
      description: fixtureCandidateWarning.summary,
      evidence: fixtureCandidateWarning.evidence,
    }),
    action_url: diagnosticsUrl,
  };
}

function buildFingerprintPendingPresentationWarning(): LineagePresentationWarning {
  return {
    id: 'fingerprint_pending_warning',
    type: 'fingerprint_pending',
    severity: 'info',
    title: 'Fingerprint Processing',
    description: 'Document fingerprinting is in progress. Candidate detection may be incomplete.',
    evidence: [],
  };
}

/**
 * Build presentation warning for fingerprint extraction failure.
 * Phase 7 Task 7.8.
 */
function buildFingerprintFailedPresentationWarning(
  errorMessage?: string
): LineagePresentationWarning {
  return {
    id: 'fingerprint_failed_warning',
    type: 'fingerprint_failed',
    severity: 'warning',
    title: 'Fingerprint Extraction Failed',
    description: errorMessage || 'Document fingerprinting failed. Candidate detection is unavailable.',
    evidence: [],
  };
}

function buildNewerSourcePresentationWarning(): LineagePresentationWarning {
  return {
    id: 'newer_source_warning',
    type: 'newer_source_exists',
    severity: 'info',
    title: 'Newer Source Available',
    description:
      'A newer source revision exists. This agreement remains pinned to the earlier revision used when it was created.',
    evidence: [],
  };
}

const emptyDocumentLineageState: LineageEmptyState = {
  ...phase1ContractFixtures.states.document_empty.empty_state,
};

const emptyAgreementLineageState: LineageEmptyState = {
  ...phase1ContractFixtures.states.agreement_empty.empty_state,
};

const nativeLineageState: LineageEmptyState = {
  kind: 'none',
};

const canonicalDocumentNative = cloneDocumentLineageDetail(
  phase1ContractFixtures.states.document_native
);
const canonicalDocumentEmpty = cloneDocumentLineageDetail(
  phase1ContractFixtures.states.document_empty
);
const canonicalAgreementNative = cloneAgreementLineageDetail(
  phase1ContractFixtures.states.agreement_native
);
const canonicalAgreementEmpty = cloneAgreementLineageDetail(
  phase1ContractFixtures.states.agreement_empty
);

// Document Fixtures

export const documentLineageFixtures: DocumentLineageFixtures = {
  empty: withDocumentDiagnosticsURL(
    {
      ...canonicalDocumentEmpty,
      fingerprint_status: fixtureFingerprintEmpty,
      candidate_warning_summary: [],
      presentation_warnings: [],
      empty_state: emptyDocumentLineageState,
    },
    'doc-fixture-empty'
  ),

  native: withDocumentDiagnosticsURL(
    withoutCandidateWarnings({
      ...canonicalDocumentNative,
      source_document: { ...fixtureSourceDocument },
      source_revision: { ...fixtureFirstRevision },
      source_artifact: { ...fixtureFirstArtifact },
      google_source: { ...fixtureSourceMetadata },
      fingerprint_status: { ...fixtureFingerprintReady },
      empty_state: nativeLineageState,
    }),
    'doc-fixture-native'
  ),

  repeated_import: withDocumentDiagnosticsURL(
    withoutCandidateWarnings({
      ...canonicalDocumentNative,
      source_document: { ...fixtureSourceDocument },
      source_revision: { ...fixtureSecondRevision },
      source_artifact: { ...fixtureSecondArtifact },
      google_source: {
        ...fixtureSourceMetadata,
        modified_time: '2026-03-18T14:00:00Z',
        source_version_hint: 'v2',
        page_count_hint: 4,
      },
      fingerprint_status: { ...fixtureFingerprintReady },
      empty_state: nativeLineageState,
    }),
    'doc-fixture-repeated'
  ),

  candidate_warning: withDocumentDiagnosticsURL(
    {
      ...canonicalDocumentNative,
      source_document: {
        ...fixtureSourceDocument,
        id: 'src-doc-candidate',
      },
      source_revision: { ...fixtureFirstRevision },
      source_artifact: { ...fixtureFirstArtifact },
      google_source: { ...fixtureSourceMetadata },
      fingerprint_status: { ...fixtureFingerprintReady },
      candidate_warning_summary: [{ ...fixtureCandidateWarning }],
      presentation_warnings: [
        buildCandidatePresentationWarning('/admin/debug/lineage/documents/doc-fixture-candidate'),
      ],
      empty_state: nativeLineageState,
    },
    'doc-fixture-candidate'
  ),

  fingerprint_pending: withDocumentDiagnosticsURL(
    withoutCandidateWarnings({
      ...canonicalDocumentNative,
      source_document: { ...fixtureSourceDocument },
      source_revision: { ...fixtureFirstRevision },
      source_artifact: { ...fixtureFirstArtifact },
      google_source: { ...fixtureSourceMetadata },
      fingerprint_status: { ...fixtureFingerprintPending },
      presentation_warnings: [buildFingerprintPendingPresentationWarning()],
      empty_state: nativeLineageState,
    }),
    'doc-fixture-fp-pending'
  ),

  /**
   * Fingerprint failed fixture - Phase 7 Task 7.8.
   * Represents a document where fingerprint extraction failed.
   * Document has lineage but fingerprinting could not complete.
   */
  fingerprint_failed: withDocumentDiagnosticsURL(
    withoutCandidateWarnings({
      ...canonicalDocumentNative,
      source_document: { ...fixtureSourceDocument },
      source_revision: { ...fixtureFirstRevision },
      source_artifact: { ...fixtureFirstArtifact },
      google_source: { ...fixtureSourceMetadata },
      fingerprint_status: { ...fixtureFingerprintFailed },
      presentation_warnings: [
        buildFingerprintFailedPresentationWarning(
          'PDF text extraction failed: document is encrypted or corrupted'
        ),
      ],
      empty_state: nativeLineageState,
    }),
    'doc-fixture-fp-failed'
  ),
};

// Agreement Fixtures

export const agreementLineageFixtures: AgreementLineageFixtures = {
  empty: withAgreementDiagnosticsURL(
    {
      ...canonicalAgreementEmpty,
      newer_source_exists: false,
      candidate_warning_summary: [],
      presentation_warnings: [],
      empty_state: emptyAgreementLineageState,
    },
    'agr-fixture-empty'
  ),

  native: withAgreementDiagnosticsURL(
    withoutAgreementWarnings({
      ...canonicalAgreementNative,
      source_revision: { ...fixtureFirstRevision },
      linked_document_artifact: { ...fixtureFirstArtifact },
      google_source: { ...fixtureSourceMetadata },
      newer_source_exists: false,
      empty_state: nativeLineageState,
    }),
    'agr-fixture-native'
  ),

  newer_source_exists: withAgreementDiagnosticsURL(
    withoutAgreementWarnings({
      ...canonicalAgreementNative,
      source_revision: { ...fixtureFirstRevision },
      linked_document_artifact: { ...fixtureFirstArtifact },
      google_source: { ...fixtureSourceMetadata },
      newer_source_exists: true,
      presentation_warnings: [buildNewerSourcePresentationWarning()],
      empty_state: nativeLineageState,
    }),
    'agr-fixture-newer'
  ),

  candidate_warning: withAgreementDiagnosticsURL(
    {
      ...canonicalAgreementNative,
      source_revision: { ...fixtureFirstRevision },
      linked_document_artifact: { ...fixtureFirstArtifact },
      google_source: { ...fixtureSourceMetadata },
      newer_source_exists: false,
      candidate_warning_summary: [{ ...fixtureCandidateWarning }],
      presentation_warnings: [
        buildCandidatePresentationWarning('/admin/debug/lineage/agreements/agr-fixture-candidate'),
      ],
      empty_state: nativeLineageState,
    },
    'agr-fixture-candidate'
  ),
};

/**
 * Get document fixture by state name.
 */
export function getDocumentLineageFixture(state: LineageFixtureState): DocumentLineageDetail {
  const fixture = documentLineageFixtures[state as keyof DocumentLineageFixtures];
  if (!fixture) {
    throw new Error(`Unknown document lineage fixture state: ${state}`);
  }
  return normalizeDocumentLineageDetail(fixture);
}

/**
 * Get agreement fixture by state name.
 */
export function getAgreementLineageFixture(
  state: keyof AgreementLineageFixtures
): AgreementLineageDetail {
  const fixture = agreementLineageFixtures[state];
  if (!fixture) {
    throw new Error(`Unknown agreement lineage fixture state: ${state}`);
  }
  return normalizeAgreementLineageDetail(fixture);
}

/**
 * Validate that a document detail payload matches the expected fixture shape.
 * Returns validation errors or empty array if valid.
 */
export function validateDocumentLineagePayload(payload: unknown): string[] {
  const errors: string[] = [];

  if (!payload || typeof payload !== 'object') {
    errors.push('payload must be an object');
    return errors;
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.document_id !== 'string') {
    errors.push('document_id must be a string');
  }

  if (typeof record.fingerprint_status !== 'object' || record.fingerprint_status === null) {
    errors.push('fingerprint_status must be an object');
  }

  if (!Array.isArray(record.candidate_warning_summary)) {
    errors.push('candidate_warning_summary must be an array');
  }
  if (!Array.isArray(record.presentation_warnings)) {
    errors.push('presentation_warnings must be an array');
  }

  if (typeof record.empty_state !== 'object' || record.empty_state === null) {
    errors.push('empty_state must be an object');
  }

  // source_document, source_revision, source_artifact, google_source can be null
  const nullableFields = ['source_document', 'source_revision', 'source_artifact', 'google_source'];
  for (const field of nullableFields) {
    if (record[field] !== null && typeof record[field] !== 'object') {
      errors.push(`${field} must be an object or null`);
    }
  }

  return errors;
}

/**
 * Validate that an agreement detail payload matches the expected fixture shape.
 * Returns validation errors or empty array if valid.
 */
export function validateAgreementLineagePayload(payload: unknown): string[] {
  const errors: string[] = [];

  if (!payload || typeof payload !== 'object') {
    errors.push('payload must be an object');
    return errors;
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.agreement_id !== 'string') {
    errors.push('agreement_id must be a string');
  }

  if (typeof record.newer_source_exists !== 'boolean') {
    errors.push('newer_source_exists must be a boolean');
  }

  if (!Array.isArray(record.candidate_warning_summary)) {
    errors.push('candidate_warning_summary must be an array');
  }
  if (!Array.isArray(record.presentation_warnings)) {
    errors.push('presentation_warnings must be an array');
  }

  if (typeof record.empty_state !== 'object' || record.empty_state === null) {
    errors.push('empty_state must be an object');
  }

  // source_revision, linked_document_artifact, google_source can be null
  const nullableFields = ['source_revision', 'linked_document_artifact', 'google_source'];
  for (const field of nullableFields) {
    if (record[field] !== null && typeof record[field] !== 'object') {
      errors.push(`${field} must be an object or null`);
    }
  }

  return errors;
}

// ============================================================================
// Import State Fixtures (Phase 3 Task 3.10)
// Debug-oriented fixtures for backend-owned import run states
// ============================================================================

/**
 * Import fixture state types for QA and debugging.
 * @see DOC_LINEAGE_V1_TSK.md Phase 3 Task 3.10
 */
export type ImportFixtureState =
  | 'native_import_success'
  | 'duplicate_import'
  | 'unchanged_reimport'
  | 'changed_source_reimport'
  | 'import_failure';

/**
 * Import response fixture collection.
 * @see DOC_LINEAGE_V1_TSK.md Phase 3 Task 3.10
 */
export interface ImportResponseFixtures {
  native_import_success: GoogleImportRunDetail;
  duplicate_import: GoogleImportRunDetail;
  unchanged_reimport: GoogleImportRunDetail;
  changed_source_reimport: GoogleImportRunDetail;
  import_failure: GoogleImportRunDetail;
}

// Import Response Fixtures

export const importResponseFixtures: ImportResponseFixtures = {
  /**
   * Native import success - first time import of a new source document.
   * Creates a new source_document, source_revision, and source_artifact.
   */
  native_import_success: {
    import_run_id: 'import-run-native-1',
    status: 'succeeded',
    status_url: '/admin/api/esign/google-drive/imports/import-run-native-1',
    lineage_status: 'linked',
    source_document: fixtureSourceDocument,
    source_revision: fixtureFirstRevision,
    source_artifact: fixtureFirstArtifact,
    fingerprint_status: fixtureFingerprintReady,
    candidate_status: [],
    document: {
      id: 'doc-native-import-1',
      title: 'Imported MSA',
      source_document_id: fixtureSourceDocument.id,
      source_revision_id: fixtureFirstRevision.id,
      source_artifact_id: fixtureFirstArtifact.id,
    },
    agreement: {
      id: 'agr-native-import-1',
      document_id: 'doc-native-import-1',
      title: 'Imported MSA Agreement',
      source_revision_id: fixtureFirstRevision.id,
    },
    source_document_id: fixtureSourceDocument.id,
    source_revision_id: fixtureFirstRevision.id,
    source_artifact_id: fixtureFirstArtifact.id,
    source_mime_type: fixtureSourceMetadata.source_mime_type,
    ingestion_mode: fixtureSourceMetadata.source_ingestion_mode,
    document_detail_url: '/admin/esign/documents/doc-native-import-1',
    agreement_detail_url: '/admin/esign/agreements/agr-native-import-1',
    error: null,
  },

  /**
   * Duplicate import - importing a document that was already fully imported.
   * Reuses existing source_document and source_revision.
   */
  duplicate_import: {
    import_run_id: 'import-run-duplicate-1',
    status: 'succeeded',
    status_url: '/admin/api/esign/google-drive/imports/import-run-duplicate-1',
    lineage_status: 'linked',
    source_document: fixtureSourceDocument,
    source_revision: fixtureFirstRevision,
    source_artifact: fixtureFirstArtifact,
    fingerprint_status: fixtureFingerprintReady,
    candidate_status: [],
    document: {
      id: 'doc-existing-1',
      title: 'Existing Imported MSA',
      source_document_id: fixtureSourceDocument.id,
      source_revision_id: fixtureFirstRevision.id,
      source_artifact_id: fixtureFirstArtifact.id,
    },
    agreement: null,
    source_document_id: fixtureSourceDocument.id,
    source_revision_id: fixtureFirstRevision.id,
    source_artifact_id: fixtureFirstArtifact.id,
    source_mime_type: fixtureSourceMetadata.source_mime_type,
    ingestion_mode: fixtureSourceMetadata.source_ingestion_mode,
    document_detail_url: '/admin/esign/documents/doc-existing-1',
    agreement_detail_url: null,
    error: null,
  },

  /**
   * Unchanged re-import - re-importing the same content from the source.
   * Reuses existing source_revision because content hasn't changed.
   */
  unchanged_reimport: {
    import_run_id: 'import-run-unchanged-1',
    status: 'succeeded',
    status_url: '/admin/api/esign/google-drive/imports/import-run-unchanged-1',
    lineage_status: 'linked',
    source_document: fixtureSourceDocument,
    source_revision: fixtureFirstRevision,
    source_artifact: fixtureFirstArtifact,
    fingerprint_status: fixtureFingerprintReady,
    candidate_status: [],
    document: {
      id: 'doc-reimport-unchanged-1',
      title: 'Unchanged Re-Import',
      source_document_id: fixtureSourceDocument.id,
      source_revision_id: fixtureFirstRevision.id,
      source_artifact_id: fixtureFirstArtifact.id,
    },
    agreement: {
      id: 'agr-reimport-unchanged-1',
      document_id: 'doc-reimport-unchanged-1',
      title: 'Unchanged Re-Import Agreement',
      source_revision_id: fixtureFirstRevision.id,
    },
    source_document_id: fixtureSourceDocument.id,
    source_revision_id: fixtureFirstRevision.id,
    source_artifact_id: fixtureFirstArtifact.id,
    source_mime_type: fixtureSourceMetadata.source_mime_type,
    ingestion_mode: fixtureSourceMetadata.source_ingestion_mode,
    document_detail_url: '/admin/esign/documents/doc-reimport-unchanged-1',
    agreement_detail_url: '/admin/esign/agreements/agr-reimport-unchanged-1',
    error: null,
  },

  /**
   * Changed source re-import - re-importing when source content has changed.
   * Creates a new source_revision and source_artifact for the changed content.
   */
  changed_source_reimport: {
    import_run_id: 'import-run-changed-1',
    status: 'succeeded',
    status_url: '/admin/api/esign/google-drive/imports/import-run-changed-1',
    lineage_status: 'linked',
    source_document: fixtureSourceDocument,
    source_revision: fixtureSecondRevision,
    source_artifact: fixtureSecondArtifact,
    fingerprint_status: fixtureFingerprintReady,
    candidate_status: [],
    document: {
      id: 'doc-reimport-changed-1',
      title: 'Changed Re-Import',
      source_document_id: fixtureSourceDocument.id,
      source_revision_id: fixtureSecondRevision.id,
      source_artifact_id: fixtureSecondArtifact.id,
    },
    agreement: {
      id: 'agr-reimport-changed-1',
      document_id: 'doc-reimport-changed-1',
      title: 'Changed Re-Import Agreement',
      source_revision_id: fixtureSecondRevision.id,
    },
    source_document_id: fixtureSourceDocument.id,
    source_revision_id: fixtureSecondRevision.id,
    source_artifact_id: fixtureSecondArtifact.id,
    source_mime_type: fixtureSourceMetadata.source_mime_type,
    ingestion_mode: fixtureSourceMetadata.source_ingestion_mode,
    document_detail_url: '/admin/esign/documents/doc-reimport-changed-1',
    agreement_detail_url: '/admin/esign/agreements/agr-reimport-changed-1',
    error: null,
  },

  /**
   * Import failure - import failed before lineage could be resolved.
   * No lineage entities are created.
   */
  import_failure: {
    import_run_id: 'import-run-failed-1',
    status: 'failed',
    status_url: '/admin/api/esign/google-drive/imports/import-run-failed-1',
    lineage_status: '',
    source_document: null,
    source_revision: null,
    source_artifact: null,
    fingerprint_status: fixtureFingerprintEmpty,
    candidate_status: [],
    document: null,
    agreement: null,
    source_document_id: null,
    source_revision_id: null,
    source_artifact_id: null,
    source_mime_type: null,
    ingestion_mode: null,
    document_detail_url: null,
    agreement_detail_url: null,
    error: {
      code: 'IMPORT_FAILED',
      message: 'Failed to export PDF from Google Drive: insufficient permissions',
    },
  },
};

/**
 * Get import response fixture by state name.
 * @see DOC_LINEAGE_V1_TSK.md Phase 3 Task 3.10
 */
export function getImportResponseFixture(state: ImportFixtureState): GoogleImportRunDetail {
  const fixture = importResponseFixtures[state];
  if (!fixture) {
    throw new Error(`Unknown import response fixture state: ${state}`);
  }
  return {
    ...fixture,
    document: fixture.document ? { ...fixture.document } : null,
    agreement: fixture.agreement ? { ...fixture.agreement } : null,
    source_document: fixture.source_document ? { ...fixture.source_document } : null,
    source_revision: fixture.source_revision ? { ...fixture.source_revision } : null,
    source_artifact: fixture.source_artifact ? { ...fixture.source_artifact } : null,
    fingerprint_status: { ...fixture.fingerprint_status },
    candidate_status: fixture.candidate_status.map((warning) => ({
      ...warning,
      evidence: warning.evidence.map((evidence) => ({ ...evidence })),
    })),
    error: fixture.error
      ? {
          ...fixture.error,
          ...(fixture.error.details ? { details: { ...fixture.error.details } } : {}),
        }
      : null,
  };
}

/**
 * Validate that an import response payload matches the expected fixture shape.
 * Returns validation errors or empty array if valid.
 * @see DOC_LINEAGE_V1_TSK.md Phase 3 Task 3.10
 */
export function validateImportResponsePayload(payload: unknown): string[] {
  const errors: string[] = [];

  if (!payload || typeof payload !== 'object') {
    errors.push('payload must be an object');
    return errors;
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.import_run_id !== 'string') {
    errors.push('import_run_id must be a string');
  }

  if (typeof record.status !== 'string') {
    errors.push('status must be a string');
  }

  if (record.status_url !== null && record.status_url !== undefined && typeof record.status_url !== 'string') {
    errors.push('status_url must be a string or null');
  }

  if (typeof record.lineage_status !== 'string') {
    errors.push('lineage_status must be a string');
  }

  if (typeof record.fingerprint_status !== 'object' || record.fingerprint_status === null) {
    errors.push('fingerprint_status must be an object');
  }

  if (!Array.isArray(record.candidate_status)) {
    errors.push('candidate_status must be an array');
  }

  const nullableObjectFields = ['document', 'agreement', 'source_document', 'source_revision', 'source_artifact'];
  for (const field of nullableObjectFields) {
    if (record[field] !== null && record[field] !== undefined && typeof record[field] !== 'object') {
      errors.push(`${field} must be an object or null`);
    }
  }

  // Nullable fields
  const nullableStringFields = [
    'source_document_id',
    'source_revision_id',
    'source_artifact_id',
    'source_mime_type',
    'ingestion_mode',
    'document_detail_url',
    'agreement_detail_url',
  ];
  for (const field of nullableStringFields) {
    if (record[field] !== null && typeof record[field] !== 'string') {
      errors.push(`${field} must be a string or null`);
    }
  }

  // error can be null or object
  if (record.error !== null && typeof record.error !== 'object') {
    errors.push('error must be an object or null');
  }

  return errors;
}

/**
 * Get all available import fixture states.
 */
export function getImportFixtureStates(): ImportFixtureState[] {
  return [
    'native_import_success',
    'duplicate_import',
    'unchanged_reimport',
    'changed_source_reimport',
    'import_failure',
  ];
}

// ============================================================================
// Document and Agreement Detail Payloads with Lineage Linkage (Phase 4 Task 4.9)
// Contract fixtures proving detail payloads can include lineage after import
// ============================================================================

/**
 * Document detail payload shape as returned by backend after import.
 * Includes all fields from DocumentRecord plus lineage linkage fields.
 * @see DOC_LINEAGE_V1_TSK.md Phase 4 Task 4.9
 */
export interface DocumentDetailPayloadWithLineage {
  id: string;
  tenant_id: string;
  org_id: string;
  created_by_user_id: string;
  title: string;
  source_original_name: string;
  source_object_key: string;
  normalized_object_key: string;
  source_sha256: string;
  source_type: string;
  source_google_file_id: string | null;
  source_google_doc_url: string | null;
  source_modified_time: string | null;
  source_exported_at: string | null;
  source_exported_by_user_id: string | null;
  source_mime_type: string | null;
  source_ingestion_mode: string | null;
  // Lineage linkage fields added after import (Task 4.2)
  source_document_id: string | null;
  source_revision_id: string | null;
  source_artifact_id: string | null;
  // PDF metadata
  pdf_compatibility_tier: string | null;
  pdf_compatibility_reason: string | null;
  pdf_normalization_status: string | null;
  size_bytes: number;
  page_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Agreement detail payload shape as returned by backend after import.
 * Includes source_revision_id for pinned provenance.
 * @see DOC_LINEAGE_V1_TSK.md Phase 4 Task 4.9
 */
export interface AgreementDetailPayloadWithLineage {
  id: string;
  tenant_id: string;
  org_id: string;
  document_id: string;
  workflow_kind: string;
  root_agreement_id: string | null;
  parent_agreement_id: string | null;
  source_type: string;
  source_google_file_id: string | null;
  source_google_doc_url: string | null;
  source_modified_time: string | null;
  source_exported_at: string | null;
  source_exported_by_user_id: string | null;
  source_mime_type: string | null;
  source_ingestion_mode: string | null;
  // Pinned source revision for agreement provenance (Task 4.3)
  source_revision_id: string | null;
  status: string;
  title: string;
  message: string | null;
  version: number;
  sent_at: string | null;
  completed_at: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Fixture state for lineage-linked detail payloads.
 * @see DOC_LINEAGE_V1_TSK.md Phase 4 Task 4.9
 */
export type DetailPayloadFixtureState =
  | 'upload_only_document'
  | 'google_import_document'
  | 'upload_only_agreement'
  | 'google_import_agreement';

/**
 * Document detail payload fixtures proving lineage linkage works.
 * @see DOC_LINEAGE_V1_TSK.md Phase 4 Task 4.9
 */
export interface DocumentDetailPayloadFixtures {
  upload_only: DocumentDetailPayloadWithLineage;
  google_import: DocumentDetailPayloadWithLineage;
  google_reimport: DocumentDetailPayloadWithLineage;
}

/**
 * Agreement detail payload fixtures proving lineage linkage works.
 * @see DOC_LINEAGE_V1_TSK.md Phase 4 Task 4.9
 */
export interface AgreementDetailPayloadFixtures {
  upload_only: AgreementDetailPayloadWithLineage;
  google_import: AgreementDetailPayloadWithLineage;
  google_reimport: AgreementDetailPayloadWithLineage;
}

// Document detail payload fixtures

export const documentDetailPayloadFixtures: DocumentDetailPayloadFixtures = {
  /**
   * Upload-only document - no lineage linkage.
   * Represents a document uploaded directly without Google import.
   */
  upload_only: {
    id: 'doc-upload-only-fixture',
    tenant_id: 'tenant-fixture',
    org_id: 'org-fixture',
    created_by_user_id: 'user-fixture',
    title: 'Uploaded Contract Document',
    source_original_name: 'contract.pdf',
    source_object_key: 'tenant-fixture/org-fixture/docs/contract.pdf',
    normalized_object_key: 'tenant-fixture/org-fixture/docs/contract-normalized.pdf',
    source_sha256: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    source_type: 'upload',
    source_google_file_id: null,
    source_google_doc_url: null,
    source_modified_time: null,
    source_exported_at: null,
    source_exported_by_user_id: null,
    source_mime_type: null,
    source_ingestion_mode: null,
    // No lineage linkage for upload-only documents
    source_document_id: null,
    source_revision_id: null,
    source_artifact_id: null,
    pdf_compatibility_tier: 'full',
    pdf_compatibility_reason: null,
    pdf_normalization_status: 'completed',
    size_bytes: 4096,
    page_count: 3,
    created_at: '2026-03-18T10:00:00Z',
    updated_at: '2026-03-18T10:00:00Z',
  },

  /**
   * Google import document - with lineage linkage.
   * Represents a document created from Google Drive import with full lineage.
   */
  google_import: {
    id: 'doc-google-import-fixture',
    tenant_id: 'tenant-fixture',
    org_id: 'org-fixture',
    created_by_user_id: 'user-fixture',
    title: 'Google Imported Contract',
    source_original_name: 'Google Contract.pdf',
    source_object_key: 'tenant-fixture/org-fixture/docs/google-contract.pdf',
    normalized_object_key: 'tenant-fixture/org-fixture/docs/google-contract-normalized.pdf',
    source_sha256: 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
    source_type: 'google_drive',
    source_google_file_id: 'google-file-fixture-1',
    source_google_doc_url: 'https://docs.google.com/document/d/google-file-fixture-1/edit',
    source_modified_time: '2026-03-18T12:00:00Z',
    source_exported_at: '2026-03-18T12:05:00Z',
    source_exported_by_user_id: 'user-fixture',
    source_mime_type: 'application/vnd.google-apps.document',
    source_ingestion_mode: 'google_export_pdf',
    // Lineage linkage populated after import (Task 4.2)
    source_document_id: 'src-doc-fixture-1',
    source_revision_id: 'src-rev-fixture-v1',
    source_artifact_id: 'src-artifact-fixture-v1',
    pdf_compatibility_tier: 'full',
    pdf_compatibility_reason: null,
    pdf_normalization_status: 'completed',
    size_bytes: 5120,
    page_count: 4,
    created_at: '2026-03-18T12:05:00Z',
    updated_at: '2026-03-18T12:05:00Z',
  },

  /**
   * Google re-import document - with updated lineage linkage.
   * Represents a document from a changed-source re-import.
   */
  google_reimport: {
    id: 'doc-google-reimport-fixture',
    tenant_id: 'tenant-fixture',
    org_id: 'org-fixture',
    created_by_user_id: 'user-fixture',
    title: 'Google Imported Contract (Updated)',
    source_original_name: 'Google Contract v2.pdf',
    source_object_key: 'tenant-fixture/org-fixture/docs/google-contract-v2.pdf',
    normalized_object_key: 'tenant-fixture/org-fixture/docs/google-contract-v2-normalized.pdf',
    source_sha256: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    source_type: 'google_drive',
    source_google_file_id: 'google-file-fixture-1',
    source_google_doc_url: 'https://docs.google.com/document/d/google-file-fixture-1/edit',
    source_modified_time: '2026-03-18T14:00:00Z',
    source_exported_at: '2026-03-18T14:05:00Z',
    source_exported_by_user_id: 'user-fixture',
    source_mime_type: 'application/vnd.google-apps.document',
    source_ingestion_mode: 'google_export_pdf',
    // Same source_document_id but new revision and artifact
    source_document_id: 'src-doc-fixture-1',
    source_revision_id: 'src-rev-fixture-v2',
    source_artifact_id: 'src-artifact-fixture-v2',
    pdf_compatibility_tier: 'full',
    pdf_compatibility_reason: null,
    pdf_normalization_status: 'completed',
    size_bytes: 6144,
    page_count: 5,
    created_at: '2026-03-18T14:05:00Z',
    updated_at: '2026-03-18T14:05:00Z',
  },
};

// Agreement detail payload fixtures

export const agreementDetailPayloadFixtures: AgreementDetailPayloadFixtures = {
  /**
   * Upload-only agreement - no lineage linkage.
   * Created from an uploaded document without Google import.
   */
  upload_only: {
    id: 'agr-upload-only-fixture',
    tenant_id: 'tenant-fixture',
    org_id: 'org-fixture',
    document_id: 'doc-upload-only-fixture',
    workflow_kind: 'standard',
    root_agreement_id: null,
    parent_agreement_id: null,
    source_type: 'upload',
    source_google_file_id: null,
    source_google_doc_url: null,
    source_modified_time: null,
    source_exported_at: null,
    source_exported_by_user_id: null,
    source_mime_type: null,
    source_ingestion_mode: null,
    // No pinned source revision for upload-only agreements
    source_revision_id: null,
    status: 'draft',
    title: 'Uploaded Contract Agreement',
    message: null,
    version: 1,
    sent_at: null,
    completed_at: null,
    created_by_user_id: 'user-fixture',
    created_at: '2026-03-18T10:05:00Z',
    updated_at: '2026-03-18T10:05:00Z',
  },

  /**
   * Google import agreement - with pinned source revision.
   * Created from Google import with pinned provenance (Task 4.3).
   */
  google_import: {
    id: 'agr-google-import-fixture',
    tenant_id: 'tenant-fixture',
    org_id: 'org-fixture',
    document_id: 'doc-google-import-fixture',
    workflow_kind: 'standard',
    root_agreement_id: null,
    parent_agreement_id: null,
    source_type: 'google_drive',
    source_google_file_id: 'google-file-fixture-1',
    source_google_doc_url: 'https://docs.google.com/document/d/google-file-fixture-1/edit',
    source_modified_time: '2026-03-18T12:00:00Z',
    source_exported_at: '2026-03-18T12:05:00Z',
    source_exported_by_user_id: 'user-fixture',
    source_mime_type: 'application/vnd.google-apps.document',
    source_ingestion_mode: 'google_export_pdf',
    // Pinned source revision from import (Task 4.3)
    source_revision_id: 'src-rev-fixture-v1',
    status: 'draft',
    title: 'Google Imported Agreement',
    message: 'Please review and sign this agreement',
    version: 1,
    sent_at: null,
    completed_at: null,
    created_by_user_id: 'user-fixture',
    created_at: '2026-03-18T12:05:00Z',
    updated_at: '2026-03-18T12:05:00Z',
  },

  /**
   * Google re-import agreement - pinned to newer revision.
   * Created from changed-source re-import with new revision.
   */
  google_reimport: {
    id: 'agr-google-reimport-fixture',
    tenant_id: 'tenant-fixture',
    org_id: 'org-fixture',
    document_id: 'doc-google-reimport-fixture',
    workflow_kind: 'standard',
    root_agreement_id: null,
    parent_agreement_id: null,
    source_type: 'google_drive',
    source_google_file_id: 'google-file-fixture-1',
    source_google_doc_url: 'https://docs.google.com/document/d/google-file-fixture-1/edit',
    source_modified_time: '2026-03-18T14:00:00Z',
    source_exported_at: '2026-03-18T14:05:00Z',
    source_exported_by_user_id: 'user-fixture',
    source_mime_type: 'application/vnd.google-apps.document',
    source_ingestion_mode: 'google_export_pdf',
    // Pinned to the newer source revision
    source_revision_id: 'src-rev-fixture-v2',
    status: 'draft',
    title: 'Google Imported Agreement (Updated)',
    message: 'Please review the updated agreement',
    version: 1,
    sent_at: null,
    completed_at: null,
    created_by_user_id: 'user-fixture',
    created_at: '2026-03-18T14:05:00Z',
    updated_at: '2026-03-18T14:05:00Z',
  },
};

/**
 * Get document detail payload fixture by state.
 * @see DOC_LINEAGE_V1_TSK.md Phase 4 Task 4.9
 */
export function getDocumentDetailPayloadFixture(
  state: keyof DocumentDetailPayloadFixtures
): DocumentDetailPayloadWithLineage {
  const fixture = documentDetailPayloadFixtures[state];
  if (!fixture) {
    throw new Error(`Unknown document detail payload fixture state: ${state}`);
  }
  return { ...fixture };
}

/**
 * Get agreement detail payload fixture by state.
 * @see DOC_LINEAGE_V1_TSK.md Phase 4 Task 4.9
 */
export function getAgreementDetailPayloadFixture(
  state: keyof AgreementDetailPayloadFixtures
): AgreementDetailPayloadWithLineage {
  const fixture = agreementDetailPayloadFixtures[state];
  if (!fixture) {
    throw new Error(`Unknown agreement detail payload fixture state: ${state}`);
  }
  return { ...fixture };
}

/**
 * Validate document detail payload with lineage linkage.
 * Proves existing frontend consumers can handle lineage fields.
 * @see DOC_LINEAGE_V1_TSK.md Phase 4 Task 4.9
 */
export function validateDocumentDetailPayloadWithLineage(payload: unknown): string[] {
  const errors: string[] = [];

  if (!payload || typeof payload !== 'object') {
    errors.push('payload must be an object');
    return errors;
  }

  const record = payload as Record<string, unknown>;

  // Required string fields
  const requiredStrings = ['id', 'tenant_id', 'org_id', 'title', 'source_type'];
  for (const field of requiredStrings) {
    if (typeof record[field] !== 'string') {
      errors.push(`${field} must be a string`);
    }
  }

  // Required number fields
  if (typeof record.page_count !== 'number') {
    errors.push('page_count must be a number');
  }
  if (typeof record.size_bytes !== 'number') {
    errors.push('size_bytes must be a number');
  }

  // Lineage fields can be null or string
  const lineageFields = ['source_document_id', 'source_revision_id', 'source_artifact_id'];
  for (const field of lineageFields) {
    if (record[field] !== null && typeof record[field] !== 'string') {
      errors.push(`${field} must be a string or null`);
    }
  }

  // Google fields can be null or string
  const googleFields = [
    'source_google_file_id',
    'source_google_doc_url',
    'source_modified_time',
    'source_exported_at',
  ];
  for (const field of googleFields) {
    if (record[field] !== null && typeof record[field] !== 'string') {
      errors.push(`${field} must be a string or null`);
    }
  }

  return errors;
}

/**
 * Validate agreement detail payload with lineage linkage.
 * Proves existing frontend consumers can handle lineage fields.
 * @see DOC_LINEAGE_V1_TSK.md Phase 4 Task 4.9
 */
export function validateAgreementDetailPayloadWithLineage(payload: unknown): string[] {
  const errors: string[] = [];

  if (!payload || typeof payload !== 'object') {
    errors.push('payload must be an object');
    return errors;
  }

  const record = payload as Record<string, unknown>;

  // Required string fields
  const requiredStrings = ['id', 'tenant_id', 'org_id', 'document_id', 'status', 'title'];
  for (const field of requiredStrings) {
    if (typeof record[field] !== 'string') {
      errors.push(`${field} must be a string`);
    }
  }

  // Required number fields
  if (typeof record.version !== 'number') {
    errors.push('version must be a number');
  }

  // source_revision_id can be null or string (pinned provenance)
  if (record.source_revision_id !== null && typeof record.source_revision_id !== 'string') {
    errors.push('source_revision_id must be a string or null');
  }

  // Google fields can be null or string
  const googleFields = [
    'source_google_file_id',
    'source_google_doc_url',
    'source_modified_time',
    'source_exported_at',
  ];
  for (const field of googleFields) {
    if (record[field] !== null && typeof record[field] !== 'string') {
      errors.push(`${field} must be a string or null`);
    }
  }

  return errors;
}

/**
 * Check if document detail payload has lineage linkage.
 * @see DOC_LINEAGE_V1_TSK.md Phase 4 Task 4.9
 */
export function hasDocumentLineageLinkage(payload: DocumentDetailPayloadWithLineage): boolean {
  return (
    payload.source_document_id !== null &&
    payload.source_revision_id !== null &&
    payload.source_artifact_id !== null
  );
}

/**
 * Check if agreement detail payload has pinned provenance.
 * @see DOC_LINEAGE_V1_TSK.md Phase 4 Task 4.9
 */
export function hasAgreementPinnedProvenance(payload: AgreementDetailPayloadWithLineage): boolean {
  return payload.source_revision_id !== null;
}

/**
 * Get all detail payload fixture states for iteration.
 * @see DOC_LINEAGE_V1_TSK.md Phase 4 Task 4.9
 */
export function getDetailPayloadFixtureStates(): {
  documents: (keyof DocumentDetailPayloadFixtures)[];
  agreements: (keyof AgreementDetailPayloadFixtures)[];
} {
  return {
    documents: ['upload_only', 'google_import', 'google_reimport'],
    agreements: ['upload_only', 'google_import', 'google_reimport'],
  };
}

// ============================================================================
// Seeded Google Import QA Fixtures (Phase 4 Task 4.10)
// Fixtures representing seeded Google import paths for QA
// ============================================================================

/**
 * Seeded import scenario representing a complete lineage-linked import path.
 * Used by example runtime wiring for QA validation.
 * @see DOC_LINEAGE_V1_TSK.md Phase 4 Task 4.10
 */
export interface SeededGoogleImportScenario {
  scenario_id: string;
  description: string;
  google_file_id: string;
  google_doc_url: string;
  document: DocumentDetailPayloadWithLineage;
  agreement: AgreementDetailPayloadWithLineage;
  lineage_summary: {
    source_document_id: string;
    source_revision_id: string;
    source_artifact_id: string;
    is_new_source: boolean;
    revision_reused: boolean;
  };
}

/**
 * Seeded Google import scenarios for QA validation.
 * @see DOC_LINEAGE_V1_TSK.md Phase 4 Task 4.10
 */
export const seededGoogleImportScenarios: Record<string, SeededGoogleImportScenario> = {
  /**
   * First-time Google import producing a lineage-linked document/agreement pair.
   * This is the primary QA scenario for Phase 4 validation.
   */
  first_import: {
    scenario_id: 'seeded-first-import',
    description: 'First-time Google import with full lineage linkage',
    google_file_id: 'google-seeded-file-1',
    google_doc_url: 'https://docs.google.com/document/d/google-seeded-file-1/edit',
    document: {
      id: 'doc-seeded-import-1',
      tenant_id: 'tenant-seeded',
      org_id: 'org-seeded',
      created_by_user_id: 'user-seeded',
      title: 'Seeded Contract for QA',
      source_original_name: 'Seeded Contract.pdf',
      source_object_key: 'tenant-seeded/org-seeded/docs/seeded-contract.pdf',
      normalized_object_key: 'tenant-seeded/org-seeded/docs/seeded-contract-normalized.pdf',
      source_sha256: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      source_type: 'google_drive',
      source_google_file_id: 'google-seeded-file-1',
      source_google_doc_url: 'https://docs.google.com/document/d/google-seeded-file-1/edit',
      source_modified_time: '2026-03-18T09:00:00Z',
      source_exported_at: '2026-03-18T09:05:00Z',
      source_exported_by_user_id: 'user-seeded',
      source_mime_type: 'application/vnd.google-apps.document',
      source_ingestion_mode: 'google_export_pdf',
      source_document_id: 'src-doc-seeded-1',
      source_revision_id: 'src-rev-seeded-v1',
      source_artifact_id: 'src-artifact-seeded-v1',
      pdf_compatibility_tier: 'full',
      pdf_compatibility_reason: null,
      pdf_normalization_status: 'completed',
      size_bytes: 8192,
      page_count: 6,
      created_at: '2026-03-18T09:05:00Z',
      updated_at: '2026-03-18T09:05:00Z',
    },
    agreement: {
      id: 'agr-seeded-import-1',
      tenant_id: 'tenant-seeded',
      org_id: 'org-seeded',
      document_id: 'doc-seeded-import-1',
      workflow_kind: 'standard',
      root_agreement_id: null,
      parent_agreement_id: null,
      source_type: 'google_drive',
      source_google_file_id: 'google-seeded-file-1',
      source_google_doc_url: 'https://docs.google.com/document/d/google-seeded-file-1/edit',
      source_modified_time: '2026-03-18T09:00:00Z',
      source_exported_at: '2026-03-18T09:05:00Z',
      source_exported_by_user_id: 'user-seeded',
      source_mime_type: 'application/vnd.google-apps.document',
      source_ingestion_mode: 'google_export_pdf',
      source_revision_id: 'src-rev-seeded-v1',
      status: 'draft',
      title: 'Seeded Agreement for QA',
      message: 'Seeded agreement for QA validation',
      version: 1,
      sent_at: null,
      completed_at: null,
      created_by_user_id: 'user-seeded',
      created_at: '2026-03-18T09:05:00Z',
      updated_at: '2026-03-18T09:05:00Z',
    },
    lineage_summary: {
      source_document_id: 'src-doc-seeded-1',
      source_revision_id: 'src-rev-seeded-v1',
      source_artifact_id: 'src-artifact-seeded-v1',
      is_new_source: true,
      revision_reused: false,
    },
  },
};

/**
 * Get seeded Google import scenario by ID.
 * @see DOC_LINEAGE_V1_TSK.md Phase 4 Task 4.10
 */
export function getSeededGoogleImportScenario(scenarioId: string): SeededGoogleImportScenario {
  const scenario = seededGoogleImportScenarios[scenarioId];
  if (!scenario) {
    throw new Error(`Unknown seeded Google import scenario: ${scenarioId}`);
  }
  return {
    ...scenario,
    document: { ...scenario.document },
    agreement: { ...scenario.agreement },
    lineage_summary: { ...scenario.lineage_summary },
  };
}

/**
 * Get all seeded scenario IDs for iteration.
 * @see DOC_LINEAGE_V1_TSK.md Phase 4 Task 4.10
 */
export function getSeededScenarioIds(): string[] {
  return Object.keys(seededGoogleImportScenarios);
}

/**
 * Validate a seeded scenario has complete lineage linkage.
 * Used by runtime QA to verify seeded data is properly wired.
 * @see DOC_LINEAGE_V1_TSK.md Phase 4 Task 4.10
 */
export function validateSeededScenarioLineage(scenario: SeededGoogleImportScenario): string[] {
  const errors: string[] = [];

  // Validate document has lineage linkage
  if (!hasDocumentLineageLinkage(scenario.document)) {
    errors.push('seeded document missing lineage linkage');
  }

  // Validate agreement has pinned provenance
  if (!hasAgreementPinnedProvenance(scenario.agreement)) {
    errors.push('seeded agreement missing pinned source_revision_id');
  }

  // Validate lineage IDs match between document and summary
  if (scenario.document.source_document_id !== scenario.lineage_summary.source_document_id) {
    errors.push('document source_document_id does not match lineage_summary');
  }
  if (scenario.document.source_revision_id !== scenario.lineage_summary.source_revision_id) {
    errors.push('document source_revision_id does not match lineage_summary');
  }
  if (scenario.document.source_artifact_id !== scenario.lineage_summary.source_artifact_id) {
    errors.push('document source_artifact_id does not match lineage_summary');
  }

  // Validate agreement revision matches document revision
  if (scenario.agreement.source_revision_id !== scenario.document.source_revision_id) {
    errors.push('agreement source_revision_id does not match document');
  }

  // Validate document links to agreement
  if (scenario.agreement.document_id !== scenario.document.id) {
    errors.push('agreement document_id does not match document id');
  }

  return errors;
}
