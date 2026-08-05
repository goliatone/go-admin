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
  assert.equal(Number.parseFloat(menu.style.left) + 224 <= 310, true);
  assert.equal(Number.parseFloat(menu.style.top) + 300 <= 350, true);
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
