/**
 * Services Activity Page
 * Displays service activity with timeline and table views, filters, and pagination
 */

import type {
  ServiceActivityEntry,
  ServiceActivityStatus,
  ActivityListFilter,
  ScopeType,
} from '../types.js';
import { getServicesClient, type ServicesAPIClient } from '../api-client.js';
import { QueryStateManager, type QueryState } from '../query-state.js';
import { getPermissionManager, canViewActivity } from '../permissions.js';
import {
  renderForbiddenState,
  renderLoadingState,
  renderErrorState,
  renderEmptyState,
  renderNoResultsState,
  renderTableLoadingState,
  renderTableErrorState,
  renderTableNoResultsState,
} from '../ui-states.js';
import {
  getActionLabel as defaultGetActionLabel,
  getActionsByCategory,
} from '../activity-labels.js';
import {
  createActivityNavigateHandler,
  generateDeepLink,
  mapObjectTypeToEntity,
  type ServiceEntityType,
} from '../deep-links.js';
import type { ToastNotifier } from '../../toast/types.js';
import { renderIcon } from '../../shared/icon-renderer.js';

// =============================================================================
// Types
// =============================================================================

export type ActivityViewMode = 'timeline' | 'table';

export interface ActivityPageConfig {
  /** Container element or selector */
  container: string | HTMLElement;
  /** API client (optional, uses default) */
  apiClient?: ServicesAPIClient;
  /** Toast notifier for messages */
  notifier?: ToastNotifier;
  /** Items per page (default: 25) */
  perPage?: number;
  /** Enable URL state sync (default: true) */
  syncUrl?: boolean;
  /** Initial view mode (default: 'timeline') */
  viewMode?: ActivityViewMode;
  /** Enable deep links for object navigation with context preservation (default: true) */
  useDeepLinks?: boolean;
  /** Callback when activity entry is selected */
  onSelect?: (entry: ServiceActivityEntry) => void;
  /** Callback for navigating to related entity (overrides deep links if provided) */
  onNavigate?: (objectType: string, objectId: string) => void;
  /** Custom provider name resolver */
  getProviderName?: (providerId: string) => string;
  /** Custom action label resolver (from backend config) */
  getActionLabel?: (action: string) => string;
  /** Available providers for filter dropdown */
  providers?: Array<{ id: string; name: string }>;
  /** Available channels for filter dropdown */
  channels?: string[];
  /** Available actions for filter dropdown */
  actions?: string[];
}

interface ActivityPageState {
  entries: ServiceActivityEntry[];
  total: number;
  loading: boolean;
  error: Error | null;
  viewMode: ActivityViewMode;
}

type ActivityFilter = {
  provider_id: string;
  scope_type: string;
  scope_id: string;
  channel: string;
  action: string;
  status: string;
  object_type: string;
  object_id: string;
  from: string;
  to: string;
};

// =============================================================================
// Status Configuration
// =============================================================================

const STATUS_CONFIG: Record<ServiceActivityStatus, { label: string; bg: string; text: string; icon: string }> = {
  success: { label: 'Success', bg: 'bg-green-100', text: 'text-green-700', icon: 'iconoir:check-circle' },
  failure: { label: 'Failed', bg: 'bg-red-100', text: 'text-red-700', icon: 'iconoir:warning-circle' },
  pending: { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-700', icon: 'iconoir:clock' },
};

// =============================================================================
// Activity Page Manager
// =============================================================================

export class ActivityPageManager {
  private config: ActivityPageConfig;
  private container: HTMLElement | null = null;
  private client: ServicesAPIClient;
  private queryState: QueryStateManager<ActivityFilter>;
  private state: ActivityPageState = {
    entries: [],
    total: 0,
    loading: false,
    error: null,
    viewMode: 'timeline',
  };
  private abortController: AbortController | null = null;

  constructor(config: ActivityPageConfig) {
    this.config = {
      perPage: 25,
      syncUrl: true,
      viewMode: 'timeline',
      useDeepLinks: true,
      ...config,
    };
    this.state.viewMode = this.config.viewMode || 'timeline';
    this.client = config.apiClient || getServicesClient();

    this.queryState = new QueryStateManager<ActivityFilter>({
      config: {
        defaultPerPage: this.config.perPage,
        onChange: () => this.loadActivity(),
      },
      filterFields: [
        'provider_id',
        'scope_type',
        'scope_id',
        'channel',
        'action',
        'status',
        'object_type',
        'object_id',
        'from',
        'to',
      ],
      dateFields: ['from', 'to'],
      storageKey: 'services-activity',
    });
  }

  /**
   * Initialize the activity page
   */
  async init(): Promise<void> {
    // Resolve container
    this.container =
      typeof this.config.container === 'string'
        ? document.querySelector<HTMLElement>(this.config.container)
        : this.config.container;

    if (!this.container) {
      console.error('[ActivityPage] Container not found:', this.config.container);
      return;
    }

    // Check view permission
    if (!canViewActivity()()) {
      this.renderForbidden();
      return;
    }

    // Restore view mode from URL or localStorage
    this.restoreViewMode();

    // Initialize query state from URL
    this.queryState.init();

    // Render initial structure
    this.renderStructure();
    this.bindEvents();

    // Load activity
    await this.loadActivity();
  }

  /**
   * Refresh the activity list
   */
  async refresh(): Promise<void> {
    await this.loadActivity();
  }

  /**
   * Get the current entries
   */
  getEntries(): ServiceActivityEntry[] {
    return [...this.state.entries];
  }

  /**
   * Get an entry by ID
   */
  getEntry(id: string): ServiceActivityEntry | undefined {
    return this.state.entries.find((e) => e.id === id);
  }

  /**
   * Set view mode
   */
  setViewMode(mode: ActivityViewMode): void {
    if (this.state.viewMode !== mode) {
      this.state.viewMode = mode;
      this.saveViewMode();
      this.updateViewModeUI();
      this.renderEntries();
    }
  }

  /**
   * Get current view mode
   */
  getViewMode(): ActivityViewMode {
    return this.state.viewMode;
  }

  /**
   * Destroy the manager
   */
  destroy(): void {
    this.abortController?.abort();
    this.queryState.destroy();
  }

  // ---------------------------------------------------------------------------
  // Data Loading
  // ---------------------------------------------------------------------------

  private async loadActivity(): Promise<void> {
    if (!this.container) return;

    // Cancel previous request
    this.abortController?.abort();
    this.abortController = new AbortController();

    this.state.loading = true;
    this.state.error = null;
    this.updateLoadingState();

    try {
      const params = this.queryState.getQueryParams();
      const filter: ActivityListFilter = {
        provider_id: params.provider_id as string | undefined,
        scope_type: params.scope_type as ScopeType | undefined,
        scope_id: params.scope_id as string | undefined,
        action: params.action as string | undefined,
        status: params.status as ServiceActivityStatus | undefined,
        from: params.from as string | undefined,
        to: params.to as string | undefined,
        page: params.page as number,
        per_page: params.per_page as number,
      };

      const response = await this.client.listActivity(filter, this.abortController.signal);

      this.state.entries = response.entries;
      this.state.total = response.total;
      this.queryState.updateFromResponse(response.total, response.has_more);

      this.renderEntries();
      this.updatePagination();
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;

      this.state.error = err instanceof Error ? err : new Error(String(err));
      this.renderError();

      if (this.config.notifier) {
        this.config.notifier.error(`Failed to load activity: ${this.state.error.message}`);
      }
    } finally {
      this.state.loading = false;
      this.updateLoadingState();
    }
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  private renderStructure(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="activity-page">
        <!-- Header with view toggle -->
        <div class="activity-header flex items-center justify-between mb-4">
          <div class="activity-filter-summary text-sm text-gray-500">
            <!-- Filter summary will be rendered here -->
          </div>
          <div class="activity-view-toggle flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
            <button type="button"
                    class="activity-view-timeline px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${this.state.viewMode === 'timeline' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
                    title="Timeline view">
              ${renderIcon('iconoir:timeline', { size: '16px' })}
              <span class="ml-1.5">Timeline</span>
            </button>
            <button type="button"
                    class="activity-view-table px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${this.state.viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
                    title="Table view">
              ${renderIcon('iconoir:table-rows', { size: '16px' })}
              <span class="ml-1.5">Table</span>
            </button>
          </div>
        </div>

        <!-- Filters -->
        <div class="activity-filters bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div class="flex flex-wrap items-end gap-3">
            <!-- Search -->
            <div class="flex-1 min-w-[200px]">
              <label class="block text-xs font-medium text-gray-500 mb-1">Search</label>
              <input type="text"
                     class="activity-search w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                     placeholder="Search activity..."
                     data-filter="search">
            </div>

            <!-- Provider -->
            <div class="w-40">
              <label class="block text-xs font-medium text-gray-500 mb-1">Provider</label>
              <select class="activity-filter-provider w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      data-filter="provider_id">
                <option value="">All Providers</option>
                ${this.renderProviderOptions()}
              </select>
            </div>

            <!-- Channel -->
            <div class="w-36">
              <label class="block text-xs font-medium text-gray-500 mb-1">Channel</label>
              <select class="activity-filter-channel w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      data-filter="channel">
                <option value="">All Channels</option>
                ${this.renderChannelOptions()}
              </select>
            </div>

            <!-- Action -->
            <div class="w-40">
              <label class="block text-xs font-medium text-gray-500 mb-1">Action</label>
              <select class="activity-filter-action w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      data-filter="action">
                <option value="">All Actions</option>
                ${this.renderActionOptions()}
              </select>
            </div>

            <!-- Scope -->
            <div class="w-32">
              <label class="block text-xs font-medium text-gray-500 mb-1">Scope</label>
              <select class="activity-filter-scope w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      data-filter="scope_type">
                <option value="">All Scopes</option>
                <option value="user">User</option>
                <option value="org">Organization</option>
              </select>
            </div>

            <!-- Status -->
            <div class="w-32">
              <label class="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select class="activity-filter-status w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      data-filter="status">
                <option value="">All Statuses</option>
                <option value="success">Success</option>
                <option value="failure">Failed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          <!-- Date range and reset row -->
          <div class="flex flex-wrap items-end gap-3 mt-3 pt-3 border-t border-gray-100">
            <!-- Object filter -->
            <div class="w-40">
              <label class="block text-xs font-medium text-gray-500 mb-1">Object Type</label>
              <input type="text"
                     class="activity-filter-object-type w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                     placeholder="e.g. connection"
                     data-filter="object_type">
            </div>

            <div class="w-48">
              <label class="block text-xs font-medium text-gray-500 mb-1">Object ID</label>
              <input type="text"
                     class="activity-filter-object-id w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                     placeholder="Object ID"
                     data-filter="object_id">
            </div>

            <!-- Date From -->
            <div class="w-44">
              <label class="block text-xs font-medium text-gray-500 mb-1">From</label>
              <input type="datetime-local"
                     class="activity-filter-from w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                     data-filter="from">
            </div>

            <!-- Date To -->
            <div class="w-44">
              <label class="block text-xs font-medium text-gray-500 mb-1">To</label>
              <input type="datetime-local"
                     class="activity-filter-to w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                     data-filter="to">
            </div>

            <!-- Spacer -->
            <div class="flex-1"></div>

            <!-- Reset Button -->
            <button type="button"
                    class="activity-reset flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                    title="Reset filters">
              ${renderIcon('iconoir:refresh', { size: '16px' })}
              <span>Reset</span>
            </button>
          </div>
        </div>

        <!-- Content Area -->
        <div class="activity-content">
          <!-- Timeline View -->
          <div class="activity-timeline-container ${this.state.viewMode === 'timeline' ? '' : 'hidden'}">
            <div class="activity-timeline space-y-4">
              <!-- Timeline entries will be rendered here -->
            </div>
          </div>

          <!-- Table View -->
          <div class="activity-table-container ${this.state.viewMode === 'table' ? '' : 'hidden'}">
            <div class="overflow-x-auto bg-white rounded-lg border border-gray-200">
              <table class="activity-table w-full text-sm">
                <thead class="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th class="px-4 py-3 text-left font-medium text-gray-600">Time</th>
                    <th class="px-4 py-3 text-left font-medium text-gray-600">Provider</th>
                    <th class="px-4 py-3 text-left font-medium text-gray-600">Action</th>
                    <th class="px-4 py-3 text-left font-medium text-gray-600">Object</th>
                    <th class="px-4 py-3 text-left font-medium text-gray-600">Scope</th>
                    <th class="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                    <th class="px-4 py-3 text-left font-medium text-gray-600">Channel</th>
                  </tr>
                </thead>
                <tbody class="activity-tbody divide-y divide-gray-100">
                  <!-- Table rows will be rendered here -->
                </tbody>
              </table>
            </div>
          </div>

          <!-- Empty State -->
          <div class="activity-empty hidden py-12 text-center bg-white rounded-lg border border-gray-200">
            <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
              ${renderIcon('iconoir:activity', { size: '24px', extraClass: 'text-gray-400' })}
            </div>
            <h3 class="text-lg font-medium text-gray-900">No activity found</h3>
            <p class="text-sm text-gray-500 mt-1">Activity entries will appear here as actions occur.</p>
          </div>
        </div>

        <!-- Pagination -->
        <div class="activity-pagination flex items-center justify-between mt-4">
          <div class="activity-info text-sm text-gray-500">
            <!-- Info will be rendered here -->
          </div>
          <div class="flex items-center gap-2">
            <button type="button"
                    class="activity-prev px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled>
              Previous
            </button>
            <button type="button"
                    class="activity-next px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled>
              Next
            </button>
          </div>
        </div>
      </div>
    `;

    // Restore filter values from state
    this.restoreFilterValues();
  }

  private renderProviderOptions(): string {
    if (!this.config.providers || this.config.providers.length === 0) {
      return '';
    }
    return this.config.providers
      .map((p) => `<option value="${this.escapeHtml(p.id)}">${this.escapeHtml(p.name)}</option>`)
      .join('');
  }

  private renderChannelOptions(): string {
    const channels = this.config.channels || ['connections', 'credentials', 'grants', 'webhooks', 'sync', 'lifecycle'];
    return channels
      .map((c) => `<option value="${this.escapeHtml(c)}">${this.escapeHtml(this.formatLabel(c))}</option>`)
      .join('');
  }

  private renderActionOptions(): string {
    // If actions are explicitly provided, use them
    if (this.config.actions && this.config.actions.length > 0) {
      return this.config.actions
        .map((a) => {
          const label = this.resolveActionLabel(a);
          return `<option value="${this.escapeHtml(a)}">${this.escapeHtml(label)}</option>`;
        })
        .join('');
    }

    // Otherwise, render grouped options from the centralized registry
    const categories = getActionsByCategory();
    const categoryLabels: Record<string, string> = {
      connections: 'Connections',
      credentials: 'Credentials',
      sync: 'Sync',
      webhooks: 'Webhooks',
      subscriptions: 'Subscriptions',
      installations: 'Installations',
      grants: 'Permissions',
      errors: 'Errors',
      other: 'Other',
    };

    const optgroups: string[] = [];
    for (const [category, entries] of Object.entries(categories)) {
      const categoryLabel = categoryLabels[category] || this.formatLabel(category);
      const options = entries
        .map((entry) => {
          const label = this.resolveActionLabel(entry.action);
          return `<option value="${this.escapeHtml(entry.action)}">${this.escapeHtml(label)}</option>`;
        })
        .join('');
      optgroups.push(`<optgroup label="${this.escapeHtml(categoryLabel)}">${options}</optgroup>`);
    }

    return optgroups.join('');
  }

  /**
   * Resolve action label using config override or centralized registry.
   */
  private resolveActionLabel(action: string): string {
    // Config override takes priority
    if (this.config.getActionLabel) {
      return this.config.getActionLabel(action);
    }
    // Fall back to centralized registry (with built-in fallback formatter)
    return defaultGetActionLabel(action);
  }

  private restoreFilterValues(): void {
    const state = this.queryState.getState();

    const searchInput = this.container?.querySelector<HTMLInputElement>('[data-filter="search"]');
    if (searchInput && state.search) {
      searchInput.value = state.search;
    }

    for (const [key, value] of Object.entries(state.filters)) {
      const input = this.container?.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-filter="${key}"]`);
      if (input && value) {
        input.value = value;
      }
    }
  }

  private bindEvents(): void {
    if (!this.container) return;

    // View mode toggles
    const timelineBtn = this.container.querySelector('.activity-view-timeline');
    const tableBtn = this.container.querySelector('.activity-view-table');

    timelineBtn?.addEventListener('click', () => this.setViewMode('timeline'));
    tableBtn?.addEventListener('click', () => this.setViewMode('table'));

    // Search input
    const searchInput = this.container.querySelector<HTMLInputElement>('[data-filter="search"]');
    searchInput?.addEventListener('input', (e) => {
      this.queryState.setSearch((e.target as HTMLInputElement).value);
    });

    // Filter selects
    const filterSelects = this.container.querySelectorAll<HTMLSelectElement>('select[data-filter]');
    filterSelects.forEach((select) => {
      select.addEventListener('change', () => {
        const filterKey = select.dataset.filter as keyof ActivityFilter;
        this.queryState.setFilter(filterKey, select.value || undefined);
      });
    });

    // Filter inputs (text and datetime)
    const filterInputs = this.container.querySelectorAll<HTMLInputElement>('input[data-filter]:not([type="text"])');
    filterInputs.forEach((input) => {
      input.addEventListener('change', () => {
        const filterKey = input.dataset.filter as keyof ActivityFilter;
        this.queryState.setFilter(filterKey, input.value || undefined);
      });
    });

    // Object type/id text inputs
    const objectTypeInput = this.container.querySelector<HTMLInputElement>('[data-filter="object_type"]');
    const objectIdInput = this.container.querySelector<HTMLInputElement>('[data-filter="object_id"]');
    objectTypeInput?.addEventListener('change', () => {
      this.queryState.setFilter('object_type', objectTypeInput.value || undefined);
    });
    objectIdInput?.addEventListener('change', () => {
      this.queryState.setFilter('object_id', objectIdInput.value || undefined);
    });

    // Reset button
    const resetBtn = this.container.querySelector('.activity-reset');
    resetBtn?.addEventListener('click', () => {
      this.queryState.reset();
      this.restoreFilterValues();
    });

    // Pagination buttons
    const prevBtn = this.container.querySelector('.activity-prev');
    const nextBtn = this.container.querySelector('.activity-next');

    prevBtn?.addEventListener('click', () => this.queryState.prevPage());
    nextBtn?.addEventListener('click', () => this.queryState.nextPage());
  }

  private renderEntries(): void {
    const timelineContainer = this.container?.querySelector('.activity-timeline');
    const tbody = this.container?.querySelector('.activity-tbody');
    const emptyState = this.container?.querySelector('.activity-empty');
    const timelineWrapper = this.container?.querySelector('.activity-timeline-container');
    const tableWrapper = this.container?.querySelector('.activity-table-container');

    if (this.state.entries.length === 0) {
      // Determine if this is "empty" (no data) or "no results" (filters applied)
      const hasFilters = this.queryState.getActiveFilterCount() > 0 || !!this.queryState.getState().search;

      if (hasFilters) {
        // Show no-results state
        emptyState?.classList.add('hidden');

        if (this.state.viewMode === 'timeline') {
          timelineWrapper?.classList.remove('hidden');
          tableWrapper?.classList.add('hidden');
          if (timelineContainer) {
            timelineContainer.innerHTML = renderNoResultsState({
              query: this.queryState.getState().search,
              filterCount: this.queryState.getActiveFilterCount(),
              containerClass: 'bg-white rounded-lg border border-gray-200',
            });
            this.bindNoResultsActions(timelineContainer);
          }
        } else {
          tableWrapper?.classList.remove('hidden');
          timelineWrapper?.classList.add('hidden');
          if (tbody) {
            tbody.innerHTML = renderTableNoResultsState(7, {
              query: this.queryState.getState().search,
              filterCount: this.queryState.getActiveFilterCount(),
            });
            this.bindNoResultsActions(tbody);
          }
        }
      } else {
        // Show empty state
        timelineWrapper?.classList.add('hidden');
        tableWrapper?.classList.add('hidden');
        emptyState?.classList.remove('hidden');
      }
      this.updateFilterSummary();
      return;
    }

    emptyState?.classList.add('hidden');

    if (this.state.viewMode === 'timeline') {
      timelineWrapper?.classList.remove('hidden');
      tableWrapper?.classList.add('hidden');
      if (timelineContainer) {
        timelineContainer.innerHTML = this.state.entries
          .map((entry) => this.renderTimelineEntry(entry))
          .join('');
        this.bindEntryActions();
      }
    } else {
      tableWrapper?.classList.remove('hidden');
      timelineWrapper?.classList.add('hidden');
      if (tbody) {
        tbody.innerHTML = this.state.entries.map((entry) => this.renderTableRow(entry)).join('');
        this.bindEntryActions();
      }
    }

    this.updateFilterSummary();
  }

  private bindNoResultsActions(container: Element): void {
    const resetBtn = container.querySelector('.ui-state-reset-btn');
    resetBtn?.addEventListener('click', () => {
      this.queryState.reset();
      this.restoreFilterValues();
    });
  }

  private renderTimelineEntry(entry: ServiceActivityEntry): string {
    const status = STATUS_CONFIG[entry.status] || STATUS_CONFIG.pending;
    const providerName = this.config.getProviderName
      ? this.config.getProviderName(entry.provider_id)
      : this.formatProviderId(entry.provider_id);
    const actionLabel = this.resolveActionLabel(entry.action);
    const time = this.formatTime(entry.created_at);
    const relativeTime = this.formatRelativeTime(entry.created_at);

    return `
      <div class="activity-entry flex gap-4 bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors cursor-pointer"
           data-entry-id="${this.escapeHtml(entry.id)}">
        <!-- Status indicator -->
        <div class="flex-shrink-0">
          <div class="w-10 h-10 rounded-full ${status.bg} flex items-center justify-center">
            ${renderIcon(status.icon, { size: '20px', extraClass: status.text })}
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-medium text-gray-900">
                ${this.escapeHtml(actionLabel)}
              </p>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-xs text-gray-500">${this.escapeHtml(providerName)}</span>
                ${entry.channel ? `
                  <span class="text-gray-300">&middot;</span>
                  <span class="text-xs text-gray-500">${this.escapeHtml(entry.channel)}</span>
                ` : ''}
                ${entry.object_type && entry.object_id ? `
                  <span class="text-gray-300">&middot;</span>
                  <a href="${this.buildObjectLinkUrl(entry.object_type, entry.object_id)}"
                     class="activity-object-link text-xs text-blue-600 hover:text-blue-700"
                     data-object-type="${this.escapeHtml(entry.object_type)}"
                     data-object-id="${this.escapeHtml(entry.object_id)}">
                    ${this.escapeHtml(entry.object_type)}:${this.escapeHtml(this.truncateId(entry.object_id))}
                  </a>
                ` : ''}
              </div>
            </div>
            <div class="text-right flex-shrink-0">
              <p class="text-xs text-gray-500" title="${this.escapeHtml(time)}">${relativeTime}</p>
              <div class="flex items-center gap-1 mt-1">
                <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs ${
                  entry.scope_type === 'user' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                }">
                  ${this.escapeHtml(entry.scope_type)}
                </span>
              </div>
            </div>
          </div>

          <!-- Metadata preview -->
          ${Object.keys(entry.metadata || {}).length > 0 ? `
            <div class="mt-2 pt-2 border-t border-gray-100">
              <div class="text-xs text-gray-500 font-mono truncate">
                ${this.escapeHtml(this.formatMetadataPreview(entry.metadata))}
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Status badge -->
        <div class="flex-shrink-0">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${status.bg} ${status.text}">
            ${status.label}
          </span>
        </div>
      </div>
    `;
  }

  private renderTableRow(entry: ServiceActivityEntry): string {
    const status = STATUS_CONFIG[entry.status] || STATUS_CONFIG.pending;
    const providerName = this.config.getProviderName
      ? this.config.getProviderName(entry.provider_id)
      : this.formatProviderId(entry.provider_id);
    const actionLabel = this.resolveActionLabel(entry.action);
    const time = this.formatTime(entry.created_at);
    const relativeTime = this.formatRelativeTime(entry.created_at);

    return `
      <tr class="activity-row hover:bg-gray-50 cursor-pointer" data-entry-id="${this.escapeHtml(entry.id)}">
        <td class="px-4 py-3 whitespace-nowrap">
          <span class="text-sm text-gray-900" title="${this.escapeHtml(time)}">${relativeTime}</span>
        </td>
        <td class="px-4 py-3">
          <span class="text-sm font-medium text-gray-900">${this.escapeHtml(providerName)}</span>
        </td>
        <td class="px-4 py-3">
          <span class="text-sm text-gray-700">${this.escapeHtml(actionLabel)}</span>
        </td>
        <td class="px-4 py-3">
          ${entry.object_type && entry.object_id ? `
            <a href="${this.buildObjectLinkUrl(entry.object_type, entry.object_id)}"
               class="activity-object-link text-sm text-blue-600 hover:text-blue-700"
               data-object-type="${this.escapeHtml(entry.object_type)}"
               data-object-id="${this.escapeHtml(entry.object_id)}">
              ${this.escapeHtml(entry.object_type)}:${this.escapeHtml(this.truncateId(entry.object_id))}
            </a>
          ` : '<span class="text-gray-400">—</span>'}
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            entry.scope_type === 'user' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
          }">
            ${this.escapeHtml(entry.scope_type)}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${status.bg} ${status.text}">
            ${renderIcon(status.icon, { size: '12px' })}
            ${status.label}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="text-sm text-gray-500">${this.escapeHtml(entry.channel || '—')}</span>
        </td>
      </tr>
    `;
  }

  private bindEntryActions(): void {
    // Entry clicks for selection
    const entries = this.container?.querySelectorAll<HTMLElement>('[data-entry-id]');
    entries?.forEach((el) => {
      const entryId = el.dataset.entryId;
      if (!entryId) return;

      el.addEventListener('click', (e) => {
        // Skip if clicking a link
        if ((e.target as HTMLElement).closest('a')) return;

        const entry = this.getEntry(entryId);
        if (entry && this.config.onSelect) {
          this.config.onSelect(entry);
        }
      });
    });

    // Object links
    const objectLinks = this.container?.querySelectorAll<HTMLAnchorElement>('.activity-object-link');
    objectLinks?.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const objectType = link.dataset.objectType;
        const objectId = link.dataset.objectId;

        if (!objectType || !objectId) return;

        // Use custom onNavigate if provided
        if (this.config.onNavigate) {
          this.config.onNavigate(objectType, objectId);
          return;
        }

        // Use deep links if enabled
        if (this.config.useDeepLinks) {
          const handler = this.createDeepLinkNavigateHandler();
          handler(objectType, objectId);
        }
      });
    });
  }

  /**
   * Create a navigate handler that uses deep links with context preservation.
   */
  private createDeepLinkNavigateHandler(): (objectType: string, objectId: string) => void {
    return createActivityNavigateHandler(
      () => {
        const state = this.queryState.getState();
        return {
          filters: state.filters as Record<string, string | undefined>,
          search: state.search,
          page: state.page,
        };
      },
      () => this.state.viewMode
    );
  }

  /**
   * Build object link URL for an activity entry.
   * Returns a deep link URL if deep links are enabled, otherwise '#'.
   */
  private buildObjectLinkUrl(objectType: string, objectId: string): string {
    if (!this.config.useDeepLinks) {
      return '#';
    }

    const entityType = mapObjectTypeToEntity(objectType);
    if (!entityType) {
      return '#';
    }

    // Build context for back navigation
    const state = this.queryState.getState();
    const context = {
      fromPage: window.location.pathname,
      filters: Object.fromEntries(
        Object.entries(state.filters).filter(([, v]) => v)
      ) as Record<string, string>,
      search: state.search || undefined,
      page: state.page > 1 ? state.page : undefined,
      viewMode: this.state.viewMode,
    };

    return generateDeepLink(entityType, objectId, context);
  }

  private updateViewModeUI(): void {
    const timelineBtn = this.container?.querySelector('.activity-view-timeline');
    const tableBtn = this.container?.querySelector('.activity-view-table');

    if (this.state.viewMode === 'timeline') {
      timelineBtn?.classList.add('bg-white', 'text-gray-900', 'shadow-sm');
      timelineBtn?.classList.remove('text-gray-600');
      tableBtn?.classList.remove('bg-white', 'text-gray-900', 'shadow-sm');
      tableBtn?.classList.add('text-gray-600');
    } else {
      tableBtn?.classList.add('bg-white', 'text-gray-900', 'shadow-sm');
      tableBtn?.classList.remove('text-gray-600');
      timelineBtn?.classList.remove('bg-white', 'text-gray-900', 'shadow-sm');
      timelineBtn?.classList.add('text-gray-600');
    }
  }

  private updateFilterSummary(): void {
    const summaryEl = this.container?.querySelector('.activity-filter-summary');
    if (!summaryEl) return;

    const filterCount = this.queryState.getActiveFilterCount();
    const state = this.queryState.getState();

    if (filterCount === 0 && !state.search) {
      summaryEl.textContent = `${this.state.total} entries`;
    } else {
      const parts: string[] = [];
      if (state.search) parts.push(`"${state.search}"`);
      if (filterCount > 0) parts.push(`${filterCount} filter${filterCount > 1 ? 's' : ''}`);
      summaryEl.textContent = `${this.state.total} entries matching ${parts.join(' and ')}`;
    }
  }

  private renderError(): void {
    const timelineContainer = this.container?.querySelector('.activity-timeline');
    const tbody = this.container?.querySelector('.activity-tbody');
    const timelineWrapper = this.container?.querySelector('.activity-timeline-container');
    const tableWrapper = this.container?.querySelector('.activity-table-container');
    const emptyState = this.container?.querySelector('.activity-empty');

    emptyState?.classList.add('hidden');

    if (this.state.viewMode === 'timeline') {
      timelineWrapper?.classList.remove('hidden');
      tableWrapper?.classList.add('hidden');
      if (timelineContainer) {
        timelineContainer.innerHTML = renderErrorState({
          title: 'Failed to load activity',
          error: this.state.error,
          containerClass: 'bg-white rounded-lg border border-gray-200',
          showRetry: true,
        });
        const retryBtn = timelineContainer.querySelector('.ui-state-retry-btn');
        retryBtn?.addEventListener('click', () => this.loadActivity());
      }
    } else {
      tableWrapper?.classList.remove('hidden');
      timelineWrapper?.classList.add('hidden');
      if (tbody) {
        tbody.innerHTML = renderTableErrorState(7, {
          title: 'Failed to load activity',
          error: this.state.error,
          showRetry: true,
        });
        const retryBtn = tbody.querySelector('.ui-state-retry-btn');
        retryBtn?.addEventListener('click', () => this.loadActivity());
      }
    }
  }

  private renderForbidden(): void {
    if (!this.container) return;

    this.container.innerHTML = renderForbiddenState({
      resource: 'activity',
    });
  }

  private updateLoadingState(): void {
    const timelineContainer = this.container?.querySelector('.activity-timeline');
    const tbody = this.container?.querySelector('.activity-tbody');
    const timelineWrapper = this.container?.querySelector('.activity-timeline-container');
    const tableWrapper = this.container?.querySelector('.activity-table-container');
    const emptyState = this.container?.querySelector('.activity-empty');

    if (!this.state.loading) return;

    // Only show loading when there's no data yet
    if (this.state.entries.length > 0) return;

    emptyState?.classList.add('hidden');

    if (this.state.viewMode === 'timeline') {
      timelineWrapper?.classList.remove('hidden');
      tableWrapper?.classList.add('hidden');
      if (timelineContainer) {
        timelineContainer.innerHTML = renderLoadingState({ text: 'Loading activity...' });
      }
    } else {
      tableWrapper?.classList.remove('hidden');
      timelineWrapper?.classList.add('hidden');
      if (tbody) {
        tbody.innerHTML = renderTableLoadingState(7, { text: 'Loading activity...' });
      }
    }
  }

  private updatePagination(): void {
    const state = this.queryState.getState();
    const { page, per_page } = state;
    const { total } = this.state;

    const start = total > 0 ? (page - 1) * per_page + 1 : 0;
    const end = Math.min(page * per_page, total);
    const hasNext = end < total;
    const hasPrev = page > 1;

    const infoEl = this.container?.querySelector('.activity-info');
    const prevBtn = this.container?.querySelector<HTMLButtonElement>('.activity-prev');
    const nextBtn = this.container?.querySelector<HTMLButtonElement>('.activity-next');

    if (infoEl) {
      infoEl.textContent = total > 0 ? `Showing ${start}-${end} of ${total}` : 'No activity';
    }

    if (prevBtn) {
      prevBtn.disabled = !hasPrev;
    }

    if (nextBtn) {
      nextBtn.disabled = !hasNext;
    }
  }

  // ---------------------------------------------------------------------------
  // View Mode Persistence
  // ---------------------------------------------------------------------------

  private restoreViewMode(): void {
    // Check URL first
    const params = new URLSearchParams(window.location.search);
    const urlMode = params.get('view');
    if (urlMode === 'timeline' || urlMode === 'table') {
      this.state.viewMode = urlMode;
      return;
    }

    // Check localStorage
    try {
      const stored = localStorage.getItem('services-activity-view');
      if (stored === 'timeline' || stored === 'table') {
        this.state.viewMode = stored;
      }
    } catch (e) {
      // Ignore
    }
  }

  private saveViewMode(): void {
    try {
      localStorage.setItem('services-activity-view', this.state.viewMode);
    } catch (e) {
      // Ignore
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private formatProviderId(id: string): string {
    return id
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private formatLabel(str: string): string {
    return str
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private truncateId(id: string, maxLen = 12): string {
    if (id.length <= maxLen) return id;
    return `${id.slice(0, maxLen - 3)}...`;
  }

  private formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleString();
  }

  private formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }

  private formatMetadataPreview(metadata: Record<string, unknown>): string {
    const entries = Object.entries(metadata).slice(0, 3);
    return entries.map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ');
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create and initialize an activity page
 */
export async function createActivityPage(config: ActivityPageConfig): Promise<ActivityPageManager> {
  const manager = new ActivityPageManager(config);
  await manager.init();
  return manager;
}
