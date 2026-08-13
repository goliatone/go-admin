import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Event = dom.window.Event;

const {
  createFilterBuilderModuleLoader,
  mountFilterBuilderOnInteraction,
} = await import('../dist/datatable/filter-builder-loader.js');

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function fixture() {
  document.body.innerHTML = `
    <button id="filter-toggle-btn" type="button">Filters</button>
    <div id="filter-panel" class="hidden"></div>
  `;
  return document.getElementById('filter-toggle-btn');
}

test('filter module loader is single-flight, cached, and retryable', async () => {
  const firstImport = deferred();
  const expected = { FilterBuilder: class {} };
  let calls = 0;
  const loader = createFilterBuilderModuleLoader(() => {
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

test('first filter interaction constructs and opens exactly one builder', async () => {
  const toggle = fixture();
  const imported = deferred();
  let constructed = 0;
  let opened = 0;
  class FakeFilterBuilder {
    constructor() { constructed += 1; }
    open() { opened += 1; }
    destroy() {}
  }
  const mount = mountFilterBuilderOnInteraction(
    { fields: [{ name: 'status', label: 'Status' }] },
    { loader: createFilterBuilderModuleLoader(() => imported.promise) },
  );

  toggle.click();
  toggle.click();
  assert.equal(toggle.getAttribute('aria-busy'), 'true');
  assert.equal(toggle.dataset.filterBuilderLoadState, 'loading');
  imported.resolve({ FilterBuilder: FakeFilterBuilder });
  await imported.promise;
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(constructed, 1);
  assert.equal(opened, 1);
  assert.equal(mount.getInstance() instanceof FakeFilterBuilder, true);
  assert.equal(toggle.hasAttribute('aria-busy'), false);
  assert.equal(toggle.hasAttribute('data-filter-builder-load-state'), false);
  mount.destroy();
});

test('failed filter interaction exposes retry state and succeeds later', async () => {
  const toggle = fixture();
  const errors = [];
  let attempts = 0;
  let opened = 0;
  class FakeFilterBuilder {
    open() { opened += 1; }
    destroy() {}
  }
  const loader = createFilterBuilderModuleLoader(async () => {
    attempts += 1;
    if (attempts === 1) throw new Error('chunk unavailable');
    return { FilterBuilder: FakeFilterBuilder };
  });
  const mount = mountFilterBuilderOnInteraction(
    {
      fields: [{ name: 'status', label: 'Status' }],
      notifier: { error: (message) => errors.push(message) },
    },
    { loader },
  );

  toggle.click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(toggle.dataset.filterBuilderLoadState, 'error');
  assert.deepEqual(errors, ['Unable to load filters. Try again.']);

  toggle.click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(attempts, 2);
  assert.equal(opened, 1);
  assert.equal(mount.getInstance() instanceof FakeFilterBuilder, true);
  mount.destroy();
});

test('destroying a pending filter mount prevents late construction', async () => {
  const toggle = fixture();
  const imported = deferred();
  let constructed = 0;
  class FakeFilterBuilder {
    constructor() { constructed += 1; }
    open() {}
    destroy() {}
  }
  const mount = mountFilterBuilderOnInteraction(
    { fields: [{ name: 'status', label: 'Status' }] },
    { loader: createFilterBuilderModuleLoader(() => imported.promise) },
  );

  toggle.click();
  mount.destroy();
  imported.resolve({ FilterBuilder: FakeFilterBuilder });
  await imported.promise;
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(constructed, 0);
  assert.equal(mount.getInstance(), null);
  assert.equal(toggle.hasAttribute('aria-busy'), false);
});

