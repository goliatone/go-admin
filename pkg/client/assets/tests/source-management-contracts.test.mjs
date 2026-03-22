/**
 * Source-Management Contract Snapshot Tests
 *
 * Lock DTO shape expectations for source-management contracts before template-level work begins.
 * These tests ensure frontend types match backend-owned contracts.
 *
 * CRITICAL RULES:
 * 1. Snapshot tests must fail when backend contracts change
 * 2. Do not modify snapshots without reviewing backend contract changes
 * 3. Update fixtures when backend contracts change
 * 4. All contract states must have snapshot coverage
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 11 Task 11.10
 * @see examples/esign/services/lineage_contracts.go (backend source of truth)
 */

import { describe, it, expect } from 'vitest';
import {
  SOURCE_LIST_EMPTY,
  SOURCE_LIST_SINGLE,
  SOURCE_DETAIL_REPEATED,
  SOURCE_DETAIL_MERGED,
  SOURCE_DETAIL_ARCHIVED,
  SOURCE_REVISIONS_REPEATED,
  SOURCE_RELATIONSHIPS_REVIEW,
  PHASE_11_FIXTURES,
} from '../src/esign/source-management-fixtures.ts';

import {
  adaptSourceListItem,
  adaptSourceDetail,
  adaptSourceRevisionListItem,
  adaptSourceRelationshipSummary,
  adaptSourceListPage,
  adaptSourceRevisionPage,
  adaptSourceRelationshipPage,
  adaptPaginationInfo,
  adaptEmptyState,
} from '../src/esign/source-management-adapters.ts';

describe('Source-Management Contract Shape Tests', () => {
  describe('Source List Contracts', () => {
    it('should match snapshot for empty source list', () => {
      expect(SOURCE_LIST_EMPTY).toMatchSnapshot();
    });

    it('should match snapshot for single source list', () => {
      expect(SOURCE_LIST_SINGLE).toMatchSnapshot();
    });

    it('should have required fields in SourceListPage', () => {
      expect(SOURCE_LIST_SINGLE).toHaveProperty('items');
      expect(SOURCE_LIST_SINGLE).toHaveProperty('page_info');
      expect(SOURCE_LIST_SINGLE).toHaveProperty('applied_query');
      expect(SOURCE_LIST_SINGLE).toHaveProperty('permissions');
      expect(SOURCE_LIST_SINGLE).toHaveProperty('empty_state');
      expect(SOURCE_LIST_SINGLE).toHaveProperty('links');
    });

    it('should have required fields in SourceListItem', () => {
      const item = SOURCE_LIST_SINGLE.items[0];
      expect(item).toHaveProperty('source');
      expect(item).toHaveProperty('status');
      expect(item).toHaveProperty('lineage_confidence');
      expect(item).toHaveProperty('provider');
      expect(item).toHaveProperty('latest_revision');
      expect(item).toHaveProperty('active_handle');
      expect(item).toHaveProperty('revision_count');
      expect(item).toHaveProperty('handle_count');
      expect(item).toHaveProperty('relationship_count');
      expect(item).toHaveProperty('pending_candidate_count');
      expect(item).toHaveProperty('permissions');
      expect(item).toHaveProperty('links');
    });
  });

  describe('Source Detail Contracts', () => {
    it('should match snapshot for repeated source detail', () => {
      expect(SOURCE_DETAIL_REPEATED).toMatchSnapshot();
    });

    it('should match snapshot for merged source detail', () => {
      expect(SOURCE_DETAIL_MERGED).toMatchSnapshot();
    });

    it('should match snapshot for archived source detail', () => {
      expect(SOURCE_DETAIL_ARCHIVED).toMatchSnapshot();
    });

    it('should have required fields in SourceDetail', () => {
      expect(SOURCE_DETAIL_REPEATED).toHaveProperty('source');
      expect(SOURCE_DETAIL_REPEATED).toHaveProperty('status');
      expect(SOURCE_DETAIL_REPEATED).toHaveProperty('lineage_confidence');
      expect(SOURCE_DETAIL_REPEATED).toHaveProperty('provider');
      expect(SOURCE_DETAIL_REPEATED).toHaveProperty('active_handle');
      expect(SOURCE_DETAIL_REPEATED).toHaveProperty('latest_revision');
      expect(SOURCE_DETAIL_REPEATED).toHaveProperty('revision_count');
      expect(SOURCE_DETAIL_REPEATED).toHaveProperty('handle_count');
      expect(SOURCE_DETAIL_REPEATED).toHaveProperty('relationship_count');
      expect(SOURCE_DETAIL_REPEATED).toHaveProperty('pending_candidate_count');
      expect(SOURCE_DETAIL_REPEATED).toHaveProperty('permissions');
      expect(SOURCE_DETAIL_REPEATED).toHaveProperty('links');
      expect(SOURCE_DETAIL_REPEATED).toHaveProperty('empty_state');
    });
  });

  describe('Source Revision Page Contracts', () => {
    it('should match snapshot for repeated revisions', () => {
      expect(SOURCE_REVISIONS_REPEATED).toMatchSnapshot();
    });

    it('should have required fields in SourceRevisionPage', () => {
      expect(SOURCE_REVISIONS_REPEATED).toHaveProperty('source');
      expect(SOURCE_REVISIONS_REPEATED).toHaveProperty('items');
      expect(SOURCE_REVISIONS_REPEATED).toHaveProperty('page_info');
      expect(SOURCE_REVISIONS_REPEATED).toHaveProperty('applied_query');
      expect(SOURCE_REVISIONS_REPEATED).toHaveProperty('permissions');
      expect(SOURCE_REVISIONS_REPEATED).toHaveProperty('empty_state');
      expect(SOURCE_REVISIONS_REPEATED).toHaveProperty('links');
    });

    it('should have required fields in SourceRevisionListItem', () => {
      const item = SOURCE_REVISIONS_REPEATED.items[0];
      expect(item).toHaveProperty('revision');
      expect(item).toHaveProperty('provider');
      expect(item).toHaveProperty('primary_artifact');
      expect(item).toHaveProperty('fingerprint_status');
      expect(item).toHaveProperty('fingerprint_processing');
      expect(item).toHaveProperty('is_latest');
      expect(item).toHaveProperty('links');
    });

    it('should have required fields in FingerprintProcessingSummary', () => {
      const processing = SOURCE_REVISIONS_REPEATED.items[0].fingerprint_processing;
      expect(processing).toHaveProperty('state');
      expect(processing).toHaveProperty('attempt_count');
      expect(processing).toHaveProperty('retryable');
      expect(processing).toHaveProperty('stale');
    });
  });

  describe('Source Relationship Page Contracts', () => {
    it('should match snapshot for relationships with pending review', () => {
      expect(SOURCE_RELATIONSHIPS_REVIEW).toMatchSnapshot();
    });

    it('should have required fields in SourceRelationshipPage', () => {
      expect(SOURCE_RELATIONSHIPS_REVIEW).toHaveProperty('source');
      expect(SOURCE_RELATIONSHIPS_REVIEW).toHaveProperty('items');
      expect(SOURCE_RELATIONSHIPS_REVIEW).toHaveProperty('page_info');
      expect(SOURCE_RELATIONSHIPS_REVIEW).toHaveProperty('applied_query');
      expect(SOURCE_RELATIONSHIPS_REVIEW).toHaveProperty('permissions');
      expect(SOURCE_RELATIONSHIPS_REVIEW).toHaveProperty('empty_state');
      expect(SOURCE_RELATIONSHIPS_REVIEW).toHaveProperty('links');
    });

    it('should have required fields in SourceRelationshipSummary', () => {
      const item = SOURCE_RELATIONSHIPS_REVIEW.items[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('relationship_type');
      expect(item).toHaveProperty('status');
      expect(item).toHaveProperty('confidence_band');
      expect(item).toHaveProperty('summary');
      expect(item).toHaveProperty('counterpart_source');
      expect(item).toHaveProperty('evidence');
      expect(item).toHaveProperty('review_action_visible');
      expect(item).toHaveProperty('links');
    });
  });

  describe('Phase 11 Complete Fixture Bundle', () => {
    it('should match snapshot for complete Phase 11 fixtures', () => {
      expect(PHASE_11_FIXTURES).toMatchSnapshot();
    });

    it('should have all required fixture states', () => {
      expect(PHASE_11_FIXTURES.states).toHaveProperty('source_list_empty');
      expect(PHASE_11_FIXTURES.states).toHaveProperty('source_list_single');
      expect(PHASE_11_FIXTURES.states).toHaveProperty('source_detail_repeated');
      expect(PHASE_11_FIXTURES.states).toHaveProperty('source_handles_multi');
      expect(PHASE_11_FIXTURES.states).toHaveProperty('source_revisions_repeated');
      expect(PHASE_11_FIXTURES.states).toHaveProperty('source_relationships_review');
      expect(PHASE_11_FIXTURES.states).toHaveProperty('source_revision_detail');
      expect(PHASE_11_FIXTURES.states).toHaveProperty('source_artifacts');
      expect(PHASE_11_FIXTURES.states).toHaveProperty('source_comments_empty');
      expect(PHASE_11_FIXTURES.states).toHaveProperty('source_search_results');
      expect(PHASE_11_FIXTURES.states).toHaveProperty('source_detail_merged');
      expect(PHASE_11_FIXTURES.states).toHaveProperty('source_detail_archived');
    });

    it('should have contract rules', () => {
      expect(PHASE_11_FIXTURES).toHaveProperty('rules');
      expect(PHASE_11_FIXTURES.rules).toHaveProperty('frontend_presentation_only', true);
      expect(PHASE_11_FIXTURES.rules).toHaveProperty('pagination_mode');
      expect(PHASE_11_FIXTURES.rules).toHaveProperty('supported_source_sorts');
      expect(PHASE_11_FIXTURES.rules.supported_source_sorts).toBeInstanceOf(Array);
    });
  });
});

describe('Source-Management Presentation Adapter Tests', () => {
  describe('adaptSourceListItem', () => {
    it('should adapt source list item without data loss', () => {
      const item = SOURCE_LIST_SINGLE.items[0];
      const adapted = adaptSourceListItem(item);

      expect(adapted).toMatchSnapshot();
      expect(adapted.id).toBe(item.source?.id);
      expect(adapted.status).toBe(item.status);
      expect(adapted.revisionCount).toBe(item.revision_count);
    });

    it('should handle null provider gracefully', () => {
      const itemWithNullProvider = {
        ...SOURCE_LIST_SINGLE.items[0],
        provider: null,
      };
      const adapted = adaptSourceListItem(itemWithNullProvider);

      expect(adapted.providerKind).toBe('');
      expect(adapted.providerLabel).toBe('');
      expect(adapted.externalFileId).toBe('');
      expect(adapted.webUrl).toBe('');
    });
  });

  describe('adaptSourceDetail', () => {
    it('should adapt source detail without data loss', () => {
      const adapted = adaptSourceDetail(SOURCE_DETAIL_REPEATED);

      expect(adapted).toMatchSnapshot();
      expect(adapted.id).toBe(SOURCE_DETAIL_REPEATED.source?.id);
      expect(adapted.revisionCount).toBe(SOURCE_DETAIL_REPEATED.revision_count);
      expect(adapted.hasPendingCandidates).toBe(false);
    });

    it('should detect empty state correctly', () => {
      const emptyDetail = {
        ...SOURCE_DETAIL_REPEATED,
        empty_state: {
          kind: 'no_source',
          title: 'No source found',
          description: 'Source not found in lineage system.',
        },
      };
      const adapted = adaptSourceDetail(emptyDetail);

      expect(adapted.isEmpty).toBe(true);
      expect(adapted.emptyStateKind).toBe('no_source');
    });
  });

  describe('adaptSourceRevisionListItem', () => {
    it('should adapt revision list item without data loss', () => {
      const item = SOURCE_REVISIONS_REPEATED.items[0];
      const adapted = adaptSourceRevisionListItem(item);

      expect(adapted).toMatchSnapshot();
      expect(adapted.id).toBe(item.revision?.id);
      expect(adapted.isLatest).toBe(item.is_latest);
      expect(adapted.fingerprintStatus).toBe(item.fingerprint_status.status);
    });

    it('should format fingerprint processing state labels', () => {
      const item = SOURCE_REVISIONS_REPEATED.items[0];
      const adapted = adaptSourceRevisionListItem(item);

      expect(adapted.fingerprintProcessingLabel).toBe('Ready');
      expect(adapted.fingerprintStatusLabel).toBe('Ready');
    });
  });

  describe('adaptSourceRelationshipSummary', () => {
    it('should adapt relationship summary without data loss', () => {
      const item = SOURCE_RELATIONSHIPS_REVIEW.items[0];
      const adapted = adaptSourceRelationshipSummary(item);

      expect(adapted).toMatchSnapshot();
      expect(adapted.id).toBe(item.id);
      expect(adapted.relationshipType).toBe(item.relationship_type);
      expect(adapted.evidenceCount).toBe(item.evidence.length);
      expect(adapted.canReview).toBe(true);
    });

    it('should extract evidence labels correctly', () => {
      const item = SOURCE_RELATIONSHIPS_REVIEW.items[0];
      const adapted = adaptSourceRelationshipSummary(item);

      expect(adapted.evidenceLabels).toEqual(['Title similarity', 'Text overlap']);
    });
  });

  describe('adaptPaginationInfo', () => {
    it('should compute pagination values correctly', () => {
      const pageInfo = SOURCE_LIST_SINGLE.page_info;
      const adapted = adaptPaginationInfo(pageInfo);

      expect(adapted).toMatchSnapshot();
      expect(adapted.currentPage).toBe(1);
      expect(adapted.totalPages).toBe(1);
      expect(adapted.hasPrevious).toBe(false);
      expect(adapted.hasMore).toBe(false);
    });

    it('should compute item ranges correctly', () => {
      const pageInfo = {
        ...SOURCE_LIST_SINGLE.page_info,
        page: 2,
        total_count: 45,
      };
      const adapted = adaptPaginationInfo(pageInfo);

      expect(adapted.firstItemIndex).toBe(21);
      expect(adapted.lastItemIndex).toBe(40);
      expect(adapted.hasPrevious).toBe(true);
    });
  });

  describe('adaptEmptyState', () => {
    it('should detect empty state correctly', () => {
      const emptyState = {
        kind: 'no_results',
        title: 'No results found',
        description: 'No sources match your query.',
      };
      const adapted = adaptEmptyState(emptyState);

      expect(adapted.isEmpty).toBe(true);
      expect(adapted.kind).toBe('no_results');
    });

    it('should detect non-empty state correctly', () => {
      const nonEmptyState = {
        kind: 'none',
      };
      const adapted = adaptEmptyState(nonEmptyState);

      expect(adapted.isEmpty).toBe(false);
      expect(adapted.kind).toBe('none');
    });
  });

  describe('Complete Page Adaptation', () => {
    it('should adapt complete source list page', () => {
      const adapted = adaptSourceListPage(SOURCE_LIST_SINGLE);

      expect(adapted).toMatchSnapshot();
      expect(adapted.items).toHaveLength(1);
      expect(adapted.pagination).toHaveProperty('currentPage', 1);
      expect(adapted.emptyState.isEmpty).toBe(false);
    });

    it('should adapt complete source revision page', () => {
      const adapted = adaptSourceRevisionPage(SOURCE_REVISIONS_REPEATED);

      expect(adapted).toMatchSnapshot();
      expect(adapted.items).toHaveLength(2);
      expect(adapted.source.id).toBe('src_01HX5ZCQK0ABC123');
    });

    it('should adapt complete source relationship page', () => {
      const adapted = adaptSourceRelationshipPage(SOURCE_RELATIONSHIPS_REVIEW);

      expect(adapted).toMatchSnapshot();
      expect(adapted.items).toHaveLength(1);
      expect(adapted.items[0].canReview).toBe(true);
    });
  });
});

describe('Contract Stability Guards', () => {
  it('should detect if SourceListItem shape changes', () => {
    const expectedKeys = [
      'source',
      'status',
      'lineage_confidence',
      'provider',
      'latest_revision',
      'active_handle',
      'revision_count',
      'handle_count',
      'relationship_count',
      'pending_candidate_count',
      'permissions',
      'links',
    ];

    const actualKeys = Object.keys(SOURCE_LIST_SINGLE.items[0]).sort();
    expect(actualKeys).toEqual(expectedKeys.sort());
  });

  it('should detect if SourceDetail shape changes', () => {
    const expectedKeys = [
      'source',
      'status',
      'lineage_confidence',
      'provider',
      'active_handle',
      'latest_revision',
      'revision_count',
      'handle_count',
      'relationship_count',
      'pending_candidate_count',
      'permissions',
      'links',
      'empty_state',
    ];

    const actualKeys = Object.keys(SOURCE_DETAIL_REPEATED).sort();
    expect(actualKeys).toEqual(expectedKeys.sort());
  });

  it('should detect if FingerprintProcessingSummary shape changes', () => {
    const expectedKeys = ['state', 'status_label', 'completed_at', 'attempt_count', 'retryable', 'stale'];

    const processing = SOURCE_REVISIONS_REPEATED.items[0].fingerprint_processing;
    const actualKeys = Object.keys(processing).sort();
    expect(actualKeys).toEqual(expectedKeys.sort());
  });
});
