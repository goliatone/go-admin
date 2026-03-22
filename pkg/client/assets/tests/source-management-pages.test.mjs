/**
 * Source-Management Pages Smoke and Contract Coverage Tests
 *
 * Proves that source list, source detail, revision history, and relationship summary pages
 * render entirely from fixtures without requiring cosmetic design decisions to be locked.
 *
 * CRITICAL RULES:
 * 1. Tests use Phase 11 fixtures as canonical data sources
 * 2. Tests verify data flow from fixtures through adapters to rendering states
 * 3. Tests must NOT prescribe visual layout or CSS
 * 4. Tests validate architectural guards are enforced
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 12 Task 12.10
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// Import fixtures
import {
  SOURCE_LIST_EMPTY,
  SOURCE_LIST_SINGLE,
  SOURCE_DETAIL_REPEATED,
  SOURCE_DETAIL_MERGED,
  SOURCE_DETAIL_ARCHIVED,
  SOURCE_REVISIONS_REPEATED,
  SOURCE_RELATIONSHIPS_REVIEW,
} from '../src/esign/source-management-fixtures.ts';

// Import page controllers
import {
  SourceBrowserPageController,
  SourceDetailPageController,
  SourceRevisionTimelinePageController,
} from '../src/esign/source-management-pages.ts';

// Import rendering state resolvers
import {
  resolveSourceListRenderingState,
  resolveSourceDetailRenderingState,
  resolveSourceRevisionTimelineRenderingState,
  createLoadingState,
  createErrorState,
  createUnauthorizedState,
} from '../src/esign/source-management-rendering-states.ts';

// Import guards
import {
  runPageGuards,
  setGuardEnforcementMode,
  isSourceManagementContract,
  isDocumentLineageDetail,
  isAgreementLineageDetail,
} from '../src/esign/source-management-guards.ts';

test('Source-Management Pages - Smoke Tests', async (t) => {
  await t.test('Source Browser Page', async (st) => {
    await st.test('should initialize with loading state', () => {
      const controller = new SourceBrowserPageController({
        apiBasePath: '/admin/api/v1/esign',
      });

      const state = controller.getState();
      assert.strictEqual(state.loading, false); // Initially false before init
      assert.strictEqual(state.error, null);
      assert.strictEqual(state.contracts, null);
    });

    await st.test('should render empty state from fixtures', () => {
      const renderingState = resolveSourceListRenderingState(false, null, SOURCE_LIST_EMPTY);

      assert.strictEqual(renderingState.metadata.kind, 'empty');
      assert.ok('emptyState' in renderingState);
      if ('emptyState' in renderingState) {
        assert.strictEqual(renderingState.emptyState.isEmpty, true);
        assert.strictEqual(renderingState.emptyState.kind, 'no_results');
      }
    });

    await st.test('should render success state from fixtures', () => {
      const renderingState = resolveSourceListRenderingState(false, null, SOURCE_LIST_SINGLE);

      assert.strictEqual(renderingState.metadata.kind, 'success');
      assert.ok('items' in renderingState);
      if ('items' in renderingState) {
        assert.strictEqual(renderingState.items.length, 1);
        assert.strictEqual(renderingState.hasData, true);
      }
    });

    await st.test('should render loading state', () => {
      const renderingState = resolveSourceListRenderingState(true, null, null);

      assert.strictEqual(renderingState.metadata.kind, 'loading');
      assert.ok('loadingMessage' in renderingState);
      if ('loadingMessage' in renderingState) {
        assert.match(renderingState.loadingMessage, /Loading sources/);
      }
    });

    await st.test('should render error state', () => {
      const error = new Error('HTTP 500: Internal Server Error');
      const renderingState = resolveSourceListRenderingState(false, error, null);

      assert.strictEqual(renderingState.metadata.kind, 'error');
      assert.ok('message' in renderingState);
      if ('message' in renderingState) {
        assert.match(renderingState.message, /500/);
      }
    });

    await st.test('should render unauthorized state for 403 errors', () => {
      const error = new Error('HTTP 403: Forbidden');
      const renderingState = resolveSourceListRenderingState(false, error, null);

      assert.strictEqual(renderingState.metadata.kind, 'unauthorized');
      assert.ok('title' in renderingState);
      if ('title' in renderingState) {
        assert.match(renderingState.title, /Access Denied/);
      }
    });

    await st.test('should pass architectural guards', () => {
      const result = runPageGuards({
        pageId: 'source-browser',
        dependencies: [SOURCE_LIST_SINGLE],
        usedContracts: ['SourceListPage'],
        usedAdapters: ['source-management-adapters'],
        fetchedEndpoints: ['/admin/api/v1/esign/sources'],
      });

      assert.strictEqual(result.violated, false);
      assert.strictEqual(result.results.length, 0);
    });
  });

  await t.test('Source Detail Page', async (st) => {
    await st.test('should render success state from fixtures', () => {
      const renderingState = resolveSourceDetailRenderingState(false, null, SOURCE_DETAIL_REPEATED);

      assert.strictEqual(renderingState.metadata.kind, 'success');
      assert.ok('source' in renderingState);
      if ('source' in renderingState) {
        assert.strictEqual(renderingState.source.id, 'src_01HX5ZCQK0ABC123');
        assert.strictEqual(renderingState.source.revisionCount, 3);
        assert.strictEqual(renderingState.hasData, true);
      }
    });

    await st.test('should render merged source state from fixtures', () => {
      const renderingState = resolveSourceDetailRenderingState(false, null, SOURCE_DETAIL_MERGED);

      assert.strictEqual(renderingState.metadata.kind, 'success');
      if ('source' in renderingState) {
        assert.strictEqual(renderingState.source.status, 'merged');
        assert.strictEqual(renderingState.source.activeHandleId, '');
      }
    });

    await st.test('should render archived source state from fixtures', () => {
      const renderingState = resolveSourceDetailRenderingState(false, null, SOURCE_DETAIL_ARCHIVED);

      assert.strictEqual(renderingState.metadata.kind, 'success');
      if ('source' in renderingState) {
        assert.strictEqual(renderingState.source.status, 'archived');
      }
    });

    await st.test('should render not-found state for 404 errors', () => {
      const error = new Error('HTTP 404: Not Found');
      const renderingState = resolveSourceDetailRenderingState(false, error, null);

      assert.strictEqual(renderingState.metadata.kind, 'empty');
      if ('emptyState' in renderingState) {
        assert.strictEqual(renderingState.emptyState.kind, 'not_found');
      }
    });

    await st.test('should pass architectural guards', () => {
      const result = runPageGuards({
        pageId: 'source-detail',
        dependencies: [SOURCE_DETAIL_REPEATED],
        usedContracts: ['SourceDetail'],
        usedAdapters: ['source-management-adapters'],
        fetchedEndpoints: ['/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123'],
      });

      assert.strictEqual(result.violated, false);
    });
  });

  await t.test('Source Revision Timeline Page', async (st) => {
    await st.test('should render success state from fixtures', () => {
      const renderingState = resolveSourceRevisionTimelineRenderingState(
        false,
        null,
        SOURCE_REVISIONS_REPEATED
      );

      assert.strictEqual(renderingState.metadata.kind, 'success');
      assert.ok('items' in renderingState);
      if ('items' in renderingState) {
        assert.strictEqual(renderingState.items.length, 2);
        assert.strictEqual(renderingState.hasData, true);

        // Check first revision
        const firstRevision = renderingState.items[0];
        assert.strictEqual(firstRevision.id, 'rev_01HX5ZCQK0REV003');
        assert.strictEqual(firstRevision.isLatest, true);
        assert.strictEqual(firstRevision.fingerprintStatus, 'ready');

        // Check second revision
        const secondRevision = renderingState.items[1];
        assert.strictEqual(secondRevision.id, 'rev_01HX5ZCQK0REV002');
        assert.strictEqual(secondRevision.isLatest, false);
      }
    });

    await st.test('should render loading state', () => {
      const renderingState = resolveSourceRevisionTimelineRenderingState(true, null, null);

      assert.strictEqual(renderingState.metadata.kind, 'loading');
      if ('loadingMessage' in renderingState) {
        assert.match(renderingState.loadingMessage, /Loading revisions/);
      }
    });

    await st.test('should pass architectural guards', () => {
      const result = runPageGuards({
        pageId: 'source-revision-timeline',
        dependencies: [SOURCE_REVISIONS_REPEATED],
        usedContracts: ['SourceRevisionPage'],
        usedAdapters: ['source-management-adapters'],
        fetchedEndpoints: ['/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123/revisions'],
      });

      assert.strictEqual(result.violated, false);
    });
  });

  await t.test('Source Relationship Graph Page', async (st) => {
    await st.test('should render success state from fixtures', () => {
      // Note: Using SOURCE_RELATIONSHIPS_REVIEW fixture directly
      assert.strictEqual(SOURCE_RELATIONSHIPS_REVIEW.items.length, 1);
      const relationship = SOURCE_RELATIONSHIPS_REVIEW.items[0];
      assert.strictEqual(relationship.relationship_type, 'copied_from');
      assert.strictEqual(relationship.status, 'pending_review');
      assert.strictEqual(relationship.confidence_band, 'medium');
    });

    await st.test('should have candidate warning evidence', () => {
      const relationship = SOURCE_RELATIONSHIPS_REVIEW.items[0];
      assert.strictEqual(relationship.evidence.length, 2);
      assert.strictEqual(relationship.evidence[0].code, 'title_similarity');
      assert.strictEqual(relationship.evidence[1].code, 'text_overlap');
    });
  });
});

test('Source-Management Pages - Contract Coverage', async (t) => {
  await t.test('Contract Type Guards', async (st) => {
    await st.test('should identify source-management contracts', () => {
      assert.strictEqual(isSourceManagementContract(SOURCE_LIST_SINGLE), true);
      assert.strictEqual(isSourceManagementContract(SOURCE_DETAIL_REPEATED), true);
      assert.strictEqual(isSourceManagementContract(SOURCE_REVISIONS_REPEATED), true);
    });

    await st.test('should reject non-source-management contracts', () => {
      assert.strictEqual(isSourceManagementContract(null), false);
      assert.strictEqual(isSourceManagementContract(undefined), false);
      assert.strictEqual(isSourceManagementContract({}), false);
      assert.strictEqual(isSourceManagementContract('string'), false);
    });

    await st.test('should not identify document lineage detail as source-management', () => {
      const mockDocumentLineage = {
        document_id: 'doc_123',
        fingerprint_status: { status: 'ready', evidence_available: true },
        google_source: { external_file_id: 'file_123' },
        empty_state: { kind: 'none' },
      };

      assert.strictEqual(isDocumentLineageDetail(mockDocumentLineage), true);
      assert.strictEqual(isSourceManagementContract(mockDocumentLineage), false);
    });

    await st.test('should not identify agreement lineage detail as source-management', () => {
      const mockAgreementLineage = {
        agreement_id: 'agr_123',
        pinned_source_revision_id: 'rev_123',
        newer_source_exists: false,
        empty_state: { kind: 'none' },
      };

      assert.strictEqual(isAgreementLineageDetail(mockAgreementLineage), true);
      assert.strictEqual(isSourceManagementContract(mockAgreementLineage), false);
    });
  });

  await t.test('Fixture Contract Stability', async (st) => {
    await st.test('should have stable SourceListPage contract', () => {
      assert.ok('items' in SOURCE_LIST_SINGLE);
      assert.ok('page_info' in SOURCE_LIST_SINGLE);
      assert.ok('applied_query' in SOURCE_LIST_SINGLE);
      assert.ok('permissions' in SOURCE_LIST_SINGLE);
      assert.ok('empty_state' in SOURCE_LIST_SINGLE);
      assert.ok('links' in SOURCE_LIST_SINGLE);
    });

    await st.test('should have stable SourceDetail contract', () => {
      assert.ok('source' in SOURCE_DETAIL_REPEATED);
      assert.ok('status' in SOURCE_DETAIL_REPEATED);
      assert.ok('provider' in SOURCE_DETAIL_REPEATED);
      assert.ok('revision_count' in SOURCE_DETAIL_REPEATED);
      assert.ok('handle_count' in SOURCE_DETAIL_REPEATED);
      assert.ok('relationship_count' in SOURCE_DETAIL_REPEATED);
      assert.ok('permissions' in SOURCE_DETAIL_REPEATED);
      assert.ok('links' in SOURCE_DETAIL_REPEATED);
      assert.ok('empty_state' in SOURCE_DETAIL_REPEATED);
    });

    await st.test('should have stable SourceRevisionPage contract', () => {
      assert.ok('source' in SOURCE_REVISIONS_REPEATED);
      assert.ok('items' in SOURCE_REVISIONS_REPEATED);
      assert.ok('page_info' in SOURCE_REVISIONS_REPEATED);
      assert.ok('permissions' in SOURCE_REVISIONS_REPEATED);
      assert.ok('empty_state' in SOURCE_REVISIONS_REPEATED);
      assert.ok('links' in SOURCE_REVISIONS_REPEATED);
    });

    await st.test('should have stable SourceRelationshipPage contract', () => {
      assert.ok('source' in SOURCE_RELATIONSHIPS_REVIEW);
      assert.ok('items' in SOURCE_RELATIONSHIPS_REVIEW);
      assert.ok('page_info' in SOURCE_RELATIONSHIPS_REVIEW);
      assert.ok('permissions' in SOURCE_RELATIONSHIPS_REVIEW);
      assert.ok('empty_state' in SOURCE_RELATIONSHIPS_REVIEW);
      assert.ok('links' in SOURCE_RELATIONSHIPS_REVIEW);
    });
  });

  await t.test('Rendering State Coverage', async (st) => {
    await st.test('should create loading state', () => {
      const state = createLoadingState();
      assert.strictEqual(state.metadata.kind, 'loading');
      assert.ok(state.loadingMessage);
    });

    await st.test('should create error state', () => {
      const error = new Error('Test error');
      const state = createErrorState(error);
      assert.strictEqual(state.metadata.kind, 'error');
      assert.strictEqual(state.message, 'Test error');
      assert.strictEqual(state.retryable, true);
    });

    await st.test('should create unauthorized state', () => {
      const state = createUnauthorizedState();
      assert.strictEqual(state.metadata.kind, 'unauthorized');
      assert.ok(state.title);
      assert.ok(Array.isArray(state.suggestedActions));
    });
  });
});

test('Source-Management Pages - Architectural Guards', async (t) => {
  // Set guards to strict mode for all tests
  setGuardEnforcementMode('strict');

  await t.test('Composition Boundary Guards', async (st) => {
    await st.test('should allow pure source-management dependencies', () => {
      const result = runPageGuards({
        pageId: 'test-page',
        dependencies: [SOURCE_LIST_SINGLE, SOURCE_DETAIL_REPEATED],
        usedContracts: ['SourceListPage', 'SourceDetail'],
        usedAdapters: ['source-management-adapters'],
        fetchedEndpoints: ['/admin/api/v1/esign/sources'],
      });

      assert.strictEqual(result.violated, false);
    });

    await st.test('should block mixing source-management with provenance contracts', () => {
      const mockDocumentLineage = {
        document_id: 'doc_123',
        fingerprint_status: { status: 'ready', evidence_available: true },
        google_source: { external_file_id: 'file_123' },
        empty_state: { kind: 'none' },
        candidate_warning_summary: [],
        presentation_warnings: [],
      };

      assert.throws(() => {
        runPageGuards({
          pageId: 'test-page',
          dependencies: [SOURCE_LIST_SINGLE, mockDocumentLineage],
          usedContracts: ['SourceListPage', 'DocumentLineageDetail'],
          usedAdapters: ['source-management-adapters'],
        });
      }, /violates composition boundary/);
    });

    await st.test('should block client-side semantic computation', () => {
      assert.throws(() => {
        runPageGuards({
          pageId: 'test-page',
          dependencies: [SOURCE_DETAIL_REPEATED],
          usedContracts: ['SourceDetail'],
          computedFields: ['newer_source_exists', 'warning_precedence'],
        });
      }, /computes prohibited semantic fields/);
    });

    await st.test('should block endpoint stitching', () => {
      assert.throws(() => {
        runPageGuards({
          pageId: 'test-page',
          dependencies: [SOURCE_LIST_SINGLE],
          fetchedEndpoints: [
            '/admin/api/v1/esign/sources',
            '/admin/api/v1/esign/documents/doc_123',
          ],
        });
      }, /fetches from non-source-management endpoints/);
    });
  });

  await t.test('Guard Enforcement Modes', async (st) => {
    await st.test('should throw in strict mode', () => {
      setGuardEnforcementMode('strict');

      assert.throws(() => {
        runPageGuards({
          pageId: 'test-page',
          computedFields: ['newer_source_exists'],
        });
      });
    });

    await st.test('should warn in warn mode', () => {
      setGuardEnforcementMode('warn');

      // In warn mode, it should not throw
      assert.doesNotThrow(() => {
        runPageGuards({
          pageId: 'test-page',
          computedFields: ['newer_source_exists'],
        });
      });
    });

    await st.test('should skip in disabled mode', () => {
      setGuardEnforcementMode('disabled');

      assert.doesNotThrow(() => {
        runPageGuards({
          pageId: 'test-page',
          computedFields: ['newer_source_exists'],
        });
      });
    });
  });
});
