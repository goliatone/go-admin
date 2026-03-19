export interface SourceMetadataBaseline {
  account_id: string;
  external_file_id: string;
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
  source_revision: SourceRevisionSummary | null;
  linked_document_artifact: SourceArtifactSummary | null;
  google_source: SourceMetadataBaseline | null;
  newer_source_exists: boolean;
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
    source_revision: normalizeSourceRevisionSummary(record.source_revision),
    linked_document_artifact: normalizeSourceArtifactSummary(record.linked_document_artifact),
    google_source: normalizeSourceMetadataBaseline(record.google_source),
    newer_source_exists: asBoolean(record.newer_source_exists),
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
