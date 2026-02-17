import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

const {
  TranslatorDashboard,
  initTranslatorDashboard,
  createCapabilityGate,
  getTranslatorDashboardStyles,
} = await import('../dist/datatable/index.js');

function createContainer(dataset = {}) {
  return {
    dataset,
    innerHTML: '',
    style: {},
    _attrs: {},
    setAttribute(name, value) {
      this._attrs[name] = value;
    },
    getAttribute(name) {
      return this._attrs[name];
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };
}

function createJsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
  };
}

function makeMyWorkPayload(assignments = []) {
  return {
    scope: 'my_work',
    user_id: 'user-1',
    summary: {
      total: assignments.length,
      overdue: 0,
      due_soon: 0,
      on_track: 0,
      none: 0,
      review: 0,
    },
    assignments,
    items: assignments,
    total: assignments.length,
    page: 1,
    per_page: 25,
    updated_at: new Date().toISOString(),
  };
}

async function flushAsync() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('TranslatorDashboard runtime contract', () => {
  let originalFetch;
  let originalWindow;
  let originalDocument;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    originalWindow = globalThis.window;
    originalDocument = globalThis.document;

    globalThis.window = {
      setInterval,
      clearInterval,
    };
    globalThis.document = {
      querySelector() {
        return null;
      },
    };
  });

  afterEach(() => {
    if (originalFetch === undefined) {
      delete globalThis.fetch;
    } else {
      globalThis.fetch = originalFetch;
    }

    if (originalWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }

    if (originalDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = originalDocument;
    }
  });

  it('loads data and transitions to loaded when assignments exist', async () => {
    globalThis.fetch = mock.fn(async () => createJsonResponse(makeMyWorkPayload([
      {
        id: 'assignment-1',
        translation_group_id: 'tg-1',
        entity_type: 'pages',
        source_record_id: 'src-1',
        target_record_id: 'target-1',
        source_locale: 'en',
        target_locale: 'es',
        source_title: 'Homepage',
        source_path: '/home',
        assignee_id: 'user-1',
        assignment_type: 'translation',
        content_state: 'draft',
        queue_state: 'in_progress',
        status: 'in_progress',
        priority: 'normal',
        due_state: 'on_track',
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        review_actions: {
          submit_review: { enabled: true },
          approve: { enabled: false },
          reject: { enabled: false },
        },
      },
    ])));

    const dashboard = new TranslatorDashboard({
      myWorkEndpoint: '/admin/api/translations/my-work',
      refreshInterval: 0,
    });

    dashboard.mount(createContainer());
    await flushAsync();

    assert.equal(dashboard.getState(), 'loaded');
    assert.equal(dashboard.getData()?.assignments?.length, 1);
    assert.equal(globalThis.fetch.mock.calls.length, 1);

    dashboard.unmount();
  });

  it('renders visible-disabled state and skips fetch when entry permission is denied', async () => {
    const capabilityGate = createCapabilityGate({
      profile: 'core+queue',
      capability_mode: 'core+queue',
      schema_version: 1,
      modules: {
        queue: {
          enabled: true,
          visible: true,
          entry: {
            enabled: false,
            reason: 'Missing queue view permission',
            reason_code: 'PERMISSION_DENIED',
            permission: 'admin.translations.queue.view',
          },
          actions: {},
        },
      },
      routes: {},
      features: {},
      panels: [],
      resolver_keys: [],
      warnings: [],
    });

    globalThis.fetch = mock.fn(async () => createJsonResponse(makeMyWorkPayload([])));

    const dashboard = new TranslatorDashboard({
      myWorkEndpoint: '/admin/api/translations/my-work',
      capabilityGate,
      refreshInterval: 0,
    });

    dashboard.mount(createContainer());
    await flushAsync();

    assert.equal(dashboard.getState(), 'disabled');
    assert.equal(globalThis.fetch.mock.calls.length, 0);

    dashboard.unmount();
  });

  it('initTranslatorDashboard returns null without endpoint dataset', () => {
    const dashboard = initTranslatorDashboard(createContainer({}));
    assert.equal(dashboard, null);
  });

  it('style contract includes disabled-state selector', () => {
    const css = getTranslatorDashboardStyles();
    assert.ok(css.includes('.dashboard-disabled'));
    assert.ok(css.includes('.dashboard-error'));
  });
});
