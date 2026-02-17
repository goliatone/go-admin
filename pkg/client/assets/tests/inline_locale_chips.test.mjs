import test from 'node:test';
import assert from 'node:assert/strict';

// Import inline locale chips exports from datatable index
const {
  InlineLocaleChips,
  renderInlineLocaleChips,
  shouldShowInlineLocaleChips,
  createInlineLocaleChipsRenderer,
} = await import('../dist/datatable/index.js');

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockRecord(overrides = {}) {
  return {
    id: 'page_123',
    translation_readiness: {
      translation_group_id: 'group_abc',
      required_locales: ['en', 'es', 'fr', 'de'],
      available_locales: ['en'],
      missing_required_locales: ['es', 'fr', 'de'],
      readiness_state: 'missing_locales',
      ready_for_transition: { publish: false },
    },
    ...overrides,
  };
}

function createMockConfig() {
  return {
    recordId: 'page_123',
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
    panelName: 'pages',
  };
}

// =============================================================================
// shouldShowInlineLocaleChips Tests
// =============================================================================

test('shouldShowInlineLocaleChips returns true when missing locales exist', () => {
  const record = createMockRecord();
  assert.equal(shouldShowInlineLocaleChips(record), true);
});

test('shouldShowInlineLocaleChips returns false when no missing locales', () => {
  const record = createMockRecord({
    translation_readiness: {
      translation_group_id: 'group_abc',
      required_locales: ['en'],
      available_locales: ['en'],
      missing_required_locales: [],
      readiness_state: 'ready',
      ready_for_transition: { publish: true },
    },
  });
  assert.equal(shouldShowInlineLocaleChips(record), false);
});

test('shouldShowInlineLocaleChips returns false when no readiness metadata', () => {
  const record = { id: 'page_123' };
  assert.equal(shouldShowInlineLocaleChips(record), false);
});

// =============================================================================
// InlineLocaleChips Constructor Tests
// =============================================================================

test('InlineLocaleChips accepts record and config', () => {
  const record = createMockRecord();
  const config = createMockConfig();
  const component = new InlineLocaleChips(record, config);
  assert.ok(component);
});

test('InlineLocaleChips.getMissingLocales returns missing locales', () => {
  const record = createMockRecord();
  const config = createMockConfig();
  const component = new InlineLocaleChips(record, config);

  const missing = component.getMissingLocales();
  assert.deepEqual(missing, ['es', 'fr', 'de']);
});

test('InlineLocaleChips.getMissingLocales respects maxChips limit', () => {
  const record = createMockRecord();
  const config = { ...createMockConfig(), maxChips: 2 };
  const component = new InlineLocaleChips(record, config);

  const missing = component.getMissingLocales();
  assert.deepEqual(missing, ['es', 'fr']);
});

test('InlineLocaleChips.getOverflowCount returns correct count', () => {
  const record = createMockRecord();
  const config = { ...createMockConfig(), maxChips: 2 };
  const component = new InlineLocaleChips(record, config);

  assert.equal(component.getOverflowCount(), 1);
});

test('InlineLocaleChips.getOverflowCount returns 0 when all fit', () => {
  const record = createMockRecord();
  const config = { ...createMockConfig(), maxChips: 5 };
  const component = new InlineLocaleChips(record, config);

  assert.equal(component.getOverflowCount(), 0);
});

// =============================================================================
// InlineLocaleChips Action State Tests
// =============================================================================

test('InlineLocaleChips.isCreateActionEnabled returns true when no action state', () => {
  const record = createMockRecord();
  const config = createMockConfig();
  const component = new InlineLocaleChips(record, config);

  assert.equal(component.isCreateActionEnabled(), true);
});

test('InlineLocaleChips.isCreateActionEnabled returns true when enabled is true', () => {
  const record = createMockRecord({
    _action_state: {
      create_translation: { enabled: true },
    },
  });
  const config = createMockConfig();
  const component = new InlineLocaleChips(record, config);

  assert.equal(component.isCreateActionEnabled(), true);
});

test('InlineLocaleChips.isCreateActionEnabled returns false when enabled is false', () => {
  const record = createMockRecord({
    _action_state: {
      create_translation: { enabled: false, reason: 'Test reason' },
    },
  });
  const config = createMockConfig();
  const component = new InlineLocaleChips(record, config);

  assert.equal(component.isCreateActionEnabled(), false);
});

test('InlineLocaleChips.getDisabledReason returns null when enabled', () => {
  const record = createMockRecord();
  const config = createMockConfig();
  const component = new InlineLocaleChips(record, config);

  assert.equal(component.getDisabledReason(), null);
});

test('InlineLocaleChips.getDisabledReason returns custom reason when provided', () => {
  const record = createMockRecord({
    _action_state: {
      create_translation: { enabled: false, reason: 'Custom disabled reason' },
    },
  });
  const config = createMockConfig();
  const component = new InlineLocaleChips(record, config);

  assert.equal(component.getDisabledReason(), 'Custom disabled reason');
});

test('InlineLocaleChips.getDisabledReason maps reason_code to message', () => {
  const record = createMockRecord({
    _action_state: {
      create_translation: { enabled: false, reason_code: 'permission_denied' },
    },
  });
  const config = createMockConfig();
  const component = new InlineLocaleChips(record, config);

  assert.match(component.getDisabledReason(), /permission/i);
});

// =============================================================================
// InlineLocaleChips Render Tests
// =============================================================================

test('InlineLocaleChips.render returns empty string when no missing locales', () => {
  const record = createMockRecord({
    translation_readiness: {
      translation_group_id: 'group_abc',
      required_locales: ['en'],
      available_locales: ['en'],
      missing_required_locales: [],
      readiness_state: 'ready',
    },
  });
  const config = createMockConfig();
  const component = new InlineLocaleChips(record, config);

  assert.equal(component.render(), '');
});

test('InlineLocaleChips.render includes container with data attributes', () => {
  const record = createMockRecord();
  const config = createMockConfig();
  const component = new InlineLocaleChips(record, config);

  const html = component.render();

  assert.match(html, /data-inline-locale-chips="true"/);
  assert.match(html, /data-record-id="page_123"/);
});

test('InlineLocaleChips.render includes locale chips', () => {
  const record = createMockRecord();
  const config = createMockConfig();
  const component = new InlineLocaleChips(record, config);

  const html = component.render();

  assert.match(html, /data-locale-action="es"/);
  assert.match(html, /data-locale-action="fr"/);
  assert.match(html, /data-locale-action="de"/);
});

test('InlineLocaleChips.render includes overflow indicator when needed', () => {
  const record = createMockRecord();
  const config = { ...createMockConfig(), maxChips: 2 };
  const component = new InlineLocaleChips(record, config);

  const html = component.render();

  assert.match(html, /\+1/);
});

test('InlineLocaleChips.render shows disabled chips when action disabled', () => {
  const record = createMockRecord({
    _action_state: {
      create_translation: { enabled: false, reason: 'Test disabled' },
    },
  });
  const config = createMockConfig();
  const component = new InlineLocaleChips(record, config);

  const html = component.render();

  assert.match(html, /data-disabled="true"/);
  assert.match(html, /cursor-not-allowed/);
});

test('InlineLocaleChips.render uses opacity class when disabled', () => {
  const record = createMockRecord({
    _action_state: {
      create_translation: { enabled: false },
    },
  });
  const config = createMockConfig();
  const component = new InlineLocaleChips(record, config);

  const html = component.render();

  assert.match(html, /opacity-60/);
});

// =============================================================================
// InlineLocaleChips Accessibility Tests
// =============================================================================

test('InlineLocaleChips includes role="list" for accessibility', () => {
  const record = createMockRecord();
  const config = createMockConfig();
  const component = new InlineLocaleChips(record, config);

  const html = component.render();

  assert.match(html, /role="list"/);
});

test('InlineLocaleChips includes aria-label for container', () => {
  const record = createMockRecord();
  const config = createMockConfig();
  const component = new InlineLocaleChips(record, config);

  const html = component.render();

  assert.match(html, /aria-label="Missing translations"/);
});

test('InlineLocaleChips disabled chips include aria-label with unavailable', () => {
  const record = createMockRecord({
    _action_state: {
      create_translation: { enabled: false },
    },
  });
  const config = createMockConfig();
  const component = new InlineLocaleChips(record, config);

  const html = component.render();

  assert.match(html, /aria-label="Spanish translation \(unavailable\)"/);
});

// =============================================================================
// renderInlineLocaleChips Tests
// =============================================================================

test('renderInlineLocaleChips renders chips from record', () => {
  const record = createMockRecord();

  const html = renderInlineLocaleChips(record, {
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  });

  assert.match(html, /data-inline-locale-chips="true"/);
  assert.match(html, /data-locale-action="es"/);
});

test('renderInlineLocaleChips returns empty string when no ID', () => {
  const record = createMockRecord();
  delete record.id;

  const html = renderInlineLocaleChips(record, {
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  });

  assert.equal(html, '');
});

// =============================================================================
// createInlineLocaleChipsRenderer Tests
// =============================================================================

test('createInlineLocaleChipsRenderer returns a function', () => {
  const renderer = createInlineLocaleChipsRenderer({
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  });

  assert.equal(typeof renderer, 'function');
});

test('createInlineLocaleChipsRenderer function renders chips', () => {
  const renderer = createInlineLocaleChipsRenderer({
    apiEndpoint: '/admin/api/pages',
    navigationBasePath: '/admin/content/pages',
  });

  const record = createMockRecord();
  const html = renderer(null, record, 'translation_status');

  assert.match(html, /data-inline-locale-chips="true"/);
});

// =============================================================================
// Size Variant Tests
// =============================================================================

test('InlineLocaleChips uses sm size by default', () => {
  const record = createMockRecord();
  const config = createMockConfig();
  const component = new InlineLocaleChips(record, config);

  const html = component.render();

  assert.match(html, /text-xs/);
});

test('InlineLocaleChips uses md size when configured', () => {
  const record = createMockRecord();
  const config = { ...createMockConfig(), size: 'md' };
  const component = new InlineLocaleChips(record, config);

  const html = component.render();

  assert.match(html, /text-sm/);
});

// =============================================================================
// Multiple Content Types Tests
// =============================================================================

test('InlineLocaleChips works with pages content type', () => {
  const record = createMockRecord();
  const config = { ...createMockConfig(), panelName: 'pages' };
  const component = new InlineLocaleChips(record, config);

  assert.ok(component.render());
});

test('InlineLocaleChips works with posts content type', () => {
  const record = createMockRecord({ id: 'post_456' });
  const config = {
    ...createMockConfig(),
    recordId: 'post_456',
    apiEndpoint: '/admin/api/posts',
    navigationBasePath: '/admin/content/posts',
    panelName: 'posts',
  };
  const component = new InlineLocaleChips(record, config);

  assert.ok(component.render());
});

// =============================================================================
// Action State Edge Cases Tests
// =============================================================================

test('InlineLocaleChips handles missing _action_state gracefully', () => {
  const record = createMockRecord();
  // No _action_state field
  const config = createMockConfig();
  const component = new InlineLocaleChips(record, config);

  assert.equal(component.isCreateActionEnabled(), true);
});

test('InlineLocaleChips handles malformed _action_state gracefully', () => {
  const record = createMockRecord({
    _action_state: 'invalid', // Not an object
  });
  const config = createMockConfig();
  const component = new InlineLocaleChips(record, config);

  assert.equal(component.isCreateActionEnabled(), true);
});

test('InlineLocaleChips handles _action_state without create_translation', () => {
  const record = createMockRecord({
    _action_state: {
      publish: { enabled: false },
    },
  });
  const config = createMockConfig();
  const component = new InlineLocaleChips(record, config);

  assert.equal(component.isCreateActionEnabled(), true);
});

// =============================================================================
// Overflow Tooltip Tests
// =============================================================================

test('InlineLocaleChips overflow includes all missing locales in title', () => {
  const record = createMockRecord();
  const config = { ...createMockConfig(), maxChips: 1 };
  const component = new InlineLocaleChips(record, config);

  const html = component.render();

  // Title should list all missing locales
  assert.match(html, /ES, FR, DE/);
});
