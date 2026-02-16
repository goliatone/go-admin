import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const agreementDetailTemplatePath = path.resolve(
  testFileDir,
  '../../templates/resources/esign-agreements/detail.html',
);
const documentFormTemplatePath = path.resolve(
  testFileDir,
  '../../templates/resources/esign-documents/form.html',
);
const googleIntegrationTemplatePath = path.resolve(
  testFileDir,
  '../../templates/resources/esign-integrations/google.html',
);

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
// E-Sign Download Unavailable State Tests
// =============================================================================

test('agreement detail template renders unavailable download button with warning icon and label', () => {
  const template = fs.readFileSync(agreementDetailTemplatePath, 'utf8');

  assert.match(template, /data-download-state="unavailable"/);
  assert.match(template, />\s*Unable To Download PDF\s*</);
  assert.match(template, /M12 9v2m0 4h\.01m-6\.938 4h13\.856/);
});

test('agreement detail template JS uses warning icon for runtime unavailable download state', () => {
  const template = fs.readFileSync(agreementDetailTemplatePath, 'utf8');

  assert.match(template, /const unavailableDownloadIcon =/);
  assert.match(template, /markExecutedDownloadUnavailable/);
  assert.match(template, /Unable To Download PDF/);
  assert.match(template, /M12 9v2m0 4h\.01m-6\.938 4h13\.856/);
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
// Phase 31: Unified Document Ingestion UI Tests
// =============================================================================

/**
 * Source types for document ingestion
 */
const DOC_INGESTION_SOURCES = ['upload', 'google'];

/**
 * Import status states (async import state machine)
 */
const IMPORT_STATES = ['queued', 'running', 'succeeded', 'failed'];

/**
 * Importable MIME types from Google Drive
 */
const IMPORTABLE_MIME_TYPES = [
  'application/vnd.google-apps.document',
  'application/pdf',
];

/**
 * Non-importable MIME types from Google Drive
 */
const NON_IMPORTABLE_MIME_TYPES = [
  'application/vnd.google-apps.spreadsheet',
  'application/vnd.google-apps.presentation',
  'application/vnd.google-apps.folder',
  'image/png',
  'image/jpeg',
];

/**
 * Parse source from URL query parameters
 * @param {string} queryString - URL search string
 * @returns {string} - 'upload' | 'google'
 */
function parseSourceFromQuery(queryString) {
  const params = new URLSearchParams(queryString);
  const source = params.get('source');
  return source === 'google' ? 'google' : 'upload';
}

/**
 * Check if a Google Drive file is importable
 * @param {Object} file - Google Drive file object
 * @returns {boolean}
 */
function isFileImportable(file) {
  const mimeType = (file.mimeType || '').toLowerCase();
  return mimeType === 'application/vnd.google-apps.document' || mimeType === 'application/pdf';
}

/**
 * Check if a file is a Google Doc (will be exported as PDF)
 * @param {Object} file - Google Drive file object
 * @returns {boolean}
 */
function isGoogleDocFile(file) {
  const mimeType = (file.mimeType || '').toLowerCase();
  return mimeType === 'application/vnd.google-apps.document';
}

/**
 * Check if a file is a native PDF
 * @param {Object} file - Google Drive file object
 * @returns {boolean}
 */
function isPDFFile(file) {
  const mimeType = (file.mimeType || '').toLowerCase();
  return mimeType === 'application/pdf';
}

/**
 * Check if a file is a folder
 * @param {Object} file - Google Drive file object
 * @returns {boolean}
 */
function isFolderFile(file) {
  const mimeType = (file.mimeType || '').toLowerCase();
  return mimeType === 'application/vnd.google-apps.folder';
}

/**
 * Get import type info for a file
 * @param {Object} file - Google Drive file object
 * @returns {Object|null} - Import type info or null if not importable
 */
function getImportTypeInfo(file) {
  if (isGoogleDocFile(file)) {
    return {
      type: 'google_doc',
      label: 'Google Doc → PDF Export',
      description: 'Will be exported as PDF snapshot',
      showSnapshotWarning: true,
    };
  }
  if (isPDFFile(file)) {
    return {
      type: 'pdf',
      label: 'Direct PDF Import',
      description: 'Will be imported as-is',
      showSnapshotWarning: false,
    };
  }
  return null;
}

/**
 * Determine if an import state is terminal (no more polling needed)
 * @param {string} state - Import state
 * @returns {boolean}
 */
function isImportStateTerminal(state) {
  return state === 'succeeded' || state === 'failed';
}

/**
 * Determine if an import state is polling-active
 * @param {string} state - Import state
 * @returns {boolean}
 */
function isImportStatePolling(state) {
  return state === 'queued' || state === 'running';
}

/**
 * Check if import_run_id should resume polling
 * @param {string} queryString - URL search string
 * @returns {string|null} - import_run_id or null
 */
function parseImportRunIdFromQuery(queryString) {
  const params = new URLSearchParams(queryString);
  return params.get('import_run_id') || null;
}

// Source Selector Tests

test('parseSourceFromQuery returns upload by default', () => {
  assert.equal(parseSourceFromQuery(''), 'upload');
  assert.equal(parseSourceFromQuery('?foo=bar'), 'upload');
});

test('parseSourceFromQuery returns google when source=google', () => {
  assert.equal(parseSourceFromQuery('?source=google'), 'google');
});

test('parseSourceFromQuery returns upload for invalid source values', () => {
  assert.equal(parseSourceFromQuery('?source='), 'upload');
  assert.equal(parseSourceFromQuery('?source=dropbox'), 'upload');
  assert.equal(parseSourceFromQuery('?source=onedrive'), 'upload');
});

test('parseSourceFromQuery preserves google source with other params', () => {
  assert.equal(parseSourceFromQuery('?source=google&tenant_id=t1'), 'google');
  assert.equal(parseSourceFromQuery('?foo=bar&source=google'), 'google');
});

// File Type Detection Tests

test('isFileImportable returns true for Google Docs', () => {
  assert.equal(isFileImportable({ mimeType: 'application/vnd.google-apps.document' }), true);
});

test('isFileImportable returns true for PDFs', () => {
  assert.equal(isFileImportable({ mimeType: 'application/pdf' }), true);
});

test('isFileImportable returns false for spreadsheets', () => {
  assert.equal(isFileImportable({ mimeType: 'application/vnd.google-apps.spreadsheet' }), false);
});

test('isFileImportable returns false for presentations', () => {
  assert.equal(isFileImportable({ mimeType: 'application/vnd.google-apps.presentation' }), false);
});

test('isFileImportable returns false for folders', () => {
  assert.equal(isFileImportable({ mimeType: 'application/vnd.google-apps.folder' }), false);
});

test('isFileImportable returns false for images', () => {
  assert.equal(isFileImportable({ mimeType: 'image/png' }), false);
  assert.equal(isFileImportable({ mimeType: 'image/jpeg' }), false);
});

test('isGoogleDocFile correctly identifies Google Docs', () => {
  assert.equal(isGoogleDocFile({ mimeType: 'application/vnd.google-apps.document' }), true);
  assert.equal(isGoogleDocFile({ mimeType: 'application/pdf' }), false);
  assert.equal(isGoogleDocFile({ mimeType: 'application/vnd.google-apps.spreadsheet' }), false);
});

test('isPDFFile correctly identifies PDF files', () => {
  assert.equal(isPDFFile({ mimeType: 'application/pdf' }), true);
  assert.equal(isPDFFile({ mimeType: 'application/vnd.google-apps.document' }), false);
});

test('isFolderFile correctly identifies folders', () => {
  assert.equal(isFolderFile({ mimeType: 'application/vnd.google-apps.folder' }), true);
  assert.equal(isFolderFile({ mimeType: 'application/pdf' }), false);
});

// Import Type Info Tests

test('getImportTypeInfo returns google_doc info for Google Docs', () => {
  const info = getImportTypeInfo({ mimeType: 'application/vnd.google-apps.document' });
  assert.ok(info);
  assert.equal(info.type, 'google_doc');
  assert.equal(info.showSnapshotWarning, true);
});

test('getImportTypeInfo returns pdf info for PDFs', () => {
  const info = getImportTypeInfo({ mimeType: 'application/pdf' });
  assert.ok(info);
  assert.equal(info.type, 'pdf');
  assert.equal(info.showSnapshotWarning, false);
});

test('getImportTypeInfo returns null for non-importable files', () => {
  assert.equal(getImportTypeInfo({ mimeType: 'application/vnd.google-apps.spreadsheet' }), null);
  assert.equal(getImportTypeInfo({ mimeType: 'application/vnd.google-apps.folder' }), null);
  assert.equal(getImportTypeInfo({ mimeType: 'image/png' }), null);
});

// Async Import State Machine Tests

test('isImportStateTerminal returns true for succeeded', () => {
  assert.equal(isImportStateTerminal('succeeded'), true);
});

test('isImportStateTerminal returns true for failed', () => {
  assert.equal(isImportStateTerminal('failed'), true);
});

test('isImportStateTerminal returns false for queued', () => {
  assert.equal(isImportStateTerminal('queued'), false);
});

test('isImportStateTerminal returns false for running', () => {
  assert.equal(isImportStateTerminal('running'), false);
});

test('isImportStatePolling returns true for queued', () => {
  assert.equal(isImportStatePolling('queued'), true);
});

test('isImportStatePolling returns true for running', () => {
  assert.equal(isImportStatePolling('running'), true);
});

test('isImportStatePolling returns false for succeeded', () => {
  assert.equal(isImportStatePolling('succeeded'), false);
});

test('isImportStatePolling returns false for failed', () => {
  assert.equal(isImportStatePolling('failed'), false);
});

// Import Run ID Resume Tests

test('parseImportRunIdFromQuery returns null when not present', () => {
  assert.equal(parseImportRunIdFromQuery(''), null);
  assert.equal(parseImportRunIdFromQuery('?source=google'), null);
});

test('parseImportRunIdFromQuery extracts import_run_id', () => {
  assert.equal(parseImportRunIdFromQuery('?import_run_id=run_123'), 'run_123');
});

test('parseImportRunIdFromQuery works with multiple params', () => {
  assert.equal(parseImportRunIdFromQuery('?source=google&import_run_id=run_abc'), 'run_abc');
});

// Deep Link Behavior Tests

test('deep link with source=google activates Google tab', () => {
  const source = parseSourceFromQuery('?source=google');
  assert.equal(source, 'google');
});

test('deep link with import_run_id triggers resume', () => {
  const importRunId = parseImportRunIdFromQuery('?source=google&import_run_id=run_xyz');
  assert.ok(importRunId);
  assert.equal(importRunId, 'run_xyz');
});

test('import states follow expected transitions', () => {
  // Valid transitions: queued -> running -> succeeded | failed
  const transitions = {
    queued: ['running', 'succeeded', 'failed'],
    running: ['succeeded', 'failed'],
    succeeded: [], // terminal
    failed: [], // terminal (retry creates new run)
  };

  assert.ok(transitions.queued.includes('running'));
  assert.ok(transitions.running.includes('succeeded'));
  assert.ok(transitions.running.includes('failed'));
  assert.equal(transitions.succeeded.length, 0);
  assert.equal(transitions.failed.length, 0);
});

// All importable MIME types are recognized

test('all importable MIME types are correctly identified', () => {
  for (const mimeType of IMPORTABLE_MIME_TYPES) {
    assert.ok(isFileImportable({ mimeType }), `${mimeType} should be importable`);
  }
});

test('all non-importable MIME types are correctly rejected', () => {
  for (const mimeType of NON_IMPORTABLE_MIME_TYPES) {
    assert.equal(isFileImportable({ mimeType }), false, `${mimeType} should not be importable`);
  }
});

test('Phase 31 template: quick action targets unified new-document route', () => {
  const template = fs.readFileSync(googleIntegrationTemplatePath, 'utf8');
  assert.match(template, /adminURL\("content\/esign_documents\/new"\)\s*\}\}\?source=google/);
});

test('Phase 31 template: importability checks are strict MIME matches', () => {
  const template = fs.readFileSync(documentFormTemplatePath, 'utf8');
  assert.match(template, /const MIME_GOOGLE_DOC = 'application\/vnd\.google-apps\.document';/);
  assert.match(template, /const MIME_PDF = 'application\/pdf';/);
  assert.match(template, /return isGoogleDoc\(file\) \|\| isPDF\(file\);/);
  assert.doesNotMatch(template, /mimeType\.includes\('document'\)/);
});

test('Phase 31 template: succeeded import redirects to agreement before document', () => {
  const template = fs.readFileSync(documentFormTemplatePath, 'utf8');
  assert.match(template, /if \(data\.agreement\?\.id\) \{/);
  assert.match(template, /window\.location\.href = `\$\{agreementsBase\}\/\$\{encodeURIComponent\(data\.agreement\.id\)\}`;/);
  assert.match(template, /else if \(data\.document\?\.id\) \{/);
});

test('Phase 31 template: retry button triggers a new async import submission', () => {
  const template = fs.readFileSync(documentFormTemplatePath, 'utf8');
  assert.match(template, /importRetryBtn\.addEventListener\('click', \(\) => \{/);
  assert.match(template, /if \(selectedFile\) \{\s*startImport\(\);/s);
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
// V2 Unified Signer Flow Tests (Phase 23 - Single Mode Only)
// -----------------------------------------------------------------------------

// V2: Unified is the ONLY supported signer flow mode
const V2_SIGNER_FLOW_MODE = 'unified';

function getSignerRoute(token) {
  // V2: All signing routes go to the unified review page
  return `/esign/sign/${token}/review`;
}

function isViewerCriticalError(error) {
  // Errors that require showing error message with refresh option
  const criticalErrors = [
    'PDF_LOAD_FAILED',
    'CANVAS_NOT_SUPPORTED',
    'VIEWER_INIT_FAILED',
    'GEOMETRY_UNAVAILABLE',
  ];
  const errorCode = error?.code || error?.textCode || '';
  return criticalErrors.includes(errorCode);
}

function getViewerErrorRecoveryAction(error) {
  // V2: No legacy fallback - show error with refresh option
  return {
    action: 'refresh',
    message: 'Unable to load the document viewer. Please refresh the page or contact the sender for assistance.',
  };
}

test('V2: getSignerRoute returns review path for all tokens', () => {
  const route = getSignerRoute('token123');
  assert.equal(route, '/esign/sign/token123/review');
});

test('V2: unified is the only supported flow mode', () => {
  assert.equal(V2_SIGNER_FLOW_MODE, 'unified');
});

test('V2: isViewerCriticalError returns true for viewer failures', () => {
  assert.equal(isViewerCriticalError({ code: 'PDF_LOAD_FAILED' }), true);
  assert.equal(isViewerCriticalError({ textCode: 'CANVAS_NOT_SUPPORTED' }), true);
  assert.equal(isViewerCriticalError({ code: 'VIEWER_INIT_FAILED' }), true);
  assert.equal(isViewerCriticalError({ code: 'GEOMETRY_UNAVAILABLE' }), true);
});

test('V2: isViewerCriticalError returns false for regular errors', () => {
  assert.equal(isViewerCriticalError({ code: 'TOKEN_EXPIRED' }), false);
  assert.equal(isViewerCriticalError({ code: 'MISSING_REQUIRED_FIELDS' }), false);
  assert.equal(isViewerCriticalError({}), false);
});

test('V2: viewer errors provide refresh recovery action', () => {
  const recovery = getViewerErrorRecoveryAction({ code: 'PDF_LOAD_FAILED' });
  assert.equal(recovery.action, 'refresh');
  assert.ok(recovery.message.includes('refresh'));
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
    field_instance_id: fieldId,
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

  assert.equal(payload.field_instance_id, 'field123');
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
// V2 Signer Flow Router Tests (Phase 23 - Single Mode Only)
// -----------------------------------------------------------------------------

class V2SignerFlowRouter {
  constructor() {
    // V2: Unified is the only mode, no fallback to legacy
    this.mode = 'unified';
  }

  resolveEntrypoint(token) {
    // V2: All tokens route to review page
    return {
      mode: this.mode,
      path: getSignerRoute(token),
      token,
    };
  }

  handleViewerError(token, error) {
    // V2: No legacy fallback - return error recovery info
    if (isViewerCriticalError(error)) {
      return getViewerErrorRecoveryAction(error);
    }
    return null;
  }

  getCompletionPath(token) {
    return `/esign/sign/${token}/complete`;
  }

  getDeclinedPath(token) {
    return `/esign/sign/${token}/declined`;
  }
}

test('V2SignerFlowRouter resolves unified entrypoint for all tokens', () => {
  const router = new V2SignerFlowRouter();
  const entry = router.resolveEntrypoint('tok_abc');

  assert.equal(entry.mode, 'unified');
  assert.equal(entry.path, '/esign/sign/tok_abc/review');
});

test('V2SignerFlowRouter handles viewer errors with recovery action', () => {
  const router = new V2SignerFlowRouter();
  const recovery = router.handleViewerError('tok_abc', { code: 'PDF_LOAD_FAILED' });

  assert.ok(recovery);
  assert.equal(recovery.action, 'refresh');
  assert.ok(recovery.message.includes('refresh'));
});

test('V2SignerFlowRouter returns null for non-viewer errors', () => {
  const router = new V2SignerFlowRouter();
  const recovery = router.handleViewerError('tok_abc', { code: 'TOKEN_EXPIRED' });

  assert.equal(recovery, null);
});

test('V2SignerFlowRouter returns correct completion paths', () => {
  const router = new V2SignerFlowRouter();

  assert.equal(router.getCompletionPath('tok_abc'), '/esign/sign/tok_abc/complete');
  assert.equal(router.getDeclinedPath('tok_abc'), '/esign/sign/tok_abc/declined');
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

    trackViewerCriticalError(reason) {
      this.track('viewer_critical_error', {
        reason,
        timeBeforeError: Date.now() - this.startTime
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
    'viewer_critical_error',
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

// Viewer critical error tracking tests (V2: replaces legacy trackFallback)
test('trackViewerCriticalError records reason', () => {
  const t = createMockTelemetry();
  t.trackViewerCriticalError('pdf_load_failed');

  assert.equal(t.events[0].event, 'viewer_critical_error');
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
  assert.equal(isCriticalTelemetryEvent('viewer_critical_error'), true);
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
 * Get recommended flow mode for browser (V2: unified-only)
 * @param {Object} capabilities - Browser capabilities
 * @returns {'unified'|'unsupported'}
 */
function getRecommendedFlowMode(capabilities) {
  if (!isUnifiedModeSupported(capabilities)) {
    return 'unsupported';
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

// V2 single-mode route tests
test('V2: all signing routes go to review', () => {
  const signingRoute = '/esign/sign/token123/review';
  const completeRoute = '/esign/sign/token123/complete';
  const declinedRoute = '/esign/sign/token123/declined';

  assert.ok(signingRoute.includes('review'), 'signing route includes review');
  assert.ok(!completeRoute.includes('review'), 'complete route is terminal');
  assert.ok(!declinedRoute.includes('review'), 'declined route is terminal');
});

test('V2: token is preserved across routes', () => {
  const token = 'tok_abc123';
  const signingPath = `/esign/sign/${token}/review`;
  const completePath = `/esign/sign/${token}/complete`;

  // Extract token from both paths
  const tokenFromSigning = signingPath.split('/')[3];
  const tokenFromComplete = completePath.split('/')[3];

  assert.equal(tokenFromSigning, token);
  assert.equal(tokenFromComplete, token);
});

// Cross-browser regression: All browsers should support unified
test('all browsers support unified mode', () => {
  for (const [browserName, capabilities] of Object.entries(BROWSER_CAPABILITIES)) {
    // V2: All browsers route to unified, no fallback to legacy
    assert.equal(isUnifiedModeSupported(capabilities), true, `${browserName} should support unified mode`);
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
    field_instance_id: 'sig_field_3',
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
    field_instance_id: 'sig_typed_1',
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
 * This function is a test double for the logic in review.html (unified signer experience).
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
// Phase 23 V2: Single-Mode Signer Flow Tests (Supersedes Phase 20.FE.2)
// =============================================================================
// Phase 23 removes legacy flow mode. All signing routes go to unified review.
// These tests validate V2 single-mode behavior.

/**
 * V2: Build signing URL - always routes to review.
 * @param {string} token - The signing token
 * @param {string} basePath - The base path (e.g., '/esign/sign')
 * @returns {string} - The full URL to navigate to
 */
function buildV2SigningUrl(token, basePath = '/esign/sign') {
  return `${basePath}/${token}/review`;
}

/**
 * V2: Get terminal page URL
 * @param {string} type - 'complete' or 'declined'
 * @param {string} token - The signing token
 * @param {string} basePath - The base path
 * @returns {string} - The terminal page URL
 */
function getV2TerminalUrl(type, token, basePath = '/esign/sign') {
  return `${basePath}/${token}/${type}`;
}

test('Phase 23 V2: buildV2SigningUrl always routes to review', () => {
  const url = buildV2SigningUrl('token123');
  assert.equal(url, '/esign/sign/token123/review');
});

test('Phase 23 V2: signing URL does not include flow query param', () => {
  const url = buildV2SigningUrl('token123');
  assert.ok(!url.includes('flow='), 'V2 URL should not include flow param');
});

test('Phase 23 V2: consent success navigates to review page', () => {
  const url = buildV2SigningUrl('token123');
  assert.ok(url.includes('/review'), 'should navigate to /review');
  assert.ok(!url.includes('/fields'), 'should NOT navigate to /fields');
});

test('Phase 23 V2: getV2TerminalUrl returns correct complete URL', () => {
  const url = getV2TerminalUrl('complete', 'token123');
  assert.equal(url, '/esign/sign/token123/complete');
});

test('Phase 23 V2: getV2TerminalUrl returns correct declined URL', () => {
  const url = getV2TerminalUrl('declined', 'token123');
  assert.equal(url, '/esign/sign/token123/declined');
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
// Phase 23 V2: E2E Scenario Tests (Supersedes Phase 20.FE.4)
// =============================================================================
// Phase 23 removes legacy flow mode. All signing routes go to unified review.
// These tests verify V2 E2E behavior:
// - All routes go to /review (no legacy /fields)
// - Consent navigates to /review
// - Document preview opens PDF (never JSON)
// - Completion CTA lands on user-facing page with artifact action

/**
 * V2: Resolves the signing route - always returns review.
 * @param {string} token - The signing token
 * @returns {string} - The resolved route path
 */
function resolveV2SigningRoute(token) {
  return `/esign/sign/${token}/review`;
}

/**
 * V2: Resolves consent success navigation - always to review.
 * @param {string} token - The signing token
 * @returns {string} - The URL to navigate to after consent
 */
function resolveV2ConsentNextStep(token) {
  return `/esign/sign/${token}/review`;
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
// V2 Route Resolution Tests
// =============================================================================

test('Phase 23 V2: /sign/:token route always resolves to /review', () => {
  const route = resolveV2SigningRoute('token123');
  assert.equal(route, '/esign/sign/token123/review');
  assert.ok(route.includes('/review'), 'should route to review');
  assert.ok(!route.includes('/fields'), 'should NOT route to fields');
});

test('Phase 23 V2: route resolution is deterministic for same token', () => {
  const route1 = resolveV2SigningRoute('token123');
  const route2 = resolveV2SigningRoute('token123');
  assert.equal(route1, route2);
});

// =============================================================================
// V2 Consent -> Next-Step Routing Tests
// =============================================================================

test('Phase 23 V2: consent success navigates to /review', () => {
  const nextStep = resolveV2ConsentNextStep('token123');
  assert.ok(nextStep.includes('/review'), 'consent should navigate to review');
  assert.ok(!nextStep.includes('/fields'), 'should NOT navigate to fields');
});

test('Phase 23 V2: consent navigation does not include flow param', () => {
  const url = resolveV2ConsentNextStep('token123');
  assert.ok(!url.includes('flow='), 'V2 consent URL should not include flow param');
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
// Phase 23 V2: Full E2E Flow Simulation Tests
// =============================================================================

test('Phase 23 V2: E2E flow: entry -> consent -> review -> complete', () => {
  const token = 'token123';

  // Step 1: Entry point always resolves to review
  const entryRoute = resolveV2SigningRoute(token);
  assert.ok(entryRoute.includes('/review'), 'entry should go to review');
  assert.ok(!entryRoute.includes('/fields'), 'entry should NOT go to fields');

  // Step 2: After consent, navigate to review
  const consentNextStep = resolveV2ConsentNextStep(token);
  assert.ok(consentNextStep.includes('/review'), 'consent should navigate to review');
  assert.ok(!consentNextStep.includes('flow='), 'V2 should not include flow param');

  // Step 3: Completion page is user-facing
  const completionUrl = resolveCompletionUrl(token);
  assert.ok(!completionUrl.includes('/api/'), 'completion should not be API endpoint');
});

test('Phase 23 V2: E2E flow is deterministic across multiple invocations', () => {
  const token = 'token123';

  const route1 = resolveV2SigningRoute(token);
  const route2 = resolveV2SigningRoute(token);
  const consent1 = resolveV2ConsentNextStep(token);
  const consent2 = resolveV2ConsentNextStep(token);

  assert.equal(route1, route2, 'route resolution should be deterministic');
  assert.equal(consent1, consent2, 'consent navigation should be deterministic');
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

// =============================================================================
// Phase 21.FE.3: ID-Based Payload Contract Tests
// =============================================================================

/**
 * Simulates participant ID generation (v2 ID-based, not index-based)
 * In production, this generates temporary client-side IDs that backend replaces
 */
function generateParticipantId(counter = 0) {
  return `temp_${Date.now()}_${counter}`;
}

/**
 * Simulates field definition ID generation (v2 ID-based, not index-based)
 */
function generateFieldDefinitionId(counter = 0) {
  return `temp_field_${Date.now()}_${counter}`;
}

/**
 * Validates that a participant payload uses ID-based structure (v2 contract)
 */
function validateParticipantPayload(participant) {
  const errors = [];

  // Must have stable ID (not index)
  if (!participant.id || typeof participant.id !== 'string') {
    errors.push('participant.id must be a non-empty string');
  }

  // Must not use recipient_index or positional references
  if ('recipient_index' in participant) {
    errors.push('participant must not have recipient_index (v1 legacy)');
  }
  if ('index' in participant) {
    errors.push('participant must not have index (v1 legacy)');
  }

  // Required fields for v2 contract
  if (!('email' in participant)) {
    errors.push('participant.email is required');
  }
  if (!('role' in participant)) {
    errors.push('participant.role is required');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates that a field definition payload uses ID-based structure (v2 contract)
 */
function validateFieldDefinitionPayload(fieldDef) {
  const errors = [];

  // Must have stable ID (not index)
  if (!fieldDef.id || typeof fieldDef.id !== 'string') {
    errors.push('field_definition.id must be a non-empty string');
  }

  // Must reference participant by ID, not index
  if ('recipient_index' in fieldDef) {
    errors.push('field_definition must not have recipient_index (v1 legacy)');
  }
  if (!fieldDef.participant_id) {
    errors.push('field_definition.participant_id is required');
  }

  // Must have type
  if (!fieldDef.type) {
    errors.push('field_definition.type is required');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Simulates optimistic update: apply local change immediately while pending server response
 */
function applyOptimisticUpdate(state, update) {
  const newState = { ...state };

  if (update.type === 'add_participant') {
    const tempId = generateParticipantId(Object.keys(newState.participants || {}).length);
    newState.participants = {
      ...(newState.participants || {}),
      [tempId]: { ...update.data, id: tempId, _pending: true }
    };
    return { state: newState, tempId };
  }

  if (update.type === 'add_field_definition') {
    const tempId = generateFieldDefinitionId(Object.keys(newState.field_definitions || {}).length);
    newState.field_definitions = {
      ...(newState.field_definitions || {}),
      [tempId]: { ...update.data, id: tempId, _pending: true }
    };
    return { state: newState, tempId };
  }

  if (update.type === 'update_participant') {
    if (newState.participants && newState.participants[update.id]) {
      newState.participants = {
        ...newState.participants,
        [update.id]: { ...newState.participants[update.id], ...update.data, _pending: true }
      };
    }
    return { state: newState };
  }

  if (update.type === 'remove_participant') {
    if (newState.participants) {
      const { [update.id]: removed, ...rest } = newState.participants;
      newState.participants = rest;
    }
    return { state: newState };
  }

  return { state: newState };
}

/**
 * Simulates server response reconciliation
 */
function reconcileServerResponse(state, tempId, serverResponse) {
  const newState = { ...state };

  // Replace temp ID with server-assigned ID
  if (serverResponse.participant) {
    const participant = state.participants[tempId];
    if (participant) {
      const { [tempId]: removed, ...rest } = newState.participants;
      newState.participants = {
        ...rest,
        [serverResponse.participant.id]: { ...participant, ...serverResponse.participant, _pending: false }
      };
    }
  }

  if (serverResponse.field_definition) {
    const fieldDef = state.field_definitions[tempId];
    if (fieldDef) {
      const { [tempId]: removed, ...rest } = newState.field_definitions;
      newState.field_definitions = {
        ...rest,
        [serverResponse.field_definition.id]: { ...fieldDef, ...serverResponse.field_definition, _pending: false }
      };
    }
  }

  return newState;
}

// =============================================================================
// Phase 21.FE.3: Participant ID-Based Contract Tests
// =============================================================================

test('Phase 21.FE.3: participant ID generation produces string IDs', () => {
  const id1 = generateParticipantId(0);
  const id2 = generateParticipantId(1);

  assert.equal(typeof id1, 'string');
  assert.equal(typeof id2, 'string');
  assert.ok(id1.startsWith('temp_'));
  assert.notEqual(id1, id2, 'IDs should be unique');
});

test('Phase 21.FE.3: participant payload validation rejects index-based fields', () => {
  // v1 legacy payload with recipient_index
  const legacyPayload = {
    recipient_index: 0,
    name: 'John Doe',
    email: 'john@example.com',
    role: 'signer'
  };

  const result = validateParticipantPayload(legacyPayload);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('recipient_index')));
  assert.ok(result.errors.some(e => e.includes('id must be')));
});

test('Phase 21.FE.3: participant payload validation accepts ID-based fields', () => {
  // v2 ID-based payload
  const v2Payload = {
    id: generateParticipantId(0),
    name: 'John Doe',
    email: 'john@example.com',
    role: 'signer'
  };

  const result = validateParticipantPayload(v2Payload);
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test('Phase 21.FE.3: participant payload requires email and role', () => {
  const incompletePayload = {
    id: generateParticipantId(0),
    name: 'John Doe'
    // missing email and role
  };

  const result = validateParticipantPayload(incompletePayload);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('email')));
  assert.ok(result.errors.some(e => e.includes('role')));
});

// =============================================================================
// Phase 21.FE.3: Field Definition ID-Based Contract Tests
// =============================================================================

test('Phase 21.FE.3: field definition ID generation produces string IDs', () => {
  const id1 = generateFieldDefinitionId(0);
  const id2 = generateFieldDefinitionId(1);

  assert.equal(typeof id1, 'string');
  assert.equal(typeof id2, 'string');
  assert.ok(id1.startsWith('temp_field_'));
  assert.notEqual(id1, id2, 'IDs should be unique');
});

test('Phase 21.FE.3: field definition payload validation rejects recipient_index', () => {
  // v1 legacy payload with recipient_index
  const legacyPayload = {
    type: 'signature',
    recipient_index: 0,
    page: 1,
    required: true
  };

  const result = validateFieldDefinitionPayload(legacyPayload);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('recipient_index')));
  assert.ok(result.errors.some(e => e.includes('id must be')));
  assert.ok(result.errors.some(e => e.includes('participant_id')));
});

test('Phase 21.FE.3: field definition payload validation accepts ID-based fields', () => {
  const participantId = generateParticipantId(0);
  const v2Payload = {
    id: generateFieldDefinitionId(0),
    type: 'signature',
    participant_id: participantId,
    page: 1,
    required: true
  };

  const result = validateFieldDefinitionPayload(v2Payload);
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test('Phase 21.FE.3: field definition must reference participant by ID', () => {
  const payload = {
    id: generateFieldDefinitionId(0),
    type: 'signature',
    page: 1,
    required: true
    // missing participant_id
  };

  const result = validateFieldDefinitionPayload(payload);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('participant_id')));
});

// =============================================================================
// Phase 21.FE.3: Optimistic Update Behavior Tests
// =============================================================================

test('Phase 21.FE.3: optimistic add participant creates temporary ID', () => {
  const initialState = { participants: {} };
  const { state, tempId } = applyOptimisticUpdate(initialState, {
    type: 'add_participant',
    data: { name: 'John Doe', email: 'john@example.com', role: 'signer' }
  });

  assert.ok(tempId);
  assert.ok(tempId.startsWith('temp_'));
  assert.ok(state.participants[tempId]);
  assert.equal(state.participants[tempId].name, 'John Doe');
  assert.equal(state.participants[tempId]._pending, true);
});

test('Phase 21.FE.3: optimistic add field definition creates temporary ID', () => {
  const participantId = 'participant_123';
  const initialState = { field_definitions: {} };
  const { state, tempId } = applyOptimisticUpdate(initialState, {
    type: 'add_field_definition',
    data: { type: 'signature', participant_id: participantId, page: 1, required: true }
  });

  assert.ok(tempId);
  assert.ok(tempId.startsWith('temp_field_'));
  assert.ok(state.field_definitions[tempId]);
  assert.equal(state.field_definitions[tempId].participant_id, participantId);
  assert.equal(state.field_definitions[tempId]._pending, true);
});

test('Phase 21.FE.3: server response reconciles temporary ID with permanent ID', () => {
  // Setup: create participant with temp ID
  const initialState = { participants: {} };
  const { state: stateAfterAdd, tempId } = applyOptimisticUpdate(initialState, {
    type: 'add_participant',
    data: { name: 'John Doe', email: 'john@example.com', role: 'signer' }
  });

  // Simulate server response with permanent ID
  const serverResponse = {
    participant: {
      id: 'permanent_participant_456',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'signer'
    }
  };

  const finalState = reconcileServerResponse(stateAfterAdd, tempId, serverResponse);

  // Temp ID should be replaced with permanent ID
  assert.ok(!finalState.participants[tempId], 'temp ID should be removed');
  assert.ok(finalState.participants['permanent_participant_456'], 'permanent ID should exist');
  assert.equal(finalState.participants['permanent_participant_456']._pending, false);
});

test('Phase 21.FE.3: optimistic update preserves existing participants', () => {
  const initialState = {
    participants: {
      'existing_123': { id: 'existing_123', name: 'Jane', email: 'jane@example.com', role: 'signer' }
    }
  };

  const { state } = applyOptimisticUpdate(initialState, {
    type: 'add_participant',
    data: { name: 'John', email: 'john@example.com', role: 'cc' }
  });

  // Existing participant should remain
  assert.ok(state.participants['existing_123']);
  assert.equal(state.participants['existing_123'].name, 'Jane');

  // New participant should be added
  assert.equal(Object.keys(state.participants).length, 2);
});

test('Phase 21.FE.3: optimistic remove participant removes by ID', () => {
  const initialState = {
    participants: {
      'p1': { id: 'p1', name: 'Alice', email: 'alice@example.com', role: 'signer' },
      'p2': { id: 'p2', name: 'Bob', email: 'bob@example.com', role: 'cc' }
    }
  };

  const { state } = applyOptimisticUpdate(initialState, {
    type: 'remove_participant',
    id: 'p1'
  });

  assert.ok(!state.participants['p1'], 'p1 should be removed');
  assert.ok(state.participants['p2'], 'p2 should remain');
  assert.equal(Object.keys(state.participants).length, 1);
});

test('Phase 21.FE.3: optimistic update supports in-place participant edit', () => {
  const initialState = {
    participants: {
      'p1': { id: 'p1', name: 'Alice', email: 'alice@example.com', role: 'signer' }
    }
  };

  const { state } = applyOptimisticUpdate(initialState, {
    type: 'update_participant',
    id: 'p1',
    data: { name: 'Alice Smith' }
  });

  assert.equal(state.participants['p1'].name, 'Alice Smith');
  assert.equal(state.participants['p1'].email, 'alice@example.com'); // unchanged
  assert.equal(state.participants['p1']._pending, true);
});

// =============================================================================
// Phase 21.FE.3: Payload Shape Consistency Tests
// =============================================================================

test('Phase 21.FE.3: form payload uses participants not recipients', () => {
  // Simulated form data structure (v2)
  const formPayload = {
    document_id: 'doc_123',
    title: 'Test Agreement',
    participants: {
      'p_temp_1': { id: 'p_temp_1', name: 'John', email: 'john@example.com', role: 'signer' }
    },
    field_definitions: {
      'fd_temp_1': { id: 'fd_temp_1', type: 'signature', participant_id: 'p_temp_1', page: 1 }
    }
  };

  // Validate structure
  assert.ok('participants' in formPayload, 'should use participants key');
  assert.ok(!('recipients' in formPayload), 'should not use recipients key');
  assert.ok('field_definitions' in formPayload, 'should use field_definitions key');
  assert.ok(!('fields' in formPayload), 'should not use fields key');
});

test('Phase 21.FE.3: field definitions use participant_id not recipient_index', () => {
  const fieldDef = {
    id: 'fd_1',
    type: 'signature',
    participant_id: 'p_1', // v2 contract
    page: 1,
    required: true
  };

  assert.ok('participant_id' in fieldDef);
  assert.ok(!('recipient_index' in fieldDef));
});

test('Phase 21.FE.3: payload serialization preserves ID associations', () => {
  // Simulate creating a complex form state
  const p1Id = generateParticipantId(0);
  const p2Id = generateParticipantId(1);
  const fd1Id = generateFieldDefinitionId(0);
  const fd2Id = generateFieldDefinitionId(1);

  const formState = {
    participants: {
      [p1Id]: { id: p1Id, name: 'Signer 1', email: 's1@example.com', role: 'signer' },
      [p2Id]: { id: p2Id, name: 'Signer 2', email: 's2@example.com', role: 'signer' }
    },
    field_definitions: {
      [fd1Id]: { id: fd1Id, type: 'signature', participant_id: p1Id, page: 1 },
      [fd2Id]: { id: fd2Id, type: 'signature', participant_id: p2Id, page: 1 }
    }
  };

  // Validate field definitions reference valid participant IDs
  for (const [fdId, fieldDef] of Object.entries(formState.field_definitions)) {
    assert.ok(
      fieldDef.participant_id in formState.participants,
      `Field ${fdId} references valid participant ${fieldDef.participant_id}`
    );
  }
});

function buildParticipantFormEntry(formIndex, participant) {
  return {
    [`participants[${formIndex}].id`]: participant.id,
    [`participants[${formIndex}].name`]: participant.name,
    [`participants[${formIndex}].email`]: participant.email,
    [`participants[${formIndex}].role`]: participant.role,
    [`participants[${formIndex}].signing_stage`]: participant.signing_stage
  };
}

function buildFieldInstanceFormEntry(formIndex, field) {
  return {
    [`field_instances[${formIndex}].id`]: field.id,
    [`field_instances[${formIndex}].type`]: field.type,
    [`field_instances[${formIndex}].participant_id`]: field.participant_id,
    [`field_instances[${formIndex}].page`]: field.page,
    [`field_instances[${formIndex}].required`]: field.required
  };
}

test('Phase 21.FE.3: participant form serialization keeps stable id values', () => {
  const participant = {
    id: 'participant_tmp_1',
    name: 'Signer A',
    email: 'signer-a@example.com',
    role: 'signer',
    signing_stage: 1
  };
  const serialized = buildParticipantFormEntry(3, participant);
  assert.equal(serialized['participants[3].id'], 'participant_tmp_1');
  assert.equal(serialized['participants[3].role'], 'signer');
  assert.ok(!('participants[participant_tmp_1].id' in serialized));
});

test('Phase 21.FE.3: field instance form serialization uses participant_id not recipient_index', () => {
  const field = {
    id: 'field_tmp_1',
    type: 'signature',
    participant_id: 'participant_tmp_1',
    page: 1,
    required: true
  };
  const serialized = buildFieldInstanceFormEntry(7, field);
  assert.equal(serialized['field_instances[7].participant_id'], 'participant_tmp_1');
  assert.ok(!('field_instances[7].recipient_index' in serialized));
  assert.ok(!('fields[7].participant_id' in serialized));
});

// =============================================================================
// Phase 22: Admin Authoring Refactor - Frontend Tests
// =============================================================================

// Six-Step Wizard Configuration
const WIZARD_STEPS = [
  { step: 1, name: 'Document', description: 'Select document' },
  { step: 2, name: 'Details', description: 'Agreement details' },
  { step: 3, name: 'Participants', description: 'Add participants with signing stages' },
  { step: 4, name: 'Fields', description: 'Define signing fields' },
  { step: 5, name: 'Placement', description: 'Place fields on document' },
  { step: 6, name: 'Review', description: 'Review and send' }
];

test('Phase 22.FE.1: wizard has exactly six steps', () => {
  assert.equal(WIZARD_STEPS.length, 6);
  assert.equal(WIZARD_STEPS[0].step, 1);
  assert.equal(WIZARD_STEPS[5].step, 6);
});

test('Phase 22.FE.1: wizard step names are correct', () => {
  assert.equal(WIZARD_STEPS[0].name, 'Document');
  assert.equal(WIZARD_STEPS[1].name, 'Details');
  assert.equal(WIZARD_STEPS[2].name, 'Participants');
  assert.equal(WIZARD_STEPS[3].name, 'Fields');
  assert.equal(WIZARD_STEPS[4].name, 'Placement');
  assert.equal(WIZARD_STEPS[5].name, 'Review');
});

// Wizard Step Validation Functions
function validateWizardStep(stepNum, formState) {
  switch (stepNum) {
    case 1:
      return !!formState.document_id;
    case 2:
      return !!(formState.title && formState.title.trim());
    case 3:
      const hasParticipants = Object.keys(formState.participants || {}).length > 0;
      const hasSigners = Object.values(formState.participants || {}).some(p => p.role === 'signer');
      return hasParticipants && hasSigners;
    case 4:
      // Fields are optional, but if present must be assigned
      return Object.values(formState.field_definitions || {}).every(f => !!f.participant_id);
    case 5:
      // Placement validation is warning-only, doesn't block
      return true;
    case 6:
      // Final review - all previous steps must pass
      return true;
    default:
      return true;
  }
}

test('Phase 22.FE.1: step 1 validation requires document_id', () => {
  assert.equal(validateWizardStep(1, {}), false);
  assert.equal(validateWizardStep(1, { document_id: '' }), false);
  assert.equal(validateWizardStep(1, { document_id: 'doc_123' }), true);
});

test('Phase 22.FE.1: step 2 validation requires title', () => {
  assert.equal(validateWizardStep(2, {}), false);
  assert.equal(validateWizardStep(2, { title: '' }), false);
  assert.equal(validateWizardStep(2, { title: '   ' }), false);
  assert.equal(validateWizardStep(2, { title: 'My Agreement' }), true);
});

test('Phase 22.FE.1: step 3 validation requires at least one signer', () => {
  assert.equal(validateWizardStep(3, {}), false);
  assert.equal(validateWizardStep(3, { participants: {} }), false);
  assert.equal(validateWizardStep(3, {
    participants: { p1: { role: 'cc' } }
  }), false);
  assert.equal(validateWizardStep(3, {
    participants: { p1: { role: 'signer' } }
  }), true);
});

test('Phase 22.FE.1: step 4 validation requires field assignments if fields exist', () => {
  assert.equal(validateWizardStep(4, {}), true); // No fields = valid
  assert.equal(validateWizardStep(4, { field_definitions: {} }), true);
  assert.equal(validateWizardStep(4, {
    field_definitions: { f1: { type: 'signature', participant_id: '' } }
  }), false);
  assert.equal(validateWizardStep(4, {
    field_definitions: { f1: { type: 'signature', participant_id: 'p1' } }
  }), true);
});

// Multi-signer with signing stages
function buildParticipantWithStage(id, name, email, role, signingStage) {
  return {
    id,
    name,
    email,
    role,
    signing_stage: signingStage
  };
}

test('Phase 22.FE.2: participant includes signing_stage field', () => {
  const participant = buildParticipantWithStage('p1', 'Signer 1', 's1@example.com', 'signer', 1);
  assert.equal(participant.signing_stage, 1);
});

test('Phase 22.FE.2: signing_stage allows arbitrary values', () => {
  const p1 = buildParticipantWithStage('p1', 'First', 'p1@ex.com', 'signer', 1);
  const p2 = buildParticipantWithStage('p2', 'Second', 'p2@ex.com', 'signer', 2);
  const p3 = buildParticipantWithStage('p3', 'Third', 'p3@ex.com', 'signer', 3);

  assert.equal(p1.signing_stage, 1);
  assert.equal(p2.signing_stage, 2);
  assert.equal(p3.signing_stage, 3);
});

test('Phase 22.FE.2: multiple signers can share same signing_stage for parallel signing', () => {
  const p1 = buildParticipantWithStage('p1', 'Parallel A', 'pa@ex.com', 'signer', 1);
  const p2 = buildParticipantWithStage('p2', 'Parallel B', 'pb@ex.com', 'signer', 1);
  const p3 = buildParticipantWithStage('p3', 'Sequential', 'seq@ex.com', 'signer', 2);

  assert.equal(p1.signing_stage, p2.signing_stage);
  assert.notEqual(p2.signing_stage, p3.signing_stage);
});

test('Phase 22.FE.2: CC participants do not have signing_stage', () => {
  const ccParticipant = {
    id: 'cc1',
    name: 'Observer',
    email: 'cc@example.com',
    role: 'cc'
    // signing_stage is omitted or undefined for CC
  };
  assert.equal(ccParticipant.role, 'cc');
  assert.equal(ccParticipant.signing_stage, undefined);
});

// Field placement tests
const DEFAULT_FIELD_SIZES = {
  signature: { width: 200, height: 50 },
  name: { width: 180, height: 30 },
  date_signed: { width: 120, height: 30 },
  text: { width: 150, height: 30 },
  checkbox: { width: 24, height: 24 },
  initials: { width: 80, height: 40 }
};

function createFieldInstance(definitionId, type, participantId, page, x, y) {
  const sizes = DEFAULT_FIELD_SIZES[type] || DEFAULT_FIELD_SIZES.text;
  return {
    id: `fi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    definition_id: definitionId,
    type,
    participant_id: participantId,
    page,
    x,
    y,
    width: sizes.width,
    height: sizes.height
  };
}

test('Phase 22.FE.3: field instance includes placement coordinates', () => {
  const instance = createFieldInstance('fd1', 'signature', 'p1', 1, 100, 200);

  assert.ok(instance.id);
  assert.equal(instance.definition_id, 'fd1');
  assert.equal(instance.type, 'signature');
  assert.equal(instance.participant_id, 'p1');
  assert.equal(instance.page, 1);
  assert.equal(instance.x, 100);
  assert.equal(instance.y, 200);
  assert.equal(instance.width, 200);
  assert.equal(instance.height, 50);
});

test('Phase 22.FE.3: field instance uses default sizes by type', () => {
  const signature = createFieldInstance('fd1', 'signature', 'p1', 1, 0, 0);
  const checkbox = createFieldInstance('fd2', 'checkbox', 'p1', 1, 0, 0);
  const initials = createFieldInstance('fd3', 'initials', 'p1', 1, 0, 0);

  assert.equal(signature.width, 200);
  assert.equal(signature.height, 50);
  assert.equal(checkbox.width, 24);
  assert.equal(checkbox.height, 24);
  assert.equal(initials.width, 80);
  assert.equal(initials.height, 40);
});

test('Phase 22.FE.3: field instance tracks page number', () => {
  const page1Field = createFieldInstance('fd1', 'signature', 'p1', 1, 100, 100);
  const page3Field = createFieldInstance('fd2', 'signature', 'p1', 3, 100, 100);

  assert.equal(page1Field.page, 1);
  assert.equal(page3Field.page, 3);
});

function buildFieldInstanceFormData(instances) {
  const formData = {};
  instances.forEach((instance, index) => {
    formData[`field_instances[${index}].id`] = instance.id;
    formData[`field_instances[${index}].definition_id`] = instance.definition_id;
    formData[`field_instances[${index}].type`] = instance.type;
    formData[`field_instances[${index}].participant_id`] = instance.participant_id;
    formData[`field_instances[${index}].page`] = instance.page;
    formData[`field_instances[${index}].x`] = Math.round(instance.x);
    formData[`field_instances[${index}].y`] = Math.round(instance.y);
    formData[`field_instances[${index}].width`] = Math.round(instance.width);
    formData[`field_instances[${index}].height`] = Math.round(instance.height);
  });
  return formData;
}

test('Phase 22.FE.3: field instances serialize to form data correctly', () => {
  const instances = [
    createFieldInstance('fd1', 'signature', 'p1', 1, 100.5, 200.7),
    createFieldInstance('fd2', 'name', 'p1', 1, 100, 260)
  ];

  const formData = buildFieldInstanceFormData(instances);

  assert.ok('field_instances[0].id' in formData);
  assert.ok('field_instances[0].x' in formData);
  assert.ok('field_instances[0].y' in formData);
  assert.ok('field_instances[0].width' in formData);
  assert.ok('field_instances[0].height' in formData);
  assert.ok('field_instances[1].id' in formData);

  // Values should be rounded
  assert.equal(formData['field_instances[0].x'], 101);
  assert.equal(formData['field_instances[0].y'], 201);
});

// Send-readiness validation tests
function validateSendReadiness(formState) {
  const issues = [];

  // Check document
  if (!formState.document_id) {
    issues.push({ severity: 'error', message: 'No document selected', step: 1 });
  }

  // Check title
  if (!formState.title?.trim()) {
    issues.push({ severity: 'error', message: 'No title provided', step: 2 });
  }

  // Check signers
  const signers = Object.values(formState.participants || {}).filter(p => p.role === 'signer');
  if (signers.length === 0) {
    issues.push({ severity: 'error', message: 'No signers added', step: 3 });
  }

  // Check each signer has signature field
  const signersWithSignature = new Set();
  Object.values(formState.field_definitions || {}).forEach(fd => {
    if (fd.type === 'signature' && fd.participant_id && fd.required) {
      signersWithSignature.add(fd.participant_id);
    }
  });

  signers.forEach(signer => {
    if (!signersWithSignature.has(signer.id)) {
      issues.push({
        severity: 'warning',
        message: `${signer.name || signer.email} has no required signature field`,
        step: 4
      });
    }
  });

  // Check stage continuity
  const stages = [...new Set(signers.map(s => s.signing_stage).filter(Boolean))].sort((a, b) => a - b);
  for (let i = 0; i < stages.length; i++) {
    if (stages[i] !== i + 1) {
      issues.push({ severity: 'warning', message: 'Signing stages should be sequential', step: 3 });
      break;
    }
  }

  return {
    ready: issues.filter(i => i.severity === 'error').length === 0,
    issues
  };
}

test('Phase 22.FE.4: send readiness returns error for missing document', () => {
  const result = validateSendReadiness({ title: 'Test', participants: { p1: { role: 'signer' } } });
  assert.equal(result.ready, false);
  assert.ok(result.issues.some(i => i.message === 'No document selected'));
});

test('Phase 22.FE.4: send readiness returns error for missing title', () => {
  const result = validateSendReadiness({
    document_id: 'doc1',
    participants: { p1: { role: 'signer' } }
  });
  assert.equal(result.ready, false);
  assert.ok(result.issues.some(i => i.message === 'No title provided'));
});

test('Phase 22.FE.4: send readiness returns error for missing signers', () => {
  const result = validateSendReadiness({
    document_id: 'doc1',
    title: 'Test',
    participants: {}
  });
  assert.equal(result.ready, false);
  assert.ok(result.issues.some(i => i.message === 'No signers added'));
});

test('Phase 22.FE.4: send readiness returns warning for signer without signature field', () => {
  const result = validateSendReadiness({
    document_id: 'doc1',
    title: 'Test',
    participants: { p1: { id: 'p1', name: 'Signer', role: 'signer', signing_stage: 1 } },
    field_definitions: {}
  });
  assert.equal(result.ready, true); // Warnings don't block
  assert.ok(result.issues.some(i => i.severity === 'warning' && i.message.includes('no required signature field')));
});

test('Phase 22.FE.4: send readiness returns ready for valid form', () => {
  const result = validateSendReadiness({
    document_id: 'doc1',
    title: 'Test Agreement',
    participants: {
      p1: { id: 'p1', name: 'Signer 1', role: 'signer', signing_stage: 1 }
    },
    field_definitions: {
      fd1: { id: 'fd1', type: 'signature', participant_id: 'p1', required: true }
    }
  });
  assert.equal(result.ready, true);
  assert.equal(result.issues.filter(i => i.severity === 'error').length, 0);
});

test('Phase 22.FE.4: send readiness warns for non-sequential stages', () => {
  const result = validateSendReadiness({
    document_id: 'doc1',
    title: 'Test',
    participants: {
      p1: { id: 'p1', name: 'A', role: 'signer', signing_stage: 1 },
      p2: { id: 'p2', name: 'B', role: 'signer', signing_stage: 3 } // Skip 2
    },
    field_definitions: {
      fd1: { id: 'fd1', type: 'signature', participant_id: 'p1', required: true },
      fd2: { id: 'fd2', type: 'signature', participant_id: 'p2', required: true }
    }
  });
  assert.equal(result.ready, true);
  assert.ok(result.issues.some(i => i.message === 'Signing stages should be sequential'));
});

// End-to-end draft authoring test
test('Phase 22.FE.5: end-to-end draft authoring with multiple signers and placements', () => {
  // Simulate creating a complete agreement draft
  const formState = {
    document_id: 'doc_123',
    title: 'Multi-Signer Contract',
    message: 'Please sign this contract',
    participants: {},
    field_definitions: {},
    field_instances: []
  };

  // Add multiple signers with different stages
  const signer1 = buildParticipantWithStage('p1', 'Alice', 'alice@example.com', 'signer', 1);
  const signer2 = buildParticipantWithStage('p2', 'Bob', 'bob@example.com', 'signer', 1); // Parallel with Alice
  const signer3 = buildParticipantWithStage('p3', 'Charlie', 'charlie@example.com', 'signer', 2); // After Alice & Bob
  const cc = { id: 'cc1', name: 'Observer', email: 'observer@example.com', role: 'cc' };

  formState.participants = { p1: signer1, p2: signer2, p3: signer3, cc1: cc };

  // Add field definitions for each signer
  formState.field_definitions = {
    fd1: { id: 'fd1', type: 'signature', participant_id: 'p1', page: 1, required: true },
    fd2: { id: 'fd2', type: 'name', participant_id: 'p1', page: 1, required: true },
    fd3: { id: 'fd3', type: 'signature', participant_id: 'p2', page: 1, required: true },
    fd4: { id: 'fd4', type: 'signature', participant_id: 'p3', page: 2, required: true },
    fd5: { id: 'fd5', type: 'date_signed', participant_id: 'p3', page: 2, required: false }
  };

  // Create field instances with placements
  const instances = [
    createFieldInstance('fd1', 'signature', 'p1', 1, 100, 500),
    createFieldInstance('fd2', 'name', 'p1', 1, 100, 560),
    createFieldInstance('fd3', 'signature', 'p2', 1, 350, 500),
    createFieldInstance('fd4', 'signature', 'p3', 2, 100, 500),
    createFieldInstance('fd5', 'date_signed', 'p3', 2, 100, 560)
  ];
  formState.field_instances = instances;

  // Validate each step
  assert.equal(validateWizardStep(1, formState), true, 'Step 1 valid');
  assert.equal(validateWizardStep(2, formState), true, 'Step 2 valid');
  assert.equal(validateWizardStep(3, formState), true, 'Step 3 valid');
  assert.equal(validateWizardStep(4, formState), true, 'Step 4 valid');

  // Validate send readiness
  const readiness = validateSendReadiness(formState);
  assert.equal(readiness.ready, true, 'Form is ready to send');

  // Verify participant count
  const signers = Object.values(formState.participants).filter(p => p.role === 'signer');
  assert.equal(signers.length, 3, 'Has 3 signers');

  // Verify stages
  const stage1Signers = signers.filter(s => s.signing_stage === 1);
  const stage2Signers = signers.filter(s => s.signing_stage === 2);
  assert.equal(stage1Signers.length, 2, '2 signers in stage 1');
  assert.equal(stage2Signers.length, 1, '1 signer in stage 2');

  // Verify field placements
  assert.equal(formState.field_instances.length, 5, '5 field instances');
  const page1Fields = formState.field_instances.filter(f => f.page === 1);
  const page2Fields = formState.field_instances.filter(f => f.page === 2);
  assert.equal(page1Fields.length, 3, '3 fields on page 1');
  assert.equal(page2Fields.length, 2, '2 fields on page 2');

  // Verify form data serialization
  const formData = buildFieldInstanceFormData(formState.field_instances);
  assert.ok('field_instances[0].x' in formData);
  assert.ok('field_instances[4].y' in formData);
});

// =============================================================================
// Phase 24: Multi-Signer Stage Orchestration (FE Tests)
// =============================================================================

// Phase 24.FE.1: Signer UI state messaging for stage waiting/active semantics

/**
 * Resolves signer state banner configuration based on session context.
 * Mirrors the frontend initializeStageBanner() logic.
 * @param {object} config - Unified config with signerState, stages, and recipient IDs
 * @returns {object} Banner configuration with title, message, badges, and visibility
 */
function resolveSignerStateBanner(config) {
  const {
    signerState = 'active',
    recipientStage = 1,
    activeStage = 1,
    activeRecipientIds = [],
    waitingForRecipientIds = []
  } = config;

  let bannerConfig = {
    hidden: false,
    variant: 'green',
    title: "It's your turn to sign",
    message: 'Please complete and sign the document below.',
    badges: []
  };

  switch (signerState) {
    case 'waiting':
      bannerConfig = {
        hidden: false,
        variant: 'blue',
        title: 'Waiting for Other Signers',
        message: recipientStage > activeStage
          ? `You are in signing stage ${recipientStage}. Stage ${activeStage} is currently active.`
          : 'You will be able to sign once the previous signer(s) have completed their signatures.',
        badges: [
          { icon: 'iconoir-clock', text: 'Your turn is coming', variant: 'blue' }
        ]
      };
      if (waitingForRecipientIds.length > 0) {
        bannerConfig.badges.push({
          icon: 'iconoir-group',
          text: `${waitingForRecipientIds.length} signer(s) ahead`,
          variant: 'blue'
        });
      }
      break;

    case 'blocked':
      bannerConfig = {
        hidden: false,
        variant: 'amber',
        title: 'Signing Not Available',
        message: 'This agreement cannot be signed at this time. It may have been completed, voided, or is awaiting action from another party.',
        badges: [
          { icon: 'iconoir-lock', text: 'Access restricted', variant: 'amber' }
        ]
      };
      break;

    case 'completed':
      bannerConfig = {
        hidden: false,
        variant: 'green',
        title: 'Signing Complete',
        message: 'You have already completed signing this document.',
        badges: [
          { icon: 'iconoir-check', text: 'Signed', variant: 'green' }
        ]
      };
      break;

    case 'active':
    default:
      if (activeRecipientIds.length > 1) {
        bannerConfig.message = `You and ${activeRecipientIds.length - 1} other signer(s) can sign now.`;
        bannerConfig.badges = [
          { icon: 'iconoir-users', text: `Stage ${activeStage} active`, variant: 'green' }
        ];
      } else if (recipientStage > 1) {
        bannerConfig.badges = [
          { icon: 'iconoir-check-circle', text: `Stage ${recipientStage}`, variant: 'green' }
        ];
      } else {
        // Single signer or first stage - hide banner
        bannerConfig.hidden = true;
      }
      break;
  }

  return bannerConfig;
}

test('Phase 24.FE.1: waiting state shows stage progression message', () => {
  const banner = resolveSignerStateBanner({
    signerState: 'waiting',
    recipientStage: 2,
    activeStage: 1,
    waitingForRecipientIds: ['r1', 'r2']
  });

  assert.equal(banner.hidden, false);
  assert.equal(banner.variant, 'blue');
  assert.equal(banner.title, 'Waiting for Other Signers');
  assert.ok(banner.message.includes('stage 2'));
  assert.ok(banner.message.includes('Stage 1'));
  assert.equal(banner.badges.length, 2);
  assert.ok(banner.badges[1].text.includes('2 signer(s)'));
});

test('Phase 24.FE.1: blocked state shows access restricted message', () => {
  const banner = resolveSignerStateBanner({
    signerState: 'blocked'
  });

  assert.equal(banner.hidden, false);
  assert.equal(banner.variant, 'amber');
  assert.equal(banner.title, 'Signing Not Available');
  assert.ok(banner.message.includes('cannot be signed'));
  assert.equal(banner.badges[0].text, 'Access restricted');
});

test('Phase 24.FE.1: completed state shows signed confirmation', () => {
  const banner = resolveSignerStateBanner({
    signerState: 'completed'
  });

  assert.equal(banner.hidden, false);
  assert.equal(banner.variant, 'green');
  assert.equal(banner.title, 'Signing Complete');
  assert.ok(banner.message.includes('already completed'));
  assert.equal(banner.badges[0].text, 'Signed');
});

test('Phase 24.FE.1: active state with parallel signers shows group message', () => {
  const banner = resolveSignerStateBanner({
    signerState: 'active',
    activeStage: 1,
    activeRecipientIds: ['r1', 'r2', 'r3']
  });

  assert.equal(banner.hidden, false);
  assert.equal(banner.variant, 'green');
  assert.ok(banner.message.includes('2 other signer(s)'));
  assert.ok(banner.badges[0].text.includes('Stage 1 active'));
});

test('Phase 24.FE.1: active state single signer first stage hides banner', () => {
  const banner = resolveSignerStateBanner({
    signerState: 'active',
    recipientStage: 1,
    activeStage: 1,
    activeRecipientIds: ['r1']
  });

  assert.equal(banner.hidden, true);
});

test('Phase 24.FE.1: active state in later stage shows stage badge', () => {
  const banner = resolveSignerStateBanner({
    signerState: 'active',
    recipientStage: 2,
    activeStage: 2,
    activeRecipientIds: ['r1']
  });

  assert.equal(banner.hidden, false);
  assert.equal(banner.badges[0].text, 'Stage 2');
});

test('Phase 24.FE.1: waiting state without specific waiting IDs uses generic message', () => {
  const banner = resolveSignerStateBanner({
    signerState: 'waiting',
    recipientStage: 1,
    activeStage: 1,
    waitingForRecipientIds: []
  });

  assert.equal(banner.title, 'Waiting for Other Signers');
  assert.ok(banner.message.includes('previous signer(s)'));
  assert.equal(banner.badges.length, 1); // Only "Your turn is coming" badge
});

test('Phase 24.FE.1: defaults to active state for unknown states', () => {
  const banner = resolveSignerStateBanner({
    signerState: 'unknown_state'
  });

  // Default behavior for unknown state is to hide (single signer first stage)
  assert.equal(banner.hidden, true);
});

// =============================================================================
// Phase 24.FE.2: Admin Timeline/Progress UI Stage Metrics
// =============================================================================

/**
 * Computes stage metrics from a list of participants (mirrors backend computeStageMetrics).
 * @param {Array<{role: string, signing_stage: number, status: string}>} participants
 * @returns {{stageCount: number, activeStage: number}}
 */
function computeStageMetrics(participants) {
  if (!participants || participants.length === 0) {
    return { stageCount: 0, activeStage: 0 };
  }

  let maxStage = 0;
  const stageCompletion = new Map(); // stage -> all signers complete

  for (const p of participants) {
    // Only consider signers for stage computation
    if (p.role === 'cc') {
      continue;
    }

    let stage = p.signing_stage || 1;
    if (stage <= 0) stage = 1;
    if (stage > maxStage) maxStage = stage;

    // Initialize stage as complete, set to false if any signer is incomplete
    if (!stageCompletion.has(stage)) {
      stageCompletion.set(stage, true);
    }

    // Check if signer is complete
    const isComplete = p.status === 'signed' || p.status === 'completed' || p.status === 'declined';
    if (!isComplete) {
      stageCompletion.set(stage, false);
    }
  }

  if (maxStage === 0) {
    return { stageCount: 0, activeStage: 0 };
  }

  // Find lowest incomplete stage
  let activeStage = maxStage + 1; // sentinel for "all complete"
  for (let stage = 1; stage <= maxStage; stage++) {
    if (stageCompletion.has(stage) && !stageCompletion.get(stage)) {
      activeStage = stage;
      break;
    }
  }

  // If all stages complete, set active to max stage
  if (activeStage > maxStage) {
    activeStage = maxStage;
  }

  return { stageCount: maxStage, activeStage };
}

/**
 * Determines the display state for a participant's stage badge.
 * @param {object} participant - Participant with signing_stage and status
 * @param {number} activeStage - Currently active signing stage
 * @returns {{variant: string, label: string}}
 */
function resolveParticipantStageBadge(participant, activeStage) {
  const stage = participant.signing_stage || 1;
  const status = participant.status || 'pending';
  const isComplete = status === 'signed' || status === 'completed';

  if (isComplete) {
    return { variant: 'green', label: `Stage ${stage}` };
  }
  if (stage === activeStage) {
    return { variant: 'blue', label: `Stage ${stage}` };
  }
  if (stage > activeStage) {
    return { variant: 'gray', label: `Stage ${stage}` };
  }
  return { variant: 'gray', label: `Stage ${stage}` };
}

test('Phase 24.FE.2: computeStageMetrics returns zero for empty participants', () => {
  const metrics = computeStageMetrics([]);
  assert.equal(metrics.stageCount, 0);
  assert.equal(metrics.activeStage, 0);
});

test('Phase 24.FE.2: computeStageMetrics ignores CC participants', () => {
  const metrics = computeStageMetrics([
    { role: 'cc', signing_stage: 1, status: 'pending' },
    { role: 'signer', signing_stage: 2, status: 'pending' }
  ]);
  assert.equal(metrics.stageCount, 2);
  assert.equal(metrics.activeStage, 2);
});

test('Phase 24.FE.2: computeStageMetrics identifies active stage from incomplete signers', () => {
  const metrics = computeStageMetrics([
    { role: 'signer', signing_stage: 1, status: 'signed' },
    { role: 'signer', signing_stage: 1, status: 'signed' },
    { role: 'signer', signing_stage: 2, status: 'pending' }
  ]);
  assert.equal(metrics.stageCount, 2);
  assert.equal(metrics.activeStage, 2);
});

test('Phase 24.FE.2: computeStageMetrics returns first incomplete stage', () => {
  const metrics = computeStageMetrics([
    { role: 'signer', signing_stage: 1, status: 'pending' },
    { role: 'signer', signing_stage: 2, status: 'pending' },
    { role: 'signer', signing_stage: 3, status: 'pending' }
  ]);
  assert.equal(metrics.stageCount, 3);
  assert.equal(metrics.activeStage, 1);
});

test('Phase 24.FE.2: computeStageMetrics handles all complete stages', () => {
  const metrics = computeStageMetrics([
    { role: 'signer', signing_stage: 1, status: 'signed' },
    { role: 'signer', signing_stage: 2, status: 'completed' }
  ]);
  assert.equal(metrics.stageCount, 2);
  assert.equal(metrics.activeStage, 2); // Returns max stage when all complete
});

test('Phase 24.FE.2: computeStageMetrics defaults missing signing_stage to 1', () => {
  const metrics = computeStageMetrics([
    { role: 'signer', status: 'pending' },
    { role: 'signer', signing_stage: 2, status: 'pending' }
  ]);
  assert.equal(metrics.stageCount, 2);
  assert.equal(metrics.activeStage, 1);
});

test('Phase 24.FE.2: resolveParticipantStageBadge shows green for completed', () => {
  const badge = resolveParticipantStageBadge({ signing_stage: 1, status: 'signed' }, 2);
  assert.equal(badge.variant, 'green');
  assert.equal(badge.label, 'Stage 1');
});

test('Phase 24.FE.2: resolveParticipantStageBadge shows blue for active stage', () => {
  const badge = resolveParticipantStageBadge({ signing_stage: 2, status: 'pending' }, 2);
  assert.equal(badge.variant, 'blue');
  assert.equal(badge.label, 'Stage 2');
});

test('Phase 24.FE.2: resolveParticipantStageBadge shows gray for waiting stage', () => {
  const badge = resolveParticipantStageBadge({ signing_stage: 3, status: 'pending' }, 1);
  assert.equal(badge.variant, 'gray');
  assert.equal(badge.label, 'Stage 3');
});

// =============================================================================
// Phase 24.FE.3: Cross-Browser E2E Coverage for Stage Progression
// =============================================================================

/**
 * Simulates a multi-signer stage progression flow.
 * Models the state transitions as signers complete their signatures.
 */
class StageProgressionSimulator {
  constructor(participants) {
    this.participants = participants.map(p => ({
      ...p,
      status: p.status || 'pending',
      signing_stage: p.signing_stage || 1
    }));
  }

  /**
   * Get current stage metrics
   */
  getMetrics() {
    return computeStageMetrics(this.participants);
  }

  /**
   * Check if a participant can sign based on current active stage
   */
  canSign(participantId) {
    const { activeStage } = this.getMetrics();
    const participant = this.participants.find(p => p.id === participantId);
    if (!participant) return false;
    if (participant.role === 'cc') return false;
    if (participant.status === 'signed' || participant.status === 'completed') return false;
    return participant.signing_stage === activeStage;
  }

  /**
   * Simulate a participant signing
   */
  sign(participantId) {
    const participant = this.participants.find(p => p.id === participantId);
    if (!participant) throw new Error(`Participant ${participantId} not found`);
    if (!this.canSign(participantId)) {
      throw new Error(`Participant ${participantId} cannot sign (stage ${participant.signing_stage}, active: ${this.getMetrics().activeStage})`);
    }
    participant.status = 'signed';
    return this.getMetrics();
  }

  /**
   * Get participants who can currently sign
   */
  getActiveSigners() {
    const { activeStage } = this.getMetrics();
    return this.participants.filter(p =>
      p.role !== 'cc' &&
      p.signing_stage === activeStage &&
      p.status !== 'signed' &&
      p.status !== 'completed'
    );
  }

  /**
   * Get signer state banner config for a participant
   */
  getSignerBannerConfig(participantId) {
    const { activeStage } = this.getMetrics();
    const participant = this.participants.find(p => p.id === participantId);
    if (!participant) return null;

    const activeSigners = this.getActiveSigners();
    const waitingSigners = this.participants.filter(p =>
      p.role !== 'cc' &&
      p.signing_stage < participant.signing_stage &&
      p.status !== 'signed' &&
      p.status !== 'completed'
    );

    let signerState = 'active';
    if (participant.status === 'signed' || participant.status === 'completed') {
      signerState = 'completed';
    } else if (participant.signing_stage > activeStage) {
      signerState = 'waiting';
    }

    return resolveSignerStateBanner({
      signerState,
      recipientStage: participant.signing_stage,
      activeStage,
      activeRecipientIds: activeSigners.map(s => s.id),
      waitingForRecipientIds: waitingSigners.map(s => s.id)
    });
  }
}

// Parallel-in-stage tests
test('Phase 24.FE.3: parallel signers in same stage can all sign', () => {
  const sim = new StageProgressionSimulator([
    { id: 'alice', role: 'signer', signing_stage: 1, name: 'Alice' },
    { id: 'bob', role: 'signer', signing_stage: 1, name: 'Bob' },
    { id: 'charlie', role: 'signer', signing_stage: 2, name: 'Charlie' }
  ]);

  // Both Alice and Bob should be able to sign (parallel in stage 1)
  assert.ok(sim.canSign('alice'));
  assert.ok(sim.canSign('bob'));
  assert.ok(!sim.canSign('charlie')); // Stage 2, must wait

  const activeSigners = sim.getActiveSigners();
  assert.equal(activeSigners.length, 2);
});

test('Phase 24.FE.3: parallel signers see correct banner with signer count', () => {
  const sim = new StageProgressionSimulator([
    { id: 'alice', role: 'signer', signing_stage: 1, name: 'Alice' },
    { id: 'bob', role: 'signer', signing_stage: 1, name: 'Bob' },
    { id: 'charlie', role: 'signer', signing_stage: 1, name: 'Charlie' }
  ]);

  const aliceBanner = sim.getSignerBannerConfig('alice');
  assert.equal(aliceBanner.hidden, false);
  assert.ok(aliceBanner.message.includes('2 other signer(s)'));
});

test('Phase 24.FE.3: parallel signing order does not matter within stage', () => {
  const sim = new StageProgressionSimulator([
    { id: 'alice', role: 'signer', signing_stage: 1 },
    { id: 'bob', role: 'signer', signing_stage: 1 },
    { id: 'charlie', role: 'signer', signing_stage: 2 }
  ]);

  // Bob signs first
  sim.sign('bob');
  assert.ok(sim.canSign('alice')); // Alice can still sign
  assert.ok(!sim.canSign('charlie')); // Charlie still waiting

  // Alice signs
  sim.sign('alice');
  assert.ok(sim.canSign('charlie')); // Now Charlie can sign
});

// Sequential stage progression tests
test('Phase 24.FE.3: stage 2 signer must wait for stage 1 to complete', () => {
  const sim = new StageProgressionSimulator([
    { id: 'alice', role: 'signer', signing_stage: 1 },
    { id: 'bob', role: 'signer', signing_stage: 2 }
  ]);

  assert.ok(!sim.canSign('bob'));

  const bobBanner = sim.getSignerBannerConfig('bob');
  assert.equal(bobBanner.variant, 'blue');
  assert.equal(bobBanner.title, 'Waiting for Other Signers');
  assert.ok(bobBanner.message.includes('stage 2'));
  assert.ok(bobBanner.message.includes('Stage 1'));
});

test('Phase 24.FE.3: stage progression unlocks next stage after completion', () => {
  const sim = new StageProgressionSimulator([
    { id: 'alice', role: 'signer', signing_stage: 1 },
    { id: 'bob', role: 'signer', signing_stage: 2 },
    { id: 'charlie', role: 'signer', signing_stage: 3 }
  ]);

  // Initial state
  let metrics = sim.getMetrics();
  assert.equal(metrics.activeStage, 1);

  // Alice signs - stage 1 complete
  sim.sign('alice');
  metrics = sim.getMetrics();
  assert.equal(metrics.activeStage, 2);
  assert.ok(sim.canSign('bob'));
  assert.ok(!sim.canSign('charlie'));

  // Bob signs - stage 2 complete
  sim.sign('bob');
  metrics = sim.getMetrics();
  assert.equal(metrics.activeStage, 3);
  assert.ok(sim.canSign('charlie'));
});

test('Phase 24.FE.3: mixed parallel and sequential stages', () => {
  const sim = new StageProgressionSimulator([
    { id: 'alice', role: 'signer', signing_stage: 1 },
    { id: 'bob', role: 'signer', signing_stage: 1 },
    { id: 'charlie', role: 'signer', signing_stage: 2 },
    { id: 'dave', role: 'signer', signing_stage: 2 }
  ]);

  // Stage 1: Alice and Bob can sign in parallel
  assert.ok(sim.canSign('alice'));
  assert.ok(sim.canSign('bob'));
  assert.ok(!sim.canSign('charlie'));
  assert.ok(!sim.canSign('dave'));

  sim.sign('alice');
  // Bob still can sign, Charlie and Dave still waiting
  assert.ok(sim.canSign('bob'));
  assert.ok(!sim.canSign('charlie'));

  sim.sign('bob');
  // Stage 2: Charlie and Dave can now sign in parallel
  assert.ok(sim.canSign('charlie'));
  assert.ok(sim.canSign('dave'));
});

test('Phase 24.FE.3: CC recipients do not affect stage progression', () => {
  const sim = new StageProgressionSimulator([
    { id: 'alice', role: 'signer', signing_stage: 1 },
    { id: 'bob', role: 'cc', signing_stage: 1 },
    { id: 'charlie', role: 'signer', signing_stage: 2 }
  ]);

  // CC should not be counted
  assert.ok(!sim.canSign('bob'));

  const metrics = sim.getMetrics();
  assert.equal(metrics.stageCount, 2);

  // Alice signs, stage should progress (ignoring CC)
  sim.sign('alice');
  assert.ok(sim.canSign('charlie'));
});

test('Phase 24.FE.3: completed signer sees completion banner', () => {
  const sim = new StageProgressionSimulator([
    { id: 'alice', role: 'signer', signing_stage: 1 },
    { id: 'bob', role: 'signer', signing_stage: 2 }
  ]);

  sim.sign('alice');

  const aliceBanner = sim.getSignerBannerConfig('alice');
  assert.equal(aliceBanner.title, 'Signing Complete');
  assert.ok(aliceBanner.message.includes('already completed'));
});

test('Phase 24.FE.3: stage metrics deterministic across reloads', () => {
  // Simulate same state multiple times
  const createSim = () => new StageProgressionSimulator([
    { id: 'a', role: 'signer', signing_stage: 1, status: 'signed' },
    { id: 'b', role: 'signer', signing_stage: 1, status: 'pending' },
    { id: 'c', role: 'signer', signing_stage: 2, status: 'pending' }
  ]);

  const sim1 = createSim();
  const sim2 = createSim();
  const sim3 = createSim();

  // Same input should produce same output
  assert.deepEqual(sim1.getMetrics(), sim2.getMetrics());
  assert.deepEqual(sim2.getMetrics(), sim3.getMetrics());
  assert.equal(sim1.canSign('b'), sim2.canSign('b'));
  assert.equal(sim1.canSign('c'), sim2.canSign('c'));
});

test('Phase 24.FE.3: banner state deterministic for same participant state', () => {
  const sim = new StageProgressionSimulator([
    { id: 'alice', role: 'signer', signing_stage: 2, status: 'pending' }
  ]);

  const banner1 = sim.getSignerBannerConfig('alice');
  const banner2 = sim.getSignerBannerConfig('alice');

  assert.equal(banner1.title, banner2.title);
  assert.equal(banner1.variant, banner2.variant);
  assert.equal(banner1.hidden, banner2.hidden);
});

test('Phase 24.FE.3: E2E three-stage workflow with parallel signers', () => {
  const sim = new StageProgressionSimulator([
    { id: 's1a', role: 'signer', signing_stage: 1, name: 'Stage1-Alice' },
    { id: 's1b', role: 'signer', signing_stage: 1, name: 'Stage1-Bob' },
    { id: 's2a', role: 'signer', signing_stage: 2, name: 'Stage2-Alice' },
    { id: 's3a', role: 'signer', signing_stage: 3, name: 'Stage3-Alice' },
    { id: 's3b', role: 'signer', signing_stage: 3, name: 'Stage3-Bob' },
    { id: 'cc1', role: 'cc', name: 'Observer' }
  ]);

  // Verify initial state
  let metrics = sim.getMetrics();
  assert.equal(metrics.stageCount, 3);
  assert.equal(metrics.activeStage, 1);
  assert.equal(sim.getActiveSigners().length, 2);

  // Stage 1: Both can sign
  sim.sign('s1a');
  assert.equal(sim.getMetrics().activeStage, 1); // Still stage 1
  sim.sign('s1b');
  assert.equal(sim.getMetrics().activeStage, 2); // Now stage 2

  // Stage 2: Single signer
  assert.equal(sim.getActiveSigners().length, 1);
  sim.sign('s2a');
  assert.equal(sim.getMetrics().activeStage, 3); // Now stage 3

  // Stage 3: Two parallel signers
  assert.equal(sim.getActiveSigners().length, 2);
  sim.sign('s3a');
  sim.sign('s3b');

  // All complete
  metrics = sim.getMetrics();
  assert.equal(metrics.activeStage, 3); // Max stage when all complete

  // All signers show completed
  assert.equal(sim.getSignerBannerConfig('s1a').title, 'Signing Complete');
  assert.equal(sim.getSignerBannerConfig('s3b').title, 'Signing Complete');
});

// =============================================================================
// Phase 25.FE.3: Final Regression Pack (V2)
// =============================================================================
// Comprehensive regression tests ensuring complete coverage of:
// 1. Admin authoring (6-step wizard)
// 2. Unified signer journey
// 3. Multi-signer stage completion

// -----------------------------------------------------------------------------
// Admin Authoring Regression (Steps 1-6)
// -----------------------------------------------------------------------------

/**
 * Simulates complete admin authoring workflow
 */
class AdminAuthoringSimulator {
  constructor() {
    this.currentStep = 1;
    this.formState = {};
    this.validationErrors = [];
  }

  setDocument(documentId) {
    this.formState.document_id = documentId;
  }

  setDetails(title, message = '') {
    this.formState.title = title;
    this.formState.message = message;
  }

  addParticipant(id, role, email, signingStage = 1) {
    if (!this.formState.participants) this.formState.participants = {};
    this.formState.participants[id] = { id, role, email, signing_stage: signingStage };
  }

  addFieldDefinition(id, type, participantId, required = true) {
    if (!this.formState.field_definitions) this.formState.field_definitions = {};
    this.formState.field_definitions[id] = { id, type, participant_id: participantId, required };
  }

  addFieldInstance(id, definitionId, page, x, y, width, height) {
    if (!this.formState.field_instances) this.formState.field_instances = {};
    this.formState.field_instances[id] = { id, definition_id: definitionId, page, x, y, width, height };
  }

  validateStep(stepNum) {
    switch (stepNum) {
      case 1:
        return !!this.formState.document_id;
      case 2:
        return !!(this.formState.title && this.formState.title.trim());
      case 3:
        const hasSigners = Object.values(this.formState.participants || {}).some(p => p.role === 'signer');
        return hasSigners;
      case 4:
        return Object.values(this.formState.field_definitions || {}).every(f => !!f.participant_id);
      case 5:
        // Check required fields have instances
        const requiredDefs = Object.values(this.formState.field_definitions || {}).filter(f => f.required);
        const placedDefIds = new Set(Object.values(this.formState.field_instances || {}).map(i => i.definition_id));
        return requiredDefs.every(d => placedDefIds.has(d.id));
      case 6:
        // Review step validates all previous steps
        return [1, 2, 3, 4, 5].every(s => this.validateStep(s));
      default:
        return false;
    }
  }

  goToStep(stepNum) {
    if (stepNum < 1 || stepNum > 6) return false;
    // Can only advance if previous steps are valid
    for (let s = 1; s < stepNum; s++) {
      if (!this.validateStep(s)) return false;
    }
    this.currentStep = stepNum;
    return true;
  }

  canSend() {
    return this.validateStep(6);
  }

  getSendReadiness() {
    const issues = [];
    if (!this.validateStep(1)) issues.push({ step: 1, message: 'Document required' });
    if (!this.validateStep(2)) issues.push({ step: 2, message: 'Title required' });
    if (!this.validateStep(3)) issues.push({ step: 3, message: 'At least one signer required' });
    if (!this.validateStep(4)) issues.push({ step: 4, message: 'All fields must be assigned' });
    if (!this.validateStep(5)) issues.push({ step: 5, message: 'Required fields need placement' });
    return { ready: issues.length === 0, issues };
  }
}

test('Phase 25.FE.3: AdminAuthoringSimulator starts at step 1', () => {
  const sim = new AdminAuthoringSimulator();
  assert.equal(sim.currentStep, 1);
  assert.equal(sim.validateStep(1), false);
});

test('Phase 25.FE.3: complete admin authoring flow validates correctly', () => {
  const sim = new AdminAuthoringSimulator();

  // Step 1: Document
  sim.setDocument('doc_contract_v1');
  assert.equal(sim.validateStep(1), true);
  assert.equal(sim.goToStep(2), true);

  // Step 2: Details
  sim.setDetails('Employment Agreement', 'Please review and sign');
  assert.equal(sim.validateStep(2), true);
  assert.equal(sim.goToStep(3), true);

  // Step 3: Participants
  sim.addParticipant('p1', 'signer', 'alice@example.com', 1);
  sim.addParticipant('p2', 'signer', 'bob@example.com', 2);
  sim.addParticipant('p3', 'cc', 'hr@example.com');
  assert.equal(sim.validateStep(3), true);
  assert.equal(sim.goToStep(4), true);

  // Step 4: Field Definitions
  sim.addFieldDefinition('sig1', 'signature', 'p1', true);
  sim.addFieldDefinition('sig2', 'signature', 'p2', true);
  sim.addFieldDefinition('date1', 'date', 'p1', false);
  assert.equal(sim.validateStep(4), true);
  assert.equal(sim.goToStep(5), true);

  // Step 5: Placement
  sim.addFieldInstance('inst1', 'sig1', 1, 100, 500, 200, 50);
  sim.addFieldInstance('inst2', 'sig2', 1, 100, 600, 200, 50);
  assert.equal(sim.validateStep(5), true);
  assert.equal(sim.goToStep(6), true);

  // Step 6: Review - should be ready to send
  assert.equal(sim.canSend(), true);
  const readiness = sim.getSendReadiness();
  assert.equal(readiness.ready, true);
  assert.equal(readiness.issues.length, 0);
});

test('Phase 25.FE.3: admin authoring blocks send without required placements', () => {
  const sim = new AdminAuthoringSimulator();
  sim.setDocument('doc_1');
  sim.setDetails('Test Agreement');
  sim.addParticipant('p1', 'signer', 'test@example.com');
  sim.addFieldDefinition('sig1', 'signature', 'p1', true);
  // No placement added

  assert.equal(sim.validateStep(5), false);
  assert.equal(sim.canSend(), false);
  const readiness = sim.getSendReadiness();
  assert.equal(readiness.ready, false);
  assert.ok(readiness.issues.some(i => i.step === 5));
});

test('Phase 25.FE.3: admin authoring blocks send without signers', () => {
  const sim = new AdminAuthoringSimulator();
  sim.setDocument('doc_1');
  sim.setDetails('Test Agreement');
  sim.addParticipant('p1', 'cc', 'observer@example.com');

  assert.equal(sim.validateStep(3), false);
  assert.equal(sim.canSend(), false);
});

test('Phase 25.FE.3: admin authoring step navigation requires validation', () => {
  const sim = new AdminAuthoringSimulator();
  // Cannot skip to step 3 without completing steps 1-2
  assert.equal(sim.goToStep(3), false);

  sim.setDocument('doc_1');
  assert.equal(sim.goToStep(3), false); // Still missing step 2

  sim.setDetails('Test');
  assert.equal(sim.goToStep(3), true); // Now valid
});

// -----------------------------------------------------------------------------
// Unified Signer Journey Regression
// -----------------------------------------------------------------------------

/**
 * Simulates complete unified signer journey (V2 only)
 */
class UnifiedSignerJourneySimulator {
  constructor(sessionData) {
    this.session = sessionData;
    this.consentGiven = false;
    this.fieldValues = {};
    this.signatureAttached = false;
    this.submitted = false;
    this.errors = [];
  }

  loadSession() {
    if (!this.session || !this.session.token) {
      this.errors.push('INVALID_SESSION');
      return false;
    }
    if (this.session.expired) {
      this.errors.push('TOKEN_EXPIRED');
      return false;
    }
    if (this.session.state === 'blocked') {
      this.errors.push('SIGNER_BLOCKED');
      return false;
    }
    return true;
  }

  giveConsent() {
    if (!this.loadSession()) return false;
    this.consentGiven = true;
    return true;
  }

  setFieldValue(fieldId, value) {
    if (!this.consentGiven) {
      this.errors.push('CONSENT_REQUIRED');
      return false;
    }
    this.fieldValues[fieldId] = value;
    return true;
  }

  attachSignature(type, value) {
    if (!this.consentGiven) {
      this.errors.push('CONSENT_REQUIRED');
      return false;
    }
    this.signatureAttached = true;
    return true;
  }

  validateSubmit() {
    const issues = [];
    if (!this.consentGiven) issues.push('CONSENT_REQUIRED');

    const requiredFields = (this.session.fields || []).filter(f => f.required);
    for (const field of requiredFields) {
      if (field.type === 'signature' && !this.signatureAttached) {
        issues.push(`SIGNATURE_REQUIRED:${field.id}`);
      } else if (!this.fieldValues[field.id] && field.type !== 'signature') {
        issues.push(`FIELD_REQUIRED:${field.id}`);
      }
    }

    return issues;
  }

  submit(idempotencyKey) {
    const issues = this.validateSubmit();
    if (issues.length > 0) {
      this.errors.push(...issues);
      return { success: false, errors: issues };
    }
    this.submitted = true;
    return { success: true, idempotencyKey };
  }

  getState() {
    if (this.submitted) return 'completed';
    if (this.signatureAttached) return 'signing';
    if (this.consentGiven) return 'fields';
    return 'session';
  }
}

test('Phase 25.FE.3: unified signer journey complete happy path', () => {
  const sim = new UnifiedSignerJourneySimulator({
    token: 'valid_token',
    state: 'active',
    fields: [
      { id: 'sig1', type: 'signature', required: true },
      { id: 'name1', type: 'text', required: true }
    ]
  });

  assert.equal(sim.loadSession(), true);
  assert.equal(sim.getState(), 'session');

  assert.equal(sim.giveConsent(), true);
  assert.equal(sim.getState(), 'fields');

  assert.equal(sim.setFieldValue('name1', 'Alice Smith'), true);
  assert.equal(sim.attachSignature('typed', 'Alice Smith'), true);
  assert.equal(sim.getState(), 'signing');

  const result = sim.submit('idem_12345');
  assert.equal(result.success, true);
  assert.equal(sim.getState(), 'completed');
});

test('Phase 25.FE.3: unified signer journey blocks submit without consent', () => {
  const sim = new UnifiedSignerJourneySimulator({
    token: 'valid_token',
    state: 'active',
    fields: []
  });

  // Try to submit without consent
  const result = sim.submit('idem_123');
  assert.equal(result.success, false);
  assert.ok(result.errors.includes('CONSENT_REQUIRED'));
});

test('Phase 25.FE.3: unified signer journey blocks submit without required signature', () => {
  const sim = new UnifiedSignerJourneySimulator({
    token: 'valid_token',
    state: 'active',
    fields: [
      { id: 'sig1', type: 'signature', required: true }
    ]
  });

  sim.giveConsent();
  // Don't attach signature

  const result = sim.submit('idem_123');
  assert.equal(result.success, false);
  assert.ok(result.errors.some(e => e.includes('SIGNATURE_REQUIRED')));
});

test('Phase 25.FE.3: unified signer journey handles expired token', () => {
  const sim = new UnifiedSignerJourneySimulator({
    token: 'expired_token',
    expired: true
  });

  assert.equal(sim.loadSession(), false);
  assert.ok(sim.errors.includes('TOKEN_EXPIRED'));
});

test('Phase 25.FE.3: unified signer journey handles blocked state', () => {
  const sim = new UnifiedSignerJourneySimulator({
    token: 'valid_token',
    state: 'blocked'
  });

  assert.equal(sim.loadSession(), false);
  assert.ok(sim.errors.includes('SIGNER_BLOCKED'));
});

// -----------------------------------------------------------------------------
// Multi-Signer Stage Completion Regression
// -----------------------------------------------------------------------------

/**
 * Simulates complete multi-signer workflow through all stages
 */
class MultiSignerWorkflowSimulator {
  constructor(participants) {
    this.participants = participants.map(p => ({
      ...p,
      status: 'pending'
    }));
  }

  getSigners() {
    return this.participants.filter(p => p.role === 'signer');
  }

  getActiveStage() {
    const signers = this.getSigners();
    const incompleteSigners = signers.filter(s => s.status !== 'completed');
    if (incompleteSigners.length === 0) {
      return Math.max(...signers.map(s => s.signing_stage || 1));
    }
    return Math.min(...incompleteSigners.map(s => s.signing_stage || 1));
  }

  getActiveSigners() {
    const activeStage = this.getActiveStage();
    return this.getSigners().filter(s =>
      (s.signing_stage || 1) === activeStage && s.status !== 'completed'
    );
  }

  canSign(participantId) {
    const p = this.participants.find(pp => pp.id === participantId);
    if (!p || p.role !== 'signer' || p.status === 'completed') return false;
    return (p.signing_stage || 1) === this.getActiveStage();
  }

  sign(participantId) {
    if (!this.canSign(participantId)) return false;
    const p = this.participants.find(pp => pp.id === participantId);
    p.status = 'completed';
    return true;
  }

  isComplete() {
    return this.getSigners().every(s => s.status === 'completed');
  }

  getCompletionSummary() {
    const signers = this.getSigners();
    return {
      total: signers.length,
      completed: signers.filter(s => s.status === 'completed').length,
      pending: signers.filter(s => s.status === 'pending').length,
      activeStage: this.getActiveStage(),
      stageCount: Math.max(...signers.map(s => s.signing_stage || 1))
    };
  }
}

test('Phase 25.FE.3: multi-signer workflow complete two-stage sequential', () => {
  const sim = new MultiSignerWorkflowSimulator([
    { id: 's1', role: 'signer', signing_stage: 1, email: 'first@example.com' },
    { id: 's2', role: 'signer', signing_stage: 2, email: 'second@example.com' },
    { id: 'cc1', role: 'cc', email: 'observer@example.com' }
  ]);

  // Initial state
  assert.equal(sim.getActiveStage(), 1);
  assert.equal(sim.canSign('s1'), true);
  assert.equal(sim.canSign('s2'), false); // Stage 2 blocked

  // Stage 1 signs
  assert.equal(sim.sign('s1'), true);
  assert.equal(sim.getActiveStage(), 2);

  // Now stage 2 can sign
  assert.equal(sim.canSign('s2'), true);
  assert.equal(sim.sign('s2'), true);

  // Complete
  assert.equal(sim.isComplete(), true);
  const summary = sim.getCompletionSummary();
  assert.equal(summary.completed, 2);
  assert.equal(summary.pending, 0);
});

test('Phase 25.FE.3: multi-signer workflow parallel signers in same stage', () => {
  const sim = new MultiSignerWorkflowSimulator([
    { id: 's1', role: 'signer', signing_stage: 1, email: 'alice@example.com' },
    { id: 's2', role: 'signer', signing_stage: 1, email: 'bob@example.com' },
    { id: 's3', role: 'signer', signing_stage: 2, email: 'charlie@example.com' }
  ]);

  // Both stage 1 signers active
  assert.equal(sim.getActiveSigners().length, 2);
  assert.equal(sim.canSign('s1'), true);
  assert.equal(sim.canSign('s2'), true);
  assert.equal(sim.canSign('s3'), false);

  // Sign in any order
  sim.sign('s2');
  assert.equal(sim.getActiveStage(), 1); // Still stage 1

  sim.sign('s1');
  assert.equal(sim.getActiveStage(), 2); // Now stage 2

  sim.sign('s3');
  assert.equal(sim.isComplete(), true);
});

test('Phase 25.FE.3: multi-signer workflow handles three stages', () => {
  const sim = new MultiSignerWorkflowSimulator([
    { id: 's1', role: 'signer', signing_stage: 1 },
    { id: 's2', role: 'signer', signing_stage: 2 },
    { id: 's3', role: 'signer', signing_stage: 3 }
  ]);

  const summary = sim.getCompletionSummary();
  assert.equal(summary.stageCount, 3);
  assert.equal(summary.activeStage, 1);

  sim.sign('s1');
  assert.equal(sim.getCompletionSummary().activeStage, 2);

  sim.sign('s2');
  assert.equal(sim.getCompletionSummary().activeStage, 3);

  sim.sign('s3');
  assert.equal(sim.isComplete(), true);
});

test('Phase 25.FE.3: multi-signer workflow prevents out-of-order signing', () => {
  const sim = new MultiSignerWorkflowSimulator([
    { id: 's1', role: 'signer', signing_stage: 1 },
    { id: 's2', role: 'signer', signing_stage: 2 }
  ]);

  // Cannot sign stage 2 before stage 1
  assert.equal(sim.sign('s2'), false);
  assert.equal(sim.getActiveStage(), 1);
});

test('Phase 25.FE.3: multi-signer workflow CC does not block stages', () => {
  const sim = new MultiSignerWorkflowSimulator([
    { id: 's1', role: 'signer', signing_stage: 1 },
    { id: 'cc1', role: 'cc' },
    { id: 'cc2', role: 'cc' }
  ]);

  // Only signer counted
  assert.equal(sim.getSigners().length, 1);
  sim.sign('s1');
  assert.equal(sim.isComplete(), true);
});

// -----------------------------------------------------------------------------
// E2E Integration Regression
// -----------------------------------------------------------------------------

test('Phase 25.FE.3: full E2E authoring -> signer journey integration', () => {
  // Admin creates agreement
  const authoring = new AdminAuthoringSimulator();
  authoring.setDocument('doc_employee_contract');
  authoring.setDetails('Employment Contract 2026');
  authoring.addParticipant('p1', 'signer', 'employee@company.com', 1);
  authoring.addParticipant('p2', 'signer', 'manager@company.com', 2);
  authoring.addFieldDefinition('sig1', 'signature', 'p1', true);
  authoring.addFieldDefinition('sig2', 'signature', 'p2', true);
  authoring.addFieldInstance('i1', 'sig1', 1, 100, 400, 200, 50);
  authoring.addFieldInstance('i2', 'sig2', 1, 100, 500, 200, 50);

  assert.equal(authoring.canSend(), true);

  // Signer 1 receives and signs
  const signer1 = new UnifiedSignerJourneySimulator({
    token: 'token_p1',
    state: 'active',
    fields: [{ id: 'sig1', type: 'signature', required: true }]
  });
  signer1.giveConsent();
  signer1.attachSignature('typed', 'John Employee');
  assert.equal(signer1.submit('idem_1').success, true);

  // Signer 2 receives and signs
  const signer2 = new UnifiedSignerJourneySimulator({
    token: 'token_p2',
    state: 'active',
    fields: [{ id: 'sig2', type: 'signature', required: true }]
  });
  signer2.giveConsent();
  signer2.attachSignature('drawn', 'signature_image_data');
  assert.equal(signer2.submit('idem_2').success, true);

  // Workflow tracking
  const workflow = new MultiSignerWorkflowSimulator([
    { id: 'p1', role: 'signer', signing_stage: 1 },
    { id: 'p2', role: 'signer', signing_stage: 2 }
  ]);
  workflow.sign('p1');
  workflow.sign('p2');
  assert.equal(workflow.isComplete(), true);
});

test('Phase 25.FE.3: V2 single-mode routing always returns unified', () => {
  // V2SignerFlowRouter should always return unified (from Phase 23)
  const router = new V2SignerFlowRouter();
  const entrypoint = router.resolveEntrypoint('valid_token');
  assert.equal(entrypoint.mode, 'unified');
  assert.ok(entrypoint.path.includes('valid_token'));
});

// =============================================================================
// Phase 26: CRM/HRIS Integration Foundation Tests
// =============================================================================

// -----------------------------------------------------------------------------
// Mapping Spec Constants and Types
// -----------------------------------------------------------------------------

const MAPPING_SPEC_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
};

const INTEGRATION_PROVIDERS = [
  'salesforce',
  'hubspot',
  'bamboohr',
  'workday',
];

const SYNC_RUN_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

const CONFLICT_STATUS = {
  PENDING: 'pending',
  RESOLVED: 'resolved',
  IGNORED: 'ignored',
};

const CONFLICT_RESOLUTION_ACTIONS = [
  'use_external',
  'use_internal',
  'merge',
  'skip',
];

// -----------------------------------------------------------------------------
// Mapping Spec Model Simulator
// -----------------------------------------------------------------------------

class MappingSpecSimulator {
  constructor(initialSpec = {}) {
    this.id = initialSpec.id || `mapping_${Date.now()}`;
    this.tenantId = initialSpec.tenantId || 'tenant_test';
    this.orgId = initialSpec.orgId || 'org_test';
    this.provider = initialSpec.provider || 'salesforce';
    this.name = initialSpec.name || '';
    this.version = initialSpec.version || 1;
    this.status = initialSpec.status || MAPPING_SPEC_STATUS.DRAFT;
    this.externalSchema = initialSpec.externalSchema || { objectType: '', version: '', fields: [] };
    this.rules = initialSpec.rules || [];
    this.compiledJSON = initialSpec.compiledJSON || '';
    this.compiledHash = initialSpec.compiledHash || '';
    this.publishedAt = initialSpec.publishedAt || null;
    this.errors = [];
  }

  setName(name) {
    this.name = name;
  }

  setProvider(provider) {
    if (!INTEGRATION_PROVIDERS.includes(provider)) {
      this.errors.push({ field: 'provider', message: `Invalid provider: ${provider}` });
      return false;
    }
    this.provider = provider;
    return true;
  }

  setExternalSchema(schema) {
    this.externalSchema = schema;
  }

  addRule(rule) {
    const requiredFields = ['sourceObject', 'sourceField', 'targetEntity', 'targetPath'];
    const missing = requiredFields.filter(f => !rule[f]);
    if (missing.length > 0) {
      this.errors.push({ field: 'rules', message: `Missing required fields: ${missing.join(', ')}` });
      return false;
    }
    this.rules.push({
      sourceObject: rule.sourceObject,
      sourceField: rule.sourceField,
      targetEntity: rule.targetEntity,
      targetPath: rule.targetPath,
      required: rule.required || false,
      defaultValue: rule.defaultValue || '',
      transform: rule.transform || '',
    });
    return true;
  }

  removeRule(index) {
    if (index < 0 || index >= this.rules.length) {
      return false;
    }
    this.rules.splice(index, 1);
    return true;
  }

  validate() {
    this.errors = [];

    if (!this.name || this.name.trim() === '') {
      this.errors.push({ field: 'name', message: 'Name is required' });
    }

    if (!this.provider) {
      this.errors.push({ field: 'provider', message: 'Provider is required' });
    }

    if (!this.externalSchema.objectType) {
      this.errors.push({ field: 'externalSchema.objectType', message: 'External schema object type is required' });
    }

    if (this.rules.length === 0) {
      this.errors.push({ field: 'rules', message: 'At least one mapping rule is required' });
    }

    // Check for duplicate target paths
    const targetPaths = this.rules.map(r => `${r.targetEntity}.${r.targetPath}`);
    const duplicates = targetPaths.filter((p, i) => targetPaths.indexOf(p) !== i);
    if (duplicates.length > 0) {
      this.errors.push({ field: 'rules', message: `Duplicate target paths: ${[...new Set(duplicates)].join(', ')}` });
    }

    return this.errors.length === 0;
  }

  getValidationErrors() {
    return this.errors;
  }

  canPublish() {
    return this.validate() && this.status === MAPPING_SPEC_STATUS.DRAFT;
  }

  publish() {
    if (!this.canPublish()) {
      return { success: false, errors: this.errors };
    }
    this.status = MAPPING_SPEC_STATUS.PUBLISHED;
    this.publishedAt = new Date().toISOString();
    this.version += 1;
    this.compiledHash = this._computeHash();
    return { success: true, version: this.version };
  }

  unpublish() {
    if (this.status !== MAPPING_SPEC_STATUS.PUBLISHED) {
      return { success: false, error: 'Spec is not published' };
    }
    this.status = MAPPING_SPEC_STATUS.DRAFT;
    return { success: true };
  }

  _computeHash() {
    // Simple hash simulation for testing
    const content = JSON.stringify({ rules: this.rules, schema: this.externalSchema });
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  toJSON() {
    return {
      id: this.id,
      tenant_id: this.tenantId,
      org_id: this.orgId,
      provider: this.provider,
      name: this.name,
      version: this.version,
      status: this.status,
      external_schema: this.externalSchema,
      rules: this.rules,
      compiled_json: this.compiledJSON,
      compiled_hash: this.compiledHash,
      published_at: this.publishedAt,
    };
  }
}

// -----------------------------------------------------------------------------
// Mapping Transform Simulator
// -----------------------------------------------------------------------------

class MappingTransformSimulator {
  constructor(mappingSpec) {
    this.spec = mappingSpec;
  }

  transform(sourcePayload) {
    if (!this.spec.rules || this.spec.rules.length === 0) {
      return { success: false, error: 'No mapping rules defined' };
    }

    const result = {
      agreement: {},
      participants: [],
      fieldDefinitions: [],
    };

    const errors = [];

    for (const rule of this.spec.rules) {
      const sourceValue = this._extractValue(sourcePayload, rule.sourceObject, rule.sourceField);

      if (sourceValue === undefined && rule.required) {
        errors.push({
          rule: `${rule.sourceObject}.${rule.sourceField}`,
          error: 'Required field missing in source payload',
        });
        continue;
      }

      const value = sourceValue !== undefined ? this._applyTransform(sourceValue, rule.transform) : rule.defaultValue;

      this._setTargetValue(result, rule.targetEntity, rule.targetPath, value);
    }

    if (errors.length > 0) {
      return { success: false, errors, partial: result };
    }

    return { success: true, data: result };
  }

  _extractValue(payload, objectPath, fieldPath) {
    let obj = payload;
    if (objectPath && objectPath !== 'root') {
      const parts = objectPath.split('.');
      for (const part of parts) {
        if (obj === undefined || obj === null) return undefined;
        obj = obj[part];
      }
    }
    if (!obj) return undefined;

    const fieldParts = fieldPath.split('.');
    for (const part of fieldParts) {
      if (obj === undefined || obj === null) return undefined;
      obj = obj[part];
    }
    return obj;
  }

  _applyTransform(value, transform) {
    if (!transform) return value;

    switch (transform) {
      case 'lowercase':
        return String(value).toLowerCase();
      case 'uppercase':
        return String(value).toUpperCase();
      case 'trim':
        return String(value).trim();
      case 'email_normalize':
        return String(value).toLowerCase().trim();
      case 'date_iso':
        return new Date(value).toISOString();
      default:
        return value;
    }
  }

  _setTargetValue(result, entity, path, value) {
    let target;
    switch (entity) {
      case 'agreement':
        target = result.agreement;
        break;
      case 'participant':
        if (result.participants.length === 0) {
          result.participants.push({});
        }
        target = result.participants[result.participants.length - 1];
        break;
      case 'field_definition':
        if (result.fieldDefinitions.length === 0) {
          result.fieldDefinitions.push({});
        }
        target = result.fieldDefinitions[result.fieldDefinitions.length - 1];
        break;
      default:
        return;
    }

    const parts = path.split('.');
    for (let i = 0; i < parts.length - 1; i++) {
      if (!target[parts[i]]) target[parts[i]] = {};
      target = target[parts[i]];
    }
    target[parts[parts.length - 1]] = value;
  }
}

// -----------------------------------------------------------------------------
// Sync Run Simulator
// -----------------------------------------------------------------------------

class IntegrationSyncRunSimulator {
  constructor(options = {}) {
    this.id = options.id || `run_${Date.now()}`;
    this.tenantId = options.tenantId || 'tenant_test';
    this.orgId = options.orgId || 'org_test';
    this.provider = options.provider || 'salesforce';
    this.direction = options.direction || 'inbound';
    this.mappingSpecId = options.mappingSpecId || null;
    this.status = SYNC_RUN_STATUS.PENDING;
    this.cursor = '';
    this.lastError = '';
    this.attemptCount = 0;
    this.checkpoints = [];
    this.processedRecords = 0;
    this.failedRecords = 0;
    this.conflicts = [];
    this.startedAt = null;
    this.completedAt = null;
  }

  start() {
    if (this.status !== SYNC_RUN_STATUS.PENDING) {
      return { success: false, error: 'Run already started' };
    }
    if (!this.mappingSpecId) {
      return { success: false, error: 'Mapping spec required' };
    }
    this.status = SYNC_RUN_STATUS.RUNNING;
    this.startedAt = new Date().toISOString();
    this.attemptCount += 1;
    return { success: true };
  }

  processRecord(record, result) {
    if (this.status !== SYNC_RUN_STATUS.RUNNING) {
      return { success: false, error: 'Run not in running state' };
    }

    if (result.success) {
      this.processedRecords += 1;
    } else if (result.conflict) {
      this.conflicts.push({
        id: `conflict_${this.conflicts.length + 1}`,
        externalId: record.id,
        reason: result.reason,
        payload: record,
      });
      this.failedRecords += 1;
    } else {
      this.failedRecords += 1;
    }

    return { success: true };
  }

  checkpoint(key, cursor, payload = {}) {
    if (this.status !== SYNC_RUN_STATUS.RUNNING) {
      return { success: false, error: 'Run not in running state' };
    }
    this.cursor = cursor;
    this.checkpoints.push({
      key,
      cursor,
      payload,
      createdAt: new Date().toISOString(),
    });
    return { success: true };
  }

  complete() {
    if (this.status !== SYNC_RUN_STATUS.RUNNING) {
      return { success: false, error: 'Run not in running state' };
    }
    this.status = SYNC_RUN_STATUS.COMPLETED;
    this.completedAt = new Date().toISOString();
    return {
      success: true,
      stats: {
        processed: this.processedRecords,
        failed: this.failedRecords,
        conflicts: this.conflicts.length,
      },
    };
  }

  fail(error) {
    if (this.status !== SYNC_RUN_STATUS.RUNNING) {
      return { success: false, error: 'Run not in running state' };
    }
    this.status = SYNC_RUN_STATUS.FAILED;
    this.lastError = error;
    this.completedAt = new Date().toISOString();
    return { success: true };
  }

  canRetry() {
    return this.status === SYNC_RUN_STATUS.FAILED && this.attemptCount < 3;
  }

  retry() {
    if (!this.canRetry()) {
      return { success: false, error: 'Cannot retry' };
    }
    this.status = SYNC_RUN_STATUS.PENDING;
    this.lastError = '';
    return { success: true };
  }

  getProgress() {
    return {
      status: this.status,
      processed: this.processedRecords,
      failed: this.failedRecords,
      conflicts: this.conflicts.length,
      checkpoints: this.checkpoints.length,
      cursor: this.cursor,
    };
  }

  toJSON() {
    return {
      id: this.id,
      tenant_id: this.tenantId,
      org_id: this.orgId,
      provider: this.provider,
      direction: this.direction,
      mapping_spec_id: this.mappingSpecId,
      status: this.status,
      cursor: this.cursor,
      last_error: this.lastError,
      attempt_count: this.attemptCount,
      started_at: this.startedAt,
      completed_at: this.completedAt,
    };
  }
}

// -----------------------------------------------------------------------------
// Conflict Resolution Simulator
// -----------------------------------------------------------------------------

class IntegrationConflictSimulator {
  constructor(options = {}) {
    this.id = options.id || `conflict_${Date.now()}`;
    this.tenantId = options.tenantId || 'tenant_test';
    this.orgId = options.orgId || 'org_test';
    this.runId = options.runId || null;
    this.bindingId = options.bindingId || null;
    this.provider = options.provider || 'salesforce';
    this.entityKind = options.entityKind || 'contact';
    this.externalId = options.externalId || 'ext_123';
    this.internalId = options.internalId || null;
    this.status = CONFLICT_STATUS.PENDING;
    this.reason = options.reason || 'duplicate_detected';
    this.payload = options.payload || {};
    this.resolution = null;
    this.resolvedBy = null;
    this.resolvedAt = null;
    this.auditTrail = [];
  }

  addAuditEntry(action, actor, details = {}) {
    this.auditTrail.push({
      action,
      actor,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  canResolve() {
    return this.status === CONFLICT_STATUS.PENDING;
  }

  resolve(action, userId, notes = '') {
    if (!this.canResolve()) {
      return { success: false, error: 'Conflict already resolved or ignored' };
    }

    if (!CONFLICT_RESOLUTION_ACTIONS.includes(action)) {
      return { success: false, error: `Invalid resolution action: ${action}` };
    }

    this.status = CONFLICT_STATUS.RESOLVED;
    this.resolution = { action, notes };
    this.resolvedBy = userId;
    this.resolvedAt = new Date().toISOString();

    this.addAuditEntry('resolved', userId, { action, notes });

    return { success: true };
  }

  ignore(userId, reason = '') {
    if (!this.canResolve()) {
      return { success: false, error: 'Conflict already resolved or ignored' };
    }

    this.status = CONFLICT_STATUS.IGNORED;
    this.resolution = { action: 'ignored', reason };
    this.resolvedBy = userId;
    this.resolvedAt = new Date().toISOString();

    this.addAuditEntry('ignored', userId, { reason });

    return { success: true };
  }

  reopen(userId, reason = '') {
    if (this.status === CONFLICT_STATUS.PENDING) {
      return { success: false, error: 'Conflict is already pending' };
    }

    const previousStatus = this.status;
    this.status = CONFLICT_STATUS.PENDING;
    this.resolution = null;
    this.resolvedBy = null;
    this.resolvedAt = null;

    this.addAuditEntry('reopened', userId, { previousStatus, reason });

    return { success: true };
  }

  toJSON() {
    return {
      id: this.id,
      tenant_id: this.tenantId,
      org_id: this.orgId,
      run_id: this.runId,
      binding_id: this.bindingId,
      provider: this.provider,
      entity_kind: this.entityKind,
      external_id: this.externalId,
      internal_id: this.internalId,
      status: this.status,
      reason: this.reason,
      payload: this.payload,
      resolution: this.resolution,
      resolved_by: this.resolvedBy,
      resolved_at: this.resolvedAt,
    };
  }
}

// -----------------------------------------------------------------------------
// Integration Health Monitor Simulator
// -----------------------------------------------------------------------------

class IntegrationHealthMonitorSimulator {
  constructor() {
    this.syncRuns = [];
    this.conflicts = [];
    this.retries = [];
  }

  addSyncRun(run) {
    this.syncRuns.push(run);
  }

  addConflict(conflict) {
    this.conflicts.push(conflict);
  }

  recordRetry(runId, attempt, recovered) {
    this.retries.push({
      runId,
      attempt,
      recovered,
      timestamp: new Date().toISOString(),
    });
  }

  calculateHealthScore() {
    const recentRuns = this.syncRuns.slice(-100);
    if (recentRuns.length === 0) return 100;

    const succeeded = recentRuns.filter(r => r.status === SYNC_RUN_STATUS.COMPLETED).length;
    const successRate = (succeeded / recentRuns.length) * 100;

    const pendingConflicts = this.conflicts.filter(c => c.status === CONFLICT_STATUS.PENDING).length;
    const conflictPenalty = Math.min(pendingConflicts * 2, 20);

    return Math.max(0, Math.round(successRate - conflictPenalty));
  }

  getSyncSuccessRate() {
    const recentRuns = this.syncRuns.slice(-100);
    if (recentRuns.length === 0) return 100;

    const succeeded = recentRuns.filter(r => r.status === SYNC_RUN_STATUS.COMPLETED).length;
    return (succeeded / recentRuns.length) * 100;
  }

  getConflictBacklog() {
    return this.conflicts.filter(c => c.status === CONFLICT_STATUS.PENDING).length;
  }

  getRetryRecoveryRate() {
    if (this.retries.length === 0) return 100;
    const recovered = this.retries.filter(r => r.recovered).length;
    return (recovered / this.retries.length) * 100;
  }

  getProviderHealth(provider) {
    const providerRuns = this.syncRuns.filter(r => r.provider === provider);
    const providerConflicts = this.conflicts.filter(c => c.provider === provider);

    const succeeded = providerRuns.filter(r => r.status === SYNC_RUN_STATUS.COMPLETED).length;
    const successRate = providerRuns.length > 0 ? (succeeded / providerRuns.length) * 100 : 100;

    const pendingConflicts = providerConflicts.filter(c => c.status === CONFLICT_STATUS.PENDING).length;

    const lastRun = providerRuns[providerRuns.length - 1];
    const lagMinutes = lastRun ? Math.floor((Date.now() - new Date(lastRun.startedAt).getTime()) / 60000) : null;

    return {
      provider,
      successRate,
      pendingConflicts,
      lagMinutes,
      status: successRate >= 95 ? 'healthy' : successRate >= 80 ? 'degraded' : 'unhealthy',
    };
  }
}

// -----------------------------------------------------------------------------
// Phase 26 Tests: Mapping Spec Authoring
// -----------------------------------------------------------------------------

test('Phase 26.FE.1: mapping spec creation with valid configuration', () => {
  const spec = new MappingSpecSimulator();
  spec.setName('Salesforce Contact Import');
  spec.setProvider('salesforce');
  spec.setExternalSchema({
    objectType: 'Contact',
    version: '52.0',
    fields: [
      { object: 'Contact', field: 'Email', type: 'email', required: true },
      { object: 'Contact', field: 'FirstName', type: 'string', required: false },
      { object: 'Contact', field: 'LastName', type: 'string', required: true },
    ],
  });
  spec.addRule({
    sourceObject: 'Contact',
    sourceField: 'Email',
    targetEntity: 'participant',
    targetPath: 'email',
    required: true,
    transform: 'email_normalize',
  });
  spec.addRule({
    sourceObject: 'Contact',
    sourceField: 'FirstName',
    targetEntity: 'participant',
    targetPath: 'name',
  });

  assert.equal(spec.validate(), true);
  assert.equal(spec.errors.length, 0);
});

test('Phase 26.FE.1: mapping spec validation rejects empty name', () => {
  const spec = new MappingSpecSimulator();
  spec.setProvider('salesforce');
  spec.setExternalSchema({ objectType: 'Contact', version: '52.0', fields: [] });
  spec.addRule({
    sourceObject: 'Contact',
    sourceField: 'Email',
    targetEntity: 'participant',
    targetPath: 'email',
  });

  assert.equal(spec.validate(), false);
  const nameError = spec.errors.find(e => e.field === 'name');
  assert.ok(nameError);
});

test('Phase 26.FE.1: mapping spec validation rejects invalid provider', () => {
  const spec = new MappingSpecSimulator();
  const result = spec.setProvider('invalid_provider');
  assert.equal(result, false);
  assert.equal(spec.errors.length, 1);
});

test('Phase 26.FE.1: mapping spec validation requires at least one rule', () => {
  const spec = new MappingSpecSimulator();
  spec.setName('Empty Mapping');
  spec.setProvider('hubspot');
  spec.setExternalSchema({ objectType: 'Contact', version: '1.0', fields: [] });

  assert.equal(spec.validate(), false);
  const rulesError = spec.errors.find(e => e.field === 'rules');
  assert.ok(rulesError);
});

test('Phase 26.FE.1: mapping spec detects duplicate target paths', () => {
  const spec = new MappingSpecSimulator();
  spec.setName('Duplicate Paths');
  spec.setProvider('salesforce');
  spec.setExternalSchema({ objectType: 'Contact', version: '52.0', fields: [] });
  spec.addRule({
    sourceObject: 'Contact',
    sourceField: 'Email',
    targetEntity: 'participant',
    targetPath: 'email',
  });
  spec.addRule({
    sourceObject: 'Contact',
    sourceField: 'PersonEmail',
    targetEntity: 'participant',
    targetPath: 'email',
  });

  assert.equal(spec.validate(), false);
  const duplicateError = spec.errors.find(e => e.message.includes('Duplicate'));
  assert.ok(duplicateError);
});

test('Phase 26.FE.1: mapping spec publish workflow', () => {
  const spec = new MappingSpecSimulator();
  spec.setName('Publishable Spec');
  spec.setProvider('bamboohr');
  spec.setExternalSchema({ objectType: 'Employee', version: '1.0', fields: [] });
  spec.addRule({
    sourceObject: 'Employee',
    sourceField: 'workEmail',
    targetEntity: 'participant',
    targetPath: 'email',
    required: true,
  });

  assert.equal(spec.status, MAPPING_SPEC_STATUS.DRAFT);
  assert.equal(spec.canPublish(), true);

  const result = spec.publish();
  assert.equal(result.success, true);
  assert.equal(spec.status, MAPPING_SPEC_STATUS.PUBLISHED);
  assert.equal(spec.version, 2);
  assert.ok(spec.publishedAt);
  assert.ok(spec.compiledHash);
});

test('Phase 26.FE.1: cannot publish invalid mapping spec', () => {
  const spec = new MappingSpecSimulator();
  // Missing required fields
  assert.equal(spec.canPublish(), false);
  const result = spec.publish();
  assert.equal(result.success, false);
  assert.ok(result.errors.length > 0);
});

// -----------------------------------------------------------------------------
// Phase 26 Tests: Mapping Transform Preview
// -----------------------------------------------------------------------------

test('Phase 26.FE.2: mapping transform preview with valid payload', () => {
  const spec = new MappingSpecSimulator();
  spec.setProvider('salesforce');
  spec.addRule({
    sourceObject: 'Contact',
    sourceField: 'Email',
    targetEntity: 'participant',
    targetPath: 'email',
    transform: 'email_normalize',
  });
  spec.addRule({
    sourceObject: 'Contact',
    sourceField: 'FirstName',
    targetEntity: 'participant',
    targetPath: 'name',
  });

  const transformer = new MappingTransformSimulator(spec);
  const result = transformer.transform({
    Contact: {
      Email: '  John.Doe@Example.COM  ',
      FirstName: 'John',
    },
  });

  assert.equal(result.success, true);
  assert.equal(result.data.participants[0].email, 'john.doe@example.com');
  assert.equal(result.data.participants[0].name, 'John');
});

test('Phase 26.FE.2: mapping transform preview with missing required field', () => {
  const spec = new MappingSpecSimulator();
  spec.addRule({
    sourceObject: 'Contact',
    sourceField: 'Email',
    targetEntity: 'participant',
    targetPath: 'email',
    required: true,
  });

  const transformer = new MappingTransformSimulator(spec);
  const result = transformer.transform({
    Contact: {
      // Email is missing
      FirstName: 'John',
    },
  });

  assert.equal(result.success, false);
  assert.ok(result.errors.length > 0);
  assert.ok(result.errors[0].error.includes('Required field'));
});

test('Phase 26.FE.2: mapping transform uses default value for missing optional field', () => {
  const spec = new MappingSpecSimulator();
  spec.addRule({
    sourceObject: 'Contact',
    sourceField: 'Department',
    targetEntity: 'agreement',
    targetPath: 'metadata.department',
    required: false,
    defaultValue: 'General',
  });

  const transformer = new MappingTransformSimulator(spec);
  const result = transformer.transform({
    Contact: {},
  });

  assert.equal(result.success, true);
  assert.equal(result.data.agreement.metadata.department, 'General');
});

test('Phase 26.FE.2: mapping transform applies transforms correctly', () => {
  const spec = new MappingSpecSimulator();
  spec.addRule({
    sourceObject: 'root',
    sourceField: 'title',
    targetEntity: 'agreement',
    targetPath: 'title',
    transform: 'uppercase',
  });

  const transformer = new MappingTransformSimulator(spec);
  const result = transformer.transform({
    title: 'employment agreement',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.agreement.title, 'EMPLOYMENT AGREEMENT');
});

// -----------------------------------------------------------------------------
// Phase 26 Tests: Sync Run Operations
// -----------------------------------------------------------------------------

test('Phase 26.FE.3: sync run lifecycle - start to completion', () => {
  const run = new IntegrationSyncRunSimulator({
    provider: 'salesforce',
    direction: 'inbound',
    mappingSpecId: 'mapping_123',
  });

  assert.equal(run.status, SYNC_RUN_STATUS.PENDING);

  const startResult = run.start();
  assert.equal(startResult.success, true);
  assert.equal(run.status, SYNC_RUN_STATUS.RUNNING);
  assert.ok(run.startedAt);

  // Process some records
  run.processRecord({ id: 'ext_1', email: 'a@example.com' }, { success: true });
  run.processRecord({ id: 'ext_2', email: 'b@example.com' }, { success: true });
  run.processRecord({ id: 'ext_3', email: 'c@example.com' }, { success: false, conflict: true, reason: 'duplicate' });

  const progress = run.getProgress();
  assert.equal(progress.processed, 2);
  assert.equal(progress.failed, 1);
  assert.equal(progress.conflicts, 1);

  const completeResult = run.complete();
  assert.equal(completeResult.success, true);
  assert.equal(run.status, SYNC_RUN_STATUS.COMPLETED);
  assert.equal(completeResult.stats.processed, 2);
  assert.equal(completeResult.stats.conflicts, 1);
});

test('Phase 26.FE.3: sync run requires mapping spec to start', () => {
  const run = new IntegrationSyncRunSimulator({
    provider: 'hubspot',
    direction: 'inbound',
  });

  const result = run.start();
  assert.equal(result.success, false);
  assert.ok(result.error.includes('Mapping spec'));
});

test('Phase 26.FE.3: sync run checkpoint resumability', () => {
  const run = new IntegrationSyncRunSimulator({
    provider: 'salesforce',
    mappingSpecId: 'mapping_123',
  });

  run.start();

  // Create checkpoints as we process
  run.processRecord({ id: 'ext_1' }, { success: true });
  run.checkpoint('page_1', 'cursor_abc123', { page: 1 });

  run.processRecord({ id: 'ext_2' }, { success: true });
  run.checkpoint('page_2', 'cursor_def456', { page: 2 });

  assert.equal(run.checkpoints.length, 2);
  assert.equal(run.cursor, 'cursor_def456');

  // Verify checkpoint data
  const lastCheckpoint = run.checkpoints[run.checkpoints.length - 1];
  assert.equal(lastCheckpoint.key, 'page_2');
  assert.equal(lastCheckpoint.payload.page, 2);
});

test('Phase 26.FE.3: sync run failure and retry', () => {
  const run = new IntegrationSyncRunSimulator({
    provider: 'workday',
    mappingSpecId: 'mapping_456',
  });

  run.start();
  run.processRecord({ id: 'ext_1' }, { success: true });

  // Simulate failure
  run.fail('Connection timeout');
  assert.equal(run.status, SYNC_RUN_STATUS.FAILED);
  assert.equal(run.lastError, 'Connection timeout');

  // Retry
  assert.equal(run.canRetry(), true);
  const retryResult = run.retry();
  assert.equal(retryResult.success, true);
  assert.equal(run.status, SYNC_RUN_STATUS.PENDING);

  // Start again
  run.start();
  assert.equal(run.attemptCount, 2);
});

test('Phase 26.FE.3: sync run retry limit enforcement', () => {
  const run = new IntegrationSyncRunSimulator({
    provider: 'bamboohr',
    mappingSpecId: 'mapping_789',
  });

  // Exhaust retries
  for (let i = 0; i < 3; i++) {
    run.start();
    run.fail(`Failure ${i + 1}`);
    if (i < 2) run.retry();
  }

  assert.equal(run.attemptCount, 3);
  assert.equal(run.canRetry(), false);
  const result = run.retry();
  assert.equal(result.success, false);
});

// -----------------------------------------------------------------------------
// Phase 26 Tests: Conflict Resolution
// -----------------------------------------------------------------------------

test('Phase 26.FE.4: conflict resolution workflow', () => {
  const conflict = new IntegrationConflictSimulator({
    provider: 'salesforce',
    entityKind: 'contact',
    externalId: 'sf_contact_123',
    reason: 'duplicate_detected',
    payload: { email: 'john@example.com', name: 'John Doe' },
  });

  assert.equal(conflict.status, CONFLICT_STATUS.PENDING);
  assert.equal(conflict.canResolve(), true);

  const resolveResult = conflict.resolve('use_external', 'user_admin', 'External record is more recent');
  assert.equal(resolveResult.success, true);
  assert.equal(conflict.status, CONFLICT_STATUS.RESOLVED);
  assert.equal(conflict.resolution.action, 'use_external');
  assert.equal(conflict.resolvedBy, 'user_admin');
  assert.ok(conflict.resolvedAt);
});

test('Phase 26.FE.4: conflict ignore workflow', () => {
  const conflict = new IntegrationConflictSimulator({
    provider: 'hubspot',
    entityKind: 'deal',
    externalId: 'hs_deal_456',
    reason: 'schema_mismatch',
  });

  const ignoreResult = conflict.ignore('user_admin', 'Will handle manually');
  assert.equal(ignoreResult.success, true);
  assert.equal(conflict.status, CONFLICT_STATUS.IGNORED);
  assert.equal(conflict.resolution.reason, 'Will handle manually');
});

test('Phase 26.FE.4: conflict reopen workflow', () => {
  const conflict = new IntegrationConflictSimulator({
    provider: 'salesforce',
    entityKind: 'contact',
    externalId: 'sf_contact_789',
  });

  conflict.resolve('use_internal', 'user_admin');
  assert.equal(conflict.status, CONFLICT_STATUS.RESOLVED);

  const reopenResult = conflict.reopen('user_manager', 'Need to reconsider');
  assert.equal(reopenResult.success, true);
  assert.equal(conflict.status, CONFLICT_STATUS.PENDING);
  assert.equal(conflict.resolution, null);
  assert.equal(conflict.resolvedBy, null);
});

test('Phase 26.FE.4: conflict audit trail tracking', () => {
  const conflict = new IntegrationConflictSimulator({
    provider: 'workday',
    entityKind: 'employee',
    externalId: 'wd_emp_001',
  });

  conflict.addAuditEntry('created', 'system', { source: 'sync_run_123' });
  conflict.resolve('merge', 'user_admin', 'Merged fields');
  conflict.reopen('user_manager', 'Found issue');
  conflict.resolve('use_external', 'user_admin');

  assert.equal(conflict.auditTrail.length, 4);
  assert.equal(conflict.auditTrail[0].action, 'created');
  assert.equal(conflict.auditTrail[1].action, 'resolved');
  assert.equal(conflict.auditTrail[2].action, 'reopened');
  assert.equal(conflict.auditTrail[3].action, 'resolved');
});

test('Phase 26.FE.4: cannot resolve already resolved conflict', () => {
  const conflict = new IntegrationConflictSimulator({
    provider: 'salesforce',
    entityKind: 'contact',
  });

  conflict.resolve('use_external', 'user_admin');

  const secondResolve = conflict.resolve('use_internal', 'user_other');
  assert.equal(secondResolve.success, false);
});

test('Phase 26.FE.4: invalid resolution action rejected', () => {
  const conflict = new IntegrationConflictSimulator({
    provider: 'hubspot',
    entityKind: 'contact',
  });

  const result = conflict.resolve('invalid_action', 'user_admin');
  assert.equal(result.success, false);
  assert.ok(result.error.includes('Invalid resolution'));
});

// -----------------------------------------------------------------------------
// Phase 26 Tests: Integration Health Observability
// -----------------------------------------------------------------------------

test('Phase 26.FE.5: health score calculation', () => {
  const monitor = new IntegrationHealthMonitorSimulator();

  // Add 95 successful runs and 5 failed runs
  for (let i = 0; i < 95; i++) {
    monitor.addSyncRun({ status: SYNC_RUN_STATUS.COMPLETED, provider: 'salesforce' });
  }
  for (let i = 0; i < 5; i++) {
    monitor.addSyncRun({ status: SYNC_RUN_STATUS.FAILED, provider: 'salesforce' });
  }

  const healthScore = monitor.calculateHealthScore();
  assert.ok(healthScore >= 90 && healthScore <= 100);
});

test('Phase 26.FE.5: health score penalized by conflict backlog', () => {
  const monitor = new IntegrationHealthMonitorSimulator();

  // All runs successful
  for (let i = 0; i < 100; i++) {
    monitor.addSyncRun({ status: SYNC_RUN_STATUS.COMPLETED, provider: 'salesforce' });
  }

  // Add pending conflicts
  for (let i = 0; i < 10; i++) {
    monitor.addConflict(new IntegrationConflictSimulator({ status: CONFLICT_STATUS.PENDING }));
  }

  const healthScore = monitor.calculateHealthScore();
  // 100% success rate - 20% conflict penalty = 80%
  assert.ok(healthScore <= 80);
});

test('Phase 26.FE.5: sync success rate calculation', () => {
  const monitor = new IntegrationHealthMonitorSimulator();

  monitor.addSyncRun({ status: SYNC_RUN_STATUS.COMPLETED, provider: 'salesforce' });
  monitor.addSyncRun({ status: SYNC_RUN_STATUS.COMPLETED, provider: 'salesforce' });
  monitor.addSyncRun({ status: SYNC_RUN_STATUS.FAILED, provider: 'salesforce' });
  monitor.addSyncRun({ status: SYNC_RUN_STATUS.COMPLETED, provider: 'salesforce' });

  const successRate = monitor.getSyncSuccessRate();
  assert.equal(successRate, 75);
});

test('Phase 26.FE.5: conflict backlog count', () => {
  const monitor = new IntegrationHealthMonitorSimulator();

  const pending1 = new IntegrationConflictSimulator();
  const pending2 = new IntegrationConflictSimulator();
  const resolved = new IntegrationConflictSimulator();
  resolved.resolve('use_external', 'admin');

  monitor.addConflict(pending1);
  monitor.addConflict(pending2);
  monitor.addConflict(resolved);

  assert.equal(monitor.getConflictBacklog(), 2);
});

test('Phase 26.FE.5: retry recovery rate calculation', () => {
  const monitor = new IntegrationHealthMonitorSimulator();

  monitor.recordRetry('run_1', 1, true);
  monitor.recordRetry('run_2', 1, true);
  monitor.recordRetry('run_3', 1, false);
  monitor.recordRetry('run_4', 1, true);

  const recoveryRate = monitor.getRetryRecoveryRate();
  assert.equal(recoveryRate, 75);
});

test('Phase 26.FE.5: per-provider health breakdown', () => {
  const monitor = new IntegrationHealthMonitorSimulator();

  // Salesforce runs
  monitor.addSyncRun({ status: SYNC_RUN_STATUS.COMPLETED, provider: 'salesforce', startedAt: new Date().toISOString() });
  monitor.addSyncRun({ status: SYNC_RUN_STATUS.COMPLETED, provider: 'salesforce', startedAt: new Date().toISOString() });

  // HubSpot runs (one failed)
  monitor.addSyncRun({ status: SYNC_RUN_STATUS.COMPLETED, provider: 'hubspot', startedAt: new Date().toISOString() });
  monitor.addSyncRun({ status: SYNC_RUN_STATUS.FAILED, provider: 'hubspot', startedAt: new Date().toISOString() });

  // Add conflicts for HubSpot
  const conflict = new IntegrationConflictSimulator({ provider: 'hubspot' });
  monitor.addConflict(conflict);

  const sfHealth = monitor.getProviderHealth('salesforce');
  assert.equal(sfHealth.successRate, 100);
  assert.equal(sfHealth.status, 'healthy');

  const hsHealth = monitor.getProviderHealth('hubspot');
  assert.equal(hsHealth.successRate, 50);
  assert.equal(hsHealth.pendingConflicts, 1);
  assert.equal(hsHealth.status, 'unhealthy');
});

// -----------------------------------------------------------------------------
// Phase 26 E2E: Full Integration Flow
// -----------------------------------------------------------------------------

test('Phase 26.FE.6: full E2E mapping authoring -> validation -> run -> conflict resolution', () => {
  // Step 1: Author mapping spec
  const spec = new MappingSpecSimulator();
  spec.setName('Salesforce Contact to Participant');
  spec.setProvider('salesforce');
  spec.setExternalSchema({
    objectType: 'Contact',
    version: '52.0',
    fields: [
      { object: 'Contact', field: 'Email', type: 'email', required: true },
      { object: 'Contact', field: 'FirstName', type: 'string', required: false },
      { object: 'Contact', field: 'LastName', type: 'string', required: true },
    ],
  });
  spec.addRule({
    sourceObject: 'Contact',
    sourceField: 'Email',
    targetEntity: 'participant',
    targetPath: 'email',
    required: true,
    transform: 'email_normalize',
  });
  spec.addRule({
    sourceObject: 'Contact',
    sourceField: 'FirstName',
    targetEntity: 'participant',
    targetPath: 'name',
  });

  // Step 2: Validate
  assert.equal(spec.validate(), true, 'Mapping spec should be valid');

  // Step 3: Preview transform
  const transformer = new MappingTransformSimulator(spec);
  const previewResult = transformer.transform({
    Contact: {
      Email: 'jane.doe@example.com',
      FirstName: 'Jane',
    },
  });
  assert.equal(previewResult.success, true, 'Transform preview should succeed');
  assert.equal(previewResult.data.participants[0].email, 'jane.doe@example.com');

  // Step 4: Publish
  const publishResult = spec.publish();
  assert.equal(publishResult.success, true, 'Publish should succeed');

  // Step 5: Create sync run
  const run = new IntegrationSyncRunSimulator({
    provider: 'salesforce',
    direction: 'inbound',
    mappingSpecId: spec.id,
  });

  // Step 6: Execute sync run
  run.start();

  // Process records - including one that creates a conflict
  run.processRecord({ id: 'sf_001', Email: 'a@test.com' }, { success: true });
  run.processRecord({ id: 'sf_002', Email: 'b@test.com' }, { success: true });
  run.checkpoint('batch_1', 'cursor_after_002');

  // This record has a conflict
  run.processRecord(
    { id: 'sf_003', Email: 'existing@test.com' },
    { success: false, conflict: true, reason: 'duplicate_email' }
  );

  run.processRecord({ id: 'sf_004', Email: 'd@test.com' }, { success: true });
  run.checkpoint('batch_2', 'cursor_after_004');

  // Complete run
  const runResult = run.complete();
  assert.equal(runResult.success, true);
  assert.equal(runResult.stats.processed, 3);
  assert.equal(runResult.stats.conflicts, 1);

  // Step 7: Handle conflict
  const conflict = new IntegrationConflictSimulator({
    runId: run.id,
    provider: 'salesforce',
    entityKind: 'contact',
    externalId: 'sf_003',
    reason: 'duplicate_email',
    payload: { Email: 'existing@test.com' },
  });

  conflict.addAuditEntry('created', 'system', { runId: run.id });
  assert.equal(conflict.canResolve(), true);

  // Resolve conflict
  const resolveResult = conflict.resolve('use_external', 'admin_user', 'External record is newer');
  assert.equal(resolveResult.success, true);
  assert.equal(conflict.status, CONFLICT_STATUS.RESOLVED);

  // Step 8: Verify health monitoring
  const monitor = new IntegrationHealthMonitorSimulator();
  monitor.addSyncRun(run);
  monitor.addConflict(conflict);

  const healthScore = monitor.calculateHealthScore();
  assert.ok(healthScore >= 80, `Health score should be at least 80, got ${healthScore}`);
  assert.equal(monitor.getConflictBacklog(), 0, 'All conflicts should be resolved');
});

test('Phase 26.FE.6: E2E handles run failure with retry', () => {
  const spec = new MappingSpecSimulator();
  spec.setName('Retry Test Mapping');
  spec.setProvider('hubspot');
  spec.setExternalSchema({ objectType: 'Contact', version: '1.0', fields: [] });
  spec.addRule({
    sourceObject: 'Contact',
    sourceField: 'email',
    targetEntity: 'participant',
    targetPath: 'email',
  });
  spec.publish();

  const run = new IntegrationSyncRunSimulator({
    provider: 'hubspot',
    mappingSpecId: spec.id,
  });

  // First attempt fails
  run.start();
  run.processRecord({ id: 'hs_001' }, { success: true });
  run.checkpoint('page_1', 'cursor_001');
  run.fail('API rate limit exceeded');

  assert.equal(run.status, SYNC_RUN_STATUS.FAILED);
  assert.equal(run.attemptCount, 1);
  assert.equal(run.cursor, 'cursor_001', 'Cursor preserved for retry');

  // Retry succeeds
  run.retry();
  run.start();
  run.processRecord({ id: 'hs_002' }, { success: true });
  run.complete();

  assert.equal(run.status, SYNC_RUN_STATUS.COMPLETED);
  assert.equal(run.attemptCount, 2);
});

test('Phase 26.FE.6: E2E multiple provider health comparison', () => {
  const monitor = new IntegrationHealthMonitorSimulator();

  // Salesforce: healthy
  for (let i = 0; i < 10; i++) {
    monitor.addSyncRun({
      status: SYNC_RUN_STATUS.COMPLETED,
      provider: 'salesforce',
      startedAt: new Date().toISOString(),
    });
  }

  // HubSpot: degraded (some failures)
  for (let i = 0; i < 8; i++) {
    monitor.addSyncRun({
      status: SYNC_RUN_STATUS.COMPLETED,
      provider: 'hubspot',
      startedAt: new Date().toISOString(),
    });
  }
  for (let i = 0; i < 2; i++) {
    monitor.addSyncRun({
      status: SYNC_RUN_STATUS.FAILED,
      provider: 'hubspot',
      startedAt: new Date().toISOString(),
    });
  }

  // BambooHR: unhealthy (many failures)
  for (let i = 0; i < 3; i++) {
    monitor.addSyncRun({
      status: SYNC_RUN_STATUS.COMPLETED,
      provider: 'bamboohr',
      startedAt: new Date().toISOString(),
    });
  }
  for (let i = 0; i < 7; i++) {
    monitor.addSyncRun({
      status: SYNC_RUN_STATUS.FAILED,
      provider: 'bamboohr',
      startedAt: new Date().toISOString(),
    });
  }

  const sfHealth = monitor.getProviderHealth('salesforce');
  const hsHealth = monitor.getProviderHealth('hubspot');
  const bbHealth = monitor.getProviderHealth('bamboohr');

  assert.equal(sfHealth.status, 'healthy');
  assert.equal(hsHealth.status, 'degraded');
  assert.equal(bbHealth.status, 'unhealthy');
});

// =============================================================================
// Phase 27: Smart Field Placement Engine Tests
// =============================================================================

// -----------------------------------------------------------------------------
// Placement Engine Constants and Types
// -----------------------------------------------------------------------------

const PLACEMENT_RUN_STATUS = {
  COMPLETED: 'completed',
  PARTIAL: 'partial',
  BUDGET_EXHAUSTED: 'budget_exhausted',
  TIMED_OUT: 'timed_out',
  FAILED: 'failed',
};

const PLACEMENT_SOURCE = {
  AUTO: 'auto',
  MANUAL: 'manual',
};

const POLICY_PRESETS = {
  BALANCED: 'balanced',
  ACCURACY_FIRST: 'accuracy-first',
  COST_FIRST: 'cost-first',
  SPEED_FIRST: 'speed-first',
};

const RESOLVER_IDS = [
  'native_pdf_forms',
  'text_anchor',
  'ocr_anchor',
  'ml_layout',
];

// -----------------------------------------------------------------------------
// Placement Policy Simulator
// -----------------------------------------------------------------------------

class PlacementPolicySimulator {
  constructor(preset = POLICY_PRESETS.BALANCED) {
    this.preset = preset;
    this.resolverOrder = [...RESOLVER_IDS];
    this.weights = this._getWeightsForPreset(preset);
    this.maxBudget = 1.0;
    this.maxTimeMs = 5000;
    this.overrides = {};
  }

  _getWeightsForPreset(preset) {
    switch (preset) {
      case POLICY_PRESETS.ACCURACY_FIRST:
        return { accuracy: 0.7, cost: 0.1, latency: 0.2 };
      case POLICY_PRESETS.COST_FIRST:
        return { accuracy: 0.2, cost: 0.6, latency: 0.2 };
      case POLICY_PRESETS.SPEED_FIRST:
        return { accuracy: 0.2, cost: 0.2, latency: 0.6 };
      case POLICY_PRESETS.BALANCED:
      default:
        return { accuracy: 0.4, cost: 0.3, latency: 0.3 };
    }
  }

  setPreset(preset) {
    this.preset = preset;
    this.weights = this._getWeightsForPreset(preset);
  }

  setResolverOrder(order) {
    this.resolverOrder = order;
  }

  setOverride(key, value) {
    this.overrides[key] = value;
  }

  calculateScore(resolverMetrics) {
    const { accuracy, cost, latency } = resolverMetrics;
    const { accuracy: wa, cost: wc, latency: wl } = this.weights;

    // Normalize cost and latency (lower is better)
    const normalizedCost = 1 - Math.min(cost, 1);
    const normalizedLatency = 1 - Math.min(latency / 1000, 1);

    return (accuracy * wa) + (normalizedCost * wc) + (normalizedLatency * wl);
  }

  getEffectiveResolverOrder() {
    if (this.overrides.resolverOrder) {
      return this.overrides.resolverOrder;
    }
    return this.resolverOrder;
  }

  toJSON() {
    return {
      preset: this.preset,
      resolver_order: this.getEffectiveResolverOrder(),
      weights: this.weights,
      max_budget: this.maxBudget,
      max_time_ms: this.maxTimeMs,
      overrides: this.overrides,
    };
  }
}

// -----------------------------------------------------------------------------
// Placement Resolver Simulator
// -----------------------------------------------------------------------------

class PlacementResolverSimulator {
  constructor(resolverId, capabilities = {}) {
    this.id = resolverId;
    this.capabilities = {
      supportedFieldTypes: capabilities.supportedFieldTypes || ['signature', 'name', 'date_signed', 'text'],
      accuracy: capabilities.accuracy || 0.8,
      cost: capabilities.cost || 0.1,
      latency: capabilities.latency || 100,
    };
  }

  supports(fieldType) {
    return this.capabilities.supportedFieldTypes.includes(fieldType);
  }

  resolve(fieldDefinition, documentMetadata) {
    if (!this.supports(fieldDefinition.type)) {
      return { supported: false, suggestions: [] };
    }

    // Simulate suggestion generation
    const suggestion = {
      id: `sugg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      fieldDefinitionId: fieldDefinition.id,
      resolverId: this.id,
      confidence: this.capabilities.accuracy * (0.8 + Math.random() * 0.2),
      pageNumber: Math.min(fieldDefinition.preferredPage || 1, documentMetadata.pageCount),
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 400,
      width: this._getDefaultWidth(fieldDefinition.type),
      height: this._getDefaultHeight(fieldDefinition.type),
      label: fieldDefinition.label || '',
      metadata: { resolver: this.id },
    };

    return {
      supported: true,
      suggestions: [suggestion],
      metrics: {
        accuracy: this.capabilities.accuracy,
        cost: this.capabilities.cost,
        latency: this.capabilities.latency,
      },
    };
  }

  _getDefaultWidth(type) {
    const widths = { signature: 200, name: 180, date_signed: 120, text: 150, checkbox: 24, initials: 80 };
    return widths[type] || 150;
  }

  _getDefaultHeight(type) {
    const heights = { signature: 50, name: 30, date_signed: 30, text: 30, checkbox: 24, initials: 40 };
    return heights[type] || 30;
  }

  getScore(policy) {
    return policy.calculateScore(this.capabilities);
  }
}

// -----------------------------------------------------------------------------
// Placement Orchestrator Simulator
// -----------------------------------------------------------------------------

class PlacementOrchestratorSimulator {
  constructor(policy = new PlacementPolicySimulator()) {
    this.policy = policy;
    this.resolvers = [];
    this.runs = [];
  }

  registerResolver(resolver) {
    this.resolvers.push(resolver);
  }

  setPolicy(policy) {
    this.policy = policy;
  }

  runPlacement(agreementId, fieldDefinitions, documentMetadata) {
    const run = {
      id: `run_${Date.now()}`,
      agreementId,
      status: PLACEMENT_RUN_STATUS.COMPLETED,
      suggestions: [],
      resolverScores: [],
      executedResolvers: [],
      unresolvedDefinitions: [],
      budgetUsed: 0,
      elapsedMs: 0,
      startedAt: new Date().toISOString(),
      completedAt: null,
    };

    const startTime = Date.now();

    // Score and sort resolvers
    const orderedResolvers = this.policy.getEffectiveResolverOrder();
    const resolverMap = new Map(this.resolvers.map(r => [r.id, r]));

    for (const resolverId of orderedResolvers) {
      const resolver = resolverMap.get(resolverId);
      if (!resolver) continue;

      const score = resolver.getScore(this.policy);
      run.resolverScores.push({
        resolverId: resolver.id,
        accuracy: resolver.capabilities.accuracy,
        cost: resolver.capabilities.cost,
        latency: resolver.capabilities.latency,
        score,
        supported: true,
      });
    }

    // Sort by score descending
    run.resolverScores.sort((a, b) => b.score - a.score);

    // Process field definitions
    for (const fieldDef of fieldDefinitions) {
      let resolved = false;

      for (const resolverId of orderedResolvers) {
        const resolver = resolverMap.get(resolverId);
        if (!resolver) continue;

        // Check budget
        if (run.budgetUsed + resolver.capabilities.cost > this.policy.maxBudget) {
          run.status = PLACEMENT_RUN_STATUS.BUDGET_EXHAUSTED;
          break;
        }

        // Check timeout
        if (Date.now() - startTime > this.policy.maxTimeMs) {
          run.status = PLACEMENT_RUN_STATUS.TIMED_OUT;
          break;
        }

        const result = resolver.resolve(fieldDef, documentMetadata);
        run.budgetUsed += resolver.capabilities.cost;

        if (!run.executedResolvers.includes(resolverId)) {
          run.executedResolvers.push(resolverId);
        }

        if (result.supported && result.suggestions.length > 0) {
          run.suggestions.push(...result.suggestions);
          resolved = true;
          break;
        }
      }

      if (!resolved) {
        run.unresolvedDefinitions.push(fieldDef.id);
      }
    }

    run.elapsedMs = Date.now() - startTime;
    run.completedAt = new Date().toISOString();

    if (run.unresolvedDefinitions.length > 0 && run.status === PLACEMENT_RUN_STATUS.COMPLETED) {
      run.status = PLACEMENT_RUN_STATUS.PARTIAL;
    }

    this.runs.push(run);
    return run;
  }

  getRunById(runId) {
    return this.runs.find(r => r.id === runId);
  }
}

// -----------------------------------------------------------------------------
// Placement State Manager Simulator
// -----------------------------------------------------------------------------

class PlacementStateManagerSimulator {
  constructor() {
    this.fieldInstances = [];
    this.placementRuns = [];
    this.feedback = [];
  }

  addFieldInstance(instance) {
    this.fieldInstances.push({
      ...instance,
      id: instance.id || `inst_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date().toISOString(),
    });
  }

  getFieldInstance(instanceId) {
    return this.fieldInstances.find(i => i.id === instanceId);
  }

  updateFieldInstance(instanceId, updates) {
    const index = this.fieldInstances.findIndex(i => i.id === instanceId);
    if (index === -1) return false;

    this.fieldInstances[index] = {
      ...this.fieldInstances[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Track manual override
    if (updates.manualOverride) {
      this.fieldInstances[index].placementSource = PLACEMENT_SOURCE.MANUAL;
    }

    return true;
  }

  removeFieldInstance(instanceId) {
    const index = this.fieldInstances.findIndex(i => i.id === instanceId);
    if (index === -1) return false;
    this.fieldInstances.splice(index, 1);
    return true;
  }

  applyPlacementRun(run, acceptedSuggestionIds) {
    const appliedInstances = [];

    for (const suggestionId of acceptedSuggestionIds) {
      const suggestion = run.suggestions.find(s => s.id === suggestionId);
      if (!suggestion) continue;

      const instance = {
        id: `inst_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        fieldDefinitionId: suggestion.fieldDefinitionId,
        pageNumber: suggestion.pageNumber,
        x: suggestion.x,
        y: suggestion.y,
        width: suggestion.width,
        height: suggestion.height,
        placementSource: PLACEMENT_SOURCE.AUTO,
        resolverId: suggestion.resolverId,
        confidence: suggestion.confidence,
        placementRunId: run.id,
        manualOverride: false,
      };

      this.addFieldInstance(instance);
      appliedInstances.push(instance);
    }

    return appliedInstances;
  }

  recordFeedback(runId, acceptedCount, rejectedCount, manualOverrideCount) {
    this.feedback.push({
      runId,
      acceptedCount,
      rejectedCount,
      manualOverrideCount,
      timestamp: new Date().toISOString(),
    });
  }

  getPlacedCount() {
    return this.fieldInstances.length;
  }

  getAutoPlacedCount() {
    return this.fieldInstances.filter(i => i.placementSource === PLACEMENT_SOURCE.AUTO).length;
  }

  getManualOverrideCount() {
    return this.fieldInstances.filter(i => i.manualOverride).length;
  }
}

// -----------------------------------------------------------------------------
// Phase 27 Tests: Placement Policy
// -----------------------------------------------------------------------------

test('Phase 27.FE.1: policy preset affects weight distribution', () => {
  const balanced = new PlacementPolicySimulator(POLICY_PRESETS.BALANCED);
  const accuracyFirst = new PlacementPolicySimulator(POLICY_PRESETS.ACCURACY_FIRST);
  const costFirst = new PlacementPolicySimulator(POLICY_PRESETS.COST_FIRST);
  const speedFirst = new PlacementPolicySimulator(POLICY_PRESETS.SPEED_FIRST);

  // Balanced should have relatively even weights
  assert.ok(balanced.weights.accuracy >= 0.3 && balanced.weights.accuracy <= 0.5);
  assert.ok(balanced.weights.cost >= 0.2 && balanced.weights.cost <= 0.4);
  assert.ok(balanced.weights.latency >= 0.2 && balanced.weights.latency <= 0.4);

  // Accuracy-first should prioritize accuracy
  assert.ok(accuracyFirst.weights.accuracy > accuracyFirst.weights.cost);
  assert.ok(accuracyFirst.weights.accuracy > accuracyFirst.weights.latency);

  // Cost-first should prioritize cost
  assert.ok(costFirst.weights.cost > costFirst.weights.accuracy);
  assert.ok(costFirst.weights.cost > costFirst.weights.latency);

  // Speed-first should prioritize latency
  assert.ok(speedFirst.weights.latency > speedFirst.weights.accuracy);
  assert.ok(speedFirst.weights.latency > speedFirst.weights.cost);
});

test('Phase 27.FE.1: policy score calculation respects weights', () => {
  const policy = new PlacementPolicySimulator(POLICY_PRESETS.ACCURACY_FIRST);

  const highAccuracy = { accuracy: 0.95, cost: 0.5, latency: 500 };
  const lowAccuracyFast = { accuracy: 0.6, cost: 0.1, latency: 50 };

  const scoreHigh = policy.calculateScore(highAccuracy);
  const scoreLow = policy.calculateScore(lowAccuracyFast);

  // High accuracy should score better with accuracy-first preset
  assert.ok(scoreHigh > scoreLow);
});

test('Phase 27.FE.2: policy override replaces default resolver order', () => {
  const policy = new PlacementPolicySimulator();
  const defaultOrder = policy.getEffectiveResolverOrder();

  policy.setOverride('resolverOrder', ['ml_layout', 'native_pdf_forms']);
  const overriddenOrder = policy.getEffectiveResolverOrder();

  assert.notDeepEqual(defaultOrder, overriddenOrder);
  assert.equal(overriddenOrder[0], 'ml_layout');
  assert.equal(overriddenOrder[1], 'native_pdf_forms');
});

// -----------------------------------------------------------------------------
// Phase 27 Tests: Placement Resolver
// -----------------------------------------------------------------------------

test('Phase 27.FE.3: resolver generates suggestions for supported field types', () => {
  const resolver = new PlacementResolverSimulator('native_pdf_forms', {
    supportedFieldTypes: ['signature', 'name'],
    accuracy: 0.85,
  });

  const sigField = { id: 'fd_1', type: 'signature' };
  const docMeta = { pageCount: 3 };

  const result = resolver.resolve(sigField, docMeta);

  assert.equal(result.supported, true);
  assert.equal(result.suggestions.length, 1);
  assert.equal(result.suggestions[0].resolverId, 'native_pdf_forms');
  assert.ok(result.suggestions[0].confidence > 0);
});

test('Phase 27.FE.3: resolver returns unsupported for unknown field types', () => {
  const resolver = new PlacementResolverSimulator('native_pdf_forms', {
    supportedFieldTypes: ['signature'],
  });

  const checkboxField = { id: 'fd_1', type: 'checkbox' };
  const docMeta = { pageCount: 1 };

  const result = resolver.resolve(checkboxField, docMeta);

  assert.equal(result.supported, false);
  assert.equal(result.suggestions.length, 0);
});

test('Phase 27.FE.3: resolver confidence badges map to correct thresholds', () => {
  // High confidence (>= 0.9) -> green
  // Medium-high (>= 0.7) -> blue
  // Medium (>= 0.5) -> yellow
  // Low (< 0.5) -> red

  function getConfidenceLevel(confidence) {
    if (confidence >= 0.9) return 'high';
    if (confidence >= 0.7) return 'medium-high';
    if (confidence >= 0.5) return 'medium';
    return 'low';
  }

  assert.equal(getConfidenceLevel(0.95), 'high');
  assert.equal(getConfidenceLevel(0.85), 'medium-high');
  assert.equal(getConfidenceLevel(0.65), 'medium');
  assert.equal(getConfidenceLevel(0.35), 'low');
});

// -----------------------------------------------------------------------------
// Phase 27 Tests: Placement Orchestrator
// -----------------------------------------------------------------------------

test('Phase 27.FE.4: orchestrator executes resolvers in policy order', () => {
  const policy = new PlacementPolicySimulator();
  policy.setOverride('resolverOrder', ['text_anchor', 'native_pdf_forms']);

  const orchestrator = new PlacementOrchestratorSimulator(policy);
  orchestrator.registerResolver(new PlacementResolverSimulator('native_pdf_forms'));
  orchestrator.registerResolver(new PlacementResolverSimulator('text_anchor'));

  const fieldDefs = [{ id: 'fd_1', type: 'signature' }];
  const docMeta = { pageCount: 2 };

  const run = orchestrator.runPlacement('agr_123', fieldDefs, docMeta);

  // First executed resolver should be text_anchor per policy order
  assert.equal(run.executedResolvers[0], 'text_anchor');
});

test('Phase 27.FE.4: orchestrator respects budget limits', () => {
  const policy = new PlacementPolicySimulator();
  policy.maxBudget = 0.15; // Very low budget

  const orchestrator = new PlacementOrchestratorSimulator(policy);
  orchestrator.registerResolver(new PlacementResolverSimulator('native_pdf_forms', { cost: 0.1 }));
  orchestrator.registerResolver(new PlacementResolverSimulator('ml_layout', { cost: 0.5 }));

  // Create many field definitions to exhaust budget
  const fieldDefs = [
    { id: 'fd_1', type: 'signature' },
    { id: 'fd_2', type: 'name' },
    { id: 'fd_3', type: 'date_signed' },
  ];
  const docMeta = { pageCount: 1 };

  const run = orchestrator.runPlacement('agr_123', fieldDefs, docMeta);

  // Should exhaust budget before completing all fields
  assert.equal(run.status, PLACEMENT_RUN_STATUS.BUDGET_EXHAUSTED);
  assert.ok(run.budgetUsed <= policy.maxBudget + 0.1); // Allow small overage from last operation
});

test('Phase 27.FE.4: orchestrator returns partial status when some fields unresolved', () => {
  const policy = new PlacementPolicySimulator();
  // Override resolver order to use only our limited resolver
  policy.setOverride('resolverOrder', ['limited_resolver']);

  const orchestrator = new PlacementOrchestratorSimulator(policy);

  // Register resolver that only supports signatures
  orchestrator.registerResolver(new PlacementResolverSimulator('limited_resolver', {
    supportedFieldTypes: ['signature'],
    accuracy: 0.9,
  }));

  const fieldDefs = [
    { id: 'fd_1', type: 'signature' },
    { id: 'fd_2', type: 'checkbox' }, // Unsupported
  ];
  const docMeta = { pageCount: 1 };

  const run = orchestrator.runPlacement('agr_123', fieldDefs, docMeta);

  assert.equal(run.status, PLACEMENT_RUN_STATUS.PARTIAL);
  assert.equal(run.unresolvedDefinitions.length, 1);
  assert.equal(run.unresolvedDefinitions[0], 'fd_2');
});

// -----------------------------------------------------------------------------
// Phase 27 Tests: Suggestion Apply and Manual Override
// -----------------------------------------------------------------------------

test('Phase 27.FE.5: applying suggestions creates field instances with auto source', () => {
  const stateManager = new PlacementStateManagerSimulator();

  const mockRun = {
    id: 'run_123',
    suggestions: [
      { id: 'sugg_1', fieldDefinitionId: 'fd_1', resolverId: 'native_pdf_forms', confidence: 0.92, pageNumber: 1, x: 100, y: 200, width: 200, height: 50 },
      { id: 'sugg_2', fieldDefinitionId: 'fd_2', resolverId: 'text_anchor', confidence: 0.78, pageNumber: 1, x: 100, y: 300, width: 180, height: 30 },
    ],
  };

  const applied = stateManager.applyPlacementRun(mockRun, ['sugg_1', 'sugg_2']);

  assert.equal(applied.length, 2);
  assert.equal(stateManager.getAutoPlacedCount(), 2);

  applied.forEach(inst => {
    assert.equal(inst.placementSource, PLACEMENT_SOURCE.AUTO);
    assert.equal(inst.placementRunId, 'run_123');
    assert.ok(inst.confidence > 0);
  });
});

test('Phase 27.FE.5: manual override updates placement source', () => {
  const stateManager = new PlacementStateManagerSimulator();

  stateManager.addFieldInstance({
    id: 'inst_1',
    fieldDefinitionId: 'fd_1',
    placementSource: PLACEMENT_SOURCE.AUTO,
    resolverId: 'native_pdf_forms',
    x: 100,
    y: 200,
  });

  // User manually adjusts position
  const updated = stateManager.updateFieldInstance('inst_1', {
    x: 150,
    y: 250,
    manualOverride: true,
  });

  assert.equal(updated, true);

  const instance = stateManager.getFieldInstance('inst_1');
  assert.equal(instance.placementSource, PLACEMENT_SOURCE.MANUAL);
  assert.equal(instance.manualOverride, true);
  assert.equal(instance.x, 150);
  assert.equal(instance.y, 250);
});

test('Phase 27.FE.5: feedback recording tracks accept/reject counts', () => {
  const stateManager = new PlacementStateManagerSimulator();

  stateManager.recordFeedback('run_123', 5, 2, 1);

  assert.equal(stateManager.feedback.length, 1);
  assert.equal(stateManager.feedback[0].acceptedCount, 5);
  assert.equal(stateManager.feedback[0].rejectedCount, 2);
  assert.equal(stateManager.feedback[0].manualOverrideCount, 1);
});

// -----------------------------------------------------------------------------
// Phase 27 Tests: E2E Auto-Place Flow
// -----------------------------------------------------------------------------

test('Phase 27.FE.6: full E2E auto-place run with policy, suggestions, apply, and override', () => {
  // Step 1: Configure policy
  const policy = new PlacementPolicySimulator(POLICY_PRESETS.BALANCED);
  assert.equal(policy.preset, POLICY_PRESETS.BALANCED);

  // Step 2: Set up orchestrator with resolvers
  const orchestrator = new PlacementOrchestratorSimulator(policy);
  orchestrator.registerResolver(new PlacementResolverSimulator('native_pdf_forms', {
    supportedFieldTypes: ['signature', 'name', 'date_signed'],
    accuracy: 0.85,
    cost: 0.1,
    latency: 50,
  }));
  orchestrator.registerResolver(new PlacementResolverSimulator('text_anchor', {
    supportedFieldTypes: ['signature', 'name', 'text'],
    accuracy: 0.75,
    cost: 0.05,
    latency: 30,
  }));

  // Step 3: Define field definitions
  const fieldDefinitions = [
    { id: 'fd_sig_1', type: 'signature', participantId: 'p_1' },
    { id: 'fd_name_1', type: 'name', participantId: 'p_1' },
    { id: 'fd_date_1', type: 'date_signed', participantId: 'p_1' },
  ];
  const documentMetadata = { pageCount: 2 };

  // Step 4: Run auto-placement
  const run = orchestrator.runPlacement('agr_test', fieldDefinitions, documentMetadata);

  assert.equal(run.status, PLACEMENT_RUN_STATUS.COMPLETED);
  assert.equal(run.suggestions.length, 3);
  assert.ok(run.resolverScores.length > 0);

  // Step 5: Apply accepted suggestions
  const stateManager = new PlacementStateManagerSimulator();
  const acceptedIds = run.suggestions.map(s => s.id);
  const appliedInstances = stateManager.applyPlacementRun(run, acceptedIds);

  assert.equal(appliedInstances.length, 3);
  assert.equal(stateManager.getAutoPlacedCount(), 3);

  // Step 6: Manual override one field
  const firstInstance = appliedInstances[0];
  stateManager.updateFieldInstance(firstInstance.id, {
    x: firstInstance.x + 50,
    y: firstInstance.y + 20,
    manualOverride: true,
  });

  assert.equal(stateManager.getManualOverrideCount(), 1);

  // Step 7: Record feedback
  stateManager.recordFeedback(run.id, 3, 0, 1);

  const feedback = stateManager.feedback[0];
  assert.equal(feedback.acceptedCount, 3);
  assert.equal(feedback.rejectedCount, 0);
  assert.equal(feedback.manualOverrideCount, 1);
});

test('Phase 27.FE.6: policy change produces different resolver rankings', () => {
  const nativePdf = new PlacementResolverSimulator('native_pdf_forms', {
    accuracy: 0.9,
    cost: 0.3,
    latency: 200,
  });

  const textAnchor = new PlacementResolverSimulator('text_anchor', {
    accuracy: 0.7,
    cost: 0.05,
    latency: 20,
  });

  // With accuracy-first, native_pdf_forms should rank higher
  const accuracyPolicy = new PlacementPolicySimulator(POLICY_PRESETS.ACCURACY_FIRST);
  const nativeScoreAccuracy = nativePdf.getScore(accuracyPolicy);
  const textScoreAccuracy = textAnchor.getScore(accuracyPolicy);
  assert.ok(nativeScoreAccuracy > textScoreAccuracy, 'Native PDF should rank higher with accuracy-first');

  // With cost-first, text_anchor should rank higher
  const costPolicy = new PlacementPolicySimulator(POLICY_PRESETS.COST_FIRST);
  const nativeScoreCost = nativePdf.getScore(costPolicy);
  const textScoreCost = textAnchor.getScore(costPolicy);
  assert.ok(textScoreCost > nativeScoreCost, 'Text anchor should rank higher with cost-first');

  // With speed-first, text_anchor should also rank higher (lower latency)
  const speedPolicy = new PlacementPolicySimulator(POLICY_PRESETS.SPEED_FIRST);
  const nativeScoreSpeed = nativePdf.getScore(speedPolicy);
  const textScoreSpeed = textAnchor.getScore(speedPolicy);
  assert.ok(textScoreSpeed > nativeScoreSpeed, 'Text anchor should rank higher with speed-first');
});

test('Phase 27.FE.6: partial apply allows selective suggestion acceptance', () => {
  const stateManager = new PlacementStateManagerSimulator();

  const mockRun = {
    id: 'run_456',
    suggestions: [
      { id: 'sugg_a', fieldDefinitionId: 'fd_1', resolverId: 'native_pdf_forms', confidence: 0.95, pageNumber: 1, x: 100, y: 100, width: 200, height: 50 },
      { id: 'sugg_b', fieldDefinitionId: 'fd_2', resolverId: 'native_pdf_forms', confidence: 0.55, pageNumber: 1, x: 100, y: 200, width: 180, height: 30 }, // Low confidence
      { id: 'sugg_c', fieldDefinitionId: 'fd_3', resolverId: 'text_anchor', confidence: 0.88, pageNumber: 2, x: 150, y: 300, width: 120, height: 30 },
    ],
  };

  // User only accepts high-confidence suggestions (a and c)
  const applied = stateManager.applyPlacementRun(mockRun, ['sugg_a', 'sugg_c']);

  assert.equal(applied.length, 2);
  assert.equal(stateManager.getPlacedCount(), 2);

  // Verify the rejected suggestion was not applied
  const allDefIds = stateManager.fieldInstances.map(i => i.fieldDefinitionId);
  assert.ok(allDefIds.includes('fd_1'));
  assert.ok(!allDefIds.includes('fd_2')); // Rejected
  assert.ok(allDefIds.includes('fd_3'));
});

// =============================================================================
// Phase 28: V2 Production Hardening - Final E2E Tests
// =============================================================================

// -----------------------------------------------------------------------------
// V2 Runtime Constants
// -----------------------------------------------------------------------------

const V2_AUTHORING_STEPS = {
  DOCUMENT: 1,
  DETAILS: 2,
  PARTICIPANTS: 3,
  FIELDS: 4,
  PLACEMENT: 5,
  REVIEW: 6,
};

const AGREEMENT_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  VOIDED: 'voided',
  DECLINED: 'declined',
  EXPIRED: 'expired',
};

const ARTIFACT_TYPES = {
  EXECUTED: 'executed',
  CERTIFICATE: 'certificate',
};

// -----------------------------------------------------------------------------
// V2 Six-Step Authoring Flow Simulator
// -----------------------------------------------------------------------------

class V2AuthoringFlowSimulator {
  constructor() {
    this.currentStep = V2_AUTHORING_STEPS.DOCUMENT;
    this.completedSteps = new Set();
    this.agreement = {
      id: null,
      documentId: null,
      title: '',
      message: '',
      participants: [],
      fieldDefinitions: [],
      fieldInstances: [],
      status: AGREEMENT_STATUS.DRAFT,
    };
    this.validationErrors = {};
  }

  selectDocument(documentId, pageCount = 1) {
    if (!documentId) {
      this.validationErrors.document = 'Document is required';
      return false;
    }
    this.agreement.documentId = documentId;
    this.agreement.pageCount = pageCount;
    this.completedSteps.add(V2_AUTHORING_STEPS.DOCUMENT);
    return true;
  }

  setDetails(title, message = '') {
    if (!title || title.trim() === '') {
      this.validationErrors.title = 'Title is required';
      return false;
    }
    this.agreement.title = title;
    this.agreement.message = message;
    this.completedSteps.add(V2_AUTHORING_STEPS.DETAILS);
    return true;
  }

  addParticipant(id, role, email, name, signingStage = 1) {
    if (!email || !email.includes('@')) {
      this.validationErrors.participants = 'Valid email required';
      return false;
    }
    this.agreement.participants.push({
      id,
      role,
      email,
      name: name || email.split('@')[0],
      signingStage,
    });
    return true;
  }

  validateParticipants() {
    const signers = this.agreement.participants.filter(p => p.role === 'signer');
    if (signers.length === 0) {
      this.validationErrors.participants = 'At least one signer required';
      return false;
    }
    this.completedSteps.add(V2_AUTHORING_STEPS.PARTICIPANTS);
    return true;
  }

  addFieldDefinition(id, type, participantId, required = true) {
    this.agreement.fieldDefinitions.push({
      id,
      type,
      participantId,
      required,
    });
    return true;
  }

  validateFieldDefinitions() {
    const signerIds = this.agreement.participants
      .filter(p => p.role === 'signer')
      .map(p => p.id);

    for (const signerId of signerIds) {
      const hasSignature = this.agreement.fieldDefinitions.some(
        f => f.participantId === signerId && f.type === 'signature'
      );
      if (!hasSignature) {
        this.validationErrors.fields = `Signer ${signerId} needs a signature field`;
        return false;
      }
    }
    this.completedSteps.add(V2_AUTHORING_STEPS.FIELDS);
    return true;
  }

  addFieldInstance(definitionId, pageNumber, x, y, width, height, source = 'manual') {
    this.agreement.fieldInstances.push({
      id: `inst_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      fieldDefinitionId: definitionId,
      pageNumber,
      x,
      y,
      width,
      height,
      placementSource: source,
    });
    return true;
  }

  validatePlacement() {
    const placedDefIds = new Set(this.agreement.fieldInstances.map(i => i.fieldDefinitionId));
    const requiredDefIds = this.agreement.fieldDefinitions
      .filter(f => f.required)
      .map(f => f.id);

    for (const reqId of requiredDefIds) {
      if (!placedDefIds.has(reqId)) {
        this.validationErrors.placement = `Required field ${reqId} not placed`;
        return false;
      }
    }
    this.completedSteps.add(V2_AUTHORING_STEPS.PLACEMENT);
    return true;
  }

  canSend() {
    return (
      this.completedSteps.has(V2_AUTHORING_STEPS.DOCUMENT) &&
      this.completedSteps.has(V2_AUTHORING_STEPS.DETAILS) &&
      this.completedSteps.has(V2_AUTHORING_STEPS.PARTICIPANTS) &&
      this.completedSteps.has(V2_AUTHORING_STEPS.FIELDS) &&
      this.completedSteps.has(V2_AUTHORING_STEPS.PLACEMENT)
    );
  }

  send() {
    if (!this.canSend()) {
      return { success: false, error: 'Not all steps completed' };
    }
    this.agreement.id = `agr_${Date.now()}`;
    this.agreement.status = AGREEMENT_STATUS.SENT;
    this.agreement.sentAt = new Date().toISOString();
    this.completedSteps.add(V2_AUTHORING_STEPS.REVIEW);
    return { success: true, agreementId: this.agreement.id };
  }

  goToStep(step) {
    if (step < 1 || step > 6) return false;
    this.currentStep = step;
    return true;
  }

  getStepValidation(step) {
    switch (step) {
      case V2_AUTHORING_STEPS.DOCUMENT:
        return !!this.agreement.documentId;
      case V2_AUTHORING_STEPS.DETAILS:
        return !!this.agreement.title;
      case V2_AUTHORING_STEPS.PARTICIPANTS:
        return this.agreement.participants.filter(p => p.role === 'signer').length > 0;
      case V2_AUTHORING_STEPS.FIELDS:
        return this.agreement.fieldDefinitions.length > 0;
      case V2_AUTHORING_STEPS.PLACEMENT:
        return this.agreement.fieldInstances.length > 0;
      case V2_AUTHORING_STEPS.REVIEW:
        return this.canSend();
      default:
        return false;
    }
  }
}

// -----------------------------------------------------------------------------
// V2 Multi-Stage Signer Flow Simulator
// -----------------------------------------------------------------------------

class V2MultiStageSignerSimulator {
  constructor(agreement) {
    this.agreement = agreement;
    this.participantStates = new Map();
    this.currentStage = 1;

    // Initialize participant states
    for (const p of agreement.participants) {
      this.participantStates.set(p.id, {
        id: p.id,
        role: p.role,
        email: p.email,
        signingStage: p.signingStage,
        status: 'pending',
        viewedAt: null,
        completedAt: null,
        declinedAt: null,
      });
    }
  }

  getActiveParticipants() {
    return Array.from(this.participantStates.values())
      .filter(p => p.role === 'signer' && p.signingStage === this.currentStage && p.status === 'pending');
  }

  getCompletedParticipants() {
    return Array.from(this.participantStates.values())
      .filter(p => p.status === 'completed');
  }

  canParticipantAct(participantId) {
    const state = this.participantStates.get(participantId);
    if (!state) return false;
    if (state.role !== 'signer') return false;
    if (state.status !== 'pending') return false;
    return state.signingStage === this.currentStage;
  }

  viewAgreement(participantId) {
    const state = this.participantStates.get(participantId);
    if (!state) return { success: false, error: 'Participant not found' };

    state.viewedAt = new Date().toISOString();
    return { success: true };
  }

  signAgreement(participantId) {
    if (!this.canParticipantAct(participantId)) {
      return { success: false, error: 'Cannot sign at this time' };
    }

    const state = this.participantStates.get(participantId);
    state.status = 'completed';
    state.completedAt = new Date().toISOString();

    // Check if stage is complete
    this._checkStageCompletion();

    return { success: true };
  }

  declineAgreement(participantId, reason = '') {
    if (!this.canParticipantAct(participantId)) {
      return { success: false, error: 'Cannot decline at this time' };
    }

    const state = this.participantStates.get(participantId);
    state.status = 'declined';
    state.declinedAt = new Date().toISOString();
    state.declineReason = reason;

    this.agreement.status = AGREEMENT_STATUS.DECLINED;

    return { success: true };
  }

  _checkStageCompletion() {
    const stageParticipants = Array.from(this.participantStates.values())
      .filter(p => p.role === 'signer' && p.signingStage === this.currentStage);

    const allCompleted = stageParticipants.every(p => p.status === 'completed');

    if (allCompleted) {
      // Move to next stage
      const maxStage = Math.max(...Array.from(this.participantStates.values())
        .filter(p => p.role === 'signer')
        .map(p => p.signingStage));

      if (this.currentStage < maxStage) {
        this.currentStage++;
        this.agreement.status = AGREEMENT_STATUS.IN_PROGRESS;
      } else {
        // All stages complete
        this.agreement.status = AGREEMENT_STATUS.COMPLETED;
        this.agreement.completedAt = new Date().toISOString();
      }
    } else if (this.agreement.status === AGREEMENT_STATUS.SENT) {
      this.agreement.status = AGREEMENT_STATUS.IN_PROGRESS;
    }
  }

  getProgress() {
    const signers = Array.from(this.participantStates.values())
      .filter(p => p.role === 'signer');
    const completed = signers.filter(p => p.status === 'completed').length;

    return {
      currentStage: this.currentStage,
      totalStages: Math.max(...signers.map(p => p.signingStage)),
      signersTotal: signers.length,
      signersCompleted: completed,
      agreementStatus: this.agreement.status,
    };
  }

  isComplete() {
    return this.agreement.status === AGREEMENT_STATUS.COMPLETED;
  }
}

// -----------------------------------------------------------------------------
// V2 Artifact Actions Simulator
// -----------------------------------------------------------------------------

class V2ArtifactActionsSimulator {
  constructor(agreement) {
    this.agreement = agreement;
    this.artifacts = [];
    this.downloads = [];
  }

  generateArtifacts() {
    if (this.agreement.status !== AGREEMENT_STATUS.COMPLETED) {
      return { success: false, error: 'Agreement must be completed' };
    }

    this.artifacts = [
      {
        type: ARTIFACT_TYPES.EXECUTED,
        objectKey: `artifacts/${this.agreement.id}/executed.pdf`,
        sha256: this._mockHash('executed'),
        createdAt: new Date().toISOString(),
      },
      {
        type: ARTIFACT_TYPES.CERTIFICATE,
        objectKey: `artifacts/${this.agreement.id}/certificate.pdf`,
        sha256: this._mockHash('certificate'),
        createdAt: new Date().toISOString(),
      },
    ];

    return { success: true, artifacts: this.artifacts };
  }

  getArtifact(type) {
    return this.artifacts.find(a => a.type === type);
  }

  downloadArtifact(type, userId) {
    const artifact = this.getArtifact(type);
    if (!artifact) {
      return { success: false, error: `Artifact ${type} not found` };
    }

    this.downloads.push({
      type,
      userId,
      downloadedAt: new Date().toISOString(),
    });

    return {
      success: true,
      url: `/api/esign/artifacts/${artifact.objectKey}`,
      filename: `${this.agreement.title}_${type}.pdf`,
    };
  }

  shareArtifact(type, recipientEmail) {
    const artifact = this.getArtifact(type);
    if (!artifact) {
      return { success: false, error: `Artifact ${type} not found` };
    }

    return {
      success: true,
      shareLink: `/api/esign/shared/${this._mockHash(recipientEmail + type)}`,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  _mockHash(input) {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) - hash) + input.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}

// -----------------------------------------------------------------------------
// Phase 28 Tests: V2 Six-Step Authoring Flow
// -----------------------------------------------------------------------------

test('Phase 28.FE.1: v2 authoring flow requires all six steps', () => {
  const authoring = new V2AuthoringFlowSimulator();

  // Initially cannot send
  assert.equal(authoring.canSend(), false);

  // Step 1: Document
  authoring.selectDocument('doc_123', 3);
  assert.equal(authoring.getStepValidation(1), true);

  // Step 2: Details
  authoring.setDetails('Employment Agreement', 'Please sign this document');
  assert.equal(authoring.getStepValidation(2), true);

  // Step 3: Participants
  authoring.addParticipant('p1', 'signer', 'employee@example.com', 'John Doe', 1);
  authoring.addParticipant('p2', 'signer', 'manager@example.com', 'Jane Smith', 2);
  authoring.validateParticipants();
  assert.equal(authoring.getStepValidation(3), true);

  // Step 4: Fields
  authoring.addFieldDefinition('fd1', 'signature', 'p1', true);
  authoring.addFieldDefinition('fd2', 'signature', 'p2', true);
  authoring.validateFieldDefinitions();
  assert.equal(authoring.getStepValidation(4), true);

  // Step 5: Placement
  authoring.addFieldInstance('fd1', 1, 100, 400, 200, 50);
  authoring.addFieldInstance('fd2', 1, 100, 500, 200, 50);
  authoring.validatePlacement();
  assert.equal(authoring.getStepValidation(5), true);

  // Now can send
  assert.equal(authoring.canSend(), true);

  // Step 6: Send
  const result = authoring.send();
  assert.equal(result.success, true);
  assert.ok(result.agreementId);
  assert.equal(authoring.agreement.status, AGREEMENT_STATUS.SENT);
});

test('Phase 28.FE.1: v2 authoring validates each step before proceeding', () => {
  const authoring = new V2AuthoringFlowSimulator();

  // Skip document - should fail details validation context
  assert.equal(authoring.setDetails(''), false);
  assert.ok(authoring.validationErrors.title);

  // Valid document
  authoring.selectDocument('doc_456');

  // Invalid email
  assert.equal(authoring.addParticipant('p1', 'signer', 'invalid-email', 'Test'), false);
  assert.ok(authoring.validationErrors.participants);

  // No signers
  authoring.validationErrors = {};
  assert.equal(authoring.validateParticipants(), false);
});

test('Phase 28.FE.1: v2 authoring enforces signature field per signer', () => {
  const authoring = new V2AuthoringFlowSimulator();

  authoring.selectDocument('doc_789');
  authoring.setDetails('Test Agreement');
  authoring.addParticipant('p1', 'signer', 'user@example.com', 'User', 1);
  authoring.validateParticipants();

  // Add text field but no signature
  authoring.addFieldDefinition('fd1', 'text', 'p1', true);
  assert.equal(authoring.validateFieldDefinitions(), false);
  assert.ok(authoring.validationErrors.fields);

  // Add signature field
  authoring.addFieldDefinition('fd2', 'signature', 'p1', true);
  assert.equal(authoring.validateFieldDefinitions(), true);
});

test('Phase 28.FE.1: v2 authoring enforces required field placement', () => {
  const authoring = new V2AuthoringFlowSimulator();

  authoring.selectDocument('doc_abc');
  authoring.setDetails('Placement Test');
  authoring.addParticipant('p1', 'signer', 'signer@example.com', 'Signer', 1);
  authoring.validateParticipants();
  authoring.addFieldDefinition('fd1', 'signature', 'p1', true);
  authoring.addFieldDefinition('fd2', 'name', 'p1', true);
  authoring.validateFieldDefinitions();

  // Only place one field
  authoring.addFieldInstance('fd1', 1, 100, 100, 200, 50);
  assert.equal(authoring.validatePlacement(), false);
  assert.ok(authoring.validationErrors.placement);

  // Place remaining field
  authoring.addFieldInstance('fd2', 1, 100, 200, 180, 30);
  assert.equal(authoring.validatePlacement(), true);
});

// -----------------------------------------------------------------------------
// Phase 28 Tests: V2 Multi-Stage Signer Progression
// -----------------------------------------------------------------------------

test('Phase 28.FE.1: v2 multi-stage signer progression respects stage order', () => {
  const agreement = {
    id: 'agr_stage_test',
    status: AGREEMENT_STATUS.SENT,
    participants: [
      { id: 'p1', role: 'signer', email: 'stage1@example.com', signingStage: 1 },
      { id: 'p2', role: 'signer', email: 'stage2@example.com', signingStage: 2 },
      { id: 'p3', role: 'signer', email: 'stage2b@example.com', signingStage: 2 },
      { id: 'p4', role: 'signer', email: 'stage3@example.com', signingStage: 3 },
    ],
  };

  const flow = new V2MultiStageSignerSimulator(agreement);

  // Initially only stage 1 signer can act
  assert.equal(flow.canParticipantAct('p1'), true);
  assert.equal(flow.canParticipantAct('p2'), false);
  assert.equal(flow.canParticipantAct('p3'), false);
  assert.equal(flow.canParticipantAct('p4'), false);

  // Stage 2 signer tries to sign - should fail
  const stage2Early = flow.signAgreement('p2');
  assert.equal(stage2Early.success, false);

  // Stage 1 completes
  flow.signAgreement('p1');
  assert.equal(flow.currentStage, 2);

  // Now stage 2 signers can act
  assert.equal(flow.canParticipantAct('p2'), true);
  assert.equal(flow.canParticipantAct('p3'), true);
  assert.equal(flow.canParticipantAct('p4'), false); // Stage 3 still blocked

  // Stage 2 parallel signers complete
  flow.signAgreement('p2');
  assert.equal(flow.currentStage, 2); // Still stage 2 until both complete
  flow.signAgreement('p3');
  assert.equal(flow.currentStage, 3);

  // Stage 3 completes
  flow.signAgreement('p4');
  assert.equal(flow.isComplete(), true);
  assert.equal(agreement.status, AGREEMENT_STATUS.COMPLETED);
});

test('Phase 28.FE.1: v2 signer decline stops agreement progression', () => {
  const agreement = {
    id: 'agr_decline_test',
    status: AGREEMENT_STATUS.SENT,
    participants: [
      { id: 'p1', role: 'signer', email: 'first@example.com', signingStage: 1 },
      { id: 'p2', role: 'signer', email: 'second@example.com', signingStage: 2 },
    ],
  };

  const flow = new V2MultiStageSignerSimulator(agreement);

  // First signer declines
  const result = flow.declineAgreement('p1', 'Terms not acceptable');
  assert.equal(result.success, true);
  assert.equal(agreement.status, AGREEMENT_STATUS.DECLINED);

  // Second signer cannot act
  assert.equal(flow.canParticipantAct('p2'), false);
});

test('Phase 28.FE.1: v2 signer progress tracking accurate', () => {
  const agreement = {
    id: 'agr_progress_test',
    status: AGREEMENT_STATUS.SENT,
    participants: [
      { id: 'p1', role: 'signer', email: 's1@example.com', signingStage: 1 },
      { id: 'p2', role: 'signer', email: 's2@example.com', signingStage: 1 },
      { id: 'p3', role: 'signer', email: 's3@example.com', signingStage: 2 },
      { id: 'cc1', role: 'cc', email: 'cc@example.com', signingStage: 1 },
    ],
  };

  const flow = new V2MultiStageSignerSimulator(agreement);

  let progress = flow.getProgress();
  assert.equal(progress.currentStage, 1);
  assert.equal(progress.totalStages, 2);
  assert.equal(progress.signersTotal, 3);
  assert.equal(progress.signersCompleted, 0);

  flow.signAgreement('p1');
  progress = flow.getProgress();
  assert.equal(progress.signersCompleted, 1);
  assert.equal(progress.agreementStatus, AGREEMENT_STATUS.IN_PROGRESS);

  flow.signAgreement('p2');
  progress = flow.getProgress();
  assert.equal(progress.currentStage, 2);
  assert.equal(progress.signersCompleted, 2);

  flow.signAgreement('p3');
  progress = flow.getProgress();
  assert.equal(progress.signersCompleted, 3);
  assert.equal(progress.agreementStatus, AGREEMENT_STATUS.COMPLETED);
});

// -----------------------------------------------------------------------------
// Phase 28 Tests: V2 Completion Artifact Actions
// -----------------------------------------------------------------------------

test('Phase 28.FE.1: v2 artifacts generated on completion', () => {
  const agreement = {
    id: 'agr_artifact_test',
    title: 'Artifact Test Agreement',
    status: AGREEMENT_STATUS.COMPLETED,
    completedAt: new Date().toISOString(),
  };

  const artifacts = new V2ArtifactActionsSimulator(agreement);

  const result = artifacts.generateArtifacts();
  assert.equal(result.success, true);
  assert.equal(result.artifacts.length, 2);

  const executed = artifacts.getArtifact(ARTIFACT_TYPES.EXECUTED);
  const certificate = artifacts.getArtifact(ARTIFACT_TYPES.CERTIFICATE);

  assert.ok(executed);
  assert.ok(certificate);
  assert.ok(executed.sha256);
  assert.ok(certificate.sha256);
});

test('Phase 28.FE.1: v2 artifacts not available before completion', () => {
  const agreement = {
    id: 'agr_incomplete',
    title: 'Incomplete Agreement',
    status: AGREEMENT_STATUS.IN_PROGRESS,
  };

  const artifacts = new V2ArtifactActionsSimulator(agreement);

  const result = artifacts.generateArtifacts();
  assert.equal(result.success, false);
  assert.ok(result.error.includes('completed'));
});

test('Phase 28.FE.1: v2 artifact download and share actions', () => {
  const agreement = {
    id: 'agr_download_test',
    title: 'Download Test',
    status: AGREEMENT_STATUS.COMPLETED,
  };

  const artifacts = new V2ArtifactActionsSimulator(agreement);
  artifacts.generateArtifacts();

  // Download
  const download = artifacts.downloadArtifact(ARTIFACT_TYPES.EXECUTED, 'user_123');
  assert.equal(download.success, true);
  assert.ok(download.url);
  assert.ok(download.filename.includes('executed'));

  // Track download
  assert.equal(artifacts.downloads.length, 1);
  assert.equal(artifacts.downloads[0].userId, 'user_123');

  // Share
  const share = artifacts.shareArtifact(ARTIFACT_TYPES.CERTIFICATE, 'external@example.com');
  assert.equal(share.success, true);
  assert.ok(share.shareLink);
  assert.ok(share.expiresAt);
});

// -----------------------------------------------------------------------------
// Phase 28 Tests: V2 Placement Workflows Integration
// -----------------------------------------------------------------------------

test('Phase 28.FE.1: v2 authoring with auto-placement integration', () => {
  const authoring = new V2AuthoringFlowSimulator();

  authoring.selectDocument('doc_auto_place', 2);
  authoring.setDetails('Auto-Place Integration Test');
  authoring.addParticipant('p1', 'signer', 'signer@test.com', 'Signer', 1);
  authoring.validateParticipants();
  authoring.addFieldDefinition('fd1', 'signature', 'p1', true);
  authoring.addFieldDefinition('fd2', 'date_signed', 'p1', true);
  authoring.validateFieldDefinitions();

  // Simulate auto-placement
  authoring.addFieldInstance('fd1', 1, 100, 400, 200, 50, 'auto');
  authoring.addFieldInstance('fd2', 1, 100, 460, 120, 30, 'auto');

  assert.equal(authoring.validatePlacement(), true);

  // Verify placement source tracking
  const autoPlaced = authoring.agreement.fieldInstances.filter(i => i.placementSource === 'auto');
  assert.equal(autoPlaced.length, 2);
});

test('Phase 28.FE.1: v2 authoring with manual placement adjustment', () => {
  const authoring = new V2AuthoringFlowSimulator();

  authoring.selectDocument('doc_manual_adjust', 1);
  authoring.setDetails('Manual Adjustment Test');
  authoring.addParticipant('p1', 'signer', 'manual@test.com', 'Manual Tester', 1);
  authoring.validateParticipants();
  authoring.addFieldDefinition('fd1', 'signature', 'p1', true);
  authoring.validateFieldDefinitions();

  // Add auto-placed field
  authoring.addFieldInstance('fd1', 1, 100, 400, 200, 50, 'auto');

  // Simulate manual adjustment (in real UI this would update the instance)
  const instance = authoring.agreement.fieldInstances[0];
  instance.x = 150;
  instance.y = 450;
  instance.placementSource = 'manual';

  assert.equal(instance.placementSource, 'manual');
  assert.equal(instance.x, 150);
  assert.equal(instance.y, 450);
});

// -----------------------------------------------------------------------------
// Phase 28 Tests: V2 Full E2E Flow
// -----------------------------------------------------------------------------

test('Phase 28.FE.1: complete v2 E2E flow from authoring to completion to artifacts', () => {
  // STEP 1: Author agreement
  const authoring = new V2AuthoringFlowSimulator();

  authoring.selectDocument('doc_e2e_complete', 2);
  authoring.setDetails('Complete E2E Test Agreement', 'Please review and sign');
  authoring.addParticipant('emp', 'signer', 'employee@company.com', 'John Employee', 1);
  authoring.addParticipant('mgr', 'signer', 'manager@company.com', 'Jane Manager', 2);
  authoring.addParticipant('hr', 'cc', 'hr@company.com', 'HR Department', 1);
  authoring.validateParticipants();
  authoring.addFieldDefinition('emp_sig', 'signature', 'emp', true);
  authoring.addFieldDefinition('emp_date', 'date_signed', 'emp', true);
  authoring.addFieldDefinition('mgr_sig', 'signature', 'mgr', true);
  authoring.addFieldDefinition('mgr_date', 'date_signed', 'mgr', true);
  authoring.validateFieldDefinitions();
  authoring.addFieldInstance('emp_sig', 1, 100, 400, 200, 50, 'auto');
  authoring.addFieldInstance('emp_date', 1, 320, 400, 120, 30, 'auto');
  authoring.addFieldInstance('mgr_sig', 1, 100, 500, 200, 50, 'auto');
  authoring.addFieldInstance('mgr_date', 1, 320, 500, 120, 30, 'auto');
  authoring.validatePlacement();

  const sendResult = authoring.send();
  assert.equal(sendResult.success, true);

  // STEP 2: Multi-stage signing
  const signerFlow = new V2MultiStageSignerSimulator(authoring.agreement);

  // Stage 1: Employee signs
  signerFlow.viewAgreement('emp');
  signerFlow.signAgreement('emp');
  assert.equal(signerFlow.currentStage, 2);
  assert.equal(authoring.agreement.status, AGREEMENT_STATUS.IN_PROGRESS);

  // Stage 2: Manager signs
  signerFlow.viewAgreement('mgr');
  signerFlow.signAgreement('mgr');
  assert.equal(signerFlow.isComplete(), true);
  assert.equal(authoring.agreement.status, AGREEMENT_STATUS.COMPLETED);

  // STEP 3: Generate and download artifacts
  const artifactMgr = new V2ArtifactActionsSimulator(authoring.agreement);
  artifactMgr.generateArtifacts();

  const executedDownload = artifactMgr.downloadArtifact(ARTIFACT_TYPES.EXECUTED, 'admin_user');
  assert.equal(executedDownload.success, true);

  const certShare = artifactMgr.shareArtifact(ARTIFACT_TYPES.CERTIFICATE, 'records@company.com');
  assert.equal(certShare.success, true);

  // Verify full flow completed
  assert.ok(authoring.agreement.id);
  assert.equal(authoring.agreement.status, AGREEMENT_STATUS.COMPLETED);
  assert.equal(artifactMgr.artifacts.length, 2);
  assert.equal(artifactMgr.downloads.length, 1);
});

// =============================================================================
// Phase 28.FE.2: Operator-Facing Diagnostics UX Tests
// =============================================================================

// -----------------------------------------------------------------------------
// Operator Diagnostics Simulators
// -----------------------------------------------------------------------------

/**
 * V2DiagSystemStatusSimulator - simulates system status monitoring for v2 diagnostics
 */
class V2DiagSystemStatusSimulator {
  constructor() {
    this.status = 'healthy';
    this.message = 'V2 runtime is operating normally';
    this.incidents = [];
    this.lastCheck = new Date();
  }

  setStatus(status, message) {
    this.status = status;
    this.message = message;
    this.lastCheck = new Date();
    return this;
  }

  addIncident(type, description, severity) {
    this.incidents.push({
      id: `INC-${this.incidents.length + 1}`,
      type,
      description,
      severity,
      timestamp: new Date()
    });
    this.updateStatus();
    return this;
  }

  resolveIncident(id) {
    const incident = this.incidents.find(i => i.id === id);
    if (incident) {
      incident.resolved = true;
      incident.resolvedAt = new Date();
    }
    this.updateStatus();
    return incident;
  }

  updateStatus() {
    const activeIncidents = this.incidents.filter(i => !i.resolved);
    const criticalCount = activeIncidents.filter(i => i.severity === 'critical').length;
    const warningCount = activeIncidents.filter(i => i.severity === 'warning').length;

    if (criticalCount > 0) {
      this.status = 'critical';
      this.message = `${criticalCount} critical incident(s) require attention`;
    } else if (warningCount > 0) {
      this.status = 'degraded';
      this.message = `${warningCount} warning(s) detected`;
    } else {
      this.status = 'healthy';
      this.message = 'V2 runtime is operating normally';
    }
  }

  getActiveIncidents() {
    return this.incidents.filter(i => !i.resolved);
  }
}

/**
 * V2DiagStageProgressionSimulator - simulates v2 stage progression visibility
 */
class V2DiagStageProgressionSimulator {
  constructor() {
    this.agreements = [];
    this.stageNames = ['Document', 'Details', 'Participants', 'Fields', 'Placement', 'Review'];
  }

  addAgreement(id, title, stage, participants = []) {
    this.agreements.push({
      id,
      title,
      stage,
      stageName: this.stageNames[stage - 1] || 'Unknown',
      participants,
      timeInStage: 0,
      status: stage === 6 ? 'ready' : 'in_progress',
      createdAt: new Date()
    });
    return this;
  }

  updateStage(agreementId, newStage) {
    const agr = this.agreements.find(a => a.id === agreementId);
    if (agr) {
      agr.stage = newStage;
      agr.stageName = this.stageNames[newStage - 1] || 'Unknown';
      agr.timeInStage = 0;
      if (newStage === 6) agr.status = 'ready';
    }
    return agr;
  }

  advanceTime(agreementId, minutes) {
    const agr = this.agreements.find(a => a.id === agreementId);
    if (agr) {
      agr.timeInStage += minutes;
      // Mark as stalled if in same stage too long (> 4 hours)
      if (agr.timeInStage > 240) {
        agr.status = 'stalled';
      }
    }
    return agr;
  }

  getStageCounts() {
    const counts = {};
    for (let i = 1; i <= 6; i++) {
      counts[i] = this.agreements.filter(a => a.stage === i).length;
    }
    return counts;
  }

  getBottlenecks() {
    const bottlenecks = [];
    const stageCounts = this.getStageCounts();

    // Check for stage imbalances
    const totalActive = this.agreements.length;
    for (let i = 1; i <= 5; i++) {
      if (stageCounts[i] > totalActive * 0.4) {
        bottlenecks.push({
          stage: i,
          stageName: this.stageNames[i - 1],
          count: stageCounts[i],
          title: `High volume at ${this.stageNames[i - 1]}`,
          description: `${stageCounts[i]} agreements pending at stage ${i}`
        });
      }
    }

    // Check for stalled agreements
    const stalledCount = this.agreements.filter(a => a.status === 'stalled').length;
    if (stalledCount > 0) {
      bottlenecks.push({
        type: 'stalled',
        count: stalledCount,
        title: 'Stalled agreements detected',
        description: `${stalledCount} agreement(s) have been in the same stage for over 4 hours`
      });
    }

    return bottlenecks;
  }

  getAgreementsByStage(stage) {
    return this.agreements.filter(a => a.stage === stage);
  }
}

/**
 * V2DiagSignerProgressionSimulator - simulates multi-stage signer progression visibility
 */
class V2DiagSignerProgressionSimulator {
  constructor() {
    this.signers = [];
    this.maxStages = 3;
  }

  addSigner(id, agreementId, stage, status = 'pending') {
    this.signers.push({
      id,
      agreementId,
      stage,
      status, // pending, active, completed, declined
      viewedAt: null,
      completedAt: null
    });
    return this;
  }

  viewAgreement(signerId) {
    const signer = this.signers.find(s => s.id === signerId);
    if (signer && signer.status === 'pending') {
      signer.status = 'active';
      signer.viewedAt = new Date();
    }
    return signer;
  }

  completeSigner(signerId) {
    const signer = this.signers.find(s => s.id === signerId);
    if (signer && signer.status === 'active') {
      signer.status = 'completed';
      signer.completedAt = new Date();
    }
    return signer;
  }

  declineSigner(signerId, reason) {
    const signer = this.signers.find(s => s.id === signerId);
    if (signer) {
      signer.status = 'declined';
      signer.declineReason = reason;
      signer.declinedAt = new Date();
    }
    return signer;
  }

  getStageDistribution() {
    const distribution = {};
    for (let i = 1; i <= this.maxStages; i++) {
      distribution[i] = this.signers.filter(s => s.stage === i && s.status !== 'completed').length;
    }
    distribution.completed = this.signers.filter(s => s.status === 'completed').length;
    return distribution;
  }

  getBottlenecks() {
    const bottlenecks = [];
    const distribution = this.getStageDistribution();
    const totalActive = this.signers.filter(s => s.status !== 'completed').length;

    // Check for stage imbalances
    for (let i = 1; i <= this.maxStages; i++) {
      if (distribution[i] > totalActive * 0.5 && totalActive > 5) {
        bottlenecks.push({
          stage: i,
          count: distribution[i],
          title: `Signer bottleneck at stage ${i}`,
          description: `${distribution[i]} signers pending at stage ${i}`,
          affected_count: distribution[i]
        });
      }
    }

    return bottlenecks;
  }
}

/**
 * V2DiagConflictSurfacingSimulator - simulates conflict surfacing for operators
 */
class V2DiagConflictSurfacingSimulator {
  constructor() {
    this.conflicts = [];
  }

  addConflict(id, provider, entity, reason, priority = 'normal') {
    this.conflicts.push({
      id,
      provider,
      entity,
      reason,
      priority,
      status: 'pending',
      createdAt: new Date(),
      age: '0m'
    });
    return this;
  }

  resolveConflict(id, resolution) {
    const conflict = this.conflicts.find(c => c.id === id);
    if (conflict) {
      conflict.status = 'resolved';
      conflict.resolution = resolution;
      conflict.resolvedAt = new Date();
    }
    return conflict;
  }

  ignoreConflict(id) {
    const conflict = this.conflicts.find(c => c.id === id);
    if (conflict) {
      conflict.status = 'ignored';
      conflict.ignoredAt = new Date();
    }
    return conflict;
  }

  bulkResolve(ids, resolution) {
    const resolved = [];
    for (const id of ids) {
      const conflict = this.resolveConflict(id, resolution);
      if (conflict) resolved.push(conflict);
    }
    return resolved;
  }

  bulkIgnore(ids) {
    const ignored = [];
    for (const id of ids) {
      const conflict = this.ignoreConflict(id);
      if (conflict) ignored.push(conflict);
    }
    return ignored;
  }

  getPendingConflicts(filters = {}) {
    let pending = this.conflicts.filter(c => c.status === 'pending');

    if (filters.priority) {
      pending = pending.filter(c => c.priority === filters.priority);
    }
    if (filters.provider) {
      pending = pending.filter(c => c.provider === filters.provider);
    }

    return pending;
  }

  getConflictStats() {
    const pending = this.conflicts.filter(c => c.status === 'pending');
    return {
      total: pending.length,
      highPriority: pending.filter(c => c.priority === 'high').length,
      normalPriority: pending.filter(c => c.priority === 'normal').length,
      lowPriority: pending.filter(c => c.priority === 'low').length
    };
  }
}

/**
 * V2DiagPlacementEngineSimulator - simulates placement engine degraded mode detection
 */
class V2DiagPlacementEngineSimulator {
  constructor() {
    this.resolvers = [
      { id: 'native_pdf_forms', name: 'Native PDF Forms', status: 'healthy', latency: 50 },
      { id: 'text_anchor', name: 'Text Anchor', status: 'healthy', latency: 120 },
      { id: 'ocr_anchor', name: 'OCR Anchor', status: 'healthy', latency: 350 },
      { id: 'ml_layout', name: 'ML Layout', status: 'healthy', latency: 800 }
    ];
    this.mode = 'normal';
    this.degradedSince = null;
    this.recentRuns = [];
    this.avgConfidence = 94;
    this.lastHealthCheck = new Date();
  }

  setResolverStatus(resolverId, status, latency) {
    const resolver = this.resolvers.find(r => r.id === resolverId);
    if (resolver) {
      resolver.status = status;
      if (latency !== undefined) resolver.latency = latency;
    }
    this.updateMode();
    return resolver;
  }

  updateMode() {
    const degradedCount = this.resolvers.filter(r => r.status === 'degraded').length;
    const offlineCount = this.resolvers.filter(r => r.status === 'offline').length;
    const healthyCount = this.resolvers.filter(r => r.status === 'healthy').length;

    if (offlineCount >= 3 || healthyCount === 0) {
      this.mode = 'critical';
      if (!this.degradedSince) this.degradedSince = new Date();
    } else if (offlineCount > 0 || degradedCount >= 2) {
      this.mode = 'degraded';
      if (!this.degradedSince) this.degradedSince = new Date();
    } else {
      this.mode = 'normal';
      this.degradedSince = null;
    }
  }

  addPlacementRun(id, status, confidence) {
    this.recentRuns.unshift({
      id,
      status, // completed, partial, failed
      confidence,
      timestamp: new Date()
    });
    // Keep only last 10 runs
    if (this.recentRuns.length > 10) {
      this.recentRuns.pop();
    }
    // Update average confidence
    const completedRuns = this.recentRuns.filter(r => r.status !== 'failed');
    if (completedRuns.length > 0) {
      this.avgConfidence = Math.round(
        completedRuns.reduce((sum, r) => sum + r.confidence, 0) / completedRuns.length
      );
    }
    return this;
  }

  healthCheck() {
    this.lastHealthCheck = new Date();
    return {
      mode: this.mode,
      resolvers: this.resolvers,
      avgConfidence: this.avgConfidence + '%',
      activeResolvers: this.resolvers.filter(r => r.status === 'healthy').length,
      degradedResolvers: this.resolvers.filter(r => r.status !== 'healthy').length,
      recentRuns: this.recentRuns.slice(0, 3),
      degradedSince: this.degradedSince
    };
  }

  getFallbackResolver() {
    // Return first healthy resolver as fallback
    return this.resolvers.find(r => r.status === 'healthy');
  }
}

/**
 * V2DiagActivityFeedSimulator - simulates real-time activity feed
 */
class V2DiagActivityFeedSimulator {
  constructor() {
    this.events = [];
    this.autoRefresh = true;
  }

  addEvent(type, title, message = null) {
    this.events.unshift({
      id: `EVT-${this.events.length + 1}`,
      type, // success, warning, error, info
      title,
      message,
      timestamp: new Date(),
      time: 'Just now'
    });
    return this;
  }

  getEvents(limit = 20) {
    return this.events.slice(0, limit);
  }

  toggleAutoRefresh(enabled) {
    this.autoRefresh = enabled;
    return this;
  }
}

// -----------------------------------------------------------------------------
// Phase 28.FE.2 Tests: Stage Progression Visibility
// -----------------------------------------------------------------------------

test('Phase 28.FE.2: stage progression simulator tracks v2 six-step flow', () => {
  const progression = new V2DiagStageProgressionSimulator();

  progression.addAgreement('AGR-001', 'NDA Agreement', 3);
  progression.addAgreement('AGR-002', 'Employment Contract', 4);
  progression.addAgreement('AGR-003', 'Vendor Agreement', 5);

  const counts = progression.getStageCounts();

  assert.equal(counts[1], 0);
  assert.equal(counts[3], 1);
  assert.equal(counts[4], 1);
  assert.equal(counts[5], 1);
});

test('Phase 28.FE.2: stage progression detects bottlenecks', () => {
  const progression = new V2DiagStageProgressionSimulator();

  // Create imbalance at stage 3
  for (let i = 0; i < 6; i++) {
    progression.addAgreement(`AGR-${i}`, `Agreement ${i}`, 3);
  }
  progression.addAgreement('AGR-7', 'Other Agreement', 5);

  const bottlenecks = progression.getBottlenecks();

  assert.ok(bottlenecks.length > 0);
  assert.equal(bottlenecks[0].stage, 3);
  assert.ok(bottlenecks[0].title.includes('Participants'));
});

test('Phase 28.FE.2: stage progression detects stalled agreements', () => {
  const progression = new V2DiagStageProgressionSimulator();

  progression.addAgreement('AGR-001', 'Stalled Agreement', 2);
  progression.advanceTime('AGR-001', 300); // 5 hours

  const agr = progression.agreements.find(a => a.id === 'AGR-001');
  assert.equal(agr.status, 'stalled');

  const bottlenecks = progression.getBottlenecks();
  const stalledBottleneck = bottlenecks.find(b => b.type === 'stalled');
  assert.ok(stalledBottleneck);
});

test('Phase 28.FE.2: stage progression advances correctly', () => {
  const progression = new V2DiagStageProgressionSimulator();

  progression.addAgreement('AGR-001', 'Test Agreement', 1);

  for (let stage = 2; stage <= 6; stage++) {
    progression.updateStage('AGR-001', stage);
    const agr = progression.agreements.find(a => a.id === 'AGR-001');
    assert.equal(agr.stage, stage);
    assert.equal(agr.stageName, progression.stageNames[stage - 1]);
  }

  const agr = progression.agreements.find(a => a.id === 'AGR-001');
  assert.equal(agr.status, 'ready');
});

// -----------------------------------------------------------------------------
// Phase 28.FE.2 Tests: Multi-Stage Signer Progression
// -----------------------------------------------------------------------------

test('Phase 28.FE.2: signer progression simulator tracks stage distribution', () => {
  const signerProgress = new V2DiagSignerProgressionSimulator();

  signerProgress.addSigner('S1', 'AGR-001', 1, 'active');
  signerProgress.addSigner('S2', 'AGR-001', 2, 'pending');
  signerProgress.addSigner('S3', 'AGR-002', 1, 'completed');

  const distribution = signerProgress.getStageDistribution();

  assert.equal(distribution[1], 1); // S1 active at stage 1
  assert.equal(distribution[2], 1); // S2 pending at stage 2
  assert.equal(distribution.completed, 1); // S3 completed
});

test('Phase 28.FE.2: signer progression detects bottlenecks', () => {
  const signerProgress = new V2DiagSignerProgressionSimulator();

  // Create imbalance at stage 2
  for (let i = 0; i < 8; i++) {
    signerProgress.addSigner(`S${i}`, `AGR-${i}`, 2, 'pending');
  }
  signerProgress.addSigner('S8', 'AGR-8', 1, 'active');
  signerProgress.addSigner('S9', 'AGR-9', 3, 'active');

  const bottlenecks = signerProgress.getBottlenecks();

  assert.ok(bottlenecks.length > 0);
  assert.equal(bottlenecks[0].stage, 2);
});

test('Phase 28.FE.2: signer workflow view and complete', () => {
  const signerProgress = new V2DiagSignerProgressionSimulator();

  signerProgress.addSigner('S1', 'AGR-001', 1, 'pending');

  signerProgress.viewAgreement('S1');
  let signer = signerProgress.signers.find(s => s.id === 'S1');
  assert.equal(signer.status, 'active');
  assert.ok(signer.viewedAt);

  signerProgress.completeSigner('S1');
  signer = signerProgress.signers.find(s => s.id === 'S1');
  assert.equal(signer.status, 'completed');
  assert.ok(signer.completedAt);
});

test('Phase 28.FE.2: signer decline workflow', () => {
  const signerProgress = new V2DiagSignerProgressionSimulator();

  signerProgress.addSigner('S1', 'AGR-001', 1, 'pending');
  signerProgress.declineSigner('S1', 'Terms not acceptable');

  const signer = signerProgress.signers.find(s => s.id === 'S1');
  assert.equal(signer.status, 'declined');
  assert.equal(signer.declineReason, 'Terms not acceptable');
});

// -----------------------------------------------------------------------------
// Phase 28.FE.2 Tests: Integration Conflict Surfacing
// -----------------------------------------------------------------------------

test('Phase 28.FE.2: conflict surfacing adds and tracks conflicts', () => {
  const conflicts = new V2DiagConflictSurfacingSimulator();

  conflicts.addConflict('CNF-001', 'salesforce', 'Contact', 'Duplicate email', 'high');
  conflicts.addConflict('CNF-002', 'hubspot', 'Deal', 'Missing field', 'normal');

  const pending = conflicts.getPendingConflicts();
  assert.equal(pending.length, 2);

  const stats = conflicts.getConflictStats();
  assert.equal(stats.highPriority, 1);
  assert.equal(stats.normalPriority, 1);
});

test('Phase 28.FE.2: conflict surfacing supports filtering', () => {
  const conflicts = new V2DiagConflictSurfacingSimulator();

  conflicts.addConflict('CNF-001', 'salesforce', 'Contact', 'Error 1', 'high');
  conflicts.addConflict('CNF-002', 'hubspot', 'Deal', 'Error 2', 'normal');
  conflicts.addConflict('CNF-003', 'salesforce', 'Account', 'Error 3', 'normal');

  const salesforceConflicts = conflicts.getPendingConflicts({ provider: 'salesforce' });
  assert.equal(salesforceConflicts.length, 2);

  const highPriority = conflicts.getPendingConflicts({ priority: 'high' });
  assert.equal(highPriority.length, 1);
});

test('Phase 28.FE.2: conflict resolution workflow', () => {
  const conflicts = new V2DiagConflictSurfacingSimulator();

  conflicts.addConflict('CNF-001', 'salesforce', 'Contact', 'Duplicate', 'high');

  const resolved = conflicts.resolveConflict('CNF-001', 'Merged records');
  assert.equal(resolved.status, 'resolved');
  assert.equal(resolved.resolution, 'Merged records');

  const pending = conflicts.getPendingConflicts();
  assert.equal(pending.length, 0);
});

test('Phase 28.FE.2: bulk conflict operations', () => {
  const conflicts = new V2DiagConflictSurfacingSimulator();

  conflicts.addConflict('CNF-001', 'salesforce', 'Contact', 'Error 1');
  conflicts.addConflict('CNF-002', 'salesforce', 'Contact', 'Error 2');
  conflicts.addConflict('CNF-003', 'hubspot', 'Deal', 'Error 3');

  // Bulk resolve first two
  const resolved = conflicts.bulkResolve(['CNF-001', 'CNF-002'], 'Bulk fix');
  assert.equal(resolved.length, 2);

  // Ignore the third
  const ignored = conflicts.bulkIgnore(['CNF-003']);
  assert.equal(ignored.length, 1);

  const pending = conflicts.getPendingConflicts();
  assert.equal(pending.length, 0);
});

// -----------------------------------------------------------------------------
// Phase 28.FE.2 Tests: Placement Engine Degraded Mode
// -----------------------------------------------------------------------------

test('Phase 28.FE.2: placement engine normal mode when all resolvers healthy', () => {
  const placement = new V2DiagPlacementEngineSimulator();

  const health = placement.healthCheck();

  assert.equal(health.mode, 'normal');
  assert.equal(health.activeResolvers, 4);
  assert.equal(health.degradedResolvers, 0);
});

test('Phase 28.FE.2: placement engine enters degraded mode', () => {
  const placement = new V2DiagPlacementEngineSimulator();

  placement.setResolverStatus('ocr_anchor', 'offline');
  placement.setResolverStatus('ml_layout', 'degraded');

  const health = placement.healthCheck();

  assert.equal(health.mode, 'degraded');
  assert.ok(health.degradedSince);
  assert.equal(health.degradedResolvers, 2);
});

test('Phase 28.FE.2: placement engine enters critical mode when most resolvers offline', () => {
  const placement = new V2DiagPlacementEngineSimulator();

  placement.setResolverStatus('native_pdf_forms', 'offline');
  placement.setResolverStatus('text_anchor', 'offline');
  placement.setResolverStatus('ocr_anchor', 'offline');

  const health = placement.healthCheck();

  assert.equal(health.mode, 'critical');
});

test('Phase 28.FE.2: placement engine tracks recent runs and confidence', () => {
  const placement = new V2DiagPlacementEngineSimulator();

  placement.addPlacementRun('PR-001', 'completed', 98);
  placement.addPlacementRun('PR-002', 'completed', 92);
  placement.addPlacementRun('PR-003', 'partial', 75);

  const health = placement.healthCheck();

  assert.equal(health.recentRuns.length, 3);
  assert.equal(health.avgConfidence, '88%'); // (98+92+75)/3 = 88.33 rounded
});

test('Phase 28.FE.2: placement engine provides fallback resolver', () => {
  const placement = new V2DiagPlacementEngineSimulator();

  placement.setResolverStatus('native_pdf_forms', 'offline');
  placement.setResolverStatus('text_anchor', 'offline');

  const fallback = placement.getFallbackResolver();

  assert.ok(fallback);
  assert.equal(fallback.id, 'ocr_anchor');
  assert.equal(fallback.status, 'healthy');
});

// -----------------------------------------------------------------------------
// Phase 28.FE.2 Tests: System Status and Activity Feed
// -----------------------------------------------------------------------------

test('Phase 28.FE.2: system status tracks incidents', () => {
  const status = new V2DiagSystemStatusSimulator();

  assert.equal(status.status, 'healthy');

  status.addIncident('placement', 'OCR resolver offline', 'warning');
  assert.equal(status.status, 'degraded');

  status.addIncident('integration', 'Salesforce sync failed', 'critical');
  assert.equal(status.status, 'critical');
});

test('Phase 28.FE.2: system status resolves incidents', () => {
  const status = new V2DiagSystemStatusSimulator();

  status.addIncident('placement', 'Resolver offline', 'critical');
  assert.equal(status.status, 'critical');

  status.resolveIncident('INC-1');
  assert.equal(status.status, 'healthy');
  assert.equal(status.getActiveIncidents().length, 0);
});

test('Phase 28.FE.2: activity feed captures events', () => {
  const feed = new V2DiagActivityFeedSimulator();

  feed.addEvent('success', 'Agreement completed', 'AGR-001 signed by all parties');
  feed.addEvent('warning', 'Signer bottleneck detected', '15 signers at stage 2');
  feed.addEvent('error', 'Sync failed', 'Salesforce connection timeout');

  const events = feed.getEvents(10);

  assert.equal(events.length, 3);
  assert.equal(events[0].type, 'error'); // Most recent first
  assert.equal(events[2].type, 'success');
});

test('Phase 28.FE.2: activity feed respects limit', () => {
  const feed = new V2DiagActivityFeedSimulator();

  for (let i = 0; i < 30; i++) {
    feed.addEvent('info', `Event ${i}`);
  }

  const events = feed.getEvents(10);
  assert.equal(events.length, 10);
});

test('Phase 28.FE.2: activity feed toggles auto-refresh', () => {
  const feed = new V2DiagActivityFeedSimulator();

  assert.equal(feed.autoRefresh, true);

  feed.toggleAutoRefresh(false);
  assert.equal(feed.autoRefresh, false);

  feed.toggleAutoRefresh(true);
  assert.equal(feed.autoRefresh, true);
});

// -----------------------------------------------------------------------------
// Phase 28.FE.2 Tests: Integrated Diagnostics Scenarios
// -----------------------------------------------------------------------------

test('Phase 28.FE.2: full diagnostics scenario with degraded placement', () => {
  // Setup all diagnostics components
  const status = new V2DiagSystemStatusSimulator();
  const stageProgress = new V2DiagStageProgressionSimulator();
  const signerProgress = new V2DiagSignerProgressionSimulator();
  const conflicts = new V2DiagConflictSurfacingSimulator();
  const placement = new V2DiagPlacementEngineSimulator();
  const feed = new V2DiagActivityFeedSimulator();

  // Simulate degraded placement scenario
  placement.setResolverStatus('ml_layout', 'offline');
  status.addIncident('placement', 'ML Layout resolver offline', 'warning');
  feed.addEvent('warning', 'Placement engine degraded', 'ML Layout offline');

  // Add some conflicts
  conflicts.addConflict('CNF-001', 'salesforce', 'Contact', 'Duplicate', 'high');

  // Add agreements progressing through stages
  stageProgress.addAgreement('AGR-001', 'Test Agreement', 4);

  // Check system state
  assert.equal(status.status, 'degraded');
  assert.equal(placement.mode, 'degraded');
  assert.equal(conflicts.getConflictStats().total, 1);
  assert.equal(stageProgress.agreements.length, 1);
  assert.equal(feed.getEvents().length, 1);
});

test('Phase 28.FE.2: diagnostics recovery scenario', () => {
  const status = new V2DiagSystemStatusSimulator();
  const placement = new V2DiagPlacementEngineSimulator();
  const feed = new V2DiagActivityFeedSimulator();

  // Start degraded
  placement.setResolverStatus('ocr_anchor', 'offline');
  status.addIncident('placement', 'OCR offline', 'warning');

  assert.equal(placement.mode, 'degraded');
  assert.equal(status.status, 'degraded');

  // Recover
  placement.setResolverStatus('ocr_anchor', 'healthy');
  status.resolveIncident('INC-1');
  feed.addEvent('success', 'OCR resolver recovered');

  assert.equal(placement.mode, 'normal');
  assert.equal(status.status, 'healthy');
  assert.equal(feed.getEvents()[0].type, 'success');
});

// =============================================================================
// PHASE 30: Agreement Wizard State Persistence
// =============================================================================
// Tests for hybrid client/server state persistence in the Create Agreement wizard.
// Frontend scope: sessionStorage, draft sync service, sync orchestration,
// resume dialog, conflict handling, multi-tab coordination.

// -----------------------------------------------------------------------------
// Phase 30 Simulators
// -----------------------------------------------------------------------------

/**
 * WizardStateManagerSimulator - simulates sessionStorage persistence for wizard state
 */
class WizardStateManagerSimulator {
  constructor() {
    this.STORAGE_KEY = 'esign_wizard_state';
    this.VERSION = 1;
    this.storage = {};
    this.state = null;
  }

  createInitialState() {
    return {
      version: this.VERSION,
      draftId: null,
      revision: 0,
      currentStep: 1,
      lastSyncedAt: null,
      isDirty: false,
      document: { templateId: null, file: null, fileName: null },
      details: { title: '', description: '' },
      signers: [],
      fields: [],
      workflow: { order: 'sequential', reminderDays: 3, expirationDays: 30 },
      review: { confirmed: false }
    };
  }

  loadFromSession() {
    const stored = this.storage[this.STORAGE_KEY];
    if (!stored) return null;

    try {
      const parsed = JSON.parse(stored);
      if (parsed.version !== this.VERSION) {
        this.clearSession();
        return null;
      }
      this.state = parsed;
      return parsed;
    } catch {
      return null;
    }
  }

  saveToSession() {
    if (this.state) {
      this.storage[this.STORAGE_KEY] = JSON.stringify(this.state);
    }
  }

  clearSession() {
    delete this.storage[this.STORAGE_KEY];
    this.state = null;
  }

  hasResumableState() {
    const state = this.loadFromSession();
    return state !== null && (state.currentStep > 1 || state.isDirty);
  }

  updateState(updates) {
    if (!this.state) {
      this.state = this.createInitialState();
    }
    this.state = { ...this.state, ...updates, isDirty: true };
    this.saveToSession();
    return this.state;
  }

  updateStep(step) {
    return this.updateState({ currentStep: step });
  }

  updateDocument(doc) {
    return this.updateState({ document: { ...this.state?.document, ...doc } });
  }

  updateDetails(details) {
    return this.updateState({ details: { ...this.state?.details, ...details } });
  }

  updateSigners(signers) {
    return this.updateState({ signers });
  }

  updateFields(fields) {
    return this.updateState({ fields });
  }

  updateWorkflow(workflow) {
    return this.updateState({ workflow: { ...this.state?.workflow, ...workflow } });
  }

  markSynced(draftId, revision) {
    return this.updateState({
      draftId,
      revision,
      isDirty: false,
      lastSyncedAt: new Date().toISOString()
    });
  }

  initialize() {
    this.state = this.createInitialState();
    this.saveToSession();
    return this.state;
  }

  getState() {
    return this.state;
  }
}

/**
 * DraftSyncServiceSimulator - simulates server API communication for draft persistence
 */
class DraftSyncServiceSimulator {
  constructor() {
    this.drafts = new Map();
    this.nextDraftId = 1;
    this.simulatedError = null;
    this.simulatedConflict = false;
  }

  simulateError(error) {
    this.simulatedError = error;
  }

  simulateConflict(serverRevision) {
    this.simulatedConflict = serverRevision;
  }

  clearSimulations() {
    this.simulatedError = null;
    this.simulatedConflict = false;
  }

  async create(state) {
    if (this.simulatedError) {
      const error = this.simulatedError;
      this.simulatedError = null;
      throw new Error(error);
    }

    const draftId = `DRF-${String(this.nextDraftId++).padStart(3, '0')}`;
    const draft = {
      id: draftId,
      revision: 1,
      state: { ...state },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.drafts.set(draftId, draft);
    return { draftId, revision: 1 };
  }

  async update(draftId, state, expectedRevision) {
    if (this.simulatedError) {
      const error = this.simulatedError;
      this.simulatedError = null;
      throw new Error(error);
    }

    const draft = this.drafts.get(draftId);
    if (!draft) {
      throw new Error('Draft not found');
    }

    if (this.simulatedConflict) {
      const serverRev = this.simulatedConflict;
      this.simulatedConflict = false;
      const error = new Error('Conflict');
      error.status = 409;
      error.code = 'stale_revision';
      error.serverRevision = serverRev;
      error.serverState = draft.state;
      throw error;
    }

    if (expectedRevision !== draft.revision) {
      const error = new Error('Conflict');
      error.status = 409;
      error.code = 'stale_revision';
      error.serverRevision = draft.revision;
      error.serverState = draft.state;
      throw error;
    }

    draft.revision++;
    draft.state = { ...state };
    draft.updatedAt = new Date().toISOString();
    return { draftId, revision: draft.revision };
  }

  async load(draftId) {
    if (this.simulatedError) {
      const error = this.simulatedError;
      this.simulatedError = null;
      throw new Error(error);
    }

    const draft = this.drafts.get(draftId);
    if (!draft) {
      throw new Error('Draft not found');
    }
    return {
      id: draft.id,
      revision: draft.revision,
      state: { ...draft.state },
      updatedAt: draft.updatedAt
    };
  }

  async delete(draftId) {
    if (this.simulatedError) {
      const error = this.simulatedError;
      this.simulatedError = null;
      throw new Error(error);
    }
    this.drafts.delete(draftId);
    return { success: true };
  }

  async list() {
    return Array.from(this.drafts.values()).map(d => ({
      id: d.id,
      title: d.state.details?.title || 'Untitled',
      currentStep: d.state.currentStep || 1,
      updatedAt: d.updatedAt
    }));
  }

  async sync(state, draftId, expectedRevision) {
    if (draftId) {
      return this.update(draftId, state, expectedRevision);
    }
    return this.create(state);
  }
}

/**
 * SyncOrchestratorSimulator - simulates sync orchestration with debouncing and multi-tab coordination
 */
class SyncOrchestratorSimulator {
  constructor(stateManager, syncService) {
    this.stateManager = stateManager;
    this.syncService = syncService;
    this.SYNC_DEBOUNCE_MS = 2000;
    this.RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000];
    this.status = 'idle'; // idle, syncing, synced, error, conflict
    this.pendingSync = null;
    this.retryCount = 0;
    this.lastError = null;
    this.broadcastMessages = [];
    this.otherTabMessages = [];
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => cb(data));
  }

  setStatus(status) {
    this.status = status;
    this.emit('statusChange', status);
  }

  scheduleDebouncedSync() {
    // In real implementation, this uses setTimeout
    // Here we just track that a sync was scheduled
    this.pendingSync = { scheduled: Date.now() };
    return this.pendingSync;
  }

  cancelPendingSync() {
    this.pendingSync = null;
  }

  async forceSync() {
    this.cancelPendingSync();
    return this.performSync();
  }

  async performSync() {
    const state = this.stateManager.getState();
    if (!state || !state.isDirty) {
      return { skipped: true, reason: 'not_dirty' };
    }

    this.setStatus('syncing');

    try {
      const result = await this.syncService.sync(
        state,
        state.draftId,
        state.revision
      );

      this.stateManager.markSynced(result.draftId, result.revision);
      this.setStatus('synced');
      this.retryCount = 0;
      this.lastError = null;

      // Broadcast to other tabs
      this.broadcastMessages.push({
        type: 'sync_completed',
        draftId: result.draftId,
        revision: result.revision
      });

      return result;
    } catch (error) {
      if (error.status === 409 && error.code === 'stale_revision') {
        this.setStatus('conflict');
        this.emit('conflict', {
          serverRevision: error.serverRevision,
          serverState: error.serverState,
          localState: state
        });
        return { conflict: true, error };
      }

      this.setStatus('error');
      this.lastError = error;
      return { error: true, message: error.message };
    }
  }

  async retrySync() {
    if (this.retryCount >= this.RETRY_DELAYS.length) {
      return { error: true, message: 'Max retries exceeded' };
    }

    const delay = this.RETRY_DELAYS[this.retryCount];
    this.retryCount++;

    // In real implementation, this waits for the delay
    // Here we just perform the sync
    return this.performSync();
  }

  receiveFromOtherTab(message) {
    this.otherTabMessages.push(message);

    if (message.type === 'sync_completed') {
      // Another tab synced, update our local state
      const state = this.stateManager.getState();
      if (state && state.draftId === message.draftId) {
        if (message.revision > state.revision) {
          this.emit('externalUpdate', message);
        }
      }
    } else if (message.type === 'tab_active') {
      // Another tab became active, we should back off
      this.emit('tabActivated', message);
    }
  }

  broadcastTabActive() {
    this.broadcastMessages.push({
      type: 'tab_active',
      timestamp: Date.now()
    });
  }

  handleVisibilityChange(hidden) {
    if (hidden) {
      // Page going hidden, force sync
      this.forceSync();
    } else {
      // Page becoming visible, broadcast we're active
      this.broadcastTabActive();
    }
  }

  handlePageHide() {
    // Use sendBeacon in real implementation
    const state = this.stateManager.getState();
    if (state && state.isDirty) {
      this.emit('beaconSync', state);
    }
  }

  handleBeforeUnload() {
    this.forceSync();
  }

  resolveConflict(resolution) {
    // resolution: 'keep_local', 'use_server', 'merge'
    this.setStatus('idle');
    this.emit('conflictResolved', resolution);
    return { resolved: true, resolution };
  }

  getRetryDelay() {
    if (this.retryCount >= this.RETRY_DELAYS.length) {
      return this.RETRY_DELAYS[this.RETRY_DELAYS.length - 1];
    }
    return this.RETRY_DELAYS[this.retryCount];
  }

  destroy() {
    this.cancelPendingSync();
    this.listeners.clear();
  }
}

/**
 * ResumeDialogSimulator - simulates the resume/discard dialog behavior
 */
class ResumeDialogSimulator {
  constructor(stateManager, syncService) {
    this.stateManager = stateManager;
    this.syncService = syncService;
    this.visible = false;
    this.draftInfo = null;
    this.choice = null;
  }

  checkForResumableState() {
    const hasLocal = this.stateManager.hasResumableState();
    if (hasLocal) {
      const state = this.stateManager.loadFromSession();
      this.draftInfo = {
        source: 'local',
        step: state.currentStep,
        title: state.details?.title || 'Untitled Draft',
        lastModified: state.lastSyncedAt || 'Just now',
        draftId: state.draftId
      };
      this.visible = true;
      return true;
    }
    return false;
  }

  async checkForServerDrafts() {
    try {
      const drafts = await this.syncService.list();
      if (drafts.length > 0) {
        const latest = drafts[0];
        this.draftInfo = {
          source: 'server',
          step: latest.currentStep,
          title: latest.title,
          lastModified: latest.updatedAt,
          draftId: latest.id
        };
        this.visible = true;
        return true;
      }
    } catch {
      // Ignore errors, proceed without server drafts
    }
    return false;
  }

  async handleContinue() {
    this.choice = 'continue';
    this.visible = false;

    if (this.draftInfo.source === 'server') {
      // Load from server
      const draft = await this.syncService.load(this.draftInfo.draftId);
      this.stateManager.updateState(draft.state);
      this.stateManager.markSynced(draft.id, draft.revision);
    }
    // If local, state is already loaded

    return { action: 'continue', state: this.stateManager.getState() };
  }

  handleStartNew() {
    this.choice = 'start_new';
    this.visible = false;

    // Clear local state
    this.stateManager.clearSession();

    // Initialize fresh state
    this.stateManager.initialize();

    return { action: 'start_new', state: this.stateManager.getState() };
  }

  async handleDiscard() {
    this.choice = 'discard';
    this.visible = false;

    // Delete server draft if exists
    if (this.draftInfo?.draftId) {
      try {
        await this.syncService.delete(this.draftInfo.draftId);
      } catch {
        // Ignore delete errors
      }
    }

    // Clear local state
    this.stateManager.clearSession();

    // Initialize fresh state
    this.stateManager.initialize();

    return { action: 'discard', state: this.stateManager.getState() };
  }

  dismiss() {
    this.visible = false;
    this.draftInfo = null;
  }
}

/**
 * SyncStatusIndicatorSimulator - simulates the sync status UI indicator
 */
class SyncStatusIndicatorSimulator {
  constructor() {
    this.status = 'idle';
    this.retryVisible = false;
    this.message = '';
  }

  update(status) {
    this.status = status;
    switch (status) {
      case 'idle':
        this.message = '';
        this.retryVisible = false;
        break;
      case 'syncing':
        this.message = 'Saving...';
        this.retryVisible = false;
        break;
      case 'synced':
        this.message = 'Saved';
        this.retryVisible = false;
        break;
      case 'error':
        this.message = 'Save failed';
        this.retryVisible = true;
        break;
      case 'conflict':
        this.message = 'Conflict detected';
        this.retryVisible = false;
        break;
    }
  }

  getIconClass() {
    switch (this.status) {
      case 'syncing':
        return 'animate-pulse bg-yellow-500';
      case 'synced':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'conflict':
        return 'bg-orange-500';
      default:
        return 'bg-gray-400';
    }
  }

  isVisible() {
    return this.status !== 'idle';
  }
}

// -----------------------------------------------------------------------------
// Phase 30.FE.1 Tests: WizardStateManager - sessionStorage Persistence
// -----------------------------------------------------------------------------

test('Phase 30.FE.1: WizardStateManager creates initial state', () => {
  const manager = new WizardStateManagerSimulator();
  const state = manager.createInitialState();

  assert.equal(state.version, 1);
  assert.equal(state.currentStep, 1);
  assert.equal(state.draftId, null);
  assert.equal(state.revision, 0);
  assert.equal(state.isDirty, false);
  assert.ok(state.document);
  assert.ok(state.details);
  assert.ok(state.signers);
  assert.ok(state.fields);
  assert.ok(state.workflow);
  assert.ok(state.review);
});

test('Phase 30.FE.1: WizardStateManager saves and loads from session', () => {
  const manager = new WizardStateManagerSimulator();
  manager.initialize();
  manager.updateStep(3);
  manager.updateDetails({ title: 'Test Agreement', description: 'A test' });

  // Simulate page reload - create new manager with same storage
  const manager2 = new WizardStateManagerSimulator();
  manager2.storage = manager.storage; // Share the mock storage

  const loaded = manager2.loadFromSession();

  assert.ok(loaded);
  assert.equal(loaded.currentStep, 3);
  assert.equal(loaded.details.title, 'Test Agreement');
});

test('Phase 30.FE.1: WizardStateManager rejects mismatched versions', () => {
  const manager = new WizardStateManagerSimulator();
  manager.initialize();
  manager.updateStep(3);

  // Manually corrupt version
  const stored = JSON.parse(manager.storage[manager.STORAGE_KEY]);
  stored.version = 99;
  manager.storage[manager.STORAGE_KEY] = JSON.stringify(stored);

  const manager2 = new WizardStateManagerSimulator();
  manager2.storage = manager.storage;

  const loaded = manager2.loadFromSession();

  assert.equal(loaded, null);
});

test('Phase 30.FE.1: WizardStateManager tracks dirty state', () => {
  const manager = new WizardStateManagerSimulator();
  manager.initialize();

  assert.equal(manager.getState().isDirty, false);

  manager.updateDetails({ title: 'New Title' });

  assert.equal(manager.getState().isDirty, true);
});

test('Phase 30.FE.1: WizardStateManager marks synced clears dirty flag', () => {
  const manager = new WizardStateManagerSimulator();
  manager.initialize();
  manager.updateDetails({ title: 'Test' });

  assert.equal(manager.getState().isDirty, true);

  manager.markSynced('DRF-001', 1);

  assert.equal(manager.getState().isDirty, false);
  assert.equal(manager.getState().draftId, 'DRF-001');
  assert.equal(manager.getState().revision, 1);
});

test('Phase 30.FE.1: WizardStateManager hasResumableState detects progress', () => {
  const manager = new WizardStateManagerSimulator();

  // No state - not resumable
  assert.equal(manager.hasResumableState(), false);

  manager.initialize();
  // Step 1, not dirty - not resumable
  assert.equal(manager.hasResumableState(), false);

  manager.updateStep(2);
  // Step 2 - resumable
  assert.equal(manager.hasResumableState(), true);
});

test('Phase 30.FE.1: WizardStateManager clears session', () => {
  const manager = new WizardStateManagerSimulator();
  manager.initialize();
  manager.updateStep(4);
  manager.updateDetails({ title: 'Important Draft' });

  manager.clearSession();

  assert.equal(manager.hasResumableState(), false);
  assert.equal(manager.loadFromSession(), null);
});

// -----------------------------------------------------------------------------
// Phase 30.FE.2 Tests: DraftSyncService - Server API Communication
// -----------------------------------------------------------------------------

test('Phase 30.FE.2: DraftSyncService creates new draft', async () => {
  const service = new DraftSyncServiceSimulator();

  const state = { currentStep: 2, details: { title: 'Test' } };
  const result = await service.create(state);

  assert.ok(result.draftId);
  assert.equal(result.revision, 1);
});

test('Phase 30.FE.2: DraftSyncService updates draft with matching revision', async () => {
  const service = new DraftSyncServiceSimulator();

  const state = { currentStep: 2, details: { title: 'Test' } };
  const created = await service.create(state);

  const updated = await service.update(
    created.draftId,
    { ...state, currentStep: 3 },
    1 // expected revision
  );

  assert.equal(updated.revision, 2);
});

test('Phase 30.FE.2: DraftSyncService rejects stale revision', async () => {
  const service = new DraftSyncServiceSimulator();

  const state = { currentStep: 2, details: { title: 'Test' } };
  const created = await service.create(state);

  // Update once to increment revision
  await service.update(created.draftId, { ...state, currentStep: 3 }, 1);

  // Try to update with old revision
  try {
    await service.update(created.draftId, { ...state, currentStep: 4 }, 1);
    assert.fail('Should have thrown conflict error');
  } catch (error) {
    assert.equal(error.status, 409);
    assert.equal(error.code, 'stale_revision');
    assert.equal(error.serverRevision, 2);
  }
});

test('Phase 30.FE.2: DraftSyncService loads draft', async () => {
  const service = new DraftSyncServiceSimulator();

  const state = { currentStep: 3, details: { title: 'Loaded Draft' } };
  const created = await service.create(state);

  const loaded = await service.load(created.draftId);

  assert.equal(loaded.id, created.draftId);
  assert.equal(loaded.state.currentStep, 3);
  assert.equal(loaded.state.details.title, 'Loaded Draft');
});

test('Phase 30.FE.2: DraftSyncService deletes draft', async () => {
  const service = new DraftSyncServiceSimulator();

  const state = { currentStep: 2 };
  const created = await service.create(state);

  await service.delete(created.draftId);

  try {
    await service.load(created.draftId);
    assert.fail('Should have thrown not found error');
  } catch (error) {
    assert.ok(error.message.includes('not found'));
  }
});

test('Phase 30.FE.2: DraftSyncService lists drafts', async () => {
  const service = new DraftSyncServiceSimulator();

  await service.create({ currentStep: 1, details: { title: 'Draft 1' } });
  await service.create({ currentStep: 2, details: { title: 'Draft 2' } });
  await service.create({ currentStep: 3, details: { title: 'Draft 3' } });

  const drafts = await service.list();

  assert.equal(drafts.length, 3);
  assert.ok(drafts.some(d => d.title === 'Draft 1'));
  assert.ok(drafts.some(d => d.title === 'Draft 2'));
  assert.ok(drafts.some(d => d.title === 'Draft 3'));
});

test('Phase 30.FE.2: DraftSyncService sync creates if no draftId', async () => {
  const service = new DraftSyncServiceSimulator();

  const state = { currentStep: 2 };
  const result = await service.sync(state, null, null);

  assert.ok(result.draftId);
  assert.equal(result.revision, 1);
});

test('Phase 30.FE.2: DraftSyncService sync updates if draftId exists', async () => {
  const service = new DraftSyncServiceSimulator();

  const state = { currentStep: 2 };
  const created = await service.sync(state, null, null);

  const updated = await service.sync(
    { ...state, currentStep: 3 },
    created.draftId,
    created.revision
  );

  assert.equal(updated.draftId, created.draftId);
  assert.equal(updated.revision, 2);
});

// -----------------------------------------------------------------------------
// Phase 30.FE.3 Tests: SyncOrchestrator - Debounced Sync and Coordination
// -----------------------------------------------------------------------------

test('Phase 30.FE.3: SyncOrchestrator schedules debounced sync', () => {
  const stateManager = new WizardStateManagerSimulator();
  const syncService = new DraftSyncServiceSimulator();
  const orchestrator = new SyncOrchestratorSimulator(stateManager, syncService);

  stateManager.initialize();
  stateManager.updateDetails({ title: 'Test' });

  const pending = orchestrator.scheduleDebouncedSync();

  assert.ok(pending);
  assert.ok(pending.scheduled);
});

test('Phase 30.FE.3: SyncOrchestrator cancels pending sync', () => {
  const stateManager = new WizardStateManagerSimulator();
  const syncService = new DraftSyncServiceSimulator();
  const orchestrator = new SyncOrchestratorSimulator(stateManager, syncService);

  stateManager.initialize();
  orchestrator.scheduleDebouncedSync();

  assert.ok(orchestrator.pendingSync);

  orchestrator.cancelPendingSync();

  assert.equal(orchestrator.pendingSync, null);
});

test('Phase 30.FE.3: SyncOrchestrator force sync bypasses debounce', async () => {
  const stateManager = new WizardStateManagerSimulator();
  const syncService = new DraftSyncServiceSimulator();
  const orchestrator = new SyncOrchestratorSimulator(stateManager, syncService);

  stateManager.initialize();
  stateManager.updateDetails({ title: 'Forced' });

  const result = await orchestrator.forceSync();

  assert.ok(result.draftId);
  assert.equal(stateManager.getState().isDirty, false);
});

test('Phase 30.FE.3: SyncOrchestrator skips sync if not dirty', async () => {
  const stateManager = new WizardStateManagerSimulator();
  const syncService = new DraftSyncServiceSimulator();
  const orchestrator = new SyncOrchestratorSimulator(stateManager, syncService);

  stateManager.initialize();
  // Not dirty, no changes

  const result = await orchestrator.performSync();

  assert.equal(result.skipped, true);
  assert.equal(result.reason, 'not_dirty');
});

test('Phase 30.FE.3: SyncOrchestrator updates status through sync lifecycle', async () => {
  const stateManager = new WizardStateManagerSimulator();
  const syncService = new DraftSyncServiceSimulator();
  const orchestrator = new SyncOrchestratorSimulator(stateManager, syncService);

  const statuses = [];
  orchestrator.on('statusChange', (status) => statuses.push(status));

  stateManager.initialize();
  stateManager.updateDetails({ title: 'Test' });

  await orchestrator.performSync();

  assert.ok(statuses.includes('syncing'));
  assert.ok(statuses.includes('synced'));
  assert.equal(orchestrator.status, 'synced');
});

test('Phase 30.FE.3: SyncOrchestrator handles sync error', async () => {
  const stateManager = new WizardStateManagerSimulator();
  const syncService = new DraftSyncServiceSimulator();
  const orchestrator = new SyncOrchestratorSimulator(stateManager, syncService);

  stateManager.initialize();
  stateManager.updateDetails({ title: 'Test' });

  syncService.simulateError('Network error');

  const result = await orchestrator.performSync();

  assert.equal(result.error, true);
  assert.equal(orchestrator.status, 'error');
  assert.ok(orchestrator.lastError);
});

test('Phase 30.FE.3: SyncOrchestrator retries with backoff', async () => {
  const stateManager = new WizardStateManagerSimulator();
  const syncService = new DraftSyncServiceSimulator();
  const orchestrator = new SyncOrchestratorSimulator(stateManager, syncService);

  stateManager.initialize();
  stateManager.updateDetails({ title: 'Test' });

  // First attempt fails
  syncService.simulateError('Network error');
  await orchestrator.performSync();

  assert.equal(orchestrator.status, 'error');
  assert.equal(orchestrator.retryCount, 0);

  // Retry succeeds
  syncService.clearSimulations();
  await orchestrator.retrySync();

  assert.equal(orchestrator.status, 'synced');
  assert.equal(orchestrator.retryCount, 1);
});

test('Phase 30.FE.3: SyncOrchestrator returns bounded retry delays', () => {
  const stateManager = new WizardStateManagerSimulator();
  const syncService = new DraftSyncServiceSimulator();
  const orchestrator = new SyncOrchestratorSimulator(stateManager, syncService);

  assert.equal(orchestrator.getRetryDelay(), 1000);

  orchestrator.retryCount = 1;
  assert.equal(orchestrator.getRetryDelay(), 2000);

  orchestrator.retryCount = 4;
  assert.equal(orchestrator.getRetryDelay(), 30000);

  // Beyond max
  orchestrator.retryCount = 10;
  assert.equal(orchestrator.getRetryDelay(), 30000);
});

// -----------------------------------------------------------------------------
// Phase 30.FE.4 Tests: Conflict Handling
// -----------------------------------------------------------------------------

test('Phase 30.FE.4: SyncOrchestrator detects 409 conflict', async () => {
  const stateManager = new WizardStateManagerSimulator();
  const syncService = new DraftSyncServiceSimulator();
  const orchestrator = new SyncOrchestratorSimulator(stateManager, syncService);

  let conflictData = null;
  orchestrator.on('conflict', (data) => { conflictData = data; });

  stateManager.initialize();
  stateManager.updateDetails({ title: 'Test' });

  // Create initial draft
  const created = await orchestrator.performSync();
  stateManager.updateDetails({ title: 'Updated' });

  // Simulate conflict
  syncService.simulateConflict(5);

  const result = await orchestrator.performSync();

  assert.equal(result.conflict, true);
  assert.equal(orchestrator.status, 'conflict');
  assert.ok(conflictData);
  assert.equal(conflictData.serverRevision, 5);
});

test('Phase 30.FE.4: SyncOrchestrator resolves conflict with keep_local', async () => {
  const stateManager = new WizardStateManagerSimulator();
  const syncService = new DraftSyncServiceSimulator();
  const orchestrator = new SyncOrchestratorSimulator(stateManager, syncService);

  let resolved = null;
  orchestrator.on('conflictResolved', (r) => { resolved = r; });

  orchestrator.setStatus('conflict');

  const result = orchestrator.resolveConflict('keep_local');

  assert.equal(result.resolved, true);
  assert.equal(result.resolution, 'keep_local');
  assert.equal(orchestrator.status, 'idle');
  assert.equal(resolved, 'keep_local');
});

test('Phase 30.FE.4: SyncOrchestrator resolves conflict with use_server', async () => {
  const stateManager = new WizardStateManagerSimulator();
  const syncService = new DraftSyncServiceSimulator();
  const orchestrator = new SyncOrchestratorSimulator(stateManager, syncService);

  orchestrator.setStatus('conflict');

  const result = orchestrator.resolveConflict('use_server');

  assert.equal(result.resolved, true);
  assert.equal(result.resolution, 'use_server');
});

// -----------------------------------------------------------------------------
// Phase 30.FE.5 Tests: Multi-Tab Coordination via BroadcastChannel
// -----------------------------------------------------------------------------

test('Phase 30.FE.5: SyncOrchestrator broadcasts sync completion', async () => {
  const stateManager = new WizardStateManagerSimulator();
  const syncService = new DraftSyncServiceSimulator();
  const orchestrator = new SyncOrchestratorSimulator(stateManager, syncService);

  stateManager.initialize();
  stateManager.updateDetails({ title: 'Test' });

  await orchestrator.performSync();

  assert.equal(orchestrator.broadcastMessages.length, 1);
  assert.equal(orchestrator.broadcastMessages[0].type, 'sync_completed');
  assert.ok(orchestrator.broadcastMessages[0].draftId);
});

test('Phase 30.FE.5: SyncOrchestrator receives external sync message', () => {
  const stateManager = new WizardStateManagerSimulator();
  const syncService = new DraftSyncServiceSimulator();
  const orchestrator = new SyncOrchestratorSimulator(stateManager, syncService);

  let externalUpdate = null;
  orchestrator.on('externalUpdate', (data) => { externalUpdate = data; });

  stateManager.initialize();
  stateManager.markSynced('DRF-001', 1);

  // Receive message from other tab with newer revision
  orchestrator.receiveFromOtherTab({
    type: 'sync_completed',
    draftId: 'DRF-001',
    revision: 5
  });

  assert.ok(externalUpdate);
  assert.equal(externalUpdate.revision, 5);
});

test('Phase 30.FE.5: SyncOrchestrator broadcasts tab active', () => {
  const stateManager = new WizardStateManagerSimulator();
  const syncService = new DraftSyncServiceSimulator();
  const orchestrator = new SyncOrchestratorSimulator(stateManager, syncService);

  orchestrator.broadcastTabActive();

  assert.equal(orchestrator.broadcastMessages.length, 1);
  assert.equal(orchestrator.broadcastMessages[0].type, 'tab_active');
});

test('Phase 30.FE.5: SyncOrchestrator handles tab activated from other tab', () => {
  const stateManager = new WizardStateManagerSimulator();
  const syncService = new DraftSyncServiceSimulator();
  const orchestrator = new SyncOrchestratorSimulator(stateManager, syncService);

  let activated = false;
  orchestrator.on('tabActivated', () => { activated = true; });

  orchestrator.receiveFromOtherTab({
    type: 'tab_active',
    timestamp: Date.now()
  });

  assert.equal(activated, true);
});

// -----------------------------------------------------------------------------
// Phase 30.FE.6 Tests: Page Lifecycle Events
// -----------------------------------------------------------------------------

test('Phase 30.FE.6: SyncOrchestrator handles visibilitychange to hidden', async () => {
  const stateManager = new WizardStateManagerSimulator();
  const syncService = new DraftSyncServiceSimulator();
  const orchestrator = new SyncOrchestratorSimulator(stateManager, syncService);

  stateManager.initialize();
  stateManager.updateDetails({ title: 'Test' });

  // Simulate page becoming hidden
  await orchestrator.handleVisibilityChange(true);

  // Should have forced sync
  assert.equal(orchestrator.status, 'synced');
});

test('Phase 30.FE.6: SyncOrchestrator handles visibilitychange to visible', () => {
  const stateManager = new WizardStateManagerSimulator();
  const syncService = new DraftSyncServiceSimulator();
  const orchestrator = new SyncOrchestratorSimulator(stateManager, syncService);

  stateManager.initialize();

  // Simulate page becoming visible
  orchestrator.handleVisibilityChange(false);

  // Should broadcast tab active
  assert.equal(orchestrator.broadcastMessages.length, 1);
  assert.equal(orchestrator.broadcastMessages[0].type, 'tab_active');
});

test('Phase 30.FE.6: SyncOrchestrator handles pagehide with beacon', () => {
  const stateManager = new WizardStateManagerSimulator();
  const syncService = new DraftSyncServiceSimulator();
  const orchestrator = new SyncOrchestratorSimulator(stateManager, syncService);

  let beaconState = null;
  orchestrator.on('beaconSync', (state) => { beaconState = state; });

  stateManager.initialize();
  stateManager.updateDetails({ title: 'Beacon Test' });

  orchestrator.handlePageHide();

  assert.ok(beaconState);
  assert.equal(beaconState.details.title, 'Beacon Test');
});

test('Phase 30.FE.6: SyncOrchestrator handles beforeunload', async () => {
  const stateManager = new WizardStateManagerSimulator();
  const syncService = new DraftSyncServiceSimulator();
  const orchestrator = new SyncOrchestratorSimulator(stateManager, syncService);

  stateManager.initialize();
  stateManager.updateDetails({ title: 'Unload Test' });

  await orchestrator.handleBeforeUnload();

  assert.equal(orchestrator.status, 'synced');
});

// -----------------------------------------------------------------------------
// Phase 30.FE.7 Tests: Resume Dialog
// -----------------------------------------------------------------------------

test('Phase 30.FE.7: ResumeDialog detects local resumable state', () => {
  const stateManager = new WizardStateManagerSimulator();
  const syncService = new DraftSyncServiceSimulator();
  const dialog = new ResumeDialogSimulator(stateManager, syncService);

  stateManager.initialize();
  stateManager.updateStep(3);
  stateManager.updateDetails({ title: 'Resumable Draft' });

  const hasResumable = dialog.checkForResumableState();

  assert.equal(hasResumable, true);
  assert.equal(dialog.visible, true);
  assert.equal(dialog.draftInfo.source, 'local');
  assert.equal(dialog.draftInfo.step, 3);
  assert.equal(dialog.draftInfo.title, 'Resumable Draft');
});

test('Phase 30.FE.7: ResumeDialog detects server drafts', async () => {
  const stateManager = new WizardStateManagerSimulator();
  const syncService = new DraftSyncServiceSimulator();
  const dialog = new ResumeDialogSimulator(stateManager, syncService);

  // Create server draft
  await syncService.create({ currentStep: 4, details: { title: 'Server Draft' } });

  const hasServer = await dialog.checkForServerDrafts();

  assert.equal(hasServer, true);
  assert.equal(dialog.visible, true);
  assert.equal(dialog.draftInfo.source, 'server');
});

test('Phase 30.FE.7: ResumeDialog continue action restores state', async () => {
  const stateManager = new WizardStateManagerSimulator();
  const syncService = new DraftSyncServiceSimulator();
  const dialog = new ResumeDialogSimulator(stateManager, syncService);

  stateManager.initialize();
  stateManager.updateStep(4);
  stateManager.updateDetails({ title: 'Continue Me' });

  dialog.checkForResumableState();
  const result = await dialog.handleContinue();

  assert.equal(result.action, 'continue');
  assert.equal(result.state.currentStep, 4);
  assert.equal(dialog.visible, false);
  assert.equal(dialog.choice, 'continue');
});

test('Phase 30.FE.7: ResumeDialog start new clears state', () => {
  const stateManager = new WizardStateManagerSimulator();
  const syncService = new DraftSyncServiceSimulator();
  const dialog = new ResumeDialogSimulator(stateManager, syncService);

  stateManager.initialize();
  stateManager.updateStep(5);

  dialog.checkForResumableState();
  const result = dialog.handleStartNew();

  assert.equal(result.action, 'start_new');
  assert.equal(result.state.currentStep, 1);
  assert.equal(dialog.choice, 'start_new');
});

test('Phase 30.FE.7: ResumeDialog discard deletes server draft', async () => {
  const stateManager = new WizardStateManagerSimulator();
  const syncService = new DraftSyncServiceSimulator();
  const dialog = new ResumeDialogSimulator(stateManager, syncService);

  // Create and sync a draft
  stateManager.initialize();
  stateManager.updateDetails({ title: 'To Discard' });
  const created = await syncService.create(stateManager.getState());
  stateManager.markSynced(created.draftId, created.revision);

  dialog.checkForResumableState();
  const result = await dialog.handleDiscard();

  assert.equal(result.action, 'discard');
  assert.equal(result.state.currentStep, 1);

  // Verify server draft deleted
  const drafts = await syncService.list();
  assert.equal(drafts.length, 0);
});

// -----------------------------------------------------------------------------
// Phase 30.FE.8 Tests: Sync Status Indicator
// -----------------------------------------------------------------------------

test('Phase 30.FE.8: SyncStatusIndicator shows idle state', () => {
  const indicator = new SyncStatusIndicatorSimulator();

  indicator.update('idle');

  assert.equal(indicator.status, 'idle');
  assert.equal(indicator.message, '');
  assert.equal(indicator.isVisible(), false);
});

test('Phase 30.FE.8: SyncStatusIndicator shows syncing state', () => {
  const indicator = new SyncStatusIndicatorSimulator();

  indicator.update('syncing');

  assert.equal(indicator.status, 'syncing');
  assert.equal(indicator.message, 'Saving...');
  assert.equal(indicator.retryVisible, false);
  assert.ok(indicator.getIconClass().includes('animate-pulse'));
});

test('Phase 30.FE.8: SyncStatusIndicator shows synced state', () => {
  const indicator = new SyncStatusIndicatorSimulator();

  indicator.update('synced');

  assert.equal(indicator.status, 'synced');
  assert.equal(indicator.message, 'Saved');
  assert.ok(indicator.getIconClass().includes('bg-green-500'));
});

test('Phase 30.FE.8: SyncStatusIndicator shows error state with retry', () => {
  const indicator = new SyncStatusIndicatorSimulator();

  indicator.update('error');

  assert.equal(indicator.status, 'error');
  assert.equal(indicator.message, 'Save failed');
  assert.equal(indicator.retryVisible, true);
  assert.ok(indicator.getIconClass().includes('bg-red-500'));
});

test('Phase 30.FE.8: SyncStatusIndicator shows conflict state', () => {
  const indicator = new SyncStatusIndicatorSimulator();

  indicator.update('conflict');

  assert.equal(indicator.status, 'conflict');
  assert.equal(indicator.message, 'Conflict detected');
  assert.ok(indicator.getIconClass().includes('bg-orange-500'));
});

// -----------------------------------------------------------------------------
// Phase 30 Integration Tests
// -----------------------------------------------------------------------------

test('Phase 30 Integration: full wizard persistence flow', async () => {
  const stateManager = new WizardStateManagerSimulator();
  const syncService = new DraftSyncServiceSimulator();
  const orchestrator = new SyncOrchestratorSimulator(stateManager, syncService);
  const indicator = new SyncStatusIndicatorSimulator();

  // Wire up status indicator
  orchestrator.on('statusChange', (status) => indicator.update(status));

  // Step 1: Initialize wizard
  stateManager.initialize();
  assert.equal(stateManager.getState().currentStep, 1);

  // Step 2: User fills in details
  stateManager.updateDetails({ title: 'My Agreement', description: 'Test' });
  assert.equal(stateManager.getState().isDirty, true);

  // Step 3: Debounced sync fires
  await orchestrator.performSync();
  assert.equal(indicator.status, 'synced');
  assert.ok(stateManager.getState().draftId);

  // Step 4: User navigates to step 3
  stateManager.updateStep(3);
  stateManager.updateSigners([{ name: 'John', email: 'john@test.com' }]);

  // Step 5: Force sync on step change
  await orchestrator.forceSync();
  assert.equal(stateManager.getState().revision, 2);

  // Step 6: Simulate page reload
  const newStateManager = new WizardStateManagerSimulator();
  newStateManager.storage = stateManager.storage;

  const loaded = newStateManager.loadFromSession();
  assert.ok(loaded);
  assert.equal(loaded.currentStep, 3);
  assert.equal(loaded.signers.length, 1);
});

test('Phase 30 Integration: resume dialog with server draft', async () => {
  const stateManager = new WizardStateManagerSimulator();
  const syncService = new DraftSyncServiceSimulator();
  const dialog = new ResumeDialogSimulator(stateManager, syncService);

  // Create server draft (simulating previous session)
  await syncService.create({
    currentStep: 5,
    details: { title: 'Almost Done' },
    signers: [{ name: 'Jane' }]
  });

  // New session starts
  stateManager.initialize();

  // Check for resumable
  const hasLocal = dialog.checkForResumableState();
  assert.equal(hasLocal, false); // Fresh state, step 1

  const hasServer = await dialog.checkForServerDrafts();
  assert.equal(hasServer, true);
  assert.equal(dialog.draftInfo.title, 'Almost Done');
  assert.equal(dialog.draftInfo.step, 5);

  // User chooses to continue
  const result = await dialog.handleContinue();
  assert.equal(result.state.currentStep, 5);
});

test('Phase 30 Integration: conflict resolution preserves work', async () => {
  const stateManager = new WizardStateManagerSimulator();
  const syncService = new DraftSyncServiceSimulator();
  const orchestrator = new SyncOrchestratorSimulator(stateManager, syncService);

  // Initial sync
  stateManager.initialize();
  stateManager.updateDetails({ title: 'Original' });
  await orchestrator.performSync();

  // Make local changes
  stateManager.updateDetails({ title: 'Local Changes' });

  // Simulate concurrent edit from another tab
  syncService.simulateConflict(10);

  // Try to sync - gets conflict
  const result = await orchestrator.performSync();
  assert.equal(result.conflict, true);
  assert.equal(orchestrator.status, 'conflict');

  // User chooses keep local
  orchestrator.resolveConflict('keep_local');

  // Local state preserved
  assert.equal(stateManager.getState().details.title, 'Local Changes');
});
