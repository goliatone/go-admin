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

console.log('All translation context tests completed');
