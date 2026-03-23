/**
 * Source-Management Page Composition Boundaries
 *
 * This module defines the architectural composition patterns for Version 2 source-management
 * surfaces. It establishes clear boundaries between backend-owned contracts and frontend
 * presentation concerns.
 *
 * CRITICAL RULES:
 * 1. Each page consumes ONE backend-owned contract family per surface
 * 2. Pages must NOT stitch together raw document, agreement, and diagnostics payloads client-side
 * 3. Pages must NOT compute lineage semantics, warning precedence, or source continuity
 * 4. All business logic lives in backend-owned read models
 * 5. Frontend retains full autonomy over visual design and interaction patterns
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 11 Task 11.8
 * @see examples/esign/services/lineage_contracts.go (backend source of truth)
 */

import type {
  SourceListPage,
  SourceDetail,
  SourceRevisionPage,
  SourceRelationshipPage,
  SourceHandlePage,
  SourceRevisionDetail,
  SourceArtifactPage,
  SourceCommentPage,
  SourceSearchResults,
  SourceWorkspace,
  SourceListQuery,
  SourceRevisionListQuery,
  SourceRelationshipListQuery,
  SourceSearchQuery,
  SourceWorkspaceQuery,
  SourceManagementLinks,
  SourceManagementPermissions,
  Phase13SourceSearchQuery,
  Phase13SourceSearchResults,
  Phase13SourceCommentPage,
  SourceCommentListQuery,
  ReconciliationQueuePage,
  ReconciliationCandidateDetail,
  ReconciliationQueueQuery,
  ReconciliationReviewInput,
  ReconciliationReviewResponse,
} from './lineage-contracts.js';

// ============================================================================
// Page Contract Families
// ============================================================================

/**
 * Source Browser Page Contract Family
 *
 * Consumes: GET /admin/api/v1/esign/sources
 * Purpose: Display paginated list of canonical source documents
 * State: URL query params, page number, filters
 * Data boundary: SourceListPage only; no ad hoc document or agreement reads
 */
export interface SourceBrowserPageContracts {
  /** Primary contract: source list with pagination */
  listSources: SourceListPage;
  /** Applied query from URL state */
  query: SourceListQuery;
  /** Permission flags for UI affordances */
  permissions: SourceManagementPermissions;
}

/**
 * Source Detail Page Contract Family
 *
 * Consumes: GET /admin/api/v1/esign/sources/:source_document_id
 * Purpose: Legacy lightweight source detail read model.
 * Canonical operator detail UI aliases the source workspace experience and
 * should render SourceWorkspace for both `/sources/:id` and `/sources/:id/workspace`.
 * State: source_document_id from URL
 * Data boundary: SourceDetail only; no embedded revision, relationship, or artifact lists
 */
export interface SourceDetailPageContracts {
  /** Primary contract: source detail with counts */
  sourceDetail: SourceDetail;
  /** Navigation links to related surfaces */
  links: SourceManagementLinks;
  /** Permission flags for UI affordances */
  permissions: SourceManagementPermissions;
}

/**
 * Source Workspace Page Contract Family
 *
 * Consumes: GET /admin/api/v1/esign/sources/:source_document_id/workspace
 * Purpose: Display the canonical operator workspace for a single source document.
 * This is the primary operator experience for both workspace and detail-route aliases.
 * State: source_document_id from URL, panel/anchor from query params
 * Data boundary: SourceWorkspace only; no initial client-side stitching from sibling endpoints
 */
export interface SourceWorkspacePageContracts {
  /** Primary contract: canonical source workspace */
  workspace: SourceWorkspace;
  /** Applied query from URL state */
  query: SourceWorkspaceQuery;
  /** Navigation links to related surfaces */
  links: SourceManagementLinks;
  /** Permission flags for UI affordances */
  permissions: SourceManagementPermissions;
}

/**
 * Source Revision Timeline Page Contract Family
 *
 * Consumes: GET /admin/api/v1/esign/sources/:source_document_id/revisions
 * Purpose: Display ordered timeline of source revisions
 * State: source_document_id from URL, sort, page
 * Data boundary: SourceRevisionPage only; no ad hoc artifact or fingerprint reads
 */
export interface SourceRevisionTimelinePageContracts {
  /** Primary contract: revision list with ordering */
  revisionPage: SourceRevisionPage;
  /** Applied query from URL state */
  query: SourceRevisionListQuery;
  /** Navigation links to source and revision details */
  links: SourceManagementLinks;
}

/**
 * Source Relationship Graph Page Contract Family
 *
 * Consumes: GET /admin/api/v1/esign/sources/:source_document_id/relationships
 * Purpose: Display candidate relationships for continuity analysis
 * State: source_document_id from URL, status filter
 * Data boundary: SourceRelationshipPage only; no ad hoc scoring or evidence reconstruction
 */
export interface SourceRelationshipGraphPageContracts {
  /** Primary contract: relationship summaries with evidence */
  relationshipPage: SourceRelationshipPage;
  /** Applied query from URL state */
  query: SourceRelationshipListQuery;
  /** Navigation links to source and diagnostics */
  links: SourceManagementLinks;
}

/**
 * Source Handle History Page Contract Family
 *
 * Consumes: GET /admin/api/v1/esign/sources/:source_document_id/handles
 * Purpose: Display multi-handle history for account/drive migrations
 * State: source_document_id from URL
 * Data boundary: SourceHandlePage only; no ad hoc provider metadata reads
 */
export interface SourceHandleHistoryPageContracts {
  /** Primary contract: handle list with validity windows */
  handlePage: SourceHandlePage;
  /** Navigation links to source and provider linkouts */
  links: SourceManagementLinks;
}

/**
 * Source Revision Detail Page Contract Family
 *
 * Consumes: GET /admin/api/v1/esign/source-revisions/:source_revision_id
 * Purpose: Display detailed view of a single source revision
 * State: source_revision_id from URL
 * Data boundary: SourceRevisionDetail only; no embedded artifact or comment lists
 */
export interface SourceRevisionDetailPageContracts {
  /** Primary contract: revision detail with fingerprint status */
  revisionDetail: SourceRevisionDetail;
  /** Navigation links to artifacts, comments, source */
  links: SourceManagementLinks;
  /** Permission flags for UI affordances */
  permissions: SourceManagementPermissions;
}

/**
 * Source Artifact Inspector Page Contract Family
 *
 * Consumes: GET /admin/api/v1/esign/source-revisions/:source_revision_id/artifacts
 * Purpose: Display artifacts exported from a source revision
 * State: source_revision_id from URL
 * Data boundary: SourceArtifactPage only; no ad hoc document or agreement reads
 */
export interface SourceArtifactInspectorPageContracts {
  /** Primary contract: artifact list with compatibility metadata */
  artifactPage: SourceArtifactPage;
  /** Navigation links to revision and source */
  links: SourceManagementLinks;
}

/**
 * Source Comment Inspector Page Contract Family
 *
 * Consumes: GET /admin/api/v1/esign/source-revisions/:source_revision_id/comments
 * Purpose: Display provider-synced comment threads
 * State: source_revision_id from URL
 * Data boundary: SourceCommentPage only; no agreement-review comment mixing
 */
export interface SourceCommentInspectorPageContracts {
  /** Primary contract: comment thread summaries with sync status */
  commentPage: SourceCommentPage;
  /** Navigation links to revision and source */
  links: SourceManagementLinks;
}

/**
 * Source Search Page Contract Family
 *
 * Consumes: GET /admin/api/v1/esign/source-search
 * Purpose: Search across canonical sources and revisions
 * State: URL query params
 * Data boundary: SourceSearchResults only; no ad hoc document or agreement reads
 */
export interface SourceSearchPageContracts {
  /** Primary contract: search results with matched fields */
  searchResults: SourceSearchResults;
  /** Applied query from URL state */
  query: SourceSearchQuery;
  /** Navigation links to sources and diagnostics */
  links: SourceManagementLinks;
}

// ============================================================================
// Phase 17 Reconciliation Queue Composition Boundaries (Task 17.6)
// ============================================================================

/**
 * Reconciliation Queue Page Contract Family
 *
 * Consumes: GET /admin/api/v1/esign/reconciliation-queue
 * Purpose: Display paginated list of pending reconciliation candidates
 * State: URL query params (filters, sort, pagination)
 * Data boundary: ReconciliationQueuePage only; no ad hoc source or relationship reads
 *
 * CRITICAL: Frontend must NOT compute candidate ranking, action availability,
 * confirm semantics, or review outcomes from backend implementation code.
 *
 * @see DOC_LINEAGE_V2_TSK.md Phase 17 Task 17.6
 */
export interface ReconciliationQueuePageContracts {
  /** Primary contract: queue page with candidate items */
  queuePage: ReconciliationQueuePage;
  /** Applied query from URL state */
  query: ReconciliationQueueQuery;
  /** Permission flags for UI affordances */
  permissions: SourceManagementPermissions;
  /** Navigation links to queue and candidates */
  links: SourceManagementLinks;
}

/**
 * Reconciliation Candidate Detail Page Contract Family
 *
 * Consumes: GET /admin/api/v1/esign/reconciliation-queue/:relationship_id
 * Purpose: Display detailed candidate information for review workflow
 * State: relationship_id from URL
 * Data boundary: ReconciliationCandidateDetail only; no ad hoc evidence reconstruction
 *
 * CRITICAL: Frontend must use backend-provided action metadata, evidence summaries,
 * permissions, links, validation errors, and conflict responses only.
 *
 * @see DOC_LINEAGE_V2_TSK.md Phase 17 Task 17.6
 */
export interface ReconciliationCandidateDetailPageContracts {
  /** Primary contract: candidate detail with actions and audit trail */
  candidateDetail: ReconciliationCandidateDetail;
  /** Permission flags for UI affordances */
  permissions: SourceManagementPermissions;
  /** Navigation links to queue and sources */
  links: SourceManagementLinks;
}

/**
 * Reconciliation Review Action Contract
 *
 * Used for: POST /admin/api/v1/esign/reconciliation-queue/:relationship_id/review
 * Purpose: Submit review action for a reconciliation candidate
 * Data boundary: ReconciliationReviewInput/Response only
 *
 * CRITICAL: Frontend owns copy hierarchy, affordance design, and safety presentation,
 * NOT action contract design or fallback state machines.
 *
 * @see DOC_LINEAGE_V2_TSK.md Phase 17 Task 17.7
 */
export interface ReconciliationReviewActionContracts {
  /** Input payload for review action */
  input: ReconciliationReviewInput;
  /** Response from review action */
  response: ReconciliationReviewResponse;
}

// ============================================================================
// Phase 13 Workspace Composition Boundaries (Task 13.9)
// ============================================================================

/**
 * Phase 13 Source Search Workspace Contract Family
 *
 * IMPORTANT: This extends the base search contracts with Phase 13 features:
 * - Comment sync status filters
 * - Relationship state filters
 * - Comment presence filters
 *
 * Consumes: GET /admin/api/v1/esign/source-search
 * Purpose: Search across sources with comment and relationship awareness
 * State: URL query params, advanced filter state
 * Data boundary: Phase13SourceSearchResults only; no agreement-review data
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 13 Task 13.9
 */
export interface Phase13SourceSearchWorkspaceContracts {
  /** Primary contract: Phase 13 search results with comment/relationship fields */
  searchResults: Phase13SourceSearchResults;
  /** Applied query with Phase 13 filter fields */
  query: Phase13SourceSearchQuery;
  /** Permission flags for UI affordances */
  permissions: SourceManagementPermissions;
  /** Navigation links to sources and diagnostics */
  links: SourceManagementLinks;
}

/**
 * Phase 13 Source Comment Workspace Contract Family
 *
 * Consumes: GET /admin/api/v1/esign/sources/:source_document_id/comments
 *       OR: GET /admin/api/v1/esign/source-revisions/:source_revision_id/comments
 * Purpose: Display provider-synced comment threads with sync status
 * State: source_document_id or source_revision_id from URL, sync status filter
 * Data boundary: Phase13SourceCommentPage only; NO agreement-review comments
 *
 * CRITICAL: Source comments are distinct from agreement-review comments.
 * This workspace must NOT mix or merge comment payloads from different sources.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 13 Task 13.9
 */
export interface Phase13SourceCommentWorkspaceContracts {
  /** Primary contract: Phase 13 comment page with sync summary */
  commentPage: Phase13SourceCommentPage;
  /** Applied query from URL state */
  query: SourceCommentListQuery;
  /** Permission flags for comment visibility */
  permissions: SourceManagementPermissions;
  /** Navigation links to source, revision, provider */
  links: SourceManagementLinks;
}

/**
 * Source Management Workspace State Orchestration
 *
 * This interface defines how workspace panels communicate through
 * backend-authored DTOs and page-level state rather than component-local
 * reconstruction logic.
 *
 * CRITICAL RULES:
 * 1. Panels receive state from workspace, not from direct API calls
 * 2. Panels publish state changes to workspace, not directly to API
 * 3. Workspace orchestrates all cross-panel state updates
 * 4. No panel reconstructs semantic state from multiple contracts
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 13 Task 13.9
 */
export interface SourceManagementWorkspaceOrchestration<TPanels extends Record<string, unknown>> {
  /** Current workspace identity (source_document_id, source_revision_id, etc.) */
  workspaceId: string;
  /** Active panels and their contracts */
  panels: TPanels;
  /** Global workspace permissions (union of panel permissions) */
  permissions: SourceManagementPermissions;
  /** Current navigation context */
  navigationContext: WorkspaceNavigationContext;
  /** Workspace-level loading state */
  loading: boolean;
  /** Workspace-level error state */
  error: Error | null;
}

/**
 * Navigation context for workspace-level routing.
 */
export interface WorkspaceNavigationContext {
  /** Current page route */
  currentRoute: string;
  /** Back navigation target */
  backTarget?: string;
  /** Breadcrumb path */
  breadcrumbs: WorkspaceBreadcrumb[];
  /** Available panel tabs */
  availablePanels: string[];
  /** Currently active panel */
  activePanel: string;
}

/**
 * Breadcrumb entry for workspace navigation.
 */
export interface WorkspaceBreadcrumb {
  label: string;
  url: string;
  isCurrent: boolean;
}

/**
 * Panel communication message for workspace orchestration.
 *
 * Panels communicate through strongly-typed messages rather than
 * direct state mutation or callback props.
 */
export interface WorkspacePanelMessage {
  /** Source panel ID */
  sourcePanel: string;
  /** Message type */
  messageType: WorkspacePanelMessageType;
  /** Message payload (contract-typed) */
  payload: unknown;
  /** Timestamp */
  timestamp: string;
}

/**
 * Panel message types for workspace communication.
 */
export type WorkspacePanelMessageType =
  | 'panel_loaded'
  | 'panel_error'
  | 'filter_changed'
  | 'sort_changed'
  | 'page_changed'
  | 'item_selected'
  | 'action_requested'
  | 'refresh_requested';

/**
 * Source Management Workspace Panel Definition
 *
 * Each panel in a workspace has a well-defined contract family
 * and communication boundary.
 */
export interface WorkspacePanelDefinition<TContracts> {
  /** Panel identifier */
  panelId: string;
  /** Panel display label */
  label: string;
  /** Contract family consumed by this panel */
  contracts: TContracts | null;
  /** Panel-specific loading state */
  loading: boolean;
  /** Panel-specific error state */
  error: Error | null;
  /** Whether panel is currently visible/active */
  active: boolean;
  /** Panel visibility requirements */
  visibilityCondition: WorkspacePanelVisibility;
}

/**
 * Panel visibility condition.
 */
export interface WorkspacePanelVisibility {
  /** Required permission */
  requiredPermission?: keyof SourceManagementPermissions;
  /** Feature flag gate */
  featureGate?: string;
  /** Minimum data requirement */
  requiresData?: boolean;
}

// ============================================================================
// Phase 13 Workspace Definitions (Task 13.9)
// ============================================================================

/**
 * Source Detail Workspace Panels
 *
 * Defines the panel composition for a source detail workspace that includes
 * revisions, relationships, handles, and comments.
 */
export interface SourceDetailWorkspacePanels {
  /** Source detail panel (always visible) */
  detail: WorkspacePanelDefinition<SourceDetail>;
  /** Revision timeline panel */
  revisions: WorkspacePanelDefinition<SourceRevisionPage>;
  /** Relationship graph panel */
  relationships: WorkspacePanelDefinition<SourceRelationshipPage>;
  /** Handle history panel */
  handles: WorkspacePanelDefinition<SourceHandlePage>;
  /** Comments panel (Phase 13) */
  comments: WorkspacePanelDefinition<Phase13SourceCommentPage>;
  /** Index signature to satisfy Record<string, unknown> constraint */
  [key: string]: unknown;
}

/**
 * Source Search Workspace Panels
 *
 * Defines the panel composition for a source search workspace.
 */
export interface SourceSearchWorkspacePanels {
  /** Search results panel */
  results: WorkspacePanelDefinition<Phase13SourceSearchResults>;
  /** Quick preview panel (selected item) */
  preview: WorkspacePanelDefinition<SourceDetail | null>;
  /** Index signature to satisfy Record<string, unknown> constraint */
  [key: string]: unknown;
}

/**
 * Create Phase 13 source detail workspace with standard panel configuration.
 */
export function createSourceDetailWorkspace(
  sourceId: string
): SourceManagementWorkspaceOrchestration<SourceDetailWorkspacePanels> {
  return {
    workspaceId: sourceId,
    panels: {
      detail: {
        panelId: 'detail',
        label: 'Overview',
        contracts: null,
        loading: true,
        error: null,
        active: true,
        visibilityCondition: { requiresData: false },
      },
      revisions: {
        panelId: 'revisions',
        label: 'Revisions',
        contracts: null,
        loading: false,
        error: null,
        active: false,
        visibilityCondition: { requiresData: false },
      },
      relationships: {
        panelId: 'relationships',
        label: 'Relationships',
        contracts: null,
        loading: false,
        error: null,
        active: false,
        visibilityCondition: { requiredPermission: 'can_review_candidates' },
      },
      handles: {
        panelId: 'handles',
        label: 'Handles',
        contracts: null,
        loading: false,
        error: null,
        active: false,
        visibilityCondition: { requiresData: false },
      },
      comments: {
        panelId: 'comments',
        label: 'Comments',
        contracts: null,
        loading: false,
        error: null,
        active: false,
        visibilityCondition: { requiredPermission: 'can_view_comments' },
      },
    },
    permissions: {
      can_view_diagnostics: false,
      can_open_provider_links: false,
      can_review_candidates: false,
      can_view_comments: false,
    },
    navigationContext: {
      currentRoute: `/sources/${sourceId}`,
      backTarget: '/sources',
      breadcrumbs: [
        { label: 'Sources', url: '/sources', isCurrent: false },
        { label: 'Loading...', url: `/sources/${sourceId}`, isCurrent: true },
      ],
      availablePanels: ['detail', 'revisions', 'relationships', 'handles', 'comments'],
      activePanel: 'detail',
    },
    loading: true,
    error: null,
  };
}

/**
 * Create Phase 13 source search workspace with standard panel configuration.
 */
export function createSourceSearchWorkspace(): SourceManagementWorkspaceOrchestration<SourceSearchWorkspacePanels> {
  return {
    workspaceId: 'source-search',
    panels: {
      results: {
        panelId: 'results',
        label: 'Search Results',
        contracts: null,
        loading: false,
        error: null,
        active: true,
        visibilityCondition: { requiresData: false },
      },
      preview: {
        panelId: 'preview',
        label: 'Preview',
        contracts: null,
        loading: false,
        error: null,
        active: false,
        visibilityCondition: { requiresData: true },
      },
    },
    permissions: {
      can_view_diagnostics: false,
      can_open_provider_links: false,
      can_review_candidates: false,
      can_view_comments: false,
    },
    navigationContext: {
      currentRoute: '/source-search',
      breadcrumbs: [{ label: 'Search', url: '/source-search', isCurrent: true }],
      availablePanels: ['results', 'preview'],
      activePanel: 'results',
    },
    loading: false,
    error: null,
  };
}

// ============================================================================
// Page Composition Patterns
// ============================================================================

/**
 * Base page state for all source-management surfaces.
 * Isolates URL state, loading state, and error state from contract data.
 */
export interface SourceManagementPageState<TContracts> {
  /** Current loading state */
  loading: boolean;
  /** Error state (null if no error) */
  error: Error | null;
  /** Backend-owned contract data (null if loading or error) */
  contracts: TContracts | null;
}

/**
 * Page composition metadata.
 * Tracks which endpoint family this page consumes.
 */
export interface SourceManagementPageMetadata {
  /** Page identifier */
  pageId: string;
  /** Base API path (e.g., "/admin/api/v1/esign") */
  apiBasePath: string;
  /** Primary endpoint family (e.g., "sources", "sources/:id/revisions") */
  endpointFamily: string;
  /** Contract version for validation */
  contractVersion: number;
}

/**
 * Page composition guard result.
 * Used to enforce that pages only consume approved contract families.
 */
export interface PageCompositionGuardResult {
  /** Whether the page composition is valid */
  valid: boolean;
  /** Validation errors (empty if valid) */
  errors: string[];
  /** Warnings about architectural drift */
  warnings: string[];
}

// ============================================================================
// Architectural Guards
// ============================================================================

/**
 * Validates that a page only consumes its designated contract family.
 *
 * This guard prevents architectural backsliding by ensuring pages don't
 * depend on multiple endpoint families or reconstruct state client-side.
 *
 * @param metadata - Page composition metadata
 * @param allowedEndpoints - Approved endpoint families for this page
 * @returns Validation result
 */
export function validatePageComposition(
  metadata: SourceManagementPageMetadata,
  allowedEndpoints: string[]
): PageCompositionGuardResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!allowedEndpoints.includes(metadata.endpointFamily)) {
    errors.push(
      `Page ${metadata.pageId} consumes unapproved endpoint family: ${metadata.endpointFamily}. ` +
        `Allowed: ${allowedEndpoints.join(', ')}`
    );
  }

  if (metadata.contractVersion < 1) {
    warnings.push(`Page ${metadata.pageId} has invalid contract version: ${metadata.contractVersion}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Checks if a page is attempting to mix document-detail or agreement-detail
 * provenance payloads with source-management contracts.
 *
 * @param dependencies - List of contract types used by the page
 * @returns True if mixing detected (violation)
 */
export function detectProvenancePayloadMixing(dependencies: string[]): boolean {
  const sourceManagementContracts = [
    'SourceListPage',
    'SourceDetail',
    'SourceWorkspace',
    'SourceRevisionPage',
    'SourceRelationshipPage',
    'SourceHandlePage',
    'SourceRevisionDetail',
    'SourceArtifactPage',
    'SourceCommentPage',
    'SourceSearchResults',
  ];

  const provenanceContracts = ['DocumentLineageDetail', 'AgreementLineageDetail'];

  const hasSourceManagement = dependencies.some((dep) => sourceManagementContracts.includes(dep));
  const hasProvenance = dependencies.some((dep) => provenanceContracts.includes(dep));

  return hasSourceManagement && hasProvenance;
}

// ============================================================================
// Composition Guidelines (Documentation)
// ============================================================================

/**
 * Source-Management Page Composition Guidelines
 *
 * When building new source-management pages, follow these rules:
 *
 * 1. **One Contract Family Per Page**
 *    - Each page consumes exactly one backend endpoint family
 *    - Do not stitch together multiple unrelated contracts
 *    - Use backend-owned links for navigation between surfaces
 *
 * 2. **No Client-Side Business Logic**
 *    - Do not compute lineage semantics (e.g., "newer source exists")
 *    - Do not rank candidates or compute warning severity
 *    - Do not order revisions or compute relationship graphs
 *    - Backend owns all semantic decisions
 *
 * 3. **URL State Isolation**
 *    - Keep query params, filters, and pagination state in URL
 *    - Do not persist page state in component-local memory
 *    - Page state should be fully reconstructable from URL
 *
 * 4. **Loading and Error States**
 *    - Use SourceManagementPageState pattern for all pages
 *    - Handle loading, error, and empty states consistently
 *    - Do not assume contracts are always available
 *
 * 5. **Permission-Aware Rendering**
 *    - Use SourceManagementPermissions for UI affordance visibility
 *    - Do not infer permissions from data presence/absence
 *    - Backend owns permission decisions
 *
 * 6. **Provider-Neutral Contracts**
 *    - Consume SourceProviderSummary, not Google-specific fields
 *    - Use provider extension envelope for provider-specific metadata
 *    - Do not branch on provider kind for semantic decisions
 *
 * 7. **Navigation Through Links**
 *    - Use backend-authored SourceManagementLinks for navigation
 *    - Do not construct URLs client-side
 *    - Backend owns link targets and diagnostics URLs
 *
 * 8. **Shared Adapter Boundaries**
 *    - Presentation adapters may only normalize transport shape
 *    - Adapters must not compute business logic or merge contracts
 *    - See source-management-adapters.ts for approved patterns
 */
export const SOURCE_MANAGEMENT_COMPOSITION_GUIDELINES = {
  version: 1,
  enforcementLevel: 'strict',
  approvedContracts: [
    'SourceListPage',
    'SourceDetail',
    'SourceRevisionPage',
    'SourceRelationshipPage',
    'SourceHandlePage',
    'SourceRevisionDetail',
    'SourceArtifactPage',
    'SourceCommentPage',
    'SourceSearchResults',
  ],
  prohibitedMixing: [
    'DocumentLineageDetail + SourceManagementContracts',
    'AgreementLineageDetail + SourceManagementContracts',
    'Multiple source-management endpoints in single page',
  ],
  architecturalInvariants: [
    'Backend owns semantics',
    'Frontend owns presentation',
    'One canonical contract family per page',
    'No client-side lineage computation',
    'Provider-neutral by default',
  ],
};

// ============================================================================
// Phase 13 Composition Guidelines (Task 13.9)
// ============================================================================

/**
 * Phase 13 Source-Management Workspace Composition Guidelines
 *
 * Additional rules for Phase 13 search and comment workspace composition:
 *
 * 1. **Workspace Panel Orchestration**
 *    - Each workspace has a single orchestration point
 *    - Panels do not communicate directly with each other
 *    - State flows down from workspace; events flow up through messages
 *    - Cross-panel state updates go through workspace orchestrator
 *
 * 2. **Search and Comment Isolation**
 *    - Source search uses Phase13SourceSearchResults ONLY
 *    - Source comments use Phase13SourceCommentPage ONLY
 *    - Agreement-review comments are a SEPARATE contract family
 *    - Google-specific provider payloads are NEVER consumed directly
 *
 * 3. **Sync Status Semantics**
 *    - Comment sync status is backend-computed
 *    - Frontend does NOT interpret sync status for retry logic
 *    - Sync error codes are displayed, not acted upon
 *    - Stale detection is backend responsibility
 *
 * 4. **Search Filter State**
 *    - All filter state lives in URL query params
 *    - Phase 13 filters (comment_sync_status, has_comments, etc.) follow same pattern
 *    - Filter presets are UI convenience, not semantic shortcuts
 *    - Backend owns filter validation and default application
 *
 * 5. **Comment Thread Display**
 *    - Thread ordering is backend-authored
 *    - Message threading/nesting is backend-authored
 *    - Resolution state is display-only (no frontend mutations in V2)
 *    - Anchor display uses backend-provided labels only
 */
export const PHASE_13_COMPOSITION_GUIDELINES = {
  version: 1,
  phase: 13,
  enforcementLevel: 'strict',
  approvedContracts: [
    // Phase 11/12 contracts
    'SourceListPage',
    'SourceDetail',
    'SourceRevisionPage',
    'SourceRelationshipPage',
    'SourceHandlePage',
    'SourceRevisionDetail',
    'SourceArtifactPage',
    'SourceCommentPage',
    'SourceSearchResults',
    // Phase 13 contracts
    'Phase13SourceSearchQuery',
    'Phase13SourceSearchResults',
    'Phase13SourceSearchResultSummary',
    'Phase13SourceCommentPage',
    'Phase13SourceCommentThreadSummary',
    'SourceCommentAuthorSummary',
    'SourceCommentMessageSummary',
    'SourceCommentSyncSummary',
    'SourceCommentListQuery',
  ],
  prohibitedMixing: [
    // Existing prohibitions
    'DocumentLineageDetail + SourceManagementContracts',
    'AgreementLineageDetail + SourceManagementContracts',
    'Multiple source-management endpoints in single page',
    // Phase 13 prohibitions
    'AgreementReviewComment + SourceComment',
    'GoogleDriveComment (raw) + SourceComment',
    'Multiple search contract families in single page',
    'Cross-workspace comment merging',
  ],
  architecturalInvariants: [
    // Existing invariants
    'Backend owns semantics',
    'Frontend owns presentation',
    'One canonical contract family per page',
    'No client-side lineage computation',
    'Provider-neutral by default',
    // Phase 13 invariants
    'Workspace orchestration over direct panel communication',
    'Source comments distinct from agreement-review comments',
    'Sync status is backend-computed display state',
    'Search ranking is backend responsibility',
    'Comment threading is backend-authored',
  ],
  workspacePatterns: {
    sourceDetailWorkspace: {
      primaryContract: 'SourceDetail',
      panelContracts: {
        revisions: 'SourceRevisionPage',
        relationships: 'SourceRelationshipPage',
        handles: 'SourceHandlePage',
        comments: 'Phase13SourceCommentPage',
      },
      orchestrationMode: 'single-source',
    },
    sourceSearchWorkspace: {
      primaryContract: 'Phase13SourceSearchResults',
      panelContracts: {
        results: 'Phase13SourceSearchResults',
        preview: 'SourceDetail',
      },
      orchestrationMode: 'search-driven',
    },
  },
};

// ============================================================================
// Version 2 Frontend Architectural Invariants (Phase 14 - Task 14.8)
// ============================================================================

/**
 * VERSION 2 FRONTEND ARCHITECTURAL INVARIANTS
 *
 * This section documents the canonical architectural invariants for Version 2
 * source-management frontend work. These invariants MUST be followed by any
 * new page or component before visual implementation begins.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 14 Task 14.8
 *
 * ============================================================================
 * INVARIANT 1: BACKEND OWNS SEMANTICS
 * ============================================================================
 *
 * The backend is the single source of truth for all semantic decisions:
 *
 * - Lineage semantics: "newer source exists", "source continuity", "canonical identity"
 * - Warning precedence: which warnings to show, in what order, with what severity
 * - Source continuity: whether sources are related, how to compute relationships
 * - Search ranking: relevance scores, result ordering, match strength
 * - Candidate scoring: confidence scores, relationship strength, match evidence
 * - Revision ordering: which revision is "latest", temporal ordering
 * - Sync state derivation: comment sync status, stale detection, retry logic
 *
 * Frontend MUST NOT:
 * - Compute any of the above semantics client-side
 * - Infer semantic state from presence/absence of data
 * - Reconstruct semantic state by stitching multiple endpoint payloads
 * - Override or adjust backend-authored semantic decisions
 *
 * ============================================================================
 * INVARIANT 2: FRONTEND OWNS PRESENTATION
 * ============================================================================
 *
 * The frontend has full autonomy over all presentation concerns:
 *
 * - Visual design: colors, typography, spacing, layout
 * - Interaction patterns: hover states, focus indicators, animations
 * - Accessibility: ARIA labels, screen reader text, keyboard navigation
 * - Loading indicators: skeletons, spinners, progress bars
 * - Error messages: user-friendly error text, retry affordances
 * - Empty state presentation: illustrations, suggested actions
 * - Responsive behavior: breakpoints, mobile adaptations
 *
 * Frontend MAY:
 * - Decide how to visually represent backend-authored semantic state
 * - Add cosmetic UI enhancements (animations, transitions, polish)
 * - Implement any interaction pattern that doesn't compute semantics
 * - Transform display labels (formatting, truncation, localization)
 *
 * Frontend MUST:
 * - Accept backend semantic decisions without modification
 * - Use backend-authored labels when provided (status labels, warning text)
 * - Display backend-computed values without recomputation
 *
 * ============================================================================
 * INVARIANT 3: ONE CANONICAL CONTRACT FAMILY PER PAGE
 * ============================================================================
 *
 * Every page must attach to exactly ONE canonical contract family before
 * visual implementation begins:
 *
 * Canonical Contract Families:
 * - SourceListPage: paginated list of canonical source documents
 * - SourceDetail: detailed view of a single source document
 * - SourceRevisionPage: revision timeline for a source
 * - SourceRelationshipPage: relationship graph for a source
 * - SourceHandlePage: handle history for a source
 * - SourceRevisionDetail: detailed view of a single revision
 * - SourceArtifactPage: artifacts for a revision
 * - SourceCommentPage: comments for a revision (pre-Phase 13)
 * - SourceSearchResults: search results (pre-Phase 13)
 * - Phase13SourceSearchResults: search results with comment/relationship fields
 * - Phase13SourceCommentPage: comments with sync status
 *
 * Before starting visual implementation, verify:
 * 1. Page consumes exactly one contract family from the list above
 * 2. Page does not mix multiple contract families
 * 3. Page does not depend on contracts outside approved modules
 * 4. Contract consumption is validated by Phase 14 guards
 *
 * ============================================================================
 * INVARIANT 4: CONTRACT CONSUMPTION THROUGH APPROVED MODULES ONLY
 * ============================================================================
 *
 * Pages must consume source-management contracts through approved modules:
 *
 * Approved Modules:
 * - lineage-contracts.ts: contract type definitions
 * - source-management-adapters.ts: presentation adapters
 * - source-management-composition.ts: page composition utilities
 * - source-management-fixtures.ts: test fixtures
 * - source-management-guards.ts: architectural guards
 * - source-management-pages.ts: page controllers
 * - source-management-rendering-states.ts: render state factories
 *
 * Pages MUST NOT:
 * - Import contracts from unapproved modules
 * - Construct contract types directly outside approved modules
 * - Access internal/private contract implementation details
 * - Create alternative contract type definitions
 *
 * ============================================================================
 * INVARIANT 5: NO RAW GOOGLE-SPECIFIC FIELDS AT PAGE LEVEL
 * ============================================================================
 *
 * Pages must not directly access raw Google-specific fields outside
 * approved adapter boundaries:
 *
 * Forbidden Fields (at page level):
 * - Google Drive API fields: kind, htmlContent, quotedFileContent
 * - KIX anchors and internal references
 * - Raw Google user/account identifiers
 * - Google-specific metadata (exportLinks, thumbnailLink, etc.)
 *
 * These fields may ONLY be accessed through approved adapters:
 * - source-management-adapters.ts
 * - lineage-contracts.ts (normalization functions)
 *
 * This invariant ensures provider-neutrality and supports future
 * multi-provider expansion without page-level changes.
 *
 * ============================================================================
 * INVARIANT 6: VISUAL IMPLEMENTATION AFTER CONTRACT ATTACHMENT
 * ============================================================================
 *
 * The implementation sequence for new pages/components:
 *
 * 1. FIRST: Identify and attach to canonical contract family
 *    - Determine which single contract family the page consumes
 *    - Verify contract is available from approved modules
 *    - Define page composition metadata (pageId, endpointFamily, contractVersion)
 *
 * 2. SECOND: Implement data flow
 *    - Create page controller with URL state management
 *    - Wire up contract fetching through approved patterns
 *    - Implement rendering state resolution
 *
 * 3. THIRD: Run architectural guards
 *    - Call runPhase14PageGuards() with page config
 *    - Fix any violations before proceeding
 *    - All guards must pass before visual implementation
 *
 * 4. FINALLY: Implement visual presentation
 *    - Build UI components using rendering state view models
 *    - Apply visual design and interaction patterns
 *    - Add accessibility and responsiveness
 *
 * IMPORTANT: Do not start visual implementation until steps 1-3 are complete.
 *
 * ============================================================================
 * CHECKLIST FOR NEW PAGE/COMPONENT IMPLEMENTATION
 * ============================================================================
 *
 * Before starting visual implementation, verify:
 *
 * □ Page attaches to exactly ONE canonical contract family
 * □ Contract is imported from approved modules only
 * □ Page does not access raw Google-specific fields
 * □ Page does not compute backend-owned semantics
 * □ Page uses rendering state factory functions
 * □ Page controller manages URL state appropriately
 * □ All Phase 14 guards pass for page configuration
 * □ Page composition is validated by validatePageComposition()
 *
 * ============================================================================
 */

/**
 * Version 2 architectural invariants documentation object.
 * Can be imported for programmatic access to invariant definitions.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 14 Task 14.8
 */
export const VERSION_2_ARCHITECTURAL_INVARIANTS = {
  version: 2,
  phase: 14,
  documentationDate: '2025-03-22',

  /**
   * Invariant 1: Backend owns all semantic decisions
   */
  backendOwnsSemantics: {
    description: 'The backend is the single source of truth for all semantic decisions',
    examples: [
      'Lineage semantics (newer source exists, source continuity, canonical identity)',
      'Warning precedence (which warnings to show, in what order, with what severity)',
      'Source continuity (whether sources are related, relationship computation)',
      'Search ranking (relevance scores, result ordering, match strength)',
      'Candidate scoring (confidence scores, relationship strength, match evidence)',
      'Revision ordering (which revision is latest, temporal ordering)',
      'Sync state derivation (comment sync status, stale detection, retry logic)',
    ],
    prohibitions: [
      'Frontend must NOT compute any of the above semantics client-side',
      'Frontend must NOT infer semantic state from presence/absence of data',
      'Frontend must NOT reconstruct semantic state by stitching multiple endpoints',
      'Frontend must NOT override or adjust backend-authored semantic decisions',
    ],
  },

  /**
   * Invariant 2: Frontend owns all presentation concerns
   */
  frontendOwnsPresentation: {
    description: 'The frontend has full autonomy over all presentation concerns',
    examples: [
      'Visual design (colors, typography, spacing, layout)',
      'Interaction patterns (hover states, focus indicators, animations)',
      'Accessibility (ARIA labels, screen reader text, keyboard navigation)',
      'Loading indicators (skeletons, spinners, progress bars)',
      'Error messages (user-friendly error text, retry affordances)',
      'Empty state presentation (illustrations, suggested actions)',
      'Responsive behavior (breakpoints, mobile adaptations)',
    ],
    permissions: [
      'Frontend MAY decide how to visually represent backend-authored state',
      'Frontend MAY add cosmetic UI enhancements (animations, transitions)',
      'Frontend MAY implement any interaction pattern without semantic computation',
      'Frontend MAY transform display labels (formatting, truncation, localization)',
    ],
    requirements: [
      'Frontend MUST accept backend semantic decisions without modification',
      'Frontend MUST use backend-authored labels when provided',
      'Frontend MUST display backend-computed values without recomputation',
    ],
  },

  /**
   * Invariant 3: One canonical contract family per page
   */
  oneContractFamilyPerPage: {
    description: 'Every page must attach to exactly ONE canonical contract family',
    canonicalFamilies: [
      'SourceListPage',
      'SourceDetail',
      'SourceRevisionPage',
      'SourceRelationshipPage',
      'SourceHandlePage',
      'SourceRevisionDetail',
      'SourceArtifactPage',
      'SourceCommentPage',
      'SourceSearchResults',
      'Phase13SourceSearchResults',
      'Phase13SourceCommentPage',
    ],
    preImplementationChecklist: [
      'Page consumes exactly one contract family from canonical list',
      'Page does not mix multiple contract families',
      'Page does not depend on contracts outside approved modules',
      'Contract consumption is validated by Phase 14 guards',
    ],
  },

  /**
   * Invariant 4: Contract consumption through approved modules only
   */
  approvedModulesOnly: {
    description: 'Pages must consume contracts through approved modules',
    approvedModules: [
      'lineage-contracts.ts',
      'source-management-adapters.ts',
      'source-management-composition.ts',
      'source-management-fixtures.ts',
      'source-management-guards.ts',
      'source-management-pages.ts',
      'source-management-rendering-states.ts',
    ],
    prohibitions: [
      'Pages must NOT import contracts from unapproved modules',
      'Pages must NOT construct contract types directly outside approved modules',
      'Pages must NOT access internal/private contract implementation details',
      'Pages must NOT create alternative contract type definitions',
    ],
  },

  /**
   * Invariant 5: No raw Google-specific fields at page level
   */
  noRawGoogleFields: {
    description: 'Pages must not directly access raw Google-specific fields',
    forbiddenFields: [
      'Google Drive API fields (kind, htmlContent, quotedFileContent)',
      'KIX anchors and internal references',
      'Raw Google user/account identifiers',
      'Google-specific metadata (exportLinks, thumbnailLink)',
    ],
    approvedAdapters: [
      'source-management-adapters.ts',
      'lineage-contracts.ts (normalization functions)',
    ],
    rationale: 'Ensures provider-neutrality and supports multi-provider expansion',
  },

  /**
   * Invariant 6: Visual implementation after contract attachment
   */
  implementationSequence: {
    description: 'Implementation sequence for new pages/components',
    steps: [
      {
        order: 1,
        name: 'Attach to canonical contract family',
        tasks: [
          'Determine which single contract family the page consumes',
          'Verify contract is available from approved modules',
          'Define page composition metadata (pageId, endpointFamily, contractVersion)',
        ],
      },
      {
        order: 2,
        name: 'Implement data flow',
        tasks: [
          'Create page controller with URL state management',
          'Wire up contract fetching through approved patterns',
          'Implement rendering state resolution',
        ],
      },
      {
        order: 3,
        name: 'Run architectural guards',
        tasks: [
          'Call runPhase14PageGuards() with page config',
          'Fix any violations before proceeding',
          'All guards must pass before visual implementation',
        ],
      },
      {
        order: 4,
        name: 'Implement visual presentation',
        tasks: [
          'Build UI components using rendering state view models',
          'Apply visual design and interaction patterns',
          'Add accessibility and responsiveness',
        ],
      },
    ],
    warning: 'Do not start visual implementation until steps 1-3 are complete',
  },

  /**
   * Pre-implementation checklist for new pages/components
   */
  preImplementationChecklist: [
    'Page attaches to exactly ONE canonical contract family',
    'Contract is imported from approved modules only',
    'Page does not access raw Google-specific fields',
    'Page does not compute backend-owned semantics',
    'Page uses rendering state factory functions',
    'Page controller manages URL state appropriately',
    'All Phase 14 guards pass for page configuration',
    'Page composition is validated by validatePageComposition()',
  ],
} as const;
