import test from 'node:test';
import assert from 'node:assert/strict';

// Import from the bundled esign module
// Note: Requires `npm run build` to be run first
const {
  // Phase 16 Workspace Smoke Tests
  runPhase16WorkspaceSmokeTests,
  assertPhase16WorkspaceSmokeTests,
  runPhase16RuntimeSmokeCoverage,
  logPhase16SmokeTestResults,

  // Workspace Composition
  createInitialWorkspaceState,
  createLoadingWorkspaceState,
  updateWorkspacePanel,
  setActivePanel,
  getPanelDrillInUrl,
  panelRequiresLoad,

  // Panel State Resolvers
  resolveOverviewPanelState,
  resolveRevisionsPanelState,
  resolveArtifactsPanelState,
  resolveRelationshipsPanelState,
  resolveCommentsPanelState,
  resolveHandlesPanelState,

  // Panel State Creators
  createPanelLoadingState,
  createPanelErrorState,
  createPanelEmptyState,

  // Contract Validation
  validateWorkspaceContractUsage,
  validateWorkspaceContractIsolation,
  validateWorkspaceBackendLinks,
  WORKSPACE_APPROVED_CONTRACT_FAMILIES,
  WORKSPACE_FORBIDDEN_CONTRACT_FAMILIES,
} = await import('../dist/esign/index.js');

// =============================================================================
// Mock Fixtures
// =============================================================================

function createMockSourceDetail() {
  return {
    source: { id: 'src_test_001', label: 'Test Source Document' },
    status: 'active',
    lineage_confidence: 'high',
    provider: { kind: 'google_drive', label: 'Google Drive' },
    active_handle: null,
    latest_revision: { id: 'rev_001' },
    revision_count: 2,
    handle_count: 1,
    relationship_count: 0,
    pending_candidate_count: 0,
    permissions: {
      can_view_diagnostics: true,
      can_open_provider_links: true,
      can_review_candidates: false,
      can_view_comments: true,
    },
    links: {
      self: '/admin/api/v1/esign/sources/src_test_001',
      revisions: '/admin/api/v1/esign/sources/src_test_001/revisions',
      relationships: '/admin/api/v1/esign/sources/src_test_001/relationships',
      handles: '/admin/api/v1/esign/sources/src_test_001/handles',
      comments: '/admin/api/v1/esign/sources/src_test_001/comments',
    },
    empty_state: { kind: 'none' },
  };
}

function createMockMergedSourceDetail() {
  return {
    ...createMockSourceDetail(),
    status: 'merged',
    empty_state: { kind: 'merged_source', title: 'Source Merged', description: 'This source has been merged.' },
  };
}

function createMockArchivedSourceDetail() {
  return {
    ...createMockSourceDetail(),
    status: 'archived',
    empty_state: { kind: 'archived_source', title: 'Source Archived', description: 'This source has been archived.' },
  };
}

function createMockSourceRevisionPage() {
  return {
    source: { id: 'src_test_001', label: 'Test Source' },
    items: [
      {
        revision: { id: 'rev_001' },
        provider: { kind: 'google_drive', label: 'Google Drive' },
        primary_artifact: null,
        fingerprint_status: { status: 'ready', evidence_available: true },
        fingerprint_processing: {
          state: 'complete',
          attempt_count: 1,
          retryable: false,
          stale: false,
        },
        is_latest: true,
        links: {},
      },
    ],
    page_info: { mode: 'page', page: 1, page_size: 20, total_count: 1, has_more: false },
    applied_query: {},
    permissions: {
      can_view_diagnostics: true,
      can_open_provider_links: true,
      can_review_candidates: false,
      can_view_comments: true,
    },
    empty_state: { kind: 'none' },
    links: { self: '/admin/api/v1/esign/sources/src_test_001/revisions' },
  };
}

function createMockEmptySourceArtifactPage() {
  return {
    revision: { id: 'rev_001' },
    items: [],
    page_info: { mode: 'page', page: 1, page_size: 20, total_count: 0, has_more: false },
    permissions: {
      can_view_diagnostics: true,
      can_open_provider_links: true,
      can_review_candidates: false,
      can_view_comments: true,
    },
    empty_state: { kind: 'no_artifacts', title: 'No Artifacts', description: 'This revision has no artifacts.' },
    links: { self: '/admin/api/v1/esign/source-revisions/rev_001/artifacts' },
  };
}

// =============================================================================
// Phase 16 Workspace Smoke Tests
// =============================================================================

test('Phase 16 workspace smoke tests pass', () => {
  const result = runPhase16WorkspaceSmokeTests();

  assert.ok(result.passed, `Smoke tests failed: ${result.summary}`);
  assert.ok(result.contractUsageValid, 'Contract usage validation failed');
  assert.ok(result.contractIsolationValid, 'Contract isolation validation failed');
  assert.ok(result.backendLinksValid, 'Backend links validation failed');
  assert.ok(result.panels.length > 0, 'No panel tests were run');
});

test('Phase 16 assert smoke tests does not throw', () => {
  assert.doesNotThrow(() => {
    assertPhase16WorkspaceSmokeTests();
  });
});

test('Phase 16 runtime smoke coverage passes', () => {
  const result = runPhase16RuntimeSmokeCoverage();

  assert.ok(result.overallPassed, 'Runtime smoke coverage failed');
  assert.ok(result.workspace.passed, 'Workspace smoke tests failed');
});

// =============================================================================
// Workspace Composition Tests
// =============================================================================

test('createInitialWorkspaceState creates valid workspace from SourceDetail', () => {
  const detail = createMockSourceDetail();
  const workspace = createInitialWorkspaceState('src_test_001', detail);

  assert.equal(workspace.sourceId, 'src_test_001');
  assert.equal(workspace.activePanel, 'overview');
  assert.ok(workspace.overview !== null);
  assert.ok(workspace.permissions !== undefined);
  assert.ok(workspace.links.self !== undefined);

  // Lazy-loaded panels should be null initially
  assert.equal(workspace.revisions, null);
  assert.equal(workspace.artifacts, null);
  assert.equal(workspace.relationships, null);
  assert.equal(workspace.comments, null);
  assert.equal(workspace.handles, null);
});

test('createLoadingWorkspaceState creates loading workspace', () => {
  const workspace = createLoadingWorkspaceState('src_loading');

  assert.equal(workspace.sourceId, 'src_loading');
  assert.equal(workspace.activePanel, 'overview');
  assert.ok(workspace.overview !== null);
  assert.equal(workspace.overview.metadata.stateKind, 'loading');
});

test('setActivePanel updates active panel', () => {
  const detail = createMockSourceDetail();
  const workspace = createInitialWorkspaceState('src_test_001', detail);

  const updated = setActivePanel(workspace, 'revisions');

  assert.equal(updated.activePanel, 'revisions');
  // Original workspace is not mutated
  assert.equal(workspace.activePanel, 'overview');
});

test('panelRequiresLoad returns true for unloaded panels', () => {
  const detail = createMockSourceDetail();
  const workspace = createInitialWorkspaceState('src_test_001', detail);

  assert.equal(panelRequiresLoad(workspace, 'overview'), false);
  assert.equal(panelRequiresLoad(workspace, 'revisions'), true);
  assert.equal(panelRequiresLoad(workspace, 'artifacts'), true);
  assert.equal(panelRequiresLoad(workspace, 'relationships'), true);
  assert.equal(panelRequiresLoad(workspace, 'comments'), true);
  assert.equal(panelRequiresLoad(workspace, 'handles'), true);
});

test('getPanelDrillInUrl returns backend links', () => {
  const detail = createMockSourceDetail();
  const workspace = createInitialWorkspaceState('src_test_001', detail);

  assert.equal(getPanelDrillInUrl(workspace, 'overview'), '/admin/api/v1/esign/sources/src_test_001');
  assert.equal(getPanelDrillInUrl(workspace, 'revisions'), '/admin/api/v1/esign/sources/src_test_001/revisions');
  assert.equal(getPanelDrillInUrl(workspace, 'relationships'), '/admin/api/v1/esign/sources/src_test_001/relationships');
  assert.equal(getPanelDrillInUrl(workspace, 'handles'), '/admin/api/v1/esign/sources/src_test_001/handles');
  assert.equal(getPanelDrillInUrl(workspace, 'comments'), '/admin/api/v1/esign/sources/src_test_001/comments');
});

// =============================================================================
// Panel State Resolver Tests
// =============================================================================

test('resolveOverviewPanelState resolves loading state', () => {
  const state = resolveOverviewPanelState(true, null, null);

  assert.equal(state.metadata.stateKind, 'loading');
  assert.equal(state.metadata.panelId, 'overview');
});

test('resolveOverviewPanelState resolves error state', () => {
  const error = new Error('HTTP 500: Internal Server Error');
  const state = resolveOverviewPanelState(false, error, null);

  assert.equal(state.metadata.stateKind, 'error');
  assert.ok(state.message.includes('500'));
});

test('resolveOverviewPanelState resolves success state', () => {
  const detail = createMockSourceDetail();
  const state = resolveOverviewPanelState(false, null, detail);

  assert.equal(state.metadata.stateKind, 'success');
  assert.equal(state.metadata.panelId, 'overview');
  assert.ok(state.source !== undefined);
});

test('resolveOverviewPanelState resolves merged_source state', () => {
  const detail = createMockMergedSourceDetail();
  const state = resolveOverviewPanelState(false, null, detail);

  assert.equal(state.metadata.stateKind, 'merged_source');
});

test('resolveOverviewPanelState resolves archived_source state', () => {
  const detail = createMockArchivedSourceDetail();
  const state = resolveOverviewPanelState(false, null, detail);

  assert.equal(state.metadata.stateKind, 'archived_source');
});

test('resolveRevisionsPanelState resolves success state', () => {
  const page = createMockSourceRevisionPage();
  const state = resolveRevisionsPanelState(false, null, page);

  // Single revision should be 'success', not 'repeated_revisions'
  assert.equal(state.metadata.stateKind, 'success');
  assert.equal(state.metadata.panelId, 'revisions');
});

test('resolveArtifactsPanelState resolves no_artifacts empty state', () => {
  const page = createMockEmptySourceArtifactPage();
  const state = resolveArtifactsPanelState(false, null, page);

  assert.equal(state.metadata.stateKind, 'no_artifacts');
  assert.equal(state.metadata.panelId, 'artifacts');
});

// =============================================================================
// Panel State Creator Tests
// =============================================================================

test('createPanelLoadingState creates loading state with message', () => {
  const state = createPanelLoadingState('revisions', 'Loading revision history...');

  assert.equal(state.metadata.panelId, 'revisions');
  assert.equal(state.metadata.stateKind, 'loading');
  assert.equal(state.loadingMessage, 'Loading revision history...');
  assert.ok(state.metadata.timestamp);
});

test('createPanelErrorState creates error state', () => {
  const error = new Error('HTTP 403: Forbidden');
  const state = createPanelErrorState('comments', error, false);

  assert.equal(state.metadata.panelId, 'comments');
  assert.equal(state.metadata.stateKind, 'error');
  assert.equal(state.code, 'HTTP_403');
  assert.equal(state.retryable, false);
});

test('createPanelEmptyState creates empty state from backend', () => {
  const backendEmptyState = {
    kind: 'no_comments',
    title: 'No Comments',
    description: 'This source has no comments yet.',
  };
  const state = createPanelEmptyState('comments', backendEmptyState);

  assert.equal(state.metadata.panelId, 'comments');
  assert.equal(state.metadata.stateKind, 'no_comments');
  assert.equal(state.backendEmptyStateKind, 'no_comments');
  assert.equal(state.emptyState.title, 'No Comments');
});

// =============================================================================
// Contract Validation Tests
// =============================================================================

test('validateWorkspaceContractUsage accepts approved contracts', () => {
  const result = validateWorkspaceContractUsage([
    'SourceDetail',
    'SourceRevisionPage',
    'Phase13SourceCommentPage',
  ]);

  assert.ok(result.valid, 'Should accept approved contract families');
  assert.equal(result.violations.length, 0);
});

test('validateWorkspaceContractUsage rejects unapproved contracts', () => {
  const result = validateWorkspaceContractUsage([
    'SourceDetail',
    'SomeCustomContract', // Not approved
  ]);

  assert.ok(!result.valid, 'Should reject unapproved contract families');
  assert.ok(result.violations.length > 0);
  assert.ok(result.violations[0].includes('SomeCustomContract'));
});

test('validateWorkspaceContractIsolation accepts source-management contracts only', () => {
  const result = validateWorkspaceContractIsolation([
    'SourceDetail',
    'SourceRevisionPage',
  ]);

  assert.ok(result.valid, 'Should accept source-management contracts only');
  assert.equal(result.violations.length, 0);
});

test('validateWorkspaceContractIsolation rejects forbidden contracts', () => {
  const result = validateWorkspaceContractIsolation([
    'SourceDetail',
    'DocumentLineageDetail', // Forbidden
  ]);

  assert.ok(!result.valid, 'Should reject forbidden contract families');
  assert.ok(result.violations.length > 0);
  assert.ok(result.violations[0].includes('DocumentLineageDetail'));
});

test('validateWorkspaceContractIsolation rejects AgreementLineageDetail', () => {
  const result = validateWorkspaceContractIsolation([
    'SourceDetail',
    'AgreementLineageDetail', // Forbidden
  ]);

  assert.ok(!result.valid, 'Should reject AgreementLineageDetail');
  assert.ok(result.violations[0].includes('AgreementLineageDetail'));
});

test('validateWorkspaceBackendLinks validates backend-provided links', () => {
  const detail = createMockSourceDetail();
  const workspace = createInitialWorkspaceState('src_test_001', detail);
  const result = validateWorkspaceBackendLinks(workspace);

  assert.ok(result.valid, 'Should validate workspace with backend links');
  assert.equal(result.violations.length, 0);
});

test('WORKSPACE_APPROVED_CONTRACT_FAMILIES contains expected families', () => {
  assert.ok(WORKSPACE_APPROVED_CONTRACT_FAMILIES.includes('SourceDetail'));
  assert.ok(WORKSPACE_APPROVED_CONTRACT_FAMILIES.includes('SourceRevisionPage'));
  assert.ok(WORKSPACE_APPROVED_CONTRACT_FAMILIES.includes('SourceRelationshipPage'));
  assert.ok(WORKSPACE_APPROVED_CONTRACT_FAMILIES.includes('SourceArtifactPage'));
  assert.ok(WORKSPACE_APPROVED_CONTRACT_FAMILIES.includes('SourceHandlePage'));
  assert.ok(WORKSPACE_APPROVED_CONTRACT_FAMILIES.includes('Phase13SourceCommentPage'));
});

test('WORKSPACE_FORBIDDEN_CONTRACT_FAMILIES contains provenance families', () => {
  assert.ok(WORKSPACE_FORBIDDEN_CONTRACT_FAMILIES.includes('DocumentLineageDetail'));
  assert.ok(WORKSPACE_FORBIDDEN_CONTRACT_FAMILIES.includes('AgreementLineageDetail'));
  assert.ok(WORKSPACE_FORBIDDEN_CONTRACT_FAMILIES.includes('GoogleImportLineageStatus'));
  assert.ok(WORKSPACE_FORBIDDEN_CONTRACT_FAMILIES.includes('GoogleImportRunDetail'));
});
