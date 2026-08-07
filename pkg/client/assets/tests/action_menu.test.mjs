import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { importDatatableModule } from './helpers/load-datatable-dist.mjs';

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch (_error) {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();

async function importActionMenuModule() {
  await importDatatableModule();
  const distPath = resolve(new URL('..', import.meta.url).pathname, 'dist/shared/action-menu.js');
  return import(pathToFileURL(distPath).href);
}

function setGlobals(win) {
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.MouseEvent = win.MouseEvent;
  globalThis.KeyboardEvent = win.KeyboardEvent;
}

function createDom() {
  return new JSDOM(`
    <!doctype html>
    <html>
      <body>
        <div id="root">
          <div class="relative actions-dropdown" data-action-menu>
            <button type="button" data-action-menu-trigger aria-expanded="false">Actions A</button>
            <div class="actions-menu" data-action-menu-content role="menu">
              <a href="/admin/a" data-action-menu-item role="menuitem">Open</a>
              <a href="/admin/disabled" data-action-menu-item role="menuitem" aria-disabled="true" data-disabled="true">Disabled</a>
            </div>
          </div>
          <div class="relative actions-dropdown" data-action-menu>
            <button type="button" data-action-menu-trigger aria-expanded="false">Actions B</button>
            <div class="actions-menu" data-action-menu-content role="menu">
              <button type="button" data-action-menu-item role="menuitem">Queue</button>
            </div>
          </div>
          <button id="outside" type="button">Outside</button>
        </div>
      </body>
    </html>
  `, { url: 'http://localhost/admin/translations/families' });
}

function setViewport(win, width, height) {
  Object.defineProperty(win, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(win, 'innerHeight', { configurable: true, value: height });
}

function setElementSize(element, width, height) {
  Object.defineProperty(element, 'offsetWidth', { configurable: true, value: width });
  Object.defineProperty(element, 'offsetHeight', { configurable: true, value: height });
}

test('shared action menu initializes static markup and toggles one menu at a time', async () => {
  const { initActionMenus } = await importActionMenuModule();
  const dom = createDom();
  setGlobals(dom.window);

  const root = dom.window.document.getElementById('root');
  const triggers = root.querySelectorAll('[data-action-menu-trigger]');
  const menus = root.querySelectorAll('[data-action-menu-content]');
  const positioned = [];
  const controller = initActionMenus(root, {
    positionMenu: ({ trigger, menu, opening }) => positioned.push({ trigger, menu, opening }),
  });

  assert.equal(menus[0].classList.contains('hidden'), true);
  assert.equal(menus[1].classList.contains('hidden'), true);

  triggers[0].dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.equal(menus[0].classList.contains('hidden'), false);
  assert.equal(triggers[0].getAttribute('aria-expanded'), 'true');
  assert.equal(positioned.length, 1);

  triggers[1].dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.equal(menus[0].classList.contains('hidden'), true);
  assert.equal(menus[1].classList.contains('hidden'), false);
  assert.equal(triggers[0].getAttribute('aria-expanded'), 'false');
  assert.equal(triggers[1].getAttribute('aria-expanded'), 'true');

  controller.destroy();
});

test('shared action menu closes on outside click and Escape', async () => {
  const { initActionMenus } = await importActionMenuModule();
  const dom = createDom();
  setGlobals(dom.window);

  const root = dom.window.document.getElementById('root');
  const trigger = root.querySelector('[data-action-menu-trigger]');
  const menu = root.querySelector('[data-action-menu-content]');
  initActionMenus(root);

  trigger.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.equal(menu.classList.contains('hidden'), false);

  dom.window.document.getElementById('outside').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.equal(menu.classList.contains('hidden'), true);
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');

  trigger.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(menu.classList.contains('hidden'), true);
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
});

test('shared action menu prevents disabled item activation', async () => {
  const { initActionMenus } = await importActionMenuModule();
  const dom = createDom();
  setGlobals(dom.window);

  const root = dom.window.document.getElementById('root');
  const disabled = root.querySelector('[aria-disabled="true"]');
  initActionMenus(root);

  const event = new dom.window.MouseEvent('click', { bubbles: true, cancelable: true });
  const dispatched = disabled.dispatchEvent(event);

  assert.equal(dispatched, false);
  assert.equal(event.defaultPrevented, true);
});

test('shared action menu closes after an enabled item is activated', async () => {
  const { initActionMenus } = await importActionMenuModule();
  const dom = createDom();
  setGlobals(dom.window);

  const root = dom.window.document.getElementById('root');
  const trigger = root.querySelectorAll('[data-action-menu-trigger]')[1];
  const menu = root.querySelectorAll('[data-action-menu-content]')[1];
  const item = menu.querySelector('[role="menuitem"]');
  initActionMenus(root);

  trigger.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  item.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

  assert.equal(menu.classList.contains('hidden'), true);
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
});

test('shared action menu portals open overlays and restores them on close', async () => {
  const { initActionMenus } = await importActionMenuModule();
  const dom = createDom();
  setGlobals(dom.window);

  const root = dom.window.document.getElementById('root');
  const trigger = root.querySelector('[data-action-menu-trigger]');
  const menu = root.querySelector('[data-action-menu-content]');
  const originalParent = menu.parentNode;
  const controller = initActionMenus(root, { portal: true, positionMenu: () => {} });

  trigger.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.equal(menu.parentNode, dom.window.document.body);
  assert.equal(menu.classList.contains('hidden'), false);

  trigger.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.equal(menu.parentNode, originalParent);
  assert.equal(menu.classList.contains('hidden'), true);

  trigger.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  controller.destroy();
  assert.equal(menu.parentNode, originalParent);
  assert.equal(menu.classList.contains('hidden'), true);
});

test('shared action menu moves focus into a portaled menu and supports menu keyboard navigation', async () => {
  const { initActionMenus } = await importActionMenuModule();
  const dom = createDom();
  setGlobals(dom.window);

  const root = dom.window.document.getElementById('root');
  const trigger = root.querySelector('[data-action-menu-trigger]');
  const menu = root.querySelector('[data-action-menu-content]');
  const items = menu.querySelectorAll('[role="menuitem"]');
  const controller = initActionMenus(root, { portal: true, positionMenu: () => {} });

  trigger.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.equal(dom.window.document.activeElement, items[0]);

  dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  assert.equal(dom.window.document.activeElement, items[1]);
  dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  assert.equal(dom.window.document.activeElement, items[0]);
  dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'End', bubbles: true }));
  assert.equal(dom.window.document.activeElement, items[1]);
  dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
  assert.equal(dom.window.document.activeElement, items[0]);
  dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
  assert.equal(dom.window.document.activeElement, items[1]);
  dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

  assert.equal(menu.classList.contains('hidden'), true);
  assert.equal(menu.parentElement.closest('#root'), root);
  assert.equal(dom.window.document.activeElement, trigger);
  controller.destroy();
});

test('portaled menus preserve scoped theme values and restore author inline styles', async () => {
  const { defaultActionMenuPositioner, initActionMenus } = await importActionMenuModule();
  const dom = createDom();
  setGlobals(dom.window);
  setViewport(dom.window, 1200, 800);

  const scopedStyles = dom.window.document.createElement('style');
  scopedStyles.textContent = `
    #root .actions-menu {
      background-color: rgb(21, 31, 41);
      border: 2px solid rgb(51, 61, 71);
      color: rgb(81, 91, 101);
    }
  `;
  dom.window.document.head.appendChild(scopedStyles);
  const root = dom.window.document.getElementById('root');
  root.style.setProperty('--color-text-primary', 'rgb(12, 34, 56)');
  root.style.setProperty('--action-menu-max-width', '17rem');
  const trigger = root.querySelector('[data-action-menu-trigger]');
  const menu = root.querySelector('[data-action-menu-content]');
  menu.setAttribute('style', 'width: 17rem; min-width: 13rem; max-height: 19rem;');
  const originalInlineStyle = menu.getAttribute('style');
  trigger.getBoundingClientRect = () => ({
    top: 100, right: 900, bottom: 132, left: 868, width: 32, height: 32,
    x: 868, y: 100, toJSON() {},
  });
  setElementSize(menu, 272, 180);
  const controller = initActionMenus(root, {
    portal: true,
    positionMenu: ({ trigger: activeTrigger, menu: activeMenu }) => {
      defaultActionMenuPositioner({ trigger: activeTrigger, menu: activeMenu });
    },
  });

  trigger.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.equal(menu.parentElement, dom.window.document.body);
  assert.equal(menu.style.getPropertyValue('--color-text-primary'), 'rgb(12, 34, 56)');
  assert.equal(menu.style.getPropertyValue('--action-menu-max-width'), '17rem');
  assert.equal(menu.style.backgroundColor, 'rgb(21, 31, 41)');
  assert.equal(menu.style.borderTopColor, 'rgb(51, 61, 71)');
  assert.equal(menu.style.color, 'rgb(81, 91, 101)');
  assert.notEqual(menu.getAttribute('style'), originalInlineStyle);

  trigger.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.equal(menu.getAttribute('style'), originalInlineStyle);
  controller.destroy();
});

test('scoped action menu controllers do not double-toggle menus in sibling grids', async () => {
  const { initActionMenus } = await importActionMenuModule();
  const dom = new JSDOM(`
    <!doctype html><body>
      <table id="grid-a"><tbody><tr><td><div data-dropdown><button data-dropdown-trigger>More A</button><div class="actions-menu hidden"><button role="menuitem">A</button></div></div></td></tr></tbody></table>
      <table id="grid-b"><tbody><tr><td><div data-dropdown><button data-dropdown-trigger>More B</button><div class="actions-menu hidden"><button role="menuitem">B</button></div></div></td></tr></tbody></table>
    </body>
  `);
  setGlobals(dom.window);
  const options = {
    containerSelector: '[data-dropdown]',
    triggerSelector: '[data-dropdown-trigger]',
    menuSelector: '.actions-menu',
  };
  const gridA = dom.window.document.getElementById('grid-a');
  const gridB = dom.window.document.getElementById('grid-b');
  const controllerA = initActionMenus(gridA, options);
  const controllerB = initActionMenus(gridB, options);
  const triggerA = gridA.querySelector('[data-dropdown-trigger]');
  const menuA = gridA.querySelector('.actions-menu');

  triggerA.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

  assert.equal(menuA.classList.contains('hidden'), false);
  assert.equal(triggerA.getAttribute('aria-expanded'), 'true');
  controllerA.destroy();
  controllerB.destroy();
});

test('portaled action menus close on page and viewport lifecycle changes', async () => {
  const { initActionMenus } = await importActionMenuModule();
  const dom = createDom();
  setGlobals(dom.window);
  const root = dom.window.document.getElementById('root');
  const trigger = root.querySelector('[data-action-menu-trigger]');
  const menu = root.querySelector('[data-action-menu-content]');
  const controller = initActionMenus(root, { portal: true, positionMenu: () => {} });

  for (const eventName of ['resize', 'pagehide', 'pageshow']) {
    trigger.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    assert.equal(menu.classList.contains('hidden'), false);
    dom.window.dispatchEvent(new dom.window.Event(eventName));
    assert.equal(menu.classList.contains('hidden'), true, `expected ${eventName} to close menu`);
  }
  controller.destroy();
});

test('default action menu positioner applies fixed viewport geometry below the trigger', async () => {
  const { defaultActionMenuPositioner } = await importActionMenuModule();
  const dom = createDom();
  setGlobals(dom.window);
  setViewport(dom.window, 1200, 800);

  const trigger = dom.window.document.querySelector('[data-action-menu-trigger]');
  const menu = dom.window.document.querySelector('[data-action-menu-content]');
  trigger.getBoundingClientRect = () => ({
    top: 100,
    right: 900,
    bottom: 132,
    left: 868,
    width: 32,
    height: 32,
    x: 868,
    y: 100,
    toJSON() {},
  });
  setElementSize(menu, 224, 180);

  defaultActionMenuPositioner({ trigger, menu });

  assert.equal(menu.style.position, 'fixed');
  assert.equal(menu.style.right, 'auto');
  assert.equal(menu.style.left, '676px');
  assert.equal(menu.style.top, '140px');
  assert.equal(menu.style.bottom, 'auto');
  assert.equal(menu.style.margin, '0px');
  assert.equal(menu.style.minWidth, '192px');
  assert.equal(menu.style.maxWidth, '1180px');
  assert.equal(menu.style.maxHeight, '650px');
});

test('default action menu positioner preserves stricter component size limits', async () => {
  const { defaultActionMenuPositioner } = await importActionMenuModule();
  const dom = createDom();
  setGlobals(dom.window);
  setViewport(dom.window, 1200, 800);

  const trigger = dom.window.document.querySelector('[data-action-menu-trigger]');
  const menu = dom.window.document.querySelector('[data-action-menu-content]');
  trigger.getBoundingClientRect = () => ({
    top: 100,
    right: 900,
    bottom: 132,
    left: 868,
    width: 32,
    height: 32,
    x: 868,
    y: 100,
    toJSON() {},
  });
  setElementSize(menu, 224, 400);
  const getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  dom.window.getComputedStyle = (element) => element === menu
    ? { minWidth: '192px', maxWidth: '288px', maxHeight: '400px' }
    : getComputedStyle(element);

  defaultActionMenuPositioner({ trigger, menu });

  assert.equal(menu.style.minWidth, '192px');
  assert.equal(menu.style.maxWidth, '288px');
  assert.equal(menu.style.maxHeight, '400px');
});

test('default action menu positioner opens upward and clamps both axes to the viewport', async () => {
  const { defaultActionMenuPositioner } = await importActionMenuModule();
  const dom = createDom();
  setGlobals(dom.window);
  setViewport(dom.window, 320, 360);

  const trigger = dom.window.document.querySelector('[data-action-menu-trigger]');
  const menu = dom.window.document.querySelector('[data-action-menu-content]');
  trigger.getBoundingClientRect = () => ({
    top: 310,
    right: 318,
    bottom: 342,
    left: 286,
    width: 32,
    height: 32,
    x: 286,
    y: 310,
    toJSON() {},
  });
  setElementSize(menu, 224, 300);

  defaultActionMenuPositioner({ trigger, menu });

  assert.equal(menu.style.left, '86px');
  assert.equal(menu.style.top, '10px');
  assert.equal(menu.style.maxHeight, '292px');
  assert.equal(Number.parseFloat(menu.style.left) + 224 <= 310, true);
  assert.equal(Number.parseFloat(menu.style.top) + 300 <= 350, true);
});

test('default action menu positioner constrains oversized menus to the visual viewport', async () => {
  const { defaultActionMenuPositioner } = await importActionMenuModule();
  const dom = createDom();
  setGlobals(dom.window);
  setViewport(dom.window, 800, 600);
  Object.defineProperty(dom.window, 'visualViewport', {
    configurable: true,
    value: { width: 200, height: 300, offsetLeft: 40, offsetTop: 50 },
  });

  const trigger = dom.window.document.querySelector('[data-action-menu-trigger]');
  const menu = dom.window.document.querySelector('[data-action-menu-content]');
  trigger.getBoundingClientRect = () => ({
    top: 260, right: 225, bottom: 292, left: 193, width: 32, height: 32,
    x: 193, y: 260, toJSON() {},
  });
  setElementSize(menu, 400, 500);

  defaultActionMenuPositioner({ trigger, menu });

  assert.equal(menu.style.minWidth, '180px');
  assert.equal(menu.style.maxWidth, '180px');
  assert.equal(menu.style.maxHeight, '192px');
  assert.equal(menu.style.left, '50px');
  assert.equal(menu.style.top, '60px');
});

test('default action menu positioner accounts for the trigger gap before choosing a direction', async () => {
  const { defaultActionMenuPositioner } = await importActionMenuModule();
  const dom = createDom();
  setGlobals(dom.window);
  setViewport(dom.window, 800, 400);

  const trigger = dom.window.document.querySelector('[data-action-menu-trigger]');
  const menu = dom.window.document.querySelector('[data-action-menu-content]');
  trigger.getBoundingClientRect = () => ({
    top: 223, right: 700, bottom: 255, left: 668, width: 32, height: 32,
    x: 668, y: 223, toJSON() {},
  });
  setElementSize(menu, 224, 140);

  defaultActionMenuPositioner({ trigger, menu });

  const menuTop = Number.parseFloat(menu.style.top);
  const menuHeight = menu.offsetHeight;
  assert.equal(menuTop + menuHeight <= 223 - 8, true);
});

test('shared action menu supports existing DataGrid dropdown markup', async () => {
  const { initActionMenus } = await importActionMenuModule();
  const dom = new JSDOM(`
    <!doctype html>
    <html>
      <body>
        <div class="relative actions-dropdown" data-dropdown>
          <button type="button" data-dropdown-trigger aria-expanded="false">More</button>
          <div class="actions-menu hidden" role="menu">
            <button type="button" class="action-item" role="menuitem">Edit</button>
          </div>
        </div>
      </body>
    </html>
  `, { url: 'http://localhost/admin/content/pages' });
  setGlobals(dom.window);

  const trigger = dom.window.document.querySelector('[data-dropdown-trigger]');
  const menu = dom.window.document.querySelector('.actions-menu');
  let positioned = false;
  initActionMenus(dom.window.document, {
    containerSelector: '[data-dropdown]',
    triggerSelector: '[data-dropdown-trigger]',
    menuSelector: '.actions-menu',
    itemSelector: '[role="menuitem"], .action-item',
    positionMenu: () => {
      positioned = true;
    },
  });

  trigger.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

  assert.equal(menu.classList.contains('hidden'), false);
  assert.equal(trigger.getAttribute('aria-expanded'), 'true');
  assert.equal(positioned, true);
});

test('shared action menu supports legacy DataGrid class-only triggers', async () => {
  const { initActionMenus } = await importActionMenuModule();
  const dom = new JSDOM(`
    <!doctype html>
    <html>
      <body>
        <div class="relative actions-dropdown">
          <button type="button" class="actions-menu-trigger" aria-expanded="false">More</button>
          <div class="actions-menu hidden" role="menu">
            <button type="button" class="action-item" role="menuitem">Edit</button>
          </div>
        </div>
      </body>
    </html>
  `, { url: 'http://localhost/admin/users' });
  setGlobals(dom.window);

  const trigger = dom.window.document.querySelector('.actions-menu-trigger');
  const menu = dom.window.document.querySelector('.actions-menu');
  initActionMenus(dom.window.document, {
    containerSelector: '[data-dropdown], .actions-dropdown',
    triggerSelector: '[data-dropdown-trigger], .actions-menu-trigger',
    menuSelector: '.actions-menu',
    itemSelector: '[role="menuitem"], .action-item',
  });

  trigger.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

  assert.equal(menu.classList.contains('hidden'), false);
  assert.equal(trigger.getAttribute('aria-expanded'), 'true');
});
