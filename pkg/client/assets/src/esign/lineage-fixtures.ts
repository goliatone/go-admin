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
  SourceMetadataBaseline,
  SourceRevisionSummary,
  SourceArtifactSummary,
  FingerprintStatusSummary,
  CandidateWarningSummary,
  LineageEmptyState,
  LineageReference,
  GoogleImportResponseWithLineage,
  ImportLineageOutcome,
  ImportProvenanceSummary,
} from './lineage-contracts.js';

/**
 * Fixture state types for lineage rendering scenarios.
 */
export type LineageFixtureState =
  | 'empty'
  | 'native'
  | 'repeated_import'
  | 'candidate_warning'
  | 'fingerprint_pending';

/**
 * Document detail fixture collection.
 */
export interface DocumentLineageFixtures {
  empty: DocumentLineageDetail;
  native: DocumentLineageDetail;
  repeated_import: DocumentLineageDetail;
  candidate_warning: DocumentLineageDetail;
  fingerprint_pending: DocumentLineageDetail;
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

const fixtureSourceMetadata: SourceMetadataBaseline = {
  account_id: 'account-fixture',
  external_file_id: 'google-file-fixture-1',
  web_url: 'https://docs.google.com/document/d/google-file-fixture-1/edit',
  modified_time: '2026-03-18T12:00:00Z',
  source_version_hint: 'v1',
  source_mime_type: 'application/vnd.google-apps.document',
  source_ingestion_mode: 'google_export_pdf',
  title_hint: 'Fixture Google Document',
  page_count_hint: 3,
  owner_email: 'owner@example.com',
};

const fixtureSourceDocument: LineageReference = {
  id: 'src-doc-fixture-1',
  label: 'Fixture Google Document',
  url: 'https://docs.google.com/document/d/google-file-fixture-1/edit',
};

const fixtureFirstRevision: SourceRevisionSummary = {
  id: 'src-rev-fixture-v1',
  provider_revision_hint: 'v1',
  modified_time: '2026-03-18T12:00:00Z',
  exported_at: '2026-03-18T12:05:00Z',
  exported_by_user_id: 'fixture-user',
  source_mime_type: 'application/vnd.google-apps.document',
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
  id: 'src-artifact-fixture-v1',
  artifact_kind: 'signable_pdf',
  object_key: 'fixtures/google-v1.pdf',
  sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  page_count: 3,
  size_bytes: 4096,
  compatibility_tier: 'full',
  normalization_status: 'completed',
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
  status: 'ready',
  extract_version: 'v1.0',
  evidence_available: true,
};

const fixtureFingerprintPending: FingerprintStatusSummary = {
  status: 'pending',
  evidence_available: false,
};

const fixtureFingerprintEmpty: FingerprintStatusSummary = {
  status: 'not_applicable',
  evidence_available: false,
};

const fixtureCandidateWarning: CandidateWarningSummary = {
  id: 'rel-fixture-1',
  relationship_type: 'same_logical_doc',
  status: 'pending_review',
  confidence_band: 'medium',
  confidence_score: 0.72,
  summary: 'Potential duplicate document detected',
  evidence: [
    {
      code: 'matching_title',
      label: 'Title Match',
      details: 'Titles are identical',
    },
    {
      code: 'partial_context',
      label: 'Partial Context',
      details: 'Different accounts with similar folder structure',
    },
  ],
  review_action_visible: 'true',
};

const emptyLineageState: LineageEmptyState = {
  kind: 'upload_only',
  title: 'Direct Upload',
  description: 'This document was uploaded directly without external source tracking.',
};

const nativeLineageState: LineageEmptyState = {
  kind: 'none',
};

// Document Fixtures

export const documentLineageFixtures: DocumentLineageFixtures = {
  empty: {
    document_id: 'doc-fixture-empty',
    source_document: null,
    source_revision: null,
    source_artifact: null,
    google_source: null,
    fingerprint_status: fixtureFingerprintEmpty,
    candidate_warning_summary: [],
    empty_state: emptyLineageState,
  },

  native: {
    document_id: 'doc-fixture-native',
    source_document: fixtureSourceDocument,
    source_revision: fixtureFirstRevision,
    source_artifact: fixtureFirstArtifact,
    google_source: fixtureSourceMetadata,
    fingerprint_status: fixtureFingerprintReady,
    candidate_warning_summary: [],
    diagnostics_url: '/admin/api/v1/diagnostics/documents/doc-fixture-native',
    empty_state: nativeLineageState,
  },

  repeated_import: {
    document_id: 'doc-fixture-repeated',
    source_document: fixtureSourceDocument,
    source_revision: fixtureSecondRevision,
    source_artifact: fixtureSecondArtifact,
    google_source: {
      ...fixtureSourceMetadata,
      modified_time: '2026-03-18T14:00:00Z',
      source_version_hint: 'v2',
      page_count_hint: 4,
    },
    fingerprint_status: fixtureFingerprintReady,
    candidate_warning_summary: [],
    diagnostics_url: '/admin/api/v1/diagnostics/documents/doc-fixture-repeated',
    empty_state: nativeLineageState,
  },

  candidate_warning: {
    document_id: 'doc-fixture-candidate',
    source_document: {
      id: 'src-doc-candidate',
      label: 'Candidate Document',
    },
    source_revision: fixtureFirstRevision,
    source_artifact: fixtureFirstArtifact,
    google_source: fixtureSourceMetadata,
    fingerprint_status: fixtureFingerprintReady,
    candidate_warning_summary: [fixtureCandidateWarning],
    diagnostics_url: '/admin/api/v1/diagnostics/documents/doc-fixture-candidate',
    empty_state: nativeLineageState,
  },

  fingerprint_pending: {
    document_id: 'doc-fixture-fp-pending',
    source_document: fixtureSourceDocument,
    source_revision: fixtureFirstRevision,
    source_artifact: fixtureFirstArtifact,
    google_source: fixtureSourceMetadata,
    fingerprint_status: fixtureFingerprintPending,
    candidate_warning_summary: [],
    diagnostics_url: '/admin/api/v1/diagnostics/documents/doc-fixture-fp-pending',
    empty_state: nativeLineageState,
  },
};

// Agreement Fixtures

export const agreementLineageFixtures: AgreementLineageFixtures = {
  empty: {
    agreement_id: 'agr-fixture-empty',
    source_revision: null,
    linked_document_artifact: null,
    google_source: null,
    newer_source_exists: false,
    candidate_warning_summary: [],
    empty_state: emptyLineageState,
  },

  native: {
    agreement_id: 'agr-fixture-native',
    source_revision: fixtureFirstRevision,
    linked_document_artifact: fixtureFirstArtifact,
    google_source: fixtureSourceMetadata,
    newer_source_exists: false,
    candidate_warning_summary: [],
    diagnostics_url: '/admin/api/v1/diagnostics/agreements/agr-fixture-native',
    empty_state: nativeLineageState,
  },

  newer_source_exists: {
    agreement_id: 'agr-fixture-newer',
    source_revision: fixtureFirstRevision,
    linked_document_artifact: fixtureFirstArtifact,
    google_source: fixtureSourceMetadata,
    newer_source_exists: true,
    candidate_warning_summary: [],
    diagnostics_url: '/admin/api/v1/diagnostics/agreements/agr-fixture-newer',
    empty_state: nativeLineageState,
  },

  candidate_warning: {
    agreement_id: 'agr-fixture-candidate',
    source_revision: fixtureFirstRevision,
    linked_document_artifact: fixtureFirstArtifact,
    google_source: fixtureSourceMetadata,
    newer_source_exists: false,
    candidate_warning_summary: [fixtureCandidateWarning],
    diagnostics_url: '/admin/api/v1/diagnostics/agreements/agr-fixture-candidate',
    empty_state: nativeLineageState,
  },
};

/**
 * Get document fixture by state name.
 */
export function getDocumentLineageFixture(state: LineageFixtureState): DocumentLineageDetail {
  const fixture = documentLineageFixtures[state as keyof DocumentLineageFixtures];
  if (!fixture) {
    throw new Error(`Unknown document lineage fixture state: ${state}`);
  }
  return { ...fixture };
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
  return { ...fixture };
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
// Debug-oriented fixtures for import response states
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
  native_import_success: GoogleImportResponseWithLineage;
  duplicate_import: GoogleImportResponseWithLineage;
  unchanged_reimport: GoogleImportResponseWithLineage;
  changed_source_reimport: GoogleImportResponseWithLineage;
  import_failure: GoogleImportResponseWithLineage;
}

// Shared import fixture data

const fixtureImportProvenance: ImportProvenanceSummary = {
  source_document_id: 'src-doc-import-1',
  source_revision_id: 'src-rev-import-v1',
  source_artifact_id: 'src-artifact-import-v1',
  revision_reused: false,
  is_new_source: true,
};

const fixtureReusedProvenance: ImportProvenanceSummary = {
  source_document_id: 'src-doc-import-1',
  source_revision_id: 'src-rev-import-v1',
  source_artifact_id: 'src-artifact-import-v1',
  revision_reused: true,
  is_new_source: false,
};

const fixtureChangedProvenance: ImportProvenanceSummary = {
  source_document_id: 'src-doc-import-1',
  source_revision_id: 'src-rev-import-v2',
  source_artifact_id: 'src-artifact-import-v2',
  revision_reused: false,
  is_new_source: false,
};

const fixtureEmptyProvenance: ImportProvenanceSummary = {
  source_document_id: null,
  source_revision_id: null,
  source_artifact_id: null,
  revision_reused: false,
  is_new_source: false,
};

// Import Response Fixtures

export const importResponseFixtures: ImportResponseFixtures = {
  /**
   * Native import success - first time import of a new source document.
   * Creates a new source_document, source_revision, and source_artifact.
   */
  native_import_success: {
    import_run_id: 'import-run-native-1',
    status: 'succeeded',
    lineage_outcome: 'native_import',
    provenance: fixtureImportProvenance,
    document_id: 'doc-native-import-1',
    agreement_id: 'agr-native-import-1',
    source_document_url: 'https://docs.google.com/document/d/google-file-import-1/edit',
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
    lineage_outcome: 'duplicate_import',
    provenance: fixtureReusedProvenance,
    document_id: 'doc-existing-1',
    agreement_id: null,
    source_document_url: 'https://docs.google.com/document/d/google-file-import-1/edit',
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
    lineage_outcome: 'unchanged_reimport',
    provenance: fixtureReusedProvenance,
    document_id: 'doc-reimport-unchanged-1',
    agreement_id: 'agr-reimport-unchanged-1',
    source_document_url: 'https://docs.google.com/document/d/google-file-import-1/edit',
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
    lineage_outcome: 'changed_source_reimport',
    provenance: fixtureChangedProvenance,
    document_id: 'doc-reimport-changed-1',
    agreement_id: 'agr-reimport-changed-1',
    source_document_url: 'https://docs.google.com/document/d/google-file-import-1/edit',
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
    lineage_outcome: 'import_failure',
    provenance: fixtureEmptyProvenance,
    document_id: null,
    agreement_id: null,
    source_document_url: null,
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
export function getImportResponseFixture(state: ImportFixtureState): GoogleImportResponseWithLineage {
  const fixture = importResponseFixtures[state];
  if (!fixture) {
    throw new Error(`Unknown import response fixture state: ${state}`);
  }
  return { ...fixture, provenance: { ...fixture.provenance } };
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

  if (typeof record.lineage_outcome !== 'string') {
    errors.push('lineage_outcome must be a string');
  }

  if (typeof record.provenance !== 'object' || record.provenance === null) {
    errors.push('provenance must be an object');
  } else {
    const provenance = record.provenance as Record<string, unknown>;
    if (typeof provenance.revision_reused !== 'boolean') {
      errors.push('provenance.revision_reused must be a boolean');
    }
    if (typeof provenance.is_new_source !== 'boolean') {
      errors.push('provenance.is_new_source must be a boolean');
    }
  }

  // Nullable fields
  const nullableStringFields = [
    'document_id',
    'agreement_id',
    'source_document_url',
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
