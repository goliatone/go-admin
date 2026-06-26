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

const { buildShellConfig, initContentModelingShell, initContentModelingShells } = await import(
  '../dist/content-type-builder/shared/content-modeling-shell.js'
);
const { PaneLayoutController } = await import('../dist/content-type-builder/shared/pane-layout.js');

function setGlobals(win) {
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.Event = win.Event;
  globalThis.MouseEvent = win.MouseEvent;
}

// Mirrors the content-types/editor.html shell contract.
function shellMarkup() {
  return `
    <div class="cm-shell" data-content-modeling-shell data-cm-surface="content-types">
      <aside class="cm-rail cm-rail--list" data-pane-rail="list"
             data-pane-resizable data-pane-edge="trailing"
             data-pane-min="240" data-pane-max="420" data-pane-default-width="320"></aside>
      <div class="cm-splitter" data-pane-resize="list"></div>
      <div data-pane="builder">
        <button data-pane-toggle="list" type="button" aria-expanded="true">toggle</button>
        <button data-pane-focus-toggle="builder" type="button" aria-pressed="false">focus</button>
        <div data-content-type-editor-root></div>
      </div>
    </div>`;
}

function setup(html = shellMarkup()) {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, { url: 'http://localhost' });
  setGlobals(dom.window);
  return dom;
}

function memStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

function click(el) {
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
}

test('buildShellConfig reads the declarative rail + focus attributes', () => {
  const dom = setup();
  const root = dom.window.document.querySelector('[data-content-modeling-shell]');
  const config = buildShellConfig(root, { storage: memStorage() });
  assert.equal(config.surface, 'content-types');
  assert.equal(config.rails.length, 1);
  const rail = config.rails[0];
  assert.equal(rail.id, 'list');
  assert.equal(rail.resizable, true);
  assert.equal(rail.edge, 'trailing');
  assert.equal(rail.min, 240);
  assert.equal(rail.max, 420);
  assert.equal(rail.defaultWidth, 320);
  assert.deepEqual(config.focusPanes, ['builder']);
});

test('buildShellConfig falls back to a default surface and dedupes rails/focus', () => {
  const dom = setup(`
    <div data-content-modeling-shell>
      <aside data-pane-rail="list"></aside>
      <aside data-pane-rail="list"></aside>
      <button data-pane-focus-toggle="builder"></button>
      <button data-pane-focus-toggle="builder"></button>
    </div>`);
  const root = dom.window.document.querySelector('[data-content-modeling-shell]');
  const config = buildShellConfig(root, { storage: memStorage() });
  assert.equal(config.surface, 'content-modeling');
  assert.equal(config.rails.length, 1);
  assert.deepEqual(config.focusPanes, ['builder']);
});

test('initContentModelingShell wires a controller, applies defaults, and is idempotent', () => {
  const dom = setup();
  const root = dom.window.document.querySelector('[data-content-modeling-shell]');
  const ctrl = initContentModelingShell(root, { storage: memStorage() });
  assert.ok(ctrl instanceof PaneLayoutController);
  // Default width applied to the resizable list rail.
  const rail = root.querySelector('[data-pane-rail="list"]');
  assert.equal(rail.style.width, '320px');
  assert.equal(root.dataset.cmShellInit, 'true');
  // Second call is a no-op.
  assert.equal(initContentModelingShell(root, { storage: memStorage() }), null);
  ctrl.destroy();
});

test('initContentModelingShell restores persisted collapse + focus from storage', () => {
  const dom = setup();
  const root = dom.window.document.querySelector('[data-content-modeling-shell]');
  const storage = memStorage({
    'cm-pane:v1:content-types': JSON.stringify({
      rails: { list: { collapsed: true, width: 360 } },
      focus: 'builder',
    }),
  });
  const ctrl = initContentModelingShell(root, { storage });
  const rail = root.querySelector('[data-pane-rail="list"]');
  assert.equal(rail.getAttribute('data-collapsed'), 'true');
  assert.equal(root.getAttribute('data-pane-focus'), 'builder');
  assert.equal(root.querySelector('[data-pane-focus-toggle="builder"]').getAttribute('aria-pressed'), 'true');
  ctrl.destroy();
});

test('the wired list toggle collapses the rail through the controller', () => {
  const dom = setup();
  const root = dom.window.document.querySelector('[data-content-modeling-shell]');
  const ctrl = initContentModelingShell(root, { storage: memStorage() });
  const rail = root.querySelector('[data-pane-rail="list"]');
  const toggle = root.querySelector('[data-pane-toggle="list"]');
  assert.equal(rail.getAttribute('data-collapsed'), 'false');
  click(toggle);
  assert.equal(rail.getAttribute('data-collapsed'), 'true');
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  ctrl.destroy();
});

// Mirrors the block-definitions/index.html shell contract (two rails).
function blockLibraryMarkup() {
  return `
    <div class="cm-shell" data-content-modeling-shell data-cm-surface="block-library">
      <aside class="cm-rail cm-rail--list" data-pane-rail="list"
             data-pane-resizable data-pane-edge="trailing"
             data-pane-min="200" data-pane-max="380" data-pane-default-width="240"></aside>
      <div class="cm-splitter" data-pane-resize="list"></div>
      <section data-pane="builder">
        <button data-pane-toggle="list" type="button" aria-expanded="true">L</button>
        <button data-pane-toggle="palette" type="button" aria-expanded="true">P</button>
        <button data-pane-focus-toggle="builder" type="button" aria-pressed="false">F</button>
      </section>
      <div class="cm-splitter" data-pane-resize="palette"></div>
      <aside class="cm-rail cm-rail--palette" data-pane-rail="palette"
             data-pane-resizable data-pane-edge="leading"
             data-pane-min="220" data-pane-max="400" data-pane-default-width="260"></aside>
    </div>`;
}

test('block-library shell wires both list and palette rails with correct edges', () => {
  const dom = setup(blockLibraryMarkup());
  const root = dom.window.document.querySelector('[data-content-modeling-shell]');
  const config = buildShellConfig(root, { storage: memStorage() });
  assert.equal(config.surface, 'block-library');
  assert.equal(config.rails.length, 2);
  const [list, palette] = config.rails;
  assert.equal(list.id, 'list');
  assert.equal(list.edge, 'trailing');
  assert.equal(palette.id, 'palette');
  assert.equal(palette.edge, 'leading');
  assert.equal(palette.defaultWidth, 260);
});

test('block-library palette toggle collapses only the palette rail', () => {
  const dom = setup(blockLibraryMarkup());
  const root = dom.window.document.querySelector('[data-content-modeling-shell]');
  const ctrl = initContentModelingShell(root, { storage: memStorage() });
  const list = root.querySelector('[data-pane-rail="list"]');
  const palette = root.querySelector('[data-pane-rail="palette"]');
  // Both rails apply their default widths at init.
  assert.equal(list.style.width, '240px');
  assert.equal(palette.style.width, '260px');
  click(root.querySelector('[data-pane-toggle="palette"]'));
  assert.equal(palette.getAttribute('data-collapsed'), 'true');
  assert.equal(list.getAttribute('data-collapsed'), 'false');
  ctrl.destroy();
});

test('initContentModelingShells skips roots without rails and returns controllers', () => {
  const dom = setup(`
    <div data-content-modeling-shell data-cm-surface="empty"></div>
    ${shellMarkup()}`);
  const controllers = initContentModelingShells(dom.window.document, { storage: memStorage() });
  assert.equal(controllers.length, 1);
  controllers.forEach((c) => c.destroy());
});
