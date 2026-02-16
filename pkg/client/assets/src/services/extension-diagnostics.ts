/**
 * Extension Diagnostics Module
 * UI panels for viewing downstream package registration state, provider pack status,
 * hooks enabled, config health, and latest extension errors.
 *
 * This module renders diagnostic information for operators to understand
 * the current state of go-services extensions and registered packages.
 */

import { renderIcon } from '../shared/icon-renderer.js';

// =============================================================================
// Types
// =============================================================================

/** Status of an extension pack */
export type ExtensionStatus = 'active' | 'degraded' | 'errored' | 'disabled';

/** Information about a registered provider pack */
export interface ProviderPackInfo {
  /** Pack identifier (e.g., "google-drive", "slack") */
  id: string;
  /** Human-readable name */
  name: string;
  /** Pack version */
  version: string;
  /** Current status */
  status: ExtensionStatus;
  /** Provider IDs registered by this pack */
  providers: string[];
  /** Capabilities registered */
  capabilities: string[];
  /** Hooks registered by this pack */
  hooks: string[];
  /** Last error message if status is errored */
  lastError?: string;
  /** When the pack was registered */
  registeredAt: string;
  /** When the status last changed */
  lastStatusChange?: string;
}

/** Information about a registered hook */
export interface HookInfo {
  /** Hook name/type */
  name: string;
  /** Source pack that registered this hook */
  sourcePack: string;
  /** Whether the hook is currently enabled */
  enabled: boolean;
  /** Last execution time */
  lastExecutionAt?: string;
  /** Last execution result */
  lastResult?: 'success' | 'failure';
  /** Execution count */
  executionCount: number;
  /** Failure count */
  failureCount: number;
}

/** Configuration health status */
export interface ConfigHealth {
  /** Overall health status */
  status: 'healthy' | 'warning' | 'error';
  /** List of configuration issues */
  issues: Array<{
    severity: 'warning' | 'error';
    message: string;
    field?: string;
  }>;
  /** Last validation time */
  lastValidatedAt: string;
}

/** Recent extension error */
export interface ExtensionError {
  /** Error ID */
  id: string;
  /** Source pack */
  packId: string;
  /** Error type/code */
  type: string;
  /** Error message */
  message: string;
  /** Stack trace if available */
  stack?: string;
  /** When the error occurred */
  occurredAt: string;
  /** Related entity if applicable */
  relatedEntity?: {
    type: string;
    id: string;
  };
}

/** Full extension diagnostics state */
export interface ExtensionDiagnosticsState {
  /** Registered provider packs */
  packs: ProviderPackInfo[];
  /** Registered hooks */
  hooks: HookInfo[];
  /** Configuration health */
  configHealth: ConfigHealth;
  /** Recent errors */
  recentErrors: ExtensionError[];
  /** go-services runtime version */
  runtimeVersion: string;
  /** Worker status */
  workerStatus: 'running' | 'stopped' | 'degraded';
  /** Last data refresh */
  lastRefreshedAt: string;
}

/** Configuration for the diagnostics panel */
export interface ExtensionDiagnosticsPanelConfig {
  /** Container element or selector */
  container: string | HTMLElement;
  /** Initial state (or will show loading) */
  state?: ExtensionDiagnosticsState;
  /** Callback to refresh diagnostics */
  onRefresh?: () => Promise<ExtensionDiagnosticsState>;
  /** Callback when pack is selected */
  onPackSelect?: (packId: string) => void;
  /** Callback when error is selected */
  onErrorSelect?: (error: ExtensionError) => void;
}

// =============================================================================
// Status Configuration
// =============================================================================

const STATUS_CONFIG: Record<ExtensionStatus, { label: string; bg: string; text: string; icon: string }> = {
  active: { label: 'Active', bg: 'bg-green-100', text: 'text-green-700', icon: 'iconoir:check-circle' },
  degraded: { label: 'Degraded', bg: 'bg-amber-100', text: 'text-amber-700', icon: 'iconoir:warning-triangle' },
  errored: { label: 'Error', bg: 'bg-red-100', text: 'text-red-700', icon: 'iconoir:warning-circle' },
  disabled: { label: 'Disabled', bg: 'bg-gray-100', text: 'text-gray-500', icon: 'iconoir:cancel' },
};

const HEALTH_CONFIG: Record<ConfigHealth['status'], { label: string; bg: string; text: string; icon: string }> = {
  healthy: { label: 'Healthy', bg: 'bg-green-100', text: 'text-green-700', icon: 'iconoir:check-circle' },
  warning: { label: 'Warnings', bg: 'bg-amber-100', text: 'text-amber-700', icon: 'iconoir:warning-triangle' },
  error: { label: 'Errors', bg: 'bg-red-100', text: 'text-red-700', icon: 'iconoir:warning-circle' },
};

// =============================================================================
// Extension Diagnostics Panel
// =============================================================================

/**
 * Renders extension diagnostics panel.
 */
export class ExtensionDiagnosticsPanel {
  private config: ExtensionDiagnosticsPanelConfig;
  private container: HTMLElement | null = null;
  private state: ExtensionDiagnosticsState | null = null;
  private loading = false;

  constructor(config: ExtensionDiagnosticsPanelConfig) {
    this.config = config;
    this.state = config.state || null;
  }

  /**
   * Initialize the panel.
   */
  init(): void {
    this.container = typeof this.config.container === 'string'
      ? document.querySelector<HTMLElement>(this.config.container)
      : this.config.container;

    if (!this.container) {
      console.error('[ExtensionDiagnostics] Container not found');
      return;
    }

    this.render();
    this.bindEvents();
  }

  /**
   * Update state and re-render.
   */
  setState(state: ExtensionDiagnosticsState): void {
    this.state = state;
    this.render();
    this.bindEvents();
  }

  /**
   * Refresh diagnostics data.
   */
  async refresh(): Promise<void> {
    if (!this.config.onRefresh || this.loading) return;

    this.loading = true;
    this.updateRefreshButton();

    try {
      const newState = await this.config.onRefresh();
      this.setState(newState);
    } finally {
      this.loading = false;
      this.updateRefreshButton();
    }
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  private render(): void {
    if (!this.container) return;

    if (!this.state) {
      this.container.innerHTML = this.renderLoading();
      return;
    }

    this.container.innerHTML = `
      <div class="extension-diagnostics space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Extension Diagnostics</h2>
            <p class="text-sm text-gray-500 mt-0.5">
              Runtime v${escapeHtml(this.state.runtimeVersion)} &middot;
              Worker ${this.state.workerStatus}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-400">
              Last updated: ${this.formatTime(this.state.lastRefreshedAt)}
            </span>
            <button type="button"
                    class="diagnostics-refresh px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5">
              ${renderIcon('iconoir:refresh', { size: '16px' })}
              Refresh
            </button>
          </div>
        </div>

        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          ${this.renderSummaryCard('Packs', this.state.packs.length, this.countByStatus(this.state.packs))}
          ${this.renderSummaryCard('Hooks', this.state.hooks.length, this.countHookStatus(this.state.hooks))}
          ${this.renderConfigHealthCard()}
          ${this.renderErrorsCard()}
        </div>

        <!-- Provider Packs -->
        <div class="bg-white rounded-lg border border-gray-200">
          <div class="px-4 py-3 border-b border-gray-200">
            <h3 class="text-base font-medium text-gray-900">Provider Packs</h3>
          </div>
          <div class="divide-y divide-gray-100">
            ${this.state.packs.length === 0
              ? this.renderEmptyState('No provider packs registered')
              : this.state.packs.map(pack => this.renderPackRow(pack)).join('')
            }
          </div>
        </div>

        <!-- Hooks -->
        <div class="bg-white rounded-lg border border-gray-200">
          <div class="px-4 py-3 border-b border-gray-200">
            <h3 class="text-base font-medium text-gray-900">Registered Hooks</h3>
          </div>
          <div class="divide-y divide-gray-100">
            ${this.state.hooks.length === 0
              ? this.renderEmptyState('No hooks registered')
              : this.state.hooks.map(hook => this.renderHookRow(hook)).join('')
            }
          </div>
        </div>

        <!-- Recent Errors -->
        ${this.state.recentErrors.length > 0 ? `
          <div class="bg-white rounded-lg border border-red-200">
            <div class="px-4 py-3 border-b border-red-200 bg-red-50">
              <h3 class="text-base font-medium text-red-900 flex items-center gap-2">
                ${renderIcon('iconoir:warning-circle', { size: '18px' })}
                Recent Errors (${this.state.recentErrors.length})
              </h3>
            </div>
            <div class="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              ${this.state.recentErrors.map(error => this.renderErrorRow(error)).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderLoading(): string {
    return `
      <div class="flex items-center justify-center py-12">
        <div class="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        <span class="ml-3 text-gray-600">Loading diagnostics...</span>
      </div>
    `;
  }

  private renderSummaryCard(title: string, total: number, statusCounts: Record<string, number>): string {
    const hasIssues = (statusCounts.errored || 0) > 0 || (statusCounts.degraded || 0) > 0;
    const borderClass = hasIssues ? 'border-amber-200' : 'border-gray-200';

    return `
      <div class="bg-white rounded-lg border ${borderClass} p-4">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-gray-500">${title}</span>
          <span class="text-2xl font-semibold text-gray-900">${total}</span>
        </div>
        <div class="flex items-center gap-2 mt-2">
          ${Object.entries(statusCounts).map(([status, count]) => {
            const config = STATUS_CONFIG[status as ExtensionStatus];
            return count > 0 ? `
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs ${config.bg} ${config.text}">
                ${count} ${config.label.toLowerCase()}
              </span>
            ` : '';
          }).join('')}
        </div>
      </div>
    `;
  }

  private renderConfigHealthCard(): string {
    if (!this.state) return '';

    const health = this.state.configHealth;
    const config = HEALTH_CONFIG[health.status];

    return `
      <div class="bg-white rounded-lg border ${health.status === 'healthy' ? 'border-gray-200' : 'border-amber-200'} p-4">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-gray-500">Config Health</span>
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${config.bg} ${config.text}">
            ${renderIcon(config.icon, { size: '12px' })}
            ${config.label}
          </span>
        </div>
        ${health.issues.length > 0 ? `
          <div class="mt-2">
            <span class="text-sm text-gray-600">${health.issues.length} issue${health.issues.length > 1 ? 's' : ''}</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderErrorsCard(): string {
    if (!this.state) return '';

    const errorCount = this.state.recentErrors.length;
    const hasErrors = errorCount > 0;

    return `
      <div class="bg-white rounded-lg border ${hasErrors ? 'border-red-200' : 'border-gray-200'} p-4">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-gray-500">Recent Errors</span>
          <span class="text-2xl font-semibold ${hasErrors ? 'text-red-600' : 'text-gray-900'}">${errorCount}</span>
        </div>
        ${hasErrors ? `
          <div class="mt-2">
            <span class="text-sm text-red-600">Requires attention</span>
          </div>
        ` : `
          <div class="mt-2">
            <span class="text-sm text-green-600">No recent errors</span>
          </div>
        `}
      </div>
    `;
  }

  private renderPackRow(pack: ProviderPackInfo): string {
    const status = STATUS_CONFIG[pack.status];

    return `
      <div class="pack-row px-4 py-3 hover:bg-gray-50 cursor-pointer" data-pack-id="${escapeHtml(pack.id)}">
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-900">${escapeHtml(pack.name)}</span>
              <span class="text-xs text-gray-400">v${escapeHtml(pack.version)}</span>
              <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${status.bg} ${status.text}">
                ${renderIcon(status.icon, { size: '10px' })}
                ${status.label}
              </span>
            </div>
            <div class="flex items-center gap-4 mt-1 text-xs text-gray-500">
              <span>${pack.providers.length} provider${pack.providers.length !== 1 ? 's' : ''}</span>
              <span>${pack.capabilities.length} capabilit${pack.capabilities.length !== 1 ? 'ies' : 'y'}</span>
              <span>${pack.hooks.length} hook${pack.hooks.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            ${pack.lastError ? `
              <span class="text-xs text-red-600 truncate max-w-48" title="${escapeHtml(pack.lastError)}">
                ${escapeHtml(pack.lastError.slice(0, 50))}${pack.lastError.length > 50 ? '...' : ''}
              </span>
            ` : ''}
            ${renderIcon('iconoir:nav-arrow-right', { size: '16px', extraClass: 'text-gray-400' })}
          </div>
        </div>
      </div>
    `;
  }

  private renderHookRow(hook: HookInfo): string {
    const successRate = hook.executionCount > 0
      ? Math.round(((hook.executionCount - hook.failureCount) / hook.executionCount) * 100)
      : 100;

    return `
      <div class="px-4 py-3">
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-900">${escapeHtml(hook.name)}</span>
              <span class="text-xs text-gray-400">from ${escapeHtml(hook.sourcePack)}</span>
              ${hook.enabled
                ? '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700">Enabled</span>'
                : '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-500">Disabled</span>'
              }
            </div>
            <div class="flex items-center gap-4 mt-1 text-xs text-gray-500">
              <span>${hook.executionCount} executions</span>
              <span class="${successRate < 90 ? 'text-amber-600' : ''}">${successRate}% success rate</span>
              ${hook.lastExecutionAt ? `<span>Last: ${this.formatTime(hook.lastExecutionAt)}</span>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderErrorRow(error: ExtensionError): string {
    return `
      <div class="error-row px-4 py-3 hover:bg-red-50 cursor-pointer" data-error-id="${escapeHtml(error.id)}">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 mt-0.5">
            ${renderIcon('iconoir:warning-circle', { size: '16px', extraClass: 'text-red-500' })}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-red-800">${escapeHtml(error.type)}</span>
              <span class="text-xs text-gray-400">from ${escapeHtml(error.packId)}</span>
            </div>
            <p class="text-sm text-gray-700 mt-0.5">${escapeHtml(error.message)}</p>
            <div class="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span>${this.formatTime(error.occurredAt)}</span>
              ${error.relatedEntity ? `
                <span>${escapeHtml(error.relatedEntity.type)}:${escapeHtml(error.relatedEntity.id)}</span>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderEmptyState(message: string): string {
    return `
      <div class="px-4 py-8 text-center">
        <p class="text-sm text-gray-500">${escapeHtml(message)}</p>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Event Binding
  // ---------------------------------------------------------------------------

  private bindEvents(): void {
    if (!this.container) return;

    // Refresh button
    const refreshBtn = this.container.querySelector('.diagnostics-refresh');
    refreshBtn?.addEventListener('click', () => this.refresh());

    // Pack rows
    this.container.querySelectorAll<HTMLElement>('.pack-row').forEach(row => {
      row.addEventListener('click', () => {
        const packId = row.dataset.packId;
        if (packId && this.config.onPackSelect) {
          this.config.onPackSelect(packId);
        }
      });
    });

    // Error rows
    this.container.querySelectorAll<HTMLElement>('.error-row').forEach(row => {
      row.addEventListener('click', () => {
        const errorId = row.dataset.errorId;
        const error = this.state?.recentErrors.find(e => e.id === errorId);
        if (error && this.config.onErrorSelect) {
          this.config.onErrorSelect(error);
        }
      });
    });
  }

  private updateRefreshButton(): void {
    const btn = this.container?.querySelector<HTMLButtonElement>('.diagnostics-refresh');
    if (btn) {
      btn.disabled = this.loading;
      const icon = btn.querySelector('svg');
      if (icon) {
        icon.classList.toggle('animate-spin', this.loading);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private countByStatus(packs: ProviderPackInfo[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const pack of packs) {
      counts[pack.status] = (counts[pack.status] || 0) + 1;
    }
    return counts;
  }

  private countHookStatus(hooks: HookInfo[]): Record<string, number> {
    let enabled = 0;
    let disabled = 0;
    for (const hook of hooks) {
      if (hook.enabled) enabled++;
      else disabled++;
    }
    return { active: enabled, disabled };
  }

  private formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString();
  }
}

// =============================================================================
// State Source Indicators (Task 7.9)
// =============================================================================

/** Source of state data */
export type StateSource = 'go-services' | 'downstream' | 'mixed';

/** Configuration for state source indicator */
export interface StateSourceIndicatorConfig {
  /** The source of the state */
  source: StateSource;
  /** Optional pack name for downstream state */
  packName?: string;
  /** Whether to show as inline badge or tooltip */
  mode?: 'badge' | 'tooltip';
  /** Additional context */
  context?: string;
}

/**
 * Render a state source indicator to help operators distinguish
 * between go-services primitive state and downstream domain-package state.
 */
export function renderStateSourceIndicator(config: StateSourceIndicatorConfig): string {
  const { source, packName, mode = 'badge', context } = config;

  const sourceConfig: Record<StateSource, { label: string; bg: string; text: string; icon: string; description: string }> = {
    'go-services': {
      label: 'Core',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      icon: 'iconoir:box-3d-center',
      description: 'Managed by go-services core',
    },
    'downstream': {
      label: packName || 'Extension',
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      icon: 'iconoir:plug',
      description: `Managed by ${packName || 'downstream extension'}`,
    },
    'mixed': {
      label: 'Mixed',
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      icon: 'iconoir:layers',
      description: 'Combination of core and extension data',
    },
  };

  const cfg = sourceConfig[source];

  if (mode === 'tooltip') {
    return `
      <span class="state-source-indicator inline-flex items-center"
            title="${escapeHtml(cfg.description)}${context ? ` - ${context}` : ''}"
            aria-label="${escapeHtml(cfg.description)}">
        ${renderIcon(cfg.icon, { size: '14px', extraClass: cfg.text })}
      </span>
    `;
  }

  return `
    <span class="state-source-indicator inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${cfg.bg} ${cfg.text}"
          title="${escapeHtml(cfg.description)}${context ? ` - ${context}` : ''}"
          role="note"
          aria-label="State source: ${escapeHtml(cfg.description)}">
      ${renderIcon(cfg.icon, { size: '12px' })}
      <span>${escapeHtml(cfg.label)}</span>
    </span>
  `;
}

/**
 * Add state source indicator to a field/section.
 */
export function addStateSourceIndicator(
  container: HTMLElement,
  config: StateSourceIndicatorConfig
): void {
  const indicator = document.createElement('span');
  indicator.innerHTML = renderStateSourceIndicator(config);
  container.appendChild(indicator.firstElementChild as HTMLElement);
}

/**
 * Create a legend for state source indicators (for documentation/help).
 */
export function renderStateSourceLegend(): string {
  return `
    <div class="state-source-legend p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h4 class="text-sm font-medium text-gray-900 mb-3">State Source Legend</h4>
      <div class="space-y-2">
        <div class="flex items-center gap-3">
          ${renderStateSourceIndicator({ source: 'go-services' })}
          <span class="text-sm text-gray-600">Data managed by go-services core runtime</span>
        </div>
        <div class="flex items-center gap-3">
          ${renderStateSourceIndicator({ source: 'downstream', packName: 'Extension' })}
          <span class="text-sm text-gray-600">Data managed by an installed extension package</span>
        </div>
        <div class="flex items-center gap-3">
          ${renderStateSourceIndicator({ source: 'mixed' })}
          <span class="text-sm text-gray-600">Combination of core and extension-managed data</span>
        </div>
      </div>
    </div>
  `;
}

// =============================================================================
// Helpers
// =============================================================================

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// =============================================================================
// Exports
// =============================================================================

export {
  ExtensionDiagnosticsPanel,
  renderStateSourceIndicator,
  addStateSourceIndicator,
  renderStateSourceLegend,
};
