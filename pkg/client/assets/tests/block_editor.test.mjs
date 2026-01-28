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

const { initBlockEditors } = await import('../dist/formgen/block_editor.js');

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
