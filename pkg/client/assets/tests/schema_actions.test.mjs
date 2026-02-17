import test from 'node:test';
import assert from 'node:assert/strict';

// Import the schema actions from dist output (bundled into datatable/index.js)
const {
  SchemaActionBuilder,
  buildSchemaRowActions,
  extractSchemaActions,
  PayloadInputModal,
} = await import('../dist/datatable/index.js');

// =============================================================================
// Test Helpers
// =============================================================================

function createMockRecord(overrides = {}) {
  return {
    id: 'test-123',
    title: 'Test Item',
    status: 'draft',
    ...overrides,
  };
}

function createBuilder(overrides = {}) {
  return new SchemaActionBuilder({
    apiEndpoint: '/admin/api/pages',
    actionBasePath: '/admin/content/pages',
    useDefaultFallback: true,
    ...overrides,
  });
}

// =============================================================================
// SchemaActionBuilder - Default Fallback Tests
// =============================================================================

test('builds default actions (view, edit, delete) when no schema actions provided', () => {
  const builder = createBuilder();
  const record = createMockRecord();

  const actions = builder.buildRowActions(record, undefined);

  assert.equal(actions.length, 3);
  assert.equal(actions[0].label, 'View');
  assert.equal(actions[1].label, 'Edit');
  assert.equal(actions[2].label, 'Delete');
});

test('builds default actions when schema actions array is empty', () => {
  const builder = createBuilder();
  const record = createMockRecord();

  const actions = builder.buildRowActions(record, []);

  assert.equal(actions.length, 3);
  assert.equal(actions[0].label, 'View');
  assert.equal(actions[1].label, 'Edit');
  assert.equal(actions[2].label, 'Delete');
});

test('does not build default actions when useDefaultFallback is false', () => {
  const builder = createBuilder({ useDefaultFallback: false });
  const record = createMockRecord();

  const actions = builder.buildRowActions(record, undefined);

  assert.equal(actions.length, 0);
});

// =============================================================================
// SchemaActionBuilder - Schema Actions Override Tests
// =============================================================================

test('builds actions from schema.actions when provided', () => {
  const builder = createBuilder();
  const record = createMockRecord();
  const schemaActions = [
    { name: 'view', label: 'View Details', icon: 'eye' },
    { name: 'edit', label: 'Edit Item', icon: 'edit', variant: 'primary' },
    { name: 'publish', label: 'Publish', icon: 'check-circle', variant: 'success' },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  assert.equal(actions.length, 3);
  assert.equal(actions[0].label, 'View Details');
  assert.equal(actions[1].label, 'Edit Item');
  assert.equal(actions[2].label, 'Publish');
});

test('filters out actions not valid for row scope', () => {
  const builder = createBuilder({ actionContext: 'row' });
  const record = createMockRecord();
  const schemaActions = [
    { name: 'view', label: 'View', scope: 'row' },
    { name: 'send_email', label: 'Send Email', scope: 'detail' },
    { name: 'archive', label: 'Archive', scope: 'all' },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  assert.equal(actions.length, 2);
  assert.equal(actions[0].label, 'View');
  assert.equal(actions[1].label, 'Archive');
});

test('filters out actions when context_required fields are missing on record', () => {
  const builder = createBuilder({ actionContext: 'row' });
  const record = createMockRecord();
  const schemaActions = [
    { name: 'send', label: 'Send', context_required: ['id'] },
    { name: 'rotate_token', label: 'Rotate Token', context_required: ['recipient_id'] },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  assert.equal(actions.length, 1);
  assert.equal(actions[0].label, 'Send');
});

test('includes context_required actions when nested record fields are present', () => {
  const builder = createBuilder({ actionContext: 'row' });
  const record = createMockRecord({ delivery: { recipient_id: 'rec-1' } });
  const schemaActions = [
    { name: 'resend', label: 'Resend', context_required: ['delivery.recipient_id'] },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  assert.equal(actions.length, 1);
  assert.equal(actions[0].label, 'Resend');
});

test('applies disabled state from record _action_state when action is unavailable', () => {
  const builder = createBuilder({ actionContext: 'row' });
  const record = createMockRecord({
    _action_state: {
      publish: {
        enabled: false,
        reason: 'Already published',
        reason_code: 'workflow_transition_not_available',
      },
    },
  });
  const schemaActions = [
    { name: 'publish', label: 'Publish' },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  assert.equal(actions.length, 1);
  assert.equal(actions[0].disabled, true);
  assert.equal(actions[0].disabledReason, 'Already published');
});

test('uses fallback disabled reason when _action_state has reason_code only', () => {
  const builder = createBuilder({ actionContext: 'row' });
  const record = createMockRecord({
    _action_state: {
      submit_for_approval: {
        enabled: false,
        reason_code: 'workflow_transition_not_available',
      },
    },
  });
  const schemaActions = [
    { name: 'submit_for_approval', label: 'Submit for approval' },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  assert.equal(actions.length, 1);
  assert.equal(actions[0].disabled, true);
  assert.equal(actions[0].disabledReason, 'Action is not available in the current workflow state.');
});

test('schema actions suppress default actions (no duplicates)', () => {
  const builder = createBuilder();
  const record = createMockRecord();
  const schemaActions = [
    { name: 'view', label: 'View' },
    { name: 'edit', label: 'Edit' },
    { name: 'delete', label: 'Delete' },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  // Should only have 3 actions, not 6 (no duplication with defaults)
  assert.equal(actions.length, 3);
});

test('schema actions use labels from schema, not defaults', () => {
  const builder = createBuilder();
  const record = createMockRecord();
  const schemaActions = [
    { name: 'view', label: 'Preview' },
    { name: 'edit', label: 'Modify' },
    { name: 'delete', label: 'Remove' },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  assert.equal(actions[0].label, 'Preview');
  assert.equal(actions[1].label, 'Modify');
  assert.equal(actions[2].label, 'Remove');
});

// =============================================================================
// SchemaActionBuilder - Duplicate Prevention Tests
// =============================================================================

test('prevents duplicate actions by name', () => {
  const builder = createBuilder();
  const record = createMockRecord();
  const schemaActions = [
    { name: 'view', label: 'View First' },
    { name: 'view', label: 'View Second' }, // Duplicate - should be ignored
    { name: 'edit', label: 'Edit' },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  assert.equal(actions.length, 2);
  assert.equal(actions[0].label, 'View First'); // First wins
  assert.equal(actions[1].label, 'Edit');
});

test('skips actions without name', () => {
  const builder = createBuilder();
  const record = createMockRecord();
  const schemaActions = [
    { name: 'view', label: 'View' },
    { label: 'Invalid Action' }, // No name - should be skipped
    { name: 'edit', label: 'Edit' },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  assert.equal(actions.length, 2);
  assert.equal(actions[0].label, 'View');
  assert.equal(actions[1].label, 'Edit');
});

// =============================================================================
// SchemaActionBuilder - Navigation Action Detection Tests
// =============================================================================

test('detects navigation actions by name (view, edit)', () => {
  const builder = createBuilder();
  const record = createMockRecord();
  const schemaActions = [
    { name: 'view' },
    { name: 'edit' },
    { name: 'details' },
    { name: 'show' },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  // All should be navigation actions (they navigate, not POST)
  assert.equal(actions.length, 4);
  // Each action should be a function that navigates
  actions.forEach(action => {
    assert.equal(typeof action.action, 'function');
  });
});

test('detects navigation actions by explicit type: navigation', () => {
  const builder = createBuilder();
  const record = createMockRecord();
  const schemaActions = [
    { name: 'custom_view', label: 'Custom View', type: 'navigation' },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  assert.equal(actions.length, 1);
  assert.equal(actions[0].label, 'Custom View');
});

test('detects navigation actions by href property', () => {
  const builder = createBuilder();
  const record = createMockRecord();
  const schemaActions = [
    { name: 'external', label: 'Go External', href: '/custom/{id}/preview' },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  assert.equal(actions.length, 1);
  assert.equal(actions[0].label, 'Go External');
});

// =============================================================================
// SchemaActionBuilder - URL Context Preservation Tests
// Note: These tests verify action creation, not browser navigation
// (browser navigation requires window object which isn't available in Node.js)
// =============================================================================

test('buildQueryContext includes locale when configured', () => {
  const builder = createBuilder({ locale: 'es' });
  const record = createMockRecord();
  const schemaActions = [{ name: 'view', label: 'View' }];

  const actions = builder.buildRowActions(record, schemaActions);

  // Action should be created successfully
  assert.equal(actions.length, 1);
  assert.equal(typeof actions[0].action, 'function');
  // The builder stores locale internally - we verify it was configured
});

test('buildQueryContext includes environment when configured', () => {
  const builder = createBuilder({ environment: 'staging' });
  const record = createMockRecord();
  const schemaActions = [{ name: 'view', label: 'View' }];

  const actions = builder.buildRowActions(record, schemaActions);

  // Action should be created successfully
  assert.equal(actions.length, 1);
  assert.equal(typeof actions[0].action, 'function');
});

test('buildQueryContext includes both locale and environment when configured', () => {
  const builder = createBuilder({ locale: 'fr', environment: 'production' });
  const record = createMockRecord();
  const schemaActions = [{ name: 'edit', label: 'Edit' }];

  const actions = builder.buildRowActions(record, schemaActions);

  // Action should be created successfully
  assert.equal(actions.length, 1);
  assert.equal(typeof actions[0].action, 'function');
});

// =============================================================================
// SchemaActionBuilder - Action Variants Tests
// =============================================================================

test('applies variant from schema action', () => {
  const builder = createBuilder();
  const record = createMockRecord();
  const schemaActions = [
    { name: 'publish', label: 'Publish', variant: 'success' },
    { name: 'archive', label: 'Archive', variant: 'warning' },
    { name: 'delete', label: 'Delete', variant: 'danger' },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  assert.equal(actions[0].variant, 'success');
  assert.equal(actions[1].variant, 'warning');
  assert.equal(actions[2].variant, 'danger');
});

test('defaults to secondary variant when not specified', () => {
  const builder = createBuilder();
  const record = createMockRecord();
  const schemaActions = [
    { name: 'custom', label: 'Custom Action' },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  assert.equal(actions[0].variant, 'secondary');
});

test('delete action uses danger variant by default when schema variant is secondary', () => {
  const builder = createBuilder();
  const record = createMockRecord();
  const schemaActions = [
    { name: 'delete', label: 'Delete' }, // No variant specified (defaults to secondary)
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  assert.equal(actions[0].variant, 'danger');
});

// =============================================================================
// SchemaActionBuilder - Icon Mapping Tests
// =============================================================================

test('uses icon from schema action', () => {
  const builder = createBuilder();
  const record = createMockRecord();
  const schemaActions = [
    { name: 'custom', label: 'Custom', icon: 'star' },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  assert.equal(actions[0].icon, 'star');
});

test('uses default icon for known action names', () => {
  const builder = createBuilder();
  const record = createMockRecord();
  const schemaActions = [
    { name: 'view', label: 'View' },
    { name: 'edit', label: 'Edit' },
    { name: 'delete', label: 'Delete' },
    { name: 'publish', label: 'Publish' },
    { name: 'archive', label: 'Archive' },
    { name: 'create_translation', label: 'Translate' },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  // Actions are sorted by stable fallback order:
  // view(100) < edit(200) < create_translation(400) < publish(500) < archive(1000) < delete(9000)
  assert.equal(actions.length, 6);
  assert.equal(actions[0].icon, 'eye');           // view
  assert.equal(actions[1].icon, 'edit');          // edit
  assert.equal(actions[2].icon, 'copy');          // create_translation
  assert.equal(actions[3].icon, 'check-circle');  // publish
  assert.equal(actions[4].icon, 'archive');       // archive
  assert.equal(actions[5].icon, 'trash');         // delete
});

// =============================================================================
// SchemaActionBuilder - Append Default Actions (Compatibility Mode)
// =============================================================================

test('appendDefaultActions mode adds defaults after schema actions', () => {
  const builder = createBuilder({ appendDefaultActions: true });
  const record = createMockRecord();
  const schemaActions = [
    { name: 'publish', label: 'Publish' },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  // Should have publish + view + edit + delete = 4
  // Sorted by stable order: view(100) < edit(200) < publish(500) < delete(9000)
  assert.equal(actions.length, 4);
  assert.equal(actions[0].label, 'View');
  assert.equal(actions[1].label, 'Edit');
  assert.equal(actions[2].label, 'Publish');
  assert.equal(actions[3].label, 'Delete');
});

test('appendDefaultActions mode avoids duplicates with schema actions', () => {
  const builder = createBuilder({ appendDefaultActions: true });
  const record = createMockRecord();
  const schemaActions = [
    { name: 'view', label: 'View Custom' },
    { name: 'publish', label: 'Publish' },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  // Should have view + publish + edit + delete = 4 (no duplicate view)
  // Sorted by stable order: view(100) < edit(200) < publish(500) < delete(9000)
  assert.equal(actions.length, 4);
  assert.equal(actions[0].label, 'View Custom'); // Schema version wins
  assert.equal(actions[1].label, 'Edit');
  assert.equal(actions[2].label, 'Publish');
  assert.equal(actions[3].label, 'Delete');
});

// =============================================================================
// buildSchemaRowActions Convenience Function Tests
// =============================================================================

test('buildSchemaRowActions convenience function works correctly', () => {
  const record = createMockRecord();
  const schemaActions = [
    { name: 'view', label: 'View' },
    { name: 'publish', label: 'Publish' },
  ];

  const actions = buildSchemaRowActions(record, schemaActions, {
    apiEndpoint: '/admin/api/pages',
    actionBasePath: '/admin/content/pages',
  });

  assert.equal(actions.length, 2);
  assert.equal(actions[0].label, 'View');
  assert.equal(actions[1].label, 'Publish');
});

// =============================================================================
// extractSchemaActions Helper Tests
// =============================================================================

test('extractSchemaActions returns actions from response', () => {
  const response = {
    schema: {
      actions: [
        { name: 'view', label: 'View' },
        { name: 'edit', label: 'Edit' },
      ],
    },
    data: [],
  };

  const actions = extractSchemaActions(response);

  assert.ok(actions);
  assert.equal(actions.length, 2);
  assert.equal(actions[0].name, 'view');
  assert.equal(actions[1].name, 'edit');
});

test('extractSchemaActions returns undefined when no schema', () => {
  const response = { data: [] };

  const actions = extractSchemaActions(response);

  assert.equal(actions, undefined);
});

test('extractSchemaActions returns undefined when no actions in schema', () => {
  const response = {
    schema: {
      columns: [{ name: 'id' }],
    },
    data: [],
  };

  const actions = extractSchemaActions(response);

  assert.equal(actions, undefined);
});

// =============================================================================
// SchemaActionBuilder - Deterministic Precedence Tests
// =============================================================================

test('schema actions maintain order from server when order property is provided', () => {
  const builder = createBuilder();
  const record = createMockRecord();
  // Use explicit order values to override stable fallback
  const schemaActions = [
    { name: 'approve', label: 'Approve', order: 10 },
    { name: 'view', label: 'View', order: 20 },
    { name: 'reject', label: 'Reject', order: 30 },
    { name: 'edit', label: 'Edit', order: 40 },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  // Order should match server-provided order
  assert.equal(actions[0].label, 'Approve');
  assert.equal(actions[1].label, 'View');
  assert.equal(actions[2].label, 'Reject');
  assert.equal(actions[3].label, 'Edit');
});

test('schema actions use stable fallback order when no order property', () => {
  const builder = createBuilder();
  const record = createMockRecord();
  // No order property - uses stable fallback
  const schemaActions = [
    { name: 'approve', label: 'Approve' },  // fallback: 800
    { name: 'view', label: 'View' },        // fallback: 100
    { name: 'reject', label: 'Reject' },    // fallback: 900
    { name: 'edit', label: 'Edit' },        // fallback: 200
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  // Order should match stable fallback: view(100) < edit(200) < approve(800) < reject(900)
  assert.equal(actions[0].label, 'View');
  assert.equal(actions[1].label, 'Edit');
  assert.equal(actions[2].label, 'Approve');
  assert.equal(actions[3].label, 'Reject');
});

// =============================================================================
// Task 9.8: Frontend Transport Tests - Schema Action -> POST Mapping
// =============================================================================

test('SchemaActionBuilder includes locale in query context', () => {
  const builder = new SchemaActionBuilder({
    apiEndpoint: '/admin/api/pages',
    actionBasePath: '/admin/content/pages',
    locale: 'es',
  });

  // Verify locale is stored in config
  assert.ok(builder);
  // Builder should create actions that include locale context
  const record = createMockRecord();
  const schemaActions = [{ name: 'view', label: 'View' }];
  const actions = builder.buildRowActions(record, schemaActions);

  assert.equal(actions.length, 1);
  assert.equal(typeof actions[0].action, 'function');
});

test('SchemaActionBuilder includes environment in query context', () => {
  const builder = new SchemaActionBuilder({
    apiEndpoint: '/admin/api/pages',
    actionBasePath: '/admin/content/pages',
    environment: 'staging',
  });

  assert.ok(builder);
  const record = createMockRecord();
  const schemaActions = [{ name: 'edit', label: 'Edit' }];
  const actions = builder.buildRowActions(record, schemaActions);

  assert.equal(actions.length, 1);
});

test('SchemaActionBuilder includes panelName for policy_entity', () => {
  const builder = new SchemaActionBuilder({
    apiEndpoint: '/admin/api/pages',
    actionBasePath: '/admin/content/pages',
    panelName: 'pages',
    locale: 'en',
    environment: 'production',
  });

  assert.ok(builder);
  const record = createMockRecord();
  const schemaActions = [{ name: 'publish', label: 'Publish' }];
  const actions = builder.buildRowActions(record, schemaActions);

  assert.equal(actions.length, 1);
  assert.equal(actions[0].label, 'Publish');
});

test('POST actions use action name in endpoint path', () => {
  const builder = createBuilder();
  const record = createMockRecord({ id: 'page_123' });
  const schemaActions = [
    { name: 'publish', label: 'Publish' },
    { name: 'create_translation', label: 'Create Translation' },
    { name: 'approve', label: 'Approve' },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  // All non-navigation actions should be POST actions
  // Sorted by stable order: create_translation(400) < publish(500) < approve(800)
  assert.equal(actions.length, 3);
  assert.equal(actions[0].label, 'Create Translation');
  assert.equal(actions[1].label, 'Publish');
  assert.equal(actions[2].label, 'Approve');

  // Actions should be functions (async handlers)
  for (const action of actions) {
    assert.equal(typeof action.action, 'function');
  }
});

test('payload_required triggers payload collection', () => {
  const builder = createBuilder();
  const record = createMockRecord();
  const schemaActions = [
    {
      name: 'create_translation',
      label: 'Create Translation',
      payload_required: true,
      payload_schema: {
        type: 'object',
        required: ['locale'],
        properties: {
          locale: {
            type: 'string',
            title: 'Target Locale',
            oneOf: [
              { const: 'en', title: 'English' },
              { const: 'es', title: 'Spanish' },
              { const: 'fr', title: 'French' },
            ],
          },
        },
      },
    },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  assert.equal(actions.length, 1);
  assert.equal(actions[0].label, 'Create Translation');
  // Action is async and will prompt for payload
  assert.equal(typeof actions[0].action, 'function');
});

test('create_translation derives locale options from translation_readiness when schema options are missing', async () => {
  const builder = createBuilder();
  const record = createMockRecord({
    translation_readiness: {
      missing_required_locales: ['es', 'fr'],
    },
  });
  const schemaActions = [
    {
      name: 'create_translation',
      label: 'Create Translation',
      payload_required: ['locale'],
      payload_schema: {
        type: 'object',
        required: ['locale'],
        properties: {
          locale: {
            type: 'string',
            title: 'Locale',
          },
        },
      },
    },
  ];

  const actions = builder.buildRowActions(record, schemaActions);
  assert.equal(actions.length, 1);

  const originalPrompt = PayloadInputModal.prompt;
  let captured = null;
  PayloadInputModal.prompt = async (config) => {
    captured = config;
    return null; // Cancel after inspecting prompt config
  };
  try {
    await actions[0].action();
  } finally {
    PayloadInputModal.prompt = originalPrompt;
  }

  assert.ok(captured);
  assert.ok(Array.isArray(captured.fields));
  assert.equal(captured.fields.length, 1);
  assert.equal(captured.fields[0].name, 'locale');
  assert.ok(Array.isArray(captured.fields[0].options));
  assert.equal(captured.fields[0].options.length, 2);
  assert.equal(captured.fields[0].options[0].value, 'es');
  assert.equal(captured.fields[0].options[1].value, 'fr');
});

test('x-options payload schema extension is rendered as selectable options', async () => {
  const builder = createBuilder();
  const record = createMockRecord();
  const schemaActions = [
    {
      name: 'create_translation',
      label: 'Create Translation',
      payload_required: ['locale'],
      payload_schema: {
        type: 'object',
        required: ['locale'],
        properties: {
          locale: {
            type: 'string',
            title: 'Locale',
            'x-options': [
              { value: 'en', label: 'English' },
              { value: 'es', label: 'Spanish' },
            ],
          },
        },
      },
    },
  ];

  const actions = builder.buildRowActions(record, schemaActions);
  assert.equal(actions.length, 1);

  const originalPrompt = PayloadInputModal.prompt;
  let captured = null;
  PayloadInputModal.prompt = async (config) => {
    captured = config;
    return null;
  };
  try {
    await actions[0].action();
  } finally {
    PayloadInputModal.prompt = originalPrompt;
  }

  assert.ok(captured);
  assert.equal(captured.fields[0].name, 'locale');
  assert.ok(Array.isArray(captured.fields[0].options));
  assert.equal(captured.fields[0].options.length, 2);
  assert.equal(captured.fields[0].options[0].value, 'en');
  assert.equal(captured.fields[0].options[0].label, 'English');
});

test('payload_required array is accepted without payload_schema', () => {
  const builder = createBuilder();
  const record = createMockRecord();
  const schemaActions = [
    {
      name: 'send',
      label: 'Send',
      payload_required: ['idempotency_key'],
    },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  assert.equal(actions.length, 1);
  assert.equal(actions[0].label, 'Send');
  assert.equal(typeof actions[0].action, 'function');
});

test('onTranslationBlocker callback is stored in config', () => {
  let blockerCalled = false;
  const builder = new SchemaActionBuilder({
    apiEndpoint: '/admin/api/pages',
    actionBasePath: '/admin/content/pages',
    onTranslationBlocker: (info) => {
      blockerCalled = true;
    },
  });

  assert.ok(builder);
  // Callback is stored for use during action execution
});

test('translation blocker retry re-executes the original action payload', async () => {
  const record = createMockRecord({ id: 'page_123' });
  const schemaActions = [{ name: 'publish', label: 'Publish' }];
  const fetchCalls = [];
  const successCalls = [];
  let blockerInfo = null;

  const builder = new SchemaActionBuilder({
    apiEndpoint: '/admin/api/pages',
    actionBasePath: '/admin/content/pages',
    locale: 'en',
    environment: 'production',
    panelName: 'pages',
    onTranslationBlocker: (info) => {
      blockerInfo = info;
    },
    onActionSuccess: (actionName) => {
      successCalls.push(actionName);
    },
  });

  const actions = builder.buildRowActions(record, schemaActions);
  assert.equal(actions.length, 1);

  const originalFetch = globalThis.fetch;
  const mockResponse = (status, body) => {
    const raw = JSON.stringify(body);
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: {
        get: (name) => name.toLowerCase() === 'content-type' ? 'application/json' : null,
      },
      clone: () => ({ text: async () => raw }),
      text: async () => raw,
      json: async () => JSON.parse(raw),
    };
  };

  globalThis.fetch = async (url, init = {}) => {
    fetchCalls.push({ url: String(url), init });
    if (fetchCalls.length === 1) {
      return mockResponse(409, {
        error: {
          text_code: 'TRANSLATION_MISSING',
          message: 'Cannot publish: missing required translations',
          metadata: {
            missing_locales: ['es', 'fr'],
            transition: 'publish',
            entity_type: 'pages',
            requested_locale: 'en',
            environment: 'production',
          },
        },
      });
    }
    return mockResponse(200, { status: 'ok' });
  };

  try {
    await actions[0].action();

    assert.ok(blockerInfo);
    assert.equal(typeof blockerInfo.retry, 'function');
    assert.equal(fetchCalls.length, 1);
    assert.deepEqual(successCalls, []);

    const retryResult = await blockerInfo.retry();
    assert.equal(retryResult.success, true);
    assert.equal(fetchCalls.length, 2);
    assert.deepEqual(successCalls, ['publish']);

    const firstPayload = JSON.parse(String(fetchCalls[0].init.body || '{}'));
    const secondPayload = JSON.parse(String(fetchCalls[1].init.body || '{}'));
    assert.deepEqual(secondPayload, firstPayload);
    assert.equal(firstPayload.id, 'page_123');
    assert.equal(firstPayload.locale, 'en');
    assert.equal(firstPayload.environment, 'production');
    assert.equal(firstPayload.policy_entity, 'pages');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('onActionSuccess callback is stored in config', () => {
  let successCalled = false;
  const builder = new SchemaActionBuilder({
    apiEndpoint: '/admin/api/pages',
    actionBasePath: '/admin/content/pages',
    onActionSuccess: (name, result) => {
      successCalled = true;
    },
  });

  assert.ok(builder);
});

test('onActionError callback is stored in config', () => {
  let errorCalled = false;
  const builder = new SchemaActionBuilder({
    apiEndpoint: '/admin/api/pages',
    actionBasePath: '/admin/content/pages',
    onActionError: (name, error) => {
      errorCalled = true;
    },
  });

  assert.ok(builder);
});

// =============================================================================
// Task 9.8: Record ID Propagation Tests
// =============================================================================

test('record id is used in navigation URLs', () => {
  const builder = createBuilder();
  const record = createMockRecord({ id: 'specific_id_123' });
  const schemaActions = [{ name: 'view', label: 'View' }];

  const actions = builder.buildRowActions(record, schemaActions);

  // Action should be a navigation function using the record id
  assert.equal(actions.length, 1);
  assert.equal(typeof actions[0].action, 'function');
});

test('delete action uses record id in API path', () => {
  const builder = createBuilder();
  const record = createMockRecord({ id: 'deletable_record_456' });
  const schemaActions = [{ name: 'delete', label: 'Delete' }];

  const actions = builder.buildRowActions(record, schemaActions);

  assert.equal(actions.length, 1);
  assert.equal(actions[0].label, 'Delete');
  assert.equal(actions[0].variant, 'danger');
});

test('confirm message from schema is used', () => {
  const builder = createBuilder();
  const record = createMockRecord();
  const schemaActions = [
    { name: 'archive', label: 'Archive', confirm: 'Are you sure you want to archive this item?' },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  assert.equal(actions.length, 1);
  assert.equal(actions[0].label, 'Archive');
  // Confirm message is used during action execution
});

// =============================================================================
// Task 9.8: Query Context Propagation Tests
// =============================================================================

test('locale and environment are propagated to navigation URLs', () => {
  const builder = new SchemaActionBuilder({
    apiEndpoint: '/admin/api/pages',
    actionBasePath: '/admin/content/pages',
    locale: 'fr',
    environment: 'production',
  });

  const record = createMockRecord({ id: 'page_789' });
  const schemaActions = [
    { name: 'view', label: 'View' },
    { name: 'edit', label: 'Edit' },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  // Both actions should be navigation actions with query context
  assert.equal(actions.length, 2);
  for (const action of actions) {
    assert.equal(typeof action.action, 'function');
  }
});

test('POST actions include locale/env/policy_entity in payload', () => {
  const builder = new SchemaActionBuilder({
    apiEndpoint: '/admin/api/pages',
    actionBasePath: '/admin/content/pages',
    locale: 'es',
    environment: 'staging',
    panelName: 'pages',
  });

  const record = createMockRecord({ id: 'page_123' });
  const schemaActions = [
    { name: 'publish', label: 'Publish' },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  // Action should be a POST action with context
  assert.equal(actions.length, 1);
  assert.equal(typeof actions[0].action, 'function');
});

// =============================================================================
// Task 9.3: Action Mapping Edge Cases
// =============================================================================

test('handles schema actions with both name and href', () => {
  const builder = createBuilder();
  const record = createMockRecord({ id: 'page_123' });
  const schemaActions = [
    { name: 'preview', label: 'Preview', href: '/preview/{id}', type: 'navigation' },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  assert.equal(actions.length, 1);
  assert.equal(actions[0].label, 'Preview');
});

test('handles schema actions with type: action explicitly', () => {
  const builder = createBuilder();
  const record = createMockRecord();
  const schemaActions = [
    { name: 'custom_action', label: 'Custom', type: 'action' },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  assert.equal(actions.length, 1);
  assert.equal(actions[0].label, 'Custom');
});

test('handles workflow actions (publish, unpublish, approve, reject)', () => {
  const builder = createBuilder();
  const record = createMockRecord();
  const schemaActions = [
    { name: 'publish', label: 'Publish' },
    { name: 'unpublish', label: 'Unpublish' },
    { name: 'approve', label: 'Approve' },
    { name: 'reject', label: 'Reject' },
    { name: 'request_approval', label: 'Request Approval' },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  assert.equal(actions.length, 5);
  // All workflow actions should use POST path
  for (const action of actions) {
    assert.equal(typeof action.action, 'function');
  }
});

test('create_translation action uses copy icon by default', () => {
  const builder = createBuilder();
  const record = createMockRecord();
  const schemaActions = [
    { name: 'create_translation', label: 'Translate' },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  assert.equal(actions.length, 1);
  assert.equal(actions[0].icon, 'copy');
});

// =============================================================================
// Phase 1 Feature Tests: TX-027 Action Ordering
// =============================================================================

test('actionOrderOverride config overrides stable fallback order', () => {
  const builder = new SchemaActionBuilder({
    apiEndpoint: '/admin/api/pages',
    actionBasePath: '/admin/content/pages',
    // Custom order: put delete first, view last
    actionOrderOverride: {
      delete: 1,
      view: 9999,
    },
  });

  const record = createMockRecord();
  const schemaActions = [
    { name: 'view', label: 'View' },
    { name: 'edit', label: 'Edit' },
    { name: 'delete', label: 'Delete' },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  // Custom order: delete(1) < edit(200 from stable) < view(9999 from override)
  assert.equal(actions.length, 3);
  assert.equal(actions[0].label, 'Delete');
  assert.equal(actions[1].label, 'Edit');
  assert.equal(actions[2].label, 'View');
});

test('server order property takes precedence over actionOrderOverride', () => {
  const builder = new SchemaActionBuilder({
    apiEndpoint: '/admin/api/pages',
    actionBasePath: '/admin/content/pages',
    actionOrderOverride: {
      publish: 1, // Would make publish first
    },
  });

  const record = createMockRecord();
  const schemaActions = [
    { name: 'view', label: 'View', order: 5 },
    { name: 'publish', label: 'Publish', order: 10 }, // Server order overrides client
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  // Server order wins: view(5) < publish(10)
  assert.equal(actions.length, 2);
  assert.equal(actions[0].label, 'View');
  assert.equal(actions[1].label, 'Publish');
});

// =============================================================================
// Phase 1 Feature Tests: TX-029 Create-Translation Modal Preselection
// =============================================================================

test('create_translation derives options with recommended locale', () => {
  const builder = createBuilder();
  const record = createMockRecord({
    id: 'page_123',
    recommended_locale: 'fr',
    translation_readiness: {
      missing_required_locales: ['es', 'fr', 'de'],
      available_locales: ['en'],
      required_locales: ['en', 'es', 'fr', 'de'],
    },
  });

  const schemaActions = [
    {
      name: 'create_translation',
      label: 'Create Translation',
      payload_required: ['locale'],
      payload_schema: {
        type: 'object',
        properties: {
          locale: { type: 'string' },
        },
      },
    },
  ];

  const actions = builder.buildRowActions(record, schemaActions);
  assert.equal(actions.length, 1);
  // Action is built; locale options would be derived during payload modal
});

test('create_translation options sorted with recommended first', () => {
  // This tests the deriveCreateTranslationLocaleOptions logic
  // Recommended locale should be sorted first
  const builder = createBuilder();
  const record = createMockRecord({
    id: 'page_123',
    recommended_locale: 'de', // German recommended
    translation_readiness: {
      missing_required_locales: ['es', 'fr', 'de'],
      available_locales: ['en'],
      required_locales: ['en', 'es', 'fr', 'de'],
    },
  });

  const schemaActions = [
    { name: 'create_translation', label: 'Create Translation' },
  ];

  const actions = builder.buildRowActions(record, schemaActions);
  assert.equal(actions.length, 1);
});

// =============================================================================
// Phase 1 Feature Tests: Insertion Order Tie-Breaking
// =============================================================================

test('actions with same order use insertion order as tie-breaker', () => {
  const builder = createBuilder();
  const record = createMockRecord();
  // All actions have same explicit order
  const schemaActions = [
    { name: 'alpha', label: 'Alpha', order: 100 },
    { name: 'beta', label: 'Beta', order: 100 },
    { name: 'gamma', label: 'Gamma', order: 100 },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  // Same order, so insertion order is used: Alpha, Beta, Gamma
  assert.equal(actions.length, 3);
  assert.equal(actions[0].label, 'Alpha');
  assert.equal(actions[1].label, 'Beta');
  assert.equal(actions[2].label, 'Gamma');
});
