/**
 * Installations List Page
 * Displays service installations with filters, pagination, and management actions
 */

import type {
  Installation,
  InstallationStatus,
  InstallType,
  InstallationsListFilter,
  Provider,
  ScopeType,
} from '../types.js';
import { getServicesClient, type ServicesAPIClient } from '../api-client.js';
import { QueryStateManager, type QueryState } from '../query-state.js';
import {
  getPermissionManager,
  canViewServices,
  canConnect,
  canRevoke,
} from '../permissions.js';
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

export interface InstallationsListConfig {
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
  /** Callback when installation is selected */
  onSelect?: (installation: Installation) => void;
  /** Callback when begin action is triggered */
  onBegin?: (providerId: string, scopeType: ScopeType) => void;
  /** Custom provider name resolver */
  getProviderName?: (providerId: string) => string;
}

interface InstallationsListState {
  installations: Installation[];
  providers: Provider[];
  total: number;
  loading: boolean;
  error: Error | null;
}

type InstallationsFilter = {
  provider_id: string;
  scope_type: string;
  scope_id: string;
  install_type: string;
  status: string;
};

// =============================================================================
// Status Configuration
// =============================================================================

const STATUS_CONFIG: Record<InstallationStatus, { label: string; bg: string; text: string; icon: string }> = {
  active: { label: 'Active', bg: 'bg-green-100', text: 'text-green-700', icon: 'iconoir:check-circle' },
  suspended: { label: 'Suspended', bg: 'bg-amber-100', text: 'text-amber-700', icon: 'iconoir:pause' },
  uninstalled: { label: 'Uninstalled', bg: 'bg-gray-100', text: 'text-gray-600', icon: 'iconoir:cancel' },
  needs_reconsent: { label: 'Needs Reconsent', bg: 'bg-orange-100', text: 'text-orange-700', icon: 'iconoir:refresh' },
};

const INSTALL_TYPE_CONFIG: Record<InstallType, { label: string; bg: string; text: string }> = {
  user: { label: 'User', bg: 'bg-blue-50', text: 'text-blue-600' },
  workspace: { label: 'Workspace', bg: 'bg-indigo-50', text: 'text-indigo-600' },
  org: { label: 'Organization', bg: 'bg-purple-50', text: 'text-purple-600' },
  marketplace_app: { label: 'Marketplace', bg: 'bg-pink-50', text: 'text-pink-600' },
  standard: { label: 'Standard', bg: 'bg-gray-50', text: 'text-gray-600' },
};

// =============================================================================
// Installations List Manager
// =============================================================================

export class InstallationsListManager {
  private config: InstallationsListConfig;
  private container: HTMLElement | null = null;
  private client: ServicesAPIClient;
  private queryState: QueryStateManager<InstallationsFilter>;
  private state: InstallationsListState = {
    installations: [],
    providers: [],
    total: 0,
    loading: false,
    error: null,
  };
  private abortController: AbortController | null = null;
  private actionQueue = new ActionQueue();

  constructor(config: InstallationsListConfig) {
    this.config = {
      perPage: 25,
      syncUrl: true,
      ...config,
    };
    this.client = config.apiClient || getServicesClient();

    this.queryState = new QueryStateManager<InstallationsFilter>({
      config: {
        defaultPerPage: this.config.perPage,
        onChange: () => this.loadInstallations(),
      },
      filterFields: ['provider_id', 'scope_type', 'scope_id', 'install_type', 'status'],
      storageKey: 'services-installations-list',
    });
  }

  /**
   * Initialize the installations list
   */
  async init(): Promise<void> {
    this.container =
      typeof this.config.container === 'string'
        ? document.querySelector<HTMLElement>(this.config.container)
        : this.config.container;

    if (!this.container) {
      console.error('[InstallationsList] Container not found:', this.config.container);
      return;
    }

    if (!canViewServices()()) {
      this.renderForbidden();
      return;
    }

    this.queryState.init();
    this.renderStructure();
    await this.loadProviders();
    this.bindEvents();
    await this.loadInstallations();
  }

  /**
   * Refresh the installations list
   */
  async refresh(): Promise<void> {
    await this.loadInstallations();
  }

  /**
   * Get the current installations
   */
  getInstallations(): Installation[] {
    return [...this.state.installations];
  }

  /**
   * Get an installation by ID
   */
  getInstallation(id: string): Installation | undefined {
    return this.state.installations.find((i) => i.id === id);
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

  private async loadInstallations(): Promise<void> {
    if (!this.container) return;

    this.abortController?.abort();
    this.abortController = new AbortController();

    this.state.loading = true;
    this.state.error = null;
    this.updateLoadingState();

    try {
      const params = this.queryState.getQueryParams();
      const filter: InstallationsListFilter = {
        provider_id: params.provider_id as string | undefined,
        scope_type: params.scope_type as ScopeType | undefined,
        scope_id: params.scope_id as string | undefined,
        install_type: params.install_type as InstallType | undefined,
        status: params.status as InstallationStatus | undefined,
        q: params.q as string | undefined,
        page: params.page as number,
        per_page: params.per_page as number,
      };

      const response = await this.client.listInstallations(filter, this.abortController.signal);

      this.state.installations = response.installations;
      this.state.total = response.total;
      this.queryState.updateFromResponse(response.total, response.has_next);

      this.renderInstallations();
      this.updatePagination();
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;

      this.state.error = err instanceof Error ? err : new Error(String(err));
      this.renderError();

      if (this.config.notifier) {
        this.config.notifier.error(`Failed to load installations: ${this.state.error.message}`);
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
      <div class="installations-list">
        <!-- Filters -->
        <div class="installations-filters flex flex-wrap items-center gap-3 mb-4">
          <div class="flex-1 min-w-[200px]">
            <input type="text"
                   class="installations-search w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   placeholder="Search installations..."
                   data-filter="search">
          </div>

          <select class="installations-filter-provider px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  data-filter="provider_id">
            <option value="">All Providers</option>
          </select>

          <select class="installations-filter-scope px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  data-filter="scope_type">
            <option value="">All Scopes</option>
            <option value="user">User</option>
            <option value="org">Organization</option>
          </select>

          <select class="installations-filter-status px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  data-filter="status">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="uninstalled">Uninstalled</option>
            <option value="needs_reconsent">Needs Reconsent</option>
          </select>

          <select class="installations-filter-type px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  data-filter="install_type">
            <option value="">All Install Types</option>
            <option value="user">User</option>
            <option value="workspace">Workspace</option>
            <option value="org">Organization</option>
            <option value="marketplace_app">Marketplace</option>
            <option value="standard">Standard</option>
          </select>

          <button type="button"
                  class="installations-reset px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                  title="Reset filters">
            ${renderIcon('iconoir:refresh', { size: '16px' })}
          </button>
        </div>

        <!-- Table -->
        <div class="installations-table-wrapper overflow-x-auto bg-white rounded-lg border border-gray-200">
          <table class="installations-table w-full text-sm">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="px-4 py-3 text-left font-medium text-gray-600">Provider</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">Install Type</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">Scope</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">Granted</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">Revoked</th>
                <th class="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody class="installations-tbody divide-y divide-gray-100">
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div class="installations-empty hidden py-12 text-center">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
            ${renderIcon('iconoir:download', { size: '24px', extraClass: 'text-gray-400' })}
          </div>
          <h3 class="text-lg font-medium text-gray-900">No installations found</h3>
          <p class="text-sm text-gray-500 mt-1">Install a service to get started.</p>
        </div>

        <!-- Pagination -->
        <div class="installations-pagination flex items-center justify-between mt-4">
          <div class="installations-info text-sm text-gray-500"></div>
          <div class="flex items-center gap-2">
            <button type="button"
                    class="installations-prev px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled>
              Previous
            </button>
            <button type="button"
                    class="installations-next px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled>
              Next
            </button>
          </div>
        </div>
      </div>
    `;

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
      const filterKey = select.dataset.filter as keyof InstallationsFilter;
      select.value = state.filters[filterKey] || '';
    });
  }

  private bindEvents(): void {
    if (!this.container) return;

    const searchInput = this.container.querySelector<HTMLInputElement>('[data-filter="search"]');
    searchInput?.addEventListener('input', (e) => {
      this.queryState.setSearch((e.target as HTMLInputElement).value);
    });

    const filterSelects = this.container.querySelectorAll<HTMLSelectElement>('select[data-filter]');
    filterSelects.forEach((select) => {
      select.addEventListener('change', () => {
        const filterKey = select.dataset.filter as keyof InstallationsFilter;
        this.queryState.setFilter(filterKey, select.value || undefined);
      });
    });

    const resetBtn = this.container.querySelector('.installations-reset');
    resetBtn?.addEventListener('click', () => {
      this.queryState.reset();
      this.restoreFilterValues();
    });

    const prevBtn = this.container.querySelector('.installations-prev');
    const nextBtn = this.container.querySelector('.installations-next');

    prevBtn?.addEventListener('click', () => this.queryState.prevPage());
    nextBtn?.addEventListener('click', () => this.queryState.nextPage());
  }

  private renderInstallations(): void {
    const tbody = this.container?.querySelector('.installations-tbody');
    const emptyState = this.container?.querySelector('.installations-empty');
    const tableWrapper = this.container?.querySelector('.installations-table-wrapper');

    if (!tbody) return;

    if (this.state.installations.length === 0) {
      // Determine if this is "empty" (no data) or "no results" (filters applied)
      const hasFilters = this.queryState.getActiveFilterCount() > 0 || !!this.queryState.getState().search;

      if (hasFilters) {
        // Show no-results state in the table
        tableWrapper?.classList.remove('hidden');
        emptyState?.classList.add('hidden');
        tbody.innerHTML = renderTableNoResultsState(7, {
          query: this.queryState.getState().search,
          filterCount: this.queryState.getActiveFilterCount(),
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

    tbody.innerHTML = this.state.installations.map((inst) => this.renderInstallationRow(inst)).join('');
    this.bindRowActions();
  }

  private bindNoResultsActions(container: Element): void {
    const resetBtn = container.querySelector('.ui-state-reset-btn');
    resetBtn?.addEventListener('click', () => {
      this.queryState.reset();
      this.restoreFilterValues();
    });
  }

  private renderInstallationRow(installation: Installation): string {
    const status = STATUS_CONFIG[installation.status] || STATUS_CONFIG.uninstalled;
    const installType = INSTALL_TYPE_CONFIG[installation.install_type] || INSTALL_TYPE_CONFIG.standard;
    const providerName = this.config.getProviderName
      ? this.config.getProviderName(installation.provider_id)
      : this.formatProviderId(installation.provider_id);

    const grantedAt = installation.granted_at ? this.formatDate(installation.granted_at) : '—';
    const revokedAt = installation.revoked_at ? this.formatDate(installation.revoked_at) : '—';
    const actions = this.buildRowActions(installation);

    return `
      <tr class="installation-row hover:bg-gray-50 cursor-pointer" data-installation-id="${this.escapeHtml(installation.id)}">
        <td class="px-4 py-3">
          <span class="font-medium text-gray-900">${this.escapeHtml(providerName)}</span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${installType.bg} ${installType.text}">
            ${installType.label}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            installation.scope_type === 'user' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
          }">
            ${this.escapeHtml(installation.scope_type)}
          </span>
          <span class="text-gray-500 text-xs ml-1" title="${this.escapeHtml(installation.scope_id)}">
            ${this.escapeHtml(this.truncateId(installation.scope_id))}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${status.bg} ${status.text}">
            ${renderIcon(status.icon, { size: '12px' })}
            ${status.label}
          </span>
        </td>
        <td class="px-4 py-3 text-gray-500 text-xs">
          ${grantedAt}
        </td>
        <td class="px-4 py-3 text-gray-500 text-xs">
          ${revokedAt}
        </td>
        <td class="px-4 py-3 text-right">
          ${actions}
        </td>
      </tr>
    `;
  }

  private buildRowActions(installation: Installation): string {
    const actions: string[] = [];

    if (installation.status === 'active' && canRevoke()()) {
      actions.push(`
        <button type="button"
                class="installation-action-uninstall p-1 text-gray-400 hover:text-red-600"
                data-action="uninstall"
                title="Uninstall">
          ${renderIcon('iconoir:trash', { size: '16px' })}
        </button>
      `);
    }

    if (installation.status === 'uninstalled' && canConnect()()) {
      actions.push(`
        <button type="button"
                class="installation-action-reinstall p-1 text-gray-400 hover:text-green-600"
                data-action="reinstall"
                title="Reinstall">
          ${renderIcon('iconoir:redo', { size: '16px' })}
        </button>
      `);
    }

    if (actions.length === 0) {
      return '<span class="text-gray-300 text-xs">—</span>';
    }

    return `<div class="flex items-center justify-end gap-1">${actions.join('')}</div>`;
  }

  private bindRowActions(): void {
    const rows = this.container?.querySelectorAll<HTMLTableRowElement>('.installation-row');

    rows?.forEach((row) => {
      const installationId = row.dataset.installationId;
      if (!installationId) return;

      row.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('button')) return;

        const installation = this.getInstallation(installationId);
        if (installation && this.config.onSelect) {
          this.config.onSelect(installation);
        }
      });

      row.querySelectorAll<HTMLButtonElement>('button[data-action]').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const action = btn.dataset.action;

          switch (action) {
            case 'uninstall':
              await this.handleUninstall(installationId, btn);
              break;
            case 'reinstall':
              await this.handleReinstall(installationId);
              break;
          }
        });
      });
    });
  }

  private async handleUninstall(installationId: string, button?: HTMLButtonElement): Promise<void> {
    const installation = this.getInstallation(installationId);
    const providerName = installation
      ? (this.config.getProviderName
          ? this.config.getProviderName(installation.provider_id)
          : this.formatProviderId(installation.provider_id))
      : undefined;

    // Show confirmation dialog
    const confirmed = await confirmServiceAction({
      action: 'uninstall',
      resourceType: 'installation',
      resourceName: providerName,
    });
    if (!confirmed) return;

    // Prevent duplicate submissions
    if (this.actionQueue.isInFlight(`uninstall-${installationId}`)) return;

    await this.actionQueue.execute(`uninstall-${installationId}`, async () => {
      await withMutationFeedback({
        mutation: () => this.client.uninstallInstallation(installationId),
        notifier: this.config.notifier,
        successMessage: 'Service uninstalled',
        errorMessagePrefix: 'Failed to uninstall',
        buttonConfig: button ? {
          button,
          loadingText: 'Uninstalling...',
          successText: 'Uninstalled',
          errorText: 'Failed',
        } : undefined,
        onSuccess: () => this.loadInstallations(),
      });
    });
  }

  private async handleReinstall(installationId: string): Promise<void> {
    const installation = this.getInstallation(installationId);
    if (!installation) return;

    if (this.config.onBegin) {
      this.config.onBegin(installation.provider_id, installation.scope_type);
    }
  }

  private renderError(): void {
    const tbody = this.container?.querySelector('.installations-tbody');
    const tableWrapper = this.container?.querySelector('.installations-table-wrapper');
    const emptyState = this.container?.querySelector('.installations-empty');

    if (!tbody) return;

    tableWrapper?.classList.remove('hidden');
    emptyState?.classList.add('hidden');

    tbody.innerHTML = renderTableErrorState(7, {
      title: 'Failed to load installations',
      error: this.state.error,
      showRetry: true,
    });

    const retryBtn = tbody.querySelector('.ui-state-retry-btn');
    retryBtn?.addEventListener('click', () => this.loadInstallations());
  }

  private renderForbidden(): void {
    if (!this.container) return;

    this.container.innerHTML = renderForbiddenState({
      resource: 'installations',
    });
  }

  private updateLoadingState(): void {
    const tbody = this.container?.querySelector('.installations-tbody');
    const tableWrapper = this.container?.querySelector('.installations-table-wrapper');
    const emptyState = this.container?.querySelector('.installations-empty');

    if (this.state.loading && tbody && this.state.installations.length === 0) {
      tableWrapper?.classList.remove('hidden');
      emptyState?.classList.add('hidden');
      tbody.innerHTML = renderTableLoadingState(7, { text: 'Loading installations...' });
    }
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

  private updatePagination(): void {
    const state = this.queryState.getState();
    const { page, per_page } = state;
    const { total } = this.state;

    const start = total > 0 ? (page - 1) * per_page + 1 : 0;
    const end = Math.min(page * per_page, total);
    const hasNext = end < total;
    const hasPrev = page > 1;

    const infoEl = this.container?.querySelector('.installations-info');
    const prevBtn = this.container?.querySelector<HTMLButtonElement>('.installations-prev');
    const nextBtn = this.container?.querySelector<HTMLButtonElement>('.installations-next');

    if (infoEl) {
      infoEl.textContent = total > 0 ? `Showing ${start}-${end} of ${total}` : 'No installations';
    }

    if (prevBtn) prevBtn.disabled = !hasPrev;
    if (nextBtn) nextBtn.disabled = !hasNext;
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
 * Create and initialize an installations list
 */
export async function createInstallationsList(
  config: InstallationsListConfig
): Promise<InstallationsListManager> {
  const manager = new InstallationsListManager(config);
  await manager.init();
  return manager;
}
