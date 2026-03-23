import test from 'node:test';
import assert from 'node:assert/strict';

const {
  SOURCE_LIST_EMPTY,
  SOURCE_LIST_SINGLE,
  SOURCE_DETAIL_REPEATED,
  SOURCE_REVISIONS_REPEATED,
  SOURCE_RELATIONSHIPS_REVIEW,
  SEARCH_EMPTY,
  SEARCH_RESULTS_WITH_COMMENTS,
  COMMENTS_EMPTY,
  COMMENTS_SYNCED,
  PHASE_11_FIXTURES,
  PHASE_13_FIXTURES,
  adaptSourceListItem,
  adaptSourceDetail,
  adaptSourceRevisionListItem,
  adaptSourceRelationshipSummary,
  adaptSourceListPage,
  adaptSourceRevisionPage,
  adaptSourceRelationshipPage,
  adaptPaginationInfo,
  adaptEmptyState,
  adaptPhase13SearchResult,
  adaptCommentSyncStatus,
  adaptPhase13CommentThread,
} = await import('../dist/esign/index.js');

test('phase 11 fixtures preserve stable source-management contract shapes', () => {
  assert.deepEqual(Object.keys(SOURCE_LIST_SINGLE).sort(), [
    'applied_query',
    'empty_state',
    'items',
    'links',
    'page_info',
    'permissions',
  ]);

  assert.deepEqual(Object.keys(SOURCE_DETAIL_REPEATED).sort(), [
    'active_handle',
    'empty_state',
    'handle_count',
    'latest_revision',
    'lineage_confidence',
    'links',
    'pending_candidate_count',
    'permissions',
    'provider',
    'relationship_count',
    'revision_count',
    'source',
    'status',
  ]);

  assert.deepEqual(Object.keys(SOURCE_REVISIONS_REPEATED.items[0].fingerprint_processing).sort(), [
    'attempt_count',
    'completed_at',
    'retryable',
    'stale',
    'state',
    'status_label',
  ]);
});

test('phase 13 fixtures preserve stable search and comment contract shapes', () => {
  assert.deepEqual(Object.keys(SEARCH_EMPTY).sort(), [
    'applied_query',
    'empty_state',
    'items',
    'links',
    'page_info',
    'permissions',
  ]);
  assert.match(SEARCH_EMPTY.links.self, /\?q=nonexistent\+document$/);

  assert.deepEqual(Object.keys(COMMENTS_SYNCED).sort(), [
    'applied_query',
    'empty_state',
    'items',
    'links',
    'page_info',
    'permissions',
    'revision',
    'source',
    'sync',
    'sync_status',
  ]);
});

test('phase 11 and phase 13 fixture bundles expose all required states', () => {
  assert.ok(PHASE_11_FIXTURES.states.source_list_empty);
  assert.ok(PHASE_11_FIXTURES.states.source_revisions_repeated);
  assert.ok(PHASE_11_FIXTURES.states.source_relationships_review);
  assert.ok(PHASE_11_FIXTURES.states.source_comments_empty);
  assert.ok(PHASE_13_FIXTURES.states.search_empty);
  assert.ok(PHASE_13_FIXTURES.states.search_results_with_comments);
  assert.ok(PHASE_13_FIXTURES.states.comments_empty);
  assert.ok(PHASE_13_FIXTURES.states.comments_synced);
  assert.ok(PHASE_13_FIXTURES.states.comments_pending_sync);
  assert.ok(PHASE_13_FIXTURES.states.comments_sync_failed);
  assert.ok(PHASE_13_FIXTURES.states.comments_sync_stale);
});

test('source-management adapters normalize phase 11 payloads without inventing semantics', () => {
  const listItem = adaptSourceListItem(SOURCE_LIST_SINGLE.items[0]);
  assert.equal(listItem.id, SOURCE_LIST_SINGLE.items[0].source.id);
  assert.equal(listItem.status, SOURCE_LIST_SINGLE.items[0].status);
  assert.equal(listItem.revisionCount, SOURCE_LIST_SINGLE.items[0].revision_count);

  const detail = adaptSourceDetail(SOURCE_DETAIL_REPEATED);
  assert.equal(detail.id, SOURCE_DETAIL_REPEATED.source.id);
  assert.equal(detail.revisionCount, SOURCE_DETAIL_REPEATED.revision_count);
  assert.equal(detail.hasPendingCandidates, false);

  const revision = adaptSourceRevisionListItem(SOURCE_REVISIONS_REPEATED.items[0]);
  assert.equal(revision.id, SOURCE_REVISIONS_REPEATED.items[0].revision.id);
  assert.equal(revision.fingerprintStatus, SOURCE_REVISIONS_REPEATED.items[0].fingerprint_status.status);
  assert.equal(revision.fingerprintProcessingLabel, 'Ready');

  const relationship = adaptSourceRelationshipSummary(SOURCE_RELATIONSHIPS_REVIEW.items[0]);
  assert.equal(relationship.id, SOURCE_RELATIONSHIPS_REVIEW.items[0].id);
  assert.equal(relationship.canReview, true);
  assert.deepEqual(relationship.evidenceLabels, ['Title similarity', 'Text overlap']);
});

test('page-level adapters normalize pagination and empty states consistently', () => {
  const listPage = adaptSourceListPage(SOURCE_LIST_SINGLE);
  assert.equal(listPage.items.length, 1);
  assert.equal(listPage.pagination.currentPage, 1);
  assert.equal(listPage.emptyState.isEmpty, false);

  const revisionPage = adaptSourceRevisionPage(SOURCE_REVISIONS_REPEATED);
  assert.equal(revisionPage.items.length, 2);
  assert.equal(revisionPage.source.id, 'src_01HX5ZCQK0ABC123');

  const relationshipPage = adaptSourceRelationshipPage(SOURCE_RELATIONSHIPS_REVIEW);
  assert.equal(relationshipPage.items.length, 1);
  assert.equal(relationshipPage.items[0].relationshipType, 'copied_from');

  const pagination = adaptPaginationInfo({
    ...SOURCE_LIST_SINGLE.page_info,
    page: 2,
    total_count: 45,
  });
  assert.equal(pagination.firstItemIndex, 21);
  assert.equal(pagination.lastItemIndex, 40);
  assert.equal(pagination.hasPrevious, true);

  const emptyState = adaptEmptyState({
    kind: 'no_results',
    title: 'No results found',
    description: 'No sources match your query.',
  });
  assert.equal(emptyState.isEmpty, true);
  assert.equal(emptyState.kind, 'no_results');

  const nonEmptyState = adaptEmptyState({ kind: 'none' });
  assert.equal(nonEmptyState.isEmpty, false);
});

test('phase 13 adapters normalize search and comments without leaking provider-specific semantics', () => {
  const searchVm = adaptPhase13SearchResult(SEARCH_RESULTS_WITH_COMMENTS.items[0]);
  assert.equal(searchVm.sourceId, 'src_01HX5ZCQK0SEARCH1');
  assert.equal(searchVm.commentCount, 5);
  assert.equal(searchVm.commentSyncStatusLabel, 'Synced');
  assert.deepEqual(searchVm.matchedFieldLabels, ['Title', 'Comment Text']);

  const pendingSearchVm = adaptPhase13SearchResult(SEARCH_RESULTS_WITH_COMMENTS.items[1]);
  assert.equal(pendingSearchVm.resultKind, 'source_revision');
  assert.equal(pendingSearchVm.commentSyncStatusLabel, 'Syncing...');

  const syncVm = adaptCommentSyncStatus(COMMENTS_SYNCED.sync_status, COMMENTS_SYNCED.sync);
  assert.equal(syncVm.isSynced, true);
  assert.equal(syncVm.threadCount, COMMENTS_SYNCED.sync.thread_count);

  const failedSyncVm = adaptCommentSyncStatus('failed', {
    status: 'failed',
    thread_count: 0,
    message_count: 0,
    error_code: 'AUTH_EXPIRED',
    error_message: 'Provider auth expired.',
  });
  assert.equal(failedSyncVm.hasError, true);
  assert.equal(failedSyncVm.statusVariant, 'error');

  const commentVm = adaptPhase13CommentThread(COMMENTS_SYNCED.items[0]);
  assert.equal(commentVm.id, COMMENTS_SYNCED.items[0].id);
  assert.equal(commentVm.authorName, COMMENTS_SYNCED.items[0].author.display_name);
  assert.equal(commentVm.hasReplies, true);
});

test('phase 13 empty comments fixture remains provider-neutral and source-scoped', () => {
  assert.equal(COMMENTS_EMPTY.sync_status, 'synced');
  assert.equal(COMMENTS_EMPTY.empty_state.kind, 'no_comments');
  assert.match(COMMENTS_EMPTY.links.self, /\/sources\/src_01HX5ZCQK0COMMENT1\/comments$/);
});

test('phase 11 source list empty fixture remains canonical for frontend smoke usage', () => {
  assert.equal(SOURCE_LIST_EMPTY.items.length, 0);
  assert.equal(SOURCE_LIST_EMPTY.empty_state.kind, 'no_results');
  assert.equal(SOURCE_LIST_EMPTY.links.self, '/admin/api/v1/esign/sources');
});
