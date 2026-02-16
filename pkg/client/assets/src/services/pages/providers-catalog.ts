/**
 * Providers Catalog Page
 * Displays available service providers with capability summaries and connect actions
 */

import type { Provider, ProviderCapability, ScopeType } from '../types.js';
import { getServicesClient } from '../api-client.js';
import { getPermissionManager, canConnect, canViewServices } from '../permissions.js';
import {
  renderForbiddenState,
  renderLoadingState,
  renderErrorState,
  renderEmptyState,
} from '../ui-states.js';
import type { ToastNotifier } from '../../toast/types.js';
import { renderIcon } from '../../shared/icon-renderer.js';

// =============================================================================
// Types
// =============================================================================

export interface ProvidersPageConfig {
  /** Container element or selector */
  container: string | HTMLElement;
  /** API base path (default: /admin/api/services) */
  apiBasePath?: string;
  /** Toast notifier for messages */
  notifier?: ToastNotifier;
  /** Callback when connect is initiated */
  onConnect?: (provider: Provider, scope: ScopeType) => void;
  /** Callback when provider is selected for details */
  onSelect?: (provider: Provider) => void;
  /** Custom provider icon resolver */
  getProviderIcon?: (providerId: string) => string;
  /** Custom provider display name resolver */
  getProviderName?: (providerId: string) => string;
}

export interface ProviderCardData {
  provider: Provider;
  displayName: string;
  icon: string;
  description: string;
  capabilityCount: number;
  canConnect: boolean;
}

// =============================================================================
// Default Icon Mapping
// =============================================================================

const PROVIDER_ICONS: Record<string, string> = {
  github: 'iconoir:github',
  google: 'iconoir:google',
  gmail: 'iconoir:mail',
  drive: 'iconoir:folder',
  docs: 'iconoir:page',
  calendar: 'iconoir:calendar',
  slack: 'iconoir:chat-bubble',
  dropbox: 'iconoir:cloud',
  microsoft: 'iconoir:microsoft',
  outlook: 'iconoir:mail',
  teams: 'iconoir:group',
  onedrive: 'iconoir:cloud',
  default: 'iconoir:plugin',
};

const PROVIDER_NAMES: Record<string, string> = {
  github: 'GitHub',
  google: 'Google',
  gmail: 'Gmail',
  drive: 'Google Drive',
  docs: 'Google Docs',
  calendar: 'Google Calendar',
  slack: 'Slack',
  dropbox: 'Dropbox',
  microsoft: 'Microsoft',
  outlook: 'Outlook',
  teams: 'Microsoft Teams',
  onedrive: 'OneDrive',
};

// =============================================================================
// Providers Catalog Manager
// =============================================================================

export class ProvidersCatalogManager {
  private config: ProvidersPageConfig;
  private container: HTMLElement | null = null;
  private providers: Provider[] = [];
  private loading = false;
  private error: Error | null = null;

  constructor(config: ProvidersPageConfig) {
    this.config = config;
  }

  /**
   * Initialize the providers catalog
   */
  async init(): Promise<void> {
    // Resolve container
    this.container =
      typeof this.config.container === 'string'
        ? document.querySelector<HTMLElement>(this.config.container)
        : this.config.container;

    if (!this.container) {
      console.error('[ProvidersCatalog] Container not found:', this.config.container);
      return;
    }

    // Check view permission
    if (!canViewServices()()) {
      this.renderForbidden();
      return;
    }

    // Load providers
    await this.loadProviders();
  }

  /**
   * Refresh the providers list
   */
  async refresh(): Promise<void> {
    await this.loadProviders();
  }

  /**
   * Get the loaded providers
   */
  getProviders(): Provider[] {
    return [...this.providers];
  }

  /**
   * Get a provider by ID
   */
  getProvider(id: string): Provider | undefined {
    return this.providers.find((p) => p.id === id);
  }

  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------

  private async loadProviders(): Promise<void> {
    if (!this.container) return;

    this.loading = true;
    this.error = null;
    this.renderLoading();

    try {
      const client = getServicesClient();
      const response = await client.listProviders();
      this.providers = response.providers || [];
      this.renderProviders();
    } catch (err) {
      this.error = err instanceof Error ? err : new Error(String(err));
      this.renderError();

      if (this.config.notifier) {
        this.config.notifier.error(`Failed to load providers: ${this.error.message}`);
      }
    } finally {
      this.loading = false;
    }
  }

  private renderLoading(): void {
    if (!this.container) return;

    this.container.innerHTML = renderLoadingState({
      text: 'Loading providers...',
      size: 'lg',
    });
  }

  private renderError(): void {
    if (!this.container) return;

    this.container.innerHTML = renderErrorState({
      title: 'Failed to load providers',
      error: this.error,
      showRetry: true,
    });

    // Bind retry button
    const retryBtn = this.container.querySelector('.ui-state-retry-btn');
    retryBtn?.addEventListener('click', () => this.loadProviders());
  }

  private renderForbidden(): void {
    if (!this.container) return;

    this.container.innerHTML = renderForbiddenState({
      resource: 'service providers',
    });
  }

  private renderProviders(): void {
    if (!this.container) return;

    if (this.providers.length === 0) {
      this.renderEmpty();
      return;
    }

    const cards = this.providers.map((provider) => this.buildProviderCard(provider));

    this.container.innerHTML = `
      <div class="providers-catalog-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        ${cards.join('')}
      </div>
    `;

    // Bind card events
    this.bindCardEvents();
  }

  private renderEmpty(): void {
    if (!this.container) return;

    this.container.innerHTML = renderEmptyState({
      type: 'providers',
    });
  }

  private buildProviderCard(provider: Provider): string {
    const data = this.getProviderCardData(provider);
    const userCanConnect = canConnect()() && provider.supported_scope_types.includes('user');
    const orgCanConnect = canConnect()() && provider.supported_scope_types.includes('org');

    const capabilitySummary = this.buildCapabilitySummary(provider.capabilities);
    const scopeBadges = this.buildScopeBadges(provider.supported_scope_types);

    return `
      <div class="provider-card bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
           data-provider-id="${this.escapeHtml(provider.id)}">
        <div class="p-4">
          <!-- Header -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                ${renderIcon(data.icon, { size: '20px', extraClass: 'text-gray-600' })}
              </div>
              <div>
                <h3 class="text-sm font-semibold text-gray-900">${this.escapeHtml(data.displayName)}</h3>
                <span class="text-xs text-gray-500">${this.escapeHtml(provider.auth_kind)}</span>
              </div>
            </div>
            ${scopeBadges}
          </div>

          <!-- Capabilities -->
          <div class="mt-3">
            <div class="text-xs text-gray-500 mb-1.5">Capabilities (${data.capabilityCount})</div>
            ${capabilitySummary}
          </div>
        </div>

        <!-- Actions -->
        <div class="px-4 py-3 bg-gray-50 border-t border-gray-100 rounded-b-lg">
          <div class="flex items-center gap-2">
            ${userCanConnect ? `
              <button type="button"
                      class="provider-connect-btn flex-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
                      data-provider-id="${this.escapeHtml(provider.id)}"
                      data-scope-type="user">
                Connect as User
              </button>
            ` : ''}
            ${orgCanConnect ? `
              <button type="button"
                      class="provider-connect-btn flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      data-provider-id="${this.escapeHtml(provider.id)}"
                      data-scope-type="org">
                Connect Org
              </button>
            ` : ''}
            ${!userCanConnect && !orgCanConnect ? `
              <span class="text-xs text-gray-400 italic">Connect permission required</span>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  private buildCapabilitySummary(capabilities: ProviderCapability[]): string {
    if (capabilities.length === 0) {
      return '<span class="text-xs text-gray-400">No capabilities defined</span>';
    }

    const maxVisible = 4;
    const visible = capabilities.slice(0, maxVisible);
    const hidden = capabilities.length - maxVisible;

    let html = '<div class="flex flex-wrap gap-1">';

    for (const cap of visible) {
      const [category, action] = cap.name.split('.');
      html += `
        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"
              title="${this.escapeHtml(cap.name)}">
          ${this.escapeHtml(action || cap.name)}
        </span>
      `;
    }

    if (hidden > 0) {
      html += `<span class="text-xs text-gray-400">+${hidden} more</span>`;
    }

    html += '</div>';
    return html;
  }

  private buildScopeBadges(scopes: ScopeType[]): string {
    return `
      <div class="flex gap-1">
        ${scopes.map((scope) => `
          <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
            scope === 'user' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
          }">
            ${scope}
          </span>
        `).join('')}
      </div>
    `;
  }

  private getProviderCardData(provider: Provider): ProviderCardData {
    const displayName = this.config.getProviderName
      ? this.config.getProviderName(provider.id)
      : PROVIDER_NAMES[provider.id.toLowerCase()] || this.formatProviderId(provider.id);

    const icon = this.config.getProviderIcon
      ? this.config.getProviderIcon(provider.id)
      : PROVIDER_ICONS[provider.id.toLowerCase()] || PROVIDER_ICONS.default;

    return {
      provider,
      displayName,
      icon,
      description: `${provider.auth_kind} authentication`,
      capabilityCount: provider.capabilities.length,
      canConnect: canConnect()(),
    };
  }

  private formatProviderId(id: string): string {
    return id
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private bindCardEvents(): void {
    if (!this.container) return;

    // Card click for details
    const cards = this.container.querySelectorAll<HTMLElement>('.provider-card');
    cards.forEach((card) => {
      card.addEventListener('click', (e) => {
        // Ignore if clicking a button
        if ((e.target as HTMLElement).closest('button')) return;

        const providerId = card.dataset.providerId;
        if (providerId) {
          const provider = this.getProvider(providerId);
          if (provider && this.config.onSelect) {
            this.config.onSelect(provider);
          }
        }
      });
    });

    // Connect buttons
    const connectBtns = this.container.querySelectorAll<HTMLButtonElement>('.provider-connect-btn');
    connectBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();

        const providerId = btn.dataset.providerId;
        const scopeType = btn.dataset.scopeType as ScopeType;

        if (providerId && scopeType) {
          const provider = this.getProvider(providerId);
          if (provider && this.config.onConnect) {
            this.config.onConnect(provider, scopeType);
          }
        }
      });
    });
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
 * Create and initialize a providers catalog
 */
export async function createProvidersCatalog(
  config: ProvidersPageConfig
): Promise<ProvidersCatalogManager> {
  const manager = new ProvidersCatalogManager(config);
  await manager.init();
  return manager;
}
