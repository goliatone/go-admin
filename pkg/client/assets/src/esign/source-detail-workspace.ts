/**
 * Source Detail Workspace
 *
 * Rich source detail workspace implementation that consumes backend-published
 * source workspace contract family and approved frontend contract modules only.
 *
 * CRITICAL ARCHITECTURAL RULES:
 * 1. Frontend owns: information architecture, panel layout, interaction details, accessibility
 * 2. Backend owns: relationships, labels, semantics, lineage logic, revision continuity
 * 3. Frontend must NOT infer missing relationships, labels, or semantics from unrelated payloads
 * 4. All drill-in navigation uses backend-provided links only
 * 5. Do NOT mix document detail, agreement detail, diagnostics, or raw provider payloads
 *
 * @see DOC_LINEAGE_V2_TSK.md Phase 16 Task 16.6
 * @see source-management-rendering-states.ts for panel rendering state resolvers
 */

import type {
  SourceDetail,
  SourceRevisionPage,
  SourceRelationshipPage,
  SourceArtifactPage,
  SourceHandlePage,
  SourceManagementLinks,
  SourceManagementPermissions,
  LineageEmptyState,
  Phase13SourceCommentPage,
} from './lineage-contracts.js';

import type {
  SourceDetailViewModel,
  SourceRevisionListItemViewModel,
  SourceRelationshipViewModel,
  PaginationViewModel,
  EmptyStateViewModel,
} from './source-management-adapters.js';

import {
  adaptSourceDetail,
  adaptSourceRevisionPage,
  adaptSourceRelationshipPage,
  adaptPaginationInfo,
  adaptEmptyState,
} from './source-management-adapters.js';

import type {
  RenderingStateMetadata,
  PageRenderingStateKind,
} from './source-management-rendering-states.js';

import {
  createLoadingState,
  createEmptyState as createEmptyStateRender,
  createErrorState,
  createUnauthorizedState,
} from './source-management-rendering-states.js';
import { formatByteSize as formatSharedByteSize } from '../shared/size-formatters.js';

// ============================================================================
// Workspace Panel Types (Phase 16 Task 16.6)
// ============================================================================

/**
 * Panel identifier for source detail workspace.
 * Each panel corresponds to a distinct resource surface.
 */
export type SourceWorkspacePanel =
  | 'overview'
  | 'revisions'
  | 'artifacts'
  | 'relationships'
  | 'comments'
  | 'handles';

/**
 * Panel rendering state discriminator.
 * Extends PageRenderingStateKind with workspace-specific states.
 */
export type WorkspacePanelStateKind =
  | PageRenderingStateKind
  | 'collapsed'
  | 'no_agreements'
  | 'no_artifacts'
  | 'no_comments'
  | 'no_relationships'
  | 'repeated_revisions'
  | 'merged_source'
  | 'archived_source';

// ============================================================================
// Workspace Panel View Models (Phase 16 Task 16.6)
// ============================================================================

/**
 * Base panel state metadata.
 */
export interface WorkspacePanelMetadata {
  panelId: SourceWorkspacePanel;
  stateKind: WorkspacePanelStateKind;
  timestamp: string;
  warnings?: string[];
}

/**
 * Panel loading state.
 */
export interface WorkspacePanelLoadingState {
  metadata: WorkspacePanelMetadata;
  loadingMessage: string;
  showProgress: boolean;
}

/**
 * Panel empty state.
 */
export interface WorkspacePanelEmptyState {
  metadata: WorkspacePanelMetadata;
  emptyState: EmptyStateViewModel;
  backendEmptyStateKind: string;
  suggestedActionLabel?: string;
  suggestedActionUrl?: string;
  actionable: boolean;
}

/**
 * Panel error state.
 */
export interface WorkspacePanelErrorState {
  metadata: WorkspacePanelMetadata;
  title: string;
  message: string;
  code?: string;
  retryable: boolean;
}

/**
 * Overview panel success state.
 */
export interface OverviewPanelSuccessState {
  metadata: WorkspacePanelMetadata;
  source: SourceDetailViewModel;
  permissions: SourceManagementPermissions;
  links: SourceManagementLinks;
}

/**
 * Revisions panel success state.
 */
export interface RevisionsPanelSuccessState {
  metadata: WorkspacePanelMetadata;
  sourceId: string;
  sourceLabel: string;
  items: SourceRevisionListItemViewModel[];
  pagination: PaginationViewModel;
  permissions: SourceManagementPermissions;
  links: SourceManagementLinks;
  hasRepeatedRevisions: boolean;
}

/**
 * Artifacts panel success state.
 */
export interface ArtifactsPanelSuccessState {
  metadata: WorkspacePanelMetadata;
  revisionId: string;
  items: ArtifactPanelItemViewModel[];
  pagination: PaginationViewModel;
  permissions: SourceManagementPermissions;
  links: SourceManagementLinks;
}

/**
 * Artifact panel item view model.
 */
export interface ArtifactPanelItemViewModel {
  id: string;
  artifactKind: string;
  artifactKindLabel: string;
  sha256: string;
  sha256Short: string;
  pageCount: number;
  sizeBytes: number;
  sizeBytesFormatted: string;
  compatibilityTier: string;
  compatibilityTierLabel: string;
  normalizationStatus: string;
  normalizationStatusLabel: string;
  links: SourceManagementLinks;
}

/**
 * Relationships panel success state.
 */
export interface RelationshipsPanelSuccessState {
  metadata: WorkspacePanelMetadata;
  sourceId: string;
  sourceLabel: string;
  items: SourceRelationshipViewModel[];
  pagination: PaginationViewModel;
  permissions: SourceManagementPermissions;
  links: SourceManagementLinks;
  hasPendingCandidates: boolean;
  pendingCandidateCount: number;
}

/**
 * Comments panel success state.
 */
export interface CommentsPanelSuccessState {
  metadata: WorkspacePanelMetadata;
  sourceId: string;
  sourceLabel: string;
  revisionId: string;
  items: CommentPanelItemViewModel[];
  pagination: PaginationViewModel;
  permissions: SourceManagementPermissions;
  links: SourceManagementLinks;
  syncStatus: string;
  syncStatusLabel: string;
  threadCount: number;
  messageCount: number;
}

/**
 * Comment panel item view model.
 */
export interface CommentPanelItemViewModel {
  id: string;
  threadId: string;
  status: string;
  statusLabel: string;
  isResolved: boolean;
  anchorKind: string;
  anchorLabel: string;
  authorName: string;
  authorType: string;
  bodyPreview: string;
  messageCount: number;
  replyCount: number;
  hasReplies: boolean;
  lastActivityAt: string;
  links: SourceManagementLinks;
}

/**
 * Handles panel success state.
 */
export interface HandlesPanelSuccessState {
  metadata: WorkspacePanelMetadata;
  sourceId: string;
  sourceLabel: string;
  items: HandlePanelItemViewModel[];
  pagination: PaginationViewModel;
  permissions: SourceManagementPermissions;
  links: SourceManagementLinks;
  activeHandleId: string;
}

/**
 * Handle panel item view model.
 */
export interface HandlePanelItemViewModel {
  id: string;
  providerKind: string;
  providerKindLabel: string;
  externalFileId: string;
  accountId: string;
  webUrl: string;
  handleStatus: string;
  handleStatusLabel: string;
  isActive: boolean;
  validFrom: string;
  validTo: string;
  links: SourceManagementLinks;
}

// ============================================================================
// Workspace Panel Union Types (Phase 16 Task 16.6)
// ============================================================================

/**
 * Union type for overview panel states.
 */
export type OverviewPanelRenderingState =
  | WorkspacePanelLoadingState
  | OverviewPanelSuccessState
  | WorkspacePanelEmptyState
  | WorkspacePanelErrorState;

/**
 * Union type for revisions panel states.
 */
export type RevisionsPanelRenderingState =
  | WorkspacePanelLoadingState
  | RevisionsPanelSuccessState
  | WorkspacePanelEmptyState
  | WorkspacePanelErrorState;

/**
 * Union type for artifacts panel states.
 */
export type ArtifactsPanelRenderingState =
  | WorkspacePanelLoadingState
  | ArtifactsPanelSuccessState
  | WorkspacePanelEmptyState
  | WorkspacePanelErrorState;

/**
 * Union type for relationships panel states.
 */
export type RelationshipsPanelRenderingState =
  | WorkspacePanelLoadingState
  | RelationshipsPanelSuccessState
  | WorkspacePanelEmptyState
  | WorkspacePanelErrorState;

/**
 * Union type for comments panel states.
 */
export type CommentsPanelRenderingState =
  | WorkspacePanelLoadingState
  | CommentsPanelSuccessState
  | WorkspacePanelEmptyState
  | WorkspacePanelErrorState;

/**
 * Union type for handles panel states.
 */
export type HandlesPanelRenderingState =
  | WorkspacePanelLoadingState
  | HandlesPanelSuccessState
  | WorkspacePanelEmptyState
  | WorkspacePanelErrorState;

// ============================================================================
// Workspace Composition (Phase 16 Task 16.6)
// ============================================================================

/**
 * Complete workspace state composed from backend contracts.
 * Frontend owns layout and presentation; backend owns all semantics.
 */
export interface SourceDetailWorkspaceState {
  /** Source ID from backend */
  sourceId: string;
  /** Active panel (frontend-owned UX state) */
  activePanel: SourceWorkspacePanel;
  /** Overview panel state */
  overview: OverviewPanelRenderingState;
  /** Revisions panel state (lazy-loaded) */
  revisions: RevisionsPanelRenderingState | null;
  /** Artifacts panel state (lazy-loaded) */
  artifacts: ArtifactsPanelRenderingState | null;
  /** Relationships panel state (lazy-loaded) */
  relationships: RelationshipsPanelRenderingState | null;
  /** Comments panel state (lazy-loaded) */
  comments: CommentsPanelRenderingState | null;
  /** Handles panel state (lazy-loaded) */
  handles: HandlesPanelRenderingState | null;
  /** Workspace-level permissions */
  permissions: SourceManagementPermissions;
  /** Workspace-level links for drill-in navigation */
  links: SourceManagementLinks;
}

// ============================================================================
// Panel State Creators (Phase 16 Task 16.6)
// ============================================================================

/**
 * Create panel loading state.
 */
export function createPanelLoadingState(
  panelId: SourceWorkspacePanel,
  loadingMessage?: string
): WorkspacePanelLoadingState {
  return {
    metadata: {
      panelId,
      stateKind: 'loading',
      timestamp: new Date().toISOString(),
    },
    loadingMessage: loadingMessage ?? `Loading ${panelId}...`,
    showProgress: true,
  };
}

/**
 * Create panel error state.
 */
export function createPanelErrorState(
  panelId: SourceWorkspacePanel,
  error: Error,
  retryable: boolean = true
): WorkspacePanelErrorState {
  const httpMatch = error.message.match(/HTTP (\d+):/);
  const errorCode = httpMatch ? `HTTP_${httpMatch[1]}` : undefined;

  return {
    metadata: {
      panelId,
      stateKind: 'error',
      timestamp: new Date().toISOString(),
    },
    title: 'Unable to Load Panel',
    message: error.message,
    code: errorCode,
    retryable,
  };
}

/**
 * Create panel empty state from backend LineageEmptyState.
 * Uses backend-authored fields only; does NOT synthesize semantics.
 */
export function createPanelEmptyState(
  panelId: SourceWorkspacePanel,
  backendEmptyState: LineageEmptyState,
  options?: {
    suggestedActionLabel?: string;
    suggestedActionUrl?: string;
    actionable?: boolean;
  }
): WorkspacePanelEmptyState {
  const kind = backendEmptyState.kind ?? 'none';
  const stateKind = resolvePanelEmptyStateKind(panelId, kind);

  return {
    metadata: {
      panelId,
      stateKind,
      timestamp: new Date().toISOString(),
    },
    emptyState: {
      isEmpty: kind !== 'none',
      kind,
      title: backendEmptyState.title ?? '',
      description: backendEmptyState.description ?? '',
    },
    backendEmptyStateKind: kind,
    suggestedActionLabel: options?.suggestedActionLabel,
    suggestedActionUrl: options?.suggestedActionUrl,
    actionable: options?.actionable ?? false,
  };
}

/**
 * Resolve panel-specific empty state kind from backend empty_state.kind.
 * Maps backend kinds to workspace panel kinds for rendering.
 */
function resolvePanelEmptyStateKind(
  panelId: SourceWorkspacePanel,
  backendKind: string
): WorkspacePanelStateKind {
  // Map backend empty state kinds to panel-specific kinds
  const kindMap: Record<string, WorkspacePanelStateKind> = {
    no_artifacts: 'no_artifacts',
    no_comments: 'no_comments',
    no_relationships: 'no_relationships',
    no_agreements: 'no_agreements',
    repeated_revisions: 'repeated_revisions',
    merged_source: 'merged_source',
    archived_source: 'archived_source',
    no_results: 'empty',
    not_found: 'empty',
    none: 'success',
  };

  return kindMap[backendKind] ?? 'empty';
}

// ============================================================================
// Overview Panel (Phase 16 Task 16.6)
// ============================================================================

/**
 * Create overview panel success state from backend SourceDetail.
 */
export function createOverviewPanelSuccessState(
  detail: SourceDetail
): OverviewPanelSuccessState {
  const adapted = adaptSourceDetail(detail);
  const stateKind = resolveOverviewStateKind(detail);

  return {
    metadata: {
      panelId: 'overview',
      stateKind,
      timestamp: new Date().toISOString(),
    },
    source: adapted,
    permissions: detail.permissions,
    links: detail.links,
  };
}

/**
 * Resolve overview state kind from backend source status.
 * Uses backend-authored status field only.
 */
function resolveOverviewStateKind(detail: SourceDetail): WorkspacePanelStateKind {
  const status = (detail.status ?? '').toLowerCase();

  if (status === 'merged') {
    return 'merged_source';
  }
  if (status === 'archived') {
    return 'archived_source';
  }

  return 'success';
}

/**
 * Resolve overview panel rendering state.
 */
export function resolveOverviewPanelState(
  loading: boolean,
  error: Error | null,
  data: SourceDetail | null
): OverviewPanelRenderingState {
  if (loading) {
    return createPanelLoadingState('overview', 'Loading source...');
  }

  if (error !== null) {
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      return createPanelEmptyState('overview', {
        kind: 'unauthorized',
        title: 'Access Denied',
        description: 'You do not have permission to view this source.',
      });
    }
    if (error.message.includes('404') || error.message.includes('Not Found')) {
      return createPanelEmptyState('overview', {
        kind: 'not_found',
        title: 'Source Not Found',
        description: 'The requested source document could not be found.',
      });
    }
    return createPanelErrorState('overview', error);
  }

  if (data === null) {
    return createPanelLoadingState('overview');
  }

  if (data.empty_state.kind !== 'none') {
    return createPanelEmptyState('overview', data.empty_state);
  }

  return createOverviewPanelSuccessState(data);
}

// ============================================================================
// Revisions Panel (Phase 16 Task 16.7)
// ============================================================================

/**
 * Create revisions panel success state from backend SourceRevisionPage.
 */
export function createRevisionsPanelSuccessState(
  page: SourceRevisionPage
): RevisionsPanelSuccessState {
  const adapted = adaptSourceRevisionPage(page);
  const hasRepeatedRevisions = adapted.items.length > 1;

  return {
    metadata: {
      panelId: 'revisions',
      stateKind: hasRepeatedRevisions ? 'repeated_revisions' : 'success',
      timestamp: new Date().toISOString(),
    },
    sourceId: adapted.source.id,
    sourceLabel: adapted.source.label,
    items: adapted.items,
    pagination: adapted.pagination,
    permissions: adapted.permissions,
    links: adapted.links,
    hasRepeatedRevisions,
  };
}

/**
 * Resolve revisions panel rendering state.
 */
export function resolveRevisionsPanelState(
  loading: boolean,
  error: Error | null,
  data: SourceRevisionPage | null
): RevisionsPanelRenderingState {
  if (loading) {
    return createPanelLoadingState('revisions', 'Loading revisions...');
  }

  if (error !== null) {
    return createPanelErrorState('revisions', error);
  }

  if (data === null) {
    return createPanelLoadingState('revisions');
  }

  if (data.empty_state.kind !== 'none') {
    return createPanelEmptyState('revisions', data.empty_state);
  }

  return createRevisionsPanelSuccessState(data);
}

// ============================================================================
// Artifacts Panel (Phase 16 Task 16.7)
// ============================================================================

/**
 * Format artifact kind for display.
 */
function formatArtifactKind(kind: string): string {
  const labels: Record<string, string> = {
    pdf_export: 'PDF Export',
    native_export: 'Native Export',
    upload: 'Upload',
    thumbnail: 'Thumbnail',
    fingerprint: 'Fingerprint',
  };
  return labels[kind] ?? kind;
}

/**
 * Format compatibility tier for display.
 */
function formatCompatibilityTier(tier: string | undefined): string {
  const labels: Record<string, string> = {
    native: 'Native',
    converted: 'Converted',
    unsupported: 'Unsupported',
  };
  return labels[tier ?? ''] ?? tier ?? '';
}

/**
 * Format normalization status for display.
 */
function formatNormalizationStatus(status: string | undefined): string {
  const labels: Record<string, string> = {
    pending: 'Pending',
    complete: 'Complete',
    failed: 'Failed',
    skipped: 'Skipped',
  };
  return labels[status ?? ''] ?? status ?? '';
}

/**
 * Format byte size for display.
 */
function formatByteSize(bytes: number | undefined): string {
  return formatSharedByteSize(bytes, {
    emptyFallback: '0 B',
    zeroFallback: '0 B',
    invalidFallback: '0 B',
    precisionByUnit: [0, 1, 1, 1],
  }) as string;
}

/**
 * Adapt artifact summary to panel item view model.
 */
function adaptArtifactPanelItem(
  artifact: {
    id: string;
    artifact_kind: string;
    sha256?: string;
    page_count?: number;
    size_bytes?: number;
    compatibility_tier?: string;
    normalization_status?: string;
  },
  links: SourceManagementLinks
): ArtifactPanelItemViewModel {
  const sha256 = artifact.sha256 ?? '';

  return {
    id: artifact.id,
    artifactKind: artifact.artifact_kind,
    artifactKindLabel: formatArtifactKind(artifact.artifact_kind),
    sha256,
    sha256Short: sha256.length > 12 ? `${sha256.substring(0, 12)}...` : sha256,
    pageCount: artifact.page_count ?? 0,
    sizeBytes: artifact.size_bytes ?? 0,
    sizeBytesFormatted: formatByteSize(artifact.size_bytes),
    compatibilityTier: artifact.compatibility_tier ?? '',
    compatibilityTierLabel: formatCompatibilityTier(artifact.compatibility_tier),
    normalizationStatus: artifact.normalization_status ?? '',
    normalizationStatusLabel: formatNormalizationStatus(artifact.normalization_status),
    links,
  };
}

/**
 * Create artifacts panel success state from backend SourceArtifactPage.
 */
export function createArtifactsPanelSuccessState(
  page: SourceArtifactPage
): ArtifactsPanelSuccessState {
  const items = page.items.map((item) => adaptArtifactPanelItem(item, page.links));

  return {
    metadata: {
      panelId: 'artifacts',
      stateKind: items.length > 0 ? 'success' : 'no_artifacts',
      timestamp: new Date().toISOString(),
    },
    revisionId: page.revision?.id ?? '',
    items,
    pagination: adaptPaginationInfo(page.page_info),
    permissions: page.permissions,
    links: page.links,
  };
}

/**
 * Resolve artifacts panel rendering state.
 */
export function resolveArtifactsPanelState(
  loading: boolean,
  error: Error | null,
  data: SourceArtifactPage | null
): ArtifactsPanelRenderingState {
  if (loading) {
    return createPanelLoadingState('artifacts', 'Loading artifacts...');
  }

  if (error !== null) {
    return createPanelErrorState('artifacts', error);
  }

  if (data === null) {
    return createPanelLoadingState('artifacts');
  }

  if (data.empty_state.kind !== 'none') {
    return createPanelEmptyState('artifacts', data.empty_state, {
      suggestedActionLabel: 'View Revisions',
      suggestedActionUrl: data.links.revisions,
    });
  }

  return createArtifactsPanelSuccessState(data);
}

// ============================================================================
// Relationships Panel (Phase 16 Task 16.7)
// ============================================================================

/**
 * Create relationships panel success state from backend SourceRelationshipPage.
 */
export function createRelationshipsPanelSuccessState(
  page: SourceRelationshipPage,
  pendingCandidateCount?: number
): RelationshipsPanelSuccessState {
  const adapted = adaptSourceRelationshipPage(page);
  const hasPendingCandidates = (pendingCandidateCount ?? 0) > 0;

  return {
    metadata: {
      panelId: 'relationships',
      stateKind: adapted.items.length > 0 ? 'success' : 'no_relationships',
      timestamp: new Date().toISOString(),
    },
    sourceId: adapted.source.id,
    sourceLabel: adapted.source.label,
    items: adapted.items,
    pagination: adapted.pagination,
    permissions: adapted.permissions,
    links: adapted.links,
    hasPendingCandidates,
    pendingCandidateCount: pendingCandidateCount ?? 0,
  };
}

/**
 * Resolve relationships panel rendering state.
 */
export function resolveRelationshipsPanelState(
  loading: boolean,
  error: Error | null,
  data: SourceRelationshipPage | null,
  pendingCandidateCount?: number
): RelationshipsPanelRenderingState {
  if (loading) {
    return createPanelLoadingState('relationships', 'Loading relationships...');
  }

  if (error !== null) {
    return createPanelErrorState('relationships', error);
  }

  if (data === null) {
    return createPanelLoadingState('relationships');
  }

  if (data.empty_state.kind !== 'none') {
    return createPanelEmptyState('relationships', data.empty_state, {
      suggestedActionLabel: 'View All Sources',
      suggestedActionUrl: data.links.source,
    });
  }

  return createRelationshipsPanelSuccessState(data, pendingCandidateCount);
}

// ============================================================================
// Comments Panel (Phase 16 Task 16.7)
// ============================================================================

/**
 * Format comment thread status for display.
 */
function formatThreadStatus(status: string | undefined): string {
  const labels: Record<string, string> = {
    open: 'Open',
    resolved: 'Resolved',
    deleted: 'Deleted',
  };
  return labels[status ?? ''] ?? status ?? '';
}

/**
 * Format comment sync status for display.
 */
function formatSyncStatus(status: string): string {
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
 * Adapt comment thread summary to panel item view model.
 */
function adaptCommentPanelItem(
  thread: Phase13SourceCommentPage['items'][0]
): CommentPanelItemViewModel {
  return {
    id: thread.id ?? '',
    threadId: thread.thread_id ?? '',
    status: thread.status ?? 'unknown',
    statusLabel: formatThreadStatus(thread.status),
    isResolved: !!thread.resolved_at,
    anchorKind: thread.anchor?.kind ?? '',
    anchorLabel: thread.anchor?.label ?? 'General',
    authorName: thread.author?.display_name ?? thread.author_name ?? 'Unknown',
    authorType: thread.author?.type ?? 'user',
    bodyPreview: thread.body_preview ?? '',
    messageCount: thread.message_count ?? 0,
    replyCount: thread.reply_count ?? 0,
    hasReplies: (thread.reply_count ?? 0) > 0,
    lastActivityAt: thread.last_activity_at ?? '',
    links: thread.links ?? {},
  };
}

/**
 * Create comments panel success state from backend Phase13SourceCommentPage.
 */
export function createCommentsPanelSuccessState(
  page: Phase13SourceCommentPage
): CommentsPanelSuccessState {
  const items = page.items.map(adaptCommentPanelItem);

  return {
    metadata: {
      panelId: 'comments',
      stateKind: items.length > 0 ? 'success' : 'no_comments',
      timestamp: new Date().toISOString(),
    },
    sourceId: page.source?.id ?? '',
    sourceLabel: page.source?.label ?? '',
    revisionId: page.revision?.id ?? '',
    items,
    pagination: adaptPaginationInfo(page.page_info),
    permissions: page.permissions,
    links: page.links,
    syncStatus: page.sync_status,
    syncStatusLabel: formatSyncStatus(page.sync_status),
    threadCount: page.sync?.thread_count ?? 0,
    messageCount: page.sync?.message_count ?? 0,
  };
}

/**
 * Resolve comments panel rendering state.
 */
export function resolveCommentsPanelState(
  loading: boolean,
  error: Error | null,
  data: Phase13SourceCommentPage | null
): CommentsPanelRenderingState {
  if (loading) {
    return createPanelLoadingState('comments', 'Loading comments...');
  }

  if (error !== null) {
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      return createPanelEmptyState('comments', {
        kind: 'unauthorized',
        title: 'Comments Not Available',
        description: 'You do not have permission to view comments for this source.',
      });
    }
    return createPanelErrorState('comments', error);
  }

  if (data === null) {
    return createPanelLoadingState('comments');
  }

  // Handle sync-specific empty states
  const syncStatus = data.sync_status;
  if (syncStatus === 'pending_sync') {
    return createPanelEmptyState('comments', {
      kind: 'pending_sync',
      title: 'Comments syncing',
      description: 'Comment synchronization is in progress.',
    });
  }

  if (syncStatus === 'not_configured') {
    return createPanelEmptyState('comments', {
      kind: 'not_configured',
      title: 'Comments not configured',
      description: 'Comment synchronization is not enabled for this source.',
    });
  }

  if (data.empty_state.kind !== 'none') {
    return createPanelEmptyState('comments', data.empty_state);
  }

  return createCommentsPanelSuccessState(data);
}

// ============================================================================
// Handles Panel (Phase 16 Task 16.7)
// ============================================================================

/**
 * Format provider kind for display.
 */
function formatProviderKind(kind: string): string {
  const labels: Record<string, string> = {
    google_drive: 'Google Drive',
    google_docs: 'Google Docs',
    upload: 'Upload',
    api: 'API',
  };
  return labels[kind] ?? kind;
}

/**
 * Format handle status for display.
 */
function formatHandleStatus(status: string): string {
  const labels: Record<string, string> = {
    active: 'Active',
    inactive: 'Inactive',
    expired: 'Expired',
    revoked: 'Revoked',
  };
  return labels[status] ?? status;
}

/**
 * Adapt handle summary to panel item view model.
 */
function adaptHandlePanelItem(
  handle: SourceHandlePage['items'][0],
  activeHandleId: string
): HandlePanelItemViewModel {
  return {
    id: handle.id,
    providerKind: handle.provider_kind,
    providerKindLabel: formatProviderKind(handle.provider_kind),
    externalFileId: handle.external_file_id,
    accountId: handle.account_id ?? '',
    webUrl: handle.web_url ?? '',
    handleStatus: handle.handle_status,
    handleStatusLabel: formatHandleStatus(handle.handle_status),
    isActive: handle.id === activeHandleId,
    validFrom: handle.valid_from ?? '',
    validTo: handle.valid_to ?? '',
    links: handle.links,
  };
}

/**
 * Create handles panel success state from backend SourceHandlePage.
 */
export function createHandlesPanelSuccessState(
  page: SourceHandlePage,
  activeHandleId: string
): HandlesPanelSuccessState {
  const items = page.items.map((item) => adaptHandlePanelItem(item, activeHandleId));

  return {
    metadata: {
      panelId: 'handles',
      stateKind: 'success',
      timestamp: new Date().toISOString(),
    },
    sourceId: page.source?.id ?? '',
    sourceLabel: page.source?.label ?? '',
    items,
    pagination: adaptPaginationInfo(page.page_info),
    permissions: page.permissions,
    links: page.links,
    activeHandleId,
  };
}

/**
 * Resolve handles panel rendering state.
 */
export function resolveHandlesPanelState(
  loading: boolean,
  error: Error | null,
  data: SourceHandlePage | null,
  activeHandleId?: string
): HandlesPanelRenderingState {
  if (loading) {
    return createPanelLoadingState('handles', 'Loading handles...');
  }

  if (error !== null) {
    return createPanelErrorState('handles', error);
  }

  if (data === null) {
    return createPanelLoadingState('handles');
  }

  if (data.empty_state.kind !== 'none') {
    return createPanelEmptyState('handles', data.empty_state);
  }

  return createHandlesPanelSuccessState(data, activeHandleId ?? '');
}

// ============================================================================
// Workspace Composition (Phase 16 Task 16.6)
// ============================================================================

/**
 * Create initial workspace state from source detail.
 * Frontend owns panel layout; backend owns all semantic data.
 */
export function createInitialWorkspaceState(
  sourceId: string,
  detail: SourceDetail
): SourceDetailWorkspaceState {
  return {
    sourceId,
    activePanel: 'overview',
    overview: resolveOverviewPanelState(false, null, detail),
    revisions: null,
    artifacts: null,
    relationships: null,
    comments: null,
    handles: null,
    permissions: detail.permissions,
    links: detail.links,
  };
}

/**
 * Create loading workspace state.
 */
export function createLoadingWorkspaceState(sourceId: string): SourceDetailWorkspaceState {
  return {
    sourceId,
    activePanel: 'overview',
    overview: createPanelLoadingState('overview'),
    revisions: null,
    artifacts: null,
    relationships: null,
    comments: null,
    handles: null,
    permissions: {
      can_view_diagnostics: false,
      can_open_provider_links: false,
      can_review_candidates: false,
      can_view_comments: false,
    },
    links: {},
  };
}

/**
 * Update workspace with panel data.
 * Returns new workspace state with updated panel; does NOT mutate input.
 */
export function updateWorkspacePanel<
  TPanel extends SourceWorkspacePanel,
  TState extends SourceDetailWorkspaceState[TPanel],
>(
  workspace: SourceDetailWorkspaceState,
  panelId: TPanel,
  panelState: TState
): SourceDetailWorkspaceState {
  return {
    ...workspace,
    [panelId]: panelState,
  };
}

/**
 * Set active panel.
 * Returns new workspace state with updated active panel.
 */
export function setActivePanel(
  workspace: SourceDetailWorkspaceState,
  panelId: SourceWorkspacePanel
): SourceDetailWorkspaceState {
  return {
    ...workspace,
    activePanel: panelId,
  };
}

// ============================================================================
// Workspace Navigation Helpers (Phase 16 Task 16.6)
// ============================================================================

/**
 * Get drill-in URL for panel from backend-provided links.
 * Returns undefined if link not available; does NOT synthesize URLs.
 */
export function getPanelDrillInUrl(
  workspace: SourceDetailWorkspaceState,
  panelId: SourceWorkspacePanel
): string | undefined {
  const links = workspace.links;

  switch (panelId) {
    case 'revisions':
      return links.revisions;
    case 'relationships':
      return links.relationships;
    case 'handles':
      return links.handles;
    case 'artifacts':
      return links.artifacts;
    case 'comments':
      return links.comments;
    case 'overview':
      return links.self;
    default:
      return undefined;
  }
}

/**
 * Check if panel requires additional data load.
 */
export function panelRequiresLoad(
  workspace: SourceDetailWorkspaceState,
  panelId: SourceWorkspacePanel
): boolean {
  switch (panelId) {
    case 'overview':
      return false; // Overview loaded with initial workspace
    case 'revisions':
      return workspace.revisions === null;
    case 'artifacts':
      return workspace.artifacts === null;
    case 'relationships':
      return workspace.relationships === null;
    case 'comments':
      return workspace.comments === null;
    case 'handles':
      return workspace.handles === null;
    default:
      return false;
  }
}

// ============================================================================
// Workspace Contract Validation (Phase 16 Task 16.8)
// ============================================================================

/**
 * Workspace contract family identifiers.
 * These are the ONLY contract families that workspace may consume.
 */
export const WORKSPACE_APPROVED_CONTRACT_FAMILIES = [
  'SourceDetail',
  'SourceRevisionPage',
  'SourceRelationshipPage',
  'SourceArtifactPage',
  'SourceHandlePage',
  'Phase13SourceCommentPage',
] as const;

export type WorkspaceContractFamily = (typeof WORKSPACE_APPROVED_CONTRACT_FAMILIES)[number];

/**
 * Workspace contract validation result.
 */
export interface WorkspaceContractValidationResult {
  valid: boolean;
  violations: string[];
  usedContractFamilies: string[];
}

/**
 * Validate that workspace consumes only approved contract families.
 * This is used for integration testing to ensure architectural compliance.
 */
export function validateWorkspaceContractUsage(
  usedContractFamilies: string[]
): WorkspaceContractValidationResult {
  const violations: string[] = [];

  const unapproved = usedContractFamilies.filter(
    (family) =>
      !WORKSPACE_APPROVED_CONTRACT_FAMILIES.includes(family as WorkspaceContractFamily)
  );

  if (unapproved.length > 0) {
    violations.push(
      `Workspace uses unapproved contract families: [${unapproved.join(', ')}]. ` +
        `Approved families: [${WORKSPACE_APPROVED_CONTRACT_FAMILIES.join(', ')}].`
    );
  }

  return {
    valid: violations.length === 0,
    violations,
    usedContractFamilies,
  };
}

/**
 * Forbidden contract families that workspace must NOT mix in.
 */
export const WORKSPACE_FORBIDDEN_CONTRACT_FAMILIES = [
  'DocumentLineageDetail',
  'AgreementLineageDetail',
  'GoogleImportLineageStatus',
  'GoogleImportRunDetail',
] as const;

/**
 * Validate that workspace does NOT mix forbidden contract families.
 */
export function validateWorkspaceContractIsolation(
  usedContractFamilies: string[]
): WorkspaceContractValidationResult {
  const violations: string[] = [];

  const forbidden = usedContractFamilies.filter((family) =>
    (WORKSPACE_FORBIDDEN_CONTRACT_FAMILIES as readonly string[]).includes(family)
  );

  if (forbidden.length > 0) {
    violations.push(
      `Workspace mixes forbidden contract families: [${forbidden.join(', ')}]. ` +
        `Workspace must consume source-management contracts only.`
    );
  }

  return {
    valid: violations.length === 0,
    violations,
    usedContractFamilies,
  };
}

/**
 * Validate that workspace uses backend links for navigation.
 * Ensures no URL synthesis in browser.
 */
export function validateWorkspaceBackendLinks(
  workspace: SourceDetailWorkspaceState
): WorkspaceContractValidationResult {
  const violations: string[] = [];
  const usedContractFamilies: string[] = ['SourceDetail'];

  // Check that all navigation uses backend-provided links
  if (workspace.links.self === undefined) {
    violations.push('Workspace missing backend-provided self link.');
  }

  // Verify no synthesized URLs (URLs containing placeholder patterns)
  const linkValues = Object.values(workspace.links).filter(
    (v): v is string => typeof v === 'string'
  );

  for (const url of linkValues) {
    if (url.includes('{{') || url.includes('${') || url.includes('__PLACEHOLDER__')) {
      violations.push(`Workspace contains synthesized URL: ${url}`);
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    usedContractFamilies,
  };
}
