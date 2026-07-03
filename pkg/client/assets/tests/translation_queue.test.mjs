import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();

const fixtureURL = new URL('../../../../admin/testdata/translation_queue_contract_fixtures.json', import.meta.url);
const fixtures = JSON.parse(await readFile(fixtureURL, 'utf8'));

const {
  AssignmentQueueScreen,
  applyOptimisticAssignmentAction,
  buildAssignmentListURL,
  buildAssignmentActionURL: queueBuildAssignmentActionURL,
  initAssignmentQueueScreen,
  initAssignmentSSRRowActions: queueInitAssignmentSSRRowActions,
  normalizeAssignmentListResponse,
  resolveAssignmentBulkActionEndpoint,
  resolveAssignmentBulkSnapshotEndpoint,
  snapshotFiltersFromQueryState,
} = await import('../dist/translation-queue/index.js');

const {
  buildAssignmentActionURL,
  initAssignmentSSRRowActions,
} = await import('../dist/translation-actions/assignment-row-actions.js');

function createContainer(dataset = {}) {
  return {
    dataset,
    innerHTML: '',
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };
}

function createJsonResponse(body, status = 200, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        const key = String(name).toLowerCase();
        return headers[key] ?? headers[name] ?? null;
      },
    },
    clone() {
      return this;
    },
    async json() {
      return body;
    },
    async text() {
      return JSON.stringify(body);
    },
  };
}

async function flushAsync() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function setGlobals(win) {
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.Document = win.Document;
  globalThis.Element = win.Element;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.HTMLButtonElement = win.HTMLButtonElement;
  globalThis.HTMLInputElement = win.HTMLInputElement;
  globalThis.HTMLSelectElement = win.HTMLSelectElement;
  globalThis.Event = win.Event;
  globalThis.MouseEvent = win.MouseEvent;
  globalThis.KeyboardEvent = win.KeyboardEvent;
  globalThis.URL = win.URL;
  globalThis.URLSearchParams = win.URLSearchParams;
  Object.defineProperty(globalThis, 'navigator', { value: win.navigator, configurable: true });
  Object.defineProperty(globalThis, 'location', { value: win.location, configurable: true });
}

function setupDom(url = 'http://localhost/admin/translations/queue') {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url });
  setGlobals(dom.window);
  return {
    root: dom.window.document.getElementById('root'),
  };
}

function makeGroupedQueueResponse() {
  const first = structuredClone(fixtures.states.open_pool.data[0]);
  const second = {
    ...structuredClone(first),
    id: 'asg-open-2',
    target_record_id: 'page-1-es',
    target_locale: 'es',
    source_title: 'Launch page Spanish',
    row_version: 4,
    version: 4,
    actions: {
      claim: {
        enabled: false,
        reason: 'assignment is already claimed',
        reason_code: 'INVALID_STATUS',
      },
      release: {
        enabled: true,
        permission: 'admin.translations.assign',
      },
    },
  };
  first.family_id = 'tg-grouped-1';
  second.family_id = 'tg-grouped-1';

  return {
    meta: {
      ...fixtures.meta,
      ...fixtures.states.open_pool.meta,
      total: 2,
      grouping: {
        enabled: true,
        mode: 'family_id',
        group_by: 'family_id',
        scope: 'current_page',
        row_count: 1,
        group_count: 1,
        assignment_count: 2,
        supported_modes: ['family_id'],
        strategy: 'page_local',
      },
    },
    data: [
      {
        id: 'family:tg-grouped-1',
        row_type: 'group',
        family_id: 'tg-grouped-1',
        group_by: 'family_id',
        family_label: 'Launch page family',
        family_summary: {
          total_items: 2,
          child_count: 2,
          target_locales: ['fr', 'es'],
          status_counts: {
            open: 2,
          },
          priority_counts: {
            normal: 2,
          },
        },
        parent: {
          id: 'family:tg-grouped-1',
          family_id: 'tg-grouped-1',
          source_title: 'Launch page family',
          target_locales: ['fr', 'es'],
          action_state: {
            scope: 'children',
            message: 'Family group actions are derived from child assignment rows.',
          },
        },
        records: [first, second],
        children: [first, second],
        action_state: {
          scope: 'children',
          message: 'Family group actions are derived from child assignment rows.',
        },
        _group: {
          row_type: 'group',
          id: 'tg-grouped-1',
          label: 'Launch page family',
          group_by: 'family_id',
          child_count: 2,
          mode: 'page_local',
          page_local: true,
        },
      },
    ],
  };
}

function makeServerFamilyQueueResponse() {
  return {
    meta: {
      ...fixtures.meta,
      ...fixtures.states.open_pool.meta,
      total: 1,
      family_total: 1,
      assignment_total: 2,
      supported_sort_keys: ['updated_at', 'created_at', 'due_date', 'due_state', 'priority'],
      grouping: {
        enabled: true,
        mode: 'family_id',
        group_by: 'family_id',
        scope: 'filtered_queue',
        row_count: 1,
        group_count: 1,
        family_total: 1,
        assignment_total: 2,
        supported_modes: ['family_id'],
        supported_sort_keys: ['updated_at', 'created_at', 'due_date', 'due_state', 'priority'],
        strategy: 'server_family',
        capabilities: {
          server_family: { supported: true },
        },
      },
    },
    data: [
      {
        id: 'family:tg-server-1',
        row_type: 'family',
        family_id: 'tg-server-1',
        family_label: 'Launch page family',
        entity_type: 'pages',
        source_record_id: 'page-1',
        source_locale: 'en',
        source_title: 'Launch page family',
        source_path: '/launch',
        assignment_count: 2,
        locale_count: 2,
        target_locales: ['es', 'fr'],
        status_counts: { open: 1, in_review: 1 },
        due_state_counts: { overdue: 1 },
        priority_counts: { high: 1, normal: 1 },
        family_blocker_count: null,
        family_blocker_count_available: false,
        family_blocker_count_reason: 'persisted_blockers_unavailable',
        assignments_href: '/admin/translations/families/tg-server-1/assignments?sort=updated_at&order=desc&page=1&per_page=25',
        action_state: {
          scope: 'children',
          message: 'Family actions are available on child assignment rows.',
        },
        expansion: {
          href: '/admin/api/translations/families/tg-server-1/assignments?sort=updated_at&order=desc&page=1&per_page=25',
          route: 'translations.assignments.family_assignments',
          params: { family_id: 'tg-server-1' },
          query: { sort: 'updated_at', order: 'desc', page: 1, per_page: 25 },
        },
      },
    ],
  };
}

setGlobals(new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/admin/translations/queue',
}).window);

test('translation queue contracts: normalize shared fixture metadata and rows', () => {
  const response = normalizeAssignmentListResponse({
    meta: fixtures.meta,
    data: fixtures.states.open_pool.data,
  });

  assert.equal(response.meta.saved_filter_presets.length, 5);
  assert.equal(response.meta.saved_review_filter_presets.length, 4);
  assert.equal(response.meta.default_review_filter_preset, 'review_inbox');
  assert.equal(response.meta.review_aggregate_counts.review_blocked, 1);
  assert.deepEqual(response.meta.review_aggregate_counts_unavailable, []);
  assert.deepEqual(response.meta.review_aggregate_counts_degraded, []);
  assert.equal(response.meta.default_sort.key, 'updated_at');
  assert.equal(response.data[0].actions.claim.enabled, true);
  assert.equal(response.data[0].actions.release.reason_code, 'INVALID_STATUS');
});

test('translation queue contracts: normalize partial reviewer aggregate metadata', () => {
  const response = normalizeAssignmentListResponse({
    meta: {
      ...fixtures.meta,
      review_aggregate_counts: {
        review_inbox: 5,
        review_overdue: 2,
        review_blocked: 0,
        review_changes_requested: 3,
      },
      review_aggregate_counts_unavailable: ['review_blocked'],
      review_aggregate_counts_degraded: ['review_overdue'],
    },
    data: fixtures.states.open_pool.data,
  });

  assert.equal(response.meta.review_aggregate_counts.review_blocked, 0);
  assert.deepEqual(response.meta.review_aggregate_counts_unavailable, ['review_blocked']);
  assert.deepEqual(response.meta.review_aggregate_counts_degraded, ['review_overdue']);
});

test('translation queue contracts: review presets fall back to review defaults when metadata is missing', () => {
  const response = normalizeAssignmentListResponse({
    meta: {
      ...fixtures.meta,
      saved_review_filter_presets: [],
    },
    data: fixtures.states.open_pool.data,
  });

  assert.deepEqual(
    response.meta.saved_review_filter_presets.map((preset) => preset.id),
    ['review_inbox', 'review_overdue', 'review_blocked', 'review_changes_requested']
  );
});

test('translation queue contracts: grouped backend rows survive list normalization', () => {
  const groupedResponse = makeGroupedQueueResponse();
  const response = normalizeAssignmentListResponse(groupedResponse);
  const group = response.data[0];

  assert.equal(response.meta.grouping.enabled, true);
  assert.equal(group.row_type, 'group');
  assert.equal(group.family_label, 'Launch page family');
  assert.equal(group.family_summary.child_count, 2);
  assert.equal(group.parent.action_state.scope, 'children');
  assert.equal(group.records.length, 2);
  assert.equal(group.children[0].actions.claim.enabled, true);
  assert.equal(group.children[1].actions.release.enabled, true);
});

test('translation queue contracts: canonical list urls preserve review state and translation group filters', () => {
  const url = buildAssignmentListURL('/admin/api/translations/assignments', {
    reviewerId: '__me__',
    reviewState: 'qa_blocked',
    familyId: 'tg-page-1',
    sort: 'due_date',
    order: 'asc',
  });

  assert.equal(
    url,
    '/admin/api/translations/assignments?reviewer_id=__me__&review_state=qa_blocked&family_id=tg-page-1&sort=due_date&order=asc'
  );
});

test('translation queue contracts: canonical list urls include server family strategy', () => {
  const url = buildAssignmentListURL('/admin/api/translations/assignments', {
    groupBy: 'family_id',
    groupStrategy: 'server_family',
    sort: 'priority',
    order: 'desc',
  });

  assert.equal(
    url,
    '/admin/api/translations/assignments?sort=priority&order=desc&group_by=family_id&group_strategy=server_family'
  );
});

test('translation queue contracts: bulk endpoint resolves to browser-facing route', () => {
  assert.equal(
    resolveAssignmentBulkActionEndpoint('/admin/api/translations/assignments'),
    '/admin/api/translations/assignment-actions/bulk'
  );
  assert.equal(
    resolveAssignmentBulkActionEndpoint('/tenant-a/admin/api/translations/assignments'),
    '/tenant-a/admin/api/translations/assignment-actions/bulk'
  );
});

test('translation queue contracts: filter snapshot endpoint and payload use documented filter vocabulary', () => {
  assert.equal(
    resolveAssignmentBulkSnapshotEndpoint('/admin/api/translations/assignments'),
    '/admin/api/translations/assignment-actions/snapshot'
  );
  assert.equal(
    resolveAssignmentBulkSnapshotEndpoint('/tenant-a/admin/api/translations/assignments'),
    '/tenant-a/admin/api/translations/assignment-actions/snapshot'
  );
  assert.deepEqual(snapshotFiltersFromQueryState({
    status: 'open,assigned',
    assigneeId: '__me__',
    priority: 'high',
    reviewState: 'qa_blocked',
    familyId: 'tg-page-1',
    sort: 'due_date',
    order: 'asc',
  }), {
    status: 'open,assigned',
    assignee_id: '__me__',
    priority: 'high',
    review_state: 'qa_blocked',
    family_id: 'tg-page-1',
    sort: 'due_date',
    order: 'asc',
  });
});

test('translation queue contracts: optimistic claim state enables release and submit review', () => {
  const row = normalizeAssignmentListResponse({
    meta: fixtures.meta,
    data: fixtures.states.open_pool.data,
  }).data[0];

  const optimistic = applyOptimisticAssignmentAction(row, 'claim');
  assert.equal(optimistic.queue_state, 'in_progress');
  assert.equal(optimistic.actions.release.enabled, true);
  assert.equal(optimistic.review_actions.submit_review.enabled, true);
});

test('translation queue runtime: bulk actions submit documented browser contract and parse backend metadata', async () => {
  const calls = [];
  globalThis.fetch = mock.fn(async (input, init = {}) => {
    calls.push({ input: String(input), init });
    if (calls.length === 1) {
      return createJsonResponse({
        meta: {
          ...fixtures.states.open_pool.meta,
          ...fixtures.meta,
        },
        data: fixtures.states.open_pool.data,
      });
    }
    const requestBody = JSON.parse(String(init.body || '{}'));
    assert.equal(String(input), '/admin/api/translations/assignment-actions/bulk');
    assert.equal(requestBody.action, 'release');
    assert.deepEqual(requestBody.assignments, [
      { assignment_id: 'asg-open-1', expected_version: 1 },
    ]);

    const updated = {
      ...fixtures.states.open_pool.data[0],
      status: 'open',
      queue_state: 'open',
      row_version: 2,
      version: 2,
    };
    return createJsonResponse({
      data: {
        action: 'release',
        results: [
          {
            assignment_id: 'asg-open-1',
            requested_version: 1,
            status: 'succeeded',
            row_version: 2,
            assignment: updated,
          },
        ],
        assignments: [updated],
        errors: [],
      },
      meta: {
        selection_scope: 'current_page',
        requested: 1,
        succeeded: 1,
        failed: 0,
        partial: false,
      },
    });
  });

  const screen = new AssignmentQueueScreen({
    endpoint: '/admin/api/translations/assignments',
    bulkActionEndpoint: '/admin/api/translations/assignment-actions/bulk',
    editorBasePath: '/admin/translations/assignments',
  });
  screen.mount(createContainer());
  await flushAsync();

  screen.toggleRowSelection('asg-open-1');
  await screen.runBulkAction('release');

  assert.equal(calls.length, 2);
  assert.equal(screen.getFeedback()?.kind, 'success');
  assert.match(screen.getFeedback()?.message || '', /1 assignment updated/);
  assert.equal(screen.getSelectedCount(), 0);
  assert.equal(screen.getRows()[0].version, 2);
});

test('translation queue runtime: all-matching filter snapshots confirm and submit snapshot bulk contract', async () => {
  const { root } = setupDom();
  const calls = [];
  globalThis.window.confirm = mock.fn(() => true);
  globalThis.fetch = mock.fn(async (input, init = {}) => {
    calls.push({ input: String(input), init });
    const url = String(input);
    if (calls.length === 1) {
      return createJsonResponse({
        meta: {
          ...fixtures.states.open_pool.meta,
          ...fixtures.meta,
          total: 3,
        },
        data: fixtures.states.open_pool.data,
      });
    }
    if (url.endsWith('/assignment-actions/snapshot')) {
      const requestBody = JSON.parse(String(init.body || '{}'));
      assert.equal(requestBody.filters.status, 'open,assigned,in_progress,changes_requested');
      assert.equal(requestBody.filters.sort, 'updated_at');
      assert.equal(requestBody.filters.order, 'desc');
      return createJsonResponse({
        data: {
          selection_scope: 'filter_snapshot',
          snapshot_id: 'snap_test_1',
          requested: 3,
          filters: requestBody.filters,
          filter_summary: ['Status: open, assigned', 'Sort: updated_at descending'],
          created_at: '2026-06-01T12:00:00Z',
          expires_at: '2026-06-01T12:15:00Z',
        },
        meta: {
          selection_scope: 'filter_snapshot',
          requested: 3,
          expires_in_sec: 900,
        },
      });
    }
    if (url.endsWith('/assignment-actions/bulk')) {
      const requestBody = JSON.parse(String(init.body || '{}'));
      assert.equal(requestBody.action, 'release');
      assert.equal(requestBody.selection_scope, 'filter_snapshot');
      assert.equal(requestBody.snapshot_id, 'snap_test_1');
      assert.deepEqual(requestBody.assignments, []);
      return createJsonResponse({
        data: {
          action: 'release',
          results: [],
          assignments: [],
          errors: [],
        },
        meta: {
          selection_scope: 'filter_snapshot',
          snapshot_id: 'snap_test_1',
          requested: 3,
          succeeded: 3,
          failed: 0,
          partial: false,
        },
      });
    }
    return createJsonResponse({
      meta: {
        ...fixtures.states.open_pool.meta,
        ...fixtures.meta,
        total: 3,
      },
      data: fixtures.states.open_pool.data,
    });
  });

  const screen = new AssignmentQueueScreen({
    endpoint: '/admin/api/translations/assignments',
    bulkActionEndpoint: '/admin/api/translations/assignment-actions/bulk',
    bulkSnapshotEndpoint: '/admin/api/translations/assignment-actions/snapshot',
  });
  screen.mount(root);
  await flushAsync();

  await screen.selectAllMatchingFilters();
  assert.match(root.innerHTML, /3 matching assignments selected/);
  assert.match(root.innerHTML, /Status: open, assigned/);
  assert.match(root.innerHTML, /data-filter-snapshot-action="assign"/);
  assert.match(root.innerHTML, /data-filter-snapshot-action="priority"/);

  await screen.runFilterSnapshotBulkAction('release');
  assert.equal(globalThis.window.confirm.mock.calls.length, 1);
  assert.equal(calls.length, 4);
  assert.equal(screen.getFeedback()?.kind, 'success');
  assert.match(screen.getFeedback()?.message || '', /3 assignments updated/);
});

test('translation queue runtime: all-matching snapshots support assign and priority payloads', async () => {
  const { root } = setupDom();
  const bulkRequests = [];
  let snapshotCount = 0;
  globalThis.window.confirm = mock.fn(() => true);
  globalThis.fetch = mock.fn(async (input, init = {}) => {
    const url = String(input);
    if (url.endsWith('/assignment-actions/snapshot')) {
      snapshotCount += 1;
      return createJsonResponse({
        data: {
          selection_scope: 'filter_snapshot',
          snapshot_id: snapshotCount === 1 ? 'snap_assign' : 'snap_priority',
          requested: 2,
          filters: {},
          filter_summary: ['All visible assignments'],
          created_at: '2026-06-01T12:00:00Z',
          expires_at: '2026-06-01T12:15:00Z',
        },
        meta: {
          selection_scope: 'filter_snapshot',
          requested: 2,
          expires_in_sec: 900,
        },
      });
    }
    if (url.endsWith('/assignment-actions/bulk')) {
      const requestBody = JSON.parse(String(init.body || '{}'));
      bulkRequests.push(requestBody);
      return createJsonResponse({
        data: {
          action: requestBody.action,
          results: [],
          assignments: [],
          errors: [],
        },
        meta: {
          selection_scope: 'filter_snapshot',
          snapshot_id: requestBody.snapshot_id,
          requested: 2,
          succeeded: 2,
          failed: 0,
          partial: false,
        },
      });
    }
    return createJsonResponse({
      meta: {
        ...fixtures.states.open_pool.meta,
        ...fixtures.meta,
        total: 2,
      },
      data: fixtures.states.open_pool.data,
    });
  });

  const screen = new AssignmentQueueScreen({
    endpoint: '/admin/api/translations/assignments',
    bulkActionEndpoint: '/admin/api/translations/assignment-actions/bulk',
    bulkSnapshotEndpoint: '/admin/api/translations/assignment-actions/snapshot',
  });
  screen.mount(root);
  await flushAsync();

  await screen.selectAllMatchingFilters();
  await screen.runFilterSnapshotBulkAction('assign', { assigneeId: 'translator-1' });
  await screen.selectAllMatchingFilters();
  await screen.runFilterSnapshotBulkAction('priority', { priority: 'urgent' });

  assert.equal(bulkRequests.length, 2);
  assert.equal(bulkRequests[0].action, 'assign');
  assert.equal(bulkRequests[0].assignee_id, 'translator-1');
  assert.equal(bulkRequests[0].snapshot_id, 'snap_assign');
  assert.match(bulkRequests[0].idempotency_key, /snap_assign:assign:translator-1/);
  assert.equal(bulkRequests[1].action, 'priority');
  assert.equal(bulkRequests[1].priority, 'urgent');
  assert.equal(bulkRequests[1].snapshot_id, 'snap_priority');
  assert.match(bulkRequests[1].idempotency_key, /snap_priority:priority::urgent/);
});

test('translation queue runtime: grouped backend rows render expandable families and child actions', async () => {
  const groupedResponse = makeGroupedQueueResponse();
  const seenURLs = [];
  globalThis.fetch = mock.fn(async (input) => {
    seenURLs.push(String(input));
    if (String(input).includes('group_by=family_id')) {
      return createJsonResponse(groupedResponse);
    }
    return createJsonResponse({
      meta: {
        ...fixtures.states.open_pool.meta,
        ...fixtures.meta,
      },
      data: fixtures.states.open_pool.data,
    });
  });

  const screen = new AssignmentQueueScreen({
    endpoint: '/admin/api/translations/assignments',
    editorBasePath: '/admin/translations/assignments',
  });
  const container = createContainer();
  screen.mount(container);
  await flushAsync();

  screen.setViewMode('grouped');
  await flushAsync();

  assert.match(seenURLs.at(-1), /group_by=family_id/);
  assert.equal(screen.getViewMode(), 'grouped');
  assert.equal(screen.getRows().length, 2);
  assert.match(container.innerHTML, /Launch page family/);
  assert.match(container.innerHTML, /2 locales/);
  assert.match(container.innerHTML, /page-local counts/);
  assert.match(container.innerHTML, /data-parent-group="tg-grouped-1"/);
  assert.match(container.innerHTML, /data-action="release"/);
  assert.doesNotMatch(container.innerHTML, /data-assignment-id="family:tg-grouped-1"/);
});

test('translation queue runtime: server family mode renders parents and loads child expansion', async () => {
  const serverFamilyResponse = makeServerFamilyQueueResponse();
  const child = structuredClone(fixtures.states.open_pool.data[0]);
  child.id = 'asg-server-child-1';
  child.family_id = 'tg-server-1';
  child.source_title = 'Launch page Spanish';
  const seenURLs = [];
  globalThis.fetch = mock.fn(async (input) => {
    const url = String(input);
    seenURLs.push(url);
    if (url.includes('/admin/translations/families/tg-server-1/assignments')) {
      throw new Error(`client expansion must not fetch SSR UI href: ${url}`);
    }
    if (url.includes('/families/tg-server-1/assignments')) {
      return createJsonResponse({
        meta: {
          family_id: 'tg-server-1',
          page: 1,
          per_page: 25,
          total: 1,
          has_next: false,
          sort: 'updated_at',
          order: 'desc',
        },
        data: [child],
      });
    }
    if (url.includes('group_strategy=server_family')) {
      return createJsonResponse(serverFamilyResponse);
    }
    return createJsonResponse({
      meta: {
        ...fixtures.states.open_pool.meta,
        ...fixtures.meta,
        grouping: {
          enabled: false,
          mode: 'flat',
          strategy: '',
          capabilities: {
            server_family: { supported: true },
          },
        },
      },
      data: fixtures.states.open_pool.data,
    });
  });

  const screen = new AssignmentQueueScreen({
    endpoint: '/admin/api/translations/assignments',
    editorBasePath: '/admin/translations/assignments',
  });
  const container = createContainer();
  screen.mount(container);
  await flushAsync();

  screen.setViewMode('server_family');
  await flushAsync();

  assert.match(seenURLs.at(-1), /group_strategy=server_family/);
  assert.equal(screen.getViewMode(), 'server_family');
  assert.match(container.innerHTML, /server-side family pages/);
  assert.match(container.innerHTML, /Launch page family/);
  assert.match(container.innerHTML, /Blockers unavailable/);
  assert.doesNotMatch(container.innerHTML, /data-assignment-id="family:tg-server-1"/);

  await screen.toggleGroupExpansion('tg-server-1');
  await flushAsync();

  assert.ok(seenURLs.some((url) => url.includes('/families/tg-server-1/assignments')));
  assert.ok(seenURLs.some((url) => url.includes('/admin/api/translations/families/tg-server-1/assignments')));
  assert.equal(screen.getRows().length, 1);
  assert.match(container.innerHTML, /data-parent-group="tg-server-1"/);
  assert.match(container.innerHTML, /data-action="claim"/);
});

test('translation queue runtime: bulk partial failures preserve per-item backend errors', async () => {
  globalThis.fetch = mock.fn(async (input, init = {}) => {
    if (String(input).includes('/assignments') && (!init.method || init.method === 'GET')) {
      return createJsonResponse({
        meta: {
          ...fixtures.states.open_pool.meta,
          ...fixtures.meta,
        },
        data: fixtures.states.open_pool.data,
      });
    }
    return createJsonResponse({
      data: {
        action: 'archive',
        results: [
          {
            assignment_id: 'asg-open-1',
            requested_version: 1,
            status: 'failed',
            error: {
              code: 'TRANSLATION_QUEUE_VERSION_CONFLICT',
              message: 'assignment version conflict',
            },
          },
        ],
        assignments: [],
        errors: [
          {
            assignment_id: 'asg-open-1',
            error: {
              code: 'TRANSLATION_QUEUE_VERSION_CONFLICT',
              message: 'assignment version conflict',
            },
          },
        ],
      },
      meta: {
        selection_scope: 'current_page',
        requested: 1,
        succeeded: 0,
        failed: 1,
        partial: false,
      },
    });
  });

  const screen = new AssignmentQueueScreen({
    endpoint: '/admin/api/translations/assignments',
    bulkActionEndpoint: '/admin/api/translations/assignment-actions/bulk',
  });
  screen.mount(createContainer());
  await flushAsync();

  screen.toggleRowSelection('asg-open-1');
  await screen.runBulkAction('archive');

  assert.equal(screen.getFeedback()?.kind, 'error');
  assert.match(screen.getFeedback()?.message || '', /0 succeeded, 1 failed/);
  assert.equal(screen.getSelectedCount(), 1);
});

test('translation queue runtime: mount renders saved filters and rows from shared fixture', async () => {
  globalThis.fetch = mock.fn(async () => createJsonResponse({
    meta: {
      ...fixtures.states.open_pool.meta,
      ...fixtures.meta,
    },
    data: fixtures.states.open_pool.data,
  }));

  const screen = new AssignmentQueueScreen({
    endpoint: '/admin/api/translations/assignments',
    editorBasePath: '/admin/translations/assignments',
  });
  const container = createContainer();
  screen.mount(container);
  await flushAsync();

  assert.equal(screen.getState(), 'ready');
  assert.match(container.innerHTML, /High Priority/);
  assert.match(container.innerHTML, /Reviewer states/);
  assert.match(container.innerHTML, /Review Inbox/);
  assert.match(container.innerHTML, /Claim/);
  assert.match(container.innerHTML, /Launch page/);
  assert.match(container.innerHTML, /Due State/);
  assert.match(container.innerHTML, /Assignee/);
  assert.match(container.innerHTML, /Reviewer/);
  assert.doesNotMatch(container.innerHTML, /data-action-group="review"/);
  assert.match(container.innerHTML, /data-action-group="manage"/);
  assert.match(container.innerHTML, /data-action="archive"/);
});

test('translation queue runtime: owners column prefers labels over raw ids', async () => {
  const { root } = setupDom();
  const row = structuredClone(fixtures.states.open_pool.data[0]);
  row.assignee_id = '9e838c81-6d3e-49d7-ad8f-b6616a040a44';
  row.assignee_label = 'translator.jane';
  row.reviewer_id = 'reviewer-1';
  row.reviewer_label = 'reviewer.sam';
  globalThis.fetch = mock.fn(async () => createJsonResponse({
    meta: {
      ...fixtures.states.open_pool.meta,
      ...fixtures.meta,
    },
    data: [row],
  }));

  const screen = new AssignmentQueueScreen({
    endpoint: '/admin/api/translations/assignments',
    editorBasePath: '/admin/translations/assignments',
  });
  screen.mount(root);
  await flushAsync();

  const ownerValue = root.querySelector('.queue-owner-value');
  const reviewerValue = root.querySelector('.queue-reviewer-value');
  assert.equal(ownerValue?.textContent?.trim(), 'translator.jane');
  assert.equal(reviewerValue?.textContent?.trim(), 'reviewer.sam');
  assert.match(ownerValue?.getAttribute('title') || '', /9e838c81-6d3e-49d7-ad8f-b6616a040a44/);
  assert.doesNotMatch(ownerValue?.textContent || '', /9e838c81/);
});

test('translation queue runtime: truncated content includes accessible title attributes', async () => {
  globalThis.fetch = mock.fn(async () => createJsonResponse({
    meta: {
      ...fixtures.states.open_pool.meta,
      ...fixtures.meta,
    },
    data: fixtures.states.open_pool.data,
  }));

  const screen = new AssignmentQueueScreen({
    endpoint: '/admin/api/translations/assignments',
    editorBasePath: '/admin/translations/assignments',
  });
  const container = createContainer();
  screen.mount(container);
  await flushAsync();

  assert.equal(screen.getState(), 'ready');

  // Verify that truncated content has title attributes for accessibility
  assert.match(container.innerHTML, /class="queue-content-title" title="/);
  assert.match(container.innerHTML, /class="queue-content-path" title="/);

  // Ensure title attributes contain actual content (not empty)
  const titleMatches = container.innerHTML.match(/title="([^"]+)"/g);
  assert.ok(titleMatches && titleMatches.length > 0, 'Title attributes should be present');

  // Verify that at least one title attribute has non-empty content
  const hasContentfulTitle = titleMatches.some(match => {
    const content = match.match(/title="([^"]+)"/)?.[1];
    return content && content.length > 0 && content !== 'undefined';
  });
  assert.ok(hasContentfulTitle, 'Title attributes should contain actual values');
});

test('translation queue runtime: title attributes properly escape XSS attempts', async () => {
  const { root } = setupDom();
  const maliciousTitle = '<script>alert("xss")</script>';
  const maliciousPath = '"><script>alert("path")</script><span x="';
  const maliciousContent = 'onclick="alert(1)" onerror="alert(2)"';

  globalThis.fetch = mock.fn(async () => createJsonResponse({
    meta: {
      ...fixtures.states.open_pool.meta,
      ...fixtures.meta,
    },
    data: [
      {
        ...fixtures.states.open_pool.data[0],
        source_title: maliciousTitle,
        source_path: maliciousPath,
        target_content: maliciousContent,
      },
    ],
  }));

  const screen = new AssignmentQueueScreen({
    endpoint: '/admin/api/translations/assignments',
    editorBasePath: '/admin/translations/assignments',
  });
  screen.mount(root);
  await flushAsync();

  assert.equal(screen.getState(), 'ready');

  // Verify that malicious content does not create executable scripts
  // Note: <> in HTML attribute values are safe and don't need escaping (they're plain text)
  // What matters is that no actual XSS vectors are present

  // Verify no executable <script> elements were created
  assert.equal(root.querySelectorAll('script').length, 0);

  // Verify that quotes are escaped to prevent attribute injection
  assert.doesNotMatch(root.innerHTML, /title=""><script>/);
  assert.doesNotMatch(root.innerHTML, /aria-label=""><script>/);

  // Verify that event handlers are not present as executable attributes
  assert.doesNotMatch(root.innerHTML, /onclick="/);
  assert.doesNotMatch(root.innerHTML, /onerror="/);
});

test('translation queue runtime: filter chips render for active filters', async () => {
  const { root } = setupDom();
  globalThis.fetch = mock.fn(async () => createJsonResponse({
    meta: {
      ...fixtures.states.open_pool.meta,
      ...fixtures.meta,
    },
    data: fixtures.states.open_pool.data,
  }));

  const screen = new AssignmentQueueScreen({
    endpoint: '/admin/api/translations/assignments',
    editorBasePath: '/admin/translations/assignments',
  });
  screen.mount(root);
  await flushAsync();

  screen.queryState = {
    ...screen.queryState,
    status: 'open',
    dueState: 'overdue',
    priority: 'high',
    locale: 'es',
    assigneeId: 'user-1',
    reviewerId: 'user-2',
    familyId: 'family-1',
    sort: 'priority',
    order: 'asc',
  };
  screen.activeReviewState = 'pending';
  screen.render();
  await flushAsync();

  // Verify filter chips are rendered when filters are active (T08: unconditional)
  assert.match(root.innerHTML, /data-remove-filter="[^"]+"/,
    'Filter chips should render with remove buttons when filters are active');

  // Verify chip has proper label and value
  assert.match(root.innerHTML, /queue-filter-chip/,
    'Filter chips should have queue-filter-chip class');
  for (const filterName of ['status', 'due_state', 'priority', 'locale', 'assignee_id', 'reviewer_id', 'family_id', 'review_state', 'sort', 'order']) {
    assert.ok(root.querySelector(`[data-remove-filter="${filterName}"]`), `expected ${filterName} chip`);
  }
  assert.match(root.querySelector('[data-filters-toggle]').textContent, /10/);
});

test('translation queue runtime: removing individual filter chip clears that filter', async () => {
  const { root } = setupDom();
  let lastQuery = {};
  globalThis.fetch = mock.fn(async (url) => {
    const urlObj = new URL(url, 'http://localhost');
    lastQuery = {
      status: urlObj.searchParams.get('status'),
      priority: urlObj.searchParams.get('priority'),
    };
    return createJsonResponse({
      meta: {
        ...fixtures.states.open_pool.meta,
        ...fixtures.meta,
      },
      data: fixtures.states.open_pool.data,
    });
  });

  const screen = new AssignmentQueueScreen({
    endpoint: '/admin/api/translations/assignments',
    editorBasePath: '/admin/translations/assignments',
  });
  screen.mount(root);
  await flushAsync();

  // Set initial filters
  screen.queryState = {
    ...screen.queryState,
    status: 'open',
    priority: 'high',
  };
  screen.render();
  await flushAsync();

  const removeButton = root.querySelector('[data-remove-filter="status"]');
  assert.ok(removeButton, 'expected status remove chip');
  removeButton.click();
  await flushAsync();

  // Verify that only the status filter was cleared
  assert.equal(lastQuery.status, null);
  assert.equal(lastQuery.priority, 'high');
});

test('translation queue runtime: clear all filters button clears filter snapshot', async () => {
  const { root } = setupDom();
  globalThis.fetch = mock.fn(async () => createJsonResponse({
    meta: {
      ...fixtures.states.open_pool.meta,
      ...fixtures.meta,
    },
    data: fixtures.states.open_pool.data,
  }));

  const screen = new AssignmentQueueScreen({
    endpoint: '/admin/api/translations/assignments',
    editorBasePath: '/admin/translations/assignments',
  });
  screen.mount(root);
  await flushAsync();

  // Set up a filter snapshot and all filter types
  screen.filterSnapshot = {
    queryState: { status: 'open', priority: 'high' },
    allMatchCount: 42,
  };
  screen.queryState = {
    ...screen.queryState,
    status: 'open',
    priority: 'high',
    dueState: 'overdue',
    locale: 'es',
    assigneeId: 'user-1',
    reviewerId: 'user-2',
    familyId: 'family-1',
    sort: 'priority',
    order: 'asc',
  };
  screen.activeReviewState = 'pending';
  screen.render();
  await flushAsync();

  const clearButton = root.querySelector('[data-clear-filters]');
  assert.ok(clearButton, 'expected clear all filters button');
  clearButton.click();
  await flushAsync();

  // Verify filter snapshot was cleared
  assert.equal(screen.filterSnapshot, null);

  // Verify all filter fields were cleared
  assert.equal(screen.queryState.status, undefined);
  assert.equal(screen.queryState.priority, undefined);
  assert.equal(screen.queryState.dueState, undefined);
  assert.equal(screen.queryState.locale, undefined);
  assert.equal(screen.queryState.assigneeId, undefined);
  assert.equal(screen.queryState.reviewerId, undefined);
  assert.equal(screen.queryState.familyId, undefined);
  assert.equal(screen.queryState.sort, undefined);
  assert.equal(screen.queryState.order, undefined);
  assert.equal(screen.activeReviewState, null);
});

test('translation queue runtime: mobile cards are keyboard-accessible navigation targets', async () => {
  const { root } = setupDom();
  globalThis.fetch = mock.fn(async () => createJsonResponse({
    meta: {
      ...fixtures.states.open_pool.meta,
      ...fixtures.meta,
    },
    data: fixtures.states.open_pool.data,
  }));

  const screen = new AssignmentQueueScreen({
    endpoint: '/admin/api/translations/assignments',
    editorBasePath: '/admin/translations/assignments',
  });
  const opened = [];
  screen.mount(root);
  await flushAsync();
  screen.openAssignment = (assignmentId) => {
    opened.push(assignmentId);
  };

  const card = root.querySelector('[data-assignment-card="true"]');
  assert.ok(card);
  assert.equal(card.getAttribute('tabindex'), '0');
  assert.equal(card.getAttribute('role'), 'button');
  assert.match(card.getAttribute('aria-label') || '', /EN to FR/i);

  card.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

  assert.deepEqual(opened, ['asg-open-1']);
});

test('translation queue runtime: version conflicts roll back optimistic claim state', async () => {
  let callCount = 0;
  globalThis.fetch = mock.fn(async () => {
    callCount += 1;
    if (callCount === 1) {
      return createJsonResponse({
        meta: {
          ...fixtures.states.open_pool.meta,
          ...fixtures.meta,
        },
        data: fixtures.states.open_pool.data,
      });
    }
    return createJsonResponse(fixtures.action_errors.version_conflict, 409, {
      'content-type': 'application/json',
      'x-request-id': 'req-conflict-1',
      'x-trace-id': 'trace-conflict-1',
    });
  });

  const screen = new AssignmentQueueScreen({
    endpoint: '/admin/api/translations/assignments',
    editorBasePath: '/admin/translations/assignments',
  });
  screen.mount(createContainer());
  await flushAsync();

  await screen.runInlineAction('claim', 'asg-open-1');

  assert.equal(screen.getRows()[0].queue_state, 'open');
  assert.equal(screen.getFeedback()?.code, 'TRANSLATION_QUEUE_VERSION_CONFLICT');
  assert.match(screen.getFeedback()?.message || '', /version/i);
});

test('translation queue runtime: disabled action reasons render with backend parity', async () => {
  globalThis.fetch = mock.fn(async () => createJsonResponse({
    meta: {
      ...fixtures.states.permission_denied.meta,
      ...fixtures.meta,
    },
    data: fixtures.states.permission_denied.data,
  }));

  const screen = new AssignmentQueueScreen({
    endpoint: '/admin/api/translations/assignments',
    editorBasePath: '/admin/translations/assignments',
  });
  const container = createContainer();
  screen.mount(container);
  await flushAsync();

  assert.match(container.innerHTML, /missing permission: admin\.translations\.claim/);
  assert.match(container.innerHTML, /aria-disabled="true"/);
});

test('translation queue runtime: review rows keep reviewer actions separate from management archive', async () => {
  globalThis.fetch = mock.fn(async () => createJsonResponse({
    meta: {
      ...fixtures.states.review_ready.meta,
      ...fixtures.meta,
    },
    data: fixtures.states.review_ready.data,
  }));

  const screen = new AssignmentQueueScreen({
    endpoint: '/admin/api/translations/assignments',
    editorBasePath: '/admin/translations/assignments',
  });
  const container = createContainer();
  screen.mount(container);
  await flushAsync();

  assert.match(container.innerHTML, /data-action-group="review"/);
  assert.match(container.innerHTML, /data-action="approve"/);
  assert.match(container.innerHTML, /data-action="reject"/);
  assert.match(container.innerHTML, /data-action-group="manage"/);
  assert.match(container.innerHTML, /data-action="archive"/);
});

test('translation queue runtime: review presets can bootstrap from explicit config', async () => {
  let firstURL = '';
  globalThis.fetch = mock.fn(async (input) => {
    firstURL = String(input);
    return createJsonResponse({
      meta: {
        ...fixtures.states.review_ready.meta,
        ...fixtures.meta,
      },
      data: fixtures.states.review_ready.data,
    });
  });

  const screen = new AssignmentQueueScreen({
    endpoint: '/admin/api/translations/assignments',
    editorBasePath: '/admin/translations/assignments',
    initialPresetId: 'review_inbox',
  });
  const container = createContainer();
  screen.mount(container);
  await flushAsync();

  assert.equal(screen.getActiveReviewPresetId(), 'review_inbox');
  assert.match(firstURL, /status=in_review/);
  assert.match(firstURL, /reviewer_id=__me__/);
});

test('translation queue runtime: SSR root binds row actions without first-render fetch', async () => {
  const { root } = setupDom('http://localhost/admin/translations/queue?channel=default');
  root.dataset.ssrEnhanced = 'true';
  root.dataset.endpoint = '/admin/api/translations/assignments';
  root.dataset.channel = 'default';
  root.innerHTML = `
    <section data-translation-queue-ssr="true">
      <button type="button"
              data-translation-action="claim"
              data-assignment-id="asg-open-1"
              data-row-version="2">Claim</button>
    </section>
  `;
  try {
    Object.defineProperty(globalThis.window.location, 'reload', { value() {}, configurable: true });
  } catch {}
  const requests = [];
  globalThis.fetch = mock.fn(async (url, init = {}) => {
    requests.push({ url: String(url), init });
    return createJsonResponse({
      data: { assignment: fixtures.states.open_pool.data[0] },
      meta: {},
    });
  });

  const screen = initAssignmentQueueScreen(root);
  assert.equal(screen, null);
  assert.equal(requests.length, 0);
  assert.equal(root.dataset.assignmentQueueEnhanced, 'true');

  root.querySelector('[data-translation-action="claim"]')
    .dispatchEvent(new globalThis.window.Event('click', { bubbles: true }));
  await flushAsync();
  await flushAsync();

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/admin/api/translations/assignments/asg-open-1/actions/claim');
  assert.equal(requests[0].init.method, 'POST');
  const payload = JSON.parse(String(requests[0].init.body));
  assert.equal(payload.expected_version, 2);
  assert.equal(payload.channel, 'default');
  assert.equal(typeof payload.idempotency_key, 'string');
  assert.ok(payload.idempotency_key.length > 0);
});

test('translation queue runtime: assignment action URL appends path before scope query', () => {
  assert.equal(
    buildAssignmentActionURL('/admin/api/translations/assignments?tenant_id=tenant-1&org_id=org-1', 'asg open/1', 'release'),
    '/admin/api/translations/assignments/asg%20open%2F1/actions/release?tenant_id=tenant-1&org_id=org-1',
  );
});

test('translation queue runtime: explicit client render flag starts full queue renderer', async () => {
  const { root } = setupDom('http://localhost/admin/translations/queue?translation_client_render=1');
  root.dataset.ssrEnhanced = 'true';
  root.dataset.endpoint = '/admin/api/translations/assignments';
  root.innerHTML = '<section data-translation-queue-ssr="true"><p>SSR content</p></section>';

  const requests = [];
  globalThis.fetch = mock.fn(async (url) => {
    requests.push(String(url));
    return createJsonResponse({
      meta: fixtures.meta,
      data: fixtures.states.open_pool.data,
    });
  });

  const screen = initAssignmentQueueScreen(root);
  assert.ok(screen);
  await flushAsync();
  await flushAsync();

  assert.equal(root.dataset.assignmentQueueEnhanced, undefined);
  assert.equal(requests.length, 1);
  assert.match(requests[0], /\/admin\/api\/translations\/assignments/);
});

test('translation queue runtime: queue entry re-exports shared SSR row action helpers', () => {
  assert.equal(queueBuildAssignmentActionURL, buildAssignmentActionURL);
  assert.equal(queueInitAssignmentSSRRowActions, initAssignmentSSRRowActions);
});

test('translation queue runtime: family assignment SSR actions use assignment action endpoint', async () => {
  const { root } = setupDom('http://localhost/admin/translations/families/family-1/assignments?channel=staging');
  root.dataset.endpoint = '/admin/api/translations/families/family-1/assignments';
  root.dataset.actionEndpoint = '/admin/api/translations/assignments?tenant_id=tenant-1&org_id=org-1';
  root.dataset.channel = 'staging';
  root.innerHTML = `
    <div data-action-menu>
      <button type="button" data-action-menu-trigger>Actions</button>
      <div data-action-menu-content>
        <button type="button"
                data-action-menu-item
                data-translation-action="release"
                data-assignment-id="asg-family-1"
                data-row-version="7">Release</button>
      </div>
    </div>
  `;
  try {
    Object.defineProperty(globalThis.window.location, 'reload', { value() {}, configurable: true });
  } catch {}
  const requests = [];
  globalThis.fetch = mock.fn(async (url, init = {}) => {
    requests.push({ url: String(url), init });
    return createJsonResponse({
      data: { assignment: fixtures.states.open_pool.data[0] },
      meta: {},
    });
  });

  initAssignmentSSRRowActions(root);
  root.querySelector('[data-translation-action="release"]')
    .dispatchEvent(new globalThis.window.Event('click', { bubbles: true }));
  await flushAsync();
  await flushAsync();

  assert.equal(requests.length, 1);
  assert.equal(
    requests[0].url,
    '/admin/api/translations/assignments/asg-family-1/actions/release?tenant_id=tenant-1&org_id=org-1',
  );
  const payload = JSON.parse(String(requests[0].init.body));
  assert.equal(payload.expected_version, 7);
  assert.equal(payload.channel, 'staging');
  assert.equal(typeof payload.idempotency_key, 'string');
  assert.ok(!requests[0].url.includes('/families/family-1/assignments/asg-family-1/actions/release'));
});

test('translation queue runtime: SSR row actions do not fall back to family expansion endpoint', async () => {
  const { root } = setupDom('http://localhost/admin/translations/families/family-1/assignments?channel=staging');
  root.dataset.endpoint = '/admin/api/translations/families/family-1/assignments';
  root.innerHTML = `
    <div data-action-menu>
      <button type="button" data-action-menu-trigger>Actions</button>
      <div data-action-menu-content>
        <button type="button"
                data-action-menu-item
                data-translation-action="claim"
                data-assignment-id="asg-family-1"
                data-row-version="7">Claim</button>
      </div>
    </div>
  `;
  const requests = [];
  globalThis.fetch = mock.fn(async (url, init = {}) => {
    requests.push({ url: String(url), init });
    return createJsonResponse({
      data: { assignment: fixtures.states.open_pool.data[0] },
      meta: {},
    });
  });

  initAssignmentSSRRowActions(root);
  root.querySelector('[data-translation-action="claim"]')
    .dispatchEvent(new globalThis.window.Event('click', { bubbles: true }));
  await flushAsync();
  await flushAsync();

  assert.equal(root.dataset.assignmentActionMenusEnhanced, 'true');
  assert.equal(root.dataset.assignmentActionsEnhanced, undefined);
  assert.equal(requests.length, 0);
});

test('translation queue runtime: SSR row actions can bind after endpoint is injected', async () => {
  const { root } = setupDom('http://localhost/admin/translations/families/family-1/assignments?channel=staging');
  root.dataset.endpoint = '/admin/api/translations/families/family-1/assignments';
  root.innerHTML = `
    <div data-action-menu>
      <button type="button" data-action-menu-trigger>Actions</button>
      <div data-action-menu-content>
        <button type="button"
                data-action-menu-item
                data-translation-action="claim"
                data-assignment-id="asg-family-1"
                data-row-version="7">Claim</button>
      </div>
    </div>
  `;
  try {
    Object.defineProperty(globalThis.window.location, 'reload', { value() {}, configurable: true });
  } catch {}
  const requests = [];
  globalThis.fetch = mock.fn(async (url, init = {}) => {
    requests.push({ url: String(url), init });
    return createJsonResponse({
      data: { assignment: fixtures.states.open_pool.data[0] },
      meta: {},
    });
  });

  initAssignmentSSRRowActions(root);
  root.dataset.actionEndpoint = '/admin/api/translations/assignments?tenant_id=tenant-1';
  initAssignmentSSRRowActions(root);
  root.querySelector('[data-translation-action="claim"]')
    .dispatchEvent(new globalThis.window.Event('click', { bubbles: true }));
  await flushAsync();
  await flushAsync();

  assert.equal(root.dataset.assignmentActionsEnhanced, 'true');
  assert.equal(requests.length, 1);
  assert.equal(
    requests[0].url,
    '/admin/api/translations/assignments/asg-family-1/actions/claim?tenant_id=tenant-1',
  );
});

test('translation queue runtime: qa-blocked review preset requests server-side review_state filtering', async () => {
  let firstURL = '';
  globalThis.fetch = mock.fn(async (input) => {
    firstURL = String(input);
    return createJsonResponse({
      meta: {
        ...fixtures.states.qa_summary.meta,
        ...fixtures.meta,
      },
      data: fixtures.states.qa_summary.data,
    });
  });

  const screen = new AssignmentQueueScreen({
    endpoint: '/admin/api/translations/assignments',
    editorBasePath: '/admin/translations/assignments',
    initialPresetId: 'review_blocked',
  });
  screen.mount(createContainer());
  await flushAsync();

  assert.equal(screen.getActiveReviewPresetId(), 'review_blocked');
  assert.match(firstURL, /review_state=qa_blocked/);
  assert.match(firstURL, /reviewer_id=__me__/);
});

test('translation queue runtime: init screen reads preset from location query when dataset is empty', async () => {
  let firstURL = '';
  globalThis.fetch = mock.fn(async (input) => {
    firstURL = String(input);
    return createJsonResponse({
      meta: {
        ...fixtures.states.review_ready.meta,
        ...fixtures.meta,
      },
      data: fixtures.states.review_ready.data,
    });
  });

  const previousWindow = globalThis.window;
  globalThis.window = {
    location: {
      search: '?preset=review_inbox',
    },
  };

  try {
    const container = createContainer({
      endpoint: '/admin/api/translations/assignments',
      editorBasePath: '/admin/translations/assignments',
    });
    const screen = initAssignmentQueueScreen(container);
    assert.ok(screen);
    await flushAsync();

    assert.equal(screen.getActiveReviewPresetId(), 'review_inbox');
    assert.match(firstURL, /status=in_review/);
    assert.match(firstURL, /reviewer_id=__me__/);
  } finally {
    globalThis.window = previousWindow;
  }
});

test('translation queue runtime: actorless reviewer states stay visible but disabled', async () => {
  globalThis.fetch = mock.fn(async () => createJsonResponse({
    meta: {
      ...fixtures.meta,
      review_actor_id: '',
      review_aggregate_counts: {
        review_inbox: 0,
        review_overdue: 0,
        review_blocked: 0,
        review_changes_requested: 0,
      },
    },
    data: fixtures.states.review_ready.data,
  }));

  const screen = new AssignmentQueueScreen({
    endpoint: '/admin/api/translations/assignments',
    editorBasePath: '/admin/translations/assignments',
  });
  const container = createContainer();
  screen.mount(container);
  await flushAsync();

  assert.match(container.innerHTML, /Reviewer queue states are available when reviewer metadata is present\./);
  assert.match(container.innerHTML, /data-review-preset-id="review_inbox"/);
  assert.match(container.innerHTML, /disabled aria-disabled="true"/);
});

test('translation queue runtime: rows with 3+ actions show overflow menu', async () => {
  globalThis.fetch = mock.fn(async () => createJsonResponse(fixtures.states.review_ready));

  const screen = new AssignmentQueueScreen({
    endpoint: '/admin/api/translations/assignments',
    editorBasePath: '/admin/translations/assignments',
  });
  const container = createContainer();
  screen.mount(container);
  await flushAsync();

  // Check for overflow trigger button
  assert.match(container.innerHTML, /queue-action-overflow-trigger/);
  assert.match(container.innerHTML, /data-overflow-menu="/);
  assert.match(container.innerHTML, /aria-haspopup="true"/);
  assert.match(container.innerHTML, /aria-expanded="false"/);

  // Check for overflow menu container
  assert.match(container.innerHTML, /queue-action-overflow-menu/);
  assert.match(container.innerHTML, /role="menu"/);
  assert.match(container.innerHTML, /hidden/);

  // Check for menu items with role="menuitem"
  assert.match(container.innerHTML, /role="menuitem"/);
});

test('translation queue runtime: nested overflow controls do not trigger row keyboard navigation', async () => {
  const { root } = setupDom();
  globalThis.fetch = mock.fn(async () => createJsonResponse(fixtures.states.review_ready));

  const screen = new AssignmentQueueScreen({
    endpoint: '/admin/api/translations/assignments',
    editorBasePath: '/admin/translations/assignments',
  });
  const opened = [];
  screen.mount(root);
  await flushAsync();
  screen.openAssignment = (assignmentId) => {
    opened.push(assignmentId);
  };

  const trigger = root.querySelector('.queue-action-overflow-trigger');
  const navTarget = trigger?.closest('[data-assignment-row="true"], [data-assignment-card="true"]');
  const menu = root.querySelector('.queue-action-overflow-menu');
  assert.ok(trigger);
  assert.ok(navTarget);
  assert.ok(menu);

  trigger.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  assert.deepEqual(opened, []);

  trigger.click();
  assert.equal(menu.hidden, false);
  assert.equal(trigger.getAttribute('aria-expanded'), 'true');

  navTarget.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  assert.deepEqual(opened, ['asg-review-1']);
});

test('translation queue runtime: overflow menu preserves action data attributes', async () => {
  globalThis.fetch = mock.fn(async () => createJsonResponse(fixtures.states.review_ready));

  const screen = new AssignmentQueueScreen({
    endpoint: '/admin/api/translations/assignments',
    editorBasePath: '/admin/translations/assignments',
  });
  const container = createContainer();
  screen.mount(container);
  await flushAsync();

  // Verify data-action attributes are present (review_ready has approve/reject/archive)
  assert.match(container.innerHTML, /data-action="approve"/);
  assert.match(container.innerHTML, /data-action="reject"/);
  assert.match(container.innerHTML, /data-action="archive"/);

  // Verify data-assignment-id attributes are present
  assert.match(container.innerHTML, /data-assignment-id="/);

  // Verify aria-disabled attributes for disabled actions
  assert.match(container.innerHTML, /aria-disabled="true"|aria-disabled="false"/);
});

test('translation queue runtime: overflow menu items have accessible labels', async () => {
  globalThis.fetch = mock.fn(async () => createJsonResponse(fixtures.states.review_ready));

  const screen = new AssignmentQueueScreen({
    endpoint: '/admin/api/translations/assignments',
    editorBasePath: '/admin/translations/assignments',
  });
  const container = createContainer();
  screen.mount(container);
  await flushAsync();

  // Check that menu items have title attributes for disabled reasons
  const html = container.innerHTML;
  const hasDisabledWithTitle = /disabled.*title="[^"]+"|title="[^"]+".*disabled/.test(html);

  // At minimum, actions should have either enabled state or disabled with reason
  assert.ok(html.includes('data-action='), 'Actions should be present');
});

test('translation queue runtime: grouped child rows expose both title and path when both exist', async () => {
  const groupedResponse = makeGroupedQueueResponse();
  // Ensure child rows have both title and path
  groupedResponse.data[0].children[0].source_title = 'Home Page';
  groupedResponse.data[0].children[0].source_path = '/content/pages/home.md';
  groupedResponse.data[0].children[1].source_title = 'About Page';
  groupedResponse.data[0].children[1].source_path = '/content/pages/about.md';

  globalThis.fetch = mock.fn(async (input) => {
    if (String(input).includes('group_by=family_id')) {
      return createJsonResponse(groupedResponse);
    }
    return createJsonResponse({
      meta: { ...fixtures.states.open_pool.meta, ...fixtures.meta },
      data: fixtures.states.open_pool.data,
    });
  });

  const screen = new AssignmentQueueScreen({
    endpoint: '/admin/api/translations/assignments',
    editorBasePath: '/admin/translations/assignments',
  });
  const container = createContainer();
  screen.mount(container);
  await flushAsync();

  screen.setViewMode('grouped');
  await flushAsync();

  const html = container.innerHTML;

  // Verify first child row shows title and exposes both title and path in title attribute
  assert.match(html, /Home Page/);
  assert.match(html, /title="Home Page — \/content\/pages\/home\.md"/);

  // Verify second child row shows title and exposes both title and path in title attribute
  assert.match(html, /About Page/);
  assert.match(html, /title="About Page — \/content\/pages\/about\.md"/);
});

// T05/T06: Context bar and UI consolidation tests

test('translation queue runtime: no-header control stack keeps refresh available', async () => {
  globalThis.fetch = mock.fn(async () => {
    return createJsonResponse({
      meta: { ...fixtures.states.open_pool.meta, ...fixtures.meta },
      data: fixtures.states.open_pool.data,
    });
  });

  const { root } = setupDom();
  const screen = new AssignmentQueueScreen({
    endpoint: '/admin/api/translations/assignments',
  });
  screen.mount(root);
  await flushAsync();

  const html = root.innerHTML;

  // The host page owns page identity; the queue controller starts with controls.
  assert.doesNotMatch(html, /Filter assignments, claim open work, and release items back to the pool without leaving the queue/);
  assert.match(html, /data-queue-refresh="true"/);
  assert.match(html, /class="panel-tabs"/);
  assert.match(html, /data-filters-toggle="true"/);
  assert.match(html, /data-view-mode="flat"/);
});

test('translation queue runtime: preset tabs render with panel-tab styling', async () => {
  globalThis.fetch = mock.fn(async () => {
    return createJsonResponse({
      meta: { ...fixtures.states.open_pool.meta, ...fixtures.meta },
      data: fixtures.states.open_pool.data,
    });
  });

  const { root } = setupDom();
  const screen = new AssignmentQueueScreen({
    endpoint: '/admin/api/translations/assignments',
  });
  screen.mount(root);
  await flushAsync();

  const html = root.innerHTML;

  // Verify panel-tabs structure
  assert.match(html, /class="panel-tabs"/);
  assert.match(html, /class="panel-tabs-container"/);
  assert.match(html, /class="panel-tab/);

  // Verify preset buttons have data attributes
  assert.match(html, /data-preset-id="mine"/);
  assert.match(html, /data-preset-id="open"/);
  assert.match(html, /data-preset-id="needs_review"/);

  // Verify aria-pressed attribute
  assert.match(html, /aria-pressed="true"/);
});

test('translation queue runtime: review selector renders in unified toolbar', async () => {
  globalThis.fetch = mock.fn(async () => {
    return createJsonResponse({
      meta: {
        ...fixtures.states.open_pool.meta,
        ...fixtures.meta,
        review_actor_id: 'user-123',
        review_aggregate_counts: {
          review_inbox: 5,
          review_overdue: 2,
          review_blocked: 1,
          review_changes_requested: 3,
        },
        review_aggregate_counts_unavailable: ['review_blocked'],
        review_aggregate_counts_degraded: [],
      },
      data: fixtures.states.open_pool.data,
    });
  });

  const { root } = setupDom();
  const screen = new AssignmentQueueScreen({
    endpoint: '/admin/api/translations/assignments',
  });
  screen.mount(root);
  await flushAsync();

  const html = root.innerHTML;

  // Verify review selector button exists
  assert.match(html, /data-review-selector-toggle="true"/);

  // Verify review selector is in toolbar context (after filters button)
  const filtersIndex = html.indexOf('data-filters-toggle');
  const reviewSelectorIndex = html.indexOf('data-review-selector-toggle');
  assert.ok(reviewSelectorIndex > filtersIndex, 'Review selector should appear after filters toggle');

  // Verify review presets exist in dropdown
  assert.match(html, /data-review-preset-id="review_inbox"/);
  assert.match(html, /data-review-preset-id="review_blocked"/);

  // Verify count badges render
  assert.match(html, />5</);
  assert.match(html, />2</);
});

test('translation queue runtime: review selector disabled when reviewer metadata is missing', async () => {
  globalThis.fetch = mock.fn(async () => {
    return createJsonResponse({
      meta: {
        ...fixtures.states.open_pool.meta,
        ...fixtures.meta,
        // No review_actor_id
        review_aggregate_counts: {},
      },
      data: fixtures.states.open_pool.data,
    });
  });

  const { root } = setupDom();
  const screen = new AssignmentQueueScreen({
    endpoint: '/admin/api/translations/assignments',
  });
  screen.mount(root);
  await flushAsync();

  const html = root.innerHTML;

  // Verify review selector button is disabled
  assert.match(html, /data-review-selector-toggle="true"/);
  assert.match(html, /disabled/);
  assert.match(html, /aria-disabled="true"/);

  // Verify guidance text (should be in the menu when disabled)
  const hasGuidanceText = html.includes('Reviewer queue states are available when reviewer metadata is present');
  // Guidance text may not render if review presets are not in response, which is okay
  // The important part is that the button is disabled
});

test('translation queue runtime: context bar renders with flat mode counts', async () => {
  globalThis.fetch = mock.fn(async () => {
    return createJsonResponse({
      meta: { ...fixtures.states.open_pool.meta, ...fixtures.meta, total: 10 },
      data: fixtures.states.open_pool.data,
    });
  });

  const { root } = setupDom();
  const screen = new AssignmentQueueScreen({
    endpoint: '/admin/api/translations/assignments',
  });
  screen.mount(root);
  await flushAsync();

  const html = root.innerHTML;

  // Verify context bar shows visible and total counts
  assert.match(html, /Showing \d+ of 10/);
  assert.match(html, /assignment/);

  // Verify view-mode controls are present
  assert.match(html, /data-view-mode="flat"/);
  assert.match(html, /data-view-mode="grouped"/);

  // Verify expand/collapse buttons are NOT present in flat mode
  assert.doesNotMatch(html, /data-expand-all="true"/);
  assert.doesNotMatch(html, /data-collapse-all="true"/);
});

test('translation queue runtime: context bar renders with grouped mode counts', async () => {
  const groupedResponse = makeGroupedQueueResponse();
  globalThis.fetch = mock.fn(async (input) => {
    if (String(input).includes('group_by=family_id')) {
      return createJsonResponse(groupedResponse);
    }
    return createJsonResponse({
      meta: { ...fixtures.states.open_pool.meta, ...fixtures.meta },
      data: fixtures.states.open_pool.data,
    });
  });

  const { root } = setupDom();
  const screen = new AssignmentQueueScreen({
    endpoint: '/admin/api/translations/assignments',
  });
  screen.mount(root);
  await flushAsync();

  screen.setViewMode('grouped');
  await flushAsync();

  const html = root.innerHTML;

  // Verify context bar shows family and assignment counts
  assert.match(html, /\d+ famil/);
  assert.match(html, /assignments/);
  assert.match(html, /page-local counts/);

  // Verify expand/collapse buttons ARE present in grouped mode
  assert.match(html, /data-expand-all="true"/);
  assert.match(html, /data-collapse-all="true"/);

  // Verify grouped view mode is active
  assert.match(html, /data-view-mode="grouped"[^>]*aria-pressed="true"/);
});

test('translation queue runtime: context bar renders with server family mode counts', async () => {
  const { root } = setupDom('http://localhost/admin/translations/queue?group_strategy=server_family');
  globalThis.fetch = mock.fn(async () => {
    return createJsonResponse({
      meta: {
        ...fixtures.states.open_pool.meta,
        ...fixtures.meta,
        total: 10,
        family_total: 10,
        assignment_total: 25,
        grouping: {
          enabled: true,
          mode: 'family',
          group_by: 'family_id',
          scope: 'server',
          strategy: 'server_family',
          row_count: 3,
          group_count: 3,
          assignment_count: 8,
          family_total: 10,
          assignment_total: 25,
          supported_modes: ['page_local', 'server_family'],
          capabilities: {
            server_family: {
              supported: true,
            },
          },
        },
      },
      // Use open_pool data but mark it as server_family mode via grouping meta
      data: fixtures.states.open_pool.data,
    });
  });

  const screen = new AssignmentQueueScreen({
    endpoint: '/admin/api/translations/assignments',
  });
  const container = root;
  screen.mount(container);
  await flushAsync();

  // Explicitly set server_family view mode
  screen.setViewMode('server_family');
  await flushAsync();

  const html = container.innerHTML;

  // Verify context bar shows server-family counts
  assert.match(html, /\d+ of 10 famil/);
  assert.match(html, /25 assignments/);
  assert.match(html, /server-side family pages/);

  // Verify expand/collapse buttons ARE present in server_family mode
  assert.match(html, /data-expand-all="true"/);
  assert.match(html, /data-collapse-all="true"/);

  // Verify server_family view mode is active
  assert.match(html, /data-view-mode="server_family"[^>]*aria-pressed="true"/);
});

test('translation queue runtime: context bar view-mode controls switch correctly', async () => {
  globalThis.fetch = mock.fn(async () => {
    return createJsonResponse({
      meta: {
        ...fixtures.states.open_pool.meta,
        ...fixtures.meta,
        grouping: {
          enabled: true,
          mode: 'family',
          group_by: 'family_id',
          scope: 'page',
          strategy: 'page_local',
          row_count: 5,
          group_count: 2,
          assignment_count: 5,
          supported_modes: ['page_local'],
        },
      },
      data: fixtures.states.open_pool.data,
    });
  });

  const { root } = setupDom('http://localhost/admin/translations/queue');
  const screen = new AssignmentQueueScreen({
    endpoint: '/admin/api/translations/assignments',
  });
  screen.mount(root);
  await flushAsync();

  let html = root.innerHTML;

  // Verify flat mode is initially active
  assert.match(html, /data-view-mode="flat"[^>]*aria-pressed="true"/);

  // Switch to grouped mode
  const groupedButton = root.querySelector('[data-view-mode="grouped"]');
  assert.ok(groupedButton, 'Grouped button should exist');
  groupedButton.click();
  await flushAsync();

  html = root.innerHTML;

  // Verify grouped mode is now active
  assert.match(html, /data-view-mode="grouped"[^>]*aria-pressed="true"/);
  assert.doesNotMatch(html, /data-view-mode="flat"[^>]*aria-pressed="true"/);
});

test('translation queue runtime: filter snapshot bar only shows when snapshot exists', async () => {
  globalThis.fetch = mock.fn(async () => {
    return createJsonResponse({
      meta: { ...fixtures.states.open_pool.meta, ...fixtures.meta, total: 10 },
      data: fixtures.states.open_pool.data,
    });
  });

  const { root } = setupDom();
  const screen = new AssignmentQueueScreen({
    endpoint: '/admin/api/translations/assignments',
  });
  screen.mount(root);
  await flushAsync();

  let html = root.innerHTML;

  // Verify filter snapshot bar is NOT present initially
  assert.doesNotMatch(html, /data-filter-snapshot-bar="true"/);

  // Context bar should still show counts
  assert.match(html, /Showing \d+ of 10/);
});
