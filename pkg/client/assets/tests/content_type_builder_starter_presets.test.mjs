/**
 * T15 — Starter templates and improved empty states
 *
 * Covers the Content Types quick-add field-set presets (addFieldSet + empty-state
 * rendering) and the Block Library auto-select / single-empty-state behavior.
 */
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

const { ContentTypeEditor, BlockLibraryIDE, FIELD_SET_PRESETS } = await import('../dist/content-type-builder/index.js');

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

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
  setGlobals(dom.window);
  return dom;
}

// --- Content Types: starter presets -----------------------------------------

test('FIELD_SET_PRESETS expose the expected starter templates', () => {
  const ids = FIELD_SET_PRESETS.map((p) => p.id);
  assert.deepEqual(ids, ['basic', 'page', 'blog-post']);
  for (const preset of FIELD_SET_PRESETS) {
    assert.ok(preset.fields.length > 0, `${preset.id} has fields`);
    assert.ok(preset.label && preset.description, `${preset.id} has label + description`);
  }
});

test('ContentTypeEditor empty state renders preset quick-start buttons', async () => {
  setupDom();
  const root = document.createElement('div');
  document.body.appendChild(root);
  const editor = new ContentTypeEditor(root, { apiBasePath: '/admin/api' });
  await editor.init();

  assert.ok(root.querySelector('[data-ct-preset="basic"]'), 'Basic preset button present');
  assert.ok(root.querySelector('[data-ct-preset="page"]'), 'Page preset button present');
  assert.ok(root.querySelector('[data-ct-preset="blog-post"]'), 'Blog Post preset button present');
});

test('ContentTypeEditor addFieldSet adds the preset fields with correct shape', async () => {
  setupDom();
  const root = document.createElement('div');
  document.body.appendChild(root);
  const editor = new ContentTypeEditor(root, { apiBasePath: '/admin/api' });
  await editor.init();

  editor.addFieldSet('page');
  const names = editor.state.fields.map((f) => f.name);
  assert.deepEqual(names, ['title', 'slug', 'body']);
  const title = editor.state.fields.find((f) => f.name === 'title');
  assert.equal(title.type, 'text');
  assert.equal(title.required, true);
  const body = editor.state.fields.find((f) => f.name === 'body');
  assert.equal(body.type, 'rich-text');
  assert.equal(editor.state.isDirty, true, 'applying a preset marks the editor dirty');
});

test('ContentTypeEditor clicking a preset button applies the field set (delegated)', async () => {
  setupDom();
  const root = document.createElement('div');
  document.body.appendChild(root);
  const editor = new ContentTypeEditor(root, { apiBasePath: '/admin/api' });
  await editor.init();

  const btn = root.querySelector('[data-ct-preset="page"]');
  assert.ok(btn, 'preset button present');
  btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.deepEqual(editor.state.fields.map((f) => f.name), ['title', 'slug', 'body']);
});

test('ContentTypeEditor addFieldSet de-duplicates names against existing fields', async () => {
  setupDom();
  const root = document.createElement('div');
  document.body.appendChild(root);
  const editor = new ContentTypeEditor(root, { apiBasePath: '/admin/api' });
  await editor.init();

  editor.state.fields = [{ id: 'x', name: 'title', type: 'text', label: 'Existing', required: false, order: 0 }];
  editor.addFieldSet('basic'); // basic = title + description
  const names = editor.state.fields.map((f) => f.name);
  assert.deepEqual(names, ['title', 'title_1', 'description'], 'colliding name suffixed, others kept');
});

test('ContentTypeEditor addFieldSet ignores an unknown preset id', async () => {
  setupDom();
  const root = document.createElement('div');
  document.body.appendChild(root);
  const editor = new ContentTypeEditor(root, { apiBasePath: '/admin/api' });
  await editor.init();
  editor.addFieldSet('does-not-exist');
  assert.equal(editor.state.fields.length, 0, 'no fields added for unknown preset');
});

// --- Block Library: auto-select + single empty state ------------------------

function makeIDE() {
  const root = document.createElement('div');
  root.dataset.apiBasePath = '/admin/api';
  document.body.appendChild(root);
  return new BlockLibraryIDE(root); // no init() → no network
}

test('BlockLibraryIDE auto-selects the first block when none is selected', () => {
  setupDom();
  const ide = makeIDE();
  ide.state.blocks = [{ id: 'b1', name: 'Hero' }, { id: 'b2', name: 'CTA' }];
  ide.state.selectedBlockId = null;
  ide.autoSelectInitialBlock();
  assert.equal(ide.state.selectedBlockId, 'b1');
});

test('BlockLibraryIDE honors an existing valid selection', () => {
  setupDom();
  const ide = makeIDE();
  ide.state.blocks = [{ id: 'b1', name: 'Hero' }, { id: 'b2', name: 'CTA' }];
  ide.state.selectedBlockId = 'b2';
  ide.autoSelectInitialBlock();
  assert.equal(ide.state.selectedBlockId, 'b2');
});

test('BlockLibraryIDE drops a stale selection then selects the first block', () => {
  setupDom();
  const ide = makeIDE();
  ide.state.blocks = [{ id: 'b2', name: 'CTA' }];
  ide.state.selectedBlockId = 'gone';
  ide.autoSelectInitialBlock();
  assert.equal(ide.state.selectedBlockId, 'b2');
});

test('BlockLibraryIDE leaves selection null and does not throw when empty', () => {
  setupDom();
  const ide = makeIDE();
  ide.state.blocks = [];
  ide.state.selectedBlockId = null;
  ide.autoSelectInitialBlock(); // renders the create-first state (editorEl null → no-op)
  assert.equal(ide.state.selectedBlockId, null);
});
