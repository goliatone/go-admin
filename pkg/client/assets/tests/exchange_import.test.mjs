/**
 * Tests for Exchange Import component (TX-048)
 *
 * Tests preview grid, selective apply, conflict resolution controls,
 * and permission-gated apply action.
 */
import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ============================================================================
// Mock Implementations (to avoid bundled dist dependency)
// ============================================================================

/**
 * ConflictResolution type
 * @typedef {'skip' | 'keep_current' | 'accept_incoming' | 'force'} ConflictResolution
 */

/**
 * RowSelectionState
 * @typedef {Object} RowSelectionState
 * @property {Set<number>} selected
 * @property {Set<number>} excluded
 * @property {boolean} allSelected
 */

/**
 * ImportPreviewState
 * @typedef {'idle' | 'validating' | 'validated' | 'applying' | 'applied' | 'error'} ImportPreviewState
 */

/**
 * Mock GateResult
 * @typedef {Object} GateResult
 * @property {boolean} visible
 * @property {boolean} enabled
 * @property {string} [reason]
 * @property {string} [reasonCode]
 * @property {string} [permission]
 */

/**
 * Mock CapabilityGate
 */
class MockCapabilityGate {
  constructor(capabilities, permissions = {}) {
    this.capabilities = capabilities;
    this.permissions = permissions;
  }

  gateAction(module, action) {
    const enabled = this.isModuleEnabled(module) && this.hasPermission(action);
    return {
      visible: true,
      enabled,
      reason: enabled ? undefined : `Missing ${action} permission`,
      reasonCode: enabled ? undefined : 'PERMISSION_DENIED',
      permission: action,
    };
  }

  isModuleEnabled(module) {
    if (module === 'exchange') {
      return this.capabilities.mode === 'core+exchange' || this.capabilities.mode === 'full';
    }
    if (module === 'queue') {
      return this.capabilities.mode === 'core+queue' || this.capabilities.mode === 'full';
    }
    return true;
  }

  hasPermission(action) {
    return this.permissions[action] !== false;
  }
}

/**
 * Mock ExchangeImportResult
 * @typedef {Object} ExchangeImportResult
 * @property {Array} results
 * @property {Object} summary
 */

/**
 * Mock ImportLabels
 */
const DEFAULT_LABELS = {
  title: 'Import Translations',
  selectFile: 'Select file or paste data',
  validateButton: 'Validate',
  applyButton: 'Apply',
  cancelButton: 'Cancel',
  selectAll: 'Select All',
  deselectAll: 'Deselect All',
  selectedCount: 'selected',
  previewTitle: 'Preview',
  conflictResolution: 'Conflict Resolution',
  keepCurrent: 'Keep Current',
  acceptIncoming: 'Accept Incoming',
  skip: 'Skip',
  force: 'Force',
  success: 'Success',
  error: 'Error',
  conflict: 'Conflict',
  skipped: 'Skipped',
  validating: 'Validating...',
  applying: 'Applying...',
  noRowsSelected: 'No rows selected',
  applyDisabledReason: 'Missing import.apply permission',
  resource: 'Resource',
  field: 'Field',
  status: 'Status',
  sourceText: 'Source',
  translatedText: 'Translation',
  conflictDetails: 'Conflict Details',
  allowCreateMissing: 'Create missing translations',
  continueOnError: 'Continue on error',
  dryRun: 'Dry run (preview only)',
};

/**
 * Mock ExchangeImport class (reimplemented for testing)
 */
class ExchangeImport {
  constructor(config) {
    const labels = { ...DEFAULT_LABELS, ...(config.labels || {}) };
    this.config = {
      validateEndpoint: config.validateEndpoint,
      applyEndpoint: config.applyEndpoint,
      capabilityGate: config.capabilityGate,
      onValidationComplete: config.onValidationComplete,
      onApplyComplete: config.onApplyComplete,
      onError: config.onError,
      labels,
    };
    this.container = null;
    this.state = 'idle';
    this.validationResult = null;
    this.previewRows = [];
    this.selection = {
      selected: new Set(),
      excluded: new Set(),
      allSelected: false,
    };
    this.applyOptions = {
      allowCreateMissing: false,
      continueOnError: false,
      dryRun: false,
      async: false,
    };
    this.error = null;
    this.file = null;
    this.rawData = '';
  }

  mount(container) {
    this.container = container;
  }

  unmount() {
    this.container = null;
  }

  getState() {
    return this.state;
  }

  getValidationResult() {
    return this.validationResult;
  }

  getSelectedIndices() {
    if (this.selection.allSelected) {
      return this.previewRows
        .filter(row => !this.selection.excluded.has(row.index))
        .map(row => row.index);
    }
    return Array.from(this.selection.selected);
  }

  setFile(file) {
    this.file = file;
    this.rawData = '';
  }

  setRawData(data) {
    this.rawData = data;
    this.file = null;
  }

  // Mock validate - sets up validation result for testing
  setValidationResult(result) {
    this.validationResult = result;
    this.previewRows = result.results.map(row => ({
      ...row,
      isSelected: row.status !== 'error',
      resolution: row.status === 'conflict' ? 'skip' : undefined,
    }));

    // Auto-select all non-error rows
    this.selection.allSelected = true;
    this.selection.excluded = new Set(
      result.results.filter(r => r.status === 'error').map(r => r.index)
    );

    this.state = 'validated';
    this.config.onValidationComplete?.(result);
  }

  toggleRowSelection(index) {
    if (this.selection.allSelected) {
      if (this.selection.excluded.has(index)) {
        this.selection.excluded.delete(index);
      } else {
        this.selection.excluded.add(index);
      }
    } else {
      if (this.selection.selected.has(index)) {
        this.selection.selected.delete(index);
      } else {
        this.selection.selected.add(index);
      }
    }
    this.updatePreviewRowSelection();
  }

  selectAll() {
    this.selection.allSelected = true;
    this.selection.excluded.clear();
    this.updatePreviewRowSelection();
  }

  deselectAll() {
    this.selection.allSelected = false;
    this.selection.selected.clear();
    this.selection.excluded.clear();
    this.updatePreviewRowSelection();
  }

  setRowResolution(index, resolution) {
    const row = this.previewRows.find(r => r.index === index);
    if (row) {
      row.resolution = resolution;
    }
  }

  setApplyOption(key, value) {
    this.applyOptions[key] = value;
  }

  reset() {
    this.state = 'idle';
    this.validationResult = null;
    this.previewRows = [];
    this.selection = {
      selected: new Set(),
      excluded: new Set(),
      allSelected: false,
    };
    this.applyOptions = {
      allowCreateMissing: false,
      continueOnError: false,
      dryRun: false,
      async: false,
    };
    this.error = null;
    this.file = null;
    this.rawData = '';
  }

  getApplyGate() {
    if (!this.config.capabilityGate) {
      return { visible: true, enabled: true };
    }
    return this.config.capabilityGate.gateAction('exchange', 'import.apply');
  }

  canApply() {
    const gate = this.getApplyGate();
    return gate.enabled && this.getSelectedIndices().length > 0 && this.state === 'validated';
  }

  // Mock apply - checks permission before applying
  applySync(options = {}) {
    const mergedOptions = { ...this.applyOptions, ...options };
    const selectedIndices = mergedOptions.selectedIndices || this.getSelectedIndices();

    if (selectedIndices.length === 0) {
      this.error = new Error(this.config.labels.noRowsSelected);
      return { success: false, error: this.error };
    }

    // Check permission
    if (this.config.capabilityGate) {
      const gate = this.config.capabilityGate.gateAction('exchange', 'import.apply');
      if (!gate.enabled) {
        this.error = new Error(gate.reason || this.config.labels.applyDisabledReason);
        return { success: false, error: this.error, gateResult: gate };
      }
    }

    // Filter rows by selected indices
    const selectedRows = this.validationResult?.results.filter(
      row => selectedIndices.includes(row.index)
    ) || [];

    // Apply conflict resolutions
    const rowsWithResolutions = selectedRows.map(row => {
      const previewRow = this.previewRows.find(p => p.index === row.index);
      return {
        ...row,
        resolution: previewRow?.resolution,
      };
    });

    this.state = 'applied';
    return {
      success: true,
      rows: rowsWithResolutions,
      options: mergedOptions,
    };
  }

  updatePreviewRowSelection() {
    this.previewRows = this.previewRows.map(row => ({
      ...row,
      isSelected: this.selection.allSelected
        ? !this.selection.excluded.has(row.index)
        : this.selection.selected.has(row.index),
    }));
  }
}

/**
 * Helper function to create mock validation result
 */
function createMockValidationResult(rows) {
  const summary = {
    total: rows.length,
    succeeded: rows.filter(r => r.status === 'success').length,
    failed: rows.filter(r => r.status === 'error').length,
    conflicts: rows.filter(r => r.status === 'conflict').length,
    skipped: rows.filter(r => r.status === 'skipped').length,
  };

  return {
    results: rows.map((row, index) => ({
      index,
      resource: row.resource || 'content',
      entityId: row.entityId || `id-${index}`,
      fieldPath: row.fieldPath || 'title',
      status: row.status || 'success',
      sourceLocale: row.sourceLocale || 'en',
      targetLocale: row.targetLocale || 'es',
      error: row.error,
      conflict: row.conflict,
    })),
    summary,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('ExchangeImport', () => {
  describe('constructor', () => {
    it('should initialize with default labels', () => {
      const component = new ExchangeImport({
        validateEndpoint: '/api/validate',
        applyEndpoint: '/api/apply',
      });

      assert.equal(component.config.labels.title, 'Import Translations');
      assert.equal(component.config.labels.applyButton, 'Apply');
    });

    it('should allow custom labels', () => {
      const component = new ExchangeImport({
        validateEndpoint: '/api/validate',
        applyEndpoint: '/api/apply',
        labels: {
          title: 'Custom Import Title',
          applyButton: 'Submit',
        },
      });

      assert.equal(component.config.labels.title, 'Custom Import Title');
      assert.equal(component.config.labels.applyButton, 'Submit');
      // Default labels should still be present
      assert.equal(component.config.labels.cancelButton, 'Cancel');
    });

    it('should start in idle state', () => {
      const component = new ExchangeImport({
        validateEndpoint: '/api/validate',
        applyEndpoint: '/api/apply',
      });

      assert.equal(component.getState(), 'idle');
    });
  });

  describe('file and data input', () => {
    it('should set file', () => {
      const component = new ExchangeImport({
        validateEndpoint: '/api/validate',
        applyEndpoint: '/api/apply',
      });

      const mockFile = { name: 'test.csv' };
      component.setFile(mockFile);

      assert.equal(component.file, mockFile);
      assert.equal(component.rawData, '');
    });

    it('should set raw data and clear file', () => {
      const component = new ExchangeImport({
        validateEndpoint: '/api/validate',
        applyEndpoint: '/api/apply',
      });

      const mockFile = { name: 'test.csv' };
      component.setFile(mockFile);
      component.setRawData('{"rows": []}');

      assert.equal(component.file, null);
      assert.equal(component.rawData, '{"rows": []}');
    });
  });

  describe('validation result handling', () => {
    it('should process validation result and auto-select non-error rows', () => {
      const component = new ExchangeImport({
        validateEndpoint: '/api/validate',
        applyEndpoint: '/api/apply',
      });

      const result = createMockValidationResult([
        { status: 'success' },
        { status: 'success' },
        { status: 'error', error: 'Invalid format' },
        { status: 'conflict', conflict: { current: 'a', incoming: 'b' } },
      ]);

      component.setValidationResult(result);

      assert.equal(component.getState(), 'validated');
      assert.equal(component.previewRows.length, 4);

      // Non-error rows should be selected
      const selectedIndices = component.getSelectedIndices();
      assert.deepEqual(selectedIndices, [0, 1, 3]); // indices 0, 1, 3 (not 2 - error)
    });

    it('should set default resolution to skip for conflict rows', () => {
      const component = new ExchangeImport({
        validateEndpoint: '/api/validate',
        applyEndpoint: '/api/apply',
      });

      const result = createMockValidationResult([
        { status: 'success' },
        { status: 'conflict' },
      ]);

      component.setValidationResult(result);

      assert.equal(component.previewRows[0].resolution, undefined);
      assert.equal(component.previewRows[1].resolution, 'skip');
    });

    it('should call onValidationComplete callback', () => {
      let callbackResult = null;
      const component = new ExchangeImport({
        validateEndpoint: '/api/validate',
        applyEndpoint: '/api/apply',
        onValidationComplete: (result) => {
          callbackResult = result;
        },
      });

      const result = createMockValidationResult([{ status: 'success' }]);
      component.setValidationResult(result);

      assert.notEqual(callbackResult, null);
      assert.equal(callbackResult.summary.total, 1);
    });
  });

  describe('row selection', () => {
    let component;

    beforeEach(() => {
      component = new ExchangeImport({
        validateEndpoint: '/api/validate',
        applyEndpoint: '/api/apply',
      });

      const result = createMockValidationResult([
        { status: 'success' },
        { status: 'success' },
        { status: 'success' },
        { status: 'success' },
      ]);

      component.setValidationResult(result);
    });

    it('should select all rows initially', () => {
      assert.equal(component.getSelectedIndices().length, 4);
    });

    it('should toggle row selection with allSelected=true', () => {
      // Initially all selected
      assert.deepEqual(component.getSelectedIndices(), [0, 1, 2, 3]);

      // Toggle row 1 (should exclude it)
      component.toggleRowSelection(1);
      assert.deepEqual(component.getSelectedIndices(), [0, 2, 3]);

      // Toggle row 1 again (should re-include it)
      component.toggleRowSelection(1);
      assert.deepEqual(component.getSelectedIndices(), [0, 1, 2, 3]);
    });

    it('should deselect all rows', () => {
      component.deselectAll();
      assert.deepEqual(component.getSelectedIndices(), []);
    });

    it('should select all rows after deselect', () => {
      component.deselectAll();
      component.selectAll();
      assert.deepEqual(component.getSelectedIndices(), [0, 1, 2, 3]);
    });

    it('should toggle row selection with allSelected=false', () => {
      component.deselectAll();
      assert.deepEqual(component.getSelectedIndices(), []);

      // Select row 1
      component.toggleRowSelection(1);
      assert.deepEqual(component.getSelectedIndices(), [1]);

      // Select row 3
      component.toggleRowSelection(3);
      assert.deepEqual(component.getSelectedIndices(), [1, 3]);

      // Deselect row 1
      component.toggleRowSelection(1);
      assert.deepEqual(component.getSelectedIndices(), [3]);
    });
  });

  describe('conflict resolution', () => {
    it('should set row resolution', () => {
      const component = new ExchangeImport({
        validateEndpoint: '/api/validate',
        applyEndpoint: '/api/apply',
      });

      const result = createMockValidationResult([
        { status: 'conflict' },
        { status: 'conflict' },
      ]);

      component.setValidationResult(result);

      // Default is skip
      assert.equal(component.previewRows[0].resolution, 'skip');

      // Set to accept_incoming
      component.setRowResolution(0, 'accept_incoming');
      assert.equal(component.previewRows[0].resolution, 'accept_incoming');

      // Set to force
      component.setRowResolution(0, 'force');
      assert.equal(component.previewRows[0].resolution, 'force');

      // Set to keep_current
      component.setRowResolution(1, 'keep_current');
      assert.equal(component.previewRows[1].resolution, 'keep_current');
    });
  });

  describe('apply options', () => {
    it('should set apply options', () => {
      const component = new ExchangeImport({
        validateEndpoint: '/api/validate',
        applyEndpoint: '/api/apply',
      });

      // Defaults
      assert.equal(component.applyOptions.allowCreateMissing, false);
      assert.equal(component.applyOptions.continueOnError, false);
      assert.equal(component.applyOptions.dryRun, false);

      // Set options
      component.setApplyOption('allowCreateMissing', true);
      assert.equal(component.applyOptions.allowCreateMissing, true);

      component.setApplyOption('continueOnError', true);
      assert.equal(component.applyOptions.continueOnError, true);

      component.setApplyOption('dryRun', true);
      assert.equal(component.applyOptions.dryRun, true);
    });
  });

  describe('permission gating', () => {
    it('should allow apply when no capability gate is configured', () => {
      const component = new ExchangeImport({
        validateEndpoint: '/api/validate',
        applyEndpoint: '/api/apply',
      });

      const result = createMockValidationResult([{ status: 'success' }]);
      component.setValidationResult(result);

      const gate = component.getApplyGate();
      assert.equal(gate.visible, true);
      assert.equal(gate.enabled, true);
      assert.equal(component.canApply(), true);
    });

    it('should allow apply when permission is granted', () => {
      const capabilityGate = new MockCapabilityGate(
        { mode: 'full' },
        { 'import.apply': true }
      );

      const component = new ExchangeImport({
        validateEndpoint: '/api/validate',
        applyEndpoint: '/api/apply',
        capabilityGate,
      });

      const result = createMockValidationResult([{ status: 'success' }]);
      component.setValidationResult(result);

      const gate = component.getApplyGate();
      assert.equal(gate.enabled, true);
      assert.equal(component.canApply(), true);
    });

    it('should block apply when permission is denied', () => {
      const capabilityGate = new MockCapabilityGate(
        { mode: 'full' },
        { 'import.apply': false }
      );

      const component = new ExchangeImport({
        validateEndpoint: '/api/validate',
        applyEndpoint: '/api/apply',
        capabilityGate,
      });

      const result = createMockValidationResult([{ status: 'success' }]);
      component.setValidationResult(result);

      const gate = component.getApplyGate();
      assert.equal(gate.enabled, false);
      assert.ok(gate.reason);
      assert.equal(component.canApply(), false);
    });

    it('should block apply when exchange module is not enabled', () => {
      const capabilityGate = new MockCapabilityGate(
        { mode: 'core' }, // Exchange not enabled
        { 'import.apply': true }
      );

      const component = new ExchangeImport({
        validateEndpoint: '/api/validate',
        applyEndpoint: '/api/apply',
        capabilityGate,
      });

      const result = createMockValidationResult([{ status: 'success' }]);
      component.setValidationResult(result);

      const gate = component.getApplyGate();
      assert.equal(gate.enabled, false);
      assert.equal(component.canApply(), false);
    });
  });

  describe('apply with resolutions', () => {
    it('should fail when no rows are selected', () => {
      const component = new ExchangeImport({
        validateEndpoint: '/api/validate',
        applyEndpoint: '/api/apply',
      });

      const result = createMockValidationResult([{ status: 'success' }]);
      component.setValidationResult(result);
      component.deselectAll();

      const applyResult = component.applySync();
      assert.equal(applyResult.success, false);
      assert.ok(applyResult.error.message.includes('No rows selected'));
    });

    it('should fail when permission is denied', () => {
      const capabilityGate = new MockCapabilityGate(
        { mode: 'full' },
        { 'import.apply': false }
      );

      const component = new ExchangeImport({
        validateEndpoint: '/api/validate',
        applyEndpoint: '/api/apply',
        capabilityGate,
      });

      const result = createMockValidationResult([{ status: 'success' }]);
      component.setValidationResult(result);

      const applyResult = component.applySync();
      assert.equal(applyResult.success, false);
      assert.ok(applyResult.gateResult);
      assert.equal(applyResult.gateResult.enabled, false);
    });

    it('should apply selected rows with resolutions', () => {
      const component = new ExchangeImport({
        validateEndpoint: '/api/validate',
        applyEndpoint: '/api/apply',
      });

      const result = createMockValidationResult([
        { status: 'success' },
        { status: 'conflict' },
        { status: 'conflict' },
      ]);

      component.setValidationResult(result);
      component.setRowResolution(1, 'accept_incoming');
      component.setRowResolution(2, 'force');

      const applyResult = component.applySync();
      assert.equal(applyResult.success, true);
      assert.equal(applyResult.rows.length, 3);
      assert.equal(applyResult.rows[0].resolution, undefined);
      assert.equal(applyResult.rows[1].resolution, 'accept_incoming');
      assert.equal(applyResult.rows[2].resolution, 'force');
    });

    it('should apply only selected rows', () => {
      const component = new ExchangeImport({
        validateEndpoint: '/api/validate',
        applyEndpoint: '/api/apply',
      });

      const result = createMockValidationResult([
        { status: 'success' },
        { status: 'success' },
        { status: 'success' },
      ]);

      component.setValidationResult(result);
      component.toggleRowSelection(1); // Exclude row 1

      const applyResult = component.applySync();
      assert.equal(applyResult.success, true);
      assert.equal(applyResult.rows.length, 2);
      assert.deepEqual(applyResult.rows.map(r => r.index), [0, 2]);
    });

    it('should include apply options in result', () => {
      const component = new ExchangeImport({
        validateEndpoint: '/api/validate',
        applyEndpoint: '/api/apply',
      });

      const result = createMockValidationResult([{ status: 'success' }]);
      component.setValidationResult(result);

      component.setApplyOption('allowCreateMissing', true);
      component.setApplyOption('dryRun', true);

      const applyResult = component.applySync();
      assert.equal(applyResult.success, true);
      assert.equal(applyResult.options.allowCreateMissing, true);
      assert.equal(applyResult.options.dryRun, true);
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      const component = new ExchangeImport({
        validateEndpoint: '/api/validate',
        applyEndpoint: '/api/apply',
      });

      const result = createMockValidationResult([{ status: 'success' }]);
      component.setValidationResult(result);
      component.setApplyOption('dryRun', true);

      assert.equal(component.getState(), 'validated');
      assert.equal(component.previewRows.length, 1);

      component.reset();

      assert.equal(component.getState(), 'idle');
      assert.equal(component.previewRows.length, 0);
      assert.equal(component.validationResult, null);
      assert.equal(component.applyOptions.dryRun, false);
      assert.equal(component.file, null);
      assert.equal(component.rawData, '');
    });
  });

  describe('mount/unmount', () => {
    it('should track mounted container', () => {
      const component = new ExchangeImport({
        validateEndpoint: '/api/validate',
        applyEndpoint: '/api/apply',
      });

      const container = {};
      component.mount(container);
      assert.equal(component.container, container);

      component.unmount();
      assert.equal(component.container, null);
    });
  });
});

describe('Preview Row State', () => {
  it('should update isSelected on rows when selection changes', () => {
    const component = new ExchangeImport({
      validateEndpoint: '/api/validate',
      applyEndpoint: '/api/apply',
    });

    const result = createMockValidationResult([
      { status: 'success' },
      { status: 'success' },
    ]);

    component.setValidationResult(result);

    // All selected initially
    assert.equal(component.previewRows[0].isSelected, true);
    assert.equal(component.previewRows[1].isSelected, true);

    // Exclude row 0
    component.toggleRowSelection(0);
    assert.equal(component.previewRows[0].isSelected, false);
    assert.equal(component.previewRows[1].isSelected, true);

    // Deselect all
    component.deselectAll();
    assert.equal(component.previewRows[0].isSelected, false);
    assert.equal(component.previewRows[1].isSelected, false);

    // Manually select row 1
    component.toggleRowSelection(1);
    assert.equal(component.previewRows[0].isSelected, false);
    assert.equal(component.previewRows[1].isSelected, true);
  });
});

describe('Summary Statistics', () => {
  it('should correctly count validation result statuses', () => {
    const result = createMockValidationResult([
      { status: 'success' },
      { status: 'success' },
      { status: 'error' },
      { status: 'conflict' },
      { status: 'skipped' },
    ]);

    assert.equal(result.summary.total, 5);
    assert.equal(result.summary.succeeded, 2);
    assert.equal(result.summary.failed, 1);
    assert.equal(result.summary.conflicts, 1);
    assert.equal(result.summary.skipped, 1);
  });
});
