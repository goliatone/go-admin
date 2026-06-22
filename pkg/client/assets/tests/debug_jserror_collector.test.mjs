import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();

async function collectorScript() {
  const templateURL = new URL('../../templates/partials/jserror-collector.html', import.meta.url);
  const template = await readFile(templateURL, 'utf8');
  const match = template.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, 'collector template should contain a script block');
  return match[1]
    .replaceAll('{{ debug_jserror_endpoint }}', '/admin/debug/api/jserror')
    .replaceAll('{{ debug_jserror_nonce }}', 'test-nonce');
}

async function readBeaconBody(body) {
  if (body && typeof body.text === 'function') {
    return body.text();
  }
  return String(body);
}

async function createCollectorHarness(makeFetch) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost:9090/admin/content/teaching-topics-menu/edit',
    runScripts: 'outside-only',
  });
  const { window } = dom;
  const beacons = [];

  window.setTimeout = () => 0;
  Object.defineProperty(window.navigator, 'sendBeacon', {
    configurable: true,
    value: (url, body) => {
      beacons.push({ url, body });
      return true;
    },
  });

  window.fetch = makeFetch(window);
  window.eval(await collectorScript());

  return { window, beacons };
}

test('JS error collector suppresses expected formgen superseded fetch aborts', async () => {
  const { window, beacons } = await createCollectorHarness(() => (_input, init = {}) => new Promise((_resolve, reject) => {
    const signal = init.signal;
    signal?.addEventListener('abort', () => {
      reject(signal.reason);
    }, { once: true });
  }));

  const controller = new window.AbortController();
  const request = window.fetch('/admin/api/options/archive-event-session?format=options', {
    signal: controller.signal,
  });
  controller.abort(new window.DOMException('formgen:resolver-superseded', 'AbortError'));

  await assert.rejects(request);
  window.dispatchEvent(new window.Event('pagehide'));

  assert.equal(beacons.length, 0, 'expected resolver cancellations should not enter JS Errors');
});

test('JS error collector reports generic fetch aborts without marking them intentional', async () => {
  const { window, beacons } = await createCollectorHarness(() => (_input, init = {}) => new Promise((_resolve, reject) => {
    const signal = init.signal;
    signal?.addEventListener('abort', () => {
      reject(signal.reason);
    }, { once: true });
  }));

  const controller = new window.AbortController();
  const request = window.fetch('/admin/api/options/archive-event-session?format=options', {
    signal: controller.signal,
  });
  controller.abort(new window.DOMException('user-cancelled', 'AbortError'));

  await assert.rejects(request);
  window.dispatchEvent(new window.Event('pagehide'));

  assert.equal(beacons.length, 1);
  assert.equal(beacons[0].url, '/admin/debug/api/jserror');
  const payload = JSON.parse(await readBeaconBody(beacons[0].body));

  assert.equal(payload.type, 'network_abort');
  assert.equal(payload.message, 'GET /admin/api/options/archive-event-session?format=options aborted: user-cancelled');
  assert.equal(payload.extra.method, 'GET');
  assert.equal(payload.extra.status, 0);
  assert.equal(payload.extra.status_text, 'Aborted');
  assert.equal(payload.extra.request_url, '/admin/api/options/archive-event-session?format=options');
  assert.equal(payload.extra.aborted, true);
  assert.equal(payload.extra.abort_reason, 'user-cancelled');
  assert.equal(payload.extra.intentional, false);
  assert.equal(payload.nonce, 'test-nonce');
  assert.equal(payload.url, 'http://localhost:9090/admin/content/teaching-topics-menu/edit');
});

test('JS error collector keeps ordinary fetch rejections as network errors', async () => {
  const { window, beacons } = await createCollectorHarness(() => () => {
    return Promise.reject(new TypeError('Failed to fetch'));
  });

  await assert.rejects(window.fetch('/admin/api/options/archive-event-session?format=options'));
  window.dispatchEvent(new window.Event('pagehide'));

  assert.equal(beacons.length, 1);
  const payload = JSON.parse(await readBeaconBody(beacons[0].body));

  assert.equal(payload.type, 'network_error');
  assert.equal(payload.message, 'GET /admin/api/options/archive-event-session?format=options failed: Failed to fetch');
  assert.equal(payload.extra.method, 'GET');
  assert.equal(payload.extra.status, 0);
  assert.equal(payload.extra.status_text, 'Network Error');
  assert.equal(payload.extra.request_url, '/admin/api/options/archive-event-session?format=options');
});
