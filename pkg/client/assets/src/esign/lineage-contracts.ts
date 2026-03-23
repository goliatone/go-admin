export interface SourceMetadataBaseline {
  account_id: string;
  external_file_id: string;
  drive_id?: string;
  web_url: string;
  modified_time?: string;
  source_version_hint: string;
  source_mime_type: string;
  source_ingestion_mode: string;
  title_hint: string;
  page_count_hint: number;
  owner_email?: string;
  parent_id?: string;
}

export interface LineageReference {
  id: string;
  label?: string;
  url?: string;
}

export interface SourceRevisionSummary {
  id: string;
  provider_revision_hint?: string;
  modified_time?: string;
  exported_at?: string;
  exported_by_user_id?: string;
  source_mime_type?: string;
}

export interface SourceArtifactSummary {
  id: string;
  artifact_kind: string;
  object_key?: string;
  sha256?: string;
  page_count?: number;
  size_bytes?: number;
  compatibility_tier?: string;
  compatibility_reason?: string;
  normalization_status?: string;
}

// ============================================================================
// Fingerprint Status Constants (Phase 7 Task 7.7)
// ============================================================================

/**
 * Canonical fingerprint status values.
 * These constants define the possible states for document fingerprinting.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 7 Task 7.7
 */
export const FINGERPRINT_STATUS = {
  /** Fingerprint status cannot be determined from the available lineage data */
  UNKNOWN: 'unknown',
  /** Fingerprint extraction completed successfully; evidence is available */
  READY: 'ready',
  /** Fingerprint extraction is in progress; evidence not yet available */
  PENDING: 'pending',
  /** Fingerprint extraction failed; error details may be available */
  FAILED: 'failed',
  /** Fingerprint extraction not applicable (e.g., upload-only documents) */
  NOT_APPLICABLE: 'not_applicable',
} as const;

// ============================================================================
// Candidate Relationship Status Constants (Phase 8 Task 8.9)
// ============================================================================

/**
 * Canonical candidate relationship status values.
 * These constants define the possible states for source relationship candidates.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 8 Task 8.9
 */
export const CANDIDATE_RELATIONSHIP_STATUS = {
  /** Candidate relationship is awaiting operator review */
  PENDING_REVIEW: 'pending_review',
  /** Candidate relationship has been confirmed by operator */
  CONFIRMED: 'confirmed',
  /** Candidate relationship has been rejected by operator */
  REJECTED: 'rejected',
  /** Candidate relationship has been superseded by a newer evaluation */
  SUPERSEDED: 'superseded',
  /** Candidate relationship was auto-linked due to exact match */
  AUTO_LINKED: 'auto_linked',
} as const;

/**
 * Type representing valid candidate relationship status values.
 */
export type CandidateRelationshipStatus =
  (typeof CANDIDATE_RELATIONSHIP_STATUS)[keyof typeof CANDIDATE_RELATIONSHIP_STATUS];

/**
 * Check if a status string is a valid candidate relationship status.
 */
export function isValidCandidateRelationshipStatus(status: string): status is CandidateRelationshipStatus {
  return Object.values(CANDIDATE_RELATIONSHIP_STATUS).includes(status as CandidateRelationshipStatus);
}

/**
 * Canonical candidate relationship type values.
 * These constants define the types of relationships between sources.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 8 Task 8.9
 */
export const CANDIDATE_RELATIONSHIP_TYPE = {
  /** Document was copied from another source */
  COPIED_FROM: 'copied_from',
  /** Document is a potential predecessor to another */
  PREDECESSOR_OF: 'predecessor_of',
  /** Document is a potential successor to another */
  SUCCESSOR_OF: 'successor_of',
  /** Document migrated from another account/drive */
  MIGRATED_FROM: 'migrated_from',
  /** Document is an exact duplicate */
  EXACT_DUPLICATE: 'exact_duplicate',
} as const;

/**
 * Type representing valid candidate relationship type values.
 */
export type CandidateRelationshipType =
  (typeof CANDIDATE_RELATIONSHIP_TYPE)[keyof typeof CANDIDATE_RELATIONSHIP_TYPE];

/**
 * Canonical confidence band values for candidate scoring.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 8 Task 8.9
 */
export const CONFIDENCE_BAND = {
  /** High confidence - likely a true match */
  HIGH: 'high',
  /** Medium confidence - may require review */
  MEDIUM: 'medium',
  /** Low confidence - likely a false positive */
  LOW: 'low',
  /** Exact match - artifact or identifier match */
  EXACT: 'exact',
} as const;

/**
 * Type representing valid confidence band values.
 */
export type ConfidenceBand = (typeof CONFIDENCE_BAND)[keyof typeof CONFIDENCE_BAND];

/**
 * Type representing valid fingerprint status values.
 */
export type FingerprintStatus = (typeof FINGERPRINT_STATUS)[keyof typeof FINGERPRINT_STATUS];

/**
 * Check if a status string is a valid fingerprint status.
 */
export function isValidFingerprintStatus(status: string): status is FingerprintStatus {
  return Object.values(FINGERPRINT_STATUS).includes(status as FingerprintStatus);
}

// ============================================================================
// Fingerprint Status Summary (Phase 7 Task 7.7)
// ============================================================================

/**
 * Fingerprint status summary returned by the backend.
 * Contains fingerprint state, extractor-version metadata, and evidence-availability flags.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 7 Task 7.7
 */
export interface FingerprintStatusSummary {
  /** Current fingerprint status (unknown, ready, pending, failed, not_applicable) */
  status: string;
  /** Extractor version used for fingerprint generation (e.g., "v1.0") */
  extract_version?: string;
  /** Whether fingerprint evidence is available for candidate matching */
  evidence_available: boolean;
  /** Error message if fingerprint extraction failed */
  error_message?: string;
  /** Error code if fingerprint extraction failed */
  error_code?: string;
}

export interface CandidateEvidenceSummary {
  code: string;
  label: string;
  details?: string;
}

export interface CandidateWarningSummary {
  id: string;
  relationship_type: string;
  status: string;
  confidence_band: string;
  confidence_score?: number;
  summary: string;
  evidence: CandidateEvidenceSummary[];
  review_action_visible?: string;
}

export interface LineagePresentationWarning {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  action_label?: string;
  action_url?: string;
  review_action_visible?: string;
  evidence: CandidateEvidenceSummary[];
}

export interface LineageEmptyState {
  kind: string;
  title?: string;
  description?: string;
}

export interface NewerSourceSummary {
  exists: boolean;
  pinned_source_revision_id?: string;
  latest_source_revision_id?: string;
  summary?: string;
}

export interface DocumentLineageDetail {
  document_id: string;
  source_document: LineageReference | null;
  source_revision: SourceRevisionSummary | null;
  source_artifact: SourceArtifactSummary | null;
  google_source: SourceMetadataBaseline | null;
  fingerprint_status: FingerprintStatusSummary;
  candidate_warning_summary: CandidateWarningSummary[];
  presentation_warnings: LineagePresentationWarning[];
  diagnostics_url?: string;
  empty_state: LineageEmptyState;
}

export interface AgreementLineageDetail {
  agreement_id: string;
  pinned_source_revision_id?: string;
  source_document: LineageReference | null;
  source_revision: SourceRevisionSummary | null;
  linked_document_artifact: SourceArtifactSummary | null;
  google_source: SourceMetadataBaseline | null;
  newer_source_exists: boolean;
  newer_source_summary: NewerSourceSummary | null;
  candidate_warning_summary: CandidateWarningSummary[];
  presentation_warnings: LineagePresentationWarning[];
  diagnostics_url?: string;
  empty_state: LineageEmptyState;
}

export interface GoogleImportLineageStatus {
  import_run_id: string;
  lineage_status: string;
  source_document: LineageReference | null;
  source_revision: SourceRevisionSummary | null;
  source_artifact: SourceArtifactSummary | null;
  fingerprint_status: FingerprintStatusSummary;
  candidate_status: CandidateWarningSummary[];
  document_detail_url?: string | null;
  agreement_detail_url?: string | null;
}

export interface GoogleImportRunResource {
  id: string;
  document_id?: string;
  title?: string;
  source_type?: string;
  source_google_file_id?: string;
  source_google_doc_url?: string;
  source_modified_time?: string;
  source_exported_at?: string;
  source_exported_by_user_id?: string;
  source_mime_type?: string;
  source_ingestion_mode?: string;
  source_document_id?: string;
  source_revision_id?: string;
  source_artifact_id?: string;
}

export interface GoogleImportRunHandle {
  import_run_id: string;
  status: string;
  status_url: string | null;
}

export interface GoogleImportRunDetail extends GoogleImportLineageStatus {
  status: string;
  status_url: string | null;
  document: GoogleImportRunResource | null;
  agreement: GoogleImportRunResource | null;
  source_document_id: string | null;
  source_revision_id: string | null;
  source_artifact_id: string | null;
  source_mime_type: string | null;
  ingestion_mode: string | null;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  } | null;
}

export interface LineagePresentationRules {
  frontend_presentation_only: boolean;
  diagnostics_owned_by_backend: boolean;
  warning_precedence: string[];
  candidate_review_visibility: string;
}

export interface Phase1LineageContractFixtures {
  schema_version: number;
  presentation_rules: LineagePresentationRules;
  metadata_baseline: SourceMetadataBaseline;
  states: {
    document_native: DocumentLineageDetail;
    document_empty: DocumentLineageDetail;
    agreement_native: AgreementLineageDetail;
    agreement_empty: AgreementLineageDetail;
    import_running: GoogleImportLineageStatus;
    import_linked: GoogleImportLineageStatus;
  };
}

export interface GoogleImportRedirectRoutes {
  documents: string;
  fallback: string;
  agreements?: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asOptionalString(value: unknown): string | undefined {
  const normalized = asString(value);
  return normalized || undefined;
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function asOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => asString(item)).filter(Boolean) : [];
}

function asOptionalRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function normalizeLineageReference(value: unknown): LineageReference | null {
  const record = asRecord(value);
  const id = asString(record.id);
  if (!id) {
    return null;
  }
  return {
    id,
    label: asOptionalString(record.label),
    url: asOptionalString(record.url),
  };
}

function normalizeSourceRevisionSummary(value: unknown): SourceRevisionSummary | null {
  const record = asRecord(value);
  const id = asString(record.id);
  if (!id) {
    return null;
  }
  return {
    id,
    provider_revision_hint: asOptionalString(record.provider_revision_hint),
    modified_time: asOptionalString(record.modified_time),
    exported_at: asOptionalString(record.exported_at),
    exported_by_user_id: asOptionalString(record.exported_by_user_id),
    source_mime_type: asOptionalString(record.source_mime_type),
  };
}

function normalizeSourceArtifactSummary(value: unknown): SourceArtifactSummary | null {
  const record = asRecord(value);
  const id = asString(record.id);
  if (!id) {
    return null;
  }
  return {
    id,
    artifact_kind: asString(record.artifact_kind),
    object_key: asOptionalString(record.object_key),
    sha256: asOptionalString(record.sha256),
    page_count: asOptionalNumber(record.page_count),
    size_bytes: asOptionalNumber(record.size_bytes),
    compatibility_tier: asOptionalString(record.compatibility_tier),
    compatibility_reason: asOptionalString(record.compatibility_reason),
    normalization_status: asOptionalString(record.normalization_status),
  };
}

function normalizeSourceMetadataBaseline(value: unknown): SourceMetadataBaseline | null {
  const record = asRecord(value);
  const externalFileID = asString(record.external_file_id);
  if (!externalFileID) {
    return null;
  }
  return {
    account_id: asString(record.account_id),
    external_file_id: externalFileID,
    drive_id: asOptionalString(record.drive_id),
    web_url: asString(record.web_url),
    modified_time: asOptionalString(record.modified_time),
    source_version_hint: asString(record.source_version_hint),
    source_mime_type: asString(record.source_mime_type),
    source_ingestion_mode: asString(record.source_ingestion_mode),
    title_hint: asString(record.title_hint),
    page_count_hint: asNumber(record.page_count_hint),
    owner_email: asOptionalString(record.owner_email),
    parent_id: asOptionalString(record.parent_id),
  };
}

function normalizeFingerprintStatusSummary(value: unknown): FingerprintStatusSummary {
  const record = asRecord(value);
  return {
    status: asString(record.status),
    extract_version: asOptionalString(record.extract_version),
    evidence_available: asBoolean(record.evidence_available),
    error_message: asOptionalString(record.error_message),
    error_code: asOptionalString(record.error_code),
  };
}

function normalizeCandidateEvidenceSummary(value: unknown): CandidateEvidenceSummary {
  const record = asRecord(value);
  return {
    code: asString(record.code),
    label: asString(record.label),
    details: asOptionalString(record.details),
  };
}

export function normalizeCandidateWarningSummary(value: unknown): CandidateWarningSummary {
  const record = asRecord(value);
  return {
    id: asString(record.id),
    relationship_type: asString(record.relationship_type),
    status: asString(record.status),
    confidence_band: asString(record.confidence_band),
    confidence_score: asOptionalNumber(record.confidence_score),
    summary: asString(record.summary),
    evidence: Array.isArray(record.evidence) ? record.evidence.map(normalizeCandidateEvidenceSummary) : [],
    review_action_visible: asOptionalString(record.review_action_visible),
  };
}

export function normalizeLineagePresentationWarning(value: unknown): LineagePresentationWarning {
  const record = asRecord(value);
  return {
    id: asString(record.id),
    type: asString(record.type),
    severity: asString(record.severity),
    title: asString(record.title),
    description: asString(record.description),
    action_label: asOptionalString(record.action_label),
    action_url: asOptionalString(record.action_url),
    review_action_visible: asOptionalString(record.review_action_visible),
    evidence: Array.isArray(record.evidence) ? record.evidence.map(normalizeCandidateEvidenceSummary) : [],
  };
}

function normalizeLineageEmptyState(value: unknown): LineageEmptyState {
  const record = asRecord(value);
  return {
    kind: asString(record.kind),
    title: asOptionalString(record.title),
    description: asOptionalString(record.description),
  };
}

function normalizeNewerSourceSummary(value: unknown): NewerSourceSummary | null {
  const record = asRecord(value);
  if (Object.keys(record).length === 0) {
    return null;
  }
  return {
    exists: asBoolean(record.exists),
    pinned_source_revision_id: asOptionalString(record.pinned_source_revision_id),
    latest_source_revision_id: asOptionalString(record.latest_source_revision_id),
    summary: asOptionalString(record.summary),
  };
}

export function normalizeDocumentLineageDetail(value: unknown): DocumentLineageDetail {
  const record = asRecord(value);
  return {
    document_id: asString(record.document_id),
    source_document: normalizeLineageReference(record.source_document),
    source_revision: normalizeSourceRevisionSummary(record.source_revision),
    source_artifact: normalizeSourceArtifactSummary(record.source_artifact),
    google_source: normalizeSourceMetadataBaseline(record.google_source),
    fingerprint_status: normalizeFingerprintStatusSummary(record.fingerprint_status),
    candidate_warning_summary: Array.isArray(record.candidate_warning_summary)
      ? record.candidate_warning_summary.map(normalizeCandidateWarningSummary)
      : [],
    presentation_warnings: Array.isArray(record.presentation_warnings)
      ? record.presentation_warnings.map(normalizeLineagePresentationWarning)
      : [],
    diagnostics_url: asOptionalString(record.diagnostics_url),
    empty_state: normalizeLineageEmptyState(record.empty_state),
  };
}

export function normalizeAgreementLineageDetail(value: unknown): AgreementLineageDetail {
  const record = asRecord(value);
  return {
    agreement_id: asString(record.agreement_id),
    pinned_source_revision_id: asOptionalString(record.pinned_source_revision_id),
    source_document: normalizeLineageReference(record.source_document),
    source_revision: normalizeSourceRevisionSummary(record.source_revision),
    linked_document_artifact: normalizeSourceArtifactSummary(record.linked_document_artifact),
    google_source: normalizeSourceMetadataBaseline(record.google_source),
    newer_source_exists: asBoolean(record.newer_source_exists),
    newer_source_summary: normalizeNewerSourceSummary(record.newer_source_summary),
    candidate_warning_summary: Array.isArray(record.candidate_warning_summary)
      ? record.candidate_warning_summary.map(normalizeCandidateWarningSummary)
      : [],
    presentation_warnings: Array.isArray(record.presentation_warnings)
      ? record.presentation_warnings.map(normalizeLineagePresentationWarning)
      : [],
    diagnostics_url: asOptionalString(record.diagnostics_url),
    empty_state: normalizeLineageEmptyState(record.empty_state),
  };
}

export function normalizeGoogleImportLineageStatus(value: unknown): GoogleImportLineageStatus {
  const record = asRecord(value);
  return {
    import_run_id: asString(record.import_run_id),
    lineage_status: asString(record.lineage_status),
    source_document: normalizeLineageReference(record.source_document),
    source_revision: normalizeSourceRevisionSummary(record.source_revision),
    source_artifact: normalizeSourceArtifactSummary(record.source_artifact),
    fingerprint_status: normalizeFingerprintStatusSummary(record.fingerprint_status),
    candidate_status: Array.isArray(record.candidate_status)
      ? record.candidate_status.map(normalizeCandidateWarningSummary)
      : [],
    document_detail_url: asOptionalString(record.document_detail_url) ?? null,
    agreement_detail_url: asOptionalString(record.agreement_detail_url) ?? null,
  };
}

function normalizeGoogleImportRunResource(value: unknown): GoogleImportRunResource | null {
  const record = asRecord(value);
  const id = asString(record.id);
  if (!id) {
    return null;
  }
  return {
    id,
    document_id: asOptionalString(record.document_id),
    title: asOptionalString(record.title),
    source_type: asOptionalString(record.source_type),
    source_google_file_id: asOptionalString(record.source_google_file_id),
    source_google_doc_url: asOptionalString(record.source_google_doc_url),
    source_modified_time: asOptionalString(record.source_modified_time),
    source_exported_at: asOptionalString(record.source_exported_at),
    source_exported_by_user_id: asOptionalString(record.source_exported_by_user_id),
    source_mime_type: asOptionalString(record.source_mime_type),
    source_ingestion_mode: asOptionalString(record.source_ingestion_mode),
    source_document_id: asOptionalString(record.source_document_id),
    source_revision_id: asOptionalString(record.source_revision_id),
    source_artifact_id: asOptionalString(record.source_artifact_id),
  };
}

export function normalizeGoogleImportRunHandle(value: unknown): GoogleImportRunHandle {
  const record = asRecord(value);
  return {
    import_run_id: asString(record.import_run_id),
    status: asString(record.status),
    status_url: asOptionalString(record.status_url) ?? null,
  };
}

export function normalizeGoogleImportRunDetail(value: unknown): GoogleImportRunDetail {
  const record = asRecord(value);
  const lineage = normalizeGoogleImportLineageStatus(record);
  const errorRecord = asRecord(record.error);
  const errorDetails = asOptionalRecord(errorRecord.details);
  const errorCode = asString(errorRecord.code);
  const errorMessage = asString(errorRecord.message);

  return {
    ...lineage,
    status: asString(record.status),
    status_url: asOptionalString(record.status_url) ?? null,
    document: normalizeGoogleImportRunResource(record.document),
    agreement: normalizeGoogleImportRunResource(record.agreement),
    source_document_id: asOptionalString(record.source_document_id) ?? null,
    source_revision_id: asOptionalString(record.source_revision_id) ?? null,
    source_artifact_id: asOptionalString(record.source_artifact_id) ?? null,
    source_mime_type: asOptionalString(record.source_mime_type) ?? null,
    ingestion_mode: asOptionalString(record.ingestion_mode) ?? null,
    error: errorCode || errorMessage
      ? {
          code: errorCode,
          message: errorMessage,
          ...(errorDetails ? { details: errorDetails } : {}),
        }
      : null,
  };
}

export function isTerminalGoogleImportStatus(status: string): boolean {
  return status === 'succeeded' || status === 'failed';
}

export function resolveGoogleImportRedirectURL(
  response: Pick<
    GoogleImportRunDetail,
    'agreement_detail_url' | 'document_detail_url' | 'agreement' | 'document'
  >,
  routes: GoogleImportRedirectRoutes
): string {
  if (response.agreement_detail_url) {
    return response.agreement_detail_url;
  }
  if (response.document_detail_url) {
    return response.document_detail_url;
  }
  if (response.agreement?.id && routes.agreements) {
    return `${routes.agreements}/${encodeURIComponent(response.agreement.id)}`;
  }
  if (response.document?.id) {
    return `${routes.documents}/${encodeURIComponent(response.document.id)}`;
  }
  return routes.fallback;
}

export function normalizePhase1LineageContractFixtures(value: unknown): Phase1LineageContractFixtures {
  const record = asRecord(value);
  const states = asRecord(record.states);
  const metadata = normalizeSourceMetadataBaseline(record.metadata_baseline);

  return {
    schema_version: asNumber(record.schema_version),
    presentation_rules: {
      frontend_presentation_only: asBoolean(asRecord(record.presentation_rules).frontend_presentation_only),
      diagnostics_owned_by_backend: asBoolean(asRecord(record.presentation_rules).diagnostics_owned_by_backend),
      warning_precedence: asStringArray(asRecord(record.presentation_rules).warning_precedence),
      candidate_review_visibility: asString(asRecord(record.presentation_rules).candidate_review_visibility),
    },
    metadata_baseline: metadata ?? {
      account_id: '',
      external_file_id: '',
      web_url: '',
      source_version_hint: '',
      source_mime_type: '',
      source_ingestion_mode: '',
      title_hint: '',
      page_count_hint: 0,
    },
    states: {
      document_native: normalizeDocumentLineageDetail(states.document_native),
      document_empty: normalizeDocumentLineageDetail(states.document_empty),
      agreement_native: normalizeAgreementLineageDetail(states.agreement_native),
      agreement_empty: normalizeAgreementLineageDetail(states.agreement_empty),
      import_running: normalizeGoogleImportLineageStatus(states.import_running),
      import_linked: normalizeGoogleImportLineageStatus(states.import_linked),
    },
  };
}

// ============================================================================
// Phase 11 Source-Management Contract Types (Task 11.7)
// ============================================================================

/**
 * Source-management contract types that mirror backend-owned DTOs.
 * These types provide provider-neutral, source-centric contracts for Version 2 landing-zone work.
 *
 * IMPORTANT: Frontend must NOT add semantic fields for lineage meaning, warning precedence,
 * or source continuity. All business logic lives in backend-owned read models.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 11 Task 11.7
 * @see examples/esign/services/lineage_contracts.go (backend source of truth)
 */

/**
 * Fingerprint processing state summary.
 * Extends basic fingerprint status with processing lifecycle metadata.
 */
export interface FingerprintProcessingSummary {
  state: string;
  status_label?: string;
  started_at?: string;
  completed_at?: string;
  last_attempt_at?: string;
  attempt_count: number;
  last_error_code?: string;
  last_error_message?: string;
  retryable: boolean;
  stale: boolean;
}

/**
 * Navigation and action links for source-management resources.
 */
export interface SourceManagementLinks {
  self?: string;
  source?: string;
  revisions?: string;
  relationships?: string;
  handles?: string;
  diagnostics?: string;
  provider?: string;
  artifacts?: string;
  comments?: string;
}

/**
 * Permission-aware visibility flags for source-management surfaces.
 */
export interface SourceManagementPermissions {
  can_view_diagnostics: boolean;
  can_open_provider_links: boolean;
  can_review_candidates: boolean;
  can_view_comments: boolean;
}

/**
 * Provider-specific metadata envelope for extensibility.
 */
export interface SourceProviderExtensionEnvelope {
  schema: string;
  values?: Record<string, unknown>;
}

/**
 * Provider-neutral source summary.
 * Replaces direct Google-specific naming in Version 2 source-management contracts.
 */
export interface SourceProviderSummary {
  kind: string;
  label: string;
  external_file_id?: string;
  account_id?: string;
  drive_id?: string;
  web_url?: string;
  extension?: SourceProviderExtensionEnvelope;
}

/**
 * Pagination metadata for source-management list endpoints.
 */
export interface SourceManagementPageInfo {
  mode: string;
  page: number;
  page_size: number;
  total_count: number;
  has_more: boolean;
  sort?: string;
}

/**
 * Source handle summary for multi-handle scenarios.
 */
export interface SourceHandleSummary {
  id: string;
  provider_kind: string;
  external_file_id: string;
  account_id?: string;
  drive_id?: string;
  web_url?: string;
  handle_status: string;
  valid_from?: string;
  valid_to?: string;
  links: SourceManagementLinks;
}

/**
 * Source revision list item for revision timeline displays.
 */
export interface SourceRevisionListItem {
  revision: SourceRevisionSummary | null;
  provider: SourceProviderSummary | null;
  primary_artifact: SourceArtifactSummary | null;
  fingerprint_status: FingerprintStatusSummary;
  fingerprint_processing: FingerprintProcessingSummary;
  is_latest: boolean;
  links: SourceManagementLinks;
}

/**
 * Source relationship summary for candidate review and graph displays.
 */
export interface SourceRelationshipSummary {
  id: string;
  relationship_type: string;
  status: string;
  confidence_band: string;
  confidence_score?: number;
  summary: string;
  left_source: LineageReference | null;
  right_source: LineageReference | null;
  counterpart_source: LineageReference | null;
  review_action_visible?: string;
  evidence: CandidateEvidenceSummary[];
  links: SourceManagementLinks;
}

/**
 * Source comment anchor summary for comment thread positioning.
 */
export interface SourceCommentAnchorSummary {
  kind?: string;
  label?: string;
}

/**
 * Source comment thread summary for source-level comments.
 */
export interface SourceCommentThreadSummary {
  id: string;
  provider_comment_id?: string;
  thread_id?: string;
  status?: string;
  anchor: SourceCommentAnchorSummary | null;
  author_name?: string;
  body_preview?: string;
  message_count: number;
  reply_count: number;
  resolved_at?: string;
  last_synced_at?: string;
  sync_status?: string;
  links: SourceManagementLinks;
}

/**
 * Source search result summary.
 */
export interface SourceSearchResultSummary {
  result_kind: string;
  source: LineageReference | null;
  revision: SourceRevisionSummary | null;
  provider: SourceProviderSummary | null;
  matched_fields: string[];
  summary?: string;
  links: SourceManagementLinks;
}

/**
 * Source list item for source browser display.
 */
export interface SourceListItem {
  source: LineageReference | null;
  status: string;
  lineage_confidence: string;
  provider: SourceProviderSummary | null;
  latest_revision: SourceRevisionSummary | null;
  active_handle: SourceHandleSummary | null;
  revision_count: number;
  handle_count: number;
  relationship_count: number;
  pending_candidate_count: number;
  permissions: SourceManagementPermissions;
  links: SourceManagementLinks;
}

/**
 * Source list query parameters.
 */
export interface SourceListQuery {
  query?: string;
  provider_kind?: string;
  status?: string;
  has_pending_candidates?: boolean;
  sort?: string;
  page?: number;
  page_size?: number;
}

/**
 * Source revision list query parameters.
 */
export interface SourceRevisionListQuery {
  sort?: string;
  page?: number;
  page_size?: number;
}

/**
 * Source relationship list query parameters.
 */
export interface SourceRelationshipListQuery {
  status?: string;
  relationship_type?: string;
  sort?: string;
  page?: number;
  page_size?: number;
}

/**
 * Source search query parameters.
 */
export interface SourceSearchQuery {
  query?: string;
  provider_kind?: string;
  status?: string;
  sort?: string;
  page?: number;
  page_size?: number;
}

/**
 * Source list page response.
 */
export interface SourceListPage {
  items: SourceListItem[];
  page_info: SourceManagementPageInfo;
  applied_query: SourceListQuery;
  permissions: SourceManagementPermissions;
  empty_state: LineageEmptyState;
  links: SourceManagementLinks;
}

/**
 * Source detail response.
 */
export interface SourceDetail {
  source: LineageReference | null;
  status: string;
  lineage_confidence: string;
  provider: SourceProviderSummary | null;
  active_handle: SourceHandleSummary | null;
  latest_revision: SourceRevisionSummary | null;
  revision_count: number;
  handle_count: number;
  relationship_count: number;
  pending_candidate_count: number;
  permissions: SourceManagementPermissions;
  links: SourceManagementLinks;
  empty_state: LineageEmptyState;
}

/**
 * Source revision page response.
 */
export interface SourceRevisionPage {
  source: LineageReference | null;
  items: SourceRevisionListItem[];
  page_info: SourceManagementPageInfo;
  applied_query: SourceRevisionListQuery;
  permissions: SourceManagementPermissions;
  empty_state: LineageEmptyState;
  links: SourceManagementLinks;
}

/**
 * Source relationship page response.
 */
export interface SourceRelationshipPage {
  source: LineageReference | null;
  items: SourceRelationshipSummary[];
  page_info: SourceManagementPageInfo;
  applied_query: SourceRelationshipListQuery;
  permissions: SourceManagementPermissions;
  empty_state: LineageEmptyState;
  links: SourceManagementLinks;
}

/**
 * Source handle page response.
 */
export interface SourceHandlePage {
  source: LineageReference | null;
  items: SourceHandleSummary[];
  page_info: SourceManagementPageInfo;
  permissions: SourceManagementPermissions;
  empty_state: LineageEmptyState;
  links: SourceManagementLinks;
}

/**
 * Source revision detail response.
 */
export interface SourceRevisionDetail {
  source: LineageReference | null;
  revision: SourceRevisionSummary | null;
  provider: SourceProviderSummary | null;
  fingerprint_status: FingerprintStatusSummary;
  fingerprint_processing: FingerprintProcessingSummary;
  permissions: SourceManagementPermissions;
  links: SourceManagementLinks;
  empty_state: LineageEmptyState;
}

/**
 * Source artifact page response.
 */
export interface SourceArtifactPage {
  revision: SourceRevisionSummary | null;
  items: SourceArtifactSummary[];
  page_info: SourceManagementPageInfo;
  permissions: SourceManagementPermissions;
  empty_state: LineageEmptyState;
  links: SourceManagementLinks;
}

/**
 * Source comment page response.
 */
export interface SourceCommentPage {
  revision: SourceRevisionSummary | null;
  items: SourceCommentThreadSummary[];
  page_info: SourceManagementPageInfo;
  permissions: SourceManagementPermissions;
  empty_state: LineageEmptyState;
  sync_status: string;
  links: SourceManagementLinks;
}

/**
 * Source search results response.
 */
export interface SourceSearchResults {
  items: SourceSearchResultSummary[];
  page_info: SourceManagementPageInfo;
  applied_query: SourceSearchQuery;
  permissions: SourceManagementPermissions;
  empty_state: LineageEmptyState;
  links: SourceManagementLinks;
}

/**
 * Source-management contract rules.
 * Defines pagination mode, page sizes, sort options, and visibility rules.
 */
export interface SourceManagementContractRules {
  frontend_presentation_only: boolean;
  pagination_mode: string;
  default_page_size: number;
  max_page_size: number;
  supported_source_sorts: string[];
  supported_revision_sorts: string[];
  supported_relationship_sorts: string[];
  supported_search_sorts: string[];
  provider_link_visibility: string;
  diagnostics_visibility: string;
  candidate_review_visibility: string;
}

/**
 * Phase 11 source-management query fixtures.
 */
export interface Phase11SourceManagementQueryFixtures {
  list_sources: SourceListQuery;
  list_revisions: SourceRevisionListQuery;
  list_relationships: SourceRelationshipListQuery;
  search: SourceSearchQuery;
}

/**
 * Phase 11 source-management fixture states.
 */
export interface Phase11SourceManagementFixtureStates {
  source_list_empty: SourceListPage;
  source_list_single: SourceListPage;
  source_detail_repeated: SourceDetail;
  source_handles_multi: SourceHandlePage;
  source_revisions_repeated: SourceRevisionPage;
  source_relationships_review: SourceRelationshipPage;
  source_revision_detail: SourceRevisionDetail;
  source_artifacts: SourceArtifactPage;
  source_comments_empty: SourceCommentPage;
  source_search_results: SourceSearchResults;
  source_detail_merged: SourceDetail;
  source_detail_archived: SourceDetail;
}

/**
 * Phase 11 source-management contract fixtures.
 * Backend-owned example payloads for contract validation and UI development.
 */
export interface Phase11SourceManagementContractFixtures {
  schema_version: number;
  rules: SourceManagementContractRules;
  queries: Phase11SourceManagementQueryFixtures;
  states: Phase11SourceManagementFixtureStates;
}

// ============================================================================
// Phase 13 Source-Search And Source-Comment Contract Types (Task 13.8)
// ============================================================================

/**
 * Comment sync status constants.
 * These constants define the possible states for source comment synchronization.
 *
 * IMPORTANT: Frontend must NOT compute sync status semantics. Use these constants
 * for display formatting only - all sync state decisions are backend-owned.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 13 Task 13.8
 */
export const COMMENT_SYNC_STATUS = {
  /** Comment sync not configured for this source/provider */
  NOT_CONFIGURED: 'not_configured',
  /** Comment sync is pending; data may be incomplete */
  PENDING_SYNC: 'pending_sync',
  /** Comments are fully synced from provider */
  SYNCED: 'synced',
  /** Comment sync failed; check error details */
  FAILED: 'failed',
  /** Synced data is stale; resync may be needed */
  STALE: 'stale',
} as const;

/**
 * Type representing valid comment sync status values.
 */
export type CommentSyncStatus = (typeof COMMENT_SYNC_STATUS)[keyof typeof COMMENT_SYNC_STATUS];

/**
 * Check if a status string is a valid comment sync status.
 */
export function isValidCommentSyncStatus(status: string): status is CommentSyncStatus {
  return Object.values(COMMENT_SYNC_STATUS).includes(status as CommentSyncStatus);
}

/**
 * Search result kind constants.
 * Indicates whether a search result represents a source document or source revision.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 13 Task 13.8
 */
export const SEARCH_RESULT_KIND = {
  /** Result is a source document */
  SOURCE_DOCUMENT: 'source_document',
  /** Result is a source revision */
  SOURCE_REVISION: 'source_revision',
} as const;

/**
 * Type representing valid search result kind values.
 */
export type SearchResultKind = (typeof SEARCH_RESULT_KIND)[keyof typeof SEARCH_RESULT_KIND];

/**
 * Extended source search query parameters for Phase 13.
 * Adds comment sync status, relationship state, and comment presence filters.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 13 Task 13.8
 */
export interface Phase13SourceSearchQuery extends SourceSearchQuery {
  /** Filter by result kind: 'source_document' or 'source_revision' */
  result_kind?: string;
  /** Filter by relationship state: 'pending_review', 'confirmed', etc. */
  relationship_state?: string;
  /** Filter by comment sync status: 'synced', 'pending_sync', 'failed', etc. */
  comment_sync_status?: string;
  /** Filter by revision hint */
  revision_hint?: string;
  /** Filter by presence of comments (true = has comments, false = no comments) */
  has_comments?: boolean;
}

/**
 * Extended source search result summary for Phase 13.
 * Includes comment sync status, comment count, and artifact hash fields.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 13 Task 13.8
 */
export interface Phase13SourceSearchResultSummary extends SourceSearchResultSummary {
  /** Aggregated relationship state across source relationships */
  relationship_state?: string;
  /** Aggregated comment sync status across source revisions */
  comment_sync_status?: string;
  /** Total comment count for this result */
  comment_count?: number;
  /** Whether this result has any comments */
  has_comments?: boolean;
  /** SHA256 hash of primary artifact (for fingerprint matching) */
  artifact_hash?: string;
}

/**
 * Extended source search results response for Phase 13.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 13 Task 13.8
 */
export interface Phase13SourceSearchResults {
  items: Phase13SourceSearchResultSummary[];
  page_info: SourceManagementPageInfo;
  applied_query: Phase13SourceSearchQuery;
  permissions: SourceManagementPermissions;
  empty_state: LineageEmptyState;
  links: SourceManagementLinks;
}

/**
 * Source comment author summary.
 * Provider-normalized author information for comment threads and messages.
 *
 * IMPORTANT: Frontend must NOT derive author identity semantics from these fields.
 * Display only - all author resolution is backend-owned.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 13 Task 13.8
 */
export interface SourceCommentAuthorSummary {
  /** Author's display name */
  display_name?: string;
  /** Author's email address */
  email?: string;
  /** Author type: 'user', 'bot', 'service_account', etc. */
  type?: string;
}

/**
 * Source comment message summary.
 * Represents an individual message within a comment thread.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 13 Task 13.8
 */
export interface SourceCommentMessageSummary {
  /** Internal message ID */
  id: string;
  /** Provider's message ID */
  provider_message_id?: string;
  /** Message kind: 'comment', 'reply', 'suggestion', etc. */
  message_kind?: string;
  /** Truncated body text (max 240 chars) */
  body_preview?: string;
  /** Full author information */
  author?: SourceCommentAuthorSummary;
  /** When message was created */
  created_at?: string;
}

/**
 * Source comment sync summary.
 * Detailed synchronization state for comment threads.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 13 Task 13.8
 */
export interface SourceCommentSyncSummary {
  /** Current sync status */
  status: string;
  /** Number of synced threads */
  thread_count: number;
  /** Total number of synced messages across all threads */
  message_count: number;
  /** When sync was last attempted */
  last_attempt_at?: string;
  /** When sync last succeeded */
  last_synced_at?: string;
  /** Error code if sync failed (e.g., 'QUOTA_EXCEEDED', 'AUTH_EXPIRED') */
  error_code?: string;
  /** Human-readable error message */
  error_message?: string;
}

/**
 * Extended source comment thread summary for Phase 13.
 * Includes full author information and messages array.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 13 Task 13.8
 */
export interface Phase13SourceCommentThreadSummary extends SourceCommentThreadSummary {
  /** Full author information (not just author_name) */
  author?: SourceCommentAuthorSummary;
  /** Source reference for navigation */
  source?: LineageReference;
  /** Revision reference for navigation */
  revision?: SourceRevisionSummary;
  /** Messages in this thread (main comment + replies) */
  messages?: SourceCommentMessageSummary[];
  /** When thread was last active */
  last_activity_at?: string;
}

/**
 * Source comment list query parameters.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 13 Task 13.8
 */
export interface SourceCommentListQuery {
  /** Filter by thread status: 'open', 'resolved', 'deleted' */
  status?: string;
  /** Filter by sync status: 'synced', 'pending_sync', 'failed', etc. */
  sync_status?: string;
  /** Page number (1-indexed) */
  page?: number;
  /** Page size */
  page_size?: number;
}

/**
 * Extended source comment page response for Phase 13.
 * Includes source reference and detailed sync summary.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 13 Task 13.8
 */
export interface Phase13SourceCommentPage {
  /** Source document reference */
  source?: LineageReference;
  /** Source revision reference */
  revision?: SourceRevisionSummary;
  /** Comment thread summaries */
  items: Phase13SourceCommentThreadSummary[];
  /** Applied query parameters */
  applied_query: SourceCommentListQuery;
  /** Pagination info */
  page_info: SourceManagementPageInfo;
  /** Permission flags */
  permissions: SourceManagementPermissions;
  /** Empty state info */
  empty_state: LineageEmptyState;
  /** Current aggregated sync status */
  sync_status: string;
  /** Detailed sync summary */
  sync?: SourceCommentSyncSummary;
  /** Navigation links */
  links: SourceManagementLinks;
}

// ============================================================================
// Phase 13 Contract Normalization Helpers (Task 13.8)
// ============================================================================

/**
 * Normalize Phase 13 source search query from raw transport.
 */
export function normalizePhase13SourceSearchQuery(value: unknown): Phase13SourceSearchQuery {
  const record = asRecord(value);
  return {
    query: asString(record.query),
    provider_kind: asOptionalString(record.provider_kind),
    status: asOptionalString(record.status),
    sort: asOptionalString(record.sort),
    page: asOptionalNumber(record.page),
    page_size: asOptionalNumber(record.page_size),
    result_kind: asOptionalString(record.result_kind),
    relationship_state: asOptionalString(record.relationship_state),
    comment_sync_status: asOptionalString(record.comment_sync_status),
    revision_hint: asOptionalString(record.revision_hint),
    has_comments: typeof record.has_comments === 'boolean' ? record.has_comments : undefined,
  };
}

/**
 * Normalize source comment author summary from raw transport.
 */
export function normalizeSourceCommentAuthorSummary(
  value: unknown
): SourceCommentAuthorSummary | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const record = asRecord(value);
  return {
    display_name: asOptionalString(record.display_name),
    email: asOptionalString(record.email),
    type: asOptionalString(record.type),
  };
}

/**
 * Normalize source comment message summary from raw transport.
 */
export function normalizeSourceCommentMessageSummary(
  value: unknown
): SourceCommentMessageSummary {
  const record = asRecord(value);
  return {
    id: asString(record.id),
    provider_message_id: asOptionalString(record.provider_message_id),
    message_kind: asOptionalString(record.message_kind),
    body_preview: asOptionalString(record.body_preview),
    author: normalizeSourceCommentAuthorSummary(record.author),
    created_at: asOptionalString(record.created_at),
  };
}

/**
 * Normalize source comment sync summary from raw transport.
 */
export function normalizeSourceCommentSyncSummary(
  value: unknown
): SourceCommentSyncSummary | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const record = asRecord(value);
  return {
    status: asString(record.status),
    thread_count: asNumber(record.thread_count),
    message_count: asNumber(record.message_count),
    last_attempt_at: asOptionalString(record.last_attempt_at),
    last_synced_at: asOptionalString(record.last_synced_at),
    error_code: asOptionalString(record.error_code),
    error_message: asOptionalString(record.error_message),
  };
}

/**
 * Normalize Phase 13 source comment thread summary from raw transport.
 */
export function normalizePhase13SourceCommentThreadSummary(
  value: unknown
): Phase13SourceCommentThreadSummary {
  const record = asRecord(value);
  const anchor = asRecord(record.anchor);

  return {
    id: asString(record.id),
    provider_comment_id: asOptionalString(record.provider_comment_id),
    thread_id: asOptionalString(record.thread_id),
    status: asOptionalString(record.status),
    anchor: {
      kind: asOptionalString(anchor.kind),
      label: asOptionalString(anchor.label),
    },
    author_name: asOptionalString(record.author_name),
    author: normalizeSourceCommentAuthorSummary(record.author),
    body_preview: asOptionalString(record.body_preview),
    message_count: asNumber(record.message_count),
    reply_count: asNumber(record.reply_count),
    resolved_at: asOptionalString(record.resolved_at),
    last_synced_at: asOptionalString(record.last_synced_at),
    last_activity_at: asOptionalString(record.last_activity_at),
    sync_status: asOptionalString(record.sync_status),
    source: normalizeLineageReference(record.source) ?? undefined,
    revision: normalizeSourceRevisionSummary(record.revision) ?? undefined,
    messages: Array.isArray(record.messages)
      ? record.messages.map(normalizeSourceCommentMessageSummary)
      : undefined,
    links: asRecord(record.links) as SourceManagementLinks,
  };
}

/**
 * Normalize Phase 13 source search result summary from raw transport.
 */
export function normalizePhase13SourceSearchResultSummary(
  value: unknown
): Phase13SourceSearchResultSummary {
  const record = asRecord(value);
  return {
    result_kind: asString(record.result_kind),
    source: normalizeLineageReference(record.source),
    revision: normalizeSourceRevisionSummary(record.revision),
    provider: normalizeSourceProviderSummary(record.provider),
    matched_fields: asStringArray(record.matched_fields),
    summary: asOptionalString(record.summary),
    relationship_state: asOptionalString(record.relationship_state),
    comment_sync_status: asOptionalString(record.comment_sync_status),
    comment_count: asOptionalNumber(record.comment_count),
    has_comments: typeof record.has_comments === 'boolean' ? record.has_comments : undefined,
    artifact_hash: asOptionalString(record.artifact_hash),
    links: asRecord(record.links) as SourceManagementLinks,
  };
}

/**
 * Normalize Phase 13 source comment page from raw transport.
 */
export function normalizePhase13SourceCommentPage(value: unknown): Phase13SourceCommentPage {
  const record = asRecord(value);
  return {
    source: normalizeLineageReference(record.source) ?? undefined,
    revision: normalizeSourceRevisionSummary(record.revision) ?? undefined,
    items: Array.isArray(record.items)
      ? record.items.map(normalizePhase13SourceCommentThreadSummary)
      : [],
    applied_query: normalizeSourceCommentListQuery(record.applied_query),
    page_info: normalizeSourceManagementPageInfo(record.page_info),
    permissions: normalizeSourceManagementPermissions(record.permissions),
    empty_state: normalizeLineageEmptyState(record.empty_state),
    sync_status: asString(record.sync_status),
    sync: normalizeSourceCommentSyncSummary(record.sync),
    links: asRecord(record.links) as SourceManagementLinks,
  };
}

/**
 * Normalize Phase 13 source search results from raw transport.
 */
export function normalizePhase13SourceSearchResults(value: unknown): Phase13SourceSearchResults {
  const record = asRecord(value);
  return {
    items: Array.isArray(record.items)
      ? record.items.map(normalizePhase13SourceSearchResultSummary)
      : [],
    page_info: normalizeSourceManagementPageInfo(record.page_info),
    applied_query: normalizePhase13SourceSearchQuery(record.applied_query),
    permissions: normalizeSourceManagementPermissions(record.permissions),
    empty_state: normalizeLineageEmptyState(record.empty_state),
    links: asRecord(record.links) as SourceManagementLinks,
  };
}

// Internal normalization helpers used by Phase 13 normalizers

function normalizeSourceCommentListQuery(value: unknown): SourceCommentListQuery {
  const record = asRecord(value);
  return {
    status: asOptionalString(record.status),
    sync_status: asOptionalString(record.sync_status),
    page: asOptionalNumber(record.page),
    page_size: asOptionalNumber(record.page_size),
  };
}

function normalizeSourceManagementPageInfo(value: unknown): SourceManagementPageInfo {
  const record = asRecord(value);
  return {
    mode: asString(record.mode) || 'page',
    page: asNumber(record.page) || 1,
    page_size: asNumber(record.page_size) || 20,
    total_count: asNumber(record.total_count),
    has_more: asBoolean(record.has_more),
    sort: asOptionalString(record.sort),
  };
}

function normalizeSourceManagementPermissions(value: unknown): SourceManagementPermissions {
  const record = asRecord(value);
  return {
    can_view_diagnostics: asBoolean(record.can_view_diagnostics),
    can_open_provider_links: asBoolean(record.can_open_provider_links),
    can_review_candidates: asBoolean(record.can_review_candidates),
    can_view_comments: asBoolean(record.can_view_comments),
  };
}

function normalizeSourceProviderSummary(value: unknown): SourceProviderSummary | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = asRecord(value);
  const kind = asString(record.kind);
  if (!kind) {
    return null;
  }
  return {
    kind,
    label: asString(record.label),
    external_file_id: asOptionalString(record.external_file_id),
    account_id: asOptionalString(record.account_id),
    drive_id: asOptionalString(record.drive_id),
    web_url: asOptionalString(record.web_url),
    extension: normalizeProviderExtensionEnvelope(record.extension),
  };
}

function normalizeProviderExtensionEnvelope(
  value: unknown
): SourceProviderExtensionEnvelope | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const record = asRecord(value);
  const schema = asString(record.schema);
  if (!schema) {
    return undefined;
  }
  return {
    schema,
    values: asOptionalRecord(record.values),
  };
}

// ============================================================================
// Phase 13 Fixture Types (Task 13.8)
// ============================================================================

/**
 * Phase 13 source-management query fixtures.
 */
export interface Phase13SourceManagementQueryFixtures {
  search_with_comments: Phase13SourceSearchQuery;
  search_with_relationship_filter: Phase13SourceSearchQuery;
  comment_list_synced: SourceCommentListQuery;
  comment_list_pending: SourceCommentListQuery;
}

/**
 * Phase 13 source-management fixture states.
 */
export interface Phase13SourceManagementFixtureStates {
  search_empty: Phase13SourceSearchResults;
  search_results_with_comments: Phase13SourceSearchResults;
  comments_empty: Phase13SourceCommentPage;
  comments_synced: Phase13SourceCommentPage;
  comments_pending_sync: Phase13SourceCommentPage;
  comments_sync_failed: Phase13SourceCommentPage;
  comments_sync_stale: Phase13SourceCommentPage;
}

/**
 * Phase 13 source-management contract fixtures.
 * Backend-owned example payloads for Phase 13 contract validation.
 */
export interface Phase13SourceManagementContractFixtures {
  schema_version: number;
  rules: SourceManagementContractRules;
  queries: Phase13SourceManagementQueryFixtures;
  states: Phase13SourceManagementFixtureStates;
}
