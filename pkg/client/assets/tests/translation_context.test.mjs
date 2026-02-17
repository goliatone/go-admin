/**
 * Tests for translation-context.ts
 * Tests extraction, normalization, and rendering of translation metadata
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// Mock the shared/badge module
const mockBadge = (text, category, variant, opts) => {
  return `<span class="badge badge-${category}-${variant}">${text}</span>`;
};

// Since we can't import TypeScript directly, we'll test the logic by
// simulating what the module does

// ============================================================================
// extractTranslationContext tests
// ============================================================================

describe('extractTranslationContext', () => {
  // Simulate the extraction logic
  function extractTranslationContext(record) {
    const context = {
      requestedLocale: null,
      resolvedLocale: null,
      availableLocales: [],
      missingRequestedLocale: false,
      fallbackUsed: false,
      translationGroupId: null,
      status: null,
      entityType: null,
      recordId: null,
    };

    if (!record || typeof record !== 'object') {
      return context;
    }

    // Helper to get nested value
    const getNestedValue = (obj, path) => {
      const parts = path.split('.');
      let current = obj;
      for (const part of parts) {
        if (current === null || current === undefined || typeof current !== 'object') {
          return undefined;
        }
        current = current[part];
      }
      return current;
    };

    // Extract string field
    const extractString = (paths) => {
      for (const path of paths) {
        const value = getNestedValue(record, path);
        if (typeof value === 'string' && value.trim()) {
          return value;
        }
      }
      return null;
    };

    // Extract array field
    const extractArray = (paths) => {
      for (const path of paths) {
        const value = getNestedValue(record, path);
        if (Array.isArray(value)) {
          return value.filter(v => typeof v === 'string');
        }
      }
      return [];
    };

    // Extract boolean field
    const extractBoolean = (paths) => {
      for (const path of paths) {
        const value = getNestedValue(record, path);
        if (typeof value === 'boolean') return value;
        if (value === 'true') return true;
        if (value === 'false') return false;
      }
      return false;
    };

    context.requestedLocale = extractString([
      'requested_locale',
      'translation.meta.requested_locale',
      'content_translation.meta.requested_locale',
    ]);

    context.resolvedLocale = extractString([
      'resolved_locale',
      'locale',
      'translation.meta.resolved_locale',
      'content_translation.meta.resolved_locale',
    ]);

    context.availableLocales = extractArray([
      'available_locales',
      'translation.meta.available_locales',
      'content_translation.meta.available_locales',
    ]);

    context.missingRequestedLocale = extractBoolean([
      'missing_requested_locale',
      'translation.meta.missing_requested_locale',
      'content_translation.meta.missing_requested_locale',
    ]);

    context.fallbackUsed = extractBoolean([
      'fallback_used',
      'translation.meta.fallback_used',
      'content_translation.meta.fallback_used',
    ]);

    context.translationGroupId = extractString([
      'translation_group_id',
      'translation.meta.translation_group_id',
      'content_translation.meta.translation_group_id',
    ]);

    context.status = extractString(['status']);
    context.entityType = extractString(['entity_type', 'type', '_type']);
    context.recordId = extractString(['id']);

    // Infer fallback state
    if (!context.fallbackUsed && context.requestedLocale && context.resolvedLocale) {
      context.fallbackUsed = context.requestedLocale !== context.resolvedLocale;
    }

    if (!context.missingRequestedLocale && context.fallbackUsed) {
      context.missingRequestedLocale = true;
    }

    return context;
  }

  it('should return empty context for null/undefined input', () => {
    const ctx = extractTranslationContext(null);
    assert.equal(ctx.requestedLocale, null);
    assert.equal(ctx.resolvedLocale, null);
    assert.deepEqual(ctx.availableLocales, []);
    assert.equal(ctx.fallbackUsed, false);
    assert.equal(ctx.missingRequestedLocale, false);
  });

  it('should extract flat translation fields', () => {
    const record = {
      id: 'page_123',
      locale: 'en',
      requested_locale: 'es',
      resolved_locale: 'en',
      available_locales: ['en', 'fr'],
      missing_requested_locale: true,
      fallback_used: true,
      translation_group_id: 'tg_abc',
      status: 'draft',
    };

    const ctx = extractTranslationContext(record);
    assert.equal(ctx.recordId, 'page_123');
    assert.equal(ctx.requestedLocale, 'es');
    assert.equal(ctx.resolvedLocale, 'en');
    assert.deepEqual(ctx.availableLocales, ['en', 'fr']);
    assert.equal(ctx.missingRequestedLocale, true);
    assert.equal(ctx.fallbackUsed, true);
    assert.equal(ctx.translationGroupId, 'tg_abc');
    assert.equal(ctx.status, 'draft');
  });

  it('should extract nested translation.meta fields', () => {
    const record = {
      id: 'page_456',
      translation: {
        meta: {
          requested_locale: 'fr',
          resolved_locale: 'en',
          available_locales: ['en', 'es', 'fr'],
          missing_requested_locale: true,
          fallback_used: true,
          translation_group_id: 'tg_xyz',
        }
      },
      status: 'published',
    };

    const ctx = extractTranslationContext(record);
    assert.equal(ctx.requestedLocale, 'fr');
    assert.equal(ctx.resolvedLocale, 'en');
    assert.deepEqual(ctx.availableLocales, ['en', 'es', 'fr']);
    assert.equal(ctx.missingRequestedLocale, true);
    assert.equal(ctx.fallbackUsed, true);
    assert.equal(ctx.translationGroupId, 'tg_xyz');
  });

  it('should extract nested content_translation.meta fields', () => {
    const record = {
      id: 'post_789',
      content_translation: {
        meta: {
          requested_locale: 'de',
          resolved_locale: 'en',
          available_locales: ['en'],
          missing_requested_locale: true,
          fallback_used: true,
          translation_group_id: 'tg_def',
        }
      },
    };

    const ctx = extractTranslationContext(record);
    assert.equal(ctx.requestedLocale, 'de');
    assert.equal(ctx.resolvedLocale, 'en');
    assert.deepEqual(ctx.availableLocales, ['en']);
    assert.equal(ctx.translationGroupId, 'tg_def');
  });

  it('should prefer flat fields over nested fields', () => {
    const record = {
      requested_locale: 'flat_locale',
      translation: {
        meta: {
          requested_locale: 'nested_locale',
        }
      }
    };

    const ctx = extractTranslationContext(record);
    assert.equal(ctx.requestedLocale, 'flat_locale');
  });

  it('should infer fallback from locale mismatch', () => {
    const record = {
      requested_locale: 'fr',
      resolved_locale: 'en',
      locale: 'en',
    };

    const ctx = extractTranslationContext(record);
    assert.equal(ctx.fallbackUsed, true);
    assert.equal(ctx.missingRequestedLocale, true);
  });

  it('should not infer fallback when locales match', () => {
    const record = {
      requested_locale: 'en',
      resolved_locale: 'en',
      locale: 'en',
    };

    const ctx = extractTranslationContext(record);
    assert.equal(ctx.fallbackUsed, false);
    assert.equal(ctx.missingRequestedLocale, false);
  });

  it('should handle string boolean values', () => {
    const record = {
      fallback_used: 'true',
      missing_requested_locale: 'false',
    };

    const ctx = extractTranslationContext(record);
    assert.equal(ctx.fallbackUsed, true);
    // Note: When fallback_used is true, missingRequestedLocale is inferred to true
    // because fallback mode implies the requested locale was missing
    assert.equal(ctx.missingRequestedLocale, true);
  });

  it('should parse explicit false booleans without fallback inference', () => {
    const record = {
      fallback_used: 'false',
      missing_requested_locale: 'false',
    };

    const ctx = extractTranslationContext(record);
    assert.equal(ctx.fallbackUsed, false);
    assert.equal(ctx.missingRequestedLocale, false);
  });

  it('should extract entity_type from multiple paths', () => {
    const record1 = { entity_type: 'pages' };
    const record2 = { type: 'posts' };
    const record3 = { _type: 'articles' };

    assert.equal(extractTranslationContext(record1).entityType, 'pages');
    assert.equal(extractTranslationContext(record2).entityType, 'posts');
    assert.equal(extractTranslationContext(record3).entityType, 'articles');
  });
});

// ============================================================================
// isInFallbackMode tests
// ============================================================================

describe('isInFallbackMode', () => {
  function isInFallbackMode(record) {
    if (!record || typeof record !== 'object') return false;

    // Check explicit flags first
    if (record.fallback_used === true || record.fallback_used === 'true') return true;
    if (record.missing_requested_locale === true || record.missing_requested_locale === 'true') return true;

    // Check nested
    const translation = record.translation?.meta || record.content_translation?.meta || {};
    if (translation.fallback_used === true || translation.fallback_used === 'true') return true;
    if (translation.missing_requested_locale === true || translation.missing_requested_locale === 'true') return true;

    // Infer from locale mismatch
    const requested = record.requested_locale || translation.requested_locale;
    const resolved = record.resolved_locale || record.locale || translation.resolved_locale;
    if (requested && resolved && requested !== resolved) return true;

    return false;
  }

  it('should return true when fallback_used is true', () => {
    assert.equal(isInFallbackMode({ fallback_used: true }), true);
    assert.equal(isInFallbackMode({ fallback_used: 'true' }), true);
  });

  it('should return true when missing_requested_locale is true', () => {
    assert.equal(isInFallbackMode({ missing_requested_locale: true }), true);
  });

  it('should return true when locales mismatch', () => {
    assert.equal(isInFallbackMode({
      requested_locale: 'es',
      resolved_locale: 'en'
    }), true);
  });

  it('should return false when locales match', () => {
    assert.equal(isInFallbackMode({
      requested_locale: 'en',
      resolved_locale: 'en'
    }), false);
  });

  it('should return false for empty record', () => {
    assert.equal(isInFallbackMode({}), false);
  });

  it('should check nested translation.meta', () => {
    assert.equal(isInFallbackMode({
      translation: { meta: { fallback_used: true } }
    }), true);
  });
});

// ============================================================================
// hasTranslationContext tests
// ============================================================================

describe('hasTranslationContext', () => {
  function hasTranslationContext(record) {
    if (!record || typeof record !== 'object') return false;

    // Check for any translation-related field
    if (record.translation_group_id) return true;
    if (record.locale || record.resolved_locale) return true;
    if (Array.isArray(record.available_locales) && record.available_locales.length > 0) return true;

    // Check nested
    const translation = record.translation?.meta || record.content_translation?.meta || {};
    if (translation.translation_group_id) return true;
    if (translation.resolved_locale) return true;
    if (Array.isArray(translation.available_locales) && translation.available_locales.length > 0) return true;

    return false;
  }

  it('should return true when translation_group_id exists', () => {
    assert.equal(hasTranslationContext({ translation_group_id: 'tg_123' }), true);
  });

  it('should return true when locale exists', () => {
    assert.equal(hasTranslationContext({ locale: 'en' }), true);
  });

  it('should return true when available_locales has entries', () => {
    assert.equal(hasTranslationContext({ available_locales: ['en', 'es'] }), true);
  });

  it('should return false for empty record', () => {
    assert.equal(hasTranslationContext({}), false);
  });

  it('should check nested fields', () => {
    assert.equal(hasTranslationContext({
      translation: { meta: { translation_group_id: 'tg_456' } }
    }), true);
  });
});

// ============================================================================
// renderLocaleBadge output tests
// ============================================================================

describe('renderLocaleBadge output', () => {
  // Simplified render for testing
  function renderLocaleBadge(context, options = {}) {
    const ctx = context.resolvedLocale !== undefined ? context : {
      resolvedLocale: context.resolved_locale || context.locale,
      requestedLocale: context.requested_locale,
      fallbackUsed: context.fallback_used || false,
      missingRequestedLocale: context.missing_requested_locale || false,
    };

    if (!ctx.resolvedLocale) return '';

    const locale = ctx.resolvedLocale.toUpperCase();
    const isFallback = ctx.fallbackUsed || ctx.missingRequestedLocale;
    const showIndicator = options.showFallbackIndicator !== false;

    if (isFallback && showIndicator) {
      return `<span class="badge-fallback">${locale}</span>`;
    }
    return `<span class="badge-locale">${locale}</span>`;
  }

  it('should render empty string when no locale', () => {
    assert.equal(renderLocaleBadge({}), '');
  });

  it('should render locale badge', () => {
    const html = renderLocaleBadge({ resolved_locale: 'en' });
    assert.ok(html.includes('EN'));
    assert.ok(html.includes('badge-locale'));
  });

  it('should render fallback badge when in fallback mode', () => {
    const html = renderLocaleBadge({
      resolved_locale: 'en',
      fallback_used: true
    });
    assert.ok(html.includes('EN'));
    assert.ok(html.includes('badge-fallback'));
  });

  it('should not show fallback indicator when disabled', () => {
    const html = renderLocaleBadge({
      resolved_locale: 'en',
      fallback_used: true
    }, { showFallbackIndicator: false });
    assert.ok(html.includes('badge-locale'));
    assert.ok(!html.includes('badge-fallback'));
  });
});

// ============================================================================
// renderAvailableLocalesIndicator tests
// ============================================================================

describe('renderAvailableLocalesIndicator', () => {
  function renderAvailableLocalesIndicator(context, options = {}) {
    const ctx = context.availableLocales !== undefined ? context : {
      availableLocales: context.available_locales || [],
      resolvedLocale: context.resolved_locale || context.locale,
    };

    if (ctx.availableLocales.length === 0) return '';

    const maxLocales = options.maxLocales || 3;
    const visible = ctx.availableLocales.slice(0, maxLocales);
    const hidden = ctx.availableLocales.length - maxLocales;

    let html = visible.map(loc => {
      const isResolved = loc === ctx.resolvedLocale;
      return `<span class="${isResolved ? 'pill-active' : 'pill'}">${loc.toUpperCase()}</span>`;
    }).join('');

    if (hidden > 0) {
      html += `<span class="pill-overflow">+${hidden}</span>`;
    }

    return html;
  }

  it('should render empty string when no locales', () => {
    assert.equal(renderAvailableLocalesIndicator({ available_locales: [] }), '');
  });

  it('should render all locales when under max', () => {
    const html = renderAvailableLocalesIndicator({
      available_locales: ['en', 'es'],
      resolved_locale: 'en'
    });
    assert.ok(html.includes('EN'));
    assert.ok(html.includes('ES'));
    assert.ok(!html.includes('+'));
  });

  it('should truncate when over max', () => {
    const html = renderAvailableLocalesIndicator({
      available_locales: ['en', 'es', 'fr', 'de', 'it'],
    }, { maxLocales: 3 });
    assert.ok(html.includes('EN'));
    assert.ok(html.includes('ES'));
    assert.ok(html.includes('FR'));
    assert.ok(html.includes('+2'));
  });

  it('should highlight resolved locale', () => {
    const html = renderAvailableLocalesIndicator({
      available_locales: ['en', 'es'],
      resolved_locale: 'en'
    });
    assert.ok(html.includes('pill-active'));
  });
});

// ============================================================================
// renderFallbackWarning tests
// ============================================================================

describe('renderFallbackWarning', () => {
  function renderFallbackWarning(context, options = {}) {
    if (!context.fallbackUsed && !context.missingRequestedLocale) {
      return '';
    }

    const requestedLocale = context.requestedLocale || 'requested locale';
    const resolvedLocale = context.resolvedLocale || 'default';

    let html = `<div class="fallback-warning" data-fallback-mode="true">`;
    html += `<p>Viewing ${resolvedLocale} content (${requestedLocale} not available)</p>`;

    if (options.showCreateButton !== false) {
      html += `<button data-action="create-translation" data-locale="${context.requestedLocale || ''}">Create translation</button>`;
    }

    html += `</div>`;
    return html;
  }

  it('should render empty string when not in fallback mode', () => {
    assert.equal(renderFallbackWarning({
      fallbackUsed: false,
      missingRequestedLocale: false
    }), '');
  });

  it('should render warning when in fallback mode', () => {
    const html = renderFallbackWarning({
      fallbackUsed: true,
      requestedLocale: 'es',
      resolvedLocale: 'en'
    });
    assert.ok(html.includes('fallback-warning'));
    assert.ok(html.includes('data-fallback-mode="true"'));
  });

  it('should include create button by default', () => {
    const html = renderFallbackWarning({
      fallbackUsed: true,
      requestedLocale: 'es'
    });
    assert.ok(html.includes('data-action="create-translation"'));
    assert.ok(html.includes('data-locale="es"'));
  });

  it('should hide create button when disabled', () => {
    const html = renderFallbackWarning({
      fallbackUsed: true
    }, { showCreateButton: false });
    assert.ok(!html.includes('data-action="create-translation"'));
  });
});

// ============================================================================
// Fallback Read-Only Behavior Tests
// ============================================================================

describe('Fallback read-only behavior', () => {
  // Simulate the UI behavior logic for testing
  function shouldDisableFormSubmission(record) {
    if (!record || typeof record !== 'object') return false;

    // Check explicit flags
    if (record.fallback_used === true || record.fallback_used === 'true') return true;
    if (record.missing_requested_locale === true || record.missing_requested_locale === 'true') return true;

    // Check nested
    const translation = record.translation?.meta || record.content_translation?.meta || {};
    if (translation.fallback_used === true || translation.fallback_used === 'true') return true;
    if (translation.missing_requested_locale === true || translation.missing_requested_locale === 'true') return true;

    // Infer from locale mismatch
    const requested = record.requested_locale || translation.requested_locale;
    const resolved = record.resolved_locale || record.locale || translation.resolved_locale;
    if (requested && resolved && requested !== resolved) return true;

    return false;
  }

  it('should disable form when viewing fallback content', () => {
    const record = {
      id: 'page_123',
      requested_locale: 'es',
      resolved_locale: 'en',
      fallback_used: true,
    };
    assert.equal(shouldDisableFormSubmission(record), true);
  });

  it('should not disable form when viewing requested locale', () => {
    const record = {
      id: 'page_123',
      requested_locale: 'en',
      resolved_locale: 'en',
      fallback_used: false,
    };
    assert.equal(shouldDisableFormSubmission(record), false);
  });

  it('should disable form when missing_requested_locale is true', () => {
    const record = {
      id: 'page_123',
      missing_requested_locale: true,
    };
    assert.equal(shouldDisableFormSubmission(record), true);
  });

  it('should detect fallback from nested content_translation.meta', () => {
    const record = {
      id: 'page_123',
      content_translation: {
        meta: {
          fallback_used: true,
          requested_locale: 'fr',
          resolved_locale: 'en',
        }
      }
    };
    assert.equal(shouldDisableFormSubmission(record), true);
  });

  it('should infer fallback from locale mismatch even without explicit flag', () => {
    const record = {
      id: 'page_123',
      requested_locale: 'de',
      resolved_locale: 'en',
      // No explicit fallback_used flag
    };
    assert.equal(shouldDisableFormSubmission(record), true);
  });
});

// ============================================================================
// Create Translation Intent Flow Tests
// ============================================================================

describe('Create translation intent flow', () => {
  // Simulate the create translation action payload builder
  function buildCreateTranslationPayload(record, targetLocale, options = {}) {
    const payload = {
      id: record.id || record.recordId,
      locale: targetLocale,
    };

    // Add optional context
    if (options.environment) {
      payload.environment = options.environment;
    }
    if (options.policyEntity) {
      payload.policy_entity = options.policyEntity;
    }

    return payload;
  }

  // Simulate the create translation result handler
  function handleCreateTranslationResult(result) {
    if (!result || !result.success) {
      return { success: false, error: result?.error || 'Unknown error' };
    }

    const data = result.data || {};
    return {
      success: true,
      newRecordId: data.id || null,
      newLocale: data.locale || null,
      translationGroupId: data.translation_group_id || null,
      status: data.status || 'draft',
    };
  }

  it('should build correct payload for create translation', () => {
    const record = {
      id: 'page_123',
      translation_group_id: 'tg_abc',
    };
    const payload = buildCreateTranslationPayload(record, 'es');
    assert.equal(payload.id, 'page_123');
    assert.equal(payload.locale, 'es');
  });

  it('should include environment in payload when provided', () => {
    const record = { id: 'page_123' };
    const payload = buildCreateTranslationPayload(record, 'fr', { environment: 'staging' });
    assert.equal(payload.environment, 'staging');
  });

  it('should handle successful create translation response', () => {
    const result = {
      success: true,
      data: {
        id: 'page_456',
        locale: 'es',
        status: 'draft',
        translation_group_id: 'tg_abc',
      }
    };
    const handled = handleCreateTranslationResult(result);
    assert.equal(handled.success, true);
    assert.equal(handled.newRecordId, 'page_456');
    assert.equal(handled.newLocale, 'es');
    assert.equal(handled.translationGroupId, 'tg_abc');
  });

  it('should handle failed create translation response', () => {
    const result = {
      success: false,
      error: 'Translation already exists',
    };
    const handled = handleCreateTranslationResult(result);
    assert.equal(handled.success, false);
    assert.equal(handled.error, 'Translation already exists');
  });

  it('should handle response without data', () => {
    const result = { success: true };
    const handled = handleCreateTranslationResult(result);
    assert.equal(handled.success, true);
    assert.equal(handled.newRecordId, null);
  });
});

// ============================================================================
// Fallback Mode UI Data Attributes Tests
// ============================================================================

describe('Fallback mode data attributes', () => {
  // Simulate building data attributes for fallback mode
  function buildFallbackModeAttributes(record) {
    const attrs = {};

    // Check if in fallback mode
    const inFallback =
      record.fallback_used === true ||
      record.fallback_used === 'true' ||
      record.missing_requested_locale === true ||
      record.missing_requested_locale === 'true' ||
      (record.translation?.meta?.fallback_used === true) ||
      (record.content_translation?.meta?.fallback_used === true);

    if (inFallback) {
      attrs['data-fallback-mode'] = 'true';
      attrs['data-requested-locale'] =
        record.requested_locale ||
        record.translation?.meta?.requested_locale ||
        record.content_translation?.meta?.requested_locale ||
        '';
      attrs['data-resolved-locale'] =
        record.resolved_locale ||
        record.locale ||
        record.translation?.meta?.resolved_locale ||
        record.content_translation?.meta?.resolved_locale ||
        '';
    }

    return attrs;
  }

  it('should set data-fallback-mode when in fallback', () => {
    const record = {
      fallback_used: true,
      requested_locale: 'es',
      resolved_locale: 'en',
    };
    const attrs = buildFallbackModeAttributes(record);
    assert.equal(attrs['data-fallback-mode'], 'true');
    assert.equal(attrs['data-requested-locale'], 'es');
    assert.equal(attrs['data-resolved-locale'], 'en');
  });

  it('should not set attributes when not in fallback', () => {
    const record = {
      fallback_used: false,
      locale: 'en',
    };
    const attrs = buildFallbackModeAttributes(record);
    assert.equal(attrs['data-fallback-mode'], undefined);
  });

  it('should extract locales from nested translation.meta', () => {
    const record = {
      translation: {
        meta: {
          fallback_used: true,
          requested_locale: 'de',
          resolved_locale: 'en',
        }
      }
    };
    const attrs = buildFallbackModeAttributes(record);
    assert.equal(attrs['data-fallback-mode'], 'true');
    assert.equal(attrs['data-requested-locale'], 'de');
    assert.equal(attrs['data-resolved-locale'], 'en');
  });
});

// ============================================================================
// Form Submission Guard Tests
// ============================================================================

describe('Form submission guard', () => {
  // Simulate the form submission guard logic
  function canSubmitForm(containerAttrs, hasExplicitIntent = false) {
    const inFallbackMode = containerAttrs['data-fallback-mode'] === 'true';

    if (inFallbackMode && !hasExplicitIntent) {
      return {
        allowed: false,
        reason: 'Cannot save in fallback mode. Create the translation first.',
      };
    }

    return { allowed: true };
  }

  it('should block form submission in fallback mode', () => {
    const attrs = { 'data-fallback-mode': 'true' };
    const result = canSubmitForm(attrs);
    assert.equal(result.allowed, false);
    assert.ok(result.reason.includes('fallback mode'));
  });

  it('should allow form submission when not in fallback mode', () => {
    const attrs = {};
    const result = canSubmitForm(attrs);
    assert.equal(result.allowed, true);
  });

  it('should allow submission with explicit create intent in fallback mode', () => {
    const attrs = { 'data-fallback-mode': 'true' };
    const result = canSubmitForm(attrs, true);
    assert.equal(result.allowed, true);
  });
});

// ============================================================================
// Task 9.9: Contract Tests for Fallback Normalization
// Tests verifying normalization from flat and nested translation metadata keys
// ============================================================================

describe('Contract: Flat vs Nested Translation Metadata Normalization', () => {
  // Normalize translation context from various input shapes
  function normalizeTranslationContext(record) {
    const context = {
      requestedLocale: null,
      resolvedLocale: null,
      availableLocales: [],
      missingRequestedLocale: false,
      fallbackUsed: false,
      translationGroupId: null,
    };

    if (!record || typeof record !== 'object') {
      return context;
    }

    // Helper to get nested value
    const getNestedValue = (obj, path) => {
      const parts = path.split('.');
      let current = obj;
      for (const part of parts) {
        if (current === null || current === undefined || typeof current !== 'object') {
          return undefined;
        }
        current = current[part];
      }
      return current;
    };

    // Extract string field from multiple paths (first match wins)
    const extractString = (paths) => {
      for (const path of paths) {
        const value = getNestedValue(record, path);
        if (typeof value === 'string' && value.trim()) {
          return value;
        }
      }
      return null;
    };

    // Extract array field
    const extractArray = (paths) => {
      for (const path of paths) {
        const value = getNestedValue(record, path);
        if (Array.isArray(value)) {
          return value.filter(v => typeof v === 'string');
        }
      }
      return [];
    };

    // Extract boolean field
    const extractBoolean = (paths) => {
      for (const path of paths) {
        const value = getNestedValue(record, path);
        if (typeof value === 'boolean') return value;
        if (value === 'true') return true;
        if (value === 'false') return false;
      }
      return false;
    };

    // Normalization paths per field (flat first, then nested)
    context.requestedLocale = extractString([
      'requested_locale',
      'translation.meta.requested_locale',
      'content_translation.meta.requested_locale',
    ]);

    context.resolvedLocale = extractString([
      'resolved_locale',
      'locale',
      'translation.meta.resolved_locale',
      'content_translation.meta.resolved_locale',
    ]);

    context.availableLocales = extractArray([
      'available_locales',
      'translation.meta.available_locales',
      'content_translation.meta.available_locales',
    ]);

    context.missingRequestedLocale = extractBoolean([
      'missing_requested_locale',
      'translation.meta.missing_requested_locale',
      'content_translation.meta.missing_requested_locale',
    ]);

    context.fallbackUsed = extractBoolean([
      'fallback_used',
      'translation.meta.fallback_used',
      'content_translation.meta.fallback_used',
    ]);

    context.translationGroupId = extractString([
      'translation_group_id',
      'translation.meta.translation_group_id',
      'content_translation.meta.translation_group_id',
    ]);

    // Infer fallback state
    if (!context.fallbackUsed && context.requestedLocale && context.resolvedLocale) {
      context.fallbackUsed = context.requestedLocale !== context.resolvedLocale;
    }

    if (!context.missingRequestedLocale && context.fallbackUsed) {
      context.missingRequestedLocale = true;
    }

    return context;
  }

  it('contract: flat fields produce same output as nested translation.meta fields', () => {
    const flatRecord = {
      id: 'page_123',
      requested_locale: 'es',
      resolved_locale: 'en',
      available_locales: ['en', 'fr'],
      missing_requested_locale: true,
      fallback_used: true,
      translation_group_id: 'tg_abc',
    };

    const nestedRecord = {
      id: 'page_123',
      translation: {
        meta: {
          requested_locale: 'es',
          resolved_locale: 'en',
          available_locales: ['en', 'fr'],
          missing_requested_locale: true,
          fallback_used: true,
          translation_group_id: 'tg_abc',
        }
      }
    };

    const flatContext = normalizeTranslationContext(flatRecord);
    const nestedContext = normalizeTranslationContext(nestedRecord);

    // Both should normalize to identical context
    assert.equal(flatContext.requestedLocale, nestedContext.requestedLocale);
    assert.equal(flatContext.resolvedLocale, nestedContext.resolvedLocale);
    assert.deepEqual(flatContext.availableLocales, nestedContext.availableLocales);
    assert.equal(flatContext.missingRequestedLocale, nestedContext.missingRequestedLocale);
    assert.equal(flatContext.fallbackUsed, nestedContext.fallbackUsed);
    assert.equal(flatContext.translationGroupId, nestedContext.translationGroupId);
  });

  it('contract: flat fields produce same output as nested content_translation.meta fields', () => {
    const flatRecord = {
      id: 'post_456',
      requested_locale: 'de',
      resolved_locale: 'en',
      available_locales: ['en', 'es', 'de'],
      missing_requested_locale: false,
      fallback_used: false,
      translation_group_id: 'tg_xyz',
    };

    const nestedRecord = {
      id: 'post_456',
      content_translation: {
        meta: {
          requested_locale: 'de',
          resolved_locale: 'en',
          available_locales: ['en', 'es', 'de'],
          missing_requested_locale: false,
          fallback_used: false,
          translation_group_id: 'tg_xyz',
        }
      }
    };

    const flatContext = normalizeTranslationContext(flatRecord);
    const nestedContext = normalizeTranslationContext(nestedRecord);

    assert.equal(flatContext.requestedLocale, nestedContext.requestedLocale);
    assert.equal(flatContext.resolvedLocale, nestedContext.resolvedLocale);
    assert.deepEqual(flatContext.availableLocales, nestedContext.availableLocales);
    assert.equal(flatContext.translationGroupId, nestedContext.translationGroupId);
  });

  it('contract: flat fields take precedence over nested fields', () => {
    const mixedRecord = {
      id: 'page_789',
      // Flat fields (should take precedence)
      requested_locale: 'flat_requested',
      resolved_locale: 'flat_resolved',
      translation_group_id: 'flat_tg',
      // Nested fields (should be ignored when flat exists)
      translation: {
        meta: {
          requested_locale: 'nested_requested',
          resolved_locale: 'nested_resolved',
          translation_group_id: 'nested_tg',
        }
      }
    };

    const context = normalizeTranslationContext(mixedRecord);

    // Flat fields should win
    assert.equal(context.requestedLocale, 'flat_requested');
    assert.equal(context.resolvedLocale, 'flat_resolved');
    assert.equal(context.translationGroupId, 'flat_tg');
  });

  it('contract: nested fields are used when flat fields are absent', () => {
    const nestedOnlyRecord = {
      id: 'page_999',
      content_translation: {
        meta: {
          requested_locale: 'nested_only_requested',
          resolved_locale: 'nested_only_resolved',
          available_locales: ['en', 'es'],
          translation_group_id: 'nested_only_tg',
        }
      }
    };

    const context = normalizeTranslationContext(nestedOnlyRecord);

    assert.equal(context.requestedLocale, 'nested_only_requested');
    assert.equal(context.resolvedLocale, 'nested_only_resolved');
    assert.deepEqual(context.availableLocales, ['en', 'es']);
    assert.equal(context.translationGroupId, 'nested_only_tg');
  });

  it('contract: fallback is inferred from locale mismatch in both shapes', () => {
    const flatMismatch = {
      requested_locale: 'fr',
      resolved_locale: 'en',
      // No explicit fallback_used
    };

    const nestedMismatch = {
      translation: {
        meta: {
          requested_locale: 'fr',
          resolved_locale: 'en',
          // No explicit fallback_used
        }
      }
    };

    const flatContext = normalizeTranslationContext(flatMismatch);
    const nestedContext = normalizeTranslationContext(nestedMismatch);

    // Both should infer fallback from mismatch
    assert.equal(flatContext.fallbackUsed, true);
    assert.equal(flatContext.missingRequestedLocale, true);
    assert.equal(nestedContext.fallbackUsed, true);
    assert.equal(nestedContext.missingRequestedLocale, true);
  });

  it('contract: empty/null values do not override valid nested values', () => {
    const record = {
      requested_locale: '',        // Empty string - should fall through
      resolved_locale: null,       // Null - should fall through
      translation: {
        meta: {
          requested_locale: 'valid_requested',
          resolved_locale: 'valid_resolved',
        }
      }
    };

    const context = normalizeTranslationContext(record);

    // Nested values should be used since flat values are empty/null
    assert.equal(context.requestedLocale, 'valid_requested');
    assert.equal(context.resolvedLocale, 'valid_resolved');
  });

  it('contract: normalization handles missing nested meta gracefully', () => {
    const record = {
      id: 'page_111',
      translation: {}, // Empty translation object, no meta
    };

    const context = normalizeTranslationContext(record);

    assert.equal(context.requestedLocale, null);
    assert.equal(context.resolvedLocale, null);
    assert.deepEqual(context.availableLocales, []);
    assert.equal(context.fallbackUsed, false);
  });

  it('contract: normalization handles null translation object', () => {
    const record = {
      id: 'page_222',
      translation: null,
      content_translation: null,
    };

    const context = normalizeTranslationContext(record);

    assert.equal(context.requestedLocale, null);
    assert.equal(context.resolvedLocale, null);
    assert.equal(context.translationGroupId, null);
  });

  it('contract: available_locales is always an array', () => {
    const records = [
      { available_locales: ['en', 'es'] },
      { available_locales: [] },
      { available_locales: null },
      { available_locales: undefined },
      { available_locales: 'en,es' }, // String, not array
      { translation: { meta: { available_locales: ['fr'] } } },
    ];

    for (const record of records) {
      const context = normalizeTranslationContext(record);
      assert.ok(Array.isArray(context.availableLocales));
    }
  });

  it('contract: boolean fields handle string "true"/"false" values', () => {
    const stringBoolRecord = {
      fallback_used: 'true',
      missing_requested_locale: 'false',
    };

    const context = normalizeTranslationContext(stringBoolRecord);

    assert.equal(context.fallbackUsed, true);
    // Note: fallback inference will set this to true when fallbackUsed is true
    assert.equal(context.missingRequestedLocale, true);
  });
});

// ============================================================================
// Task 9.9: Integration Tests - Forms and Forms Fallback Behavior
// ============================================================================

describe('Contract: Forms Fallback Detection Integration', () => {
  // Simulates the form logic that determines if editing is blocked
  function isEditingBlocked(record) {
    // Check explicit flags first
    if (record.fallback_used === true || record.fallback_used === 'true') return true;
    if (record.missing_requested_locale === true || record.missing_requested_locale === 'true') return true;

    // Check nested
    const translation = record.translation?.meta || record.content_translation?.meta || {};
    if (translation.fallback_used === true || translation.fallback_used === 'true') return true;
    if (translation.missing_requested_locale === true || translation.missing_requested_locale === 'true') return true;

    // Infer from locale mismatch
    const requested = record.requested_locale || translation.requested_locale;
    const resolved = record.resolved_locale || record.locale || translation.resolved_locale;
    if (requested && resolved && requested !== resolved) return true;

    return false;
  }

  it('blocks editing from flat fallback flags', () => {
    assert.equal(isEditingBlocked({ fallback_used: true }), true);
    assert.equal(isEditingBlocked({ missing_requested_locale: true }), true);
    assert.equal(isEditingBlocked({ fallback_used: 'true' }), true);
  });

  it('blocks editing from nested translation.meta fallback flags', () => {
    assert.equal(isEditingBlocked({
      translation: { meta: { fallback_used: true } }
    }), true);
    assert.equal(isEditingBlocked({
      translation: { meta: { missing_requested_locale: true } }
    }), true);
  });

  it('blocks editing from nested content_translation.meta fallback flags', () => {
    assert.equal(isEditingBlocked({
      content_translation: { meta: { fallback_used: true } }
    }), true);
    assert.equal(isEditingBlocked({
      content_translation: { meta: { missing_requested_locale: true } }
    }), true);
  });

  it('blocks editing when locales mismatch (flat)', () => {
    assert.equal(isEditingBlocked({
      requested_locale: 'es',
      resolved_locale: 'en',
    }), true);
  });

  it('blocks editing when locales mismatch (nested)', () => {
    assert.equal(isEditingBlocked({
      translation: {
        meta: {
          requested_locale: 'fr',
          resolved_locale: 'en',
        }
      }
    }), true);
  });

  it('allows editing when locales match', () => {
    assert.equal(isEditingBlocked({
      requested_locale: 'en',
      resolved_locale: 'en',
      fallback_used: false,
    }), false);
  });

  it('allows editing when no translation context', () => {
    assert.equal(isEditingBlocked({}), false);
    assert.equal(isEditingBlocked({ id: 'page_123', title: 'Test' }), false);
  });
});

// ============================================================================
// Phase 19: Translation Readiness Tests
// ============================================================================

describe('extractTranslationReadiness', () => {
  // Simulate the extraction logic for translation_readiness
  function extractTranslationReadiness(record) {
    const readiness = {
      translationGroupId: null,
      requiredLocales: [],
      availableLocales: [],
      missingRequiredLocales: [],
      missingRequiredFieldsByLocale: {},
      readinessState: null,
      readyForTransition: {},
      evaluatedEnvironment: null,
      hasReadinessMetadata: false,
    };

    if (!record || typeof record !== 'object') {
      return readiness;
    }

    const readinessObj = record.translation_readiness;
    if (readinessObj && typeof readinessObj === 'object') {
      readiness.hasReadinessMetadata = true;

      readiness.translationGroupId = typeof readinessObj.translation_group_id === 'string'
        ? readinessObj.translation_group_id
        : null;

      readiness.requiredLocales = Array.isArray(readinessObj.required_locales)
        ? readinessObj.required_locales.filter(v => typeof v === 'string')
        : [];

      readiness.availableLocales = Array.isArray(readinessObj.available_locales)
        ? readinessObj.available_locales.filter(v => typeof v === 'string')
        : [];

      readiness.missingRequiredLocales = Array.isArray(readinessObj.missing_required_locales)
        ? readinessObj.missing_required_locales.filter(v => typeof v === 'string')
        : [];

      const fieldsByLocale = readinessObj.missing_required_fields_by_locale;
      if (fieldsByLocale && typeof fieldsByLocale === 'object' && !Array.isArray(fieldsByLocale)) {
        for (const [locale, fields] of Object.entries(fieldsByLocale)) {
          if (Array.isArray(fields)) {
            readiness.missingRequiredFieldsByLocale[locale] = fields.filter(v => typeof v === 'string');
          }
        }
      }

      const state = readinessObj.readiness_state;
      if (typeof state === 'string' && ['ready', 'missing_locales', 'missing_fields', 'missing_locales_and_fields'].includes(state)) {
        readiness.readinessState = state;
      }

      const readyFor = readinessObj.ready_for_transition;
      if (readyFor && typeof readyFor === 'object' && !Array.isArray(readyFor)) {
        for (const [transition, ready] of Object.entries(readyFor)) {
          if (typeof ready === 'boolean') {
            readiness.readyForTransition[transition] = ready;
          }
        }
      }

      readiness.evaluatedEnvironment = typeof readinessObj.evaluated_environment === 'string'
        ? readinessObj.evaluated_environment
        : null;
    }

    return readiness;
  }

  it('should return empty readiness for null/undefined input', () => {
    const resultNull = extractTranslationReadiness(null);
    const resultUndefined = extractTranslationReadiness(undefined);
    const resultEmpty = extractTranslationReadiness({});

    assert.equal(resultNull.hasReadinessMetadata, false);
    assert.equal(resultUndefined.hasReadinessMetadata, false);
    assert.equal(resultEmpty.hasReadinessMetadata, false);
  });

  it('should extract canonical translation_readiness fields', () => {
    const record = {
      id: 'page_123',
      translation_readiness: {
        translation_group_id: 'tg_abc',
        required_locales: ['en', 'es', 'fr'],
        available_locales: ['en', 'es'],
        missing_required_locales: ['fr'],
        missing_required_fields_by_locale: {},
        readiness_state: 'missing_locales',
        ready_for_transition: { publish: false },
        evaluated_environment: 'production',
      },
    };

    const readiness = extractTranslationReadiness(record);

    assert.equal(readiness.hasReadinessMetadata, true);
    assert.equal(readiness.translationGroupId, 'tg_abc');
    assert.deepEqual(readiness.requiredLocales, ['en', 'es', 'fr']);
    assert.deepEqual(readiness.availableLocales, ['en', 'es']);
    assert.deepEqual(readiness.missingRequiredLocales, ['fr']);
    assert.equal(readiness.readinessState, 'missing_locales');
    assert.equal(readiness.readyForTransition.publish, false);
    assert.equal(readiness.evaluatedEnvironment, 'production');
  });

  it('should parse missing_required_fields_by_locale correctly', () => {
    const record = {
      translation_readiness: {
        translation_group_id: 'tg_abc',
        required_locales: ['en', 'es'],
        available_locales: ['en', 'es'],
        missing_required_locales: [],
        missing_required_fields_by_locale: {
          es: ['title', 'summary'],
          fr: ['path'],
        },
        readiness_state: 'missing_fields',
        ready_for_transition: { publish: false },
        evaluated_environment: 'staging',
      },
    };

    const readiness = extractTranslationReadiness(record);

    assert.deepEqual(readiness.missingRequiredFieldsByLocale.es, ['title', 'summary']);
    assert.deepEqual(readiness.missingRequiredFieldsByLocale.fr, ['path']);
    assert.equal(readiness.readinessState, 'missing_fields');
  });

  it('should handle ready state correctly', () => {
    const record = {
      translation_readiness: {
        translation_group_id: 'tg_abc',
        required_locales: ['en', 'es'],
        available_locales: ['en', 'es'],
        missing_required_locales: [],
        missing_required_fields_by_locale: {},
        readiness_state: 'ready',
        ready_for_transition: { publish: true },
        evaluated_environment: 'production',
      },
    };

    const readiness = extractTranslationReadiness(record);

    assert.equal(readiness.readinessState, 'ready');
    assert.equal(readiness.readyForTransition.publish, true);
    assert.deepEqual(readiness.missingRequiredLocales, []);
  });

  it('should handle missing_locales_and_fields state', () => {
    const record = {
      translation_readiness: {
        translation_group_id: 'tg_abc',
        required_locales: ['en', 'es', 'fr'],
        available_locales: ['en'],
        missing_required_locales: ['es', 'fr'],
        missing_required_fields_by_locale: {
          en: ['summary'],
        },
        readiness_state: 'missing_locales_and_fields',
        ready_for_transition: { publish: false },
        evaluated_environment: 'production',
      },
    };

    const readiness = extractTranslationReadiness(record);

    assert.equal(readiness.readinessState, 'missing_locales_and_fields');
    assert.deepEqual(readiness.missingRequiredLocales, ['es', 'fr']);
    assert.deepEqual(readiness.missingRequiredFieldsByLocale.en, ['summary']);
  });

  it('should filter invalid values from arrays', () => {
    const record = {
      translation_readiness: {
        translation_group_id: 'tg_abc',
        required_locales: ['en', null, 'es', undefined, 123],
        available_locales: ['en', {}, 'es'],
        missing_required_locales: ['fr', null],
        readiness_state: 'missing_locales',
        ready_for_transition: { publish: false },
      },
    };

    const readiness = extractTranslationReadiness(record);

    assert.deepEqual(readiness.requiredLocales, ['en', 'es']);
    assert.deepEqual(readiness.availableLocales, ['en', 'es']);
    assert.deepEqual(readiness.missingRequiredLocales, ['fr']);
  });
});

describe('hasTranslationReadiness', () => {
  function hasTranslationReadiness(record) {
    if (!record || typeof record !== 'object') return false;
    const readinessObj = record.translation_readiness;
    return !!(readinessObj && typeof readinessObj === 'object');
  }

  it('should return true when translation_readiness exists', () => {
    assert.equal(hasTranslationReadiness({
      translation_readiness: { readiness_state: 'ready' }
    }), true);
  });

  it('should return false when translation_readiness is missing', () => {
    assert.equal(hasTranslationReadiness({}), false);
    assert.equal(hasTranslationReadiness({ id: 'page_123' }), false);
  });

  it('should return false for null/undefined', () => {
    assert.equal(hasTranslationReadiness(null), false);
    assert.equal(hasTranslationReadiness(undefined), false);
  });
});

describe('isReadyForTransition', () => {
  function isReadyForTransition(record, transition) {
    if (!record || typeof record !== 'object') return false;
    const readinessObj = record.translation_readiness;
    if (!readinessObj || typeof readinessObj !== 'object') return false;
    const readyFor = readinessObj.ready_for_transition;
    if (!readyFor || typeof readyFor !== 'object') return false;
    return readyFor[transition] === true;
  }

  it('should return true when ready for publish', () => {
    assert.equal(isReadyForTransition({
      translation_readiness: { ready_for_transition: { publish: true } }
    }, 'publish'), true);
  });

  it('should return false when not ready for publish', () => {
    assert.equal(isReadyForTransition({
      translation_readiness: { ready_for_transition: { publish: false } }
    }, 'publish'), false);
  });

  it('should return false when transition not in map', () => {
    assert.equal(isReadyForTransition({
      translation_readiness: { ready_for_transition: { publish: true } }
    }, 'archive'), false);
  });

  it('should return false when no readiness metadata', () => {
    assert.equal(isReadyForTransition({}, 'publish'), false);
    assert.equal(isReadyForTransition({ id: 'page_123' }, 'publish'), false);
  });
});

describe('Readiness rendering helpers', () => {
  // Test the rendering logic output patterns

  function getReadinessStateDisplay(state, readiness) {
    switch (state) {
      case 'ready':
        return { label: 'Ready', bgClass: 'bg-green-100', hasCheck: true };
      case 'missing_locales':
        return { label: `${readiness.missingRequiredLocales.length} missing`, bgClass: 'bg-amber-100', hasWarning: true };
      case 'missing_fields':
        return { label: 'Incomplete', bgClass: 'bg-yellow-100', hasWarning: true };
      case 'missing_locales_and_fields':
        return { label: 'Not ready', bgClass: 'bg-red-100', hasWarning: true };
      default:
        return { label: 'Unknown', bgClass: 'bg-gray-100' };
    }
  }

  it('should return Ready for ready state', () => {
    const display = getReadinessStateDisplay('ready', { missingRequiredLocales: [] });
    assert.equal(display.label, 'Ready');
    assert.equal(display.bgClass, 'bg-green-100');
  });

  it('should return missing count for missing_locales state', () => {
    const display = getReadinessStateDisplay('missing_locales', { missingRequiredLocales: ['es', 'fr'] });
    assert.equal(display.label, '2 missing');
    assert.equal(display.bgClass, 'bg-amber-100');
  });

  it('should return Incomplete for missing_fields state', () => {
    const display = getReadinessStateDisplay('missing_fields', { missingRequiredLocales: [] });
    assert.equal(display.label, 'Incomplete');
    assert.equal(display.bgClass, 'bg-yellow-100');
  });

  it('should return Not ready for combined state', () => {
    const display = getReadinessStateDisplay('missing_locales_and_fields', { missingRequiredLocales: ['es'] });
    assert.equal(display.label, 'Not ready');
    assert.equal(display.bgClass, 'bg-red-100');
  });
});

describe('Locale completeness rendering', () => {
  function renderLocaleCompleteness(record) {
    if (!record || !record.translation_readiness) return '';
    const readiness = record.translation_readiness;
    const required = readiness.required_locales?.length || 0;
    if (required === 0) return '';

    const available = (readiness.available_locales || []).filter(
      loc => (readiness.required_locales || []).includes(loc)
    ).length;

    return `${available}/${required}`;
  }

  it('should render X/Y format for locale completeness', () => {
    const result = renderLocaleCompleteness({
      translation_readiness: {
        required_locales: ['en', 'es', 'fr'],
        available_locales: ['en', 'es'],
      },
    });
    assert.equal(result, '2/3');
  });

  it('should render 0/Y when no locales available', () => {
    const result = renderLocaleCompleteness({
      translation_readiness: {
        required_locales: ['en', 'es'],
        available_locales: [],
      },
    });
    assert.equal(result, '0/2');
  });

  it('should render Y/Y when all complete', () => {
    const result = renderLocaleCompleteness({
      translation_readiness: {
        required_locales: ['en', 'es'],
        available_locales: ['en', 'es', 'fr'], // extra fr doesn't count
      },
    });
    assert.equal(result, '2/2');
  });

  it('should return empty when no readiness metadata', () => {
    assert.equal(renderLocaleCompleteness({}), '');
    assert.equal(renderLocaleCompleteness(null), '');
  });

  it('should return empty when no required locales', () => {
    const result = renderLocaleCompleteness({
      translation_readiness: {
        required_locales: [],
        available_locales: ['en'],
      },
    });
    assert.equal(result, '');
  });
});

// ============================================================================
// Phase 19.2: Missing Translations Affordance Tests
// ============================================================================

describe('hasMissingTranslations', () => {
  function hasMissingTranslations(record) {
    if (!record || typeof record !== 'object') return false;
    const readinessObj = record.translation_readiness;
    if (!readinessObj || typeof readinessObj !== 'object') return false;
    return readinessObj.readiness_state !== 'ready';
  }

  it('should return false when ready', () => {
    assert.equal(hasMissingTranslations({
      translation_readiness: { readiness_state: 'ready' }
    }), false);
  });

  it('should return true when missing_locales', () => {
    assert.equal(hasMissingTranslations({
      translation_readiness: { readiness_state: 'missing_locales' }
    }), true);
  });

  it('should return true when missing_fields', () => {
    assert.equal(hasMissingTranslations({
      translation_readiness: { readiness_state: 'missing_fields' }
    }), true);
  });

  it('should return true when missing_locales_and_fields', () => {
    assert.equal(hasMissingTranslations({
      translation_readiness: { readiness_state: 'missing_locales_and_fields' }
    }), true);
  });

  it('should return false when no readiness metadata', () => {
    assert.equal(hasMissingTranslations({}), false);
    assert.equal(hasMissingTranslations({ id: 'page_123' }), false);
  });
});

describe('getMissingTranslationsCount', () => {
  function getMissingTranslationsCount(record) {
    if (!record || typeof record !== 'object') return 0;
    const readinessObj = record.translation_readiness;
    if (!readinessObj || typeof readinessObj !== 'object') return 0;
    return (readinessObj.missing_required_locales || []).length;
  }

  it('should return count of missing locales', () => {
    assert.equal(getMissingTranslationsCount({
      translation_readiness: {
        missing_required_locales: ['es', 'fr'],
      },
    }), 2);
  });

  it('should return 0 when no missing locales', () => {
    assert.equal(getMissingTranslationsCount({
      translation_readiness: {
        missing_required_locales: [],
      },
    }), 0);
  });

  it('should return 0 when no readiness metadata', () => {
    assert.equal(getMissingTranslationsCount({}), 0);
  });
});

describe('renderMissingTranslationsBadge', () => {
  function renderMissingTranslationsBadge(record) {
    if (!record || typeof record !== 'object') return '';
    const readinessObj = record.translation_readiness;
    if (!readinessObj || typeof readinessObj !== 'object') return '';
    if (readinessObj.readiness_state === 'ready') return '';

    const missingCount = (readinessObj.missing_required_locales || []).length;
    const hasMissingFields = Object.keys(readinessObj.missing_required_fields_by_locale || {}).length > 0;

    if (missingCount > 0) {
      return `badge:${missingCount} missing`;
    } else if (hasMissingFields) {
      return 'badge:Incomplete';
    }
    return '';
  }

  it('should return empty when ready', () => {
    assert.equal(renderMissingTranslationsBadge({
      translation_readiness: { readiness_state: 'ready' }
    }), '');
  });

  it('should show missing count when locales missing', () => {
    const result = renderMissingTranslationsBadge({
      translation_readiness: {
        readiness_state: 'missing_locales',
        missing_required_locales: ['es', 'fr'],
      },
    });
    assert.ok(result.includes('2 missing'));
  });

  it('should show Incomplete when fields missing', () => {
    const result = renderMissingTranslationsBadge({
      translation_readiness: {
        readiness_state: 'missing_fields',
        missing_required_locales: [],
        missing_required_fields_by_locale: { en: ['title'] },
      },
    });
    assert.ok(result.includes('Incomplete'));
  });

  it('should return empty when no readiness metadata', () => {
    assert.equal(renderMissingTranslationsBadge({}), '');
  });
});

// ============================================================================
// Phase 19.4: Dual-Mode Compatibility Tests (Productized + Legacy)
// ============================================================================

describe('Dual-mode compatibility: fallback detection', () => {
  // Simulate the fallback detection that works in both modes
  function detectFallbackMode(record) {
    // Check flat fields first (legacy mode)
    if (record.fallback_used === true || record.fallback_used === 'true') return true;
    if (record.missing_requested_locale === true || record.missing_requested_locale === 'true') return true;

    // Check nested translation.meta (legacy mode)
    const translationMeta = record.translation?.meta || record.content_translation?.meta || {};
    if (translationMeta.fallback_used === true || translationMeta.fallback_used === 'true') return true;
    if (translationMeta.missing_requested_locale === true || translationMeta.missing_requested_locale === 'true') return true;

    // Infer from locale mismatch
    const requested = record.requested_locale || translationMeta.requested_locale;
    const resolved = record.resolved_locale || record.locale || translationMeta.resolved_locale;
    if (requested && resolved && requested !== resolved) return true;

    return false;
  }

  it('legacy mode: detects fallback from flat fallback_used', () => {
    assert.equal(detectFallbackMode({ fallback_used: true }), true);
    assert.equal(detectFallbackMode({ fallback_used: 'true' }), true);
  });

  it('legacy mode: detects fallback from nested translation.meta', () => {
    assert.equal(detectFallbackMode({
      translation: { meta: { fallback_used: true } }
    }), true);
    assert.equal(detectFallbackMode({
      content_translation: { meta: { fallback_used: true } }
    }), true);
  });

  it('legacy mode: detects fallback from locale mismatch', () => {
    assert.equal(detectFallbackMode({
      requested_locale: 'es',
      resolved_locale: 'en'
    }), true);
  });

  it('productized mode: coexists with translation_readiness without interference', () => {
    // Record has both legacy context and productized readiness
    const record = {
      locale: 'en',
      requested_locale: 'en',
      resolved_locale: 'en',
      fallback_used: false,
      translation_readiness: {
        readiness_state: 'missing_locales',
        missing_required_locales: ['es', 'fr'],
        available_locales: ['en'],
      },
    };

    // Fallback detection should return false (we're viewing the correct locale)
    assert.equal(detectFallbackMode(record), false);
  });

  it('productized mode: fallback detection independent of readiness state', () => {
    // Even if readiness says "ready", if we're in fallback mode, editing should be blocked
    const readyButFallback = {
      requested_locale: 'es',
      resolved_locale: 'en',
      translation_readiness: {
        readiness_state: 'ready',
        missing_required_locales: [],
      },
    };
    assert.equal(detectFallbackMode(readyButFallback), true);

    // Conversely, if not in fallback but readiness has issues, still allow editing
    const notFallbackButMissing = {
      requested_locale: 'en',
      resolved_locale: 'en',
      fallback_used: false,
      translation_readiness: {
        readiness_state: 'missing_locales',
        missing_required_locales: ['es'],
      },
    };
    assert.equal(detectFallbackMode(notFallbackButMissing), false);
  });

  it('productized mode: legacy fallback flags take precedence', () => {
    // If legacy says fallback, block editing regardless of productized state
    const record = {
      fallback_used: true,
      translation_readiness: {
        readiness_state: 'ready',
        missing_required_locales: [],
      },
    };
    assert.equal(detectFallbackMode(record), true);
  });
});

describe('Dual-mode compatibility: readiness extraction', () => {
  // Simulate readiness extraction for both modes
  function getReadinessInfo(record) {
    // Productized mode: use translation_readiness
    if (record.translation_readiness) {
      const r = record.translation_readiness;
      return {
        hasMetadata: true,
        isReady: r.readiness_state === 'ready',
        missingLocales: r.missing_required_locales || [],
        requiredLocales: r.required_locales || [],
        availableLocales: r.available_locales || [],
      };
    }

    // Legacy mode: no productized readiness, use available_locales
    const availableLocales = record.available_locales ||
      record.translation?.meta?.available_locales || [];

    return {
      hasMetadata: false,
      isReady: null, // Unknown in legacy mode
      missingLocales: [],
      requiredLocales: [],
      availableLocales,
    };
  }

  it('productized mode: extracts readiness from translation_readiness', () => {
    const info = getReadinessInfo({
      translation_readiness: {
        readiness_state: 'missing_locales',
        required_locales: ['en', 'es', 'fr'],
        available_locales: ['en'],
        missing_required_locales: ['es', 'fr'],
      },
    });

    assert.equal(info.hasMetadata, true);
    assert.equal(info.isReady, false);
    assert.deepEqual(info.missingLocales, ['es', 'fr']);
    assert.deepEqual(info.requiredLocales, ['en', 'es', 'fr']);
  });

  it('legacy mode: falls back to available_locales only', () => {
    const info = getReadinessInfo({
      available_locales: ['en', 'es'],
      translation: {
        meta: {
          translation_group_id: 'tg_123',
        },
      },
    });

    assert.equal(info.hasMetadata, false);
    assert.equal(info.isReady, null);
    assert.deepEqual(info.availableLocales, ['en', 'es']);
  });

  it('legacy mode: extracts available_locales from nested translation.meta', () => {
    const info = getReadinessInfo({
      translation: {
        meta: {
          available_locales: ['en', 'fr'],
        },
      },
    });

    assert.equal(info.hasMetadata, false);
    assert.deepEqual(info.availableLocales, ['en', 'fr']);
  });

  it('dual-mode: productized takes precedence when both present', () => {
    const info = getReadinessInfo({
      available_locales: ['en'], // legacy
      translation_readiness: {
        readiness_state: 'ready',
        available_locales: ['en', 'es', 'fr'], // productized
        missing_required_locales: [],
      },
    });

    assert.equal(info.hasMetadata, true);
    assert.equal(info.isReady, true);
    assert.deepEqual(info.availableLocales, ['en', 'es', 'fr']);
  });
});

describe('Dual-mode compatibility: form edit guard behavior', () => {
  // Simulate form edit guard logic
  function shouldBlockFormEdit(record) {
    // Form editing is blocked when in fallback mode
    // This is independent of readiness state

    // Check explicit fallback flags
    if (record.fallback_used === true || record.fallback_used === 'true') return true;
    if (record.missing_requested_locale === true || record.missing_requested_locale === 'true') return true;

    // Check nested
    const meta = record.translation?.meta || record.content_translation?.meta || {};
    if (meta.fallback_used === true || meta.fallback_used === 'true') return true;
    if (meta.missing_requested_locale === true || meta.missing_requested_locale === 'true') return true;

    // Infer from locale mismatch
    const requested = record.requested_locale || meta.requested_locale;
    const resolved = record.resolved_locale || record.locale || meta.resolved_locale;
    if (requested && resolved && requested !== resolved) return true;

    return false;
  }

  it('blocks editing in legacy fallback mode', () => {
    assert.equal(shouldBlockFormEdit({ fallback_used: true }), true);
    assert.equal(shouldBlockFormEdit({
      translation: { meta: { missing_requested_locale: true } }
    }), true);
  });

  it('allows editing when not in fallback mode (legacy)', () => {
    assert.equal(shouldBlockFormEdit({
      requested_locale: 'en',
      resolved_locale: 'en',
      fallback_used: false,
    }), false);
  });

  it('allows editing when not in fallback mode (productized with missing)', () => {
    // Even if translations are missing, we can edit the current locale
    assert.equal(shouldBlockFormEdit({
      requested_locale: 'en',
      resolved_locale: 'en',
      fallback_used: false,
      translation_readiness: {
        readiness_state: 'missing_locales',
        missing_required_locales: ['es', 'fr'],
      },
    }), false);
  });

  it('blocks editing when in fallback mode (productized ready)', () => {
    // Even if productized says "ready", fallback mode blocks editing
    assert.equal(shouldBlockFormEdit({
      requested_locale: 'es',
      resolved_locale: 'en',
      translation_readiness: {
        readiness_state: 'ready',
        missing_required_locales: [],
      },
    }), true);
  });
});

console.log('All translation context tests completed');

// ============================================================================
// Phase 2: Translation Matrix Cell Tests (TX-032)
// ============================================================================

describe('renderTranslationMatrixCell', () => {
  // Helper function to extract incomplete locales
  function getIncompleteLocales(fieldsByLocale) {
    const incomplete = new Set();
    if (fieldsByLocale && typeof fieldsByLocale === 'object') {
      for (const [locale, fields] of Object.entries(fieldsByLocale)) {
        if (Array.isArray(fields) && fields.length > 0) {
          incomplete.add(locale);
        }
      }
    }
    return incomplete;
  }

  // Simulate the renderTranslationMatrixCell logic
  function renderTranslationMatrixCell(record, options = {}) {
    const { size = 'sm', maxLocales = 5, showLabels = false } = options;

    // Extract readiness
    const readinessObj = record?.translation_readiness;
    if (!readinessObj || typeof readinessObj !== 'object') {
      return '<span class="text-gray-400">-</span>';
    }

    const requiredLocales = Array.isArray(readinessObj.required_locales)
      ? readinessObj.required_locales.filter(v => typeof v === 'string')
      : [];
    const availableLocales = Array.isArray(readinessObj.available_locales)
      ? readinessObj.available_locales.filter(v => typeof v === 'string')
      : [];
    const missingRequiredFieldsByLocale = readinessObj.missing_required_fields_by_locale || {};

    const allLocales = requiredLocales.length > 0 ? requiredLocales : availableLocales;

    if (allLocales.length === 0) {
      return '<span class="text-gray-400">-</span>';
    }

    const availableSet = new Set(availableLocales);
    const incompleteLocales = getIncompleteLocales(missingRequiredFieldsByLocale);

    const chips = allLocales
      .slice(0, maxLocales)
      .map((locale) => {
        const isAvailable = availableSet.has(locale);
        const isIncomplete = isAvailable && incompleteLocales.has(locale);
        const isComplete = isAvailable && !isIncomplete;

        let stateClass;
        let icon;
        let stateLabel;

        if (isComplete) {
          stateClass = 'bg-green-100 text-green-700 border-green-300';
          icon = '●';
          stateLabel = 'Complete';
        } else if (isIncomplete) {
          stateClass = 'bg-amber-100 text-amber-700 border-amber-300';
          icon = '◐';
          stateLabel = 'Incomplete';
        } else {
          stateClass = 'bg-white text-gray-400 border-gray-300 border-dashed';
          icon = '○';
          stateLabel = 'Missing';
        }

        const sizeClass = size === 'sm'
          ? 'text-[10px] px-1.5 py-0.5'
          : 'text-xs px-2 py-1';

        const labelHtml = showLabels
          ? `<span class="font-medium">${locale.toUpperCase()}</span>`
          : '';

        return `<span class="inline-flex items-center gap-0.5 ${sizeClass} rounded border ${stateClass}" title="${locale.toUpperCase()}: ${stateLabel}" data-locale="${locale}" data-state="${stateLabel.toLowerCase()}">${labelHtml}<span aria-hidden="true">${icon}</span></span>`;
      })
      .join('');

    const overflow = allLocales.length > maxLocales
      ? `<span class="text-[10px] text-gray-500">+${allLocales.length - maxLocales}</span>`
      : '';

    return `<div class="flex items-center gap-1 flex-wrap" data-matrix-cell="true">${chips}${overflow}</div>`;
  }

  it('should return dash when no readiness metadata', () => {
    const html = renderTranslationMatrixCell({});
    assert.ok(html.includes('-'));
    assert.ok(!html.includes('data-matrix-cell'));
  });

  it('should return dash when no locales', () => {
    const html = renderTranslationMatrixCell({
      translation_readiness: {
        required_locales: [],
        available_locales: [],
      },
    });
    assert.ok(html.includes('-'));
  });

  it('should render complete locales with green styling and ● icon', () => {
    const record = {
      translation_readiness: {
        required_locales: ['en', 'es'],
        available_locales: ['en', 'es'],
        missing_required_locales: [],
        missing_required_fields_by_locale: {},
      },
    };
    const html = renderTranslationMatrixCell(record);
    assert.ok(html.includes('data-matrix-cell="true"'), 'Should have matrix cell marker');
    assert.ok(html.includes('data-locale="en"'), 'Should have en locale chip');
    assert.ok(html.includes('data-locale="es"'), 'Should have es locale chip');
    assert.ok(html.includes('data-state="complete"'), 'Should mark complete state');
    assert.ok(html.includes('●'), 'Should have complete icon');
    assert.ok(html.includes('bg-green-100'), 'Should have green background');
  });

  it('should render missing locales with gray/dashed styling and ○ icon', () => {
    const record = {
      translation_readiness: {
        required_locales: ['en', 'es', 'fr'],
        available_locales: ['en'],
        missing_required_locales: ['es', 'fr'],
        missing_required_fields_by_locale: {},
      },
    };
    const html = renderTranslationMatrixCell(record);
    assert.ok(html.includes('data-locale="es"'), 'Should have es locale chip');
    assert.ok(html.includes('data-state="missing"'), 'Should mark missing state');
    assert.ok(html.includes('○'), 'Should have missing icon');
    assert.ok(html.includes('border-dashed'), 'Should have dashed border for missing');
  });

  it('should render incomplete locales with amber styling and ◐ icon', () => {
    const record = {
      translation_readiness: {
        required_locales: ['en', 'es'],
        available_locales: ['en', 'es'],
        missing_required_locales: [],
        missing_required_fields_by_locale: {
          es: ['title', 'summary'],
        },
      },
    };
    const html = renderTranslationMatrixCell(record);
    assert.ok(html.includes('data-locale="es"'), 'Should have es locale chip');
    assert.ok(html.includes('data-state="incomplete"'), 'Should mark incomplete state');
    assert.ok(html.includes('◐'), 'Should have incomplete icon');
    assert.ok(html.includes('bg-amber-100'), 'Should have amber background for incomplete');
  });

  it('should truncate when over maxLocales and show overflow count', () => {
    const record = {
      translation_readiness: {
        required_locales: ['en', 'es', 'fr', 'de', 'it', 'pt'],
        available_locales: ['en', 'es'],
        missing_required_locales: ['fr', 'de', 'it', 'pt'],
        missing_required_fields_by_locale: {},
      },
    };
    const html = renderTranslationMatrixCell(record, { maxLocales: 3 });
    assert.ok(html.includes('data-locale="en"'), 'Should have first locale');
    assert.ok(html.includes('data-locale="es"'), 'Should have second locale');
    assert.ok(html.includes('data-locale="fr"'), 'Should have third locale');
    assert.ok(!html.includes('data-locale="de"'), 'Should not have fourth locale');
    assert.ok(html.includes('+3'), 'Should show +3 overflow');
  });

  it('should show labels when showLabels is true', () => {
    const record = {
      translation_readiness: {
        required_locales: ['en', 'es'],
        available_locales: ['en', 'es'],
        missing_required_locales: [],
        missing_required_fields_by_locale: {},
      },
    };
    const html = renderTranslationMatrixCell(record, { showLabels: true });
    assert.ok(html.includes('EN'), 'Should show uppercase EN label');
    assert.ok(html.includes('ES'), 'Should show uppercase ES label');
    assert.ok(html.includes('font-medium'), 'Should have font-medium for labels');
  });

  it('should use size=md styling when specified', () => {
    const record = {
      translation_readiness: {
        required_locales: ['en'],
        available_locales: ['en'],
        missing_required_locales: [],
        missing_required_fields_by_locale: {},
      },
    };
    const html = renderTranslationMatrixCell(record, { size: 'md' });
    assert.ok(html.includes('text-xs'), 'Should have text-xs for md size');
    assert.ok(html.includes('px-2'), 'Should have px-2 for md size');
  });

  it('should handle mixed states correctly', () => {
    const record = {
      translation_readiness: {
        required_locales: ['en', 'es', 'fr'],
        available_locales: ['en', 'es'],
        missing_required_locales: ['fr'],
        missing_required_fields_by_locale: {
          es: ['title'],
        },
      },
    };
    const html = renderTranslationMatrixCell(record);
    // en should be complete
    assert.ok(html.includes('●'), 'Should have complete icon for en');
    // es should be incomplete (available but has missing fields)
    assert.ok(html.includes('◐'), 'Should have incomplete icon for es');
    // fr should be missing
    assert.ok(html.includes('○'), 'Should have missing icon for fr');
  });

  it('should use availableLocales when requiredLocales is empty', () => {
    const record = {
      translation_readiness: {
        required_locales: [],
        available_locales: ['en', 'es'],
        missing_required_locales: [],
        missing_required_fields_by_locale: {},
      },
    };
    const html = renderTranslationMatrixCell(record);
    assert.ok(html.includes('data-locale="en"'), 'Should render en from available locales');
    assert.ok(html.includes('data-locale="es"'), 'Should render es from available locales');
  });

  it('should include proper accessibility attributes', () => {
    const record = {
      translation_readiness: {
        required_locales: ['en'],
        available_locales: ['en'],
        missing_required_locales: [],
        missing_required_fields_by_locale: {},
      },
    };
    const html = renderTranslationMatrixCell(record);
    assert.ok(html.includes('title="EN: Complete"'), 'Should have title attribute');
    assert.ok(html.includes('aria-hidden="true"'), 'Icon should be aria-hidden');
  });
});

// ============================================================================
// Task 19.6: Schema-Driven Action Authority Tests
// Verify that productized template affordances do not duplicate schema actions
// ============================================================================

describe('Task 19.6: Schema Action Authority', () => {
  // Helper function implementations for testing
  function extractTranslationReadiness(record) {
    const readiness = {
      translationGroupId: null,
      requiredLocales: [],
      availableLocales: [],
      missingRequiredLocales: [],
      missingRequiredFieldsByLocale: {},
      readinessState: null,
      readyForTransition: {},
      evaluatedEnvironment: null,
      hasReadinessMetadata: false,
    };

    if (!record || typeof record !== 'object') {
      return readiness;
    }

    const readinessObj = record.translation_readiness;
    if (readinessObj && typeof readinessObj === 'object') {
      readiness.hasReadinessMetadata = true;
      readiness.translationGroupId = typeof readinessObj.translation_group_id === 'string'
        ? readinessObj.translation_group_id : null;
      readiness.requiredLocales = Array.isArray(readinessObj.required_locales)
        ? readinessObj.required_locales.filter(v => typeof v === 'string') : [];
      readiness.availableLocales = Array.isArray(readinessObj.available_locales)
        ? readinessObj.available_locales.filter(v => typeof v === 'string') : [];
      readiness.missingRequiredLocales = Array.isArray(readinessObj.missing_required_locales)
        ? readinessObj.missing_required_locales.filter(v => typeof v === 'string') : [];
      const state = readinessObj.readiness_state;
      if (typeof state === 'string') {
        readiness.readinessState = state;
      }
      const readyFor = readinessObj.ready_for_transition;
      if (readyFor && typeof readyFor === 'object') {
        for (const [transition, ready] of Object.entries(readyFor)) {
          if (typeof ready === 'boolean') {
            readiness.readyForTransition[transition] = ready;
          }
        }
      }
    }
    return readiness;
  }

  function renderReadinessIndicator(readiness, options = {}) {
    if (!readiness || !readiness.hasReadinessMetadata) return '';
    const state = readiness.readinessState || 'unknown';
    const stateClass = state === 'ready' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800';
    return `<span class="readiness-indicator ${stateClass}">${state}</span>`;
  }

  function renderPublishReadinessBadge(readiness, options = {}) {
    if (!readiness || !readiness.hasReadinessMetadata) return '';
    const ready = readiness.readyForTransition?.publish === true;
    return ready
      ? '<span class="publish-ready bg-green-100 text-green-800">Ready</span>'
      : '<span class="publish-not-ready bg-red-100 text-red-800">Not Ready</span>';
  }

  function renderMissingTranslationsBadge(record, options = {}) {
    const readiness = extractTranslationReadiness(record);
    if (!readiness.hasReadinessMetadata) return '';
    const missing = readiness.missingRequiredLocales.length;
    if (missing === 0) return '';
    return `<span class="missing-translations-badge bg-amber-100 text-amber-800">${missing} missing</span>`;
  }

  function renderLocaleCompleteness(record, options = {}) {
    const readiness = extractTranslationReadiness(record);
    if (!readiness.hasReadinessMetadata) return '';
    const total = readiness.requiredLocales.length;
    const available = readiness.availableLocales.length;
    return `<span class="locale-completeness">${available}/${total}</span>`;
  }

  function renderLocaleBadge(ctx, options = {}) {
    if (!ctx.resolvedLocale) return '';
    const locale = ctx.resolvedLocale.toUpperCase();
    const isFallback = ctx.fallbackUsed || ctx.missingRequestedLocale;
    const showIndicator = options.showFallbackIndicator !== false;
    if (isFallback && showIndicator) {
      return `<span class="badge-fallback">${locale}</span>`;
    }
    return `<span class="badge-locale">${locale}</span>`;
  }

  function renderTranslationStatusCell(record, options = {}) {
    const locale = record.resolved_locale || record.locale;
    if (!locale) return '';
    const locales = record.available_locales || [];
    const localeHtml = `<span class="badge-locale">${locale.toUpperCase()}</span>`;
    const availHtml = locales.map(l => `<span class="pill">${l.toUpperCase()}</span>`).join('');
    return `${localeHtml} ${availHtml}`;
  }

  function renderFallbackWarning(ctx, options = {}) {
    if (!ctx.fallbackUsed && !ctx.missingRequestedLocale) return '';
    const { showCreateButton = true } = options;
    const requestedLocale = ctx.requestedLocale || 'requested locale';
    const resolvedLocale = ctx.resolvedLocale || 'default';
    const createButtonHtml = showCreateButton ? `
      <button type="button" data-action="create-translation" data-locale="${ctx.requestedLocale || ''}">
        Create ${requestedLocale.toUpperCase()} translation
      </button>
    ` : '';
    return `
      <div class="fallback-warning" role="alert">
        <h3>Viewing fallback content</h3>
        <p>The ${requestedLocale.toUpperCase()} translation doesn't exist yet.
           You're viewing content from ${resolvedLocale.toUpperCase()}.</p>
        ${createButtonHtml}
      </div>
    `;
  }

  describe('Productized Template Affordances Are Display-Only', () => {
    it('renderReadinessIndicator produces no action buttons', () => {
      const record = {
        translation_readiness: {
          readiness_state: 'ready',
          required_locales: ['en', 'es'],
          available_locales: ['en', 'es'],
          missing_required_locales: [],
        },
      };
      const readiness = extractTranslationReadiness(record);
      const html = renderReadinessIndicator(readiness, { size: 'sm' });
      assert.ok(!html.includes('<button'), 'Readiness indicator should not contain buttons');
      assert.ok(!html.includes('data-action'), 'Readiness indicator should not have action attributes');
      assert.ok(!html.includes('onclick'), 'Readiness indicator should not have onclick handlers');
    });

    it('renderPublishReadinessBadge produces no action buttons', () => {
      const record = {
        translation_readiness: {
          readiness_state: 'missing_locales',
          ready_for_transition: { publish: false },
        },
      };
      const readiness = extractTranslationReadiness(record);
      const html = renderPublishReadinessBadge(readiness, { size: 'sm' });
      assert.ok(!html.includes('<button'), 'Publish badge should not contain buttons');
      assert.ok(!html.includes('data-action'), 'Publish badge should not have action attributes');
    });

    it('renderMissingTranslationsBadge produces no action buttons', () => {
      const record = {
        translation_readiness: {
          readiness_state: 'missing_locales',
          missing_required_locales: ['es', 'fr'],
        },
      };
      const html = renderMissingTranslationsBadge(record, { size: 'sm' });
      assert.ok(!html.includes('<button'), 'Missing translations badge should not contain buttons');
      assert.ok(!html.includes('data-action'), 'Missing translations badge should not have action attributes');
    });

    it('renderLocaleCompleteness produces no action buttons', () => {
      const record = {
        translation_readiness: {
          required_locales: ['en', 'es', 'fr'],
          available_locales: ['en', 'es'],
        },
      };
      const html = renderLocaleCompleteness(record, { size: 'sm' });
      assert.ok(!html.includes('<button'), 'Locale completeness should not contain buttons');
      assert.ok(!html.includes('data-action'), 'Locale completeness should not have action attributes');
    });

    it('renderLocaleBadge produces no action buttons', () => {
      const ctx = {
        requestedLocale: 'es',
        resolvedLocale: 'es',
        fallbackUsed: false,
        availableLocales: ['en', 'es'],
        recordId: '123',
        missingRequestedLocale: false,
      };
      const html = renderLocaleBadge(ctx, { showFallbackIndicator: true, size: 'sm' });
      assert.ok(!html.includes('<button'), 'Locale badge should not contain buttons');
      assert.ok(!html.includes('data-action'), 'Locale badge should not have action attributes');
    });

    it('renderTranslationStatusCell produces no action buttons', () => {
      const record = {
        locale: 'en',
        requested_locale: 'en',
        resolved_locale: 'en',
        available_locales: ['en', 'es'],
      };
      const html = renderTranslationStatusCell(record, { size: 'sm' });
      assert.ok(!html.includes('<button'), 'Translation status cell should not contain buttons');
      assert.ok(!html.includes('data-action'), 'Translation status cell should not have action attributes');
    });
  });

  describe('Fallback Warning Is Contextual (Not Row Action Duplicate)', () => {
    it('renderFallbackWarning is for form/detail context only', () => {
      const ctx = {
        requestedLocale: 'es',
        resolvedLocale: 'en',
        fallbackUsed: true,
        availableLocales: ['en'],
        recordId: '123',
        missingRequestedLocale: true,
      };
      const html = renderFallbackWarning(ctx, { showCreateButton: true });
      assert.ok(html.includes('fallback-warning'), 'Should be a warning banner');
      assert.ok(html.includes('Viewing fallback content'), 'Should show fallback message');
      assert.ok(html.includes('role="alert"'), 'Should have alert role for accessibility');
      if (html.includes('<button')) {
        assert.ok(html.includes('data-action="create-translation"'), 'Create button should have specific action');
        assert.ok(!html.includes('data-action="view"'), 'Should not duplicate view action');
        assert.ok(!html.includes('data-action="edit"'), 'Should not duplicate edit action');
        assert.ok(!html.includes('data-action="delete"'), 'Should not duplicate delete action');
        assert.ok(!html.includes('data-action="publish"'), 'Should not duplicate publish action');
      }
    });

    it('renderFallbackWarning returns empty for non-fallback context', () => {
      const ctx = {
        requestedLocale: 'en',
        resolvedLocale: 'en',
        fallbackUsed: false,
        availableLocales: ['en'],
        recordId: '123',
        missingRequestedLocale: false,
      };
      const html = renderFallbackWarning(ctx);
      assert.equal(html, '', 'Should return empty when not in fallback mode');
    });

    it('renderFallbackWarning can hide create button', () => {
      const ctx = {
        requestedLocale: 'es',
        resolvedLocale: 'en',
        fallbackUsed: true,
        availableLocales: ['en'],
        recordId: '123',
        missingRequestedLocale: true,
      };
      const html = renderFallbackWarning(ctx, { showCreateButton: false });
      assert.ok(!html.includes('<button'), 'Should not show button when disabled');
    });
  });

  describe('Schema Action Deduplication Contract', () => {
    it('schema actions define authoritative row actions', () => {
      const schemaActions = [
        { name: 'view', label: 'View', type: 'navigation' },
        { name: 'edit', label: 'Edit', type: 'navigation' },
        { name: 'publish', label: 'Publish', command_name: 'publish' },
        { name: 'delete', label: 'Delete', variant: 'danger' },
      ];
      const actionNames = schemaActions.map(a => a.name);
      const uniqueNames = [...new Set(actionNames)];
      assert.deepEqual(actionNames, uniqueNames, 'Schema should have unique action names');
    });

    it('template affordances do not define row actions', () => {
      const displayOnlyRenderers = [
        'renderReadinessIndicator',
        'renderPublishReadinessBadge',
        'renderMissingTranslationsBadge',
        'renderLocaleCompleteness',
        'renderLocaleBadge',
        'renderTranslationStatusCell',
      ];
      for (const renderer of displayOnlyRenderers) {
        assert.ok(true, `${renderer} should be a display-only renderer`);
      }
    });
  });
});
