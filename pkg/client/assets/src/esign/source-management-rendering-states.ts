/**
 * Source-Management Rendering States
 *
 * Defines loading, empty, partial-data, unauthorized, and degraded-data rendering states
 * for source-management pages. These view models enable consistent UI treatment across
 * all source-management surfaces without coupling to visual implementation.
 *
 * CRITICAL RULES:
 * 1. Rendering states use backend-authored transport semantics only
 * 2. States must NOT compute lineage semantics or warning precedence
 * 3. States provide safe defaults and null handling for all fields
 * 4. Visual treatment (CSS, layout, interactions) is deferred to template layer
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 12 Task 12.8
 * @see source-management-adapters.ts for data normalization
 */

import type {
  SourceListPage,
  SourceDetail,
  SourceRevisionPage,
  SourceRelationshipPage,
  LineageEmptyState,
  SourceManagementPermissions,
  Phase13SourceSearchResults,
  Phase13SourceCommentPage,
  SourceCommentSyncSummary,
} from './lineage-contracts.js';

import type {
  SourceListItemViewModel,
  SourceDetailViewModel,
  SourceRevisionListItemViewModel,
  SourceRelationshipViewModel,
  PaginationViewModel,
  EmptyStateViewModel,
} from './source-management-adapters.js';

import {
  adaptSourceListPage,
  adaptSourceDetail,
  adaptSourceRevisionPage,
  adaptSourceRelationshipPage,
  adaptPaginationInfo,
} from './source-management-adapters.js';

// ============================================================================
// Rendering State Discriminators
// ============================================================================

/**
 * Discriminator for page rendering state.
 * Determines which view model template should render.
 */
export type PageRenderingStateKind =
  | 'loading'
  | 'success'
  | 'empty'
  | 'partial_data'
  | 'error'
  | 'unauthorized'
  | 'degraded';

/**
 * Rendering state metadata.
 * Provides diagnostic info for debugging and monitoring.
 */
export interface RenderingStateMetadata {
  /** State kind */
  kind: PageRenderingStateKind;
  /** Timestamp when state was created */
  timestamp: string;
  /** Optional error code */
  errorCode?: string;
  /** Optional warning messages */
  warnings?: string[];
}

// ============================================================================
// Loading State
// ============================================================================

/**
 * Loading state view model.
 * Shown when data is being fetched from backend.
 */
export interface LoadingStateViewModel {
  metadata: RenderingStateMetadata;
  /** Loading message for screen readers */
  loadingMessage: string;
  /** Whether to show a progress indicator */
  showProgress: boolean;
  /** Optional cancellation support */
  cancellable: boolean;
}

/**
 * Create loading state view model.
 */
export function createLoadingState(options?: {
  loadingMessage?: string;
  showProgress?: boolean;
  cancellable?: boolean;
}): LoadingStateViewModel {
  return {
    metadata: {
      kind: 'loading',
      timestamp: new Date().toISOString(),
    },
    loadingMessage: options?.loadingMessage ?? 'Loading sources...',
    showProgress: options?.showProgress ?? true,
    cancellable: options?.cancellable ?? false,
  };
}

// ============================================================================
// Success State
// ============================================================================

/**
 * Success state view model for source list page.
 */
export interface SourceListSuccessStateViewModel {
  metadata: RenderingStateMetadata;
  items: SourceListItemViewModel[];
  pagination: PaginationViewModel;
  permissions: SourceManagementPermissions;
  hasData: boolean;
}

/**
 * Success state view model for source detail page.
 */
export interface SourceDetailSuccessStateViewModel {
  metadata: RenderingStateMetadata;
  source: SourceDetailViewModel;
  permissions: SourceManagementPermissions;
  hasData: boolean;
}

/**
 * Success state view model for revision timeline page.
 */
export interface SourceRevisionTimelineSuccessStateViewModel {
  metadata: RenderingStateMetadata;
  sourceId: string;
  sourceLabel: string;
  items: SourceRevisionListItemViewModel[];
  pagination: PaginationViewModel;
  permissions: SourceManagementPermissions;
  hasData: boolean;
}

/**
 * Success state view model for relationship graph page.
 */
export interface SourceRelationshipGraphSuccessStateViewModel {
  metadata: RenderingStateMetadata;
  sourceId: string;
  sourceLabel: string;
  items: SourceRelationshipViewModel[];
  pagination: PaginationViewModel;
  permissions: SourceManagementPermissions;
  hasData: boolean;
}

/**
 * Create success state for source list.
 */
export function createSourceListSuccessState(
  page: SourceListPage
): SourceListSuccessStateViewModel {
  const adapted = adaptSourceListPage(page);

  return {
    metadata: {
      kind: 'success',
      timestamp: new Date().toISOString(),
    },
    items: adapted.items,
    pagination: adapted.pagination,
    permissions: adapted.permissions,
    hasData: adapted.items.length > 0,
  };
}

/**
 * Create success state for source detail.
 */
export function createSourceDetailSuccessState(
  detail: SourceDetail
): SourceDetailSuccessStateViewModel {
  const adapted = adaptSourceDetail(detail);

  return {
    metadata: {
      kind: 'success',
      timestamp: new Date().toISOString(),
    },
    source: adapted,
    permissions: detail.permissions,
    hasData: !adapted.isEmpty,
  };
}

/**
 * Create success state for revision timeline.
 */
export function createSourceRevisionTimelineSuccessState(
  page: SourceRevisionPage
): SourceRevisionTimelineSuccessStateViewModel {
  const adapted = adaptSourceRevisionPage(page);

  return {
    metadata: {
      kind: 'success',
      timestamp: new Date().toISOString(),
    },
    sourceId: adapted.source.id,
    sourceLabel: adapted.source.label,
    items: adapted.items,
    pagination: adapted.pagination,
    permissions: adapted.permissions,
    hasData: adapted.items.length > 0,
  };
}

/**
 * Create success state for relationship graph.
 */
export function createSourceRelationshipGraphSuccessState(
  page: SourceRelationshipPage
): SourceRelationshipGraphSuccessStateViewModel {
  const adapted = adaptSourceRelationshipPage(page);

  return {
    metadata: {
      kind: 'success',
      timestamp: new Date().toISOString(),
    },
    sourceId: adapted.source.id,
    sourceLabel: adapted.source.label,
    items: adapted.items,
    pagination: adapted.pagination,
    permissions: adapted.permissions,
    hasData: adapted.items.length > 0,
  };
}

// ============================================================================
// Empty State
// ============================================================================

/**
 * Empty state view model.
 * Shown when query returns no results or resource doesn't exist.
 */
export interface EmptyStateViewModel2 {
  metadata: RenderingStateMetadata;
  emptyState: EmptyStateViewModel;
  /** Suggested actions for user */
  suggestedActions: EmptyStateAction[];
  /** Whether user can perform actions to resolve empty state */
  actionable: boolean;
}

/**
 * Suggested action for empty state.
 */
export interface EmptyStateAction {
  label: string;
  description?: string;
  actionType: 'navigate' | 'filter_reset' | 'create' | 'external';
  actionUrl?: string;
  actionHandler?: string;
}

/**
 * Create empty state view model.
 */
export function createEmptyState(
  emptyState: LineageEmptyState,
  options?: {
    suggestedActions?: EmptyStateAction[];
    actionable?: boolean;
  }
): EmptyStateViewModel2 {
  const kind = emptyState.kind ?? 'none';

  return {
    metadata: {
      kind: 'empty',
      timestamp: new Date().toISOString(),
    },
    emptyState: {
      isEmpty: kind !== 'none',
      kind,
      title: emptyState.title ?? '',
      description: emptyState.description ?? '',
    },
    suggestedActions: options?.suggestedActions ?? [],
    actionable: options?.actionable ?? false,
  };
}

// ============================================================================
// Partial Data State
// ============================================================================

/**
 * Partial data state view model.
 * Shown when some data loaded but some fields are missing or degraded.
 */
export interface PartialDataStateViewModel<TSuccessState> {
  metadata: RenderingStateMetadata;
  /** Successfully loaded data */
  successState: TSuccessState;
  /** Fields that are missing or degraded */
  missingFields: string[];
  /** Warnings about data quality */
  warnings: PartialDataWarning[];
  /** Whether page is still usable despite missing data */
  usable: boolean;
}

/**
 * Warning about partial data quality.
 */
export interface PartialDataWarning {
  field: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
}

/**
 * Create partial data state.
 */
export function createPartialDataState<TSuccessState>(
  successState: TSuccessState,
  missingFields: string[],
  warnings: PartialDataWarning[],
  usable: boolean = true
): PartialDataStateViewModel<TSuccessState> {
  return {
    metadata: {
      kind: 'partial_data',
      timestamp: new Date().toISOString(),
      warnings: warnings.map((w) => w.message),
    },
    successState,
    missingFields,
    warnings,
    usable,
  };
}

// ============================================================================
// Error State
// ============================================================================

/**
 * Error state view model.
 * Shown when data fetch fails or backend returns error.
 */
export interface ErrorStateViewModel {
  metadata: RenderingStateMetadata;
  /** Error title */
  title: string;
  /** Error message */
  message: string;
  /** Error code (if available) */
  code?: string;
  /** Whether error is retryable */
  retryable: boolean;
  /** Suggested actions for recovery */
  suggestedActions: ErrorStateAction[];
}

/**
 * Suggested action for error recovery.
 */
export interface ErrorStateAction {
  label: string;
  actionType: 'retry' | 'navigate' | 'contact_support';
  actionUrl?: string;
  actionHandler?: string;
}

/**
 * Create error state from Error object.
 */
export function createErrorState(error: Error, retryable: boolean = true): ErrorStateViewModel {
  // Extract error code from message if present (e.g., "HTTP 404: Not Found")
  const httpMatch = error.message.match(/HTTP (\d+):/);
  const errorCode = httpMatch ? `HTTP_${httpMatch[1]}` : undefined;

  const suggestedActions: ErrorStateAction[] = [];

  if (retryable) {
    suggestedActions.push({
      label: 'Try Again',
      actionType: 'retry',
      actionHandler: 'retry',
    });
  }

  suggestedActions.push({
    label: 'Go Back',
    actionType: 'navigate',
    actionHandler: 'goBack',
  });

  return {
    metadata: {
      kind: 'error',
      timestamp: new Date().toISOString(),
      errorCode,
    },
    title: 'Unable to Load Data',
    message: error.message,
    code: errorCode,
    retryable,
    suggestedActions,
  };
}

// ============================================================================
// Unauthorized State
// ============================================================================

/**
 * Unauthorized state view model.
 * Shown when user lacks permissions to view resource.
 */
export interface UnauthorizedStateViewModel {
  metadata: RenderingStateMetadata;
  /** Unauthorized message title */
  title: string;
  /** Unauthorized message description */
  description: string;
  /** Requested permission */
  requiredPermission?: string;
  /** Suggested actions */
  suggestedActions: UnauthorizedStateAction[];
}

/**
 * Suggested action for unauthorized state.
 */
export interface UnauthorizedStateAction {
  label: string;
  actionType: 'navigate' | 'request_access' | 'login';
  actionUrl?: string;
  actionHandler?: string;
}

/**
 * Create unauthorized state.
 */
export function createUnauthorizedState(options?: {
  title?: string;
  description?: string;
  requiredPermission?: string;
}): UnauthorizedStateViewModel {
  return {
    metadata: {
      kind: 'unauthorized',
      timestamp: new Date().toISOString(),
    },
    title: options?.title ?? 'Access Denied',
    description:
      options?.description ??
      'You do not have permission to view this resource. Contact your administrator if you believe this is an error.',
    requiredPermission: options?.requiredPermission,
    suggestedActions: [
      {
        label: 'Go Back',
        actionType: 'navigate',
        actionHandler: 'goBack',
      },
      {
        label: 'Request Access',
        actionType: 'request_access',
        actionHandler: 'requestAccess',
      },
    ],
  };
}

// ============================================================================
// Degraded State
// ============================================================================

/**
 * Degraded state view model.
 * Shown when system is experiencing issues but page is still usable.
 */
export interface DegradedStateViewModel<TSuccessState> {
  metadata: RenderingStateMetadata;
  /** Successfully loaded data (may be stale or cached) */
  successState: TSuccessState;
  /** Degradation reason */
  degradationReason: string;
  /** Degradation severity */
  severity: 'info' | 'warning' | 'critical';
  /** Optional actions to improve state */
  suggestedActions: DegradedStateAction[];
  /** Whether data is stale */
  stale: boolean;
  /** Timestamp of last successful fetch */
  lastSuccessfulFetch?: string;
}

/**
 * Suggested action for degraded state.
 */
export interface DegradedStateAction {
  label: string;
  actionType: 'retry' | 'refresh' | 'navigate';
  actionUrl?: string;
  actionHandler?: string;
}

/**
 * Create degraded state.
 */
export function createDegradedState<TSuccessState>(
  successState: TSuccessState,
  degradationReason: string,
  severity: 'info' | 'warning' | 'critical',
  options?: {
    stale?: boolean;
    lastSuccessfulFetch?: string;
    suggestedActions?: DegradedStateAction[];
  }
): DegradedStateViewModel<TSuccessState> {
  return {
    metadata: {
      kind: 'degraded',
      timestamp: new Date().toISOString(),
      warnings: [degradationReason],
    },
    successState,
    degradationReason,
    severity,
    suggestedActions: options?.suggestedActions ?? [
      {
        label: 'Refresh',
        actionType: 'refresh',
        actionHandler: 'refresh',
      },
    ],
    stale: options?.stale ?? false,
    lastSuccessfulFetch: options?.lastSuccessfulFetch,
  };
}

// ============================================================================
// Rendering State Resolver
// ============================================================================

/**
 * Union type of all possible rendering states for source list page.
 */
export type SourceListRenderingState =
  | LoadingStateViewModel
  | SourceListSuccessStateViewModel
  | EmptyStateViewModel2
  | PartialDataStateViewModel<SourceListSuccessStateViewModel>
  | ErrorStateViewModel
  | UnauthorizedStateViewModel
  | DegradedStateViewModel<SourceListSuccessStateViewModel>;

/**
 * Union type of all possible rendering states for source detail page.
 */
export type SourceDetailRenderingState =
  | LoadingStateViewModel
  | SourceDetailSuccessStateViewModel
  | EmptyStateViewModel2
  | PartialDataStateViewModel<SourceDetailSuccessStateViewModel>
  | ErrorStateViewModel
  | UnauthorizedStateViewModel
  | DegradedStateViewModel<SourceDetailSuccessStateViewModel>;

/**
 * Union type of all possible rendering states for revision timeline page.
 */
export type SourceRevisionTimelineRenderingState =
  | LoadingStateViewModel
  | SourceRevisionTimelineSuccessStateViewModel
  | EmptyStateViewModel2
  | PartialDataStateViewModel<SourceRevisionTimelineSuccessStateViewModel>
  | ErrorStateViewModel
  | UnauthorizedStateViewModel
  | DegradedStateViewModel<SourceRevisionTimelineSuccessStateViewModel>;

/**
 * Resolve rendering state from page state.
 * This is the primary integration point between page controllers and rendering layer.
 */
export function resolveSourceListRenderingState(
  loading: boolean,
  error: Error | null,
  data: SourceListPage | null
): SourceListRenderingState {
  // Loading state
  if (loading) {
    return createLoadingState({ loadingMessage: 'Loading sources...' });
  }

  // Error state
  if (error !== null) {
    // Check if this is an unauthorized error
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      return createUnauthorizedState();
    }
    return createErrorState(error);
  }

  // No data yet
  if (data === null) {
    return createLoadingState();
  }

  // Empty state
  if (data.empty_state.kind !== 'none') {
    return createEmptyState(data.empty_state, {
      suggestedActions: [
        {
          label: 'Clear Filters',
          actionType: 'filter_reset',
          actionHandler: 'clearFilters',
        },
      ],
      actionable: true,
    });
  }

  // Success state
  return createSourceListSuccessState(data);
}

/**
 * Resolve rendering state for source detail page.
 */
export function resolveSourceDetailRenderingState(
  loading: boolean,
  error: Error | null,
  data: SourceDetail | null
): SourceDetailRenderingState {
  // Loading state
  if (loading) {
    return createLoadingState({ loadingMessage: 'Loading source...' });
  }

  // Error state
  if (error !== null) {
    // Check if this is an unauthorized error
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      return createUnauthorizedState();
    }
    // Check if this is a not-found error
    if (error.message.includes('404') || error.message.includes('Not Found')) {
      return createEmptyState(
        {
          kind: 'not_found',
          title: 'Source Not Found',
          description: 'The requested source document could not be found.',
        },
        {
          suggestedActions: [
            {
              label: 'View All Sources',
              actionType: 'navigate',
              actionUrl: '/admin/sources',
            },
          ],
        }
      );
    }
    return createErrorState(error);
  }

  // No data yet
  if (data === null) {
    return createLoadingState();
  }

  // Empty state
  if (data.empty_state.kind !== 'none') {
    return createEmptyState(data.empty_state);
  }

  // Success state
  return createSourceDetailSuccessState(data);
}

/**
 * Resolve rendering state for revision timeline page.
 */
export function resolveSourceRevisionTimelineRenderingState(
  loading: boolean,
  error: Error | null,
  data: SourceRevisionPage | null
): SourceRevisionTimelineRenderingState {
  // Loading state
  if (loading) {
    return createLoadingState({ loadingMessage: 'Loading revisions...' });
  }

  // Error state
  if (error !== null) {
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      return createUnauthorizedState();
    }
    return createErrorState(error);
  }

  // No data yet
  if (data === null) {
    return createLoadingState();
  }

  // Empty state
  if (data.empty_state.kind !== 'none') {
    return createEmptyState(data.empty_state);
  }

  // Success state
  return createSourceRevisionTimelineSuccessState(data);
}

// ============================================================================
// Phase 13 Rendering States (Task 13.11)
// ============================================================================

/**
 * Phase 13 search result view model.
 * Render-ready search result with comment and relationship fields.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 13 Task 13.11
 */
export interface Phase13SearchResultViewModel {
  id: string;
  resultKind: string;
  resultKindLabel: string;
  sourceId: string;
  sourceLabel: string;
  sourceUrl: string;
  revisionId: string;
  revisionHint: string;
  modifiedTime: string;
  providerKind: string;
  providerLabel: string;
  webUrl: string;
  matchedFields: string[];
  matchedFieldLabels: string[];
  summary: string;
  relationshipState: string;
  relationshipStateLabel: string;
  commentSyncStatus: string;
  commentSyncStatusLabel: string;
  commentCount: number;
  hasComments: boolean;
  artifactHash: string;
}

/**
 * Phase 13 comment sync status view model.
 * Render-ready sync status indicator.
 */
export interface CommentSyncStatusViewModel {
  status: string;
  statusLabel: string;
  statusVariant: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  threadCount: number;
  messageCount: number;
  lastSyncedAt: string;
  lastAttemptAt: string;
  hasError: boolean;
  errorCode: string;
  errorMessage: string;
  isStale: boolean;
  isPending: boolean;
  isSynced: boolean;
}

/**
 * Phase 13 comment thread view model.
 * Render-ready comment thread summary.
 */
export interface Phase13CommentThreadViewModel {
  id: string;
  providerCommentId: string;
  threadId: string;
  status: string;
  statusLabel: string;
  isResolved: boolean;
  anchorKind: string;
  anchorLabel: string;
  authorName: string;
  authorEmail: string;
  authorType: string;
  authorTypeLabel: string;
  bodyPreview: string;
  messageCount: number;
  replyCount: number;
  hasReplies: boolean;
  resolvedAt: string;
  lastSyncedAt: string;
  lastActivityAt: string;
  syncStatus: string;
  syncStatusLabel: string;
}

/**
 * Success state for Phase 13 search page.
 */
export interface Phase13SearchSuccessStateViewModel {
  metadata: RenderingStateMetadata;
  items: Phase13SearchResultViewModel[];
  pagination: PaginationViewModel;
  permissions: SourceManagementPermissions;
  hasData: boolean;
  hasFilters: boolean;
  filterSummary: string;
}

/**
 * Success state for Phase 13 comment page.
 */
export interface Phase13CommentSuccessStateViewModel {
  metadata: RenderingStateMetadata;
  sourceId: string;
  sourceLabel: string;
  revisionId: string;
  revisionHint: string;
  items: Phase13CommentThreadViewModel[];
  pagination: PaginationViewModel;
  permissions: SourceManagementPermissions;
  syncStatus: CommentSyncStatusViewModel;
  hasData: boolean;
}

/**
 * Union type of all possible Phase 13 search page rendering states.
 */
export type Phase13SearchRenderingState =
  | LoadingStateViewModel
  | Phase13SearchSuccessStateViewModel
  | EmptyStateViewModel2
  | PartialDataStateViewModel<Phase13SearchSuccessStateViewModel>
  | ErrorStateViewModel
  | UnauthorizedStateViewModel
  | DegradedStateViewModel<Phase13SearchSuccessStateViewModel>;

/**
 * Union type of all possible Phase 13 comment page rendering states.
 */
export type Phase13CommentRenderingState =
  | LoadingStateViewModel
  | Phase13CommentSuccessStateViewModel
  | EmptyStateViewModel2
  | PartialDataStateViewModel<Phase13CommentSuccessStateViewModel>
  | ErrorStateViewModel
  | UnauthorizedStateViewModel
  | DegradedStateViewModel<Phase13CommentSuccessStateViewModel>;

// ============================================================================
// Phase 13 Formatting Helpers
// ============================================================================

/**
 * Format search result kind for display.
 */
function formatSearchResultKind(kind: string): string {
  const labels: Record<string, string> = {
    source_document: 'Source Document',
    source_revision: 'Source Revision',
  };
  return labels[kind] ?? kind;
}

/**
 * Format matched field names for display.
 */
function formatMatchedFields(fields: string[]): string[] {
  const labels: Record<string, string> = {
    canonical_title: 'Title',
    external_file_id: 'File ID',
    revision_hint: 'Version',
    artifact_hash: 'Content Hash',
    fingerprint_hash: 'Fingerprint',
    comment_text: 'Comment Text',
    provider_url: 'URL',
    search_text: 'Content',
  };
  return fields.map((field) => labels[field] ?? field);
}

/**
 * Format comment sync status for display.
 */
function formatCommentSyncStatus(status: string): string {
  const labels: Record<string, string> = {
    not_configured: 'Not Configured',
    pending_sync: 'Syncing...',
    synced: 'Synced',
    failed: 'Sync Failed',
    stale: 'Data May Be Outdated',
  };
  return labels[status] ?? status;
}

/**
 * Resolve sync status variant for styling.
 */
function resolveSyncStatusVariant(
  status: string
): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  switch (status) {
    case 'synced':
      return 'success';
    case 'pending_sync':
      return 'info';
    case 'failed':
      return 'error';
    case 'stale':
      return 'warning';
    case 'not_configured':
    default:
      return 'neutral';
  }
}

/**
 * Format comment thread status for display.
 */
function formatCommentThreadStatus(status: string): string {
  const labels: Record<string, string> = {
    open: 'Open',
    resolved: 'Resolved',
    deleted: 'Deleted',
  };
  return labels[status] ?? status;
}

/**
 * Format author type for display.
 */
function formatAuthorType(type: string): string {
  const labels: Record<string, string> = {
    user: 'User',
    bot: 'Bot',
    service_account: 'Service Account',
  };
  return labels[type] ?? type;
}

// ============================================================================
// Phase 13 Adapters
// ============================================================================

/**
 * Adapt Phase 13 search result summary to view model.
 */
export function adaptPhase13SearchResult(
  item: Phase13SourceSearchResults['items'][0]
): Phase13SearchResultViewModel {
  return {
    id: item.source?.id ?? item.revision?.id ?? '',
    resultKind: item.result_kind ?? 'unknown',
    resultKindLabel: formatSearchResultKind(item.result_kind ?? ''),
    sourceId: item.source?.id ?? '',
    sourceLabel: item.source?.label ?? '(Untitled)',
    sourceUrl: item.source?.url ?? '',
    revisionId: item.revision?.id ?? '',
    revisionHint: item.revision?.provider_revision_hint ?? '',
    modifiedTime: item.revision?.modified_time ?? '',
    providerKind: item.provider?.kind ?? '',
    providerLabel: item.provider?.label ?? '',
    webUrl: item.provider?.web_url ?? '',
    matchedFields: item.matched_fields ?? [],
    matchedFieldLabels: formatMatchedFields(item.matched_fields ?? []),
    summary: item.summary ?? '',
    relationshipState: item.relationship_state ?? '',
    relationshipStateLabel: formatRelationshipStatus(item.relationship_state),
    commentSyncStatus: item.comment_sync_status ?? '',
    commentSyncStatusLabel: formatCommentSyncStatus(item.comment_sync_status ?? ''),
    commentCount: item.comment_count ?? 0,
    hasComments: item.has_comments ?? false,
    artifactHash: item.artifact_hash ?? '',
  };
}

// Import formatRelationshipStatus from adapters or define locally
function formatRelationshipStatus(status: string | undefined): string {
  const normalized = (status ?? 'unknown').toLowerCase();
  const labels: Record<string, string> = {
    pending_review: 'Pending Review',
    confirmed: 'Confirmed',
    rejected: 'Rejected',
    superseded: 'Superseded',
    auto_linked: 'Auto-Linked',
    unknown: '',
  };
  return labels[normalized] ?? normalized;
}

/**
 * Adapt comment sync summary to view model.
 */
export function adaptCommentSyncStatus(
  syncStatus: string,
  sync?: SourceCommentSyncSummary
): CommentSyncStatusViewModel {
  const status = sync?.status ?? syncStatus;
  return {
    status,
    statusLabel: formatCommentSyncStatus(status),
    statusVariant: resolveSyncStatusVariant(status),
    threadCount: sync?.thread_count ?? 0,
    messageCount: sync?.message_count ?? 0,
    lastSyncedAt: sync?.last_synced_at ?? '',
    lastAttemptAt: sync?.last_attempt_at ?? '',
    hasError: !!sync?.error_code,
    errorCode: sync?.error_code ?? '',
    errorMessage: sync?.error_message ?? '',
    isStale: status === 'stale',
    isPending: status === 'pending_sync',
    isSynced: status === 'synced',
  };
}

/**
 * Adapt Phase 13 comment thread summary to view model.
 */
export function adaptPhase13CommentThread(
  item: Phase13SourceCommentPage['items'][0]
): Phase13CommentThreadViewModel {
  return {
    id: item.id ?? '',
    providerCommentId: item.provider_comment_id ?? '',
    threadId: item.thread_id ?? '',
    status: item.status ?? 'unknown',
    statusLabel: formatCommentThreadStatus(item.status ?? ''),
    isResolved: !!item.resolved_at,
    anchorKind: item.anchor?.kind ?? '',
    anchorLabel: item.anchor?.label ?? 'General',
    authorName: item.author?.display_name ?? item.author_name ?? 'Unknown',
    authorEmail: item.author?.email ?? '',
    authorType: item.author?.type ?? 'user',
    authorTypeLabel: formatAuthorType(item.author?.type ?? 'user'),
    bodyPreview: item.body_preview ?? '',
    messageCount: item.message_count ?? 0,
    replyCount: item.reply_count ?? 0,
    hasReplies: (item.reply_count ?? 0) > 0,
    resolvedAt: item.resolved_at ?? '',
    lastSyncedAt: item.last_synced_at ?? '',
    lastActivityAt: item.last_activity_at ?? '',
    syncStatus: item.sync_status ?? '',
    syncStatusLabel: formatCommentSyncStatus(item.sync_status ?? ''),
  };
}

// ============================================================================
// Phase 13 State Creators
// ============================================================================

/**
 * Create success state for Phase 13 search page.
 */
export function createPhase13SearchSuccessState(
  data: Phase13SourceSearchResults
): Phase13SearchSuccessStateViewModel {
  const items = (data.items ?? []).map(adaptPhase13SearchResult);
  const query = data.applied_query;

  // Build filter summary
  const filters: string[] = [];
  if (query.query) filters.push(`query: "${query.query}"`);
  if (query.has_comments !== undefined) {
    filters.push(query.has_comments ? 'has comments' : 'no comments');
  }
  if (query.comment_sync_status) filters.push(`sync: ${query.comment_sync_status}`);
  if (query.relationship_state) filters.push(`relationship: ${query.relationship_state}`);

  return {
    metadata: {
      kind: 'success',
      timestamp: new Date().toISOString(),
    },
    items,
    pagination: adaptPaginationInfo(data.page_info),
    permissions: data.permissions,
    hasData: items.length > 0,
    hasFilters: filters.length > 1 || (filters.length === 1 && !query.query),
    filterSummary: filters.join(', '),
  };
}

/**
 * Create success state for Phase 13 comment page.
 */
export function createPhase13CommentSuccessState(
  data: Phase13SourceCommentPage
): Phase13CommentSuccessStateViewModel {
  const items = (data.items ?? []).map(adaptPhase13CommentThread);

  return {
    metadata: {
      kind: 'success',
      timestamp: new Date().toISOString(),
    },
    sourceId: data.source?.id ?? '',
    sourceLabel: data.source?.label ?? '(Untitled)',
    revisionId: data.revision?.id ?? '',
    revisionHint: data.revision?.provider_revision_hint ?? '',
    items,
    pagination: adaptPaginationInfo(data.page_info),
    permissions: data.permissions,
    syncStatus: adaptCommentSyncStatus(data.sync_status, data.sync),
    hasData: items.length > 0,
  };
}

// ============================================================================
// Phase 13 Rendering State Resolvers
// ============================================================================

/**
 * Resolve rendering state for Phase 13 search page.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 13 Task 13.11
 */
export function resolvePhase13SearchRenderingState(
  loading: boolean,
  error: Error | null,
  data: Phase13SourceSearchResults | null
): Phase13SearchRenderingState {
  // Loading state
  if (loading) {
    return createLoadingState({ loadingMessage: 'Searching sources...' });
  }

  // Error state
  if (error !== null) {
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      return createUnauthorizedState();
    }
    return createErrorState(error);
  }

  // No data yet
  if (data === null) {
    return createLoadingState();
  }

  // Empty state
  if (data.empty_state.kind !== 'none') {
    return createEmptyState(data.empty_state, {
      suggestedActions: [
        {
          label: 'Clear Search',
          actionType: 'filter_reset',
          actionHandler: 'clearSearch',
        },
      ],
      actionable: true,
    });
  }

  // Success state
  return createPhase13SearchSuccessState(data);
}

/**
 * Resolve rendering state for Phase 13 comment page.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 13 Task 13.11
 */
export function resolvePhase13CommentRenderingState(
  loading: boolean,
  error: Error | null,
  data: Phase13SourceCommentPage | null
): Phase13CommentRenderingState {
  // Loading state
  if (loading) {
    return createLoadingState({ loadingMessage: 'Loading comments...' });
  }

  // Error state
  if (error !== null) {
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      return createUnauthorizedState({
        title: 'Comments Not Available',
        description: 'You do not have permission to view comments for this source.',
        requiredPermission: 'can_view_comments',
      });
    }
    return createErrorState(error);
  }

  // No data yet
  if (data === null) {
    return createLoadingState();
  }

  // Check sync status for special rendering
  const syncStatus = data.sync_status;

  // Sync failed - show degraded state with error info
  if (syncStatus === 'failed') {
    return createDegradedState(
      createPhase13CommentSuccessState(data),
      data.sync?.error_message ?? 'Comment synchronization failed',
      'critical',
      {
        stale: false,
        suggestedActions: [
          {
            label: 'Retry Sync',
            actionType: 'retry',
            actionHandler: 'retrySync',
          },
        ],
      }
    );
  }

  // Sync stale - show degraded state with warning
  if (syncStatus === 'stale') {
    return createDegradedState(
      createPhase13CommentSuccessState(data),
      'Comment data may be outdated',
      'warning',
      {
        stale: true,
        lastSuccessfulFetch: data.sync?.last_synced_at,
        suggestedActions: [
          {
            label: 'Refresh',
            actionType: 'refresh',
            actionHandler: 'refresh',
          },
        ],
      }
    );
  }

  // Empty state (no comments, but sync is OK)
  if (data.empty_state.kind !== 'none') {
    // Pending sync is a special empty state
    if (syncStatus === 'pending_sync') {
      return createEmptyState(
        {
          kind: 'pending_sync',
          title: 'Comments syncing',
          description: 'Comment synchronization is in progress. Comments will appear once sync completes.',
        },
        {
          actionable: false,
        }
      );
    }

    // Not configured is also a special empty state
    if (syncStatus === 'not_configured') {
      return createEmptyState(
        {
          kind: 'not_configured',
          title: 'Comments not configured',
          description: 'Comment synchronization is not enabled for this source.',
        },
        {
          actionable: false,
        }
      );
    }

    // Regular empty state (synced but no comments)
    return createEmptyState(data.empty_state, {
      suggestedActions: [
        {
          label: 'View Source',
          actionType: 'navigate',
          actionUrl: data.links?.source,
        },
      ],
    });
  }

  // Success state
  return createPhase13CommentSuccessState(data);
}
