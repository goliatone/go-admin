/**
 * Lineage Presentation Mappers
 *
 * Shared presentation mappers for provenance blocks so templates consume
 * one normalized backend-owned structure instead of branching on raw
 * payload differences.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 5 Task 5.6
 */

import type {
  DocumentLineageDetail,
  AgreementLineageDetail,
  LineagePresentationWarning,
  SourceMetadataBaseline,
  SourceRevisionSummary,
  SourceArtifactSummary,
  FingerprintStatusSummary,
  LineageEmptyState,
  LineageReference,
} from './lineage-contracts.js';

/**
 * Provenance source type enumeration for display logic.
 */
export type ProvenanceSourceType = 'google_drive' | 'upload' | 'unknown';

/**
 * Provenance status for display purposes.
 * - 'native': Has full lineage from Google import
 * - 'empty': No lineage (upload-only or missing data)
 * - 'partial': Has some lineage data but incomplete
 */
export type ProvenanceStatus = 'native' | 'empty' | 'partial';

/**
 * Warning severity levels for precedence ordering.
 */
export type WarningSeverity = 'critical' | 'warning' | 'info' | 'none';

/**
 * Normalized provenance warning for template rendering.
 */
export interface ProvenanceWarning {
  id: string;
  severity: WarningSeverity;
  type: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionUrl?: string;
  reviewActionVisibility?: string;
  evidence?: Array<{
    label: string;
    details?: string;
  }>;
}

/**
 * Normalized source reference for template rendering.
 */
export interface ProvenanceSourceReference {
  id: string;
  label: string;
  url?: string;
  provider: ProvenanceSourceType;
}

/**
 * Normalized revision summary for template rendering.
 */
export interface ProvenanceRevisionSummary {
  id: string;
  versionHint?: string;
  modifiedAt?: string;
  modifiedAtFormatted?: string;
  exportedAt?: string;
  exportedAtFormatted?: string;
  exportedByUserId?: string;
  mimeType?: string;
}

/**
 * Normalized artifact summary for template rendering.
 */
export interface ProvenanceArtifactSummary {
  id: string;
  kind: string;
  sha256?: string;
  pageCount?: number;
  sizeBytes?: number;
  sizeBytesFormatted?: string;
  compatibilityTier?: string;
  compatibilityReason?: string;
}

/**
 * Normalized fingerprint status for template rendering.
 * Extended for Phase 7 with error details and evidence-availability context.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 7 Task 7.7
 */
export interface ProvenanceFingerprintStatus {
  /** Raw status value (unknown, ready, pending, failed, not_applicable) */
  status: string;
  /** Human-readable status label for display */
  statusLabel: string;
  /** Extractor version used for fingerprint generation */
  extractVersion?: string;
  /** Whether fingerprint evidence is available for candidate matching */
  evidenceAvailable: boolean;
  /** Status flag: fingerprint extraction in progress */
  isPending: boolean;
  /** Status flag: fingerprint extraction completed successfully */
  isReady: boolean;
  /** Status flag: fingerprint extraction failed */
  isFailed: boolean;
  /** Status flag: fingerprint not applicable for this document type */
  isNotApplicable: boolean;
  /** Status flag: fingerprint status is currently unknown */
  isUnknown: boolean;
  /** Error message if extraction failed (Phase 7 extension) */
  errorMessage?: string;
  /** Error code if extraction failed (Phase 7 extension) */
  errorCode?: string;
  /** Whether this fingerprint can participate in candidate matching */
  canMatch: boolean;
}

/**
 * Normalized Google source metadata for template rendering.
 */
export interface ProvenanceGoogleSource {
  accountId: string;
  fileId: string;
  driveId?: string;
  webUrl: string;
  title: string;
  modifiedTime?: string;
  modifiedTimeFormatted?: string;
  mimeType: string;
  ingestionMode: string;
  pageCountHint: number;
  ownerEmail?: string;
}

/**
 * Normalized empty state for template rendering.
 */
export interface ProvenanceEmptyState {
  kind: string;
  title: string;
  description: string;
  showPlaceholder: boolean;
}

export interface ProvenanceNewerSourceSummary {
  exists: boolean;
  pinnedSourceRevisionId?: string;
  latestSourceRevisionId?: string;
  summary?: string;
}

/**
 * Unified provenance view model for document detail templates.
 * Templates consume this structure instead of raw DocumentLineageDetail.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 5 Task 5.6
 */
export interface DocumentProvenanceViewModel {
  documentId: string;
  status: ProvenanceStatus;
  sourceType: ProvenanceSourceType;

  // Has data flags for template conditionals
  hasLineage: boolean;
  hasGoogleSource: boolean;
  hasArtifact: boolean;
  hasFingerprint: boolean;
  hasCandidateWarnings: boolean;

  // Normalized display data
  source: ProvenanceSourceReference | null;
  revision: ProvenanceRevisionSummary | null;
  artifact: ProvenanceArtifactSummary | null;
  googleSource: ProvenanceGoogleSource | null;
  fingerprintStatus: ProvenanceFingerprintStatus;
  emptyState: ProvenanceEmptyState;

  // Warnings sorted by precedence
  warnings: ProvenanceWarning[];
  primaryWarning: ProvenanceWarning | null;

  // Diagnostics
  diagnosticsUrl?: string;
  showDiagnosticsLink: boolean;
}

/**
 * Unified provenance view model for agreement detail templates.
 * Templates consume this structure instead of raw AgreementLineageDetail.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 5 Task 5.6
 */
export interface AgreementProvenanceViewModel {
  agreementId: string;
  status: ProvenanceStatus;
  sourceType: ProvenanceSourceType;

  // Has data flags for template conditionals
  hasLineage: boolean;
  hasGoogleSource: boolean;
  hasArtifact: boolean;
  hasCandidateWarnings: boolean;
  newerSourceExists: boolean;

  // Normalized display data
  pinnedSourceRevisionId?: string;
  source: ProvenanceSourceReference | null;
  revision: ProvenanceRevisionSummary | null;
  artifact: ProvenanceArtifactSummary | null;
  googleSource: ProvenanceGoogleSource | null;
  newerSourceSummary: ProvenanceNewerSourceSummary | null;
  emptyState: ProvenanceEmptyState;

  // Warnings sorted by precedence
  warnings: ProvenanceWarning[];
  primaryWarning: ProvenanceWarning | null;

  // Diagnostics
  diagnosticsUrl?: string;
  showDiagnosticsLink: boolean;
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Format a date string for display.
 */
function formatDate(dateStr: string | undefined): string | undefined {
  if (!dateStr) return undefined;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return undefined;
    return date.toLocaleString();
  } catch {
    return undefined;
  }
}

/**
 * Format bytes to human-readable size.
 */
function formatBytes(bytes: number | undefined): string | undefined {
  if (bytes === undefined || bytes === null) return undefined;
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Get status label for fingerprint status.
 */
function getFingerprintStatusLabel(status: string): string {
  switch (status) {
    case 'ready':
      return 'Fingerprint Ready';
    case 'pending':
      return 'Fingerprint Pending';
    case 'failed':
      return 'Fingerprint Failed';
    case 'not_applicable':
      return 'Not Applicable';
    default:
      return status || 'Unknown';
  }
}

/**
 * Determine provenance source type from payload data.
 */
function determineSourceType(googleSource: SourceMetadataBaseline | null): ProvenanceSourceType {
  if (googleSource?.external_file_id) {
    return 'google_drive';
  }
  return 'upload';
}

/**
 * Determine provenance status from payload data.
 */
function determineProvenanceStatus(
  hasSource: boolean,
  hasRevision: boolean,
  emptyState: LineageEmptyState
): ProvenanceStatus {
  if (emptyState.kind !== 'none' && !hasSource && !hasRevision) {
    return 'empty';
  }
  if (hasSource && hasRevision) {
    return 'native';
  }
  if (hasSource || hasRevision) {
    return 'partial';
  }
  return 'empty';
}

function normalizeWarningSeverity(severity: string): WarningSeverity {
  if (severity === 'critical' || severity === 'warning' || severity === 'info') {
    return severity;
  }
  return 'none';
}

function hasCandidateRelationshipWarning(warnings: ProvenanceWarning[]): boolean {
  return warnings.some((warning) => warning.type === 'candidate_relationship');
}

/**
 * Normalize backend-authored presentation warning to provenance warning.
 */
function normalizePresentationWarning(warning: LineagePresentationWarning): ProvenanceWarning {
  return {
    id: warning.id,
    severity: normalizeWarningSeverity(warning.severity),
    type: warning.type,
    title: warning.title,
    description: warning.description,
    evidence: warning.evidence.map((e) => ({
      label: e.label,
      details: e.details,
    })),
    actionLabel: warning.action_label,
    actionUrl: warning.action_url,
    reviewActionVisibility: warning.review_action_visible,
  };
}

// ============================================================================
// Normalization Functions
// ============================================================================

/**
 * Normalize LineageReference to ProvenanceSourceReference.
 */
function normalizeSourceReference(
  ref: LineageReference | null,
  provider: ProvenanceSourceType
): ProvenanceSourceReference | null {
  if (!ref) return null;
  return {
    id: ref.id,
    label: ref.label || ref.id,
    url: ref.url,
    provider,
  };
}

/**
 * Normalize SourceRevisionSummary to ProvenanceRevisionSummary.
 */
function normalizeRevisionSummary(rev: SourceRevisionSummary | null): ProvenanceRevisionSummary | null {
  if (!rev) return null;
  return {
    id: rev.id,
    versionHint: rev.provider_revision_hint,
    modifiedAt: rev.modified_time,
    modifiedAtFormatted: formatDate(rev.modified_time),
    exportedAt: rev.exported_at,
    exportedAtFormatted: formatDate(rev.exported_at),
    exportedByUserId: rev.exported_by_user_id,
    mimeType: rev.source_mime_type,
  };
}

/**
 * Normalize SourceArtifactSummary to ProvenanceArtifactSummary.
 */
function normalizeArtifactSummary(artifact: SourceArtifactSummary | null): ProvenanceArtifactSummary | null {
  if (!artifact) return null;
  return {
    id: artifact.id,
    kind: artifact.artifact_kind,
    sha256: artifact.sha256,
    pageCount: artifact.page_count,
    sizeBytes: artifact.size_bytes,
    sizeBytesFormatted: formatBytes(artifact.size_bytes),
    compatibilityTier: artifact.compatibility_tier,
    compatibilityReason: artifact.compatibility_reason,
  };
}

/**
 * Normalize SourceMetadataBaseline to ProvenanceGoogleSource.
 */
function normalizeGoogleSource(source: SourceMetadataBaseline | null): ProvenanceGoogleSource | null {
  if (!source || !source.external_file_id) return null;
  return {
    accountId: source.account_id,
    fileId: source.external_file_id,
    driveId: source.drive_id,
    webUrl: source.web_url,
    title: source.title_hint,
    modifiedTime: source.modified_time,
    modifiedTimeFormatted: formatDate(source.modified_time),
    mimeType: source.source_mime_type,
    ingestionMode: source.source_ingestion_mode,
    pageCountHint: source.page_count_hint,
    ownerEmail: source.owner_email,
  };
}

function normalizeNewerSourceSummary(summary: AgreementLineageDetail['newer_source_summary']): ProvenanceNewerSourceSummary | null {
  if (!summary) return null;
  return {
    exists: summary.exists,
    pinnedSourceRevisionId: summary.pinned_source_revision_id,
    latestSourceRevisionId: summary.latest_source_revision_id,
    summary: summary.summary,
  };
}

/**
 * Normalize FingerprintStatusSummary to ProvenanceFingerprintStatus.
 * Extended for Phase 7 with error handling and evidence-availability context.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 7 Task 7.7
 */
function normalizeFingerprintStatus(status: FingerprintStatusSummary): ProvenanceFingerprintStatus {
  const statusStr = status.status || '';
  const isReady = statusStr === 'ready';
  const isPending = statusStr === 'pending';
  const isFailed = statusStr === 'failed';
  const isNotApplicable = statusStr === 'not_applicable';
  const isUnknown = statusStr === '' || statusStr === 'unknown';

  // Fingerprint can participate in candidate matching if ready with evidence
  const canMatch = isReady && status.evidence_available;

  return {
    status: statusStr,
    statusLabel: getFingerprintStatusLabel(statusStr),
    extractVersion: status.extract_version,
    evidenceAvailable: status.evidence_available,
    isPending,
    isReady,
    isFailed,
    isNotApplicable,
    isUnknown,
    errorMessage: status.error_message,
    errorCode: status.error_code,
    canMatch,
  };
}

/**
 * Normalize LineageEmptyState to ProvenanceEmptyState.
 */
function normalizeEmptyState(state: LineageEmptyState): ProvenanceEmptyState {
  const isNonEmpty = state.kind === 'none';
  return {
    kind: state.kind,
    title: state.title || (isNonEmpty ? '' : 'No Source Information'),
    description:
      state.description || (isNonEmpty ? '' : 'This document was uploaded directly without external source tracking.'),
    showPlaceholder: !isNonEmpty,
  };
}

// ============================================================================
// Public Mapper Functions
// ============================================================================

/**
 * Map DocumentLineageDetail to DocumentProvenanceViewModel.
 *
 * This mapper transforms the raw backend-owned lineage detail into a
 * normalized view model that templates can consume without branching
 * on different payload shapes.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 5 Task 5.6
 */
export function mapDocumentProvenance(detail: DocumentLineageDetail): DocumentProvenanceViewModel {
  const sourceType = determineSourceType(detail.google_source);
  const hasSource = detail.source_document !== null;
  const hasRevision = detail.source_revision !== null;
  const hasArtifact = detail.source_artifact !== null;
  const status = determineProvenanceStatus(hasSource, hasRevision, detail.empty_state);

  const fingerprintStatus = normalizeFingerprintStatus(detail.fingerprint_status);
  const normalizedWarnings = detail.presentation_warnings.map(normalizePresentationWarning);

  return {
    documentId: detail.document_id,
    status,
    sourceType,

    hasLineage: hasSource || hasRevision || hasArtifact,
    hasGoogleSource: detail.google_source !== null,
    hasArtifact,
    hasFingerprint: fingerprintStatus.isReady || fingerprintStatus.isPending,
    hasCandidateWarnings: hasCandidateRelationshipWarning(normalizedWarnings),

    source: normalizeSourceReference(detail.source_document, sourceType),
    revision: normalizeRevisionSummary(detail.source_revision),
    artifact: normalizeArtifactSummary(detail.source_artifact),
    googleSource: normalizeGoogleSource(detail.google_source),
    fingerprintStatus,
    emptyState: normalizeEmptyState(detail.empty_state),

    warnings: normalizedWarnings,
    primaryWarning: normalizedWarnings.length > 0 ? normalizedWarnings[0] : null,

    diagnosticsUrl: detail.diagnostics_url,
    showDiagnosticsLink: Boolean(detail.diagnostics_url),
  };
}

/**
 * Map AgreementLineageDetail to AgreementProvenanceViewModel.
 *
 * This mapper transforms the raw backend-owned agreement lineage detail
 * into a normalized view model that templates can consume without
 * branching on different payload shapes.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 5 Task 5.6
 */
export function mapAgreementProvenance(detail: AgreementLineageDetail): AgreementProvenanceViewModel {
  const sourceType = determineSourceType(detail.google_source);
  const hasRevision = detail.source_revision !== null;
  const hasArtifact = detail.linked_document_artifact !== null;
  const status = determineProvenanceStatus(hasRevision, hasArtifact, detail.empty_state);
  const normalizedWarnings = detail.presentation_warnings.map(normalizePresentationWarning);

  return {
    agreementId: detail.agreement_id,
    status,
    sourceType,

    hasLineage: hasRevision || hasArtifact,
    hasGoogleSource: detail.google_source !== null,
    hasArtifact,
    hasCandidateWarnings: hasCandidateRelationshipWarning(normalizedWarnings),
    newerSourceExists: detail.newer_source_exists,

    pinnedSourceRevisionId: detail.pinned_source_revision_id,
    source: normalizeSourceReference(detail.source_document, sourceType),
    revision: normalizeRevisionSummary(detail.source_revision),
    artifact: normalizeArtifactSummary(detail.linked_document_artifact),
    googleSource: normalizeGoogleSource(detail.google_source),
    newerSourceSummary: normalizeNewerSourceSummary(detail.newer_source_summary),
    emptyState: normalizeEmptyState(detail.empty_state),

    warnings: normalizedWarnings,
    primaryWarning: normalizedWarnings.length > 0 ? normalizedWarnings[0] : null,

    diagnosticsUrl: detail.diagnostics_url,
    showDiagnosticsLink: Boolean(detail.diagnostics_url),
  };
}

// ============================================================================
// View Model Validators
// ============================================================================

/**
 * Validate that a DocumentProvenanceViewModel has expected structure.
 * Returns validation errors or empty array if valid.
 */
export function validateDocumentProvenanceViewModel(vm: unknown): string[] {
  const errors: string[] = [];

  if (!vm || typeof vm !== 'object') {
    errors.push('view model must be an object');
    return errors;
  }

  const record = vm as Record<string, unknown>;

  // Required string fields
  if (typeof record.documentId !== 'string') {
    errors.push('documentId must be a string');
  }
  if (typeof record.status !== 'string') {
    errors.push('status must be a string');
  }
  if (typeof record.sourceType !== 'string') {
    errors.push('sourceType must be a string');
  }

  // Required boolean fields
  const boolFields = [
    'hasLineage',
    'hasGoogleSource',
    'hasArtifact',
    'hasFingerprint',
    'hasCandidateWarnings',
    'showDiagnosticsLink',
  ];
  for (const field of boolFields) {
    if (typeof record[field] !== 'boolean') {
      errors.push(`${field} must be a boolean`);
    }
  }

  // Required object fields (can be null)
  const nullableObjects = ['source', 'revision', 'artifact', 'googleSource', 'primaryWarning'];
  for (const field of nullableObjects) {
    if (record[field] !== null && typeof record[field] !== 'object') {
      errors.push(`${field} must be an object or null`);
    }
  }

  // Required object fields (cannot be null)
  if (typeof record.fingerprintStatus !== 'object' || record.fingerprintStatus === null) {
    errors.push('fingerprintStatus must be an object');
  }
  if (typeof record.emptyState !== 'object' || record.emptyState === null) {
    errors.push('emptyState must be an object');
  }

  // Required array fields
  if (!Array.isArray(record.warnings)) {
    errors.push('warnings must be an array');
  }

  return errors;
}

/**
 * Validate that an AgreementProvenanceViewModel has expected structure.
 * Returns validation errors or empty array if valid.
 */
export function validateAgreementProvenanceViewModel(vm: unknown): string[] {
  const errors: string[] = [];

  if (!vm || typeof vm !== 'object') {
    errors.push('view model must be an object');
    return errors;
  }

  const record = vm as Record<string, unknown>;

  // Required string fields
  if (typeof record.agreementId !== 'string') {
    errors.push('agreementId must be a string');
  }
  if (typeof record.status !== 'string') {
    errors.push('status must be a string');
  }
  if (typeof record.sourceType !== 'string') {
    errors.push('sourceType must be a string');
  }

  // Required boolean fields
  const boolFields = [
    'hasLineage',
    'hasGoogleSource',
    'hasArtifact',
    'hasCandidateWarnings',
    'newerSourceExists',
    'showDiagnosticsLink',
  ];
  for (const field of boolFields) {
    if (typeof record[field] !== 'boolean') {
      errors.push(`${field} must be a boolean`);
    }
  }

  // Required object fields (can be null)
  const nullableObjects = ['source', 'revision', 'artifact', 'googleSource', 'newerSourceSummary', 'primaryWarning'];
  for (const field of nullableObjects) {
    if (record[field] !== null && typeof record[field] !== 'object') {
      errors.push(`${field} must be an object or null`);
    }
  }

  // Required object fields (cannot be null)
  if (typeof record.emptyState !== 'object' || record.emptyState === null) {
    errors.push('emptyState must be an object');
  }

  // Required array fields
  if (!Array.isArray(record.warnings)) {
    errors.push('warnings must be an array');
  }

  return errors;
}

// ============================================================================
// Helper Functions for Templates
// ============================================================================

/**
 * Check if a provenance view model represents a Google-sourced document.
 */
export function isGoogleSourced(vm: DocumentProvenanceViewModel | AgreementProvenanceViewModel): boolean {
  return vm.sourceType === 'google_drive' && vm.hasGoogleSource;
}

/**
 * Check if a provenance view model has actionable warnings.
 */
export function hasActionableWarnings(vm: DocumentProvenanceViewModel | AgreementProvenanceViewModel): boolean {
  return vm.warnings.some((w) => w.severity === 'critical' || w.severity === 'warning');
}

/**
 * Get the appropriate CSS class for warning severity.
 */
export function getWarningSeverityClass(severity: WarningSeverity): string {
  switch (severity) {
    case 'critical':
      return 'warning-critical';
    case 'warning':
      return 'warning-medium';
    case 'info':
      return 'warning-info';
    default:
      return '';
  }
}

/**
 * Get the appropriate icon name for warning severity.
 */
export function getWarningSeverityIcon(severity: WarningSeverity): string {
  switch (severity) {
    case 'critical':
      return 'exclamation-triangle';
    case 'warning':
      return 'exclamation-circle';
    case 'info':
      return 'info-circle';
    default:
      return '';
  }
}

/**
 * Get the appropriate icon name for source type.
 */
export function getSourceTypeIcon(sourceType: ProvenanceSourceType): string {
  switch (sourceType) {
    case 'google_drive':
      return 'google-drive';
    case 'upload':
      return 'upload';
    default:
      return 'file';
  }
}

/**
 * Get display label for source type.
 */
export function getSourceTypeLabel(sourceType: ProvenanceSourceType): string {
  switch (sourceType) {
    case 'google_drive':
      return 'Google Drive';
    case 'upload':
      return 'Direct Upload';
    default:
      return 'Unknown Source';
  }
}

// ============================================================================
// Fingerprint Status Helpers (Phase 7 Task 7.7)
// ============================================================================

/**
 * Get the appropriate CSS class for fingerprint status.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 7 Task 7.7
 */
export function getFingerprintStatusClass(status: ProvenanceFingerprintStatus): string {
  if (status.isReady) return 'fingerprint-ready';
  if (status.isPending) return 'fingerprint-pending';
  if (status.isFailed) return 'fingerprint-failed';
  if (status.isNotApplicable) return 'fingerprint-not-applicable';
  return 'fingerprint-unknown';
}

/**
 * Get the appropriate icon name for fingerprint status.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 7 Task 7.7
 */
export function getFingerprintStatusIcon(status: ProvenanceFingerprintStatus): string {
  if (status.isReady) return 'check-circle';
  if (status.isPending) return 'hourglass';
  if (status.isFailed) return 'exclamation-triangle';
  if (status.isNotApplicable) return 'minus-circle';
  return 'question-circle';
}

/**
 * Check if fingerprint status indicates a terminal state (not pending).
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 7 Task 7.7
 */
export function isFingerprintTerminal(status: ProvenanceFingerprintStatus): boolean {
  return status.isReady || status.isFailed || status.isNotApplicable;
}

/**
 * Check if fingerprint status indicates a successful completion.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 7 Task 7.7
 */
export function isFingerprintSuccessful(status: ProvenanceFingerprintStatus): boolean {
  return status.isReady && status.evidenceAvailable;
}

/**
 * Check if document has actionable fingerprint status (failed and can retry).
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 7 Task 7.7
 */
export function hasFingerprintError(status: ProvenanceFingerprintStatus): boolean {
  return status.isFailed;
}

/**
 * Get a user-friendly message for fingerprint status.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 7 Task 7.7
 */
export function getFingerprintStatusMessage(status: ProvenanceFingerprintStatus): string {
  if (status.isReady && status.evidenceAvailable) {
    return status.extractVersion
      ? `Fingerprint ready (${status.extractVersion})`
      : 'Fingerprint ready';
  }
  if (status.isReady && !status.evidenceAvailable) {
    return 'Fingerprint completed but no evidence generated';
  }
  if (status.isPending) {
    return 'Fingerprint extraction in progress...';
  }
  if (status.isFailed) {
    return status.errorMessage || 'Fingerprint extraction failed';
  }
  if (status.isNotApplicable) {
    return 'Fingerprint not applicable for this document';
  }
  return 'Fingerprint status unknown';
}
