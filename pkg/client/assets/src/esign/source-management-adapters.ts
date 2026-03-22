/**
 * Source-Management Presentation Adapters
 *
 * Architecture-level adapters that normalize backend transport contracts into
 * render-ready view models for source-management surfaces.
 *
 * CRITICAL RULES:
 * 1. Adapters may ONLY normalize transport shape (null handling, defaults, formatting)
 * 2. Adapters must NOT compute lineage semantics, warning precedence, or source continuity
 * 3. Adapters must NOT compute search ranking, candidate severity, or revision ordering
 * 4. All business logic lives in backend-owned read models
 * 5. Adapters do not merge multiple contract families or infer missing data
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 11 Task 11.9
 * @see examples/esign/services/lineage_contracts.go (backend source of truth)
 */

import type {
  SourceListPage,
  SourceListItem,
  SourceDetail,
  SourceRevisionPage,
  SourceRevisionListItem,
  SourceRelationshipPage,
  SourceRelationshipSummary,
  SourceHandlePage,
  SourceHandleSummary,
  SourceRevisionDetail,
  SourceArtifactPage,
  SourceArtifactSummary,
  SourceCommentPage,
  SourceCommentThreadSummary,
  SourceSearchResults,
  SourceSearchResultSummary,
  SourceProviderSummary,
  SourceManagementLinks,
  SourceManagementPermissions,
  LineageReference,
  LineageEmptyState,
  SourceManagementPageInfo,
} from './lineage-contracts.js';

// ============================================================================
// View Model Types
// ============================================================================

/**
 * Render-ready source list item.
 * Normalized for table/card rendering with safe defaults.
 */
export interface SourceListItemViewModel {
  id: string;
  label: string;
  status: string;
  statusLabel: string;
  confidence: string;
  confidenceLabel: string;
  providerKind: string;
  providerLabel: string;
  externalFileId: string;
  webUrl: string;
  latestRevisionId: string;
  latestModifiedTime: string;
  revisionCount: number;
  handleCount: number;
  relationshipCount: number;
  pendingCandidateCount: number;
  hasPendingCandidates: boolean;
  permissions: SourceManagementPermissions;
  links: SourceManagementLinks;
}

/**
 * Render-ready source detail.
 * Normalized for detail page rendering with safe defaults.
 */
export interface SourceDetailViewModel {
  id: string;
  label: string;
  status: string;
  statusLabel: string;
  confidence: string;
  confidenceLabel: string;
  providerKind: string;
  providerLabel: string;
  externalFileId: string;
  webUrl: string;
  activeHandleId: string;
  activeHandleStatus: string;
  latestRevisionId: string;
  latestModifiedTime: string;
  revisionCount: number;
  handleCount: number;
  relationshipCount: number;
  pendingCandidateCount: number;
  hasPendingCandidates: boolean;
  isEmpty: boolean;
  emptyStateKind: string;
  emptyStateTitle: string;
  emptyStateDescription: string;
  permissions: SourceManagementPermissions;
  links: SourceManagementLinks;
}

/**
 * Render-ready source revision list item.
 * Normalized for timeline rendering with safe defaults.
 */
export interface SourceRevisionListItemViewModel {
  id: string;
  providerRevisionHint: string;
  modifiedTime: string;
  exportedAt: string;
  sourceMimeType: string;
  primaryArtifactId: string;
  primaryArtifactSha256: string;
  primaryArtifactPageCount: number;
  fingerprintStatus: string;
  fingerprintStatusLabel: string;
  fingerprintProcessingState: string;
  fingerprintProcessingLabel: string;
  fingerprintEvidenceAvailable: boolean;
  isLatest: boolean;
  links: SourceManagementLinks;
}

/**
 * Render-ready source relationship.
 * Normalized for graph/candidate rendering with safe defaults.
 */
export interface SourceRelationshipViewModel {
  id: string;
  relationshipType: string;
  relationshipTypeLabel: string;
  status: string;
  statusLabel: string;
  confidenceBand: string;
  confidenceBandLabel: string;
  confidenceScore: number;
  summary: string;
  counterpartSourceId: string;
  counterpartSourceLabel: string;
  counterpartSourceUrl: string;
  evidenceCount: number;
  evidenceLabels: string[];
  reviewActionVisible: string;
  canReview: boolean;
  links: SourceManagementLinks;
}

/**
 * Render-ready pagination info.
 * Normalized for pagination controls with safe defaults.
 */
export interface PaginationViewModel {
  mode: string;
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasMore: boolean;
  hasPrevious: boolean;
  firstItemIndex: number;
  lastItemIndex: number;
  sort: string;
}

/**
 * Render-ready empty state.
 * Normalized for empty state rendering.
 */
export interface EmptyStateViewModel {
  isEmpty: boolean;
  kind: string;
  title: string;
  description: string;
}

// ============================================================================
// Presentation Adapters
// ============================================================================

/**
 * Adapts backend LineageReference to safe string values.
 * Returns empty strings if reference is null or fields are missing.
 */
function adaptLineageReference(ref: LineageReference | null): {
  id: string;
  label: string;
  url: string;
} {
  return {
    id: ref?.id ?? '',
    label: ref?.label ?? '',
    url: ref?.url ?? '',
  };
}

/**
 * Adapts backend SourceProviderSummary to safe string values.
 * Returns empty strings if provider is null or fields are missing.
 */
function adaptProviderSummary(provider: SourceProviderSummary | null): {
  kind: string;
  label: string;
  externalFileId: string;
  webUrl: string;
} {
  return {
    kind: provider?.kind ?? '',
    label: provider?.label ?? '',
    externalFileId: provider?.external_file_id ?? '',
    webUrl: provider?.web_url ?? '',
  };
}

/**
 * Adapts backend LineageEmptyState to render-ready EmptyStateViewModel.
 */
export function adaptEmptyState(emptyState: LineageEmptyState): EmptyStateViewModel {
  const kind = emptyState.kind ?? 'none';
  return {
    isEmpty: kind !== 'none',
    kind,
    title: emptyState.title ?? '',
    description: emptyState.description ?? '',
  };
}

/**
 * Adapts backend SourceManagementPageInfo to render-ready PaginationViewModel.
 * Computes derived pagination values (totalPages, hasPrevious, etc.) from backend data.
 */
export function adaptPaginationInfo(pageInfo: SourceManagementPageInfo): PaginationViewModel {
  const currentPage = pageInfo.page ?? 1;
  const pageSize = pageInfo.page_size ?? 20;
  const totalCount = pageInfo.total_count ?? 0;
  const totalPages = pageSize > 0 ? Math.ceil(totalCount / pageSize) : 0;
  const firstItemIndex = (currentPage - 1) * pageSize + 1;
  const lastItemIndex = Math.min(currentPage * pageSize, totalCount);

  return {
    mode: pageInfo.mode ?? 'page',
    currentPage,
    pageSize,
    totalCount,
    totalPages,
    hasMore: pageInfo.has_more ?? false,
    hasPrevious: currentPage > 1,
    firstItemIndex: totalCount > 0 ? firstItemIndex : 0,
    lastItemIndex: totalCount > 0 ? lastItemIndex : 0,
    sort: pageInfo.sort ?? '',
  };
}

/**
 * Adapts backend SourceListItem to render-ready SourceListItemViewModel.
 * Normalizes null values and provides safe defaults for rendering.
 */
export function adaptSourceListItem(item: SourceListItem): SourceListItemViewModel {
  const source = adaptLineageReference(item.source);
  const provider = adaptProviderSummary(item.provider);
  const latestRevision = item.latest_revision;

  return {
    id: source.id,
    label: source.label || '(Untitled Source)',
    status: item.status ?? 'unknown',
    statusLabel: formatSourceStatus(item.status),
    confidence: item.lineage_confidence ?? 'unknown',
    confidenceLabel: formatLineageConfidence(item.lineage_confidence),
    providerKind: provider.kind,
    providerLabel: provider.label,
    externalFileId: provider.externalFileId,
    webUrl: provider.webUrl,
    latestRevisionId: latestRevision?.id ?? '',
    latestModifiedTime: latestRevision?.modified_time ?? '',
    revisionCount: item.revision_count ?? 0,
    handleCount: item.handle_count ?? 0,
    relationshipCount: item.relationship_count ?? 0,
    pendingCandidateCount: item.pending_candidate_count ?? 0,
    hasPendingCandidates: (item.pending_candidate_count ?? 0) > 0,
    permissions: item.permissions ?? createDefaultPermissions(),
    links: item.links ?? {},
  };
}

/**
 * Adapts backend SourceDetail to render-ready SourceDetailViewModel.
 * Normalizes null values and provides safe defaults for rendering.
 */
export function adaptSourceDetail(detail: SourceDetail): SourceDetailViewModel {
  const source = adaptLineageReference(detail.source);
  const provider = adaptProviderSummary(detail.provider);
  const activeHandle = detail.active_handle;
  const latestRevision = detail.latest_revision;
  const emptyState = adaptEmptyState(detail.empty_state);

  return {
    id: source.id,
    label: source.label || '(Untitled Source)',
    status: detail.status ?? 'unknown',
    statusLabel: formatSourceStatus(detail.status),
    confidence: detail.lineage_confidence ?? 'unknown',
    confidenceLabel: formatLineageConfidence(detail.lineage_confidence),
    providerKind: provider.kind,
    providerLabel: provider.label,
    externalFileId: provider.externalFileId,
    webUrl: provider.webUrl,
    activeHandleId: activeHandle?.id ?? '',
    activeHandleStatus: activeHandle?.handle_status ?? '',
    latestRevisionId: latestRevision?.id ?? '',
    latestModifiedTime: latestRevision?.modified_time ?? '',
    revisionCount: detail.revision_count ?? 0,
    handleCount: detail.handle_count ?? 0,
    relationshipCount: detail.relationship_count ?? 0,
    pendingCandidateCount: detail.pending_candidate_count ?? 0,
    hasPendingCandidates: (detail.pending_candidate_count ?? 0) > 0,
    isEmpty: emptyState.isEmpty,
    emptyStateKind: emptyState.kind,
    emptyStateTitle: emptyState.title,
    emptyStateDescription: emptyState.description,
    permissions: detail.permissions ?? createDefaultPermissions(),
    links: detail.links ?? {},
  };
}

/**
 * Adapts backend SourceRevisionListItem to render-ready SourceRevisionListItemViewModel.
 * Normalizes null values and provides safe defaults for rendering.
 */
export function adaptSourceRevisionListItem(item: SourceRevisionListItem): SourceRevisionListItemViewModel {
  const revision = item.revision;
  const artifact = item.primary_artifact;
  const fingerprintStatus = item.fingerprint_status;
  const fingerprintProcessing = item.fingerprint_processing;

  return {
    id: revision?.id ?? '',
    providerRevisionHint: revision?.provider_revision_hint ?? '',
    modifiedTime: revision?.modified_time ?? '',
    exportedAt: revision?.exported_at ?? '',
    sourceMimeType: revision?.source_mime_type ?? '',
    primaryArtifactId: artifact?.id ?? '',
    primaryArtifactSha256: artifact?.sha256 ?? '',
    primaryArtifactPageCount: artifact?.page_count ?? 0,
    fingerprintStatus: fingerprintStatus.status ?? 'unknown',
    fingerprintStatusLabel: formatFingerprintStatus(fingerprintStatus.status),
    fingerprintProcessingState: fingerprintProcessing.state ?? 'unknown',
    fingerprintProcessingLabel: formatFingerprintProcessingState(fingerprintProcessing.state),
    fingerprintEvidenceAvailable: fingerprintStatus.evidence_available ?? false,
    isLatest: item.is_latest ?? false,
    links: item.links ?? {},
  };
}

/**
 * Adapts backend SourceRelationshipSummary to render-ready SourceRelationshipViewModel.
 * Normalizes null values and provides safe defaults for rendering.
 */
export function adaptSourceRelationshipSummary(summary: SourceRelationshipSummary): SourceRelationshipViewModel {
  const counterpart = adaptLineageReference(summary.counterpart_source);
  const evidence = summary.evidence ?? [];

  return {
    id: summary.id ?? '',
    relationshipType: summary.relationship_type ?? 'unknown',
    relationshipTypeLabel: formatRelationshipType(summary.relationship_type),
    status: summary.status ?? 'unknown',
    statusLabel: formatRelationshipStatus(summary.status),
    confidenceBand: summary.confidence_band ?? 'unknown',
    confidenceBandLabel: formatConfidenceBand(summary.confidence_band),
    confidenceScore: summary.confidence_score ?? 0,
    summary: summary.summary ?? '',
    counterpartSourceId: counterpart.id,
    counterpartSourceLabel: counterpart.label,
    counterpartSourceUrl: counterpart.url,
    evidenceCount: evidence.length,
    evidenceLabels: evidence.map((e) => e.label),
    reviewActionVisible: summary.review_action_visible ?? 'hidden',
    canReview: summary.review_action_visible !== 'hidden',
    links: summary.links ?? {},
  };
}

/**
 * Adapts backend SourceListPage to list of render-ready view models.
 */
export function adaptSourceListPage(page: SourceListPage): {
  items: SourceListItemViewModel[];
  pagination: PaginationViewModel;
  emptyState: EmptyStateViewModel;
  permissions: SourceManagementPermissions;
  links: SourceManagementLinks;
} {
  return {
    items: page.items.map(adaptSourceListItem),
    pagination: adaptPaginationInfo(page.page_info),
    emptyState: adaptEmptyState(page.empty_state),
    permissions: page.permissions ?? createDefaultPermissions(),
    links: page.links ?? {},
  };
}

/**
 * Adapts backend SourceRevisionPage to list of render-ready view models.
 */
export function adaptSourceRevisionPage(page: SourceRevisionPage): {
  source: { id: string; label: string; url: string };
  items: SourceRevisionListItemViewModel[];
  pagination: PaginationViewModel;
  emptyState: EmptyStateViewModel;
  permissions: SourceManagementPermissions;
  links: SourceManagementLinks;
} {
  return {
    source: adaptLineageReference(page.source),
    items: page.items.map(adaptSourceRevisionListItem),
    pagination: adaptPaginationInfo(page.page_info),
    emptyState: adaptEmptyState(page.empty_state),
    permissions: page.permissions ?? createDefaultPermissions(),
    links: page.links ?? {},
  };
}

/**
 * Adapts backend SourceRelationshipPage to list of render-ready view models.
 */
export function adaptSourceRelationshipPage(page: SourceRelationshipPage): {
  source: { id: string; label: string; url: string };
  items: SourceRelationshipViewModel[];
  pagination: PaginationViewModel;
  emptyState: EmptyStateViewModel;
  permissions: SourceManagementPermissions;
  links: SourceManagementLinks;
} {
  return {
    source: adaptLineageReference(page.source),
    items: page.items.map(adaptSourceRelationshipSummary),
    pagination: adaptPaginationInfo(page.page_info),
    emptyState: adaptEmptyState(page.empty_state),
    permissions: page.permissions ?? createDefaultPermissions(),
    links: page.links ?? {},
  };
}

// ============================================================================
// Formatting Helpers (Display Labels Only)
// ============================================================================

/**
 * Formats source status for display.
 * Does NOT compute status semantics or determine visibility.
 */
function formatSourceStatus(status: string | undefined): string {
  const normalized = (status ?? 'unknown').toLowerCase();
  const labels: Record<string, string> = {
    active: 'Active',
    archived: 'Archived',
    merged: 'Merged',
    unknown: 'Unknown',
  };
  return labels[normalized] ?? normalized;
}

/**
 * Formats lineage confidence for display.
 * Does NOT compute confidence scores or determine warnings.
 */
function formatLineageConfidence(confidence: string | undefined): string {
  const normalized = (confidence ?? 'unknown').toLowerCase();
  const labels: Record<string, string> = {
    high: 'High Confidence',
    medium: 'Medium Confidence',
    low: 'Low Confidence',
    unknown: 'Unknown',
  };
  return labels[normalized] ?? normalized;
}

/**
 * Formats fingerprint status for display.
 * Does NOT compute processing state or determine retry behavior.
 */
function formatFingerprintStatus(status: string | undefined): string {
  const normalized = (status ?? 'unknown').toLowerCase();
  const labels: Record<string, string> = {
    ready: 'Ready',
    pending: 'Pending',
    failed: 'Failed',
    not_applicable: 'Not Applicable',
    unknown: 'Unknown',
  };
  return labels[normalized] ?? normalized;
}

/**
 * Formats fingerprint processing state for display.
 * Does NOT compute retry semantics or determine staleness.
 */
function formatFingerprintProcessingState(state: string | undefined): string {
  const normalized = (state ?? 'unknown').toLowerCase();
  const labels: Record<string, string> = {
    queued: 'Queued',
    running: 'Running',
    retrying: 'Retrying',
    ready: 'Ready',
    failed: 'Failed',
    stale: 'Stale',
    not_applicable: 'Not Applicable',
    unknown: 'Unknown',
  };
  return labels[normalized] ?? normalized;
}

/**
 * Formats relationship type for display.
 * Does NOT compute relationship semantics or determine graph layout.
 */
function formatRelationshipType(type: string | undefined): string {
  const normalized = (type ?? 'unknown').toLowerCase();
  const labels: Record<string, string> = {
    copied_from: 'Copied From',
    predecessor_of: 'Predecessor Of',
    successor_of: 'Successor Of',
    migrated_from: 'Migrated From',
    exact_duplicate: 'Exact Duplicate',
    unknown: 'Unknown',
  };
  return labels[normalized] ?? normalized;
}

/**
 * Formats relationship status for display.
 * Does NOT compute review state or determine action visibility.
 */
function formatRelationshipStatus(status: string | undefined): string {
  const normalized = (status ?? 'unknown').toLowerCase();
  const labels: Record<string, string> = {
    pending_review: 'Pending Review',
    confirmed: 'Confirmed',
    rejected: 'Rejected',
    superseded: 'Superseded',
    auto_linked: 'Auto-Linked',
    unknown: 'Unknown',
  };
  return labels[normalized] ?? normalized;
}

/**
 * Formats confidence band for display.
 * Does NOT compute confidence scores or determine warning severity.
 */
function formatConfidenceBand(band: string | undefined): string {
  const normalized = (band ?? 'unknown').toLowerCase();
  const labels: Record<string, string> = {
    exact: 'Exact Match',
    high: 'High Confidence',
    medium: 'Medium Confidence',
    low: 'Low Confidence',
    unknown: 'Unknown',
  };
  return labels[normalized] ?? normalized;
}

/**
 * Creates default permissions (all false).
 * Used when backend does not provide permission flags.
 */
function createDefaultPermissions(): SourceManagementPermissions {
  return {
    can_view_diagnostics: false,
    can_open_provider_links: false,
    can_review_candidates: false,
    can_view_comments: false,
  };
}
