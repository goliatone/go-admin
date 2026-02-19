import test from 'node:test';
import assert from 'node:assert/strict';

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch (error) {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();

const bootstrapDom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
setGlobals(bootstrapDom.window);
Object.defineProperty(globalThis.document, 'readyState', { value: 'loading', configurable: true });

globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ items: [] }) });

const { FieldConfigForm, ContentTypeEditor, schemaToFields, fieldsToSchema } = await import('../dist/content-type-builder/index.js');

function setGlobals(win) {
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.Node = win.Node;
  globalThis.Element = win.Element;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.HTMLInputElement = win.HTMLInputElement;
  globalThis.HTMLSelectElement = win.HTMLSelectElement;
  globalThis.HTMLTextAreaElement = win.HTMLTextAreaElement;
  globalThis.HTMLTemplateElement = win.HTMLTemplateElement;
  globalThis.Event = win.Event;
  globalThis.MouseEvent = win.MouseEvent;
  globalThis.KeyboardEvent = win.KeyboardEvent;
  globalThis.CustomEvent = win.CustomEvent;
  globalThis.MutationObserver = win.MutationObserver;
  globalThis.FormData = win.FormData;
  globalThis.requestAnimationFrame = win.requestAnimationFrame
    ? win.requestAnimationFrame.bind(win)
    : (cb) => setTimeout(cb, 0);
}

function setupDom(html = '<!doctype html><html><body></body></html>') {
  const dom = new JSDOM(html, { url: 'http://localhost' });
  setGlobals(dom.window);
  return dom;
}

function click(element) {
  element.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
}

function jsonResponse(payload) {
  return {
    ok: true,
    status: 200,
    json: async () => payload,
  };
}

test('FieldConfigForm preserves order when saving an existing field', async () => {
  setupDom();

  let savedField = null;

  const form = new FieldConfigForm({
    field: {
      id: 'field_1',
      name: 'headline',
      type: 'text',
      label: 'Headline',
      order: 7,
      required: false,
    },
    existingFieldNames: [],
    onCancel: () => {},
    onSave: (field) => {
      savedField = field;
    },
  });

  await form.show();

  const saveButton = document.querySelector('[data-field-config-save]');
  assert.ok(saveButton, 'expected save button');
  click(saveButton);

  assert.ok(savedField, 'expected onSave callback');
  assert.equal(savedField.order, 7);

  form.destroy();
});

test('FieldConfigForm preserves internal blocks schema metadata on save', async () => {
  setupDom();

  let savedField = null;
  const form = new FieldConfigForm({
    field: {
      id: 'field_blocks',
      name: 'blocks',
      type: 'blocks',
      label: 'Blocks',
      required: false,
      config: {
        __sourceItemsSchema: { oneOf: [{ $ref: '#/$defs/hero' }] },
        __sourceAllowedBlocks: ['hero'],
        __sourceRefPrefix: '#/$defs/',
        __sourceRepresentation: 'refs',
        __sourceWidget: 'block-library-picker',
      },
    },
    existingFieldNames: [],
    onCancel: () => {},
    onSave: (field) => {
      savedField = field;
    },
  });

  await form.show();
  const saveButton = document.querySelector('[data-field-config-save]');
  assert.ok(saveButton, 'expected save button');
  click(saveButton);

  assert.ok(savedField, 'expected onSave callback');
  assert.equal(savedField.config.__sourceRepresentation, 'refs');
  assert.equal(savedField.config.__sourceRefPrefix, '#/$defs/');
  assert.deepEqual(savedField.config.__sourceAllowedBlocks, ['hero']);
  assert.deepEqual(savedField.config.__sourceItemsSchema, { oneOf: [{ $ref: '#/$defs/hero' }] });

  form.destroy();
});

test('ContentTypeEditor preview init hydrates JSON and WYSIWYG editors', () => {
  setupDom();

  const calls = { json: 0, wysiwyg: 0 };
  window.FormgenBehaviors = {
    initJSONEditors: () => {
      calls.json += 1;
    },
  };
  window.FormgenRelationships = {
    autoInitWysiwyg: () => {
      calls.wysiwyg += 1;
    },
  };

  const root = document.createElement('div');
  const editor = new ContentTypeEditor(root, { apiBasePath: '/admin/api' });
  editor.initPreviewEditors();

  assert.equal(calls.json, 1);
  assert.equal(calls.wysiwyg, 1);
});

test('ContentTypeEditor save preserves non-boolean capabilities when updating icon', async () => {
  setupDom();

  const root = document.createElement('div');
  document.body.appendChild(root);

  const originalFetch = globalThis.fetch;
  const existingContentType = {
    id: 'ct-page',
    name: 'Page',
    slug: 'page',
    icon: 'file',
    schema: { type: 'object', properties: {}, required: [] },
    capabilities: {
      versioning: true,
      scheduling: false,
      seo: true,
      localization: false,
      blocks: false,
      panel_slug: 'pages',
      workflow: { mode: 'approval' },
      permissions: ['admin.pages.read'],
    },
  };

  let updatedPayload = null;
  try {
    globalThis.fetch = async (url, init = {}) => {
      const href = String(url);
      const method = (init.method ?? 'GET').toUpperCase();

      if (method === 'GET' && href.endsWith('/admin/api/panels/content_types/page')) {
        return jsonResponse(existingContentType);
      }
      if (method === 'PUT' && href.endsWith('/admin/api/panels/content_types/ct-page')) {
        updatedPayload = JSON.parse(String(init.body ?? '{}'));
        return jsonResponse({ ...existingContentType, ...updatedPayload });
      }
      return jsonResponse({});
    };

    const editor = new ContentTypeEditor(root, { apiBasePath: '/admin/api', contentTypeId: 'page' });
    await editor.init();

    const iconInput = root.querySelector('[data-ct-icon]');
    assert.ok(iconInput, 'expected icon input');
    iconInput.value = 'file-text';

    await editor.save();

    assert.ok(updatedPayload, 'expected update payload');
    assert.equal(updatedPayload.icon, 'file-text');
    assert.equal(updatedPayload.capabilities.panel_slug, 'pages');
    assert.deepEqual(updatedPayload.capabilities.workflow, { mode: 'approval' });
    assert.deepEqual(updatedPayload.capabilities.permissions, ['admin.pages.read']);
    assert.equal(updatedPayload.capabilities.versioning, true);
    assert.equal(updatedPayload.capabilities.seo, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('schemaToFields/fieldsToSchema preserves ref-based blocks representation', () => {
  const inputSchema = {
    type: 'object',
    properties: {
      blocks: {
        type: 'array',
        'x-formgen': {
          widget: 'block-library-picker',
          sortable: true,
        },
        items: {
          oneOf: [
            { $ref: '#/$defs/hero' },
            { $ref: '#/$defs/rich_text' },
          ],
        },
      },
    },
  };

  const fields = schemaToFields(inputSchema);
  const rebuilt = fieldsToSchema(fields, 'page');
  const blocksSchema = rebuilt.properties.blocks;

  assert.deepEqual(blocksSchema.items.oneOf, [
    { $ref: '#/$defs/hero' },
    { $ref: '#/$defs/rich_text' },
  ]);
  assert.equal(blocksSchema.items.required, undefined);
  assert.equal(blocksSchema['x-formgen'].widget, 'block-library-picker');
});

test('blocks allowed-block edits from ref-based schema keep oneOf refs', () => {
  const inputSchema = {
    type: 'object',
    properties: {
      blocks: {
        type: 'array',
        'x-formgen': {
          widget: 'block-library-picker',
          sortable: true,
        },
        items: {
          oneOf: [
            { $ref: '#/$defs/hero' },
            { $ref: '#/$defs/rich_text' },
          ],
        },
      },
    },
  };

  const fields = schemaToFields(inputSchema);
  fields[0].config.allowedBlocks = ['hero'];
  const rebuilt = fieldsToSchema(fields, 'page');
  const blocksSchema = rebuilt.properties.blocks;

  assert.deepEqual(blocksSchema.items.oneOf, [{ $ref: '#/$defs/hero' }]);
  assert.equal(blocksSchema.items.required, undefined);
});
