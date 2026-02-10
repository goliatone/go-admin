import test from 'node:test';
import assert from 'node:assert/strict';

// Import error helpers
const {
  extractStructuredError,
  parseActionResponse,
  extractErrorMessage,
  getErrorMessage,
} = await import('../dist/toast/error-helpers.js');

// Import schema actions
const {
  SchemaActionBuilder,
  buildSchemaRowActions,
} = await import('../dist/datatable/index.js');

// =============================================================================
// Test Helpers
// =============================================================================

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

function createMockAgreement(overrides = {}) {
  return {
    id: 'agr_test123',
    title: 'Test Agreement',
    status: 'draft',
    document_id: 'doc_456',
    recipient_count: 2,
    created_at: '2024-01-15T10:00:00Z',
    ...overrides,
  };
}

function createEsignActionBuilder(overrides = {}) {
  return new SchemaActionBuilder({
    apiEndpoint: '/admin/api/esign-agreements',
    actionBasePath: '/admin/esign-agreements',
    panelName: 'esign_agreements',
    useDefaultFallback: false,
    ...overrides,
  });
}

// =============================================================================
// E-Sign Error Codes - Typed Error Identification Tests
// =============================================================================

const ESIGN_ERROR_CODES = [
  'TOKEN_EXPIRED',
  'TOKEN_REVOKED',
  'AGREEMENT_IMMUTABLE',
  'AGREEMENT_VOIDED',
  'AGREEMENT_DECLINED',
  'AGREEMENT_COMPLETED',
  'AGREEMENT_EXPIRED',
  'MISSING_REQUIRED_FIELDS',
  'INVALID_RECIPIENT',
  'SIGNING_ORDER_VIOLATION',
  'CONSENT_REQUIRED',
  'FIELD_VALIDATION_FAILED',
  'DUPLICATE_SEND',
  'RATE_LIMITED',
];

test('E-Sign error codes: extractStructuredError extracts TOKEN_EXPIRED correctly', async () => {
  const response = mockResponse({
    error: {
      text_code: 'TOKEN_EXPIRED',
      message: 'The signing link has expired',
      metadata: {
        expired_at: '2024-01-10T10:00:00Z',
        recipient_id: 'rec_123',
      },
    },
  }, { status: 410 });

  const result = await extractStructuredError(response);

  assert.equal(result.textCode, 'TOKEN_EXPIRED');
  assert.equal(result.message, 'The signing link has expired');
  assert.ok(result.metadata);
  assert.equal(result.metadata.recipient_id, 'rec_123');
});

test('E-Sign error codes: extractStructuredError extracts TOKEN_REVOKED correctly', async () => {
  const response = mockResponse({
    error: {
      text_code: 'TOKEN_REVOKED',
      message: 'This signing link has been revoked',
      metadata: {
        revoked_at: '2024-01-11T10:00:00Z',
        reason: 'token_rotation',
      },
    },
  }, { status: 410 });

  const result = await extractStructuredError(response);

  assert.equal(result.textCode, 'TOKEN_REVOKED');
  assert.equal(result.message, 'This signing link has been revoked');
  assert.ok(result.metadata);
  assert.equal(result.metadata.reason, 'token_rotation');
});

test('E-Sign error codes: extractStructuredError extracts AGREEMENT_IMMUTABLE correctly', async () => {
  const response = mockResponse({
    error: {
      text_code: 'AGREEMENT_IMMUTABLE',
      message: 'Agreement cannot be modified after it has been sent',
      metadata: {
        agreement_id: 'agr_123',
        current_status: 'sent',
        attempted_action: 'update_recipients',
      },
    },
  }, { status: 409 });

  const result = await extractStructuredError(response);

  assert.equal(result.textCode, 'AGREEMENT_IMMUTABLE');
  assert.equal(result.message, 'Agreement cannot be modified after it has been sent');
  assert.ok(result.metadata);
  assert.equal(result.metadata.current_status, 'sent');
});

test('E-Sign error codes: extractStructuredError extracts MISSING_REQUIRED_FIELDS correctly', async () => {
  const response = mockResponse({
    error: {
      text_code: 'MISSING_REQUIRED_FIELDS',
      message: 'Signature capture requires all required fields to be completed',
      metadata: {
        missing_fields: ['signature_1', 'name_2'],
        recipient_id: 'rec_456',
      },
    },
  }, { status: 400 });

  const result = await extractStructuredError(response);

  assert.equal(result.textCode, 'MISSING_REQUIRED_FIELDS');
  assert.ok(result.metadata);
  assert.deepEqual(result.metadata.missing_fields, ['signature_1', 'name_2']);
});

test('E-Sign error codes: extractStructuredError extracts SIGNING_ORDER_VIOLATION correctly', async () => {
  const response = mockResponse({
    error: {
      text_code: 'SIGNING_ORDER_VIOLATION',
      message: 'Cannot sign out of order in sequential workflow',
      metadata: {
        current_order: 2,
        expected_order: 1,
        waiting_for: 'rec_previous',
      },
    },
  }, { status: 403 });

  const result = await extractStructuredError(response);

  assert.equal(result.textCode, 'SIGNING_ORDER_VIOLATION');
  assert.ok(result.metadata);
  assert.equal(result.metadata.current_order, 2);
  assert.equal(result.metadata.expected_order, 1);
});

test('E-Sign error codes: extractStructuredError extracts CONSENT_REQUIRED correctly', async () => {
  const response = mockResponse({
    error: {
      text_code: 'CONSENT_REQUIRED',
      message: 'You must accept the signing agreement before proceeding',
    },
  }, { status: 400 });

  const result = await extractStructuredError(response);

  assert.equal(result.textCode, 'CONSENT_REQUIRED');
  assert.equal(result.message, 'You must accept the signing agreement before proceeding');
});

test('E-Sign error codes: extractStructuredError extracts DUPLICATE_SEND correctly', async () => {
  const response = mockResponse({
    error: {
      text_code: 'DUPLICATE_SEND',
      message: 'Agreement has already been sent with this idempotency key',
      metadata: {
        idempotency_key: 'send-agr_123-1705312000000',
        original_sent_at: '2024-01-15T10:00:00Z',
      },
    },
  }, { status: 409 });

  const result = await extractStructuredError(response);

  assert.equal(result.textCode, 'DUPLICATE_SEND');
  assert.ok(result.metadata);
  assert.equal(result.metadata.idempotency_key, 'send-agr_123-1705312000000');
});

test('E-Sign error codes: all defined error codes are recognized', async () => {
  for (const code of ESIGN_ERROR_CODES) {
    const response = mockResponse({
      error: {
        text_code: code,
        message: `Error: ${code}`,
      },
    }, { status: 400 });

    const result = await extractStructuredError(response);
    assert.equal(result.textCode, code, `Error code ${code} should be extracted`);
  }
});

// =============================================================================
// E-Sign Error Helper Functions
// =============================================================================

/**
 * Identifies E-Sign token-related errors
 * @param {Object} error - Structured error object
 * @returns {boolean}
 */
function isEsignTokenError(error) {
  return error?.textCode === 'TOKEN_EXPIRED' || error?.textCode === 'TOKEN_REVOKED';
}

/**
 * Identifies E-Sign agreement terminal state errors
 * @param {Object} error - Structured error object
 * @returns {boolean}
 */
function isEsignTerminalStateError(error) {
  const terminalCodes = ['AGREEMENT_VOIDED', 'AGREEMENT_DECLINED', 'AGREEMENT_COMPLETED', 'AGREEMENT_EXPIRED'];
  return terminalCodes.includes(error?.textCode);
}

/**
 * Identifies E-Sign immutability violation errors
 * @param {Object} error - Structured error object
 * @returns {boolean}
 */
function isEsignImmutabilityError(error) {
  return error?.textCode === 'AGREEMENT_IMMUTABLE';
}

/**
 * Identifies E-Sign signing flow errors
 * @param {Object} error - Structured error object
 * @returns {boolean}
 */
function isEsignSigningError(error) {
  const signingCodes = ['SIGNING_ORDER_VIOLATION', 'CONSENT_REQUIRED', 'MISSING_REQUIRED_FIELDS', 'FIELD_VALIDATION_FAILED'];
  return signingCodes.includes(error?.textCode);
}

/**
 * Determines the appropriate UI treatment for an E-Sign error
 * @param {Object} error - Structured error object
 * @returns {string} - 'redirect' | 'modal' | 'toast' | 'inline'
 */
function getEsignErrorUiTreatment(error) {
  if (isEsignTokenError(error)) return 'redirect';
  if (isEsignTerminalStateError(error)) return 'redirect';
  if (isEsignImmutabilityError(error)) return 'modal';
  if (isEsignSigningError(error)) return 'inline';
  if (error?.textCode === 'RATE_LIMITED') return 'toast';
  return 'toast';
}

// =============================================================================
// E-Sign Error Classification Tests
// =============================================================================

test('isEsignTokenError identifies TOKEN_EXPIRED', () => {
  assert.equal(isEsignTokenError({ textCode: 'TOKEN_EXPIRED' }), true);
});

test('isEsignTokenError identifies TOKEN_REVOKED', () => {
  assert.equal(isEsignTokenError({ textCode: 'TOKEN_REVOKED' }), true);
});

test('isEsignTokenError returns false for other errors', () => {
  assert.equal(isEsignTokenError({ textCode: 'AGREEMENT_IMMUTABLE' }), false);
  assert.equal(isEsignTokenError({ textCode: 'VALIDATION_FAILED' }), false);
  assert.equal(isEsignTokenError(null), false);
});

test('isEsignTerminalStateError identifies all terminal states', () => {
  assert.equal(isEsignTerminalStateError({ textCode: 'AGREEMENT_VOIDED' }), true);
  assert.equal(isEsignTerminalStateError({ textCode: 'AGREEMENT_DECLINED' }), true);
  assert.equal(isEsignTerminalStateError({ textCode: 'AGREEMENT_COMPLETED' }), true);
  assert.equal(isEsignTerminalStateError({ textCode: 'AGREEMENT_EXPIRED' }), true);
});

test('isEsignTerminalStateError returns false for non-terminal errors', () => {
  assert.equal(isEsignTerminalStateError({ textCode: 'TOKEN_EXPIRED' }), false);
  assert.equal(isEsignTerminalStateError({ textCode: 'AGREEMENT_IMMUTABLE' }), false);
});

test('isEsignImmutabilityError identifies immutability violations', () => {
  assert.equal(isEsignImmutabilityError({ textCode: 'AGREEMENT_IMMUTABLE' }), true);
  assert.equal(isEsignImmutabilityError({ textCode: 'VALIDATION_FAILED' }), false);
});

test('isEsignSigningError identifies signing flow errors', () => {
  assert.equal(isEsignSigningError({ textCode: 'SIGNING_ORDER_VIOLATION' }), true);
  assert.equal(isEsignSigningError({ textCode: 'CONSENT_REQUIRED' }), true);
  assert.equal(isEsignSigningError({ textCode: 'MISSING_REQUIRED_FIELDS' }), true);
  assert.equal(isEsignSigningError({ textCode: 'FIELD_VALIDATION_FAILED' }), true);
});

test('getEsignErrorUiTreatment returns redirect for token errors', () => {
  assert.equal(getEsignErrorUiTreatment({ textCode: 'TOKEN_EXPIRED' }), 'redirect');
  assert.equal(getEsignErrorUiTreatment({ textCode: 'TOKEN_REVOKED' }), 'redirect');
});

test('getEsignErrorUiTreatment returns redirect for terminal state errors', () => {
  assert.equal(getEsignErrorUiTreatment({ textCode: 'AGREEMENT_VOIDED' }), 'redirect');
  assert.equal(getEsignErrorUiTreatment({ textCode: 'AGREEMENT_DECLINED' }), 'redirect');
  assert.equal(getEsignErrorUiTreatment({ textCode: 'AGREEMENT_COMPLETED' }), 'redirect');
});

test('getEsignErrorUiTreatment returns modal for immutability errors', () => {
  assert.equal(getEsignErrorUiTreatment({ textCode: 'AGREEMENT_IMMUTABLE' }), 'modal');
});

test('getEsignErrorUiTreatment returns inline for signing flow errors', () => {
  assert.equal(getEsignErrorUiTreatment({ textCode: 'SIGNING_ORDER_VIOLATION' }), 'inline');
  assert.equal(getEsignErrorUiTreatment({ textCode: 'CONSENT_REQUIRED' }), 'inline');
  assert.equal(getEsignErrorUiTreatment({ textCode: 'MISSING_REQUIRED_FIELDS' }), 'inline');
});

test('getEsignErrorUiTreatment returns toast for rate limit', () => {
  assert.equal(getEsignErrorUiTreatment({ textCode: 'RATE_LIMITED' }), 'toast');
});

test('getEsignErrorUiTreatment defaults to toast for unknown errors', () => {
  assert.equal(getEsignErrorUiTreatment({ textCode: 'UNKNOWN_ERROR' }), 'toast');
  assert.equal(getEsignErrorUiTreatment(null), 'toast');
});

// =============================================================================
// E-Sign Action Transport Tests
// =============================================================================

test('E-Sign actions: builder creates send action', () => {
  const builder = createEsignActionBuilder();
  const record = createMockAgreement({ status: 'draft' });
  const schemaActions = [
    { name: 'send', label: 'Send for Signature', icon: 'send', variant: 'primary' },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  assert.equal(actions.length, 1);
  assert.equal(actions[0].label, 'Send for Signature');
  assert.equal(actions[0].variant, 'primary');
  assert.equal(typeof actions[0].action, 'function');
});

test('E-Sign actions: builder creates void action with danger variant', () => {
  const builder = createEsignActionBuilder();
  const record = createMockAgreement({ status: 'sent' });
  const schemaActions = [
    { name: 'void', label: 'Void Agreement', icon: 'cancel', variant: 'danger' },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  assert.equal(actions.length, 1);
  assert.equal(actions[0].label, 'Void Agreement');
  assert.equal(actions[0].variant, 'danger');
});

test('E-Sign actions: builder creates resend action', () => {
  const builder = createEsignActionBuilder();
  const record = createMockAgreement({ status: 'sent' });
  const schemaActions = [
    { name: 'resend', label: 'Resend', icon: 'refresh', variant: 'warning' },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  assert.equal(actions.length, 1);
  assert.equal(actions[0].label, 'Resend');
  assert.equal(actions[0].variant, 'warning');
});

test('E-Sign actions: builder creates rotate_token action', () => {
  const builder = createEsignActionBuilder();
  const record = createMockAgreement({ status: 'sent' });
  const schemaActions = [
    { name: 'rotate_token', label: 'Rotate Token', icon: 'refresh' },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  assert.equal(actions.length, 1);
  assert.equal(actions[0].label, 'Rotate Token');
});

test('E-Sign actions: builder creates download-executed action as navigation', () => {
  const builder = createEsignActionBuilder();
  const record = createMockAgreement({ status: 'completed' });
  const schemaActions = [
    { name: 'download_executed', label: 'Download Executed PDF', type: 'navigation', href: '/admin/api/esign-agreements/{id}/artifact/executed' },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  assert.equal(actions.length, 1);
  assert.equal(actions[0].label, 'Download Executed PDF');
});

test('E-Sign actions: send action with payload_required for idempotency_key', () => {
  const builder = createEsignActionBuilder();
  const record = createMockAgreement({ status: 'draft' });
  const schemaActions = [
    {
      name: 'send',
      label: 'Send for Signature',
      payload_required: true,
      payload_schema: {
        type: 'object',
        properties: {
          idempotency_key: { type: 'string' },
        },
      },
    },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  assert.equal(actions.length, 1);
  assert.equal(typeof actions[0].action, 'function');
});

test('E-Sign actions: void action with confirm prompt', () => {
  const builder = createEsignActionBuilder();
  const record = createMockAgreement({ status: 'sent' });
  const schemaActions = [
    {
      name: 'void',
      label: 'Void Agreement',
      variant: 'danger',
      confirm: 'Are you sure you want to void this agreement? This action cannot be undone.',
    },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  assert.equal(actions.length, 1);
  assert.equal(actions[0].label, 'Void Agreement');
});

test('E-Sign actions: multiple status-dependent actions', () => {
  const builder = createEsignActionBuilder();
  const record = createMockAgreement({ status: 'sent' });
  const schemaActions = [
    { name: 'view', label: 'View Details' },
    { name: 'resend', label: 'Resend' },
    { name: 'void', label: 'Void', variant: 'danger' },
  ];

  const actions = builder.buildRowActions(record, schemaActions);

  assert.equal(actions.length, 3);
  assert.equal(actions[0].label, 'View Details');
  assert.equal(actions[1].label, 'Resend');
  assert.equal(actions[2].label, 'Void');
});

// =============================================================================
// E-Sign Agreement State Rendering Tests
// =============================================================================

/**
 * E-Sign agreement status configuration for UI rendering
 */
const ESIGN_STATUS_CONFIG = {
  draft: {
    label: 'Draft',
    color: 'gray',
    icon: 'document',
    actions: ['edit', 'send', 'delete'],
  },
  sent: {
    label: 'Sent',
    color: 'blue',
    icon: 'send',
    actions: ['resend', 'void'],
  },
  in_progress: {
    label: 'In Progress',
    color: 'yellow',
    icon: 'hourglass',
    actions: ['resend', 'void'],
  },
  completed: {
    label: 'Completed',
    color: 'green',
    icon: 'check-circle',
    actions: ['view', 'download_executed', 'download_certificate'],
  },
  voided: {
    label: 'Voided',
    color: 'red',
    icon: 'cancel',
    actions: ['view'],
  },
  declined: {
    label: 'Declined',
    color: 'orange',
    icon: 'xmark',
    actions: ['view'],
  },
  expired: {
    label: 'Expired',
    color: 'purple',
    icon: 'clock',
    actions: ['view'],
  },
};

/**
 * Get status configuration for an agreement
 * @param {string} status - Agreement status
 * @returns {Object}
 */
function getAgreementStatusConfig(status) {
  const normalized = (status || '').toLowerCase();
  return ESIGN_STATUS_CONFIG[normalized] || {
    label: status || 'Unknown',
    color: 'gray',
    icon: 'question-mark',
    actions: ['view'],
  };
}

/**
 * Check if an agreement status is terminal (no further transitions possible)
 * @param {string} status - Agreement status
 * @returns {boolean}
 */
function isTerminalStatus(status) {
  const terminalStatuses = ['completed', 'voided', 'declined', 'expired'];
  return terminalStatuses.includes((status || '').toLowerCase());
}

/**
 * Check if an agreement status allows editing
 * @param {string} status - Agreement status
 * @returns {boolean}
 */
function isEditableStatus(status) {
  return (status || '').toLowerCase() === 'draft';
}

/**
 * Check if an agreement status allows send/resend actions
 * @param {string} status - Agreement status
 * @returns {boolean}
 */
function isSendableStatus(status) {
  const sendable = ['draft', 'sent', 'in_progress'];
  return sendable.includes((status || '').toLowerCase());
}

/**
 * Get CSS classes for status badge
 * @param {string} status - Agreement status
 * @returns {Object}
 */
function getStatusBadgeClasses(status) {
  const config = getAgreementStatusConfig(status);
  const colorMap = {
    gray: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
    green: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
    red: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  };
  return colorMap[config.color] || colorMap.gray;
}

// Status rendering tests

test('getAgreementStatusConfig returns correct config for draft', () => {
  const config = getAgreementStatusConfig('draft');
  assert.equal(config.label, 'Draft');
  assert.equal(config.color, 'gray');
  assert.ok(config.actions.includes('edit'));
  assert.ok(config.actions.includes('send'));
});

test('getAgreementStatusConfig returns correct config for sent', () => {
  const config = getAgreementStatusConfig('sent');
  assert.equal(config.label, 'Sent');
  assert.equal(config.color, 'blue');
  assert.ok(config.actions.includes('resend'));
  assert.ok(config.actions.includes('void'));
});

test('getAgreementStatusConfig returns correct config for in_progress', () => {
  const config = getAgreementStatusConfig('in_progress');
  assert.equal(config.label, 'In Progress');
  assert.equal(config.color, 'yellow');
  assert.ok(config.actions.includes('resend'));
});

test('getAgreementStatusConfig returns correct config for completed', () => {
  const config = getAgreementStatusConfig('completed');
  assert.equal(config.label, 'Completed');
  assert.equal(config.color, 'green');
  assert.ok(config.actions.includes('download_executed'));
});

test('getAgreementStatusConfig returns correct config for voided', () => {
  const config = getAgreementStatusConfig('voided');
  assert.equal(config.label, 'Voided');
  assert.equal(config.color, 'red');
  assert.ok(!config.actions.includes('void'));
});

test('getAgreementStatusConfig returns correct config for declined', () => {
  const config = getAgreementStatusConfig('declined');
  assert.equal(config.label, 'Declined');
  assert.equal(config.color, 'orange');
});

test('getAgreementStatusConfig returns correct config for expired', () => {
  const config = getAgreementStatusConfig('expired');
  assert.equal(config.label, 'Expired');
  assert.equal(config.color, 'purple');
});

test('getAgreementStatusConfig handles case-insensitive input', () => {
  assert.equal(getAgreementStatusConfig('DRAFT').label, 'Draft');
  assert.equal(getAgreementStatusConfig('Sent').label, 'Sent');
  assert.equal(getAgreementStatusConfig('IN_PROGRESS').label, 'In Progress');
});

test('getAgreementStatusConfig handles unknown status', () => {
  const config = getAgreementStatusConfig('unknown_status');
  assert.equal(config.label, 'unknown_status');
  assert.equal(config.color, 'gray');
});

test('getAgreementStatusConfig handles null/undefined', () => {
  const configNull = getAgreementStatusConfig(null);
  assert.equal(configNull.label, 'Unknown');

  const configUndef = getAgreementStatusConfig(undefined);
  assert.equal(configUndef.label, 'Unknown');
});

test('isTerminalStatus identifies terminal states', () => {
  assert.equal(isTerminalStatus('completed'), true);
  assert.equal(isTerminalStatus('voided'), true);
  assert.equal(isTerminalStatus('declined'), true);
  assert.equal(isTerminalStatus('expired'), true);
});

test('isTerminalStatus returns false for non-terminal states', () => {
  assert.equal(isTerminalStatus('draft'), false);
  assert.equal(isTerminalStatus('sent'), false);
  assert.equal(isTerminalStatus('in_progress'), false);
});

test('isTerminalStatus handles case-insensitivity', () => {
  assert.equal(isTerminalStatus('COMPLETED'), true);
  assert.equal(isTerminalStatus('Voided'), true);
});

test('isEditableStatus returns true only for draft', () => {
  assert.equal(isEditableStatus('draft'), true);
  assert.equal(isEditableStatus('DRAFT'), true);
  assert.equal(isEditableStatus('sent'), false);
  assert.equal(isEditableStatus('completed'), false);
});

test('isSendableStatus returns true for draft, sent, in_progress', () => {
  assert.equal(isSendableStatus('draft'), true);
  assert.equal(isSendableStatus('sent'), true);
  assert.equal(isSendableStatus('in_progress'), true);
});

test('isSendableStatus returns false for terminal states', () => {
  assert.equal(isSendableStatus('completed'), false);
  assert.equal(isSendableStatus('voided'), false);
  assert.equal(isSendableStatus('declined'), false);
  assert.equal(isSendableStatus('expired'), false);
});

test('getStatusBadgeClasses returns correct classes for each status', () => {
  const draftClasses = getStatusBadgeClasses('draft');
  assert.equal(draftClasses.bg, 'bg-gray-100');
  assert.equal(draftClasses.text, 'text-gray-700');

  const completedClasses = getStatusBadgeClasses('completed');
  assert.equal(completedClasses.bg, 'bg-green-100');
  assert.equal(completedClasses.text, 'text-green-700');

  const voidedClasses = getStatusBadgeClasses('voided');
  assert.equal(voidedClasses.bg, 'bg-red-100');
  assert.equal(voidedClasses.text, 'text-red-700');
});

// =============================================================================
// E-Sign Action Response Parsing Tests
// =============================================================================

test('parseActionResponse handles E-Sign send success response', () => {
  const result = parseActionResponse({
    status: 'ok',
    data: {
      agreement_id: 'agr_123',
      status: 'sent',
      sent_at: '2024-01-15T10:00:00Z',
      recipients_notified: 2,
    },
  });

  assert.equal(result.success, true);
  assert.ok(result.data);
  assert.equal(result.data.status, 'sent');
  assert.equal(result.data.recipients_notified, 2);
});

test('parseActionResponse handles E-Sign void success response', () => {
  const result = parseActionResponse({
    status: 'ok',
    data: {
      agreement_id: 'agr_123',
      status: 'voided',
      voided_at: '2024-01-16T10:00:00Z',
      void_reason: 'Incorrect document',
    },
  });

  assert.equal(result.success, true);
  assert.ok(result.data);
  assert.equal(result.data.status, 'voided');
  assert.equal(result.data.void_reason, 'Incorrect document');
});

test('parseActionResponse handles E-Sign resend success response', () => {
  const result = parseActionResponse({
    status: 'ok',
    data: {
      agreement_id: 'agr_123',
      resent_to: ['recipient@example.com'],
      resent_at: '2024-01-16T11:00:00Z',
    },
  });

  assert.equal(result.success, true);
  assert.ok(result.data);
  assert.deepEqual(result.data.resent_to, ['recipient@example.com']);
});

test('parseActionResponse handles E-Sign rotate_token success response', () => {
  const result = parseActionResponse({
    status: 'ok',
    data: {
      recipient_id: 'rec_456',
      new_token_expires_at: '2024-01-23T10:00:00Z',
    },
  });

  assert.equal(result.success, true);
  assert.ok(result.data);
  assert.equal(result.data.recipient_id, 'rec_456');
});

test('parseActionResponse handles E-Sign AGREEMENT_IMMUTABLE error', () => {
  const result = parseActionResponse({
    error: {
      text_code: 'AGREEMENT_IMMUTABLE',
      message: 'Agreement cannot be modified after it has been sent',
      metadata: {
        current_status: 'sent',
      },
    },
  });

  assert.equal(result.success, false);
  assert.ok(result.error);
  assert.equal(result.error.textCode, 'AGREEMENT_IMMUTABLE');
});

test('parseActionResponse handles E-Sign DUPLICATE_SEND error', () => {
  const result = parseActionResponse({
    error: {
      text_code: 'DUPLICATE_SEND',
      message: 'Agreement has already been sent with this idempotency key',
      metadata: {
        idempotency_key: 'send-agr_123-123456',
      },
    },
  });

  assert.equal(result.success, false);
  assert.ok(result.error);
  assert.equal(result.error.textCode, 'DUPLICATE_SEND');
});

// =============================================================================
// E-Sign Recipient Status Rendering Tests
// =============================================================================

const RECIPIENT_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'gray' },
  signed: { label: 'Signed', color: 'green' },
  completed: { label: 'Signed', color: 'green' },
  declined: { label: 'Declined', color: 'red' },
  delivered: { label: 'Delivered', color: 'blue' },
  viewed: { label: 'Viewed', color: 'purple' },
};

function getRecipientStatusConfig(status) {
  const normalized = (status || '').toLowerCase();
  return RECIPIENT_STATUS_CONFIG[normalized] || { label: status || 'Pending', color: 'gray' };
}

test('getRecipientStatusConfig returns correct config for pending', () => {
  const config = getRecipientStatusConfig('pending');
  assert.equal(config.label, 'Pending');
  assert.equal(config.color, 'gray');
});

test('getRecipientStatusConfig returns correct config for signed', () => {
  const config = getRecipientStatusConfig('signed');
  assert.equal(config.label, 'Signed');
  assert.equal(config.color, 'green');
});

test('getRecipientStatusConfig returns correct config for completed (alias for signed)', () => {
  const config = getRecipientStatusConfig('completed');
  assert.equal(config.label, 'Signed');
  assert.equal(config.color, 'green');
});

test('getRecipientStatusConfig returns correct config for declined', () => {
  const config = getRecipientStatusConfig('declined');
  assert.equal(config.label, 'Declined');
  assert.equal(config.color, 'red');
});

test('getRecipientStatusConfig returns correct config for delivered', () => {
  const config = getRecipientStatusConfig('delivered');
  assert.equal(config.label, 'Delivered');
  assert.equal(config.color, 'blue');
});

test('getRecipientStatusConfig returns correct config for viewed', () => {
  const config = getRecipientStatusConfig('viewed');
  assert.equal(config.label, 'Viewed');
  assert.equal(config.color, 'purple');
});

// =============================================================================
// E-Sign Field Type Rendering Tests
// =============================================================================

const FIELD_TYPE_CONFIG = {
  signature: { label: 'Signature', icon: 'edit', required_by_default: true },
  name: { label: 'Full Name', icon: 'user', required_by_default: true },
  date_signed: { label: 'Date Signed', icon: 'calendar', required_by_default: true, auto_fill: true },
  text: { label: 'Text', icon: 'text', required_by_default: false },
  checkbox: { label: 'Checkbox', icon: 'check-square', required_by_default: false },
  initials: { label: 'Initials', icon: 'edit-pencil', required_by_default: false },
};

function getFieldTypeConfig(fieldType) {
  const normalized = (fieldType || '').toLowerCase();
  return FIELD_TYPE_CONFIG[normalized] || { label: fieldType || 'Field', icon: 'input', required_by_default: false };
}

function isAutoFillField(fieldType) {
  const config = getFieldTypeConfig(fieldType);
  return config.auto_fill === true;
}

test('getFieldTypeConfig returns correct config for signature', () => {
  const config = getFieldTypeConfig('signature');
  assert.equal(config.label, 'Signature');
  assert.equal(config.required_by_default, true);
});

test('getFieldTypeConfig returns correct config for date_signed with auto_fill', () => {
  const config = getFieldTypeConfig('date_signed');
  assert.equal(config.label, 'Date Signed');
  assert.equal(config.auto_fill, true);
});

test('isAutoFillField returns true for date_signed', () => {
  assert.equal(isAutoFillField('date_signed'), true);
});

test('isAutoFillField returns false for signature', () => {
  assert.equal(isAutoFillField('signature'), false);
});

test('isAutoFillField returns false for text', () => {
  assert.equal(isAutoFillField('text'), false);
});

// =============================================================================
// E-Sign Timeline Event Rendering Tests
// =============================================================================

const TIMELINE_EVENT_CONFIG = {
  'agreement.created': { label: 'Agreement Created', color: 'green' },
  'agreement.sent': { label: 'Sent for Signature', color: 'blue' },
  'agreement.resent': { label: 'Invitation Resent', color: 'yellow' },
  'agreement.voided': { label: 'Agreement Voided', color: 'red' },
  'agreement.declined': { label: 'Agreement Declined', color: 'orange' },
  'agreement.expired': { label: 'Agreement Expired', color: 'purple' },
  'agreement.completed': { label: 'Agreement Completed', color: 'green' },
  'recipient.viewed': { label: 'Document Viewed', color: 'purple' },
  'recipient.signed': { label: 'Signed', color: 'green' },
  'recipient.declined': { label: 'Declined to Sign', color: 'orange' },
  'signature.attached': { label: 'Signature Attached', color: 'blue' },
  'token.rotated': { label: 'Token Rotated', color: 'yellow' },
};

function getTimelineEventConfig(eventType) {
  return TIMELINE_EVENT_CONFIG[eventType] || {
    label: (eventType || 'Event').replace('.', ' ').replace(/_/g, ' '),
    color: 'gray',
  };
}

test('getTimelineEventConfig returns correct config for agreement.created', () => {
  const config = getTimelineEventConfig('agreement.created');
  assert.equal(config.label, 'Agreement Created');
  assert.equal(config.color, 'green');
});

test('getTimelineEventConfig returns correct config for agreement.sent', () => {
  const config = getTimelineEventConfig('agreement.sent');
  assert.equal(config.label, 'Sent for Signature');
  assert.equal(config.color, 'blue');
});

test('getTimelineEventConfig returns correct config for recipient.signed', () => {
  const config = getTimelineEventConfig('recipient.signed');
  assert.equal(config.label, 'Signed');
  assert.equal(config.color, 'green');
});

test('getTimelineEventConfig returns correct config for recipient.declined', () => {
  const config = getTimelineEventConfig('recipient.declined');
  assert.equal(config.label, 'Declined to Sign');
  assert.equal(config.color, 'orange');
});

test('getTimelineEventConfig returns fallback for unknown event type', () => {
  const config = getTimelineEventConfig('custom.event_type');
  assert.equal(config.label, 'custom event type');
  assert.equal(config.color, 'gray');
});

// =============================================================================
// E-Sign Delivery Status Rendering Tests
// =============================================================================

const DELIVERY_STATUS_CONFIG = {
  sent: { label: 'Sent', color: 'green', icon: 'check' },
  delivered: { label: 'Delivered', color: 'green', icon: 'check' },
  failed: { label: 'Failed', color: 'red', icon: 'x', retryable: true },
  bounced: { label: 'Bounced', color: 'red', icon: 'x', retryable: true },
  pending: { label: 'Pending', color: 'yellow', icon: 'clock' },
  queued: { label: 'Queued', color: 'yellow', icon: 'clock' },
  retrying: { label: 'Retrying', color: 'orange', icon: 'refresh', retryable: false },
};

function getDeliveryStatusConfig(status) {
  const normalized = (status || '').toLowerCase();
  return DELIVERY_STATUS_CONFIG[normalized] || { label: status || 'Unknown', color: 'gray', icon: 'question' };
}

function isRetryableDeliveryStatus(status) {
  const config = getDeliveryStatusConfig(status);
  return config.retryable === true;
}

test('getDeliveryStatusConfig returns correct config for sent', () => {
  const config = getDeliveryStatusConfig('sent');
  assert.equal(config.label, 'Sent');
  assert.equal(config.color, 'green');
});

test('getDeliveryStatusConfig returns correct config for failed', () => {
  const config = getDeliveryStatusConfig('failed');
  assert.equal(config.label, 'Failed');
  assert.equal(config.color, 'red');
  assert.equal(config.retryable, true);
});

test('isRetryableDeliveryStatus returns true for failed and bounced', () => {
  assert.equal(isRetryableDeliveryStatus('failed'), true);
  assert.equal(isRetryableDeliveryStatus('bounced'), true);
});

test('isRetryableDeliveryStatus returns false for non-retryable statuses', () => {
  assert.equal(isRetryableDeliveryStatus('sent'), false);
  assert.equal(isRetryableDeliveryStatus('pending'), false);
  assert.equal(isRetryableDeliveryStatus('retrying'), false);
});

// =============================================================================
// E-Sign Artifact Status Rendering Tests
// =============================================================================

const ARTIFACT_STATUS_CONFIG = {
  ready: { label: 'Ready', color: 'green', downloadable: true },
  pending: { label: 'Pending', color: 'yellow', downloadable: false },
  generating: { label: 'Generating', color: 'blue', downloadable: false },
  failed: { label: 'Failed', color: 'red', downloadable: false, retryable: true },
};

function getArtifactStatusConfig(status) {
  const normalized = (status || '').toLowerCase();
  return ARTIFACT_STATUS_CONFIG[normalized] || { label: status || 'Unknown', color: 'gray', downloadable: false };
}

function isArtifactDownloadable(status) {
  const config = getArtifactStatusConfig(status);
  return config.downloadable === true;
}

test('getArtifactStatusConfig returns correct config for ready', () => {
  const config = getArtifactStatusConfig('ready');
  assert.equal(config.label, 'Ready');
  assert.equal(config.color, 'green');
  assert.equal(config.downloadable, true);
});

test('getArtifactStatusConfig returns correct config for generating', () => {
  const config = getArtifactStatusConfig('generating');
  assert.equal(config.label, 'Generating');
  assert.equal(config.color, 'blue');
  assert.equal(config.downloadable, false);
});

test('isArtifactDownloadable returns true only for ready', () => {
  assert.equal(isArtifactDownloadable('ready'), true);
  assert.equal(isArtifactDownloadable('pending'), false);
  assert.equal(isArtifactDownloadable('generating'), false);
  assert.equal(isArtifactDownloadable('failed'), false);
});

// =============================================================================
// E-Sign Google Integration - Feature Gate Tests
// =============================================================================

/**
 * Google integration error codes
 */
const GOOGLE_ERROR_CODES = [
  'GOOGLE_ACCESS_REVOKED',
  'GOOGLE_RATE_LIMITED',
  'GOOGLE_PERMISSION_DENIED',
  'GOOGLE_SCOPE_VIOLATION',
  'GOOGLE_INTEGRATION_DISABLED',
];

/**
 * Get Google error info based on error code
 * @param {string} errorCode - Error code from API
 * @param {number} httpStatus - HTTP status code
 * @returns {Object}
 */
function getGoogleErrorInfo(errorCode, httpStatus) {
  const errorMessages = {
    'GOOGLE_ACCESS_REVOKED': {
      title: 'Access Revoked',
      message: 'Your Google account connection has been revoked. Please reconnect to continue.',
      actionText: 'Reconnect Google Account',
      actionUrl: '/admin/esign/integrations/google',
      icon: 'unlink',
      color: 'red'
    },
    'GOOGLE_RATE_LIMITED': {
      title: 'Rate Limit Exceeded',
      message: 'Too many requests to Google Drive. Please wait a moment before trying again.',
      actionText: 'Try Again',
      actionUrl: null,
      icon: 'clock',
      color: 'amber',
      retryable: true
    },
    'GOOGLE_PERMISSION_DENIED': {
      title: 'Permission Denied',
      message: 'You do not have permission to access this file or folder.',
      actionText: 'Check Permissions',
      actionUrl: null,
      icon: 'lock',
      color: 'red'
    },
    'GOOGLE_SCOPE_VIOLATION': {
      title: 'Insufficient Permissions',
      message: 'The connected Google account does not have the required permissions.',
      actionText: 'Reconnect Google Account',
      actionUrl: '/admin/esign/integrations/google',
      icon: 'shield',
      color: 'amber'
    },
    'GOOGLE_INTEGRATION_DISABLED': {
      title: 'Feature Disabled',
      message: 'Google Drive integration is not enabled for this installation.',
      actionText: null,
      actionUrl: null,
      icon: 'ban',
      color: 'gray'
    }
  };

  if (errorMessages[errorCode]) {
    return errorMessages[errorCode];
  }

  // Default error based on HTTP status
  if (httpStatus === 401) {
    return {
      title: 'Authentication Required',
      message: 'Your session has expired. Please reconnect your Google account.',
      actionText: 'Reconnect',
      actionUrl: '/admin/esign/integrations/google',
      icon: 'key',
      color: 'amber'
    };
  }
  if (httpStatus === 429) {
    return {
      title: 'Rate Limited',
      message: 'Too many requests. Please wait a moment before trying again.',
      actionText: 'Try Again',
      actionUrl: null,
      icon: 'clock',
      color: 'amber',
      retryable: true
    };
  }
  if (httpStatus >= 500) {
    return {
      title: 'Service Unavailable',
      message: 'Google Drive is temporarily unavailable. Please try again later.',
      actionText: 'Try Again',
      actionUrl: null,
      icon: 'server',
      color: 'red',
      retryable: true
    };
  }

  return {
    title: 'Error',
    message: 'An unexpected error occurred while accessing Google Drive.',
    actionText: 'Try Again',
    actionUrl: null,
    icon: 'alert',
    color: 'red',
    retryable: true
  };
}

/**
 * Check if a Google error requires reconnection
 * @param {string} errorCode - Error code
 * @returns {boolean}
 */
function isGoogleReconnectRequired(errorCode) {
  return errorCode === 'GOOGLE_ACCESS_REVOKED' || errorCode === 'GOOGLE_SCOPE_VIOLATION';
}

/**
 * Check if a Google error is retryable
 * @param {string} errorCode - Error code
 * @returns {boolean}
 */
function isGoogleErrorRetryable(errorCode) {
  return errorCode === 'GOOGLE_RATE_LIMITED';
}

/**
 * Check if Google integration is enabled based on feature flag response
 * @param {Object} config - Feature flags configuration
 * @returns {boolean}
 */
function isGoogleIntegrationEnabled(config) {
  return config?.features?.esign_google === true;
}

/**
 * Check if Google integration is connected
 * @param {Object} status - Integration status response
 * @returns {boolean}
 */
function isGoogleConnected(status) {
  return status?.integration?.connected === true;
}

/**
 * Check if Google token is expiring soon
 * @param {Object} status - Integration status response
 * @returns {boolean}
 */
function isGoogleTokenExpiringSoon(status) {
  return status?.integration?.is_expiring_soon === true || status?.integration?.is_expired === true;
}

/**
 * Determine Google integration UI state
 * @param {boolean} featureEnabled - Whether feature is enabled
 * @param {Object} status - Integration status
 * @returns {string} - 'disabled' | 'disconnected' | 'expiring' | 'connected'
 */
function getGoogleIntegrationUiState(featureEnabled, status) {
  if (!featureEnabled) return 'disabled';
  if (!isGoogleConnected(status)) return 'disconnected';
  if (isGoogleTokenExpiringSoon(status)) return 'expiring';
  return 'connected';
}

// Google Error Info Tests

test('getGoogleErrorInfo returns correct info for GOOGLE_ACCESS_REVOKED', () => {
  const info = getGoogleErrorInfo('GOOGLE_ACCESS_REVOKED', 401);
  assert.equal(info.title, 'Access Revoked');
  assert.equal(info.color, 'red');
  assert.ok(info.actionUrl);
});

test('getGoogleErrorInfo returns correct info for GOOGLE_RATE_LIMITED', () => {
  const info = getGoogleErrorInfo('GOOGLE_RATE_LIMITED', 429);
  assert.equal(info.title, 'Rate Limit Exceeded');
  assert.equal(info.color, 'amber');
  assert.equal(info.retryable, true);
});

test('getGoogleErrorInfo returns correct info for GOOGLE_PERMISSION_DENIED', () => {
  const info = getGoogleErrorInfo('GOOGLE_PERMISSION_DENIED', 403);
  assert.equal(info.title, 'Permission Denied');
  assert.equal(info.color, 'red');
});

test('getGoogleErrorInfo returns correct info for GOOGLE_SCOPE_VIOLATION', () => {
  const info = getGoogleErrorInfo('GOOGLE_SCOPE_VIOLATION', 400);
  assert.equal(info.title, 'Insufficient Permissions');
  assert.equal(info.color, 'amber');
  assert.ok(info.actionUrl);
});

test('getGoogleErrorInfo returns correct info for GOOGLE_INTEGRATION_DISABLED', () => {
  const info = getGoogleErrorInfo('GOOGLE_INTEGRATION_DISABLED', 404);
  assert.equal(info.title, 'Feature Disabled');
  assert.equal(info.color, 'gray');
  assert.equal(info.actionText, null);
});

test('getGoogleErrorInfo returns fallback for 401 without specific code', () => {
  const info = getGoogleErrorInfo('', 401);
  assert.equal(info.title, 'Authentication Required');
  assert.equal(info.color, 'amber');
});

test('getGoogleErrorInfo returns fallback for 429 without specific code', () => {
  const info = getGoogleErrorInfo('', 429);
  assert.equal(info.title, 'Rate Limited');
  assert.equal(info.retryable, true);
});

test('getGoogleErrorInfo returns fallback for 500+ errors', () => {
  const info = getGoogleErrorInfo('', 500);
  assert.equal(info.title, 'Service Unavailable');
  assert.equal(info.retryable, true);

  const info503 = getGoogleErrorInfo('', 503);
  assert.equal(info503.title, 'Service Unavailable');
});

test('getGoogleErrorInfo returns generic error for unknown codes', () => {
  const info = getGoogleErrorInfo('UNKNOWN_CODE', 400);
  assert.equal(info.title, 'Error');
  assert.equal(info.retryable, true);
});

// Google Reconnect/Retryable Tests

test('isGoogleReconnectRequired returns true for access revoked', () => {
  assert.equal(isGoogleReconnectRequired('GOOGLE_ACCESS_REVOKED'), true);
});

test('isGoogleReconnectRequired returns true for scope violation', () => {
  assert.equal(isGoogleReconnectRequired('GOOGLE_SCOPE_VIOLATION'), true);
});

test('isGoogleReconnectRequired returns false for other errors', () => {
  assert.equal(isGoogleReconnectRequired('GOOGLE_RATE_LIMITED'), false);
  assert.equal(isGoogleReconnectRequired('GOOGLE_PERMISSION_DENIED'), false);
  assert.equal(isGoogleReconnectRequired('GOOGLE_INTEGRATION_DISABLED'), false);
});

test('isGoogleErrorRetryable returns true for rate limited', () => {
  assert.equal(isGoogleErrorRetryable('GOOGLE_RATE_LIMITED'), true);
});

test('isGoogleErrorRetryable returns false for other errors', () => {
  assert.equal(isGoogleErrorRetryable('GOOGLE_ACCESS_REVOKED'), false);
  assert.equal(isGoogleErrorRetryable('GOOGLE_PERMISSION_DENIED'), false);
});

// Google Feature Gate Tests

test('isGoogleIntegrationEnabled returns true when feature flag is enabled', () => {
  const config = { features: { esign_google: true } };
  assert.equal(isGoogleIntegrationEnabled(config), true);
});

test('isGoogleIntegrationEnabled returns false when feature flag is disabled', () => {
  const config = { features: { esign_google: false } };
  assert.equal(isGoogleIntegrationEnabled(config), false);
});

test('isGoogleIntegrationEnabled returns false when feature flag is missing', () => {
  const config = { features: {} };
  assert.equal(isGoogleIntegrationEnabled(config), false);
});

test('isGoogleIntegrationEnabled returns false when config is null/undefined', () => {
  assert.equal(isGoogleIntegrationEnabled(null), false);
  assert.equal(isGoogleIntegrationEnabled(undefined), false);
});

// Google Connection Status Tests

test('isGoogleConnected returns true when connected', () => {
  const status = { integration: { connected: true, email: 'user@example.com' } };
  assert.equal(isGoogleConnected(status), true);
});

test('isGoogleConnected returns false when not connected', () => {
  const status = { integration: { connected: false } };
  assert.equal(isGoogleConnected(status), false);
});

test('isGoogleConnected returns false when status is missing', () => {
  assert.equal(isGoogleConnected(null), false);
  assert.equal(isGoogleConnected({}), false);
  assert.equal(isGoogleConnected({ integration: {} }), false);
});

test('isGoogleTokenExpiringSoon returns true when is_expiring_soon is true', () => {
  const status = { integration: { connected: true, is_expiring_soon: true } };
  assert.equal(isGoogleTokenExpiringSoon(status), true);
});

test('isGoogleTokenExpiringSoon returns true when is_expired is true', () => {
  const status = { integration: { connected: true, is_expired: true } };
  assert.equal(isGoogleTokenExpiringSoon(status), true);
});

test('isGoogleTokenExpiringSoon returns false when token is valid', () => {
  const status = { integration: { connected: true, is_expiring_soon: false, is_expired: false } };
  assert.equal(isGoogleTokenExpiringSoon(status), false);
});

// Google UI State Tests

test('getGoogleIntegrationUiState returns disabled when feature is off', () => {
  const status = { integration: { connected: true } };
  assert.equal(getGoogleIntegrationUiState(false, status), 'disabled');
});

test('getGoogleIntegrationUiState returns disconnected when not connected', () => {
  const status = { integration: { connected: false } };
  assert.equal(getGoogleIntegrationUiState(true, status), 'disconnected');
});

test('getGoogleIntegrationUiState returns disconnected when status is null', () => {
  assert.equal(getGoogleIntegrationUiState(true, null), 'disconnected');
});

test('getGoogleIntegrationUiState returns expiring when token is expiring', () => {
  const status = { integration: { connected: true, is_expiring_soon: true } };
  assert.equal(getGoogleIntegrationUiState(true, status), 'expiring');
});

test('getGoogleIntegrationUiState returns expiring when token is expired', () => {
  const status = { integration: { connected: true, is_expired: true } };
  assert.equal(getGoogleIntegrationUiState(true, status), 'expiring');
});

test('getGoogleIntegrationUiState returns connected when fully connected', () => {
  const status = { integration: { connected: true, is_expiring_soon: false, is_expired: false } };
  assert.equal(getGoogleIntegrationUiState(true, status), 'connected');
});

// Google Error Code Extraction Tests

test('extractStructuredError extracts GOOGLE_ACCESS_REVOKED correctly', async () => {
  const response = mockResponse({
    error: {
      text_code: 'GOOGLE_ACCESS_REVOKED',
      message: 'Google integration access was revoked',
    },
  }, { status: 401 });

  const result = await extractStructuredError(response);
  assert.equal(result.textCode, 'GOOGLE_ACCESS_REVOKED');
});

test('extractStructuredError extracts GOOGLE_RATE_LIMITED correctly', async () => {
  const response = mockResponse({
    error: {
      text_code: 'GOOGLE_RATE_LIMITED',
      message: 'Google provider rate limit exceeded',
    },
  }, { status: 429 });

  const result = await extractStructuredError(response);
  assert.equal(result.textCode, 'GOOGLE_RATE_LIMITED');
});

test('extractStructuredError extracts GOOGLE_PERMISSION_DENIED correctly', async () => {
  const response = mockResponse({
    error: {
      text_code: 'GOOGLE_PERMISSION_DENIED',
      message: 'Google provider denied permission for the requested operation',
      metadata: {
        file_id: 'abc123',
      },
    },
  }, { status: 403 });

  const result = await extractStructuredError(response);
  assert.equal(result.textCode, 'GOOGLE_PERMISSION_DENIED');
});

test('extractStructuredError extracts GOOGLE_INTEGRATION_DISABLED correctly', async () => {
  const response = mockResponse({
    error: {
      text_code: 'GOOGLE_INTEGRATION_DISABLED',
      message: 'Google integration is disabled by feature flag',
    },
  }, { status: 404 });

  const result = await extractStructuredError(response);
  assert.equal(result.textCode, 'GOOGLE_INTEGRATION_DISABLED');
});

test('all Google error codes are recognized', async () => {
  for (const code of GOOGLE_ERROR_CODES) {
    const response = mockResponse({
      error: {
        text_code: code,
        message: `Error: ${code}`,
      },
    }, { status: 400 });

    const result = await extractStructuredError(response);
    assert.equal(result.textCode, code, `Error code ${code} should be extracted`);
  }
});
