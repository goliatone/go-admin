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
