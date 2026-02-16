/**
 * Connections List Page
 * Displays service connections with filters, pagination, and management actions
 */

import type {
  Connection,
  ConnectionStatus,
  ConnectionsListFilter,
  Provider,
  ScopeType,
} from '../types.js';
import { getServicesClient, type ServicesAPIClient } from '../api-client.js';
import { QueryStateManager, type QueryState } from '../query-state.js';
import {
  getPermissionManager,
  canViewServices,
  canConnect,
  canEdit,
  canRevoke,
  canReconsent,
} from '../permissions.js';
import {
  renderForbiddenState,
  renderTableLoadingState,
  renderTableErrorState,
  renderTableEmptyState,
  renderTableNoResultsState,
} from '../ui-states.js';
import {
  withMutationFeedback,
  confirmServiceAction,
  ActionQueue,
  MutationButtonManager,
} from '../mutation-feedback.js';
import type { ToastNotifier } from '../../toast/types.js';
import { renderIcon } from '../../shared/icon-renderer.js';

// =============================================================================
// Types
// =============================================================================

export interface ConnectionsListConfig {
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
  /** Callback when connection is selected */
  onSelect?: (connection: Connection) => void;
  /** Callback when connect action is triggered */
  onConnect?: (providerId: string, scopeType: ScopeType) => void;
  /** Custom provider name resolver */
  getProviderName?: (providerId: string) => string;
}

interface ConnectionsListState {
  connections: Connection[];
  providers: Provider[];
  total: number;
  loading: boolean;
  error: Error | null;
}

type ConnectionsFilter = {
  provider_id: string;
  scope_type: string;
  scope_id: string;
  status: string;
};

// =============================================================================
// Status Configuration
// =============================================================================

const STATUS_CONFIG: Record<ConnectionStatus, { label: string; bg: string; text: string; icon: string }> = {
  active: { label: 'Active', bg: 'bg-green-100', text: 'text-green-700', icon: 'iconoir:check-circle' },
  disconnected: { label: 'Disconnected', bg: 'bg-gray-100', text: 'text-gray-600', icon: 'iconoir:cancel' },
  errored: { label: 'Error', bg: 'bg-red-100', text: 'text-red-700', icon: 'iconoir:warning-circle' },
  pending_reauth: { label: 'Pending Reauth', bg: 'bg-amber-100', text: 'text-amber-700', icon: 'iconoir:clock' },
  needs_reconsent: { label: 'Needs Reconsent', bg: 'bg-orange-100', text: 'text-orange-700', icon: 'iconoir:refresh' },
};

// =============================================================================
// Connections List Manager
// =============================================================================

export class ConnectionsListManager {
  private config: ConnectionsListConfig;
  private container: HTMLElement | null = null;
  private client: ServicesAPIClient;
  private queryState: QueryStateManager<ConnectionsFilter>;
  private state: ConnectionsListState = {
    connections: [],
    providers: [],
    total: 0,
    loading: false,
    error: null,
  };
  private abortController: AbortController | null = null;
  private actionQueue = new ActionQueue();

  constructor(config: ConnectionsListConfig) {
    this.config = {
      perPage: 25,
      syncUrl: true,
      ...config,
    };
    this.client = config.apiClient || getServicesClient();

    this.queryState = new QueryStateManager<ConnectionsFilter>({
      config: {
        defaultPerPage: this.config.perPage,
        onChange: () => this.loadConnections(),
      },
      filterFields: ['provider_id', 'scope_type', 'scope_id', 'status'],
      storageKey: 'services-connections-list',
    });
  }

  /**
   * Initialize the connections list
   */
  async init(): Promise<void> {
    // Resolve container
    this.container =
      typeof this.config.container === 'string'
        ? document.querySelector<HTMLElement>(this.config.container)
        : this.config.container;

    if (!this.container) {
      console.error('[ConnectionsList] Container not found:', this.config.container);
      return;
    }

    // Check view permission
    if (!canViewServices()()) {
      this.renderForbidden();
      return;
    }

    // Initialize query state from URL
    this.queryState.init();

    // Render initial structure
    this.renderStructure();
    await this.loadProviders();
    this.bindEvents();

    // Load connections
    await this.loadConnections();
  }

  /**
   * Refresh the connections list
   */
  async refresh(): Promise<void> {
    await this.loadConnections();
  }

  /**
   * Get the current connections
   */
  getConnections(): Connection[] {
    return [...this.state.connections];
  }

  /**
   * Get a connection by ID
   */
  getConnection(id: string): Connection | undefined {
    return this.state.connections.find((c) => c.id === id);
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

  private async loadConnections(): Promise<void> {
    if (!this.container) return;

    // Cancel previous request
    this.abortController?.abort();
    this.abortController = new AbortController();

    this.state.loading = true;
    this.state.error = null;
    this.updateLoadingState();

    try {
      const params = this.queryState.getQueryParams();
      const filter: ConnectionsListFilter = {
        provider_id: params.provider_id as string | undefined,
        scope_type: params.scope_type as ScopeType | undefined,
        scope_id: params.scope_id as string | undefined,
        status: params.status as ConnectionStatus | undefined,
        q: params.q as string | undefined,
        page: params.page as number,
        per_page: params.per_page as number,
      };

      const response = await this.client.listConnections(filter, this.abortController.signal);

      this.state.connections = response.connections;
      this.state.total = response.total;
      this.queryState.updateFromResponse(response.total, response.has_next);

      this.renderConnections();
      this.updatePagination();
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;

      this.state.error = err instanceof Error ? err : new Error(String(err));
      this.renderError();

      if (this.config.notifier) {
        this.config.notifier.error(`Failed to load connections: ${this.state.error.message}`);
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
      <div class="connections-list">
        <!-- Filters -->
        <div class="connections-filters flex flex-wrap items-center gap-3 mb-4">
          <div class="flex-1 min-w-[200px]">
            <input type="text"
                   class="connections-search w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   placeholder="Search connections..."
                   data-filter="search">
          </div>

          <select class="connections-filter-provider px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  data-filter="provider_id">
            <option value="">All Providers</option>
          </select>

          <select class="connections-filter-scope px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  data-filter="scope_type">
            <option value="">All Scopes</option>
            <option value="user">User</option>
            <option value="org">Organization</option>
          </select>

          <select class="connections-filter-status px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  data-filter="status">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="disconnected">Disconnected</option>
            <option value="errored">Error</option>
            <option value="pending_reauth">Pending Reauth</option>
            <option value="needs_reconsent">Needs Reconsent</option>
          </select>

          <button type="button"
                  class="connections-reset px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                  title="Reset filters">
            ${renderIcon('iconoir:refresh', { size: '16px' })}
          </button>
          ${canConnect()() && this.config.onConnect ? `
            <button type="button"
                    class="connections-connect-user px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              Connect User
            </button>
            <button type="button"
                    class="connections-connect-org px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Connect Org
            </button>
          ` : ''}
        </div>

        <!-- Table -->
        <div class="connections-table-wrapper overflow-x-auto bg-white rounded-lg border border-gray-200">
          <table class="connections-table w-full text-sm">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="px-4 py-3 text-left font-medium text-gray-600">Provider</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">Scope</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">External Account</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">Updated</th>
                <th class="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody class="connections-tbody divide-y divide-gray-100">
              <!-- Connections will be rendered here -->
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div class="connections-empty hidden py-12 text-center">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
            ${renderIcon('iconoir:link', { size: '24px', extraClass: 'text-gray-400' })}
          </div>
          <h3 class="text-lg font-medium text-gray-900">No connections found</h3>
          <p class="text-sm text-gray-500 mt-1">Connect a service to get started.</p>
        </div>

        <!-- Pagination -->
        <div class="connections-pagination flex items-center justify-between mt-4">
          <div class="connections-info text-sm text-gray-500">
            <!-- Info will be rendered here -->
          </div>
          <div class="flex items-center gap-2">
            <button type="button"
                    class="connections-prev px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled>
              Previous
            </button>
            <button type="button"
                    class="connections-next px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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

  private restoreFilterValues(): void {
    const state = this.queryState.getState();

    const searchInput = this.container?.querySelector<HTMLInputElement>('[data-filter="search"]');
    if (searchInput) {
      searchInput.value = state.search || '';
    }

    const filterSelects = this.container?.querySelectorAll<HTMLSelectElement>('select[data-filter]');
    filterSelects?.forEach((select) => {
      const filterKey = select.dataset.filter as keyof ConnectionsFilter;
      select.value = state.filters[filterKey] || '';
    });
  }

  private bindEvents(): void {
    if (!this.container) return;

    // Search input
    const searchInput = this.container.querySelector<HTMLInputElement>('[data-filter="search"]');
    searchInput?.addEventListener('input', (e) => {
      this.queryState.setSearch((e.target as HTMLInputElement).value);
    });

    // Filter selects
    const filterSelects = this.container.querySelectorAll<HTMLSelectElement>('select[data-filter]');
    filterSelects.forEach((select) => {
      select.addEventListener('change', () => {
        const filterKey = select.dataset.filter as keyof ConnectionsFilter;
        this.queryState.setFilter(filterKey, select.value || undefined);
      });
    });

    // Reset button
    const resetBtn = this.container.querySelector('.connections-reset');
    resetBtn?.addEventListener('click', () => {
      this.queryState.reset();
      this.restoreFilterValues();
    });

    const connectUserBtn = this.container.querySelector<HTMLButtonElement>('.connections-connect-user');
    const connectOrgBtn = this.container.querySelector<HTMLButtonElement>('.connections-connect-org');
    connectUserBtn?.addEventListener('click', () => this.handleConnect('user'));
    connectOrgBtn?.addEventListener('click', () => this.handleConnect('org'));

    // Pagination buttons
    const prevBtn = this.container.querySelector('.connections-prev');
    const nextBtn = this.container.querySelector('.connections-next');

    prevBtn?.addEventListener('click', () => this.queryState.prevPage());
    nextBtn?.addEventListener('click', () => this.queryState.nextPage());
  }

  private renderConnections(): void {
    const tbody = this.container?.querySelector('.connections-tbody');
    const emptyState = this.container?.querySelector('.connections-empty');
    const tableWrapper = this.container?.querySelector('.connections-table-wrapper');

    if (!tbody) return;

    if (this.state.connections.length === 0) {
      // Determine if this is "empty" (no data) or "no results" (filters applied)
      const hasFilters = this.queryState.getActiveFilterCount() > 0 || !!this.queryState.getState().search;

      if (hasFilters) {
        // Show no-results state in the table
        tableWrapper?.classList.remove('hidden');
        emptyState?.classList.add('hidden');
        tbody.innerHTML = renderTableNoResultsState(6, {
          query: this.queryState.getState().search,
          filterCount: this.queryState.getActiveFilterCount(),
          onReset: () => {
            this.queryState.reset();
            this.restoreFilterValues();
          },
        });
        this.bindNoResultsActions(tbody);
      } else {
        // Show empty state
        tbody.innerHTML = '';
        tableWrapper?.classList.add('hidden');
        emptyState?.classList.remove('hidden');
      }
      return;
    }

    tableWrapper?.classList.remove('hidden');
    emptyState?.classList.add('hidden');

    tbody.innerHTML = this.state.connections.map((conn) => this.renderConnectionRow(conn)).join('');

    // Bind row actions
    this.bindRowActions();
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

  private handleConnect(scopeType: ScopeType): void {
    if (!this.config.onConnect || !canConnect()()) return;

    const providerSelect = this.container?.querySelector<HTMLSelectElement>('[data-filter="provider_id"]');
    const selectedProviderId = providerSelect?.value || '';
    if (!selectedProviderId) {
      this.config.notifier?.error('Select a provider before starting a connection.');
      return;
    }

    const provider = this.state.providers.find((item) => item.id === selectedProviderId);
    if (!provider) {
      this.config.notifier?.error('Selected provider is no longer available.');
      return;
    }

    if (!provider.supported_scope_types.includes(scopeType)) {
      this.config.notifier?.error(`${this.formatProviderId(provider.id)} does not support ${scopeType} scope.`);
      return;
    }

    this.config.onConnect(provider.id, scopeType);
  }

  private bindNoResultsActions(container: Element): void {
    const resetBtn = container.querySelector('.ui-state-reset-btn');
    resetBtn?.addEventListener('click', () => {
      this.queryState.reset();
      this.restoreFilterValues();
    });
  }

  private renderConnectionRow(connection: Connection): string {
    const status = STATUS_CONFIG[connection.status] || STATUS_CONFIG.disconnected;
    const providerName = this.config.getProviderName
      ? this.config.getProviderName(connection.provider_id)
      : this.formatProviderId(connection.provider_id);

    const updatedAt = this.formatDate(connection.updated_at);
    const actions = this.buildRowActions(connection);

    return `
      <tr class="connection-row hover:bg-gray-50 cursor-pointer" data-connection-id="${this.escapeHtml(connection.id)}">
        <td class="px-4 py-3">
          <span class="font-medium text-gray-900">${this.escapeHtml(providerName)}</span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            connection.scope_type === 'user' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
          }">
            ${this.escapeHtml(connection.scope_type)}
          </span>
          <span class="text-gray-500 text-xs ml-1" title="${this.escapeHtml(connection.scope_id)}">
            ${this.escapeHtml(this.truncateId(connection.scope_id))}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="text-gray-600" title="${this.escapeHtml(connection.external_account_id)}">
            ${this.escapeHtml(this.truncateId(connection.external_account_id, 20))}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${status.bg} ${status.text}">
            ${renderIcon(status.icon, { size: '12px' })}
            ${status.label}
          </span>
          ${connection.last_error ? `
            <div class="text-xs text-red-500 mt-0.5 truncate max-w-[200px]" title="${this.escapeHtml(connection.last_error)}">
              ${this.escapeHtml(connection.last_error)}
            </div>
          ` : ''}
        </td>
        <td class="px-4 py-3 text-gray-500 text-xs">
          ${updatedAt}
        </td>
        <td class="px-4 py-3 text-right">
          ${actions}
        </td>
      </tr>
    `;
  }

  private buildRowActions(connection: Connection): string {
    const actions: string[] = [];

    if (connection.status === 'active' && canEdit()()) {
      actions.push(`
        <button type="button"
                class="connection-action-refresh p-1 text-gray-400 hover:text-blue-600"
                data-action="refresh"
                title="Refresh credentials">
          ${renderIcon('iconoir:refresh', { size: '16px' })}
        </button>
      `);
    }

    if (connection.status === 'needs_reconsent' && canReconsent()()) {
      actions.push(`
        <button type="button"
                class="connection-action-reconsent p-1 text-gray-400 hover:text-orange-600"
                data-action="reconsent"
                title="Re-consent">
          ${renderIcon('iconoir:redo', { size: '16px' })}
        </button>
      `);
    }

    if (connection.status !== 'disconnected' && canRevoke()()) {
      actions.push(`
        <button type="button"
                class="connection-action-revoke p-1 text-gray-400 hover:text-red-600"
                data-action="revoke"
                title="Revoke connection">
          ${renderIcon('iconoir:cancel', { size: '16px' })}
        </button>
      `);
    }

    if (actions.length === 0) {
      return '<span class="text-gray-300 text-xs">—</span>';
    }

    return `<div class="flex items-center justify-end gap-1">${actions.join('')}</div>`;
  }

  private bindRowActions(): void {
    const rows = this.container?.querySelectorAll<HTMLTableRowElement>('.connection-row');

    rows?.forEach((row) => {
      const connectionId = row.dataset.connectionId;
      if (!connectionId) return;

      // Row click for selection
      row.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('button')) return;

        const connection = this.getConnection(connectionId);
        if (connection && this.config.onSelect) {
          this.config.onSelect(connection);
        }
      });

      // Action buttons
      row.querySelectorAll<HTMLButtonElement>('button[data-action]').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const action = btn.dataset.action;

          switch (action) {
            case 'refresh':
              await this.handleRefresh(connectionId, btn);
              break;
            case 'reconsent':
              await this.handleReconsent(connectionId, btn);
              break;
            case 'revoke':
              await this.handleRevoke(connectionId, btn);
              break;
          }
        });
      });
    });
  }

  private async handleRefresh(connectionId: string, button?: HTMLButtonElement): Promise<void> {
    const connection = this.getConnection(connectionId);
    if (!connection) return;

    // Prevent duplicate submissions
    if (this.actionQueue.isInFlight(`refresh-${connectionId}`)) return;

    await this.actionQueue.execute(`refresh-${connectionId}`, async () => {
      await withMutationFeedback({
        mutation: () => this.client.refreshConnection(connectionId, {
          provider_id: connection.provider_id,
        }),
        notifier: this.config.notifier,
        successMessage: 'Connection refresh initiated',
        errorMessagePrefix: 'Failed to refresh',
        buttonConfig: button ? {
          button,
          loadingText: 'Refreshing...',
          successText: 'Refreshed',
          errorText: 'Failed',
        } : undefined,
        onSuccess: () => this.loadConnections(),
      });
    });
  }

  private async handleReconsent(connectionId: string, button?: HTMLButtonElement): Promise<void> {
    // Prevent duplicate submissions
    if (this.actionQueue.isInFlight(`reconsent-${connectionId}`)) return;

    await this.actionQueue.execute(`reconsent-${connectionId}`, async () => {
      await withMutationFeedback({
        mutation: () => this.client.beginReconsent(connectionId),
        notifier: this.config.notifier,
        errorMessagePrefix: 'Failed to start re-consent',
        buttonConfig: button ? {
          button,
          loadingText: 'Starting...',
          errorText: 'Failed',
        } : undefined,
        onSuccess: (response) => {
          if (response.begin?.authorize_url) {
            window.location.href = response.begin.authorize_url;
          }
        },
      });
    });
  }

  private async handleRevoke(connectionId: string, button?: HTMLButtonElement): Promise<void> {
    const connection = this.getConnection(connectionId);
    const providerName = connection
      ? (this.config.getProviderName
          ? this.config.getProviderName(connection.provider_id)
          : this.formatProviderId(connection.provider_id))
      : undefined;

    // Show confirmation dialog
    const confirmed = await confirmServiceAction({
      action: 'revoke',
      resourceType: 'connection',
      resourceName: providerName,
    });
    if (!confirmed) return;

    // Prevent duplicate submissions
    if (this.actionQueue.isInFlight(`revoke-${connectionId}`)) return;

    await this.actionQueue.execute(`revoke-${connectionId}`, async () => {
      await withMutationFeedback({
        mutation: () => this.client.revokeConnection(connectionId),
        notifier: this.config.notifier,
        successMessage: 'Connection revoked',
        errorMessagePrefix: 'Failed to revoke',
        buttonConfig: button ? {
          button,
          loadingText: 'Revoking...',
          successText: 'Revoked',
          errorText: 'Failed',
        } : undefined,
        onSuccess: () => this.loadConnections(),
      });
    });
  }

  private renderError(): void {
    const tbody = this.container?.querySelector('.connections-tbody');
    const tableWrapper = this.container?.querySelector('.connections-table-wrapper');
    const emptyState = this.container?.querySelector('.connections-empty');

    if (!tbody) return;

    tableWrapper?.classList.remove('hidden');
    emptyState?.classList.add('hidden');

    tbody.innerHTML = renderTableErrorState(6, {
      title: 'Failed to load connections',
      error: this.state.error,
      showRetry: true,
    });

    const retryBtn = tbody.querySelector('.ui-state-retry-btn');
    retryBtn?.addEventListener('click', () => this.loadConnections());
  }

  private renderForbidden(): void {
    if (!this.container) return;

    this.container.innerHTML = renderForbiddenState({
      resource: 'connections',
    });
  }

  private updateLoadingState(): void {
    const tbody = this.container?.querySelector('.connections-tbody');
    const tableWrapper = this.container?.querySelector('.connections-table-wrapper');
    const emptyState = this.container?.querySelector('.connections-empty');

    if (this.state.loading && tbody && this.state.connections.length === 0) {
      tableWrapper?.classList.remove('hidden');
      emptyState?.classList.add('hidden');
      tbody.innerHTML = renderTableLoadingState(6, { text: 'Loading connections...' });
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

    const infoEl = this.container?.querySelector('.connections-info');
    const prevBtn = this.container?.querySelector<HTMLButtonElement>('.connections-prev');
    const nextBtn = this.container?.querySelector<HTMLButtonElement>('.connections-next');

    if (infoEl) {
      infoEl.textContent = total > 0 ? `Showing ${start}-${end} of ${total}` : 'No connections';
    }

    if (prevBtn) {
      prevBtn.disabled = !hasPrev;
    }

    if (nextBtn) {
      nextBtn.disabled = !hasNext;
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

  private truncateId(id: string, maxLen = 12): string {
    if (id.length <= maxLen) return id;
    return `${id.slice(0, maxLen - 3)}...`;
  }

  private formatDate(dateStr: string): string {
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
 * Create and initialize a connections list
 */
export async function createConnectionsList(
  config: ConnectionsListConfig
): Promise<ConnectionsListManager> {
  const manager = new ConnectionsListManager(config);
  await manager.init();
  return manager;
}
