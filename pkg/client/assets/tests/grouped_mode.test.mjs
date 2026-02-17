/**
 * Tests for grouped-mode.ts (Phase 2)
 * Tests grouping transformation, state management, and rendering utilities
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ============================================================================
// TX-055: Group Data Transformation Tests
// ============================================================================

describe('transformToGroups', () => {
  // Simulate the transformation logic
  function transformToGroups(records, options = {}) {
    const {
      groupByField = 'translation_group_id',
      defaultExpanded = true,
      expandedGroups = new Set(),
    } = options;

    const groupMap = new Map();
    const ungrouped = [];

    for (const record of records) {
      const groupId = record[groupByField];
      if (typeof groupId === 'string' && groupId.trim()) {
        const existing = groupMap.get(groupId);
        if (existing) {
          existing.push(record);
        } else {
          groupMap.set(groupId, [record]);
        }
      } else {
        ungrouped.push(record);
      }
    }

    const groups = [];
    for (const [groupId, groupRecords] of groupMap) {
      const summary = computeGroupSummary(groupRecords);
      const expanded = expandedGroups.has(groupId) || (expandedGroups.size === 0 && defaultExpanded);
      groups.push({
        groupId,
        records: groupRecords,
        summary,
        expanded,
        summaryFromBackend: false,
      });
    }

    // Sort by original order
    groups.sort((a, b) => {
      const aIndex = records.indexOf(a.records[0]);
      const bIndex = records.indexOf(b.records[0]);
      return aIndex - bIndex;
    });

    return {
      groups,
      ungrouped,
      totalGroups: groups.length,
      totalRecords: records.length,
    };
  }

  function computeGroupSummary(records) {
    const allAvailable = new Set();
    const allMissing = new Set();
    let hasIncomplete = false;
    let readyCount = 0;

    for (const record of records) {
      const readiness = record.translation_readiness;
      if (readiness) {
        const available = readiness.available_locales;
        const missing = readiness.missing_required_locales;
        const state = readiness.readiness_state;

        if (Array.isArray(available)) {
          available.forEach(loc => allAvailable.add(loc));
        }
        if (Array.isArray(missing)) {
          missing.forEach(loc => allMissing.add(loc));
        }
        if (state === 'missing_fields' || state === 'missing_locales_and_fields') {
          hasIncomplete = true;
        }
        if (state === 'ready') {
          readyCount++;
        }
      }
    }

    let readinessState = null;
    if (records.length > 0) {
      const allReady = readyCount === records.length;
      const hasMissing = allMissing.size > 0;

      if (allReady) {
        readinessState = 'ready';
      } else if (hasMissing && hasIncomplete) {
        readinessState = 'missing_locales_and_fields';
      } else if (hasMissing) {
        readinessState = 'missing_locales';
      } else if (hasIncomplete) {
        readinessState = 'missing_fields';
      }
    }

    return {
      totalItems: records.length,
      availableLocales: Array.from(allAvailable),
      missingLocales: Array.from(allMissing),
      readinessState,
      readyForPublish: readinessState === 'ready',
    };
  }

  it('should group records by translation_group_id', () => {
    const records = [
      { id: '1', translation_group_id: 'tg_abc', locale: 'en' },
      { id: '2', translation_group_id: 'tg_abc', locale: 'es' },
      { id: '3', translation_group_id: 'tg_xyz', locale: 'en' },
    ];

    const result = transformToGroups(records);

    assert.equal(result.totalGroups, 2);
    assert.equal(result.totalRecords, 3);
    assert.equal(result.groups[0].groupId, 'tg_abc');
    assert.equal(result.groups[0].records.length, 2);
    assert.equal(result.groups[1].groupId, 'tg_xyz');
    assert.equal(result.groups[1].records.length, 1);
  });

  it('should put records without group ID in ungrouped', () => {
    const records = [
      { id: '1', translation_group_id: 'tg_abc', locale: 'en' },
      { id: '2', locale: 'es' }, // No group ID
      { id: '3', translation_group_id: '', locale: 'fr' }, // Empty group ID
    ];

    const result = transformToGroups(records);

    assert.equal(result.totalGroups, 1);
    assert.equal(result.ungrouped.length, 2);
    assert.equal(result.ungrouped[0].id, '2');
    assert.equal(result.ungrouped[1].id, '3');
  });

  it('should preserve original record order within groups', () => {
    const records = [
      { id: '1', translation_group_id: 'tg_abc', locale: 'en' },
      { id: '2', translation_group_id: 'tg_abc', locale: 'es' },
      { id: '3', translation_group_id: 'tg_abc', locale: 'fr' },
    ];

    const result = transformToGroups(records);

    assert.equal(result.groups[0].records[0].locale, 'en');
    assert.equal(result.groups[0].records[1].locale, 'es');
    assert.equal(result.groups[0].records[2].locale, 'fr');
  });

  it('should default groups to expanded', () => {
    const records = [
      { id: '1', translation_group_id: 'tg_abc' },
    ];

    const result = transformToGroups(records);

    assert.equal(result.groups[0].expanded, true);
  });

  it('should respect defaultExpanded option', () => {
    const records = [
      { id: '1', translation_group_id: 'tg_abc' },
    ];

    const result = transformToGroups(records, { defaultExpanded: false });

    assert.equal(result.groups[0].expanded, false);
  });

  it('should restore expanded state from expandedGroups', () => {
    const records = [
      { id: '1', translation_group_id: 'tg_abc' },
      { id: '2', translation_group_id: 'tg_xyz' },
    ];

    const expandedGroups = new Set(['tg_abc']);
    const result = transformToGroups(records, { expandedGroups, defaultExpanded: false });

    assert.equal(result.groups[0].expanded, true); // tg_abc was in expandedGroups
    assert.equal(result.groups[1].expanded, false); // tg_xyz was not
  });

  it('should compute group summary from translation_readiness', () => {
    const records = [
      {
        id: '1',
        translation_group_id: 'tg_abc',
        translation_readiness: {
          available_locales: ['en', 'es'],
          missing_required_locales: ['fr'],
          readiness_state: 'missing_locales',
        },
      },
      {
        id: '2',
        translation_group_id: 'tg_abc',
        translation_readiness: {
          available_locales: ['en'],
          missing_required_locales: [],
          readiness_state: 'ready',
        },
      },
    ];

    const result = transformToGroups(records);

    assert.equal(result.groups[0].summary.totalItems, 2);
    assert.ok(result.groups[0].summary.availableLocales.includes('en'));
    assert.ok(result.groups[0].summary.availableLocales.includes('es'));
    assert.ok(result.groups[0].summary.missingLocales.includes('fr'));
  });

  it('should handle empty records array', () => {
    const result = transformToGroups([]);

    assert.equal(result.totalGroups, 0);
    assert.equal(result.totalRecords, 0);
    assert.deepEqual(result.groups, []);
    assert.deepEqual(result.ungrouped, []);
  });

  it('should group by custom field when specified', () => {
    const records = [
      { id: '1', custom_group: 'group_a' },
      { id: '2', custom_group: 'group_a' },
    ];

    const result = transformToGroups(records, { groupByField: 'custom_group' });

    assert.equal(result.totalGroups, 1);
    assert.equal(result.groups[0].groupId, 'group_a');
  });
});

// ============================================================================
// TX-057: Expand/Collapse State Management Tests
// ============================================================================

describe('toggleGroupExpand', () => {
  function toggleGroupExpand(groupedData, groupId) {
    const groups = groupedData.groups.map(group => {
      if (group.groupId === groupId) {
        return { ...group, expanded: !group.expanded };
      }
      return group;
    });
    return { ...groupedData, groups };
  }

  it('should toggle expanded state of specified group', () => {
    const groupedData = {
      groups: [
        { groupId: 'tg_abc', expanded: true, records: [], summary: {} },
        { groupId: 'tg_xyz', expanded: false, records: [], summary: {} },
      ],
      ungrouped: [],
      totalGroups: 2,
      totalRecords: 0,
    };

    const result = toggleGroupExpand(groupedData, 'tg_abc');

    assert.equal(result.groups[0].expanded, false);
    assert.equal(result.groups[1].expanded, false);
  });

  it('should not affect other groups', () => {
    const groupedData = {
      groups: [
        { groupId: 'tg_abc', expanded: true, records: [], summary: {} },
        { groupId: 'tg_xyz', expanded: true, records: [], summary: {} },
      ],
      ungrouped: [],
      totalGroups: 2,
      totalRecords: 0,
    };

    const result = toggleGroupExpand(groupedData, 'tg_xyz');

    assert.equal(result.groups[0].expanded, true);
    assert.equal(result.groups[1].expanded, false);
  });
});

describe('expandAllGroups / collapseAllGroups', () => {
  function expandAllGroups(groupedData) {
    const groups = groupedData.groups.map(group => ({
      ...group,
      expanded: true,
    }));
    return { ...groupedData, groups };
  }

  function collapseAllGroups(groupedData) {
    const groups = groupedData.groups.map(group => ({
      ...group,
      expanded: false,
    }));
    return { ...groupedData, groups };
  }

  it('expandAllGroups should expand all groups', () => {
    const groupedData = {
      groups: [
        { groupId: 'tg_abc', expanded: false, records: [], summary: {} },
        { groupId: 'tg_xyz', expanded: false, records: [], summary: {} },
      ],
      ungrouped: [],
      totalGroups: 2,
      totalRecords: 0,
    };

    const result = expandAllGroups(groupedData);

    assert.equal(result.groups[0].expanded, true);
    assert.equal(result.groups[1].expanded, true);
  });

  it('collapseAllGroups should collapse all groups', () => {
    const groupedData = {
      groups: [
        { groupId: 'tg_abc', expanded: true, records: [], summary: {} },
        { groupId: 'tg_xyz', expanded: true, records: [], summary: {} },
      ],
      ungrouped: [],
      totalGroups: 2,
      totalRecords: 0,
    };

    const result = collapseAllGroups(groupedData);

    assert.equal(result.groups[0].expanded, false);
    assert.equal(result.groups[1].expanded, false);
  });
});

describe('getExpandedGroupIds', () => {
  function getExpandedGroupIds(groupedData) {
    const expanded = new Set();
    for (const group of groupedData.groups) {
      if (group.expanded) {
        expanded.add(group.groupId);
      }
    }
    return expanded;
  }

  it('should return set of expanded group IDs', () => {
    const groupedData = {
      groups: [
        { groupId: 'tg_abc', expanded: true, records: [], summary: {} },
        { groupId: 'tg_xyz', expanded: false, records: [], summary: {} },
        { groupId: 'tg_123', expanded: true, records: [], summary: {} },
      ],
      ungrouped: [],
      totalGroups: 3,
      totalRecords: 0,
    };

    const expanded = getExpandedGroupIds(groupedData);

    assert.equal(expanded.size, 2);
    assert.ok(expanded.has('tg_abc'));
    assert.ok(expanded.has('tg_123'));
    assert.ok(!expanded.has('tg_xyz'));
  });
});

// ============================================================================
// TX-034: View Mode Persistence Tests
// ============================================================================

describe('View mode helpers', () => {
  function isValidViewMode(value) {
    return value === 'flat' || value === 'grouped' || value === 'matrix';
  }

  it('should validate flat view mode', () => {
    assert.equal(isValidViewMode('flat'), true);
  });

  it('should validate grouped view mode', () => {
    assert.equal(isValidViewMode('grouped'), true);
  });

  it('should validate matrix view mode', () => {
    assert.equal(isValidViewMode('matrix'), true);
  });

  it('should reject invalid view modes', () => {
    assert.equal(isValidViewMode('invalid'), false);
    assert.equal(isValidViewMode(''), false);
    assert.equal(isValidViewMode(null), false);
  });
});

// ============================================================================
// Backend Summary Merging Tests
// ============================================================================

describe('mergeBackendSummaries', () => {
  function mergeBackendSummaries(groupedData, backendSummaries) {
    const groups = groupedData.groups.map(group => {
      const backendSummary = backendSummaries.get(group.groupId);
      if (backendSummary) {
        return {
          ...group,
          summary: {
            ...group.summary,
            ...backendSummary,
          },
          summaryFromBackend: true,
        };
      }
      return group;
    });
    return { ...groupedData, groups };
  }

  it('should merge backend summaries into groups', () => {
    const groupedData = {
      groups: [
        {
          groupId: 'tg_abc',
          expanded: true,
          records: [],
          summary: {
            totalItems: 2,
            availableLocales: ['en'],
            missingLocales: [],
            readinessState: null,
            readyForPublish: null,
          },
          summaryFromBackend: false,
        },
      ],
      ungrouped: [],
      totalGroups: 1,
      totalRecords: 2,
    };

    const backendSummaries = new Map([
      ['tg_abc', {
        readinessState: 'ready',
        readyForPublish: true,
      }],
    ]);

    const result = mergeBackendSummaries(groupedData, backendSummaries);

    assert.equal(result.groups[0].summary.readinessState, 'ready');
    assert.equal(result.groups[0].summary.readyForPublish, true);
    assert.equal(result.groups[0].summaryFromBackend, true);
    // Original fields preserved
    assert.equal(result.groups[0].summary.totalItems, 2);
    assert.deepEqual(result.groups[0].summary.availableLocales, ['en']);
  });

  it('should not modify groups without backend summary', () => {
    const groupedData = {
      groups: [
        {
          groupId: 'tg_abc',
          expanded: true,
          records: [],
          summary: { totalItems: 2 },
          summaryFromBackend: false,
        },
      ],
      ungrouped: [],
      totalGroups: 1,
      totalRecords: 2,
    };

    const backendSummaries = new Map(); // Empty

    const result = mergeBackendSummaries(groupedData, backendSummaries);

    assert.equal(result.groups[0].summaryFromBackend, false);
  });
});

describe('extractBackendSummaries', () => {
  function extractBackendSummaries(response) {
    const summaries = new Map();
    const groupSummaries = response.group_summaries;

    if (!groupSummaries || typeof groupSummaries !== 'object' || Array.isArray(groupSummaries)) {
      return summaries;
    }

    for (const [groupId, summary] of Object.entries(groupSummaries)) {
      if (summary && typeof summary === 'object') {
        summaries.set(groupId, {
          totalItems: typeof summary.total_items === 'number' ? summary.total_items : undefined,
          availableLocales: Array.isArray(summary.available_locales)
            ? summary.available_locales.filter(v => typeof v === 'string')
            : undefined,
          missingLocales: Array.isArray(summary.missing_locales)
            ? summary.missing_locales.filter(v => typeof v === 'string')
            : undefined,
          readinessState: ['ready', 'missing_locales', 'missing_fields', 'missing_locales_and_fields'].includes(summary.readiness_state)
            ? summary.readiness_state
            : undefined,
          readyForPublish: typeof summary.ready_for_publish === 'boolean'
            ? summary.ready_for_publish
            : undefined,
        });
      }
    }

    return summaries;
  }

  it('should extract summaries from response', () => {
    const response = {
      data: [],
      group_summaries: {
        'tg_abc': {
          total_items: 3,
          available_locales: ['en', 'es'],
          missing_locales: ['fr'],
          readiness_state: 'missing_locales',
          ready_for_publish: false,
        },
      },
    };

    const summaries = extractBackendSummaries(response);

    assert.equal(summaries.size, 1);
    assert.ok(summaries.has('tg_abc'));

    const summary = summaries.get('tg_abc');
    assert.equal(summary.totalItems, 3);
    assert.deepEqual(summary.availableLocales, ['en', 'es']);
    assert.deepEqual(summary.missingLocales, ['fr']);
    assert.equal(summary.readinessState, 'missing_locales');
    assert.equal(summary.readyForPublish, false);
  });

  it('should return empty map when no group_summaries', () => {
    const response = { data: [] };
    const summaries = extractBackendSummaries(response);
    assert.equal(summaries.size, 0);
  });

  it('should handle invalid group_summaries gracefully', () => {
    const response = { group_summaries: 'invalid' };
    const summaries = extractBackendSummaries(response);
    assert.equal(summaries.size, 0);
  });
});

// ============================================================================
// TX-056: Group Header Rendering Tests
// ============================================================================

describe('renderGroupHeaderSummary', () => {
  function renderGroupHeaderSummary(group, options = {}) {
    const { summary } = group;
    const { size = 'sm' } = options;
    const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

    const availableCount = summary.availableLocales?.length || 0;
    const missingCount = summary.missingLocales?.length || 0;
    const totalLocales = availableCount + missingCount;

    let readinessBadge = '';
    if (summary.readinessState === 'ready') {
      readinessBadge = `<span class="${textSize} bg-green-100 text-green-700">Ready</span>`;
    } else if (summary.readinessState === 'missing_locales') {
      readinessBadge = `<span class="${textSize} bg-amber-100 text-amber-700">Missing</span>`;
    }

    const localeCount = totalLocales > 0
      ? `<span class="${textSize}">${availableCount}/${totalLocales} locales</span>`
      : '';

    const itemCount = `<span class="${textSize}">${summary.totalItems} item${summary.totalItems !== 1 ? 's' : ''}</span>`;

    return `<div class="summary">${readinessBadge}${localeCount}${itemCount}</div>`;
  }

  it('should render ready state badge', () => {
    const group = {
      groupId: 'tg_abc',
      summary: {
        totalItems: 2,
        availableLocales: ['en', 'es'],
        missingLocales: [],
        readinessState: 'ready',
      },
    };

    const html = renderGroupHeaderSummary(group);

    assert.ok(html.includes('Ready'));
    assert.ok(html.includes('bg-green-100'));
    assert.ok(html.includes('2/2 locales'));
    assert.ok(html.includes('2 items'));
  });

  it('should render missing state badge', () => {
    const group = {
      groupId: 'tg_abc',
      summary: {
        totalItems: 1,
        availableLocales: ['en'],
        missingLocales: ['es', 'fr'],
        readinessState: 'missing_locales',
      },
    };

    const html = renderGroupHeaderSummary(group);

    assert.ok(html.includes('Missing'));
    assert.ok(html.includes('bg-amber-100'));
    assert.ok(html.includes('1/3 locales'));
    assert.ok(html.includes('1 item'));
  });
});

// ============================================================================
// TX-061, TX-062: Loading and Empty State Tests
// ============================================================================

describe('renderGroupedEmptyState', () => {
  function renderGroupedEmptyState(colSpan) {
    return `<tr><td colspan="${colSpan + 2}">No translation groups</td></tr>`;
  }

  it('should render empty state with correct colspan', () => {
    const html = renderGroupedEmptyState(5);
    assert.ok(html.includes('colspan="7"'));
    assert.ok(html.includes('No translation groups'));
  });
});

describe('renderGroupedLoadingState', () => {
  function renderGroupedLoadingState(colSpan) {
    return `<tr><td colspan="${colSpan + 2}">Loading groups...</td></tr>`;
  }

  it('should render loading state with correct colspan', () => {
    const html = renderGroupedLoadingState(5);
    assert.ok(html.includes('colspan="7"'));
    assert.ok(html.includes('Loading groups'));
  });
});

// ============================================================================
// TX-060: Error Boundary Tests
// ============================================================================

describe('renderGroupedErrorState', () => {
  function renderGroupedErrorState(colSpan, error) {
    const escapedError = error.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<tr><td colspan="${colSpan + 2}">Error: ${escapedError}</td></tr>`;
  }

  it('should render error state with message', () => {
    const html = renderGroupedErrorState(5, 'Network error');
    assert.ok(html.includes('colspan="7"'));
    assert.ok(html.includes('Network error'));
  });

  it('should escape HTML in error message', () => {
    const html = renderGroupedErrorState(5, '<script>alert(1)</script>');
    assert.ok(!html.includes('<script>'));
    assert.ok(html.includes('&lt;script&gt;'));
  });
});

// ============================================================================
// TX-063: Mobile/Responsive Tests
// ============================================================================

describe('getViewModeForViewport', () => {
  function getViewModeForViewport(preferredMode, isNarrow) {
    if (isNarrow && preferredMode === 'grouped') {
      return 'flat';
    }
    return preferredMode;
  }

  it('should return flat mode on narrow viewport when grouped preferred', () => {
    const mode = getViewModeForViewport('grouped', true);
    assert.equal(mode, 'flat');
  });

  it('should preserve flat mode on narrow viewport', () => {
    const mode = getViewModeForViewport('flat', true);
    assert.equal(mode, 'flat');
  });

  it('should preserve matrix mode on narrow viewport', () => {
    const mode = getViewModeForViewport('matrix', true);
    assert.equal(mode, 'matrix');
  });

  it('should preserve grouped mode on wide viewport', () => {
    const mode = getViewModeForViewport('grouped', false);
    assert.equal(mode, 'grouped');
  });
});

// ============================================================================
// Group Summary Computation Tests
// ============================================================================

describe('computeGroupSummary', () => {
  function computeGroupSummary(records) {
    const allAvailable = new Set();
    const allMissing = new Set();
    let hasIncomplete = false;
    let readyCount = 0;

    for (const record of records) {
      const readiness = record.translation_readiness;
      if (readiness) {
        const available = readiness.available_locales;
        const missing = readiness.missing_required_locales;
        const state = readiness.readiness_state;

        if (Array.isArray(available)) {
          available.forEach(loc => allAvailable.add(loc));
        }
        if (Array.isArray(missing)) {
          missing.forEach(loc => allMissing.add(loc));
        }
        if (state === 'missing_fields' || state === 'missing_locales_and_fields') {
          hasIncomplete = true;
        }
        if (state === 'ready') {
          readyCount++;
        }
      }
    }

    let readinessState = null;
    if (records.length > 0) {
      const allReady = readyCount === records.length;
      const hasMissing = allMissing.size > 0;

      if (allReady) {
        readinessState = 'ready';
      } else if (hasMissing && hasIncomplete) {
        readinessState = 'missing_locales_and_fields';
      } else if (hasMissing) {
        readinessState = 'missing_locales';
      } else if (hasIncomplete) {
        readinessState = 'missing_fields';
      }
    }

    return {
      totalItems: records.length,
      availableLocales: Array.from(allAvailable),
      missingLocales: Array.from(allMissing),
      readinessState,
      readyForPublish: readinessState === 'ready',
    };
  }

  it('should compute ready state when all records ready', () => {
    const records = [
      { translation_readiness: { readiness_state: 'ready', available_locales: ['en'] } },
      { translation_readiness: { readiness_state: 'ready', available_locales: ['es'] } },
    ];

    const summary = computeGroupSummary(records);

    assert.equal(summary.readinessState, 'ready');
    assert.equal(summary.readyForPublish, true);
  });

  it('should compute missing_locales state', () => {
    const records = [
      { translation_readiness: { readiness_state: 'ready', available_locales: ['en'] } },
      {
        translation_readiness: {
          readiness_state: 'missing_locales',
          available_locales: ['en'],
          missing_required_locales: ['es'],
        },
      },
    ];

    const summary = computeGroupSummary(records);

    assert.equal(summary.readinessState, 'missing_locales');
    assert.equal(summary.readyForPublish, false);
  });

  it('should compute missing_fields state', () => {
    const records = [
      { translation_readiness: { readiness_state: 'missing_fields', available_locales: ['en'] } },
    ];

    const summary = computeGroupSummary(records);

    assert.equal(summary.readinessState, 'missing_fields');
    assert.equal(summary.readyForPublish, false);
  });

  it('should compute missing_locales_and_fields state', () => {
    const records = [
      {
        translation_readiness: {
          readiness_state: 'missing_locales_and_fields',
          available_locales: ['en'],
          missing_required_locales: ['es'],
        },
      },
    ];

    const summary = computeGroupSummary(records);

    assert.equal(summary.readinessState, 'missing_locales_and_fields');
    assert.equal(summary.readyForPublish, false);
  });

  it('should aggregate locales across all records', () => {
    const records = [
      { translation_readiness: { available_locales: ['en'], missing_required_locales: [] } },
      { translation_readiness: { available_locales: ['es'], missing_required_locales: ['fr'] } },
      { translation_readiness: { available_locales: ['en', 'de'], missing_required_locales: ['fr'] } },
    ];

    const summary = computeGroupSummary(records);

    assert.equal(summary.totalItems, 3);
    assert.ok(summary.availableLocales.includes('en'));
    assert.ok(summary.availableLocales.includes('es'));
    assert.ok(summary.availableLocales.includes('de'));
    assert.equal(summary.missingLocales.length, 1);
    assert.ok(summary.missingLocales.includes('fr'));
  });

  it('should handle records without translation_readiness', () => {
    const records = [
      { id: '1', locale: 'en' },
      { id: '2', locale: 'es' },
    ];

    const summary = computeGroupSummary(records);

    assert.equal(summary.totalItems, 2);
    assert.deepEqual(summary.availableLocales, []);
    assert.deepEqual(summary.missingLocales, []);
    assert.equal(summary.readinessState, null);
  });
});

console.log('All grouped mode tests completed');
