import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(
  path.resolve(testFileDir, '../src/runtime/cms-relationship-actions.js'),
  'utf8'
);

function loadRuntime(options = {}) {
  const href = typeof options === 'string'
    ? options
    : options.href || 'http://localhost:9090/admin/content/teaching-topics-menu/id/edit?channel=default&locale=en';
  const preseed = typeof options === 'string' ? undefined : options.preseed;
  class CustomEventPolyfill {
    constructor(type, init = {}) {
      this.type = type;
      this.bubbles = Boolean(init.bubbles);
      this.detail = init.detail;
    }
  }

  const sandbox = {
    URL,
    window: {
      location: { href },
      CustomEvent: CustomEventPolyfill,
    },
  };
  if (preseed) {
    sandbox.window.GoAdminRelationshipActions = preseed;
  }
  vm.runInNewContext(source, sandbox);
  return sandbox.window.GoAdminRelationshipActions;
}

function fakeElement({
  name = 'columns[0].entries[0].topic_id',
  panelName = 'teaching-topics-menu',
  recordId = 'menu-123',
  events = [],
} = {}) {
  return {
    name,
    events,
    getAttribute(attributeName) {
      return attributeName === 'name' ? name : null;
    },
    closest(selector) {
      if (selector !== '[data-record-id], [data-panel-name]') {
        return null;
      }
      return {
        dataset: {
          panelName,
          recordId,
        },
      };
    },
    dispatchEvent(event) {
      events.push(event);
      return true;
    },
  };
}

test('relationship action bootstrap returns passive formgen config before handlers are registered', async () => {
  const api = loadRuntime();
  const events = [];
  const element = fakeElement({ events });

  assert.equal(api.hasHandlers(), false);
  const config = api.buildInitConfig({ basePath: '/admin' });
  assert.equal(typeof config.onCreateAction, 'function');
  assert.equal(typeof config.onEditAction, 'function');

  const result = await config.onCreateAction(
    {
      element,
      field: { name: 'columns[0].entries[0].topic_id' },
      endpoint: { url: '/admin/api/content/topics' },
    },
    {
      query: 'lojong',
      actionId: 'archive_topic',
      mode: 'typeahead',
      selectBehavior: 'replace',
    }
  );

  assert.equal(result, undefined);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'formgen:relationship:create-action');
  assert.equal(events[0].bubbles, true);
  assert.equal(events[0].detail.actionId, 'archive_topic');
  assert.equal(events[0].detail.element, element);
  assert.deepEqual(events[0].detail.field, { name: 'columns[0].entries[0].topic_id' });
  assert.deepEqual(events[0].detail.endpoint, { url: '/admin/api/content/topics' });
  assert.equal(events[0].detail.goAdmin.fieldName, 'columns[0].entries[0].topic_id');
  assert.equal(Object.hasOwn(events[0].detail, 'config'), false);
  assert.equal(Object.hasOwn(events[0].detail, 'fromCache'), false);
});

test('relationship action bootstrap reports registered action-scoped handlers', () => {
  const api = loadRuntime();
  api.registerAction('archive_topic', {
    onCreateAction() {
      return { value: 'topic-1', label: 'Topic One' };
    },
  });

  assert.equal(api.hasHandlers(), true);

  api.unregisterAction('archive_topic', 'create');
  assert.equal(api.hasHandlers(), false);

  api.register({
    actionId: 'archive_topic',
    onEditAction() {
      return { value: 'topic-1', label: 'Renamed Topic' };
    },
  });

  assert.equal(api.hasHandlers(), true);
});

test('relationship action bootstrap enriches action-scoped create handler context', async () => {
  const api = loadRuntime();
  let receivedContext;
  let receivedDetail;

  api.registerAction('archive_topic', {
    onCreateAction(context, detail) {
      receivedContext = context;
      receivedDetail = detail;
      return { value: 'source-topic-123', label: 'New Topic' };
    },
  });

  const config = api.buildInitConfig({
    basePath: '/admin',
    panel: 'teaching-topics-menu',
    recordId: 'menu-123',
  });
  const result = await config.onCreateAction(
    {
      element: fakeElement(),
      field: { name: 'columns[0].entries[0].topic_id' },
      endpoint: { url: '/admin/api/content/topics' },
    },
    {
      query: 'lojong',
      actionId: 'archive_topic',
      mode: 'typeahead',
      selectBehavior: 'replace',
    }
  );

  assert.deepEqual(result, { value: 'source-topic-123', label: 'New Topic' });
  assert.equal(receivedContext.fieldName, 'columns[0].entries[0].topic_id');
  assert.equal(receivedContext.actionId, 'archive_topic');
  assert.equal(receivedContext.panel, 'teaching-topics-menu');
  assert.equal(receivedContext.recordId, 'menu-123');
  assert.equal(receivedContext.locale, 'en');
  assert.equal(receivedContext.channel, 'default');
  assert.equal(receivedContext.basePath, '/admin');
  assert.equal(receivedContext.endpointURL, '/admin/api/content/topics');
  assert.equal(receivedContext.goAdmin.fieldName, 'columns[0].entries[0].topic_id');
  assert.equal(receivedDetail.query, 'lojong');
  assert.equal(receivedDetail.selectBehavior, 'replace');
  assert.equal(receivedDetail.goAdmin.actionId, 'archive_topic');
});

test('relationship action bootstrap preserves pre-seeded action handlers', async () => {
  let createCalls = 0;
  const api = loadRuntime({
    preseed: {
      actions: {
        archive_topic: {
          onCreateAction(context, detail) {
            createCalls += 1;
            assert.equal(context.panel, 'teaching-topics-menu');
            assert.equal(detail.query, 'lojong');
            return { value: 'source-topic-preseeded', label: 'Preseeded Topic' };
          },
        },
      },
    },
  });

  assert.equal(api.hasHandlers(), true);

  const result = await api.buildInitConfig({
    panel: 'teaching-topics-menu',
  }).onCreateAction(
    {
      element: fakeElement(),
      field: { name: 'columns[0].entries[0].topic_id' },
      endpoint: { url: '/admin/api/content/topics' },
    },
    {
      query: 'lojong',
      actionId: 'archive_topic',
      mode: 'typeahead',
      selectBehavior: 'replace',
    }
  );

  assert.equal(createCalls, 1);
  assert.deepEqual(result, { value: 'source-topic-preseeded', label: 'Preseeded Topic' });
});

test('relationship action bootstrap initializes formgen relationships with passive config', async () => {
  const api = loadRuntime();
  let receivedConfig;
  const formgenRelationships = {
    initRelationships(config) {
      receivedConfig = config;
    },
  };

  api.registerAction('archive_topic', {
    onCreateAction() {
      return { value: 'source-topic-created', label: 'Created Topic' };
    },
  });

  const config = api.initFormgenRelationships(formgenRelationships, {
    basePath: '/admin',
    panel: 'teaching-topics-menu',
    recordId: 'menu-123',
  });

  assert.equal(receivedConfig, config);
  assert.equal(typeof receivedConfig.onCreateAction, 'function');
  assert.equal(typeof receivedConfig.onEditAction, 'function');

  const result = await receivedConfig.onCreateAction(
    {
      element: fakeElement(),
      field: { name: 'columns[0].entries[0].topic_id' },
      endpoint: { url: '/admin/api/content/topics' },
    },
    {
      query: 'lojong',
      actionId: 'archive_topic',
      mode: 'typeahead',
      selectBehavior: 'replace',
    }
  );

  assert.deepEqual(result, { value: 'source-topic-created', label: 'Created Topic' });
});

test('relationship action bootstrap enriches action-scoped edit handler selected option details', async () => {
  const api = loadRuntime();
  let receivedContext;
  let receivedDetail;

  api.register({
    actions: {
      archive_topic: {
        onEditAction(context, detail) {
          receivedContext = context;
          receivedDetail = detail;
          return { value: detail.selectedValue, label: 'Updated Topic' };
        },
      },
    },
  });

  const config = api.buildInitConfig({ basePath: '/admin' });
  const result = await config.onEditAction(
    {
      element: fakeElement({ recordId: 'menu-456' }),
      field: { name: 'columns[0].entries[0].topic_id' },
      endpoint: { url: '/admin/api/content/topics' },
    },
    {
      selectedValue: 'source-topic-456',
      selectedLabel: 'Old Topic',
      actionId: 'archive_topic',
      mode: 'typeahead',
    }
  );

  assert.deepEqual(result, { value: 'source-topic-456', label: 'Updated Topic' });
  assert.equal(receivedContext.recordId, 'menu-456');
  assert.equal(receivedContext.panel, 'teaching-topics-menu');
  assert.equal(receivedDetail.selectedValue, 'source-topic-456');
  assert.equal(receivedDetail.selectedLabel, 'Old Topic');
  assert.equal(receivedDetail.actionId, 'archive_topic');
});

test('relationship action bootstrap re-emits edit fallback for unmatched action ids', async () => {
  const api = loadRuntime();
  const events = [];
  const element = fakeElement({ events });

  api.registerAction('archive_topic', {
    onEditAction(context, detail) {
      return { value: detail.selectedValue, label: 'Updated Topic' };
    },
  });

  const config = api.buildInitConfig({ basePath: '/admin' });
  const result = await config.onEditAction(
    {
      element,
      field: { name: 'columns[0].entries[0].topic_id' },
      endpoint: { url: '/admin/api/content/topics' },
    },
    {
      selectedValue: 'source-topic-456',
      selectedLabel: 'Old Topic',
      actionId: 'other_action',
      mode: 'typeahead',
    }
  );

  assert.equal(result, undefined);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'formgen:relationship:edit-action');
  assert.equal(events[0].detail.actionId, 'other_action');
  assert.equal(events[0].detail.selectedValue, 'source-topic-456');
  assert.equal(events[0].detail.goAdmin.fieldName, 'columns[0].entries[0].topic_id');
  assert.equal(Object.hasOwn(events[0].detail, 'config'), false);
  assert.equal(Object.hasOwn(events[0].detail, 'fromCache'), false);
});

test('relationship action bootstrap lets global handlers explicitly decline to fallback', async () => {
  const api = loadRuntime();
  const events = [];
  const element = fakeElement({ events });

  api.register({
    onCreateAction() {
      return api.unhandled;
    },
  });

  const config = api.buildInitConfig({ basePath: '/admin' });
  const result = await config.onCreateAction(
    {
      element,
      field: { name: 'columns[0].entries[0].topic_id' },
      endpoint: { url: '/admin/api/content/topics' },
    },
    {
      query: 'lojong',
      actionId: 'archive_topic',
      mode: 'typeahead',
      selectBehavior: 'replace',
    }
  );

  assert.equal(result, undefined);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'formgen:relationship:create-action');
  assert.equal(events[0].detail.query, 'lojong');
});
