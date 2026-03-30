import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const {
  buildTranslationDashboardURL,
  createTranslationDashboardClient,
  createTranslationDashboardRefreshController,
  initTranslationDashboardPage,
  normalizeTranslationDashboardResponse,
} = await import('../dist/translation-dashboard/index.js');

const dashboardFixtures = JSON.parse(
  await readFile(new URL('../../../../admin/testdata/translation_dashboard_contract_fixtures.json', import.meta.url), 'utf8')
);
const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const translatorDashboardSourcePath = path.resolve(testFileDir, '../src/datatable/translator-dashboard.ts');

function fixtureState(name) {
  return JSON.parse(JSON.stringify(dashboardFixtures.states[name]));
}

function createContainer(dataset = {}) {
  return {
    dataset,
    innerHTML: '',
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

test('translation dashboard contracts: normalize payloads, table links, and drilldown metadata from fixtures', () => {
  const payload = normalizeTranslationDashboardResponse(fixtureState('alert_triggering'));

  assert.equal(payload.data.cards[0].id, 'my_tasks');
  assert.equal(payload.data.tables.top_overdue_assignments.rows[0].links.assignment.label, 'Open assignment');
  assert.equal(payload.data.tables.top_overdue_assignments.rows[0].links.assignment.entityId, 'asg-alert-1');
  assert.equal(payload.meta.queryModels.top_overdue_assignments.drilldownLinks.assignment.entityType, 'assignment');
  assert.equal(payload.meta.queryModels.blocked_families.drilldownLinks.family.label, 'Open family');
  assert.equal(payload.meta.scope.actor_id, 'manager-1');
});

test('translation dashboard contracts: build canonical dashboard aggregate urls', () => {
  const url = buildTranslationDashboardURL('/admin/api/translations/dashboard', {
    channel: 'production',
    tenantId: 'tenant-1',
    orgId: 'org-1',
    overdueLimit: 3,
    blockedLimit: 2,
  });

  assert.equal(
    url,
    '/admin/api/translations/dashboard?channel=production&tenant_id=tenant-1&org_id=org-1&overdue_limit=3&blocked_limit=2'
  );
});

test('translation dashboard contracts: client requests canonical endpoint and normalizes fixture payloads', async () => {
  const requests = [];
  const client = createTranslationDashboardClient({
    endpoint: '/admin/api/translations/dashboard',
    fetch: async (url) => {
      requests.push(String(url));
      return createJsonResponse(fixtureState('alert_triggering'), 200, {
        'content-type': 'application/json',
      });
    },
  });

  const payload = await client.fetchDashboard({
    channel: 'production',
    tenantId: 'tenant-1',
    orgId: 'org-1',
  });

  assert.equal(
    requests[0],
    '/admin/api/translations/dashboard?channel=production&tenant_id=tenant-1&org_id=org-1'
  );
  assert.equal(payload.data.cards[0].label, 'My Tasks');
  assert.equal(payload.data.alerts[0].state, 'critical');
});

test('translation dashboard contracts: client routes typed response reader through shared transport helper', async () => {
  const source = await readFile(translatorDashboardSourcePath, 'utf8');

  assert.match(source, /readHTTPJSON } from '\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(source, /async function readTranslatorDashboardResponse\(response: Response\): Promise<MyWorkResponse>/);
  assert.match(source, /return readHTTPJSON<MyWorkResponse>\(response\);/);
  assert.equal((source.match(/readTranslatorDashboardResponse\(response\)/g) || []).length, 1);
  assert.equal((source.match(/response\.json\(\) as MyWorkResponse/g) || []).length, 0);
});

test('translation dashboard contracts: refresh controller de-duplicates overlapping refresh calls', async () => {
  let calls = 0;
  let release;
  const blocker = new Promise((resolve) => {
    release = resolve;
  });
  const controller = createTranslationDashboardRefreshController({
    intervalMs: 0,
    load: async () => {
      calls += 1;
      await blocker;
      return normalizeTranslationDashboardResponse(fixtureState('healthy'));
    },
  });

  const first = controller.refresh();
  const second = controller.refresh();
  release();
  await Promise.all([first, second]);

  assert.equal(calls, 1);
  assert.equal(controller.isRunning(), false);
});

test('translation dashboard runtime: mount renders manager toolbar, cards, tables, and drilldown actions', async () => {
  const root = createContainer({
    endpoint: '/admin/api/translations/dashboard',
    refreshInterval: '0',
  });

  const page = initTranslationDashboardPage(root, {
    fetch: async () => createJsonResponse(fixtureState('alert_triggering'), 200, {
      'content-type': 'application/json',
    }),
    refreshInterval: 0,
  });

  await flushAsync();

  assert.ok(page);
  assert.equal(page.getState(), 'ready');
  assert.match(root.innerHTML, /data-dashboard-toolbar="true"/);
  assert.match(root.innerHTML, /Refresh dashboard/);
  assert.match(root.innerHTML, /Open assignment/);
  assert.match(root.innerHTML, /Top Overdue Assignments/);

  page.unmount();
});

test('translation dashboard runtime: mount renders empty state from published fixtures', async () => {
  const root = createContainer({
    endpoint: '/admin/api/translations/dashboard',
    refreshInterval: '0',
  });

  const page = initTranslationDashboardPage(root, {
    fetch: async () => createJsonResponse(fixtureState('empty'), 200, {
      'content-type': 'application/json',
    }),
    refreshInterval: 0,
  });

  await flushAsync();

  assert.ok(page);
  assert.equal(page.getState(), 'ready');
  assert.match(root.innerHTML, /data-dashboard-empty="true"/);
  assert.match(root.innerHTML, /This scope is clear right now/);

  page.unmount();
});

test('translation dashboard runtime: mount renders degraded-data messaging from published fixtures', async () => {
  const root = createContainer({
    endpoint: '/admin/api/translations/dashboard',
    refreshInterval: '0',
  });

  const page = initTranslationDashboardPage(root, {
    fetch: async () => createJsonResponse(fixtureState('degraded'), 200, {
      'content-type': 'application/json',
    }),
    refreshInterval: 0,
  });

  await flushAsync();

  assert.ok(page);
  assert.equal(page.getState(), 'ready');
  assert.match(root.innerHTML, /data-dashboard-degraded="true"/);
  assert.match(root.innerHTML, /Managers can continue triage/);

  page.unmount();
});

test('translation dashboard runtime: failed refresh keeps current data visible and renders inline retry guidance', async () => {
  const root = createContainer({
    endpoint: '/admin/api/translations/dashboard',
    refreshInterval: '0',
  });

  let call = 0;
  const page = initTranslationDashboardPage(root, {
    fetch: async () => {
      call += 1;
      if (call === 1) {
        return createJsonResponse(fixtureState('healthy'), 200, {
          'content-type': 'application/json',
        });
      }
      return createJsonResponse({ error: 'boom' }, 500, {
        'content-type': 'application/json',
        'x-request-id': 'req-1',
      });
    },
    refreshInterval: 0,
  });

  await flushAsync();
  await assert.rejects(() => page.refresh());
  await flushAsync();

  assert.equal(page.getState(), 'ready');
  assert.match(root.innerHTML, /data-dashboard-inline-error="true"/);
  assert.match(root.innerHTML, /Latest refresh failed/);
  assert.match(root.innerHTML, /Request req-1/);
  assert.match(root.innerHTML, /data-dashboard="true"/);

  page.unmount();
});

test('translation dashboard runtime: initial load error renders retry state', async () => {
  const root = createContainer({
    endpoint: '/admin/api/translations/dashboard',
    refreshInterval: '0',
  });

  const page = initTranslationDashboardPage(root, {
    fetch: async () => createJsonResponse({ error: 'unavailable' }, 503, {
      'content-type': 'application/json',
      'x-request-id': 'req-503',
    }),
    refreshInterval: 0,
  });

  await flushAsync();

  assert.ok(page);
  assert.equal(page.getState(), 'error');
  assert.match(root.innerHTML, /data-dashboard-error="true"/);
  assert.match(root.innerHTML, /Retry dashboard/);
});
