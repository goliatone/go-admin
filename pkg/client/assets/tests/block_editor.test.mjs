import test from 'node:test';
import assert from 'node:assert/strict';

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch (error) {
    // Fallback for local monorepo where jsdom lives under go-formgen's client deps.
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();

const bootstrapDom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
setGlobals(bootstrapDom.window);
Object.defineProperty(globalThis.document, 'readyState', { value: 'loading', configurable: true });

const { initBlockEditors, initBlockEditor, registerBlockTemplate } = await import('../dist/formgen/block_editor.js');

function setGlobals(win) {
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.HTMLInputElement = win.HTMLInputElement;
  globalThis.HTMLSelectElement = win.HTMLSelectElement;
  globalThis.HTMLTextAreaElement = win.HTMLTextAreaElement;
  globalThis.HTMLTemplateElement = win.HTMLTemplateElement;
  globalThis.Event = win.Event;
  globalThis.MouseEvent = win.MouseEvent;
  globalThis.MutationObserver = win.MutationObserver;
  globalThis.requestAnimationFrame = win.requestAnimationFrame
    ? win.requestAnimationFrame.bind(win)
    : (cb) => setTimeout(cb, 0);
}

function setupEditor(html) {
  const dom = new JSDOM(html, { url: 'http://localhost' });
  setGlobals(dom.window);
  return dom;
}

function click(element) {
  element.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
}

function input(element) {
  element.dispatchEvent(new window.Event('input', { bubbles: true }));
}

function getOutputPayload(doc) {
  const output = doc.querySelector('input[data-block-output]');
  return JSON.parse(output.value || '[]');
}

const editorMarkup = (outputValue = '') => `
  <form>
    <div data-block-editor data-block-sortable="true">
      <div data-block-empty></div>
      <div data-block-list></div>
      <input type="hidden" name="blocks" data-block-output value='${outputValue}' />
      <select data-block-add-select></select>
      <button type="button" data-block-add>Add</button>
      <template data-block-template data-block-type="hero" data-block-label="Hero">
        <label>Title <input name="title" /></label>
      </template>
      <template data-block-template data-block-type="gallery" data-block-label="Gallery">
        <label>Caption <input name="caption" /></label>
      </template>
    </div>
  </form>
`;

test('block editor adds blocks and serializes values', () => {
  const dom = setupEditor(editorMarkup());
  initBlockEditors(dom.window.document);

  const doc = dom.window.document;
  const select = doc.querySelector('[data-block-add-select]');
  const addButton = doc.querySelector('[data-block-add]');

  select.value = 'hero';
  click(addButton);

  const items = doc.querySelectorAll('[data-block-item]');
  assert.equal(items.length, 1);

  const titleInput = items[0].querySelector('[data-block-field-name="title"], input[name="title"], input[name^="blocks"]');
  titleInput.value = 'Hello';
  input(titleInput);

  const payload = getOutputPayload(doc);
  assert.equal(payload.length, 1);
  assert.equal(payload[0]._type, 'hero');
  assert.equal(payload[0].title, 'Hello');

  const typeInput = items[0].querySelector('input[data-block-type-input]');
  assert.ok(typeInput, 'expected hidden _type input');
  assert.equal(typeInput.readOnly, true);
});

test('block editor supports collapse and removal', () => {
  const dom = setupEditor(editorMarkup());
  initBlockEditors(dom.window.document);

  const doc = dom.window.document;
  const select = doc.querySelector('[data-block-add-select]');
  const addButton = doc.querySelector('[data-block-add]');

  select.value = 'hero';
  click(addButton);

  const item = doc.querySelector('[data-block-item]');
  const collapse = item.querySelector('[data-block-collapse]');
  const body = item.querySelector('[data-block-body]');

  click(collapse);
  assert.ok(body.classList.contains('hidden'));
  click(collapse);
  assert.ok(!body.classList.contains('hidden'));

  const remove = item.querySelector('[data-block-remove]');
  click(remove);

  assert.equal(doc.querySelectorAll('[data-block-item]').length, 0);
  assert.equal(getOutputPayload(doc).length, 0);
});

test('block editor reorders blocks with move controls', () => {
  const initial = JSON.stringify([
    { _type: 'hero', title: 'First' },
    { _type: 'gallery', caption: 'Second' },
  ]);
  const dom = setupEditor(editorMarkup(initial));
  initBlockEditors(dom.window.document);

  const doc = dom.window.document;
  const items = doc.querySelectorAll('[data-block-item]');
  assert.equal(items.length, 2);

  const moveDown = items[0].querySelector('[data-block-move-down]');
  click(moveDown);

  const payload = getOutputPayload(doc);
  assert.equal(payload[0]._type, 'gallery');
  assert.equal(payload[1]._type, 'hero');
});

test('block editor preserves existing _schema on edits', () => {
  const initial = JSON.stringify([
    { _type: 'hero', _schema: 'hero@v2.0.0', title: 'Old' },
  ]);
  const dom = setupEditor(editorMarkup(initial));
  initBlockEditors(dom.window.document);

  const doc = dom.window.document;
  const item = doc.querySelector('[data-block-item]');
  const titleInput = item.querySelector('[data-block-field-name="title"], input[name="title"], input[name^="blocks"]');
  titleInput.value = 'Updated';
  input(titleInput);

  const payload = getOutputPayload(doc);
  assert.equal(payload.length, 1);
  assert.equal(payload[0]._schema, 'hero@v2.0.0');
  assert.equal(payload[0].title, 'Updated');
});

// =============================================================================
// Phase 4: Manual Init Guard + Exported Functions
// =============================================================================

const manualInitMarkup = `
  <form>
    <div data-block-editor data-block-init="manual" data-block-sortable="true">
      <div data-block-empty></div>
      <div data-block-list></div>
      <input type="hidden" name="blocks" data-block-output value="" />
      <select data-block-add-select></select>
      <button type="button" data-block-add>Add</button>
      <template data-block-template data-block-type="hero" data-block-label="Hero">
        <label>Title <input name="title" /></label>
      </template>
    </div>
  </form>
`;

const libraryPickerMarkup = `
  <form>
    <div data-block-editor data-block-library-picker="true" data-block-sortable="true">
      <div data-block-empty></div>
      <div data-block-list></div>
      <input type="hidden" name="blocks" data-block-output value="" />
      <select data-block-add-select></select>
      <button type="button" data-block-add>Add</button>
    </div>
  </form>
`;

test('initBlockEditors skips elements with data-block-init="manual"', () => {
  const dom = setupEditor(manualInitMarkup);
  initBlockEditors(dom.window.document);

  const doc = dom.window.document;
  // The select should NOT have been populated with block type options
  // because initBlockEditor was never called
  const select = doc.querySelector('[data-block-add-select]');
  assert.equal(select.options.length, 0, 'manual init editor should not be auto-initialized');
});

test('initBlockEditors skips elements with data-block-library-picker="true"', () => {
  const dom = setupEditor(libraryPickerMarkup);
  initBlockEditors(dom.window.document);

  const doc = dom.window.document;
  const select = doc.querySelector('[data-block-add-select]');
  assert.equal(select.options.length, 0, 'library picker editor should not be auto-initialized');
});

test('initBlockEditors still initializes normal editors alongside manual ones', () => {
  const mixed = `
    <form>
      <div id="auto" data-block-editor data-block-sortable="true">
        <div data-block-empty></div>
        <div data-block-list></div>
        <input type="hidden" name="auto_blocks" data-block-output value="" />
        <select data-block-add-select></select>
        <button type="button" data-block-add>Add</button>
        <template data-block-template data-block-type="hero" data-block-label="Hero">
          <label>Title <input name="title" /></label>
        </template>
      </div>
      <div id="manual" data-block-editor data-block-init="manual">
        <div data-block-empty></div>
        <div data-block-list></div>
        <input type="hidden" name="manual_blocks" data-block-output value="" />
        <select data-block-add-select></select>
        <button type="button" data-block-add>Add</button>
      </div>
    </form>
  `;
  const dom = setupEditor(mixed);
  initBlockEditors(dom.window.document);

  const doc = dom.window.document;
  const autoSelect = doc.querySelector('#auto [data-block-add-select]');
  const manualSelect = doc.querySelector('#manual [data-block-add-select]');

  // Auto editor should be initialized (select populated with placeholder + hero)
  assert.ok(autoSelect.options.length > 0, 'auto editor should be initialized');
  // Manual editor should NOT be initialized
  assert.equal(manualSelect.options.length, 0, 'manual editor should not be initialized');
});

test('initBlockEditor can be called directly on a manual-init element', () => {
  const dom = setupEditor(manualInitMarkup);
  const doc = dom.window.document;

  // Directly call initBlockEditor bypassing the guard
  const root = doc.querySelector('[data-block-editor]');
  initBlockEditor(root);

  const select = doc.querySelector('[data-block-add-select]');
  // Should now have placeholder + hero option
  assert.ok(select.options.length > 0, 'direct initBlockEditor should initialize the editor');

  // Verify the editor is functional: add a block
  select.value = 'hero';
  click(doc.querySelector('[data-block-add]'));
  assert.equal(doc.querySelectorAll('[data-block-item]').length, 1);
});

test('registerBlockTemplate creates a template element with correct attributes', () => {
  const dom = setupEditor(`
    <form>
      <div data-block-editor data-block-init="manual">
        <div data-block-empty></div>
        <div data-block-list></div>
        <input type="hidden" name="blocks" data-block-output value="" />
        <select data-block-add-select></select>
        <button type="button" data-block-add>Add</button>
      </div>
    </form>
  `);
  const doc = dom.window.document;
  const root = doc.querySelector('[data-block-editor]');

  registerBlockTemplate(root, {
    type: 'cta',
    label: 'Call to Action',
    icon: 'megaphone',
    schemaVersion: 'cta@v1.0.0',
    requiredFields: ['title', 'url'],
    html: '<label>Title <input name="title" /></label><label>URL <input name="url" /></label>',
  });

  const tpl = root.querySelector('template[data-block-template][data-block-type="cta"]');
  assert.ok(tpl, 'template element should exist');
  assert.equal(tpl.dataset.blockLabel, 'Call to Action');
  assert.equal(tpl.dataset.blockIcon, 'megaphone');
  assert.equal(tpl.dataset.blockSchemaVersion, 'cta@v1.0.0');
  assert.equal(tpl.dataset.blockRequiredFields, 'title,url');
});

test('registerBlockTemplate + initBlockEditor produces a working editor', () => {
  const dom = setupEditor(`
    <form>
      <div data-block-editor data-block-init="manual">
        <div data-block-empty></div>
        <div data-block-list></div>
        <input type="hidden" name="blocks" data-block-output value="" />
        <select data-block-add-select></select>
        <button type="button" data-block-add>Add</button>
      </div>
    </form>
  `);
  const doc = dom.window.document;
  const root = doc.querySelector('[data-block-editor]');

  // Register templates dynamically
  registerBlockTemplate(root, {
    type: 'banner',
    label: 'Banner',
    html: '<label>Heading <input name="heading" /></label>',
  });

  registerBlockTemplate(root, {
    type: 'quote',
    label: 'Quote',
    icon: 'quote',
    html: '<label>Text <textarea name="text"></textarea></label>',
  });

  // Now initialize
  initBlockEditor(root);

  const select = doc.querySelector('[data-block-add-select]');
  // placeholder + banner + quote = 3 options
  assert.equal(select.options.length, 3, 'select should have placeholder + 2 block types');

  // Add a banner block
  select.value = 'banner';
  click(doc.querySelector('[data-block-add]'));

  const items = doc.querySelectorAll('[data-block-item]');
  assert.equal(items.length, 1);
  assert.equal(items[0].dataset.blockType, 'banner');

  // Fill in a value and check serialization
  const headingInput = items[0].querySelector('[data-block-field-name="heading"], input[name="heading"], input[name^="blocks"]');
  headingInput.value = 'Welcome';
  input(headingInput);

  const payload = getOutputPayload(doc);
  assert.equal(payload.length, 1);
  assert.equal(payload[0]._type, 'banner');
  assert.equal(payload[0].heading, 'Welcome');
});

test('registerBlockTemplate omits optional attributes when not provided', () => {
  const dom = setupEditor(`
    <form>
      <div data-block-editor data-block-init="manual">
        <div data-block-empty></div>
        <div data-block-list></div>
        <input type="hidden" name="blocks" data-block-output value="" />
        <select data-block-add-select></select>
        <button type="button" data-block-add>Add</button>
      </div>
    </form>
  `);
  const doc = dom.window.document;
  const root = doc.querySelector('[data-block-editor]');

  registerBlockTemplate(root, {
    type: 'text',
    label: 'Text Block',
    html: '<label>Body <textarea name="body"></textarea></label>',
  });

  const tpl = root.querySelector('template[data-block-template][data-block-type="text"]');
  assert.ok(tpl, 'template element should exist');
  assert.equal(tpl.dataset.blockLabel, 'Text Block');
  assert.equal(tpl.dataset.blockIcon, undefined, 'icon should not be set');
  assert.equal(tpl.dataset.blockSchemaVersion, undefined, 'schemaVersion should not be set');
  assert.equal(tpl.dataset.blockRequiredFields, undefined, 'requiredFields should not be set');
});
