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

// =============================================================================
// E2E: Cross-Component Consistency Tests (TX-075)
// Verifies shared LocaleActionChip behavior across:
// - TX-039: FallbackBanner
// - TX-040: TranslationBlockerModal
// - TX-041: InlineLocaleChips
// =============================================================================

// Import additional components for cross-component testing
const {
  FallbackBanner,
  InlineLocaleChips,
  shouldShowFallbackBanner,
  shouldShowInlineLocaleChips,
  extractTranslationContext,
  extractTranslationReadiness,
} = await import('../dist/datatable/index.js');

// Standard config used across all component tests
const STANDARD_CONFIG = {
  locale: 'es',
  recordId: 'page_123',
  apiEndpoint: '/admin/api/pages',
  navigationBasePath: '/admin/content/pages',
  panelName: 'pages',
  environment: 'production',
};

// =============================================================================
// E2E: Locale Label Consistency
// =============================================================================

test('E2E: getLocaleLabel produces consistent labels across all components', () => {
  const testLocales = ['en', 'es', 'fr', 'de', 'ja', 'zh', 'unknown'];

  for (const locale of testLocales) {
    const label1 = getLocaleLabel(locale);
    const label2 = getLocaleLabel(locale.toUpperCase());
    const label3 = getLocaleLabel(locale.toLowerCase());

    // Labels should be consistent regardless of case
    assert.equal(label1, label2);
    assert.equal(label1, label3);
  }
});

test('E2E: Locale labels in FallbackBanner match LocaleActionChip labels', () => {
  const context = {
    requestedLocale: 'es',
    resolvedLocale: 'en',
    fallbackUsed: true,
    missingRequestedLocale: true,
    recordId: 'page_123',
    locale: 'en',
    environment: 'production',
    availableLocales: ['en'],
    status: 'draft'
  };

  const banner = new FallbackBanner({
    context,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  });

  const bannerHtml = banner.render();
  const chipLabel = getLocaleLabel('es');

  // Banner should reference Spanish (the requested locale) with same label
  assert.match(bannerHtml, new RegExp(chipLabel, 'i'));
});

// =============================================================================
// E2E: URL Building Consistency
// =============================================================================

test('E2E: buildLocaleEditUrl produces consistent URLs across contexts', () => {
  const url1 = buildLocaleEditUrl(
    STANDARD_CONFIG.navigationBasePath,
    STANDARD_CONFIG.recordId,
    STANDARD_CONFIG.locale,
    STANDARD_CONFIG.environment
  );

  const url2 = buildLocaleEditUrl(
    '/admin/content/pages',
    'page_123',
    'es',
    'production'
  );

  assert.equal(url1, url2);
});

test('E2E: URL parameters are consistent (locale and env)', () => {
  const url = buildLocaleEditUrl('/admin/content/pages', 'page_123', 'fr', 'staging');

  // URL should contain both locale and env params
  assert.match(url, /locale=fr/);
  assert.match(url, /env=staging/);

  // Should be properly formatted
  assert.match(url, /\?locale=fr&env=staging$/);
});

// =============================================================================
// E2E: Styling Consistency
// =============================================================================

test('E2E: Missing locale styling is consistent (amber theme)', () => {
  const chip = new LocaleActionChip({
    ...STANDARD_CONFIG,
    localeExists: false,
  });

  const chipHtml = chip.render();

  // All components should use amber for missing locales
  assert.match(chipHtml, /bg-amber/);
  assert.match(chipHtml, /text-amber/);
  assert.match(chipHtml, /border-amber/);
});

test('E2E: Existing locale styling is consistent (blue theme)', () => {
  const chip = new LocaleActionChip({
    ...STANDARD_CONFIG,
    localeExists: true,
  });

  const chipHtml = chip.render();

  // All components should use blue for existing locales
  assert.match(chipHtml, /bg-blue/);
  assert.match(chipHtml, /text-blue/);
  assert.match(chipHtml, /border-blue/);
});

// =============================================================================
// E2E: Action Button Consistency
// =============================================================================

test('E2E: Create button appears only for missing locales', () => {
  const missingChip = new LocaleActionChip({
    ...STANDARD_CONFIG,
    localeExists: false,
  });

  const existingChip = new LocaleActionChip({
    ...STANDARD_CONFIG,
    localeExists: true,
  });

  const missingHtml = missingChip.render();
  const existingHtml = existingChip.render();

  assert.match(missingHtml, /data-action="create"/);
  assert.ok(!existingHtml.includes('data-action="create"'));
});

test('E2E: Open button appears for both existing and created locales', () => {
  const existingChip = new LocaleActionChip({
    ...STANDARD_CONFIG,
    localeExists: true,
  });

  const existingHtml = existingChip.render();

  assert.match(existingHtml, /data-action="open"/);
});

// =============================================================================
// E2E: Accessibility Consistency
// =============================================================================

test('E2E: ARIA labels are consistent across all chips', () => {
  const chip = new LocaleActionChip({
    ...STANDARD_CONFIG,
    localeExists: false,
  });

  const html = chip.render();

  // Should have aria-label for the group
  assert.match(html, /aria-label="Spanish translation"/);
  // Should have role for grouping
  assert.match(html, /role="group"/);
  // Should have sr-only label
  assert.match(html, /sr-only/);
});

test('E2E: Action buttons have descriptive aria-labels', () => {
  const chip = new LocaleActionChip({
    ...STANDARD_CONFIG,
    localeExists: false,
  });

  const html = chip.render();

  // Create button should have descriptive label
  assert.match(html, /aria-label="Create Spanish translation"/);
  // Title attribute should match
  assert.match(html, /title="Create Spanish translation"/);
});

// =============================================================================
// E2E: Data Attributes Consistency
// =============================================================================

test('E2E: Data attributes are consistent across contexts', () => {
  const chip = new LocaleActionChip({
    ...STANDARD_CONFIG,
    localeExists: false,
  });

  const html = chip.render();

  // Core data attributes should always be present
  assert.match(html, /data-locale-action="es"/);
  assert.match(html, /data-locale-exists="false"/);
  assert.match(html, /data-loading="false"/);
  assert.match(html, /data-created="false"/);
});

test('E2E: Locale code data attribute matches config', () => {
  const testLocales = ['en', 'es', 'fr', 'de', 'ja'];

  for (const locale of testLocales) {
    const chip = new LocaleActionChip({
      ...STANDARD_CONFIG,
      locale,
    });

    const html = chip.render();
    assert.match(html, new RegExp(`data-locale-action="${locale}"`));
  }
});

// =============================================================================
// E2E: InlineLocaleChips uses LocaleActionChip correctly
// =============================================================================

test('E2E: InlineLocaleChips renders missing locales with LocaleActionChip', () => {
  const record = {
    id: 'page_123',
    translation_readiness: {
      readiness_state: 'missing_locales',
      missing_required_locales: ['es', 'fr'],
      required_locales: ['en', 'es', 'fr'],
      available_locales: ['en'],
    },
  };

  const inlineChips = new InlineLocaleChips(record, {
    recordId: 'page_123',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
    panelName: 'pages',
  });

  const html = inlineChips.render();

  // Should render both missing locales with LocaleActionChip data attributes
  assert.match(html, /data-locale-action="es"/);
  assert.match(html, /data-locale-action="fr"/);
  assert.match(html, /data-inline-locale-chips="true"/);
});

test('E2E: InlineLocaleChips styling matches LocaleActionChip', () => {
  const record = {
    id: 'page_123',
    translation_readiness: {
      readiness_state: 'missing_locales',
      missing_required_locales: ['de'],
      required_locales: ['en', 'de'],
      available_locales: ['en'],
    },
  };

  const inlineChips = new InlineLocaleChips(record, {
    recordId: 'page_123',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  });

  const html = inlineChips.render();

  // Should use same amber styling for missing locales
  assert.match(html, /bg-amber/);
  assert.match(html, /text-amber/);
});

// =============================================================================
// E2E: FallbackBanner integration
// =============================================================================

test('E2E: FallbackBanner shows correct locale info', () => {
  const context = {
    requestedLocale: 'fr',
    resolvedLocale: 'en',
    fallbackUsed: true,
    missingRequestedLocale: true,
    recordId: 'page_123',
    locale: 'en',
    environment: 'production',
    availableLocales: ['en'],
    status: 'draft'
  };

  const banner = new FallbackBanner({
    context,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  });

  const html = banner.render();

  // Should show both requested and resolved locale info
  assert.match(html, /French|FR/i);
  assert.match(html, /English|EN/i);
  assert.match(html, /fallback/i);
});

test('E2E: FallbackBanner create button uses correct locale', () => {
  const context = {
    requestedLocale: 'es',
    resolvedLocale: 'en',
    fallbackUsed: true,
    missingRequestedLocale: true,
    recordId: 'page_456',
    locale: 'en',
    environment: 'staging',
    availableLocales: ['en'],
    status: 'draft'
  };

  const banner = new FallbackBanner({
    context,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
    environment: 'staging',
  });

  const html = banner.render();

  // Should have create button for requested locale
  assert.match(html, /Create ES translation|data-action="create-translation"/i);
  assert.match(html, /data-locale="es"/);
});

// =============================================================================
// E2E: Context Extraction Consistency
// =============================================================================

test('E2E: extractTranslationContext returns consistent structure', () => {
  const record = {
    id: 'page_123',
    locale: 'en',
    requested_locale: 'es',
    resolved_locale: 'en',
    fallback_used: true,
    missing_requested_locale: true,
  };

  const context = extractTranslationContext(record);

  assert.equal(context.requestedLocale, 'es');
  assert.equal(context.resolvedLocale, 'en');
  assert.equal(context.fallbackUsed, true);
  assert.equal(context.missingRequestedLocale, true);
  assert.equal(context.recordId, 'page_123');
});

test('E2E: extractTranslationReadiness returns consistent structure', () => {
  const record = {
    id: 'page_123',
    translation_readiness: {
      readiness_state: 'missing_locales',
      missing_required_locales: ['es', 'fr'],
      required_locales: ['en', 'es', 'fr'],
      available_locales: ['en'],
    },
  };

  const readiness = extractTranslationReadiness(record);

  assert.equal(readiness.hasReadinessMetadata, true);
  assert.deepEqual(readiness.missingRequiredLocales, ['es', 'fr']);
  assert.deepEqual(readiness.requiredLocales, ['en', 'es', 'fr']);
  assert.deepEqual(readiness.availableLocales, ['en']);
});

// =============================================================================
// E2E: Detection Functions Consistency
// =============================================================================

test('E2E: shouldShowFallbackBanner and shouldShowInlineLocaleChips are independent', () => {
  // Record with fallback but no missing required locales
  const fallbackOnlyRecord = {
    id: 'page_123',
    fallback_used: true,
    missing_requested_locale: true,
  };

  // Record with missing required locales but no fallback
  const readinessOnlyRecord = {
    id: 'page_456',
    translation_readiness: {
      readiness_state: 'missing_locales',
      missing_required_locales: ['es'],
      required_locales: ['en', 'es'],
      available_locales: ['en'],
    },
  };

  assert.equal(shouldShowFallbackBanner(fallbackOnlyRecord), true);
  assert.equal(shouldShowInlineLocaleChips(fallbackOnlyRecord), false);

  assert.equal(shouldShowFallbackBanner(readinessOnlyRecord), false);
  assert.equal(shouldShowInlineLocaleChips(readinessOnlyRecord), true);
});

// =============================================================================
// E2E: Multiple Locales Consistency
// =============================================================================

test('E2E: Multiple locales render consistently in lists', () => {
  const locales = ['es', 'fr', 'de', 'ja'];
  const html = renderLocaleActionList(locales, {
    recordId: 'page_123',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  });

  // Each locale should have consistent structure
  for (const locale of locales) {
    assert.match(html, new RegExp(`data-locale-action="${locale}"`));
  }

  // Should have container attributes
  assert.match(html, /role="list"/);
  assert.match(html, /aria-label="Missing translations"/);
});

test('E2E: Locale order is preserved in renders', () => {
  const locales = ['fr', 'es', 'de'];
  const html = renderLocaleActionList(locales, {
    recordId: 'page_123',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  });

  // Check order is preserved by position
  const frIndex = html.indexOf('data-locale-action="fr"');
  const esIndex = html.indexOf('data-locale-action="es"');
  const deIndex = html.indexOf('data-locale-action="de"');

  assert.ok(frIndex < esIndex);
  assert.ok(esIndex < deIndex);
});
