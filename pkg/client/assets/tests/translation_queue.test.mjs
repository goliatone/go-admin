import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const fixtureURL = new URL('../../../../admin/testdata/translation_queue_contract_fixtures.json', import.meta.url);
const fixtures = JSON.parse(await readFile(fixtureURL, 'utf8'));

const {
  AssignmentQueueScreen,
  applyOptimisticAssignmentAction,
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

test('translation queue contracts: normalize shared fixture metadata and rows', () => {
  const response = normalizeAssignmentListResponse({
    meta: fixtures.meta,
    data: fixtures.states.open_pool.data,
  });

  assert.equal(response.meta.saved_filter_presets.length, 5);
  assert.equal(response.meta.default_sort.key, 'updated_at');
  assert.equal(response.data[0].actions.claim.enabled, true);
  assert.equal(response.data[0].actions.release.reason_code, 'INVALID_STATUS');
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
  assert.match(container.innerHTML, /Claim/);
  assert.match(container.innerHTML, /Launch page/);
  assert.match(container.innerHTML, /Due State/);
  assert.match(container.innerHTML, /Assignee/);
  assert.match(container.innerHTML, /Reviewer/);
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

  assert.equal(screen.getRows()[0].queue_state, 'pending');
  assert.equal(screen.getFeedback()?.code, 'VERSION_CONFLICT');
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
