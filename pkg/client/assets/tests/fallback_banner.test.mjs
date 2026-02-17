import test from 'node:test';
import assert from 'node:assert/strict';

// Import fallback banner exports from datatable index
const {
  FallbackBanner,
  shouldShowFallbackBanner,
  renderFallbackBannerFromRecord,
  extractTranslationContext,
} = await import('../dist/datatable/index.js');

// =============================================================================
// shouldShowFallbackBanner Tests
// =============================================================================

test('shouldShowFallbackBanner returns true when fallback_used is true', () => {
  const record = {
    id: 'page_123',
    fallback_used: true,
    requested_locale: 'es',
    resolved_locale: 'en',
  };

  assert.equal(shouldShowFallbackBanner(record), true);
});

test('shouldShowFallbackBanner returns true when missing_requested_locale is true', () => {
  const record = {
    id: 'page_123',
    missing_requested_locale: true,
    requested_locale: 'fr',
    resolved_locale: 'en',
  };

  assert.equal(shouldShowFallbackBanner(record), true);
});

test('shouldShowFallbackBanner returns false when not in fallback mode', () => {
  const record = {
    id: 'page_123',
    fallback_used: false,
    missing_requested_locale: false,
    requested_locale: 'en',
    resolved_locale: 'en',
  };

  assert.equal(shouldShowFallbackBanner(record), false);
});

test('shouldShowFallbackBanner returns false for records without fallback fields', () => {
  const record = {
    id: 'page_123',
    locale: 'en',
  };

  assert.equal(shouldShowFallbackBanner(record), false);
});

// =============================================================================
// FallbackBanner Constructor Tests
// =============================================================================

test('FallbackBanner accepts required config', () => {
  const context = extractTranslationContext({
    id: 'page_123',
    fallback_used: true,
    requested_locale: 'es',
    resolved_locale: 'en',
  });

  const banner = new FallbackBanner({
    context,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  });

  assert.ok(banner);
});

test('FallbackBanner.isInFallbackMode returns true when in fallback', () => {
  const context = extractTranslationContext({
    id: 'page_123',
    fallback_used: true,
    requested_locale: 'es',
    resolved_locale: 'en',
  });

  const banner = new FallbackBanner({
    context,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  });

  assert.equal(banner.isInFallbackMode(), true);
});

test('FallbackBanner.isInFallbackMode returns false when not in fallback', () => {
  const context = extractTranslationContext({
    id: 'page_123',
    fallback_used: false,
    requested_locale: 'en',
    resolved_locale: 'en',
  });

  const banner = new FallbackBanner({
    context,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  });

  assert.equal(banner.isInFallbackMode(), false);
});

// =============================================================================
// FallbackBanner.getFormLockState Tests
// =============================================================================

test('getFormLockState returns locked state when in fallback mode', () => {
  const context = extractTranslationContext({
    id: 'page_123',
    fallback_used: true,
    requested_locale: 'es',
    resolved_locale: 'en',
  });

  const banner = new FallbackBanner({
    context,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  });

  const lockState = banner.getFormLockState();

  assert.equal(lockState.locked, true);
  assert.equal(lockState.missingLocale, 'es');
  assert.equal(lockState.fallbackLocale, 'en');
  assert.ok(lockState.reason);
  assert.match(lockState.reason, /ES/);
});

test('getFormLockState returns unlocked state when not in fallback mode', () => {
  const context = extractTranslationContext({
    id: 'page_123',
    fallback_used: false,
    requested_locale: 'en',
    resolved_locale: 'en',
  });

  const banner = new FallbackBanner({
    context,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  });

  const lockState = banner.getFormLockState();

  assert.equal(lockState.locked, false);
  assert.equal(lockState.reason, null);
  assert.equal(lockState.missingLocale, null);
  assert.equal(lockState.fallbackLocale, null);
});

test('getFormLockState uses custom formLockMessage when provided', () => {
  const context = extractTranslationContext({
    id: 'page_123',
    fallback_used: true,
    requested_locale: 'fr',
    resolved_locale: 'en',
  });

  const customMessage = 'Custom lock message for testing';
  const banner = new FallbackBanner({
    context,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
    formLockMessage: customMessage,
  });

  const lockState = banner.getFormLockState();

  assert.equal(lockState.reason, customMessage);
});

// =============================================================================
// FallbackBanner.render Tests
// =============================================================================

test('FallbackBanner.render returns empty string when not in fallback mode', () => {
  const context = extractTranslationContext({
    id: 'page_123',
    fallback_used: false,
    requested_locale: 'en',
    resolved_locale: 'en',
  });

  const banner = new FallbackBanner({
    context,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  });

  const html = banner.render();
  assert.equal(html, '');
});

test('FallbackBanner.render includes banner markup when in fallback mode', () => {
  const context = extractTranslationContext({
    id: 'page_123',
    fallback_used: true,
    requested_locale: 'es',
    resolved_locale: 'en',
  });

  const banner = new FallbackBanner({
    context,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  });

  const html = banner.render();

  assert.match(html, /data-fallback-banner="true"/);
  assert.match(html, /Viewing fallback content/);
});

test('FallbackBanner.render includes data attributes for locales', () => {
  const context = extractTranslationContext({
    id: 'page_123',
    fallback_used: true,
    requested_locale: 'fr',
    resolved_locale: 'de',
  });

  const banner = new FallbackBanner({
    context,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  });

  const html = banner.render();

  assert.match(html, /data-requested-locale="fr"/);
  assert.match(html, /data-resolved-locale="de"/);
});

test('FallbackBanner.render includes primary CTA (Create translation)', () => {
  const context = extractTranslationContext({
    id: 'page_123',
    fallback_used: true,
    requested_locale: 'es',
    resolved_locale: 'en',
  });

  const banner = new FallbackBanner({
    context,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  });

  const html = banner.render();

  assert.match(html, /data-action="create-translation"/);
  assert.match(html, /Create ES translation/);
});

test('FallbackBanner.render includes secondary CTA (Open source)', () => {
  const context = extractTranslationContext({
    id: 'page_123',
    fallback_used: true,
    requested_locale: 'es',
    resolved_locale: 'en',
  });

  const banner = new FallbackBanner({
    context,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  });

  const html = banner.render();

  assert.match(html, /data-action="open-source"/);
  assert.match(html, /Open EN \(source\)/);
});

test('FallbackBanner.render includes form lock message by default', () => {
  const context = extractTranslationContext({
    id: 'page_123',
    fallback_used: true,
    requested_locale: 'es',
    resolved_locale: 'en',
  });

  const banner = new FallbackBanner({
    context,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  });

  const html = banner.render();

  assert.match(html, /Editing is disabled/);
});

test('FallbackBanner.render hides form lock message when showFormLockMessage is false', () => {
  const context = extractTranslationContext({
    id: 'page_123',
    fallback_used: true,
    requested_locale: 'es',
    resolved_locale: 'en',
  });

  const banner = new FallbackBanner({
    context,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
    showFormLockMessage: false,
  });

  const html = banner.render();

  assert.ok(!html.includes('Editing is disabled'));
});

// =============================================================================
// FallbackBanner Accessibility Tests
// =============================================================================

test('FallbackBanner includes role="alert" for accessibility', () => {
  const context = extractTranslationContext({
    id: 'page_123',
    fallback_used: true,
    requested_locale: 'es',
    resolved_locale: 'en',
  });

  const banner = new FallbackBanner({
    context,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  });

  const html = banner.render();

  assert.match(html, /role="alert"/);
});

test('FallbackBanner includes aria-live="polite" for screen readers', () => {
  const context = extractTranslationContext({
    id: 'page_123',
    fallback_used: true,
    requested_locale: 'es',
    resolved_locale: 'en',
  });

  const banner = new FallbackBanner({
    context,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  });

  const html = banner.render();

  assert.match(html, /aria-live="polite"/);
});

test('FallbackBanner CTA buttons include aria-label', () => {
  const context = extractTranslationContext({
    id: 'page_123',
    fallback_used: true,
    requested_locale: 'es',
    resolved_locale: 'en',
  });

  const banner = new FallbackBanner({
    context,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  });

  const html = banner.render();

  assert.match(html, /aria-label="Create Spanish translation"/);
  assert.match(html, /aria-label="Open English translation"/);
});

// =============================================================================
// renderFallbackBannerFromRecord Tests
// =============================================================================

test('renderFallbackBannerFromRecord renders banner from record payload', () => {
  const record = {
    id: 'page_123',
    fallback_used: true,
    requested_locale: 'es',
    resolved_locale: 'en',
  };

  const html = renderFallbackBannerFromRecord(record, {
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  });

  assert.match(html, /data-fallback-banner="true"/);
  assert.match(html, /Create ES translation/);
});

test('renderFallbackBannerFromRecord returns empty string when not in fallback', () => {
  const record = {
    id: 'page_123',
    fallback_used: false,
    requested_locale: 'en',
    resolved_locale: 'en',
  };

  const html = renderFallbackBannerFromRecord(record, {
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  });

  assert.equal(html, '');
});

// =============================================================================
// Config Options Tests
// =============================================================================

test('FallbackBanner accepts panelName config', () => {
  const context = extractTranslationContext({
    id: 'page_123',
    fallback_used: true,
    requested_locale: 'es',
    resolved_locale: 'en',
  });

  const banner = new FallbackBanner({
    context,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
    panelName: 'pages',
  });

  const html = banner.render();
  assert.match(html, /data-panel="pages"/);
});

test('FallbackBanner accepts environment config', () => {
  const context = extractTranslationContext({
    id: 'page_123',
    fallback_used: true,
    requested_locale: 'es',
    resolved_locale: 'en',
  });

  const banner = new FallbackBanner({
    context,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
    environment: 'production',
  });

  const html = banner.render();
  assert.match(html, /data-environment="production"/);
});

// =============================================================================
// Multiple Content Types Tests
// =============================================================================

test('FallbackBanner works with pages content type', () => {
  const context = extractTranslationContext({
    id: 'page_123',
    fallback_used: true,
    requested_locale: 'es',
    resolved_locale: 'en',
  });

  const banner = new FallbackBanner({
    context,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
    panelName: 'pages',
  });

  const html = banner.render();
  assert.match(html, /data-fallback-banner="true"/);
});

test('FallbackBanner works with posts content type', () => {
  const context = extractTranslationContext({
    id: 'post_456',
    fallback_used: true,
    requested_locale: 'fr',
    resolved_locale: 'en',
  });

  const banner = new FallbackBanner({
    context,
    apiEndpoint: '/admin/api/posts',
    navigationBasePath: '/admin/content/posts',
    panelName: 'posts',
  });

  const html = banner.render();
  assert.match(html, /data-fallback-banner="true"/);
});

test('FallbackBanner works with news content type', () => {
  const context = extractTranslationContext({
    id: 'news_789',
    fallback_used: true,
    requested_locale: 'de',
    resolved_locale: 'en',
  });

  const banner = new FallbackBanner({
    context,
    apiEndpoint: '/admin/api/news',
    navigationBasePath: '/admin/content/news',
    panelName: 'news',
  });

  const html = banner.render();
  assert.match(html, /data-fallback-banner="true"/);
});

// =============================================================================
// Secondary CTA URL Tests
// =============================================================================

test('FallbackBanner secondary CTA has correct URL structure', () => {
  const context = extractTranslationContext({
    id: 'page_123',
    fallback_used: true,
    requested_locale: 'es',
    resolved_locale: 'en',
  });

  const banner = new FallbackBanner({
    context,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  });

  const html = banner.render();

  // Should have href with locale param
  assert.match(html, /href="\/admin\/content\/pages\/page_123\/edit\?locale=en"/);
});

test('FallbackBanner secondary CTA includes environment in URL', () => {
  const context = extractTranslationContext({
    id: 'page_123',
    fallback_used: true,
    requested_locale: 'es',
    resolved_locale: 'en',
  });

  const banner = new FallbackBanner({
    context,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
    environment: 'staging',
  });

  const html = banner.render();

  // Should have href with both locale and env params
  assert.match(html, /href="\/admin\/content\/pages\/page_123\/edit\?locale=en&amp;env=staging"/);
});
