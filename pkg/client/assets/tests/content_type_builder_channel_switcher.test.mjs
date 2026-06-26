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

const { initContentTypeChannelSwitcher, normalizeChannelName } = await import(
  '../dist/content-type-builder/shared/channel-switcher.js'
);

function setGlobals(win) {
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.Node = win.Node;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.HTMLInputElement = win.HTMLInputElement;
  globalThis.HTMLSelectElement = win.HTMLSelectElement;
  globalThis.HTMLButtonElement = win.HTMLButtonElement;
  globalThis.Event = win.Event;
  globalThis.MouseEvent = win.MouseEvent;
  globalThis.KeyboardEvent = win.KeyboardEvent;
  globalThis.requestAnimationFrame = win.requestAnimationFrame
    ? win.requestAnimationFrame.bind(win)
    : (cb) => setTimeout(cb, 0);
}

function channelMarkup() {
  return `
    <div data-content-types-channel-wrapper data-default-channel="default" data-active-channel="default">
      <select data-content-types-channel><option value="default">Default</option></select>
      <button data-content-types-channel-reset class="hidden" type="button">Reset</button>
      <button data-content-types-channel-add type="button">Add Channel</button>
    </div>`;
}

function setup(html = channelMarkup()) {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, { url: 'http://localhost' });
  setGlobals(dom.window);
  return dom;
}

function click(el) {
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
}

test('normalizeChannelName lowercases, collapses invalid chars, trims dashes', () => {
  assert.equal(normalizeChannelName('Staging'), 'staging');
  assert.equal(normalizeChannelName('  My Channel!! '), 'my-channel');
  assert.equal(normalizeChannelName('a/b\\c'), 'a-b-c');
  assert.equal(normalizeChannelName('--edge--'), 'edge');
  assert.equal(normalizeChannelName('***'), '');
  assert.equal(normalizeChannelName('keep_under-score'), 'keep_under-score');
});

test('Add Channel opens the styled modal and never calls window.prompt', async () => {
  setup();
  let promptCalls = 0;
  window.prompt = () => {
    promptCalls += 1;
    return 'x';
  };
  globalThis.prompt = window.prompt;

  initContentTypeChannelSwitcher(document);
  const addBtn = document.querySelector('[data-content-types-channel-add]');
  click(addBtn);
  await new Promise((r) => setTimeout(r, 0));

  assert.equal(promptCalls, 0, 'window.prompt must not be used');
  assert.ok(document.querySelector('[data-prompt-input]'), 'styled TextPromptModal opened');
  // The modal title reflects the channel workflow.
  assert.match(document.body.textContent, /Add Channel/);
});

test('channel switcher init is idempotent', () => {
  setup();
  const wrapper = document.querySelector('[data-content-types-channel-wrapper]');
  initContentTypeChannelSwitcher(document);
  assert.equal(wrapper.dataset.channelInit, 'true');
  // Second call should be a no-op (no throw, flag stays set).
  initContentTypeChannelSwitcher(document);
  assert.equal(wrapper.dataset.channelInit, 'true');
});
