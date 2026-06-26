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
  globalThis.localStorage = win.localStorage;
  globalThis.requestAnimationFrame = win.requestAnimationFrame
    ? win.requestAnimationFrame.bind(win)
    : (cb) => setTimeout(cb, 0);
}

function setupDom(html = '<!doctype html><html><body></body></html>', url = 'http://localhost') {
  const dom = new JSDOM(html, { url });
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

test('ContentTypeEditor reapplies persisted preview pane state after async edit load re-render', async () => {
  setupDom(`
    <!doctype html>
    <html>
      <body>
        <div class="cm-shell" data-content-modeling-shell data-cm-surface="content-types">
          <aside class="cm-rail cm-rail--list" data-pane-rail="list"
                 data-pane-resizable data-pane-edge="trailing"
                 data-pane-min="240" data-pane-max="420" data-pane-default-width="320"></aside>
          <div class="cm-splitter" data-pane-resize="list"></div>
          <section data-pane="builder">
            <button data-pane-focus-toggle="builder" type="button" aria-pressed="false">builder</button>
            <div data-content-type-editor-root></div>
          </section>
        </div>
      </body>
    </html>`);

  window.localStorage.setItem('cm-pane:v1:content-types', JSON.stringify({
    rails: {
      list: { collapsed: false, width: 320 },
      preview: { collapsed: true, width: 540 },
    },
    focus: 'preview',
  }));

  const root = document.querySelector('[data-content-type-editor-root]');
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init = {}) => {
      const href = String(url);
      const method = (init.method ?? 'GET').toUpperCase();
      if (method === 'GET' && href.endsWith('/admin/api/panels/content_types/page')) {
        return jsonResponse({
          id: 'ct-page',
          name: 'Page',
          slug: 'page',
          icon: 'file',
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string', title: 'Title' },
            },
            required: [],
          },
          capabilities: {},
        });
      }
      return jsonResponse({ html: '<form><input name="title"></form>' });
    };

    const editor = new ContentTypeEditor(root, { apiBasePath: '/admin/api', contentTypeId: 'page' });
    await editor.init();

    const shell = document.querySelector('[data-content-modeling-shell]');
    const previewRail = root.querySelector('[data-pane-rail="preview"]');
    const previewToggle = root.querySelector('[data-pane-toggle="preview"]');
    const previewFocus = root.querySelector('[data-pane-focus-toggle="preview"]');
    const editorLayout = root.querySelector('[data-ct-editor-layout]');

    assert.ok(previewRail, 'expected preview rail after load re-render');
    assert.equal(previewRail.getAttribute('data-collapsed'), 'true');
    assert.equal(previewToggle.getAttribute('aria-expanded'), 'false');
    assert.equal(shell.getAttribute('data-pane-focus'), 'preview');
    assert.equal(previewFocus.getAttribute('aria-pressed'), 'true');
    assert.match(editorLayout.className, /flex-col/);
    assert.match(editorLayout.className, /md:flex-row/);

    click(previewToggle);
    assert.equal(previewRail.getAttribute('data-collapsed'), 'false');
    assert.equal(previewRail.style.width, '540px');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function renderBlocksField(editor) {
  editor.state.fields = [{
    id: 'field_blocks',
    name: 'blocks',
    type: 'blocks',
    label: 'Blocks',
    required: false,
    order: 0,
    config: {},
  }];
  editor.state.selectedFieldId = 'field_blocks';
  editor.renderFieldList();
  return editor.container.querySelector('[data-ct-blocks-open-library]');
}

test('ContentTypeEditor blocks-field library link uses the UI route and preserves channel', async () => {
  setupDom('<!doctype html><html><body><div data-content-type-editor-root></div></body></html>', 'http://localhost/admin/content/types?channel=staging');
  const root = document.querySelector('[data-content-type-editor-root]');
  const editor = new ContentTypeEditor(root, {
    apiBasePath: '/admin/api',
    basePath: '/admin',
    channel: 'staging',
  });
  await editor.init();

  const link = renderBlocksField(editor);
  assert.ok(link, 'expected Open Block Library link');
  assert.equal(link.getAttribute('href'), '/admin/content/block-library?channel=staging');
});

test('ContentTypeEditor blocks-field library link derives admin route from apiBasePath', async () => {
  setupDom('<!doctype html><html><body><div data-content-type-editor-root></div></body></html>');
  const root = document.querySelector('[data-content-type-editor-root]');
  const editor = new ContentTypeEditor(root, {
    apiBasePath: '/admin/api',
    channel: 'default',
  });
  await editor.init();

  const link = renderBlocksField(editor);
  assert.ok(link, 'expected Open Block Library link');
  assert.equal(link.getAttribute('href'), '/admin/content/block-library');
  assert.equal(link.getAttribute('href').includes('/api/'), false);
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

test('schemaToFields/fieldsToSchema preserves block-library-picker object-item blocks metadata', () => {
  const inputSchema = {
    type: 'object',
    properties: {
      blocks: {
        type: 'array',
        'x-formgen': {
          widget: 'block-library-picker',
          'component.name': 'block-library-picker',
          'component.config': {
            includeInactive: true,
          },
          sortable: true,
        },
        items: {
          type: 'object',
        },
      },
    },
  };

  const fields = schemaToFields(inputSchema);
  assert.equal(fields[0].type, 'blocks');

  const rebuilt = fieldsToSchema(fields, 'page');
  const blocksSchema = rebuilt.properties.blocks;

  assert.deepEqual(blocksSchema.items, { type: 'object' });
  assert.equal(blocksSchema['x-formgen'].widget, 'block-library-picker');
  assert.equal(blocksSchema['x-formgen']['component.name'], 'block-library-picker');
  assert.deepEqual(blocksSchema['x-formgen']['component.config'], { includeInactive: true });
});

test('schemaToFields uses component.config.allowedBlocks fallback for block-library-picker', () => {
  const inputSchema = {
    type: 'object',
    properties: {
      blocks: {
        type: 'array',
        'x-formgen': {
          widget: 'block-library-picker',
          'component.config': {
            allowedBlocks: ['hero'],
            includeInactive: true,
          },
        },
        items: {
          type: 'object',
        },
      },
    },
  };

  const fields = schemaToFields(inputSchema);
  assert.equal(fields[0].type, 'blocks');
  assert.deepEqual(fields[0].config.allowedBlocks, ['hero']);

  const rebuilt = fieldsToSchema(fields, 'page');
  const blocksSchema = rebuilt.properties.blocks;

  assert.deepEqual(blocksSchema['x-formgen'].allowedBlocks, ['hero']);
  assert.deepEqual(blocksSchema['x-formgen']['component.config'], {
    allowedBlocks: ['hero'],
    includeInactive: true,
  });
});

test('schemaToFields recognizes block-library widget alias as blocks', () => {
  const inputSchema = {
    type: 'object',
    properties: {
      blocks: {
        type: 'array',
        'x-formgen': {
          widget: 'block-library',
          sortable: true,
        },
        items: {
          type: 'object',
        },
      },
    },
  };

  const fields = schemaToFields(inputSchema);
  assert.equal(fields[0].type, 'blocks');

  const rebuilt = fieldsToSchema(fields, 'page');
  assert.equal(rebuilt.properties.blocks['x-formgen'].widget, 'block-library');
});

test('ContentTypeEditor preview ignores a stale response when a newer one wins', async () => {
  setupDom();
  const root = document.createElement('div');
  document.body.appendChild(root);

  const editor = new ContentTypeEditor(root, { apiBasePath: '/admin/api' });
  await editor.init();
  // Give the preview something to render.
  editor.state.fields = [{ id: 'f1', name: 'title', type: 'text' }];

  // Controllable deferreds so the FIRST request resolves AFTER the second.
  const deferred = [];
  editor.api.previewSchema = () =>
    new Promise((resolve) => {
      deferred.push(resolve);
    });

  const first = editor.previewSchema();  // seq 1
  const second = editor.previewSchema(); // seq 2 (supersedes 1)

  // Resolve the newer request first, then the stale one.
  deferred[1]({ html: '<p data-fresh>FRESH</p>' });
  deferred[0]({ html: '<p data-stale>STALE</p>' });
  await Promise.all([first, second]);

  const container = root.querySelector('[data-ct-preview-container]');
  assert.ok(container.innerHTML.includes('FRESH'), 'fresh response should render');
  assert.ok(!container.innerHTML.includes('STALE'), 'stale response must be ignored');
  // Side-pane preview is read-only (non-interactive).
  assert.ok(container.querySelector('.ct-preview-readonly'), 'preview wrapped read-only');
});

test('ContentTypeEditor live preview leaves no standalone Preview button in the header', async () => {
  setupDom();
  const root = document.createElement('div');
  document.body.appendChild(root);
  const editor = new ContentTypeEditor(root, { apiBasePath: '/admin/api' });
  await editor.init();
  assert.equal(root.querySelector('[data-ct-preview]'), null, 'redundant Preview button removed');
  assert.ok(root.querySelector('[data-ct-refresh-preview]'), 'Refresh fallback retained');
  assert.ok(root.querySelector('[data-ct-expand-preview]'), 'interactive Expand affordance present');
});
