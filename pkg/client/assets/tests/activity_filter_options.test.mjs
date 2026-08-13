import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM(`<!doctype html><html><body>
  <form id="activity-filters">
    <input id="filter-q" name="q">
    <select id="filter-verb" name="verb" multiple><option value="">All verbs</option></select>
    <select id="filter-channels" name="channels" multiple><option value="">All channels</option></select>
    <select id="filter-object-type" name="object_type"><option value="">All object types</option></select>
    <input id="filter-object-id" name="object_id">
    <input id="filter-since" name="since">
    <input id="filter-until" name="until">
    <select id="filter-limit"><option value="50">50</option></select>
  </form>
  <button id="activity-refresh"></button><button id="activity-clear"></button>
  <button id="activity-prev"></button><button id="activity-next"></button>
  <tbody id="activity-table-body"></tbody><div id="activity-empty"></div>
  <div id="activity-disabled"></div><div id="activity-error"></div><div id="activity-count"></div>
</body></html>`, {
  url: 'https://admin.example/control/activity?verb=created%2Cupdated&verb=stale&channels=audit&object_type=user&q=needle&user_id=user-1&view=timeline',
});

globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.HTMLSelectElement = dom.window.HTMLSelectElement;
globalThis.HTMLInputElement = dom.window.HTMLInputElement;
globalThis.Option = dom.window.Option;

const activity = await import('../dist/activity/index.js');

function manager() {
  return new activity.ActivityManager({
    apiPath: '/control/api/activity',
    filterOptionsPath: '/control/api/activity/filter-options',
    basePath: '/control',
  });
}

function resetControls() {
  for (const [id, label] of [
    ['filter-verb', 'All verbs'],
    ['filter-channels', 'All channels'],
    ['filter-object-type', 'All object types'],
  ]) {
    const select = document.getElementById(id);
    select.replaceChildren(new Option(label, ''));
  }
  for (const id of ['filter-q', 'filter-object-id', 'filter-since', 'filter-until']) {
    document.getElementById(id).value = '';
  }
}

test('Activity restores repeated and legacy CSV filter selections and serializes repeated values', () => {
  resetControls();
  const instance = manager();
  instance.cacheElements();
  instance.syncFromQuery();

  assert.deepEqual(instance.getInputValues('verb'), ['created', 'updated', 'stale']);
  assert.deepEqual(instance.getInputValues('channels'), ['audit']);
  assert.equal(instance.getInputValue('object_type'), 'user');

  const params = instance.buildParams();
  assert.deepEqual(params.getAll('verb'), ['created', 'updated', 'stale']);
  assert.deepEqual(params.getAll('channels'), ['audit']);
  assert.equal(params.get('object_type'), 'user');
  assert.equal(params.get('q'), 'needle');
  assert.equal(params.get('user_id'), 'user-1');
});

test('Activity requests only selections and preserves stale selected values', async () => {
  resetControls();
  const instance = manager();
  instance.cacheElements();
  instance.syncFromQuery();
  let requested = '';
  globalThis.fetch = async (url) => {
    requested = String(url);
    return {
      ok: true,
      json: async () => ({
        verbs: [{ value: 'created', label: 'Created' }, { value: 'deleted', label: 'Deleted' }],
        channels: [{ value: 'audit', label: 'Audit' }],
        object_types: [{ value: 'user', label: 'User' }],
        revision: 'rev-2',
      }),
    };
  };

  await instance.loadFilterOptions();
  const url = new URL(requested, 'https://admin.example');
  assert.deepEqual(url.searchParams.getAll('verb'), ['created', 'updated', 'stale']);
  assert.deepEqual(url.searchParams.getAll('channels'), ['audit']);
  assert.equal(url.searchParams.get('object_type'), 'user');
  for (const forbidden of ['q', 'user_id', 'actor_id', 'limit', 'offset', 'view']) {
    assert.equal(url.searchParams.has(forbidden), false, `${forbidden} leaked into options request`);
  }
  assert.deepEqual(instance.getInputValues('verb'), ['created', 'updated', 'stale']);
  assert.equal(document.querySelector('#filter-verb option[value="created"]').textContent, 'Created');
  assert.equal(document.querySelector('#filter-verb option[value="stale"]').textContent, 'stale');
});

test('Activity keeps the last usable options when refresh fails', async () => {
  const instance = manager();
  instance.cacheElements();
  const before = Array.from(document.getElementById('filter-verb').options).map((option) => [option.value, option.textContent]);
  globalThis.fetch = async () => ({ ok: false, status: 503, json: async () => ({}) });
  await instance.loadFilterOptions();
  const after = Array.from(document.getElementById('filter-verb').options).map((option) => [option.value, option.textContent]);
  assert.deepEqual(after, before);
  assert.deepEqual(instance.getInputValues('verb'), ['created', 'updated', 'stale']);
});

test('Activity keeps the last usable options when the response is malformed', async () => {
  const instance = manager();
  instance.cacheElements();
  const before = Array.from(document.getElementById('filter-verb').options).map((option) => [option.value, option.textContent]);
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ verbs: null }) });
  await instance.loadFilterOptions();
  const after = Array.from(document.getElementById('filter-verb').options).map((option) => [option.value, option.textContent]);
  assert.deepEqual(after, before);
  assert.deepEqual(instance.getInputValues('verb'), ['created', 'updated', 'stale']);
});

test('Activity ignores an older overlapping options response', async () => {
  resetControls();
  const instance = manager();
  instance.cacheElements();
  const pending = [];
  globalThis.fetch = (_url, init) => new Promise((resolve) => pending.push({ resolve, signal: init.signal }));

  const older = instance.loadFilterOptions();
  const newer = instance.loadFilterOptions();
  assert.equal(pending[0].signal.aborted, true);

  pending[1].resolve({
    ok: true,
    json: async () => ({ verbs: [{ value: 'new', label: 'New' }], channels: [], object_types: [] }),
  });
  await newer;
  pending[0].resolve({
    ok: true,
    json: async () => ({ verbs: [{ value: 'old', label: 'Old' }], channels: [], object_types: [] }),
  });
  await older;

  const values = Array.from(document.getElementById('filter-verb').options).map((option) => option.value);
  assert.equal(values.includes('new'), true);
  assert.equal(values.includes('old'), false);
});
