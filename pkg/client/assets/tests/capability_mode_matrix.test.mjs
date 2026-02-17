/**
 * Matrix Tests for Capability Mode and Permission Combinations (TX-050)
 *
 * Tests all combinations of capability modes and permissions to verify:
 * - Module visibility (hidden when mode disables module)
 * - Action enablement (disabled when permission missing)
 * - Graceful degradation patterns
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// ============================================================================
// Mock Implementations
// ============================================================================

/**
 * Capability modes
 * @typedef {'core' | 'core+exchange' | 'core+queue' | 'full' | 'none'} CapabilityMode
 */

/**
 * Module state
 * @typedef {Object} ModuleState
 * @property {boolean} enabled
 * @property {boolean} visible
 */

/**
 * Action state
 * @typedef {Object} ActionState
 * @property {boolean} visible
 * @property {boolean} enabled
 * @property {string} [reason]
 * @property {string} [reasonCode]
 */

/**
 * Gate result
 * @typedef {Object} GateResult
 * @property {boolean} visible
 * @property {boolean} enabled
 * @property {string} [reason]
 * @property {string} [reasonCode]
 * @property {string} [permission]
 */

/**
 * Parse capability mode string
 */
function parseCapabilityMode(mode) {
  const valid = ['core', 'core+exchange', 'core+queue', 'full', 'none'];
  if (!mode || typeof mode !== 'string') return 'none';
  const normalized = mode.toLowerCase().trim();
  return valid.includes(normalized) ? normalized : 'none';
}

/**
 * Check if exchange is enabled for a mode
 */
function isExchangeEnabled(mode) {
  return mode === 'core+exchange' || mode === 'full';
}

/**
 * Check if queue is enabled for a mode
 */
function isQueueEnabled(mode) {
  return mode === 'core+queue' || mode === 'full';
}

/**
 * Check if core is enabled for a mode
 */
function isCoreEnabled(mode) {
  return mode !== 'none';
}

/**
 * CapabilityGate class for testing
 */
class CapabilityGate {
  constructor(capabilities, permissions = {}) {
    this.mode = parseCapabilityMode(capabilities.mode);
    this.permissions = permissions;
  }

  /**
   * Get module state
   */
  getModuleState(module) {
    if (module === 'exchange') {
      const enabled = isExchangeEnabled(this.mode);
      return {
        enabled,
        visible: enabled || this.hasModuleViewPermission('exchange'),
      };
    }
    if (module === 'queue') {
      const enabled = isQueueEnabled(this.mode);
      return {
        enabled,
        visible: enabled || this.hasModuleViewPermission('queue'),
      };
    }
    if (module === 'core') {
      return {
        enabled: isCoreEnabled(this.mode),
        visible: true,
      };
    }
    return { enabled: false, visible: false };
  }

  /**
   * Check if has module view permission
   */
  hasModuleViewPermission(module) {
    return this.permissions[`${module}.view`] === true;
  }

  /**
   * Check if has specific permission
   */
  hasPermission(permission) {
    return this.permissions[permission] !== false;
  }

  /**
   * Gate a navigation item
   */
  gateNavItem(gate) {
    const { module, action } = gate;
    const moduleState = this.getModuleState(module);

    // If module is disabled and not visible, hide completely
    if (!moduleState.enabled && !moduleState.visible) {
      return {
        visible: false,
        enabled: false,
        reason: `${module} module is not enabled`,
        reasonCode: 'MODULE_DISABLED',
      };
    }

    // If module is visible but disabled, show as disabled
    if (!moduleState.enabled) {
      return {
        visible: true,
        enabled: false,
        reason: `${module} module is not enabled`,
        reasonCode: 'MODULE_DISABLED',
      };
    }

    // Module is enabled, check action permission
    const permission = action ? `${module}.${action}` : `${module}.view`;
    const hasPermission = this.hasPermission(permission);

    return {
      visible: true,
      enabled: hasPermission,
      reason: hasPermission ? undefined : `Missing ${permission} permission`,
      reasonCode: hasPermission ? undefined : 'PERMISSION_DENIED',
      permission,
    };
  }

  /**
   * Gate an action
   */
  gateAction(module, action) {
    return this.gateNavItem({ module, action });
  }
}

// ============================================================================
// Test Matrix Definition
// ============================================================================

/**
 * Matrix of capability modes
 */
const CAPABILITY_MODES = ['core', 'core+exchange', 'core+queue', 'full', 'none'];

/**
 * Modules under test
 */
const MODULES = ['exchange', 'queue', 'core'];

/**
 * Actions per module
 */
const MODULE_ACTIONS = {
  exchange: ['view', 'export', 'import.preview', 'import.apply'],
  queue: ['view', 'list', 'assign', 'approve', 'reject'],
  core: ['view', 'create', 'update', 'delete', 'publish'],
};

/**
 * Expected module enablement per capability mode
 */
const EXPECTED_MODULE_ENABLEMENT = {
  'none': { exchange: false, queue: false, core: false },
  'core': { exchange: false, queue: false, core: true },
  'core+exchange': { exchange: true, queue: false, core: true },
  'core+queue': { exchange: false, queue: true, core: true },
  'full': { exchange: true, queue: true, core: true },
};

// ============================================================================
// Tests
// ============================================================================

describe('Capability Mode Matrix Tests', () => {
  describe('Module Enablement by Capability Mode', () => {
    for (const mode of CAPABILITY_MODES) {
      describe(`mode: ${mode}`, () => {
        it('should enable/disable modules according to mode', () => {
          const gate = new CapabilityGate({ mode });
          const expected = EXPECTED_MODULE_ENABLEMENT[mode];

          for (const [module, shouldBeEnabled] of Object.entries(expected)) {
            const state = gate.getModuleState(module);
            assert.equal(
              state.enabled,
              shouldBeEnabled,
              `${module} should be ${shouldBeEnabled ? 'enabled' : 'disabled'} in ${mode} mode`
            );
          }
        });
      });
    }
  });

  describe('Exchange Module Visibility', () => {
    it('should be hidden when mode=core and no view permission', () => {
      const gate = new CapabilityGate({ mode: 'core' }, {});
      const result = gate.gateNavItem({ module: 'exchange', action: 'view' });

      assert.equal(result.visible, false);
      assert.equal(result.enabled, false);
    });

    it('should be visible-disabled when mode=core but has view permission', () => {
      const gate = new CapabilityGate({ mode: 'core' }, { 'exchange.view': true });
      const result = gate.gateNavItem({ module: 'exchange', action: 'view' });

      // Visible because has view permission, but disabled because module is not enabled
      assert.equal(result.visible, true);
      assert.equal(result.enabled, false);
      assert.equal(result.reasonCode, 'MODULE_DISABLED');
    });

    it('should be visible-enabled when mode=core+exchange', () => {
      const gate = new CapabilityGate({ mode: 'core+exchange' }, {});
      const result = gate.gateNavItem({ module: 'exchange', action: 'view' });

      assert.equal(result.visible, true);
      assert.equal(result.enabled, true);
    });

    it('should be visible-enabled when mode=full', () => {
      const gate = new CapabilityGate({ mode: 'full' }, {});
      const result = gate.gateNavItem({ module: 'exchange', action: 'view' });

      assert.equal(result.visible, true);
      assert.equal(result.enabled, true);
    });
  });

  describe('Queue Module Visibility', () => {
    it('should be hidden when mode=core and no view permission', () => {
      const gate = new CapabilityGate({ mode: 'core' }, {});
      const result = gate.gateNavItem({ module: 'queue', action: 'view' });

      assert.equal(result.visible, false);
      assert.equal(result.enabled, false);
    });

    it('should be visible-disabled when mode=core but has view permission', () => {
      const gate = new CapabilityGate({ mode: 'core' }, { 'queue.view': true });
      const result = gate.gateNavItem({ module: 'queue', action: 'view' });

      assert.equal(result.visible, true);
      assert.equal(result.enabled, false);
      assert.equal(result.reasonCode, 'MODULE_DISABLED');
    });

    it('should be visible-enabled when mode=core+queue', () => {
      const gate = new CapabilityGate({ mode: 'core+queue' }, {});
      const result = gate.gateNavItem({ module: 'queue', action: 'view' });

      assert.equal(result.visible, true);
      assert.equal(result.enabled, true);
    });

    it('should be visible-enabled when mode=full', () => {
      const gate = new CapabilityGate({ mode: 'full' }, {});
      const result = gate.gateNavItem({ module: 'queue', action: 'view' });

      assert.equal(result.visible, true);
      assert.equal(result.enabled, true);
    });
  });

  describe('Action Permission Gating', () => {
    describe('exchange actions', () => {
      const mode = 'core+exchange';

      for (const action of MODULE_ACTIONS.exchange) {
        it(`should gate ${action} based on permission`, () => {
          // Without permission
          const gateWithout = new CapabilityGate({ mode }, { [`exchange.${action}`]: false });
          const resultWithout = gateWithout.gateAction('exchange', action);

          assert.equal(resultWithout.visible, true);
          assert.equal(resultWithout.enabled, false);
          assert.equal(resultWithout.reasonCode, 'PERMISSION_DENIED');

          // With permission
          const gateWith = new CapabilityGate({ mode }, { [`exchange.${action}`]: true });
          const resultWith = gateWith.gateAction('exchange', action);

          assert.equal(resultWith.visible, true);
          assert.equal(resultWith.enabled, true);
        });
      }
    });

    describe('queue actions', () => {
      const mode = 'core+queue';

      for (const action of MODULE_ACTIONS.queue) {
        it(`should gate ${action} based on permission`, () => {
          // Without permission
          const gateWithout = new CapabilityGate({ mode }, { [`queue.${action}`]: false });
          const resultWithout = gateWithout.gateAction('queue', action);

          assert.equal(resultWithout.visible, true);
          assert.equal(resultWithout.enabled, false);
          assert.equal(resultWithout.reasonCode, 'PERMISSION_DENIED');

          // With permission
          const gateWith = new CapabilityGate({ mode }, { [`queue.${action}`]: true });
          const resultWith = gateWith.gateAction('queue', action);

          assert.equal(resultWith.visible, true);
          assert.equal(resultWith.enabled, true);
        });
      }
    });
  });

  describe('Cross-Module Mode/Permission Combinations', () => {
    it('full mode with all permissions should enable all actions', () => {
      const permissions = {};
      for (const module of MODULES) {
        for (const action of MODULE_ACTIONS[module]) {
          permissions[`${module}.${action}`] = true;
        }
      }

      const gate = new CapabilityGate({ mode: 'full' }, permissions);

      for (const module of MODULES) {
        for (const action of MODULE_ACTIONS[module]) {
          const result = gate.gateAction(module, action);
          assert.equal(result.enabled, true, `${module}.${action} should be enabled`);
        }
      }
    });

    it('full mode with no permissions should show disabled with reasons', () => {
      const permissions = {};
      for (const module of MODULES) {
        for (const action of MODULE_ACTIONS[module]) {
          permissions[`${module}.${action}`] = false;
        }
      }

      const gate = new CapabilityGate({ mode: 'full' }, permissions);

      for (const module of MODULES) {
        for (const action of MODULE_ACTIONS[module]) {
          const result = gate.gateAction(module, action);
          assert.equal(result.visible, true, `${module}.${action} should be visible`);
          assert.equal(result.enabled, false, `${module}.${action} should be disabled`);
          assert.ok(result.reason, `${module}.${action} should have a reason`);
        }
      }
    });

    it('core+exchange mode should hide queue actions without view permission', () => {
      const gate = new CapabilityGate({ mode: 'core+exchange' }, {});

      for (const action of MODULE_ACTIONS.queue) {
        const result = gate.gateAction('queue', action);
        assert.equal(result.visible, false, `queue.${action} should be hidden`);
      }

      for (const action of MODULE_ACTIONS.exchange) {
        const result = gate.gateAction('exchange', action);
        assert.equal(result.visible, true, `exchange.${action} should be visible`);
      }
    });

    it('core+queue mode should hide exchange actions without view permission', () => {
      const gate = new CapabilityGate({ mode: 'core+queue' }, {});

      for (const action of MODULE_ACTIONS.exchange) {
        const result = gate.gateAction('exchange', action);
        assert.equal(result.visible, false, `exchange.${action} should be hidden`);
      }

      for (const action of MODULE_ACTIONS.queue) {
        const result = gate.gateAction('queue', action);
        assert.equal(result.visible, true, `queue.${action} should be visible`);
      }
    });

    it('none mode should disable all modules', () => {
      const gate = new CapabilityGate({ mode: 'none' }, {});

      for (const module of MODULES) {
        const state = gate.getModuleState(module);
        assert.equal(state.enabled, false, `${module} should be disabled`);
      }
    });
  });

  describe('Partial Permission Scenarios', () => {
    it('should allow view but disable create when only view permitted', () => {
      const gate = new CapabilityGate(
        { mode: 'full' },
        {
          'exchange.view': true,
          'exchange.export': true,
          'exchange.import.preview': true,
          'exchange.import.apply': false, // Denied
        }
      );

      const viewResult = gate.gateAction('exchange', 'view');
      assert.equal(viewResult.enabled, true);

      const exportResult = gate.gateAction('exchange', 'export');
      assert.equal(exportResult.enabled, true);

      const previewResult = gate.gateAction('exchange', 'import.preview');
      assert.equal(previewResult.enabled, true);

      const applyResult = gate.gateAction('exchange', 'import.apply');
      assert.equal(applyResult.enabled, false);
      assert.equal(applyResult.reasonCode, 'PERMISSION_DENIED');
    });

    it('should allow list but disable actions when reviewer permissions', () => {
      const gate = new CapabilityGate(
        { mode: 'core+queue' },
        {
          'queue.view': true,
          'queue.list': true,
          'queue.assign': false,
          'queue.approve': true,
          'queue.reject': true,
        }
      );

      const viewResult = gate.gateAction('queue', 'view');
      assert.equal(viewResult.enabled, true);

      const listResult = gate.gateAction('queue', 'list');
      assert.equal(listResult.enabled, true);

      const assignResult = gate.gateAction('queue', 'assign');
      assert.equal(assignResult.enabled, false);

      const approveResult = gate.gateAction('queue', 'approve');
      assert.equal(approveResult.enabled, true);

      const rejectResult = gate.gateAction('queue', 'reject');
      assert.equal(rejectResult.enabled, true);
    });
  });

  describe('Degradation Consistency', () => {
    it('should have consistent degradation pattern: hidden -> visible-disabled -> enabled', () => {
      // Test exchange module degradation across modes
      const scenarios = [
        { mode: 'core', permissions: {}, expected: 'hidden' },
        { mode: 'core', permissions: { 'exchange.view': true }, expected: 'visible-disabled' },
        { mode: 'core+exchange', permissions: { 'exchange.view': false }, expected: 'visible-disabled' },
        { mode: 'core+exchange', permissions: { 'exchange.view': true }, expected: 'enabled' },
        { mode: 'full', permissions: { 'exchange.view': true }, expected: 'enabled' },
      ];

      for (const scenario of scenarios) {
        const gate = new CapabilityGate({ mode: scenario.mode }, scenario.permissions);
        const result = gate.gateAction('exchange', 'view');

        if (scenario.expected === 'hidden') {
          assert.equal(result.visible, false, `Expected hidden for ${JSON.stringify(scenario)}`);
        } else if (scenario.expected === 'visible-disabled') {
          assert.equal(result.visible, true, `Expected visible for ${JSON.stringify(scenario)}`);
          assert.equal(result.enabled, false, `Expected disabled for ${JSON.stringify(scenario)}`);
        } else if (scenario.expected === 'enabled') {
          assert.equal(result.visible, true, `Expected visible for ${JSON.stringify(scenario)}`);
          assert.equal(result.enabled, true, `Expected enabled for ${JSON.stringify(scenario)}`);
        }
      }
    });

    it('should always provide reason when disabled', () => {
      const gate = new CapabilityGate({ mode: 'full' }, { 'exchange.export': false });
      const result = gate.gateAction('exchange', 'export');

      assert.equal(result.enabled, false);
      assert.ok(result.reason, 'Should have reason');
      assert.ok(result.reasonCode, 'Should have reasonCode');
    });
  });
});

describe('Component Integration Matrix', () => {
  describe('ExchangeImport Permission Gating', () => {
    it('should block apply when import.apply permission denied', () => {
      const gate = new CapabilityGate(
        { mode: 'core+exchange' },
        { 'exchange.import.apply': false }
      );

      const result = gate.gateAction('exchange', 'import.apply');

      assert.equal(result.visible, true);
      assert.equal(result.enabled, false);
      assert.ok(result.reason.includes('import.apply'));
    });

    it('should allow apply when import.apply permission granted', () => {
      const gate = new CapabilityGate(
        { mode: 'core+exchange' },
        { 'exchange.import.apply': true }
      );

      const result = gate.gateAction('exchange', 'import.apply');

      assert.equal(result.enabled, true);
    });

    it('should block apply when exchange module disabled', () => {
      const gate = new CapabilityGate(
        { mode: 'core' },
        { 'exchange.import.apply': true }
      );

      const result = gate.gateAction('exchange', 'import.apply');

      // Module not visible, so hidden
      assert.equal(result.visible, false);
      assert.equal(result.enabled, false);
    });
  });

  describe('TranslatorDashboard Permission Gating', () => {
    it('should show dashboard when queue enabled', () => {
      const gate = new CapabilityGate({ mode: 'core+queue' }, {});
      const moduleState = gate.getModuleState('queue');

      assert.equal(moduleState.enabled, true);
      assert.equal(moduleState.visible, true);
    });

    it('should gate review actions based on permissions', () => {
      const gate = new CapabilityGate(
        { mode: 'core+queue' },
        {
          'queue.approve': true,
          'queue.reject': false,
        }
      );

      const approveResult = gate.gateAction('queue', 'approve');
      assert.equal(approveResult.enabled, true);

      const rejectResult = gate.gateAction('queue', 'reject');
      assert.equal(rejectResult.enabled, false);
    });
  });
});

describe('Mode String Parsing Edge Cases', () => {
  it('should handle uppercase mode strings', () => {
    const gate = new CapabilityGate({ mode: 'CORE+EXCHANGE' });
    assert.equal(gate.mode, 'core+exchange');
  });

  it('should handle mixed case mode strings', () => {
    const gate = new CapabilityGate({ mode: 'Core+Queue' });
    assert.equal(gate.mode, 'core+queue');
  });

  it('should handle whitespace in mode strings', () => {
    const gate = new CapabilityGate({ mode: '  full  ' });
    assert.equal(gate.mode, 'full');
  });

  it('should default to none for invalid modes', () => {
    const invalidModes = ['invalid', '', null, undefined, 123, {}, []];

    for (const invalidMode of invalidModes) {
      const gate = new CapabilityGate({ mode: invalidMode });
      assert.equal(gate.mode, 'none', `Should default to none for ${invalidMode}`);
    }
  });
});
