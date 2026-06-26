import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const {
  initBehaviors,
  isBusy,
  resetBehaviors,
  setBusy,
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
  globalThis.HTMLTextAreaElement = win.HTMLTextAreaElement;
  globalThis.HTMLSelectElement = win.HTMLSelectElement;
  globalThis.Event = win.Event;
  globalThis.SubmitEvent = win.SubmitEvent;
  globalThis.CustomEvent = win.CustomEvent;
}

function setupDom(markup) {
  const dom = new JSDOM(markup, {
    url: 'http://localhost:8082/admin/actions',
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

test('behavior runtime starts canonical submit busy without preventing native submit', () => {
  const dom = setupDom(`
    <form data-behavior="submit-busy" action="/save" method="post">
      <input name="title" required value="Hello">
      <button type="submit" name="intent" value="save" data-busy-button data-busy-label="Saving...">
        <span data-busy-spinner hidden></span>
        <span data-busy-label-target>Save</span>
      </button>
    </form>
  `);
  const form = dom.window.document.querySelector('form');
  const button = dom.window.document.querySelector('button');
  const label = dom.window.document.querySelector('[data-busy-label-target]');
  const spinner = dom.window.document.querySelector('[data-busy-spinner]');

  const controller = initBehaviors(dom.window.document, { window: dom.window });
  const event = dispatchSubmit(dom.window, form, button);

  assert.equal(event.defaultPrevented, false);
  assert.equal(isBusy(form), true);
  assert.equal(form.dataset.busy, 'true');
  assert.equal(form.getAttribute('aria-busy'), 'true');
  assert.equal(button.disabled, true);
  assert.equal(button.getAttribute('aria-label'), 'Saving...');
  assert.equal(label.textContent, 'Saving...');
  assert.equal(spinner.hidden, false);
  assert.deepEqual(new dom.window.FormData(form).getAll('intent'), ['save']);

  controller.reset();

  assert.equal(isBusy(form), false);
  assert.equal(form.dataset.busy, undefined);
  assert.equal(form.hasAttribute('aria-busy'), false);
  assert.equal(button.disabled, false);
  assert.equal(button.hasAttribute('aria-label'), false);
  assert.equal(label.textContent, 'Save');
  assert.equal(spinner.hidden, true);

  controller.destroy();
});

test('behavior runtime is idempotent for duplicate initialization', () => {
  const dom = setupDom(`
    <form data-behavior="submit-busy" action="/save" method="post">
      <input name="title" required value="Hello">
      <button type="submit">Save</button>
    </form>
  `);
  const form = dom.window.document.querySelector('form');
  const first = initBehaviors(dom.window.document, { window: dom.window });
  const second = initBehaviors(dom.window.document, { window: dom.window });

  assert.equal(first, second);
  const event = dispatchSubmit(dom.window, form);
  assert.equal(event.defaultPrevented, false);

  const duplicate = dispatchSubmit(dom.window, form);
  assert.equal(duplicate.defaultPrevented, true);

  first.destroy();
});

test('behavior runtime leaves invalid forms untouched', () => {
  const dom = setupDom(`
    <form data-behavior="submit-busy" action="/save" method="post">
      <input name="title" required value="">
      <button type="submit">Save</button>
    </form>
  `);
  const form = dom.window.document.querySelector('form');
  const button = dom.window.document.querySelector('button');
  const controller = initBehaviors(dom.window.document, { window: dom.window });
  const event = dispatchSubmit(dom.window, form, button);

  assert.equal(event.defaultPrevented, false);
  assert.equal(isBusy(form), false);
  assert.equal(button.disabled, false);

  controller.destroy();
});

test('busy helper restores disabled state, aria-busy, label, spinner, and form overrides', () => {
  const dom = setupDom(`
    <form action="/default" method="post" aria-busy="false">
      <input name="title" value="Hello">
      <button
        type="submit"
        name="intent"
        value="publish"
        formaction="/publish"
        formmethod="get"
        data-busy-button
        data-busy-label="Publishing"
      ><span data-busy-label-target>Publish</span></button>
      <button type="button" disabled>Disabled</button>
    </form>
  `);
  const form = dom.window.document.querySelector('form');
  const publish = dom.window.document.querySelector('button[type="submit"]');
  const disabled = dom.window.document.querySelector('button[type="button"]');

  const busy = setBusy(form, { submitter: publish });

  assert.equal(form.getAttribute('action'), '/publish');
  assert.equal(form.getAttribute('method'), 'get');
  assert.equal(publish.disabled, true);
  assert.equal(disabled.disabled, true);
  assert.equal(form.querySelector('[data-busy-generated="true"]').value, 'publish');
  assert.equal(form.querySelector('[data-busy-generated-spinner="true"]').hidden, false);

  busy.reset();

  assert.equal(form.getAttribute('action'), '/default');
  assert.equal(form.getAttribute('method'), 'post');
  assert.equal(form.getAttribute('aria-busy'), 'false');
  assert.equal(publish.disabled, false);
  assert.equal(disabled.disabled, true);
  assert.equal(form.querySelector('[data-busy-generated="true"]'), null);
  assert.equal(form.querySelector('[data-busy-generated-spinner="true"]'), null);
});

test('busy helper restores input submit labels', () => {
  const dom = setupDom(`
    <form action="/save" method="post">
      <input type="submit" value="Save" data-busy-label="Saving">
    </form>
  `);
  const form = dom.window.document.querySelector('form');
  const submit = dom.window.document.querySelector('input[type="submit"]');

  const busy = setBusy(form, { submitter: submit });

  assert.equal(submit.value, 'Saving');
  assert.equal(submit.disabled, true);

  busy.reset();

  assert.equal(submit.value, 'Save');
  assert.equal(submit.disabled, false);
});

test('behavior reset clears busy state inside a fragment subtree', () => {
  const dom = setupDom(`
    <section id="fragment">
      <form data-behavior="submit-busy" action="/save" method="post">
        <input name="title" value="Hello">
        <button type="submit">Save</button>
      </form>
    </section>
  `);
  const fragment = dom.window.document.querySelector('#fragment');
  const form = dom.window.document.querySelector('form');
  const button = dom.window.document.querySelector('button');
  setBusy(form, { submitter: button });

  resetBehaviors(fragment);

  assert.equal(isBusy(form), false);
  assert.equal(button.disabled, false);
});

test('behavior runtime and busy styling are shipped in built assets', async () => {
  const behaviorEntry = await readFile(new URL('../dist/shared/behaviors/index.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../dist/output.css', import.meta.url), 'utf8');

  assert.match(behaviorEntry, /initBehaviors/);
  assert.match(css, /data-busy/);
  assert.match(css, /data-busy-spinner/);
  assert.match(css, /submit-loading-spinner/);
});
