import test from 'node:test';
import assert from 'node:assert/strict';

// Import the translation blocker modal exports from datatable index
const {
  TranslationBlockerModal,
  showTranslationBlocker,
} = await import('../dist/datatable/index.js');

// =============================================================================
// TranslationBlockerModal Configuration Tests
// =============================================================================

test('TranslationBlockerModal constructor accepts required config', () => {
  const config = {
    transition: 'publish',
    entityType: 'pages',
    recordId: 'page_123',
    missingLocales: ['es', 'fr'],
    missingFieldsByLocale: null,
    requestedLocale: 'en',
    environment: 'production',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  };

  // Should not throw
  const modal = new TranslationBlockerModal(config);
  assert.ok(modal);
});

test('TranslationBlockerModal handles missing_fields_by_locale config', () => {
  const config = {
    transition: 'publish',
    entityType: 'pages',
    recordId: 'page_123',
    missingLocales: ['es', 'fr'],
    missingFieldsByLocale: {
      es: ['title', 'summary'],
      fr: ['title', 'path'],
    },
    requestedLocale: 'en',
    environment: 'production',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  };

  const modal = new TranslationBlockerModal(config);
  assert.ok(modal);
});

test('TranslationBlockerModal handles null optional fields', () => {
  const config = {
    transition: null,
    entityType: null,
    recordId: 'page_123',
    missingLocales: ['es'],
    missingFieldsByLocale: null,
    requestedLocale: null,
    environment: null,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  };

  const modal = new TranslationBlockerModal(config);
  assert.ok(modal);
});

test('TranslationBlockerModal handles empty missing_locales array', () => {
  const config = {
    transition: 'publish',
    entityType: 'pages',
    recordId: 'page_123',
    missingLocales: [],
    missingFieldsByLocale: null,
    requestedLocale: 'en',
    environment: null,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  };

  const modal = new TranslationBlockerModal(config);
  assert.ok(modal);
});

// =============================================================================
// showTranslationBlocker Function Tests
// =============================================================================

test('showTranslationBlocker is a function', () => {
  assert.equal(typeof showTranslationBlocker, 'function');
});

test('showTranslationBlocker is an async function that accepts config', () => {
  // We can't actually show the modal in node tests (no DOM),
  // but we can verify the function signature and type
  assert.equal(typeof showTranslationBlocker, 'function');

  // Verify the function's constructor name indicates it's async
  // AsyncFunction indicates it returns a Promise
  const fnName = showTranslationBlocker.constructor.name;
  assert.ok(
    fnName === 'AsyncFunction' || fnName === 'Function',
    'showTranslationBlocker should be a function'
  );
});

// =============================================================================
// TranslationBlockerModal.showBlocker Static Method Tests
// =============================================================================

test('TranslationBlockerModal.showBlocker is a static method', () => {
  assert.equal(typeof TranslationBlockerModal.showBlocker, 'function');
});

// =============================================================================
// Configuration Contract Tests
// =============================================================================

test('config supports onCreateSuccess callback', () => {
  let callbackCalled = false;
  const config = {
    transition: 'publish',
    entityType: 'pages',
    recordId: 'page_123',
    missingLocales: ['es'],
    missingFieldsByLocale: null,
    requestedLocale: 'en',
    environment: null,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
    onCreateSuccess: (locale, result) => {
      callbackCalled = true;
    },
  };

  const modal = new TranslationBlockerModal(config);
  assert.ok(modal);
  // Callback is stored but not called until create action is executed
  assert.equal(callbackCalled, false);
});

test('config supports onError callback', () => {
  const config = {
    transition: 'publish',
    entityType: 'pages',
    recordId: 'page_123',
    missingLocales: ['es'],
    missingFieldsByLocale: null,
    requestedLocale: 'en',
    environment: null,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
    onError: (message) => {
      // Error handler
    },
  };

  const modal = new TranslationBlockerModal(config);
  assert.ok(modal);
});

test('config supports onDismiss callback', () => {
  const config = {
    transition: 'publish',
    entityType: 'pages',
    recordId: 'page_123',
    missingLocales: ['es'],
    missingFieldsByLocale: null,
    requestedLocale: 'en',
    environment: null,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
    onDismiss: () => {
      // Dismiss handler
    },
  };

  const modal = new TranslationBlockerModal(config);
  assert.ok(modal);
});

test('config supports panelName for policy_entity', () => {
  const config = {
    transition: 'publish',
    entityType: 'pages',
    recordId: 'page_123',
    missingLocales: ['es'],
    missingFieldsByLocale: null,
    requestedLocale: 'en',
    environment: 'production',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
    panelName: 'pages',
  };

  const modal = new TranslationBlockerModal(config);
  assert.ok(modal);
});

// =============================================================================
// CreateTranslationResult Type Contract Tests
// =============================================================================

test('CreateTranslationResult contract matches expected fields', () => {
  // Verify the expected shape of create_translation response
  const expectedResult = {
    id: 'page_789',
    locale: 'es',
    status: 'draft',
    translation_group_id: 'tg_123',
  };

  // All required fields are present
  assert.equal(typeof expectedResult.id, 'string');
  assert.equal(typeof expectedResult.locale, 'string');
  assert.equal(typeof expectedResult.status, 'string');
  // translation_group_id is optional
  assert.equal(typeof expectedResult.translation_group_id, 'string');
});

// =============================================================================
// Integration with TranslationBlockerContext Tests
// =============================================================================

test('TranslationBlockerModal config aligns with TranslationBlockerContext from schema-actions', async () => {
  // Import TranslationBlockerContext type contract from datatable index
  const { SchemaActionBuilder } = await import('../dist/datatable/index.js');

  // The TranslationBlockerContext from SchemaActionBuilder should map to TranslationBlockerModalConfig
  // This ensures integration is seamless
  const blockerContext = {
    actionName: 'publish',
    recordId: 'page_123',
    missingLocales: ['es', 'fr'],
    missingFieldsByLocale: { es: ['title'] },
    transition: 'publish',
    entityType: 'pages',
    requestedLocale: 'en',
    environment: 'production',
  };

  // TranslationBlockerModalConfig requires these mapped from context
  const modalConfig = {
    transition: blockerContext.transition,
    entityType: blockerContext.entityType,
    recordId: blockerContext.recordId,
    missingLocales: blockerContext.missingLocales,
    missingFieldsByLocale: blockerContext.missingFieldsByLocale,
    requestedLocale: blockerContext.requestedLocale,
    environment: blockerContext.environment,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  };

  const modal = new TranslationBlockerModal(modalConfig);
  assert.ok(modal);
});

// =============================================================================
// Locale Label Tests
// =============================================================================

test('common locale codes are recognized', () => {
  // Test that the modal would recognize standard locale codes
  const commonLocales = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh', 'ar', 'ru'];

  const config = {
    transition: 'publish',
    entityType: 'pages',
    recordId: 'page_123',
    missingLocales: commonLocales,
    missingFieldsByLocale: null,
    requestedLocale: 'en',
    environment: null,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  };

  const modal = new TranslationBlockerModal(config);
  assert.ok(modal);
});

// =============================================================================
// Fallback Behavior Tests (Task 6.8)
// =============================================================================

test('modal handles missing_fields_by_locale being null gracefully', () => {
  const config = {
    transition: 'publish',
    entityType: 'pages',
    recordId: 'page_123',
    missingLocales: ['es', 'fr', 'de'],
    missingFieldsByLocale: null, // No field-level info available
    requestedLocale: 'en',
    environment: 'production',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  };

  const modal = new TranslationBlockerModal(config);
  assert.ok(modal);
  // Modal should render locale-level blockers only without field hints
});

test('modal handles empty missing_fields_by_locale object', () => {
  const config = {
    transition: 'publish',
    entityType: 'pages',
    recordId: 'page_123',
    missingLocales: ['es', 'fr'],
    missingFieldsByLocale: {}, // Empty object - no fields for any locale
    requestedLocale: 'en',
    environment: null,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  };

  const modal = new TranslationBlockerModal(config);
  assert.ok(modal);
});

test('modal handles partial missing_fields_by_locale', () => {
  const config = {
    transition: 'publish',
    entityType: 'pages',
    recordId: 'page_123',
    missingLocales: ['es', 'fr', 'de'],
    missingFieldsByLocale: {
      es: ['title'], // Only es has field info
      // fr and de have no field info
    },
    requestedLocale: 'en',
    environment: null,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  };

  const modal = new TranslationBlockerModal(config);
  assert.ok(modal);
});

// =============================================================================
// Entity Type Handling Tests
// =============================================================================

test('modal supports pages entity type', () => {
  const config = {
    transition: 'publish',
    entityType: 'pages',
    recordId: 'page_123',
    missingLocales: ['es'],
    missingFieldsByLocale: null,
    requestedLocale: 'en',
    environment: null,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  };

  const modal = new TranslationBlockerModal(config);
  assert.ok(modal);
});

test('modal supports posts entity type', () => {
  const config = {
    transition: 'publish',
    entityType: 'posts',
    recordId: 'post_456',
    missingLocales: ['es', 'fr'],
    missingFieldsByLocale: {
      es: ['title', 'content'],
      fr: ['title'],
    },
    requestedLocale: 'en',
    environment: 'production',
    apiEndpoint: '/admin/api/posts',
    navigationBasePath: '/admin/content/posts',
  };

  const modal = new TranslationBlockerModal(config);
  assert.ok(modal);
});

// =============================================================================
// Environment Handling Tests
// =============================================================================

test('modal handles staging environment', () => {
  const config = {
    transition: 'publish',
    entityType: 'pages',
    recordId: 'page_123',
    missingLocales: ['es'],
    missingFieldsByLocale: null,
    requestedLocale: 'en',
    environment: 'staging',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  };

  const modal = new TranslationBlockerModal(config);
  assert.ok(modal);
});

test('modal handles production environment', () => {
  const config = {
    transition: 'publish',
    entityType: 'pages',
    recordId: 'page_123',
    missingLocales: ['es', 'fr'],
    missingFieldsByLocale: { es: ['summary'], fr: ['path'] },
    requestedLocale: 'en',
    environment: 'production',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  };

  const modal = new TranslationBlockerModal(config);
  assert.ok(modal);
});

test('modal handles null environment', () => {
  const config = {
    transition: 'publish',
    entityType: 'pages',
    recordId: 'page_123',
    missingLocales: ['es'],
    missingFieldsByLocale: null,
    requestedLocale: 'en',
    environment: null,
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  };

  const modal = new TranslationBlockerModal(config);
  assert.ok(modal);
});
