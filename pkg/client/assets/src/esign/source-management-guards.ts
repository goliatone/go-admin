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

  // Check for SourceListPage
  if ('items' in record && 'page_info' in record && 'applied_query' in record) {
    const items = record.items;
    if (Array.isArray(items) && items.length > 0) {
      const firstItem = items[0] as Record<string, unknown>;
      if ('source' in firstItem && 'provider' in firstItem && 'revision_count' in firstItem) {
        return true;
      }
    }
    return true; // Empty SourceListPage
  }

  // Check for SourceDetail
  if (
    'source' in record &&
    'provider' in record &&
    'revision_count' in record &&
    'handle_count' in record
  ) {
    return true;
  }

  // Check for SourceRevisionPage
  if ('source' in record && 'items' in record) {
    const items = record.items;
    if (Array.isArray(items) && items.length > 0) {
      const firstItem = items[0] as Record<string, unknown>;
      if ('revision' in firstItem && 'fingerprint_status' in firstItem && 'is_latest' in firstItem) {
        return true;
      }
    }
    return true; // Empty SourceRevisionPage
  }

  return false;
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

  // Source-management pages should consume exactly ONE endpoint family
  const sourceManagementEndpoints = [
    '/sources',
    '/sources/:id',
    '/sources/:id/revisions',
    '/sources/:id/relationships',
    '/sources/:id/handles',
    '/source-revisions/:id',
    '/source-revisions/:id/artifacts',
    '/source-revisions/:id/comments',
    '/source-search',
  ];

  const otherEndpoints = fetchedEndpoints.filter(
    (endpoint) =>
      !sourceManagementEndpoints.some((sm) => endpoint.includes(sm)) &&
      !endpoint.includes('/diagnostics')
  );

  if (otherEndpoints.length > 0) {
    violations.push(
      `Page "${pageId}" fetches from non-source-management endpoints: [${otherEndpoints.join(', ')}]. ` +
        `Source-management pages must consume one source-management endpoint family only.`
    );
  }

  // Detect if multiple unrelated source-management endpoints are being stitched
  const normalizedEndpoints = fetchedEndpoints.map((endpoint) => {
    if (endpoint.includes('/sources/') && endpoint.includes('/revisions')) return 'source-revisions';
    if (endpoint.includes('/sources/') && endpoint.includes('/relationships'))
      return 'source-relationships';
    if (endpoint.includes('/sources/') && endpoint.includes('/handles')) return 'source-handles';
    if (endpoint.includes('/sources/')) return 'source-detail';
    if (endpoint.includes('/sources')) return 'source-list';
    if (endpoint.includes('/source-revisions/')) return 'source-revision-detail';
    return 'unknown';
  });

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
