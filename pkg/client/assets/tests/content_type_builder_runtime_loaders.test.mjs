import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Event = dom.window.Event;

const {
  bootstrapContentTypeBuilder,
  createContentTypeBuilderRuntimeLoader,
} = await import('../dist/content-type-builder/bootstrap.js');

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function unusedLoader() {
  return createContentTypeBuilderRuntimeLoader(async () => {
    throw new Error('unexpected runtime request');
  });
}

test('content-type-builder runtime loader is single-flight, cached, and retryable', async () => {
  const firstImport = deferred();
  const expected = { initContentTypeEditorRuntime() {} };
  let calls = 0;
  const loader = createContentTypeBuilderRuntimeLoader(() => {
    calls += 1;
    if (calls === 1) return firstImport.promise;
    return Promise.resolve(expected);
  });

  const first = loader.load();
  assert.equal(loader.load(), first);
  firstImport.reject(new Error('temporary failure'));
  await assert.rejects(first, /temporary failure/);
  assert.equal(await loader.load(), expected);
  assert.equal(await loader.load(), expected);
  assert.equal(calls, 2);
});

test('bootstrap loads only the runtime selected by page roots', async () => {
  document.body.innerHTML = '<div data-content-type-editor-root></div>';
  let editorCalls = 0;
  let blockCalls = 0;
  const root = document.querySelector('[data-content-type-editor-root]');
  const controller = bootstrapContentTypeBuilder(document, {
    contentEditorLoader: createContentTypeBuilderRuntimeLoader(async () => ({
      initContentTypeEditorRuntime(scope) {
        editorCalls += 1;
        assert.equal(scope, document);
      },
    })),
    blockLibraryLoader: createContentTypeBuilderRuntimeLoader(async () => {
      blockCalls += 1;
      return { initBlockLibraryRuntime() {} };
    }),
  });
  await controller.start();

  assert.equal(editorCalls, 1);
  assert.equal(blockCalls, 0);
  assert.equal(root.hasAttribute('aria-busy'), false);
  assert.equal(root.hasAttribute('data-content-builder-load-state'), false);
  controller.destroy();
});

test('duplicate bootstrap calls do not claim or initialize the same root twice', async () => {
  document.body.innerHTML = '<div data-block-library-ide></div>';
  let calls = 0;
  const loader = createContentTypeBuilderRuntimeLoader(async () => ({
    initBlockLibraryRuntime() { calls += 1; },
  }));
  const first = bootstrapContentTypeBuilder(document, {
    contentEditorLoader: unusedLoader(),
    blockLibraryLoader: loader,
  });
  const second = bootstrapContentTypeBuilder(document, {
    contentEditorLoader: unusedLoader(),
    blockLibraryLoader: loader,
  });
  await Promise.all([first.start(), second.start()]);

  assert.equal(calls, 1);
  first.destroy();
  second.destroy();
});

test('failed runtime load preserves content and offers an accessible retry', async () => {
  document.body.innerHTML = '<section><p id="preserved">Server content</p><div data-content-type-editor-root></div></section>';
  let attempts = 0;
  let initialized = 0;
  const loader = createContentTypeBuilderRuntimeLoader(async () => {
    attempts += 1;
    if (attempts === 1) throw new Error('chunk unavailable');
    return { initContentTypeEditorRuntime() { initialized += 1; } };
  });
  const root = document.querySelector('[data-content-type-editor-root]');
  const controller = bootstrapContentTypeBuilder(document, {
    contentEditorLoader: loader,
    blockLibraryLoader: unusedLoader(),
  });
  await assert.rejects(controller.start(), /chunk unavailable/);

  const status = document.querySelector('[data-content-builder-load-error]');
  assert.equal(root.dataset.contentBuilderLoadState, 'error');
  assert.equal(status?.getAttribute('role'), 'alert');
  assert.equal(document.getElementById('preserved')?.textContent, 'Server content');
  status.querySelector('[data-content-builder-retry]').click();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(attempts, 2);
  assert.equal(initialized, 1);
  assert.equal(document.querySelector('[data-content-builder-load-error]'), null);
  controller.destroy();
});

test('destroying a pending bootstrap prevents late runtime initialization', async () => {
  document.body.innerHTML = '<div data-block-library-ide aria-busy="false"></div>';
  const imported = deferred();
  let initialized = 0;
  const root = document.querySelector('[data-block-library-ide]');
  const controller = bootstrapContentTypeBuilder(document, {
    contentEditorLoader: unusedLoader(),
    blockLibraryLoader: createContentTypeBuilderRuntimeLoader(() => imported.promise),
  });

  assert.equal(root.getAttribute('aria-busy'), 'true');
  controller.destroy();
  imported.resolve({ initBlockLibraryRuntime() { initialized += 1; } });
  await imported.promise;
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(initialized, 0);
  assert.equal(root.getAttribute('aria-busy'), 'false');
  assert.equal(root.hasAttribute('data-content-builder-bootstrap'), false);
});

