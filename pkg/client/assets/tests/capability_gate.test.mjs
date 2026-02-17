/**
 * Capability Gate Tests (Phase 4 - TX-046)
 * Tests capability-mode and permission gating for module nav and action controls.
 */
import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// =============================================================================
// Mock Implementations (mirrors capability-gate.ts logic)
// =============================================================================

/**
 * Parse capability mode from string, with fallback to 'none'
 */
function parseCapabilityMode(value) {
  const validModes = ['none', 'core', 'core+exchange', 'core+queue', 'full'];
  if (typeof value === 'string' && validModes.includes(value)) {
    return value;
  }
  return 'none';
}

/**
 * Check if exchange module is enabled by capability mode
 */
function isExchangeEnabled(mode) {
  return mode === 'core+exchange' || mode === 'full';
}

/**
 * Check if queue module is enabled by capability mode
 */
function isQueueEnabled(mode) {
  return mode === 'core+queue' || mode === 'full';
}

/**
 * Check if core translation features are enabled
 */
function isCoreEnabled(mode) {
  return mode !== 'none';
}

/**
 * Extract action state from raw payload
 */
function extractActionState(action) {
  if (!action || typeof action !== 'object') {
    return { enabled: false };
  }
  return {
    enabled: action.enabled === true,
    reason: typeof action.reason === 'string' ? action.reason : undefined,
    reason_code: typeof action.reason_code === 'string' ? action.reason_code : undefined,
    permission: typeof action.permission === 'string' ? action.permission : undefined,
  };
}

/**
 * Extract module state from raw payload
 */
function extractModuleState(state) {
  if (!state || typeof state !== 'object') {
    return {
      enabled: false,
      visible: false,
      entry: { enabled: false, reason: 'Invalid module state', reason_code: 'INVALID_STATE' },
      actions: {},
    };
  }

  const actions = {};
  if (state.actions && typeof state.actions === 'object') {
    for (const [key, value] of Object.entries(state.actions)) {
      if (value && typeof value === 'object') {
        actions[key] = extractActionState(value);
      }
    }
  }

  return {
    enabled: state.enabled === true,
    visible: state.visible === true,
    entry: extractActionState(state.entry),
    actions,
  };
}

/**
 * Extract translation capabilities from a raw payload
 */
function extractCapabilities(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const profile = parseCapabilityMode(payload.profile || payload.capability_mode);
  const schemaVersion = typeof payload.schema_version === 'number' ? payload.schema_version : 0;

  const modules = {};
  if (payload.modules && typeof payload.modules === 'object') {
    if (payload.modules.exchange) {
      modules.exchange = extractModuleState(payload.modules.exchange);
    }
    if (payload.modules.queue) {
      modules.queue = extractModuleState(payload.modules.queue);
    }
  }

  const features = {};
  if (payload.features && typeof payload.features === 'object') {
    features.cms = payload.features.cms === true;
    features.dashboard = payload.features.dashboard === true;
  }

  const routes = {};
  if (payload.routes && typeof payload.routes === 'object') {
    for (const [key, value] of Object.entries(payload.routes)) {
      if (typeof value === 'string') {
        routes[key] = value;
      }
    }
  }

  const panels = Array.isArray(payload.panels)
    ? payload.panels.filter((p) => typeof p === 'string')
    : [];

  const resolverKeys = Array.isArray(payload.resolver_keys)
    ? payload.resolver_keys.filter((k) => typeof k === 'string')
    : [];

  const warnings = Array.isArray(payload.warnings)
    ? payload.warnings.filter((w) => typeof w === 'string')
    : [];

  return {
    profile,
    capability_mode: profile,
    supported_profiles: ['none', 'core', 'core+exchange', 'core+queue', 'full'],
    schema_version: schemaVersion,
    modules,
    features,
    routes,
    panels,
    resolver_keys: resolverKeys,
    warnings,
    contracts: payload.contracts && typeof payload.contracts === 'object'
      ? payload.contracts
      : undefined,
  };
}

/**
 * CapabilityGate class implementation
 */
class CapabilityGate {
  constructor(capabilities) {
    this.capabilities = capabilities;
  }

  getMode() {
    return this.capabilities.profile;
  }

  getCapabilities() {
    return this.capabilities;
  }

  isModuleEnabledByMode(module) {
    const mode = this.capabilities.profile;
    if (module === 'exchange') {
      return isExchangeEnabled(mode);
    }
    return isQueueEnabled(mode);
  }

  getModuleState(module) {
    return this.capabilities.modules[module] || null;
  }

  getActionState(module, action) {
    const moduleState = this.getModuleState(module);
    if (!moduleState) {
      return null;
    }
    return moduleState.actions[action] || null;
  }

  gateNavItem(gate) {
    const moduleState = this.getModuleState(gate.module);

    // No module state = hidden
    if (!moduleState) {
      return {
        visible: false,
        enabled: false,
        reason: `${gate.module} module not configured`,
        reasonCode: 'MODULE_NOT_CONFIGURED',
      };
    }

    // Module disabled by capability mode = hidden
    if (!moduleState.enabled) {
      return {
        visible: false,
        enabled: false,
        reason: moduleState.entry.reason || 'Module disabled by capability mode',
        reasonCode: moduleState.entry.reason_code || 'FEATURE_DISABLED',
      };
    }

    // Module enabled but no entry permission = hidden
    if (!moduleState.visible || !moduleState.entry.enabled) {
      return {
        visible: false,
        enabled: false,
        reason: moduleState.entry.reason || 'Missing module view permission',
        reasonCode: moduleState.entry.reason_code || 'PERMISSION_DENIED',
        permission: moduleState.entry.permission,
      };
    }

    // If action specified, check action permission
    if (gate.action) {
      const actionState = moduleState.actions[gate.action];
      if (!actionState) {
        // Action not defined = visible but disabled
        return {
          visible: true,
          enabled: false,
          reason: `Action ${gate.action} not configured`,
          reasonCode: 'ACTION_NOT_CONFIGURED',
        };
      }

      if (!actionState.enabled) {
        // Action permission denied = visible but disabled
        return {
          visible: true,
          enabled: false,
          reason: actionState.reason || `Missing ${gate.action} permission`,
          reasonCode: actionState.reason_code || 'PERMISSION_DENIED',
          permission: actionState.permission,
        };
      }
    }

    // All checks passed = visible and enabled
    return {
      visible: true,
      enabled: true,
    };
  }

  gateAction(module, action) {
    return this.gateNavItem({ module, action });
  }

  canAccessExchange() {
    const gate = this.gateNavItem({ module: 'exchange' });
    return gate.visible && gate.enabled;
  }

  canAccessQueue() {
    const gate = this.gateNavItem({ module: 'queue' });
    return gate.visible && gate.enabled;
  }

  getRoute(key) {
    return this.capabilities.routes[key] || null;
  }

  isFeatureEnabled(feature) {
    return this.capabilities.features[feature] === true;
  }
}

/**
 * Create a CapabilityGate from raw payload
 */
function createCapabilityGate(payload) {
  const capabilities = extractCapabilities(payload);
  if (!capabilities) {
    return null;
  }
  return new CapabilityGate(capabilities);
}

/**
 * Create a default (empty) CapabilityGate for fallback
 */
function createEmptyCapabilityGate() {
  return new CapabilityGate({
    profile: 'none',
    capability_mode: 'none',
    supported_profiles: ['none', 'core', 'core+exchange', 'core+queue', 'full'],
    schema_version: 0,
    modules: {},
    features: {},
    routes: {},
    panels: [],
    resolver_keys: [],
    warnings: [],
  });
}

/**
 * Render ARIA attributes for a gated element
 */
function renderGateAriaAttributes(gate) {
  if (!gate.visible) {
    return 'aria-hidden="true" style="display: none;"';
  }

  if (!gate.enabled) {
    const reasonAttr = gate.reason ? ` title="${escapeAttr(gate.reason)}"` : '';
    return `aria-disabled="true"${reasonAttr}`;
  }

  return '';
}

function escapeAttr(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Get CSS class for a reason code
 */
function getReasonCodeLabelClass(reasonCode) {
  switch (reasonCode) {
    case 'FEATURE_DISABLED':
      return 'text-gray-500 bg-gray-100';
    case 'PERMISSION_DENIED':
      return 'text-amber-600 bg-amber-50';
    case 'MODULE_NOT_CONFIGURED':
      return 'text-blue-500 bg-blue-50';
    case 'ACTION_NOT_CONFIGURED':
      return 'text-blue-500 bg-blue-50';
    default:
      return 'text-gray-500 bg-gray-100';
  }
}

/**
 * Render a disabled reason badge
 */
function renderDisabledReasonBadge(gate) {
  if (gate.enabled || !gate.reason) {
    return '';
  }

  const reasonCode = gate.reasonCode || 'DISABLED';
  const labelClass = getReasonCodeLabelClass(reasonCode);

  return `
    <span class="capability-gate-reason ${labelClass}"
          role="status"
          aria-label="${escapeAttr(gate.reason)}"
          data-reason-code="${escapeAttr(reasonCode)}">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 inline-block mr-1">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" />
      </svg>
      ${escapeHtml(gate.reason)}
    </span>
  `.trim();
}

/**
 * Get CSS styles for capability gate components
 */
function getCapabilityGateStyles() {
  return `
    /* Capability Gate Styles */
    .capability-gate-reason {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 500;
      border-radius: 0.25rem;
      white-space: nowrap;
    }

    .capability-gate-disabled {
      opacity: 0.6;
      cursor: not-allowed;
      pointer-events: none;
    }

    [aria-disabled="true"].capability-gate-action {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .capability-gate-hidden {
      display: none !important;
    }
  `;
}

// =============================================================================
// Tests
// =============================================================================

describe('Capability Gate - Mode Parsing', () => {
  it('should parse valid capability modes', () => {
    assert.strictEqual(parseCapabilityMode('none'), 'none');
    assert.strictEqual(parseCapabilityMode('core'), 'core');
    assert.strictEqual(parseCapabilityMode('core+exchange'), 'core+exchange');
    assert.strictEqual(parseCapabilityMode('core+queue'), 'core+queue');
    assert.strictEqual(parseCapabilityMode('full'), 'full');
  });

  it('should return none for invalid modes', () => {
    assert.strictEqual(parseCapabilityMode('invalid'), 'none');
    assert.strictEqual(parseCapabilityMode(null), 'none');
    assert.strictEqual(parseCapabilityMode(undefined), 'none');
    assert.strictEqual(parseCapabilityMode(123), 'none');
    assert.strictEqual(parseCapabilityMode({}), 'none');
  });
});

describe('Capability Gate - Mode Checks', () => {
  describe('isExchangeEnabled', () => {
    it('should return true for core+exchange', () => {
      assert.strictEqual(isExchangeEnabled('core+exchange'), true);
    });

    it('should return true for full', () => {
      assert.strictEqual(isExchangeEnabled('full'), true);
    });

    it('should return false for core', () => {
      assert.strictEqual(isExchangeEnabled('core'), false);
    });

    it('should return false for core+queue', () => {
      assert.strictEqual(isExchangeEnabled('core+queue'), false);
    });

    it('should return false for none', () => {
      assert.strictEqual(isExchangeEnabled('none'), false);
    });
  });

  describe('isQueueEnabled', () => {
    it('should return true for core+queue', () => {
      assert.strictEqual(isQueueEnabled('core+queue'), true);
    });

    it('should return true for full', () => {
      assert.strictEqual(isQueueEnabled('full'), true);
    });

    it('should return false for core', () => {
      assert.strictEqual(isQueueEnabled('core'), false);
    });

    it('should return false for core+exchange', () => {
      assert.strictEqual(isQueueEnabled('core+exchange'), false);
    });

    it('should return false for none', () => {
      assert.strictEqual(isQueueEnabled('none'), false);
    });
  });

  describe('isCoreEnabled', () => {
    it('should return true for all modes except none', () => {
      assert.strictEqual(isCoreEnabled('core'), true);
      assert.strictEqual(isCoreEnabled('core+exchange'), true);
      assert.strictEqual(isCoreEnabled('core+queue'), true);
      assert.strictEqual(isCoreEnabled('full'), true);
    });

    it('should return false for none', () => {
      assert.strictEqual(isCoreEnabled('none'), false);
    });
  });
});

describe('Capability Gate - Extraction', () => {
  it('should extract capabilities from valid payload', () => {
    const payload = {
      profile: 'full',
      capability_mode: 'full',
      schema_version: 1,
      modules: {
        exchange: {
          enabled: true,
          visible: true,
          entry: { enabled: true, permission: 'admin.translations.import.view' },
          actions: {
            export: { enabled: true, permission: 'admin.translations.export' },
            'import.apply': { enabled: false, reason: 'Missing permission', reason_code: 'PERMISSION_DENIED', permission: 'admin.translations.import.apply' },
          },
        },
        queue: {
          enabled: true,
          visible: true,
          entry: { enabled: true },
          actions: {
            view: { enabled: true },
            claim: { enabled: true },
          },
        },
      },
      features: {
        cms: true,
        dashboard: true,
      },
      routes: {
        'admin.translations.queue': '/admin/translations/queue',
        'admin.translations.exchange': '/admin/translations/exchange',
      },
      panels: ['pages', 'posts'],
      resolver_keys: ['admin.translations.queue', 'admin.translations.exchange'],
      warnings: [],
    };

    const caps = extractCapabilities(payload);
    assert.ok(caps);
    assert.strictEqual(caps.profile, 'full');
    assert.strictEqual(caps.schema_version, 1);
    assert.ok(caps.modules.exchange);
    assert.ok(caps.modules.queue);
    assert.strictEqual(caps.modules.exchange.enabled, true);
    assert.strictEqual(caps.modules.exchange.actions['import.apply'].enabled, false);
    assert.strictEqual(caps.modules.exchange.actions['import.apply'].reason_code, 'PERMISSION_DENIED');
    assert.strictEqual(caps.features.cms, true);
  });

  it('should return null for invalid payload', () => {
    assert.strictEqual(extractCapabilities(null), null);
    assert.strictEqual(extractCapabilities(undefined), null);
    assert.strictEqual(extractCapabilities('string'), null);
    assert.strictEqual(extractCapabilities(123), null);
  });

  it('should handle missing optional fields', () => {
    const payload = {
      profile: 'core',
    };

    const caps = extractCapabilities(payload);
    assert.ok(caps);
    assert.strictEqual(caps.profile, 'core');
    assert.deepStrictEqual(caps.modules, {});
    assert.deepStrictEqual(caps.features, {});
    assert.deepStrictEqual(caps.routes, {});
    assert.deepStrictEqual(caps.panels, []);
  });
});

describe('Capability Gate - Gate Factory', () => {
  it('should create gate from valid payload', () => {
    const payload = {
      profile: 'full',
      modules: {
        exchange: { enabled: true, visible: true, entry: { enabled: true }, actions: {} },
      },
    };

    const gate = createCapabilityGate(payload);
    assert.ok(gate);
    assert.ok(gate instanceof CapabilityGate);
    assert.strictEqual(gate.getMode(), 'full');
  });

  it('should return null for invalid payload', () => {
    assert.strictEqual(createCapabilityGate(null), null);
    assert.strictEqual(createCapabilityGate('invalid'), null);
  });

  it('should create empty gate', () => {
    const gate = createEmptyCapabilityGate();
    assert.ok(gate);
    assert.strictEqual(gate.getMode(), 'none');
    assert.strictEqual(gate.canAccessExchange(), false);
    assert.strictEqual(gate.canAccessQueue(), false);
  });
});

describe('Capability Gate - Nav Item Gating', () => {
  describe('module disabled by capability mode', () => {
    it('should hide exchange when mode is core', () => {
      const gate = createCapabilityGate({
        profile: 'core',
        modules: {
          exchange: {
            enabled: false,
            visible: false,
            entry: { enabled: false, reason: 'module disabled by capability mode', reason_code: 'FEATURE_DISABLED' },
            actions: {},
          },
        },
      });

      const result = gate.gateNavItem({ module: 'exchange' });
      assert.strictEqual(result.visible, false);
      assert.strictEqual(result.enabled, false);
      assert.strictEqual(result.reasonCode, 'FEATURE_DISABLED');
    });

    it('should hide queue when mode is core+exchange', () => {
      const gate = createCapabilityGate({
        profile: 'core+exchange',
        modules: {
          queue: {
            enabled: false,
            visible: false,
            entry: { enabled: false, reason: 'module disabled by capability mode', reason_code: 'FEATURE_DISABLED' },
            actions: {},
          },
        },
      });

      const result = gate.gateNavItem({ module: 'queue' });
      assert.strictEqual(result.visible, false);
      assert.strictEqual(result.enabled, false);
    });
  });

  describe('module enabled but missing entry permission', () => {
    it('should hide when entry permission denied', () => {
      const gate = createCapabilityGate({
        profile: 'full',
        modules: {
          exchange: {
            enabled: true,
            visible: false,
            entry: { enabled: false, reason: 'missing permission: admin.translations.import.view', reason_code: 'PERMISSION_DENIED', permission: 'admin.translations.import.view' },
            actions: {},
          },
        },
      });

      const result = gate.gateNavItem({ module: 'exchange' });
      assert.strictEqual(result.visible, false);
      assert.strictEqual(result.enabled, false);
      assert.strictEqual(result.reasonCode, 'PERMISSION_DENIED');
      assert.strictEqual(result.permission, 'admin.translations.import.view');
    });
  });

  describe('module enabled with entry permission', () => {
    it('should be visible and enabled', () => {
      const gate = createCapabilityGate({
        profile: 'full',
        modules: {
          exchange: {
            enabled: true,
            visible: true,
            entry: { enabled: true, permission: 'admin.translations.import.view' },
            actions: {},
          },
        },
      });

      const result = gate.gateNavItem({ module: 'exchange' });
      assert.strictEqual(result.visible, true);
      assert.strictEqual(result.enabled, true);
      assert.strictEqual(result.reason, undefined);
    });
  });

  describe('action-level gating', () => {
    it('should show visible-disabled for denied action permission', () => {
      const gate = createCapabilityGate({
        profile: 'full',
        modules: {
          exchange: {
            enabled: true,
            visible: true,
            entry: { enabled: true },
            actions: {
              export: { enabled: true },
              'import.apply': { enabled: false, reason: 'missing permission: admin.translations.import.apply', reason_code: 'PERMISSION_DENIED', permission: 'admin.translations.import.apply' },
            },
          },
        },
      });

      const result = gate.gateNavItem({ module: 'exchange', action: 'import.apply' });
      assert.strictEqual(result.visible, true);
      assert.strictEqual(result.enabled, false);
      assert.strictEqual(result.reasonCode, 'PERMISSION_DENIED');
      assert.strictEqual(result.permission, 'admin.translations.import.apply');
    });

    it('should be visible and enabled for allowed action', () => {
      const gate = createCapabilityGate({
        profile: 'full',
        modules: {
          exchange: {
            enabled: true,
            visible: true,
            entry: { enabled: true },
            actions: {
              export: { enabled: true, permission: 'admin.translations.export' },
            },
          },
        },
      });

      const result = gate.gateNavItem({ module: 'exchange', action: 'export' });
      assert.strictEqual(result.visible, true);
      assert.strictEqual(result.enabled, true);
    });

    it('should show visible-disabled for unconfigured action', () => {
      const gate = createCapabilityGate({
        profile: 'full',
        modules: {
          exchange: {
            enabled: true,
            visible: true,
            entry: { enabled: true },
            actions: {},
          },
        },
      });

      const result = gate.gateNavItem({ module: 'exchange', action: 'unknown_action' });
      assert.strictEqual(result.visible, true);
      assert.strictEqual(result.enabled, false);
      assert.strictEqual(result.reasonCode, 'ACTION_NOT_CONFIGURED');
    });
  });
});

describe('Capability Gate - Convenience Methods', () => {
  it('canAccessExchange returns correct state', () => {
    const gateEnabled = createCapabilityGate({
      profile: 'full',
      modules: {
        exchange: { enabled: true, visible: true, entry: { enabled: true }, actions: {} },
      },
    });
    assert.strictEqual(gateEnabled.canAccessExchange(), true);

    const gateDisabled = createCapabilityGate({
      profile: 'core',
      modules: {
        exchange: { enabled: false, visible: false, entry: { enabled: false }, actions: {} },
      },
    });
    assert.strictEqual(gateDisabled.canAccessExchange(), false);
  });

  it('canAccessQueue returns correct state', () => {
    const gateEnabled = createCapabilityGate({
      profile: 'full',
      modules: {
        queue: { enabled: true, visible: true, entry: { enabled: true }, actions: {} },
      },
    });
    assert.strictEqual(gateEnabled.canAccessQueue(), true);

    const gateDisabled = createCapabilityGate({
      profile: 'core+exchange',
      modules: {
        queue: { enabled: false, visible: false, entry: { enabled: false }, actions: {} },
      },
    });
    assert.strictEqual(gateDisabled.canAccessQueue(), false);
  });

  it('getRoute returns route URL', () => {
    const gate = createCapabilityGate({
      profile: 'full',
      routes: {
        'admin.translations.queue': '/admin/translations/queue',
        'admin.translations.exchange': '/admin/translations/exchange',
      },
    });

    assert.strictEqual(gate.getRoute('admin.translations.queue'), '/admin/translations/queue');
    assert.strictEqual(gate.getRoute('nonexistent'), null);
  });

  it('isFeatureEnabled returns feature state', () => {
    const gate = createCapabilityGate({
      profile: 'full',
      features: { cms: true, dashboard: false },
    });

    assert.strictEqual(gate.isFeatureEnabled('cms'), true);
    assert.strictEqual(gate.isFeatureEnabled('dashboard'), false);
  });
});

describe('Capability Gate - Render Helpers', () => {
  describe('renderGateAriaAttributes', () => {
    it('should render hidden attributes for invisible', () => {
      const attrs = renderGateAriaAttributes({ visible: false, enabled: false });
      assert.ok(attrs.includes('aria-hidden="true"'));
      assert.ok(attrs.includes('display: none'));
    });

    it('should render disabled attributes for visible-disabled', () => {
      const attrs = renderGateAriaAttributes({ visible: true, enabled: false, reason: 'Permission denied' });
      assert.ok(attrs.includes('aria-disabled="true"'));
      assert.ok(attrs.includes('title="Permission denied"'));
    });

    it('should return empty string for visible-enabled', () => {
      const attrs = renderGateAriaAttributes({ visible: true, enabled: true });
      assert.strictEqual(attrs, '');
    });
  });

  describe('renderDisabledReasonBadge', () => {
    it('should render badge for disabled state with reason', () => {
      const html = renderDisabledReasonBadge({
        visible: true,
        enabled: false,
        reason: 'Missing permission',
        reasonCode: 'PERMISSION_DENIED',
      });
      assert.ok(html.includes('capability-gate-reason'));
      assert.ok(html.includes('Missing permission'));
      assert.ok(html.includes('data-reason-code="PERMISSION_DENIED"'));
      assert.ok(html.includes('text-amber-600'));
    });

    it('should return empty string for enabled state', () => {
      const html = renderDisabledReasonBadge({ visible: true, enabled: true });
      assert.strictEqual(html, '');
    });

    it('should return empty string when no reason', () => {
      const html = renderDisabledReasonBadge({ visible: true, enabled: false });
      assert.strictEqual(html, '');
    });

    it('should use correct class for FEATURE_DISABLED', () => {
      const html = renderDisabledReasonBadge({
        visible: true,
        enabled: false,
        reason: 'Module disabled',
        reasonCode: 'FEATURE_DISABLED',
      });
      assert.ok(html.includes('text-gray-500'));
    });
  });

  describe('getCapabilityGateStyles', () => {
    it('should return CSS string', () => {
      const styles = getCapabilityGateStyles();
      assert.ok(typeof styles === 'string');
      assert.ok(styles.includes('.capability-gate-reason'));
      assert.ok(styles.includes('.capability-gate-disabled'));
    });
  });
});

describe('Capability Gate - Full Integration Scenarios', () => {
  describe('core mode (no exchange, no queue)', () => {
    const gate = createCapabilityGate({
      profile: 'core',
      modules: {
        exchange: {
          enabled: false,
          visible: false,
          entry: { enabled: false, reason: 'module disabled by capability mode', reason_code: 'FEATURE_DISABLED' },
          actions: {},
        },
        queue: {
          enabled: false,
          visible: false,
          entry: { enabled: false, reason: 'module disabled by capability mode', reason_code: 'FEATURE_DISABLED' },
          actions: {},
        },
      },
    });

    it('should hide exchange nav', () => {
      assert.strictEqual(gate.gateNavItem({ module: 'exchange' }).visible, false);
    });

    it('should hide queue nav', () => {
      assert.strictEqual(gate.gateNavItem({ module: 'queue' }).visible, false);
    });

    it('reports correct mode', () => {
      assert.strictEqual(gate.getMode(), 'core');
    });
  });

  describe('core+exchange mode', () => {
    const gate = createCapabilityGate({
      profile: 'core+exchange',
      modules: {
        exchange: {
          enabled: true,
          visible: true,
          entry: { enabled: true },
          actions: {
            export: { enabled: true },
            'import.view': { enabled: true },
            'import.validate': { enabled: true },
            'import.apply': { enabled: false, reason: 'missing permission', reason_code: 'PERMISSION_DENIED' },
          },
        },
        queue: {
          enabled: false,
          visible: false,
          entry: { enabled: false, reason: 'module disabled by capability mode', reason_code: 'FEATURE_DISABLED' },
          actions: {},
        },
      },
    });

    it('should show exchange nav', () => {
      const result = gate.gateNavItem({ module: 'exchange' });
      assert.strictEqual(result.visible, true);
      assert.strictEqual(result.enabled, true);
    });

    it('should hide queue nav', () => {
      assert.strictEqual(gate.gateNavItem({ module: 'queue' }).visible, false);
    });

    it('should enable export action', () => {
      const result = gate.gateAction('exchange', 'export');
      assert.strictEqual(result.visible, true);
      assert.strictEqual(result.enabled, true);
    });

    it('should disable import.apply action with reason', () => {
      const result = gate.gateAction('exchange', 'import.apply');
      assert.strictEqual(result.visible, true);
      assert.strictEqual(result.enabled, false);
      assert.strictEqual(result.reasonCode, 'PERMISSION_DENIED');
    });
  });

  describe('full mode with partial permissions', () => {
    const gate = createCapabilityGate({
      profile: 'full',
      modules: {
        exchange: {
          enabled: true,
          visible: true,
          entry: { enabled: true },
          actions: {
            export: { enabled: true },
            'import.apply': { enabled: false, reason: 'missing permission: admin.translations.import.apply', reason_code: 'PERMISSION_DENIED' },
          },
        },
        queue: {
          enabled: true,
          visible: true,
          entry: { enabled: true },
          actions: {
            view: { enabled: true },
            claim: { enabled: true },
            approve: { enabled: false, reason: 'missing permission: admin.translations.approve', reason_code: 'PERMISSION_DENIED' },
          },
        },
      },
    });

    it('should show both modules', () => {
      assert.strictEqual(gate.canAccessExchange(), true);
      assert.strictEqual(gate.canAccessQueue(), true);
    });

    it('should disable import.apply in exchange', () => {
      const result = gate.gateAction('exchange', 'import.apply');
      assert.strictEqual(result.visible, true);
      assert.strictEqual(result.enabled, false);
    });

    it('should disable approve in queue', () => {
      const result = gate.gateAction('queue', 'approve');
      assert.strictEqual(result.visible, true);
      assert.strictEqual(result.enabled, false);
    });

    it('should enable allowed actions', () => {
      assert.strictEqual(gate.gateAction('exchange', 'export').enabled, true);
      assert.strictEqual(gate.gateAction('queue', 'view').enabled, true);
      assert.strictEqual(gate.gateAction('queue', 'claim').enabled, true);
    });
  });
});
