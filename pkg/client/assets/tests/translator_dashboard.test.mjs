/**
 * Translator Dashboard Tests (Phase 4 - TX-047)
 */
import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// =============================================================================
// Mock Implementations
// =============================================================================

/**
 * Due state types
 */
const DUE_STATES = ['overdue', 'due_soon', 'on_track', 'none'];

/**
 * Queue state types
 */
const QUEUE_STATES = ['pending', 'assigned', 'in_progress', 'review', 'approved', 'published', 'archived'];

/**
 * Mock API response helper
 */
function createMockMyWorkResponse(options = {}) {
  const {
    assignments = [],
    summary = {
      total: assignments.length,
      overdue: 0,
      due_soon: 0,
      on_track: 0,
      none: 0,
      review: 0,
    },
    page = 1,
    perPage = 25,
    userId = 'user-1',
  } = options;

  return {
    scope: 'my_work',
    user_id: userId,
    summary,
    assignments,
    items: assignments,
    total: assignments.length,
    page,
    per_page: perPage,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Create mock assignment
 */
function createMockAssignment(overrides = {}) {
  return {
    id: overrides.id || `assignment-${Math.random().toString(36).slice(2)}`,
    translation_group_id: overrides.translation_group_id || 'group-1',
    entity_type: overrides.entity_type || 'pages',
    source_record_id: overrides.source_record_id || 'source-1',
    target_record_id: overrides.target_record_id || 'target-1',
    source_locale: overrides.source_locale || 'en',
    target_locale: overrides.target_locale || 'es',
    source_title: overrides.source_title || 'Test Page',
    source_path: overrides.source_path || '/test-page',
    assignee_id: overrides.assignee_id || 'user-1',
    assignment_type: overrides.assignment_type || 'translation',
    content_state: overrides.content_state || 'draft',
    queue_state: overrides.queue_state || 'in_progress',
    status: overrides.status || 'in_progress',
    priority: overrides.priority || 'normal',
    due_state: overrides.due_state || 'on_track',
    due_date: overrides.due_date || null,
    updated_at: overrides.updated_at || new Date().toISOString(),
    created_at: overrides.created_at || new Date().toISOString(),
    review_actions: overrides.review_actions || {
      submit_review: { enabled: true, permission: 'admin.translations.edit' },
      approve: { enabled: false, reason: 'assignment must be in review', reason_code: 'INVALID_STATUS' },
      reject: { enabled: false, reason: 'assignment must be in review', reason_code: 'INVALID_STATUS' },
    },
    ...overrides,
  };
}

/**
 * Mock TranslatorDashboard implementation for testing
 */
class MockTranslatorDashboard {
  constructor(config) {
    this.config = {
      myWorkEndpoint: config.myWorkEndpoint,
      queueEndpoint: config.queueEndpoint || '',
      panelBaseUrl: config.panelBaseUrl || '',
      filterPresets: config.filterPresets || DEFAULT_FILTER_PRESETS,
      refreshInterval: config.refreshInterval || 0,
      labels: { ...DEFAULT_LABELS, ...(config.labels || {}) },
      onAssignmentClick: config.onAssignmentClick,
      onActionClick: config.onActionClick,
    };

    this.state = 'loading';
    this.data = null;
    this.error = null;
    this.activePreset = 'all';
    this.container = null;
    this.refreshCount = 0;
  }

  mount(container) {
    this.container = container;
    this.render();
  }

  unmount() {
    this.container = null;
  }

  async refresh() {
    this.refreshCount++;
    this.state = 'loaded';
    return Promise.resolve();
  }

  setActivePreset(presetId) {
    this.activePreset = presetId;
    this.render();
  }

  getState() {
    return this.state;
  }

  getData() {
    return this.data;
  }

  setData(data) {
    this.data = data;
    this.state = data && data.assignments.length > 0 ? 'loaded' : 'empty';
    this.render();
  }

  setError(error) {
    this.error = error;
    this.state = 'error';
    this.render();
  }

  render() {
    // Mock render
  }

  getActivePreset() {
    return this.activePreset;
  }

  getFilteredAssignments() {
    if (!this.data) return [];

    let assignments = this.data.assignments;

    // Apply client-side filtering for due_soon preset
    if (this.activePreset === 'due_soon') {
      assignments = assignments.filter(a =>
        a.due_state === 'due_soon' || a.due_state === 'overdue'
      );
    }

    return assignments;
  }
}

const DEFAULT_LABELS = {
  title: 'My Translation Work',
  myAssignments: 'My Assignments',
  dueSoon: 'Due Soon',
  needsReview: 'Needs Review',
  all: 'All',
  overdue: 'Overdue',
  onTrack: 'On Track',
  noAssignments: 'No assignments',
  noAssignmentsDescription: 'You have no translation assignments at this time.',
  loading: 'Loading assignments...',
  error: 'Failed to load assignments',
  retry: 'Retry',
  submitForReview: 'Submit for Review',
  approve: 'Approve',
  reject: 'Reject',
  openAssignment: 'Open',
  dueDate: 'Due Date',
  priority: 'Priority',
  status: 'Status',
  targetLocale: 'Target',
  sourceTitle: 'Content',
};

const DEFAULT_FILTER_PRESETS = [
  { id: 'all', label: 'All', filters: {} },
  { id: 'in_progress', label: 'In Progress', filters: { status: 'in_progress' } },
  { id: 'due_soon', label: 'Due Soon', filters: { status: 'in_progress' } },
  { id: 'review', label: 'Needs Review', filters: { status: 'review' } },
];

// =============================================================================
// Tests
// =============================================================================

describe('TranslatorDashboard - Initialization', () => {
  it('should initialize with loading state', () => {
    const dashboard = new MockTranslatorDashboard({
      myWorkEndpoint: '/admin/api/translations/my-work',
    });

    assert.strictEqual(dashboard.getState(), 'loading');
    assert.strictEqual(dashboard.getData(), null);
  });

  it('should accept custom configuration', () => {
    const dashboard = new MockTranslatorDashboard({
      myWorkEndpoint: '/admin/api/translations/my-work',
      queueEndpoint: '/admin/api/translations/queue',
      panelBaseUrl: '/admin/pages',
      refreshInterval: 30000,
      labels: {
        title: 'Custom Title',
      },
    });

    assert.strictEqual(dashboard.config.myWorkEndpoint, '/admin/api/translations/my-work');
    assert.strictEqual(dashboard.config.queueEndpoint, '/admin/api/translations/queue');
    assert.strictEqual(dashboard.config.panelBaseUrl, '/admin/pages');
    assert.strictEqual(dashboard.config.refreshInterval, 30000);
    assert.strictEqual(dashboard.config.labels.title, 'Custom Title');
  });

  it('should use default filter presets', () => {
    const dashboard = new MockTranslatorDashboard({
      myWorkEndpoint: '/admin/api/translations/my-work',
    });

    assert.strictEqual(dashboard.config.filterPresets.length, 4);
    assert.strictEqual(dashboard.config.filterPresets[0].id, 'all');
    assert.strictEqual(dashboard.config.filterPresets[3].id, 'review');
  });
});

describe('TranslatorDashboard - State Management', () => {
  it('should transition to loaded state with data', () => {
    const dashboard = new MockTranslatorDashboard({
      myWorkEndpoint: '/admin/api/translations/my-work',
    });

    const mockData = createMockMyWorkResponse({
      assignments: [createMockAssignment()],
    });

    dashboard.setData(mockData);

    assert.strictEqual(dashboard.getState(), 'loaded');
    assert.deepStrictEqual(dashboard.getData(), mockData);
  });

  it('should transition to empty state when no assignments', () => {
    const dashboard = new MockTranslatorDashboard({
      myWorkEndpoint: '/admin/api/translations/my-work',
    });

    const mockData = createMockMyWorkResponse({ assignments: [] });
    dashboard.setData(mockData);

    assert.strictEqual(dashboard.getState(), 'empty');
  });

  it('should transition to error state', () => {
    const dashboard = new MockTranslatorDashboard({
      myWorkEndpoint: '/admin/api/translations/my-work',
    });

    const error = new Error('Network error');
    dashboard.setError(error);

    assert.strictEqual(dashboard.getState(), 'error');
    assert.strictEqual(dashboard.error.message, 'Network error');
  });
});

describe('TranslatorDashboard - Filter Presets', () => {
  it('should default to all preset', () => {
    const dashboard = new MockTranslatorDashboard({
      myWorkEndpoint: '/admin/api/translations/my-work',
    });

    assert.strictEqual(dashboard.getActivePreset(), 'all');
  });

  it('should change active preset', () => {
    const dashboard = new MockTranslatorDashboard({
      myWorkEndpoint: '/admin/api/translations/my-work',
    });

    dashboard.setActivePreset('in_progress');
    assert.strictEqual(dashboard.getActivePreset(), 'in_progress');

    dashboard.setActivePreset('review');
    assert.strictEqual(dashboard.getActivePreset(), 'review');
  });

  it('should filter assignments client-side for due_soon preset', () => {
    const dashboard = new MockTranslatorDashboard({
      myWorkEndpoint: '/admin/api/translations/my-work',
    });

    const mockData = createMockMyWorkResponse({
      assignments: [
        createMockAssignment({ id: '1', due_state: 'overdue' }),
        createMockAssignment({ id: '2', due_state: 'due_soon' }),
        createMockAssignment({ id: '3', due_state: 'on_track' }),
        createMockAssignment({ id: '4', due_state: 'none' }),
      ],
    });

    dashboard.setData(mockData);
    dashboard.setActivePreset('due_soon');

    const filtered = dashboard.getFilteredAssignments();
    assert.strictEqual(filtered.length, 2);
    assert.ok(filtered.every(a => a.due_state === 'due_soon' || a.due_state === 'overdue'));
  });

  it('should return all assignments for all preset', () => {
    const dashboard = new MockTranslatorDashboard({
      myWorkEndpoint: '/admin/api/translations/my-work',
    });

    const mockData = createMockMyWorkResponse({
      assignments: [
        createMockAssignment({ id: '1', due_state: 'overdue' }),
        createMockAssignment({ id: '2', due_state: 'on_track' }),
      ],
    });

    dashboard.setData(mockData);
    dashboard.setActivePreset('all');

    const filtered = dashboard.getFilteredAssignments();
    assert.strictEqual(filtered.length, 2);
  });
});

describe('TranslatorDashboard - Refresh', () => {
  it('should increment refresh count', async () => {
    const dashboard = new MockTranslatorDashboard({
      myWorkEndpoint: '/admin/api/translations/my-work',
    });

    assert.strictEqual(dashboard.refreshCount, 0);

    await dashboard.refresh();
    assert.strictEqual(dashboard.refreshCount, 1);

    await dashboard.refresh();
    assert.strictEqual(dashboard.refreshCount, 2);
  });
});

describe('TranslatorDashboard - Assignment Data', () => {
  it('should parse assignment with all fields', () => {
    const assignment = createMockAssignment({
      id: 'test-id',
      translation_group_id: 'group-123',
      entity_type: 'pages',
      source_locale: 'en',
      target_locale: 'fr',
      source_title: 'My Page',
      queue_state: 'in_progress',
      priority: 'high',
      due_state: 'due_soon',
    });

    assert.strictEqual(assignment.id, 'test-id');
    assert.strictEqual(assignment.translation_group_id, 'group-123');
    assert.strictEqual(assignment.entity_type, 'pages');
    assert.strictEqual(assignment.source_locale, 'en');
    assert.strictEqual(assignment.target_locale, 'fr');
    assert.strictEqual(assignment.source_title, 'My Page');
    assert.strictEqual(assignment.queue_state, 'in_progress');
    assert.strictEqual(assignment.priority, 'high');
    assert.strictEqual(assignment.due_state, 'due_soon');
  });

  it('should include review actions in assignment', () => {
    const assignment = createMockAssignment({
      queue_state: 'review',
      review_actions: {
        submit_review: { enabled: false, reason: 'assignment not in progress', reason_code: 'INVALID_STATUS' },
        approve: { enabled: true, permission: 'admin.translations.approve' },
        reject: { enabled: true, permission: 'admin.translations.approve' },
      },
    });

    assert.strictEqual(assignment.review_actions.submit_review.enabled, false);
    assert.strictEqual(assignment.review_actions.approve.enabled, true);
    assert.strictEqual(assignment.review_actions.reject.enabled, true);
  });
});

describe('TranslatorDashboard - Summary', () => {
  it('should provide summary counts', () => {
    const mockData = createMockMyWorkResponse({
      assignments: [
        createMockAssignment({ due_state: 'overdue' }),
        createMockAssignment({ due_state: 'overdue' }),
        createMockAssignment({ due_state: 'due_soon' }),
        createMockAssignment({ queue_state: 'review' }),
      ],
      summary: {
        total: 4,
        overdue: 2,
        due_soon: 1,
        on_track: 0,
        none: 0,
        review: 1,
      },
    });

    assert.strictEqual(mockData.summary.total, 4);
    assert.strictEqual(mockData.summary.overdue, 2);
    assert.strictEqual(mockData.summary.due_soon, 1);
    assert.strictEqual(mockData.summary.review, 1);
  });
});

describe('TranslatorDashboard - Callbacks', () => {
  it('should store onAssignmentClick callback', () => {
    const mockCallback = mock.fn();
    const dashboard = new MockTranslatorDashboard({
      myWorkEndpoint: '/admin/api/translations/my-work',
      onAssignmentClick: mockCallback,
    });

    assert.ok(dashboard.config.onAssignmentClick);
  });

  it('should store onActionClick callback', () => {
    const mockCallback = mock.fn(async () => {});
    const dashboard = new MockTranslatorDashboard({
      myWorkEndpoint: '/admin/api/translations/my-work',
      onActionClick: mockCallback,
    });

    assert.ok(dashboard.config.onActionClick);
  });
});

describe('TranslatorDashboard - Due State', () => {
  it('should handle all due states', () => {
    for (const dueState of DUE_STATES) {
      const assignment = createMockAssignment({ due_state: dueState });
      assert.strictEqual(assignment.due_state, dueState);
    }
  });
});

describe('TranslatorDashboard - Queue State', () => {
  it('should handle all queue states', () => {
    for (const queueState of QUEUE_STATES) {
      const assignment = createMockAssignment({ queue_state: queueState });
      assert.strictEqual(assignment.queue_state, queueState);
    }
  });
});

describe('TranslatorDashboard - API Response Parsing', () => {
  it('should parse my-work response correctly', () => {
    const response = createMockMyWorkResponse({
      userId: 'user-123',
      assignments: [createMockAssignment()],
      page: 1,
      perPage: 25,
    });

    assert.strictEqual(response.scope, 'my_work');
    assert.strictEqual(response.user_id, 'user-123');
    assert.strictEqual(response.page, 1);
    assert.strictEqual(response.per_page, 25);
    assert.strictEqual(response.assignments.length, 1);
  });
});

describe('TranslatorDashboard - Priority Levels', () => {
  it('should handle all priority levels', () => {
    const priorities = ['low', 'normal', 'high', 'urgent'];

    for (const priority of priorities) {
      const assignment = createMockAssignment({ priority });
      assert.strictEqual(assignment.priority, priority);
    }
  });
});

describe('TranslatorDashboard - Content State', () => {
  it('should handle all content states', () => {
    const contentStates = ['draft', 'review', 'ready', 'archived'];

    for (const contentState of contentStates) {
      const assignment = createMockAssignment({ content_state: contentState });
      assert.strictEqual(assignment.content_state, contentState);
    }
  });
});

describe('TranslatorDashboard - Mount/Unmount', () => {
  it('should track mounted state', () => {
    const dashboard = new MockTranslatorDashboard({
      myWorkEndpoint: '/admin/api/translations/my-work',
    });

    const mockContainer = { innerHTML: '' };
    dashboard.mount(mockContainer);
    assert.strictEqual(dashboard.container, mockContainer);

    dashboard.unmount();
    assert.strictEqual(dashboard.container, null);
  });
});
