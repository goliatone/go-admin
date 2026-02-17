/**
 * Capability Gate Tests (Phase 4 - TX-046)
 */
import { describe, it, before, beforeEach, after, mock } from 'node:test';
import assert from 'node:assert';

// Mock DOM environment
globalThis.document = {
  createElement: (tag) => ({
    tagName: tag,
    style: {},
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      contains(c) { return this._classes.has(c); },
    },
    setAttribute: function(k, v) { this[k] = v; },
    getAttribute: function(k) { return this[k]; },
    removeAttribute: function(k) { delete this[k]; },
    dataset: {},
    addEventListener: () => {},
    removeEventListener: () => {},
    querySelectorAll: () => [],
  }),
};

globalThis.HTMLElement = class {};

// Import after mocks
const {
  parseCapabilityMode,
  isExchangeEnabled,
  isQueueEnabled,
  isCoreEnabled,
  extractCapabilities,
  createCapabilityGate,
  createEmptyCapabilityGate,
  CapabilityGate,
  renderGateAriaAttributes,
  renderDisabledReasonBadge,
  getCapabilityGateStyles,
} = await import('../dist/datatable/index.js');

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
