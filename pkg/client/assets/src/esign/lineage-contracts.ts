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

export interface FingerprintStatusSummary {
  status: string;
  extract_version?: string;
  evidence_available: boolean;
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
  document_detail_url?: string;
  agreement_detail_url?: string;
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
    document_detail_url: asOptionalString(record.document_detail_url),
    agreement_detail_url: asOptionalString(record.agreement_detail_url),
  };
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

