/**
 * Source-Management Architectural Guards
 *
 * Runtime guards that enforce source-management pages cannot depend on
 * document-detail or agreement-detail provenance payloads except through
 * explicit shared adapter modules approved for that purpose.
 *
 * CRITICAL RULES:
 * 1. Source-management pages must consume backend-owned source-management contracts only
 * 2. Pages must NOT mix DocumentLineageDetail or AgreementLineageDetail with source contracts
 * 3. Pages must NOT reconstruct lineage state from multiple endpoints
 * 4. Guards should fail loud during development to prevent architectural drift
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 12 Task 12.9
 * @see source-management-composition.ts for composition boundaries
 */

import type {
  DocumentLineageDetail,
  AgreementLineageDetail,
  SourceListPage,
  SourceDetail,
  SourceRevisionPage,
  SourceRelationshipPage,
  SourceHandlePage,
  SourceRevisionDetail,
  SourceArtifactPage,
  SourceCommentPage,
  SourceSearchResults,
  Phase13SourceSearchResults,
  Phase13SourceCommentPage,
  Phase13SourceSearchResultSummary,
  Phase13SourceCommentThreadSummary,
  SourceCommentSyncSummary,
} from './lineage-contracts.js';

import { detectProvenancePayloadMixing } from './source-management-composition.js';

// ============================================================================
// Contract Type Guards
// ============================================================================

/**
 * Check if value is DocumentLineageDetail.
 */
export function isDocumentLineageDetail(value: unknown): value is DocumentLineageDetail {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return 'document_id' in record && 'fingerprint_status' in record && 'google_source' in record;
}

/**
 * Check if value is AgreementLineageDetail.
 */
export function isAgreementLineageDetail(value: unknown): value is AgreementLineageDetail {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    'agreement_id' in record &&
    'pinned_source_revision_id' in record &&
    'newer_source_exists' in record
  );
}

/**
 * Check if value is a source-management contract type.
 */
export function isSourceManagementContract(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  const hasPageEnvelope =
    'items' in record &&
    'page_info' in record &&
    'permissions' in record &&
    'empty_state' in record &&
    'links' in record;
  if (hasPageEnvelope) {
    return true;
  }

  const isSourceDetailLike =
    'source' in record &&
    'permissions' in record &&
    'empty_state' in record &&
    'links' in record &&
    ('provider' in record || 'revision_count' in record || 'handle_count' in record);
  if (isSourceDetailLike) {
    return true;
  }

  const isRevisionDetailLike =
    'revision' in record &&
    'permissions' in record &&
    'empty_state' in record &&
    'links' in record &&
    ('fingerprint_status' in record || 'fingerprint_processing' in record || 'sync_status' in record);
  if (isRevisionDetailLike) {
    return true;
  }

  return hasSourceManagementSelfLink(record);
}

function hasSourceManagementSelfLink(record: Record<string, unknown>): boolean {
  const links = record.links;
  if (typeof links !== 'object' || links === null) {
    return false;
  }
  const self = (links as Record<string, unknown>).self;
  if (typeof self !== 'string') {
    return false;
  }
  return isSourceManagementEndpoint(self);
}

function isSourceManagementEndpoint(endpoint: string): boolean {
  return normalizeSourceManagementEndpointFamily(endpoint) !== 'unknown';
}

function normalizeSourceManagementEndpointFamily(endpoint: string): string {
  if (endpoint.includes('/source-search')) return 'source-search';
  if (endpoint.includes('/source-revisions/') && endpoint.includes('/comments'))
    return 'source-revision-comments';
  if (endpoint.includes('/source-revisions/') && endpoint.includes('/artifacts'))
    return 'source-revision-artifacts';
  if (endpoint.includes('/source-revisions/')) return 'source-revision-detail';
  if (endpoint.includes('/sources/') && endpoint.includes('/comments')) return 'source-comments';
  if (endpoint.includes('/sources/') && endpoint.includes('/revisions')) return 'source-revisions';
  if (endpoint.includes('/sources/') && endpoint.includes('/relationships'))
    return 'source-relationships';
  if (endpoint.includes('/sources/') && endpoint.includes('/handles')) return 'source-handles';
  if (endpoint.includes('/sources/')) return 'source-detail';
  if (endpoint.includes('/sources')) return 'source-list';
  return 'unknown';
}

// ============================================================================
// Architectural Violation Detection
// ============================================================================

/**
 * Guard violation result.
 */
export interface GuardViolationResult {
  /** Whether violation was detected */
  violated: boolean;
  /** Violation description */
  violations: string[];
  /** Guard that was violated */
  guardName: string;
}

type GuardContractType =
  | 'DocumentLineageDetail'
  | 'AgreementLineageDetail'
  | 'SourceManagementContract';

function resolveGuardContractType(value: unknown): GuardContractType | null {
  if (isDocumentLineageDetail(value)) return 'DocumentLineageDetail';
  if (isAgreementLineageDetail(value)) return 'AgreementLineageDetail';
  if (isSourceManagementContract(value)) return 'SourceManagementContract';
  return null;
}

function isGuardContractType(value: GuardContractType | null): value is GuardContractType {
  return value !== null;
}

/**
 * Check if page dependencies violate composition boundaries.
 * Detects if source-management pages are mixing provenance payloads.
 */
export function checkCompositionBoundaryViolation(
  pageId: string,
  dependencies: unknown[]
): GuardViolationResult {
  const violations: string[] = [];

  // Extract contract type names from dependencies
  const contractTypes = dependencies.map(resolveGuardContractType).filter(isGuardContractType);

  // Check for mixing
  const hasMixing = detectProvenancePayloadMixing(contractTypes);

  if (hasMixing) {
    violations.push(
      `Page "${pageId}" violates composition boundary: mixing source-management contracts ` +
        `with document/agreement provenance payloads. ` +
        `Source-management pages must consume source-management endpoints only.`
    );
  }

  return {
    violated: violations.length > 0,
    violations,
    guardName: 'checkCompositionBoundaryViolation',
  };
}

/**
 * Check if page is attempting to use unapproved adapter modules.
 * Blocks usage of raw provenance payloads outside approved adapter boundaries.
 */
export function checkAdapterBoundaryViolation(
  pageId: string,
  usedContracts: string[],
  approvedAdapters: string[]
): GuardViolationResult {
  const violations: string[] = [];

  const prohibitedContracts = ['DocumentLineageDetail', 'AgreementLineageDetail'];
  const usedProhibitedContracts = usedContracts.filter((contract) =>
    prohibitedContracts.includes(contract)
  );

  if (usedProhibitedContracts.length > 0) {
    const hasApprovedAdapter = approvedAdapters.some((adapter) =>
      [
        'source-management-adapters',
        'source-management-composition',
        'lineage-contracts-shared',
      ].includes(adapter)
    );

    if (!hasApprovedAdapter) {
      violations.push(
        `Page "${pageId}" uses prohibited contracts [${usedProhibitedContracts.join(', ')}] ` +
          `without approved adapter modules. ` +
          `Source-management pages must use shared adapters for provenance data.`
      );
    }
  }

  return {
    violated: violations.length > 0,
    violations,
    guardName: 'checkAdapterBoundaryViolation',
  };
}

/**
 * Check if page is attempting to compute lineage semantics client-side.
 * Blocks computation of warning precedence, candidate scoring, or source continuity.
 */
export function checkSemanticComputationViolation(
  pageId: string,
  computedFields: string[]
): GuardViolationResult {
  const violations: string[] = [];

  const prohibitedComputations = [
    'newer_source_exists',
    'warning_precedence',
    'candidate_score',
    'relationship_ranking',
    'source_continuity',
    'lineage_confidence',
    'revision_ordering',
  ];

  const violatingComputations = computedFields.filter((field) =>
    prohibitedComputations.some((prohibited) => field.includes(prohibited))
  );

  if (violatingComputations.length > 0) {
    violations.push(
      `Page "${pageId}" computes prohibited semantic fields client-side: [${violatingComputations.join(', ')}]. ` +
        `All lineage semantics must be computed by backend read models.`
    );
  }

  return {
    violated: violations.length > 0,
    violations,
    guardName: 'checkSemanticComputationViolation',
  };
}

/**
 * Check if page is attempting to stitch multiple endpoint responses.
 * Blocks reconstruction of state from multiple unrelated contracts.
 */
export function checkEndpointStitchingViolation(
  pageId: string,
  fetchedEndpoints: string[]
): GuardViolationResult {
  const violations: string[] = [];

  const otherEndpoints = fetchedEndpoints.filter(
    (endpoint) => !isSourceManagementEndpoint(endpoint) && !endpoint.includes('/diagnostics')
  );

  if (otherEndpoints.length > 0) {
    violations.push(
      `Page "${pageId}" fetches from non-source-management endpoints: [${otherEndpoints.join(', ')}]. ` +
        `Source-management pages must consume one source-management endpoint family only.`
    );
  }

  // Detect if multiple unrelated source-management endpoints are being stitched
  const normalizedEndpoints = fetchedEndpoints.map((endpoint) =>
    normalizeSourceManagementEndpointFamily(endpoint)
  );

  const uniqueEndpointFamilies = [...new Set(normalizedEndpoints)].filter((e) => e !== 'unknown');

  if (uniqueEndpointFamilies.length > 1) {
    violations.push(
      `Page "${pageId}" fetches from multiple unrelated endpoint families: [${uniqueEndpointFamilies.join(', ')}]. ` +
        `Each page should consume exactly ONE endpoint family.`
    );
  }

  return {
    violated: violations.length > 0,
    violations,
    guardName: 'checkEndpointStitchingViolation',
  };
}

// ============================================================================
// Guard Enforcement
// ============================================================================

/**
 * Guard enforcement mode.
 */
export type GuardEnforcementMode = 'strict' | 'warn' | 'disabled';

/**
 * Global guard enforcement configuration.
 */
let GUARD_ENFORCEMENT_MODE: GuardEnforcementMode = 'strict';

/**
 * Set guard enforcement mode.
 * In 'strict' mode, violations throw errors.
 * In 'warn' mode, violations are logged as warnings.
 * In 'disabled' mode, guards are not enforced.
 */
export function setGuardEnforcementMode(mode: GuardEnforcementMode): void {
  GUARD_ENFORCEMENT_MODE = mode;
}

/**
 * Get current guard enforcement mode.
 */
export function getGuardEnforcementMode(): GuardEnforcementMode {
  return GUARD_ENFORCEMENT_MODE;
}

/**
 * Enforce guard violation based on current enforcement mode.
 */
export function enforceGuardViolation(result: GuardViolationResult): void {
  if (!result.violated || GUARD_ENFORCEMENT_MODE === 'disabled') {
    return;
  }

  const message = `[${result.guardName}] ${result.violations.join('\n')}`;

  if (GUARD_ENFORCEMENT_MODE === 'strict') {
    throw new Error(message);
  }

  if (GUARD_ENFORCEMENT_MODE === 'warn') {
    console.warn(message);
  }
}

// ============================================================================
// Comprehensive Page Guard
// ============================================================================

/**
 * Page guard configuration.
 */
export interface PageGuardConfig {
  /** Page identifier */
  pageId: string;
  /** Dependencies used by page (contract instances) */
  dependencies?: unknown[];
  /** Contract type names used by page */
  usedContracts?: string[];
  /** Adapter modules used by page */
  usedAdapters?: string[];
  /** Computed fields (field names) */
  computedFields?: string[];
  /** Fetched endpoint URLs */
  fetchedEndpoints?: string[];
}

/**
 * Comprehensive page guard result.
 */
export interface PageGuardResult {
  /** Whether any violations were detected */
  violated: boolean;
  /** All violation results */
  results: GuardViolationResult[];
  /** Summary of violations */
  summary: string;
}

/**
 * Run all architectural guards for a source-management page.
 * This is the primary enforcement point for composition rules.
 */
export function runPageGuards(config: PageGuardConfig): PageGuardResult {
  const results: GuardViolationResult[] = [];

  // Check composition boundary
  if (config.dependencies) {
    const compositionResult = checkCompositionBoundaryViolation(
      config.pageId,
      config.dependencies
    );
    if (compositionResult.violated) {
      results.push(compositionResult);
      enforceGuardViolation(compositionResult);
    }
  }

  // Check adapter boundary
  if (config.usedContracts && config.usedAdapters) {
    const adapterResult = checkAdapterBoundaryViolation(
      config.pageId,
      config.usedContracts,
      config.usedAdapters
    );
    if (adapterResult.violated) {
      results.push(adapterResult);
      enforceGuardViolation(adapterResult);
    }
  }

  // Check semantic computation
  if (config.computedFields) {
    const semanticResult = checkSemanticComputationViolation(config.pageId, config.computedFields);
    if (semanticResult.violated) {
      results.push(semanticResult);
      enforceGuardViolation(semanticResult);
    }
  }

  // Check endpoint stitching
  if (config.fetchedEndpoints) {
    const stitchingResult = checkEndpointStitchingViolation(config.pageId, config.fetchedEndpoints);
    if (stitchingResult.violated) {
      results.push(stitchingResult);
      enforceGuardViolation(stitchingResult);
    }
  }

  const violated = results.some((r) => r.violated);
  const summary = violated
    ? `Page "${config.pageId}" has ${results.length} architectural violations`
    : `Page "${config.pageId}" passes all architectural guards`;

  return {
    violated,
    results,
    summary,
  };
}

// ============================================================================
// Development-Time Utilities
// ============================================================================

/**
 * Log guard results to console for debugging.
 */
export function logGuardResults(result: PageGuardResult): void {
  if (!result.violated) {
    console.info(`✓ ${result.summary}`);
    return;
  }

  console.error(`✗ ${result.summary}`);
  result.results.forEach((r) => {
    if (r.violated) {
      console.error(`  [${r.guardName}]`);
      r.violations.forEach((v) => {
        console.error(`    - ${v}`);
      });
    }
  });
}

/**
 * Assert that page passes all guards.
 * Useful for unit tests.
 */
export function assertPageGuards(config: PageGuardConfig): void {
  const result = runPageGuards(config);
  if (result.violated) {
    logGuardResults(result);
    throw new Error(result.summary);
  }
}

// ============================================================================
// Phase 13 Architectural Guards (Task 13.10)
// ============================================================================

/**
 * Check if value is a Phase 13 source search result.
 */
export function isPhase13SourceSearchResults(value: unknown): value is Phase13SourceSearchResults {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (!('items' in record) || !('applied_query' in record) || !('page_info' in record)) {
    return false;
  }

  const items = record.items;
  if (!Array.isArray(items)) {
    return false;
  }

  if (hasSourceManagementSelfLink(record)) {
    return normalizeSourceManagementEndpointFamily(String((record.links as Record<string, unknown>).self)) === 'source-search';
  }

  if (items.length === 0) {
    return false;
  }

  const firstItem = items[0] as Record<string, unknown>;
  return 'result_kind' in firstItem && 'matched_fields' in firstItem;
}

/**
 * Check if value is a Phase 13 source comment page.
 */
export function isPhase13SourceCommentPage(value: unknown): value is Phase13SourceCommentPage {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (!('items' in record) || !('sync_status' in record) || !('page_info' in record)) {
    return false;
  }

  const items = record.items;
  if (!Array.isArray(items)) {
    return false;
  }

  if (hasSourceManagementSelfLink(record)) {
    const family = normalizeSourceManagementEndpointFamily(
      String((record.links as Record<string, unknown>).self)
    );
    return family === 'source-comments' || family === 'source-revision-comments';
  }

  if (items.length === 0) {
    return 'source' in record || 'revision' in record;
  }

  const firstItem = items[0] as Record<string, unknown>;
  return 'message_count' in firstItem && ('anchor' in firstItem || 'messages' in firstItem);
}

/**
 * Check if value looks like an agreement-review comment payload.
 * These payloads should NOT be mixed with source comments.
 */
export function isAgreementReviewCommentPayload(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  // Agreement review comments have agreement_id and are tied to signing workflow
  return (
    ('agreement_id' in record && 'review_status' in record) ||
    ('signer_id' in record && 'comment_type' in record) ||
    ('placement_id' in record && 'field_id' in record)
  );
}

/**
 * Check if value looks like a raw Google Drive comment payload.
 * These payloads should NOT be consumed directly by source-management surfaces.
 */
export function isRawGoogleDriveCommentPayload(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  // Raw Google Drive comments have specific Google API fields
  return (
    ('kind' in record && (record.kind === 'drive#comment' || record.kind === 'drive#reply')) ||
    ('htmlContent' in record && 'quotedFileContent' in record) ||
    ('anchor' in record && typeof record.anchor === 'string' && (record.anchor as string).includes('kix.'))
  );
}

/**
 * Check if page is attempting to mix source comments with agreement-review comments.
 * This is a Phase 13 specific violation.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 13 Task 13.10
 */
export function checkSourceCommentMixingViolation(
  pageId: string,
  dependencies: unknown[]
): GuardViolationResult {
  const violations: string[] = [];

  const hasSourceComments = dependencies.some(
    (dep) => isPhase13SourceCommentPage(dep) || isSourceManagementContract(dep)
  );
  const hasAgreementReviewComments = dependencies.some((dep) =>
    isAgreementReviewCommentPayload(dep)
  );

  if (hasSourceComments && hasAgreementReviewComments) {
    violations.push(
      `Page "${pageId}" mixes source-management comment contracts with agreement-review comment payloads. ` +
        `Source comments and agreement-review comments are distinct contract families and must NOT be mixed. ` +
        `Use separate pages or panels for each comment type.`
    );
  }

  return {
    violated: violations.length > 0,
    violations,
    guardName: 'checkSourceCommentMixingViolation',
  };
}

/**
 * Check if page is attempting to use raw Google-specific provider payloads.
 * Source-management surfaces must use provider-neutral contracts only.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 13 Task 13.10
 */
export function checkGoogleProviderPayloadViolation(
  pageId: string,
  dependencies: unknown[]
): GuardViolationResult {
  const violations: string[] = [];

  const usesRawGooglePayloads = dependencies.some((dep) => isRawGoogleDriveCommentPayload(dep));

  if (usesRawGooglePayloads) {
    violations.push(
      `Page "${pageId}" uses raw Google Drive comment payloads directly. ` +
        `Source-management surfaces must consume provider-neutral contracts only. ` +
        `Use Phase13SourceCommentPage or Phase13SourceCommentThreadSummary instead.`
    );
  }

  // Also check for direct Google-specific field access
  for (const dep of dependencies) {
    if (typeof dep === 'object' && dep !== null) {
      const record = dep as Record<string, unknown>;
      const googleSpecificFields = [
        'quotedFileContent',
        'htmlContent',
        'kix_anchor',
        'drive_comment_id',
        'google_user_id',
      ];
      const foundGoogleFields = googleSpecificFields.filter((field) => field in record);
      if (foundGoogleFields.length > 0) {
        violations.push(
          `Page "${pageId}" accesses Google-specific fields [${foundGoogleFields.join(', ')}] directly. ` +
            `Use provider-neutral contract fields instead.`
        );
      }
    }
  }

  return {
    violated: violations.length > 0,
    violations,
    guardName: 'checkGoogleProviderPayloadViolation',
  };
}

/**
 * Check if search surfaces are properly consuming Phase 13 contracts.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 13 Task 13.10
 */
export function checkSearchContractViolation(
  pageId: string,
  searchContracts: unknown[],
  usedFields: string[]
): GuardViolationResult {
  const violations: string[] = [];

  // Check that search results use Phase 13 contracts when using Phase 13 features
  const usesPhase13Fields = usedFields.some((field) =>
    ['comment_sync_status', 'has_comments', 'relationship_state', 'comment_count'].includes(field)
  );

  const hasPhase13SearchContract = searchContracts.some((contract) =>
    isPhase13SourceSearchResults(contract)
  );

  if (usesPhase13Fields && !hasPhase13SearchContract) {
    violations.push(
      `Page "${pageId}" uses Phase 13 search fields [${usedFields.filter((f) =>
        ['comment_sync_status', 'has_comments', 'relationship_state', 'comment_count'].includes(f)
      ).join(', ')}] but does not consume Phase13SourceSearchResults contract. ` +
        `Ensure search surfaces import and use Phase 13 contract types.`
    );
  }

  return {
    violated: violations.length > 0,
    violations,
    guardName: 'checkSearchContractViolation',
  };
}

/**
 * Check if comment surfaces are properly consuming Phase 13 contracts.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 13 Task 13.10
 */
export function checkCommentContractViolation(
  pageId: string,
  commentContracts: unknown[],
  usedFields: string[]
): GuardViolationResult {
  const violations: string[] = [];

  // Check that comment pages use Phase 13 contracts when using Phase 13 features
  const usesPhase13Fields = usedFields.some((field) =>
    ['sync', 'messages', 'author', 'last_activity_at'].includes(field)
  );

  const hasPhase13CommentContract = commentContracts.some((contract) =>
    isPhase13SourceCommentPage(contract)
  );

  if (usesPhase13Fields && !hasPhase13CommentContract) {
    violations.push(
      `Page "${pageId}" uses Phase 13 comment fields [${usedFields.filter((f) =>
        ['sync', 'messages', 'author', 'last_activity_at'].includes(f)
      ).join(', ')}] but does not consume Phase13SourceCommentPage contract. ` +
        `Ensure comment surfaces import and use Phase 13 contract types.`
    );
  }

  return {
    violated: violations.length > 0,
    violations,
    guardName: 'checkCommentContractViolation',
  };
}

// ============================================================================
// Phase 13 Comprehensive Guard Configuration
// ============================================================================

/**
 * Extended page guard configuration for Phase 13.
 */
export interface Phase13PageGuardConfig extends PageGuardConfig {
  /** Search contracts used by page */
  searchContracts?: unknown[];
  /** Comment contracts used by page */
  commentContracts?: unknown[];
  /** Search fields accessed by page */
  searchFieldsAccessed?: string[];
  /** Comment fields accessed by page */
  commentFieldsAccessed?: string[];
}

/**
 * Run all Phase 13 architectural guards for a source-management page.
 * This extends the base page guards with Phase 13 specific checks.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 13 Task 13.10
 */
export function runPhase13PageGuards(config: Phase13PageGuardConfig): PageGuardResult {
  // First run base guards
  const baseResult = runPageGuards(config);
  const results = [...baseResult.results];

  // Check source comment mixing
  if (config.dependencies) {
    const commentMixingResult = checkSourceCommentMixingViolation(
      config.pageId,
      config.dependencies
    );
    if (commentMixingResult.violated) {
      results.push(commentMixingResult);
      enforceGuardViolation(commentMixingResult);
    }

    // Check Google provider payload usage
    const googlePayloadResult = checkGoogleProviderPayloadViolation(
      config.pageId,
      config.dependencies
    );
    if (googlePayloadResult.violated) {
      results.push(googlePayloadResult);
      enforceGuardViolation(googlePayloadResult);
    }
  }

  // Check search contract usage
  if (config.searchContracts && config.searchFieldsAccessed) {
    const searchContractResult = checkSearchContractViolation(
      config.pageId,
      config.searchContracts,
      config.searchFieldsAccessed
    );
    if (searchContractResult.violated) {
      results.push(searchContractResult);
      enforceGuardViolation(searchContractResult);
    }
  }

  // Check comment contract usage
  if (config.commentContracts && config.commentFieldsAccessed) {
    const commentContractResult = checkCommentContractViolation(
      config.pageId,
      config.commentContracts,
      config.commentFieldsAccessed
    );
    if (commentContractResult.violated) {
      results.push(commentContractResult);
      enforceGuardViolation(commentContractResult);
    }
  }

  const violated = results.some((r) => r.violated);
  const summary = violated
    ? `Page "${config.pageId}" has ${results.filter((r) => r.violated).length} architectural violations (including Phase 13 checks)`
    : `Page "${config.pageId}" passes all architectural guards (including Phase 13 checks)`;

  return {
    violated,
    results,
    summary,
  };
}

/**
 * Assert that page passes all Phase 13 guards.
 * Useful for unit tests.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 13 Task 13.10
 */
export function assertPhase13PageGuards(config: Phase13PageGuardConfig): void {
  const result = runPhase13PageGuards(config);
  if (result.violated) {
    logGuardResults(result);
    throw new Error(result.summary);
  }
}

// ============================================================================
// Phase 13 Guard Test Utilities (Task 13.10)
// ============================================================================

/**
 * Test helper: Create a mock agreement-review comment for testing guard detection.
 */
export function createMockAgreementReviewComment(): Record<string, unknown> {
  return {
    agreement_id: 'agr_123',
    review_status: 'pending',
    signer_id: 'signer_456',
    comment_type: 'field_comment',
    placement_id: 'place_789',
    body: 'Please review this field',
    created_at: new Date().toISOString(),
  };
}

/**
 * Test helper: Create a mock raw Google Drive comment for testing guard detection.
 */
export function createMockRawGoogleDriveComment(): Record<string, unknown> {
  return {
    kind: 'drive#comment',
    id: 'AAAgB1234',
    htmlContent: '<p>This is a comment</p>',
    quotedFileContent: {
      mimeType: 'text/html',
      value: 'quoted text',
    },
    anchor: 'kix.abcdef123456',
    author: {
      kind: 'drive#user',
      displayName: 'Test User',
      emailAddress: 'test@example.com',
    },
  };
}

/**
 * Test helper: Create a mock Phase 13 source comment page for testing.
 */
export function createMockPhase13SourceCommentPage(): Phase13SourceCommentPage {
  return {
    source: { id: 'src_123', label: 'Test Source' },
    revision: { id: 'rev_456' },
    items: [],
    applied_query: { page: 1, page_size: 20 },
    page_info: { mode: 'page', page: 1, page_size: 20, total_count: 0, has_more: false },
    permissions: {
      can_view_diagnostics: true,
      can_open_provider_links: true,
      can_review_candidates: false,
      can_view_comments: true,
    },
    empty_state: { kind: 'no_comments', title: 'No comments', description: 'No comments found.' },
    sync_status: 'synced',
    sync: {
      status: 'synced',
      thread_count: 0,
      message_count: 0,
      last_synced_at: new Date().toISOString(),
    },
    links: {},
  };
}

/**
 * Test helper: Create a mock Phase 13 search results for testing.
 */
export function createMockPhase13SearchResults(): Phase13SourceSearchResults {
  return {
    items: [],
    page_info: { mode: 'page', page: 1, page_size: 20, total_count: 0, has_more: false },
    applied_query: { query: 'test' },
    permissions: {
      can_view_diagnostics: true,
      can_open_provider_links: true,
      can_review_candidates: false,
      can_view_comments: true,
    },
    empty_state: { kind: 'no_results', title: 'No results', description: 'No results found.' },
    links: {},
  };
}

// ============================================================================
// Phase 14 Architectural Guards (Task 14.6)
// ============================================================================

/**
 * Phase 14 approved source-management contract modules.
 * Pages must consume contracts through these approved modules only.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 14 Task 14.6
 */
export const PHASE_14_APPROVED_CONTRACT_MODULES = [
  'lineage-contracts',
  'source-management-adapters',
  'source-management-composition',
  'source-management-fixtures',
  'source-management-guards',
  'source-management-pages',
  'source-management-rendering-states',
] as const;

/**
 * Raw Google-specific fields that are forbidden at page level.
 * These fields may only be accessed through approved adapter boundaries.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 14 Task 14.6
 */
export const FORBIDDEN_RAW_GOOGLE_FIELDS = [
  // Direct Google Drive API fields
  'kind',
  'htmlContent',
  'quotedFileContent',
  'kix.', // KIX anchors
  'drive#comment',
  'drive#reply',
  'drive#user',
  // Google-specific metadata fields (outside adapter boundaries)
  'google_user_id',
  'google_doc_url',
  'google_drive_id',
  'google_file_id',
  'google_account_email',
  // Raw Google API response structures
  'nextPageToken',
  'mimeType', // when outside adapter context
  'modifiedByMeTime',
  'viewedByMeTime',
  'sharedWithMeTime',
  'createdTime',
  'quotaBytesUsed',
  'webContentLink',
  'iconLink',
  'thumbnailLink',
  'exportLinks',
] as const;

/**
 * Approved adapter boundaries for Google-specific field access.
 * Pages may access Google fields ONLY through these adapter modules.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 14 Task 14.6
 */
export const APPROVED_GOOGLE_ADAPTER_BOUNDARIES = [
  'source-management-adapters',
  'lineage-contracts', // normalization functions
  'lineage-presentation', // presentation adapters
  'source-management-composition', // composition helpers
] as const;

/**
 * Canonical Version 2 source-management surfaces guarded in Phase 14.
 */
export const PHASE_14_GUARD_SURFACES = [
  'source_list',
  'source_detail',
  'revision_history',
  'relationship_summaries',
  'search',
  'source_comment',
] as const;

export type Phase14GuardSurface = (typeof PHASE_14_GUARD_SURFACES)[number];

/**
 * Canonical page ids used for Phase 14 surface guards.
 */
export const PHASE_14_SURFACE_PAGE_IDS: Record<Phase14GuardSurface, string> = {
  source_list: 'source-browser-page',
  source_detail: 'source-detail-page',
  revision_history: 'source-revision-timeline-page',
  relationship_summaries: 'source-relationship-graph-page',
  search: 'source-search-page',
  source_comment: 'source-comment-inspector-page',
};

/**
 * Fallback runtime endpoints used when a fixture does not expose a self link.
 */
export const PHASE_14_SURFACE_ENDPOINT_FALLBACKS: Record<Phase14GuardSurface, string> = {
  source_list: '/admin/api/v1/esign/sources',
  source_detail: '/admin/api/v1/esign/sources/src_123',
  revision_history: '/admin/api/v1/esign/sources/src_123/revisions',
  relationship_summaries: '/admin/api/v1/esign/sources/src_123/relationships',
  search: '/admin/api/v1/esign/source-search?q=test',
  source_comment: '/admin/api/v1/esign/sources/src_123/comments',
};

/**
 * Structured raw field access record used by Phase 14 guards.
 * When `accessedThrough` is an approved adapter boundary, the access is allowed.
 */
export interface Phase14RawFieldAccess {
  field: string;
  accessedThrough?: string;
}

export type Phase14RawFieldAccessInput = string | Phase14RawFieldAccess;

/**
 * Phase 14 page guard configuration extending Phase 13.
 */
export interface Phase14PageGuardConfig extends Phase13PageGuardConfig {
  /** Import sources (module names) used by the page */
  importSources?: string[];
  /** Raw field accesses detected in page code */
  rawFieldAccesses?: Phase14RawFieldAccessInput[];
  /** Whether to enforce strict contract module consumption */
  enforceContractModules?: boolean;
}

function normalizeModuleSpecifier(source: string): string {
  return source
    .replace(/^\.\.\//, '')
    .replace(/^\.\//, '')
    .replace(/\.js$/, '')
    .replace(/\.ts$/, '');
}

function isApprovedBoundaryModule(moduleName: string | undefined): boolean {
  if (!moduleName) {
    return false;
  }

  const normalized = normalizeModuleSpecifier(moduleName);
  return APPROVED_GOOGLE_ADAPTER_BOUNDARIES.some(
    (approved) => normalized === approved || normalized.endsWith(`/${approved}`)
  );
}

function normalizeRawFieldAccess(
  access: Phase14RawFieldAccessInput
): Phase14RawFieldAccess {
  return typeof access === 'string' ? { field: access } : access;
}

function isForbiddenGoogleFieldAccess(field: string): boolean {
  return FORBIDDEN_RAW_GOOGLE_FIELDS.some(
    (forbidden) => field === forbidden || field.includes(forbidden)
  );
}

function getContractSelfLink(contract: unknown): string | undefined {
  if (typeof contract !== 'object' || contract === null) {
    return undefined;
  }

  const links = (contract as Record<string, unknown>).links;
  if (typeof links !== 'object' || links === null) {
    return undefined;
  }

  const self = (links as Record<string, unknown>).self;
  return typeof self === 'string' && self.length > 0 ? self : undefined;
}

/**
 * Check if page is importing contracts from approved modules only.
 * Forbids direct construction of contract types outside approved modules.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 14 Task 14.6
 */
export function checkContractModuleConsumptionViolation(
  pageId: string,
  importSources: string[]
): GuardViolationResult {
  const violations: string[] = [];

  // Check for imports from non-approved modules
  const nonApprovedImports = importSources.filter((source) => {
    // Normalize module path
    const moduleName = normalizeModuleSpecifier(source);

    // Check if it's a source-management related import
    const isSourceManagementRelated =
      moduleName.includes('source-management') ||
      moduleName.includes('lineage') ||
      moduleName.includes('esign');

    if (!isSourceManagementRelated) {
      return false; // Non source-management imports are allowed
    }

    // Check if it's an approved module
    return !PHASE_14_APPROVED_CONTRACT_MODULES.some(
      (approved) => moduleName === approved || moduleName.endsWith(`/${approved}`)
    );
  });

  if (nonApprovedImports.length > 0) {
    violations.push(
      `Page "${pageId}" imports source-management contracts from non-approved modules: ` +
        `[${nonApprovedImports.join(', ')}]. ` +
        `Approved modules: [${PHASE_14_APPROVED_CONTRACT_MODULES.join(', ')}].`
    );
  }

  return {
    violated: violations.length > 0,
    violations,
    guardName: 'checkContractModuleConsumptionViolation',
  };
}

/**
 * Check if page is accessing raw Google-specific fields outside adapter boundaries.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 14 Task 14.6
 */
export function checkRawGoogleFieldAccessViolation(
  pageId: string,
  rawFieldAccesses: Phase14RawFieldAccessInput[]
): GuardViolationResult {
  const violations: string[] = [];

  const forbiddenAccesses = rawFieldAccesses
    .map((access) => normalizeRawFieldAccess(access))
    .filter((access) => isForbiddenGoogleFieldAccess(access.field))
    .filter((access) => !isApprovedBoundaryModule(access.accessedThrough));

  if (forbiddenAccesses.length > 0) {
    const formattedAccesses = forbiddenAccesses.map((access) =>
      access.accessedThrough
        ? `${access.field} via non-approved boundary ${access.accessedThrough}`
        : access.field
    );
    violations.push(
      `Page "${pageId}" accesses forbidden raw Google-specific fields: ` +
        `[${formattedAccesses.join(', ')}]. ` +
        `These fields may only be accessed through approved adapter boundaries: ` +
        `[${APPROVED_GOOGLE_ADAPTER_BOUNDARIES.join(', ')}].`
    );
  }

  return {
    violated: violations.length > 0,
    violations,
    guardName: 'checkRawGoogleFieldAccessViolation',
  };
}

/**
 * Check if page is adhering to the canonical contract family rule.
 * Each page must attach to a single canonical contract family.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 14 Task 14.6
 */
export function checkCanonicalContractFamilyViolation(
  pageId: string,
  usedContractFamilies: string[]
): GuardViolationResult {
  const violations: string[] = [];

  // Define canonical contract families
  const canonicalFamilies = [
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
  ];

  // Count canonical families used
  const usedCanonicalFamilies = usedContractFamilies.filter((family) =>
    canonicalFamilies.includes(family)
  );

  // More than one canonical family is a violation
  if (usedCanonicalFamilies.length > 1) {
    violations.push(
      `Page "${pageId}" uses multiple canonical contract families: ` +
        `[${usedCanonicalFamilies.join(', ')}]. ` +
        `Each page must attach to exactly ONE canonical contract family before visual implementation.`
    );
  }

  // Zero canonical families is also a violation (unless it's a pure utility page)
  if (usedCanonicalFamilies.length === 0 && usedContractFamilies.length > 0) {
    violations.push(
      `Page "${pageId}" uses contracts [${usedContractFamilies.join(', ')}] ` +
        `but does not attach to any canonical contract family. ` +
        `Pages must consume one canonical contract family from: [${canonicalFamilies.join(', ')}].`
    );
  }

  return {
    violated: violations.length > 0,
    violations,
    guardName: 'checkCanonicalContractFamilyViolation',
  };
}

/**
 * Check if page properly separates backend semantics from frontend presentation.
 * Backend owns: lineage semantics, warning precedence, source continuity, search ranking
 * Frontend owns: visual design, interaction patterns, cosmetic UX
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 14 Task 14.6
 */
export function checkSemanticOwnershipViolation(
  pageId: string,
  computedSemantics: string[]
): GuardViolationResult {
  const violations: string[] = [];

  // Backend-owned semantic computations that are forbidden on frontend
  const backendOwnedSemantics = [
    // Lineage semantics
    'newer_source_exists',
    'source_continuity',
    'lineage_confidence_score',
    'canonical_identity',
    'revision_ordering',
    // Warning precedence
    'warning_precedence',
    'warning_severity',
    'warning_ranking',
    'presentation_warning_order',
    // Candidate scoring
    'candidate_score',
    'confidence_score',
    'relationship_ranking',
    'candidate_match_strength',
    // Search ranking
    'search_ranking',
    'relevance_score',
    'match_score',
    // Comment state
    'sync_state_derivation',
    'thread_ordering',
    'resolution_decision',
  ];

  const violatingComputations = computedSemantics.filter((semantic) =>
    backendOwnedSemantics.some(
      (owned) => semantic === owned || semantic.includes(owned)
    )
  );

  if (violatingComputations.length > 0) {
    violations.push(
      `Page "${pageId}" computes backend-owned semantics client-side: ` +
        `[${violatingComputations.join(', ')}]. ` +
        `Backend owns all lineage semantics, warning precedence, source continuity, and search ranking. ` +
        `Frontend owns only presentation (visual design, interaction patterns, cosmetic UX).`
    );
  }

  return {
    violated: violations.length > 0,
    violations,
    guardName: 'checkSemanticOwnershipViolation',
  };
}

/**
 * Run all Phase 14 architectural guards for a source-management page.
 * This is the primary enforcement point for Version 2 landing-zone composition rules.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 14 Task 14.6
 */
export function runPhase14PageGuards(config: Phase14PageGuardConfig): PageGuardResult {
  // First run Phase 13 guards (which include base guards)
  const phase13Result = runPhase13PageGuards(config);
  const results = [...phase13Result.results];

  // Check contract module consumption
  if (config.importSources && config.enforceContractModules !== false) {
    const moduleResult = checkContractModuleConsumptionViolation(
      config.pageId,
      config.importSources
    );
    if (moduleResult.violated) {
      results.push(moduleResult);
      enforceGuardViolation(moduleResult);
    }
  }

  // Check raw Google field access
  if (config.rawFieldAccesses) {
    const googleFieldResult = checkRawGoogleFieldAccessViolation(config.pageId, config.rawFieldAccesses);
    if (googleFieldResult.violated) {
      results.push(googleFieldResult);
      enforceGuardViolation(googleFieldResult);
    }
  }

  // Check canonical contract family
  if (config.usedContracts) {
    const familyResult = checkCanonicalContractFamilyViolation(
      config.pageId,
      config.usedContracts
    );
    if (familyResult.violated) {
      results.push(familyResult);
      enforceGuardViolation(familyResult);
    }
  }

  // Check semantic ownership
  if (config.computedFields) {
    const semanticResult = checkSemanticOwnershipViolation(
      config.pageId,
      config.computedFields
    );
    if (semanticResult.violated) {
      results.push(semanticResult);
      enforceGuardViolation(semanticResult);
    }
  }

  const violated = results.some((r) => r.violated);
  const violationCount = results.filter((r) => r.violated).length;
  const summary = violated
    ? `Page "${config.pageId}" has ${violationCount} architectural violations (Phase 14 checks)`
    : `Page "${config.pageId}" passes all architectural guards (Phase 14 checks)`;

  return {
    violated,
    results,
    summary,
  };
}

/**
 * Assert that page passes all Phase 14 guards.
 * Useful for unit tests validating Version 2 landing-zone compliance.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 14 Task 14.6
 */
export function assertPhase14PageGuards(config: Phase14PageGuardConfig): void {
  const result = runPhase14PageGuards(config);
  if (result.violated) {
    logGuardResults(result);
    throw new Error(result.summary);
  }
}

// ============================================================================
// Phase 14 Guard Test Utilities (Task 14.6)
// ============================================================================

/**
 * Test helper: Create a page config that passes all Phase 14 guards.
 */
export function createPassingPhase14PageConfig(pageId: string): Phase14PageGuardConfig {
  return {
    pageId,
    dependencies: [],
    usedContracts: [],
    usedAdapters: ['source-management-adapters'],
    computedFields: [],
    fetchedEndpoints: [],
    searchContracts: [],
    commentContracts: [],
    searchFieldsAccessed: [],
    commentFieldsAccessed: [],
    importSources: [
      './lineage-contracts.js',
      './source-management-adapters.js',
      './source-management-pages.js',
      './source-management-rendering-states.js',
    ],
    rawFieldAccesses: [],
    enforceContractModules: true,
  };
}

/**
 * Build the canonical Phase 14 guard configuration for a Version 2 surface.
 */
export function createPhase14SurfacePageConfig(
  surface: Phase14GuardSurface,
  contract: unknown
): Phase14PageGuardConfig {
  const endpoint = getContractSelfLink(contract) ?? PHASE_14_SURFACE_ENDPOINT_FALLBACKS[surface];
  const baseConfig: Phase14PageGuardConfig = {
    ...createPassingPhase14PageConfig(PHASE_14_SURFACE_PAGE_IDS[surface]),
    dependencies: [contract],
    fetchedEndpoints: [endpoint],
  };

  switch (surface) {
    case 'source_list':
      return {
        ...baseConfig,
        usedContracts: ['SourceListPage'],
      };
    case 'source_detail':
      return {
        ...baseConfig,
        usedContracts: ['SourceDetail'],
      };
    case 'revision_history':
      return {
        ...baseConfig,
        usedContracts: ['SourceRevisionPage'],
      };
    case 'relationship_summaries':
      return {
        ...baseConfig,
        usedContracts: ['SourceRelationshipPage'],
      };
    case 'search':
      return {
        ...baseConfig,
        usedContracts: ['Phase13SourceSearchResults'],
        searchContracts: [contract],
        searchFieldsAccessed: [
          'comment_sync_status',
          'has_comments',
          'relationship_state',
          'comment_count',
        ],
      };
    case 'source_comment':
      return {
        ...baseConfig,
        usedContracts: ['Phase13SourceCommentPage'],
        commentContracts: [contract],
        commentFieldsAccessed: ['sync', 'messages', 'author', 'last_activity_at'],
      };
  }
}

/**
 * Test helper: Create a page config that violates contract module consumption.
 */
export function createModuleViolationConfig(pageId: string): Phase14PageGuardConfig {
  return {
    ...createPassingPhase14PageConfig(pageId),
    importSources: [
      './lineage-contracts.js',
      './some-custom-lineage-module.js', // Violation: non-approved module
      '../esign/internal-google-api.js', // Violation: non-approved module
    ],
  };
}

/**
 * Test helper: Create a page config that violates raw Google field access.
 */
export function createGoogleFieldViolationConfig(pageId: string): Phase14PageGuardConfig {
  return {
    ...createPassingPhase14PageConfig(pageId),
    rawFieldAccesses: [
      'htmlContent', // Violation
      'quotedFileContent', // Violation
      'google_user_id', // Violation
    ],
  };
}

/**
 * Test helper: Create a page config that violates canonical contract family rule.
 */
export function createMultipleContractFamilyViolationConfig(
  pageId: string
): Phase14PageGuardConfig {
  return {
    ...createPassingPhase14PageConfig(pageId),
    usedContracts: [
      'SourceListPage',
      'SourceDetail', // Violation: multiple canonical families
      'SourceRevisionPage', // Violation: multiple canonical families
    ],
  };
}

/**
 * Test helper: Create a page config that violates semantic ownership.
 */
export function createSemanticOwnershipViolationConfig(
  pageId: string
): Phase14PageGuardConfig {
  return {
    ...createPassingPhase14PageConfig(pageId),
    computedFields: [
      'newer_source_exists', // Violation: backend-owned
      'candidate_score', // Violation: backend-owned
      'search_ranking', // Violation: backend-owned
    ],
  };
}

/**
 * Phase 14 architectural invariants for guard validation.
 * These are the canonical rules that guards enforce.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 14 Task 14.6
 */
export const PHASE_14_ARCHITECTURAL_INVARIANTS = {
  version: 2,
  phase: 14,
  enforcementLevel: 'strict',

  // Core ownership boundaries
  backendOwns: [
    'lineage_semantics',
    'warning_precedence',
    'source_continuity',
    'search_ranking',
    'candidate_scoring',
    'revision_ordering',
    'sync_state_derivation',
    'canonical_identity',
  ],
  frontendOwns: [
    'visual_design',
    'interaction_patterns',
    'cosmetic_ux',
    'accessibility_labels',
    'loading_indicators',
    'error_messages',
    'empty_state_presentation',
  ],

  // Contract module rules
  approvedModules: PHASE_14_APPROVED_CONTRACT_MODULES,
  forbiddenGoogleFields: FORBIDDEN_RAW_GOOGLE_FIELDS,
  approvedGoogleAdapters: APPROVED_GOOGLE_ADAPTER_BOUNDARIES,

  // Composition rules
  pageRules: [
    'Each page attaches to exactly ONE canonical contract family',
    'Pages consume contracts through approved modules only',
    'Pages must NOT access raw Google-specific fields outside adapters',
    'Pages must NOT compute backend-owned semantics client-side',
    'Pages must NOT mix source-management with provenance payloads',
    'Visual implementation begins only after contract family is attached',
  ],

  // Guard sequence
  guardSequence: [
    'checkCompositionBoundaryViolation',
    'checkAdapterBoundaryViolation',
    'checkSemanticComputationViolation',
    'checkEndpointStitchingViolation',
    'checkSourceCommentMixingViolation',
    'checkGoogleProviderPayloadViolation',
    'checkSearchContractViolation',
    'checkCommentContractViolation',
    'checkContractModuleConsumptionViolation',
    'checkRawGoogleFieldAccessViolation',
    'checkCanonicalContractFamilyViolation',
    'checkSemanticOwnershipViolation',
  ],
} as const;
