/**
 * Connection Detail Panel
 * Displays connection information with grant matrix and re-consent workflow
 */

import type {
  Connection,
  ConnectionStatus,
  GrantSnapshot,
  ProviderCapability,
  Provider,
  ScopeType,
  ConnectionCredentialHealth,
  ConnectionRateLimitSummary,
} from '../types.js';
import { getServicesClient, type ServicesAPIClient } from '../api-client.js';
import {
  getPermissionManager,
  canViewServices,
  canEdit,
  canReconsent,
  canRevoke,
} from '../permissions.js';
import {
  renderForbiddenState,
  renderLoadingState,
  renderErrorState,
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

export interface ConnectionDetailConfig {
  /** Container element or selector */
  container: string | HTMLElement;
  /** Connection ID to display */
  connectionId: string;
  /** API client (optional, uses default) */
  apiClient?: ServicesAPIClient;
  /** Toast notifier for messages */
  notifier?: ToastNotifier;
  /** Custom provider name resolver */
  getProviderName?: (providerId: string) => string;
  /** Callback when re-consent is completed */
  onReconsentComplete?: (connectionId: string) => void;
  /** Callback when connection is revoked */
  onRevoke?: (connectionId: string) => void;
  /** Callback to navigate back to list */
  onBack?: () => void;
}

interface ConnectionDetailState {
  connection: Connection | null;
  grantSnapshot: GrantSnapshot | null;
  provider: Provider | null;
  credentialHealth: ConnectionCredentialHealth | null;
  rateLimitSummary: ConnectionRateLimitSummary | null;
  loading: boolean;
  error: Error | null;
  reconsentInProgress: boolean;
}

type GrantStatus = 'granted' | 'requested' | 'missing' | 'capability_required';

interface GrantInfo {
  grant: string;
  status: GrantStatus;
  isRequired: boolean;
  isCapabilityRequired: boolean;
  capabilities: string[];
}

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

const GRANT_STATUS_CONFIG: Record<GrantStatus, { label: string; bg: string; text: string; icon: string }> = {
  granted: { label: 'Granted', bg: 'bg-green-100', text: 'text-green-700', icon: 'iconoir:check' },
  requested: { label: 'Requested', bg: 'bg-blue-100', text: 'text-blue-700', icon: 'iconoir:clock' },
  missing: { label: 'Missing', bg: 'bg-gray-100', text: 'text-gray-500', icon: 'iconoir:minus' },
  capability_required: { label: 'Required', bg: 'bg-amber-100', text: 'text-amber-700', icon: 'iconoir:warning-triangle' },
};

// =============================================================================
// Connection Detail Manager
// =============================================================================

export class ConnectionDetailManager {
  private config: ConnectionDetailConfig;
  private container: HTMLElement | null = null;
  private client: ServicesAPIClient;
  private state: ConnectionDetailState = {
    connection: null,
    grantSnapshot: null,
    provider: null,
    credentialHealth: null,
    rateLimitSummary: null,
    loading: false,
    error: null,
    reconsentInProgress: false,
  };
  private abortController: AbortController | null = null;
  private actionQueue = new ActionQueue();

  constructor(config: ConnectionDetailConfig) {
    this.config = config;
    this.client = config.apiClient || getServicesClient();
  }

  /**
   * Initialize the detail panel
   */
  async init(): Promise<void> {
    // Resolve container
    this.container =
      typeof this.config.container === 'string'
        ? document.querySelector<HTMLElement>(this.config.container)
        : this.config.container;

    if (!this.container) {
      console.error('[ConnectionDetail] Container not found:', this.config.container);
      return;
    }

    // Check view permission
    if (!canViewServices()()) {
      this.renderForbidden();
      return;
    }

    // Load connection data
    await this.loadConnection();
  }

  /**
   * Refresh the connection data
   */
  async refresh(): Promise<void> {
    await this.loadConnection();
  }

  /**
   * Get the current connection
   */
  getConnection(): Connection | null {
    return this.state.connection;
  }

  /**
   * Get the grant snapshot
   */
  getGrantSnapshot(): GrantSnapshot | null {
    return this.state.grantSnapshot;
  }

  /**
   * Set the connection ID and reload
   */
  async setConnectionId(connectionId: string): Promise<void> {
    this.config.connectionId = connectionId;
    await this.loadConnection();
  }

  /**
   * Destroy the manager
   */
  destroy(): void {
    this.abortController?.abort();
  }

  // ---------------------------------------------------------------------------
  // Data Loading
  // ---------------------------------------------------------------------------

  private async loadConnection(): Promise<void> {
    if (!this.container) return;

    // Cancel previous request
    this.abortController?.abort();
    this.abortController = new AbortController();

    this.state.loading = true;
    this.state.error = null;
    this.renderLoading();

    try {
      // Load connection, grants, and provider in parallel
      const [detailResponse, grantsResponse, providersResponse] = await Promise.all([
        this.client.getConnectionDetail(this.config.connectionId, this.abortController.signal),
        this.client.getConnectionGrants(this.config.connectionId, this.abortController.signal),
        this.client.listProviders(this.abortController.signal),
      ]);

      const connection = detailResponse.connection;

      this.state.connection = connection;
      this.state.grantSnapshot = grantsResponse.snapshot;
      this.state.provider = providersResponse.providers.find((p) => p.id === connection.provider_id) || null;
      this.state.credentialHealth = detailResponse.credential_health || null;
      this.state.rateLimitSummary = detailResponse.rate_limit_summary || null;

      this.render();
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;

      this.state.error = err instanceof Error ? err : new Error(String(err));
      this.renderError();

      if (this.config.notifier) {
        this.config.notifier.error(`Failed to load connection: ${this.state.error.message}`);
      }
    } finally {
      this.state.loading = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  private render(): void {
    if (!this.container || !this.state.connection) return;

    const connection = this.state.connection;
    const status = STATUS_CONFIG[connection.status] || STATUS_CONFIG.disconnected;
    const providerName = this.config.getProviderName
      ? this.config.getProviderName(connection.provider_id)
      : this.formatProviderId(connection.provider_id);

    const grantInfoList = this.buildGrantInfoList();
    const hasMissingRequired = grantInfoList.some((g) => g.status === 'capability_required');
    const needsReconsent = connection.status === 'needs_reconsent' || hasMissingRequired;

    this.container.innerHTML = `
      <div class="connection-detail">
        <!-- Header -->
        <div class="detail-header flex items-center justify-between mb-6">
          <div class="flex items-center gap-4">
            ${this.config.onBack ? `
              <button type="button" class="back-btn p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                ${renderIcon('iconoir:arrow-left', { size: '20px' })}
              </button>
            ` : ''}
            <div>
              <h2 class="text-xl font-semibold text-gray-900">${this.escapeHtml(providerName)}</h2>
              <p class="text-sm text-gray-500 mt-0.5">Connection Details</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${status.bg} ${status.text}">
              ${renderIcon(status.icon, { size: '16px' })}
              ${status.label}
            </span>
          </div>
        </div>

        <!-- Info Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div class="info-card bg-white rounded-lg border border-gray-200 p-4">
            <dt class="text-xs font-medium text-gray-500 uppercase tracking-wide">Scope</dt>
            <dd class="mt-1 flex items-center gap-2">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                connection.scope_type === 'user' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
              }">
                ${this.escapeHtml(connection.scope_type)}
              </span>
              <span class="text-sm text-gray-700" title="${this.escapeHtml(connection.scope_id)}">
                ${this.escapeHtml(this.truncateId(connection.scope_id, 16))}
              </span>
            </dd>
          </div>

          <div class="info-card bg-white rounded-lg border border-gray-200 p-4">
            <dt class="text-xs font-medium text-gray-500 uppercase tracking-wide">External Account</dt>
            <dd class="mt-1 text-sm text-gray-700" title="${this.escapeHtml(connection.external_account_id)}">
              ${this.escapeHtml(this.truncateId(connection.external_account_id, 20))}
            </dd>
          </div>

          <div class="info-card bg-white rounded-lg border border-gray-200 p-4">
            <dt class="text-xs font-medium text-gray-500 uppercase tracking-wide">Created</dt>
            <dd class="mt-1 text-sm text-gray-700">
              ${this.formatTime(connection.created_at)}
            </dd>
          </div>

          <div class="info-card bg-white rounded-lg border border-gray-200 p-4">
            <dt class="text-xs font-medium text-gray-500 uppercase tracking-wide">Last Updated</dt>
            <dd class="mt-1 text-sm text-gray-700">
              ${this.formatTime(connection.updated_at)}
            </dd>
          </div>
        </div>

        ${connection.last_error ? `
          <div class="error-banner flex items-start gap-3 p-4 mb-6 bg-red-50 border border-red-200 rounded-lg">
            <div class="flex-shrink-0 text-red-500">
              ${renderIcon('iconoir:warning-circle', { size: '20px' })}
            </div>
            <div>
              <h4 class="text-sm font-medium text-red-800">Last Error</h4>
              <p class="text-sm text-red-700 mt-1">${this.escapeHtml(connection.last_error)}</p>
            </div>
          </div>
        ` : ''}

        ${needsReconsent ? `
          <div class="reconsent-banner flex items-center justify-between p-4 mb-6 bg-amber-50 border border-amber-200 rounded-lg">
            <div class="flex items-start gap-3">
              <div class="flex-shrink-0 text-amber-500">
                ${renderIcon('iconoir:warning-triangle', { size: '20px' })}
              </div>
              <div>
                <h4 class="text-sm font-medium text-amber-800">Re-consent Required</h4>
                <p class="text-sm text-amber-700 mt-1">
                  ${hasMissingRequired
                    ? 'Some required permissions are missing. Re-consent to restore full functionality.'
                    : 'This connection needs re-authorization to continue working.'}
                </p>
              </div>
            </div>
            ${canReconsent()() ? `
              <button type="button"
                      class="reconsent-btn flex-shrink-0 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2">
                Re-consent Now
              </button>
            ` : ''}
          </div>
        ` : ''}

        <!-- Grant Matrix -->
        <div class="grant-matrix bg-white rounded-lg border border-gray-200">
          <div class="px-4 py-3 border-b border-gray-200">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-medium text-gray-900">Permissions</h3>
              ${this.state.grantSnapshot ? `
                <span class="text-xs text-gray-500">
                  Version ${this.state.grantSnapshot.version} • Captured ${this.formatRelativeTime(this.state.grantSnapshot.captured_at)}
                </span>
              ` : ''}
            </div>
          </div>

          <div class="divide-y divide-gray-100">
            ${this.renderGrantMatrix(grantInfoList)}
          </div>

          ${grantInfoList.length === 0 ? `
            <div class="px-4 py-8 text-center">
              <p class="text-sm text-gray-500">No permissions configured for this connection.</p>
            </div>
          ` : ''}
        </div>

        <!-- Capabilities Section -->
        ${this.state.provider && this.state.provider.capabilities.length > 0 ? `
          <div class="capabilities-section mt-6 bg-white rounded-lg border border-gray-200">
            <div class="px-4 py-3 border-b border-gray-200">
              <h3 class="text-lg font-medium text-gray-900">Capabilities</h3>
            </div>
            <div class="p-4">
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${this.renderCapabilities()}
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Operational Status Panels -->
        <div class="operational-panels grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <!-- Credential Health Panel -->
          ${this.renderCredentialHealthPanel()}

          <!-- Rate Limit / Quota Panel -->
          ${this.renderRateLimitPanel()}
        </div>

        <!-- Actions -->
        <div class="actions flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
          ${canEdit()() && connection.status === 'active' ? `
            <button type="button"
                    class="refresh-btn px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              ${renderIcon('iconoir:refresh', { size: '16px', extraClass: 'mr-1.5' })}
              Refresh Credentials
            </button>
          ` : ''}
          ${canRevoke()() && connection.status !== 'disconnected' ? `
            <button type="button"
                    class="revoke-btn px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
              ${renderIcon('iconoir:cancel', { size: '16px', extraClass: 'mr-1.5' })}
              Revoke Connection
            </button>
          ` : ''}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private renderGrantMatrix(grantInfoList: GrantInfo[]): string {
    if (grantInfoList.length === 0) {
      return '';
    }

    return grantInfoList
      .map((grantInfo) => {
        const statusConfig = GRANT_STATUS_CONFIG[grantInfo.status];
        const capabilitiesList = grantInfo.capabilities.length > 0
          ? grantInfo.capabilities.map((c) => this.formatLabel(c)).join(', ')
          : null;

        return `
          <div class="grant-row flex items-center justify-between px-4 py-3 hover:bg-gray-50">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <code class="text-sm font-mono text-gray-700">${this.escapeHtml(grantInfo.grant)}</code>
                ${grantInfo.isCapabilityRequired ? `
                  <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-600" title="Required by capabilities">
                    ${renderIcon('iconoir:puzzle', { size: '10px', extraClass: 'mr-0.5' })}
                    Required
                  </span>
                ` : ''}
              </div>
              ${capabilitiesList ? `
                <p class="text-xs text-gray-500 mt-0.5">
                  Used by: ${this.escapeHtml(capabilitiesList)}
                </p>
              ` : ''}
            </div>
            <div class="flex-shrink-0">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${statusConfig.bg} ${statusConfig.text}">
                ${renderIcon(statusConfig.icon, { size: '12px' })}
                ${statusConfig.label}
              </span>
            </div>
          </div>
        `;
      })
      .join('');
  }

  private renderCapabilities(): string {
    if (!this.state.provider || !this.state.grantSnapshot) {
      return '';
    }

    return this.state.provider.capabilities
      .map((capability) => {
        const grantedGrants = new Set(this.state.grantSnapshot!.granted_grants);
        const hasAllRequired = capability.required_grants.every((g) => grantedGrants.has(g));
        const hasAllOptional = capability.optional_grants.every((g) => grantedGrants.has(g));

        const isFullyEnabled = hasAllRequired && hasAllOptional;
        const isPartiallyEnabled = hasAllRequired && !hasAllOptional;
        const isBlocked = !hasAllRequired;

        let statusLabel: string;
        let statusClass: string;
        let statusIcon: string;

        if (isFullyEnabled) {
          statusLabel = 'Fully Enabled';
          statusClass = 'bg-green-100 text-green-700';
          statusIcon = 'iconoir:check-circle';
        } else if (isPartiallyEnabled) {
          statusLabel = 'Partially Enabled';
          statusClass = 'bg-blue-100 text-blue-700';
          statusIcon = 'iconoir:half-moon';
        } else {
          statusLabel = capability.denied_behavior === 'block' ? 'Blocked' : 'Degraded';
          statusClass = capability.denied_behavior === 'block' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';
          statusIcon = capability.denied_behavior === 'block' ? 'iconoir:lock' : 'iconoir:warning-triangle';
        }

        return `
          <div class="capability-card border border-gray-200 rounded-lg p-3">
            <div class="flex items-start justify-between">
              <div>
                <h4 class="text-sm font-medium text-gray-900">${this.escapeHtml(this.formatLabel(capability.name))}</h4>
                <p class="text-xs text-gray-500 mt-0.5">
                  ${capability.required_grants.length} required, ${capability.optional_grants.length} optional
                </p>
              </div>
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${statusClass}">
                ${renderIcon(statusIcon, { size: '12px' })}
                ${statusLabel}
              </span>
            </div>
            ${isBlocked && capability.denied_behavior === 'block' ? `
              <p class="text-xs text-red-600 mt-2">
                Missing required: ${capability.required_grants.filter((g) => !grantedGrants.has(g)).join(', ')}
              </p>
            ` : ''}
          </div>
        `;
      })
      .join('');
  }

  private renderCredentialHealthPanel(): string {
    const health = this.state.credentialHealth;
    if (!health) {
      return '';
    }

    // Determine overall health status
    let healthStatus: 'healthy' | 'warning' | 'error' = 'healthy';
    let healthLabel = 'Healthy';
    let healthClass = 'bg-green-100 text-green-700 border-green-200';
    let healthIcon = 'iconoir:shield-check';

    if (!health.has_active_credential) {
      healthStatus = 'error';
      healthLabel = 'No Active Credential';
      healthClass = 'bg-red-100 text-red-700 border-red-200';
      healthIcon = 'iconoir:warning-circle';
    } else if (health.last_error) {
      healthStatus = 'error';
      healthLabel = 'Credential Error';
      healthClass = 'bg-red-100 text-red-700 border-red-200';
      healthIcon = 'iconoir:warning-circle';
    } else if (health.expires_at) {
      const expiresAt = new Date(health.expires_at);
      const now = new Date();
      const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntilExpiry < 0) {
        healthStatus = 'error';
        healthLabel = 'Expired';
        healthClass = 'bg-red-100 text-red-700 border-red-200';
        healthIcon = 'iconoir:clock';
      } else if (hoursUntilExpiry < 24) {
        healthStatus = 'warning';
        healthLabel = 'Expiring Soon';
        healthClass = 'bg-amber-100 text-amber-700 border-amber-200';
        healthIcon = 'iconoir:clock';
      }
    }

    return `
      <div class="credential-health-panel bg-white rounded-lg border ${healthStatus === 'healthy' ? 'border-gray-200' : healthStatus === 'warning' ? 'border-amber-200' : 'border-red-200'}">
        <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 class="text-lg font-medium text-gray-900 flex items-center gap-2">
            ${renderIcon('iconoir:key', { size: '20px' })}
            Credential Health
          </h3>
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${healthClass}">
            ${renderIcon(healthIcon, { size: '12px' })}
            ${healthLabel}
          </span>
        </div>
        <div class="p-4 space-y-3">
          <!-- Status Row -->
          <div class="flex items-center justify-between py-2 border-b border-gray-100">
            <span class="text-sm text-gray-600">Active Credential</span>
            <span class="text-sm font-medium ${health.has_active_credential ? 'text-green-600' : 'text-red-600'}">
              ${health.has_active_credential ? 'Yes' : 'No'}
            </span>
          </div>
          <div class="flex items-center justify-between py-2 border-b border-gray-100">
            <span class="text-sm text-gray-600">Refreshable</span>
            <span class="text-sm font-medium ${health.refreshable ? 'text-green-600' : 'text-gray-500'}">
              ${health.refreshable ? 'Yes' : 'No'}
            </span>
          </div>
          ${health.expires_at ? `
            <div class="flex items-center justify-between py-2 border-b border-gray-100">
              <span class="text-sm text-gray-600">Expires At</span>
              <span class="text-sm font-medium text-gray-900" title="${this.escapeHtml(health.expires_at)}">
                ${this.formatRelativeTime(health.expires_at)}
              </span>
            </div>
          ` : ''}
          ${health.last_refresh_at ? `
            <div class="flex items-center justify-between py-2 border-b border-gray-100">
              <span class="text-sm text-gray-600">Last Refresh</span>
              <span class="text-sm font-medium text-gray-900" title="${this.escapeHtml(health.last_refresh_at)}">
                ${this.formatRelativeTime(health.last_refresh_at)}
              </span>
            </div>
          ` : ''}
          ${health.next_refresh_attempt_at ? `
            <div class="flex items-center justify-between py-2 border-b border-gray-100">
              <span class="text-sm text-gray-600">Next Refresh</span>
              <span class="text-sm font-medium text-gray-900" title="${this.escapeHtml(health.next_refresh_attempt_at)}">
                ${this.formatRelativeTime(health.next_refresh_attempt_at)}
              </span>
            </div>
          ` : ''}
          ${health.last_error ? `
            <div class="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg">
              <div class="flex items-start gap-2">
                ${renderIcon('iconoir:warning-circle', { size: '16px', extraClass: 'text-red-500 mt-0.5 flex-shrink-0' })}
                <p class="text-sm text-red-700">${this.escapeHtml(health.last_error)}</p>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  private renderRateLimitPanel(): string {
    const rateLimit = this.state.rateLimitSummary;
    if (!rateLimit) {
      return '';
    }

    // Determine rate limit status
    let limitStatus: 'healthy' | 'warning' | 'exhausted' = 'healthy';
    let limitLabel = 'Normal';
    let limitClass = 'bg-green-100 text-green-700';
    let limitIcon = 'iconoir:check-circle';

    if (rateLimit.exhausted_buckets > 0) {
      const exhaustedRatio = rateLimit.exhausted_buckets / Math.max(rateLimit.total_buckets, 1);
      if (exhaustedRatio >= 1) {
        limitStatus = 'exhausted';
        limitLabel = 'All Limits Exhausted';
        limitClass = 'bg-red-100 text-red-700';
        limitIcon = 'iconoir:warning-circle';
      } else if (exhaustedRatio >= 0.5) {
        limitStatus = 'warning';
        limitLabel = 'High Usage';
        limitClass = 'bg-amber-100 text-amber-700';
        limitIcon = 'iconoir:warning-triangle';
      } else {
        limitStatus = 'warning';
        limitLabel = 'Some Limits Hit';
        limitClass = 'bg-amber-100 text-amber-700';
        limitIcon = 'iconoir:clock';
      }
    }

    // Calculate usage percentage
    const usagePercent = rateLimit.total_buckets > 0
      ? Math.round((rateLimit.exhausted_buckets / rateLimit.total_buckets) * 100)
      : 0;

    return `
      <div class="rate-limit-panel bg-white rounded-lg border ${limitStatus === 'healthy' ? 'border-gray-200' : limitStatus === 'warning' ? 'border-amber-200' : 'border-red-200'}">
        <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 class="text-lg font-medium text-gray-900 flex items-center gap-2">
            ${renderIcon('iconoir:graph-up', { size: '20px' })}
            Rate Limits
          </h3>
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${limitClass}">
            ${renderIcon(limitIcon, { size: '12px' })}
            ${limitLabel}
          </span>
        </div>
        <div class="p-4 space-y-3">
          <!-- Usage Bar -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm text-gray-600">Bucket Usage</span>
              <span class="text-sm font-medium text-gray-900">
                ${rateLimit.exhausted_buckets} / ${rateLimit.total_buckets} exhausted
              </span>
            </div>
            <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div class="h-full transition-all duration-300 ${
                limitStatus === 'healthy' ? 'bg-green-500' :
                limitStatus === 'warning' ? 'bg-amber-500' : 'bg-red-500'
              }" style="width: ${usagePercent}%"></div>
            </div>
          </div>

          ${rateLimit.next_reset_at ? `
            <div class="flex items-center justify-between py-2 border-b border-gray-100">
              <span class="text-sm text-gray-600">Next Reset</span>
              <span class="text-sm font-medium text-gray-900" title="${this.escapeHtml(rateLimit.next_reset_at)}">
                ${this.formatRelativeTime(rateLimit.next_reset_at)}
              </span>
            </div>
          ` : ''}

          ${rateLimit.max_retry_after_seconds > 0 ? `
            <div class="flex items-center justify-between py-2 border-b border-gray-100">
              <span class="text-sm text-gray-600">Max Retry After</span>
              <span class="text-sm font-medium text-gray-900">
                ${this.formatDuration(rateLimit.max_retry_after_seconds)}
              </span>
            </div>
          ` : ''}

          ${limitStatus === 'exhausted' ? `
            <div class="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg">
              <div class="flex items-start gap-2">
                ${renderIcon('iconoir:warning-circle', { size: '16px', extraClass: 'text-red-500 mt-0.5 flex-shrink-0' })}
                <p class="text-sm text-red-700">
                  All rate limit buckets are exhausted. API requests may be throttled until limits reset.
                </p>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  private formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      return `${mins}m`;
    }
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  private formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;

    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const isFuture = diffMs > 0;
    const absDiffMs = Math.abs(diffMs);
    const absDiffMins = Math.floor(absDiffMs / 60000);
    const absDiffHours = Math.floor(absDiffMs / 3600000);
    const absDiffDays = Math.floor(absDiffMs / 86400000);

    if (absDiffMins < 1) return isFuture ? 'in a moment' : 'just now';
    if (absDiffMins < 60) return isFuture ? `in ${absDiffMins}m` : `${absDiffMins}m ago`;
    if (absDiffHours < 24) return isFuture ? `in ${absDiffHours}h` : `${absDiffHours}h ago`;
    if (absDiffDays < 7) return isFuture ? `in ${absDiffDays}d` : `${absDiffDays}d ago`;

    return date.toLocaleDateString();
  }

  private bindEvents(): void {
    if (!this.container) return;

    // Back button
    const backBtn = this.container.querySelector('.back-btn');
    backBtn?.addEventListener('click', () => {
      this.config.onBack?.();
    });

    // Re-consent button
    const reconsentBtn = this.container.querySelector('.reconsent-btn');
    reconsentBtn?.addEventListener('click', () => this.handleReconsent());

    // Refresh button
    const refreshBtn = this.container.querySelector('.refresh-btn');
    refreshBtn?.addEventListener('click', () => this.handleRefresh());

    // Revoke button
    const revokeBtn = this.container.querySelector('.revoke-btn');
    revokeBtn?.addEventListener('click', () => this.handleRevoke());
  }

  private async handleReconsent(): Promise<void> {
    if (!this.state.connection || this.state.reconsentInProgress) return;

    this.state.reconsentInProgress = true;
    this.updateReconsentButtonState();

    try {
      // Calculate additional grants needed
      const grantInfoList = this.buildGrantInfoList();
      const missingRequired = grantInfoList
        .filter((g) => g.status === 'capability_required')
        .map((g) => g.grant);

      const response = await this.client.beginReconsent(this.config.connectionId, {
        requested_grants: missingRequired.length > 0 ? missingRequired : undefined,
      });

      if (response.begin?.authorize_url) {
        this.config.onReconsentComplete?.(this.config.connectionId);
        window.location.href = response.begin.authorize_url;
      }
    } catch (err) {
      this.config.notifier?.error(`Failed to start re-consent: ${(err as Error).message}`);
      this.state.reconsentInProgress = false;
      this.updateReconsentButtonState();
    }
  }

  private async handleRefresh(): Promise<void> {
    if (!this.state.connection) return;

    const refreshBtn = this.container?.querySelector<HTMLButtonElement>('.refresh-btn');

    // Prevent duplicate submissions
    if (this.actionQueue.isInFlight('refresh')) return;

    await this.actionQueue.execute('refresh', async () => {
      await withMutationFeedback({
        mutation: () => this.client.refreshConnection(this.config.connectionId, {
          provider_id: this.state.connection!.provider_id,
        }),
        notifier: this.config.notifier,
        successMessage: 'Connection refresh initiated',
        errorMessagePrefix: 'Failed to refresh',
        buttonConfig: refreshBtn ? {
          button: refreshBtn,
          loadingText: 'Refreshing...',
          successText: 'Refreshed',
          errorText: 'Failed',
        } : undefined,
        onSuccess: () => this.loadConnection(),
      });
    });
  }

  private async handleRevoke(): Promise<void> {
    if (!this.state.connection) return;

    const providerName = this.config.getProviderName
      ? this.config.getProviderName(this.state.connection.provider_id)
      : this.formatProviderId(this.state.connection.provider_id);

    // Show confirmation dialog
    const confirmed = await confirmServiceAction({
      action: 'revoke',
      resourceType: 'connection',
      resourceName: providerName,
    });
    if (!confirmed) return;

    const revokeBtn = this.container?.querySelector<HTMLButtonElement>('.revoke-btn');

    // Prevent duplicate submissions
    if (this.actionQueue.isInFlight('revoke')) return;

    await this.actionQueue.execute('revoke', async () => {
      await withMutationFeedback({
        mutation: () => this.client.revokeConnection(this.config.connectionId),
        notifier: this.config.notifier,
        successMessage: 'Connection revoked',
        errorMessagePrefix: 'Failed to revoke',
        buttonConfig: revokeBtn ? {
          button: revokeBtn,
          loadingText: 'Revoking...',
          successText: 'Revoked',
          errorText: 'Failed',
        } : undefined,
        onSuccess: () => this.config.onRevoke?.(this.config.connectionId),
      });
    });
  }

  private updateReconsentButtonState(): void {
    const btn = this.container?.querySelector<HTMLButtonElement>('.reconsent-btn');
    if (!btn) return;

    if (this.state.reconsentInProgress) {
      btn.disabled = true;
      btn.innerHTML = `
        <svg class="animate-spin h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Redirecting...
      `;
    } else {
      btn.disabled = false;
      btn.textContent = 'Re-consent Now';
    }
  }

  private renderLoading(): void {
    if (!this.container) return;

    this.container.innerHTML = renderLoadingState({
      text: 'Loading connection details...',
      size: 'lg',
    });
  }

  private renderError(): void {
    if (!this.container) return;

    this.container.innerHTML = renderErrorState({
      title: 'Failed to Load Connection',
      error: this.state.error,
      showRetry: true,
    });

    const retryBtn = this.container.querySelector('.ui-state-retry-btn');
    retryBtn?.addEventListener('click', () => this.loadConnection());
  }

  private renderForbidden(): void {
    if (!this.container) return;

    this.container.innerHTML = renderForbiddenState({
      resource: 'connection details',
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private buildGrantInfoList(): GrantInfo[] {
    const snapshot = this.state.grantSnapshot;
    const provider = this.state.provider;

    if (!snapshot) {
      return [];
    }

    const requestedSet = new Set(snapshot.requested_grants);
    const grantedSet = new Set(snapshot.granted_grants);

    // Build a map of grant -> capabilities
    const grantToCapabilities = new Map<string, string[]>();
    const capabilityRequiredGrants = new Set<string>();

    if (provider) {
      for (const capability of provider.capabilities) {
        for (const grant of capability.required_grants) {
          capabilityRequiredGrants.add(grant);
          const caps = grantToCapabilities.get(grant) || [];
          caps.push(capability.name);
          grantToCapabilities.set(grant, caps);
        }
        for (const grant of capability.optional_grants) {
          const caps = grantToCapabilities.get(grant) || [];
          caps.push(capability.name);
          grantToCapabilities.set(grant, caps);
        }
      }
    }

    // Collect all unique grants
    const allGrants = new Set([
      ...snapshot.requested_grants,
      ...snapshot.granted_grants,
      ...capabilityRequiredGrants,
    ]);

    // Build the info list
    const grantInfoList: GrantInfo[] = [];

    for (const grant of allGrants) {
      const isGranted = grantedSet.has(grant);
      const isRequested = requestedSet.has(grant);
      const isCapabilityRequired = capabilityRequiredGrants.has(grant);

      let status: GrantStatus;
      if (isGranted) {
        status = 'granted';
      } else if (isRequested) {
        status = 'requested';
      } else if (isCapabilityRequired) {
        status = 'capability_required';
      } else {
        status = 'missing';
      }

      grantInfoList.push({
        grant,
        status,
        isRequired: isRequested || isCapabilityRequired,
        isCapabilityRequired,
        capabilities: grantToCapabilities.get(grant) || [],
      });
    }

    // Sort: capability_required first, then granted, then requested, then missing
    const statusOrder: Record<GrantStatus, number> = {
      capability_required: 0,
      granted: 1,
      requested: 2,
      missing: 3,
    };

    grantInfoList.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

    return grantInfoList;
  }

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
 * Create and initialize a connection detail panel
 */
export async function createConnectionDetail(
  config: ConnectionDetailConfig
): Promise<ConnectionDetailManager> {
  const manager = new ConnectionDetailManager(config);
  await manager.init();
  return manager;
}
