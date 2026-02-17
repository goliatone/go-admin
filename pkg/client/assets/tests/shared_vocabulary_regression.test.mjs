/**
 * Shared Vocabulary Regression Tests (Phase 5 - TX-054)
 *
 * Ensures Phase 1-4 behavior remains unchanged after shared vocabulary adoption.
 * These tests verify that:
 * 1. Phase 1 (Core UX) status rendering uses shared vocabulary consistently
 * 2. Phase 2 (Structural Visibility) status displays use shared vocabulary
 * 3. Phase 3 (Workflow Completion) reason codes use shared vocabulary
 * 4. Phase 4 (Exchange + Queue) status badges use shared vocabulary
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
  appendChild: mock.fn(),
  removeChild: mock.fn(),
  classList: {
    add: mock.fn(),
    remove: mock.fn(),
    contains: () => false,
  },
  querySelectorAll: () => [],
  querySelector: () => null,
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
  localStorage: { getItem: () => null, setItem: mock.fn(), removeItem: mock.fn() },
  sessionStorage: { getItem: () => null, setItem: mock.fn() },
  matchMedia: () => ({ matches: false, addEventListener: mock.fn() }),
  location: { href: 'http://localhost/', search: '', pathname: '/' },
  history: { replaceState: mock.fn() },
};

global.HTMLElement = class HTMLElement {};
global.Event = class Event { constructor(t) { this.type = t; } };
global.CustomEvent = class CustomEvent extends global.Event { constructor(t, o) { super(t); this.detail = o?.detail; } };
global.MutationObserver = class { observe() {} disconnect() {} };
global.setTimeout = (fn) => fn();
global.clearTimeout = () => {};

// Import from compiled dist
const {
  // Shared vocabulary functions (TX-052, TX-053)
  getStatusDisplay,
  getStatusCssClass,
  getSeverityCssClass,
  renderVocabularyStatusBadge,
  renderReasonCodeBadge,
  // Phase 1: Core UX - Translation context
  renderStatusBadge,
  extractTranslationReadiness,
  renderReadinessIndicator,
  // Phase 2: Structural visibility - Quick filters, grouped mode
  renderQuickFiltersHTML,
  renderStatusLegendHTML,
  // Phase 4: Exchange + Queue
  renderDisabledReasonBadge,
} = await import('../dist/datatable/index.js');

// ============================================================================
// Phase 1 Regression: Core UX Foundations
// ============================================================================

describe('Phase 1 Regression: Core UX Status Rendering', () => {
  it('should render readiness_state status badges using shared vocabulary', () => {
    const states = ['ready', 'missing_locales', 'missing_fields', 'missing_locales_and_fields'];

    for (const state of states) {
      const html = renderStatusBadge(state);
      assert.ok(html.length > 0, `renderStatusBadge should render for ${state}`);

      // Verify shared vocabulary provides display config
      const display = getStatusDisplay(state, 'core');
      assert.ok(display, `Shared vocabulary should have config for ${state}`);
      assert.ok(display.label, `Display config for ${state} should have label`);
      assert.ok(display.colorClass, `Display config for ${state} should have colorClass`);
    }
  });

  it('should extract readiness from records using consistent field mapping', () => {
    const record = {
      translation_group_id: 'tg_123',
      translation_readiness: {
        required_locales: ['en', 'es', 'fr'],
        available_locales: ['en'],
        missing_required_locales: ['es', 'fr'],
        readiness_state: 'missing_locales',
        ready_for_transition: { publish: false },
      },
    };

    const readiness = extractTranslationReadiness(record);
    assert.strictEqual(readiness.readinessState, 'missing_locales');
    assert.deepStrictEqual(readiness.missingRequiredLocales, ['es', 'fr']);

    // Verify the state maps to shared vocabulary
    const display = getStatusDisplay(readiness.readinessState, 'core');
    assert.ok(display, 'Extracted state should be valid in shared vocabulary');
    assert.strictEqual(display.severity, 'warning');
  });

  it('should render readiness indicator with correct data attributes', () => {
    const record = {
      translation_readiness: {
        required_locales: ['en', 'es'],
        available_locales: ['en', 'es'],
        missing_required_locales: [],
        readiness_state: 'ready',
        ready_for_transition: { publish: true },
      },
    };

    const html = renderReadinessIndicator(record);
    assert.ok(html.includes('data-readiness-state="ready"'), 'Should include readiness state data attribute');

    // Verify shared vocabulary provides consistent display
    const display = getStatusDisplay('ready', 'core');
    assert.strictEqual(display.severity, 'success');
  });
});

// ============================================================================
// Phase 2 Regression: Structural Translation Visibility
// ============================================================================

describe('Phase 2 Regression: Structural Visibility Components', () => {
  it('should have status legend items aligned with shared vocabulary', () => {
    // Status legend should reflect shared vocabulary states
    const coreStates = ['ready', 'missing_locales', 'missing_fields', 'missing_locales_and_fields'];

    for (const state of coreStates) {
      const display = getStatusDisplay(state, 'core');
      assert.ok(display, `Status legend prerequisite: shared vocabulary has ${state}`);
      assert.ok(display.label, `Label exists for ${state}`);
      assert.ok(display.description, `Description exists for ${state}`);
    }
  });

  it('should provide consistent CSS class derivation for status states', () => {
    // Verify CSS class helper produces expected patterns
    assert.strictEqual(getStatusCssClass('ready', 'core'), 'status-ready');
    assert.strictEqual(getStatusCssClass('missing_locales', 'core'), 'status-missing_locales');
    assert.strictEqual(getStatusCssClass('pending', 'queue'), 'status-pending');
    assert.strictEqual(getStatusCssClass('success', 'exchange'), 'status-success');

    // Unknown statuses should return empty
    assert.strictEqual(getStatusCssClass('invalid_status'), '');
  });

  it('should provide severity-based CSS classes for theming', () => {
    // Core states
    assert.strictEqual(getSeverityCssClass('ready', 'core'), 'severity-success');
    assert.strictEqual(getSeverityCssClass('missing_locales', 'core'), 'severity-warning');
    assert.strictEqual(getSeverityCssClass('missing_locales_and_fields', 'core'), 'severity-error');

    // Queue states
    assert.strictEqual(getSeverityCssClass('pending', 'queue'), 'severity-neutral');
    assert.strictEqual(getSeverityCssClass('overdue', 'queue'), 'severity-error');
    assert.strictEqual(getSeverityCssClass('approved', 'queue'), 'severity-success');

    // Exchange states
    assert.strictEqual(getSeverityCssClass('running', 'exchange'), 'severity-info');
    assert.strictEqual(getSeverityCssClass('completed', 'exchange'), 'severity-success');
    assert.strictEqual(getSeverityCssClass('failed', 'exchange'), 'severity-error');
  });
});

// ============================================================================
// Phase 3 Regression: Workflow Completion UI
// ============================================================================

describe('Phase 3 Regression: Workflow Completion Components', () => {
  it('should have disabled reason codes in shared vocabulary', () => {
    const reasonCodes = [
      'TRANSLATION_MISSING',
      'INVALID_STATUS',
      'PERMISSION_DENIED',
      'MISSING_CONTEXT',
      'FEATURE_DISABLED',
    ];

    for (const code of reasonCodes) {
      const badge = renderReasonCodeBadge(code);
      assert.ok(badge.length > 0, `renderReasonCodeBadge should render for ${code}`);
      assert.ok(badge.includes(`data-reason-code="${code}"`), `Badge should have data attribute for ${code}`);
    }
  });

  it('should render disabled reason badge with consistent styling', () => {
    // renderDisabledReasonBadge takes a GateResult object, not a raw code
    const gateResult = {
      visible: true,
      enabled: false,
      reason: 'Translation missing',
      reasonCode: 'TRANSLATION_MISSING',
    };
    const badge = renderDisabledReasonBadge(gateResult);
    // When reasonCode is valid, it delegates to shared vocabulary renderReasonCodeBadge
    assert.ok(badge.includes('TRANSLATION_MISSING') || badge.includes('Translation missing') || badge.includes('translation'),
      'Badge should contain recognizable reason text or code');
  });

  it('should distinguish actionable vs non-actionable reasons', () => {
    // TRANSLATION_MISSING should be actionable
    const missingBadge = renderReasonCodeBadge('TRANSLATION_MISSING');
    assert.ok(missingBadge.length > 0);

    // PERMISSION_DENIED should not be actionable
    const permBadge = renderReasonCodeBadge('PERMISSION_DENIED');
    assert.ok(permBadge.length > 0);

    // Both should render but may have different styling
    assert.notStrictEqual(missingBadge, permBadge, 'Different reason codes should render differently');
  });
});

// ============================================================================
// Phase 4 Regression: Exchange + Queue UI
// ============================================================================

describe('Phase 4 Regression: Exchange and Queue Components', () => {
  it('should render queue states via shared vocabulary', () => {
    const queueStates = ['pending', 'assigned', 'in_progress', 'review', 'rejected', 'approved', 'published', 'archived'];

    for (const state of queueStates) {
      const html = renderVocabularyStatusBadge(state, { domain: 'queue' });
      assert.ok(html.length > 0, `Queue state ${state} should render`);
      assert.ok(html.includes(`data-status="${state}"`), `Badge should have data attribute for ${state}`);

      // Verify CSS class derivation
      const cssClass = getStatusCssClass(state, 'queue');
      assert.strictEqual(cssClass, `status-${state}`, `CSS class for ${state}`);
    }
  });

  it('should render exchange row statuses via shared vocabulary', () => {
    const rowStatuses = ['success', 'error', 'conflict', 'skipped'];

    for (const status of rowStatuses) {
      const html = renderVocabularyStatusBadge(status, { domain: 'exchange' });
      assert.ok(html.length > 0, `Exchange row status ${status} should render`);

      const display = getStatusDisplay(status, 'exchange');
      assert.ok(display, `Shared vocabulary should have ${status}`);
    }
  });

  it('should render exchange job statuses via shared vocabulary', () => {
    const jobStatuses = ['running', 'completed', 'failed'];

    for (const status of jobStatuses) {
      const html = renderVocabularyStatusBadge(status, { domain: 'exchange' });
      assert.ok(html.length > 0, `Exchange job status ${status} should render`);

      // Verify CSS class can be derived
      const cssClass = getStatusCssClass(status, 'exchange');
      assert.strictEqual(cssClass, `status-${status}`);
    }
  });

  it('should render due states via shared vocabulary', () => {
    const dueStates = ['overdue', 'due_soon', 'on_track', 'none'];

    for (const state of dueStates) {
      const display = getStatusDisplay(state, 'queue');
      assert.ok(display, `Due state ${state} should be in shared vocabulary`);

      const html = renderVocabularyStatusBadge(state, { domain: 'queue' });
      assert.ok(html.length > 0, `Due state ${state} should render`);
    }
  });
});

// ============================================================================
// Cross-Phase Integration
// ============================================================================

describe('Cross-Phase Integration: Shared Vocabulary Consistency', () => {
  it('should provide consistent severity colors across domains', () => {
    // All success states should have success severity
    const successStates = [
      { status: 'ready', domain: 'core' },
      { status: 'approved', domain: 'queue' },
      { status: 'completed', domain: 'exchange' },
      { status: 'success', domain: 'exchange' },
      { status: 'on_track', domain: 'queue' },
    ];

    for (const { status, domain } of successStates) {
      const display = getStatusDisplay(status, domain);
      assert.strictEqual(display.severity, 'success', `${status} in ${domain} should have success severity`);
    }
  });

  it('should provide consistent error colors across domains', () => {
    const errorStates = [
      { status: 'missing_locales_and_fields', domain: 'core' },
      { status: 'rejected', domain: 'queue' },
      { status: 'failed', domain: 'exchange' },
      { status: 'error', domain: 'exchange' },
      { status: 'overdue', domain: 'queue' },
    ];

    for (const { status, domain } of errorStates) {
      const display = getStatusDisplay(status, domain);
      assert.strictEqual(display.severity, 'error', `${status} in ${domain} should have error severity`);
    }
  });

  it('should handle case-insensitive status lookups', () => {
    assert.ok(getStatusDisplay('READY'), 'Uppercase READY should resolve');
    assert.ok(getStatusDisplay('Ready'), 'Mixed case Ready should resolve');
    assert.ok(getStatusDisplay('ready'), 'Lowercase ready should resolve');

    // CSS class should always be lowercase
    assert.strictEqual(getStatusCssClass('READY'), 'status-ready');
    assert.strictEqual(getStatusCssClass('Ready'), 'status-ready');
  });

  it('should render badges with data attributes for all known statuses', () => {
    const allStatuses = [
      // Core
      'ready', 'missing_locales', 'missing_fields', 'missing_locales_and_fields',
      // Queue
      'pending', 'assigned', 'in_progress', 'review', 'rejected', 'approved', 'published', 'archived',
      'overdue', 'due_soon', 'on_track', 'none',
      'draft',
      // Exchange
      'success', 'error', 'conflict', 'skipped',
      'running', 'completed', 'failed',
    ];

    for (const status of allStatuses) {
      const html = renderVocabularyStatusBadge(status);
      assert.ok(html.includes('data-status='), `Badge for ${status} should have data-status attribute`);
    }
  });
});
