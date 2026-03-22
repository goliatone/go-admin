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
  SourceListQuery,
  SourceRevisionListQuery,
  SourceRelationshipListQuery,
  SourceSearchQuery,
  SourceManagementLinks,
  SourceManagementPermissions,
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
 * Purpose: Display detailed view of a single canonical source document
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
