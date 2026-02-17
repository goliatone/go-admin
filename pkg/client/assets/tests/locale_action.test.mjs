import test from 'node:test';
import assert from 'node:assert/strict';

// Import locale action exports from datatable index
const {
  LocaleActionChip,
  getLocaleLabel,
  renderLocaleActionChip,
  renderLocaleActionList,
  buildLocaleEditUrl,
} = await import('../dist/datatable/index.js');

// =============================================================================
// getLocaleLabel Tests
// =============================================================================

test('getLocaleLabel returns human-readable label for known locales', () => {
  assert.equal(getLocaleLabel('en'), 'English');
  assert.equal(getLocaleLabel('es'), 'Spanish');
  assert.equal(getLocaleLabel('fr'), 'French');
  assert.equal(getLocaleLabel('de'), 'German');
  assert.equal(getLocaleLabel('ja'), 'Japanese');
});

test('getLocaleLabel handles uppercase locale codes', () => {
  assert.equal(getLocaleLabel('EN'), 'English');
  assert.equal(getLocaleLabel('ES'), 'Spanish');
});

test('getLocaleLabel returns uppercase code for unknown locales', () => {
  assert.equal(getLocaleLabel('xx'), 'XX');
  assert.equal(getLocaleLabel('unknown'), 'UNKNOWN');
});

// =============================================================================
// buildLocaleEditUrl Tests
// =============================================================================

test('buildLocaleEditUrl builds correct URL with locale', () => {
  const url = buildLocaleEditUrl('/admin/content/pages', 'page_123', 'es');
  assert.equal(url, '/admin/content/pages/page_123/edit?locale=es');
});

test('buildLocaleEditUrl includes environment when provided', () => {
  const url = buildLocaleEditUrl('/admin/content/pages', 'page_123', 'fr', 'production');
  assert.equal(url, '/admin/content/pages/page_123/edit?locale=fr&env=production');
});

test('buildLocaleEditUrl handles missing environment', () => {
  const url = buildLocaleEditUrl('/admin/content/posts', 'post_456', 'de');
  assert.equal(url, '/admin/content/posts/post_456/edit?locale=de');
});

// =============================================================================
// LocaleActionChip Constructor Tests
// =============================================================================

test('LocaleActionChip accepts required config', () => {
  const config = {
    locale: 'es',
    recordId: 'page_123',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  };

  const chip = new LocaleActionChip(config);
  assert.ok(chip);
});

test('LocaleActionChip initializes with default state', () => {
  const config = {
    locale: 'fr',
    recordId: 'page_456',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  };

  const chip = new LocaleActionChip(config);
  const state = chip.getState();

  assert.equal(state.loading, false);
  assert.equal(state.created, false);
  assert.equal(state.error, null);
});

// =============================================================================
// LocaleActionChip Render Tests
// =============================================================================

test('LocaleActionChip renders locale code with uppercase CSS class', () => {
  const config = {
    locale: 'es',
    recordId: 'page_123',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  };

  const chip = new LocaleActionChip(config);
  const html = chip.render();

  // Locale code is rendered lowercase with CSS uppercase class for transformation
  assert.match(html, />es</);
  assert.match(html, /uppercase/);
  assert.match(html, /data-locale-action="es"/);
});

test('LocaleActionChip renders create button for missing locales', () => {
  const config = {
    locale: 'fr',
    recordId: 'page_123',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
    localeExists: false,
  };

  const chip = new LocaleActionChip(config);
  const html = chip.render();

  assert.match(html, /data-action="create"/);
  assert.match(html, /Create French translation/);
});

test('LocaleActionChip renders open button for existing locales', () => {
  const config = {
    locale: 'de',
    recordId: 'page_123',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
    localeExists: true,
  };

  const chip = new LocaleActionChip(config);
  const html = chip.render();

  assert.match(html, /data-action="open"/);
  assert.match(html, /Open German translation/);
  // Should not have create button for existing locale
  assert.ok(!html.includes('data-action="create"'));
});

test('LocaleActionChip does not render create button after creation', () => {
  const config = {
    locale: 'it',
    recordId: 'page_123',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
    localeExists: false,
  };

  const chip = new LocaleActionChip(config);

  // Simulate created state by checking render with localeExists true
  const configCreated = { ...config, localeExists: true };
  const chipCreated = new LocaleActionChip(configCreated);
  const html = chipCreated.render();

  // After creation, should have open but not create
  assert.match(html, /data-action="open"/);
  assert.ok(!html.includes('data-action="create"'));
});

test('LocaleActionChip uses sm size classes when configured', () => {
  const config = {
    locale: 'es',
    recordId: 'page_123',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
    size: 'sm',
  };

  const chip = new LocaleActionChip(config);
  const html = chip.render();

  assert.match(html, /text-xs/);
  assert.match(html, /px-2 py-1/);
});

test('LocaleActionChip uses md size classes when configured', () => {
  const config = {
    locale: 'es',
    recordId: 'page_123',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
    size: 'md',
  };

  const chip = new LocaleActionChip(config);
  const html = chip.render();

  assert.match(html, /text-sm/);
  assert.match(html, /px-3 py-1.5/);
});

test('LocaleActionChip renders chip mode by default', () => {
  const config = {
    locale: 'es',
    recordId: 'page_123',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  };

  const chip = new LocaleActionChip(config);
  const html = chip.render();

  assert.match(html, /rounded-full/);
});

test('LocaleActionChip renders button mode when configured', () => {
  const config = {
    locale: 'es',
    recordId: 'page_123',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
    mode: 'button',
  };

  const chip = new LocaleActionChip(config);
  const html = chip.render();

  assert.match(html, /rounded-lg/);
});

// =============================================================================
// LocaleActionChip Accessibility Tests
// =============================================================================

test('LocaleActionChip includes aria-label for locale', () => {
  const config = {
    locale: 'es',
    recordId: 'page_123',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  };

  const chip = new LocaleActionChip(config);
  const html = chip.render();

  assert.match(html, /aria-label="Spanish translation"/);
});

test('LocaleActionChip has role="group" for action grouping', () => {
  const config = {
    locale: 'fr',
    recordId: 'page_123',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  };

  const chip = new LocaleActionChip(config);
  const html = chip.render();

  assert.match(html, /role="group"/);
});

test('LocaleActionChip includes sr-only label for full locale name', () => {
  const config = {
    locale: 'de',
    recordId: 'page_123',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  };

  const chip = new LocaleActionChip(config);
  const html = chip.render();

  assert.match(html, /class="sr-only">German/);
});

// =============================================================================
// LocaleActionChip State Data Attributes Tests
// =============================================================================

test('LocaleActionChip includes data-locale-exists attribute', () => {
  const configMissing = {
    locale: 'es',
    recordId: 'page_123',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
    localeExists: false,
  };

  const chipMissing = new LocaleActionChip(configMissing);
  const htmlMissing = chipMissing.render();
  assert.match(htmlMissing, /data-locale-exists="false"/);

  const configExists = { ...configMissing, localeExists: true };
  const chipExists = new LocaleActionChip(configExists);
  const htmlExists = chipExists.render();
  assert.match(htmlExists, /data-locale-exists="true"/);
});

test('LocaleActionChip includes data-loading attribute', () => {
  const config = {
    locale: 'es',
    recordId: 'page_123',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  };

  const chip = new LocaleActionChip(config);
  const html = chip.render();

  assert.match(html, /data-loading="false"/);
});

test('LocaleActionChip includes data-created attribute', () => {
  const config = {
    locale: 'es',
    recordId: 'page_123',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  };

  const chip = new LocaleActionChip(config);
  const html = chip.render();

  assert.match(html, /data-created="false"/);
});

// =============================================================================
// renderLocaleActionChip Tests
// =============================================================================

test('renderLocaleActionChip returns HTML string', () => {
  const html = renderLocaleActionChip({
    locale: 'es',
    recordId: 'page_123',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  });

  assert.equal(typeof html, 'string');
  assert.match(html, /data-locale-action="es"/);
});

// =============================================================================
// renderLocaleActionList Tests
// =============================================================================

test('renderLocaleActionList renders multiple locale chips', () => {
  const html = renderLocaleActionList(['es', 'fr', 'de'], {
    recordId: 'page_123',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  });

  assert.match(html, /data-locale-action="es"/);
  assert.match(html, /data-locale-action="fr"/);
  assert.match(html, /data-locale-action="de"/);
});

test('renderLocaleActionList includes role="list" for accessibility', () => {
  const html = renderLocaleActionList(['es', 'fr'], {
    recordId: 'page_123',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  });

  assert.match(html, /role="list"/);
  assert.match(html, /aria-label="Missing translations"/);
});

test('renderLocaleActionList returns empty string for empty array', () => {
  const html = renderLocaleActionList([], {
    recordId: 'page_123',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  });

  assert.equal(html, '');
});

test('renderLocaleActionList uses flex-wrap for layout', () => {
  const html = renderLocaleActionList(['es', 'fr', 'de', 'it'], {
    recordId: 'page_123',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  });

  assert.match(html, /flex flex-wrap/);
});

// =============================================================================
// Styling State Tests
// =============================================================================

test('LocaleActionChip uses amber styling for missing locales', () => {
  const config = {
    locale: 'es',
    recordId: 'page_123',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
    localeExists: false,
  };

  const chip = new LocaleActionChip(config);
  const html = chip.render();

  assert.match(html, /bg-amber-100/);
  assert.match(html, /text-amber-700/);
});

test('LocaleActionChip uses blue styling for existing locales', () => {
  const config = {
    locale: 'es',
    recordId: 'page_123',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
    localeExists: true,
  };

  const chip = new LocaleActionChip(config);
  const html = chip.render();

  assert.match(html, /bg-blue-100/);
  assert.match(html, /text-blue-700/);
});

// =============================================================================
// Config with Optional Fields Tests
// =============================================================================

test('LocaleActionChip handles optional panelName', () => {
  const config = {
    locale: 'es',
    recordId: 'page_123',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
    panelName: 'pages',
  };

  const chip = new LocaleActionChip(config);
  assert.ok(chip);
});

test('LocaleActionChip handles optional environment', () => {
  const config = {
    locale: 'es',
    recordId: 'page_123',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
    environment: 'production',
  };

  const chip = new LocaleActionChip(config);
  assert.ok(chip);
});

test('LocaleActionChip accepts callback functions', () => {
  let createCalled = false;
  let errorCalled = false;
  let openCalled = false;

  const config = {
    locale: 'es',
    recordId: 'page_123',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
    onCreateSuccess: () => { createCalled = true; },
    onError: () => { errorCalled = true; },
    onOpen: () => { openCalled = true; },
  };

  const chip = new LocaleActionChip(config);
  assert.ok(chip);
  // Callbacks are stored but not called until actions are executed
  assert.equal(createCalled, false);
  assert.equal(errorCalled, false);
  assert.equal(openCalled, false);
});

// =============================================================================
// Multiple Content Types Tests
// =============================================================================

test('LocaleActionChip works with pages panel', () => {
  const config = {
    locale: 'es',
    recordId: 'page_123',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
    panelName: 'pages',
  };

  const chip = new LocaleActionChip(config);
  const html = chip.render();
  assert.match(html, /data-locale-action="es"/);
});

test('LocaleActionChip works with posts panel', () => {
  const config = {
    locale: 'fr',
    recordId: 'post_456',
    apiEndpoint: '/admin/api/posts',
    navigationBasePath: '/admin/content/posts',
    panelName: 'posts',
  };

  const chip = new LocaleActionChip(config);
  const html = chip.render();
  assert.match(html, /data-locale-action="fr"/);
});

test('LocaleActionChip works with news panel', () => {
  const config = {
    locale: 'de',
    recordId: 'news_789',
    apiEndpoint: '/admin/api/news',
    navigationBasePath: '/admin/content/news',
    panelName: 'news',
  };

  const chip = new LocaleActionChip(config);
  const html = chip.render();
  assert.match(html, /data-locale-action="de"/);
});
