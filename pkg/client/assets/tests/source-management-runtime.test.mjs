/**
 * Tests for source-management-runtime.ts
 *
 * Tests for:
 * - Clear/reset behavior (URL params and state reset)
 * - Empty-result recovery (filters visible in empty state)
 * - Search result link correctness after client-side operations
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const {
  SourceManagementRuntimeController,
  SourceBrowserPageController,
  SourceSearchPageController,
  SourceWorkspacePageController,
  translateSourceManagementHrefToRuntime,
  isRegisteredRuntimeHref,
  resolveBrowserItemRuntimeHref,
  resolveSearchResultRuntimeHref,
  SOURCE_SEARCH_RESULT_KIND_OPTIONS,
} = await import('../dist/esign/index.js');

const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const sourceManagementRuntimeSourcePath = path.resolve(
  testFileDir,
  '../src/esign/source-management-runtime.ts',
);

// Test fixtures
const SOURCE_LIST_EMPTY = {
  items: [],
  page_info: { page: 1, page_size: 20, total_count: 0 },
  applied_query: { query: 'no-match', provider_kind: 'google_docs', status: 'active' },
  empty_state: { kind: 'no_results', title: 'No sources found', description: 'No sources match your filters.' },
  permissions: { can_view_diagnostics: true, can_open_provider_links: true },
};

const SOURCE_LIST_SINGLE = {
  items: [
    {
      source: { id: 'src_01HX5ZCQK0ABC123', label: 'Enterprise Agreement' },
      provider: { kind: 'google_docs', external_file_id: '1abc123' },
      latest_revision: { id: 'rev_001', provider_revision_hint: 'v3', modified_time: '2024-01-15T10:00:00Z' },
      status: 'active',
      pending_candidate_count: 2,
    },
  ],
  page_info: { page: 1, page_size: 20, total_count: 1 },
  applied_query: { query: 'enterprise', page: 1 },
  permissions: { can_view_diagnostics: true, can_open_provider_links: true },
};

const SEARCH_RESULTS = {
  items: [
    {
      result_kind: 'source_document',
      source: { id: 'src_01HX5ZCQK0ABC123', label: 'Enterprise Agreement' },
      revision: { id: 'rev_001' },
      provider: { kind: 'google_docs' },
      summary: 'Enterprise Agreement - Main document',
      matched_fields: ['title', 'content'],
      has_comments: true,
      links: {
        workspace: '/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123/workspace',
      },
    },
    {
      result_kind: 'source_revision',
      source: { id: 'src_01HX5ZCQK0ABC456', label: 'Contract B' },
      revision: { id: 'rev_002' },
      provider: { kind: 'google_drive' },
      summary: 'Contract B - Revision 2',
      matched_fields: ['artifact'],
      has_comments: false,
      links: {
        anchor: '/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC456/workspace?panel=artifacts&anchor=revision:rev_002',
      },
    },
  ],
  page_info: { page: 1, page_size: 20, total_count: 2 },
  applied_query: { query: 'agreement', provider_kind: 'google_docs' },
  links: {},
};

const SEARCH_EMPTY = {
  items: [],
  page_info: { page: 1, page_size: 20, total_count: 0 },
  applied_query: { query: 'nonexistent' },
  empty_state: { kind: 'no_results', title: 'No results', description: 'Try adjusting your search.' },
  links: {},
};

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

function createRuntimeRootStub() {
  return {
    innerHTML: '',
    addEventListener() {},
    querySelector() {
      return null;
    },
  };
}

// ============================================================================
// Clear/Reset Behavior Tests
// ============================================================================

test('browser controller clear filters removes all filter params from URL', async () => {
  const fetchCalls = [];
  const historyCalls = [];
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalHistory = globalThis.history;

  globalThis.fetch = createFetchStub(SOURCE_LIST_SINGLE, fetchCalls);
  globalThis.window = {
    location: {
      search: '?q=enterprise&provider_kind=google_docs&status=active&has_pending_candidates=true&page=3',
      href: 'https://example.test/admin/esign/sources?q=enterprise&provider_kind=google_docs&status=active&has_pending_candidates=true&page=3',
    },
  };
  globalThis.history = createHistoryStub(historyCalls);

  try {
    const controller = new SourceBrowserPageController({
      apiBasePath: '/admin/api/v1/esign',
    });

    await controller.init();

    // Apply filters with all values set to undefined (simulating clear)
    await controller.applyFilters({
      query: undefined,
      provider_kind: undefined,
      status: undefined,
      has_pending_candidates: undefined,
      sort: undefined,
    });

    // Verify URL was updated (history.pushState called)
    assert.ok(historyCalls.length > 0, 'history.pushState should have been called');

    // The cleared URL should only have page=1 (reset to page 1 on filter change)
    const clearedUrl = historyCalls[historyCalls.length - 1];
    assert.ok(!clearedUrl.includes('q='), 'URL should not contain q parameter after clear');
    assert.ok(!clearedUrl.includes('provider_kind='), 'URL should not contain provider_kind after clear');
    assert.ok(!clearedUrl.includes('status='), 'URL should not contain status after clear');
    assert.ok(!clearedUrl.includes('has_pending_candidates='), 'URL should not contain has_pending_candidates after clear');
    assert.ok(clearedUrl.includes('page=1'), 'URL should reset to page=1 after clear');
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
    globalThis.history = originalHistory;
  }
});

test('search controller clear filters removes all filter params from URL', async () => {
  const fetchCalls = [];
  const historyCalls = [];
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalHistory = globalThis.history;

  globalThis.fetch = createFetchStub(SEARCH_RESULTS, fetchCalls);
  globalThis.window = {
    location: {
      search: '?q=agreement&provider_kind=google_docs&status=active&result_kind=source_document&has_comments=true',
      href: 'https://example.test/admin/esign/source-search?q=agreement&provider_kind=google_docs&status=active&result_kind=source_document&has_comments=true',
    },
  };
  globalThis.history = createHistoryStub(historyCalls);

  try {
    const controller = new SourceSearchPageController({
      apiBasePath: '/admin/api/v1/esign',
    });

    await controller.init();

    // Apply filters with all values set to undefined (simulating clear)
    await controller.applyFilters({
      query: undefined,
      provider_kind: undefined,
      status: undefined,
      result_kind: undefined,
      relationship_state: undefined,
      comment_sync_status: undefined,
      revision_hint: undefined,
      has_comments: undefined,
      sort: undefined,
    });

    // Verify URL was updated
    assert.ok(historyCalls.length > 0, 'history.pushState should have been called');

    const clearedUrl = historyCalls[historyCalls.length - 1];
    assert.ok(!clearedUrl.includes('q='), 'URL should not contain q parameter after clear');
    assert.ok(!clearedUrl.includes('provider_kind='), 'URL should not contain provider_kind after clear');
    assert.ok(!clearedUrl.includes('result_kind='), 'URL should not contain result_kind after clear');
    assert.ok(!clearedUrl.includes('has_comments='), 'URL should not contain has_comments after clear');
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
    globalThis.history = originalHistory;
  }
});

// ============================================================================
// Empty Result Recovery Tests
// ============================================================================

test('browser controller returns empty state with applied_query for UI recovery', async () => {
  const fetchCalls = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = createFetchStub(SOURCE_LIST_EMPTY, fetchCalls);

  try {
    const controller = new SourceBrowserPageController({
      apiBasePath: '/admin/api/v1/esign',
    });

    await controller.fetchSources({
      query: 'no-match',
      provider_kind: 'google_docs',
      status: 'active',
    });

    const state = controller.getState();

    // Verify empty state includes applied_query for filter restoration
    assert.ok(state.contracts?.listSources, 'Should have listSources contract');
    assert.ok(state.contracts.listSources.applied_query, 'Should have applied_query in empty response');
    assert.equal(state.contracts.listSources.applied_query.query, 'no-match', 'applied_query.query should match');
    assert.equal(state.contracts.listSources.applied_query.provider_kind, 'google_docs', 'applied_query.provider_kind should match');
    assert.ok(state.contracts.listSources.empty_state, 'Should have empty_state for UI display');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('search controller returns empty state with applied_query for filter visibility', async () => {
  const fetchCalls = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = createFetchStub(SEARCH_EMPTY, fetchCalls);

  try {
    const controller = new SourceSearchPageController({
      apiBasePath: '/admin/api/v1/esign',
    });

    await controller.search({
      query: 'nonexistent',
      page: 1,
      page_size: 20,
    });

    const state = controller.getState();

    // Verify empty state includes applied_query for filter form population
    assert.ok(state.contracts?.searchResults, 'Should have searchResults contract');
    assert.ok(state.contracts.searchResults.applied_query, 'Should have applied_query in empty response');
    assert.equal(state.contracts.searchResults.applied_query.query, 'nonexistent', 'applied_query.query should match');
    assert.ok(state.contracts.searchResults.empty_state, 'Should have empty_state for UI display');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('runtime browser renderer uses shared table shell classes', () => {
  const root = createRuntimeRootStub();
  const controller = new SourceManagementRuntimeController({
    page: 'admin.sources.browser',
    config: { routes: {}, api_base_path: '/admin/api/v1/esign' },
    model: { contract: SOURCE_LIST_SINGLE },
    marker: {},
    root,
  });

  controller.renderFromModel();

  assert.match(root.innerHTML, /rounded-xl mb-4 p-4 shadow-sm/, 'browser toolbar should use shared list shell card');
  assert.match(root.innerHTML, /<table class="min-w-full divide-y divide-gray-200">/, 'browser surface should render a table');
  assert.match(root.innerHTML, />Actions</, 'browser surface should render an actions header');
  assert.match(root.innerHTML, /px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider/, 'browser headers should use shared table spacing');
});

test('runtime search renderer uses table results instead of bespoke cards', () => {
  const root = createRuntimeRootStub();
  const controller = new SourceManagementRuntimeController({
    page: 'admin.sources.search',
    config: { routes: {}, api_base_path: '/admin/api/v1/esign' },
    model: { contract: SEARCH_RESULTS },
    marker: {},
    root,
  });

  controller.renderFromModel();

  assert.match(root.innerHTML, /rounded-xl mb-4 p-4 shadow-sm/, 'search toolbar should use shared list shell card');
  assert.match(root.innerHTML, /<table class="min-w-full divide-y divide-gray-200">/, 'search surface should render table results');
  assert.match(root.innerHTML, />Matched</, 'search surface should expose table columns for result metadata');
  assert.doesNotMatch(root.innerHTML, /class="block bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all"/, 'search surface should no longer render bespoke result cards');
});

// ============================================================================
// Search Result Link Correctness Tests
// ============================================================================

test('search controller stores query in state for link generation', async () => {
  const fetchCalls = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = createFetchStub(SEARCH_RESULTS, fetchCalls);

  try {
    const controller = new SourceSearchPageController({
      apiBasePath: '/admin/api/v1/esign',
    });

    await controller.search({
      query: 'agreement',
      provider_kind: 'google_docs',
      page: 1,
      page_size: 20,
    });

    const state = controller.getState();

    // Verify state has the query stored (not stale SSR links)
    assert.ok(state.contracts?.query, 'Should have query in state');
    assert.equal(state.contracts.query.query, 'agreement', 'query.query should match');
    assert.equal(state.contracts.query.provider_kind, 'google_docs', 'query.provider_kind should match');

    // Verify we have actual search results
    assert.ok(state.contracts.searchResults.items.length > 0, 'Should have search results');

    // Each item should have the data needed for link generation
    const firstItem = state.contracts.searchResults.items[0];
    assert.ok(firstItem.source?.id, 'Result should have source.id for link generation');
    assert.ok(firstItem.revision?.id, 'Result should have revision.id for link generation');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('search controller state updates correctly on pagination (links should reflect new page)', async () => {
  let pageRequested = 1;
  const fetchCalls = [];
  const historyCalls = [];
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalHistory = globalThis.history;

  globalThis.fetch = async (url) => {
    fetchCalls.push(String(url));
    // Return different results based on page
    const page2Results = {
      ...SEARCH_RESULTS,
      items: [
        {
          result_kind: 'source_revision',
          source: { id: 'src_PAGE2', label: 'Page 2 Result' },
          revision: { id: 'rev_PAGE2' },
          provider: { kind: 'google_docs' },
          summary: 'Page 2 Result',
          matched_fields: ['comment'],
          has_comments: true,
        },
      ],
      page_info: { page: 2, page_size: 20, total_count: 3 },
      applied_query: { query: 'test', page: 2 },
    };
    return {
      ok: true,
      async json() {
        return url.includes('page=2') ? page2Results : SEARCH_RESULTS;
      },
      async text() {
        return JSON.stringify(url.includes('page=2') ? page2Results : SEARCH_RESULTS);
      },
    };
  };

  globalThis.window = {
    location: {
      search: '?q=test',
      href: 'https://example.test/admin/esign/source-search?q=test',
    },
  };
  globalThis.history = createHistoryStub(historyCalls);

  try {
    const controller = new SourceSearchPageController({
      apiBasePath: '/admin/api/v1/esign',
    });

    await controller.init();

    // Get initial state
    const initialState = controller.getState();
    assert.equal(initialState.contracts?.searchResults.items[0].source?.id, 'src_01HX5ZCQK0ABC123');

    // Go to page 2
    await controller.goToPage(2);

    // Get new state
    const page2State = controller.getState();

    // Results should be different (page 2 results)
    assert.equal(page2State.contracts?.searchResults.items[0].source?.id, 'src_PAGE2', 'Should have page 2 results');
    assert.equal(page2State.contracts?.query?.page, 2, 'Query should reflect page 2');

    // URL should be updated
    const lastHistoryUrl = historyCalls[historyCalls.length - 1];
    assert.ok(lastHistoryUrl.includes('page=2'), 'URL should contain page=2');
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
    globalThis.history = originalHistory;
  }
});

test('search controller state updates correctly after new search (links should reflect new results)', async () => {
  const fetchCalls = [];
  const historyCalls = [];
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalHistory = globalThis.history;

  globalThis.fetch = async (url) => {
    fetchCalls.push(String(url));
    // Return different results based on query
    const newSearchResults = {
      ...SEARCH_RESULTS,
      items: [
        {
          result_kind: 'source_document',
          source: { id: 'src_NEW_SEARCH', label: 'New Search Result' },
          revision: { id: 'rev_NEW' },
          provider: { kind: 'google_drive' },
          summary: 'New Search Result',
          matched_fields: ['title'],
          has_comments: false,
        },
      ],
      page_info: { page: 1, page_size: 20, total_count: 1 },
      applied_query: { query: 'new search' },
    };
    return {
      ok: true,
      async json() {
        return url.includes('new+search') || url.includes('new%20search') ? newSearchResults : SEARCH_RESULTS;
      },
      async text() {
        return JSON.stringify(url.includes('new+search') || url.includes('new%20search') ? newSearchResults : SEARCH_RESULTS);
      },
    };
  };

  globalThis.window = {
    location: {
      search: '?q=agreement',
      href: 'https://example.test/admin/esign/source-search?q=agreement',
    },
  };
  globalThis.history = createHistoryStub(historyCalls);

  try {
    const controller = new SourceSearchPageController({
      apiBasePath: '/admin/api/v1/esign',
    });

    await controller.init();

    // Get initial state
    const initialState = controller.getState();
    assert.equal(initialState.contracts?.searchResults.items.length, 2);
    assert.equal(initialState.contracts?.searchResults.items[0].source?.id, 'src_01HX5ZCQK0ABC123');

    // Apply new search
    await controller.applyFilters({ query: 'new search' });

    // Get new state
    const newState = controller.getState();

    // Results should be different (new search results)
    assert.equal(newState.contracts?.searchResults.items.length, 1);
    assert.equal(newState.contracts?.searchResults.items[0].source?.id, 'src_NEW_SEARCH', 'Should have new search results');
    assert.equal(newState.contracts?.query?.query, 'new search', 'Query should reflect new search');

    // URL should be updated
    const lastHistoryUrl = historyCalls[historyCalls.length - 1];
    assert.ok(
      lastHistoryUrl.includes('q=new') || lastHistoryUrl.includes('q=new+search'),
      'URL should contain new search query'
    );
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
    globalThis.history = originalHistory;
  }
});

// ============================================================================
// URL State Preservation Tests
// ============================================================================

test('browser controller preserves existing params when applying partial filters', async () => {
  const fetchCalls = [];
  const historyCalls = [];
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalHistory = globalThis.history;

  globalThis.fetch = createFetchStub(SOURCE_LIST_SINGLE, fetchCalls);
  globalThis.window = {
    location: {
      search: '?q=enterprise&provider_kind=google_docs',
      href: 'https://example.test/admin/esign/sources?q=enterprise&provider_kind=google_docs',
    },
  };
  globalThis.history = createHistoryStub(historyCalls);

  try {
    const controller = new SourceBrowserPageController({
      apiBasePath: '/admin/api/v1/esign',
    });

    await controller.init();

    // Apply only status filter (should preserve q and provider_kind)
    await controller.applyFilters({ status: 'active' });

    const lastHistoryUrl = historyCalls[historyCalls.length - 1];

    // Should contain the new status
    assert.ok(lastHistoryUrl.includes('status=active'), 'URL should contain status=active');

    // Should preserve existing filters
    assert.ok(lastHistoryUrl.includes('q=enterprise'), 'URL should preserve q parameter');
    assert.ok(lastHistoryUrl.includes('provider_kind=google_docs'), 'URL should preserve provider_kind parameter');

    // Should reset to page 1
    assert.ok(lastHistoryUrl.includes('page=1'), 'URL should reset to page=1');
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
    globalThis.history = originalHistory;
  }
});

// ============================================================================
// Runtime Link Resolution Tests
// ============================================================================

test('translateSourceManagementHrefToRuntime falls back to source detail when workspace route is not registered', () => {
  const href = translateSourceManagementHrefToRuntime(
    '/admin/api/v1/esign/sources/src_123/workspace?panel=comments&anchor=thread:1',
    {
      base_path: '/admin',
      api_base_path: '/admin/api/v1/esign',
      routes: {
        source_detail: '/admin/esign/sources/:source_document_id',
      },
    },
    'tenant_id=tenant-1&user_id=ops-user&q=agreement'
  );

  assert.equal(
    href,
    '/admin/esign/sources/src_123?panel=comments&anchor=thread%3A1&tenant_id=tenant-1&user_id=ops-user&q=agreement'
  );
});

test('translateSourceManagementHrefToRuntime uses workspace UI route when registered and preserves query context', () => {
  const href = translateSourceManagementHrefToRuntime(
    '/admin/api/v1/esign/sources/src_123/workspace?panel=comments&anchor=thread:1',
    {
      base_path: '/admin',
      api_base_path: '/admin/api/v1/esign',
      routes: {
        source_detail: '/admin/esign/sources/:source_document_id',
        source_workspace: '/admin/esign/sources/:source_document_id/workspace',
      },
    },
    'tenant_id=tenant-1&user_id=ops-user&q=agreement'
  );

  assert.equal(
    href,
    '/admin/esign/sources/src_123/workspace?panel=comments&anchor=thread%3A1&tenant_id=tenant-1&user_id=ops-user&q=agreement'
  );
});

test('resolveBrowserItemRuntimeHref prefers backend-authored workspace link over client-built route templates', () => {
  const href = resolveBrowserItemRuntimeHref(
    {
      source: { id: 'src_01HX5ZCQK0ABC123', label: 'Enterprise Agreement' },
      status: 'active',
      lineage_confidence: 'high',
      provider: { kind: 'google_docs' },
      latest_revision: { id: 'rev_001' },
      active_handle: null,
      revision_count: 1,
      handle_count: 1,
      relationship_count: 0,
      pending_candidate_count: 0,
      permissions: {},
      links: {
        workspace: '/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123/workspace',
      },
    },
    {
      base_path: '/admin',
      api_base_path: '/admin/api/v1/esign',
      routes: {
        source_detail: '/admin/esign/sources/:source_document_id',
        source_workspace: '/admin/esign/sources/:source_document_id/workspace',
      },
    }
  );

  assert.equal(href, '/admin/esign/sources/src_01HX5ZCQK0ABC123/workspace');
  assert.equal(
    isRegisteredRuntimeHref(href, {
      source_detail: '/admin/esign/sources/:source_document_id',
      source_workspace: '/admin/esign/sources/:source_document_id/workspace',
    }),
    true
  );
});

test('resolveSearchResultRuntimeHref prefers backend-authored anchor/workspace drill-ins', () => {
  const searchHref = resolveSearchResultRuntimeHref(
    {
      result_kind: 'source_revision',
      source: { id: 'src_01HX5ZCQK0ABC456', label: 'Contract B' },
      revision: { id: 'rev_002' },
      provider: { kind: 'google_drive' },
      matched_fields: ['artifact'],
      links: {
        anchor: '/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC456/workspace?panel=artifacts&anchor=revision:rev_002',
      },
    },
    {
      base_path: '/admin',
      api_base_path: '/admin/api/v1/esign',
      routes: {
        source_detail: '/admin/esign/sources/:source_document_id',
        source_workspace: '/admin/esign/sources/:source_document_id/workspace',
        source_revision: '/admin/esign/source-revisions/:source_revision_id',
      },
    }
  );

  assert.equal(
    searchHref,
    '/admin/esign/sources/src_01HX5ZCQK0ABC456/workspace?panel=artifacts&anchor=revision%3Arev_002'
  );
  assert.equal(
    isRegisteredRuntimeHref(searchHref, {
      source_detail: '/admin/esign/sources/:source_document_id',
      source_workspace: '/admin/esign/sources/:source_document_id/workspace',
      source_revision: '/admin/esign/source-revisions/:source_revision_id',
    }),
    true
  );
});

test('resolveSearchResultRuntimeHref falls back to source detail when workspace route is unavailable', () => {
  const searchHref = resolveSearchResultRuntimeHref(
    {
      result_kind: 'source_revision',
      source: { id: 'src_01HX5ZCQK0ABC456', label: 'Contract B' },
      revision: { id: 'rev_002' },
      provider: { kind: 'google_drive' },
      matched_fields: ['artifact'],
      links: {
        anchor: '/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC456/workspace?panel=artifacts&anchor=revision:rev_002',
      },
    },
    {
      base_path: '/admin',
      api_base_path: '/admin/api/v1/esign',
      routes: {
        source_detail: '/admin/esign/sources/:source_document_id',
        source_revision: '/admin/esign/source-revisions/:source_revision_id',
      },
    }
  );

  assert.equal(
    searchHref,
    '/admin/esign/sources/src_01HX5ZCQK0ABC456?panel=artifacts&anchor=revision%3Arev_002'
  );
});

test('workspace controller fetches canonical workspace endpoint and preserves backend panel/anchor query state', async () => {
  const fetchCalls = [];
  const historyCalls = [];
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalHistory = globalThis.history;

  globalThis.fetch = createFetchStub(
    {
      source: { id: 'src_workspace', label: 'Workspace Source' },
      status: 'active',
      lineage_confidence: 'high',
      provider: { kind: 'google_docs', label: 'Google Docs' },
      active_handle: null,
      latest_revision: { id: 'rev_workspace', provider_revision_hint: 'v2' },
      revision_count: 2,
      handle_count: 1,
      relationship_count: 0,
      pending_candidate_count: 0,
      active_panel: 'comments',
      active_anchor: 'thread:1',
      panels: [
        {
          id: 'overview',
          label: 'Overview',
          links: { workspace: '/admin/api/v1/esign/sources/src_workspace/workspace' },
        },
        {
          id: 'comments',
          label: 'Comments',
          item_count: 1,
          links: {
            anchor: '/admin/api/v1/esign/sources/src_workspace/workspace?panel=comments&anchor=thread:1',
          },
        },
      ],
      continuity: { predecessors: [], successors: [], links: {} },
      timeline: { entries: [], permissions: {}, empty_state: { kind: 'none' }, links: {} },
      agreements: {
        source: { id: 'src_workspace', label: 'Workspace Source' },
        items: [],
        page_info: { mode: 'page', page: 1, page_size: 20, total_count: 0, has_more: false },
        applied_query: {},
        permissions: {},
        empty_state: { kind: 'none' },
        links: {},
      },
      artifacts: {
        source: { id: 'src_workspace', label: 'Workspace Source' },
        items: [],
        page_info: { mode: 'page', page: 1, page_size: 20, total_count: 0, has_more: false },
        permissions: {},
        empty_state: { kind: 'none' },
        links: {},
      },
      comments: {
        source: { id: 'src_workspace', label: 'Workspace Source' },
        revision: { id: 'rev_workspace' },
        items: [],
        applied_query: { page: 1 },
        page_info: { mode: 'page', page: 1, page_size: 20, total_count: 0, has_more: false },
        permissions: {},
        empty_state: { kind: 'none' },
        sync_status: 'synced',
        links: {},
      },
      handles: {
        source: { id: 'src_workspace', label: 'Workspace Source' },
        items: [],
        page_info: { mode: 'page', page: 1, page_size: 20, total_count: 0, has_more: false },
        permissions: {},
        empty_state: { kind: 'none' },
        links: {},
      },
      permissions: {},
      links: {
        workspace: '/admin/api/v1/esign/sources/src_workspace/workspace',
      },
      empty_state: { kind: 'none' },
    },
    fetchCalls
  );
  globalThis.window = {
    location: {
      search: '?panel=comments&anchor=thread:1',
      href: 'https://example.test/admin/esign/sources/src_workspace/workspace?panel=comments&anchor=thread:1',
    },
  };
  globalThis.history = createHistoryStub(historyCalls);

  try {
    const controller = new SourceWorkspacePageController({
      apiBasePath: '/admin/api/v1/esign',
      sourceId: 'src_workspace',
    });

    await controller.init();
    await controller.navigateToHref(
      '/admin/esign/sources/src_workspace/workspace?panel=overview'
    );

    assert.equal(
      fetchCalls[0],
      '/admin/api/v1/esign/sources/src_workspace/workspace?panel=comments&anchor=thread%3A1'
    );
    assert.equal(
      fetchCalls[1],
      '/admin/api/v1/esign/sources/src_workspace/workspace?panel=overview'
    );
    assert.ok(historyCalls[historyCalls.length - 1].includes('panel=overview'));
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
    globalThis.history = originalHistory;
  }
});

test('SOURCE_SEARCH_RESULT_KIND_OPTIONS stays aligned with the frozen Phase 13 contract values', () => {
  assert.deepEqual([...SOURCE_SEARCH_RESULT_KIND_OPTIONS], ['source_document', 'source_revision']);
});

test('source-management runtime centralizes shared shell render helpers for source inspectors', () => {
  const source = fs.readFileSync(sourceManagementRuntimeSourcePath, 'utf8');

  assert.match(source, /const runtimeSupportCardClass = 'rounded-lg border border-gray-200 bg-gray-50 p-4';/);
  assert.match(source, /const runtimeInspectorCardClass = 'rounded-xl border border-gray-200 bg-white p-6';/);
  assert.match(source, /function renderRuntimeRefreshButton\(action = 'refresh', label = 'Refresh'\): string/);
  assert.match(source, /function renderRuntimeSupportCard\(content: string, extraClass = ''\): string/);
  assert.match(source, /function renderRuntimeInspectorCard\(content: string, extraClass = ''\): string/);
  assert.match(source, /function renderWorkspacePage[\s\S]*renderRuntimeInspectorCard\(/);
  assert.match(source, /function renderRevisionInspector[\s\S]*renderRuntimeRefreshButton\(\)/);
  assert.match(source, /function renderArtifactInspector[\s\S]*renderRuntimeInspectorCard\(/);
  assert.match(source, /function renderCommentThread[\s\S]*renderRuntimeInspectorCard\(/);
});

test('source-management runtime initializes shared admin action menus from the package-level helper', () => {
  const source = fs.readFileSync(sourceManagementRuntimeSourcePath, 'utf8');

  assert.match(source, /function initAdminActionMenus\(root: ParentNode = document\): void/);
  assert.match(source, /document\.body\?\.dataset\.adminActionMenusInit !== 'true'/);
  assert.match(source, /document\.addEventListener\('click', \(event\) =>/);
  assert.match(source, /initAdminActionMenus\(document\);/);
});
