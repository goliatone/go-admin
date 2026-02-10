import test from 'node:test';
import assert from 'node:assert/strict';

// Import the error helpers from the dist output
const {
  extractStructuredError,
  extractTranslationBlocker,
  isTranslationBlocker,
  parseActionResponse,
  extractErrorMessage,
  getErrorMessage,
} = await import('../dist/toast/error-helpers.js');

// Helper to create mock Response objects
function mockResponse(body, options = {}) {
  const headers = new Map([
    ['content-type', options.contentType || 'application/json'],
  ]);
  return {
    status: options.status || 400,
    headers: {
      get: (key) => headers.get(key.toLowerCase()) || null,
    },
    clone() {
      return this;
    },
    async text() {
      return typeof body === 'string' ? body : JSON.stringify(body);
    },
    async json() {
      return typeof body === 'string' ? JSON.parse(body) : body;
    },
  };
}

// =============================================================================
// extractStructuredError Tests
// =============================================================================

test('extractStructuredError returns textCode from structured error envelope', async () => {
  const response = mockResponse({
    error: {
      text_code: 'TRANSLATION_MISSING',
      message: 'Cannot publish: missing required translations',
      metadata: { missing_locales: ['es', 'fr'] },
    },
  });

  const result = await extractStructuredError(response);

  assert.equal(result.textCode, 'TRANSLATION_MISSING');
  assert.equal(result.message, 'Cannot publish: missing required translations');
  assert.ok(result.metadata);
  assert.deepEqual(result.metadata.missing_locales, ['es', 'fr']);
});

test('extractStructuredError extracts validation_errors into fields', async () => {
  const response = mockResponse({
    error: {
      text_code: 'VALIDATION_FAILED',
      message: 'Validation failed',
      validation_errors: [
        { field: 'title', message: 'Title is required' },
        { field: 'path', message: 'Path is required' },
      ],
    },
  });

  const result = await extractStructuredError(response);

  assert.equal(result.textCode, 'VALIDATION_FAILED');
  assert.ok(result.fields);
  assert.equal(result.fields.title, 'Title is required');
  assert.equal(result.fields.path, 'Path is required');
  assert.ok(result.validationErrors);
  assert.equal(result.validationErrors.length, 2);
});

test('extractStructuredError handles simple string error format', async () => {
  const response = mockResponse({ error: 'Something went wrong' });

  const result = await extractStructuredError(response);

  assert.equal(result.textCode, null);
  assert.equal(result.message, 'Something went wrong');
});

test('extractStructuredError handles Problem+JSON format', async () => {
  const response = mockResponse(
    { title: 'Not Found', detail: 'Record with ID 123 not found' },
    { contentType: 'application/problem+json' }
  );

  const result = await extractStructuredError(response);

  assert.equal(result.textCode, null);
  assert.equal(result.message, 'Record with ID 123 not found');
});

test('extractStructuredError handles metadata.fields for field errors', async () => {
  const response = mockResponse({
    error: {
      message: 'Validation error',
      metadata: {
        fields: {
          email: 'Invalid email format',
          username: 'Username already taken',
        },
      },
    },
  });

  const result = await extractStructuredError(response);

  assert.ok(result.fields);
  assert.equal(result.fields.email, 'Invalid email format');
  assert.equal(result.fields.username, 'Username already taken');
});

test('extractStructuredError handles go-users text errors', async () => {
  const response = mockResponse('error | go-users: lifecycle transition not allowed', {
    contentType: 'text/plain',
  });

  const result = await extractStructuredError(response);

  assert.equal(result.message, 'lifecycle transition not allowed');
});

test('extractStructuredError falls back to status code on empty response', async () => {
  const response = mockResponse('', { status: 500 });

  const result = await extractStructuredError(response);

  assert.equal(result.message, 'Request failed (500)');
});

// =============================================================================
// extractTranslationBlocker Tests
// =============================================================================

test('extractTranslationBlocker returns null for non-translation errors', () => {
  const error = {
    textCode: 'VALIDATION_FAILED',
    message: 'Validation failed',
    metadata: null,
    fields: null,
    validationErrors: null,
  };

  const result = extractTranslationBlocker(error);

  assert.equal(result, null);
});

test('extractTranslationBlocker extracts missing_locales', () => {
  const error = {
    textCode: 'TRANSLATION_MISSING',
    message: 'Missing translations',
    metadata: {
      missing_locales: ['es', 'fr', 'de'],
      transition: 'publish',
      entity_type: 'pages',
    },
    fields: null,
    validationErrors: null,
  };

  const result = extractTranslationBlocker(error);

  assert.ok(result);
  assert.deepEqual(result.missingLocales, ['es', 'fr', 'de']);
  assert.equal(result.transition, 'publish');
  assert.equal(result.entityType, 'pages');
});

test('extractTranslationBlocker extracts missing_fields_by_locale', () => {
  const error = {
    textCode: 'TRANSLATION_MISSING',
    message: 'Missing translations',
    metadata: {
      missing_locales: ['es', 'fr'],
      missing_fields_by_locale: {
        es: ['title', 'summary'],
        fr: ['title', 'path'],
      },
      transition: 'publish',
    },
    fields: null,
    validationErrors: null,
  };

  const result = extractTranslationBlocker(error);

  assert.ok(result);
  assert.ok(result.missingFieldsByLocale);
  assert.deepEqual(result.missingFieldsByLocale.es, ['title', 'summary']);
  assert.deepEqual(result.missingFieldsByLocale.fr, ['title', 'path']);
});

test('extractTranslationBlocker uses policy_entity fallback for entity_type', () => {
  const error = {
    textCode: 'TRANSLATION_MISSING',
    message: 'Missing translations',
    metadata: {
      missing_locales: ['es'],
      policy_entity: 'posts',
    },
    fields: null,
    validationErrors: null,
  };

  const result = extractTranslationBlocker(error);

  assert.ok(result);
  assert.equal(result.entityType, 'posts');
});

test('extractTranslationBlocker extracts environment and requested_locale', () => {
  const error = {
    textCode: 'TRANSLATION_MISSING',
    message: 'Missing translations',
    metadata: {
      missing_locales: ['fr'],
      requested_locale: 'en',
      environment: 'production',
    },
    fields: null,
    validationErrors: null,
  };

  const result = extractTranslationBlocker(error);

  assert.ok(result);
  assert.equal(result.requestedLocale, 'en');
  assert.equal(result.environment, 'production');
});

test('extractTranslationBlocker handles empty metadata gracefully', () => {
  const error = {
    textCode: 'TRANSLATION_MISSING',
    message: 'Missing translations',
    metadata: null,
    fields: null,
    validationErrors: null,
  };

  const result = extractTranslationBlocker(error);

  assert.ok(result);
  assert.deepEqual(result.missingLocales, []);
  assert.equal(result.missingFieldsByLocale, null);
  assert.equal(result.transition, null);
});

// =============================================================================
// isTranslationBlocker Tests
// =============================================================================

test('isTranslationBlocker returns true for TRANSLATION_MISSING', () => {
  const error = {
    textCode: 'TRANSLATION_MISSING',
    message: 'test',
    metadata: null,
    fields: null,
    validationErrors: null,
  };

  assert.equal(isTranslationBlocker(error), true);
});

test('isTranslationBlocker returns false for other error codes', () => {
  const error = {
    textCode: 'VALIDATION_FAILED',
    message: 'test',
    metadata: null,
    fields: null,
    validationErrors: null,
  };

  assert.equal(isTranslationBlocker(error), false);
});

// =============================================================================
// parseActionResponse Tests
// =============================================================================

test('parseActionResponse handles success with status only', () => {
  const result = parseActionResponse({ status: 'ok' });

  assert.equal(result.success, true);
  assert.equal(result.data, undefined);
  assert.equal(result.error, undefined);
});

test('parseActionResponse handles success with data', () => {
  const result = parseActionResponse({
    status: 'ok',
    data: {
      id: 'page_789',
      locale: 'es',
      status: 'draft',
      translation_group_id: 'tg_123',
    },
  });

  assert.equal(result.success, true);
  assert.ok(result.data);
  assert.equal(result.data.id, 'page_789');
  assert.equal(result.data.locale, 'es');
  assert.equal(result.data.translation_group_id, 'tg_123');
});

test('parseActionResponse handles error envelope', () => {
  const result = parseActionResponse({
    error: {
      text_code: 'TRANSLATION_MISSING',
      message: 'Cannot publish',
      metadata: { missing_locales: ['es'] },
    },
  });

  assert.equal(result.success, false);
  assert.ok(result.error);
  assert.equal(result.error.textCode, 'TRANSLATION_MISSING');
  assert.equal(result.error.message, 'Cannot publish');
  assert.deepEqual(result.error.metadata?.missing_locales, ['es']);
});

test('parseActionResponse handles error with validation_errors', () => {
  const result = parseActionResponse({
    error: {
      message: 'Validation failed',
      validation_errors: [
        { field: 'locale', message: 'Locale is required' },
      ],
    },
  });

  assert.equal(result.success, false);
  assert.ok(result.error);
  assert.ok(result.error.fields);
  assert.equal(result.error.fields.locale, 'Locale is required');
});

test('parseActionResponse handles invalid input gracefully', () => {
  const result = parseActionResponse(null);

  assert.equal(result.success, false);
  assert.ok(result.error);
  assert.equal(result.error.message, 'Invalid response format');
});

test('parseActionResponse handles string error format', () => {
  const result = parseActionResponse({ error: 'Simple error message' });

  assert.equal(result.success, false);
  assert.ok(result.error);
  assert.equal(result.error.message, 'Simple error message');
});

// =============================================================================
// extractErrorMessage Tests (Legacy backward compatibility)
// =============================================================================

test('extractErrorMessage returns message from structured error', async () => {
  const response = mockResponse({
    error: {
      text_code: 'TRANSLATION_MISSING',
      message: 'Cannot publish: missing required translations',
    },
  });

  const message = await extractErrorMessage(response);

  assert.equal(message, 'Cannot publish: missing required translations');
});

test('extractErrorMessage formats validation errors into message', async () => {
  const response = mockResponse({
    error: {
      message: 'Validation failed',
      validation_errors: [
        { field: 'title', message: 'Title is required' },
        { field: 'path', message: 'Path is required' },
      ],
    },
  });

  const message = await extractErrorMessage(response);

  assert.ok(message.includes('title: Title is required'));
  assert.ok(message.includes('path: Path is required'));
});

test('extractErrorMessage handles simple string error', async () => {
  const response = mockResponse({ error: 'Something went wrong' });

  const message = await extractErrorMessage(response);

  assert.equal(message, 'Something went wrong');
});

test('extractErrorMessage handles Problem+JSON format', async () => {
  const response = mockResponse(
    { title: 'Not Found', detail: 'Record not found' },
    { contentType: 'application/problem+json' }
  );

  const message = await extractErrorMessage(response);

  assert.equal(message, 'Record not found');
});

// =============================================================================
// getErrorMessage Tests
// =============================================================================

test('getErrorMessage extracts message from Error objects', () => {
  const error = new Error('Test error message');

  assert.equal(getErrorMessage(error), 'Test error message');
});

test('getErrorMessage returns string errors directly', () => {
  assert.equal(getErrorMessage('Direct string error'), 'Direct string error');
});

test('getErrorMessage returns fallback for unknown types', () => {
  assert.equal(getErrorMessage(null), 'An unexpected error occurred');
  assert.equal(getErrorMessage(42), 'An unexpected error occurred');
  assert.equal(getErrorMessage({}), 'An unexpected error occurred');
});

// =============================================================================
// Mixed Error Format Tests
// =============================================================================

test('handles mixed format: structured error with both validation_errors and metadata.fields', async () => {
  const response = mockResponse({
    error: {
      message: 'Multiple issues',
      validation_errors: [
        { field: 'email', message: 'Invalid email' },
      ],
      metadata: {
        fields: {
          username: 'Already taken',
        },
      },
    },
  });

  const result = await extractStructuredError(response);

  assert.ok(result.fields);
  assert.equal(result.fields.email, 'Invalid email');
  assert.equal(result.fields.username, 'Already taken');
});

test('handles TRANSLATION_MISSING with full metadata contract', async () => {
  // This matches the normative API example from the TDD
  const response = mockResponse({
    error: {
      text_code: 'TRANSLATION_MISSING',
      message: 'Cannot publish: missing required translations',
      metadata: {
        missing_locales: ['es', 'fr'],
        missing_fields_by_locale: {
          es: ['summary'],
          fr: ['title', 'path'],
        },
        transition: 'publish',
        entity_type: 'pages',
        requested_locale: 'en',
        environment: 'production',
      },
      validation_errors: null,
    },
  });

  const structured = await extractStructuredError(response);
  const blocker = extractTranslationBlocker(structured);

  assert.equal(structured.textCode, 'TRANSLATION_MISSING');
  assert.ok(blocker);
  assert.deepEqual(blocker.missingLocales, ['es', 'fr']);
  assert.deepEqual(blocker.missingFieldsByLocale?.es, ['summary']);
  assert.deepEqual(blocker.missingFieldsByLocale?.fr, ['title', 'path']);
  assert.equal(blocker.transition, 'publish');
  assert.equal(blocker.entityType, 'pages');
  assert.equal(blocker.requestedLocale, 'en');
  assert.equal(blocker.environment, 'production');
});

test('handles create_translation success response format', () => {
  // This matches the normative API example from the TDD
  const result = parseActionResponse({
    status: 'ok',
    data: {
      id: 'page_789',
      locale: 'es',
      status: 'draft',
      translation_group_id: 'tg_123',
    },
  });

  assert.equal(result.success, true);
  assert.ok(result.data);
  assert.equal(result.data.id, 'page_789');
  assert.equal(result.data.locale, 'es');
  assert.equal(result.data.status, 'draft');
  assert.equal(result.data.translation_group_id, 'tg_123');
});

// =============================================================================
// Task 9.3: Additional Frontend Unit Tests - Edge Cases
// =============================================================================

test('extractStructuredError handles deeply nested metadata fields', async () => {
  const response = mockResponse({
    error: {
      text_code: 'COMPLEX_ERROR',
      message: 'Complex error with nested data',
      metadata: {
        context: { operation: 'publish', target: 'pages' },
        nested: { deep: { value: 'test' } },
      },
    },
  });

  const result = await extractStructuredError(response);

  assert.equal(result.textCode, 'COMPLEX_ERROR');
  assert.ok(result.metadata);
  assert.equal(result.metadata.context.operation, 'publish');
  assert.equal(result.metadata.nested.deep.value, 'test');
});

test('extractStructuredError handles empty validation_errors array', async () => {
  const response = mockResponse({
    error: {
      text_code: 'VALIDATION_FAILED',
      message: 'Validation failed',
      validation_errors: [],
    },
  });

  const result = await extractStructuredError(response);

  assert.equal(result.textCode, 'VALIDATION_FAILED');
  assert.equal(result.fields, null);
  assert.equal(result.validationErrors, null);
});

test('extractTranslationBlocker handles empty missing_locales array', () => {
  const error = {
    textCode: 'TRANSLATION_MISSING',
    message: 'Missing translations',
    metadata: {
      missing_locales: [],
      transition: 'publish',
    },
    fields: null,
    validationErrors: null,
  };

  const result = extractTranslationBlocker(error);

  assert.ok(result);
  assert.deepEqual(result.missingLocales, []);
  assert.equal(result.transition, 'publish');
});

test('extractTranslationBlocker filters non-string locales', () => {
  const error = {
    textCode: 'TRANSLATION_MISSING',
    message: 'Missing translations',
    metadata: {
      missing_locales: ['es', 123, null, 'fr', undefined, 'de'],
    },
    fields: null,
    validationErrors: null,
  };

  const result = extractTranslationBlocker(error);

  assert.ok(result);
  assert.deepEqual(result.missingLocales, ['es', 'fr', 'de']);
});

test('extractTranslationBlocker filters non-string missing fields', () => {
  const error = {
    textCode: 'TRANSLATION_MISSING',
    message: 'Missing translations',
    metadata: {
      missing_locales: ['es'],
      missing_fields_by_locale: {
        es: ['title', 123, null, 'path'],
        fr: [true, 'summary'],
      },
    },
    fields: null,
    validationErrors: null,
  };

  const result = extractTranslationBlocker(error);

  assert.ok(result);
  assert.ok(result.missingFieldsByLocale);
  assert.deepEqual(result.missingFieldsByLocale.es, ['title', 'path']);
  assert.deepEqual(result.missingFieldsByLocale.fr, ['summary']);
});

test('parseActionResponse handles action with status:ok but without data', () => {
  const result = parseActionResponse({ status: 'ok' });

  assert.equal(result.success, true);
  assert.equal(result.data, undefined);
  assert.equal(result.error, undefined);
});

test('parseActionResponse handles unknown response structure with message field', () => {
  const result = parseActionResponse({ message: 'Custom message format' });

  assert.equal(result.success, false);
  assert.ok(result.error);
  assert.equal(result.error.message, 'Custom message format');
});

// =============================================================================
// Task 9.5: Regression Tests - Non-Translation Actions
// =============================================================================

test('non-translation action errors do not trigger translation blocker', async () => {
  const response = mockResponse({
    error: {
      text_code: 'PERMISSION_DENIED',
      message: 'You do not have permission to delete this item',
    },
  });

  const structured = await extractStructuredError(response);
  const blocker = extractTranslationBlocker(structured);

  assert.equal(structured.textCode, 'PERMISSION_DENIED');
  assert.equal(blocker, null);
});

test('generic validation errors are not classified as translation blockers', () => {
  const error = {
    textCode: 'VALIDATION_FAILED',
    message: 'Validation failed',
    metadata: {
      missing_locales: ['es'], // Has missing_locales but wrong text_code
    },
    fields: { title: 'Title is required' },
    validationErrors: [{ field: 'title', message: 'Title is required' }],
  };

  const blocker = extractTranslationBlocker(error);

  assert.equal(blocker, null);
});

test('isTranslationBlocker returns false for null textCode', () => {
  const error = {
    textCode: null,
    message: 'Some error',
    metadata: { missing_locales: ['es'] },
    fields: null,
    validationErrors: null,
  };

  assert.equal(isTranslationBlocker(error), false);
});

// =============================================================================
// Task 9.8: Frontend Transport Tests - Action POST Mapping
// =============================================================================

test('parseActionResponse correctly identifies status-only success envelope', () => {
  // Matches contract: {"status":"ok"}
  const result = parseActionResponse({ status: 'ok' });

  assert.equal(result.success, true);
  assert.equal(result.data, undefined);
  assert.equal(result.error, undefined);
});

test('parseActionResponse correctly parses status+data success envelope', () => {
  // Matches contract: {"status":"ok","data":{...}}
  const result = parseActionResponse({
    status: 'ok',
    data: {
      id: 'new_record_456',
      locale: 'fr',
      status: 'draft',
      translation_group_id: 'tg_789',
    },
  });

  assert.equal(result.success, true);
  assert.ok(result.data);
  assert.equal(result.data.id, 'new_record_456');
  assert.equal(result.data.locale, 'fr');
  assert.equal(result.data.translation_group_id, 'tg_789');
});

test('parseActionResponse preserves all data fields from server', () => {
  const serverData = {
    id: 'record_123',
    locale: 'es',
    status: 'draft',
    translation_group_id: 'tg_abc',
    created_at: '2024-01-15T10:30:00Z',
    custom_field: 'custom_value',
  };

  const result = parseActionResponse({
    status: 'ok',
    data: serverData,
  });

  assert.equal(result.success, true);
  assert.ok(result.data);
  assert.equal(result.data.id, 'record_123');
  assert.equal(result.data.created_at, '2024-01-15T10:30:00Z');
  assert.equal(result.data.custom_field, 'custom_value');
});

test('parseActionResponse correctly parses typed error envelope', () => {
  // Matches contract: {"error":{"text_code":"...","message":"...","metadata":{...}}}
  const result = parseActionResponse({
    error: {
      text_code: 'TRANSLATION_MISSING',
      message: 'Cannot publish: missing required translations',
      metadata: {
        missing_locales: ['es', 'fr'],
        transition: 'publish',
        entity_type: 'pages',
        environment: 'production',
      },
    },
  });

  assert.equal(result.success, false);
  assert.ok(result.error);
  assert.equal(result.error.textCode, 'TRANSLATION_MISSING');
  assert.equal(result.error.message, 'Cannot publish: missing required translations');
  assert.ok(result.error.metadata);
  assert.deepEqual(result.error.metadata.missing_locales, ['es', 'fr']);
  assert.equal(result.error.metadata.transition, 'publish');
  assert.equal(result.error.metadata.entity_type, 'pages');
  assert.equal(result.error.metadata.environment, 'production');
});

test('parseActionResponse error includes validation_errors when present', () => {
  const result = parseActionResponse({
    error: {
      text_code: 'VALIDATION_FAILED',
      message: 'Validation failed',
      validation_errors: [
        { field: 'locale', message: 'Locale is required' },
        { field: 'title', message: 'Title cannot be empty' },
      ],
    },
  });

  assert.equal(result.success, false);
  assert.ok(result.error);
  assert.ok(result.error.fields);
  assert.equal(result.error.fields.locale, 'Locale is required');
  assert.equal(result.error.fields.title, 'Title cannot be empty');
  assert.ok(result.error.validationErrors);
  assert.equal(result.error.validationErrors.length, 2);
});

// =============================================================================
// Task 9.6: Contract Tests - Status Code and Metadata Key Matrix
// =============================================================================

test('TRANSLATION_MISSING error contract: all required metadata keys present', async () => {
  // This is the normative API example from CONTENT_TRANSLATION_TDD.md
  const response = mockResponse({
    error: {
      text_code: 'TRANSLATION_MISSING',
      message: 'Cannot publish: missing required translations',
      metadata: {
        missing_locales: ['es', 'fr'],
        missing_fields_by_locale: {
          es: ['summary'],
          fr: ['title', 'path'],
        },
        transition: 'publish',
        entity_type: 'pages',
        requested_locale: 'en',
        environment: 'production',
      },
      validation_errors: null,
    },
  }, { status: 409 });

  const structured = await extractStructuredError(response);
  const blocker = extractTranslationBlocker(structured);

  // Verify contract compliance
  assert.equal(structured.textCode, 'TRANSLATION_MISSING');
  assert.ok(blocker);

  // Required metadata keys
  assert.ok(Array.isArray(blocker.missingLocales));
  assert.deepEqual(blocker.missingLocales, ['es', 'fr']);

  // Optional but standard metadata keys
  assert.ok(blocker.missingFieldsByLocale);
  assert.deepEqual(blocker.missingFieldsByLocale.es, ['summary']);
  assert.deepEqual(blocker.missingFieldsByLocale.fr, ['title', 'path']);

  assert.equal(blocker.transition, 'publish');
  assert.equal(blocker.entityType, 'pages');
  assert.equal(blocker.requestedLocale, 'en');
  assert.equal(blocker.environment, 'production');
});

test('TRANSLATION_MISSING error contract: minimal metadata (locale blockers only)', async () => {
  // Minimal contract - only missing_locales required
  const response = mockResponse({
    error: {
      text_code: 'TRANSLATION_MISSING',
      message: 'Cannot publish: missing required translations',
      metadata: {
        missing_locales: ['es'],
      },
    },
  }, { status: 409 });

  const structured = await extractStructuredError(response);
  const blocker = extractTranslationBlocker(structured);

  assert.equal(structured.textCode, 'TRANSLATION_MISSING');
  assert.ok(blocker);
  assert.deepEqual(blocker.missingLocales, ['es']);
  assert.equal(blocker.missingFieldsByLocale, null);
  assert.equal(blocker.transition, null);
});

test('create_translation success response contract', () => {
  // Normative response from CONTENT_TRANSLATION_TDD.md
  const result = parseActionResponse({
    status: 'ok',
    data: {
      id: 'page_789',
      locale: 'es',
      status: 'draft',
      translation_group_id: 'tg_123',
    },
  });

  assert.equal(result.success, true);
  assert.ok(result.data);

  // Required fields in create_translation response
  assert.equal(typeof result.data.id, 'string');
  assert.equal(typeof result.data.locale, 'string');
  assert.equal(typeof result.data.status, 'string');
  assert.equal(result.data.id, 'page_789');
  assert.equal(result.data.locale, 'es');
  assert.equal(result.data.status, 'draft');
  assert.equal(result.data.translation_group_id, 'tg_123');
});

// =============================================================================
// Task 9.7: V1 Default Tests - Modal-first UX, Schema-first Actions
// =============================================================================

test('TRANSLATION_MISSING is identifiable for modal-first UX', () => {
  // V1 default: modal-first UX requires programmatic identification
  const error = {
    textCode: 'TRANSLATION_MISSING',
    message: 'Cannot publish',
    metadata: { missing_locales: ['es'] },
    fields: null,
    validationErrors: null,
  };

  // isTranslationBlocker enables modal-first routing
  assert.equal(isTranslationBlocker(error), true);

  // extractTranslationBlocker provides modal content
  const blocker = extractTranslationBlocker(error);
  assert.ok(blocker);
  assert.ok(blocker.missingLocales);
});

test('non-TRANSLATION_MISSING errors fall through to generic handling', () => {
  // V1 default: non-translation errors use generic toast/modal
  const errors = [
    { textCode: 'PERMISSION_DENIED', message: 'Access denied', metadata: null, fields: null, validationErrors: null },
    { textCode: 'NOT_FOUND', message: 'Record not found', metadata: null, fields: null, validationErrors: null },
    { textCode: 'VALIDATION_FAILED', message: 'Invalid data', metadata: null, fields: null, validationErrors: null },
    { textCode: null, message: 'Unknown error', metadata: null, fields: null, validationErrors: null },
  ];

  for (const error of errors) {
    assert.equal(isTranslationBlocker(error), false);
    assert.equal(extractTranslationBlocker(error), null);
  }
});

// =============================================================================
// Phase 15: Translation Exchange Types and Helpers Tests
// =============================================================================

// Import exchange-specific helpers
const {
  isExchangeError,
  extractExchangeError,
  parseImportResult,
  groupRowResultsByStatus,
  generateExchangeReport,
} = await import('../dist/toast/error-helpers.js');

test('isExchangeError identifies IMPORT_VALIDATION_FAILED as exchange error', () => {
  const error = {
    textCode: 'IMPORT_VALIDATION_FAILED',
    message: 'Import validation failed',
    metadata: null,
    fields: null,
    validationErrors: null,
  };

  assert.equal(isExchangeError(error), true);
});

test('isExchangeError identifies IMPORT_CONFLICT as exchange error', () => {
  const error = {
    textCode: 'IMPORT_CONFLICT',
    message: 'Stale source content',
    metadata: null,
    fields: null,
    validationErrors: null,
  };

  assert.equal(isExchangeError(error), true);
});

test('isExchangeError identifies all exchange error codes', () => {
  const exchangeCodes = [
    'IMPORT_VALIDATION_FAILED',
    'IMPORT_CONFLICT',
    'IMPORT_LINKAGE_ERROR',
    'IMPORT_UNSUPPORTED_FORMAT',
    'IMPORT_STALE_SOURCE',
    'EXPORT_FAILED',
    'EXCHANGE_PERMISSION_DENIED',
  ];

  for (const code of exchangeCodes) {
    const error = {
      textCode: code,
      message: `Error: ${code}`,
      metadata: null,
      fields: null,
      validationErrors: null,
    };
    assert.equal(isExchangeError(error), true, `${code} should be identified as exchange error`);
  }
});

test('isExchangeError returns false for non-exchange errors', () => {
  const nonExchangeCodes = [
    'TRANSLATION_MISSING',
    'VALIDATION_FAILED',
    'PERMISSION_DENIED',
    'NOT_FOUND',
    null,
  ];

  for (const code of nonExchangeCodes) {
    const error = {
      textCode: code,
      message: 'Some error',
      metadata: null,
      fields: null,
      validationErrors: null,
    };
    assert.equal(isExchangeError(error), false, `${code} should not be identified as exchange error`);
  }
});

test('extractExchangeError extracts exchange error info', () => {
  const error = {
    textCode: 'IMPORT_VALIDATION_FAILED',
    message: 'Import validation failed: 3 rows with errors',
    metadata: {
      resource: 'pages',
      import_result: {
        summary: { processed: 10, succeeded: 7, failed: 3, conflicts: 0, skipped: 0 },
        results: [],
      },
    },
    fields: null,
    validationErrors: null,
  };

  const result = extractExchangeError(error);

  assert.ok(result);
  assert.equal(result.code, 'IMPORT_VALIDATION_FAILED');
  assert.equal(result.message, 'Import validation failed: 3 rows with errors');
  assert.equal(result.resource, 'pages');
  assert.ok(result.importResult);
  assert.equal(result.importResult.summary.processed, 10);
  assert.equal(result.importResult.summary.succeeded, 7);
  assert.equal(result.importResult.summary.failed, 3);
});

test('extractExchangeError returns null for non-exchange errors', () => {
  const error = {
    textCode: 'TRANSLATION_MISSING',
    message: 'Missing translations',
    metadata: { missing_locales: ['es'] },
    fields: null,
    validationErrors: null,
  };

  const result = extractExchangeError(error);

  assert.equal(result, null);
});

test('parseImportResult parses full import result', () => {
  const raw = {
    summary: {
      processed: 100,
      succeeded: 85,
      failed: 10,
      conflicts: 5,
      skipped: 0,
    },
    results: [
      {
        index: 0,
        resource: 'pages',
        entity_id: 'page_123',
        translation_group_id: 'tg_456',
        target_locale: 'es',
        field_path: 'title',
        status: 'success',
      },
      {
        index: 1,
        resource: 'pages',
        entity_id: 'page_124',
        translation_group_id: 'tg_457',
        target_locale: 'fr',
        field_path: 'summary',
        status: 'error',
        error: 'Field path not found',
      },
      {
        index: 2,
        resource: 'posts',
        entity_id: 'post_789',
        translation_group_id: 'tg_890',
        target_locale: 'de',
        field_path: 'body',
        status: 'conflict',
        conflict: {
          type: 'stale_source',
          expected_hash: 'abc123',
          actual_hash: 'def456',
          details: 'Source content has changed since export',
        },
      },
    ],
    truncated: false,
  };

  const result = parseImportResult(raw);

  assert.equal(result.summary.processed, 100);
  assert.equal(result.summary.succeeded, 85);
  assert.equal(result.summary.failed, 10);
  assert.equal(result.summary.conflicts, 5);
  assert.equal(result.results.length, 3);
  assert.equal(result.truncated, false);

  // Check first result (success)
  assert.equal(result.results[0].index, 0);
  assert.equal(result.results[0].resource, 'pages');
  assert.equal(result.results[0].status, 'success');

  // Check second result (error)
  assert.equal(result.results[1].status, 'error');
  assert.equal(result.results[1].error, 'Field path not found');

  // Check third result (conflict)
  assert.equal(result.results[2].status, 'conflict');
  assert.ok(result.results[2].conflict);
  assert.equal(result.results[2].conflict.type, 'stale_source');
  assert.equal(result.results[2].conflict.expectedHash, 'abc123');
  assert.equal(result.results[2].conflict.actualHash, 'def456');
});

test('parseImportResult handles truncated results', () => {
  const raw = {
    summary: { processed: 1000, succeeded: 900, failed: 100, conflicts: 0, skipped: 0 },
    results: [], // Truncated - only summary returned for large imports
    truncated: true,
    total_rows: 1000,
  };

  const result = parseImportResult(raw);

  assert.equal(result.truncated, true);
  assert.equal(result.totalRows, 1000);
  assert.equal(result.results.length, 0);
});

test('parseImportResult handles empty/missing fields gracefully', () => {
  const raw = {};

  const result = parseImportResult(raw);

  assert.equal(result.summary.processed, 0);
  assert.equal(result.summary.succeeded, 0);
  assert.equal(result.summary.failed, 0);
  assert.equal(result.results.length, 0);
  assert.equal(result.truncated, false);
});

test('groupRowResultsByStatus groups results correctly', () => {
  const results = [
    { index: 0, resource: 'pages', entityId: 'p1', translationGroupId: 'tg1', targetLocale: 'es', fieldPath: 'title', status: 'success' },
    { index: 1, resource: 'pages', entityId: 'p2', translationGroupId: 'tg2', targetLocale: 'fr', fieldPath: 'title', status: 'error', error: 'Failed' },
    { index: 2, resource: 'pages', entityId: 'p3', translationGroupId: 'tg3', targetLocale: 'de', fieldPath: 'title', status: 'success' },
    { index: 3, resource: 'posts', entityId: 'po1', translationGroupId: 'tg4', targetLocale: 'es', fieldPath: 'body', status: 'conflict' },
    { index: 4, resource: 'posts', entityId: 'po2', translationGroupId: 'tg5', targetLocale: 'fr', fieldPath: 'body', status: 'skipped' },
  ];

  const grouped = groupRowResultsByStatus(results);

  assert.equal(grouped.success.length, 2);
  assert.equal(grouped.error.length, 1);
  assert.equal(grouped.conflict.length, 1);
  assert.equal(grouped.skipped.length, 1);

  assert.equal(grouped.success[0].entityId, 'p1');
  assert.equal(grouped.success[1].entityId, 'p3');
  assert.equal(grouped.error[0].entityId, 'p2');
  assert.equal(grouped.conflict[0].entityId, 'po1');
  assert.equal(grouped.skipped[0].entityId, 'po2');
});

test('generateExchangeReport creates JSON blob', () => {
  const result = {
    summary: { processed: 10, succeeded: 8, failed: 2, conflicts: 0, skipped: 0 },
    results: [
      { index: 0, resource: 'pages', entityId: 'p1', translationGroupId: 'tg1', targetLocale: 'es', fieldPath: 'title', status: 'success' },
    ],
    truncated: false,
  };

  const blob = generateExchangeReport(result, 'json');

  assert.ok(blob instanceof Blob);
  assert.equal(blob.type, 'application/json');
});

test('generateExchangeReport creates CSV blob', () => {
  const result = {
    summary: { processed: 2, succeeded: 1, failed: 1, conflicts: 0, skipped: 0 },
    results: [
      { index: 0, resource: 'pages', entityId: 'p1', translationGroupId: 'tg1', targetLocale: 'es', fieldPath: 'title', status: 'success' },
      { index: 1, resource: 'pages', entityId: 'p2', translationGroupId: 'tg2', targetLocale: 'fr', fieldPath: 'title', status: 'error', error: 'Field not found' },
    ],
    truncated: false,
  };

  const blob = generateExchangeReport(result, 'csv');

  assert.ok(blob instanceof Blob);
  assert.equal(blob.type, 'text/csv');
});

test('exchange error extraction preserves metadata', () => {
  const error = {
    textCode: 'IMPORT_LINKAGE_ERROR',
    message: 'Invalid linkage',
    metadata: {
      resource: 'posts',
      entity_id: 'post_123',
      translation_group_id: 'tg_456',
      custom_field: 'custom_value',
    },
    fields: null,
    validationErrors: null,
  };

  const result = extractExchangeError(error);

  assert.ok(result);
  assert.equal(result.code, 'IMPORT_LINKAGE_ERROR');
  assert.equal(result.resource, 'posts');
  assert.ok(result.metadata);
  assert.equal(result.metadata.entity_id, 'post_123');
  assert.equal(result.metadata.custom_field, 'custom_value');
});
