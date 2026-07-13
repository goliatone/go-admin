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
  globalThis.MouseEvent = win.MouseEvent;
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

test('behavior runtime merges compatibility options for the same root', () => {
  const dom = setupDom(`
    <form data-behavior="submit-busy" action="/save" method="post">
      <input name="title" value="Hello">
      <button type="submit">Save</button>
    </form>
  `);
  const form = dom.window.document.querySelector('form');
  const first = initBehaviors(dom.window.document, { window: dom.window });
  const second = initBehaviors(dom.window.document, {
    window: dom.window,
    submitBusySelector: 'form[data-behavior~="submit-busy"]',
    compatibilitySubmitLoading: true,
  });

  assert.notEqual(first, second);
  dispatchSubmit(dom.window, form, dom.window.document.querySelector('button'));

  assert.equal(form.dataset.busy, 'true');
  assert.equal(form.dataset.loading, 'true');
  assert.equal(form.dataset.submitLoadingActive, 'true');

  first.destroy();
  second.destroy();
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

test('navigation busy starts for explicit native links, blocks duplicates, and restores on pageshow', () => {
  const dom = setupDom(`
    <section data-behavior="navigation-busy" data-navigation-busy-label="Updating results...">
      <a href="/admin/actions?status=open" data-navigation-busy-trigger>Open</a>
      <button type="button">Action</button>
      <div data-navigation-busy-status hidden role="status" aria-live="polite">
        <span data-navigation-busy-label-target>Original status</span>
      </div>
    </section>
  `);
  const root = dom.window.document.querySelector('section');
  const link = dom.window.document.querySelector('a');
  const button = dom.window.document.querySelector('button');
  const status = dom.window.document.querySelector('[data-navigation-busy-status]');
  const label = dom.window.document.querySelector('[data-navigation-busy-label-target]');
  const controller = initBehaviors(dom.window.document, { window: dom.window });

  const first = new dom.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
  link.dispatchEvent(first);

  assert.equal(first.defaultPrevented, false);
  assert.equal(root.dataset.navigationBusyActive, 'true');
  assert.equal(root.dataset.busy, 'true');
  assert.equal(root.getAttribute('aria-busy'), 'true');
  assert.equal(link.getAttribute('aria-disabled'), 'true');
  assert.equal(link.dataset.navigationBusyTriggerActive, 'true');
  assert.equal(button.disabled, true);
  assert.equal(status.hidden, false);
  assert.equal(label.textContent, 'Updating results...');

  const duplicate = new dom.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
  link.dispatchEvent(duplicate);
  assert.equal(duplicate.defaultPrevented, true);

  dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pageshow'));

  assert.equal(root.dataset.navigationBusyActive, undefined);
  assert.equal(root.dataset.busy, undefined);
  assert.equal(root.hasAttribute('aria-busy'), false);
  assert.equal(link.hasAttribute('aria-disabled'), false);
  assert.equal(link.dataset.navigationBusyTriggerActive, undefined);
  assert.equal(button.disabled, false);
  assert.equal(status.hidden, true);
  assert.equal(label.textContent, 'Original status');

  controller.destroy();
});

test('navigation busy handles one bubbling event once across document and fragment runtimes', () => {
  const dom = setupDom(`
    <main id="fragment">
      <section data-behavior="navigation-busy">
        <a href="/admin/actions?page=2" data-navigation-busy-trigger>Next</a>
        <form action="/admin/actions" method="get" data-navigation-busy-trigger>
          <input name="status" value="open">
          <button type="submit">Apply</button>
        </form>
      </section>
    </main>
  `);
  const fragment = dom.window.document.querySelector('#fragment');
  const root = dom.window.document.querySelector('section');
  const link = dom.window.document.querySelector('a');
  const form = dom.window.document.querySelector('form');
  const button = dom.window.document.querySelector('button');
  const documentController = initBehaviors(dom.window.document, { window: dom.window });
  const fragmentController = initBehaviors(fragment, { window: dom.window, listenForFragments: false });

  const firstClick = new dom.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
  link.dispatchEvent(firstClick);
  assert.equal(firstClick.defaultPrevented, false);
  assert.equal(root.dataset.navigationBusyActive, 'true');

  const duplicateClick = new dom.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
  link.dispatchEvent(duplicateClick);
  assert.equal(duplicateClick.defaultPrevented, true);

  resetBehaviors(dom.window.document);

  const firstSubmit = dispatchSubmit(dom.window, form, button);
  assert.equal(firstSubmit.defaultPrevented, false);
  assert.equal(root.dataset.navigationBusyActive, 'true');

  const duplicateSubmit = dispatchSubmit(dom.window, form, button);
  assert.equal(duplicateSubmit.defaultPrevented, true);

  fragmentController.destroy();
  documentController.destroy();
});

test('navigation busy ignores modified, download, non-self, hash-only, and prevented link clicks', () => {
  const dom = setupDom(`
    <section data-behavior="navigation-busy">
      <a id="modified" href="/admin/actions?page=2" data-navigation-busy-trigger>Modified</a>
      <a id="download" href="/report.csv" download data-navigation-busy-trigger>Download</a>
      <a id="external-target" href="/admin/actions?page=3" target="_blank" data-navigation-busy-trigger>New tab</a>
      <a id="hash" href="#details" data-navigation-busy-trigger>Details</a>
      <a id="prevented" href="/admin/actions?page=4" data-navigation-busy-trigger>Prevented</a>
    </section>
  `);
  const root = dom.window.document.querySelector('section');
  const controller = initBehaviors(dom.window.document, { window: dom.window });
  dom.window.document.querySelector('#prevented').addEventListener('click', (event) => event.preventDefault());

  const cases = [
    ['#modified', { ctrlKey: true }],
    ['#download', {}],
    ['#external-target', {}],
    ['#hash', {}],
    ['#prevented', {}],
  ];
  for (const [selector, options] of cases) {
    const event = new dom.window.MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      button: 0,
      ...options,
    });
    dom.window.document.querySelector(selector).dispatchEvent(event);
    assert.equal(root.dataset.navigationBusyActive, undefined, selector);
  }

  controller.destroy();
});

test('navigation busy resolves document base targets for links and forms', () => {
  const dom = setupDom(`
    <base target="_blank">
    <section data-behavior="navigation-busy">
      <a id="inherited-link" href="/admin/actions?page=2" data-navigation-busy-trigger>New context</a>
      <a id="self-link" href="/admin/actions?page=3" target="_self" data-navigation-busy-trigger>Current context</a>
      <form id="inherited-form" action="/admin/actions" method="get" data-navigation-busy-trigger>
        <button type="submit">New context form</button>
      </form>
      <form id="self-form" action="/admin/actions" method="get" data-navigation-busy-trigger>
        <button type="submit" formtarget="_self">Current context form</button>
      </form>
    </section>
  `);
  const root = dom.window.document.querySelector('section');
  const controller = initBehaviors(dom.window.document, { window: dom.window });

  const inheritedClick = new dom.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
  dom.window.document.querySelector('#inherited-link').dispatchEvent(inheritedClick);
  assert.equal(root.dataset.navigationBusyActive, undefined);

  const inheritedForm = dom.window.document.querySelector('#inherited-form');
  const inheritedSubmit = dispatchSubmit(dom.window, inheritedForm, inheritedForm.querySelector('button'));
  assert.equal(inheritedSubmit.defaultPrevented, false);
  assert.equal(root.dataset.navigationBusyActive, undefined);

  const selfClick = new dom.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
  dom.window.document.querySelector('#self-link').dispatchEvent(selfClick);
  assert.equal(selfClick.defaultPrevented, false);
  assert.equal(root.dataset.navigationBusyActive, 'true');

  resetBehaviors(dom.window.document);

  const selfForm = dom.window.document.querySelector('#self-form');
  const selfSubmit = dispatchSubmit(dom.window, selfForm, selfForm.querySelector('button'));
  assert.equal(selfSubmit.defaultPrevented, false);
  assert.equal(root.dataset.navigationBusyActive, 'true');

  controller.destroy();
});

test('navigation busy ignores unsupported form destinations after submitter overrides', () => {
  const dom = setupDom(`
    <section data-behavior="navigation-busy">
      <form id="mailto" action="mailto:test@example.com" method="post" data-navigation-busy-trigger>
        <button type="submit">Mail</button>
      </form>
      <form id="javascript" action="javascript:void(0)" method="get" data-navigation-busy-trigger>
        <button type="submit">Script</button>
      </form>
      <form id="dialog" action="/admin/actions" method="dialog" data-navigation-busy-trigger>
        <button type="submit">Close dialog</button>
      </form>
      <form id="override-unsupported" action="/admin/actions" method="post" data-navigation-busy-trigger>
        <button type="submit" formaction="mailto:test@example.com" formmethod="dialog">Unsupported override</button>
      </form>
      <form id="override-supported" action="mailto:test@example.com" method="dialog" data-navigation-busy-trigger>
        <button type="submit" formaction="/admin/actions" formmethod="post">Supported override</button>
      </form>
    </section>
  `);
  const root = dom.window.document.querySelector('section');
  const controller = initBehaviors(dom.window.document, { window: dom.window });

  for (const selector of ['#mailto', '#javascript', '#dialog', '#override-unsupported']) {
    const form = dom.window.document.querySelector(selector);
    const event = dispatchSubmit(dom.window, form, form.querySelector('button'));
    assert.equal(event.defaultPrevented, false, selector);
    assert.equal(root.dataset.navigationBusyActive, undefined, selector);
  }

  const supported = dom.window.document.querySelector('#override-supported');
  const supportedEvent = dispatchSubmit(dom.window, supported, supported.querySelector('button'));
  assert.equal(supportedEvent.defaultPrevented, false);
  assert.equal(root.dataset.navigationBusyActive, 'true');
  assert.equal(supported.getAttribute('action'), '/admin/actions');
  assert.equal(supported.getAttribute('method'), 'post');

  controller.destroy();
});

test('navigation busy preserves native form submitter semantics and resets on destroy', () => {
  const dom = setupDom(`
    <section data-behavior="navigation-busy" data-navigation-busy-label="Filtering...">
      <form action="/admin/actions" method="get" data-navigation-busy-trigger>
        <input name="status" required value="open">
        <select name="priority"><option value="high" selected>High</option></select>
        <button type="submit" name="intent" value="apply" formaction="/admin/actions/filter" formmethod="post">Apply</button>
      </form>
      <div data-navigation-busy-status hidden><span data-navigation-busy-label-target></span></div>
    </section>
  `);
  const root = dom.window.document.querySelector('section');
  const form = dom.window.document.querySelector('form');
  const button = dom.window.document.querySelector('button');
  const select = dom.window.document.querySelector('select');
  const controller = initBehaviors(dom.window.document, { window: dom.window });

  const event = dispatchSubmit(dom.window, form, button);

  assert.equal(event.defaultPrevented, false);
  assert.equal(root.dataset.navigationBusyActive, 'true');
  assert.equal(form.getAttribute('action'), '/admin/actions/filter');
  assert.equal(form.getAttribute('method'), 'post');
  assert.deepEqual(new dom.window.FormData(form).getAll('intent'), ['apply']);
  assert.deepEqual(new dom.window.FormData(form).getAll('priority'), ['high']);
  assert.equal(select.disabled, false);
  assert.equal(button.disabled, true);

  controller.destroy();

  assert.equal(root.dataset.navigationBusyActive, undefined);
  assert.equal(form.getAttribute('action'), '/admin/actions');
  assert.equal(form.getAttribute('method'), 'get');
  assert.equal(form.querySelector('[data-busy-generated="true"]'), null);
  assert.equal(button.disabled, false);
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

test('busy helper restores full button markup when no label target is present', () => {
  const dom = setupDom(`
    <button type="button" data-busy-label="Saving">
      <svg data-icon></svg><span>Save</span>
    </button>
  `);
  const button = dom.window.document.querySelector('button');
  const originalHTML = button.innerHTML;

  const busy = setBusy(button);
  assert.equal(button.textContent, 'Saving');

  busy.reset();

  assert.equal(button.innerHTML, originalHTML);
  assert.equal(button.disabled, false);
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
