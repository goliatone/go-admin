/**
 * Subscriptions and Sync Page
 * Displays subscription channels and sync job status with management actions
 */

import type {
  Connection,
  ConnectionSyncSummary,
  Provider,
  Subscription,
  SubscriptionStatus,
  SubscriptionsListFilter,
  SyncJob,
  SyncJobStatus,
  SyncJobMode,
} from '../types.js';
import { ServicesAPIError } from '../types.js';
import { getServicesClient, type ServicesAPIClient } from '../api-client.js';
import { QueryStateManager, type QueryState } from '../query-state.js';
import { getPermissionManager, canViewServices, canEdit } from '../permissions.js';
import {
  renderForbiddenState,
  renderTableLoadingState,
  renderTableErrorState,
  renderTableNoResultsState,
} from '../ui-states.js';
import {
  withMutationFeedback,
  confirmServiceAction,
  ActionQueue,
} from '../mutation-feedback.js';
import type { ToastNotifier } from '../../toast/types.js';
import { renderIcon } from '../../shared/icon-renderer.js';

// =============================================================================
// Types
// =============================================================================

export type SubscriptionsSyncTab = 'subscriptions' | 'sync';

export interface SubscriptionsSyncPageConfig {
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
  /** Initial tab (default: 'subscriptions') */
  activeTab?: SubscriptionsSyncTab;
  /** Callback when subscription is selected */
  onSubscriptionSelect?: (subscription: Subscription) => void;
  /** Callback when sync job is selected */
  onSyncJobSelect?: (job: SyncJob) => void;
  /** Custom provider name resolver */
  getProviderName?: (providerId: string) => string;
}

interface SubscriptionsSyncState {
  providers: Provider[];
  subscriptions: Subscription[];
  subscriptionsTotal: number;
  syncJobs: SyncJob[];
  syncJobsTotal: number;
  loading: boolean;
  error: Error | null;
  activeTab: SubscriptionsSyncTab;
}

type SubscriptionsFilter = {
  provider_id: string;
  connection_id: string;
  status: string;
};

// =============================================================================
// Status Configurations
// =============================================================================

const SUBSCRIPTION_STATUS_CONFIG: Record<
  SubscriptionStatus,
  { label: string; bg: string; text: string; icon: string }
> = {
  active: { label: 'Active', bg: 'bg-green-100', text: 'text-green-700', icon: 'iconoir:check-circle' },
  expired: { label: 'Expired', bg: 'bg-gray-100', text: 'text-gray-600', icon: 'iconoir:clock' },
  cancelled: { label: 'Cancelled', bg: 'bg-gray-100', text: 'text-gray-500', icon: 'iconoir:cancel' },
  errored: { label: 'Error', bg: 'bg-red-100', text: 'text-red-700', icon: 'iconoir:warning-circle' },
};

const SYNC_STATUS_CONFIG: Record<SyncJobStatus, { label: string; bg: string; text: string; icon: string }> = {
  queued: { label: 'Queued', bg: 'bg-gray-100', text: 'text-gray-600', icon: 'iconoir:clock' },
  running: { label: 'Running', bg: 'bg-blue-100', text: 'text-blue-700', icon: 'iconoir:play' },
  succeeded: { label: 'Succeeded', bg: 'bg-green-100', text: 'text-green-700', icon: 'iconoir:check-circle' },
  failed: { label: 'Failed', bg: 'bg-red-100', text: 'text-red-700', icon: 'iconoir:warning-circle' },
};

const SYNC_MODE_CONFIG: Record<SyncJobMode, { label: string; description: string }> = {
  bootstrap: { label: 'Bootstrap', description: 'Full initial sync' },
  incremental: { label: 'Incremental', description: 'Delta changes only' },
  backfill: { label: 'Backfill', description: 'Historical data recovery' },
};

// =============================================================================
// Subscriptions Sync Page Manager
// =============================================================================

export class SubscriptionsSyncPageManager {
  private config: SubscriptionsSyncPageConfig;
  private container: HTMLElement | null = null;
  private client: ServicesAPIClient;
  private queryState: QueryStateManager<SubscriptionsFilter>;
  private state: SubscriptionsSyncState = {
    providers: [],
    subscriptions: [],
    subscriptionsTotal: 0,
    syncJobs: [],
    syncJobsTotal: 0,
    loading: false,
    error: null,
    activeTab: 'subscriptions',
  };
  private abortController: AbortController | null = null;
  private actionQueue = new ActionQueue();

  constructor(config: SubscriptionsSyncPageConfig) {
    this.config = {
      perPage: 25,
      syncUrl: true,
      activeTab: 'subscriptions',
      ...config,
    };
    this.state.activeTab = this.config.activeTab || 'subscriptions';
    this.client = config.apiClient || getServicesClient();

    this.queryState = new QueryStateManager<SubscriptionsFilter>({
      config: {
        defaultPerPage: this.config.perPage,
        onChange: () => this.loadData(),
      },
      filterFields: ['provider_id', 'connection_id', 'status'],
      storageKey: 'services-subscriptions-sync',
    });
  }

  /**
   * Initialize the page
   */
  async init(): Promise<void> {
    // Resolve container
    this.container =
      typeof this.config.container === 'string'
        ? document.querySelector<HTMLElement>(this.config.container)
        : this.config.container;

    if (!this.container) {
      console.error('[SubscriptionsSyncPage] Container not found:', this.config.container);
      return;
    }

    // Check view permission
    if (!canViewServices()()) {
      this.renderForbidden();
      return;
    }

    // Restore tab from URL
    this.restoreTab();

    // Initialize query state from URL
    this.queryState.init();

    // Render initial structure
    this.renderStructure();
    await this.loadProviders();
    this.bindEvents();

    // Load data
    await this.loadData();
  }

  /**
   * Refresh the data
   */
  async refresh(): Promise<void> {
    await this.loadData();
  }

  /**
   * Set active tab
   */
  setTab(tab: SubscriptionsSyncTab): void {
    if (this.state.activeTab !== tab) {
      this.state.activeTab = tab;
      this.saveTab();
      this.updateTabUI();
      this.loadData();
    }
  }

  /**
   * Get active tab
   */
  getTab(): SubscriptionsSyncTab {
    return this.state.activeTab;
  }

  /**
   * Get subscriptions
   */
  getSubscriptions(): Subscription[] {
    return [...this.state.subscriptions];
  }

  /**
   * Get sync jobs
   */
  getSyncJobs(): SyncJob[] {
    return [...this.state.syncJobs];
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

  private async loadData(): Promise<void> {
    if (!this.container) return;

    // Cancel previous request
    this.abortController?.abort();
    this.abortController = new AbortController();

    this.state.loading = true;
    this.state.error = null;
    this.updateLoadingState();

    try {
      const params = this.queryState.getQueryParams();

      if (this.state.activeTab === 'subscriptions') {
        await this.loadSubscriptions(params);
      } else {
        await this.loadSyncJobs(params);
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;

      this.state.error = err instanceof Error ? err : new Error(String(err));
      this.renderError();

      if (this.config.notifier) {
        this.config.notifier.error(`Failed to load data: ${this.state.error.message}`);
      }
    } finally {
      this.state.loading = false;
      this.updateLoadingState();
    }
  }

  private async loadSubscriptions(params: Record<string, string | number>): Promise<void> {
    const filter: SubscriptionsListFilter = {
      provider_id: params.provider_id as string | undefined,
      connection_id: params.connection_id as string | undefined,
      status: params.status as SubscriptionStatus | undefined,
      q: params.q as string | undefined,
      page: params.page as number,
      per_page: params.per_page as number,
    };

    const response = await this.client.listSubscriptions(filter, this.abortController!.signal);

    this.state.subscriptions = response.subscriptions;
    this.state.subscriptionsTotal = response.total;
    this.queryState.updateFromResponse(response.total, response.has_next);

    this.renderSubscriptions();
    this.updatePagination();
  }

  private async loadSyncJobs(params: Record<string, string | number>): Promise<void> {
    const providerId = params.provider_id as string | undefined;
    const connectionId = params.connection_id as string | undefined;
    const statusFilter = params.status as SyncJobStatus | undefined;
    const search = String(params.q || '').trim().toLowerCase();
    const page = (params.page as number) || 1;
    const perPage = (params.per_page as number) || this.config.perPage || 25;

    const connections = await this.loadSyncConnections({
      providerId,
      connectionId,
      signal: this.abortController?.signal,
    });

    const summaries = await Promise.all(
      connections.map(async (connection) => {
        try {
          const response = await this.client.getSyncStatus(connection.id, this.abortController?.signal);
          return { connection, summary: response.sync_summary };
        } catch (err) {
          if ((err as Error).name === 'AbortError') {
            throw err;
          }
          return null;
        }
      })
    );

    const jobs = summaries
      .filter((item): item is { connection: Connection; summary: ConnectionSyncSummary } => item !== null)
      .map((item) => this.toSyncJob(item.connection, item.summary))
      .filter((job): job is SyncJob => job !== null);

    const filtered = jobs.filter((job) => {
      if (statusFilter && job.status !== statusFilter) {
        return false;
      }
      if (!search) {
        return true;
      }
      return this.matchesSyncSearch(job, search);
    });

    const total = filtered.length;
    const offset = (page - 1) * perPage;
    const paged = filtered.slice(offset, offset + perPage);

    this.state.syncJobs = paged;
    this.state.syncJobsTotal = total;

    this.renderSyncJobs();
    this.updatePagination();
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  private renderStructure(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="subscriptions-sync-page">
        <!-- Tabs -->
        <div class="tabs-header flex items-center gap-4 mb-4 border-b border-gray-200">
          <button type="button"
                  class="tab-subscriptions px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    this.state.activeTab === 'subscriptions'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }">
            ${renderIcon('iconoir:bell', { size: '16px' })}
            <span class="ml-1.5">Subscriptions</span>
          </button>
          <button type="button"
                  class="tab-sync px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    this.state.activeTab === 'sync'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }">
            ${renderIcon('iconoir:sync', { size: '16px' })}
            <span class="ml-1.5">Sync Jobs</span>
          </button>
        </div>

        <!-- Filters -->
        <div class="filters bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div class="flex flex-wrap items-center gap-3">
            <div class="flex-1 min-w-[200px]">
              <input type="text"
                     class="search-input w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                     placeholder="Search..."
                     data-filter="search">
            </div>

            <select class="filter-provider px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    data-filter="provider_id">
              <option value="">All Providers</option>
            </select>

            <select class="filter-status px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    data-filter="status">
              <option value="">All Statuses</option>
              ${this.state.activeTab === 'subscriptions' ? this.renderSubscriptionStatusOptions() : this.renderSyncStatusOptions()}
            </select>

            <button type="button"
                    class="reset-btn px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                    title="Reset filters">
              ${renderIcon('iconoir:refresh', { size: '16px' })}
            </button>
          </div>
        </div>

        <!-- Subscriptions Tab Content -->
        <div class="subscriptions-content ${this.state.activeTab === 'subscriptions' ? '' : 'hidden'}">
          <div class="overflow-x-auto bg-white rounded-lg border border-gray-200">
            <table class="subscriptions-table w-full text-sm">
              <thead class="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th class="px-4 py-3 text-left font-medium text-gray-600">Provider</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-600">Resource</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-600">Channel ID</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-600">Expires</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-600">Updated</th>
                  <th class="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody class="subscriptions-tbody divide-y divide-gray-100">
                <!-- Subscriptions will be rendered here -->
              </tbody>
            </table>
          </div>
        </div>

        <!-- Sync Tab Content -->
        <div class="sync-content ${this.state.activeTab === 'sync' ? '' : 'hidden'}">
          <div class="overflow-x-auto bg-white rounded-lg border border-gray-200">
            <table class="sync-table w-full text-sm">
              <thead class="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th class="px-4 py-3 text-left font-medium text-gray-600">Provider</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-600">Mode</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-600">Cursor</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-600">Last Run</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-600">Error</th>
                  <th class="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody class="sync-tbody divide-y divide-gray-100">
                <!-- Sync jobs will be rendered here -->
              </tbody>
            </table>
          </div>
        </div>

        <!-- Empty State -->
        <div class="empty-state hidden py-12 text-center bg-white rounded-lg border border-gray-200">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
            ${renderIcon('iconoir:bell-off', { size: '24px', extraClass: 'text-gray-400' })}
          </div>
          <h3 class="text-lg font-medium text-gray-900 empty-title">No subscriptions found</h3>
          <p class="text-sm text-gray-500 mt-1 empty-message">Subscriptions will appear here when created.</p>
        </div>

        <!-- Pagination -->
        <div class="pagination flex items-center justify-between mt-4">
          <div class="info text-sm text-gray-500">
            <!-- Info will be rendered here -->
          </div>
          <div class="flex items-center gap-2">
            <button type="button"
                    class="prev-btn px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled>
              Previous
            </button>
            <button type="button"
                    class="next-btn px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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

  private renderSubscriptionStatusOptions(): string {
    return Object.entries(SUBSCRIPTION_STATUS_CONFIG)
      .map(([value, config]) => `<option value="${value}">${config.label}</option>`)
      .join('');
  }

  private renderSyncStatusOptions(): string {
    return Object.entries(SYNC_STATUS_CONFIG)
      .map(([value, config]) => `<option value="${value}">${config.label}</option>`)
      .join('');
  }

  private async loadProviders(): Promise<void> {
    try {
      const response = await this.client.listProviders();
      this.state.providers = response.providers || [];
      this.populateProviderFilterOptions();
    } catch (err) {
      this.state.providers = [];
      this.config.notifier?.error(`Failed to load providers: ${(err as Error).message}`);
    }
  }

  private populateProviderFilterOptions(): void {
    const providerSelect = this.container?.querySelector<HTMLSelectElement>('[data-filter="provider_id"]');
    if (!providerSelect) return;

    const selectedProviderId = this.queryState.getState().filters.provider_id || '';
    const options = this.state.providers
      .map((provider) => {
        const displayName = this.config.getProviderName
          ? this.config.getProviderName(provider.id)
          : this.formatProviderId(provider.id);
        return `<option value="${this.escapeHtml(provider.id)}">${this.escapeHtml(displayName)}</option>`;
      })
      .join('');

    providerSelect.innerHTML = `<option value="">All Providers</option>${options}`;
    providerSelect.value = selectedProviderId;
  }

  private restoreFilterValues(): void {
    const state = this.queryState.getState();

    const searchInput = this.container?.querySelector<HTMLInputElement>('[data-filter="search"]');
    if (searchInput) {
      searchInput.value = state.search || '';
    }

    const filterInputs = this.container?.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-filter]');
    filterInputs?.forEach((input) => {
      const filterKey = input.dataset.filter as keyof SubscriptionsFilter | 'search';
      if (filterKey === 'search') {
        return;
      }
      input.value = state.filters[filterKey as keyof SubscriptionsFilter] || '';
    });
  }

  private bindEvents(): void {
    if (!this.container) return;

    // Tab buttons
    const subscriptionsTab = this.container.querySelector('.tab-subscriptions');
    const syncTab = this.container.querySelector('.tab-sync');

    subscriptionsTab?.addEventListener('click', () => this.setTab('subscriptions'));
    syncTab?.addEventListener('click', () => this.setTab('sync'));

    // Search input
    const searchInput = this.container.querySelector<HTMLInputElement>('[data-filter="search"]');
    searchInput?.addEventListener('input', (e) => {
      this.queryState.setSearch((e.target as HTMLInputElement).value);
    });

    // Filter selects
    const filterSelects = this.container.querySelectorAll<HTMLSelectElement>('select[data-filter]');
    filterSelects.forEach((select) => {
      select.addEventListener('change', () => {
        const filterKey = select.dataset.filter as keyof SubscriptionsFilter;
        this.queryState.setFilter(filterKey, select.value || undefined);
      });
    });

    // Reset button
    const resetBtn = this.container.querySelector('.reset-btn');
    resetBtn?.addEventListener('click', () => {
      this.queryState.reset();
      this.restoreFilterValues();
    });

    // Pagination buttons
    const prevBtn = this.container.querySelector('.prev-btn');
    const nextBtn = this.container.querySelector('.next-btn');

    prevBtn?.addEventListener('click', () => this.queryState.prevPage());
    nextBtn?.addEventListener('click', () => this.queryState.nextPage());
  }

  private renderSubscriptions(): void {
    const tbody = this.container?.querySelector('.subscriptions-tbody');
    const emptyState = this.container?.querySelector('.empty-state');
    const content = this.container?.querySelector('.subscriptions-content');

    if (!tbody) return;

    if (this.state.subscriptions.length === 0) {
      // Determine if this is "empty" (no data) or "no results" (filters applied)
      const hasFilters = this.queryState.getActiveFilterCount() > 0 || !!this.queryState.getState().search;

      if (hasFilters) {
        // Show no-results state in the table
        content?.classList.remove('hidden');
        emptyState?.classList.add('hidden');
        tbody.innerHTML = renderTableNoResultsState(7, {
          query: this.queryState.getState().search,
          filterCount: this.queryState.getActiveFilterCount(),
        });
        this.bindNoResultsActions(tbody);
      } else {
        // Show empty state
        tbody.innerHTML = '';
        content?.classList.add('hidden');
        emptyState?.classList.remove('hidden');
        this.updateEmptyState('subscriptions');
      }
      return;
    }

    content?.classList.remove('hidden');
    emptyState?.classList.add('hidden');

    tbody.innerHTML = this.state.subscriptions.map((sub) => this.renderSubscriptionRow(sub)).join('');
    this.bindSubscriptionActions();
  }

  private bindNoResultsActions(container: Element): void {
    const resetBtn = container.querySelector('.ui-state-reset-btn');
    resetBtn?.addEventListener('click', () => {
      this.queryState.reset();
      this.restoreFilterValues();
    });
  }

  private renderSubscriptionRow(subscription: Subscription): string {
    const status = SUBSCRIPTION_STATUS_CONFIG[subscription.status] || SUBSCRIPTION_STATUS_CONFIG.errored;
    const providerName = this.config.getProviderName
      ? this.config.getProviderName(subscription.provider_id)
      : this.formatProviderId(subscription.provider_id);

    const expiresAt = subscription.expires_at ? this.formatRelativeTime(subscription.expires_at) : '—';
    const expiresTitle = subscription.expires_at ? this.formatTime(subscription.expires_at) : '';
    const updatedAt = this.formatRelativeTime(subscription.updated_at);
    const isExpiringSoon = subscription.expires_at && this.isExpiringSoon(subscription.expires_at);

    return `
      <tr class="subscription-row hover:bg-gray-50 cursor-pointer" data-subscription-id="${this.escapeHtml(subscription.id)}">
        <td class="px-4 py-3">
          <span class="font-medium text-gray-900">${this.escapeHtml(providerName)}</span>
        </td>
        <td class="px-4 py-3">
          <div class="text-sm text-gray-700">${this.escapeHtml(subscription.resource_type)}</div>
          <div class="text-xs text-gray-500" title="${this.escapeHtml(subscription.resource_id)}">
            ${this.escapeHtml(this.truncateId(subscription.resource_id))}
          </div>
        </td>
        <td class="px-4 py-3">
          <code class="text-xs bg-gray-100 px-1.5 py-0.5 rounded">${this.escapeHtml(this.truncateId(subscription.channel_id, 16))}</code>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${status.bg} ${status.text}">
            ${renderIcon(status.icon, { size: '12px' })}
            ${status.label}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="${isExpiringSoon ? 'text-amber-600 font-medium' : 'text-gray-500'}" title="${expiresTitle}">
            ${expiresAt}
          </span>
          ${isExpiringSoon ? renderIcon('iconoir:warning-triangle', { size: '12px', extraClass: 'inline ml-1 text-amber-500' }) : ''}
        </td>
        <td class="px-4 py-3 text-gray-500 text-xs">
          ${updatedAt}
        </td>
        <td class="px-4 py-3 text-right">
          ${this.buildSubscriptionActions(subscription)}
        </td>
      </tr>
    `;
  }

  private buildSubscriptionActions(subscription: Subscription): string {
    const actions: string[] = [];

    if (subscription.status === 'active' && canEdit()()) {
      actions.push(`
        <button type="button"
                class="action-renew p-1 text-gray-400 hover:text-blue-600"
                data-action="renew"
                title="Renew subscription">
          ${renderIcon('iconoir:refresh', { size: '16px' })}
        </button>
      `);
    }

    if (subscription.status !== 'cancelled' && canEdit()()) {
      actions.push(`
        <button type="button"
                class="action-cancel p-1 text-gray-400 hover:text-red-600"
                data-action="cancel"
                title="Cancel subscription">
          ${renderIcon('iconoir:cancel', { size: '16px' })}
        </button>
      `);
    }

    if (actions.length === 0) {
      return '<span class="text-gray-300 text-xs">—</span>';
    }

    return `<div class="flex items-center justify-end gap-1">${actions.join('')}</div>`;
  }

  private bindSubscriptionActions(): void {
    const rows = this.container?.querySelectorAll<HTMLTableRowElement>('.subscription-row');

    rows?.forEach((row) => {
      const subscriptionId = row.dataset.subscriptionId;
      if (!subscriptionId) return;

      // Row click for selection
      row.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('button')) return;

        const subscription = this.state.subscriptions.find((s) => s.id === subscriptionId);
        if (subscription && this.config.onSubscriptionSelect) {
          this.config.onSubscriptionSelect(subscription);
        }
      });

      // Action buttons
      row.querySelectorAll<HTMLButtonElement>('button[data-action]').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const action = btn.dataset.action;

          switch (action) {
            case 'renew':
              await this.handleRenew(subscriptionId, btn);
              break;
            case 'cancel':
              await this.handleCancel(subscriptionId, btn);
              break;
          }
        });
      });
    });
  }

  private renderSyncJobs(): void {
    const tbody = this.container?.querySelector('.sync-tbody');
    const emptyState = this.container?.querySelector('.empty-state');
    const content = this.container?.querySelector('.sync-content');

    if (!tbody) return;

    if (this.state.syncJobs.length === 0) {
      // Determine if this is "empty" (no data) or "no results" (filters applied)
      const hasFilters = this.queryState.getActiveFilterCount() > 0 || !!this.queryState.getState().search;

      if (hasFilters) {
        // Show no-results state in the table
        content?.classList.remove('hidden');
        emptyState?.classList.add('hidden');
        tbody.innerHTML = renderTableNoResultsState(7, {
          query: this.queryState.getState().search,
          filterCount: this.queryState.getActiveFilterCount(),
        });
        this.bindNoResultsActions(tbody);
      } else {
        // Show empty state
        tbody.innerHTML = '';
        content?.classList.add('hidden');
        emptyState?.classList.remove('hidden');
        this.updateEmptyState('sync');
      }
      return;
    }

    content?.classList.remove('hidden');
    emptyState?.classList.add('hidden');

    tbody.innerHTML = this.state.syncJobs.map((job) => this.renderSyncJobRow(job)).join('');
    this.bindSyncJobActions();
  }

  private renderSyncJobRow(job: SyncJob): string {
    const status = SYNC_STATUS_CONFIG[job.status] || SYNC_STATUS_CONFIG.failed;
    const mode = SYNC_MODE_CONFIG[job.mode] || SYNC_MODE_CONFIG.incremental;
    const providerName = this.config.getProviderName
      ? this.config.getProviderName(job.provider_id)
      : this.formatProviderId(job.provider_id);

    const metadata = job.metadata as Record<string, unknown>;
    const lastRunRaw = typeof metadata.last_synced_at === 'string' ? metadata.last_synced_at : '';
    const lastRun = lastRunRaw ? this.formatRelativeTime(lastRunRaw) : this.formatRelativeTime(job.updated_at);
    const errorText = typeof metadata.last_sync_error === 'string' ? metadata.last_sync_error : '';
    const cursor = job.checkpoint || '';

    return `
      <tr class="sync-row hover:bg-gray-50 cursor-pointer" data-job-id="${this.escapeHtml(job.id)}">
        <td class="px-4 py-3">
          <span class="font-medium text-gray-900">${this.escapeHtml(providerName)}</span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700" title="${mode.description}">
            ${mode.label}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${status.bg} ${status.text}">
            ${renderIcon(status.icon, { size: '12px' })}
            ${status.label}
          </span>
        </td>
        <td class="px-4 py-3">
          ${cursor ? `
            <code class="text-xs bg-gray-100 px-1.5 py-0.5 rounded" title="${this.escapeHtml(cursor)}">
              ${this.escapeHtml(this.truncateId(cursor, 16))}
            </code>
          ` : '<span class="text-gray-400">—</span>'}
        </td>
        <td class="px-4 py-3 text-gray-500 text-sm">
          ${lastRun}
        </td>
        <td class="px-4 py-3 text-xs">
          ${errorText
            ? `<span class="text-red-600" title="${this.escapeHtml(errorText)}">${this.escapeHtml(this.truncateId(errorText, 48))}</span>`
            : '<span class="text-gray-400">—</span>'}
        </td>
        <td class="px-4 py-3 text-right">
          ${this.buildSyncJobActions(job)}
        </td>
      </tr>
    `;
  }

  private buildSyncJobActions(job: SyncJob): string {
    const actions: string[] = [];

    if (job.status !== 'running' && canEdit()()) {
      actions.push(`
        <button type="button"
                class="action-run p-1 text-gray-400 hover:text-green-600"
                data-action="run"
                title="Run sync now">
          ${renderIcon('iconoir:play', { size: '16px' })}
        </button>
      `);
    }

    if (actions.length === 0) {
      return '<span class="text-gray-300 text-xs">—</span>';
    }

    return `<div class="flex items-center justify-end gap-1">${actions.join('')}</div>`;
  }

  private bindSyncJobActions(): void {
    const rows = this.container?.querySelectorAll<HTMLTableRowElement>('.sync-row');

    rows?.forEach((row) => {
      const jobId = row.dataset.jobId;
      if (!jobId) return;

      // Row click for selection
      row.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('button')) return;

        const job = this.state.syncJobs.find((j) => j.id === jobId);
        if (job && this.config.onSyncJobSelect) {
          this.config.onSyncJobSelect(job);
        }
      });

      // Action buttons
      row.querySelectorAll<HTMLButtonElement>('button[data-action]').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const action = btn.dataset.action;

          if (action === 'run') {
            await this.handleRunSync(jobId, btn);
          }
        });
      });
    });
  }

  private async handleRenew(subscriptionId: string, button?: HTMLButtonElement): Promise<void> {
    // Prevent duplicate submissions
    if (this.actionQueue.isInFlight(`renew-${subscriptionId}`)) return;

    await this.actionQueue.execute(`renew-${subscriptionId}`, async () => {
      await withMutationFeedback({
        mutation: () => this.client.renewSubscription(subscriptionId),
        notifier: this.config.notifier,
        successMessage: 'Subscription renewal initiated',
        errorMessagePrefix: 'Failed to renew',
        buttonConfig: button ? {
          button,
          loadingText: 'Renewing...',
          successText: 'Renewed',
          errorText: 'Failed',
        } : undefined,
        onSuccess: () => this.loadData(),
      });
    });
  }

  private async handleCancel(subscriptionId: string, button?: HTMLButtonElement): Promise<void> {
    // Show confirmation dialog
    const confirmed = await confirmServiceAction({
      action: 'cancel',
      resourceType: 'subscription',
    });
    if (!confirmed) return;

    // Prevent duplicate submissions
    if (this.actionQueue.isInFlight(`cancel-${subscriptionId}`)) return;

    await this.actionQueue.execute(`cancel-${subscriptionId}`, async () => {
      await withMutationFeedback({
        mutation: () => this.client.cancelSubscription(subscriptionId),
        notifier: this.config.notifier,
        successMessage: 'Subscription cancelled',
        errorMessagePrefix: 'Failed to cancel',
        buttonConfig: button ? {
          button,
          loadingText: 'Cancelling...',
          successText: 'Cancelled',
          errorText: 'Failed',
        } : undefined,
        onSuccess: () => this.loadData(),
      });
    });
  }

  private async handleRunSync(jobId: string, button?: HTMLButtonElement): Promise<void> {
    const job = this.state.syncJobs.find((j) => j.id === jobId);
    if (!job) return;

    const metadata = job.metadata as Record<string, unknown>;
    const resourceType = typeof metadata.run_resource_type === 'string' && metadata.run_resource_type
      ? metadata.run_resource_type
      : 'default';
    const resourceId = typeof metadata.run_resource_id === 'string' && metadata.run_resource_id
      ? metadata.run_resource_id
      : 'default';

    // Prevent duplicate submissions
    if (this.actionQueue.isInFlight(`sync-${jobId}`)) return;

    await this.actionQueue.execute(`sync-${jobId}`, async () => {
      await withMutationFeedback({
        mutation: () => this.client.runSync(job.connection_id, {
          provider_id: job.provider_id,
          resource_type: resourceType,
          resource_id: resourceId,
        }),
        notifier: this.config.notifier,
        successMessage: 'Sync job started',
        errorMessagePrefix: 'Failed to start sync',
        buttonConfig: button ? {
          button,
          loadingText: 'Starting...',
          successText: 'Started',
          errorText: 'Failed',
        } : undefined,
        onSuccess: () => this.loadData(),
      });
    });
  }

  private updateTabUI(): void {
    const subscriptionsTab = this.container?.querySelector('.tab-subscriptions');
    const syncTab = this.container?.querySelector('.tab-sync');
    const subscriptionsContent = this.container?.querySelector('.subscriptions-content');
    const syncContent = this.container?.querySelector('.sync-content');
    const statusFilter = this.container?.querySelector<HTMLSelectElement>('[data-filter="status"]');

    if (this.state.activeTab === 'subscriptions') {
      subscriptionsTab?.classList.add('border-blue-500', 'text-blue-600');
      subscriptionsTab?.classList.remove('border-transparent', 'text-gray-500');
      syncTab?.classList.remove('border-blue-500', 'text-blue-600');
      syncTab?.classList.add('border-transparent', 'text-gray-500');
      subscriptionsContent?.classList.remove('hidden');
      syncContent?.classList.add('hidden');
      if (statusFilter) {
        statusFilter.innerHTML = `<option value="">All Statuses</option>${this.renderSubscriptionStatusOptions()}`;
        statusFilter.value = this.queryState.getState().filters.status || '';
      }
    } else {
      syncTab?.classList.add('border-blue-500', 'text-blue-600');
      syncTab?.classList.remove('border-transparent', 'text-gray-500');
      subscriptionsTab?.classList.remove('border-blue-500', 'text-blue-600');
      subscriptionsTab?.classList.add('border-transparent', 'text-gray-500');
      syncContent?.classList.remove('hidden');
      subscriptionsContent?.classList.add('hidden');
      if (statusFilter) {
        statusFilter.innerHTML = `<option value="">All Statuses</option>${this.renderSyncStatusOptions()}`;
        statusFilter.value = this.queryState.getState().filters.status || '';
      }
    }

    this.restoreFilterValues();
  }

  private updateEmptyState(type: 'subscriptions' | 'sync'): void {
    const title = this.container?.querySelector('.empty-title');
    const message = this.container?.querySelector('.empty-message');

    if (type === 'subscriptions') {
      if (title) title.textContent = 'No subscriptions found';
      if (message) message.textContent = 'Subscriptions will appear here when created.';
    } else {
      if (title) title.textContent = 'No sync jobs found';
      if (message) message.textContent = 'Sync jobs will appear here when syncs are triggered.';
    }
  }

  private renderError(): void {
    const activeContent = this.state.activeTab === 'subscriptions' ? '.subscriptions-content' : '.sync-content';
    const content = this.container?.querySelector(activeContent);
    const emptyState = this.container?.querySelector('.empty-state');
    const tbody =
      this.state.activeTab === 'subscriptions'
        ? this.container?.querySelector('.subscriptions-tbody')
        : this.container?.querySelector('.sync-tbody');

    if (!tbody) return;

    const colspan = 7;
    tbody.innerHTML = renderTableErrorState(colspan, {
      title: `Failed to load ${this.state.activeTab === 'subscriptions' ? 'subscriptions' : 'sync jobs'}`,
      error: this.state.error,
      showRetry: true,
    });

    content?.classList.remove('hidden');
    emptyState?.classList.add('hidden');

    const retryBtn = tbody.querySelector('.ui-state-retry-btn');
    retryBtn?.addEventListener('click', () => this.loadData());
  }

  private renderForbidden(): void {
    if (!this.container) return;

    this.container.innerHTML = renderForbiddenState({
      resource: 'subscriptions and sync',
    });
  }

  private updateLoadingState(): void {
    const content =
      this.state.activeTab === 'subscriptions'
        ? this.container?.querySelector('.subscriptions-content')
        : this.container?.querySelector('.sync-content');
    const tbody =
      this.state.activeTab === 'subscriptions'
        ? this.container?.querySelector('.subscriptions-tbody')
        : this.container?.querySelector('.sync-tbody');
    const emptyState = this.container?.querySelector('.empty-state');

    if (!this.state.loading || !tbody) return;

    const items = this.state.activeTab === 'subscriptions' ? this.state.subscriptions : this.state.syncJobs;

    if (items.length === 0) {
      const colspan = 7;
      const text = this.state.activeTab === 'subscriptions' ? 'Loading subscriptions...' : 'Loading sync jobs...';
      content?.classList.remove('hidden');
      emptyState?.classList.add('hidden');
      tbody.innerHTML = renderTableLoadingState(colspan, { text });
    }
  }

  private async loadSyncConnections(options: {
    providerId?: string;
    connectionId?: string;
    signal?: AbortSignal;
  }): Promise<Connection[]> {
    const { providerId, connectionId, signal } = options;

    if (connectionId) {
      try {
        const detail = await this.client.getConnectionDetail(connectionId, signal);
        if (providerId && detail.connection.provider_id !== providerId) {
          return [];
        }
        return [detail.connection];
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          throw err;
        }
        if (err instanceof ServicesAPIError && err.isNotFound) {
          return [];
        }
        throw err;
      }
    }

    const response = await this.client.listConnections({
      provider_id: providerId,
      page: 1,
      per_page: 200,
    }, signal);
    return response.connections;
  }

  private toSyncJob(connection: Connection, summary: ConnectionSyncSummary): SyncJob | null {
    const firstCursor = summary.cursors[0];
    const runResourceType = firstCursor?.resource_type || 'default';
    const runResourceId = firstCursor?.resource_id || 'default';
    const baseMetadata: Record<string, unknown> = {
      ...(summary.last_job?.metadata || {}),
      last_synced_at: summary.last_synced_at || null,
      last_sync_error: summary.last_sync_error || '',
      run_resource_type: runResourceType,
      run_resource_id: runResourceId,
    };

    if (summary.last_job) {
      return {
        ...summary.last_job,
        checkpoint: summary.last_cursor || summary.last_job.checkpoint,
        metadata: baseMetadata,
      };
    }

    if (!summary.last_cursor && !summary.last_synced_at && !summary.last_sync_error) {
      return null;
    }

    return {
      id: `synthetic-sync-${connection.id}`,
      connection_id: connection.id,
      provider_id: connection.provider_id,
      mode: 'incremental',
      checkpoint: summary.last_cursor || '',
      status: summary.last_sync_error ? 'failed' : 'succeeded',
      attempts: 0,
      metadata: baseMetadata,
      created_at: connection.created_at,
      updated_at: summary.last_synced_at || connection.updated_at,
    };
  }

  private matchesSyncSearch(job: SyncJob, query: string): boolean {
    const metadata = job.metadata as Record<string, unknown>;
    const haystack = [
      job.id,
      job.connection_id,
      job.provider_id,
      job.mode,
      job.status,
      job.checkpoint || '',
      typeof metadata.last_sync_error === 'string' ? metadata.last_sync_error : '',
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  }

  private updatePagination(): void {
    const state = this.queryState.getState();
    const { page, per_page } = state;
    const total = this.state.activeTab === 'subscriptions' ? this.state.subscriptionsTotal : this.state.syncJobsTotal;

    const start = total > 0 ? (page - 1) * per_page + 1 : 0;
    const end = Math.min(page * per_page, total);
    const hasNext = end < total;
    const hasPrev = page > 1;

    const infoEl = this.container?.querySelector('.info');
    const prevBtn = this.container?.querySelector<HTMLButtonElement>('.prev-btn');
    const nextBtn = this.container?.querySelector<HTMLButtonElement>('.next-btn');

    const itemType = this.state.activeTab === 'subscriptions' ? 'subscriptions' : 'sync jobs';

    if (infoEl) {
      infoEl.textContent = total > 0 ? `Showing ${start}-${end} of ${total} ${itemType}` : `No ${itemType}`;
    }

    if (prevBtn) {
      prevBtn.disabled = !hasPrev;
    }

    if (nextBtn) {
      nextBtn.disabled = !hasNext;
    }
  }

  // ---------------------------------------------------------------------------
  // Tab Persistence
  // ---------------------------------------------------------------------------

  private restoreTab(): void {
    const params = new URLSearchParams(window.location.search);
    const urlTab = params.get('tab');
    if (urlTab === 'subscriptions' || urlTab === 'sync') {
      this.state.activeTab = urlTab;
    }
  }

  private saveTab(): void {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', this.state.activeTab);
    const newURL = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newURL);
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
    const diffMs = date.getTime() - now.getTime();
    const isFuture = diffMs > 0;
    const absDiffMs = Math.abs(diffMs);

    const diffMins = Math.floor(absDiffMs / 60000);
    const diffHours = Math.floor(absDiffMs / 3600000);
    const diffDays = Math.floor(absDiffMs / 86400000);

    if (diffMins < 1) return isFuture ? 'Soon' : 'Just now';
    if (diffMins < 60) return isFuture ? `in ${diffMins}m` : `${diffMins}m ago`;
    if (diffHours < 24) return isFuture ? `in ${diffHours}h` : `${diffHours}h ago`;
    if (diffDays < 7) return isFuture ? `in ${diffDays}d` : `${diffDays}d ago`;

    return date.toLocaleDateString();
  }

  private isExpiringSoon(dateStr: string): boolean {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return false;

    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    // Expires within 24 hours
    return diffMs > 0 && diffMs < 86400000;
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
 * Create and initialize a subscriptions/sync page
 */
export async function createSubscriptionsSyncPage(
  config: SubscriptionsSyncPageConfig
): Promise<SubscriptionsSyncPageManager> {
  const manager = new SubscriptionsSyncPageManager(config);
  await manager.init();
  return manager;
}
