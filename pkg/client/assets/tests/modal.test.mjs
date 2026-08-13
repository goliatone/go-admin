import test from 'node:test';
import assert from 'node:assert/strict';

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();
const { Modal, ConfirmModal, TextPromptModal } = await import('../dist/components/modal.js');

function setupDom(markup = '<button id="invoker">Open</button>', reducedMotion = true) {
  const dom = new JSDOM(`<!doctype html><html><body>${markup}</body></html>`, {
    url: 'http://localhost/admin',
    pretendToBeVisual: true,
  });
  const win = dom.window;
  win.matchMedia = (query) => ({
    matches: reducedMotion && query === '(prefers-reduced-motion: reduce)',
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() { return true; },
  });
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.Node = win.Node;
  globalThis.Element = win.Element;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.HTMLInputElement = win.HTMLInputElement;
  globalThis.KeyboardEvent = win.KeyboardEvent;
  globalThis.MouseEvent = win.MouseEvent;
  globalThis.requestAnimationFrame = (callback) => callback(0);
  return dom;
}

class FixtureModal extends Modal {
  constructor(options = {}, content = '') {
    super({ animationDuration: 0, ariaLabel: 'Fixture dialog', ...options });
    this.content = content || `
      <h2 id="fixture-title">Fixture</h2>
      <p id="fixture-description">Description</p>
      <button id="first" type="button">First</button>
      <input id="middle" />
      <button id="last" type="button">Last</button>
    `;
    this.beforeHide = true;
    this.bindCount = 0;
    this.afterHideCount = 0;
  }

  renderContent() { return this.content; }
  bindContentEvents() { this.bindCount += 1; }
  onBeforeHide() { return this.beforeHide; }
  onAfterHide() { this.afterHideCount += 1; }
  get dialog() { return this.container; }
  get overlay() { return this.backdrop; }
  replace(content, focus) { this.replaceContent(content, focus); }
}

class FailingModal extends FixtureModal {
  constructor(stage) {
    super();
    this.stage = stage;
  }

  renderContent() {
    if (this.stage === 'render') {
      document.getElementById('side-effect-target')?.focus();
      throw new Error('render failed');
    }
    return super.renderContent();
  }

  bindContentEvents() {
    if (this.stage === 'bind') throw new Error('bind failed');
    super.bindContentEvents();
  }

  async onAfterShow() {
    if (this.stage === 'after-show') throw new Error('after-show failed');
  }
}

function press(key, options = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options });
  document.dispatchEvent(event);
  return event;
}

test('Modal rolls back every mount stage when rendering, binding, or hydration fails', async () => {
  setupDom('<button id="invoker">Open</button><button id="side-effect-target">Side effect</button>');
  const invoker = document.getElementById('invoker');
  invoker.focus();

  for (const stage of ['render', 'bind', 'after-show']) {
    const modal = new FailingModal(stage);
    await assert.rejects(modal.show(), new RegExp(`${stage} failed`));
    assert.equal(modal.isOpen, false);
    assert.equal(document.querySelector('[data-go-admin-modal]'), null);
    assert.equal(document.body.classList.contains('overflow-hidden'), false);
    assert.equal(document.activeElement, invoker);
  }

  const healthy = new FixtureModal();
  await healthy.show();
  assert.equal(healthy.overlay.style.zIndex, '110');
  healthy.destroy();
});

test('Modal establishes initial focus before asynchronous hydration resolves', async () => {
  setupDom();
  let resolveHydration;
  class HydratingModal extends FixtureModal {
    onAfterShow() {
      return new Promise((resolve) => { resolveHydration = resolve; });
    }
  }

  const modal = new HydratingModal({ initialFocus: '#middle' });
  const showing = modal.show();
  assert.equal(document.activeElement.id, 'middle');
  resolveHydration();
  await showing;
  modal.destroy();
});

test('Modal establishes naming, description, deterministic focus, and dialog hooks', async () => {
  setupDom();
  const invoker = document.getElementById('invoker');
  invoker.focus();
  const modal = new FixtureModal({
    ariaLabel: null,
    labelledBy: 'fixture-title',
    describedBy: 'fixture-description',
    initialFocus: '#middle',
  });

  await modal.show();

  assert.equal(modal.dialog.getAttribute('role'), 'dialog');
  assert.equal(modal.dialog.getAttribute('aria-modal'), 'true');
  assert.equal(modal.dialog.getAttribute('aria-labelledby'), 'fixture-title');
  assert.equal(modal.dialog.getAttribute('aria-describedby'), 'fixture-description');
  assert.equal(document.activeElement.id, 'middle');
  assert.equal(modal.bindCount, 1);

  modal.hide();
  assert.equal(document.activeElement, invoker);
  assert.equal(modal.afterHideCount, 1);
});

test('Modal exposes stable visual anatomy, size, state, and additive host classes', async () => {
  setupDom();
  const modal = new FixtureModal({ size: '2xl', containerClass: 'host-modal-surface' });
  await modal.show();

  assert.ok(modal.overlay.classList.contains('go-admin-modal'));
  assert.ok(modal.overlay.classList.contains('go-admin-modal__backdrop'));
  assert.equal(modal.overlay.getAttribute('data-state'), 'open');
  assert.ok(modal.dialog.classList.contains('go-admin-modal-container'));
  assert.ok(modal.dialog.classList.contains('go-admin-modal__container'));
  assert.ok(modal.dialog.classList.contains('go-admin-modal__surface'));
  assert.ok(modal.dialog.classList.contains('go-admin-modal__container--2xl'));
  assert.ok(modal.dialog.classList.contains('go-admin-modal__container--flex'));
  assert.ok(modal.dialog.classList.contains('host-modal-surface'));
  assert.equal(modal.dialog.getAttribute('data-size'), '2xl');

  modal.destroy();
});

test('Modal maximize is opt-in, preserves its stack, and restores before Escape dismissal', async () => {
  setupDom();
  const fixed = new FixtureModal();
  await fixed.show();
  assert.equal(fixed.setMaximized(true), false);
  assert.equal(fixed.isMaximized, false);
  fixed.destroy();

  const modal = new FixtureModal({ maximizable: true });
  await modal.show();
  const control = document.createElement('button');
  modal.dialog.appendChild(control);
  assert.equal(modal.setMaximized(true, control), true);
  assert.equal(modal.dialog.getAttribute('data-maximized'), 'true');
  assert.equal(control.getAttribute('aria-expanded'), 'true');
  press('Escape');
  assert.equal(modal.isMaximized, false);
  assert.equal(modal.isOpen, true);
  press('Escape');
  assert.equal(modal.isOpen, false);
});

test('Modal traps Tab and Shift+Tab within the topmost dialog', async () => {
  setupDom();
  const modal = new FixtureModal({ initialFocus: '#first' });
  await modal.show();

  document.getElementById('last').focus();
  press('Tab');
  assert.equal(document.activeElement.id, 'first');

  press('Tab', { shiftKey: true });
  assert.equal(document.activeElement.id, 'last');
  modal.destroy();
});

test('Modal focuses the container when content has no focusable target', async () => {
  setupDom();
  const modal = new FixtureModal({}, '<p>Read only</p>');
  await modal.show();

  assert.equal(document.activeElement, modal.dialog);
  assert.equal(modal.dialog.getAttribute('tabindex'), '-1');
  press('Tab');
  assert.equal(document.activeElement, modal.dialog);
  modal.destroy();
});

test('Modal supports close veto and configurable Escape/backdrop dismissal', async () => {
  setupDom();
  const modal = new FixtureModal({ dismissOnEscape: false, dismissOnBackdropClick: false });
  await modal.show();
  press('Escape');
  modal.overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  assert.equal(modal.isOpen, true);

  modal.beforeHide = false;
  assert.equal(modal.requestClose(), false);
  assert.equal(modal.isOpen, true);

  modal.beforeHide = true;
  assert.equal(modal.requestClose(), true);
  assert.equal(modal.isOpen, false);
});

test('nested modals give dismissal to the topmost dialog and reference-count scroll locking', async () => {
  setupDom();
  const parent = new FixtureModal({ initialFocus: '#first' });
  await parent.show();
  const parentButton = document.getElementById('first');
  const child = new FixtureModal({ ariaLabel: 'Child dialog', initialFocus: '#last' });
  await child.show();

  assert.ok(Number(child.overlay.style.zIndex) > Number(parent.overlay.style.zIndex));
  assert.equal(document.body.classList.contains('overflow-hidden'), true);
  press('Escape');
  assert.equal(child.isOpen, false);
  assert.equal(parent.isOpen, true);
  assert.equal(document.activeElement, parentButton);
  assert.equal(document.body.classList.contains('overflow-hidden'), true);

  press('Escape');
  assert.equal(parent.isOpen, false);
  assert.equal(document.body.classList.contains('overflow-hidden'), false);
});

test('heading fallback names remain unique across nested modal instances', async () => {
  setupDom();
  const parent = new FixtureModal({ ariaLabel: null }, '<h2>Parent</h2><button>Continue</button>');
  const child = new FixtureModal({ ariaLabel: null }, '<h2>Child</h2><button>Close</button>');

  await parent.show();
  await child.show();

  const parentName = parent.dialog.getAttribute('aria-labelledby');
  const childName = child.dialog.getAttribute('aria-labelledby');
  assert.ok(parentName);
  assert.ok(childName);
  assert.notEqual(parentName, childName);
  assert.equal(document.querySelectorAll(`#${parentName}`).length, 1);
  assert.equal(document.querySelectorAll(`#${childName}`).length, 1);
  child.destroy();
  parent.destroy();
});

test('destroy and interrupted hide/show release listeners and stale cleanup timers', async () => {
  setupDom();
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} });
  const invoker = document.getElementById('invoker');
  invoker.focus();
  const modal = new FixtureModal({ animationDuration: 20 });
  await modal.show();
  modal.hide();
  await modal.show();
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(modal.isOpen, true);
  assert.ok(modal.dialog.isConnected);
  modal.destroy();
  assert.equal(document.activeElement, invoker);
  press('Escape');
  assert.equal(document.querySelector('[data-go-admin-modal]'), null);
  assert.equal(document.body.classList.contains('overflow-hidden'), false);
});

test('focus fallback excludes controls inside hidden or inert content', async () => {
  setupDom();
  const modal = new FixtureModal({}, `
    <div hidden><button id="hidden-control">Hidden</button></div>
    <div inert><button id="inert-control">Inert</button></div>
    <div style="display: none"><button id="css-hidden-control">CSS hidden</button></div>
    <button id="visible-control">Visible</button>
  `);

  await modal.show();

  assert.equal(document.activeElement.id, 'visible-control');
  modal.destroy();
});

test('invalid explicit focus targets fall back and pre-existing scroll locks are preserved', async () => {
  setupDom();
  document.body.classList.add('overflow-hidden');
  const modal = new FixtureModal({ initialFocus: '#disabled-control' }, `
    <button id="disabled-control" disabled>Disabled</button>
    <button id="fallback-control">Fallback</button>
  `);

  await modal.show();
  assert.equal(document.activeElement.id, 'fallback-control');
  modal.destroy();
  assert.equal(document.body.classList.contains('overflow-hidden'), true);
});

test('backdrop dismissal uses the public vetoable close path', async () => {
  setupDom();
  const modal = new FixtureModal();
  await modal.show();
  modal.beforeHide = false;
  modal.overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  assert.equal(modal.isOpen, true);

  modal.beforeHide = true;
  modal.overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  assert.equal(modal.isOpen, false);
});

test('content replacement preserves the dialog instance, stack, and accessible relationships', async () => {
  setupDom();
  const modal = new FixtureModal({ ariaLabel: null, labelledBy: 'fixture-title' });
  await modal.show();
  const dialog = modal.dialog;

  modal.replace(`
    <h2 id="fixture-title">Validation failed</h2>
    <div id="validation-summary" tabindex="-1">Correct the highlighted fields.</div>
    <input id="server-field" />
  `, '#validation-summary');

  assert.equal(modal.dialog, dialog);
  assert.equal(modal.dialog.getAttribute('aria-labelledby'), 'fixture-title');
  assert.equal(document.activeElement.id, 'validation-summary');
  assert.equal(modal.bindCount, 2);

  press('Tab', { shiftKey: true });
  assert.equal(document.activeElement.id, 'server-field');
  document.getElementById('validation-summary').focus();
  press('Tab');
  assert.equal(document.activeElement.id, 'server-field');
  modal.destroy();
});

test('focus remains contained until an animated close has released its DOM', async () => {
  setupDom();
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} });
  const modal = new FixtureModal({ animationDuration: 30 });
  await modal.show();
  document.getElementById('last').focus();
  modal.hide();

  const tab = press('Tab');
  assert.equal(tab.defaultPrevented, true);
  assert.equal(document.activeElement.id, 'first');
  assert.ok(modal.dialog.isConnected);

  await new Promise((resolve) => setTimeout(resolve, 35));
  assert.equal(document.querySelector('[data-go-admin-modal]'), null);
});

test('disconnected invokers are ignored and convenience modals provide explicit names', async () => {
  setupDom();
  const invoker = document.getElementById('invoker');
  invoker.focus();
  const modal = new FixtureModal();
  await modal.show();
  invoker.remove();
  assert.doesNotThrow(() => modal.destroy());

  const confirm = new ConfirmModal({ title: 'Remove item', message: 'This cannot be undone.' });
  const decision = confirm.prompt();
  await Promise.resolve();
  assert.equal(document.querySelector('[role="dialog"]').getAttribute('aria-label'), 'Remove item');
  document.querySelector('[data-modal-cancel]').click();
  assert.equal(await decision, false);

  let cancelled = 0;
  const prompt = new TextPromptModal({
    title: 'Rename item',
    label: 'Name',
    onConfirm: () => {},
    onCancel: () => { cancelled += 1; },
  });
  await prompt.show();
  const promptDialog = document.querySelector('[role="dialog"]');
  const promptInput = promptDialog.querySelector('[data-prompt-input]');
  const promptLabel = promptDialog.querySelector('label');
  const promptError = promptDialog.querySelector('[data-prompt-error]');
  assert.equal(promptDialog.getAttribute('aria-label'), 'Rename item');
  assert.equal(promptLabel.getAttribute('for'), promptInput.id);
  assert.ok(promptInput.getAttribute('aria-describedby').includes(promptError.id));
  assert.equal(promptError.getAttribute('role'), 'alert');
  document.querySelector('[data-prompt-confirm]').click();
  await Promise.resolve();
  assert.equal(promptInput.getAttribute('aria-invalid'), 'true');
  assert.equal(promptError.classList.contains('hidden'), false);
  document.querySelector('[data-prompt-cancel]').click();
  assert.equal(cancelled, 1);
});
