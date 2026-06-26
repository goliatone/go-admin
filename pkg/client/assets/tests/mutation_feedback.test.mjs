import test from 'node:test';
import assert from 'node:assert/strict';

const {
  MutationButtonManager,
  withMutationFeedback,
} = await import('../dist/services/index.js');

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
  globalThis.HTMLButtonElement = win.HTMLButtonElement;
  globalThis.HTMLInputElement = win.HTMLInputElement;
  globalThis.HTMLTextAreaElement = win.HTMLTextAreaElement;
  globalThis.HTMLSelectElement = win.HTMLSelectElement;
}

function setupDom(markup) {
  const dom = new JSDOM(markup, {
    url: 'http://localhost:8082/admin/services',
  });
  setGlobals(dom.window);
  return dom;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createNotifier() {
  return {
    successes: [],
    errors: [],
    success(message) {
      this.successes.push(message);
    },
    error(message) {
      this.errors.push(message);
    },
  };
}

test('MutationButtonManager uses shared busy state for loading and restores after success timer', async () => {
  setupDom('<button id="save" type="button">Save</button>');
  const button = document.getElementById('save');
  const manager = new MutationButtonManager({
    button,
    loadingText: 'Saving...',
    successText: 'Saved',
    feedbackDuration: 5,
  });

  manager.setLoading();

  assert.equal(manager.getState(), 'loading');
  assert.equal(button.disabled, true);
  assert.equal(button.dataset.busy, 'true');
  assert.equal(button.getAttribute('aria-busy'), 'true');
  assert.equal(button.classList.contains('mutation-loading'), true);
  assert.ok(button.querySelector('[data-busy-generated-spinner="true"]'));
  assert.match(button.textContent, /Saving/);

  manager.setSuccess();

  assert.equal(manager.getState(), 'success');
  assert.equal(button.disabled, false);
  assert.equal(button.dataset.busy, undefined);
  assert.equal(button.hasAttribute('aria-busy'), false);
  assert.equal(button.classList.contains('mutation-success'), true);
  assert.match(button.textContent, /Saved/);

  await delay(15);

  assert.equal(manager.getState(), 'idle');
  assert.equal(button.innerHTML, 'Save');
  assert.equal(button.className, '');
});

test('MutationButtonManager restores original markup and classes on error and destroy', () => {
  setupDom('<button id="save" type="button"><strong>Save</strong></button>');
  const button = document.getElementById('save');
  const manager = new MutationButtonManager({
    button,
    loadingText: 'Saving...',
    errorText: 'Failed',
    feedbackDuration: 100,
  });

  manager.setLoading();
  manager.setError();

  assert.equal(manager.getState(), 'error');
  assert.equal(button.classList.contains('mutation-error'), true);
  assert.match(button.textContent, /Failed/);

  manager.destroy();

  assert.equal(manager.getState(), 'idle');
  assert.equal(button.innerHTML, '<strong>Save</strong>');
  assert.equal(button.disabled, false);
  assert.equal(button.className, '');
});

test('withMutationFeedback drives shared loading state and success toast', async () => {
  setupDom('<button id="save" type="button">Save</button>');
  const button = document.getElementById('save');
  const notifier = createNotifier();
  let observedBusy = false;

  const result = await withMutationFeedback({
    mutation: async () => {
      observedBusy = button.dataset.busy === 'true' && button.disabled;
      return { id: 'saved' };
    },
    notifier,
    successMessage: (value) => `Saved ${value.id}`,
    buttonConfig: {
      button,
      loadingText: 'Saving...',
      successText: 'Saved',
      feedbackDuration: 5,
    },
  });

  assert.equal(result.success, true);
  assert.equal(observedBusy, true);
  assert.deepEqual(notifier.successes, ['Saved saved']);
});

test('withMutationFeedback restores button state after error feedback timer', async () => {
  setupDom('<button id="save" type="button">Save</button>');
  const button = document.getElementById('save');
  const notifier = createNotifier();

  const result = await withMutationFeedback({
    mutation: async () => {
      throw new Error('network down');
    },
    notifier,
    errorMessagePrefix: 'Save failed',
    buttonConfig: {
      button,
      loadingText: 'Saving...',
      errorText: 'Failed',
      feedbackDuration: 5,
    },
  });

  assert.equal(result.success, false);
  assert.equal(button.classList.contains('mutation-error'), true);
  assert.deepEqual(notifier.errors, ['Save failed: network down']);

  await delay(15);

  assert.equal(button.innerHTML, 'Save');
  assert.equal(button.disabled, false);
  assert.equal(button.className, '');
});
