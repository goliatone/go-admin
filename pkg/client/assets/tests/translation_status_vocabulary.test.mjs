/**
 * Translation Status Vocabulary Tests (Phase 5 - TX-052)
 */

import { describe, it, mock } from 'node:test';
import assert from 'node:assert';

// Mock DOM environment
const createMockElement = (tag) => ({
  tagName: tag.toUpperCase(),
  innerHTML: '',
  style: {},
  dataset: {},
  addEventListener: mock.fn(),
});

global.document = {
  createElement: createMockElement,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: mock.fn(),
  body: createMockElement('body'),
  head: createMockElement('head'),
  documentElement: createMockElement('html'),
};

global.window = {
  addEventListener: mock.fn(),
  localStorage: { getItem: () => null, setItem: mock.fn() },
  sessionStorage: { getItem: () => null, setItem: mock.fn() },
  matchMedia: () => ({ matches: false, addEventListener: mock.fn() }),
};

global.HTMLElement = class HTMLElement {};
global.Event = class Event { constructor(t) { this.type = t; } };
global.CustomEvent = class CustomEvent extends global.Event { constructor(t, o) { super(t); this.detail = o?.detail; } };
global.MutationObserver = class { observe() {} disconnect() {} };

// Import from compiled dist
const {
  // Display configurations
  CORE_READINESS_DISPLAY,
  QUEUE_STATE_DISPLAY,
  QUEUE_CONTENT_STATE_DISPLAY,
  QUEUE_DUE_STATE_DISPLAY,
  EXCHANGE_ROW_STATUS_DISPLAY,
  EXCHANGE_JOB_STATUS_DISPLAY,
  DISABLED_REASON_DISPLAY,
  // Lookup functions
  getStatusDisplay,
  getDisabledReasonDisplay,
  isValidStatus,
  isValidReasonCode,
  getStatusesForDomain,
  getAllReasonCodes,
  // Rendering functions
  renderVocabularyStatusBadge,
  renderReasonCodeBadge,
  renderReasonCodeIndicator,
  // Cell renderer factories
  createStatusCellRenderer,
  createReasonCodeCellRenderer,
  // Styles
  getStatusVocabularyStyles,
} = await import('../dist/datatable/index.js');

// ============================================================================
// Display Configuration Tests
// ============================================================================

describe('CORE_READINESS_DISPLAY', () => {
  it('should have all core readiness states', () => {
    const states = ['ready', 'missing_locales', 'missing_fields', 'missing_locales_and_fields'];
    for (const state of states) {
      assert.ok(CORE_READINESS_DISPLAY[state], `Missing state: ${state}`);
    }
  });

  it('should have required display properties for each state', () => {
    for (const [key, config] of Object.entries(CORE_READINESS_DISPLAY)) {
      assert.ok(config.label, `${key} missing label`);
      assert.ok(config.colorClass, `${key} missing colorClass`);
      assert.ok(config.bgClass, `${key} missing bgClass`);
      assert.ok(config.textClass, `${key} missing textClass`);
      assert.ok(config.icon, `${key} missing icon`);
      assert.ok(config.iconType, `${key} missing iconType`);
      assert.ok(config.severity, `${key} missing severity`);
    }
  });

  it('should use character icons for matrix display', () => {
    assert.strictEqual(CORE_READINESS_DISPLAY.ready.icon, '●');
    assert.strictEqual(CORE_READINESS_DISPLAY.missing_locales.icon, '○');
    assert.strictEqual(CORE_READINESS_DISPLAY.missing_fields.icon, '◐');
  });
});

describe('QUEUE_STATE_DISPLAY', () => {
  it('should have all queue states', () => {
    const states = ['pending', 'assigned', 'in_progress', 'review', 'rejected', 'approved', 'published', 'archived'];
    for (const state of states) {
      assert.ok(QUEUE_STATE_DISPLAY[state], `Missing state: ${state}`);
    }
  });

  it('should have correct severity levels', () => {
    assert.strictEqual(QUEUE_STATE_DISPLAY.pending.severity, 'neutral');
    assert.strictEqual(QUEUE_STATE_DISPLAY.assigned.severity, 'info');
    assert.strictEqual(QUEUE_STATE_DISPLAY.rejected.severity, 'error');
    assert.strictEqual(QUEUE_STATE_DISPLAY.approved.severity, 'success');
  });
});

describe('QUEUE_DUE_STATE_DISPLAY', () => {
  it('should have all due states', () => {
    const states = ['overdue', 'due_soon', 'on_track', 'none'];
    for (const state of states) {
      assert.ok(QUEUE_DUE_STATE_DISPLAY[state], `Missing state: ${state}`);
    }
  });

  it('should have appropriate severity for urgency', () => {
    assert.strictEqual(QUEUE_DUE_STATE_DISPLAY.overdue.severity, 'error');
    assert.strictEqual(QUEUE_DUE_STATE_DISPLAY.due_soon.severity, 'warning');
    assert.strictEqual(QUEUE_DUE_STATE_DISPLAY.on_track.severity, 'success');
  });
});

describe('EXCHANGE_ROW_STATUS_DISPLAY', () => {
  it('should have all exchange row statuses', () => {
    const statuses = ['success', 'error', 'conflict', 'skipped'];
    for (const status of statuses) {
      assert.ok(EXCHANGE_ROW_STATUS_DISPLAY[status], `Missing status: ${status}`);
    }
  });
});

describe('EXCHANGE_JOB_STATUS_DISPLAY', () => {
  it('should have all exchange job statuses', () => {
    const statuses = ['running', 'completed', 'failed'];
    for (const status of statuses) {
      assert.ok(EXCHANGE_JOB_STATUS_DISPLAY[status], `Missing status: ${status}`);
    }
  });
});

describe('DISABLED_REASON_DISPLAY', () => {
  it('should have all canonical reason codes', () => {
    const codes = ['TRANSLATION_MISSING', 'INVALID_STATUS', 'PERMISSION_DENIED', 'MISSING_CONTEXT', 'FEATURE_DISABLED'];
    for (const code of codes) {
      assert.ok(DISABLED_REASON_DISPLAY[code], `Missing code: ${code}`);
    }
  });

  it('should have required display properties', () => {
    for (const [key, config] of Object.entries(DISABLED_REASON_DISPLAY)) {
      assert.ok(config.message, `${key} missing message`);
      assert.ok(config.shortMessage, `${key} missing shortMessage`);
      assert.ok(config.colorClass, `${key} missing colorClass`);
      assert.ok(config.icon, `${key} missing icon`);
      assert.ok(config.severity, `${key} missing severity`);
      assert.ok(typeof config.actionable === 'boolean', `${key} missing actionable`);
    }
  });

  it('should mark TRANSLATION_MISSING as actionable', () => {
    assert.strictEqual(DISABLED_REASON_DISPLAY.TRANSLATION_MISSING.actionable, true);
    assert.ok(DISABLED_REASON_DISPLAY.TRANSLATION_MISSING.actionLabel);
  });

  it('should mark PERMISSION_DENIED as non-actionable', () => {
    assert.strictEqual(DISABLED_REASON_DISPLAY.PERMISSION_DENIED.actionable, false);
  });
});

// ============================================================================
// Lookup Function Tests
// ============================================================================

describe('getStatusDisplay', () => {
  it('should return display config for valid core status', () => {
    const display = getStatusDisplay('ready', 'core');
    assert.ok(display);
    assert.strictEqual(display.label, 'Ready');
    assert.strictEqual(display.severity, 'success');
  });

  it('should return display config for valid queue status', () => {
    const display = getStatusDisplay('in_progress', 'queue');
    assert.ok(display);
    assert.strictEqual(display.label, 'In Progress');
  });

  it('should return display config for valid exchange status', () => {
    const display = getStatusDisplay('conflict', 'exchange');
    assert.ok(display);
    assert.strictEqual(display.label, 'Conflict');
  });

  it('should find status across all domains when no domain specified', () => {
    const display = getStatusDisplay('overdue');
    assert.ok(display);
    assert.strictEqual(display.label, 'Overdue');
  });

  it('should be case-insensitive', () => {
    const upper = getStatusDisplay('READY');
    const lower = getStatusDisplay('ready');
    const mixed = getStatusDisplay('Ready');
    assert.ok(upper);
    assert.ok(lower);
    assert.ok(mixed);
    assert.strictEqual(upper.label, lower.label);
    assert.strictEqual(lower.label, mixed.label);
  });

  it('should return null for unknown status', () => {
    const display = getStatusDisplay('unknown_status');
    assert.strictEqual(display, null);
  });
});

describe('getDisabledReasonDisplay', () => {
  it('should return display config for valid reason code', () => {
    const display = getDisabledReasonDisplay('TRANSLATION_MISSING');
    assert.ok(display);
    assert.strictEqual(display.shortMessage, 'Translation missing');
  });

  it('should be case-insensitive', () => {
    const upper = getDisabledReasonDisplay('PERMISSION_DENIED');
    const lower = getDisabledReasonDisplay('permission_denied');
    assert.ok(upper);
    assert.ok(lower);
    assert.strictEqual(upper.shortMessage, lower.shortMessage);
  });

  it('should return null for unknown code', () => {
    const display = getDisabledReasonDisplay('UNKNOWN_CODE');
    assert.strictEqual(display, null);
  });
});

describe('isValidStatus', () => {
  it('should return true for valid statuses', () => {
    assert.strictEqual(isValidStatus('ready'), true);
    assert.strictEqual(isValidStatus('in_progress'), true);
    assert.strictEqual(isValidStatus('completed'), true);
  });

  it('should return false for invalid statuses', () => {
    assert.strictEqual(isValidStatus('invalid'), false);
    assert.strictEqual(isValidStatus(''), false);
  });

  it('should respect domain filter', () => {
    // 'ready' exists in both core and queue content states
    assert.strictEqual(isValidStatus('ready', 'core'), true);
    // 'pending' is queue-only
    assert.strictEqual(isValidStatus('pending', 'queue'), true);
    assert.strictEqual(isValidStatus('pending', 'core'), false);
  });
});

describe('isValidReasonCode', () => {
  it('should return true for valid codes', () => {
    assert.strictEqual(isValidReasonCode('TRANSLATION_MISSING'), true);
    assert.strictEqual(isValidReasonCode('PERMISSION_DENIED'), true);
  });

  it('should return false for invalid codes', () => {
    assert.strictEqual(isValidReasonCode('UNKNOWN'), false);
  });
});

describe('getStatusesForDomain', () => {
  it('should return core statuses for core domain', () => {
    const statuses = getStatusesForDomain('core');
    assert.ok(statuses.includes('ready'));
    assert.ok(statuses.includes('missing_locales'));
    assert.strictEqual(statuses.length, 4);
  });

  it('should return queue statuses for queue domain', () => {
    const statuses = getStatusesForDomain('queue');
    assert.ok(statuses.includes('pending'));
    assert.ok(statuses.includes('overdue'));
    assert.ok(statuses.includes('draft'));
  });

  it('should return exchange statuses for exchange domain', () => {
    const statuses = getStatusesForDomain('exchange');
    assert.ok(statuses.includes('success'));
    assert.ok(statuses.includes('running'));
  });
});

describe('getAllReasonCodes', () => {
  it('should return all reason codes', () => {
    const codes = getAllReasonCodes();
    assert.ok(codes.includes('TRANSLATION_MISSING'));
    assert.ok(codes.includes('PERMISSION_DENIED'));
    assert.ok(codes.includes('FEATURE_DISABLED'));
    assert.strictEqual(codes.length, 5);
  });
});

// ============================================================================
// Rendering Function Tests
// ============================================================================

describe('renderStatusBadge', () => {
  it('should render valid status as badge HTML', () => {
    const html = renderStatusBadge('ready');
    assert.ok(html.includes('Ready'));
    assert.ok(html.includes('data-status="ready"'));
    assert.ok(html.includes('bg-green-100'));
  });

  it('should render unknown status with fallback styling', () => {
    const html = renderStatusBadge('unknown');
    assert.ok(html.includes('unknown'));
    assert.ok(html.includes('bg-gray-100'));
  });

  it('should support size option', () => {
    const xs = renderStatusBadge('ready', { size: 'xs' });
    const sm = renderStatusBadge('ready', { size: 'sm' });
    const def = renderStatusBadge('ready', { size: 'default' });

    assert.ok(xs.includes('text-[10px]'));
    assert.ok(sm.includes('text-xs'));
    assert.ok(def.includes('text-xs'));
  });

  it('should support icon-only mode', () => {
    const html = renderStatusBadge('ready', { showIcon: true, showLabel: false });
    assert.ok(!html.includes('>Ready<'));
  });

  it('should support label-only mode', () => {
    const html = renderStatusBadge('ready', { showIcon: false, showLabel: true });
    assert.ok(html.includes('Ready'));
  });

  it('should escape HTML in status names', () => {
    const html = renderStatusBadge('<script>alert(1)</script>');
    assert.ok(!html.includes('<script>'));
    assert.ok(html.includes('&lt;script&gt;'));
  });
});

describe('renderReasonCodeBadge', () => {
  it('should render valid reason code as badge', () => {
    const html = renderReasonCodeBadge('TRANSLATION_MISSING');
    assert.ok(html.includes('Translation missing'));
    assert.ok(html.includes('data-reason-code="TRANSLATION_MISSING"'));
  });

  it('should render unknown code as plain text', () => {
    const html = renderReasonCodeBadge('UNKNOWN');
    assert.ok(html.includes('UNKNOWN'));
  });

  it('should support full message mode', () => {
    const short = renderReasonCodeBadge('TRANSLATION_MISSING', { showFullMessage: false });
    const full = renderReasonCodeBadge('TRANSLATION_MISSING', { showFullMessage: true });

    assert.ok(short.includes('Translation missing'));
    assert.ok(full.includes('Required translation is missing'));
  });
});

describe('renderReasonCodeIndicator', () => {
  it('should render compact indicator', () => {
    const html = renderReasonCodeIndicator('PERMISSION_DENIED');
    assert.ok(html.includes('data-reason-code="PERMISSION_DENIED"'));
    assert.ok(html.includes('w-5 h-5'));
    assert.ok(html.includes('rounded-full'));
  });

  it('should support custom tooltip', () => {
    const html = renderReasonCodeIndicator('PERMISSION_DENIED', 'Custom tooltip');
    assert.ok(html.includes('title="Custom tooltip"'));
  });

  it('should return empty for unknown code', () => {
    const html = renderReasonCodeIndicator('UNKNOWN');
    assert.strictEqual(html, '');
  });
});

// ============================================================================
// Cell Renderer Factory Tests
// ============================================================================

describe('createStatusCellRenderer', () => {
  it('should create a callable renderer function', () => {
    const renderer = createStatusCellRenderer();
    assert.strictEqual(typeof renderer, 'function');
  });

  it('should render status values', () => {
    const renderer = createStatusCellRenderer();
    const html = renderer('ready', {}, 'status');
    assert.ok(html.includes('Ready'));
  });

  it('should handle null/undefined values', () => {
    const renderer = createStatusCellRenderer();
    const htmlNull = renderer(null, {}, 'status');
    const htmlUndef = renderer(undefined, {}, 'status');

    assert.ok(htmlNull.includes('-'));
    assert.ok(htmlUndef.includes('-'));
  });

  it('should respect domain option', () => {
    const coreRenderer = createStatusCellRenderer({ domain: 'core' });
    const queueRenderer = createStatusCellRenderer({ domain: 'queue' });

    const coreHtml = coreRenderer('ready', {}, 'status');
    const queueHtml = queueRenderer('pending', {}, 'status');

    assert.ok(coreHtml.includes('Ready'));
    assert.ok(queueHtml.includes('Pending'));
  });
});

describe('createReasonCodeCellRenderer', () => {
  it('should create a callable renderer function', () => {
    const renderer = createReasonCodeCellRenderer();
    assert.strictEqual(typeof renderer, 'function');
  });

  it('should render reason codes', () => {
    const renderer = createReasonCodeCellRenderer();
    const html = renderer('PERMISSION_DENIED', {}, 'reason');
    assert.ok(html.includes('No permission'));
  });

  it('should handle empty values', () => {
    const renderer = createReasonCodeCellRenderer();
    const html = renderer('', {}, 'reason');
    assert.strictEqual(html, '');
  });
});

// ============================================================================
// CSS Styles Tests
// ============================================================================

describe('getStatusVocabularyStyles', () => {
  it('should return CSS string', () => {
    const css = getStatusVocabularyStyles();
    assert.ok(typeof css === 'string');
    assert.ok(css.length > 0);
  });

  it('should include data attribute selectors', () => {
    const css = getStatusVocabularyStyles();
    assert.ok(css.includes('[data-status]'));
    assert.ok(css.includes('[data-reason-code]'));
  });

  it('should include animation for critical states', () => {
    const css = getStatusVocabularyStyles();
    assert.ok(css.includes('pulse-subtle'));
    assert.ok(css.includes('[data-status="overdue"]'));
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Status Vocabulary Integration', () => {
  it('should have consistent color classes across related states', () => {
    // Success states should all use green
    assert.ok(CORE_READINESS_DISPLAY.ready.bgClass.includes('green'));
    assert.ok(QUEUE_STATE_DISPLAY.approved.bgClass.includes('green'));
    assert.ok(EXCHANGE_ROW_STATUS_DISPLAY.success.bgClass.includes('green'));

    // Error states should all use red
    assert.ok(CORE_READINESS_DISPLAY.missing_locales_and_fields.bgClass.includes('red'));
    assert.ok(QUEUE_STATE_DISPLAY.rejected.bgClass.includes('red'));
    assert.ok(EXCHANGE_ROW_STATUS_DISPLAY.error.bgClass.includes('red'));
  });

  it('should have consistent severity levels', () => {
    // All success states should have success severity
    assert.strictEqual(CORE_READINESS_DISPLAY.ready.severity, 'success');
    assert.strictEqual(QUEUE_STATE_DISPLAY.approved.severity, 'success');
    assert.strictEqual(EXCHANGE_JOB_STATUS_DISPLAY.completed.severity, 'success');
  });

  it('should have descriptions for all states', () => {
    // Check that all states have descriptions for tooltips
    for (const config of Object.values(CORE_READINESS_DISPLAY)) {
      assert.ok(config.description, 'Missing description in core readiness');
    }
    for (const config of Object.values(QUEUE_STATE_DISPLAY)) {
      assert.ok(config.description, 'Missing description in queue state');
    }
  });
});
