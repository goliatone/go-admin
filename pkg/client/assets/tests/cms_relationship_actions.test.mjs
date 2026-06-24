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

function loadRuntime(href = 'http://localhost:9090/admin/content/teaching-topics-menu/id/edit?channel=default&locale=en') {
  const sandbox = {
    URL,
    window: {
      location: { href },
    },
  };
  vm.runInNewContext(source, sandbox);
  return sandbox.window.GoAdminRelationshipActions;
}

function fakeElement({ name = 'columns[0].entries[0].topic_id', panelName = 'teaching-topics-menu', recordId = 'menu-123' } = {}) {
  return {
    name,
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
  };
}

test('relationship action bootstrap returns no formgen config until handlers are registered', () => {
  const api = loadRuntime();

  assert.equal(api.hasHandlers(), false);
  assert.equal(api.buildInitConfig({ basePath: '/admin' }), undefined);
});

test('relationship action bootstrap exposes only registered create/edit hooks', () => {
  const api = loadRuntime();
  api.register({
    onCreateAction() {
      return { value: 'topic-1', label: 'Topic One' };
    },
  });

  const config = api.buildInitConfig({ basePath: '/admin' });
  assert.equal(typeof config.onCreateAction, 'function');
  assert.equal(config.onEditAction, undefined);

  api.unregister('create');
  api.register({
    onEditAction() {
      return { value: 'topic-1', label: 'Renamed Topic' };
    },
  });

  const editOnlyConfig = api.buildInitConfig({ basePath: '/admin' });
  assert.equal(editOnlyConfig.onCreateAction, undefined);
  assert.equal(typeof editOnlyConfig.onEditAction, 'function');
});

test('relationship action bootstrap enriches create handler context', async () => {
  const api = loadRuntime();
  let receivedContext;
  let receivedDetail;

  api.register({
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

test('relationship action bootstrap enriches edit handler selected option details', async () => {
  const api = loadRuntime();
  let receivedContext;
  let receivedDetail;

  api.register({
    onEditAction(context, detail) {
      receivedContext = context;
      receivedDetail = detail;
      return { value: detail.selectedValue, label: 'Updated Topic' };
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
