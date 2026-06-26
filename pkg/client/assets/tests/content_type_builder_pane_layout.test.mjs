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

const {
  PaneLayoutController,
  createPaneLayout,
  clampWidth,
  paneStorageKey,
  defaultPaneState,
  sanitizePaneState,
  createSafeStorage,
  PANE_LAYOUT_VERSION,
} = await import('../dist/content-type-builder/shared/pane-layout.js');

function setGlobals(win) {
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.Event = win.Event;
  globalThis.MouseEvent = win.MouseEvent;
}

function memStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
}

function shellMarkup() {
  return `
    <div data-pane-shell>
      <aside data-pane-rail="list">
        <button data-pane-toggle="list" type="button">toggle list</button>
      </aside>
      <main data-pane="builder">
        <button data-pane-focus-toggle="builder" type="button">focus builder</button>
        <button data-pane-focus-toggle="preview" type="button">focus preview</button>
        <button data-pane-focus-exit type="button">exit</button>
      </main>
      <aside data-pane-rail="palette">
        <div data-pane-resize="palette"></div>
      </aside>
    </div>`;
}

function setupShell() {
  const dom = new JSDOM(`<!doctype html><html><body>${shellMarkup()}</body></html>`, { url: 'http://localhost' });
  setGlobals(dom.window);
  const root = dom.window.document.querySelector('[data-pane-shell]');
  return { dom, root };
}

const baseConfig = (storage) => ({
  surface: 'content-types',
  rails: [
    { id: 'list' },
    { id: 'palette', resizable: true, edge: 'leading', min: 220, max: 480, defaultWidth: 300 },
  ],
  focusPanes: ['builder', 'preview'],
  storage,
});

function click(el) {
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

test('clampWidth bounds finite numbers and rejects non-finite input', () => {
  assert.equal(clampWidth(300, 220, 480), 300);
  assert.equal(clampWidth(100, 220, 480), 220);
  assert.equal(clampWidth(900, 220, 480), 480);
  assert.equal(clampWidth('360', 220, 480), 360);
  assert.equal(clampWidth(NaN, 220, 480), null);
  assert.equal(clampWidth('nope', 220, 480), null);
  assert.equal(clampWidth(undefined, 220, 480), null);
  // Swapped bounds are tolerated.
  assert.equal(clampWidth(300, 480, 220), 300);
});

test('paneStorageKey is versioned and surface-scoped', () => {
  assert.equal(paneStorageKey({ surface: 'block-library', rails: [] }), `cm-pane:v${PANE_LAYOUT_VERSION}:block-library`);
  assert.equal(paneStorageKey({ surface: 'content-types', version: 9, rails: [] }), 'cm-pane:v9:content-types');
});

test('defaultPaneState applies collapsed flags and clamps default widths', () => {
  const state = defaultPaneState({
    surface: 's',
    rails: [
      { id: 'list', defaultCollapsed: true },
      { id: 'palette', resizable: true, min: 220, max: 480, defaultWidth: 999 },
    ],
  });
  assert.equal(state.rails.list.collapsed, true);
  assert.equal(state.rails.list.width, null);
  assert.equal(state.rails.palette.collapsed, false);
  assert.equal(state.rails.palette.width, 480); // clamped from 999
  assert.equal(state.focus, null);
});

test('sanitizePaneState drops unknown rails, clamps widths, and resets invalid focus', () => {
  const config = baseConfig(memStorage());
  const sanitized = sanitizePaneState(
    {
      rails: {
        list: { collapsed: true, width: 'junk' },
        palette: { collapsed: false, width: 10000 },
        ghost: { collapsed: true, width: 50 },
      },
      focus: 'not-a-pane',
    },
    config,
  );
  assert.equal(sanitized.rails.list.collapsed, true);
  assert.equal(sanitized.rails.list.width, null); // non-resizable rail never carries width
  assert.equal(sanitized.rails.palette.width, 480); // clamped from 10000
  assert.equal(sanitized.rails.ghost, undefined); // unknown rail dropped
  assert.equal(sanitized.focus, null); // invalid focus reset
});

test('sanitizePaneState tolerates garbage payloads', () => {
  const config = baseConfig(memStorage());
  for (const garbage of [null, undefined, 42, 'str', [], { rails: 7 }]) {
    const sanitized = sanitizePaneState(garbage, config);
    assert.equal(sanitized.focus, null);
    assert.equal(sanitized.rails.palette.width, 300); // falls back to default
  }
});

test('createSafeStorage falls back to memory when backing storage throws', () => {
  const throwing = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
    removeItem() { throw new Error('blocked'); },
  };
  const safe = createSafeStorage(throwing);
  // Should not throw, and should round-trip through the in-memory fallback.
  safe.setItem('k', 'v');
  assert.equal(safe.getItem('k'), 'v');
  safe.removeItem('k');
  assert.equal(safe.getItem('k'), null);
});

test('createSafeStorage with explicit null uses memory only and never probes localStorage', () => {
  const safe = createSafeStorage(null);
  safe.setItem('a', '1');
  assert.equal(safe.getItem('a'), '1');
});

// ---------------------------------------------------------------------------
// DOM controller: restore + apply
// ---------------------------------------------------------------------------

test('controller restores persisted state and applies it to the DOM', () => {
  const { root } = setupShell();
  const storage = memStorage({
    [`cm-pane:v${PANE_LAYOUT_VERSION}:content-types`]: JSON.stringify({
      rails: { list: { collapsed: true, width: null }, palette: { collapsed: false, width: 360 } },
      focus: 'preview',
    }),
  });
  const ctrl = new PaneLayoutController(root, baseConfig(storage)).init();

  const list = root.querySelector('[data-pane-rail="list"]');
  const palette = root.querySelector('[data-pane-rail="palette"]');
  const toggle = root.querySelector('[data-pane-toggle="list"]');

  assert.equal(list.getAttribute('data-collapsed'), 'true');
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(palette.style.width, '360px');
  assert.equal(palette.style.flexBasis, '360px');
  assert.equal(root.getAttribute('data-pane-focus'), 'preview');
  assert.equal(root.querySelector('[data-pane-focus-toggle="preview"]').getAttribute('aria-pressed'), 'true');
  assert.equal(root.querySelector('[data-pane-focus-toggle="builder"]').getAttribute('aria-pressed'), 'false');

  ctrl.destroy();
});

test('controller falls back to defaults when storage is empty', () => {
  const { root } = setupShell();
  const ctrl = new PaneLayoutController(root, baseConfig(memStorage())).init();
  const state = ctrl.getState();
  assert.equal(state.rails.list.collapsed, false);
  assert.equal(state.rails.palette.width, 300);
  assert.equal(state.focus, null);
  ctrl.destroy();
});

// ---------------------------------------------------------------------------
// DOM controller: collapse / resize / focus + persistence
// ---------------------------------------------------------------------------

test('clicking a collapse toggle updates state, DOM, and persistence', () => {
  const { root } = setupShell();
  const storage = memStorage();
  const ctrl = new PaneLayoutController(root, baseConfig(storage)).init();
  const list = root.querySelector('[data-pane-rail="list"]');
  const toggle = root.querySelector('[data-pane-toggle="list"]');

  click(toggle);
  assert.equal(ctrl.getState().rails.list.collapsed, true);
  assert.equal(list.getAttribute('data-collapsed'), 'true');
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');

  const persisted = JSON.parse(storage.getItem(`cm-pane:v${PANE_LAYOUT_VERSION}:content-types`));
  assert.equal(persisted.rails.list.collapsed, true);

  click(toggle);
  assert.equal(ctrl.getState().rails.list.collapsed, false);
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  ctrl.destroy();
});

test('setRailWidth clamps within min/max, applies inline width, and persists', () => {
  const { root } = setupShell();
  const storage = memStorage();
  const ctrl = new PaneLayoutController(root, baseConfig(storage)).init();
  const palette = root.querySelector('[data-pane-rail="palette"]');

  ctrl.setRailWidth('palette', 5000);
  assert.equal(ctrl.getState().rails.palette.width, 480);
  assert.equal(palette.style.width, '480px');

  ctrl.setRailWidth('palette', 10);
  assert.equal(ctrl.getState().rails.palette.width, 220);

  const persisted = JSON.parse(storage.getItem(`cm-pane:v${PANE_LAYOUT_VERSION}:content-types`));
  assert.equal(persisted.rails.palette.width, 220);

  // Non-resizable rails ignore width changes.
  ctrl.setRailWidth('list', 400);
  assert.equal(ctrl.getState().rails.list.width, null);
  ctrl.destroy();
});

test('collapsing a resizable rail clears its inline width so CSS can own the collapsed size', () => {
  const { root } = setupShell();
  const ctrl = new PaneLayoutController(root, baseConfig(memStorage())).init();
  const palette = root.querySelector('[data-pane-rail="palette"]');
  ctrl.setRailWidth('palette', 360);
  assert.equal(palette.style.width, '360px');
  ctrl.setRailCollapsed('palette', true);
  assert.equal(palette.style.width, '');
  assert.equal(palette.getAttribute('data-collapsed'), 'true');
  // Width is preserved in state and re-applied on expand.
  ctrl.setRailCollapsed('palette', false);
  assert.equal(palette.style.width, '360px');
  ctrl.destroy();
});

test('focus mode toggles via controls and ignores invalid targets', () => {
  const { root } = setupShell();
  const storage = memStorage();
  const ctrl = new PaneLayoutController(root, baseConfig(storage)).init();
  const focusBuilder = root.querySelector('[data-pane-focus-toggle="builder"]');
  const exit = root.querySelector('[data-pane-focus-exit]');

  click(focusBuilder);
  assert.equal(ctrl.getState().focus, 'builder');
  assert.equal(root.getAttribute('data-pane-focus'), 'builder');
  assert.equal(focusBuilder.getAttribute('aria-pressed'), 'true');

  // Clicking the same toggle again clears focus.
  click(focusBuilder);
  assert.equal(ctrl.getState().focus, null);
  assert.equal(root.hasAttribute('data-pane-focus'), false);

  // Programmatic invalid focus is ignored.
  ctrl.setFocus('nonsense');
  assert.equal(ctrl.getState().focus, null);

  ctrl.setFocus('preview');
  assert.equal(root.getAttribute('data-pane-focus'), 'preview');
  click(exit);
  assert.equal(ctrl.getState().focus, null);

  const persisted = JSON.parse(storage.getItem(`cm-pane:v${PANE_LAYOUT_VERSION}:content-types`));
  assert.equal(persisted.focus, null);
  ctrl.destroy();
});

test('onChange fires with a defensive snapshot on every mutation', () => {
  const { root } = setupShell();
  const seen = [];
  const config = { ...baseConfig(memStorage()), onChange: (s) => seen.push(s) };
  const ctrl = new PaneLayoutController(root, config).init();
  ctrl.toggleRail('list');
  ctrl.setFocus('builder');
  assert.equal(seen.length, 2);
  // Mutating a snapshot must not corrupt internal state.
  seen[0].rails.list.collapsed = false;
  assert.equal(ctrl.getState().rails.list.collapsed, true);
  ctrl.destroy();
});

test('destroy removes listeners so controls no longer mutate state', () => {
  const { root } = setupShell();
  const ctrl = new PaneLayoutController(root, baseConfig(memStorage())).init();
  const toggle = root.querySelector('[data-pane-toggle="list"]');
  ctrl.destroy();
  click(toggle);
  assert.equal(ctrl.getState().rails.list.collapsed, false);
});

test('createPaneLayout returns null for a missing root and a controller otherwise', () => {
  assert.equal(createPaneLayout(null, baseConfig(memStorage())), null);
  const { root } = setupShell();
  const ctrl = createPaneLayout(root, baseConfig(memStorage()));
  assert.ok(ctrl instanceof PaneLayoutController);
  ctrl.destroy();
});

test('a stale higher-version payload is ignored because the key is version-scoped', () => {
  const { root } = setupShell();
  // Old payload written under v0; current controller reads v{PANE_LAYOUT_VERSION}.
  const storage = memStorage({
    'cm-pane:v0:content-types': JSON.stringify({ rails: { palette: { width: 999 } }, focus: 'builder' }),
  });
  const ctrl = new PaneLayoutController(root, baseConfig(storage)).init();
  assert.equal(ctrl.getState().rails.palette.width, 300); // default, stale key not read
  assert.equal(ctrl.getState().focus, null);
  ctrl.destroy();
});
