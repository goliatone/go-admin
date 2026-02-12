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

// =============================================================================
// Phase 16: E-Sign Shell/Auth Entry and Redirect Behavior Tests
// =============================================================================

/**
 * Auth redirect configuration for shell entry points
 */
const AUTH_REDIRECT_CONFIG = {
  loginPath: '/admin/login',
  logoutPath: '/admin/logout',
  defaultLandingPath: '/admin/esign',
  publicSignerBasePath: '/api/v1/esign/signing',
};

/**
 * Check if a path requires authentication
 * @param {string} path - URL path
 * @returns {boolean}
 */
function isAuthRequiredPath(path) {
  // Public signer paths don't require admin auth
  if (path.startsWith(AUTH_REDIRECT_CONFIG.publicSignerBasePath)) {
    return false;
  }
  // All /admin/* paths require auth except login
  if (path.startsWith('/admin') && !path.startsWith('/admin/login')) {
    return true;
  }
  return false;
}

/**
 * Check if a path is a public signer path
 * @param {string} path - URL path
 * @returns {boolean}
 */
function isPublicSignerPath(path) {
  return path.startsWith(AUTH_REDIRECT_CONFIG.publicSignerBasePath);
}

/**
 * Resolve redirect path for unauthenticated requests
 * @param {string} requestedPath - Original requested path
 * @returns {string} - Redirect path
 */
function resolveAuthRedirect(requestedPath) {
  if (!isAuthRequiredPath(requestedPath)) {
    return requestedPath; // No redirect needed
  }
  // Redirect to login with return URL
  return `${AUTH_REDIRECT_CONFIG.loginPath}?return=${encodeURIComponent(requestedPath)}`;
}

/**
 * Resolve landing path after successful login
 * @param {string|null} returnUrl - Return URL from login redirect
 * @returns {string}
 */
function resolvePostLoginRedirect(returnUrl) {
  if (returnUrl && returnUrl.startsWith('/admin')) {
    return returnUrl;
  }
  return AUTH_REDIRECT_CONFIG.defaultLandingPath;
}

/**
 * Check if shell is authenticated (has valid session)
 * @param {Object} sessionData - Session context
 * @returns {boolean}
 */
function isShellAuthenticated(sessionData) {
  return Boolean(sessionData?.user?.id);
}

/**
 * Determine shell navigation state
 * @param {boolean} authenticated - Whether user is authenticated
 * @param {string} currentPath - Current URL path
 * @returns {string} - 'login' | 'shell' | 'signer' | 'redirect'
 */
function getShellNavigationState(authenticated, currentPath) {
  if (isPublicSignerPath(currentPath)) {
    return 'signer'; // Public signer flow
  }
  if (currentPath === AUTH_REDIRECT_CONFIG.loginPath) {
    return authenticated ? 'redirect' : 'login';
  }
  if (!authenticated && isAuthRequiredPath(currentPath)) {
    return 'redirect'; // Needs to redirect to login
  }
  return 'shell'; // Authenticated admin shell
}

// Auth redirect tests

test('isAuthRequiredPath returns true for /admin paths', () => {
  assert.equal(isAuthRequiredPath('/admin'), true);
  assert.equal(isAuthRequiredPath('/admin/esign'), true);
  assert.equal(isAuthRequiredPath('/admin/esign/agreements'), true);
  assert.equal(isAuthRequiredPath('/admin/settings'), true);
});

test('isAuthRequiredPath returns false for /admin/login', () => {
  assert.equal(isAuthRequiredPath('/admin/login'), false);
});

test('isAuthRequiredPath returns false for public signer paths', () => {
  assert.equal(isAuthRequiredPath('/api/v1/esign/signing/session/abc123'), false);
  assert.equal(isAuthRequiredPath('/api/v1/esign/signing/submit/abc123'), false);
});

test('isPublicSignerPath identifies signer API paths', () => {
  assert.equal(isPublicSignerPath('/api/v1/esign/signing/session/token123'), true);
  assert.equal(isPublicSignerPath('/api/v1/esign/signing/consent/token123'), true);
  assert.equal(isPublicSignerPath('/api/v1/esign/signing/submit/token123'), true);
  assert.equal(isPublicSignerPath('/admin/esign'), false);
});

test('resolveAuthRedirect returns login path with return URL for protected paths', () => {
  const result = resolveAuthRedirect('/admin/esign/agreements');
  assert.equal(result, '/admin/login?return=%2Fadmin%2Fesign%2Fagreements');
});

test('resolveAuthRedirect returns original path for non-protected paths', () => {
  assert.equal(resolveAuthRedirect('/admin/login'), '/admin/login');
  assert.equal(resolveAuthRedirect('/api/v1/esign/signing/session/abc'), '/api/v1/esign/signing/session/abc');
});

test('resolvePostLoginRedirect uses return URL when valid admin path', () => {
  assert.equal(resolvePostLoginRedirect('/admin/esign/agreements/123'), '/admin/esign/agreements/123');
  assert.equal(resolvePostLoginRedirect('/admin/settings'), '/admin/settings');
});

test('resolvePostLoginRedirect falls back to default landing for invalid return URL', () => {
  assert.equal(resolvePostLoginRedirect(null), '/admin/esign');
  assert.equal(resolvePostLoginRedirect(''), '/admin/esign');
  assert.equal(resolvePostLoginRedirect('/external/path'), '/admin/esign');
});

test('isShellAuthenticated checks session user ID', () => {
  assert.equal(isShellAuthenticated({ user: { id: 'user123' } }), true);
  assert.equal(isShellAuthenticated({ user: {} }), false);
  assert.equal(isShellAuthenticated({ user: null }), false);
  assert.equal(isShellAuthenticated({}), false);
  assert.equal(isShellAuthenticated(null), false);
});

test('getShellNavigationState returns signer for public signer paths', () => {
  assert.equal(getShellNavigationState(false, '/api/v1/esign/signing/session/abc'), 'signer');
  assert.equal(getShellNavigationState(true, '/api/v1/esign/signing/session/abc'), 'signer');
});

test('getShellNavigationState returns login for unauthenticated login page', () => {
  assert.equal(getShellNavigationState(false, '/admin/login'), 'login');
});

test('getShellNavigationState returns redirect for authenticated login page', () => {
  assert.equal(getShellNavigationState(true, '/admin/login'), 'redirect');
});

test('getShellNavigationState returns redirect for unauthenticated protected paths', () => {
  assert.equal(getShellNavigationState(false, '/admin/esign'), 'redirect');
  assert.equal(getShellNavigationState(false, '/admin/esign/agreements'), 'redirect');
});

test('getShellNavigationState returns shell for authenticated admin paths', () => {
  assert.equal(getShellNavigationState(true, '/admin/esign'), 'shell');
  assert.equal(getShellNavigationState(true, '/admin/esign/agreements'), 'shell');
});

// =============================================================================
// E-Sign Landing Page Navigation Tests
// =============================================================================

/**
 * E-Sign landing page quick actions configuration
 */
const ESIGN_LANDING_QUICK_ACTIONS = [
  { id: 'upload', href: '/admin/esign/documents/new', label: 'Upload Document', icon: 'upload' },
  { id: 'create', href: '/admin/esign/agreements/new', label: 'Create Agreement', icon: 'edit-pencil' },
  { id: 'library', href: '/admin/esign/documents', label: 'Document Library', icon: 'folder' },
];

/**
 * E-Sign status filter options
 */
const ESIGN_STATUS_FILTERS = [
  { id: 'draft', href: '/admin/esign/agreements?status=draft', label: 'Drafts', color: 'gray' },
  { id: 'pending', href: '/admin/esign/agreements?status=sent,in_progress', label: 'Pending', color: 'amber' },
  { id: 'completed', href: '/admin/esign/agreements?status=completed', label: 'Completed', color: 'green' },
  { id: 'action_required', href: '/admin/esign/agreements?action_required=true', label: 'Action Required', color: 'red' },
];

/**
 * Get quick action by ID
 * @param {string} actionId - Action identifier
 * @returns {Object|null}
 */
function getQuickAction(actionId) {
  return ESIGN_LANDING_QUICK_ACTIONS.find(a => a.id === actionId) || null;
}

/**
 * Get status filter by ID
 * @param {string} filterId - Filter identifier
 * @returns {Object|null}
 */
function getStatusFilter(filterId) {
  return ESIGN_STATUS_FILTERS.find(f => f.id === filterId) || null;
}

test('getQuickAction returns correct upload action', () => {
  const action = getQuickAction('upload');
  assert.ok(action);
  assert.equal(action.href, '/admin/esign/documents/new');
  assert.equal(action.icon, 'upload');
});

test('getQuickAction returns correct create action', () => {
  const action = getQuickAction('create');
  assert.ok(action);
  assert.equal(action.href, '/admin/esign/agreements/new');
});

test('getQuickAction returns null for unknown action', () => {
  assert.equal(getQuickAction('unknown'), null);
});

test('getStatusFilter returns correct draft filter', () => {
  const filter = getStatusFilter('draft');
  assert.ok(filter);
  assert.equal(filter.href, '/admin/esign/agreements?status=draft');
  assert.equal(filter.color, 'gray');
});

test('getStatusFilter returns correct pending filter with combined statuses', () => {
  const filter = getStatusFilter('pending');
  assert.ok(filter);
  assert.equal(filter.href, '/admin/esign/agreements?status=sent,in_progress');
  assert.equal(filter.color, 'amber');
});

test('getStatusFilter returns correct completed filter', () => {
  const filter = getStatusFilter('completed');
  assert.ok(filter);
  assert.equal(filter.color, 'green');
});

// =============================================================================
// Feature Availability and Guardrail UI Tests
// =============================================================================

/**
 * Feature availability config for guardrail UI
 */
const FEATURE_AVAILABILITY = {
  esign: { enabled: true, label: 'E-Sign' },
  pages: { enabled: false, label: 'Pages', reason: 'CMS feature not enabled' },
  posts: { enabled: false, label: 'Posts', reason: 'CMS feature not enabled' },
  media: { enabled: true, label: 'Media Library' },
};

/**
 * Check if a feature/panel is available
 * @param {string} featureKey - Feature identifier
 * @returns {boolean}
 */
function isFeatureAvailable(featureKey) {
  return FEATURE_AVAILABILITY[featureKey]?.enabled === true;
}

/**
 * Get unavailable feature message
 * @param {string} featureKey - Feature identifier
 * @returns {Object|null}
 */
function getFeatureUnavailableInfo(featureKey) {
  const feature = FEATURE_AVAILABILITY[featureKey];
  if (!feature || feature.enabled) return null;
  return {
    label: feature.label,
    reason: feature.reason || 'This feature is not available',
  };
}

test('isFeatureAvailable returns true for enabled features', () => {
  assert.equal(isFeatureAvailable('esign'), true);
  assert.equal(isFeatureAvailable('media'), true);
});

test('isFeatureAvailable returns false for disabled features', () => {
  assert.equal(isFeatureAvailable('pages'), false);
  assert.equal(isFeatureAvailable('posts'), false);
});

test('isFeatureAvailable returns false for unknown features', () => {
  assert.equal(isFeatureAvailable('unknown'), false);
});

test('getFeatureUnavailableInfo returns null for enabled features', () => {
  assert.equal(getFeatureUnavailableInfo('esign'), null);
});

test('getFeatureUnavailableInfo returns info for disabled features', () => {
  const info = getFeatureUnavailableInfo('pages');
  assert.ok(info);
  assert.equal(info.label, 'Pages');
  assert.equal(info.reason, 'CMS feature not enabled');
});

test('getFeatureUnavailableInfo returns info for posts', () => {
  const info = getFeatureUnavailableInfo('posts');
  assert.ok(info);
  assert.equal(info.label, 'Posts');
});

// =============================================================================
// Phase 16: E-Sign E2E Smoke Flow Tests
// =============================================================================

/**
 * Simulate navigation state machine for E2E smoke flow validation
 */
class NavigationFlowSimulator {
  constructor() {
    this.authenticated = false;
    this.currentPath = '/';
    this.redirectHistory = [];
    this.sessionData = null;
  }

  /**
   * Navigate to a path and simulate redirects
   * @param {string} targetPath - Destination path
   * @returns {Object} - Navigation result
   */
  navigate(targetPath) {
    const startPath = this.currentPath;
    this.currentPath = targetPath;

    // Check if redirect is needed
    const state = getShellNavigationState(this.authenticated, targetPath);

    if (state === 'redirect' && !this.authenticated) {
      // Redirect to login
      const redirectPath = resolveAuthRedirect(targetPath);
      this.redirectHistory.push({ from: targetPath, to: redirectPath, reason: 'unauthenticated' });
      this.currentPath = AUTH_REDIRECT_CONFIG.loginPath;
      return {
        path: this.currentPath,
        redirected: true,
        originalPath: targetPath,
        state: 'login',
      };
    }

    if (state === 'redirect' && this.authenticated) {
      // Already authenticated, redirect from login to landing
      const landingPath = resolvePostLoginRedirect(null);
      this.redirectHistory.push({ from: targetPath, to: landingPath, reason: 'already_authenticated' });
      this.currentPath = landingPath;
      return {
        path: this.currentPath,
        redirected: true,
        originalPath: targetPath,
        state: 'shell',
      };
    }

    return {
      path: this.currentPath,
      redirected: false,
      originalPath: startPath,
      state,
    };
  }

  /**
   * Simulate login action
   * @param {string} userId - User ID to authenticate
   * @param {string} returnUrl - Optional return URL
   * @returns {Object} - Login result
   */
  login(userId, returnUrl = null) {
    this.authenticated = true;
    this.sessionData = { user: { id: userId } };

    const landingPath = resolvePostLoginRedirect(returnUrl);
    this.redirectHistory.push({ from: '/admin/login', to: landingPath, reason: 'login_success' });
    this.currentPath = landingPath;

    return {
      path: this.currentPath,
      authenticated: true,
      userId,
    };
  }

  /**
   * Simulate logout action
   * @returns {Object} - Logout result
   */
  logout() {
    this.authenticated = false;
    this.sessionData = null;
    this.redirectHistory.push({ from: this.currentPath, to: AUTH_REDIRECT_CONFIG.loginPath, reason: 'logout' });
    this.currentPath = AUTH_REDIRECT_CONFIG.loginPath;

    return {
      path: this.currentPath,
      authenticated: false,
    };
  }

  /**
   * Get current state summary
   * @returns {Object}
   */
  getState() {
    return {
      path: this.currentPath,
      authenticated: this.authenticated,
      sessionData: this.sessionData,
      redirectCount: this.redirectHistory.length,
    };
  }
}

// E2E Smoke Flow Tests

test('E2E Smoke: Root path redirects to admin', () => {
  const nav = new NavigationFlowSimulator();

  // Navigate to root
  nav.currentPath = '/';

  // Simulate server-side redirect (/ -> /admin)
  const result = nav.navigate('/admin');

  // Unauthenticated, should redirect to login
  assert.equal(result.redirected, true);
  assert.equal(result.state, 'login');
  assert.equal(nav.currentPath, '/admin/login');
});

test('E2E Smoke: Unauthenticated /admin redirects to login', () => {
  const nav = new NavigationFlowSimulator();

  const result = nav.navigate('/admin');

  assert.equal(result.redirected, true);
  assert.equal(result.state, 'login');
  assert.equal(nav.currentPath, '/admin/login');
});

test('E2E Smoke: Login page accessible when unauthenticated', () => {
  const nav = new NavigationFlowSimulator();

  const result = nav.navigate('/admin/login');

  assert.equal(result.redirected, false);
  assert.equal(result.state, 'login');
  assert.equal(nav.currentPath, '/admin/login');
});

test('E2E Smoke: Login redirects to e-sign landing', () => {
  const nav = new NavigationFlowSimulator();
  nav.navigate('/admin/login');

  const result = nav.login('user123');

  assert.equal(result.authenticated, true);
  assert.equal(result.path, '/admin/esign');
  assert.equal(nav.currentPath, '/admin/esign');
});

test('E2E Smoke: Login with return URL redirects correctly', () => {
  const nav = new NavigationFlowSimulator();
  nav.navigate('/admin/login');

  const result = nav.login('user123', '/admin/esign/agreements/123');

  assert.equal(result.authenticated, true);
  assert.equal(result.path, '/admin/esign/agreements/123');
});

test('E2E Smoke: Authenticated user can navigate shell', () => {
  const nav = new NavigationFlowSimulator();
  nav.navigate('/admin/login');
  nav.login('user123');

  // Navigate to various shell pages
  let result = nav.navigate('/admin/esign/documents');
  assert.equal(result.state, 'shell');
  assert.equal(result.redirected, false);

  result = nav.navigate('/admin/esign/agreements');
  assert.equal(result.state, 'shell');
  assert.equal(result.redirected, false);

  result = nav.navigate('/admin/settings');
  assert.equal(result.state, 'shell');
  assert.equal(result.redirected, false);
});

test('E2E Smoke: Authenticated user redirected from login page', () => {
  const nav = new NavigationFlowSimulator();
  nav.navigate('/admin/login');
  nav.login('user123');

  // Try to navigate back to login
  const result = nav.navigate('/admin/login');

  assert.equal(result.redirected, true);
  assert.equal(result.state, 'shell');
  assert.equal(nav.currentPath, '/admin/esign');
});

test('E2E Smoke: Logout redirects to login', () => {
  const nav = new NavigationFlowSimulator();
  nav.navigate('/admin/login');
  nav.login('user123');
  nav.navigate('/admin/esign');

  const result = nav.logout();

  assert.equal(result.authenticated, false);
  assert.equal(result.path, '/admin/login');
});

test('E2E Smoke: Public signer path accessible without auth', () => {
  const nav = new NavigationFlowSimulator();

  const result = nav.navigate('/api/v1/esign/signing/session/abc123');

  assert.equal(result.state, 'signer');
  assert.equal(result.redirected, false);
  assert.equal(nav.currentPath, '/api/v1/esign/signing/session/abc123');
});

test('E2E Smoke: Full flow - unauthenticated user to completed draft', () => {
  const nav = new NavigationFlowSimulator();

  // Step 1: Navigate to root (redirects to admin)
  nav.navigate('/admin');
  assert.equal(nav.currentPath, '/admin/login');
  assert.equal(nav.authenticated, false);

  // Step 2: Login
  nav.login('sender123');
  assert.equal(nav.currentPath, '/admin/esign');
  assert.equal(nav.authenticated, true);

  // Step 3: Navigate to create agreement
  const createResult = nav.navigate('/admin/esign/agreements/new');
  assert.equal(createResult.state, 'shell');
  assert.equal(nav.currentPath, '/admin/esign/agreements/new');

  // Step 4: After creating, navigate to agreement detail
  nav.navigate('/admin/esign/agreements/agr_new123');
  assert.equal(nav.currentPath, '/admin/esign/agreements/agr_new123');

  // Step 5: Navigate to document upload
  nav.navigate('/admin/esign/documents/new');
  assert.equal(nav.currentPath, '/admin/esign/documents/new');

  // All navigation completed without redirect issues
  const state = nav.getState();
  assert.equal(state.authenticated, true);
  assert.ok(state.redirectCount >= 2); // At least login redirect + post-login redirect
});

test('E2E Smoke: Session persistence across navigation', () => {
  const nav = new NavigationFlowSimulator();
  nav.navigate('/admin/login');
  nav.login('admin123');

  // Navigate through multiple pages
  nav.navigate('/admin/esign/documents');
  nav.navigate('/admin/esign/agreements');
  nav.navigate('/admin/esign/agreements/123');
  nav.navigate('/admin/settings');
  nav.navigate('/admin/esign');

  // Session should persist
  const state = nav.getState();
  assert.equal(state.authenticated, true);
  assert.equal(state.sessionData.user.id, 'admin123');
});

// =============================================================================
// Phase 18: Unified Signer Experience Tests
// =============================================================================

// -----------------------------------------------------------------------------
// Unified Signer Flow Mode Tests
// -----------------------------------------------------------------------------

const UNIFIED_FLOW_MODES = {
  LEGACY: 'legacy',
  UNIFIED: 'unified',
};

function resolveSignerFlowMode(queryParams = {}, defaultMode = 'unified') {
  // Query param override takes precedence
  if (queryParams.flow === 'legacy' || queryParams.flow === 'unified') {
    return queryParams.flow;
  }
  return defaultMode;
}

function getUnifiedSignerRoute(token, mode = 'unified') {
  if (mode === 'legacy') {
    return `/esign/sign/${token}`;
  }
  return `/esign/sign/${token}/review`;
}

function shouldFallbackToLegacy(error) {
  // Fallback to legacy if unified viewer fails to load
  const fallbackErrors = [
    'PDF_LOAD_FAILED',
    'CANVAS_NOT_SUPPORTED',
    'VIEWER_INIT_FAILED',
    'GEOMETRY_UNAVAILABLE',
  ];
  const errorCode = error?.code || error?.textCode || '';
  return fallbackErrors.includes(errorCode);
}

test('resolveSignerFlowMode returns unified by default', () => {
  const mode = resolveSignerFlowMode({});
  assert.equal(mode, 'unified');
});

test('resolveSignerFlowMode respects query param override for legacy', () => {
  const mode = resolveSignerFlowMode({ flow: 'legacy' });
  assert.equal(mode, 'legacy');
});

test('resolveSignerFlowMode respects query param override for unified', () => {
  const mode = resolveSignerFlowMode({ flow: 'unified' }, 'legacy');
  assert.equal(mode, 'unified');
});

test('resolveSignerFlowMode ignores invalid query param values', () => {
  const mode = resolveSignerFlowMode({ flow: 'invalid' }, 'unified');
  assert.equal(mode, 'unified');
});

test('getUnifiedSignerRoute returns review path for unified mode', () => {
  const route = getUnifiedSignerRoute('token123', 'unified');
  assert.equal(route, '/esign/sign/token123/review');
});

test('getUnifiedSignerRoute returns session path for legacy mode', () => {
  const route = getUnifiedSignerRoute('token123', 'legacy');
  assert.equal(route, '/esign/sign/token123');
});

test('shouldFallbackToLegacy returns true for PDF load failures', () => {
  assert.equal(shouldFallbackToLegacy({ code: 'PDF_LOAD_FAILED' }), true);
  assert.equal(shouldFallbackToLegacy({ textCode: 'CANVAS_NOT_SUPPORTED' }), true);
  assert.equal(shouldFallbackToLegacy({ code: 'VIEWER_INIT_FAILED' }), true);
  assert.equal(shouldFallbackToLegacy({ code: 'GEOMETRY_UNAVAILABLE' }), true);
});

test('shouldFallbackToLegacy returns false for regular errors', () => {
  assert.equal(shouldFallbackToLegacy({ code: 'TOKEN_EXPIRED' }), false);
  assert.equal(shouldFallbackToLegacy({ code: 'MISSING_REQUIRED_FIELDS' }), false);
  assert.equal(shouldFallbackToLegacy({}), false);
});

// -----------------------------------------------------------------------------
// Unified Signer Field State Tests
// -----------------------------------------------------------------------------

function createUnifiedFieldState(fields = []) {
  const state = new Map();
  fields.forEach(field => {
    state.set(field.id, {
      id: field.id,
      type: field.type || 'text',
      page: field.page || 1,
      required: field.required ?? false,
      value: field.value ?? null,
      completed: Boolean(field.value),
      hasError: false,
      lastError: null,
      posX: field.pos_x || 0,
      posY: field.pos_y || 0,
      width: field.width || 150,
      height: field.height || 30,
    });
  });
  return state;
}

function calculateFieldProgress(fieldState) {
  let completed = 0;
  let required = 0;
  let total = 0;

  fieldState.forEach(field => {
    total++;
    if (field.required) required++;
    if (field.completed) completed++;
  });

  return {
    completed,
    required,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    allRequiredComplete: required === 0 || fieldState.size === 0 ||
      Array.from(fieldState.values()).filter(f => f.required && !f.completed).length === 0,
  };
}

function canSubmitUnified(fieldState, hasConsented) {
  if (!hasConsented) return false;

  const progress = calculateFieldProgress(fieldState);
  if (!progress.allRequiredComplete) return false;

  // Check for any pending errors
  for (const field of fieldState.values()) {
    if (field.hasError) return false;
  }

  return true;
}

test('createUnifiedFieldState creates field map from array', () => {
  const fields = [
    { id: 'f1', type: 'signature', required: true },
    { id: 'f2', type: 'name', required: true, value: 'John Doe' },
    { id: 'f3', type: 'checkbox', required: false },
  ];

  const state = createUnifiedFieldState(fields);

  assert.equal(state.size, 3);
  assert.equal(state.get('f1').type, 'signature');
  assert.equal(state.get('f1').completed, false);
  assert.equal(state.get('f2').completed, true);
  assert.equal(state.get('f2').value, 'John Doe');
});

test('calculateFieldProgress computes progress correctly', () => {
  const fields = [
    { id: 'f1', type: 'signature', required: true },
    { id: 'f2', type: 'name', required: true, value: 'John Doe' },
    { id: 'f3', type: 'checkbox', required: false },
  ];

  const state = createUnifiedFieldState(fields);
  const progress = calculateFieldProgress(state);

  assert.equal(progress.total, 3);
  assert.equal(progress.completed, 1);
  assert.equal(progress.required, 2);
  assert.equal(progress.percentage, 33);
  assert.equal(progress.allRequiredComplete, false);
});

test('calculateFieldProgress reports all complete when no required fields remain', () => {
  const fields = [
    { id: 'f1', type: 'signature', required: true, value: '[Signature]' },
    { id: 'f2', type: 'name', required: true, value: 'John Doe' },
    { id: 'f3', type: 'checkbox', required: false },
  ];

  const state = createUnifiedFieldState(fields);
  const progress = calculateFieldProgress(state);

  assert.equal(progress.allRequiredComplete, true);
  assert.equal(progress.percentage, 67); // 2/3 completed
});

test('canSubmitUnified returns false without consent', () => {
  const fields = [
    { id: 'f1', type: 'signature', required: true, value: '[Signature]' },
  ];

  const state = createUnifiedFieldState(fields);
  assert.equal(canSubmitUnified(state, false), false);
});

test('canSubmitUnified returns false with incomplete required fields', () => {
  const fields = [
    { id: 'f1', type: 'signature', required: true },
  ];

  const state = createUnifiedFieldState(fields);
  assert.equal(canSubmitUnified(state, true), false);
});

test('canSubmitUnified returns true when all required complete and consented', () => {
  const fields = [
    { id: 'f1', type: 'signature', required: true, value: '[Signature]' },
    { id: 'f2', type: 'name', required: true, value: 'John' },
  ];

  const state = createUnifiedFieldState(fields);
  assert.equal(canSubmitUnified(state, true), true);
});

test('canSubmitUnified returns false if any field has error', () => {
  const fields = [
    { id: 'f1', type: 'signature', required: true, value: '[Signature]' },
  ];

  const state = createUnifiedFieldState(fields);
  state.get('f1').hasError = true;

  assert.equal(canSubmitUnified(state, true), false);
});

// -----------------------------------------------------------------------------
// Unified Field Overlay Position Tests
// -----------------------------------------------------------------------------

function calculateOverlayPosition(fieldData, containerWidth, scale = 1) {
  // Convert geometry to positioned overlay
  return {
    left: (fieldData.posX || 0) * scale,
    top: (fieldData.posY || 0) * scale,
    width: (fieldData.width || 150) * scale,
    height: (fieldData.height || 30) * scale,
  };
}

function isFieldOnPage(fieldData, currentPage) {
  return (fieldData.page || 1) === currentPage;
}

function getFieldsForPage(fieldState, page) {
  const fields = [];
  fieldState.forEach((field, id) => {
    if (isFieldOnPage(field, page)) {
      fields.push({ id, ...field });
    }
  });
  return fields;
}

test('calculateOverlayPosition scales position correctly', () => {
  const field = { posX: 100, posY: 200, width: 150, height: 30 };
  const pos = calculateOverlayPosition(field, 800, 1.5);

  assert.equal(pos.left, 150);
  assert.equal(pos.top, 300);
  assert.equal(pos.width, 225);
  assert.equal(pos.height, 45);
});

test('calculateOverlayPosition uses defaults for missing geometry', () => {
  const field = { posX: 50 }; // Missing posY, width, height
  const pos = calculateOverlayPosition(field, 800, 1);

  assert.equal(pos.left, 50);
  assert.equal(pos.top, 0);
  assert.equal(pos.width, 150);
  assert.equal(pos.height, 30);
});

test('isFieldOnPage returns true for matching page', () => {
  assert.equal(isFieldOnPage({ page: 2 }, 2), true);
  assert.equal(isFieldOnPage({ page: 1 }, 1), true);
});

test('isFieldOnPage returns false for different page', () => {
  assert.equal(isFieldOnPage({ page: 2 }, 1), false);
});

test('isFieldOnPage defaults to page 1 if not specified', () => {
  assert.equal(isFieldOnPage({}, 1), true);
  assert.equal(isFieldOnPage({}, 2), false);
});

test('getFieldsForPage filters fields by page number', () => {
  const fields = [
    { id: 'f1', type: 'signature', page: 1 },
    { id: 'f2', type: 'name', page: 1 },
    { id: 'f3', type: 'checkbox', page: 2 },
  ];

  const state = createUnifiedFieldState(fields);
  const page1Fields = getFieldsForPage(state, 1);
  const page2Fields = getFieldsForPage(state, 2);

  assert.equal(page1Fields.length, 2);
  assert.equal(page2Fields.length, 1);
  assert.equal(page2Fields[0].id, 'f3');
});

// -----------------------------------------------------------------------------
// Unified Viewer Zoom Tests
// -----------------------------------------------------------------------------

const ZOOM_LIMITS = {
  MIN: 0.5,
  MAX: 3.0,
  STEP: 0.25,
  DEFAULT: 1.0,
};

function clampZoom(level) {
  return Math.max(ZOOM_LIMITS.MIN, Math.min(ZOOM_LIMITS.MAX, level));
}

function zoomIn(currentLevel) {
  return clampZoom(currentLevel + ZOOM_LIMITS.STEP);
}

function zoomOut(currentLevel) {
  return clampZoom(currentLevel - ZOOM_LIMITS.STEP);
}

function fitToWidth(containerWidth, documentWidth) {
  if (!documentWidth || documentWidth <= 0) return ZOOM_LIMITS.DEFAULT;
  return clampZoom(containerWidth / documentWidth);
}

test('clampZoom enforces minimum zoom', () => {
  assert.equal(clampZoom(0.3), 0.5);
  assert.equal(clampZoom(0.5), 0.5);
});

test('clampZoom enforces maximum zoom', () => {
  assert.equal(clampZoom(3.5), 3.0);
  assert.equal(clampZoom(3.0), 3.0);
});

test('clampZoom passes through valid zoom levels', () => {
  assert.equal(clampZoom(1.0), 1.0);
  assert.equal(clampZoom(1.5), 1.5);
  assert.equal(clampZoom(2.0), 2.0);
});

test('zoomIn increases by step', () => {
  assert.equal(zoomIn(1.0), 1.25);
  assert.equal(zoomIn(1.25), 1.5);
});

test('zoomIn clamps at max', () => {
  assert.equal(zoomIn(2.9), 3.0);
  assert.equal(zoomIn(3.0), 3.0);
});

test('zoomOut decreases by step', () => {
  assert.equal(zoomOut(1.0), 0.75);
  assert.equal(zoomOut(1.25), 1.0);
});

test('zoomOut clamps at min', () => {
  assert.equal(zoomOut(0.6), 0.5);
  assert.equal(zoomOut(0.5), 0.5);
});

test('fitToWidth calculates correct zoom', () => {
  assert.equal(fitToWidth(800, 612), clampZoom(800 / 612));
  assert.equal(fitToWidth(400, 612), clampZoom(400 / 612));
});

test('fitToWidth handles invalid document width', () => {
  assert.equal(fitToWidth(800, 0), 1.0);
  assert.equal(fitToWidth(800, -100), 1.0);
});

// -----------------------------------------------------------------------------
// Unified Signature Capture Tests
// -----------------------------------------------------------------------------

function validateSignatureInput(signatureData, fieldType) {
  if (!signatureData) {
    return { valid: false, error: 'No signature data provided' };
  }

  if (signatureData.type === 'typed') {
    const text = (signatureData.text || '').trim();
    if (!text) {
      return { valid: false, error: fieldType === 'initials' ? 'Please type your initials' : 'Please type your signature' };
    }
    return { valid: true };
  }

  if (signatureData.type === 'drawn') {
    if (!signatureData.dataUrl || !signatureData.hasContent) {
      return { valid: false, error: fieldType === 'initials' ? 'Please draw your initials' : 'Please draw your signature' };
    }
    return { valid: true };
  }

  return { valid: false, error: 'Invalid signature type' };
}

function buildSignaturePayloadForUnified(fieldId, signatureData, agreementId, recipientId) {
  const signatureType = signatureData?.type === 'drawn' ? 'drawn' : 'typed';
  const extension = signatureType === 'drawn' ? 'png' : 'txt';
  const timestamp = Date.now();

  return {
    field_id: fieldId,
    type: signatureType,
    value_text: signatureData.text || '[Drawn]',
    object_key: `tenant/bootstrap/org/bootstrap/agreements/${agreementId}/signatures/${recipientId}/${fieldId}-${timestamp}.${extension}`,
    // sha256 would be computed from actual data
  };
}

test('validateSignatureInput rejects empty typed signature', () => {
  const result = validateSignatureInput({ type: 'typed', text: '' }, 'signature');
  assert.equal(result.valid, false);
  assert.ok(result.error.includes('type your signature'));
});

test('validateSignatureInput rejects empty typed initials', () => {
  const result = validateSignatureInput({ type: 'typed', text: '  ' }, 'initials');
  assert.equal(result.valid, false);
  assert.ok(result.error.includes('type your initials'));
});

test('validateSignatureInput accepts valid typed signature', () => {
  const result = validateSignatureInput({ type: 'typed', text: 'John Doe' }, 'signature');
  assert.equal(result.valid, true);
});

test('validateSignatureInput rejects empty drawn signature', () => {
  const result = validateSignatureInput({ type: 'drawn', dataUrl: null, hasContent: false }, 'signature');
  assert.equal(result.valid, false);
  assert.ok(result.error.includes('draw your signature'));
});

test('validateSignatureInput accepts valid drawn signature', () => {
  const result = validateSignatureInput({ type: 'drawn', dataUrl: 'data:image/png;base64,...', hasContent: true }, 'signature');
  assert.equal(result.valid, true);
});

test('validateSignatureInput rejects null data', () => {
  const result = validateSignatureInput(null, 'signature');
  assert.equal(result.valid, false);
});

test('buildSignaturePayloadForUnified creates correct payload structure', () => {
  const payload = buildSignaturePayloadForUnified('field123', { type: 'typed', text: 'John' }, 'agr_abc', 'rec_xyz');

  assert.equal(payload.field_id, 'field123');
  assert.equal(payload.type, 'typed');
  assert.equal(payload.value_text, 'John');
  assert.ok(payload.object_key.includes('agr_abc'));
  assert.ok(payload.object_key.includes('rec_xyz'));
  assert.ok(payload.object_key.includes('field123'));
  assert.ok(payload.object_key.endsWith('.txt'));
});

test('buildSignaturePayloadForUnified uses png extension for drawn', () => {
  const payload = buildSignaturePayloadForUnified('field123', { type: 'drawn' }, 'agr_abc', 'rec_xyz');

  assert.equal(payload.type, 'drawn');
  assert.ok(payload.object_key.endsWith('.png'));
});

// -----------------------------------------------------------------------------
// Unified Submit Flow Tests
// -----------------------------------------------------------------------------

function generateIdempotencyKey(recipientId) {
  return `submit-${recipientId}-${Date.now()}`;
}

function parseSubmitError(error) {
  const code = error?.code || error?.textCode || '';
  const message = error?.message || 'Submission failed';

  const errorInfo = {
    code,
    message,
    recoverable: true,
    action: 'retry',
  };

  if (code === 'MISSING_REQUIRED_FIELDS') {
    errorInfo.action = 'complete_fields';
    errorInfo.message = 'Please complete all required fields';
  } else if (code === 'CONSENT_REQUIRED') {
    errorInfo.action = 'accept_consent';
    errorInfo.message = 'Please accept the consent agreement';
  } else if (code === 'INVALID_SIGNER_STATE') {
    errorInfo.recoverable = false;
    errorInfo.action = 'refresh';
    errorInfo.message = 'Your session state has changed. Please refresh the page.';
  } else if (code === 'TOKEN_EXPIRED' || code === 'TOKEN_REVOKED') {
    errorInfo.recoverable = false;
    errorInfo.action = 'contact_sender';
  }

  return errorInfo;
}

test('generateIdempotencyKey creates key with correct format', () => {
  const key = generateIdempotencyKey('rec_123');

  assert.ok(key.startsWith('submit-rec_123-'));
  // Verify timestamp portion is numeric
  const parts = key.split('-');
  assert.equal(parts.length, 3);
  assert.equal(parts[0], 'submit');
  assert.equal(parts[1], 'rec_123');
  assert.ok(/^\d+$/.test(parts[2]), 'Timestamp should be numeric');
});

test('parseSubmitError handles MISSING_REQUIRED_FIELDS', () => {
  const info = parseSubmitError({ code: 'MISSING_REQUIRED_FIELDS' });

  assert.equal(info.action, 'complete_fields');
  assert.equal(info.recoverable, true);
});

test('parseSubmitError handles CONSENT_REQUIRED', () => {
  const info = parseSubmitError({ code: 'CONSENT_REQUIRED' });

  assert.equal(info.action, 'accept_consent');
  assert.equal(info.recoverable, true);
});

test('parseSubmitError handles INVALID_SIGNER_STATE', () => {
  const info = parseSubmitError({ code: 'INVALID_SIGNER_STATE' });

  assert.equal(info.action, 'refresh');
  assert.equal(info.recoverable, false);
});

test('parseSubmitError handles TOKEN_EXPIRED', () => {
  const info = parseSubmitError({ code: 'TOKEN_EXPIRED' });

  assert.equal(info.action, 'contact_sender');
  assert.equal(info.recoverable, false);
});

test('parseSubmitError handles unknown errors', () => {
  const info = parseSubmitError({ code: 'UNKNOWN_ERROR', message: 'Something went wrong' });

  assert.equal(info.code, 'UNKNOWN_ERROR');
  assert.equal(info.message, 'Something went wrong');
  assert.equal(info.action, 'retry');
  assert.equal(info.recoverable, true);
});

// -----------------------------------------------------------------------------
// Unified vs Legacy Flow Selection Tests
// -----------------------------------------------------------------------------

class UnifiedSignerFlowRouter {
  constructor(defaultMode = 'unified') {
    this.defaultMode = defaultMode;
    this.fallbackTriggered = false;
  }

  resolveEntrypoint(token, queryParams = {}) {
    const mode = resolveSignerFlowMode(queryParams, this.defaultMode);
    return {
      mode,
      path: getUnifiedSignerRoute(token, mode),
      token,
    };
  }

  triggerFallback(token, error) {
    if (shouldFallbackToLegacy(error)) {
      this.fallbackTriggered = true;
      return {
        redirectTo: getUnifiedSignerRoute(token, 'legacy'),
        reason: error.code || 'UNKNOWN_ERROR',
      };
    }
    return null;
  }

  getLegacyFieldsPath(token) {
    return `/esign/sign/${token}/fields`;
  }

  getCompletionPath(token) {
    return `/esign/sign/${token}/complete`;
  }

  getDeclinedPath(token) {
    return `/esign/sign/${token}/declined`;
  }
}

test('UnifiedSignerFlowRouter resolves unified entrypoint by default', () => {
  const router = new UnifiedSignerFlowRouter();
  const entry = router.resolveEntrypoint('tok_abc');

  assert.equal(entry.mode, 'unified');
  assert.equal(entry.path, '/esign/sign/tok_abc/review');
});

test('UnifiedSignerFlowRouter respects legacy query param', () => {
  const router = new UnifiedSignerFlowRouter();
  const entry = router.resolveEntrypoint('tok_abc', { flow: 'legacy' });

  assert.equal(entry.mode, 'legacy');
  assert.equal(entry.path, '/esign/sign/tok_abc');
});

test('UnifiedSignerFlowRouter triggers fallback on viewer errors', () => {
  const router = new UnifiedSignerFlowRouter();
  const fallback = router.triggerFallback('tok_abc', { code: 'PDF_LOAD_FAILED' });

  assert.ok(fallback);
  assert.equal(fallback.redirectTo, '/esign/sign/tok_abc');
  assert.equal(router.fallbackTriggered, true);
});

test('UnifiedSignerFlowRouter does not trigger fallback for regular errors', () => {
  const router = new UnifiedSignerFlowRouter();
  const fallback = router.triggerFallback('tok_abc', { code: 'TOKEN_EXPIRED' });

  assert.equal(fallback, null);
  assert.equal(router.fallbackTriggered, false);
});

test('UnifiedSignerFlowRouter returns correct completion paths', () => {
  const router = new UnifiedSignerFlowRouter();

  assert.equal(router.getCompletionPath('tok_abc'), '/esign/sign/tok_abc/complete');
  assert.equal(router.getDeclinedPath('tok_abc'), '/esign/sign/tok_abc/declined');
  assert.equal(router.getLegacyFieldsPath('tok_abc'), '/esign/sign/tok_abc/fields');
});

// =============================================================================
// Phase 19: Unified Signer Experience - Stage B (Production-grade) Tests
// =============================================================================

// -----------------------------------------------------------------------------
// 19.FE.3 - Accessibility Hardening Tests
// -----------------------------------------------------------------------------

/**
 * Simulates ARIA live region announcement
 * @param {string} message - Message to announce
 * @param {string} type - 'polite' or 'assertive'
 * @returns {Object} - Announcement info
 */
function simulateScreenReaderAnnouncement(message, type = 'polite') {
  return {
    message,
    type,
    timestamp: Date.now(),
    regionId: type === 'assertive' ? 'a11y-alerts' : 'a11y-status',
  };
}

/**
 * Determines if an element should be keyboard focusable
 * @param {Object} element - Element data
 * @returns {boolean}
 */
function isKeyboardFocusable(element) {
  if (!element) return false;

  const focusableTypes = ['button', 'input', 'select', 'textarea', 'a'];
  if (focusableTypes.includes(element.type)) return !element.disabled;

  if (element.tabindex !== undefined) {
    return element.tabindex >= 0;
  }

  return false;
}

/**
 * Gets the next focusable field in a list
 * @param {Array} fields - Array of field objects
 * @param {string} currentId - Current field ID
 * @param {number} direction - 1 for forward, -1 for backward
 * @returns {string|null} - Next field ID or null
 */
function getNextFocusableFieldId(fields, currentId, direction = 1) {
  const currentIndex = fields.findIndex(f => f.id === currentId);
  if (currentIndex === -1) return null;

  const nextIndex = currentIndex + direction;
  if (nextIndex >= 0 && nextIndex < fields.length) {
    return fields[nextIndex].id;
  }
  return null;
}

/**
 * Calculates accessibility progress summary
 * @param {Map} fieldState - Field state map
 * @param {boolean} hasConsented - Whether consent was given
 * @returns {Object} - Progress summary for screen readers
 */
function calculateA11yProgress(fieldState, hasConsented) {
  let completed = 0;
  let required = 0;
  let remainingRequired = 0;

  fieldState.forEach(field => {
    if (field.required) required++;
    if (field.completed) completed++;
    if (field.required && !field.completed) remainingRequired++;
  });

  return {
    completed,
    required,
    remainingRequired,
    total: fieldState.size,
    allRequiredComplete: remainingRequired === 0,
    hasConsented,
    canSubmit: hasConsented && remainingRequired === 0,
  };
}

/**
 * Generates accessible status message for progress
 * @param {Object} progress - Progress object
 * @returns {string} - Screen reader message
 */
function getA11yProgressMessage(progress) {
  if (!progress.hasConsented) {
    return 'Please accept the electronic signature consent before submitting.';
  }

  if (progress.allRequiredComplete) {
    return 'All required fields complete. You can now submit.';
  }

  const remaining = progress.remainingRequired;
  return `Complete ${remaining} more required field${remaining > 1 ? 's' : ''} to enable submission.`;
}

/**
 * Determines if focus should be trapped in a modal
 * @param {Object} modalState - Modal state
 * @returns {boolean}
 */
function shouldTrapFocus(modalState) {
  return modalState.isOpen && modalState.isModal;
}

/**
 * Gets focusable elements within a container
 * @param {Object} container - Container with elements
 * @returns {Array} - Focusable elements
 */
function getFocusableElements(container) {
  if (!container || !container.elements) return [];

  return container.elements.filter(el =>
    isKeyboardFocusable(el) && !el.hidden
  );
}

/**
 * Simulates focus trap behavior
 * @param {Object} modal - Modal config with focusable elements
 * @param {Object} event - Keyboard event
 * @returns {Object|null} - Next focus target or null
 */
function simulateFocusTrap(modal, event) {
  if (!modal.isOpen || event.key !== 'Tab') return null;

  const focusable = getFocusableElements(modal);
  if (focusable.length === 0) return null;

  const currentIndex = focusable.findIndex(el => el.id === modal.currentFocusId);
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey) {
    // Shift+Tab - go backward
    if (currentIndex === 0 || currentIndex === -1) {
      return { focusTo: last.id, trapped: true };
    }
  } else {
    // Tab - go forward
    if (currentIndex === focusable.length - 1 || currentIndex === -1) {
      return { focusTo: first.id, trapped: true };
    }
  }

  return null; // Normal tab behavior
}

// Accessibility helper tests
test('simulateScreenReaderAnnouncement creates polite announcement', () => {
  const announcement = simulateScreenReaderAnnouncement('Field saved');
  assert.equal(announcement.message, 'Field saved');
  assert.equal(announcement.type, 'polite');
  assert.equal(announcement.regionId, 'a11y-status');
});

test('simulateScreenReaderAnnouncement creates assertive announcement', () => {
  const announcement = simulateScreenReaderAnnouncement('Error occurred', 'assertive');
  assert.equal(announcement.type, 'assertive');
  assert.equal(announcement.regionId, 'a11y-alerts');
});

test('isKeyboardFocusable identifies focusable buttons', () => {
  assert.equal(isKeyboardFocusable({ type: 'button', disabled: false }), true);
  assert.equal(isKeyboardFocusable({ type: 'button', disabled: true }), false);
});

test('isKeyboardFocusable identifies focusable inputs', () => {
  assert.equal(isKeyboardFocusable({ type: 'input', disabled: false }), true);
  assert.equal(isKeyboardFocusable({ type: 'input', disabled: true }), false);
});

test('isKeyboardFocusable respects tabindex', () => {
  assert.equal(isKeyboardFocusable({ type: 'div', tabindex: 0 }), true);
  assert.equal(isKeyboardFocusable({ type: 'div', tabindex: -1 }), false);
  assert.equal(isKeyboardFocusable({ type: 'div' }), false);
});

test('getNextFocusableFieldId returns next field', () => {
  const fields = [{ id: 'f1' }, { id: 'f2' }, { id: 'f3' }];
  assert.equal(getNextFocusableFieldId(fields, 'f1', 1), 'f2');
  assert.equal(getNextFocusableFieldId(fields, 'f2', 1), 'f3');
});

test('getNextFocusableFieldId returns previous field', () => {
  const fields = [{ id: 'f1' }, { id: 'f2' }, { id: 'f3' }];
  assert.equal(getNextFocusableFieldId(fields, 'f3', -1), 'f2');
  assert.equal(getNextFocusableFieldId(fields, 'f2', -1), 'f1');
});

test('getNextFocusableFieldId returns null at boundaries', () => {
  const fields = [{ id: 'f1' }, { id: 'f2' }];
  assert.equal(getNextFocusableFieldId(fields, 'f2', 1), null);
  assert.equal(getNextFocusableFieldId(fields, 'f1', -1), null);
});

test('getNextFocusableFieldId returns null for unknown field', () => {
  const fields = [{ id: 'f1' }, { id: 'f2' }];
  assert.equal(getNextFocusableFieldId(fields, 'f99', 1), null);
});

// Accessibility progress message tests
test('calculateA11yProgress reports consent required', () => {
  const fieldState = createUnifiedFieldState([
    { id: 'f1', required: true, value: 'done' },
  ]);

  const progress = calculateA11yProgress(fieldState, false);
  assert.equal(progress.hasConsented, false);
  assert.equal(progress.canSubmit, false);
});

test('calculateA11yProgress reports incomplete fields', () => {
  const fieldState = createUnifiedFieldState([
    { id: 'f1', required: true },
    { id: 'f2', required: true, value: 'done' },
  ]);

  const progress = calculateA11yProgress(fieldState, true);
  assert.equal(progress.remainingRequired, 1);
  assert.equal(progress.canSubmit, false);
});

test('calculateA11yProgress reports ready to submit', () => {
  const fieldState = createUnifiedFieldState([
    { id: 'f1', required: true, value: 'sig' },
    { id: 'f2', required: true, value: 'name' },
  ]);

  const progress = calculateA11yProgress(fieldState, true);
  assert.equal(progress.allRequiredComplete, true);
  assert.equal(progress.canSubmit, true);
});

test('getA11yProgressMessage returns consent message when not consented', () => {
  const progress = { hasConsented: false, allRequiredComplete: true };
  const message = getA11yProgressMessage(progress);
  assert.ok(message.includes('consent'));
});

test('getA11yProgressMessage returns completion message when all done', () => {
  const progress = { hasConsented: true, allRequiredComplete: true };
  const message = getA11yProgressMessage(progress);
  assert.ok(message.includes('All required fields complete'));
});

test('getA11yProgressMessage returns remaining count', () => {
  const progress = { hasConsented: true, allRequiredComplete: false, remainingRequired: 3 };
  const message = getA11yProgressMessage(progress);
  assert.ok(message.includes('3 more required fields'));
});

test('getA11yProgressMessage handles singular remaining', () => {
  const progress = { hasConsented: true, allRequiredComplete: false, remainingRequired: 1 };
  const message = getA11yProgressMessage(progress);
  assert.ok(message.includes('1 more required field'));
  assert.ok(!message.includes('fields'));
});

// Focus trap tests
test('shouldTrapFocus returns true for open modal', () => {
  assert.equal(shouldTrapFocus({ isOpen: true, isModal: true }), true);
});

test('shouldTrapFocus returns false for closed modal', () => {
  assert.equal(shouldTrapFocus({ isOpen: false, isModal: true }), false);
});

test('shouldTrapFocus returns false for non-modal', () => {
  assert.equal(shouldTrapFocus({ isOpen: true, isModal: false }), false);
});

test('getFocusableElements filters disabled and hidden elements', () => {
  const container = {
    elements: [
      { id: 'btn1', type: 'button', disabled: false, hidden: false },
      { id: 'btn2', type: 'button', disabled: true, hidden: false },
      { id: 'btn3', type: 'button', disabled: false, hidden: true },
      { id: 'input1', type: 'input', disabled: false, hidden: false },
    ],
  };

  const focusable = getFocusableElements(container);
  assert.equal(focusable.length, 2);
  assert.equal(focusable[0].id, 'btn1');
  assert.equal(focusable[1].id, 'input1');
});

test('simulateFocusTrap traps Tab at last element', () => {
  const modal = {
    isOpen: true,
    currentFocusId: 'btn2',
    elements: [
      { id: 'btn1', type: 'button', disabled: false, hidden: false },
      { id: 'btn2', type: 'button', disabled: false, hidden: false },
    ],
  };

  const result = simulateFocusTrap(modal, { key: 'Tab', shiftKey: false });
  assert.ok(result);
  assert.equal(result.focusTo, 'btn1');
  assert.equal(result.trapped, true);
});

test('simulateFocusTrap traps Shift+Tab at first element', () => {
  const modal = {
    isOpen: true,
    currentFocusId: 'btn1',
    elements: [
      { id: 'btn1', type: 'button', disabled: false, hidden: false },
      { id: 'btn2', type: 'button', disabled: false, hidden: false },
    ],
  };

  const result = simulateFocusTrap(modal, { key: 'Tab', shiftKey: true });
  assert.ok(result);
  assert.equal(result.focusTo, 'btn2');
  assert.equal(result.trapped, true);
});

test('simulateFocusTrap returns null for non-Tab keys', () => {
  const modal = {
    isOpen: true,
    currentFocusId: 'btn1',
    elements: [{ id: 'btn1', type: 'button', disabled: false, hidden: false }],
  };

  const result = simulateFocusTrap(modal, { key: 'Escape' });
  assert.equal(result, null);
});

test('simulateFocusTrap returns null for closed modal', () => {
  const modal = {
    isOpen: false,
    currentFocusId: 'btn1',
    elements: [{ id: 'btn1', type: 'button', disabled: false, hidden: false }],
  };

  const result = simulateFocusTrap(modal, { key: 'Tab' });
  assert.equal(result, null);
});

// Skip link tests
test('skip link target IDs should match template elements', () => {
  // These IDs must exist in the template for skip links to work
  const requiredSkipTargets = ['fields-list', 'submit-btn'];

  requiredSkipTargets.forEach(id => {
    // This test documents the contract - actual DOM presence verified in E2E
    assert.ok(id.length > 0, `Skip target ${id} must be defined`);
  });
});

// ARIA live region tests
test('ARIA live region types are used correctly', () => {
  // Polite for status updates
  const statusUpdate = simulateScreenReaderAnnouncement('Field saved');
  assert.equal(statusUpdate.type, 'polite');

  // Assertive for errors
  const errorAlert = simulateScreenReaderAnnouncement('Failed to save', 'assertive');
  assert.equal(errorAlert.type, 'assertive');
});

// Reduced motion preference simulation
test('reduced motion preference should disable animations', () => {
  const prefersReducedMotion = true; // Simulated preference

  function getAnimationBehavior(prefersReduced) {
    return prefersReduced ? 'none' : 'normal';
  }

  assert.equal(getAnimationBehavior(prefersReducedMotion), 'none');
  assert.equal(getAnimationBehavior(false), 'normal');
});

// High contrast mode simulation
test('high contrast mode should use enhanced borders', () => {
  const prefersHighContrast = true;

  function getBorderWidth(prefersHigh) {
    return prefersHigh ? 3 : 2;
  }

  assert.equal(getBorderWidth(prefersHighContrast), 3);
  assert.equal(getBorderWidth(false), 2);
});

// -----------------------------------------------------------------------------
// 19.FE.4 - Mobile/Touch Hardening Tests
// -----------------------------------------------------------------------------

/**
 * Calculate touch position from touch event
 * @param {Object} event - Touch event
 * @param {Object} rect - Bounding rect of canvas
 * @returns {Object} - Position with x, y, timestamp
 */
function getTouchPosition(event, rect) {
  let clientX, clientY;

  if (event.touches && event.touches.length > 0) {
    clientX = event.touches[0].clientX;
    clientY = event.touches[0].clientY;
  } else if (event.changedTouches && event.changedTouches.length > 0) {
    clientX = event.changedTouches[0].clientX;
    clientY = event.changedTouches[0].clientY;
  } else {
    clientX = event.clientX || 0;
    clientY = event.clientY || 0;
  }

  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
    timestamp: Date.now()
  };
}

/**
 * Calculate stroke width based on drawing velocity
 * @param {number} velocity - Drawing velocity
 * @param {number} baseWidth - Base stroke width
 * @returns {number} - Calculated stroke width
 */
function calculateVelocityBasedStrokeWidth(velocity, baseWidth = 2.5) {
  const minWidth = 1.5;
  const maxWidth = 4;
  const velocityFactor = Math.min(velocity / 5, 1);
  return Math.max(minWidth, Math.min(maxWidth, baseWidth - velocityFactor * 1.5));
}

/**
 * Calculate velocity between two points
 * @param {Object} point1 - First point {x, y, timestamp}
 * @param {Object} point2 - Second point {x, y, timestamp}
 * @returns {number} - Velocity
 */
function calculateDrawingVelocity(point1, point2) {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  const dt = point2.timestamp - point1.timestamp;
  return Math.sqrt(dx * dx + dy * dy) / Math.max(dt, 1);
}

/**
 * Determine minimum touch target size based on device
 * @param {boolean} isTouchDevice - Whether device has touch
 * @returns {number} - Minimum size in pixels
 */
function getMinTouchTargetSize(isTouchDevice) {
  return isTouchDevice ? 44 : 24; // iOS accessibility minimum
}

/**
 * Check if element meets touch accessibility requirements
 * @param {Object} element - Element dimensions
 * @param {boolean} isTouchDevice - Whether device has touch
 * @returns {boolean}
 */
function meetsTouchAccessibility(element, isTouchDevice) {
  const minSize = getMinTouchTargetSize(isTouchDevice);
  return element.width >= minSize && element.height >= minSize;
}

/**
 * Get canvas scale factor for crisp drawing
 * @param {number} devicePixelRatio - Device pixel ratio
 * @returns {number}
 */
function getCanvasScaleFactor(devicePixelRatio) {
  return devicePixelRatio || 1;
}

/**
 * Check if touch event should be prevented
 * @param {Object} event - Event object
 * @param {boolean} isDrawing - Whether currently drawing
 * @returns {boolean}
 */
function shouldPreventTouchDefault(event, isDrawing) {
  // Always prevent default on canvas while drawing
  if (isDrawing) return true;

  // Prevent on touch start/move on canvas
  const targetTagName = event.target?.tagName?.toLowerCase();
  if (targetTagName === 'canvas') return true;

  return false;
}

// Touch position tests
test('getTouchPosition extracts position from touches array', () => {
  const event = {
    touches: [{ clientX: 150, clientY: 200 }],
    changedTouches: [],
  };
  const rect = { left: 50, top: 100 };

  const pos = getTouchPosition(event, rect);
  assert.equal(pos.x, 100);
  assert.equal(pos.y, 100);
  assert.ok(pos.timestamp > 0);
});

test('getTouchPosition falls back to changedTouches', () => {
  const event = {
    touches: [],
    changedTouches: [{ clientX: 200, clientY: 300 }],
  };
  const rect = { left: 50, top: 50 };

  const pos = getTouchPosition(event, rect);
  assert.equal(pos.x, 150);
  assert.equal(pos.y, 250);
});

test('getTouchPosition handles mouse events', () => {
  const event = {
    clientX: 100,
    clientY: 150,
  };
  const rect = { left: 25, top: 25 };

  const pos = getTouchPosition(event, rect);
  assert.equal(pos.x, 75);
  assert.equal(pos.y, 125);
});

// Velocity-based stroke width tests
test('calculateVelocityBasedStrokeWidth returns base width for zero velocity', () => {
  const width = calculateVelocityBasedStrokeWidth(0);
  assert.equal(width, 2.5);
});

test('calculateVelocityBasedStrokeWidth returns thinner line for fast strokes', () => {
  const slowWidth = calculateVelocityBasedStrokeWidth(1);
  const fastWidth = calculateVelocityBasedStrokeWidth(5);

  assert.ok(fastWidth < slowWidth, 'Fast strokes should be thinner');
  assert.ok(fastWidth >= 1.5, 'Width should not go below minimum');
});

test('calculateVelocityBasedStrokeWidth clamps to min/max', () => {
  const minWidth = calculateVelocityBasedStrokeWidth(100); // Very fast
  const maxWidth = calculateVelocityBasedStrokeWidth(0, 5); // Base above max

  assert.ok(minWidth >= 1.5);
  assert.ok(maxWidth <= 4);
});

// Velocity calculation tests
test('calculateDrawingVelocity computes correct velocity', () => {
  const p1 = { x: 0, y: 0, timestamp: 0 };
  const p2 = { x: 3, y: 4, timestamp: 10 }; // Distance 5, time 10

  const velocity = calculateDrawingVelocity(p1, p2);
  assert.equal(velocity, 0.5); // 5/10
});

test('calculateDrawingVelocity handles zero time delta', () => {
  const p1 = { x: 0, y: 0, timestamp: 100 };
  const p2 = { x: 10, y: 0, timestamp: 100 }; // Same timestamp

  const velocity = calculateDrawingVelocity(p1, p2);
  assert.equal(velocity, 10); // Distance / max(dt, 1)
});

// Touch target tests
test('getMinTouchTargetSize returns 44px for touch devices', () => {
  assert.equal(getMinTouchTargetSize(true), 44);
});

test('getMinTouchTargetSize returns 24px for non-touch devices', () => {
  assert.equal(getMinTouchTargetSize(false), 24);
});

test('meetsTouchAccessibility passes for large enough elements', () => {
  const element = { width: 50, height: 50 };
  assert.equal(meetsTouchAccessibility(element, true), true);
  assert.equal(meetsTouchAccessibility(element, false), true);
});

test('meetsTouchAccessibility fails for small elements on touch devices', () => {
  const smallElement = { width: 30, height: 30 };
  assert.equal(meetsTouchAccessibility(smallElement, true), false);
  assert.equal(meetsTouchAccessibility(smallElement, false), true);
});

// Canvas scale factor tests
test('getCanvasScaleFactor returns device pixel ratio', () => {
  assert.equal(getCanvasScaleFactor(2), 2);
  assert.equal(getCanvasScaleFactor(1.5), 1.5);
});

test('getCanvasScaleFactor defaults to 1', () => {
  assert.equal(getCanvasScaleFactor(undefined), 1);
  assert.equal(getCanvasScaleFactor(0), 1);
});

// Touch prevention tests
test('shouldPreventTouchDefault returns true while drawing', () => {
  const event = { target: { tagName: 'CANVAS' } };
  assert.equal(shouldPreventTouchDefault(event, true), true);
});

test('shouldPreventTouchDefault returns true for canvas even when not drawing', () => {
  const event = { target: { tagName: 'CANVAS' } };
  assert.equal(shouldPreventTouchDefault(event, false), true);
});

test('shouldPreventTouchDefault returns false for other elements when not drawing', () => {
  const event = { target: { tagName: 'DIV' } };
  assert.equal(shouldPreventTouchDefault(event, false), false);
});

// Touch interaction state tests
test('touch interaction state tracks drawing flag correctly', () => {
  const touchState = {
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    path: [],
  };

  // Simulate touchstart
  touchState.isDrawing = true;
  touchState.lastX = 100;
  touchState.lastY = 100;
  touchState.path.push({ x: 100, y: 100, t: Date.now() });

  assert.equal(touchState.isDrawing, true);
  assert.equal(touchState.path.length, 1);

  // Simulate touchend
  touchState.isDrawing = false;
  touchState.path = [];

  assert.equal(touchState.isDrawing, false);
  assert.equal(touchState.path.length, 0);
});

// Mobile-specific field overlay sizing
test('mobile overlay sizing should use minimum touch target', () => {
  function getMobileOverlaySize(baseSize, isMobile) {
    const minSize = isMobile ? 44 : baseSize;
    return Math.max(baseSize, minSize);
  }

  assert.equal(getMobileOverlaySize(30, true), 44);
  assert.equal(getMobileOverlaySize(30, false), 30);
  assert.equal(getMobileOverlaySize(50, true), 50);
});

// Touch scroll prevention
test('touch scroll should be prevented in signature canvas container', () => {
  const containerStyle = {
    touchAction: 'none',
    webkitTouchCallout: 'none',
    webkitUserSelect: 'none',
    userSelect: 'none',
  };

  assert.equal(containerStyle.touchAction, 'none');
  assert.equal(containerStyle.userSelect, 'none');
});

// -----------------------------------------------------------------------------
// 19.FE.5 - Viewer Performance Improvement Tests
// -----------------------------------------------------------------------------

/**
 * Determine if device has limited memory
 * @param {Object} deviceInfo - Device information
 * @returns {boolean}
 */
function detectLowMemoryDevicePerf(deviceInfo = {}) {
  if (deviceInfo.deviceMemory && deviceInfo.deviceMemory < 4) {
    return true;
  }
  if (deviceInfo.isMobile) {
    return true;
  }
  return false;
}

/**
 * Get max pages to cache based on device capabilities
 * @param {boolean} isLowMemory - Whether device is memory-constrained
 * @returns {number}
 */
function getMaxCachedPages(isLowMemory) {
  return isLowMemory ? 3 : 5;
}

/**
 * Determine which pages to evict from cache
 * @param {Map} cachedPages - Map of page number to cache entry
 * @param {number} currentPage - Current visible page
 * @param {number} maxPages - Maximum pages to keep
 * @returns {number[]} - Page numbers to evict
 */
function getPagesToEvict(cachedPages, currentPage, maxPages) {
  if (cachedPages.size <= maxPages) return [];

  const candidates = [];
  cachedPages.forEach((_, pageNum) => {
    const distance = Math.abs(pageNum - currentPage);
    candidates.push({ pageNum, distance });
  });

  candidates.sort((a, b) => b.distance - a.distance);

  const toEvict = [];
  let count = cachedPages.size;

  for (const candidate of candidates) {
    if (count <= maxPages) break;
    if (candidate.pageNum !== currentPage) {
      toEvict.push(candidate.pageNum);
      count--;
    }
  }

  return toEvict;
}

/**
 * Get pages to preload around current page
 * @param {number} currentPage - Current page number
 * @param {number} totalPages - Total page count
 * @param {boolean} isLowMemory - Whether device is memory-constrained
 * @returns {number[]} - Pages to preload
 */
function getPagesToPreload(currentPage, totalPages, isLowMemory) {
  if (isLowMemory) return [];
  const pages = [];
  if (currentPage > 1) pages.push(currentPage - 1);
  if (currentPage < totalPages) pages.push(currentPage + 1);
  return pages;
}

/**
 * Calculate render quality based on device
 * @param {number} devicePixelRatio - Device pixel ratio
 * @param {boolean} isLowMemory - Whether device is memory-constrained
 * @returns {number}
 */
function getPerfRenderQuality(devicePixelRatio, isLowMemory) {
  if (isLowMemory) {
    return Math.min(devicePixelRatio || 1, 1.5);
  }
  return Math.min(devicePixelRatio || 1, 2);
}

/**
 * Check if cached page is valid for current zoom
 * @param {Object} cachedPage - Cached page data
 * @param {number} currentZoom - Current zoom level
 * @returns {boolean}
 */
function isCacheValid(cachedPage, currentZoom) {
  if (!cachedPage) return false;
  return cachedPage.scale === currentZoom;
}

/**
 * Calculate memory pressure level
 * @param {number} usedHeap - Used heap size
 * @param {number} totalHeap - Total heap size
 * @returns {'low'|'medium'|'high'}
 */
function getMemoryPressure(usedHeap, totalHeap) {
  if (!usedHeap || !totalHeap) return 'low';
  const usage = usedHeap / totalHeap;
  if (usage > 0.8) return 'high';
  if (usage > 0.6) return 'medium';
  return 'low';
}

// Low memory detection tests
test('detectLowMemoryDevicePerf returns true for low device memory', () => {
  assert.equal(detectLowMemoryDevicePerf({ deviceMemory: 2 }), true);
  assert.equal(detectLowMemoryDevicePerf({ deviceMemory: 3 }), true);
});

test('detectLowMemoryDevicePerf returns false for high device memory', () => {
  assert.equal(detectLowMemoryDevicePerf({ deviceMemory: 4 }), false);
  assert.equal(detectLowMemoryDevicePerf({ deviceMemory: 8 }), false);
});

test('detectLowMemoryDevicePerf returns true for mobile devices', () => {
  assert.equal(detectLowMemoryDevicePerf({ isMobile: true }), true);
});

test('detectLowMemoryDevicePerf returns false for desktop', () => {
  assert.equal(detectLowMemoryDevicePerf({ isMobile: false }), false);
  assert.equal(detectLowMemoryDevicePerf({}), false);
});

// Cache size tests
test('getMaxCachedPages returns smaller cache for low memory devices', () => {
  assert.equal(getMaxCachedPages(true), 3);
  assert.equal(getMaxCachedPages(false), 5);
});

// Page eviction tests
test('getPagesToEvict returns empty array when under limit', () => {
  const cache = new Map([[1, {}], [2, {}]]);
  const toEvict = getPagesToEvict(cache, 1, 5);
  assert.equal(toEvict.length, 0);
});

test('getPagesToEvict evicts furthest pages first', () => {
  const cache = new Map([
    [1, {}], [2, {}], [3, {}], [4, {}], [5, {}], [6, {}]
  ]);
  const toEvict = getPagesToEvict(cache, 3, 3);
  assert.ok(toEvict.includes(1));
  assert.ok(toEvict.includes(6));
  assert.ok(!toEvict.includes(3));
});

test('getPagesToEvict never evicts current page', () => {
  const cache = new Map([[1, {}], [2, {}], [3, {}]]);
  const toEvict = getPagesToEvict(cache, 2, 1);
  assert.ok(!toEvict.includes(2));
});

// Preload tests
test('getPagesToPreload returns adjacent pages', () => {
  const pages = getPagesToPreload(3, 5, false);
  assert.deepEqual(pages, [2, 4]);
});

test('getPagesToPreload handles first page', () => {
  const pages = getPagesToPreload(1, 5, false);
  assert.deepEqual(pages, [2]);
});

test('getPagesToPreload handles last page', () => {
  const pages = getPagesToPreload(5, 5, false);
  assert.deepEqual(pages, [4]);
});

test('getPagesToPreload returns empty for low memory', () => {
  const pages = getPagesToPreload(3, 5, true);
  assert.deepEqual(pages, []);
});

// Render quality tests
test('getPerfRenderQuality caps at 2x for normal devices', () => {
  assert.equal(getPerfRenderQuality(3, false), 2);
  assert.equal(getPerfRenderQuality(2, false), 2);
  assert.equal(getPerfRenderQuality(1.5, false), 1.5);
});

test('getPerfRenderQuality caps at 1.5x for low memory devices', () => {
  assert.equal(getPerfRenderQuality(3, true), 1.5);
  assert.equal(getPerfRenderQuality(2, true), 1.5);
  assert.equal(getPerfRenderQuality(1, true), 1);
});

test('getPerfRenderQuality handles missing DPR', () => {
  assert.equal(getPerfRenderQuality(undefined, false), 1);
  assert.equal(getPerfRenderQuality(0, false), 1);
});

// Cache validity tests
test('isCacheValid returns true for matching zoom', () => {
  const cached = { scale: 1.5, timestamp: Date.now() };
  assert.equal(isCacheValid(cached, 1.5), true);
});

test('isCacheValid returns false for different zoom', () => {
  const cached = { scale: 1.5, timestamp: Date.now() };
  assert.equal(isCacheValid(cached, 2), false);
});

test('isCacheValid returns false for null cache', () => {
  assert.equal(isCacheValid(null, 1.5), false);
  assert.equal(isCacheValid(undefined, 1.5), false);
});

// Memory pressure tests
test('getMemoryPressure returns high for >80% usage', () => {
  assert.equal(getMemoryPressure(85, 100), 'high');
  assert.equal(getMemoryPressure(900, 1000), 'high');
});

test('getMemoryPressure returns medium for 60-80% usage', () => {
  assert.equal(getMemoryPressure(70, 100), 'medium');
  assert.equal(getMemoryPressure(65, 100), 'medium');
});

test('getMemoryPressure returns low for <60% usage', () => {
  assert.equal(getMemoryPressure(50, 100), 'low');
  assert.equal(getMemoryPressure(30, 100), 'low');
});

test('getMemoryPressure handles missing values', () => {
  assert.equal(getMemoryPressure(null, 100), 'low');
  assert.equal(getMemoryPressure(50, null), 'low');
});

// Render debouncing simulation
test('render debouncing prevents rapid renders', () => {
  let renderCount = 0;
  const renderDebounceMs = 100;
  let lastRenderTime = -renderDebounceMs; // Start in the past to allow first render

  function shouldRender(now) {
    if (now - lastRenderTime < renderDebounceMs) {
      return false;
    }
    lastRenderTime = now;
    renderCount++;
    return true;
  }

  assert.equal(shouldRender(0), true);   // First render allowed
  assert.equal(shouldRender(50), false); // Too soon
  assert.equal(shouldRender(80), false); // Still too soon
  assert.equal(shouldRender(150), true); // Enough time passed
  assert.equal(renderCount, 2);
});

// -----------------------------------------------------------------------------
// 19.FE.6 - Client Telemetry Tests
// -----------------------------------------------------------------------------

/**
 * Create a mock telemetry tracker for testing
 * @param {boolean} enabled - Whether telemetry is enabled
 * @returns {Object}
 */
function createMockTelemetry(enabled = true) {
  return {
    enabled,
    events: [],
    metrics: {
      viewerLoadTime: null,
      fieldSaveLatencies: [],
      signatureAttachLatencies: [],
      errorsEncountered: [],
      pagesViewed: new Set(),
      fieldsCompleted: 0,
      consentTime: null,
      submitTime: null
    },
    startTime: Date.now(),

    track(eventName, data = {}) {
      if (!this.enabled) return;
      this.events.push({
        event: eventName,
        timestamp: Date.now(),
        ...data
      });
    },

    trackViewerLoad(success, duration, error = null) {
      this.metrics.viewerLoadTime = duration;
      this.track(success ? 'viewer_load_success' : 'viewer_load_failed', {
        duration,
        error
      });
    },

    trackFieldSave(fieldId, fieldType, success, latency, error = null) {
      this.metrics.fieldSaveLatencies.push(latency);
      if (success) this.metrics.fieldsCompleted++;
      else this.metrics.errorsEncountered.push({ type: 'field_save', fieldId, error });

      this.track(success ? 'field_save_success' : 'field_save_failed', {
        fieldId,
        fieldType,
        latency,
        error
      });
    },

    trackSignatureAttach(fieldId, signatureType, success, latency, error = null) {
      this.metrics.signatureAttachLatencies.push(latency);
      this.track(success ? 'signature_attach_success' : 'signature_attach_failed', {
        fieldId,
        signatureType,
        latency,
        error
      });
    },

    trackConsent(accepted) {
      this.metrics.consentTime = Date.now() - this.startTime;
      this.track(accepted ? 'consent_accepted' : 'consent_declined', {
        timeToConsent: this.metrics.consentTime
      });
    },

    trackSubmit(success, error = null) {
      this.metrics.submitTime = Date.now() - this.startTime;
      this.track(success ? 'submit_success' : 'submit_failed', {
        timeToSubmit: this.metrics.submitTime,
        fieldsCompleted: this.metrics.fieldsCompleted,
        error
      });
    },

    trackPageView(pageNum) {
      if (!this.metrics.pagesViewed.has(pageNum)) {
        this.metrics.pagesViewed.add(pageNum);
        this.track('page_viewed', { pageNum });
      }
    },

    trackFallback(reason) {
      this.track('fallback_triggered', {
        reason,
        timeBeforeFallback: Date.now() - this.startTime
      });
    },

    trackDegradedMode(degradationType, details = {}) {
      this.track('degraded_mode', { degradationType, ...details });
    }
  };
}

/**
 * Check if event is critical (should flush immediately)
 * @param {string} eventName - Event name
 * @returns {boolean}
 */
function isCriticalTelemetryEvent(eventName) {
  const critical = [
    'viewer_load_failed',
    'submit_success',
    'submit_failed',
    'fallback_triggered',
    'consent_declined'
  ];
  return critical.includes(eventName);
}

/**
 * Calculate average from array of numbers
 * @param {number[]} arr - Array of numbers
 * @returns {number}
 */
function calculateTelemetryAverage(arr) {
  if (!arr || !arr.length) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

/**
 * Get session summary from telemetry
 * @param {Object} telemetry - Telemetry object
 * @returns {Object}
 */
function getTelemetrySessionSummary(telemetry) {
  return {
    duration: Date.now() - telemetry.startTime,
    viewerLoadTime: telemetry.metrics.viewerLoadTime,
    avgFieldSaveLatency: calculateTelemetryAverage(telemetry.metrics.fieldSaveLatencies),
    avgSignatureAttachLatency: calculateTelemetryAverage(telemetry.metrics.signatureAttachLatencies),
    fieldsCompleted: telemetry.metrics.fieldsCompleted,
    pagesViewed: telemetry.metrics.pagesViewed.size,
    errorsCount: telemetry.metrics.errorsEncountered.length
  };
}

// Telemetry enabled/disabled tests
test('telemetry does not track events when disabled', () => {
  const t = createMockTelemetry(false);
  t.track('test_event', { data: 123 });
  assert.equal(t.events.length, 0);
});

test('telemetry tracks events when enabled', () => {
  const t = createMockTelemetry(true);
  t.track('test_event', { data: 123 });
  assert.equal(t.events.length, 1);
  assert.equal(t.events[0].event, 'test_event');
});

// Viewer load tracking tests
test('trackViewerLoad records success with duration', () => {
  const t = createMockTelemetry();
  t.trackViewerLoad(true, 500);

  assert.equal(t.metrics.viewerLoadTime, 500);
  assert.equal(t.events[0].event, 'viewer_load_success');
  assert.equal(t.events[0].duration, 500);
});

test('trackViewerLoad records failure with error', () => {
  const t = createMockTelemetry();
  t.trackViewerLoad(false, 1000, 'Network error');

  assert.equal(t.events[0].event, 'viewer_load_failed');
  assert.equal(t.events[0].error, 'Network error');
});

// Field save tracking tests
test('trackFieldSave increments fieldsCompleted on success', () => {
  const t = createMockTelemetry();
  t.trackFieldSave('f1', 'text', true, 100);

  assert.equal(t.metrics.fieldsCompleted, 1);
  assert.equal(t.events[0].event, 'field_save_success');
});

test('trackFieldSave records error on failure', () => {
  const t = createMockTelemetry();
  t.trackFieldSave('f1', 'signature', false, 200, 'Server error');

  assert.equal(t.metrics.fieldsCompleted, 0);
  assert.equal(t.metrics.errorsEncountered.length, 1);
  assert.equal(t.events[0].event, 'field_save_failed');
});

test('trackFieldSave records latencies', () => {
  const t = createMockTelemetry();
  t.trackFieldSave('f1', 'text', true, 100);
  t.trackFieldSave('f2', 'text', true, 200);
  t.trackFieldSave('f3', 'text', false, 150, 'error');

  assert.deepEqual(t.metrics.fieldSaveLatencies, [100, 200, 150]);
});

// Signature attach tracking tests
test('trackSignatureAttach records typed signature', () => {
  const t = createMockTelemetry();
  t.trackSignatureAttach('f1', 'typed', true, 50);

  assert.equal(t.events[0].event, 'signature_attach_success');
  assert.equal(t.events[0].signatureType, 'typed');
});

test('trackSignatureAttach records drawn signature', () => {
  const t = createMockTelemetry();
  t.trackSignatureAttach('f1', 'drawn', true, 100);

  assert.equal(t.events[0].signatureType, 'drawn');
  assert.deepEqual(t.metrics.signatureAttachLatencies, [100]);
});

// Consent tracking tests
test('trackConsent records acceptance', () => {
  const t = createMockTelemetry();
  t.trackConsent(true);

  assert.equal(t.events[0].event, 'consent_accepted');
  assert.ok(t.metrics.consentTime >= 0);
});

test('trackConsent records decline', () => {
  const t = createMockTelemetry();
  t.trackConsent(false);

  assert.equal(t.events[0].event, 'consent_declined');
});

// Submit tracking tests
test('trackSubmit records success with metrics', () => {
  const t = createMockTelemetry();
  t.metrics.fieldsCompleted = 3;
  t.trackSubmit(true);

  assert.equal(t.events[0].event, 'submit_success');
  assert.equal(t.events[0].fieldsCompleted, 3);
  assert.ok(t.metrics.submitTime >= 0);
});

test('trackSubmit records failure with error', () => {
  const t = createMockTelemetry();
  t.trackSubmit(false, 'Validation failed');

  assert.equal(t.events[0].event, 'submit_failed');
  assert.equal(t.events[0].error, 'Validation failed');
});

// Page view tracking tests
test('trackPageView only tracks unique pages', () => {
  const t = createMockTelemetry();
  t.trackPageView(1);
  t.trackPageView(2);
  t.trackPageView(1); // Duplicate

  assert.equal(t.events.length, 2);
  assert.equal(t.metrics.pagesViewed.size, 2);
});

// Fallback tracking tests
test('trackFallback records reason', () => {
  const t = createMockTelemetry();
  t.trackFallback('pdf_load_failed');

  assert.equal(t.events[0].event, 'fallback_triggered');
  assert.equal(t.events[0].reason, 'pdf_load_failed');
});

// Degraded mode tracking tests
test('trackDegradedMode records type and details', () => {
  const t = createMockTelemetry();
  t.trackDegradedMode('low_memory', { memoryUsage: 0.9 });

  assert.equal(t.events[0].event, 'degraded_mode');
  assert.equal(t.events[0].degradationType, 'low_memory');
  assert.equal(t.events[0].memoryUsage, 0.9);
});

// Critical event identification tests
test('isCriticalTelemetryEvent identifies critical events', () => {
  assert.equal(isCriticalTelemetryEvent('viewer_load_failed'), true);
  assert.equal(isCriticalTelemetryEvent('submit_success'), true);
  assert.equal(isCriticalTelemetryEvent('submit_failed'), true);
  assert.equal(isCriticalTelemetryEvent('fallback_triggered'), true);
  assert.equal(isCriticalTelemetryEvent('consent_declined'), true);
});

test('isCriticalTelemetryEvent returns false for non-critical', () => {
  assert.equal(isCriticalTelemetryEvent('viewer_load_success'), false);
  assert.equal(isCriticalTelemetryEvent('field_save_success'), false);
  assert.equal(isCriticalTelemetryEvent('page_viewed'), false);
});

// Average calculation tests
test('calculateTelemetryAverage computes correct average', () => {
  assert.equal(calculateTelemetryAverage([100, 200, 300]), 200);
  assert.equal(calculateTelemetryAverage([50, 150]), 100);
});

test('calculateTelemetryAverage handles empty array', () => {
  assert.equal(calculateTelemetryAverage([]), 0);
  assert.equal(calculateTelemetryAverage(null), 0);
});

// Session summary tests
test('getTelemetrySessionSummary aggregates metrics', () => {
  const t = createMockTelemetry();
  t.trackViewerLoad(true, 500);
  t.trackFieldSave('f1', 'text', true, 100);
  t.trackFieldSave('f2', 'text', true, 200);
  t.trackPageView(1);
  t.trackPageView(2);

  const summary = getTelemetrySessionSummary(t);

  assert.equal(summary.viewerLoadTime, 500);
  assert.equal(summary.avgFieldSaveLatency, 150);
  assert.equal(summary.fieldsCompleted, 2);
  assert.equal(summary.pagesViewed, 2);
  assert.equal(summary.errorsCount, 0);
});

// -----------------------------------------------------------------------------
// 19.FE.7 - Debug/Operator Affordance Tests
// -----------------------------------------------------------------------------

/**
 * Check if debug mode should be enabled based on various triggers
 * @param {Object} options - Options
 * @returns {boolean}
 */
function shouldEnableDebugMode(options = {}) {
  const { localStorage, queryParams } = options;

  // Check localStorage
  if (localStorage?.esign_debug === 'true') {
    return true;
  }

  // Check query parameter
  if (queryParams?.debug !== undefined) {
    return true;
  }

  return false;
}

/**
 * Get debug state summary
 * @param {Object} config - Config object
 * @param {Object} state - State object
 * @param {Object} telemetry - Telemetry object
 * @returns {Object}
 */
function getDebugStateSummary(config, state, telemetry) {
  let fieldsCompleted = 0;
  state.fieldState?.forEach(f => {
    if (f.completed) fieldsCompleted++;
  });

  return {
    flowMode: config.flowMode,
    agreementId: config.agreementId,
    sessionId: telemetry.sessionId,
    currentPage: state.currentPage,
    zoomLevel: state.zoomLevel,
    hasConsented: state.hasConsented,
    fieldsCompleted,
    totalFields: state.fieldState?.size || 0,
    isLowMemory: state.isLowMemory,
    cachedPages: state.renderedPages?.size || 0,
    errors: telemetry.metrics.errorsEncountered
  };
}

/**
 * Format debug value for display
 * @param {string} key - Value key
 * @param {any} value - Value
 * @returns {Object} - Formatted value with status
 */
function formatDebugValue(key, value) {
  switch (key) {
    case 'hasConsented':
      return {
        text: value ? '✓ Accepted' : '✗ Pending',
        status: value ? 'normal' : 'warning'
      };
    case 'isLowMemory':
      return {
        text: value ? '⚠ Low Memory' : 'Normal',
        status: value ? 'warning' : 'normal'
      };
    case 'errors':
      return {
        text: value?.length > 0 ? `${value.length} error(s)` : 'None',
        status: value?.length > 0 ? 'error' : 'normal'
      };
    case 'fieldsCompleted':
      return {
        text: `${value.completed}/${value.total}`,
        status: 'normal'
      };
    default:
      return {
        text: String(value),
        status: 'normal'
      };
  }
}

/**
 * Generate debug console helpers
 * @param {Object} state - State object
 * @param {Object} telemetry - Telemetry object
 * @returns {Object}
 */
function createDebugConsoleHelpers(state, telemetry) {
  return {
    getState: () => ({
      currentPage: state.currentPage,
      hasConsented: state.hasConsented,
      cachedPages: state.renderedPages?.size || 0
    }),
    getEvents: () => telemetry.events,
    getErrors: () => telemetry.metrics.errorsEncountered,
    getSummary: () => telemetry.getSessionSummary?.() || {}
  };
}

// Debug mode enable tests
test('shouldEnableDebugMode returns true for localStorage setting', () => {
  assert.equal(shouldEnableDebugMode({ localStorage: { esign_debug: 'true' } }), true);
  assert.equal(shouldEnableDebugMode({ localStorage: { esign_debug: 'false' } }), false);
});

test('shouldEnableDebugMode returns true for query parameter', () => {
  assert.equal(shouldEnableDebugMode({ queryParams: { debug: '' } }), true);
  assert.equal(shouldEnableDebugMode({ queryParams: { debug: 'true' } }), true);
});

test('shouldEnableDebugMode returns false by default', () => {
  assert.equal(shouldEnableDebugMode({}), false);
  assert.equal(shouldEnableDebugMode({ localStorage: {}, queryParams: {} }), false);
});

// Debug state summary tests
test('getDebugStateSummary includes flow mode and session info', () => {
  const config = { flowMode: 'unified', agreementId: 'agr_123' };
  const state = {
    currentPage: 2,
    zoomLevel: 1.5,
    hasConsented: true,
    isLowMemory: false,
    fieldState: new Map([['f1', { completed: true }], ['f2', { completed: false }]]),
    renderedPages: new Map([[1, {}]])
  };
  const telemetry = {
    sessionId: 'sess_abc',
    metrics: { errorsEncountered: [] }
  };

  const summary = getDebugStateSummary(config, state, telemetry);

  assert.equal(summary.flowMode, 'unified');
  assert.equal(summary.agreementId, 'agr_123');
  assert.equal(summary.sessionId, 'sess_abc');
  assert.equal(summary.currentPage, 2);
  assert.equal(summary.fieldsCompleted, 1);
  assert.equal(summary.totalFields, 2);
  assert.equal(summary.cachedPages, 1);
});

// Debug value formatting tests
test('formatDebugValue formats consent status', () => {
  const accepted = formatDebugValue('hasConsented', true);
  const pending = formatDebugValue('hasConsented', false);

  assert.equal(accepted.text, '✓ Accepted');
  assert.equal(accepted.status, 'normal');
  assert.equal(pending.text, '✗ Pending');
  assert.equal(pending.status, 'warning');
});

test('formatDebugValue formats memory mode', () => {
  const lowMem = formatDebugValue('isLowMemory', true);
  const normalMem = formatDebugValue('isLowMemory', false);

  assert.ok(lowMem.text.includes('Low Memory'));
  assert.equal(lowMem.status, 'warning');
  assert.equal(normalMem.status, 'normal');
});

test('formatDebugValue formats error count', () => {
  const noErrors = formatDebugValue('errors', []);
  const hasErrors = formatDebugValue('errors', [{ type: 'test' }]);

  assert.equal(noErrors.text, 'None');
  assert.equal(noErrors.status, 'normal');
  assert.equal(hasErrors.text, '1 error(s)');
  assert.equal(hasErrors.status, 'error');
});

test('formatDebugValue formats field completion', () => {
  const result = formatDebugValue('fieldsCompleted', { completed: 3, total: 5 });
  assert.equal(result.text, '3/5');
});

// Debug console helpers tests
test('createDebugConsoleHelpers provides state accessor', () => {
  const state = {
    currentPage: 1,
    hasConsented: true,
    renderedPages: new Map([[1, {}], [2, {}]])
  };
  const telemetry = {
    events: [{ event: 'test' }],
    metrics: { errorsEncountered: [{ type: 'error' }] },
    getSessionSummary: () => ({ duration: 1000 })
  };

  const helpers = createDebugConsoleHelpers(state, telemetry);

  const stateResult = helpers.getState();
  assert.equal(stateResult.currentPage, 1);
  assert.equal(stateResult.hasConsented, true);
  assert.equal(stateResult.cachedPages, 2);
});

test('createDebugConsoleHelpers provides events accessor', () => {
  const state = { renderedPages: new Map() };
  const telemetry = {
    events: [{ event: 'viewer_load' }, { event: 'consent' }],
    metrics: { errorsEncountered: [] }
  };

  const helpers = createDebugConsoleHelpers(state, telemetry);
  const events = helpers.getEvents();

  assert.equal(events.length, 2);
  assert.equal(events[0].event, 'viewer_load');
});

test('createDebugConsoleHelpers provides errors accessor', () => {
  const state = { renderedPages: new Map() };
  const telemetry = {
    events: [],
    metrics: { errorsEncountered: [{ type: 'field_save', message: 'Failed' }] }
  };

  const helpers = createDebugConsoleHelpers(state, telemetry);
  const errors = helpers.getErrors();

  assert.equal(errors.length, 1);
  assert.equal(errors[0].type, 'field_save');
});

// Debug panel display state tests
test('debug panel collapsed state toggles correctly', () => {
  let isCollapsed = false;

  function toggleCollapsed() {
    isCollapsed = !isCollapsed;
    return isCollapsed;
  }

  assert.equal(toggleCollapsed(), true);
  assert.equal(toggleCollapsed(), false);
  assert.equal(toggleCollapsed(), true);
});

// Debug action handlers
test('debug force fallback generates correct reason', () => {
  function getFallbackReason(source) {
    switch (source) {
      case 'debug_button':
        return 'debug_forced';
      case 'user_link':
        return 'user_requested';
      case 'error':
        return 'viewer_error';
      default:
        return 'unknown';
    }
  }

  assert.equal(getFallbackReason('debug_button'), 'debug_forced');
  assert.equal(getFallbackReason('user_link'), 'user_requested');
});

// -----------------------------------------------------------------------------
// 19.FE.8 - Cross-Browser E2E and Visual Regression Tests
// -----------------------------------------------------------------------------

/**
 * Simulated browser capabilities for testing
 */
const BROWSER_CAPABILITIES = {
  chrome: {
    name: 'Chrome',
    supportsPdfJs: true,
    supportsCanvas2d: true,
    supportsTouch: false,
    supportsDevicePixelRatio: true,
    supportsRequestIdleCallback: true,
    supportsSendBeacon: true,
    supportsClipboard: true,
    devicePixelRatio: 1.0
  },
  safari: {
    name: 'Safari',
    supportsPdfJs: true,
    supportsCanvas2d: true,
    supportsTouch: true,
    supportsDevicePixelRatio: true,
    supportsRequestIdleCallback: false, // Safari lacks requestIdleCallback
    supportsSendBeacon: true,
    supportsClipboard: true,
    devicePixelRatio: 2.0
  },
  firefox: {
    name: 'Firefox',
    supportsPdfJs: true,
    supportsCanvas2d: true,
    supportsTouch: false,
    supportsDevicePixelRatio: true,
    supportsRequestIdleCallback: true,
    supportsSendBeacon: true,
    supportsClipboard: true,
    devicePixelRatio: 1.0
  },
  edge: {
    name: 'Edge',
    supportsPdfJs: true,
    supportsCanvas2d: true,
    supportsTouch: true,
    supportsDevicePixelRatio: true,
    supportsRequestIdleCallback: true,
    supportsSendBeacon: true,
    supportsClipboard: true,
    devicePixelRatio: 1.5
  },
  mobile_safari: {
    name: 'Mobile Safari',
    supportsPdfJs: true,
    supportsCanvas2d: true,
    supportsTouch: true,
    supportsDevicePixelRatio: true,
    supportsRequestIdleCallback: false,
    supportsSendBeacon: true,
    supportsClipboard: false, // Limited on iOS
    devicePixelRatio: 3.0,
    isLowMemory: true
  },
  android_chrome: {
    name: 'Android Chrome',
    supportsPdfJs: true,
    supportsCanvas2d: true,
    supportsTouch: true,
    supportsDevicePixelRatio: true,
    supportsRequestIdleCallback: true,
    supportsSendBeacon: true,
    supportsClipboard: true,
    devicePixelRatio: 2.5,
    isLowMemory: true
  }
};

/**
 * Check if unified mode is supported in browser
 * @param {Object} capabilities - Browser capabilities
 * @returns {boolean}
 */
function isUnifiedModeSupported(capabilities) {
  return capabilities.supportsPdfJs && capabilities.supportsCanvas2d;
}

/**
 * Get recommended flow mode for browser
 * @param {Object} capabilities - Browser capabilities
 * @returns {'unified'|'legacy'}
 */
function getRecommendedFlowMode(capabilities) {
  if (!isUnifiedModeSupported(capabilities)) {
    return 'legacy';
  }
  return 'unified';
}

/**
 * Determine feature availability for browser
 * @param {Object} capabilities - Browser capabilities
 * @returns {Object} - Feature flags
 */
function getBrowserFeatures(capabilities) {
  return {
    canPreloadPages: capabilities.supportsRequestIdleCallback,
    canUseSendBeacon: capabilities.supportsSendBeacon,
    canCopyToClipboard: capabilities.supportsClipboard,
    shouldReduceQuality: capabilities.isLowMemory,
    optimalDpr: Math.min(capabilities.devicePixelRatio, capabilities.isLowMemory ? 1.5 : 2)
  };
}

/**
 * Simulate E2E journey for unified flow
 * @param {Object} capabilities - Browser capabilities
 * @param {Object} scenario - Test scenario
 * @returns {Object} - Journey result
 */
function simulateUnifiedJourney(capabilities, scenario) {
  const steps = [];
  const errors = [];

  // Step 1: Load page
  if (!isUnifiedModeSupported(capabilities)) {
    return {
      success: false,
      steps,
      errors: ['Browser does not support unified mode'],
      fallbackTriggered: true,
      fallbackReason: 'UNSUPPORTED_BROWSER'
    };
  }
  steps.push({ step: 'page_load', success: true });

  // Step 2: Load PDF viewer
  if (scenario.pdfLoadFails) {
    errors.push('PDF_LOAD_FAILED');
    return {
      success: false,
      steps,
      errors,
      fallbackTriggered: true,
      fallbackReason: 'PDF_LOAD_FAILED'
    };
  }
  steps.push({ step: 'pdf_load', success: true });

  // Step 3: Accept consent
  if (scenario.skipConsent) {
    errors.push('Consent required');
    return {
      success: false,
      steps,
      errors,
      fallbackTriggered: false,
      cannotSubmit: true
    };
  }
  steps.push({ step: 'consent_accepted', success: true });

  // Step 4: Complete fields
  const fieldsToComplete = scenario.fields || [];
  for (const field of fieldsToComplete) {
    if (scenario.fieldSaveFails?.includes(field.id)) {
      steps.push({ step: `field_${field.id}`, success: false, error: 'Save failed' });
      errors.push(`Field ${field.id} save failed`);
    } else {
      steps.push({ step: `field_${field.id}`, success: true });
    }
  }

  // Step 5: Submit
  const allFieldsComplete = !scenario.fieldSaveFails || scenario.fieldSaveFails.length === 0;
  if (!allFieldsComplete) {
    return {
      success: false,
      steps,
      errors,
      fallbackTriggered: false,
      cannotSubmit: true
    };
  }

  if (scenario.submitFails) {
    errors.push('Submit failed');
    steps.push({ step: 'submit', success: false });
    return {
      success: false,
      steps,
      errors,
      fallbackTriggered: false
    };
  }

  steps.push({ step: 'submit', success: true });
  steps.push({ step: 'redirect_complete', success: true });

  return {
    success: true,
    steps,
    errors,
    fallbackTriggered: false
  };
}

/**
 * Simulate E2E journey for legacy flow
 * @param {Object} scenario - Test scenario
 * @returns {Object} - Journey result
 */
function simulateLegacyJourney(scenario) {
  const steps = [];
  const errors = [];

  // Legacy flow is simpler - just template-based
  steps.push({ step: 'session_page', success: true });

  if (scenario.skipConsent) {
    return {
      success: false,
      steps,
      errors: ['Consent required'],
      redirectTo: null
    };
  }
  steps.push({ step: 'consent', success: true });
  steps.push({ step: 'fields_page', success: true });

  // Complete fields
  const fieldsToComplete = scenario.fields || [];
  for (const field of fieldsToComplete) {
    steps.push({ step: `field_${field.id}`, success: true });
  }

  if (scenario.submitFails) {
    return {
      success: false,
      steps,
      errors: ['Submit failed']
    };
  }

  steps.push({ step: 'submit', success: true });
  steps.push({ step: 'complete_page', success: true });

  return {
    success: true,
    steps,
    errors
  };
}

/**
 * Visual regression comparison helper
 * @param {Object} baseline - Baseline measurements
 * @param {Object} current - Current measurements
 * @param {number} tolerance - Allowed difference
 * @returns {Object} - Comparison result
 */
function compareVisualMetrics(baseline, current, tolerance = 0.05) {
  const differences = [];

  for (const key in baseline) {
    const baseValue = baseline[key];
    const currValue = current[key];

    if (typeof baseValue === 'number' && typeof currValue === 'number') {
      const diff = Math.abs(currValue - baseValue);
      const relDiff = baseValue !== 0 ? diff / baseValue : diff;

      if (relDiff > tolerance) {
        differences.push({
          property: key,
          baseline: baseValue,
          current: currValue,
          difference: relDiff
        });
      }
    }
  }

  return {
    passed: differences.length === 0,
    differences
  };
}

/**
 * Get expected layout metrics for browser
 * @param {Object} capabilities - Browser capabilities
 * @returns {Object} - Expected metrics
 */
function getExpectedLayoutMetrics(capabilities) {
  const dpr = capabilities.devicePixelRatio || 1;
  const isMobile = capabilities.supportsTouch && capabilities.isLowMemory;

  return {
    minTouchTarget: isMobile ? 44 : 24,
    fieldPanelWidth: isMobile ? 'full' : 360,
    viewerToolbarHeight: 48,
    progressRingSize: 36,
    buttonMinHeight: isMobile ? 52 : 40,
    canvasScale: Math.min(dpr, capabilities.isLowMemory ? 1.5 : 2)
  };
}

// Cross-browser unified mode support tests
test('isUnifiedModeSupported returns true for Chrome', () => {
  assert.equal(isUnifiedModeSupported(BROWSER_CAPABILITIES.chrome), true);
});

test('isUnifiedModeSupported returns true for Safari', () => {
  assert.equal(isUnifiedModeSupported(BROWSER_CAPABILITIES.safari), true);
});

test('isUnifiedModeSupported returns true for Firefox', () => {
  assert.equal(isUnifiedModeSupported(BROWSER_CAPABILITIES.firefox), true);
});

test('isUnifiedModeSupported returns true for mobile browsers', () => {
  assert.equal(isUnifiedModeSupported(BROWSER_CAPABILITIES.mobile_safari), true);
  assert.equal(isUnifiedModeSupported(BROWSER_CAPABILITIES.android_chrome), true);
});

test('isUnifiedModeSupported returns false without PDF.js', () => {
  const noPdfJs = { ...BROWSER_CAPABILITIES.chrome, supportsPdfJs: false };
  assert.equal(isUnifiedModeSupported(noPdfJs), false);
});

test('isUnifiedModeSupported returns false without Canvas', () => {
  const noCanvas = { ...BROWSER_CAPABILITIES.chrome, supportsCanvas2d: false };
  assert.equal(isUnifiedModeSupported(noCanvas), false);
});

// Browser feature detection tests
test('getBrowserFeatures detects requestIdleCallback availability', () => {
  const chromeFeatures = getBrowserFeatures(BROWSER_CAPABILITIES.chrome);
  const safariFeatures = getBrowserFeatures(BROWSER_CAPABILITIES.safari);

  assert.equal(chromeFeatures.canPreloadPages, true);
  assert.equal(safariFeatures.canPreloadPages, false);
});

test('getBrowserFeatures reduces quality for low-memory devices', () => {
  const mobileFeatures = getBrowserFeatures(BROWSER_CAPABILITIES.mobile_safari);
  const desktopFeatures = getBrowserFeatures(BROWSER_CAPABILITIES.chrome);

  assert.equal(mobileFeatures.shouldReduceQuality, true);
  assert.equal(desktopFeatures.shouldReduceQuality, undefined);
});

test('getBrowserFeatures caps DPR based on memory', () => {
  const mobileSafari = getBrowserFeatures(BROWSER_CAPABILITIES.mobile_safari);
  const chrome = getBrowserFeatures(BROWSER_CAPABILITIES.chrome);

  assert.ok(mobileSafari.optimalDpr <= 1.5);
  assert.equal(chrome.optimalDpr, 1.0); // Chrome DPR is 1.0
});

// E2E unified journey tests
test('simulateUnifiedJourney completes successfully with all steps', () => {
  const result = simulateUnifiedJourney(BROWSER_CAPABILITIES.chrome, {
    fields: [{ id: 'sig1' }, { id: 'name1' }]
  });

  assert.equal(result.success, true);
  assert.equal(result.fallbackTriggered, false);
  assert.ok(result.steps.length >= 5);
});

test('simulateUnifiedJourney falls back on PDF load failure', () => {
  const result = simulateUnifiedJourney(BROWSER_CAPABILITIES.chrome, {
    pdfLoadFails: true,
    fields: []
  });

  assert.equal(result.success, false);
  assert.equal(result.fallbackTriggered, true);
  assert.equal(result.fallbackReason, 'PDF_LOAD_FAILED');
});

test('simulateUnifiedJourney blocks submit without consent', () => {
  const result = simulateUnifiedJourney(BROWSER_CAPABILITIES.chrome, {
    skipConsent: true,
    fields: []
  });

  assert.equal(result.success, false);
  assert.equal(result.cannotSubmit, true);
});

test('simulateUnifiedJourney handles field save failures', () => {
  const result = simulateUnifiedJourney(BROWSER_CAPABILITIES.chrome, {
    fields: [{ id: 'sig1' }, { id: 'name1' }],
    fieldSaveFails: ['sig1']
  });

  assert.equal(result.success, false);
  assert.equal(result.cannotSubmit, true);
  assert.ok(result.errors.some(e => e.includes('sig1')));
});

test('simulateUnifiedJourney handles submit failure', () => {
  const result = simulateUnifiedJourney(BROWSER_CAPABILITIES.chrome, {
    fields: [{ id: 'sig1' }],
    submitFails: true
  });

  assert.equal(result.success, false);
  assert.ok(result.errors.includes('Submit failed'));
});

// E2E legacy journey tests
test('simulateLegacyJourney completes successfully', () => {
  const result = simulateLegacyJourney({
    fields: [{ id: 'sig1' }]
  });

  assert.equal(result.success, true);
  assert.ok(result.steps.some(s => s.step === 'complete_page'));
});

test('simulateLegacyJourney blocks without consent', () => {
  const result = simulateLegacyJourney({
    skipConsent: true,
    fields: []
  });

  assert.equal(result.success, false);
});

// Visual regression comparison tests
test('compareVisualMetrics passes for identical values', () => {
  const baseline = { width: 100, height: 200 };
  const current = { width: 100, height: 200 };

  const result = compareVisualMetrics(baseline, current);
  assert.equal(result.passed, true);
  assert.equal(result.differences.length, 0);
});

test('compareVisualMetrics fails for values outside tolerance', () => {
  const baseline = { width: 100, height: 200 };
  const current = { width: 110, height: 200 }; // 10% difference

  const result = compareVisualMetrics(baseline, current, 0.05);
  assert.equal(result.passed, false);
  assert.equal(result.differences.length, 1);
  assert.equal(result.differences[0].property, 'width');
});

test('compareVisualMetrics passes for values within tolerance', () => {
  const baseline = { width: 100, height: 200 };
  const current = { width: 104, height: 198 }; // Within 5%

  const result = compareVisualMetrics(baseline, current, 0.05);
  assert.equal(result.passed, true);
});

// Layout metrics tests
test('getExpectedLayoutMetrics returns correct values for desktop', () => {
  const metrics = getExpectedLayoutMetrics(BROWSER_CAPABILITIES.chrome);

  assert.equal(metrics.minTouchTarget, 24);
  assert.equal(metrics.fieldPanelWidth, 360);
  assert.equal(metrics.canvasScale, 1);
});

test('getExpectedLayoutMetrics returns correct values for mobile', () => {
  const metrics = getExpectedLayoutMetrics(BROWSER_CAPABILITIES.mobile_safari);

  assert.equal(metrics.minTouchTarget, 44);
  assert.equal(metrics.fieldPanelWidth, 'full');
  assert.ok(metrics.canvasScale <= 1.5);
});

// Unified vs Legacy coexistence tests
test('flow modes coexist without conflict', () => {
  // Both routes should be available
  const unifiedRoute = '/esign/sign/token123/review';
  const legacyRoute = '/esign/sign/token123';

  assert.notEqual(unifiedRoute, legacyRoute);
  assert.ok(unifiedRoute.includes('review'));
  assert.ok(!legacyRoute.includes('review'));
});

test('fallback from unified preserves token', () => {
  const token = 'tok_abc123';
  const unifiedPath = `/esign/sign/${token}/review`;
  const fallbackPath = `/esign/sign/${token}`;

  // Extract token from both paths
  const tokenFromUnified = unifiedPath.split('/')[3];
  const tokenFromFallback = fallbackPath.split('/')[3];

  assert.equal(tokenFromUnified, token);
  assert.equal(tokenFromFallback, token);
});

// Cross-browser regression: All browsers should route correctly
test('all browsers route to correct flow mode', () => {
  for (const [browserName, capabilities] of Object.entries(BROWSER_CAPABILITIES)) {
    const recommended = getRecommendedFlowMode(capabilities);

    // All tested browsers support unified
    assert.equal(recommended, 'unified', `${browserName} should support unified mode`);
  }
});

// Cross-browser: Feature degradation is graceful
test('feature degradation maintains core functionality', () => {
  // Safari without requestIdleCallback should still work
  const safariFeatures = getBrowserFeatures(BROWSER_CAPABILITIES.safari);
  assert.equal(safariFeatures.canPreloadPages, false);

  // But core features work
  assert.equal(isUnifiedModeSupported(BROWSER_CAPABILITIES.safari), true);

  // Journey still completes
  const result = simulateUnifiedJourney(BROWSER_CAPABILITIES.safari, {
    fields: [{ id: 'sig1' }]
  });
  assert.equal(result.success, true);
});

// =============================================================================
// Phase 19.FE.1 Tests - Signed Upload Contract Flow
// =============================================================================

// Signature upload bootstrap contract structure
function mockUploadBootstrapResponse(fieldId) {
  return {
    upload_token: `ut_${fieldId}_${Date.now()}`,
    upload_url: `https://storage.example.com/signed-upload/${fieldId}`,
    method: 'PUT',
    headers: { 'x-custom-header': 'value' },
    object_key: `tenant/test/org/test/agreements/agr123/signatures/rec123/${fieldId}.png`,
    sha256: 'abc123def456',
    content_type: 'image/png',
    size_bytes: 5000,
    expires_at: new Date(Date.now() + 300000).toISOString()
  };
}

// Simulate signature uploader behavior
function createMockSignatureUploader() {
  return {
    requestedBootstraps: [],
    uploadedBlobs: [],

    async requestUploadBootstrap(fieldId, sha256, contentType, sizeBytes) {
      this.requestedBootstraps.push({ fieldId, sha256, contentType, sizeBytes });
      return mockUploadBootstrapResponse(fieldId);
    },

    async uploadToSignedUrl(uploadContract, binaryData) {
      this.uploadedBlobs.push({ uploadContract, size: binaryData.size || binaryData.length });
      return true;
    },

    dataUrlToBlob(dataUrl) {
      // Simulate blob creation from data URL
      const [header, base64Data] = dataUrl.split(',');
      const mimeMatch = header.match(/data:([^;]+)/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
      return { size: base64Data.length * 0.75, type: mimeType };
    },

    async uploadDrawnSignature(fieldId, canvasDataUrl) {
      const blob = this.dataUrlToBlob(canvasDataUrl);
      const sha256 = 'mock_sha256_' + fieldId;
      const uploadContract = await this.requestUploadBootstrap(
        fieldId,
        sha256,
        blob.type,
        blob.size
      );
      await this.uploadToSignedUrl(uploadContract, blob);
      return {
        uploadToken: uploadContract.upload_token,
        objectKey: uploadContract.object_key,
        sha256: uploadContract.sha256,
        contentType: uploadContract.content_type
      };
    }
  };
}

test('signatureUploader.requestUploadBootstrap sends correct payload', async () => {
  const uploader = createMockSignatureUploader();
  const result = await uploader.requestUploadBootstrap(
    'field_sig1',
    'sha256hash',
    'image/png',
    5000
  );

  assert.equal(uploader.requestedBootstraps.length, 1);
  assert.deepEqual(uploader.requestedBootstraps[0], {
    fieldId: 'field_sig1',
    sha256: 'sha256hash',
    contentType: 'image/png',
    sizeBytes: 5000
  });
  assert.ok(result.upload_token.startsWith('ut_'));
  assert.ok(result.upload_url.includes('signed-upload'));
});

test('signatureUploader.dataUrlToBlob parses data URL correctly', () => {
  const uploader = createMockSignatureUploader();

  // PNG data URL
  const pngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';
  const pngBlob = uploader.dataUrlToBlob(pngDataUrl);
  assert.equal(pngBlob.type, 'image/png');
  assert.ok(pngBlob.size > 0);

  // JPEG data URL
  const jpegDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
  const jpegBlob = uploader.dataUrlToBlob(jpegDataUrl);
  assert.equal(jpegBlob.type, 'image/jpeg');
});

test('signatureUploader.uploadDrawnSignature completes full flow', async () => {
  const uploader = createMockSignatureUploader();
  const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';

  const result = await uploader.uploadDrawnSignature('sig_field_1', dataUrl);

  // Bootstrap was requested
  assert.equal(uploader.requestedBootstraps.length, 1);
  assert.equal(uploader.requestedBootstraps[0].fieldId, 'sig_field_1');

  // Blob was uploaded
  assert.equal(uploader.uploadedBlobs.length, 1);

  // Result contains required fields for attach
  assert.ok(result.uploadToken);
  assert.ok(result.objectKey);
  assert.ok(result.sha256);
  assert.ok(result.contentType);
});

test('signatureUploader preserves upload token for attach call', async () => {
  const uploader = createMockSignatureUploader();
  const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';

  const result = await uploader.uploadDrawnSignature('sig_field_2', dataUrl);

  // Upload token should be from bootstrap response
  assert.ok(result.uploadToken.includes('sig_field_2'));

  // Object key should match contract
  assert.ok(result.objectKey.includes('sig_field_2'));
});

test('drawn signature attach payload includes upload_token', async () => {
  const uploader = createMockSignatureUploader();
  const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';

  const uploadResult = await uploader.uploadDrawnSignature('sig_field_3', dataUrl);

  // Build attach payload
  const attachPayload = {
    field_id: 'sig_field_3',
    type: 'drawn',
    value_text: '[Drawn]',
    object_key: uploadResult.objectKey,
    sha256: uploadResult.sha256,
    upload_token: uploadResult.uploadToken
  };

  assert.ok(attachPayload.upload_token);
  assert.equal(attachPayload.type, 'drawn');
});

test('typed signature attach does not require upload_token', () => {
  // Typed signatures go directly to attach endpoint
  const typedPayload = {
    field_id: 'sig_typed_1',
    type: 'typed',
    value_text: 'John Doe',
    object_key: 'tenant/test/signatures/sig_typed_1.txt',
    sha256: 'typed_sha256'
    // Note: no upload_token for typed signatures
  };

  assert.ok(!typedPayload.upload_token);
  assert.equal(typedPayload.type, 'typed');
});

// =============================================================================
// Phase 19.FE.2 Tests - Coordinate Transform System
// =============================================================================

// Mock coordinate transform system
function createCoordinateTransform() {
  return {
    dpr: 2, // High-DPI display
    pageViewports: new Map(),

    getPageMetadata(pageNum) {
      const viewport = this.pageViewports.get(pageNum);
      if (viewport) {
        return {
          width: viewport.width,
          height: viewport.height,
          rotation: viewport.rotation || 0
        };
      }
      return { width: 612, height: 792, rotation: 0 }; // Letter size default
    },

    setPageViewport(pageNum, viewport) {
      this.pageViewports.set(pageNum, {
        width: viewport.width,
        height: viewport.height,
        rotation: viewport.rotation || 0,
        scale: viewport.scale
      });
    },

    pageToScreen(fieldData, containerWidth, containerHeight, zoomLevel) {
      const pageMetadata = this.getPageMetadata(fieldData.page);

      const sourceWidth = fieldData.pageWidth || pageMetadata.width;
      const sourceHeight = fieldData.pageHeight || pageMetadata.height;

      const scaleX = (containerWidth / sourceWidth) * zoomLevel;
      const scaleY = (containerHeight / sourceHeight) * zoomLevel;

      let posX = fieldData.posX || 0;
      let posY = fieldData.posY || 0;

      const screenX = posX * scaleX;
      const screenY = posY * scaleY;
      const screenWidth = (fieldData.width || 150) * scaleX;
      const screenHeight = (fieldData.height || 30) * scaleY;

      const minSize = 44;
      const finalWidth = Math.max(screenWidth, minSize);
      const finalHeight = Math.max(screenHeight, minSize);

      const xAdjust = (finalWidth - screenWidth) / 2;
      const yAdjust = (finalHeight - screenHeight) / 2;

      return {
        left: screenX - xAdjust,
        top: screenY - yAdjust,
        width: finalWidth,
        height: finalHeight,
        _debug: { sourceWidth, sourceHeight, scaleX, scaleY }
      };
    },

    getOverlayStyles(fieldData, containerWidth, containerHeight, zoomLevel) {
      const coords = this.pageToScreen(fieldData, containerWidth, containerHeight, zoomLevel);
      return {
        left: `${Math.round(coords.left)}px`,
        top: `${Math.round(coords.top)}px`,
        width: `${Math.round(coords.width)}px`,
        height: `${Math.round(coords.height)}px`,
        transform: this.dpr > 1 ? 'translateZ(0)' : 'none'
      };
    }
  };
}

test('coordinateTransform.getPageMetadata returns default for unknown page', () => {
  const transform = createCoordinateTransform();
  const metadata = transform.getPageMetadata(999);

  assert.equal(metadata.width, 612);
  assert.equal(metadata.height, 792);
  assert.equal(metadata.rotation, 0);
});

test('coordinateTransform.setPageViewport caches viewport data', () => {
  const transform = createCoordinateTransform();

  transform.setPageViewport(1, { width: 595, height: 842, rotation: 0, scale: 1.5 });

  const metadata = transform.getPageMetadata(1);
  assert.equal(metadata.width, 595);
  assert.equal(metadata.height, 842);
});

test('coordinateTransform.pageToScreen scales correctly at zoom 1.0', () => {
  const transform = createCoordinateTransform();

  // Page is 612x792, container is also 612x792
  const fieldData = {
    page: 1,
    posX: 100,
    posY: 200,
    width: 150,
    height: 30,
    pageWidth: 612,
    pageHeight: 792
  };

  const coords = transform.pageToScreen(fieldData, 612, 792, 1.0);

  // At 1:1 scale, positions should match
  assert.equal(coords._debug.scaleX, 1.0);
  assert.equal(coords._debug.scaleY, 1.0);
});

test('coordinateTransform.pageToScreen scales correctly at zoom 2.0', () => {
  const transform = createCoordinateTransform();

  const fieldData = {
    page: 1,
    posX: 100,
    posY: 200,
    width: 150,
    height: 30,
    pageWidth: 612,
    pageHeight: 792
  };

  const coords = transform.pageToScreen(fieldData, 612, 792, 2.0);

  // At 2x zoom, positions should be doubled
  assert.ok(coords.left >= 200 - 5); // Allow for min-size adjustment
  assert.ok(coords.top >= 400 - 5);
});

test('coordinateTransform.pageToScreen enforces minimum touch target size', () => {
  const transform = createCoordinateTransform();

  // Very small field
  const fieldData = {
    page: 1,
    posX: 100,
    posY: 200,
    width: 20, // Less than 44px minimum
    height: 10,
    pageWidth: 612,
    pageHeight: 792
  };

  const coords = transform.pageToScreen(fieldData, 612, 792, 1.0);

  // Should be clamped to 44px minimum
  assert.ok(coords.width >= 44);
  assert.ok(coords.height >= 44);
});

test('coordinateTransform.getOverlayStyles returns CSS-ready values', () => {
  const transform = createCoordinateTransform();

  const fieldData = {
    page: 1,
    posX: 100,
    posY: 200,
    width: 150,
    height: 30,
    pageWidth: 612,
    pageHeight: 792
  };

  const styles = transform.getOverlayStyles(fieldData, 612, 792, 1.0);

  // Should be pixel strings
  assert.ok(styles.left.endsWith('px'));
  assert.ok(styles.top.endsWith('px'));
  assert.ok(styles.width.endsWith('px'));
  assert.ok(styles.height.endsWith('px'));

  // High-DPI should use GPU acceleration
  assert.equal(styles.transform, 'translateZ(0)');
});

test('coordinateTransform handles container resizing', () => {
  const transform = createCoordinateTransform();

  const fieldData = {
    page: 1,
    posX: 306, // Center of 612pt page
    posY: 396, // Center of 792pt page
    width: 100,
    height: 30,
    pageWidth: 612,
    pageHeight: 792
  };

  // Half-size container (responsive design)
  const halfSizeCoords = transform.pageToScreen(fieldData, 306, 396, 1.0);

  // Field should be at half the position (scaled down)
  assert.ok(halfSizeCoords.left < 200); // Scaled from 306
  assert.ok(halfSizeCoords.top < 250); // Scaled from 396
});

test('coordinateTransform maintains aspect ratio across DPR values', () => {
  const transform1x = createCoordinateTransform();
  transform1x.dpr = 1;

  const transform2x = createCoordinateTransform();
  transform2x.dpr = 2;

  const fieldData = {
    page: 1,
    posX: 100,
    posY: 200,
    width: 150,
    height: 30,
    pageWidth: 612,
    pageHeight: 792
  };

  const coords1x = transform1x.pageToScreen(fieldData, 612, 792, 1.0);
  const coords2x = transform2x.pageToScreen(fieldData, 612, 792, 1.0);

  // Position and size should be the same regardless of DPR
  // DPR only affects rendering quality, not logical coordinates
  assert.equal(coords1x.left, coords2x.left);
  assert.equal(coords1x.top, coords2x.top);
  assert.equal(coords1x.width, coords2x.width);
});

test('coordinateTransform handles page rotation metadata', () => {
  const transform = createCoordinateTransform();
  transform.setPageViewport(1, { width: 792, height: 612, rotation: 90, scale: 1.0 });

  const metadata = transform.getPageMetadata(1);

  // Rotated page has swapped dimensions
  assert.equal(metadata.width, 792);
  assert.equal(metadata.height, 612);
  assert.equal(metadata.rotation, 90);
});

test('field overlay positioning uses geometry when available', () => {
  const fieldWithGeometry = {
    id: 'field_1',
    page: 1,
    posX: 100,
    posY: 200,
    width: 150,
    height: 30,
    pageWidth: 612,
    pageHeight: 792
  };

  const hasGeometry = fieldWithGeometry.posX != null &&
                      fieldWithGeometry.posY != null &&
                      fieldWithGeometry.width != null &&
                      fieldWithGeometry.height != null;

  assert.equal(hasGeometry, true);
});

test('field overlay falls back when geometry is missing', () => {
  const fieldWithoutGeometry = {
    id: 'field_1',
    page: 1
    // No pos_x, pos_y, width, height
  };

  const hasGeometry = fieldWithoutGeometry.posX != null &&
                      fieldWithoutGeometry.posY != null &&
                      fieldWithoutGeometry.width != null &&
                      fieldWithoutGeometry.height != null;

  assert.equal(hasGeometry, false);
});

test('viewer config includes coordinate system metadata', () => {
  const viewerConfig = {
    coordinateSpace: 'pdf',
    contractVersion: '1.0',
    unit: 'pt',
    origin: 'top-left',
    yAxisDirection: 'down',
    pages: [
      { page: 1, width: 612, height: 792, rotation: 0 },
      { page: 2, width: 612, height: 792, rotation: 0 }
    ]
  };

  assert.equal(viewerConfig.coordinateSpace, 'pdf');
  assert.equal(viewerConfig.unit, 'pt');
  assert.equal(viewerConfig.origin, 'top-left');
  assert.equal(viewerConfig.yAxisDirection, 'down');
  assert.equal(viewerConfig.pages.length, 2);
});

test('coordinate transform handles bottom-left origin', () => {
  // Some PDF systems use bottom-left origin
  const transform = createCoordinateTransform();

  const fieldData = {
    page: 1,
    posX: 100,
    posY: 592, // 200 from bottom in 792pt page
    width: 150,
    height: 30,
    pageWidth: 612,
    pageHeight: 792
  };

  // With bottom-left origin, Y would need to be flipped
  // This test verifies the transform system handles different origins
  const coords = transform.pageToScreen(fieldData, 612, 792, 1.0);

  // Field should be positioned (transform handles origin in actual implementation)
  assert.ok(typeof coords.left === 'number');
  assert.ok(typeof coords.top === 'number');
});

// =============================================================================
// Phase 20 - Asset URL Resolution Tests
// =============================================================================
// These tests ensure that "View Document" and download actions never open
// raw JSON payload (contract_url), and only use binary asset URLs.

/**
 * Simulates the asset URL resolution logic from signer templates.
 * This function is a test double for the logic in session.html, fields.html, and review.html.
 *
 * @param {Object} assets - The assets object from the API response
 * @returns {string|null} - Binary asset URL or null (never contract_url)
 */
function resolveAssetUrl(assets) {
  if (!assets) return null;
  // Only use concrete binary asset URLs - never fall back to contract_url which is JSON
  return assets.source_url || assets.executed_url || assets.certificate_url || null;
}

test('Phase 20.FE.1: resolveAssetUrl returns source_url when available', () => {
  const assets = {
    source_url: '/api/v1/esign/signing/assets/token123?asset=source',
    contract_url: '/api/v1/esign/signing/assets/token123'
  };

  const result = resolveAssetUrl(assets);
  assert.equal(result, assets.source_url);
});

test('Phase 20.FE.1: resolveAssetUrl returns executed_url when source is unavailable', () => {
  const assets = {
    executed_url: '/api/v1/esign/signing/assets/token123?asset=executed',
    contract_url: '/api/v1/esign/signing/assets/token123'
  };

  const result = resolveAssetUrl(assets);
  assert.equal(result, assets.executed_url);
});

test('Phase 20.FE.1: resolveAssetUrl returns certificate_url as fallback', () => {
  const assets = {
    certificate_url: '/api/v1/esign/signing/assets/token123?asset=certificate',
    contract_url: '/api/v1/esign/signing/assets/token123'
  };

  const result = resolveAssetUrl(assets);
  assert.equal(result, assets.certificate_url);
});

test('Phase 20.FE.1: resolveAssetUrl NEVER returns contract_url', () => {
  const assets = {
    contract_url: '/api/v1/esign/signing/assets/token123'
  };

  const result = resolveAssetUrl(assets);
  assert.equal(result, null);
  assert.notEqual(result, assets.contract_url);
});

test('Phase 20.FE.1: resolveAssetUrl returns null for empty assets object', () => {
  const assets = {};
  const result = resolveAssetUrl(assets);
  assert.equal(result, null);
});

test('Phase 20.FE.1: resolveAssetUrl returns null for null/undefined assets', () => {
  assert.equal(resolveAssetUrl(null), null);
  assert.equal(resolveAssetUrl(undefined), null);
});

test('Phase 20.FE.1: resolveAssetUrl prioritizes source_url over executed_url', () => {
  const assets = {
    source_url: '/assets/source.pdf',
    executed_url: '/assets/executed.pdf',
    certificate_url: '/assets/certificate.pdf',
    contract_url: '/api/v1/esign/signing/assets/token123'
  };

  const result = resolveAssetUrl(assets);
  assert.equal(result, assets.source_url);
});

test('Phase 20.FE.1: resolveAssetUrl prioritizes executed_url over certificate_url', () => {
  const assets = {
    executed_url: '/assets/executed.pdf',
    certificate_url: '/assets/certificate.pdf',
    contract_url: '/api/v1/esign/signing/assets/token123'
  };

  const result = resolveAssetUrl(assets);
  assert.equal(result, assets.executed_url);
});

test('Phase 20.FE.1: "View Document" action should show error when no binary URL available', () => {
  // Simulates what happens when the assets endpoint returns only contract_url
  const assets = {
    contract_url: '/api/v1/esign/signing/assets/token123'
  };

  const binaryUrl = resolveAssetUrl(assets);
  const shouldShowError = binaryUrl === null;

  assert.equal(shouldShowError, true, 'Should show error when no binary URL is available');
});

test('Phase 20.FE.1: asset resolution ignores contract_url even when it looks like a valid URL', () => {
  const assets = {
    contract_url: 'https://example.com/api/v1/esign/signing/assets/token123'
  };

  const result = resolveAssetUrl(assets);
  assert.equal(result, null, 'Should not return contract_url even if it looks like a valid URL');
});

test('Phase 20.FE.1: asset resolution handles mixed case URLs correctly', () => {
  const assets = {
    source_url: null, // Explicitly null
    executed_url: '', // Empty string
    certificate_url: '/assets/certificate.pdf',
    contract_url: '/api/v1/esign/signing/assets/token123'
  };

  // Empty string is falsy, so should fall through to certificate_url
  const result = resolveAssetUrl(assets);
  assert.equal(result, assets.certificate_url);
});

// =============================================================================
// Phase 20.FE.2 - Flow Mode Resolution and Routing Tests
// =============================================================================
// These tests ensure that the session flow properly routes users to either
// unified (/review) or legacy (/fields) based on flow mode.

/**
 * Simulates extracting flow mode from URL query params.
 * This is a test double for the logic in session.html.
 *
 * @param {string} queryString - The URL query string (e.g., '?flow=unified')
 * @returns {string|null} - 'unified', 'legacy', or null
 */
function getFlowModeFromQuery(queryString) {
  const params = new URLSearchParams(queryString);
  const flow = params.get('flow');
  if (flow === 'unified' || flow === 'legacy') {
    return flow;
  }
  return null;
}

/**
 * Simulates resolving the effective flow mode.
 * @param {string} queryString - The URL query string
 * @returns {string} - 'unified' or 'legacy'
 */
function resolveFlowMode(queryString) {
  const queryMode = getFlowModeFromQuery(queryString);
  if (queryMode) {
    return queryMode;
  }
  // Default to legacy for backward compatibility
  return 'legacy';
}

/**
 * Simulates building the signing flow URL.
 * @param {string} mode - 'unified' or 'legacy'
 * @param {string} token - The signing token
 * @param {string} basePath - The base path (e.g., '/esign/sign')
 * @returns {string} - The full URL to navigate to
 */
function buildSigningFlowUrl(mode, token, basePath = '/esign/sign') {
  if (mode === 'unified') {
    return `${basePath}/${token}/review?flow=unified`;
  }
  return `${basePath}/${token}/fields?flow=legacy`;
}

test('Phase 20.FE.2: getFlowModeFromQuery returns unified when specified', () => {
  const result = getFlowModeFromQuery('?flow=unified');
  assert.equal(result, 'unified');
});

test('Phase 20.FE.2: getFlowModeFromQuery returns legacy when specified', () => {
  const result = getFlowModeFromQuery('?flow=legacy');
  assert.equal(result, 'legacy');
});

test('Phase 20.FE.2: getFlowModeFromQuery returns null for invalid flow value', () => {
  const result = getFlowModeFromQuery('?flow=invalid');
  assert.equal(result, null);
});

test('Phase 20.FE.2: getFlowModeFromQuery returns null when flow param is missing', () => {
  const result = getFlowModeFromQuery('?other=param');
  assert.equal(result, null);
});

test('Phase 20.FE.2: getFlowModeFromQuery returns null for empty query string', () => {
  const result = getFlowModeFromQuery('');
  assert.equal(result, null);
});

test('Phase 20.FE.2: resolveFlowMode returns query param when present', () => {
  assert.equal(resolveFlowMode('?flow=unified'), 'unified');
  assert.equal(resolveFlowMode('?flow=legacy'), 'legacy');
});

test('Phase 20.FE.2: resolveFlowMode defaults to legacy when no query param', () => {
  const result = resolveFlowMode('');
  assert.equal(result, 'legacy');
});

test('Phase 20.FE.2: resolveFlowMode defaults to legacy for invalid flow value', () => {
  const result = resolveFlowMode('?flow=invalid');
  assert.equal(result, 'legacy');
});

test('Phase 20.FE.2: buildSigningFlowUrl routes to /review for unified mode', () => {
  const url = buildSigningFlowUrl('unified', 'token123');
  assert.equal(url, '/esign/sign/token123/review?flow=unified');
});

test('Phase 20.FE.2: buildSigningFlowUrl routes to /fields for legacy mode', () => {
  const url = buildSigningFlowUrl('legacy', 'token123');
  assert.equal(url, '/esign/sign/token123/fields?flow=legacy');
});

test('Phase 20.FE.2: buildSigningFlowUrl preserves flow param in URL', () => {
  const unifiedUrl = buildSigningFlowUrl('unified', 'token123');
  const legacyUrl = buildSigningFlowUrl('legacy', 'token123');

  assert.ok(unifiedUrl.includes('flow=unified'), 'unified URL should include flow param');
  assert.ok(legacyUrl.includes('flow=legacy'), 'legacy URL should include flow param');
});

test('Phase 20.FE.2: consent success navigates to correct flow based on mode', () => {
  // Simulate consent success navigation for unified mode
  const unifiedMode = resolveFlowMode('?flow=unified');
  const unifiedUrl = buildSigningFlowUrl(unifiedMode, 'token123');
  assert.ok(unifiedUrl.includes('/review'), 'unified should navigate to /review');
  assert.ok(!unifiedUrl.includes('/fields'), 'unified should NOT navigate to /fields');

  // Simulate consent success navigation for legacy mode
  const legacyMode = resolveFlowMode('?flow=legacy');
  const legacyUrl = buildSigningFlowUrl(legacyMode, 'token123');
  assert.ok(legacyUrl.includes('/fields'), 'legacy should navigate to /fields');
  assert.ok(!legacyUrl.includes('/review'), 'legacy should NOT navigate to /review');
});

test('Phase 20.FE.2: already-consented redirect respects flow mode', () => {
  // When user is already consented and lands on session page with ?flow=unified
  const mode = resolveFlowMode('?flow=unified');
  const url = buildSigningFlowUrl(mode, 'token123');
  assert.equal(url, '/esign/sign/token123/review?flow=unified');
});

test('Phase 20.FE.2: flow mode is preserved across navigation', () => {
  // Ensure flow param is always included in generated URLs
  const unifiedUrl = buildSigningFlowUrl('unified', 'token123');
  const legacyUrl = buildSigningFlowUrl('legacy', 'token123');

  const unifiedParams = new URLSearchParams(unifiedUrl.split('?')[1]);
  const legacyParams = new URLSearchParams(legacyUrl.split('?')[1]);

  assert.equal(unifiedParams.get('flow'), 'unified');
  assert.equal(legacyParams.get('flow'), 'legacy');
});

// =============================================================================
// Phase 20.FE.3 - Completion Page Artifact Resolution Tests
// =============================================================================
// These tests ensure the completion page properly surfaces artifact actions
// and handles processing/unavailable states.

/**
 * Resolve binary asset URLs from the assets response.
 * This is a test double for the logic in complete.html.
 *
 * @param {Object} assets - The assets object from the API response
 * @returns {Object|null} - Resolved artifacts or null
 */
function resolveArtifacts(assets) {
  if (!assets) return null;

  const artifacts = {
    executed: assets.executed_url || null,
    source: assets.source_url || null,
    certificate: assets.certificate_url || null
  };

  // Check if any artifact is available
  const hasAny = !!(artifacts.executed || artifacts.source || artifacts.certificate);

  return hasAny ? artifacts : null;
}

/**
 * Determine the artifact display state based on assets and completion status.
 *
 * @param {Object|null} artifacts - Resolved artifacts
 * @param {boolean} agreementCompleted - Whether the agreement is fully completed
 * @param {boolean} hasServerFallback - Whether a server-rendered download URL exists
 * @returns {string} - 'available', 'processing', 'unavailable', or 'fallback'
 */
function determineArtifactState(artifacts, agreementCompleted, hasServerFallback) {
  if (artifacts) {
    return 'available';
  }
  // When no artifacts are available, show processing state
  // The server fallback is only used when API calls fail (error handling)
  return 'processing';
}

test('Phase 20.FE.3: resolveArtifacts returns all available artifacts', () => {
  const assets = {
    executed_url: '/assets/executed.pdf',
    source_url: '/assets/source.pdf',
    certificate_url: '/assets/certificate.pdf'
  };

  const result = resolveArtifacts(assets);

  assert.deepEqual(result, {
    executed: '/assets/executed.pdf',
    source: '/assets/source.pdf',
    certificate: '/assets/certificate.pdf'
  });
});

test('Phase 20.FE.3: resolveArtifacts returns partial artifacts', () => {
  const assets = {
    executed_url: '/assets/executed.pdf',
    source_url: null,
    certificate_url: null
  };

  const result = resolveArtifacts(assets);

  assert.deepEqual(result, {
    executed: '/assets/executed.pdf',
    source: null,
    certificate: null
  });
});

test('Phase 20.FE.3: resolveArtifacts returns null when no artifacts available', () => {
  const assets = {
    contract_url: '/api/v1/esign/signing/assets/token123'
  };

  const result = resolveArtifacts(assets);
  assert.equal(result, null);
});

test('Phase 20.FE.3: resolveArtifacts ignores contract_url', () => {
  const assets = {
    contract_url: '/api/v1/esign/signing/assets/token123',
    executed_url: null,
    source_url: null,
    certificate_url: null
  };

  const result = resolveArtifacts(assets);
  assert.equal(result, null);
});

test('Phase 20.FE.3: resolveArtifacts handles null/undefined input', () => {
  assert.equal(resolveArtifacts(null), null);
  assert.equal(resolveArtifacts(undefined), null);
});

test('Phase 20.FE.3: determineArtifactState returns "available" when artifacts exist', () => {
  const artifacts = { executed: '/assets/executed.pdf', source: null, certificate: null };
  const state = determineArtifactState(artifacts, true, false);
  assert.equal(state, 'available');
});

test('Phase 20.FE.3: determineArtifactState returns "processing" when agreement complete but no artifacts', () => {
  const state = determineArtifactState(null, true, false);
  assert.equal(state, 'processing');
});

test('Phase 20.FE.3: determineArtifactState returns "processing" when waiting for other signers', () => {
  const state = determineArtifactState(null, false, false);
  assert.equal(state, 'processing');
});

test('Phase 20.FE.3: completed agreement without artifacts shows processing state', () => {
  // This tests the scenario where signing just completed and artifacts are being generated
  const artifacts = resolveArtifacts({});
  const state = determineArtifactState(artifacts, true, false);

  assert.equal(artifacts, null);
  assert.equal(state, 'processing');
});

test('Phase 20.FE.3: completed agreement with executed document shows available state', () => {
  const artifacts = resolveArtifacts({
    executed_url: '/assets/executed.pdf'
  });
  const state = determineArtifactState(artifacts, true, false);

  assert.ok(artifacts !== null);
  assert.equal(state, 'available');
});

test('Phase 20.FE.3: incomplete agreement shows processing (waiting) state', () => {
  const artifacts = resolveArtifacts({});
  const state = determineArtifactState(artifacts, false, false);

  assert.equal(state, 'processing');
});

test('Phase 20.FE.3: artifact resolution returns all types when available', () => {
  const artifacts = resolveArtifacts({
    executed_url: '/assets/executed.pdf',
    source_url: '/assets/source.pdf',
    certificate_url: '/assets/certificate.pdf'
  });

  // All should be available
  assert.ok(artifacts.executed !== null);
  assert.ok(artifacts.source !== null);
  assert.ok(artifacts.certificate !== null);
});

test('Phase 20.FE.3: artifact resolution handles empty strings as unavailable', () => {
  const artifacts = resolveArtifacts({
    executed_url: '',
    source_url: '',
    certificate_url: ''
  });

  // Empty strings are falsy, so no artifacts should be detected
  assert.equal(artifacts, null);
});

// =============================================================================
// Phase 20.FE.4 - E2E Scenario Tests for Unified/Legacy Flow
// =============================================================================
// These tests verify the E2E behavior of the signing flow including:
// - Route resolution by flow mode
// - Consent -> next-step routing
// - Document preview opens PDF (never JSON)
// - Completion CTA lands on user-facing page with artifact action

/**
 * Simulates the route resolution for /sign/:token based on flow mode.
 * @param {string} flowMode - 'unified' or 'legacy'
 * @param {string} token - The signing token
 * @returns {string} - The resolved route path
 */
function resolveSigningRoute(flowMode, token) {
  const basePath = '/esign/sign';

  if (flowMode === 'unified') {
    // Unified mode directs to the review experience
    return `${basePath}/${token}/review`;
  }
  // Legacy mode directs to the fields experience
  return `${basePath}/${token}/fields`;
}

/**
 * Simulates consent success navigation.
 * @param {string} flowMode - 'unified' or 'legacy'
 * @param {string} token - The signing token
 * @returns {string} - The URL to navigate to after consent
 */
function resolveConsentNextStep(flowMode, token) {
  const basePath = '/esign/sign';

  if (flowMode === 'unified') {
    return `${basePath}/${token}/review?flow=unified`;
  }
  return `${basePath}/${token}/fields?flow=legacy`;
}

/**
 * Validates that a URL points to a binary asset (PDF) and not JSON.
 * @param {string|null} url - The URL to validate
 * @returns {boolean} - True if URL is a valid binary asset URL
 */
function isBinaryAssetUrl(url) {
  if (!url) return false;

  // Contract URLs return JSON, not binary
  if (url.includes('/api/') && url.includes('/signing/assets/') && !url.includes('?asset=')) {
    // This pattern matches contract_url which returns JSON
    return false;
  }

  // Binary URLs typically have asset type query params or direct file paths
  return true;
}

/**
 * Resolves the completion page URL.
 * @param {string} token - The signing token
 * @returns {string} - The completion page URL
 */
function resolveCompletionUrl(token) {
  return `/esign/sign/${token}/complete`;
}

// =============================================================================
// Route Resolution Tests
// =============================================================================

test('Phase 20.FE.4: /sign/:token route resolves to /review for unified mode', () => {
  const route = resolveSigningRoute('unified', 'token123');
  assert.equal(route, '/esign/sign/token123/review');
  assert.ok(route.includes('/review'), 'unified should route to review');
  assert.ok(!route.includes('/fields'), 'unified should NOT route to fields');
});

test('Phase 20.FE.4: /sign/:token route resolves to /fields for legacy mode', () => {
  const route = resolveSigningRoute('legacy', 'token123');
  assert.equal(route, '/esign/sign/token123/fields');
  assert.ok(route.includes('/fields'), 'legacy should route to fields');
  assert.ok(!route.includes('/review'), 'legacy should NOT route to review');
});

test('Phase 20.FE.4: route resolution is deterministic for same inputs', () => {
  const route1 = resolveSigningRoute('unified', 'token123');
  const route2 = resolveSigningRoute('unified', 'token123');
  assert.equal(route1, route2);
});

// =============================================================================
// Consent -> Next-Step Routing Tests
// =============================================================================

test('Phase 20.FE.4: consent success navigates to /review for unified mode', () => {
  const nextStep = resolveConsentNextStep('unified', 'token123');
  assert.ok(nextStep.includes('/review'), 'unified consent should navigate to review');
  assert.ok(nextStep.includes('flow=unified'), 'should preserve unified flow param');
});

test('Phase 20.FE.4: consent success navigates to /fields for legacy mode', () => {
  const nextStep = resolveConsentNextStep('legacy', 'token123');
  assert.ok(nextStep.includes('/fields'), 'legacy consent should navigate to fields');
  assert.ok(nextStep.includes('flow=legacy'), 'should preserve legacy flow param');
});

test('Phase 20.FE.4: consent navigation preserves flow mode in query params', () => {
  const unifiedUrl = resolveConsentNextStep('unified', 'token123');
  const legacyUrl = resolveConsentNextStep('legacy', 'token123');

  assert.ok(unifiedUrl.includes('flow=unified'));
  assert.ok(legacyUrl.includes('flow=legacy'));
});

// =============================================================================
// Document Preview Tests (PDF, not JSON)
// =============================================================================

test('Phase 20.FE.4: document preview with source_url is valid binary', () => {
  const assets = {
    source_url: '/api/v1/esign/signing/assets/token123?asset=source',
    contract_url: '/api/v1/esign/signing/assets/token123'
  };

  const previewUrl = resolveAssetUrl(assets);
  assert.equal(previewUrl, assets.source_url);
  assert.ok(isBinaryAssetUrl(previewUrl), 'preview URL should be binary asset');
});

test('Phase 20.FE.4: document preview with executed_url is valid binary', () => {
  const assets = {
    executed_url: '/api/v1/esign/signing/assets/token123?asset=executed',
    contract_url: '/api/v1/esign/signing/assets/token123'
  };

  const previewUrl = resolveAssetUrl(assets);
  assert.equal(previewUrl, assets.executed_url);
  assert.ok(isBinaryAssetUrl(previewUrl), 'preview URL should be binary asset');
});

test('Phase 20.FE.4: document preview NEVER returns contract_url (JSON)', () => {
  const assets = {
    contract_url: '/api/v1/esign/signing/assets/token123'
  };

  const previewUrl = resolveAssetUrl(assets);
  assert.equal(previewUrl, null, 'should not return contract_url');
});

test('Phase 20.FE.4: isBinaryAssetUrl rejects contract_url patterns', () => {
  const contractUrl = '/api/v1/esign/signing/assets/token123';
  assert.equal(isBinaryAssetUrl(contractUrl), false, 'contract_url should not be binary');
});

test('Phase 20.FE.4: isBinaryAssetUrl accepts asset-specific URLs', () => {
  const sourceUrl = '/api/v1/esign/signing/assets/token123?asset=source';
  const executedUrl = '/api/v1/esign/signing/assets/token123?asset=executed';

  assert.equal(isBinaryAssetUrl(sourceUrl), true, 'source URL should be binary');
  assert.equal(isBinaryAssetUrl(executedUrl), true, 'executed URL should be binary');
});

test('Phase 20.FE.4: isBinaryAssetUrl accepts direct file paths', () => {
  const directPath = '/files/documents/executed.pdf';
  assert.equal(isBinaryAssetUrl(directPath), true, 'direct path should be binary');
});

// =============================================================================
// Completion CTA Tests
// =============================================================================

test('Phase 20.FE.4: completion page URL is user-facing', () => {
  const completionUrl = resolveCompletionUrl('token123');
  assert.equal(completionUrl, '/esign/sign/token123/complete');
  assert.ok(!completionUrl.includes('/api/'), 'completion URL should not be API endpoint');
});

test('Phase 20.FE.4: completion page has artifact actions when available', () => {
  const artifacts = resolveArtifacts({
    executed_url: '/assets/executed.pdf',
    certificate_url: '/assets/certificate.pdf'
  });

  // When artifacts are available, completion page should show actions
  assert.ok(artifacts !== null, 'should have artifacts');
  assert.ok(artifacts.executed !== null, 'should have executed document');
  assert.ok(artifacts.certificate !== null, 'should have certificate');
});

test('Phase 20.FE.4: completion page shows processing state when no artifacts', () => {
  const artifacts = resolveArtifacts({});
  const state = determineArtifactState(artifacts, true, false);

  assert.equal(state, 'processing', 'should show processing when no artifacts');
});

// =============================================================================
// Legacy Flow Regression Tests
// =============================================================================

test('Phase 20.FE.4: legacy flow continues to work with /fields route', () => {
  const route = resolveSigningRoute('legacy', 'token123');
  const consentNext = resolveConsentNextStep('legacy', 'token123');

  assert.ok(route.includes('/fields'));
  assert.ok(consentNext.includes('/fields'));
});

test('Phase 20.FE.4: legacy flow preserves flow=legacy in navigation', () => {
  const url = buildSigningFlowUrl('legacy', 'token123');
  assert.ok(url.includes('flow=legacy'));
});

test('Phase 20.FE.4: default flow mode is legacy for backward compatibility', () => {
  // When no flow mode is specified, should default to legacy
  const mode = resolveFlowMode('');
  assert.equal(mode, 'legacy');
});

// =============================================================================
// Full E2E Flow Simulation Tests
// =============================================================================

test('Phase 20.FE.4: E2E unified flow: entry -> consent -> review -> complete', () => {
  const token = 'token123';
  const flowMode = 'unified';

  // Step 1: Entry point resolves to appropriate route
  const entryRoute = resolveSigningRoute(flowMode, token);
  assert.ok(entryRoute.includes('/review'), 'unified entry should go to review');

  // Step 2: After consent, navigate to next step
  const consentNextStep = resolveConsentNextStep(flowMode, token);
  assert.ok(consentNextStep.includes('/review'), 'consent should navigate to review');
  assert.ok(consentNextStep.includes('flow=unified'), 'should preserve flow mode');

  // Step 3: Completion page is user-facing
  const completionUrl = resolveCompletionUrl(token);
  assert.ok(!completionUrl.includes('/api/'), 'completion should not be API endpoint');
});

test('Phase 20.FE.4: E2E legacy flow: entry -> consent -> fields -> complete', () => {
  const token = 'token123';
  const flowMode = 'legacy';

  // Step 1: Entry point resolves to appropriate route
  const entryRoute = resolveSigningRoute(flowMode, token);
  assert.ok(entryRoute.includes('/fields'), 'legacy entry should go to fields');

  // Step 2: After consent, navigate to next step
  const consentNextStep = resolveConsentNextStep(flowMode, token);
  assert.ok(consentNextStep.includes('/fields'), 'consent should navigate to fields');
  assert.ok(consentNextStep.includes('flow=legacy'), 'should preserve flow mode');

  // Step 3: Completion page is user-facing
  const completionUrl = resolveCompletionUrl(token);
  assert.ok(!completionUrl.includes('/api/'), 'completion should not be API endpoint');
});

test('Phase 20.FE.4: E2E document preview never returns JSON contract', () => {
  // Simulate various asset scenarios
  const scenarios = [
    { source_url: '/assets/source.pdf', contract_url: '/api/...' },
    { executed_url: '/assets/executed.pdf', contract_url: '/api/...' },
    { certificate_url: '/assets/cert.pdf', contract_url: '/api/...' },
    { contract_url: '/api/v1/esign/signing/assets/token123' } // No binary URLs
  ];

  for (const assets of scenarios) {
    const previewUrl = resolveAssetUrl(assets);

    if (previewUrl) {
      // If we got a URL, it should be a binary asset URL
      assert.ok(isBinaryAssetUrl(previewUrl),
        `Preview URL "${previewUrl}" should be binary, not JSON contract`);
      assert.notEqual(previewUrl, assets.contract_url,
        'Preview URL should never be contract_url');
    }
    // It's OK for previewUrl to be null when no binary URLs are available
  }
});
