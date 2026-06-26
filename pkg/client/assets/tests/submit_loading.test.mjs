import test from 'node:test';
import assert from 'node:assert/strict';

const {
  initSubmitLoadingForms,
  resetSubmitLoading,
  setSubmitLoading,
} = await import('../dist/login-submit-loading/index.js');
const {
  initBehaviors,
} = await import('../dist/shared/behaviors/index.js');

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();

function setGlobals(win) {
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.Document = win.Document;
  globalThis.Node = win.Node;
  globalThis.Element = win.Element;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.HTMLFormElement = win.HTMLFormElement;
  globalThis.HTMLButtonElement = win.HTMLButtonElement;
  globalThis.HTMLInputElement = win.HTMLInputElement;
  globalThis.Event = win.Event;
  globalThis.SubmitEvent = win.SubmitEvent;
}

function setupDom(markup) {
  const dom = new JSDOM(markup, {
    url: 'http://localhost:8082/admin/login',
  });
  setGlobals(dom.window);
  return dom;
}

function dispatchSubmit(win, form, submitter = null) {
  const event = typeof win.SubmitEvent === 'function'
    ? new win.SubmitEvent('submit', { bubbles: true, cancelable: true, submitter })
    : new win.Event('submit', { bubbles: true, cancelable: true });
  if (submitter && !('submitter' in event)) {
    Object.defineProperty(event, 'submitter', { value: submitter });
  }
  form.dispatchEvent(event);
  return event;
}

test('submit-loading marks valid native submissions busy without preventing navigation', () => {
  const dom = setupDom(`
    <form data-submit-loading-form action="/admin/login" method="post">
      <input name="identifier" required value="admin@example.com">
      <input name="password" required value="secret">
      <button type="submit"><span data-submit-loading-label>Sign In</span></button>
    </form>
  `);
  const form = dom.window.document.querySelector('form');
  const button = dom.window.document.querySelector('button[type="submit"]');

  const controller = initSubmitLoadingForms({
    root: dom.window.document,
    window: dom.window,
  });
  const event = dispatchSubmit(dom.window, form, button);

  assert.equal(event.defaultPrevented, false);
  assert.equal(form.getAttribute('aria-busy'), 'true');
  assert.equal(form.dataset.loading, 'true');
  assert.equal(form.dataset.submitLoadingActive, 'true');
  assert.equal(button.disabled, true);

  controller.destroy();
});

test('submit-loading compatibility API can bind canonical submit-busy markup', () => {
  const dom = setupDom(`
    <form data-behavior="submit-busy" action="/admin/login" method="post">
      <input name="identifier" required value="admin@example.com">
      <input name="password" required value="secret">
      <button type="submit" data-busy-label="Signing in">
        <span data-busy-label-target>Sign In</span>
      </button>
    </form>
  `);
  const form = dom.window.document.querySelector('form');
  const button = dom.window.document.querySelector('button[type="submit"]');

  const controller = initSubmitLoadingForms({
    root: dom.window.document,
    window: dom.window,
    formSelector: 'form[data-behavior~="submit-busy"]',
  });
  const event = dispatchSubmit(dom.window, form, button);

  assert.equal(event.defaultPrevented, false);
  assert.equal(form.dataset.loading, 'true');
  assert.equal(form.dataset.submitLoadingActive, 'true');
  assert.equal(form.dataset.busy, 'true');
  assert.equal(button.disabled, true);
  assert.equal(dom.window.document.querySelector('[data-busy-label-target]').textContent, 'Signing in');

  controller.destroy();
});

test('submit-loading compatibility API upgrades same-root generic behavior initialization', () => {
  const dom = setupDom(`
    <form data-behavior="submit-busy" action="/admin/login" method="post">
      <input name="identifier" required value="admin@example.com">
      <button type="submit">Sign In</button>
    </form>
  `);
  const form = dom.window.document.querySelector('form');
  const button = dom.window.document.querySelector('button[type="submit"]');

  const generic = initBehaviors(dom.window.document, { window: dom.window });
  const controller = initSubmitLoadingForms({
    root: dom.window.document,
    window: dom.window,
    formSelector: 'form[data-behavior~="submit-busy"]',
  });
  dispatchSubmit(dom.window, form, button);

  assert.equal(form.dataset.busy, 'true');
  assert.equal(form.dataset.loading, 'true');
  assert.equal(form.dataset.submitLoadingActive, 'true');

  controller.destroy();
  generic.destroy();
});

test('submit-loading leaves invalid forms untouched for browser validation', () => {
  const dom = setupDom(`
    <form data-submit-loading-form action="/admin/login" method="post">
      <input name="identifier" required value="">
      <input name="password" required value="">
      <button type="submit">Sign In</button>
    </form>
  `);
  const form = dom.window.document.querySelector('form');
  const button = dom.window.document.querySelector('button[type="submit"]');

  const controller = initSubmitLoadingForms({
    root: dom.window.document,
    window: dom.window,
  });
  const event = dispatchSubmit(dom.window, form, button);

  assert.equal(event.defaultPrevented, false);
  assert.equal(form.hasAttribute('aria-busy'), false);
  assert.equal(form.dataset.loading, undefined);
  assert.equal(button.disabled, false);

  controller.destroy();
});

test('submit-loading prevents duplicate submissions while active', () => {
  const dom = setupDom(`
    <form data-submit-loading-form action="/admin/login" method="post">
      <input name="identifier" required value="admin@example.com">
      <input name="password" required value="secret">
      <button type="submit">Sign In</button>
    </form>
  `);
  const form = dom.window.document.querySelector('form');

  const controller = initSubmitLoadingForms({
    root: dom.window.document,
    window: dom.window,
  });
  const first = dispatchSubmit(dom.window, form);
  const second = dispatchSubmit(dom.window, form);

  assert.equal(first.defaultPrevented, false);
  assert.equal(second.defaultPrevented, true);

  controller.destroy();
});

test('submit-loading handles keyboard-style form submit events', () => {
  const dom = setupDom(`
    <form data-submit-loading-form action="/admin/login" method="post">
      <input name="identifier" required value="admin@example.com">
      <input name="password" required value="secret">
      <button type="submit">Sign In</button>
    </form>
  `);
  const form = dom.window.document.querySelector('form');
  const button = dom.window.document.querySelector('button[type="submit"]');

  const controller = initSubmitLoadingForms({
    root: dom.window.document,
    window: dom.window,
  });
  const event = dispatchSubmit(dom.window, form, button);

  assert.equal(event.defaultPrevented, false);
  assert.equal(form.dataset.loading, 'true');
  assert.equal(button.disabled, true);

  controller.destroy();
});

test('submit-loading resets active forms on pageshow restoration', () => {
  const dom = setupDom(`
    <form data-submit-loading-form action="/admin/login" method="post">
      <input name="identifier" required value="admin@example.com">
      <input name="password" required value="secret">
      <button type="submit">Sign In</button>
    </form>
  `);
  const form = dom.window.document.querySelector('form');
  const button = dom.window.document.querySelector('button[type="submit"]');

  const controller = initSubmitLoadingForms({
    root: dom.window.document,
    window: dom.window,
  });
  dispatchSubmit(dom.window, form);

  assert.equal(form.dataset.loading, 'true');
  assert.equal(button.disabled, true);

  dom.window.dispatchEvent(new dom.window.Event('pageshow'));

  assert.equal(form.hasAttribute('aria-busy'), false);
  assert.equal(form.dataset.loading, undefined);
  assert.equal(form.dataset.submitLoadingActive, undefined);
  assert.equal(button.disabled, false);

  controller.destroy();
});

test('submit-loading pageshow reset does not enable inactive disabled controls', () => {
  const dom = setupDom(`
    <form data-submit-loading-form action="/admin/login" method="post">
      <input name="identifier" required value="admin@example.com">
      <input name="password" required value="secret">
      <button type="submit" disabled>Sign In</button>
    </form>
  `);
  const form = dom.window.document.querySelector('form');
  const button = dom.window.document.querySelector('button[type="submit"]');

  const controller = initSubmitLoadingForms({
    root: dom.window.document,
    window: dom.window,
  });

  dom.window.dispatchEvent(new dom.window.Event('pageshow'));

  assert.equal(form.hasAttribute('aria-busy'), false);
  assert.equal(form.dataset.loading, undefined);
  assert.equal(button.disabled, true);

  controller.destroy();
});

test('submit-loading exported setters preserve previous disabled state on reset', () => {
  const dom = setupDom(`
    <form data-submit-loading-form action="/admin/login" method="post">
      <button type="submit" disabled>Sign In</button>
      <button type="button">Secondary</button>
    </form>
  `);
  const form = dom.window.document.querySelector('form');
  const [submit, secondary] = Array.from(dom.window.document.querySelectorAll('button'));

  setSubmitLoading(form);
  assert.equal(submit.disabled, true);
  assert.equal(secondary.disabled, true);

  resetSubmitLoading(form);
  assert.equal(submit.disabled, true);
  assert.equal(secondary.disabled, false);
  assert.equal(form.hasAttribute('aria-busy'), false);
});

test('submit-loading duplicate initialization does not cancel the first submit event', () => {
  const dom = setupDom(`
    <form data-submit-loading-form action="/admin/login" method="post">
      <input name="identifier" required value="admin@example.com">
      <input name="password" required value="secret">
      <button type="submit">Sign In</button>
    </form>
  `);
  const form = dom.window.document.querySelector('form');
  const button = dom.window.document.querySelector('button[type="submit"]');

  const firstController = initSubmitLoadingForms({
    root: dom.window.document,
    window: dom.window,
  });
  const secondController = initSubmitLoadingForms({
    root: dom.window.document,
    window: dom.window,
  });
  const event = dispatchSubmit(dom.window, form, button);

  assert.equal(event.defaultPrevented, false);
  assert.equal(form.dataset.loading, 'true');
  assert.equal(button.disabled, true);

  firstController.destroy();
  secondController.destroy();
});

test('submit-loading preserves named submitter values and form overrides before disabling', () => {
  const dom = setupDom(`
    <form data-submit-loading-form action="/default" method="post">
      <input name="identifier" required value="admin@example.com">
      <button
        type="submit"
        name="intent"
        value="publish"
        formaction="/publish"
        formmethod="get"
        formenctype="multipart/form-data"
        formtarget="_blank"
        data-submit-loading-busy-label="Publishing"
      >Publish</button>
    </form>
  `);
  const form = dom.window.document.querySelector('form');
  const button = dom.window.document.querySelector('button[type="submit"]');

  const controller = initSubmitLoadingForms({
    root: dom.window.document,
    window: dom.window,
  });
  const event = dispatchSubmit(dom.window, form, button);
  const generated = form.querySelector('input[type="hidden"][data-submit-loading-generated="true"]');

  assert.equal(event.defaultPrevented, false);
  assert.equal(generated?.name, 'intent');
  assert.equal(generated?.value, 'publish');
  assert.equal(form.getAttribute('action'), '/publish');
  assert.equal(form.getAttribute('method'), 'get');
  assert.equal(form.getAttribute('enctype'), 'multipart/form-data');
  assert.equal(form.getAttribute('target'), '_blank');
  assert.equal(button.disabled, true);
  assert.equal(button.getAttribute('aria-label'), 'Publishing');

  controller.reset();

  assert.equal(form.querySelector('input[data-submit-loading-generated="true"]'), null);
  assert.equal(form.getAttribute('action'), '/default');
  assert.equal(form.getAttribute('method'), 'post');
  assert.equal(form.hasAttribute('enctype'), false);
  assert.equal(form.hasAttribute('target'), false);
  assert.equal(button.disabled, false);
  assert.equal(button.hasAttribute('aria-label'), false);

  controller.destroy();
});

test('submit-loading preserves submitter value order around duplicate field names', () => {
  const dom = setupDom(`
    <form data-submit-loading-form action="/publish" method="post">
      <input name="intent" value="before">
      <button type="submit" name="intent" value="publish">Publish</button>
      <input name="intent" value="after">
    </form>
  `);
  const form = dom.window.document.querySelector('form');
  const button = dom.window.document.querySelector('button[type="submit"]');

  const controller = initSubmitLoadingForms({
    root: dom.window.document,
    window: dom.window,
  });
  const event = dispatchSubmit(dom.window, form, button);

  assert.equal(event.defaultPrevented, false);
  assert.deepEqual(new dom.window.FormData(form).getAll('intent'), ['before', 'publish', 'after']);

  controller.destroy();
});

test('submit-loading resets forms submitted to another browsing context', async () => {
  const dom = setupDom(`
    <form data-submit-loading-form action="/publish" method="post">
      <input name="identifier" required value="admin@example.com">
      <button type="submit" formtarget="_blank">Publish</button>
    </form>
  `);
  const form = dom.window.document.querySelector('form');
  const button = dom.window.document.querySelector('button[type="submit"]');

  const controller = initSubmitLoadingForms({
    root: dom.window.document,
    window: dom.window,
  });
  const event = dispatchSubmit(dom.window, form, button);

  assert.equal(event.defaultPrevented, false);
  assert.equal(form.dataset.loading, 'true');
  assert.equal(button.disabled, true);

  await new Promise((resolve) => dom.window.setTimeout(resolve, 0));

  assert.equal(form.hasAttribute('aria-busy'), false);
  assert.equal(form.dataset.loading, undefined);
  assert.equal(form.dataset.submitLoadingActive, undefined);
  assert.equal(form.hasAttribute('target'), false);
  assert.equal(button.disabled, false);

  controller.destroy();
});

test('submit-loading honors formnovalidate submitters', () => {
  const dom = setupDom(`
    <form data-submit-loading-form action="/admin/login" method="post">
      <input name="identifier" required value="">
      <button type="submit" formnovalidate>Skip validation</button>
    </form>
  `);
  const form = dom.window.document.querySelector('form');
  const button = dom.window.document.querySelector('button[type="submit"]');

  const controller = initSubmitLoadingForms({
    root: dom.window.document,
    window: dom.window,
  });
  const event = dispatchSubmit(dom.window, form, button);

  assert.equal(event.defaultPrevented, false);
  assert.equal(form.dataset.loading, 'true');
  assert.equal(button.disabled, true);

  controller.destroy();
});
