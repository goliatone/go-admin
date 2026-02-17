/**
 * Translator Dashboard Component (Phase 4 - TX-047)
 *
 * Provides a focused work queue for translators with progress and due-date awareness.
 * Card + table hybrid: workload summary + actionable assignments list.
 */

import type { GateResult, CapabilityGate } from './capability-gate.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Due state classification from backend
 */
export type DueState = 'overdue' | 'due_soon' | 'on_track' | 'none';

/**
 * Queue state / assignment status
 */
export type QueueState =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'review'
  | 'approved'
  | 'published'
  | 'archived';

/**
 * Content state derived from queue state
 */
export type ContentState = 'draft' | 'review' | 'ready' | 'archived';

/**
 * Assignment priority levels
 */
export type AssignmentPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Action state for review actions
 */
export interface ReviewActionState {
  enabled: boolean;
  reason?: string;
  reason_code?: string;
  permission?: string;
}

/**
 * Assignment row from API
 */
export interface TranslationAssignment {
  id: string;
  translation_group_id: string;
  entity_type: string;
  source_record_id: string;
  target_record_id: string;
  source_locale: string;
  target_locale: string;
  source_title: string;
  source_path: string;
  assignee_id: string;
  assignment_type: string;
  content_state: ContentState;
  queue_state: QueueState;
  status: QueueState;
  priority: AssignmentPriority;
  due_state: DueState;
  due_date?: string;
  updated_at: string;
  created_at: string;
  review_actions: {
    submit_review: ReviewActionState;
    approve: ReviewActionState;
    reject: ReviewActionState;
  };
}

/**
 * My Work API response
 */
export interface MyWorkResponse {
  scope: 'my_work';
  user_id: string;
  summary: {
    total: number;
    overdue: number;
    due_soon: number;
    on_track: number;
    none: number;
    review: number;
  };
  assignments: TranslationAssignment[];
  items: TranslationAssignment[];
  total: number;
  page: number;
  per_page: number;
  updated_at: string;
}

/**
 * Queue API response
 */
export interface QueueResponse {
  scope: 'queue';
  summary: {
    total: number;
    by_queue_state: Record<string, number>;
    by_due_state: Record<string, number>;
  };
  assignments: TranslationAssignment[];
  items: TranslationAssignment[];
  total: number;
  page: number;
  per_page: number;
  updated_at: string;
}

/**
 * Filter preset definition
 */
export interface FilterPreset {
  id: string;
  label: string;
  icon?: string;
  filters: Record<string, string>;
  badge?: () => number | string | null;
}

/**
 * Dashboard state
 */
export type DashboardState = 'loading' | 'loaded' | 'error' | 'empty';

/**
 * Dashboard configuration
 */
export interface TranslatorDashboardConfig {
  /** API endpoint for my-work data */
  myWorkEndpoint: string;
  /** API endpoint for queue data (optional for unified view) */
  queueEndpoint?: string;
  /** Panel base URL for opening assignments */
  panelBaseUrl?: string;
  /** Capability gate for permission checks */
  capabilityGate?: CapabilityGate;
  /** Custom filter presets */
  filterPresets?: FilterPreset[];
  /** Auto-refresh interval in ms (0 = disabled) */
  refreshInterval?: number;
  /** Callback when assignment is clicked */
  onAssignmentClick?: (assignment: TranslationAssignment) => void;
  /** Callback when action is clicked */
  onActionClick?: (action: string, assignment: TranslationAssignment) => Promise<void>;
  /** Custom labels (merged with defaults) */
  labels?: Partial<DashboardLabels>;
}

/**
 * Internal config with resolved labels
 */
interface ResolvedDashboardConfig {
  myWorkEndpoint: string;
  queueEndpoint: string;
  panelBaseUrl: string;
  filterPresets: FilterPreset[];
  refreshInterval: number;
  labels: DashboardLabels;
  capabilityGate?: CapabilityGate;
  onAssignmentClick?: (assignment: TranslationAssignment) => void;
  onActionClick?: (action: string, assignment: TranslationAssignment) => Promise<void>;
}

/**
 * Customizable labels
 */
export interface DashboardLabels {
  title: string;
  myAssignments: string;
  dueSoon: string;
  needsReview: string;
  all: string;
  overdue: string;
  onTrack: string;
  noAssignments: string;
  noAssignmentsDescription: string;
  loading: string;
  error: string;
  retry: string;
  submitForReview: string;
  approve: string;
  reject: string;
  openAssignment: string;
  dueDate: string;
  priority: string;
  status: string;
  targetLocale: string;
  sourceTitle: string;
}

const DEFAULT_LABELS: DashboardLabels = {
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

/**
 * Default filter presets for translator dashboard
 */
export const DEFAULT_FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'all',
    label: 'All',
    filters: {},
  },
  {
    id: 'in_progress',
    label: 'In Progress',
    filters: { status: 'in_progress' },
  },
  {
    id: 'due_soon',
    label: 'Due Soon',
    filters: { status: 'in_progress' }, // Due soon is filtered client-side
  },
  {
    id: 'review',
    label: 'Needs Review',
    filters: { status: 'review' },
  },
];

// ============================================================================
// TranslatorDashboard Class
// ============================================================================

/**
 * Translator Dashboard component
 */
export class TranslatorDashboard {
  private config: ResolvedDashboardConfig;
  private container: HTMLElement | null = null;
  private state: DashboardState = 'loading';
  private data: MyWorkResponse | null = null;
  private error: Error | null = null;
  private activePreset: string = 'all';
  private refreshTimer: number | null = null;

  constructor(config: TranslatorDashboardConfig) {
    this.config = {
      myWorkEndpoint: config.myWorkEndpoint,
      queueEndpoint: config.queueEndpoint || '',
      panelBaseUrl: config.panelBaseUrl || '',
      capabilityGate: config.capabilityGate,
      filterPresets: config.filterPresets || DEFAULT_FILTER_PRESETS,
      refreshInterval: config.refreshInterval || 0,
      onAssignmentClick: config.onAssignmentClick,
      onActionClick: config.onActionClick,
      labels: { ...DEFAULT_LABELS, ...(config.labels || {}) },
    };
  }

  /**
   * Mount the dashboard to a container element
   */
  mount(container: HTMLElement): void {
    this.container = container;
    this.render();
    this.loadData();

    if (this.config.refreshInterval > 0) {
      this.startAutoRefresh();
    }
  }

  /**
   * Unmount and cleanup
   */
  unmount(): void {
    this.stopAutoRefresh();
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.container = null;
  }

  /**
   * Refresh dashboard data
   */
  async refresh(): Promise<void> {
    await this.loadData();
  }

  /**
   * Set active filter preset
   */
  setActivePreset(presetId: string): void {
    this.activePreset = presetId;
    this.loadData();
  }

  /**
   * Get current state
   */
  getState(): DashboardState {
    return this.state;
  }

  /**
   * Get current data
   */
  getData(): MyWorkResponse | null {
    return this.data;
  }

  private startAutoRefresh(): void {
    if (this.refreshTimer) return;
    this.refreshTimer = window.setInterval(() => {
      this.loadData();
    }, this.config.refreshInterval);
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      window.clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private async loadData(): Promise<void> {
    this.state = 'loading';
    this.render();

    try {
      const preset = this.config.filterPresets.find(p => p.id === this.activePreset);
      const params = new URLSearchParams(preset?.filters || {});
      const url = `${this.config.myWorkEndpoint}${params.toString() ? '?' + params.toString() : ''}`;

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load: ${response.status}`);
      }

      this.data = await response.json() as MyWorkResponse;
      this.state = this.data.assignments.length === 0 ? 'empty' : 'loaded';
      this.error = null;
    } catch (err) {
      this.error = err instanceof Error ? err : new Error(String(err));
      this.state = 'error';
    }

    this.render();
  }

  private render(): void {
    if (!this.container) return;

    const labels = this.config.labels;
    this.container.innerHTML = `
      <div class="translator-dashboard" role="region" aria-label="${escapeHtml(labels.title)}">
        ${this.renderHeader()}
        ${this.renderSummaryCards()}
        ${this.renderFilterBar()}
        ${this.renderContent()}
      </div>
    `;

    this.attachEventListeners();
  }

  private renderHeader(): string {
    const labels = this.config.labels;
    return `
      <div class="dashboard-header">
        <h2 class="dashboard-title">${escapeHtml(labels.title)}</h2>
        <button type="button" class="dashboard-refresh-btn" aria-label="Refresh">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
            <path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm-1.621-6.01a7 7 0 00-11.712 3.138.75.75 0 001.449.39 5.5 5.5 0 019.201-2.466l.312.311H10.51a.75.75 0 000 1.5h4.243a.75.75 0 00.75-.75V3.295a.75.75 0 00-1.5 0v2.43l-.311-.311z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    `;
  }

  private renderSummaryCards(): string {
    if (this.state === 'loading' || !this.data) {
      return this.renderSummaryLoading();
    }

    const summary = this.data.summary;
    const labels = this.config.labels;

    return `
      <div class="dashboard-summary-cards" role="list" aria-label="Work summary">
        ${this.renderSummaryCard('total', labels.myAssignments, summary.total, 'text-blue-600 bg-blue-50')}
        ${this.renderSummaryCard('overdue', labels.overdue, summary.overdue, 'text-red-600 bg-red-50')}
        ${this.renderSummaryCard('due_soon', labels.dueSoon, summary.due_soon, 'text-amber-600 bg-amber-50')}
        ${this.renderSummaryCard('review', labels.needsReview, summary.review, 'text-purple-600 bg-purple-50')}
      </div>
    `;
  }

  private renderSummaryCard(id: string, label: string, count: number, colorClass: string): string {
    return `
      <div class="summary-card ${colorClass}" role="listitem" data-summary="${id}">
        <div class="summary-count">${count}</div>
        <div class="summary-label">${escapeHtml(label)}</div>
      </div>
    `;
  }

  private renderSummaryLoading(): string {
    return `
      <div class="dashboard-summary-cards loading" role="list" aria-busy="true">
        <div class="summary-card bg-gray-100 animate-pulse" role="listitem"><div class="h-12"></div></div>
        <div class="summary-card bg-gray-100 animate-pulse" role="listitem"><div class="h-12"></div></div>
        <div class="summary-card bg-gray-100 animate-pulse" role="listitem"><div class="h-12"></div></div>
        <div class="summary-card bg-gray-100 animate-pulse" role="listitem"><div class="h-12"></div></div>
      </div>
    `;
  }

  private renderFilterBar(): string {
    return `
      <div class="dashboard-filter-bar" role="tablist" aria-label="Filter assignments">
        ${this.config.filterPresets.map(preset => this.renderFilterPreset(preset)).join('')}
      </div>
    `;
  }

  private renderFilterPreset(preset: FilterPreset): string {
    const isActive = this.activePreset === preset.id;
    const badge = preset.badge?.() ?? null;
    const badgeHtml = badge !== null ? `<span class="filter-badge">${badge}</span>` : '';

    return `
      <button type="button"
              class="filter-preset ${isActive ? 'active' : ''}"
              role="tab"
              aria-selected="${isActive}"
              data-preset="${preset.id}">
        ${preset.icon || ''}
        <span class="filter-label">${escapeHtml(preset.label)}</span>
        ${badgeHtml}
      </button>
    `;
  }

  private renderContent(): string {
    switch (this.state) {
      case 'loading':
        return this.renderLoading();
      case 'error':
        return this.renderError();
      case 'empty':
        return this.renderEmpty();
      case 'loaded':
        return this.renderAssignmentList();
      default:
        return '';
    }
  }

  private renderLoading(): string {
    const labels = this.config.labels;
    return `
      <div class="dashboard-loading" role="status" aria-busy="true">
        <div class="loading-spinner"></div>
        <p>${escapeHtml(labels.loading)}</p>
      </div>
    `;
  }

  private renderError(): string {
    const labels = this.config.labels;
    return `
      <div class="dashboard-error" role="alert">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-10 h-10 text-red-500">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
        </svg>
        <p class="error-message">${escapeHtml(labels.error)}</p>
        ${this.error ? `<p class="error-detail">${escapeHtml(this.error.message)}</p>` : ''}
        <button type="button" class="retry-btn">${escapeHtml(labels.retry)}</button>
      </div>
    `;
  }

  private renderEmpty(): string {
    const labels = this.config.labels;
    return `
      <div class="dashboard-empty" role="status">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-12 h-12 text-gray-400">
          <path fill-rule="evenodd" d="M2.5 3A1.5 1.5 0 001 4.5v4A1.5 1.5 0 002.5 10h6A1.5 1.5 0 0010 8.5v-4A1.5 1.5 0 008.5 3h-6zm11 2A1.5 1.5 0 0012 6.5v7a1.5 1.5 0 001.5 1.5h4a1.5 1.5 0 001.5-1.5v-7A1.5 1.5 0 0017.5 5h-4zm-10 7A1.5 1.5 0 002 13.5v2A1.5 1.5 0 003.5 17h5A1.5 1.5 0 0010 15.5v-2A1.5 1.5 0 008.5 12h-5z" clip-rule="evenodd" />
        </svg>
        <p class="empty-title">${escapeHtml(labels.noAssignments)}</p>
        <p class="empty-description">${escapeHtml(labels.noAssignmentsDescription)}</p>
      </div>
    `;
  }

  private renderAssignmentList(): string {
    if (!this.data) return '';

    const labels = this.config.labels;
    let assignments = this.data.assignments;

    // Client-side filtering for due_soon preset
    if (this.activePreset === 'due_soon') {
      assignments = assignments.filter(a => a.due_state === 'due_soon' || a.due_state === 'overdue');
    }

    if (assignments.length === 0) {
      return this.renderEmpty();
    }

    return `
      <div class="dashboard-assignment-list">
        <table class="assignment-table" role="grid" aria-label="Translation assignments">
          <thead>
            <tr>
              <th scope="col">${escapeHtml(labels.sourceTitle)}</th>
              <th scope="col">${escapeHtml(labels.targetLocale)}</th>
              <th scope="col">${escapeHtml(labels.status)}</th>
              <th scope="col">${escapeHtml(labels.dueDate)}</th>
              <th scope="col">${escapeHtml(labels.priority)}</th>
              <th scope="col" class="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${assignments.map(a => this.renderAssignmentRow(a)).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  private renderAssignmentRow(assignment: TranslationAssignment): string {
    const labels = this.config.labels;
    const dueStateClass = getDueStateClass(assignment.due_state);
    const queueStateClass = getQueueStateClass(assignment.queue_state);
    const priorityClass = getPriorityClass(assignment.priority);

    const dueDateDisplay = assignment.due_date
      ? formatRelativeDate(new Date(assignment.due_date))
      : '-';

    return `
      <tr class="assignment-row" data-assignment-id="${escapeAttr(assignment.id)}">
        <td class="title-cell">
          <div class="title-content">
            <span class="source-title">${escapeHtml(assignment.source_title || assignment.source_path || assignment.id)}</span>
            <span class="entity-type">${escapeHtml(assignment.entity_type)}</span>
          </div>
        </td>
        <td class="locale-cell">
          <span class="locale-badge">${escapeHtml(assignment.target_locale.toUpperCase())}</span>
          <span class="locale-arrow">←</span>
          <span class="locale-badge source">${escapeHtml(assignment.source_locale.toUpperCase())}</span>
        </td>
        <td class="status-cell">
          <span class="status-badge ${queueStateClass}">${escapeHtml(formatQueueState(assignment.queue_state))}</span>
        </td>
        <td class="due-cell ${dueStateClass}">
          ${dueDateDisplay}
        </td>
        <td class="priority-cell">
          <span class="priority-indicator ${priorityClass}">${escapeHtml(formatPriority(assignment.priority))}</span>
        </td>
        <td class="actions-cell">
          ${this.renderAssignmentActions(assignment)}
        </td>
      </tr>
    `;
  }

  private renderAssignmentActions(assignment: TranslationAssignment): string {
    const labels = this.config.labels;
    const actions: string[] = [];

    // Open action
    actions.push(`
      <button type="button" class="action-btn open-btn" data-action="open" title="${escapeAttr(labels.openAssignment)}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
          <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
          <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
        </svg>
      </button>
    `);

    // Review actions based on state and permissions
    const reviewActions = assignment.review_actions;

    if (assignment.queue_state === 'in_progress' && reviewActions.submit_review.enabled) {
      actions.push(`
        <button type="button" class="action-btn submit-review-btn" data-action="submit_review" title="${escapeAttr(labels.submitForReview)}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
          </svg>
        </button>
      `);
    }

    if (assignment.queue_state === 'review') {
      if (reviewActions.approve.enabled) {
        actions.push(`
          <button type="button" class="action-btn approve-btn" data-action="approve" title="${escapeAttr(labels.approve)}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
              <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
            </svg>
          </button>
        `);
      }

      if (reviewActions.reject.enabled) {
        actions.push(`
          <button type="button" class="action-btn reject-btn" data-action="reject" title="${escapeAttr(labels.reject)}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        `);
      }
    }

    return `<div class="action-buttons">${actions.join('')}</div>`;
  }

  private attachEventListeners(): void {
    if (!this.container) return;

    // Refresh button
    const refreshBtn = this.container.querySelector('.dashboard-refresh-btn');
    refreshBtn?.addEventListener('click', () => this.loadData());

    // Retry button
    const retryBtn = this.container.querySelector('.retry-btn');
    retryBtn?.addEventListener('click', () => this.loadData());

    // Filter presets
    const presetBtns = this.container.querySelectorAll('.filter-preset');
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const presetId = (btn as HTMLElement).dataset.preset;
        if (presetId) {
          this.setActivePreset(presetId);
        }
      });
    });

    // Assignment row clicks
    const rows = this.container.querySelectorAll('.assignment-row');
    rows.forEach(row => {
      const assignmentId = (row as HTMLElement).dataset.assignmentId;
      if (!assignmentId || !this.data) return;

      const assignment = this.data.assignments.find(a => a.id === assignmentId);
      if (!assignment) return;

      // Action buttons
      const actionBtns = row.querySelectorAll('.action-btn');
      actionBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const action = (btn as HTMLElement).dataset.action;
          if (!action) return;

          if (action === 'open') {
            this.config.onAssignmentClick?.(assignment);
          } else {
            await this.config.onActionClick?.(action, assignment);
          }
        });
      });

      // Row click (open assignment)
      row.addEventListener('click', () => {
        this.config.onAssignmentClick?.(assignment);
      });
    });

    // Summary card clicks (filter shortcut)
    const summaryCards = this.container.querySelectorAll('.summary-card');
    summaryCards.forEach(card => {
      card.addEventListener('click', () => {
        const summaryType = (card as HTMLElement).dataset.summary;
        if (summaryType === 'review') {
          this.setActivePreset('review');
        } else if (summaryType === 'due_soon' || summaryType === 'overdue') {
          this.setActivePreset('due_soon');
        } else {
          this.setActivePreset('all');
        }
      });
    });
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getDueStateClass(state: DueState): string {
  switch (state) {
    case 'overdue':
      return 'due-overdue';
    case 'due_soon':
      return 'due-soon';
    case 'on_track':
      return 'due-on-track';
    default:
      return '';
  }
}

function getQueueStateClass(state: QueueState): string {
  switch (state) {
    case 'pending':
      return 'status-pending';
    case 'assigned':
      return 'status-assigned';
    case 'in_progress':
      return 'status-in-progress';
    case 'review':
      return 'status-review';
    case 'approved':
      return 'status-approved';
    case 'published':
      return 'status-published';
    case 'archived':
      return 'status-archived';
    default:
      return '';
  }
}

function getPriorityClass(priority: AssignmentPriority): string {
  switch (priority) {
    case 'urgent':
      return 'priority-urgent';
    case 'high':
      return 'priority-high';
    case 'normal':
      return 'priority-normal';
    case 'low':
      return 'priority-low';
    default:
      return 'priority-normal';
  }
}

function formatQueueState(state: QueueState): string {
  return state.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatPriority(priority: AssignmentPriority): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) {
    return `${Math.abs(days)}d overdue`;
  } else if (days === 0) {
    return 'Today';
  } else if (days === 1) {
    return 'Tomorrow';
  } else if (days <= 7) {
    return `${days}d`;
  } else {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
}

// ============================================================================
// CSS Styles
// ============================================================================

/**
 * Get CSS styles for translator dashboard
 */
export function getTranslatorDashboardStyles(): string {
  return `
    /* Translator Dashboard Styles */
    .translator-dashboard {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding: 1.5rem;
      background: white;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .dashboard-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }

    .dashboard-refresh-btn {
      padding: 0.5rem;
      border: none;
      background: transparent;
      cursor: pointer;
      color: #6b7280;
      border-radius: 0.25rem;
      transition: color 0.2s, background 0.2s;
    }

    .dashboard-refresh-btn:hover {
      color: #374151;
      background: #f3f4f6;
    }

    /* Summary Cards */
    .dashboard-summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 1rem;
    }

    .summary-card {
      padding: 1rem;
      border-radius: 0.5rem;
      text-align: center;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .summary-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .summary-count {
      font-size: 1.75rem;
      font-weight: 700;
      line-height: 1;
    }

    .summary-label {
      font-size: 0.875rem;
      margin-top: 0.25rem;
      opacity: 0.8;
    }

    /* Filter Bar */
    .dashboard-filter-bar {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 0.75rem;
    }

    .filter-preset {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 0.75rem;
      font-size: 0.875rem;
      border: 1px solid #e5e7eb;
      border-radius: 0.375rem;
      background: white;
      cursor: pointer;
      color: #6b7280;
      transition: all 0.2s;
    }

    .filter-preset:hover {
      border-color: #d1d5db;
      color: #374151;
    }

    .filter-preset.active {
      border-color: #2563eb;
      background: #eff6ff;
      color: #2563eb;
    }

    .filter-badge {
      padding: 0.125rem 0.375rem;
      font-size: 0.75rem;
      font-weight: 500;
      background: #e5e7eb;
      border-radius: 9999px;
    }

    .filter-preset.active .filter-badge {
      background: #dbeafe;
    }

    /* Loading State */
    .dashboard-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      color: #6b7280;
    }

    .loading-spinner {
      width: 2rem;
      height: 2rem;
      border: 2px solid #e5e7eb;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Error State */
    .dashboard-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem;
      text-align: center;
    }

    .error-message {
      font-weight: 500;
      color: #dc2626;
      margin: 1rem 0 0.5rem;
    }

    .error-detail {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0 0 1rem;
    }

    .retry-btn {
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      background: white;
      cursor: pointer;
      color: #374151;
      transition: all 0.2s;
    }

    .retry-btn:hover {
      background: #f3f4f6;
    }

    /* Empty State */
    .dashboard-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem;
      text-align: center;
    }

    .empty-title {
      font-weight: 500;
      color: #374151;
      margin: 1rem 0 0.5rem;
    }

    .empty-description {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0;
    }

    /* Assignment Table */
    .dashboard-assignment-list {
      overflow-x: auto;
    }

    .assignment-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .assignment-table th {
      text-align: left;
      padding: 0.75rem;
      font-weight: 500;
      color: #6b7280;
      border-bottom: 1px solid #e5e7eb;
      white-space: nowrap;
    }

    .assignment-table td {
      padding: 0.75rem;
      border-bottom: 1px solid #f3f4f6;
      vertical-align: middle;
    }

    .assignment-row {
      cursor: pointer;
      transition: background 0.2s;
    }

    .assignment-row:hover {
      background: #f9fafb;
    }

    .title-cell .title-content {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .source-title {
      font-weight: 500;
      color: #1f2937;
    }

    .entity-type {
      font-size: 0.75rem;
      color: #9ca3af;
    }

    .locale-cell {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .locale-badge {
      padding: 0.125rem 0.375rem;
      font-size: 0.75rem;
      font-weight: 500;
      background: #dbeafe;
      color: #1d4ed8;
      border-radius: 0.25rem;
    }

    .locale-badge.source {
      background: #f3f4f6;
      color: #6b7280;
    }

    .locale-arrow {
      color: #9ca3af;
    }

    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 500;
      border-radius: 9999px;
    }

    .status-pending { background: #f3f4f6; color: #6b7280; }
    .status-assigned { background: #e0e7ff; color: #4338ca; }
    .status-in-progress { background: #dbeafe; color: #1d4ed8; }
    .status-review { background: #fae8ff; color: #a21caf; }
    .status-approved { background: #d1fae5; color: #059669; }
    .status-published { background: #d1fae5; color: #047857; }
    .status-archived { background: #e5e7eb; color: #6b7280; }

    .due-overdue { color: #dc2626; font-weight: 500; }
    .due-soon { color: #d97706; }
    .due-on-track { color: #059669; }

    .priority-indicator {
      font-size: 0.75rem;
      font-weight: 500;
    }

    .priority-urgent { color: #dc2626; }
    .priority-high { color: #d97706; }
    .priority-normal { color: #6b7280; }
    .priority-low { color: #9ca3af; }

    .actions-col { width: 100px; text-align: right; }
    .actions-cell { text-align: right; }

    .action-buttons {
      display: flex;
      justify-content: flex-end;
      gap: 0.25rem;
    }

    .action-btn {
      padding: 0.375rem;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: 0.25rem;
      color: #6b7280;
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: #f3f4f6;
      color: #374151;
    }

    .open-btn:hover { color: #2563eb; }
    .submit-review-btn:hover { color: #7c3aed; }
    .approve-btn:hover { color: #059669; }
    .reject-btn:hover { color: #dc2626; }

    /* Responsive */
    @media (max-width: 640px) {
      .translator-dashboard {
        padding: 1rem;
      }

      .dashboard-summary-cards {
        grid-template-columns: repeat(2, 1fr);
      }

      .assignment-table th:nth-child(4),
      .assignment-table td:nth-child(4),
      .assignment-table th:nth-child(5),
      .assignment-table td:nth-child(5) {
        display: none;
      }
    }
  `;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create and mount a translator dashboard
 */
export function createTranslatorDashboard(
  container: HTMLElement,
  config: TranslatorDashboardConfig
): TranslatorDashboard {
  const dashboard = new TranslatorDashboard(config);
  dashboard.mount(container);
  return dashboard;
}

/**
 * Initialize translator dashboard from data attributes
 */
export function initTranslatorDashboard(container: HTMLElement): TranslatorDashboard | null {
  const endpoint = container.dataset.myWorkEndpoint;
  if (!endpoint) {
    console.warn('TranslatorDashboard: Missing data-my-work-endpoint attribute');
    return null;
  }

  return createTranslatorDashboard(container, {
    myWorkEndpoint: endpoint,
    panelBaseUrl: container.dataset.panelBaseUrl,
    queueEndpoint: container.dataset.queueEndpoint,
    refreshInterval: parseInt(container.dataset.refreshInterval || '0', 10),
  });
}
