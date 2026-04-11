import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { importDatatableModule } from './helpers/load-datatable-dist.mjs';

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch (error) {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();
const {
  SchemaActionBuilder,
  initPanelDetailActions,
} = await importDatatableModule();

async function loadFixture() {
  const fixtureURL = new URL('./fixtures/examples_web_action_contracts/content_actions.json', import.meta.url);
  return JSON.parse(await readFile(fixtureURL, 'utf8'));
}

function setGlobals(win) {
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.Event = win.Event;
  globalThis.MouseEvent = win.MouseEvent;
  globalThis.Response = win.Response || globalThis.Response;
}

function setupDOM(html, url = 'http://localhost/admin/content/pages/home?locale=en') {
  const dom = new JSDOM(html, { url });
  setGlobals(dom.window);
  return dom;
}

function createBuilder(panel, overrides = {}) {
  return new SchemaActionBuilder({
    apiEndpoint: `/admin/api/panels/${panel}`,
    actionBasePath: `/admin/content/${panel}`,
    panelName: panel,
    useDefaultFallback: true,
    ...overrides,
  });
}

test('Phase 5 fixture: examples/web page and post row actions expose disabled reasons from canonical action state', async () => {
  const fixture = await loadFixture();

  const pageBuilder = createBuilder('pages');
  const pageRecord = fixture.pages.list_contract.record;
  const pageSchemaActions = fixture.pages.list_contract.schema.actions;
  const pageActions = pageBuilder.buildRowActions(pageRecord, pageSchemaActions);

  const pageDelete = pageActions.find((action) => action.id === 'delete');
  const pageUnpublish = pageActions.find((action) => action.id === 'unpublish');

  assert.equal(pageDelete?.disabled, true);
  assert.equal(
    pageDelete?.disabledReason,
    fixture.pages.list_contract.record._action_state.delete.reason
  );
  assert.equal(pageUnpublish?.disabled, true);
  assert.equal(
    pageUnpublish?.disabledReason,
    fixture.pages.list_contract.record._action_state.unpublish.reason
  );

  const postBuilder = createBuilder('posts');
  const postRecord = fixture.posts.list_contract.record;
  const postSchemaActions = fixture.posts.list_contract.schema.actions;
  const postActions = postBuilder.buildRowActions(postRecord, postSchemaActions);
  const postSchedule = postActions.find((action) => action.id === 'schedule');

  assert.equal(postSchedule?.disabled, true);
  assert.equal(
    postSchedule?.disabledReason,
    fixture.posts.list_contract.record._action_state.schedule.reason
  );
});

test('Phase 5 fixture: examples/web detail actions render canonical disabled reasons for pages and posts', async () => {
  const fixture = await loadFixture();
  const responses = new Map([
    ['pages', fixture.pages.detail_contract],
    ['posts', fixture.posts.detail_contract],
  ]);

  const dom = setupDOM(`
    <div
      data-panel-detail-actions
      data-panel="pages"
      data-record-id="${fixture.pages.detail_contract.data.id}"
      data-base-path="/admin"
      data-panel-base-path="/admin/content/pages"
      data-api-base-path="/admin/api"
      data-back-href="/admin/content/pages"
    ></div>
    <div
      data-panel-detail-actions
      data-panel="posts"
      data-record-id="${fixture.posts.detail_contract.data.id}"
      data-base-path="/admin"
      data-panel-base-path="/admin/content/posts"
      data-api-base-path="/admin/api"
      data-back-href="/admin/content/posts"
    ></div>
  `, 'http://localhost/admin/content/posts/getting-started-go?locale=en');

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const path = String(url);
    const panel = path.includes('/panels/posts/') ? 'posts' : 'pages';
    return new Response(JSON.stringify(responses.get(panel)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const controllers = await initPanelDetailActions(dom.window.document);
    assert.equal(controllers.length, 2);

    const pageDeleteReason = dom.window.document.querySelector('[data-detail-action-card="delete"] [data-detail-action-reason="delete"]');
    assert.ok(pageDeleteReason);
    assert.match(pageDeleteReason.textContent, /home page cannot be deleted/i);

    const postScheduleButton = dom.window.document.querySelector('[data-detail-action-card="schedule"] [data-detail-action-button="schedule"]');
    const postScheduleReason = dom.window.document.querySelector('[data-detail-action-card="schedule"] [data-detail-action-reason="schedule"]');
    assert.equal(postScheduleButton?.getAttribute('aria-disabled'), 'true');
    assert.equal(
      postScheduleReason?.textContent?.trim(),
      fixture.posts.detail_contract.data._action_state.schedule.reason
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Phase 5 fixture: examples/web command failures surface canonical structured error copy', async () => {
  const fixture = await loadFixture();
  const record = {
    ...fixture.posts.list_contract.record,
    _action_state: {},
  };
  const scheduleFailure = fixture.posts.execution_failures.schedule;

  let actionError = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify(scheduleFailure), {
    status: scheduleFailure.status,
    headers: { 'Content-Type': 'application/json' },
  });

  try {
    const builder = createBuilder('posts', {
      onActionError: (_name, error) => {
        actionError = error;
      },
      reconcileOnDomainFailure: async () => {},
    });

    const actions = builder.buildRowActions(record, fixture.posts.list_contract.schema.actions);
    const schedule = actions.find((action) => action.id === 'schedule');
    assert.ok(schedule, 'expected schedule action');

    await assert.rejects(
      () => schedule.action(record),
      /PRECONDITION_FAILED: Unpublish this post before scheduling a new publication window\./
    );
    assert.equal(actionError?.textCode, 'PRECONDITION_FAILED');
    assert.equal(
      actionError?.message,
      `PRECONDITION_FAILED: ${fixture.posts.execution_failures.schedule.error.message}`
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Phase 5 template: content list wires row-action reconciliation and shared structured error formatting', async () => {
  const templateURL = new URL('../../templates/resources/content/list.html', import.meta.url);
  const template = await readFile(templateURL, 'utf8');

  assert.match(template, /reconcileOnDomainFailure:\s*async\s*\(\)\s*=>\s*\{\s*await grid\.refresh\(\);/);
  assert.match(template, /window\.toastManager\.error\(formatStructuredErrorForDisplay\(error,\s*`\$\{actionName\} failed`\)\);/);
});
