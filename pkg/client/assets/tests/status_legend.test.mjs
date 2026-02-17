import test from 'node:test';
import assert from 'node:assert/strict';

// Import status legend from datatable index
const {
  StatusLegend,
  DEFAULT_STATUS_LEGEND_ITEMS,
} = await import('../dist/datatable/index.js');

// =============================================================================
// Phase 1 Feature Tests: TX-028 Status Legend Component
// =============================================================================

test('DEFAULT_STATUS_LEGEND_ITEMS has required status entries', () => {
  // Contract: ready, incomplete, missing, fallback
  assert.equal(DEFAULT_STATUS_LEGEND_ITEMS.length, 4);

  const keys = DEFAULT_STATUS_LEGEND_ITEMS.map(item => item.key);
  assert.ok(keys.includes('ready'), 'Should have ready status');
  assert.ok(keys.includes('incomplete'), 'Should have incomplete status');
  assert.ok(keys.includes('missing'), 'Should have missing status');
  assert.ok(keys.includes('fallback'), 'Should have fallback status');
});

test('DEFAULT_STATUS_LEGEND_ITEMS has correct icons per contract', () => {
  const iconMap = Object.fromEntries(
    DEFAULT_STATUS_LEGEND_ITEMS.map(item => [item.key, item.icon])
  );

  // Contract icons: ● ready, ◐ incomplete, ○ missing, ⚠ fallback
  assert.equal(iconMap.ready, '●');
  assert.equal(iconMap.incomplete, '◐');
  assert.equal(iconMap.missing, '○');
  assert.equal(iconMap.fallback, '⚠');
});

test('StatusLegend constructor accepts config', () => {
  // Mock container element
  const mockContainer = {
    innerHTML: '',
    hasAttribute: () => false,
    setAttribute: () => {},
    querySelector: () => null,
  };

  const legend = new StatusLegend({
    container: mockContainer,
    orientation: 'horizontal',
    size: 'default',
  });

  assert.ok(legend);
});

test('StatusLegend.buildHTML generates accessible HTML', () => {
  const mockContainer = {
    innerHTML: '',
    hasAttribute: () => false,
    setAttribute: () => {},
    querySelector: () => null,
  };

  const legend = new StatusLegend({
    container: mockContainer,
  });

  const html = legend.buildHTML();

  // Should have role="list" for accessibility
  assert.match(html, /role="list"/);
  // Should have aria-label
  assert.match(html, /aria-label="Translation status legend"/);
  // Should contain all status items
  assert.match(html, /Ready/);
  assert.match(html, /Incomplete/);
  assert.match(html, /Missing/);
  assert.match(html, /Fallback/);
});

test('StatusLegend.buildHTML respects orientation config', () => {
  const mockContainer = {
    innerHTML: '',
    hasAttribute: () => false,
    setAttribute: () => {},
    querySelector: () => null,
  };

  const horizontalLegend = new StatusLegend({
    container: mockContainer,
    orientation: 'horizontal',
  });
  const horizontalHtml = horizontalLegend.buildHTML();
  assert.match(horizontalHtml, /flex-row/);

  const verticalLegend = new StatusLegend({
    container: mockContainer,
    orientation: 'vertical',
  });
  const verticalHtml = verticalLegend.buildHTML();
  assert.match(verticalHtml, /flex-col/);
});

test('StatusLegend.buildHTML respects size config', () => {
  const mockContainer = {
    innerHTML: '',
    hasAttribute: () => false,
    setAttribute: () => {},
    querySelector: () => null,
  };

  const smLegend = new StatusLegend({
    container: mockContainer,
    size: 'sm',
  });
  const smHtml = smLegend.buildHTML();
  assert.match(smHtml, /text-xs/);

  const defaultLegend = new StatusLegend({
    container: mockContainer,
    size: 'default',
  });
  const defaultHtml = defaultLegend.buildHTML();
  assert.match(defaultHtml, /text-sm/);
});

test('StatusLegend.buildHTML includes title when provided', () => {
  const mockContainer = {
    innerHTML: '',
    hasAttribute: () => false,
    setAttribute: () => {},
    querySelector: () => null,
  };

  const legend = new StatusLegend({
    container: mockContainer,
    title: 'Legend:',
  });

  const html = legend.buildHTML();
  assert.match(html, /Legend:/);
});

test('StatusLegend accepts custom items', () => {
  const mockContainer = {
    innerHTML: '',
    hasAttribute: () => false,
    setAttribute: () => {},
    querySelector: () => null,
  };

  const customItems = [
    { key: 'custom1', label: 'Custom Status', icon: '★', colorClass: 'text-blue-500', description: 'A custom status' },
  ];

  const legend = new StatusLegend({
    container: mockContainer,
    items: customItems,
  });

  const html = legend.buildHTML();
  assert.match(html, /Custom Status/);
  assert.match(html, /★/);
});

test('DEFAULT_STATUS_LEGEND_ITEMS has descriptions for each status', () => {
  for (const item of DEFAULT_STATUS_LEGEND_ITEMS) {
    assert.ok(item.description, `${item.key} should have a description`);
    assert.equal(typeof item.description, 'string');
    assert.ok(item.description.length > 0, `${item.key} description should not be empty`);
  }
});

test('DEFAULT_STATUS_LEGEND_ITEMS has color classes for each status', () => {
  for (const item of DEFAULT_STATUS_LEGEND_ITEMS) {
    assert.ok(item.colorClass, `${item.key} should have a colorClass`);
    assert.match(item.colorClass, /text-/);
  }
});
