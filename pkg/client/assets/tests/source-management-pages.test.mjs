import test from 'node:test';
import assert from 'node:assert/strict';

const {
  SOURCE_LIST_EMPTY,
  SOURCE_LIST_SINGLE,
  SOURCE_DETAIL_REPEATED,
  SOURCE_DETAIL_MERGED,
  SOURCE_DETAIL_ARCHIVED,
  SOURCE_REVISIONS_REPEATED,
  SOURCE_RELATIONSHIPS_REVIEW,
  SEARCH_EMPTY,
  SEARCH_RESULTS_WITH_COMMENTS,
  COMMENTS_EMPTY,
  COMMENTS_SYNCED,
  COMMENTS_PENDING_SYNC,
  COMMENTS_SYNC_FAILED,
  COMMENTS_SYNC_STALE,
  SourceBrowserPageController,
  SourceDetailPageController,
  SourceRevisionTimelinePageController,
  resolveSourceListRenderingState,
  resolveSourceDetailRenderingState,
  resolveSourceRevisionTimelineRenderingState,
  resolvePhase13SearchRenderingState,
  resolvePhase13CommentRenderingState,
  isSourceManagementContract,
  runPageGuards,
  runPhase13PageGuards,
  setGuardEnforcementMode,
  createMockAgreementReviewComment,
  createMockRawGoogleDriveComment,
} = await import('../dist/esign/index.js');

function createFetchStub(payload, calls) {
  return async (url) => {
    calls.push(String(url));
    return {
      ok: true,
      async json() {
        return payload;
      },
      async text() {
        return JSON.stringify(payload);
      },
    };
  };
}

function createHistoryStub(calls) {
  return {
    pushState(_state, _title, url) {
      calls.push(String(url));
    },
  };
}

test('source browser controller serializes canonical q parameter', async () => {
  const fetchCalls = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = createFetchStub(SOURCE_LIST_SINGLE, fetchCalls);

  try {
    const controller = new SourceBrowserPageController({
      apiBasePath: '/admin/api/v1/esign',
    });

    await controller.fetchSources({
      query: 'enterprise nda',
      page: 2,
      page_size: 10,
      has_pending_candidates: true,
    });

    assert.equal(
      fetchCalls[0],
      '/admin/api/v1/esign/sources?q=enterprise+nda&has_pending_candidates=true&page=2&page_size=10'
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('source browser controller reads canonical q parameter from URL state', async () => {
  const fetchCalls = [];
  const historyCalls = [];
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalHistory = globalThis.history;

  globalThis.fetch = createFetchStub(SOURCE_LIST_SINGLE, fetchCalls);
  globalThis.window = {
    location: {
      search: '?q=history&page=3&page_size=5',
      href: 'https://example.test/admin/esign/sources?q=history&page=3&page_size=5',
    },
  };
  globalThis.history = createHistoryStub(historyCalls);

  try {
    const controller = new SourceBrowserPageController({
      apiBasePath: '/admin/api/v1/esign',
    });

    await controller.init();

    assert.match(fetchCalls[0], /\?q=history/);
    assert.match(fetchCalls[0], /page=3/);
    assert.match(fetchCalls[0], /page_size=5/);

    await controller.applyFilters({ query: 'updated search' });
    assert.match(historyCalls[0], /\?q=updated\+search&page=1/);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
    globalThis.history = originalHistory;
  }
});

test('source detail and revision controllers fetch their backend-owned endpoint families', async () => {
  const fetchCalls = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url) => {
    fetchCalls.push(String(url));
    const payload = fetchCalls.length === 1 ? SOURCE_DETAIL_REPEATED : SOURCE_REVISIONS_REPEATED;
    return {
      ok: true,
      async json() {
        return payload;
      },
      async text() {
        return JSON.stringify(payload);
      },
    };
  };

  try {
    const detailController = new SourceDetailPageController({
      apiBasePath: '/admin/api/v1/esign',
      sourceId: 'src_01HX5ZCQK0ABC123',
    });
    await detailController.fetchSource();

    const revisionsController = new SourceRevisionTimelinePageController({
      apiBasePath: '/admin/api/v1/esign',
      sourceId: 'src_01HX5ZCQK0ABC123',
    });
    await revisionsController.fetchRevisions({ sort: 'modified_time_desc', page: 2 });

    assert.equal(fetchCalls[0], '/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123');
    assert.equal(
      fetchCalls[1],
      '/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123/revisions?sort=modified_time_desc&page=2'
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('phase 12 rendering states cover source list, detail, and revisions from fixtures', () => {
  const listEmpty = resolveSourceListRenderingState(false, null, SOURCE_LIST_EMPTY);
  assert.equal(listEmpty.metadata.kind, 'empty');

  const detailSuccess = resolveSourceDetailRenderingState(false, null, SOURCE_DETAIL_REPEATED);
  assert.equal(detailSuccess.metadata.kind, 'success');
  assert.equal(detailSuccess.source.revisionCount, 3);

  const mergedDetail = resolveSourceDetailRenderingState(false, null, SOURCE_DETAIL_MERGED);
  assert.equal(mergedDetail.metadata.kind, 'success');
  assert.equal(mergedDetail.source.status, 'merged');

  const archivedDetail = resolveSourceDetailRenderingState(false, null, SOURCE_DETAIL_ARCHIVED);
  assert.equal(archivedDetail.metadata.kind, 'success');
  assert.equal(archivedDetail.source.status, 'archived');

  const revisionsSuccess = resolveSourceRevisionTimelineRenderingState(
    false,
    null,
    SOURCE_REVISIONS_REPEATED
  );
  assert.equal(revisionsSuccess.metadata.kind, 'success');
  assert.equal(revisionsSuccess.items[0].id, 'rev_01HX5ZCQK0REV003');
  assert.equal(revisionsSuccess.items[0].isLatest, true);
  assert.equal(revisionsSuccess.items[1].isLatest, false);

  assert.equal(SOURCE_RELATIONSHIPS_REVIEW.items[0].relationship_type, 'copied_from');
  assert.equal(SOURCE_RELATIONSHIPS_REVIEW.items[0].status, 'pending_review');
});

test('phase 12 guards recognize all source-management contract families, not just list/detail/revisions', () => {
  assert.equal(isSourceManagementContract(SOURCE_LIST_SINGLE), true);
  assert.equal(isSourceManagementContract(SOURCE_DETAIL_REPEATED), true);
  assert.equal(isSourceManagementContract(SOURCE_REVISIONS_REPEATED), true);
  assert.equal(isSourceManagementContract(SOURCE_RELATIONSHIPS_REVIEW), true);
  assert.equal(isSourceManagementContract(SEARCH_RESULTS_WITH_COMMENTS), true);
  assert.equal(isSourceManagementContract(COMMENTS_SYNCED), true);
});

test('phase 12 guards reject mixed endpoint families including comments and search routes', () => {
  setGuardEnforcementMode('strict');

  assert.throws(() => {
    runPageGuards({
      pageId: 'mixed-source-comment-page',
      dependencies: [COMMENTS_SYNCED],
      fetchedEndpoints: [
        '/admin/api/v1/esign/sources/src_01HX5ZCQK0COMMENT2/comments',
        '/admin/api/v1/esign/source-search?q=agreement',
      ],
    });
  }, /multiple unrelated endpoint families/);
});

test('phase 13 search rendering states cover empty and populated results', () => {
  const empty = resolvePhase13SearchRenderingState(false, null, SEARCH_EMPTY);
  assert.equal(empty.metadata.kind, 'empty');
  assert.equal(empty.suggestedActions.length, 1);
  assert.equal(empty.suggestedActions[0].label, 'Clear Search');

  const success = resolvePhase13SearchRenderingState(false, null, SEARCH_RESULTS_WITH_COMMENTS);
  assert.equal(success.metadata.kind, 'success');
  assert.equal(success.items.length, 2);
  assert.equal(success.items[0].commentCount, 5);
  assert.equal(success.items[0].commentSyncStatus, 'synced');
  assert.equal(success.items[1].commentSyncStatus, 'pending_sync');
});

test('phase 13 comment rendering states cover empty, synced, pending, failed, and stale states', () => {
  const empty = resolvePhase13CommentRenderingState(false, null, COMMENTS_EMPTY);
  assert.equal(empty.metadata.kind, 'empty');

  const synced = resolvePhase13CommentRenderingState(false, null, COMMENTS_SYNCED);
  assert.equal(synced.metadata.kind, 'success');
  assert.equal(synced.items.length, 2);
  assert.equal(synced.syncStatus.isSynced, true);

  const pending = resolvePhase13CommentRenderingState(false, null, COMMENTS_PENDING_SYNC);
  assert.equal(pending.metadata.kind, 'empty');
  assert.equal(pending.emptyState.kind, 'pending_sync');

  const failed = resolvePhase13CommentRenderingState(false, null, COMMENTS_SYNC_FAILED);
  assert.equal(failed.metadata.kind, 'degraded');
  assert.equal(failed.severity, 'critical');

  const stale = resolvePhase13CommentRenderingState(false, null, COMMENTS_SYNC_STALE);
  assert.equal(stale.metadata.kind, 'degraded');
  assert.equal(stale.severity, 'warning');
});

test('phase 13 guards block agreement-review comment mixing, raw provider payloads, and contract misuse', () => {
  setGuardEnforcementMode('strict');

  assert.throws(() => {
    runPhase13PageGuards({
      pageId: 'source-comments',
      dependencies: [COMMENTS_SYNCED, createMockAgreementReviewComment()],
    });
  }, /must NOT be mixed/);

  assert.throws(() => {
    runPhase13PageGuards({
      pageId: 'source-comments',
      dependencies: [COMMENTS_SYNCED, createMockRawGoogleDriveComment()],
    });
  }, /provider-neutral contracts only/);

  assert.throws(() => {
    runPhase13PageGuards({
      pageId: 'source-search',
      searchContracts: [SOURCE_LIST_SINGLE],
      searchFieldsAccessed: ['comment_sync_status', 'has_comments'],
    });
  }, /does not consume Phase13SourceSearchResults/);

  assert.throws(() => {
    runPhase13PageGuards({
      pageId: 'source-comments',
      commentContracts: [SOURCE_LIST_SINGLE],
      commentFieldsAccessed: ['sync', 'messages', 'last_activity_at'],
    });
  }, /does not consume Phase13SourceCommentPage/);
});
