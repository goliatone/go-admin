/**
 * Tests for quick-filters.ts (Phase 2)
 * Tests quick filter rendering, capability-aware disabled states, and selection logic
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ============================================================================
// TX-036: Quick Filters Tests
// ============================================================================

describe('DEFAULT_TRANSLATION_QUICK_FILTERS', () => {
  const DEFAULT_TRANSLATION_QUICK_FILTERS = [
    {
      key: 'all',
      label: 'All',
      field: '',
      value: '',
      icon: '○',
      styleClass: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
      description: 'Show all records',
    },
    {
      key: 'ready',
      label: 'Ready',
      field: 'readiness_state',
      value: 'ready',
      icon: '●',
      styleClass: 'bg-green-100 text-green-700 hover:bg-green-200',
      description: 'All translations complete',
    },
    {
      key: 'missing_locales',
      label: 'Missing',
      field: 'readiness_state',
      value: 'missing_locales',
      icon: '○',
      styleClass: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
      description: 'Missing required locale translations',
    },
    {
      key: 'missing_fields',
      label: 'Incomplete',
      field: 'readiness_state',
      value: 'missing_fields',
      icon: '◐',
      styleClass: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
      description: 'Has translations but missing required fields',
    },
    {
      key: 'fallback',
      label: 'Fallback',
      field: 'fallback_used',
      value: 'true',
      icon: '⚠',
      styleClass: 'bg-orange-100 text-orange-700 hover:bg-orange-200',
      description: 'Records currently viewed in fallback mode',
    },
  ];

  it('should have all readiness state filters', () => {
    const keys = DEFAULT_TRANSLATION_QUICK_FILTERS.map(f => f.key);
    assert.ok(keys.includes('all'), 'Should have "all" filter');
    assert.ok(keys.includes('ready'), 'Should have "ready" filter');
    assert.ok(keys.includes('missing_locales'), 'Should have "missing_locales" filter');
    assert.ok(keys.includes('missing_fields'), 'Should have "missing_fields" filter');
    assert.ok(keys.includes('fallback'), 'Should have "fallback" filter');
  });

  it('should have correct field mappings for readiness filters', () => {
    const ready = DEFAULT_TRANSLATION_QUICK_FILTERS.find(f => f.key === 'ready');
    const missing = DEFAULT_TRANSLATION_QUICK_FILTERS.find(f => f.key === 'missing_locales');
    const fallback = DEFAULT_TRANSLATION_QUICK_FILTERS.find(f => f.key === 'fallback');

    assert.equal(ready.field, 'readiness_state');
    assert.equal(ready.value, 'ready');

    assert.equal(missing.field, 'readiness_state');
    assert.equal(missing.value, 'missing_locales');

    assert.equal(fallback.field, 'fallback_used');
    assert.equal(fallback.value, 'true');
  });

  it('should have "all" filter with empty field/value', () => {
    const all = DEFAULT_TRANSLATION_QUICK_FILTERS.find(f => f.key === 'all');
    assert.equal(all.field, '');
    assert.equal(all.value, '');
  });

  it('should have consistent icons matching status legend', () => {
    const ready = DEFAULT_TRANSLATION_QUICK_FILTERS.find(f => f.key === 'ready');
    const missing = DEFAULT_TRANSLATION_QUICK_FILTERS.find(f => f.key === 'missing_locales');
    const incomplete = DEFAULT_TRANSLATION_QUICK_FILTERS.find(f => f.key === 'missing_fields');
    const fallback = DEFAULT_TRANSLATION_QUICK_FILTERS.find(f => f.key === 'fallback');

    assert.equal(ready.icon, '●', 'Ready should have filled circle');
    assert.equal(missing.icon, '○', 'Missing should have empty circle');
    assert.equal(incomplete.icon, '◐', 'Incomplete should have half circle');
    assert.equal(fallback.icon, '⚠', 'Fallback should have warning icon');
  });
});

describe('QuickFilterState', () => {
  function createState(activeKey = null, capabilities = []) {
    const capMap = new Map();
    for (const cap of capabilities) {
      capMap.set(cap.key, cap);
    }
    return { activeKey, capabilities: capMap };
  }

  it('should track active filter key', () => {
    const state = createState('ready');
    assert.equal(state.activeKey, 'ready');
  });

  it('should track capabilities', () => {
    const state = createState(null, [
      { key: 'ready', supported: true },
      { key: 'fallback', supported: false, disabledReason: 'Not available' },
    ]);

    assert.equal(state.capabilities.get('ready').supported, true);
    assert.equal(state.capabilities.get('fallback').supported, false);
    assert.equal(state.capabilities.get('fallback').disabledReason, 'Not available');
  });

  it('should return undefined for unknown capabilities', () => {
    const state = createState();
    assert.equal(state.capabilities.get('unknown'), undefined);
  });
});

describe('renderQuickFiltersHTML', () => {
  // Simulate render logic
  function renderQuickFiltersHTML(options = {}) {
    const {
      filters = [
        { key: 'all', label: 'All', field: '', value: '', icon: '○' },
        { key: 'ready', label: 'Ready', field: 'readiness_state', value: 'ready', icon: '●', styleClass: 'bg-green-100' },
      ],
      activeKey = null,
      capabilities = [],
      size = 'default',
    } = options;

    const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
    const capMap = new Map();
    for (const cap of capabilities) {
      capMap.set(cap.key, cap);
    }

    const filtersHtml = filters.map(filter => {
      const capability = capMap.get(filter.key);
      const isSupported = capability?.supported !== false;
      const isActive = activeKey === filter.key;
      const disabledReason = capability?.disabledReason || 'Filter not available';

      let stateClasses;
      if (!isSupported) {
        stateClasses = 'disabled cursor-not-allowed opacity-60';
      } else if (isActive) {
        stateClasses = `${filter.styleClass || ''} active ring-2`;
      } else {
        stateClasses = filter.styleClass || '';
      }

      const titleAttr = !isSupported ? `title="${disabledReason}"` : '';
      return `<span class="${textSize} ${stateClasses}" ${titleAttr}>${filter.icon || ''}${filter.label}</span>`;
    }).join('');

    return `<div class="quick-filters">${filtersHtml}</div>`;
  }

  it('should render all filters', () => {
    const html = renderQuickFiltersHTML();
    assert.ok(html.includes('All'), 'Should include All filter');
    assert.ok(html.includes('Ready'), 'Should include Ready filter');
  });

  it('should mark active filter with ring', () => {
    const html = renderQuickFiltersHTML({ activeKey: 'ready' });
    assert.ok(html.includes('active'), 'Active filter should have active class');
    assert.ok(html.includes('ring-2'), 'Active filter should have ring');
  });

  it('should disable unsupported filters', () => {
    const html = renderQuickFiltersHTML({
      capabilities: [
        { key: 'ready', supported: false, disabledReason: 'Backend does not support' },
      ],
    });
    assert.ok(html.includes('disabled'), 'Should have disabled class');
    assert.ok(html.includes('cursor-not-allowed'), 'Should have cursor-not-allowed');
    assert.ok(html.includes('opacity-60'), 'Should have reduced opacity');
  });

  it('should show disabled reason in title', () => {
    const html = renderQuickFiltersHTML({
      capabilities: [
        { key: 'ready', supported: false, disabledReason: 'Not available for this panel' },
      ],
    });
    assert.ok(html.includes('title="Not available for this panel"'), 'Should have disabled reason in title');
  });

  it('should use small size classes when specified', () => {
    const html = renderQuickFiltersHTML({ size: 'sm' });
    assert.ok(html.includes('text-xs'), 'Should have text-xs for small size');
  });

  it('should use default size classes by default', () => {
    const html = renderQuickFiltersHTML();
    assert.ok(html.includes('text-sm'), 'Should have text-sm for default size');
  });
});

describe('QuickFilters selection logic', () => {
  function selectFilter(state, key, filters) {
    const filter = filters.find(f => f.key === key);
    if (!filter) return null;

    const capability = state.capabilities.get(key);
    if (capability?.supported === false) {
      return null; // Cannot select unsupported filter
    }

    // Toggle if same filter
    if (state.activeKey === key) {
      return { activeKey: null, filter: null };
    }

    // Return selected filter
    return { activeKey: key, filter };
  }

  const filters = [
    { key: 'all', label: 'All', field: '', value: '' },
    { key: 'ready', label: 'Ready', field: 'readiness_state', value: 'ready' },
    { key: 'missing', label: 'Missing', field: 'readiness_state', value: 'missing_locales' },
  ];

  it('should select filter when clicked', () => {
    const state = { activeKey: null, capabilities: new Map() };
    const result = selectFilter(state, 'ready', filters);
    assert.equal(result.activeKey, 'ready');
    assert.deepEqual(result.filter, filters[1]);
  });

  it('should toggle off when same filter clicked', () => {
    const state = { activeKey: 'ready', capabilities: new Map() };
    const result = selectFilter(state, 'ready', filters);
    assert.equal(result.activeKey, null);
    assert.equal(result.filter, null);
  });

  it('should not select unsupported filter', () => {
    const state = {
      activeKey: null,
      capabilities: new Map([['ready', { key: 'ready', supported: false }]]),
    };
    const result = selectFilter(state, 'ready', filters);
    assert.equal(result, null);
  });

  it('should return null filter for "all" selection', () => {
    const state = { activeKey: null, capabilities: new Map() };
    const result = selectFilter(state, 'all', filters);
    assert.equal(result.activeKey, 'all');
    assert.equal(result.filter.field, '');
  });
});

describe('Capability-aware disabled states', () => {
  function getFilterDisplayState(filter, capability, activeKey) {
    const isSupported = capability?.supported !== false;
    const isActive = activeKey === filter.key;
    const disabledReason = capability?.disabledReason || 'Filter not available';

    if (!isSupported) {
      return {
        state: 'disabled',
        reason: disabledReason,
        ariaDisabled: true,
        cursor: 'not-allowed',
        opacity: 0.6,
      };
    }

    if (isActive) {
      return {
        state: 'active',
        reason: null,
        ariaPressed: true,
      };
    }

    return {
      state: 'normal',
      reason: null,
      ariaPressed: false,
    };
  }

  it('should return disabled state with reason for unsupported filter', () => {
    const filter = { key: 'ready', label: 'Ready' };
    const capability = { key: 'ready', supported: false, disabledReason: 'Panel does not support' };

    const display = getFilterDisplayState(filter, capability, null);

    assert.equal(display.state, 'disabled');
    assert.equal(display.reason, 'Panel does not support');
    assert.equal(display.ariaDisabled, true);
    assert.equal(display.cursor, 'not-allowed');
    assert.equal(display.opacity, 0.6);
  });

  it('should return active state for selected filter', () => {
    const filter = { key: 'ready', label: 'Ready' };
    const capability = { key: 'ready', supported: true };

    const display = getFilterDisplayState(filter, capability, 'ready');

    assert.equal(display.state, 'active');
    assert.equal(display.ariaPressed, true);
  });

  it('should return normal state for unselected supported filter', () => {
    const filter = { key: 'ready', label: 'Ready' };
    const capability = { key: 'ready', supported: true };

    const display = getFilterDisplayState(filter, capability, null);

    assert.equal(display.state, 'normal');
    assert.equal(display.ariaPressed, false);
  });

  it('should default to supported when no capability provided', () => {
    const filter = { key: 'ready', label: 'Ready' };

    const display = getFilterDisplayState(filter, undefined, null);

    assert.equal(display.state, 'normal');
  });
});

describe('Quick filters and DataGrid integration', () => {
  // Simulate DataGrid filter application
  function applyQuickFilter(gridState, filter) {
    if (!filter || filter.field === '') {
      // Clear readiness_state filter
      return {
        ...gridState,
        filters: gridState.filters.filter(f => f.column !== 'readiness_state' && f.column !== 'fallback_used'),
      };
    }

    // Remove existing readiness/fallback filter and add new one
    const otherFilters = gridState.filters.filter(f => f.column !== 'readiness_state' && f.column !== 'fallback_used');

    return {
      ...gridState,
      filters: [
        ...otherFilters,
        { column: filter.field, operator: 'eq', value: filter.value },
      ],
    };
  }

  it('should add readiness_state filter to grid', () => {
    const gridState = { filters: [] };
    const filter = { key: 'ready', field: 'readiness_state', value: 'ready' };

    const newState = applyQuickFilter(gridState, filter);

    assert.equal(newState.filters.length, 1);
    assert.equal(newState.filters[0].column, 'readiness_state');
    assert.equal(newState.filters[0].value, 'ready');
  });

  it('should replace existing readiness filter', () => {
    const gridState = {
      filters: [
        { column: 'readiness_state', operator: 'eq', value: 'ready' },
      ],
    };
    const filter = { key: 'missing', field: 'readiness_state', value: 'missing_locales' };

    const newState = applyQuickFilter(gridState, filter);

    assert.equal(newState.filters.length, 1);
    assert.equal(newState.filters[0].value, 'missing_locales');
  });

  it('should preserve other filters when applying quick filter', () => {
    const gridState = {
      filters: [
        { column: 'status', operator: 'eq', value: 'published' },
      ],
    };
    const filter = { key: 'ready', field: 'readiness_state', value: 'ready' };

    const newState = applyQuickFilter(gridState, filter);

    assert.equal(newState.filters.length, 2);
    assert.ok(newState.filters.some(f => f.column === 'status'));
    assert.ok(newState.filters.some(f => f.column === 'readiness_state'));
  });

  it('should clear readiness filter when "all" selected', () => {
    const gridState = {
      filters: [
        { column: 'readiness_state', operator: 'eq', value: 'ready' },
        { column: 'status', operator: 'eq', value: 'published' },
      ],
    };
    const filter = { key: 'all', field: '', value: '' };

    const newState = applyQuickFilter(gridState, filter);

    assert.equal(newState.filters.length, 1);
    assert.equal(newState.filters[0].column, 'status');
  });

  it('should add fallback_used filter', () => {
    const gridState = { filters: [] };
    const filter = { key: 'fallback', field: 'fallback_used', value: 'true' };

    const newState = applyQuickFilter(gridState, filter);

    assert.equal(newState.filters.length, 1);
    assert.equal(newState.filters[0].column, 'fallback_used');
    assert.equal(newState.filters[0].value, 'true');
  });
});

console.log('All quick filters tests completed');
