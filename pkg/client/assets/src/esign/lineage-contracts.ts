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
  workspace?: string;
  queue?: string;
  revisions?: string;
  timeline?: string;
  relationships?: string;
  review?: string;
  handles?: string;
  diagnostics?: string;
  provider?: string;
  artifacts?: string;
  comments?: string;
  agreements?: string;
  agreement?: string;
  anchor?: string;
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

export interface SourceWorkspaceDrillIn {
  panel: string;
  anchor?: string;
  href: string;
}

export const SOURCE_WORKSPACE_PANEL = {
  OVERVIEW: 'overview',
  TIMELINE: 'timeline',
  AGREEMENTS: 'agreements',
  ARTIFACTS: 'artifacts',
  COMMENTS: 'comments',
  HANDLES: 'handles',
} as const;

export type SourceWorkspacePanel =
  (typeof SOURCE_WORKSPACE_PANEL)[keyof typeof SOURCE_WORKSPACE_PANEL];

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
 * Source agreement summary for source workspace agreement drill-ins.
 */
export interface SourceAgreementSummary {
  agreement: LineageReference | null;
  document: LineageReference | null;
  pinned_source_revision: SourceRevisionSummary | null;
  status?: string;
  workflow_kind?: string;
  is_pinned_latest: boolean;
  links: SourceManagementLinks;
}

/**
 * Source agreement list query parameters.
 */
export interface SourceAgreementListQuery {
  status?: string;
  source_revision_id?: string;
  sort?: string;
  page?: number;
  page_size?: number;
}

/**
 * Source agreement page response.
 */
export interface SourceAgreementPage {
  source: LineageReference | null;
  items: SourceAgreementSummary[];
  page_info: SourceManagementPageInfo;
  applied_query: SourceAgreementListQuery;
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
  source?: LineageReference | null;
  revision: SourceRevisionSummary | null;
  items: SourceCommentThreadSummary[];
  applied_query?: SourceCommentListQuery;
  page_info: SourceManagementPageInfo;
  permissions: SourceManagementPermissions;
  empty_state: LineageEmptyState;
  sync_status: string;
  sync?: SourceCommentSyncSummary;
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
 * Source workspace query parameters.
 */
export interface SourceWorkspaceQuery {
  panel?: string;
  anchor?: string;
}

/**
 * Workspace panel summary for canonical source workspace navigation.
 */
export interface SourceWorkspacePanelSummary {
  id: string;
  label: string;
  item_count?: number;
  links: SourceManagementLinks;
}

/**
 * Timeline entry for source revision continuity.
 */
export interface SourceRevisionTimelineEntry {
  revision: SourceRevisionSummary | null;
  handle: SourceHandleSummary | null;
  primary_artifact: SourceArtifactSummary | null;
  comment_count?: number;
  agreement_count?: number;
  artifact_count?: number;
  is_latest: boolean;
  is_repeated_handle: boolean;
  continuity_summary?: string;
  drill_in?: SourceWorkspaceDrillIn;
  links: SourceManagementLinks;
}

/**
 * Revision timeline section of the source workspace.
 */
export interface SourceRevisionTimeline {
  entries: SourceRevisionTimelineEntry[];
  repeated_handle_count?: number;
  handle_transition_count?: number;
  permissions: SourceManagementPermissions;
  empty_state: LineageEmptyState;
  links: SourceManagementLinks;
}

/**
 * Workspace-scoped artifact summary.
 */
export interface SourceWorkspaceArtifactSummary {
  artifact: SourceArtifactSummary | null;
  revision: SourceRevisionSummary | null;
  provider: SourceProviderSummary | null;
  drill_in?: SourceWorkspaceDrillIn;
  links: SourceManagementLinks;
}

/**
 * Workspace artifact page response.
 */
export interface SourceWorkspaceArtifactPage {
  source: LineageReference | null;
  items: SourceWorkspaceArtifactSummary[];
  page_info: SourceManagementPageInfo;
  permissions: SourceManagementPermissions;
  empty_state: LineageEmptyState;
  links: SourceManagementLinks;
}

/**
 * Source continuity summary for workspace header/context.
 */
export interface SourceContinuitySummary {
  status?: string;
  summary?: string;
  continuation: LineageReference | null;
  predecessors: LineageReference[];
  successors: LineageReference[];
  links: SourceManagementLinks;
}

/**
 * Canonical source workspace response.
 */
export interface SourceWorkspace {
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
  active_panel?: string;
  active_anchor?: string;
  panels: SourceWorkspacePanelSummary[];
  continuity: SourceContinuitySummary;
  timeline: SourceRevisionTimeline;
  agreements: SourceAgreementPage;
  artifacts: SourceWorkspaceArtifactPage;
  comments: Phase13SourceCommentPage;
  handles: SourceHandlePage;
  permissions: SourceManagementPermissions;
  links: SourceManagementLinks;
  empty_state: LineageEmptyState;
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
  /** Backend-authored canonical workspace drill-in for the matched result */
  drill_in?: SourceWorkspaceDrillIn;
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
    drill_in: normalizeSourceWorkspaceDrillIn(record.drill_in),
    links: asRecord(record.links) as SourceManagementLinks,
  };
}

export function normalizeSourceWorkspaceDrillIn(
  value: unknown
): SourceWorkspaceDrillIn | undefined {
  const record = asRecord(value);
  const href = asOptionalString(record.href);
  const panel = asOptionalString(record.panel);
  if (!href || !panel) {
    return undefined;
  }
  return {
    panel,
    anchor: asOptionalString(record.anchor),
    href,
  };
}

export function normalizeSourceWorkspaceQuery(value: unknown): SourceWorkspaceQuery {
  const record = asRecord(value);
  return {
    panel: asOptionalString(record.panel),
    anchor: asOptionalString(record.anchor),
  };
}

export function normalizeSourceAgreementSummary(value: unknown): SourceAgreementSummary {
  const record = asRecord(value);
  return {
    agreement: normalizeLineageReference(record.agreement),
    document: normalizeLineageReference(record.document),
    pinned_source_revision: normalizeSourceRevisionSummary(record.pinned_source_revision),
    status: asOptionalString(record.status),
    workflow_kind: asOptionalString(record.workflow_kind),
    is_pinned_latest: asBoolean(record.is_pinned_latest),
    links: asRecord(record.links) as SourceManagementLinks,
  };
}

export function normalizeSourceAgreementListQuery(value: unknown): SourceAgreementListQuery {
  const record = asRecord(value);
  return {
    status: asOptionalString(record.status),
    source_revision_id: asOptionalString(record.source_revision_id),
    sort: asOptionalString(record.sort),
    page: asOptionalNumber(record.page),
    page_size: asOptionalNumber(record.page_size),
  };
}

export function normalizeSourceAgreementPage(value: unknown): SourceAgreementPage {
  const record = asRecord(value);
  return {
    source: normalizeLineageReference(record.source),
    items: Array.isArray(record.items) ? record.items.map(normalizeSourceAgreementSummary) : [],
    page_info: normalizeSourceManagementPageInfo(record.page_info),
    applied_query: normalizeSourceAgreementListQuery(record.applied_query),
    permissions: normalizeSourceManagementPermissions(record.permissions),
    empty_state: normalizeLineageEmptyState(record.empty_state),
    links: asRecord(record.links) as SourceManagementLinks,
  };
}

export function normalizeSourceWorkspacePanelSummary(
  value: unknown
): SourceWorkspacePanelSummary {
  const record = asRecord(value);
  return {
    id: asString(record.id),
    label: asString(record.label),
    item_count: asOptionalNumber(record.item_count),
    links: asRecord(record.links) as SourceManagementLinks,
  };
}

export function normalizeSourceRevisionTimelineEntry(
  value: unknown
): SourceRevisionTimelineEntry {
  const record = asRecord(value);
  return {
    revision: normalizeSourceRevisionSummary(record.revision),
    handle: normalizeSourceHandleSummary(record.handle),
    primary_artifact: normalizeSourceArtifactSummary(record.primary_artifact),
    comment_count: asOptionalNumber(record.comment_count),
    agreement_count: asOptionalNumber(record.agreement_count),
    artifact_count: asOptionalNumber(record.artifact_count),
    is_latest: asBoolean(record.is_latest),
    is_repeated_handle: asBoolean(record.is_repeated_handle),
    continuity_summary: asOptionalString(record.continuity_summary),
    drill_in: normalizeSourceWorkspaceDrillIn(record.drill_in),
    links: asRecord(record.links) as SourceManagementLinks,
  };
}

export function normalizeSourceRevisionTimeline(value: unknown): SourceRevisionTimeline {
  const record = asRecord(value);
  return {
    entries: Array.isArray(record.entries)
      ? record.entries.map(normalizeSourceRevisionTimelineEntry)
      : [],
    repeated_handle_count: asOptionalNumber(record.repeated_handle_count),
    handle_transition_count: asOptionalNumber(record.handle_transition_count),
    permissions: normalizeSourceManagementPermissions(record.permissions),
    empty_state: normalizeLineageEmptyState(record.empty_state),
    links: asRecord(record.links) as SourceManagementLinks,
  };
}

export function normalizeSourceWorkspaceArtifactSummary(
  value: unknown
): SourceWorkspaceArtifactSummary {
  const record = asRecord(value);
  return {
    artifact: normalizeSourceArtifactSummary(record.artifact),
    revision: normalizeSourceRevisionSummary(record.revision),
    provider: normalizeSourceProviderSummary(record.provider),
    drill_in: normalizeSourceWorkspaceDrillIn(record.drill_in),
    links: asRecord(record.links) as SourceManagementLinks,
  };
}

export function normalizeSourceWorkspaceArtifactPage(
  value: unknown
): SourceWorkspaceArtifactPage {
  const record = asRecord(value);
  return {
    source: normalizeLineageReference(record.source),
    items: Array.isArray(record.items)
      ? record.items.map(normalizeSourceWorkspaceArtifactSummary)
      : [],
    page_info: normalizeSourceManagementPageInfo(record.page_info),
    permissions: normalizeSourceManagementPermissions(record.permissions),
    empty_state: normalizeLineageEmptyState(record.empty_state),
    links: asRecord(record.links) as SourceManagementLinks,
  };
}

export function normalizeSourceContinuitySummary(value: unknown): SourceContinuitySummary {
  const record = asRecord(value);
  return {
    status: asOptionalString(record.status),
    summary: asOptionalString(record.summary),
    continuation: normalizeLineageReference(record.continuation),
    predecessors: Array.isArray(record.predecessors)
      ? record.predecessors
          .map((entry) => normalizeLineageReference(entry))
          .filter((entry): entry is LineageReference => entry !== null)
      : [],
    successors: Array.isArray(record.successors)
      ? record.successors
          .map((entry) => normalizeLineageReference(entry))
          .filter((entry): entry is LineageReference => entry !== null)
      : [],
    links: asRecord(record.links) as SourceManagementLinks,
  };
}

export function normalizeSourceWorkspace(value: unknown): SourceWorkspace {
  const record = asRecord(value);
  return {
    source: normalizeLineageReference(record.source),
    status: asString(record.status),
    lineage_confidence: asString(record.lineage_confidence),
    provider: normalizeSourceProviderSummary(record.provider),
    active_handle: normalizeSourceHandleSummary(record.active_handle),
    latest_revision: normalizeSourceRevisionSummary(record.latest_revision),
    revision_count: asNumber(record.revision_count),
    handle_count: asNumber(record.handle_count),
    relationship_count: asNumber(record.relationship_count),
    pending_candidate_count: asNumber(record.pending_candidate_count),
    active_panel: asOptionalString(record.active_panel),
    active_anchor: asOptionalString(record.active_anchor),
    panels: Array.isArray(record.panels)
      ? record.panels.map(normalizeSourceWorkspacePanelSummary)
      : [],
    continuity: normalizeSourceContinuitySummary(record.continuity),
    timeline: normalizeSourceRevisionTimeline(record.timeline),
    agreements: normalizeSourceAgreementPage(record.agreements),
    artifacts: normalizeSourceWorkspaceArtifactPage(record.artifacts),
    comments: normalizePhase13SourceCommentPage(record.comments),
    handles: normalizeSourceHandlePage(record.handles),
    permissions: normalizeSourceManagementPermissions(record.permissions),
    links: asRecord(record.links) as SourceManagementLinks,
    empty_state: normalizeLineageEmptyState(record.empty_state),
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

function normalizeSourceHandleSummary(value: unknown): SourceHandleSummary | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = asRecord(value);
  const id = asString(record.id);
  if (!id) {
    return null;
  }
  return {
    id,
    provider_kind: asString(record.provider_kind),
    external_file_id: asString(record.external_file_id),
    account_id: asOptionalString(record.account_id),
    drive_id: asOptionalString(record.drive_id),
    web_url: asOptionalString(record.web_url),
    handle_status: asString(record.handle_status),
    valid_from: asOptionalString(record.valid_from),
    valid_to: asOptionalString(record.valid_to),
    links: asRecord(record.links) as SourceManagementLinks,
  };
}

function normalizeSourceHandlePage(value: unknown): SourceHandlePage {
  const record = asRecord(value);
  return {
    source: normalizeLineageReference(record.source),
    items: Array.isArray(record.items)
      ? record.items
          .map((item) => normalizeSourceHandleSummary(item))
          .filter((item): item is SourceHandleSummary => item !== null)
      : [],
    page_info: normalizeSourceManagementPageInfo(record.page_info),
    permissions: normalizeSourceManagementPermissions(record.permissions),
    empty_state: normalizeLineageEmptyState(record.empty_state),
    links: asRecord(record.links) as SourceManagementLinks,
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

// ============================================================================
// Phase 17 Reconciliation Queue Contract Types (Task 17.6)
// ============================================================================

/**
 * Reconciliation queue age band constants.
 * Backend-owned categorization for queue item age filtering.
 *
 * @see DOC_LINEAGE_V2_TSK.md Phase 17 Task 17.6
 */
export const RECONCILIATION_QUEUE_AGE_BAND = {
  /** Queue item is less than 7 days old */
  LT_7D: 'lt_7d',
  /** Queue item is between 7 and 30 days old */
  DAYS_7_TO_30: '7d_to_30d',
  /** Queue item is greater than 30 days old */
  GT_30D: 'gt_30d',
} as const;

/**
 * Type representing valid reconciliation queue age band values.
 */
export type ReconciliationQueueAgeBand =
  (typeof RECONCILIATION_QUEUE_AGE_BAND)[keyof typeof RECONCILIATION_QUEUE_AGE_BAND];

/**
 * Reconciliation review action tone constants.
 * Controls the visual presentation of review action buttons.
 *
 * @see DOC_LINEAGE_V2_TSK.md Phase 17 Task 17.7
 */
export const RECONCILIATION_REVIEW_ACTION_TONE = {
  /** Default/neutral tone */
  DEFAULT: 'default',
  /** Primary/confirm tone */
  PRIMARY: 'primary',
  /** Danger/destructive tone */
  DANGER: 'danger',
  /** Warning tone */
  WARNING: 'warning',
} as const;

/**
 * Type representing valid reconciliation review action tone values.
 */
export type ReconciliationReviewActionTone =
  (typeof RECONCILIATION_REVIEW_ACTION_TONE)[keyof typeof RECONCILIATION_REVIEW_ACTION_TONE];

/**
 * Reconciliation queue query parameters.
 * Backend-owned filters for queue list requests.
 *
 * @see DOC_LINEAGE_V2_TSK.md Phase 17 Task 17.6
 */
export interface ReconciliationQueueQuery {
  /** Filter by confidence band: 'high', 'medium', 'low', 'exact' */
  confidence_band?: string;
  /** Filter by relationship type: 'copied_from', 'predecessor_of', etc. */
  relationship_type?: string;
  /** Filter by provider kind: 'google', etc. */
  provider_kind?: string;
  /** Filter by source status: 'active', 'merged', 'archived' */
  source_status?: string;
  /** Filter by age band: 'lt_7d', '7d_to_30d', 'gt_30d' */
  age_band?: string;
  /** Sort order: 'confidence_desc', 'age_asc', 'age_desc' */
  sort?: string;
  /** Page number (1-indexed) */
  page?: number;
  /** Page size */
  page_size?: number;
}

/**
 * Reconciliation queue source summary.
 * Compact source representation for queue list items.
 *
 * @see DOC_LINEAGE_V2_TSK.md Phase 17 Task 17.6
 */
export interface ReconciliationQueueSourceSummary {
  /** Source reference */
  source?: LineageReference;
  /** Source status */
  status: string;
  /** Lineage confidence level */
  lineage_confidence: string;
  /** Provider metadata */
  provider?: SourceProviderSummary;
  /** Active handle summary */
  active_handle?: SourceHandleSummary;
  /** Latest revision summary */
  latest_revision?: SourceRevisionSummary;
  /** Number of pending candidates */
  pending_candidate_count?: number;
  /** Permission flags */
  permissions: SourceManagementPermissions;
  /** Navigation links */
  links: SourceManagementLinks;
}

/**
 * Reconciliation review action metadata.
 * Backend-provided action availability and presentation.
 *
 * IMPORTANT: Frontend must NOT compute action availability or semantics.
 * All action availability, disabled states, and labels are backend-owned.
 *
 * @see DOC_LINEAGE_V2_TSK.md Phase 17 Task 17.7
 */
export interface ReconciliationReviewAction {
  /** Action identifier */
  id: string;
  /** Display label */
  label: string;
  /** Whether the action requires a reason input */
  requires_reason: boolean;
  /** Whether the action is currently available */
  available: boolean;
  /** Reason the action is disabled (if not available) */
  disabled_reason?: string;
  /** Visual tone: 'default', 'primary', 'danger', 'warning' */
  tone?: string;
}

/**
 * Reconciliation audit trail entry.
 * Backend-owned record of review actions taken.
 *
 * @see DOC_LINEAGE_V2_TSK.md Phase 17 Task 17.6
 */
export interface ReconciliationAuditEntry {
  /** Audit entry ID */
  id: string;
  /** Action taken */
  action: string;
  /** Actor who performed the action */
  actor_id?: string;
  /** Reason provided for the action */
  reason?: string;
  /** Previous status before action */
  from_status?: string;
  /** New status after action */
  to_status?: string;
  /** Human-readable summary */
  summary?: string;
  /** When the action was taken */
  created_at?: string;
}

/**
 * Reconciliation queue list item.
 * Represents a pending candidate in the queue list view.
 *
 * @see DOC_LINEAGE_V2_TSK.md Phase 17 Task 17.6
 */
export interface ReconciliationQueueItem {
  /** Candidate relationship summary */
  candidate?: SourceRelationshipSummary;
  /** Left source in the relationship */
  left_source?: ReconciliationQueueSourceSummary;
  /** Right source in the relationship */
  right_source?: ReconciliationQueueSourceSummary;
  /** Age band for filtering: 'lt_7d', '7d_to_30d', 'gt_30d' */
  queue_age_band?: string;
  /** Age in days since candidate was created */
  queue_age_days?: number;
  /** When the candidate was last updated */
  updated_at?: string;
  /** Available review actions */
  actions?: ReconciliationReviewAction[];
  /** Navigation links */
  links: SourceManagementLinks;
}

/**
 * Reconciliation queue page response.
 * Backend-owned paginated list of queue items.
 *
 * @see DOC_LINEAGE_V2_TSK.md Phase 17 Task 17.6
 */
export interface ReconciliationQueuePage {
  /** Queue items */
  items: ReconciliationQueueItem[];
  /** Pagination metadata */
  page_info: SourceManagementPageInfo;
  /** Applied query parameters */
  applied_query: ReconciliationQueueQuery;
  /** Permission flags */
  permissions: SourceManagementPermissions;
  /** Empty state info */
  empty_state: LineageEmptyState;
  /** Navigation links */
  links: SourceManagementLinks;
}

/**
 * Reconciliation candidate detail response.
 * Full candidate information for the review workflow.
 *
 * @see DOC_LINEAGE_V2_TSK.md Phase 17 Task 17.6
 */
export interface ReconciliationCandidateDetail {
  /** Candidate relationship summary */
  candidate?: SourceRelationshipSummary;
  /** Left source in the relationship */
  left_source?: ReconciliationQueueSourceSummary;
  /** Right source in the relationship */
  right_source?: ReconciliationQueueSourceSummary;
  /** Matched source revision (evidence) */
  matched_source_revision?: SourceRevisionSummary;
  /** Matched source artifact (evidence) */
  matched_source_artifact?: SourceArtifactSummary;
  /** Evidence details */
  evidence?: CandidateEvidenceSummary[];
  /** Audit trail of review actions */
  audit_trail?: ReconciliationAuditEntry[];
  /** Available review actions */
  actions?: ReconciliationReviewAction[];
  /** Permission flags */
  permissions: SourceManagementPermissions;
  /** Navigation links */
  links: SourceManagementLinks;
  /** Empty state info */
  empty_state: LineageEmptyState;
}

/**
 * Reconciliation review input payload.
 * Frontend-to-backend request for applying a review action.
 *
 * @see DOC_LINEAGE_V2_TSK.md Phase 17 Task 17.7
 */
export interface ReconciliationReviewInput {
  /** Action to apply: 'confirm', 'reject', 'supersede' */
  action: string;
  /** Confirm behavior: 'attach_handle_to_existing_source', 'merge_source_documents', 'confirm_related_but_distinct' */
  confirm_behavior?: string;
  /** Reason for the action (required for some actions) */
  reason?: string;
}

/**
 * Reconciliation review response.
 * Backend response after applying a review action.
 *
 * @see DOC_LINEAGE_V2_TSK.md Phase 17 Task 17.7
 */
export interface ReconciliationReviewResponse {
  /** Status of the operation */
  status: string;
  /** Updated candidate detail */
  candidate?: ReconciliationCandidateDetail;
  /** Error details if operation failed */
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ============================================================================
// Phase 17 Contract Normalization Helpers (Task 17.6)
// ============================================================================

/**
 * Normalize reconciliation queue query from raw transport.
 */
export function normalizeReconciliationQueueQuery(value: unknown): ReconciliationQueueQuery {
  const record = asRecord(value);
  return {
    confidence_band: asOptionalString(record.confidence_band),
    relationship_type: asOptionalString(record.relationship_type),
    provider_kind: asOptionalString(record.provider_kind),
    source_status: asOptionalString(record.source_status),
    age_band: asOptionalString(record.age_band),
    sort: asOptionalString(record.sort),
    page: asOptionalNumber(record.page),
    page_size: asOptionalNumber(record.page_size),
  };
}

/**
 * Normalize reconciliation queue source summary from raw transport.
 */
export function normalizeReconciliationQueueSourceSummary(
  value: unknown
): ReconciliationQueueSourceSummary | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const record = asRecord(value);
  return {
    source: normalizeLineageReference(record.source) ?? undefined,
    status: asString(record.status),
    lineage_confidence: asString(record.lineage_confidence),
    provider: normalizeSourceProviderSummary(record.provider) ?? undefined,
    active_handle: normalizeSourceHandleSummary(record.active_handle) ?? undefined,
    latest_revision: normalizeSourceRevisionSummary(record.latest_revision) ?? undefined,
    pending_candidate_count: asOptionalNumber(record.pending_candidate_count),
    permissions: normalizeSourceManagementPermissions(record.permissions),
    links: asRecord(record.links) as SourceManagementLinks,
  };
}

/**
 * Normalize reconciliation review action from raw transport.
 */
export function normalizeReconciliationReviewAction(
  value: unknown
): ReconciliationReviewAction {
  const record = asRecord(value);
  return {
    id: asString(record.id),
    label: asString(record.label),
    requires_reason: asBoolean(record.requires_reason),
    available: asBoolean(record.available),
    disabled_reason: asOptionalString(record.disabled_reason),
    tone: asOptionalString(record.tone),
  };
}

/**
 * Normalize reconciliation audit entry from raw transport.
 */
export function normalizeReconciliationAuditEntry(
  value: unknown
): ReconciliationAuditEntry {
  const record = asRecord(value);
  return {
    id: asString(record.id),
    action: asString(record.action),
    actor_id: asOptionalString(record.actor_id),
    reason: asOptionalString(record.reason),
    from_status: asOptionalString(record.from_status),
    to_status: asOptionalString(record.to_status),
    summary: asOptionalString(record.summary),
    created_at: asOptionalString(record.created_at),
  };
}

/**
 * Normalize reconciliation queue item from raw transport.
 */
export function normalizeReconciliationQueueItem(
  value: unknown
): ReconciliationQueueItem {
  const record = asRecord(value);
  return {
    candidate: normalizeSourceRelationshipSummary(record.candidate),
    left_source: normalizeReconciliationQueueSourceSummary(record.left_source),
    right_source: normalizeReconciliationQueueSourceSummary(record.right_source),
    queue_age_band: asOptionalString(record.queue_age_band),
    queue_age_days: asOptionalNumber(record.queue_age_days),
    updated_at: asOptionalString(record.updated_at),
    actions: Array.isArray(record.actions)
      ? record.actions.map(normalizeReconciliationReviewAction)
      : undefined,
    links: asRecord(record.links) as SourceManagementLinks,
  };
}

/**
 * Normalize reconciliation queue page from raw transport.
 */
export function normalizeReconciliationQueuePage(
  value: unknown
): ReconciliationQueuePage {
  const record = asRecord(value);
  return {
    items: Array.isArray(record.items)
      ? record.items.map(normalizeReconciliationQueueItem)
      : [],
    page_info: normalizeSourceManagementPageInfo(record.page_info),
    applied_query: normalizeReconciliationQueueQuery(record.applied_query),
    permissions: normalizeSourceManagementPermissions(record.permissions),
    empty_state: normalizeLineageEmptyState(record.empty_state),
    links: asRecord(record.links) as SourceManagementLinks,
  };
}

/**
 * Normalize reconciliation candidate detail from raw transport.
 */
export function normalizeReconciliationCandidateDetail(
  value: unknown
): ReconciliationCandidateDetail {
  const record = asRecord(value);
  return {
    candidate: normalizeSourceRelationshipSummary(record.candidate),
    left_source: normalizeReconciliationQueueSourceSummary(record.left_source),
    right_source: normalizeReconciliationQueueSourceSummary(record.right_source),
    matched_source_revision: normalizeSourceRevisionSummary(record.matched_source_revision) ?? undefined,
    matched_source_artifact: normalizeSourceArtifactSummary(record.matched_source_artifact) ?? undefined,
    evidence: Array.isArray(record.evidence)
      ? record.evidence.map(normalizeCandidateEvidenceSummary)
      : undefined,
    audit_trail: Array.isArray(record.audit_trail)
      ? record.audit_trail.map(normalizeReconciliationAuditEntry)
      : undefined,
    actions: Array.isArray(record.actions)
      ? record.actions.map(normalizeReconciliationReviewAction)
      : undefined,
    permissions: normalizeSourceManagementPermissions(record.permissions),
    links: asRecord(record.links) as SourceManagementLinks,
    empty_state: normalizeLineageEmptyState(record.empty_state),
  };
}

/**
 * Normalize reconciliation review response from raw transport.
 */
export function normalizeReconciliationReviewResponse(
  value: unknown
): ReconciliationReviewResponse {
  const record = asRecord(value);
  const errorRecord = asRecord(record.error);
  const errorCode = asString(errorRecord.code);
  const errorMessage = asString(errorRecord.message);

  return {
    status: asString(record.status),
    candidate: record.candidate
      ? normalizeReconciliationCandidateDetail(record.candidate)
      : undefined,
    error: errorCode || errorMessage
      ? {
          code: errorCode,
          message: errorMessage,
          ...(asOptionalRecord(errorRecord.details)
            ? { details: asOptionalRecord(errorRecord.details) }
            : {}),
        }
      : undefined,
  };
}

// Internal helper for source relationship summary normalization
function normalizeSourceRelationshipSummary(
  value: unknown
): SourceRelationshipSummary | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const record = asRecord(value);
  const id = asString(record.id);
  if (!id) {
    return undefined;
  }
  return {
    id,
    relationship_type: asString(record.relationship_type),
    status: asString(record.status),
    confidence_band: asString(record.confidence_band),
    confidence_score: asOptionalNumber(record.confidence_score),
    summary: asString(record.summary),
    left_source: normalizeLineageReference(record.left_source),
    right_source: normalizeLineageReference(record.right_source),
    counterpart_source: normalizeLineageReference(record.counterpart_source),
    review_action_visible: asOptionalString(record.review_action_visible),
    evidence: Array.isArray(record.evidence)
      ? record.evidence.map(normalizeCandidateEvidenceSummary)
      : [],
    links: asRecord(record.links) as SourceManagementLinks,
  };
}

// ============================================================================
// Phase 17 Fixture Types (Task 17.8)
// ============================================================================

/**
 * Phase 17 reconciliation queue query fixtures.
 */
export interface Phase17ReconciliationQueueQueryFixtures {
  queue_default: ReconciliationQueueQuery;
  queue_high_confidence: ReconciliationQueueQuery;
  queue_aged_30d: ReconciliationQueueQuery;
}

/**
 * Phase 17 reconciliation queue fixture states.
 */
export interface Phase17ReconciliationQueueFixtureStates {
  queue_empty: ReconciliationQueuePage;
  queue_backlog: ReconciliationQueuePage;
  candidate_detail: ReconciliationCandidateDetail;
  candidate_with_audit: ReconciliationCandidateDetail;
}

/**
 * Phase 17 reconciliation queue contract fixtures.
 * Backend-owned example payloads for Phase 17 contract validation.
 */
export interface Phase17ReconciliationQueueContractFixtures {
  schema_version: number;
  rules: SourceManagementContractRules;
  queries: Phase17ReconciliationQueueQueryFixtures;
  states: Phase17ReconciliationQueueFixtureStates;
}
