import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    readyState: 'complete',
    addEventListener: () => {},
    querySelectorAll: () => [],
  };
}

const {
  EntryNavigationAPIClient,
  EntryNavigationOverrideUI,
  parseEntryNavigationConfig,
  parseEntryNavigationState,
  parseNavigationOverrides,
} = await import('../dist/entry-navigation/index.js');

function rootFromHTML(html) {
  const dom = new JSDOM(html);
  globalThis.document = dom.window.document;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.HTMLSelectElement = dom.window.HTMLSelectElement;
  return dom.window.document.querySelector('[data-entry-navigation-root]');
}

test('entry-navigation parses server-authored data attributes', () => {
  const root = rootFromHTML(`
    <div
      data-entry-navigation-root
      data-navigation-enabled="true"
      data-navigation-editable="false"
      data-navigation-read-only="true"
      data-navigation-endpoint="/admin/api/content/pages/page-1/navigation"
      data-navigation-eligible-locations='["site.main","site.footer"]'
      data-navigation-default-locations='["site.main"]'
      data-navigation-allow-instance-override="true"
      data-navigation-overrides='{"site.footer":"show"}'
      data-navigation-effective-visibility='{"site.main":true,"site.footer":true}'
    ></div>
  `);

  const config = parseEntryNavigationConfig(root);
  const state = parseEntryNavigationState(root);

  assert.equal(config.enabled, true);
  assert.equal(config.editable, false);
  assert.equal(config.read_only, true);
  assert.equal(config.endpoint, '/admin/api/content/pages/page-1/navigation');
  assert.deepEqual(config.eligible_locations, ['site.main', 'site.footer']);
  assert.deepEqual(state.overrides, { 'site.footer': 'show' });
  assert.equal(state.effective_visibility['site.main'], true);
});

test('entry-navigation read-only render disables controls and save action', () => {
  const root = rootFromHTML(`<div data-entry-navigation-root></div>`);
  const client = new EntryNavigationAPIClient({ basePath: '/admin/api' });
  const ui = new EntryNavigationOverrideUI(
    root,
    client,
    'pages',
    'page-1',
    {
      enabled: true,
      editable: false,
      read_only: true,
      endpoint: '/admin/api/content/pages/page-1/navigation',
      eligible_locations: ['site.main'],
      default_locations: ['site.main'],
      allow_instance_override: true,
    },
    {
      overrides: { 'site.main': 'inherit' },
      effective_visibility: { 'site.main': true },
    }
  );

  ui.init();
  assert.match(root.innerHTML, /Navigation visibility is read-only/);
  assert.equal(root.querySelector('[data-navigation-location]').disabled, true);
  assert.equal(root.querySelector('[data-navigation-save]').disabled, true);
});

test('entry-navigation API client uses explicit endpoint and parses response', async () => {
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({
      data: {
        _navigation: { 'site.main': 'show' },
        effective_navigation_visibility: { 'site.main': true },
      },
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  try {
    const client = new EntryNavigationAPIClient({
      basePath: '/admin/api',
      endpoint: '/admin/api/content/pages/page-1/navigation',
    });
    const result = await client.patchEntryNavigation('ignored', 'ignored', { 'site.main': 'show' }, ['site.main']);
    assert.equal(calls[0].url, '/admin/api/content/pages/page-1/navigation');
    assert.equal(calls[0].options.method, 'PATCH');
    assert.deepEqual(result.overrides, { 'site.main': 'show' });
    assert.equal(result.effective_visibility['site.main'], true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('entry-navigation override parser drops invalid values and disallowed locations', () => {
  assert.deepEqual(
    parseNavigationOverrides({
      'site.main': 'show',
      'site.footer': 'invalid',
      'site.utility': 'hide',
    }, ['site.main']),
    { 'site.main': 'show' }
  );
});

test('menu-builder re-exports extracted entry-navigation component', async () => {
  const menuBuilder = await import('../dist/menu-builder/index.js');
  assert.equal(menuBuilder.EntryNavigationOverrideUI, EntryNavigationOverrideUI);
  assert.equal(typeof menuBuilder.initEntryNavigationOverrides, 'function');
});
