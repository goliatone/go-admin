import test from 'node:test';
import assert from 'node:assert/strict';

const {
  parseCapabilityMode,
  renderDisabledReasonBadge,
  createCapabilityGate,
} = await import('../dist/datatable/index.js');

test('capability-gate module contract: parses known capability profiles', () => {
  assert.equal(parseCapabilityMode('core'), 'core');
  assert.equal(parseCapabilityMode('core+exchange'), 'core+exchange');
  assert.equal(parseCapabilityMode('full'), 'full');
  assert.equal(parseCapabilityMode('unknown'), 'none');
});

test('capability-gate module contract: renders shared disabled-reason badge when reason code exists', () => {
  const html = renderDisabledReasonBadge({
    visible: true,
    enabled: false,
    reason: 'missing permission: admin.translations.import.apply',
    reasonCode: 'PERMISSION_DENIED',
    permission: 'admin.translations.import.apply',
  });

  assert.ok(html.includes('data-reason-code="PERMISSION_DENIED"'));
  assert.ok(html.includes('permission') || html.includes('No permission'));
});

test('capability-gate module contract: entry permission denied is visible-disabled when module is visible', () => {
  const gate = createCapabilityGate({
    profile: 'full',
    capability_mode: 'full',
    schema_version: 1,
    modules: {
      queue: {
        enabled: true,
        visible: true,
        entry: {
          enabled: false,
          reason: 'missing permission: admin.translations.queue.view',
          reason_code: 'PERMISSION_DENIED',
          permission: 'admin.translations.queue.view',
        },
        actions: {},
      },
    },
    routes: {},
    features: {},
    panels: [],
    resolver_keys: [],
    warnings: [],
  });

  const result = gate.gateNavItem({ module: 'queue' });
  assert.equal(result.visible, true);
  assert.equal(result.enabled, false);
  assert.equal(result.reasonCode, 'PERMISSION_DENIED');
});
