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

const { FieldConfigForm, ContentTypeEditor } = await import('../dist/content-type-builder/index.js');

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
