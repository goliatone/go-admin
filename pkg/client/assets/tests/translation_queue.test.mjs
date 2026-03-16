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
  initAssignmentQueueScreen,
  normalizeAssignmentListResponse,
} = await import('../dist/translation-queue/index.js');

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
  assert.equal(response.meta.default_sort.key, 'updated_at');
  assert.equal(response.data[0].actions.claim.enabled, true);
  assert.equal(response.data[0].actions.release.reason_code, 'INVALID_STATUS');
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

test('translation queue contracts: canonical list urls preserve review state and translation group filters', () => {
  const url = buildAssignmentListURL('/admin/api/translations/assignments', {
    reviewerId: '__me__',
    reviewState: 'qa_blocked',
    translationGroupId: 'tg-page-1',
    sort: 'due_date',
    order: 'asc',
  });

  assert.equal(
    url,
    '/admin/api/translations/assignments?reviewer_id=__me__&review_state=qa_blocked&translation_group_id=tg-page-1&sort=due_date&order=asc'
  );
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
